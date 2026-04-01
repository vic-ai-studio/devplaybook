---
title: "GraphQL Best Practices: Performance, Security & Schema Design"
description: "GraphQL best practices 2026: N+1 problem with DataLoader, query depth limiting, persisted queries, schema design patterns, cursor pagination, and Apollo Server optimization."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["GraphQL", "best practices", "performance", "DataLoader", "N+1", "Apollo Server", "schema design"]
readingTime: "10 min read"
category: "api"
---

GraphQL is powerful, but power without guardrails leads to slow queries, security vulnerabilities, and schemas that are painful to evolve. This guide covers the essential best practices for production GraphQL APIs — from the N+1 problem to schema design patterns that scale.

## The N+1 Problem and DataLoader

The N+1 problem is GraphQL's most notorious performance trap. It happens when resolving a list of items triggers one database query per item.

```graphql
# This looks innocent
query {
  orders {          # 1 query to get N orders
    customer {      # N queries, one per order — the +1
      name
      email
    }
  }
}
```

Without DataLoader, a list of 100 orders fires 101 queries. With DataLoader, it fires 2.

### Implementing DataLoader

DataLoader batches and caches requests within a single request's event loop tick:

```javascript
import DataLoader from 'dataloader';

// Create a DataLoader per request (not globally — request isolation matters)
function createLoaders() {
  return {
    customerLoader: new DataLoader(async (customerIds) => {
      // Receives array of IDs collected across all resolver calls this tick
      const customers = await db.customers.findMany({
        where: { id: { in: customerIds } }
      });

      // DataLoader requires results in the same order as input IDs
      const customerMap = Object.fromEntries(customers.map(c => [c.id, c]));
      return customerIds.map(id => customerMap[id] ?? new Error(`Customer ${id} not found`));
    }),

    orderItemsLoader: new DataLoader(async (orderIds) => {
      const items = await db.orderItems.findMany({
        where: { orderId: { in: orderIds } }
      });

      // Group items by orderId
      const itemsByOrder = orderIds.map(orderId =>
        items.filter(item => item.orderId === orderId)
      );
      return itemsByOrder;
    }, {
      // Cache within a single request
      cache: true,
      // Batch window in ms (default: 0 = end of current event loop tick)
      batchScheduleFn: (callback) => setTimeout(callback, 2)
    })
  };
}

// Pass loaders via context
const server = new ApolloServer({
  typeDefs,
  resolvers,
  context: ({ req }) => ({
    loaders: createLoaders(),
    user: req.user
  })
});

// Use in resolvers
const resolvers = {
  Order: {
    customer: (order, _, { loaders }) => {
      return loaders.customerLoader.load(order.customerId);
    },
    items: (order, _, { loaders }) => {
      return loaders.orderItemsLoader.load(order.id);
    }
  }
};
```

A single DataLoader instance per request ensures isolation between users while batching efficiently within a request.

---

## Query Depth and Complexity Limiting

Without limits, clients can send arbitrarily deep or expensive queries:

```graphql
# Malicious deep query
{
  user {
    friends {
      friends {
        friends {
          friends {
            # ... 100 levels deep
          }
        }
      }
    }
  }
}
```

### Depth Limiting

```javascript
import depthLimit from 'graphql-depth-limit';

const server = new ApolloServer({
  validationRules: [
    depthLimit(7)  // Reject queries deeper than 7 levels
  ]
});
```

### Query Complexity Analysis

Assign a cost to each field and reject queries that exceed a budget:

```javascript
import { createComplexityRule, simpleEstimator, fieldExtensionsEstimator } from 'graphql-query-complexity';

const server = new ApolloServer({
  plugins: [
    {
      requestDidStart: () => ({
        didResolveOperation({ request, document }) {
          const complexity = getComplexity({
            schema,
            operationName: request.operationName,
            query: document,
            variables: request.variables,
            estimators: [
              // Uses @complexity directive on field definitions
              fieldExtensionsEstimator(),
              // Fallback: 1 per scalar, multiplied by list arguments
              simpleEstimator({ defaultComplexity: 1 })
            ]
          });

          if (complexity > 500) {
            throw new GraphQLError(
              `Query complexity ${complexity} exceeds limit of 500`,
              { extensions: { code: 'QUERY_TOO_COMPLEX', complexity } }
            );
          }
        }
      })
    }
  ]
});
```

Mark expensive fields in your schema:

```graphql
type Query {
  orders(first: Int): OrderConnection @complexity(value: 10, multipliers: ["first"])
  user(id: ID!): User @complexity(value: 2)
  fullTextSearch(query: String!): [SearchResult] @complexity(value: 50)
}
```

---

## Persisted Queries

Persisted queries pre-register query strings on the server. Clients send only a hash instead of the full query string — improving performance and security.

```javascript
// Apollo Server: Automatic Persisted Queries (APQ)
import { ApolloServer } from '@apollo/server';
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries';
import { sha256 } from 'crypto-hash';

// Client: send hash first, fall back to full query if not found
const persistedQueriesLink = createPersistedQueryLink({ sha256 });

// Server: caches queries in memory or Redis
const server = new ApolloServer({
  cache: new KeyvAdapter(new Keyv('redis://localhost:6379')),
  plugins: [ApolloServerPluginCacheControl({ defaultMaxAge: 5 })]
});
```

For maximum security in production, use **trusted document** mode: only allow pre-registered queries, reject all ad-hoc queries from clients.

---

## Schema Design Patterns

### The Connection Pattern (Cursor Pagination)

Use the Relay Connection spec for paginated lists:

```graphql
type OrderConnection {
  edges: [OrderEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

type OrderEdge {
  node: Order!
  cursor: String!
}

type PageInfo {
  hasNextPage: Boolean!
  hasPreviousPage: Boolean!
  startCursor: String
  endCursor: String
}

type Query {
  orders(
    first: Int
    after: String
    last: Int
    before: String
    filter: OrderFilterInput
  ): OrderConnection!
}
```

```javascript
// Resolver implementation
const resolvers = {
  Query: {
    orders: async (_, { first = 20, after, filter }) => {
      const cursor = after ? decodeCursor(after) : null;
      const items = await db.orders.findMany({
        take: first + 1, // Fetch one extra to determine hasNextPage
        cursor: cursor ? { id: cursor } : undefined,
        skip: cursor ? 1 : 0,
        where: buildFilter(filter),
        orderBy: { createdAt: 'desc' }
      });

      const hasNextPage = items.length > first;
      const edges = items.slice(0, first).map(order => ({
        node: order,
        cursor: encodeCursor(order.id)
      }));

      return {
        edges,
        totalCount: await db.orders.count({ where: buildFilter(filter) }),
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges[0]?.cursor,
          endCursor: edges[edges.length - 1]?.cursor
        }
      };
    }
  }
};
```

### Input Types for Mutations

Always use input types for mutation arguments — not inline arguments. This keeps mutations forward-compatible:

```graphql
# Good: using input types
type Mutation {
  createOrder(input: CreateOrderInput!): CreateOrderPayload!
  updateOrder(id: ID!, input: UpdateOrderInput!): UpdateOrderPayload!
}

input CreateOrderInput {
  customerId: ID!
  items: [OrderItemInput!]!
  shippingAddressId: ID
  promoCode: String
}

# Mutation payload — always wrap responses
type CreateOrderPayload {
  order: Order
  errors: [UserError!]!
}

type UserError {
  field: [String!]
  message: String!
  code: String!
}
```

### Nullable vs Non-Null Design

The choice between `String` and `String!` matters for schema evolution:

- Use `!` (non-null) only when the field is **always** present — missing it is a server error, not a business logic state
- Fields that may not exist in all contexts should be nullable
- Error fields in payloads should always be nullable
- Prefer nullable by default; add `!` deliberately

```graphql
type User {
  id: ID!           # Always present
  email: String!    # Always present (required at registration)
  bio: String       # Optional — nullable is correct
  lastLoginAt: String  # May not have logged in yet
  premiumUntil: String # Null = not premium
}
```

---

## Apollo Server Response Caching

Cache entire operation responses for public queries:

```javascript
import responseCachePlugin from '@apollo/server-plugin-response-cache';

const server = new ApolloServer({
  plugins: [
    responseCachePlugin({
      // Determine if result can be cached for this user or globally
      sessionId: ({ contextValue }) => contextValue.user?.id ?? null
    })
  ]
});
```

Apply cache hints in your schema:

```graphql
type Query {
  # Cache for 300 seconds, shared between all users
  products: [Product!]! @cacheControl(maxAge: 300, scope: PUBLIC)

  # Cache for 60 seconds, per-user
  currentUser: User @cacheControl(maxAge: 60, scope: PRIVATE)

  # Never cache
  cart: Cart @cacheControl(maxAge: 0)
}
```

---

## Introspection in Production

Introspection allows clients to query your schema structure — useful during development, but a security risk in production (exposes your full API surface to attackers):

```javascript
const server = new ApolloServer({
  introspection: process.env.NODE_ENV !== 'production',
  // Or: use IP allowlist for internal tooling
});
```

For internal GraphQL playgrounds in production, protect them behind authentication middleware.

---

## Performance Checklist

- [ ] DataLoader used for all relationships that appear in lists
- [ ] Query depth limited (max 7-10 levels)
- [ ] Query complexity analysis with per-operation budget
- [ ] Persisted queries or trusted documents in production
- [ ] Connection pattern used for all paginated fields
- [ ] Response cache plugin configured for public queries
- [ ] Introspection disabled in production
- [ ] `N+1` queries verified absent via query logging in development
- [ ] Slow query logging enabled (flag queries over 200ms)
- [ ] Schema has no deprecated fields older than 2 versions
