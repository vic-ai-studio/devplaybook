# Development Prompts — Code Review, Debugging, Architecture

> 30 prompts for software development tasks. Works with Claude, ChatGPT (GPT-4o), and Gemini.
> Replace all {{PLACEHOLDER}} values before sending.

---

## DEV-1: General Code Review

Review the following {{LANGUAGE}} code for correctness, clarity, and potential issues.

Code: {{PASTE_CODE}}

Context: {{BRIEF_DESCRIPTION}}

Provide feedback organized by:
1. Critical issues (bugs, security risks)
2. Code quality improvements
3. Minor style suggestions

Be specific. Include line references where relevant.

---

## DEV-2: Security Audit

Perform a security-focused review of this {{LANGUAGE}} code.

Code: {{PASTE_CODE}}

Check for: injection vulnerabilities (SQL/XSS/command), authentication flaws, insecure data handling, missing input validation, hardcoded secrets.

For each issue: vulnerability description, risk level (critical/high/medium/low), recommended fix.

---

## DEV-3: Performance Analysis

Analyze this {{LANGUAGE}} code for performance bottlenecks.

Code: {{PASTE_CODE}}

Identify: (1) time complexity of key operations (Big O), (2) memory allocation issues, (3) unnecessary iterations, (4) caching opportunities, (5) database query efficiency.

Suggest concrete optimizations with expected impact.

---

## DEV-4: Debug This Error

Help me debug this error.

Error message: {{PASTE_ERROR}}

Code where error occurs: {{PASTE_CODE}}

Environment: {{LANGUAGE_VERSION}} on {{OS}}. What I've tried: {{WHAT_YOU_TRIED}}

Explain: (1) why this error occurs, (2) how to fix it, (3) how to prevent it.

---

## DEV-5: Explain This Code

Explain this {{LANGUAGE}} code to me. I'm a {{SKILL_LEVEL}} developer.

Code: {{PASTE_CODE}}

Tell me: (1) what this code does, (2) how it works step by step, (3) important patterns used, (4) potential edge cases or gotchas.

---

## DEV-6: Refactor for Readability

Refactor this code for better readability and maintainability. Keep the same behavior.

Current code: {{PASTE_CODE}}

Focus on: better naming, reducing nesting, extracting helpers, adding comments, following {{LANGUAGE}} best practices.

Show refactored version with explanation of each change.

---

## DEV-7: Write Unit Tests

Write comprehensive unit tests for this {{LANGUAGE}} function/class.

Code to test: {{PASTE_CODE}}. Testing framework: {{JEST_or_PYTEST_or_etc}}

Cover: happy path, edge cases (empty/null/boundaries), error cases, complex business logic.
Use descriptive test names that explain what is being tested.

---

## DEV-8: System Design Review

Review this system design and provide feedback.

Design: {{DESCRIBE_YOUR_SYSTEM}}

Evaluate: (1) scalability at 10x traffic, (2) single points of failure, (3) data consistency, (4) latency, (5) cost.

Suggest specific improvements for the top 3 concerns.

---

## DEV-9: API Design Review

Review this REST API design and suggest improvements.

Endpoints: {{PASTE_API_SPEC}}

Evaluate: RESTful conventions, HTTP methods, response structure, status codes, auth approach, versioning, error format.

Provide a revised version of any problematic endpoints.

---

## DEV-10: Migrate Code to New Pattern

Migrate this {{LANGUAGE}} code from {{OLD_PATTERN}} to {{NEW_PATTERN}}.

Current code: {{PASTE_CODE}}

Requirements: preserve all behavior, use modern best practices, keep same public API where possible, explain structural changes.

---

## DEV-11: Write Documentation

Write documentation for this {{LANGUAGE}} code.

Code: {{PASTE_CODE}}

Generate: (1) docstrings in {{FORMAT}}, (2) README section, (3) usage examples, (4) parameter/return descriptions, (5) caveats.

---

## DEV-12: Handle Edge Cases

This code doesn't handle edge cases. Fix it.

Current code: {{PASTE_CODE}}. Known edge cases: {{LIST_EDGE_CASES}}

Also identify edge cases I may have missed. Show updated code with comments explaining each fix.

---

## DEV-13: Database Schema Review

Review this database schema and suggest improvements.

Schema: {{PASTE_SCHEMA}}. Use case: {{DESCRIBE_USE_CASE}}. Scale: {{ROWS}} rows, {{QPS}} queries/second.

Evaluate: normalization, index strategy, foreign keys, data types, N+1 query potential.

Provide revised schema with explanations.

---

## DEV-14: Write a CLI Tool

Write a {{LANGUAGE}} CLI tool that {{DESCRIBE_PURPOSE}}.

Requirements: {{LIST_REQUIREMENTS}}

Include: argument parsing with help text, input validation, --verbose/--quiet flags, exit codes (0=success, 1=error), usage example.

---

## DEV-15: Optimize SQL Query

Optimize this SQL query currently taking {{CURRENT_TIME}} to run.

Query: {{PASTE_QUERY}}

Table sizes: {{TABLE}}: ~{{ROWS}} rows. Existing indexes: {{LIST_INDEXES}}

Suggest: (1) query rewrite, (2) index additions, (3) schema changes if needed. Explain expected improvement.

---

## DEV-16: Create a Dockerfile

Write a production-ready Dockerfile for this {{LANGUAGE}} application.

App type: {{WEB_APP_or_WORKER}}. Port: {{PORT}}. Start command: {{CMD}}

Requirements: multi-stage build, non-root user, health check, minimal image size. Include .dockerignore content.

---

## DEV-17: Code Review Checklist

Create a code review checklist for {{LANGUAGE}}/{{FRAMEWORK}} projects.

Team context: {{TEAM_SIZE}} engineers, {{PROJECT_TYPE}}. Common issues: {{DESCRIBE_ISSUES}}

Generate a markdown checklist covering: correctness, security, performance, testability, documentation, style.
Format ready to paste into a PR template.

---

## DEV-18: Implement Design Pattern

Implement the {{DESIGN_PATTERN}} pattern in {{LANGUAGE}} for this use case.

Use case: {{DESCRIBE_USE_CASE}}. Context: {{PASTE_RELEVANT_CODE}}

Provide: (1) implementation, (2) usage example, (3) why this pattern fits, (4) trade-offs.

---

## DEV-19: Add Feature Flag

Add feature flag support to this {{LANGUAGE}} codebase.

Code: {{PASTE_CODE}}. Flag: {{FLAG_NAME}} controls {{DESCRIBE_FEATURE}}. Default: {{ON_or_OFF}}. Method: {{ENV_VAR_or_CONFIG_or_DB}}

Show: how to define, check, enable/disable, and clean up after the feature ships.

---

## DEV-20: Generate Mock Data

Generate realistic mock data for testing.

Data structure: {{DESCRIBE_SCHEMA}}. Number of records: {{NUMBER}}

Include: realistic varied values, edge cases (empty strings, max length, special chars), useful for testing {{SCENARIOS}}.

Output as {{JSON_or_CSV_or_SQL}} format.

---

## DEV-21: Write GitHub Actions CI

Write a GitHub Actions workflow for this {{LANGUAGE}} project.

Project type: {{WEB_APP_or_LIBRARY}}. Tests: {{TEST_CMD}}. Build: {{BUILD_CMD}}. Deploy to: {{PLATFORM_or_NONE}}

Requirements: trigger on push+PR, parallel jobs, dependency caching, fail fast. Add comments explaining each step.

---

## DEV-22: Error Handling Strategy

Design an error handling strategy for this {{LANGUAGE}}/{{FRAMEWORK}} application.

Current code: {{PASTE_CODE}}. App type: {{API_or_WEB_or_CLI}}

Design: (1) error types/hierarchy, (2) catch vs propagate rules, (3) logging strategy, (4) user-facing messages, (5) monitoring hooks.

Show implementation for the most critical paths.

---

## DEV-23: Add Caching Layer

Add caching to this {{LANGUAGE}} code to improve performance.

Current code: {{PASTE_CODE}}. Bottleneck: {{DESCRIBE}}. Cache tech: {{REDIS_or_MEMCACHED}}. Invalidation rules: {{WHEN_TO_INVALIDATE}}

Implement: cache key strategy, TTL values, cache-aside pattern, invalidation, graceful fallback.

---

## DEV-24: Convert to TypeScript

Convert this JavaScript code to TypeScript.

Code: {{PASTE_CODE}}

Requirements: proper types (avoid any), interfaces for objects, enums for fixed values, generics where useful. Preserve all behavior.

Show TypeScript version with comments on significant type decisions.

---

## DEV-25: Design Webhook System

Design a webhook system for {{DESCRIBE_PRODUCT}}.

Events: {{LIST_EVENTS}}. Scale: {{EVENTS_PER_DAY}}/day. Consumers: {{INTERNAL_or_EXTERNAL}}

Design: (1) event schema, (2) delivery mechanism, (3) retry with backoff, (4) security/signing, (5) registration API, (6) monitoring.
Include code snippets for key components.

---

## DEV-26: Make Code Async

Convert this synchronous {{LANGUAGE}} code to async/concurrent.

Current code: {{PASTE_CODE}}. Bottleneck: {{SLOW_OPERATIONS}}

Rewrite to: run independent operations concurrently, handle async errors, avoid race conditions, stay readable.

Show before vs. after with expected performance improvement.

---

## DEV-27: Dependency Injection

Refactor this {{LANGUAGE}} code to use dependency injection.

Current tightly-coupled code: {{PASTE_CODE}}

Goals: easier unit testing (mockable deps), loose coupling, configurable behavior.

Show: (1) interface definitions, (2) constructor injection, (3) wiring, (4) test with mock.

---

## DEV-28: Write a Load Test

Write a load test for this API endpoint.

Endpoint: {{METHOD}} {{URL}}. Payload: {{PASTE_PAYLOAD}}. Auth: {{AUTH_TYPE}}. Tool: {{K6_or_LOCUST}}

Scenarios: ramp 0→{{MAX_USERS}} over {{RAMP_TIME}}, sustain {{PEAK}} for {{DURATION}}.

Measure: p50/p95/p99 latency, error rate, throughput. Pass/fail thresholds: {{SLA}}.

---

## DEV-29: Implement Rate Limiting

Add rate limiting to this {{LANGUAGE}}/{{FRAMEWORK}} API.

Code: {{PASTE_CODE}}. Limit: {{N}} requests per {{WINDOW}} per {{IP_or_USER}}. Storage: {{REDIS_or_MEMORY}}

Requirements: HTTP 429 with retry-after header. Exclude: {{ENDPOINTS_TO_EXCLUDE}}

Implement middleware with tests.

---

## DEV-30: Technical Debt Assessment

Assess technical debt in this codebase section.

Code: {{PASTE_CODE}}. Age: {{AGE}}. Team size: {{SIZE}}.

Identify: code smells (with examples), missing tests/docs, outdated patterns, security vulnerabilities, scalability limits.

Prioritize by: (1) risk, (2) fix cost, (3) business impact. Output a debt register table.
