# Claude Code Cheatsheet

> Print this. Pin it next to your monitor. Reference it daily.

---

## Installation & Auth

```bash
npm install -g @anthropic-ai/claude-code    # Install
claude --version                             # Verify
export ANTHROPIC_API_KEY="sk-ant-..."        # Set API key
claude auth login                            # OAuth login (Pro/Max)
```

## Starting Sessions

```bash
claude                    # Interactive session
claude --continue         # Resume last conversation
claude --resume           # Pick a conversation to resume
claude -p "query"         # One-shot (no session)
claude --model opus       # Use specific model
```

## Session Commands

| Command | Action |
|---------|--------|
| `/help` | Show all commands |
| `/clear` | Clear context |
| `/compact` | Compress context (use every 20-30 exchanges) |
| `/cost` | Show token usage |
| `/model <name>` | Switch model |
| `/bug` | Report a bug |
| `/quit` | Exit |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Ctrl+C` | Cancel / Exit |
| `Shift+Enter` | Multi-line input |
| `Up Arrow` | Edit previous message |
| `Tab` | Autocomplete paths |
| `Escape` | Cancel input |

## Model Selection Guide

| Model | Use For | Speed | Cost |
|-------|---------|-------|------|
| Haiku | Quick lookups, simple edits | Fastest | $ |
| Sonnet | Daily coding (default) | Fast | $$ |
| Opus | Architecture, complex refactors | Slower | $$$ |

## CLAUDE.md Quick Template

```markdown
# CLAUDE.md

## Project
[What it does in 2 sentences]

## Stack
[Framework, language, database, key tools]

## Commands
- `npm run dev` — Dev server
- `npm test` — Run tests
- `npm run lint` — Lint check

## Architecture
- `src/app/` — Pages
- `src/components/` — UI components
- `src/lib/` — Utilities
- `src/services/` — Business logic

## Rules
- ALWAYS: run tests before completing a task
- NEVER: use `any` type without justification
```

## CLAUDE.md File Locations

| Location | Scope |
|----------|-------|
| `~/.claude/CLAUDE.md` | All projects (personal prefs) |
| `./CLAUDE.md` | This project |
| `./src/CLAUDE.md` | This directory |

## .claudeignore Essentials

```gitignore
node_modules/
dist/
.env
.env.*
*.pem
*.key
*.log
coverage/
*.min.js
package-lock.json
```

## Permission Settings

```json
// .claude/settings.json
{
  "permissions": {
    "allow": ["Bash(npm *)", "Bash(git *)"],
    "deny": ["Bash(rm -rf *)"]
  }
}
```

## MCP Server Setup

```bash
# Add a server
claude mcp add <name> <command> [args...]

# List servers
claude mcp list

# Remove
claude mcp remove <name>

# Example: PostgreSQL
claude mcp add postgres npx -y @modelcontextprotocol/server-postgres \
  "postgresql://localhost:5432/mydb"
```

## MCP Config File

```json
// .claude/mcp.json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": { "API_KEY": "${ENV_VAR}" }
    }
  }
}
```

## Hook Configuration

```json
// .claude/settings.json
{
  "hooks": {
    "PreToolUse": [{
      "matcher": "Bash",
      "hooks": [{ "type": "command", "command": "python3 .claude/hooks/validate.py" }]
    }],
    "PostToolUse": [{
      "matcher": "Write|Edit",
      "hooks": [{ "type": "command", "command": "bash .claude/hooks/lint.sh" }]
    }]
  }
}
```

## Essential Prompt Templates

### New Feature
```
Create [feature]. Requirements: [list].
Follow patterns in [reference file].
Include tests. Use [specific libraries].
```

### Bug Fix
```
Bug: [what's wrong]. Expected: [correct behavior].
Actual: [current behavior]. Logs: [paste errors].
Diagnose and fix.
```

### Code Review
```
Review [file/changes] for: correctness, security,
performance, maintainability. Rate: pass/warning/critical.
```

### Refactor
```
Refactor [target]: [what to change].
Show impact analysis first. Don't change behavior.
Run tests after.
```

## Piping & Automation

```bash
# Pipe input
cat error.log | claude -p "What caused this?"
git diff | claude -p "Review these changes"

# Generate files
claude -p "Generate .gitignore for Node.js" > .gitignore

# CI/CD
claude -p "Run tests and fix failures" --dangerously-skip-permissions
```

## Sub-Agent Delegation

```
> Use a sub-agent to [research/explore/audit] [target].
> Report back with: [specific deliverables].
```

Types: Exploration | Planning | Research | Implementation

## Context Management

| Situation | Action |
|-----------|--------|
| Context getting large | `/compact` |
| Switching tasks | `/clear` |
| Claude forgets context | Summarize key points, then continue |
| Session too long | Handoff summary, new session |
| Need persistent context | Put it in CLAUDE.md |

## Cost-Saving Tips

1. Use `.claudeignore` aggressively
2. Be specific (don't say "read all files")
3. Use `/compact` regularly
4. Use `claude -p` for simple tasks
5. Use Haiku for exploration, Sonnet for coding
6. Read partial files: "Read lines 50-80 of config.ts"
7. Batch questions in one prompt

## Quick Wins Checklist

- [ ] Create CLAUDE.md in your project
- [ ] Create .claudeignore
- [ ] Pre-approve common commands in settings
- [ ] Set up at least one MCP server
- [ ] Create prompt templates for your common tasks
- [ ] Learn the /compact habit

## Environment Variables

```bash
ANTHROPIC_API_KEY="sk-ant-..."          # Auth
CLAUDE_MODEL="claude-sonnet-4-20250514" # Default model
CLAUDE_CODE_MAX_TOKENS=8192             # Max output tokens
HTTPS_PROXY="http://proxy:8080"         # Corporate proxy
```

---

*Claude Code Mastery Guide | devplaybook.cc | $19*
