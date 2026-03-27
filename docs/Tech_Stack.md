# Tech Stack — Expense Tracker v1.0.0

> **Author:** Sayu-V | Yenepoya University  
> **Date:** 2026-03-27

---

## Backend

### FastAPI 0.111.0
- **Role:** REST API framework
- **Why:** Async-ready, built-in Swagger UI at `/docs`, automatic request validation via Pydantic, minimal boilerplate
- **Key usage:** All 5 router groups, dependency injection for DB sessions, lifespan hooks for startup seeding

### SQLModel 0.0.18
- **Role:** ORM + data validation
- **Why:** Combines SQLAlchemy (DB engine/queries) and Pydantic v2 (validation) in one class definition — no duplication between DB schema and API validation
- **Key usage:** `Category`, `Expense`, `Budget` table models; session factory in `database.py`

### PostgreSQL 15 (via Docker)
- **Role:** Primary database
- **Why:** Production-grade relational DB, full ACID compliance, excellent support for date-range queries needed by the reports engine
- **Key usage:** Stores all categories, expenses, and budgets; named volume for persistence across restarts

### Pydantic v2 (2.7.1)
- **Role:** Request/response schema enforcement
- **Why:** Built into FastAPI; v2 is significantly faster than v1; `field_validator` decorators provide clean custom validation
- **Key usage:** `schemas.py` — `ExpenseCreate`, `ExpenseUpdate`, `BudgetCreate`, `CategoryCreate` with validators for amount > 0, non-blank description, hex color format

### Uvicorn 0.29.0
- **Role:** ASGI server
- **Why:** Production-grade async server recommended for FastAPI; `--reload` flag enables hot-reload in development
- **Key usage:** Entrypoint in Docker container: `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`

### python-dotenv / pydantic-settings
- **Role:** Environment configuration
- **Why:** Keeps secrets out of source code; `pydantic-settings` validates env vars at startup with type coercion
- **Key usage:** `config.py` — `Settings` class reads `DATABASE_URL`, `ALLOWED_ORIGINS` from `.env`

### python-dateutil 2.9.0
- **Role:** Date arithmetic
- **Why:** Simplifies month boundary calculations in the insights and reports engines
- **Key usage:** `report_service.py` trend calculation; `insights_service.py` burn rate (days remaining in month)

---

## Frontend

### React 18.3.1
- **Role:** UI library
- **Why:** Component model, hooks for state management, large ecosystem, pairs perfectly with Vite
- **Key usage:** 3 page components, all stateful with `useState` + `useEffect` for data fetching

### Vite 5.2.13
- **Role:** Dev server + build tool
- **Why:** Dramatically faster than Create React App (native ES modules, no bundling in dev); `/api` proxy to backend eliminates CORS issues
- **Key usage:** `vite.config.js` — proxy `/api` → `http://backend:8000`, `host: true` for Docker network access

### React Router DOM 6.23.1
- **Role:** Client-side routing
- **Why:** v6 declarative API, nested routes, `NavLink` for active state styling
- **Key usage:** `App.jsx` — routes for `/`, `/expenses`, `/budgets`

### Recharts 2.12.7
- **Role:** Data visualisation
- **Why:** Pure React charting library (no D3 wrappers needed), responsive containers, clean defaults
- **Key usage:** `PieChart` (category breakdown), `LineChart` (monthly trend), `BarChart` (budget vs actual)

### Axios 1.7.2
- **Role:** HTTP client
- **Why:** Interceptors for global error logging, clean async/await API, request cancellation support
- **Key usage:** `api/client.js` — shared Axios instance with base URL `/api/v1`; response interceptor logs all API errors

### date-fns 3.6.0
- **Role:** Date formatting utilities
- **Why:** Tree-shakeable, immutable, no prototype pollution
- **Key usage:** Date formatting in Expenses page filter bar

---

## Infrastructure

### Docker 24+ / Docker Compose v2
- **Role:** Containerisation and orchestration
- **Why:** Reproducible environment, single-command startup, isolates each service, eliminates "works on my machine" issues
- **Key usage:** `docker-compose.yml` — 3 services (`db`, `backend`, `frontend`) with health checks and dependency ordering

### PostgreSQL Docker Image: `postgres:15-alpine`
- **Why:** Alpine base keeps image size small; version-pinned for reproducibility

### Python Image: `python:3.11-slim`
- **Why:** Slim variant reduces image size; 3.11 for latest performance improvements

### Node Image: `node:18-alpine`
- **Why:** Alpine base; Node 18 LTS for stability

---

## Testing

### pytest 8.2.0
- **Role:** Test runner
- **Key usage:** `tests/test_expenses.py` — 12 tests across categories, expenses, filters, 404s

### pytest-asyncio 0.23.6
- **Role:** Async test support
- **Key usage:** Configured in `asyncio: mode=strict` for clean async test isolation

### httpx 0.27.0
- **Role:** Test HTTP client
- **Key usage:** `TestClient` in FastAPI test fixtures — makes real HTTP calls to the app without needing a running server

### SQLite (in-memory)
- **Role:** Test database
- **Why:** No Docker required for tests; `StaticPool` ensures all test operations share the same connection
- **Key usage:** `session_fixture` in `test_expenses.py` — creates fresh in-memory DB per test

---

## Version Summary

| Package | Version | Layer |
|---------|---------|-------|
| fastapi | 0.111.0 | Backend |
| sqlmodel | 0.0.18 | Backend |
| pydantic | 2.7.1 | Backend |
| uvicorn | 0.29.0 | Backend |
| python-dotenv | 1.0.1 | Backend |
| pydantic-settings | 2.2.1 | Backend |
| httpx | 0.27.0 | Backend |
| pytest | 8.2.0 | Testing |
| pytest-asyncio | 0.23.6 | Testing |
| alembic | 1.13.1 | Backend |
| python-dateutil | 2.9.0 | Backend |
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
