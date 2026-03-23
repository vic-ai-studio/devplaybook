# Bug Tracker

> Track every bug from report to resolution. Triage by severity, assign to team members, and link bugs to sprints and PRs.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| Bug Title | Title | — |
| Bug ID | Unique ID | Prefix: `BUG-`, auto-increment |
| Status | Select | `New`, `Triaged`, `In Progress`, `In Review`, `Resolved`, `Closed`, `Won't Fix` |
| Severity | Select | `Critical` (red), `High` (orange), `Medium` (yellow), `Low` (gray) |
| Priority | Select | `P0 - Immediate`, `P1 - Next Sprint`, `P2 - Backlog`, `P3 - Nice to Have` |
| Assignee | Person | Multi-select people |
| Reporter | Person | Single person |
| Environment | Multi-select | `Production`, `Staging`, `Development`, `CI/CD` |
| Platform | Multi-select | `Web`, `iOS`, `Android`, `API`, `Desktop`, `CLI` |
| Component | Select | `Frontend`, `Backend`, `Database`, `Auth`, `Payments`, `Infra`, `DevOps` |
| Sprint | Relation | Links to → Sprint Board database |
| Related PR | Relation | Links to → Code Review Tracker database |
| Reproduction Steps | Text (rich) | — |
| Expected Behavior | Text (rich) | — |
| Actual Behavior | Text (rich) | — |
| Stack Trace | Code block | — |
| Screenshot | Files & media | — |
| Browser/Version | Text | e.g., "Chrome 122, Firefox 123" |
| Git Branch | Text | e.g., "fix/BUG-142-memory-leak" |
| Root Cause | Text (rich) | Filled after resolution |
| Resolution | Text (rich) | What was done to fix it |
| Date Reported | Date | Auto-filled on creation |
| Date Resolved | Date | Manually set when resolved |
| Time to Resolution | Formula | `if(prop("Date Resolved"), dateBetween(prop("Date Resolved"), prop("Date Reported"), "hours"), 0)` |
| SLA Breached | Formula | `if(prop("Severity") == "Critical" and prop("Time to Resolution") > 4, true, if(prop("Severity") == "High" and prop("Time to Resolution") > 24, true, false))` |
| GitHub Issue # | Number | For sync with GitHub |
| GitHub URL | URL | Link to GitHub issue |
| Tags | Multi-select | `regression`, `flaky-test`, `performance`, `security`, `ux`, `data-loss`, `accessibility` |

---

## Views

### 1. Triage Board (Default — Board View)

- **Group by:** Status
- **Sort:** Severity (Critical first), then Priority
- **Filter:** Status is not `Closed` and Status is not `Won't Fix`
- **Columns visible:** Bug Title, Severity, Priority, Assignee, Date Reported
- **Card preview:** Show Severity color dot

### 2. My Bugs (Table View)

- **Filter:** Assignee contains [Current User]
- **Sort:** Priority ascending, then Date Reported descending
- **Columns:** Bug Title, Status, Severity, Priority, Component, Date Reported, Time to Resolution

### 3. Critical & High Bugs (Table View)

- **Filter:** Severity is `Critical` OR Severity is `High`, AND Status is not `Closed`
- **Sort:** Severity ascending, Date Reported ascending
- **Columns:** Bug Title, Status, Severity, Assignee, Environment, Date Reported

### 4. Bugs by Component (Board View)

- **Group by:** Component
- **Filter:** Status is not `Closed`
- **Sub-sort:** Severity descending

### 5. Resolution Timeline (Timeline View)

- **Timeline by:** Date Reported → Date Resolved
- **Filter:** Date Resolved is not empty
- **Group by:** Component

### 6. Bug Metrics (Table View)

- **Group by:** Severity
- **Show calculation row:** Count per group
- **Filter:** Date Reported is within last 30 days

---

## Formulas

### Time to Resolution (hours)
```
if(
  prop("Date Resolved"),
  dateBetween(prop("Date Resolved"), prop("Date Reported"), "hours"),
  0
)
```

### SLA Breached
```
if(
  prop("Severity") == "Critical" and prop("Time to Resolution") > 4,
  true,
  if(
    prop("Severity") == "High" and prop("Time to Resolution") > 24,
    true,
    if(
      prop("Severity") == "Medium" and prop("Time to Resolution") > 72,
      true,
      false
    )
  )
)
```

### Days Open
```
if(
  prop("Status") != "Closed" and prop("Status") != "Resolved",
  dateBetween(now(), prop("Date Reported"), "days"),
  0
)
```

---

## Relations

| This Database | Related To | Relation Name | Purpose |
|---------------|-----------|---------------|---------|
| Bug Tracker | Sprint Board | Sprint | Which sprint this bug is assigned to |
| Bug Tracker | Code Review Tracker | Related PR | The PR that fixes this bug |

---

## Sample Data

| Bug Title | Status | Severity | Priority | Assignee | Component | Environment |
|-----------|--------|----------|----------|----------|-----------|-------------|
| Login fails with SSO on Safari 17.4 | Triaged | High | P0 | @sarah | Auth | Production |
| Dashboard charts render blank on mobile | In Progress | Medium | P1 | @mike | Frontend | Production |
| API rate limiter allows burst above 1000 req/s | New | Critical | P0 | — | Backend | Staging |
| CSV export missing UTF-8 BOM header | Triaged | Low | P2 | @alex | Backend | Production |
| Flaky test: user_signup_flow intermittent timeout | In Progress | Medium | P1 | @jordan | CI/CD | CI/CD |
| Memory leak in WebSocket connection pool | In Progress | High | P0 | @sarah | Backend | Production |
| Dark mode toggle doesn't persist on refresh | New | Low | P3 | — | Frontend | Development |
| Password reset email sent twice occasionally | Triaged | Medium | P2 | @mike | Auth | Production |

---

## Bug Report Template (Page Content)

When creating a new bug, use this template for the page body:

```
## Reproduction Steps
1. Go to [page/feature]
2. Click [button/action]
3. Observe [unexpected behavior]

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Stack Trace / Error Log
```code
[Paste error output here]
```

## Screenshots / Video
[Attach files]

## Environment Details
- Browser:
- OS:
- App Version:
- User Role:

## Additional Context
[Any other relevant information]
```

---

## Usage Instructions

1. **Creating a bug:** Click `+ New` in any view. Fill in Title, Severity, Priority, Component, and Environment at minimum.
2. **Triaging:** In the Triage Board view, drag bugs from `New` to `Triaged` after reviewing. Set Priority and Assignee.
3. **Working on a bug:** Move to `In Progress`. Fill in Git Branch. When PR is ready, link it via the Related PR relation.
4. **Resolving:** Move to `Resolved`. Fill in Root Cause and Resolution. Set Date Resolved.
5. **Closing:** After QA verification, move to `Closed`.
6. **SLA monitoring:** Check the "Critical & High Bugs" view regularly. The SLA Breached formula will flag overdue items.
