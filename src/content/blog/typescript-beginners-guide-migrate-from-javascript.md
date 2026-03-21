---
title: "TypeScript Beginner's Guide: Migrate from JavaScript the Right Way"
description: "Step-by-step TypeScript beginner's guide. Learn types, interfaces, generics, and how to migrate an existing JavaScript project without breaking everything."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["typescript", "javascript", "typescript-tutorial", "type-safety", "frontend", "backend", "beginners-guide"]
readingTime: "13 min read"
---

TypeScript is JavaScript with a safety net. It doesn't replace JavaScript — it compiles down to it. But between writing your code and that compilation step, TypeScript checks your work: it catches the typo in that property name, the function call with the wrong argument type, the variable that might be `undefined` when you're treating it as a string. It finds bugs before they find you.

This guide assumes you know JavaScript. We'll cover the key TypeScript concepts, then walk through a practical migration from an existing JS project — the right way, without breaking everything in one go.

## TL;DR

- TypeScript adds static types to JavaScript, catching bugs at compile time instead of runtime
- Install with `npm install -D typescript` and configure with `tsconfig.json`
- Core types: `string`, `number`, `boolean`, `string[]`, `Record<K, V>`, union types (`string | number`)
- `interface` and `type` are both valid — `interface` for object shapes, `type` for unions/primitives
- Migrate JS projects incrementally: start with `allowJs: true`, then add types file by file
- Don't fight TypeScript — when you find yourself using `any` everywhere, step back and reconsider your types

---

## Why TypeScript Exists

JavaScript is dynamically typed. Type errors are runtime errors. This means bugs like the following are caught only when a user hits that code path:

```javascript
// JavaScript — this looks fine until it runs
function greetUser(user) {
  return `Hello, ${user.nme}!`; // Typo: 'nme' instead of 'name'
}

greetUser({ name: "Alice" });
// → "Hello, undefined!" — silently wrong, no error thrown
```

TypeScript catches this before you even run the code:

```typescript
// TypeScript — caught at compile time
interface User {
  name: string;
  email: string;
}

function greetUser(user: User): string {
  return `Hello, ${user.nme}!`;
  //                   ^^^
  // Error: Property 'nme' does not exist on type 'User'. Did you mean 'name'?
}
```

At small scale, this might seem like overkill. At large scale — big codebases, multiple developers, code that hasn't been touched in six months — TypeScript is the difference between confident refactoring and terrified guessing.

JavaScript pain points TypeScript solves:

- **Typos in property names** — caught immediately
- **Wrong argument types** — caught at the call site
- **Missing required properties** — caught when constructing objects
- **Unsafe `null` and `undefined` access** — caught with strict null checks
- **Broken refactoring** — rename a property and TypeScript tells you everywhere it needs to change

---

## Setting Up TypeScript

```bash
# In an existing project
npm install --save-dev typescript

# Generate a tsconfig.json
npx tsc --init
```

A sensible starting `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

The most important option is `"strict": true`. It enables a group of checks:

| Strict flag | What it catches |
|-------------|----------------|
| `strictNullChecks` | Prevents using `null`/`undefined` without checking first |
| `noImplicitAny` | Requires explicit types when TypeScript can't infer |
| `strictFunctionTypes` | Stricter function argument compatibility |
| `strictPropertyInitialization` | Class properties must be initialized in constructor |

Start with `strict: true` on new projects. For migrations, you may need to enable these one at a time.

Compile and watch:

```bash
npx tsc                    # one-time compile
npx tsc --watch            # watch mode — recompiles on file changes
npx tsc --noEmit           # type-check only, don't emit JS (useful in CI)
```

---

## Basic Types

### Primitives

```typescript
let name: string = "Alice";
let age: number = 30;
let isActive: boolean = true;
let nothing: null = null;
let notDefined: undefined = undefined;
let bigInt: bigint = 9007199254740991n;
```

TypeScript infers types from assignments, so you often don't need to annotate:

```typescript
let name = "Alice";     // TypeScript infers: string
let age = 30;           // TypeScript infers: number
let isActive = true;    // TypeScript infers: boolean
```

Annotate explicitly when:
- Declaring a variable without initializing it
- The inferred type is too broad
- Writing function signatures

### Arrays and Tuples

```typescript
// Arrays
let names: string[] = ["Alice", "Bob"];
let scores: number[] = [100, 95, 87];
let mixed: (string | number)[] = ["Alice", 42];

// Generic array syntax (equivalent)
let names2: Array<string> = ["Alice", "Bob"];

// Tuples — fixed-length arrays with known types at each position
let point: [number, number] = [10, 20];
let entry: [string, number] = ["Alice", 30];
```

### Objects

```typescript
// Inline object type
let user: { name: string; age: number; email?: string } = {
  name: "Alice",
  age: 30
  // email is optional (marked with ?)
};
```

---

## Interfaces vs Types

Both define the shape of an object. The practical difference is small; choose one and be consistent.

```typescript
// Interface
interface User {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "viewer";
  createdAt: Date;
  bio?: string;       // optional property
  readonly apiKey: string;  // can't be reassigned after creation
}

// Type alias (equivalent for object shapes)
type UserType = {
  id: string;
  name: string;
  email: string;
};
```

**When to use `interface`**: Object shapes, especially when you expect them to be extended or implemented by classes. Interfaces support declaration merging (useful for augmenting third-party types).

**When to use `type`**: Union types, intersection types, mapped types, and aliases for primitives or tuples.

```typescript
// Type does these well; interface doesn't
type Status = "pending" | "active" | "suspended";
type ID = string | number;
type Point = [number, number];
type StringMap = Record<string, string>;

// Intersection (combining types)
type AdminUser = User & { permissions: string[] };

// Union (either of these)
type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
```

---

## Union Types and Type Narrowing

Union types say "this value can be one of several types." TypeScript requires you to handle each case:

```typescript
function formatId(id: string | number): string {
  if (typeof id === "number") {
    return id.toString().padStart(8, "0");  // TypeScript knows id is number here
  }
  return id.toUpperCase();  // TypeScript knows id is string here
}
```

This narrowing also works with `instanceof`, `in`, and discriminated unions:

```typescript
interface Circle {
  shape: "circle";  // literal type as discriminant
  radius: number;
}

interface Rectangle {
  shape: "rectangle";
  width: number;
  height: number;
}

type Shape = Circle | Rectangle;

function getArea(shape: Shape): number {
  switch (shape.shape) {
    case "circle":
      return Math.PI * shape.radius ** 2;  // TypeScript knows: Circle
    case "rectangle":
      return shape.width * shape.height;   // TypeScript knows: Rectangle
  }
}
```

Discriminated unions are powerful: the shared `shape` field (with literal types) lets TypeScript narrow the type automatically inside each case.

---

## Optional Properties and Non-Null Assertion

```typescript
interface Config {
  apiUrl: string;
  timeout?: number;     // optional — may be undefined
  debug?: boolean;
}

function createClient(config: Config) {
  // TypeScript error: 'timeout' might be undefined
  const ms = config.timeout * 1000;

  // Correct: use optional chaining and nullish coalescing
  const ms = (config.timeout ?? 30) * 1000;

  // Or: check first
  if (config.timeout !== undefined) {
    const ms = config.timeout * 1000;  // now TypeScript knows it's a number
  }
}
```

The non-null assertion operator (`!`) tells TypeScript you're certain a value isn't null/undefined. Use sparingly — it bypasses the check:

```typescript
// Use only when you KNOW it exists
const element = document.getElementById("app")!;
element.classList.add("loaded");
```

---

## Generics: Writing Reusable Code

Generics let you write functions and types that work with multiple types while preserving type information:

```typescript
// Without generics — loses type info
function firstItem(arr: any[]): any {
  return arr[0];
}

const result = firstItem(["Alice", "Bob"]);
// result is 'any' — TypeScript can't help you

// With generics — type preserved
function firstItem<T>(arr: T[]): T | undefined {
  return arr[0];
}

const result = firstItem(["Alice", "Bob"]);
// result is 'string | undefined' — TypeScript knows!

const count = firstItem([1, 2, 3]);
// count is 'number | undefined'
```

A practical generic: a typed API response wrapper:

```typescript
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
  timestamp: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

async function fetchUser(id: string): Promise<ApiResponse<User>> {
  const response = await fetch(`/api/users/${id}`);
  return response.json();
}

const result = await fetchUser("123");
console.log(result.data.name);   // TypeScript knows this is a string
console.log(result.data.nme);    // Error: Property 'nme' does not exist
```

Generic constraints — require the generic type to have certain properties:

```typescript
// T must have an 'id' property
function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find(item => item.id === id);
}
```

---

## TypeScript with React

For React components, use the React-specific types:

```typescript
import React, { useState, useEffect } from 'react';

interface UserCardProps {
  userId: string;
  showEmail?: boolean;
  onDelete?: (id: string) => void;
}

const UserCard: React.FC<UserCardProps> = ({ userId, showEmail = false, onDelete }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUser(userId)
      .then(result => setUser(result.data))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>User not found</div>;

  return (
    <div>
      <h2>{user.name}</h2>
      {showEmail && <p>{user.email}</p>}
      {onDelete && (
        <button onClick={() => onDelete(userId)}>Delete</button>
      )}
    </div>
  );
};
```

---

## Migrating a JavaScript Project

The recommended approach: incremental migration. Never do a big-bang rewrite.

### Step 1: Add TypeScript without breaking anything

Install dependencies:

```bash
npm install --save-dev typescript @types/node
npx tsc --init
```

Set up `tsconfig.json` for migration mode:

```json
{
  "compilerOptions": {
    "allowJs": true,           // Allow .js files alongside .ts
    "checkJs": false,          // Don't type-check .js files yet
    "strict": false,           // Start permissive
    "outDir": "./dist",
    "rootDir": "./src",
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*"]
}
```

With `allowJs: true`, TypeScript compiles both `.js` and `.ts` files. Your existing code still works.

### Step 2: Rename files one at a time

Start with utility files that have no dependencies (they're the easiest):

```bash
mv src/utils/formatDate.js src/utils/formatDate.ts
```

Now add types to that file:

```typescript
// Before (JavaScript)
function formatDate(date, format) {
  if (!date) return '';
  const d = new Date(date);
  // ...
}

// After (TypeScript)
type DateInput = Date | string | number;
type DateFormat = 'short' | 'long' | 'iso';

function formatDate(date: DateInput, format: DateFormat = 'short'): string {
  if (!date) return '';
  const d = new Date(date);
  // ...
}
```

### Step 3: Add types for third-party libraries

Most popular libraries have community-maintained type definitions:

```bash
npm install --save-dev @types/express @types/lodash @types/uuid
```

If a library doesn't have types (rare for popular libraries), create a declaration file:

```typescript
// src/types/untyped-library.d.ts
declare module 'some-untyped-library' {
  export function doThing(input: string): number;
  export const VERSION: string;
}
```

### Step 4: Enable stricter checking progressively

Once the majority of files are converted to `.ts`:

```json
{
  "compilerOptions": {
    "allowJs": false,          // Only .ts now
    "checkJs": false,
    "strict": false,
    "noImplicitAny": true,     // Enable one at a time
    "strictNullChecks": true
  }
}
```

Each flag you enable will reveal new type errors. Fix them file by file. Enable `strict: true` as the final step.

---

## Common TypeScript Gotchas

**The `any` escape hatch**: `any` disables type checking for a value. It's tempting when migrating, but overuse defeats the purpose. Use `unknown` instead when you genuinely don't know the type — it forces you to narrow before using:

```typescript
// Bad: any disables all checking
function parse(input: any) {
  return input.toUpperCase();  // No error even if input is a number
}

// Better: unknown forces you to check
function parse(input: unknown): string {
  if (typeof input === 'string') {
    return input.toUpperCase();  // Safe — we verified it's a string
  }
  throw new Error(`Expected string, got ${typeof input}`);
}
```

**Type assertions vs type guards**: `as` forces a type assertion. Type guards are safer because they actually check:

```typescript
// Assertion — no runtime check, can lie to TypeScript
const user = response as User;

// Guard — actually verifies the shape at runtime
function isUser(obj: unknown): obj is User {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'name' in obj &&
    'email' in obj
  );
}

if (isUser(response)) {
  console.log(response.name);  // TypeScript trusts the guard
}
```

**Enum pitfalls**: TypeScript `enum` has some surprising runtime behavior. Prefer union types or `const` objects:

```typescript
// Avoid regular enums (they have runtime overhead and numeric index issues)
enum Direction { Up, Down, Left, Right }

// Prefer: union type (zero runtime overhead)
type Direction = 'up' | 'down' | 'left' | 'right';

// Or: const object (has the value object available at runtime if needed)
const Direction = {
  Up: 'up',
  Down: 'down',
  Left: 'left',
  Right: 'right',
} as const;
type Direction = typeof Direction[keyof typeof Direction];
```

---

TypeScript has a learning curve, but it pays for itself quickly. The first week you find a bug in code review that TypeScript would have caught in two seconds, you'll understand why so many teams have made it their default.

Start with a new file, add types gradually, and let TypeScript guide you. The goal isn't type perfection — it's catching the bugs that would otherwise reach production.
