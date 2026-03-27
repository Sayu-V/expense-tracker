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

    @field_validator("color")
    @classmethod
    def validate_hex_color(cls, v: str) -> str:
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("color must be a 7-character hex string like #6366f1")
        return v


class CategoryRead(BaseModel):
    id: int
    name: str
    color: str
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


class ExpenseUpdate(BaseModel):
    amount: Optional[float] = None
    category_id: Optional[int] = None
    description: Optional[str] = None
    notes: Optional[str] = None
    date: Optional[date] = None

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: Optional[float]) -> Optional[float]:
        if v is not None and v <= 0:
            raise ValueError("amount must be greater than 0")
        return round(v, 2) if v is not None else None


class ExpenseRead(BaseModel):
    id: int
    amount: float
    category_id: int
    category: Optional[CategoryRead] = None
    description: str
    notes: Optional[str] = None
    date: date
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


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
    expense_count: int
    avg_expense: float


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
    label: str   # e.g. "Mar 2026"


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
