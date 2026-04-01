---
title: "Database Indexing Strategies Every Developer Should Know"
description: "Master database indexing in 2026: B-tree, composite, partial, covering, and GIN indexes. Learn how to identify slow queries, choose the right index type, and avoid common indexing mistakes."
date: "2026-04-02"
tags: [database, indexing, postgresql, mysql, performance]
readingTime: "12 min read"
---

# Database Indexing Strategies Every Developer Should Know

Indexes are the single most impactful tool for database performance. A missing index turns a 2ms query into a 2-second query at scale. A wrong index wastes disk space and slows down writes without helping reads.

This guide covers practical indexing strategies — not theory, but the decisions you'll make on real production systems.

## What an Index Actually Does

An index is a separate data structure that the database maintains alongside your table. When you query with a WHERE clause, the database can use an index to find matching rows without scanning the entire table.

Without an index:
```
Table: 10 million rows
Query: SELECT * FROM orders WHERE user_id = 1234
Result: Database reads ALL 10M rows → finds ~50 matches
Time: 2,000ms
```

With an index on `user_id`:
```
B-tree lookup: O(log n) instead of O(n)
Result: Database jumps directly to matching rows
Time: 1ms
```

The tradeoff: indexes take disk space and slow down INSERT/UPDATE/DELETE because the index must be updated too.

## B-Tree Indexes: The Default

B-tree is the default index type for most databases. It works for equality and range queries.

```sql
-- Create a basic B-tree index
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- These queries can use the indexes above:
SELECT * FROM orders WHERE user_id = 1234;  -- equality
SELECT * FROM orders WHERE created_at > '2026-01-01';  -- range
SELECT * FROM orders WHERE created_at BETWEEN '2026-01-01' AND '2026-03-31';
```

## Composite Indexes: Multi-Column Queries

When queries filter on multiple columns, a composite index is more efficient than two single-column indexes.

```sql
-- This query filters on two columns:
SELECT * FROM orders
WHERE user_id = 1234
  AND status = 'paid'
ORDER BY created_at DESC;

-- Single indexes on each column are less efficient than:
CREATE INDEX idx_orders_user_status_date
  ON orders(user_id, status, created_at DESC);
```

**The column order matters.** The index is useful for:
- Queries on `user_id` alone
- Queries on `user_id + status`
- Queries on `user_id + status + created_at`

But NOT for:
- Queries on `status` alone (can't use the leftmost prefix)
- Queries on `created_at` alone

This is called the **leftmost prefix rule**. Design composite indexes with the most selective and most frequently queried columns first.

```sql
-- Decision rule for column order:
-- 1. Columns used in equality conditions first (user_id = ?)
-- 2. Columns used in range/sort conditions last (created_at > ?)
-- 3. Most selective columns first within each group
```

## Explain: Reading the Query Plan

Always verify your indexes are being used:

```sql
-- PostgreSQL
EXPLAIN ANALYZE
SELECT * FROM orders
WHERE user_id = 1234
  AND status = 'paid'
ORDER BY created_at DESC
LIMIT 10;
```

Key things to look for:

| Output | Meaning |
|--------|---------|
| `Index Scan using idx_...` | Index is being used — good |
| `Seq Scan` | Full table scan — may need an index |
| `Bitmap Heap Scan` | Index scan + heap lookup — often optimal |
| `cost=0.00..8.29` | Estimated cost (lower is better) |
| `rows=1` vs `rows=10000` | Row estimate accuracy |
| `actual time=0.02..0.05` | Actual execution time |

```sql
-- MySQL
EXPLAIN SELECT * FROM orders WHERE user_id = 1234;
-- Look for 'type' column: const > eq_ref > ref > range > index > ALL
-- 'ALL' = full table scan, needs attention
```

## Partial Indexes: Index Only What You Query

Partial indexes cover a subset of rows, making them smaller and faster:

```sql
-- Only index incomplete orders (status = 'pending')
-- Most queries for 'urgent' work target pending orders
CREATE INDEX idx_orders_pending ON orders(created_at)
WHERE status = 'pending';

-- Only index active users
CREATE INDEX idx_users_active_email ON users(email)
WHERE deleted_at IS NULL;

-- Useful: orders from the last 30 days
CREATE INDEX idx_orders_recent ON orders(user_id, created_at)
WHERE created_at > NOW() - INTERVAL '30 days';
```

Partial indexes are significantly smaller because they exclude most rows. A table with 100M historical orders but 10K active ones — a partial index on active orders is 10,000x smaller.

## Covering Indexes: Eliminate Heap Lookups

A covering index includes all columns needed by the query, so the database never has to look up the actual row data:

```sql
-- Query needs: user_id, status, total, created_at
SELECT user_id, status, total, created_at
FROM orders
WHERE user_id = 1234
ORDER BY created_at DESC;

-- Covering index: includes all needed columns
CREATE INDEX idx_orders_covering
  ON orders(user_id, created_at DESC)
  INCLUDE (status, total);  -- PostgreSQL INCLUDE syntax
```

With a covering index, the query can be answered entirely from the index structure without touching the table. This is called an "index-only scan" in PostgreSQL.

## GIN and GiST Indexes: Full-Text and JSON

```sql
-- GIN index for full-text search
CREATE INDEX idx_articles_fts ON articles
  USING GIN (to_tsvector('english', title || ' ' || body));

-- Query with ranking
SELECT title, ts_rank(to_tsvector('english', body), query) as rank
FROM articles, to_tsquery('english', 'postgres & indexing') query
WHERE to_tsvector('english', body) @@ query
ORDER BY rank DESC;

-- GIN index for JSONB queries
CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
SELECT * FROM events WHERE metadata @> '{"type": "purchase"}';

-- GiST index for geospatial (PostGIS)
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
SELECT * FROM locations
WHERE ST_DWithin(geom, ST_MakePoint(-122.4, 37.8)::geography, 1000);
```

## Hash Indexes

Hash indexes are faster than B-tree for equality lookups, but don't support range queries or sorting:

```sql
-- Hash index: only useful for = comparisons
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- Fast for:
SELECT * FROM sessions WHERE token = 'abc123';
-- Useless for:
SELECT * FROM sessions WHERE token LIKE 'abc%';
```

Use hash indexes only for high-cardinality columns with pure equality lookups (session tokens, API keys, UUIDs).

## Finding Slow Queries in Production

### PostgreSQL: pg_stat_statements

```sql
-- Enable the extension
CREATE EXTENSION pg_stat_statements;

-- Find slowest queries
SELECT
  query,
  calls,
  total_exec_time / calls AS avg_ms,
  rows / calls AS avg_rows,
  (total_exec_time / sum(total_exec_time) OVER ()) * 100 AS pct_total
FROM pg_stat_statements
ORDER BY avg_ms DESC
LIMIT 20;
```

### PostgreSQL: auto_explain

```sql
-- Log all queries slower than 100ms with their plans
ALTER SYSTEM SET auto_explain.log_min_duration = '100ms';
ALTER SYSTEM SET auto_explain.log_analyze = true;
SELECT pg_reload_conf();
```

### MySQL: slow_query_log

```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.1;  -- 100ms threshold

-- Then analyze with pt-query-digest
-- pt-query-digest /var/log/mysql/slow.log
```

## Missing Index Detection

```sql
-- PostgreSQL: find tables with sequential scans but no indexes
SELECT
  relname,
  seq_scan,
  idx_scan,
  n_live_tup
FROM pg_stat_user_tables
WHERE seq_scan > idx_scan
  AND n_live_tup > 10000
ORDER BY seq_scan DESC;

-- Find queries that need indexes (high rows examined/rows returned ratio)
SELECT query, rows_examined, rows_sent,
  rows_examined / NULLIF(rows_sent, 0) as ratio
FROM mysql.slow_log
WHERE rows_examined / NULLIF(rows_sent, 0) > 100
ORDER BY rows_examined DESC;
```

## Common Indexing Mistakes

### 1. Over-indexing

```sql
-- ❌ Too many indexes on a write-heavy table
CREATE INDEX idx_1 ON orders(user_id);
CREATE INDEX idx_2 ON orders(status);
CREATE INDEX idx_3 ON orders(created_at);
CREATE INDEX idx_4 ON orders(user_id, status);
CREATE INDEX idx_5 ON orders(user_id, created_at);
CREATE INDEX idx_6 ON orders(status, created_at);

-- Each index slows down INSERT/UPDATE/DELETE
-- Consolidate based on actual query patterns
```

### 2. Low-Cardinality Columns Alone

```sql
-- ❌ Index on a column with 3 distinct values
CREATE INDEX idx_orders_status ON orders(status);
-- 'pending' | 'paid' | 'shipped' — 33% of rows each
-- B-tree index barely helps; full scan is similar cost

-- ✅ Better: use as part of a composite index
CREATE INDEX idx_orders_status_user ON orders(user_id, status);
```

### 3. Indexing Expressions Without Function Indexes

```sql
-- ❌ This doesn't use idx_users_email
SELECT * FROM users WHERE LOWER(email) = 'alice@example.com';

-- ✅ Create a functional index
CREATE INDEX idx_users_lower_email ON users (LOWER(email));
```

### 4. Forgetting NULL Handling

```sql
-- NULL values are not stored in indexes by default in some databases
-- PostgreSQL: NULLs are included in B-tree indexes
-- Partial index to explicitly include or exclude NULLs:
CREATE INDEX idx_orders_shipped_at ON orders(shipped_at)
WHERE shipped_at IS NOT NULL;
```

## Index Maintenance

Indexes need maintenance over time:

```sql
-- PostgreSQL: REINDEX to rebuild bloated indexes
REINDEX INDEX CONCURRENTLY idx_orders_user_id;

-- VACUUM to reclaim dead tuples (usually automatic)
VACUUM ANALYZE orders;

-- MySQL: OPTIMIZE TABLE rebuilds indexes
OPTIMIZE TABLE orders;

-- Check index bloat (PostgreSQL)
SELECT
  tablename,
  indexname,
  pg_size_pretty(pg_relation_size(indexname::regclass)) AS size
FROM pg_indexes
WHERE tablename = 'orders'
ORDER BY pg_relation_size(indexname::regclass) DESC;
```

## The Indexing Decision Checklist

Before adding an index:
- [ ] Is the query actually slow? (EXPLAIN ANALYZE first)
- [ ] How many rows are in the table? (< 1000 rows: rarely need indexes)
- [ ] What's the column cardinality? (Low cardinality alone = bad index)
- [ ] Is this a read-heavy or write-heavy table? (More indexes = slower writes)
- [ ] Does a composite index already cover this query?
- [ ] Can I test the impact in staging before production?

---

**Related tools:**
- [PostgreSQL vs MySQL comparison](/blog/postgresql-vs-mysql-2026)
- [MongoDB schema design patterns](/blog/mongodb-schema-design-patterns)
- [Query optimization tools](/tools/database-query-analyzer)
