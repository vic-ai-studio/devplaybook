---
title: "PostgreSQL Performance Tuning: Indexing Strategies Every Developer Should Know"
description: "Master PostgreSQL indexing in 2026: EXPLAIN ANALYZE, B-tree vs GIN vs GiST indexes, partial indexes, covering indexes, and real-world optimization patterns. With code examples and query plans."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["postgresql", "database", "performance", "indexing", "sql", "optimization", "backend"]
readingTime: "14 min read"
---

A poorly indexed PostgreSQL table feels fine with 10,000 rows. At 10 million rows, the same query takes 8 seconds. At 100 million rows, your database becomes the bottleneck for everything in your application.

Indexing isn't just about adding `CREATE INDEX` statements — it's understanding *which* indexes to create, *why* different index types exist, and *when* an index hurts more than it helps.

## Understanding EXPLAIN ANALYZE

Before adding any index, understand what PostgreSQL is actually doing. `EXPLAIN ANALYZE` is your most important tool:

```sql
EXPLAIN ANALYZE
SELECT * FROM users WHERE email = 'alice@example.com';
```

Read the output from inner nodes to outer nodes. Key things to look for:

**Seq Scan (bad for large tables):**
```
Seq Scan on users  (cost=0.00..8458.00 rows=1 width=124) (actual time=0.043..34.521 rows=1 loops=1)
  Filter: ((email)::text = 'alice@example.com'::text)
  Rows Removed by Filter: 399999
Planning Time: 0.124 ms
Execution Time: 34.543 ms
```
PostgreSQL scanned 400,000 rows to find 1. This is an O(n) scan — catastrophic at scale.

**Index Scan (good):**
```
Index Scan using users_email_idx on users  (cost=0.42..8.44 rows=1 width=124) (actual time=0.043..0.045 rows=1 loops=1)
  Index Cond: ((email)::text = 'alice@example.com'::text)
Planning Time: 0.108 ms
Execution Time: 0.065 ms
```
34ms down to 0.065ms — 500× improvement from one index.

**Key metrics to watch:**
- `actual time=X..Y`: Y is the total time, X is time to first row
- `rows=N loops=M`: N rows returned per loop × M loops = total rows processed
- `Rows Removed by Filter`: high numbers mean your WHERE clause filters after a scan, not via index

Use the [Database Index Strategy Advisor](/tools/database-index-advisor) to get index recommendations for your schema.

## B-tree Indexes: The Default

B-tree is PostgreSQL's default index type and the right choice 90% of the time. It supports equality (`=`), range (`<`, `>`, `BETWEEN`), and ordering (`ORDER BY`).

```sql
-- Equality queries
CREATE INDEX idx_users_email ON users(email);

-- Range queries
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- Composite for multi-column WHERE
CREATE INDEX idx_orders_user_status ON orders(user_id, status);
-- This supports: WHERE user_id = ? AND status = ?
-- Also supports: WHERE user_id = ? (leading column)
-- Does NOT support: WHERE status = ? (non-leading column alone)
```

**Composite index column order matters.** Put the most selective column (highest cardinality) first, *unless* you always query both columns together — then put the equality column before the range column:

```sql
-- If you query: WHERE status = 'active' AND created_at > '2026-01-01'
-- GOOD: equality column first
CREATE INDEX idx_on_status_created ON orders(status, created_at);

-- BAD for this query pattern: range column first
CREATE INDEX idx_on_created_status ON orders(created_at, status);
```

## Partial Indexes: Index Only What You Query

A partial index indexes only rows that match a condition. When most of your queries target a small subset of rows, a partial index is dramatically smaller and faster:

```sql
-- If 99% of queries are for 'active' users:
CREATE INDEX idx_users_active_email ON users(email)
WHERE status = 'active';

-- Only indexes active users — 5% of the table
-- Query: WHERE email = ? AND status = 'active' uses this tiny, fast index
```

Real-world use cases:

```sql
-- Index only unprocessed queue items (0.1% of table)
CREATE INDEX idx_jobs_pending ON jobs(created_at, priority)
WHERE status = 'pending';

-- Index only recent data
CREATE INDEX idx_events_recent ON events(type, user_id)
WHERE created_at > '2026-01-01';

-- Index only non-null optional fields
CREATE INDEX idx_users_company ON users(company_id)
WHERE company_id IS NOT NULL;
```

The last example is important: PostgreSQL's B-tree index *does* include NULL values, but queries like `WHERE company_id = ?` won't match NULLs. If 40% of rows have NULL `company_id`, a partial index on non-null rows is 40% smaller.

## Covering Indexes: Index-Only Scans

A covering index includes all columns needed to satisfy a query, allowing an "index-only scan" — no heap access required. This is the fastest possible query execution.

```sql
-- Query: SELECT id, email, name FROM users WHERE email = ?
-- Standard index requires heap access for 'id' and 'name'
CREATE INDEX idx_users_email ON users(email);

-- Covering index: INCLUDE the extra columns
CREATE INDEX idx_users_email_covering ON users(email) INCLUDE (id, name);
-- Now query can be satisfied entirely from the index — no table access
```

`INCLUDE` columns (PostgreSQL 11+) are stored in the leaf pages but not in B-tree nodes. They can't be used in WHERE conditions but are available for SELECT without heap access.

```sql
-- Check if your query uses an index-only scan:
EXPLAIN ANALYZE SELECT id, email, name FROM users WHERE email = 'alice@example.com';
-- Look for "Index Only Scan" in the output
-- "Heap Fetches: 0" means the index fully satisfied the query
```

## GIN Indexes: Full-Text and Array Search

GIN (Generalized Inverted Index) is designed for composite values: full-text search, JSONB, arrays, and tsvector. B-tree can't handle "does this array contain X?" efficiently — GIN can.

```sql
-- Full-text search
ALTER TABLE articles ADD COLUMN search_vector tsvector;
UPDATE articles SET search_vector = to_tsvector('english', title || ' ' || body);
CREATE INDEX idx_articles_fts ON articles USING GIN(search_vector);

-- Now full-text queries are fast:
SELECT * FROM articles WHERE search_vector @@ to_tsquery('postgresql & indexing');

-- Automatic tsvector update
CREATE INDEX idx_articles_fts ON articles USING GIN(
  to_tsvector('english', title || ' ' || body)
);
```

GIN for JSONB:

```sql
-- JSONB column with nested data
ALTER TABLE products ADD COLUMN metadata JSONB;
CREATE INDEX idx_products_metadata ON products USING GIN(metadata);

-- Supports containment queries:
SELECT * FROM products WHERE metadata @> '{"category": "electronics"}';
SELECT * FROM products WHERE metadata ? 'discount_code'; -- key exists
```

GIN for arrays:

```sql
ALTER TABLE posts ADD COLUMN tags TEXT[];
CREATE INDEX idx_posts_tags ON posts USING GIN(tags);

-- Array overlap (@>) and containment (<@):
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'indexing'];
SELECT * FROM posts WHERE 'javascript' = ANY(tags);
```

**GIN vs B-tree for JSONB:** Use GIN for containment/key existence queries. Use B-tree for single scalar values you can extract: `CREATE INDEX ON products((metadata->>'price')::numeric)`.

## GiST Indexes: Geometric and Fuzzy Matching

GiST (Generalized Search Tree) handles range types, geometric data, and fuzzy string matching (pg_trgm):

```sql
-- Trigram index for LIKE/ILIKE with leading wildcards
-- First: CREATE EXTENSION pg_trgm;
CREATE INDEX idx_users_name_trgm ON users USING GiST(name gist_trgm_ops);
-- Or GIN variant (usually faster for static data):
CREATE INDEX idx_users_name_trgm ON users USING GIN(name gin_trgm_ops);

-- Now leading wildcards work with an index:
SELECT * FROM users WHERE name ILIKE '%smith%';
```

Without pg_trgm, `ILIKE '%smith%'` is always a seq scan. With GIN trigrams, it uses the index.

GiST for date ranges:

```sql
-- Range type column
ALTER TABLE bookings ADD COLUMN period tstzrange;
CREATE INDEX idx_bookings_period ON bookings USING GiST(period);

-- Overlap queries:
SELECT * FROM bookings WHERE period && '[2026-04-01, 2026-04-05)'::tstzrange;
```

## Hash Indexes: Pure Equality

PostgreSQL 10+ made Hash indexes crash-safe. They're smaller than B-trees for equality-only queries, but they don't support ranges or ordering:

```sql
-- Only use when queries are purely equality checks
CREATE INDEX idx_sessions_token ON sessions USING HASH(token);
-- SELECT * FROM sessions WHERE token = '...' -- uses hash index
-- But: WHERE token LIKE '...' -- does NOT use hash index
```

In practice, B-tree equality queries are fast enough that Hash indexes are rarely worth the loss of range/sort support.

## Common Anti-Patterns

**Over-indexing:** Every index slows down INSERT, UPDATE, and DELETE (index maintenance). A table with 12 indexes on an orders table that processes 50K writes/second will see significant write overhead. Index only what your actual query patterns need.

**Indexing low-cardinality columns:** An index on a boolean column (`is_active`) with 90% TRUE values is often worse than a seq scan — the index scan + heap access beats sequential scan only when fewer than ~5% of rows match. Use partial indexes instead.

**Forgetting to analyze:** New indexes aren't used until statistics are updated. Run `ANALYZE table_name` after bulk inserts or schema changes, or wait for autovacuum (which runs ANALYZE automatically).

**Not checking index usage:**

```sql
-- Find unused indexes (high maintenance cost, never used in queries):
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY schemaname, tablename;
```

## Practical Workflow

1. **Identify slow queries**: Use `pg_stat_statements` or your APM tool. Sort by `total_time` descending.
2. **EXPLAIN ANALYZE** the slow query in isolation
3. **Identify the bottleneck**: Seq Scan on large table? Missing join index? Filter removing too many rows?
4. **Create the index** in a transaction on production (PostgreSQL's `CREATE INDEX CONCURRENTLY` avoids locking)
5. **Verify** with EXPLAIN ANALYZE that the new index is used
6. **Monitor** with `pg_stat_user_indexes` to confirm the index is actively scanned

```sql
-- Always create indexes concurrently on production tables:
CREATE INDEX CONCURRENTLY idx_orders_user_id ON orders(user_id);
-- This builds the index without locking reads/writes (takes longer but safe)
```

Mastering these patterns will make the difference between a database that handles 10× growth gracefully and one that becomes your engineering team's full-time emergency.
