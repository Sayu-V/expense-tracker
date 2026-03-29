---
title: Low-Level Design
date: 2026-03-29
tags:
  - expense-tracker
  - LLD
  - system-design
  - documentation
aliases:
  - LLD
  - Low Level Design
version: 2.3.0
status: active
related:
  - "[[Architecture]]"
  - "[[HLD]]"
  - "[[Tech_Stack]]"
  - "[[README]]"
---

# Low-Level Design (LLD) — Expense Tracker v2.3.0

> **Author:** Sayu-V | Yenepoya University
> **Updated:** 2026-03-29

See also: [[Architecture]] · [[HLD]] · [[Tech_Stack]] · [[README]]

---

## 1. Database Schema (Detailed)

Eight fully normalised tables. All foreign keys carry an index. Timestamps are auto-generated server-side using SQLModel's `Field(default_factory=datetime.utcnow)`.

### 1.1 Table: `categories`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | Case-sensitive |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT `#6366f1` | Hex format `#RRGGBB` |
| `emoji` | VARCHAR(10) | NULLABLE | Unicode emoji character |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | `true` = seeded, cannot delete |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Server-side UTC |

**Indexes:** `name` (unique)
**Relationships:** `Category` → (1:N) `Expense`, `Budget`, `RecurringExpense`, `SpendingAlert`

### 1.2 Table: `expenses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `amount` | FLOAT | NOT NULL, CHECK > 0 | Max 2 decimal places (Pydantic) |
| `description` | VARCHAR(200) | NOT NULL | Stripped of whitespace |
| `notes` | VARCHAR(500) | NULLABLE | Optional free text |
| `date` | DATE | NOT NULL, INDEX | Format: YYYY-MM-DD |
| `type` | VARCHAR(20) | NOT NULL, DEFAULT `expense` | `expense` or `income` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Immutable after insert |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Updated on every PUT |
| `category_id` | INTEGER | FK → `categories.id`, INDEX | Required, must be valid |

**Indexes:** `date`, `category_id`
**Cursor index:** `(date DESC, id DESC)` — composite index for keyset pagination

### 1.3 Table: `budgets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `amount` | FLOAT | NOT NULL, CHECK > 0 | Budget ceiling |
| `month` | INTEGER | NOT NULL, CHECK 1–12 | Calendar month |
| `year` | INTEGER | NOT NULL, CHECK >= 2020 | Calendar year |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | |
| `category_id` | INTEGER | FK → `categories.id`, INDEX | Required |

**Logical unique constraint:** `(category_id, month, year)` — enforced at service layer via upsert

### 1.4 Table: `recurring_expenses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `description` | VARCHAR(200) | NOT NULL | |
| `amount` | FLOAT | NOT NULL, CHECK > 0 | |
| `category_id` | INTEGER | FK → `categories.id`, INDEX | |
| `frequency` | VARCHAR(20) | NOT NULL | `daily`, `weekly`, `monthly` |
| `next_date` | DATE | NOT NULL | Next scheduled generation date |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `notes` | VARCHAR(500) | NULLABLE | |

**Generation logic:** When `next_date <= today` the record is overdue; `generate` creates an `Expense` row and advances `next_date` using `python-dateutil.relativedelta`.

### 1.5 Table: `spending_alerts`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `type` | VARCHAR(50) | NOT NULL | `budget_exceeded`, `category_spike`, etc. |
| `severity` | VARCHAR(20) | NOT NULL | `info`, `warning`, `critical` |
| `message` | VARCHAR(500) | NOT NULL | Human-readable alert text |
| `is_read` | BOOLEAN | NOT NULL, DEFAULT false | |
| `category_id` | INTEGER | FK → `categories.id`, NULLABLE | |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | |

### 1.6 Table: `goals`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `name` | VARCHAR(200) | NOT NULL | |
| `target_amount` | FLOAT | NOT NULL, CHECK > 0 | |
| `current_amount` | FLOAT | NOT NULL, DEFAULT 0 | Incremented by Add Savings |
| `deadline` | DATE | NULLABLE | Optional target date |
| `is_completed` | BOOLEAN | NOT NULL, DEFAULT false | Auto-set when `current >= target` |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | |

**Projected completion:** `report_service` computes `days_remaining = (target - current) / daily_savings_rate`.

### 1.7 Table: `income_sources`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `name` | VARCHAR(200) | NOT NULL | Display name |
| `type` | VARCHAR(50) | NOT NULL | e.g., `salary`, `freelance` |
| `sender_keyword` | VARCHAR(200) | NOT NULL | Matched against import description |
| `expected_amount` | FLOAT | NULLABLE | For confidence scoring |
| `expected_day` | INTEGER | NULLABLE, CHECK 1–31 | Expected day of month |

**Import usage:** During Pass 2 of the classification waterfall, `import_service` scans `income_sources` and matches `sender_keyword` (case-insensitive substring) against each transaction description.

### 1.8 Table: `import_rules`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `name` | VARCHAR(200) | NOT NULL | Rule display name |
| `priority` | INTEGER | NOT NULL, DEFAULT 0 | Higher = evaluated first |
| `condition_logic` | VARCHAR(10) | NOT NULL | `AND` or `OR` |
| `conditions` | JSON | NOT NULL | `[{field, operator, value}]` |
| `actions` | JSON | NOT NULL | `{set_type, set_category_id, rename_to, skip}` |
| `is_active` | BOOLEAN | NOT NULL, DEFAULT true | |
| `match_count` | INTEGER | NOT NULL, DEFAULT 0 | Incremented on each match |
| `last_matched_at` | TIMESTAMP | NULLABLE | |

**Condition schema:**
```json
{ "field": "description", "operator": "contains", "value": "ZOMATO" }
```
**Supported operators:** `contains`, `not_contains`, `equals`, `starts_with`, `ends_with`, `regex`
**Actions schema:**
```json
{ "set_type": "expense", "set_category_id": 3, "rename_to": "Food Delivery", "skip": false }
```

---

## 2. API Contract (Detailed)

### 2.1 Expenses

#### `POST /api/v1/expenses`

**Request body (`ExpenseCreate`):**
```json
{
  "amount": 150.50,
  "category_id": 1,
  "description": "Grocery run",
  "date": "2026-03-29",
  "notes": "Weekly shopping",
  "type": "expense"
}
```
**Validation:** `amount > 0`, `description` non-blank ≤ 200 chars, `date` valid ISO, `type` in `["expense","income"]`
**Response:** `201 Created` → `ExpenseRead`
**Errors:** `422` validation, `404` category not found

#### `GET /api/v1/expenses`

**Query params:** `category_id`, `date_from`, `date_to`, `min_amount`, `max_amount`, `type`, `limit` (default 20), `cursor` (base64 keyset)
**Response:** `200 OK` → `ExpensePage`
```json
{
  "items": [{ "id": 1, "amount": 150.50, "description": "...", "date": "...", ... }],
  "next_cursor": "eyJkYXRlIjoiMjAyNi0wMy0yOSIsImlkIjoxfQ==",
  "total": 142,
  "has_more": true
}
```

#### `POST /api/v1/expenses/bulk-delete`

**Request body:** `{ "ids": [1, 2, 3] }`
**Response:** `200 OK` → `{ "deleted": 3 }`

### 2.2 Categories

#### `GET /api/v1/categories`
**Response:** `200 OK` → `List[CategoryRead]` (sorted: defaults first, then user-created)

#### `POST /api/v1/categories`
```json
{ "name": "Gaming", "color": "#a855f7", "emoji": "🎮" }
```
**Validation:** `color` must match `#RRGGBB`
**Response:** `201 Created` → `CategoryRead`
**Errors:** `409 Conflict` if name already exists

#### `PUT /api/v1/categories/{id}`
**Request:** All fields optional
**Response:** `200 OK` → updated `CategoryRead`

#### `DELETE /api/v1/categories/{id}`
**Response:** `204 No Content` | `404` | `400` if `is_default=true`

### 2.3 Budgets

#### `POST /api/v1/budgets`
```json
{ "category_id": 1, "amount": 5000.00, "month": 3, "year": 2026 }
```
**Behaviour:** Upsert — creates or updates for that `(category_id, month, year)` triple
**Response:** `201 Created` → `BudgetRead`

#### `GET /api/v1/budgets/status?month=3&year=2026`
**Response:** `List[BudgetStatus]`
```json
[{
  "category_id": 1, "category_name": "Food", "category_color": "#f97316",
  "budgeted": 5000.00, "actual": 3200.00, "remaining": 1800.00,
  "percent_used": 64.0, "is_over_budget": false
}]
```

### 2.4 Reports

#### `GET /api/v1/reports/monthly-summary?month=3&year=2026`
**Response:**
```json
{
  "month": 3, "year": 2026,
  "total_expense": 12500.00, "total_income": 45000.00,
  "net_balance": 32500.00, "expense_count": 24, "avg_expense": 520.83
}
```

#### `GET /api/v1/reports/by-category?month=3&year=2026`
**Response:** `List[CategoryBreakdown]` — each includes `total`, `count`, `percentage`

#### `GET /api/v1/reports/trend?months=6`
**Response:** `List[TrendPoint]` — `{ month, year, total, label }`

#### `GET /api/v1/reports/year-over-year`
**Response:** `List[YoYPoint]`
```json
[{ "month": 1, "label": "Jan", "this_year": 12000.00, "last_year": 9800.00 }]
```
Returns 12 points (Jan–Dec) for current year vs prior year.

#### `GET /api/v1/reports/prediction`
**Response:** `SpendPrediction`
```json
{
  "current_total": 8400.00, "daily_rate": 280.00,
  "predicted_total": 8680.00, "days_remaining": 1,
  "days_elapsed": 29
}
```

### 2.5 Insights

#### `GET /api/v1/insights`
**Response:** `List[Insight]`
```json
[{
  "type": "budget_overspend",
  "message": "You've overspent on Food by ₹500 (110% of budget)",
  "severity": "alert",
  "category_id": 1
}]
```
**Severity values:** `"info"` | `"warning"` | `"alert"`
**All 10 rule types:** `budget_overspend`, `burn_rate`, `mom_spike`, `top_category`, `unusual_expense`, `savings_opportunity`, `streak`, `daily_rate`, `savings_rate`, `yoy_comparison`

### 2.6 Chat

#### `POST /api/v1/chat`
**Request:** `{ "message": "How much did I spend on food this month?" }`
**Response:**
```json
{
  "reply": "You spent ₹3,200 on Food in March 2026.",
  "chart": { "type": "pie", "data": [...] },
  "quick_replies": ["Show me trend", "Compare with last month"]
}
```
**Supported intents:** `total_spend`, `category_breakdown`, `income_vs_expense`, `savings_rate`, `trend`, `budget_status`, `top_expenses`

### 2.7 Recurring Expenses

#### `GET /api/v1/recurring-expenses`
**Response:** `List[RecurringExpenseRead]` — includes computed `is_overdue` field

#### `POST /api/v1/recurring-expenses/{id}/generate`
**Behaviour:** Creates one `Expense` row and advances `next_date`
**Response:** `201 Created` → `ExpenseRead`

#### `POST /api/v1/recurring-expenses/generate-all`
**Behaviour:** Generates all overdue templates in a single call
**Response:** `{ "generated": 3, "expenses": [...] }`

### 2.8 Alerts

#### `GET /api/v1/alerts`
**Response:** `List[SpendingAlertRead]` — sorted by `created_at DESC`

#### `POST /api/v1/alerts/generate`
**Behaviour:** Runs all alert rules, creates new `SpendingAlert` rows
**Response:** `{ "created": 2 }`

#### `POST /api/v1/alerts/{id}/read`
**Response:** `200 OK` → updated alert

#### `POST /api/v1/alerts/read-all`
**Response:** `{ "updated": 5 }`

### 2.9 Goals

#### `GET /api/v1/goals`
**Response:** `List[GoalRead]` — includes `progress_percent`, `projected_completion_date`

#### `PUT /api/v1/goals/{id}`
**Request:** `{ "current_amount": 15000.00 }` (Add Savings increments this)
**Response:** `200 OK` → `GoalRead` — `is_completed` auto-set if `current_amount >= target_amount`

### 2.10 Import

#### `POST /api/v1/import/upload`
**Content-Type:** `multipart/form-data`
**Fields:** `file` (PDF or CSV, max 20 MB)
**Response:** `ImportPreview`
```json
{
  "session_id": "abc123",
  "transactions": [{
    "row": 1, "date": "2026-03-01", "description": "ZOMATO",
    "amount": 450.00, "type": "expense", "category_id": 3,
    "confidence": "high", "skip": false
  }],
  "total": 45, "income_count": 3, "expense_count": 42
}
```
**Session TTL:** 30 minutes

#### `POST /api/v1/import/confirm`
**Request:** `{ "session_id": "abc123", "transactions": [...edited rows...] }`
**Response:** `{ "imported": 43, "skipped": 2 }`
**Errors:** `404` if session expired

### 2.11 Income Sources

Standard CRUD at `/api/v1/income-sources`. Fields: `name`, `type`, `sender_keyword`, `expected_amount`, `expected_day`.

### 2.12 Import Rules

#### `GET/POST/PUT/DELETE /api/v1/import-rules`
Standard CRUD. `POST` and `PUT` validate `conditions` and `actions` JSON shape.

#### `POST /api/v1/import-rules/{id}/retroactive`
**Behaviour:** Re-runs this rule against all existing expenses, updates matching rows
**Response:** `{ "matched": 12, "updated": 12 }`

#### `POST /api/v1/import-rules/quick`
**Request:** `{ "description": "ZOMATO", "type": "expense", "category_id": 3 }`
**Behaviour:** Creates a minimal `contains` rule from an import preview row
**Response:** `201 Created` → `ImportRuleRead`

---

## 3. Service Layer — Method Signatures

### 3.1 `expense_service.py`

```python
def create_expense(session: Session, data: ExpenseCreate) -> Expense
def get_expense(session: Session, expense_id: int) -> Expense          # raises 404
def list_expenses(session, category_id, date_from, date_to,
                  min_amount, max_amount, expense_type,
                  limit, cursor) -> ExpensePage
def update_expense(session, expense_id: int, data: ExpenseUpdate) -> Expense
def delete_expense(session, expense_id: int) -> None
def bulk_delete_expenses(session, ids: list[int]) -> int
```

**Cursor encoding:**
```python
# Encode: base64(json({"date": str(expense.date), "id": expense.id}))
# Decode: extract date + id, use as WHERE (date, id) < (cursor_date, cursor_id)
```

### 3.2 `budget_service.py`

```python
def upsert_budget(session, data: BudgetCreate) -> Budget
def list_budgets(session, month: int, year: int) -> list[Budget]
def get_budget_status(session, month: int, year: int) -> list[BudgetStatus]
def update_budget(session, budget_id: int, data: BudgetUpdate) -> Budget
def delete_budget(session, budget_id: int) -> None
```

### 3.3 `report_service.py`

```python
def get_monthly_summary(session, month: int, year: int) -> MonthlySummary
def get_category_breakdown(session, month: int, year: int) -> list[CategoryBreakdown]
def get_trend(session, months: int) -> list[TrendPoint]
def get_top_expenses(session, limit: int, month: int, year: int) -> list[Expense]
def get_year_over_year(session) -> list[YoYPoint]       # 12 data points Jan–Dec
def get_prediction(session) -> SpendPrediction          # linear extrapolation
```

**Prediction algorithm:**
```python
daily_rate = total_spend_so_far / days_elapsed
predicted_total = total_spend_so_far + (daily_rate * days_remaining)
```

### 3.4 `insights_service.py`

```python
def generate_insights(session: Session) -> list[Insight]

# 10 rule functions (private):
def _check_budget_overspend(session) -> list[Insight]    # Rule 1
def _check_burn_rate(session) -> list[Insight]           # Rule 2
def _check_mom_spike(session) -> list[Insight]           # Rule 3: >30% MoM increase
def _check_top_category(session) -> list[Insight]        # Rule 4
def _check_unusual_expense(session) -> list[Insight]     # Rule 5: >2× category avg
def _check_savings_opportunity(session) -> list[Insight] # Rule 6: under budget 2 months
def _check_streak(session) -> list[Insight]              # Rule 7: 3+ no-spend days
def _check_daily_rate(session) -> list[Insight]          # Rule 8
def _check_savings_rate(session) -> list[Insight]        # Rule 9: % income saved
def _check_yoy_comparison(session) -> list[Insight]      # Rule 10: ≥15% YoY change
```

### 3.5 `chat_service.py`

```python
def handle_message(session, message: str) -> ChatResponse

# Internal:
def _detect_period(message: str) -> tuple[int, int]       # (month, year) from text
def _detect_intent(message: str) -> str                   # intent label
def _route_intent(session, intent, month, year) -> dict   # data payload
def _build_chart(intent, data) -> dict | None             # Recharts-compatible
def _generate_quick_replies(intent) -> list[str]
```

**Intent keywords:**
- `total_spend`: "total", "spent", "spend"
- `category_breakdown`: "category", "breakdown", "categories"
- `income_vs_expense`: "income", "salary", "earning"
- `savings_rate`: "saving", "save", "savings rate"
- `trend`: "trend", "over time", "month by month"
- `budget_status`: "budget", "limit", "over budget"
- `top_expenses`: "top", "biggest", "largest", "most expensive"

### 3.6 `categorizer_service.py`

```python
def categorize(description: str, amount: float, session) -> tuple[str, int | None, str]
# Returns: (type, category_id, confidence)

def resolve_category_id(session, name: str) -> int | None
```

**50+ keyword rules** (excerpt):
```python
EXPENSE_KEYWORDS = {
    "Food":        ["zomato", "swiggy", "uber eats", "restaurant", "cafe", "pizza"],
    "Transport":   ["uber", "ola", "rapido", "metro", "bus", "auto"],
    "Shopping":    ["amazon", "flipkart", "myntra", "meesho", "mall"],
    "Health":      ["pharmacy", "hospital", "clinic", "medplus", "apollo"],
    "Fuel":        ["petrol", "bpcl", "iocl", "hpcl", "fuel"],
    "Utilities":   ["electricity", "water", "gas", "bescom", "tata power"],
}
INCOME_SIGNALS = ["salary", "credit", "neft cr", "imps cr", "upi cr", "refund"]
```

### 3.7 `import_service.py`

```python
def parse_and_preview(file: UploadFile, session) -> ImportPreview
def confirm_import(session_id: str, transactions: list[ImportTransaction], db) -> ImportResult

# Internal:
def _parse_pdf(file) -> list[RawRow]
def _parse_csv(file) -> list[RawRow]
def _classify_waterfall(rows, session) -> list[ImportTransaction]
def _pass1_import_rules(row, rules) -> ImportTransaction | None
def _pass2_income_sources(row, sources) -> ImportTransaction | None
def _pass3_builtin_keywords(row, session) -> ImportTransaction
```

**Session store:** `Dict[str, ImportSession]` held in memory with `created_at` for 30-min TTL enforcement.

**Canara Bank PDF parser specifics:**
- Columns: `Date | Description | Ref No | Value Date | Withdrawal | Deposit | Balance`
- Skips `B/F` rows and continuation header rows
- Cross-page row stitching: partial row (no amount) is merged with next page's first row

### 3.8 `import_rules_service.py`

```python
def evaluate_rules(row: RawRow, rules: list[ImportRule]) -> ImportTransaction | None
def apply_retroactive(rule: ImportRule, session) -> int   # returns matched count

# Internal:
def _eval_condition(row, condition: dict) -> bool
def _eval_conditions(row, conditions, logic: str) -> bool  # AND/OR
```

**Condition evaluation:**
```python
match condition["operator"]:
    case "contains":     return value.lower() in field.lower()
    case "not_contains": return value.lower() not in field.lower()
    case "equals":       return field.lower() == value.lower()
    case "starts_with":  return field.lower().startswith(value.lower())
    case "ends_with":    return field.lower().endswith(value.lower())
    case "regex":        return bool(re.search(value, field, re.IGNORECASE))
```

---

## 4. Pydantic Schemas (schemas.py)

### 4.1 Key Request Schemas

| Schema | Key Validators |
|--------|----------------|
| `ExpenseCreate` | `amount > 0`, `description` non-blank ≤ 200 chars, `type` in enum |
| `ExpenseUpdate` | All fields optional; same validators when provided |
| `CategoryCreate` | `color` matches `^#[0-9A-Fa-f]{6}$` |
| `BudgetCreate` | `amount > 0`, `month` in 1–12, `year >= 2020` |
| `RecurringExpenseCreate` | `frequency` in `["daily","weekly","monthly"]`, `next_date` valid |
| `GoalCreate` | `target_amount > 0`, `deadline` optional future date |
| `ImportRuleCreate` | `conditions` is valid `list[dict]`, `actions` is valid `dict`, `condition_logic` in `["AND","OR"]` |
| `ChatRequest` | `message` non-blank ≤ 500 chars |

### 4.2 Key Response Schemas

| Schema | Description |
|--------|-------------|
| `ExpensePage` | `{ items, next_cursor, total, has_more }` |
| `BudgetStatus` | Computed: `budgeted`, `actual`, `remaining`, `percent_used`, `is_over_budget` |
| `MonthlySummary` | `total_expense`, `total_income`, `net_balance`, `expense_count`, `avg_expense` |
| `TrendPoint` | `{ month, year, total, label }` |
| `YoYPoint` | `{ month, label, this_year, last_year }` |
| `SpendPrediction` | `{ current_total, daily_rate, predicted_total, days_remaining, days_elapsed }` |
| `Insight` | `{ type, message, severity, category_id }` |
| `ImportPreview` | `{ session_id, transactions, total, income_count, expense_count }` |
| `ImportTransaction` | `{ row, date, description, amount, type, category_id, confidence, skip }` |
| `ChatResponse` | `{ reply, chart, quick_replies }` |

---

## 5. Frontend State Management

Each page manages its own local state via React hooks (`useState`, `useEffect`). A single shared `PeriodContext` provides the selected period (Week/Month/Quarter/Year) and navigation arrows across all pages.

### `PeriodContext` (shared)

```javascript
// context/PeriodContext.jsx
{
  period,           // "week" | "month" | "quarter" | "year"
  setPeriod,        // setter
  currentDate,      // Date object (start of selected period)
  navigate,         // (direction: -1 | 1) => void
  getDateRange,     // () => { date_from, date_to }  — ISO strings
}
```

### `Dashboard.jsx`

```javascript
summary, prevSummary   // MonthlySummary for current + previous month
breakdown              // List[CategoryBreakdown]
trend                  // List[TrendPoint]
yoyData                // List[YoYPoint]
prediction             // SpendPrediction
budgetStatus           // List[BudgetStatus]
recentExpenses         // List[ExpenseRead] (last 10)
insights               // List[Insight]
loading                // boolean — shows skeleton during Promise.all
```

All data fetched in a single `Promise.all([...])` on mount and on `PeriodContext` change.
Chart type auto-switches: `PieChart` when ≤ 6 categories, `Treemap` when > 6.

### `Expenses.jsx`

```javascript
expenses               // ExpensePage.items (accumulated across cursor pages)
nextCursor             // string | null — for "Load more"
total                  // number — ExpensePage.total
categories             // List[CategoryRead]
filterCategory         // number | null
filterDateFrom/To      // string | null
filterType             // "expense" | "income" | null
selectedIds            // Set<number> — for bulk-delete
editingExpense         // ExpenseRead | null
```

### `Budgets.jsx`

```javascript
budgets                // List[BudgetStatus]
categories             // List[CategoryRead]
showForm               // boolean
selectedIds            // Set<number> — for bulk-delete
```

### `Chat.jsx`

```javascript
messages               // List[{ role, content, chart }]
input                  // string
loading                // boolean
```

Starter chips (5): hardcoded quick-start questions shown when `messages.length === 0`.
Quick replies: rendered below each assistant message as clickable chips.

### `RecurringExpenses.jsx`

```javascript
templates              // List[RecurringExpenseRead]
categories             // List[CategoryRead]
showForm               // boolean
editingTemplate        // RecurringExpenseRead | null
```

`is_overdue` computed: `new Date(template.next_date) <= new Date()`.

### `Alerts.jsx`

```javascript
alerts                 // List[SpendingAlertRead]
unreadCount            // number — drives sidebar badge
loading                // boolean
```

### `Goals.jsx`

```javascript
goals                  // List[GoalRead]
showForm               // boolean
showAddSavings         // GoalRead | null
savingsAmount          // string
```

### `Settings.jsx` (v2.3.0 — tabbed hub)

```javascript
activeTab              // string — from useSearchParams("tab"), default "categories"
// Each tab renders its own sub-component:
// "categories"   → <Categories />
// "import"       → <Import />
// "import-rules" → <ImportRules />
// "whats-new"    → <FeatureUpdates />
```

> [!note] Legacy redirects
> `/categories`, `/import`, `/import-rules`, `/features` redirect to `/settings?tab=<name>` via `<Navigate replace>` in `App.jsx`. The `activeTab` param drives which component renders inside `Settings.jsx`.

---

## 6. Custom Hooks

### `useAutoRefresh(callback, intervalMs)`

```javascript
// hooks/useAutoRefresh.js
useEffect(() => {
  const id = setInterval(callback, intervalMs);
  return () => clearInterval(id);
}, [callback, intervalMs]);
```
Used on `Alerts.jsx` (30-second auto-refresh) and `Dashboard.jsx` (60-second auto-refresh).

### `useChartTheme()`

```javascript
// hooks/useChartTheme.js
// Reads document.body.dataset.theme ("light" | "dark" | "galaxy")
// Returns { colors, background, textColor, gridColor }
// Recharts theme-aware palette for all 3 themes
```

---

## 7. Docker Compose — Service Dependencies

```
expense_db  (postgres:15-alpine)
    └── healthcheck: pg_isready -U ${POSTGRES_USER} every 5s / timeout 5s / retries 5
          ↓ (condition: service_healthy)
expense_backend  (python:3.11-slim)
    └── uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
    └── depends_on: db (service_healthy)
    └── env_file: backend/.env
          ↓ (condition: service_started)
expense_frontend  (node:18-alpine)
    └── npm run dev -- --host --port 5173
    └── depends_on: backend (service_started)
```

**Volumes:**
- `postgres_data:/var/lib/postgresql/data` — named volume, persists between restarts
- `./backend:/app` — bind mount, live reload for Python
- `./frontend:/app` — bind mount, live reload for React
- `/app/node_modules` — anonymous volume prevents host override

**Network:** Single bridge network `expense_network`; containers reference each other by service name (`db`, `backend`, `frontend`).

> [!warning] Windows deployment
> The `.gitattributes` file (`* text=auto eol=lf`) prevents CRLF injection. Always clone after this file is committed. Without it, `\r: command not found` errors occur inside Docker Linux containers.

---

## 8. Startup Sequence (`main.py` lifespan)

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # 1. Run ALTER TABLE … ADD COLUMN IF NOT EXISTS migrations
    run_migrations(engine)
    # 2. Create all tables (SQLModel.metadata.create_all)
    SQLModel.metadata.create_all(engine)
    # 3. Seed 26 default categories if none exist
    with Session(engine) as session:
        if not session.exec(select(Category)).first():
            seed_default_categories(session)
    yield
    # Shutdown: nothing to clean up
```

**Migration pattern** (zero-downtime):
```python
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'expense';
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS emoji VARCHAR(10);
```

---

## 9. PWA: Service Worker (`public/sw.js`)

```javascript
const CACHE_VERSION = 'v2.3.0';
const APP_SHELL_CACHE = `app-shell-${CACHE_VERSION}`;
const API_CACHE = `api-cache-${CACHE_VERSION}`;

// Cache-first: app shell (HTML, JS, CSS, fonts)
// Network-first: /api/* (with stale-cache fallback)
// On activate: delete old CACHE_VERSION caches

// Install event: pre-cache app shell assets
// Fetch event:
//   if (url.pathname.startsWith('/api'))
//     → try network → on fail, try API_CACHE → on fail, return 503 JSON
//   else
//     → try APP_SHELL_CACHE → on miss, try network → cache response
```

The `503 JSON` response placeholder is `{ "offline": true, "message": "You are offline" }` which the frontend handles gracefully by showing the last-known data.
