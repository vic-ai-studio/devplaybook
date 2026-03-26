---
title: "Error Handling Patterns in JavaScript and TypeScript (2026 Guide)"
description: "Master error handling in JavaScript and TypeScript. Learn try/catch, Result/Either patterns, React error boundaries, custom error classes, async error handling, and the best error monitoring tools."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["javascript", "typescript", "error-handling", "react", "async", "best-practices", "web-development"]
readingTime: "14 min read"
---

Error handling is the part of software development that separates production-ready code from demo code. It's easy to write code that works when everything goes right. The real skill is handling everything that can go wrong—network timeouts, invalid input, third-party API failures, and the edge cases you didn't think of.

This guide covers the full spectrum of error handling patterns in JavaScript and TypeScript: from basic `try/catch` to the Result pattern, React error boundaries, custom error classes, async pitfalls, and the tools that catch errors in production.

---

## Why Error Handling Matters

Unhandled errors cost real money. A production crash at 2AM, a silent data corruption bug, an API response that returns `undefined` where you expected a string—these aren't hypothetical. They're weekly occurrences in any active codebase.

Good error handling gives you:

- **Predictable behavior** — your app fails gracefully instead of crashing
- **Debuggable failures** — errors carry context about what happened and where
- **User trust** — a helpful error message beats a blank white screen
- **Operational visibility** — monitoring tools can alert you before users complain

The patterns below build from simple to advanced. Pick the ones that match your codebase's complexity.

---

## 1. try/catch: The Foundation

`try/catch` is the fundamental error handling mechanism in JavaScript. It catches synchronous exceptions—errors thrown during normal code execution.

```javascript
function parseConfig(jsonString) {
  try {
    const config = JSON.parse(jsonString);
    return config;
  } catch (error) {
    console.error('Failed to parse config:', error.message);
    return null;
  }
}
```

### What try/catch does NOT catch

This is where most beginners go wrong. `try/catch` only catches synchronous errors. It does not catch:

- Errors inside callbacks passed to `setTimeout` or `setInterval`
- Errors inside Promise callbacks (unless you use `async/await`)
- Errors in event listeners

```javascript
// This does NOT work
try {
  setTimeout(() => {
    throw new Error('This is not caught!');
  }, 1000);
} catch (error) {
  console.error('Never reached');
}
```

### The finally block

`finally` runs regardless of whether an error occurred. Use it for cleanup: closing connections, releasing locks, clearing loading states.

```javascript
async function fetchData(url) {
  let connection;
  try {
    connection = await openConnection();
    return await connection.query(url);
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  } finally {
    // Always runs, even if an error was thrown
    connection?.close();
  }
}
```

### Re-throwing errors

Catch only what you can handle. Re-throw everything else.

```javascript
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof NetworkError) {
    // We can handle this
    return cachedResult();
  }
  // We can't handle this — let it propagate
  throw error;
}
```

---

## 2. Custom Error Classes

The built-in `Error` class is generic. In a large codebase, you need to distinguish between a validation error, a network error, and a permission error. Custom error classes make that possible.

```typescript
class AppError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 500
  ) {
    super(message);
    this.name = this.constructor.name;

    // Fix prototype chain (required in TypeScript)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

class ValidationError extends AppError {
  constructor(message: string, public readonly field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 'NOT_FOUND', 404);
  }
}

class UnauthorizedError extends AppError {
  constructor() {
    super('Unauthorized', 'UNAUTHORIZED', 401);
  }
}
```

Now you can handle errors by type:

```typescript
try {
  const user = await findUser(userId);
  validateUser(user);
} catch (error) {
  if (error instanceof NotFoundError) {
    return res.status(404).json({ error: error.message });
  }
  if (error instanceof ValidationError) {
    return res.status(400).json({
      error: error.message,
      field: error.field,
    });
  }
  // Unknown error — log it and return generic message
  logger.error(error);
  return res.status(500).json({ error: 'Internal server error' });
}
```

### Why `Object.setPrototypeOf` matters

In TypeScript compiled to ES5, extending built-in classes like `Error` breaks `instanceof` checks without this fix. Always include it when extending `Error`.

---

## 3. The Result/Either Pattern

`try/catch` has a fundamental problem: it makes errors invisible at the type level. A function that can fail looks identical to one that can't. The Result pattern makes failure an explicit part of the function's return type.

### TypeScript implementation

```typescript
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

function divide(a: number, b: number): Result<number> {
  if (b === 0) {
    return {
      success: false,
      error: new Error('Division by zero'),
    };
  }
  return { success: true, data: a / b };
}

const result = divide(10, 2);

if (result.success) {
  console.log(result.data); // TypeScript knows this is a number
} else {
  console.error(result.error.message); // TypeScript knows this is an Error
}
```

### Wrapping async operations

```typescript
async function safeApiCall<T>(
  fn: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

// Usage
const result = await safeApiCall(() => fetch('/api/users').then(r => r.json()));

if (!result.success) {
  console.error('API call failed:', result.error.message);
  return;
}

console.log('Users:', result.data);
```

### When to use Result vs try/catch

| Scenario | Recommendation |
|----------|---------------|
| Internal utilities, simple transforms | `try/catch` is fine |
| Public API boundaries | Result pattern |
| Functions called in many places | Result pattern — caller decides how to handle |
| Third-party library wrappers | Result pattern — hide the library's error types |
| Express/Next.js route handlers | `try/catch` with error middleware |

The Result pattern is especially valuable in TypeScript because the type system enforces that callers check for errors before accessing data.

---

## 4. Async Error Handling

Async code has its own error handling pitfalls. Here's what you need to know.

### Promise chains

```javascript
// Good: single catch at the end
fetch('/api/data')
  .then(response => response.json())
  .then(data => processData(data))
  .catch(error => {
    console.error('Pipeline failed:', error);
  });

// Better: async/await with try/catch
async function loadData() {
  try {
    const response = await fetch('/api/data');
    const data = await response.json();
    return processData(data);
  } catch (error) {
    console.error('Failed to load data:', error);
    throw error;
  }
}
```

### Unhandled promise rejections

Unhandled rejections are one of the most common sources of silent failures. Always handle them.

```javascript
// Node.js: global handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  // Optionally exit the process
  process.exit(1);
});

// Browser: global handler
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection:', event.reason);
  event.preventDefault(); // Prevent default browser error logging
});
```

### Promise.allSettled vs Promise.all

```javascript
// Promise.all — fails fast on first error
// Use when all results are required
const [users, products] = await Promise.all([
  fetchUsers(),
  fetchProducts(),
]);

// Promise.allSettled — waits for all, never throws
// Use when partial success is acceptable
const results = await Promise.allSettled([
  fetchUsers(),
  fetchProducts(),
  fetchInventory(),
]);

results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Request ${index} succeeded:`, result.value);
  } else {
    console.error(`Request ${index} failed:`, result.reason);
  }
});
```

### AbortController for timeouts

```typescript
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return await response.json();
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
```

---

## 5. React Error Boundaries

In React, a JavaScript error in a component's render method or lifecycle hook will crash the entire component tree unless you catch it. Error boundaries are React's mechanism for catching these errors.

### Class-based Error Boundary

```tsx
import React, { Component, ReactNode } from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryProps {
  fallback?: ReactNode;
  children: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to your error monitoring service
    console.error('Component error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false, error: null })}>
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### Using Error Boundaries

```tsx
function App() {
  return (
    <ErrorBoundary
      fallback={<ErrorPage />}
      onError={(error) => reportToSentry(error)}
    >
      <ErrorBoundary fallback={<p>Failed to load sidebar</p>}>
        <Sidebar />
      </ErrorBoundary>

      <ErrorBoundary fallback={<p>Failed to load content</p>}>
        <MainContent />
      </ErrorBoundary>
    </ErrorBoundary>
  );
}
```

### What error boundaries do NOT catch

Error boundaries only catch errors in the render phase. They do not catch:

- Event handler errors (use `try/catch` inside handlers)
- Async errors (use `try/catch` inside async functions)
- Errors thrown in the error boundary itself

```tsx
// Event handler errors — use try/catch
function Button() {
  const handleClick = async () => {
    try {
      await submitForm();
    } catch (error) {
      setError('Submission failed. Please try again.');
    }
  };

  return <button onClick={handleClick}>Submit</button>;
}
```

### react-error-boundary (recommended)

The `react-error-boundary` package gives you a hook-friendly API:

```tsx
import { ErrorBoundary, useErrorBoundary } from 'react-error-boundary';

function DataFetcher() {
  const { showBoundary } = useErrorBoundary();

  useEffect(() => {
    fetchData().catch(showBoundary); // Propagate async errors to boundary
  }, []);

  return <div>...</div>;
}

function App() {
  return (
    <ErrorBoundary
      FallbackComponent={({ error, resetErrorBoundary }) => (
        <div>
          <p>Error: {error.message}</p>
          <button onClick={resetErrorBoundary}>Retry</button>
        </div>
      )}
    >
      <DataFetcher />
    </ErrorBoundary>
  );
}
```

---

## 6. Express.js Error Middleware

In Node.js/Express apps, centralized error handling middleware keeps route handlers clean.

```typescript
import express, { Request, Response, NextFunction } from 'express';

// Custom error type
interface ApiError extends Error {
  statusCode?: number;
  code?: string;
}

// Error middleware (must have 4 parameters)
function errorHandler(
  err: ApiError,
  req: Request,
  res: Response,
  next: NextFunction
) {
  const statusCode = err.statusCode ?? 500;
  const isProduction = process.env.NODE_ENV === 'production';

  console.error(`[${req.method}] ${req.path} — ${err.message}`);

  res.status(statusCode).json({
    error: {
      message: isProduction && statusCode === 500
        ? 'Internal server error'
        : err.message,
      code: err.code,
      ...(isProduction ? {} : { stack: err.stack }),
    },
  });
}

// Async wrapper — eliminates try/catch in every route
function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}

// Clean route handlers
app.get('/users/:id', asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new NotFoundError('User');
  res.json(user);
}));

// Register error handler last
app.use(errorHandler);
```

---

## 7. TypeScript-Specific Patterns

### Type narrowing with `unknown`

TypeScript 4.0+ types `catch` variables as `unknown` (stricter than `any`). Always narrow the type before accessing properties.

```typescript
try {
  await riskyOperation();
} catch (error: unknown) {
  // Must check type before accessing properties
  if (error instanceof Error) {
    console.error(error.message);
  } else if (typeof error === 'string') {
    console.error(error);
  } else {
    console.error('Unknown error:', error);
  }
}

// Utility function
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unexpected error occurred';
}
```

### Discriminated unions for errors

```typescript
type ParseResult =
  | { type: 'success'; value: number }
  | { type: 'error'; reason: 'invalid_format' | 'out_of_range'; input: string };

function parsePositiveInt(input: string): ParseResult {
  const num = parseInt(input, 10);

  if (isNaN(num)) {
    return { type: 'error', reason: 'invalid_format', input };
  }

  if (num <= 0) {
    return { type: 'error', reason: 'out_of_range', input };
  }

  return { type: 'success', value: num };
}

const result = parsePositiveInt('abc');

switch (result.type) {
  case 'success':
    console.log('Value:', result.value);
    break;
  case 'error':
    if (result.reason === 'invalid_format') {
      console.error(`"${result.input}" is not a number`);
    } else {
      console.error(`"${result.input}" must be positive`);
    }
    break;
}
```

---

## 8. Error Monitoring in Production

Writing good error handling is half the job. The other half is knowing when something breaks in production.

### Sentry

Sentry is the most widely-used error monitoring platform. It captures errors with full stack traces, user context, and breadcrumbs (events leading up to the error).

```typescript
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of requests
});

// Capture an error manually
try {
  await criticalOperation();
} catch (error) {
  Sentry.captureException(error, {
    tags: { component: 'checkout' },
    user: { id: userId },
  });
  throw error;
}
```

### LogRocket

LogRocket records user sessions and replays them alongside errors. Useful for reproducing intermittent UI bugs.

### Datadog / New Relic

For server-side monitoring with APM (Application Performance Monitoring), Datadog and New Relic provide error tracking alongside latency metrics and distributed tracing.

### Pino / Winston (structured logging)

Before errors reach a monitoring service, log them with context:

```typescript
import pino from 'pino';

const logger = pino({
  level: process.env.LOG_LEVEL ?? 'info',
});

// Structured error log
logger.error({
  err: error,
  userId,
  requestId: req.id,
  msg: 'Payment processing failed',
});
```

---

## 9. Testing Error Handling

Error handling code is often undertested. Here's how to cover it properly.

```typescript
import { describe, it, expect, vi } from 'vitest';

describe('parseConfig', () => {
  it('returns null for invalid JSON', () => {
    const result = parseConfig('not-json');
    expect(result).toBeNull();
  });

  it('throws ValidationError for missing required fields', async () => {
    await expect(createUser({})).rejects.toThrow(ValidationError);
  });

  it('returns failed result for network errors', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'));
    const result = await safeApiCall(() => fetch('/api/data'));
    expect(result.success).toBe(false);
  });
});
```

---

## Error Handling Checklist

Before shipping a feature, run through this checklist:

- [ ] All async functions have `try/catch` or return a `Result` type
- [ ] Custom error classes used for domain-specific errors
- [ ] React components wrapped in `ErrorBoundary` where appropriate
- [ ] Unhandled rejection handlers registered at app startup
- [ ] Errors logged with context (user ID, request ID, component name)
- [ ] Production error monitoring configured (Sentry or equivalent)
- [ ] Error messages shown to users are helpful and don't leak internals
- [ ] Error handling paths are covered by tests

---

## Summary

| Pattern | Best for |
|---------|----------|
| `try/catch` | Synchronous code, async/await, simple utilities |
| Custom Error classes | Domain-specific errors, API error responses |
| Result/Either pattern | Public APIs, TypeScript codebases, complex error flows |
| Error Boundaries | React component trees |
| Error middleware | Express/Node.js API servers |
| `unknown` narrowing | TypeScript strict mode |
| Sentry / monitoring | Production error visibility |

The patterns aren't mutually exclusive. A production TypeScript app typically uses all of them: custom error classes thrown from the domain layer, Result types returned from service functions, `try/catch` in route handlers with Express error middleware, React error boundaries in the UI, and Sentry watching everything in production.

Start with custom error classes and proper async error handling. Add the Result pattern as your codebase grows. Layer in monitoring from day one.

---

*Want to catch more bugs before they hit production? Try the [DevPlaybook Code Quality Toolkit](https://devplaybook.gumroad.com)—ESLint configs, TypeScript strict settings, and pre-commit hooks to enforce error handling standards across your team.*
