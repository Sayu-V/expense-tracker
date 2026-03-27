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

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlmodel import Session, select

from app.config import settings
from app.database import create_db_and_tables, engine
from app.models import Category
from app.routers import expenses, categories, budgets, reports, insights


# ---------------------------------------------------------------------------
# Default categories seeded into the DB on first run
# ---------------------------------------------------------------------------

DEFAULT_CATEGORIES = [
    {"name": "Food",           "color": "#f97316", "emoji": "🍔", "is_default": True},
    {"name": "Transport",      "color": "#3b82f6", "emoji": "🚗", "is_default": True},
    {"name": "Housing",        "color": "#8b5cf6", "emoji": "🏠", "is_default": True},
    {"name": "Health",         "color": "#10b981", "emoji": "💊", "is_default": True},
    {"name": "Entertainment",  "color": "#ec4899", "emoji": "🎬", "is_default": True},
    {"name": "Shopping",       "color": "#f59e0b", "emoji": "🛒", "is_default": True},
    {"name": "Other",          "color": "#6b7280", "emoji": "📦", "is_default": True},
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
            elif existing.emoji == "💰":
                # Back-fill emoji for rows created before v1.1.0
                existing.emoji = cat_data["emoji"]
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
    version="1.1.0",
    docs_url="/docs",       # Swagger UI
    redoc_url="/redoc",     # ReDoc
    lifespan=lifespan,
)


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


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Health"])
def health_check():
    """Quick liveness check — Docker healthcheck hits this."""
    return {"status": "ok", "version": "1.1.0"}
