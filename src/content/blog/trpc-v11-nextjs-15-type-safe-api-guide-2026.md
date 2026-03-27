---
title: "tRPC v11 + Next.js 15: Building Type-Safe Full-Stack APIs in 2026"
description: "Complete tutorial: set up tRPC v11 with Next.js 15 App Router, React Query v5, authentication middleware, Zod validation, streaming, and testing. End-to-end type safety from day one."
date: "2026-03-28"
readingTime: "14 min read"
tags: [trpc, nextjs, typescript, api, react-query]
---

tRPC eliminates the API layer ceremony that consumes most full-stack TypeScript projects. No schema files, no code generation, no keeping client types in sync with server types. You write a function on the server and call it from the client with full autocompletion.

tRPC v11 pairs with Next.js 15's App Router and React Query v5 to give you the most productive full-stack TypeScript setup available today.

This is a complete tutorial — from `npx create-next-app` to production-ready API.

---

## Why tRPC in 2026

The alternatives each have a tradeoff:

- **REST**: simple, but you maintain two type definitions — one for the server, one for the client
- **GraphQL**: powerful, but complex setup and you still need a code generation step
- **OpenAPI**: generates clients automatically, but requires schema maintenance and a code-gen pipeline

tRPC gives you the type safety of GraphQL without the schema language, and the simplicity of REST without the type drift. The tradeoff is that both client and server must be TypeScript, and typically in the same monorepo.

For Next.js full-stack apps, it's the clear winner.

---

## Project Setup

```bash
npx create-next-app@latest my-app --typescript --tailwind --app
cd my-app
```

### Install Dependencies

```bash
npm install @trpc/server@11 @trpc/client@11 @trpc/react-query@11 @trpc/next@11
npm install @tanstack/react-query@5
npm install zod superjson
```

### Directory Structure

```
src/
  app/
    api/
      trpc/
        [trpc]/
          route.ts        # HTTP handler
    _trpc/
      client.ts           # Client-side tRPC instance
      server.ts           # Server-side tRPC caller
  server/
    trpc.ts               # tRPC initialization
    routers/
      _app.ts             # Root router
      post.ts             # Post router
      user.ts             # User router
  components/
    providers.tsx         # React Query provider
```

---

## Initialize tRPC

```ts
// src/server/trpc.ts
import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ZodError } from 'zod';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';

// Context — available in every procedure
export async function createTRPCContext(opts: { headers: Headers }) {
  const session = await getServerSession(authOptions);

  return {
    db,
    session,
    headers: opts.headers,
  };
}

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

// Base router and procedure helpers
export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Auth middleware
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});

export const protectedProcedure = t.procedure.use(enforceUserIsAuthed);
```

---

## Building Routers

### Post Router

```ts
// src/server/routers/post.ts
import { z } from 'zod';
import { createTRPCRouter, publicProcedure, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const postRouter = createTRPCRouter({
  // Query: list posts
  list: publicProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        cursor: z.string().optional(), // for cursor-based pagination
        category: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const posts = await ctx.db.post.findMany({
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        where: input.category ? { category: input.category } : undefined,
        orderBy: { createdAt: 'desc' },
        include: { author: true },
      });

      let nextCursor: string | undefined;
      if (posts.length > input.limit) {
        const nextItem = posts.pop();
        nextCursor = nextItem!.id;
      }

      return { posts, nextCursor };
    }),

  // Query: get single post
  bySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { slug: input.slug },
        include: { author: true, comments: true },
      });

      if (!post) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Post with slug "${input.slug}" not found`,
        });
      }

      return post;
    }),

  // Mutation: create post (auth required)
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(3).max(200),
        content: z.string().min(10),
        category: z.enum(['tutorial', 'news', 'opinion']),
        tags: z.array(z.string()).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const post = await ctx.db.post.create({
        data: {
          ...input,
          slug,
          authorId: ctx.session.user.id,
        },
      });

      return post;
    }),

  // Mutation: delete (owner only)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const post = await ctx.db.post.findUnique({
        where: { id: input.id },
      });

      if (!post) {
        throw new TRPCError({ code: 'NOT_FOUND' });
      }

      if (post.authorId !== ctx.session.user.id) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'You can only delete your own posts',
        });
      }

      await ctx.db.post.delete({ where: { id: input.id } });
      return { success: true };
    }),
});
```

### Root Router

```ts
// src/server/routers/_app.ts
import { createTRPCRouter } from '../trpc';
import { postRouter } from './post';
import { userRouter } from './user';

export const appRouter = createTRPCRouter({
  post: postRouter,
  user: userRouter,
});

// Export type for client use
export type AppRouter = typeof appRouter;
```

---

## HTTP Handler (Next.js App Router)

```ts
// src/app/api/trpc/[trpc]/route.ts
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/trpc';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => createTRPCContext({ headers: req.headers }),
    onError:
      process.env.NODE_ENV === 'development'
        ? ({ path, error }) => {
            console.error(`tRPC error on ${path ?? '<no-path>'}:`, error);
          }
        : undefined,
  });

export { handler as GET, handler as POST };
```

---

## Client Setup

### React Query Provider

```tsx
// src/components/providers.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { httpBatchLink } from '@trpc/client';
import { trpc } from '@/app/_trpc/client';
import superjson from 'superjson';
import { useState } from 'react';

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // browser
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return 'http://localhost:3000';
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, // 1 minute
          },
        },
      })
  );

  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: `${getBaseUrl()}/api/trpc`,
          transformer: superjson,
          headers() {
            return {
              'x-trpc-source': 'react',
            };
          },
        }),
      ],
    })
  );

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}
```

### tRPC Client Instance

```ts
// src/app/_trpc/client.ts
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@/server/routers/_app';

export const trpc = createTRPCReact<AppRouter>();
```

### Server-Side Caller

```ts
// src/app/_trpc/server.ts
import { appRouter } from '@/server/routers/_app';
import { createTRPCContext } from '@/server/trpc';
import { createCallerFactory } from '@trpc/server';
import { headers } from 'next/headers';
import { cache } from 'react';

const createCaller = createCallerFactory(appRouter);

// Use React cache() to deduplicate context creation per request
const createContext = cache(async () => {
  const heads = new Headers(headers());
  heads.set('x-trpc-source', 'rsc');
  return createTRPCContext({ headers: heads });
});

export const api = createCaller(createContext);
```

---

## Using tRPC in Components

### Server Component (no loading state needed)

```tsx
// src/app/posts/page.tsx
import { api } from '@/app/_trpc/server';

export default async function PostsPage() {
  // Direct call — no useQuery, no loading state
  const { posts } = await api.post.list({ limit: 20 });

  return (
    <main>
      <h1>Posts</h1>
      <ul>
        {posts.map(post => (
          <li key={post.id}>
            <a href={`/posts/${post.slug}`}>{post.title}</a>
            <span>by {post.author.name}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

### Client Component with React Query

```tsx
// src/components/post-list.tsx
'use client';

import { trpc } from '@/app/_trpc/client';

export function PostList() {
  const { data, isLoading, error } = trpc.post.list.useQuery({
    limit: 20,
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {data?.posts.map(post => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
```

### Infinite Query (Cursor Pagination)

```tsx
'use client';
import { trpc } from '@/app/_trpc/client';

export function InfinitePostList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    trpc.post.list.useInfiniteQuery(
      { limit: 10 },
      {
        getNextPageParam: lastPage => lastPage.nextCursor,
      }
    );

  const posts = data?.pages.flatMap(page => page.posts) ?? [];

  return (
    <div>
      {posts.map(post => (
        <article key={post.id}>
          <h2>{post.title}</h2>
        </article>
      ))}
      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
        >
          {isFetchingNextPage ? 'Loading...' : 'Load more'}
        </button>
      )}
    </div>
  );
}
```

### Mutation with Optimistic Update

```tsx
'use client';
import { trpc } from '@/app/_trpc/client';

export function CreatePostForm() {
  const utils = trpc.useUtils();
  const createPost = trpc.post.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch
      utils.post.list.invalidate();
    },
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    await createPost.mutateAsync({
      title: formData.get('title') as string,
      content: formData.get('content') as string,
      category: 'tutorial',
      tags: [],
    });
  }

  return (
    <form onSubmit={handleSubmit}>
      {createPost.error && (
        <p className="text-red-500">
          {createPost.error.message}
          {/* Show Zod field errors */}
          {createPost.error.data?.zodError?.fieldErrors.title?.[0]}
        </p>
      )}
      <input name="title" placeholder="Title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={createPost.isPending}>
        {createPost.isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

---

## Middleware Patterns

### Rate Limiting Middleware

```ts
// src/server/middleware/rate-limit.ts
import { TRPCError } from '@trpc/server';
import { t } from '../trpc';

const requestCounts = new Map<string, { count: number; resetAt: number }>();

export const rateLimitMiddleware = t.middleware(({ ctx, next }) => {
  const ip = ctx.headers.get('x-forwarded-for') ?? 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 100;

  const record = requestCounts.get(ip);

  if (!record || now > record.resetAt) {
    requestCounts.set(ip, { count: 1, resetAt: now + windowMs });
  } else {
    record.count++;
    if (record.count > maxRequests) {
      throw new TRPCError({
        code: 'TOO_MANY_REQUESTS',
        message: 'Rate limit exceeded. Try again in a minute.',
      });
    }
  }

  return next();
});

export const rateLimitedProcedure = publicProcedure.use(rateLimitMiddleware);
```

### Logging Middleware

```ts
export const loggerMiddleware = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;

  const meta = { path, type, durationMs };

  if (result.ok) {
    console.log('tRPC OK', meta);
  } else {
    console.error('tRPC Error', { ...meta, error: result.error });
  }

  return result;
});
```

---

## Testing tRPC Routers

Test your router logic directly without HTTP overhead:

```ts
// src/server/routers/post.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createCallerFactory } from '@trpc/server';
import { appRouter } from './_app';
import { createTestContext } from '../test-utils';

const createCaller = createCallerFactory(appRouter);

describe('post router', () => {
  it('lists posts', async () => {
    const ctx = await createTestContext();
    const caller = createCaller(ctx);

    const result = await caller.post.list({ limit: 10 });

    expect(result.posts).toBeInstanceOf(Array);
    expect(result.posts.length).toBeLessThanOrEqual(10);
  });

  it('throws NOT_FOUND for unknown slug', async () => {
    const ctx = await createTestContext();
    const caller = createCaller(ctx);

    await expect(
      caller.post.bySlug({ slug: 'does-not-exist' })
    ).rejects.toThrow('NOT_FOUND');
  });

  it('requires auth to create post', async () => {
    const ctx = await createTestContext({ authenticated: false });
    const caller = createCaller(ctx);

    await expect(
      caller.post.create({
        title: 'Test',
        content: 'Content here',
        category: 'tutorial',
        tags: [],
      })
    ).rejects.toThrow('UNAUTHORIZED');
  });
});
```

```ts
// src/server/test-utils.ts
import { db } from '@/lib/db';

export async function createTestContext({ authenticated = true } = {}) {
  return {
    db,
    headers: new Headers(),
    session: authenticated
      ? {
          user: { id: 'test-user-id', name: 'Test User', email: 'test@example.com' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }
      : null,
  };
}
```

---

## Error Handling

tRPC errors map to HTTP status codes automatically:

| tRPC Code | HTTP Status | When to Use |
|---|---|---|
| `BAD_REQUEST` | 400 | Invalid input (usually Zod handles this) |
| `UNAUTHORIZED` | 401 | Not logged in |
| `FORBIDDEN` | 403 | Logged in but not allowed |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `CONFLICT` | 409 | Duplicate resource |
| `TOO_MANY_REQUESTS` | 429 | Rate limited |
| `INTERNAL_SERVER_ERROR` | 500 | Unexpected error |

On the client, catch errors with standard patterns:

```tsx
const { error } = trpc.post.bySlug.useQuery({ slug });

if (error) {
  if (error.data?.code === 'NOT_FOUND') {
    return <NotFoundPage />;
  }
  if (error.data?.code === 'UNAUTHORIZED') {
    redirect('/login');
  }
  return <ErrorPage message={error.message} />;
}
```

---

## tRPC vs REST vs GraphQL: When to Choose Each

| Scenario | Best Choice |
|---|---|
| Next.js full-stack, TypeScript-only | **tRPC** |
| Public API consumed by third parties | **REST** or **OpenAPI** |
| Multiple clients with different data needs | **GraphQL** |
| Team mixing TypeScript and other languages | **REST** |
| Internal tools, quick prototypes | **tRPC** |
| Need fine-grained field selection | **GraphQL** |

---

## Key Takeaways

- **tRPC v11** with the `@tanstack/react-query` v5 adapter is the most productive full-stack TypeScript setup in the Next.js ecosystem
- **Server components** can call tRPC procedures directly with `createCaller` — no HTTP round-trip
- **Zod** handles input validation; tRPC surfaces field-level errors automatically
- **Middleware** is composable — build `publicProcedure`, `protectedProcedure`, and `rateLimitedProcedure` from the same base
- **Testing** is straightforward — call procedures directly without spinning up an HTTP server

The type safety payoff compounds over time. Every refactor, rename, or schema change is caught at compile time instead of at runtime in production.
