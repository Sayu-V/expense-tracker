---
title: AI Agent & Skill Building — Research Notes
date: 2026-03-30
tags:
  - research
  - skills
  - ai-agents
  - memory
  - self-evolution
aliases:
  - Research Notes
  - Agent Research
status: reference
related:
  - "[[README]]"
  - "[[docs/SESSION_CONTEXT]]"
  - "[[docs/00_INDEX]]"
  - "[[docs/canara-bank-parser-skill/SKILL]]"
  - "[[docs/ai-import-skill/SKILL]]"
---

# AI Agent & Skill Building — Research Notes

> Captured from expense-tracker v2.3.0 session (2026-03-30).
> This research forms the foundation for the `claude-agent-lab` project.

See also: [[docs/00_INDEX]] · [[docs/SESSION_CONTEXT]]

---

## Origin — The 5 Goals

This research began as a gap analysis of the expense-tracker Obsidian vault against 5 goals:

| Goal | Status at start | Root gap |
|---|---|---|
| Chat history / memory | 45% | Single snapshot; no auto-append |
| Thinking process / version history | 90% | Well covered — CHANGELOG + commits |
| Obsidian graph view linking | 60% | 36 broken `[[NoneXXX]]` links; orphan nodes |
| AI agent learning (skills) | 60% | Skills in repo but not installed or published |
| Claude self-evolution | 0% | No eval loop, no SKILL.md iteration |

**Actions taken in this session:**
- Fixed all 36 broken wikilinks across 8 files
- Linked all orphan nodes (skills, diagrams) via README + 00_INDEX
- Updated SESSION_CONTEXT.md with two-session log
- Created 00_INDEX.md as vault central hub

---

## Critical Discovery — agentskills.io is Anthropic's Own Standard

**Date announced:** December 18, 2025
**Source:** `github.com/anthropics/skills`

Anthropic published the Agent Skills open standard and it is explicitly cross-platform — compatible with Claude Code, OpenAI Codex, Gemini CLI, GitHub Copilot, Cursor, VS Code, and 20+ other platforms.

**What this means for this project:**
The SKILL.md files already built (`canara-bank-parser`, `ai-bank-import`) are in Anthropic's official format. Cowork's built-in skills (docx, pdf, pptx, xlsx) are the reference implementations. We were building on the right foundation without knowing it.

**Required SKILL.md frontmatter (minimal):**
```yaml
---
name: my-skill-name          # lowercase, hyphens
description: >               # complete description of what + when
  What this skill does and when Claude should use it.
---
```

---

## Repos Analysed (8 total)

### 1. Hermes Agent — `NousResearch/hermes-agent`
**What it is:** Standalone Python AI agent with built-in learning loop (v0.3.0, Mar 2026).
**Key mechanisms:**
- Skills stored in `~/.hermes/skills/` — follows agentskills.io standard
- Memory via `MEMORY.md` + `USER.md` + FTS5 full-text cross-session search
- Honcho integration for user modeling ("dialectic user model")
- Self-evolution via `hermes-agent-self-evolution` (GEPA + DSPy)

**Relevance:** HIGH — agentskills.io compatibility means our SKILL.md files work here directly.
**Cost:** Free (open source). Needs Claude API access.
**Use for:** Goal 5 (self-evolution) via GEPA runs.

---

### 2. claude-honcho — `plastic-labs/claude-honcho`
**What it is:** Claude Code plugin using Honcho API for persistent memory.
**Key mechanisms:**
- Lifecycle hooks: SessionStart → UserPrompt → PostToolUse → SessionEnd
- Semantic search via MCP tools (`search`, `chat`, `create_conclusion`)
- Config at `~/.honcho/config.json`
- Multi-editor support (Claude Code + Cursor share context)

**Relevance:** MEDIUM — powerful but requires Honcho managed service (paid).
**Cost:** Plugin free; Honcho managed service is usage-based (app.honcho.dev).
**Use for:** Goal 1 (memory) — but Honcho is overkill for solo dev.

---

### 3. honcho — `plastic-labs/honcho`
**What it is:** The underlying memory library powering claude-honcho.
**Key mechanisms:**
- Peer-centric paradigm — humans and agents treated equally
- Storage: Sessions, Messages, Collections (vector-embedded), Documents
- Insights layer: background peer modeling, session summarization
- Self-hosted (MIT) or managed service

**Relevance:** LOW for solo dev. Designed for multi-user, multi-agent teams.
**Cost:** Self-hosted = free. Managed = usage-based.
**Decision:** Skip. Use claude-mem instead (simpler, fully local).

---

### 4. claude-mem — `thedotmack/claude-mem`
**What it is:** Lightweight persistent memory for Claude Code sessions. Fully local.
**Key mechanisms:**
- Lifecycle hooks capture all tool calls as "observations"
- SQLite + ChromaDB vector store + FTS5 full-text search
- MCP tools: `search`, `timeline`, `get_observations`
- Web viewer UI at localhost for browsing memory stream
- 3-layer retrieval: compact index → chronological → full details
- `<private>` tags to exclude sensitive content

**Relevance:** HIGH — exactly what's needed for Goal 1.
**Cost:** Free. AGPL-3.0 open source. Fully local, no external APIs.
**Action:** Install via Mac terminal. See setup section below.

---

### 5. OpenSpace — `HKUDS/OpenSpace`
**What it is:** MCP server that watches your work and auto-creates skills.
**Key mechanisms:**
- Plugs into Claude Code / Cursor via Model Context Protocol
- Monitors task execution; auto-extracts skills from successful patterns
- Local SQLite skill store + optional cloud community (open-space.cloud)
- Skills self-repair when tools break ("Auto-Fix")
- Claims 46% token reduction and 4.2× higher economic output (GDPVal benchmark)

**Relevance:** VERY HIGH — the closest thing to Goal 5 (auto skill creation).
**Cost:** Local mode = free. Cloud marketplace API key = unknown pricing.
**Action:** Add as MCP server at start of next project.

---

### 6. superpowers — `obra/superpowers`
**What it is:** Software development workflow as ~12 SKILL.md files.
**Key mechanisms:**
- Mandatory workflow: brainstorm → git worktrees → plan → TDD → review → merge
- Skills are enforced, not optional ("The agent checks for relevant skills before any task")
- Covers: TDD, systematic debugging, code review, parallel subagents, git worktrees
- Compatible with Claude Code, Cursor, Codex, OpenCode, Gemini CLI

**Relevance:** MEDIUM — strong methodology reference for dev projects.
**Cost:** Free. Open source.
**Action:** Read the `writing-skills` SKILL.md as a template reference.

---

### 7. everything-claude-code — `affaan-m/everything-claude-code`
**What it is:** Maximalist Claude Code optimization system from 10+ months of production use.
**Key features:**
- 135+ skills across backend, frontend, testing, security, language-specific
- 30 specialized agents (planner, architect, reviewer, security-reviewer, docs-lookup)
- 60+ slash commands (`/plan`, `/tdd`, `/code-review`, `/verify`, `/evolve`)
- `/evolve` command clusters patterns into new skills automatically
- CLAUDE.md templates for real stacks (Next.js/Supabase, Django, Go, Laravel, Rust)
- Session hooks for memory: load context on start, compress on stop

**Relevance:** HIGH as a reference library for skill content.
**Cost:** Free. Open source.
**Action:** Mine for skill templates. Especially `session-handoff` and language-specific patterns.

---

### 8. awesome-claude-skills — `ComposioHQ/awesome-claude-skills`
**What it is:** Community marketplace for Claude skills. 49K stars, 80+ skills, 344 PRs.
**Categories:** Document Processing, Dev Tools, Data & Analysis, Business, Writing, Creative, Productivity, Collaboration, Security.
**Key detail:** 78 pre-built SaaS workflow skills via Composio MCP integration.

**Relevance:** HIGH — where to publish our skills.
**Cost:** Free. Submit via GitHub PR.
**Action:** Submit `canara-bank-parser` as a PR. Fills a genuine gap (Indian bank UPI patterns).

---

## Recommended Stack (3 layers, all free)

```
Layer 1 — MEMORY
  Tool:    claude-mem (thedotmack/claude-mem)
  Cost:    Free (AGPL-3.0, local SQLite)
  Solves:  Goal 1 — persistent cross-session memory
  Install: npm install -g claude-mem (then add to Claude Code settings)

Layer 2 — AUTO SKILL CREATION
  Tool:    OpenSpace MCP server (HKUDS/OpenSpace)
  Cost:    Free (local mode)
  Solves:  Goal 4 + Goal 5 — watches work, auto-extracts skills
  Install: Add MCP server config to ~/.claude/settings.json

Layer 3 — SKILL PUBLISHING
  Platform: awesome-claude-skills (ComposioHQ)
  Cost:     Free (GitHub PR)
  Solves:   Goal 4 — skills reach the global community
  Action:   PR with canara-bank-parser SKILL.md
```

**Optional (Goal 5 — self-evolution):**
```
  Tool:    hermes-agent-self-evolution (GEPA + DSPy)
  Cost:    ~$2–10 per optimization run (Claude API calls)
  Solves:  Goal 5 — improves SKILL.md quality over time
  Trigger: Run after collecting 5+ edge cases per skill
```

---

## Skills to Build (from this project's knowledge)

### Already built ✅
| Skill | Status | Location |
|---|---|---|
| `canara-bank-parser` | Production-ready | `docs/canara-bank-parser-skill/SKILL.md` |
| `ai-bank-import` | Production-ready | `docs/ai-import-skill/SKILL.md` |

### High priority — should build next
| Skill | What it codifies | Source |
|---|---|---|
| `obsidian-claude-project` | Vault setup, SESSION_CONTEXT, wikilinks, CLAUDE.md pattern | This project's entire methodology |
| `session-handoff` | Template for SESSION_CONTEXT.md — what to capture, how to write it | This session's work |
| `fastapi-sqlmodel-stack` | Service layer, routers, SQLModel, Docker, cursor pagination | expense-tracker backend |
| `react-vite-frontend` | Axios modules, PeriodContext, cursor UI, bulk select, modals | expense-tracker frontend |

### Medium priority
| Skill | What it codifies |
|---|---|
| `pwa-offline-strategy` | Service Worker cache-first + network-first, versioned cache names |
| `docker-compose-fullstack` | 3-service pattern, healthchecks, named volumes, CRLF safety |
| `docx-professional-report` | Node.js docx library: TOC, metric cards, tables, palette, footers |
| `pptx-minimal-design` | PptxGenJS: no-emoji rule, card heights, header bars, flow diagrams |

---

## Install Commands (Mac terminal)

```bash
# Layer 1: claude-mem
npm install -g @thedotmack/claude-mem
# Then add to ~/.claude/settings.json under "mcpServers"

# Layer 2: OpenSpace
git clone https://github.com/HKUDS/OpenSpace ~/.local/share/openspace
cd ~/.local/share/openspace && pip install -e .
# Then add MCP server config pointing to openspace_mcp_server.py

# Layer 3: Install our skills globally
mkdir -p ~/.claude/skills/canara-bank-parser
cp ~/Documents/ObsidianVaults/expense-tracker/docs/canara-bank-parser-skill/SKILL.md \
   ~/.claude/skills/canara-bank-parser/SKILL.md

mkdir -p ~/.claude/skills/ai-bank-import
cp ~/Documents/ObsidianVaults/expense-tracker/docs/ai-import-skill/SKILL.md \
   ~/.claude/skills/ai-bank-import/SKILL.md

# Push expense-tracker commits
cd ~/Documents/ObsidianVaults/expense-tracker
git push origin feature/v2.3.0
```

---

## New Project — claude-agent-lab

A dedicated project for building, testing, and evolving AI skills was planned from this research.

**Location:** `~/Documents/ObsidianVaults/claude-agent-lab/`
**Purpose:** Skill library + memory system + self-evolution experiments
**Created:** 2026-03-30 (skeleton created in this session)

See the `_claude-agent-lab/` folder in this vault for the initial skeleton. Move it:
```bash
mv ~/Documents/ObsidianVaults/expense-tracker/_claude-agent-lab \
   ~/Documents/ObsidianVaults/claude-agent-lab
```

---

## Key Links

- [anthropics/skills](https://github.com/anthropics/skills) — Anthropic's official skill repo
- [agentskills.io spec](https://github.com/agentskills/agentskills) — the open standard
- [awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) — community marketplace
- [claude-mem](https://github.com/thedotmack/claude-mem) — local memory plugin
- [OpenSpace](https://github.com/HKUDS/OpenSpace) — auto skill creation
- [hermes-agent](https://github.com/NousResearch/hermes-agent) — standalone agent with learning loop
- [hermes-agent-self-evolution](https://github.com/NousResearch/hermes-agent-self-evolution) — GEPA optimizer
- [Claude for Open Source](https://claude.com/contact-sales/claude-for-oss) — free Claude Max 20x for OSS maintainers
