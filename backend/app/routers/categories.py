"""
routers/categories.py
---------------------
Routes for category management.
Routes:
  GET    /api/v1/categories            (optional ?category_type=expense|income)
  POST   /api/v1/categories
  PUT    /api/v1/categories/{id}       (v1.2.0)
  DELETE /api/v1/categories/{id}
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session, select

from app.database import get_session
from app.models import Category
from app.schemas import CategoryCreate, CategoryRead, CategoryUpdate

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(
    category_type: Optional[str] = Query(None, description="Filter by 'expense' or 'income'"),
    session: Session = Depends(get_session),
):
    """Return all categories. Optionally filter by category_type."""
    query = select(Category).order_by(Category.name)
    if category_type is not None:
        query = query.where(Category.category_type == category_type)
    return session.exec(query).all()


@router.post("", response_model=CategoryRead, status_code=201)
def create_category(payload: CategoryCreate, session: Session = Depends(get_session)):
    """Create a custom category. Name must be unique."""
    existing = session.exec(
        select(Category).where(Category.name == payload.name)
    ).first()
    if existing:
        raise HTTPException(
            status_code=409,
            detail=f"Category '{payload.name}' already exists"
        )
    category = Category(
        name=payload.name,
        color=payload.color,
        emoji=payload.emoji,
        category_type=payload.category_type,
        is_default=False,
    )
    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.put("/{category_id}", response_model=CategoryRead)
def update_category(
    category_id: int,
    payload: CategoryUpdate,
    session: Session = Depends(get_session),
):
    """
    v1.2.0 — Edit an existing category (name, emoji, color).
    Both custom and default categories can be edited.
    """
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    update_data = payload.model_dump(exclude_unset=True)

    # If renaming, check uniqueness
    if "name" in update_data and update_data["name"] != category.name:
        clash = session.exec(
            select(Category).where(Category.name == update_data["name"])
        ).first()
        if clash:
            raise HTTPException(
                status_code=409,
                detail=f"Category '{update_data['name']}' already exists"
            )

    for field, value in update_data.items():
        setattr(category, field, value)

    session.add(category)
    session.commit()
    session.refresh(category)
    return category


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int, session: Session = Depends(get_session)):
    """
    Delete a custom category.
    Default (seeded) categories cannot be deleted.
    """
    category = session.get(Category, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    if category.is_default:
        raise HTTPException(
            status_code=400,
            detail="Default categories cannot be deleted"
        )
    session.delete(category)
    session.commit()
