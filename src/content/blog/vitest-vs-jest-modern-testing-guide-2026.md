---
title: "Vitest vs Jest: Modern JavaScript Testing Guide 2026"
description: "Should you migrate from Jest to Vitest in 2026? A practical comparison covering setup speed, ESM support, React Testing Library, snapshot testing, coverage, mocking, and migration strategies with real benchmarks."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["vitest", "jest", "testing", "javascript", "typescript", "react", "unit-testing", "vite"]
readingTime: "14 min read"
---

Jest has dominated JavaScript testing for nearly a decade. Vitest, built on top of Vite, launched in 2021 and has grown to challenge Jest's position — particularly for TypeScript-heavy and Vite-based projects. But is it worth migrating?

This guide gives you a concrete answer: what Vitest does better, what Jest still does better, how to migrate, and how to set up each from scratch for 2026 projects.

---

## The Short Answer

| Use Vitest when | Use Jest when |
|-----------------|---------------|
| Your project uses Vite (React, Vue, Svelte) | You have an existing Jest suite that works |
| You need fast TypeScript tests with no config | You need stable, mature ecosystem (50k+ packages) |
| You want native ESM support | Your project uses CommonJS deeply |
| You want HMR-style watch mode | You need Jest-specific plugins/matchers |
| Starting a new project in 2026 | Your team knows Jest and has no pain points |

---

## Performance Comparison

The biggest practical difference: startup time and watch mode.

| Metric | Vitest | Jest |
|--------|--------|------|
| Cold start (TypeScript project) | ~400ms | ~2-4s |
| Watch mode re-run | Milliseconds (HMR) | 1-3s |
| First run (100 test files) | ~8s | ~20s |
| Memory usage | Lower | Higher |
| ESM support | Native | Requires transform config |

Vitest uses Vite's transform pipeline, which means the same config that compiles your app also compiles your tests — no separate Babel setup, no `ts-jest`, no transform configuration.

---

## Setting Up Vitest from Scratch

### Installation

```bash
npm install -D vitest @vitest/coverage-v8
# Or for React:
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

### Configuration

`vitest.config.ts`:

```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",        // For React components
    globals: true,               // describe/it/expect without imports
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "node_modules/**",
        "src/test/**",
        "**/*.d.ts",
        "**/*.config.*",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
```

Setup file `src/test/setup.ts`:

```typescript
import "@testing-library/jest-dom";
// Any global setup: MSW server, test database, etc.
```

`package.json` scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui"
  }
}
```

---

## Writing Tests in Vitest

Vitest uses the same API as Jest. If you know Jest, you already know Vitest.

### Unit Tests

```typescript
// src/utils/math.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { add, multiply, divide, fibonacci } from "./math";

describe("math utilities", () => {
  it("adds two numbers", () => {
    expect(add(2, 3)).toBe(5);
    expect(add(-1, 1)).toBe(0);
    expect(add(0.1, 0.2)).toBeCloseTo(0.3);
  });

  it("multiplies two numbers", () => {
    expect(multiply(4, 5)).toBe(20);
    expect(multiply(-3, 2)).toBe(-6);
  });

  it("throws on division by zero", () => {
    expect(() => divide(10, 0)).toThrow("Division by zero");
    expect(() => divide(10, 0)).toThrowError(/zero/);
  });

  it("calculates fibonacci", () => {
    expect(fibonacci(0)).toBe(0);
    expect(fibonacci(1)).toBe(1);
    expect(fibonacci(10)).toBe(55);
  });
});
```

### Async Tests

```typescript
// src/api/users.test.ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchUser, createUser } from "./users";

describe("user API", () => {
  afterEach(() => vi.restoreAllMocks());

  it("fetches a user by id", async () => {
    const user = await fetchUser("user-123");

    expect(user).toMatchObject({
      id: "user-123",
      email: expect.stringContaining("@"),
    });
  });

  it("throws on 404", async () => {
    await expect(fetchUser("nonexistent-id")).rejects.toThrow("User not found");
  });

  it("creates a user and returns it", async () => {
    const newUser = await createUser({ name: "Alice", email: "alice@example.com" });

    expect(newUser).toMatchObject({
      id: expect.any(String),
      name: "Alice",
      email: "alice@example.com",
    });
  });
});
```

---

## Mocking in Vitest

### `vi.mock()` — Module Mocking

```typescript
// Mocking a module
import { describe, it, expect, vi } from "vitest";
import { sendEmail } from "../email";
import { notifyUser } from "./notifications";

// Auto-mock the entire module
vi.mock("../email");

describe("notifications", () => {
  it("sends email when notifying user", async () => {
    // sendEmail is now a mock function
    const mockSendEmail = vi.mocked(sendEmail);
    mockSendEmail.mockResolvedValue({ messageId: "msg-123", success: true });

    await notifyUser("user@example.com", "Your order shipped");

    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: expect.stringContaining("order"),
      body: expect.any(String),
    });
  });
});
```

### `vi.spyOn()` — Spying on Methods

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as dateUtils from "../utils/date";

describe("time-dependent behavior", () => {
  beforeEach(() => {
    // Freeze time
    vi.spyOn(Date, "now").mockReturnValue(new Date("2026-03-28T12:00:00Z").getTime());
  });

  afterEach(() => vi.restoreAllMocks());

  it("returns correct greeting based on time", () => {
    const greeting = getGreeting();
    expect(greeting).toBe("Good afternoon");
  });
});
```

### Mocking Fetch (without MSW)

```typescript
import { vi } from "vitest";

global.fetch = vi.fn();

function mockFetch(data: unknown, status = 200) {
  vi.mocked(fetch).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response);
}

it("fetches data from API", async () => {
  mockFetch({ users: [{ id: "1", name: "Alice" }] });

  const result = await getUsers();

  expect(result).toHaveLength(1);
  expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/api/users"), expect.any(Object));
});
```

### Mocking with MSW (Recommended for HTTP)

```bash
npm install -D msw
```

`src/test/handlers.ts`:

```typescript
import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("/api/users/:id", ({ params }) => {
    return HttpResponse.json({
      id: params.id,
      name: "Alice",
      email: "alice@example.com",
    });
  }),

  http.post("/api/users", async ({ request }) => {
    const body = await request.json() as { name: string; email: string };
    return HttpResponse.json(
      { id: "new-id", ...body },
      { status: 201 }
    );
  }),

  http.get("/api/users/:id", ({ params }) => {
    if (params.id === "nonexistent") {
      return HttpResponse.json({ error: "Not found" }, { status: 404 });
    }
    return HttpResponse.json({ id: params.id, name: "User" });
  }),
];
```

`src/test/setup.ts`:

```typescript
import { setupServer } from "msw/node";
import { handlers } from "./handlers";
import "@testing-library/jest-dom";

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

export { server };
```

---

## React Testing Library with Vitest

```tsx
// src/components/UserCard.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UserCard } from "./UserCard";
import { server } from "../test/setup";
import { http, HttpResponse } from "msw";

describe("UserCard", () => {
  it("renders user information", () => {
    const user = {
      id: "1",
      name: "Alice Johnson",
      email: "alice@example.com",
      role: "admin" as const,
    };

    render(<UserCard user={user} />);

    expect(screen.getByText("Alice Johnson")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.getByRole("badge")).toHaveTextContent("admin");
  });

  it("calls onDelete when delete button clicked", async () => {
    const user = userEvent.setup();
    const mockDelete = vi.fn();
    const testUser = { id: "1", name: "Alice", email: "alice@example.com", role: "admin" as const };

    render(<UserCard user={testUser} onDelete={mockDelete} />);

    await user.click(screen.getByRole("button", { name: /delete/i }));

    expect(mockDelete).toHaveBeenCalledWith("1");
  });

  it("shows loading state while fetching", async () => {
    // Override handler to delay response
    server.use(
      http.get("/api/users/:id", async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return HttpResponse.json({ id: "1", name: "Alice" });
      })
    );

    render(<UserCardById userId="1" />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("progressbar")).not.toBeInTheDocument());
  });
});
```

---

## Snapshot Testing

```tsx
import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Button } from "./Button";

describe("Button snapshots", () => {
  it("matches primary variant snapshot", () => {
    const { container } = render(<Button variant="primary">Click me</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });

  it("matches inline snapshot", () => {
    const { container } = render(<Button variant="danger" size="sm">Delete</Button>);
    // Inline snapshot — stored in test file, not separate .snap file
    expect(container.innerHTML).toMatchInlineSnapshot(
      `"<button class="rounded font-medium transition-colors bg-red-600 text-white hover:bg-red-700 px-3 py-1 text-sm">Delete</button>"`
    );
  });
});
```

Update snapshots:

```bash
vitest run --update-snapshots
# Or in watch mode: press 'u'
```

---

## Coverage

```bash
vitest run --coverage
```

Output:

```
 % Coverage report from v8
--------------------------|---------|----------|---------|---------|
File                      | % Stmts | % Branch | % Funcs | % Lines |
--------------------------|---------|----------|---------|---------|
All files                 |   87.2  |   82.1   |   91.3  |   87.2  |
 src/utils/math.ts        |  100.0  |  100.0   |  100.0  |  100.0  |
 src/utils/validation.ts  |   95.2  |   88.4   |  100.0  |   95.2  |
 src/components/Button.tsx|   75.0  |   66.7   |   80.0  |   75.0  |
--------------------------|---------|----------|---------|---------|
```

View detailed HTML report:

```bash
vitest run --coverage --reporter=html
open coverage/index.html
```

---

## Migrating from Jest to Vitest

Most migrations take 30-60 minutes for a typical project.

### Step 1: Install Vitest, Remove Jest

```bash
npm uninstall jest babel-jest ts-jest @types/jest jest-environment-jsdom
npm install -D vitest @vitest/coverage-v8 jsdom
```

### Step 2: Create vitest.config.ts

(See configuration section above)

### Step 3: Update package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Step 4: Update Imports (Optional)

Vitest is compatible with Jest's global API when `globals: true`. But for explicit imports:

```typescript
// Jest
import { describe, expect, test, jest } from "@jest/globals";

// Vitest equivalent
import { describe, expect, test, vi } from "vitest";
```

### Step 5: Replace Jest Mocking Globals

```typescript
// Jest
jest.fn()          →  vi.fn()
jest.spyOn()       →  vi.spyOn()
jest.mock()        →  vi.mock()
jest.clearAllMocks() →  vi.clearAllMocks()
jest.resetAllMocks() →  vi.resetAllMocks()
jest.useFakeTimers() →  vi.useFakeTimers()
jest.runAllTimers()  →  vi.runAllTimers()
```

### Step 6: Update tsconfig.json

Remove Jest types, add Vitest:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals"]
  }
}
```

### Common Migration Issues

**Issue: `Cannot use import statement` errors**
Jest needed `babel-jest` or `ts-jest` for ESM. Vitest handles this natively — delete your `transform` config.

**Issue: `__dirname` / `__filename` not defined**
In ESM mode, use:

```typescript
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
```

**Issue: Module path aliases not resolving**
Add your aliases to `vitest.config.ts`:

```typescript
test: {
  alias: {
    "@": resolve(__dirname, "./src"),
    "@components": resolve(__dirname, "./src/components"),
  }
}
```

---

## Vitest UI

Vitest ships with a browser-based test UI:

```bash
npm install -D @vitest/ui
vitest --ui
```

Opens at `http://localhost:51204` — shows:
- All tests with pass/fail status
- Test source code with highlighting
- Coverage overlays on source files
- Re-run individual tests with one click

---

## When Jest Is Still the Right Choice

1. **Large existing Jest suite with no migration time**: Jest works fine. Vitest won't magically fix slow tests.
2. **Next.js with Jest**: Next.js has excellent Jest integration with `@testing-library/jest-dom` and SWC transforms — not worth migrating.
3. **Enzyme-based tests**: Enzyme has poor Vitest support; migrate to Testing Library first.
4. **Team is unfamiliar with Vite**: If you're not using Vite elsewhere, adding it only for tests adds cognitive overhead.

---

## Summary

Vitest wins in 2026 for **new Vite-based projects** due to faster cold starts, native ESM/TypeScript, and seamless configuration sharing. Jest remains the safer choice for **existing codebases** where the cost of migration outweighs the speed benefits.

For a new React or Vue project starting today:

```bash
npm create vite@latest my-app -- --template react-ts
cd my-app
npm install -D vitest @vitest/coverage-v8 @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

You'll have a working test setup in under 5 minutes with no configuration complexity.

**Target keywords:** vitest vs jest 2026, vitest setup guide, vitest react testing, vitest migration from jest, vitest typescript
