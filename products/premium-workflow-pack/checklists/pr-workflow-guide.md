# PR Workflow Guide

A repeatable, team-friendly process for creating and reviewing pull requests.

---

## Branch Naming Convention

```
<type>/<ticket-id>-<short-description>

feat/PROJ-123-add-user-avatar
fix/PROJ-456-cart-total-overflow
chore/PROJ-789-upgrade-prisma-v5
docs/PROJ-012-update-api-readme
refactor/PROJ-345-extract-payment-service
```

**Types:** `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`, `hotfix`

---

## Commit Message Convention (Conventional Commits)

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

**Examples:**
```
feat(auth): add OAuth2 Google login

fix(cart): correct subtotal calculation when applying discount codes

Closes #234

chore(deps): upgrade Next.js from 13.5 to 14.2

docs(api): add rate limiting section to README

feat!: rename endpoint /users/:id to /users/:userId

BREAKING CHANGE: all references to :id in /users routes must be updated
```

**Types and their effect on versioning:**
| Type | Version bump | Use for |
|------|-------------|---------|
| `feat` | minor | New features |
| `fix` | patch | Bug fixes |
| `feat!` or `BREAKING CHANGE` | major | Breaking changes |
| `chore`, `docs`, `style`, `test`, `ci` | none | Non-production changes |

---

## PR Creation Checklist (Author)

Before opening a PR:

```markdown
[ ] Branch is up to date with main/develop
[ ] CI is green (tests, lint, type-check)
[ ] Self-reviewed the diff — read every line you changed
[ ] Removed all debug code, console.logs, commented-out code
[ ] PR description filled out (see template below)
[ ] Screenshots or screen recordings attached (for UI changes)
[ ] Breaking changes documented
[ ] Related issues linked
```

---

## PR Description Template

Copy this into your PR description:

```markdown
## What

<!-- One-paragraph summary of what this PR does -->

## Why

<!-- The problem this solves or the feature it enables -->

## How

<!-- Key implementation decisions. Link to architecture docs if complex -->

## Testing

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manually tested on staging

## Screenshots (if UI change)

<!-- Before / After screenshots or recording -->

## Related Issues

Closes #<issue-number>

## Breaking Changes

<!-- List any breaking changes. None if not applicable -->

## Deployment Notes

<!-- Any manual steps, migrations, or config changes needed? -->
```

---

## Review Workflow

### SLA (Service Level Agreement)

| PR size | Review within | Description |
|---------|--------------|-------------|
| Small (<200 lines) | 1 business day | Quick bug fix, small feature |
| Medium (200-500 lines) | 2 business days | Feature, moderate refactor |
| Large (500+ lines) | 3 business days | Major feature, architecture change |

**Tip:** Large PRs should be split into smaller, stackable PRs whenever possible.

### Reviewer Responsibilities

1. **Understand before critiquing** — ask questions if the intent is unclear
2. **Distinguish blocking vs. non-blocking** feedback using prefixes (`issue:`, `nit:`, `q:`)
3. **Approve when ready** — don't hold PRs for style preferences after issues are resolved
4. **Re-review promptly** after author addresses feedback (same-day ideal)

### Author Responsibilities

1. **Respond to all `issue:` comments** before re-requesting review
2. **Explain if not implementing** — "Chose X over Y because..." is valid
3. **Mark resolved conversations** only after fixing (not before)
4. **Don't push more features** while PR is in review

---

## Merge Strategy

| Strategy | When to use |
|----------|-------------|
| **Squash merge** | Default — clean history, one commit per feature |
| **Merge commit** | Multi-commit PRs where commit history adds value |
| **Rebase** | Maintaining linear history in high-discipline teams |

**Recommended:** Squash merge + conventional commit message for the squash commit.

---

## Hotfix Process

For production emergencies:

```bash
# 1. Branch from main (never from develop)
git checkout main
git pull
git checkout -b hotfix/PROJ-999-fix-critical-payment-bug

# 2. Fix, test, commit
git commit -m "fix(payment): prevent negative total on refund overflow"

# 3. Open PR directly to main with "hotfix" label
# 4. Get minimum 1 approval (expedited review)
# 5. Merge to main
# 6. Tag the release
git tag v1.2.1
git push origin v1.2.1

# 7. Backport to develop
git checkout develop
git merge main
```

---

## Stacked PRs

For large features that should ship incrementally:

```
main ← PR-1 (data model) ← PR-2 (API) ← PR-3 (UI) ← PR-4 (tests)
```

- Each PR is reviewable independently
- Later PRs are based on earlier ones
- Merge in order; rebase later PRs after earlier ones merge
- Use draft PRs for PRs that depend on unmerged work
