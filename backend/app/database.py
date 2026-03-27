"""
database.py
-----------
Handles PostgreSQL connection using SQLModel + SQLAlchemy engine.
Provides:
  - engine: shared SQLAlchemy engine instance
  - create_db_and_tables(): called once on app startup
  - get_session(): FastAPI dependency for injecting DB sessions into routes
"""

from sqlalchemy import text
from sqlmodel import SQLModel, Session, create_engine
from app.config import settings

# Create the SQLAlchemy engine.
# echo=False in production — set to True temporarily to debug SQL queries.
engine = create_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,       # Reconnects if DB drops connection
    pool_size=5,              # Max persistent connections in pool
    max_overflow=10,          # Extra connections allowed under load
)


def create_db_and_tables() -> None:
    """
    Creates all tables defined via SQLModel table=True classes.
    Called once in app lifespan startup.
    Safe to call repeatedly — only creates tables that don't exist.

    v1.1.0: Also applies additive ALTER TABLE migrations for new columns
    on existing databases so a fresh Docker volume isn't required.
    """
    SQLModel.metadata.create_all(engine)
    _apply_v1_1_0_migrations()


def _apply_v1_1_0_migrations() -> None:
    """
    Adds new columns introduced in v1.1.0 if they don't already exist.
    Uses IF NOT EXISTS (PostgreSQL 9.6+) — completely safe to re-run.
    """
    migrations = [
        # v1.1.0 — Add 'type' column to expenses (expense | income)
        "ALTER TABLE expenses ADD COLUMN IF NOT EXISTS type VARCHAR(10) DEFAULT 'expense' NOT NULL",
        # v1.1.0 — Add 'emoji' column to categories
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS emoji VARCHAR(10) DEFAULT '💰' NOT NULL",
        # v1.2.0 — Add 'category_type' column to categories (expense | income)
        "ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type VARCHAR(10) DEFAULT 'expense' NOT NULL",
    ]
    with Session(engine) as session:
        for sql in migrations:
            try:
                session.exec(text(sql))  # type: ignore[arg-type]
            except Exception:
                pass  # column already exists or table doesn't exist yet
        session.commit()


def get_session():
    """
    FastAPI dependency that yields a database session.
    Automatically closes session after the request completes.

    Usage in a route:
        @router.get("/expenses")
        def list_expenses(session: Session = Depends(get_session)):
            ...
    """
    with Session(engine) as session:
        yield session
