# System Design Interview Questions

50 questions covering fundamentals, storage, APIs, real-world systems, and reliability.

---

## Fundamentals

### 1. How do you design a system for horizontal scalability? `[Mid]`

**Answer:**
- Separate stateless application servers from stateful data stores so any server can handle any request
- Use a load balancer (L4 or L7) to distribute traffic across multiple instances
- Store sessions in a shared store (Redis, DynamoDB) rather than in-process memory
- Apply database read replicas to offload read traffic; writes go to the primary
- Partition data by tenant ID, user ID range, or hash to spread write load across shards
- Use async message queues (Kafka, SQS) to decouple services so slow consumers do not block producers
- Autoscale compute on CPU/RPS thresholds; track P99 latency as the primary health signal

**Key points:** Interviewers want you to distinguish stateless compute (easy to scale) from stateful storage (hard to scale), and understand that horizontal scaling introduces distributed-system complexity: partial failures, network partitions, and consistency challenges.

**Follow-up:** How do you handle stateful WebSocket connections when scaling horizontally? → Use sticky sessions at the load balancer as a short-term fix, or move connection state to a shared pub/sub broker (Redis Streams, Kafka) so any node can resume the session.

---

### 2. How does a load balancer work, and what algorithms does it use? `[Mid]`

**Answer:**
- A load balancer sits between clients and backend servers, forwarding requests and hiding internal topology
- **L4 (transport layer):** routes by IP/TCP without inspecting HTTP; very fast, handles 100 k+ connections per node
- **L7 (application layer):** inspects HTTP headers, cookies, and paths; enables URL-based routing, A/B testing, and SSL termination
- Common algorithms:
  - **Round robin:** simple equal distribution; poor when requests have variable cost
  - **Least connections:** routes to the server with fewest active connections; better for variable-cost requests
  - **IP hash / consistent hash:** deterministic routing; useful for cache affinity
  - **Weighted round robin:** accounts for heterogeneous server capacity
- Health checks (TCP ping or HTTP `/health` every 5–10 s) remove unhealthy nodes from rotation
- Active-passive HA pair with VRRP/floating IP prevents the load balancer itself from being a SPOF

**Key points:** When to choose L4 vs L7, trade-offs of each routing algorithm, and how the LB itself avoids being a single point of failure.

**Follow-up:** How do you handle a "thundering herd" when a new server is added to the pool? → Use slow-start mode to gradually ramp up the new node's weight so it warms up its caches before receiving full traffic.

---

### 3. When and how do you use a CDN? `[Mid]`

**Answer:**
- A CDN caches static and cacheable dynamic content at edge PoPs geographically close to users
- Use cases: static assets (JS, CSS, images), video segments, API responses with long TTLs, DDoS absorption
- **Origin pull:** CDN fetches from origin on cache miss and caches by `Cache-Control` headers; typical TTL 1 min–7 days
- **Origin push:** pre-warm edge caches by uploading assets directly; ideal for large video files released at a fixed time
- Cache key = URL + selected request headers (Accept-Encoding, Accept-Language, device type)
- Invalidation strategies: path-based purge (instant but costs API calls), surrogate-key / tag-based group invalidation, or versioned URLs (preferred — eliminates invalidation entirely)
- Edge compute (Cloudflare Workers, Lambda@Edge) runs logic at the edge for personalization without round-tripping to origin

**Key points:** Cache key design and invalidation strategy are the core concerns — over-caching causes stale data; under-caching wastes CDN spend.

**Follow-up:** How do you serve personalized content through a CDN without caching per-user responses? → Cache the HTML "shell" at the CDN; hydrate personalized data client-side via a separate authenticated API call.

---

### 4. What caching strategies exist and when do you use each? `[Mid]`

**Answer:**
- **Cache-aside (lazy loading):** app reads cache; on miss, reads DB and populates cache. Simple and fault-tolerant; risks cache stampede on cold start
- **Write-through:** app writes to cache and DB synchronously; cache is always fresh; doubles write latency
- **Write-behind (write-back):** app writes to cache; async flush to DB; low write latency but risk of data loss on cache crash
- **Read-through:** cache handles DB reads transparently; simpler app code but less flexibility
- **Refresh-ahead:** proactively refresh hot keys before TTL expiry; reduces latency spikes but wastes resources on cold keys
- Eviction policies: LRU (most common), LFU (better for skewed access), TTL-based expiry
- Cache stampede mitigation: probabilistic early expiration, mutex/lock-based single-writer, background refresh
- Multi-level caching: L1 in-process (Caffeine, ~10 ms), L2 Redis cluster (~1 ms), L3 origin DB (10–100 ms)

**Key points:** Trade-offs between consistency and performance for each strategy, and how to handle thundering-herd / stampede.

**Follow-up:** How do you handle cache invalidation in a distributed system? → Event-driven invalidation: publish a cache-invalidation event on every write; all subscribers delete their local copy. Use a short TTL as a safety net.

---

### 5. SQL vs NoSQL — how do you choose? `[Mid]`

**Answer:**
- **SQL (PostgreSQL, MySQL):** ACID transactions, relational joins, flexible ad-hoc queries, strong schema; scales vertically + read replicas; ideal for financial records, orders, and user accounts
- **Document (MongoDB, Firestore):** schema-flexible nested documents, horizontal sharding; ideal for product catalogs, CMS, and event logs
- **Key-Value (Redis, DynamoDB):** O(1) reads/writes, extremely high throughput; ideal for sessions, caching, and leaderboards
- **Wide-Column (Cassandra, HBase):** excellent write throughput, linear scale, tunable consistency; ideal for IoT time-series, audit logs, and messaging
- **Graph (Neo4j, Neptune):** native relationship traversal; ideal for social graphs, fraud detection, and recommendations
- Decision factors: data model (structured vs flexible), query patterns (join-heavy vs key lookups), consistency requirements (ACID vs eventual), scale (10 k RPS vs 1 M RPS), team expertise

**Key points:** There is no universally best choice. Model your access patterns first, then pick the storage that matches. Polyglot persistence is common in large systems.

**Follow-up:** Can you get ACID transactions in a NoSQL store? → Yes, with limits: DynamoDB transactions (single region, 25 items), MongoDB multi-document transactions (v4.0+), Firestore transactions — all trade throughput for atomicity.

---

### 6. Explain the CAP theorem and its real-world implications. `[Senior]`

**Answer:**
- CAP: a distributed data store can guarantee at most two of three properties: **Consistency** (every read sees the latest write), **Availability** (every request gets a non-error response), **Partition Tolerance** (the system continues despite network partitions)
- Network partitions are unavoidable, so the real choice is CP vs AP during a partition
- **CP systems** (ZooKeeper, etcd, HBase): return an error or timeout rather than serve stale data; used for leader election, config management, and financial ledgers
- **AP systems** (Cassandra, DynamoDB, CouchDB): return the best available (possibly stale) data; used for shopping carts, social feeds, and DNS
- PACELC extends CAP to also address the latency vs consistency trade-off when no partition exists
- Strong consistency requires coordination (Paxos, Raft) adding 1–2 RTTs of latency

**Key points:** CAP is often misapplied. Interviewers want you to explain the CP vs AP choice for specific use cases, and to understand that "eventual consistency" means different things in different systems.

**Follow-up:** How does Google Spanner achieve external consistency (effectively CP globally)? → TrueTime (GPS + atomic clocks) bounds clock uncertainty; commits wait until the uncertainty window closes, giving linearizability across data centers.

---

### 7. How does database sharding work? `[Senior]`

**Answer:**
- Sharding horizontally partitions data across multiple DB nodes (shards), each owning a subset of the key space
- **Range sharding:** partition by ID range (0–1 M → shard 1, 1 M–2 M → shard 2); simple routing but hotspot risk when writes cluster at the high end
- **Hash sharding:** `shard = hash(key) % N`; uniform distribution but range queries fan out to all shards
- **Directory sharding:** a lookup table maps keys to shards; flexible rebalancing but the lookup table itself becomes a bottleneck
- **Consistent hashing (virtual nodes):** keys and nodes placed on a ring; adding/removing a node moves only ~1/N of data; used by Cassandra and DynamoDB
- Cross-shard queries (joins, aggregations) require scatter-gather or pre-joining at write time; avoid by embedding related data in the same shard (tenant-based sharding)
- Shard rebalancing is operationally complex: use online migration with double-write + verification before cutover

**Key points:** Hotspot prevention, cross-shard query cost, and rebalancing strategy. Interviewers also probe the difference between application-level sharding and middleware sharding (Vitess, Citus).

**Follow-up:** How do you handle a hot shard receiving disproportionate traffic? → Split the hot shard, add a caching layer in front of it, or use application-level rate limiting per key.

---

### 8. How do database replication and its consistency models work? `[Senior]`

**Answer:**
- **Primary-replica:** writes go to primary; replicated async or sync to replicas; replicas serve reads
- **Async replication:** low write latency; replica may lag seconds to minutes; risk of data loss on primary failover
- **Sync replication:** zero data loss; write latency includes replica RTT (~2–5 ms same DC, 50–100 ms cross-region); required for financial data
- **Semi-sync:** primary waits for at least one replica to acknowledge — balances durability and latency (MySQL semi-sync)
- **Multi-primary:** any node accepts writes; conflict resolution required (last-write-wins, CRDT, application-level); used by CockroachDB, Galera
- **Replication lag** causes stale reads: mitigate with read-your-writes consistency (route reads to primary after a write for that session) or track replication position and wait
- **Raft / Paxos:** consensus protocols where a quorum must agree on every write; linearizable, no stale reads; used by etcd, CockroachDB, TiDB

**Key points:** Trade-offs between replication lag, write latency, and durability guarantees. Interviewers want you to know when stale reads are acceptable.

**Follow-up:** How do you handle split-brain in a primary-replica setup? → Use a distributed coordinator (ZooKeeper, etcd) for primary election with fencing tokens to prevent the old primary from accepting writes after failover.

---

### 9. What are consistency models and how do they differ? `[Senior]`

**Answer:**
- **Linearizability (strong consistency):** every operation appears instantaneous; reads always see the latest write; highest cost — requires quorum coordination
- **Sequential consistency:** all processes see operations in the same order but not necessarily in real-time; weaker than linearizability
- **Causal consistency:** causally related operations are seen in order by all nodes; unrelated operations may diverge; used by MongoDB sessions
- **Eventual consistency:** given no new writes, all replicas converge; reads may see stale data; highest availability; used by Cassandra and DynamoDB by default
- **Read-your-writes:** a client always sees its own writes; a subset of causal consistency; important for UX
- **Monotonic reads:** a client never reads an older value after reading a newer one — prevents "going back in time"
- Most systems offer tunable consistency: Cassandra's `QUORUM`, DynamoDB's `ConsistentRead`

**Key points:** Interviewers want concrete examples of which model fits which use case and the latency/availability cost of stronger guarantees.

**Follow-up:** How do CRDTs achieve eventual consistency without conflict resolution logic? → Conflict-free Replicated Data Types define merge functions that are commutative, associative, and idempotent, so any merge order produces the same result (e.g., G-Counter, OR-Set).

---

### 10. How does database indexing work at scale? `[Mid]`

**Answer:**
- **B-Tree index:** balanced tree, O(log N) reads and writes; default in PostgreSQL and MySQL; efficient for range queries and equality
- **Hash index:** O(1) equality lookups; no range support; used by Redis and some heap files
- **LSM-Tree:** writes go to an in-memory memtable, flushed to immutable SSTables, periodically compacted; excellent write throughput; used by Cassandra, RocksDB, LevelDB
- **Composite index:** an index on (a, b) speeds queries filtering on a alone or (a, b) together, but not b alone — leftmost prefix rule
- **Covering index:** index includes all columns the query needs; zero table lookups (index-only scan)
- **Partial index:** indexes only rows matching a condition (e.g., `WHERE deleted_at IS NULL`); smaller and faster
- **Full-text index:** inverted index mapping terms to row IDs; built into PostgreSQL (GIN), MySQL, and Elasticsearch
- Index bloat: dead rows inflate B-Tree pages; PostgreSQL `VACUUM` reclaims space; monitor index size and fragmentation

**Key points:** Index selection based on query patterns (equality, range, sort), cardinality, and write amplification cost. Too many indexes slow down writes.

**Follow-up:** How do you identify and fix slow queries in production without downtime? → Use `EXPLAIN ANALYZE`, `pg_stat_statements`, or the slow query log; add indexes concurrently (`CREATE INDEX CONCURRENTLY` in PostgreSQL); avoid full-table scans on large tables.

---

## Storage & Data

### 11. How do you design a blob storage system (like S3)? `[Senior]`

**Answer:**
- Objects are immutable blobs identified by bucket + key; no in-place updates — write a new version
- **Metadata service:** maps (bucket, key) → storage node + offset; backed by a distributed KV store
- **Storage nodes:** store raw bytes in large flat files (chunk files); multiple small objects packed per file to reduce seek overhead
- **Data durability:** erasure coding (S3 uses Reed-Solomon 8+4 — tolerates 4 node failures with only 50% storage overhead vs 3x replication)
- **Multi-AZ replication:** synchronously replicate across at least 3 AZs before acknowledging PUT
- **Multipart upload:** split large files (>100 MB) into parts, upload in parallel, assemble server-side; supports resumable uploads
- **Lifecycle policies:** automatically transition objects to cold tiers (Glacier) after N days; delete after expiry
- **Signed URLs:** time-bound tokens for private object access without exposing credentials

**Key points:** Durability vs storage efficiency (erasure coding vs replication), metadata bottleneck, and multipart upload for large objects.

**Follow-up:** How does S3 achieve strong read-after-write consistency (since 2020)? → The metadata service uses a distributed consensus store guaranteeing linearizable PUT/GET for new objects, removing the eventual consistency window.

---

### 12. How do you design a search system (like Elasticsearch)? `[Senior]`

**Answer:**
- Documents are indexed into an **inverted index**: maps each term → list of (doc ID, position) postings
- **Sharding:** the index is split into primary shards (fixed at creation); each shard is a self-contained Lucene index; replicas provide HA and read scale
- **Indexing pipeline:** document → tokenizer → normalizer (lowercase, stemming, synonyms) → inverted index segments; segments periodically merged (compaction)
- **Query execution:** query parsed → scored against each shard (BM25 relevance) → results merged and globally sorted by score
- **Near-real-time search:** newly indexed docs visible in ~1 s (segment refresh interval); fully committed to disk via fsync every 30 s (translog provides durability in between)
- **Scaling:** add data nodes for storage/throughput; add coordinating nodes for query fan-out; use ILM to roll hot shards to warm/cold nodes
- **Relevance tuning:** field boosting, function scores (recency, popularity), learning-to-rank (LTR) models

**Key points:** Inverted index anatomy, NRT trade-offs, and the separation of relevance scoring from business ranking.

**Follow-up:** How do you handle schema changes in a live Elasticsearch index? → Create a new index with the updated mapping, reindex documents via the Reindex API, then atomically swap the alias.

---

### 13. How do time-series databases work, and when do you use them? `[Mid]`

**Answer:**
- Time-series data: high-frequency, append-only, queryable by time range and tag dimensions (metrics, IoT, financial ticks)
- **Storage optimizations:** data is naturally sorted by time; sequential writes are cache-friendly; delta encoding + XOR compression (Gorilla) achieves 10–20x compression vs raw values
- **Chunk-based storage (InfluxDB, VictoriaMetrics):** time range split into fixed-size chunks; old chunks compressed and moved to cold storage
- **Downsampling:** high-resolution data (1 s) aggregated to 1 min then 1 h; old raw data purged; dramatically reduces storage cost
- **Tag indexing:** secondary index on tag values for fast label-based filtering; cardinality explosion (too many unique tag combinations) is a common anti-pattern that degrades performance
- **Prometheus:** pull-based scraping every 15 s; local TSDB; Thanos/Cortex for global view and long retention
- Use TSDB over PostgreSQL when: >10 k writes/s, data is always append-only, and primary queries are time-range aggregations

**Key points:** Compression techniques, downsampling retention policy, and cardinality management — high-cardinality tags kill TSDB performance.

**Follow-up:** How does Gorilla compression work? → It XOR-encodes consecutive float64 values and stores only the meaningful bits that changed, exploiting the tendency of metrics to change slowly.

---

### 14. What is event sourcing and when should you use it? `[Senior]`

**Answer:**
- Event sourcing: the source of truth is an append-only log of immutable domain events; current state is derived by replaying events
- **Benefits:** complete audit trail, temporal queries ("what was the state at 3 PM?"), easy debugging (replay to reproduce bugs), multiple read projections from the same event log
- **Implementation:** events stored in an event store (EventStoreDB, Kafka, DynamoDB Streams); snapshots taken periodically to avoid replaying the full log every time
- **Challenges:** eventual consistency between event log and projections; schema evolution (old events must be readable forever — use upcasting); complex debugging without understanding projection logic
- **Good fit:** financial systems (ledger of transactions), order management, collaborative editing, audit-heavy domains
- **Poor fit:** simple CRUD apps with no audit requirements; high-frequency state updates (game position every frame)

**Key points:** The difference between event sourcing and event-driven architecture; snapshot strategy; and schema versioning.

**Follow-up:** How do you handle schema evolution in event sourcing? → Use upcasting: transform old event schema to new schema on read; use versioned event types; never mutate stored events.

---

### 15. What is CQRS and how does it relate to event sourcing? `[Senior]`

**Answer:**
- CQRS (Command Query Responsibility Segregation): separate the write model (commands that mutate state) from the read model (queries that return data)
- **Write side:** validates commands, applies business rules, persists to the command store (often as events); optimized for correctness and consistency
- **Read side:** one or more denormalized projections optimized for specific query patterns; backed by any store (Elasticsearch, Redis, PostgreSQL views)
- CQRS and event sourcing are independent — you can use either without the other — but they complement each other: events are the natural bridge between write and read sides
- **Eventual consistency:** read models updated asynchronously from events; a brief lag is acceptable for most UIs
- **Benefits:** each side scales independently; read models can be rebuilt from scratch by replaying events; different storage engines per read model
- **Costs:** operational complexity; two data stores to maintain; debugging requires understanding projections

**Key points:** CQRS is a pattern, not a framework. Interviewers want clarity on the eventual consistency trade-off and the flexibility gained from separate read models.

**Follow-up:** How do you rebuild a corrupted read-model projection without downtime? → Deploy a new projection consumer under a different consumer group ID, replay all events from the beginning, then atomically swap the read-model store.

---

### 16. How do you design a data warehouse? `[Senior]`

**Answer:**
- Data warehouse: central analytical store optimized for OLAP (complex aggregations over large datasets), separate from OLTP databases
- **Ingest layer (ETL/ELT):** Extract from sources (DB replicas, event streams, SaaS APIs), Transform (clean, join, model), Load into warehouse; ELT preferred in modern cloud DWs (Snowflake, BigQuery) because compute is cheap
- **Storage layer:** columnar format (Parquet, ORC) on object storage; column pruning and predicate pushdown reduce scan volume dramatically
- **Data modeling:** star schema (fact tables + dimension tables) or snowflake schema; dbt manages transformations as version-controlled SQL; materialized views for frequently queried aggregations
- **Compute layer:** distributed SQL engine (BigQuery, Redshift, Trino) splits queries across workers; vectorized execution with SIMD
- **Partitioning and clustering:** partition fact tables by date; cluster by high-cardinality join keys to co-locate related rows
- **Governance:** row-level security, column masking for PII, lineage tracking (OpenLineage, dbt docs)

**Key points:** Columnar storage, separation of storage and compute (modern cloud DWs), and incremental vs full refresh of transformation models.

**Follow-up:** What is the difference between a data warehouse and a data lake? → A data lake stores raw, unstructured, and semi-structured data cheaply at any schema; a DW stores cleaned, modeled, structured data for analytics. A lakehouse (Delta Lake, Apache Iceberg) merges both.

---

### 17. How do ETL pipelines work at scale? `[Mid]`

**Answer:**
- ETL: Extract (read from source), Transform (clean, join, aggregate), Load (write to destination)
- **Batch ETL:** nightly or hourly jobs; simple but high latency; tools: dbt, Spark, AWS Glue
- **Streaming ETL:** process events as they arrive; latency <1 s; tools: Apache Flink, Kafka Streams, Spark Structured Streaming
- **Idempotency:** jobs must produce the same output if re-run (use `MERGE`/`UPSERT` instead of `INSERT`); critical for safe retries
- **Incremental loading:** only process new/changed records since last run using watermarks (updated_at, Kafka offset, CDC log position)
- **Change Data Capture (CDC):** tap the DB replication log (Debezium → Kafka) to stream row-level changes without polling; zero impact on the source DB
- **Error handling:** dead-letter queue for failed records; alerting on schema change; retry with exponential backoff
- **Orchestration:** Airflow, Prefect, or Dagster for DAG scheduling, dependency management, and retry logic

**Key points:** Idempotency, incremental vs full load, and CDC as the preferred low-impact extraction method.

**Follow-up:** How do you handle schema drift (a source table adds a column)? → Use schema registries (Confluent Schema Registry) with compatibility checks; fail fast on breaking changes; make ETL code resilient to new columns by selecting explicitly.

---

### 18. How do you implement hot/cold storage tiering? `[Mid]`

**Answer:**
- **Hot storage:** frequently accessed data on fast, expensive media (SSD, in-memory); latency <10 ms
- **Warm storage:** less frequent data on standard HDD or lower-cost SSD; latency 10–100 ms
- **Cold storage:** rarely accessed archival data on object storage (S3 Glacier, Azure Archive); retrieval takes minutes to hours; ~$0.004/GB/month vs $0.023/GB/month for S3 Standard
- **Tiering policy:** based on access recency (last accessed >90 days → cold), size thresholds, or explicit lifecycle rules
- **Implementation patterns:**
  - S3 Intelligent-Tiering: monitors access patterns and moves objects automatically
  - Database partitioning: hot rows in PostgreSQL on SSD, cold rows archived to Redshift or Glacier
  - Cassandra tiered compaction strategy + tiered storage for time-windowed data
- **Data virtualization:** query cold data without manual retrieval using S3 Select, Athena, or BigQuery federated queries

**Key points:** Cost-per-GB vs latency trade-off; retrieval SLA requirements; and automation to avoid manual tiering.

**Follow-up:** How do you serve cold data with acceptable latency when a user requests it? → Pre-warm: detect likely access (e.g., user queries a date range) and trigger async retrieval from Glacier in advance; return a `202 Accepted` with a polling endpoint.

---

### 19. How do distributed file systems (like HDFS) work? `[Senior]`

**Answer:**
- **Architecture:** NameNode (single master, stores filesystem metadata and block locations) + DataNodes (store actual 128 MB blocks)
- **Write path:** client asks NameNode for block locations → NameNode assigns a pipeline of 3 DataNodes → client streams data through the pipeline → NameNode commits after all 3 replicas acknowledge
- **Read path:** client asks NameNode for block locations → reads directly from the nearest DataNode (rack-aware locality)
- **Fault tolerance:** replication factor 3 (1 copy local rack, 2 copies remote rack); NameNode detects DataNode failure via heartbeat timeout and triggers re-replication
- **NameNode HA:** active + standby NameNode sharing a Quorum Journal Manager (QJM) edit log; ZooKeeper-based automatic failover
- **HDFS limitations:** single NameNode is a metadata bottleneck; millions of tiny files degrade performance; no random write support; not POSIX compliant
- Modern replacement: cloud object storage (S3) + columnar formats (Parquet) + compute engines (Spark, Trino) decouples storage from compute

**Key points:** Block-based storage, rack-aware replication, NameNode as the architectural Achilles heel, and the industry migration to object storage.

**Follow-up:** How do you handle the "small files problem" in HDFS? → Combine small files into SequenceFiles or ORC/Parquet at ingestion; use HDFS federation to distribute namespace load; or migrate to an object store with a metadata layer (Hudi, Iceberg).

---

### 20. How do columnar storage formats improve analytical query performance? `[Mid]`

**Answer:**
- **Row storage (CSV, JSON):** all columns of a row stored together; optimal for reading entire rows (OLTP); poor for reading one column across millions of rows (OLAP)
- **Columnar storage (Parquet, ORC):** each column's values stored contiguously; reading only the needed columns skips irrelevant bytes entirely
- **Compression:** values within a column share the same type and similar values → far higher compression; dictionary encoding for low-cardinality columns, delta encoding for monotonically increasing IDs, RLE for repeated values
- **Vectorized execution:** CPU processes a batch of column values in SIMD registers rather than one row at a time; 10–100x throughput improvement
- **Predicate pushdown:** min/max statistics stored per row group (e.g., 128 MB) allow skipping entire groups without decoding; Bloom filters for point lookups
- **Projection pruning:** a query touching 3 of 100 columns reads 3% of the data

**Key points:** Column pruning, compression ratios, predicate pushdown statistics, and vectorized execution are the four pillars of columnar query performance.

**Follow-up:** What is the difference between Parquet and ORC, and which should you choose? → Both are columnar. ORC has better support in the Hive ecosystem; Parquet has broader support (Spark, BigQuery, Arrow, Pandas). Choose Parquet for new systems unless working heavily with Hive.

---

## APIs & Networking

### 21. How does an API gateway work? `[Mid]`

**Answer:**
- API gateway: single entry point for all client requests; handles cross-cutting concerns so individual services do not need to implement them
- **Core functions:** routing (map URL paths to backend services), authentication/authorization (JWT validation, OAuth introspection), rate limiting, request/response transformation, SSL termination, observability (log, trace, and metrics per request)
- **Authentication:** validate JWTs locally using the gateway's public key (no backend call); or call the auth service for opaque tokens
- **Request aggregation (BFF — Backend for Frontend):** gateway composes multiple downstream calls into a single client response; reduces mobile client round trips
- **Rate limiting:** per-IP or per-API-key quotas enforced at the gateway before the request reaches the backend; uses token bucket or sliding window counter in Redis
- **Common implementations:** AWS API Gateway, Kong, NGINX, Envoy, Traefik
- **Risks:** gateway is a SPOF — deploy clustered with health checks; adds ~1–5 ms latency per hop; avoid putting business logic in the gateway

**Key points:** What belongs in the gateway (cross-cutting concerns) vs in services (business logic); SPOF mitigation.

**Follow-up:** How do you handle versioning at the API gateway level? → Path-based versioning (`/v1/`, `/v2/`) with routing rules, or header-based versioning (`API-Version: 2024-01-01`) parsed by the gateway; sunset old versions with `Sunset` response headers.

---

### 22. gRPC vs REST — when do you use each? `[Mid]`

**Answer:**
- **REST:** text-based (JSON), human-readable, broad tooling support, stateless, HTTP/1.1 compatible; best for public APIs, browser clients, and simple CRUD
- **gRPC:** binary (Protocol Buffers), strongly typed contracts, HTTP/2 multiplexing (no head-of-line blocking), bidirectional streaming, generated client/server stubs; best for internal microservice communication
- **Performance:** gRPC messages are 5–10x smaller than JSON equivalents; HTTP/2 header compression and multiplexing reduce latency significantly
- **Streaming:** gRPC natively supports server streaming, client streaming, and bidirectional streaming; REST needs WebSockets or SSE for streaming
- **Tooling:** REST has universal browser support and the OpenAPI ecosystem; gRPC requires the protobuf compiler and grpc-web for browsers
- **Schema evolution:** protobuf field numbers allow backward-compatible changes (add new fields, deprecate old ones); REST/JSON requires developer discipline

**Key points:** gRPC for performance-critical internal services; REST for external/public APIs.

**Follow-up:** How do you expose gRPC services to browser clients? → Use grpc-web (requires an Envoy proxy for transcoding) or a REST-to-gRPC gateway; browsers cannot directly use HTTP/2 trailers required by gRPC.

---

### 23. How does GraphQL federation work for large systems? `[Senior]`

**Answer:**
- GraphQL federation: compose a single unified GraphQL schema from multiple independently deployed subgraph services; clients query one gateway and the gateway routes to subgraphs
- **Supergraph schema:** the gateway (Apollo Router, Hive) merges subgraph schemas at startup or dynamically via a schema registry
- **Entity system:** types annotated with `@key` allow subgraphs to extend each other's types; the gateway automatically chains queries across subgraphs using `_entities` resolver
- **Query planning:** the gateway generates an optimal execution plan (DAG of subgraph calls) per client query; deduplicates fetches and parallelizes independent subgraph calls
- **Schema evolution:** each subgraph evolves independently; schema checks (breaking change detection) are enforced in CI; composition validates cross-subgraph consistency before deploy
- **Performance:** the N+1 problem within a subgraph is solved by DataLoader batching; cross-subgraph N+1 handled by the gateway's entity batching
- **Observability:** distributed tracing spans per subgraph call; field-level usage metrics for deprecation decisions

**Key points:** How entity resolution works across subgraph boundaries, N+1 batching at the gateway level, and schema composition checks in CI.

**Follow-up:** How do you handle a subgraph that is slow or unavailable without failing the entire query? → Use `@defer` for partial results, or configure the gateway to return partial data on subgraph timeout and surface errors in the GraphQL `errors` array.

---

### 24. How do you scale WebSockets to millions of concurrent connections? `[Senior]`

**Answer:**
- WebSockets maintain persistent TCP connections; each server process handles ~50 k–100 k connections (bounded by file descriptors and memory)
- **Horizontal scaling challenge:** a message to user A must reach the server holding A's connection; naive round-robin routing fails
- **Pub/sub broker solution:** all WebSocket servers subscribe to a shared broker (Redis Pub/Sub, Kafka); messages published to the broker fan out to all server instances; each server delivers only to its locally connected clients
- **Sticky sessions:** alternatively, route each user's HTTP upgrade request to the same server using IP hash or cookie-based affinity; simpler but harder to rebalance
- **Connection load balancing:** L4 load balancer with TCP passthrough (NGINX stream module, HAProxy); L7 balancers add overhead and may not handle long-lived connections well
- **Heartbeats and reconnection:** client sends ping every 30 s; server closes stale connections after 2 missed pings; client uses exponential backoff on reconnect
- Discord serves 100 M+ users with ~7.5 M concurrent connections distributed across Elixir/Phoenix WebSocket servers

**Key points:** State locality problem, pub/sub broker as the decoupling mechanism, and file-descriptor tuning (`ulimit`) for high connection counts.

**Follow-up:** How do you deliver missed messages to a client that reconnected after a brief disconnect? → Assign each message a sequence number; client sends its last-seen sequence on reconnect; server replays missed messages from a bounded buffer (Redis sorted set or Kafka offset).

---

### 25. How do you implement rate limiting at scale? `[Mid]`

**Answer:**
- Rate limiting algorithms:
  - **Token bucket:** bucket refills at a fixed rate; allows controlled bursting up to bucket size; smooth traffic
  - **Sliding window log:** store request timestamps; count requests in the last N seconds; accurate but memory-intensive
  - **Sliding window counter:** interpolate between current and previous fixed-window counts; good accuracy at low memory cost
  - **Fixed window counter:** count resets at window boundary; susceptible to boundary burst attack (2x rate at the window edge)
- **Distributed rate limiting:** store counters in Redis; use Lua scripts for atomic increment + expire (`INCR` + `EXPIRE`); single Redis call per request prevents race conditions
- **Hierarchical limits:** per-IP, per-user, per-API-key, per-tenant, global; apply most specific first
- **Response headers:** return `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, and `Retry-After` on 429 responses
- **Gateway enforcement:** apply at the gateway before requests reach backends; backends trust the gateway's decision

**Key points:** Algorithm accuracy vs memory trade-off, distributed atomic operations in Redis, and graceful 429 responses with retry guidance.

**Follow-up:** How do you rate-limit across multiple data centers without synchronization overhead? → Use local approximate counters per DC with a small tolerance (5–10% overage); accept slight over-limit rather than adding cross-DC latency.

---

### 26. What is a service mesh and when do you need one? `[Senior]`

**Answer:**
- Service mesh: an infrastructure layer for service-to-service communication; injects a sidecar proxy (Envoy) next to each service pod; proxies intercept all inbound/outbound traffic
- **Core features:** mutual TLS (mTLS) for service identity and encryption, traffic management (retries, timeouts, circuit breakers), observability (L7 metrics, distributed tracing, access logs), canary deployments and traffic shifting
- **Control plane (Istio, Linkerd):** configures sidecar proxies with routing rules, policies, and certificates; watches the Kubernetes API for topology changes
- **When to adopt:** 10+ microservices with complex traffic management; compliance requiring mTLS everywhere; need for fine-grained observability without code changes
- **Cost:** sidecar proxies add ~10–30 MB memory and 1–5 ms latency per hop; the control plane adds operational complexity
- **Lightweight alternative:** eBPF-based meshes (Cilium) operate at the kernel level without sidecar overhead

**Key points:** Sidecar pattern, mTLS for zero-trust networking, and the operational overhead trade-off. Know when a service mesh is overkill.

**Follow-up:** How does Istio's traffic shifting enable canary deployments? → Create a VirtualService with weight rules (90% → v1, 10% → v2); increment v2 weight based on error rate and latency metrics; rollback by shifting weight back in seconds.

---

### 27. How does a reverse proxy differ from a forward proxy, and what can it do? `[Mid]`

**Answer:**
- **Forward proxy:** sits in front of clients; clients direct traffic through it; hides client identity from servers; used for corporate internet filtering, anonymity, and outbound caching
- **Reverse proxy:** sits in front of servers; clients talk to the proxy; hides server topology from clients; used for load balancing, SSL termination, caching, and DDoS protection
- **Core reverse proxy functions:**
  - **SSL/TLS termination:** decrypt HTTPS at the proxy; backends communicate over plain HTTP on the private network
  - **Caching:** cache static assets or API responses; reduce origin load
  - **Compression:** gzip/brotli compress responses before delivery; offloads origin CPU
  - **Request routing:** path-based or host-based routing to multiple backends
  - **WAF:** inspect and block malicious requests (SQLi, XSS, OWASP Top 10)
- Common implementations: NGINX, HAProxy, Caddy, AWS CloudFront, Cloudflare

**Key points:** The directional distinction (forward protects clients, reverse protects servers), and the cluster of cross-cutting features reverse proxies handle.

**Follow-up:** How do you configure NGINX as a reverse proxy with health-check-based failover? → Use an `upstream` block with multiple `server` directives; set `max_fails` and `fail_timeout`. NGINX Plus supports active health checks; open-source NGINX uses passive health checks only.

---

### 28. How does service discovery work in a microservices architecture? `[Mid]`

**Answer:**
- Service discovery: mechanism for services to find network locations of other services dynamically, without hardcoded IPs
- **Client-side discovery:** service queries a registry (Consul, Eureka) for available instances; client performs load balancing from the list; simple but couples the client to the registry SDK
- **Server-side discovery:** client sends requests to a load balancer or API gateway; it queries the registry and routes; client is decoupled from discovery logic
- **Service registry options:**
  - Consul: health-check-aware KV store with DNS and HTTP interfaces; strong consistency via Raft
  - Kubernetes DNS: every Service gets a stable DNS name (`service.namespace.svc.cluster.local`); kube-proxy routes to pod IPs via iptables/IPVS
  - etcd + custom: store service endpoints; watch for changes via long-poll
- **Registration:** self-registration (service registers on startup, deregisters on shutdown); third-party registration (Kubernetes registers via Endpoint objects)
- **Health checks:** registry removes unhealthy instances via active TCP/HTTP checks or heartbeat TTL

**Key points:** Client-side vs server-side discovery trade-offs, health-check integration, and Kubernetes DNS as the most common modern approach.

**Follow-up:** How do you handle the race condition where a service registers before it is ready? → Use a readiness probe that only passes after warm-up completes; register only after the probe passes.

---

### 29. What is the circuit breaker pattern and how do you implement it? `[Mid]`

**Answer:**
- Circuit breaker: wraps calls to a downstream service; opens (blocks calls) when the failure rate exceeds a threshold; prevents cascade failures and gives the downstream service time to recover
- **States:**
  - **Closed:** requests flow normally; failure counter increments on errors
  - **Open:** requests are immediately rejected (fail fast) with a fallback; no load sent to the failing service
  - **Half-open:** after a cool-down period, a probe request is sent; if it succeeds, the circuit closes; if it fails, it stays open
- **Failure criteria:** error rate >50% in a 10-second window, or P99 response time >2 s
- **Fallback strategies:** return cached data, a default value, a degraded response, or a user-friendly error message
- **Implementation:** Resilience4j (Java), Polly (.NET), or Envoy's `outlier_detection` at the service mesh level
- **Cascading failure prevention:** combine circuit breaker with bulkhead (isolated thread pools per downstream) and timeout (cap max wait time)

**Key points:** Three-state state machine, fallback strategy design, and the distinction between circuit breaker (fail fast) and retry (retry with backoff) — use both together.

**Follow-up:** How do you tune circuit breaker thresholds without false positives? → Use a minimum request volume before evaluating (e.g., at least 20 requests in the window); use P99 latency rather than mean; A/B test thresholds in staging.

---

### 30. How do you manage API versioning at scale across hundreds of clients? `[Senior]`

**Answer:**
- Versioning strategies:
  - **URI path versioning (`/v1/`, `/v2/`):** explicit, easy to route; creates URL fragmentation; most widely used
  - **Header versioning (`API-Version: 2024-01-01`):** clean URLs; harder to test in a browser; used by Stripe and GitHub
  - **Query param (`?version=2`):** easy to add; can be accidentally cached; less common
  - **Content negotiation (`Accept: application/vnd.api+json;version=2`):** RESTfully correct; complex to implement
- **Deprecation workflow:** publish sunset date via `Sunset` response headers; send email notifications; monitor per-version traffic to identify laggard clients; hard-cut with `410 Gone`
- **Additive-only changes:** evolve v1 by adding optional fields only (never remove); breaking changes require a new major version
- **Internal routing:** API gateway maps version to backend deployment; run v1 and v2 backends simultaneously during migration
- **Documentation:** OpenAPI spec per version; changelog per version; SDK releases aligned with API versions

**Key points:** Additive-only backward-compatible changes, sunset signaling, and operational management of multiple simultaneous versions.

**Follow-up:** How does Stripe manage versioning for backward compatibility? → Stripe uses version pinning: each API key is pinned to the version at creation; all changes are additive; customers opt into new versions explicitly.

---

## Real-world Systems

### 31. Design a URL shortener (like bit.ly). `[Mid]`

**Answer:**
- **Core requirements:** shorten long URLs, redirect short → long, track analytics (clicks, geo)
- **Key generation options:**
  - Counter-based: auto-increment ID → Base62 encode; simple, sequential (predictable); use a distributed counter (Redis `INCR` or Snowflake ID)
  - Hash-based: MD5/SHA256 of URL → take first 7 chars; collision probability ~0.1% at 1 B URLs; resolve collisions with salt
  - Pre-generated pool: background job generates IDs into a DB pool; workers claim unused IDs atomically
- **Storage:** mapping table (short_id → long_url, created_at, user_id); ~1 KB per record; 100 M URLs = 100 GB — fits in one DB with caching
- **Redirect service:** lookup short_id in Redis cache (LRU, TTL 24 h) → return `301` (permanent, browsers cache) or `302` (temporary, server tracks every click for analytics)
- **Analytics:** on every redirect, publish an event to Kafka; stream processor aggregates clicks per short_id, geo, device into ClickHouse
- **Scale:** 100 M redirects/day = ~1,200 RPS average; Redis handles this easily; scale read replicas for spikes

**Key points:** ID generation strategy (counter vs hash vs pool), 301 vs 302 semantics for analytics, and cache-first read path.

**Follow-up:** How do you prevent users from shortening malicious URLs? → Integrate Google Safe Browsing API on creation; rate limit by IP/user; blocklist known malicious domains; scan asynchronously and tombstone bad URLs.

---

### 32. Design Twitter's home timeline feed. `[Senior]`

**Answer:**
- **Fan-out on write (push model):** when user A tweets, asynchronously write the tweet ID to the home timeline cache (Redis sorted set by timestamp) of all A's followers; reads are O(1)
  - Problem: a celebrity with 50 M followers generates 50 M cache writes per tweet
- **Fan-out on read (pull model):** merge tweet streams of all followed users at read time; no write amplification but poor read performance for users following 1,000 people
- **Hybrid model (Twitter's actual approach):** fan-out on write for users with fewer than ~10,000 followers; fan-out on read for celebrities; merge the pre-computed timeline with celebrity tweets at read time
- **Storage:** tweet metadata in MySQL sharded by tweet_id; timeline cache in Redis clusters (stores only tweet IDs, not full content); full tweet data fetched from the tweet service on read
- **Media:** images/videos stored in blob storage and served via CDN; tweets store only media URLs
- **Ranking:** chronological is simplest; ML-based ranking injects engagement signals (likes, replies, retweets) to reorder

**Key points:** The fan-out trade-off is the core of this question; hybrid model for celebrity accounts; timeline cache stores only tweet IDs.

**Follow-up:** How do you handle a tweet going viral with a spike in replies? → Replies stored separately (parent_tweet_id index); hot tweets promoted to a dedicated in-memory store; auto-scale reply workers from queue depth.

---

### 33. Design YouTube video streaming. `[Senior]`

**Answer:**
- **Upload pipeline:**
  1. Client uploads raw video to blob storage (S3) via resumable multipart upload
  2. Upload service publishes a job to a transcoding queue (SQS/Kafka)
  3. Transcoding workers (FFmpeg on GPU instances) encode to multiple bitrates/resolutions (360p, 720p, 1080p, 4K) and generate HLS/DASH manifest + segments
  4. Encoded segments pushed to CDN origin storage
- **Streaming delivery:** client requests HLS manifest from CDN; player selects quality based on bandwidth (ABR — Adaptive Bitrate); segments fetched from nearest CDN PoP; typical segment = 2–10 s
- **Storage lifecycle:** raw uploads (hot) → encoded segments on CDN (hot) → cold storage for rarely watched videos after 30 days
- **Thumbnails:** extracted at 1 fps during transcoding; top frames or ML-selected best frame stored in CDN
- **Metadata:** title, description, tags in relational DB + Elasticsearch for search; view counts in eventually-consistent counters (Redis HLL or Cassandra counters)
- **Recommendation:** collaborative filtering + deep learning ranking on watch history; pre-computed offline recommendations refreshed every few hours

**Key points:** Transcoding pipeline, adaptive bitrate streaming (HLS/DASH), CDN for segment delivery, and cold storage lifecycle for long-tail videos.

**Follow-up:** How do you prevent transcoding from becoming a bottleneck during a viral upload surge? → Auto-scale transcoding workers from queue depth; prioritize newly uploaded videos; cap concurrent jobs per uploader to prevent starvation.

---

### 34. Design Uber's ride-sharing system. `[Senior]`

**Answer:**
- **Core components:** driver location service, rider request service, matching engine, trip service, pricing/surge service
- **Driver location:** drivers push GPS updates every 4 s; stored in a geospatial index (Redis Geo or PostGIS); indexed by geohash cell for fast proximity search
- **Rider request flow:** rider places request → matching engine queries available drivers within 5 km (geohash lookup) → sorts by ETA (road graph ETA, not Euclidean distance) → sends offer to best driver → driver accepts or declines → repeat with next candidate
- **Matching engine:** stateful, partitioned by city/region; single node per region owns driver state to avoid distributed coordination; Kafka consumers update driver availability
- **Trip state machine:** requested → driver_accepted → driver_arrived → in_trip → completed → paid; persisted in PostgreSQL with event sourcing for auditability
- **Surge pricing:** real-time supply/demand ratio per geohash cell; multiplier computed every minute; displayed to rider before confirmation
- **ETA service:** road graph with real-time traffic; historical travel time per road segment; updated every 5 min with fleet telemetry

**Key points:** Geohash for spatial indexing, state locality in the matching engine, and ETA quality as the key product differentiator.

**Follow-up:** How do you handle a driver who accepts a ride but immediately goes offline? → Trip state machine detects no heartbeat within 30 s → reverts to "searching"; rider is re-matched; driver's acceptance rate metric penalized.

---

### 35. Design WhatsApp messaging. `[Senior]`

**Answer:**
- **Delivery model:** sender → server → receiver; server stores messages until receiver comes online (store-and-forward); once delivered, server deletes the message (privacy)
- **Connection layer:** persistent WebSocket or XMPP connection per client; each connection server handles ~100 k connections; connection state stored in-memory, with a distributed registry (ZooKeeper/Consul) mapping user_id → connection_server_id
- **Message routing:** sender's server looks up receiver's connection server → forwards message directly (gRPC) → connection server pushes to receiver's WebSocket
- **Message ordering:** per-conversation monotonic sequence number assigned server-side; clients display messages in sequence order regardless of arrival
- **Offline delivery:** if receiver is offline, message stored in Cassandra (keyed by user_id, ordered by timestamp); delivered in bulk on reconnect; TTL-based expiry after 30 days
- **End-to-end encryption:** Signal Protocol with Double Ratchet; server never holds plaintext; keys derived from initial key exchange (X3DH)
- **Group messages:** sender sends one message to server; server fans out to each group member (max 256); sender-side encryption keys managed via a key distribution service
- **Media:** encrypted separately; stored in blob store; message contains download URL + decryption key

**Key points:** Connection registry for routing, store-and-forward for offline delivery, and E2E encryption (server never sees plaintext).

**Follow-up:** How do you scale message storage for billions of users? → Cassandra with user_id as partition key; messages sorted by timestamp within the partition; high-volume users may require application-level sub-partitioning.

---

### 36. Design a payment system. `[Senior]`

**Answer:**
- **Core requirements:** idempotent payment processing, double-spend prevention, exactly-once semantics, audit trail, PCI-DSS compliance
- **Idempotency:** every payment request includes a client-generated idempotency key; server stores (idempotency_key → result) before processing; duplicate requests return the stored result without re-processing
- **Payment flow:**
  1. Create a payment intent (pending) in DB within a transaction
  2. Call payment processor (Stripe, Braintree) with the idempotency key
  3. On success: update DB to completed, publish `payment.completed` event
  4. On failure: update DB to failed; surface error to caller
- **Outbox Pattern:** write payment record + outbox event in one DB transaction; a relay reads the outbox and calls the payment processor; guarantees no event is lost
- **Exactly-once guarantee:** idempotency key at the processor + Outbox pattern = at-least-once delivery with idempotent processing = exactly-once semantics
- **Audit log:** immutable append-only ledger; every state change recorded; never update, only insert
- **Fraud detection:** rule engine + ML model scoring each transaction in real time (<100 ms); block high-risk transactions for manual review
- **Reconciliation:** nightly batch job compares internal DB with processor settlement report; flag discrepancies for the ops team

**Key points:** Idempotency, Outbox pattern for distributed transactions, immutable audit ledger, and PCI scope reduction.

**Follow-up:** How do you handle a payment processor timeout where you do not know if the charge succeeded? → Query the processor with the same idempotency key — they return the canonical result; never retry blindly without querying first.

---

### 37. Design a distributed cache (like Redis Cluster). `[Senior]`

**Answer:**
- **Data partitioning:** Redis Cluster uses 16,384 hash slots; each key maps to `CRC16(key) % 16384`; hash slots distributed across master nodes
- **Cluster topology:** N master nodes, each with M replicas; masters handle writes; replicas take over if a master fails
- **Replication:** async master → replica; slight data loss possible on master failure before replication; use `min-replicas-to-write` for durability
- **Failover:** replicas monitor masters via gossip protocol; if a master is unreachable for `cluster-node-timeout` (default 15 s), replicas vote for a new master
- **Client routing:** smart client (redis-py-cluster, Jedis) caches slot-to-node mapping; on `MOVED` or `ASK` redirect, updates its map; no proxy needed
- **Hot key problem:** one key receiving millions of RPS exhausts one shard; solutions: local in-process cache for ultra-hot keys, read from replicas, key sharding with suffix (`key:0`…`key:9` round-robin)
- **Eviction policies:** `allkeys-lru`, `volatile-lru`, `allkeys-lfu`, `noeviction`; select based on whether the cache is ephemeral or a primary store
- **Persistence:** RDB snapshots (periodic, compact) + AOF (every command logged); use both for durability

**Key points:** Hash slot partitioning, async replication trade-offs, hot key mitigation, and eviction policy selection.

**Follow-up:** How do you perform zero-downtime cluster resharding when adding a new node? → Use `redis-cli --cluster reshard` to migrate hash slots one at a time; `MOVED` redirects handle clients transparently during migration.

---

### 38. Design a search autocomplete system. `[Mid]`

**Answer:**
- **Requirements:** suggest completions as user types; latency <100 ms; blend personalized (recent searches) + global popular queries
- **Trie approach:** store query strings in a trie; each node stores top-K completions pre-computed by frequency; lookup O(prefix length); works for ~10 M terms in memory
- **At scale — Redis sorted set approach:** store (prefix → top-K queries) in sorted sets scored by query count; range scan O(log N + K); horizontally scalable
- **Offline computation:** Spark job aggregates query logs daily; computes top-K per prefix; publishes to Redis via blue-green swap
- **Real-time freshness:** merge offline top-K with real-time counters (`ZINCRBY` on current queries); weight offline score higher for stability
- **Personalization:** blend global top-K with user's recent query history (Redis or user DB); recent searches ranked higher for logged-in users
- **CDN caching:** short prefixes (1–3 chars) generate enormous traffic; cache their completions at CDN edge with 60 s TTL

**Key points:** Trie vs inverted index trade-off, offline batch computation of top-K, and real-time blending.

**Follow-up:** How do you prevent offensive queries from appearing in autocomplete? → Blocklist filter on ingestion and serving; human-reviewed blocklist updated in near-real-time; safety classifier model scores new candidates before promotion.

---

### 39. Design a push notification system. `[Senior]`

**Answer:**
- **Channels:** push (APNs for iOS, FCM for Android/web), SMS (Twilio, AWS SNS), email (SendGrid, SES), in-app notifications
- **Architecture:**
  1. Producer services publish notification events to Kafka (`notification.requested` topic)
  2. Notification service consumes events; looks up device tokens and channel preferences from a user-preference DB
  3. Dispatcher routes to the appropriate channel provider (APNs, FCM, Twilio) with retries and exponential backoff
  4. Delivery status webhooks from providers update the notification_log DB
- **Device token management:** tokens expire or change on app reinstall; handle `InvalidRegistration` errors from FCM/APNs by deleting stale tokens
- **Rate limiting:** marketing campaigns throttled to avoid overwhelming providers and user devices; priority queue: transactional (high priority) vs marketing (low priority)
- **Deduplication:** idempotency key per notification; if the same event fires twice, deliver only once
- **Scale numbers:** 10 M notifications/minute = ~167 k/s; APNs supports ~1 M/s with HTTP/2 multiplexing; shard dispatcher workers by `user_id % N`
- **Analytics:** track delivered, opened, and clicked; funnel analysis for campaign effectiveness

**Key points:** Separation of notification generation from dispatch, device token lifecycle, priority queuing, and deduplication.

**Follow-up:** How do you handle time-zone-sensitive notifications (send at 9 AM local time for each user)? → Store user time zone; compute send-at UTC timestamp per user; use a scheduled job queue (Kafka timestamp-based topics or Temporal workflows) to deliver at the right time.

---

### 40. Design Google Drive (file storage and sync). `[Senior]`

**Answer:**
- **Upload:** file chunked into 4 MB blocks; client computes SHA-256 of each block; only changed blocks are uploaded (delta sync); blocks stored in blob storage keyed by content hash (deduplication across users)
- **Metadata service:** hierarchical namespace (folder tree) stored in a relational DB; each file record has file_id, name, parent_folder_id, owner, ACL, and a list of block hashes and offsets
- **Sync protocol:**
  1. Client polls or holds a long-poll connection for change events
  2. Server sends a change notification with the updated file version and delta
  3. Client downloads only changed blocks; reassembles the file locally
- **Conflict resolution:** last-write-wins for simple conflicts; create a "conflicted copy" if both client and server have independent changes since last sync
- **Real-time editing:** Operational Transformation (OT) or CRDTs merge concurrent edits; WebSocket connection for low-latency collaboration
- **Sharing and ACL:** per-file ACL stored in the metadata DB; checked on every access; shared links use signed tokens with expiry
- **Storage tiers:** hot files on standard storage; files not accessed >6 months moved to Nearline; trash moved to Coldline

**Key points:** Content-addressed block storage (deduplication), delta sync (only upload changed blocks), and hierarchical namespace management.

**Follow-up:** How do you handle a 10 GB file upload on a mobile device with an unstable connection? → Resumable multipart upload: client tracks which blocks succeeded; on reconnect, only re-uploads failed blocks; server assembles when all blocks are received.

---

### 41. Design a web crawler (like Googlebot). `[Senior]`

**Answer:**
- **Core loop:** URL frontier → fetch → parse → extract links → deduplicate → add to frontier → repeat
- **URL frontier (priority queue):** priority based on PageRank estimate, freshness score, and crawl politeness; sharded by domain hash to group same-domain URLs together
- **Politeness:** obey `robots.txt`; rate-limit per domain (e.g., 1 request per second per host); respect `Crawl-delay`
- **Fetcher:** plain HTTP for static pages; headless browser (Puppeteer) for JS-rendered pages; connection pool to avoid overwhelming target hosts
- **Deduplication:** URL normalization (lowercase, remove fragment, canonical query params) + Bloom filter for seen URLs (~1 billion URLs → ~1 GB Bloom filter at 1% FPR); SimHash for near-duplicate content detection
- **Storage:** raw HTML in blob storage (URL hash + crawl timestamp); extracted text + metadata in Elasticsearch; link graph for PageRank computation
- **Distributed architecture:** partition by domain; each worker owns a domain set; avoids coordination for politeness; local DNS caching
- **Recrawl scheduling:** freshness model based on content change rate history; news sites every 15 min; static pages weekly
- Scale: Googlebot crawls ~20 billion pages; ~100 k fetches/second across the cluster

**Key points:** Politeness (robots.txt, per-domain rate limiting), deduplication at URL and content level, and frontier prioritization.

**Follow-up:** How do you crawl JavaScript-rendered pages without running a full headless browser on every URL? → Detect JS-heavy pages by HTML content ratio; fall back to headless browser only for those; cache rendered output by URL.

---

### 42. Design an e-commerce checkout system. `[Senior]`

**Answer:**
- **Checkout flow:** cart → inventory reservation → payment → order confirmation → fulfillment trigger
- **Inventory reservation (soft lock):** reserve items for 10 min when checkout begins (decrement available count, record reservation with expiry); prevents overselling during payment processing
- **Idempotent order creation:** generate order_id client-side (UUID); server creates order only if order_id is not already in DB; retries are safe
- **Payment integration:** Outbox Pattern — within one DB transaction: insert order (status=pending) + insert outbox record; relay picks up and calls payment processor
- **Oversell prevention:** reservation uses row-level locking (`SELECT ... FOR UPDATE`) or optimistic locking (version column); on payment success, confirm reservation; on failure or expiry, release it
- **Saga pattern:** sequence of local transactions with compensating actions; avoids distributed 2PC across services
- **Order state machine:** cart → checkout → reserved → payment_pending → paid → fulfillment_queued → shipped → delivered; each state persisted, transitions idempotent
- **Flash sales / high concurrency:** queue buyers in a virtual waiting room; serve checkout in batches to prevent DB overload

**Key points:** Inventory reservation to prevent oversell, idempotency at order creation and payment, and the Saga pattern for distributed consistency.

**Follow-up:** How do you handle inventory reconciliation if the reservation expiry job fails? → A separate idempotent background job scans for expired reservations and releases them; running it multiple times produces the same result.

---

### 43. Design a real-time leaderboard. `[Mid]`

**Answer:**
- **Core requirement:** rank millions of users by score; update score on game events; query top-K and a user's own rank in real time
- **Redis sorted set:** `ZADD leaderboard_id score user_id` (O(log N)); `ZREVRANK leaderboard_id user_id` for rank (O(log N)); `ZREVRANGE leaderboard_id 0 99` for top-100 (O(log N + K))
- **Scale:** a single Redis node handles ~1 M ZADD/s; at 100 M users the sorted set is ~3–4 GB (fits in memory)
- **Partitioning:** time-windowed leaderboards (daily, weekly, all-time) with smaller key spaces; shard by game/region for truly global scale
- **Persistence:** Redis AOF + RDB for durability; replicate to a standby; rebuild from Kafka event log if Redis fails
- **Complex scoring:** Flink aggregates per-user scoring events (sum, max, time-decayed) → writes final score to Redis `ZADD`
- **Around-user rank:** `ZREVRANGE leaderboard_id (user_rank - 5) (user_rank + 5)` fetches 10 neighbors
- **Anti-cheat:** server-authoritative score validation; anomaly detection (score jump >3σ triggers review)

**Key points:** Redis sorted set is the canonical answer; time-windowed leaderboards for scale; server-side score validation.

**Follow-up:** How do you handle the leaderboard at the end of a tournament when millions of users submit scores simultaneously? → Queue score events in Kafka; Flink processes them in order; Redis updated after validation; rate-limit per-user score updates.

---

### 44. Design a distributed job scheduler (like Airflow or AWS Step Functions). `[Senior]`

**Answer:**
- **Core requirements:** schedule jobs by cron or DAG dependency; at-least-once execution with idempotency for exactly-once semantics; retry on failure; observe status; distribute across workers
- **Scheduler service:** reads job definitions from DB; computes next-run time; inserts runnable jobs into a work queue (Redis, SQS, Kafka)
- **Worker pool:** workers pull jobs from queue; execute; update status; heartbeat every N seconds; scheduler re-enqueues if heartbeat stops
- **DAG dependency:** job waits for all upstream jobs to complete; scheduler monitors completion events and enqueues dependents only when all parents succeed
- **Exactly-once execution:** idempotency key (job_id + execution_id) stored in DB before execution; re-runs produce the same result (idempotent job logic required)
- **Distributed locking:** only one scheduler instance enqueues a given job; use Redis `SETNX` + expiry or PostgreSQL advisory lock to prevent duplicate scheduling
- **Observability:** execution log, duration histogram, failure rate per job, DAG visualization UI
- **Backfill:** re-run historical time ranges by generating historical execution instances with original scheduled timestamps

**Key points:** At-least-once delivery via queue + heartbeat, DAG dependency tracking, idempotent job design, and distributed lock for the single-scheduler invariant.

**Follow-up:** How do you handle a job that runs 6 hours and the worker node dies after 5 hours? → Checkpoint progress to durable storage periodically; on restart, the job reads the last checkpoint and continues rather than restarting from scratch.

---

### 45. Design a news feed ranking system (like Facebook or LinkedIn). `[Senior]`

**Answer:**
- **Candidate generation:** fetch recent posts from friends/followed entities via fan-out-on-write timeline store; typically retrieve 500–1,000 candidates per feed request
- **Feature extraction:** engagement metrics (likes, comments, shares, watch time), recency, relationship strength (close friend vs distant connection), content type affinity (user watches more videos)
- **Scoring model:** gradient boosted trees or neural net trained on click/engagement labels; inference runs per request on the candidate set; target latency <100 ms
- **Diversity and balance:** cap posts per author to prevent feed domination; balance content types; interleave ads at fixed positions
- **Feedback loop:** user engagement events (like, click, hide, unfollow) fed back to the training pipeline; model retrained daily/weekly; A/B tested before full rollout
- **Infrastructure:** candidate retrieval (Redis/Cassandra) → feature service → ranking service (ML inference) → diversity filter → response; all within 200 ms
- **Cold start:** new users get a topic-based ranked feed; transition to personalized model after ~20 interactions

**Key points:** Two-stage pipeline (candidate retrieval → ranking), ML model for scoring, diversity constraints, and feedback loop for continuous learning.

**Follow-up:** How do you prevent the feedback loop from reinforcing filter bubbles? → Introduce an exploration term (epsilon-greedy or Thompson sampling) that occasionally shows content outside the user's predicted preferences; measure long-term retention as the success metric.

---

## Reliability

### 46. How do you design for disaster recovery? `[Senior]`

**Answer:**
- **RPO (Recovery Point Objective):** maximum acceptable data loss (e.g., RPO = 1 hour means you can tolerate losing 1 hour of data)
- **RTO (Recovery Time Objective):** maximum acceptable downtime (e.g., RTO = 4 hours means the system must be back online within 4 hours)
- **DR strategies (increasing cost, decreasing RTO/RPO):**
  - **Backup and restore:** nightly DB dumps to S3; cheapest; RTO hours–days; RPO = backup interval
  - **Pilot light:** minimal DB replication on, compute stopped in DR region; RTO 30–60 min
  - **Warm standby:** scaled-down functional replica in DR region; RTO 5–15 min; RPO seconds (sync replication)
  - **Active-active multi-region:** traffic split across 2+ regions; failover = traffic rerouting; RTO seconds; highest cost
- **Data replication:** synchronous cross-region for RPO=0 (only feasible for small, critical datasets); asynchronous for most data
- **Runbook:** documented step-by-step failover procedure; tested quarterly; automated where possible (Terraform to recreate infra, Route 53 health-check-based DNS failover)
- **Chaos engineering:** regularly inject failures in production to validate recovery mechanisms work as expected

**Key points:** RPO and RTO are the quantitative requirements that drive DR strategy choice; cost vs recovery speed trade-off; regular DR drills are essential, not optional.

**Follow-up:** How do you test your DR plan without impacting production? → Run DR drills in a staging environment mirroring production; use traffic shadowing (copy production traffic to DR region) to validate functionality; use chaos engineering with automatic rollback for production validation.

---

### 47. How do blue-green and canary deployments work? `[Mid]`

**Answer:**
- **Blue-green deployment:**
  - Maintain two identical environments: Blue (current production) and Green (new version)
  - Deploy and test new version on Green while Blue serves all traffic
  - Switch traffic from Blue to Green instantly (DNS change, load balancer update, or feature flag)
  - Blue remains on standby for instant rollback; decommission after validation window
  - Trade-offs: requires 2x infrastructure cost; instant cutover with no gradual rollout; DB migrations must be backward compatible
- **Canary deployment:**
  - Route a small percentage (1%, 5%, 10%) of traffic to the new version; the rest stays on the old version
  - Monitor error rate, latency, and business metrics on canary vs baseline
  - Gradually increase canary traffic if metrics are healthy; rollback immediately on degradation
  - Trade-offs: limits blast radius; requires traffic splitting at load balancer or service mesh; monitoring and automated rollback criteria are critical
- **Feature flags:** decouple code deployment from feature release; ship disabled; enable for specific users; instant rollback by disabling the flag

**Key points:** Blue-green for instant cutover and instant rollback; canary for gradual traffic shifting with metric-gated progression; feature flags for decoupling deployment from release.

**Follow-up:** How do you handle DB schema migrations with blue-green deployments? → Use expand-contract migrations: Phase 1 (expand) — add new columns; Phase 2 — deploy new code; Phase 3 (contract) — remove old columns after all old instances are gone.

---

### 48. What is chaos engineering and how do you implement it? `[Senior]`

**Answer:**
- Chaos engineering: proactively inject failures in production (or production-like environments) to validate that the system recovers gracefully and to find weaknesses before they cause outages
- **Principles:** define steady-state behavior, hypothesize that steady state continues in the experimental group, introduce failure variables, attempt to disprove the hypothesis
- **Failure injection types:**
  - **Infrastructure:** terminate random EC2 instances, kill pods (Chaos Monkey, kube-monkey), inject network latency (tc netem, Toxiproxy)
  - **Application:** kill random microservice instances, delay responses, return errors from dependencies
  - **Network:** partition networks, drop packets, introduce jitter
  - **Region-level:** block all traffic to an AZ or region (Netflix "Chaos Kong")
- **Game days:** structured exercises where engineers rehearse failure scenarios; document what broke, recovery time, and runbook gaps
- **Automated chaos:** schedule experiments in non-peak hours; gate behind feature flags; auto-stop if blast radius exceeds a safety threshold
- **Observability prerequisite:** chaos engineering is useless without good monitoring; you need dashboards and alerts to detect when the system is not recovering

**Key points:** Chaos engineering is a scientific experiment with a hypothesis and measured steady-state metrics — not random destruction.

**Follow-up:** How do you get organizational buy-in for running chaos experiments in production? → Start with staging; build a track record; present the cost of outages vs the cost of experiments; involve on-call engineers in game days; celebrate when experiments expose real weaknesses.

---

### 49. What are SLA, SLO, and SLI, and how do you use them? `[Mid]`

**Answer:**
- **SLI (Service Level Indicator):** a quantitative metric measuring a specific aspect of service behavior; examples: request success rate, P99 latency, data freshness, error rate
- **SLO (Service Level Objective):** a target value for an SLI; examples: success rate ≥ 99.9% over 30 days; P99 latency <200 ms; these are internal commitments
- **SLA (Service Level Agreement):** a contractual commitment to a customer, typically with financial penalties for breach; usually less stringent than the SLO (internal buffer)
- **Error budget:** `(1 - SLO) × time window`; e.g., 99.9% SLO → 43.8 minutes of allowed downtime per month; when the budget is exhausted, freeze risky deployments
- **Error budget policy:** budget >50%: deploy freely; 50–0%: additional review required; 0% (exhausted): freeze deployments, focus on reliability
- **Common SLIs:** availability (% successful requests), latency (P99/P50), error rate (% 5xx), saturation (CPU/memory headroom), throughput (RPS)
- **Multi-window burn rate alerts:** alert when the error budget is being consumed too fast (e.g., burning a 30-day budget in 1 hour), not just when it is exhausted

**Key points:** SLI (measurement), SLO (target), SLA (contract), and how error budgets create a shared language between product and reliability teams.

**Follow-up:** How do you set an SLO for a new service with no historical data? → Deploy with monitoring; run for 4–6 weeks without an SLO; analyze P99 latency and success rate distribution; set the SLO slightly below the current baseline; tighten over time.

---

### 50. How do you design incident response runbooks? `[Senior]`

**Answer:**
- **Purpose:** step-by-step instructions for a specific incident type; enables consistent, fast response even from on-call engineers unfamiliar with the system
- **Anatomy of a good runbook:**
  - **Alert description:** what triggered the alert, why it matters, who is affected
  - **Severity and escalation:** severity level (P1–P4), escalation path (who to page if L1 cannot resolve)
  - **Diagnosis steps:** ordered list of commands, dashboards, and log queries; include expected vs abnormal output
  - **Mitigation options:** ordered from safest/fastest (restart a pod) to most impactful (failover to DR region); include rollback steps
  - **Communication template:** status page message, stakeholder update cadence, customer-facing language
  - **Post-incident:** link to blameless post-mortem template; RCA timeline, contributing factors, action items
- **Runbook maintenance:** review after every incident; update if steps were wrong or missing; automate repeatable steps (PagerDuty Runbook Automation, AWS Systems Manager)
- **Blameless culture:** post-mortems focus on system failures and process gaps, not individuals; psychological safety enables honest reporting and better learning
- **Incident metrics:** MTTD (Mean Time to Detect), MTTR (Mean Time to Resolve), incident frequency, repeat incident rate

**Key points:** Runbooks must be tested and maintained — stale runbooks are dangerous; automate repeatable mitigation steps; blameless post-mortems are the engine of reliability improvement.

**Follow-up:** How do you measure whether incident response is improving over time? → Track MTTR trend monthly; measure repeat incident rate (same root cause); count action items closed from post-mortems; track error budget consumption vs last quarter.

---
