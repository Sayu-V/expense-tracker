# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).
This project uses [Semantic Versioning](https://semver.org/).

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
