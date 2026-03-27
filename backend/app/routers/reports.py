"""
routers/reports.py
------------------
Analytics and reporting routes.
Routes:
  GET /api/v1/reports/monthly-summary
  GET /api/v1/reports/by-category
  GET /api/v1/reports/trend
  GET /api/v1/reports/top-expenses
"""

from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import MonthlySummary, CategoryBreakdown, TrendPoint, ExpenseRead
from app.services.report_service import (
    get_monthly_summary,
    get_category_breakdown,
    get_spend_trend,
    get_top_expenses,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly-summary", response_model=MonthlySummary)
def monthly_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    session: Session = Depends(get_session),
):
    """Total spend, count, and average for a given month."""
    now = datetime.utcnow()
    return get_monthly_summary(
        session,
        month=month or now.month,
        year=year or now.year,
    )


@router.get("/by-category", response_model=list[CategoryBreakdown])
def by_category(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    session: Session = Depends(get_session),
):
    """Spend breakdown by category for a given month, with percentages."""
    now = datetime.utcnow()
    return get_category_breakdown(
        session,
        month=month or now.month,
        year=year or now.year,
    )


@router.get("/trend", response_model=list[TrendPoint])
def spend_trend(
    months: int = Query(6, ge=1, le=24, description="How many months of history"),
    session: Session = Depends(get_session),
):
    """Monthly total spend over the past N months (default: 6)."""
    return get_spend_trend(session, months=months)


@router.get("/top-expenses", response_model=list[ExpenseRead])
def top_expenses(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    limit: int = Query(5, ge=1, le=20),
    session: Session = Depends(get_session),
):
    """Top N highest-amount expenses in a given month."""
    now = datetime.utcnow()
    return get_top_expenses(
        session,
        month=month or now.month,
        year=year or now.year,
        limit=limit,
    )
