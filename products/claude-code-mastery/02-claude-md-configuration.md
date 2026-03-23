# Chapter 02: CLAUDE.md Configuration

> CLAUDE.md is the single most powerful lever you have. It transforms Claude from a generic AI into a teammate who understands your project, follows your conventions, and respects your rules.

---

## What Is CLAUDE.md?

CLAUDE.md is a special markdown file that Claude Code reads automatically at the start of every session. Think of it as a project briefing — the same document you'd give to a new senior developer joining your team.

When Claude Code starts, it looks for CLAUDE.md files in multiple locations and merges them together. This gives you layered control: global preferences, project-specific rules, and directory-specific instructions.

---

## Where CLAUDE.md Files Live

Claude Code reads CLAUDE.md files from these locations, in order:

| Location | Scope | Use Case |
|----------|-------|----------|
| `~/.claude/CLAUDE.md` | Global (all projects) | Personal coding style, preferred languages, common patterns |
| `./CLAUDE.md` (project root) | Project-wide | Architecture, conventions, build commands, team rules |
| `./src/CLAUDE.md` | Directory-specific | Subsystem-specific rules, module conventions |
| `./src/api/CLAUDE.md` | Nested directory | Even more granular — API-specific guidelines |

All found files are merged into a single context. More specific files take precedence.

---

## Anatomy of an Effective CLAUDE.md

Here's the structure that consistently produces the best results:

```markdown
# CLAUDE.md

## Project Overview
[What this project does, who it's for, why it exists]

## Tech Stack
[Languages, frameworks, key libraries, versions that matter]

## Key Commands
[Build, test, lint, deploy — the commands Claude should know]

## Architecture
[Directory structure, key modules, data flow]

## Coding Conventions
[Style rules, naming conventions, patterns to follow]

## Rules
[Hard constraints — things Claude must always or never do]
```

Let's break each section down with real examples.

---

## Section 1: Project Overview

Keep it concise. Two to four sentences that give Claude the mental model it needs.

### Good Example

```markdown
## Project Overview
SaaS billing platform that processes $2M/month in transactions.
Built as a monorepo with a Next.js frontend, Express API, and PostgreSQL database.
We're a team of 4 developers. Code review quality matters more than speed.
```

### Why This Works

Claude now knows:
- This handles real money (be extra careful with financial logic)
- It's a monorepo (check for cross-package impacts)
- Small team (conventions matter for consistency)
- Quality over speed (don't suggest quick hacks)

### Bad Example

```markdown
## Project Overview
This is a web app.
```

This tells Claude almost nothing. It'll waste time figuring out what you already know.

---

## Section 2: Tech Stack

List the technologies that affect how Claude should write code.

```markdown
## Tech Stack
- **Frontend:** Next.js 14 (App Router, NOT Pages Router), React 18, TypeScript 5.3
- **Styling:** Tailwind CSS 3.4 — no CSS modules, no styled-components
- **Backend:** Express 4 with TypeScript, Zod for validation
- **Database:** PostgreSQL 16 with Prisma ORM (not raw SQL unless performance-critical)
- **Auth:** NextAuth.js v5 with Google and GitHub providers
- **Testing:** Vitest for unit tests, Playwright for E2E
- **Deployment:** Vercel (frontend), Railway (API), Neon (database)
```

### Why Specify Versions?

Claude knows all versions of all frameworks. Without version hints, it might suggest React Server Components syntax that doesn't work in your version, or use a Prisma API that was deprecated in v5.

---

## Section 3: Key Commands

These are the commands Claude should use when building, testing, and validating code.

```markdown
## Key Commands

### Development
- `npm run dev` — Start frontend on port 3000
- `npm run api:dev` — Start API on port 4000
- `npm run dev:all` — Start everything with concurrently

### Testing
- `npm test` — Run all Vitest tests
- `npm test -- --run src/lib/billing` — Test specific module
- `npm run test:e2e` — Run Playwright E2E tests (needs dev server running)
- `npm run test:e2e -- --headed` — E2E with browser visible

### Quality
- `npm run lint` — ESLint check
- `npm run lint:fix` — Auto-fix lint issues
- `npm run typecheck` — TypeScript compiler check (no emit)
- `npm run format` — Prettier format all files

### Database
- `npx prisma migrate dev` — Run pending migrations
- `npx prisma generate` — Regenerate Prisma client
- `npx prisma studio` — Open database GUI
- `npx prisma db seed` — Seed development data
```

### Pro Tip: Include Failing Commands

If there's a known issue, tell Claude:

```markdown
### Known Issues
- `npm run test:e2e` currently fails on Windows due to a Playwright bug. Skip E2E on Windows.
- `npm run lint` shows 3 warnings in legacy code — these are expected, don't fix them.
```

This prevents Claude from trying to "fix" things that aren't broken.

---

## Section 4: Architecture

Help Claude understand how your code is organized and how data flows.

```markdown
## Architecture

### Directory Structure
```
src/
  app/              # Next.js App Router pages
    (auth)/          # Auth-related routes (grouped)
    (dashboard)/     # Dashboard routes (grouped)
    api/             # API routes (Next.js)
  components/
    ui/              # Reusable UI primitives (Button, Input, Modal)
    features/        # Feature-specific components (BillingTable, UserCard)
    layouts/         # Page layout components
  lib/
    api-client.ts    # Typed API client (auto-generated from OpenAPI)
    auth.ts          # NextAuth configuration
    billing.ts       # Stripe integration
    db.ts            # Prisma client singleton
  hooks/             # Custom React hooks
  types/             # Shared TypeScript types
packages/
  api/               # Express backend
  shared/            # Shared types and utilities
prisma/
  schema.prisma      # Database schema
  migrations/        # Migration files
```

### Data Flow
1. User action in React component
2. Component calls hook (e.g., `useBilling()`)
3. Hook calls API client function
4. API client makes HTTP request to Express backend
5. Express route handler validates with Zod
6. Handler calls service layer
7. Service layer uses Prisma to query PostgreSQL
8. Response flows back up the chain

### Key Patterns
- All API responses follow `{ data, error, meta }` shape
- Errors are never thrown in service layer — always return `Result<T, E>` type
- Components never call API directly — always through hooks
```

---

## Section 5: Coding Conventions

This is where you teach Claude your team's style.

```markdown
## Coding Conventions

### TypeScript
- Strict mode enabled — no `any` types unless explicitly justified with a comment
- Use `interface` for object shapes, `type` for unions and intersections
- Prefer `const` assertions over enums: `const Status = { ACTIVE: 'active', ... } as const`
- Use barrel exports (`index.ts`) for public module APIs only

### React
- Functional components only, no class components
- Props interface named `{ComponentName}Props`
- Use `forwardRef` for any component that renders a native HTML element
- Colocate styles: component, styles, tests, and types in same directory
- Server Components by default. Add 'use client' only when hooks or interactivity needed

### Naming
- Files: `kebab-case.ts` for utilities, `PascalCase.tsx` for components
- Variables/functions: `camelCase`
- Types/interfaces: `PascalCase`
- Constants: `SCREAMING_SNAKE_CASE`
- Database columns: `snake_case`
- API endpoints: `kebab-case` (`/api/billing-plans`)

### Git
- Commit messages: conventional commits (`feat:`, `fix:`, `chore:`, `docs:`)
- Branch names: `type/description` (e.g., `feat/add-billing`, `fix/login-redirect`)
- Always rebase, never merge commits from main
```

---

## Section 6: Rules (Hard Constraints)

Rules are non-negotiable. Claude will follow these strictly.

```markdown
## Rules

### ALWAYS
- Always run `npm run typecheck` before considering a task complete
- Always add Zod validation for any new API endpoint
- Always write at least one test for any new function
- Always use parameterized queries — never string interpolation for SQL
- Always handle loading, error, and empty states in UI components

### NEVER
- Never use `any` type without a `// eslint-disable-next-line` comment explaining why
- Never commit console.log statements — use the logger utility
- Never modify migration files that have already been applied
- Never store secrets in code — use environment variables
- Never use `innerHTML` or `dangerouslySetInnerHTML` without sanitization
- Never import from a parent directory's internal modules (respect module boundaries)
```

---

## The Memory System

Beyond CLAUDE.md, Claude Code has a memory system that persists across conversations.

### How Memory Works

Claude Code stores memories in:
```
~/.claude/projects/<project-path>/memory/
```

Each memory is a markdown file that Claude reads at the start of every session.

### Creating Memories Manually

You can create memory files directly:

```bash
mkdir -p ~/.claude/projects/my-project/memory
```

```markdown
# ~/.claude/projects/my-project/memory/architecture-decision.md

## Decision: Use Event Sourcing for Billing

### Context
We switched from CRUD to event sourcing for the billing module in Jan 2026.

### Why
- Audit trail required by SOC2
- Need to reconstruct state at any point in time
- Billing disputes require full history

### Implications
- All billing mutations go through `BillingEventStore`
- Current state is a projection, not the source of truth
- Never delete events — only append compensating events
```

### Automatic Memory via CLAUDE.md Rules

You can instruct Claude to self-create memories:

```markdown
## Rules
- After any debugging session, save a memory file with:
  symptom, root cause, fix, and prevention rule
- After any architecture decision, save a memory file with:
  context, decision, rationale, and implications
```

Claude will create these files automatically during your sessions.

---

## Multi-Team Configuration

For monorepos or projects with multiple teams, use nested CLAUDE.md files:

```
project-root/
  CLAUDE.md              # Company-wide rules
  packages/
    frontend/
      CLAUDE.md           # Frontend team conventions
    api/
      CLAUDE.md           # Backend team conventions
    mobile/
      CLAUDE.md           # Mobile team conventions
```

### Root CLAUDE.md (Company-Wide)

```markdown
# CLAUDE.md (Root)

## Company Standards
- All code must pass CI before merge
- All PRs require one approval
- Use conventional commits
- English only in code comments and commit messages
```

### packages/frontend/CLAUDE.md

```markdown
# CLAUDE.md (Frontend)

## Frontend Conventions
- React 18 with TypeScript
- Tailwind CSS — no inline styles, no CSS-in-JS
- Component tests with React Testing Library
- Storybook for all UI primitives
- Use `@company/ui` package for shared components
```

### packages/api/CLAUDE.md

```markdown
# CLAUDE.md (API)

## Backend Conventions
- Express with TypeScript
- All routes go in `src/routes/` with corresponding test in `__tests__/`
- Use dependency injection via `tsyringe`
- Database queries only through repository pattern
- Rate limiting on all public endpoints
```

---

## Real-World CLAUDE.md Templates

### Template: Solo Developer

```markdown
# CLAUDE.md

## Project
Personal SaaS - [brief description]

## Stack
Next.js 14, Supabase, Tailwind, Stripe

## Commands
- `npm run dev` — Development server
- `npm test` — Tests
- `npx supabase db push` — Push schema changes

## My Preferences
- I prefer explicit over clever code
- Use early returns to reduce nesting
- Keep functions under 30 lines
- Comments explain "why", not "what"

## Rules
- Always run tests before saying a task is done
- Never modify Supabase migrations that are in production
```

### Template: Startup Team

```markdown
# CLAUDE.md

## Project
[Product name] — [one-line description]
Series A startup, moving fast but code quality matters.

## Stack
- Monorepo: Turborepo
- Frontend: Next.js 14, React Query, Zustand, Tailwind
- API: tRPC with Zod validation
- DB: PostgreSQL with Drizzle ORM
- Infra: Vercel + AWS (S3, SQS, Lambda)

## Commands
- `turbo dev` — Start all services
- `turbo test` — Run all tests
- `turbo lint` — Lint all packages
- `turbo build` — Production build

## Architecture
- Feature-based directory structure
- All business logic in `packages/core/`
- API is thin — delegates to core services
- Background jobs in `packages/workers/`

## Conventions
- No default exports (except Next.js pages)
- Colocate tests with source code
- Use `Result<T>` pattern for error handling (no thrown exceptions in business logic)
- All environment variables validated at startup with Zod

## Rules
- ALWAYS: Run `turbo test -- --filter=[changed-package]` after changes
- ALWAYS: Add JSDoc for exported functions
- NEVER: Import from another package's internal modules
- NEVER: Use `process.env` directly — use the typed env config
```

### Template: Enterprise / Large Codebase

```markdown
# CLAUDE.md

## Project
[Enterprise application] — [description]
~500K lines of code. 20+ developers across 4 teams.

## Critical Context
- This system processes financial transactions. Correctness is non-negotiable.
- All changes must be backward-compatible (we can't force-update mobile clients)
- Feature flags are required for all user-facing changes (LaunchDarkly)

## Testing Requirements
- Unit test coverage must not decrease (currently 78%)
- Integration tests required for any database changes
- E2E tests required for any user-facing workflow changes
- Run `npm run test:affected` to test only what changed

## Deployment
- Changes merge to `develop` first
- `develop` deploys to staging automatically
- Release branches cut weekly on Tuesday
- Hotfixes: branch from `main`, cherry-pick back to `develop`

## Security Rules
- NO secrets in code, config files, or comments — ever
- All user input must be sanitized (use `@company/sanitize` package)
- SQL injection prevention: parameterized queries only
- XSS prevention: React handles most cases, but never use dangerouslySetInnerHTML
- CSRF tokens required on all state-changing API endpoints
- PII logging is prohibited — use `logger.redact()` for any user data
```

---

## Common Mistakes

### Mistake 1: CLAUDE.md Too Long

If your CLAUDE.md is over 500 lines, Claude spends too many tokens reading it every session. Split it:
- Keep the root CLAUDE.md focused on essentials
- Move detailed docs to separate files and reference them
- Use directory-specific CLAUDE.md files for module details

### Mistake 2: Vague Instructions

```markdown
# Bad
- Write good code
- Follow best practices
- Keep it clean

# Good
- Functions must have explicit return types
- Use early returns instead of nested if/else
- Extract shared logic into src/lib/ utilities
```

### Mistake 3: Not Updating CLAUDE.md

Your CLAUDE.md should evolve with your project. Review it monthly. Remove outdated rules. Add new conventions as they emerge.

### Mistake 4: Contradictory Rules

If your root CLAUDE.md says "use CSS modules" but a subdirectory CLAUDE.md says "use Tailwind," Claude gets confused. Be consistent, or explicitly scope rules:

```markdown
## Styling
- New code: Tailwind CSS
- Legacy code in src/legacy/: CSS modules (don't migrate unless specifically asked)
```

---

## Validation Checklist

Before committing your CLAUDE.md, verify:

- [ ] Project overview is under 5 sentences
- [ ] All key commands are listed and correct
- [ ] Architecture section reflects current codebase structure
- [ ] Conventions are specific and testable (not vague)
- [ ] Rules use ALWAYS/NEVER for clarity
- [ ] No secrets, API keys, or passwords in the file
- [ ] File is under 300 lines (split if longer)
- [ ] Instructions don't contradict each other

---

**Next Chapter:** [03 - Sub-Agents](03-sub-agents.md) — Parallelize research and keep your main context clean.
