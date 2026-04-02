---
title: "Hoppscotch"
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
