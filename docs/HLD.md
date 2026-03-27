# High-Level Design (HLD) — Expense Tracker v1.0.0

> **Author:** Sayu-V | Yenepoya University  
> **Date:** 2026-03-27  
> **Version:** 1.0.0

---

## 1. System Architecture Overview

The Expense Tracker follows a classic **three-tier architecture** with clear separation between presentation, application logic, and data storage. All tiers are containerised and deployed via Docker Compose.

```
┌──────────────────────────────────────────────────────────────────┐
│                        User's Browser                            │
│                    http://localhost:5173                          │
└─────────────────────────┬────────────────────────────────────────┘
                          │  HTTP (proxied /api → backend)
┌─────────────────────────▼────────────────────────────────────────┐
│                  PRESENTATION TIER                               │
│               React 18 + Vite (Port 5173)                        │
│  ┌────────────┐  ┌────────────┐  ┌─────────────┐                │
│  │ Dashboard  │  │  Expenses  │  │   Budgets   │                │
│  └────────────┘  └────────────┘  └─────────────┘                │
└─────────────────────────┬────────────────────────────────────────┘
                          │  REST API  (/api/v1/*)
┌─────────────────────────▼────────────────────────────────────────┐
│                   APPLICATION TIER                               │
│               FastAPI + SQLModel (Port 8000)                     │
│  ┌──────────┐  ┌───────────┐  ┌─────────┐  ┌────────┐           │
│  │ Expenses │  │Categories │  │ Budgets │  │Reports │           │
│  │ Router   │  │  Router   │  │ Router  │  │ Router │           │
│  └────┬─────┘  └─────┬─────┘  └────┬────┘  └───┬────┘           │
│       │              │             │            │               │
│  ┌────▼──────────────▼─────────────▼────────────▼────┐          │
│  │              Service Layer                        │          │
│  │  expense_svc  budget_svc  report_svc  insight_svc │          │
│  └──────────────────────┬────────────────────────────┘          │
└─────────────────────────┼────────────────────────────────────────┘
                          │  SQLModel ORM
┌─────────────────────────▼────────────────────────────────────────┐
│                      DATA TIER                                   │
│               PostgreSQL 15 (Port 5432)                          │
│   ┌────────────┐   ┌────────────┐   ┌──────────────┐            │
│   │ categories │   │  expenses  │   │   budgets    │            │
│   └────────────┘   └────────────┘   └──────────────┘            │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Design

### 2.1 Frontend Components

| Component | Route | Data Sources | Widgets |
|-----------|-------|-------------|---------|
| `Dashboard.jsx` | `/` | reports, budgets, expenses, insights APIs | 9 widgets (cards, charts, table, insights panel) |
| `Expenses.jsx` | `/expenses` | expenses, categories APIs | CRUD table + filter bar |
| `Budgets.jsx` | `/budgets` | budgets, categories APIs | Progress bar list + set form |
| `App.jsx` | All | — | Layout, sidebar nav, router |

**API Module Layer:**
```
src/api/
  client.js      ← Shared Axios instance, base URL /api/v1, error interceptor
  expenses.js    ← list, getById, create, update, delete
  index.js       ← Re-exports all API modules (categories, budgets, reports, insights)
```

---

### 2.2 Backend Components

**Router Layer** (HTTP boundary — no business logic):

| Router | Prefix | Methods |
|--------|--------|---------|
| `expenses.py` | `/api/v1/expenses` | POST, GET, GET/{id}, PUT/{id}, DELETE/{id} |
| `categories.py` | `/api/v1/categories` | GET, POST, DELETE/{id} |
| `budgets.py` | `/api/v1/budgets` | POST, GET, GET/status |
| `reports.py` | `/api/v1/reports` | GET/monthly-summary, GET/by-category, GET/trend, GET/top-expenses |
| `insights.py` | `/api/v1/insights` | GET |

**Service Layer** (all business logic):

| Service | Responsibilities |
|---------|-----------------|
| `expense_service.py` | CRUD operations, filter queries (category, date, amount range) |
| `budget_service.py` | Upsert budgets, compute actual vs budget status per category |
| `report_service.py` | Aggregate queries: monthly totals, category breakdown, trend, top-N |
| `insights_service.py` | 7 rule-based insight generators, pure computation over DB results |

---

### 2.3 Database Schema (High Level)

```
Category ─┐
          ├── (1:N) ──► Expense
          └── (1:N) ──► Budget
```

Three normalised tables. All foreign keys indexed. Timestamps auto-generated server-side.

---

## 3. Key Design Decisions

### 3.1 Service Layer Separation
All DB queries live exclusively in `services/`. Routers only handle HTTP concerns (status codes, schema validation, dependency injection). This makes services independently testable and the codebase maintainable.

### 3.2 SQLModel as Single Source of Truth
Using SQLModel means the DB schema (`models.py`) and API validation (`schemas.py`) share the same Pydantic foundation but remain separate — DB models are not directly serialised in API responses. This prevents accidental data leakage and allows the API contract to evolve independently.

### 3.3 Rule-Based Insights (No External APIs)
All 7 insight rules are computed in-process on every `/insights` call. No ML model, no LLM API call, no background job. This keeps the system fully self-contained, reproducible, and appropriate for local/offline deployment.

### 3.4 Vite Proxy for CORS Elimination
The frontend never makes cross-origin requests. All `/api/*` calls are proxied by Vite's dev server to `http://backend:8000`. The backend still sets `ALLOWED_ORIGINS` via CORS middleware as a defence-in-depth measure.

### 3.5 Docker-First Development
The project is designed to run exclusively in Docker Compose — no local Python or Node installation required. The only developer tooling outside Docker is `pytest` (runnable directly with an in-memory SQLite DB for speed).

---

## 4. Data Seeding

On application startup (`main.py` lifespan event), the backend checks for the existence of default categories and inserts them if absent:

```
Food · Transport · Housing · Health · Entertainment · Shopping · Other
```

This ensures the application is usable immediately after `docker compose up --build` with no manual setup.

---

## 5. Error Handling Strategy

| Layer | Approach |
|-------|----------|
| Pydantic validation | Returns HTTP 422 with field-level error messages automatically |
| Not found (404) | Services raise `HTTPException(404)` when a record doesn't exist |
| Duplicate category | Router catches DB integrity error, returns HTTP 409 |
| API errors (frontend) | Axios interceptor logs all errors to console; UI shows empty/fallback state |

---

## 6. Non-Functional Characteristics

| Quality | Design Choice |
|---------|--------------|
| Performance | DB indexes on `date` and `category_id`; service layer avoids N+1 queries |
| Portability | Docker Compose; single-command startup on any OS with Docker Desktop |
| Maintainability | Strict router/service/model separation; no logic in models or routes |
| Testability | In-memory SQLite fixture; dependency injection allows session override |
| Security | Secrets in `.env` (gitignored); CORS whitelist; no auth needed for v1 |
