---
title: "Effect.ts vs fp-ts: Practical Functional TypeScript Guide 2026"
description: "A hands-on guide to Effect.ts vs fp-ts in 2026 — dependency injection, pipe/flow patterns, error handling, and when each functional TypeScript library fits your project."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["effect-ts", "fp-ts", "typescript", "functional-programming", "error-handling", "dependency-injection"]
readingTime: "14 min read"
---

# Effect.ts vs fp-ts: Practical Functional TypeScript Guide 2026

Functional programming in TypeScript has two serious contenders in 2026: **fp-ts** — the battle-tested foundational library that brought Haskell-style type classes to TypeScript — and **Effect.ts** — the newer, more opinionated runtime that treats side effects, concurrency, and dependency injection as first-class concerns.

Both are powerful. Both will change how you think about error handling. But they solve different problems at different levels of abstraction. This guide is practical: real code, real trade-offs, concrete guidance on when to use each.

---

## The Core Philosophical Difference

fp-ts is a **library**. It gives you Option, Either, TaskEither, and the tools to compose them. You bring the architecture.

Effect.ts is a **runtime**. It gives you a fiber-based concurrency model, a dependency injection system, structured concurrency, and a unified error channel. It's closer to a lightweight alternative to the JVM's ZIO or Cats Effect than to fp-ts.

If you want to adopt functional patterns incrementally, fp-ts fits. If you're building an application that needs structured error handling, dependency injection, and concurrent effects throughout, Effect.ts is worth the steeper learning curve.

---

## fp-ts: The Foundations

### Option — Handling Missing Values

Option replaces nullable values with an explicit type. `Some<A>` means the value exists; `None` means it doesn't.

```typescript
import { Option, some, none, fromNullable, map, getOrElse, chain } from 'fp-ts/Option'
import { pipe } from 'fp-ts/function'

// Creating Options
const name: Option<string> = some('Alice')
const missing: Option<string> = none
const fromDB: Option<string> = fromNullable(null)  // → None

// Transforming with pipe
const greeting = pipe(
  fromNullable(getUserById(42)),
  map(user => user.name),
  map(name => `Hello, ${name}!`),
  getOrElse(() => 'Hello, stranger!')
)

// Chaining operations that might fail
const userEmail = pipe(
  fromNullable(getUserById(42)),
  chain(user => fromNullable(user.email)),
  chain(email => (email.includes('@') ? some(email) : none)),
  getOrElse(() => 'no-email@example.com')
)
```

### Either — Explicit Error Handling

Either<E, A> is `Left<E>` (error) or `Right<A>` (success). It forces you to handle both paths.

```typescript
import { Either, left, right, map, mapLeft, chain, fold } from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

type ValidationError = { field: string; message: string }

function validateEmail(email: string): Either<ValidationError, string> {
  if (!email.includes('@')) {
    return left({ field: 'email', message: 'Invalid email format' })
  }
  return right(email.toLowerCase())
}

function validateAge(age: number): Either<ValidationError, number> {
  if (age < 18) {
    return left({ field: 'age', message: 'Must be 18 or older' })
  }
  return right(age)
}

// Compose validations
const result = pipe(
  validateEmail('alice@example.com'),
  chain(email => pipe(
    validateAge(25),
    map(age => ({ email, age }))
  )),
  fold(
    err => `Error: ${err.field} — ${err.message}`,
    data => `Valid: ${data.email}, age ${data.age}`
  )
)
```

### TaskEither — Async Operations with Error Handling

TaskEither wraps a Promise that resolves to Either:

```typescript
import * as TE from 'fp-ts/TaskEither'
import * as E from 'fp-ts/Either'
import { pipe } from 'fp-ts/function'

type ApiError = { code: number; message: string }
type User = { id: string; name: string; email: string }

const fetchUser = (id: string): TE.TaskEither<ApiError, User> =>
  TE.tryCatch(
    () => fetch(`/api/users/${id}`).then(r => r.json()),
    err => ({ code: 500, message: String(err) })
  )

const fetchUserPosts = (userId: string): TE.TaskEither<ApiError, Post[]> =>
  TE.tryCatch(
    () => fetch(`/api/users/${userId}/posts`).then(r => r.json()),
    err => ({ code: 500, message: String(err) })
  )

// Sequential: fetch user, then fetch their posts
const userWithPosts = pipe(
  fetchUser('123'),
  TE.chain(user =>
    pipe(
      fetchUserPosts(user.id),
      TE.map(posts => ({ user, posts }))
    )
  )
)

// Execute: TaskEither is lazy until called
const result = await userWithPosts()
// result is Either<ApiError, { user: User; posts: Post[] }>

if (E.isRight(result)) {
  console.log('User:', result.right.user.name)
} else {
  console.error('Error:', result.left.message)
}
```

### pipe and flow

These are the glue functions that make fp-ts ergonomic:

```typescript
import { pipe, flow } from 'fp-ts/function'

// pipe: pass a value through a sequence of functions
const result = pipe(
  42,
  x => x * 2,    // 84
  x => x + 1,    // 85
  String          // "85"
)

// flow: create a reusable function from a sequence
const processNumber = flow(
  (x: number) => x * 2,
  (x) => x + 1,
  String
)

console.log(processNumber(42)) // "85"

// Real-world: validate and transform user input
const processUserInput = flow(
  validateEmail,                          // Either<ValidationError, string>
  E.chain(email => validateDomain(email)), // Either<ValidationError, string>
  E.map(email => email.toLowerCase()),    // Either<ValidationError, string>
)
```

---

## Effect.ts: The Full Runtime

### The Effect Type

`Effect<A, E, R>` is the core type: A is the success value, E is the error type, R is the required services (dependencies).

```typescript
import { Effect } from 'effect'

// Effect<string, never, never> — succeeds with string, no errors, no dependencies
const hello = Effect.succeed('Hello, World!')

// Effect<User, DatabaseError, DatabaseService> — needs DatabaseService
const getUser = (id: string): Effect.Effect<User, DatabaseError, DatabaseService> =>
  Effect.flatMap(
    DatabaseService,
    db => db.findUser(id)
  )
```

### Error Handling

Effect has a typed error channel built in. Errors are tracked in the type system:

```typescript
import { Effect, Data } from 'effect'

// Define typed errors as data classes
class NotFoundError extends Data.TaggedError('NotFoundError')<{
  readonly id: string
}> {}

class ValidationError extends Data.TaggedError('ValidationError')<{
  readonly field: string
  readonly message: string
}> {}

// Error types are tracked — the compiler knows what can fail
const findUser = (id: string): Effect.Effect<User, NotFoundError, UserRepository> =>
  Effect.flatMap(UserRepository, repo =>
    Effect.promise(() => repo.findById(id)).pipe(
      Effect.flatMap(user =>
        user
          ? Effect.succeed(user)
          : Effect.fail(new NotFoundError({ id }))
      )
    )
  )

// Handle specific errors
const safeFind = findUser('123').pipe(
  Effect.catchTag('NotFoundError', (err) =>
    Effect.succeed({ id: err.id, name: 'Anonymous', email: '' })
  )
)

// Or handle all errors
const withFallback = findUser('123').pipe(
  Effect.orElse(() => Effect.succeed(defaultUser))
)
```

### Dependency Injection

This is where Effect.ts genuinely shines over fp-ts. It has a first-class DI system based on `Context` and `Layer`:

```typescript
import { Effect, Context, Layer } from 'effect'

// Define service interface
interface EmailService {
  send: (to: string, subject: string, body: string) => Effect.Effect<void, EmailError>
}

// Create a Tag for the service
const EmailService = Context.GenericTag<EmailService>('EmailService')

// Define a service interface for user repo
interface UserRepository {
  findById: (id: string) => Effect.Effect<User | null, DatabaseError>
  save: (user: User) => Effect.Effect<void, DatabaseError>
}

const UserRepository = Context.GenericTag<UserRepository>('UserRepository')

// Business logic — doesn't know about implementations
const sendWelcomeEmail = (userId: string): Effect.Effect<
  void,
  NotFoundError | EmailError | DatabaseError,
  UserRepository | EmailService
> =>
  Effect.gen(function* () {
    const repo = yield* UserRepository
    const emailService = yield* EmailService

    const user = yield* repo.findById(userId).pipe(
      Effect.flatMap(u =>
        u ? Effect.succeed(u) : Effect.fail(new NotFoundError({ id: userId }))
      )
    )

    yield* emailService.send(
      user.email,
      'Welcome!',
      `Hi ${user.name}, welcome to our platform!`
    )
  })

// Provide implementations via Layers
const ProdEmailServiceLayer = Layer.succeed(EmailService, {
  send: (to, subject, body) =>
    Effect.promise(() => sendViaSendGrid(to, subject, body))
      .pipe(Effect.mapError(e => new EmailError({ message: String(e) })))
})

const ProdUserRepositoryLayer = Layer.succeed(UserRepository, {
  findById: (id) => Effect.promise(() => db.users.findUnique({ where: { id } }))
    .pipe(Effect.mapError(e => new DatabaseError({ message: String(e) }))),
  save: (user) => Effect.promise(() => db.users.upsert({ ... }))
    .pipe(Effect.mapError(e => new DatabaseError({ message: String(e) })))
})

// Test implementations
const TestEmailServiceLayer = Layer.succeed(EmailService, {
  send: () => Effect.succeed(undefined) // No-op in tests
})

// Wire it all together and run
const main = sendWelcomeEmail('user-123').pipe(
  Effect.provide(Layer.mergeAll(ProdEmailServiceLayer, ProdUserRepositoryLayer))
)

Effect.runPromise(main)
```

In tests, swap `ProdEmailServiceLayer` for `TestEmailServiceLayer` without touching any business logic.

### Concurrency with Effect

```typescript
import { Effect } from 'effect'

// Run effects in parallel
const [user, posts, notifications] = yield* Effect.all(
  [fetchUser('123'), fetchPosts('123'), fetchNotifications('123')],
  { concurrency: 'unbounded' }  // or a specific number
)

// Race multiple effects — first to succeed wins
const fastResponse = yield* Effect.race(
  fetchFromCache('key'),
  fetchFromDatabase('key')
)

// Retry with exponential backoff
const withRetry = fetchUser('123').pipe(
  Effect.retry({
    times: 3,
    schedule: Schedule.exponential('100 millis')
  })
)

// Timeout
const withTimeout = fetchUser('123').pipe(
  Effect.timeout('5 seconds'),
  Effect.catchTag('TimeoutException', () =>
    Effect.fail(new NetworkError({ message: 'Request timed out' }))
  )
)
```

---

## Comparison: When to Use Each

| Concern | fp-ts | Effect.ts |
|---------|-------|-----------|
| **Learning curve** | Moderate | Steep |
| **Incremental adoption** | Easy | Harder |
| **Bundle size** | ~30KB | ~70KB |
| **Error handling** | Either/TaskEither | Typed error channel |
| **Async** | TaskEither | Effect with fibers |
| **Dependency injection** | Manual/Reader | First-class Context/Layer |
| **Concurrency** | Manual Promise.all | Effect.all, races, timeouts |
| **Testing** | Standard Jest/Vitest | Test layers (DI swap) |
| **Ecosystem** | Mature, stable | Growing rapidly |

**Use fp-ts when:**
- You want to add functional patterns to an existing codebase without a full rewrite
- Your team is new to FP and needs to learn incrementally
- You need the smallest possible bundle size
- Your primary needs are Option, Either, and TaskEither patterns

**Use Effect.ts when:**
- You're building a new service/application where FP is central from day one
- Dependency injection, testability, and service layers are priorities
- You need structured concurrency with proper cancellation and resource management
- Your error surface is complex and you want compiler-enforced error handling across the call graph

---

## Practical Decision Guide

Start with fp-ts if you're asking "how do I handle nulls and async errors more safely?" Start with Effect.ts if you're asking "how do I build a testable, concurrent service with structured error handling from the ground up?"

Neither is universally better. Effect.ts is more powerful and more opinionated. fp-ts is more surgical and easier to adopt in layers.

Use the [AI Error Explainer](/tools/ai-error-explainer) when deciphering the TypeScript compiler errors that come with both libraries' complex type signatures — they're informative once you learn to read them.
