# Learning Log

> Track your developer growth. Log courses, books, talks, articles, and skills you're building. Review quarterly to guide your career.

---

## Database Properties

| Property Name | Type | Options / Config |
|--------------|------|-----------------|
| Title | Title | Name of the learning resource |
| Category | Select | `Course`, `Book`, `Article`, `Video/Talk`, `Tutorial`, `Podcast`, `Workshop`, `Conference`, `Side Project`, `Certification` |
| Status | Select | `Want to Learn`, `In Progress`, `Completed`, `Dropped`, `Revisit` |
| Skill Area | Multi-select | `Frontend`, `Backend`, `DevOps`, `System Design`, `Algorithms`, `Databases`, `Security`, `ML/AI`, `Mobile`, `Leadership`, `Communication`, `Architecture` |
| Technology | Multi-select | `TypeScript`, `Python`, `Go`, `Rust`, `React`, `Next.js`, `Node.js`, `PostgreSQL`, `Redis`, `Docker`, `Kubernetes`, `AWS`, `Terraform`, `GraphQL` |
| Difficulty | Select | `Beginner`, `Intermediate`, `Advanced`, `Expert` |
| Priority | Select | `High - Career Goal`, `Medium - Useful`, `Low - Interest`, `Someday` |
| Source | URL | Link to the resource |
| Author/Instructor | Text | Creator of the content |
| Platform | Select | `Udemy`, `Coursera`, `Pluralsight`, `YouTube`, `O'Reilly`, `Frontendmasters`, `Egghead`, `Blog`, `Book`, `Conference`, `Free` |
| Cost | Number | Price paid (format as currency) |
| Start Date | Date | When you started |
| Completion Date | Date | When you finished |
| Time Invested | Number | Hours spent (estimate) |
| Rating | Select | `5 - Excellent`, `4 - Great`, `3 - Good`, `2 - Fair`, `1 - Poor` |
| Key Takeaways | Text (rich) | Top 3-5 things you learned |
| Notes Page | Text (rich) | Detailed notes (or link to notes page) |
| Applied At Work | Checkbox | Have you used this knowledge at work? |
| Would Recommend | Checkbox | Would you recommend to teammates? |
| Certificate URL | URL | Link to certificate if applicable |
| Quarter | Select | `2026-Q1`, `2026-Q2`, `2026-Q3`, `2026-Q4` |
| Days to Complete | Formula | `if(prop("Completion Date"), dateBetween(prop("Completion Date"), prop("Start Date"), "days"), 0)` |
| Learning Velocity | Formula | `if(prop("Time Invested") > 0 and prop("Days to Complete") > 0, round(prop("Time Invested") / prop("Days to Complete") * 10) / 10, 0)` |

---

## Views

### 1. Learning Board (Default — Board View)

- **Group by:** Status
- **Sort:** Priority (High first)
- **Card properties:** Title, Category, Skill Area, Technology, Difficulty
- **Column order:** Want to Learn → In Progress → Completed → Revisit

### 2. By Skill Area (Board View)

- **Group by:** Skill Area
- **Filter:** Status is `Completed` or `In Progress`
- **Sub-sort:** Completion Date descending

### 3. Completed (Gallery View)

- **Filter:** Status is `Completed`
- **Sort:** Completion Date descending
- **Card properties:** Title, Category, Rating, Key Takeaways, Time Invested
- **Card preview:** Show Rating and Key Takeaways

### 4. Reading / Watch List (Table View)

- **Filter:** Status is `Want to Learn`
- **Sort:** Priority ascending
- **Group by:** Category
- **Columns:** Title, Category, Skill Area, Difficulty, Priority, Source, Cost

### 5. Quarterly Review (Table View)

- **Filter:** Quarter is `[Current Quarter]`
- **Group by:** Status
- **Show calculation:** Count per group, Sum of Time Invested
- **Columns:** Title, Category, Status, Time Invested, Rating, Applied At Work

### 6. Skills Matrix (Board View)

- **Group by:** Difficulty
- **Filter:** Status is `Completed`
- **Sub-group:** Skill Area
- **Useful for:** Identifying skill gaps (where you have few Completed items)

### 7. Calendar View

- **Calendar by:** Start Date
- **Filter:** Status is `In Progress` or `Completed`
- **Color by:** Category

---

## Formulas

### Days to Complete
```
if(
  prop("Completion Date"),
  dateBetween(prop("Completion Date"), prop("Start Date"), "days"),
  0
)
```

### Learning Velocity (hours per day)
```
if(
  prop("Time Invested") > 0 and prop("Days to Complete") > 0,
  round(prop("Time Invested") / prop("Days to Complete") * 10) / 10,
  0
)
```

---

## Sample Data

| Title | Category | Status | Skill Area | Technology | Difficulty | Rating | Time Invested |
|-------|----------|--------|------------|------------|------------|--------|---------------|
| Designing Data-Intensive Applications | Book | Completed | System Design, Databases | PostgreSQL, Redis | Advanced | 5 - Excellent | 40 |
| Complete Docker & Kubernetes Course | Course | In Progress | DevOps | Docker, Kubernetes | Intermediate | — | 12 |
| The Pragmatic Programmer (20th Anniversary) | Book | Completed | Architecture | — | Intermediate | 5 - Excellent | 20 |
| Rust for TypeScript Developers | Tutorial | Want to Learn | Backend | Rust, TypeScript | Intermediate | — | 0 |
| Building Microservices (Sam Newman) | Book | In Progress | Architecture, Backend | — | Advanced | — | 8 |
| React Server Components Deep Dive | Video/Talk | Completed | Frontend | React, Next.js | Advanced | 4 - Great | 3 |
| AWS Solutions Architect Associate | Certification | Want to Learn | DevOps | AWS | Intermediate | — | 0 |
| Eloquent JavaScript (4th Edition) | Book | Completed | Frontend | TypeScript | Beginner | 3 - Good | 15 |
| System Design Interview (Alex Xu) | Book | Completed | System Design | — | Advanced | 4 - Great | 25 |
| GraphQL vs REST: When to Use What | Article | Completed | Backend, Architecture | GraphQL | Intermediate | 4 - Great | 1 |

---

## Quarterly Review Template

At the end of each quarter, create a summary page:

```
## Q[N] 2026 Learning Review

### Stats
- Resources completed: [X]
- Total hours invested: [Y]
- Certifications earned: [Z]

### Skills Developed
1. [Skill] — [How it's been applied]
2. [Skill] — [How it's been applied]
3. [Skill] — [How it's been applied]

### Top 3 Resources This Quarter
1. [Title] — [Why it was valuable]
2. [Title] — [Why it was valuable]
3. [Title] — [Why it was valuable]

### Gaps Identified
- [Skill area with no completed resources]
- [Technology you want to learn next]

### Goals for Next Quarter
- [ ] Complete [specific resource]
- [ ] Get [certification]
- [ ] Build a side project using [technology]
- [ ] Give a talk on [topic]
```

---

## Usage Instructions

1. **Adding resources:** When you discover something you want to learn, add it as `Want to Learn` with Priority set.
2. **Starting:** Move to `In Progress`, set Start Date. Aim for 1-2 items in progress max.
3. **Note-taking:** Use the page body for detailed notes. Write Key Takeaways when you finish.
4. **Completing:** Set Status to `Completed`, fill Rating, Time Invested, Completion Date. Check "Applied At Work" when relevant.
5. **Quarterly review:** Filter by quarter. Assess skill gaps. Set goals for next quarter.
6. **Team sharing:** Share your "Completed" gallery view with teammates for resource recommendations.
