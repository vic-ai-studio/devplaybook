---
title: "Conventional Commits and Commitlint: Complete Guide 2026"
description: "Master Conventional Commits and commitlint to automate changelogs, semantic versioning, and release workflows. Covers setup, configuration, CI/CD integration, and the full commitlint toolchain with real .commitlintrc examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["conventional-commits", "commitlint", "git", "changelog", "semantic-versioning", "automation", "ci-cd", "code-quality", "developer-tools"]
readingTime: "10 min read"
---

Every time a developer writes `git commit -m "fix stuff"`, a changelog entry dies. Conventional Commits is the structured commit message format that makes automated changelogs, semantic versioning, and release automation actually work. Commitlint enforces it.

This guide covers the complete setup: from understanding the format to enforcing it in CI and wiring it to auto-changelog generation.

---

## What Are Conventional Commits?

[Conventional Commits](https://www.conventionalcommits.org) is a specification that adds structure to commit messages. Instead of freeform messages, every commit follows this pattern:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Real examples:**
```
feat: add OAuth2 login support
fix: prevent crash when user object is null
docs: update API authentication guide
feat(auth): implement JWT refresh token rotation
fix(api)!: change response format for /users endpoint
```

That `!` after the scope means a **breaking change**. You can also note it in the footer:

```
feat(api)!: redesign authentication endpoints

BREAKING CHANGE: The /auth/login endpoint now returns { token, refreshToken }
instead of { accessToken }. Update all client implementations.
```

---

## The Commit Types

The spec defines a few core types; most teams extend these:

| Type | When to use | Version bump |
|------|-------------|-------------|
| `feat` | New feature | minor |
| `fix` | Bug fix | patch |
| `docs` | Documentation only | none |
| `style` | Formatting, no logic change | none |
| `refactor` | Refactor, no fix or feature | none |
| `perf` | Performance improvement | patch |
| `test` | Adding or fixing tests | none |
| `build` | Build system changes | none |
| `ci` | CI configuration changes | none |
| `chore` | Maintenance tasks | none |
| `revert` | Revert a previous commit | patch |
| `BREAKING CHANGE` | Breaking change (via `!` or footer) | major |

---

## Why It Matters

With structured commits, tooling can derive semantic version bumps automatically:

- `fix:` → patch bump (1.0.0 → 1.0.1)
- `feat:` → minor bump (1.0.0 → 1.1.0)
- `feat!:` or `BREAKING CHANGE` → major bump (1.0.0 → 2.0.0)

This powers:
- **Automated changelogs** (Changesets, Semantic Release, Release Please)
- **GitHub release notes** generation
- **PR filtering** — instantly understand what a PR changes
- **Code review** — each commit has clear intent

---

## Installing Commitlint

[Commitlint](https://commitlint.js.org) validates commit messages against the Conventional Commits spec (or your custom rules).

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

**Basic `.commitlintrc.json`:**
```json
{
  "extends": ["@commitlint/config-conventional"]
}
```

**Or as `.commitlintrc.js` (more flexible):**
```js
/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce scope for specific types
    'scope-enum': [
      2,
      'always',
      ['api', 'auth', 'ui', 'db', 'core', 'deps', 'ci']
    ],
    // Limit subject line to 100 chars
    'header-max-length': [2, 'always', 100],
    // Allow subject line to start with uppercase
    'subject-case': [0]
  }
};
```

**Test a message manually:**
```bash
echo "feat(auth): add OAuth2 support" | npx commitlint
echo "fixed stuff" | npx commitlint  # this should fail
```

---

## Git Hook Integration

Commitlint is most useful as a `commit-msg` git hook — it runs before the commit is created, blocking bad messages.

### With Husky

```bash
npx husky init
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
chmod +x .husky/commit-msg
```

### With Lefthook (recommended)

```yaml
# lefthook.yml
commit-msg:
  commands:
    commitlint:
      run: npx commitlint --edit {1}
```

### With pre-commit

```yaml
# .pre-commit-config.yaml
repos:
  - repo: https://github.com/alessandrojcm/commitlint-pre-commit-hook
    rev: v9.16.0
    hooks:
      - id: commitlint
        stages: [commit-msg]
        additional_dependencies:
          - '@commitlint/config-conventional@18.0.0'
```

---

## Advanced Commitlint Configuration

### Custom Types

```js
// .commitlintrc.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
        // Custom types
        'wip',
        'security',
        'i18n',
        'a11y'
      ]
    ]
  }
};
```

### Monorepo Scopes (auto-generate from packages)

```js
// commitlint.config.js
const { readdirSync } = require('fs');
const { join } = require('path');

// Auto-generate scopes from packages directory
const packagesDir = join(__dirname, 'packages');
const packages = readdirSync(packagesDir, { withFileTypes: true })
  .filter(d => d.isDirectory())
  .map(d => d.name);

module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [2, 'always', [...packages, 'deps', 'ci', 'config']]
  }
};
```

### Prompt for Commitlint (interactive commits)

```bash
npm install --save-dev @commitlint/prompt-cli
```

```json
// package.json
{
  "scripts": {
    "commit": "commit"
  }
}
```

Run `npm run commit` for an interactive prompt that guides you through the conventional format.

---

## Commitizen — The Interactive Alternative

[Commitizen](https://github.com/commitizen/cz-cli) provides an interactive CLI for writing conventional commits. Pair it with commitlint (Commitizen writes the message, commitlint validates it).

```bash
npm install --save-dev commitizen cz-conventional-changelog
npx commitizen init cz-conventional-changelog --save-dev --save-exact
```

**`.czrc` or `package.json` config:**
```json
{
  "config": {
    "commitizen": {
      "path": "./node_modules/cz-conventional-changelog"
    }
  }
}
```

Run `npx cz` (or `git cz` if using the global install) instead of `git commit`:

```
? Select the type of change that you're committing:
❯ feat:     A new feature
  fix:      A bug fix
  docs:     Documentation only changes
  style:    Changes that do not affect the meaning of the code
  refactor: A code change that neither fixes a bug nor adds a feature
  perf:     A code change that improves performance
  test:     Adding missing tests or correcting existing tests
```

---

## CI Validation

Enforce Conventional Commits on every PR, not just locally.

**GitHub Actions:**
```yaml
name: Commitlint

on:
  pull_request:
    branches: [main, develop]

jobs:
  commitlint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0  # Required: needs full history
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npx commitlint --from ${{ github.event.pull_request.base.sha }} --to ${{ github.event.pull_request.head.sha }} --verbose
```

This validates every commit in the PR, not just the latest one.

**Squash merge strategy (simpler):**

If your team squash-merges PRs, you only need to validate the PR title (which becomes the squash commit message):

```yaml
- uses: amannn/action-semantic-pull-request@v5
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

---

## Auto-Changelog Generation

With Conventional Commits enforced, you can generate changelogs automatically.

### `conventional-changelog-cli`

```bash
npm install --save-dev conventional-changelog-cli
```

```json
// package.json
{
  "scripts": {
    "changelog": "conventional-changelog -p conventionalcommits -i CHANGELOG.md -s"
  }
}
```

Run `npm run changelog` to append new entries since the last tag.

**Generated `CHANGELOG.md` output:**
```markdown
# Changelog

## [2.1.0](https://github.com/myorg/myrepo/compare/v2.0.0...v2.1.0) (2026-03-28)

### Features

* **auth:** implement JWT refresh token rotation ([a1b2c3d](commit-url))
* add bulk user import via CSV ([e4f5g6h](commit-url))

### Bug Fixes

* prevent crash when user profile is incomplete ([i7j8k9l](commit-url))
* **api:** correct pagination offset calculation ([m1n2o3p](commit-url))
```

### Integration with Release Tools

Commitlint + Conventional Commits is the prerequisite for:

- **Semantic Release** — reads commits to determine version bump
- **Release Please** (Google) — creates release PRs from commit history
- **Changesets** — optional complement for monorepos (human-written change descriptions)

See the [Changesets vs Semantic Release vs Release Please comparison](/blog/changesets-vs-semantic-release-vs-release-please-monorepo-2026) for the full release automation guide.

---

## Team Adoption Tips

Conventional Commits fails if the team doesn't adopt it. Here's what works:

1. **Make it easy**: add `npm run commit` (Commitizen) so developers can write commits interactively
2. **Enforce at CI level**: validate on PR, not just locally (local hooks can be bypassed with `--no-verify`)
3. **Document scope values**: a list of valid scopes in your `CONTRIBUTING.md` removes guesswork
4. **Show the value early**: generate the first automated changelog manually to demonstrate the payoff
5. **Allow escape hatches**: `chore:` and `docs:` types let developers commit minor work without overthinking

---

## Quick Reference: Valid Commit Messages

```bash
# Feature
git commit -m "feat: add dark mode support"
git commit -m "feat(ui): implement responsive navigation menu"

# Bug fix
git commit -m "fix: handle empty state in user list"
git commit -m "fix(api): correct 404 response format"

# Breaking change
git commit -m "feat!: redesign authentication API"
git commit -m "feat(auth)!: migrate from sessions to JWT"

# Documentation
git commit -m "docs: add API authentication examples"
git commit -m "docs(readme): update installation instructions"

# Maintenance
git commit -m "chore: update dependencies"
git commit -m "ci: add lint step to GitHub Actions workflow"
git commit -m "test: add unit tests for user service"

# With body
git commit -m "fix(db): resolve connection pool exhaustion

Connection pool was not releasing connections after failed queries.
Added explicit finally block to ensure cleanup.

Closes #247"
```

---

*Related: [Git Hooks Manager Comparison 2026](/blog/lefthook-vs-husky-vs-pre-commit-git-hooks-2026) | [Release Automation: Changesets vs Semantic Release vs Release Please](/blog/changesets-vs-semantic-release-vs-release-please-monorepo-2026)*
