# Chapter 09: Tips & Tricks

> The difference between using Claude Code and *mastering* Claude Code comes down to dozens of small techniques that compound into massive productivity gains. These are the power-user secrets.

---

## Prompt Engineering for Code

### The Specificity Spectrum

The quality of Claude's output is directly proportional to the specificity of your input.

```
# Level 1: Vague (poor results)
> Make a login page

# Level 2: Functional (decent results)
> Create a login page with email and password fields, form validation, and error display

# Level 3: Precise (great results)
> Create a login page at src/app/(auth)/login/page.tsx:
> - Email input with format validation
> - Password input with show/hide toggle
> - "Remember me" checkbox
> - Submit button with loading state
> - Error message display (red text below form)
> - Link to /register and /forgot-password
> - Use our existing Input, Button, and Checkbox components from src/components/ui/
> - On success, redirect to /dashboard using next/navigation
> - Handle 401 (wrong credentials) and 429 (rate limit) errors specifically

# Level 4: Contextual (best results)
> [Level 3] + Follow the pattern in src/app/(auth)/register/page.tsx
> which already handles similar form logic
```

### The "As If" Pattern

Tell Claude to write code as if it were a specific type of developer:

```
> Write this error handling as if you're a developer who's been burned by
> silent failures in production. Every error path should log, alert, and
> gracefully degrade.
```

```
> Write this database query as if query performance is your number one concern.
> Include indexes, explain your choices, and flag any potential N+1 issues.
```

### The Negative Constraint Pattern

Sometimes telling Claude what NOT to do is more effective:

```
> Implement user search. Do NOT:
> - Use LIKE '%query%' (too slow on large tables)
> - Return more than 20 results
> - Include soft-deleted users
> - Expose email addresses in the response
> - Allow empty search queries
```

### The "Show Your Work" Pattern

When you need Claude to make architecture decisions:

```
> I need a caching strategy for the product catalog API.
> Show me 3 options with trade-offs for each.
> Then recommend one with your reasoning.
> Don't implement yet — I want to review the options first.
```

---

## Slash Commands Reference

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `/help` | Show all commands | When you forget a command |
| `/clear` | Clear conversation | When switching tasks |
| `/compact` | Compress context | Every 20-30 exchanges |
| `/cost` | Show token usage | Monitor spending |
| `/model` | Switch model | Different task complexity |
| `/bug` | Report a bug | When Claude Code misbehaves |
| `/quit` | Exit session | Done for now |
| `/init` | Create CLAUDE.md | Setting up a new project |

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+C` | Cancel current operation / Exit |
| `Ctrl+L` | Clear terminal screen |
| `Up Arrow` | Previous message (edit and resend) |
| `Tab` | Autocomplete file paths in prompts |
| `Shift+Enter` | Multi-line input |
| `Escape` | Cancel current input |

---

## Power User Techniques

### 1. The Context Seed

Start every session by "seeding" Claude with the right context:

```
> Before we start, read these files:
> - src/lib/database.ts (our DB abstraction)
> - src/types/index.ts (shared types)
> - src/middleware/auth.ts (how auth works)
>
> Now: add a "soft delete" feature to the users module.
```

This takes 10 seconds but saves minutes of Claude reading the wrong files.

### 2. The Checkpoint Pattern

For long sessions, create mental checkpoints:

```
> Before we continue, let's checkpoint:
> 1. We've completed the database migration
> 2. The API endpoints are done and tested
> 3. Next: build the React components
>
> Confirm this matches your understanding.
```

### 3. The "What Would Break" Pattern

Before making changes, ask:

```
> If I change the User interface to add a required "orgId" field,
> what would break? Don't fix anything — just tell me the blast radius.
```

### 4. Template Prompts

Create reusable prompt templates for common tasks:

**New API Endpoint Template:**
```
> Create [METHOD] /api/[path] endpoint:
> - Auth: [required/public/admin-only]
> - Input: [describe request body]
> - Output: [describe response]
> - Validation: [rules]
> - Side effects: [emails, notifications, etc.]
> - Follow patterns in: [reference file]
> - Include tests
```

**Bug Fix Template:**
```
> Bug: [what's wrong]
> Expected: [correct behavior]
> Actual: [current behavior]
> Reproduction: [steps]
> Logs/errors: [paste relevant logs]
> Started: [when it began / what changed]
```

**Code Review Template:**
```
> Review [file/PR] for:
> 1. Correctness (logic bugs, edge cases)
> 2. Security (injection, auth bypass, data exposure)
> 3. Performance (N+1, unnecessary computation, memory leaks)
> 4. Maintainability (readability, naming, complexity)
> Rate each: pass / warning / critical
```

### 5. The Diff Preview

Before Claude makes changes, ask for a preview:

```
> Show me what you'd change as a diff before actually modifying any files.
```

This is especially useful for unfamiliar codebases or critical files.

### 6. Progressive Disclosure

Don't dump everything at once. Build up context progressively:

```
# First prompt
> Overview of how auth works in this project.

# Second prompt (after reading the response)
> Now, specifically how do refresh tokens work? I see the rotation logic
> in auth.ts but I'm not sure about the edge case where a token is used twice.

# Third prompt
> OK, now I understand the flow. Add rate limiting to the token refresh endpoint.
> Maximum 10 refreshes per user per hour.
```

Each prompt builds on the previous context naturally.

### 7. The Rubber Duck Escalation

Start with Claude as a rubber duck, then escalate to implementation:

```
> I'm thinking about adding WebSocket support for real-time updates.
> Let me talk through my thinking:
> - We'd need a WS server alongside Express
> - Clients connect on page load
> - Server pushes events when data changes
> - Need to handle reconnection
>
> What am I missing? Poke holes in this plan.
```

After discussion:

```
> OK, your points about authentication on the WS connection and horizontal
> scaling with Redis pub/sub are good. Let's implement it with those
> additions. Start with the server-side WebSocket setup.
```

---

## File Management Tricks

### Quick File Overview

```
> List all TypeScript files in src/services/ with a one-line description of each.
```

### Find Dead Code

```
> Find all exported functions in src/lib/ that aren't imported anywhere
> else in the project. These might be dead code.
```

### Understand a File Fast

```
> Give me a map of src/lib/billing.ts:
> - All exports (functions, types, constants)
> - Dependencies (what it imports)
> - Dependents (what imports it)
> - Complexity hotspots (functions > 30 lines)
```

### Track Changes Across Sessions

```
> What files have I modified in this session? Show me a summary of
> all changes made.
```

---

## Git Workflow Tricks

### Smart Commit Messages

```
> Look at all staged changes and write a conventional commit message.
> Be specific about what changed and why.
```

### Pre-PR Checklist

```
> I'm about to create a PR. Check:
> 1. All tests pass
> 2. No TypeScript errors
> 3. No linting issues
> 4. No console.log statements in production code
> 5. No TODO comments without issue links
> 6. No hardcoded values that should be environment variables
> Give me a pass/fail report.
```

### Interactive Rebase Helper

```
> Show me the last 10 commits with their messages and file changes.
> Which ones could be squashed together for a cleaner history?
```

### Cherry-Pick Guidance

```
> I need to cherry-pick the fix for the login bug from the feature branch
> to main. Which commit(s) should I pick? Are there any dependencies
> I'd miss?
```

---

## Multi-Language Project Tips

### Context Switching Between Languages

```
> I'm switching from the Python backend to the TypeScript frontend.
> The API endpoint we just built returns this shape:
> { data: { users: [...], total: number, page: number } }
>
> Generate the TypeScript types and a React Query hook to fetch this data.
```

### Polyglot Refactoring

```
> The validation rules in the Python backend (src/validators/user.py)
> and the TypeScript frontend (src/schemas/user.ts) have drifted apart.
> Show me the differences and update the frontend to match the backend.
```

---

## Output Format Tricks

### Structured Output

```
> Analyze the error handling in this project.
> Output as a markdown table:
> | File | Function | Error Handling | Issue | Severity |
```

### Decision Matrix

```
> Compare Redis vs Memcached vs in-memory cache for our use case.
> Output as a decision matrix with weighted scores.
```

### Mermaid Diagrams

```
> Create a Mermaid sequence diagram showing the complete authentication flow
> from login form submission to session creation.
```

---

## Cost Optimization

### Token Usage Rules of Thumb

| Action | Approximate Tokens |
|--------|-------------------|
| Read a 100-line file | ~400 tokens |
| Read a 500-line file | ~2,000 tokens |
| Grep search results (10 matches) | ~200 tokens |
| Claude's response (medium) | ~500-1,000 tokens |
| Claude's response (large, with code) | ~2,000-5,000 tokens |
| Running /compact | Saves ~40-60% of context |

### Cost-Effective Habits

1. **Use Haiku for exploration** — Switch to Sonnet/Opus only for implementation
2. **Use grep before read** — Find the right file first, then read it
3. **Read partial files** — "Read lines 50-80 of config.ts" instead of the whole file
4. **Batch questions** — Ask 5 questions in one prompt instead of 5 separate prompts
5. **Use non-interactive mode** — `claude -p` for one-shot tasks avoids session overhead

### The $0 Trick

For pure planning (no code changes), use Claude Code's brain without its tools:

```
> Without reading any files, based on what we've discussed:
> what's the best approach for implementing feature flags?
> Consider our stack: Next.js, Express, PostgreSQL.
```

This uses minimal tokens because Claude isn't reading files or running commands.

---

## Session Management

### Naming Sessions

Give sessions meaningful context at the start:

```
> This session is for: Billing system refactoring, Phase 2 (webhook handlers)
```

### Handoff Between Sessions

At the end of a long session:

```
> Summarize this session for my future self:
> - What we accomplished
> - What's still pending
> - Key decisions made
> - Gotchas or issues encountered
> - Files that were modified
```

Save this summary and paste it at the start of your next session.

### Parallel Sessions

Run multiple Claude Code sessions for independent tasks:

```bash
# Terminal 1: Working on backend
cd ~/project && claude

# Terminal 2: Working on frontend
cd ~/project && claude

# Terminal 3: Writing tests
cd ~/project && claude
```

Each session has its own context. Just be careful about concurrent file edits.

---

## Integration Tips

### With VS Code

Open Claude Code in VS Code's integrated terminal for the best of both worlds:
- VS Code for browsing code and manual edits
- Claude Code for AI-assisted work
- Side-by-side view of changes

### With Git Worktrees

For parallel work on different branches:

```bash
git worktree add ../project-feature feature-branch
cd ../project-feature
claude
```

Each worktree gets its own Claude Code session with its own context.

### With tmux/Screen

```bash
# Split terminal: Claude Code on left, running app on right
tmux new-session -s dev
# Pane 1: claude
# Pane 2: npm run dev
# Pane 3: tail -f logs/app.log
```

---

## Hidden Features

### Piping and Chaining

```bash
# Generate a file from Claude and pipe it somewhere
claude -p "Generate a .env.example with all required vars for this project" > .env.example

# Chain Claude with other tools
claude -p "List all API endpoints as curl commands" | bash  # Actually run them

# Use Claude as a filter
git log --oneline -20 | claude -p "Which of these commits are bug fixes?"
```

### Image Input

Claude Code can read images (screenshots, diagrams):

```
> Look at this screenshot of the error: /tmp/error-screenshot.png
> What's happening and how do I fix it?
```

### Multi-Line Input

For complex prompts, use Shift+Enter:

```
> I need to refactor the auth system. Here's the plan:
>
> Phase 1: Add JWT support alongside sessions
> Phase 2: Migrate all endpoints to JWT
> Phase 3: Remove session code
>
> Let's start with Phase 1. The key files are:
> - src/middleware/auth.ts
> - src/lib/session.ts
> - src/routes/auth.ts
```

---

## Anti-Patterns to Avoid

### 1. The "Do Everything" Prompt

```
# Bad
> Rewrite the entire application to use TypeScript, add tests,
> fix all bugs, optimize performance, and update the documentation.

# Good
> Convert src/lib/utils.js to TypeScript. Don't change any logic.
```

### 2. The "Read the Whole Codebase" Trap

```
# Bad
> Read every file and tell me about the project.

# Good
> Read package.json and the main entry point. Give me a high-level overview.
```

### 3. The "Trust Everything" Anti-Pattern

Always review Claude's output, especially:
- Database migrations (data loss risk)
- Security-related code (auth, encryption)
- Financial calculations
- Infrastructure changes

### 4. The "Never Compact" Mistake

If your session is 30+ exchanges and you haven't used /compact, you're wasting tokens and risking context overflow.

### 5. Ignoring CLAUDE.md

Not having a CLAUDE.md is the single biggest productivity loss. Even a 20-line file makes a massive difference.

---

**Next Chapter:** [Cheatsheet](cheatsheet.md) — Everything on one page.
