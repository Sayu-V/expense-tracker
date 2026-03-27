"""
routers/recurring.py
--------------------
REST endpoints for recurring expense templates.

Routes:
  GET    /recurring-expenses            — list all templates
  POST   /recurring-expenses            — create a new template
  GET    /recurring-expenses/{id}       — get one template
  PUT    /recurring-expenses/{id}       — update a template
  DELETE /recurring-expenses/{id}       — delete a template
  POST   /recurring-expenses/{id}/generate     — generate expenses for one template
  POST   /recurring-expenses/generate-all      — generate for all due templates
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.schemas import (
    RecurringExpenseCreate, RecurringExpenseRead, RecurringExpenseUpdate, GenerateResult
)
from app.services import recurring_service

router = APIRouter(prefix="/recurring-expenses", tags=["Recurring Expenses"])


@router.get("", response_model=list[RecurringExpenseRead])
def list_recurring(session: Session = Depends(get_session)):
    recs = recurring_service.list_recurring(session)
    # Eager-load categories for response
    return recs


@router.post("", response_model=RecurringExpenseRead, status_code=201)
def create_recurring(data: RecurringExpenseCreate, session: Session = Depends(get_session)):
    try:
        rec = recurring_service.create_recurring(session, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return rec


@router.get("/generate-all", response_model=list[GenerateResult])
def generate_all(session: Session = Depends(get_session)):
    """Generate expenses for ALL active recurring templates that are due today."""
    return recurring_service.generate_all_due(session)


@router.get("/{recurring_id}", response_model=RecurringExpenseRead)
def get_recurring(recurring_id: int, session: Session = Depends(get_session)):
    rec = recurring_service.get_recurring(session, recurring_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return rec


@router.put("/{recurring_id}", response_model=RecurringExpenseRead)
def update_recurring(
    recurring_id: int,
    data: RecurringExpenseUpdate,
    session: Session = Depends(get_session),
):
    rec = recurring_service.update_recurring(session, recurring_id, data)
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return rec


@router.delete("/{recurring_id}", status_code=204)
def delete_recurring(recurring_id: int, session: Session = Depends(get_session)):
    deleted = recurring_service.delete_recurring(session, recurring_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Recurring expense not found")


@router.post("/{recurring_id}/generate", response_model=GenerateResult)
def generate_for_one(recurring_id: int, session: Session = Depends(get_session)):
    """Generate all due expense entries for a single recurring template."""
    rec = recurring_service.get_recurring(session, recurring_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Recurring expense not found")
    return recurring_service.generate_due(session, recurring_id)
