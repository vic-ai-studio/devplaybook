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
