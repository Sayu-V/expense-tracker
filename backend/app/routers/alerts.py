"""
routers/alerts.py
-----------------
REST endpoints for spending alerts.

Routes:
  GET  /alerts                  — list all alerts (unread_only=false by default)
  POST /alerts/generate         — compute new alerts from current budget/spend data
  POST /alerts/{id}/read        — mark one alert as read
  POST /alerts/read-all         — mark all alerts as read
  DELETE /alerts/{id}           — delete a single alert
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlmodel import Session

from app.database import get_session
from app.schemas import AlertsResponse, SpendingAlertRead
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["Alerts"])


@router.get("", response_model=AlertsResponse)
def get_alerts(
    unread_only: bool = Query(False, description="Return only unread alerts"),
    session: Session = Depends(get_session),
):
    return alert_service.get_alerts(session, unread_only=unread_only)


@router.post("/generate", response_model=list[SpendingAlertRead])
def generate_alerts(session: Session = Depends(get_session)):
    """
    Compute budget threshold and category spike alerts for the current month.
    Idempotent — safe to call multiple times.
    """
    return alert_service.generate_alerts(session)


@router.post("/read-all")
def mark_all_read(session: Session = Depends(get_session)):
    count = alert_service.mark_all_read(session)
    return {"marked_read": count}


@router.post("/{alert_id}/read", response_model=SpendingAlertRead)
def mark_read(alert_id: int, session: Session = Depends(get_session)):
    from app.models import SpendingAlert
    from app.schemas import SpendingAlertRead
    success = alert_service.mark_read(session, alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    alert = session.get(SpendingAlert, alert_id)
    return SpendingAlertRead.model_validate(alert)


@router.delete("/{alert_id}", status_code=204)
def delete_alert(alert_id: int, session: Session = Depends(get_session)):
    deleted = alert_service.delete_alert(session, alert_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Alert not found")
