---
title: "SQL Formatter: Clean Up Messy SQL Queries in Seconds"
description: "How to format SQL queries instantly. Covers indentation rules, keyword capitalization, JOIN formatting, subqueries, and the best SQL formatters for PostgreSQL, MySQL, and SQLite."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["sql", "formatter", "database", "postgresql", "mysql", "query"]
readingTime: "2 min read"
---

# SQL Formatter: Clean Up Messy SQL Queries in Seconds

## Why SQL Formatting Matters

Unformatted SQL is unreadable:

```sql
-- ❌ Impossible to parse visually
SELECT u.id,u.name,u.email,o.id,o.total,o.created_at FROM users u JOIN orders o ON u.id=o.user_id WHERE o.total>100 AND u.created_at>'2026-01-01' ORDER BY o.total DESC LIMIT 20;
```

```sql
-- ✅ Instantly readable
SELECT
  u.id,
  u.name,
  u.email,
  o.id,
  o.total,
  o.created_at
FROM users u
  JOIN orders o ON u.id = o.user_id
WHERE
  o.total > 100
  AND u.created_at > '2026-01-01'
ORDER BY o.total DESC
LIMIT 20;
```

## Standard SQL Formatting Rules

| Element | Rule | Example |
|---------|------|---------|
| Keywords | UPPERCASE | SELECT, FROM, WHERE |
| Table names | as-is | users, orders |
| Aliases | Short, lowercase | u, o, ua |
| Comparison | Spaces around `=` | `total > 100` |
| Commas | Leading (no trailing) | `name,` not `name ,` |
| Indentation | 2 or 4 spaces | Nested clauses indented |

## Formatting JOINs Correctly

```sql
-- ❌ JOINs on same line as FROM
FROM users u JOIN orders o ON u.id=o.user_id

-- ✅ JOINs on separate lines
FROM users u
  JOIN orders o ON u.id = o.user_id
  LEFT JOIN addresses a ON u.id = a.user_id

-- ✅ Multiple conditions
WHERE
  o.total > 100
  AND o.status = 'completed'
  AND a.country IN ('TW', 'HK', 'CN')
```

## Subqueries

```sql
SELECT
  u.name,
  (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.user_id = u.id
  ) AS order_count
FROM users u
WHERE
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
      AND o.total > 500
  )
ORDER BY order_count DESC;
```

## Common Mistakes

| Mistake | Correction |
|---------|-----------|
| `select * from` | `SELECT * FROM` (uppercase keywords) |
| `WHERE id=1` | `WHERE id = 1` (spaces around `=`) |
| `name ,email` | `name, email` (comma before value) |
| `SELECT id, name, FROM users` | Remove trailing comma before FROM |
| `WHERE status='active AND total>100` | `WHERE status = 'active' AND total > 100` |

## Dialect Differences

| Dialect | Extra Keywords |
|---------|---------------|
| PostgreSQL | RETURNING, ON CONFLICT, WITH ORDINALITY |
| MySQL | REGEXP, IGNORE, HIGH_PRIORITY |
| SQLite | RETURNING (v3.35+), ON CONFLICT |
| T-SQL (SQL Server) | TOP, WITH (nolock) |

## Online SQL Formatters

Use a formatter that supports dialect selection — formatting rules differ slightly between databases.
