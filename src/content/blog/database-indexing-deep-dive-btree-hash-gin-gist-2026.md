---
title: "Database Indexing Deep Dive: B-Tree, Hash, GIN, and GiST Explained"
description: "A practical guide to PostgreSQL and MySQL indexing strategies: B-Tree, Hash, GIN, and GiST indexes — how they work, when to use each, and performance trade-offs."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["database", "indexing", "postgresql", "mysql", "btree", "gin", "gist"]
readingTime: "14 min read"
---

Database performance doesn't happen by accident. Every millisecond shaved off a query, every throughput gain in a production system — these often trace back to a single decision: **which index to use, and whether to use one at all.**

If you've ever wondered why the same query runs in 0.06 milliseconds on one system and takes 8 seconds on another, the answer is rarely hardware. It's usually indexing. PostgreSQL and MySQL offer multiple index types — B-Tree, Hash, GIN, GiST — and each is engineered for a fundamentally different access pattern. Using the wrong one doesn't just slow you down; it can actively mislead your query planner, bloat your storage, and add write overhead for zero benefit.

This guide cuts through the confusion. You'll learn how each index type works internally, what workloads each one is built for, and how to make a data-driven choice — with real benchmarks and sourced evidence throughout.

---

## Why Indexing Matters

A database table without an index is like a library with no catalog. To find a single row, the engine must perform a **sequential scan** — reading every single page from disk and inspecting each row until it finds a match. On a table with 1,000 rows, this might be tolerable. On a table with 100 million rows, a sequential scan is a performance catastrophe.

Indexes solve this by maintaining a separate, sorted data structure that the query planner can consult to locate rows directly, without scanning the entire table. The difference is dramatic:

- A well-tuned B-Tree composite index on 10 million rows can answer a filtered query in **0.06 milliseconds** — nearly 100 times faster than executing two separate B-Tree index scans and merging the results. [pganalyze](https://pganalyze.com/blog/5mins-postgres-benchmarking-indexes)
- A GIN index on a full-text search column reduced query time from **over 8 seconds to 103 milliseconds** — a 98.7% improvement. [Whitestork](https://whitestork.me/blog/20/Fast-Search-with-PostgreSQL:-GIN-Index)
- A GiST index on geometric point data dropped spatial query latency from **~5,997ms to ~10ms** in PostgreSQL 17 tuning benchmarks. [Medium](https://medium.com/@jramcloud1/21-postgresql-17-performance-tuning-gist-generalized-search-tree-8e5cacea9fc8)

Those aren't cherry-picked edge cases — they're representative of what happens when you match the right index structure to the right access pattern.

But indexing also carries costs. Every index consumes disk space and adds overhead to `INSERT`, `UPDATE`, and `DELETE` operations, because the database must maintain the index structure alongside the table data. PostgreSQL's B-Tree indexes have grown significantly more efficient over recent versions through features like index-only scans, HOT (Heap-Only Tuple) updates, index deduplication, and automatic page deletion — meaning the write penalty is smaller than it used to be. [PostgreSQL Fastware](https://www.postgresql.fastware.com/pzone/2025-02-postgresql-btree-index-optimizations)

The goal of this article is to help you understand each index type well enough to make the right call in any scenario.

---

## B-Tree Indexes: The Default Workhorse

### How B-Tree Works

B-Tree (Balanced Tree) is the default index type in both PostgreSQL and MySQL (InnoDB). It's called "balanced" because the tree maintains roughly equal depth on every leaf path from the root — ensuring that no matter which row you're looking for, the number of disk reads is approximately the same.

A B-Tree index organizes keys in a sorted, multi-level tree structure. Each node contains a range of keys and pointers to child nodes. The leaf nodes contain the actual indexed values (or pointers to the table rows) and are linked horizontally in sorted order, which makes **range scans extremely efficient**. Looking up a value in a B-Tree with 1 million rows typically requires only 3–4 disk reads; with 1 billion rows, only 4–5. [Stack Overflow](https://stackoverflow.com/questions/7306316/b-tree-vs-hash-table)

B-Tree indexes handle the full range of comparison operators: `=`, `<`, `>`, `<=`, `>=`, `BETWEEN`, and `LIKE` with a fixed prefix. They also support **leftmost prefix matching**, which means a composite index on `(a, b, c)` can be used for queries filtering on `a`, on `a AND b`, or on `a AND b AND c` — but not on `b` alone or `c` alone.

### When to Use B-Tree

B-Tree is the right choice for the vast majority of use cases:

- **Primary keys and unique constraints** — B-Tree enforces uniqueness efficiently.
- **Columns with high cardinality** (many distinct values) used in equality or range queries.
- **Columns accessed via `ORDER BY`** — B-Tree leaves are already sorted, so `ORDER BY` can be satisfied by an index scan without a separate sort step.
- **Foreign keys** — B-Tree lookups are ideal for join performance.
- **Any general-purpose column** where you haven't identified a more specific index type.

### Composite B-Tree Indexes: Order Matters

A composite (multi-column) B-Tree index can dramatically outperform separate indexes when your queries filter on multiple columns simultaneously. The pganalyze benchmark on 10 million rows is instructive: a composite index `(int1000, int100)` answered a query with `WHERE int1000 = 1 AND int100 = 1` in **0.06ms** — nearly 100 times faster than the planner merging results from two separate B-Tree indexes. [pganalyze](https://pganalyze.com/blog/5mins-postgres-benchmarking-indexes)

The critical rule: **the query must filter on the leftmost column(s) of the composite index**. If you define `CREATE INDEX ON orders (customer_id, order_date)` but your query is `WHERE order_date > '2025-01-01'`, the index cannot be used for the filtering — only for sorting if needed.

PostgreSQL's query planner can perform **index-only scans** on B-Tree indexes when all the columns needed by a query are present in the index — skipping the table heap access entirely. This can be a massive win for read-heavy workloads.

---

## Hash Indexes: Equality at Light Speed

### How Hash Indexes Work

A Hash index structures data like a classic in-memory hash table: a **key is mapped to a bucket** via a hash function, and the bucket contains the pointer to the matching rows. There's no sorting, no tree traversal — just a direct computation to locate the target.

This makes hash index lookups **O(1) on average** for equality comparisons, with constant-time lookup cost regardless of table size. For a query like `WHERE email = 'user@example.com'`, a hash index is as fast as it gets.

### When to Use Hash Indexes

Hash indexes are purpose-built for a single scenario: **exact-match equality lookups on stable keys**. The classic use case is a `MEMORY` table in MySQL or an `ON memory` session store.

But there are important constraints:

- **No range queries** — `WHERE id > 100` cannot use a hash index because the hash function destroys ordering. The hash of 101 might land in a lower bucket than the hash of 50.
- **No ordering** — MySQL's optimizer cannot use a hash index to speed up `ORDER BY` operations. [MySQL Documentation](https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html)
- **No prefix matching** — `LIKE 'foo%'` cannot use a hash index because only whole keys are hashed.
- **Only whole keys** — Unlike B-Tree, you cannot use a leftmost prefix of a composite hash key. [MySQL Documentation](https://dev.mysql.com/doc/refman/8.0/en/index-btree-hash.html)

In practice, most production PostgreSQL workloads stick with B-Tree even for equality searches. PostgreSQL's B-Tree is highly optimized and the difference in lookup speed between B-Tree and Hash is usually negligible in the context of a real system where disk I/O dominates. However, PostgreSQL's hash indexes have historically had lower write amplification than B-Tree for certain workloads (since they don't maintain sorted order), making them interesting for write-heavy key-value use cases.

### B-Tree vs Hash: The MySQL Perspective

MySQL's official documentation is instructive here: "The optimizer cannot use a hash index to speed up ORDER BY operations. ... Only whole keys can be used to search for a row. (With a B-tree index, any leftmost prefix of the key can be used to find rows.)" [MySQL Documentation](https://dev.mysql.com/doc/refman/9.1/en/index-btree-hash.html)

This is why, as the MySQL manual states, even in MEMORY tables, B-Tree indexes are often preferred — they support range queries and ORDER BY, giving more flexibility without meaningful speed sacrifice for most workloads.

**Rule of thumb**: Use Hash indexes only when you are 100% certain that the column will **only ever** be queried via exact equality, on a stable (read-mostly or read-only) dataset, and you need every nanosecond of advantage. Otherwise, B-Tree is almost always the better default.

---

## GIN Indexes: Inverted Indexes for Complex Data

### How GIN Works

**GIN** stands for Generalized Inverted Index. Unlike B-Tree, which maps a row to a single index entry, GIN maps each **element within a complex value** to the set of rows containing that element. It is an **inverted index**.

Think of it like the index at the back of a textbook: rather than listing topics and saying "this topic appears on pages X, Y, Z," a GIN index for an array column lists each array element as a key, and maps to the rows that contain it. This makes GIN uniquely suited for data where a single column value contains multiple searchable components.

### When to Use GIN Indexes

GIN indexes are the right choice for:

1. **Full-text search** — When you `to_tsvector()` a document and store it, GIN indexes the individual lexemes (word stems), enabling fast `to_tsquery()` searches. GIN indexes on `tsvector` columns are the standard way to achieve sub-second full-text search on millions of documents.
2. **Array columns** — `WHERE my_array_column @> ARRAY['value1']` (contains) or `WHERE my_array_column && ARRAY['value2']` (overlaps) uses a GIN index efficiently.
3. **JSONB columns** — GIN indexes on JSONB can answer `WHERE jsonb_column @> '{"key": "value"}'` or `WHERE jsonb_column ? 'some_key'` queries by indexing individual JSON paths and values.
4. **Range types** — GIN can index `int4range`, `numrange`, `tsrange`, and other PostgreSQL range types.

### GIN Index Performance Trade-offs

The Whitestork benchmark is illuminating: a GIN-indexed full-text search query ran in **103 milliseconds**, compared to **over 8 seconds** without the index — a 98.7% improvement. [Whitestork](https://whitestork.me/blog/20/Fast-Search-with-PopgreSQL:-GIN-Index)

However, GIN indexes come with a significant **write penalty**. Every `INSERT` or `UPDATE` into an indexed column requires updating multiple index entries (one per element), rather than the single entry a B-Tree update would require. For write-heavy workloads with large documents or arrays, this can become a bottleneck.

The pganalyze analysis describes GIN this way: "The GIN index type was designed to deal with data types that are subdividable and you want to search for individual component values (array elements, lexemes in a text document, etc)." [pganalyze](https://pganalyze.com/blog/gin-index)

A practical tip: if you're indexing full-text search, use GIN only when the column is accessed frequently in search queries. For tables with infrequent searches, a `tsvector` trigger + GIN index is the right pattern. For write-heavy scenarios, consider `pg_trgm` (trigram) indexes on `text` columns as a lighter-weight alternative to full GIN.

---

## GiST Indexes: Generalized Search Trees for Geometric and Structured Data

### How GiST Works

**GiST** stands for Generalized Search Tree. Where B-Tree indexes map scalar values to sorted positions in a tree, GiST indexes map **complex predicates** to spatial data structures. GiST is an abstract index framework that different data types implement differently.

GiST indexes are particularly powerful for **overlap queries** — finding all rows where one complex object overlaps with another. The index stores bounding boxes and uses tree-based pruning to eliminate large swaths of non-matching rows early in the query plan.

### When to Use GiST Indexes

1. **PostGIS and geometric/spatial data** — GiST is the standard index for spatial queries in PostGIS. `WHERE geom && ST_MakeEnvelope(...)` (bounding box overlap) uses a GiST index to quickly narrow down candidate geometries before performing precise geometric intersection tests. PostGIS's own performance tips note that GiST indexes on geometry columns can dramatically reduce the rows that need precise (expensive) geometric computation. [PostGIS Documentation](https://postgis.net/docs/manual-3.0/performance_tips.html)

2. **Range type overlap queries** — `WHERE daterange && '[2025-01-01, 2025-12-31)'::daterange` benefits from GiST when multiple ranges overlap.

3. **Full-text ranking** — When you need not just whether a document matches a query, but **how well** it ranks, GiST can index `tsvector` columns for ranking purposes, complementing the standard GIN approach.

4. **Geometric built-in types** — PostgreSQL's native geometric types (`point`, `circle`, `polygon`, `box`) all support GiST indexes.

### GiST Performance: A Real Example

The PostgreSQL 17 tuning case study by Jeyaram Ayyalusamy demonstrates GiST's power cleanly: on a spatial query to find "all points within an approximate radius around Times Square" using a point-within-circle predicate, the planner switched to a **Bitmap Index Scan using GiST**, reducing latency from **~5,997ms to ~10.241ms**. [Medium](https://medium.com/@jramcloud1/21-postgresql-17-performance-tuning-gist-generalized-search-tree-8e5cacea9fc8)

Without the GiST index, the PostGIS documentation notes, the query planner may estimate the cost incorrectly and ignore the GiST index — leading to full table scans and expensive per-row geometric computations. Running `EXPLAIN ANALYZE` is essential when tuning spatial queries to verify the index is actually being used.

---

## Composite and Partial Indexes: Fine-Tuned Access Patterns

### Composite Indexes (Covering Indexes)

A composite index covers multiple columns in a single index structure. Beyond the performance gains mentioned earlier (0.06ms vs. separate indexes), composite indexes enable **index-only scans** where the query planner never touches the heap table at all — all the needed data is available from the index itself.

The pganalyze benchmark demonstrated this clearly: a composite B-Tree index on `(int1000, int100)` answered the query `SELECT count(*) FROM table WHERE int1000 = 1 AND int100 = 1` via an **index-only scan** in 0.06ms on 10M rows. [pganalyze](https://pganalyze.com/blog/5mins-postgres-benchmarking-indexes)

When designing composite indexes, follow the **column selectivity rule**: put the most selective (highest cardinality) column first, unless your query patterns dictate otherwise. If queries frequently filter on `status` (low cardinality) AND `created_at` (high cardinality), put `created_at` first only if the query always includes `status`.

PostgreSQL 17 also introduced significant improvements to B-Tree bulk scan performance, making composite indexes even more efficient for analytical queries that scan large ranges. [Crunchy Data](https://www.crunchydata.com/blog/real-world-performance-gains-with-postgres-17-btree-bulk-scans)

### Partial Indexes

A partial index covers only a subset of rows, defined by a `WHERE` clause. This is a powerful optimization when:

- A large percentage of rows are inactive (e.g., `WHERE is_active = true`)
- You frequently query for recent records (e.g., `WHERE created_at > NOW() - INTERVAL '30 days'`)
- Undeleted rows are the minority (e.g., `WHERE deleted_at IS NULL`)

Partial indexes are dramatically smaller than full-table indexes — a partial index on active users only might be 10–50x smaller than a full index on the `is_active` column. This means faster writes, less bloat, and better cache utilization. [Alibaba Cloud](https://www.alibabacloud.com/blog/optimizations-with-full-text-search-in-postgresql_595339)

The tradeoff: partial indexes only serve queries that match the `WHERE` clause. If your application has many ad-hoc query patterns, partial indexes may not provide the coverage you need.

---

## Index Maintenance: VACUUM, Bloat, and ANALYZE

Indexes are not set-and-forget structures. As your data changes, indexes accumulate **bloat** — dead tuples and redundant entries that inflate index size and degrade performance.

### Understanding Bloat

When a row is updated or deleted, PostgreSQL marks the old version as dead but doesn't immediately remove it. The B-Tree leaf pages containing those dead entries remain until `VACUUM` runs. Similarly, index entries for deleted rows are only cleaned up during VACUUM.

Severe bloat can make an index 2–10x larger than its ideal size, forcing more disk reads per index scan and polluting the buffer cache with irrelevant pages. The Netdata blog on PostgreSQL bloat notes: "Analyzing a severely bloated table can generate poor statistics if the sample contains empty pages, so it is good practice to VACUUM a bloated table before ANALYZE." [Netdata](https://www.netdata.cloud/blog/postgresql-database-bloat/)

### VACUUM: Reclaiming Space

`VACUUM` reclaims space from dead tuples and optionally compacts index pages. Critically, `VACUUM` does **not** lock the table for reads — it's designed to run concurrently with production traffic.

In modern PostgreSQL, **autovacuum** handles routine cleanup automatically based on `autovacuum_vacuum_threshold` and `autovacuum_analyze_threshold` per-table. However, after bulk deletes, large batch updates, or table migrations, manual `VACUUM ANALYZE` is often necessary to bring statistics and space utilization back to optimal quickly.

The Atlassian knowledge base recommends: "Accurate statistics will help the planner to choose the most appropriate query plan, and thereby improve the speed of query processing." Running `ANALYZE` after significant data changes ensures the planner has up-to-date cardinality estimates. [Atlassian](https://support.atlassian.com/atlassian-knowledge-base/kb/optimize-and-improve-postgresql-performance-with-vacuum-analyze-and-reindex/)

### REINDEX: When VACUUM Isn't Enough

`VACUUM` cannot fully compact all types of bloat. When bloat becomes severe (index size is 2x or more above theoretical minimum), `REINDEX` rebuilds the index from scratch, producing a compact, defragmented index structure. This is especially important for:

- B-Tree indexes that have undergone extensive page splits
- Indexes on tables with high update/delete rates
- Indexes that have grown very large and fragmented

The Medium guide on PostgreSQL bloat management recommends: "Schedule REINDEX operations during low-traffic periods. Create a health dashboard or automated report for bloat statistics." [Medium](https://medium.com/@jramcloud1/understanding-and-managing-bloating-in-postgresql-a-complete-guide-for-dbas-95f50670b488)

### Monitoring Index Health

Key metrics to track:

- **Index-to-table size ratio**: A healthy ratio depends on the index type and data distribution, but sudden spikes indicate bloat.
- **Index scan vs. sequential scan ratio**: If sequential scans are dominating despite indexed columns, the planner may be misbehaving due to stale statistics.
- **pg_stat_user_indexes`: Number of scans, tuples read, and index size per index.
- **`pg_stat_activity`**: Long-running `VACUUM` or `REINDEX` operations can indicate maintenance needs.

---

## Choosing the Right Index: A Practical Decision Framework

With all the index types covered, here's how to make the right call in practice:

| Scenario | Recommended Index Type | Why |
|----------|------------------------|-----|
| Primary key, unique constraint | B-Tree | Default, enforces uniqueness, handles ranges |
| Exact equality on stable keys (session store) | Hash (PostgreSQL) or B-Tree | B-Tree is usually fine; Hash for write-heavy KV |
| Range queries (`WHERE date BETWEEN ...`) | B-Tree | Hash can't do ranges |
| Full-text search | GIN on `tsvector` | Inverted index for document elements |
| Array containment (`@>`) | GIN | Element-level inverted mapping |
| JSONB key/value search | GIN | Indexes paths and values within JSON |
| PostGIS / geometric overlap | GiST | Predicate-based spatial pruning |
| Composite queries (multi-column) | Composite B-Tree | Index-only scans, 100x faster in benchmarks |
| Active subset of large table | Partial B-Tree | Smaller, faster, less bloat |

### The Decision Process

1. **Identify your access pattern**: Is it equality, range, containment, geometric overlap, or full-text?
2. **Assess write frequency**: GIN has high write overhead; if writes dominate reads, reconsider.
3. **Check column cardinality**: High cardinality suits B-Tree; low cardinality may not benefit from any index.
4. **Look at EXPLAIN ANALYZE**: Always verify the planner uses your index. PostgreSQL's cost-based optimizer may ignore an index if estimates are wrong.
5. **Monitor after deployment**: Indexes that worked at 100K rows may behave differently at 100M rows.

### Common Mistakes to Avoid

- **Creating indexes without verifying usage**: An index that's never scanned is pure overhead.
- **Over-indexing write-heavy tables**: Every index adds write cost; 10 indexes on a heavily updated table can halve write throughput.
- **Ignoring composite index column order**: Wrong order makes the index useless for most queries.
- **Forgetting to ANALYZE after bulk loads**: The planner may choose sequential scans over available indexes because it has no statistics.
- **Assuming GiST/GIN are always slower than B-Tree**: For their target workloads, they are orders of magnitude faster.

---

## Conclusion

Database indexing is both an art and a science. B-Tree handles the vast majority of workloads as the default choice, offering sorted ranges, equality searches, and composite coverage with minimal overhead. Hash indexes serve a narrow but legitimate niche for pure equality lookups on stable datasets. GIN indexes unlock full-text, array, and JSONB search patterns that B-Tree simply cannot express efficiently. GiST brings spatial and geometric data into the realm of fast indexed queries.

No single index type wins universally. The best-performing databases are built by engineers who understand the underlying data structures well enough to match them correctly — and who measure, monitor, and iterate as their data grows.

Start with B-Tree. Add GIN when you need inverted element search. Reach for GiST when spatial predicates enter your queries. Use partial and composite indexes to carve out precisely the access patterns your application actually makes. And always — always — verify with `EXPLAIN ANALYZE`.

**Sources:**

- [pganalyze: Benchmarking multi-column, covering and hash indexes in Postgres](https://pganalyze.com/blog/5mins-postgres-benchmarking-indexes)
- [Whitestork: Fast Search with PostgreSQL GIN Index](https://whitestork.me/blog/20/Fast-Search-with-PostgreSQL:-GIN-Index)
- [Medium: PostgreSQL 17 Performance Tuning — GiST](https://medium.com/@jramcloud1/21-postgresql-17-performance-tuning-gist-generalized-search-tree-8e5cacea9fc8)
- [MySQL 8.4 Reference Manual: Comparison of B-Tree and Hash Indexes](https://dev.mysql.com/doc/refman/8.4/en/index-btree-hash.html)
- [PostgreSQL Fastware: B-Tree Index Optimizations](https://www.postgresql.fastware.com/pzone/2025-02-postgresql-btree-index-optimizations)
- [Crunchy Data: Real-World Performance Gains with Postgres 17 B-Tree Bulk Scans](https://www.crunchydata.com/blog/real-world-performance-gains-with-postgres-17-btree-bulk-scans)
- [PostGIS Documentation: Performance Tips](https://postgis.net/docs/manual-3.0/performance_tips.html)
- [Atlassian Knowledge Base: Optimize PostgreSQL Performance with VACUUM, ANALYZE, and REINDEX](https://support.atlassian.com/atlassian-knowledge-base/kb/optimize-and-improve-postgresql-performance-with-vacuum-analyze-and-reindex/)
- [Netdata: How to Monitor and Fix Database Bloats in PostgreSQL](https://www.netdata.cloud/blog/postgresql-database-bloat/)
- [Alibaba Cloud: Optimizations with Full-Text Search in PostgreSQL](https://www.alibabacloud.com/blog/optimizations-with-full-text-search-in-postgresql_595339)
- [pganalyze: Understanding Postgres GIN Indexes](https://pganalyze.com/blog/gin-index)
