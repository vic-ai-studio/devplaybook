---
title: "Drizzle ORM: The TypeScript-First Database Toolkit (Complete Guide 2026)"
description: "Complete guide to Drizzle ORM covering why Drizzle vs Prisma and TypeORM, schema definition, migrations with drizzle-kit, query builder patterns, Drizzle Studio, and serverless performance."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["drizzle", "orm", "typescript", "database", "postgresql", "sqlite"]
readingTime: "13 min read"
---

The TypeScript ORM landscape has a new winner. Drizzle arrived quietly, promised a "SQL-like" API that doesn't hide the database from you, and delivered something the JavaScript community had been asking for: an ORM that feels like writing SQL, not fighting one.

By 2026, Drizzle is the default ORM for new TypeScript projects on serverless platforms. This guide covers the full picture: why Drizzle, how the schema works, migrations, advanced queries, and when you should still pick Prisma.

---

## Why Drizzle in 2026?

### The Problem with Traditional ORMs

ActiveRecord-style ORMs (TypeORM, Sequelize) built a leaky abstraction over SQL. Write objects, get SQL — but the SQL generated is often inefficient, and debugging requires understanding two layers simultaneously.

Prisma solved the TypeScript ergonomics problem beautifully but introduced new costs:
- A binary engine (Prisma Engine) that adds ~40MB to deployments
- Cold start overhead in serverless environments
- The Prisma Schema Language — a separate file format to learn
- Limited raw SQL control

### Drizzle's Philosophy

Drizzle is explicit about what it is: **TypeScript bindings for SQL**. The API maps directly to SQL constructs. There's no magic, no engine, and no binary dependencies.

```typescript
// Drizzle: you write TypeScript that looks like SQL
const users = await db
  .select()
  .from(usersTable)
  .where(and(eq(usersTable.active, true), gt(usersTable.age, 18)))
  .orderBy(desc(usersTable.createdAt))
  .limit(20);

// vs Prisma: abstracts SQL completely
const users = await prisma.user.findMany({
  where: { active: true, age: { gt: 18 } },
  orderBy: { createdAt: "desc" },
  take: 20,
});
```

Both are valid. Drizzle's advantage: when you need to optimize a query or use a database-specific feature, there's no layer to fight through.

---

## Installation and Setup

```bash
# Install Drizzle + your database driver
pnpm add drizzle-orm

# PostgreSQL
pnpm add postgres  # or pg, @neondatabase/serverless, @vercel/postgres

# MySQL
pnpm add mysql2

# SQLite
pnpm add better-sqlite3  # or bun:sqlite (built into Bun)

# Development tools
pnpm add -D drizzle-kit
```

### Connecting to PostgreSQL

```typescript
// src/db/index.ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client);
```

### Connecting with Neon (Serverless Postgres)

```typescript
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql);
```

### Connecting with Turso (SQLite Edge)

```typescript
import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
});
export const db = drizzle(client);
```

---

## Schema Definition

Drizzle schemas are TypeScript files — no separate schema language:

```typescript
// src/db/schema.ts
import { pgTable, serial, text, integer, boolean, timestamp, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  age: integer("age"),
  active: boolean("active").notNull().default(true),
  role: text("role", { enum: ["admin", "user", "guest"] }).notNull().default("user"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  content: text("content"),
  published: boolean("published").notNull().default(false),
  authorId: uuid("author_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Define relations for joins
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, {
    fields: [posts.authorId],
    references: [users.id],
  }),
}));
```

### TypeScript Types from Schema

```typescript
import { InferSelectModel, InferInsertModel } from "drizzle-orm";

// Read type (from SELECT)
type User = InferSelectModel<typeof users>;
// { id: string; email: string; name: string; age: number | null; ... }

// Write type (for INSERT)
type NewUser = InferInsertModel<typeof users>;
// id, createdAt, updatedAt are optional (have defaults)
```

---

## CRUD Operations

### Insert

```typescript
// Insert single record
const [user] = await db
  .insert(users)
  .values({
    email: "alice@example.com",
    name: "Alice",
    age: 28,
  })
  .returning();

// Insert multiple
await db.insert(posts).values([
  { title: "First Post", authorId: user.id },
  { title: "Second Post", content: "Content here", authorId: user.id },
]);
```

### Select

```typescript
// Basic select
const allUsers = await db.select().from(users);

// With conditions
const activeAdmins = await db
  .select({
    id: users.id,
    email: users.email,
    name: users.name,
  })
  .from(users)
  .where(and(eq(users.active, true), eq(users.role, "admin")));

// With joins
const postsWithAuthors = await db
  .select({
    postId: posts.id,
    title: posts.title,
    authorName: users.name,
    authorEmail: users.email,
  })
  .from(posts)
  .leftJoin(users, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt));

// With relations (uses the defined relations)
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
    },
  },
  limit: 10,
});
```

### Update

```typescript
// Update with returning
const [updated] = await db
  .update(users)
  .set({ name: "Alice Smith", updatedAt: new Date() })
  .where(eq(users.id, userId))
  .returning();

// Upsert
await db
  .insert(users)
  .values({ email: "bob@example.com", name: "Bob" })
  .onConflictDoUpdate({
    target: users.email,
    set: { name: "Bob Updated", updatedAt: new Date() },
  });
```

### Delete

```typescript
const [deleted] = await db
  .delete(users)
  .where(eq(users.id, userId))
  .returning();
```

---

## Migrations with drizzle-kit

### Configuration

```typescript
// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: true,
});
```

### Workflow

```bash
# Generate a migration from schema changes
npx drizzle-kit generate

# Apply migrations to the database
npx drizzle-kit migrate

# Push schema changes directly (dev only, no migration files)
npx drizzle-kit push

# Open Drizzle Studio — browser UI for your database
npx drizzle-kit studio
```

Generated migration example:

```sql
-- migrations/0001_add_users_table.sql
CREATE TABLE IF NOT EXISTS "users" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "email" text NOT NULL UNIQUE,
  "name" text NOT NULL,
  "age" integer,
  "active" boolean NOT NULL DEFAULT true,
  "role" text NOT NULL DEFAULT 'user',
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);
```

### Seeding

```typescript
// src/db/seed.ts
import { db } from "./index";
import { users, posts } from "./schema";

async function seed() {
  const [alice] = await db
    .insert(users)
    .values([
      { email: "alice@example.com", name: "Alice", role: "admin" },
      { email: "bob@example.com", name: "Bob" },
    ])
    .returning();

  await db.insert(posts).values([
    { title: "Hello World", authorId: alice.id, published: true },
  ]);

  console.log("Seed complete");
  process.exit(0);
}

seed();
```

---

## Advanced Query Patterns

### Pagination

```typescript
// Offset pagination
async function getUsers(page: number, pageSize = 20) {
  const [data, [{ count }]] = await Promise.all([
    db
      .select()
      .from(users)
      .orderBy(asc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db.select({ count: count() }).from(users),
  ]);

  return {
    data,
    total: Number(count),
    pages: Math.ceil(Number(count) / pageSize),
  };
}

// Cursor pagination (better for large datasets)
async function getUsersCursor(cursor?: string, limit = 20) {
  return db
    .select()
    .from(users)
    .where(cursor ? gt(users.id, cursor) : undefined)
    .orderBy(asc(users.id))
    .limit(limit);
}
```

### Transactions

```typescript
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: "charlie@example.com", name: "Charlie" })
    .returning();

  await tx.insert(posts).values({
    title: "Charlie's First Post",
    authorId: user.id,
  });

  // Any error here rolls back both inserts
});
```

### Raw SQL (when you need it)

```typescript
import { sql } from "drizzle-orm";

// Execute raw SQL
const result = await db.execute(
  sql`SELECT * FROM users WHERE to_tsvector(name) @@ plainto_tsquery(${searchTerm})`
);

// Use SQL in queries
const usersWithScore = await db
  .select({
    id: users.id,
    name: users.name,
    score: sql<number>`(SELECT COUNT(*) FROM ${posts} WHERE ${posts.authorId} = ${users.id})`,
  })
  .from(users);
```

---

## Drizzle Studio

Run `npx drizzle-kit studio` to open a browser-based database admin UI at `https://local.drizzle.studio`:

- Browse tables with pagination
- Filter, sort, and edit rows inline
- View the SQL for any query
- Execute arbitrary SQL
- Schema explorer

This replaces TablePlus or pgAdmin for day-to-day development.

---

## Drizzle vs Prisma: When to Choose Each

| Concern | Drizzle | Prisma |
|---------|---------|--------|
| Bundle size | ~50KB | ~3MB (with engine) |
| Cold starts | Excellent | Slower |
| SQL control | Full | Limited |
| Type safety | Excellent | Excellent |
| Schema language | TypeScript | Prisma SDL |
| Migrations | Good | Excellent |
| Query complexity | Complex joins are easy | Relations API can be limiting |
| Ecosystem | Growing | Mature |
| Prisma Studio | Drizzle Studio | Prisma Studio |
| Edge runtime | Full support | Limited (Accelerate needed) |

**Choose Drizzle when**:
- Deploying to serverless (Vercel, AWS Lambda) or edge (Cloudflare Workers)
- You want SQL control without sacrificing TypeScript types
- Bundle size matters (library bundled for the client)
- You're comfortable with SQL concepts

**Choose Prisma when**:
- Your team isn't comfortable with SQL
- You want the most mature migrations tooling
- You use Prisma Accelerate or Prisma Pulse (realtime)
- You need the widest tutorial coverage for onboarding

---

## Drizzle with Next.js App Router

```typescript
// src/app/api/users/route.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const result = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
    })
    .from(users)
    .where(role ? eq(users.role, role as "admin" | "user" | "guest") : undefined)
    .orderBy(users.name);

  return Response.json(result);
}

// src/app/users/page.tsx (Server Component)
import { db } from "@/db";
import { users } from "@/db/schema";

export default async function UsersPage() {
  const allUsers = await db
    .select()
    .from(users)
    .where(eq(users.active, true))
    .limit(50);

  return (
    <ul>
      {allUsers.map((user) => (
        <li key={user.id}>{user.name} — {user.email}</li>
      ))}
    </ul>
  );
}
```

---

## Conclusion

Drizzle ORM wins on the metrics that matter for 2026 deployment patterns: small bundle, fast cold starts, no binary dependencies, and full SQL power with complete TypeScript inference. It's not hiding the database — it's making the database accessible from TypeScript.

For new serverless/edge projects, Drizzle is the default. For applications where the team wants maximum abstraction and the widest onboarding resources, Prisma remains excellent. But the trend is clear: as developers grow more comfortable with SQL and deploy to edge environments, Drizzle's philosophy of "SQL, but TypeScript" wins.

**Related tools on DevPlaybook:**
- [SQL Query Formatter](/tools/sql-formatter) — format and beautify SQL queries
- [Database Schema Visualizer](/tools/db-schema-visualizer) — visualize your database schema
- [PostgreSQL Connection String Builder](/tools/postgres-connection-builder) — build and test connection strings
