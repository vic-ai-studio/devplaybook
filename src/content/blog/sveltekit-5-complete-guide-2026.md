---
title: "SvelteKit 5 Complete Guide: Runes, Routing & Deployment 2026"
description: "Master SvelteKit 5 with Svelte 5 runes, file-based routing, SSR, form actions, and deployment to Vercel and Cloudflare Pages."
pubDate: 2026-03-28
tags: ["sveltekit", "svelte", "web-development", "javascript", "ssr"]
author: "DevPlaybook Team"
---

SvelteKit 5 paired with Svelte 5's rune system represents the most significant shift in the Svelte ecosystem since its inception. If you have been building with React/Next.js or Vue/Nuxt, SvelteKit offers a refreshing approach: less boilerplate, faster builds, and a compiler-first philosophy that ships minimal JavaScript to the browser. This guide walks you through everything from Svelte 5 reactivity primitives to production deployment.

## What Changed in Svelte 5

Svelte 5 rewrote its reactivity model from the ground up. The old `$:` reactive statements and `writable`/`readable` stores still work (with a compatibility flag), but the new **runes** system is the recommended path forward. Runes are special compiler-recognized functions prefixed with `$` that express reactive intent explicitly rather than implicitly.

### $state — Reactive Variables

`$state` replaces `let` declarations that Svelte 4 made reactive via the compiler magic.

```svelte
<script>
  let count = $state(0);
  let user = $state({ name: 'Alice', age: 30 });
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>

<!-- Deep reactivity works out of the box -->
<button onclick={() => user.age++}>
  Age: {user.age}
</button>
```

Unlike Svelte 4 where any top-level `let` was reactive, `$state` is explicit. This makes it easier to reason about what is reactive when reading code — and it works inside `.svelte.js` / `.svelte.ts` files too, not just `.svelte` components.

### $derived — Computed Values

`$derived` replaces `$: computedValue = expression` reactive declarations.

```svelte
<script>
  let price = $state(100);
  let quantity = $state(3);

  // Recomputes whenever price or quantity changes
  let total = $derived(price * quantity);

  // Use $derived.by for multi-line logic
  let discount = $derived.by(() => {
    if (total > 250) return total * 0.1;
    if (total > 150) return total * 0.05;
    return 0;
  });

  let finalPrice = $derived(total - discount);
</script>

<p>Total: ${finalPrice.toFixed(2)}</p>
```

### $effect — Side Effects

`$effect` replaces `$: { sideEffect() }` patterns and is closer to React's `useEffect`, but without a dependency array — Svelte tracks dependencies automatically.

```svelte
<script>
  let query = $state('');
  let results = $state([]);

  $effect(() => {
    // Runs whenever `query` changes
    if (query.length < 2) {
      results = [];
      return;
    }

    const controller = new AbortController();

    fetch(`/api/search?q=${query}`, { signal: controller.signal })
      .then(r => r.json())
      .then(data => { results = data; });

    // Cleanup runs before the next execution
    return () => controller.abort();
  });
</script>

<input bind:value={query} placeholder="Search..." />
{#each results as result}
  <div>{result.title}</div>
{/each}
```

### $props — Component Props

`$props` replaces the `export let` pattern for declaring component props.

```svelte
<script>
  // Old Svelte 4 way:
  // export let name;
  // export let greeting = 'Hello';

  // Svelte 5 runes way:
  let { name, greeting = 'Hello', ...rest } = $props();
</script>

<p>{greeting}, {name}!</p>
```

---

## SvelteKit File-Based Routing

SvelteKit uses a `src/routes/` directory where every folder maps to a URL segment. The routing conventions are powerful once internalized.

```
src/routes/
├── +page.svelte          → /
├── +layout.svelte        → shared layout for all routes
├── blog/
│   ├── +page.svelte      → /blog
│   ├── +page.server.ts   → load function (server-only)
│   └── [slug]/
│       ├── +page.svelte  → /blog/:slug
│       └── +page.server.ts
├── api/
│   └── search/
│       └── +server.ts    → /api/search (REST endpoint)
└── (auth)/               → route group (no URL segment)
    ├── login/
    │   └── +page.svelte  → /login
    └── register/
        └── +page.svelte  → /register
```

Key file conventions:
- `+page.svelte` — the page component
- `+layout.svelte` — wraps child routes with shared UI
- `+page.server.ts` — server-only load function and form actions
- `+page.ts` — universal load function (runs on server + client)
- `+server.ts` — API route handler (GET, POST, etc.)
- `+error.svelte` — error boundary for the route segment

---

## Load Functions and Server-Side Rendering

SvelteKit's SSR model revolves around `load` functions that run before the page renders.

### Server Load Functions

```typescript
// src/routes/blog/[slug]/+page.server.ts
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, fetch }) => {
  const response = await fetch(`/api/posts/${params.slug}`);

  if (!response.ok) {
    error(404, 'Post not found');
  }

  const post = await response.json();

  return { post };
};
```

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  let { data } = $props();
  // data.post is typed and available immediately (SSR)
</script>

<article>
  <h1>{data.post.title}</h1>
  <div>{@html data.post.content}</div>
</article>
```

### Universal Load Functions

When you need the load to run on both server (for initial SSR) and client (for navigation), use `+page.ts` instead:

```typescript
// src/routes/products/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, url }) => {
  const category = url.searchParams.get('category') ?? 'all';
  const products = await fetch(`/api/products?category=${category}`)
    .then(r => r.json());

  return { products, category };
};
```

### Layout Load Functions

Layouts can also have load functions. Data returned flows down to child pages.

```typescript
// src/routes/+layout.server.ts
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    user: locals.user ?? null
  };
};
```

---

## Form Actions

Form actions are SvelteKit's built-in solution for handling HTML form submissions with full progressive enhancement — they work without JavaScript and become enhanced with JS available.

```typescript
// src/routes/contact/+page.server.ts
import type { Actions } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email') as string;
    const message = data.get('message') as string;

    if (!email || !email.includes('@')) {
      return fail(422, { email, message, error: 'Invalid email address' });
    }

    if (!message || message.length < 10) {
      return fail(422, { email, message, error: 'Message too short' });
    }

    await sendEmail({ email, message });

    redirect(303, '/contact/success');
  }
};
```

```svelte
<!-- src/routes/contact/+page.svelte -->
<script>
  import { enhance } from '$app/forms';
  let { form } = $props();
</script>

<form method="POST" use:enhance>
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>
    Email
    <input name="email" type="email" value={form?.email ?? ''} required />
  </label>

  <label>
    Message
    <textarea name="message">{form?.message ?? ''}</textarea>
  </label>

  <button type="submit">Send</button>
</form>
```

The `use:enhance` action from `$app/forms` intercepts the submission, sends it via `fetch`, and updates `form` without a full page reload — all with zero boilerplate.

---

## API Routes

SvelteKit's `+server.ts` files let you build REST endpoints within the same project.

```typescript
// src/routes/api/search/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q');

  if (!query) {
    error(400, 'Missing query parameter');
  }

  const results = await searchDatabase(query);

  return json(results, {
    headers: {
      'Cache-Control': 'public, max-age=60'
    }
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const result = await createItem(body);
  return json(result, { status: 201 });
};
```

---

## Deployment

### Vercel

Vercel is the easiest deployment target for SvelteKit. Install the adapter and configure it:

```bash
npm install -D @sveltejs/adapter-vercel
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs22.x',
      // Optional: configure edge functions per route
    })
  }
};
```

Push to GitHub and import the repository in Vercel — zero additional configuration required. SvelteKit's load functions become Vercel serverless functions automatically.

### Cloudflare Pages

For globally distributed edge rendering, use the Cloudflare adapter:

```bash
npm install -D @sveltejs/adapter-cloudflare
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    })
  }
};
```

Cloudflare runs your server-side code at the edge in Workers (V8 isolates), so avoid Node.js-specific APIs. Use `platform.env` to access Cloudflare bindings like KV, D1, and R2:

```typescript
// src/routes/+page.server.ts
export const load = async ({ platform }) => {
  const value = await platform?.env?.MY_KV?.get('key');
  return { value };
};
```

### Static Adapter

For fully static sites with no server-side logic:

```bash
npm install -D @sveltejs/adapter-static
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: '404.html'
    })
  }
};
```

---

## SvelteKit vs Next.js

| Feature | SvelteKit 5 | Next.js 15 |
|---|---|---|
| Reactivity model | Runes (compiler-based) | React hooks (runtime) |
| Bundle size | Minimal (no virtual DOM) | Larger (React runtime) |
| Routing | File-based (`src/routes/`) | File-based (`app/` or `pages/`) |
| Data fetching | `load` functions | Server Components + `fetch` |
| Form handling | Form actions (built-in) | Server Actions |
| Edge support | Cloudflare adapter | Edge runtime |
| TypeScript | First-class | First-class |
| Learning curve | Low-to-medium | Medium-to-high |
| Ecosystem | Smaller but growing | Large and mature |

The biggest practical difference is mental model. Next.js 15 with React Server Components introduces a two-component-tree model that can be confusing. SvelteKit's `+page.server.ts` / `+page.svelte` split is explicit and easy to reason about: server code in `.server.ts`, client-rendered UI in `.svelte`.

SvelteKit also compiles your components into efficient imperative DOM operations with no virtual DOM diffing at runtime. For content-heavy sites, this means faster Time to Interactive and smaller JavaScript payloads.

---

## Getting Started

```bash
npm create svelte@latest my-app
cd my-app
npm install
npm run dev
```

The CLI will prompt you to choose TypeScript, ESLint, Prettier, Playwright, and Vitest — all recommended for production projects.

SvelteKit 5 with Svelte 5 runes is production-ready and represents a mature, opinionated full-stack framework. The explicit reactivity model of runes, combined with SvelteKit's clean routing conventions and zero-config deployment adapters, makes it one of the most productive stacks available in 2026 — especially for teams that value performance and simplicity over ecosystem breadth.
