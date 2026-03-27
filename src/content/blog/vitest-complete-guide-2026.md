---
title: "Vitest: The Fast Unit Testing Framework for Vite Projects - 2026 Guide"
description: "Complete guide to Vitest in 2026: setup, configuration, mocking, coverage, watch mode, and a detailed comparison with Jest to help you decide which testing framework fits your project."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["vitest", "testing", "vite", "jest", "unit-testing", "javascript", "typescript"]
readingTime: "11 min read"
---

Testing JavaScript used to mean one thing: Jest. Fast, well-documented, and with a massive ecosystem, Jest became the default choice for unit testing across the JavaScript community.

Then Vite changed frontend development by delivering near-instant builds using native ES modules. But Jest wasn't built for ESM—it still transforms code through Babel or `ts-jest`, adding configuration complexity and overhead. Vitest was built to close that gap.

Vitest is a Vite-powered testing framework that uses the same configuration, transforms, and plugins as your Vite application. Tests run in the same environment your code is built for. No separate Jest config. No `babel.config.js`. No fighting with ESM imports.

This guide covers everything you need to use Vitest effectively in 2026.

---

## What Is Vitest?

Vitest is an open-source testing framework maintained by the Vite team. It's designed to be a drop-in replacement for Jest with added benefits:

- **Vite-native**: Shares your `vite.config.ts`, aliases, and plugins
- **ESM-first**: No transpilation hacks needed for modern JavaScript
- **Fast**: Watch mode re-runs only affected tests using Vite's HMR-like module graph
- **Jest-compatible**: Same API surface—`describe`, `test`, `expect`, `vi.mock()`
- **TypeScript out-of-the-box**: No `@types/jest` or `ts-jest` needed
- **Component testing**: Supports React, Vue, Svelte via `@vitest/browser`

---

## Installation and Setup

### In a Vite Project

```bash
npm install -D vitest
# or
pnpm add -D vitest
# or
bun add -d vitest
```

Add a test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage"
  }
}
```

That's often all you need if you're using Vite. Vitest picks up your `vite.config.ts` automatically.

### Without Vite (Node.js projects)

Vitest works outside of Vite projects too:

```bash
npm install -D vitest
```

Create a `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
  },
});
```

### In a Next.js Project

Next.js uses its own custom Webpack config, so Vitest needs a separate config:

```bash
npm install -D vitest @vitejs/plugin-react jsdom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});
```

---

## Writing Your First Test

```typescript
// src/utils/math.ts
export function add(a: number, b: number): number {
  return a + b;
}

export function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}
```

```typescript
// src/utils/math.test.ts
import { describe, test, expect } from "vitest";
import { add, divide } from "./math";

describe("add", () => {
  test("returns the sum of two numbers", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
  });
});

describe("divide", () => {
  test("divides correctly", () => {
    expect(divide(10, 2)).toBe(5);
  });

  test("throws on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });
});
```

Run the tests:

```bash
npx vitest run
```

---

## Vitest Configuration

The `test` section in `vite.config.ts` (or a dedicated `vitest.config.ts`) controls Vitest behavior.

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Test environment
    environment: "jsdom",  // "node" | "jsdom" | "happy-dom" | "edge-runtime"

    // Make describe/test/expect available globally (no imports needed)
    globals: true,

    // Run setup code before each test file
    setupFiles: ["./src/test/setup.ts"],

    // Include/exclude patterns
    include: ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude: ["node_modules", "dist", "e2e"],

    // Coverage configuration
    coverage: {
      provider: "v8",  // "v8" | "istanbul"
      reporter: ["text", "lcov", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
      },
    },

    // Parallelization
    pool: "threads",  // "forks" | "threads" | "vmThreads"
    poolOptions: {
      threads: {
        singleThread: false,
      },
    },

    // Timeout per test (ms)
    testTimeout: 5000,

    // Reporter
    reporter: "verbose",
  },
});
```

---

## Mocking in Vitest

Vitest uses `vi` (equivalent to `jest` in Jest) for mocking.

### Mocking Functions

```typescript
import { test, expect, vi } from "vitest";

test("tracks function calls", () => {
  const greet = vi.fn((name: string) => `Hello, ${name}!`);

  greet("Alice");
  greet("Bob");

  expect(greet).toHaveBeenCalledTimes(2);
  expect(greet).toHaveBeenCalledWith("Alice");
  expect(greet).toHaveBeenLastCalledWith("Bob");
});
```

### Mocking Modules

```typescript
// services/email.ts
export async function sendEmail(to: string, body: string): Promise<void> {
  // real email sending logic
}
```

```typescript
// order.test.ts
import { test, expect, vi } from "vitest";
import { processOrder } from "./order";

vi.mock("../services/email", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
}));

import { sendEmail } from "../services/email";

test("sends confirmation email on order", async () => {
  await processOrder({ id: "1", total: 50 });
  expect(sendEmail).toHaveBeenCalledWith(
    "customer@example.com",
    expect.stringContaining("Order #1")
  );
});
```

### Mocking with Factory Functions

```typescript
vi.mock("../config", () => ({
  default: {
    apiUrl: "http://localhost:3000",
    timeout: 1000,
  },
}));
```

### Spying

```typescript
import { test, expect, vi, afterEach } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
});

test("logs errors", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

  someFunction();  // function that calls console.error

  expect(consoleSpy).toHaveBeenCalled();
});
```

### Timer Mocking

```typescript
import { test, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

test("debounce delays execution", () => {
  const fn = vi.fn();
  const debounced = debounce(fn, 200);

  debounced();
  debounced();
  debounced();

  expect(fn).not.toHaveBeenCalled();

  vi.advanceTimersByTime(200);

  expect(fn).toHaveBeenCalledOnce();
});
```

---

## Watch Mode

One of Vitest's standout features is its watch mode, which uses Vite's module graph to figure out exactly which tests need to re-run when a file changes.

```bash
vitest
# or explicitly
vitest watch
```

In watch mode, Vitest:
- Monitors file changes
- Re-runs only tests that import the changed file (directly or transitively)
- Skips unrelated tests entirely

This makes the feedback loop in TDD very fast, especially in large codebases.

### Interactive Watch Controls

While in watch mode, press:
- `a` — run all tests
- `f` — re-run only failed tests
- `p` — filter by file name pattern
- `t` — filter by test name
- `q` — quit

---

## Code Coverage

Vitest supports two coverage providers: V8 (fast, native) and Istanbul (more detailed).

### Setup with V8

```bash
npm install -D @vitest/coverage-v8
```

Run coverage:

```bash
npx vitest run --coverage
```

### Setup with Istanbul

```bash
npm install -D @vitest/coverage-istanbul
```

```typescript
// vitest.config.ts
test: {
  coverage: {
    provider: "istanbul",
    reporter: ["text", "lcov", "html"],
  }
}
```

### Viewing Coverage Reports

- **Terminal**: `text` reporter shows a table in the console
- **HTML**: `html` reporter generates `coverage/index.html`—open in a browser for an interactive view
- **LCOV**: Used for CI integrations (Codecov, Coveralls, SonarQube)

### Coverage Thresholds

Fail the test run if coverage drops below a threshold:

```typescript
coverage: {
  thresholds: {
    lines: 80,
    functions: 75,
    branches: 70,
    statements: 80,
  }
}
```

---

## Testing React Components

With `jsdom` or `happy-dom`, Vitest can test React components using React Testing Library.

```bash
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// vitest.config.ts
test: {
  environment: "jsdom",
  setupFiles: ["./src/test/setup.ts"],
}
```

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
```

```typescript
// Button.test.tsx
import { render, screen, fireEvent } from "@testing-library/react";
import { test, expect, vi } from "vitest";
import { Button } from "./Button";

test("calls onClick when clicked", () => {
  const handleClick = vi.fn();
  render(<Button onClick={handleClick}>Submit</Button>);

  fireEvent.click(screen.getByRole("button", { name: /submit/i }));

  expect(handleClick).toHaveBeenCalledOnce();
});

test("is disabled when loading", () => {
  render(<Button loading>Submit</Button>);
  expect(screen.getByRole("button")).toBeDisabled();
});
```

---

## Vitest vs Jest: Detailed Comparison

| Feature | Vitest | Jest |
|---------|--------|------|
| Speed (watch mode) | Very fast (Vite HMR graph) | Moderate (full transform) |
| ESM support | Native | Requires config/flags |
| TypeScript | Native (via Vite) | Requires `ts-jest` or Babel |
| Vite integration | Seamless | Separate config |
| React/Vue support | Via Vite plugins | Via `babel-jest` |
| Snapshot testing | ✅ | ✅ |
| Mock API | `vi.*` | `jest.*` |
| Code coverage | V8 or Istanbul | Istanbul |
| Config file | `vite.config.ts` | `jest.config.js` |
| Ecosystem maturity | Growing | Mature (2016+) |
| Community/docs | Growing | Very large |

### When to Choose Vitest

- Your project already uses Vite (Next.js/Nuxt/SvelteKit/vanilla Vite)
- You want TypeScript without extra configuration
- You write ESM-first code
- You want the fastest possible watch-mode feedback loop

### When to Stick with Jest

- Large existing Jest codebase with complex mocks
- Team is very familiar with Jest and migration cost isn't worth it
- Using Create React App (which still ships with Jest)
- Non-Vite Node.js backends where Jest's stability matters more

### Migrating from Jest to Vitest

Vitest's API is largely compatible with Jest. The migration is usually:

1. Install Vitest and remove Jest
2. Replace `jest.config.js` with `vitest.config.ts`
3. Replace `jest` imports with `vi`: `jest.fn()` → `vi.fn()`
4. Replace `@types/jest` with `@vitest/globals` (if using globals)
5. Update CI scripts

---

## Practical Tips

**Organize test files close to source:**

```
src/
  utils/
    math.ts
    math.test.ts
  components/
    Button.tsx
    Button.test.tsx
```

**Use `test.each` for parameterized tests:**

```typescript
import { test, expect } from "vitest";

test.each([
  [1, 1, 2],
  [1, 2, 3],
  [5, 5, 10],
])("add(%i, %i) === %i", (a, b, expected) => {
  expect(add(a, b)).toBe(expected);
});
```

**Skip and focus tests during development:**

```typescript
test.skip("not ready yet", () => { ... });
test.only("focus on this", () => { ... });
```

**Type-safe mocks:**

```typescript
import { vi } from "vitest";
import type { UserService } from "./user-service";

const mockUserService = {
  getUser: vi.fn<Parameters<UserService["getUser"]>, ReturnType<UserService["getUser"]>>(),
};
```

---

## Summary

Vitest is the clear winner for Vite-based projects. Zero configuration overhead, native TypeScript, ESM support, and a fast watch mode that stays in sync with your build setup.

For pure Node.js backends or projects with a large Jest investment, the migration may not be worth it today—but if you're starting a new project or already on Vite, there's no reason not to use Vitest.

**Quick start:**

```bash
npm install -D vitest
# Add to package.json: "test": "vitest"
npx vitest
```

Explore more testing tools at [DevPlaybook](/tools) — check out our [test runner comparison](/tools/test-runner-comparison) and [code coverage calculator](/tools/coverage-calculator).
