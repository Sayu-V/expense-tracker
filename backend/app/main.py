"""
main.py
-------
FastAPI application entry point.

On startup:
  1. Creates all DB tables (if not exists)
  2. Seeds default categories (Food, Transport, Housing, etc.)
  3. Registers all API routers under /api/v1

CORS is configured from .env so the React dev server can talk to the API.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

logger = logging.getLogger(__name__)

from app.config import settings
from app.database import create_db_and_tables, engine
from app.models import Category
from app.routers import expenses, categories, budgets, reports, insights, chat, recurring, alerts, goals


# ---------------------------------------------------------------------------
# Default categories seeded into the DB on first run
# ---------------------------------------------------------------------------

DEFAULT_CATEGORIES = [
    # ── Expense categories ────────────────────────────────────────────────
    {"name": "Food",           "color": "#f97316", "emoji": "🍔", "category_type": "expense", "is_default": True},
    {"name": "Transport",      "color": "#3b82f6", "emoji": "🚗", "category_type": "expense", "is_default": True},
    {"name": "Housing",        "color": "#8b5cf6", "emoji": "🏠", "category_type": "expense", "is_default": True},
    {"name": "Health",         "color": "#10b981", "emoji": "💊", "category_type": "expense", "is_default": True},
    {"name": "Entertainment",  "color": "#ec4899", "emoji": "🎬", "category_type": "expense", "is_default": True},
    {"name": "Shopping",       "color": "#f59e0b", "emoji": "🛒", "category_type": "expense", "is_default": True},
    {"name": "Other",          "color": "#6b7280", "emoji": "📦", "category_type": "expense", "is_default": True},
    # ── Income categories (v1.2.0) ────────────────────────────────────────
    {"name": "Salary",         "color": "#059669", "emoji": "💼", "category_type": "income", "is_default": True},
    {"name": "Pocket Money",   "color": "#0891b2", "emoji": "👛", "category_type": "income", "is_default": True},
    {"name": "Freelance",      "color": "#7c3aed", "emoji": "💻", "category_type": "income", "is_default": True},
    {"name": "Side Hustle",    "color": "#db2777", "emoji": "🚀", "category_type": "income", "is_default": True},
    {"name": "Stocks",         "color": "#16a34a", "emoji": "📊", "category_type": "income", "is_default": True},
    {"name": "Dividend",       "color": "#ca8a04", "emoji": "📈", "category_type": "income", "is_default": True},
    {"name": "Gift",           "color": "#dc2626", "emoji": "🎁", "category_type": "income", "is_default": True},
    {"name": "Rental Income",  "color": "#9333ea", "emoji": "🏘️", "category_type": "income", "is_default": True},
]


def seed_default_categories() -> None:
    """
    Inserts default categories if they don't already exist.
    Idempotent — safe to call on every startup.
    v1.1.0: Also updates emoji on existing rows that still have the default '💰'.
    """
    with Session(engine) as session:
        for cat_data in DEFAULT_CATEGORIES:
            existing = session.exec(
                select(Category).where(Category.name == cat_data["name"])
            ).first()
            if not existing:
                category = Category(**cat_data)
                session.add(category)
            else:
                # Back-fill emoji for rows created before v1.1.0
                if existing.emoji == "💰":
                    existing.emoji = cat_data["emoji"]
                # Back-fill category_type for rows created before v1.2.0
                if existing.category_type == "expense" and cat_data.get("category_type") == "income":
                    existing.category_type = "income"
                session.add(existing)
        session.commit()


# ---------------------------------------------------------------------------
# App lifespan (replaces deprecated @app.on_event)
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    create_db_and_tables()
    seed_default_categories()
    yield
    # Shutdown (nothing to clean up — DB pool closes automatically)


# ---------------------------------------------------------------------------
# App instance
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Expense Tracker API",
    description="Personal finance tracking with FastAPI, SQLModel, and PostgreSQL",
    version="1.9.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
    lifespan=lifespan,
)


# ---------------------------------------------------------------------------
# Validation error handler — logs the full Pydantic v2 detail to stdout
# so 422 errors are visible in Docker logs (docker compose logs backend)
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    # exc.errors() may contain non-serialisable objects (e.g. ValueError in ctx).
    # jsonable_encoder converts them to strings so JSONResponse can serialise them.
    errors = jsonable_encoder(exc.errors())
    logger.error(
        "422 Validation Error  %s %s\n  body: %s\n  errors: %s",
        request.method,
        request.url.path,
        exc.body,
        errors,
    )
    return JSONResponse(status_code=422, content={"detail": errors})


# ---------------------------------------------------------------------------
# CORS middleware — allows React frontend to make cross-origin requests
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routers — each file handles one domain
# ---------------------------------------------------------------------------

app.include_router(expenses.router,   prefix="/api/v1")
app.include_router(categories.router, prefix="/api/v1")
app.include_router(budgets.router,    prefix="/api/v1")
app.include_router(reports.router,    prefix="/api/v1")
app.include_router(insights.router,   prefix="/api/v1")
app.include_router(chat.router,       prefix="/api/v1")   # v1.5.0
app.include_router(recurring.router,  prefix="/api/v1")   # v1.7.0
app.include_router(alerts.router,     prefix="/api/v1")   # v1.7.0
app.include_router(goals.router,      prefix="/api/v1")   # v1.7.0


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check():
    """Quick liveness check — Docker healthcheck hits this."""
    return {"status": "ok", "version": "1.9.0"}
