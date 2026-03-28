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
# v1.8.0 — Year-over-Year and Spend Prediction schemas
# ---------------------------------------------------------------------------

class YoYPoint(BaseModel):
    """One month's data point for the year-over-year comparison chart."""
    month: int                       # 1–12
    label: str                       # "Jan", "Feb", …
    this_year: float                 # expense total for this_year/month
    last_year: float                 # expense total for last_year/month
    income_this_year: float = 0.0
    income_last_year: float = 0.0


class SpendPrediction(BaseModel):
    """Linear extrapolation of current month's spend to end-of-month total."""
    month: int
    year: int
    days_elapsed: int
    days_in_month: int
    spent_so_far: float
    daily_rate: float                # avg spend per elapsed day
    predicted_total: float           # daily_rate × days_in_month
    income_so_far: float
    predicted_net: float             # income_so_far − predicted_total (positive = surplus)


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
# v2.1.0 — Import Rules schemas
# ---------------------------------------------------------------------------

class RuleCondition(BaseModel):
    """
    One condition inside an ImportRule.
    field    : 'description' | 'amount' | 'direction'
    operator : 'contains' | 'not_contains' | 'starts_with' | 'gt' | 'lt' | 'gte' | 'lte' | 'eq'
    value    : string (amounts as string, direction as 'credit' | 'debit')
    """
    field: str
    operator: str
    value: str


class RuleAction(BaseModel):
    """
    One action inside an ImportRule.
    action : 'set_type' | 'set_category' | 'rename' | 'skip'
    value  : type string, category_id as string, new description, or None for skip
    """
    action: str
    value: Optional[str] = None


class ImportRuleCreate(BaseModel):
    name: str
    priority: int = 5
    condition_logic: str = "OR"          # 'OR' | 'AND'
    conditions: list[RuleCondition]
    actions: list[RuleAction]
    apply_retroactive: bool = False      # Re-classify matching existing transactions

    @field_validator("condition_logic")
    @classmethod
    def valid_logic(cls, v: str) -> str:
        if v not in ("OR", "AND"):
            raise ValueError("condition_logic must be 'OR' or 'AND'")
        return v

    @field_validator("priority")
    @classmethod
    def valid_priority(cls, v: int) -> int:
        if not 1 <= v <= 100:
            raise ValueError("priority must be 1–100")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("name cannot be blank")
        return v.strip()


class ImportRuleUpdate(BaseModel):
    name: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    condition_logic: Optional[str] = None
    conditions: Optional[list[RuleCondition]] = None
    actions: Optional[list[RuleAction]] = None


class ImportRuleRead(BaseModel):
    id: int
    name: str
    priority: int
    is_active: bool
    condition_logic: str
    conditions: list[RuleCondition]
    actions: list[RuleAction]
    match_count: int
    last_matched_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class RetroactiveResult(BaseModel):
    """Returned after applying a rule retroactively to existing transactions."""
    updated_count: int
    rule_id: int
    rule_name: str


class QuickRuleCreate(BaseModel):
    """
    Payload for the 'Save as rule' shortcut in the import preview table.
    Creates a single-condition 'description contains keyword' rule instantly.
    """
    rule_name: str
    description_keyword: str     # The keyword to match (extracted from transaction)
    set_type: str                # Final type the user selected
    category_id: Optional[int] = None
    rename_to: Optional[str] = None   # Optional: rename matching descriptions
    apply_retroactive: bool = False


# ---------------------------------------------------------------------------
# v2.0.0 — Bank Statement Import schemas
# ---------------------------------------------------------------------------

class ImportTransaction(BaseModel):
    """
    One parsed row from a CSV/PDF bank statement — shown in the preview table
    before the user confirms. row_id is a client-side UUID for diff tracking.
    """
    row_id: str                               # UUID string, assigned by parser
    date: date
    description: str                          # Cleaned description shown to user
    raw_description: str = ""                 # Original bank text (for debugging)
    merchant: str = ""                        # Extracted merchant/sender name
    amount: float
    type: str = "expense"                     # 'expense' | 'income' | 'investment' | 'transfer'
    income_subtype: Optional[str] = None      # 'salary' | 'rent' | 'business' | 'interest' | 'refund' | 'fd_maturity'
    suggested_category_id: Optional[int] = None
    suggested_category_name: Optional[str] = None
    suggested_category_emoji: Optional[str] = None
    confidence: str = "low"                   # 'high' | 'medium' | 'low'
    is_duplicate: bool = False                # Already exists in DB
    is_flagged: bool = False                  # ⚠️ Needs user review
    flag_reason: Optional[str] = None        # Why it was flagged
    ref_no: Optional[str] = None             # Bank reference/cheque number
    skip: bool = False                        # User chose to skip this row
    # v2.1.0 — rule engine tracing
    match_source: str = "unknown"             # 'rule' | 'income_source' | 'builtin' | 'heuristic' | 'flagged'
    matched_rule_id: Optional[int] = None    # Which ImportRule matched (if any)
    matched_rule_name: Optional[str] = None  # Rule display name


class ImportPreviewResponse(BaseModel):
    """Returned after file upload — full parsed transaction list for preview."""
    session_id: str                           # In-memory key for confirm step
    filename: str
    bank_format: str                          # 'canara_bank' | 'generic_csv'
    total_rows: int
    duplicate_count: int
    flagged_count: int
    transactions: list[ImportTransaction]


class ImportRowUpdate(BaseModel):
    """User's edits to one row in the preview table."""
    row_id: str
    type: str                                 # Final type after user review
    category_id: Optional[int] = None        # Final category after user selection
    description: Optional[str] = None        # User-edited description
    skip: bool = False                        # True = exclude from import


class ImportConfirmRequest(BaseModel):
    """Sent when user clicks Confirm Import."""
    session_id: str
    rows: list[ImportRowUpdate]


class ImportConfirmResponse(BaseModel):
    """Returned after successful bulk import."""
    imported_count: int
    skipped_count: int
    duplicate_skipped: int
    expense_ids: list[int]


# ---------------------------------------------------------------------------
# v2.0.0 — Income Source schemas (user-defined recurring income patterns)
# ---------------------------------------------------------------------------

class IncomeSourceCreate(BaseModel):
    """
    Defines a recurring income source so the import can auto-classify deposits.
    sender_keyword is matched case-insensitively against the bank description.
    """
    name: str                                 # Display name, e.g. "Rahul Sharma (Rent)"
    source_type: str = "rent"                 # 'salary' | 'rent' | 'business' | 'interest' | 'other'
    sender_keyword: str                       # Matched against description
    expected_amount: Optional[float] = None  # Optional — used for confidence scoring
    expected_day: Optional[int] = None        # Day of month (1–31), optional
    category_id: Optional[int] = None        # Which income category to assign

    @field_validator("source_type")
    @classmethod
    def valid_source_type(cls, v: str) -> str:
        if v not in ("salary", "rent", "business", "interest", "other"):
            raise ValueError("source_type must be salary | rent | business | interest | other")
        return v

    @field_validator("sender_keyword")
    @classmethod
    def keyword_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("sender_keyword cannot be blank")
        return v.strip().upper()

    @field_validator("expected_day")
    @classmethod
    def valid_day(cls, v: Optional[int]) -> Optional[int]:
        if v is not None and not 1 <= v <= 31:
            raise ValueError("expected_day must be 1–31")
        return v


class IncomeSourceUpdate(BaseModel):
    name: Optional[str] = None
    source_type: Optional[str] = None
    sender_keyword: Optional[str] = None
    expected_amount: Optional[float] = None
    expected_day: Optional[int] = None
    category_id: Optional[int] = None


class IncomeSourceRead(BaseModel):
    id: int
    name: str
    source_type: str
    sender_keyword: str
    expected_amount: Optional[float] = None
    expected_day: Optional[int] = None
    category_id: Optional[int] = None
    created_at: datetime

    model_config = {"from_attributes": True}


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
