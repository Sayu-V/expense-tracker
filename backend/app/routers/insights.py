"""
routers/insights.py
-------------------
Rule-based AI insights route.
Routes:
  GET /api/v1/insights
"""

from fastapi import APIRouter, Depends
from sqlmodel import Session

from app.database import get_session
from app.schemas import Insight
from app.services.insights_service import compute_insights

router = APIRouter(prefix="/insights", tags=["Insights"])


@router.get("", response_model=list[Insight])
def get_insights(session: Session = Depends(get_session)):
    """
    Returns all active rule-based insights for the current month.
    Each insight has: type, message, severity (info/warning/alert),
    and optional category context.
    """
    return compute_insights(session)
