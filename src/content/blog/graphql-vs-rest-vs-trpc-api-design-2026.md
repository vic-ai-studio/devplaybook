---
title: "GraphQL vs REST vs tRPC: API Design Guide for 2026"
description: "Choose the right API design in 2026. Compare GraphQL, REST, and tRPC for performance, type safety, tooling, and team size. Includes migration strategies and code examples."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["graphql", "rest-api", "trpc", "api-design", "typescript"]
readingTime: "13 min read"
---

Every API decision you make today shapes the developer experience for years. In 2026, three paradigms dominate: REST (still the majority), GraphQL (mature and widespread), and tRPC (rapidly adopted in TypeScript-first stacks). Each makes different tradeoffs, and choosing the wrong one costs teams months of productivity.

This guide gives you the information to make the right call—with honest comparisons, concrete examples, and real migration strategies.

## The Short Answer (If You're in a Hurry)

- **REST**: Public API, multiple clients, team without TypeScript expertise, microservices
- **GraphQL**: Complex data graphs, mobile clients with bandwidth constraints, federated APIs across teams
- **tRPC**: Full-stack TypeScript monorepo, internal API, team that values end-to-end type safety

Now let's go deep.

## REST in 2026: Still the Default

REST (Representational State Transfer) is not dying. It remains the dominant API design for public APIs, microservices communication, and any context where you can't control both client and server.

### Modern REST Best Practices

```typescript
// Express + Zod: type-safe REST endpoint
import express from 'express';
import { z } from 'zod';
import { validateRequest } from 'zod-express-middleware';

const router = express.Router();

const CreateUserSchema = z.object({
  body: z.object({
    email: z.string().email(),
    name: z.string().min(2).max(100),
    role: z.enum(['admin', 'user', 'readonly']).default('user'),
  }),
});

const PaginationSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    sort: z.enum(['createdAt', 'name', 'email']).default('createdAt'),
    order: z.enum(['asc', 'desc']).default('desc'),
  }),
});

// POST /users
router.post(
  '/users',
  validateRequest(CreateUserSchema),
  async (req, res) => {
    const { email, name, role } = req.body;

    const user = await userService.create({ email, name, role });

    res.status(201).json({
      data: user,
      meta: { timestamp: new Date().toISOString() },
    });
  }
);

// GET /users
router.get(
  '/users',
  validateRequest(PaginationSchema),
  async (req, res) => {
    const { page, limit, sort, order } = req.query;
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userService.findMany({ offset, limit, sort, order }),
      userService.count(),
    ]);

    res.json({
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page * limit < total,
      },
    });
  }
);
```

### REST Versioning Strategy

```typescript
// URL versioning (most explicit, easiest to deprecate)
app.use('/v1', v1Router);
app.use('/v2', v2Router);

// Or header-based versioning
app.use((req, res, next) => {
  const version = req.headers['api-version'] || 'v1';
  req.apiVersion = version;
  next();
});
```

### REST with OpenAPI: Auto-Generated Clients

The biggest modern improvement to REST is OpenAPI (Swagger) + code generation:

```yaml
# openapi.yaml
openapi: 3.1.0
info:
  title: User API
  version: 2.0.0

paths:
  /users:
    post:
      summary: Create a user
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
      responses:
        '201':
          description: User created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserResponse'
```

```bash
# Generate TypeScript client from OpenAPI spec
npx openapi-typescript-codegen \
  --input ./openapi.yaml \
  --output ./src/generated/api-client \
  --client axios
```

This gives you type-safe API clients without writing a single line of client code—a capability gap that's now closed for REST.

### REST Strengths

- **Universal support**: Every language, framework, and tool supports REST
- **Cacheable by default**: HTTP caching works naturally with GET requests
- **Stateless**: Horizontal scaling is trivial
- **Public API standard**: Consumers expect REST for public integrations
- **Simple mental model**: Resources + verbs + status codes

### REST Weaknesses

- **Over-fetching**: `/users/{id}` returns all fields even if you need only the name
- **Under-fetching**: Requires multiple requests to assemble related data
- **No native type contract**: OpenAPI helps but adds tooling overhead
- **Versioning pain**: Breaking changes require new versions

## GraphQL in 2026: Mature and Powerful

GraphQL has matured into a stable platform, with the ecosystem addressing most early criticisms. N+1 queries are solved by DataLoader. Performance is no longer a concern with persisted queries. Federation allows scaling across teams.

### Schema-First Design

```graphql
# schema.graphql
type User {
  id: ID!
  email: String!
  name: String!
  role: UserRole!
  posts(first: Int, after: String): PostConnection!
  createdAt: DateTime!
}

enum UserRole {
  ADMIN
  USER
  READONLY
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
  publishedAt: DateTime
}

type PostConnection {
  edges: [PostEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type PageInfo {
  hasNextPage: Boolean!
  endCursor: String
}

type Query {
  user(id: ID!): User
  users(first: Int, role: UserRole): [User!]!
  me: User
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
  deleteUser(id: ID!): Boolean!
}

input CreateUserInput {
  email: String!
  name: String!
  role: UserRole! = USER
}
```

### Resolver Implementation with DataLoader

```typescript
// src/resolvers/user.resolver.ts
import DataLoader from 'dataloader';

// DataLoader prevents N+1 queries by batching
const userLoader = new DataLoader<string, User>(async (ids) => {
  const users = await db.users.findMany({
    where: { id: { in: ids as string[] } },
  });
  // DataLoader requires results in the same order as input keys
  return ids.map(id => users.find(u => u.id === id) ?? null);
});

export const userResolvers = {
  Query: {
    user: (_: never, { id }: { id: string }) => userLoader.load(id),
    users: (_: never, { first, role }: { first?: number; role?: string }) =>
      db.users.findMany({
        take: first ?? 20,
        where: role ? { role } : undefined,
      }),
    me: (_: never, __: never, context: Context) => {
      if (!context.user) throw new AuthenticationError('Not authenticated');
      return userLoader.load(context.user.id);
    },
  },

  Mutation: {
    createUser: (_: never, { input }: { input: CreateUserInput }, context: Context) => {
      requireRole(context, 'ADMIN');
      return db.users.create({ data: input });
    },
  },

  // Field resolver — called for each User's posts field
  User: {
    posts: (parent: User, { first, after }: { first?: number; after?: string }) =>
      getPaginatedPosts(parent.id, first, after),
  },
};
```

### GraphQL Federation: Scaling Across Teams

Federation is GraphQL's answer to microservices. Each team owns a subgraph; the gateway composes them:

```graphql
# User service subgraph
type User @key(fields: "id") {
  id: ID!
  email: String!
  name: String!
}

# Order service subgraph (extends User from user service)
extend type User @key(fields: "id") {
  id: ID! @external
  orders: [Order!]!  # Owned by order service
}

type Order {
  id: ID!
  total: Float!
  status: OrderStatus!
  user: User!
}
```

Teams deploy their subgraphs independently. The Apollo Router or Cosmo composes the unified schema automatically.

### GraphQL Strengths

- **Precise data fetching**: Clients request exactly what they need
- **Single endpoint**: No endpoint proliferation
- **Strong type system**: Schema is the contract between client and server
- **Subscriptions**: Real-time data is a first-class feature
- **Excellent for mobile**: Minimize payload on bandwidth-constrained clients
- **Federation**: Best solution for multi-team API ownership

### GraphQL Weaknesses

- **Complexity**: Requires understanding resolvers, DataLoader, schema design
- **HTTP caching**: Complex—need persisted queries or CDN-level caching
- **File uploads**: Not native—requires multipart extensions
- **Overkill for simple APIs**: High ceremony for CRUD-heavy services
- **Tooling investment**: Codegen, schema registry, gateway configuration

## tRPC in 2026: The TypeScript-Native Choice

tRPC eliminates the API layer for TypeScript full-stack applications. Instead of writing HTTP endpoints and then writing client code to call them, you write TypeScript functions and call them directly. The type safety is end-to-end, automatically.

### What Makes tRPC Different

With REST or GraphQL, you have a boundary where types can drift:

```
Server defines types → Generates OpenAPI/schema → Client generates types
(types can drift if generation is skipped or schema is wrong)
```

With tRPC:

```
Server defines procedures → Client imports and calls them with full types
(one source of truth, no generation step, no drift possible)
```

### tRPC Server Setup

```typescript
// server/routers/user.ts
import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';

export const userRouter = router({
  // Query
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.id } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND' });
      return user;
    }),

  // Query with cursor-based pagination
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
      role: z.enum(['ADMIN', 'USER', 'READONLY']).optional(),
    }))
    .query(async ({ input, ctx }) => {
      const { limit, cursor, role } = input;
      const items = await ctx.db.user.findMany({
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        where: role ? { role } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return { items, nextCursor };
    }),

  // Mutation
  create: protectedProcedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2),
      role: z.enum(['ADMIN', 'USER', 'READONLY']).default('USER'),
    }))
    .mutation(async ({ input, ctx }) => {
      requireRole(ctx, 'ADMIN');
      return ctx.db.user.create({ data: input });
    }),

  // Subscription (real-time)
  onUpdate: protectedProcedure
    .subscription(({ ctx }) => {
      return observable<User>((emit) => {
        const unsub = userEventEmitter.on('update', (user) => {
          if (ctx.user.id === user.id || ctx.user.role === 'ADMIN') {
            emit.next(user);
          }
        });
        return unsub;
      });
    }),
});
```

### tRPC Client (React + Next.js)

```typescript
// client/utils/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../../server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

```tsx
// client/components/UserList.tsx
import { trpc } from '../utils/trpc';

export function UserList() {
  // Fully typed — autocomplete, type checking, no separate type imports
  const { data, isLoading } = trpc.user.list.useQuery({
    limit: 20,
    role: 'USER',
  });

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      trpc.useContext().user.list.invalidate();
    },
  });

  if (isLoading) return <Spinner />;

  return (
    <div>
      {data?.items.map(user => (
        // user.email is typed — no need for explicit type annotations
        <UserCard key={user.id} user={user} />
      ))}
      <button
        onClick={() => createUser.mutate({
          email: 'new@example.com',
          name: 'New User',
          // TypeScript error if role is invalid
          role: 'USER',
        })}
      >
        Add User
      </button>
    </div>
  );
}
```

The type flows from the Zod schema on the server directly to the component, with zero configuration. Rename a field on the server and TypeScript immediately highlights every client call that uses the old name.

### tRPC Strengths

- **End-to-end type safety**: No type drift between client and server possible
- **Zero code generation**: Types work without build steps or schema files
- **Excellent DX**: Autocomplete, refactoring, and error detection all work across the boundary
- **React Query integration**: Built-in caching, loading states, optimistic updates
- **Minimal boilerplate**: Less code than REST + OpenAPI client generation

### tRPC Weaknesses

- **TypeScript only**: Useless for non-TypeScript clients (mobile apps, third parties)
- **Full-stack coupling**: Client and server must be in the same monorepo (or share package)
- **Not a public API**: Can't document and expose tRPC to external developers
- **Less mature ecosystem**: Fewer middleware options than Express/Fastify

## Side-by-Side Comparison

| Dimension | REST | GraphQL | tRPC |
|---|---|---|---|
| Learning curve | Low | Medium | Low (TypeScript required) |
| Type safety | Via OpenAPI + codegen | Via schema + codegen | Native, zero config |
| Public API support | Excellent | Good | None |
| Multi-language clients | Excellent | Good | None (TypeScript only) |
| Over-fetching | Yes | Solved | N/A (functions) |
| Real-time (subscriptions) | SSE / WebSocket (custom) | Native | Native |
| HTTP caching | Excellent | Complex | N/A (RPC model) |
| Federation (multi-team) | Complex | Excellent (Apollo Federation) | Via package sharing |
| Ecosystem maturity | Very mature | Mature | Growing |
| Best team size | Any | Medium–large | Small–medium |

## Decision Framework

### Choose REST when:

- You're building a public API that third parties will consume
- Your clients include non-TypeScript environments (mobile, Python scripts, etc.)
- Your team doesn't use TypeScript
- You need excellent HTTP caching
- You're exposing webhooks or integrating with existing REST infrastructure

### Choose GraphQL when:

- Multiple clients (web, mobile, IoT) need different data shapes
- Your API serves data from multiple services/domains
- You have mobile clients where bandwidth matters
- Multiple teams own different parts of the API (federation)
- You need a self-documenting API with complex relationships

### Choose tRPC when:

- You're building a TypeScript-first full-stack app (Next.js, Remix, etc.)
- The API is internal (only your frontend consumes it)
- You want the best possible developer experience with minimal setup
- Your team wants to avoid maintaining a separate API layer
- You value refactoring safety and autocomplete across the stack

## Migration Strategies

### Migrating REST → tRPC

Don't rewrite. Incrementally migrate:

```typescript
// Step 1: Add tRPC alongside existing REST routes
// Express handles /api/legacy/* routes
// tRPC handles /api/trpc/* routes

const app = express();
app.use('/api/legacy', existingRouter);
app.use('/api/trpc', createExpressMiddleware({ router: appRouter }));

// Step 2: Migrate route by route, starting with new features
// Step 3: Remove old REST route once all callers use tRPC
```

### Adding GraphQL to an Existing REST API

```typescript
// Add GraphQL as an additional layer without removing REST
// Resolvers call your existing service layer

const resolvers = {
  Query: {
    user: (_, { id }) => userService.findById(id),  // Reuses existing service
    users: (_, args) => userService.findMany(args),
  },
};

app.use('/graphql', createYoga({ schema }));
app.use('/api', restRouter);  // Keep REST for backward compatibility
```

## Performance Considerations

### REST: HTTP Caching Wins

```typescript
// GET responses are automatically cacheable
router.get('/users/:id', async (req, res) => {
  const user = await cache.get(`user:${req.params.id}`) ??
    await db.findUser(req.params.id);

  res.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.json(user);
});
```

### GraphQL: Persisted Queries

```typescript
// Apollo Client with persisted queries
const link = createPersistedQueryLink({ useGETForHashedQueries: true });

// First request: sends full query, gets hash back
// Subsequent requests: sends only hash (30 bytes vs 500+ bytes)
// CDN can cache GET requests by hash
```

### tRPC: React Query Caching

```typescript
// tRPC + React Query handles caching automatically
const utils = trpc.useContext();

// Prefetch on hover for instant navigation
<Link
  onMouseEnter={() => utils.user.getById.prefetch({ id: userId })}
  href={`/users/${userId}`}
>
  {userName}
</Link>
```

## Conclusion

In 2026, there's no universally right answer—just the right fit for your context.

REST remains the safest default for any API with external consumers. GraphQL pays dividends at scale when multiple teams or clients need flexible data access. tRPC delivers the fastest development velocity for TypeScript full-stack teams who own both sides of the API boundary.

The most pragmatic teams aren't dogmatic: they use REST for public APIs, tRPC for internal full-stack features, and GraphQL for the federated data graph that spans multiple services. You don't have to pick one forever.

Browse the [API design tools collection](/tools/api-design), [GraphQL tools](/tools/graphql), and [TypeScript utilities](/tools/typescript) on DevPlaybook for more resources.
