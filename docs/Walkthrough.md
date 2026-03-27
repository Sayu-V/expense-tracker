# Application Walkthrough — Expense Tracker v1.0.0

> **Author:** Sayu-V | Yenepoya University  
> **Date:** 2026-03-27

This guide walks through every feature of the Expense Tracker application from a user's perspective.

---

## Prerequisites

1. Docker Desktop installed and running
2. Repository cloned: `git clone https://github.com/Sayu-V/expense-tracker.git`
3. `.env` created: `cp backend/.env.example backend/.env`

## Starting the Application

```bash
cd expense-tracker
docker compose up --build
```

Wait until you see:
```
expense_backend  | Application startup complete.
expense_frontend | Local: http://localhost:5173/
```

Open **http://localhost:5173** in your browser.

---

## Page 1 — Dashboard

The dashboard is the home screen at `/`. It loads automatically and displays six widgets.

### Widget 1 — Total Spend (top-left card)
Shows total money spent in the **current calendar month** in Indian Rupees (₹). Below the amount, a green/red indicator shows the month-over-month change (e.g., "▲ 12% vs last month").

### Widget 2 — Transactions (top card)
Count of individual expense records for the current month.

### Widget 3 — Average per Expense (top card)
Mean value of all expenses this month.

### Widget 4 — Categories Used (top card)
How many distinct categories have been spent in this month.

### Widget 5 — Spend by Category (Pie Chart)
A donut/pie chart breaking down spending by category. Each slice is coloured with the category's assigned colour. Hover for exact amounts.

### Widget 6 — Monthly Trend (Line Chart)
A line chart showing total spend per month over the past 6 months. Useful for spotting long-term spending patterns.

### Widget 7 — Budget vs Actual (Bar Chart)
Horizontal bar chart comparing your budget ceiling (light bar) against actual spend (dark bar) for each category. Only appears when budgets have been set.

### Widget 8 — Recent Expenses (Table)
The last 10 expense records ordered by date, showing: date, description, category badge, and amount.

### Widget 9 — AI Insights Panel
Smart tips computed from your spending data. Each insight shows:
- An icon (ℹ️ info, ⚠️ warning, 🚨 alert)
- A badge with the insight type
- A human-readable message

**Insight types:**
| Type | Meaning |
|------|---------|
| `budget overspend` | You've exceeded your budget for a category |
| `burn rate` | Spending > 80% of budget before month end |
| `mom spike` | This month's spend is 30%+ higher than last month |
| `top category` | Your biggest spending category this month |
| `unusual expense` | A single expense is 2× above your category average |
| `savings opportunity` | Consistently under budget — consider lowering the ceiling |
| `streak` | You haven't logged any expenses in 3+ days |

---

## Page 2 — Expenses

Navigate to **Expenses** in the left sidebar (or go to `/expenses`).

### Viewing Expenses

All expenses are listed in a table with columns: Date, Description, Category, Amount, and Actions (Edit / Delete).

### Adding an Expense

Click **+ Add Expense** (top right). Fill in:
- **Amount** — must be greater than 0, up to 2 decimal places
- **Category** — select from the dropdown (7 defaults + any custom ones you've created)
- **Description** — required, max 200 characters
- **Date** — defaults to today
- **Notes** — optional, max 500 characters

Click **Save**. The new expense appears in the table immediately.

### Editing an Expense

Click the ✏️ edit icon on any row. The form pre-fills with current values. Change what you need and click **Save**.

### Deleting an Expense

Click the 🗑️ delete icon on any row. The expense is removed immediately (no confirmation prompt in v1.0.0).

### Filtering Expenses

Use the filter bar at the top of the table:
- **Category** — dropdown to show only one category
- **From Date / To Date** — date range filter

Filters combine — e.g., "Food expenses in March 2026".

---

## Page 3 — Budgets

Navigate to **Budgets** in the sidebar (or go to `/budgets`).

### Setting a Budget

Click **+ Set Budget**. Fill in:
- **Category** — which category to budget
- **Amount** — the monthly spending ceiling
- **Month** and **Year** — which month this budget applies to

Click **Save**. If a budget already exists for that category+month, it is updated (upsert behaviour).

### Reading the Budget View

Each budget shows:
- Category name and colour
- A progress bar (green when under budget, red when over)
- "₹ actual spent / ₹ budgeted" text
- Percentage used

### Budget Status on Dashboard

Once budgets are set, the **Budget vs Actual** bar chart on the Dashboard becomes visible, giving a side-by-side comparison across all categories.

---

## API / Swagger UI

For developers or advanced users, visit **http://localhost:8000/docs** for the interactive Swagger UI.

Every endpoint is documented with:
- Request body schema
- Query parameter descriptions
- Response shapes
- Live "Try it out" execution

---

## Stopping the Application

In the Terminal where Docker is running, press `Ctrl+C`, then:

```bash
docker compose down
```

To also delete the database volume (all your data):

```bash
docker compose down -v
```
