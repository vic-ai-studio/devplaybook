---
title: "pgAdmin — PostgreSQL Administration & Development Tool"
description: "pgAdmin is the most popular open-source administration and development platform for PostgreSQL. It provides a web-based GUI for managing databases, writing queries, and monitoring server performance."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "pgAdmin is 100% free and open-source (PostgreSQL License). Available as desktop app or Docker-hosted web application."
website: "https://www.pgadmin.org"
github: "https://github.com/pgadmin-org/pgadmin4"
tags: ["database", "postgresql", "gui", "admin", "sql", "devops", "dba"]
pros:
  - "Feature-complete PostgreSQL admin: schema browser, query editor, monitoring, backup"
  - "Visual query plan: EXPLAIN ANALYZE visualized as graphical execution plan"
  - "ERD: auto-generate entity relationship diagrams from your schema"
  - "Scheduled maintenance: automate VACUUM, ANALYZE, backup jobs"
  - "Docker deployable: run as a web app for team access"
cons:
  - "Heavy web UI — can feel slow for simple tasks"
  - "Some features have awkward UX (e.g., query results panel)"
  - "Not as fast as psql for experienced developers"
  - "UI complexity overwhelming for beginners"
date: "2026-04-02"
---

## What is pgAdmin?

pgAdmin is the official PostgreSQL administration tool. It provides a full-featured web interface for managing PostgreSQL databases: browsing schemas, writing and executing SQL, analyzing query performance, managing users, and monitoring server health.

## Installation

```bash
# macOS
brew install --cask pgadmin4

# Docker (run as shared team tool)
docker run -p 5050:80 \
  -e PGADMIN_DEFAULT_EMAIL=admin@example.com \
  -e PGADMIN_DEFAULT_PASSWORD=admin \
  dpage/pgadmin4

# Access at http://localhost:5050
```

## Key Features

### Query Tool

The pgAdmin Query Tool provides:
- SQL syntax highlighting and autocomplete
- Query history
- Explain (EXPLAIN and EXPLAIN ANALYZE with visual plan)
- Export results to CSV, JSON, Excel

```sql
-- In pgAdmin Query Tool: Analyze a slow query
EXPLAIN ANALYZE
SELECT u.name, COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON p.author_id = u.id
WHERE u.active = true
GROUP BY u.id, u.name
ORDER BY post_count DESC
LIMIT 10;

-- pgAdmin shows this as a graphical query plan
-- showing sequential scans, index usage, row counts, and costs
```

### Schema Browser

The left panel shows your entire database hierarchy:
- Databases → Schemas → Tables, Views, Functions, Sequences
- Click any table → right-click → "Properties" for column details
- Right-click any object → "Scripts" → auto-generate CREATE, INSERT, UPDATE SQL

### ERD (Entity Relationship Diagram)

```
Tools → ERD Tool → Add/Open Tables
```

pgAdmin auto-generates ERDs from your schema, showing foreign key relationships visually. Export as SVG or PNG for documentation.

### Server Activity Monitoring

```
Dashboard → Server Activity
```

Shows active queries with execution time, lock waits, and background processes. Useful for identifying slow queries and lock contention.

```sql
-- Run these manually in Query Tool for deeper analysis
-- Active queries
SELECT pid, query, state, query_start, now() - query_start AS duration
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

-- Table sizes
SELECT tablename,
  pg_size_pretty(pg_total_relation_size(tablename::regclass)) AS total,
  pg_size_pretty(pg_indexes_size(tablename::regclass)) AS index_size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(tablename::regclass) DESC;
```

### Backup and Restore

```
Right-click Database → Backup...
```

pgAdmin uses `pg_dump` under the hood. Options:
- Format: Custom (compressed, recommended), Plain SQL, Directory
- Include/exclude schemas, tables
- Schedule backups as maintenance jobs

```bash
# Equivalent command line:
pg_dump -Fc -d mydb -f backup.dump

# Restore
pg_restore -d mydb backup.dump
```

## Docker Compose Setup for Teams

```yaml
version: '3'
services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_PASSWORD: password
      POSTGRES_DB: myapp
    volumes:
      - pgdata:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  pgadmin:
    image: dpage/pgadmin4:latest
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@company.com
      PGADMIN_DEFAULT_PASSWORD: admin
    ports:
      - "5050:80"
    depends_on:
      - postgres

volumes:
  pgdata:
```

pgAdmin is the essential companion to PostgreSQL for teams that prefer GUI tools over psql for database administration and development.
