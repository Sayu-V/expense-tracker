---
name: session-handoff
description: >
  Write a SESSION_CONTEXT.md entry that captures everything a future Claude
  agent needs to continue work without asking questions. Use at the end of
  every Claude Code or Cowork session where meaningful work was done.
  Captures: commits made, decisions taken, architectural choices, workarounds
  discovered, the exact git state, and next actions. Designed for Obsidian
  vaults using the obsidian-claude-project pattern.
version: 1.0.0
project_origin: expense-tracker (v2.3.0) + claude-agent-lab
license: MIT
---

# Session Handoff Skill

## What this skill does

Writes a structured SESSION_CONTEXT.md block that lets a future Claude session
(or a future human) pick up exactly where you left off — without any "what was
I doing?" time wasted.

Developed from two sessions on the expense-tracker project where context was
lost between sessions and had to be reconstructed from git log.

---

## When to trigger

Use this skill at the END of any session where you:
- Made commits
- Made an architectural or tool decision
- Discovered a workaround or edge case
- Left something unfinished
- Did research that should be remembered

---

## Session block template

```markdown
## Session YYYY-MM-DD — [2–5 word title]

### Work completed

| Task | Commit | Status |
|------|--------|--------|
| Task description | `abc1234` | ✅ / 🚧 |

### Decisions made
- [Decision]: [Why this was chosen over alternatives]
- [Decision]: [Why]

### Workarounds discovered
- [Problem + solution, specific enough to reproduce]

### Push state
```bash
git push origin branch-name
# Commits not yet pushed: list them
```

### Next session: start here
1. [Most important next action]
2. [Second action]
3. [Optional third]
```

---

## What to always include

**Commits:** Every commit hash and a one-line summary of what changed.
Never say "updated the code" — say "added cursor pagination to expenses endpoint, moved offset logic to expense_service.py".

**Decisions:** When you chose Tool A over Tool B, write why. Future Claude will encounter the same choice and waste time re-evaluating without this.

**Workarounds:** If you hit a weird bug and fixed it, write the fix in enough detail that it can be applied again. This project's key workaround: git lock files in Cowork sandbox require renaming before every commit.

**Git state:** Always include the exact `git push` command. Include all unpushed commit hashes.

**Next actions:** Numbered, ordered by priority. The top item should be specific enough to start immediately without thinking.

---

## Anti-patterns (what NOT to write)

❌ "Fixed some bugs" → ✅ "Fixed broken `[[NoneXXX]]` wikilinks in 8 files (36 total)"
❌ "Updated docs" → ✅ "Renamed all docs with numeric prefix (01_PRD → 12_Final_Report) via git mv"
❌ "Need to do more work" → ✅ "Submit canara-bank-parser PR to ComposioHQ/awesome-claude-skills"
❌ Long prose paragraphs → ✅ Structured tables and numbered lists

---

## File location convention

Always append to the TOP of SESSION_CONTEXT.md (most recent first), not the bottom.
Keep the last 3 sessions in full; summarise older sessions into one-line entries.
