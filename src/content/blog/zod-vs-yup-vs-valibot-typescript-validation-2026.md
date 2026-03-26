---
title: "Runtime Validation in TypeScript: Zod vs Yup vs Valibot 2026"
description: "A deep-dive comparison of the top TypeScript validation libraries in 2026. We benchmark Zod, Yup, and Valibot on bundle size, DX, type inference, React Hook Form integration, and tRPC compatibility — with a migration guide included."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["zod", "yup", "valibot", "typescript", "validation", "react-hook-form", "trpc"]
readingTime: "11 min read"
---

# Runtime Validation in TypeScript: Zod vs Yup vs Valibot 2026

TypeScript is a compile-time tool. When your application actually runs — whether in Node.js, a browser, or an edge runtime — TypeScript types are gone. Every `unknown` payload from an API, every form submission, every JSON config file is a potential source of runtime chaos. That's the core problem runtime validation libraries solve.

In 2026, three libraries dominate this space: **Zod**, **Yup**, and **Valibot**. Each one takes a different philosophy to schema definition, type inference, and bundle efficiency. This article covers all three in depth, compares them head-to-head, examines integration with React Hook Form and tRPC, and gives you a practical decision framework for picking the right tool for your project.

---

## Why Runtime Validation Matters

Consider a typical API route that accepts user data:

```typescript
// Without validation — dangerous
app.post("/users", async (req, res) => {
  const { email, age } = req.body; // Could be anything
  await db.users.create({ email, age });
});
```

TypeScript won't catch that `age` arrived as `"twenty-five"` or that `email` is missing entirely. Only a validation layer can enforce the shape of external data at runtime.

Runtime validation buys you three things:

1. **Safety** — Reject malformed data before it touches your database or business logic.
2. **Type narrowing** — After validation, the TypeScript compiler knows the exact shape of your data.
3. **User-facing error messages** — Validation libraries produce structured error objects you can map directly to form field errors.

Modern full-stack TypeScript (tRPC, Next.js Server Actions, Remix actions) has made schema-first development a first-class pattern. Picking the right validation library now has real consequences for your bundle size, developer experience, and long-term maintainability.

---

## Zod: The Community Standard

Zod, created by Colin McDonnell, became the de-facto standard for TypeScript runtime validation around 2022 and has maintained that position through 2026. Its core value proposition is **zero dependencies, first-class TypeScript inference, and a fluent chainable API**.

### Zod API Overview

```typescript
import { z } from "zod";

const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  age: z.number().int().min(18).max(120),
  role: z.enum(["admin", "editor", "viewer"]),
  createdAt: z.coerce.date(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// TypeScript type inferred automatically — no duplication
type User = z.infer<typeof UserSchema>;

// Parsing (throws on failure)
const user = UserSchema.parse(rawData);

// Safe parsing (returns { success, data } or { success, error })
const result = UserSchema.safeParse(rawData);
if (result.success) {
  console.log(result.data.email); // fully typed
} else {
  console.error(result.error.flatten());
}
```

The `z.infer<typeof Schema>` pattern is arguably Zod's killer feature. You define your schema once, and TypeScript derives the type automatically. No duplicated interface declarations.

### Zod Transforms and Refinements

Zod supports data transformation pipelines and custom validation logic:

```typescript
const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[0-9]/, "Must contain a number")
  .transform((val) => val.trim());

const PositiveIntSchema = z
  .number()
  .refine((n) => n > 0, { message: "Must be positive" });

// Async refinement — e.g., uniqueness check
const UniqueEmailSchema = z.string().email().refine(
  async (email) => {
    const exists = await db.users.findByEmail(email);
    return !exists;
  },
  { message: "Email already in use" }
);
```

### Zod Bundle Size

Zod v3 weighs approximately **13.5 kB minified + gzipped**. Zod v4 (released in 2025) improved performance significantly and slimmed down to around **10 kB** for the core, with a new `z/mini` build for even smaller footprints. For most server-side use cases, bundle size is irrelevant. For client-side form validation in performance-sensitive apps, it's worth noting.

---

## Yup: The Veteran

Yup predates TypeScript's rise to dominance. It was the go-to validation library for Formik-heavy React apps throughout 2018–2022. In 2026, Yup remains widely deployed in legacy codebases and retains a dedicated following for its fluent API and powerful async validation story.

### Yup API Overview

```typescript
import * as yup from "yup";

const userSchema = yup.object({
  id: yup.string().uuid().required(),
  email: yup.string().email().required(),
  age: yup.number().integer().min(18).max(120).required(),
  role: yup.mixed<"admin" | "editor" | "viewer">()
    .oneOf(["admin", "editor", "viewer"])
    .required(),
});

// Yup requires a separate type extraction utility
type User = yup.InferType<typeof userSchema>;

// Validation
try {
  const user = await userSchema.validate(rawData, { abortEarly: false });
} catch (err) {
  if (err instanceof yup.ValidationError) {
    console.log(err.errors); // array of error messages
  }
}
```

### Yup's Async Validation

Yup's async validation was a major differentiator in its early days. The `validate()` method is always Promise-based, which makes async checks (like database lookups) natural:

```typescript
const signupSchema = yup.object({
  username: yup
    .string()
    .required()
    .test("unique-username", "Username already taken", async (value) => {
      if (!value) return false;
      const taken = await checkUsernameExists(value);
      return !taken;
    }),
});
```

### Yup's TypeScript Story

Yup's TypeScript support has improved considerably with v1.x, but it's still not as seamless as Zod's. The inferred types can sometimes be overly loose (lots of `any` or `unknown` leakage in complex schemas), and you occasionally need to add manual type annotations to get full safety. For greenfield TypeScript projects, this is a meaningful disadvantage.

### Yup Bundle Size

Yup v1.x is approximately **11 kB minified + gzipped** — comparable to Zod. The real cost is the dependency on a few utility packages, though modern bundlers tree-shake these effectively.

---

## Valibot: The Tree-Shaking Pioneer

Valibot entered the scene in 2023 and immediately challenged the status quo with a radically different architecture. Where Zod and Yup use a class-based, chainable object model, Valibot uses **composable functions** — every validator is a standalone function that bundlers can tree-shake independently.

### Valibot's Modular Architecture

```typescript
import {
  object,
  string,
  number,
  email,
  minLength,
  minValue,
  maxValue,
  integer,
  parse,
  safeParse,
  pipe,
  type InferOutput,
} from "valibot";

const UserSchema = object({
  id: string(),
  email: pipe(string(), email()),
  age: pipe(number(), integer(), minValue(18), maxValue(120)),
  name: pipe(string(), minLength(2)),
});

type User = InferOutput<typeof UserSchema>;

const result = safeParse(UserSchema, rawData);
if (result.success) {
  console.log(result.output.email);
} else {
  console.log(result.issues);
}
```

The key difference is the `pipe()` function. Instead of chaining methods on a class instance (`z.string().email().min(5)`), you compose standalone validator functions. Every validator you **don't** import is eliminated from your bundle.

### Valibot Bundle Size

This is where Valibot shines:

- **Minimum bundle** (single field validator): ~600 bytes
- **Typical form schema**: ~1.5–3 kB
- **Full library** (all exports): ~9 kB

Compared to Zod's fixed ~10 kB baseline (even if you use only one validator), Valibot's approach is transformative for edge deployments, serverless functions with tight startup time requirements, and client-side validation bundles.

### Valibot TypeScript Inference

Valibot's type inference is on par with Zod:

```typescript
import { object, string, number, array, optional, InferOutput } from "valibot";

const ProductSchema = object({
  name: string(),
  price: number(),
  tags: optional(array(string())),
});

type Product = InferOutput<typeof ProductSchema>;
// { name: string; price: number; tags?: string[] | undefined }
```

The `InferOutput` and `InferInput` utilities (the latter useful when transforms change the shape) give you full compile-time safety.

---

## ArkType: The Honorable Mention

No 2026 comparison is complete without mentioning **ArkType**. ArkType uses TypeScript's template literal types to parse schema syntax strings at compile time:

```typescript
import { type } from "arktype";

const User = type({
  name: "string > 2",
  age: "number.integer > 0",
  email: "string.email",
});
```

ArkType achieves near-native TypeScript parsing performance and has among the smallest bundles of any validator. Its syntax is unique and has a learning curve, but for performance-critical validation paths (high-throughput API servers, edge functions), it's worth evaluating. For most teams building standard web apps, Zod or Valibot will be more approachable.

---

## React Hook Form Integration

React Hook Form (RHF) is the dominant form library in the React ecosystem, and all three validators integrate via the `@hookform/resolvers` package.

### Zod + React Hook Form

```typescript
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Min 8 characters"),
});

type FormData = z.infer<typeof schema>;

function LoginForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  return (
    <form onSubmit={handleSubmit((data) => console.log(data))}>
      <input {...register("email")} />
      {errors.email && <p>{errors.email.message}</p>}
      <input type="password" {...register("password")} />
      {errors.password && <p>{errors.password.message}</p>}
      <button type="submit">Login</button>
    </form>
  );
}
```

### Yup + React Hook Form

```typescript
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";

const schema = yup.object({
  email: yup.string().email("Invalid email").required("Required"),
  password: yup.string().min(8, "Min 8 characters").required("Required"),
});

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: yupResolver(schema),
});
```

### Valibot + React Hook Form

```typescript
import { valibotResolver } from "@hookform/resolvers/valibot";
import { object, string, pipe, email, minLength, type InferOutput } from "valibot";

const schema = object({
  email: pipe(string(), email("Invalid email")),
  password: pipe(string(), minLength(8, "Min 8 characters")),
});

type FormData = InferOutput<typeof schema>;

const { register, handleSubmit } = useForm<FormData>({
  resolver: valibotResolver(schema),
});
```

All three integrations work equivalently well. The resolver pattern is stable across the ecosystem, so switching validators doesn't change your form component code significantly.

---

## tRPC Integration

tRPC uses validation schemas as input/output validators for procedures. Zod is tRPC's officially recommended validator, but Yup and Valibot both work through adapters.

### Zod with tRPC (First-Class Support)

```typescript
import { initTRPC } from "@trpc/server";
import { z } from "zod";

const t = initTRPC.create();

export const appRouter = t.router({
  createUser: t.procedure
    .input(z.object({
      email: z.string().email(),
      name: z.string().min(2),
    }))
    .mutation(async ({ input }) => {
      // input is fully typed: { email: string; name: string }
      return await db.users.create(input);
    }),
});
```

### Valibot with tRPC

tRPC v11 added official support for Valibot via `@valibot/to-json-schema` and the standard input validator interface:

```typescript
import { wrap } from "@decs/trpc-shield"; // or direct valibot adapter
import { object, string, pipe, email } from "valibot";

createUser: t.procedure
  .input(object({ email: pipe(string(), email()) }))
  .mutation(async ({ input }) => { /* input typed correctly */ });
```

For greenfield tRPC projects, Zod remains the path of least resistance due to first-class documentation and ecosystem support. For bundle-sensitive tRPC deployments (edge runtimes, Cloudflare Workers), Valibot is worth the setup cost.

---

## Bundle Size Comparison

| Library | Minified | Minified + Gzipped | Tree-shakeable |
|---|---|---|---|
| Zod v4 | ~29 kB | ~10 kB | Partial (object-based) |
| Yup v1 | ~30 kB | ~11 kB | Partial |
| Valibot v1 | ~9 kB (full) | ~3 kB (typical usage) | Full |
| ArkType v2 | ~17 kB | ~6 kB | Partial |

For server-side Node.js applications, bundle size is largely irrelevant — pick based on DX and ecosystem fit. For edge functions, browser bundles, or anything running on Cloudflare Workers with strict size limits, Valibot's tree-shaking is a genuine advantage.

---

## Performance Benchmarks

Validation performance rarely bottlenecks real-world applications, but for high-throughput scenarios (validating thousands of API requests per second), the differences matter.

Approximate throughput for validating a 5-field object schema (operations/second, Node.js 22):

| Library | Simple Schema | Complex Schema (10 fields, nested) |
|---|---|---|
| Zod v4 | ~800k ops/s | ~200k ops/s |
| Yup v1 | ~150k ops/s | ~40k ops/s |
| Valibot v1 | ~1.2M ops/s | ~350k ops/s |
| ArkType v2 | ~2M ops/s | ~600k ops/s |

Yup's async-first architecture imposes measurable overhead on synchronous validation paths. For CPU-bound validation at scale, Valibot and ArkType are clear winners. For typical web applications processing hundreds of requests per second, Zod's performance is more than adequate.

---

## Migration Guide: Yup to Zod

If you're maintaining a Formik/Yup codebase and considering migration, here's a field-by-field translation guide:

```typescript
// YUP                                      // ZOD EQUIVALENT
yup.string()                                z.string()
yup.string().required()                     z.string().min(1)  // or .nonempty()
yup.string().nullable()                     z.string().nullable()
yup.string().optional()                     z.string().optional()
yup.string().email()                        z.string().email()
yup.string().url()                          z.string().url()
yup.string().min(n)                         z.string().min(n)
yup.string().max(n)                         z.string().max(n)
yup.string().matches(/regex/)               z.string().regex(/regex/)

yup.number().required()                     z.number()
yup.number().integer()                      z.number().int()
yup.number().min(n)                         z.number().min(n)
yup.number().positive()                     z.number().positive()

yup.boolean().required()                    z.boolean()
yup.date().required()                       z.date()  // or z.coerce.date()

yup.array().of(yup.string())                z.array(z.string())
yup.object({ ... })                         z.object({ ... })

yup.mixed().oneOf(["a", "b"])               z.enum(["a", "b"])
yup.mixed().nullable().optional()           z.union([z.string(), z.null()]).optional()

// Async test
yup.string().test("name", "msg", async fn) // z.string().refine(async fn, "msg")
```

**Migration strategy**: Start with leaf schemas (no dependencies), test them in isolation, then migrate parent schemas. Keep Yup installed until all schemas are migrated to avoid a big-bang rewrite.

---

## Decision Framework

**Choose Zod when:**
- You're starting a new TypeScript project and want the widest ecosystem support
- You're using tRPC (it's the official recommendation)
- You want excellent DX with minimal configuration
- Your team is already familiar with Zod
- Bundle size is not a primary constraint

**Choose Yup when:**
- You're maintaining an existing Formik/Yup codebase (migration cost isn't justified)
- You heavily rely on async validation and prefer the `validate()` promise API
- You're working with a team more comfortable with Yup's API style

**Choose Valibot when:**
- You're building for edge runtimes (Cloudflare Workers, Vercel Edge, Deno Deploy)
- Bundle size is a critical metric (e.g., client-side validation in a performance-optimized app)
- You want maximum tree-shaking control
- You're comfortable with a functional composition style

**Consider ArkType when:**
- You're building a high-throughput API server where validation CPU time is measurable
- Your team values extremely terse, string-based schema syntax
- You want the absolute best performance-per-byte ratio

---

## Summary

| Criteria | Zod | Yup | Valibot |
|---|---|---|---|
| TypeScript inference | Excellent | Good | Excellent |
| Bundle size | Medium (~10 kB) | Medium (~11 kB) | Tiny (usage-based) |
| Tree-shaking | Partial | Partial | Full |
| tRPC support | First-class | Via adapter | Via adapter |
| RHF support | First-class | First-class | First-class |
| Async validation | Yes | Yes (native) | Yes |
| Learning curve | Low | Low | Low-Medium |
| Ecosystem maturity | Very high | High | Growing |
| Performance | Fast | Moderate | Very fast |

In 2026, **Zod** remains the safest default for most TypeScript projects — its ecosystem integration, documentation, and community support are unmatched. **Valibot** is the right call when you're optimizing for edge deployments or bundle size budgets. **Yup** makes sense when you're working in an existing codebase that already depends on it.

All three are production-ready, actively maintained, and capable of handling the vast majority of validation scenarios you'll encounter in real-world TypeScript applications. The choice between them is mostly about trade-offs in bundle size, ecosystem fit, and team familiarity — not about correctness or reliability.

Pick one, define your schemas close to your data contracts, and validate at every boundary where external data enters your system. That discipline matters far more than which library you use.
