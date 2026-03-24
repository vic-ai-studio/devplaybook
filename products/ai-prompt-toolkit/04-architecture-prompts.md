# Architecture Prompts

> 12 structured prompts for AI-assisted system design, technology choices, and architectural decisions.

---

## ARC-1: System Design Review

```
Review this system design and identify weaknesses.

System description:
{{DESCRIBE_YOUR_SYSTEM}}

Architecture diagram or component list:
{{PASTE_DIAGRAM_OR_LIST}}

Scale requirements: {{SCALE}} (users, requests/sec, data volume)
Reliability target: {{SLA}} (e.g., "99.9% uptime")
Team size: {{TEAM_SIZE}}

Evaluate:
1. Single points of failure
2. Scalability bottlenecks
3. Data consistency risks
4. Security surface area
5. Operational complexity

Prioritize issues by impact and suggest concrete improvements.
```

---

## ARC-2: Technology Selection

```
Help me choose the right technology for this use case.

What I'm building: {{DESCRIBE_WHAT_YOU_NEED}}
Scale: {{SCALE}}
Team's existing expertise: {{TECH_THE_TEAM_KNOWS}}
Budget constraints: {{BUDGET_NOTES}}
Timeline: {{LAUNCH_TIMELINE}}

Options I'm considering:
1. {{OPTION_1}}
2. {{OPTION_2}}
3. {{OPTION_3}}

Compare these options on:
- Fit for this specific use case
- Learning curve for the team
- Long-term maintenance burden
- Cost at scale
- Community and ecosystem health

Give a recommendation with reasoning. Don't hedge — pick one.
```

---

## ARC-3: Microservices vs. Monolith

```
Should I use microservices or a monolith for this system?

System description: {{DESCRIBE_THE_SYSTEM}}
Current stage: {{STAGE}} (prototype / startup / scaling / enterprise)
Team structure: {{NUMBER_OF_TEAMS_AND_SIZE}}
Deployment frequency target: {{HOW_OFTEN_TO_DEPLOY}}
Current pain points: {{WHAT_HURTS_NOW}}

Give me:
1. An honest assessment for my specific situation
2. The risks of choosing microservices too early
3. The risks of staying monolithic too long
4. A clear recommendation with criteria for when to revisit it
5. If recommending a middle path, describe it precisely
```

---

## ARC-4: API Design

```
Design the API for this feature or service.

Feature/service: {{DESCRIBE_WHAT_IT_DOES}}
Consumers: {{WHO_CALLS_THIS_API}} (internal services, mobile app, third parties)
Expected request volume: {{VOLUME}}
Data entities involved: {{LIST_ENTITIES}}

Design:
1. RESTful endpoint structure (method + path + purpose)
2. Request/response schemas (with example JSON)
3. Authentication and authorization approach
4. Pagination, filtering, and sorting conventions
5. Error response format
6. Versioning strategy

Explain the reasoning behind any non-obvious design choices.
```

---

## ARC-5: Database Selection

```
Help me choose the right database for this use case.

Data model description: {{DESCRIBE_YOUR_DATA}}
Access patterns: {{HOW_YOU_QUERY_DATA}} (e.g., "mostly reads", "time-series", "graph traversals")
Scale: {{DATA_VOLUME + QPS}}
Consistency requirements: {{STRICT_ACID or EVENTUAL_OK}}
Team's DB experience: {{WHAT_DATABASES_TEAM_KNOWS}}

Options I'm considering: {{LIST_OPTIONS or "suggest for me"}

Compare on:
- Query pattern fit
- Operational complexity
- Scaling characteristics
- Cost
- When this choice becomes a problem

Make a clear recommendation.
```

---

## ARC-6: Caching Strategy

```
Design a caching strategy for this system.

What's being cached: {{DESCRIBE_DATA_OR_RESPONSES}}
Current performance problem: {{DESCRIBE_LATENCY_OR_LOAD}}
Data characteristics:
- How often does it change? {{CHANGE_FREQUENCY}}
- How large is a typical entry? {{SIZE}}
- How many unique keys? {{CARDINALITY}}

Constraints: {{BUDGET, INFRA, OR CONSISTENCY_REQUIREMENTS}}

Recommend:
1. What to cache and what not to cache
2. Cache layer (in-process, Redis, CDN, etc.) and why
3. Cache invalidation strategy
4. TTL recommendations
5. What to do on cache miss (thundering herd prevention)
6. How to monitor cache health
```

---

## ARC-7: Event-Driven Architecture Design

```
Design an event-driven architecture for this use case.

System description: {{DESCRIBE_CURRENT_OR_PLANNED_SYSTEM}}
Why events? {{WHAT_PROBLEM_ARE_EVENTS_SOLVING}}
Services involved: {{LIST_SERVICES_OR_COMPONENTS}}
Scale: {{EVENT_VOLUME + LATENCY_REQUIREMENTS}}

Design:
1. Event taxonomy (what events to emit, naming conventions)
2. Event schema (with example payload)
3. Message broker selection (Kafka / RabbitMQ / SQS / etc.) with reasoning
4. Consumer group strategy
5. Error handling (dead letter queues, retry policy)
6. Event ordering and idempotency approach
7. How to handle schema evolution

Flag the top 3 failure modes to design against.
```

---

## ARC-8: Scalability Planning

```
Design a scaling strategy for this system.

Current architecture: {{DESCRIBE_CURRENT_SYSTEM}}
Current scale: {{CURRENT_USERS + QPS + DATA}}
Target scale: {{TARGET_IN_12_MONTHS}}
Current bottleneck: {{WHERE_THINGS_ARE_SLOW_OR_FAILING}}

Design a scaling roadmap:
1. Identify all current bottlenecks (database, compute, network, storage)
2. Recommend scaling approach for each (vertical, horizontal, sharding, etc.)
3. Order the changes by impact vs. complexity
4. Identify what NOT to optimize yet (premature optimization risks)
5. Estimate when each bottleneck becomes critical at the target scale

Be opinionated. Tell me what to do first.
```

---

## ARC-9: Security Architecture Review

```
Review the security architecture of this system.

System description: {{DESCRIBE_SYSTEM}}
Data sensitivity: {{WHAT_DATA_YOU_STORE}} (PII, financial, health, etc.)
Threat model: {{WHO_MIGHT_ATTACK + HOW}} (external attackers, compromised employees, etc.)
Compliance requirements: {{SOC2 / GDPR / HIPAA / PCI / etc. or "none"}}

Architecture diagram or component list:
{{PASTE_ARCHITECTURE}}

Evaluate:
1. Authentication and authorization design
2. Data encryption (in transit and at rest)
3. Network segmentation and access control
4. Secret management
5. Audit logging
6. Incident response readiness

Prioritize findings by risk and provide specific remediation steps.
```

---

## ARC-10: Multi-Tenancy Design

```
Design a multi-tenancy strategy for this SaaS product.

Product description: {{DESCRIBE_YOUR_SAAS}}
Number of expected tenants: {{SCALE}}
Tenant isolation requirements: {{STRICT_ISOLATION or SHARED_OK}}
Compliance requirements: {{GDPR / HIPAA / SOC2 / etc.}}
Current tech stack: {{STACK}}

Compare isolation approaches:
1. Shared database, shared schema (row-level security)
2. Shared database, separate schemas
3. Separate databases per tenant
4. Separate infrastructure per tenant

Recommend the right approach for my scale and requirements. Include:
- Data isolation implementation
- Performance isolation strategy
- Onboarding/offboarding process
- Backup and restore per tenant
```

---

## ARC-11: Migration Architecture

```
Design an architecture for migrating from {{OLD_SYSTEM}} to {{NEW_SYSTEM}}.

Current system: {{DESCRIBE_OLD_SYSTEM}}
Target system: {{DESCRIBE_NEW_SYSTEM}}
Data volume: {{DATA_SIZE}}
Downtime tolerance: {{MAX_DOWNTIME}} (e.g., "zero downtime", "up to 4 hours on weekend")
Team size: {{TEAM_SIZE}}
Timeline: {{MIGRATION_DEADLINE}}

Design the migration approach:
1. Migration strategy (big bang / strangler fig / parallel run)
2. Data migration plan (batch size, ordering, validation)
3. Rollback strategy
4. Testing plan before cutover
5. Monitoring during migration
6. Communication plan for downtime (if any)

Identify the 3 highest-risk steps in the migration.
```

---

## ARC-12: Observability Design

```
Design an observability strategy for this system.

System: {{DESCRIBE_SYSTEM}}
Team size: {{TEAM_SIZE}}
Current observability tools: {{WHAT_YOU_ALREADY_HAVE}}
Primary pain points: {{WHAT_YOU_CANT_SEE_TODAY}}
On-call structure: {{HOW_ONCALL_WORKS}}

Design:
1. Logging strategy (what to log, structured format, retention)
2. Metrics (golden signals: latency, traffic, errors, saturation)
3. Distributed tracing (where to instrument)
4. Alerting philosophy (symptom-based vs. cause-based)
5. Dashboard design (what oncall needs to see first)
6. SLI/SLO recommendations for this system

Focus on reducing MTTD (mean time to detect) and MTTR (mean time to resolve).
```

---

*AI Prompt Engineering Toolkit v1.0 — DevPlaybook*
