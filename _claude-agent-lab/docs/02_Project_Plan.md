---
title: Project Plan
date: 2026-03-30
tags: [claude-agent-lab, plan, roadmap]
aliases: [Roadmap, Project Plan]
status: active
related:
  - "[[README]]"
  - "[[docs/00_INDEX]]"
  - "[[docs/01_Research_Notes]]"
---

# Claude Agent Lab — Project Plan

See also: [[docs/01_Research_Notes]] for full tool analysis and rationale.

---

## Phase 0 — Setup (this week)

| Task | Command / Action | Done |
|---|---|---|
| Move project to its own vault | `mv .../expense-tracker/_claude-agent-lab .../claude-agent-lab` | ⬜ |
| Init git repo | `git init && git add . && git commit -m "chore: initial skeleton"` | ⬜ |
| Open in Obsidian | File → Open vault → claude-agent-lab | ⬜ |
| Install claude-mem | `npm install -g @thedotmack/claude-mem` | ⬜ |
| Install skills globally | `cp docs/skills/*/SKILL.md ~/.claude/skills/*/` | ⬜ |
| Push expense-tracker | `git push origin feature/v2.3.0` (in expense-tracker folder) | ⬜ |
| Open PR | expense-tracker: feature/v2.3.0 → main on GitHub | ⬜ |

---

## Phase 1 — Publish & Grow (next 2 weeks)

| Task | How | Priority |
|---|---|---|
| Submit canara-bank-parser to awesome-claude-skills | PR against ComposioHQ/awesome-claude-skills | P0 |
| Submit obsidian-claude-project to anthropics/skills | PR against anthropics/skills | P1 |
| Write session-handoff SKILL.md (draft exists) | Refine from SESSION_CONTEXT template | P1 |
| Write fastapi-sqlmodel-stack SKILL.md | Extract from expense-tracker backend | P2 |
| Write react-vite-frontend SKILL.md | Extract from expense-tracker frontend | P2 |
| Apply for Claude for Open Source | claude.com/contact-sales/claude-for-oss | P2 |

---

## Phase 2 — Automate (1 month)

| Task | Tool | Notes |
|---|---|---|
| Add OpenSpace MCP server | HKUDS/OpenSpace local mode | Free, watches work, auto-drafts skills |
| Configure claude-mem hooks | ~/.claude/settings.json | Links to SQLite on Mac |
| Collect edge cases per skill | Manual testing + notes | Need 5+ before running GEPA |

---

## Phase 3 — Self-evolve (ongoing)

| Task | Tool | Cost |
|---|---|---|
| Run GEPA on canara-bank-parser | hermes-agent-self-evolution | ~$5/run |
| Run GEPA on ai-bank-import | hermes-agent-self-evolution | ~$5/run |
| Run GEPA on obsidian-claude-project | hermes-agent-self-evolution | ~$5/run |
| Review PRs from GEPA evolution | Human gate (always required) | Free |

---

## Skills Backlog

### Ready to write (all knowledge exists from expense-tracker)
| Skill | What it codifies | Est. time |
|---|---|---|
| `pwa-offline-strategy` | Service Worker, cache-first, versioned names | 1h |
| `docker-compose-fullstack` | 3-service pattern, healthchecks, volumes, CRLF | 1h |
| `docx-professional-report` | Node.js docx: TOC, metric cards, tables, palette | 2h |
| `pptx-minimal-design` | PptxGenJS: card heights, no-emoji, flow diagrams | 2h |

### Requires future projects
| Skill | Waiting for |
|---|---|
| `django-patterns` | A Django project |
| `nextjs-supabase` | A Next.js + Supabase project |
