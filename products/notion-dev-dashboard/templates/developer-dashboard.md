# Developer Dashboard

> Your central engineering hub. This page links to all databases and provides at-a-glance metrics for your development workflow.

---

## Quick Links

- [[Bug Tracker]] — Track and triage bugs
- [[Sprint Board]] — Current sprint tasks and backlog
- [[Code Review Tracker]] — Open PRs and review status
- [[Learning Log]] — Personal growth and skills
- [[Meeting Notes]] — Engineering meetings and decisions
- [[1:1 Tracker]] — Manager/report 1:1 notes

---

## Weekly Metrics Panel

| Metric | This Week | Last Week | Trend |
|--------|-----------|-----------|-------|
| Bugs Filed | 12 | 8 | +50% |
| Bugs Closed | 15 | 10 | +50% |
| Story Points Completed | 34 | 28 | +21% |
| PRs Merged | 9 | 7 | +29% |
| PRs Awaiting Review | 3 | 5 | -40% |
| Average Review Time | 4.2h | 6.1h | -31% |
| Sprint Velocity | 34 | 28 | +21% |

> **Tip:** In Notion, embed these as linked database views with filters set to "Created this week" and use rollups for automatic calculations.

---

## Current Sprint Overview

### Embedded View: Sprint Board (Current Sprint, Board View)

| Status | Count |
|--------|-------|
| To Do | 5 |
| In Progress | 4 |
| In Review | 3 |
| Done | 12 |

> In Notion, add a **Linked View** of the Sprint Board database filtered to the current sprint, displayed as a Board grouped by Status.

---

## Open Bugs by Severity

### Embedded View: Bug Tracker (Open Bugs, Table View)

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 2 |
| Medium | 5 |
| Low | 8 |

> In Notion, add a **Linked View** of the Bug Tracker filtered to Status != "Closed", grouped by Severity.

---

## PRs Needing Review

### Embedded View: Code Review Tracker (Pending Reviews, Table View)

> Filter: Status = "Pending Review" OR Status = "Changes Requested"
> Sort: Created date ascending (oldest first)

---

## Team Focus Areas This Week

- [ ] Complete authentication refactor (Sprint Task #142)
- [ ] Fix production memory leak (Bug #87)
- [ ] Review and merge API v2 endpoints (PR #456, #457, #458)
- [ ] Prepare demo for Friday stakeholder meeting

---

## Recent Decisions Log

| Date | Decision | Context | Owner |
|------|----------|---------|-------|
| 2026-03-20 | Migrate from REST to GraphQL for internal APIs | Performance benchmarks showed 40% fewer round trips | @sarah |
| 2026-03-18 | Adopt Playwright over Cypress for E2E tests | Better multi-browser support, faster execution | @mike |
| 2026-03-15 | Use feature flags for all new features | Reduce deployment risk, enable A/B testing | @team |

---

## Setup Instructions

### How to Build This Dashboard in Notion

1. **Create a new page** — title it "Developer Dashboard"
2. **Add icon** — Use the `dashboard` or `terminal` emoji
3. **Add cover** — Choose a dark gradient or code-themed image
4. **Create linked views** for each database:
   - `/linked` → search for "Bug Tracker" → select Board view
   - `/linked` → search for "Sprint Board" → select Board view
   - `/linked` → search for "Code Review Tracker" → select Table view
5. **Add filters to each view:**
   - Bug Tracker: `Status is not Closed` + `Severity is Critical or High`
   - Sprint Board: `Sprint is [Current Sprint Name]`
   - Code Review: `Status is Pending Review`
6. **Add callout blocks** for weekly metrics (or use a formula database)
7. **Add toggle headings** for sections you want collapsible

### Recommended Layout

Use Notion's column layout:

```
[Left Column - 60%]          [Right Column - 40%]
Sprint Board (Board view)    Open Bugs (Table view)
                             PRs Needing Review (Table)

[Full Width]
Weekly Metrics Panel
Recent Decisions Log
Team Focus Areas
```

### Automations

- Set a **recurring Notion reminder** every Monday at 9am to update weekly metrics
- Use the **daily-standup-bot.py** script to auto-create standup entries
- Use **sync-github-issues.py** to keep bugs in sync with GitHub
