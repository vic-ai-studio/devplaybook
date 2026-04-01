---
title: "SvelteKit 2 Production Guide 2026: Runes, Server Actions & Performance"
description: "Complete SvelteKit 2 production guide for 2026: Svelte 5 Runes reactivity model, server actions, universal rendering, Cloudflare/Vercel deployment, and performance optimization techniques."
date: "2026-04-01"
tags: [sveltekit, svelte, javascript, web-framework, performance]
readingTime: "14 min read"
---

# SvelteKit 2 Production Guide 2026: Runes, Server Actions & Performance

SvelteKit 2 with Svelte 5 Runes has solidified Svelte's position as the most ergonomic full-stack web framework in 2026. The Runes system replaced the implicit reactivity model with explicit, fine-grained reactivity primitives—making Svelte more predictable at scale while preserving its legendary developer experience.

This guide covers SvelteKit 2 in production: Runes reactivity, server actions, streaming, deployment, and performance patterns.

## Why SvelteKit in 2026?

**The numbers speak:**
- **No virtual DOM**: Svelte compiles to direct DOM manipulation, skipping VDOM overhead
- **Bundle sizes**: ~10–30KB for a typical SvelteKit app vs 100KB+ for React apps
- **Lighthouse scores**: 95–100 out of the box vs significant optimization required for React
- **Developer satisfaction**: Consistently top-rated in State of JS surveys

SvelteKit 2 + Svelte 5 delivers:
- **Runes**: `$state`, `$derived`, `$effect`, `$props` — explicit reactivity primitives
- **Server actions**: Form-based mutations with progressive enhancement
- **Universal rendering**: SSR, CSR, SSG, and streaming in one framework
- **Adapter ecosystem**: Deploy anywhere — Vercel, Cloudflare, Node, Deno, static

## Project Setup

```bash
# Create a new SvelteKit 2 project
npm create svelte@latest my-app
cd my-app

# Choose: SvelteKit demo app, TypeScript, ESLint, Prettier

npm install
npm run dev
```

```
my-app/
├── src/
│   ├── lib/              # Shared utilities ($lib alias)
│   ├── routes/           # File-based routing
│   │   ├── +page.svelte  # Page component
│   │   ├── +page.ts      # Universal load function
│   │   ├── +page.server.ts # Server-only load + actions
│   │   └── +layout.svelte # Layout component
│   ├── app.html          # HTML shell
│   └── app.d.ts          # Type declarations
├── static/               # Static assets
├── svelte.config.js      # SvelteKit config
└── vite.config.ts        # Vite config
```

## Svelte 5 Runes Deep Dive

Runes are the core innovation of Svelte 5. They replace Svelte 4's implicit reactive declarations (`$:`) with explicit primitives that work everywhere—components, `.svelte.ts` files, and shared modules.

### $state — Reactive State

```svelte
<!-- Counter.svelte -->
<script>
  // $state creates reactive state
  let count = $state(0);

  // Objects and arrays are deeply reactive
  let user = $state({
    name: "Alice",
    preferences: {
      theme: "dark",
      notifications: true
    }
  });

  function increment() {
    count++;
  }

  function updateTheme(theme) {
    // Nested mutation triggers reactivity
    user.preferences.theme = theme;
  }
</script>

<button onclick={increment}>
  Count: {count}
</button>

<p>Theme: {user.preferences.theme}</p>
```

### $derived — Computed Values

```svelte
<script>
  let items = $state([
    { id: 1, name: "Apple", price: 1.5, inCart: false },
    { id: 2, name: "Banana", price: 0.5, inCart: true },
    { id: 3, name: "Cherry", price: 3.0, inCart: true },
  ]);

  // $derived recalculates when dependencies change
  let cartItems = $derived(items.filter(item => item.inCart));
  let cartTotal = $derived(
    cartItems.reduce((sum, item) => sum + item.price, 0)
  );
  let formattedTotal = $derived(`$${cartTotal.toFixed(2)}`);

  function toggleCart(id) {
    const item = items.find(i => i.id === id);
    if (item) item.inCart = !item.inCart;
  }
</script>

<p>Cart: {cartItems.length} items — {formattedTotal}</p>
```

### $effect — Side Effects

```svelte
<script>
  let searchQuery = $state("");
  let results = $state([]);
  let loading = $state(false);

  // $effect runs when dependencies change
  $effect(() => {
    if (searchQuery.length < 2) {
      results = [];
      return;
    }

    loading = true;

    // Cleanup function — runs before next effect or unmount
    const controller = new AbortController();

    fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
      signal: controller.signal
    })
      .then(r => r.json())
      .then(data => {
        results = data.items;
        loading = false;
      })
      .catch(err => {
        if (err.name !== "AbortError") {
          console.error(err);
          loading = false;
        }
      });

    return () => {
      controller.abort(); // Cleanup on re-run
    };
  });
</script>
```

### $props — Component Props

```svelte
<!-- UserCard.svelte -->
<script>
  // Typed props with defaults
  let {
    name,
    email,
    role = "member",
    onEdit = () => {},
  } = $props();
</script>

<div class="card">
  <h3>{name}</h3>
  <p>{email}</p>
  <span class="badge">{role}</span>
  <button onclick={onEdit}>Edit</button>
</div>
```

```svelte
<!-- Parent usage -->
<UserCard
  name="Alice"
  email="alice@example.com"
  role="admin"
  onEdit={() => openEditModal(user)}
/>
```

### Shared Reactive State (Runes Stores)

```typescript
// src/lib/cart.svelte.ts
export function createCart() {
  let items = $state<CartItem[]>([]);

  const total = $derived(
    items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  );

  const count = $derived(
    items.reduce((sum, item) => sum + item.quantity, 0)
  );

  function add(product: Product) {
    const existing = items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      items.push({ ...product, quantity: 1 });
    }
  }

  function remove(id: string) {
    const index = items.findIndex(i => i.id === id);
    if (index >= 0) items.splice(index, 1);
  }

  return { items, total, count, add, remove };
}

export const cart = createCart();
```

```svelte
<!-- Any component can use the shared cart -->
<script>
  import { cart } from "$lib/cart.svelte.ts";
</script>

<p>Cart: {cart.count} items — ${cart.total.toFixed(2)}</p>
<button onclick={() => cart.add(product)}>Add to Cart</button>
```

## Data Loading

### Universal Load Functions

```typescript
// src/routes/products/+page.ts
// Runs on both server and client
import type { PageLoad } from "./$types";

export const load: PageLoad = async ({ fetch, params, url }) => {
  const category = url.searchParams.get("category") ?? "all";
  const page = Number(url.searchParams.get("page") ?? "1");

  const response = await fetch(`/api/products?category=${category}&page=${page}`);

  if (!response.ok) {
    throw new Error("Failed to load products");
  }

  const data = await response.json();

  return {
    products: data.items,
    total: data.total,
    page,
    category,
  };
};
```

### Server-Only Load (Access DB Directly)

```typescript
// src/routes/dashboard/+page.server.ts
// Only runs on server — can access DB, secrets, etc.
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { redirect } from "@sveltejs/kit";

export const load: PageServerLoad = async ({ locals }) => {
  // locals.user set by auth hook
  if (!locals.user) {
    redirect(302, "/login");
  }

  const [orders, metrics] = await Promise.all([
    db.orders.findMany({ where: { userId: locals.user.id }, take: 10 }),
    db.metrics.getForUser(locals.user.id),
  ]);

  return {
    user: locals.user,
    orders,
    metrics,
  };
};
```

## Server Actions

Server actions are the SvelteKit way to handle form mutations. They run on the server, support progressive enhancement, and handle validation elegantly.

```typescript
// src/routes/products/[id]/+page.server.ts
import { fail, redirect } from "@sveltejs/kit";
import { z } from "zod";
import { db } from "$lib/server/db";
import type { Actions, PageServerLoad } from "./$types";

const reviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10).max(500),
});

export const load: PageServerLoad = async ({ params }) => {
  const product = await db.products.findUnique({
    where: { id: params.id },
    include: { reviews: { orderBy: { createdAt: "desc" }, take: 10 } },
  });

  if (!product) throw new Response("Not found", { status: 404 });

  return { product };
};

export const actions: Actions = {
  // POST /products/[id]?/review
  review: async ({ request, locals, params }) => {
    if (!locals.user) {
      return fail(401, { error: "Must be logged in" });
    }

    const formData = await request.formData();
    const raw = {
      rating: formData.get("rating"),
      comment: formData.get("comment"),
    };

    const result = reviewSchema.safeParse(raw);
    if (!result.success) {
      return fail(400, {
        errors: result.error.flatten().fieldErrors,
        values: raw,
      });
    }

    await db.reviews.create({
      data: {
        productId: params.id,
        userId: locals.user.id,
        ...result.data,
      },
    });

    return { success: true };
  },
};
```

```svelte
<!-- src/routes/products/[id]/+page.svelte -->
<script>
  import { enhance } from "$app/forms";
  let { data, form } = $props();
</script>

<h1>{data.product.name}</h1>

<!-- Progressive enhancement: works without JavaScript too -->
<form method="POST" action="?/review" use:enhance>
  <div>
    <label for="rating">Rating</label>
    <select name="rating" id="rating" value={form?.values?.rating ?? ""}>
      {#each [1, 2, 3, 4, 5] as rating}
        <option value={rating}>{rating} stars</option>
      {/each}
    </select>
    {#if form?.errors?.rating}
      <p class="error">{form.errors.rating[0]}</p>
    {/if}
  </div>

  <div>
    <label for="comment">Comment</label>
    <textarea name="comment" id="comment">{form?.values?.comment ?? ""}</textarea>
    {#if form?.errors?.comment}
      <p class="error">{form.errors.comment[0]}</p>
    {/if}
  </div>

  <button type="submit">Submit Review</button>
</form>

{#if form?.success}
  <p class="success">Review submitted!</p>
{/if}
```

## Streaming and Deferred Data

SvelteKit supports streaming responses, which lets you send the page shell immediately and stream in slow data.

```typescript
// src/routes/dashboard/+page.server.ts
export const load: PageServerLoad = async () => {
  // Fast: send immediately
  const user = await db.users.findFirst();

  // Slow: don't await, stream it in
  const slowAnalytics = db.analytics.getHeavyReport(); // Promise, not awaited

  return {
    user, // Available immediately in the page
    streamed: {
      analytics: slowAnalytics, // Streams in when ready
    },
  };
};
```

```svelte
<script>
  let { data } = $props();
</script>

<!-- Renders immediately -->
<h1>Welcome, {data.user.name}</h1>

<!-- Suspense-like streaming -->
{#await data.streamed.analytics}
  <p>Loading analytics...</p>
{:then analytics}
  <AnalyticsDashboard {analytics} />
{:catch error}
  <p>Failed to load analytics</p>
{/await}
```

## Performance Optimization

### Code Splitting

SvelteKit automatically code-splits at route boundaries. For large components, use dynamic imports:

```svelte
<script>
  import { onMount } from "svelte";

  let ChartComponent = $state(null);

  onMount(async () => {
    // Dynamic import — only loads when mounted
    const module = await import("$lib/Chart.svelte");
    ChartComponent = module.default;
  });
</script>

{#if ChartComponent}
  <svelte:component this={ChartComponent} {data} />
{:else}
  <div class="chart-skeleton" />
{/if}
```

### Image Optimization

```svelte
<!-- Use srcset for responsive images -->
<img
  src="/images/hero.webp"
  srcset="/images/hero-400.webp 400w, /images/hero-800.webp 800w, /images/hero-1200.webp 1200w"
  sizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  alt="Hero image"
  loading="lazy"
  decoding="async"
/>
```

### Preloading

```svelte
<!-- Preload data on hover for instant navigation -->
<a href="/products" data-sveltekit-preload-data="hover">
  Browse Products
</a>

<!-- Eager preload: fetch immediately on page load -->
<a href="/dashboard" data-sveltekit-preload-data="eager">
  Dashboard
</a>
```

## Deployment

### Vercel Deployment

```bash
npm i -D @sveltejs/adapter-vercel
```

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

export default {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: "edge", // or "nodejs22.x"
      regions: ["iad1", "sfo1"],
    }),
  },
};
```

### Cloudflare Pages

```bash
npm i -D @sveltejs/adapter-cloudflare
```

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-cloudflare";

export default {
  kit: {
    adapter: adapter({
      routes: {
        include: ["/*"],
        exclude: ["<all>"],
      },
    }),
  },
};
```

### Node.js (Docker)

```javascript
// svelte.config.js
import adapter from "@sveltejs/adapter-node";

export default {
  kit: {
    adapter: adapter({ out: "build" }),
  },
};
```

```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./
RUN npm ci --production
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["node", "build"]
```

## SvelteKit vs Next.js vs Nuxt in 2026

| Feature | SvelteKit 2 | Next.js 15 | Nuxt 3 |
|---------|-------------|------------|--------|
| Bundle size | ~15KB | ~90KB | ~60KB |
| TypeScript | Excellent | Excellent | Excellent |
| Server actions | ✅ Native | ✅ React Server Actions | ✅ Nuxt Actions |
| Reactivity model | Runes (compile-time) | React Hooks (runtime) | Vue Composition API |
| Learning curve | Low | Medium | Medium |
| Ecosystem | Growing | Massive | Large |
| Edge deployment | ✅ All adapters | ✅ Vercel Edge | ✅ Multiple |
| Performance (TTI) | Fastest | Good | Good |

## Conclusion

SvelteKit 2 with Svelte 5 Runes is the most ergonomic full-stack framework available in 2026. The Runes system resolves the predictability issues of Svelte 4's implicit reactivity while keeping the compile-time efficiency that makes Svelte apps so fast.

For new projects where you want excellent performance, small bundle sizes, and a delightful developer experience, SvelteKit 2 is an excellent choice. The server actions system and universal rendering make it competitive with Next.js for full-stack applications.

---

*Related: [React 19 New Features](/blog/react-19-new-features-guide), [Next.js App Router Guide](/blog/nextjs-app-router), [Web Performance 2026](/blog/web-performance-core-vitals-2026)*
