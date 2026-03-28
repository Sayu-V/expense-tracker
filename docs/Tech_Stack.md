---
title: Tech Stack
date: 2026-03-29
tags:
  - expense-tracker
  - tech-stack
  - documentation
  - architecture
aliases:
  - Technology Stack
  - Dependencies
version: 2.3.0
status: active
related:
  - "[[Architecture]]"
  - "[[HLD]]"
  - "[[LLD]]"
  - "[[README]]"
---

# Tech Stack — Expense Tracker v2.3.0

> **Author:** Sayu-V | Yenepoya University
> **Updated:** 2026-03-29

See also: [[Architecture]] · [[HLD]] · [[LLD]] · [[README]]

> [!info] Version note
> This document reflects the full v2.3.0 stack. For earlier versions see [[CHANGELOG]].

---

## Backend

### FastAPI 0.111.0
- **Role:** REST API framework
- **Why:** Async-ready, built-in Swagger UI at `/docs`, automatic request validation via Pydantic, minimal boilerplate
- **Key usage:** 11 router groups (expenses, categories, budgets, reports, insights, chat, recurring, alerts, goals, imports, import-rules); dependency injection for DB sessions; lifespan hooks for startup seeding

### SQLModel 0.0.18
- **Role:** ORM + data validation
- **Why:** Combines SQLAlchemy (DB engine/queries) and Pydantic v2 (validation) in one class definition — no duplication between DB schema and API validation
- **Key usage:** 8 table models — `Category`, `Expense`, `Budget`, `RecurringExpense`, `SpendingAlert`, `Goal`, `IncomeSource`, `ImportRule`

### PostgreSQL 15 (via Docker)
- **Role:** Primary database
- **Why:** Production-grade relational DB, full ACID compliance, excellent support for date-range queries and keyset pagination
- **Key usage:** Stores all app data; named volume for persistence; `(date DESC, id DESC)` composite index for cursor pagination

### Pydantic v2 (2.7.1)
- **Role:** Request/response schema enforcement
- **Why:** Built into FastAPI; v2 significantly faster than v1; `field_validator` decorators for clean custom validation
- **Key usage:** `schemas.py` — 30+ schemas including `ExpensePage` (cursor pagination), `ImportTransaction`, `YoYPoint`, `SpendPrediction`, `ImportRule*`

### Uvicorn 0.29.0
- **Role:** ASGI server
- **Why:** Production-grade async server for FastAPI; `--reload` flag for hot-reload in development
- **Key usage:** Docker `command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### pdfplumber 0.11.0
- **Role:** PDF table extraction
- **Why:** Most reliable Python library for extracting structured table data from bank statement PDFs; handles multi-page row continuation
- **Key usage:** `import_service.py` Canara Bank PDF parser — 8-column extraction, B/F skip, cross-page row stitching, date normalisation

### python-multipart 0.0.9
- **Role:** Multipart file upload support
- **Why:** Required by FastAPI for `UploadFile` / `Form` endpoints
- **Key usage:** `POST /api/v1/import/upload` — receives PDF or CSV file up to 20 MB

### python-dateutil 2.9.0
- **Role:** Date arithmetic
- **Why:** `relativedelta` handles correct month-end date arithmetic that Python's `timedelta` cannot
- **Key usage:** `recurring_service.py` — advance `next_date` by month without overshooting month-end

### pydantic-settings / python-dotenv
- **Role:** Environment configuration
- **Why:** Validates env vars at startup with type coercion; keeps secrets out of source code
- **Key usage:** `config.py` — `Settings` class reads `DATABASE_URL`, `ALLOWED_ORIGINS` from `.env`

---

## Frontend

### React 18.3.1
- **Role:** UI library
- **Why:** Hooks-based state management, concurrent features, large ecosystem
- **Key usage:** 12 page components + 3 shared components; custom hooks (`useAutoRefresh`, `useChartTheme`)

### Vite 5.2.13
- **Role:** Dev server + build tool
- **Why:** Native ES modules — no bundling in dev mode, instant HMR; `/api` proxy eliminates CORS issues in Docker
- **Key usage:** `vite.config.js` — proxy `/api` → `http://backend:8000`; `host: true` for Docker network access

### React Router DOM 6.23.1
- **Role:** Client-side routing
- **Why:** v6 declarative `<Routes>` API, `NavLink` active-state styling, `useSearchParams` for URL-driven tab state, `Navigate` for legacy redirects
- **Key usage:** 8 main routes + 4 legacy redirect routes; `?tab=` query param drives Settings hub tab selection

### Recharts 2.12.7
- **Role:** Data visualisation
- **Why:** Pure React, responsive containers, composable chart primitives
- **Key usage:** `PieChart` / `Treemap` (category breakdown, auto-switches at 6 categories), `LineChart` (trend), `BarChart` (budget vs actual, YoY comparison), inline charts in Chat bubbles

### Axios 1.7.2
- **Role:** HTTP client
- **Why:** Interceptors for global error logging, clean async/await, request cancellation
- **Key usage:** `api/client.js` — shared instance with base URL `/api/v1`; per-domain modules (`expensesApi`, `budgetsApi`, `importRulesApi`, etc.)

### Service Worker (native browser API)
- **Role:** PWA offline support
- **Why:** No external dependency; native browser standard; two-strategy caching adequate for this app
- **Key usage:** `sw.js` — cache-first for app shell (HTML/JS/CSS), network-first with stale fallback for `/api/*` calls

---

## Design System

### CSS Custom Properties (native)
- **Role:** Design token system
- **Why:** Zero runtime overhead; native cascade; `data-theme` attribute switch handles all three themes
- **Key usage:** `index.css` — `--accent`, `--bg-base`, `--bg-surface`, `--border`, `--text-primary` + dark and galaxy overrides in `[data-theme="dark"]` / `[data-theme="galaxy"]` blocks

### backdrop-filter (native CSS)
- **Role:** Glass-morphism effect in Galaxy theme
- **Why:** GPU-accelerated, zero JS, single CSS property
- **Key usage:** `.card`, `.topbar`, `.sidebar` in `[data-theme="galaxy"]` — `backdrop-filter: blur(18–24px)` over animated radial-gradient orbs

---

## Infrastructure

### Docker 24+ / Docker Compose v2
- **Role:** Containerisation and orchestration
- **Why:** Reproducible environment, single-command startup, cross-platform (Mac + Windows WSL2)
- **Key usage:** 3 services with health checks and dependency ordering — `db` → `backend` → `frontend`

### .gitattributes (LF enforcement)
- **Role:** Cross-platform line-ending safety
- **Why:** Windows Git (`core.autocrlf=true`) converts LF→CRLF; Docker Linux containers reject CRLF in shell scripts with `\r: command not found`
- **Key usage:** `* text=auto eol=lf` — enforces Unix LF on all files regardless of developer OS

| Image | Base | Layer |
|---|---|---|
| `postgres:15-alpine` | Alpine | Database |
| `python:3.11-slim` | Debian slim | Backend |
| `node:18-alpine` | Alpine | Frontend |

---

## Testing

### pytest 8.2.0 + pytest-asyncio 0.23.6
- **Role:** Test runner + async support
- **Key usage:** 12+ tests in `tests/test_expenses.py` — category CRUD, expense CRUD, filters, 404 handling, validation errors, health check

### httpx 0.27.0
- **Role:** Test HTTP client
- **Key usage:** `TestClient` wraps FastAPI app — real HTTP calls without a running server

### SQLite (in-memory, `StaticPool`)
- **Role:** Test database isolation
- **Why:** No Docker required to run tests; each test gets a fresh schema via `create_all`
- **Key usage:** `session_fixture` in conftest — swaps PostgreSQL engine for SQLite during testing

---

## Version Summary

| Package | Version | Layer |
|---|---|---|
| fastapi | 0.111.0 | Backend |
| sqlmodel | 0.0.18 | Backend |
| pydantic | 2.7.1 | Backend |
| uvicorn | 0.29.0 | Backend |
| pdfplumber | 0.11.0 | Backend |
| python-multipart | 0.0.9 | Backend |
| python-dateutil | 2.9.0 | Backend |
| pydantic-settings | 2.2.1 | Backend |
| python-dotenv | 1.0.1 | Backend |
| httpx | 0.27.0 | Backend / Testing |
| pytest | 8.2.0 | Testing |
| pytest-asyncio | 0.23.6 | Testing |
| react | 18.3.1 | Frontend |
| react-dom | 18.3.1 | Frontend |
| react-router-dom | 6.23.1 | Frontend |
| axios | 1.7.2 | Frontend |
| recharts | 2.12.7 | Frontend |
| date-fns | 3.6.0 | Frontend |
| vite | 5.2.13 | Frontend |
| @vitejs/plugin-react | 4.3.1 | Frontend |
| PostgreSQL | 15 (Alpine) | Database |
| Python | 3.11 (slim) | Runtime |
| Node.js | 18 (Alpine) | Runtime |
