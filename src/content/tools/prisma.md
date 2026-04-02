---
title: "Prisma ORM — Next-Generation Node.js & TypeScript ORM"
description: "Prisma is the most popular TypeScript ORM for Node.js. It features a declarative schema language, auto-generated type-safe client, powerful migrations, and integrates with PostgreSQL, MySQL, SQLite, MongoDB, and more."
category: "Database"
pricing: "Free / Open Source"
pricingDetail: "Prisma ORM is free and open-source (Apache 2.0). Prisma Data Platform (cloud) has a free tier with paid plans for additional features."
website: "https://www.prisma.io"
github: "https://github.com/prisma/prisma"
tags: ["database", "orm", "typescript", "nodejs", "postgresql", "mysql", "sqlite", "mongodb"]
pros:
  - "Auto-generated type-safe client: schema changes instantly reflect in TypeScript types"
  - "Prisma Studio: visual database browser and editor"
  - "Excellent DX: intuitive API, great documentation, active community"
  - "Migrations: declarative schema with auto-generated SQL migration files"
  - "Multi-database support: PostgreSQL, MySQL, SQLite, MongoDB, SQL Server, CockroachDB"
cons:
  - "Performance overhead vs raw SQL for complex queries"
  - "Generated queries can be inefficient for complex joins"
  - "Schema file is Prisma-specific (not standard SQL/TypeScript)"
  - "Bundle size (important for edge/serverless deployments)"
date: "2026-04-02"
---

## What is Prisma?

Prisma is a next-generation ORM for Node.js and TypeScript. Unlike traditional ORMs that are class-based with decorators, Prisma uses a dedicated schema language to define your data model, then auto-generates a fully type-safe client library.

The result: database queries that are autocompleted in your IDE, catch type mismatches at compile time, and feel like first-class TypeScript rather than SQL-as-strings.

## Quick Start

```bash
# Install Prisma
npm install prisma @prisma/client
npx prisma init

# This creates:
# prisma/schema.prisma  (your schema)
# .env                  (DATABASE_URL)
```

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  posts     Post[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  createdAt DateTime @default(now())
}
```

```bash
# Run migrations
npx prisma migrate dev --name init

# Generate client
npx prisma generate
```

## Type-Safe Queries

```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// CREATE
const user = await prisma.user.create({
  data: {
    email: 'alice@example.com',
    name: 'Alice',
    posts: {
      create: {
        title: 'Hello World',
        content: 'My first post',
      },
    },
  },
  include: { posts: true },
});

// READ with filtering
const publishedPosts = await prisma.post.findMany({
  where: {
    published: true,
    author: { email: { endsWith: '@example.com' } },
  },
  include: { author: true },
  orderBy: { createdAt: 'desc' },
  take: 10,
  skip: 0,
});

// UPDATE
const updated = await prisma.user.update({
  where: { email: 'alice@example.com' },
  data: { name: 'Alice Smith' },
});

// DELETE
await prisma.user.delete({ where: { id: 1 } });

// Transactions
const result = await prisma.$transaction([
  prisma.post.create({ data: { title: 'Post 1', authorId: 1 } }),
  prisma.post.create({ data: { title: 'Post 2', authorId: 1 } }),
]);
```

## Migrations

```bash
# Create and apply migration
npx prisma migrate dev --name add_bio_to_user

# Deploy to production
npx prisma migrate deploy

# Reset development database
npx prisma migrate reset

# View migration history
npx prisma migrate status
```

## Prisma Studio

```bash
# Open visual database browser
npx prisma studio
# Opens at http://localhost:5555
```

## Performance: Raw SQL When Needed

```typescript
// Escape hatch for raw SQL
const users = await prisma.$queryRaw<User[]>`
  SELECT * FROM "User"
  WHERE email LIKE ${`%${domain}`}
  ORDER BY "createdAt" DESC
`;

// Execute raw SQL without return
await prisma.$executeRaw`
  UPDATE "Post" SET published = true
  WHERE "authorId" = ${userId}
`;
```
