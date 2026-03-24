# Documentation Prompts

10 structured prompts for generating, improving, and maintaining technical documentation.

---

## DO-01 — Function / Method Documentation

```
Write documentation for this {{LANGUAGE}} function.

```{{LANGUAGE}}
{{FUNCTION_CODE}}
```

Generate:
1. **One-line summary** — what it does (not how)
2. **Parameters** — name, type, description, whether optional, default value
3. **Returns** — type and description
4. **Throws/Errors** — what exceptions it raises and when
5. **Side effects** — any mutations, I/O, or state changes
6. **Example** — realistic usage example with real values (not `foo`/`bar`)

Use {{JSDOC_OR_DOCSTRING_OR_GODOC}} format. Keep it accurate and don't add fluff.
```

---

## DO-02 — API Reference Documentation

```
Write API reference documentation for this endpoint.

**Endpoint:**
```
{{METHOD}} {{PATH}}
```

**Implementation:**
```{{LANGUAGE}}
{{HANDLER_CODE}}
```

**Schema / Types:**
```{{LANGUAGE}}
{{TYPES_OR_SCHEMA}}
```

Generate documentation covering:
1. **Summary** — what this endpoint does in one sentence
2. **Authentication** — required auth type and how to provide it
3. **Path parameters** — if any
4. **Query parameters** — name, type, required/optional, description
5. **Request body** — schema with all fields documented
6. **Response** — success response schema with all fields
7. **Error responses** — all possible error codes and their meaning
8. **Example** — complete curl example with realistic data

Format as Markdown suitable for a developer portal.
```

---

## DO-03 — README Generator

```
Write a README for this project.

**Project name:** {{PROJECT_NAME}}
**What it does:** {{DESCRIPTION}}
**Primary language/stack:** {{STACK}}
**Target users:** {{WHO_USES_IT}}

**Key files/structure:**
```
{{FILE_TREE_OR_DESCRIPTION}}
```

**Main entry points or commands:**
{{COMMANDS}}

Generate a README with these sections:
1. **Hero** — name, one-line description, badges (build, version, license)
2. **What it does** — 2-3 sentences, benefits not features
3. **Quick Start** — get from zero to working in under 5 minutes
4. **Installation** — prerequisites, step-by-step
5. **Usage** — most common use cases with code examples
6. **Configuration** — environment variables, config file options
7. **Contributing** — how to set up dev environment, run tests, submit PR
8. **License** — one line

Keep it scannable. Use code blocks liberally. Don't write a novel.
```

---

## DO-04 — Architecture Decision Record (ADR)

```
Write an Architecture Decision Record (ADR) for this decision.

**Decision:** {{DECISION_MADE}}
**Context:** {{BACKGROUND_AND_PROBLEM}}
**Options considered:**
1. {{OPTION_1}}
2. {{OPTION_2}}
3. {{OPTION_3_OR_STATUS_QUO}}

**Decision maker(s):** {{NAMES}}
**Date:** {{DATE}}

Write an ADR using this structure:
- **Status** (Proposed / Accepted / Deprecated / Superseded by ADR-XXX)
- **Context** — the problem, constraints, and why a decision was needed
- **Decision** — what was decided and why (the most important part)
- **Options considered** — brief evaluation of each option with trade-offs
- **Consequences** — positive outcomes, negative trade-offs, and what it constrains in future

Keep it factual and permanent. This is a historical record, not a persuasion document.
```

---

## DO-05 — Code Comment Generator

```
Add appropriate inline comments to this code.

```{{LANGUAGE}}
{{CODE}}
```

Rules:
- Comment the **why**, not the **what** — good code explains what, comments explain why
- Flag non-obvious business logic, workarounds, and gotchas
- Add TODO/FIXME where there are known issues or tech debt
- Keep comments short and factual
- Do NOT add comments to self-documenting code (e.g., `// increment counter` above `counter++`)

Return the code with comments added. Mark added comments with `// [ADDED]` so I can review them.
```

---

## DO-06 — Changelog Entry

```
Write a changelog entry for these changes.

**Version:** {{VERSION}}
**Release date:** {{DATE}}
**Changes made:**
{{COMMIT_MESSAGES_OR_DESCRIPTION}}

**Breaking changes:** {{BREAKING_OR_NONE}}

Write a changelog entry following Keep a Changelog format:
- **Added** — new features
- **Changed** — changes to existing functionality
- **Deprecated** — features that will be removed
- **Removed** — features removed this version
- **Fixed** — bug fixes
- **Security** — security vulnerabilities patched

Write for the person upgrading, not the developer who made the changes. Be specific. "Fixed bug" is useless. "Fixed crash when user has no profile photo" is useful.
```

---

## DO-07 — Technical Runbook

```
Write an operational runbook for this system/service.

**Service:** {{SERVICE_NAME}}
**What it does:** {{SERVICE_DESCRIPTION}}
**Runs on:** {{INFRASTRUCTURE}}
**On-call contacts:** {{CONTACTS}}

**Common issues I've seen:**
{{LIST_COMMON_ISSUES}}

Write a runbook covering:
1. **Overview** — what this service does and why it matters
2. **Architecture** — key components, dependencies, data flow (simple diagram in text)
3. **Health check** — how to verify the service is healthy
4. **Deployment** — how to deploy, rollback, restart
5. **Common issues** — symptom → likely cause → steps to diagnose → how to fix
6. **Escalation** — when to escalate and to whom
7. **Key metrics** — what dashboards/alerts to check

Format as a numbered procedure where precision matters. Ambiguous runbooks kill on-call engineers.
```

---

## DO-08 — User-Facing Documentation

```
Write user-facing documentation for this feature.

**Feature:** {{FEATURE_NAME}}
**What it does:** {{FEATURE_DESCRIPTION}}
**Target users:** {{USER_TYPE_AND_TECHNICAL_LEVEL}}
**Common user goals:**
1. {{GOAL_1}}
2. {{GOAL_2}}
3. {{GOAL_3}}

**Screenshots/UI (describe if no actual images):**
{{UI_DESCRIPTION}}

Write documentation that:
1. Leads with what the user can accomplish (not how the feature works)
2. Uses task-based structure ("To do X, do Y")
3. Includes numbered steps for procedures
4. Calls out prerequisites up front
5. Covers the 3 most common things users get wrong
6. Avoids jargon your users won't know

Format as Markdown. Keep paragraphs short. Use headers to enable scanning.
```

---

## DO-09 — Migration Guide

```
Write a migration guide for this change.

**What's changing:** {{CHANGE_DESCRIPTION}}
**Old behavior:**
```{{LANGUAGE}}
{{OLD_CODE_OR_API}}
```
**New behavior:**
```{{LANGUAGE}}
{{NEW_CODE_OR_API}}
```
**Breaking changes:** {{LIST_BREAKING_CHANGES}}
**Affected users:** {{WHO_IS_AFFECTED}}

Write a migration guide with:
1. **Why this changed** — brief motivation (users want to know)
2. **Summary of changes** — quick overview of what's different
3. **Step-by-step migration** — numbered steps with before/after code examples for each change
4. **Automated migration** — codemods or scripts available, if any
5. **Testing your migration** — how to verify nothing broke
6. **Timeline** — when old behavior is removed (if deprecation)
7. **Help** — where to ask questions

Be explicit. Assume the reader hasn't thought about this until today.
```

---

## DO-10 — Post-Mortem / Incident Report

```
Write a post-mortem for this incident.

**Incident:** {{INCIDENT_TITLE}}
**Date and duration:** {{DATE}} | Duration: {{DURATION}}
**Severity / Impact:** {{SEVERITY}} | {{USER_IMPACT}}
**Timeline of events:**
{{TIMELINE}}
**Root cause:** {{ROOT_CAUSE}}
**What we did to resolve it:** {{RESOLUTION}}
**What we're doing to prevent recurrence:** {{ACTION_ITEMS}}

Write a blameless post-mortem report with:
1. **Executive summary** — 3 sentences: what happened, impact, root cause
2. **Impact** — quantified user/business impact
3. **Timeline** — chronological events from detection to resolution
4. **Root cause analysis** — 5 Whys or similar technique, not just the proximate cause
5. **Contributing factors** — systemic issues that made the incident worse
6. **What went well** — detection, response, communication that worked
7. **Action items** — specific tasks, owners, and due dates (not vague "improve monitoring")

Be specific and factual. Avoid blame. Focus on systems, not people.
```
