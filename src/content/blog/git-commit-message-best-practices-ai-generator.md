---
title: "Git Commit Message Best Practices + How AI Can Help You Write Better Commits"
description: "Learn the Conventional Commits specification, see good vs bad commit examples, and discover how AI tools like Claude and Copilot can help you write clearer, more useful git commit messages."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: [git, version-control, best-practices, ai-tools, developer-workflow]
readingTime: "10 min read"
---

Every commit message is a note to your future self—and your future teammates. Write them well and `git log` becomes a searchable history of why your codebase is the way it is. Write them poorly and you're left with a wall of `"fix stuff"` and `"wip"` that tells you nothing when a production bug needs tracing at 3 AM.

This guide covers the fundamentals, the industry-standard Conventional Commits specification, practical examples across different change types, and how AI tools are changing the way developers generate commit messages.

---

## Why Commit Messages Matter

Before diving into format, it's worth being concrete about when commit messages actually get read—because understanding the use cases shapes what makes a good message.

### `git log` — Historical Context

```bash
git log --oneline --graph --all
```

A well-written log reads like a project changelog:

```
a3f9b2c feat(auth): add OAuth2 login with Google provider
e1c8d45 fix(api): handle null response from payment gateway
7b3a019 refactor(db): replace raw SQL with Knex query builder
2f1e883 chore(deps): upgrade Express from 4.18 to 5.0
```

A poorly maintained log reads like:

```
a3f9b2c fix
e1c8d45 update
7b3a019 wip
2f1e883 asdf
```

The second version is actively harmful—it's worse than no history because it creates the illusion of version control while providing none of the benefits.

### `git blame` — Understanding Decisions

When you find a puzzling piece of code, `git blame` tells you who wrote it and in which commit. The commit message then tells you *why*. A message like `"fix: skip empty arrays to prevent downstream serialization crash"` saves 20 minutes of archaeology every time someone touches that code path.

### `git bisect` — Finding Regressions

`git bisect` lets you binary-search your commit history to find exactly which commit introduced a bug. This is only useful if the commit messages tell you what each commit actually changed. With meaningful messages, you can skip whole ranges of commits confidently.

```bash
git bisect start
git bisect bad HEAD
git bisect good v2.1.0
# git bisect tests commits between v2.1.0 and HEAD
# Readable messages let you intelligently mark good/bad
```

### Changelogs and Release Notes

Tools like `conventional-changelog` and `semantic-release` generate changelogs automatically from commit messages. This only works if your messages follow a consistent format—and the output is only as useful as the input messages are specific.

---

## The Conventional Commits Specification

[Conventional Commits](https://www.conventionalcommits.org) is the most widely adopted commit message standard. It's simple enough to remember, structured enough for tooling, and expressive enough for real-world use.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to Use |
|------|-------------|
| `feat` | New feature or capability |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `docs` | Documentation changes only |
| `style` | Formatting, whitespace (no logic change) |
| `chore` | Build process, dependency updates, tooling |
| `ci` | CI/CD pipeline changes |
| `revert` | Reverting a previous commit |

### Scope (Optional)

The scope is a noun describing the part of the codebase affected:

```
feat(auth): ...
fix(api/users): ...
refactor(database): ...
chore(deps): ...
```

Keep scopes consistent within your project. Pick from a defined list and add to it as the codebase grows.

### Breaking Changes

Breaking changes are indicated with `!` after the type/scope, or a `BREAKING CHANGE:` footer:

```
feat(api)!: change user endpoint response format

BREAKING CHANGE: The /api/users endpoint now returns `firstName` and `lastName`
instead of the previously used `name` field. Clients must update accordingly.
```

---

## Good vs. Bad Commit Examples

### Bug Fixes

**Bad:**
```
fix bug
```
```
fixed the thing
```
```
update login
```

**Good:**
```
fix(auth): redirect to login when JWT expires instead of showing blank page
```
```
fix(cart): prevent duplicate line items when clicking add button rapidly
```
```
fix(api): return 404 instead of 500 when user ID does not exist
```

The good examples tell you: what was broken, where it was broken, and what the correct behavior now is.

### New Features

**Bad:**
```
add feature
```
```
new stuff
```

**Good:**
```
feat(dashboard): add export to CSV button for filtered reports
```
```
feat(notifications): send email digest for unread messages after 24h
```
```
feat(search): add fuzzy matching for product name queries
```

### Refactors

Refactors are often the worst-documented commits because "nothing changed" externally. But understanding *why* code was restructured is valuable.

**Bad:**
```
refactor
```
```
clean up code
```

**Good:**
```
refactor(payment): extract Stripe integration into dedicated service class
```
```
refactor(auth): replace custom session logic with express-session middleware
```
```
refactor(db): consolidate 4 user query functions into UserRepository pattern
```

### Breaking Changes

**Bad:**
```
update API
```

**Good:**
```
feat(api)!: require authentication on all /v2 endpoints

Previously, several v2 endpoints were publicly accessible. This commit
requires a valid Bearer token on all routes under /v2/*.

BREAKING CHANGE: Clients using /v2/products or /v2/categories without
authentication will receive 401 Unauthorized instead of 200 OK.
Migration: add Authorization header with a valid API key.
```

---

## Writing Commits for Different Contexts

### Fixing a Production Bug

Include enough context to understand the incident:

```
fix(orders): prevent double-charge when payment gateway returns timeout

The payment processor occasionally returns a timeout after successfully
charging the card, causing retry logic to attempt a second charge.

Added idempotency key per Stripe documentation to prevent duplicate charges.
Idempotency key = `order_{id}_{timestamp_created}`.

Fixes #1847
Related to: https://stripe.com/docs/api/idempotent_requests
```

### Implementing a Feature

Reference the ticket, describe the behavior, note any decisions made:

```
feat(subscriptions): add annual billing option with 20% discount

Users can now select annual billing during checkout and subscription upgrade.
Pricing is calculated as (monthly_price * 12 * 0.80).

- Added annual toggle to PricingCard component
- Updated SubscriptionService to handle ANNUAL billing_period
- Annual subscriptions renew on the same date each year (not 365 days)

Implements VIC-234
```

### Dependency Updates

Don't just write `chore(deps): bump packages`. Note what changed and why:

```
chore(deps): upgrade Prisma from 5.x to 6.0

Prisma 6.0 includes breaking changes to relation queries.
Updated all findUnique calls that used include with nested where clauses
to use the new findFirst syntax.

See migration guide: https://pris.ly/d/prisma-6-migration
```

---

## AI-Assisted Commit Messages

AI tools have become genuinely useful for commit messages—not to replace developer judgment, but to generate a solid first draft from the diff.

### Using Claude via CLI

If you use Claude Code or the Claude API:

```bash
# Stage your changes first
git add -p  # or git add specific files

# Get Claude to generate a commit message from the diff
git diff --cached | claude -p "Write a conventional commit message for this diff. Use the format: type(scope): description. Be specific about what changed and why."
```

Claude is particularly good at:
- Synthesizing multiple file changes into a coherent description
- Identifying the "why" from context (variable names, comments, test descriptions)
- Flagging when a set of changes is doing too many things (a sign you should split the commit)

### Using GitHub Copilot

In VS Code with Copilot, the Source Control panel includes a "Generate Commit Message" button (sparkle icon) that analyzes your staged diff and generates a message. The quality is good for straightforward changes and improves when you give it context by reviewing the suggestions and editing.

### Practical AI Commit Workflow

The best workflow isn't "let AI write all my commits"—it's using AI for the first draft and reviewing it:

1. Stage your changes (`git add -p` to stage interactively)
2. Generate a draft message (AI tool of choice)
3. Read the draft and ask: Is this specific enough? Does it explain *why*? Is it one logical change?
4. Edit as needed and commit

This gives you speed without sacrificing the quality that comes from developer judgment.

### Prompt Templates for Better AI Commits

```
Prompt: "Analyze this git diff and write a Conventional Commits message.
Requirements:
- Use format: type(scope): short description (max 72 chars)
- Add a body explaining why this change was necessary
- Note any breaking changes
- Reference the affected component/module as the scope
- Be specific about behavior changes, not just code changes

Diff:
[paste diff here]"
```

---

## Pre-Commit Hooks for Linting Commit Messages

Automated linting enforces your team's commit conventions without relying on everyone remembering the rules.

### commitlint

```bash
# Install
npm install --save-dev @commitlint/cli @commitlint/config-conventional

# Configure
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js
```

### husky Integration

```bash
# Install husky
npm install --save-dev husky

# Initialize
npx husky init

# Add commit-msg hook
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
chmod +x .husky/commit-msg
```

Now if you try to commit with a non-conforming message:

```bash
git commit -m "fix stuff"
# ⧗   input: fix stuff
# ✖   subject may not be empty [subject-empty]
# ✖   type may not be empty [type-empty]
# ✖   found 2 problems, 0 warnings
```

You're blocked until you write a proper message. For teams new to Conventional Commits, this immediate feedback loop teaches the format faster than documentation alone.

### Custom Rules

```javascript
// commitlint.config.js
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Enforce your team's scope list
    "scope-enum": [
      2,
      "always",
      ["auth", "api", "dashboard", "db", "deps", "ci", "docs"],
    ],
    // Subject line max length
    "header-max-length": [2, "always", 100],
    // Require non-empty body for certain types
    "body-min-length": [1, "always", 0],
  },
};
```

---

## Setting Up a `.gitmessage` Template

A `.gitmessage` file is loaded as the default content of your commit message editor, providing a template to fill in:

```bash
# Create the template
cat > ~/.gitmessage << 'EOF'
# type(scope): Short description (max 72 chars)
# Types: feat|fix|refactor|perf|test|docs|style|chore|ci|revert
#
# Body: Why was this change necessary? What problem does it solve?
# (Leave blank if the subject line is sufficient)
#
# Footer: References, breaking changes
# BREAKING CHANGE: description
# Fixes #123
# Closes VIC-456
EOF

# Tell git to use it
git config --global commit.template ~/.gitmessage
```

Now every `git commit` (without `-m`) opens your editor with this template. The comments are stripped from the final message.

---

## Team Conventions Checklist

Before shipping your commit message standards to your team:

- [ ] Defined list of allowed types (standard Conventional Commits + any custom)
- [ ] Defined list of scopes (or decision to allow free-form scopes)
- [ ] Subject line length limit (72 characters is standard)
- [ ] Breaking change convention (`!` suffix and/or `BREAKING CHANGE:` footer)
- [ ] Whether to require issue/ticket references
- [ ] commitlint or similar tool configured
- [ ] `.gitmessage` template shared via dotfiles repo or onboarding docs
- [ ] CI check that validates PR title (since squash merges use PR titles as commit messages)

---

## Quick Reference

```bash
# Perfect commit anatomy
feat(auth): add password reset via email link

Users who forget their password can now request a reset link via email.
The link expires after 1 hour and is single-use.

- Added /auth/reset-password endpoint
- Added PasswordResetToken model with TTL index
- Email template uses existing transactional email service

Implements #234
BREAKING CHANGE: none
```

The subject line answers: **What changed?**
The body answers: **Why did it change?**
The footer answers: **What does this connect to?**

Get all three right and your `git log` becomes the best documentation your codebase has.

---

*Use [devplaybook.cc](https://devplaybook.cc) tools to streamline your development workflow. The [devplaybook.cc/tools/git-commit-generator](https://devplaybook.cc/tools/git-commit-generator) tool can help generate Conventional Commits-formatted messages from your change descriptions.*
