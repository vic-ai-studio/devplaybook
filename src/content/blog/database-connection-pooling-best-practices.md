---
title: "Database Connection Pooling Best Practices: pgBouncer, pg-pool & More"
description: "Database connection pooling guide: why connection limits matter, pg-pool configuration for Node.js, pgBouncer setup, pool sizing formula, connection leaks, and serverless pooling with Neon/Supabase."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["connection pooling", "pgBouncer", "pg-pool", "PostgreSQL", "database", "Node.js", "serverless"]
readingTime: "9 min read"
category: "database"
---

Every PostgreSQL connection spawns a new backend process consuming roughly 5-10MB of RAM. At 200 simultaneous connections, that is 1-2GB of memory just for connection overhead — before a single query runs. Connection pooling solves this by maintaining a smaller set of real database connections shared across many application threads or requests.

This guide covers the why and how: from pg-pool configuration in Node.js to pgBouncer for multi-process environments and serverless-specific pooling solutions.

## Why Connection Limits Matter

PostgreSQL's `max_connections` default is 100. On a managed database (RDS, Cloud SQL, Supabase), it is often set based on instance size — a small instance might have `max_connections = 25`.

When your connection count approaches the limit:

1. New connection attempts return `FATAL: remaining connection slots are reserved`
2. Application requests queue and time out
3. In the worst case, the entire application stops accepting traffic

The problem compounds in modern architectures:

- **Multiple Node.js processes** (PM2 cluster mode, Kubernetes pods) each open their own pool
- **Serverless functions** open a new connection per invocation if not pooled
- **Background workers** hold connections while idle

Without pooling, a Next.js app with 4 workers, each using `pg` directly with a pool of 10, already consumes 40 connections at idle.

## pg-pool in Node.js

`pg` (the official PostgreSQL driver) includes `Pool` out of the box:

```typescript
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,                     // Maximum pool size
  min: 2,                      // Minimum idle connections to keep open
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 5000, // Error if connection not acquired within 5s
  statement_timeout: 30000,    // Kill queries running longer than 30s
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle pool client', err);
});

export default pool;
```

### Using the Pool

Always release clients back to the pool:

```typescript
// Pattern 1: pool.query() — automatic release (preferred for single queries)
const { rows } = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);

// Pattern 2: checkout/release for multiple queries in same connection
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query('UPDATE accounts SET balance = balance - $1 WHERE id = $2', [amount, fromId]);
  await client.query('UPDATE accounts SET balance = balance + $1 WHERE id = $2', [amount, toId]);
  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release(); // ALWAYS release in finally block
}
```

The `finally` block is critical. A missed `client.release()` is a connection leak — the pool exhausts itself over time as leaked connections are never returned.

## Pool Sizing Formula

The common wisdom of "set pool size to CPU count × 2" comes from Hikari CP (Java), but it holds for Node.js too:

```
pool_size = (num_cpu_cores × 2) + effective_spindle_count
```

For a modern SSD server (spindle count = 1 for SSD):
- 4-core server: pool_size = 4 × 2 + 1 = **9**
- 8-core server: pool_size = 8 × 2 + 1 = **17**

For multiple processes sharing the database, the total across all processes should not exceed `max_connections - 10` (keep a buffer for admin connections):

```
per_process_pool = (max_connections - 10) / num_processes
```

Example: `max_connections = 100`, 4 processes → `pool_size = 22` per process.

Counterintuitively, smaller pools often perform **better** under load than large pools. More connections means more context switching in PostgreSQL and more memory pressure. Start conservative and increase if you see connection timeouts.

## Detecting Connection Leaks

Monitor pool health by querying `pg_stat_activity`:

```sql
-- See all active connections and what they're doing
SELECT
  pid,
  usename,
  application_name,
  client_addr,
  state,
  wait_event_type,
  wait_event,
  query_start,
  now() - query_start AS query_duration,
  LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE datname = 'myapp'
ORDER BY query_duration DESC NULLS LAST;
```

Long-running connections in `idle` state are likely leaked connections. In Node.js, add pool monitoring:

```typescript
// Log pool statistics periodically
setInterval(() => {
  console.log({
    total: pool.totalCount,
    idle: pool.idleCount,
    waiting: pool.waitingCount,
  });
}, 30000);
```

If `waitingCount` is consistently above zero, your pool is undersized or there is a leak. If `idleCount` is always equal to `totalCount`, your pool is oversized.

To find the specific code causing leaks, enable the `allowExitOnIdle` flag and look for unresolved checkouts in heap snapshots.

## pgBouncer — Multi-Process Pooling

When you have multiple Node.js processes (or servers), each with their own pool, you need a centralized proxy. pgBouncer sits between your applications and PostgreSQL, maintaining one pool of real database connections shared across all clients.

### pgBouncer Pooling Modes

**Session pooling** — one server connection per client session. Same as having a pool per process, but centralized. Supports all PostgreSQL features including server-side `PREPARE`.

**Transaction pooling** — server connection assigned per transaction, released after `COMMIT`/`ROLLBACK`. This is the most efficient mode and the one used by Neon, Supabase, and similar managed services. **Does not support server-side prepared statements** (use `?` parameterization instead of `PREPARE`).

**Statement pooling** — server connection released after each statement. Only for simple single-statement use cases. Transactions spanning multiple statements will corrupt data.

For most production applications, **transaction pooling** is the right choice.

### pgBouncer Configuration

```ini
; /etc/pgbouncer/pgbouncer.ini
[databases]
myapp = host=localhost port=5432 dbname=myapp

[pgbouncer]
listen_port = 6432
listen_addr = 127.0.0.1
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt

; Pooling
pool_mode = transaction
max_client_conn = 1000      ; Max clients connecting to pgBouncer
default_pool_size = 25      ; Server connections per database/user pair
min_pool_size = 5
reserve_pool_size = 5       ; Extra connections for spikes
reserve_pool_timeout = 3    ; Wait 3s before using reserve pool

; Timeouts
server_idle_timeout = 600   ; Close idle server connections after 10m
client_idle_timeout = 0     ; Never close idle clients (handle in app)
query_timeout = 30          ; Kill queries over 30s
connect_timeout = 15        ; Timeout connecting to PostgreSQL

; Performance
server_reset_query = DISCARD ALL  ; Reset session state between reuse
ignore_startup_parameters = extra_float_digits,options
```

```bash
# userlist.txt — hashed passwords
"myapp_user" "md5hash_or_scram_verifier"
```

Connect your application to pgBouncer port (6432) instead of PostgreSQL directly:

```typescript
const pool = new Pool({
  host: 'localhost',
  port: 6432,   // pgBouncer port, not 5432
  database: 'myapp',
  user: 'myapp_user',
  password: process.env.DB_PASSWORD,
  max: 10,      // Client connections to pgBouncer (not server connections)
});
```

In transaction mode, set `max` in your application pool much higher than your actual server connection count — pgBouncer handles the multiplexing.

## Serverless Pooling

Serverless functions are the worst-case scenario for connection management. Each Lambda/Vercel function invocation can open a new connection, and thousands can run simultaneously.

### Option 1: Neon's Built-in Pooler

Neon provides a pooled connection string alongside your direct connection string:

```typescript
// Direct connection (no pooling) — for migrations and long-running processes
const directUrl = 'postgresql://user:pass@ep-xxx.us-east-1.aws.neon.tech/myapp';

// Pooled via pgBouncer — for serverless functions
const pooledUrl = 'postgresql://user:pass@ep-xxx-pooler.us-east-1.aws.neon.tech/myapp?pgbouncer=true';
```

With Drizzle + Neon serverless:
```typescript
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// HTTP-based — no persistent connection, safe for serverless
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);
```

### Option 2: Supabase pgBouncer

Supabase exposes pgBouncer on port 6543 (vs direct on 5432):

```
# Direct
postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# Pooled (transaction mode)
postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Option 3: PgBouncer on Fly.io

For self-managed databases, deploy pgBouncer as a Fly.io machine in the same region:

```toml
# fly.toml
app = "myapp-pgbouncer"
primary_region = "nrt"

[[services]]
  internal_port = 6432
  protocol = "tcp"

  [[services.ports]]
    port = 6432
```

## Monitoring Pool Health

Query `pg_stat_activity` to monitor in production:

```typescript
// Health check endpoint
app.get('/health/db', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        count(*) FILTER (WHERE state = 'active') AS active,
        count(*) FILTER (WHERE state = 'idle') AS idle,
        count(*) FILTER (WHERE state = 'idle in transaction') AS idle_in_transaction,
        count(*) AS total
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid != pg_backend_pid()
    `);

    res.json({
      status: 'ok',
      pool: {
        total: pool.totalCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      },
      database: rows[0],
    });
  } catch (err) {
    res.status(503).json({ status: 'error', message: err.message });
  }
});
```

Watch for `idle in transaction` counts climbing — this indicates transactions started but not committed, holding locks and connections.

## Quick Reference

| Scenario | Recommended Approach |
|---|---|
| Single Node.js process | `pg.Pool` with `max: 10-20` |
| Multiple Node.js processes | pgBouncer (transaction mode) in front |
| Serverless (Lambda, Vercel) | Neon pooled URL or PgBouncer proxy |
| Cloudflare Workers | Neon HTTP driver or Hyperdrive |
| High write throughput | pgBouncer + transaction pooling |
| Prepared statements required | pgBouncer session mode or direct pool |

## Summary

Connection pooling is not optional in production — it is a required component of any PostgreSQL deployment beyond a toy project. For single-server Node.js applications, `pg.Pool` with conservatively sized pools (10-25 connections) is usually sufficient. For multi-process or containerized deployments, pgBouncer in transaction mode eliminates connection pressure entirely. For serverless, use the HTTP-based drivers or managed poolers from Neon and Supabase.

The right pool size is smaller than you think. Start at `(cores × 2) + 1`, monitor `waitingCount`, and only increase if you see genuine connection starvation.
