---
title: "Effect-TS vs fp-ts: Functional Programming in TypeScript 2026"
description: "Deep comparison of Effect-TS and fp-ts for functional programming in TypeScript 2026. Schemas, concurrency, error handling, migration paths, and real-world trade-offs."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["effect-ts", "fp-ts", "functional-programming", "typescript", "error-handling", "concurrency"]
readingTime: "14 min read"
---

Functional programming in TypeScript has two major libraries pulling in different directions: **fp-ts** (the original, battle-tested choice) and **Effect-TS** (the ambitious, all-in-one successor). In 2026, Effect-TS has emerged as the dominant new choice, but fp-ts still has a large install base and several strong arguments for staying put.

This guide cuts through the noise and gives you a real comparison—with code.

---

## The 30-Second Summary

- **fp-ts** is a functional programming toolkit: monadic types (Option, Either, Task, IO), `pipe`/`flow` composition, and HKTs. It's modular, small, and lets you pick what you need.
- **Effect-TS** is a full-featured effect system: structured concurrency, typed errors, dependency injection, tracing, and a schema library—all in one package.

They solve overlapping but distinct problems. fp-ts is a library; Effect-TS is a runtime.

---

## fp-ts: The Foundation

fp-ts pioneered type-safe functional programming in TypeScript. Its core abstractions:

### Option (Nullable Values)

```ts
import { Option, some, none, map, getOrElse } from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

const findUser = (id: string): Option<User> =>
  users.find(u => u.id === id) ? some(users.find(u => u.id === id)!) : none

const username = pipe(
  findUser('123'),
  map(user => user.name),
  getOrElse(() => 'Anonymous')
)
```

### Either (Error Handling)

```ts
import { Either, right, left, chain, map, mapLeft } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

const parseAge = (input: string): Either<string, number> => {
  const n = parseInt(input)
  return isNaN(n) ? left('Not a number') : n < 0 ? left('Must be positive') : right(n)
}

const validateAge = (age: number): Either<string, number> =>
  age >= 18 ? right(age) : left('Must be 18+')

const result = pipe(
  parseAge('25'),
  chain(validateAge),
  map(age => `Valid age: ${age}`),
  mapLeft(err => `Error: ${err}`)
)
// right('Valid age: 25')
```

### TaskEither (Async + Errors)

```ts
import { TaskEither, tryCatchK, chain } from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

const fetchUser = tryCatchK(
  (id: string) => fetch(`/api/users/${id}`).then(r => r.json()),
  (err): Error => new Error(String(err))
)

const fetchUserPosts = tryCatchK(
  (userId: string) => fetch(`/api/users/${userId}/posts`).then(r => r.json()),
  (err): Error => new Error(String(err))
)

const getUserWithPosts = (id: string) =>
  pipe(
    fetchUser(id),
    chain(user => fetchUserPosts(user.id))
  )

// Returns TaskEither<Error, Post[]>
```

### pipe and flow

The two most important functions in fp-ts:

```ts
import { pipe, flow } from 'fp-ts/function'

// pipe: apply functions left-to-right to a value
const result = pipe(
  [1, 2, 3, 4, 5],
  A.filter(n => n % 2 === 0),  // [2, 4]
  A.map(n => n * 10),           // [20, 40]
  A.reduce(0, (acc, n) => acc + n) // 60
)

// flow: compose functions into a new function (no initial value)
const process = flow(
  (s: string) => s.trim(),
  s => s.toLowerCase(),
  s => s.split(' ')
)

process('  Hello World  ') // ['hello', 'world']
```

---

## Effect-TS: The Modern Choice

Effect-TS takes a different approach: instead of composing types, you compose *effects*—descriptions of computations that may fail, require dependencies, or run concurrently.

### Basic Effect

```ts
import { Effect } from 'effect'

// An effect that succeeds with a value
const greet = Effect.succeed('Hello, World!')

// An effect that fails
const boom = Effect.fail(new Error('Something went wrong'))

// Running an effect
Effect.runPromise(greet).then(console.log) // 'Hello, World!'
```

### Error Handling with Typed Errors

```ts
import { Effect, Data } from 'effect'

// Define error types
class NotFoundError extends Data.TaggedError('NotFoundError')<{
  id: string
}> {}

class ValidationError extends Data.TaggedError('ValidationError')<{
  field: string
  message: string
}> {}

// Effect<User, NotFoundError | ValidationError, never>
const findUser = (id: string): Effect.Effect<User, NotFoundError> =>
  id === '123'
    ? Effect.succeed({ id, name: 'Alice' })
    : Effect.fail(new NotFoundError({ id }))

// Handle specific errors
const program = Effect.gen(function* () {
  const user = yield* findUser('456').pipe(
    Effect.catchTag('NotFoundError', (err) =>
      Effect.succeed({ id: err.id, name: 'Guest' })
    )
  )
  return user
})
```

### Effect.gen: The Game Changer

`Effect.gen` lets you write async-looking code with full type safety:

```ts
import { Effect } from 'effect'

const program = Effect.gen(function* () {
  // Each yield* unwraps the effect, propagating errors automatically
  const user = yield* fetchUser('123')
  const posts = yield* fetchPosts(user.id)
  const enriched = yield* enrichPosts(posts)

  return { user, posts: enriched }
})

// Error type is the union of all yielded effects' errors
// Effect<{ user: User; posts: Post[] }, FetchError | EnrichError, never>
```

Compare to fp-ts's equivalent using `pipe` + `chain`—Effect.gen is dramatically more readable.

### Dependency Injection

Effect-TS has a built-in DI system using `Context`:

```ts
import { Effect, Context, Layer } from 'effect'

// Define a service
class Database extends Context.Tag('Database')<
  Database,
  { findUser: (id: string) => Effect.Effect<User, NotFoundError> }
>() {}

// Use the service (no concrete implementation yet)
const program = Effect.gen(function* () {
  const db = yield* Database
  return yield* db.findUser('123')
})

// Provide an implementation
const PostgresDatabase = Layer.succeed(Database, {
  findUser: (id) =>
    Effect.tryPromise({
      try: () => postgres.query('SELECT * FROM users WHERE id = $1', [id]),
      catch: () => new NotFoundError({ id }),
    }),
})

// Test implementation
const MockDatabase = Layer.succeed(Database, {
  findUser: (id) => Effect.succeed({ id, name: 'Mock User' }),
})

// Run with real DB
Effect.runPromise(program.pipe(Effect.provide(PostgresDatabase)))

// Run with mock DB
Effect.runPromise(program.pipe(Effect.provide(MockDatabase)))
```

### Structured Concurrency

This is where Effect-TS has no fp-ts equivalent:

```ts
import { Effect } from 'effect'

// Run in parallel, fail fast if any fails
const parallel = Effect.all([
  fetchUser('1'),
  fetchUser('2'),
  fetchUser('3'),
], { concurrency: 'unbounded' })

// Run with concurrency limit
const limited = Effect.all(userIds.map(fetchUser), {
  concurrency: 5, // Max 5 concurrent requests
})

// Race - first one wins, others are cancelled
const fastest = Effect.race(
  fetchFromPrimary(id),
  fetchFromReplica(id),
)

// Timeout
const withTimeout = fetchData.pipe(
  Effect.timeout('5 seconds'),
  Effect.catchTag('TimeoutException', () => Effect.succeed(defaultData))
)
```

### Schema Validation

Effect-TS includes its own schema library (`@effect/schema`):

```ts
import { Schema } from '@effect/schema'
import { Effect } from 'effect'

const UserSchema = Schema.Struct({
  id: Schema.String,
  name: Schema.String.pipe(Schema.minLength(2)),
  email: Schema.String.pipe(Schema.pattern(/@/)),
  age: Schema.Number.pipe(Schema.between(0, 120)).pipe(Schema.optional),
})

type User = Schema.Schema.Type<typeof UserSchema>

// Decode/validate
const parseUser = Schema.decodeUnknown(UserSchema)

const program = Effect.gen(function* () {
  const rawData = yield* fetchRawData()
  const user = yield* parseUser(rawData)
  // user is fully typed User
  return user
})
```

---

## Head-to-Head Comparison

### Error Handling

**fp-ts:**
```ts
// Explicit pipe chains
const result = pipe(
  validateInput(data),              // Either<ValidationError, Input>
  E.chain(parseData),               // Either<ParseError, ParsedData>
  E.chain(saveToDatabase),          // Either<DbError, SavedData>
  E.mapLeft(err => ({ ...err, timestamp: Date.now() }))
)
```

**Effect-TS:**
```ts
// Generator style
const result = Effect.gen(function* () {
  const validated = yield* validateInput(data)
  const parsed = yield* parseData(validated)
  return yield* saveToDatabase(parsed)
}).pipe(
  Effect.mapError(err => ({ ...err, timestamp: Date.now() }))
)
```

Both achieve typed error propagation. Effect.gen wins on readability for multi-step flows; fp-ts pipe wins for simple transformations.

### Async Flows

**fp-ts (TaskEither):**
```ts
const program = pipe(
  TE.tryCatch(() => fetch('/api/data'), toError),
  TE.chain(res => TE.tryCatch(() => res.json(), toError)),
  TE.chain(validate),
)
```

**Effect-TS:**
```ts
const program = Effect.gen(function* () {
  const res = yield* Effect.tryPromise({ try: () => fetch('/api/data'), catch: toError })
  const data = yield* Effect.tryPromise({ try: () => res.json(), catch: toError })
  return yield* validate(data)
})
```

### Concurrency

fp-ts has `Apply.sequenceT` and `apply.par` variants, but they're cumbersome for complex scenarios. Effect-TS's concurrency model is first-class:

```ts
// Effect-TS: structured, composable, cancellable
const results = yield* Effect.all(items.map(processItem), {
  concurrency: 10,
  batching: true, // Automatically batches requests
})
```

### Bundle Size

| Library | Bundle (min+gzip) |
|---------|-------------------|
| fp-ts (core) | ~12KB |
| Effect-TS | ~95KB |

fp-ts is modular—you only import what you use. Effect-TS is heavier but replaces multiple libraries (async handling, validation, DI, logging, tracing).

---

## Learning Curve

**fp-ts:**
- Requires understanding HKTs (Higher-Kinded Types)
- The `pipe` + operator chain style is unfamiliar to most TypeScript developers
- Documentation is mathematically oriented
- Takes 2-4 weeks to feel productive

**Effect-TS:**
- `Effect.gen` feels like async/await—immediately familiar
- The full system (Layers, Context, Fibers) has depth, but the entry path is gentler
- Excellent documentation and growing community
- Takes 1-2 weeks to feel productive for common cases

---

## Community Adoption (2026)

Effect-TS has seen explosive growth:
- **npm downloads**: Effect-TS ~800K/week, fp-ts ~1.2M/week (but fp-ts's growth is flat; Effect's is steep)
- **GitHub stars**: Effect ~10K (growing fast), fp-ts ~10K (stable)
- Major companies using Effect-TS in production: Vercel (internal tooling), several fintech companies
- Effect-TS now has official integrations with Drizzle, Prisma, and other major tools

fp-ts remains dominant in codebases that adopted it early (2020-2022) and have no need to migrate.

---

## Migration: fp-ts to Effect-TS

Effect-TS provides adapters for common fp-ts types:

```ts
import { Effect } from 'effect'
import * as TE from 'fp-ts/TaskEither'

// Convert TaskEither to Effect
const fromTaskEither = <E, A>(te: TE.TaskEither<E, A>): Effect.Effect<A, E> =>
  Effect.async<A, E>(resume =>
    te().then(result => {
      if (result._tag === 'Left') resume(Effect.fail(result.left))
      else resume(Effect.succeed(result.right))
    })
  )

// Gradual migration: wrap existing fp-ts code
const legacyOperation = fromTaskEither(existingTaskEither)
const newProgram = Effect.gen(function* () {
  const result = yield* legacyOperation
  // Continue with Effect-TS
})
```

The recommended migration path: start with new features in Effect-TS, gradually wrap existing fp-ts code.

---

## When to Choose Each

**Choose fp-ts if:**
- You have an existing fp-ts codebase with team familiarity
- You need tree-shaking and minimal bundle size
- You want a library, not a runtime framework
- Your team is mathematically inclined and wants principled category theory foundations

**Choose Effect-TS if:**
- Starting a new project in 2026
- You need structured concurrency (rate limiting, parallelism, timeouts)
- You want a unified solution (validation, DI, logging, tracing)
- Your team finds async/await readable and wants similar ergonomics with full type safety
- You're building complex systems with many failure modes

**Use neither if:**
- You're on a team unfamiliar with FP concepts and have no time to invest
- Your error handling needs are simple (try/catch is fine for many cases)
- You're building a small script or CLI tool

---

## Quick Reference

| Feature | fp-ts | Effect-TS |
|---------|-------|-----------|
| Option/Maybe | ✅ `Option` | ✅ `Option` |
| Either/Result | ✅ `Either` | ✅ built-in |
| Async errors | ✅ `TaskEither` | ✅ `Effect` |
| Concurrency | ⚠️ Limited | ✅ First-class |
| Dependency Injection | ❌ | ✅ `Layer`/`Context` |
| Schema validation | ❌ (use io-ts) | ✅ `@effect/schema` |
| Structured logging | ❌ | ✅ `Effect.log*` |
| Distributed tracing | ❌ | ✅ `Tracer` |
| Bundle size | ~12KB | ~95KB |
| Learning curve | Steep | Moderate |

---

## Key Takeaways

Both libraries solve the same core problem—typed, composable error handling in TypeScript—but at different scales.

fp-ts is a scalpel: precise, minimal, and powerful if you know how to use it. Effect-TS is a full workshop: everything you need for complex systems in one coherent package.

For new projects in 2026, Effect-TS is the recommendation. The ergonomics of `Effect.gen`, the built-in concurrency primitives, and the unified ecosystem make it the more practical choice for production systems.

For existing fp-ts codebases: stay unless you have a specific pain point that Effect-TS solves. Migration has a cost.

**Related tools on DevPlaybook:**
- [TypeScript Playground](/tools/typescript-playground) — test fp-ts and Effect-TS snippets
- [JSON Schema Validator](/tools/json-schema-validator) — validate against Effect schemas
- [Code Formatter](/tools/code-formatter) — format TypeScript code
