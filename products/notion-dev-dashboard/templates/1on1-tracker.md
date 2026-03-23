# 1:1 Meeting Tracker

> Structured 1:1 meeting notes for managers and reports. Track talking points, feedback, career goals, and action items across every session.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| Meeting Title | Title | Auto-format: "1:1 — [Name] — [Date]" |
| Date | Date | Meeting date |
| Manager | Person | — |
| Report | Person | — |
| Mood | Select | `Great` (green), `Good` (blue), `Okay` (yellow), `Struggling` (orange), `Burnt Out` (red) |
| Status | Select | `Scheduled`, `Completed`, `Cancelled`, `Rescheduled` |
| Duration | Select | `15 min`, `30 min`, `45 min`, `60 min` |
| Meeting Cadence | Select | `Weekly`, `Bi-weekly`, `Monthly` |
| Topics Covered | Multi-select | `Project Updates`, `Career Growth`, `Feedback`, `Blockers`, `Goals Review`, `Personal`, `Team Dynamics`, `Compensation`, `Performance Review`, `Onboarding`, `PTO/Leave` |
| Action Items Open | Number | Count of uncompleted action items |
| Action Items Closed | Number | Count of completed action items |
| Follow-up Items | Text (rich) | Items to revisit next meeting |
| Quarter | Select | `2026-Q1`, `2026-Q2`, `2026-Q3`, `2026-Q4` |
| Next Meeting | Date | Scheduled date for the next 1:1 |
| Streak | Number | Consecutive meetings without cancellation |
| Completion Rate | Formula | `if(prop("Action Items Open") + prop("Action Items Closed") > 0, round(prop("Action Items Closed") / (prop("Action Items Open") + prop("Action Items Closed")) * 100), 0)` |

---

## Views

### 1. Timeline (Default — Table View)

- **Sort:** Date descending
- **Group by:** Report
- **Columns:** Meeting Title, Date, Mood, Topics Covered, Action Items Open, Status

### 2. By Person (Board View)

- **Group by:** Report
- **Sort:** Date descending
- **Card properties:** Date, Mood, Topics Covered, Action Items Open
- **Useful for:** Manager overview of all reports

### 3. Calendar View

- **Calendar by:** Date
- **Color by:** Report
- **Filter:** Status is not `Cancelled`

### 4. Mood Trends (Table View)

- **Sort:** Date ascending
- **Filter:** Report is [specific person], last 90 days
- **Columns:** Date, Mood, Topics Covered
- **Useful for:** Spotting mood patterns over time

### 5. Open Action Items (Table View)

- **Filter:** Action Items Open > 0
- **Sort:** Date ascending (oldest open items first)
- **Columns:** Meeting Title, Report, Date, Action Items Open, Follow-up Items

### 6. Quarterly Summary (Table View)

- **Group by:** Quarter
- **Filter:** Report is [specific person]
- **Show calculation:** Count of meetings, average mood (manual assessment)

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

## 1:1 Meeting Template (Page Body)

```
## 1:1 — [Report Name] — [Date]

### Check-in
**How are you feeling this week?** (1-5 scale or emoji)
**Energy level:**
**Anything on your mind outside of work?**

---

### Talking Points (Report)
> These are topics the report wants to discuss. They should add items before the meeting.

- [ ]
- [ ]
- [ ]

### Talking Points (Manager)
> Manager's topics for discussion.

- [ ]
- [ ]

---

### Project Updates
**Current focus:**
**Progress since last 1:1:**
**Any blockers?**

---

### Feedback

#### Feedback for Report
**What's going well:**
**Areas to improve:**
**Specific example:**

#### Feedback for Manager
**What's helpful:**
**What could be better:**

---

### Career Growth
**Current goal:**
**Progress this period:**
**Support needed:**
**Skills to develop:**

---

### Action Items
- [ ] [Action] — Owner: [who] — Due: [date]
- [ ] [Action] — Owner: [who] — Due: [date]
- [ ] [Action] — Owner: [who] — Due: [date]

### Follow-up for Next Meeting
-
-

---

### Previous Action Items — Status
- [x] [Completed action from last 1:1]
- [ ] [Still open — carried over]
```

---

## Career Growth Tracking Template

Use this as a sub-page or section to track long-term career development:

```
## Career Growth Plan — [Name]

### Current Role
**Title:** [e.g., Senior Software Engineer]
**Level:** [e.g., L5 / IC3]
**Start Date:** [date]
**Time in Role:** [X months]

### Target Role
**Title:** [e.g., Staff Engineer / Engineering Manager]
**Target Timeline:** [e.g., Q4 2026]

### Core Competencies Assessment

| Competency | Current Level | Target Level | Gap |
|-----------|---------------|-------------|-----|
| Technical Design | Strong | Expert | Need more cross-team design work |
| Code Quality | Expert | Expert | Maintain |
| Mentorship | Developing | Strong | Start mentoring junior engineer |
| Communication | Strong | Expert | Present at team all-hands |
| Project Leadership | Developing | Strong | Lead a medium-sized project end-to-end |
| Cross-team Impact | Developing | Strong | Contribute to shared platform team |

### Quarterly Goals

#### Q1 2026
- [ ] Lead the API v2 migration project
- [ ] Mentor [junior engineer] through their first feature
- [ ] Give a tech talk on [topic]

#### Q2 2026
- [ ] Own the architecture review process
- [ ] Contribute to 2 cross-team initiatives
- [ ] Write and publish an engineering blog post

### Learning Plan
(Link to Learning Log entries)

### Accomplishments Log
| Date | Accomplishment | Impact |
|------|---------------|--------|
| 2026-03-15 | Led incident response for production outage | Reduced MTTR from 45min to 15min |
| 2026-02-28 | Designed and shipped OAuth2 PKCE flow | Enabled SSO for 5000+ enterprise users |
| 2026-02-10 | Mentored Alex through first PR review | Alex now reviews independently |
```

---

## Performance Review Prep Template

Use this before performance review cycles:

```
## Performance Review Prep — [Name] — [Review Period]

### Summary of 1:1 Themes
(Review last quarter's 1:1 notes for patterns)
- Most common topics:
- Recurring blockers:
- Mood trend:

### Key Accomplishments
1.
2.
3.

### Areas of Growth
1.
2.

### Areas for Improvement
1.
2.

### Feedback from Peers
-
-

### Goals for Next Period
1.
2.
3.

### Compensation Discussion Notes
-
```

---

## Sample Data

| Meeting Title | Date | Manager | Report | Mood | Topics Covered | Action Items Open |
|--------------|------|---------|--------|------|---------------|------------------|
| 1:1 — Sarah — Mar 21 | 2026-03-21 | @lead | @sarah | Great | Project Updates, Career Growth | 2 |
| 1:1 — Mike — Mar 20 | 2026-03-20 | @lead | @mike | Good | Blockers, Feedback | 1 |
| 1:1 — Alex — Mar 19 | 2026-03-19 | @lead | @alex | Okay | Onboarding, Goals Review | 3 |
| 1:1 — Jordan — Mar 18 | 2026-03-18 | @lead | @jordan | Struggling | Personal, Blockers, Team Dynamics | 2 |
| 1:1 — Sarah — Mar 14 | 2026-03-14 | @lead | @sarah | Good | Project Updates, Performance Review | 0 |
| 1:1 — Mike — Mar 13 | 2026-03-13 | @lead | @mike | Great | Career Growth, Compensation | 1 |

---

## Usage Instructions

1. **Before the meeting:** Both manager and report add talking points to the page. Review previous meeting's action items.
2. **During the meeting:** Work through talking points. Start with check-in. The report should drive the agenda.
3. **After the meeting:** Update Action Items counts. Set Follow-up Items. Schedule next meeting date.
4. **Quarterly:** Review mood trends. Update career growth plan. Prepare performance review notes.
5. **Consistency:** Never cancel 1:1s — reschedule instead. Track your streak.
6. **Privacy:** These notes are shared only between manager and report. Use Notion's page-level permissions.
