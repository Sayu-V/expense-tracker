"""
services/categorize_service.py
--------------------------------
v1.1.0 — AI Auto-Categorisation via keyword matching.

No external API required. Uses a curated keyword→category map to suggest
the most likely category for a description string.

Strategy:
  1. Lowercase + split the description into tokens.
  2. For each category's keyword list, count how many tokens match.
  3. Return the category with the highest match score.
  4. If no keywords match at all, return None (caller falls back to "Other").

Confidence:
  - 'high'  → at least one keyword matched
  - 'low'   → no match found (None returned)
"""

from __future__ import annotations

import re
from typing import Optional

from sqlmodel import Session, select

from app.models import Category


# ---------------------------------------------------------------------------
# Keyword map — category name → list of trigger keywords / phrases
# ---------------------------------------------------------------------------

KEYWORD_MAP: dict[str, list[str]] = {
    "Food": [
        "food", "eat", "lunch", "dinner", "breakfast", "snack", "meal",
        "restaurant", "cafe", "coffee", "tea", "pizza", "burger", "biryani",
        "curry", "rice", "noodle", "sushi", "sandwich", "juice", "drink",
        "grocery", "groceries", "vegetables", "fruit", "milk", "bread",
        "swiggy", "zomato", "dominos", "kfc", "mcdonalds", "subway",
        "hotel", "canteen", "bakery", "chai", "dosa", "idli", "samosa",
    ],
    "Transport": [
        "transport", "travel", "bus", "auto", "rickshaw", "cab", "taxi",
        "uber", "ola", "train", "metro", "flight", "fuel", "petrol",
        "diesel", "parking", "toll", "bike", "cycle", "ferry", "boat",
        "rapido", "redbus", "irctc", "airport", "station", "ticket",
    ],
    "Housing": [
        "rent", "house", "home", "flat", "apartment", "pg", "hostel",
        "electricity", "water", "wifi", "internet", "maintenance", "repair",
        "plumber", "electrician", "furniture", "household", "cleaning",
        "maid", "gas", "cylinder", "broadband",
    ],
    "Health": [
        "health", "medical", "medicine", "doctor", "hospital", "clinic",
        "pharmacy", "chemist", "prescription", "lab", "test", "scan",
        "dentist", "eye", "glasses", "gym", "fitness", "yoga", "therapy",
        "insurance", "apollo", "1mg", "netmeds", "practo",
    ],
    "Entertainment": [
        "entertainment", "movie", "cinema", "theatre", "netflix", "prime",
        "hotstar", "spotify", "music", "game", "gaming", "ps5", "xbox",
        "event", "concert", "show", "party", "outing", "trip", "tour",
        "vacation", "holiday", "hotel stay", "resort", "book", "kindle",
        "youtube", "subscription", "ott",
    ],
    "Shopping": [
        "shopping", "clothes", "shirt", "pants", "shoes", "dress", "jacket",
        "fashion", "amazon", "flipkart", "myntra", "ajio", "meesho",
        "electronics", "phone", "laptop", "gadget", "accessories",
        "gift", "jewellery", "watch", "cosmetics", "beauty", "skincare",
        "stationery", "pen", "notebook", "bag",
    ],
    "Other": [
        "miscellaneous", "misc", "other", "fee", "fine", "penalty",
        "donation", "charity", "subscription", "membership", "atm",
        "cash", "transfer",
    ],
}


def _tokenize(text: str) -> list[str]:
    """Lowercase and split into word tokens, keeping multi-word phrases."""
    return re.findall(r"[a-z0-9]+", text.lower())


def suggest_category(
    session: Session, description: str
) -> tuple[Optional[Category], str]:
    """
    Returns (Category | None, confidence).

    confidence is 'high' if keywords matched, 'low' otherwise.
    """
    tokens = set(_tokenize(description))
    # Also test the raw lowercased description for substring matches
    desc_lower = description.lower()

    best_category_name: Optional[str] = None
    best_score = 0

    for category_name, keywords in KEYWORD_MAP.items():
        score = 0
        for kw in keywords:
            # Token match (exact word) or substring match for phrases
            if kw in tokens or kw in desc_lower:
                score += 1
        if score > best_score:
            best_score = score
            best_category_name = category_name

    if best_category_name is None or best_score == 0:
        return None, "low"

    # Look up the Category row by name
    category = session.exec(
        select(Category).where(Category.name == best_category_name)
    ).first()

    return category, "high"
