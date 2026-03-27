"""
services/categorize_service.py
--------------------------------
v1.1.0 — AI Auto-Categorisation via keyword matching.
v1.2.0 — Separate keyword maps for expense vs income categories.

No external API required. Uses a curated keyword→category map to suggest
the most likely category for a description string.

Strategy:
  1. Lowercase + split the description into tokens.
  2. Pick the keyword map based on entry_type ('expense' | 'income').
  3. For each category's keyword list, count how many tokens match.
  4. Return the category with the highest match score.
  5. If no keywords match at all, return None (caller falls back to first category).

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
# Expense keyword map
# ---------------------------------------------------------------------------

EXPENSE_KEYWORD_MAP: dict[str, list[str]] = {
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


# ---------------------------------------------------------------------------
# Income keyword map  (v1.2.0)
# ---------------------------------------------------------------------------

INCOME_KEYWORD_MAP: dict[str, list[str]] = {
    "Salary": [
        "salary", "wage", "wages", "pay", "payroll", "monthly pay",
        "ctc", "hike", "appraisal", "job", "employment", "stipend",
        "payday", "compensation", "bonus", "increment",
    ],
    "Pocket Money": [
        "pocket money", "pocket", "allowance", "parents", "family",
        "monthly allowance", "weekly allowance", "personal allowance",
        "dad", "mom", "father", "mother", "home money",
    ],
    "Freelance": [
        "freelance", "freelancing", "client", "project payment", "invoice",
        "upwork", "fiverr", "toptal", "contract", "consulting", "gig",
        "design payment", "development payment", "writing payment",
    ],
    "Side Hustle": [
        "side hustle", "side income", "part time", "part-time", "extra income",
        "secondary", "weekend job", "tutoring", "tuition", "coaching",
        "teaching", "delivery", "youtube", "content", "creator", "affiliate",
        "commission", "referral",
    ],
    "Stocks": [
        "stocks", "stock", "equity", "shares", "zerodha", "groww", "upstox",
        "trading", "intraday", "swing trade", "capital gain", "ipo",
        "demat", "nse", "bse", "sensex", "nifty",
    ],
    "Dividend": [
        "dividend", "dividends", "interest", "fd", "fixed deposit",
        "rd", "recurring deposit", "mutual fund", "mf", "sip",
        "return", "yield", "payout", "profit",
    ],
    "Gift": [
        "gift", "birthday gift", "received", "cash gift", "prize",
        "reward", "cashback", "refund", "lottery", "won", "winning",
        "award", "scholarship",
    ],
    "Rental Income": [
        "rent received", "rental", "tenant", "property", "house rent",
        "room rent", "pg income", "sublease", "airbnb", "lease",
    ],
}


def _tokenize(text: str) -> list[str]:
    """Lowercase and split into word tokens."""
    return re.findall(r"[a-z0-9]+", text.lower())


def suggest_category(
    session: Session,
    description: str,
    entry_type: str = "expense",
) -> tuple[Optional[Category], str]:
    """
    Returns (Category | None, confidence).
    confidence is 'high' if keywords matched, 'low' otherwise.

    entry_type: 'expense' | 'income' — selects which keyword map to use.
    """
    keyword_map = INCOME_KEYWORD_MAP if entry_type == "income" else EXPENSE_KEYWORD_MAP

    tokens = set(_tokenize(description))
    desc_lower = description.lower()

    best_category_name: Optional[str] = None
    best_score = 0

    for category_name, keywords in keyword_map.items():
        score = 0
        for kw in keywords:
            if kw in tokens or kw in desc_lower:
                score += 1
        if score > best_score:
            best_score = score
            best_category_name = category_name

    if best_category_name is None or best_score == 0:
        return None, "low"

    category = session.exec(
        select(Category).where(Category.name == best_category_name)
    ).first()

    return category, "high"
