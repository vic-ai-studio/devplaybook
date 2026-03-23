# Code Review Tracker

> Track every pull request from creation to merge. Monitor review times, feedback rounds, and approval workflows.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| PR Title | Title | — |
| PR Number | Number | GitHub/GitLab PR number |
| Status | Select | `Draft`, `Open`, `Pending Review`, `Changes Requested`, `Approved`, `Merged`, `Closed` |
| Author | Person | PR creator |
| Reviewers | Person | Multi-select — assigned reviewers |
| Repository | Select | Your repos, e.g., `frontend`, `backend`, `mobile`, `infra`, `shared-libs` |
| Branch | Text | e.g., `feature/TASK-142-oauth` |
| Target Branch | Select | `main`, `develop`, `staging`, `release/v2.0` |
| PR URL | URL | Link to GitHub/GitLab PR |
| Sprint Task | Relation | Links to → Sprint Board |
| Related Bug | Relation | Links to → Bug Tracker |
| Type | Select | `Feature` (blue), `Bug Fix` (red), `Refactor` (purple), `Hotfix` (orange), `Chore` (gray), `Docs` (green) |
| Size | Select | `XS (1-10 lines)`, `S (11-50)`, `M (51-200)`, `L (201-500)`, `XL (500+)` |
| Lines Added | Number | — |
| Lines Removed | Number | — |
| Files Changed | Number | — |
| Review Rounds | Number | How many rounds of feedback |
| Date Created | Date | When PR was opened |
| Date First Review | Date | When first review was submitted |
| Date Approved | Date | When final approval was given |
| Date Merged | Date | When PR was merged |
| Time to First Review | Formula | `if(prop("Date First Review"), dateBetween(prop("Date First Review"), prop("Date Created"), "hours"), 0)` |
| Time to Merge | Formula | `if(prop("Date Merged"), dateBetween(prop("Date Merged"), prop("Date Created"), "hours"), 0)` |
| Review Efficiency | Formula | `if(prop("Review Rounds") > 0, if(prop("Review Rounds") == 1, "First-pass approval", if(prop("Review Rounds") == 2, "Normal", "Needs improvement")), "")` |
| CI Status | Select | `Passing`, `Failing`, `Pending`, `Skipped` |
| Has Breaking Changes | Checkbox | — |
| Has Migration | Checkbox | — |
| Test Coverage | Select | `Increased`, `Same`, `Decreased`, `No Tests` |
| Review Notes | Text (rich) | Summary of review feedback |
| Labels | Multi-select | `needs-design-review`, `needs-security-review`, `needs-qa`, `do-not-merge`, `auto-merge`, `breaking-change` |

---

## Views

### 1. Review Queue (Default — Board View)

- **Group by:** Status
- **Filter:** Status is not `Merged`, Status is not `Closed`
- **Sort:** Date Created ascending (oldest first = most urgent)
- **Card properties:** PR Title, Author, Reviewers, Repository, Size, Time to First Review
- **Column order:** Draft → Open → Pending Review → Changes Requested → Approved

### 2. My Reviews (Table View)

- **Filter:** Reviewers contains [Current User], Status is not `Merged`, Status is not `Closed`
- **Sort:** Date Created ascending
- **Columns:** PR Title, Status, Author, Repository, Size, Date Created, Time to First Review

### 3. My PRs (Table View)

- **Filter:** Author is [Current User]
- **Sort:** Date Created descending
- **Columns:** PR Title, Status, Reviewers, Repository, Review Rounds, Time to Merge, Date Created

### 4. Merged This Sprint (Table View)

- **Filter:** Status is `Merged`, Date Merged is within `[Current Sprint dates]`
- **Sort:** Date Merged descending
- **Columns:** PR Title, Author, Repository, Size, Lines Added, Lines Removed, Review Rounds, Time to Merge

### 5. Review Metrics (Table View)

- **Group by:** Author
- **Show calculations:** Average Time to First Review, Average Time to Merge, Average Review Rounds
- **Filter:** Date Merged is within last 30 days

### 6. Stale PRs (Table View)

- **Filter:** Status is not `Merged` AND Status is not `Closed` AND Date Created is before 7 days ago
- **Sort:** Date Created ascending
- **Columns:** PR Title, Status, Author, Reviewers, Date Created, Days Open

### 7. By Repository (Board View)

- **Group by:** Repository
- **Filter:** Status is not `Merged`, Status is not `Closed`
- **Sub-sort:** Date Created ascending

---

## Formulas

### Time to First Review (hours)
```
if(
  prop("Date First Review"),
  dateBetween(prop("Date First Review"), prop("Date Created"), "hours"),
  0
)
```

### Time to Merge (hours)
```
if(
  prop("Date Merged"),
  dateBetween(prop("Date Merged"), prop("Date Created"), "hours"),
  0
)
```

### Review Efficiency
```
if(
  prop("Review Rounds") > 0,
  if(
    prop("Review Rounds") == 1,
    "First-pass approval",
    if(
      prop("Review Rounds") == 2,
      "Normal",
      "Needs improvement"
    )
  ),
  ""
)
```

### Net Lines Changed
```
prop("Lines Added") - prop("Lines Removed")
```

---

## Relations

| This Database | Related To | Relation Name | Purpose |
|---------------|-----------|---------------|---------|
| Code Review Tracker | Sprint Board | Sprint Task | The task this PR implements |
| Code Review Tracker | Bug Tracker | Related Bug | The bug this PR fixes |

---

## Sample Data

| PR Title | Status | Author | Reviewers | Repository | Size | Review Rounds | Type |
|----------|--------|--------|-----------|------------|------|---------------|------|
| Add OAuth2 PKCE authentication flow | Pending Review | @sarah | @mike, @alex | backend | L | 0 | Feature |
| Fix memory leak in WS connection pool | Approved | @sarah | @jordan | backend | M | 1 | Bug Fix |
| Redesign settings page components | Changes Requested | @mike | @sarah, @jordan | frontend | XL | 2 | Feature |
| Update API v2 rate limiting middleware | Pending Review | @mike | @alex | backend | S | 0 | Feature |
| Migrate user schema with zero downtime | Draft | @alex | — | backend | L | 0 | Refactor |
| Add E2E tests for checkout flow | Merged | @jordan | @sarah | frontend | M | 1 | Chore |
| Fix Safari 17.4 SSO login regression | Merged | @sarah | @mike | frontend | XS | 1 | Hotfix |
| Refactor error handling to use Result type | Pending Review | @alex | @sarah, @mike | shared-libs | L | 0 | Refactor |

---

## Code Review Checklist Template

When reviewing a PR, use this checklist in the Review Notes:

```
## Review Checklist

### Code Quality
- [ ] Code is readable and well-structured
- [ ] No unnecessary complexity or over-engineering
- [ ] Functions/methods are focused (single responsibility)
- [ ] Variable and function names are clear and descriptive

### Correctness
- [ ] Logic handles edge cases (null, empty, boundary values)
- [ ] Error handling is appropriate (no swallowed errors)
- [ ] No race conditions or concurrency issues
- [ ] Database queries are efficient (no N+1, proper indexes)

### Testing
- [ ] Unit tests cover new/changed logic
- [ ] Integration tests for API endpoints
- [ ] Edge cases are tested
- [ ] Test names clearly describe what is being tested

### Security
- [ ] No hardcoded secrets or credentials
- [ ] Input validation and sanitization
- [ ] Authentication/authorization checks in place
- [ ] No SQL injection or XSS vulnerabilities

### Performance
- [ ] No unnecessary API calls or database queries
- [ ] Large data sets are paginated
- [ ] Caching is used where appropriate
- [ ] No memory leaks (event listeners cleaned up, subscriptions unsubscribed)

### Documentation
- [ ] Public APIs have JSDoc/docstring comments
- [ ] README updated if needed
- [ ] Breaking changes documented
- [ ] Migration guide provided if applicable
```

---

## Usage Instructions

1. **Opening a PR:** Create a new entry when you open a PR. Fill in Author, Repository, Branch, PR URL, and link the Sprint Task.
2. **Requesting review:** Set Status to `Pending Review` and add Reviewers.
3. **Reviewing:** Use the "My Reviews" view. After reviewing, update Status to `Approved` or `Changes Requested`. Increment Review Rounds.
4. **Merging:** Set Status to `Merged`, fill Date Merged. The Time to Merge formula auto-calculates.
5. **Metrics:** Check the "Review Metrics" view weekly. Aim for < 4h Time to First Review and < 2 Review Rounds average.
6. **Stale PRs:** Check the "Stale PRs" view daily. Follow up on PRs open > 7 days.
