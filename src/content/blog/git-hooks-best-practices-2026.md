---
title: "Git Hooks Best Practices 2026: Husky, lint-staged & Commitlint"
description: "Git hooks best practices 2026: Husky v9 setup, lint-staged for fast pre-commit checks, Commitlint conventional commits, pre-push test automation, and team enforcement."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Git hooks", "Husky", "lint-staged", "Commitlint", "conventional commits", "pre-commit", "git workflow"]
readingTime: "7 min read"
category: "devops"
---

Broken CI builds, inconsistent code style, and cryptic commit messages are preventable. The cost is paid when bad code reaches CI — your team waits for a build, reviews feedback, switches context, and fixes the issue. Git hooks let you catch these problems locally, before they ever leave the developer's machine.

In 2026, the standard stack for JavaScript/TypeScript projects is Husky v9 + lint-staged + Commitlint. Each tool has a specific job. Together they enforce standards without slowing down development.

## Why Git Hooks Matter

Git fires hooks at key moments in the development workflow:

- `pre-commit` — runs before the commit is created (perfect for linting and formatting)
- `commit-msg` — validates the commit message format
- `pre-push` — runs before `git push` (good for running the test suite)

Without hooks, these checks only happen in CI — which means feedback is delayed by minutes, developers have already switched context, and fixing the issue requires another commit. Hooks make the feedback loop immediate.

The challenge: raw Git hooks live in `.git/hooks/`, which isn't tracked by version control. Every developer has to set them up manually. Husky solves this.

## Husky v9: Setup

Husky v9 (released late 2023) significantly simplified the setup compared to v8. There's no `.huskyrc.js` or `husky.config.js` — each hook is its own file in `.husky/`.

```bash
# Initialize Husky
npx husky init
```

This creates a `.husky/` directory with a sample `pre-commit` hook and adds a `prepare` script to `package.json`:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

The `prepare` script runs automatically on `npm install`, so every developer who clones the repo gets hooks installed with no extra steps.

The `.husky/` directory is committed to version control — hooks are shared across the whole team automatically.

## lint-staged: Fast Pre-Commit Checks

Running ESLint and Prettier on your entire codebase before every commit is too slow. lint-staged solves this by running configured commands only on files that are staged for commit.

```bash
npm install -D lint-staged
```

Configure in `package.json`:

```json
{
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{js,jsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yml,yaml}": [
      "prettier --write"
    ],
    "*.css": [
      "prettier --write"
    ]
  }
}
```

Update `.husky/pre-commit` to run lint-staged:

```bash
#!/usr/bin/env sh
npx lint-staged
```

Now when you `git commit`, lint-staged runs ESLint and Prettier only on your changed files. A commit touching 3 files takes ~1 second, not 30.

**Handling lint errors:** If ESLint finds errors it can't auto-fix, lint-staged exits with a non-zero code and the commit is blocked. The developer sees the errors immediately and fixes them before the commit is created.

```bash
# Example output when lint fails
✔ Preparing lint-staged...
❯ Running tasks for staged files...
  ❯ package.json — 2 files
    ✖ *.{ts,tsx} — 1 file
      ✖ eslint --fix
        src/utils/parser.ts
          3:7  error  'result' is assigned a value but never used  no-unused-vars
✗ lint-staged failed due to a git error.
```

## Commitlint: Enforcing Commit Message Format

Inconsistent commit messages make `git log` useless and block automated changelog generation. Commitlint validates commit messages against a convention — typically [Conventional Commits](https://www.conventionalcommits.org/).

```bash
npm install -D @commitlint/cli @commitlint/config-conventional
```

Create `commitlint.config.ts`:

```ts
import type { UserConfig } from '@commitlint/types';

const config: UserConfig = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'ci', 'revert'],
    ],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-max-length': [2, 'always', 100],
    'body-max-line-length': [2, 'always', 120],
  },
};

export default config;
```

Add the `commit-msg` hook:

```bash
# .husky/commit-msg
#!/usr/bin/env sh
npx --no -- commitlint --edit "$1"
```

## Conventional Commits Format

The convention is straightforward:

```
<type>(<optional scope>): <description>

[optional body]

[optional footer(s)]
```

**Valid examples:**

```
feat(auth): add OAuth2 Google login
fix(api): handle null response from user endpoint
docs: update API authentication guide
refactor(utils): extract date formatting into shared helper
test(auth): add unit tests for token refresh logic
chore(deps): upgrade TypeScript to 5.8
perf(db): add index on users.email column
ci: add SonarQube quality gate to PR workflow
```

**Invalid examples (Commitlint rejects):**

```
Fixed bug                    # no type
feat: Added New Feature      # sentence case
WIP                          # no type, no description
Update stuff                 # no type
```

The `scope` in parentheses is optional but recommended for larger codebases — it helps readers quickly understand which module or feature changed.

## Pre-Push: Running Tests Before Push

A pre-push hook is the right place to run your test suite. It's slower than pre-commit checks, but it runs only when you're ready to share code with the team.

```bash
# .husky/pre-push
#!/usr/bin/env sh
npm test -- --run
```

For Vitest (`--run` disables watch mode):
```bash
npx vitest run
```

For Jest:
```bash
npx jest --passWithNoTests
```

If you want to run only tests related to changed files (faster):
```bash
# .husky/pre-push
#!/usr/bin/env sh
npx vitest run --changed HEAD~1
```

**Note:** Pre-push hooks run synchronously, blocking the push. Keep test suites fast. If your full test suite takes more than 2 minutes, consider running only unit tests in the hook and leaving integration tests to CI.

## CHANGELOG Generation with standard-version

With Conventional Commits in place, you can automatically generate changelogs.

```bash
npm install -D standard-version
```

Add to `package.json`:

```json
{
  "scripts": {
    "release": "standard-version",
    "release:minor": "standard-version --release-as minor",
    "release:major": "standard-version --release-as major"
  }
}
```

Running `npm run release` will:
1. Bump the version in `package.json` based on commit types (`feat` → minor, `fix` → patch)
2. Generate/update `CHANGELOG.md` with categorized commit messages
3. Create a git tag

Generated `CHANGELOG.md` excerpt:

```markdown
## [2.4.0] - 2026-04-02

### Features
* **auth:** add OAuth2 Google login (#142)
* **dashboard:** add real-time activity feed (#138)

### Bug Fixes
* **api:** handle null response from user endpoint (#145)
* **auth:** fix token refresh race condition (#143)

### Performance Improvements
* **db:** add index on users.email column (#141)
```

## Team Enforcement and Onboarding

The key to hooks working for a team is making setup automatic. The `prepare` script in `package.json` handles this:

```json
{
  "scripts": {
    "prepare": "husky"
  }
}
```

When a new developer runs `npm install` after cloning the repo, `prepare` runs automatically and installs the hooks. No documentation required, no manual steps to forget.

For CI environments where you don't want hooks running, set:

```bash
# In CI environment variables
HUSKY=0
```

Or in CI scripts:

```bash
npm ci --ignore-scripts  # skips prepare entirely
```

## Bypassing with --no-verify

Hooks can be bypassed with the `--no-verify` flag:

```bash
git commit --no-verify -m "WIP: quick save before meeting"
git push --no-verify
```

When is this acceptable?

- Committing a genuine work-in-progress that you plan to squash before merge
- Emergency hotfix where time is critical and you're certain about the change
- The hook is broken and blocking a legitimate commit (fix the hook next)

When it's **not** acceptable:

- Bypassing because the linter found real errors you want to skip
- Bypassing Commitlint to avoid writing a proper message
- Using `--no-verify` as a habit because hooks feel inconvenient

The `--no-verify` flag is an escape hatch, not a workflow. If developers routinely bypass hooks, the enforcement is broken — investigate whether the checks are too slow or too strict.

## Complete `.husky/` Directory Structure

```
.husky/
├── _/
│   └── husky.sh       # Husky internals (don't edit)
├── pre-commit         # lint-staged
├── commit-msg         # Commitlint
└── pre-push           # test runner
```

## Putting It All Together

Full setup from scratch:

```bash
# 1. Install tools
npm install -D husky lint-staged @commitlint/cli @commitlint/config-conventional standard-version

# 2. Initialize Husky
npx husky init

# 3. Write hooks
echo 'npx lint-staged' > .husky/pre-commit
echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
echo 'npx vitest run' > .husky/pre-push

# 4. Make hooks executable
chmod +x .husky/pre-commit .husky/commit-msg .husky/pre-push

# 5. Commit everything
git add .husky package.json commitlint.config.ts
git commit -m "chore: add Husky, lint-staged, and Commitlint"
```

Done. Every developer who clones and installs will get the same hooks automatically.

## Conclusion

Git hooks don't slow down development — broken CI builds do. A pre-commit hook that runs in 1 second catches ESLint errors that would otherwise require a 5-minute CI cycle, a context switch, and a fixup commit. Commitlint turns your git log from a mess of "fix stuff" into structured, searchable history. The one-time setup cost of an hour pays off in every commit thereafter.
