"""
routers/budgets.py
------------------
Routes for monthly budget management.
Routes:
  POST   /api/v1/budgets
  GET    /api/v1/budgets
  GET    /api/v1/budgets/status
  PUT    /api/v1/budgets/{id}      (v1.5.0 — edit budget amount)
  DELETE /api/v1/budgets/{id}      (v1.5.0 — delete a budget)
  POST   /api/v1/budgets/bulk-delete (v1.5.0 — bulk delete)
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import BudgetCreate, BudgetRead, BudgetStatus, BudgetUpdate, BulkDeleteRequest
from app.services.budget_service import (
    create_or_update_budget,
    get_budgets,
    get_budget_status,
    update_budget,
    delete_budget,
    bulk_delete_budgets,
)

router = APIRouter(prefix="/budgets", tags=["Budgets"])


@router.post("", response_model=BudgetRead, status_code=201)
def set_budget(payload: BudgetCreate, session: Session = Depends(get_session)):
    """
    Set (or update) a monthly budget for a category.
    If a budget already exists for that category+month+year, it is updated.
    """
    return create_or_update_budget(session, payload)


@router.get("", response_model=list[BudgetRead])
def list_budgets(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    session: Session = Depends(get_session),
):
    """Get all budgets. Defaults to current month/year if not specified."""
    now = datetime.utcnow()
    return get_budgets(
        session,
        month=month or now.month,
        year=year or now.year,
    )


@router.get("/status", response_model=list[BudgetStatus])
def budget_status(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    session: Session = Depends(get_session),
):
    """
    Returns actual vs budgeted spend per category for the given month.
    Includes percent_used, remaining, and is_over_budget flag.
    v1.5.0: also returns budget_id for edit/delete.
    """
    now = datetime.utcnow()
    return get_budget_status(
        session,
        month=month or now.month,
        year=year or now.year,
    )


# v1.5.0 — must be declared BEFORE /{budget_id} to avoid route conflict
@router.post("/bulk-delete", status_code=200)
def bulk_delete(payload: BulkDeleteRequest, session: Session = Depends(get_session)):
    """v1.5.0 — Delete multiple budgets by ID."""
    count = bulk_delete_budgets(session, payload.ids)
    return {"deleted": count}


@router.put("/{budget_id}", response_model=BudgetRead)
def update_budget_endpoint(
    budget_id: int,
    payload: BudgetUpdate,
    session: Session = Depends(get_session),
):
    """v1.5.0 — Update the amount of an existing budget."""
    return update_budget(session, budget_id, payload)


@router.delete("/{budget_id}", status_code=204)
def delete_budget_endpoint(budget_id: int, session: Session = Depends(get_session)):
    """v1.5.0 — Delete a budget by ID. Returns 204 No Content on success."""
    deleted = delete_budget(session, budget_id)
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Budget {budget_id} not found")
