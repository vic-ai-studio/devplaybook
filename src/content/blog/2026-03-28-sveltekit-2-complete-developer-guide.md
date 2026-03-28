---
title: "SvelteKit 2.0 Complete Developer Guide: SSR, SSG, and Svelte 5 Runes"
description: "Complete SvelteKit 2.0 guide covering routing, SSR, SSG, Svelte 5 runes reactivity system, performance optimizations, and building real-world applications in 2026."
date: "2026-03-28"
tags: [sveltekit, svelte, ssr, ssg, web-framework, javascript]
readingTime: "12 min read"
---

SvelteKit 2.0 represents a significant maturation of what was already one of the most developer-friendly full-stack web frameworks. Paired with Svelte 5's new runes-based reactivity system, the combination delivers a framework that competes directly with Next.js and Nuxt on features while maintaining Svelte's trademark minimal boilerplate and excellent runtime performance.

This guide walks through everything you need to build production-ready applications with SvelteKit 2.0 in 2026: the file-based routing system, server-side rendering and static generation configuration, form actions, the Svelte 5 runes API, and deployment across major platforms.

## What Changed in SvelteKit 2.0

SvelteKit 2.0 is a breaking change release that cleaned up several rough edges from 1.x. The headline changes:

- **Shallow routing API** — navigate between states without adding history entries using `pushState` and `replaceState`
- **Improved preloading** — `preloadData` replaces older APIs and works more predictably with nested layouts
- **Promise unwrapping in load functions** — return a top-level promise from `load()` and SvelteKit streams the resolved value to the client
- **`$app/state` module** — replaces `$app/stores` with runes-compatible reactive state
- **Stricter type safety** — the generated `$types` module is more accurate, catching more errors at compile time

SvelteKit 2.0 requires Node 18.13 or later and works best with Svelte 5, though Svelte 4 components remain compatible during migration.

## Project Setup

Create a new SvelteKit 2.0 project using the official CLI:

```bash
npx sv create my-app
cd my-app
npm install
npm run dev
```

The `sv` CLI (the successor to `create-svelte`) scaffolds the project structure and lets you choose TypeScript, ESLint, Prettier, and testing libraries during setup. For production projects, select TypeScript — SvelteKit's type generation is one of its strongest features.

The generated project structure looks like this:

```
my-app/
  src/
    app.html          # HTML shell template
    app.d.ts          # Global type declarations
    lib/              # Shared utilities ($lib alias)
      index.ts
    routes/           # File-based routing root
      +page.svelte    # Root route (/)
      +layout.svelte  # Root layout
  static/             # Static assets
  svelte.config.js    # SvelteKit and Svelte compiler config
  vite.config.ts      # Vite bundler config
```

## File-Based Routing System

SvelteKit uses a file-based routing system rooted in `src/routes/`. The naming conventions use a `+` prefix to distinguish framework files from application code you place in the same directories.

### Route Files

| File | Purpose |
|------|---------|
| `+page.svelte` | Page component rendered for this route |
| `+page.ts` | Universal load function (runs server + client) |
| `+page.server.ts` | Server-only load function and form actions |
| `+layout.svelte` | Layout wrapping this route and all children |
| `+layout.ts` | Layout load function |
| `+layout.server.ts` | Server-only layout load |
| `+error.svelte` | Error boundary for this route segment |
| `+server.ts` | API endpoint (GET, POST, etc.) |

### Dynamic Segments and Route Groups

Dynamic segments use bracket notation:

```
src/routes/
  blog/
    [slug]/
      +page.svelte      # /blog/my-post
      +page.server.ts
  (marketing)/          # Route group — no URL segment
    about/
      +page.svelte      # /about
    pricing/
      +page.svelte      # /pricing
  [[optional]]/         # Optional parameter
    +page.svelte
  [...rest]/            # Rest parameter
    +page.svelte
```

Route groups (parentheses syntax) let you share layouts between routes without affecting the URL structure — useful for separating authenticated areas from public pages.

## Data Loading with Load Functions

Load functions are the primary mechanism for fetching data in SvelteKit. They run before the page renders and make data available as the `data` prop.

### Universal Load Functions

A `+page.ts` load function runs on the server during SSR and on the client during navigation:

```typescript
// src/routes/blog/[slug]/+page.ts
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, fetch, url }) => {
  const response = await fetch(`/api/posts/${params.slug}`);

  if (!response.ok) {
    error(404, 'Post not found');
  }

  const post = await response.json();

  return {
    post,
    title: post.title,
  };
};
```

The `fetch` provided by SvelteKit is augmented — it handles cookies correctly during SSR and deduplicates requests made in parallel load functions.

### Server-Only Load Functions

Use `+page.server.ts` when you need database access, private environment variables, or server-only logic:

```typescript
// src/routes/dashboard/+page.server.ts
import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const load: PageServerLoad = async ({ locals, cookies }) => {
  // locals is populated by hooks.server.ts
  if (!locals.user) {
    redirect(303, '/login');
  }

  const stats = await db.query.userStats.findFirst({
    where: (s) => eq(s.userId, locals.user.id),
  });

  return { stats };
};
```

### Streaming Data with Promises

SvelteKit 2.0 supports returning promises from load functions, which enables streaming:

```typescript
// src/routes/analytics/+page.server.ts
export const load: PageServerLoad = async ({ locals }) => {
  return {
    // This resolves immediately
    user: locals.user,
    // This streams in after the initial render
    analytics: db.getExpensiveAnalytics(locals.user.id),
  };
};
```

In the page component, use `{#await}` blocks to handle the streamed data:

```svelte
<!-- src/routes/analytics/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<h1>Welcome, {data.user.name}</h1>

{#await data.analytics}
  <p>Loading analytics...</p>
{:then analytics}
  <AnalyticsChart {analytics} />
{:catch error}
  <p>Failed to load analytics</p>
{/await}
```

## Form Actions

SvelteKit's form actions provide a clean, progressive-enhancement approach to mutations. Actions run server-side and work without JavaScript — the browser submits a native form POST, and SvelteKit enhances it when JS is available.

```typescript
// src/routes/posts/new/+page.server.ts
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const actions: Actions = {
  create: async ({ request, locals }) => {
    if (!locals.user) {
      return fail(401, { error: 'Unauthorized' });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const body = formData.get('body') as string;

    if (!title || title.length < 3) {
      return fail(400, {
        title,
        body,
        errors: { title: 'Title must be at least 3 characters' },
      });
    }

    const post = await db.insert(posts).values({
      title,
      body,
      authorId: locals.user.id,
    }).returning();

    redirect(303, `/posts/${post[0].slug}`);
  },

  delete: async ({ request, locals }) => {
    const formData = await request.formData();
    const postId = formData.get('postId') as string;

    await db.delete(posts).where(
      and(eq(posts.id, postId), eq(posts.authorId, locals.user.id))
    );

    return { success: true };
  },
};
```

The corresponding form component:

```svelte
<!-- src/routes/posts/new/+page.svelte -->
<script lang="ts">
  import { enhance } from '$app/forms';
  import type { ActionData } from './$types';

  let { form }: { form: ActionData } = $props();
</script>

<form method="POST" action="?/create" use:enhance>
  <label>
    Title
    <input name="title" value={form?.title ?? ''} />
    {#if form?.errors?.title}
      <span class="error">{form.errors.title}</span>
    {/if}
  </label>

  <label>
    Body
    <textarea name="body">{form?.body ?? ''}</textarea>
  </label>

  <button type="submit">Publish</button>
</form>
```

The `use:enhance` action progressively enhances the form with client-side submission, error handling, and optimistic updates — without requiring any additional JavaScript code.

## Svelte 5 Runes: The New Reactivity System

Svelte 5 replaces the implicit reactivity of `let` declarations and `$:` reactive statements with explicit runes — special compiler-recognized functions prefixed with `$`. The runes system is more predictable, works outside `.svelte` files, and aligns Svelte's mental model with other frameworks.

### $state — Reactive State

```svelte
<script lang="ts">
  // Before (Svelte 4): let count = 0;
  let count = $state(0);
  let user = $state({ name: 'Alice', role: 'admin' });
</script>

<button onclick={() => count++}>
  Count: {count}
</button>
```

`$state` creates deeply reactive state. Mutations to nested objects and arrays trigger updates:

```typescript
// This triggers reactivity — no need for reassignment
user.name = 'Bob';
```

For raw (non-reactive) state, use `$state.raw()`:

```typescript
// Large data structures you update by replacement, not mutation
let items = $state.raw(largeDataArray);
```

### $derived — Computed Values

```svelte
<script lang="ts">
  let items = $state([
    { name: 'Apple', price: 1.50, qty: 3 },
    { name: 'Bread', price: 2.99, qty: 1 },
  ]);

  // Replaces: $: total = items.reduce(...)
  let total = $derived(
    items.reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  let formattedTotal = $derived(`$${total.toFixed(2)}`);
</script>

<p>Total: {formattedTotal}</p>
```

For complex derived computations, use `$derived.by()`:

```typescript
let processedData = $derived.by(() => {
  const filtered = items.filter(item => item.qty > 0);
  const sorted = filtered.sort((a, b) => a.name.localeCompare(b.name));
  return sorted;
});
```

### $effect — Side Effects

```svelte
<script lang="ts">
  let query = $state('');
  let results = $state([]);

  // Replaces: $: { ... }
  $effect(() => {
    if (query.length > 2) {
      fetchResults(query).then(r => results = r);
    }
  });

  // Cleanup — return a function
  $effect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') query = '';
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });
</script>
```

### $props — Component Props

```svelte
<!-- Button.svelte -->
<script lang="ts">
  interface Props {
    label: string;
    variant?: 'primary' | 'secondary';
    disabled?: boolean;
    onclick?: () => void;
  }

  let {
    label,
    variant = 'primary',
    disabled = false,
    onclick,
  }: Props = $props();
</script>

<button class={variant} {disabled} {onclick}>
  {label}
</button>
```

### Sharing State with $state in .svelte.ts Files

A major benefit of runes is that reactive state works in plain TypeScript files (with the `.svelte.ts` extension):

```typescript
// src/lib/cart.svelte.ts
export class Cart {
  items = $state<CartItem[]>([]);

  total = $derived(
    this.items.reduce((sum, item) => sum + item.price * item.qty, 0)
  );

  addItem(item: CartItem) {
    const existing = this.items.find(i => i.id === item.id);
    if (existing) {
      existing.qty++;
    } else {
      this.items.push(item);
    }
  }

  removeItem(id: string) {
    this.items = this.items.filter(i => i.id !== id);
  }
}

export const cart = new Cart();
```

Import and use this singleton across components — reactivity works everywhere.

## SSR vs SSG Configuration

SvelteKit supports server-side rendering, static site generation, and client-side rendering through adapter configuration and per-route options.

### Per-Route Rendering Options

```typescript
// src/routes/blog/[slug]/+page.ts

// Opt into SSG for this route
export const prerender = true;

// Disable SSR (client-only rendering)
export const ssr = false;

// Control client-side hydration
export const csr = true;
```

### Static Site Generation

To statically generate a dynamic route, export `entries()` to tell SvelteKit which parameter values to prerender:

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { db } from '$lib/server/database';

export const prerender = true;

export async function entries() {
  const posts = await db.query.posts.findMany({
    columns: { slug: true },
  });
  return posts.map(post => ({ slug: post.slug }));
}

export const load = async ({ params }) => {
  const post = await db.query.posts.findFirst({
    where: (p) => eq(p.slug, params.slug),
  });
  return { post };
};
```

For fully static sites, use the static adapter:

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '404.html',
      precompress: true,
    }),
  },
};
```

### Hybrid Rendering

Mix SSG and SSR freely. Static pages load instantly; dynamic routes render server-side on demand:

```
src/routes/
  (static)/
    +layout.ts         # export const prerender = true;
    blog/[slug]/
      +page.svelte     # Prerendered at build time
  (dynamic)/
    dashboard/
      +page.server.ts  # SSR — authenticated, personalized
    api/
      +server.ts       # API routes — always dynamic
```

## API Routes

Create API endpoints with `+server.ts` files:

```typescript
// src/routes/api/posts/+server.ts
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const GET: RequestHandler = async ({ url, locals }) => {
  const page = Number(url.searchParams.get('page') ?? '1');
  const limit = Math.min(Number(url.searchParams.get('limit') ?? '20'), 100);

  const posts = await db.query.posts.findMany({
    limit,
    offset: (page - 1) * limit,
    orderBy: (p) => desc(p.createdAt),
  });

  return json({ posts, page, limit });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    error(401, 'Unauthorized');
  }

  const body = await request.json();
  const post = await db.insert(posts).values({
    ...body,
    authorId: locals.user.id,
  }).returning();

  return json(post[0], { status: 201 });
};
```

## SvelteKit vs Next.js vs Nuxt

| Feature | SvelteKit 2 | Next.js 15 | Nuxt 3 |
|---------|------------|------------|--------|
| Language | Svelte 5 | React 19 | Vue 3 |
| Bundle size | Smallest | Larger | Medium |
| Learning curve | Low | Medium | Low |
| SSR | Yes | Yes | Yes |
| SSG | Yes | Yes | Yes |
| Edge rendering | Yes | Yes | Yes |
| File-based routing | Yes | Yes (App Router) | Yes |
| Server components | No | Yes (RSC) | No |
| Form actions | Yes (built-in) | Server Actions | Nitro handlers |
| TypeScript | First-class | First-class | First-class |
| Build speed | Very fast | Fast (Turbopack) | Fast |
| Ecosystem | Growing | Largest | Large |

SvelteKit's main advantage is runtime performance and bundle size — Svelte compiles to vanilla JavaScript with no framework runtime. Next.js wins on ecosystem breadth and React Server Components for complex data-fetching patterns. Nuxt hits a middle ground with excellent DX for teams familiar with Vue.

Choose SvelteKit when bundle size and performance are priorities and your team is open to learning Svelte. Choose Next.js when you need the widest ecosystem and React Server Components. Choose Nuxt for Vue teams.

## Real-World Project: Building a Blog with SvelteKit 2

Let's build a minimal but complete blog to tie the concepts together.

### Database Setup

```typescript
// src/lib/server/database.ts
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema';

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
```

```typescript
// src/lib/server/schema.ts
import { text, integer, sqliteTable } from 'drizzle-orm/sqlite-core';

export const posts = sqliteTable('posts', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  body: text('body').notNull(),
  published: integer('published', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});
```

### Authentication Hook

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const handle: Handle = async ({ event, resolve }) => {
  const sessionToken = event.cookies.get('session');

  if (sessionToken) {
    const session = await db.query.sessions.findFirst({
      where: (s) => eq(s.token, sessionToken),
      with: { user: true },
    });

    if (session && session.expiresAt > new Date()) {
      event.locals.user = session.user;
    }
  }

  return resolve(event);
};
```

### Blog Index Route

```typescript
// src/routes/blog/+page.server.ts
import { db } from '$lib/server/database';

export const load = async () => {
  const posts = await db.query.posts.findMany({
    where: (p) => eq(p.published, true),
    orderBy: (p) => desc(p.createdAt),
    columns: { id: true, title: true, slug: true, createdAt: true },
  });

  return { posts };
};
```

```svelte
<!-- src/routes/blog/+page.svelte -->
<script lang="ts">
  import type { PageData } from './$types';
  let { data }: { data: PageData } = $props();
</script>

<svelte:head>
  <title>Blog</title>
</svelte:head>

<main>
  <h1>Blog</h1>
  <ul>
    {#each data.posts as post}
      <li>
        <a href="/blog/{post.slug}">
          <h2>{post.title}</h2>
          <time datetime={post.createdAt}>
            {new Date(post.createdAt).toLocaleDateString()}
          </time>
        </a>
      </li>
    {/each}
  </ul>
</main>
```

### Individual Post Route

```typescript
// src/routes/blog/[slug]/+page.server.ts
import { error } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const load = async ({ params }) => {
  const post = await db.query.posts.findFirst({
    where: (p) => and(eq(p.slug, params.slug), eq(p.published, true)),
  });

  if (!post) {
    error(404, 'Post not found');
  }

  return { post };
};
```

## Performance Optimizations

### Preloading

SvelteKit preloads data and code on hover by default. Fine-tune this behavior:

```svelte
<!-- Preload on tap/mousedown instead of hover — faster on mobile -->
<a href="/blog" data-sveltekit-preload-data="tap">Blog</a>

<!-- Disable preloading for large pages -->
<a href="/heavy-page" data-sveltekit-preload-data="off">Heavy Page</a>

<!-- Preload code only, not data -->
<a href="/dashboard" data-sveltekit-preload-code>Dashboard</a>
```

### Code Splitting

SvelteKit automatically code-splits at route boundaries. Each route loads only the JavaScript it needs. For large shared dependencies, use dynamic imports:

```typescript
// Lazy-load heavy libraries
const { Chart } = await import('chart.js');
```

### Image Optimization

Use `@sveltejs/enhanced-img` for automatic WebP conversion and responsive images:

```svelte
<script>
  import { Picture } from '@sveltejs/enhanced-img';
  import heroImage from './hero.jpg?enhanced';
</script>

<Picture
  src={heroImage}
  sizes="(max-width: 800px) 100vw, 800px"
  alt="Hero image"
/>
```

## Deployment

### Vercel

```bash
npm install -D @sveltejs/adapter-vercel
```

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter({
      runtime: 'nodejs20.x',
      regions: ['iad1'],
    }),
  },
};
```

Deploy with `vercel` CLI or connect your GitHub repository in the Vercel dashboard.

### Cloudflare Pages

```bash
npm install -D @sveltejs/adapter-cloudflare
```

```javascript
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>'],
      },
    }),
  },
};
```

Cloudflare Workers run at the edge in 300+ locations globally. Access Cloudflare platform APIs through `event.platform`:

```typescript
export const load: PageServerLoad = async ({ platform }) => {
  const kv = platform?.env?.MY_KV;
  const cached = await kv?.get('data');
  // ...
};
```

### Netlify

```bash
npm install -D @sveltejs/adapter-netlify
```

```javascript
import adapter from '@sveltejs/adapter-netlify';

export default {
  kit: {
    adapter: adapter({
      edge: false,       // true for Netlify Edge Functions
      split: false,      // true to split routes into separate functions
    }),
  },
};
```

### Node.js (Self-Hosted)

```javascript
import adapter from '@sveltejs/adapter-node';

export default {
  kit: {
    adapter: adapter({ out: 'build' }),
  },
};
```

Build and run:

```bash
npm run build
node build/index.js
```

## Conclusion

SvelteKit 2.0 with Svelte 5 runes delivers a compelling full-stack framework for 2026. The file-based routing and load function system make data fetching predictable. Form actions provide progressive enhancement without extra libraries. Svelte 5 runes bring explicit, composable reactivity that works inside and outside components. And flexible SSR/SSG configuration means you can optimize each route independently.

The framework's main investment pays off in runtime performance and bundle size. SvelteKit pages ship less JavaScript than equivalent Next.js or Nuxt applications, which matters for Core Web Vitals and mobile users on constrained networks.

For developers coming from React or Vue, the transition to Svelte takes a day or two of adjustment, after which most teams find the DX significantly smoother. The Svelte 5 runes system in particular removes one of the original points of confusion — implicit reactivity — without adding much ceremony.

Start with `npx sv create`, pick TypeScript, and you will have a working full-stack app in under ten minutes.
