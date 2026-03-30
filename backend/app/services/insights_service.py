"""
services/insights_service.py
-----------------------------
Rule-based insights engine. Runs 10 detection rules against current
spending data and returns active insight messages.

Rules (from PRD §4.5 + v1.8.0):
  1. budget_overspend   — actual > budget for any category
  2. burn_rate          — actual > 80% of budget before month end
  3. mom_spike          — this month > last month by 30%+ in a category
  4. top_category       — highest spend category this month
  5. unusual_expense    — single expense > 2x the category average
  6. savings_opportunity — consistently under budget (2 months running)
  7. streak             — no expenses added in 3+ days
  8. daily_rate         — v1.8.0: projected month-end spend from daily burn rate
  9. savings_rate       — v1.8.0: % of income being saved this month
 10. yoy_comparison     — v1.8.0: this month vs same month last year
"""

from calendar import monthrange
from datetime import date, datetime, timedelta

from sqlmodel import Session, select, func

from app.models import Budget, Category, Expense
from app.schemas import Insight


def _month_range(year: int, month: int) -> tuple[date, date]:
    first = date(year, month, 1)
    last = date(year, month, monthrange(year, month)[1])
    return first, last


def _prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def compute_insights(session: Session) -> list[Insight]:
    now = datetime.utcnow()
    year, month = now.year, now.month
    start, end = _month_range(year, month)
    insights: list[Insight] = []

    # -----------------------------------------------------------------------
    # Pre-fetch this month's budgets
    # -----------------------------------------------------------------------
    budgets = session.exec(
        select(Budget).where(Budget.month == month, Budget.year == year)
    ).all()

    # -----------------------------------------------------------------------
    # Pre-fetch this month's actuals per category
    # -----------------------------------------------------------------------
    actuals_rows = session.exec(
        select(Expense.category_id, func.sum(Expense.amount))
        .where(Expense.date >= start, Expense.date <= end)
        .group_by(Expense.category_id)
    ).all()
    actuals: dict[int, float] = {row[0]: row[1] for row in actuals_rows}

    # -----------------------------------------------------------------------
    # Rule 1 & 2: Budget overspend + burn rate warning
    # -----------------------------------------------------------------------
    days_in_month = monthrange(year, month)[1]
    days_elapsed = now.day
    month_progress = days_elapsed / days_in_month  # 0.0 → 1.0

    for budget in budgets:
        actual = actuals.get(budget.category_id, 0.0)
        category = session.get(Category, budget.category_id)
        cat_name = category.name if category else "Unknown"

        if actual > budget.amount:
            pct_over = round(((actual - budget.amount) / budget.amount) * 100, 1)
            insights.append(Insight(
                type="budget_overspend",
                message=f"{cat_name} is {pct_over}% over budget this month "
                        f"(₹{actual:.0f} spent vs ₹{budget.amount:.0f} budget).",
                severity="alert",
                category_id=budget.category_id,
                category_name=cat_name,
                value=pct_over,
            ))
        elif actual > budget.amount * 0.80 and month_progress < 0.90:
            pct_used = round((actual / budget.amount) * 100, 1)
            insights.append(Insight(
                type="burn_rate",
                message=f"{cat_name} has used {pct_used}% of its budget "
                        f"with {days_in_month - days_elapsed} days remaining.",
                severity="warning",
                category_id=budget.category_id,
                category_name=cat_name,
                value=pct_used,
            ))

    # -----------------------------------------------------------------------
    # Rule 3: Month-over-month spike (>30% increase)
    # -----------------------------------------------------------------------
    prev_year, prev_month = _prev_month(year, month)
    prev_start, prev_end = _month_range(prev_year, prev_month)

    prev_actuals_rows = session.exec(
        select(Expense.category_id, func.sum(Expense.amount))
        .where(Expense.date >= prev_start, Expense.date <= prev_end)
        .group_by(Expense.category_id)
    ).all()
    prev_actuals: dict[int, float] = {row[0]: row[1] for row in prev_actuals_rows}

    for cat_id, this_total in actuals.items():
        prev_total = prev_actuals.get(cat_id, 0)
        if prev_total > 0:
            change_pct = ((this_total - prev_total) / prev_total) * 100
            if change_pct >= 30:
                category = session.get(Category, cat_id)
                cat_name = category.name if category else "Unknown"
                insights.append(Insight(
                    type="mom_spike",
                    message=f"{cat_name} spending is up {change_pct:.0f}% vs last month "
                            f"(₹{this_total:.0f} vs ₹{prev_total:.0f}).",
                    severity="warning",
                    category_id=cat_id,
                    category_name=cat_name,
                    value=round(change_pct, 1),
                ))

    # -----------------------------------------------------------------------
    # Rule 4: Top spending category this month
    # -----------------------------------------------------------------------
    if actuals:
        top_cat_id = max(actuals, key=actuals.get)
        top_total = actuals[top_cat_id]
        category = session.get(Category, top_cat_id)
        cat_name = category.name if category else "Unknown"
        insights.append(Insight(
            type="top_category",
            message=f"Your biggest spend this month is {cat_name} at ₹{top_total:.0f}.",
            severity="info",
            category_id=top_cat_id,
            category_name=cat_name,
            value=top_total,
        ))

    # -----------------------------------------------------------------------
    # Rule 5: Unusual expense (single expense > 2x category average)
    # -----------------------------------------------------------------------
    for cat_id, total in actuals.items():
        count_result = session.exec(
            select(func.count(Expense.id)).where(
                Expense.category_id == cat_id,
                Expense.date >= start,
                Expense.date <= end,
            )
        ).first()
        count = count_result or 0
        if count == 0:
            continue

        avg = total / count
        unusual = session.exec(
            select(Expense).where(
                Expense.category_id == cat_id,
                Expense.date >= start,
                Expense.date <= end,
                Expense.amount > avg * 2,
            )
        ).all()

        for expense in unusual:
            category = session.get(Category, cat_id)
            cat_name = category.name if category else "Unknown"
            insights.append(Insight(
                type="unusual_expense",
                message=f"Unusual {cat_name} expense: ₹{expense.amount:.0f} is more than 2x "
                        f"your ₹{avg:.0f} average in this category.",
                severity="warning",
                category_id=cat_id,
                category_name=cat_name,
                value=expense.amount,
            ))

    # -----------------------------------------------------------------------
    # Rule 6: Savings opportunity — under budget 2 months running
    # -----------------------------------------------------------------------
    for budget in budgets:
        this_actual = actuals.get(budget.category_id, 0.0)
        prev_actual = prev_actuals.get(budget.category_id, 0.0)

        # Both months must have some spending to avoid false positives
        if this_actual > 0 and prev_actual > 0:
            if this_actual < budget.amount * 0.60 and prev_actual < budget.amount * 0.60:
                category = session.get(Category, budget.category_id)
                cat_name = category.name if category else "Unknown"
                insights.append(Insight(
                    type="savings_opportunity",
                    message=f"You've been well under your {cat_name} budget for 2 months. "
                            f"Consider lowering it to ₹{this_actual * 1.2:.0f}.",
                    severity="info",
                    category_id=budget.category_id,
                    category_name=cat_name,
                    value=this_actual,
                ))

    # -----------------------------------------------------------------------
    # Rule 7: Streak — no expenses logged in 3+ days
    # -----------------------------------------------------------------------
    latest_expense = session.exec(
        select(Expense).order_by(Expense.date.desc()).limit(1)
    ).first()

    if latest_expense:
        days_since = (now.date() - latest_expense.date).days
        if days_since >= 3:
            insights.append(Insight(
                type="streak",
                message=f"No expenses logged in {days_since} days. "
                        f"Make sure you're up to date!",
                severity="info",
                value=float(days_since),
            ))

    # -----------------------------------------------------------------------
    # Rule 8: Daily burn rate → projected month-end spend (v1.8.0)
    # -----------------------------------------------------------------------
    total_this_month = sum(actuals.values())
    if total_this_month > 0 and days_elapsed > 0:
        daily_rate = total_this_month / days_elapsed
        predicted_total = daily_rate * days_in_month
        days_left = days_in_month - days_elapsed
        # Only surface if meaningful days remain and projection is significant
        if days_left > 0 and predicted_total > total_this_month:
            insights.append(Insight(
                type="daily_rate",
                message=(
                    f"You're spending ₹{daily_rate:.0f}/day on average. "
                    f"At this pace you'll spend ₹{predicted_total:.0f} by month end "
                    f"(₹{total_this_month:.0f} spent so far with {days_left} days left)."
                ),
                severity="info",
                value=round(predicted_total, 2),
            ))

    # -----------------------------------------------------------------------
    # Rule 9: Savings rate — % of income saved this month (v1.8.0)
    # -----------------------------------------------------------------------
    total_income_this_month = session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.date >= start, Expense.date <= end,
            Expense.type == "income",
        )
    ).first() or 0.0

    if total_income_this_month > 0:
        savings = total_income_this_month - total_this_month
        savings_rate_pct = (savings / total_income_this_month) * 100
        if savings_rate_pct >= 20:
            insights.append(Insight(
                type="savings_rate",
                message=(
                    f"You're saving {savings_rate_pct:.0f}% of your income this month "
                    f"(₹{savings:.0f} surplus on ₹{total_income_this_month:.0f} income). Keep it up! 🎉"
                ),
                severity="info",
                value=round(savings_rate_pct, 1),
            ))
        elif savings_rate_pct < 0:
            deficit = abs(savings)
            insights.append(Insight(
                type="savings_rate",
                message=(
                    f"You're spending ₹{deficit:.0f} more than you earned this month "
                    f"(₹{total_this_month:.0f} out vs ₹{total_income_this_month:.0f} in). "
                    f"Consider reducing non-essential spend."
                ),
                severity="warning",
                value=round(savings_rate_pct, 1),
            ))

    # -----------------------------------------------------------------------
    # Rule 10: Year-over-year comparison for current month (v1.8.0)
    # -----------------------------------------------------------------------
    yoy_prev_year = year - 1
    yoy_start, yoy_end = _month_range(yoy_prev_year, month)
    yoy_total = session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.date >= yoy_start, Expense.date <= yoy_end,
            Expense.type == "expense",
        )
    ).first() or 0.0

    if yoy_total > 0 and total_this_month > 0:
        yoy_change_pct = ((total_this_month - yoy_total) / yoy_total) * 100
        month_name = start.strftime("%B")
        if abs(yoy_change_pct) >= 15:
            direction = "more" if yoy_change_pct > 0 else "less"
            sev = "warning" if yoy_change_pct > 0 else "info"
            insights.append(Insight(
                type="yoy_comparison",
                message=(
                    f"You've spent {abs(yoy_change_pct):.0f}% {direction} in {month_name} this year "
                    f"vs {month_name} last year "
                    f"(₹{total_this_month:.0f} vs ₹{yoy_total:.0f})."
                ),
                severity=sev,
                value=round(yoy_change_pct, 1),
            ))

    return insights
