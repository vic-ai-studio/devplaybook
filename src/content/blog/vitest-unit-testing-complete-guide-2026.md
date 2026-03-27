---
title: "Vitest Unit Testing: Complete Setup Guide for 2026"
description: "Learn Vitest from zero to production: installation, test syntax, mocking, coverage reports, Vitest UI, and Vitest vs Jest migration. Practical guide for Vite and non-Vite projects."
date: "2026-03-28"
author: "DevPlaybook Team"
readingTime: "12 min read"
tags: ["vitest", "testing", "javascript", "typescript", "unit-testing", "mocking"]
draft: false
---

# Vitest Unit Testing: Complete Setup Guide for 2026

Vitest is the fastest unit testing framework for JavaScript and TypeScript in 2026. If you're starting a new project — or tired of Jest's slow startup times — this guide gets you running with a complete Vitest setup in under 10 minutes.

We cover: installation for Vite and non-Vite projects, core test syntax, mocking strategies, code coverage, the Vitest UI, and how to migrate from Jest.

## Why Vitest in 2026

Vitest shares Vite's transform pipeline, meaning your tests run the same code your app does — no separate Babel config, no CommonJS/ESM compatibility hacks. The result:

- **Sub-100ms startup** on most projects (Jest often takes 3–8 seconds)
- **Native TypeScript** without ts-jest or Babel transforms
- **Jest-compatible API** — `describe`, `it`, `expect`, `vi` (replaces `jest`)
- **Browser mode** for DOM tests using real browsers
- **Built-in coverage** via v8 or istanbul

The trade-off: Vitest is a younger ecosystem. If you rely on obscure Jest plugins with no Vitest equivalent, migration takes more planning.

## Installation

### In a Vite Project

```bash
npm install -D vitest
# or
pnpm add -D vitest
```

Update `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'

export default defineConfig({
  test: {
    // Vitest config goes here
    globals: true,           // optional: skip importing describe/it/expect
    environment: 'node',     // or 'jsdom' for DOM tests
    include: ['**/*.{test,spec}.{js,ts}'],
  },
})
```

Add the test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Without Vite (Standalone)

Vitest works in any Node project, not just Vite ones:

```bash
npm install -D vitest @vitest/ui
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
})
```

## Core Test Syntax

Vitest's API mirrors Jest closely. If you know Jest, you already know Vitest.

### Basic Tests

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { add, multiply } from './math'

describe('math utilities', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('multiplies numbers', () => {
    expect(multiply(4, 5)).toBe(20)
  })

  it('handles negative numbers', () => {
    expect(add(-1, 1)).toBe(0)
    expect(multiply(-2, 3)).toBe(-6)
  })
})
```

### Async Tests

```typescript
import { it, expect } from 'vitest'
import { fetchUser } from './api'

it('fetches user data', async () => {
  const user = await fetchUser(1)
  expect(user.id).toBe(1)
  expect(user.name).toBeDefined()
})

it('rejects on invalid id', async () => {
  await expect(fetchUser(-1)).rejects.toThrow('Invalid user ID')
})
```

### Test Hooks

```typescript
import { describe, it, expect, beforeEach, afterAll } from 'vitest'
import { Database } from './db'

describe('Database', () => {
  let db: Database

  beforeEach(() => {
    db = new Database(':memory:')
    db.seed()
  })

  afterAll(() => {
    db.close()
  })

  it('queries records', async () => {
    const records = await db.query('SELECT * FROM users')
    expect(records).toHaveLength(3)
  })
})
```

### Snapshot Testing

```typescript
import { it, expect } from 'vitest'
import { renderToString } from './renderer'

it('renders user card', () => {
  const html = renderToString({ name: 'Alice', role: 'Admin' })
  expect(html).toMatchSnapshot()
})
```

Run with `--update-snapshots` to regenerate snapshots after intentional changes.

## Mocking with `vi`

Vitest's mock API (`vi`) replaces Jest's `jest` object.

### Mocking Modules

```typescript
import { vi, it, expect, beforeEach } from 'vitest'
import { sendEmail } from './email'
import { notifyUser } from './notifications'

vi.mock('./email', () => ({
  sendEmail: vi.fn(),
}))

describe('notifyUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends an email on signup', async () => {
    await notifyUser('alice@example.com', 'signup')
    expect(sendEmail).toHaveBeenCalledOnce()
    expect(sendEmail).toHaveBeenCalledWith({
      to: 'alice@example.com',
      template: 'signup',
    })
  })
})
```

### Mocking Functions (Spies)

```typescript
import { vi, it, expect } from 'vitest'

it('calls the callback on success', () => {
  const callback = vi.fn()
  const onError = vi.fn()

  performAction({ onSuccess: callback, onError })

  expect(callback).toHaveBeenCalledOnce()
  expect(onError).not.toHaveBeenCalled()
})
```

### Mocking Timers

```typescript
import { vi, it, expect, beforeEach, afterEach } from 'vitest'
import { debounce } from './utils'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

it('debounces function calls', () => {
  const fn = vi.fn()
  const debounced = debounce(fn, 300)

  debounced()
  debounced()
  debounced()

  expect(fn).not.toHaveBeenCalled()
  vi.advanceTimersByTime(300)
  expect(fn).toHaveBeenCalledOnce()
})
```

### Mocking `fetch`

```typescript
import { vi, it, expect, beforeEach } from 'vitest'

beforeEach(() => {
  global.fetch = vi.fn()
})

it('handles fetch errors gracefully', async () => {
  vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

  await expect(getWeather('Paris')).rejects.toThrow('Network error')
})

it('parses weather data', async () => {
  vi.mocked(fetch).mockResolvedValueOnce({
    ok: true,
    json: async () => ({ temp: 22, city: 'Paris' }),
  } as Response)

  const data = await getWeather('Paris')
  expect(data.temp).toBe(22)
})
```

## Code Coverage

Install the coverage provider:

```bash
npm install -D @vitest/coverage-v8
# or istanbul (more accurate but slower)
npm install -D @vitest/coverage-istanbul
```

Configure in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.ts', 'src/types/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
})
```

Run coverage:

```bash
vitest run --coverage
```

HTML reports are generated in `coverage/index.html` — open it to see line-by-line coverage.

## Vitest UI

Vitest includes a beautiful web-based test runner UI:

```bash
npm install -D @vitest/ui
vitest --ui
```

This opens `http://localhost:51204` with:
- Real-time test results as you edit files
- File tree with pass/fail status
- Inline coverage view
- Test duration metrics

It's one of the biggest quality-of-life improvements over Jest's CLI-only output.

## DOM Testing with jsdom

For testing React, Vue, or Svelte components:

```bash
npm install -D @testing-library/dom @testing-library/user-event jsdom
```

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
```

```typescript
// src/test/setup.ts
import '@testing-library/jest-dom'  // adds .toBeInTheDocument() etc.
```

```typescript
// Button.test.ts
import { it, expect } from 'vitest'
import { render, screen } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import { Button } from './Button'

it('calls onClick when clicked', async () => {
  const onClick = vi.fn()
  render(Button({ label: 'Submit', onClick }))

  await userEvent.click(screen.getByText('Submit'))

  expect(onClick).toHaveBeenCalledOnce()
})
```

## Migrating from Jest

Vitest's Jest compatibility means most migrations are straightforward:

| Jest | Vitest |
|------|--------|
| `jest.fn()` | `vi.fn()` |
| `jest.mock()` | `vi.mock()` |
| `jest.spyOn()` | `vi.spyOn()` |
| `jest.clearAllMocks()` | `vi.clearAllMocks()` |
| `jest.useFakeTimers()` | `vi.useFakeTimers()` |
| `jest.resetModules()` | `vi.resetModules()` |

**Steps to migrate:**

1. Install Vitest, remove `jest` and `babel-jest`
2. Replace `jest` imports with `vi` in test files (global search/replace)
3. Move Jest config from `jest.config.js` to `vitest.config.ts`
4. Add TypeScript types: `/// <reference types="vitest" />`
5. Run tests: `vitest run`

Most projects migrate in under an hour. The main friction comes from Jest-specific plugins (e.g., `jest-puppeteer`) that have no Vitest equivalent — check the Vitest plugin ecosystem first.

## Watch Mode and CI

**Watch mode** (default when running `vitest`): reruns affected tests on file change. Smart — it only reruns tests that import the changed module.

**CI mode** (`vitest run`): single pass, exits with code 1 on failures. Use this in your CI pipeline:

```yaml
# GitHub Actions example
- name: Run tests
  run: pnpm test:run

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: coverage/lcov.info
```

## Parallel Test Execution

Vitest runs test files in parallel by default across worker threads. To control parallelism:

```typescript
export default defineConfig({
  test: {
    pool: 'threads',          // 'threads' (default), 'forks', or 'vmThreads'
    poolOptions: {
      threads: {
        minThreads: 1,
        maxThreads: 4,
      },
    },
    // Run tests in the same file sequentially
    sequence: {
      concurrent: false,
    },
  },
})
```

For tests that share global state (e.g., a database), use `--pool=forks` for process-level isolation, or use `--reporter=verbose` to debug flaky parallel tests.

## Summary

Vitest is the clear choice for new projects in 2026:

- **Start with Vite?** Vitest is already configured — just add the `test` block.
- **Existing Jest project?** Migration takes 1–2 hours for most codebases.
- **DOM tests?** Use `environment: 'jsdom'` with Testing Library.
- **Coverage?** `@vitest/coverage-v8` covers 95% of use cases.

The Vitest UI alone makes it worth switching from Jest — real-time visual feedback is a massive developer experience win.
