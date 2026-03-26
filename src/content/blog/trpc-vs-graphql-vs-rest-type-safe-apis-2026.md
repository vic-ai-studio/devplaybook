---
title: "tRPC vs GraphQL vs REST: Type-Safe APIs in 2026"
description: "Compare tRPC, GraphQL, and REST for building type-safe APIs in 2026. Covers DX, performance, bundle size, schema management, and when to use each approach."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["trpc", "graphql", "rest", "api", "typescript", "type-safety", "web-development"]
readingTime: "15 min read"
---

Choosing an API layer in 2026 still generates more debate than it should. REST is everywhere but verbose. GraphQL solves real problems and introduces new ones. tRPC feels like cheating — until you hit its limits. This article gives you a direct comparison so you can pick the right tool for the job, not just the one with the best marketing.

## REST: Still the Baseline

REST (Representational State Transfer) is not an old technology — it is the default expectation. Every HTTP client in every language speaks it. Public APIs, third-party integrations, mobile apps, and serverless functions all default to REST. That ubiquity is its primary advantage.

A typical REST endpoint in Express with TypeScript looks like this:

```typescript
// server: routes/users.ts
import { Router, Request, Response } from 'express';
import { z } from 'zod';

const router = Router();

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  createdAt: z.date(),
});

type User = z.infer<typeof UserSchema>;

router.get('/users/:id', async (req: Request, res: Response) => {
  const user = await db.user.findUnique({ where: { id: req.params.id } });
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

router.post('/users', async (req: Request, res: Response) => {
  const parsed = UserSchema.omit({ id: true, createdAt: true }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });
  const user = await db.user.create({ data: parsed.data });
  return res.status(201).json(user);
});

export default router;
```

```typescript
// client: api/users.ts
async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) throw new Error('Failed to fetch user');
  return res.json() as Promise<User>; // manual cast — no guarantee
}
```

The problem is that last line. `res.json() as Promise<User>` is a lie the compiler believes. The server can return anything — a renamed field, a missing property, a changed type — and the client will not know until runtime. The type annotation is wishful thinking, not a contract.

Solving this in REST requires extra tooling: OpenAPI spec generation, client code generation from those specs, keeping the spec in sync with the actual implementation, and disciplined CI enforcement. It is absolutely doable — and many teams do it well — but it is friction that must be managed continuously.

**REST strengths:**
- Universal client compatibility
- HTTP caching works natively (GET requests)
- Stateless, horizontally scalable
- Simple mental model
- No special client library required

**REST pain points:**
- No built-in type contract between client and server
- Over-fetching and under-fetching are common
- Multiple roundtrips for related data
- Versioning strategies vary and none are painless

---

## GraphQL: Powerful Schema, Real Tradeoffs

GraphQL solves the over-fetching and under-fetching problems REST creates. Clients declare exactly what data they need, and the server fulfills that shape. This is genuinely valuable in large applications with many different client types — mobile apps that need lean payloads, dashboards that need rich nested data, public APIs used by unknown consumers.

A GraphQL schema and resolver setup in TypeScript:

```typescript
// server: schema.ts
import { makeExecutableSchema } from '@graphql-tools/schema';
import { GraphQLContext } from './context';

const typeDefs = `
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]!
  }

  type Post {
    id: ID!
    title: String!
    body: String!
    author: User!
  }

  type Query {
    user(id: ID!): User
    posts(authorId: ID!): [Post!]!
  }

  type Mutation {
    createUser(name: String!, email: String!): User!
  }
`;

const resolvers = {
  Query: {
    user: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      return ctx.db.user.findUnique({ where: { id } });
    },
    posts: async (_: unknown, { authorId }: { authorId: string }, ctx: GraphQLContext) => {
      return ctx.db.post.findMany({ where: { authorId } });
    },
  },
  Mutation: {
    createUser: async (_: unknown, args: { name: string; email: string }, ctx: GraphQLContext) => {
      return ctx.db.user.create({ data: args });
    },
  },
  User: {
    posts: async (parent: { id: string }, _: unknown, ctx: GraphQLContext) => {
      return ctx.db.post.findMany({ where: { authorId: parent.id } });
    },
  },
};

export const schema = makeExecutableSchema({ typeDefs, resolvers });
```

```typescript
// client: queries/user.ts (with graphql-request)
import { gql, GraphQLClient } from 'graphql-request';

const client = new GraphQLClient('/api/graphql');

const GET_USER = gql`
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
      posts {
        id
        title
      }
    }
  }
`;

// With codegen, this type is auto-generated from the schema
type GetUserQuery = {
  user: {
    id: string;
    name: string;
    email: string;
    posts: { id: string; title: string }[];
  } | null;
};

async function getUser(id: string) {
  return client.request<GetUserQuery>(GET_USER, { id });
}
```

The type safety in GraphQL depends on codegen tools like `@graphql-codegen/cli`. When set up correctly, every query and mutation gets generated TypeScript types that match the schema. It is good, but it requires a build step, a codegen config, and types that go stale if you forget to regenerate.

The N+1 problem is the classic GraphQL trap. The `User.posts` resolver above fires once per user returned. Fetch ten users and you get eleven database queries. DataLoader solves this, but it is an additional abstraction you must implement correctly.

**GraphQL strengths:**
- Declarative data fetching — clients request exactly what they need
- Single endpoint, strong schema contract
- Excellent for public or multi-client APIs
- Introspection enables tooling like GraphiQL and Playground
- Schema-first design encourages thinking about data shape upfront

**GraphQL pain points:**
- Setup overhead is substantial (schema, resolvers, codegen, DataLoader)
- N+1 query problem requires DataLoader or query analysis
- HTTP caching breaks by default (POST requests, dynamic query strings)
- Bundle size: graphql package alone is ~17KB gzipped
- Overkill for internal, monorepo, fullstack TypeScript apps
- Persisted queries needed for production caching

---

## tRPC: End-to-End Type Safety Without a Schema

tRPC takes a different approach entirely. Instead of a schema language, it uses TypeScript itself as the contract. The server defines procedures with Zod validation and inferred types. The client imports those types directly — not copies, not generated code, the actual inferred types from the server. If the server changes, the client breaks at compile time.

This only works when client and server share a codebase (or at least share types via a package). That constraint is also tRPC's superpower: for fullstack TypeScript monorepos, it eliminates an entire category of runtime errors.

```typescript
// server: router/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.user.findUnique({
        where: { id: input.id },
        include: { posts: { select: { id: true, title: true } } },
      });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return user;
    }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(100),
      email: z.string().email(),
    }))
    .mutation(async ({ input, ctx }) => {
      return ctx.db.user.create({ data: input });
    }),

  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const users = await ctx.db.user.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });
      const nextCursor = users.length > input.limit ? users.pop()!.id : undefined;
      return { users, nextCursor };
    }),
});
```

```typescript
// server: root router
import { router } from '../trpc';
import { userRouter } from './user';
import { postRouter } from './post';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
});

export type AppRouter = typeof appRouter; // this is the contract
```

```typescript
// client: any component or hook
import { trpc } from '../utils/trpc';

function UserProfile({ userId }: { userId: string }) {
  // fully typed — input, output, and error
  const { data, isLoading, error } = trpc.user.getById.useQuery({ id: userId });

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      // data is inferred from the router
      trpc.useContext().user.list.invalidate();
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  // data.name, data.email, data.posts — all fully typed from Prisma + Zod
  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
      {data.posts.map(post => (
        <div key={post.id}>{post.title}</div>
      ))}
    </div>
  );
}
```

No code generation. No schema file. No manual type casts. The type flows from Prisma model definition through Zod validation through the router return type into the React component. Rename a field on the server and every client usage breaks immediately in your editor.

### tRPC in the T3 Stack

The T3 stack (Next.js + tRPC + Prisma + Tailwind + NextAuth) has popularized this pattern. `create-t3-app` scaffolds the full setup in under a minute. The tRPC integration with Next.js uses API routes under the hood, so deployment is standard Next.js — no separate server process.

```typescript
// pages/api/trpc/[trpc].ts (Next.js Pages Router)
import { createNextApiHandler } from '@trpc/server/adapters/next';
import { appRouter } from '../../../server/router';
import { createContext } from '../../../server/context';

export default createNextApiHandler({
  router: appRouter,
  createContext,
  onError: process.env.NODE_ENV === 'development'
    ? ({ error }) => console.error('tRPC error:', error)
    : undefined,
});
```

The App Router integration uses the `fetchRequestHandler`:

```typescript
// app/api/trpc/[trpc]/route.ts (Next.js App Router)
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../../../server/router';
import { createContext } from '../../../../server/context';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext,
  });

export { handler as GET, handler as POST };
```

**tRPC strengths:**
- Zero-overhead type safety — no codegen, no schema drift
- Excellent DX in TypeScript monorepos
- React Query integration built-in (caching, invalidation, optimistic updates)
- Smaller bundle than GraphQL client libraries
- First-class Next.js, Remix, and SvelteKit support

**tRPC pain points:**
- TypeScript-only — no client support for other languages
- Requires shared codebase (monorepo or published types package)
- Not suitable for public APIs consumed by unknown clients
- Less mature tooling for API documentation
- Debugging network requests is harder (no GraphiQL equivalent)

---

## Performance Comparison

| Dimension | REST | GraphQL | tRPC |
|-----------|------|---------|------|
| Network payload | Fixed per endpoint | Client-controlled | Fixed per procedure |
| HTTP caching | Native (GET) | Requires persisted queries | Native via React Query |
| N+1 queries | Manual joins/eager load | DataLoader required | Manual joins/eager load |
| Cold start | Minimal | Schema parsing overhead | Minimal |
| Bundle size (client) | 0 KB (native fetch) | ~17KB (graphql) + client | ~12KB (@trpc/client + React Query) |
| Request batching | Manual | Automatic (Apollo) | Automatic (built-in) |

For most applications, the performance differences are negligible compared to database query time. The real performance conversation is about developer velocity and correctness — bugs caught at compile time are cheaper than bugs caught in production.

---

## When to Use Each

**Choose REST when:**
- Building a public API consumed by clients you do not control
- Your team is polyglot (Go backend, Python scripts, mobile apps)
- You need maximum HTTP caching without extra configuration
- Integrating with third-party systems that expect REST
- The team has no TypeScript expertise

**Choose GraphQL when:**
- Multiple clients (mobile, web, third-party) need different data shapes
- You have a complex, highly connected data model
- You are building a public API and want strong schema documentation
- Data requirements vary dramatically across consumers
- You are willing to invest in the tooling setup (DataLoader, codegen, persisted queries)

**Choose tRPC when:**
- You are building a fullstack TypeScript application in a monorepo
- Developer experience and type safety are top priorities
- You are using Next.js, Remix, or SvelteKit with a shared backend
- You want React Query's caching without manual type maintenance
- Your API is internal — not consumed by external clients

---

## Migration Paths

### REST to tRPC
The easiest migration. Keep your existing database layer and business logic. Replace Express route handlers with tRPC procedures one by one. The Zod validation you add is often more robust than what you had before.

```typescript
// Before: Express route
router.post('/users', async (req, res) => {
  if (!req.body.name || !req.body.email) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const user = await db.user.create({ data: req.body });
  return res.json(user);
});

// After: tRPC procedure
create: publicProcedure
  .input(z.object({ name: z.string().min(1), email: z.string().email() }))
  .mutation(({ input, ctx }) => ctx.db.user.create({ data: input })),
```

### GraphQL to tRPC
More involved. GraphQL resolvers map reasonably well to tRPC procedures. The main work is removing the schema definition language and replacing it with Zod validators. DataLoader patterns can be simplified since you control the exact queries made per procedure.

### tRPC to GraphQL
If your application grows to require a public API or multiple heterogeneous clients, tRPC can coexist with a GraphQL layer. Some teams run tRPC internally and expose a GraphQL API externally, using the tRPC router as the data layer beneath GraphQL resolvers.

---

## Decision Matrix for 2026

```
Is your API public or consumed by non-TypeScript clients?
  YES → REST or GraphQL
    Do clients need very different data shapes?
      YES → GraphQL
      NO  → REST

Is this a fullstack TypeScript monorepo?
  YES → tRPC (strong default)
    Do you need a public API surface alongside internal use?
      YES → tRPC internally + REST or GraphQL externally
      NO  → tRPC only

Are you building with the T3 stack?
  YES → tRPC (already included)

Is your team unfamiliar with TypeScript?
  YES → REST
```

---

## Conclusion

REST remains the right choice for public APIs, polyglot teams, and anywhere HTTP caching matters out of the box. GraphQL earns its complexity when you have genuinely heterogeneous data consumers or a public API that benefits from schema introspection. tRPC is the correct default for fullstack TypeScript applications where type safety and developer experience matter more than external API compatibility.

The T3 stack has made tRPC the default for new Next.js projects, and for good reason. The zero-codegen type safety is difficult to give up once you have experienced it. But understanding REST fundamentals and knowing when GraphQL's tradeoffs pay off remains essential — not every API lives in a TypeScript monorepo, and not every team should.

Pick the tool that fits your actual constraints, not the one that won the most conference talks.
