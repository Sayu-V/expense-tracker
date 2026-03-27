"""
routers/budgets.py
------------------
Routes for monthly budget management.
Routes:
  POST  /api/v1/budgets
  GET   /api/v1/budgets
  GET   /api/v1/budgets/status
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import BudgetCreate, BudgetRead, BudgetStatus
from app.services.budget_service import (
    create_or_update_budget,
    get_budgets,
    get_budget_status,
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
    """
    Get all budgets. Defaults to current month/year if not specified.
    """
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
    """
    now = datetime.utcnow()
    return get_budget_status(
        session,
        month=month or now.month,
        year=year or now.year,
    )
