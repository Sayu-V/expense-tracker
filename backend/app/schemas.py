"""
schemas.py
----------
Pydantic models for API request bodies and response shapes.
Kept separate from SQLModel table definitions so the API contract
is independent of the database schema — a best practice for maintainability.

Naming convention:
  - <Model>Create  → request body for POST
  - <Model>Update  → request body for PUT (all fields optional)
  - <Model>Read    → response body (includes id, timestamps)
"""

from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, field_validator

# Python 3.10+ evaluates annotated defaults (x: T = v) by doing the assignment
# *before* evaluating the annotation.  When a field is named the same as its
# type (e.g.  date: Optional[date] = None), the class-namespace binding
# 'date = None' shadows the imported 'datetime.date', so Optional[date]
# resolves to NoneType — causing a "Input should be None" 422 on every PUT.
# Using a private alias breaks the shadowing.
_Date = date


# ---------------------------------------------------------------------------
# Category schemas
# ---------------------------------------------------------------------------

class CategoryCreate(BaseModel):
    name: str
    color: str = "#6366f1"
    emoji: str = "💰"              # v1.1.0
    category_type: str = "expense"  # v1.2.0: 'expense' | 'income'

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("color must be a 7-character hex string like #6366f1")
        return v

    @field_validator("category_type")
    @classmethod
    def validate_category_type(cls, v: str) -> str:
        if v not in ("expense", "income"):
            raise ValueError("category_type must be 'expense' or 'income'")
        return v


class CategoryUpdate(BaseModel):
    """v1.2.0 — partial update for categories."""
    name: Optional[str] = None
    color: Optional[str] = None
    emoji: Optional[str] = None

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and (not v.startswith("#") or len(v) != 7):
            raise ValueError("color must be a 7-character hex string like #6366f1")
        return v


class CategoryRead(BaseModel):
    id: int
    name: str
    color: str
    emoji: str = "💰"              # v1.1.0
    category_type: str = "expense"  # v1.2.0
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Expense schemas
# ---------------------------------------------------------------------------

class ExpenseCreate(BaseModel):
    amount: float
    category_id: int
    description: str
    notes: Optional[str] = None
    date: date
    type: str = "expense"   # v1.1.0: 'expense' | 'income'

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2)

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description cannot be blank")
        return v.strip()

    @field_validator("type")
    @classmethod
    def type_must_be_valid(cls, v: str) -> str:
        if v not in ("expense", "income"):
            raise ValueError("type must be 'expense' or 'income'")
        return v


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[_Date] = None   # _Date alias avoids field-name shadowing datetime.date
    type: Optional[str] = None   # v1.1.0

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2) if v is not None else None

    @field_validator("type")
    @classmethod
    def type_must_be_valid(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and v not in ("expense", "income"):
            raise ValueError("type must be 'expense' or 'income'")
        return v


class ExpenseRead(BaseModel):
    id: int
    amount: float
    category_id: int
    category: Optional[CategoryRead] = None
    description: str
    notes: Optional[str] = None
    date: date
    type: str = "expense"   # v1.1.0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# v1.1.0 — AI Suggest Category schema
# ---------------------------------------------------------------------------

class SuggestCategoryResponse(BaseModel):
    """Response for GET /expenses/suggest-category?description=..."""
    description: str
    suggested_category_id: Optional[int] = None
    suggested_category_name: Optional[str] = None
    suggested_category_emoji: Optional[str] = None
    confidence: str  # 'high' | 'low'


# ---------------------------------------------------------------------------
# Budget schemas
# ---------------------------------------------------------------------------

class BudgetCreate(BaseModel):
    category_id: int
    amount: float
    month: int
    year: int

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("budget amount must be greater than 0")
        return round(v, 2)

    @field_validator("month")
    @classmethod
    def month_range(cls, v: int) -> int:
        if not 1 <= v <= 12:
            raise ValueError("month must be between 1 and 12")
        return v


class BudgetRead(BaseModel):
    id: int
    category_id: int
    category: Optional[CategoryRead] = None
    amount: float
    month: int
    year: int
    created_at: datetime

    model_config = {"from_attributes": True}


class BudgetUpdate(BaseModel):
    """v1.5.0 — update a budget's amount."""
    amount: float

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("budget amount must be greater than 0")
        return round(v, 2)


class BudgetStatus(BaseModel):
    """Response model for GET /budgets/status — actual vs budgeted spend."""
    budget_id: int = 0         # v1.5.0: added so frontend can PATCH/DELETE by ID
    category_id: int
    category_name: str
    category_color: str
    budgeted: float
    actual: float
    remaining: float
    percent_used: float
    is_over_budget: bool


# ---------------------------------------------------------------------------
# v1.5.0 — Bulk delete schema (shared by expenses and budgets)
# ---------------------------------------------------------------------------

class BulkDeleteRequest(BaseModel):
    """Request body for bulk delete endpoints."""
    ids: list[int]


# ---------------------------------------------------------------------------
# v1.5.0 — Chat schemas
# ---------------------------------------------------------------------------

class ChatMessage(BaseModel):
    """Request body for POST /chat."""
    message: str


class ChatDataPoint(BaseModel):
    """A single point in the chart_data array returned by the chat service."""
    label: str
    value: float
    color: Optional[str] = "#5E5CE6"


class ChatResponse(BaseModel):
    """Structured response from the chat service."""
    answer: str                       # Markdown-flavoured text answer
    chart_type: str = "none"          # 'pie' | 'bar' | 'line' | 'none'
    chart_data: list[ChatDataPoint] = []
    chart_title: str = ""
    quick_replies: list[str] = []     # Suggested follow-up chips


# ---------------------------------------------------------------------------
# v1.7.0 — Recurring Expense schemas
# ---------------------------------------------------------------------------

class RecurringExpenseCreate(BaseModel):
    amount: float
    category_id: int
    description: str
    notes: Optional[str] = None
    frequency: str = "monthly"   # daily | weekly | monthly
    next_date: date

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2)

    @field_validator("frequency")
    @classmethod
    def frequency_must_be_valid(cls, v: str) -> str:
        if v not in ("daily", "weekly", "monthly"):
            raise ValueError("frequency must be 'daily', 'weekly', or 'monthly'")
        return v

    @field_validator("description")
    @classmethod
    def description_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("description cannot be blank")
        return v.strip()


class RecurringExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    frequency: Optional[str] = None
    next_date: Optional[date] = None
    is_active: Optional[bool] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2) if v is not None else None


class RecurringExpenseRead(BaseModel):
    id: int
    amount: float
    category_id: int
    category: Optional[CategoryRead] = None
    description: str
    notes: Optional[str] = None
    frequency: str
    next_date: date
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class GenerateResult(BaseModel):
    """Result of generating expenses from a recurring template."""
    recurring_id: int
    generated_count: int
    expense_ids: list[int]


# ---------------------------------------------------------------------------
# v1.7.0 — Spending Alert schemas
# ---------------------------------------------------------------------------

class SpendingAlertRead(BaseModel):
    id: int
    alert_type: str
    message: str
    severity: str
    category_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertsResponse(BaseModel):
    alerts: list[SpendingAlertRead]
    unread_count: int


# ---------------------------------------------------------------------------
# v1.7.0 — Goal schemas
# ---------------------------------------------------------------------------

class GoalCreate(BaseModel):
    name: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float = 0.0
    deadline: Optional[date] = None

    @field_validator("target_amount")
    @classmethod
    def target_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("target_amount must be greater than 0")
        return round(v, 2)

    @field_validator("current_amount")
    @classmethod
    def current_non_negative(cls, v: float) -> float:
        if v < 0:
            raise ValueError("current_amount cannot be negative")
        return round(v, 2)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v.strip()


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[date] = None
    is_completed: Optional[bool] = None

    @field_validator("target_amount")
    @classmethod
    def target_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("target_amount must be greater than 0")
        return round(v, 2) if v is not None else None

    @field_validator("current_amount")
    @classmethod
    def current_non_negative(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v < 0:
            raise ValueError("current_amount cannot be negative")
        return round(v, 2) if v is not None else None


class GoalRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float
    deadline: Optional[date] = None
    is_completed: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalProgress(BaseModel):
    """Extended goal read with computed progress fields."""
    id: int
    name: str
    description: Optional[str] = None
    target_amount: float
    current_amount: float
    deadline: Optional[date] = None
    is_completed: bool
    created_at: datetime
    updated_at: datetime
    percent_complete: float           # 0–100
    remaining_amount: float           # target - current (0 if over)
    projected_completion_date: Optional[date] = None   # None if no deadline or no progress
    days_remaining: Optional[int] = None               # None if no deadline

    model_config = {"from_attributes": True}


# ---------------------------------------------------------------------------
# Reports schemas
# ---------------------------------------------------------------------------

class MonthlySummary(BaseModel):
    month: int
    year: int
    total_spend: float
    total_income: float = 0.0   # v1.1.0: sum of income-type entries
    net_balance: float = 0.0    # v1.1.0: income - expenses
    expense_count: int
    avg_expense: float
    # v1.2.0: period info for display
    period_label: str = ""       # e.g. "Mar 2026", "Q1 2026", "Week 13"


class CategoryBreakdown(BaseModel):
    category_id: int
    category_name: str
    category_color: str
    total: float
    count: int
    percentage: float


class TrendPoint(BaseModel):
    month: int
    year: int
    total: float
    income: float = 0.0   # v1.2.0: income for the same period
    label: str            # e.g. "Mar 2026"


# ---------------------------------------------------------------------------
# Insights schema
# ---------------------------------------------------------------------------

class Insight(BaseModel):
    type: str         # budget_overspend | burn_rate | mom_spike | top_category | unusual_expense | savings | streak
    message: str
    severity: str     # info | warning | alert
    category_id: Optional[int] = None
    category_name: Optional[str] = None
    value: Optional[float] = None   # The numeric value driving the insight
