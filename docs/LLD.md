# Low-Level Design (LLD) — Expense Tracker v1.0.0

> **Author:** Sayu-V | Yenepoya University  
> **Date:** 2026-03-27  
> **Version:** 1.0.0

---

## 1. Database Schema (Detailed)

### 1.1 Table: `categories`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | SQLite/PG auto |
| `name` | VARCHAR(100) | NOT NULL, UNIQUE, INDEX | Case-sensitive |
| `color` | VARCHAR(7) | NOT NULL, DEFAULT `#6366f1` | Hex format `#RRGGBB` |
| `is_default` | BOOLEAN | NOT NULL, DEFAULT false | True = seeded, cannot delete |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Server-side UTC |

**Indexes:** `name` (unique index)  
**Relationships:** One `Category` → Many `Expense`; One `Category` → Many `Budget`

---

### 1.2 Table: `expenses`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `amount` | FLOAT | NOT NULL, CHECK > 0 | Max 2 decimal places (enforced by Pydantic) |
| `description` | VARCHAR(200) | NOT NULL | Stripped of whitespace |
| `notes` | VARCHAR(500) | NULLABLE | Optional free text |
| `date` | DATE | NOT NULL, INDEX | Format: YYYY-MM-DD |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Immutable after insert |
| `updated_at` | TIMESTAMP | NOT NULL, DEFAULT now() | Updated on every PUT |
| `category_id` | INTEGER | FK → `categories.id`, INDEX | Required, must be valid |

**Indexes:** `date`, `category_id`  
**Constraints:** `amount > 0`, `category_id` references valid category

---

### 1.3 Table: `budgets`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | INTEGER | PK, AUTO INCREMENT | |
| `amount` | FLOAT | NOT NULL, CHECK > 0 | Budget ceiling |
| `month` | INTEGER | NOT NULL, CHECK 1–12 | Calendar month |
| `year` | INTEGER | NOT NULL, CHECK >= 2020 | Calendar year |
| `created_at` | TIMESTAMP | NOT NULL, DEFAULT now() | |
| `category_id` | INTEGER | FK → `categories.id`, INDEX | Required |

**Indexes:** `category_id`  
**Logical unique constraint:** (`category_id`, `month`, `year`) — enforced at service layer via upsert

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
  "date": "2026-03-27",
  "notes": "Weekly shopping"
}
```
**Validation:** `amount > 0`, `description` non-blank and max 200 chars, `date` valid ISO format  
**Response:** `201 Created` → `ExpenseRead`  
**Errors:** `422` validation fail, `404` category not found

#### `GET /api/v1/expenses`
**Query params:** `category_id`, `date_from`, `date_to`, `min_amount`, `max_amount`, `limit`, `offset`  
**Response:** `200 OK` → `List[ExpenseRead]`

#### `GET /api/v1/expenses/{id}`
**Response:** `200 OK` → `ExpenseRead` | `404 Not Found`

#### `PUT /api/v1/expenses/{id}`
**Request body (`ExpenseUpdate`):** All fields optional  
**Response:** `200 OK` → updated `ExpenseRead` | `404 Not Found`

#### `DELETE /api/v1/expenses/{id}`
**Response:** `204 No Content` | `404 Not Found`

---

### 2.2 Categories

#### `GET /api/v1/categories`
**Response:** `200 OK` → `List[CategoryRead]`

#### `POST /api/v1/categories`
**Request body (`CategoryCreate`):**
```json
{ "name": "Gaming", "color": "#a855f7" }
```
**Validation:** `color` must match `#RRGGBB` 7-char hex  
**Response:** `201 Created` → `CategoryRead`  
**Errors:** `409 Conflict` if name already exists

#### `DELETE /api/v1/categories/{id}`
**Response:** `204 No Content` | `404 Not Found` | `400 Bad Request` if `is_default=true`

---

### 2.3 Budgets

#### `POST /api/v1/budgets`
**Request body (`BudgetCreate`):**
```json
{ "category_id": 1, "amount": 5000.00, "month": 3, "year": 2026 }
```
**Behaviour:** Upsert — creates or updates the budget for that category+month+year  
**Response:** `201 Created` → `BudgetRead`

#### `GET /api/v1/budgets?month=3&year=2026`
**Response:** `200 OK` → `List[BudgetRead]`

#### `GET /api/v1/budgets/status?month=3&year=2026`
**Response:** `200 OK` → `List[BudgetStatus]`
```json
[{
  "category_id": 1,
  "category_name": "Food",
  "category_color": "#f97316",
  "budgeted": 5000.00,
  "actual": 3200.00,
  "remaining": 1800.00,
  "percent_used": 64.0,
  "is_over_budget": false
}]
```

---

### 2.4 Reports

#### `GET /api/v1/reports/monthly-summary?month=3&year=2026`
**Response:**
```json
{ "month": 3, "year": 2026, "total_spend": 12500.00, "expense_count": 24, "avg_expense": 520.83 }
```

#### `GET /api/v1/reports/by-category?month=3&year=2026`
**Response:** `List[CategoryBreakdown]` — each item includes `total`, `count`, `percentage`

#### `GET /api/v1/reports/trend?months=6`
**Response:** `List[TrendPoint]` — each with `month`, `year`, `total`, `label` (e.g., `"Mar 2026"`)

#### `GET /api/v1/reports/top-expenses?limit=5&month=3&year=2026`
**Response:** `List[ExpenseRead]` — top N highest amounts for the period

---

### 2.5 Insights

#### `GET /api/v1/insights`
**Response:** `List[Insight]`
```json
[{
  "type": "budget_overspend",
  "message": "You've overspent on Food by ₹500 (110% of budget)",
  "severity": "alert",
  "category_id": 1,
  "category_name": "Food",
  "value": 110.0
}]
```
**Severity values:** `"info"` | `"warning"` | `"alert"`

---

## 3. Service Layer — Method Signatures

### 3.1 `expense_service.py`

```python
def create_expense(session, data: ExpenseCreate) -> Expense
def get_expense(session, expense_id: int) -> Expense          # raises 404
def list_expenses(session, category_id, date_from, date_to,
                  min_amount, max_amount, limit, offset) -> List[Expense]
def update_expense(session, expense_id: int, data: ExpenseUpdate) -> Expense
def delete_expense(session, expense_id: int) -> None
```

### 3.2 `budget_service.py`

```python
def upsert_budget(session, data: BudgetCreate) -> Budget
def list_budgets(session, month: int, year: int) -> List[Budget]
def get_budget_status(session, month: int, year: int) -> List[BudgetStatus]
```

### 3.3 `report_service.py`

```python
def get_monthly_summary(session, month: int, year: int) -> MonthlySummary
def get_category_breakdown(session, month: int, year: int) -> List[CategoryBreakdown]
def get_trend(session, months: int) -> List[TrendPoint]
def get_top_expenses(session, limit: int, month: int, year: int) -> List[Expense]
```

### 3.4 `insights_service.py`

```python
def generate_insights(session) -> List[Insight]
# Internal rule functions (not exported):
def _check_budget_overspend(expenses, budgets) -> List[Insight]
def _check_burn_rate(expenses, budgets) -> List[Insight]
def _check_mom_spike(this_month, last_month) -> List[Insight]
def _check_top_category(expenses) -> List[Insight]
def _check_unusual_expense(session, expenses) -> List[Insight]
def _check_savings_opportunity(session, budgets) -> List[Insight]
def _check_streak(session) -> List[Insight]
```

---

## 4. Pydantic Validators (schemas.py)

| Schema | Field | Validator | Rule |
|--------|-------|-----------|------|
| `ExpenseCreate` | `amount` | `amount_must_be_positive` | `v <= 0` → raise ValueError |
| `ExpenseCreate` | `description` | `description_not_empty` | `v.strip() == ""` → raise ValueError |
| `ExpenseUpdate` | `amount` | `amount_must_be_positive` | Same, but only if not None |
| `CategoryCreate` | `color` | `validate_hex_color` | Must start with `#` and be 7 chars |
| `BudgetCreate` | `amount` | `amount_must_be_positive` | `v <= 0` → raise ValueError |
| `BudgetCreate` | `month` | `month_range` | Not in 1–12 → raise ValueError |

---

## 5. Frontend State Management

Each page manages its own local state via React hooks. No global state store is used in v1.0.0.

### Dashboard.jsx state:
```javascript
summary, prevSummary   // MonthlySummary for current + previous month
breakdown              // List[CategoryBreakdown]
trend                  // List[TrendPoint]
budgetStatus           // List[BudgetStatus]
recentExpenses         // List[ExpenseRead] (last 10)
insights               // List[Insight]
loading                // boolean — shows spinner during Promise.all fetch
```

All data is fetched in a single `Promise.all` on mount. On error, `loading` is set to `false` and widgets render empty states.

### Expenses.jsx state:
```javascript
expenses               // List[ExpenseRead]
categories             // List[CategoryRead]
filterCategory         // number | null
filterDateFrom/To      // string | null
showForm               // boolean
editingExpense         // ExpenseRead | null
```

### Budgets.jsx state:
```javascript
budgets                // List[BudgetStatus]
categories             // List[CategoryRead]
showForm               // boolean
```

---

## 6. Docker Compose — Service Dependencies

```
expense_db  (postgres:15-alpine)
    └── healthcheck: pg_isready every 5s
          ↓ (service_healthy)
expense_backend  (python:3.11-slim)
    └── uvicorn app.main:app --reload --port 8000
          ↓ (depends_on)
expense_frontend  (node:18-alpine)
    └── npm run dev -- --host --port 5173
```

**Volume mounts (development):**
- `./backend:/app` — live reload for Python changes
- `./frontend:/app` — live reload for React changes
- `/app/node_modules` — anonymous volume prevents host override of container's node_modules
