---
title: "Hoppscotch — Open-Source API Development & Testing Platform"
description: "Open-source, web-based API testing tool — test REST, GraphQL, WebSocket, and gRPC APIs directly in the browser without installing desktop software."
category: "API Testing & CI/CD"
pricing: "Free"
pricingDetail: "Open source (MIT); Hoppscotch Enterprise self-hosted from $19/user/month"
website: "https://hoppscotch.io"
github: "https://github.com/hoppscotch/hoppscotch"
tags: [api-testing, rest, graphql, websocket, grpc, browser, open-source]
pros:
  - "No installation — runs entirely in the browser at hoppscotch.io"
  - "Supports REST, GraphQL, WebSocket, SSE, Socket.io, MQTT, gRPC"
  - "Open source — self-host for privacy and team features"
  - "Clean, fast UI — faster to load than Electron apps"
  - "PWA: installable as a desktop-like app"
cons:
  - "Browser-based limits some capabilities (CORS issues with local APIs)"
  - "Requires Hoppscotch Proxy extension for localhost testing"
  - "Less powerful scripting than Postman"
  - "Team features require Enterprise (self-hosted)"
date: "2026-04-02"
---

## Overview

Hoppscotch (formerly Postwoman) is the browser-native API testing tool. It runs at hoppscotch.io in any browser — no download, no account required for basic use. Its breadth of protocol support (REST, GraphQL, WebSocket, gRPC, MQTT, SSE) makes it uniquely versatile for developers working across different API types.

## REST API Testing

```
GET https://api.example.com/products?category=electronics&limit=10

Headers:
  Authorization: Bearer {{token}}
  Accept: application/json

Response:
[
  { "id": "prod-1", "name": "Widget", "price": 29.99 },
  ...
]
```

## GraphQL Explorer

- Paste your GraphQL endpoint
- Hoppscotch introspects the schema automatically
- IntelliSense for queries, mutations, and subscriptions

```graphql
subscription OrderUpdates($orderId: ID!) {
  orderStatus(id: $orderId) {
    status
    updatedAt
    trackingNumber
  }
}
```

## WebSocket Testing

Hoppscotch's WebSocket client handles the full lifecycle:

```
Connect: wss://socket.example.com/notifications

Send: { "type": "subscribe", "channel": "orders" }
Receive: { "type": "order.created", "data": { "orderId": "123" } }

// Disconnect when done
```

## Self-Hosting with Docker

```yaml
# docker-compose.yml
services:
  hoppscotch:
    image: hoppscotch/hoppscotch:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://hoppscotch:password@postgres/hoppscotch
      JWT_SECRET: your-secret-key
      VITE_BASE_URL: http://localhost:3000

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: hoppscotch
      POSTGRES_USER: hoppscotch
      POSTGRES_PASSWORD: password
```

## Localhost Testing

Hoppscotch runs in the browser, which means CORS policies apply to requests to localhost. Use the official browser extension:

```
1. Install "Hoppscotch Browser Extension" (Chrome/Firefox)
2. Enable in Hoppscotch settings → Interceptor → Browser Extension
3. Now requests bypass CORS — can reach http://localhost:3000
```

## Comparison: Browser vs Desktop API Clients

| | Hoppscotch | Postman | Bruno |
|--|-----------|---------|-------|
| Installation | None (browser) | Desktop app | Desktop app |
| Offline support | Limited | Full | Full |
| WebSocket | ✅ | Limited | ❌ |
| MQTT/SSE | ✅ | ❌ | ❌ |
| Self-hostable | ✅ | ❌ | N/A |
| Git sync | Via export | No | Native |

Hoppscotch is ideal for: quick API exploration without installing software, testing WebSocket APIs, or when you need a browser-accessible tool for a team without admin rights on their machines.

---

## Concrete Use Case: Testing a GraphQL API with WebSocket Subscriptions for Order Tracking

Imagine you are building an order tracking system with a GraphQL backend. Orders flow through a microservice architecture, and your frontend subscribes to real-time status updates via WebSocket. Hoppscotch lets you test this entire flow without writing any code or spinning up Postman.

**Step 1: Test the REST endpoints that create and fetch orders.** Before touching GraphQL, you verify the underlying REST API:

```
POST https://api.orders.example.com/v1/orders
Content-Type: application/json
Authorization: Bearer {{token}}

{
  "customerId": "cust-42",
  "items": [{ "sku": "WIDGET-A", "quantity": 3 }],
  "shippingAddress": { "zip": "10001", "country": "US" }
}

Response: 201 Created
{ "orderId": "ord-789", "status": "pending" }
```

You store `ord-789` as a Hoppscotch environment variable for reuse.

**Step 2: Query order status via GraphQL.** You switch to the GraphQL tab, paste the endpoint `https://api.orders.example.com/graphql`, and run:

```graphql
query GetOrderStatus($orderId: ID!) {
  order(id: $orderId) {
    orderId
    status
    estimatedDelivery
    trackingNumber
    items {
      sku
      quantity
    }
  }
}

Variables:
{
  "orderId": "ord-789"
}
```

You get back the full order object. The schema introspection works automatically — Hoppscotch pulls the full schema and provides IntelliSense for field names.

**Step 3: Subscribe to live updates via WebSocket.** Real-time tracking requires a WebSocket subscription. In Hoppscotch, you switch to the WebSocket client and connect to `wss://api.orders.example.com/ws`:

```
CONNECT
Headers:
  Authorization: Bearer {{token}}

SEND (after connect):
{
  "type": "subscribe",
  "id": "sub-1",
  "payload": {
    "query": "subscription OnOrderUpdate($orderId: ID!) { orderStatus(id: $orderId) { status updatedAt trackingNumber } }",
    "variables": { "orderId": "ord-789" }
  }
}

RECEIVE (simulated update from your backend):
{
  "type": "next",
  "id": "sub-1",
  "payload": {
    "data": {
      "orderStatus": {
        "status": "shipped",
        "updatedAt": "2026-04-05T10:23:00Z",
        "trackingNumber": "1Z999AA10123456784"
      }
    }
  }
}
```

You verify the subscription fires correctly and the payload structure matches what your frontend expects.

**Step 4: Export the collection for teammates.** Once your tests pass, you export the entire collection as a JSON file:

```
Hoppscotch → Collection → Export → JSON
```

Your frontend teammate imports it and immediately has the exact same requests, environment variables, and WebSocket setup — no manual recreation. For a team using Hoppscotch Enterprise (self-hosted), this can be shared via the team workspace directly.

This end-to-end workflow — REST → GraphQL → WebSocket subscription → export — is where Hoppscotch's multi-protocol support shines. No other free tool handles this spectrum in a browser tab.

---

## Hoppscotch vs Postman vs Insomnia: Comparison

| | **Hoppscotch** | **Postman** | **Insomnia** |
|---|---|---|---|
| **Platform** | Browser (PWA), self-hostable | Desktop app (Electron), web | Desktop app (Electron), self-hostable |
| **REST** | ✅ | ✅ | ✅ |
| **GraphQL** | ✅ (schema introspection + IntelliSense) | ✅ | ✅ |
| **WebSocket** | ✅ | ⚠️ (limited, newer) | ✅ |
| **gRPC** | ✅ | ❌ | ❌ |
| **MQTT / SSE / Socket.io** | ✅ | ❌ | ❌ |
| **Mock servers** | ✅ (via Hoppscotch Microservices) | ✅ (Postman Mock Servers) | ✅ (via plugins) |
| **Collection scripting** | Basic pre-request scripts | JavaScript, extensive | JavaScript, extensive |
| **Environment variables** | ✅ | ✅ | ✅ |
| **Git sync / version control** | Via export (OSS); native in Enterprise | ❌ (manual backup) | ✅ (native Git sync via folder sync) |
| **Team collaboration** | Enterprise (self-hosted) | ✅ (Postman workspaces) | ✅ (via Git + self-hosted) |
| **CI/CD integration** | Via CLI or import/export | ✅ (Postman CLI / Newman) | ✅ (Inso CLI) |
| **Offline mode** | Limited | ✅ | ✅ |
| **Self-hostable** | ✅ (Docker, open source) | ❌ | ✅ (Ingestion API + open source) |
| **Learning curve** | Low — immediate browser use | Medium — feature-rich but complex | Low-Medium |
| **Free tier** | Full feature set (browser), open source | Limited (3 collaborators, mock servers capped) | Free (open source) |
| **Paid pricing** | Enterprise from ~$19/user/month | From $14/user/month (Standard) | Free tier + paid plans from $8/user/month |
| **Best for** | Developers needing multi-protocol browser access without installs | Large teams needing a mature, enterprise-grade API platform | Developers who prefer native apps and Git-based workflows |

**Key tradeoffs:**
- **Hoppscotch** wins on accessibility (no install, immediate browser access) and protocol breadth (gRPC, MQTT, SSE). Its weakness is scripting depth and team features in the free tier.
- **Postman** is the industry standard for enterprise teams — the most mature collection ecosystem, extensive CI/CD via Newman, and broad team features. But it is heavy (Electron), expensive for large teams, and WebSocket/MQTT support lags.
- **Insomnia** is the best choice for developers who value a native app experience, want Git-based workflow (collections as code), and don't need the broadest protocol support.

---

## When to Use / When Not to Use

### When to use Hoppscotch

- **Quick API exploration with zero setup**: You open a browser tab, paste a URL, and start making requests. No account creation, no desktop install, no admin rights required. This is Hoppscotch's strongest use case.
- **Testing WebSocket, gRPC, MQTT, or SSE APIs**: The protocol breadth is unmatched by Postman in the free tier. If you work with real-time systems (IoT, live dashboards, notification services), Hoppscotch handles these natively.
- **GraphQL schema exploration**: The built-in introspection and query IntelliSense make it fast to explore a new GraphQL API without a schema file.
- **Sharing API tests with teammates without a commercial account**: Export/import collections via JSON files means anyone can open your requests regardless of their own Hoppscotch plan.
- **Self-hosting for privacy-sensitive teams**: Docker deployment gives you full control over your data. An enterprise team that cannot use cloud-based tools can run Hoppscotch on their own infrastructure.
- **Teams on restricted machines**: Users who cannot install desktop software (locked-down corporate laptops, shared lab machines) can still use Hoppscotch from any browser.

### When NOT to use Hoppscotch

- **Complex scripting and test automation**: Postman's JavaScript pre-request/post-response scripts are more mature. If you need deep request chaining, dynamic variable computation, or extensive test assertions, Postman or Insomnia will be less frustrating.
- **Large team collaboration workflows**: Postman's built-in workspaces and Insomnia's Git sync are more robust than Hoppscotch's free tier sharing. If you need role-based access, versioned collections, and fine-grained permissions without self-hosting, Postman Enterprise or Insomnia Teams are more capable.
- **CI/CD pipelines with Postman Collections**: If your pipeline already uses Newman (Postman's CLI) or `inso` (Insomnia's CLI), switching to Hoppscotch introduces new tooling friction. Stick with the tool that has established CLI support in your pipeline.
- **Local development with CORS restrictions**: Hoppscotch's browser origin triggers CORS on many local backends. The Browser Extension workaround exists, but it is an extra setup step that desktop apps don't need. If you're constantly hitting localhost APIs, a native app (Insomnia/Postman) avoids this entirely.
- **gRPC streaming in production workflows**: While Hoppscotch supports gRPC reflection, its support for streaming RPCs (bidirectional, server-side, client-side) is less battle-tested than the REST and WebSocket paths. If you are building heavily on gRPC streaming, a specialized tool like BloomRPC or a full gRPC GUI may be preferable.
- **Offline work on planes or low-connectivity environments**: Hoppscotch requires browser access. For fully offline API testing, use Insomnia or Postman desktop apps.

Hoppscotch is the right choice when accessibility and protocol breadth matter more than enterprise collaboration depth — particularly for solo developers, small teams, and anyone who needs to test APIs quickly on a machine where they cannot install software.
