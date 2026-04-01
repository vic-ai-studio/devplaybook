---
title: "Database Indexing Strategies Every Developer Must Know"
description: "Master database indexing in 2026. Learn B-tree, hash, composite, partial, and covering indexes with practical SQL examples for PostgreSQL and MySQL."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["database", "sql", "postgresql", "mysql", "performance", "indexing"]
readingTime: "12 min read"
---

Indexes are the single highest-leverage performance tool in relational databases. A missing index turns a millisecond query into a multi-second table scan. A wrong index wastes disk space and slows writes. Understanding indexes isn't optional — it's foundational backend engineering.

This guide covers every index type you'll encounter, when to use each, and how to diagnose missing indexes.

---

## How Indexes Work (The Foundation)

Without an index, a database executes a **sequential scan** (called "full table scan" in MySQL or "Seq Scan" in PostgreSQL): it reads every row in the table from disk to find matching rows.

```sql
-- On a users table with 10M rows, this is catastrophic without an index
SELECT * FROM users WHERE email = 'alice@example.com';
-- Seq Scan: reads 10M rows to find 1
```

An index is a separate data structure that stores a subset of columns in a way that enables fast lookups — trading storage space and write overhead for read speed.

---

## B-Tree Indexes (The Default)

B-tree (balanced tree) is the default index type in both PostgreSQL and MySQL. It handles equality, range queries, and ORDER BY efficiently.

```sql
-- Create a B-tree index (implicit, as it's the default)
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_orders_created ON orders (created_at);
```

B-trees are useful for:
- **Equality**: `WHERE email = ?`
- **Range**: `WHERE created_at BETWEEN ? AND ?`
- **Prefix match**: `WHERE name LIKE 'Alice%'` (but NOT `LIKE '%Alice%'`)
- **ORDER BY / GROUP BY**: when the index matches the sort order
- **IS NULL / IS NOT NULL**: PostgreSQL handles this well; MySQL less so

### Internal Structure

A B-tree index stores values in sorted order in a balanced tree. Lookups are O(log n) — a 10M row table requires at most ~24 comparisons to locate any value. Sequential scans are O(n).

```
B-tree height example:
- 1M rows, order-100 tree: height ≈ 3 levels
- 10M rows: height ≈ 4 levels
- Even at 1B rows: ≈ 5 levels
```

---

## Hash Indexes

Hash indexes use a hash function to map column values to bucket positions. They're **faster than B-trees for equality lookups** but **useless for range queries or sorting**.

```sql
-- PostgreSQL: explicit hash index
CREATE INDEX idx_sessions_token ON sessions USING HASH (token);

-- MySQL: hash indexes only available in MEMORY engine (or as adaptive hash index, automatic)
```

**Use hash indexes when**: You only ever do equality lookups (`WHERE token = ?`) and the column has high cardinality (many unique values). Session tokens, UUIDs, API keys.

**Don't use when**: You need range queries, LIKE, ORDER BY, or NULL handling.

---

## Composite Indexes (Multi-Column)

A composite index spans multiple columns. Column order matters enormously.

```sql
-- Composite index on (last_name, first_name)
CREATE INDEX idx_users_name ON users (last_name, first_name);
```

### The Leftmost Prefix Rule

A composite index `(a, b, c)` can be used for:
- Queries on `a`
- Queries on `a, b`
- Queries on `a, b, c`
- Queries on `a, c` (uses only `a`)

It **cannot** be used for queries on `b` alone, `c` alone, or `b, c`.

```sql
-- ✅ Index (last_name, first_name) is used
WHERE last_name = 'Smith'
WHERE last_name = 'Smith' AND first_name = 'John'

-- ❌ Index NOT used (or used poorly)
WHERE first_name = 'John'  -- not the leftmost column
```

### Real-World Composite Index Design

```sql
-- Orders table: common query patterns
-- 1. Find orders by user, ordered by date
SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at DESC;
-- Optimal index: (user_id, created_at)
CREATE INDEX idx_orders_user_date ON orders (user_id, created_at);

-- 2. Find orders by status and date range
SELECT * FROM orders WHERE status = 'pending' AND created_at > NOW() - INTERVAL '7 days';
-- Optimal index: (status, created_at)
CREATE INDEX idx_orders_status_date ON orders (status, created_at);
```

### Cardinality and Column Order

For equality filters, put **lower cardinality columns first** (less distinct values). For range filters, put the range column **last** in the composite index.

```sql
-- If you filter by country (low cardinality: ~250 values) AND user_id (high cardinality)
-- Put country first — it filters out more rows early
CREATE INDEX idx_orders_country_user ON orders (country, user_id);
```

---

## Covering Indexes (Index-Only Scans)

A covering index includes all columns needed for a query, so the database never touches the main table. This is one of the most impactful performance optimizations.

```sql
-- Query
SELECT user_id, amount, status FROM orders WHERE created_at > '2026-01-01';

-- Without covering index: index scan + heap fetch for each matching row
-- With covering index: index-only scan (no heap access)
CREATE INDEX idx_orders_covering ON orders (created_at, user_id, amount, status);
```

In PostgreSQL, this is called an **Index Only Scan**. In MySQL, it's a **Using index** access type in EXPLAIN.

```sql
-- Verify covering index is used (PostgreSQL)
EXPLAIN SELECT user_id, amount FROM orders WHERE created_at > '2026-01-01';
-- Look for "Index Only Scan" in output
```

**Trade-off**: Covering indexes are wider (more disk space) and slower to write. Use them on frequently-read, rarely-written tables.

---

## Partial Indexes

A partial index includes only rows that satisfy a WHERE condition. Smaller, faster, and often more useful than full column indexes.

```sql
-- Index only active users (ignore archived/deleted)
CREATE INDEX idx_users_active ON users (email)
WHERE status = 'active';

-- Index only unfulfilled orders
CREATE INDEX idx_orders_pending ON orders (created_at, user_id)
WHERE status IN ('pending', 'processing');
```

This is extremely effective when:
- A small fraction of rows are "hot" (active records vs. archived)
- You have soft-deleted records (`deleted_at IS NULL`)
- You query a specific status predominantly

```sql
-- Common pattern: index only non-deleted records
CREATE INDEX idx_products_active ON products (name, category_id)
WHERE deleted_at IS NULL;
```

---

## Expression Indexes (Function-Based)

Index the result of a function or expression, not just a raw column value.

```sql
-- PostgreSQL: case-insensitive email lookup
CREATE INDEX idx_users_email_lower ON users (LOWER(email));

-- Query MUST use the same expression to hit the index
SELECT * FROM users WHERE LOWER(email) = LOWER('Alice@Example.COM');
-- ✅ Uses the index

SELECT * FROM users WHERE email = 'alice@example.com';
-- ❌ Does NOT use the function index (unless email is already lowercase)
```

```sql
-- MySQL: generated column + index (MySQL 5.7+)
ALTER TABLE users ADD COLUMN email_lower VARCHAR(255)
  GENERATED ALWAYS AS (LOWER(email)) STORED;
CREATE INDEX idx_email_lower ON users (email_lower);
```

```sql
-- Date extraction: find all orders from a specific month
CREATE INDEX idx_orders_month ON orders (EXTRACT(MONTH FROM created_at));
SELECT * FROM orders WHERE EXTRACT(MONTH FROM created_at) = 3;
```

---

## GIN Indexes (PostgreSQL)

Generalized Inverted Index — designed for multi-valued data: arrays, JSONB, full-text search.

```sql
-- Full-text search
CREATE INDEX idx_articles_fts ON articles USING GIN (
  to_tsvector('english', title || ' ' || body)
);

SELECT * FROM articles
WHERE to_tsvector('english', title || ' ' || body) @@ plainto_tsquery('database indexing');

-- JSONB queries
CREATE INDEX idx_products_metadata ON products USING GIN (metadata);
SELECT * FROM products WHERE metadata @> '{"category": "electronics"}';

-- Array containment
CREATE INDEX idx_posts_tags ON posts USING GIN (tags);
SELECT * FROM posts WHERE tags @> ARRAY['postgresql', 'performance'];
```

GIN indexes are large and slow to build but essential for these data types.

---

## Diagnosing Missing Indexes

### EXPLAIN / EXPLAIN ANALYZE

Always use EXPLAIN before and after adding indexes:

```sql
-- PostgreSQL: full execution plan with timing
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT * FROM orders WHERE user_id = 123 ORDER BY created_at DESC LIMIT 10;

-- MySQL: basic execution plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123;

-- MySQL 8.0+: verbose plan
EXPLAIN FORMAT=JSON SELECT ...;
```

**Key things to look for**:
- `Seq Scan` (PostgreSQL) or `ALL` type (MySQL) — table scan, likely needs an index
- `rows` estimate — if much larger than actual rows, statistics are stale (run `ANALYZE`)
- `Nested Loop` with large row estimates — may need a better index

### Find Slow Queries

**PostgreSQL**: Enable `pg_stat_statements`:
```sql
-- Find top 10 slowest queries
SELECT query, mean_exec_time, calls, total_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;
```

**MySQL**: Enable slow query log:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 1;  -- log queries > 1 second
```

### Find Unused Indexes

```sql
-- PostgreSQL: find indexes never used
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0 AND indexname NOT LIKE '%pkey%'
ORDER BY pg_relation_size(indexrelid) DESC;
```

Unused indexes are pure overhead — they slow writes and waste disk space. Drop them.

---

## Common Indexing Mistakes

### 1. Indexing Low-Cardinality Columns

```sql
-- BAD: boolean column has only 2 values — index rarely helps
CREATE INDEX idx_users_is_active ON users (is_active);

-- The query planner often prefers a seq scan when >5-10% of rows match
-- Exception: use a partial index instead
CREATE INDEX idx_users_active_email ON users (email) WHERE is_active = true;
```

### 2. Over-Indexing

Every index you create must be maintained on every INSERT, UPDATE, DELETE. A table with 10 indexes is 10x slower to write to than with 1 index.

**Rule of thumb**: Start with no extra indexes. Add indexes based on slow query evidence, not speculation.

### 3. Indexing the Wrong Side of a JOIN

```sql
-- Index the column on the INNER side of the join (the "many" side)
SELECT u.name, o.total
FROM users u
JOIN orders o ON o.user_id = u.id  -- index orders.user_id
WHERE u.id = 123;

-- ✅ Correct
CREATE INDEX idx_orders_user_id ON orders (user_id);
-- ❌ Indexing users.id (primary key) when it's already indexed doesn't help here
```

### 4. Forgetting to Update Statistics

After bulk data operations, query planners make bad decisions because statistics are stale:

```sql
-- PostgreSQL: update statistics
ANALYZE orders;

-- MySQL: rebuild statistics
ANALYZE TABLE orders;
```

---

## Index Maintenance

```sql
-- PostgreSQL: rebuild bloated index
REINDEX INDEX CONCURRENTLY idx_orders_user_date;

-- PostgreSQL: check index bloat
SELECT indexrelname, pg_size_pretty(pg_relation_size(indexrelid)) as size
FROM pg_stat_user_indexes
ORDER BY pg_relation_size(indexrelid) DESC;

-- MySQL: rebuild index (rewrites entire table — use with caution in production)
ALTER TABLE orders ENGINE=InnoDB;  -- triggers rebuild
```

---

## FAQ

**Q: How many indexes should a table have?**
Typically 2-5 for most OLTP tables. More than 10 usually indicates over-indexing. OLAP tables (data warehouse) may have more because writes are infrequent.

**Q: Does indexing a foreign key help?**
Yes — always index foreign keys in MySQL (PostgreSQL does not auto-index FKs). Without an FK index, every DELETE on the parent table does a full scan of the child table.

**Q: Why isn't my index being used?**
Common reasons: (1) The query planner estimates it's faster to seq scan (low selectivity), (2) The index column is inside a function (`WHERE YEAR(created_at) = 2026` can't use an index on `created_at`), (3) Type mismatch between column and value, (4) Statistics are stale.

**Q: What's the difference between a clustered and non-clustered index?**
A clustered index (primary key in MySQL InnoDB, or any index marked CLUSTER in Postgres) determines the physical row order on disk. There can only be one per table. Non-clustered indexes are separate structures that point back to the heap/clustered index. InnoDB always clusters by primary key.

**Q: Should I index NULL values?**
PostgreSQL includes NULLs in B-tree indexes. MySQL InnoDB also indexes NULLs. IS NULL and IS NOT NULL queries can use indexes in modern databases, though older MySQL versions had limitations.
