# Meeting Notes

> Structured engineering meeting notes with action items, decisions, and follow-ups. Never lose context from standups, retros, or design reviews.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| Meeting Title | Title | — |
| Meeting Type | Select | `Daily Standup`, `Sprint Planning`, `Sprint Retro`, `Design Review`, `Architecture Review`, `Incident Review`, `Team Sync`, `All Hands`, `Demo`, `Interview Debrief`, `Ad Hoc` |
| Date | Date | Meeting date and time |
| Duration | Select | `15 min`, `30 min`, `45 min`, `60 min`, `90 min`, `120 min` |
| Attendees | Person | Multi-select — who attended |
| Facilitator | Person | Who ran the meeting |
| Note Taker | Person | Who took notes |
| Status | Select | `Scheduled`, `In Progress`, `Completed`, `Cancelled` |
| Sprint Tasks | Relation | Links to → Sprint Board (tasks discussed) |
| Action Items Count | Formula | — (see formula below) |
| Recording URL | URL | Link to Zoom/Meet recording |
| Follow-up Date | Date | When to revisit action items |
| Tags | Multi-select | `architecture`, `planning`, `process`, `hiring`, `incident`, `performance`, `security`, `launch`, `retrospective` |
| Series | Select | `Weekly Team Sync`, `Daily Standup`, `Bi-weekly Retro`, `Monthly All Hands`, `One-off` |
| Decisions Made | Number | Count of decisions documented |
| Action Items Open | Number | Manually updated count of open action items |
| Action Items Closed | Number | Manually updated count of closed action items |
| Completion Rate | Formula | `if(prop("Action Items Open") + prop("Action Items Closed") > 0, round(prop("Action Items Closed") / (prop("Action Items Open") + prop("Action Items Closed")) * 100), 0)` |

---

## Views

### 1. Recent Meetings (Default — Table View)

- **Sort:** Date descending
- **Columns:** Meeting Title, Meeting Type, Date, Duration, Attendees, Facilitator, Action Items Open
- **Filter:** Date is within last 30 days

### 2. By Type (Board View)

- **Group by:** Meeting Type
- **Sort:** Date descending
- **Card properties:** Meeting Title, Date, Attendees, Action Items Open

### 3. Calendar View

- **Calendar by:** Date
- **Color by:** Meeting Type
- **Filter:** Status is not `Cancelled`

### 4. Action Item Follow-ups (Table View)

- **Filter:** Action Items Open > 0
- **Sort:** Follow-up Date ascending (soonest first)
- **Columns:** Meeting Title, Meeting Type, Date, Action Items Open, Follow-up Date, Facilitator

### 5. This Sprint's Meetings (Table View)

- **Filter:** Date is within `[Current Sprint date range]`
- **Sort:** Date ascending
- **Group by:** Meeting Type

### 6. Meeting Frequency (Table View)

- **Group by:** Meeting Type
- **Show calculation:** Count per group
- **Filter:** Date is within last 90 days
- **Useful for:** Auditing meeting load — are we over-meeting?

---

## Formulas

### Completion Rate
```
if(
  prop("Action Items Open") + prop("Action Items Closed") > 0,
  round(
    prop("Action Items Closed") /
    (prop("Action Items Open") + prop("Action Items Closed")) * 100
  ),
  0
)
```

---

## Meeting Templates (Page Body)

### Daily Standup Template

```
## Daily Standup — [Date]

### [Person 1]
**Yesterday:**
**Today:**
**Blockers:**

### [Person 2]
**Yesterday:**
**Today:**
**Blockers:**

### [Person 3]
**Yesterday:**
**Today:**
**Blockers:**

---

### Blockers to Escalate
- [ ]

### Quick Announcements
-
```

### Sprint Planning Template

```
## Sprint [N] Planning — [Date Range]

### Team Capacity
| Person | Available Days | Notes |
|--------|---------------|-------|
| @sarah | 9/10 | PTO Friday |
| @mike | 10/10 | — |
| @alex | 8/10 | On-call rotation |
| @jordan | 10/10 | — |

**Total capacity:** [X] points (based on last 3 sprint average)

### Sprint Goal
> [One sentence describing what the team aims to achieve]

### Selected Items
| Task | Points | Assignee | Dependencies |
|------|--------|----------|-------------|
| | | | |

### Total Points: [X] / [Capacity]

### Risks & Dependencies
-

### Decisions
1.
```

### Sprint Retrospective Template

```
## Sprint [N] Retrospective — [Date]

### Velocity
- Planned: [X] points
- Completed: [Y] points
- Completion rate: [Z]%

### What Went Well
-
-
-

### What Didn't Go Well
-
-
-

### What Can We Improve
-
-
-

### Action Items
- [ ] [Action] — Owner: @person — Due: [date]
- [ ] [Action] — Owner: @person — Due: [date]
- [ ] [Action] — Owner: @person — Due: [date]

### Previous Retro Action Items — Status
- [x] [Completed action from last retro]
- [ ] [Still open action from last retro]
```

### Architecture / Design Review Template

```
## Design Review: [Feature/System Name]

### Author
@person

### Problem Statement
[What problem are we solving?]

### Proposed Solution
[High-level description]

### Architecture Diagram
[Embed image or link to diagram]

### API Changes
| Method | Endpoint | Description |
|--------|----------|-------------|
| | | |

### Database Changes
[New tables, columns, migrations]

### Trade-offs Considered
| Option | Pros | Cons |
|--------|------|------|
| Option A | | |
| Option B | | |

### Security Considerations
-

### Performance Impact
-

### Migration Plan
1.

### Decisions Made
1. [Decision] — Rationale: [why]

### Action Items
- [ ] [Next step] — @person
```

### Incident Review (Postmortem) Template

```
## Incident Review: [Incident Title]

### Summary
- **Severity:** [SEV-1 / SEV-2 / SEV-3]
- **Duration:** [Start time] → [End time] ([X] minutes)
- **Impact:** [Users affected, revenue impact, SLA breach]
- **On-call:** @person

### Timeline
| Time | Event |
|------|-------|
| HH:MM | [First alert / detection] |
| HH:MM | [Investigation started] |
| HH:MM | [Root cause identified] |
| HH:MM | [Mitigation applied] |
| HH:MM | [Fully resolved] |

### Root Cause
[What actually broke and why]

### Contributing Factors
-
-

### What Went Well
-

### What Went Poorly
-

### Action Items (Preventive)
- [ ] [Action] — Owner: @person — Priority: [P0/P1/P2]
- [ ] [Action] — Owner: @person — Priority: [P0/P1/P2]

### Lessons Learned
-
```

---

## Sample Data

| Meeting Title | Meeting Type | Date | Duration | Attendees | Action Items Open |
|--------------|-------------|------|----------|-----------|------------------|
| Daily Standup Mar 21 | Daily Standup | 2026-03-21 09:00 | 15 min | @sarah, @mike, @alex, @jordan | 1 |
| Sprint 25 Planning | Sprint Planning | 2026-03-25 10:00 | 90 min | @sarah, @mike, @alex, @jordan | 4 |
| Sprint 24 Retrospective | Sprint Retro | 2026-03-22 14:00 | 60 min | @sarah, @mike, @alex, @jordan | 3 |
| API v2 Design Review | Architecture Review | 2026-03-20 11:00 | 60 min | @sarah, @mike, @alex | 2 |
| Redis Memory Spike Postmortem | Incident Review | 2026-03-19 15:00 | 45 min | @sarah, @jordan | 2 |
| Weekly Team Sync | Team Sync | 2026-03-21 11:00 | 30 min | @sarah, @mike, @alex, @jordan | 0 |

---

## Usage Instructions

1. **Before the meeting:** Create the entry, set Type, select the right template for the page body.
2. **During the meeting:** The Note Taker fills in notes in real time. Use checklists for action items.
3. **After the meeting:** Update Action Items Open count. Set Follow-up Date. Link any Sprint Tasks discussed.
4. **Follow-up:** Use the "Action Item Follow-ups" view to track open items. Close them as they're completed.
5. **Audit meetings:** Use the "Meeting Frequency" view quarterly to evaluate if you have too many meetings.
