"""
categorizer_service.py
----------------------
v2.0.0 — Smart transaction categorisation for bank statement imports.

Two-pass classification:
  Pass 1 — Rule engine  : regex/keyword matching on description text.
                          Fast, deterministic, no API calls.
  Pass 2 — Income-source: match against user-defined IncomeSource rows
                          for large deposits (rent, business income, etc.)

Returns:
  type            : 'expense' | 'income' | 'investment' | 'transfer'
  income_subtype  : 'salary' | 'rent' | 'business' | 'interest' |
                    'fd_maturity' | 'refund' | 'upi_received' | None
  category_name   : best-guess category string (matched to DB later)
  confidence      : 'high' | 'medium' | 'low'
  is_flagged      : bool — needs user review
  flag_reason     : str  — why it was flagged
"""

import re
from typing import Optional
from sqlmodel import Session, select

from app.models import Category, IncomeSource


# ---------------------------------------------------------------------------
# Rule tables
# ---------------------------------------------------------------------------

# Each entry: (regex_pattern, forced_type, income_subtype)
# forced_type = None means "determine from debit/credit column"
_TYPE_RULES: list[tuple[str, Optional[str], Optional[str]]] = [
    # ── Income signals ──────────────────────────────────────────────────────
    (r'\bSALARY\b|SAL/|\bPAYROLL\b|\bSAL-\b',       'income',     'salary'),
    (r'UPI/CR/',                                       'income',     'upi_received'),
    (r'\bINTEREST CREDITED\b|INT CR\b|\bINT\.CR\b',   'income',     'interest'),
    (r'\bSAVINGS INTEREST\b',                          'income',     'interest'),
    (r'\bSWEEP OUT\b|\bFD MATURITY\b|\bFD CLOS\b',    'income',     'fd_maturity'),
    (r'\bREFUND\b|RFD/',                               'income',     'refund'),
    (r'\bDIVIDEND\b|\bDIV PAID\b',                    'income',     'interest'),

    # ── Investment signals ──────────────────────────────────────────────────
    (r'\bSWEEP IN\b',                                  'investment', None),
    (r'\bMUTUAL FUND\b|MF/|\bGROWW\b|\bZERODHA\b|\bKUVERA\b|\bPAYTM MONEY\b|\bAMFI\b', 'investment', None),
    (r'\bSIP\b|\bSIP-\b',                              'investment', None),
    (r'\bBSE STAR\b|\bNSE/\b|\bNSDL\b|\bBSE LTD\b',  'investment', None),
    (r'\bPPF\b|\bEPF\b|\bNPS\b|\bNPS-\b',             'investment', None),

    # ── Expense signals ─────────────────────────────────────────────────────
    (r'UPI/DR/',                                       'expense',    None),
    (r'\bATM/WDL\b|\bATW\b|\bCASH WDL\b|\bATM WD\b', 'expense',    None),
    (r'\bNACH DR\b|\bECS DR\b|\bAUTO-DEB\b|\bSI/\b',  'expense',    None),
    (r'\bCHARGES\b|\bGST ON\b|\bSERVICE FEE\b|\bPENALTY\b|\bFINE\b|\bCHRG\b', 'expense', None),
    (r'\bLIC PREM\b|\bINSURANCE PREM\b|\bPOLICY PREM\b',             'expense', None),

    # ── Transfer signals (direction determined by debit/credit) ─────────────
    (r'\bNEFT/\b|\bNEFT-\b|IMPS/|RTGS/|\bINTERNET TRANSFER\b',      None, None),
]

# Category keyword map: category_name → list of upper-case keywords
_EXPENSE_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("Food",          ["ZOMATO", "SWIGGY", "DUNZO", "DOMINOS", "PIZZA HUT", "MCDONALDS",
                       "SUBWAY", "KFC", "BURGER KING", "STARBUCKS", "CCD", "CAFE COFFEE",
                       "UDUPI", "DARSHINI", "HOTEL", "RESTAURANT", "FOOD"]),
    ("Shopping",      ["AMAZON", "FLIPKART", "MYNTRA", "AJIO", "MEESHO", "SNAPDEAL",
                       "NYKAA", "PURPLLE", "TATACLIQ", "CROMA", "RELIANCE DIGITAL",
                       "SHOPCLUES", "INDIAMART"]),
    ("Shopping",      ["BLINKIT", "ZEPTO", "BIGBASKET", "GROFERS", "DMART", "JIOMART",
                       "RELIANCE FRESH", "SPAR", "MORE SUPERMARKET"]),
    ("Transport",     ["OLA", "UBER", "RAPIDO", "OLA CABS", "IRCTC", "REDBUS", "YATRA",
                       "MAKEMYTRIP", "GOIBIBO", "CLEARTRIP", "EASEMYTRIP", "AIR INDIA",
                       "INDIGO", "SPICEJET", "VISTARA", "METRO RAIL"]),
    ("Health",        ["APOLLO", "MEDPLUS", "1MG", "PRACTO", "NETMEDS", "PHARMEASY",
                       "HOSPITAL", "CLINIC", "PHARMACY", "DIAGNOSTIC", "LAB", "TATA 1MG"]),
    ("Entertainment", ["NETFLIX", "HOTSTAR", "SPOTIFY", "AMAZON PRIME", "YOUTUBE PREMIUM",
                       "GAANA", "JIOSAAVN", "ZEE5", "SONYLIV", "BOOKMYSHOW", "PVRINOX",
                       "INOX", "PVR", "LENSKART"]),
    ("Transport",     ["HPCL", "IOCL", "BPCL", "BHARAT PETROLEUM", "INDIAN OIL",
                       "PETROL", "FUEL", "ESSAR OIL", "SHELL"]),
    ("Health",        ["LIC", "BAJAJ ALLIANZ", "HDFC LIFE", "STAR HEALTH", "NEW INDIA",
                       "ICICI PRUD", "MAX LIFE", "SBI LIFE", "TATA AIA"]),
    ("Other",         ["SCHOOL", "COLLEGE", "TUITION FEE", "UDEMY", "COURSERA",
                       "BYJUS", "UNACADEMY", "VEDANTU", "WHITEHAT"]),
    ("Other",         ["AIRTEL", "JIO", "BSNL", "TATA SKY", "TATAPLAY", "DISH TV",
                       "BESCOM", "MSEDCL", "TANGEDCO", "WBSEDCL", "ELECTRICITY",
                       "WATER BOARD", "GAS SUPPLY", "PIPED GAS"]),
    ("Other",         ["CHARGES", "CHRG", "FINE", "PENALTY", "GST ON CHG"]),
    ("Other",         ["ATM/WDL", "CASH WDL", "ATW"]),
]

# Income category keywords
_INCOME_CATEGORY_RULES: list[tuple[str, list[str]]] = [
    ("Salary",        ["SALARY", "SAL/", "PAYROLL", "STIPEND"]),
    ("Dividend",      ["DIVIDEND", "DIV PAID", "INTEREST"]),
    ("Stocks",        ["SWEEP OUT", "FD MATURITY", "FD CLOS", "GROWW", "ZERODHA", "KUVERA"]),
    ("Freelance",     ["FREELANCE", "CONSULTING", "INVOICE", "PAYMENT FOR", "COMMISSION"]),
    ("Rental Income", ["RENT", "LEASE", "RENTAL", "TENANCY", "HOUSE RENT"]),
]

# Large deposit threshold — flag for user review if unclassified
_LARGE_DEPOSIT_THRESHOLD = 10_000.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def classify_transaction(
    description: str,
    amount: float,
    is_credit: bool,                    # True = deposit, False = withdrawal
    session: Optional[Session] = None,  # Passed in for income-source lookup
    transaction_date=None,              # date object, used for day-of-month match
) -> dict:
    """
    Classify a single bank transaction.

    Returns a dict with keys:
      type, income_subtype, category_name, confidence, is_flagged, flag_reason
    """
    desc_upper = description.upper()
    result = {
        "type": "income" if is_credit else "expense",
        "income_subtype": None,
        "category_name": None,
        "confidence": "low",
        "is_flagged": False,
        "flag_reason": None,
    }

    # ── Pass 1: Rule engine ──────────────────────────────────────────────────
    for pattern, forced_type, subtype in _TYPE_RULES:
        if re.search(pattern, desc_upper):
            if forced_type:
                result["type"] = forced_type
            elif not forced_type and is_credit:
                result["type"] = "income"
            elif not forced_type and not is_credit:
                result["type"] = "expense"
            if subtype:
                result["income_subtype"] = subtype
            result["confidence"] = "high"
            break

    # ── Pass 2: Income-source DB lookup (deposits only) ──────────────────────
    if is_credit and session:
        sources = session.exec(select(IncomeSource)).all()
        for src in sources:
            if src.sender_keyword in desc_upper:
                result["type"] = "income"
                result["income_subtype"] = src.source_type
                # Boost to 'rent' / 'business' based on source_type
                result["confidence"] = "high"
                # Map source category
                if src.category_id:
                    result["_income_source_category_id"] = src.category_id
                break

    # ── Pass 3: Category keyword matching ───────────────────────────────────
    if result["type"] == "expense":
        for cat_name, keywords in _EXPENSE_CATEGORY_RULES:
            if any(kw in desc_upper for kw in keywords):
                result["category_name"] = cat_name
                if result["confidence"] == "low":
                    result["confidence"] = "medium"
                break

    elif result["type"] == "income":
        for cat_name, keywords in _INCOME_CATEGORY_RULES:
            if any(kw in desc_upper for kw in keywords):
                result["category_name"] = cat_name
                if result["confidence"] == "low":
                    result["confidence"] = "medium"
                break

    elif result["type"] == "investment":
        result["category_name"] = "Stocks"
        result["confidence"] = "high"

    # ── Pass 4: Flag logic ───────────────────────────────────────────────────
    if is_credit and amount >= _LARGE_DEPOSIT_THRESHOLD and result["confidence"] == "low":
        result["is_flagged"] = True
        result["flag_reason"] = (
            f"Large deposit of ₹{amount:,.0f} — please confirm income type "
            f"(rent / salary / business / other)"
        )

    if result["type"] == "transfer" and is_credit:
        result["is_flagged"] = True
        result["flag_reason"] = "Transfer received — confirm if this is income or an internal transfer"

    # ── Pass 5: Fallback defaults ────────────────────────────────────────────
    if not result["category_name"]:
        if result["type"] == "expense":
            result["category_name"] = "Other"
        elif result["type"] == "income":
            result["category_name"] = "Pocket Money"
        elif result["type"] == "investment":
            result["category_name"] = "Stocks"

    return result


def resolve_category_id(category_name: str, session: Session) -> tuple[Optional[int], Optional[str], Optional[str]]:
    """
    Look up a category by name in the DB.
    Returns (category_id, category_name, emoji) or (None, None, None).
    """
    cat = session.exec(
        select(Category).where(Category.name == category_name)
    ).first()
    if cat:
        return cat.id, cat.name, cat.emoji
    # Fuzzy fallback: try substring match
    cats = session.exec(select(Category)).all()
    for c in cats:
        if category_name.lower() in c.name.lower() or c.name.lower() in category_name.lower():
            return c.id, c.name, c.emoji
    return None, None, None
