---
title: "Turso: SQLite for the Edge - Everything You Need to Know (2026)"
description: "Complete guide to Turso database covering the libSQL protocol, embedded replicas, multi-tenancy with per-user databases, Drizzle and Prisma integration, pricing vs PlanetScale/Neon/Supabase, and migration from SQLite."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["turso", "sqlite", "edge", "database", "typescript", "libsql"]
readingTime: "12 min read"
---

SQLite is the most deployed database in the world. It's embedded in every iPhone, every Android device, every Chrome browser. Billions of instances run silently under applications we use daily. But SQLite has one limitation that has always kept it off the server-side production path: it's a single-file, single-writer database with no network protocol.

Turso changes that. Built on libSQL — a fork of SQLite with a network protocol, embedded replicas, and multi-database support — Turso brings SQLite's simplicity and performance to distributed, edge-deployed applications. This guide covers everything you need to decide if Turso is right for your stack.

---

## What is Turso?

Turso is a hosted database service built on **libSQL**, an open-source fork of SQLite that adds:

- **Wire protocol**: access SQLite over HTTP/WebSockets, not just the file system
- **Embedded replicas**: a local SQLite file synchronized from the remote database
- **Multi-database**: each database is independent; create thousands per account

The managed service adds:
- **Edge distribution**: replicate your database to 30+ PoPs globally
- **Branching**: fork a database for development/testing
- **Multi-tenancy**: one database per customer, all managed through one API

---

## The libSQL Protocol

libSQL communicates over HTTP (sqld's HTTP API) or WebSockets. This is what enables Turso to work in environments that can't open TCP connections to PostgreSQL:

```typescript
import { createClient } from "@libsql/client";

// Remote Turso database (via libSQL protocol)
const remote = createClient({
  url: process.env.TURSO_DATABASE_URL!,     // libsql://your-db.turso.io
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

// Local SQLite file (same client, different URL)
const local = createClient({ url: "file:./dev.db" });

// In-memory (testing)
const memory = createClient({ url: ":memory:" });
```

The same `@libsql/client` package works for all three. This is key for testing: run tests against in-memory SQLite with zero setup, deploy to Turso in production.

---

## Embedded Replicas

Embedded replicas are Turso's killer feature for read-heavy applications. A local SQLite file is synchronized from the remote Turso database. Reads hit the local file (microsecond latency). Writes go to Turso and sync back.

```typescript
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
  // Enable embedded replica
  syncUrl: process.env.TURSO_DATABASE_URL!,
  syncInterval: 60,  // sync every 60 seconds
});

// Manual sync (e.g., before a read-heavy operation)
await client.sync();

// Reads are local (fast!)
const users = await client.execute("SELECT * FROM users WHERE active = 1");

// Writes go to remote, then sync back
await client.execute({
  sql: "INSERT INTO users (email, name) VALUES (?, ?)",
  args: ["alice@example.com", "Alice"],
});
```

**When to use embedded replicas**:
- Serverless functions that run at the edge close to users
- Read-heavy workloads where writes are infrequent
- Offline-capable applications (the local replica works without internet)

---

## Setup and CLI

```bash
# Install Turso CLI
brew install tursodatabase/tap/turso  # macOS
# or: curl -sSfL https://get.tur.so/install.sh | bash

# Authenticate
turso auth login

# Create a database
turso db create my-app

# Get the URL and generate auth token
turso db show my-app
turso db tokens create my-app
```

### Database Operations

```bash
# Open a shell
turso db shell my-app

# Execute SQL
turso db shell my-app "CREATE TABLE users (id INTEGER PRIMARY KEY, email TEXT UNIQUE)"

# Replicate to a specific region
turso db replicate my-app fra1  # Frankfurt

# Create a branch for development
turso db fork my-app my-app-staging
```

---

## Drizzle ORM with Turso

Drizzle has first-class Turso support:

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

export const db = drizzle(client, { schema });
```

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "sqlite",  // Turso uses SQLite dialect
  dbCredentials: {
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  },
});
```

Note the `dialect: "sqlite"` — Turso uses SQLite's SQL dialect, not PostgreSQL. This matters for:
- Data types: use `text`, `integer`, `real`, `blob` (no `uuid`, `jsonb`, `timestamp`)
- Auto-increment: `INTEGER PRIMARY KEY` (not `SERIAL`)
- JSON: `TEXT` with manual JSON serialization or `jsonb` (SQLite JSON operators)

```typescript
// SQLite-specific schema
import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});
```

---

## Prisma with Turso

```bash
pnpm add @prisma/adapter-libsql @libsql/client
```

```prisma
// schema.prisma
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "sqlite"
  url      = "file:./dev.db"  // Local SQLite for dev
}
```

```typescript
import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const libsql = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});

const adapter = new PrismaLibSQL(libsql);
const prisma = new PrismaClient({ adapter });
```

The Prisma adapter is in preview — Drizzle's Turso support is more mature and generally preferred.

---

## Multi-Tenancy with Per-User Databases

Turso's architecture excels at multi-tenant applications. Instead of isolating tenants with row-level security in one database, give each tenant their own database:

```typescript
import { createClient } from "@libsql/client";

class TursoMultiTenancy {
  private orgDatabase: Map<string, ReturnType<typeof createClient>> = new Map();

  async getDatabaseForOrg(orgId: string) {
    if (this.orgDatabase.has(orgId)) {
      return this.orgDatabase.get(orgId)!;
    }

    // Create the database if it doesn't exist
    const dbName = `tenant-${orgId}`;
    const db = await this.createOrgDatabase(dbName);
    this.orgDatabase.set(orgId, db);
    return db;
  }

  private async createOrgDatabase(name: string) {
    // Use Turso Platform API to create the database
    const response = await fetch(`https://api.turso.tech/v1/organizations/${process.env.TURSO_ORG}/databases`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.TURSO_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name, group: "default" }),
    });

    const { database } = await response.json();

    // Generate an auth token for this database
    const tokenResponse = await fetch(
      `https://api.turso.tech/v1/organizations/${process.env.TURSO_ORG}/databases/${name}/auth/tokens`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.TURSO_API_TOKEN}` },
      }
    );
    const { jwt } = await tokenResponse.json();

    // Connect and run migrations
    const client = createClient({
      url: database.hostname.startsWith("libsql")
        ? database.hostname
        : `libsql://${database.hostname}`,
      authToken: jwt,
    });

    await this.runMigrations(client);
    return client;
  }

  private async runMigrations(client: ReturnType<typeof createClient>) {
    await client.executeMultiple(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        owner_id INTEGER REFERENCES users(id)
      );
    `);
  }
}
```

**Why per-tenant databases?**

- **Complete isolation**: no risk of data leaks between tenants
- **Independent backups**: restore one tenant without affecting others
- **Compliance**: GDPR "right to erasure" = delete one database
- **Performance**: no noisy neighbor problem
- **Simple queries**: no `WHERE tenant_id = ?` on every query

Turso's pricing supports this: you pay per row read/written, not per database. Thousands of databases is practical.

---

## Migrations Strategy

Since each tenant has their own database, running migrations across all tenants requires orchestration:

```typescript
async function migrateAllTenants(migrationSql: string) {
  const tenants = await listAllTenants(); // from your tenant registry

  const results = await Promise.allSettled(
    tenants.map(async (tenant) => {
      const db = await getTenantDatabase(tenant.id);
      await db.executeMultiple(migrationSql);
      return tenant.id;
    })
  );

  const failed = results
    .filter((r): r is PromiseRejectedResult => r.status === "rejected")
    .map((r) => r.reason);

  if (failed.length > 0) {
    console.error("Migration failed for tenants:", failed);
  }

  return {
    success: results.filter((r) => r.status === "fulfilled").length,
    failed: failed.length,
  };
}
```

For complex migrations, tools like Atlas or a custom migration runner work well with Turso's HTTP API.

---

## Turso vs PlanetScale vs Neon vs Supabase

| Feature | Turso | PlanetScale | Neon | Supabase |
|---------|-------|------------|------|----------|
| Database | SQLite | MySQL | PostgreSQL | PostgreSQL |
| Edge CDN | Yes | No | Yes | Limited |
| Free tier | 9GB, 500 DB | 5GB | 512MB compute | 500MB |
| Branching | Yes | Yes | Yes | No |
| Per-tenant DBs | Easy (free) | Limited | Limited | Limited |
| Connection pooling | Built-in | Via PlanetScale | Built-in | Via Supabase |
| Real-time | No | No | No | Yes (Realtime) |
| Auth | No | No | No | Yes |
| Storage | No | No | No | Yes |
| Pricing | Pay-per-row | Pay-per-row | Pay-per-compute | Fixed tiers |

**Choose Turso when**:
- Multi-tenant SaaS with per-customer isolation
- Edge-deployed backends (Cloudflare Workers, Deno Deploy)
- SQLite compatibility (porting an existing SQLite app to the cloud)
- Low read/write volume with many databases (freelance client apps, etc.)

**Choose PlanetScale when**:
- MySQL ecosystem, existing MySQL codebase
- High-scale, single-database applications
- Horizontal sharding with Vitess

**Choose Neon when**:
- PostgreSQL features (full-text search, PostGIS, JSONB operators)
- Serverless with branch-per-PR development workflows
- Cost-effective for variable workloads (scale to zero)

**Choose Supabase when**:
- You want a full BaaS (Auth + Storage + Realtime + Database)
- PostgreSQL + Row Level Security for multi-tenancy
- Building apps without a separate backend

---

## Migration from SQLite to Turso

Existing SQLite apps migrate to Turso with minimal changes:

```typescript
// Before: local SQLite with better-sqlite3
import Database from "better-sqlite3";
const db = new Database("./app.db");
const users = db.prepare("SELECT * FROM users").all();

// After: Turso with @libsql/client
import { createClient } from "@libsql/client";
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
const { rows: users } = await client.execute("SELECT * FROM users");
```

Key differences:
1. Operations are async (add `await`)
2. Results are in `result.rows` not returned directly
3. Parameterized queries use `{ sql, args }` format

```typescript
// better-sqlite3 (sync)
const stmt = db.prepare("SELECT * FROM users WHERE id = ?");
const user = stmt.get(userId);

// @libsql/client (async)
const result = await client.execute({
  sql: "SELECT * FROM users WHERE id = ?",
  args: [userId],
});
const user = result.rows[0];
```

### Migrate existing data

```bash
# Export from local SQLite
sqlite3 local.db .dump > backup.sql

# Import to Turso
turso db shell my-app < backup.sql
```

---

## Pricing in Practice

Turso's pricing (2026):
- **Starter**: Free — 500 databases, 9GB storage, 1B rows read/month
- **Scaler**: $29/month — unlimited databases, 24GB storage, 100B rows read
- **Enterprise**: custom

For most small-to-medium applications, the free tier is sufficient. A typical SaaS with 100 tenants, each with a few thousand rows, reads a few million rows per month — well within the free tier.

**Cost comparison for 100 tenants, 1M rows read/month**:
- Turso: Free
- PlanetScale: $39/month (1 DB)
- Neon: ~$15/month
- Supabase: $25/month

---

## Conclusion

Turso makes SQLite a first-class production database. The libSQL protocol solves the connectivity problem. Embedded replicas solve the latency problem. Per-tenant databases solve the multi-tenancy isolation problem.

For edge-deployed applications, multi-tenant SaaS, or any project where SQLite's simplicity beats PostgreSQL's feature richness, Turso is the best answer in 2026. The free tier is genuinely generous, the migration from local SQLite is minimal, and Drizzle integration makes the schema management experience excellent.

If your application needs PostGIS, complex JSON operators, or the full PostgreSQL ecosystem — choose Neon or Supabase. But if you want the fastest, simplest, most edge-friendly database option available, Turso is it.

**Related tools on DevPlaybook:**
- [SQLite Query Tester](/tools/sqlite-tester) — run SQLite queries in your browser
- [Database Migration Generator](/tools/db-migration-generator) — generate SQL migrations from schema changes
- [Connection String Builder](/tools/connection-string-builder) — build database connection strings
