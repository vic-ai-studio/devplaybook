---
title: "Aider — AI Pair Programmer in Your Terminal"
description: "Aider is an open-source AI pair programming tool that works in your terminal. Edit code across multiple files using GPT-4o, Claude, or any LLM. Works with any git repo."
category: "AI Coding"
pricing: "Open Source"
pricingDetail: "Free (you pay only for your own API key — OpenAI/Anthropic usage)"
website: "https://aider.chat"
github: "https://github.com/Aider-AI/aider"
tags: ["ai-coding", "terminal", "cli", "open-source", "gpt-4", "claude", "pair-programming"]
pros:
  - "Works entirely in the terminal — no IDE plugin required"
  - "Multi-file edits with full git history awareness"
  - "Supports 60+ LLMs: GPT-4o, Claude 3.5 Sonnet, Gemini, local Ollama models"
  - "Auto-commits each change with a meaningful message"
  - "Repo-map feature provides context of entire codebase to the LLM"
  - "Active open-source community, updated frequently"
cons:
  - "Requires your own API key — costs vary with model"
  - "Terminal-only UX; no visual diff before applying changes"
  - "Large repos can be slow to index the repo-map"
  - "Steeper learning curve than GUI-based tools"
date: "2026-03-24"
---

## What is Aider?

Aider is a command-line AI pair programming tool that connects directly to LLMs (GPT-4o, Claude 3.5 Sonnet, Gemini, etc.) and edits your code in real time. Unlike GitHub Copilot or Cursor, Aider is terminal-first — you describe what you want, and it modifies files across your whole project, then commits the changes to git automatically.

## How It Works

```bash
pip install aider-chat
aider --model claude-3-5-sonnet-20241022
```

Once running, you type natural-language instructions in the terminal. Aider reads the relevant files, generates a diff, applies it, and commits. You can add/remove files from context at any time.

## Key Feature: Repo Map

Aider builds a "repo map" — a concise summary of your codebase's structure (functions, classes, imports) — and sends it to the LLM with every request. This gives the model context beyond just the open files, making cross-file refactors much more accurate.

## Pricing

Aider itself is free and open source. You pay only for the API tokens consumed by your chosen LLM provider. For most tasks, Claude Sonnet or GPT-4o mini keep costs under $1–5/day.

## Best For

- Developers who prefer CLI workflows over IDE plugins
- Large refactors that touch many files at once
- CI/CD automation and scripted code generation
- Teams that want full LLM flexibility without vendor lock-in

## Quick Start

```bash
pip install aider-chat

# Start with Claude Sonnet (recommended for code quality)
export ANTHROPIC_API_KEY=sk-ant-...
aider --model claude-3-5-sonnet-20241022

# Or with GPT-4o
export OPENAI_API_KEY=sk-...
aider --model gpt-4o

# Add specific files to the context
aider src/auth/middleware.py src/routes/users.py
```

Once in the session, type natural language instructions. Aider shows a diff before applying and commits automatically:

```
> Add rate limiting to the login endpoint — max 5 attempts per IP per minute
> Refactor the user service to use async/await throughout
> Write pytest tests for all public methods in auth.py
```

## Use Cases

**Multi-file refactors**: Ask Aider to rename a function across the entire codebase, migrate from one library to another, or enforce a coding convention everywhere. The repo-map ensures changes are consistent — it doesn't miss files where the old pattern exists.

**Automated scripting in CI**: Aider can be run non-interactively in CI pipelines. For example, auto-generate boilerplate when a new module is added, or apply code standards checks with auto-fix. Use `--yes` to auto-confirm all changes without prompts.

**Exploration with cheap models**: Use a fast, cheap model (GPT-4o mini or Claude Haiku) for initial scaffolding or boilerplate generation, then switch to a smarter model for the tricky logic. Aider's `--model` flag makes swapping trivial.

**Working without an IDE**: On remote servers, in Docker containers, or in environments where installing VS Code extensions isn't practical, Aider provides full AI-assisted coding from a plain SSH session. It's the most practical AI coding tool for server-side work.

## Concrete Use Case: Refactoring a Legacy Express.js Codebase to Modern Async Patterns

A solo developer inherits a 15,000-line Express.js application built in 2018. The codebase uses callback-based patterns throughout — nested callbacks for database queries, file I/O wrapped in manual Promise constructors, and error handling scattered across try/catch blocks mixed with `.catch()` chains. There are 45 route handlers across 12 files, each following slightly different patterns. The developer needs to modernize the entire codebase to async/await, replace the callback-based `pg` client with connection pooling, and update all error handling to use a centralized Express error middleware — without breaking the API contract for existing consumers.

The developer starts Aider with the route files added to context: `aider src/routes/*.js src/middleware/*.js src/db/*.js`. The repo-map feature automatically includes an understanding of the project structure — how routes reference database helpers, which middleware functions are shared across routes, and where error types are defined. The developer begins with a targeted instruction: "Refactor src/db/client.js from callback-based pg queries to async/await with a connection pool, and update the exported interface." Aider modifies the database layer and then, when asked to "update all route handlers in src/routes/ to use the new async database client and async/await instead of callbacks," it processes all 12 route files in a single pass, maintaining consistency in error handling patterns across files it can see in the repo map.

Each change is automatically committed to git with a descriptive message, creating a clean refactoring history. When a transformation introduces a subtle bug — an early return that skips the connection release — the developer spots it in the diff output, types "that last change has a bug: the connection isn't released when validation fails on line 34 of users.js," and Aider fixes it with a follow-up commit. The entire refactoring takes a day instead of the estimated week, and the git history shows a clear progression of atomic changes that can be reviewed individually. The developer uses `git diff main..refactor-async` to verify no API behavior changed, and runs the existing integration test suite to confirm all 120 tests still pass.

## When to Use Aider

**Use Aider when:**
- You prefer terminal-based workflows and want AI code assistance without installing IDE plugins or switching to a different editor
- You need to perform large-scale refactors across multiple files simultaneously — Aider's repo-map gives the LLM structural awareness that single-file tools lack
- You want automatic git commits for every AI-generated change, creating a clean audit trail that can be reviewed, cherry-picked, or reverted independently
- You are working on a remote server or inside a Docker container via SSH where GUI-based AI coding tools are impractical or unavailable
- You want flexibility to switch between LLM providers (OpenAI, Anthropic, Google, local Ollama models) based on task complexity and cost

**When NOT to use Aider:**
- You prefer visual diffs and inline code suggestions — GUI tools like Cursor or GitHub Copilot in VS Code provide a more visual, integrated experience for developers who think in terms of highlighted code rather than terminal output
- Your codebase is very large (100K+ lines) and you frequently need the LLM to understand deep cross-module dependencies — the repo-map indexing can become slow, and context window limits may truncate important structural information
- You are new to AI-assisted coding and want a guided, low-friction introduction — Aider's terminal interface and manual file management have a steeper learning curve than tools with automatic context detection
- Your team uses a shared IDE configuration (VS Code workspace settings, shared extensions) and you need the AI tool to integrate with linting, formatting, and debugging workflows already configured in the editor
