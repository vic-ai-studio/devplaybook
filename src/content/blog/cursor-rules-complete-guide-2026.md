---
title: "The Complete Guide to .cursorrules in 2026: Write Better AI Coding Rules"
description: "Master .cursorrules in 2026. Learn the syntax, best practices for Next.js, Python, and Go projects, global vs project-level rules, auto-apply patterns, and real-world examples that make your AI coding assistant dramatically more effective."
date: "2026-04-01"
tags: [cursor, ai, developer-tools, cursorrules, coding-assistant]
readingTime: "14 min read"
---

# The Complete Guide to .cursorrules in 2026: Write Better AI Coding Rules

If you use Cursor as your primary editor, you've probably noticed that AI quality varies wildly between sessions. Sometimes the AI writes exactly what you'd write. Other times it ignores your conventions, adds unwanted abstractions, or produces code that doesn't fit your stack.

The difference is almost always `.cursorrules`.

This guide covers everything you need to know about writing effective cursor rules in 2026 — from basic syntax to framework-specific patterns that make your AI a genuine expert on your codebase.

## What Are .cursorrules?

`.cursorrules` is a configuration file that provides persistent instructions to every AI interaction in your Cursor project. Think of it as the system prompt for your codebase.

Without cursor rules: the AI treats every project the same and makes generic decisions.

With cursor rules: the AI knows your stack, your conventions, your constraints, and your preferences — producing code that fits your codebase as if written by a team member who's been on the project from day one.

### Where Rules Live

Cursor supports two rule scopes:

**Project-level** (`.cursorrules` in your project root): Rules specific to this codebase. Version controlled, shared with your team.

**Global rules** (Cursor Settings → General → Rules for AI): Rules applied to every project, regardless of directory.

Best practice: use global rules for your personal preferences and universal conventions, project rules for stack-specific and codebase-specific guidance.

---

## .cursorrules Syntax

The format is plain text — no special syntax, no YAML, no JSON. The AI reads it as natural language instructions.

Structure that works well:

```
## Role
[Who the AI should act as in this project]

## Tech Stack
[The technologies in use — be specific about versions]

## Code Style
[Formatting, naming conventions, patterns to follow]

## Architecture
[Project structure, where things live, how components are organized]

## Constraints
[What the AI should never do — often more important than what it should do]

## References
[Links or descriptions of patterns to emulate]
```

This structure isn't required, but it produces consistently better results than unstructured instructions.

---

## Rules by Project Type

### Next.js 14+ (App Router)

```
## Role
You are a senior Next.js developer. You build production-grade Next.js 14 applications with the App Router, TypeScript, and Tailwind CSS.

## Tech Stack
- Next.js 14+ (App Router, NOT Pages Router — never use pages/)
- TypeScript 5 (strict mode always enabled)
- Tailwind CSS v3 with shadcn/ui components
- Prisma ORM with PostgreSQL
- Clerk for authentication
- Vercel for deployment

## Code Style
- All components: TypeScript with explicit prop interfaces
- Use `const` for component definitions: `const Component = () => { ... }`
- Server Components by default; add 'use client' only when necessary (event handlers, hooks, browser APIs)
- Fetch data in Server Components using async/await, not useEffect
- Error boundaries: use error.tsx and not-found.tsx for route-level errors
- Loading states: use loading.tsx for route-level Suspense
- Import order: React → Next → external libs → internal (@/components) → relative

## Architecture
- Components in /components/{feature}/ (feature-based, not type-based)
- Server actions in /actions/{entity}.ts
- Database queries in /lib/db/{entity}.ts
- API routes only for webhooks and external integrations
- Shared types in /types/index.ts

## Constraints
- NEVER use useEffect to fetch data — use Server Components or React Query
- NEVER use the Pages Router (/pages directory)
- NEVER create client components when server components suffice
- NEVER use `any` type — fix the type properly
- NEVER leave console.log in production code
- Always handle loading and error states

## Component Pattern
All client components must follow this pattern:
interface Props {
  [explicit interface here]
}
export function ComponentName({ prop1, prop2 }: Props) { ... }
```

### Python / FastAPI

```
## Role
You are a senior Python backend engineer. You write modern Python 3.12+ with FastAPI, SQLAlchemy 2.0, and Pydantic v2.

## Tech Stack
- Python 3.12+
- FastAPI 0.110+ with async endpoints
- SQLAlchemy 2.0 (async sessions)
- Pydantic v2 for validation
- PostgreSQL via asyncpg
- Redis for caching
- Alembic for migrations

## Code Style
- All functions have type annotations — no exceptions
- Use async/await for all I/O operations
- Dependency injection via FastAPI's Depends()
- Pydantic models for all request/response schemas (never raw dicts)
- Use Python 3.10+ union syntax: `str | None` not `Optional[str]`
- f-strings for string formatting, never % formatting
- Docstrings for public functions using Google style

## Architecture
- Routers in /routers/{resource}.py
- Services (business logic) in /services/{resource}.py
- Database models in /models/{resource}.py
- Pydantic schemas in /schemas/{resource}.py
- No business logic in routers — routes only call services
- Database access only in services (or dedicated repositories)

## Constraints
- NEVER use synchronous database calls in async functions
- NEVER put business logic in route handlers
- NEVER return SQLAlchemy models directly — always serialize to Pydantic
- NEVER use mutable default arguments
- Always validate at the boundary with Pydantic
- Always handle database transactions explicitly
```

### Go (Standard Library or Gin)

```
## Role
You are a senior Go engineer. You write idiomatic Go following the patterns in the Go standard library and official Go blog.

## Tech Stack
- Go 1.22+
- Gin for HTTP (or stdlib net/http if specified)
- sqlx for database queries
- pgx/v5 for PostgreSQL
- zap for structured logging

## Code Style
- Errors returned, not panicked — return (T, error) pattern
- Handle every error explicitly — no _ for error returns
- Interfaces in the package that uses them, not where implemented
- Short variable names for short scopes (i, err, v), descriptive for longer scopes
- Struct embedding only when the is-a relationship is true
- Table-driven tests for all pure functions
- Contexts passed as first argument to all I/O functions

## Architecture
- cmd/{binary-name}/main.go as entrypoints
- internal/ for private packages
- pkg/ for packages intended for external use
- Handler methods on structs with dependencies injected via constructor
- No global state — pass dependencies explicitly

## Error Handling Pattern
errors.New("package: specific error description")
fmt.Errorf("operation: %w", err)  // wrap with context
Always add context when wrapping errors

## Constraints
- NEVER use global variables for dependencies
- NEVER ignore errors (no _ = err)
- NEVER use panic() except for truly unrecoverable states (bad config at startup)
- NEVER use goroutines without thinking about their lifecycle
- Always use context.Context for cancellation
```

---

## Auto-Apply Rules: The Rule Sets Feature

Cursor 2026 supports multiple rule files and conditional rule application. Instead of one monolithic `.cursorrules`, you can create a `rules/` directory:

```
.cursor/
  rules/
    base.mdc       — Always applied
    frontend.mdc   — Applied to *.tsx, *.css files
    backend.mdc    — Applied to *.py, *.go files
    tests.mdc      — Applied to *.test.*, *.spec.* files
    migrations.mdc — Applied to migrations/ directory
```

Each `.mdc` file can specify a glob pattern in its frontmatter:

```md
---
globs: ["src/**/*.tsx", "src/**/*.ts", "!src/**/*.test.ts"]
---

## Frontend TypeScript Rules
All components must be functional, never class-based.
...
```

This is significantly more powerful than a single `.cursorrules` file — the AI receives only relevant rules for the file it's working on, reducing noise and improving specificity.

---

## Advanced Rule Patterns

### The Constraint List Pattern

Always include a dedicated "NEVER" section. Constraints prevent the AI from reverting to generic patterns it learned from training data.

```
## Constraints (NEVER do these)
- NEVER use useEffect for data fetching
- NEVER use `any` type in TypeScript
- NEVER add comments that just repeat what the code does
- NEVER create new abstractions for single-use cases
- NEVER add error handling for impossible scenarios
- NEVER modify files outside the task's scope
```

The constraint section often has more impact than the positive instructions because it specifically overrides the AI's default behavior.

### The Example Pattern

Providing a code example in the rules is extremely effective:

```
## Preferred Component Pattern
Always follow this exact pattern for new components:

// components/feature/FeatureName.tsx
import type { FC } from 'react'
import { cn } from '@/lib/utils'

interface FeatureNameProps {
  className?: string
  // other props
}

export const FeatureName: FC<FeatureNameProps> = ({ className, ...props }) => {
  return (
    <div className={cn('...', className)}>
      {/* content */}
    </div>
  )
}
```

The AI will pattern-match against this example, producing code with the same structure, import style, and conventions.

### The Context Injection Pattern

For large codebases, tell the AI where key patterns live:

```
## Architecture Reference
Before implementing any new feature, check these files for patterns:
- /lib/db/user.ts — database query patterns
- /components/ui/Button.tsx — UI component structure
- /actions/user.ts — server action patterns
- /hooks/useUser.ts — custom hook patterns
```

This directs the AI to read existing code before writing new code, improving consistency dramatically.

---

## Testing Your Rules

Rules that look good on paper often fail in practice. Testing strategy:

1. **Clear chat context** before each test (Cmd+Shift+P → "Clear Chat")
2. Ask the AI to implement a representative task (add a new route, create a component, write a test)
3. Review the output against your rules
4. Identify gaps and add specific constraints

The most common failure modes:
- Rule is too vague: "write clean code" vs. "use const for component definitions, not function declarations"
- Missing constraint: the AI reverts to its default pattern because you didn't explicitly forbid it
- Rule conflicts: two rules that push in opposite directions
- Stack version ambiguity: "use React hooks" vs. "use React 19 Actions and use-server directive"

---

## Sharing Rules Across Projects

For teams, commit `.cursorrules` to version control and treat it as production code:

```bash
# .gitignore — explicitly DO NOT ignore cursorrules
# .cursorrules is intentionally tracked

# Enforce it in CI:
# scripts/check-cursorrules.sh
if [ ! -f ".cursorrules" ]; then
  echo "Error: .cursorrules file missing. New contributors may not have correct AI setup."
  exit 1
fi
```

For multi-project consistency, maintain a shared rules template in a central repository and copy/adapt for each project. A team wiki with the rationale behind each rule significantly improves buy-in and maintenance.

---

## The Rules Review Checklist

Before committing your `.cursorrules`:

- [ ] Does it specify the exact framework versions in use?
- [ ] Does it describe where code should live (not just how to write it)?
- [ ] Does it include a NEVER/constraints section?
- [ ] Does it include at least one code example?
- [ ] Is it specific enough to distinguish your stack from generic React/Python/Go?
- [ ] Did you test it against a representative task?

The ROI on a well-crafted `.cursorrules` is enormous. A good rules file can reduce the "fix this, that's not how we do it" back-and-forth by 80%, and makes onboarding new AI sessions to your codebase nearly instant.

Build yours with [DevPlaybook's Cursor Rules Generator](/tools/cursor-rules-generator) to get a solid starting point, then customize from there.
