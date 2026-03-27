"""
services/report_service.py
--------------------------
All analytics computations for reports endpoints.

v1.2.0: All functions accept explicit date_from / date_to instead of
month/year only, enabling week/quarter/year period support from the frontend.
month/year params are kept for backwards-compat fallback.
"""

from calendar import monthrange
from datetime import date, datetime
from typing import Optional
from dateutil.relativedelta import relativedelta

from sqlmodel import Session, select, func

from app.models import Expense, Category
from app.schemas import MonthlySummary, CategoryBreakdown, TrendPoint


def _month_range(year: int, month: int) -> tuple[date, date]:
    """Return (first_day, last_day) for a given month."""
    first = date(year, month, 1)
    last_day = monthrange(year, month)[1]
    last = date(year, month, last_day)
    return first, last


def _resolve_range(
    date_from: Optional[date],
    date_to: Optional[date],
    month: int,
    year: int,
) -> tuple[date, date]:
    """
    If explicit date range provided, use it. Otherwise fall back to month/year.
    """
    if date_from and date_to:
        return date_from, date_to
    return _month_range(year, month)


def get_monthly_summary(
    session: Session,
    month: int,
    year: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    period_label: str = "",
) -> MonthlySummary:
    """
    Total spend, income, net balance, count, and average for a date range.
    v1.2.0: accepts explicit date_from/date_to for week/quarter/year support.
    """
    start, end = _resolve_range(date_from, date_to, month, year)

    # Expenses only
    expense_result = session.exec(
        select(
            func.sum(Expense.amount),
            func.count(Expense.id),
        ).where(
            Expense.date >= start,
            Expense.date <= end,
            Expense.type == "expense",
        )
    ).first()

    # Income entries
    income_result = session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.date >= start,
            Expense.date <= end,
            Expense.type == "income",
        )
    ).first()

    total = round(expense_result[0] or 0.0, 2)
    count = expense_result[1] or 0
    avg = round(total / count, 2) if count > 0 else 0.0
    income = round(income_result or 0.0, 2)
    net = round(income - total, 2)

    return MonthlySummary(
        month=month,
        year=year,
        total_spend=total,
        total_income=income,
        net_balance=net,
        expense_count=count,
        avg_expense=avg,
        period_label=period_label,
    )


def get_category_breakdown(
    session: Session,
    month: int,
    year: int,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[CategoryBreakdown]:
    """
    Per-category spend totals for a date range, with percentage of total.
    Sorted by total descending.
    """
    start, end = _resolve_range(date_from, date_to, month, year)

    rows = session.exec(
        select(
            Expense.category_id,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .where(
            Expense.date >= start,
            Expense.date <= end,
            Expense.type == "expense",
        )
        .group_by(Expense.category_id)
        .order_by(func.sum(Expense.amount).desc())
    ).all()

    grand_total = sum(r[1] for r in rows) or 1

    result = []
    for row in rows:
        category_id, total, count = row
        category = session.get(Category, category_id)
        result.append(CategoryBreakdown(
            category_id=category_id,
            category_name=category.name if category else "Unknown",
            category_color=category.color if category else "#6b7280",
            total=round(total, 2),
            count=count,
            percentage=round((total / grand_total) * 100, 1),
        ))

    return result


def get_spend_trend(session: Session, months: int = 6) -> list[TrendPoint]:
    """
    Monthly total spend for the past N months.
    Returns oldest-first so charts render left-to-right.
    """
    now = datetime.utcnow()
    result = []

    for i in range(months - 1, -1, -1):
        target = datetime(now.year, now.month, 1) - relativedelta(months=i)
        start, end = _month_range(target.year, target.month)

        total_result = session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.date >= start,
                Expense.date <= end,
                Expense.type == "expense",
            )
        ).first()

        income_result = session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.date >= start,
                Expense.date <= end,
                Expense.type == "income",
            )
        ).first()

        total = round(total_result or 0.0, 2)
        income = round(income_result or 0.0, 2)
        label = target.strftime("%b %Y")

        result.append(TrendPoint(
            month=target.month,
            year=target.year,
            total=total,
            income=income,
            label=label,
        ))

    return result


def get_top_expenses(
    session: Session,
    month: int,
    year: int,
    limit: int = 5,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
) -> list[Expense]:
    """Top N highest-amount expenses in a date range, sorted descending."""
    start, end = _resolve_range(date_from, date_to, month, year)

    return session.exec(
        select(Expense)
        .where(
            Expense.date >= start,
            Expense.date <= end,
            Expense.type == "expense",
        )
        .order_by(Expense.amount.desc())
        .limit(limit)
    ).all()
