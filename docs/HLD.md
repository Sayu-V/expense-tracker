---
title: High-Level Design
date: 2026-03-29
tags:
  - expense-tracker
  - HLD
  - system-design
  - documentation
aliases:
  - HLD
  - High Level Design
version: 2.3.0
status: active
related:
  - "[[Architecture]]"
  - "[[LLD]]"
  - "[[Tech_Stack]]"
  - "[[README]]"
---

# High-Level Design (HLD) — Expense Tracker v2.3.0

> **Author:** Sayu-V | Yenepoya University
> **Updated:** 2026-03-29

See also: [[Architecture]] · [[LLD]] · [[Tech_Stack]] · [[README]]

---

## 1. System Architecture Overview

The Expense Tracker follows a classic **three-tier architecture** with clear separation between presentation, application logic, and data storage. All tiers are containerised and deployed via Docker Compose.

> [!info] Detailed architecture
> See [[Architecture]] for the full request-flow diagram, import pipeline, and PWA architecture.

```
┌──────────────────────────────────────────────────────────────────┐
│                        User's Browser                            │
│                    http://localhost:5173                          │
│                + Service Worker (PWA offline cache)              │
└─────────────────────────┬────────────────────────────────────────┘
                          │  HTTP (proxied /api → backend)
┌─────────────────────────▼────────────────────────────────────────┐
│                  PRESENTATION TIER                               │
│               React 18 + Vite (Port 5173)                        │
│                                                                  │
│  Dashboard · Expenses · Budgets · Chat AI · Recurring            │
│  Alerts · Goals · Settings (Categories/Import/Rules/What's New)  │
└─────────────────────────┬────────────────────────────────────────┘
                          │  REST API  (/api/v1/*)
┌─────────────────────────▼────────────────────────────────────────┐
│                   APPLICATION TIER                               │
│               FastAPI + SQLModel (Port 8000)                     │
│                                                                  │
│   Routers (11): expenses · categories · budgets · reports ·      │
│     insights · chat · recurring · alerts · goals ·               │
│     imports · import_rules                                       │
│                         │                                        │
│   Services (8): expense · budget · report · insights · chat ·    │
│     categorizer · import · import_rules                          │
└─────────────────────────┬────────────────────────────────────────┘
                          │  SQLModel ORM
┌─────────────────────────▼────────────────────────────────────────┐
│                      DATA TIER                                   │
│               PostgreSQL 15 (Port 5432)                          │
│                                                                  │
│  categories · expenses · budgets · recurring_expenses            │
│  spending_alerts · goals · income_sources · import_rules         │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Frontend Components

| Component | Route | Key Features |
|-----------|-------|--------------|
| `Dashboard.jsx` | `/` | Spend cards, pie/treemap chart, trend line, YoY bar chart, prediction card, budget vs actual, recent expenses, AI insights (10 rules) |
| `Expenses.jsx` | `/expenses` | Full CRUD, filter bar, cursor pagination ("Load more"), bulk-delete, CSV export |
| `Budgets.jsx` | `/budgets` | Progress bars, set/edit/delete budgets, period-aware, drill-down |
| `Chat.jsx` | `/chat` | NLP chat, inline Recharts, 5 starter chips, quick-reply suggestions |
| `RecurringExpenses.jsx` | `/recurring` | Template CRUD, frequency badge, overdue warning, Generate All Due |
| `Alerts.jsx` | `/alerts` | Severity-coded cards, unread badge, Check Now trigger |
| `Goals.jsx` | `/goals` | SVG progress ring, projected completion, Add Savings modal |
| `Settings.jsx` | `/settings` | URL-driven tabbed hub — see §2.2 |

**Settings Hub (v2.3.0):**

| Tab | `?tab=` param | Content |
|-----|--------------|---------|
| Categories | `categories` | Category CRUD with emoji picker |
| Import | `import` | 3-step bank statement import wizard |
| Import Rules | `import-rules` | Full Import Rules engine (nested tabs: My Rules / How It Works / Live Preview) |
| What's New | `whats-new` | Feature Updates kanban board + version timeline |

> [!note] Legacy redirect handling
> Old direct routes (`/categories`, `/import`, `/import-rules`, `/features`) automatically redirect to the corresponding `?tab=` URL via React Router `<Navigate replace>`. No bookmarks are broken.

**API Module Layer:**

```
src/api/
  client.js         ← Shared Axios instance, base URL /api/v1, error interceptor
  expenses.js       ← list (cursor-paginated), create, update, delete, bulk-delete
  categories.js     ← list, create, update, delete
  budgets.js        ← list, status, create, update, delete
  reports.js        ← monthlySummary, byCategory, trend, topExpenses, yearOverYear, prediction
  insights.js       ← get
  chat.js           ← send
  recurring.js      ← list, create, update, delete, generate, generateAll
  alerts.js         ← list, generate, markRead, markAllRead, dismiss
  goals.js          ← list, create, update, delete
  import.js         ← upload, confirm
  incomeSources.js  ← list, create, update, delete
  importRules.js    ← list, create, update, delete, retroactive, quick
  index.js          ← Re-exports all modules
```

---

### 2.2 Backend Components

**Router Layer** (HTTP boundary — no business logic):

| Router | Prefix | Key Endpoints |
|--------|--------|---------------|
| `expenses.py` | `/api/v1/expenses` | CRUD + bulk-delete + cursor pagination |
| `categories.py` | `/api/v1/categories` | CRUD |
| `budgets.py` | `/api/v1/budgets` | CRUD + status |
| `reports.py` | `/api/v1/reports` | monthly-summary, by-category, trend, year-over-year, prediction |
| `insights.py` | `/api/v1/insights` | 10-rule insight generation |
| `chat.py` | `/api/v1/chat` | NLP query |
| `recurring.py` | `/api/v1/recurring-expenses` | CRUD + generate + generate-all |
| `alerts.py` | `/api/v1/alerts` | CRUD + generate + read |
| `goals.py` | `/api/v1/goals` | CRUD |
| `imports.py` | `/api/v1/import` + `/api/v1/income-sources` | upload, confirm, income source CRUD |
| `import_rules.py` | `/api/v1/import-rules` | CRUD + retroactive + quick |

**Service Layer** (all business logic):

| Service | Key Responsibilities |
|---------|----------------------|
| `expense_service.py` | CRUD, filter queries, cursor-based pagination (`ExpensePage`) |
| `budget_service.py` | Upsert budgets, compute actual vs budget per category |
| `report_service.py` | Aggregate queries: totals, breakdown, trend, YoY, prediction |
| `insights_service.py` | 10 deterministic insight rules |
| `chat_service.py` | Keyword NLP, period detection, intent routing, quickReply generation |
| `categorizer_service.py` | 50+ keyword rules, UPI/NEFT direction detection, resolve_category_id |
| `import_service.py` | PDF/CSV parsing, 3-pass classification waterfall, session store (30-min TTL) |
| `import_rules_service.py` | Rule evaluation engine (AND/OR logic), retroactive apply |

---

### 2.3 Database Schema (High Level)

```
Category ─┬─(1:N)──► Expense
          ├─(1:N)──► Budget
          ├─(1:N)──► RecurringExpense
          └─(1:N)──► SpendingAlert

Goal            (independent)
IncomeSource    (independent — matched during import)
ImportRule      (independent — evaluated during import)
```

Eight normalised tables. All foreign keys indexed. Timestamps auto-generated server-side. The backend runs `ALTER TABLE … IF NOT EXISTS` on startup for safe zero-downtime column additions.

---

## 3. Key Design Decisions

### 3.1 Service Layer Separation
All DB queries live exclusively in `services/`. Routers only handle HTTP concerns (status codes, schema validation, dependency injection). Services are independently testable and the codebase stays maintainable as new features are added.

### 3.2 SQLModel as Single Source of Truth
DB models (`models.py`) and API schemas (`schemas.py`) share the same Pydantic v2 foundation but remain separate. DB models are never directly serialised in API responses — this prevents accidental data leakage and allows the API contract to evolve independently.

### 3.3 Rule-Based Insights (No External APIs)
All 10 insight rules are computed in-process on every `/insights` call. No ML model, no LLM API, no background job. The system is fully self-contained, reproducible, and appropriate for local/offline deployment.

### 3.4 Vite Proxy for CORS Elimination
The frontend never makes cross-origin requests. All `/api/*` calls are proxied by Vite's dev server to `http://backend:8000`. The backend still sets `ALLOWED_ORIGINS` via CORS middleware as a defence-in-depth measure.

### 3.5 Docker-First Development
Designed to run exclusively in Docker Compose — no local Python or Node installation required. `pytest` can run against an in-memory SQLite DB without Docker for speed.

### 3.6 Settings Hub Consolidation (v2.3.0)
Low-frequency config pages (Categories, Import, Import Rules, What's New) are consolidated into a single `⚙️ Settings` sidebar entry with URL-driven tabs. This reduces sidebar cognitive load from 11 items to 8 without removing any functionality.

### 3.7 Cursor-Based Pagination (v2.2.0)
Expenses use keyset pagination with a `(date DESC, id DESC)` composite cursor encoded in base64. This is stable under concurrent inserts (unlike offset pagination) and avoids a full-table scan for page offsets.

### 3.8 Import Classification Waterfall (v2.0.0–v2.1.0)
The 3-pass classification system (Import Rules → Income Sources → Built-in keywords) allows users to progressively override the default categorisation engine without modifying code. Pass 1 runs user-defined rules; Pass 3 is the built-in fallback.

---

## 4. Data Seeding

On startup (`main.py` lifespan), the backend checks for default categories and inserts them if absent. As of v2.0.0, this includes ==26 categories==:

**Income:** Salary, Business Income, Rental Income, Investment Return, Interest Income, Refund
**Expense:** Food, Transport, Housing, Health, Entertainment, Shopping, Education, Utilities, Fuel, Insurance, Bank Charges, Cash Withdrawal, Investments, Other

This ensures the application is fully usable immediately after `docker compose up --build`.

---

## 5. Error Handling Strategy

| Layer | Approach |
|-------|----------|
| Pydantic validation | HTTP 422 with field-level error messages (automatic) |
| Not found | Services raise `HTTPException(404)` |
| Duplicate category | Router catches DB integrity error → HTTP 409 |
| Import session expired | 30-min TTL; 404 returned if session not found at confirm step |
| API errors (frontend) | Axios interceptor logs errors; UI shows empty / fallback state |
| Offline (PWA) | Service Worker serves stale cache; API returns `503` JSON placeholder |

---

## 6. Non-Functional Characteristics

| Quality | Design Choice |
|---------|---------------|
| **Performance** | DB indexes on `date`, `category_id`; keyset cursor pagination; service layer avoids N+1 queries |
| **Offline** | Service Worker — cache-first app shell, network-first API with stale fallback |
| **Portability** | Docker Compose; single-command startup; `.gitattributes` for Windows LF safety |
| **Maintainability** | Strict router/service/model separation; CSS design-token system for all three themes |
| **Testability** | In-memory SQLite fixture; dependency injection for session override |
| **Security** | Secrets in `.env` (gitignored); CORS whitelist; no auth for local deployment |
| **Extensibility** | Import Rules engine allows user-defined classification without code changes |
