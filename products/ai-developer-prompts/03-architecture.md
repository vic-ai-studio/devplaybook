# Architecture Prompts

10 structured prompts for system design, architectural decisions, and technical planning.

---

## AR-01 — System Design Review

```
Review the architecture I'm planning to build. Be a skeptical senior architect.

**What I'm building:** {{SYSTEM_DESCRIPTION}}
**Scale:** {{EXPECTED_USERS_AND_LOAD}}
**Team size:** {{TEAM_SIZE}}
**Timeline:** {{TIMELINE}}

**Proposed architecture:**
{{ARCHITECTURE_DESCRIPTION_OR_DIAGRAM}}

Evaluate:
1. **Will it scale?** — At 10x, 100x current load, what breaks first?
2. **Single points of failure** — What goes down and takes everything with it?
3. **Complexity vs. need** — Is this over-engineered for current requirements?
4. **Operational burden** — What does the on-call rotation look like?
5. **Hidden costs** — What's not obvious until you're in production?

Be direct about what you'd change and why.
```

---

## AR-02 — Technology Choice

```
Help me choose between {{OPTION_A}} and {{OPTION_B}} for {{USE_CASE}}.

**Context:**
- Team expertise: {{TEAM_SKILLS}}
- Scale: {{SCALE}}
- Budget: {{BUDGET_CONSTRAINTS}}
- Timeline: {{TIMELINE}}
- Existing stack: {{CURRENT_STACK}}

Compare them on:
1. Fit for this specific use case
2. Performance characteristics at target scale
3. Learning curve and operational complexity
4. Ecosystem maturity and long-term viability
5. Total cost of ownership

Don't be neutral — give me a clear recommendation with your reasoning. If there's a third option I haven't considered that beats both, tell me.
```

---

## AR-03 — Microservices vs Monolith Decision

```
I'm deciding whether to build this as a monolith or microservices (or modular monolith). Help me think through it.

**What I'm building:** {{SYSTEM_DESCRIPTION}}
**Current team:** {{TEAM_SIZE}} developers
**Timeline to first users:** {{TIMELINE}}
**Eventual scale target:** {{SCALE}}
**Domain complexity:** {{DOMAIN_DESCRIPTION}}

Walk me through:
1. Why a monolith is likely the right choice at this stage (or isn't)
2. What signals would tell me I need microservices
3. What a modular monolith gives me vs. both extremes
4. A concrete recommendation based on my context
5. What to build first to keep future options open

Don't default to microservices as the "mature" answer. Match the architecture to the reality.
```

---

## AR-04 — API Design

```
Design a {{REST_OR_GRAPHQL}} API for this feature.

**Feature:** {{FEATURE_DESCRIPTION}}
**Consumers:** {{WHO_USES_THE_API}}
**Data model (current):**
```
{{DATA_MODEL_OR_SCHEMA}}
```

Design the API including:
1. **Endpoints / operations** — method, path, purpose
2. **Request format** — required and optional fields, types
3. **Response format** — success shape, error shape
4. **Status codes** — which codes and when
5. **Auth** — how authentication/authorization applies
6. **Versioning strategy** — how you'd handle breaking changes

Show example request/response pairs for the most common operations.
```

---

## AR-05 — Database Design

```
Design the database schema for this feature.

**Feature:** {{FEATURE_DESCRIPTION}}
**Database:** {{POSTGRES_OR_MYSQL_OR_MONGO_ETC}}
**Key operations (what queries will run most often):**
{{LIST_OF_KEY_QUERIES}}
**Scale:** {{EXPECTED_ROWS_AND_QPS}}

Provide:
1. **Schema** — tables/collections with fields, types, and constraints
2. **Indexes** — which to create and why
3. **Relationships** — foreign keys, embed vs. reference decisions
4. **Query patterns** — show how the top 3 queries look against your schema
5. **Future concerns** — what grows large, what becomes slow, when to shard/partition

Show as CREATE TABLE statements or collection schema, with comments.
```

---

## AR-06 — Caching Strategy

```
Design a caching strategy for this system.

**System:** {{SYSTEM_DESCRIPTION}}
**Performance problem:** {{CURRENT_PAIN_POINT}}
**Read/write ratio:** {{READ_WRITE_RATIO}}
**Data characteristics:** {{DATA_SIZE_AND_CHANGE_FREQUENCY}}
**Infrastructure available:** {{AVAILABLE_INFRA}}

Design the strategy covering:
1. **What to cache** — which data and at which layer (CDN, app, DB)
2. **Cache invalidation** — TTL, event-driven, or manual? How to handle stale data?
3. **Cache key design** — how to avoid collisions and enable targeted invalidation
4. **Cold start** — what happens when the cache is empty?
5. **Failure mode** — what happens when cache is unavailable?
6. **Monitoring** — what metrics to track (hit rate, eviction rate, etc.)

Include pseudocode or actual code for the most critical cache operations.
```

---

## AR-07 — Event-Driven Architecture

```
I want to redesign this synchronous flow as an event-driven system.

**Current flow:**
{{CURRENT_SYNCHRONOUS_FLOW}}

**Problems with current approach:**
{{PAIN_POINTS}}

**Infrastructure available:**
{{AVAILABLE_MESSAGE_QUEUE_OR_BROKER}}

Design the event-driven version:
1. **Event catalog** — list each event, its producer, and consumers
2. **Event schema** — structure for key events (use CloudEvents format if applicable)
3. **Consumer design** — idempotency, error handling, retry strategy
4. **Ordering guarantees** — what needs to be ordered, what doesn't
5. **Observability** — how to trace a request across services
6. **Trade-offs** — what gets harder (debugging, consistency) and how to mitigate
```

---

## AR-08 — Refactoring Roadmap

```
I need to refactor this legacy {{LANGUAGE}} codebase without breaking production. Create a roadmap.

**Current state:** {{DESCRIBE_CURRENT_CODEBASE}}
**Main problems:** {{PAIN_POINTS}}
**Team velocity impact:** {{HOW_MUCH_IT_SLOWS_YOU_DOWN}}
**Can't break:** {{CRITICAL_FUNCTIONALITY}}
**Timeline available:** {{AVAILABLE_TIME}}

Create a phased refactoring plan:
1. **Quick wins** (Week 1-2) — highest impact, lowest risk changes
2. **Structural improvements** (Month 1-2) — decoupling, extracting modules
3. **Deep rewrites** (Month 3+) — only where justified by value

For each phase:
- Specific changes to make
- How to test that nothing broke
- How to ship incrementally (avoid the big-bang rewrite)
- Risk level and mitigation

Include the "strangler fig" pattern where applicable.
```

---

## AR-09 — Security Architecture

```
Review the security architecture of this system and recommend improvements.

**System:** {{SYSTEM_DESCRIPTION}}
**Sensitive data handled:** {{DATA_SENSITIVITY}}
**Threat model (known risks):** {{KNOWN_THREATS}}
**Compliance requirements:** {{COMPLIANCE_OR_NONE}}

**Current security measures:**
{{CURRENT_SECURITY_MEASURES}}

Evaluate and recommend across:
1. **Authentication** — identity verification, session management
2. **Authorization** — who can do what, principle of least privilege
3. **Data protection** — at rest, in transit, in logs
4. **Network security** — perimeter, internal trust model
5. **Supply chain** — dependency and build security
6. **Incident response** — detection, logging, alerting

Prioritize recommendations by risk level (Critical / High / Medium) with specific implementation steps.
```

---

## AR-10 — Scalability Plan

```
This system needs to handle 10x current load. Design a scalability plan.

**Current architecture:**
{{CURRENT_ARCHITECTURE}}

**Current metrics:**
- Peak RPS: {{RPS}}
- P99 latency: {{LATENCY}}
- DB size: {{DB_SIZE}}
- Current infrastructure: {{INFRA}}

**Target:**
- 10x traffic: {{TARGET_RPS}}
- Latency target: {{LATENCY_TARGET}}
- Timeline: {{TIMELINE}}

Provide a scaled architecture:
1. **Bottleneck analysis** — what breaks first at 10x?
2. **Horizontal scaling** — what to scale and how
3. **Database strategy** — read replicas, sharding, or switch to something else?
4. **Async offloading** — what to move to queues and background jobs
5. **CDN / edge** — what can be moved closer to users
6. **Cost estimate** — rough infra cost delta at 10x

Show the before/after architecture diagram in text or pseudo-diagram.
```
