# Expense Tracker

Full-stack personal finance management system built with FastAPI, React, and PostgreSQL.

**IBM Student Project | Yenepoya University | 2023–2026 Batch**

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python 3.11) |
| ORM | SQLModel (Pydantic v2 + SQLAlchemy) |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| Containers | Docker + Docker Compose |
| Testing | pytest + httpx |

---

## Quick Start (Docker)

```bash
# 1. Clone the repo
git clone <your-repo-url>
cd expense-tracker

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your desired password

# 3. Start the full stack
docker compose up --build

# 4. Open in browser
#    Frontend: http://localhost:5173
#    API docs:  http://localhost:8000/docs
```

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py          # App entry point + startup
│   │   ├── config.py        # Settings from .env
│   │   ├── database.py      # DB engine + session
│   │   ├── models.py        # SQLModel table definitions
│   │   ├── schemas.py       # Pydantic request/response models
│   │   ├── routers/         # One file per domain
│   │   │   ├── expenses.py
│   │   │   ├── categories.py
│   │   │   ├── budgets.py
│   │   │   ├── reports.py
│   │   │   └── insights.py
│   │   └── services/        # Business logic layer
│   │       ├── expense_service.py
│   │       ├── budget_service.py
│   │       ├── report_service.py
│   │       └── insights_service.py
│   ├── tests/
│   │   └── test_expenses.py # 12+ pytest tests
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios API modules
│   │   ├── pages/           # Dashboard, Expenses, Budgets
│   │   ├── App.jsx
│   │   └── index.css
│   ├── index.html
│   └── package.json
├── docker-compose.yml
└── README.md
```

---

## Running Tests

```bash
# From the backend directory (with dependencies installed)
cd backend
pip install -r requirements.txt
pytest tests/ -v

# Inside Docker
docker compose exec backend pytest tests/ -v
```

---

## API Endpoints

All endpoints are documented interactively at **http://localhost:8000/docs**

| Method | Path | Description |
|---|---|---|
| POST | /api/v1/expenses | Create expense |
| GET | /api/v1/expenses | List expenses (filterable) |
| GET | /api/v1/expenses/{id} | Get single expense |
| PUT | /api/v1/expenses/{id} | Update expense |
| DELETE | /api/v1/expenses/{id} | Delete expense |
| GET | /api/v1/categories | List categories |
| POST | /api/v1/categories | Create custom category |
| DELETE | /api/v1/categories/{id} | Delete custom category |
| POST | /api/v1/budgets | Set monthly budget |
| GET | /api/v1/budgets | List budgets |
| GET | /api/v1/budgets/status | Budget vs actual |
| GET | /api/v1/reports/monthly-summary | Monthly totals |
| GET | /api/v1/reports/by-category | Category breakdown |
| GET | /api/v1/reports/trend | Spend trend (N months) |
| GET | /api/v1/reports/top-expenses | Top expenses |
| GET | /api/v1/insights | AI insights |
| GET | /health | Health check |

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and set:

```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=expense_tracker
DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/expense_tracker
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Milestones

| Day | Deliverable | Status |
|---|---|---|
| Day 1 | PRD, project structure, DB models, Docker setup | ✅ |
| Day 2 | Core CRUD API (expenses, categories, budgets) | ✅ |
| Day 3 | Reports + AI Insights endpoints | ✅ |
| Day 4 | React Dashboard (all 5 widgets) | ✅ |
| Day 5 | Tests (12 passing), error handling, polish | ✅ |
| Day 6 | End-to-end testing, Docker validation | ✅ |
| Day 7 | Final review + submission prep | 🔲 |


---

## Changelog

See [CHANGELOG.md](./CHANGELOG.md) for full version history.

**Current version: v1.0.0** (2026-03-27)
