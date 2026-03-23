---
title: "API Mocking for Frontend Development: Complete Guide (2025)"
description: "How to use API mocking to develop frontend apps without a real backend. Covers MSW, JSON Server, mock services in Postman, browser-based mock APIs, and testing strategies."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["api-mocking", "frontend", "testing", "developer-tools", "msw", "json-server", "react"]
readingTime: "11 min read"
faq:
  - question: "What is API mocking in frontend development?"
    answer: "API mocking intercepts HTTP requests and returns predefined responses without hitting a real server. This lets frontend developers build and test UIs independently of backend development, without needing the real API to be ready."
  - question: "What is the best free API mock server for development?"
    answer: "MSW (Mock Service Worker) is the best choice for React/Vue/Angular apps — it runs in the browser with no server required and uses real fetch/axios/xhr interception. JSON Server is best for quick REST API prototypes that need a real HTTP server."
  - question: "Should I use API mocks in tests?"
    answer: "Use mocks for unit and component tests where you're testing UI behavior, not API integration. Use real APIs (or recorded fixtures) for integration and end-to-end tests that verify the full stack works together."
---

Waiting for the backend to be ready before building the frontend is a productivity killer. API mocking lets you define what responses look like, build against that contract, and test edge cases (loading states, errors, empty data) without any real API infrastructure.

This guide covers the best API mocking tools, when to use each, and how to build a mock setup that actually scales.

---

## Why Mock APIs?

**Independent development**: Frontend and backend teams work in parallel. The API contract (endpoints, request/response shapes) is agreed on first, then both sides implement independently.

**Instant test scenarios**: Test loading states, error messages, empty states, and edge cases by controlling what the mock returns — no need to manipulate a real database.

**Offline development**: Work on a plane, in a coffee shop, or when the staging API is down.

**Faster tests**: Mocked responses return in microseconds vs. real API round trips.

---

## Option 1: MSW (Mock Service Worker)

**Best for: React/Vue/Angular apps, browser + Node.js, production-quality mocking**

MSW intercepts requests at the Service Worker level — it hooks into the browser's native fetch, XHR, and WebSocket — so your app code doesn't know it's using mocks. No code changes required to toggle between mock and real.

**Install:**
```bash
npm install msw --save-dev

# Initialize for browser use
npx msw init public/ --save
```

**Define handlers:**
```javascript
// src/mocks/handlers.js
import { http, HttpResponse } from 'msw';

export const handlers = [
  // GET /api/users
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice', email: 'alice@example.com', role: 'admin' },
      { id: 2, name: 'Bob', email: 'bob@example.com', role: 'user' },
    ]);
  }),

  // GET /api/users/:id
  http.get('/api/users/:id', ({ params }) => {
    const { id } = params;
    if (id === '999') {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ id: Number(id), name: 'Alice', role: 'admin' });
  }),

  // POST /api/users
  http.post('/api/users', async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json(
      { id: Date.now(), ...body },
      { status: 201 }
    );
  }),

  // Simulate network delay
  http.get('/api/slow-endpoint', async () => {
    await new Promise(r => setTimeout(r, 2000));
    return HttpResponse.json({ data: 'finally loaded' });
  }),

  // Simulate error
  http.get('/api/error-endpoint', () => {
    return new HttpResponse(null, {
      status: 500,
      statusText: 'Internal Server Error',
    });
  }),
];
```

**Set up for browser:**
```javascript
// src/mocks/browser.js
import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);
```

**Start the worker (conditional on environment):**
```javascript
// src/main.jsx (React)
async function main() {
  if (process.env.NODE_ENV === 'development') {
    const { worker } = await import('./mocks/browser');
    await worker.start({
      onUnhandledRequest: 'warn',  // Warn when a request has no matching handler
    });
  }
  // ... render app
}
main();
```

**Set up for Node.js (Vitest/Jest):**
```javascript
// src/mocks/server.js
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);
```

```javascript
// vitest.setup.js
import { beforeAll, afterAll, afterEach } from 'vitest';
import { server } from './src/mocks/server';

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

**Override handlers in specific tests:**
```javascript
import { http, HttpResponse } from 'msw';
import { server } from '../mocks/server';

test('shows error message when API fails', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 });
    })
  );

  render(<UserList />);
  expect(await screen.findByText('Something went wrong')).toBeInTheDocument();
});
```

---

## Option 2: JSON Server

**Best for: Quick REST API mock with persistent storage, no code required**

JSON Server turns a JSON file into a full REST API — GET, POST, PUT, PATCH, DELETE — in about 30 seconds.

**Install:**
```bash
npm install -g json-server
```

**Create your data file:**
```json
// db.json
{
  "users": [
    { "id": 1, "name": "Alice", "email": "alice@example.com" },
    { "id": 2, "name": "Bob", "email": "bob@example.com" }
  ],
  "posts": [
    { "id": 1, "title": "Hello World", "userId": 1 },
    { "id": 2, "title": "API Mocking", "userId": 1 }
  ],
  "comments": [
    { "id": 1, "postId": 1, "text": "Great post!" }
  ]
}
```

**Start the server:**
```bash
json-server --watch db.json --port 3001
```

You instantly get:
```
GET  /users
GET  /users/1
POST /users
PUT  /users/1
PATCH /users/1
DELETE /users/1
GET  /posts?userId=1       # Filter by field
GET  /posts?_sort=title    # Sort
GET  /posts?_page=1&_limit=10  # Pagination
GET  /users/1/posts        # Relationships
```

**Custom routes:**
```json
// routes.json
{
  "/api/*": "/$1",
  "/v1/users": "/users"
}
```

```bash
json-server --watch db.json --routes routes.json
```

---

## Option 3: DevPlaybook API Mock

**Best for: Quick browser-based mocking without installing anything**

The [DevPlaybook API Response Mock](/tools/api-response-mock) lets you define a mock endpoint URL and response payload in your browser. Share the mock URL with teammates — it works from any browser, no install required.

Use cases:
- Prototyping UI components when you know the response shape
- Sharing mock endpoints with designers for review
- Quick integration testing when you don't want to run a local server

---

## Option 4: Postman Mock Servers

**Best for: Teams already using Postman, shared mocks across the team**

Postman can host mock servers based on your saved examples:

1. Create a Collection with example responses
2. Create a Mock Server from the Collection
3. Get a public URL (`https://UUID.mock.pstmn.io`)
4. Update your app's API base URL to point to the mock

The mock returns the saved example responses matching each request.

**Limitation**: Postman mock servers require a Postman account and count against your mock usage quota on free plans.

---

## Option 5: Mirage.js

**Best for: Full ORM-style API simulation with relationships**

Mirage.js provides a more sophisticated mock layer with an in-memory database, factories, and serializers:

```javascript
import { createServer } from 'miragejs';

createServer({
  models: {
    user: belongsTo(),
    post: hasMany('comment'),
  },

  factories: {
    user: Factory.extend({
      name(i) { return `User ${i}`; },
      email(i) { return `user${i}@example.com`; },
    }),
    post: Factory.extend({
      title(i) { return `Post ${i}`; },
    }),
  },

  seeds(server) {
    server.createList('user', 10);
    server.create('post', { title: 'Featured Post' });
  },

  routes() {
    this.namespace = 'api';

    this.get('/users', (schema) => schema.users.all());
    this.post('/users', (schema, request) => {
      const body = JSON.parse(request.requestBody);
      return schema.users.create(body);
    });
  },
});
```

Mirage is more complex to set up than MSW but handles relational data more elegantly.

---

## Mocking Patterns That Actually Help

### 1. Simulate Loading States

```javascript
// MSW: add configurable delay
http.get('/api/users', async ({ request }) => {
  const url = new URL(request.url);
  const delay = Number(url.searchParams.get('mock_delay') || 0);
  await new Promise(r => setTimeout(r, delay));
  return HttpResponse.json(users);
});
```

Test your loading skeleton by appending `?mock_delay=2000` in development.

### 2. Simulate Errors Conditionally

```javascript
let failCount = 0;

http.get('/api/data', () => {
  failCount++;
  // Fail the first 2 requests, then succeed (simulate retry behavior)
  if (failCount <= 2) {
    return new HttpResponse(null, { status: 503 });
  }
  return HttpResponse.json({ data: 'success after retry' });
});
```

### 3. Persist State in Mocks

```javascript
// In-memory store for the mock session
let users = [...initialUsers];

http.post('/api/users', async ({ request }) => {
  const body = await request.json();
  const newUser = { id: Date.now(), ...body };
  users.push(newUser);
  return HttpResponse.json(newUser, { status: 201 });
});

http.delete('/api/users/:id', ({ params }) => {
  users = users.filter(u => u.id !== Number(params.id));
  return new HttpResponse(null, { status: 204 });
});
```

### 4. Match Request Body

```javascript
http.post('/api/login', async ({ request }) => {
  const { username, password } = await request.json();

  if (username === 'admin' && password === 'password') {
    return HttpResponse.json({ token: 'mock-jwt-token-admin' });
  }

  return new HttpResponse(
    JSON.stringify({ error: 'Invalid credentials' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
});
```

---

## When NOT to Use Mocks

Mocks give you speed and control — but they can also let you build confidence in code that doesn't work against the real API.

**Don't mock:**
- Integration tests that verify real API contracts
- End-to-end tests that test the full user journey
- Tests that verify authentication/authorization works correctly

**Do mock:**
- Unit tests for UI components
- Tests for error states and edge cases
- Tests for specific data shapes that are hard to create in a real database

A good rule: use MSW for component tests (fast, isolated), use real API calls for E2E tests (slow, accurate).

---

## Related Tools

- [DevPlaybook API Response Mock](/tools/api-response-mock) — Browser-based mock endpoint generator
- [DevPlaybook API Tester](/tools/api-tester) — Test your real or mocked APIs
- [DevPlaybook API Response Formatter](/tools/api-response-formatter) — Inspect and format mock response bodies

---

## Build Faster With the Right Boilerplate

Setting up MSW, TypeScript, and testing infrastructure from scratch takes time. The **[Full-Stack Boilerplate Collection](/products)** includes a React starter with MSW pre-configured for browser and Node.js, Vitest setup, and component test examples — everything wired up so you can start testing immediately.


<div class="affiliate"><p>使用以下連結支持我們：<a href="https://www.cloudflare.com/affiliate/?affiliate=devplaybook">Cloudflare</a> | <a href="https://www.digitalocean.com/?ref=devplaybook">DigitalOcean</a></p></div>