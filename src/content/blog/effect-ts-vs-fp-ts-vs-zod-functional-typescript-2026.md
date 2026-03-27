---
title: "Effect-TS vs fp-ts vs Zod: Functional TypeScript Patterns 2026"
description: "Compare Effect-TS, fp-ts, and Zod for functional programming in TypeScript. Learn error handling, dependency injection, schema validation, and when to use each library in 2026."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["typescript", "functional-programming", "effect-ts", "fp-ts", "zod", "type-safety", "backend"]
readingTime: "15 min read"
---

Functional programming in TypeScript has never been more accessible — or more confusing. You have three major libraries competing for the same mental space: **Effect-TS** (a full functional runtime), **fp-ts** (pure functional programming primitives), and **Zod** (runtime schema validation with TypeScript inference). Developers frequently ask: are these alternatives to each other? Should I use all three? Which one do I actually need?

This guide cuts through the confusion with concrete code examples, honest trade-offs, and clear use-case recommendations for 2026. Use our [TypeScript Playground](/tools/typescript-playground) or [JSON Schema Validator](/tools/json-schema-validator) to test the examples as you read.

---

## What Each Library Actually Does

Before comparing them, it's critical to understand what problem each library solves:

| Library | Primary purpose | Replaces |
|---|---|---|
| **Zod** | Runtime schema validation + TypeScript type inference | Joi, Yup, manual validation |
| **fp-ts** | Functional programming primitives (Option, Either, pipe) | Custom FP utilities, Maybe types |
| **Effect-TS** | Full functional runtime (errors, async, DI, observability) | Promise chains, try/catch, fp-ts |

**They are not pure alternatives.** Zod is a validation library. fp-ts provides FP building blocks. Effect-TS is a full application runtime. You might use Zod alone, or Zod + Effect, or just Effect (which has its own schema library).

---

## At a Glance: Feature Comparison

| Feature | Effect-TS | fp-ts | Zod |
|---|---|---|---|
| **Error handling** | ✅ Typed errors in Effect | ✅ Either type | ❌ throws / .safeParse |
| **Async support** | ✅ Built-in (Effect) | ⚠️ TaskEither | ❌ No |
| **Schema validation** | ✅ @effect/schema | ❌ No | ✅ Core feature |
| **Dependency injection** | ✅ Layer/Context | ❌ No | ❌ No |
| **Observability/tracing** | ✅ Built-in | ❌ No | ❌ No |
| **Bundle size** | Large (~150KB) | Medium (~60KB) | Small (~12KB) |
| **Learning curve** | Very steep | Steep | Low |
| **Tree-shakeable** | ✅ | ✅ | ✅ |
| **Type inference quality** | Excellent | Very good | Excellent |

---

## Zod: The Pragmatic Choice

Zod is the most widely adopted of the three. Its design philosophy is simple: declare a schema, validate data at runtime, and get full TypeScript types for free — with zero code generation.

### Basic Schema Validation

```typescript
import { z } from "zod";

// Define schema once — TypeScript type is inferred automatically
const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  email: z.string().email(),
  age: z.number().int().min(0).max(150).optional(),
  role: z.enum(["admin", "user", "viewer"]),
  createdAt: z.coerce.date(),
});

// TypeScript type inferred from schema — no duplication
type User = z.infer<typeof UserSchema>;

// Runtime validation
const result = UserSchema.safeParse(rawData);

if (result.success) {
  const user: User = result.data;  // Fully typed
  console.log(user.email);
} else {
  console.error(result.error.format());
  // { email: { _errors: ["Invalid email"] }, ... }
}
```

### Parsing API Request Bodies (Express/Hono)

```typescript
import { z } from "zod";
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";

const CreateUserSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8).regex(/[A-Z]/, "Must contain uppercase"),
});

const app = new Hono();

app.post(
  "/users",
  zValidator("json", CreateUserSchema),
  async (c) => {
    const { name, email, password } = c.req.valid("json");
    // data is fully typed — TypeScript knows all fields here
    const user = await createUser({ name, email, password });
    return c.json(user, 201);
  }
);
```

### Advanced: Transform & Refine

```typescript
const PasswordSchema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"],
  });

const DateRangeSchema = z
  .object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  })
  .transform((data) => ({
    ...data,
    durationMs: data.end.getTime() - data.start.getTime(),
  }));
```

### When to use Zod
- API request/response validation in any framework
- Environment variable parsing (`import { z } from "zod"; z.string().url().parse(process.env.DATABASE_URL)`)
- Form validation (React Hook Form + Zod is a standard combo)
- Configuration schemas
- Anywhere you receive untrusted data from the outside world

---

## fp-ts: Functional Programming Primitives

fp-ts brings Haskell-style type classes to TypeScript — Option (Maybe), Either, Task, IO, and more. It enables total, compositional functions without exceptions.

### Option: Safe Nullable Values

```typescript
import { option as O, pipe } from "fp-ts";

// Instead of: User | null | undefined
// Use: Option<User>

function findUser(id: string): O.Option<User> {
  const user = db.get(id);
  return user ? O.some(user) : O.none;
}

// Chain operations safely — if any step returns none, the whole chain is none
const emailOrDefault = pipe(
  findUser("user-123"),
  O.map((user) => user.email),
  O.filter((email) => email.includes("@company.com")),
  O.getOrElse(() => "unknown@company.com")
);
```

### Either: Typed Error Handling

```typescript
import { either as E, pipe } from "fp-ts";

type ValidationError = { field: string; message: string };
type DatabaseError = { code: string; message: string };

function validateEmail(email: string): E.Either<ValidationError, string> {
  return email.includes("@")
    ? E.right(email)
    : E.left({ field: "email", message: "Invalid email format" });
}

async function saveUser(
  data: UserCreate
): Promise<E.Either<ValidationError | DatabaseError, User>> {
  return pipe(
    validateEmail(data.email),
    E.chain(() => validateName(data.name)),
    // E.chain allows you to sequence operations that may fail
    E.map((validData) => ({ ...validData, id: uuid() }))
  );
}
```

### TaskEither: Async + Either Combined

```typescript
import { taskEither as TE, pipe } from "fp-ts";

type AppError = { type: "DB_ERROR" | "NOT_FOUND"; message: string };

const fetchUser = (id: string): TE.TaskEither<AppError, User> =>
  TE.tryCatch(
    () => db.users.findById(id),
    (err): AppError => ({ type: "DB_ERROR", message: String(err) })
  );

const getProfile = (id: string): TE.TaskEither<AppError, UserProfile> =>
  pipe(
    fetchUser(id),
    TE.chain((user) =>
      user
        ? TE.right(buildProfile(user))
        : TE.left({ type: "NOT_FOUND", message: `User ${id} not found` })
    )
  );

// Execute the task
const result = await getProfile("user-123")();
if (E.isRight(result)) {
  console.log(result.right); // UserProfile
} else {
  console.error(result.left); // AppError
}
```

### When to use fp-ts
- Teams with functional programming background (Haskell, Scala, Elm)
- Codebases where null/undefined bugs are common
- Domain logic that benefits from compositional, pure functions
- When you want explicit error types without exceptions

### The fp-ts Problem in 2026

fp-ts has largely been superseded by Effect-TS for new projects. The fp-ts author (Giulio Canti) now works on Effect, and fp-ts v3 development has stalled. Many fp-ts patterns (TaskEither, ReaderTaskEither) are verbose compared to their Effect equivalents.

---

## Effect-TS: The Full Functional Runtime

Effect-TS is the most ambitious of the three. It's not just a library — it's a complete application runtime that handles:

- Typed errors (like Either)
- Async operations (like Task/Promise)
- Dependency injection (like a DI container)
- Resource management (like bracket/finalizer patterns)
- Observability (built-in tracing and logging)
- Concurrency (fibers, structured concurrency)

### Basic Effect

```typescript
import { Effect, pipe } from "effect";

// Effect<A, E, R> — A = success type, E = error type, R = requirements (DI)
type DatabaseError = { _tag: "DatabaseError"; message: string };
type NotFoundError = { _tag: "NotFoundError"; id: string };

const fetchUser = (id: string): Effect.Effect<User, DatabaseError | NotFoundError> =>
  Effect.tryPromise({
    try: () => db.users.findById(id),
    catch: (err): DatabaseError => ({
      _tag: "DatabaseError",
      message: String(err),
    }),
  }).pipe(
    Effect.flatMap((user) =>
      user
        ? Effect.succeed(user)
        : Effect.fail({ _tag: "NotFoundError", id } as NotFoundError)
    )
  );
```

### Error Handling with Pattern Matching

```typescript
import { Effect, Match } from "effect";

const program = pipe(
  fetchUser("user-123"),
  Effect.catchTag("NotFoundError", (err) =>
    Effect.succeed({ id: err.id, name: "Anonymous", email: "" })
  ),
  Effect.catchTag("DatabaseError", (err) =>
    Effect.fail(new Error(`Fatal: ${err.message}`))
  )
);
```

### Dependency Injection with Layer/Context

```typescript
import { Effect, Layer, Context } from "effect";

// Define a service interface
class UserRepository extends Context.Tag("UserRepository")<
  UserRepository,
  {
    findById: (id: string) => Effect.Effect<User, NotFoundError>;
    save: (user: User) => Effect.Effect<User, DatabaseError>;
  }
>() {}

// Create a live implementation
const UserRepositoryLive = Layer.succeed(UserRepository, {
  findById: (id) =>
    Effect.tryPromise({
      try: () => db.users.findById(id),
      catch: () => ({ _tag: "NotFoundError", id } as NotFoundError),
    }),
  save: (user) =>
    Effect.tryPromise({
      try: () => db.users.save(user),
      catch: (err) => ({ _tag: "DatabaseError", message: String(err) } as DatabaseError),
    }),
});

// Use the service
const createUser = (data: UserCreate): Effect.Effect<User, DatabaseError, UserRepository> =>
  pipe(
    UserRepository,
    Effect.flatMap((repo) => repo.save({ ...data, id: uuid() }))
  );

// Compose and run
const main = pipe(
  createUser({ name: "Alice", email: "alice@example.com" }),
  Effect.provide(UserRepositoryLive)
);

Effect.runPromise(main).then(console.log);
```

### @effect/schema: Built-in Schema Validation

Effect ships its own schema library that integrates natively with its error model:

```typescript
import { Schema } from "@effect/schema";
import { Effect } from "effect";

const UserSchema = Schema.Struct({
  id: Schema.UUID,
  name: Schema.String.pipe(Schema.minLength(1), Schema.maxLength(255)),
  email: Schema.String.pipe(Schema.pattern(/.+@.+/)),
  role: Schema.Literal("admin", "user", "viewer"),
});

type User = Schema.Schema.Type<typeof UserSchema>;

// Decode returns an Effect — errors are typed
const decodeUser = Schema.decodeUnknown(UserSchema);

const program = pipe(
  decodeUser(rawBody),
  Effect.flatMap((user) => saveUser(user)),
  Effect.catchAll((err) => Effect.logError("Validation failed", err))
);
```

### When to use Effect-TS
- Greenfield TypeScript backend with complex business logic
- Teams committed to functional programming patterns
- Applications where observability, error traceability, and DI are critical
- Replacing tangled try/catch + promise chains in existing services
- You want structured concurrency (fibers) without raw async/await pitfalls

---

## Which Library for Which Scenario?

### Scenario 1: API Request Validation

**Use Zod.** It's the industry standard, integrates with every framework (tRPC, Hono, Fastify, Next.js), and is the simplest tool for the job.

```typescript
// Simple, effective, no overhead
const body = CreateUserSchema.parse(req.body);
```

### Scenario 2: Domain Logic with Error Propagation

**Use Effect-TS or fp-ts.** Both allow you to compose operations that may fail without throwing exceptions.

```typescript
// Effect-TS approach — preferred for new projects
const processOrder = (id: string) =>
  pipe(
    fetchOrder(id),
    Effect.flatMap(validateOrder),
    Effect.flatMap(chargePayment),
    Effect.flatMap(sendConfirmationEmail)
  );
```

### Scenario 3: Environment / Config Validation

**Use Zod.** Parse environment variables at startup and fail fast with clear messages.

```typescript
const Env = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]),
});

export const env = Env.parse(process.env);
```

### Scenario 4: Legacy Codebase Migration

**Start with Zod** for boundary validation. Incrementally add Effect for core services. Avoid fp-ts for new code — its maintenance status is uncertain.

### Scenario 5: tRPC or Full-Stack TypeScript

**Use Zod** — tRPC is built on Zod and expects it for input/output schemas.

---

## The 2026 Recommendation

**For most TypeScript projects:**

1. **Always use Zod** for runtime validation at system boundaries (API inputs, env vars, config files, external API responses).

2. **Use Effect-TS** if you're building complex backend services where you want typed errors, DI, and structured async. It has a steep learning curve but pays off in large codebases.

3. **Avoid starting new projects with fp-ts** — the community has largely moved to Effect. If you have existing fp-ts code, it still works, but don't expand it.

4. **You can combine Zod + Effect** — use Zod for the "edge" (HTTP boundaries) and Effect for the "core" (business logic, services).

```typescript
// The modern combo: Zod at the edge, Effect in the core
app.post("/orders", async (req, res) => {
  const body = CreateOrderSchema.parse(req.body);   // Zod validates input
  const result = await Effect.runPromise(            // Effect handles business logic
    pipe(
      validateInventory(body.items),
      Effect.flatMap(calculateTotal),
      Effect.flatMap(createOrder)
    )
  );
  res.json(result);
});
```

---

## Getting Started

```bash
# Zod (always recommended)
npm install zod

# Effect-TS (for functional runtime)
npm install effect @effect/schema

# fp-ts (for FP primitives, if not using Effect)
npm install fp-ts
```

### Learning Resources

- [Zod docs](https://zod.dev) — start here for schema validation
- [Effect docs](https://effect.website) — comprehensive guides and cookbook
- [fp-ts docs](https://gcanti.github.io/fp-ts) — still relevant for understanding the patterns

Validate your schemas and types as you learn with our [TypeScript Playground](/tools/typescript-playground) and [JSON Formatter](/tools/json-formatter).
