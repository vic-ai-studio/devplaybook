# System Design Interview Questions

**50 questions** covering scalability, distributed systems, database design, architecture patterns, and real-world design problems.

---

## Core Concepts (15 questions)

### 1. How do you approach a system design interview? `[Mid]`

**Answer:**
Use the SNAKE framework:
1. **Scope** — Clarify requirements (5 min): functional + non-functional, scale estimates, constraints
2. **Numbers** — Estimate: users, requests/sec, data size, bandwidth
3. **Architecture** — High-level design: major components, data flow
4. **Key components** — Deep dive: data model, APIs, algorithms for the most critical parts
5. **Edge cases** — Failures, bottlenecks, improvements

**Key behaviors:** Think aloud, ask clarifying questions before designing, don't jump to solutions. Interviewers evaluate your thought process, not just the final design.

---

### 2. What is load balancing and what are the common algorithms? `[Mid]`

**Answer:**
Load balancers distribute traffic across multiple servers.

**Algorithms:**
- **Round Robin** — requests distributed sequentially. Simple, assumes equal server capacity.
- **Weighted Round Robin** — servers with more capacity get proportionally more requests.
- **Least Connections** — new request goes to server with fewest active connections. Good for variable request durations.
- **IP Hash** — client IP determines which server. Ensures same client hits same server (session affinity).
- **Least Response Time** — routes to fastest server. Requires monitoring.
- **Random** — random server selection. Simple and effective for homogeneous servers.

**Layer 4 vs Layer 7:** L4 (TCP) faster but can't inspect content. L7 (HTTP) can route based on URL, headers, cookies.

---

### 3. What is CAP theorem? `[Mid]`

**Answer:**
In a distributed system with network partitions, you can only guarantee 2 of 3:

- **Consistency** — All nodes see the same data at the same time (every read returns the most recent write)
- **Availability** — Every request receives a response (may not be the latest data)
- **Partition Tolerance** — System continues operating despite network partitions

**In practice:** Network partitions happen. You must choose CP or AP:

- **CP:** Return error if data may be inconsistent (banks, inventory systems). Examples: HBase, Zookeeper
- **AP:** Return potentially stale data rather than error (social feeds, DNS). Examples: Cassandra, DynamoDB (default), CouchDB

**Note:** PACELC extends CAP to also consider latency vs. consistency tradeoff when no partition exists.

---

### 4. What is consistent hashing? `[Senior]`

**Answer:**
Consistent hashing minimizes remapping when servers are added/removed to a distributed hash ring.

**Problem with naive hashing:** `server = hash(key) % N`. When N changes, almost all keys remap — cache misses everywhere.

**Consistent hashing:**
1. Place servers on a hash ring (0 to 2^32)
2. Key maps to the next server clockwise on the ring
3. Adding a server only takes keys from its clockwise neighbor
4. Only K/N keys remap on average

**Virtual nodes:** Each physical server has multiple positions on the ring to distribute load evenly.

**Used by:** Amazon DynamoDB, Apache Cassandra, Memcached client (ketama), Nginx upstream hashing.

---

### 5. What are the different types of databases and when to use each? `[Mid]`

**Answer:**
| Type | Best For | Examples |
|------|----------|---------|
| Relational (SQL) | Complex queries, transactions, strong consistency | PostgreSQL, MySQL |
| Document | Flexible schema, nested data, rapid iteration | MongoDB, Firestore |
| Key-Value | Simple lookups, caching, sessions | Redis, DynamoDB |
| Wide-Column | Massive scale, time-series, write-heavy | Cassandra, HBase |
| Graph | Highly connected data (social networks, recommendations) | Neo4j, Amazon Neptune |
| Time-Series | Metrics, IoT, logs with timestamps | InfluxDB, TimescaleDB |
| Search | Full-text search, relevance ranking | Elasticsearch, Solr |
| In-Memory | Sub-millisecond access, caching | Redis, Memcached |

---

### 6. What is a microservices architecture? `[Mid]`

**Answer:**
Microservices decompose an application into small, independently deployable services, each responsible for a specific business capability.

**Characteristics:**
- Each service owns its data (no shared databases)
- Communicate via APIs (REST, gRPC) or events (message queues)
- Can be deployed, scaled, and updated independently
- Each can use the best technology for its purpose

**vs Monolith:**
| | Monolith | Microservices |
|---|---|---|
| Deployment | Deploy entire app | Deploy single service |
| Scaling | Scale entire app | Scale individual services |
| Complexity | Code simple, ops simple | Code complex, ops complex |
| Team size | Small teams | Large organizations |
| Data consistency | Easy (one DB) | Hard (distributed) |

**When to use:** Large teams with clear domain boundaries. Start with a modular monolith, break apart when needed.

---

### 7. What is a message queue vs an event streaming platform? `[Senior]`

**Answer:**
| | Message Queue (RabbitMQ, SQS) | Event Streaming (Kafka) |
|---|---|---|
| Message retention | Deleted after consumed | Retained (configurable period) |
| Consumers | One consumer per message | Multiple consumer groups, each reads full stream |
| Replay | Not supported | Can replay from any offset |
| Ordering | Per queue | Per partition |
| Throughput | Moderate | Very high (millions/sec) |
| Use case | Task queues, async jobs | Event sourcing, audit logs, real-time analytics |

**Kafka use cases:** Audit trail, activity tracking, metrics pipeline, log aggregation, stream processing (with Flink/Spark Streaming).

---

### 8. What is database replication and what types exist? `[Mid]`

**Answer:**
Replication copies data from primary to one or more replicas for availability and read scaling.

**Types:**
- **Single-leader (master-replica):** All writes to primary, replicated to replicas. Reads can go to replicas. Most common.
- **Multi-leader:** Multiple primaries accept writes. Good for multi-datacenter. Conflict resolution needed.
- **Leaderless (Dynamo-style):** Any replica can accept writes. Quorum reads/writes (W+R > N). No single point of failure.

**Synchronous vs Asynchronous replication:**
- Sync: Primary waits for replica to confirm before returning. Strong consistency, slower writes.
- Async: Primary returns immediately, replication happens in background. Faster, but can lose data on primary failure.

---

### 9. What is service discovery in microservices? `[Senior]`

**Answer:**
In dynamic environments (Kubernetes, cloud), service instances start/stop constantly. Service discovery allows services to find each other without hardcoded addresses.

**Client-side discovery:** Client queries a service registry (Consul, Eureka), picks an instance, makes request. Client handles load balancing.

**Server-side discovery:** Client makes request to load balancer/API gateway, which queries registry and routes. Simpler client.

**DNS-based:** Service name resolves to load balancer or multiple IPs. Kubernetes DNS is an example.

**Kubernetes:** Services get a DNS name. kube-proxy handles routing. Pod IPs change; service IPs are stable.

---

### 10. What is an API gateway? `[Mid]`

**Answer:**
An API gateway is a single entry point for all clients. It handles:
- **Routing** — direct requests to appropriate microservice
- **Authentication** — validate tokens before requests reach services
- **Rate limiting** — protect backend services
- **SSL termination** — decrypt HTTPS at the edge
- **Request/response transformation** — adapt formats
- **Circuit breaking** — fail fast when downstream services are down
- **Observability** — centralized logging, tracing, metrics

**Examples:** Kong, AWS API Gateway, Nginx, Envoy, Traefik.

**BFF (Backend for Frontend):** Specialized API gateway tailored for a specific client (mobile app, web SPA).

---

### 11. What is the circuit breaker pattern? `[Senior]`

**Answer:**
Circuit breakers prevent cascading failures by stopping calls to a failing service.

**States:**
- **Closed** (normal) — requests flow through; failures counted
- **Open** — threshold exceeded; requests rejected immediately (fail fast)
- **Half-Open** — after cooldown, allow test requests; if successful → Closed; if failed → Open again

```javascript
// Netflix Hystrix / Polly / Resilience4j pattern
const breaker = new CircuitBreaker(apiCall, {
  threshold: 50,   // 50% failure rate opens circuit
  timeout: 3000,   // request timeout
  resetTimeout: 30000 // wait before trying again
});

const result = await breaker.fire(request);
```

**Why needed:** Without it, a slow/failed service causes caller threads to pile up, exhausting connection pool, cascading failure to the entire system.

---

### 12. What is the saga pattern for distributed transactions? `[Senior]`

**Answer:**
Distributed transactions (2-phase commit) are slow and complex. Sagas break a business transaction into a sequence of local transactions, each publishing an event:

**Choreography-based saga:**
```
OrderService: create order → emit OrderCreated
PaymentService: on OrderCreated → charge card → emit PaymentProcessed
InventoryService: on PaymentProcessed → reserve stock → emit StockReserved
ShippingService: on StockReserved → create shipment
```

**If a step fails:** Compensating transactions undo previous steps (refund payment, release stock).

**Orchestration-based saga:** Central orchestrator (saga state machine) coordinates the sequence. Easier to reason about but creates coupling.

---

### 13. What is CQRS? `[Senior]`

**Answer:**
CQRS (Command Query Responsibility Segregation) separates the read model from the write model:

```
Write side: Accept commands → validate → update write store → emit events
Read side: Events update one or more read stores optimized for query patterns
```

**Why:** Write model optimizes for consistency and business rules. Read model optimizes for specific query patterns (denormalized, pre-computed views).

**Example:** An e-commerce order goes through complex validation when created (write side). But the "my orders" page needs a denormalized view joining order + items + shipping status (read side).

**Often paired with Event Sourcing:** Store events instead of current state; derive read models from event stream.

---

### 14. What is event sourcing? `[Senior]`

**Answer:**
Instead of storing current state, store the sequence of events that led to the current state:

```
Events: [OrderCreated, ItemAdded, ItemRemoved, OrderConfirmed, OrderShipped]
Current state: derived by replaying events
```

**Benefits:**
- Complete audit log (every change recorded)
- Temporal queries (what was the state at time T?)
- Event-driven integration (publish same events to downstream services)
- Replay to rebuild or fix projections

**Challenges:**
- Event schema evolution (old events must still work with new code)
- Eventual consistency in read models
- Snapshotting needed for performance (don't replay 10M events every time)

---

### 15. What is observability? `[Mid]`

**Answer:**
Observability is the ability to understand a system's internal state from its external outputs. Three pillars:

- **Metrics** — numeric measurements over time (request rate, latency p99, error rate, CPU usage). Tools: Prometheus, Datadog, CloudWatch.
- **Logs** — timestamped records of discrete events. Structured logs (JSON) are searchable. Tools: ELK Stack, Loki, Datadog.
- **Traces** — records of a request's journey through distributed services. Correlate by trace ID. Tools: Jaeger, Zipkin, Datadog APM.

**SLI/SLO/SLA:**
- SLI (Service Level Indicator) — the metric (e.g., "99th percentile latency")
- SLO (Service Level Objective) — the target (e.g., "<200ms p99")
- SLA (Service Level Agreement) — the contract with consequences

---

## System Design Problems (35 questions)

### 16. Design a URL shortener (e.g., bit.ly). `[Mid]`

**Answer (key points):**

**Requirements:**
- Shorten long URL → 7-char code
- Redirect short URL to original
- ~100M URLs created/day, 10:1 read/write ratio

**Core algorithm:**
- Generate 7-char unique code: `base62(counter)` or hash(URL)[:7]
- Use distributed counter (Snowflake ID) for collision-free generation
- Table: `{ short_code, long_url, created_at, expires_at, user_id }`

**Scaling:**
- Read cache: Redis `{short_code: long_url}` with LRU eviction
- CDN for redirects
- DB read replicas

**Redirect:** 301 (browser caches) vs 302 (track analytics). Use 302 for click counting.

**Custom URLs:** Check availability, store same way with user's chosen code.

---

### 17. Design a rate limiter. `[Mid]`

**Key answer points:**
- Algorithms: Token bucket (smooth bursts), Sliding window log (accurate), Fixed window (simple), Sliding window counter (hybrid)
- Storage: Redis (`INCR` + `EXPIRE` for fixed window; sorted set with timestamps for sliding)
- Distributed: Centralized Redis; Lua scripts for atomic check-and-increment
- Response: 429 status + `Retry-After` header + `X-RateLimit-Remaining` header
- Granularity: Per IP, per user, per API key, per endpoint

---

### 18. Design a notification system. `[Mid]`

**Key answer points:**
- Channels: Push (FCM/APNs), SMS (Twilio), Email (SendGrid/SES), in-app
- Architecture: API → message queue (Kafka) → channel workers → delivery
- Priority queues: Critical alerts (OTP) vs marketing emails have different SLAs
- Rate limiting per user per channel
- Retry with exponential backoff
- Template service with localization
- Delivery tracking and analytics

---

### 19. Design a web crawler. `[Senior]`

**Key answer points:**
- URL frontier: Priority queue with BFS/DFS strategy
- DNS resolver cache to reduce DNS lookups
- Robots.txt compliance
- Politeness: delay between requests to same domain
- Distributed: consistent hash URLs to workers by domain
- Storage: URL dedup using Bloom filter (fast) + DB (authoritative)
- HTML parser → extract new URLs → add to frontier → store page content
- Handles: redirects, encoding, different content types, spider traps

---

### 20. Design a key-value store. `[Senior]`

**Key answer points:**
- Storage engine: LSM-tree (write-optimized, used by Cassandra/RocksDB) vs B-tree (read-optimized, used by PostgreSQL)
- LSM: Write to in-memory memtable → flush to SSTable → compact SSTables
- Replication: Consistent hashing for node assignment; quorum writes (W) and reads (R) where W+R > N for consistency
- Versioning: Vector clocks or last-write-wins
- Gossip protocol for membership and failure detection
- Consistency vs availability tradeoff (tunable: W=1 fast writes, W=N strong consistency)

---

### 21. Design Twitter/X. `[Senior]`

**Key answer points:**
- **Core features:** Post tweet, home timeline, search, follow
- **Storage:** Tweets: Cassandra (wide column, write-heavy). User graph: graph DB or adjacency list in Redis. Media: Object storage (S3).
- **Timeline generation:**
  - Push model (fanout on write): Post → write to all followers' timeline caches. Fast reads, slow writes for celebrities (1M+ followers).
  - Pull model (fanout on read): Read own tweets + followees tweets, merge. Slow reads.
  - Hybrid: Push for regular users, pull for celebrities.
- **Scale:** 300M DAU, 500M tweets/day = ~6K writes/sec

---

### 22. Design YouTube. `[Senior]`

**Key answer points:**
- **Upload flow:** Client → video service → object storage → processing queue → encoder workers (transcode to multiple resolutions) → CDN
- **Streaming:** Chunked streaming (HLS/DASH), adaptive bitrate based on bandwidth
- **Metadata DB:** PostgreSQL for video metadata, Elasticsearch for search
- **Recommendation:** Collaboration filtering, deep learning models, pre-computed for top users
- **Comments:** Nested comments, sorted by votes/time. Separate service.
- **CDN:** Videos served from edge, cache popular videos at all PoPs
- **Scale:** 500 hours of video uploaded/minute, 2B users

---

### 23. Design a distributed cache. `[Senior]`

**Key answer points:**
- Consistent hashing for key→node mapping with virtual nodes
- Replication: copy each key to N nodes for fault tolerance
- Eviction policies: LRU, LFU, TTL
- Cache coherence: invalidation on write vs TTL-based
- Write strategies: write-through, write-back, write-around
- Monitoring: hit rate, eviction rate, memory usage
- Cache stampede protection: locking, jitter on TTL, probabilistic refresh

---

### 24. Design a search autocomplete system. `[Mid]`

**Key answer points:**
- Trie data structure: in-memory for fast prefix matching
- Top-K results stored at each node (sorted by frequency/recency)
- Distributed: shard trie by prefix (a-h, i-p, q-z)
- Updates: batch update trie from analytics data (every hour)
- Cache: CDN cache for common prefixes (debounce at client, ~300ms delay)
- Personalization: blend global suggestions with user history
- Latency target: <100ms

---

### 25. Design a distributed message queue. `[Senior]`

**Key answer points:**
- Producer → broker → consumer (pull-based)
- Message storage: append-only log on disk (sequential writes are fast)
- Partitions: parallel consumption, consumers in a group each assigned partitions
- Offset management: consumer stores offset (at-least-once by default)
- Replication: leader + N-1 followers per partition; ISR (in-sync replicas) for durability
- Consumer groups: multiple groups each read full stream independently
- Retention: configurable (time or size based)

---

### 26. Design a ride-sharing app (like Uber). `[Senior]`

**Key answer points:**
- **Key services:** Location, Matching, Pricing, Trip management, Payment
- **Location service:** Drivers push location every 4s → stored in Redis geo data structure (`GEOADD`) with TTL
- **Matching:** Query nearby drivers with `GEORADIUS`, rank by ETA (Google Maps API or internal routing)
- **WebSocket:** Real-time updates to driver and rider (location updates, trip status)
- **Surge pricing:** Demand/supply ratio in geographic cells (H3 hexagons)
- **Scale:** 5M drivers × location updates every 4s = 1.25M writes/sec (geospatial updates)

---

### 27. Design a distributed file storage system (like Dropbox). `[Senior]`

**Key answer points:**
- **Metadata service:** File tree, permissions, versions (SQL DB)
- **Block storage:** Files split into ~4MB blocks, content-addressed by hash (SHA-256)
- **Deduplication:** Same block hash means same content → don't re-upload
- **Delta sync:** Only upload changed blocks
- **Object storage:** S3-compatible for actual block data
- **Sync client:** Watch for file changes, compute diffs, upload changed blocks
- **Conflict resolution:** Last-write-wins or create conflict copy (like Dropbox)
- **CDN:** For frequently accessed files

---

### 28. Design a real-time collaborative document editor (like Google Docs). `[Senior]`

**Key answer points:**
- **Operational Transformation (OT) or CRDT** — concurrent edits must be merged correctly
- OT: each operation transformed against concurrent operations; server serializes ops
- CRDT (Conflict-free Replicated Data Type): peer-to-peer merge without server coordination
- **Architecture:** WebSocket connection per user; operation log per document; presence service for cursor positions
- **Persistence:** Operations stored and applied to snapshot. Snapshots taken periodically.
- **Access control:** Document permissions, real-time share management

---

### 29. Design a payment system. `[Senior]`

**Key answer points:**
- **Idempotency:** Idempotency keys prevent double charges on retries
- **Exactly-once semantics:** Debit + credit in transaction; distributed: saga or 2PC
- **External PSP:** Integration with Stripe/Adyen for card processing
- **Ledger:** Append-only ledger (double-entry accounting); immutable transaction history
- **Reconciliation:** Nightly reconciliation against PSP statements
- **Fraud detection:** ML scoring + rule-based blocking
- **PCI DSS compliance:** Tokenize card data; never store raw PANs
- **Retry strategy:** Exponential backoff with jitter, different strategies for different error types

---

### 30. Design a distributed locking system. `[Senior]`

**Key answer points:**
- **Redis SETNX + EXPIRE:** `SET key value NX PX 30000` — atomic acquire with TTL
- **RedLock algorithm:** Acquire lock on N/2+1 Redis nodes for fault tolerance
- **Lock duration:** Set TTL based on expected operation time; extend if needed
- **Fencing tokens:** Include monotonically increasing token with lock; storage layer rejects stale tokens
- **ZooKeeper/etcd:** Stronger guarantees (linearizable) for consensus-based locking; used in production for critical sections
- **Challenges:** Clock drift, process pauses (GC), network delays

---

### 31. Design a feed ranking system (like Facebook News Feed). `[Senior]`

**Key answer points:**
- **Signals:** Affinity with poster, edge weight (like vs comment vs share), time decay
- **Candidate generation:** Union of recent posts from followees + interest-based candidates
- **Scoring:** ML model (GBDT or neural net) scores each candidate
- **Pipeline:** Offline training → feature store → online scoring at request time
- **Pre-computation:** Pre-compute top-K feed for most users; personalized on top
- **A/B testing:** Infrastructure for comparing ranking algorithms

---

### 32. Design a live streaming platform (like Twitch). `[Senior]`

**Key answer points:**
- **Ingest:** Streamer RTMP → ingest servers → transcode to HLS/DASH at multiple bitrates
- **CDN:** Distribute stream segments globally; dynamic routing to nearest edge
- **Chat:** WebSocket connections, message bus (Kafka), fan-out to connected clients
- **Scale:** 2.5M concurrent viewers × 500 segments/hour = massive CDN bandwidth
- **Low latency:** WebRTC for <1s latency (Discord uses this). HLS has 6-10s latency by default; LL-HLS reduces to ~2s
- **Clips/VOD:** Store raw stream, generate clips on demand

---

### 33. Design a hotel booking system. `[Mid]`

**Key answer points:**
- **Inventory model:** Room availability by date — sparse date-based records
- **Concurrency:** Prevent double booking — optimistic locking or reservation lock
- **Two-phase booking:** Reserve (hold inventory) → confirm (charge payment). Release hold if payment fails.
- **Idempotency:** Booking creation must be idempotent
- **Search:** Date range + location + filters → Elasticsearch with geo queries
- **Dynamic pricing:** Price varies by date, demand, loyalty status
- **Payment:** Authorize on reservation, capture on checkin

---

### 34. Design a metrics and monitoring system. `[Senior]`

**Key answer points:**
- **Collection:** Pull model (Prometheus scrapes endpoints) vs push model (agents push to collector)
- **Time-series storage:** Custom (InfluxDB, TimescaleDB) — optimize for time-range queries and rollups
- **Aggregation:** Rollup raw data to 1min → 5min → 1hr → 1day for long-term retention
- **Alerting:** Evaluation engine checks alert rules; deduplication; routing to PagerDuty/Slack
- **Dashboards:** Grafana queries Prometheus; PromQL for filtering and aggregation
- **Scale:** 1M metrics × 10s interval = 100K data points/sec; compaction crucial

---

### 35. Design a distributed job scheduler. `[Senior]`

**Key answer points:**
- **Job storage:** DB with `next_run_at` indexed column for polling
- **Locking:** Claim job with optimistic locking or `SELECT FOR UPDATE SKIP LOCKED` (PostgreSQL)
- **Worker pool:** Multiple worker processes; each claims and executes jobs
- **Cron parsing:** Standard cron syntax; calculate next run time after execution
- **Retry logic:** Exponential backoff with jitter; max retry count; dead-letter queue for permanent failures
- **Exactly-once execution:** Hard to guarantee — use idempotent job handlers
- **Sharding:** Shard job queue by job type or tenant for throughput
- **Tools:** BullMQ, Temporal, Sidekiq, Celery

---

### 36-50. Additional common design questions. `[Mixed]`

**Quick answers for other common questions:**

**36. Design a leaderboard:** Redis Sorted Set `ZADD / ZREVRANK / ZREVRANGE`. Daily/weekly resets via key rotation.

**37. Design a recommendation engine:** Collaborative filtering (what similar users liked) + content-based (item features). Pre-compute offline; serve from cache.

**38. Design an order management system:** State machine (pending→paid→fulfilling→shipped→delivered). Event-driven state transitions. Distributed saga for payment + inventory.

**39. Design a feature flag system:** Client SDK calls edge service; feature evaluation based on user attributes; rules stored in DB; cache at edge for performance.

**40. Design a logging pipeline:** Apps → Fluentd/Logstash → Kafka → Elasticsearch → Kibana. Retention policy. Structured logging with trace IDs.

**41. Design a content delivery network:** DNS anycast routing → edge PoP → cache → origin pull on miss. Cache-Control headers determine TTL. Purge API for invalidation.

**42. Design an image hosting service:** Upload → S3 → CDN. Lazy image resizing via URL params (e.g., `/images/cat.jpg?w=300&h=200`). Cache resized images.

**43. Design a chat application:** WebSocket connections. Message storage: Cassandra (wide column, chat room partitioned by room ID). Message ordering: Snowflake IDs. Read receipts via separate events.

**44. Design a ticket booking system (like Ticketmaster):** Seat locking (Redis TTL). Virtual waiting queue for high-demand events. Idempotent checkout.

**45. Design a distributed counter:** Redis `INCR` for simple cases. For very high scale: multiple shards, each with own counter, aggregate periodically.

**46. Design an ad click tracking system:** Impression → click → high-write pipeline (Kafka) → batch processing (Spark) → aggregates in data warehouse. Near-real-time: Flink for streaming aggregation.

**47. Design a social graph:** Adjacency list in graph DB (Neo4j) or DynamoDB with `user_id + edge_type + target_id` schema. BFS for mutual friends (limit depth).

**48. Design a code deployment pipeline:** Monorepo: affected service detection. Docker build → push to registry → Helm chart update → ArgoCD (GitOps) → canary rollout → automated rollback on metric degradation.

**49. Design a food delivery app:** Restaurant service, order service, delivery assignment (nearest driver, Dijkstra/A*), real-time tracking (WebSocket). Driver location grid sharded by region.

**50. Design a stock trading system:** Order matching engine (in-memory priority queue by price/time). Market orders vs limit orders. Order book persisted to write-ahead log. Sub-millisecond latency requirement → co-location, low-latency languages.
