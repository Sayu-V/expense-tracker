# Expense Tracker — Claude Project Context

## Project
Full-stack personal finance manager. FastAPI + SQLModel + PostgreSQL + React 18 + Vite 5.
Current version: **v2.3.0** (completed). Branch: `feature/v2.3.0`.

## Architecture
- **Backend:** FastAPI 0.111, SQLModel 0.0.18, PostgreSQL 15, Uvicorn
- **Frontend:** React 18, Vite 5, Recharts, React Router v6, Axios
- **Infrastructure:** Docker Compose 3.9 (Strategy A — single `docker compose up --build`)
- **PWA:** Service Worker, cache-first shell, network-first API, 3 themes (Light/Dark/Galaxy)

## Key structure
```
backend/app/
  routers/     11 router groups (expenses, categories, budgets, reports, insights,
               chat, recurring, alerts, goals, imports, import_rules)
  services/    8 service modules (business logic layer)
  models.py    8 SQLModel tables
  schemas.py   Pydantic v2 request/response schemas

frontend/src/
  pages/       12 pages (Dashboard, Expenses, Budgets, Chat, Goals, Settings…)
  api/         Axios modules, one per domain
  context/     PeriodContext (period navigation shared state)
```

## Important conventions
- All DB migrations via ALTER TABLE in `database.py` startup (no Alembic)
- Cursor-based pagination on all list endpoints (no offset pagination)
- Import pipeline: 2-pass auto-categorise (user rules → income sources → keywords)
- Settings page consolidates Categories, Import, Import Rules, What's New under `?tab=`

## Documentation
Full docs in `docs/` (01_PRD → 13_Presentation). Start with `docs/00_INDEX.md`.
Architecture: `docs/03_Architecture.md` · API: `docs/07_API_Reference.md`

## Running locally
```bash
cp backend/.env.example backend/.env   # set POSTGRES_PASSWORD
docker compose up --build             # starts db + backend + frontend
# frontend → http://localhost:5173
# API docs → http://localhost:8000/docs
```
