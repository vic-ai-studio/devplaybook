---
title: "Deno 2.0 Complete Guide 2026: Setup, npm Support, Std Library & Deno Deploy"
description: "The complete hands-on guide to Deno 2.0 for 2026. Learn installation, npm package support, the standard library, TypeScript-first development, and deploying to Deno Deploy with real code examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["deno", "javascript", "typescript", "nodejs", "deno-deploy", "backend", "runtime"]
readingTime: "16 min read"
---

Deno 2.0 shipped with one promise: make JavaScript runtime development feel like it was designed for 2026, not 2009. With native TypeScript support, a comprehensive standard library, npm compatibility, and a built-in deployment platform, Deno has transformed from an experimental project into a serious production runtime.

This guide walks you through everything you need to build and ship real Deno 2.0 applications — from first install to production deployment.

---

## What Is Deno 2.0?

Deno is a JavaScript and TypeScript runtime built on V8 and Rust. Unlike Node.js, Deno was designed from scratch with modern developer experience as a first-class concern:

- **No `node_modules`** — dependencies are fetched by URL or from the npm registry
- **TypeScript without config** — runs `.ts` files directly, no `tsconfig.json` required
- **Security by default** — file system, network, and environment access are denied unless explicitly granted
- **Built-in tooling** — formatter, linter, test runner, bundler all included
- **npm compatibility** — Deno 2.0 supports the full npm registry via `npm:` specifiers

The `2.0` release was a major milestone: it introduced full Node.js/npm compatibility, a stable standard library, and a first-class package publishing workflow via JSR (JavaScript Registry).

---

## Installation

### macOS / Linux

```bash
curl -fsSL https://deno.land/install.sh | sh
```

Add to your shell profile:

```bash
export DENO_INSTALL="$HOME/.deno"
export PATH="$DENO_INSTALL/bin:$PATH"
```

### Windows (PowerShell)

```powershell
irm https://deno.land/install.ps1 | iex
```

### Verify Installation

```bash
deno --version
# deno 2.x.x (release, aarch64-apple-darwin)
# v8 12.x.x
# typescript 5.x.x
```

### Upgrading Deno

```bash
deno upgrade
# Upgrade to the latest stable version
deno upgrade --version 2.1.0
# Pin to a specific version
```

---

## Your First Deno Program

Create `hello.ts`:

```typescript
// hello.ts
const name = Deno.args[0] ?? "world";
console.log(`Hello, ${name}!`);
```

Run it:

```bash
deno run hello.ts
# Hello, world!

deno run hello.ts Deno
# Hello, Deno!
```

No build step. No configuration. TypeScript just works.

---

## Deno 2.0 New Features

### 1. Full npm Compatibility

Deno 2.0 supports npm packages via the `npm:` prefix:

```typescript
// Use any npm package directly
import express from "npm:express@4";
import chalk from "npm:chalk@5";

const app = express();

app.get("/", (_req, res) => {
  res.send(chalk.green("Hello from Deno + Express!"));
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
```

Run with network permission:

```bash
deno run --allow-net server.ts
```

Deno downloads and caches npm packages automatically — no `npm install` needed.

### 2. Node.js Built-in Compatibility

Deno 2.0 supports `node:` specifiers for built-in Node.js modules:

```typescript
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";

const content = readFileSync(join(Deno.cwd(), "README.md"), "utf-8");
console.log(content.slice(0, 100));
```

This means most Node.js code runs in Deno with minimal or no changes.

### 3. `deno.json` Configuration

Deno 2.0 introduced a proper configuration file:

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "imports": {
    "@std/path": "jsr:@std/path@1",
    "@std/assert": "jsr:@std/assert@1",
    "express": "npm:express@4"
  },
  "tasks": {
    "dev": "deno run --watch --allow-all src/main.ts",
    "test": "deno test --allow-all",
    "fmt": "deno fmt",
    "lint": "deno lint"
  },
  "fmt": {
    "lineWidth": 100,
    "singleQuote": true
  },
  "lint": {
    "rules": {
      "include": ["no-unused-vars", "no-explicit-any"]
    }
  }
}
```

### 4. JSR — JavaScript Registry

JSR is Deno's package registry, built for the TypeScript-first world:

```typescript
// Import from JSR — no npm, no CDN
import { join, dirname } from "jsr:@std/path@1";
import { assertEquals } from "jsr:@std/assert@1";
import { parse } from "jsr:@std/csv@1";
```

JSR packages:
- Are TypeScript-first (types included by default)
- Are cross-runtime (work in Deno, Node.js, and browsers)
- Have automated API documentation

---

## The Deno Standard Library

Deno's standard library (`@std`) is stable in 2.0 and covers everything you need without third-party dependencies.

### File System

```typescript
import { exists, ensureDir, copy } from "jsr:@std/fs@1";

// Check if file exists
if (await exists("./config.json")) {
  console.log("Config found");
}

// Create directory recursively
await ensureDir("./output/reports");

// Copy a file
await copy("./template.html", "./output/index.html");
```

### Path Utilities

```typescript
import { join, extname, basename, dirname } from "jsr:@std/path@1";

const filePath = join(Deno.cwd(), "src", "main.ts");
console.log(extname(filePath));    // .ts
console.log(basename(filePath));   // main.ts
console.log(dirname(filePath));    // /path/to/src
```

### HTTP Server

```typescript
import { serve } from "jsr:@std/http@1";

const handler = async (req: Request): Promise<Response> => {
  const url = new URL(req.url);

  if (url.pathname === "/health") {
    return new Response(JSON.stringify({ status: "ok" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/echo" && req.method === "POST") {
    const body = await req.json();
    return new Response(JSON.stringify({ echo: body }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
};

console.log("Server running on http://localhost:8000");
await serve(handler, { port: 8000 });
```

### CSV Parsing

```typescript
import { parse, stringify } from "jsr:@std/csv@1";

const csvContent = `name,age,city
Alice,30,NYC
Bob,25,SF
Charlie,35,Chicago`;

const records = parse(csvContent, { skipFirstRow: true });
console.log(records);
// [{ name: "Alice", age: "30", city: "NYC" }, ...]

const output = stringify(records, { columns: ["name", "city"] });
console.log(output);
```

### Date/Time

```typescript
import { format, parse as parseDate } from "jsr:@std/datetime@1";

const now = new Date();
console.log(format(now, "yyyy-MM-dd HH:mm:ss"));
// "2026-03-28 14:30:00"

const date = parseDate("2026-03-28", "yyyy-MM-dd");
console.log(date.toISOString());
```

---

## Security Model

Deno's security model is explicit. By default, your program cannot access files, the network, environment variables, or run subprocesses.

### Permission Flags

```bash
# Grant specific permissions
deno run --allow-net server.ts
deno run --allow-read=./data script.ts
deno run --allow-write=/tmp script.ts
deno run --allow-env=DATABASE_URL script.ts
deno run --allow-run=git script.ts

# Grant all permissions (use sparingly)
deno run --allow-all script.ts

# Prompt for permissions at runtime
deno run --prompt script.ts
```

### Checking Permissions in Code

```typescript
// Request permission programmatically
const readPerm = await Deno.permissions.request({ name: "read", path: "./data" });

if (readPerm.state === "granted") {
  const content = await Deno.readTextFile("./data/config.json");
  console.log(content);
} else {
  console.error("Read permission denied");
}

// Check without prompting
const netPerm = await Deno.permissions.query({ name: "net", host: "api.example.com" });
console.log(netPerm.state); // "granted" | "denied" | "prompt"
```

---

## Built-in Tooling

### Formatter

```bash
deno fmt
deno fmt --check   # Check without modifying
deno fmt src/      # Format specific directory
```

### Linter

```bash
deno lint
deno lint src/
deno lint --rules-include=no-explicit-any
```

### Test Runner

```typescript
// math_test.ts
import { assertEquals, assertThrows } from "jsr:@std/assert@1";

function add(a: number, b: number): number {
  return a + b;
}

function divide(a: number, b: number): number {
  if (b === 0) throw new Error("Division by zero");
  return a / b;
}

Deno.test("add: basic addition", () => {
  assertEquals(add(2, 3), 5);
  assertEquals(add(-1, 1), 0);
});

Deno.test("divide: throws on zero", () => {
  assertThrows(() => divide(10, 0), Error, "Division by zero");
});

Deno.test({
  name: "divide: async test example",
  async fn() {
    const result = await Promise.resolve(divide(10, 2));
    assertEquals(result, 5);
  },
});
```

```bash
deno test
deno test --coverage   # Generate coverage report
deno test --watch      # Watch mode
```

### Documentation Generator

```bash
deno doc src/main.ts   # Generate docs from JSDoc comments
deno doc --html src/   # Generate HTML docs
```

---

## Building a REST API with Deno 2.0

Here's a complete REST API example using Deno's built-in HTTP server:

```typescript
// api/main.ts
interface User {
  id: number;
  name: string;
  email: string;
}

const users: Map<number, User> = new Map([
  [1, { id: 1, name: "Alice", email: "alice@example.com" }],
  [2, { id: 2, name: "Bob", email: "bob@example.com" }],
]);
let nextId = 3;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function handleRequest(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const segments = url.pathname.split("/").filter(Boolean);

  // GET /users
  if (req.method === "GET" && segments[0] === "users" && !segments[1]) {
    return json([...users.values()]);
  }

  // GET /users/:id
  if (req.method === "GET" && segments[0] === "users" && segments[1]) {
    const id = parseInt(segments[1]);
    const user = users.get(id);
    if (!user) return json({ error: "User not found" }, 404);
    return json(user);
  }

  // POST /users
  if (req.method === "POST" && segments[0] === "users") {
    const body = await req.json() as Partial<User>;
    if (!body.name || !body.email) {
      return json({ error: "name and email required" }, 400);
    }
    const user: User = { id: nextId++, name: body.name, email: body.email };
    users.set(user.id, user);
    return json(user, 201);
  }

  // DELETE /users/:id
  if (req.method === "DELETE" && segments[0] === "users" && segments[1]) {
    const id = parseInt(segments[1]);
    if (!users.has(id)) return json({ error: "User not found" }, 404);
    users.delete(id);
    return json({ deleted: id });
  }

  return json({ error: "Not Found" }, 404);
}

Deno.serve({ port: 8000 }, handleRequest);
console.log("API running at http://localhost:8000");
```

Run it:

```bash
deno run --allow-net api/main.ts
```

---

## Environment Variables and Configuration

```typescript
// config.ts
import { load } from "jsr:@std/dotenv@1";

// Load .env file
const env = await load();

export const config = {
  port: parseInt(env.PORT ?? Deno.env.get("PORT") ?? "8000"),
  databaseUrl: env.DATABASE_URL ?? Deno.env.get("DATABASE_URL") ?? "",
  jwtSecret: env.JWT_SECRET ?? Deno.env.get("JWT_SECRET") ?? "dev-secret",
  nodeEnv: env.NODE_ENV ?? Deno.env.get("NODE_ENV") ?? "development",
};

if (!config.databaseUrl) {
  console.error("DATABASE_URL is required");
  Deno.exit(1);
}
```

```bash
# Run with environment access
deno run --allow-env --allow-read=.env --allow-net app.ts
```

---

## Deploying to Deno Deploy

Deno Deploy is Deno's edge computing platform — globally distributed, serverless JavaScript execution with zero configuration.

### Step 1: Create a Deno Deploy Account

Sign up at [deno.com/deploy](https://deno.com/deploy) and link your GitHub account.

### Step 2: Prepare Your Entry Point

```typescript
// main.ts — Deno Deploy entry point
Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/") {
    return new Response(
      `<!DOCTYPE html>
<html>
<head><title>My Deno App</title></head>
<body>
  <h1>Hello from Deno Deploy!</h1>
  <p>Running on: ${Deno.version.deno}</p>
</body>
</html>`,
      { headers: { "Content-Type": "text/html" } }
    );
  }

  if (url.pathname === "/api/time") {
    return new Response(JSON.stringify({ time: new Date().toISOString() }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
});
```

### Step 3: Deploy via GitHub Integration

1. Push your code to GitHub
2. In Deno Deploy dashboard, click **New Project**
3. Connect your repository
4. Set entry point to `main.ts`
5. Click **Deploy**

Your app is now live at `https://your-project.deno.dev`.

### Step 4: Custom Domains

```bash
# Install deployctl CLI
deno install -A jsr:@deno/deployctl

# Deploy directly from CLI
deployctl deploy --project=my-app main.ts

# Deploy with environment variables
deployctl deploy --project=my-app \
  --env DATABASE_URL=postgres://... \
  main.ts
```

### Step 5: Environment Variables in Deno Deploy

In the Deno Deploy dashboard:
- Go to **Project Settings → Environment Variables**
- Add your secrets (DATABASE_URL, API_KEY, etc.)

Access them in code:

```typescript
const apiKey = Deno.env.get("API_KEY");
if (!apiKey) throw new Error("API_KEY not set");
```

---

## KV Storage on Deno Deploy

Deno Deploy includes a globally distributed key-value store:

```typescript
// Use Deno KV for persistent storage
const kv = await Deno.openKv();

interface Counter {
  count: number;
  updatedAt: string;
}

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  if (url.pathname === "/counter" && req.method === "GET") {
    const result = await kv.get<Counter>(["counter"]);
    return new Response(JSON.stringify(result.value ?? { count: 0 }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (url.pathname === "/counter/increment" && req.method === "POST") {
    const current = await kv.get<Counter>(["counter"]);
    const newCount = (current.value?.count ?? 0) + 1;

    await kv.set(["counter"], {
      count: newCount,
      updatedAt: new Date().toISOString(),
    });

    return new Response(JSON.stringify({ count: newCount }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
});
```

---

## Migrating from Node.js

Most Node.js code migrates to Deno 2.0 with minimal changes:

### Package Imports

```typescript
// Node.js
import express from "express";
import { readFileSync } from "fs";
import path from "path";

// Deno 2.0 (option 1 — use node: prefix)
import express from "npm:express";
import { readFileSync } from "node:fs";
import path from "node:path";

// Deno 2.0 (option 2 — use Deno APIs)
import express from "npm:express";
const content = await Deno.readTextFile("./file.txt");
import { join } from "jsr:@std/path@1";
```

### `package.json` → `deno.json`

```json
// package.json scripts
{
  "scripts": {
    "start": "node dist/index.js",
    "dev": "ts-node src/index.ts",
    "test": "jest"
  }
}

// deno.json tasks
{
  "tasks": {
    "start": "deno run --allow-all src/main.ts",
    "dev": "deno run --watch --allow-all src/main.ts",
    "test": "deno test --allow-all"
  }
}
```

### Common Patterns

```typescript
// Reading JSON (Node.js)
const config = JSON.parse(readFileSync("./config.json", "utf-8"));

// Reading JSON (Deno)
const config = JSON.parse(await Deno.readTextFile("./config.json"));
// Or with permission check
import { exists } from "jsr:@std/fs@1";
if (await exists("./config.json")) {
  const config = JSON.parse(await Deno.readTextFile("./config.json"));
}
```

---

## Performance Tips

### 1. Use `--cached-only` in CI

```bash
# Pre-cache dependencies
deno cache src/main.ts

# Run without network access in CI
deno run --allow-all --cached-only src/main.ts
```

### 2. Compile to a Single Binary

```bash
# Compile to standalone executable
deno compile --allow-all --output my-app src/main.ts

# Cross-compile for different targets
deno compile --target x86_64-pc-windows-msvc --allow-all --output my-app.exe src/main.ts
deno compile --target x86_64-unknown-linux-gnu --allow-all --output my-app-linux src/main.ts
```

### 3. Use Workers for CPU-Intensive Tasks

```typescript
// worker.ts
self.onmessage = (event) => {
  const { data } = event;
  const result = expensiveComputation(data);
  self.postMessage(result);
};

function expensiveComputation(n: number): number {
  // Simulate CPU work
  return Array.from({ length: n }, (_, i) => i).reduce((a, b) => a + b, 0);
}

// main.ts
const worker = new Worker(new URL("./worker.ts", import.meta.url), {
  type: "module",
});

worker.postMessage(1_000_000);

worker.onmessage = (event) => {
  console.log("Result:", event.data);
  worker.terminate();
};
```

---

## Summary

Deno 2.0 delivers on its promise of a modern JavaScript runtime:

| Feature | Details |
|---------|---------|
| TypeScript support | Native, zero config |
| npm compatibility | Full via `npm:` prefix |
| Node.js built-ins | Supported via `node:` prefix |
| Standard library | Stable, JSR-hosted |
| Security model | Explicit permissions |
| Built-in tooling | fmt, lint, test, doc, compile |
| Deployment | Deno Deploy (edge, global) |

Whether you're starting a new project or migrating from Node.js, Deno 2.0 provides a clean, secure, and modern development experience with first-class TypeScript support and a batteries-included standard library.

**Target keywords:** deno 2.0 guide, deno vs node 2026, deno 2 npm support, deno deploy tutorial, deno typescript guide
