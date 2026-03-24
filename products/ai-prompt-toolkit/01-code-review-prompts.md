# Code Review Prompts

> 12 structured prompts for AI-powered code review across security, performance, readability, and more.

---

## PR-1: General Code Review

```
Review the following code for correctness, clarity, and potential issues.

Code:
{{PASTE_CODE_HERE}}

Language: {{LANGUAGE}}
Context: {{BRIEF_DESCRIPTION_OF_WHAT_CODE_DOES}}

Provide feedback organized by:
1. Critical issues (bugs, security risks)
2. Code quality improvements
3. Minor style suggestions

Be specific and actionable. Include line references where relevant.
```

---

## PR-2: Security Audit

```
Perform a security-focused review of this code.

Code:
{{PASTE_CODE_HERE}}

Check for:
- Injection vulnerabilities (SQL, command, XSS)
- Authentication/authorization flaws
- Insecure data handling or storage
- Missing input validation
- Hardcoded secrets or credentials
- Insecure dependencies or imports

For each issue found: describe the vulnerability, its risk level (critical/high/medium/low), and the recommended fix.
```

---

## PR-3: Performance Analysis

```
Analyze this code for performance bottlenecks.

Code:
{{PASTE_CODE_HERE}}

Context: This runs {{FREQUENCY}} (e.g., "on every API request", "in a background job").
Expected load: {{LOAD}} (e.g., "1000 req/sec", "once daily")

Identify:
- Inefficient algorithms or data structures
- Unnecessary database queries or N+1 patterns
- Memory leaks or excessive allocations
- Missing caching opportunities
- Blocking operations that should be async

Suggest concrete optimizations with expected impact.
```

---

## PR-4: API Design Review

```
Review this API design for usability, consistency, and best practices.

API definition (OpenAPI/code/description):
{{API_DEFINITION}}

Technology: {{FRAMEWORK}} (e.g., Express, FastAPI, Rails)

Evaluate:
- Naming consistency (endpoints, parameters, response fields)
- HTTP method and status code usage
- Error response structure
- Pagination, filtering, and sorting patterns
- Versioning strategy
- Breaking change risks

Suggest improvements with reasoning.
```

---

## PR-5: Database Schema Review

```
Review this database schema for design quality and query efficiency.

Schema:
{{PASTE_SCHEMA_HERE}}

Database: {{DB_TYPE}} (PostgreSQL / MySQL / SQLite / etc.)
Primary use case: {{USE_CASE}}

Check for:
- Normalization issues (or intentional denormalization)
- Index strategy (missing or redundant indexes)
- Data type appropriateness
- Foreign key and constraint correctness
- Naming conventions
- Scalability concerns at {{EXPECTED_SCALE}} rows

Provide specific recommendations.
```

---

## PR-6: Frontend Component Review

```
Review this frontend component for quality and best practices.

Component code:
{{PASTE_COMPONENT_HERE}}

Framework: {{FRAMEWORK}} (React / Vue / Svelte / etc.)

Check for:
- Accessibility (ARIA, keyboard navigation, color contrast)
- Performance (unnecessary re-renders, large bundle impact)
- Prop/type safety
- Error and loading state handling
- Responsive design considerations
- Code reusability

Give actionable suggestions with code examples where helpful.
```

---

## PR-7: Code Smell Detection

```
Identify code smells and anti-patterns in this code.

Code:
{{PASTE_CODE_HERE}}

Look for:
- Long methods or classes (God objects)
- Deeply nested conditionals
- Duplicated logic (DRY violations)
- Magic numbers or strings
- Feature envy (class uses another's data too much)
- Primitive obsession
- Dead code

For each smell: name it, show the problematic section, and suggest a refactoring approach.
```

---

## PR-8: Readability Review

```
Review this code specifically for readability and maintainability.

Code:
{{PASTE_CODE_HERE}}

Target audience: {{AUDIENCE}} (e.g., "junior developers", "the team in 6 months")

Evaluate:
- Variable and function naming clarity
- Comment quality (missing, outdated, or redundant)
- Function/method length and single-responsibility
- Module structure and separation of concerns
- Complexity (cyclomatic complexity hotspots)

Rewrite the most problematic section as a clear example.
```

---

## PR-9: Infrastructure as Code Review

```
Review this IaC configuration for correctness and security.

Config:
{{PASTE_IaC_HERE}}

Tool: {{TOOL}} (Terraform / Pulumi / CloudFormation / Kubernetes YAML)
Cloud: {{CLOUD}} (AWS / GCP / Azure)

Check for:
- Security misconfigurations (open ports, public buckets, overly permissive IAM)
- Resource sizing (over or under-provisioned)
- Missing tagging or naming conventions
- Cost optimization opportunities
- Idempotency and state management issues

Flag critical security findings first.
```

---

## PR-10: Test Coverage Review

```
Review the tests for this code and identify coverage gaps.

Production code:
{{PASTE_PRODUCTION_CODE}}

Existing tests:
{{PASTE_EXISTING_TESTS}}

Test framework: {{FRAMEWORK}}

Evaluate:
- Which code paths are untested
- Missing edge cases (empty input, null, max values, error paths)
- Test quality (testing behavior vs. implementation)
- Test isolation and mock usage
- Flakiness risks

Write 3 example tests for the most critical uncovered cases.
```

---

## PR-11: Dependency Audit

```
Audit the dependencies in this project for risks and improvements.

Package manifest:
{{PASTE_PACKAGE_JSON_OR_REQUIREMENTS}}

Check for:
- Outdated packages with known CVEs
- Packages that could be replaced with smaller alternatives
- Unused or redundant dependencies
- License compatibility issues (MIT / Apache / GPL)
- Version pinning strategy (exact vs. range)

Summarize critical security issues first, then optimization opportunities.
```

---

## PR-12: Refactoring Roadmap

```
Create a prioritized refactoring plan for this codebase section.

Code to refactor:
{{PASTE_CODE_HERE}}

Context: {{CONTEXT}} (e.g., "this is our authentication module, touched daily")
Constraints: {{CONSTRAINTS}} (e.g., "can't change public API", "must remain backwards compatible")

Produce a step-by-step refactoring roadmap:
- Each step should be independently deployable
- Order by risk (lowest first)
- Estimate effort (S/M/L) per step
- Note which steps can be parallelized

Focus on changes with the highest impact-to-risk ratio.
```

---

*AI Prompt Engineering Toolkit v1.0 — DevPlaybook*
