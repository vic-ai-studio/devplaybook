# Sprint Board

> Plan sprints, track story points, and measure velocity. Supports Scrum and Kanban workflows with timeline and burndown views.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| Task Title | Title | — |
| Task ID | Unique ID | Prefix: `TASK-`, auto-increment |
| Status | Select | `Backlog`, `To Do`, `In Progress`, `In Review`, `Done`, `Blocked`, `Cancelled` |
| Type | Select | `Feature` (blue), `Bug Fix` (red), `Chore` (gray), `Spike` (purple), `Tech Debt` (orange), `Documentation` (green) |
| Priority | Select | `Urgent`, `High`, `Medium`, `Low` |
| Story Points | Select | `1`, `2`, `3`, `5`, `8`, `13`, `21` |
| Sprint | Select | `Sprint 24 (Mar 11-22)`, `Sprint 25 (Mar 25 - Apr 5)`, `Sprint 26 (Apr 7-18)`, `Backlog` |
| Assignee | Person | Multi-select people |
| Epic | Select | `User Auth`, `API v2`, `Dashboard Redesign`, `Performance`, `Mobile App`, `DevOps`, `Testing` |
| Labels | Multi-select | `frontend`, `backend`, `database`, `api`, `infra`, `mobile`, `design`, `testing` |
| Start Date | Date | When work begins |
| Due Date | Date | Sprint end or specific deadline |
| Completed Date | Date | When marked Done |
| Bugs | Relation | Links to → Bug Tracker |
| Code Reviews | Relation | Links to → Code Review Tracker |
| Meeting Notes | Relation | Links to → Meeting Notes |
| GitHub PR | URL | Link to pull request |
| Branch Name | Text | e.g., `feature/TASK-142-user-auth` |
| Description | Text (rich) | Acceptance criteria and details |
| Blocked By | Relation | Self-relation to Sprint Board (dependencies) |
| Blocking | Relation | Self-relation (reverse of Blocked By) |
| Estimated Hours | Number | Time estimate |
| Actual Hours | Number | Time actually spent |
| Estimation Accuracy | Formula | `if(prop("Actual Hours") > 0, round(prop("Estimated Hours") / prop("Actual Hours") * 100), 0)` |
| Days in Progress | Formula | `if(prop("Status") == "In Progress", dateBetween(now(), prop("Start Date"), "days"), if(prop("Completed Date"), dateBetween(prop("Completed Date"), prop("Start Date"), "days"), 0))` |
| Is Overdue | Formula | `if(prop("Due Date") and prop("Status") != "Done" and prop("Status") != "Cancelled", now() > prop("Due Date"), false)` |
| Sprint Points Done | Formula | `if(prop("Status") == "Done", toNumber(prop("Story Points")), 0)` |

---

## Views

### 1. Sprint Board (Default — Board View)

- **Group by:** Status
- **Filter:** Sprint is `[Current Sprint]`
- **Sort:** Priority (Urgent first)
- **Card properties:** Task Title, Type, Story Points, Assignee, Labels
- **Column order:** To Do → In Progress → In Review → Done → Blocked

### 2. Current Sprint Table (Table View)

- **Filter:** Sprint is `[Current Sprint]`
- **Sort:** Status (In Progress first), then Priority
- **Columns:** Task Title, Status, Type, Story Points, Assignee, Priority, Due Date, Days in Progress

### 3. Backlog (Table View)

- **Filter:** Sprint is `Backlog` OR Status is `Backlog`
- **Sort:** Priority ascending, then Date Created descending
- **Group by:** Epic
- **Columns:** Task Title, Type, Story Points, Priority, Epic, Labels

### 4. Sprint Timeline (Timeline View)

- **Timeline by:** Start Date → Due Date
- **Filter:** Sprint is `[Current Sprint]`
- **Group by:** Assignee
- **Color by:** Type

### 5. By Assignee (Board View)

- **Group by:** Assignee
- **Filter:** Sprint is `[Current Sprint]`, Status is not `Done`, Status is not `Cancelled`
- **Sub-sort:** Priority
- **Card properties:** Task Title, Status, Story Points

### 6. Epics Overview (Board View)

- **Group by:** Epic
- **Filter:** Sprint is `[Current Sprint]`
- **Show calculation:** Sum of Story Points per group

### 7. Burndown Data (Table View)

- **Filter:** Sprint is `[Current Sprint]`, Status is `Done`
- **Sort:** Completed Date ascending
- **Show calculation:** Running sum of Story Points
- **Columns:** Task Title, Story Points, Completed Date, Sprint Points Done

### 8. Blocked Items (Table View)

- **Filter:** Status is `Blocked`
- **Sort:** Priority ascending
- **Columns:** Task Title, Priority, Assignee, Blocked By, Days in Progress

---

## Formulas

### Estimation Accuracy (percentage)
```
if(
  prop("Actual Hours") > 0,
  round(prop("Estimated Hours") / prop("Actual Hours") * 100),
  0
)
```
> 100% = perfect estimate, >100% = overestimated, <100% = underestimated

### Days in Progress
```
if(
  prop("Status") == "In Progress",
  dateBetween(now(), prop("Start Date"), "days"),
  if(
    prop("Completed Date"),
    dateBetween(prop("Completed Date"), prop("Start Date"), "days"),
    0
  )
)
```

### Is Overdue
```
if(
  prop("Due Date") and prop("Status") != "Done" and prop("Status") != "Cancelled",
  now() > prop("Due Date"),
  false
)
```

### Sprint Points Done
```
if(prop("Status") == "Done", toNumber(prop("Story Points")), 0)
```

---

## Relations

| This Database | Related To | Relation Name | Purpose |
|---------------|-----------|---------------|---------|
| Sprint Board | Bug Tracker | Bugs | Bugs assigned to this sprint task |
| Sprint Board | Code Review Tracker | Code Reviews | PRs associated with this task |
| Sprint Board | Meeting Notes | Meeting Notes | Meetings where this task was discussed |
| Sprint Board | Sprint Board (self) | Blocked By / Blocking | Task dependencies |

---

## Sample Data

| Task Title | Status | Type | Story Points | Sprint | Assignee | Priority | Epic |
|-----------|--------|------|-------------|--------|----------|----------|------|
| Implement OAuth2 PKCE flow | In Progress | Feature | 8 | Sprint 25 | @sarah | High | User Auth |
| Add rate limiting to /api/v2/* | To Do | Feature | 5 | Sprint 25 | @mike | High | API v2 |
| Migrate user table to new schema | In Review | Tech Debt | 13 | Sprint 25 | @alex | Medium | User Auth |
| Write E2E tests for checkout flow | To Do | Chore | 5 | Sprint 25 | @jordan | Medium | Testing |
| Investigate Redis memory spike | Done | Spike | 3 | Sprint 25 | @sarah | Urgent | Performance |
| Update API docs for v2 endpoints | Backlog | Documentation | 2 | Backlog | — | Low | API v2 |
| Redesign settings page layout | Blocked | Feature | 8 | Sprint 25 | @mike | Medium | Dashboard Redesign |
| Fix N+1 query in user listing | To Do | Bug Fix | 3 | Sprint 25 | @alex | High | Performance |
| Set up staging auto-deploy | Done | Chore | 5 | Sprint 25 | @jordan | Medium | DevOps |
| Evaluate GraphQL vs REST for mobile | Backlog | Spike | 3 | Backlog | — | Low | Mobile App |

---

## Sprint Planning Checklist

Use this checklist at the start of each sprint:

- [ ] Review and close out previous sprint (move unfinished items)
- [ ] Review backlog and prioritize items for this sprint
- [ ] Ensure each item has story points estimated
- [ ] Verify team capacity (account for PTO, meetings, on-call)
- [ ] Target velocity based on last 3 sprint averages
- [ ] Assign owners to all sprint items
- [ ] Identify dependencies and mark Blocked By relations
- [ ] Set Start Date and Due Date for timeline view
- [ ] Create a sprint goal statement

## Sprint Retrospective Template

At the end of each sprint, create a page with:

```
## Sprint [N] Retrospective — [Date Range]

### Velocity
- Planned: [X] points
- Completed: [Y] points
- Carried over: [Z] points

### What went well
-

### What didn't go well
-

### Action items for next sprint
- [ ]

### Shoutouts
-
```

---

## Usage Instructions

1. **Sprint planning:** Move items from Backlog to the current Sprint. Set story points via planning poker.
2. **Daily standups:** Use the "Current Sprint Table" view. Each person reports on their assigned items.
3. **During sprint:** Drag cards across the board as work progresses. Link PRs via the Code Reviews relation.
4. **Dependencies:** Use the Blocked By self-relation. Check the "Blocked Items" view daily.
5. **Sprint end:** Run the retrospective. Move incomplete items. Archive the sprint.
6. **Velocity tracking:** Use the Burndown Data view to chart points completed per day.
