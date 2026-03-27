"""
routers/expenses.py
-------------------
All CRUD routes for expense records.
Routes:
  POST   /api/v1/expenses
  GET    /api/v1/expenses
  GET    /api/v1/expenses/{id}
  PUT    /api/v1/expenses/{id}
  DELETE /api/v1/expenses/{id}
"""

from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import ExpenseCreate, ExpenseUpdate, ExpenseRead
from app.services.expense_service import (
    create_expense,
    get_expense_by_id,
    list_expenses,
    update_expense,
    delete_expense,
)

router = APIRouter(prefix="/expenses", tags=["Expenses"])


@router.post("", response_model=ExpenseRead, status_code=201)
def create(payload: ExpenseCreate, session: Session = Depends(get_session)):
    """Create a new expense record."""
    return create_expense(session, payload)


@router.get("", response_model=list[ExpenseRead])
def list_all(
    category_id: Optional[int] = Query(None, description="Filter by category"),
    date_from: Optional[date] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="End date (YYYY-MM-DD)"),
    min_amount: Optional[float] = Query(None, description="Minimum amount"),
    max_amount: Optional[float] = Query(None, description="Maximum amount"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    session: Session = Depends(get_session),
):
    """
    List expenses with optional filters.
    All filters are combinable — e.g. ?category_id=1&date_from=2026-03-01
    """
    return list_expenses(
        session,
        category_id=category_id,
        date_from=date_from,
        date_to=date_to,
        min_amount=min_amount,
        max_amount=max_amount,
        limit=limit,
        offset=offset,
    )


@router.get("/{expense_id}", response_model=ExpenseRead)
def get_one(expense_id: int, session: Session = Depends(get_session)):
    """Get a single expense by ID."""
    expense = get_expense_by_id(session, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail=f"Expense {expense_id} not found")
    return expense


@router.put("/{expense_id}", response_model=ExpenseRead)
def update(
    expense_id: int,
    payload: ExpenseUpdate,
    session: Session = Depends(get_session),
):
    """Update an existing expense. Only provided fields are updated."""
    expense = update_expense(session, expense_id, payload)
    if not expense:
        raise HTTPException(status_code=404, detail=f"Expense {expense_id} not found")
    return expense


@router.delete("/{expense_id}", status_code=204)
def delete(expense_id: int, session: Session = Depends(get_session)):
    """Delete an expense by ID. Returns 204 No Content on success."""
    deleted = delete_expense(session, expense_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Expense {expense_id} not found")
