---
name: ai-bank-import
description: >
  AI-assisted bank statement import pipeline for PDF and CSV files.
  Classifies transactions using a 5-pass waterfall: user-defined rules →
  income sources → built-in keyword rules → AI batch categorisation (Claude)
  → manual review flag. Generates post-import insights, rule suggestions,
  and an inline chat interface scoped to the imported statement.
version: 1.0.0
project_origin: expense-tracker (v2.1.0 concept)
license: MIT
---

# AI-Assisted Bank Statement Import Skill

## Overview

This skill describes the architecture, UI design, classification logic, and
implementation plan for adding AI-powered categorisation to a bank statement
import feature. It was designed for the **Expense Tracker** project but is
intentionally generic enough to be adapted for any document import pipeline
that needs smart classification.

The interactive UI mockup is at: `docs/ai-import-mockup.html`

---

## Classification Waterfall (5 passes)

Every parsed transaction goes through these passes in order.
**First match wins — no further passes run.**

```
Pass 1 → User-defined Rules        (deterministic, highest trust)
Pass 2 → Income Source matching    (deterministic, user-saved senders)
Pass 3 → Built-in keyword rules    (50+ merchant patterns, no API call)
Pass 4 → AI batch categorisation   (Claude API, handles unknowns)
Pass 5 → Flag for manual review    (<5% of rows typically)
```

---

## Pass 4 — AI Categoriser Detail

### What is sent to Claude

Only **description text** is sent — never amounts, account numbers, or PII.

```python
SYSTEM_PROMPT = """
You are a bank transaction classifier for an Indian personal finance app.
Classify each transaction. For each, return JSON with:
  - type: "expense" | "income" | "investment" | "transfer"
  - category_name: one of the provided category list
  - clean_description: human-readable merchant/sender name
  - confidence: integer 0–100
  - reasoning: one sentence explaining the classification

Be concise. If confidence < 60, set type to "unknown" so it gets flagged.
"""

USER_PROMPT = """
Available categories: {category_list}

Transactions to classify (index | description | debit_or_credit):
{transaction_list}

Return a JSON array with one object per transaction, in the same order.
"""
```

### Batch strategy

- Collect all rows where `confidence == "low"` after passes 1–3
- Send in a **single API call** (batch), not one call per row
- Use **claude-haiku** for cost efficiency (~₹0.10–0.30 per statement)
- Cache results: same description → same classification, stored in `import_rule_cache` table
- After AI classifies a merchant, **auto-create a built-in rule** for it so the next import never calls AI for that merchant again

### Response schema (per transaction)

```python
class AIClassification(BaseModel):
    index: int                    # matches input order
    type: str                     # expense | income | investment | transfer | unknown
    category_name: str            # matched to DB category
    clean_description: str        # human-readable name
    confidence: int               # 0–100
    reasoning: str                # one sentence
```

---

## UI Features

### 1. Processing screen
Step-by-step progress shown during upload:
```
✓ File parsed — 47 transactions found
✓ Rules applied — 31 matched
✓ Income sources checked — 2 matched
⟳ Sending 14 unknowns to AI…
○ Duplicate check
○ Building preview
```

### 2. Preview table enhancements
- **Source column**: `Rule #n` (green) | `Built-in` (blue) | `✦ AI` (purple) | `⚠️ Review` (red)
- **Confidence bar**: colour-coded progress bar (green ≥80%, amber 60–79%, red <60%)
- **"Why?" button**: expandable inline explanation from AI reasoning field
- **AI-cleaned description**: shown in purple italic when AI renamed it
- **"💾 Save as rule"** button on any manually-fixed row

### 3. Post-import AI Insights panel
After import completes, Claude analyses the full statement and surfaces:
- Spending category changes vs last month
- New merchants detected
- Possible recurring payments without rules
- Income stream summary
- AI classification accuracy summary

### 4. AI Rule Suggestions
After import, Claude proposes rules based on patterns:
```
IF description contains "PETROLBUNK" → type=Expense, category=Fuel
IF description contains "KAVITHA SILKS" → type=Expense, category=Shopping
IF description contains "HDFC ERGO" → type=Expense, category=Insurance
```
Each suggestion has **Accept** / **Dismiss** buttons.
Accepted rules are saved to the `import_rules` table and applied immediately.

### 5. Ask AI (inline chat)
A chat interface scoped to the imported statement.
User can ask questions before confirming the import:
- "What are my top 3 spending categories?"
- "Is the ₹38,000 from Suresh Kumar income or a loan?"
- "List all transactions above ₹5,000"
- "Any unusual or suspicious transactions?"

---

## Database Tables Required

```sql
-- AI classification cache (prevents repeat API calls for same merchant)
CREATE TABLE import_rule_cache (
    id          SERIAL PRIMARY KEY,
    description_hash  VARCHAR(64) UNIQUE,  -- SHA256 of normalised description
    type              VARCHAR(20),
    category_name     VARCHAR(100),
    clean_description VARCHAR(200),
    source            VARCHAR(20),         -- 'ai' | 'rule' | 'builtin'
    created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Import sessions (temporary, TTL 30 min)
-- Stored in memory (dict) in import_service.py
-- Could be moved to Redis for multi-instance deployments

-- Import history (audit log)
CREATE TABLE import_history (
    id              SERIAL PRIMARY KEY,
    filename        VARCHAR(200),
    bank_format     VARCHAR(50),
    total_rows      INT,
    imported_count  INT,
    skipped_count   INT,
    ai_classified   INT,        -- rows handled by AI
    ai_cost_rupees  FLOAT,      -- estimated API cost
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## API Endpoints

```
POST /import/upload           → parse + classify, return preview
POST /import/confirm          → bulk-create expense records
GET  /import/history          → list past imports
GET  /import/insights/{sid}   → AI insights for a session
POST /import/chat             → chat about a session's transactions
GET  /income-sources          → list income sources
POST /income-sources          → create income source
PUT  /income-sources/{id}     → update
DELETE /income-sources/{id}   → delete
```

---

## Cost Estimation

| Statement size | AI rows (est.) | Haiku tokens | Estimated cost |
|---|---|---|---|
| 1 month / ~50 txns | 15–20 | ~2,000 | ~₹0.05 |
| 3 months / ~150 txns | 30–50 | ~5,000 | ~₹0.12 |
| 1 year / ~600 txns | 50–80 | ~8,000 | ~₹0.20 |

After first import, the cache means subsequent imports of the same account
cost nearly nothing — most merchants already classified.

---

## Privacy Design

- Only **description text** sent to Claude API, never:
  - Account numbers
  - Amounts
  - Names from header (account holder name)
  - Branch codes
- Descriptions are **normalised** before hashing for cache (remove ref numbers)
- Users can disable AI categorisation in settings → falls back to flag-only

---

## Adapting for Other Projects

This skill applies to any project needing:
- **Document import with classification** (invoices, receipts, expense reports)
- **Smart field extraction** from semi-structured text
- **User-correctable AI** with rule learning

Key files to port:
1. `categorizer_service.py` — rule engine (adapt keyword tables)
2. `import_service.py` — file parser (adapt for your document format)
3. `Import.jsx` — preview UI (reuse the table + source badge pattern)
4. `ai_categoriser.py` — Claude batch call (generic, reusable as-is)

---

## Files in This Skill

| File | Purpose |
|---|---|
| `SKILL.md` | This document — full spec and implementation guide |
| `ai-import-mockup.html` | Interactive 6-tab UI mockup (copy from docs/) |
| `ai_categoriser.py` | Standalone Claude batch classifier script |

---

## Known Limitations

- **Scanned PDFs** (image-based): pdfplumber cannot extract text → OCR needed
- **Non-Canara Bank PDFs**: column layout varies → need bank-specific parsers
- **AI hallucination risk**: low for category names (constrained to list), higher for clean_description
- **Session TTL**: in-memory sessions expire after 30 min → user must re-upload if they wait too long
