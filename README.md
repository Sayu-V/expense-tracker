---
title: Expense Tracker
date: 2026-03-30
tags:
  - expense-tracker
  - project
  - documentation
  - readme
aliases:
  - Project Overview
  - Expense Tracker App
version: 2.3.0
status: active
related:
  - "[[CHANGELOG]]"
  - "[[docs/03_Architecture]]"
  - "[[docs/04_Tech_Stack]]"
  - "[[docs/05_HLD]]"
  - "[[docs/06_LLD]]"
  - "[[docs/10_Walkthrough]]"
  - "[[docs/12_Final_Report]]"
---

# 💰 Expense Tracker

> Full-stack personal finance management system built with FastAPI, React, and PostgreSQL.

**Huvalon Consultancy Internship Project · Data Analysis & Automation**
**Yenepoya University · BCA Final Year (2023–2026) | Intern: Sayooj Vandichal**
**Duration: 09 Mar 2026 – 08 May 2026 · Hybrid, Mangalore**
**Current version: ==v2.3.0==** · Branch: `feature/v2.3.0`

See also: [[CHANGELOG]] · [[docs/03_Architecture]] · [[docs/04_Tech_Stack]] · [[docs/10_Walkthrough]] · [[docs/12_Final_Report]]

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI 0.111 (Python 3.11) |
| ORM | SQLModel 0.0.18 (Pydantic v2 + SQLAlchemy) |
| Database | PostgreSQL 15 |
| Frontend | React 18 + Vite |
| Charts | Recharts |
| AI / NLP | Keyword-based chat service (no external API) |
| PDF Parsing | pdfplumber 0.11.0 |
| Containers | Docker + Docker Compose |
| Testing | pytest + httpx |

> [!tip] Full stack details
> See [[docs/04_Tech_Stack]] for detailed rationale behind every library choice.

---

## Features

### Core Tracking
- Track expenses and income with amount, date, category, notes, and type
- Full CRUD — edit and delete any entry at any time
- Flexible period views — Week / Month / Quarter / Year with `‹ ›` navigation
- Bulk-select delete and CSV export on Expenses and Budgets pages
- Cursor-based pagination — stable "Load more" with `X of Y` count

### Budgets & Goals
- Per-category monthly budget limits with live progress bars
- Savings Goal tracker — animated SVG progress ring, projected completion date
- Spending Alerts — budget threshold and category-spike notifications with unread badge

### Analytics & Reports
- Dashboard with 6 widgets: spend summary, pie/treemap chart, trend line, budget vs actual, recent entries, AI insights
- Year-over-Year comparison chart (this year vs last year, Jan–Dec)
- Predicted monthly spend — linear extrapolation with daily burn rate
- Smart AI Insights — 10 rule-based insights surfacing patterns automatically

### AI Chat
- Natural-language chat with your data — no external API, fully offline
- Supports: total spend, category breakdown, income vs expenses, savings rate, 6-month trend, budget status, top expenses
- Inline Recharts (pie/bar/line) rendered inside chat bubbles
- 5 quick-start chips + contextual follow-up suggestions per reply

### Import & Rules
- Bank statement import — Canara Bank PDF + generic CSV (drag & drop, max 20 MB)
- Smart 2-pass auto-categoriser: Import Rules engine → income sources → built-in keywords
- Import Rules engine — define IF/THEN rules with AND/OR logic, retroactive apply
- Income Sources — define recurring senders matched by keyword during import
- Duplicate detection and ⚠️ flagging for large unclassified deposits

> [!tip] AI Skills for this feature
> [[docs/canara-bank-parser-skill/SKILL|Canara Bank Parser Skill]] — full PDF parsing spec (UPI patterns, cross-page splits, business VPA tagging)
> [[docs/ai-import-skill/SKILL|AI Bank Import Skill]] — 5-pass categorisation waterfall with Claude prompt and UI architecture

### Recurring Expenses
- Recurring expense templates (daily / weekly / monthly)
- One-click "Generate All Due" for all overdue templates

### Design & Themes
- Three theme modes cycling ☀️ Light → 🌙 Dark → 🌌 Galaxy 3D
- Galaxy theme: deep-space glass-morphism with animated radial-gradient orbs
- Minimal 3D glass-morphism splash screen with rotating financial quotes
- Mobile-responsive — slide-in drawer, bottom-sheet modals, iOS safe-area insets
- PWA installable — works offline via Service Worker (cache-first app shell, network-first API)
- Collapsible sidebar persisted in `localStorage`

### Settings Hub (v2.3.0)
- Single `⚙️ Settings` sidebar entry consolidating: Categories, Import, Import Rules, What's New
- URL-driven tabs (`?tab=categories|import|import-rules|whats-new`) — shareable and back-button aware

---

## Quick Start (Docker)

> [!important] Prerequisites
> Docker Desktop with WSL2 enabled (Windows) or Docker Desktop for Mac. No other dependencies needed.

```bash
# 1. Clone the repo
git clone https://github.com/Sayu-V/expense-tracker.git
cd expense-tracker

# 2. Set up environment
cp backend/.env.example backend/.env
# Edit backend/.env with your desired DB password

# 3. Start the full stack
docker compose up --build

# 4. Open in browser
#    Frontend:  http://localhost:5173
#    API docs:  http://localhost:8000/docs
```

> [!warning] Windows users
> Ensure WSL2 is enabled before running Docker Desktop. The repo includes a `.gitattributes` file to enforce LF line endings — this prevents `\r: command not found` errors inside containers. See [[docs/03_Architecture]] for deployment notes.

---

## Project Structure

```
expense-tracker/
├── backend/
│   ├── app/
│   │   ├── main.py                  # App entry point + startup seeding
│   │   ├── config.py                # Settings from .env
│   │   ├── database.py              # DB engine, session, ALTER TABLE migrations
│   │   ├── models.py                # SQLModel table definitions
│   │   ├── schemas.py               # Pydantic request/response schemas
│   │   ├── routers/
│   │   │   ├── expenses.py          # CRUD + bulk-delete + cursor pagination
│   │   │   ├── categories.py
│   │   │   ├── budgets.py
│   │   │   ├── reports.py           # Monthly summary, trend, YoY, prediction
│   │   │   ├── insights.py          # 10-rule AI insights engine
│   │   │   ├── chat.py              # NLP chat endpoint
│   │   │   ├── recurring.py         # Recurring expense templates
│   │   │   ├── alerts.py            # Spending alerts + badge count
│   │   │   ├── goals.py             # Savings goals
│   │   │   ├── imports.py           # Bank statement import + income sources
│   │   │   └── import_rules.py      # Import Rules engine
│   │   └── services/
│   │       ├── expense_service.py
│   │       ├── budget_service.py
│   │       ├── report_service.py
│   │       ├── insights_service.py
│   │       ├── chat_service.py
│   │       ├── categorizer_service.py
│   │       ├── import_service.py    # PDF + CSV parser, session store
│   │       └── import_rules_service.py
│   ├── tests/
│   │   └── test_expenses.py         # 12+ pytest tests
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/
│   │   ├── sw.js                    # Service Worker (PWA offline)
│   │   ├── manifest.json            # PWA manifest
│   │   └── icon.svg                 # App icon
│   ├── src/
│   │   ├── api/                     # Axios API modules per domain
│   │   ├── components/
│   │   │   ├── SplashScreen.jsx     # 3D glass-morphism splash
│   │   │   ├── PeriodSelector.jsx
│   │   │   └── EditExpenseModal.jsx
│   │   ├── context/
│   │   │   └── PeriodContext.jsx
│   │   ├── hooks/
│   │   │   ├── useAutoRefresh.js
│   │   │   └── useChartTheme.js
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx
│   │   │   ├── Expenses.jsx
│   │   │   ├── Budgets.jsx
│   │   │   ├── Chat.jsx
│   │   │   ├── RecurringExpenses.jsx
│   │   │   ├── Alerts.jsx
│   │   │   ├── Goals.jsx
│   │   │   ├── Import.jsx
│   │   │   ├── Categories.jsx
│   │   │   ├── ImportRules.jsx
│   │   │   ├── FeatureUpdates.jsx
│   │   │   └── Settings.jsx         # v2.3 — tabbed settings hub
│   │   ├── App.jsx                  # Shell, routing, theme, splash
│   │   └── index.css                # Design system + all themes
│   ├── Dockerfile
│   ├── index.html
│   └── package.json
├── docs/
│   ├── 01_PRD.docx
│   ├── 02_Project_Proposal.docx
│   ├── 03_Architecture.md
│   ├── 04_Tech_Stack.md
│   ├── 05_HLD.md / 05_HLD.docx
│   ├── 06_LLD.md / 06_LLD.docx
│   ├── 07_API_Reference.md / 07_API_Reference.docx
│   ├── 08_Deployment_Strategy.md / 08_Deployment_Strategy.docx
│   ├── 09_Tests.docx
│   ├── 10_Walkthrough.md
│   ├── 11_ChangeLog.docx
│   ├── 12_Final_Report.docx
│   ├── 13_Presentation.pptx
│   ├── canara-bank-parser-skill/SKILL.md  ← reusable AI parsing skill
│   ├── ai-import-skill/SKILL.md           ← reusable AI categorisation skill
│   ├── architecture-v1.9.mermaid          ← system architecture diagram source
│   ├── v2.0-import-flow.mermaid           ← import pipeline diagram source
│   └── SESSION_CONTEXT.md                 ← AI session memory log
├── .gitattributes                   # LF enforcement for Windows safety
├── docker-compose.yml
├── CHANGELOG.md
└── README.md
```

---

## Running Tests

```bash
# From the backend directory (with dependencies installed)
cd backend && pip install -r requirements.txt
pytest tests/ -v

# Inside Docker (no local Python needed)
docker compose exec backend pytest tests/ -v
```

---

## API Endpoints

> [!info] Interactive docs
> All endpoints are documented interactively at **http://localhost:8000/docs** (Swagger UI) and **http://localhost:8000/redoc**.

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Health check + version |
| `POST` | `/api/v1/expenses` | Create expense / income |
| `GET` | `/api/v1/expenses` | List with filters + cursor pagination |
| `PUT` | `/api/v1/expenses/{id}` | Update entry |
| `DELETE` | `/api/v1/expenses/{id}` | Delete entry |
| `POST` | `/api/v1/expenses/bulk-delete` | Bulk delete by ID list |
| `GET` | `/api/v1/categories` | List all categories |
| `POST` | `/api/v1/categories` | Create custom category |
| `PUT` | `/api/v1/categories/{id}` | Update category |
| `DELETE` | `/api/v1/categories/{id}` | Delete custom category |
| `POST` | `/api/v1/budgets` | Set monthly budget |
| `GET` | `/api/v1/budgets/status` | Budget vs actual with % used |
| `PUT` | `/api/v1/budgets/{id}` | Update budget |
| `DELETE` | `/api/v1/budgets/{id}` | Delete budget |
| `GET` | `/api/v1/reports/monthly-summary` | Totals + net balance |
| `GET` | `/api/v1/reports/by-category` | Spend breakdown |
| `GET` | `/api/v1/reports/trend` | N-month spend trend |
| `GET` | `/api/v1/reports/year-over-year` | YoY comparison (12 months) |
| `GET` | `/api/v1/reports/prediction` | Predicted monthly spend |
| `GET` | `/api/v1/insights` | 10 AI insight rules |
| `POST` | `/api/v1/chat` | NLP chat query |
| `GET/POST/PUT/DELETE` | `/api/v1/recurring-expenses` | Recurring templates CRUD |
| `POST` | `/api/v1/recurring-expenses/{id}/generate` | Generate due entries |
| `GET/POST` | `/api/v1/alerts` | Spending alerts + generate |
| `POST` | `/api/v1/alerts/{id}/read` | Mark alert read |
| `GET/POST/PUT/DELETE` | `/api/v1/goals` | Savings goals CRUD |
| `POST` | `/api/v1/import/upload` | Parse bank statement (PDF/CSV) |
| `POST` | `/api/v1/import/confirm` | Confirm and save import |
| `GET/POST/PUT/DELETE` | `/api/v1/income-sources` | Income source definitions |
| `GET/POST/PUT/DELETE` | `/api/v1/import-rules` | Import Rules CRUD |
| `POST` | `/api/v1/import-rules/{id}/retroactive` | Retroactive re-classify |
| `POST` | `/api/v1/import-rules/quick` | Quick rule from import preview |

---

## Environment Variables

Copy `backend/.env.example` → `backend/.env`:

```env
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=expense_tracker
DATABASE_URL=postgresql://postgres:your_secure_password@db:5432/expense_tracker
ALLOWED_ORIGINS=http://localhost:5173
```

---

## Version History

| Version | Highlights |
|---|---|
| **v2.3.0** | ⚙️ Settings hub — sidebar consolidated from 11 → 8 items; `.gitattributes` |
| **v2.2.0** | PWA offline, cursor pagination, 3D splash, galaxy theme, button standardisation |
| **v2.1.0** | Import Rules engine, retroactive apply, quick-rule from preview |
| **v2.0.0** | Bank statement import (PDF + CSV), income sources, smart categoriser |
| **v1.9.0** | Rich emoji category picker (120+ emojis, 11 themed tabs) |
| **v1.8.0** | YoY comparison chart, predicted spend, 3 new AI insight rules |
| **v1.7.0** | Recurring expenses, spending alerts with badge, savings goals |
| **v1.6.0** | Collapsible sidebar, chart dark-mode theme hook |
| **v1.5.0** | Chat AI, bulk-delete, CSV export, edit/delete budgets |
| **v1.4.0** | Mobile responsive, PWA meta tags, auto-refresh |
| **v1.3.0** | Apple design system, dark/light theme, period selector, drill-down |
| **v1.1.0** | Income tracking, AI auto-categorise, emoji categories |
| **v1.0.0** | Initial release — FastAPI + React + PostgreSQL + Docker |

> [!note] Full changelog
> See [[CHANGELOG]] for detailed per-version additions, changes, and bug fixes.

---

## Milestones

| Day | Deliverable | Status |
|---|---|---|
| Day 1 | PRD, project structure, DB models, Docker setup | ✅ |
| Day 2 | Core CRUD API (expenses, categories, budgets) | ✅ |
| Day 3 | Reports + AI Insights endpoints | ✅ |
| Day 4 | React Dashboard (all widgets) | ✅ |
| Day 5 | Tests, error handling, polish | ✅ |
| Day 6 | End-to-end testing, Docker validation | ✅ |
| Day 7 | v2.x features, documentation, deployment prep | ✅ |

---

## Planned Features (v3.x)

The following features are planned for future versions of the project, targeting May 2026 as part of the Huvalon internship capstone continuation.

| Feature | Description |
|---|---|
| **User Accounts & Auth** | Multi-user support with JWT-based authentication, per-user data isolation, and role management |
| **Receipt Scan & OCR** | Attach photos or scans of bills and receipts to expenses; auto-extract amount, date, and merchant via OCR |
| **Currency Selection** | Multi-currency support with live exchange rates; choose a display currency in Settings |
| **Advanced Export** | Export to PDF reports, Excel spreadsheets, and custom date-range CSV with filters |
| **Advanced AI Chat** | Pluggable LLM backend — choose Claude, Gemini, OpenAI, DeepSeek, or a local open-source model via a single API key setting |

---

## Architecture Diagrams

| Diagram | Description |
|---|---|
| [[docs/architecture-v2.3.0.mermaid\|System Architecture (v2.3.0)]] | 3-tier Docker Compose network — 12 pages, 11 routers, 8 services, 8 DB tables |
| [[docs/v2.3.0-import-flow.mermaid\|Import Flow (v2.3.0)]] | Bank import pipeline — Canara PDF parser, 2-pass auto-categorisation, duplicate detection |
| [[docs/expense_tracker_architecture.svg\|Architecture SVG]] | Visual system overview |
| [[docs/expense_request_flow.svg\|Request Flow SVG]] | HTTP request lifecycle diagram |

> [!info] Project documentation
> Full report: [[docs/12_Final_Report]] · Presentation: `docs/13_Presentation.pptx` · Architecture: [[docs/03_Architecture]] · Deployment: [[docs/08_Deployment_Strategy]]
