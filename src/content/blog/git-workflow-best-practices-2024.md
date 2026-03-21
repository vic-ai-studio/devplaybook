---
title: "Git Workflow Best Practices: The Developer's Guide for 2024"
description: "Git workflow best practices for 2024: branching strategies, commit conventions, PR templates, code review tips, and automation that keeps teams productive."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["git", "git-workflow", "version-control", "branching-strategy", "developer-productivity", "2024"]
readingTime: "12 min read"
---

Git is the backbone of modern software development. But raw Git knowledge — knowing what `git rebase` does — is only half the equation. The other half is workflow: how your team uses Git together, how commits are structured, how code gets reviewed, and how releases are shipped. Bad workflow creates merge hell, broken builds, and frustrated engineers. Good workflow makes all of that invisible.

This guide covers the Git workflow practices that high-performing teams use in 2024, from commit conventions to branching strategies to automation.

## TL;DR

- Use Conventional Commits for consistent, machine-readable commit messages
- Choose your branching strategy based on team size and release cadence (trunk-based for most teams, Gitflow for versioned releases)
- Keep PRs small and focused — under 400 lines changed is the target
- Automate enforcement with Git hooks and CI; don't rely on humans to catch formatting issues
- Set up aliases for your most-used commands to remove friction

---

## Why Workflow Matters

Two teams can use the same Git commands and have completely different outcomes. One ships multiple times per day with confidence. The other has a deployment process that takes three engineers, a Slack thread, and a prayer.

The difference is discipline around workflow. When everyone follows the same conventions, a `git log` tells a clear story. PRs are easy to review because they are scoped. CI catches regressions before they land. Blame is useful because commits are atomic.

These aren't soft skills. They are engineering practices that compound over time. A codebase with six years of clean commit history is dramatically easier to maintain than one with six years of "fix stuff" and "WIP" commits.

---

## Commit Message Conventions

### Conventional Commits

Conventional Commits is the most widely adopted commit message standard in 2024. The format is:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

Common types:

| Type | When to use |
|------|-------------|
| `feat` | New feature for the user |
| `fix` | Bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting, missing semicolons — no logic change |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `perf` | Performance improvement |
| `test` | Adding or correcting tests |
| `chore` | Build process, dependency updates, tooling |
| `ci` | CI configuration changes |

Real examples:

```bash
feat(auth): add OAuth2 login via Google

fix(api): return 404 when user does not exist
Fixes #342

refactor(db): extract connection pool into separate module

chore(deps): upgrade express from 4.18 to 4.19
```

The payoff is significant. Tools like `semantic-release` can automatically bump version numbers and generate changelogs from Conventional Commits. Your `git log --oneline` becomes a structured changelog, not a wall of text.

### The 50/72 Rule

Even outside Conventional Commits, keep the subject line under 50 characters and wrap the body at 72. Most Git tools respect these limits. Longer subject lines get truncated in `git log --oneline` and GitHub's commit list.

```bash
# Bad
git commit -m "fixed the bug where users couldn't log in when their session expired and the refresh token was also expired"

# Good
git commit -m "fix(session): handle double-expired token gracefully"
```

### What Belongs in the Body

The body of a commit message is for the *why*, not the *what*. The diff shows what changed. The commit body should explain why the change was necessary, what alternatives were considered, and any non-obvious consequences.

```
fix(payments): retry Stripe webhook on 5xx response

Stripe occasionally returns 503 during high traffic. Without retry
logic, failed webhooks cause orders to remain in "pending" state
indefinitely. Added exponential backoff with 3 retries max.

Related to: #891
```

---

## Branching Strategies

### Trunk-Based Development

Trunk-based development (TBD) is the branching strategy used by Google, Facebook, and most high-velocity teams. The rule is simple: everyone commits to `main` frequently (at least once per day), using short-lived feature branches that last hours to days, not weeks.

```bash
# Create a short-lived feature branch
git checkout -b feat/add-search-autocomplete

# Work, commit frequently
git commit -m "feat(search): add debounced input handler"
git commit -m "feat(search): wire autocomplete dropdown component"

# Merge back same day or next day
git checkout main
git merge --no-ff feat/add-search-autocomplete
git push origin main
```

Why it works: small integrations mean small conflicts. The longer a branch lives, the more it diverges. TBD forces continuous integration in the literal sense — code is always integrating.

Use feature flags to ship incomplete features safely:

```javascript
// Behind a flag — safe to merge to main before it's complete
if (featureFlags.isEnabled('search-autocomplete', user)) {
  renderAutocomplete();
}
```

### GitHub Flow

GitHub Flow is a simplified model for teams that deploy continuously:

1. `main` is always deployable
2. Create a branch for every change
3. Open a PR and get review
4. Merge and deploy immediately

```bash
git checkout -b fix/user-avatar-upload-size-limit
# make changes
git push origin fix/user-avatar-upload-size-limit
# open PR → review → merge → deploy
```

This works well for SaaS products without strict release schedules. The rule "main is always deployable" is the key constraint that keeps the team disciplined.

### Gitflow

Gitflow is appropriate for projects that ship versioned releases (mobile apps, open-source libraries, enterprise software with scheduled deployments). It uses two permanent branches (`main` and `develop`) plus supporting branches:

- `feature/*` — new features, branch from `develop`
- `release/*` — release preparation, branch from `develop`
- `hotfix/*` — emergency fixes for production, branch from `main`

```bash
# Start a feature
git checkout develop
git checkout -b feature/add-export-csv

# Start a release
git checkout develop
git checkout -b release/2.4.0
# bump version, update changelog
git checkout main && git merge release/2.4.0
git tag -a v2.4.0 -m "Release 2.4.0"
git checkout develop && git merge release/2.4.0

# Hotfix
git checkout main
git checkout -b hotfix/fix-null-pointer-crash
# fix it
git checkout main && git merge hotfix/fix-null-pointer-crash
git checkout develop && git merge hotfix/fix-null-pointer-crash
```

The downside: Gitflow adds overhead. For most teams doing continuous deployment, it is overkill. Start with GitHub Flow or TBD and only adopt Gitflow if you have a genuine versioned release requirement.

---

## Pull Request Best Practices

### Keep PRs Small

The single most impactful PR practice is keeping them small. Studies consistently show that code review quality drops sharply as PR size increases. Over 400 lines changed, reviewers stop reading carefully.

Target: one PR, one logical change. If you caught yourself fixing an unrelated bug while working on a feature, commit the fix separately first.

```bash
# Check how large your PR will be before pushing
git diff main...HEAD --stat
```

### PR Templates

A PR template prompts the author to provide context that reviewers need. Create `.github/pull_request_template.md`:

```markdown
## What does this PR do?
<!-- 2-3 sentences describing the change -->

## Why?
<!-- Business or technical motivation -->

## How to test
<!-- Steps to verify the change works -->

## Screenshots (if UI change)

## Checklist
- [ ] Tests added or updated
- [ ] Documentation updated
- [ ] No secrets or API keys committed
- [ ] Breaking changes documented
```

### Linking Issues and PRs

Always link PRs to the issue they resolve. GitHub closes issues automatically when it sees certain keywords:

```
fix(payments): handle Stripe webhook timeout

Fixes #234
Closes #235
```

### Draft PRs

Open a draft PR early for complex changes. This invites early feedback before you've invested deeply in an approach that might need to change.

```bash
gh pr create --draft --title "feat: add real-time notifications"
```

---

## Code Review Culture

Good code review is a skill that gets better with deliberate practice. A few principles:

**Review the code, not the person.** Comments like "this function is confusing" are better than "you wrote this in a confusing way."

**Ask questions, don't just make statements.** "What happens when `user` is null here?" is better than "this will throw a null pointer exception." Maybe the author has a reason you don't know about.

**Distinguish must-fix from nice-to-have.** Use prefixes in comments:

```
# Blocking — must address before merge
[BLOCKING] This will cause a memory leak in long-running processes.

# Suggestion — take it or leave it
[NIT] Could simplify this with Array.at(-1) instead of array[array.length - 1]

# Question — genuinely curious, not blocking
[Q] Why did we choose this approach over X? Just want to understand.
```

**Approve fast, comment specifically.** Vague approvals ("LGTM!") don't help the author grow. Specific feedback — even positive — does.

---

## Git Aliases and Shortcuts

Set up aliases for the commands you run dozens of times per day:

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --decorate --all"
git config --global alias.unstage "reset HEAD --"
git config --global alias.last "log -1 HEAD"
git config --global alias.visual "!gitk"
```

A particularly useful alias is a pretty log:

```bash
git config --global alias.hist "log --pretty=format:'%h %ad | %s%d [%an]' --graph --date=short"
```

Running `git hist` gives you:

```
* a1b2c3d 2024-01-15 | feat(auth): add OAuth2 Google login (HEAD -> main) [Alice]
* d4e5f6a 2024-01-14 | fix(api): return 404 for missing users [Bob]
* g7h8i9j 2024-01-13 | chore(deps): upgrade express to 4.19 [Alice]
```

---

## Handling Merge Conflicts

Conflicts are unavoidable. The trick is resolving them cleanly.

```bash
# See which files conflict
git status

# Open your merge tool
git mergetool

# Or resolve manually — look for conflict markers
<<<<<<< HEAD
const timeout = 5000;
=======
const timeout = 3000;
>>>>>>> feature/reduce-api-timeout
```

When in doubt about what the right resolution is, talk to the other author. Don't guess at intent.

After resolving:

```bash
git add src/config.js
git commit  # Git pre-fills the merge commit message
```

Use `git log --merge` to see only the commits involved in the conflict — useful when the conflict touches a lot of files:

```bash
git log --merge --oneline
```

### Rebase vs Merge

Prefer merge for integrating long-lived branches (e.g., a release branch back into main). Prefer rebase for keeping feature branches up to date with main before opening a PR:

```bash
# Keep your feature branch up to date
git fetch origin
git rebase origin/main

# Integrate back (keep linear history)
git checkout main
git merge --no-ff feature/my-feature
```

Never rebase commits that have been pushed to a shared branch. That rewrites history and forces every team member to `git pull --force` or re-clone.

---

## Automation with Git Hooks

Git hooks run scripts at specific points in the Git lifecycle. The most useful are:

### `pre-commit`

Runs before every commit. Use it to enforce linting, run fast tests, or check for secrets:

```bash
#!/bin/sh
# .git/hooks/pre-commit
npx eslint --ext .js,.ts src/
if [ $? -ne 0 ]; then
  echo "ESLint failed. Fix errors before committing."
  exit 1
fi
```

Use `husky` to manage hooks in a team setting (so they're committed to the repo):

```bash
npm install --save-dev husky
npx husky init
echo "npx eslint --ext .js,.ts src/" > .husky/pre-commit
```

### `commit-msg`

Validates the commit message format:

```bash
#!/bin/sh
# .git/hooks/commit-msg
commit_regex='^(feat|fix|docs|style|refactor|perf|test|chore|ci)(\(.+\))?: .{1,72}'
if ! grep -qE "$commit_regex" "$1"; then
  echo "Commit message does not follow Conventional Commits format."
  echo "Example: feat(auth): add Google OAuth login"
  exit 1
fi
```

With `commitlint` and `husky`:

```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
echo "module.exports = { extends: ['@commitlint/config-conventional'] };" > commitlint.config.js
echo "npx --no -- commitlint --edit \$1" > .husky/commit-msg
```

### `pre-push`

Run the full test suite before pushing. Slower, but catches issues before they reach CI:

```bash
#!/bin/sh
# .husky/pre-push
npm test
```

---

## .gitignore Best Practices

A good `.gitignore` prevents secrets and build artifacts from ever reaching your repo.

```gitignore
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.egg-info/
__pycache__/

# Environment files — NEVER commit these
.env
.env.local
.env.*.local

# Editor artifacts
.vscode/settings.json
.idea/
*.swp
*.swo

# OS artifacts
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage
coverage/
.nyc_output/
```

Use `gitignore.io` to generate language- and framework-specific gitignore files instantly. For verifying what's actually tracked, use:

```bash
git ls-files --others --exclude-standard  # untracked files
git check-ignore -v path/to/file          # why a file is ignored
```

---

## Useful Commands Worth Memorizing

```bash
# Undo last commit but keep the changes staged
git reset --soft HEAD~1

# Undo last commit and unstage the changes
git reset HEAD~1

# Throw away all local changes (dangerous)
git reset --hard HEAD

# Temporarily save changes without committing
git stash
git stash pop                   # restore them
git stash list                  # see all stashes

# Find which commit introduced a bug (binary search)
git bisect start
git bisect bad                  # current commit is broken
git bisect good v1.2.0          # last known good tag
# Git checks out the midpoint — test it, then:
git bisect good   # or git bisect bad
# Repeat until Git finds the culprit

# See what changed in a specific commit
git show a1b2c3d

# Search through history for a string
git log -S "function calculateTax" --oneline

# Cherry-pick a single commit from another branch
git cherry-pick a1b2c3d
```

When working with UUIDs in commit messages or branch names, the [UUID Generator](/tools/uuid) can help you create consistent identifiers for tickets or changelogs. For validating branch naming patterns in hook scripts, the [Regex Tester](/tools/regex-tester) is handy for testing your patterns before baking them into automation.

---

## Summary

Good Git workflow is a force multiplier. The practices in this guide compound: clean commits make reviews faster, faster reviews mean smaller PRs, smaller PRs reduce merge conflicts, fewer conflicts means faster deployments.

Start with Conventional Commits and a simple PR template. Add pre-commit hooks to automate the low-hanging fruit. Choose the branching strategy that matches your release cadence. The rest follows naturally.

The teams that ship fastest aren't the ones who type Git commands the quickest — they're the ones whose workflow removes friction at every step.
