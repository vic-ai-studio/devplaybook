# Code Review Prompts

10 structured prompts for thorough, consistent code reviews.

---

## CR-01 — General Code Review

```
Review the following {{LANGUAGE}} code. Evaluate it across these dimensions:

1. **Correctness** — Does it do what it's supposed to? Are there edge cases it misses?
2. **Readability** — Is it clear and self-documenting?
3. **Performance** — Any obvious bottlenecks or unnecessary work?
4. **Security** — Any vulnerabilities (injection, exposure, auth issues)?
5. **Maintainability** — Is it easy to change later without breaking things?

For each issue, specify:
- Severity: [Critical / Major / Minor / Suggestion]
- Line or section reference
- What the problem is
- How to fix it (with a code snippet if helpful)

Code:
```{{LANGUAGE}}
{{CODE}}
```

Context: {{CONTEXT_OR_NONE}}
```

---

## CR-02 — Security-Focused Review

```
Perform a security-focused review of this {{LANGUAGE}} code. Look specifically for:

- SQL/NoSQL injection vulnerabilities
- XSS or output encoding issues
- Authentication and authorization gaps
- Insecure handling of secrets, tokens, or PII
- Unsafe deserialization or eval usage
- Missing input validation or rate limiting
- Dependency risks (if imports/packages are visible)

For each finding, provide:
- Vulnerability type (OWASP category if applicable)
- Severity: [Critical / High / Medium / Low]
- Exact location in the code
- Exploitation scenario (1-2 sentences)
- Remediation code

Code:
```{{LANGUAGE}}
{{CODE}}
```
```

---

## CR-03 — Performance Review

```
Analyze this {{LANGUAGE}} code for performance issues. Focus on:

- Time complexity of algorithms (O-notation)
- Unnecessary iterations, nested loops, or redundant computations
- Memory allocations that can be avoided or batched
- Database query patterns (N+1, missing indexes, over-fetching)
- Caching opportunities
- Async/await or concurrency issues

For each issue:
- Explain the current cost
- Show the optimized version
- Estimate the improvement (e.g., "reduces DB queries from N to 1")

Code:
```{{LANGUAGE}}
{{CODE}}
```

Expected scale/load: {{SCALE_OR_NONE}}
```

---

## CR-04 — Pull Request Review

```
I'm reviewing this pull request. Act as a senior engineer on my team.

PR Title: {{PR_TITLE}}
PR Description: {{PR_DESCRIPTION}}

Changed files:
```diff
{{DIFF}}
```

Review this PR and provide:
1. **Summary** — What does this PR actually do? (2-3 sentences, your interpretation)
2. **Concerns** — Anything that should block merge (correctness, security, regressions)
3. **Suggestions** — Non-blocking improvements worth discussing
4. **Nits** — Tiny style/naming things (list briefly, don't dwell)
5. **Verdict** — Approve / Request Changes / Needs Discussion

Be direct. If something is wrong, say so clearly.
```

---

## CR-05 — API Design Review

```
Review this API design. Evaluate it as a public-facing developer API.

```{{FORMAT}}
{{API_SPEC_OR_CODE}}
```

Assess:
1. **Consistency** — Are naming conventions, response shapes, and error formats consistent?
2. **REST/GraphQL conventions** — Is it idiomatic? Any anti-patterns?
3. **Versioning** — Is there a versioning strategy?
4. **Error handling** — Are errors informative and consistent?
5. **Auth** — Is authentication/authorization correctly applied?
6. **Breaking changes** — Could this break existing clients?

For each issue, show the current design and the recommended change.
```

---

## CR-06 — Database Schema Review

```
Review this database schema design.

```sql
{{SCHEMA}}
```

Database: {{POSTGRES_OR_MYSQL_OR_OTHER}}
Expected scale: {{ROWS_AND_QUERIES_PER_SECOND}}

Evaluate:
1. **Normalization** — Is it appropriately normalized? Over/under normalized?
2. **Indexes** — Are the right indexes present? Any missing or redundant?
3. **Constraints** — Foreign keys, NOT NULL, UNIQUE where needed?
4. **Data types** — Correct types for the data? Any wasteful choices?
5. **Naming** — Consistent, clear naming conventions?
6. **Query patterns** — Given typical queries, will this schema perform well?

Show CREATE TABLE improvements where relevant.
```

---

## CR-07 — Frontend Component Review

```
Review this {{FRAMEWORK}} component.

```{{LANGUAGE}}
{{COMPONENT_CODE}}
```

Evaluate:
1. **Accessibility** — ARIA roles, keyboard navigation, color contrast hints
2. **Performance** — Unnecessary re-renders, missing memoization, large bundle imports
3. **State management** — Is local state appropriate, or should it be lifted/global?
4. **Prop design** — Are props minimal, well-typed, and sensible?
5. **Error states** — Are loading, error, and empty states handled?
6. **Responsiveness** — Any obvious layout issues on mobile?

Provide specific code improvements for each issue found.
```

---

## CR-08 — Infrastructure as Code Review

```
Review this infrastructure configuration.

```{{IaC_TOOL}}
{{CONFIG}}
```

Target environment: {{DEV_STAGING_PROD}}

Check for:
1. **Security** — Open security groups, public resources that should be private, missing encryption
2. **Cost** — Over-provisioned resources, missing auto-scaling, always-on resources that could be spot/serverless
3. **Reliability** — Single points of failure, missing health checks, no multi-AZ
4. **Best practices** — Hardcoded values that should be variables, missing tags, deprecated resources
5. **Drift risk** — Anything that could cause unexpected changes on apply

Provide corrected configuration snippets for each issue.
```

---

## CR-09 — Code Smell Detection

```
Analyze this {{LANGUAGE}} code for code smells and anti-patterns.

```{{LANGUAGE}}
{{CODE}}
```

Look for:
- God classes/functions (doing too much)
- Feature envy (methods using another class's data more than their own)
- Shotgun surgery (changes require touching many files)
- Long parameter lists
- Primitive obsession
- Duplicate code (DRY violations)
- Dead code / unreachable branches
- Magic numbers and hardcoded strings
- Inappropriate intimacy between modules

For each smell found:
- Name the pattern
- Quote the offending lines
- Explain why it's a problem
- Show a refactored version
```

---

## CR-10 — Readability and Style Review

```
Review this code purely for readability and maintainability — not correctness.

```{{LANGUAGE}}
{{CODE}}
```

Team context: {{TEAM_SIZE_AND_EXPERIENCE}}
Style guide in use: {{STYLE_GUIDE_OR_NONE}}

Evaluate:
- Variable and function naming — clear, consistent, descriptive?
- Function length and single responsibility
- Comment quality — explain *why*, not *what*
- Consistent formatting and indentation
- Complexity — can anything be simplified without losing clarity?
- Self-documenting code opportunities (rename vs. comment)

Suggest specific rewrites for the 3-5 most impactful readability improvements.
```
