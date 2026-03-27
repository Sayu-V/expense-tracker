"""
goal_service.py
---------------
Business logic for the savings Goal Tracker.

Progress computation:
  - percent_complete  = (current_amount / target_amount) * 100
  - remaining_amount  = max(0, target_amount - current_amount)
  - projected_completion_date — extrapolated from the average daily save rate
    since the goal was created (only when current_amount > 0 and remaining > 0)
  - days_remaining — calendar days until the deadline (None if no deadline)
"""

from datetime import date, timedelta, datetime
from sqlmodel import Session, select

from app.models import Goal
from app.schemas import GoalCreate, GoalUpdate, GoalProgress


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _compute_progress(goal: Goal) -> GoalProgress:
    today = date.today()
    percent = min(100.0, round((goal.current_amount / goal.target_amount) * 100, 1))
    remaining = max(0.0, round(goal.target_amount - goal.current_amount, 2))

    # Projected completion date
    projected: date | None = None
    days_since_creation = (today - goal.created_at.date()).days or 1
    if goal.current_amount > 0 and remaining > 0 and days_since_creation > 0:
        daily_rate = goal.current_amount / days_since_creation   # avg ₹/day saved
        if daily_rate > 0:
            days_needed = int(remaining / daily_rate) + 1
            projected = today + timedelta(days=days_needed)

    # Days remaining to deadline
    days_remaining: int | None = None
    if goal.deadline:
        days_remaining = max(0, (goal.deadline - today).days)

    return GoalProgress(
        id=goal.id,
        name=goal.name,
        description=goal.description,
        target_amount=goal.target_amount,
        current_amount=goal.current_amount,
        deadline=goal.deadline,
        is_completed=goal.is_completed,
        created_at=goal.created_at,
        updated_at=goal.updated_at,
        percent_complete=percent,
        remaining_amount=remaining,
        projected_completion_date=projected,
        days_remaining=days_remaining,
    )


# ---------------------------------------------------------------------------
# CRUD
# ---------------------------------------------------------------------------

def list_goals(session: Session) -> list[GoalProgress]:
    goals = session.exec(
        select(Goal).order_by(Goal.created_at.desc())
    ).all()
    return [_compute_progress(g) for g in goals]


def get_goal(session: Session, goal_id: int) -> GoalProgress | None:
    goal = session.get(Goal, goal_id)
    if not goal:
        return None
    return _compute_progress(goal)


def create_goal(session: Session, data: GoalCreate) -> GoalProgress:
    goal = Goal(
        name=data.name,
        description=data.description,
        target_amount=data.target_amount,
        current_amount=data.current_amount,
        deadline=data.deadline,
        is_completed=False,
    )
    session.add(goal)
    session.commit()
    session.refresh(goal)
    return _compute_progress(goal)


def update_goal(session: Session, goal_id: int, data: GoalUpdate) -> GoalProgress | None:
    goal = session.get(Goal, goal_id)
    if not goal:
        return None
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(goal, field, value)
    goal.updated_at = datetime.utcnow()

    # Auto-complete if current >= target
    if goal.current_amount >= goal.target_amount:
        goal.is_completed = True

    session.add(goal)
    session.commit()
    session.refresh(goal)
    return _compute_progress(goal)


def delete_goal(session: Session, goal_id: int) -> bool:
    goal = session.get(Goal, goal_id)
    if not goal:
        return False
    session.delete(goal)
    session.commit()
    return True
