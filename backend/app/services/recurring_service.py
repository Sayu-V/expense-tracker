"""
recurring_service.py
--------------------
Business logic for recurring expense templates.

Key operations:
  - CRUD on RecurringExpense rows
  - generate_due(): for a single template, create Expense rows for every
    date between next_date and today, then advance next_date forward
  - generate_all_due(): batch version that checks every active template
"""

from datetime import date, timedelta
from dateutil.relativedelta import relativedelta
from sqlmodel import Session, select

from app.models import RecurringExpense, Expense, Category
from app.schemas import RecurringExpenseCreate, RecurringExpenseUpdate, GenerateResult


def _advance_date(current: date, frequency: str) -> date:
    """Return the next occurrence date after `current` for the given frequency."""
    if frequency == "daily":
        return current + timedelta(days=1)
    if frequency == "weekly":
        return current + timedelta(weeks=1)
    # monthly — use relativedelta to handle month-end correctly
    return current + relativedelta(months=1)


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_recurring(session: Session) -> list[RecurringExpense]:
    return list(session.exec(
        select(RecurringExpense).order_by(RecurringExpense.next_date)
    ).all())


def get_recurring(session: Session, recurring_id: int) -> RecurringExpense | None:
    return session.get(RecurringExpense, recurring_id)


def create_recurring(session: Session, data: RecurringExpenseCreate) -> RecurringExpense:
    # Validate category exists
    category = session.get(Category, data.category_id)
    if not category:
        raise ValueError(f"Category {data.category_id} not found")

    rec = RecurringExpense(
        amount=data.amount,
        description=data.description,
        notes=data.notes,
        category_id=data.category_id,
        frequency=data.frequency,
        next_date=data.next_date,
        is_active=True,
    )
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


def update_recurring(
    session: Session, recurring_id: int, data: RecurringExpenseUpdate
) -> RecurringExpense | None:
    rec = session.get(RecurringExpense, recurring_id)
    if not rec:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(rec, field, value)
    session.add(rec)
    session.commit()
    session.refresh(rec)
    return rec


def delete_recurring(session: Session, recurring_id: int) -> bool:
    rec = session.get(RecurringExpense, recurring_id)
    if not rec:
        return False
    session.delete(rec)
    session.commit()
    return True


# ---------------------------------------------------------------------------
# Generation logic
# ---------------------------------------------------------------------------

def generate_due(session: Session, recurring_id: int) -> GenerateResult:
    """
    For a single recurring template, generate all Expense rows from
    next_date up to and including today. Advance next_date past today.
    Returns a GenerateResult with the count and IDs of new expenses.
    """
    rec = session.get(RecurringExpense, recurring_id)
    if not rec or not rec.is_active:
        return GenerateResult(recurring_id=recurring_id, generated_count=0, expense_ids=[])

    today = date.today()
    generated_ids: list[int] = []
    current = rec.next_date

    while current <= today:
        expense = Expense(
            amount=rec.amount,
            description=rec.description,
            notes=rec.notes,
            category_id=rec.category_id,
            date=current,
            type="expense",
        )
        session.add(expense)
        session.flush()  # get the ID without committing
        generated_ids.append(expense.id)
        current = _advance_date(current, rec.frequency)

    # Advance next_date to the next future date
    rec.next_date = current
    session.add(rec)
    session.commit()

    return GenerateResult(
        recurring_id=recurring_id,
        generated_count=len(generated_ids),
        expense_ids=generated_ids,
    )


def generate_all_due(session: Session) -> list[GenerateResult]:
    """
    Process all active recurring expenses whose next_date <= today.
    Called on startup or via a scheduled endpoint.
    """
    today = date.today()
    due = session.exec(
        select(RecurringExpense).where(
            RecurringExpense.is_active == True,
            RecurringExpense.next_date <= today,
        )
    ).all()

    results = []
    for rec in due:
        result = generate_due(session, rec.id)
        results.append(result)
    return results
