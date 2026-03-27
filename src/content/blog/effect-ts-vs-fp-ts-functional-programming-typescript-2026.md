---
title: "Effect-TS vs fp-ts: Functional Programming in TypeScript 2026"
description: "A deep comparison of Effect-TS and fp-ts for functional programming in TypeScript. Covers error handling, async effects, data transformation, composability, and when to choose each library in 2026."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["typescript", "functional-programming", "effect-ts", "fp-ts", "error-handling", "async"]
readingTime: "12 min read"
---

Functional programming in TypeScript has matured significantly. Two libraries sit at the center of this ecosystem: **fp-ts** (the veteran) and **Effect-TS** (the newcomer that's taken over the conversation). Both enable type-safe, composable, side-effect-controlled code — but they take very different paths to get there.

This guide compares them across the dimensions that matter: error handling, async effects, data transformation, composability, and team ergonomics. By the end, you'll know which one fits your project.

## What Problem Are They Solving?

TypeScript's type system is powerful but doesn't natively model:

- **Failures** — functions can throw exceptions that aren't in their type signatures
- **Side effects** — async operations, I/O, and state mutations are invisible to the type system
- **Composability** — chaining operations that can fail requires careful error threading

Both fp-ts and Effect-TS use the type system to make these invisible concerns visible. The difference is scope and philosophy.

---

## fp-ts: Principled Haskell-Style FP

fp-ts was created by Giulio Canti and brings Haskell-style type classes to TypeScript. It's built around algebraic structures: `Functor`, `Applicative`, `Monad`, `Traversable`. If you've used Haskell or Scala, fp-ts will feel familiar.

### Core Abstractions

The main data types:

```typescript
import { Either, left, right } from 'fp-ts/Either'
import { Option, some, none } from 'fp-ts/Option'
import { TaskEither } from 'fp-ts/TaskEither'
import { pipe } from 'fp-ts/function'

// Either<Error, Value> — synchronous computation that can fail
const divide = (a: number, b: number): Either<string, number> =>
  b === 0 ? left('Division by zero') : right(a / b)

// Option<Value> — value that may not exist
const findUser = (id: number): Option<User> =>
  users.find(u => u.id === id) ? some(users.find(u => u.id === id)!) : none

// TaskEither<Error, Value> — async computation that can fail
const fetchUser = (id: number): TaskEither<Error, User> =>
  () => fetch(`/users/${id}`)
       .then(r => r.json())
       .then(right)
       .catch(e => left(e))
```

### Error Handling with pipe

fp-ts is centered on `pipe` — a left-to-right function composition operator:

```typescript
import { pipe } from 'fp-ts/function'
import * as E from 'fp-ts/Either'
import * as TE from 'fp-ts/TaskEither'

// Synchronous error handling
const result = pipe(
  divide(10, 2),           // Either<string, number>
  E.map(n => n * 100),     // Either<string, number>
  E.chain(n => divide(n, 4)), // Either<string, number>
  E.fold(
    err => `Error: ${err}`,
    val => `Result: ${val}`
  )
)

// Async error handling
const fetchAndProcess = (userId: number) =>
  pipe(
    fetchUser(userId),                          // TaskEither<Error, User>
    TE.chain(user => fetchUserPosts(user.id)),  // TaskEither<Error, Post[]>
    TE.map(posts => posts.filter(p => p.active)), // TaskEither<Error, Post[]>
    TE.fold(
      err => T.of(`Failed: ${err.message}`),
      posts => T.of(`Found ${posts.length} posts`)
    )
  )
```

### Data Transformation

fp-ts has strong utilities for transforming arrays and records:

```typescript
import * as A from 'fp-ts/Array'
import * as R from 'fp-ts/Record'
import { pipe } from 'fp-ts/function'

// Collect all errors from an array of validations
const validateAll = (inputs: string[]): Either<string[], number[]> =>
  pipe(
    inputs,
    A.map(parseNumber),           // Array<Either<string, number>>
    A.separate,                   // { left: string[], right: number[] }
    ({ left, right }) =>
      left.length > 0 ? E.left(left) : E.right(right)
  )
```

### The fp-ts Learning Curve

fp-ts uses Haskell naming conventions directly: `chain` (flatMap), `ap` (apply), `traverse`, `sequence`. For developers without FP backgrounds, the abstractions are unfamiliar:

```typescript
// Applying a function in a context — confusing if new to FP
import * as O from 'fp-ts/Option'

const add = (a: number) => (b: number) => a + b

const result = pipe(
  O.some(add),           // Option<(b: number) => number>
  O.ap(O.some(5))        // Option<number>
)
```

---

## Effect-TS: A Complete Runtime for TypeScript

Effect (formerly Effect-TS) started as a fp-ts inspired library but has grown into something more ambitious: **a complete runtime system for building production TypeScript applications**. It's developed by the Effect team (led by Michael Arnaldi) and has seen explosive adoption in 2025-2026.

Effect models computations as `Effect<A, E, R>`:
- `A` — success value type
- `E` — error type
- `R` — required dependencies (services)

### Core Abstractions

```typescript
import { Effect, pipe } from 'effect'

// Effect<number, never, never> — infallible sync effect
const pure = Effect.succeed(42)

// Effect<number, Error, never> — fallible effect
const divide = (a: number, b: number): Effect.Effect<number, Error> =>
  b === 0
    ? Effect.fail(new Error('Division by zero'))
    : Effect.succeed(a / b)

// Effect<User, HttpError, never> — async effect
const fetchUser = (id: number): Effect.Effect<User, HttpError> =>
  Effect.tryPromise({
    try: () => fetch(`/users/${id}`).then(r => r.json()),
    catch: (e) => new HttpError(String(e))
  })
```

### Error Handling

Effect has a significantly more ergonomic error handling model than fp-ts:

```typescript
import { Effect, pipe } from 'effect'

// Typed errors with automatic error accumulation
const program = pipe(
  fetchUser(1),
  Effect.flatMap(user => fetchUserPosts(user.id)),
  Effect.map(posts => posts.filter(p => p.active)),
  Effect.catchTag('HttpError', (e) =>
    Effect.succeed([])  // recover from specific error type
  ),
  Effect.catchAll((e) =>
    Effect.fail(new AppError(`Unhandled: ${e}`))
  )
)

// Run it
Effect.runPromise(program).then(console.log).catch(console.error)
```

### Dependency Injection with Context

Effect's killer feature is its built-in dependency injection system:

```typescript
import { Effect, Context, Layer } from 'effect'

// Define a service interface
class UserRepo extends Context.Tag('UserRepo')<
  UserRepo,
  {
    findById: (id: number) => Effect.Effect<User, NotFoundError>
    save: (user: User) => Effect.Effect<void, DbError>
  }
>() {}

// Use the service in your effects
const updateUser = (id: number, name: string) =>
  Effect.gen(function* () {
    const repo = yield* UserRepo  // dependency injected
    const user = yield* repo.findById(id)
    const updated = { ...user, name }
    yield* repo.save(updated)
    return updated
  })

// Provide implementation
const UserRepoLive = Layer.succeed(UserRepo, {
  findById: (id) => Effect.tryPromise(/* real DB query */),
  save: (user) => Effect.tryPromise(/* real DB write */)
})

// Test implementation
const UserRepoTest = Layer.succeed(UserRepo, {
  findById: () => Effect.succeed(mockUser),
  save: () => Effect.void
})

// Run with production deps
const main = updateUser(1, 'Alice').pipe(
  Effect.provide(UserRepoLive)
)
```

### Generator Syntax

Effect supports `Effect.gen` with generator syntax, making async code look synchronous:

```typescript
import { Effect } from 'effect'

const program = Effect.gen(function* () {
  const user = yield* fetchUser(1)         // extracts value or propagates error
  const posts = yield* fetchUserPosts(user.id)
  const active = posts.filter(p => p.active)

  if (active.length === 0) {
    yield* Effect.fail(new Error('No active posts'))
  }

  return { user, posts: active }
})
```

This is dramatically more readable than nested `.chain()` calls.

---

## Head-to-Head Comparison

### Error Handling

| Feature | fp-ts | Effect-TS |
|---|---|---|
| Error type in signature | ✅ `Either<E, A>` | ✅ `Effect<A, E>` |
| Error recovery | `fold`, `getOrElse` | `catchTag`, `catchAll`, `orElse` |
| Typed error narrowing | Manual | Automatic with `catchTag` |
| Error accumulation | `Validation`/`These` | `Effect.all` with `mode: 'validate'` |
| Runtime error handling | Manual wrapping | Built-in `Effect.tryPromise` |

Effect-TS wins on ergonomics here. `catchTag` lets you handle specific error variants without pattern matching boilerplate:

```typescript
// fp-ts — you handle all errors the same way
pipe(
  result,
  E.fold(
    (e) => { if (e instanceof NotFoundError) { /* ... */ } },
    (v) => v
  )
)

// Effect-TS — type-safe, tag-based error routing
pipe(
  result,
  Effect.catchTag('NotFoundError', () => Effect.succeed(defaultValue)),
  Effect.catchTag('DbError', (e) => Effect.fail(new AppError(e.message)))
)
```

### Async Handling

fp-ts uses `TaskEither` — essentially `() => Promise<Either<E, A>>`. This is composable but verbose:

```typescript
// fp-ts
import * as TE from 'fp-ts/TaskEither'

const fetchAndSave = (id: number): TE.TaskEither<Error, void> =>
  pipe(
    TE.tryCatch(() => fetch(`/users/${id}`).then(r => r.json()), E.toError),
    TE.chain(user => TE.tryCatch(() => db.save(user), E.toError))
  )
```

Effect-TS handles this more naturally:

```typescript
// Effect-TS
const fetchAndSave = (id: number) =>
  Effect.gen(function* () {
    const resp = yield* Effect.tryPromise(() => fetch(`/users/${id}`))
    const user = yield* Effect.tryPromise(() => resp.json())
    yield* Effect.tryPromise(() => db.save(user))
  })
```

### Composability

Both libraries are highly composable, but in different ways.

fp-ts composability comes from algebraic laws — if something is a `Monad`, you know exactly how it behaves. Effect's composability comes from its fiber-based runtime and service layer.

```typescript
// fp-ts — composing validations
import * as V from 'fp-ts/Validation'

const validateAge = (n: number): Validation<string[], number> =>
  n < 0 ? failure(['Age cannot be negative']) : success(n)

const validateName = (s: string): Validation<string[], string> =>
  s.length === 0 ? failure(['Name cannot be empty']) : success(s)

const validateUser = ({ age, name }: Input) =>
  pipe(
    V.getApplicativeValidation(getSemigroup<string>())),
    ap(validateAge(age)),
    ap(validateName(name))
  )

// Effect-TS — composing validations
const validateAge = (n: number) =>
  n < 0 ? Effect.fail('Age cannot be negative') : Effect.succeed(n)

const validateName = (s: string) =>
  s.length === 0 ? Effect.fail('Name cannot be empty') : Effect.succeed(s)

const validateUser = ({ age, name }: Input) =>
  Effect.all([validateAge(age), validateName(name)], { mode: 'validate' })
```

### Performance

Effect has a fiber-based async runtime that can schedule thousands of concurrent operations efficiently. It's closer to Erlang's actor model than Promise chains.

fp-ts has no special runtime — it composes standard Promise chains and sync functions. Fine for most apps, but lacks Effect's concurrency primitives.

```typescript
// Effect — structured concurrency
const results = yield* Effect.all(
  ids.map(fetchUser),
  { concurrency: 10 }  // max 10 parallel requests
)

// Race with timeout
const result = yield* Effect.race(
  fetchUser(id),
  Effect.fail(new TimeoutError()).pipe(Effect.delay('5 seconds'))
)
```

---

## Bundle Size and Dependencies

| Library | Bundle size (gzipped) | Dependencies |
|---|---|---|
| fp-ts | ~45kb | Zero |
| Effect (core) | ~120kb | Zero |
| Effect (full) | ~300kb+ | Zero |

fp-ts is significantly lighter. For library authors or edge environments, this matters.

---

## When to Choose fp-ts

- **Library development** — minimal bundle size, no runtime overhead
- **Team has FP/Haskell background** — algebraic naming will feel natural
- **Incremental adoption** — can apply to specific modules without a full commitment
- **Focused use** — just need `Option`/`Either` for safer null/error handling

```typescript
// fp-ts shines for focused use cases
import * as O from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Clean nullable handling without Effect overhead
const getDisplayName = (user: User): string =>
  pipe(
    O.fromNullable(user.nickname),
    O.getOrElse(() => user.username)
  )
```

## When to Choose Effect-TS

- **Full application development** — API servers, CLIs, background jobs
- **Team is primarily TypeScript/JS** — generator syntax reads like async/await
- **Complex async workflows** — structured concurrency, retries, timeouts
- **Dependency injection** — testability is a first-class concern
- **Observability** — Effect has built-in tracing support

```typescript
// Effect shines for complex application logic
const processOrder = (orderId: string) =>
  Effect.gen(function* () {
    const db = yield* Database
    const queue = yield* MessageQueue
    const logger = yield* Logger

    yield* logger.info(`Processing order ${orderId}`)
    const order = yield* db.orders.findById(orderId)
    const validated = yield* validateOrder(order)
    yield* db.orders.update(orderId, { status: 'processing' })
    yield* queue.publish('order.processing', validated)

    return validated
  }).pipe(
    Effect.retry({ times: 3, delay: '1 second' }),
    Effect.timeout('30 seconds'),
    Effect.withSpan('processOrder', { attributes: { orderId } })
  )
```

---

## Migration Path

If you're on fp-ts and considering Effect, there's a practical migration path:

1. **Start at the boundaries** — replace `TaskEither` with Effect where new code is written
2. **Use fp-ts-to-effect adapters** — the Effect team provides conversion utilities
3. **Migrate leaf functions first** — pure data transformations are easy to convert
4. **Move the application shell last** — the `Effect.runPromise` call at the top

```typescript
// Bridging fp-ts and Effect during migration
import { Effect } from 'effect'
import * as TE from 'fp-ts/TaskEither'

const fromTaskEither = <E, A>(te: TE.TaskEither<E, A>): Effect.Effect<A, E> =>
  Effect.promise(te).pipe(
    Effect.flatMap(either =>
      either._tag === 'Right'
        ? Effect.succeed(either.right)
        : Effect.fail(either.left)
    )
  )
```

---

## The Verdict

**fp-ts** remains the right choice for teams wanting algebraic FP foundations, minimal dependencies, or incremental adoption of FP patterns in existing codebases. It's battle-tested and the concepts transfer to other ecosystems.

**Effect-TS** is the right choice for building new TypeScript applications where you want the full package: typed errors, dependency injection, structured concurrency, observability, and a runtime that handles the hard parts of production software. The learning curve is real, but the payoff for complex applications is substantial.

In 2026, the trend is clear: **Effect is winning new application development** while fp-ts remains dominant in library code and FP-curious teams dipping their toes in.

---

## Further Reading

- [Effect official docs](https://effect.website/docs)
- [fp-ts docs](https://gcanti.github.io/fp-ts/)
- Try the [TypeScript playground](/tools/typescript-playground) to experiment with both libraries
- [JSON formatter](/tools/json-formatter) for inspecting Effect's structured errors
