---
title: "GraphQL vs REST vs tRPC 2026: Which API Should You Build?"
description: "GraphQL vs REST vs tRPC 2026 comparison: when to use each, performance, type safety, caching, tooling, and decision guide for your next API."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["GraphQL", "REST", "tRPC", "API design", "TypeScript", "comparison", "2026"]
readingTime: "9 min read"
category: "api"
---

Choosing the wrong API architecture is expensive. Migrating from REST to GraphQL mid-project — or the reverse — costs weeks. This guide cuts through the noise: here's when REST, GraphQL, and tRPC each win, with side-by-side code comparisons for the same data fetch.

## The Contenders

**REST** (Representational State Transfer) — the default choice since the early 2000s, resource-based, HTTP-native.

**GraphQL** — a query language for APIs developed by Meta, single endpoint, client-driven data fetching.

**tRPC** — TypeScript Remote Procedure Call, zero-schema end-to-end type safety for TypeScript-first full-stack apps.

---

## REST: The Universal Standard

### Pros
- **Simple mental model** — everyone understands HTTP verbs and status codes
- **Native caching** — GET requests cache at browser, CDN, and proxy layers without configuration
- **Universal client support** — curl, Postman, any HTTP library in any language
- **Stateless** — each request is self-contained, scales horizontally with ease
- **Great for public APIs** — no SDK required, any developer can consume it

### Cons
- **Over-fetching** — endpoints return fixed shapes; you often get more data than needed
- **Under-fetching** — complex UIs require multiple round trips to assemble data
- **No built-in type safety** — contract drift between server and client is easy to introduce
- **Schema evolution is manual** — adding fields is safe, removing requires versioning discipline

### Example: Fetch a user and their latest 3 orders

```javascript
// REST: requires 2 round trips
const user = await fetch('/api/users/123').then(r => r.json());
const orders = await fetch('/api/users/123/orders?limit=3').then(r => r.json());

// Assemble on client
const profile = { ...user, recentOrders: orders.data };
```

---

## GraphQL: Flexible Data Fetching

### Pros
- **Precise data fetching** — clients request exactly the fields they need, nothing more
- **Single endpoint** — one URL handles all queries and mutations
- **Self-documenting** — introspection provides a live schema explorer
- **Excellent for complex data graphs** — deeply nested relational data in one request
- **Strong ecosystem** — Apollo, Relay, GraphQL Yoga, Pothos, code generation

### Cons
- **Caching complexity** — POST-based queries don't cache automatically; requires Apollo Client or persisted queries
- **N+1 problem** — naive resolvers fire one DB query per list item (solved with DataLoader, but requires setup)
- **Overly flexible** — clients can craft expensive queries; depth limiting and cost analysis needed
- **Overkill for simple APIs** — heavy setup cost for CRUD-heavy services
- **TypeScript-only safety** — requires codegen to maintain type sync

### Example: Same fetch in GraphQL

```javascript
// GraphQL: one round trip, exact fields
const { data } = await client.query({
  query: gql`
    query GetUserProfile($userId: ID!) {
      user(id: $userId) {
        id
        name
        email
        avatar
        orders(first: 3, orderBy: CREATED_AT_DESC) {
          edges {
            node {
              id
              total
              status
              createdAt
            }
          }
        }
      }
    }
  `,
  variables: { userId: '123' }
});
```

---

## tRPC: End-to-End Type Safety Without a Schema

### Pros
- **Zero-schema type safety** — TypeScript types flow from server to client automatically via inference
- **No code generation step** — types are live, always in sync
- **Excellent DX** — autocomplete on API calls in your editor
- **Lightweight** — no runtime schema parsing overhead
- **First-class React Query integration** — built-in caching, loading states, optimistic updates

### Cons
- **TypeScript-only** — not usable from non-TypeScript clients (no mobile apps, no third-party consumers)
- **Monorepo-friendly, not API-platform-friendly** — designed for apps that own both client and server
- **No public API use case** — no documentation format, no SDK generation
- **Tighter coupling** — server and client must share code or be in the same repo

### Example: Same fetch in tRPC

```typescript
// Server: define procedure
export const appRouter = router({
  userProfile: publicProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = await db.user.findUnique({ where: { id: input.userId } });
      const orders = await db.order.findMany({
        where: { userId: input.userId },
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      return { ...user, recentOrders: orders };
    }),
});

// Client: fully typed, autocomplete works
const { data } = trpc.userProfile.useQuery({ userId: '123' });
// data.recentOrders[0].status — TypeScript knows the shape!
```

---

## Side-by-Side Comparison

| Dimension | REST | GraphQL | tRPC |
|-----------|------|---------|------|
| Type safety | Manual / OpenAPI | Codegen required | Automatic inference |
| Caching | Native HTTP | Manual setup | Via React Query |
| Public API | Excellent | Good | Not suitable |
| Learning curve | Low | Medium | Low (if you know TypeScript) |
| Over/under-fetching | Common issue | Solved | Non-issue (server controls shape) |
| Language support | Any | Any | TypeScript only |
| Schema | OpenAPI | SDL | None needed |
| Best for | Public APIs, microservices | Complex graphs, mobile BFF | Full-stack TS monorepos |

---

## Decision Guide: Which Should You Build?

**Choose REST when:**
- Your API will be consumed by third parties or mobile apps you don't control
- You need simple, well-understood HTTP semantics
- Caching at the CDN layer matters for performance
- Your team spans multiple languages or backgrounds
- You're building a public developer platform (like Stripe, GitHub, Twilio)

**Choose GraphQL when:**
- Your data is a complex graph with many relationships (social networks, e-commerce, CMS)
- You serve multiple clients (web, iOS, Android) with different data needs
- You want to consolidate multiple REST services behind a single gateway
- You have a dedicated frontend team that needs data fetching flexibility
- Real-time subscriptions are a core feature

**Choose tRPC when:**
- Your entire stack is TypeScript (Next.js, Node, or similar)
- You control both the client and server
- You want maximum developer experience with zero schema boilerplate
- You're building an internal tool, SaaS dashboard, or startup MVP
- You already use React Query and want tighter integration

---

## Migration Considerations

### REST → GraphQL
Introduce a GraphQL layer on top of existing REST services. Use schema stitching or federation to aggregate gradually. Don't attempt a big-bang rewrite.

### REST → tRPC
Works best in greenfield projects or when migrating a Next.js app. Extract existing REST handlers into tRPC procedures iteratively.

### GraphQL → tRPC
Unusual, but possible if you've outgrown the complexity. Replace queries/mutations one-by-one with tRPC procedures in a TypeScript monorepo.

---

## The Honest Take for 2026

REST isn't dying. GraphQL isn't winning. tRPC isn't for everyone.

The best choice depends on **who consumes your API** and **whether you control both ends**. Public API with external consumers? REST with a solid OpenAPI spec. Internal full-stack TypeScript app? tRPC eliminates entire categories of bugs. Multi-client product with a complex data model? GraphQL pays off at scale.

Most production systems use a combination: REST for public-facing endpoints, tRPC for internal BFF layers, and sometimes GraphQL as an aggregation gateway over legacy services.

Pick the right tool, not the trendy one.
