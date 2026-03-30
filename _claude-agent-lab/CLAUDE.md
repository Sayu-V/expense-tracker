# Claude Agent Lab — Project Context

- Purpose: Build, test, and evolve AI skills + memory systems
- Origin: Skills and research extracted from expense-tracker v2.3.0
- Current phase: Initial setup — install memory layer, publish first skills
- Key docs: [[docs/00_INDEX]] for full navigation, [[docs/SESSION_CONTEXT]] for memory log
- Skills live in: docs/skills/ (source) and skills/ (installable copies)
- Research reference: [[docs/01_Research_Notes]]

## Stack
- Memory: claude-mem (local SQLite + ChromaDB)
- Auto skill creation: OpenSpace MCP server
- Self-evolution: GEPA via hermes-agent-self-evolution ($2–10/run)
- Publishing: awesome-claude-skills (ComposioHQ) + anthropics/skills

## Skill format
All skills follow agentskills.io (Anthropic's open standard — github.com/anthropics/skills).
Required frontmatter: name, description. Optional: version, project_origin, license.
