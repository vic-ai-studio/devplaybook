# Debugging Prompts

10 structured prompts for systematic bug investigation and resolution.

---

## DB-01 — General Bug Investigation

```
Help me debug this issue. I'll give you the error, the relevant code, and what I've already tried.

**Error / Symptom:**
{{ERROR_MESSAGE_OR_DESCRIPTION}}

**Code:**
```{{LANGUAGE}}
{{CODE}}
```

**What I've tried:**
{{TRIED_SO_FAR}}

**Environment:**
- {{LANGUAGE}} version: {{VERSION}}
- OS: {{OS}}
- Relevant dependencies: {{DEPS}}

Step through the most likely root causes from most to least probable. For the top cause, show me exactly how to fix it.
```

---

## DB-02 — Stack Trace Analysis

```
Analyze this stack trace and help me find the root cause.

**Stack trace:**
```
{{STACK_TRACE}}
```

**Code at the relevant line(s):**
```{{LANGUAGE}}
{{CODE}}
```

**What the code is supposed to do:**
{{INTENT}}

1. Identify the exact line and reason the error was thrown
2. Trace backwards — what call chain led to this?
3. Identify whether this is a programming error, bad input, or environmental issue
4. Show the fix
```

---

## DB-03 — Intermittent Bug

```
I have a bug that only happens sometimes. Help me figure out what's causing it.

**What happens:** {{SYMPTOMS}}
**How often:** {{FREQUENCY}} (e.g., "1 in 100 requests", "only under load", "only after running for 2+ hours")
**Environment:** {{ENV_DETAILS}}

**Code involved:**
```{{LANGUAGE}}
{{CODE}}
```

**Logs when it happens:**
```
{{LOGS}}
```

This kind of intermittent bug usually points to one of several patterns. Walk me through:
1. The most likely categories (race condition, state mutation, memory leak, external dependency flakiness, etc.)
2. How to add instrumentation to catch it reproducibly
3. What the fix likely looks like
```

---

## DB-04 — Performance Regression

```
Something made my code significantly slower. Help me find it.

**Before:** {{BEFORE_TIMING}}
**After:** {{AFTER_TIMING}}
**What changed:** {{RECENT_CHANGES}}

**Current code (slow version):**
```{{LANGUAGE}}
{{CODE}}
```

**Profiler output (if available):**
```
{{PROFILER_OUTPUT_OR_NONE}}
```

1. Identify likely performance regressions introduced by the change
2. Point to specific lines or patterns causing the slowdown
3. Show the optimized version
4. Suggest how to prevent this class of regression in future
```

---

## DB-05 — Memory Leak Investigation

```
I suspect a memory leak. Help me find and fix it.

**Symptoms:**
- Memory usage: {{MEMORY_GROWTH_PATTERN}}
- Occurs after: {{TRIGGER}}
- Runtime: {{LANGUAGE}} {{VERSION}}

**Code:**
```{{LANGUAGE}}
{{CODE}}
```

**Heap snapshot or memory profile (if available):**
```
{{MEMORY_PROFILE_OR_NONE}}
```

Walk me through:
1. Common memory leak patterns in {{LANGUAGE}} that apply here
2. Specific suspects in this code
3. How to confirm the leak with a minimal reproduction
4. The fix
```

---

## DB-06 — API / HTTP Debugging

```
I'm having trouble with an API call. Help me debug it.

**What I'm trying to do:** {{GOAL}}

**Request:**
```
Method: {{METHOD}}
URL: {{URL}}
Headers: {{HEADERS}}
Body: {{BODY_OR_NONE}}
```

**Response:**
```
Status: {{STATUS_CODE}}
Headers: {{RESPONSE_HEADERS}}
Body: {{RESPONSE_BODY}}
```

**Code making the request:**
```{{LANGUAGE}}
{{CODE}}
```

Diagnose:
1. Is the request correctly formed?
2. What does the response status and body indicate?
3. What's the most likely cause?
4. Show the corrected request/code
```

---

## DB-07 — Database Query Debugging

```
My database query is returning wrong results or timing out.

**Problem:** {{PROBLEM_DESCRIPTION}}

**Query:**
```sql
{{QUERY}}
```

**Schema (relevant tables):**
```sql
{{SCHEMA}}
```

**EXPLAIN output (if available):**
```
{{EXPLAIN_OUTPUT_OR_NONE}}
```

**Sample data that shows the issue:**
```
{{SAMPLE_DATA_OR_NONE}}
```

1. Identify what the query is actually doing vs. what it should do
2. Point to the logical or performance error
3. Show the corrected query
4. Explain how to verify the fix
```

---

## DB-08 — Async / Concurrency Bug

```
I have a bug related to async code or concurrency. Help me find it.

**Language/Runtime:** {{LANGUAGE_RUNTIME}}
**Symptom:** {{SYMPTOM}}

**Code:**
```{{LANGUAGE}}
{{CODE}}
```

**Observed behavior:** {{OBSERVED}}
**Expected behavior:** {{EXPECTED}}

Common culprits in async code:
- Missing await
- Promise rejection not handled
- Race condition between concurrent operations
- Event loop blocking
- Shared mutable state

Identify which pattern applies here, explain it clearly, and show the fixed version.
```

---

## DB-09 — Production Incident Triage

```
I'm in the middle of a production incident. Help me triage fast.

**What's broken:** {{SYMPTOM}}
**When it started:** {{TIMESTAMP}}
**Impact:** {{USER_IMPACT}}
**Recent deployments:** {{RECENT_DEPLOYS}}

**Error logs:**
```
{{ERROR_LOGS}}
```

**Metrics / alerts:**
```
{{METRICS_OR_NONE}}
```

Give me:
1. **Immediate mitigation** — what to do RIGHT NOW to reduce impact (rollback, kill switch, rate limit, etc.)
2. **Root cause hypotheses** — top 3 causes ranked by probability
3. **Verification steps** — fastest way to confirm which cause
4. **Permanent fix** — once we've identified the cause

Be concise. I'm in an incident, not a tutorial.
```

---

## DB-10 — Test Failure Debugging

```
My test is failing and I don't understand why.

**Test:**
```{{LANGUAGE}}
{{TEST_CODE}}
```

**Code under test:**
```{{LANGUAGE}}
{{IMPLEMENTATION_CODE}}
```

**Failure output:**
```
{{TEST_OUTPUT}}
```

1. Explain what the test is actually asserting
2. Explain what the code is actually doing
3. Identify the mismatch
4. Determine whether the bug is in the test or the implementation
5. Show the correct version of whichever is wrong
```
