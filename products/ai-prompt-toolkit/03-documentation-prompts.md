# Documentation Prompts

> 12 structured prompts for generating, improving, and maintaining technical documentation.

---

## DOC-1: README Generator

```
Write a professional README for this project.

Project name: {{PROJECT_NAME}}
What it does: {{ONE_SENTENCE_DESCRIPTION}}
Primary language/framework: {{TECH_STACK}}
Target users: {{WHO_USES_THIS}}

Key features (list them):
{{LIST_FEATURES}}

Installation/setup process:
{{DESCRIBE_SETUP}}

Include sections: Overview, Features, Installation, Quick Start, Configuration, Contributing, License.
Make it developer-friendly: clear, skimmable, with code examples.
```

---

## DOC-2: API Documentation

```
Write documentation for this API endpoint.

Endpoint: {{HTTP_METHOD}} {{PATH}}
Purpose: {{WHAT_IT_DOES}}

Request:
- Auth required: {{YES/NO + TYPE}}
- Path params: {{LIST}}
- Query params: {{LIST}}
- Body schema: {{PASTE_SCHEMA}}

Response:
- Success: {{STATUS_CODE + BODY_EXAMPLE}}
- Errors: {{LIST_ERROR_CASES}}

Code context:
{{PASTE_HANDLER_CODE}}

Format as OpenAPI-style documentation with curl example, response examples, and error table.
```

---

## DOC-3: Function/Code Comment

```
Write clear documentation comments for this function.

Code:
{{PASTE_FUNCTION_CODE}}

Language: {{LANGUAGE}}
Audience: {{AUDIENCE}} (e.g., "junior devs", "external API consumers")

Write:
1. A one-line summary
2. Parameter descriptions (type + purpose)
3. Return value description
4. Edge cases or important behaviors to note
5. A usage example

Use the standard docstring format for {{LANGUAGE}} (JSDoc / Python docstring / Godoc / etc.).
```

---

## DOC-4: Architecture Decision Record (ADR)

```
Write an Architecture Decision Record for this decision.

Decision: {{WHAT_WAS_DECIDED}}
Context: {{WHY_THIS_CAME_UP}}
Options considered:
1. {{OPTION_1}}
2. {{OPTION_2}}
3. {{OPTION_3}} (if any)

Chosen option: {{WHICH_ONE}}
Reason: {{WHY_THIS_ONE}}
Trade-offs accepted: {{WHAT_WE_GAVE_UP}}

Format as a standard ADR with: Status, Context, Decision, Consequences.
Date: {{DATE}}
Author: {{NAME_OR_TEAM}}
```

---

## DOC-5: Changelog Entry

```
Write a CHANGELOG entry for these changes.

Version: {{VERSION_NUMBER}}
Release date: {{DATE}}

Changes made (describe freely):
{{DESCRIBE_CHANGES}}

Format following Keep a Changelog (keepachangelog.com):
- Added (new features)
- Changed (changes to existing functionality)
- Deprecated (soon-to-be removed)
- Removed (now removed)
- Fixed (bug fixes)
- Security (vulnerability fixes)

Be concise and user-facing. Avoid internal implementation details.
```

---

## DOC-6: Runbook / Operational Guide

```
Write a runbook for this operational procedure.

Procedure: {{PROCEDURE_NAME}} (e.g., "Database failover", "Deploy to production")
System: {{SYSTEM_DESCRIPTION}}
Who runs this: {{ROLE}} (e.g., "on-call engineer")
When to use: {{TRIGGER_CONDITIONS}}

Steps I know:
{{DESCRIBE_STEPS_ROUGHLY}}

Include:
1. Prerequisites and permissions needed
2. Step-by-step instructions with commands
3. Expected output at each step
4. How to verify success
5. Rollback procedure
6. Common errors and fixes

Make it safe for someone unfamiliar with the system to follow at 3am.
```

---

## DOC-7: User-Facing Release Notes

```
Write user-facing release notes for this update.

Product: {{PRODUCT_NAME}}
Version: {{VERSION}}
Audience: {{END_USERS_OR_DEVELOPERS}}

Changes in this release:
{{DESCRIBE_CHANGES_TECHNICALLY}}

Tone: {{TONE}} (e.g., "professional", "friendly", "technical")

Write release notes that:
- Lead with the most valuable change
- Focus on what users can now do (not what we changed internally)
- Explain breaking changes clearly with migration steps
- Keep it skimmable with headers and bullets
- End with a forward-looking note if appropriate
```

---

## DOC-8: Error Message Copy

```
Write clear error messages for these error cases.

System: {{SYSTEM_OR_COMPONENT}}
Audience: {{END_USERS or DEVELOPERS}}

Error cases:
{{LIST_ERROR_SCENARIOS}}

For each error, write:
1. A clear, human-readable error message (no jargon for user-facing)
2. An error code (e.g., ERR_AUTH_TOKEN_EXPIRED)
3. What the user/developer should do next
4. Whether to show technical details (user-facing: no / developer: yes)

Follow the pattern: "What happened + Why + What to do next"
```

---

## DOC-9: Onboarding Guide

```
Write an onboarding guide for new developers on this project.

Project: {{PROJECT_NAME}}
Tech stack: {{TECH_STACK}}
Team size: {{TEAM_SIZE}}

What a new developer needs to know:
{{DESCRIBE_KEY_CONCEPTS_AND_SETUP}}

Cover:
1. Local environment setup (step-by-step with commands)
2. Project structure explanation (what each folder does)
3. Development workflow (branching, PRs, testing)
4. Key concepts / domain knowledge needed
5. Where to get help (docs, channels, contacts)
6. First task suggestions to get oriented

Make it clear enough for their first day.
```

---

## DOC-10: Data Dictionary

```
Create a data dictionary for this database or data model.

Schema:
{{PASTE_SCHEMA_OR_DATA_MODEL}}

System context: {{WHAT_SYSTEM_THIS_BELONGS_TO}}

For each table/collection and field, document:
- Purpose (what it stores)
- Data type and constraints
- Allowed values (for enums or coded fields)
- Business rules or validation logic
- Relationships to other entities
- Example values

Format as a structured reference document.
```

---

## DOC-11: Incident Post-Mortem

```
Help me write an incident post-mortem.

Incident: {{BRIEF_TITLE}}
Date: {{DATE}}
Duration: {{HOW_LONG}}
Impact: {{WHO_AFFECTED + SEVERITY}}

Timeline of events:
{{DESCRIBE_WHAT_HAPPENED_IN_ORDER}}

Root cause: {{WHAT_CAUSED_IT}}
How it was resolved: {{WHAT_FIXED_IT}}

Format as a blameless post-mortem with:
- Executive Summary
- Impact
- Timeline
- Root Cause Analysis (5 Whys)
- What Went Well
- What Went Wrong
- Action Items (with owners and due dates)

Tone: blameless, factual, focused on systems not people.
```

---

## DOC-12: Migration Guide

```
Write a migration guide for this breaking change.

What's changing: {{DESCRIBE_THE_CHANGE}}
Version: {{OLD_VERSION}} → {{NEW_VERSION}}
Breaking changes: {{LIST_BREAKING_CHANGES}}

Old behavior:
{{DESCRIBE_OLD_API_OR_BEHAVIOR}}

New behavior:
{{DESCRIBE_NEW_API_OR_BEHAVIOR}}

Write a migration guide that:
1. States clearly what's changing and why
2. Provides before/after code examples for each breaking change
3. Gives step-by-step migration instructions
4. Lists common migration mistakes to avoid
5. Provides a compatibility shim/workaround if one exists

Target audience: developers upgrading their integration.
```

---

*AI Prompt Engineering Toolkit v1.0 — DevPlaybook*
