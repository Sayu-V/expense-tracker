"""
services/chat_service.py
------------------------
v1.5.0 — Keyword-based NLP chat service.

Parses natural-language questions about the user's expense data and returns
a structured ChatResponse with a text answer and optional chart data.
No external AI API required — runs entirely on local DB queries.

Supported question types:
  • Total spending for a period
  • Spending by category (pie chart)
  • Spending on a specific category
  • Income vs expenses (bar chart)
  • Budget status
  • 6-month trend (line chart)
  • Top 5 expenses by amount
  • Savings rate
  • Greetings / help
"""

from calendar import monthrange
from datetime import date, timedelta
from typing import Optional, Tuple

from sqlmodel import Session, select, func

from app.models import Budget, Category, Expense

# ── Month name → number ───────────────────────────────────────────────────────

_MONTHS = {
    "jan": 1, "january": 1, "feb": 2, "february": 2, "mar": 3, "march": 3,
    "apr": 4, "april": 4, "may": 5, "jun": 6, "june": 6,
    "jul": 7, "july": 7, "aug": 8, "august": 8, "sep": 9, "september": 9,
    "oct": 10, "october": 10, "nov": 11, "november": 11, "dec": 12, "december": 12,
}

# Category name keywords for natural-language matching
_CATEGORY_KW = {
    "food": ["food", "eat", "meal", "lunch", "dinner", "breakfast", "snack", "grocery", "groceries", "restaurant"],
    "transport": ["transport", "travel", "car", "fuel", "petrol", "bus", "train", "taxi", "uber", "metro", "auto"],
    "housing": ["housing", "house", "rent", "home", "electricity", "water", "utility"],
    "health": ["health", "medical", "doctor", "medicine", "hospital", "pharmacy", "gym"],
    "entertainment": ["entertainment", "movie", "game", "streaming", "netflix", "fun", "outing"],
    "shopping": ["shopping", "clothes", "fashion", "amazon", "flipkart", "online", "purchase"],
    "salary": ["salary", "wage", "pay", "paycheck"],
    "freelance": ["freelance", "contract"],
}

_DEFAULT_QUICK_REPLIES = [
    "How much did I spend this month?",
    "Show my biggest expense category",
    "How am I doing on my budget?",
    "Show income vs expenses",
    "What are my top 5 expenses?",
    "Show 6-month spending trend",
]


# ── Period detection ──────────────────────────────────────────────────────────

def _detect_period(msg: str) -> Tuple[date, date]:
    today = date.today()

    if "this month" in msg or "current month" in msg:
        return date(today.year, today.month, 1), today

    if "last month" in msg or "previous month" in msg:
        first_this = date(today.year, today.month, 1)
        last_month_end = first_this - timedelta(days=1)
        return date(last_month_end.year, last_month_end.month, 1), last_month_end

    if "this week" in msg:
        start = today - timedelta(days=today.weekday())
        return start, today

    if "last week" in msg:
        start = today - timedelta(days=today.weekday() + 7)
        return start, start + timedelta(days=6)

    if "this year" in msg or "current year" in msg:
        return date(today.year, 1, 1), today

    if "last year" in msg:
        return date(today.year - 1, 1, 1), date(today.year - 1, 12, 31)

    if "today" in msg:
        return today, today

    # Named month: "in january", "during march", etc.
    for name, num in _MONTHS.items():
        if name in msg:
            yr = today.year
            if num > today.month:
                yr -= 1  # must be previous year
            last_day = monthrange(yr, num)[1]
            return date(yr, num, 1), date(yr, num, last_day)

    # Default: current month
    return date(today.year, today.month, 1), today


# ── Helpers ───────────────────────────────────────────────────────────────────

def _fmt(amount: float) -> str:
    return f"₹{amount:,.0f}"


def _period_label(d_from: date, d_to: date) -> str:
    if d_from == d_to:
        return d_from.strftime("%d %b %Y")
    if d_from.month == d_to.month and d_from.year == d_to.year:
        return d_from.strftime("%B %Y")
    return f"{d_from.strftime('%d %b')} – {d_to.strftime('%d %b %Y')}"


def _sum_amount(session: Session, entry_type: str, d_from: date, d_to: date) -> float:
    result = session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.type == entry_type,
            Expense.date >= d_from,
            Expense.date <= d_to,
        )
    ).first()
    return round(result or 0.0, 2)


# ── Responders ────────────────────────────────────────────────────────────────

def _resp_total_spend(session: Session, d_from: date, d_to: date) -> dict:
    total = _sum_amount(session, "expense", d_from, d_to)
    income = _sum_amount(session, "income", d_from, d_to)
    period = _period_label(d_from, d_to)
    net_part = f" Your income was **{_fmt(income)}** — net balance: **{_fmt(income - total)}**." if income > 0 else ""
    return {
        "answer": f"You spent **{_fmt(total)}** in {period}.{net_part}",
        "chart_type": "none", "chart_data": [], "chart_title": "",
        "quick_replies": ["Show spending breakdown", "What are my top 5 expenses?", "How are my budgets?"],
    }


def _resp_category_breakdown(session: Session, d_from: date, d_to: date) -> dict:
    rows = session.exec(
        select(Category.name, Category.color, func.sum(Expense.amount))
        .join(Expense, Expense.category_id == Category.id)
        .where(Expense.type == "expense", Expense.date >= d_from, Expense.date <= d_to)
        .group_by(Category.id)
        .order_by(func.sum(Expense.amount).desc())
    ).all()

    period = _period_label(d_from, d_to)
    if not rows:
        return {"answer": f"No expenses found for {period}.", "chart_type": "none", "chart_data": [], "chart_title": "",
                "quick_replies": _DEFAULT_QUICK_REPLIES}

    total = sum(r[2] for r in rows)
    top = rows[0]
    answer = (
        f"Your biggest category in {period} is **{top[0]}** at {_fmt(top[2])} "
        f"({round(top[2]/total*100, 1)}% of {_fmt(total)} total). Here's the full breakdown:"
    )
    chart_data = [{"label": r[0], "value": round(r[2], 2), "color": r[1]} for r in rows[:8]]
    return {
        "answer": answer, "chart_type": "pie",
        "chart_data": chart_data, "chart_title": f"Spending by Category — {period}",
        "quick_replies": ["How are my budgets?", "Show top 5 expenses", "What are my savings?"],
    }


def _resp_specific_category(session: Session, category: Category, d_from: date, d_to: date) -> dict:
    total = session.exec(
        select(func.sum(Expense.amount)).where(
            Expense.category_id == category.id, Expense.date >= d_from, Expense.date <= d_to,
        )
    ).first() or 0.0
    count = session.exec(
        select(func.count(Expense.id)).where(
            Expense.category_id == category.id, Expense.date >= d_from, Expense.date <= d_to,
        )
    ).first() or 0
    period = _period_label(d_from, d_to)
    return {
        "answer": (f"You spent **{_fmt(total)}** on **{category.emoji} {category.name}** in {period} "
                   f"across {count} transaction{'s' if count != 1 else ''}."),
        "chart_type": "none", "chart_data": [], "chart_title": "",
        "quick_replies": ["Show all categories", "How is my overall budget?", "Show top 5 expenses"],
    }


def _resp_income(session: Session, d_from: date, d_to: date) -> dict:
    income = _sum_amount(session, "income", d_from, d_to)
    expenses = _sum_amount(session, "expense", d_from, d_to)
    period = _period_label(d_from, d_to)
    chart_data = [
        {"label": "Income", "value": income, "color": "#34C759"},
        {"label": "Expenses", "value": expenses, "color": "#FF3B30"},
    ]
    return {
        "answer": (f"Your income for {period} is **{_fmt(income)}**. "
                   f"After expenses of {_fmt(expenses)}, net balance is **{_fmt(income - expenses)}**."),
        "chart_type": "bar", "chart_data": chart_data, "chart_title": f"Income vs Expenses — {period}",
        "quick_replies": ["What are my savings?", "Show spending breakdown", "How are my budgets?"],
    }


def _resp_savings(session: Session, d_from: date, d_to: date) -> dict:
    income = _sum_amount(session, "income", d_from, d_to)
    expenses = _sum_amount(session, "expense", d_from, d_to)
    net = income - expenses
    period = _period_label(d_from, d_to)

    if income == 0:
        answer = f"No income recorded for {period}. Add income entries to track your savings."
    else:
        rate = round(net / income * 100, 1)
        verdict = (
            "Excellent savings! 🌟" if rate >= 20 else
            "Good savings rate. 👍" if rate >= 10 else
            "You could save a bit more. 💡" if rate > 0 else
            "Spending more than you earn — review your expenses. ⚠️"
        )
        answer = f"**Savings for {period}:** {_fmt(net)} ({rate}% of income). {verdict}"

    chart_data = [
        {"label": "Income",   "value": income,         "color": "#34C759"},
        {"label": "Expenses", "value": expenses,        "color": "#FF3B30"},
        {"label": "Savings",  "value": max(net, 0),     "color": "#5E5CE6"},
    ]
    return {
        "answer": answer, "chart_type": "bar",
        "chart_data": chart_data, "chart_title": f"Income, Expenses & Savings — {period}",
        "quick_replies": ["Show 6-month trend", "Show top 5 expenses", "Show income vs expenses"],
    }


def _resp_trend(session: Session) -> dict:
    today = date.today()
    chart_data = []
    totals = []

    for i in range(5, -1, -1):
        m = today.month - i
        y = today.year
        while m <= 0:
            m += 12
            y -= 1
        last_day = monthrange(y, m)[1]
        start, end = date(y, m, 1), date(y, m, last_day)
        spent = _sum_amount(session, "expense", start, end)
        totals.append(spent)
        chart_data.append({"label": start.strftime("%b"), "value": spent, "color": "#5E5CE6"})

    avg = sum(totals) / len(totals) if totals else 0
    return {
        "answer": (f"Here are your spending trends over the last 6 months. "
                   f"Average monthly spend: **{_fmt(avg)}**."),
        "chart_type": "line", "chart_data": chart_data, "chart_title": "6-Month Spending Trend",
        "quick_replies": ["What's my biggest category?", "How are my budgets?", "What are my savings?"],
    }


def _resp_budget(session: Session, d_from: date, d_to: date) -> dict:
    month, year = d_from.month, d_from.year
    budgets = session.exec(
        select(Budget).where(Budget.month == month, Budget.year == year)
    ).all()

    period = _period_label(d_from, d_to)
    if not budgets:
        return {
            "answer": f"No budgets set for {period}. Head to the Budgets page to add some!",
            "chart_type": "none", "chart_data": [], "chart_title": "",
            "quick_replies": _DEFAULT_QUICK_REPLIES,
        }

    last_day = monthrange(year, month)[1]
    start, end = date(year, month, 1), date(year, month, last_day)
    over, on_track, chart_data = [], [], []

    for b in budgets:
        actual = session.exec(
            select(func.sum(Expense.amount)).where(
                Expense.category_id == b.category_id,
                Expense.date >= start, Expense.date <= end,
                Expense.type == "expense",
            )
        ).first() or 0.0
        cat = session.get(Category, b.category_id)
        name = cat.name if cat else "Unknown"
        pct = round(actual / b.amount * 100) if b.amount > 0 else 0
        label = f"{name} ({_fmt(actual)}/{_fmt(b.amount)}, {pct}%)"
        (over if actual > b.amount else on_track).append(label)
        chart_data.append({"label": name, "value": round(actual, 2), "color": cat.color if cat else "#6b7280"})

    if over:
        answer = f"⚠️ Over budget on: {', '.join(over)}." + (f" On track: {', '.join(on_track)}." if on_track else "")
    else:
        answer = f"✅ On track with all {len(budgets)} budgets for {period}! ({', '.join(on_track)})"

    return {
        "answer": answer, "chart_type": "bar",
        "chart_data": chart_data, "chart_title": f"Budget vs Actual — {period}",
        "quick_replies": ["Show spending breakdown", "What are my top expenses?", "Show income vs expenses"],
    }


def _resp_top_expenses(session: Session, d_from: date, d_to: date) -> dict:
    rows = session.exec(
        select(Expense.description, Expense.amount, Category.name)
        .join(Category, Expense.category_id == Category.id, isouter=True)
        .where(Expense.type == "expense", Expense.date >= d_from, Expense.date <= d_to)
        .order_by(Expense.amount.desc())
        .limit(5)
    ).all()

    period = _period_label(d_from, d_to)
    if not rows:
        return {"answer": f"No expenses found for {period}.", "chart_type": "none", "chart_data": [], "chart_title": "",
                "quick_replies": _DEFAULT_QUICK_REPLIES}

    items = "  \n".join([f"{i+1}. {r[0]} — {_fmt(r[1])} ({r[2]})" for i, r in enumerate(rows)])
    chart_data = [{"label": r[0][:22], "value": round(r[1], 2), "color": "#5E5CE6"} for r in rows]
    return {
        "answer": f"Your top 5 expenses in {period}:  \n{items}",
        "chart_type": "bar", "chart_data": chart_data, "chart_title": f"Top 5 Expenses — {period}",
        "quick_replies": ["Show spending breakdown", "How are my budgets?", "What are my savings?"],
    }


def _find_category(session: Session, msg: str) -> Optional[Category]:
    """Match category name or keywords in the message."""
    categories = session.exec(select(Category)).all()
    for cat in categories:
        if cat.name.lower() in msg:
            return cat
    for key, kws in _CATEGORY_KW.items():
        if any(kw in msg for kw in kws):
            for cat in categories:
                if key in cat.name.lower():
                    return cat
    return None


# ── Main dispatcher ───────────────────────────────────────────────────────────

def process_chat(session: Session, message: str) -> dict:
    msg = message.lower().strip()
    d_from, d_to = _detect_period(msg)

    # Budget
    if any(w in msg for w in ["budget", "on track", "over budget", "budgeted"]):
        return _resp_budget(session, d_from, d_to)

    # Trend
    if any(w in msg for w in ["trend", "over time", "6 month", "six month", "month by month", "history", "historical"]):
        return _resp_trend(session)

    # Top expenses
    if any(w in msg for w in ["top", "biggest expense", "largest expense", "highest", "most expensive"]):
        if "categor" in msg or "group" in msg or "type" in msg:
            return _resp_category_breakdown(session, d_from, d_to)
        return _resp_top_expenses(session, d_from, d_to)

    # Income
    if any(w in msg for w in ["income", "earn", "salary", "revenue", "received"]):
        return _resp_income(session, d_from, d_to)

    # Savings / balance
    if any(w in msg for w in ["saving", "save", "net", "balance", "left over", "leftover", "surplus", "deficit"]):
        return _resp_savings(session, d_from, d_to)

    # Category breakdown
    if any(w in msg for w in ["breakdown", "categor", "by category", "split", "pie", "distribution"]):
        return _resp_category_breakdown(session, d_from, d_to)

    # Specific category + spending keyword
    cat = _find_category(session, msg)
    if cat and any(w in msg for w in ["spend", "spent", "cost", "paid", "pay", "how much"]):
        return _resp_specific_category(session, cat, d_from, d_to)

    # General spending
    if any(w in msg for w in ["spend", "spent", "expense", "cost", "total", "how much", "paid"]):
        return _resp_total_spend(session, d_from, d_to)

    # Greeting / help
    if any(w in msg for w in ["hi", "hello", "hey", "help", "what can", "how do", "what do"]):
        return {
            "answer": ("Hi! 👋 I'm your expense analysis assistant. "
                       "Ask me anything about your spending, income, budgets, or trends."),
            "chart_type": "none", "chart_data": [], "chart_title": "",
            "quick_replies": _DEFAULT_QUICK_REPLIES,
        }

    # Fallback
    return {
        "answer": "I'm not sure I understood that. Try one of the suggestions below!",
        "chart_type": "none", "chart_data": [], "chart_title": "",
        "quick_replies": _DEFAULT_QUICK_REPLIES,
    }
