---
name: canara-bank-parser
description: >
  Parse Canara Bank PDF statements (any account, any period length).
  Extracts all transactions with date, amount, type (expense/income),
  clean merchant name, and raw description. Handles multi-line cells,
  cross-page row splits, UPI/NEFT/ATM/SWEEPIN/FUNDS TRANSFER patterns,
  and the MARKREX business-VPA merchant tagging convention.
  Use when the user uploads or references a Canara Bank statement PDF
  and wants to extract, analyse, or import transaction data.
license: MIT
---

# Canara Bank Statement Parser — Skill Guide

## What this skill does

Reads a Canara Bank "Statement of Account" PDF (any number of pages, any date
range) and returns a clean list of transactions. Tested against:
- 19-page personal savings account (207 transactions, Apr 2025 – Mar 2026)
- 86-page business/high-volume savings account (905 transactions, Apr 2025 – Mar 2026)

---

## Statement Format (confirmed)

### Header info (page 1 only)
Account number, customer name, branch, IFSC, period dates are in free-text
above the table. Not parsed by this skill — focus is on the transaction table.

### Transaction table columns
| Column | Format | Notes |
|---|---|---|
| TRANS DATE | `DD-MMM-YY` e.g. `03-APR-25` | Primary date used |
| VALUE DATE | `DD-MMM-YY` | Usually same as TRANS DATE |
| BRANCH | numeric code | Ignored on import |
| REF/CHQ.NO | alphanumeric | Used for duplicate detection |
| DESCRIPTION | multi-line UPI/NEFT/ATM text | Merchant extracted from here |
| WITHDRAWS | `1,000.00` format | > 0 → expense; 0.00 when credit |
| DEPOSIT | `1,000.00` format | > 0 → income; 0.00 when debit |
| BALANCE | running balance | Not imported |

### Special rows to skip
- `B/F ...` — brought-forward opening balance (first row)
- Header row (`TRANS DATE`, `VALUE DATE`, ...) — repeats on every page
- Page 19/86 last page — just `******END OF STATEMENT******` or page number

### Cross-page row splits
Long UPI descriptions sometimes split mid-row across a page boundary.
The continuation row has no date or amount — only orphan description text.
The parser appends this to the previous row's description.

---

## UPI Description Patterns

Canara Bank encodes UPI transactions in this format:

```
UPI/DR/509255803118/LAXMI S A/CNRB/**LAXMI@OKSBI/UPI//AXIC6A73565D.../02/04/2025 21:47:10
     ↑              ↑         ↑    ↑                ↑
     ref_no         merchant  bank  masked_vpa       timestamp
```

- `DR` = debit = expense; `CR` = credit = income
- Merchant name = **segment between 3rd and 4th slash**

### MARKREX business VPA pattern
When the counterparty VPA is a business handle like `MARKREX13`, the merchant
tag is appended after `@OKICICI/` in the VPA portion:

```
UPI/DR/509656275661/MARKREX13/CNRB/**X13-1@OKICICI/CABLEGOO/ICI...
                                               ↑
                                          merchant tag (CABLEGOO = Cable TV)
```

Common MARKREX merchant tags seen in statements:
- `CABLEGOO` → Cable TV
- `PETROL` → Petrol/Fuel
- `MALBARB` → Malabar Gold
- `PAINTAIN` → Paint shop
- `PRINTOUT` → Print/xerox shop
- `BUCHER` / `BUTCHER` → Meat shop
- `JEWEL` → Jewellery
- `SILK` → Silk/textile
- `KIRANA` → Grocery/Kirana

### Other description patterns
| Pattern | Example | Extracted merchant |
|---|---|---|
| NEFT | `NEFT CR-BARBX25-BARB0PUMP-BEETECH ENTERPRISES--` | `BEETECH ENTERPRISES` |
| ATM | `ATM CASH-0652BY01-CANARABANKMANGA...` | `ATM Cash Withdrawal` |
| SWEEPIN | `SWEEPIN DR - LOCKER RENT/CHARGES 123001594461` | `Bank Sweep / Locker Charges` |
| CHQ PAID | `CHQ PAID-MICR INWARD CLEARING-SHREE KALIKAMBA VINAYAKA-YES BANK LTD` | `SHREE KALIKAMBA VINAYAKA` |
| FUNDS TRANSFER | `FUNDS TRANSFER DEBIT - VENKAPPA` | `VENKAPPA` |
| CASA NEFT | `CASA:NEFT OW:-4 MULTIPLE NEFTS-25042802033570` | `Bulk NEFT (multiple)` |

---

## Requirements

```bash
pip install pdfplumber
```

No other dependencies beyond Python stdlib (`re`, `csv`, `datetime`).

---

## Complete Parser Script

Save as `canara_parser.py`. Takes a PDF path, returns a list of dicts.

```python
"""
canara_parser.py
----------------
Parse Canara Bank "Statement of Account" PDF.
Returns list of transaction dicts:
  {
    date:        str  "YYYY-MM-DD"
    description: str  full cleaned description
    merchant:    str  extracted merchant/counterparty name
    amount:      float
    type:        str  "expense" | "income"
    ref_no:      str  cheque/UPI reference number (empty string if none)
  }

Tested on: 19-page (207 txns) and 86-page (905 txns) Canara Bank statements.
"""

import re
import csv
import pdfplumber
from datetime import datetime


# ── Merchant extraction ────────────────────────────────────────────────────────

def _extract_merchant(desc: str) -> str:
    """
    Pull a human-readable merchant name from a raw Canara Bank description.
    desc should already have whitespace/newlines collapsed to single spaces.
    """
    # ── UPI ───────────────────────────────────────────────────────────────────
    upi = re.match(r'UPI/(?:DR|CR)/[^/]+/([^/]+)', desc, re.I)
    if upi:
        counterparty = upi.group(1).strip()

        # MARKREX business VPA: merchant encoded after @OKICICI/ in the VPA
        if re.search(r'MARKREX', counterparty, re.I):
            tag = re.search(
                r'\*\*X13-\d+@OK[A-Z]+/([A-Z0-9]+)', desc, re.I
            )
            if tag:
                return tag.group(1).strip()
            # Fallback: use what we have before the first /
            return counterparty.split('/')[0].strip()

        # Standard UPI: counterparty is the merchant
        return counterparty.split('/')[0].strip()

    # ── NEFT ──────────────────────────────────────────────────────────────────
    neft = re.match(
        r'NEFT\s+(?:CR|DR)-\s*\S+\s*-\s*\S+\s*-\s*(.+?)(?:\s*--|$)',
        desc, re.I
    )
    if neft:
        name = re.sub(r'\s*//.*$', '', neft.group(1)).strip()
        return name[:50]

    # ── ATM ───────────────────────────────────────────────────────────────────
    if re.match(r'ATM\s+CASH', desc, re.I):
        return 'ATM Cash Withdrawal'

    # ── SWEEPIN (bank sweep / locker charges) ─────────────────────────────────
    if re.search(r'SWEEPIN', desc, re.I):
        return 'Bank Sweep / Locker Charges'

    # ── Cheque payment ────────────────────────────────────────────────────────
    chq = re.match(
        r'CHQ\s+PAID-\S+\s+CLEARING-\s*(.+?)(?:-[A-Z\s]+BANK.*)?$',
        desc, re.I
    )
    if chq:
        return chq.group(1).strip()[:40]

    # ── CASA / Bulk NEFT ──────────────────────────────────────────────────────
    if re.match(r'CASA:NEFT', desc, re.I):
        return 'Bulk NEFT (multiple)'

    # ── NEFT SC (service charge) ──────────────────────────────────────────────
    if re.match(r'NEFT\s+SC', desc, re.I):
        return 'NEFT Service Charge'

    # ── Funds Transfer ────────────────────────────────────────────────────────
    ft = re.match(
        r'FUNDS\s+TRANSFER\s+(?:DEBIT|CREDIT)?\s*[\d\s]*[-–]\s*(.+)',
        desc, re.I
    )
    if ft:
        return ft.group(1).strip()[:40]

    # ── Fallback ──────────────────────────────────────────────────────────────
    return desc[:40]


# ── Amount parsing ─────────────────────────────────────────────────────────────

def _parse_amount(value) -> float:
    """'1,000.00' → 1000.0; None/empty/0.00 → 0.0"""
    if not value:
        return 0.0
    cleaned = str(value).replace(',', '').strip()
    if cleaned in ('', '0.00', '0'):
        return 0.0
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


# ── Main parser ────────────────────────────────────────────────────────────────

def parse_canara_statement(pdf_path: str) -> list[dict]:
    """
    Parse a Canara Bank Statement of Account PDF.

    Args:
        pdf_path: Path to the PDF file.

    Returns:
        List of dicts with keys:
          date, description, merchant, amount, type, ref_no
    """
    transactions = []

    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            tables = page.extract_tables()
            if not tables:
                continue

            for row in tables[0]:
                # Unpack (always 8 columns in Canara Bank statements)
                if len(row) != 8:
                    continue

                trans_date, _value_date, _branch, ref, desc, withdraws, deposit, _balance = row

                # Skip header rows (repeat on every page)
                if trans_date and 'TRANS' in str(trans_date):
                    continue

                # Skip completely empty rows
                if not any(row):
                    continue

                # Collapse multi-line text in description cell
                clean_desc = ' '.join(str(desc or '').split())

                # ── Continuation row (description split across page boundary) ──
                # These rows have no date and no amounts — just orphan description text
                if not trans_date and clean_desc and not withdraws:
                    if transactions:
                        transactions[-1]['description'] += ' ' + clean_desc
                        # Re-derive merchant from updated full description
                        transactions[-1]['merchant'] = _extract_merchant(
                            transactions[-1]['description']
                        )
                    continue

                # Skip B/F (brought-forward opening balance)
                if 'B/F' in str(desc or ''):
                    continue

                # Parse date
                try:
                    date_obj = datetime.strptime(
                        str(trans_date).strip(), '%d-%b-%y'
                    ).date()
                except ValueError:
                    continue

                # Parse amounts
                dr = _parse_amount(withdraws)
                cr = _parse_amount(deposit)

                # Skip rows where both amounts are zero (e.g. memo lines)
                if dr == 0.0 and cr == 0.0:
                    continue

                amount   = dr if dr > 0 else cr
                txn_type = 'expense' if dr > 0 else 'income'
                merchant = _extract_merchant(clean_desc)

                transactions.append({
                    'date':        str(date_obj),
                    'description': clean_desc,
                    'merchant':    merchant,
                    'amount':      amount,
                    'type':        txn_type,
                    'ref_no':      str(ref or '').strip(),
                })

    return transactions


# ── CSV export ─────────────────────────────────────────────────────────────────

def export_to_csv(transactions: list[dict], output_path: str) -> None:
    """Write parsed transactions to a CSV file."""
    if not transactions:
        print("No transactions to export.")
        return

    fields = ['date', 'merchant', 'amount', 'type', 'ref_no', 'description']
    with open(output_path, 'w', newline='', encoding='utf-8') as f:
        writer = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        writer.writeheader()
        writer.writerows(transactions)

    print(f"Exported {len(transactions)} transactions to {output_path}")


# ── Summary helper ─────────────────────────────────────────────────────────────

def print_summary(transactions: list[dict]) -> None:
    """Print a quick summary of the parsed statement."""
    if not transactions:
        print("No transactions found.")
        return

    expenses = [t for t in transactions if t['type'] == 'expense']
    incomes  = [t for t in transactions if t['type'] == 'income']
    dates    = sorted(t['date'] for t in transactions)

    print(f"{'='*55}")
    print(f"  Canara Bank Statement — Parse Summary")
    print(f"{'='*55}")
    print(f"  Period          : {dates[0]}  →  {dates[-1]}")
    print(f"  Total rows      : {len(transactions)}")
    print(f"  Expense rows    : {len(expenses)}"
          f"   ₹{sum(t['amount'] for t in expenses):>12,.2f}")
    print(f"  Income rows     : {len(incomes)}"
          f"   ₹{sum(t['amount'] for t in incomes):>12,.2f}")
    net = sum(t['amount'] for t in incomes) - sum(t['amount'] for t in expenses)
    print(f"  Net             :       ₹{net:>12,.2f}  "
          f"({'surplus' if net >= 0 else 'deficit'})")
    print(f"{'='*55}")

    # Top 10 expense merchants
    from collections import Counter
    top = Counter()
    for t in expenses:
        top[t['merchant']] += t['amount']
    print("\n  Top 10 expense merchants:")
    for merchant, total in top.most_common(10):
        count = sum(1 for t in expenses if t['merchant'] == merchant)
        print(f"    {count:>3}x  ₹{total:>10,.0f}  {merchant}")


# ── CLI entry point ────────────────────────────────────────────────────────────

if __name__ == '__main__':
    import sys

    if len(sys.argv) < 2:
        print("Usage: python canara_parser.py <statement.pdf> [output.csv]")
        sys.exit(1)

    pdf_file = sys.argv[1]
    csv_file = sys.argv[2] if len(sys.argv) > 2 else None

    print(f"Parsing: {pdf_file}")
    txns = parse_canara_statement(pdf_file)
    print_summary(txns)

    if csv_file:
        export_to_csv(txns, csv_file)
    else:
        print("\nTip: pass a second argument to export as CSV, e.g.:")
        print(f"  python canara_parser.py statement.pdf output.csv")
```

---

## Usage Examples

### Parse and print summary
```python
from canara_parser import parse_canara_statement, print_summary

txns = parse_canara_statement("my_canara_statement.pdf")
print_summary(txns)
```

### Parse and export to CSV
```python
from canara_parser import parse_canara_statement, export_to_csv

txns = parse_canara_statement("statement.pdf")
export_to_csv(txns, "transactions.csv")
```

### Filter only expenses above ₹1,000
```python
big_expenses = [
    t for t in txns
    if t['type'] == 'expense' and t['amount'] >= 1000
]
for t in big_expenses:
    print(f"{t['date']}  ₹{t['amount']:,.0f}  {t['merchant']}")
```

### Use with pandas for analysis
```python
import pandas as pd
from canara_parser import parse_canara_statement

txns = parse_canara_statement("statement.pdf")
df = pd.DataFrame(txns)
df['date'] = pd.to_datetime(df['date'])
df['month'] = df['date'].dt.to_period('M')

# Monthly expense totals
monthly = df[df['type']=='expense'].groupby('month')['amount'].sum()
print(monthly)
```

### Use as data source for bulk import in the Expense Tracker app
```python
from canara_parser import parse_canara_statement

txns = parse_canara_statement("statement.pdf")

# Each txn maps directly to an ImportRow schema:
# { date, description, merchant, amount, type, ref_no }
# Pass to POST /api/v1/import/preview as the row list
```

---

## Known Limitations

| Limitation | Impact | Workaround |
|---|---|---|
| Scanned/image PDFs | pdfplumber cannot extract tables from scanned images | Download the digital PDF from Canara Net Banking / iMobile |
| MARKREX merchant tags | Merchant tag is a short code, not full name (e.g. `CABLEGOO` not `Cable TV`) | AI categorisation will map codes to categories correctly |
| Very long NEFT descriptions | `//SHOULD NOT CREDIT TO A NON KYC//COMPLIANT ACCOUNT` notes may appear in merchant field | Filter or post-process: `if '//' in merchant: merchant = merchant.split('//')[0]` |
| Amounts with no decimal | Rare — some older entries may show `1000` not `1,000.00` | `_parse_amount` handles both formats |
| Multi-statement PDFs | Not tested for merged/combined PDFs | Parse each statement file separately |

---

## Output Schema

```python
{
    "date":        "2025-04-03",          # ISO date string
    "description": "UPI/DR/509255803118/LAXMI S A/CNRB/**LAXMI@OKSBI/...",
    "merchant":    "LAXMI S A",           # cleaned counterparty name
    "amount":      1000.0,                # always positive float
    "type":        "expense",             # "expense" | "income"
    "ref_no":      "509255803118",        # UPI ref or cheque number, "" if blank
}
```

---

## Performance

| Statement size | Pages | Transactions | Parse time |
|---|---|---|---|
| Small | 19 | 207 | ~2s |
| Large | 86 | 905 | ~8s |

pdfplumber is CPU-bound. For very large statements (200+ pages), expect 15–30s.
