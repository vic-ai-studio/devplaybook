---
title: "JSON to TypeScript: The Complete Conversion Guide"
description: "Learn how to convert JSON to TypeScript interfaces manually and with tools. Covers nested objects, arrays, optional fields, union types, generics, discriminated unions, and Zod runtime validation."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: [typescript, json, type-safety, developer-tools, web-development]
readingTime: "12 min read"
---

TypeScript's type system is only as good as the types you define. And in practice, most of those types come from one place: JSON. API responses, config files, database records, webhook payloads—all JSON, all needing TypeScript interfaces before you can work with them safely.

This guide covers the complete workflow: understanding why typed JSON matters, how to convert manually, how tools can automate it, and how to handle the genuinely tricky edge cases that tools often get wrong.

---

## Why Convert JSON to TypeScript Interfaces?

The short answer: catch bugs at compile time instead of runtime.

Consider this API response:

```json
{
  "user": {
    "id": 42,
    "name": "Alice",
    "email": "alice@example.com",
    "subscription": {
      "plan": "pro",
      "expiresAt": "2026-12-31"
    }
  }
}
```

Without TypeScript interfaces, you write code like:

```javascript
const userName = response.user.name;
const plan = response.user.subscription.plan;
```

This works—until the API changes `subscription` to `subscriptionInfo`, or `plan` to `tier`, or the whole object goes missing for free users. Your app crashes at runtime, in production, for a subset of users.

With a TypeScript interface:

```typescript
interface Subscription {
  plan: string;
  expiresAt: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  subscription: Subscription;
}

interface ApiResponse {
  user: User;
}
```

Now the compiler catches every breaking change before deployment. You also get autocomplete, inline documentation, and refactoring support across your entire codebase.

---

## Manual Conversion Walkthrough

Understanding manual conversion is valuable even if you use automated tools—because tools make assumptions you need to recognize and override.

### Simple Flat Objects

Start with the simplest case:

```json
{
  "id": 1,
  "title": "Getting Started with TypeScript",
  "published": true,
  "viewCount": 2847
}
```

Mapping JSON types to TypeScript:

| JSON Type | TypeScript Type |
|-----------|----------------|
| string    | `string`        |
| number    | `number`        |
| boolean   | `boolean`       |
| null      | `null`          |
| array     | `T[]` or `Array<T>` |
| object    | `interface` or `type` |

Result:

```typescript
interface Article {
  id: number;
  title: string;
  published: boolean;
  viewCount: number;
}
```

### Nested Objects

```json
{
  "post": {
    "id": 101,
    "title": "Advanced TypeScript Patterns",
    "author": {
      "id": 42,
      "name": "Alice",
      "avatarUrl": "https://cdn.example.com/avatars/alice.jpg"
    },
    "tags": ["typescript", "advanced", "patterns"]
  }
}
```

Best practice: define nested types as separate interfaces, not inline.

```typescript
// Separate interfaces for each level
interface Author {
  id: number;
  name: string;
  avatarUrl: string;
}

interface Post {
  id: number;
  title: string;
  author: Author;
  tags: string[];
}

interface PostResponse {
  post: Post;
}
```

This pays off when `Author` appears in multiple places—you define it once and reference it everywhere.

### Optional Fields

When some fields are only sometimes present in the JSON:

```json
// User with subscription
{
  "id": 1,
  "email": "alice@example.com",
  "subscription": { "plan": "pro" }
}

// User without subscription (free tier)
{
  "id": 2,
  "email": "bob@example.com"
}
```

Mark optional fields with `?`:

```typescript
interface Subscription {
  plan: string;
}

interface User {
  id: number;
  email: string;
  subscription?: Subscription; // Present for paid users only
}
```

The `?` makes the field `Subscription | undefined`. This forces you to handle the undefined case everywhere you use it:

```typescript
// TypeScript will error if you don't check
if (user.subscription) {
  console.log(user.subscription.plan); // Safe
}

// Or use optional chaining
const plan = user.subscription?.plan; // string | undefined
```

### Arrays of Objects

```json
{
  "orders": [
    { "id": "ord_1", "total": 49.99, "items": 3 },
    { "id": "ord_2", "total": 129.00, "items": 7 }
  ]
}
```

```typescript
interface Order {
  id: string;
  total: number;
  items: number;
}

interface OrdersResponse {
  orders: Order[];
}
```

---

## Handling Edge Cases

This is where manual attention beats automated tools.

### Null Values

JSON `null` is distinct from JavaScript `undefined`. A field explicitly set to `null` should be typed as `T | null`, not `T | undefined`.

```json
{
  "user": {
    "name": "Alice",
    "deletedAt": null,
    "middleName": null
  }
}
```

```typescript
interface User {
  name: string;
  deletedAt: string | null;   // Explicitly nullable: null means "not deleted"
  middleName: string | null;  // Explicitly nullable: null means "no middle name"
}
```

Compare to optional fields where the key itself might be absent. Many tools incorrectly generate `string | null | undefined` for null fields when `string | null` is the accurate type.

### Union Types

When a field can be one of several distinct string values:

```json
{ "status": "pending" }
{ "status": "active" }
{ "status": "suspended" }
```

Don't type this as `string`—use a union:

```typescript
type UserStatus = "pending" | "active" | "suspended";

interface User {
  status: UserStatus;
}
```

Now TypeScript will error if your code paths don't handle all three states, and you get autocomplete on valid values.

### Discriminated Unions

When your API returns different object shapes based on a `type` field:

```json
// Payment method: card
{
  "type": "card",
  "last4": "4242",
  "brand": "visa",
  "expiryMonth": 12
}

// Payment method: bank account
{
  "type": "bank_account",
  "bankName": "Chase",
  "accountLast4": "6789",
  "routingNumber": "021000021"
}
```

Use a discriminated union:

```typescript
interface CardPayment {
  type: "card";
  last4: string;
  brand: string;
  expiryMonth: number;
}

interface BankPayment {
  type: "bank_account";
  bankName: string;
  accountLast4: string;
  routingNumber: string;
}

type PaymentMethod = CardPayment | BankPayment;

// TypeScript narrows the type based on the discriminant
function processPayment(method: PaymentMethod) {
  if (method.type === "card") {
    console.log(method.brand);       // TypeScript knows this is CardPayment
  } else {
    console.log(method.bankName);    // TypeScript knows this is BankPayment
  }
}
```

### Generics for Paginated Responses

Most APIs wrap results in a consistent envelope:

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "perPage": 20,
    "total": 150
  }
}
```

Instead of defining this wrapper for every resource type, use generics:

```typescript
interface Pagination {
  page: number;
  perPage: number;
  total: number;
}

interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}

// Usage
type UsersResponse = PaginatedResponse<User>;
type OrdersResponse = PaginatedResponse<Order>;
type ArticlesResponse = PaginatedResponse<Article>;
```

This saves you from duplicating the envelope structure dozens of times.

---

## Automated Tools Comparison

Manual conversion is educational but doesn't scale. Here are the main options:

### quicktype

The most fully-featured JSON-to-TypeScript tool. Handles complex JSON, supports multiple output languages, and can generate validation code alongside types.

```bash
# Install
npm install -g quicktype

# Generate from a JSON file
quicktype --lang typescript --src response.json --out types.ts

# Generate from a URL
quicktype --lang typescript --src-urls https://api.example.com/schema
```

**Strengths:** Excellent at inferring union types from sample data, good at generics, supports JSON Schema input.
**Weaknesses:** Can over-generate—sometimes splits things into more types than necessary.

### json-to-ts (npm package)

Simpler, more predictable, good for embedding in build pipelines.

```typescript
import { JsonToTS } from "json-to-ts";

const json = { user: { id: 1, name: "Alice" } };
const interfaces = JsonToTS(json);
// Returns: ["interface RootObject { user: User }", "interface User { id: number; name: string; }"]
```

### devplaybook.cc JSON to TypeScript Tool

For one-off conversions without installing anything, [devplaybook.cc/tools/json-to-typescript](https://devplaybook.cc/tools/json-to-typescript) handles nested objects, arrays, and offers options for optional fields and strict null checks. Paste JSON, get TypeScript interfaces, done.

---

## Integration with API Responses

Types are most valuable at the data boundary—where JSON enters your application.

### Typed fetch Wrapper

```typescript
async function fetchTyped<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

// Usage
const users = await fetchTyped<PaginatedResponse<User>>(
  "https://api.example.com/users"
);

// TypeScript now knows the full type
console.log(users.data[0].email);         // Autocomplete works
console.log(users.pagination.total);      // Autocomplete works
```

The caveat: this is a type assertion, not validation. The API could return something completely different and TypeScript would happily accept it at runtime. Which brings us to Zod.

---

## Zod for Runtime Validation

TypeScript types exist only at compile time. If an API returns unexpected data, your type assertions don't protect you. Zod solves this by validating the actual runtime values against a schema—and the schema also generates your TypeScript types.

```bash
npm install zod
```

```typescript
import { z } from "zod";

// Define schema (also generates TypeScript type)
const UserSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  name: z.string(),
  role: z.enum(["admin", "editor", "viewer"]),
  subscription: z
    .object({
      plan: z.string(),
      expiresAt: z.string().datetime(),
    })
    .optional(),
  deletedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});

// Infer TypeScript type from schema — no duplication
type User = z.infer<typeof UserSchema>;

// Runtime-validated fetch
async function fetchUser(id: number): Promise<User> {
  const response = await fetch(`/api/users/${id}`);
  const data = await response.json();

  // Throws ZodError with detailed message if data doesn't match schema
  return UserSchema.parse(data);
}
```

If the API returns `role: "superadmin"` (an unexpected value), `UserSchema.parse()` throws immediately with a clear error message—instead of your code silently misbehaving later.

### Zod for Complex Shapes

Zod handles all the edge cases cleanly:

```typescript
// Discriminated unions
const PaymentMethodSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("card"),
    last4: z.string().length(4),
    brand: z.enum(["visa", "mastercard", "amex"]),
    expiryMonth: z.number().min(1).max(12),
  }),
  z.object({
    type: z.literal("bank_account"),
    bankName: z.string(),
    accountLast4: z.string().length(4),
    routingNumber: z.string().length(9),
  }),
]);

// Generic paginated response
const paginatedSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().positive(),
      perPage: z.number().int().positive(),
      total: z.number().int().nonnegative(),
    }),
  });

const UsersResponseSchema = paginatedSchema(UserSchema);
type UsersResponse = z.infer<typeof UsersResponseSchema>;
```

---

## Practical Workflow

Here's the workflow that works well in production codebases:

1. **Get a sample response** from your API (curl it, copy from the browser, check docs).
2. **Use [devplaybook.cc/tools/json-to-typescript](https://devplaybook.cc/tools/json-to-typescript)** to generate initial interfaces quickly.
3. **Review and fix** the generated types: mark fields optional where appropriate, convert string unions to literal types, add generics for repeated envelope patterns.
4. **Add Zod schemas** for any data that crosses a trust boundary (external APIs, user input, webhook payloads).
5. **Put types in a shared location** (`src/types/` or alongside the module that owns them).

```
src/
├── types/
│   ├── api.ts         # Generic API types (PaginatedResponse, ApiError)
│   └── domain.ts      # Core domain types (User, Order, Product)
├── services/
│   ├── users.ts       # fetch functions + Zod schemas for user endpoints
│   └── orders.ts      # fetch functions + Zod schemas for order endpoints
└── components/
    └── ...            # Components import from types/, never define their own
```

---

## Key Takeaways

- Convert every significant JSON structure to TypeScript interfaces—the compile-time safety pays for itself on the first caught bug.
- Use separate interfaces for each level of nesting; avoid deeply inline types.
- Mark optional fields with `?`; use `T | null` for explicitly nullable fields.
- Use literal union types (`"pending" | "active"`) instead of `string` where the values are constrained.
- Use discriminated unions for polymorphic response shapes.
- Use generics for repeated envelope patterns like paginated responses.
- Add Zod for runtime validation at trust boundaries.
- Automate with [devplaybook.cc/tools/json-to-typescript](https://devplaybook.cc/tools/json-to-typescript) for one-off conversions, quicktype for CI/build pipeline integration.

TypeScript's value compounds with coverage. Every untyped API response is a potential runtime crash waiting to happen. Type them all.
