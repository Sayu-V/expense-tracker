"""
import_service.py
-----------------
v2.0.0 — Bank statement import pipeline.

Supported formats:
  • Canara Bank PDF  — 8-column pdfplumber table extraction
  • Generic CSV      — auto-detects common column layouts

Flow:
  1. parse_file()        → list of raw dicts (date, description, amount, is_credit, ref_no)
  2. enrich_rows()       → attach merchant, type, category, flags via categorizer
  3. check_duplicates()  → mark rows already in DB
  4. Store in SESSION_STORE[session_id] for the confirm step
  5. confirm_import()    → bulk-create Expense rows from user-approved rows

Session store is in-memory (dict). Suitable for single-instance Docker deploy.
Sessions expire after 30 minutes (lazy TTL check on confirm).
"""

import csv
import io
import re
import uuid
from datetime import datetime, date, timedelta
from typing import Optional

from sqlmodel import Session, select

from app.models import Expense, Category
from app.schemas import (
    ImportTransaction,
    ImportPreviewResponse,
    ImportConfirmRequest,
    ImportConfirmResponse,
)
from app.services.categorizer_service import classify_transaction, resolve_category_id


# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

SESSION_STORE: dict[str, dict] = {}
SESSION_TTL_MINUTES = 30


def _new_session(filename: str, bank_format: str, rows: list[ImportTransaction]) -> str:
    session_id = str(uuid.uuid4())
    SESSION_STORE[session_id] = {
        "filename": filename,
        "bank_format": bank_format,
        "rows": {r.row_id: r for r in rows},
        "created_at": datetime.utcnow(),
    }
    return session_id


def _get_session(session_id: str) -> Optional[dict]:
    data = SESSION_STORE.get(session_id)
    if not data:
        return None
    age = datetime.utcnow() - data["created_at"]
    if age > timedelta(minutes=SESSION_TTL_MINUTES):
        del SESSION_STORE[session_id]
        return None
    return data


# ---------------------------------------------------------------------------
# Amount parser helper
# ---------------------------------------------------------------------------

def _parse_amount(raw: Optional[str]) -> float:
    if not raw:
        return 0.0
    cleaned = re.sub(r"[^\d.]", "", str(raw).strip())
    try:
        return round(float(cleaned), 2)
    except ValueError:
        return 0.0


# ---------------------------------------------------------------------------
# Canara Bank PDF parser
# ---------------------------------------------------------------------------

def _extract_merchant(description: str) -> str:
    """Extract a short merchant/sender name from a bank description string."""
    desc = description.upper()

    # UPI pattern: UPI/DR|CR/<ref>/<MERCHANT>/<BANKCODE>/...
    m = re.search(r"UPI/(?:DR|CR)/\d+/([^/]+)/", desc)
    if m:
        merchant = m.group(1).strip()
        # Strip leading digits/underscores
        merchant = re.sub(r"^[\d_]+", "", merchant).strip()
        if merchant:
            return merchant.title()

    # NEFT/IMPS: NEFT/<ref>/<NAME>
    m = re.search(r"(?:NEFT|IMPS|RTGS)/[^/]*/([A-Z][A-Z ]+)", desc)
    if m:
        return m.group(1).strip().title()

    # ATM
    if "ATM" in desc or "ATW" in desc:
        return "ATM Cash"

    # Sweep
    if "SWEEP" in desc:
        return "FD Sweep"

    # First meaningful word
    words = re.sub(r"[/\-_]", " ", description).split()
    skip = {"UPI", "NEFT", "IMPS", "RTGS", "DR", "CR", "BY", "TO", "FROM", "ON"}
    for w in words:
        if w.upper() not in skip and len(w) > 2 and w.isalpha():
            return w.title()

    return description[:30].strip()


def _parse_canara_pdf(file_bytes: bytes) -> list[dict]:
    """
    Parse a Canara Bank PDF statement using pdfplumber.
    Returns list of dicts: {date, description, merchant, amount, is_credit, ref_no}
    """
    try:
        import pdfplumber
    except ImportError:
        raise RuntimeError("pdfplumber not installed — run: pip install pdfplumber")

    transactions = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue
            for row in tables[0]:
                if not row or len(row) != 8:
                    continue

                trans_date, _, _, ref, desc, withdraws, deposit, _ = row

                # Skip header rows
                if trans_date and "TRANS" in str(trans_date).upper():
                    continue
                if not any(row):
                    continue

                clean_desc = " ".join(str(desc or "").split())

                # Continuation row — append to previous
                if not trans_date and clean_desc and not withdraws:
                    if transactions:
                        transactions[-1]["description"] += " " + clean_desc
                        transactions[-1]["merchant"] = _extract_merchant(
                            transactions[-1]["description"]
                        )
                    continue

                # Skip opening balance
                if "B/F" in str(desc or "").upper():
                    continue

                try:
                    date_obj = datetime.strptime(str(trans_date).strip(), "%d-%b-%y").date()
                except ValueError:
                    continue

                dr = _parse_amount(withdraws)
                cr = _parse_amount(deposit)

                if dr == 0.0 and cr == 0.0:
                    continue

                transactions.append({
                    "date": date_obj,
                    "description": clean_desc,
                    "merchant": _extract_merchant(clean_desc),
                    "amount": dr if dr > 0 else cr,
                    "is_credit": cr > 0,
                    "ref_no": str(ref or "").strip(),
                })

    return transactions


# ---------------------------------------------------------------------------
# Generic CSV parser
# ---------------------------------------------------------------------------

# Known column aliases (lower-case)
_DATE_COLS    = {"date", "trans date", "transaction date", "txn date", "value date"}
_DESC_COLS    = {"description", "narration", "particulars", "details", "remarks", "transaction details"}
_DEBIT_COLS   = {"debit", "withdrawal", "withdrawals", "dr", "debit amount", "amount (dr)"}
_CREDIT_COLS  = {"credit", "deposit", "deposits", "cr", "credit amount", "amount (cr)"}
_AMOUNT_COLS  = {"amount", "transaction amount"}
_TYPE_COLS    = {"type", "dr/cr", "txn type", "debit/credit"}


def _parse_csv(file_bytes: bytes) -> list[dict]:
    """
    Parse a generic bank statement CSV.
    Handles variable column layouts by sniffing headers.
    """
    text = file_bytes.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    headers = {h.strip().lower(): h.strip() for h in (reader.fieldnames or [])}

    def find_col(candidates: set) -> Optional[str]:
        for c in candidates:
            if c in headers:
                return headers[c]
        return None

    date_col   = find_col(_DATE_COLS)
    desc_col   = find_col(_DESC_COLS)
    debit_col  = find_col(_DEBIT_COLS)
    credit_col = find_col(_CREDIT_COLS)
    amount_col = find_col(_AMOUNT_COLS)
    type_col   = find_col(_TYPE_COLS)

    if not date_col or not desc_col:
        raise ValueError(
            "CSV is missing required columns. Expected: date column and description/narration column."
        )

    transactions = []
    for row in reader:
        raw_date = (row.get(date_col) or "").strip()
        if not raw_date:
            continue

        # Try multiple date formats
        date_obj = None
        for fmt in ("%d-%m-%Y", "%d/%m/%Y", "%Y-%m-%d", "%d-%b-%Y", "%d-%b-%y",
                    "%d/%m/%y", "%m/%d/%Y", "%d %b %Y", "%d %b %y"):
            try:
                date_obj = datetime.strptime(raw_date, fmt).date()
                break
            except ValueError:
                continue
        if not date_obj:
            continue

        description = (row.get(desc_col) or "").strip()
        if not description:
            continue

        # Determine amount and direction
        dr = _parse_amount(row.get(debit_col) if debit_col else None)
        cr = _parse_amount(row.get(credit_col) if credit_col else None)

        if dr == 0.0 and cr == 0.0 and amount_col:
            raw_amount = _parse_amount(row.get(amount_col))
            if type_col:
                type_hint = (row.get(type_col) or "").strip().upper()
                is_credit = any(t in type_hint for t in ["CR", "CREDIT", "DEPOSIT", "IN"])
                if is_credit:
                    cr = raw_amount
                else:
                    dr = raw_amount
            else:
                # Can't determine direction — skip
                continue

        if dr == 0.0 and cr == 0.0:
            continue

        transactions.append({
            "date": date_obj,
            "description": description,
            "merchant": _extract_merchant(description),
            "amount": dr if dr > 0 else cr,
            "is_credit": cr > 0,
            "ref_no": "",
        })

    return transactions


# ---------------------------------------------------------------------------
# Duplicate detection
# ---------------------------------------------------------------------------

def _is_duplicate(
    txn_date: date,
    amount: float,
    description: str,
    db: Session,
) -> bool:
    """
    Check if an expense with matching date + amount + similar description exists.
    Uses exact date + amount; description match is relaxed (first 30 chars).
    """
    desc_prefix = description[:30]
    existing = db.exec(
        select(Expense).where(
            Expense.date == txn_date,
            Expense.amount == amount,
        )
    ).all()
    for exp in existing:
        if exp.description[:30].lower() == desc_prefix.lower():
            return True
    return False


# ---------------------------------------------------------------------------
# Main public functions
# ---------------------------------------------------------------------------

def parse_and_preview(
    filename: str,
    file_bytes: bytes,
    db: Session,
) -> ImportPreviewResponse:
    """
    Parse an uploaded file (PDF or CSV), classify each row, check for
    duplicates, and return a preview for the user to review.
    """
    filename_lower = filename.lower()

    # ── Detect format and parse ──────────────────────────────────────────────
    if filename_lower.endswith(".pdf"):
        bank_format = "canara_bank"
        raw_rows = _parse_canara_pdf(file_bytes)
    elif filename_lower.endswith(".csv"):
        bank_format = "generic_csv"
        raw_rows = _parse_csv(file_bytes)
    else:
        raise ValueError(f"Unsupported file type: '{filename}'. Upload a PDF or CSV file.")

    if not raw_rows:
        raise ValueError("No transactions found in the uploaded file. Check the file format.")

    # ── Enrich each row ──────────────────────────────────────────────────────
    import_rows: list[ImportTransaction] = []
    for raw in raw_rows:
        classification = classify_transaction(
            description=raw["description"],
            amount=raw["amount"],
            is_credit=raw["is_credit"],
            session=db,
            transaction_date=raw["date"],
        )

        # Resolve category to DB id
        cat_id, cat_name, cat_emoji = None, None, None
        income_source_cat_id = classification.pop("_income_source_category_id", None)

        if income_source_cat_id:
            cat = db.get(Category, income_source_cat_id)
            if cat:
                cat_id, cat_name, cat_emoji = cat.id, cat.name, cat.emoji
        elif classification.get("category_name"):
            cat_id, cat_name, cat_emoji = resolve_category_id(
                classification["category_name"], db
            )

        # Duplicate check
        is_dup = _is_duplicate(raw["date"], raw["amount"], raw["description"], db)

        import_rows.append(ImportTransaction(
            row_id=str(uuid.uuid4()),
            date=raw["date"],
            description=raw["description"],
            raw_description=raw["description"],
            merchant=raw.get("merchant", ""),
            amount=raw["amount"],
            type=classification["type"],
            income_subtype=classification.get("income_subtype"),
            suggested_category_id=cat_id,
            suggested_category_name=cat_name,
            suggested_category_emoji=cat_emoji,
            confidence=classification["confidence"],
            is_duplicate=is_dup,
            is_flagged=classification["is_flagged"],
            flag_reason=classification.get("flag_reason"),
            ref_no=raw.get("ref_no", ""),
            skip=is_dup,  # Pre-skip duplicates (user can un-skip)
        ))

    # ── Store session ────────────────────────────────────────────────────────
    session_id = _new_session(filename, bank_format, import_rows)

    duplicate_count = sum(1 for r in import_rows if r.is_duplicate)
    flagged_count   = sum(1 for r in import_rows if r.is_flagged and not r.is_duplicate)

    return ImportPreviewResponse(
        session_id=session_id,
        filename=filename,
        bank_format=bank_format,
        total_rows=len(import_rows),
        duplicate_count=duplicate_count,
        flagged_count=flagged_count,
        transactions=import_rows,
    )


def confirm_import(
    request: ImportConfirmRequest,
    db: Session,
) -> ImportConfirmResponse:
    """
    Apply user edits and bulk-create Expense rows for all non-skipped rows.
    """
    session_data = _get_session(request.session_id)
    if not session_data:
        raise ValueError("Import session expired or not found. Please re-upload the file.")

    stored_rows: dict[str, ImportTransaction] = session_data["rows"]

    # Build update map
    update_map = {u.row_id: u for u in request.rows}

    imported_ids = []
    skipped = 0
    dup_skipped = 0

    for row_id, txn in stored_rows.items():
        update = update_map.get(row_id)

        # Apply user edits
        if update:
            if update.skip or txn.is_duplicate:
                if txn.is_duplicate:
                    dup_skipped += 1
                else:
                    skipped += 1
                continue
            final_type = update.type
            final_cat  = update.category_id or txn.suggested_category_id
            final_desc = update.description or txn.description
        else:
            if txn.skip or txn.is_duplicate:
                if txn.is_duplicate:
                    dup_skipped += 1
                else:
                    skipped += 1
                continue
            final_type = txn.type
            final_cat  = txn.suggested_category_id
            final_desc = txn.description

        # Skip investments and transfers — they don't go into expenses table
        if final_type in ("investment", "transfer"):
            skipped += 1
            continue

        # Must have a category
        if not final_cat:
            # Fallback to "Other"
            other_cat = db.exec(
                select(Category).where(Category.name == "Other")
            ).first()
            final_cat = other_cat.id if other_cat else None

        if not final_cat:
            skipped += 1
            continue

        expense = Expense(
            amount=txn.amount,
            description=final_desc[:200],
            notes=f"Imported from {session_data['bank_format']} | Ref: {txn.ref_no or '—'}",
            date=txn.date,
            type=final_type,
            category_id=final_cat,
        )
        db.add(expense)
        db.flush()  # Get the id without committing
        imported_ids.append(expense.id)

    db.commit()

    # Clean up session
    SESSION_STORE.pop(request.session_id, None)

    return ImportConfirmResponse(
        imported_count=len(imported_ids),
        skipped_count=skipped,
        duplicate_skipped=dup_skipped,
        expense_ids=imported_ids,
    )
