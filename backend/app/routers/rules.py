"""
rules.py — Router
------------------
v2.1.0 — Import Rules CRUD + retroactive apply + quick-rule creation.

Endpoints:
  GET    /import-rules                    → list all rules ordered by priority
  POST   /import-rules                    → create rule
  PUT    /import-rules/{id}               → update rule
  DELETE /import-rules/{id}               → delete rule
  POST   /import-rules/{id}/retroactive   → re-classify existing transactions
  POST   /import-rules/quick              → one-click "Save as rule" from preview
"""

import json

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.database import get_session
from app.models import ImportRule
from app.schemas import (
    ImportRuleCreate,
    ImportRuleRead,
    ImportRuleUpdate,
    QuickRuleCreate,
    RetroactiveResult,
)
from app.services.rules_service import (
    apply_rule_retroactive,
    create_quick_rule,
    rule_to_read,
)

router = APIRouter(tags=["Import Rules"])


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get(
    "/import-rules",
    response_model=list[ImportRuleRead],
    summary="List all import rules ordered by priority",
)
def list_import_rules(db: Session = Depends(get_session)):
    rules = db.exec(
        select(ImportRule).order_by(ImportRule.priority, ImportRule.id)
    ).all()
    return [rule_to_read(r) for r in rules]


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

@router.post(
    "/import-rules",
    response_model=ImportRuleRead,
    status_code=201,
    summary="Create an import rule",
)
def create_import_rule(
    data: ImportRuleCreate,
    db: Session = Depends(get_session),
):
    rule = ImportRule(
        name=data.name,
        priority=data.priority,
        condition_logic=data.condition_logic,
        conditions=json.dumps([c.model_dump() for c in data.conditions]),
        actions=json.dumps([a.model_dump() for a in data.actions]),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    if data.apply_retroactive:
        try:
            apply_rule_retroactive(rule.id, db)
        except Exception:
            pass  # Don't fail rule creation if retroactive has issues

    return rule_to_read(rule)


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

@router.put(
    "/import-rules/{rule_id}",
    response_model=ImportRuleRead,
    summary="Update an import rule",
)
def update_import_rule(
    rule_id: int,
    data: ImportRuleUpdate,
    db: Session = Depends(get_session),
):
    rule = db.get(ImportRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")

    if data.name is not None:
        rule.name = data.name
    if data.priority is not None:
        rule.priority = data.priority
    if data.is_active is not None:
        rule.is_active = data.is_active
    if data.condition_logic is not None:
        rule.condition_logic = data.condition_logic
    if data.conditions is not None:
        rule.conditions = json.dumps([c.model_dump() for c in data.conditions])
    if data.actions is not None:
        rule.actions = json.dumps([a.model_dump() for a in data.actions])

    from datetime import datetime
    rule.updated_at = datetime.utcnow()

    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule_to_read(rule)


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------

@router.delete(
    "/import-rules/{rule_id}",
    status_code=204,
    summary="Delete an import rule",
)
def delete_import_rule(
    rule_id: int,
    db: Session = Depends(get_session),
):
    rule = db.get(ImportRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    db.delete(rule)
    db.commit()


# ---------------------------------------------------------------------------
# Retroactive apply
# ---------------------------------------------------------------------------

@router.post(
    "/import-rules/{rule_id}/retroactive",
    response_model=RetroactiveResult,
    summary="Re-classify existing transactions using this rule",
)
def retroactive_apply(
    rule_id: int,
    db: Session = Depends(get_session),
):
    """
    Scans all existing Expense rows and re-classifies any that match this rule.
    Updates type, category_id, and description as defined by the rule's actions.
    Returns the number of transactions updated.
    """
    try:
        result = apply_rule_retroactive(rule_id, db)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return result


# ---------------------------------------------------------------------------
# Quick rule (Save as rule shortcut)
# ---------------------------------------------------------------------------

@router.post(
    "/import-rules/quick",
    response_model=ImportRuleRead,
    status_code=201,
    summary="One-click rule creation from import preview table",
)
def quick_create_rule(
    data: QuickRuleCreate,
    db: Session = Depends(get_session),
):
    """
    Called when user clicks 'Save as rule' on a manually-fixed row in the
    import preview table. Creates a single-condition rule instantly.
    """
    rule = create_quick_rule(data, db)
    return rule_to_read(rule)
