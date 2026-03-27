"""
models.py
---------
SQLModel table definitions. Each class with table=True maps directly
to a PostgreSQL table. SQLModel merges Pydantic validation with
SQLAlchemy ORM — one class does both jobs.

Tables:
  - Category  → categories
  - Expense   → expenses
  - Budget    → budgets

v1.1.0 additions:
  - Category.emoji  — display emoji for category badges (e.g. 🍔 for Food)
  - Expense.type    — 'expense' (default) or 'income' for income tracking
"""

from datetime import date as Date, datetime
from typing import Optional
from sqlmodel import Field, SQLModel, Relationship


class Category(SQLModel, table=True):
    """
    Represents a spending category (Food, Transport, Housing, etc.)
    Both default (seeded) and custom (user-created) categories live here.
    """
    __tablename__ = "categories"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(max_length=100, unique=True, index=True)
    color: str = Field(default="#6366f1", max_length=7)         # Hex color for UI charts
    emoji: str = Field(default="💰", max_length=10)              # v1.1.0: category emoji
    category_type: str = Field(default="expense", max_length=10) # v1.2.0: 'expense' | 'income'
    is_default: bool = Field(default=False)                     # True = seeded, cannot be deleted
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships (used for ORM queries, not serialized by default)
    expenses: list["Expense"] = Relationship(back_populates="category")
    budgets: list["Budget"] = Relationship(back_populates="category")


class Expense(SQLModel, table=True):
    """
    Core table. Each row is one expense record.
    category_id is a FK to categories.id — must be a valid category.

    v1.1.0: type field distinguishes expenses from income entries.
    """
    __tablename__ = "expenses"

    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float = Field(gt=0)                            # Must be positive
    description: str = Field(max_length=200)
    notes: Optional[str] = Field(default=None, max_length=500)
    date: Date = Field(index=True)                         # Indexed for fast date range queries
    type: str = Field(default="expense", max_length=10)    # v1.1.0: 'expense' | 'income'
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Foreign key to Category
    category_id: int = Field(foreign_key="categories.id", index=True)
    category: Optional[Category] = Relationship(back_populates="expenses")


class Budget(SQLModel, table=True):
    """
    Monthly budget per category.
    One budget row = one category's limit for one month+year combination.
    """
    __tablename__ = "budgets"

    id: Optional[int] = Field(default=None, primary_key=True)
    amount: float = Field(gt=0)                            # Budget ceiling (must be > 0)
    month: int = Field(ge=1, le=12)                        # 1–12
    year: int = Field(ge=2020)                             # Sanity lower bound
    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Foreign key to Category
    category_id: int = Field(foreign_key="categories.id", index=True)
    category: Optional[Category] = Relationship(back_populates="budgets")
