---
title: "TypeScript Advanced Patterns 2026: Discriminated Unions, Template Literals, Infer, and Beyond"
description: "Master advanced TypeScript patterns in 2026: discriminated unions, template literal types, the infer keyword, conditional types, and type-level programming for production-grade codebases."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["typescript", "advanced types", "typeScript patterns", "type safety", "web development"]
readingTime: "12 min read"
---

# TypeScript Advanced Patterns 2026: Discriminated Unions, Template Literals, Infer, and Beyond

TypeScript has come a long way since its early days as a simple syntactic superset of JavaScript. In 2026, the language offers a rich type system capable of expressing complex domain models, enforcing business rules at compile time, and eliminating entire categories of runtime errors before your code ever reaches production. Yet many TypeScript developers only scratch the surface, using basic interfaces and type aliases while powerful patterns sit unused.

This article dives deep into the advanced TypeScript patterns that separate production-grade codebases from amateur efforts. We will explore discriminated unions for state machines, template literal types for string APIs, the `infer` keyword for type-level extraction, and much more. By the end, you will have a toolkit of patterns ready to apply to real-world projects.

## Why Advanced TypeScript Matters in 2026

The JavaScript ecosystem has embraced TypeScript at an unprecedented rate. According to the State of JS 2025 survey, over 73% of JavaScript developers now use TypeScript regularly. Frameworks like Next.js, NestJS, and tRPC have made TypeScript a first-class citizen in both frontend and backend development. This widespread adoption raises the stakes: poorly typed code now affects far more projects and teams.

Advanced TypeScript patterns matter for three concrete reasons. First, they enable **domain modeling** that mirrors real business logic. Rather than relying on vague `any` types or optional fields scattered across interfaces, you can encode state transitions, valid values, and invariant constraints directly into the type system. Second, these patterns reduce **cognitive load** by making illegal states unrepresentable. When the type system enforces your business rules, you spend less mental energy remembering edge cases. Third, they improve **developer experience** through precise autocomplete, refactoring safety, and documentation embedded in the code itself.

Let us move from philosophy to practice.

## Discriminated Unions: Exhaustive Pattern Matching and State Machines

Discriminated unions (also called tagged unions) are one of the most impactful patterns in TypeScript's type system. The idea is simple: give each variant a literal type property (the "discriminant") that TypeScript can use to narrow the type in switch statements and if chains.

### Modeling State Machines

Consider an async data-fetching operation with four states: idle, loading, success, and error. Without discriminated unions, you might scatter `isLoading`, `error`, and `data` fields across an object, leading to impossible combinations like `{ isLoading: true, data: [...] }`. A discriminated union makes this impossible:

```typescript
type FetchState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T; timestamp: number }
  | { status: 'error'; message: string; code: number };

function renderProfile(state: FetchState<User>) {
  switch (state.status) {
    case 'idle':
      return 'Click to load';
    case 'loading':
      return 'Loading...';
    case 'success':
      return `Hello, ${state.data.name} (loaded at ${new Date(state.timestamp).toISOString()})`;
    case 'error':
      return `Error ${state.code}: ${state.message}`;
  }
}
```

Notice that within the `success` case, TypeScript knows `state.data` exists and `state.data.name` is valid. Within the `error` case, it knows `state.code` exists. The compiler tracks exactly which properties are available in each branch.

### Exhaustive Checking with never

One of the most powerful benefits of discriminated unions is exhaustive checking. If you add a new variant to `FetchState` and forget to handle it in a switch statement, TypeScript can warn you at compile time:

```typescript
function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(x)}`);
}

function getStateDescription<T>(state: FetchState<T>): string {
  switch (state.status) {
    case 'idle': return 'Ready';
    case 'loading': return 'Fetching...';
    case 'success': return `Data received`;
    case 'error': return `Failed: ${state.code}`;
    default:
      return assertNever(state); // TypeScript error if a case is missing
  }
}
```

The `assertNever` function accepts a parameter of type `never`. If the switch statement is exhaustive, every possible value is handled and nothing reaches the `default` branch, so `never` is satisfied. If a variant is missing, TypeScript will report a type error because `never` cannot be assigned from the unhandled variant type.

### Real-World: tRPC Error Handling

Popular libraries like tRPC use discriminated unions extensively for their result types. Each query result is typed as a discriminated union that separates success from error states, enabling safe destructuring without null checks cluttering your code.

## Template Literal Types: Building String APIs

Template literal types, introduced in TypeScript 4.1, allow you to construct string types programmatically. This pattern is particularly powerful for building type-safe APIs around strings, such as event systems, CSS-in-JS libraries, and route matchers.

### Basic Template Literals

```typescript
type Direction = 'top' | 'bottom' | 'left' | 'right';
type Edge = `margin-${Direction}` | `padding-${Direction}`;
// "margin-top" | "margin-bottom" | "margin-left" | "margin-right" |
// "padding-top" | "padding-bottom" | "padding-left" | "padding-right"
```

This by itself is useful, but template literal types become truly powerful when combined with mapped types and conditional types.

### Building a Type-Safe Event Emitter

Imagine you want a type-safe event emitter where you can only emit events that have been registered:

```typescript
type EventMap = {
  'user:login': { userId: string; timestamp: number };
  'user:logout': { userId: string };
  'order:placed': { orderId: string; total: number };
};

class TypedEventEmitter<Events extends Record<string, unknown>> {
  private listeners = new Map<keyof Events, Set<Function>>();

  on<K extends keyof Events>(event: K, listener: (data: Events[K]) => void): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach(listener => listener(data));
  }
}

const emitter = new TypedEventEmitter<EventMap>();

emitter.on('user:login', ({ userId, timestamp }) => {
  console.log(`User ${userId} logged in at ${timestamp}`);
});

emitter.emit('user:login', { userId: 'u123', timestamp: Date.now() });

// This would be a compile-time error:
// emitter.emit('user:join', { userId: 'u123' }); // 'user:join' is not in EventMap
```

The `emit` method accepts only keys that exist in `EventMap`, and the `data` parameter must match the expected shape for that specific event. TypeScript enforces this at compile time with zero runtime overhead.

### Inferring Route Parameters

Template literal types also enable powerful patterns for route parameter extraction:

```typescript
type Route = '/users/:id' | '/posts/:slug' | '/admin/:section/:subsection';

type ExtractParams<Route extends string> =
  Route extends `${string}:${infer Param}/${infer Rest}`
    ? Param | ExtractParams<`/${Rest}`>
    : Route extends `${string}:${infer Param}`
    ? Param
    : never;

type UserRouteParams = ExtractParams<'/users/:id'>; // "id"
type AdminRouteParams = ExtractParams<'/admin/:section/:subsection'>; // "section" | "subsection"
```

This pattern powers libraries like Hono and Iron, which use template literal types to derive parameter types from route strings automatically.

## Conditional Types and the infer Keyword

Conditional types let you write type-level if-then-else expressions. Combined with `infer`, they become a mechanism for extracting parts of types—transforming types based on their structure rather than just aliasing them.

### Basic Conditional Types

```typescript
type IsArray<T> = T extends any[] ? true : false;

type A = IsArray<string[]>; // true
type B = IsArray<string>;   // false
```

### Using infer for Type Extraction

The `infer` keyword declares a type variable within a conditional type, allowing you to capture and use a portion of the matched type:

```typescript
type UnpackPromise<T> = T extends Promise<infer Inner> ? Inner : T;

type A = UnpackPromise<Promise<string>>; // string
type B = UnpackPromise<Promise<{ id: number }>>; // { id: number }
type C = UnpackPromise<number>; // number
```

A more practical example: extracting the return type of an async function:

```typescript
type AsyncReturnType<T extends (...args: any) => Promise<any>> =
  T extends (...args: any) => Promise<infer R> ? R : never;

async function fetchUser(id: string): Promise<{ name: string; email: string }> {
  return { name: 'Alice', email: 'alice@example.com' };
}

type UserResult = AsyncReturnType<typeof fetchUser>;
// { name: string; email: string }
```

### Distributive Conditional Types

Conditional types are naturally distributive over union types. This means `T extends U ? X : Y` is evaluated for each member of a union separately:

```typescript
type ToArray<T> = T extends any ? T[] : never;

type Strings = ToArray<string | number>; // string[] | number[]
```

This behavior is incredibly useful for transforming union types, but it can also cause unexpected results when you wrap the checked type. Use a tuple `[T]` to prevent distribution when needed:

```typescript
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;

type StringsNonDist = ToArrayNonDist<string | number>; // (string | number)[]
```

### Real-World: Awaited Type

TypeScript 4.5 introduced the `Awaited` type, which recursively unwraps Promise types. It is implemented using conditional types and `infer`:

```typescript
type Awaited<T> =
  T extends null | undefined ? T :
  T extends object & { then(onfulfilled: infer F, ...args: infer _): any } ?
    F extends (value: infer V, ...args: infer _) => any ? Awaited<V> : never :
  T;
```

This pattern allows you to extract the resolved value from deeply nested promises without manual unwrapping.

## Mapped Types and Key Remapping

Mapped types let you create new types by iterating over the keys of an existing type. TypeScript 4.1 introduced key remapping via the `as` clause, which enables powerful transformations of type keys themselves.

### Basic Mapped Types

```typescript
type Readonly<T> = { readonly [K in keyof T]: T[K] };
type Partial<T> = { [K in keyof T]?: T[K] };
type Required<T> = { [K in keyof T]-?: T[K] };
```

### Key Remapping with as

The `as` clause transforms each key during iteration:

```typescript
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K]
};

type User = { name: string; age: number };
type UserGetters = Getters<User>;
// { getName: () => string; getAge: () => number }
```

### Filtering Keys with never

By mapping a key to `never`, you can exclude it from the resulting type:

```typescript
type OmitMethods<T> = {
  [K in keyof T as T[K] extends Function ? never : K]: T[K]
};

type UserWithMethods = {
  name: string;
  age: number;
  greet(): void;
  toString(): string;
};

type CleanUser = OmitMethods<UserWithMethods>;
// { name: string; age: number }
```

### Combining Patterns: A Real-World Type Transformation

Here is a practical example that combines mapped types, conditional types, and template literals to create a type-safe event listener map:

```typescript
type EventHandlers<T extends Record<string, unknown>> = {
  [K in keyof T as `on${Capitalize<string & K>}`]: (event: { type: K; payload: T[K] }) => void
};

type AppEvents = {
  login: { userId: string };
  logout: { userId: string };
  purchase: { orderId: string; amount: number };
};

type AppEventHandlers = EventHandlers<AppEvents>;
// {
//   onLogin: (event: { type: 'login'; payload: { userId: string } }) => void;
//   onLogout: (event: { type: 'logout'; payload: { userId: string } }) => void;
//   onPurchase: (event: { type: 'purchase'; payload: { orderId: string; amount: number } }) => void;
// }
```

This pattern is used extensively in React component prop libraries and event systems to derive handler names and event shapes from a single source of truth.

## Builder Pattern with TypeScript

The builder pattern is a well-known Gang of Four design pattern for constructing complex objects step by step. TypeScript's type system can enforce that required steps are completed before the object is "built," providing a fluent API with compile-time safety.

### Enforcing Step Order

```typescript
class UserBuilder {
  private name: string = '';
  private age: number = 0;
  private email: string = '';
  private password: string = '';

  withName(name: string): this & { name: string } {
    this.name = name;
    return this;
  }

  withAge(age: number): this & { age: number } {
    this.age = age;
    return this;
  }

  withEmail(email: string): this & { email: string } {
    this.email = email;
    return this;
  }

  withPassword(password: string): this & { password: string } {
    this.password = password;
    return this;
  }

  build(this: UserBuilder & { name: string; email: string; password: string }): User {
    return {
      name: this.name,
      age: this.age,
      email: this.email,
      password: this.password,
    };
  }
}

const user = new UserBuilder()
  .withName('Alice')
  .withEmail('alice@example.com')
  .withPassword('secret123')
  .withAge(30)
  .build();
```

The `this & { name: string }` return type ensures that after calling `withName`, the type system knows `name` is set. The `build` method uses a constrained `this` parameter to require that `name`, `email`, and `password` have been set before construction is allowed. If you forget `withEmail`, TypeScript will report a compile error.

### Builder Pattern with Type Families

For more complex scenarios, you can use TypeScript's conditional types to create type families that enforce different build sequences:

```typescript
type BuilderState = 'init' | 'named' | 'emailed' | 'passworded' | 'built';

interface InitState { _state: 'init'; }
interface NamedState { _state: 'named'; name: string; }
interface EmailedState { _state: 'emailed'; email: string; }
interface PasswordedState { _state: 'passworded'; password: string; }
interface BuiltState { _state: 'built'; }

type UserBuilderState = InitState | NamedState | EmailedState | PasswordedState | BuiltState;

type Transition<Current extends UserBuilderState, Next extends string> =
  Current extends { _state: infer S } ? { _state: S } & Record<string, never> : never;
```

This approach uses discriminated unions at the type level to track which steps have been completed, preventing out-of-order method calls at compile time.

## Type Guards and Narrowing

Type narrowing is TypeScript's mechanism for refining types within conditional blocks. While basic narrowing works with `typeof` and `instanceof`, real-world code often needs custom type guards for complex object shapes.

### Built-in Narrowing

```typescript
function process(value: string | number) {
  if (typeof value === 'string') {
    console.log(value.toUpperCase()); // TypeScript knows value is string
  } else {
    console.log(value.toFixed(2)); // TypeScript knows value is number
  }
}
```

### Custom Type Guard Functions

For more complex structures, write a function that returns a type predicate:

```typescript
interface Dog { kind: 'dog'; bark(): void; }
interface Cat { kind: 'cat'; meow(): void; }
type Pet = Dog | Cat;

function isDog(pet: Pet): pet is Dog {
  return pet.kind === 'dog';
}

function makeSound(pet: Pet) {
  if (isDog(pet)) {
    pet.bark(); // TypeScript knows pet is Dog
  } else {
    pet.meow(); // TypeScript knows pet is Cat
  }
}
```

### Type Predicates vs. Assertion Functions

Sometimes you want to throw an error instead of returning false:

```typescript
function assertIsString(val: unknown): asserts val is string {
  if (typeof val !== 'string') {
    throw new Error(`Expected string, got ${typeof val}`);
  }
}

function process(value: unknown) {
  assertIsString(value);
  console.log(value.toUpperCase()); // value is string here
}
```

The `asserts` prefix in the return type tells TypeScript that this function either returns normally (assertion passed) or throws. TypeScript then narrows the type accordingly.

### Real-World: Parsing and Validating API Responses

When fetching data from an API, you often receive a response with an unknown shape. TypeScript type guards let you validate the response at runtime while keeping the type narrow in subsequent code:

```typescript
interface ApiResponse {
  status: number;
  data?: unknown;
  error?: string;
}

function isSuccessResponse(resp: ApiResponse): resp is Extract<ApiResponse, { status: 200 }> {
  return resp.status === 200 && 'data' in resp;
}

async function fetchUser(id: string) {
  const response = await fetch(`/api/users/${id}`);
  const data: ApiResponse = await response.json();

  if (isSuccessResponse(data)) {
    // TypeScript knows data.data exists here
    console.log(data.data);
  } else {
    console.error(data.error);
  }
}
```

## Using the `satisfies` Operator (TypeScript 4.9+)

The `satisfies` operator, introduced in TypeScript 4.9, validates that an expression matches a type without widening the type to the annotation. This preserves the literal types of values while ensuring they conform to the expected shape.

### The Problem with Type Annotations

```typescript
const colors = {
  red: [255, 0, 0],
  green: '#00ff00',
};

// TypeScript widens these to:
// { red: number[] | string; green: number[] | string }
```

### Using satisfies to Preserve Literals

```typescript
const colors = {
  red: [255, 0, 0],
  green: '#00ff00',
} satisfies Record<string, string | number[]>;

// TypeScript knows:
// colors.red is number[]
// colors.green is string
// colors is { red: number[]; green: string }
```

Now you get full autocomplete on the specific properties while still validating the overall shape:

```typescript
colors.red.map(x => x / 255); // number[] methods available
colors.green.toUpperCase();   // string methods available
```

### Practical Use Case: Route Configuration

```typescript
const routes = {
  home: '/',
  users: '/users',
  userDetail: (id: string) => `/users/${id}`,
} satisfies Record<string, string | ((...args: any) => string)>;

type Routes = typeof routes;
// { home: string; users: string; userDetail: (id: string) => string }
```

This pattern is widely used in configuration objects where you want to validate the structure but preserve the precise types for downstream use.

## Real-World Examples from Popular Libraries

Understanding these patterns in isolation is valuable, but seeing them in production code cements the knowledge. Here is how popular open-source libraries apply these techniques.

### Zod: Schema Validation with Type Inference

Zod is a TypeScript-first schema validation library that uses conditional types and template literal types extensively. When you define a Zod schema, it infers the TypeScript type automatically:

```typescript
import { z } from 'zod';

const UserSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
});

type User = z.infer<typeof UserSchema>;
// { id: string; name: string; email: string; role: 'admin' | 'user' | 'guest' }
```

Zod's `z.infer` uses conditional types to extract the inferred TypeScript type from the schema definition, providing end-to-end type safety from validation to usage.

### tRPC: Type-Safe API Layer

tRPC eliminates the need for API schema definitions by inferring types directly from your server procedures. It uses template literal types for route inference and conditional types for input/output validation:

```typescript
const appRouter = t.router({
  user: t.router({
    get: t.procedure
      .input(z.object({ id: z.string() }))
      .query(async ({ input }) => {
        return { id: input.id, name: 'Alice' };
      }),
    create: t.procedure
      .input(z.object({ name: z.string(), email: z.string() }))
      .mutation(async ({ input }) => {
        return { id: crypto.randomUUID(), ...input };
      }),
  }),
});

const client = createTRPCClient<typeof appRouter>({ ... });

// Input types are inferred from Zod schemas
const user = await client.query.user.get({ id: '123' });
```

The client type is derived entirely from the server router type, meaning adding a new procedure automatically updates client types with zero manual synchronization.

### React: Component Prop Types

React's type definitions use discriminated unions for polymorphic components and conditional types for prop inference. The `as` prop pattern in many UI component libraries uses template literal types:

```typescript
type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

type StyledButtonProps<T extends string = ButtonVariant> = {
  variant?: T;
  size?: ButtonSize;
  children: React.ReactNode;
} & (
  T extends 'primary' ? { emphasis?: 'high' | 'low' } : {}
);
```

This pattern allows components to have different additional props depending on the variant selected.

## Performance Considerations in Type Computation

TypeScript's type checker runs at compile time, and complex type computations can significantly slow down your build. Here are strategies to keep your types efficient.

### Avoid Deeply Nested Conditional Types

Each level of nesting adds complexity that TypeScript must resolve. Profile your build times before and after adding complex type utilities:

```typescript
// Slow: 5 levels of nesting
type DeepAwaited<T> =
  T extends Promise<infer U> ? DeepAwaited<U> :
  T extends object ? { [K in keyof T]: DeepAwaited<T[K]> } :
  T;

// Better: Flat structure where possible
type FlatAwaited<T> = T extends Promise<infer U> ? U : T;
```

### Use const Type Parameters (TypeScript 5.0+)

TypeScript 5.0 introduced `const` type parameters, which tell the compiler to infer the most specific literal type possible without needing manual `as const`:

```typescript
function createRoute<const T extends string>(route: T) {
  return route;
}

const route = createRoute('/users/profile');
// route is '/users/profile' not string
```

This avoids the type widening that can trigger unnecessary type re-computation.

### Prefer Interface Extensions Over Mapped Types Where Possible

Interface declarations are generally faster for the TypeScript checker than equivalent mapped types. Use `interface` for public APIs and reserve mapped types for transformations that require key manipulation.

### Cache Expensive Computations

If you have a type that is computed multiple times, consider using a type alias to cache the result:

```typescript
// Expensive mapped type computed inline every time
type Slow = { [K in SomeComplexKeySource]: ComputeType<K> };

// Computed once and aliased
type Slow = SomeMappedType;

// Use Slow throughout your codebase
```

### Measuring Type-Check Performance

Use the `--generateTrace` flag to generate a trace file that you can analyze with Chrome DevTools:

```bash
tsc --generateTrace ./trace-output
```

Open the resulting trace in Chrome to identify which types are taking the longest to resolve.

## Conclusion: Level Up Your TypeScript

TypeScript's type system is a design language. Each pattern we explored—discriminated unions, template literals, conditional types, mapped types, the `satisfies` operator—is a tool for expressing intent more precisely. When used well, these patterns produce code that is self-documenting, refactor-safe, and resistant to the category of bugs that plague dynamically typed codebases.

The journey to TypeScript mastery is not about memorizing syntax. It is about developing an intuition for where the type system can work *for* you instead of against you. Start by applying discriminated unions to your state management, then gradually introduce template literal types into your string APIs. As your comfort grows, explore conditional types and `infer` for building powerful type utilities.

The TypeScript team continues to ship improvements every few months. Recent releases have brought `const` type parameters, variadic tuple improvements, and better inference for destructuring. Stay current with the release notes, experiment in the TypeScript playground, and apply these patterns incrementally to your projects. Each pattern you adopt is a small investment that pays dividends in reduced bugs, clearer code, and a more productive development experience.

Your codebase is only as type-safe as its most permissive type annotation. Start tightening those annotations today.
