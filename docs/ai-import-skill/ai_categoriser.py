"""
ai_categoriser.py
-----------------
Standalone Claude batch classifier for bank transactions.
Part of the ai-bank-import Claude Skill.

Usage:
    from ai_categoriser import classify_batch

    results = classify_batch(
        transactions=[
            {"index": 0, "description": "UPI/DR/991233/PETROLBUNK/OKHDFC", "is_credit": False},
            {"index": 1, "description": "NEFT/CR/SURESH KUMAR TRADING CO",  "is_credit": True},
        ],
        available_categories=["Food", "Transport", "Fuel", "Shopping", "Business Income", ...],
        api_key="your-anthropic-api-key",
        model="claude-haiku-4-5-20251001",   # cheapest, fastest
    )
"""

import json
import hashlib
import re
from typing import Optional

try:
    import httpx
except ImportError:
    raise ImportError("Install httpx: pip install httpx")


# ---------------------------------------------------------------------------
# Normalise description for caching (strip ref numbers, extra spaces)
# ---------------------------------------------------------------------------

def _normalise_desc(description: str) -> str:
    """Remove variable parts (ref numbers, timestamps) for stable cache keys."""
    # Remove UPI ref numbers: UPI/DR/498123/ → UPI/DR/*/
    desc = re.sub(r"(UPI/(?:DR|CR)/)\d+/", r"\1*/", description.upper())
    # Remove NEFT/IMPS ref numbers
    desc = re.sub(r"((?:NEFT|IMPS|RTGS)/)[A-Z0-9]+/", r"\1*/", desc)
    # Collapse whitespace
    desc = " ".join(desc.split())
    return desc


def _cache_key(description: str) -> str:
    normalised = _normalise_desc(description)
    return hashlib.sha256(normalised.encode()).hexdigest()


# ---------------------------------------------------------------------------
# Main classifier
# ---------------------------------------------------------------------------

def classify_batch(
    transactions: list[dict],
    available_categories: list[str],
    api_key: str,
    model: str = "claude-haiku-4-5-20251001",
    cache: Optional[dict] = None,     # Pass a dict to enable in-memory caching
) -> list[dict]:
    """
    Classify a batch of bank transactions using Claude.

    Args:
        transactions: list of dicts with keys:
            - index: int
            - description: str (bank description text)
            - is_credit: bool (True = deposit, False = withdrawal)
        available_categories: list of category name strings from the DB
        api_key: Anthropic API key
        model: Claude model string
        cache: optional dict for in-memory caching {cache_key: result}

    Returns:
        list of dicts with keys:
            - index: int
            - type: str (expense | income | investment | transfer | unknown)
            - category_name: str
            - clean_description: str
            - confidence: int (0–100)
            - reasoning: str
            - from_cache: bool
    """
    if not transactions:
        return []

    results = []
    to_classify = []

    # Check cache first
    for txn in transactions:
        key = _cache_key(txn["description"])
        if cache is not None and key in cache:
            cached = dict(cache[key])
            cached["index"] = txn["index"]
            cached["from_cache"] = True
            results.append(cached)
        else:
            to_classify.append((txn, key))

    if not to_classify:
        return sorted(results, key=lambda x: x["index"])

    # Build prompt
    cat_list = ", ".join(available_categories)
    txn_lines = "\n".join(
        f"{txn['index']} | {txn['description']} | {'CREDIT' if txn['is_credit'] else 'DEBIT'}"
        for txn, _ in to_classify
    )

    system_prompt = (
        "You are a bank transaction classifier for an Indian personal finance app. "
        "Classify each transaction. Return a JSON array (no markdown, raw JSON only) "
        "with one object per transaction in the same order as input. "
        "Each object must have: index (int), type (expense|income|investment|transfer|unknown), "
        "category_name (from the provided list exactly), clean_description (short human-readable name, "
        "max 40 chars), confidence (0-100 int), reasoning (one sentence). "
        "If confidence < 60, set type to 'unknown'. "
        "For Indian merchants: SILKS/SAREES→Shopping, PETROL/BUNK→Fuel, "
        "MEDICAL/PHARMA→Health, TRADING CO→Business Income (if credit)."
    )

    user_prompt = (
        f"Available categories: {cat_list}\n\n"
        f"Transactions (index | description | direction):\n{txn_lines}\n\n"
        "Return JSON array only."
    )

    # Call Claude API
    response = httpx.post(
        "https://api.anthropic.com/v1/messages",
        headers={
            "x-api-key": api_key,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
        },
        json={
            "model": model,
            "max_tokens": 2048,
            "system": system_prompt,
            "messages": [{"role": "user", "content": user_prompt}],
        },
        timeout=30.0,
    )
    response.raise_for_status()

    raw_text = response.json()["content"][0]["text"].strip()

    # Strip markdown code fences if present
    raw_text = re.sub(r"^```(?:json)?\s*", "", raw_text)
    raw_text = re.sub(r"\s*```$", "", raw_text)

    ai_results = json.loads(raw_text)

    # Merge with cache
    for item in ai_results:
        item["from_cache"] = False
        # Store in cache
        if cache is not None:
            original_txn = next((t for t, _ in to_classify if t["index"] == item["index"]), None)
            if original_txn:
                key = _cache_key(original_txn["description"])
                cache[key] = {k: v for k, v in item.items() if k != "index"}
        results.append(item)

    return sorted(results, key=lambda x: x["index"])


# ---------------------------------------------------------------------------
# CLI demo
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import os

    demo_txns = [
        {"index": 0, "description": "UPI/DR/991233/PETROLBUNK/OKHDFC",     "is_credit": False},
        {"index": 1, "description": "NEFT/CR/SURESH KUMAR TRADING CO",      "is_credit": True},
        {"index": 2, "description": "IMPS/331209/KAVITHA SILKS/ICICI",      "is_credit": False},
        {"index": 3, "description": "UPI/DR/884123/MALLIKARJ STORES/OKAXIS","is_credit": False},
        {"index": 4, "description": "ATM/WDL/KANARA BANK MANGALORE BR",     "is_credit": False},
    ]

    demo_cats = [
        "Food", "Transport", "Fuel", "Shopping", "Health", "Entertainment",
        "Housing", "Other", "Salary", "Rental Income", "Business Income",
        "Interest Income", "Investments", "Bank Charges", "Cash Withdrawal",
    ]

    api_key = os.environ.get("ANTHROPIC_API_KEY", "")
    if not api_key:
        print("Set ANTHROPIC_API_KEY environment variable to run the demo.")
    else:
        cache = {}
        results = classify_batch(demo_txns, demo_cats, api_key, cache=cache)
        print(json.dumps(results, indent=2))
