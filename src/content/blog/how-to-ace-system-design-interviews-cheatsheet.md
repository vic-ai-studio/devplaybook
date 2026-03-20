---
title: "How to Ace System Design Interviews (Cheatsheet + Examples)"
description: "A practical system design interview cheatsheet covering the exact framework, common patterns, and worked examples to land senior engineer offers."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["interview", "system-design", "career", "senior-engineer"]
readingTime: "14 min read"
ogDescription: "A practical system design interview cheatsheet covering the exact framework, common patterns, and worked examples to land senior engineer offers."
---

System design interviews have a reputation for being vague and impossible to prepare for. That reputation is wrong. There's a repeatable framework, a finite set of patterns, and a clear rubric that interviewers use. This guide gives you all three.

## What Interviewers Are Actually Evaluating

Before the framework, understand the rubric. Interviewers are not testing whether you can design a perfect system. They're evaluating:

1. **Structured thinking** — Can you approach an ambiguous problem systematically?
2. **Tradeoff awareness** — Do you understand why you're making each decision?
3. **Communication** — Can you explain a complex system clearly while driving the conversation?
4. **Scale intuition** — Do you have realistic estimates for latency, throughput, and storage?
5. **Practical judgment** — Would this system actually work, and would a team be able to build it?

A candidate who builds a slightly suboptimal architecture while clearly explaining every tradeoff will beat one who silently draws a perfect diagram.

---

## The 6-Step Framework

### Step 1: Clarify Requirements (5 minutes)

Never start designing immediately. Spend 4–5 minutes asking questions:

**Functional requirements:**
- What are the core use cases? (e.g., post a tweet, follow a user, view feed)
- What does success look like for the user?
- What's out of scope for this interview?

**Non-functional requirements:**
- Scale: How many users? Read/write ratio?
- Latency: What's the acceptable response time?
- Consistency: Strong consistency required, or is eventual OK?
- Availability: What's the SLA? (99.9% = 8.7hr downtime/year; 99.99% = 52min)
- Durability: What happens if data is lost?

**Clarifying numbers example for "Design Twitter":**
- 300M daily active users
- 500M tweets/day (read-heavy: 100:1 read/write ratio)
- Tweets must appear within 5 seconds
- Timeline reads must be < 200ms
- Data must never be lost

### Step 2: Capacity Estimation (3 minutes)

Quick back-of-envelope math signals experience:

**Tweet storage example:**
- 500M tweets/day × 280 bytes avg = 140GB/day → ~50TB/year
- With media: 10% have images (avg 200KB) → 10GB/day just for images
- CDN cost matters here

**Request rate:**
- 500M tweets/day → 6,000 writes/second
- 100:1 read ratio → 600,000 reads/second
- This tells you: reads need heavy caching, writes need async processing

**Tip:** Memorize common scale thresholds: 10K RPS needs horizontal scaling, 100K RPS needs serious caching architecture, 1M RPS needs CDN + edge computing.

### Step 3: Define the API (3 minutes)

Sketch the core API endpoints. This forces you to think about data contracts before infrastructure:

```
POST /tweets
  body: { content: string, media?: string[] }
  response: { tweetId: string, createdAt: timestamp }

GET /timeline/:userId?cursor=&limit=
  response: { tweets: Tweet[], nextCursor: string }

POST /follow
  body: { followeeId: string }
```

Good API design reveals your understanding of the product and surfaces edge cases early (pagination, idempotency, auth).

### Step 4: High-Level Design (10 minutes)

Draw the core components and data flow. Start simple, then layer in complexity:

**Core components to include:**
- Client (web/mobile)
- Load balancer / API Gateway
- Application servers
- Primary database
- Cache layer
- Message queue (if async needed)
- CDN (if media/static assets)

**Example: Twitter timeline high-level design**

```
Client → CDN (static assets)
      → Load Balancer → Tweet Service → Write DB (PostgreSQL)
                                      → Message Queue (Kafka)
                     → Timeline Service ← Cache (Redis)
                                        ← Timeline DB (read replicas)
                     → Fan-out Worker ← Kafka consumer
                                      → Redis (pre-computed timelines)
```

Explain each component as you draw it. "I'm using Kafka here because we need async fan-out — when a celebrity posts, we can't block their write while we update 50M followers' timelines."

### Step 5: Deep Dive (15 minutes)

After the high-level diagram, the interviewer will direct you to go deeper on specific components. Common deep-dives:

**Database design:** Schema, indexes, sharding strategy
**Caching:** What to cache, cache invalidation, eviction policy
**Fan-out problem:** Push vs pull model for feed generation
**Failure handling:** What happens when a service goes down?
**Bottleneck identification:** Where will this break at scale?

**Pro tip:** Don't wait to be asked. After your high-level, say: "The most interesting scaling challenge here is the fan-out problem. Want me to go deep there first, or is there another area you'd like to focus on?"

### Step 6: Address Bottlenecks and Trade-offs (5 minutes)

Proactively identify weaknesses:

- "This design has a single write path — at 100K writes/second we'd need to shard the DB"
- "The pre-computed timeline approach (fan-out on write) breaks for celebrities with millions of followers — we'd need a hybrid pull model for high-follower accounts"
- "The Redis cache doesn't handle cache-aside invalidation perfectly — we'd see some stale timelines for a few seconds"

Showing awareness of a system's limits is more impressive than pretending the system is perfect.

---

## Essential Patterns Cheatsheet

### Scalability Patterns

**Horizontal scaling** — Add more servers behind a load balancer. Stateless services scale easily; stateful services need session affinity or external state storage.

**Database replication** — Primary for writes, replicas for reads. Lag of 50–500ms is acceptable for most read workloads.

**Database sharding** — Partition data by key (userId, geoHash, etc). Range sharding (sequential IDs) is simple but creates hot spots. Hash sharding distributes evenly but loses range queries.

**Caching** — Redis for small-medium data with complex access patterns. Memcached for pure key-value at massive scale. Always define your cache invalidation strategy.

**CDN** — For static assets and read-heavy global content. Pull CDN (Cloudflare, Fastly) for dynamic content; push CDN for static assets you control.

### Reliability Patterns

**Circuit breaker** — After N failures, open the circuit and return errors fast instead of waiting for timeouts. Prevents cascade failures.

**Retry with exponential backoff** — Retry failed requests with increasing delays. Always add jitter to prevent thundering herds.

**Bulkhead** — Isolate failures. If the recommendation service dies, the core feed should keep working.

**Health checks + auto-restart** — Container orchestration (Kubernetes) handles this automatically. Mention it to show operational awareness.

### Data Patterns

**Event sourcing** — Store events (what happened), not state (what is now). Enables time travel, audit logs, and replay. Complex to query.

**CQRS (Command Query Responsibility Segregation)** — Separate read and write models. Reads hit a denormalized read replica optimized for query patterns.

**Eventual consistency** — Acceptable for social feeds, shopping carts, DNS. Not acceptable for financial transactions, inventory locks.

---

## Common System Design Questions + Key Decisions

### Design a URL Shortener

**Key decisions:**
- ID generation: random vs. sequential (sequential is predictable and has range attacks)
- Encoding: base62 (a-z, A-Z, 0-9) for 62^6 = 56B short URLs
- Storage: Key-value store (DynamoDB, Redis) — no relational data needed
- Redirect: 301 (permanent, cached by browser) vs 302 (temporary, goes through server for analytics)
- Scale: 1B URLs → ~100GB for mappings — simple horizontally sharded KV store

### Design a Rate Limiter

**Key decisions:**
- Algorithm: Token bucket (burst-friendly), leaky bucket (smooth), sliding window log (accurate), fixed window (simple)
- Storage: Redis with atomic increment + TTL
- Distributed: Redis Cluster for multi-region; each region has its own count (approximate global limiting)
- Headers: Return `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`

### Design a Notification System

**Key decisions:**
- Multi-channel: Email (SES/SendGrid), push (FCM/APNs), SMS (Twilio)
- Queue per channel: Kafka topics prevent one slow channel from blocking others
- Priority queues: Critical alerts (security) bypass normal queue limits
- Deduplication: Content hash + time window to prevent duplicate sends
- Delivery tracking: Webhook callbacks, event log for debugging

---

## Quick Reference: Numbers Every Engineer Should Know

| Operation | Latency |
|-----------|---------|
| L1 cache reference | 0.5 ns |
| L2 cache reference | 7 ns |
| RAM access | 100 ns |
| SSD read | 100 µs |
| Network (same DC) | 0.5 ms |
| Network (cross-region) | 150 ms |
| HDD seek | 10 ms |

| Unit | Scale |
|------|-------|
| 1 KB | 1,000 bytes |
| 1 MB | 1M bytes |
| 1 GB | 1B bytes |
| 1 TB | 1T bytes |
| 1 million requests/day | ~12 requests/second |
| 100 million requests/day | ~1,200 requests/second |

---

## The One Thing That Separates Good from Great

Candidates who consistently get offers in system design interviews do one thing differently: **they drive the conversation**.

They don't wait to be asked about caching — they say "Let me talk about the caching strategy I'd use here." They don't wait to be challenged on a decision — they surface the tradeoff themselves. They make the interview feel like a collaborative engineering discussion, not an interrogation.

Practice narrating your thought process out loud. The silence of drawing a diagram without explaining it costs you points even when the diagram is correct.

---

## Practice This Framework

The best way to internalize this framework is to walk through 10–15 systems using it consistently. For a structured practice tool, the **[DevToolkit Starter Kit](https://devplaybook.gumroad.com)** includes a system design practice template and a library of worked examples with annotated tradeoffs.

Also check our [Senior Developer Interview Checklist](/blog/senior-developer-interview-checklist) for the broader interview preparation roadmap, including behavioral questions and algorithm study schedule.
