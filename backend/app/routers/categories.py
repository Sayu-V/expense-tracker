"""
routers/categories.py
---------------------
Routes for category management.
Routes:
  GET    /api/v1/categories
  POST   /api/v1/categories
  DELETE /api/v1/categories/{id}
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import Category
from app.schemas import CategoryCreate, CategoryRead

router = APIRouter(prefix="/categories", tags=["Categories"])


@router.get("", response_model=list[CategoryRead])
def list_categories(session: Session = Depends(get_session)):
    """Return all categories (default + custom)."""
    categories = session.exec(select(Category).order_by(Category.name)).all()
    return categories


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
    category = Category(name=payload.name, color=payload.color, is_default=False)
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
