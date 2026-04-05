---
title: "Cursor"
description: "AI-first code editor built on VS Code — features inline code generation, codebase-aware chat, multi-file edits, and agent mode for autonomous coding tasks."
category: "AI/ML Dev Tools"
pricing: "Freemium"
pricingDetail: "Free tier with limited requests; Pro $20/month; Business $40/user/month"
website: "https://cursor.com"
github: ""
tags: [ai, code-editor, copilot, llm, developer-tools, ide, coding-assistant]
pros:
  - "Codebase-aware: indexes your entire repo so context includes relevant files"
  - "Multi-file edits in one prompt — more capable than single-file completions"
  - "Agent mode autonomously writes, runs, and fixes code across files"
  - "Uses frontier models (Claude, GPT-4o) with optional bring-your-own-key"
  - "Cursor Tab: smarter autocomplete that predicts multi-line edits"
cons:
  - "Subscription required for serious use — free tier limits hit quickly"
  - "Privacy concerns: code sent to cloud for context (Business tier has privacy mode)"
  - "Agent mode can make sweeping changes that need careful review"
  - "Heavier than VS Code — startup time and memory usage are higher"
date: "2026-04-02"
---

## Overview

Cursor is the leading AI code editor in 2026 — a VS Code fork with deep AI integration throughout the editing experience. Unlike GitHub Copilot which adds AI to VS Code, Cursor rebuilds the editor around AI-first workflows.

## Core Features

**Inline Generation (Cmd/Ctrl+K)**: Select code or place cursor, describe what you want, get inline edits:

```
# Select a function → Cmd+K → "add input validation and error handling"
# Cursor rewrites the function in place
```

**Chat with Codebase (Cmd+L)**: Ask questions with `@codebase` context:

```
@codebase how does authentication work in this project?
@auth.ts what does this middleware do?
@docs explain the API rate limiting logic
```

**Multi-file Edits**: Ask Cursor to modify multiple files in a single operation:

```
Add a `lastUpdated` timestamp field to the User model,
update the schema migration, and update all places
that create or update users to set this field.
```

Cursor shows a diff across all affected files before applying.

**Agent Mode**: Autonomous coding — Cursor reads files, writes code, runs terminal commands, and iterates until the task is done:

```
Implement a Redis-based rate limiter middleware for Express.
Install the package, write the middleware, add tests, and
integrate it into the auth routes.
```

## .cursorrules

Create a `.cursorrules` file in your project root to give Cursor project-specific context:

```
You are working on a Next.js 15 app with TypeScript strict mode.
- Use Server Components by default, Client Components only when needed
- All database queries go through the `db` module in src/lib/db.ts
- Error handling: use the Result<T, E> pattern from src/lib/result.ts
- Tests use Vitest with @testing-library/react
- Never use `any` or `@ts-ignore`
```

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Inline edit | Cmd+K |
| Open chat | Cmd+L |
| Accept suggestion | Tab |
| Open agent | Cmd+Shift+I |
| Reference file | @filename |
| Reference docs | @docs |

## Privacy

- **Cursor Pro/Free**: Code is sent to Cursor's servers for model inference
- **Business/Privacy Mode**: Code is not stored or used for training
- **Local models**: Not currently supported for codebase-indexed chat

## Use Cases

**Accelerating greenfield development**: When starting a new service or feature from scratch, use Agent mode to scaffold the entire structure — directory layout, base classes, config files, test setup — in one prompt. Cursor handles the boilerplate so you can focus on the actual logic from the start.

**Large-scale refactors**: Ask Cursor to rename a type across 30 files, migrate from one state management library to another, or add TypeScript strict mode compliance throughout a codebase. The multi-file diff view lets you review every change before committing, making large refactors auditable and reversible.

**Codebase Q&A for onboarding**: New team members can use Cursor Chat with `@codebase` to ask "how does authentication work in this project?", "what's the pattern for adding a new API route?", or "where are environment variables configured?" — and get accurate answers grounded in the actual code rather than outdated documentation.

**Debugging with context**: Paste an error stack trace into Cursor Chat alongside `@file` references to the relevant modules. Cursor can trace the error through multiple files and suggest a fix that accounts for how the code actually interacts — more effective than searching StackOverflow for generic solutions.

## Concrete Use Case: Extracting a Payment Module from a Django Monolith Using Agent Mode

A platform engineering team at a fintech startup is tasked with extracting the payments module from a 130,000-line Python Django monolith into a standalone FastAPI microservice. The module handles card tokenization, recurring billing, refund processing, and webhook delivery — deeply entangled with the user session system, the internal event bus, and four database models. Two senior engineers estimated the extraction at six weeks; prior similar work taught them how manually tracing cross-file dependencies drains time.

The team configures Cursor with a `.cursorrules` file specifying the target architecture: FastAPI with Pydantic V2, async SQLAlchemy 2.0, and an event schema matching their internal Kafka message format. Using `@codebase`, the lead engineer asks Cursor to map all entry points into the payments module — every import, every foreign key reference, every call site. Cursor identifies 52 call sites across 28 files in under two minutes, producing a structured list that becomes the migration checklist. For each call site, Cursor's multi-file edit mode refactors callers to use a thin `PaymentsClient` abstraction instead of direct imports, with the engineer reviewing and accepting diffs 4-6 files at a time. Agent mode handles scaffolding: given a prompt describing the FastAPI service's required endpoints, it generates the router layer, SQLAlchemy models, Alembic migration, Pydantic schemas, and pytest fixtures in a single session — 22 files that pass `mypy --strict` without manual intervention.

The extraction completes in 11 working days — under half the original estimate. The speed gain traces to two factors: eliminating manual search-and-replace across 52 call sites (handled by audited multi-file diffs), and using Agent mode for FastAPI scaffolding that previously occupied the first two days of any new service. Cursor Tab's predictive completions further accelerate the custom business logic that can't be auto-generated — particularly the webhook retry logic and idempotency key handling. Total cost: two Cursor Pro subscriptions at $40/month — a small fraction of the 3-4 weeks of senior engineering time saved.

## When to Use Cursor

**Use Cursor when:**
- You are tackling multi-file refactors where cross-file context matters — Cursor's whole-repo indexing produces far more accurate edits than single-file AI tools
- You want Agent mode for autonomous scaffolding of new services, features, or test suites with minimal hand-holding
- Onboarding new team members who need to explore an unfamiliar codebase through conversational Q&A rather than reading documentation
- You need inline code generation (Cmd+K) that understands your project's conventions, not just generic patterns

**When NOT to use Cursor:**
- Your team is entrenched in JetBrains IDEs and IT policy prevents adopting new editor binaries — GitHub Copilot's plugin model fits better
- You work primarily on single-file edits where whole-codebase indexing adds no value over standard Copilot
- Privacy constraints prohibit sending code to cloud inference endpoints and you need a fully local AI coding solution
