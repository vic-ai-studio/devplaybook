---
title: "Git Hooks with Husky and lint-staged: The Complete Setup Guide for 2025"
description: "Learn how to set up Git hooks with Husky and lint-staged in 2025 — automate linting, formatting, and testing before commits to catch issues before they reach your repository."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["git", "husky", "lint-staged", "eslint", "prettier", "developer-tools", "automation"]
readingTime: "9 min read"
---

Every time you've caught a forgotten `console.log`, a TypeScript error, or an unformatted file in a code review — that's time you could have saved with Git hooks. They run automatically before commits, catching problems before they reach the repository.

Husky makes Git hooks easy to set up. lint-staged makes them fast by only running on changed files.

---

## What Are Git Hooks?

Git hooks are shell scripts that run at specific points in the Git workflow:

- `pre-commit`: Runs before a commit is created
- `commit-msg`: Validates the commit message format
- `pre-push`: Runs before a push
- `post-merge`: Runs after a merge

The most useful for daily development is `pre-commit` — it's the last line of defense before code enters the repo.

---

## Why Husky?

Git hooks live in `.git/hooks/` which isn't tracked by version control. This means:

- New team members don't get hooks automatically
- CI doesn't enforce the same checks as local development
- Hooks get lost when you re-clone the repo

Husky solves this by storing hooks in a tracked directory (`.husky/`) and configuring Git to look there.

---

## Why lint-staged?

Running ESLint and Prettier on your entire codebase on every commit would take 30+ seconds on a medium project. lint-staged runs linters only on files staged for commit — typically 1-5 files. The check completes in 1-2 seconds.

---

## Complete Setup

### Step 1: Install Dependencies

```bash
npm install --save-dev husky lint-staged
```

### Step 2: Initialize Husky

```bash
npx husky init
```

This creates:
- `.husky/pre-commit` — the pre-commit hook script
- Updates `package.json` with a `prepare` script

```json
// package.json — added automatically
{
  "scripts": {
    "prepare": "husky"
  }
}
```

The `prepare` script runs on `npm install`, ensuring hooks are set up for anyone who clones the repo.

### Step 3: Configure lint-staged

Add lint-staged configuration to `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx,js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss,md,json,yaml}": [
      "prettier --write"
    ]
  }
}
```

### Step 4: Configure the Pre-Commit Hook

Edit `.husky/pre-commit`:

```bash
#!/usr/bin/env sh
npx lint-staged
```

That's the complete basic setup. Now every commit automatically:
1. Finds staged `.ts`, `.tsx`, `.js`, `.jsx` files
2. Runs ESLint with auto-fix on them
3. Runs Prettier on them
4. Stages the fixed files automatically

---

## Advanced Configuration

### TypeScript Type Checking

ESLint checks style and some logic errors, but it doesn't run TypeScript's full type checker. For type safety on commit:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  },
  "scripts": {
    "type-check": "tsc --noEmit"
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
npx lint-staged
npm run type-check
```

**Caution**: `tsc --noEmit` checks your entire project, not just staged files. On large projects this adds 10-20 seconds. Consider whether this trade-off is worth it (many teams skip type-check in pre-commit and rely on CI instead).

### Commit Message Validation

Enforce [Conventional Commits](https://www.conventionalcommits.org/) format:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

```js
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional']
}
```

```bash
# Add a commit-msg hook
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
chmod +x .husky/commit-msg
```

Now commits must follow the pattern:

```
feat: add user authentication
fix: resolve null pointer in user service
docs: update API documentation
chore: upgrade dependencies
```

Invalid messages are rejected:

```bash
git commit -m "fixed stuff"
# ✖  subject may not be empty [subject-empty]
# ✖  type may not be empty [type-empty]
```

### Running Tests

For smaller test suites (< 10 seconds), running tests in pre-commit makes sense:

```bash
# .husky/pre-commit
#!/usr/bin/env sh
npx lint-staged
npm run test:related
```

```json
// package.json
{
  "scripts": {
    "test:related": "jest --findRelatedTests --passWithNoTests"
  }
}
```

`--findRelatedTests` runs only tests related to the staged files — not the full suite.

### Pre-Push Hook

For heavier checks (full test suite, build verification), use `pre-push` instead of `pre-commit`:

```bash
# .husky/pre-push
#!/usr/bin/env sh
npm run build
npm test
```

`pre-push` runs before you push to remote but after commits are created. Slower checks belong here.

---

## Configuration Per File Type

lint-staged is highly configurable. Here's a comprehensive example:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --max-warnings 0",
      "prettier --write"
    ],
    "*.{js,jsx,mjs}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{css,scss}": [
      "stylelint --fix",
      "prettier --write"
    ],
    "*.{json,yaml,yml,toml}": [
      "prettier --write"
    ],
    "*.md": [
      "prettier --write",
      "markdownlint --fix"
    ],
    "*.{png,jpg,jpeg,gif,svg}": [
      "imagemin-lint-staged"
    ]
  }
}
```

---

## Bypassing Hooks (and When It's OK)

Sometimes you need to commit without running hooks — during a work-in-progress commit, or when hooks are broken:

```bash
# Skip pre-commit hook
git commit --no-verify -m "wip: working on feature"

# Skip pre-push hook
git push --no-verify
```

This should be the exception, not the norm. If you're regularly bypassing hooks, the hooks are too slow or too strict.

---

## Common Issues and Fixes

### Hooks not running for a team member

They need to run `npm install` after pulling the repo (to trigger the `prepare` script):

```bash
npm install
```

Or run Husky directly:

```bash
npx husky
```

### ESLint auto-fix creates new changes but they're not staged

lint-staged handles this automatically — it re-stages files after running auto-fixers.

### Hooks running slowly

1. Check that lint-staged is running (not ESLint on the full project)
2. Ensure `--cache` flag is used with ESLint:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": ["eslint --fix --cache"]
  }
}
```

3. Consider moving TypeScript type-checking to CI only

### Windows line ending issues

Ensure `.husky/pre-commit` uses Unix line endings (LF, not CRLF):

```bash
git config core.autocrlf false
```

Or add to `.gitattributes`:

```
.husky/* text eol=lf
```

### Hook not executable

```bash
chmod +x .husky/pre-commit
```

---

## Full Example: React + TypeScript Project

Here's a complete setup for a typical React TypeScript project:

```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init
```

```json
// package.json
{
  "scripts": {
    "prepare": "husky",
    "lint": "eslint . --ext .ts,.tsx",
    "format": "prettier --write .",
    "type-check": "tsc --noEmit",
    "test": "jest",
    "test:related": "jest --findRelatedTests --passWithNoTests"
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix --cache",
      "prettier --write"
    ],
    "*.{css,json,md}": [
      "prettier --write"
    ]
  }
}
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
npx lint-staged
npm run test:related
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

```bash
# .husky/pre-push
#!/usr/bin/env sh
npm run type-check
```

```js
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'body-max-line-length': [0],  // No line length limit for body
  }
}
```

---

## CI Is Still Necessary

Git hooks run locally and can be bypassed. CI is your safety net. Use hooks to catch issues early and save time — but don't replace CI checks with hooks.

Your CI pipeline should still run:
- Full linting (no auto-fix)
- Full test suite
- Type checking
- Build verification

Hooks make CI fail less often by catching obvious issues before push.

---

*Find more developer tools at [DevPlaybook.cc](https://devplaybook.cc) — free online tools for [JSON formatting](https://devplaybook.cc/tools/json-formatter), [regex testing](https://devplaybook.cc/tools/regex-tester), and more.*
