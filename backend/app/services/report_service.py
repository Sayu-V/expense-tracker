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
from app.schemas import MonthlySummary, CategoryBreakdown, TrendPoint, YoYPoint, SpendPrediction


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


def get_year_over_year(session: Session, year: Optional[int] = None) -> list[YoYPoint]:
    """
    v1.8.0 — Monthly expense + income totals for this_year vs last_year.
    Returns 12 YoYPoint objects (Jan–Dec), oldest first.
    Only returns months up to the current month for this_year (future months
    are 0.0 so the chart stays honest).
    """
    now = datetime.utcnow()
    this_year = year or now.year
    last_year = this_year - 1
    cal_months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    result: list[YoYPoint] = []

    for m in range(1, 13):
        # this_year — only show actuals for months that have already started
        if this_year == now.year and m > now.month:
            ty_expense = 0.0
            ty_income  = 0.0
        else:
            ty_start, ty_end = _month_range(this_year, m)
            ty_expense = round(session.exec(
                select(func.sum(Expense.amount)).where(
                    Expense.date >= ty_start, Expense.date <= ty_end,
                    Expense.type == "expense",
                )
            ).first() or 0.0, 2)
            ty_income = round(session.exec(
                select(func.sum(Expense.amount)).where(
                    Expense.date >= ty_start, Expense.date <= ty_end,
                    Expense.type == "income",
                )
            ).first() or 0.0, 2)

        ly_start, ly_end = _month_range(last_year, m)
        ly_expense = round(session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.date >= ly_start, Expense.date <= ly_end,
                Expense.type == "expense",
            )
        ).first() or 0.0, 2)
        ly_income = round(session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.date >= ly_start, Expense.date <= ly_end,
                Expense.type == "income",
            )
        ).first() or 0.0, 2)

        result.append(YoYPoint(
            month=m,
            label=cal_months[m - 1],
            this_year=ty_expense,
            last_year=ly_expense,
            income_this_year=ty_income,
            income_last_year=ly_income,
        ))

    return result


def get_spend_prediction(
    session: Session,
    month: Optional[int] = None,
    year: Optional[int] = None,
) -> SpendPrediction:
    """
    v1.8.0 — Linear extrapolation of current month spend.
    daily_rate  = total_spent / days_elapsed
    predicted   = daily_rate × days_in_month
    """
    now = datetime.utcnow()
    m = month or now.month
    y = year or now.year
    start, end = _month_range(y, m)
    days_in_month = monthrange(y, m)[1]

    # For current month use today as the cutoff; for past months use the last day
    if y == now.year and m == now.month:
        days_elapsed = max(now.day, 1)
        cutoff = now.date()
    else:
        days_elapsed = days_in_month
        cutoff = end

    spent = round(session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.date >= start,
            Expense.date <= cutoff,
            Expense.type == "expense",
        )
    ).first() or 0.0, 2)

    income = round(session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.date >= start,
            Expense.date <= cutoff,
            Expense.type == "income",
        )
    ).first() or 0.0, 2)

    daily_rate = round(spent / days_elapsed, 2) if days_elapsed > 0 else 0.0
    predicted  = round(daily_rate * days_in_month, 2)
    pred_net   = round(income - predicted, 2)

    return SpendPrediction(
        month=m,
        year=y,
        days_elapsed=days_elapsed,
        days_in_month=days_in_month,
        spent_so_far=spent,
        daily_rate=daily_rate,
        predicted_total=predicted,
        income_so_far=income,
        predicted_net=pred_net,
    )


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
