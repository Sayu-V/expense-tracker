# Architecture — Expense Tracker v1.0.0

> **Author:** Sayu-V | Yenepoya University  
> **Date:** 2026-03-27  
> **Version:** 1.0.0

---

## 1. System Overview

The Expense Tracker is a three-tier, containerised full-stack web application. All three tiers run inside Docker containers orchestrated by Docker Compose and communicate over a shared Docker network.

```
┌─────────────────────────────────────────────────────────┐
│                    Docker Compose Network                │
│                                                          │
│  ┌──────────────┐    ┌──────────────┐   ┌────────────┐  │
│  │   Frontend   │───▶│   Backend    │──▶│  Database  │  │
│  │ React + Vite │    │   FastAPI    │   │ PostgreSQL │  │
│  │  Port 5173   │    │  Port 8000   │   │  Port 5432 │  │
│  └──────────────┘    └──────────────┘   └────────────┘  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Layer Architecture

### 2.1 Frontend (Presentation Layer)

| Component | Technology | Role |
|-----------|------------|------|
| Build Tool | Vite 5 | Dev server + production bundler |
| UI Library | React 18 | Component-based rendering |
| Router | React Router v6 | Client-side navigation |
| Charts | Recharts | Data visualisation widgets |
| HTTP Client | Axios | REST API communication |

**Pages:**
- `Dashboard` — 6 data widgets (spend card, pie chart, line chart, bar chart, table, insights)
- `Expenses` — full CRUD with category + date range filters
- `Budgets` — per-category progress bars against monthly limits

All API calls are proxied through Vite's dev server (`/api` → `http://backend:8000`) so the browser never makes cross-origin requests.

---

### 2.2 Backend (Application Layer)

Structured with strict separation of concerns across four sub-layers:

```
Routers (HTTP)  →  Services (Business Logic)  →  Models (ORM)  →  DB
```

| Sub-layer | Files | Responsibility |
|-----------|-------|---------------|
| **Routers** | `expenses.py`, `categories.py`, `budgets.py`, `reports.py`, `insights.py` | HTTP request/response, status codes, schema validation |
| **Services** | `expense_service.py`, `budget_service.py`, `report_service.py`, `insights_service.py` | All business logic, DB queries, calculations |
| **Models** | `models.py` | SQLModel table definitions (DB schema + ORM) |
| **Schemas** | `schemas.py` | Pydantic v2 request/response shapes with validators |
| **Config** | `config.py`, `database.py` | Settings from `.env`, engine/session factory |

**No DB logic lives in routers** — all queries are delegated to services.

---

### 2.3 Database Layer

PostgreSQL 15 with three tables:

```
categories          expenses                 budgets
──────────          ────────                 ───────
id (PK)             id (PK)                  id (PK)
name (unique)       amount (>0)              amount (>0)
color               description (max 200)    month (1–12)
is_default          notes (max 500)          year (>=2020)
created_at          date (indexed)           category_id (FK)
                    created_at               created_at
                    updated_at
                    category_id (FK, indexed)
```

**Data persists** via a named Docker volume (`postgres_data`) — survives container restarts.

---

## 3. Request Flow

```
Browser
  │
  ├── GET /           → React SPA (served by Vite)
  │
  └── GET /api/v1/... → Vite proxy → FastAPI
                              │
                              ├── Router  (validates input via Pydantic)
                              ├── Service (queries DB via SQLModel session)
                              └── Response (serialised via schema)
```

See `docs/expense_request_flow.svg` for the full visual flow diagram.

---

## 4. Data Flow — Insights Engine

The insights engine runs entirely server-side on every `GET /api/v1/insights` call. No external APIs or ML models are used.

```
GET /api/v1/insights
       │
       ▼
insights_service.generate_insights(session)
       │
       ├── Query current month expenses + budgets
       ├── Query previous month expenses
       │
       ├── Rule 1: budget_overspend  — actual > budget?
       ├── Rule 2: burn_rate         — actual > 80% budget before month end?
       ├── Rule 3: mom_spike         — this month > last month by 30%+?
       ├── Rule 4: top_category      — highest spend category this month?
       ├── Rule 5: unusual_expense   — single expense > 2× category avg?
       ├── Rule 6: savings_opportunity — under budget 2 months running?
       └── Rule 7: streak            — no expenses in last 3+ days?
               │
               ▼
       Returns: List[Insight] (type, message, severity, category_id)
```

---

## 5. Environment & Configuration

All secrets are kept out of source code via `.env`:

| Variable | Used By | Purpose |
|----------|---------|---------|
| `POSTGRES_USER` | db, backend | DB username |
| `POSTGRES_PASSWORD` | db, backend | DB password |
| `POSTGRES_DB` | db, backend | Database name |
| `DATABASE_URL` | backend | Full SQLAlchemy connection URL |
| `ALLOWED_ORIGINS` | backend | CORS allowed origins |

The backend uses `pydantic-settings` (`config.py`) to load and validate all env vars at startup.

---

## 6. API Surface

Base path: `/api/v1`

| Domain | Endpoints |
|--------|-----------|
| Expenses | `POST /expenses`, `GET /expenses`, `GET /expenses/{id}`, `PUT /expenses/{id}`, `DELETE /expenses/{id}` |
| Categories | `GET /categories`, `POST /categories`, `DELETE /categories/{id}` |
| Budgets | `POST /budgets`, `GET /budgets`, `GET /budgets/status` |
| Reports | `GET /reports/monthly-summary`, `GET /reports/by-category`, `GET /reports/trend`, `GET /reports/top-expenses` |
| Insights | `GET /insights` |
| Health | `GET /health` |

Full interactive docs: `http://localhost:8000/docs` (Swagger UI)

---

## 7. Folder Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # App entry + startup (seeds categories)
│   │   ├── config.py        # Pydantic-settings from .env
│   │   ├── database.py      # Engine, session factory, lifespan
│   │   ├── models.py        # SQLModel table definitions
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── routers/         # HTTP layer (5 files)
│   │   └── services/        # Business logic (4 files)
│   ├── tests/
│   │   └── test_expenses.py # 12 pytest tests
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios modules (client, expenses, index)
│   │   ├── pages/           # Dashboard, Expenses, Budgets
│   │   ├── App.jsx          # Router + nav layout
│   │   └── index.css        # Global styles
│   ├── index.html
│   └── package.json
├── docs/                    # All project documentation
├── docker-compose.yml
└── README.md
```
