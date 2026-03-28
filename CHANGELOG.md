# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Semantic Versioning](https://semver.org/).

---

## [Unreleased]

---

## [1.8.0] — feature/v1.8.0 — 2026-03-28

### Added

**Smart Insights Feed (v1.8.0)**
- Rule 8 `daily_rate` — computes daily burn rate (spent ÷ days elapsed) and projects month-end total; surfaces when days remain and projection is meaningfully higher than current spend
- Rule 9 `savings_rate` — shows what % of income is being saved; celebrates ≥20% savings rate; warns when spending exceeds income for the month
- Rule 10 `yoy_comparison` — compares current month's total spend vs the same month last year; surfaces when the change is ≥15% in either direction

**Year-over-Year Comparison**
- New `GET /api/v1/reports/year-over-year?year=YYYY` endpoint — returns 12 `YoYPoint` objects (Jan–Dec) with expense + income totals for `this_year` and `last_year`; future months of the current year show `0.0` to keep the chart honest
- New `YoYPoint` Pydantic schema: `month`, `label`, `this_year`, `last_year`, `income_this_year`, `income_last_year`
- Dashboard — grouped bar chart comparing this year vs last year (Jan–Dec) using Recharts `BarChart` with two bars per month
- Frontend `reportsApi.yearOverYear(params)` API method added

**Predicted Monthly Spend**
- New `GET /api/v1/reports/prediction?month=M&year=YYYY` endpoint — linear extrapolation: `daily_rate = spent_so_far / days_elapsed`, `predicted_total = daily_rate × days_in_month`
- New `SpendPrediction` Pydantic schema: `days_elapsed`, `days_in_month`, `spent_so_far`, `daily_rate`, `predicted_total`, `income_so_far`, `predicted_net`
- Dashboard — Prediction card showing progress bar (spent vs predicted), spent-so-far vs predicted-total mini-cards, daily rate, and a surplus/deficit banner
- Frontend `reportsApi.prediction(params)` API method added

### Changed
- `insights_service.py` — added 3 new rules (daily_rate, savings_rate, yoy_comparison) to the existing 7-rule engine
- `report_service.py` — imports `YoYPoint`, `SpendPrediction`; two new service functions added
- `routers/reports.py` — two new GET endpoints registered
- `api/index.js` — `reportsApi` extended with `yearOverYear` and `prediction`
- `Dashboard.jsx` — two new API calls in `Promise.all`, new state vars `yoyData` and `prediction`, new Row 2b with the prediction card and YoY chart
- App version bumped to `1.8.0`

---

## [1.7.0] — feature/v1.1.0 — 2026-03-28

### Added

**Recurring Expenses**
- New `RecurringExpense` DB table — stores recurring expense templates with `frequency` (daily / weekly / monthly) and `next_date`
- `POST /api/v1/recurring-expenses` — create template; `PUT /{id}` — edit; `DELETE /{id}` — remove
- `POST /api/v1/recurring-expenses/{id}/generate` — generate Expense rows from `next_date` up to today, then advance `next_date`
- `GET /api/v1/recurring-expenses/generate-all` — batch-generate for all active templates due today
- `python-dateutil` `relativedelta` used for correct month-end date arithmetic
- `RecurringExpenses.jsx` — table of templates with frequency badge, next-date warning (⚠️ if overdue), ⚡ Run, pause/resume toggle, edit, delete
- "⚡ Generate All Due" button processes all overdue templates at once

**Spending Alerts**
- New `SpendingAlert` DB table — stores budget threshold and category spike alerts with `severity` (info / warning / alert) and `is_read`
- Alert types: `budget_80` (≥80% of monthly budget used), `budget_over` (100%+ exceeded), `category_spike` (this month > 1.5× last month, min ₹100 baseline)
- `POST /api/v1/alerts/generate` — idempotent: computes alerts for current month without duplicating existing ones
- `POST /api/v1/alerts/{id}/read` and `POST /api/v1/alerts/read-all` — mark as read
- `DELETE /api/v1/alerts/{id}` — dismiss a single alert
- `Alerts.jsx` — alert cards with severity colour coding (red/amber/blue), type badge, unread dot, mark-read and dismiss buttons, "Check Now" trigger, unread-only filter
- Sidebar shows a red badge counter for unread alerts; auto-refreshes every 60s

**Goal Tracker**
- New `Goal` DB table — stores name, description, target amount, current amount, optional deadline, completed flag
- Progress computed server-side: `percent_complete`, `remaining_amount`, `projected_completion_date` (extrapolated from average daily save rate), `days_remaining`
- `PUT /api/v1/goals/{id}` — update including `current_amount`; auto-marks `is_completed` when `current ≥ target`
- `Goals.jsx` — animated SVG progress ring per goal, flat progress bar with amounts, projected date vs deadline comparison, "＋ Add Savings" quick-modal, filter tabs (All / Active / Completed)
- Summary strip: total goals count, total amount saved, overall percentage progress bar

**API**
- `recurringApi`, `alertsApi`, `goalsApi` added to `frontend/src/api/index.js`
- Three new sidebar nav sections under "v1.7 Features": 🔄 Recurring, 🔔 Alerts, 🏆 Goals
- Sidebar logo version badge `v1.6` → `v1.7`

### Changed
- `backend/app/models.py` — three new SQLModel table classes; `database.py` imports them before `create_all` so tables are created on first Docker start
- `backend/app/main.py` — registers `recurring`, `alerts`, `goals` routers; version bumped to `1.7.0`
- `frontend/src/index.css` — added `.btn-sm`, `.badge-success`, `.badge-neutral` utility classes
- Splash screen feature list expanded with Recurring, Alerts, Goals; version badge → `v1.7.0`

### Tests
- All 12 existing pytest tests pass (new tables use in-memory SQLite StaticPool, backward-compatible)

---

## [1.6.0] — feature/v1.1.0 — 2026-03-27

### Added

**Collapsible Sidebar (Feature 1)**
- "◀ Collapse" button at the bottom of the sidebar (desktop only via `.sidebar-collapse-btn`)
- Sidebar slides off-screen with smooth CSS transition (`transform`, 280 ms cubic-bezier) when collapsed
- `.main-content` margin-left transitions to `0` simultaneously so content fills the full width
- Collapsed state persisted in `localStorage` under the key `et-sidebar-hidden`
- Hamburger ☰ becomes visible on desktop automatically (`.menu-toggle-visible`) when sidebar is hidden — clicking it re-opens the sidebar
- Sidebar logo version badge updated `v1.5` → `v1.6`

**Polished Dark / Light Theme for Charts & Graphs (Feature 4)**
- New `hooks/useChartTheme.js` — `MutationObserver` watches `<html data-theme>` and re-reads resolved CSS variable values via `getComputedStyle` on every theme change; returns pre-built prop objects (`tickSm`, `tickMd`, `tooltipStyle`, `legendStyle`, `gridStroke`, `labelLineStroke`, raw colour strings)
- Root cause fixed: SVG presentation attributes (`stroke`, `fill` on `<CartesianGrid>`, `<Line>`, `<Bar>`) are not evaluated as CSS — literals like `"var(--border)"` were rendered as invalid colour strings
- `Dashboard.jsx` and `Chat.jsx` (`InlineChart` component) consume `ct = useChartTheme()` and pass resolved hex/rgba values to all Recharts props
- `index.css` additions: axis lines, tick lines, tooltip cursor, legend wrapper, active dot, pie labels all have CSS overrides that adapt to `[data-theme="dark"]`; dark-mode tooltip receives a drop-shadow for depth
- Splash screen version badge updated `v1.5.0` → `v1.6.0`

### Changed
- `App.jsx` — `getSavedTheme`/`saveTheme` helpers replaced by unified `lsGet`/`lsSet` helpers used for both theme and sidebar state
- `lsGet` / `lsSet` wrap `localStorage` access in try/catch for sandboxed-browser resilience

### Tests
- All 12 existing pytest tests pass (v1.6.0 changes are frontend-only)

---

## [1.5.0] — feature/v1.1.0 — 2026-03-27

### Added

**Edit & Delete Budgets**
- `PUT /api/v1/budgets/{id}` — update a budget's amount (`BudgetUpdate` schema)
- `DELETE /api/v1/budgets/{id}` — delete a single budget (204 No Content)
- `EditBudgetModal` in Budgets page — modal to change the amount for any budget row
- ✏️ Edit and 🗑 Delete action buttons on every budget row; `budget_id` now returned by `/budgets/status`

**Bulk-Select Delete (Expenses & Budgets)**
- `POST /api/v1/expenses/bulk-delete` and `POST /api/v1/budgets/bulk-delete` — delete multiple records by ID list
- Checkboxes on every row; "Select all" header checkbox; "🗑 Delete N selected" action button appears inline
- Selected rows highlighted with accent-light background; selection cleared after deletion

**Export to CSV**
- `utils/exportCsv.js` — client-side export; BOM prefix for Excel compatibility; supports function-key column definitions
- ⬇️ Export CSV buttons on both Expenses (date/description/category/type/amount/notes) and Budgets (budget vs actual)

**Chat with your Data (AI Insights)**
- `services/chat_service.py` — keyword-based NLP; no external API; period detection (this month / last week / in January / this year / today)
- Supported intents: total spend, category breakdown, specific category, income vs expenses, savings rate, 6-month trend, budget status, top-5 expenses
- `routers/chat.py` — `POST /api/v1/chat`; `ChatMessage` / `ChatResponse` / `ChatDataPoint` schemas in `schemas.py`
- `pages/Chat.jsx` — chat bubbles, typing indicator (3 pulsing dots), inline Recharts (pie/bar/line), markdown-lite renderer, quick-reply chips, auto-scroll, auto-expanding textarea, Enter to send
- 💬 Chat AI nav link added to sidebar

**General**
- Splash screen version badge → `v1.5.0`; feature grid updated with Chat AI and Export CSV entries
- Sidebar logo version badge → `v1.5`

---

## [1.4.0] — feature/v1.1.0 — 2026-03-27

### Added

**Splash Screen**
- Version badge updated to `v1.4.0` — always reflects latest release
- "View on GitHub →" button with GitHub mark SVG linking to `https://github.com/Sayu-V/expense-tracker`
- Features grid expanded to 10 items including v1.3.0/v1.4.0 features (Edit & Delete, Period selector, Dark mode, Mobile-friendly)
- Responsive feature grid uses `auto-fill minmax(180px, 1fr)` — two columns on wide screens, one column on narrow/phone screens

**Mobile Responsive (iOS & Android)**
- `index.html`: added `viewport-fit=cover`, `theme-color`, `apple-mobile-web-app-capable`, `apple-mobile-web-app-status-bar-style`, `mobile-web-app-capable` meta tags — enables full-screen / home-screen app behaviour on both iOS and Android
- `App.jsx`: hamburger button (`☰`) in topbar — hidden on desktop via CSS, shown on ≤768px screens
- Sidebar becomes a slide-in drawer on mobile: `translateX(-100%)` by default, `translateX(0)` when `sidebar-open` class is applied
- Semi-transparent backdrop (`.sidebar-backdrop`) covers main content when drawer is open; tap anywhere to close
- Sidebar auto-closes when a nav link is tapped (route change effect) or Escape key is pressed
- Body scroll is locked (`overflow: hidden`) while drawer is open on mobile to prevent accidental page scroll
- Modals become **bottom sheets** on ≤768px: slide up from bottom, full-width, rounded top corners, respects iOS home indicator via `env(safe-area-inset-bottom)`
- Topbar reduces padding and shows hamburger on mobile; period selector scrolls horizontally if needed
- All grid layouts (`.grid-4`, `.grid-3`, `.grid-2`) collapse to single-column on ≤768px
- Expenses table wrapped in `.table-scroll-wrapper` for horizontal scroll on small screens
- iOS safe-area insets applied to topbar and page-content via `@supports (padding: env(…))`
- `touch-action: manipulation` on all interactive elements prevents double-tap zoom on Android/iOS
- Minimum tap target `min-height: 44px` on action buttons (Apple HIG compliant)
- Theme preference now persisted in `localStorage` (with sandbox fallback) — survives page refresh

**Auto-Refresh (Real-time Responsiveness)**
- `hooks/useAutoRefresh.js` — new custom hook returning a `refreshKey` counter that increments every **30 seconds** while the browser tab is visible
- Pauses polling automatically via `visibilitychange` event when the user switches tabs or minimises the browser; resumes immediately on return
- Dashboard, Expenses, and Budgets all add `refreshKey` to their `useEffect` dependency arrays — data re-fetches in the background without any user action
- `.refresh-dot` CSS class: pulsing green dot indicator (can be added to any page title to signal live data)

### Changed
- Sidebar footer now includes a clickable GitHub link for Sayu-V
- `App.jsx` version badge in sidebar updated from `v1.3` → `v1.4`

---

## [1.3.0] — feature/v1.1.0 — 2026-03-27

### Added

**Frontend — UI/UX (Apple Design Guidelines)**
- Full Apple-inspired design system in `index.css`: SF Pro system font, CSS custom properties for all colours/spacing/radius/shadow, smooth transitions on all interactive elements
- Light / Dark theme toggle in the topbar — toggle button (🌙/☀️) applies `data-theme="dark"` on `<html>`, CSS variables switch automatically
- `components/PeriodSelector.jsx` — segmented Week/Month/Quarter/Year control + ‹ / › navigation arrows; driven by shared `PeriodContext`
- `context/PeriodContext.jsx` — global period state (type + offset); computes `dateFrom`, `dateTo`, `label`, `month`, `year` — consumed by Dashboard, Expenses, Budgets simultaneously
- Sticky topbar on all pages: period selector on the left, theme toggle on the right
- Sidebar redesigned: section labels, nav icons, logo version badge, footer attribution

**Frontend — Edit & Delete**
- `components/EditExpenseModal.jsx` — modal to edit any expense/income entry (amount, category, description, notes, date, type); uses existing `.modal-overlay` CSS; dismisses on backdrop click
- Edit (✏️) and Delete (🗑) buttons on every row in the Expenses table
- `pages/Categories.jsx` (new page) — full category management: view all 15 default categories + custom ones, edit name/emoji/color via modal (with emoji picker + color swatches), delete custom categories with confirmation guard; default categories show "default" badge and cannot be deleted
- 🏷️ Categories nav link added to sidebar

**Frontend — Period-aware views**
- Dashboard: all API calls (summary, breakdown, trend, budgets, recent expenses) pass `date_from`/`date_to` from PeriodContext; re-fetches automatically when period changes
- Expenses: default date filters initialised from PeriodContext; all filters apply immediately
- Budgets: `Set Budget` form and status panel use `period.month`/`period.year` from context; automatically updates when month changes in the topbar

**Frontend — Drill-down from Dashboard**
- Total Spend card → `/expenses?date_from=…&date_to=…&type=expense`
- Total Income card → `/expenses?date_from=…&date_to=…&type=income`
- Transactions card → `/expenses?date_from=…&date_to=…`
- Pie chart slice (click) → `/expenses?category_id=X&date_from=…&date_to=…`
- Budget vs Actual bar (click) → same category drill-down
- Recent Entries row (click) → category drill-down
- AI Insights card (click, if category_id present) → category drill-down
- "View all →" button in Recent Entries panel
- Expenses page reads URL `?category_id`, `?date_from`, `?date_to`, `?type` from query params to pre-populate filters on arrival from drill-down
- Budgets page rows are clickable → drill-down to category expenses

### Changed
- `App.jsx` — replaced flat layout with `<PeriodProvider>` + `<AppShell>` structure; splash screen retained on every load
- `Dashboard.jsx` — all inline hardcoded colours replaced with CSS variables; chart tooltips styled with `var(--bg-elevated)` and `var(--border)`
- `Expenses.jsx` — `allCategories` state replaces `categories` (needed for cross-type lookups in table rows); add-form categories filtered by selected entry type
- `Budgets.jsx` — now loads only expense categories in the set-budget form (income categories irrelevant for budgeting)

### Tests
- All 12 existing pytest tests pass (v1.3.0 changes are frontend-only)

---

## [1.1.0] — feature/v1.1.0 — 2026-03-27

### Added

**Backend**
- `Expense.type` field — `'expense'` (default) or `'income'` to support income tracking alongside expenses
- `Category.emoji` field — per-category emoji icon (e.g. 🍔 Food, 🚗 Transport) stored in DB and served via API
- `GET /api/v1/expenses/suggest-category?description=...` — AI auto-categorisation endpoint using rule-based keyword matching (no external API); returns suggested category + confidence level
- `services/categorize_service.py` — keyword matching engine with 7 category keyword lists (100+ trigger words)
- `type` filter on `GET /api/v1/expenses` — `?type=expense` or `?type=income` to separate records
- Startup ALTER TABLE migrations in `database.py` — adds new columns to existing DBs with `IF NOT EXISTS` (zero-downtime, safe to re-run)
- `MonthlySummary` schema extended with `total_income` and `net_balance` fields
- Income/expense split in `get_monthly_summary()` — expenses and income calculated separately; income excluded from category breakdown and trend charts

**Frontend**
- `src/data/quotes.js` — 30 curated finance/wealth quotes with `getRandomQuote()` helper
- `src/components/SplashScreen.jsx` — animated splash screen shown on every app load: 3-second countdown, progress bar, animated feature list, v1.1.0 badge, GitHub link, Skip button
- Dashboard: Quote of the Day panel at the top of every page load
- Dashboard: Income card (green), Net Balance card (green/red) added to metric row
- Dashboard: Recent Expenses table now shows `IN` badge for income entries; amounts coloured green for income
- Dashboard: Category badges now display emoji alongside name
- Expenses: Type toggle in Add form — `💸 Expense` / `💰 Income` selection
- Expenses: AI auto-suggest pill — appears below description as user types, pre-fills category with one click
- Expenses: Amount range filter (`Min Amount` / `Max Amount` fields) in filter bar
- Expenses: Type filter (`All / Expenses only / Income only`) in filter bar
- Expenses: Running totals (expenses vs income) shown above table
- Expenses: Category dropdowns now show emoji + name

### Changed
- `app/main.py` — API version bumped to `1.1.0`
- `health` endpoint returns `"version": "1.1.0"`
- Default categories seeded with emojis; existing rows back-filled on startup if emoji is still the placeholder `💰`
- `report_service.py` category breakdown and trend now filter `type = 'expense'` only

### Tests
- All 12 existing pytest tests pass unchanged (backward-compatible changes only)

---

## [1.0.0] — 2026-03-27

### Initial Release

**Backend**
- FastAPI application with 5 router groups: expenses, categories, budgets, reports, insights
- SQLModel table definitions for Category, Expense, Budget with FK relationships and indexes
- Service layer for all business logic (expense_service, budget_service, report_service, insights_service)
- 7 default categories seeded automatically on first startup
- 7 rule-based AI insight types: budget_overspend, burn_rate, mom_spike, top_category, unusual_expense, savings_opportunity, streak
- Pydantic v2 validation on all inputs (amount > 0, description not blank, hex color format)
- `/health` endpoint returning status and version

**Frontend**
- React 18 + Vite with 3 pages: Dashboard, Expenses, Budgets
- Dashboard with 6 widgets: total spend card, pie chart, line chart, budget vs actual bar chart, recent expenses table, AI insights panel
- Full CRUD UI on Expenses page with category and date range filters
- Budgets page with per-category progress bars

**Infrastructure**
- Docker Compose bringing up PostgreSQL 15, FastAPI backend, and React frontend in one command
- `.env` based secrets management (no hardcoded credentials)
- Named volume for PostgreSQL data persistence

**Tests**
- 12 pytest tests covering category CRUD, expense CRUD, validation errors, filters, 404 handling, and health check
- In-memory SQLite fixture (no Docker required to run tests)

### Bug Fixes (applied before v1.0.0 tag)

- **models.py** — Fixed `date: date` field name / type annotation clash causing Pydantic v2
  `PydanticUserError` at import time. Changed import to `from datetime import date as Date`.
- **docker-compose.yml** — Removed `environment:` block with shell-variable substitution from
  the `db` service; replaced with `env_file` only so PostgreSQL receives credentials correctly.
  Also hardcoded the healthcheck pg_isready command to avoid blank-variable substitution.
- **frontend/src/api/index.js** — `expensesApi` was defined in `expenses.js` but never
  re-exported from `index.js`, causing a silent crash (blank page) on the Dashboard.
  Added `export { expensesApi } from './expenses'`.

### Known Gaps (planned for v1.1.0)
- CSV export endpoint and UI not yet implemented (PRD: Should Have)
- Amount range filter available in backend API but not exposed in Expenses UI
- `docs/HLD.docx` and `docs/LLD.docx` not yet written
