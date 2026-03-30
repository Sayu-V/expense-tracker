---
title: Application Walkthrough
date: 2026-03-29
tags:
  - expense-tracker
  - walkthrough
  - documentation
  - user-guide
aliases:
  - Walkthrough
  - User Guide
  - App Guide
version: 2.3.0
status: active
related:
  - "[[NoneREADME]]"
  - "[[None03_Architecture]]"
  - "[[None05_HLD]]"
  - "[[None06_LLD]]"
---

# Application Walkthrough — Expense Tracker v2.3.0

> **Author:** Sayu-V | Yenepoya University
> **Updated:** 2026-03-29

See also: [[NoneREADME]] · [[None03_Architecture]] · [[None05_HLD]] · [[None06_LLD]]

This guide walks through every feature of the Expense Tracker application from a user's perspective. All features described here are live in ==v2.3.0==.

---

## Prerequisites

1. Docker Desktop installed and running (Mac) or Docker Desktop with WSL2 enabled (Windows)
2. Repository cloned: `git clone https://github.com/Sayu-V/expense-tracker.git`
3. `.env` created: `cp backend/.env.example backend/.env`

> [!warning] Windows Users
> Ensure WSL2 is enabled before running Docker Desktop. The repo includes a `.gitattributes` file to enforce LF line endings — this prevents `\r: command not found` errors inside Docker Linux containers.

---

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

Open **http://localhost:5173** in your browser. A 3D glass-morphism splash screen will appear briefly with a rotating financial quote, then transition into the app.

> [!tip] API Explorer
> Visit **http://localhost:8000/docs** for the full interactive Swagger UI.

---

## Theme System

The app ships with three visual themes, cycled via the toggle button in the top bar:

| Theme | Icon | Description |
|-------|------|-------------|
| Light | ☀️ | Clean, accessible default |
| Dark | 🌙 | Full dark palette |
| Galaxy | 🌌 | Deep-space glass-morphism with animated radial-gradient orbs |

The Galaxy theme adds three `position: fixed` animated orbs as a background layer, with `backdrop-filter: blur()` applied to all cards, sidebar, and topbar surfaces.

---

## Period Selector

At the top of most pages, a **Period Selector** lets you navigate your data by:

- **Week** — current 7-day window
- **Month** — full calendar month (default)
- **Quarter** — 3-month period
- **Year** — full calendar year

Use the **‹** and **›** arrows to move backward and forward through periods. All dashboard widgets and reports respond to the selected period.

---

## Page 1 — Dashboard (`/`)

The dashboard is the home screen. It loads all widgets in parallel using `Promise.all` and shows a skeleton loading state during fetch.

### Spend Summary Cards

Four metric cards at the top of the page:
- **Total Spend** — total money spent in the selected period, with a month-over-month % change indicator (green ▲ / red ▼)
- **Transactions** — count of individual expense records
- **Average per Expense** — mean value across all expenses
- **Categories Used** — count of distinct categories with activity

### Spend by Category (Pie / Treemap Chart)

A chart breaking down spending by category. The chart type switches automatically:
- **PieChart** when ≤ 6 categories have spend
- **Treemap** when > 6 categories have spend (better for many categories)

Hover/click slices for exact amounts. Each slice uses the category's assigned colour.

### Monthly Trend (Line Chart)

A line chart showing total spend per month over the selected period. Useful for spotting long-term spending patterns and seasonality.

### Year-over-Year Comparison (Bar Chart)

> [!info] v1.8.0 feature
> A grouped bar chart comparing total spend for each month of **this year** vs **last year** (Jan–Dec). Lets you spot seasonal patterns and year-on-year changes at a glance.

### Predicted Spend Card

> [!info] v1.8.0 feature
> A card showing:
> - **Current month total** — spend so far
> - **Daily burn rate** — average spend per day this month
> - **Predicted month-end total** — linear extrapolation

### Budget vs Actual (Bar Chart)

Horizontal bar chart comparing your budget ceiling against actual spend for each category. Only appears when budgets have been set. Bars turn red when over budget.

### Recent Expenses (Table)

The last 10 expense records ordered by date, showing: date, description, category badge, amount, and type (expense/income).

### AI Insights Panel

Smart tips computed server-side from your spending data. Each insight shows a severity icon, type badge, and human-readable message.

**All 10 insight types:**

| Type | Trigger | Severity |
|------|---------|----------|
| `budget_overspend` | Actual > budgeted for a category | 🚨 Alert |
| `burn_rate` | Daily rate will exceed budget by month-end | ⚠️ Warning |
| `mom_spike` | This month > last month by 30%+ | ⚠️ Warning |
| `top_category` | Reports your highest-spend category | ℹ️ Info |
| `unusual_expense` | Single item > 2× category average | ⚠️ Warning |
| `savings_opportunity` | Under budget 2 consecutive months | ℹ️ Info |
| `streak` | No spend logged in 3+ days | ℹ️ Info |
| `daily_rate` | Projected month-end total | ℹ️ Info |
| `savings_rate` | % of income being saved | ℹ️ Info |
| `yoy_comparison` | vs same month last year ≥15% change | ⚠️ Warning |

> [!note] No external APIs
> All 10 insights are computed entirely in Python on the server — no ML model, no LLM API call. The system works fully offline.

---

## Page 2 — Expenses (`/expenses`)

### Viewing Expenses

Expenses are displayed in a paginated table. Use **Load more** to fetch additional pages using stable keyset cursor pagination. The header shows "X of Y total expenses".

### Adding an Expense

Click **+ Add Expense** (top right). Fill in:
- **Amount** — must be greater than 0
- **Type** — `expense` or `income`
- **Category** — select from the dropdown
- **Description** — required, max 200 characters
- **Date** — defaults to today
- **Notes** — optional, max 500 characters

Click **Save**. The new expense appears in the list immediately.

### Filtering Expenses

Use the filter bar:
- **Category** — filter by category
- **Type** — expense / income
- **From Date / To Date** — date range
- **Min / Max Amount** — amount range

Filters combine: e.g., "Food income between ₹1000 and ₹50000 in March 2026".

### Bulk Delete

Click the checkbox on any expense rows to select them. A bulk-action bar appears with a **Delete selected** button. Confirm to delete all selected at once.

### CSV Export

Click **Export CSV** (top right) to download a `.csv` file of the currently filtered expense list. Useful for importing into spreadsheets.

---

## Page 3 — Budgets (`/budgets`)

### Setting a Budget

Click **+ Set Budget**. Fill in:
- **Category** — which category to budget
- **Amount** — the monthly spending ceiling
- **Month** and **Year** — which month this budget applies to

If a budget already exists for that `(category, month, year)` triple, it is updated (upsert behaviour).

### Reading the Budget View

Each budget card shows:
- Category name, emoji, and colour badge
- A progress bar (green when under budget, red when over)
- "₹ actual spent / ₹ budgeted" text
- Percentage used
- "Over budget" warning badge when applicable

### Editing / Deleting Budgets

Click the ✏️ edit or 🗑️ delete icon on any budget card.

---

## Page 4 — Chat AI (`/chat`)

> [!info] v1.5.0 feature — No external API required
> The chat assistant is fully offline and rule-based.

### Starting a Conversation

Five starter chips appear when the chat is empty:
1. How much did I spend this month?
2. Show my spending by category
3. What's my income vs expenses?
4. Show 6-month trend
5. What are my savings?

Click any chip or type your own question.

### Supported Queries

| Intent | Example Questions |
|--------|-------------------|
| Total spend | "How much did I spend in March?" |
| Category breakdown | "Show my categories this month" |
| Income vs expenses | "What's my income vs expenses?" |
| Savings rate | "What's my savings rate?" |
| Trend | "Show 6-month trend" |
| Budget status | "Am I over budget?" |
| Top expenses | "What are my biggest expenses?" |

### Inline Charts

The chat renders Recharts visualisations directly inside message bubbles:
- **Pie chart** for category breakdown
- **Bar chart** for budget status or comparisons
- **Line chart** for trends

### Quick Reply Chips

After each assistant response, contextual follow-up chips appear as clickable suggestions (e.g., "Show me trend", "Compare with last month").

---

## Page 5 — Recurring Expenses (`/recurring`)

> [!info] v1.7.0 feature

### Creating a Template

Click **+ Add Template**. Fill in:
- **Description** — e.g., "Monthly rent"
- **Amount**
- **Category**
- **Frequency** — `daily`, `weekly`, or `monthly`
- **Next Date** — when to first generate from this template
- **Notes** — optional

### Generating Due Entries

When a template's `next_date` is today or in the past, it shows an **Overdue** badge in orange.

- Click **Generate** on a single template to create one expense entry and advance `next_date` by the frequency
- Click **Generate All Due** at the top to process all overdue templates in one action

---

## Page 6 — Alerts (`/alerts`)

> [!info] v1.7.0 feature

### How Alerts Work

The system evaluates your spending data against threshold rules on demand.

Click **Check Now** to run the alert engine. It creates new `SpendingAlert` records for any triggered conditions.

Each alert shows:
- **Severity badge** — `info` (blue), `warning` (orange), `critical` (red)
- **Type** — the rule that fired (e.g., `budget_exceeded`)
- **Message** — human-readable explanation
- **Date** — when it was generated

### Managing Alerts

- Click **Mark as Read** on individual alerts to dismiss the unread badge
- Click **Mark All Read** to clear the sidebar badge counter
- The sidebar shows an unread count badge when new alerts are present

---

## Page 7 — Goals (`/goals`)

> [!info] v1.7.0 feature

### Creating a Savings Goal

Click **+ Add Goal**. Fill in:
- **Name** — e.g., "Emergency Fund"
- **Target Amount** — the savings target
- **Deadline** — optional target date

### Tracking Progress

Each goal card shows:
- An **animated SVG progress ring** showing current % of target reached
- **Current / Target** amounts
- **Projected completion date** — based on your average monthly savings rate
- A 🏆 badge when the goal is completed (`current >= target`)

### Adding Savings

Click **Add Savings** on any goal card. Enter the amount saved and click **Add**. The progress ring animates to the new percentage. The goal auto-marks as completed when `current_amount >= target_amount`.

---

## Page 8 — Settings (`/settings`)

> [!info] v2.3.0 — Settings Hub consolidation
> Four previously separate pages are now unified under a single ⚙️ Settings sidebar entry with URL-driven tabs.

Use the tab bar to switch between:

### Tab 1: Categories (`?tab=categories`)

**Viewing categories:**
All 26 default categories are listed with name, emoji, and colour badge. Default categories cannot be deleted.

**Creating a custom category:**
Click **+ Add Category**. Fill in:
- **Name** — must be unique
- **Colour** — hex colour picker
- **Emoji** — choose from the emoji picker (120+ emojis, 11 themed tabs)

**Editing / Deleting:**
Custom categories can be edited or deleted. Default categories can be edited (colour/emoji) but not deleted.

### Tab 2: Import (`?tab=import`)

> [!info] v2.0.0 feature

The bank statement import wizard has **3 steps**:

**Step 1 — Upload**
Drag and drop or click to select a file:
- **Canara Bank PDF** — structured table extraction using pdfplumber
- **Generic CSV** — standard column mapping (`date, description, amount, type`)
- Maximum file size: 20 MB

**Step 2 — Preview & Edit**
A table shows all parsed transactions with:
- **Type selector** — switch between `expense` and `income` per row
- **Category dropdown** — override the auto-classified category
- **Skip checkbox** — exclude specific rows from the import
- **Confidence badge** — `high`, `medium`, `low` indicates auto-classification confidence
- **⚠️ flag** — rows that could not be auto-classified are flagged for manual review

**3-pass classification waterfall:**
1. Import Rules engine (user-defined rules, ordered by priority)
2. Income Sources lookup (keyword-matched recurring income definitions)
3. Built-in 50+ keyword engine (Zomato → Food, Uber → Transport, etc.)

**Step 3 — Confirm**
Click **Import** to create Expense records for all non-skipped rows.

> [!note] Duplicate detection
> Large unclassified deposits (potential duplicates or transfers) are flagged with ⚠️ for manual review before confirming.

### Tab 3: Import Rules (`?tab=import-rules`)

> [!info] v2.1.0 feature

Three nested tabs:

**My Rules** — your active rules listed by priority. Toggle active/inactive, edit, delete, or reorder.

**Creating a rule:**
Click **+ New Rule**. Fill in:
- **Name** — display name for the rule
- **Priority** — higher numbers are evaluated first
- **Condition Logic** — `AND` (all conditions must match) or `OR` (any condition matches)
- **Conditions** — one or more `{field, operator, value}` rows

Supported condition operators: `contains`, `not_contains`, `equals`, `starts_with`, `ends_with`, `regex`

- **Actions** — what to do on match:
  - Set type: expense / income
  - Set category
  - Rename description to a standardised value
  - Skip the row entirely

**How It Works** — an explanation of the 3-pass waterfall with visual diagram.

**Live Preview** — paste or type a sample description and see which rules would match and what action would be applied.

**Retroactive Apply:**
Click **Apply Retroactively** on any rule to re-run it against all existing expenses in the database. Matching expenses are updated instantly. The rule's `match_count` is updated.

**Quick Rule from Import:**
During the import preview, click **Quick Rule** on any row to instantly create a minimal `contains` rule for that description, pre-filled with the current type and category.

### Tab 4: What's New (`?tab=whats-new`)

> [!info] v2.2.0 feature

A **Kanban-style board** showing all features grouped by version. Each card shows:
- Feature title and description
- Version badge
- Status badge (Released / Beta)

A **version timeline** at the bottom lists all versions from v1.0.0 to v2.3.0 in order.

---

## API / Swagger UI

For developers or advanced users, visit **http://localhost:8000/docs** for the interactive Swagger UI.

Every endpoint is documented with:
- Request body schema and example
- Query parameter descriptions
- Response shapes with example values
- Live **"Try it out"** execution

Also available: **http://localhost:8000/redoc** for the ReDoc documentation view.

---

## PWA — Install as App

> [!info] v2.2.0 feature

The app can be installed as a Progressive Web App:

1. In Chrome/Edge, look for the **Install** icon in the address bar
2. Click **Install** to add the app to your desktop/dock
3. The app opens in its own window without browser chrome

**Offline behaviour:**
- The app shell (HTML, JS, CSS) loads from cache even without network — instant startup
- API data shows the last-known cached values with a network error notice when offline
- A `503` JSON response triggers the frontend to show stale data gracefully

---

## Stopping the Application

In the Terminal where Docker is running, press `Ctrl+C`, then:

```bash
docker compose down
```

To also delete the database volume (permanently deletes all your data):

```bash
docker compose down -v
```

> [!warning]
> `docker compose down -v` is irreversible. All expense data, budgets, goals, and rules will be permanently deleted.
