"""
alert_service.py
----------------
Generates and manages spending alerts for two scenarios:

1. Budget threshold alerts
   - 'budget_80'  : a category has used ≥ 80% of its monthly budget
   - 'budget_over': a category has exceeded its monthly budget

2. Category spike alerts
   - 'category_spike': spending in a category this month is > 1.5× last month

Alerts are stored in the spending_alerts table. The generate endpoint
is idempotent for the current month — it won't duplicate alerts that
already exist for the same category + alert_type + month.
"""

from datetime import date, datetime
from sqlmodel import Session, select

from app.models import SpendingAlert, Budget, Expense, Category
from app.schemas import SpendingAlertRead, AlertsResponse


# ---------------------------------------------------------------------------
# Read helpers
# ---------------------------------------------------------------------------

def get_alerts(session: Session, unread_only: bool = False) -> AlertsResponse:
    stmt = select(SpendingAlert).order_by(SpendingAlert.created_at.desc())
    if unread_only:
        stmt = stmt.where(SpendingAlert.is_read == False)
    alerts = list(session.exec(stmt).all())
    unread_count = sum(1 for a in alerts if not a.is_read)
    return AlertsResponse(
        alerts=[SpendingAlertRead.model_validate(a) for a in alerts],
        unread_count=unread_count,
    )


def mark_read(session: Session, alert_id: int) -> bool:
    alert = session.get(SpendingAlert, alert_id)
    if not alert:
        return False
    alert.is_read = True
    session.add(alert)
    session.commit()
    return True


def mark_all_read(session: Session) -> int:
    alerts = session.exec(
        select(SpendingAlert).where(SpendingAlert.is_read == False)
    ).all()
    count = len(alerts)
    for a in alerts:
        a.is_read = True
        session.add(a)
    session.commit()
    return count


def delete_alert(session: Session, alert_id: int) -> bool:
    alert = session.get(SpendingAlert, alert_id)
    if not alert:
        return False
    session.delete(alert)
    session.commit()
    return True


# ---------------------------------------------------------------------------
# Generation logic
# ---------------------------------------------------------------------------

def _get_month_spend(session: Session, category_id: int, month: int, year: int) -> float:
    """Sum of expense-type entries for a category in a given month."""
    from sqlalchemy import extract, func
    result = session.exec(
        select(func.coalesce(func.sum(Expense.amount), 0.0)).where(
            Expense.category_id == category_id,
            Expense.type == "expense",
            extract("month", Expense.date) == month,
            extract("year", Expense.date) == year,
        )
    ).one()
    return float(result)


def _alert_exists(
    session: Session, alert_type: str, category_id: int | None, month: int, year: int
) -> bool:
    """Check if an alert of this type was already generated this month."""
    stmt = (
        select(SpendingAlert)
        .where(
            SpendingAlert.alert_type == alert_type,
            SpendingAlert.category_id == category_id,
        )
    )
    existing = session.exec(stmt).all()
    for a in existing:
        if a.created_at.month == month and a.created_at.year == year:
            return True
    return False


def generate_alerts(session: Session) -> list[SpendingAlertRead]:
    """
    Compute budget and spike alerts for the current month.
    Idempotent — skips any alert type+category already raised this month.
    Returns the list of newly created alerts.
    """
    today = date.today()
    month, year = today.month, today.year
    new_alerts: list[SpendingAlert] = []

    # -- Budget threshold alerts (80% and over) ---------------------------
    budgets = session.exec(
        select(Budget).where(Budget.month == month, Budget.year == year)
    ).all()

    for budget in budgets:
        actual = _get_month_spend(session, budget.category_id, month, year)
        category = session.get(Category, budget.category_id)
        cat_name = category.name if category else f"Category {budget.category_id}"
        percent = (actual / budget.amount * 100) if budget.amount > 0 else 0

        if percent >= 100:
            if not _alert_exists(session, "budget_over", budget.category_id, month, year):
                msg = (
                    f"🚨 {cat_name} budget exceeded! "
                    f"Spent ₹{actual:,.0f} of ₹{budget.amount:,.0f} "
                    f"({percent:.0f}% used)."
                )
                alert = SpendingAlert(
                    alert_type="budget_over",
                    message=msg,
                    severity="alert",
                    category_id=budget.category_id,
                )
                session.add(alert)
                new_alerts.append(alert)

        elif percent >= 80:
            if not _alert_exists(session, "budget_80", budget.category_id, month, year):
                msg = (
                    f"⚠️ {cat_name} budget is {percent:.0f}% used. "
                    f"Spent ₹{actual:,.0f} of ₹{budget.amount:,.0f} — "
                    f"₹{budget.amount - actual:,.0f} remaining."
                )
                alert = SpendingAlert(
                    alert_type="budget_80",
                    message=msg,
                    severity="warning",
                    category_id=budget.category_id,
                )
                session.add(alert)
                new_alerts.append(alert)

    # -- Category spike alerts (this month > 1.5x last month) -------------
    # Determine last month
    if month == 1:
        last_month, last_year = 12, year - 1
    else:
        last_month, last_year = month - 1, year

    categories = session.exec(
        select(Category).where(Category.category_type == "expense")
    ).all()

    for cat in categories:
        this_spend = _get_month_spend(session, cat.id, month, year)
        last_spend = _get_month_spend(session, cat.id, last_month, last_year)

        # Only alert if both months have meaningful spend (>= 100)
        if last_spend >= 100 and this_spend >= last_spend * 1.5:
            if not _alert_exists(session, "category_spike", cat.id, month, year):
                ratio = this_spend / last_spend
                msg = (
                    f"📈 {cat.name} spending spiked {ratio:.1f}× this month! "
                    f"₹{this_spend:,.0f} vs ₹{last_spend:,.0f} last month."
                )
                alert = SpendingAlert(
                    alert_type="category_spike",
                    message=msg,
                    severity="warning",
                    category_id=cat.id,
                )
                session.add(alert)
                new_alerts.append(alert)

    session.commit()
    for a in new_alerts:
        session.refresh(a)

    return [SpendingAlertRead.model_validate(a) for a in new_alerts]
