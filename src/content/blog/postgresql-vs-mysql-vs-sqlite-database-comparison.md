---
title: "PostgreSQL vs MySQL vs SQLite: Choosing the Right Database for Your Project"
description: "PostgreSQL vs MySQL vs SQLite: which database is best for your project? Compare performance, features, ease of use, scaling, and ideal use cases."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["postgresql", "mysql", "sqlite", "database", "sql", "backend", "developer-tools"]
readingTime: "11 min read"
---

The database question comes up in every backend project. PostgreSQL, MySQL, and SQLite are the three relational databases that cover the vast majority of use cases — from mobile apps to high-traffic web services to enterprise data warehouses. They all speak SQL. They all store relational data reliably. But they make very different tradeoffs.

This guide is about making the right call for your specific situation. We compare the three across ACID compliance, performance at scale, JSON support, full-text search, replication, and ease of setup. We show the same schema in each. And we give you a concrete decision framework.

---

## TL;DR

| | PostgreSQL | MySQL | SQLite |
|---|---|---|---|
| **ACID compliance** | Full | Full (InnoDB) | Full |
| **Performance at scale** | Excellent | Excellent | Limited (no concurrency) |
| **JSON support** | Excellent (JSONB) | Good (JSON type) | Via text (limited) |
| **Full-text search** | Good (built-in) | Basic | Basic |
| **Replication** | Flexible (logical, streaming) | Mature | Not applicable |
| **Setup complexity** | Moderate | Easy | None (file-based) |
| **Hosted options** | Supabase, Neon, RDS, Railway | PlanetScale, RDS, Railway | Turso, embedded |
| **Best for** | Complex apps, analytics, APIs | Web apps, high read traffic | Local, mobile, embedded, testing |

**Shortest answer:** SQLite for local/embedded/testing. MySQL for high-read web apps or when you need PlanetScale's branching workflow. PostgreSQL for everything else.

---

## The Case for Knowing All Three

Most developers settle on one database and use it for everything. That works until it doesn't. The developer who only knows SQLite runs into concurrency walls. The developer who only knows MySQL reaches for it for analytics workloads where PostgreSQL's query planner is dramatically better.

Understanding all three means you make the right call on the first try instead of migrating a production database six months in.

---

## PostgreSQL: The Feature-Complete Choice

PostgreSQL has been in active development since 1996. In 2024, it's the most feature-complete relational database available outside of commercial options like Oracle. The developer community has overwhelmingly moved toward PostgreSQL over the last decade — Stack Overflow's developer survey shows it has overtaken MySQL as the most-used database among professional developers.

### What Makes PostgreSQL Stand Out

**JSONB** — PostgreSQL's `jsonb` type stores JSON in binary format, with full indexing support. You can query inside JSON fields with GIN indexes, perform complex JSON operations, and mix relational and document storage in the same database. MySQL has a JSON type, but it doesn't match PostgreSQL's indexing flexibility.

```sql
-- PostgreSQL JSONB query with index
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
SELECT * FROM users WHERE metadata @> '{"role": "admin"}';
```

**Query planner** — PostgreSQL's query planner is sophisticated. For complex analytical queries with multiple joins and aggregations, PostgreSQL often finds better query plans than MySQL. On analytical workloads (reporting, dashboards, aggregation-heavy queries), this difference is measurable.

**Extensions** — PostgreSQL supports extensions that fundamentally expand its capabilities: `pgvector` for vector similarity search (used for AI embeddings), `PostGIS` for geospatial data, `pg_trgm` for fuzzy text matching, `timescaledb` for time-series. No other database in this comparison comes close to this extensibility.

**Window functions and CTEs** — PostgreSQL has comprehensive support for window functions and Common Table Expressions (CTEs). These are essential for analytical queries. MySQL added CTE support in 8.0, but PostgreSQL's implementation is more mature and complete.

**Full ACID + MVCC** — PostgreSQL uses Multi-Version Concurrency Control (MVCC) for all transactions. Readers never block writers and writers never block readers. This makes it excellent for mixed read-write workloads.

### PostgreSQL Hosted Options

- **Supabase** — Open source Firebase alternative. Includes auth, storage, and realtime. Strong free tier.
- **Neon** — Serverless PostgreSQL with branching (like PlanetScale for MySQL). Generous free tier.
- **Railway** — Simple deployment, good for small projects. Predictable pricing.
- **AWS RDS / Aurora** — Enterprise-scale, higher cost, more operational flexibility.

### PostgreSQL Weaknesses

**Setup complexity** — Running PostgreSQL locally requires installation and configuration. Not difficult, but more than SQLite (zero setup) or MySQL (slightly simpler initial setup).

**Resource usage** — PostgreSQL is more memory-hungry than MySQL at equivalent traffic levels. For very small VPS deployments, this matters.

**Replication setup** — PostgreSQL's streaming and logical replication is powerful but requires more operational knowledge to configure correctly than MySQL's well-documented replication setup.

---

## MySQL: The Proven Web Database

MySQL has powered web applications since the late 1990s. The LAMP stack (Linux, Apache, MySQL, PHP) built the early internet. MySQL is what WordPress, Drupal, and most legacy PHP applications run on. It's battle-tested, widely understood, and has a large operations knowledge base.

In 2024, MySQL is still an excellent choice — especially with PlanetScale's developer-friendly branching workflow and the maturity of MySQL 8.0's feature set.

### What MySQL Does Best

**Read-heavy workloads** — MySQL with InnoDB (the default storage engine) is highly optimized for read-heavy workloads. With proper indexing and a read replica setup, MySQL scales very well for web applications that read far more than they write.

**Replication** — MySQL's replication story is mature and well-documented. Setting up a primary/replica configuration is straightforward. PlanetScale builds its branching and non-blocking schema changes on top of Vitess, which is a MySQL-based sharding solution.

**Broad hosting support** — Every shared hosting provider, every major cloud provider, and most PaaS platforms support MySQL. If you're deploying to legacy infrastructure or need broad compatibility, MySQL is the safe choice.

**PlanetScale** — PlanetScale's database branching (branch your database like you branch your code, test schema changes, deploy with confidence) is a genuinely useful workflow for teams. It runs on MySQL under the hood.

### MySQL 8.0: Closing the Gap

MySQL 8.0 added significant features that previously required PostgreSQL:
- Window functions
- Common Table Expressions (CTEs)
- Improved JSON support
- Descending indexes
- Hash joins

For many use cases, the MySQL 8.0 vs PostgreSQL feature gap has narrowed. But PostgreSQL still leads on JSONB flexibility, extensions, and analytical query performance.

### MySQL Weaknesses

**JSON support lags PostgreSQL** — MySQL's JSON type works for simple storage and retrieval but doesn't match PostgreSQL's JSONB indexing flexibility for complex JSON queries.

**Full-text search is basic** — MySQL's built-in full-text search works for simple cases but is considerably less capable than PostgreSQL's `ts_vector` implementation or purpose-built search engines.

**Less extensible** — MySQL doesn't have PostgreSQL's extension ecosystem. There's no MySQL equivalent of `pgvector` for AI use cases, `PostGIS` for geospatial work, or `timescaledb` for time-series.

**Case sensitivity quirks** — MySQL's default case-insensitive string comparisons (in some configurations) and collation behavior can cause surprising bugs when migrating data or running cross-platform.

---

## SQLite: The Embedded Database

SQLite is a different category of database. There's no server. There's no connection pool. There's no separate process to manage. SQLite is a library that your application links against, reading and writing a single file. It's the most widely deployed database in the world — it's in every smartphone, every browser, many desktop applications, and countless embedded systems.

For developers, SQLite's primary value is simplicity. Spin up a project, use SQLite, and there's zero database infrastructure to manage.

### What SQLite Does Best

**Zero configuration** — No install, no server, no config file. Open a file path and start querying. For local development, prototyping, testing, and small applications, this is a genuine superpower.

**Embedded and mobile** — SQLite is the database for React Native apps, mobile apps, desktop Electron apps, and any context where running a separate database server isn't practical.

**Testing** — Many projects use PostgreSQL in production but SQLite in tests for speed and isolation. Each test can run with its own fresh database file. No cleanup, no state leakage. (Note: this works best if you're not using PostgreSQL-specific features.)

**Single-process, low concurrency** — For applications with a single writer and low concurrency, SQLite performs excellently. Read performance on SQLite is actually quite fast due to the lack of network overhead.

**Turso** — Turso (libSQL-based) distributes SQLite databases to edge nodes, making it viable for production use cases that need low-latency global reads. This is new territory that expands SQLite's production viability.

### SQLite Weaknesses

**No concurrent writes** — SQLite's write lock is database-wide. Only one writer at a time. For high-write-concurrency web applications, this is a hard ceiling that will bite you in production.

**No network access** — SQLite is a local file. If your application runs on multiple servers, they can't share a SQLite database. You need a client/server database for distributed deployments.

**Limited JSON and search** — SQLite's JSON support is basic. Full-text search via FTS5 is available but less capable than PostgreSQL's implementation.

**Schema changes are limited** — SQLite's `ALTER TABLE` support is limited. Adding a column works; dropping a column, changing a column type, and adding constraints require creating a new table and copying data.

---

## The Same Schema in All Three

```sql
-- PostgreSQL
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    metadata    JSONB DEFAULT '{}',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_metadata ON users USING GIN(metadata);
```

```sql
-- MySQL 8.0
CREATE TABLE users (
    id          CHAR(36) PRIMARY KEY DEFAULT (UUID()),
    email       VARCHAR(255) NOT NULL UNIQUE,
    name        VARCHAR(255) NOT NULL,
    metadata    JSON DEFAULT (JSON_OBJECT()),
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
-- MySQL JSON columns cannot use standard B-tree index
-- Multi-value index or generated column needed for JSON indexing
```

```sql
-- SQLite
CREATE TABLE users (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email       TEXT NOT NULL UNIQUE,
    name        TEXT NOT NULL,
    metadata    TEXT DEFAULT '{}',  -- JSON stored as text
    created_at  TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_email ON users(email);
-- No native JSON indexing; queries must use json_extract()
```

The schema differences highlight the tradeoffs clearly. PostgreSQL's `JSONB` with GIN indexing enables efficient queries inside JSON fields. MySQL requires extra steps for JSON indexing. SQLite stores JSON as text with no native indexing support.

When building APIs that return JSON from these schemas, a [JSON Formatter](/tools/json-formatter) is useful for quickly inspecting response shapes during development. And if you're using [UUID Generator](/tools/uuid) to generate test IDs, both PostgreSQL and MySQL can accept standard UUID format.

---

## Decision Tree: Which Database Should You Use?

**Use SQLite if:**
- Building a local tool, CLI, desktop app, or mobile app
- Running integration tests (SQLite per-test isolation is fast)
- Prototyping and you don't want any infrastructure setup
- Your application is single-process with low write concurrency

**Use MySQL if:**
- You're maintaining or extending an existing MySQL application
- You need PlanetScale's database branching workflow
- You're deploying to hosting that primarily supports MySQL
- Your workload is heavily read-biased with a mature replica setup
- You or your team is more comfortable with MySQL operations

**Use PostgreSQL if:**
- You're starting a new project with no legacy constraints
- You need JSONB with full indexing for semi-structured data
- You're doing analytical queries, reporting, or complex aggregations
- You want the `pgvector` extension for AI/ML embedding search
- You need geospatial support (PostGIS)
- You're using Supabase or Neon for a managed serverless PostgreSQL experience
- You want the most feature-complete SQL implementation available

---

## Hosted Database Options at a Glance

| Platform | Database | Free Tier | Best For |
|---|---|---|---|
| Supabase | PostgreSQL | Yes (generous) | Full-stack apps with auth + storage |
| Neon | PostgreSQL | Yes | Serverless, branching workflow |
| PlanetScale | MySQL (Vitess) | Yes | Schema branching, large scale |
| Railway | PostgreSQL or MySQL | $5 credit | Simple deployments |
| AWS RDS | Both | No (paid) | Enterprise, compliance |
| Turso | SQLite (libSQL) | Yes | Edge-distributed SQLite |

---

## Final Verdict

**PostgreSQL** is the right default for new projects in 2024. The feature set, JSON support, extension ecosystem, and excellent managed hosting options (Supabase, Neon) make it the strongest choice when there's no compelling reason to choose otherwise. The Stack Overflow developer survey reflects this shift — PostgreSQL has overtaken MySQL as the most-used database among professional developers for the first time.

**MySQL** remains excellent for specific contexts: high-read web applications, teams with strong MySQL operational expertise, or projects where PlanetScale's branching workflow is a priority. It's not the wrong choice — it's a different tradeoff.

**SQLite** is underused and underappreciated for the contexts where it actually shines. Local tools, mobile apps, tests, and embedded applications are all SQLite's home turf. Don't reach for a full client/server database when you don't need one.

The most common mistake is choosing a database based on familiarity rather than fit. PostgreSQL and MySQL are both production-ready for most web applications, and the difference between them matters less than the quality of your schema design, indexing strategy, and query patterns. Choose the one that fits your team and project — then invest in understanding it deeply.
