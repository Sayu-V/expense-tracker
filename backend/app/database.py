"""
database.py
-----------
Handles PostgreSQL connection using SQLModel + SQLAlchemy engine.
Provides:
  - engine: shared SQLAlchemy engine instance
  - create_db_and_tables(): called once on app startup
  - get_session(): FastAPI dependency for injecting DB sessions into routes
"""

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
    """
    SQLModel.metadata.create_all(engine)


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
