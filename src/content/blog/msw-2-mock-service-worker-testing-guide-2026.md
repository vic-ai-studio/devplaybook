---
title: "MSW 2.0: The Best Way to Mock APIs in Frontend Tests"
description: "A complete guide to Mock Service Worker (MSW) 2.0 — setup, request handlers, Vitest and Jest integration, Storybook mocking, and best practices for realistic API mocking in frontend tests."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["msw", "testing", "vitest", "jest", "mock", "api", "frontend", "storybook"]
readingTime: "9 min read"
---

Most frontend testing setups mock APIs the wrong way. They mock `fetch` directly, mock axios, or mock entire modules — creating tests that pass but don't reflect how the app actually behaves in production.

Mock Service Worker (MSW) fixes this by intercepting requests at the network level. Your app code is unchanged. The same `fetch` calls your components make in production work in tests. The difference is that a service worker (or Node.js interceptor) catches those requests and returns mock responses.

MSW 2.0 introduced a rewritten API with better TypeScript support, cleaner handlers, and proper support for both browser and Node.js environments. This guide covers everything you need to use it effectively.

---

## Why MSW Over Other Approaches

Before setup: why MSW specifically?

**Direct fetch/axios mocking:**
```typescript
// This approach
vi.spyOn(global, 'fetch').mockResolvedValue(...)

// Breaks when:
// - You switch HTTP libraries
// - Your app uses multiple fetching strategies
// - You need to test error states with real HTTP semantics
```

**Module mocking:**
```typescript
// This approach
vi.mock('./api/users')

// Couples your tests to implementation details
// Tests pass even when real API calls would fail
```

**MSW approach:**
```typescript
// The request goes through your real code
// MSW intercepts at the network level
// Tests reflect real usage
```

MSW is particularly valuable when using React Query, SWR, Apollo Client, or any data-fetching library — because you're testing those too, not just your fetch calls.

---

## Installation

```bash
npm install msw@latest --save-dev
```

For browser environments (if you need browser-based tests or Storybook):

```bash
npx msw init public/ --save
```

This generates `public/mockServiceWorker.js` — the service worker file. Commit this file.

---

## Setting Up Request Handlers

Handlers define what happens when a request matches a pattern. MSW 2.0 uses `http` for REST and `graphql` for GraphQL.

Create a central handlers file:

```typescript
// src/mocks/handlers.ts
import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/users', () => {
    return HttpResponse.json([
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ])
  }),

  http.get('/api/users/:id', ({ params }) => {
    const { id } = params
    if (id === '999') {
      return new HttpResponse(null, { status: 404 })
    }
    return HttpResponse.json({ id, name: 'Alice', email: 'alice@example.com' })
  }),

  http.post('/api/users', async ({ request }) => {
    const body = await request.json()
    return HttpResponse.json(
      { id: 3, ...body },
      { status: 201 }
    )
  }),
]
```

Key changes from MSW 1.x: `rest.get` is now `http.get`, and `res(ctx.json(...))` is now `HttpResponse.json(...)`. The new API is cleaner and TypeScript-native.

---

## Node.js Setup for Vitest / Jest

For unit and integration tests running in Node.js:

```typescript
// src/mocks/server.ts
import { setupServer } from 'msw/node'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
```

Configure the server in your test setup file:

```typescript
// src/setupTests.ts
import { server } from './mocks/server'

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

`onUnhandledRequest: 'error'` is important — it causes tests to fail if a request is made that has no handler. This prevents silent failures where your test succeeds because the request was ignored rather than mocked.

**Vitest config:**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./src/setupTests.ts'],
    environment: 'jsdom',
  },
})
```

**Jest config:**

```json
{
  "jest": {
    "setupFilesAfterFramework": ["./src/setupTests.ts"],
    "testEnvironment": "jsdom"
  }
}
```

---

## Writing Tests

With MSW configured, your tests make real-looking API calls:

```typescript
// UserList.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import { UserList } from './UserList'

test('renders list of users', async () => {
  render(<UserList />)

  await waitFor(() => {
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
  })
})
```

No mocking in the test file. The component calls `/api/users`, MSW intercepts, returns the mock data, and the test verifies the rendered output.

---

## Override Handlers Per Test

The default handlers cover the happy path. For error states and edge cases, override handlers inside individual tests:

```typescript
import { http, HttpResponse } from 'msw'
import { server } from '../mocks/server'

test('shows error message when API fails', async () => {
  server.use(
    http.get('/api/users', () => {
      return new HttpResponse(null, { status: 500 })
    })
  )

  render(<UserList />)

  await waitFor(() => {
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
  })
})

test('shows empty state when no users exist', async () => {
  server.use(
    http.get('/api/users', () => {
      return HttpResponse.json([])
    })
  )

  render(<UserList />)

  await waitFor(() => {
    expect(screen.getByText(/no users found/i)).toBeInTheDocument()
  })
})
```

`server.use()` adds a one-time override. `afterEach(() => server.resetHandlers())` in setup removes it after each test, so handlers don't bleed between tests.

---

## Loading States

For testing loading UI, you can delay responses:

```typescript
import { delay } from 'msw'

server.use(
  http.get('/api/users', async () => {
    await delay(500) // or delay('infinite') to freeze indefinitely
    return HttpResponse.json([])
  })
)

test('shows loading spinner', async () => {
  render(<UserList />)
  expect(screen.getByRole('progressbar')).toBeInTheDocument()
})
```

---

## Network Error Simulation

```typescript
import { delay } from 'msw'

server.use(
  http.get('/api/users', () => {
    return HttpResponse.error() // Simulates network failure
  })
)
```

This triggers a network error (not an HTTP error) — useful for testing offline behavior or network timeout handling.

---

## Storybook Integration

MSW integrates with Storybook via `msw-storybook-addon`:

```bash
npm install msw-storybook-addon --save-dev
```

In `.storybook/preview.ts`:

```typescript
import { initialize, mswLoader } from 'msw-storybook-addon'

initialize({
  onUnhandledRequest: 'bypass',
})

export const loaders = [mswLoader]
```

Then define handlers per story:

```typescript
// UserList.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { http, HttpResponse } from 'msw'
import { UserList } from './UserList'

const meta: Meta<typeof UserList> = {
  component: UserList,
}

export default meta
type Story = StoryObj<typeof UserList>

export const WithUsers: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return HttpResponse.json([
            { id: 1, name: 'Alice', email: 'alice@example.com' },
          ])
        }),
      ],
    },
  },
}

export const Empty: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => HttpResponse.json([])),
      ],
    },
  },
}

export const ErrorState: Story = {
  parameters: {
    msw: {
      handlers: [
        http.get('/api/users', () => {
          return new HttpResponse(null, { status: 500 })
        }),
      ],
    },
  },
}
```

This gives you isolated, interactive stories for every API state — no backend required.

---

## GraphQL Handlers

MSW handles GraphQL too:

```typescript
import { graphql, HttpResponse } from 'msw'

export const handlers = [
  graphql.query('GetUsers', () => {
    return HttpResponse.json({
      data: {
        users: [
          { id: '1', name: 'Alice' },
        ],
      },
    })
  }),

  graphql.mutation('CreateUser', ({ variables }) => {
    return HttpResponse.json({
      data: {
        createUser: { id: '2', name: variables.name },
      },
    })
  }),
]
```

---

## Organizing Handlers

As your app grows, keep handlers organized by domain:

```
src/mocks/
  handlers/
    users.ts
    posts.ts
    auth.ts
  handlers.ts   ← re-exports all handlers
  server.ts     ← Node.js setup
  browser.ts    ← Browser setup (if needed)
```

```typescript
// src/mocks/handlers.ts
import { userHandlers } from './handlers/users'
import { postHandlers } from './handlers/posts'
import { authHandlers } from './handlers/auth'

export const handlers = [
  ...authHandlers,
  ...userHandlers,
  ...postHandlers,
]
```

---

## Common Mistakes

**Forgetting `resetHandlers`**: Without this in `afterEach`, test-specific overrides persist into subsequent tests causing flaky behavior.

**Using `onUnhandledRequest: 'warn'` instead of `'error'`**: Warnings are easy to miss. An unhandled request in a test usually means a bug — fail loudly.

**Mocking absolute URLs in tests but relative in production**: If your app uses `/api/users` in production, mock `/api/users` — not `https://api.example.com/users`. Match what the code actually requests.

**Not testing the loading state**: MSW makes it easy to test loading UI. If you're not using `delay()`, you're missing coverage.

---

## The Result

With MSW properly configured:

- Tests use the same code paths as production
- API contract changes break tests immediately
- You can test every API state: success, error, empty, loading, network failure
- Storybook stories work without a running backend
- No more mocking internals you don't own

The investment in setup pays off immediately. Once MSW is running, writing tests for API-dependent components becomes straightforward instead of a mocking puzzle.

---

*Check out our [JSON formatter](/tools/json-formatter) for cleaning up API response fixtures, and the [regex playground](/tools/regex-playground) for building request URL pattern matchers.*
