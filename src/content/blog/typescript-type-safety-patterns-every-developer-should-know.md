---
title: "TypeScript Best Practices 2025: Type Safety Patterns Every Developer Should Know"
description: "Master TypeScript type safety patterns in 2025. Branded types, discriminated unions, conditional types, template literals, and type guards with practical code examples."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["typescript", "type-safety", "best-practices", "javascript", "frontend", "backend"]
readingTime: "13 min read"
---

TypeScript gives you a type system — but it doesn't automatically make your code safe. The difference between TypeScript that prevents bugs and TypeScript that just adds syntax is knowing the right patterns.

These are the type safety patterns that actually matter in production TypeScript projects in 2025.

---

## 1. Branded Types: Prevent ID Mixups at Compile Time

The most dangerous TypeScript anti-pattern is using plain `string` or `number` for domain identifiers.

```typescript
// DANGEROUS: all string — compiler can't catch mixups
function getOrder(userId: string, orderId: string) { ... }

// Called wrong — TypeScript won't catch this
getOrder(orderId, userId)
```

Branded types solve this:

```typescript
type UserId = string & { readonly __brand: "UserId" };
type OrderId = string & { readonly __brand: "OrderId" };

function createUserId(id: string): UserId {
  return id as UserId;
}

function createOrderId(id: string): OrderId {
  return id as OrderId;
}

function getOrder(userId: UserId, orderId: OrderId) { ... }

// Now this is a compile error
const uid = createUserId("u_123");
const oid = createOrderId("o_456");
getOrder(oid, uid); // TS Error: Argument of type 'OrderId' is not assignable to parameter of type 'UserId'
```

Use branded types for: user IDs, order IDs, database primary keys, currency amounts, timestamps — anything where mixing up two values of the same base type causes a bug.

---

## 2. Discriminated Unions: Model State Machines Correctly

If you have an object that can be in multiple states, discriminated unions eliminate entire classes of null reference errors.

```typescript
// FRAGILE: all fields nullable, no compile-time guarantees
type Order = {
  status: "pending" | "processing" | "shipped" | "delivered";
  trackingNumber?: string; // only valid when shipped
  deliveredAt?: Date;      // only valid when delivered
  failureReason?: string;  // only valid on failure
};

// SAFE: discriminated union
type Order =
  | { status: "pending"; }
  | { status: "processing"; paymentId: string; }
  | { status: "shipped"; trackingNumber: string; estimatedDelivery: Date; }
  | { status: "delivered"; trackingNumber: string; deliveredAt: Date; }
  | { status: "failed"; failureReason: string; };

function processOrder(order: Order) {
  switch (order.status) {
    case "shipped":
      // TypeScript knows trackingNumber and estimatedDelivery exist here
      console.log(order.trackingNumber);
      break;
    case "failed":
      // TypeScript knows failureReason exists here
      notify(order.failureReason);
      break;
  }
}
```

The key: a shared literal type field (the "discriminant") that TypeScript uses to narrow the union in each branch.

---

## 3. Template Literal Types: Type-Safe String Patterns

Template literal types let you enforce string formats at compile time.

```typescript
type EventName = `on${Capitalize<string>}`;

type CSSProperty = `${string}-${string}`;
type MarginProperty = `margin-${"top" | "right" | "bottom" | "left"}`;

// API route type safety
type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
type ApiVersion = "v1" | "v2";
type ApiPath = `/${ApiVersion}/${string}`;

function fetchApi(method: HttpMethod, path: ApiPath) { ... }

fetchApi("GET", "/v1/users");    // OK
fetchApi("GET", "/users");       // Error: missing version prefix
fetchApi("FETCH", "/v1/users"); // Error: invalid method
```

Practical uses:
- Event handler names (`onClick`, `onChange`)
- CSS property variants
- API endpoint patterns
- i18n translation keys

---

## 4. Conditional Types: Types That Depend on Other Types

Conditional types let you write generic utilities that adapt to their inputs.

```typescript
// Extract the resolved type from a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;

// Extract array element type
type ArrayElement<T> = T extends (infer E)[] ? E : never;

type Names = string[];
type Name = ArrayElement<Names>; // string

// Practical: make specific fields required
type RequireFields<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

type User = {
  id?: string;
  name?: string;
  email?: string;
};

type ValidUser = RequireFields<User, "id" | "email">;
// { id: string; email: string; name?: string }
```

The `infer` keyword is the key — it lets you extract and reuse a type from within a conditional check.

---

## 5. Type Guards: Narrow Types at Runtime

TypeScript's type narrowing only works with type guards. Write them correctly.

```typescript
// Predicate function (user-defined type guard)
function isUser(value: unknown): value is User {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "email" in value &&
    typeof (value as User).email === "string"
  );
}

// Use it to safely handle API responses
async function fetchUser(id: string): Promise<User> {
  const data = await fetch(`/api/users/${id}`).then(r => r.json());

  if (!isUser(data)) {
    throw new Error("Invalid user data from API");
  }

  return data; // TypeScript knows this is User
}
```

For complex validation, combine with Zod:

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string().optional(),
});

type User = z.infer<typeof UserSchema>;

// parse() throws on invalid data; safeParse() returns a result object
const user = UserSchema.parse(apiResponse);
```

---

## 6. The `satisfies` Operator: Validate Without Widening

Introduced in TypeScript 4.9, `satisfies` validates a value against a type while preserving the narrower inferred type.

```typescript
const config = {
  host: "localhost",
  port: 5432,
  ssl: false,
} satisfies DatabaseConfig;

// Without satisfies: config.port is number (widened)
// With satisfies: config.port is 5432 (literal type preserved)
// AND TypeScript validates it matches DatabaseConfig

// Practical use: color palettes
type Color = string | [number, number, number];

const palette = {
  red: [255, 0, 0],
  green: "#00ff00",
  blue: [0, 0, 255],
} satisfies Record<string, Color>;

// palette.red is [number, number, number] — NOT Color
// So this works:
const [r, g, b] = palette.red; // TypeScript knows it's a tuple
```

---

## 7. `unknown` vs `any`: Never Use `any` for External Data

`any` turns off type checking completely. `unknown` forces you to validate before using.

```typescript
// BAD: any bypasses all safety
function parseConfig(raw: any) {
  return raw.database.host; // No error even if this crashes at runtime
}

// GOOD: unknown forces explicit handling
function parseConfig(raw: unknown) {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("database" in raw)
  ) {
    throw new Error("Invalid config");
  }

  // raw is now narrowed — continue narrowing as needed
  return (raw as { database: { host: string } }).database.host;
}
```

Rule: use `unknown` for all external data (API responses, JSON.parse results, localStorage reads). Use `any` only when interfacing with untyped legacy code — and add a `// TODO: remove any` comment.

---

## 8. Mapped Types: Transform Existing Types

Mapped types let you create new types by transforming existing ones.

```typescript
// Make all properties readonly
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};

// Make all properties optional
type Partial<T> = {
  [K in keyof T]?: T[K];
};

// Real-world: create an API response wrapper
type ApiResponse<T> = {
  data: T;
  timestamp: Date;
  requestId: string;
};

// Create form field state from a data model
type FormState<T> = {
  [K in keyof T]: {
    value: T[K];
    error: string | null;
    touched: boolean;
  };
};

type UserFormState = FormState<User>;
// {
//   id: { value: string; error: string | null; touched: boolean; }
//   email: { value: string; error: string | null; touched: boolean; }
//   ...
// }
```

---

## 9. `const` Assertions: Preserve Literal Types

Without `as const`, TypeScript widens literal types to their base types.

```typescript
// Without as const: type is string[]
const roles = ["admin", "editor", "viewer"];

// With as const: type is readonly ["admin", "editor", "viewer"]
const ROLES = ["admin", "editor", "viewer"] as const;
type Role = typeof ROLES[number]; // "admin" | "editor" | "viewer"

// Object literals
const config = {
  endpoint: "/api/v1",
  timeout: 5000,
} as const;
// config.endpoint type is "/api/v1" — not string
// config.timeout type is 5000 — not number
```

This pattern is common for:
- Enum-like constants (prefer over `enum` for better tree-shaking)
- Configuration objects
- Route definitions

---

## 10. Exhaustive Checks: Catch Missing Cases at Compile Time

If you use discriminated unions, add an exhaustiveness check to catch unhandled cases.

```typescript
type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number }
  | { kind: "triangle"; base: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case "circle":
      return Math.PI * shape.radius ** 2;
    case "square":
      return shape.side ** 2;
    case "triangle":
      return 0.5 * shape.base * shape.height;
    default:
      // This is a compile error if any case is unhandled
      const _exhaustive: never = shape;
      throw new Error(`Unhandled shape: ${JSON.stringify(_exhaustive)}`);
  }
}

// Later: add "hexagon" to Shape
// TypeScript immediately errors at the default case
// You can't forget to handle it
```

The `never` assignment in the default case causes a compile error if any variant of the union reaches it — because `never` can't be assigned any actual value.

---

## Patterns to Avoid

| Pattern | Problem | Alternative |
|---------|---------|-------------|
| `any` on API responses | Skips all type checking | `unknown` + type guards or Zod |
| Optional chaining everywhere (`?.`) | Hides missing data bugs | Discriminated unions with required fields |
| Type assertions (`as Type`) on untrusted data | Runtime crashes | Validated type guards |
| `enum` for constants | Bundle bloat, poor JS interop | `as const` object |
| Nullable fields for state machines | Impossible states become possible | Discriminated unions |

---

## Summary

The patterns that matter most:

1. **Branded types** for domain identifiers
2. **Discriminated unions** for state machines and variants
3. **Template literals** for string format enforcement
4. **Conditional types** for generic utilities
5. **Type guards** for runtime validation
6. **`satisfies`** for validated literals
7. **`unknown`** instead of `any` for external data
8. **Mapped types** for type transformations
9. **`as const`** for literal type preservation
10. **Exhaustive checks** for union completeness

Master these ten patterns and you'll catch an entire category of runtime bugs before they reach production.

---

## Related Tools on DevPlaybook

- [TypeScript Playground](/tools/typescript-playground) — test type patterns in the browser
- [JSON to TypeScript converter](/tools/json-to-typescript) — generate types from API responses
- [TypeScript Config Generator](/tools/tsconfig-generator) — build your tsconfig.json
