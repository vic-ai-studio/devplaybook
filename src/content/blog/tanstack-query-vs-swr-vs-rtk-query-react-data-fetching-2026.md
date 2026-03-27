---
title: "TanStack Query vs SWR vs RTK Query: React Data Fetching 2026"
description: "A deep comparison of TanStack Query, SWR, and RTK Query for React server state management in 2026 — caching, background refetch, optimistic updates, bundle size, and TypeScript support."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["react", "data-fetching", "tanstack-query", "swr", "rtk-query", "typescript", "state-management"]
readingTime: "12 min read"
---

Server state is fundamentally different from UI state. It's async, it has a lifetime, it can go stale, and multiple components often need the same data. Managing it manually with `useEffect` + `useState` quickly turns into a mess of race conditions, stale closures, and loading spinners that never go away.

That's exactly the problem TanStack Query, SWR, and RTK Query were built to solve. Each library takes a different approach. This guide breaks down how they compare so you can pick the right one for your codebase — not just copy a Stack Overflow answer.

---

## The Core Problem They Solve

Before comparing, let's be clear about what "server state" means in practice:

- Data that lives on a server, not in your app
- Multiple components needing the same data simultaneously
- Data that can become stale and needs refetching
- Loading, error, and success states that need handling
- Caching to avoid redundant network requests
- Background updates to keep data fresh without freezing the UI

All three libraries solve this. Where they differ is in API design philosophy, bundle size, built-in features, and ecosystem integration.

---

## TanStack Query (formerly React Query)

TanStack Query v5 (released late 2023) is the gold standard for server state management. It's framework-agnostic — works with React, Vue, Solid, Svelte, and Angular — but its React integration is the most mature.

### Basic Setup

```tsx
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserProfile />
    </QueryClientProvider>
  );
}

function UserProfile() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user', 1],
    queryFn: () => fetch('/api/user/1').then(res => res.json()),
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <div>{data.name}</div>;
}
```

### Caching Strategy

TanStack Query uses a key-based cache. Any query with the same `queryKey` shares cache state. You control freshness with `staleTime` (how long data is considered fresh) and `gcTime` (previously `cacheTime` — how long unused cache entries stay in memory).

```tsx
useQuery({
  queryKey: ['posts', { page, filter }],
  queryFn: () => fetchPosts(page, filter),
  staleTime: 5 * 60 * 1000,   // 5 minutes — won't refetch unless stale
  gcTime: 10 * 60 * 1000,     // 10 minutes — keep in cache even when unused
});
```

### Background Refetch

By default, TanStack Query refetches on:
- Window focus (user tabs back)
- Network reconnect
- Component mount (if data is stale)

Each of these is configurable per-query or globally on the `QueryClient`.

```tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      retry: 2,
    },
  },
});
```

### Mutations and Optimistic Updates

Mutations are first-class in TanStack Query. The `useMutation` hook handles optimistic updates cleanly with `onMutate` and `onError` rollback:

```tsx
const queryClient = useQueryClient();

const mutation = useMutation({
  mutationFn: (newPost: Post) =>
    fetch('/api/posts', { method: 'POST', body: JSON.stringify(newPost) }),
  onMutate: async (newPost) => {
    // Cancel any outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['posts'] });

    // Snapshot the previous value
    const previousPosts = queryClient.getQueryData(['posts']);

    // Optimistically update to the new value
    queryClient.setQueryData(['posts'], (old: Post[]) => [...old, newPost]);

    return { previousPosts };
  },
  onError: (err, newPost, context) => {
    // Roll back on error
    queryClient.setQueryData(['posts'], context?.previousPosts);
  },
  onSettled: () => {
    // Always refetch after error or success
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  },
});
```

### Infinite Queries

TanStack Query has first-class support for infinite scroll and pagination:

```tsx
const {
  data,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
} = useInfiniteQuery({
  queryKey: ['posts'],
  queryFn: ({ pageParam }) => fetchPostsPage(pageParam),
  initialPageParam: 0,
  getNextPageParam: (lastPage, pages) => lastPage.nextCursor,
});
```

---

## SWR (Stale-While-Revalidate)

SWR is Vercel's take on server state. It's named after the HTTP `stale-while-revalidate` cache directive — return cached data immediately, then refetch in the background. It's lighter than TanStack Query and has a simpler mental model, but fewer built-in features.

### Basic Setup

```tsx
import useSWR from 'swr';

const fetcher = (url: string) => fetch(url).then(res => res.json());

function UserProfile() {
  const { data, error, isLoading } = useSWR('/api/user/1', fetcher);

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage />;

  return <div>{data.name}</div>;
}
```

SWR uses the URL (or any serializable key) directly as the cache key. No `QueryClient` wrapper required — global config is optional.

### Caching Strategy

SWR's cache is simpler. The key concept is `dedupingInterval` — how long to suppress duplicate requests for the same key from multiple components:

```tsx
const { data } = useSWR('/api/user/1', fetcher, {
  dedupingInterval: 2000,         // dedupe requests within 2 seconds
  revalidateOnFocus: true,        // refetch when window regains focus
  revalidateOnReconnect: true,    // refetch on network reconnect
  refreshInterval: 30000,         // poll every 30 seconds
});
```

### Mutations with `useSWRMutation`

SWR v2 added `useSWRMutation` for explicit mutations:

```tsx
import useSWRMutation from 'swr/mutation';

async function updateUser(url: string, { arg }: { arg: Partial<User> }) {
  return fetch(url, {
    method: 'PATCH',
    body: JSON.stringify(arg),
  }).then(res => res.json());
}

function EditProfile() {
  const { trigger, isMutating } = useSWRMutation('/api/user/1', updateUser);

  return (
    <button
      onClick={() => trigger({ name: 'New Name' })}
      disabled={isMutating}
    >
      Update
    </button>
  );
}
```

Optimistic updates use `mutate` with an optimistic data function:

```tsx
const { mutate } = useSWR('/api/posts', fetcher);

// Optimistic update
await mutate(
  fetch('/api/posts', { method: 'POST', body: JSON.stringify(newPost) }),
  {
    optimisticData: (currentData) => [...currentData, newPost],
    rollbackOnError: true,
    revalidate: true,
  }
);
```

### Infinite with `useSWRInfinite`

```tsx
import useSWRInfinite from 'swr/infinite';

const getKey = (pageIndex: number, previousPageData: Post[]) => {
  if (previousPageData && !previousPageData.length) return null; // reached end
  return `/api/posts?page=${pageIndex}`;
};

const { data, size, setSize } = useSWRInfinite(getKey, fetcher);
```

---

## RTK Query (Redux Toolkit Query)

RTK Query is Redux Toolkit's built-in data fetching solution. If you're already using Redux in your app, it integrates seamlessly. If you're not using Redux, it's a heavier choice for data fetching alone.

### Basic Setup

RTK Query is defined via `createApi`:

```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  tagTypes: ['User', 'Post'],
  endpoints: (builder) => ({
    getUser: builder.query<User, number>({
      query: (id) => `/users/${id}`,
      providesTags: ['User'],
    }),
    getPosts: builder.query<Post[], void>({
      query: () => '/posts',
      providesTags: ['Post'],
    }),
    createPost: builder.mutation<Post, Partial<Post>>({
      query: (body) => ({
        url: '/posts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Post'],
    }),
  }),
});

export const { useGetUserQuery, useGetPostsQuery, useCreatePostMutation } = api;
```

You wire it into your Redux store:

```tsx
import { configureStore } from '@reduxjs/toolkit';
import { api } from './api';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});
```

### Caching and Cache Invalidation

RTK Query uses tag-based cache invalidation. Mutations that `invalidatesTags` trigger automatic refetch of queries that `providesTags` with matching tags:

```tsx
// This query provides 'Post' tags
const { data: posts } = useGetPostsQuery();

// This mutation invalidates 'Post' — triggers re-fetch above
const [createPost] = useCreatePostMutation();
```

Tag invalidation is explicit and predictable — but also verbose. You must think about cache relationships up front when defining your API slice.

### Optimistic Updates

RTK Query supports optimistic updates via `onQueryStarted`:

```tsx
createPost: builder.mutation<Post, Partial<Post>>({
  query: (body) => ({ url: '/posts', method: 'POST', body }),
  async onQueryStarted(newPost, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      api.util.updateQueryData('getPosts', undefined, (draft) => {
        draft.push({ id: Date.now(), ...newPost } as Post);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo(); // Roll back on error
    }
  },
}),
```

### TypeScript Support

RTK Query's type inference is outstanding. Because endpoints are defined once in `createApi`, the auto-generated hooks (`useGetUserQuery`, `useCreatePostMutation`) are fully typed — input parameters, return types, and error types.

---

## Side-by-Side Comparison

| Feature | TanStack Query v5 | SWR v2 | RTK Query |
|---|---|---|---|
| **Bundle size** | ~13 KB (gzip) | ~4 KB (gzip) | ~9 KB (gzip, part of RTK) |
| **Framework support** | React, Vue, Solid, Svelte, Angular | React only | React only |
| **Caching model** | Key-based, configurable TTL | URL-based, stale-while-revalidate | Tag-based invalidation |
| **Background refetch** | Window focus, reconnect, polling | Window focus, reconnect, polling | On mutation invalidation |
| **Optimistic updates** | `onMutate` + `onError` rollback | `optimisticData` option | `onQueryStarted` + `undo` |
| **Infinite queries** | `useInfiniteQuery` (built-in) | `useSWRInfinite` (built-in) | Manual implementation needed |
| **Devtools** | React Query Devtools (excellent) | None official | Redux DevTools (excellent) |
| **TypeScript** | Very good | Good | Excellent (generated types) |
| **SSR support** | `dehydrate`/`hydrate` | `fallback` prop | `getRunningQueriesThunk` |
| **Learning curve** | Medium | Low | High (requires Redux) |
| **Best for** | Most React apps | Lightweight/Next.js | Apps already using Redux |

---

## Bundle Size in Practice

Bundle size comparisons can be misleading. SWR is the smallest, but:

- If you need `useSWRInfinite` and `useSWRMutation`, you're adding more
- TanStack Query's ~13 KB includes devtools in dev mode; production is smaller
- RTK Query's footprint depends on how much of Redux Toolkit you're already using — if you have Redux, you're not adding 9 KB, you're adding almost nothing

For a Next.js project without Redux, SWR is the lightest path. For a feature-rich app where you'll need infinite queries, complex cache coordination, and devtools, TanStack Query justifies its size.

---

## TypeScript Deep Dive

All three libraries have strong TypeScript support, but with different approaches.

**TanStack Query** infers types from your `queryFn` return type:

```tsx
// Type of `data` is inferred as `User | undefined`
const { data } = useQuery({
  queryKey: ['user', id],
  queryFn: (): Promise<User> => fetchUser(id),
});
```

**SWR** uses a generic type parameter:

```tsx
const { data } = useSWR<User>('/api/user/1', fetcher);
// data: User | undefined
```

**RTK Query** generates fully typed hooks from your endpoint definitions — the strongest type-safety of the three, at the cost of upfront verbosity.

---

## Real-World Use Cases

### Use TanStack Query when:
- You're starting a new React app without existing Redux
- You need rich devtools to debug caching behavior
- You have complex cache dependencies or need fine-grained `staleTime` control
- You might migrate to another framework (Vue, Solid) in the future
- You need solid infinite query support

### Use SWR when:
- You're building a Next.js app and want the simplest possible setup
- Your data fetching needs are straightforward (no complex mutations)
- Bundle size is a priority
- You want the stale-while-revalidate pattern with minimal configuration

### Use RTK Query when:
- You already use Redux Toolkit in your app
- Your team is familiar with Redux patterns
- You want all state (local + server) in one store for debugging
- Tag-based cache invalidation maps well to your backend's data model

---

## Server-Side Rendering

### TanStack Query SSR (Next.js App Router)

```tsx
// app/users/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query';

export default async function UsersPage() {
  const queryClient = new QueryClient();
  await queryClient.prefetchQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UsersList />
    </HydrationBoundary>
  );
}
```

### SWR SSR

```tsx
// Prefetch in getServerSideProps (Pages Router)
export async function getServerSideProps() {
  const users = await fetchUsers();
  return {
    props: {
      fallback: {
        '/api/users': users,
      },
    },
  };
}

function App({ fallback }) {
  return (
    <SWRConfig value={{ fallback }}>
      <UsersList />
    </SWRConfig>
  );
}
```

### RTK Query SSR

RTK Query SSR is more involved and typically uses `makeStore` + `getRunningQueriesThunk` to await all queries before serializing state.

---

## Migration: From `useEffect` to Any of These

If you're coming from raw `useEffect` data fetching, here's what changes:

**Before (common useEffect pattern):**

```tsx
function UserProfile({ id }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchUser(id)
      .then(data => { if (!cancelled) setUser(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  // ...
}
```

**After (TanStack Query):**

```tsx
function UserProfile({ id }) {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
  });
  // ...
}
```

You eliminate the race condition, the cancellation logic, the manual loading/error state, and the cache duplication — all in a few lines.

---

## Which One in 2026?

**TanStack Query** is the clear default for new projects. The v5 API cleaned up several rough edges from v4, and the ecosystem (devtools, server components support) is the most mature.

**SWR** is still a solid choice for projects where simplicity and bundle size are the top concerns. Vercel maintains it actively and Next.js integration is first-class.

**RTK Query** is the right choice only when you're already invested in Redux. Don't add Redux to your app just to use RTK Query — TanStack Query does the job without the ceremony.

If you're starting fresh: reach for TanStack Query. If you're in a Next.js project and want the smallest footprint: SWR. If you're in a Redux shop: RTK Query saves you from writing duplicate state logic.

---

## Quick Start Template

```bash
# TanStack Query
npm install @tanstack/react-query @tanstack/react-query-devtools

# SWR
npm install swr

# RTK Query (comes with Redux Toolkit)
npm install @reduxjs/toolkit react-redux
```

Try the live examples in the [React hooks playground](/tools/react-playground) or compare caching behavior in the [performance profiler](/tools/performance-profiler).
