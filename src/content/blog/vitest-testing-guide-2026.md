---
title: "Vitest Complete Guide 2026: Fast Unit Testing for Modern JavaScript"
description: "Master Vitest in 2026 — the fastest JavaScript testing framework. Learn setup, writing tests, mocking, snapshot testing, coverage, and CI integration with practical code examples."
author: "DevPlaybook Team"
date: "2026-03-28"
readingTime: "14 min read"
tags: ["vitest", "testing", "javascript", "typescript", "unit-testing", "vite"]
---

# Vitest Complete Guide 2026: Fast Unit Testing for Modern JavaScript

Vitest has become the default testing framework for modern JavaScript projects. Built on top of Vite, it delivers near-instant startup times, a familiar Jest-compatible API, and native TypeScript support — all without complex configuration.

If you're building with Vite, SvelteKit, Nuxt 3, or any modern JS stack, Vitest is almost certainly the right choice. This guide walks through everything from installation to CI pipelines.

## Why Vitest Over Jest in 2026

Jest is battle-tested, but its architecture dates from the CommonJS era. Vitest was designed from day one for the ES module world.

| Feature | Jest | Vitest |
|---|---|---|
| Cold start | 2–8s | 200–500ms |
| HMR / watch mode | Slow reruns | Near-instant |
| TypeScript | Requires Babel/ts-jest | Native |
| ESM support | Experimental | First-class |
| Config file | jest.config.js | vite.config.ts |
| Coverage | istanbul | v8 or istanbul |
| In-source tests | No | Yes |
| UI mode | No | Yes (browser UI) |

The decisive advantage: **Vitest reuses your Vite config**. Aliases, plugins, environment variables — you configure them once, and they work in tests automatically. No more "it works in the app but fails in tests" because the transform pipeline differs.

## Installation and Setup

### New Vite Project

If you're starting fresh, create a Vite project and add Vitest:

```bash
npm create vite@latest my-app -- --template vanilla-ts
cd my-app
npm install -D vitest
```

### Existing Vite Project

```bash
npm install -D vitest
# For React component testing:
npm install -D @vitest/coverage-v8 jsdom @testing-library/react @testing-library/jest-dom
```

### Configuration

Add test config to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,          // Use describe/it/expect without imports
    environment: 'jsdom',   // For DOM/browser tests
    setupFiles: './src/test/setup.ts',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'src/test/'],
    },
  },
})
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Writing Your First Tests

Vitest's API mirrors Jest almost exactly. If you've used Jest, you're already 90% there.

### Basic Test Structure

```typescript
// src/utils/math.test.ts
import { describe, it, expect } from 'vitest'
import { add, multiply, divide } from './math'

describe('math utils', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5)
  })

  it('multiplies two numbers', () => {
    expect(multiply(4, 5)).toBe(20)
  })

  it('throws on division by zero', () => {
    expect(() => divide(10, 0)).toThrow('Division by zero')
  })
})
```

The source file:

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b
}

export function multiply(a: number, b: number): number {
  return a * b
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero')
  return a / b
}
```

### Assertions Reference

```typescript
// Equality
expect(value).toBe(42)          // strict equality (===)
expect(value).toEqual({ a: 1 }) // deep equality (objects/arrays)
expect(value).not.toBe(0)

// Truthiness
expect(value).toBeTruthy()
expect(value).toBeFalsy()
expect(value).toBeNull()
expect(value).toBeUndefined()
expect(value).toBeDefined()

// Numbers
expect(0.1 + 0.2).toBeCloseTo(0.3, 5)
expect(n).toBeGreaterThan(0)
expect(n).toBeLessThanOrEqual(100)

// Strings
expect(str).toContain('hello')
expect(str).toMatch(/pattern/)
expect(str).toHaveLength(5)

// Arrays
expect(arr).toContain('item')
expect(arr).toHaveLength(3)
expect(arr).toEqual(expect.arrayContaining(['a', 'b']))

// Objects
expect(obj).toHaveProperty('key', 'value')
expect(obj).toMatchObject({ name: 'Alice' })

// Errors
expect(() => fn()).toThrow()
expect(() => fn()).toThrow(TypeError)
expect(() => fn()).toThrow('message')
```

## Mocking with `vi`

Vitest provides `vi` (equivalent to Jest's `jest`) for all mocking operations.

### Function Mocks

```typescript
import { vi, describe, it, expect, beforeEach } from 'vitest'

describe('user service', () => {
  const mockFetch = vi.fn()

  beforeEach(() => {
    mockFetch.mockReset()
    global.fetch = mockFetch
  })

  it('fetches user data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 1, name: 'Alice' }),
    })

    const user = await fetchUser(1)
    expect(user.name).toBe('Alice')
    expect(mockFetch).toHaveBeenCalledWith('/api/users/1')
  })

  it('handles fetch errors', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))
    await expect(fetchUser(1)).rejects.toThrow('Network error')
  })
})
```

### Module Mocking

```typescript
import { vi, describe, it, expect } from 'vitest'

// Mock an entire module
vi.mock('./emailService', () => ({
  sendEmail: vi.fn().mockResolvedValue({ sent: true }),
}))

// Or mock with factory for partial mocking
vi.mock('./config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./config')>()
  return {
    ...actual,
    API_URL: 'http://localhost:3000',
  }
})
```

### Spying on Methods

```typescript
import { vi, it, expect } from 'vitest'

it('logs errors to console', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

  triggerError() // function that calls console.error

  expect(consoleSpy).toHaveBeenCalledWith('Error: something went wrong')
  consoleSpy.mockRestore()
})
```

### Mocking Timers

```typescript
import { vi, it, expect, beforeEach, afterEach } from 'vitest'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

it('debounced function calls handler after delay', () => {
  const handler = vi.fn()
  const debounced = debounce(handler, 300)

  debounced('call 1')
  debounced('call 2')

  expect(handler).not.toHaveBeenCalled()

  vi.advanceTimersByTime(300)
  expect(handler).toHaveBeenCalledOnce()
  expect(handler).toHaveBeenCalledWith('call 2')
})
```

## Testing React Components

Install the required packages:

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

Setup file at `src/test/setup.ts`:

```typescript
import '@testing-library/jest-dom'
```

### Component Tests

```typescript
// src/components/Counter.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { Counter } from './Counter'

describe('Counter', () => {
  it('renders initial count', () => {
    render(<Counter initialCount={0} />)
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })

  it('increments on button click', () => {
    render(<Counter initialCount={5} />)
    fireEvent.click(screen.getByRole('button', { name: /increment/i }))
    expect(screen.getByText('Count: 6')).toBeInTheDocument()
  })

  it('does not go below 0', () => {
    render(<Counter initialCount={0} />)
    fireEvent.click(screen.getByRole('button', { name: /decrement/i }))
    expect(screen.getByText('Count: 0')).toBeInTheDocument()
  })
})
```

### Testing Async Components

```typescript
import { render, screen, waitFor } from '@testing-library/react'
import { vi, it, expect } from 'vitest'

vi.mock('../api', () => ({
  fetchProducts: vi.fn().mockResolvedValue([
    { id: 1, name: 'Widget A' },
    { id: 2, name: 'Widget B' },
  ]),
}))

it('loads and displays products', async () => {
  render(<ProductList />)

  expect(screen.getByText(/loading/i)).toBeInTheDocument()

  await waitFor(() => {
    expect(screen.getByText('Widget A')).toBeInTheDocument()
    expect(screen.getByText('Widget B')).toBeInTheDocument()
  })
})
```

## Snapshot Testing

Snapshots catch unintended UI changes:

```typescript
import { render } from '@testing-library/react'
import { it, expect } from 'vitest'

it('renders correctly', () => {
  const { container } = render(<Button variant="primary">Click me</Button>)
  expect(container).toMatchSnapshot()
})
```

Update snapshots when changes are intentional:

```bash
vitest run --update
# or in watch mode: press 'u'
```

Use inline snapshots for small components — they live in the test file itself:

```typescript
it('formats currency', () => {
  expect(formatCurrency(1234.5, 'USD')).toMatchInlineSnapshot(
    `"$1,234.50"`
  )
})
```

## Coverage Reports

```bash
npm install -D @vitest/coverage-v8
vitest run --coverage
```

Coverage config in `vite.config.ts`:

```typescript
test: {
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html', 'lcov'],
    include: ['src/**'],
    exclude: ['src/**/*.stories.*', 'src/test/**'],
    thresholds: {
      lines: 80,
      functions: 80,
      branches: 75,
      statements: 80,
    },
  },
}
```

The `html` reporter generates a visual coverage map — open `coverage/index.html` in a browser to explore uncovered lines.

## In-Source Testing

Vitest's unique feature: embed tests directly in source files. No separate test file needed:

```typescript
// src/utils/slugify.ts
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .trim()
}

if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest
  it('slugifies a title', () => {
    expect(slugify('Hello World!')).toBe('hello-world')
    expect(slugify('  Leading spaces  ')).toBe('leading-spaces')
    expect(slugify('Special @#$% chars')).toBe('special-chars')
  })
}
```

Enable in config:

```typescript
test: {
  includeSource: ['src/**/*.ts'],
}
```

These tests tree-shake out in production builds — zero runtime cost.

## Vitest UI Mode

```bash
npm install -D @vitest/ui
vitest --ui
```

Opens a browser interface at `http://localhost:51204` with:
- Real-time test status updates
- File-tree navigation
- Coverage visualization
- Module graph viewer

Essential for debugging complex test suites.

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
```

### Performance Tips for CI

```typescript
// vite.config.ts — optimize for CI
test: {
  // Run tests sequentially in CI to avoid resource contention
  pool: process.env.CI ? 'forks' : 'threads',
  // Increase timeout for slower CI runners
  testTimeout: process.env.CI ? 10000 : 5000,
  // Only run tests once in CI (no watch mode)
  watch: false,
}
```

## Common Patterns

### Testing Custom Hooks

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useCounter } from './useCounter'

describe('useCounter', () => {
  it('initializes with given value', () => {
    const { result } = renderHook(() => useCounter(10))
    expect(result.current.count).toBe(10)
  })

  it('increments count', () => {
    const { result } = renderHook(() => useCounter(0))
    act(() => result.current.increment())
    expect(result.current.count).toBe(1)
  })
})
```

### Testing Error Boundaries

```typescript
it('catches rendering errors', () => {
  const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

  render(
    <ErrorBoundary fallback={<div>Error occurred</div>}>
      <ComponentThatThrows />
    </ErrorBoundary>
  )

  expect(screen.getByText('Error occurred')).toBeInTheDocument()
  spy.mockRestore()
})
```

### Parameterized Tests with `it.each`

```typescript
it.each([
  ['hello world', 'hello-world'],
  ['  trimmed  ', 'trimmed'],
  ['ALL CAPS', 'all-caps'],
  ['special!@#chars', 'specialchars'],
])('slugify(%s) === %s', (input, expected) => {
  expect(slugify(input)).toBe(expected)
})
```

## Migrating from Jest

Most Jest tests run in Vitest without changes. The main differences:

1. **Replace `jest` with `vi`** for mocking:
   ```typescript
   // Before
   jest.fn(), jest.mock(), jest.spyOn()
   // After
   vi.fn(), vi.mock(), vi.spyOn()
   ```

2. **Update config file** from `jest.config.js` to `vite.config.ts` (test section).

3. **Remove Babel** — Vitest handles TypeScript natively.

4. **Update `moduleNameMapper`** — use Vite's `resolve.alias` instead.

5. **Test environment** — set `environment: 'jsdom'` if you were using jsdom in Jest.

For large codebases, run both in parallel during migration:

```bash
# package.json
"test:jest": "jest",
"test:vitest": "vitest run",
"test:both": "npm run test:jest && npm run test:vitest"
```

## Key Takeaways

- **Zero-config for Vite projects** — add `vitest` as a dev dependency and you're running
- **Vi API mirrors Jest** — minimal learning curve for Jest users
- **In-source tests** are unique to Vitest — great for utility modules
- **UI mode** (`vitest --ui`) dramatically improves the debugging experience
- **Coverage thresholds** in config enforce quality gates automatically
- **Fake timers** with `vi.useFakeTimers()` make time-dependent tests deterministic
- **Watch mode** with HMR makes test-driven development fast and responsive

Vitest is not just a Jest replacement — it's a rethinking of JavaScript testing for the modern toolchain. The performance gains alone make the migration worthwhile for any active project.
