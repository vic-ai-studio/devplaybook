---
title: "TypeScript 5.x New Features: Complete Guide 2026"
description: "Master every TypeScript 5.x feature: decorators, const type parameters, variadic tuple improvements, satisfies operator, using declarations, and major performance improvements. With before/after examples."
date: "2026-03-27"
tags: ["typescript", "javascript", "type-system", "frontend", "backend", "web-development"]
author: "DevPlaybook Team"
readingTime: "13 min read"
---

# TypeScript 5.x New Features: Complete Guide 2026

TypeScript 5.x has been one of the most consequential release series in the language's history. From the long-awaited ECMAScript decorators to `const` type parameters, the `satisfies` operator, and major build speed improvements, each minor release added features that meaningfully change how you write TypeScript. This guide covers all the major features with before/after code examples.

## TypeScript 5.0: The Foundation Release

### Decorators (Finally, the Standard Way)

TypeScript has supported an experimental decorator syntax since 2015. TypeScript 5.0 implements the **official ECMAScript decorators proposal** — and it's incompatible with the old experimental syntax.

```typescript
// Old experimental decorators (tsconfig: experimentalDecorators: true)
function log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value
  descriptor.value = function(...args: any[]) {
    console.log(`Calling ${key}`)
    return original.apply(this, args)
  }
  return descriptor
}

class OldService {
  @log
  fetchData() { /* ... */ }
}
```

```typescript
// New ECMAScript decorators (TypeScript 5.0+)
// No experimentalDecorators needed

function log<T, Args extends unknown[], Return>(
  target: (this: T, ...args: Args) => Return,
  context: ClassMethodDecoratorContext
) {
  return function(this: T, ...args: Args): Return {
    console.log(`Calling ${String(context.name)}`)
    return target.call(this, ...args)
  }
}

class Service {
  @log
  fetchData() { /* ... */ }
}
```

**Class decorators:**
```typescript
function sealed(target: typeof SomeClass, context: ClassDecoratorContext) {
  Object.seal(target)
  Object.seal(target.prototype)
}

@sealed
class SomeClass {
  value = 42
}

// Decorator factories (with arguments)
function retry(times: number) {
  return function<T, Args extends unknown[], Return>(
    target: (this: T, ...args: Args) => Promise<Return>,
    context: ClassMethodDecoratorContext
  ) {
    return async function(this: T, ...args: Args): Promise<Return> {
      for (let i = 0; i < times; i++) {
        try {
          return await target.call(this, ...args)
        } catch (e) {
          if (i === times - 1) throw e
        }
      }
      throw new Error('Unreachable')
    }
  }
}

class ApiClient {
  @retry(3)
  async fetch(url: string): Promise<Response> {
    return fetch(url)
  }
}
```

**Accessor decorators** (new concept):
```typescript
function clamp(min: number, max: number) {
  return function(_: unknown, context: ClassAccessorDecoratorContext) {
    return {
      get(this: any): number {
        return context.access.get(this)
      },
      set(this: any, value: number) {
        context.access.set(this, Math.min(Math.max(value, min), max))
      },
    }
  }
}

class Circle {
  @clamp(0, 100)
  accessor opacity = 100
}

const c = new Circle()
c.opacity = 150  // clamped to 100
c.opacity = -10  // clamped to 0
```

### Const Type Parameters

Before TypeScript 5.0, inferring literal types from generic functions required workarounds with `as const`.

```typescript
// Before TypeScript 5.0
function getConfig<T>(config: T) {
  return config
}
const cfg = getConfig({ mode: 'dark', lang: 'en' })
// cfg.mode: string (not "dark")

// Workaround: user has to write `as const`
const cfg2 = getConfig({ mode: 'dark', lang: 'en' } as const)
// cfg2.mode: "dark" ✓ but annoying to require
```

```typescript
// TypeScript 5.0: const type parameter
function getConfig<const T>(config: T) {
  return config
}
const cfg = getConfig({ mode: 'dark', lang: 'en' })
// cfg.mode: "dark" ✓ — automatically inferred as literal type
```

Real-world use case — typed route definitions:

```typescript
function defineRoutes<const T extends readonly string[]>(routes: T) {
  return routes
}

const routes = defineRoutes(['/home', '/about', '/blog'])
type Route = typeof routes[number]
// Route = "/home" | "/about" | "/blog"  — exact literals, not string
```

### Multiple Config Files with `extends` Array

```json
// tsconfig.json
{
  "extends": [
    "@tsconfig/strictest/tsconfig.json",
    "@tsconfig/node18/tsconfig.json",
    "./tsconfig.paths.json"
  ],
  "compilerOptions": {
    "outDir": "./dist"
  }
}
```

---

## TypeScript 5.1: Return Type Improvements

### Undefined-Returning Functions

TypeScript 5.1 allows functions with explicit `undefined` return type to omit the `return` statement:

```typescript
// Before 5.1: error — function declared to return undefined but has no return
function setup(): undefined {
  doSomething()
  // error: A function whose declared type is neither 'void' nor 'any' must return a value.
}

// TypeScript 5.1: fine
function setup(): undefined {
  doSomething()
  // implicit return undefined is allowed
}
```

### Unrelated Types for Getters and Setters

```typescript
// Before 5.1: getter and setter had to use the same type
class Element {
  // ❌ error: The types of 'innerHTML' are incompatible
  get innerHTML(): string { return this._html }
  set innerHTML(value: string | TrustedHTML) { this._html = String(value) }
}

// TypeScript 5.1: getter and setter can have unrelated types
class SafeElement {
  private _html = ''

  get innerHTML(): string {
    return this._html
  }

  set innerHTML(value: string | { toString(): string }) {
    this._html = String(value)
  }
}
```

---

## TypeScript 5.2: using Declarations

TypeScript 5.2 implements the **ECMAScript Explicit Resource Management** proposal — the `using` keyword.

### The Problem It Solves

```typescript
// Before: manual cleanup in try/finally
async function processFile(path: string) {
  const file = await openFile(path)
  try {
    const data = await file.read()
    return process(data)
  } finally {
    await file.close()  // easy to forget
  }
}
```

### using Declarations

```typescript
// TypeScript 5.2: automatic cleanup
class FileHandle implements Disposable {
  constructor(private path: string) {}

  read() { /* ... */ }

  [Symbol.dispose]() {
    console.log(`Closing ${this.path}`)
    // cleanup runs automatically
  }
}

async function processFile(path: string) {
  using file = new FileHandle(path)
  // file is automatically disposed when it goes out of scope
  const data = file.read()
  return process(data)
}
```

For async resources:

```typescript
class DatabaseConnection implements AsyncDisposable {
  async query(sql: string) { /* ... */ }

  async [Symbol.asyncDispose]() {
    await this.close()
  }
}

async function runQuery() {
  await using db = new DatabaseConnection()
  const result = await db.query('SELECT * FROM users')
  return result
  // db is automatically closed here
}
```

**`DisposableStack` for multiple resources:**

```typescript
async function processFiles(paths: string[]) {
  await using stack = new AsyncDisposableStack()

  const files = paths.map(path => {
    const file = new FileHandle(path)
    stack.use(file)
    return file
  })

  // Process all files
  for (const file of files) {
    await file.process()
  }
  // All files are closed automatically when stack goes out of scope
}
```

---

## TypeScript 5.3: Import Attributes

TypeScript 5.3 supports **Import Attributes** (the `with` keyword, replacing the older `assert` keyword):

```typescript
// Import JSON with type assertion
import data from './config.json' with { type: 'json' }

// Dynamic import with attribute
const styles = await import('./theme.css', { with: { type: 'css' } })
```

### Resolution Customization Hooks

TypeScript 5.3 also added `resolution-mode` for type imports to handle ESM/CJS dual packages:

```typescript
// Import types from the ESM version of a package
import type { PackageType } from 'some-package' with { 'resolution-mode': 'import' }

// Import types from the CJS version
import type { PackageType } from 'some-package' with { 'resolution-mode': 'require' }
```

---

## TypeScript 5.4: Preserved Narrowing

TypeScript 5.4 improved type narrowing in closures. Previously, TypeScript would widen types inside closures even when the outer scope had narrowed them.

```typescript
// Before 5.4
function processUser(user: User | null) {
  if (!user) return

  const getAge = () => {
    // TypeScript would sometimes forget user is non-null here
    return user.age  // Could show error in some versions
  }
}

// TypeScript 5.4: narrowing is preserved in closures
function processUser(user: User | null) {
  if (!user) return

  const getAge = () => {
    return user.age  // ✅ TypeScript knows user is User here
  }
}
```

### `NoInfer<T>` Utility Type

New in 5.4: prevent TypeScript from using a type parameter for inference:

```typescript
// Without NoInfer
function createState<T>(initial: T, fallback: T): [T, T] {
  return [initial, fallback]
}

// Problem: TypeScript infers T from both arguments
const [state, fb] = createState('hello', 42)
// T inferred as string | number — probably not what you want

// With NoInfer
function createState<T>(initial: T, fallback: NoInfer<T>): [T, T] {
  return [initial, fallback]
}

const [state, fb] = createState('hello', 42)
// Error: 42 is not assignable to string
// T is inferred from `initial` only
```

---

## TypeScript 5.5: Inferred Type Predicates

TypeScript 5.5 automatically infers type predicates from function return values — one of the most long-requested features.

```typescript
// Before 5.5: had to write type predicate manually
function isString(value: unknown): value is string {
  return typeof value === 'string'
}

// TypeScript 5.5: infers the type predicate automatically
function isString(value: unknown) {
  return typeof value === 'string'
}

const values = [1, 'hello', 2, 'world', 3]
const strings = values.filter(isString)
// strings: string[] — correctly inferred!  (was (string | number)[] before 5.5)
```

This is huge for array filtering:

```typescript
const users: (User | null)[] = await getUsers()

// Before 5.5: needed explicit type guard
const activeUsers = users.filter((u): u is User => u !== null)

// TypeScript 5.5: works automatically
const activeUsers = users.filter(u => u !== null)
// activeUsers: User[] ✓
```

### Regular Expression Syntax Checking

TypeScript 5.5 added basic regex validation:

```typescript
const invalidRegex = /(?<dup>a)(?<dup>b)/
//                                ^ Error: Duplicate capture group name 'dup'

const unclosed = /[abc/
//                    ^ Error: Unterminated character class

const invalidFlag = /test/z
//                       ^ Error: Unknown regex flag 'z'
```

---

## Performance Improvements in TypeScript 5.x

TypeScript 5.x has been systematically faster than TypeScript 4.x:

| Scenario | TS 4.9 | TS 5.0 | TS 5.5 |
|----------|--------|--------|--------|
| TypeScript repo self-check | 77.8s | 56.6s | 47.2s |
| Material-UI check | 114.9s | 70.1s | 61.8s |
| VS Code check | 128.2s | 104.5s | 89.3s |

Key optimizations:
- Module resolution caching
- Reduced allocations in the checker
- Faster `--isolatedModules` builds
- Better incremental build caching

### Optimal tsconfig for 5.x

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "incremental": true,
    "tsBuildInfoFile": ".tsbuildinfo"
  }
}
```

**Key options explained:**
- `verbatimModuleSyntax` — ensures `import type` is used for type-only imports (better for bundlers)
- `noUncheckedIndexedAccess` — array indexing returns `T | undefined` instead of `T`
- `isolatedModules` — each file must be independently transpilable (required by SWC/esbuild/Vite)
- `incremental` — cache type-checking results for faster rebuilds

---

## Integration with Vite, esbuild, and SWC

TypeScript 5.x works seamlessly with modern transpilers. Important: these tools **transpile** TypeScript but don't **type-check** it.

```bash
# Use tsc for type checking only (no emit)
tsc --noEmit --watch

# Use your bundler for actual compilation
vite build
```

```json
// package.json scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "typecheck": "tsc --noEmit"
  }
}
```

### Decorator Support in Vite

```javascript
// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react({
      babel: {
        plugins: [
          // For new ECMAScript decorators (TypeScript 5.0+)
          // No plugin needed if your bundler handles TypeScript natively
        ]
      }
    })
  ],
  esbuild: {
    // esbuild handles TypeScript but doesn't support TS decorators yet
    // Use tsc or Babel for decorator-heavy code
  }
})
```

---

## Migrating from TypeScript 4.x

### Breaking Changes to Watch

1. **`experimentalDecorators` vs new decorators** — they're incompatible. If you use frameworks that require `experimentalDecorators` (older versions of Angular, NestJS), don't migrate those codebases yet. Check your framework docs.

2. **`moduleResolution: "bundler"` is recommended** (not required):
```json
{
  "compilerOptions": {
    "module": "ESNext",
    "moduleResolution": "bundler"  // Recommended for Vite/webpack/esbuild projects
  }
}
```

3. **`verbatimModuleSyntax` replaces `importsNotUsedAsValues`**:
```json
// Before (4.x)
{ "importsNotUsedAsValues": "error" }

// After (5.x)
{ "verbatimModuleSyntax": true }
```

4. **`@types/node` minimum version** — TypeScript 5.x requires `@types/node` 18+ for full support of modern Node.js APIs.

### Migration Checklist

```bash
# 1. Update TypeScript
npm install typescript@latest

# 2. Update @types
npm install @types/node@latest @types/react@latest

# 3. Run type check and fix errors
npx tsc --noEmit

# 4. Update tsconfig if needed
# - Add "verbatimModuleSyntax": true
# - Change "moduleResolution" to "bundler" or "NodeNext"
```

---

## Summary

TypeScript 5.x delivered transformative features across its release series:

- **5.0**: ECMAScript decorators (standard), const type parameters
- **5.1**: Unrelated getter/setter types, undefined-returning functions
- **5.2**: `using` declarations for automatic resource cleanup
- **5.3**: Import attributes with `with`, resolution mode control
- **5.4**: Improved closure narrowing, `NoInfer<T>` utility type
- **5.5**: Inferred type predicates (`.filter(isString)` just works), regex validation

Build performance improved by ~40% across the series. The `satisfies` operator (introduced in 4.9 but widely adopted with 5.x) and the new strictness options make TypeScript more expressive than ever.

For new projects in 2026, start with TypeScript 5.5+, enable `verbatimModuleSyntax`, `noUncheckedIndexedAccess`, and `strict`. You'll catch more bugs at compile time and write less defensive code at runtime.
