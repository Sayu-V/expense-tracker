"""
rules_service.py
----------------
v2.1.0 — Import Rules engine.

Public API:
  apply_rules(description, amount, is_credit, db)
      → dict | None   — classification result from first matching rule

  apply_rule_retroactive(rule_id, db)
      → RetroactiveResult  — re-classify existing Expense rows

  create_quick_rule(data, db)
      → ImportRule  — one-click rule creation from the preview "Save as rule" btn

Condition fields & operators:
  description  : contains | not_contains | starts_with
  amount       : gt | lt | gte | lte | eq
  direction    : eq (value = 'credit' | 'debit')

Action types:
  set_type     : value = 'expense' | 'income' | 'investment' | 'transfer'
  set_category : value = str(category_id)
  rename       : value = new description string
  skip         : value = None   (excludes row from import)
"""

import json
from datetime import datetime
from typing import Optional

from sqlmodel import Session, select

from app.models import Category, Expense, ImportRule
from app.schemas import (
    ImportRuleCreate,
    ImportRuleRead,
    QuickRuleCreate,
    RetroactiveResult,
    RuleAction,
    RuleCondition,
)


# ---------------------------------------------------------------------------
# Condition evaluator
# ---------------------------------------------------------------------------

def _eval_condition(cond: dict, description: str, amount: float, is_credit: bool) -> bool:
    field    = cond.get("field", "")
    operator = cond.get("operator", "")
    value    = cond.get("value", "")

    if field == "description":
        desc = description.upper()
        v    = str(value).upper()
        if operator == "contains":
            return v in desc
        if operator == "not_contains":
            return v not in desc
        if operator == "starts_with":
            return desc.startswith(v)

    elif field == "amount":
        try:
            v = float(value)
        except (ValueError, TypeError):
            return False
        if operator == "gt":  return amount >  v
        if operator == "lt":  return amount <  v
        if operator == "gte": return amount >= v
        if operator == "lte": return amount <= v
        if operator == "eq":  return amount == v

    elif field == "direction":
        if operator == "eq":
            if value == "credit": return is_credit
            if value == "debit":  return not is_credit

    return False


# ---------------------------------------------------------------------------
# Rule matcher
# ---------------------------------------------------------------------------

def _rule_matches(rule: ImportRule, description: str, amount: float, is_credit: bool) -> bool:
    try:
        conditions = json.loads(rule.conditions)
    except (json.JSONDecodeError, TypeError):
        return False

    if not conditions:
        return False

    results = [_eval_condition(c, description, amount, is_credit) for c in conditions]

    if rule.condition_logic == "AND":
        return all(results)
    else:  # OR (default)
        return any(results)


# ---------------------------------------------------------------------------
# Action applicator
# ---------------------------------------------------------------------------

def _apply_actions(rule: ImportRule, db: Session) -> dict:
    """
    Execute the rule's actions and return a classification dict.
    Keys: type, category_id, category_name, rename_to, skip,
          matched_rule_id, matched_rule_name, match_source, confidence
    """
    try:
        actions = json.loads(rule.actions)
    except (json.JSONDecodeError, TypeError):
        actions = []

    result = {
        "type": None,
        "category_id": None,
        "category_name": None,
        "rename_to": None,
        "skip": False,
        "matched_rule_id": rule.id,
        "matched_rule_name": rule.name,
        "match_source": "rule",
        "confidence": "high",
    }

    for act in actions:
        action = act.get("action", "")
        value  = act.get("value")

        if action == "set_type" and value:
            result["type"] = value

        elif action == "set_category" and value:
            try:
                cat_id = int(value)
                cat = db.get(Category, cat_id)
                if cat:
                    result["category_id"] = cat_id
                    result["category_name"] = cat.name
            except (ValueError, TypeError):
                pass

        elif action == "rename" and value:
            result["rename_to"] = str(value)

        elif action == "skip":
            result["skip"] = True

    return result


# ---------------------------------------------------------------------------
# Public: apply_rules
# ---------------------------------------------------------------------------

def apply_rules(
    description: str,
    amount: float,
    is_credit: bool,
    db: Session,
) -> Optional[dict]:
    """
    Check all active ImportRules in priority order.
    Returns a classification dict from the first matching rule, or None.
    Also increments match_count and sets last_matched_at on the rule.
    """
    rules = db.exec(
        select(ImportRule)
        .where(ImportRule.is_active == True)   # noqa: E712
        .order_by(ImportRule.priority, ImportRule.id)
    ).all()

    for rule in rules:
        if _rule_matches(rule, description, amount, is_credit):
            result = _apply_actions(rule, db)
            # Update stats
            rule.match_count += 1
            rule.last_matched_at = datetime.utcnow()
            rule.updated_at = datetime.utcnow()
            db.add(rule)
            # Don't commit here — caller commits after building full batch
            return result

    return None


# ---------------------------------------------------------------------------
# Public: apply_rule_retroactive
# ---------------------------------------------------------------------------

def apply_rule_retroactive(rule_id: int, db: Session) -> RetroactiveResult:
    """
    Re-classify all existing Expense rows that match a given rule.
    Updates type, category_id, and description as instructed by the rule's actions.
    """
    rule = db.get(ImportRule, rule_id)
    if not rule:
        raise ValueError(f"Rule {rule_id} not found")

    expenses = db.exec(select(Expense)).all()
    updated_count = 0

    for exp in expenses:
        is_credit = (exp.type == "income")
        if _rule_matches(rule, exp.description, exp.amount, is_credit):
            result = _apply_actions(rule, db)

            if result["type"] and result["type"] not in ("investment", "transfer"):
                exp.type = result["type"]

            if result["category_id"]:
                exp.category_id = result["category_id"]

            if result["rename_to"]:
                exp.description = result["rename_to"][:200]

            exp.updated_at = datetime.utcnow()
            db.add(exp)
            updated_count += 1

    if updated_count:
        rule.match_count += updated_count
        rule.last_matched_at = datetime.utcnow()
        db.add(rule)

    db.commit()

    return RetroactiveResult(
        updated_count=updated_count,
        rule_id=rule_id,
        rule_name=rule.name,
    )


# ---------------------------------------------------------------------------
# Public: create_quick_rule
# ---------------------------------------------------------------------------

def create_quick_rule(data: QuickRuleCreate, db: Session) -> ImportRule:
    """
    One-click rule creation from the import preview table's 'Save as rule' button.
    Creates a single-condition rule: description contains <keyword>.
    """
    conditions = [
        {"field": "description", "operator": "contains", "value": data.description_keyword.upper()}
    ]
    actions = [{"action": "set_type", "value": data.set_type}]

    if data.category_id:
        actions.append({"action": "set_category", "value": str(data.category_id)})

    if data.rename_to:
        actions.append({"action": "rename", "value": data.rename_to})

    rule = ImportRule(
        name=data.rule_name,
        priority=5,
        is_active=True,
        condition_logic="OR",
        conditions=json.dumps(conditions),
        actions=json.dumps(actions),
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)

    if data.apply_retroactive:
        apply_rule_retroactive(rule.id, db)

    return rule


# ---------------------------------------------------------------------------
# Helper: serialize rule for API response
# ---------------------------------------------------------------------------

def rule_to_read(rule: ImportRule) -> ImportRuleRead:
    """Convert ImportRule ORM object to the Pydantic read schema."""
    try:
        conds = [RuleCondition(**c) for c in json.loads(rule.conditions)]
    except Exception:
        conds = []
    try:
        acts = [RuleAction(**a) for a in json.loads(rule.actions)]
    except Exception:
        acts = []

    return ImportRuleRead(
        id=rule.id,
        name=rule.name,
        priority=rule.priority,
        is_active=rule.is_active,
        condition_logic=rule.condition_logic,
        conditions=conds,
        actions=acts,
        match_count=rule.match_count,
        last_matched_at=rule.last_matched_at,
        created_at=rule.created_at,
    )
