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
    date: Optional[date] = None
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


class BudgetStatus(BaseModel):
    """Response model for GET /budgets/status — actual vs budgeted spend."""
    category_id: int
    category_name: str
    category_color: str
    budgeted: float
    actual: float
    remaining: float
    percent_used: float
    is_over_budget: bool


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
