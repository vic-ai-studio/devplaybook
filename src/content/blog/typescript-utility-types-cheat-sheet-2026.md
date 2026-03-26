---
title: "TypeScript Utility Types: The Complete Cheat Sheet for 2026"
description: "Master every TypeScript built-in utility type with real code examples. Covers Partial, Required, Pick, Omit, Record, Exclude, Extract, ReturnType, conditional types, mapped types, and real-world patterns for APIs, forms, and state management."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["typescript", "cheat-sheet", "types", "javascript", "frontend", "backend"]
readingTime: "18 min read"
---

TypeScript's utility types are one of the most underused superpowers in the language. Most developers know `Partial` and `Pick`, maybe `Omit`, and then stop there. The full catalog is much bigger — and knowing the whole set means you write fewer custom type aliases, fewer `as any` escapes, and far more expressive interfaces.

This cheat sheet covers every built-in utility type in TypeScript 5.x, with a focused code example for each, plus advanced patterns using conditional types, mapped types, and template literal types. At the end, three real-world sections show you how these tools combine in API response typing, form validation, and state management.

---

## What Are Utility Types?

Utility types are generic types shipped with TypeScript's standard library. They transform one type into another — wrapping properties as optional, extracting a subset of keys, inverting conditions, inferring return types, and more. They live in `lib.es5.d.ts` and require no imports.

```ts
// Before utility types
type UserUpdate = {
  name?: string;
  email?: string;
  age?: number;
};

// After — derives the update shape automatically from User
type User = { name: string; email: string; age: number };
type UserUpdate = Partial<User>;
```

---

## Core Property Modifiers

### `Partial<T>`

Makes all properties in `T` optional. Essential for update payloads and patch operations.

```ts
interface Config {
  host: string;
  port: number;
  ssl: boolean;
}

function updateConfig(current: Config, patch: Partial<Config>): Config {
  return { ...current, ...patch };
}

updateConfig({ host: "localhost", port: 3000, ssl: false }, { port: 8080 });
// ✅ Only port is required in the second argument
```

### `Required<T>`

The inverse of `Partial` — strips all `?` modifiers and makes every property required.

```ts
interface DraftPost {
  title?: string;
  body?: string;
  publishedAt?: Date;
}

type PublishedPost = Required<DraftPost>;
// { title: string; body: string; publishedAt: Date }
```

### `Readonly<T>`

Marks every property as `readonly`. Use it for configuration objects, action payloads, and anything that should not be mutated after creation.

```ts
interface Point {
  x: number;
  y: number;
}

const origin: Readonly<Point> = { x: 0, y: 0 };
// origin.x = 1; // ❌ Cannot assign to 'x' because it is a read-only property
```

---

## Shape Selectors

### `Pick<T, K>`

Creates a type with only the properties in `K` from `T`. Ideal for projecting a subset of a large interface into a focused DTO.

```ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

type PublicUser = Pick<User, "id" | "name" | "email">;
// { id: number; name: string; email: string }
// password and createdAt are gone — safe to send to the client
```

### `Omit<T, K>`

The complement of `Pick` — builds a type with all properties of `T` **except** those in `K`.

```ts
type UserWithoutPassword = Omit<User, "password">;
// { id: number; name: string; email: string; createdAt: Date }

// Useful for create payloads where the server sets the ID:
type CreateUserPayload = Omit<User, "id" | "createdAt">;
```

---

## Set Operations on Unions

### `Exclude<UnionType, ExcludedMembers>`

Removes types from a union that are assignable to `ExcludedMembers`.

```ts
type Status = "pending" | "active" | "suspended" | "deleted";
type VisibleStatus = Exclude<Status, "deleted" | "suspended">;
// "pending" | "active"

type NonString = Exclude<string | number | boolean, string>;
// number | boolean
```

### `Extract<Type, Union>`

Keeps only union members that are assignable to `Union` — the opposite of `Exclude`.

```ts
type NumberOrString = Extract<string | number | boolean, string | number>;
// string | number

// More practical: extract event types by shape
type MouseEvents = Extract<
  "click" | "mousemove" | "keydown" | "keyup",
  "click" | "mousemove"
>;
// "click" | "mousemove"
```

### `NonNullable<T>`

Removes `null` and `undefined` from a type.

```ts
type MaybeUser = User | null | undefined;
type DefiniteUser = NonNullable<MaybeUser>; // User

// Helpful when narrowing after async operations:
async function fetchUser(id: number): Promise<User | null> { /* ... */ }

const user = await fetchUser(1);
if (user !== null) {
  const safeUser: NonNullable<typeof user> = user; // User
}
```

---

## Function and Constructor Utilities

### `ReturnType<T>`

Extracts the return type of a function type. Invaluable for typing values that come from factory functions or selectors without duplicating the type.

```ts
function createApiClient(baseUrl: string) {
  return {
    get: (path: string) => fetch(`${baseUrl}${path}`),
    post: (path: string, body: unknown) => fetch(`${baseUrl}${path}`, { method: "POST", body: JSON.stringify(body) }),
  };
}

type ApiClient = ReturnType<typeof createApiClient>;
// { get: (path: string) => Promise<Response>; post: (path: string, body: unknown) => Promise<Response> }
```

### `Parameters<T>`

Produces a tuple of a function's parameter types.

```ts
function sendEmail(to: string, subject: string, body: string): Promise<void> {
  /* ... */
  return Promise.resolve();
}

type EmailParams = Parameters<typeof sendEmail>;
// [to: string, subject: string, body: string]

// Useful for wrapping or memoizing functions:
function memoize<T extends (...args: any[]) => any>(fn: T) {
  const cache = new Map<string, ReturnType<T>>();
  return (...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    if (!cache.has(key)) cache.set(key, fn(...args));
    return cache.get(key)!;
  };
}
```

### `ConstructorParameters<T>`

Like `Parameters`, but for constructor functions.

```ts
class EventEmitter {
  constructor(private name: string, private maxListeners: number = 10) {}
}

type EmitterArgs = ConstructorParameters<typeof EventEmitter>;
// [name: string, maxListeners?: number]
```

### `InstanceType<T>`

Extracts the instance type of a constructor function — useful when you have the class reference but need the instance shape.

```ts
class HttpClient {
  get(url: string) { return fetch(url); }
}

type ClientInstance = InstanceType<typeof HttpClient>;
// HttpClient — same as just writing HttpClient, but critical when T is generic

function createInstance<T extends new (...args: any[]) => any>(Cls: T): InstanceType<T> {
  return new Cls();
}
```

---

## String Manipulation Utility Types

TypeScript 4.1+ ships four intrinsic string manipulation types. They operate at the type level, not the runtime level.

### `Uppercase<S>`, `Lowercase<S>`, `Capitalize<S>`, `Uncapitalize<S>`

```ts
type EventName = "click" | "focus" | "blur";
type UpperEvent = Uppercase<EventName>; // "CLICK" | "FOCUS" | "BLUR"
type HandlerName = `on${Capitalize<EventName>}`; // "onClick" | "onFocus" | "onBlur"

// Practical: derive event handler map from event names
type EventHandlers = {
  [K in EventName as `on${Capitalize<K>}`]: (event: Event) => void;
};
// { onClick: ...; onFocus: ...; onBlur: ... }
```

---

## Advanced: Conditional Types

Conditional types let you express "if-else" logic at the type level using `T extends U ? X : Y`.

### Basic Conditional Type

```ts
type IsArray<T> = T extends any[] ? true : false;

type A = IsArray<string[]>; // true
type B = IsArray<number>;   // false
```

### `infer` — Extracting Types Inside Conditions

The `infer` keyword lets you capture a type variable inside a conditional type.

```ts
// Extract the element type of an array
type ElementOf<T> = T extends (infer E)[] ? E : never;

type StringEl = ElementOf<string[]>; // string
type NumEl = ElementOf<number[]>;    // number

// Extract the resolved value of a Promise
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
// (TypeScript ships this built-in as of 4.5)

// Extract the first element of a tuple
type Head<T extends any[]> = T extends [infer H, ...any[]] ? H : never;
type First = Head<[string, number, boolean]>; // string
```

### Distributive Conditional Types

When `T` is a union, conditional types distribute over each member automatically.

```ts
type ToArray<T> = T extends any ? T[] : never;
type UnionArrays = ToArray<string | number>; // string[] | number[]

// To suppress distribution, wrap T in a tuple:
type ToArraySingle<T> = [T] extends [any] ? T[] : never;
type SingleArray = ToArraySingle<string | number>; // (string | number)[]
```

---

## Advanced: Mapped Types

Mapped types iterate over the keys of a type and transform them.

### Basic Mapped Type

```ts
type Optional<T> = { [K in keyof T]?: T[K] };
// Same as Partial<T> — but now you can customize the transformation

type Nullable<T> = { [K in keyof T]: T[K] | null };
type NullableUser = Nullable<User>;
// { id: number | null; name: string | null; ... }
```

### Key Remapping with `as`

TypeScript 4.1 lets you remap keys inside mapped types.

```ts
// Convert all keys to getters
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};

type UserGetters = Getters<Pick<User, "name" | "email">>;
// { getName: () => string; getEmail: () => string }

// Filter keys by value type
type StringKeys<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};

type StringOnlyUser = StringKeys<User>;
// { name: string; email: string; password: string }
```

### Deep Readonly and Deep Partial

The built-in `Readonly` and `Partial` are shallow. Here are recursive versions:

```ts
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

interface AppState {
  user: { name: string; settings: { theme: "light" | "dark" } };
  count: number;
}

type FrozenState = DeepReadonly<AppState>;
// All nested properties are readonly
```

---

## Advanced: Template Literal Types

Template literal types compose string literal types the same way template literals compose strings.

```ts
type Axis = "x" | "y" | "z";
type CSSTranslate = `translate${Uppercase<Axis>}`;
// "translateX" | "translateY" | "translateZ"

type EventName2 = "click" | "change" | "submit";
type EventMap = {
  [E in EventName2 as `on_${E}`]: (payload: { type: E }) => void;
};
// { on_click: ...; on_change: ...; on_submit: ... }
```

---

## Real-World Pattern 1: API Response Typing

Consistent API typing eliminates guesswork across your entire codebase.

```ts
// Base response envelope
interface ApiResponse<T> {
  data: T;
  meta: {
    total: number;
    page: number;
    perPage: number;
  };
  error: null;
}

interface ApiError {
  data: null;
  error: {
    code: string;
    message: string;
  };
}

type ApiResult<T> = ApiResponse<T> | ApiError;

// Specific endpoint types
interface Product {
  id: string;
  name: string;
  price: number;
  categoryId: string;
  stock: number;
  createdAt: string;
}

// Create payload: omit server-set fields
type CreateProductPayload = Omit<Product, "id" | "createdAt">;

// Update payload: everything optional except id
type UpdateProductPayload = Pick<Product, "id"> & Partial<Omit<Product, "id" | "createdAt">>;

// List response
type ProductListResponse = ApiResult<Product[]>;

// Detail response with expanded relations
type ProductDetail = Product & {
  category: { id: string; name: string };
  reviews: Array<Pick<Review, "id" | "rating" | "body">>;
};

// Type guard
function isApiError(result: ApiResult<unknown>): result is ApiError {
  return result.error !== null;
}

async function fetchProduct(id: string): Promise<ProductDetail> {
  const res = await fetch(`/api/products/${id}`);
  const result: ApiResult<ProductDetail> = await res.json();
  if (isApiError(result)) throw new Error(result.error.message);
  return result.data;
}
```

---

## Real-World Pattern 2: Form Validation

Type-safe form handling with utility types keeps validation schemas in sync with your data models.

```ts
interface LoginForm {
  email: string;
  password: string;
  rememberMe: boolean;
}

// Validation errors mirror the form shape — all fields optional
type FormErrors<T> = Partial<Record<keyof T, string>>;
type LoginErrors = FormErrors<LoginForm>;
// { email?: string; password?: string; rememberMe?: string }

// Touched state: same keys, boolean values
type TouchedFields<T> = Partial<Record<keyof T, boolean>>;

// Full form state type
interface FormState<T> {
  values: T;
  errors: FormErrors<T>;
  touched: TouchedFields<T>;
  isSubmitting: boolean;
}

function createFormState<T>(initialValues: T): FormState<T> {
  return {
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
  };
}

const loginState = createFormState<LoginForm>({
  email: "",
  password: "",
  rememberMe: false,
});

// Validator function type
type Validator<T> = (values: T) => FormErrors<T>;

const validateLogin: Validator<LoginForm> = (values) => {
  const errors: FormErrors<LoginForm> = {};
  if (!values.email.includes("@")) errors.email = "Invalid email address";
  if (values.password.length < 8) errors.password = "Password must be at least 8 characters";
  return errors;
};
```

---

## Real-World Pattern 3: State Management

Utility types make Redux-style state management dramatically more type-safe.

```ts
// Action creators with ReturnType
const increment = (amount: number) => ({ type: "counter/increment" as const, payload: amount });
const decrement = (amount: number) => ({ type: "counter/decrement" as const, payload: amount });
const reset = () => ({ type: "counter/reset" as const });

// Derive union type from action creators
type CounterAction =
  | ReturnType<typeof increment>
  | ReturnType<typeof decrement>
  | ReturnType<typeof reset>;

// State
interface CounterState {
  value: number;
  history: number[];
}

// Reducer with exhaustive checking
function counterReducer(
  state: Readonly<CounterState>,
  action: CounterAction
): CounterState {
  switch (action.type) {
    case "counter/increment":
      return { ...state, value: state.value + action.payload, history: [...state.history, state.value] };
    case "counter/decrement":
      return { ...state, value: state.value - action.payload, history: [...state.history, state.value] };
    case "counter/reset":
      return { value: 0, history: [] };
    default:
      // Exhaustive check: TypeScript errors if a case is missing
      const _exhaustive: never = action;
      return state;
  }
}

// Selector typing with ReturnType
const selectValue = (state: CounterState) => state.value;
type SelectedValue = ReturnType<typeof selectValue>; // number

// Slice state from root state
interface RootState {
  counter: CounterState;
  auth: { user: User | null; token: string | null };
  ui: { theme: "light" | "dark"; sidebarOpen: boolean };
}

// Extract a domain slice type without duplicating it
type AuthSlice = RootState["auth"];
type UITheme = RootState["ui"]["theme"]; // "light" | "dark"
```

---

## Quick Reference Table

| Utility Type | Input | Output |
|---|---|---|
| `Partial<T>` | `{ a: string; b: number }` | `{ a?: string; b?: number }` |
| `Required<T>` | `{ a?: string; b?: number }` | `{ a: string; b: number }` |
| `Readonly<T>` | `{ a: string }` | `{ readonly a: string }` |
| `Pick<T, K>` | `T`, `"a" \| "b"` | Object with only `a` and `b` |
| `Omit<T, K>` | `T`, `"a" \| "b"` | Object without `a` and `b` |
| `Record<K, V>` | `"x" \| "y"`, `number` | `{ x: number; y: number }` |
| `Exclude<U, E>` | `"a" \| "b" \| "c"`, `"a"` | `"b" \| "c"` |
| `Extract<T, U>` | `"a" \| "b" \| "c"`, `"a" \| "b"` | `"a" \| "b"` |
| `NonNullable<T>` | `string \| null \| undefined` | `string` |
| `ReturnType<T>` | `() => string` | `string` |
| `Parameters<T>` | `(a: string, b: number) => void` | `[string, number]` |
| `ConstructorParameters<T>` | `new(a: string) => Foo` | `[string]` |
| `InstanceType<T>` | `typeof MyClass` | `MyClass` |
| `Awaited<T>` | `Promise<string>` | `string` |
| `Uppercase<S>` | `"hello"` | `"HELLO"` |
| `Lowercase<S>` | `"HELLO"` | `"hello"` |
| `Capitalize<S>` | `"hello"` | `"Hello"` |
| `Uncapitalize<S>` | `"Hello"` | `"hello"` |

---

## Key Takeaways

- **`Partial` and `Required`** handle mutability of form values and update payloads — reach for these before writing a custom optional interface.
- **`Pick` and `Omit`** are your projection tools. Use `Pick` when you know exactly what you want; use `Omit` when it is easier to say what you do not want.
- **`Record<K, V>`** is the go-to for dictionaries — prefer it over `{ [key: string]: V }` because it keeps the key type precise.
- **`ReturnType` and `Parameters`** eliminate type drift in function wrappers, memoization, and higher-order functions.
- **Conditional types with `infer`** unlock recursive type manipulation — extracting element types, unwrapping Promises, and dissecting tuples.
- **Mapped types with `as` remapping** let you derive event handler maps, getter objects, and filtered subsets without manual duplication.
- **Template literal types** compose string patterns at the type level — perfect for event names, CSS property keys, and API route segments.

If you want to practice these interactively, paste any of the examples above into the [TypeScript Playground](https://www.typescriptlang.org/play) and inspect the inferred types in real time.

For more developer tools and references, explore the [DevPlaybook tools directory](/tools).
