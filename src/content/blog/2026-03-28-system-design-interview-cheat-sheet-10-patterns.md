---
title: "System Design Interview Cheat Sheet: 10 Patterns Every Developer Must Know"
description: "Master the 10 essential system design patterns for technical interviews and production systems. Load balancing, caching, sharding, CAP theorem, consistent hashing, message queues, CDN, API gateways, and more — with ASCII diagrams and real-world examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["system-design", "interview", "architecture", "distributed-systems", "backend", "scalability"]
readingTime: "14 min read"
---

System design interviews are where engineers either shine or freeze up. Unlike coding questions that have a single correct answer, system design is open-ended — and that's exactly why preparation matters. The good news: most systems at scale reuse the same 10 patterns. Master them, and you can reason about any large-scale architecture.

This cheat sheet covers each pattern with what it is, when to use it, how it works under the hood, and real-world examples from companies you know.

---

## Pattern 1: Load Balancing

### What It Is

A load balancer distributes incoming traffic across multiple servers so no single machine becomes a bottleneck.

```
          ┌──────────────────┐
Clients → │   Load Balancer  │ → Server A
          │  (Round Robin /  │ → Server B
          │  Least Conn /    │ → Server C
          │  IP Hash)        │
          └──────────────────┘
```

### Algorithms

| Algorithm | Use Case |
|-----------|----------|
| Round Robin | Equal capacity servers, stateless apps |
| Least Connections | Long-lived connections, variable request duration |
| IP Hash | Session stickiness without a session store |
| Weighted Round Robin | Mixed capacity servers |

### Layer 4 vs Layer 7

- **L4 (Transport)**: Routes based on IP/TCP. Fast, no content inspection. Used in AWS NLB.
- **L7 (Application)**: Routes based on HTTP headers, URL paths, cookies. Flexible but slower. Used in AWS ALB, Nginx.

### When to Use

Any stateless service handling more traffic than a single server can handle. Always the first answer when asked "how do you scale X?"

**Real-world**: Netflix uses a combination of L4 (AWS NLB) for TCP connections and L7 (Zuul/Envoy) for HTTP routing at the API gateway layer.

---

## Pattern 2: Caching

### What It Is

Store frequently-accessed data in fast memory (RAM) so you don't hit slower storage (disk, database, network) repeatedly.

```
Request → Cache Hit?
              │
         YES──┴──NO
          │       │
        Return  Query DB
        cached  → Cache result
        data    → Return data
```

### Cache Invalidation Strategies

The hardest problem in distributed systems. Your options:

**TTL (Time-to-Live)**: Data expires after N seconds. Simple but may serve stale data.

**Write-through**: Write to cache and DB simultaneously. Consistent but adds write latency.

**Write-back (Write-behind)**: Write to cache first, async sync to DB. Fast writes, risk of data loss on crash.

**Cache-aside (Lazy Loading)**: App checks cache first, populates on miss. Most common pattern.

### Eviction Policies

- **LRU (Least Recently Used)**: Evict data not accessed recently. Best general-purpose choice.
- **LFU (Least Frequently Used)**: Evict data accessed least often. Good for long-lived hot data.
- **FIFO**: Simple queue-based eviction. Rarely optimal.

### Cache Hierarchy

```
Browser Cache → CDN Edge Cache → API Gateway Cache → App Cache (Redis) → DB Query Cache → Disk
     ms               10ms              10ms              1ms               5ms           10ms+
```

**Real-world**: Twitter's Redis cluster caches user timelines, reducing DB load by ~95%. Facebook uses Memcached at massive scale for social graph data.

---

## Pattern 3: Database Sharding

### What It Is

Horizontal partitioning — splitting a large database into smaller pieces (shards) distributed across multiple servers.

```
Users table (1B rows)
         │
    ┌────┴────┐
    │         │
Shard A    Shard B    Shard C
(IDs 0-    (IDs 333M- (IDs 666M-
333M)      666M)      1B)
```

### Sharding Strategies

**Range-based**: Shard by value ranges (user IDs 0-1M on shard A, etc.). Simple but can create hot spots.

**Hash-based**: `shard = hash(user_id) % num_shards`. Even distribution but resharding is painful.

**Directory-based**: A lookup service maps keys to shards. Flexible but adds a single point of failure.

**Geo-based**: Route users to shards by geography. Great for latency, complex for global queries.

### The Resharding Problem

When you add a new shard, you need to move data. **Consistent hashing** solves this — only `K/N` keys move on average when adding a node (where K = keys, N = nodes).

### Pitfalls

- **Cross-shard queries**: JOINs across shards are expensive. Denormalize or use application-level joins.
- **Hot shards**: Celebrity users generate more traffic. Use composite shard keys.
- **Transactions**: ACID guarantees don't span shards without distributed transactions (2PC).

**Real-world**: Instagram sharded by user ID with PostgreSQL. Pinterest uses MySQL shards and a custom shard manager.

---

## Pattern 4: CAP Theorem

### What It Is

In any distributed data store, you can only guarantee **two of three** properties simultaneously:

- **C (Consistency)**: Every read receives the most recent write or an error.
- **A (Availability)**: Every request receives a response (not necessarily the latest data).
- **P (Partition Tolerance)**: System continues operating despite network partitions.

```
        C
       / \
      /   \
     /     \
    A───────P

CA: Traditional RDBMS (not distributed)
CP: HBase, ZooKeeper, MongoDB (in some configs)
AP: Cassandra, DynamoDB, CouchDB
```

### Network Partitions Are Not Optional

In any real distributed system, partitions happen. So the real choice is **CP vs AP** — do you prioritize consistency or availability when a partition occurs?

### PACELC Extension

CAP only describes partition behavior. PACELC also considers the **Else** case (no partition): trade-off between **Latency** and **Consistency**.

| System | Partition | Else |
|--------|-----------|------|
| Cassandra | AP | EL (low latency, eventual consistency) |
| DynamoDB | AP | EL |
| PostgreSQL | CP | EC (consistent, higher latency) |
| Spanner | CP | EC |

**Interview tip**: When asked about a database choice, mention CAP properties. "For a payment system, I'd choose CP (PostgreSQL/Spanner) because consistency is critical. For a social feed, AP (Cassandra) is fine — showing slightly stale data is acceptable."

---

## Pattern 5: Consistent Hashing

### What It Is

A hashing technique where adding or removing nodes minimizes key remapping. Essential for distributed caches and databases.

### How It Works

Imagine a hash ring from 0 to 2^32:

```
          0
         /|\
        / | \
    NodeC  NodeA
       \   /
        NodeB
         |
        2^32
```

Each key maps to the first node encountered clockwise on the ring. When a node is added or removed, only the keys on that node's segment are remapped — on average `K/N` keys.

### Virtual Nodes (Vnodes)

Real-world implementations (Cassandra, DynamoDB) use virtual nodes: each physical server owns multiple points on the ring. This:
- Ensures even distribution when servers have different capacities
- Makes failure recovery faster (load spreads across more nodes)

**Real-world**: Amazon DynamoDB and Apache Cassandra both use consistent hashing with virtual nodes as their core partitioning mechanism.

---

## Pattern 6: Message Queues

### What It Is

An asynchronous communication layer between services. Producer writes to the queue; consumer reads at its own pace.

```
Producer → [Queue] → Consumer A
                  → Consumer B
                  → Consumer C
```

### Key Concepts

**At-least-once delivery**: Messages may be delivered multiple times. Consumers must be **idempotent**.

**At-most-once delivery**: Messages may be lost but never duplicated. Used when occasional loss is acceptable (metrics, logs).

**Exactly-once delivery**: Guaranteed no duplication or loss. Very expensive to implement — requires distributed transactions.

### Dead Letter Queue (DLQ)

Messages that fail processing repeatedly get moved to a DLQ for manual inspection. Critical for production reliability.

### When to Use

- **Decouple services**: Order service doesn't wait for notification service.
- **Handle traffic spikes**: Queue absorbs burst traffic; consumers process at steady rate.
- **Background jobs**: Email sending, image processing, report generation.
- **Event sourcing**: Rebuild state from event log.

### Kafka vs RabbitMQ vs SQS

| | Kafka | RabbitMQ | AWS SQS |
|-|-------|----------|---------|
| Model | Log (pull) | Queue (push) | Queue (pull) |
| Throughput | Millions/sec | Thousands/sec | High |
| Replay | Yes (retention) | No | No |
| Use case | Event streaming | Task queues | Simple queues |

**Real-world**: LinkedIn built Kafka. Uber uses Kafka for trip events (millions/second). Airbnb uses RabbitMQ for booking workflows.

---

## Pattern 7: CDN (Content Delivery Network)

### What It Is

A geographically distributed network of servers that cache static content close to end users.

```
User (Tokyo) → CDN Edge (Tokyo) → HIT: serve cached file
                                 → MISS: pull from Origin (US) → cache → serve

User (London) → CDN Edge (London) → HIT: serve from London cache
```

### Types of Content

**Static**: Images, CSS, JS, fonts — cache indefinitely with content-hash filenames.

**Dynamic**: Personalized pages — harder to cache, use edge computing (Cloudflare Workers, Lambda@Edge) for logic.

**Streaming**: Video chunks — CDN is essential. Netflix uses its own CDN (Open Connect).

### Cache Control Headers

```http
Cache-Control: public, max-age=31536000, immutable  # 1 year for hashed assets
Cache-Control: public, max-age=3600                 # 1 hour for semi-static
Cache-Control: no-store                             # Never cache (user data)
```

### CDN Providers

| Provider | Strength |
|----------|----------|
| Cloudflare | DDoS protection, Workers (edge compute), free tier |
| AWS CloudFront | Deep AWS integration, Lambda@Edge |
| Fastly | Instant purge, VCL customization |
| Akamai | Largest network, enterprise scale |

**Real-world**: GitHub Pages uses Fastly. npm registry uses Cloudflare. Disney+ delivers video via AWS CloudFront.

---

## Pattern 8: API Gateway

### What It Is

A single entry point for all client requests to your microservices. Handles cross-cutting concerns so individual services don't have to.

```
Mobile App ──┐
Web App ─────┤  API Gateway  ─── Auth Service
Partner API ─┘  │ Auth          ─── User Service
                │ Rate limit    ─── Order Service
                │ Route         ─── Payment Service
                │ Transform     ─── Notification Service
```

### Core Responsibilities

1. **Authentication/Authorization**: Validate JWT, API keys, OAuth tokens before hitting services.
2. **Rate Limiting**: Throttle by IP, user, or API key. Protect backend from abuse.
3. **Request Routing**: Route `/api/users/*` to User Service, `/api/orders/*` to Order Service.
4. **Protocol Translation**: REST to gRPC, WebSocket to HTTP.
5. **Request/Response Transformation**: Aggregate multiple backend calls into one client response.
6. **Logging & Monitoring**: Centralized access logs, distributed tracing injection.

### Gateway vs Service Mesh

- **API Gateway**: North-south traffic (external to internal). User-facing.
- **Service Mesh** (Istio, Linkerd): East-west traffic (service to service). Handles retries, circuit breaking, mTLS internally.

**Real-world**: Netflix Zuul, Kong (open source), AWS API Gateway, Google Cloud Apigee.

---

## Pattern 9: Circuit Breaker

### What It Is

Prevents cascading failures by detecting when a downstream service is failing and short-circuiting calls to it.

```
States:
CLOSED → normal, passes all requests
  │ (failure threshold exceeded)
  ↓
OPEN → rejects all requests immediately (fast fail)
  │ (timeout period elapsed)
  ↓
HALF-OPEN → allows limited test requests
  │ (success) → back to CLOSED
  │ (failure) → back to OPEN
```

### Why It Matters

Without circuit breakers: Service A calls Service B (failing). A waits for timeout (30s). A's thread pool exhausts. A starts failing. Service C calling A now fails too. Entire system cascades down.

With circuit breakers: After N failures, open the circuit. A returns cached data or error immediately. Thread pool stays healthy. System degrades gracefully.

### Configuration

```python
# Example with resilience4j (Java) or tenacity (Python)
circuit_breaker = CircuitBreaker(
    failure_threshold=5,        # Open after 5 failures
    recovery_timeout=60,        # Try recovery after 60s
    expected_exception=TimeoutError,
)
```

**Real-world**: Netflix Hystrix (now deprecated, replaced by Resilience4j). Amazon extensively uses circuit breakers across its service mesh.

---

## Pattern 10: Write-Ahead Log (WAL) / Event Sourcing

### What It Is

Instead of storing current state, store every event/change. Reconstruct state by replaying events.

```
Traditional DB:      Event Store:
user.balance = 100   → [DEPOSIT $100, WITHDRAW $30, DEPOSIT $50]
                       Replay: 0 + 100 - 30 + 50 = 120

                       But also: full audit trail, time-travel, CQRS
```

### Benefits

- **Audit trail**: Know exactly what happened and when.
- **Time travel**: Reconstruct state at any point in time.
- **Event replay**: Rebuild read models, feed new services.
- **Debugging**: Reproduce bugs by replaying events.

### CQRS (Command Query Responsibility Segregation)

Often paired with event sourcing:
- **Write side**: Handles commands, emits events.
- **Read side**: Subscribes to events, builds optimized read models.

```
Write Model ──events──→ Kafka ──→ Read Model (denormalized, fast queries)
(normalized)                       (user timeline, search index, analytics)
```

**Real-world**: Stripe uses event sourcing for payment state. Shopify uses it for order management. Martin Fowler coined the pattern.

---

## Quick Reference: When to Use What

| Symptom | Pattern |
|---------|---------|
| Single server overloaded | Load Balancer |
| DB queries too slow | Cache (Redis/Memcached) |
| DB too large for one server | Sharding + Consistent Hashing |
| Slow CDN-served pages | CDN cache + proper Cache-Control |
| Services too tightly coupled | Message Queue (Kafka/SQS) |
| Inconsistent cross-service data | CAP reasoning → choose CP or AP |
| All requests going to one entry point | API Gateway |
| Cascading failures | Circuit Breaker |
| Need audit trail / time-travel | Event Sourcing / WAL |

---

## Interview Strategy

1. **Clarify requirements first**: Ask about scale (users/day, data size), consistency needs, latency SLAs.
2. **Rough size estimate**: Back-of-envelope math shows you think about scale.
3. **High-level design first**: Don't dive into details without sketching the big picture.
4. **Apply patterns incrementally**: Start simple, then add complexity where needed.
5. **Acknowledge trade-offs**: Every choice has a cost. Show you know them.

The best system design answers aren't the most complex — they're the most *appropriate* for the given constraints. These 10 patterns give you the vocabulary to have that conversation confidently.
