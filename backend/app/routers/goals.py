"""
routers/goals.py
----------------
REST endpoints for the savings Goal Tracker.

Routes:
  GET    /goals           — list all goals with progress
  POST   /goals           — create a new goal
  GET    /goals/{id}      — get one goal with progress
  PUT    /goals/{id}      — update a goal (amount, deadline, name, etc.)
  DELETE /goals/{id}      — delete a goal
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from app.database import get_session
from app.schemas import GoalCreate, GoalUpdate, GoalProgress
from app.services import goal_service

router = APIRouter(prefix="/goals", tags=["Goals"])


@router.get("", response_model=list[GoalProgress])
def list_goals(session: Session = Depends(get_session)):
    return goal_service.list_goals(session)


@router.post("", response_model=GoalProgress, status_code=201)
def create_goal(data: GoalCreate, session: Session = Depends(get_session)):
    try:
        return goal_service.create_goal(session, data)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{goal_id}", response_model=GoalProgress)
def get_goal(goal_id: int, session: Session = Depends(get_session)):
    goal = goal_service.get_goal(session, goal_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.put("/{goal_id}", response_model=GoalProgress)
def update_goal(
    goal_id: int, data: GoalUpdate, session: Session = Depends(get_session)
):
    goal = goal_service.update_goal(session, goal_id, data)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, session: Session = Depends(get_session)):
    deleted = goal_service.delete_goal(session, goal_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Goal not found")
