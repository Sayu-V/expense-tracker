"""
services/expense_service.py
---------------------------
Business logic layer for Expense CRUD.
Routers call these functions — they never touch the DB directly.
This separation makes unit testing easy (just pass a test session).
"""

import base64
from datetime import date, datetime
from typing import Optional, Tuple
from sqlmodel import Session, select, func, or_, and_

from app.models import Expense, Category
from app.schemas import ExpenseCreate, ExpenseUpdate


# ── Cursor helpers ─────────────────────────────────────────────────────────────

def _encode_cursor(d: date, row_id: int) -> str:
    """Encode a (date, id) pair into an opaque base64 cursor string."""
    return base64.b64encode(f"{d.isoformat()}_{row_id}".encode()).decode()


def _decode_cursor(cursor: str) -> Tuple[date, int]:
    """Decode a cursor string back to (date, id). Raises ValueError on bad input."""
    try:
        decoded = base64.b64decode(cursor.encode()).decode()
        date_str, id_str = decoded.rsplit("_", 1)
        return date.fromisoformat(date_str), int(id_str)
    except Exception:
        raise ValueError(f"Invalid cursor: {cursor}")


def create_expense(session: Session, payload: ExpenseCreate) -> Expense:
    """
    Create and persist a new expense.
    Validates that the category_id exists before inserting.
    """
    # Verify category exists
    category = session.get(Category, payload.category_id)
    if not category:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400,
            detail=f"Category {payload.category_id} does not exist"
        )

    expense = Expense(
        amount=payload.amount,
        category_id=payload.category_id,
        description=payload.description,
        notes=payload.notes,
        date=payload.date,
        type=payload.type,   # v1.1.0
    )
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


def get_expense_by_id(session: Session, expense_id: int) -> Optional[Expense]:
    """Return a single expense by primary key, or None."""
    return session.get(Expense, expense_id)


def list_expenses(
    session: Session,
    category_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    type: Optional[str] = None,   # v1.1.0: 'expense' | 'income'
    limit: int = 100,
    offset: int = 0,
) -> list[Expense]:
    """
    List expenses with optional filters.
    Results are sorted by date descending (most recent first).
    v1.1.0: Added type filter for income vs expense separation.
    """
    query = select(Expense)

    if category_id is not None:
        query = query.where(Expense.category_id == category_id)
    if date_from is not None:
        query = query.where(Expense.date >= date_from)
    if date_to is not None:
        query = query.where(Expense.date <= date_to)
    if min_amount is not None:
        query = query.where(Expense.amount >= min_amount)
    if max_amount is not None:
        query = query.where(Expense.amount <= max_amount)
    if type is not None:
        query = query.where(Expense.type == type)

    query = query.order_by(Expense.date.desc()).offset(offset).limit(limit)
    return session.exec(query).all()


def list_expenses_page(
    session: Session,
    category_id: Optional[int] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    type: Optional[str] = None,
    page_size: int = 50,
    cursor: Optional[str] = None,
) -> Tuple[list, Optional[str], bool, int]:
    """
    v2.2.0 — Cursor-based paginated expense list.

    Ordered by (date DESC, id DESC) for stable pagination.
    The cursor encodes the last seen (date, id) so new inserts don't shift pages.

    Returns: (items, next_cursor, has_more, total)
      items       — up to page_size Expense objects
      next_cursor — opaque token for the next page, or None on the last page
      has_more    — True when another page exists
      total       — total matching rows across all pages (for "X of Y" display)
    """

    # ── Helper: apply shared filters to any query ────────────────────────────
    def _apply_filters(q):
        if category_id is not None:
            q = q.where(Expense.category_id == category_id)
        if date_from is not None:
            q = q.where(Expense.date >= date_from)
        if date_to is not None:
            q = q.where(Expense.date <= date_to)
        if min_amount is not None:
            q = q.where(Expense.amount >= min_amount)
        if max_amount is not None:
            q = q.where(Expense.amount <= max_amount)
        if type is not None:
            q = q.where(Expense.type == type)
        return q

    # ── Count total matching rows (no cursor — counts all pages) ─────────────
    count_q = _apply_filters(select(func.count()).select_from(Expense))
    total: int = session.exec(count_q).one()

    # ── Main paginated query ──────────────────────────────────────────────────
    q = _apply_filters(select(Expense))

    if cursor:
        c_date, c_id = _decode_cursor(cursor)
        # Continue after the cursor row (date DESC, id DESC):
        # include rows whose date is strictly earlier,
        # OR same date but strictly lower id
        q = q.where(
            or_(
                Expense.date < c_date,
                and_(Expense.date == c_date, Expense.id < c_id),
            )
        )

    # Fetch one extra row so we can cheaply detect whether another page exists
    q = q.order_by(Expense.date.desc(), Expense.id.desc()).limit(page_size + 1)
    items = list(session.exec(q).all())

    has_more = len(items) > page_size
    if has_more:
        items = items[:page_size]

    next_cursor = _encode_cursor(items[-1].date, items[-1].id) if has_more and items else None

    return items, next_cursor, has_more, total


def update_expense(
    session: Session,
    expense_id: int,
    payload: ExpenseUpdate,
) -> Optional[Expense]:
    """
    Partial update — only fields present in payload are changed.
    updated_at is always refreshed.
    Returns None if expense not found.
    """
    expense = session.get(Expense, expense_id)
    if not expense:
        return None

    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(expense, field, value)

    expense.updated_at = datetime.utcnow()
    session.add(expense)
    session.commit()
    session.refresh(expense)
    return expense


def delete_expense(session: Session, expense_id: int) -> bool:
    """
    Delete an expense by ID.
    Returns True if deleted, False if not found.
    """
    expense = session.get(Expense, expense_id)
    if not expense:
        return False
    session.delete(expense)
    session.commit()
    return True
