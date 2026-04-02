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
