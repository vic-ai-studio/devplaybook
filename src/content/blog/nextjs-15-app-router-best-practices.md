---
title: "Next.js 15 App Router Best Practices: Server Components, Caching & Performance"
description: "Master Next.js 15 App Router: when to use Server vs Client Components, how caching works in Next.js 15, data fetching patterns, Suspense boundaries, and performance optimization strategies."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["nextjs", "react", "app-router", "server-components", "performance", "caching", "typescript"]
readingTime: "14 min read"
---

# Next.js 15 App Router Best Practices: Server Components, Caching & Performance

Next.js 15 App Router represents a fundamental shift in how React applications are structured. Server Components, the revised caching model, Partial Prerendering, and the `use cache` directive change enough that best practices from Pages Router don't directly transfer.

This guide covers what you need to know to build performant, maintainable Next.js 15 applications — including the breaking changes in how caching works compared to Next.js 13/14.

---

## The Mental Model: Server vs. Client Components

The most important decision in App Router is where each component runs.

### Server Components (Default)

Every component in `app/` is a Server Component by default. They:
- Run only on the server (never sent to the client as JavaScript)
- Can be `async` — `await` directly in JSX
- Can access server-only resources: databases, file system, environment variables
- Cannot use `useState`, `useEffect`, event handlers, or browser APIs

```tsx
// app/users/page.tsx — Server Component (no 'use client')
export default async function UsersPage() {
  const users = await db.user.findMany(); // Direct DB access, no API route needed

  return (
    <ul>
      {users.map(user => <li key={user.id}>{user.name}</li>)}
    </ul>
  );
}
```

### Client Components

Add `'use client'` at the top of the file. Client Components:
- Are included in the JavaScript bundle sent to the browser
- Support hooks, state, effects, and browser APIs
- Run on both server (for initial HTML) and client (for hydration)

```tsx
'use client';

import { useState } from 'react';

export default function Counter() {
  const [count, setCount] = useState(0);
  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;
}
```

### The Key Rule: Push Client Components Down

The goal is to minimize the "client boundary" — keep as much as possible as Server Components. A common mistake is adding `'use client'` to a layout or page because it has one interactive element, then losing Server Component benefits for the whole subtree.

**Wrong approach:**
```tsx
'use client'; // BAD: entire page becomes client component

export default async function ProductPage({ params }) {
  const product = await getProduct(params.id); // Can't do this now
  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton /> {/* This is why we added 'use client' */}
    </div>
  );
}
```

**Right approach:**
```tsx
// app/products/[id]/page.tsx — Server Component
export default async function ProductPage({ params }) {
  const product = await getProduct(params.id);
  return (
    <div>
      <h1>{product.name}</h1>
      <AddToCartButton productId={product.id} /> {/* Only this is a Client Component */}
    </div>
  );
}

// components/AddToCartButton.tsx
'use client';
export function AddToCartButton({ productId }: { productId: string }) {
  return <button onClick={() => addToCart(productId)}>Add to Cart</button>;
}
```

---

## Data Fetching Patterns

### Direct Async/Await in Server Components

This is the recommended pattern for most data fetching:

```tsx
export default async function Dashboard() {
  const [stats, recentOrders] = await Promise.all([
    getStats(),
    getRecentOrders(),
  ]);

  return <DashboardView stats={stats} orders={recentOrders} />;
}
```

Use `Promise.all` for parallel requests. Sequential `await` creates a waterfall.

### Don't Over-Use Route Handlers (API Routes)

A common mistake is creating API routes (`app/api/`) just to fetch data in Client Components. If the data is only needed for server rendering, fetch directly in Server Components:

```tsx
// ❌ Unnecessary round-trip
// Client Component → fetch('/api/users') → Route Handler → DB

// ✅ Direct fetch in Server Component
// Server Component → DB
```

API routes are appropriate for:
- Endpoints consumed by third parties or mobile apps
- Webhook handlers
- Data mutations from Client Components
- Endpoints that need different auth/caching behavior

### `cache()` for Deduplication

Next.js extends React's `cache()` to deduplicate requests within a single render:

```tsx
import { cache } from 'react';

export const getUser = cache(async (id: string) => {
  return db.user.findUnique({ where: { id } });
});

// Called in multiple Server Components — only one DB query
export default async function Page({ params }) {
  const user = await getUser(params.id);        // DB query
  const sidebar = await Sidebar({ userId: params.id }); // getUser called again
  // ...
}

async function Sidebar({ userId }) {
  const user = await getUser(userId); // Cache hit — no additional DB query
}
```

---

## Next.js 15 Caching: The Breaking Changes

Next.js 13/14 aggressively cached everything by default. This caused confusion and subtle bugs. Next.js 15 reverses this: **caches are opt-in by default**.

### What Changed

| Behavior | Next.js 13/14 | Next.js 15 |
|---|---|---|
| `fetch()` in Server Components | Cached by default | Not cached by default |
| Route Handler GET requests | Cached | Not cached |
| Client Router Cache | Cached for 30s/5m | Not cached (navigations always fresh) |

### The `use cache` Directive (Next.js 15)

The new `use cache` directive replaces `unstable_cache` and provides explicit caching control:

```tsx
// Cache a Server Component
async function ProductList() {
  'use cache';

  const products = await db.product.findMany();
  return <ul>{products.map(p => <li key={p.id}>{p.name}</li>)}</ul>;
}

// Cache a data function with tags for invalidation
async function getProducts() {
  'use cache';

  cacheTag('products');
  cacheLife('hours'); // Revalidate after 1 hour

  return db.product.findMany();
}
```

### Revalidation Strategies

**Time-based revalidation:**
```tsx
async function getData() {
  'use cache';
  cacheLife('hours'); // hourly, daily, weekly, or seconds number
  return fetch('https://api.example.com/data');
}
```

**On-demand revalidation:**
```tsx
// In a Server Action after mutation
import { revalidateTag } from 'next/cache';

export async function updateProduct(id: string, data: ProductData) {
  await db.product.update({ where: { id }, data });
  revalidateTag('products'); // Invalidate all caches tagged 'products'
  revalidateTag(`product-${id}`); // Or just this product
}
```

**Path revalidation:**
```tsx
revalidatePath('/products'); // Revalidate a specific route
revalidatePath('/products', 'layout'); // Revalidate including layouts
```

---

## Suspense Boundaries and Streaming

### Where to Put Suspense

Suspense boundaries allow parts of the page to render and stream while other parts are still loading. Place them around async components that access slow data sources:

```tsx
import { Suspense } from 'react';

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<StatsSkeleton />}>
        <Stats /> {/* Slow DB query — show skeleton while loading */}
      </Suspense>
      <Suspense fallback={<FeedSkeleton />}>
        <ActivityFeed /> {/* Another slow query — loads independently */}
      </Suspense>
    </div>
  );
}
```

Without Suspense, both `Stats` and `ActivityFeed` block the entire page. With Suspense, the page starts streaming immediately and fills in each section as data becomes available.

### `loading.tsx` — Route-Level Suspense

`app/dashboard/loading.tsx` is automatically wrapped in a Suspense boundary for the entire route. Use it for route-level loading states:

```tsx
// app/dashboard/loading.tsx
export default function DashboardLoading() {
  return <DashboardSkeleton />;
}
```

### `error.tsx` — Error Boundaries

```tsx
// app/dashboard/error.tsx
'use client';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div>
      <h2>Something went wrong</h2>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

---

## Server Actions: Form Handling and Mutations

Server Actions replace API routes for mutations in many scenarios:

```tsx
// app/products/actions.ts
'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

const CreateProductSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});

export async function createProduct(formData: FormData) {
  const parsed = CreateProductSchema.safeParse({
    name: formData.get('name'),
    price: Number(formData.get('price')),
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten() };
  }

  await db.product.create({ data: parsed.data });
  revalidatePath('/products');
  redirect('/products');
}
```

```tsx
// app/products/new/page.tsx
import { createProduct } from '../actions';

export default function NewProductPage() {
  return (
    <form action={createProduct}>
      <input name="name" placeholder="Product name" />
      <input name="price" type="number" />
      <button type="submit">Create</button>
    </form>
  );
}
```

### `useActionState` for Progressive Enhancement

```tsx
'use client';

import { useActionState } from 'react';
import { createProduct } from '../actions';

export function CreateProductForm() {
  const [state, action, isPending] = useActionState(createProduct, null);

  return (
    <form action={action}>
      <input name="name" />
      {state?.error?.fieldErrors.name && (
        <p className="error">{state.error.fieldErrors.name}</p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

---

## Performance Optimization

### Image Optimization

Always use Next.js `<Image>` for images:

```tsx
import Image from 'next/image';

<Image
  src="/hero.jpg"
  alt="Hero"
  width={1200}
  height={600}
  priority // LCP image — load eagerly
  sizes="(max-width: 768px) 100vw, 1200px"
/>
```

Key props: `priority` for LCP images, `sizes` for responsive images, `loading="lazy"` (default for non-priority).

### Font Optimization

```tsx
// app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export default function RootLayout({ children }) {
  return (
    <html className={inter.variable}>
      <body>{children}</body>
    </html>
  );
}
```

`next/font` self-hosts Google Fonts, eliminates the external network request, and prevents layout shift.

### Parallel Routes and Intercepting Routes

For dashboard layouts with independent loading states:

```
app/
  @analytics/
    page.tsx     // Loads independently
  @team/
    page.tsx     // Loads independently
  layout.tsx     // Receives both as props
```

```tsx
// app/layout.tsx
export default function Layout({
  analytics,
  team,
}: {
  analytics: React.ReactNode;
  team: React.ReactNode;
}) {
  return (
    <div>
      <Suspense fallback={<Skeleton />}>{analytics}</Suspense>
      <Suspense fallback={<Skeleton />}>{team}</Suspense>
    </div>
  );
}
```

---

## Common Mistakes to Avoid

**1. Fetching data in Client Components when Server Components suffice**

If a component only needs data for initial render and has no interactivity, keep it as a Server Component.

**2. Not using `Promise.all` for parallel requests**

Sequential awaits create avoidable waterfalls. Batch independent requests.

**3. Over-using Server Actions**

Server Actions are for mutations. For GET requests, use Server Components directly or Route Handlers.

**4. Missing revalidation after mutations**

After any mutation, call `revalidatePath` or `revalidateTag`. Without this, users see stale data.

**5. Ignoring TypeScript strict mode**

App Router's type safety is best utilized with `strict: true` in `tsconfig.json`. The type-safe `params` and `searchParams` in layouts/pages catch bugs early.

---

## Summary Table: When to Use What

| Scenario | Solution |
|---|---|
| Fetch data for initial render | `async` Server Component |
| User interaction, state | Client Component |
| Mutation (form, button) | Server Action |
| External API (webhooks, mobile) | Route Handler |
| Shared data between components | `cache()` utility |
| Time-based caching | `'use cache'` + `cacheLife()` |
| Invalidate after mutation | `revalidateTag()` / `revalidatePath()` |
| Loading skeleton | `Suspense` + fallback or `loading.tsx` |
| Error handling | `error.tsx` |

---

Next.js 15 App Router rewards careful component placement and explicit caching decisions. The investment in understanding Server vs. Client Components and the new caching model pays off in smaller bundle sizes, better performance, and code that's easier to reason about.

---

*Use our [Next.js Config Generator](/tools/next-js-config-generator) or read the [React Server Components guide](/blog) for more on RSC patterns.*
