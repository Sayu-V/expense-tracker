"""
services/expense_service.py
---------------------------
Business logic layer for Expense CRUD.
Routers call these functions — they never touch the DB directly.
This separation makes unit testing easy (just pass a test session).
"""

from datetime import date, datetime
from typing import Optional
from sqlmodel import Session, select

from app.models import Expense, Category
from app.schemas import ExpenseCreate, ExpenseUpdate


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
