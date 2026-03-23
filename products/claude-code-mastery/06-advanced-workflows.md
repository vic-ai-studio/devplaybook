# Chapter 06: Advanced Workflows

> This chapter covers the workflows that separate casual users from power users. Multi-file refactoring, test-driven development, debugging strategies, and code review — all supercharged with Claude Code.

---

## Multi-File Refactoring

Refactoring across multiple files is where Claude Code truly shines. A human developer might spend hours tracing dependencies and making coordinated changes. Claude does it in minutes.

### The Refactoring Process

1. **Scope** — Define exactly what you're changing and why
2. **Impact analysis** — Find all affected files before touching anything
3. **Plan** — Agree on the approach before writing code
4. **Execute** — Make changes file by file
5. **Verify** — Run tests, type checks, and linters

### Example: Rename a Core Concept

Renaming a domain concept that appears everywhere — database columns, API responses, UI labels, types, and tests.

```
> I need to rename "subscription" to "membership" throughout the codebase.
> This is a domain terminology change, not just a find-and-replace.
>
> Requirements:
> - Database migration to rename the column (don't lose data)
> - Update all TypeScript types and interfaces
> - Update all API endpoints and response shapes
> - Update all React components and hooks
> - Update all test files
> - Keep backward compatibility in the API for 30 days (accept both names)
>
> Start by showing me the impact analysis before making any changes.
```

Claude will:
1. Search for all occurrences of "subscription" across the codebase
2. Categorize them (database, types, API, UI, tests)
3. Present an impact report
4. Ask for confirmation before proceeding
5. Make changes in the correct order (schema first, then types, then implementation)

### Example: Extract a Module

```
> The file src/lib/utils.ts has grown to 800 lines. Extract it into focused modules:
> - src/lib/string-utils.ts — string manipulation functions
> - src/lib/date-utils.ts — date formatting and parsing
> - src/lib/validation-utils.ts — input validation helpers
> - src/lib/format-utils.ts — number and currency formatting
>
> Requirements:
> - Update all imports across the codebase
> - Keep a barrel export at src/lib/utils.ts for backward compatibility
> - Add JSDoc comments to each extracted function
> - Don't change any function signatures
```

### Example: Change State Management

```
> Migrate the shopping cart from React Context to Zustand.
>
> Current implementation:
> - src/contexts/CartContext.tsx (provider + hook)
> - Used in 12 components
>
> Target:
> - src/stores/cart-store.ts (Zustand store)
> - All consuming components updated to use the store
>
> Keep the same public API — components shouldn't need logic changes,
> just import changes.
```

### Refactoring Best Practices with Claude

1. **Always ask for impact analysis first** — Don't let Claude start changing files until you've seen the blast radius
2. **Refactor in phases** — For large changes, break into PRs: "Phase 1: add new module. Phase 2: migrate consumers. Phase 3: remove old module."
3. **Run tests between phases** — After each batch of changes, verify nothing broke
4. **Keep backward compatibility** — Don't break existing consumers; deprecate first, then remove

---

## Test-Driven Development (TDD) with Claude

Claude Code is an exceptional TDD partner. It can write tests first, then implement the code to make them pass.

### The TDD Workflow

```
> Let's do TDD for a new password strength validator.
>
> Requirements:
> - Minimum 8 characters
> - At least one uppercase letter
> - At least one lowercase letter
> - At least one number
> - At least one special character (!@#$%^&*)
> - Returns a strength score: weak (1-2 rules), medium (3-4), strong (all 5)
> - Returns an array of which rules failed
>
> Step 1: Write the tests first. Don't write the implementation yet.
```

Claude writes comprehensive tests:

```typescript
// src/lib/__tests__/password-validator.test.ts
import { describe, it, expect } from 'vitest';
import { validatePassword } from '../password-validator';

describe('validatePassword', () => {
  describe('length requirement', () => {
    it('fails when password is shorter than 8 characters', () => {
      const result = validatePassword('Abc1!');
      expect(result.rules.minLength).toBe(false);
    });

    it('passes when password is exactly 8 characters', () => {
      const result = validatePassword('Abcdef1!');
      expect(result.rules.minLength).toBe(true);
    });
  });

  describe('character requirements', () => {
    it('requires at least one uppercase letter', () => {
      const result = validatePassword('abcdefg1!');
      expect(result.rules.uppercase).toBe(false);
    });

    it('requires at least one lowercase letter', () => {
      const result = validatePassword('ABCDEFG1!');
      expect(result.rules.lowercase).toBe(false);
    });

    // ... more tests
  });

  describe('strength scoring', () => {
    it('returns "weak" when 1-2 rules pass', () => {
      const result = validatePassword('abc');
      expect(result.strength).toBe('weak');
    });

    it('returns "strong" when all rules pass', () => {
      const result = validatePassword('MyP@ssw0rd!');
      expect(result.strength).toBe('strong');
    });
  });
});
```

Then you say:

```
> Now write the implementation to make all tests pass.
```

Claude implements the function, runs the tests, and iterates until they all pass.

### TDD for Bug Fixes

TDD is especially powerful for bug fixes — write a test that reproduces the bug, then fix it:

```
> There's a bug: when a user's email has a plus sign (user+tag@example.com),
> the login fails.
>
> Step 1: Write a failing test that reproduces this bug
> Step 2: Fix the code to make the test pass
> Step 3: Run the full test suite to make sure nothing else broke
```

### TDD for API Endpoints

```
> Let's build a POST /api/invitations endpoint with TDD.
>
> Business rules:
> - Only admins can send invitations
> - Can't invite someone who's already a member
> - Can't invite more than 10 people per day
> - Invitation expires after 7 days
> - Sends an email (mock the email service)
>
> Write the integration tests first, then implement.
```

---

## Debugging Strategies

Claude Code transforms debugging from a solo detective mission into a collaborative investigation.

### Strategy 1: Log-Based Debugging

```
> Here's the error log:
> [paste error log]
>
> Find the root cause. Don't guess — trace the execution path
> from the entry point to where this error occurs.
```

Claude will:
1. Parse the error message and stack trace
2. Read the referenced files
3. Trace the execution path
4. Identify the root cause
5. Suggest a fix

### Strategy 2: Bisect-Style Debugging

When you know something worked before but broke recently:

```
> The user search feature stopped returning results sometime
> in the last week. Review the last 10 commits that touched
> src/services/user-search.ts or its dependencies.
> Identify which commit likely introduced the regression.
```

### Strategy 3: Hypothesize and Test

```
> The API returns 500 on large payloads (>1MB) but works fine for small ones.
>
> Give me 3 hypotheses for what could cause this, ordered by likelihood.
> For each hypothesis, tell me exactly what to check to confirm or rule it out.
```

Claude might respond with:
1. **Body parser size limit** — Check Express body-parser configuration
2. **Database column size constraint** — Check VARCHAR/TEXT limits in schema
3. **Reverse proxy timeout** — Check Nginx/CloudFlare timeout settings

### Strategy 4: Rubber Duck + Context

Sometimes you just need someone to think with you:

```
> I'm stuck on a race condition. Here's what I know:
> - Two concurrent requests can create duplicate records
> - We're using PostgreSQL
> - The unique constraint is on (user_id, plan_id)
> - But the constraint violation happens AFTER insertion, not preventing it
>
> Help me think through this. What am I missing?
```

### Strategy 5: Reproduce Then Fix

```
> Users report intermittent 401 errors on the dashboard.
> It happens randomly, maybe 1 in 20 requests.
>
> Step 1: Help me add logging to narrow down when this happens
> Step 2: Analyze the logs (I'll paste them)
> Step 3: Write a test that reproduces the issue
> Step 4: Fix it
```

### Debug Session Template

For complex bugs, give Claude a structured brief:

```
> ## Bug Report
>
> **What should happen:** Users can upload profile photos up to 5MB
> **What actually happens:** Upload fails silently for images > 2MB
> **When it started:** After the March 15 deployment
> **Environment:** Production only (works in staging)
> **Error logs:** [paste relevant logs]
> **Steps to reproduce:**
> 1. Go to /settings/profile
> 2. Click "Change Photo"
> 3. Select a 3MB JPEG
> 4. Click Upload
> 5. Nothing happens, no error shown
>
> Help me diagnose and fix this.
```

---

## Code Review with Claude

### Reviewing a PR

```bash
# Get the diff and pipe it to Claude
git diff main...feature-branch | claude -p "Review this diff as a senior engineer.
Focus on:
1. Logic errors and edge cases
2. Security vulnerabilities
3. Performance implications
4. API contract changes
5. Missing tests

For each issue, specify the file and line number.
Rate severity: critical / warning / suggestion"
```

### Reviewing Your Own Code Before Committing

```
> Review all staged changes. Be harsh — find any issues before
> my teammates see this PR.
```

### Architecture Review

```
> I'm about to add a caching layer. Here's my plan:
>
> - Redis for session cache
> - In-memory LRU for frequently accessed config
> - CDN cache for static assets
> - Browser cache with service worker for offline support
>
> Review this architecture. What am I missing?
> What could go wrong? What would you do differently?
```

### Review Checklist Approach

```
> Review the changes in src/services/payment.ts against this checklist:
>
> [ ] Error handling: all try-catch blocks have specific error types
> [ ] Logging: all critical operations have log statements
> [ ] Validation: all inputs are validated before use
> [ ] Idempotency: payment operations can be safely retried
> [ ] Rollback: failed operations clean up after themselves
> [ ] Tests: new code paths have corresponding tests
> [ ] Types: no 'any' types without justification
>
> For each item, tell me pass/fail and why.
```

---

## Database Operations

### Schema Design Review

```
> Review this Prisma schema for:
> 1. Missing indexes (any column used in WHERE or JOIN)
> 2. Normalization issues
> 3. Missing relations
> 4. Data types that could be more specific
> 5. Missing soft delete support
```

### Migration Generation

```
> Generate a Prisma migration that:
> 1. Adds a "preferences" JSONB column to Users with a default value
> 2. Adds a "last_active_at" timestamp column
> 3. Creates a new "audit_logs" table with: id, user_id, action, metadata, created_at
> 4. Adds an index on audit_logs(user_id, created_at)
>
> Make sure the migration is backward-compatible and won't lock the table.
```

### Query Optimization

```
> This query takes 3 seconds on our production database with 2M rows:
>
> [paste query]
>
> Here's the EXPLAIN ANALYZE output:
>
> [paste explain output]
>
> Optimize this query. Show me the improved version and explain why it's faster.
```

---

## Documentation Generation

### API Documentation

```
> Generate OpenAPI 3.0 documentation for all routes in src/routes/.
> For each endpoint, include:
> - Method and path
> - Request body schema (derived from Zod validators)
> - Response schema (derived from return types)
> - Authentication requirements
> - Example request and response
```

### Code Documentation

```
> Add JSDoc comments to all exported functions in src/lib/.
> Include:
> - Brief description
> - @param for each parameter with type and description
> - @returns with type and description
> - @throws for any thrown errors
> - @example with a realistic usage example
>
> Don't add comments to private/internal functions.
```

### Architecture Decision Records

```
> Create an ADR (Architecture Decision Record) for our decision to use
> event sourcing for the billing module.
>
> Context: We needed audit trail and point-in-time state reconstruction
> Decision: Event sourcing with PostgreSQL as event store
> Alternatives considered: Audit table, temporal tables, external audit service
> Consequences: Higher complexity, but complete audit trail and replay capability
```

---

## Workflow: Full Feature Development

Here's a complete workflow for building a feature from scratch:

### Step 1: Requirements Analysis

```
> I need to add a team invitation system. Here's the PRD:
> [paste requirements]
>
> Before we write any code, identify:
> 1. What database changes are needed
> 2. What API endpoints are needed
> 3. What UI components are needed
> 4. What edge cases should we handle
> 5. What tests should we write
```

### Step 2: Database Schema

```
> Based on the analysis, create the Prisma schema changes
> and generate the migration. Include seed data for development.
```

### Step 3: Backend Implementation

```
> Implement the API endpoints for team invitations:
> - POST /api/teams/:id/invitations (send invite)
> - GET /api/teams/:id/invitations (list pending)
> - POST /api/invitations/:token/accept (accept invite)
> - DELETE /api/invitations/:id (cancel invite)
>
> Include Zod validation, proper error handling, and rate limiting.
```

### Step 4: Tests

```
> Write integration tests for all invitation endpoints.
> Test: happy path, auth failures, validation errors, rate limits,
> expired invitations, duplicate invitations.
```

### Step 5: Frontend

```
> Build the invitation UI:
> - InvitationForm component (email input + role select + send button)
> - PendingInvitations list with cancel buttons
> - AcceptInvitation page for the invite link
>
> Use our existing component library and follow the patterns
> in src/components/features/team-members/.
```

### Step 6: Final Review

```
> Review everything we just built:
> - Run all tests
> - Check TypeScript types
> - Run the linter
> - Verify the migration is safe
> - Check for any security issues
>
> Give me a final report and a PR description.
```

---

## Performance Optimization Workflow

```
> Let's optimize the dashboard page load time. Current: 4.2 seconds.
>
> Phase 1: Analyze
> - Profile the page load (network requests, component render times)
> - Identify the top 5 bottlenecks
>
> Phase 2: Quick Wins
> - Add React.memo to pure components
> - Add useMemo/useCallback where beneficial
> - Lazy-load below-the-fold components
>
> Phase 3: Architectural
> - Implement data prefetching
> - Add response caching
> - Optimize database queries
>
> Start with the analysis. Show me data before we make changes.
```

---

## Working with Legacy Code

```
> This file (src/legacy/payment-processor.js) is 1200 lines of
> undocumented JavaScript with no tests. I need to:
>
> 1. Understand what it does (create a summary)
> 2. Add TypeScript types (without changing logic)
> 3. Write tests for existing behavior (characterization tests)
> 4. Refactor into smaller, testable modules
>
> Do this in phases. Don't change behavior until we have test coverage.
```

Claude will:
1. Read and analyze the entire file
2. Create a behavior map
3. Write characterization tests that document current behavior
4. Only then suggest safe refactoring moves

---

**Next Chapter:** [07 - Troubleshooting](07-troubleshooting.md) — Solve common problems and optimize performance.
