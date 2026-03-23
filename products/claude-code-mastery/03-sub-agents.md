# Chapter 03: Sub-Agents

> Sub-agents let you delegate tasks without polluting your main conversation context. They're the difference between a junior developer who does everything sequentially and a senior who delegates effectively.

---

## What Are Sub-Agents?

When Claude Code works on your request, it can spawn sub-agents — focused, isolated instances of Claude that handle a specific task and report back. The main conversation stays clean while sub-agents do the heavy lifting.

Think of it like this:
- **Main session** = You talking to a lead developer
- **Sub-agents** = That lead delegating research tasks to junior devs, then synthesizing the results

### Why Sub-Agents Matter

1. **Context preservation** — Your main conversation doesn't get bloated with exploration details
2. **Parallel processing** — Multiple sub-agents can research different things simultaneously
3. **Focused results** — Each sub-agent has a single clear objective
4. **Cost efficiency** — Sub-agents use smaller context windows, reducing token usage

---

## How Sub-Agents Work

Claude Code automatically spawns sub-agents when it determines a task benefits from delegation. You can also explicitly request delegation.

### Automatic Delegation

Claude Code recognizes patterns that benefit from sub-agents:

```
> Refactor the authentication system to use JWT tokens instead of session cookies.
```

Claude might internally:
1. Spawn a sub-agent to explore the current auth implementation
2. Spawn another to check all places sessions are used
3. Spawn another to review the test suite for auth-related tests
4. Synthesize all findings before making changes

### Explicit Delegation

You can tell Claude to use sub-agents:

```
> Use a sub-agent to research how error handling works across this codebase,
> then come back and propose a unified error handling strategy.
```

```
> Have a sub-agent analyze the database schema and identify any normalization issues.
> I want a report, not changes.
```

---

## Sub-Agent Types

### 1. Exploration Agents

**Purpose:** Map unknown territory in a codebase.

**When to use:**
- Joining a new project
- Understanding a module you didn't write
- Finding all usage patterns of a function or pattern

**Example prompts:**

```
> Use a sub-agent to explore how logging works in this project.
> I want to know: what library, what format, where logs go,
> and whether there's a consistent pattern.
```

```
> Have a sub-agent trace the complete request lifecycle for POST /api/orders.
> From the route handler through every service, repository, and side effect.
```

**What you get back:** A summary of findings without the raw search noise.

### 2. Planning Agents

**Purpose:** Create implementation plans before writing code.

**When to use:**
- Before large refactors
- When evaluating multiple approaches
- When you need a step-by-step migration plan

**Example prompts:**

```
> Use a sub-agent to plan the migration from Express to Fastify.
> Consider: route compatibility, middleware equivalents, plugin ecosystem,
> and a phased migration approach that doesn't break production.
```

```
> Have a sub-agent create a plan for adding multi-tenancy to this app.
> Current state: single-tenant. Target: row-level isolation with PostgreSQL RLS.
```

**What you get back:** A structured plan with steps, risks, and dependencies.

### 3. Research Agents

**Purpose:** Investigate specific technical questions.

**When to use:**
- Comparing approaches or libraries
- Understanding performance implications
- Auditing for security issues or code quality

**Example prompts:**

```
> Use a sub-agent to audit all database queries for potential N+1 problems.
> List each occurrence with file, line, and suggested fix.
```

```
> Have a sub-agent check every API endpoint for proper input validation.
> Flag any that accept user input without Zod/Joi/Yup validation.
```

### 4. Implementation Agents

**Purpose:** Execute a well-defined, bounded task.

**When to use:**
- Writing tests for an existing module
- Generating boilerplate that follows established patterns
- Making a specific, well-scoped change across multiple files

**Example prompts:**

```
> Use a sub-agent to write unit tests for every function in src/lib/billing/.
> Follow the testing patterns in src/lib/auth/__tests__/ as a reference.
```

```
> Have a sub-agent add TypeScript types to all the untyped JavaScript files
> in src/legacy/utils/. Don't change any logic — types only.
```

---

## Effective Delegation Patterns

### Pattern 1: Research Then Act

The most common and powerful pattern. Don't jump into changes — research first.

```
> Before we refactor anything:
> 1. Use a sub-agent to find all files that import from src/lib/database.ts
> 2. Use another sub-agent to check what methods from that module are actually used
> 3. Based on those findings, propose the minimal refactoring plan
```

### Pattern 2: Parallel Investigation

When you need multiple pieces of information to make a decision:

```
> I need to decide between Prisma and Drizzle for our ORM. Use sub-agents to:
> 1. Check our current raw SQL patterns and complexity
> 2. Inventory our migration files and schema complexity
> 3. Find all database access patterns in the codebase
> Then give me a recommendation based on our actual usage.
```

### Pattern 3: Divide and Conquer

For large changes, break them into independent pieces:

```
> We're adding internationalization (i18n) to the app. Use sub-agents to handle
> each section independently:
> 1. Extract all hardcoded strings from src/components/
> 2. Extract all hardcoded strings from src/app/ pages
> 3. Create the translation key structure
> Then I'll review before we wire everything together.
```

### Pattern 4: Scout Then Execute

Send a sub-agent ahead to identify risks before committing to a change:

```
> Before we upgrade React from 17 to 18:
> Use a sub-agent to scan for:
> - Class components that need migration
> - Uses of ReactDOM.render (needs createRoot)
> - Uses of legacy lifecycle methods
> - Third-party libraries that might not support React 18
>
> Give me a risk assessment before we start.
```

---

## Managing Sub-Agent Context

### What Sub-Agents Can Access

Sub-agents have access to:
- All files in the project (respecting .claudeignore)
- The ability to run read-only tools (file search, grep, read)
- CLAUDE.md instructions

Sub-agents do NOT carry:
- Your conversation history
- Previous sub-agent results (unless passed explicitly)
- Permission to write files or run commands (they report back; the main agent acts)

### Keeping Context Clean

The main benefit of sub-agents is keeping your conversation focused. Here's how to maximize this:

**Do:**
```
> Have a sub-agent figure out how the payment processing works.
> I just need a summary — the flow, key files, and any concerns.
```

**Don't:**
```
> Read every file in src/payments/ and tell me what each one does,
> then read every file in src/billing/ and tell me what each one does,
> then read every test file...
```

The second approach dumps everything into your main context. The first keeps it clean.

### When NOT to Use Sub-Agents

Sub-agents aren't always the right choice:

1. **Simple, direct questions** — "What does this function do?" doesn't need delegation
2. **Quick edits** — "Add a console.log on line 42" is faster without sub-agents
3. **When you need interactive back-and-forth** — Sub-agents complete their task and report back; they can't ask you clarifying questions mid-task
4. **When context from the current conversation is critical** — Sub-agents don't have your conversation history

---

## Sub-Agent Communication Best Practices

### Be Specific About Output Format

```
# Vague
> Have a sub-agent look at the API endpoints.

# Specific
> Have a sub-agent audit all API endpoints in src/routes/ and produce a table:
> | Endpoint | Method | Auth Required | Input Validation | Tests Exist |
> Include a summary of the biggest gaps.
```

### Set Clear Boundaries

```
# Too broad
> Have a sub-agent improve the codebase.

# Well-scoped
> Have a sub-agent identify dead code in src/lib/ — functions that are
> exported but never imported anywhere in the project. List them with
> file paths. Don't delete anything.
```

### Chain Sub-Agent Results

You can use results from one sub-agent to inform the next:

```
> Step 1: Use a sub-agent to find all components that make API calls directly
> instead of using our hook pattern.
>
> Step 2: Based on those results, use a sub-agent to write the missing hooks
> following the pattern in src/hooks/useUsers.ts as a template.
>
> Step 3: Show me the migration plan before we swap the components.
```

---

## Advanced: The Sub-Agent Mental Model

Understanding how sub-agents think helps you delegate more effectively.

### Each Sub-Agent Is a Fresh Start

A sub-agent doesn't know what you've been discussing. It only knows:
- The task you've given it
- The project files it can read
- The CLAUDE.md instructions

This means your task description needs to be self-contained:

```
# Bad — assumes context the sub-agent doesn't have
> Check if the approach we discussed would work.

# Good — self-contained
> Check if replacing the session-based auth in src/lib/auth.ts with JWT tokens
> would break any of the middleware in src/middleware/. Look for direct references
> to req.session and identify what would need to change.
```

### Sub-Agents Are Read-Heavy

Sub-agents spend most of their tokens reading files and searching code. They're optimized for information gathering, not for writing code. The main agent handles the actual code generation and file modifications.

### Think of Sub-Agents as Reports

The best mental model: a sub-agent produces a report. The main agent reads the report and acts on it. Structure your delegation accordingly:

```
> Have a sub-agent produce a report on our test coverage gaps.
> For each major module (auth, billing, users, notifications):
> - How many functions exist
> - How many have tests
> - What types of tests are missing (unit, integration, E2E)
> - Priority recommendation for what to test next
```

---

## Real-World Sub-Agent Workflows

### Workflow: Onboarding to a New Codebase

```
> I just cloned this repo. Use sub-agents to help me understand it:
>
> 1. Architecture overview — main components, how they connect, data flow
> 2. Development workflow — how to build, test, and run locally
> 3. Code quality assessment — patterns used, consistency, tech debt areas
> 4. Key abstractions — important base classes, interfaces, or patterns I need to know
>
> Compile everything into a briefing document.
```

### Workflow: Pre-Refactor Risk Assessment

```
> I want to extract the billing logic from the monolith into a separate service.
>
> Sub-agent 1: Map all billing-related code (files, functions, database tables)
> Sub-agent 2: Identify all cross-cutting concerns (logging, auth, error handling)
> Sub-agent 3: List every place non-billing code depends on billing code
>
> Then: Produce a migration plan ranked by risk, starting with the safest moves.
```

### Workflow: Security Audit

```
> Run a security audit using sub-agents:
>
> 1. Check all env var usage — are any hardcoded? Any missing from .env.example?
> 2. Audit SQL queries — any raw queries? Any string interpolation?
> 3. Check auth middleware — are all routes protected? Any bypasses?
> 4. Review dependencies — any known vulnerabilities in package.json?
> 5. Check file uploads — any unsanitized user uploads?
>
> Compile a prioritized vulnerability report with severity levels.
```

### Workflow: Performance Investigation

```
> The app is slow. Use sub-agents to investigate:
>
> 1. Find all database queries that don't use indexes (check schema vs queries)
> 2. Identify any N+1 query patterns
> 3. Find components with unnecessary re-renders (missing useMemo/useCallback)
> 4. Check for synchronous operations that should be async
> 5. Look for memory leaks (event listeners not cleaned up, intervals not cleared)
>
> Give me the top 5 performance wins, ordered by expected impact.
```

---

## Token Efficiency with Sub-Agents

Sub-agents use their own context windows. Here's how to keep costs down:

1. **Be specific about scope** — "Check src/lib/auth.ts" costs less than "check the whole codebase"
2. **Ask for summaries, not raw data** — "Summarize the findings" vs "show me every file"
3. **Use the right agent for the job** — Don't use a sub-agent for a quick file read
4. **Batch related research** — One sub-agent checking 5 things is cheaper than 5 sub-agents checking 1 thing each

### Cost Comparison

| Approach | Tokens Used | Time |
|----------|-------------|------|
| Manual exploration in main context | ~50K | 5 min |
| Sub-agent exploration | ~30K | 3 min |
| Targeted sub-agent with specific scope | ~15K | 1 min |

The savings compound over a full session.

---

**Next Chapter:** [04 - MCP Tools](04-mcp-tools.md) — Give Claude access to databases, APIs, and custom tools.
