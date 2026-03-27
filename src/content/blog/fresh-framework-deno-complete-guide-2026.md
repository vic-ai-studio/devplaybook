---
title: "Fresh 2.0 + Deno: Build Fast Web Apps with Zero Config 2026"
description: "Complete guide to Fresh 2.0 and Deno in 2026: islands architecture, Preact components, file-based routing, Deno Deploy, middleware, and how Fresh compares to Next.js and Astro."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["fresh", "deno", "preact", "javascript", "typescript", "islands-architecture", "web-framework", "deno-deploy"]
readingTime: "13 min read"
draft: false
---

Fresh is the web framework built for Deno — and it's genuinely different from everything else in the JavaScript ecosystem. No build step, no client-side JavaScript by default, an islands architecture for selective interactivity, and first-class TypeScript everywhere.

Fresh 2.0 brought major improvements to the developer experience while keeping the zero-config philosophy intact. This guide walks you through everything from setup to deployment.

---

## What is Fresh?

Fresh is a full-stack web framework that runs on Deno. It uses:

- **Preact** for component rendering
- **Islands architecture** for minimal client-side JavaScript
- **File-based routing** like Next.js
- **No build step** — TypeScript is transpiled just-in-time by Deno
- **Zero JavaScript by default** — pages are pure HTML unless you add islands

The result is extremely fast page loads with full TypeScript support and no configuration.

---

## Why Fresh + Deno?

Before diving in, understand what you're getting with Deno:

**Security by default:**
```bash
# Deno requires explicit permissions
deno run --allow-net --allow-read server.ts

# Fresh does this for you via deno.json
```

**TypeScript everywhere — no config:**
```typescript
// This just works in Deno. No tsconfig.json, no ts-loader.
import type { Handler } from "$fresh/server.ts";
```

**URL imports (and npm compatibility):**
```typescript
// Import from npm (prefixed)
import { assertEquals } from "npm:chai@5";

// Import from JSR (new standard registry)
import { fresh } from "jsr:@fresh/core@2";

// Or use standard npm packages via npm:
import React from "npm:react@18";
```

**Built-in tooling:**
```bash
deno fmt       # Format code
deno lint      # Lint code
deno test      # Run tests
deno check     # Type check
```

---

## Getting Started with Fresh 2.0

### Prerequisites

```bash
# Install Deno
curl -fsSL https://deno.land/install.sh | sh

# Verify
deno --version
```

### Create a Fresh Project

```bash
deno run -A -r https://fresh.deno.dev my-app
cd my-app
```

You'll be prompted to select TypeScript or JavaScript, and whether to use Tailwind CSS.

### Project Structure

```
my-app/
├── components/          # Shared UI components (server-only by default)
│   └── Button.tsx
├── islands/             # Interactive components (run on client)
│   └── Counter.tsx
├── routes/              # File-based routing
│   ├── _app.tsx         # Root layout
│   ├── _layout.tsx      # Section layout
│   ├── index.tsx        # Home page (/)
│   ├── about.tsx        # /about
│   ├── blog/
│   │   ├── index.tsx    # /blog
│   │   └── [slug].tsx   # /blog/:slug
│   └── api/
│       └── users.ts     # /api/users
├── static/              # Static assets
├── deno.json            # Deno config + tasks
└── main.ts              # Entry point
```

### Development Server

```bash
deno task start
# Equivalent to: deno run -A --watch main.ts
```

Fresh starts instantly — there's no compilation step. Changes reflect immediately.

---

## Routing in Fresh

### Basic Routes

File-based routing maps directly to URLs:

```
routes/index.tsx          → /
routes/about.tsx          → /about
routes/blog/index.tsx     → /blog
routes/blog/[slug].tsx    → /blog/:slug
routes/users/[id].tsx     → /users/:id
routes/users/[...path].tsx → /users/* (catch-all)
```

### Page Component

```typescript
// routes/index.tsx
import type { PageProps } from "$fresh/server.ts";

export default function HomePage({ data }: PageProps) {
  return (
    <main>
      <h1>Welcome to Fresh</h1>
      <p>The no-build JavaScript framework.</p>
    </main>
  );
}
```

### Handler Functions

Routes can export a handler for server-side logic:

```typescript
// routes/blog/[slug].tsx
import { Handlers, PageProps } from "$fresh/server.ts";
import { db } from "../lib/db.ts";

interface Post {
  id: string;
  title: string;
  content: string;
  publishedAt: Date;
}

export const handler: Handlers<Post | null> = {
  async GET(req, ctx) {
    const post = await db.posts.findBySlug(ctx.params.slug);

    if (!post) {
      return ctx.renderNotFound();
    }

    return ctx.render(post);
  },
};

export default function BlogPost({ data: post }: PageProps<Post>) {
  return (
    <article>
      <h1>{post.title}</h1>
      <time>{new Date(post.publishedAt).toLocaleDateString()}</time>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  );
}
```

### API Routes

```typescript
// routes/api/users.ts
import { Handlers } from "$fresh/server.ts";
import { db } from "../../lib/db.ts";

export const handler: Handlers = {
  async GET(req) {
    const users = await db.users.findMany();
    return Response.json(users);
  },

  async POST(req) {
    const body = await req.json();

    if (!body.name || !body.email) {
      return Response.json(
        { error: "name and email are required" },
        { status: 400 }
      );
    }

    const user = await db.users.create(body);
    return Response.json(user, { status: 201 });
  },
};
```

---

## The Islands Architecture

This is Fresh's most distinctive feature.

**The problem it solves:** Most web apps deliver a large JavaScript bundle to the browser, even for mostly-static pages. This slows initial load.

**Islands solution:** Pages are rendered as static HTML on the server. Only "islands" of interactivity — explicit opt-in components — ship JavaScript to the browser.

```
routes/blog/[slug].tsx
├── BlogPost component     → Pure HTML, zero JS
├── BlogHeader component   → Pure HTML, zero JS
├── SocialShareBar         → Pure HTML, zero JS
└── CommentSection (island) → Preact component, interactive
```

Only `CommentSection` ships JavaScript. The rest is HTML.

### Creating an Island

Islands live in the `islands/` directory:

```typescript
// islands/Counter.tsx
import { useSignal } from "@preact/signals";

export default function Counter() {
  const count = useSignal(0);

  return (
    <div class="counter">
      <button onClick={() => count.value--}>-</button>
      <span>{count}</span>
      <button onClick={() => count.value++}>+</button>
    </div>
  );
}
```

```typescript
// routes/index.tsx
import Counter from "../islands/Counter.tsx";  // Import from islands/

export default function HomePage() {
  return (
    <main>
      <h1>Welcome</h1>
      {/* Counter is an island — it loads JS only for this component */}
      <Counter />
    </main>
  );
}
```

### Passing Data to Islands

```typescript
// islands/SearchBar.tsx
import { useSignal } from "@preact/signals";

interface SearchBarProps {
  placeholder?: string;
  initialQuery?: string;
}

export default function SearchBar({ placeholder = "Search...", initialQuery = "" }: SearchBarProps) {
  const query = useSignal(initialQuery);
  const results = useSignal<string[]>([]);

  async function search() {
    const res = await fetch(`/api/search?q=${query.value}`);
    results.value = await res.json();
  }

  return (
    <div>
      <input
        value={query.value}
        onInput={(e) => (query.value = (e.target as HTMLInputElement).value)}
        placeholder={placeholder}
      />
      <button onClick={search}>Search</button>
      <ul>
        {results.value.map((r) => <li key={r}>{r}</li>)}
      </ul>
    </div>
  );
}

// routes/index.tsx
import SearchBar from "../islands/SearchBar.tsx";

export default function Page() {
  return (
    <main>
      {/* Pass serializable props to the island */}
      <SearchBar placeholder="Search articles..." initialQuery="" />
    </main>
  );
}
```

**Important:** Island props must be serializable (JSON-compatible). You can't pass functions, class instances, or React-style event handlers from the server to islands.

---

## Preact Signals

Fresh uses Preact and **Preact Signals** for state management in islands:

```typescript
import { signal, computed, effect } from "@preact/signals";

// Global signals (shared state across islands)
const cartItems = signal<CartItem[]>([]);
const cartCount = computed(() => cartItems.value.length);
const cartTotal = computed(() =>
  cartItems.value.reduce((sum, item) => sum + item.price * item.quantity, 0)
);

// React to changes
effect(() => {
  console.log(`Cart has ${cartCount.value} items`);
});

// In a component
export default function CartButton() {
  return (
    <button>
      Cart ({cartCount})  {/* Auto-updates when cartCount changes */}
    </button>
  );
}
```

Signals update only the specific DOM nodes that read them — the same fine-grained reactivity as SolidJS, within the islands that need it.

---

## Layouts and Middleware

### Root App Layout

```typescript
// routes/_app.tsx
import { AppProps } from "$fresh/server.ts";

export default function App({ Component }: AppProps) {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>My Fresh App</title>
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body>
        <Component />
      </body>
    </html>
  );
}
```

### Section Layout

```typescript
// routes/blog/_layout.tsx
import { LayoutProps } from "$fresh/server.ts";

export default function BlogLayout({ Component, state }: LayoutProps) {
  return (
    <div class="blog-layout">
      <nav>
        <a href="/blog">All Posts</a>
        <a href="/blog/tags">Tags</a>
      </nav>
      <main>
        <Component />
      </main>
      <aside>
        <h3>About</h3>
        <p>A Fresh blog.</p>
      </aside>
    </div>
  );
}
```

### Middleware

```typescript
// routes/_middleware.ts
import { FreshContext } from "$fresh/server.ts";

// Authentication middleware
export async function handler(req: Request, ctx: FreshContext) {
  const url = new URL(req.url);

  // Public routes don't need auth
  if (url.pathname.startsWith("/api/public") || url.pathname === "/login") {
    return ctx.next();
  }

  // Check auth token
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify and attach user to context state
  const user = await verifyToken(token);
  if (!user) {
    return Response.json({ error: "Invalid token" }, { status: 401 });
  }

  ctx.state.user = user;
  return ctx.next();
}
```

---

## Styling in Fresh

### Tailwind CSS (Recommended)

Fresh has first-class Tailwind support:

```typescript
// fresh.config.ts
import { defineConfig } from "$fresh/server.ts";
import tailwind from "$fresh/plugins/tailwind.ts";

export default defineConfig({
  plugins: [tailwind()],
});
```

```typescript
// components/Button.tsx
interface ButtonProps {
  variant?: "primary" | "secondary";
  children: preact.ComponentChildren;
  onClick?: () => void;
}

export function Button({ variant = "primary", children, onClick }: ButtonProps) {
  const classes = variant === "primary"
    ? "bg-blue-600 hover:bg-blue-700 text-white"
    : "bg-gray-200 hover:bg-gray-300 text-gray-900";

  return (
    <button
      onClick={onClick}
      class={`px-4 py-2 rounded font-medium transition-colors ${classes}`}
    >
      {children}
    </button>
  );
}
```

### CSS Modules

```typescript
// components/Card.module.css
.card {
  border-radius: 8px;
  padding: 1.5rem;
  background: white;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
}

// components/Card.tsx
import styles from "./Card.module.css";

export function Card({ children }) {
  return <div class={styles.card}>{children}</div>;
}
```

---

## Deno Deploy

Fresh apps deploy to [Deno Deploy](https://deno.com/deploy) — a globally distributed edge runtime.

### Deploy via GitHub

1. Push your Fresh project to GitHub
2. Connect your repo at [dash.deno.com](https://dash.deno.com)
3. Set the entry point to `main.ts`
4. Deno Deploy automatically deploys on every push

### Environment Variables

```bash
# Set in Deno Deploy dashboard, or via CLI
deployctl env set DATABASE_URL=postgresql://...
```

```typescript
// Access in your app
const dbUrl = Deno.env.get("DATABASE_URL")!;
```

### Custom Domains

Deno Deploy provides a `.deno.dev` subdomain by default. Custom domains are configured in the dashboard with automatic TLS.

---

## Fresh vs Next.js vs Astro

| Feature                  | Fresh 2.0            | Next.js 15           | Astro 5              |
|--------------------------|----------------------|----------------------|----------------------|
| Default JS shipped       | Zero                 | Full bundle          | Zero                 |
| Interactivity model      | Islands              | RSC + Client Comps   | Islands              |
| Build step               | None                 | Required             | Required             |
| Runtime                  | Deno                 | Node.js              | Node.js              |
| UI framework             | Preact               | React                | Any (React, Vue, etc.) |
| TypeScript support       | Native               | Via config           | Native               |
| Deployment target        | Deno Deploy / Edge   | Vercel / anywhere    | Any                  |
| Ecosystem                | Small                | Largest              | Growing              |
| Learning curve           | Medium               | Medium               | Low                  |
| SSR/SSG                  | SSR only             | Both                 | Both                 |
| Full-stack API routes    | Yes                  | Yes                  | Yes (limited)        |

**Choose Fresh when:**
- You want zero JavaScript by default with selective islands
- You're using Deno or want Deno's security model
- You want no build step in development
- Edge deployment on Deno Deploy

**Choose Next.js when:**
- You need the React ecosystem (libraries, team knowledge)
- You need ISR, static generation, or advanced Next.js features
- Vercel deployment is your target

**Choose Astro when:**
- Content-heavy sites (blogs, docs, marketing pages)
- You want to use multiple UI frameworks in one project
- Maximum flexibility in deployment targets

---

## Performance Advantages

### Time to First Byte (TTFB)

Fresh renders on every request with no hydration needed for non-island pages:

| Scenario                  | Next.js (SSR) | Fresh     |
|---------------------------|---------------|-----------|
| Static HTML page          | ~60ms         | ~25ms     |
| Page with 1 island        | ~80ms         | ~30ms     |
| JavaScript payload        | 80–200KB      | 5–30KB    |
| Time to Interactive       | 2–4s          | 0.5–1s    |

*Approximate values, Deno Deploy edge node. Network-dependent.*

Fresh's advantage comes from:
1. No JavaScript runtime to download for static pages
2. Edge execution (Deno Deploy runs close to users)
3. No hydration step

---

## Testing Fresh Apps

```typescript
// tests/routes_test.ts
import { createHandler, ServeHandlerInfo } from "$fresh/server.ts";
import manifest from "../fresh.gen.ts";
import config from "../fresh.config.ts";

const CONN_INFO: ServeHandlerInfo = {
  remoteAddr: { hostname: "127.0.0.1", port: 53496, transport: "tcp" },
};

Deno.test("GET / returns 200", async () => {
  const handler = await createHandler(manifest, config);
  const response = await handler(
    new Request("http://localhost/"),
    CONN_INFO
  );

  assertEquals(response.status, 200);
});

Deno.test("GET /api/users returns JSON array", async () => {
  const handler = await createHandler(manifest, config);
  const response = await handler(
    new Request("http://localhost/api/users"),
    CONN_INFO
  );

  assertEquals(response.status, 200);
  assertEquals(response.headers.get("content-type"), "application/json");

  const data = await response.json();
  assertInstanceOf(data, Array);
});
```

```bash
deno test --allow-net --allow-read --allow-env
```

---

## Fresh 2.0 Improvements

Fresh 2.0 (released 2024, stable in 2026) brought:

**Better island composition:** Islands can now accept non-serializable children via slots — enabling richer component patterns.

**Improved routing:** Parallel routes, intercepting routes, and improved layout nesting.

**Plugin system:** Tailwind, KV storage, and authentication plugins are now first-class.

**Improved build output:** Optional pre-rendering for faster cold starts on Deno Deploy.

**TypeScript improvements:** Better type inference for handlers and page props.

---

## Developer Tools

- **[JSON Formatter](/tools/json-formatter)** — Format API responses from Fresh handlers
- **[URL Parser](/tools/url-parser)** — Debug Fresh route matching and URL patterns
- **[HTTP Headers](/tools/http-headers)** — Inspect response headers from Fresh middleware
- **[Base64 Encoder](/tools/base64-encoder)** — Work with binary data in Deno's native APIs

---

## Summary

Fresh 2.0 + Deno is a compelling stack for teams who want:

- **Zero configuration** — TypeScript, formatting, linting, and testing built into Deno
- **Minimal JavaScript** — islands architecture delivers only what's needed
- **Fast deployments** — edge-first with Deno Deploy, no CDN configuration needed
- **Clean security model** — Deno's permission system prevents accidental data leaks

The main tradeoff is ecosystem: Deno and Fresh are smaller than the Node.js + React world. Many npm packages work via the `npm:` prefix, but some native Node.js modules and frameworks don't have Deno-compatible equivalents yet.

For teams building content sites, APIs, or performance-critical apps with a lean stack, Fresh + Deno offers a genuinely better developer experience than most alternatives. For teams that need the full React/Node.js ecosystem, the migration cost isn't worth it.

Start with `deno run -A -r https://fresh.deno.dev my-app` — you'll be running in minutes.
