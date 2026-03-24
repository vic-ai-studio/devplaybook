# Debugging Prompts

> 12 structured prompts for AI-assisted debugging — from stack traces to production incidents.

---

## DB-1: General Bug Investigation

```
Help me debug this issue.

Problem description: {{DESCRIBE_THE_BUG}}

Error message (if any):
{{PASTE_ERROR_MESSAGE}}

Relevant code:
{{PASTE_CODE_HERE}}

Environment: {{ENVIRONMENT}} (language, framework, OS, runtime version)

What I've already tried: {{WHAT_YOU_TRIED}}

Walk me through the most likely root causes and how to verify each one.
```

---

## DB-2: Stack Trace Analysis

```
Analyze this stack trace and identify the root cause.

Stack trace:
{{PASTE_STACK_TRACE}}

Code context (the failing function or module):
{{PASTE_RELEVANT_CODE}}

Language/runtime: {{LANGUAGE_RUNTIME}}

Tell me:
1. The exact line and reason for the failure
2. The chain of calls that led to it
3. The most likely fix
4. How to prevent this class of error in future
```

---

## DB-3: Intermittent Bug

```
Help me track down a bug that only happens sometimes.

Symptoms: {{DESCRIBE_WHEN_IT_HAPPENS}}
Frequency: {{FREQUENCY}} (e.g., "1 in 100 requests", "only under load")
Environment: {{PRODUCTION / STAGING / LOCAL}}

Code where the issue likely originates:
{{PASTE_CODE_HERE}}

What makes it hard to reproduce: {{DESCRIBE_DIFFICULTY}}

Suggest:
1. Hypothesis for the root cause (race condition, timing, state leak?)
2. How to add logging/instrumentation to catch it
3. A minimal reproduction strategy
4. Potential fixes with trade-offs
```

---

## DB-4: Performance Regression

```
A recent change caused a performance regression. Help me find it.

Symptom: {{DESCRIBE_SLOWNESS}} (e.g., "API response time went from 50ms to 800ms")
When it started: {{TIMEFRAME_OR_DEPLOY}}

Relevant code or diff:
{{PASTE_CODE_OR_DIFF}}

Profiling data (if available):
{{PASTE_PROFILING_DATA}}

Walk me through how to isolate the slow path and suggest fixes.
```

---

## DB-5: Memory Leak

```
Diagnose this potential memory leak.

Symptoms: {{DESCRIBE_MEMORY_BEHAVIOR}} (e.g., "process memory grows 50MB per hour, never freed")
Runtime: {{LANGUAGE_RUNTIME}}
Framework: {{FRAMEWORK}}

Relevant code:
{{PASTE_CODE_HERE}}

Suggest:
1. How to confirm it's a leak (vs. expected growth)
2. Tools to profile and locate the leak in this environment
3. The most likely leak patterns to look for in this code
4. A fix or mitigation strategy
```

---

## DB-6: API / HTTP Debugging

```
Help me debug this API issue.

Request:
{{HTTP_METHOD}} {{URL}}
Headers: {{HEADERS}}
Body: {{REQUEST_BODY}}

Expected response: {{EXPECTED}}
Actual response: {{ACTUAL_STATUS_CODE + BODY}}

Client code:
{{PASTE_CLIENT_CODE}}

Server code (if available):
{{PASTE_SERVER_CODE}}

Diagnose what's wrong and suggest fixes for both client and server sides.
```

---

## DB-7: Database Query Debugging

```
Help me debug this slow or incorrect database query.

Query:
{{PASTE_QUERY}}

Database: {{DB_TYPE + VERSION}}
Table structure (schema):
{{PASTE_SCHEMA}}

Problem: {{INCORRECT_RESULTS or SLOW_PERFORMANCE}}
Row count: approx. {{ROW_COUNT}} rows in the table(s)

EXPLAIN output (if available):
{{PASTE_EXPLAIN_OUTPUT}}

Suggest query optimizations and index changes.
```

---

## DB-8: Async / Concurrency Bug

```
Help me debug a concurrency or async issue.

Language/runtime: {{LANGUAGE_RUNTIME}}
Problem: {{DESCRIBE_ISSUE}} (e.g., "race condition", "deadlock", "promise not resolving")

Relevant code:
{{PASTE_CODE_HERE}}

Error or symptom:
{{PASTE_ERROR_OR_DESCRIBE_BEHAVIOR}}

Explain:
1. Why this concurrency issue is occurring
2. How to reproduce it reliably
3. The correct fix with an explanation of why it works
4. Any other concurrency risks in the surrounding code
```

---

## DB-9: Production Incident Triage

```
I'm dealing with a production incident. Help me triage quickly.

Symptoms: {{WHAT_IS_BROKEN}}
Impact: {{WHO_IS_AFFECTED + SEVERITY}}
Started at: {{TIME}}
Recent changes: {{RECENT_DEPLOYS_OR_CHANGES}}

Available logs:
{{PASTE_RELEVANT_LOGS}}

Give me:
1. Most likely root causes ranked by probability
2. Immediate mitigation steps (to reduce user impact now)
3. What to investigate to confirm the cause
4. How to communicate status to stakeholders
```

---

## DB-10: Test Failure Debugging

```
Help me understand why this test is failing.

Failing test:
{{PASTE_TEST_CODE}}

Test output / error:
{{PASTE_TEST_OUTPUT}}

Code under test:
{{PASTE_PRODUCTION_CODE}}

Test framework: {{FRAMEWORK}}

Tell me:
1. Why the test is failing (assertion mismatch, exception, timeout?)
2. Whether the test or the production code is wrong
3. The correct fix
4. Whether this test is testing the right thing
```

---

## DB-11: Environment / Config Issue

```
My code works locally but fails in {{ENVIRONMENT}} (staging/production/CI).

What fails: {{DESCRIBE_FAILURE}}
Error message:
{{PASTE_ERROR}}

Local environment: {{LOCAL_OS_RUNTIME_VERSIONS}}
Target environment: {{TARGET_OS_RUNTIME_VERSIONS}}

Config differences I know about: {{LIST_KNOWN_DIFFERENCES}}
Relevant config files:
{{PASTE_CONFIG_SNIPPETS}}

Help me identify the environment-specific cause and fix.
```

---

## DB-12: Third-Party Integration Bug

```
Help me debug an issue with a third-party service integration.

Service: {{SERVICE_NAME}} (e.g., Stripe, Twilio, AWS S3)
What's failing: {{DESCRIBE_FAILURE}}

My integration code:
{{PASTE_CODE_HERE}}

Request I'm sending (sanitized):
{{PASTE_REQUEST}}

Response I'm getting:
{{PASTE_RESPONSE}}

Relevant docs or API version: {{DOCS_LINK_OR_VERSION}}

Diagnose the issue and suggest the correct implementation.
```

---

*AI Prompt Engineering Toolkit v1.0 — DevPlaybook*
