---
name: obsidian-claude-project
description: >
  Set up a new software project inside an Obsidian vault so it serves as
  persistent AI memory across Claude sessions. Creates the full vault structure:
  CLAUDE.md, SESSION_CONTEXT.md, numbered docs with wikilinks, skills folder,
  graph-ready frontmatter, and git integration. Use when starting any project
  where you want Claude to remember context across sessions, maintain a
  knowledge graph, and extract reusable skills. Works with Claude Code and
  Claude Cowork.
version: 1.0.0
project_origin: expense-tracker (v2.3.0)
license: MIT
---

# Obsidian Claude Project Setup Skill

## What this skill does

Sets up a project directory that works as both a git repo and an Obsidian vault,
so every document Claude creates becomes a node in the knowledge graph, every
decision is traceable through wikilinks, and every session leaves a memory trail.

Developed and validated over the expense-tracker project (Jun 2023 – Mar 2026, v1.0.0 → v2.3.0).

---

## Vault Structure

```
project-name/
├── .obsidian/                    ← Obsidian config (commit this)
│   ├── app.json
│   ├── appearance.json
│   ├── community-plugins.json    ← templater-obsidian, terminal
│   ├── core-plugins.json         ← graph, backlink, canvas, search enabled
│   └── graph.json                ← showOrphans: true, linkDistance: 250
├── .claude/
│   └── settings.local.json       ← MCP server configs (gitignore this)
├── CLAUDE.md                     ← Project context loaded by Claude every session
├── README.md                     ← Project overview with wikilinks
├── CHANGELOG.md                  ← Version history in Obsidian format
├── docs/
│   ├── 00_INDEX.md               ← Central vault hub — MOST IMPORTANT FILE
│   ├── SESSION_CONTEXT.md        ← AI session memory log
│   ├── 01_PRD.md/.docx
│   ├── 02_Project_Proposal.md
│   ├── 03_Architecture.md
│   ├── 04_Tech_Stack.md
│   ├── 05_HLD.md/.docx
│   ├── 06_LLD.md/.docx
│   ├── 07_API_Reference.md
│   ├── 08_Deployment_Strategy.md
│   ├── ...
│   ├── skill-name/
│   │   └── SKILL.md              ← Reusable AI skills (agentskills.io format)
│   └── RESEARCH_NOTES.md         ← External research, tool evaluations
├── .gitignore
└── .gitattributes                ← * text=auto eol=lf  (Windows safety)
```

---

## CLAUDE.md Template

```markdown
# [Project Name] — Project Context

- Stack: [backend] + [frontend] + [database]
- Current version: vX.Y.Z
- Current phase: [phase description]
- What's done: [summary]
- What's next: [next action]
- PRD is at docs/01_PRD.md
- Key docs: [[docs/00_INDEX]] for full navigation
```

**Rules:**
- Keep CLAUDE.md under 20 lines — it loads every session, brevity = fewer tokens
- Update version and phase every session
- Always link to `docs/00_INDEX` for navigation

---

## YAML Frontmatter Standard

Every `.md` file in the vault must have this frontmatter:

```yaml
---
title: Document Title
date: YYYY-MM-DD
tags:
  - project-name
  - document-type        # architecture | hld | lld | api | changelog | skill | research
aliases:
  - Human-readable alias
version: X.Y.Z           # omit if not version-specific
status: active           # active | archived | draft
related:
  - "[[README]]"
  - "[[docs/00_INDEX]]"
  - "[[docs/03_Architecture]]"  # list 3–6 directly related docs
---
```

**Why this matters:** Obsidian uses `related:` frontmatter to draw edges in the graph view. Every file needs at least 2 entries to avoid being an orphan node.

---

## Wikilink Conventions

```markdown
# Same directory
[[README]]
[[CHANGELOG]]

# Subdirectory
[[docs/03_Architecture]]
[[docs/canara-bank-parser-skill/SKILL]]

# With display text
[[docs/05_HLD|High-Level Design]]

# In frontmatter related: (must be quoted)
  - "[[docs/04_Tech_Stack]]"
```

**Critical rules:**
1. Always use `[[docs/filename]]` not `[[filename]]` for files inside docs/
2. Files in the project root (`README`, `CHANGELOG`) use `[[README]]` without path
3. Never use `[[None...]]` — this is a bug pattern from broken rename scripts
4. After any bulk rename, run: `grep -r '\[\[None' . --include="*.md"` to verify zero broken links

---

## SESSION_CONTEXT.md Template

Update this file at the START of every session (load) and END of every session (save):

```markdown
# Session Context — [Project Name]

**Last updated:** YYYY-MM-DD
**Current branch:** `feature/vX.Y.Z`
**Current version:** vX.Y.Z

See also: [[README]] · [[CHANGELOG]] · [[docs/00_INDEX]]

---

## Session YYYY-MM-DD — [Session title]

### Work completed

| Task | Commit | Status |
|------|--------|--------|
| Task description | `abc1234` | ✅ |

### Decisions made
- Decision 1 and why
- Decision 2 and why

### Push needed
git push origin branch-name

---

## Previous session: YYYY-MM-DD — [Title]
[Brief summary]

---

## Current branch state
[git log --oneline -5 output]

## Tech stack reminder
[2-3 line summary of the stack]
```

**What to always capture:**
- Every commit hash + what changed
- Every architectural decision + the reason
- Every tool that was evaluated and why it was chosen/rejected
- The exact git push command needed
- Any workarounds that were needed (e.g. git lock files)

---

## 00_INDEX.md — The Central Hub

This is the most important file for the Obsidian graph. It should:
1. Link to every other `.md` file in the vault
2. List all `.docx` / `.pptx` files even if they don't render as links
3. Have a "Graph health" section tracking broken links
4. Have a "Git state" section with the push command

Without this file, disconnected subgraphs form. With it, the entire vault collapses into a single connected graph.

---

## Obsidian Plugins to Enable

**Core plugins (enable in Settings → Core plugins):**
```
graph, backlink, canvas, outgoing-link, search, tag-pane,
properties, page-preview, daily-notes, templates, bookmarks,
outline, word-count, file-recovery
```

**Community plugins (install):**
- `templater-obsidian` — for SESSION_CONTEXT and doc templates
- `terminal` — run git commands from inside Obsidian

**graph.json recommended settings:**
```json
{
  "showOrphans": true,
  "linkDistance": 250,
  "repelStrength": 10,
  "nodeSizeMultiplier": 1
}
```
Set `showOrphans: true` so you can see when new files aren't linked yet.

---

## Git Integration

```bash
# .gitattributes (always add this — Windows CRLF safety for Docker)
* text=auto eol=lf

# .gitignore essentials
.DS_Store
backend/.env
node_modules/
__pycache__/
.claude/settings.local.json   # contains API keys/MCP configs
```

**Commit message convention:**
```
type(scope): short description

Types: feat, fix, docs, chore, refactor, test
Scope: backend, frontend, docs, obsidian, skill, version

Examples:
  docs(readme): add wikilinks and Skills section
  feat(import): add 2-pass auto-categorisation
  chore(obsidian): update vault state after session
  docs(skill): add canara-bank-parser skill
```

**Branch strategy:**
```
main                ← stable, production-ready
feature/vX.Y.Z     ← current development
```

---

## Skills Extraction Pattern

After completing any non-trivial task, ask:
> "Can I write a SKILL.md that would let a future Claude agent do this without needing to figure it out from scratch?"

If yes, create `docs/skill-name/SKILL.md` with:
1. YAML frontmatter with `name`, `description`, `version`, `project_origin`, `license`
2. "What this skill does" — one paragraph
3. Any format specs the agent needs to know
4. Patterns, edge cases, and known pitfalls
5. Example inputs and expected outputs

**Privacy check before publishing:**
```bash
grep -n "real-name\|real-email\|account-number\|personal-data" docs/skill-name/SKILL.md
# Must return 0 results before publishing
```

---

## Common Pitfalls

**Broken wikilinks from rename scripts:**
When you rename files in bulk, regex-based rename scripts may produce `[[NoneFilename]]` instead of `[[Filename]]` when a stem isn't in the mapping. After any bulk rename, always run:
```bash
grep -rn '\[\[None' . --include="*.md"
```

**Obsidian not showing graph connections for docs/ files:**
Wikilinks must use the full relative path: `[[docs/04_Tech_Stack]]` not `[[04_Tech_Stack]]`. Obsidian resolves from vault root.

**Git lock files in this sandbox environment:**
If using Claude Cowork (virtiofs mount), `.git/*.lock` files accumulate. Before each git operation:
```python
python3 -c "
import os, glob, time
for f in glob.glob('.git/*.lock'):
    try: os.rename(f, f + str(int(time.time())))
    except: pass
"
```

**Binary files invisible in Obsidian graph:**
`.docx`, `.pptx`, `.xlsx` files cannot be linked in the Obsidian graph. Always maintain a `00_INDEX.md` that lists them in a table so they're documented even if not graph-visible.
