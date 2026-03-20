---
title: "Senior Developer Interview Checklist: System Design, Algorithms & Behavioral"
description: "A complete senior developer interview preparation checklist covering system design, algorithms, behavioral questions, and the mindset shift that separates senior from mid-level candidates."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["interview", "career", "system-design", "algorithms", "senior-engineer"]
readingTime: "12 min read"
---

Senior developer interviews are different in kind, not just difficulty. Mid-level interviews test what you know. Senior interviews test how you think. This checklist is built around that distinction — covering not just topics to study, but how to approach each area with the depth interviewers are actually looking for.

## The Senior Engineer Mindset

Before the checklist, understand what "senior" signals to an interviewer. The shift from mid to senior isn't primarily about technical knowledge — it's about:

- **Judgment under ambiguity** — making good decisions with incomplete information
- **Communication clarity** — explaining complex systems to different audiences
- **Tradeoff awareness** — articulating why you chose X over Y, not just that you chose X
- **Scope awareness** — knowing when a problem needs a simple fix vs. a systemic solution

Every interview section below should be approached through this lens.

---

## Part 1: System Design

System design is the primary differentiator in senior interviews. The goal isn't to produce a perfect architecture — it's to demonstrate structured thinking.

### The Framework to Follow

For every system design question, use this structure:

1. **Clarify requirements** (5 min)
   - Functional requirements: what does the system do?
   - Non-functional: scale, latency, consistency requirements, availability?
   - Scope: what's in scope for this interview?

2. **Estimate scale** (5 min)
   - Daily active users
   - Read/write ratio
   - Data volume (storage needs)
   - Traffic patterns (uniform or bursty?)

3. **High-level design** (15 min)
   - Draw the major components: clients, load balancers, servers, databases, caches
   - Identify the data flow for the core use cases

4. **Deep dive** (15 min)
   - Pick 1-2 components the interviewer cares about most
   - Discuss tradeoffs in your choices

5. **Bottlenecks and scaling** (5 min)
   - What breaks first at 10x scale?
   - How would you handle it?

### Core System Design Topics to Master

**Databases:**
- [ ] SQL vs NoSQL — when to use each, not just what they are
- [ ] Database indexing — B-tree vs hash indexes, composite indexes, covering indexes
- [ ] Replication — primary-replica, multi-primary, consistency tradeoffs
- [ ] Sharding — horizontal partitioning strategies, hotspot problems
- [ ] CAP theorem — understand the practical implications, not just the theory

**Caching:**
- [ ] Cache invalidation strategies — TTL, event-driven, write-through vs write-back
- [ ] Cache eviction — LRU, LFU, when each makes sense
- [ ] CDN caching vs application caching vs database query caching
- [ ] Redis data structures beyond key-value (sorted sets for leaderboards, pub/sub for events)

**Distributed Systems:**
- [ ] Consistent hashing — how it distributes load, why it minimizes remapping
- [ ] Distributed transactions — two-phase commit, saga pattern, eventual consistency
- [ ] Message queues — Kafka vs RabbitMQ, when to use async over sync
- [ ] Rate limiting — token bucket vs leaky bucket, where to enforce it

**APIs and Communication:**
- [ ] REST design — resource modeling, idempotency, versioning strategies
- [ ] GraphQL — when it's better than REST, N+1 problem, DataLoader pattern
- [ ] gRPC — when low latency or streaming matters
- [ ] WebSockets vs SSE — real-time use cases and tradeoffs

**Common System Design Questions:**
- Design a URL shortener (covers hashing, databases, caching, scale)
- Design a notification system (covers queuing, fan-out, delivery guarantees)
- Design a rate limiter (covers distributed state, consistency, efficiency)
- Design a news feed / timeline (covers fan-out on read vs write, caching)
- Design a distributed cache like Redis (covers consistency, eviction, clustering)

### System Design Red Flags to Avoid

- Jumping to a solution without clarifying requirements
- Single points of failure with no discussion of resilience
- No mention of failure modes ("what happens when service X goes down?")
- Scale numbers that don't add up (back-of-napkin math should be consistent)
- Choosing technologies without explaining why

---

## Part 2: Algorithms and Data Structures

Senior engineers are not expected to solve LeetCode Hard in 15 minutes under pressure. They are expected to think through problems systematically, communicate their approach, and produce correct, efficient solutions.

### Algorithmic Foundations

**Must-know patterns:**

- [ ] **Two pointers** — array problems, palindrome detection, sorted array merging
- [ ] **Sliding window** — substring problems, max subarray, fixed-size window stats
- [ ] **Binary search** — not just sorted arrays; search space reduction on any monotonic function
- [ ] **BFS/DFS** — tree traversal, graph connectivity, shortest path (BFS), cycle detection
- [ ] **Dynamic programming** — bottom-up vs top-down, identifying subproblem structure
- [ ] **Heap / priority queue** — top-K problems, merge K sorted lists, scheduling
- [ ] **Hash maps** — frequency counting, two-sum pattern, grouping

**Data structures to know deeply:**
- [ ] Arrays and strings — in-place operations, rotation, sliding window
- [ ] Linked lists — reversal, cycle detection (Floyd's), merge
- [ ] Trees — BST operations, LCA, path sum, level-order traversal
- [ ] Graphs — adjacency list vs matrix, Dijkstra's algorithm, union-find
- [ ] Stacks and queues — monotonic stack, queue using stacks

### How to Approach Coding Problems in Interviews

```
1. Repeat the problem back in your own words
2. Work through 1-2 examples by hand
3. State the naive solution first ("The O(n²) solution would be...")
4. Identify the optimization ("We can do better by...")
5. Code it
6. Test with your examples + edge cases
7. Analyze time/space complexity
```

The narration matters as much as the code. Interviewers can't see inside your head.

### Complexity You Should Know Cold

| Operation | Data Structure | Time |
|-----------|---------------|------|
| Access by index | Array | O(1) |
| Insert/delete at front | Linked List | O(1) |
| Search | Hash Map | O(1) avg |
| Insert/delete | Balanced BST | O(log n) |
| Insert / Extract min | Min Heap | O(log n) |
| Sort | Array | O(n log n) |
| BFS/DFS | Graph (V+E) | O(V+E) |

---

## Part 3: Behavioral Interviews

Senior behavioral interviews dig into leadership, judgment, and conflict — not just "tell me about a project." The STAR format (Situation, Task, Action, Result) is the baseline, but senior interviews push harder on the "why."

### Categories to Prepare Stories For

**Technical leadership:**
- [ ] A time you made a significant architectural decision — what was the tradeoff, who did you align with?
- [ ] A time you pushed back on a technical direction — how did you frame it, what happened?
- [ ] A time you simplified a system or removed complexity — why was it needed?

**Handling failure:**
- [ ] A production incident you were responsible for — what happened, how did you respond, what changed after?
- [ ] A project that failed or was cancelled — what did you learn, what would you do differently?
- [ ] A technical debt situation you had to navigate

**Collaboration and influence:**
- [ ] A time you disagreed with your manager or a senior stakeholder — how did you handle it?
- [ ] A time you mentored someone — what did you focus on, how did it go?
- [ ] A time you drove alignment across teams with conflicting priorities

**Estimation and planning:**
- [ ] A time your estimate was wrong — what happened, how did you communicate it?
- [ ] A time you had to scope down a project under deadline pressure — how did you decide what to cut?

### Strong STAR Story Structure for Senior Roles

Weak answer: "I noticed a performance problem, I fixed it, the site got faster."

Strong answer:
- **Situation:** What was the business context? (Users were churning at a specific step, alerting was showing p99 latency over 3s)
- **Task:** What was your specific responsibility? (I owned the checkout service, this was my problem to solve)
- **Action:** What did you do — including the hard parts? (I profiled, found N+1 queries, proposed a solution, got pushback on timeline, negotiated a phased approach, implemented it over 2 sprints)
- **Result:** Quantified outcome + what you'd do differently (p99 dropped from 3.1s to 340ms, checkout conversion +4%, in retrospect I should have added monitoring before the fix to baseline properly)

The "what I'd do differently" signals senior self-awareness.

---

## Part 4: Code Review and Engineering Practices

Many senior interviews include a code review exercise — reading existing code and identifying issues. This tests your real-world judgment more than whiteboard algorithms.

### What to Look For in Code Reviews

**Correctness:**
- [ ] Off-by-one errors
- [ ] Null/undefined handling
- [ ] Edge cases (empty input, single element, maximum values)
- [ ] Race conditions in concurrent code

**Security:**
- [ ] SQL injection (string concatenation in queries)
- [ ] XSS (unescaped user input rendered as HTML)
- [ ] Hardcoded credentials
- [ ] Missing input validation at API boundaries

**Performance:**
- [ ] N+1 queries (fetching in a loop that could be one query)
- [ ] Missing database indexes for query patterns
- [ ] Unnecessary computation inside loops
- [ ] Memory leaks (event listeners not cleaned up)

**Maintainability:**
- [ ] Functions doing more than one thing
- [ ] Magic numbers without named constants
- [ ] Missing error handling
- [ ] Test coverage for critical paths

---

## Part 5: Domain-Specific Topics

Depending on the role, expect depth in one of these areas:

### Frontend Senior
- [ ] Browser rendering pipeline — critical rendering path, layout vs paint vs composite
- [ ] Performance — Core Web Vitals (LCP, FID/INP, CLS), bundle analysis, code splitting
- [ ] Accessibility — WCAG 2.1 AA, ARIA roles, keyboard navigation, screen reader testing
- [ ] State management — when to use context vs external store, avoiding prop drilling
- [ ] TypeScript — advanced types, generics, utility types, discriminated unions

### Backend Senior
- [ ] Database query optimization — EXPLAIN ANALYZE, index design, query rewriting
- [ ] API design — idempotency, versioning, backward compatibility
- [ ] Security — OWASP Top 10, authentication vs authorization, secrets management
- [ ] Observability — structured logging, metrics, tracing, alert design
- [ ] Containerization — Docker multi-stage builds, orchestration basics

### Full-Stack Senior
- [ ] Auth patterns — session vs JWT, OAuth 2.0 / OIDC flows, refresh token rotation
- [ ] Deployment — CI/CD pipelines, blue-green deploys, feature flags, rollbacks
- [ ] Monitoring — defining SLOs, alerting on symptoms vs causes

---

## Interview Week Checklist

**One week before:**
- [ ] Review 2-3 system design problems end-to-end
- [ ] Practice coding one problem per day (medium difficulty, focus on communication)
- [ ] Prepare 6-8 STAR stories covering the behavioral categories above
- [ ] Research the company's tech stack and any recent engineering blog posts

**Day before:**
- [ ] Light review, no new material
- [ ] Prepare your setup: quiet space, reliable internet, IDE ready
- [ ] Have a glass of water and something to write on

**During interviews:**
- [ ] Ask clarifying questions before you start
- [ ] Narrate your thinking out loud
- [ ] Name tradeoffs explicitly ("The downside of this approach is...")
- [ ] Ask for feedback at the end ("Is there a direction you'd have taken this instead?")

**The most honest advice:** Senior interviews reward people who've thought deeply about their own work. The preparation that matters most isn't grinding LeetCode — it's being able to articulate why you made the choices you made in your career, what broke, what you'd do differently, and what you're still figuring out.
