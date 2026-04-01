---
title: "Database Performance Tuning Guide: Query Optimization, Indexing, Connection Pooling"
description: "Complete database performance tuning guide: EXPLAIN ANALYZE, index strategies (B-tree, partial, composite), query optimization, connection pooling with pgBouncer, N+1 problem solutions."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["database", "performance", "indexing", "query optimization", "connection pooling", "PostgreSQL", "SQL"]
readingTime: "9 min read"
category: "database"
---

A slow database is the root cause of most application performance problems. The good news: the majority of database performance issues are fixable without scaling hardware. Missing indexes, unoptimized queries, and connection exhaustion account for 80% of database slowdowns in production. This guide gives you the tools to diagnose and fix all three.

## EXPLAIN ANALYZE: Reading Query Plans

`EXPLAIN ANALYZE` is the first tool you reach for when a query is slow. It runs the query and shows you the actual execution plan.

```sql
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE u.created_at > '2025-01-01'
GROUP BY u.id, u.name
ORDER BY order_count DESC
LIMIT 20;
```

Key things to look for in the output:

```
Limit  (cost=1842.23..1842.28 rows=20) (actual time=145.231..145.237 rows=20)
  -> Sort  (cost=1842.23..1882.23 rows=16001) (actual time=145.228..145.231 rows=20)
      -> Hash Left Join  (cost=441.00..1362.30 rows=16001) (actual time=12.543..138.921 rows=15422)
          -> Seq Scan on users  (cost=0.00..298.01 rows=16001)  <-- RED FLAG
              Filter: (created_at > '2025-01-01')
              Rows Removed by Filter: 2341
          -> Hash  (cost=206.42..206.42 rows=18766)
              -> Seq Scan on orders  (cost=0.00..206.42 rows=18766)
```

**Warning signs to look for:**
- `Seq Scan` on a large table (should be `Index Scan` or `Index Only Scan`)
- High `rows removed by filter` (index might help)
- Nested Loop with high row estimates (cartesian product risk)
- `actual time` much higher than `cost` estimate (stale statistics — run `ANALYZE`)

Fix for the above: add an index on `users.created_at`.

## Index Strategies

### B-tree Index (Default)

Best for equality and range queries on scalar values:

```sql
-- Basic index
CREATE INDEX idx_users_created_at ON users (created_at);

-- Multi-column (composite) — order matters: put equality columns first
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
-- Supports: WHERE user_id = $1 AND status = $2
-- Supports: WHERE user_id = $1 (prefix match)
-- Does NOT efficiently support: WHERE status = $2 alone
```

### Partial Index

Index only a subset of rows. Drastically smaller and faster when you query a specific subset frequently:

```sql
-- Index only active users (if 95% of queries filter active=true)
CREATE INDEX idx_users_active_email ON users (email)
WHERE active = true;

-- Index only unprocessed jobs
CREATE INDEX idx_jobs_pending ON jobs (created_at, priority)
WHERE status = 'pending';
```

### GIN Index for Full-Text Search and JSONB

```sql
-- Full-text search
CREATE INDEX idx_articles_search ON articles
USING GIN (to_tsvector('english', title || ' ' || body));

-- Query
SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('english', 'performance tuning');

-- JSONB containment queries
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);
SELECT * FROM products WHERE metadata @> '{"category": "electronics"}';
```

### Covering Index (Index Only Scan)

Include extra columns in the index so Postgres never needs to hit the main table:

```sql
-- INCLUDE columns to avoid heap access
CREATE INDEX idx_orders_user_covering
ON orders (user_id, created_at)
INCLUDE (total_amount, status);

-- This query now uses Index Only Scan — zero heap reads
SELECT created_at, total_amount, status
FROM orders
WHERE user_id = $1
ORDER BY created_at DESC;
```

## Common Slow Query Patterns and Fixes

### The N+1 Problem

This is the single most common performance killer in ORMs. Instead of 1 query, you execute N+1:

```javascript
// BAD — N+1: 1 query for users + 1 query per user for orders
const users = await User.findAll();
for (const user of users) {
  const orders = await Order.findAll({ where: { userId: user.id } });
  // ...
}

// GOOD — 2 queries total (or 1 with JOIN)
const users = await User.findAll({
  include: [{ model: Order, required: false }]
});

// Even better — raw SQL with a single JOIN
const { rows } = await pool.query(`
  SELECT u.id, u.name, json_agg(o.*) as orders
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.id
  GROUP BY u.id, u.name
`);
```

### Avoiding Full Table Scans on Lookups

```sql
-- BAD — function on indexed column defeats index
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- GOOD — expression index matches the query
CREATE INDEX idx_users_email_lower ON users (LOWER(email));
SELECT * FROM users WHERE LOWER(email) = 'test@example.com';

-- BAD — leading wildcard forces full scan
SELECT * FROM users WHERE name LIKE '%john%';

-- GOOD — use full-text search or trigram index
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GIN (name gin_trgm_ops);
SELECT * FROM users WHERE name LIKE '%john%'; -- now uses index
```

### Pagination at Scale

Offset pagination degrades linearly as the offset grows:

```sql
-- BAD — slow at high offset values (scans 100,000 rows to skip them)
SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 100000;

-- GOOD — keyset pagination (cursor-based)
-- First page
SELECT id, title, created_at FROM posts ORDER BY created_at DESC, id DESC LIMIT 20;

-- Next page (pass last row's values as cursor)
SELECT id, title, created_at FROM posts
WHERE (created_at, id) < ($last_created_at, $last_id)
ORDER BY created_at DESC, id DESC LIMIT 20;
```

## Connection Pooling

Every new PostgreSQL connection spawns a process and costs ~5-10MB RAM. With 100 app servers each opening 10 connections, that is 1,000 Postgres processes. Connection pooling solves this.

### pg-pool in Node.js

```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                    // max connections in pool
  min: 2,                     // maintain minimum connections
  idleTimeoutMillis: 30000,   // close idle connections after 30s
  connectionTimeoutMillis: 2000, // fail fast if pool exhausted
  allowExitOnIdle: false,
});

// Always release connections
async function getUser(id) {
  const client = await pool.connect();
  try {
    const { rows } = await client.query('SELECT * FROM users WHERE id = $1', [id]);
    return rows[0];
  } finally {
    client.release(); // critical — always release
  }
}

// Or use pool.query() which handles release automatically
async function getUserSimple(id) {
  const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return rows[0];
}
```

### pgBouncer for Production Scale

For high-traffic applications, pgBouncer sits between your app and Postgres, maintaining a small pool of real Postgres connections while accepting many more from the application.

pgBouncer configuration (`pgbouncer.ini`):

```ini
[databases]
myapp = host=localhost port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt

pool_mode = transaction        ; transaction-level pooling (most efficient)
max_client_conn = 1000         ; max connections from apps
default_pool_size = 20         ; actual Postgres connections
reserve_pool_size = 5          ; emergency connections
reserve_pool_timeout = 3
server_reset_query = DISCARD ALL

; Logging
log_connections = 0
log_disconnections = 0
log_pooler_errors = 1
```

Connect your app to port 6432 (pgBouncer) instead of 5432 (Postgres directly).

**Pool mode comparison:**

| Mode | Use Case | Session Features |
|------|---------|-----------------|
| Session | One client = one server connection | All features work |
| Transaction | Connection released after each transaction | No `SET`, temp tables |
| Statement | Released after each statement | Most restricted |

Use `transaction` mode for most web apps — it gives the best connection reuse.

## Query Caching

Cache expensive, frequently-read queries in Redis:

```javascript
const redis = require('ioredis');
const cache = new redis(process.env.REDIS_URL);

async function getCachedQuery(cacheKey, queryFn, ttlSeconds = 300) {
  const cached = await cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const result = await queryFn();
  await cache.setex(cacheKey, ttlSeconds, JSON.stringify(result));
  return result;
}

// Usage
const topProducts = await getCachedQuery(
  'products:top:10',
  () => pool.query('SELECT * FROM products ORDER BY sales DESC LIMIT 10').then(r => r.rows),
  600 // cache for 10 minutes
);
```

## Read Replicas for Read-Heavy Workloads

Route read queries to replicas to reduce load on the primary:

```javascript
const primaryPool = new Pool({ connectionString: process.env.DATABASE_PRIMARY_URL });
const replicaPool = new Pool({ connectionString: process.env.DATABASE_REPLICA_URL });

function getPool(isWrite = false) {
  return isWrite ? primaryPool : replicaPool;
}

// Reads go to replica
const users = await getPool(false).query('SELECT * FROM users LIMIT 100');

// Writes go to primary
await getPool(true).query('INSERT INTO users (name, email) VALUES ($1, $2)', [name, email]);
```

## Performance Monitoring Checklist

Run these queries regularly to catch slow queries before users notice:

```sql
-- Find the slowest queries (requires pg_stat_statements extension)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT
  round(total_exec_time::numeric, 2) AS total_ms,
  calls,
  round(mean_exec_time::numeric, 2) AS mean_ms,
  round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage,
  query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;

-- Find tables missing indexes (sequential scans on large tables)
SELECT
  relname AS table_name,
  seq_scan,
  idx_scan,
  n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE seq_scan > 0 AND n_live_tup > 10000
ORDER BY seq_scan DESC;

-- Find unused indexes (wasting storage and slowing writes)
SELECT
  indexrelname AS index_name,
  relname AS table_name,
  idx_scan AS scans
FROM pg_stat_user_indexes
JOIN pg_index USING (indexrelid)
WHERE idx_scan = 0
  AND NOT indisunique
ORDER BY relname;
```

Database performance is a feedback loop: measure, identify, fix, repeat. Start with `pg_stat_statements` to find your top 5 slowest queries, apply targeted indexes, and measure again. Compounding small improvements here produces 10x throughput gains without changing a line of application code.
