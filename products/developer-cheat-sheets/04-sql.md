# SQL Cheat Sheet

---

## SELECT Basics

```sql
SELECT * FROM users;
SELECT id, name, email FROM users;
SELECT DISTINCT country FROM users;
SELECT name AS full_name, email FROM users;    -- alias
SELECT COUNT(*) FROM users;
SELECT COUNT(DISTINCT email) FROM users;
```

---

## Filtering

```sql
WHERE status = 'active'
WHERE age > 18 AND country = 'US'
WHERE age BETWEEN 18 AND 65
WHERE status IN ('active', 'trial')
WHERE name LIKE 'John%'            -- starts with John
WHERE name ILIKE '%john%'          -- case insensitive (PostgreSQL)
WHERE email IS NULL
WHERE email IS NOT NULL
WHERE NOT status = 'deleted'
```

---

## Sorting & Limiting

```sql
ORDER BY created_at DESC
ORDER BY last_name ASC, first_name ASC
LIMIT 20
LIMIT 20 OFFSET 40                -- pagination: page 3, 20 per page
FETCH FIRST 10 ROWS ONLY          -- SQL standard alternative to LIMIT
```

---

## Aggregation

```sql
SELECT COUNT(*) FROM orders;
SELECT SUM(amount) FROM orders WHERE status = 'paid';
SELECT AVG(amount), MIN(amount), MAX(amount) FROM orders;
SELECT country, COUNT(*) AS user_count
FROM users
GROUP BY country
ORDER BY user_count DESC;

-- HAVING: filter on aggregated results
SELECT country, COUNT(*) AS cnt
FROM users
GROUP BY country
HAVING COUNT(*) > 100;
```

---

## Joins

```sql
-- INNER JOIN: only matching rows
SELECT u.name, o.total
FROM users u
INNER JOIN orders o ON u.id = o.user_id;

-- LEFT JOIN: all users, null if no order
SELECT u.name, o.total
FROM users u
LEFT JOIN orders o ON u.id = o.user_id;

-- Multiple joins
SELECT u.name, o.id, p.name AS product
FROM users u
JOIN orders o ON u.id = o.user_id
JOIN order_items oi ON o.id = oi.order_id
JOIN products p ON oi.product_id = p.id;

-- Self join
SELECT a.name AS employee, b.name AS manager
FROM employees a
LEFT JOIN employees b ON a.manager_id = b.id;
```

---

## Subqueries & CTEs

```sql
-- Subquery
SELECT name FROM users
WHERE id IN (SELECT user_id FROM orders WHERE total > 1000);

-- CTE (cleaner, reusable)
WITH high_value_users AS (
  SELECT user_id FROM orders
  GROUP BY user_id
  HAVING SUM(total) > 1000
)
SELECT u.name, u.email
FROM users u
JOIN high_value_users h ON u.id = h.user_id;

-- Recursive CTE
WITH RECURSIVE hierarchy AS (
  SELECT id, name, manager_id FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, e.manager_id
  FROM employees e
  JOIN hierarchy h ON e.manager_id = h.id
)
SELECT * FROM hierarchy;
```

---

## Window Functions

```sql
-- Row number per group
SELECT name, department,
  ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS rank
FROM employees;

-- Running total
SELECT date, amount,
  SUM(amount) OVER (ORDER BY date) AS running_total
FROM payments;

-- LAG/LEAD: compare to previous/next row
SELECT date, revenue,
  LAG(revenue) OVER (ORDER BY date) AS prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY date) AS growth
FROM monthly_stats;
```

---

## INSERT, UPDATE, DELETE

```sql
-- Insert
INSERT INTO users (name, email) VALUES ('Alice', 'alice@example.com');

-- Insert multiple
INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');

-- Upsert (PostgreSQL)
INSERT INTO users (id, name) VALUES (1, 'Alice')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- Update
UPDATE users SET status = 'inactive' WHERE last_login < NOW() - INTERVAL '90 days';

-- Delete
DELETE FROM users WHERE status = 'deleted' AND created_at < NOW() - INTERVAL '1 year';
```

---

## Indexes

```sql
-- Basic index
CREATE INDEX idx_users_email ON users(email);

-- Unique index
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Composite index (order matters!)
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);

-- Partial index (index a subset)
CREATE INDEX idx_active_users ON users(email) WHERE status = 'active';

-- Check index usage
EXPLAIN ANALYZE SELECT * FROM users WHERE email = 'alice@example.com';

-- List indexes (PostgreSQL)
SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'users';
```

---

## Performance Tips

```sql
-- Use EXPLAIN to see query plan
EXPLAIN SELECT * FROM orders WHERE user_id = 123;
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;  -- actually runs it

-- Avoid SELECT * in production — select only needed columns
-- Use indexes on columns in WHERE, JOIN ON, ORDER BY
-- For LIKE queries, only left-anchored patterns use indexes: LIKE 'foo%' ✓ vs LIKE '%foo' ✗
-- Use connection pooling (PgBouncer, etc.) for high-concurrency apps
-- VACUUM ANALYZE (PostgreSQL) to update statistics and reclaim space
```

---

## Useful PostgreSQL

```sql
-- Current date/time
SELECT NOW(), CURRENT_DATE, CURRENT_TIME;

-- Date math
SELECT NOW() - INTERVAL '7 days';
SELECT DATE_TRUNC('month', created_at) FROM orders;

-- JSON
SELECT data->>'name' FROM users;              -- text
SELECT data->'address'->>'city' FROM users;   -- nested
SELECT * FROM users WHERE data @> '{"role":"admin"}';  -- contains

-- String functions
SELECT UPPER(name), LOWER(email), LENGTH(name) FROM users;
SELECT CONCAT(first_name, ' ', last_name) FROM users;
SELECT TRIM(BOTH ' ' FROM name) FROM users;
COALESCE(nickname, name, 'Anonymous')          -- first non-null
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
