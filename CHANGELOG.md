---
title: Changelog
date: 2026-03-28
tags:
  - expense-tracker
  - changelog
  - documentation
aliases:
  - Release Notes
  - Version History
status: active
related:
  - "[[README]]"
  - "[[docs/03_Architecture]]"
  - "[[docs/04_Tech_Stack]]"
---

# Changelog

> [!info] Format
> All notable changes to this project are documented here.
> Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
> This project uses [Semantic Versioning](https://semver.org/).

See also: [[README]] · [[docs/03_Architecture]] · [[docs/04_Tech_Stack]] · [[docs/05_HLD]] · [[docs/06_LLD]]

---

## [Unreleased]

---

## [2.3.0] — feature/v2.2.0 — 2026-03-28

### Added

**Settings Hub — Sidebar Consolidation**
- New `⚙️ Settings` page (`Settings.jsx`) consolidating four low-frequency config pages into a single tabbed hub, reducing sidebar clutter
- URL-driven internal tabs — state stored in `?tab=` query param so links are shareable and the browser back button works naturally:
  - `?tab=categories` — manage expense/income categories
  - `?tab=import` — upload bank statements (PDF / CSV)
  - `?tab=import-rules` — define auto-classification rules (Import Rules Engine with its own nested tabs remains fully functional)
  - `?tab=whats-new` — feature changelog kanban board
- Legacy routes (`/categories`, `/import`, `/import-rules`, `/features`) redirect automatically via React Router `<Navigate replace>` — no broken links from existing sessions or bookmarks
- `Navigate` imported from `react-router-dom` to handle legacy redirects

**Cross-platform Safety**
- Added `.gitattributes` to the repo root (`* text=auto eol=lf`) — enforces Unix LF line endings on checkout regardless of the developer's OS, preventing the classic `\r: command not found` error when running Docker containers on Windows

### Changed
- Sidebar trimmed from **11 items → 8 items**: Dashboard, Expenses, Budgets, Chat AI, Recurring, Alerts, Goals, ⚙️ Settings
- `App.jsx` — removed individual page imports for `Categories`, `Import`, `ImportRules`, `FeatureUpdates`; added `Settings` import; removed standalone routes for the four consolidated pages; version badge updated to `v2.3`

---

## [2.2.0] — feature/v2.2.0 — 2026-03-28

### Added

**PWA Offline Mode**
- `frontend/public/sw.js` — Service worker with two fetch strategies:
  - **App shell** (HTML, JS, CSS, fonts): cache-first with background revalidation — app loads instantly from cache, even without internet
  - **API calls** (`/api/…`): network-first with stale cache fallback — fresh data when online, last-known data served offline with a `503` JSON placeholder
  - Old versioned caches are purged automatically on SW activate
- `frontend/public/manifest.json` — Full PWA manifest: `display: standalone`, `theme_color: #5E5CE6`, shortcuts for "Add Expense" and "Dashboard", maskable SVG icon
- `frontend/public/icon.svg` — Purple rounded-square SVG app icon for home-screen install (works on Chrome, Safari, Edge)
- `frontend/index.html` — Links manifest + icon; registers `sw.js` via `navigator.serviceWorker.register` on `window load`

**Cursor-based Pagination (Expenses)**
- `schemas.py` — New `ExpensePage` response model: `{ items, next_cursor, has_more, total }`
- `expense_service.py` — `list_expenses_page()` using a `(date DESC, id DESC)` keyset cursor encoded in base64:
  - Cursor encodes the last seen `(date, id)` pair — stable even when new rows are inserted mid-session
  - Fetches `page_size + 1` rows to detect `has_more` without a second query
  - Separate `COUNT(*)` query returns the total matching rows for "X of Y" display
- `routers/expenses.py` — `GET /expenses` now returns `ExpensePage`; accepts `?page_size` (1–200, default 50) and `?cursor` for subsequent pages
- `Expenses.jsx` — "Load more" pagination UI:
  - `fetchExpenses()` resets to page 1; `loadMore()` appends to the existing list
  - **"Showing X of Y entries"** count shown below the table
  - **"⬇ Load more"** button appears while `has_more` is true; disappears on the last page
- `Dashboard.jsx` — Updated recent-expenses fetch to read `response.data.items` from the new paginated response shape

**3D Splash Screen & Financial Quote**
- `SplashScreen.jsx` — full rewrite to a minimal glass-morphism 3D card replacing the old feature-list splash:
  - `QUOTES` array of 6 curated financial quotes (Buffett, Munger, Graham, Lynch, Kiyosaki, Keynes) rotated randomly on each session
  - `cardFloat` CSS keyframe: subtle `rotateX` / `rotateY` with `perspective` on parent for a floating 3D feel
  - Three ambient radial-gradient orbs pulsing in the background
  - Gradient progress bar with glow; `SPLASH_DURATION = 7000 ms`; "Enter →" button (formerly "Skip")
- `frontend/src/data/quotes.js` — moved quote data to dedicated file

**Galaxy 3D Theme (Third Theme Option)**
- `App.jsx` — three-way theme cycle: `light → dark → galaxy → light`; `THEME_CYCLE`, `THEME_ICON`, `THEME_TITLE` maps; toggle button shows icon + label ("Light" / "Dark" / "3D")
- `GalaxyOrbs` component — three fixed `position: fixed` radial-gradient orbs (`z-index: 0`) animated with `@keyframes galaxyOrb1/2/3`; rendered only in galaxy mode
- `[data-theme="galaxy"]` CSS block in `index.css`:
  - `body` — deep-space multi-layer radial gradient with `background-attachment: fixed`
  - `.card` — `backdrop-filter: blur(18px)` glass-morphism with inner-glow border
  - `.topbar` — `rgba(12,10,34,0.6)` + `backdrop-filter: blur(24px)`
  - `.sidebar` — `rgba(7,5,22,0.88)` + `backdrop-filter: blur(20px)`
  - Inputs, buttons, period selector all glass-adapted
- **Bug fix** (`fix(galaxy)`): replaced `position: relative` overrides with `z-index`-only rules — the original `position: relative` silently cancelled the base `position: fixed` on `.sidebar`, making it scroll with the page; also removed the gap between sidebar and main content

**Feature Updates Page**
- New `FeatureUpdates.jsx` page (`/features` → now `/settings?tab=whats-new`) — kanban board with 5 colour-coded columns:
  - Core Tracking (indigo), Budgets & Goals (green), Analytics (amber), AI & Import (pink), Design & Tech (purple)
  - Each feature card has a name + plain-English one-liner description
  - Version history timeline at bottom: v1.5 → v2.3.0 with "Latest" badge

**Button System Standardisation**
- `index.css` — `.btn` base class added (`display: inline-flex; min-height: 36px; align-items: center; gap: 0.35rem`); previously used widely via `className="btn btn-primary"` but never defined
- `.btn-secondary` — `background: var(--bg-surface)` + `border: 1px solid var(--border-strong)` + shadow; hover shifts `border-color` and `color` to `var(--accent)`
- `.btn-danger` — replaced hardcoded `#fef2f2 / #dc2626` with `var(--color-red-bg) / var(--color-red)` so it adapts correctly in dark and galaxy modes
- `.btn-icon` — `min-width/height: 32px; display: inline-flex; align-items/justify-content: center` for uniform square icon buttons
- `Expenses.jsx` — removed inline padding overrides; delete button changed to `btn-icon btn-danger`
- `ImportRules.jsx` — row action buttons migrated from inline `style` to `btn btn-sm btn-secondary / btn-danger`

**Splash — Show Once Per Session**
- `App.jsx` — splash state initialised from `sessionStorage` (`et-splash-seen`) instead of `useState(true)`; `handleSplashDismiss` sets the key before hiding; splash no longer re-fires on URL-bar page navigation within the same session

### Changed
- `Dashboard.jsx` — Spend by Category chart now auto-switches: ≤ 6 categories → Pie chart; > 6 categories → Treemap (tile size proportional to spend, clickable drill-down)
- `useAutoRefresh.js` — Dashboard auto-refresh interval slowed from 30 s → 5 minutes
- `SplashScreen.jsx` — Auto-dismiss extended from 3 s → 7 s; version bumped to `v2.2.0`; redesigned as minimal 3D glass-morphism card (see Added above)
- `Chat.jsx` — Starter chips ==refined from 20 → 5 essential questions== (one per major app area: spending, budgets, goals, income vs expenses, uncategorised); follow-up context provided by backend `quickReplies`
- `ImportRules.jsx` — Priority field changed from free-text number input to a 3-option dropdown (1 — Highest, 5 — Normal, 10 — Low); Active toggle added to the create/edit form header

---

## [2.1.0] — feature/v2.0.0 — 2026-03-28

### Added

**Import Rules Engine (v2.1.0)**
- New `import_rules` DB table (SQLModel) — stores rule name, priority (1–100), condition logic (AND/OR), conditions JSON, actions JSON, match stats
- Rules are evaluated as **Pass 1** in the classification waterfall, before income sources and built-in keyword matching
- **Condition fields**: `description` (contains / not_contains / starts_with), `amount` (gt / lt / gte / lte / eq), `direction` (eq: credit | debit)
- **Action types**: `set_type`, `set_category`, `rename` (overrides description), `skip` (excludes row from import)
- AND / OR condition logic per rule — mix multiple conditions with a single toggle
- **Retroactive apply**: re-classify all existing Expense rows that match a rule (available at rule creation and via "Apply existing" button)
- **Quick rule / "Save as rule"** — one-click shortcut in the import preview table: click 💾 on any flagged or manually-edited row to instantly create a rule pre-filled with that keyword, type, and category
- `match_count` and `last_matched_at` tracked per rule for usage stats

**Import Rules API (`/api/v1/import-rules`)**
- `GET  /import-rules` — list all rules ordered by priority
- `POST /import-rules` — create rule (optional `apply_retroactive` flag)
- `PUT  /import-rules/{id}` — update rule (name, priority, active, conditions, actions)
- `DELETE /import-rules/{id}` — delete rule
- `POST /import-rules/{id}/retroactive` — re-classify existing transactions; returns `{updated_count, rule_id, rule_name}`
- `POST /import-rules/quick` — one-click rule creation from import preview table

**Import Rules UI (`/import-rules`)**
- New `🏷️ Import Rules` page in the sidebar (under Import)
- Rules list with colour-coded pills: yellow `IF`, purple `AND`/`OR` badge, green `THEN`
- Full rule builder: add/edit form with condition rows (field / operator / value), action rows, AND/OR logic toggle, retroactive apply checkbox
- Enable/disable toggle per rule, inline "🔄 Apply existing" retroactive button, Edit/Delete

**Import preview table — Source column (v2.1.0)**
- New **Source** column in the Review step: shows how each row was classified — 🏷 Rule name (indigo), 📥 Source (green), 🤖 Built-in (grey), 🔍 Heuristic (amber), ⚠️ Review (red)
- 💾 **Save as rule** button appears on any flagged row or row manually edited by the user — opens a pre-filled quick-rule modal with keyword extracted from description, inheriting the current type and category selection
- "✓ Rule saved" confirmation replaces the button after a rule is successfully created

### Changed
- `import_service.py` updated: Pass 1 now runs all active `ImportRule`s (ordered by priority) before the built-in keyword engine
- Each `ImportTransaction` carries `match_source`, `matched_rule_id`, `matched_rule_name` tracing fields
- Version bumped to `2.1.0` in FastAPI app, sidebar badge, and splash screen

---

## [2.0.0] — feature/v2.0.0 — 2026-03-28

### Added

**Bank Statement Import — PDF & CSV (v2.0.0)**
- New `📥 Import` page with 3-step flow: Upload → Review → Done
- Drag-and-drop or click-to-browse file upload (PDF and CSV, max 20 MB)
- Canara Bank PDF parser: full 8-column pdfplumber table extraction, cross-page row continuation, B/F skip, date normalisation
- Generic CSV parser: auto-detects column headers (Date, Description, Debit, Credit, Amount, Dr/Cr) across common bank layouts
- Smart categoriser engine (2-pass: rule engine + income-source DB lookup):
  - UPI/DR → Expense; UPI/CR → Income (UPI received)
  - SWEEP IN → Investment; SWEEP OUT → Income (FD maturity)
  - NEFT/IMPS: direction from debit/credit column; flagged if unclassified large deposit
  - SALARY/PAYROLL → Income (salary); REFUND → Income (refund)
  - 50+ merchant keyword rules: Zomato/Swiggy → Food; Amazon/Flipkart → Shopping; Ola/Uber → Transport; etc.
- Duplicate detection: rows already in the DB (matching date + amount + description prefix) are pre-marked and pre-skipped
- Flagging: large unclassified deposits (≥ ₹10,000) shown with ⚠️ and reason for user review
- Preview table: per-row type selector, category dropdown (filtered by income/expense), skip checkbox, confidence indicator dot
- Confirm import: bulk-creates Expense rows; investments and transfers are skipped gracefully
- Import session store: in-memory, 30-minute TTL — safe for single-instance Docker deploy

**Income Sources (v2.0.0)**
- New `income_sources` DB table (SQLModel, v2.0.0)
- Income Sources panel below the import form — define recurring senders (tenants, employer, clients)
- Fields: display name, type (salary/rent/business/interest/other), sender keyword, expected amount, expected day
- Keyword matched (case-insensitive) against bank description during import — overrides rule engine with 'high' confidence
- Full CRUD: list, create, update, delete via `/api/v1/income-sources`

**New Default Categories (v2.0.0)**
- Business Income 🏢, Interest Income 🏦, Refund ↩️ (income)
- Bank Charges 🏧, Fuel ⛽, Insurance 🛡️, Education 📚, Utilities 💡, Cash Withdrawal 💵, Investments 📈 (expense)

**Backend**
- New service: `categorizer_service.py` — rule engine, keyword tables, income-source lookup, resolve_category_id helper
- New service: `import_service.py` — parse_and_preview(), confirm_import(), session store, Canara Bank PDF parser, generic CSV parser
- New router: `imports.py` — POST /import/upload, POST /import/confirm, GET/POST/PUT/DELETE /income-sources
- New model: `IncomeSource` → `income_sources` table
- New schemas: `ImportTransaction`, `ImportPreviewResponse`, `ImportRowUpdate`, `ImportConfirmRequest`, `ImportConfirmResponse`, `IncomeSourceCreate/Update/Read`
- Added to `requirements.txt`: `pdfplumber==0.11.0`, `python-multipart==0.0.9`
- API version bumped to `2.0.0`

**Frontend**
- New page: `Import.jsx` — three-step wizard (Upload / Review / Done)
- `App.jsx` — Import route added (`/import`), sidebar nav item (📥 Import), sidebar version badge updated to `v2.0`
- `SplashScreen.jsx` — version badge updated to `v2.0.0`; 2 new v2.0 features added to feature list

### Changed
- `main.py` — 10 new default categories seeded; `IncomeSource` model imported so SQLModel creates `income_sources` table on startup

---

## [1.9.0] — feature/v1.8.0 — 2026-03-28

### Added

**Rich Emoji Category Picker (v1.9.0)**
- New shared `<EmojiPicker>` component in `Categories.jsx` replacing the old flat 30-emoji grid
- 120+ emojis organised into 11 theme tabs: All, Food, Transport, Home, Shopping, Health, Entertainment, Work, Finance, Nature, Family, Misc
- Horizontally scrollable tab row — no wrapping, keyboard accessible
- Vertically scrollable emoji grid with `max-height: 148px` — shows all emojis without modal overflow
- Hover highlight on each emoji button; selected emoji gets accent border + background
- Manual input field retained for typing/pasting any emoji not in the presets
- Both Add Category and Edit Category modals use the same `<EmojiPicker>` component

**Version Display Fix (v1.9.0)**
- `SplashScreen.jsx` — version badge updated to `v1.9.0`; 3 new v1.8–v1.9 features added to feature list
- `App.jsx` — sidebar logo version badge updated to `v1.9`
- `backend/app/main.py` — API version bumped to `1.9.0`

### Changed
- `Categories.jsx` — `EMOJI_PRESETS` flat array replaced with `EMOJI_CATEGORIES` structured data; `EmojiPicker` component added at top of file

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
