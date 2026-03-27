"""
services/budget_service.py
--------------------------
Business logic for budget management and budget vs actual calculation.
"""

from datetime import date
from sqlmodel import Session, select, func

from app.models import Budget, Expense, Category
from app.schemas import BudgetCreate, BudgetRead, BudgetStatus


def create_or_update_budget(session: Session, payload: BudgetCreate) -> Budget:
    """
    Upsert a budget for a given category + month + year.
    If one already exists, its amount is updated instead of creating a duplicate.
    """
    from fastapi import HTTPException

    # Verify category exists
    category = session.get(Category, payload.category_id)
    if not category:
        raise HTTPException(
            status_code=400,
            detail=f"Category {payload.category_id} does not exist"
        )

    # Check for existing budget for same category/month/year
    existing = session.exec(
        select(Budget).where(
            Budget.category_id == payload.category_id,
            Budget.month == payload.month,
            Budget.year == payload.year,
        )
    ).first()

    if existing:
        existing.amount = payload.amount
        session.add(existing)
        session.commit()
        session.refresh(existing)
        return existing

    budget = Budget(
        category_id=payload.category_id,
        amount=payload.amount,
        month=payload.month,
        year=payload.year,
    )
    session.add(budget)
    session.commit()
    session.refresh(budget)
    return budget


def get_budgets(session: Session, month: int, year: int) -> list[Budget]:
    """Return all budgets for a given month and year."""
    return session.exec(
        select(Budget).where(Budget.month == month, Budget.year == year)
    ).all()


def get_budget_status(session: Session, month: int, year: int) -> list[BudgetStatus]:
    """
    For each budget in the given month/year, compute:
      - actual spend (sum of expenses in that category for that month)
      - remaining = budgeted - actual
      - percent_used = (actual / budgeted) * 100
      - is_over_budget = actual > budgeted
    """
    budgets = get_budgets(session, month, year)
    result = []

    for budget in budgets:
        # Sum expenses for this category in this month/year
        start = date(year, month, 1)
        # Last day of month
        if month == 12:
            end = date(year + 1, 1, 1)
        else:
            end = date(year, month + 1, 1)

        actual_result = session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.category_id == budget.category_id,
                Expense.date >= start,
                Expense.date < end,
            )
        ).first()

        actual = round(actual_result or 0.0, 2)
        budgeted = budget.amount
        remaining = round(budgeted - actual, 2)
        percent_used = round((actual / budgeted) * 100, 1) if budgeted > 0 else 0.0

        category = session.get(Category, budget.category_id)

        result.append(BudgetStatus(
            category_id=budget.category_id,
            category_name=category.name if category else "Unknown",
            category_color=category.color if category else "#6b7280",
            budgeted=budgeted,
            actual=actual,
            remaining=remaining,
            percent_used=percent_used,
            is_over_budget=actual > budgeted,
        ))

    return result
