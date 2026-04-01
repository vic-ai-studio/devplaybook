---
title: "Building Type-Safe APIs with tRPC and Zod in 2026"
description: "Complete tRPC + Zod tutorial: set up end-to-end type-safe APIs with zero code generation. Includes routers, middleware, input validation, error handling, and React Query integration."
date: "2026-04-02"
tags: [trpc, zod, typescript, api, fullstack, react]
readingTime: "12 min read"
---

# Building Type-Safe APIs with tRPC and Zod in 2026

REST APIs have a fundamental problem: the server's type definitions and the client's type definitions are disconnected. You write a TypeScript backend, but the frontend calls it through HTTP — losing all type safety at the boundary. tRPC fixes this by sharing types directly between server and client, with zero code generation.

---

## What tRPC Solves

```typescript
// Traditional REST API — types drift apart
// Backend (Express)
app.get('/users/:id', (req, res) => {
  const user = await db.users.findById(req.params.id);
  res.json(user);  // TypeScript has no idea what the client expects
});

// Frontend (React)
const response = await fetch(`/api/users/${id}`);
const user = await response.json();  // `user` is `any` — no type safety
user.naem;  // Typo: no error until runtime
```

```typescript
// With tRPC — end-to-end type safety
// Backend defines the procedure once
const userRouter = router({
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await db.users.findById(input.id);
    }),
});

// Frontend uses it with full types
const user = await trpc.user.getById.query({ id: "usr_123" });
user.naem;  // ❌ TypeScript error: 'naem' doesn't exist — caught immediately!
```

---

## Setup

```bash
# Backend
npm install @trpc/server zod

# Frontend (React)
npm install @trpc/client @trpc/react-query @tanstack/react-query

# Or for Next.js full-stack
npm install @trpc/server @trpc/client @trpc/react-query @trpc/next @tanstack/react-query zod
```

---

## Core Concepts

### Routers and Procedures

```typescript
// server/trpc.ts — initialize tRPC
import { initTRPC } from '@trpc/server';
import { ZodError } from 'zod';

// Context — shared data available in all procedures
export interface Context {
  userId?: string;
  db: Database;
}

const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError: error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;
```

```typescript
// server/routers/user.ts
import { router, publicProcedure } from '../trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';

// Define Zod schemas (reusable)
const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  role: z.enum(["admin", "user", "readonly"]).default("user"),
});

const UpdateUserSchema = CreateUserSchema.partial().extend({
  id: z.string().cuid(),
});

export const userRouter = router({
  // Query: GET operation
  list: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
      cursor: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      const users = await ctx.db.users.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      let nextCursor: string | undefined;
      if (users.length > input.limit) {
        const nextItem = users.pop();
        nextCursor = nextItem?.id;
      }

      return { users, nextCursor };
    }),

  // Query with parameter
  getById: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .query(async ({ input, ctx }) => {
      const user = await ctx.db.users.findUnique({ where: { id: input.id } });
      if (!user) throw new TRPCError({ code: 'NOT_FOUND', message: 'User not found' });
      return user;
    }),

  // Mutation: CREATE operation
  create: publicProcedure
    .input(CreateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const existing = await ctx.db.users.findUnique({ where: { email: input.email } });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Email already registered' });
      return await ctx.db.users.create({ data: input });
    }),

  // Mutation: UPDATE
  update: publicProcedure
    .input(UpdateUserSchema)
    .mutation(async ({ input, ctx }) => {
      const { id, ...data } = input;
      return await ctx.db.users.update({ where: { id }, data });
    }),

  // Mutation: DELETE
  delete: publicProcedure
    .input(z.object({ id: z.string().cuid() }))
    .mutation(async ({ input, ctx }) => {
      await ctx.db.users.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

---

## Authentication Middleware

```typescript
// server/trpc.ts — add protected procedure
const isAuthed = middleware(({ next, ctx }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId, // userId is now non-nullable in protected procedures
    },
  });
});

export const protectedProcedure = t.procedure.use(isAuthed);

// Role-based access
const isAdmin = middleware(({ next, ctx }) => {
  if (ctx.userRole !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN' });
  }
  return next({ ctx });
});

export const adminProcedure = protectedProcedure.use(isAdmin);
```

```typescript
// Usage
const adminRouter = router({
  getAllUsers: adminProcedure  // Only admins can call this
    .query(async ({ ctx }) => {
      return await ctx.db.users.findMany();
    }),
});
```

---

## Rate Limiting and Logging Middleware

```typescript
// Compose multiple middleware
const withRateLimit = middleware(async ({ next, ctx, path }) => {
  const key = `ratelimit:${ctx.userId || ctx.ip}:${path}`;
  const count = await ctx.redis.incr(key);
  if (count === 1) await ctx.redis.expire(key, 60); // 60 second window
  if (count > 100) throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });
  return next();
});

const withLogger = middleware(async ({ next, path, type }) => {
  const start = Date.now();
  const result = await next();
  const duration = Date.now() - start;
  console.log(`[${type}] ${path} - ${duration}ms`);
  return result;
});

// Combine middleware
const rateLimitedProcedure = publicProcedure
  .use(withLogger)
  .use(withRateLimit);
```

---

## Complete Router (Merge Multiple Routers)

```typescript
// server/router.ts
import { router } from './trpc';
import { userRouter } from './routers/user';
import { postRouter } from './routers/post';
import { authRouter } from './routers/auth';

export const appRouter = router({
  user: userRouter,
  post: postRouter,
  auth: authRouter,
});

// Export the router type — this is all the client needs
export type AppRouter = typeof appRouter;
```

---

## Server Setup (Express)

```typescript
// server/index.ts
import express from 'express';
import { createExpressMiddleware } from '@trpc/server/adapters/express';
import { appRouter } from './router';
import { createContext } from './context';

const app = express();

app.use(
  '/trpc',
  createExpressMiddleware({
    router: appRouter,
    createContext,  // Returns Context object for each request
  })
);

app.listen(3000);
```

```typescript
// server/context.ts
import { inferAsyncReturnType } from '@trpc/server';
import type { CreateExpressContextOptions } from '@trpc/server/adapters/express';

export async function createContext({ req, res }: CreateExpressContextOptions) {
  // Extract user from JWT
  const token = req.headers.authorization?.replace('Bearer ', '');
  const userId = token ? await verifyJWT(token) : undefined;

  return {
    userId,
    db,      // Prisma or other ORM
    redis,   // For rate limiting/caching
  };
}

export type Context = inferAsyncReturnType<typeof createContext>;
```

---

## Client Setup (React)

```typescript
// client/trpc.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '../server/router';  // Share the type!

export const trpc = createTRPCReact<AppRouter>();
```

```typescript
// client/App.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from './trpc';

const queryClient = new QueryClient();
const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/trpc',
      headers() {
        return { Authorization: `Bearer ${getToken()}` };
      },
    }),
  ],
});

function App() {
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <UserList />
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

```typescript
// client/UserList.tsx
import { trpc } from './trpc';

function UserList() {
  // Full type safety — TypeScript infers the return type automatically
  const { data, isLoading } = trpc.user.list.useQuery({ limit: 20 });

  const createUser = trpc.user.create.useMutation({
    onSuccess: () => {
      trpc.useUtils().user.list.invalidate(); // Invalidate cache after mutation
    },
  });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {data?.users.map(user => (
        <div key={user.id}>{user.name}</div>  // user.name is typed as string
      ))}
      <button onClick={() => createUser.mutate({
        name: "New User",
        email: "new@example.com",
      })}>
        Add User
      </button>
    </div>
  );
}
```

---

## Zod Best Practices with tRPC

### Reusable Schemas

```typescript
// shared/schemas.ts — share between frontend and backend
import { z } from 'zod';

export const UserSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(2).max(100),
  email: z.string().email(),
  createdAt: z.coerce.date(),  // Handles string → Date conversion
});

export const PaginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  page: z.number().int().nonnegative().default(0),
});

// Derive TypeScript types from Zod schemas
export type User = z.infer<typeof UserSchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
```

### Transformations and Coercions

```typescript
const SearchSchema = z.object({
  q: z.string().trim().toLowerCase(),  // Normalize input
  tags: z.string().transform(s => s.split(',').map(t => t.trim())),  // Parse CSV
  minDate: z.string().pipe(z.coerce.date()),  // String → Date
});
```

---

## Error Handling

tRPC maps error codes to HTTP status codes automatically:

```typescript
import { TRPCError } from '@trpc/server';

// Common error patterns
throw new TRPCError({ code: 'NOT_FOUND', message: 'Resource not found' });         // 404
throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Login required' });           // 401
throw new TRPCError({ code: 'FORBIDDEN', message: 'Insufficient permissions' });    // 403
throw new TRPCError({ code: 'CONFLICT', message: 'Email already exists' });        // 409
throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid input' });            // 400
throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Something broke' });// 500
throw new TRPCError({ code: 'TOO_MANY_REQUESTS' });                                // 429
```

On the client, Zod validation errors are automatically structured:

```typescript
const createUser = trpc.user.create.useMutation({
  onError: (error) => {
    if (error.data?.zodError) {
      // Access field-level errors
      console.log(error.data.zodError.fieldErrors.email);  // ["Invalid email"]
    }
  },
});
```

---

## Key Takeaways

1. **tRPC eliminates the type boundary** between frontend and backend — one change to a procedure type propagates everywhere.

2. **Zod is the validation layer** — it validates at runtime AND generates TypeScript types at compile time.

3. **Middleware composition** keeps cross-cutting concerns (auth, logging, rate limiting) separate and reusable.

4. **Share schemas** between frontend and backend for client-side validation before API calls.

5. **tRPC is not a REST replacement** — it works best in full-stack TypeScript monorepos. For public APIs consumed by non-TypeScript clients, REST or GraphQL is more appropriate.

---

Explore tRPC procedure types with the [TypeScript Playground](/tools/typescript-playground). The [API Design Checker](/tools/api-design-checker) helps you evaluate whether tRPC or REST is the better fit for your specific project requirements.
