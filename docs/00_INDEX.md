---
title: Vault Index
date: 2026-03-30
tags:
  - index
  - expense-tracker
  - navigation
aliases:
  - Project Index
  - Vault Map
  - Start Here
status: active
related:
  - "[[README]]"
  - "[[CHANGELOG]]"
  - "[[docs/SESSION_CONTEXT]]"
---

# Expense Tracker — Vault Index

> Central navigation node. Every document, skill, and diagram in this vault links through here.

See also: [[README]] · [[CHANGELOG]] · [[docs/SESSION_CONTEXT]]

---

## Project Root

| File | Purpose |
|---|---|
| [[README]] | Full project overview, tech stack, quick start, API reference |
| [[CHANGELOG]] | Version history v1.0.0 → v2.3.0 |
| [[docs/SESSION_CONTEXT]] | AI session memory log — two sessions recorded |

---

## Documentation (Reading order: 01 → 13)

| # | File | Format | Purpose |
|---|---|---|---|
| 01 | [[docs/01_PRD\|PRD]] | .docx | Product Requirements — all features marked ✅ |
| 02 | [[docs/02_Project_Proposal\|Project Proposal]] | .docx | Huvalon internship capstone — project proposal |
| 03 | [[docs/03_Architecture\|Architecture]] | .md | 3-tier Docker architecture, 8 DB tables, data flow |
| 04 | [[docs/04_Tech_Stack\|Tech Stack]] | .md | Every library with rationale |
| 05 | [[docs/05_HLD\|HLD]] | .md + .docx | High-Level Design, all design decisions |
| 06 | [[docs/06_LLD\|LLD]] | .md + .docx | Low-Level Design, full API contract |
| 07 | [[docs/07_API_Reference\|API Reference]] | .md + .docx | All 11 router groups documented |
| 08 | [[docs/08_Deployment_Strategy\|Deployment Strategy]] | .md + .docx | Strategy A (Docker) + Strategy B (Local) |
| 09 | Tests | .docx | 12 pytest tests + coverage gap analysis |
| 10 | [[docs/10_Walkthrough\|Walkthrough]] | .md | All 8 pages, 3 themes, Settings hub |
| 11 | ChangeLog | .docx | Formatted release notes |
| 12 | [[docs/12_Final_Report\|Final Report]] | .docx | 14-section comprehensive project report |
| 13 | Presentation | .pptx | 12-slide minimal-design deck |

> [!note] .docx and .pptx files
> Obsidian's graph doesn't render links to binary files. They are listed here for completeness. Open them from Finder or GitHub.

---

## AI Skills

Skills extracted from this project and reusable by future AI agents. All follow the [[https://github.com/anthropics/skills|agentskills.io]] open standard (Anthropic's official format).

| Skill | What it does |
|---|---|
| [[docs/canara-bank-parser-skill/SKILL\|Canara Bank Parser]] | Parses Canara Bank PDF statements — UPI/NEFT/ATM patterns, cross-page splits, business VPA merchant tagging |
| [[docs/ai-import-skill/SKILL\|AI Bank Import]] | 5-pass categorisation waterfall (rules → keywords → Claude AI → manual review) + Claude system prompt |

---

## Architecture Diagrams

| Diagram | Description |
|---|---|
| [[docs/architecture-v1.9.mermaid\|Architecture v1.9]] | 3-tier Docker Compose network — Frontend / Backend / Database |
| [[docs/v2.0-import-flow.mermaid\|Import Flow v2.0]] | Bank statement import pipeline end-to-end |
| [[docs/expense_tracker_architecture.svg\|Architecture SVG]] | Visual system overview |
| [[docs/expense_request_flow.svg\|Request Flow SVG]] | HTTP request lifecycle through all layers |

---

## Research & Strategy

| File | Description |
|---|---|
| [[docs/RESEARCH_NOTES\|Research Notes]] | AI agent ecosystem research — 8 repos analysed, cost breakdown, recommended stack for skill building |

---

## Obsidian Graph — Link health

| Check | Status |
|---|---|
| Broken `[[NoneXXX]]` wikilinks | ✅ 0 remaining (fixed 2026-03-30) |
| Skill nodes linked | ✅ Both skills linked from README + INDEX |
| Diagram nodes linked | ✅ All 4 diagrams linked from README + INDEX |
| Binary files (.docx, .pptx) | ⚠️ Not renderable in graph — by design |
| SESSION_CONTEXT linked | ✅ |

---

## Git — Current state

```
Branch:  feature/v2.3.0
Status:  5 commits ahead of origin (need git push)
```

**Push command:**
```bash
cd ~/Documents/ObsidianVaults/expense-tracker
git push origin feature/v2.3.0
```

**Pending after push:** Open PR `feature/v2.3.0` → `main` on GitHub.
