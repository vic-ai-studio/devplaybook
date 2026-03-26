---
title: "Runtime Validation in TypeScript: Zod vs Yup vs Valibot vs ArkType 2026"
description: "Complete 2026 comparison of TypeScript runtime validation libraries: Zod, Yup, Valibot, and ArkType. Compare bundle size, performance, API design, React Hook Form integration, tRPC support, and migration guides."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["typescript", "zod", "validation", "react", "forms", "trpc"]
category: "typescript"
readingTime: "19 min read"
---

TypeScript's static types disappear at runtime. Every `JSON.parse`, every API response, every form submission arrives as untyped data — and without runtime validation, you're trusting that the shape of that data matches your assumptions. When it doesn't, you get runtime errors that TypeScript's compiler never warned you about.

Runtime validation libraries solve this by letting you define a schema once and using it for both static type inference and runtime parsing. The big four in 2026: **Zod**, **Yup**, **Valibot**, and **ArkType**. Each has a different philosophy on API design, bundle size, and performance.

This guide covers everything you need to make an informed decision: API comparison, bundle size benchmarks, form library integration, tRPC support, and migration guides between libraries. For quick schema testing, try our [JSON Validator](/tools/json-validator).

---

## Why Runtime Validation Matters

Consider a typical API call:

```typescript
const res = await fetch('/api/users/42');
const user = await res.json(); // type: any
```

TypeScript infers `user` as `any`. You might add a type assertion:

```typescript
const user = await res.json() as User;
```

But this doesn't validate anything — it just suppresses TypeScript errors. If the API returns `{ id: "42", name: null }` instead of `{ id: 42, name: "Alice" }`, you'll have a runtime bug that TypeScript silently allowed.

With a validation library:

```typescript
const UserSchema = z.object({ id: z.number(), name: z.string() });
const user = UserSchema.parse(await res.json()); // throws if invalid
```

Now you get:
- A TypeScript type inferred from the schema (`z.infer<typeof UserSchema>`)
- A runtime error with a clear message if the data doesn't match
- A single source of truth for both validation and types

---

## Quick Comparison Matrix

| | Zod | Yup | Valibot | ArkType |
|---|---|---|---|---|
| **Bundle size (min+gz)** | ~13.5 kB | ~13 kB | ~7.5 kB | ~14 kB |
| **Tree-shakeable** | No | No | Yes | Partial |
| **Async validation** | Yes | Yes | Yes | Limited |
| **Error messages** | Excellent | Good | Good | Excellent |
| **tRPC support** | Native | Via adapter | Via adapter | Via adapter |
| **React Hook Form** | Yes | Yes | Yes | Yes |
| **TypeScript inference** | Excellent | Good | Excellent | Excellent |
| **Learning curve** | Low | Low | Low-Medium | Medium |
| **Performance** | Good | Slow | Excellent | Excellent |

---

## Zod

### Overview

Zod (by Colin McDonnell) is the default choice for TypeScript validation in 2026. Its chainable API, excellent error messages, and first-class tRPC integration have made it ubiquitous. If you're starting a new project and not sure which library to use, Zod is the safe bet.

### API Design

```typescript
import { z } from 'zod';

// Primitives
const NameSchema = z.string().min(1).max(100);
const AgeSchema = z.number().int().positive().max(150);

// Objects
const UserSchema = z.object({
  id: z.number(),
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().int().positive().optional(),
  role: z.enum(['admin', 'user', 'guest']),
  createdAt: z.coerce.date(),  // coerces strings to Date
});

// Infer TypeScript type
type User = z.infer<typeof UserSchema>;
// { id: number; name: string; email: string; age?: number; role: 'admin'|'user'|'guest'; createdAt: Date }
```

### Transformations and Refinements

Zod distinguishes between `transform` (changes the output type) and `refine` (validates without changing the type):

```typescript
const PasswordSchema = z.string()
  .min(8, 'Password must be at least 8 characters')
  .refine(val => /[A-Z]/.test(val), 'Must contain at least one uppercase letter')
  .refine(val => /[0-9]/.test(val), 'Must contain at least one number');

const SlugSchema = z.string()
  .transform(val => val.toLowerCase().replace(/\s+/g, '-'));
// Output type: string, but processed

const DateStringSchema = z.string()
  .transform(val => new Date(val));
// Input: string, Output: Date
```

### Parsing vs SafeParse

```typescript
// parse() throws ZodError on failure
try {
  const user = UserSchema.parse(rawData);
} catch (err) {
  if (err instanceof z.ZodError) {
    console.log(err.issues);
    // [{ path: ['email'], message: 'Invalid email', code: 'invalid_string' }]
  }
}

// safeParse() returns a discriminated union
const result = UserSchema.safeParse(rawData);
if (!result.success) {
  const fieldErrors = result.error.flatten().fieldErrors;
  // { email: ['Invalid email'], name: ['Required'] }
} else {
  const user = result.data; // fully typed
}
```

### Advanced Patterns

```typescript
// Discriminated unions
const EventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('click'), x: z.number(), y: z.number() }),
  z.object({ type: z.literal('keypress'), key: z.string() }),
]);

// Recursive schemas
type Category = { name: string; children: Category[] };
const CategorySchema: z.ZodType<Category> = z.lazy(() =>
  z.object({ name: z.string(), children: z.array(CategorySchema) })
);

// Branded types (nominal typing)
const UserIdSchema = z.number().brand<'UserId'>();
type UserId = z.infer<typeof UserIdSchema>; // number & { __brand: 'UserId' }

// Partial / Required / Pick / Omit
const PartialUserSchema = UserSchema.partial();
const UserUpdateSchema = UserSchema.partial().required({ id: true });
const UserSummarySchema = UserSchema.pick({ id: true, name: true });
```

### tRPC Integration

Zod is tRPC's native validator — no adapter needed:

```typescript
import { z } from 'zod';
import { router, publicProcedure } from './trpc';

const appRouter = router({
  getUser: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getUserById(input.id); // input is fully typed
    }),

  createUser: publicProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
    }))
    .mutation(async ({ input }) => {
      return createUser(input);
    }),
});
```

---

## Yup

### Overview

Yup (by Jason Quense) predates Zod and was the dominant validation library in the React ecosystem until 2022. It remains widely used, particularly in projects using Formik, which has native Yup integration. Yup's async-first design differs fundamentally from Zod's synchronous parsing model.

### API Design

```typescript
import * as yup from 'yup';

const UserSchema = yup.object({
  id: yup.number().required(),
  name: yup.string().min(1).required(),
  email: yup.string().email().required(),
  age: yup.number().integer().positive(),
  role: yup.string().oneOf(['admin', 'user', 'guest']).required(),
});

// Type inference (requires explicit annotation or yup.InferType)
type User = yup.InferType<typeof UserSchema>;
```

### Key Differences from Zod

**1. Async-first validation:**
```typescript
const UserSchema = yup.object({
  username: yup.string()
    .required()
    .test('unique', 'Username taken', async (value) => {
      const exists = await checkUsernameExists(value);
      return !exists;
    }),
});

// Must await
const isValid = await UserSchema.isValid(data);
await UserSchema.validate(data, { abortEarly: false });
```

**2. Formik integration (native):**
```tsx
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as yup from 'yup';

const schema = yup.object({
  email: yup.string().email('Invalid email').required('Required'),
  password: yup.string().min(8, 'Too short').required('Required'),
});

<Formik initialValues={{ email: '', password: '' }} validationSchema={schema}>
  {/* Formik handles error mapping automatically */}
</Formik>
```

**3. Casting vs strict parsing:**

Yup by default **casts** values (e.g., `"42"` → `42` for a number schema). Zod requires explicit `z.coerce.number()`. This implicit coercion is a footgun for API validation but convenient for form data.

### When to Choose Yup

- You're using Formik (native integration, no adapter)
- You need async validation in the schema (e.g., database lookups)
- You're migrating a legacy codebase that already uses Yup

### Limitations

- TypeScript inference is weaker than Zod (optional chaining issues)
- Slower performance than Zod and Valibot
- No native tRPC support (use `@trpc/server/adapters/express` with custom adapter)

---

## Valibot

### Overview

Valibot (by Fabian Hiller) is the performance-and-size champion. Written with tree-shaking as a core design goal, it achieves a ~7.5 kB min+gz footprint versus Zod's ~13.5 kB — and unlike Zod, unused schema types are completely eliminated from your bundle.

### API Design

Valibot's API looks similar to Zod but uses standalone functions instead of a class-based schema object:

```typescript
import * as v from 'valibot';

const UserSchema = v.object({
  id: v.number(),
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.email()),
  age: v.optional(v.pipe(v.number(), v.integer(), v.minValue(0))),
  role: v.picklist(['admin', 'user', 'guest']),
});

type User = v.InferOutput<typeof UserSchema>;
```

The `v.pipe()` function chains validations — this is how tree-shaking works: `v.email` is a standalone function that's only bundled if you use it.

### Parsing

```typescript
// parse (throws ValiError on failure)
const user = v.parse(UserSchema, rawData);

// safeParse
const result = v.safeParse(UserSchema, rawData);
if (!result.success) {
  console.log(result.issues);
  // [{ message: 'Invalid email', path: [{ key: 'email' }] }]
}
```

### Performance Benchmarks

Valibot's Rust-inspired functional approach pays off in benchmarks. In the valibot team's tests (parsing 1000 objects):

| Library | Operations/sec |
|---------|---------------|
| Valibot | ~320,000 |
| ArkType | ~290,000 |
| Zod | ~140,000 |
| Yup | ~18,000 |

Valibot and ArkType are 2–3x faster than Zod for hot paths (e.g., parsing thousands of items in a data pipeline).

### Bundle Size Advantage

The tree-shaking benefit is real for edge deployments:

```typescript
// This Valibot usage bundles ~2 kB (only string + minLength + email)
import * as v from 'valibot';
const EmailSchema = v.pipe(v.string(), v.email());

// The equivalent Zod usage bundles ~13.5 kB (entire Zod)
import { z } from 'zod';
const EmailSchema = z.string().email();
```

For Cloudflare Workers, Vercel Edge, and AWS Lambda@Edge where cold start matters, Valibot's smaller footprint is a genuine advantage.

### React Hook Form Integration

```typescript
import { useForm } from 'react-hook-form';
import { valibotResolver } from '@hookform/resolvers/valibot';
import * as v from 'valibot';

const LoginSchema = v.object({
  email: v.pipe(v.string(), v.email('Invalid email')),
  password: v.pipe(v.string(), v.minLength(8, 'At least 8 characters')),
});

type LoginForm = v.InferOutput<typeof LoginSchema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: valibotResolver(LoginSchema),
  });

  return (
    <form onSubmit={handleSubmit(data => console.log(data))}>
      <input {...register('email')} />
      {errors.email && <span>{errors.email.message}</span>}
      <input type="password" {...register('password')} />
      {errors.password && <span>{errors.password.message}</span>}
      <button type="submit">Login</button>
    </form>
  );
}
```

---

## ArkType

### Overview

ArkType (by David Blass) takes the most radical approach: it parses TypeScript-like type syntax at runtime, giving you a schema API that reads almost like native TypeScript types.

### API Design

```typescript
import { type } from 'arktype';

const User = type({
  id: 'number',
  name: 'string > 0',           // string with length > 0
  email: 'string.email',
  age: 'number.integer > 0 | undefined',
  role: '"admin" | "user" | "guest"',
});

type User = typeof User.infer;
// { id: number; name: string; email: string; age: number | undefined; role: 'admin'|'user'|'guest' }
```

The strings are parsed by ArkType at module initialization time — they're not interpreted at parse time. This means type errors in your schema strings are caught at startup, not at runtime.

### Why the String API is Safe

```typescript
// This is a type error caught at startup:
const Bad = type({ id: 'numer' }); // typo — ArkType throws during module load
// ArkTypeError: "numer" is not a valid type expression

// vs Zod, where typos in string literals would be runtime errors:
const Bad2 = z.object({ role: z.literal('admni') }); // no error until you use it
```

### Validation Syntax

ArkType's expression language is surprisingly expressive:

```typescript
import { type } from 'arktype';

// Numeric constraints
const Score = type('0 <= number <= 100');
const Port = type('1 <= number.integer <= 65535');

// String patterns
const Slug = type(/^[a-z0-9-]+$/);
const UUID = type('string.uuid');

// Dates
const FutureDate = type("Date > d'2026-01-01'");

// Arrays with constraints
const Tags = type('string[] < 10');  // array of strings, length < 10

// Intersections and unions
const AdminUser = type({ role: '"admin"' }).and({ permissions: 'string[]' });
```

### Performance

ArkType precompiles schemas at module load time (similar to how a regex engine compiles a pattern), resulting in very fast parse operations. It's competitive with Valibot in most benchmarks.

---

## React Hook Form Integration (All Libraries)

React Hook Form supports all four libraries via `@hookform/resolvers`:

```bash
npm install @hookform/resolvers
```

### Zod

```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useForm } from 'react-hook-form';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Yup

```typescript
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

const schema = yup.object({ email: yup.string().email().required() });
const { register } = useForm({ resolver: yupResolver(schema) });
```

### Valibot

```typescript
import { valibotResolver } from '@hookform/resolvers/valibot';
import * as v from 'valibot';

const schema = v.object({ email: v.pipe(v.string(), v.email()) });
const { register } = useForm({ resolver: valibotResolver(schema) });
```

### ArkType

```typescript
import { arktypeResolver } from '@hookform/resolvers/arktype';
import { type } from 'arktype';

const schema = type({ email: 'string.email' });
const { register } = useForm({ resolver: arktypeResolver(schema) });
```

---

## tRPC Integration

Zod is tRPC's first-class validator. Other libraries require adapters:

### Zod (native)

```typescript
import { z } from 'zod';
// No setup needed — Zod is tRPC's default
```

### Valibot with tRPC

```typescript
import { wrap } from '@decs/typeschema';
import * as v from 'valibot';

const appRouter = router({
  getUser: publicProcedure
    .input(wrap(v.object({ id: v.number() })))
    .query(async ({ input }) => getUserById(input.id)),
});
```

Or with `trpc-valibot`:

```typescript
import { valibotSchema } from 'trpc-valibot';
import * as v from 'valibot';

.input(valibotSchema(v.object({ id: v.number() })))
```

---

## Migration Guides

### Migrating from Yup to Zod

Most schemas translate directly:

```typescript
// Yup
const schema = yup.object({
  name: yup.string().required().min(1),
  email: yup.string().email().required(),
  age: yup.number().positive().integer(),
});

// Zod equivalent
const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  age: z.number().positive().int().optional(),
});
```

Key differences to watch:
- Yup: `required()` is explicit. Zod: fields are required by default, use `.optional()` to make them optional.
- Yup: validation is async. Zod: validation is sync by default (`parseAsync` for async).
- Yup: implicit coercion. Zod: explicit `z.coerce.number()`.

### Migrating from Zod to Valibot

```typescript
// Zod
const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  tags: z.array(z.string()).max(10),
});

// Valibot equivalent
const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1), v.maxLength(100)),
  email: v.pipe(v.string(), v.email()),
  tags: v.pipe(v.array(v.string()), v.maxLength(10)),
});
```

The main pattern: Zod's chained methods become `v.pipe()` calls.

---

## Decision Framework

### Choose Zod if:
- You're using tRPC (native integration)
- You want the largest ecosystem and community support
- Bundle size is not critical (server-side, Node.js apps)
- You want the most familiar API with good documentation

### Choose Yup if:
- You're using Formik (native integration, no setup)
- You need async validation in the schema (database checks during validation)
- You're maintaining existing Yup code

### Choose Valibot if:
- Bundle size matters (edge functions, browser-heavy apps)
- You're running validation in hot paths (high-throughput data pipelines)
- You want the best TypeScript inference with smallest footprint
- You're starting fresh and want maximum performance

### Choose ArkType if:
- You want the most TypeScript-native syntax
- You value catching schema errors at startup (type-safe strings)
- You're comfortable with a newer, less widely adopted library

---

## Common Validation Patterns

### Environment Variable Validation

```typescript
// Using Zod for env var validation (popular pattern)
import { z } from 'zod';

const EnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  JWT_SECRET: z.string().min(32),
});

export const env = EnvSchema.parse(process.env);
// Fails fast at startup if env is misconfigured
```

### API Response Validation

```typescript
// Validate external API responses
async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`https://api.example.com/users/${id}`);
  const data = await res.json();

  const result = UserSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid user response: ${result.error.message}`);
  }
  return result.data;
}
```

### Nested Object Updates (Partial Schemas)

```typescript
// Zod: partial for PATCH endpoints
const UserUpdateSchema = UserSchema.partial().required({ id: true });
// All fields optional except id

// Valibot equivalent
const UserUpdateSchema = v.object({
  id: v.number(), // required
  name: v.optional(v.string()),
  email: v.optional(v.pipe(v.string(), v.email())),
});
```

---

## Summary

In 2026, Zod remains the **default safe choice** — large community, excellent documentation, native tRPC support, and a familiar API. If you're not sure, use Zod.

Valibot is the **performance and size champion** — genuinely smaller bundles thanks to tree-shaking, and 2x faster parsing. Choose it for edge deployments and data-intensive apps.

Yup is the **legacy default** — still the best choice if you're on Formik or maintaining existing code, but new projects should start with Zod or Valibot.

ArkType is the **TypeScript purist's pick** — the most ergonomic syntax if you love TypeScript, with strong safety guarantees and excellent performance.

The validation library you choose matters less than the habit of validating at boundaries. Pick one, define schemas at API boundaries, form submissions, and environment variables — and runtime surprises will become rare.

---

*Find more TypeScript resources at [DevPlaybook](/tools). Test your JSON schemas with our free [JSON Validator](/tools/json-validator).*
