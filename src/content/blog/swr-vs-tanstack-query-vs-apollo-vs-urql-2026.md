---
title: "SWR vs TanStack Query vs Apollo vs urql: Data Fetching Comparison 2026"
description: "Compare SWR, TanStack Query, Apollo Client, and urql for React data fetching in 2026 — caching strategies, bundle size, SSR support, GraphQL vs REST, and when each library wins."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["swr", "tanstack-query", "apollo", "urql", "react", "data-fetching", "graphql", "caching"]
readingTime: "13 min read"
---

# SWR vs TanStack Query vs Apollo vs urql: Data Fetching Comparison 2026

Every React application that touches a server needs an answer to three questions: how do you cache server data, how do you keep it fresh, and how do you synchronize it across components? In 2026, four libraries dominate this space with very different opinions.

**SWR** and **TanStack Query** are REST-first (though both handle GraphQL). **Apollo Client** and **urql** are GraphQL-first. The choice isn't purely technical — it's also about your API design, your team's familiarity, and how much complexity you're willing to accept for more features.

This guide covers all four with real code examples, cache behavior explanations, SSR integration patterns, and a decision matrix.

---

## The Core Problem: Server State Management

React's local state (`useState`, `useReducer`) isn't designed for server data. Server data is:
- **Asynchronously fetched** and may be loading, error, or success
- **Shared** — multiple components might display the same data
- **Stale** — the server version might differ from what's in memory
- **Need to be invalidated** when mutations happen

These libraries solve all four concerns with different trade-offs.

---

## SWR: Simplicity First

SWR (stale-while-revalidate) from Vercel prioritizes simplicity. One hook, one concept: return stale data immediately, revalidate in the background.

### Basic Usage

```tsx
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then(r => r.json())

function UserProfile({ id }: { id: string }) {
  const { data, error, isLoading, mutate } = useSWR(
    `/api/users/${id}`,
    fetcher
  )

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h1>{data.name}</h1>
      <button onClick={() => mutate()}>Refresh</button>
    </div>
  )
}
```

### Cache Invalidation and Mutation

```tsx
import useSWR, { useSWRConfig } from 'swr'

function EditUser({ id }: { id: string }) {
  const { mutate } = useSWRConfig()

  const handleSave = async (updates: Partial<User>) => {
    // Optimistic update
    mutate(`/api/users/${id}`, updates, false)

    // Send to server
    await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    })

    // Revalidate from server
    mutate(`/api/users/${id}`)

    // Also invalidate the users list
    mutate('/api/users')
  }
}
```

### SWR Configuration

```tsx
import { SWRConfig } from 'swr'

function App() {
  return (
    <SWRConfig
      value={{
        refreshInterval: 30000,          // Background refresh every 30s
        revalidateOnFocus: true,          // Refresh when window regains focus
        revalidateOnReconnect: true,      // Refresh when network reconnects
        dedupingInterval: 2000,           // Deduplicate requests within 2s
        errorRetryCount: 3,               // Retry failed requests 3 times
        fetcher: (url) => fetch(url).then(r => {
          if (!r.ok) throw new Error(`HTTP ${r.status}`)
          return r.json()
        }),
      }}
    >
      <Router />
    </SWRConfig>
  )
}
```

**SWR shines when:** Your API is REST-based, you want minimal setup, and your caching needs are straightforward. Its ~4KB bundle is the smallest of the four.

---

## TanStack Query: Power User's Choice

TanStack Query (formerly React Query) extends the SWR model with richer features: query invalidation by tag, dependent queries, infinite scrolling, background sync, and a devtools panel.

### Basic Usage

```tsx
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

function UserProfile({ id }: { id: string }) {
  const { data, error, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => fetchUser(id),
    staleTime: 5 * 60 * 1000,    // Consider fresh for 5 minutes
    gcTime: 10 * 60 * 1000,       // Keep in cache for 10 minutes
  })

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return <h1>{data.name}</h1>
}
```

### Mutations and Cache Invalidation

```tsx
import { useMutation, useQueryClient } from '@tanstack/react-query'

function EditUser({ id }: { id: string }) {
  const queryClient = useQueryClient()

  const updateUser = useMutation({
    mutationFn: (updates: Partial<User>) =>
      fetch(`/api/users/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }).then(r => r.json()),

    // Optimistic update
    onMutate: async (updates) => {
      await queryClient.cancelQueries({ queryKey: ['user', id] })
      const previous = queryClient.getQueryData(['user', id])
      queryClient.setQueryData(['user', id], old => ({ ...old, ...updates }))
      return { previous }
    },

    // Rollback on error
    onError: (err, updates, context) => {
      queryClient.setQueryData(['user', id], context?.previous)
    },

    // Invalidate and refetch on success
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] })
      // This invalidates ALL queries starting with ['user'] — both
      // ['user', id] and ['user', 'list'] — with one call
    },
  })

  return (
    <button onClick={() => updateUser.mutate({ name: 'New Name' })}>
      Save
    </button>
  )
}
```

### Dependent Queries

```tsx
function UserPostsWithDetails({ userId }: { userId: string }) {
  const { data: user } = useQuery({
    queryKey: ['user', userId],
    queryFn: () => fetchUser(userId),
  })

  const { data: posts } = useQuery({
    queryKey: ['posts', userId],
    queryFn: () => fetchUserPosts(userId),
    enabled: !!user,  // Only run when user data exists
  })

  const postIds = posts?.map(p => p.id) ?? []

  // Parallel queries for each post's details
  const postQueries = useQueries({
    queries: postIds.map(id => ({
      queryKey: ['post-detail', id],
      queryFn: () => fetchPostDetail(id),
    }))
  })
}
```

### Infinite Queries

```tsx
function PostFeed() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['posts'],
    queryFn: ({ pageParam = 1 }) =>
      fetch(`/api/posts?page=${pageParam}&limit=20`).then(r => r.json()),
    getNextPageParam: (lastPage) => lastPage.nextPage,
    initialPageParam: 1,
  })

  return (
    <div>
      {data?.pages.flatMap(page => page.posts).map(post => (
        <PostCard key={post.id} post={post} />
      ))}
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? 'Loading...' : 'Load More'}
      </button>
    </div>
  )
}
```

**TanStack Query shines when:** You have complex cache invalidation needs, dependent queries, optimistic updates, or infinite scrolling. Its query key system makes fine-grained cache management manageable.

---

## Apollo Client: GraphQL at Scale

Apollo Client is the most feature-rich option for GraphQL APIs. Its normalized cache, reactive queries, and local state management set the standard.

### Setup and Basic Query

```tsx
import { ApolloClient, InMemoryCache, ApolloProvider, gql, useQuery } from '@apollo/client'

const client = new ApolloClient({
  uri: 'https://api.example.com/graphql',
  cache: new InMemoryCache(),
})

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
`

function UserProfile({ id }: { id: string }) {
  const { loading, error, data } = useQuery(GET_USER, {
    variables: { id },
  })

  if (loading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h1>{data.user.name}</h1>
      <ul>
        {data.user.posts.map(post => (
          <li key={post.id}>{post.title}</li>
        ))}
      </ul>
    </div>
  )
}
```

### Normalized Cache — Apollo's Superpower

Apollo's `InMemoryCache` automatically normalizes objects by `__typename` + `id`. When any query updates a `User:123` object, all components rendering that user re-render — without manual invalidation:

```tsx
const UPDATE_USER = gql`
  mutation UpdateUser($id: ID!, $name: String!) {
    updateUser(id: $id, name: $name) {
      id
      name  # Apollo automatically updates all cached User:id references
    }
  }
`

function EditUser({ id }: { id: string }) {
  const [updateUser] = useMutation(UPDATE_USER)

  return (
    <button
      onClick={() => updateUser({ variables: { id, name: 'New Name' } })}
    >
      Save
    </button>
  )
}
```

Any component showing this user's name updates automatically — no `invalidateQueries`, no manual `mutate()`.

### Apollo with Subscriptions

```tsx
import { useSubscription } from '@apollo/client'

const POST_ADDED = gql`
  subscription PostAdded {
    postAdded {
      id
      title
      author {
        id
        name
      }
    }
  }
`

function LiveFeed() {
  const { data } = useSubscription(POST_ADDED, {
    onData: ({ client, data }) => {
      // Update the posts list cache when a new post arrives
      client.cache.modify({
        fields: {
          posts(existingPosts = []) {
            const newPostRef = client.cache.writeFragment({
              data: data.data.postAdded,
              fragment: gql`fragment NewPost on Post { id title }`
            })
            return [newPostRef, ...existingPosts]
          }
        }
      })
    }
  })
}
```

---

## urql: Lightweight GraphQL

urql is a modular, lighter GraphQL client that challenges Apollo's complexity with a cleaner architecture. At ~7KB (vs Apollo's ~30KB+), it's often the right choice for GraphQL projects that don't need Apollo's full feature set.

### Basic Usage

```tsx
import { createClient, Provider, useQuery, useMutation } from 'urql'

const client = createClient({
  url: 'https://api.example.com/graphql',
})

const GetUserQuery = `
  query GetUser($id: ID!) {
    user(id: $id) {
      id
      name
      email
    }
  }
`

function UserProfile({ id }: { id: string }) {
  const [result] = useQuery({
    query: GetUserQuery,
    variables: { id },
  })

  const { data, fetching, error } = result

  if (fetching) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return <h1>{data?.user.name}</h1>
}
```

### urql's Exchange System

urql's power comes from its exchange pipeline — a composable middleware system:

```tsx
import { createClient, fetchExchange, cacheExchange } from 'urql'
import { retryExchange } from '@urql/exchange-retry'
import { persistedExchange } from '@urql/exchange-persisted'
import { requestPolicyExchange } from '@urql/exchange-request-policy'

const client = createClient({
  url: '/graphql',
  exchanges: [
    requestPolicyExchange({
      shouldUpgrade: (operation) => operation.context.requestPolicy !== 'network-only',
      ttl: 5 * 60 * 1000,  // Upgrade to cache-and-network after 5 minutes
    }),
    retryExchange({
      initialDelayMs: 1000,
      maxDelayMs: 15000,
      maxNumberAttempts: 3,
      retryIf: (err) => !!(err?.networkError),
    }),
    cacheExchange,
    persistedExchange({ preferGetForPersistedQueries: true }),
    fetchExchange,
  ],
})
```

---

## Bundle Size and Performance Comparison

| Library | Bundle Size (gzip) | Cache Type | SSR Support |
|---------|-------------------|-----------|-------------|
| SWR | ~4KB | Simple key-value | Via Next.js fallback |
| TanStack Query | ~12KB | Query key hierarchy | Via initialData / dehydrate |
| Apollo Client | ~30KB+ | Normalized entity cache | Via SSR utilities |
| urql | ~7KB | Document + normalized | Via suspense-compat SSR |

### SSR Patterns

**TanStack Query SSR with Next.js App Router:**

```tsx
// app/users/[id]/page.tsx
import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'

export default async function UserPage({ params }: { params: { id: string } }) {
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: ['user', params.id],
    queryFn: () => fetchUser(params.id),
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <UserProfile id={params.id} />
    </HydrationBoundary>
  )
}
```

---

## Decision Matrix

| If you... | Choose |
|-----------|--------|
| Need minimal setup for a REST API | **SWR** |
| Have complex cache invalidation, infinite scroll, or optimistic updates | **TanStack Query** |
| Use GraphQL and need a normalized cache with automatic updates | **Apollo Client** |
| Use GraphQL but want a lighter, more modular client | **urql** |
| Need the smallest bundle | **SWR** (~4KB) |
| Need real-time subscriptions with auto-cache updates | **Apollo Client** |
| Use multiple GraphQL APIs or custom transports | **urql** |

Use the [API Response Formatter](/tools/api-response-formatter) and [API Tester](/tools/api-tester) when debugging the responses these libraries receive — cache issues are often just malformed API responses.

---

## Summary

For REST APIs, start with SWR if you want simplicity, graduate to TanStack Query when you need more control. For GraphQL APIs, urql is the underrated choice if you don't need Apollo's normalized cache — it gives you 80% of Apollo's features at 25% of the bundle cost. Apollo remains the go-to for complex GraphQL applications where normalized entity caching and subscriptions are critical.

The biggest mistake teams make is using Apollo for a REST API or using SWR for a GraphQL API. Match the tool to the API protocol first, then tune for features.
