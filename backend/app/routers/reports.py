"""
routers/reports.py
------------------
Analytics and reporting routes.

v1.2.0: All endpoints accept optional date_from/date_to for custom period
support (week, quarter, year) driven from the frontend period selector.

Routes:
  GET /api/v1/reports/monthly-summary
  GET /api/v1/reports/by-category
  GET /api/v1/reports/trend
  GET /api/v1/reports/top-expenses
"""

from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import MonthlySummary, CategoryBreakdown, TrendPoint, ExpenseRead, YoYPoint, SpendPrediction
from app.services.report_service import (
    get_monthly_summary,
    get_category_breakdown,
    get_spend_trend,
    get_top_expenses,
    get_year_over_year,
    get_spend_prediction,
)

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/monthly-summary", response_model=MonthlySummary)
def monthly_summary(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None, description="v1.2.0: Custom range start (YYYY-MM-DD)"),
    date_to: Optional[date] = Query(None, description="v1.2.0: Custom range end (YYYY-MM-DD)"),
    period_label: str = Query("", description="v1.2.0: Human-readable label for the period"),
    session: Session = Depends(get_session),
):
    """Total spend, income, net balance, count, and average for a period."""
    now = datetime.utcnow()
    return get_monthly_summary(
        session,
        month=month or now.month,
        year=year or now.year,
        date_from=date_from,
        date_to=date_to,
        period_label=period_label,
    )


@router.get("/by-category", response_model=list[CategoryBreakdown])
def by_category(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    session: Session = Depends(get_session),
):
    """Spend breakdown by category for a period, with percentages."""
    now = datetime.utcnow()
    return get_category_breakdown(
        session,
        month=month or now.month,
        year=year or now.year,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/trend", response_model=list[TrendPoint])
def spend_trend(
    months: int = Query(6, ge=1, le=24, description="How many months of history"),
    session: Session = Depends(get_session),
):
    """Monthly total spend + income over the past N months."""
    return get_spend_trend(session, months=months)


@router.get("/year-over-year", response_model=list[YoYPoint])
def year_over_year(
    year: Optional[int] = Query(None, description="v1.8.0: Year to compare (defaults to current year)"),
    session: Session = Depends(get_session),
):
    """
    v1.8.0 — Month-by-month expense + income totals for this_year vs last_year.
    Returns 12 data points (Jan–Dec). Future months of the current year show 0.
    """
    return get_year_over_year(session, year=year)


@router.get("/prediction", response_model=SpendPrediction)
def spend_prediction(
    month: Optional[int] = Query(None, ge=1, le=12, description="v1.8.0: Month to predict (defaults to current month)"),
    year: Optional[int] = Query(None, description="v1.8.0: Year (defaults to current year)"),
    session: Session = Depends(get_session),
):
    """
    v1.8.0 — Linear extrapolation of current month spend.
    Uses daily_rate = spent_so_far / days_elapsed, then projects to month end.
    """
    return get_spend_prediction(session, month=month, year=year)


@router.get("/top-expenses", response_model=list[ExpenseRead])
def top_expenses(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    limit: int = Query(5, ge=1, le=20),
    session: Session = Depends(get_session),
):
    """Top N highest-amount expenses in a period."""
    now = datetime.utcnow()
    return get_top_expenses(
        session,
        month=month or now.month,
        year=year or now.year,
        limit=limit,
        date_from=date_from,
        date_to=date_to,
    )
