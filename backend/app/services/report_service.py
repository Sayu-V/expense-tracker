"""
services/report_service.py
--------------------------
All analytics computations for reports endpoints.
Uses raw SQLModel/SQLAlchemy aggregations for performance — avoids
loading full Expense objects when only aggregates are needed.
"""

from calendar import monthrange
from datetime import date, datetime
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


def get_monthly_summary(session: Session, month: int, year: int) -> MonthlySummary:
    """
    Total spend, income, net balance, count, and average for a given month.
    v1.1.0: Added income and net_balance using the Expense.type field.
    """
    start, end = _month_range(year, month)

    # Expenses (type = 'expense' OR legacy rows with no type set)
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
    )


def get_category_breakdown(
    session: Session, month: int, year: int
) -> list[CategoryBreakdown]:
    """
    Per-category spend totals for a month, with percentage of total.
    Sorted by total descending.
    """
    start, end = _month_range(year, month)

    rows = session.exec(
        select(
            Expense.category_id,
            func.sum(Expense.amount).label("total"),
            func.count(Expense.id).label("count"),
        )
        .where(
            Expense.date >= start,
            Expense.date <= end,
            Expense.type == "expense",   # v1.1.0: exclude income from breakdown
        )
        .group_by(Expense.category_id)
        .order_by(func.sum(Expense.amount).desc())
    ).all()

    grand_total = sum(r[1] for r in rows) or 1  # avoid division by zero

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
                Expense.type == "expense",   # v1.1.0: exclude income from trend
            )
        ).first()

        total = round(total_result or 0.0, 2)
        label = target.strftime("%b %Y")  # e.g. "Mar 2026"

        result.append(TrendPoint(
            month=target.month,
            year=target.year,
            total=total,
            label=label,
        ))

    return result


def get_top_expenses(
    session: Session, month: int, year: int, limit: int = 5
) -> list[Expense]:
    """Top N highest-amount expenses in a given month, sorted descending."""
    start, end = _month_range(year, month)

    return session.exec(
        select(Expense)
        .where(Expense.date >= start, Expense.date <= end)
        .order_by(Expense.amount.desc())
        .limit(limit)
    ).all()
