import { useState } from 'preact/hooks';

interface Topic {
  title: string;
  summary: string;
  bullets: string[];
  tags: string[];
}

const TOPICS: Topic[] = [
  {
    title: 'CAP Theorem',
    summary: 'A distributed system can guarantee at most 2 of 3: Consistency, Availability, Partition Tolerance.',
    bullets: [
      'CP systems: sacrifice availability during network partition (HBase, ZooKeeper, etcd)',
      'AP systems: sacrifice consistency, always respond (Cassandra, CouchDB, DynamoDB with eventual consistency)',
      'CA systems: only possible without network partitions — rare in practice',
      'In real-world, P is mandatory, so choose C or A',
      'Eventual consistency: all nodes converge to same value given no new writes',
    ],
    tags: ['distributed', 'consistency', 'availability', 'fundamentals'],
  },
  {
    title: 'Load Balancer',
    summary: 'Distributes incoming traffic across multiple servers to prevent bottlenecks.',
    bullets: [
      'Algorithms: Round Robin, Least Connections, IP Hash, Weighted Round Robin',
      'Layer 4 (transport): routes by IP/TCP — fast, no content inspection',
      'Layer 7 (application): routes by URL, cookies, headers — more flexible',
      'Health checks: remove unhealthy nodes automatically',
      'Tools: Nginx, HAProxy, AWS ALB/NLB, Cloudflare Load Balancing',
      'Sticky sessions: route same user to same backend (breaks statelessness)',
    ],
    tags: ['scalability', 'networking', 'load-balancer', 'fundamentals'],
  },
  {
    title: 'Caching',
    summary: 'Store frequently accessed data in fast memory to reduce latency and backend load.',
    bullets: [
      'Cache-aside (lazy loading): app checks cache, on miss fetches from DB and writes to cache',
      'Write-through: write to cache and DB simultaneously — consistent but slower writes',
      'Write-back (write-behind): write to cache, async to DB — fast writes, risk of data loss',
      'Eviction policies: LRU (Least Recently Used), LFU, TTL-based expiry',
      'Cache stampede / thundering herd: many requests hit DB on cache miss — use locks or probabilistic early expiry',
      'Tools: Redis (persistence, pub/sub, data structures), Memcached (simple key-value, horizontal scale)',
      'CDN as cache: cache static assets at edge nodes (Cloudflare, Fastly, CloudFront)',
    ],
    tags: ['caching', 'performance', 'redis', 'cdn'],
  },
  {
    title: 'Database Types',
    summary: 'Choose the right database engine based on data shape, access patterns, and consistency needs.',
    bullets: [
      'Relational (SQL): structured data, ACID, joins — PostgreSQL, MySQL, SQLite',
      'Document: flexible JSON documents, good for nested objects — MongoDB, CouchDB, Firestore',
      'Key-Value: ultra-fast lookup by key — Redis, DynamoDB, etcd',
      'Wide-Column: large-scale time series and write-heavy — Cassandra, HBase, Bigtable',
      'Graph: relationships first — Neo4j, Amazon Neptune, TigerGraph',
      'Search: full-text search, aggregations — Elasticsearch, OpenSearch, Typesense',
      'Time-Series: sensor/metric data with timestamp — InfluxDB, TimescaleDB, Prometheus',
      'OLAP: analytics, columnar storage — ClickHouse, BigQuery, Redshift, Snowflake',
    ],
    tags: ['database', 'sql', 'nosql', 'fundamentals'],
  },
  {
    title: 'SQL vs NoSQL',
    summary: 'SQL gives strong consistency and structure; NoSQL gives flexibility and horizontal scale.',
    bullets: [
      'SQL: ACID transactions, normalized schema, complex joins — good for financial/e-commerce',
      'NoSQL: eventual consistency, denormalized, horizontal sharding — good for social/IoT/logs',
      'SQL scales vertically (bigger machine); NoSQL scales horizontally (more machines)',
      'NewSQL: combines both — CockroachDB, PlanetScale, Google Spanner, YugabyteDB',
      'Use SQL when: data relationships are complex, consistency is critical, team knows SQL',
      'Use NoSQL when: schema changes frequently, need extreme write throughput, geographic distribution',
    ],
    tags: ['database', 'sql', 'nosql', 'fundamentals'],
  },
  {
    title: 'Message Queues',
    summary: 'Decouple producers and consumers; handle async tasks and traffic spikes.',
    bullets: [
      'Pub/Sub: one publisher, many subscribers — Kafka, Google Pub/Sub, Redis Pub/Sub',
      'Point-to-point: one producer, one consumer — SQS, RabbitMQ queues',
      'Kafka: high-throughput, persistent, replayable log — great for event sourcing and analytics',
      'RabbitMQ: flexible routing, supports AMQP, better for task queues with complex routing',
      'SQS: managed, serverless, at-least-once delivery, dead-letter queues',
      'Use cases: email sending, video processing, order processing, notification pipelines',
      'Backpressure: slow consumers cause queue growth — implement consumer scaling or rate limiting',
    ],
    tags: ['messaging', 'kafka', 'queue', 'async'],
  },
  {
    title: 'API Design',
    summary: 'Design clean, consistent APIs that are easy to use and scale.',
    bullets: [
      'REST: stateless, resource-based URLs, HTTP verbs (GET/POST/PUT/DELETE/PATCH)',
      'GraphQL: client specifies exactly what data it needs — reduces over/under-fetching',
      'gRPC: binary protocol (Protobuf), fast, streaming — great for internal microservices',
      'Versioning: URL path (/v1/), Accept header, or query param — URL path is most common',
      'Pagination: offset-based (page=2&limit=20) or cursor-based (after=cursor) — cursor better for live data',
      'Rate limiting: per user/IP, return 429 Too Many Requests with Retry-After header',
      'Idempotency: PUT and DELETE are idempotent; POST is not. Use idempotency keys for retries.',
    ],
    tags: ['api', 'rest', 'graphql', 'design'],
  },
  {
    title: 'Microservices vs Monolith',
    summary: 'Monolith is simpler to start; microservices enable independent scaling and deployment.',
    bullets: [
      'Monolith: single deployable unit — easier to develop, test, and debug at small scale',
      'Microservices: each service owns its domain, deploys independently, can use different tech stacks',
      'Service mesh: handles service discovery, load balancing, mTLS — Istio, Linkerd, Consul',
      'API Gateway: single entry point, handles auth, routing, rate limiting — Kong, AWS API Gateway',
      'Service discovery: services find each other dynamically — Consul, Kubernetes DNS, Eureka',
      'Distributed tracing: trace requests across services — Jaeger, Zipkin, OpenTelemetry',
      'Start with monolith, extract services when: team is large, deploy frequency conflicts, or scaling needs differ',
    ],
    tags: ['architecture', 'microservices', 'monolith', 'design'],
  },
  {
    title: 'Horizontal vs Vertical Scaling',
    summary: 'Scale up (bigger machine) or scale out (more machines).',
    bullets: [
      'Vertical scaling: more CPU/RAM — simple, but has limits and creates single point of failure',
      'Horizontal scaling: add more instances — requires stateless design, load balancer, shared storage',
      'Stateless services scale horizontally easily; stateful services need distributed state management',
      'Auto-scaling: AWS ASG, Kubernetes HPA — scale based on CPU, memory, or custom metrics',
      'Database read replicas: scale reads horizontally; primary handles writes',
      'Sharding: distribute data across multiple DB instances — hash sharding, range sharding',
    ],
    tags: ['scalability', 'fundamentals', 'database'],
  },
  {
    title: 'Consistent Hashing',
    summary: 'Distribute data across nodes so adding/removing nodes only remaps a small fraction of keys.',
    bullets: [
      'Problem with mod N: adding/removing servers causes most keys to remap to new servers',
      'Ring: virtual circle with hash space 0–2³², servers and keys placed by hash',
      'Key goes to nearest server clockwise — only adjacent segment remaps on server change',
      'Virtual nodes: each physical server has multiple virtual positions — better balance',
      'Used in: Cassandra, DynamoDB, Chord DHT, Memcached (with clients)',
      'Hotspot mitigation: more virtual nodes for higher-capacity servers',
    ],
    tags: ['distributed', 'hashing', 'fundamentals'],
  },
  {
    title: 'Rate Limiting',
    summary: 'Control request rate to protect systems from abuse and overload.',
    bullets: [
      'Token Bucket: tokens accumulate up to a max, consumed per request — allows bursts',
      'Leaky Bucket: requests processed at constant rate — smoother output, drops excess',
      'Fixed Window: count in fixed time window — allows burst at window boundary',
      'Sliding Window Log: track timestamps of all requests — accurate, memory-intensive',
      'Sliding Window Counter: combines fixed and log approaches — good balance',
      'Where to enforce: API Gateway, Nginx, application layer, or Redis (centralized)',
      'Return 429 with Retry-After header; expose X-RateLimit-Remaining and X-RateLimit-Reset',
    ],
    tags: ['api', 'security', 'design', 'fundamentals'],
  },
  {
    title: 'CDN (Content Delivery Network)',
    summary: 'Cache static and dynamic content at edge nodes closer to users.',
    bullets: [
      'PoPs (Points of Presence): servers in many geographic locations — reduce latency',
      'Push CDN: preload content to edge — good for large static files, infrequently updated',
      'Pull CDN: fetch from origin on first request, cache at edge — simpler to manage',
      'Cache-Control headers: max-age, s-maxage, stale-while-revalidate, no-cache',
      'Cache invalidation: purge by URL, tag, or surrogate key',
      'CDNs: Cloudflare, Fastly, AWS CloudFront, Akamai, BunnyCDN',
      'Also useful for: DDoS protection, WAF, image optimization, edge compute (Workers)',
    ],
    tags: ['cdn', 'caching', 'performance', 'networking'],
  },
  {
    title: 'Database Indexing',
    summary: 'Speed up reads with indexes; understand the trade-offs for writes.',
    bullets: [
      'B-Tree index: default in PostgreSQL/MySQL — excellent for equality and range queries',
      'Hash index: O(1) equality lookups, no range queries — used in hash join operations',
      'GIN index: arrays, JSONB, full-text search — PostgreSQL',
      'Composite index: (col_a, col_b) — only usable if query filters on col_a first (leftmost prefix)',
      'Covering index: index contains all columns needed by query — avoids table fetch',
      'Index bloat: frequent updates cause dead tuples — VACUUM in PostgreSQL, OPTIMIZE in MySQL',
      'Rule of thumb: index columns in WHERE, ORDER BY, JOIN ON, GROUP BY — but benchmark first',
    ],
    tags: ['database', 'sql', 'performance', 'indexing'],
  },
  {
    title: 'Replication',
    summary: 'Copy data across multiple nodes for high availability and read scalability.',
    bullets: [
      'Leader-Follower (Master-Replica): all writes to leader, replicated to followers asynchronously',
      'Synchronous replication: waits for follower ACK before commit — slower but no data loss',
      'Asynchronous replication: does not wait — faster writes but possible data loss on failover',
      'Multi-Leader: multiple leaders accept writes — resolves conflicts (last-write-wins, CRDTs)',
      'Leaderless (Quorum): write to W of N nodes, read from R of N — Cassandra, DynamoDB',
      'Replication lag: followers may be seconds behind leader — avoid reading stale data for critical ops',
      'Failover: automated (semi-sync + sentinel) or manual. Test failover in production regularly.',
    ],
    tags: ['database', 'distributed', 'replication', 'fundamentals'],
  },
  {
    title: 'Blob / Object Storage',
    summary: 'Store and serve large unstructured files — images, videos, backups, logs.',
    bullets: [
      'Block storage: raw disk, low-latency, for databases and boot volumes — AWS EBS, GCP PD',
      'File storage: shared filesystems — AWS EFS, NFS — good for legacy apps',
      'Object storage: flat namespace, S3-compatible API, infinite scale — S3, GCS, R2, MinIO',
      'Pre-signed URLs: let clients upload/download directly without exposing credentials',
      'Multipart upload: upload large files in parallel chunks — required >5 GB in S3',
      'Lifecycle rules: auto-transition to cheaper storage classes (S3 Glacier) after N days',
      'Combine with CDN for fast media delivery to end users',
    ],
    tags: ['storage', 's3', 'cloud', 'fundamentals'],
  },
];

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit';

export default function SystemDesignCheatsheet() {
  const [search, setSearch] = useState('');
  const [activeTag, setActiveTag] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const allTags = Array.from(new Set(TOPICS.flatMap(t => t.tags))).sort();

  const filtered = TOPICS.filter(t => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.title.toLowerCase().includes(q) || t.summary.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
    const matchTag = !activeTag || t.tags.includes(activeTag);
    return matchSearch && matchTag;
  });

  return (
    <div class="space-y-5">
      {/* Search */}
      <input
        type="text"
        placeholder="Search topics (CAP, load balancer, caching…)"
        value={search}
        onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
        class="w-full bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary"
      />

      {/* Tag filter */}
      <div class="flex flex-wrap gap-2">
        <button
          onClick={() => setActiveTag('')}
          class={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === '' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary hover:text-primary'}`}
        >
          All
        </button>
        {allTags.map(tag => (
          <button
            key={tag}
            onClick={() => setActiveTag(tag === activeTag ? '' : tag)}
            class={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${activeTag === tag ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:border-primary hover:text-primary'}`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Topics */}
      <div class="space-y-3">
        {filtered.length === 0 && (
          <p class="text-text-muted text-sm text-center py-8">No topics match your search.</p>
        )}
        {filtered.map(topic => (
          <div key={topic.title} class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <button
              class="w-full text-left px-5 py-4 flex items-start justify-between gap-3 hover:bg-bg transition-colors"
              onClick={() => setExpanded(expanded === topic.title ? null : topic.title)}
            >
              <div>
                <h3 class="font-semibold text-sm">{topic.title}</h3>
                <p class="text-text-muted text-xs mt-0.5">{topic.summary}</p>
              </div>
              <span class="text-text-muted text-lg shrink-0 mt-0.5">{expanded === topic.title ? '−' : '+'}</span>
            </button>
            {expanded === topic.title && (
              <div class="px-5 pb-4 border-t border-border">
                <ul class="mt-3 space-y-2">
                  {topic.bullets.map((b, i) => (
                    <li key={i} class="flex gap-2 text-sm">
                      <span class="text-primary mt-0.5 shrink-0">▸</span>
                      <span class="text-text-muted">{b}</span>
                    </li>
                  ))}
                </ul>
                <div class="flex flex-wrap gap-1.5 mt-3">
                  {topic.tags.map(tag => (
                    <span key={tag} class="px-2 py-0.5 bg-bg rounded text-xs text-text-muted border border-border">{tag}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center mt-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Build your own tools site</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">12 pre-built developer tools, Astro + Preact + Tailwind. Deploy to Cloudflare Pages in minutes.</p>
        <a
          href={DEVTOOLKIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
        >
          Get DevToolkit Starter Kit — $19 →
        </a>
      </div>
    </div>
  );
}
