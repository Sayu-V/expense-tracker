"""
models.py
---------
SQLModel table definitions. Each class with table=True maps directly
to a PostgreSQL table. SQLModel merges Pydantic validation with
SQLAlchemy ORM — one class does both jobs.

Tables:
  - Category          → categories
  - Expense           → expenses
  - Budget            → budgets
  - RecurringExpense  → recurring_expenses  (v1.7.0)
  - SpendingAlert     → spending_alerts     (v1.7.0)
  - Goal              → goals               (v1.7.0)
  - IncomeSource      → income_sources      (v2.0.0)

v1.1.0 additions:
  - Category.emoji  — display emoji for category badges (e.g. 🍔 for Food)
  - Expense.type    — 'expense' (default) or 'income' for income tracking
v1.7.0 additions:
  - RecurringExpense — recurring expense templates
  - SpendingAlert    — budget/spend alert notifications
  - Goal             — savings goal tracker
"""

from datetime import date as Date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship


class Category(SQLModel, table=True):
    """
    Represents a spending category (Food, Transport, Housing, etc.)
    Both default (seeded) and custom (user-created) categories live here.
    """
    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, index=True)
    color: str = Field(default="#6366f1", max_length=7)         # Hex color for UI charts
    emoji: str = Field(default="💰", max_length=10)              # v1.1.0: category emoji
    category_type: str = Field(default="expense", max_length=10) # v1.2.0: 'expense' | 'income'
    is_default: bool = Field(default=False)                     # True = seeded, cannot be deleted
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships (used for ORM queries, not serialized by default)
    expenses: list["Expense"] = Relationship(back_populates="category")
    budgets: list["Budget"] = Relationship(back_populates="category")


class Expense(SQLModel, table=True):
    """
    Core table. Each row is one expense record.
    category_id is a FK to categories.id — must be a valid category.

    v1.1.0: type field distinguishes expenses from income entries.
    """
    __tablename__ = "expenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float = Field(gt=0)                            # Must be positive
    description: str = Field(max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)
    date: Date = Field(index=True)                         # Indexed for fast date range queries
    type: str = Field(default="expense", max_length=10)    # v1.1.0: 'expense' | 'income'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Foreign key to Category
    category_id: int = Field(foreign_key="categories.id", index=True)
    category: Optional[Category] = Relationship(back_populates="expenses")


class Budget(SQLModel, table=True):
    """
    Monthly budget per category.
    One budget row = one category's limit for one month+year combination.
    """
    __tablename__ = "budgets"

    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float = Field(gt=0)                            # Budget ceiling (must be > 0)
    month: int = Field(ge=1, le=12)                        # 1–12
    year: int = Field(ge=2020)                             # Sanity lower bound
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Foreign key to Category
    category_id: int = Field(foreign_key="categories.id", index=True)
    category: Optional[Category] = Relationship(back_populates="budgets")


# ---------------------------------------------------------------------------
# v1.7.0 — Recurring Expenses
# ---------------------------------------------------------------------------

class RecurringExpense(SQLModel, table=True):
    """
    Template for recurring expenses. Each active row generates real Expense
    rows whenever its next_date <= today (handled by POST /recurring-expenses/{id}/generate
    or the batch endpoint POST /recurring-expenses/generate-all).

    frequency: 'daily' | 'weekly' | 'monthly'
    """
    __tablename__ = "recurring_expenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float = Field(gt=0)
    description: str = Field(max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)
    frequency: str = Field(default="monthly", max_length=10)  # daily | weekly | monthly
    next_date: Date = Field(index=True)                        # Next generation date
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    category_id: int = Field(foreign_key="categories.id", index=True)


# ---------------------------------------------------------------------------
# v1.7.0 — Spending Alerts
# ---------------------------------------------------------------------------

class SpendingAlert(SQLModel, table=True):
    """
    System-generated alert when a budget reaches ≥80% or a category spend
    spikes vs. the previous month. Alerts can be marked as read.

    alert_type: 'budget_80' | 'budget_over' | 'category_spike'
    severity:   'info' | 'warning' | 'alert'
    """
    __tablename__ = "spending_alerts"

    id: Optional[int] = Field(default=None, primary_key=True)
    alert_type: str = Field(max_length=20)   # budget_80 | budget_over | category_spike
    message: str = Field(max_length=500)
    severity: str = Field(default="warning", max_length=10)  # info | warning | alert
    category_id: Optional[int] = Field(default=None, foreign_key="categories.id", index=True)
    is_read: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# v1.7.0 — Goal Tracker
# ---------------------------------------------------------------------------

class Goal(SQLModel, table=True):
    """
    Savings or spending goal. Progress is tracked by summing income entries
    minus expense entries since the goal's start date, compared to target_amount.

    goal_type: 'savings' | 'spending_limit'
    """
    __tablename__ = "goals"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    description: Optional[str] = Field(default=None, max_length=500)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0.0)  # Manually tracked or auto-computed
    deadline: Optional[Date] = Field(default=None)
    is_completed: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# v2.0.0 — Income Sources (user-defined recurring income patterns)
# ---------------------------------------------------------------------------

class IncomeSource(SQLModel, table=True):
    """
    User-defined mapping of a recurring income sender to a category and type.
    During bank statement import, each deposit description is matched against
    sender_keyword (case-insensitive substring) to auto-classify the income.

    source_type: 'salary' | 'rent' | 'business' | 'interest' | 'other'
    """
    __tablename__ = "income_sources"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)                              # Display label
    source_type: str = Field(default="other", max_length=20)      # salary | rent | business | interest | other
    sender_keyword: str = Field(max_length=200, index=True)        # Matched against description (UPPER)
    expected_amount: Optional[float] = Field(default=None)         # Optional amount for confidence boost
    expected_day: Optional[int] = Field(default=None, ge=1, le=31) # Expected day of month
    category_id: Optional[int] = Field(default=None, foreign_key="categories.id")
    created_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# v2.1.0 — Import Rules (user-defined classification rules)
# ---------------------------------------------------------------------------

class ImportRule(SQLModel, table=True):
    """
    User-defined IF/THEN rule applied to bank statement rows during import.

    Conditions and actions are stored as JSON strings so the schema stays
    flexible without requiring a separate junction table.

    condition_logic: 'OR'  → row matches if ANY condition is true
                    'AND' → row matches if ALL conditions are true

    priority: lower number = checked first (1 = highest, 100 = lowest)
    """
    __tablename__ = "import_rules"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=200)
    priority: int = Field(default=5, ge=1, le=100)
    is_active: bool = Field(default=True)
    condition_logic: str = Field(default="OR", max_length=3)   # 'OR' | 'AND'
    conditions: str = Field(default="[]")                       # JSON list of condition objects
    actions: str = Field(default="[]")                          # JSON list of action objects
    match_count: int = Field(default=0)
    last_matched_at: Optional[datetime] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
