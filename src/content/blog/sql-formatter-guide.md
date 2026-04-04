---
title: "SQL Formatter: Clean Up Messy SQL Queries in Seconds"
description: "How to format SQL queries instantly. Covers indentation rules, keyword capitalization, JOIN formatting, subqueries, and the best SQL formatters for PostgreSQL, MySQL, and SQLite."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["sql", "formatter", "database", "postgresql", "mysql", "query"]
readingTime: "8 min read"
---

# SQL Formatter: Clean Up Messy SQL Queries in Seconds

SQL readability is a real problem. A query that looks sensible when you write it at 2 AM becomes completely opaque when your colleague tries to debug it at 10 AM. Or when you revisit it yourself six months later. Consistent formatting isn't vanity — it directly reduces the time spent understanding and debugging queries.

This guide covers the standard SQL formatting rules, common patterns, and tools that automate the process.

## Why SQL Formatting Matters

Unformatted SQL is unreadable:

```sql
-- Impossible to parse visually
SELECT u.id,u.name,u.email,o.id,o.total,o.created_at FROM users u JOIN orders o ON u.id=o.user_id WHERE o.total>100 AND u.created_at>'2026-01-01' ORDER BY o.total DESC LIMIT 20;
```

```sql
-- Instantly readable
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

The second version is 12 lines instead of 1, but you can parse it in seconds rather than minutes. For complex queries with 5+ joins and nested subqueries, this difference becomes critical.

## Standard SQL Formatting Rules

| Element | Rule | Example |
|---------|------|---------|
| Keywords | UPPERCASE | SELECT, FROM, WHERE, JOIN |
| Table/column names | as-is | users, orders, created_at |
| Aliases | Short, lowercase | u, o, ua |
| Comparison operators | Spaces around them | `total > 100`, `id = o.user_id` |
| Commas | Leading commas (controversial) or trailing | both styles are valid, pick one |
| Indentation | 2 or 4 spaces | Consistent within a project |

On the comma placement debate: leading commas (at the start of a line) make it easier to see what was added/removed in git diffs. Trailing commas match how you'd write a list in most programming languages. Choose one style and stick to it.

## Keyword Casing

The convention is UPPERCASE for SQL keywords. This visual contrast between keywords and identifiers makes queries faster to scan.

```sql
-- Follow these examples:
SELECT
  id,
  name,
  email
FROM users
WHERE active = TRUE
  AND created_at > NOW() - INTERVAL '30 days'
ORDER BY created_at DESC;
```

Some modern shops use lowercase keywords for consistency with ORM-generated SQL. The important thing is consistency within a project.

## Formatting JOINs

JOINs on their own lines, indented relative to FROM, with the ON condition on the same line when short or the next line when long:

```sql
-- Short ON condition: same line
SELECT
  u.name,
  o.total
FROM users u
  JOIN orders o ON u.id = o.user_id
  LEFT JOIN addresses a ON u.id = a.user_id

-- Long ON condition: next line, double indented
FROM users u
  JOIN orders o
    ON u.id = o.user_id
    AND o.deleted_at IS NULL
  LEFT JOIN order_items oi
    ON o.id = oi.order_id

-- Multiple join conditions
WHERE
  o.total > 100
  AND o.status = 'completed'
  AND a.country IN ('TW', 'HK', 'CN')
```

## Subqueries

Indent subqueries relative to their context. Add a blank line before and after complex subqueries for visual separation.

```sql
SELECT
  u.name,
  (
    SELECT COUNT(*)
    FROM orders o
    WHERE o.user_id = u.id
      AND o.status = 'completed'
  ) AS completed_order_count,
  (
    SELECT SUM(o.total)
    FROM orders o
    WHERE o.user_id = u.id
  ) AS lifetime_value
FROM users u
WHERE
  EXISTS (
    SELECT 1
    FROM orders o
    WHERE o.user_id = u.id
      AND o.total > 500
  )
ORDER BY lifetime_value DESC NULLS LAST;
```

## CTEs (Common Table Expressions)

CTEs improve readability dramatically for complex queries. Each CTE should be focused on one logical operation:

```sql
WITH
-- Step 1: Get users with recent orders
active_users AS (
  SELECT DISTINCT user_id
  FROM orders
  WHERE created_at > NOW() - INTERVAL '90 days'
),

-- Step 2: Calculate their total revenue
user_revenue AS (
  SELECT
    o.user_id,
    SUM(o.total) AS total_revenue,
    COUNT(*) AS order_count,
    AVG(o.total) AS avg_order_value
  FROM orders o
  INNER JOIN active_users au ON o.user_id = au.user_id
  GROUP BY o.user_id
),

-- Step 3: Segment by revenue
user_segments AS (
  SELECT
    user_id,
    total_revenue,
    order_count,
    CASE
      WHEN total_revenue > 10000 THEN 'platinum'
      WHEN total_revenue > 1000 THEN 'gold'
      WHEN total_revenue > 100 THEN 'silver'
      ELSE 'bronze'
    END AS segment
  FROM user_revenue
)

SELECT
  u.name,
  u.email,
  us.segment,
  us.total_revenue,
  us.order_count
FROM users u
INNER JOIN user_segments us ON u.id = us.user_id
ORDER BY us.total_revenue DESC;
```

CTEs make complex queries understandable because you can read each step in isolation. The final SELECT becomes almost self-documenting.

## Common SQL Formatting Mistakes

| Mistake | Correction |
|---------|-----------|
| `select * from users` | `SELECT * FROM users` (uppercase keywords) |
| `WHERE id=1` | `WHERE id = 1` (spaces around `=`) |
| `name ,email` | `name, email` (space after comma, not before) |
| Trailing comma: `SELECT id, name, FROM users` | Remove the comma before FROM |
| All on one line | Put each major clause on its own line |
| No aliases on long table names | Use short aliases: `inventory_items ii` |

## Dialect Differences

Different databases have different syntax extensions that affect formatting:

| Dialect | Unique Features |
|---------|---------------|
| PostgreSQL | `RETURNING`, `ON CONFLICT`, `ILIKE`, `::` type casting |
| MySQL | `REGEXP`, `IGNORE`, `STRAIGHT_JOIN`, backtick quoting |
| SQLite | `RETURNING` (v3.35+), minimal type system |
| SQL Server (T-SQL) | `TOP n`, `WITH (NOLOCK)`, `DATEPART()` |
| BigQuery | `STRUCT`, `ARRAY_AGG`, backtick quoting |

Always use a SQL formatter that knows your dialect — some `RETURNING` clause formatting differs significantly between PostgreSQL and SQLite.

## CASE Statements

```sql
SELECT
  id,
  status,
  CASE
    WHEN status = 'active' AND last_login > NOW() - INTERVAL '7 days' THEN 'recently_active'
    WHEN status = 'active' THEN 'active_inactive'
    WHEN status = 'banned' THEN 'banned'
    ELSE 'inactive'
  END AS user_category
FROM users;
```

Each WHEN on its own line, THEN on the same line (for short values) or the next line (for long values). ELSE before END.

## Window Functions

Window functions with a long OVER clause benefit from line breaks:

```sql
SELECT
  user_id,
  order_date,
  total,
  ROW_NUMBER() OVER (
    PARTITION BY user_id
    ORDER BY order_date DESC
  ) AS order_rank,
  SUM(total) OVER (
    PARTITION BY user_id
    ORDER BY order_date
    ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
  ) AS running_total
FROM orders;
```

## Automated SQL Formatters

You shouldn't format SQL by hand for every query. Use:

- **pgFormatter** — PostgreSQL-aware, available as CLI and online
- **SQL Formatter** (npm package `sql-formatter`) — multi-dialect support, configurable
- **dbt's built-in formatter** — if you use dbt for data modeling
- **DataGrip / DBeaver** — format SQL in the IDE with a keyboard shortcut
- **VS Code extensions** — SQLTools, SQL Formatter

For teams, add a SQL formatter to your git pre-commit hook or CI pipeline to enforce consistent style automatically.

```bash
# Using sql-formatter CLI in a pre-commit hook
npm install -g sql-formatter

# Format a SQL file
sql-formatter --language postgresql --output formatted.sql query.sql

# In your migration scripts
for f in migrations/*.sql; do
  sql-formatter --language postgresql -o "$f" "$f"
done
```

## SQL Anti-Patterns to Avoid

Beyond formatting, here are readability problems that no formatter can fix:

```sql
-- Anti-pattern: implicit column selection
SELECT * FROM orders;
-- Better: list columns explicitly
SELECT id, user_id, total, status, created_at FROM orders;

-- Anti-pattern: magic numbers
WHERE status = 3
-- Better: use constants or enums, or add a comment
WHERE status = 3  -- 3 = 'completed'

-- Anti-pattern: deep nesting without CTEs
SELECT * FROM (
  SELECT * FROM (
    SELECT * FROM orders
    WHERE total > 100
  ) sub1
  WHERE sub1.user_id IN (SELECT id FROM users WHERE active = TRUE)
) sub2;
-- Better: use CTEs

-- Anti-pattern: BETWEEN with dates (inclusive on both ends, confusing)
WHERE created_at BETWEEN '2026-01-01' AND '2026-01-31'
-- Better: explicit range
WHERE created_at >= '2026-01-01' AND created_at < '2026-02-01'
```

## Key Takeaways

- UPPERCASE for SQL keywords — visual contrast with identifiers.
- Put each major clause (SELECT, FROM, WHERE, GROUP BY, ORDER BY) on its own line.
- JOINs on separate lines from FROM, with ON conditions inline when short.
- Use CTEs for complex queries — they're self-documenting and testable.
- Add spaces around all operators (`=`, `>`, `<`, `+`, etc.).
- Use automated formatters — don't format by hand.

## FAQ

**Should I use UPPERCASE or lowercase for SQL keywords?**
UPPERCASE is the traditional convention and more commonly used in documentation, tutorials, and SQL standards. Lowercase is common in ORM-generated SQL. Either is fine — consistency matters more than which you choose.

**Are CTEs slower than subqueries?**
In modern databases (PostgreSQL 12+, recent MySQL, SQL Server), CTEs are materialized similarly to subqueries. Use CTEs for readability without worrying about performance — the query optimizer handles it. Exceptions exist for very complex CTEs where hinting the optimizer is necessary.

**What's the best SQL formatter for PostgreSQL?**
pgFormatter is excellent for PostgreSQL-specific features. sql-formatter (npm) is great for multi-dialect projects. DataGrip/DBeaver handle formatting natively if you use those as your IDE.
