# Chapter 01: Setup & Basics

> Get Claude Code installed, configured, and running your first commands in under 10 minutes.

---

## Installation

### Method 1: npm (Recommended)

```bash
npm install -g @anthropic-ai/claude-code
```

Verify the installation:

```bash
claude --version
```

### Method 2: Direct Download

If you prefer not to use npm globally:

```bash
npx @anthropic-ai/claude-code
```

This downloads and runs Claude Code without a global install. Useful for trying it out before committing.

### System Requirements

| Requirement | Minimum | Recommended |
|-------------|---------|-------------|
| Node.js | 18.0+ | 20.x LTS |
| RAM | 4 GB | 8 GB+ |
| OS | macOS, Linux, Windows (WSL or native) | Any |
| Terminal | Any | One with 256-color support |

### Windows-Specific Notes

Claude Code runs natively on Windows. A few things to keep in mind:

- Use forward slashes in paths when talking to Claude (it understands both, but forward slashes are clearer)
- Git Bash, PowerShell, and CMD all work — but Git Bash gives the most Unix-like experience
- WSL works perfectly if you prefer a Linux environment

---

## Authentication

### Option A: API Key

Set your Anthropic API key:

```bash
export ANTHROPIC_API_KEY="sk-ant-..."
```

To persist it, add to your shell profile:

```bash
# ~/.bashrc or ~/.zshrc
export ANTHROPIC_API_KEY="sk-ant-your-key-here"
```

### Option B: Claude Pro/Max Subscription

If you have a Claude Pro or Max subscription, Claude Code can authenticate through your browser:

```bash
claude
# Follow the OAuth prompts in your browser
```

This creates a session token stored securely on your machine. No API key needed.

### Option C: Amazon Bedrock / Google Vertex AI

For enterprise environments:

```bash
# Bedrock
export ANTHROPIC_MODEL="us.anthropic.claude-sonnet-4-20250514"
export AWS_REGION="us-east-1"
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
claude --provider bedrock

# Vertex AI
export ANTHROPIC_MODEL="claude-sonnet-4@20250514"
export CLOUD_ML_REGION="us-east5"
export ANTHROPIC_VERTEX_PROJECT_ID="your-project"
claude --provider vertex
```

---

## First Run

Navigate to any project directory and start Claude Code:

```bash
cd ~/projects/my-app
claude
```

You'll see an interactive prompt. Try these starter commands:

```
> What does this project do? Give me a high-level overview.

> Show me the main entry point of this application.

> Are there any obvious bugs or code smells in src/utils.ts?
```

Claude Code will:
1. Read your project files as needed
2. Understand the codebase structure
3. Give you informed, context-aware answers

### Non-Interactive Mode

For scripting and automation, use the `-p` (print) flag:

```bash
claude -p "List all TODO comments in this project"
```

This runs the query, prints the result, and exits. No interactive session.

### Piping Input

You can pipe content into Claude Code:

```bash
cat error.log | claude -p "What caused this error and how do I fix it?"

git diff HEAD~3 | claude -p "Review these changes for potential issues"

curl -s https://api.example.com/docs | claude -p "Generate TypeScript types for this API"
```

---

## The Permission Model

Claude Code uses a tiered permission system. Understanding it is crucial for both safety and speed.

### Permission Categories

| Category | Examples | Default |
|----------|----------|---------|
| **Read** | Reading files, listing directories, searching code | Allowed |
| **Write** | Creating files, editing files | Requires approval |
| **Execute** | Running shell commands, scripts | Requires approval |
| **MCP** | Calling MCP tool servers | Requires approval |

### Approval Modes

When Claude wants to do something that needs approval, you'll see a prompt:

```
Claude wants to run: npm test
[y] Allow  [n] Deny  [a] Always allow this tool  [e] Explain
```

Your options:

- **y** — Allow this one time
- **n** — Deny and ask Claude to try a different approach
- **a** — Always allow this tool for the rest of the session
- **e** — Ask Claude to explain why it needs this permission

### The `--dangerously-skip-permissions` Flag

For CI/CD and automation, you can bypass all permission prompts:

```bash
claude -p "Run the test suite and fix any failures" --dangerously-skip-permissions
```

**Warning:** Only use this in sandboxed environments (CI runners, Docker containers, VMs). Never on your local machine with access to production credentials.

### Allowed Tools Configuration

You can pre-approve specific tools in your project settings:

```json
// .claude/settings.json
{
  "permissions": {
    "allow": [
      "Bash(npm test)",
      "Bash(npm run lint)",
      "Bash(git status)",
      "Bash(git diff)"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force)"
    ]
  }
}
```

This creates a whitelist/blacklist of commands Claude can run without asking. Wildcards work:

```json
{
  "permissions": {
    "allow": [
      "Bash(npm *)",
      "Bash(git log*)",
      "Bash(git diff*)",
      "Bash(git status*)"
    ]
  }
}
```

---

## The .claudeignore File

Just like `.gitignore` tells Git which files to skip, `.claudeignore` tells Claude Code which files to ignore.

### Why You Need It

1. **Security** — Prevent Claude from reading `.env` files, credentials, or secrets
2. **Performance** — Skip large binary files, node_modules, build artifacts
3. **Focus** — Keep Claude focused on relevant source code

### Basic .claudeignore

Create a `.claudeignore` file in your project root:

```gitignore
# Dependencies
node_modules/
vendor/
.venv/

# Build artifacts
dist/
build/
*.min.js
*.min.css

# Secrets and credentials
.env
.env.*
*.pem
*.key
credentials.json
service-account.json

# Large files
*.zip
*.tar.gz
*.mp4
*.mov
*.psd

# IDE and OS files
.idea/
.vscode/settings.json
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Generated files
coverage/
.nyc_output/
__pycache__/
*.pyc
```

### How .claudeignore Interacts with .gitignore

Claude Code respects both:
- Files in `.gitignore` are already excluded from Claude's view
- `.claudeignore` adds additional exclusions on top of `.gitignore`
- If a file is in `.claudeignore` but NOT in `.gitignore`, Claude won't read it but Git will still track it

### Pro Tip: What to Include vs. Exclude

**Include** files that help Claude understand your project:
- Source code
- Configuration files (tsconfig, package.json, Cargo.toml)
- Test files
- Documentation
- Database schemas/migrations

**Exclude** files that add noise:
- Generated code (unless Claude needs to debug it)
- Binary assets
- Dependency lockfiles (package-lock.json is huge and rarely useful)
- CI artifacts

---

## Project Structure Awareness

Claude Code automatically understands your project structure. When you start a session, it:

1. Reads visible files in the working directory
2. Identifies the project type (Node.js, Python, Rust, Go, etc.)
3. Finds configuration files to understand build tools, linters, test runners
4. Maps out the directory structure

### Helping Claude Understand Your Project Faster

The single most impactful thing you can do is create a `CLAUDE.md` file (covered in depth in Chapter 02). A quick preview:

```markdown
# CLAUDE.md

## Project Overview
This is a Next.js 14 e-commerce app with Stripe integration.

## Key Commands
- `npm run dev` — Start dev server on port 3000
- `npm test` — Run Jest tests
- `npm run lint` — ESLint + Prettier

## Architecture
- `src/app/` — Next.js App Router pages
- `src/components/` — React components
- `src/lib/` — Utility functions and API clients
- `prisma/` — Database schema and migrations
```

Even this minimal file dramatically improves Claude's responses.

---

## Essential Commands

### Starting a Session

```bash
# Interactive mode (most common)
claude

# Continue the most recent conversation
claude --continue

# Resume a specific conversation
claude --resume

# Start fresh (no history)
claude --no-history
```

### During a Session

| Command | What It Does |
|---------|-------------|
| `/help` | Show all available commands |
| `/clear` | Clear conversation context |
| `/compact` | Summarize and compress context to free up space |
| `/cost` | Show token usage and estimated cost |
| `/model` | Switch between models mid-session |
| `/bug` | Report a bug to the Claude Code team |
| `/quit` or Ctrl+C | Exit the session |

### One-Shot Commands

```bash
# Quick question, no session
claude -p "What version of React is this project using?"

# Generate output to a file
claude -p "Generate a comprehensive .gitignore for a Node.js project" > .gitignore

# Chain with other tools
claude -p "Write a SQL migration to add an 'email_verified' boolean column to the users table" | psql mydb
```

---

## Model Selection

Claude Code supports multiple models. Choose based on your task:

```bash
# Use a specific model
claude --model claude-sonnet-4-20250514

# Use Opus for complex architecture decisions
claude --model claude-opus-4-20250514

# Use Haiku for quick, simple tasks
claude --model claude-haiku-3-5-20241022
```

### When to Use Which Model

| Model | Best For | Speed | Cost |
|-------|----------|-------|------|
| **Opus** | Architecture decisions, complex refactors, security audits | Slower | Higher |
| **Sonnet** | Daily coding, debugging, code review (default) | Fast | Moderate |
| **Haiku** | Quick lookups, simple edits, boilerplate generation | Fastest | Lowest |

### Switching Models Mid-Session

```
/model claude-opus-4-20250514
```

This is useful when you start with Sonnet for exploration, then switch to Opus for a critical architectural decision.

---

## Understanding Token Usage

Every interaction with Claude Code uses tokens. Being token-aware helps you:
- Keep costs predictable
- Avoid hitting context limits
- Make sessions more efficient

### Checking Usage

During a session:
```
/cost
```

This shows:
- Tokens used in the current session
- Estimated cost in USD
- Breakdown by input vs. output tokens

### Tips for Token Efficiency

1. **Use .claudeignore** — Don't let Claude read files it doesn't need
2. **Be specific** — "Fix the auth bug in src/auth/login.ts" uses fewer tokens than "There's a bug somewhere in the auth system"
3. **Use /compact** — When context gets large, compress it
4. **Use /clear** when switching tasks — Don't carry irrelevant context
5. **Use non-interactive mode for simple tasks** — `claude -p` avoids session overhead

---

## Environment Variables

Key environment variables that control Claude Code behavior:

```bash
# Authentication
ANTHROPIC_API_KEY="sk-ant-..."          # Your API key

# Model selection
CLAUDE_MODEL="claude-sonnet-4-20250514"  # Default model

# Behavior
CLAUDE_CODE_MAX_TOKENS=8192            # Max output tokens per response
CLAUDE_CODE_USE_BEDROCK=1              # Use AWS Bedrock
CLAUDE_CODE_USE_VERTEX=1               # Use Google Vertex AI

# Proxy (for corporate networks)
HTTPS_PROXY="http://proxy.corp.com:8080"
```

---

## Quick Wins: Your First Productive Session

Here's a real workflow you can try right now:

```bash
cd ~/your-project
claude
```

Then try these prompts in order:

```
> Give me a brief overview of this project's architecture.

> What are the main dependencies and their versions?

> Find any potential security issues in the authentication code.

> Write a unit test for the function in src/utils/validate.ts

> Review the last 5 commits. Are there any concerning patterns?
```

Within 10 minutes, you'll have:
- A mental model of the codebase
- A security audit
- New tests
- A code review

That's the power of Claude Code. And we're just getting started.

---

**Next Chapter:** [02 - CLAUDE.md Configuration](02-claude-md-configuration.md) — The single most important file for Claude Code productivity.
