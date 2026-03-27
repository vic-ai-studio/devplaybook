---
title: "Vitest Complete Guide: Setup, Unit Testing, Mocking, and Coverage in TypeScript"
description: "The complete Vitest guide for TypeScript projects. Learn how to set up Vitest, write unit and integration tests, use mocks and spies, configure coverage, and integrate with React and Node.js — with 10+ practical examples."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["vitest", "testing", "typescript", "unit-testing", "mocking", "coverage", "react", "vite", "nodejs"]
readingTime: "15 min read"
---

Vitest is a Vite-native testing framework that has rapidly become the default choice for modern JavaScript projects. It uses the same configuration as Vite, supports TypeScript and JSX out of the box, runs tests in parallel using worker threads, and delivers a Jest-compatible API — meaning most Jest tests run in Vitest without changes.

This guide covers everything you need to go from zero to a fully configured test suite: installation, configuration, writing tests, mocking dependencies, testing React components, generating coverage reports, and common patterns for real-world projects.

## TL;DR

- Install with `npm install -D vitest` — zero configuration for Vite projects
- Test files: `*.test.ts`, `*.spec.ts`, or files inside `__tests__/`
- API mirrors Jest: `describe`, `it`, `expect`, `beforeEach`, `afterEach`, `vi.fn()`, `vi.mock()`
- Use `vi.mock()` for module mocking, `vi.spyOn()` for spies
- Coverage via `@vitest/coverage-v8` or `@vitest/coverage-istanbul`
- `vitest --ui` gives you an interactive browser-based test runner
- In-source testing with `import.meta.vitest` lets you colocate tests with implementation

---

## Why Vitest in 2026

The JavaScript testing landscape has Jest as the incumbent — battle-tested, with a massive ecosystem. Vitest's advantages are practical:

**Speed**: Vitest uses Vite's transform pipeline and worker threads. Cold start is typically under 500ms. Rerunning a changed file in watch mode is near-instant. Jest's startup time (loading Babel, configuring jsdom) is measured in seconds.

**Zero config for Vite projects**: If you're already using Vite, Vitest inherits your `vite.config.ts` — path aliases, plugins, and environment settings all just work.

**Native TypeScript and ESM**: No need for Babel or separate TypeScript preprocessing. Vitest handles `.ts`, `.tsx`, `.mts`, and dynamic `import()` natively.

**Jest compatibility**: Vitest's API is a superset of Jest's. Most existing test suites migrate by replacing `jest.fn()` with `vi.fn()` and updating the config file.

---

## Installation

### For Vite projects

```bash
npm install -D vitest
```

Add a test script to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

### For non-Vite projects (Node.js, etc.)

```bash
npm install -D vitest vite
```

Create `vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,        // enables describe/it/expect without imports
    environment: "node",  // or "jsdom" for browser-like environment
    include: ["**/*.{test,spec}.{ts,tsx,js,jsx}"],
    exclude: ["node_modules", "dist"],
  },
});
```

### For React projects

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
  },
});
```

```typescript
// src/test/setup.ts
import "@testing-library/jest-dom";
```

---

## Writing Your First Tests

Vitest's test API mirrors Jest exactly. If you know Jest, you already know Vitest.

### Basic Unit Test

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
import { describe, it, expect } from "vitest";
import { add, divide } from "./math";

describe("add", () => {
  it("adds two positive numbers", () => {
    expect(add(2, 3)).toBe(5);
  });

  it("handles negative numbers", () => {
    expect(add(-1, 1)).toBe(0);
  });
});

describe("divide", () => {
  it("divides two numbers", () => {
    expect(divide(10, 2)).toBe(5);
  });

  it("throws on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
  });
});
```

### Async Tests

Vitest handles Promises and async/await naturally:

```typescript
// src/api/users.ts
export async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  if (!response.ok) throw new Error(`User not found: ${id}`);
  return response.json();
}
```

```typescript
// src/api/users.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchUser } from "./users";

describe("fetchUser", () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.restoreAllMocks();
  });

  it("returns user data on success", async () => {
    const mockUser = { id: "1", name: "Alice" };

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockUser,
    }));

    const user = await fetchUser("1");
    expect(user).toEqual(mockUser);
  });

  it("throws when user not found", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    await expect(fetchUser("999")).rejects.toThrow("User not found: 999");
  });
});
```

---

## Mocking with vi

Vitest's mock API is comprehensive. `vi` is the equivalent of Jest's `jest` namespace.

### vi.fn() — Mock Functions

```typescript
import { vi, expect } from "vitest";

const mockCallback = vi.fn();
mockCallback("hello");
mockCallback("world");

expect(mockCallback).toHaveBeenCalledTimes(2);
expect(mockCallback).toHaveBeenCalledWith("hello");
expect(mockCallback).toHaveBeenLastCalledWith("world");

// Return values
const mockAdd = vi.fn().mockReturnValue(42);
expect(mockAdd(1, 2)).toBe(42);

// Different return values per call
const mockSequence = vi.fn()
  .mockReturnValueOnce("first")
  .mockReturnValueOnce("second")
  .mockReturnValue("rest");
```

### vi.mock() — Module Mocking

`vi.mock()` replaces an entire module with a mock. It's hoisted to the top of the file (like Jest's `jest.mock()`):

```typescript
// src/services/email.ts
export async function sendEmail(to: string, subject: string, body: string) {
  // Real implementation uses SendGrid/SES
}
```

```typescript
// src/services/user.test.ts
import { describe, it, expect, vi } from "vitest";

// vi.mock is hoisted — this runs before imports
vi.mock("./email", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));

import { createUser } from "./user"; // createUser internally calls sendEmail
import { sendEmail } from "./email";

describe("createUser", () => {
  it("sends a welcome email after creating user", async () => {
    await createUser({ name: "Alice", email: "alice@example.com" });

    expect(sendEmail).toHaveBeenCalledWith(
      "alice@example.com",
      "Welcome!",
      expect.stringContaining("Alice")
    );
  });
});
```

### vi.spyOn() — Spy on Real Implementations

Spies let you track calls without replacing the implementation (unless you want to):

```typescript
import { vi, describe, it, expect, afterEach } from "vitest";
import * as fs from "node:fs";

describe("file operations", () => {
  afterEach(() => {
    vi.restoreAllMocks(); // restore original implementations
  });

  it("reads a config file", () => {
    const spy = vi.spyOn(fs, "readFileSync").mockReturnValue('{"debug": true}');

    const config = loadConfig("./config.json");

    expect(spy).toHaveBeenCalledWith("./config.json", "utf-8");
    expect(config.debug).toBe(true);
  });
});
```

### Mocking Timers

```typescript
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

describe("retry logic", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("retries after delay", async () => {
    const mockFn = vi.fn()
      .mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValue("success");

    const promise = retryWithDelay(mockFn, 1000);

    // Fast-forward time
    await vi.runAllTimersAsync();

    const result = await promise;
    expect(result).toBe("success");
    expect(mockFn).toHaveBeenCalledTimes(2);
  });
});
```

---

## Testing React Components

With `@testing-library/react` and `jsdom`, you can test React components similarly to how you'd test in Jest + JSDOM:

```typescript
// src/components/Counter.tsx
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div>
      <p data-testid="count">Count: {count}</p>
      <button onClick={() => setCount(c => c + 1)}>Increment</button>
      <button onClick={() => setCount(c => c - 1)}>Decrement</button>
    </div>
  );
}
```

```typescript
// src/components/Counter.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Counter } from "./Counter";

describe("Counter", () => {
  it("starts at zero", () => {
    render(<Counter />);
    expect(screen.getByTestId("count")).toHaveTextContent("Count: 0");
  });

  it("increments on button click", () => {
    render(<Counter />);
    fireEvent.click(screen.getByText("Increment"));
    expect(screen.getByTestId("count")).toHaveTextContent("Count: 1");
  });

  it("decrements on button click", () => {
    render(<Counter />);
    fireEvent.click(screen.getByText("Decrement"));
    expect(screen.getByTestId("count")).toHaveTextContent("Count: -1");
  });
});
```

### Testing Async Components

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { UserProfile } from "./UserProfile";
import * as api from "../api/users";

vi.mock("../api/users");

describe("UserProfile", () => {
  it("displays user data after loading", async () => {
    vi.mocked(api.fetchUser).mockResolvedValue({
      id: "1",
      name: "Alice",
      email: "alice@example.com",
    });

    render(<UserProfile userId="1" />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Alice")).toBeInTheDocument();
    });

    expect(screen.queryByText("Loading...")).not.toBeInTheDocument();
  });
});
```

---

## Coverage Configuration

Install a coverage provider:

```bash
npm install -D @vitest/coverage-v8
```

Configure in `vitest.config.ts`:

```typescript
export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"], // terminal, JSON for CI, HTML for browsing
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.d.ts", "src/test/**", "src/**/*.stories.*"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 70,
        statements: 80,
      },
    },
  },
});
```

Run coverage:

```bash
npx vitest run --coverage
# Generates coverage/index.html — open in browser for interactive report
```

---

## In-Source Testing

Vitest supports a unique pattern: writing tests directly in your source files. The test code is removed in production builds:

```typescript
// src/utils/slug.ts
export function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Tests live in the same file, removed in production
if (import.meta.vitest) {
  const { it, expect } = import.meta.vitest;

  it("converts string to slug", () => {
    expect(toSlug("Hello World!")).toBe("hello-world");
    expect(toSlug("  React + TypeScript  ")).toBe("react-typescript");
  });
}
```

Enable in config:

```typescript
export default defineConfig({
  test: {
    includeSource: ["src/**/*.{ts,tsx}"],
  },
  define: {
    "import.meta.vitest": "undefined", // removes tests in production builds
  },
});
```

---

## Snapshot Testing

Vitest supports both inline and file-based snapshots:

```typescript
import { describe, it, expect } from "vitest";
import { formatDate } from "./date";

describe("formatDate", () => {
  it("formats date correctly", () => {
    // Creates/updates __snapshots__/date.test.ts.snap
    expect(formatDate(new Date("2026-03-27"))).toMatchSnapshot();

    // Inline snapshot — stored directly in the test file
    expect(formatDate(new Date("2026-01-01"))).toMatchInlineSnapshot(
      `"January 1, 2026"`
    );
  });
});
```

Update snapshots: `vitest --update-snapshots` or `vitest -u`

---

## Vitest UI

Vitest ships with an optional browser-based test runner that shows test results, file trees, and test durations visually:

```bash
npm install -D @vitest/ui
npx vitest --ui
```

Opens at `http://localhost:51204` by default. Useful for exploring a large test suite, seeing which tests are slow, and running individual tests interactively.

---

## Common Configuration Patterns

### Path Aliases (matching tsconfig.json)

```typescript
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@test": path.resolve(__dirname, "./src/test"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
  },
});
```

### Multiple Environments in One Config

```typescript
import { defineWorkspace } from "vitest/config";

export default defineWorkspace([
  {
    test: {
      name: "unit",
      environment: "node",
      include: ["src/**/*.unit.test.ts"],
    },
  },
  {
    test: {
      name: "browser",
      environment: "jsdom",
      include: ["src/**/*.browser.test.tsx"],
      setupFiles: ["./src/test/setup.ts"],
    },
  },
]);
```

---

## Key Takeaways

- Vitest is zero-config for Vite projects — just `npm install -D vitest` and add test scripts
- `vi.mock()` is hoisted automatically, just like `jest.mock()`
- Use `vi.spyOn()` + `vi.restoreAllMocks()` in `afterEach` to avoid test pollution
- Coverage thresholds in `vitest.config.ts` enforce minimum quality gates in CI
- `vitest --ui` is worth running at least once — it changes how you navigate a large test suite
- In-source testing with `import.meta.vitest` is a great pattern for pure utility functions
- For React testing: `jsdom` environment + `@testing-library/react` + `@testing-library/jest-dom` is the standard stack
