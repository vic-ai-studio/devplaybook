---
title: "Drizzle ORM — Lightweight TypeScript ORM for Edge & Serverless"
description: "Drizzle ORM is the TypeScript ORM designed for serverless and edge environments. Schema-as-TypeScript, SQL-like query API, zero dependencies, and 40KB bundle — the fastest-growing ORM in 2026."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Drizzle ORM is 100% free and open-source (Apache 2.0). Drizzle Studio is free."
website: "https://orm.drizzle.team"
github: "https://github.com/drizzle-team/drizzle-orm"
tags: ["database", "orm", "typescript", "edge", "serverless", "postgresql", "sqlite", "mysql"]
pros:
  - "Schema-as-TypeScript: no separate schema file — define tables as TypeScript objects"
  - "Edge-compatible: tiny bundle (40KB), runs on Cloudflare Workers, Deno, Bun"
  - "SQL-like API: if you know SQL, you know Drizzle"
  - "Zero dependencies: no native modules, works everywhere"
  - "Drizzle Kit: migrations and schema introspection"
cons:
  - "Less mature ecosystem than Prisma (fewer third-party tools)"
  - "No built-in Prisma Studio equivalent (Drizzle Studio is newer)"
  - "Some advanced PostgreSQL features require raw SQL"
  - "Learning curve if coming from active record style ORMs"
date: "2026-04-02"
---

## What is Drizzle ORM?

Drizzle ORM has risen to challenge Prisma's dominance in 2024–2026 with a different philosophy: define your schema in TypeScript, write SQL-like queries with full type safety, and deploy anywhere (including edge runtimes that can't run Prisma).

Drizzle is now the default ORM recommendation for Cloudflare Workers, Deno Deploy, and other edge environments.

## Quick Start

```bash
npm install drizzle-orm
npm install -D drizzle-kit

# For PostgreSQL
npm install postgres
# Or for SQLite (Cloudflare D1, Bun, etc.)
# npm install @libsql/client (Turso)
```

## Schema Definition

```typescript
// src/db/schema.ts
import { pgTable, serial, text, varchar, boolean, timestamp, integer } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 256 }).unique().notNull(),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content'),
  published: boolean('published').default(false).notNull(),
  authorId: integer('author_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Define relations for joins
export const usersRelations = relations(users, ({ many }) => ({
  posts: many(posts),
}));

export const postsRelations = relations(posts, ({ one }) => ({
  author: one(users, { fields: [posts.authorId], references: [users.id] }),
}));
```

## Queries

```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { users, posts } from './schema';
import { eq, and, desc, like, count } from 'drizzle-orm';

const sql = postgres(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema: { users, posts } });

// SELECT
const allUsers = await db.select().from(users);

// SELECT with WHERE
const activeUsers = await db
  .select()
  .from(users)
  .where(like(users.email, '%@gmail.com'));

// JOIN
const usersWithPosts = await db
  .select({
    userId: users.id,
    userName: users.name,
    postTitle: posts.title,
  })
  .from(users)
  .leftJoin(posts, eq(posts.authorId, users.id))
  .where(eq(posts.published, true))
  .orderBy(desc(posts.createdAt))
  .limit(10);

// INSERT
const newUser = await db
  .insert(users)
  .values({ email: 'bob@example.com', name: 'Bob' })
  .returning();

// UPDATE
await db
  .update(posts)
  .set({ published: true })
  .where(eq(posts.authorId, 1));

// DELETE
await db.delete(users).where(eq(users.id, 5));

// Transactions
await db.transaction(async (tx) => {
  const [user] = await tx
    .insert(users)
    .values({ email: 'charlie@example.com' })
    .returning();

  await tx.insert(posts).values({
    title: 'First Post',
    authorId: user.id,
  });
});
```

## Relational Queries (Type-Safe JOINs)

```typescript
// Using Drizzle's relational API
const usersWithPosts = await db.query.users.findMany({
  with: {
    posts: {
      where: eq(posts.published, true),
      orderBy: [desc(posts.createdAt)],
    },
  },
  where: like(users.email, '%@company.com'),
});
// Returns: User & { posts: Post[] }[]
```

## SQLite for Cloudflare D1

```typescript
// Cloudflare D1 integration
import { drizzle } from 'drizzle-orm/d1';
import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
});

// In Cloudflare Worker
export default {
  async fetch(request: Request, env: { DB: D1Database }) {
    const db = drizzle(env.DB);
    const allUsers = await db.select().from(users);
    return Response.json(allUsers);
  },
};
```

## Migrations with Drizzle Kit

```bash
# drizzle.config.ts
export default {
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL! },
};

# Generate migration files
npx drizzle-kit generate

# Apply migrations
npx drizzle-kit migrate

# Push schema directly (dev only)
npx drizzle-kit push

# Open Drizzle Studio
npx drizzle-kit studio
```

Drizzle is the right ORM for edge deployments, performance-sensitive applications, and teams that prefer thinking in SQL rather than an ORM abstraction.
