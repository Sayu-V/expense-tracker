---
title: Claude Agent Lab
date: 2026-03-30
tags:
  - claude-agent-lab
  - skills
  - ai-agents
  - memory
  - self-evolution
aliases:
  - Agent Lab
  - Skills Lab
version: 0.1.0
status: active
related:
  - "[[docs/00_INDEX]]"
  - "[[docs/SESSION_CONTEXT]]"
  - "[[docs/01_Research_Notes]]"
  - "[[docs/02_Project_Plan]]"
---

# Claude Agent Lab

> A living repository for building, testing, and evolving AI skills — powered by Anthropic's agentskills.io standard.

**Origin:** Skills and research extracted from [expense-tracker v2.3.0](https://github.com/Sayu-V/expense-tracker)
**Started:** March 2026 · **Yenepoya University / IBM Student Project**

See also: [[docs/00_INDEX]] · [[docs/SESSION_CONTEXT]] · [[docs/01_Research_Notes]]

---

## What this project is

This lab grew out of a question asked during the expense-tracker project:

> *"How can we make Claude remember across sessions, auto-create skills from experience, and improve those skills over time — without paying for anything?"*

The answer is a 3-layer free stack:

```
Layer 1 — claude-mem          →  persistent cross-session memory (local SQLite)
Layer 2 — OpenSpace           →  auto-extracts skills from what you do (MCP server)
Layer 3 — awesome-claude-skills →  publish skills to the global community (GitHub PR)
```

And optionally, for self-evolution:
```
Layer 4 — GEPA (hermes-agent-self-evolution)  →  $2–10/run to improve a skill
```

---

## Skills in this repo

All skills follow **agentskills.io** — Anthropic's official open standard (Dec 2025). Compatible with Claude Code, Cowork, OpenAI Codex, Gemini CLI, Cursor, and 20+ other platforms.

| Skill | Origin | Status |
|---|---|---|
| [[docs/skills/canara-bank-parser/SKILL\|canara-bank-parser]] | expense-tracker v2.0 | ✅ Production-ready |
| [[docs/skills/ai-bank-import/SKILL\|ai-bank-import]] | expense-tracker v2.1 | ✅ Production-ready |
| [[docs/skills/obsidian-claude-project/SKILL\|obsidian-claude-project]] | expense-tracker methodology | ✅ v1.0.0 |
| [[docs/skills/session-handoff/SKILL\|session-handoff]] | This project | 🚧 Draft |

---

## Quick start

```bash
# 1. Clone or move this folder
mv ~/Documents/ObsidianVaults/expense-tracker/_claude-agent-lab \
   ~/Documents/ObsidianVaults/claude-agent-lab
cd ~/Documents/ObsidianVaults/claude-agent-lab
git init && git add . && git commit -m "chore: initial claude-agent-lab skeleton"

# 2. Install memory layer
npm install -g @thedotmack/claude-mem

# 3. Install our skills globally
mkdir -p ~/.claude/skills/canara-bank-parser ~/.claude/skills/ai-bank-import
cp docs/skills/canara-bank-parser/SKILL.md ~/.claude/skills/canara-bank-parser/SKILL.md
cp docs/skills/ai-bank-import/SKILL.md ~/.claude/skills/ai-bank-import/SKILL.md

# 4. Open in Obsidian
# File → Open vault → select this folder
```

---

## Roadmap

| Priority | Task | Status |
|---|---|---|
| P0 | Install claude-mem | ⬜ |
| P0 | git push expense-tracker + open PR | ⬜ |
| P1 | Submit canara-bank-parser to awesome-claude-skills | ⬜ |
| P1 | Write session-handoff SKILL.md | ⬜ |
| P2 | Add OpenSpace MCP server config | ⬜ |
| P2 | Write fastapi-sqlmodel-stack SKILL.md | ⬜ |
| P3 | Run GEPA on canara-bank-parser (after 5+ edge cases) | ⬜ |
| P3 | Apply for Claude for Open Source (free Claude Max 20x) | ⬜ |
