---
title: "TypeScript Best Practices for Production Code in 2026"
description: "15 TypeScript best practices for writing safer, more maintainable production code. Covers strict mode, generics, utility types, discriminated unions, error handling, and more."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["typescript", "javascript", "best-practices", "types", "backend"]
readingTime: "11 min read"
---

TypeScript has become the default for serious JavaScript projects. But using TypeScript doesn't automatically mean your code is safe — you need to use it correctly. This guide covers 15 best practices that separate production-quality TypeScript from TypeScript that's just JavaScript with extra steps.

---

## 1. Enable Strict Mode — Always

The single highest-leverage change you can make to a TypeScript project:

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitReturns": true,
    "exactOptionalPropertyTypes": true
  }
}
```

`strict: true` enables a bundle of safety flags:
- `strictNullChecks` — `null` and `undefined` are not assignable to other types
- `strictFunctionTypes` — function parameter types are checked contravariantly
- `noImplicitAny` — error when TypeScript infers `any`
- `strictBindCallApply` — `bind`, `call`, `apply` are type-checked

`noUncheckedIndexedAccess` is not included in `strict` but is worth enabling: it makes `array[0]` return `T | undefined` instead of `T`, which prevents a common class of runtime errors.

---

## 2. Avoid `any` — Use `unknown` Instead

`any` disables type checking entirely. `unknown` forces you to narrow types before using them:

```typescript
// ❌ any disables type checking
function parseResponse(data: any) {
  return data.user.name; // no error, but could crash at runtime
}

// ✅ unknown forces safe narrowing
function parseResponse(data: unknown) {
  if (
    typeof data === 'object' &&
    data !== null &&
    'user' in data &&
    typeof (data as any).user?.name === 'string'
  ) {
    return (data as { user: { name: string } }).user.name;
  }
  throw new Error('Unexpected response shape');
}

// ✅ Better: use Zod for runtime + compile-time safety
import { z } from 'zod';

const ResponseSchema = z.object({
  user: z.object({ name: z.string() }),
});

function parseResponse(data: unknown) {
  return ResponseSchema.parse(data).user.name;
}
```

Reserve `any` for genuine escape hatches (third-party types, migration paths). Add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` with a comment explaining why when you must.

---

## 3. Use Discriminated Unions for State Modeling

Discriminated unions let TypeScript narrow types based on a shared literal field:

```typescript
// ❌ Optional fields — hard to know which are present
interface ApiState {
  loading?: boolean;
  data?: User[];
  error?: string;
}

// ✅ Discriminated union — each state is explicit
type ApiState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: User[] }
  | { status: 'error'; error: string };

function render(state: ApiState) {
  switch (state.status) {
    case 'idle': return <EmptyState />;
    case 'loading': return <Spinner />;
    case 'success': return <UserList users={state.data} />; // state.data is User[] here
    case 'error': return <ErrorMessage msg={state.error} />; // state.error is string here
  }
}
```

TypeScript narrows the type inside each `case` — you get autocomplete and type safety without casting.

---

## 4. Prefer `type` Aliases Over `interface` for Union Types

Both `type` and `interface` work for object shapes — but `type` is required for unions, intersections, and mapped types:

```typescript
// Use interface when: defining object shapes that will be extended
interface User {
  id: string;
  name: string;
  email: string;
}

interface AdminUser extends User {
  permissions: string[];
}

// Use type when: unions, intersections, utility types, tuples
type UserId = string;
type Result<T> = { ok: true; data: T } | { ok: false; error: Error };
type PartialUser = Partial<User>;
type UserOrAdmin = User | AdminUser;
```

A pragmatic rule: use `interface` for public API shapes (easier to extend with declaration merging), `type` for everything else.

---

## 5. Leverage Utility Types

TypeScript ships with powerful built-in utility types that eliminate repetitive type definitions:

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Common patterns
type CreateUserDto = Omit<User, 'id' | 'createdAt'>; // input without auto-generated fields
type UpdateUserDto = Partial<Pick<User, 'name' | 'email'>>; // all optional
type PublicUser = Omit<User, 'password'>; // never expose password

// Record for dictionaries
type RolePermissions = Record<'admin' | 'editor' | 'viewer', string[]>;

// ReturnType and Parameters to extract from functions
type GetUserFn = (id: string) => Promise<User>;
type UserId = Parameters<GetUserFn>[0]; // string
type UserResult = Awaited<ReturnType<GetUserFn>>; // User

// Required — opposite of Partial
type StrictConfig = Required<Partial<Config>>;
```

Before writing a new type, ask: "Can I derive this from an existing type?"

---

## 6. Type Your API Responses — Don't Trust `fetch`

`fetch` returns `any` by default. This is where TypeScript safety breaks down in most apps:

```typescript
// ❌ fetch response is untyped
const res = await fetch('/api/users');
const data = await res.json(); // data: any
data.users.forEach(...); // no type safety

// ✅ Typed fetch wrapper
async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${url}`);
  }
  return res.json() as Promise<T>;
}

const data = await fetchJson<{ users: User[] }>('/api/users');
// data.users is User[]

// ✅ Even better: validate with Zod
const UsersResponseSchema = z.object({
  users: z.array(UserSchema),
  total: z.number(),
});

const data = UsersResponseSchema.parse(
  await fetchJson('/api/users')
);
// data is fully typed AND validated at runtime
```

---

## 7. Use `const` Assertions for Literal Types

Without `as const`, TypeScript widens literal types to their base types:

```typescript
// Without as const: type is string[], order matters
const directions = ['north', 'south', 'east', 'west'];
// type: string[]

// With as const: literal tuple
const directions = ['north', 'south', 'east', 'west'] as const;
// type: readonly ["north", "south", "east", "west"]

type Direction = typeof directions[number];
// type: "north" | "south" | "east" | "west"

// Useful for configuration objects
const config = {
  endpoint: 'https://api.example.com',
  timeout: 5000,
  retries: 3,
} as const;
// All properties are readonly and literal-typed
```

---

## 8. Write Generic Functions That Actually Constrain

Generics are not just `<T>` — use constraints to make them precise:

```typescript
// ❌ Too permissive — T could be anything
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}

// ✅ Constrain when you need specific properties
function sortBy<T, K extends keyof T>(arr: T[], key: K): T[] {
  return [...arr].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
  });
}

// ✅ Return type derived from input
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(k => { result[k] = obj[k]; });
  return result;
}

const userView = pick(user, ['name', 'email']); // type: Pick<User, "name" | "email">
```

---

## 9. Use Template Literal Types for String Patterns

TypeScript 4.1+ supports template literal types — use them for typed string patterns:

```typescript
// Event name patterns
type EventName = `on${Capitalize<string>}`;

// HTTP method + path combinations
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiRoute = `${HttpMethod} /api/${string}`;

// CSS property types
type MarginProp = `margin${'' | 'Top' | 'Right' | 'Bottom' | 'Left'}`;
// "margin" | "marginTop" | "marginRight" | "marginBottom" | "marginLeft"

// Record keys with prefix
type EnvConfig = {
  [K in string as `NEXT_PUBLIC_${K}`]: string
};
```

---

## 10. Never Use Type Assertions to Lie to the Compiler

`as` (type assertion) tells TypeScript "trust me" — it can hide real bugs:

```typescript
// ❌ Dangerous: forces incorrect type
const user = {} as User; // TypeScript thinks this is a User, but it's empty

// ❌ Brittle: breaks if type changes
const status = response.status as 'active' | 'inactive';

// ✅ Narrow with guards
function isUser(value: unknown): value is User {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'email' in value
  );
}

// ✅ Validate at runtime
const user = UserSchema.parse(rawData); // throws if invalid, typed if valid
```

The only legitimate use of `as` is when TypeScript's inference can't keep up with your logic (e.g., type narrowing after a `.filter(Boolean)` call) and you've already verified correctness.

---

## 11. Use Mapped Types to Transform Type Shapes

Mapped types let you create new types by transforming existing ones:

```typescript
// Make all properties nullable
type Nullable<T> = { [K in keyof T]: T[K] | null };

// Deep readonly
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object ? DeepReadonly<T[K]> : T[K];
};

// Async version of all methods
type Async<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

// Validation errors shape
type FormErrors<T> = {
  [K in keyof T]?: string;
};
```

---

## 12. Type Your Error Handling

TypeScript doesn't type `catch` errors (they're `unknown`):

```typescript
// ❌ Assuming error type
try {
  await saveUser(data);
} catch (e) {
  console.log(e.message); // TypeScript error: 'e' is unknown
}

// ✅ Narrow in catch blocks
try {
  await saveUser(data);
} catch (e) {
  if (e instanceof Error) {
    console.error(e.message);
  } else {
    console.error('Unknown error:', e);
  }
}

// ✅ Result pattern for expected failures
type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

async function saveUser(data: CreateUserDto): Promise<Result<User>> {
  try {
    const user = await db.users.create(data);
    return { ok: true, value: user };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e : new Error('Unknown') };
  }
}

const result = await saveUser(data);
if (result.ok) {
  console.log(result.value.id); // User
} else {
  console.error(result.error.message); // Error
}
```

---

## 13. Organize Types in Dedicated Files

Don't scatter type definitions across implementation files:

```
src/
  types/
    user.ts          // User, CreateUserDto, UpdateUserDto
    api.ts           // ApiResponse<T>, PaginatedResponse<T>, ApiError
    events.ts        // AppEvent discriminated union
    common.ts        // Result<T>, Maybe<T>, Id<T>
  services/
    user.service.ts  // imports from types/
  routes/
    user.routes.ts   // imports from types/
```

This makes types findable, reduces circular imports, and lets you change implementation without touching type definitions.

---

## 14. Use `satisfies` for Object Literals

TypeScript 4.9 introduced `satisfies` — it validates a type without widening:

```typescript
type Palette = { [K: string]: string };

// ❌ with type annotation: all values widened to string
const palette: Palette = {
  red: '#FF0000',
  green: '#00FF00',
};
palette.red; // type: string (lost literal)

// ❌ with as const: no validation
const palette = {
  red: '#FF0000',
  invalid: 123, // no error!
} as const;

// ✅ satisfies: validates AND preserves literal types
const palette = {
  red: '#FF0000',
  green: '#00FF00',
} satisfies Palette;
palette.red; // type: string (validated against Palette)
```

---

## 15. Enable `isolatedModules` for Build Tool Compatibility

When using transpilers like esbuild or SWC (used by Vite, Next.js, tsup), each file is compiled independently — TypeScript's `const enum` and namespace re-exports can break this:

```json
{
  "compilerOptions": {
    "isolatedModules": true
  }
}
```

This flag makes TypeScript error when you use patterns that don't work with single-file transpilation. Also use `type` imports to make intent explicit:

```typescript
// ❌ Runtime import (even if only used as type)
import { User } from './user';

// ✅ Type-only import — erased at compile time
import type { User } from './user';

// ✅ Inline type import
import { createUser, type User } from './user';
```

---

## Quick Reference Checklist

| Practice | Config / Pattern |
|---|---|
| Enable strict mode | `"strict": true` in tsconfig |
| No implicit any | Included in strict |
| Unknown over any | `unknown` for external data |
| Runtime validation | Zod, Valibot |
| Discriminated unions | `type State = \| A \| B` with shared `kind` field |
| Utility types | `Partial`, `Pick`, `Omit`, `Record`, `ReturnType` |
| Type-only imports | `import type { T }` |
| No type assertions | Use type guards instead |

---

## Related Tools

- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — inspect API payloads while debugging types
- [JWT Decoder](https://devplaybook.cc/tools/jwt-decoder) — decode token payloads when typing auth flows
- [Regex Tester](https://devplaybook.cc/tools/regex-tester) — test patterns for template literal types
- [UUID Generator](https://devplaybook.cc/tools/uuid-generator) — generate test IDs for typed fixtures
