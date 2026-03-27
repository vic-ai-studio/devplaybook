---
title: "PocketBase vs Appwrite vs Directus vs Payload: Open Source Backend 2026"
description: "A deep comparison of PocketBase, Appwrite, Directus, and Payload CMS as open-source backends in 2026 — authentication, database, file storage, APIs, self-hosting, scaling, and which backend to choose for your next project."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["pocketbase", "appwrite", "directus", "payload", "backend", "open-source", "self-hosted", "baas", "cms", "authentication"]
readingTime: "17 min read"
---

Backend-as-a-Service changed how developers build apps. Firebase showed that a single SDK could replace weeks of backend work. But Firebase lock-in, pricing at scale, and data sovereignty concerns pushed developers toward open-source alternatives. In 2026, four tools dominate this space: **PocketBase**, **Appwrite**, **Directus**, and **Payload CMS**.

They're not all direct competitors — they solve overlapping but distinct problems. This guide maps out exactly what each tool is good at, where each struggles, and which one fits your use case.

---

## Quick Comparison: At a Glance

| | **PocketBase** | **Appwrite** | **Directus** | **Payload CMS** |
|---|---|---|---|---|
| **Primary use case** | Rapid prototyping, small apps | Firebase replacement | Headless CMS + API | Headless CMS + typed API |
| **Language** | Go | PHP + Go (microservices) | Node.js | Node.js / TypeScript |
| **Database** | SQLite (built-in) | MariaDB / PostgreSQL | PostgreSQL, MySQL, SQLite, MSSQL | MongoDB or PostgreSQL |
| **Setup complexity** | One binary | Docker compose | Docker compose | npm + config |
| **Admin UI** | ✅ Built-in | ✅ Built-in | ✅ Built-in | ✅ Built-in |
| **Auth** | ✅ Email, OAuth, MFA | ✅ Email, OAuth, phone, MFA | ✅ Email, OAuth, SSO | ✅ Email, OAuth, API keys |
| **File storage** | ✅ Local / S3 | ✅ Local, S3, GCS, Azure | ✅ Local, S3, GCS, Azure | ✅ Local, S3 |
| **Real-time** | ✅ SSE subscriptions | ✅ WebSocket events | ⚠️ Webhooks only | ⚠️ Webhooks only |
| **REST API** | ✅ Auto-generated | ✅ Auto-generated | ✅ Auto-generated | ✅ Auto-generated |
| **GraphQL** | ❌ | ❌ | ✅ | ✅ (via plugin) |
| **TypeScript SDK** | ✅ | ✅ | ✅ | ✅ (first-class) |
| **Scaling** | Limited (SQLite) | Good (cloud option) | Excellent | Good |
| **Cloud hosted** | ❌ (self-hosted only) | ✅ Appwrite Cloud | ✅ Directus Cloud | ✅ Payload Cloud |
| **License** | MIT | BSD-3 | GPL-3 (core) / BSL | MIT |
| **GitHub Stars (2026)** | ~38k | ~45k | ~28k | ~30k |

---

## PocketBase

### What It Is

PocketBase is a single Go binary that gives you a complete backend: SQLite database, REST API, authentication, file storage, and an admin dashboard. Download one file, run it, done.

```bash
# That's the entire installation
./pocketbase serve
# → Admin UI: http://127.0.0.1:8090/_/
# → API: http://127.0.0.1:8090/api/
```

This simplicity is both PocketBase's greatest strength and its biggest limitation.

### Authentication

```typescript
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");

// Email + password
const authData = await pb.collection("users").authWithPassword(
  "user@example.com",
  "1234567890"
);

// OAuth2 (GitHub, Google, etc.)
const authData2 = await pb.collection("users").authWithOAuth2({ provider: "github" });

// Check auth state
pb.authStore.isValid; // true
pb.authStore.token;   // JWT token
pb.authStore.record;  // user record
```

### Database & Collections

PocketBase uses SQLite through a collection abstraction. Collections are like tables, created through the admin UI or API:

```typescript
// CRUD operations
const records = await pb.collection("posts").getList(1, 20, {
  filter: 'status = "published" && author = "author_id"',
  sort: "-created",
  expand: "author,category"
});

const record = await pb.collection("posts").create({
  title: "Hello World",
  content: "...",
  author: pb.authStore.record.id,
  status: "published"
});

await pb.collection("posts").update(record.id, { title: "Updated" });
await pb.collection("posts").delete(record.id);
```

### Real-Time Subscriptions

```typescript
// Subscribe to all changes in a collection
pb.collection("posts").subscribe("*", (e) => {
  console.log(e.action); // "create" | "update" | "delete"
  console.log(e.record); // the record that changed
});

// Subscribe to specific record
pb.collection("posts").subscribe("record_id", (e) => {
  console.log("Post updated:", e.record);
});
```

### Extending with Go

You can extend PocketBase with custom logic:

```go
package main

import (
  "github.com/pocketbase/pocketbase"
  "github.com/pocketbase/pocketbase/core"
)

func main() {
  app := pocketbase.New()

  app.OnRecordCreate("posts").Add(func(e *core.RecordEvent) error {
    // Before a post is created
    e.Record.Set("slug", generateSlug(e.Record.GetString("title")))
    return e.Next()
  })

  app.Start()
}
```

### PocketBase Limitations

- **SQLite only** — not suitable for high write concurrency or very large datasets
- **No horizontal scaling** — one instance, one machine
- **No official cloud** — you manage your own hosting
- **Limited query capabilities** — complex aggregations require raw SQL or external processing
- **No GraphQL** — REST only

**Best for:** Personal projects, internal tools, MVPs, apps with <100k users.

---

## Appwrite

### What It Is

Appwrite is the closest open-source Firebase alternative. It runs as a Docker compose stack and provides SDKs for every platform: web, iOS, Android, Flutter, React Native.

```yaml
# docker-compose.yml (simplified)
version: "3"
services:
  appwrite:
    image: appwrite/appwrite:1.6
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - appwrite-uploads:/storage/uploads
    depends_on:
      - mariadb
      - redis

  mariadb:
    image: mariadb:10.7
  redis:
    image: redis:7-alpine
```

### Authentication

Appwrite's auth is the most complete of the four options:

```typescript
import { Client, Account } from "appwrite";

const client = new Client()
  .setEndpoint("https://api.example.com/v1")
  .setProject("your-project-id");

const account = new Account(client);

// Email + password
await account.create("unique()", "user@example.com", "password123", "Full Name");
await account.createEmailPasswordSession("user@example.com", "password123");

// Phone (OTP)
const token = await account.createPhoneToken("unique()", "+12065550100");
await account.updatePhoneSession(token.userId, "123456");

// Magic link
await account.createMagicURLToken("unique()", "user@example.com");

// OAuth2
account.createOAuth2Session("github", "https://myapp.com/success");

// MFA
await account.createMfaAuthenticator("totp");
```

### Database

Appwrite uses MariaDB under the hood but presents it as a document-style API with collections and documents:

```typescript
import { Databases, ID, Query } from "appwrite";

const databases = new Databases(client);

// Create document
const doc = await databases.createDocument("db_id", "collection_id", ID.unique(), {
  title: "My Post",
  content: "...",
  userId: user.$id
});

// Query with filters
const posts = await databases.listDocuments("db_id", "posts", [
  Query.equal("userId", user.$id),
  Query.orderDesc("$createdAt"),
  Query.limit(20)
]);
```

### Storage and Functions

```typescript
import { Storage, Functions } from "appwrite";

const storage = new Storage(client);
const file = await storage.createFile("bucket_id", ID.unique(), document.getElementById("file").files[0]);

// Serverless functions
const functions = new Functions(client);
const execution = await functions.createExecution("function_id", JSON.stringify({ userId: "123" }));
```

### Appwrite Cloud

Unlike PocketBase, Appwrite offers a managed cloud service. The free tier gives you 75,000 monthly active users, 2GB storage, and 750,000 function executions. Paid plans start at $15/month.

**Best for:** Mobile apps, consumer apps with many users, teams that want Firebase features without vendor lock-in.

---

## Directus

### What It Is

Directus is a headless CMS and data platform that wraps around an existing SQL database. You bring your database schema — PostgreSQL, MySQL, SQLite, SQL Server — and Directus gives you a REST/GraphQL API and admin dashboard automatically.

This is fundamentally different from PocketBase and Appwrite. Directus doesn't own your data model — it reflects it.

```bash
npm init directus-project@latest my-project
cd my-project
npx directus start
```

### Data Modeling

In Directus, you work with your existing database tables or create them through the admin UI. The data model is directly your SQL schema:

```sql
-- Your actual database tables
CREATE TABLE articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  content TEXT,
  status VARCHAR(50) DEFAULT 'draft',
  author UUID REFERENCES directus_users(id),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Directus discovers these tables and exposes them through its API.

### REST and GraphQL APIs

```typescript
import { createDirectus, rest, graphql } from "@directus/sdk";

const client = createDirectus("http://localhost:8055")
  .with(rest())
  .with(graphql());

// REST
const articles = await client.request(
  readItems("articles", {
    filter: { status: { _eq: "published" } },
    sort: ["-published_at"],
    limit: 20,
    fields: ["id", "title", "status", { author: ["name", "email"] }]
  })
);

// GraphQL
const { articles } = await client.query(`
  query {
    articles(
      filter: { status: { _eq: "published" } }
      sort: ["-published_at"]
      limit: 20
    ) {
      id
      title
      author {
        name
        email
      }
    }
  }
`);
```

### Permissions (Fine-Grained)

Directus has the most sophisticated permission system of the four:

```typescript
// Permissions are field-level, not just collection-level
// In admin UI or via API:
{
  "collection": "articles",
  "action": "read",
  "role": "authenticated",
  "fields": ["id", "title", "content"],  // only these fields
  "filter": {
    "status": { "_eq": "published" },
    "author": { "_eq": "$CURRENT_USER" }  // can only read own unpublished
  }
}
```

### Directus Flows (Automation)

```json
{
  "name": "Send email on article publish",
  "trigger": {
    "type": "event",
    "options": {
      "collection": "articles",
      "event": "items.update",
      "fields": ["status"]
    }
  },
  "operations": [
    {
      "type": "condition",
      "condition": "{{ payload.status === 'published' }}"
    },
    {
      "type": "mail",
      "to": "{{ item.author.email }}",
      "subject": "Your article is live!"
    }
  ]
}
```

### Directus Limitations

- **Complex setup** for non-database-savvy teams
- **No built-in real-time** — webhooks only (websocket in enterprise)
- **Heavier** than PocketBase
- **GPL-3 license** on core — commercial use requires review (or self-host)

**Best for:** Teams with existing databases, content-heavy applications, projects needing strong GraphQL support, editorial workflows.

---

## Payload CMS

### What It Is

Payload is a TypeScript-first headless CMS built with code-as-configuration. Unlike Directus (database-first) and Appwrite (app-first), Payload is config-file-first: you define your content schema in TypeScript and Payload generates the database schema, admin UI, and REST/GraphQL API.

```typescript
// payload.config.ts
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";

export default buildConfig({
  serverURL: "http://localhost:3000",
  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URI }
  }),
  collections: [
    {
      slug: "articles",
      admin: {
        useAsTitle: "title"
      },
      fields: [
        { name: "title", type: "text", required: true },
        { name: "content", type: "richText" },
        {
          name: "status",
          type: "select",
          options: ["draft", "published"],
          defaultValue: "draft"
        },
        {
          name: "author",
          type: "relationship",
          relationTo: "users"
        }
      ]
    }
  ]
});
```

### Type Safety

Payload generates TypeScript types from your config, giving you end-to-end type safety:

```typescript
import payload from "payload";
import type { Article } from "../payload-types"; // auto-generated

// Fully typed — no runtime type errors
const articles = await payload.find({
  collection: "articles",
  where: {
    status: { equals: "published" }
  }
});

// articles.docs is Article[]
const firstArticle: Article = articles.docs[0];
console.log(firstArticle.title); // TypeScript knows this is string
```

### Local API vs REST vs GraphQL

```typescript
// Local API (server-to-server, zero HTTP overhead)
const articles = await payload.find({ collection: "articles" });

// REST API
GET /api/articles?where[status][equals]=published

// GraphQL
query {
  Articles(where: { status: { equals: published } }) {
    docs {
      id
      title
      author {
        name
      }
    }
  }
}
```

### Hooks System

```typescript
// payload.config.ts — lifecycle hooks
{
  slug: "articles",
  hooks: {
    beforeChange: [
      async ({ data, req, operation }) => {
        if (operation === "create") {
          data.slug = generateSlug(data.title);
          data.author = req.user.id;
        }
        return data;
      }
    ],
    afterChange: [
      async ({ doc, operation }) => {
        if (operation === "create" || doc.status === "published") {
          await revalidatePage(`/blog/${doc.slug}`);
        }
      }
    ]
  }
}
```

### Next.js Integration

Payload has deep Next.js integration — you can run Payload inside a Next.js app:

```typescript
// app/api/[...payload]/route.ts
import { handlePayload } from "payload/next";
import config from "../../../../payload.config";

export const { GET, POST, DELETE, PATCH } = handlePayload(config);
```

This means one deployment for your frontend and backend.

### Payload Limitations

- **Node.js only** — not a standalone binary
- **Higher setup overhead** than PocketBase
- **More complex** for non-TypeScript teams
- **Real-time** requires external solution
- **Storage** — local or S3, fewer options than Appwrite

**Best for:** Content-heavy Next.js applications, editorial teams, projects where TypeScript type safety matters across the full stack.

---

## Deployment and Scaling

| | PocketBase | Appwrite | Directus | Payload |
|--|-----------|----------|---------|---------|
| Single server | ✅ Easy | ✅ Docker | ✅ Docker | ✅ Node.js |
| Cloud hosting | ❌ DIY | ✅ Appwrite Cloud | ✅ Directus Cloud | ✅ Payload Cloud |
| Horizontal scaling | ❌ SQLite limit | ✅ Stateless | ✅ | ✅ |
| Serverless | ❌ | ⚠️ | ⚠️ | ✅ (edge) |
| Kubernetes | ⚠️ | ✅ Helm charts | ✅ | ✅ |
| RAM required | ~50MB | ~500MB | ~300MB | ~200MB |

---

## When to Choose Which

### Choose PocketBase When:
- Building a **personal project, side project, or MVP**
- Want to **start in minutes** with zero Docker knowledge
- App has **predictable, moderate traffic** (under 100k users)
- Need **real-time subscriptions** out of the box
- Building with a **single developer** who manages everything

### Choose Appwrite When:
- Building a **mobile or cross-platform app** (iOS, Android, Flutter)
- Need **phone authentication** or advanced auth flows
- Want **serverless functions** co-located with your backend
- Team wants **managed cloud** without learning a new platform
- Migrating from **Firebase** and want familiar patterns

### Choose Directus When:
- Have an **existing database** you want to expose as an API
- Building **editorial/content workflows** with complex permissions
- Team is **SQL-native** and wants to keep control of the schema
- Need **GraphQL** as the primary API layer
- Managing **content across multiple channels** (websites, apps, partners)

### Choose Payload When:
- Building a **Next.js application** and want backend in the same project
- Team is **TypeScript-first** and wants end-to-end type safety
- Need a **headless CMS** with full programmatic control
- Building **rich editorial experiences** (custom blocks, nested content)
- Want **code-as-config** for versioning schema changes in Git

---

## The Verdict

These four tools represent different points on the spectrum from "simplest possible backend" to "most powerful content platform."

**PocketBase** is unbeaten for simplicity and speed to first working app. Nothing else gets you from zero to a working backend faster.

**Appwrite** is the Firebase replacement with the most complete feature set — auth, database, storage, functions, and real-time in one package.

**Directus** is the choice when your database is the source of truth and you need a powerful API and admin layer on top.

**Payload** is the best option for TypeScript teams building content-heavy Next.js apps who want the backend and frontend in one typed, versioned codebase.

Pick based on your team's existing skills and your project's primary constraint: if it's speed to prototype, PocketBase; if it's mobile SDK quality, Appwrite; if it's data control, Directus; if it's TypeScript type safety, Payload.
