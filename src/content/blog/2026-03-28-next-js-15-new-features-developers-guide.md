---
title: "Next.js 15 New Features: What Developers Need to Know"
description: "A complete guide to Next.js 15's biggest changes: Turbopack stable, breaking caching behavior, React 19 support, partial prerendering, and App Router improvements every developer must understand."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: [nextjs, react, frontend, web-development, turbopack, app-router]
readingTime: "8 min read"
---

Next.js 15 landed with several changes that genuinely shift how you build applications — not just incremental additions, but a few decisions that will break existing apps if you upgrade without reading the changelog. This guide cuts through the noise and covers what actually matters: Turbopack going stable, a fundamental rethink of caching behavior, React 19 integration, and partial prerendering moving closer to production-ready.

## Turbopack Is Now Stable (And What Actually Changed)

After years of "coming soon," Turbopack is the default bundler for the Next.js development server in version 15. This is a big deal. Turbopack is written in Rust and designed to replace Webpack's role in the dev workflow.

**What you get in practice:**

- Cold start times drop significantly on large projects — teams have reported 40–70% faster initial compilation
- Hot module replacement (HMR) updates are near-instant even in codebases with hundreds of modules
- Memory usage is lower because Turbopack only processes what the current page actually needs

**What hasn't changed:** Turbopack is still dev-only in Next.js 15. Production builds still use Webpack under the hood. That consistency means your production output is unchanged — you won't see different bundle behavior between dev and prod caused by the bundler switch.

**Configuration changes:**

```js
// next.config.js — Next.js 15
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack is now the default for `next dev`
  // No extra flag needed. But you can customize it:
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
    resolveAlias: {
      // Map legacy imports to new paths
      'underscore': 'lodash',
    },
  },
}

module.exports = nextConfig
```

If you were using `--turbo` as an experimental flag before, remove it — it's no longer needed and will show a deprecation warning.

**Known gotchas:** Some Webpack plugins don't have Turbopack equivalents yet. If you use custom Webpack plugins via `webpack()` in your config, check the [Turbopack compatibility list](https://nextjs.org/docs/app/api-reference/turbopack) before upgrading.

## Caching Changes: The Breaking Part

This is where most upgrade pain comes from. Next.js 15 changes the default caching behavior for `fetch` requests and route handlers — and the change is the opposite of what you might expect.

**Before (Next.js 14):** `fetch` in Server Components was cached by default. You had to explicitly opt out with `{ cache: 'no-store' }`.

**Now (Next.js 15):** `fetch` is **not cached** by default. The default behavior is equivalent to `{ cache: 'no-store' }`. You have to opt in to caching.

```js
// Next.js 14 behavior — cached by default
const data = await fetch('https://api.example.com/posts')

// Next.js 15 — same code is now uncached
// To restore caching, you must be explicit:
const data = await fetch('https://api.example.com/posts', {
  next: { revalidate: 3600 }, // cache for 1 hour
})

// Or use the new cache() API
import { cache } from 'react'

const getPosts = cache(async () => {
  const res = await fetch('https://api.example.com/posts')
  return res.json()
})
```

**Route handlers follow the same pattern.** GET handlers were previously cached when they didn't use dynamic functions. Now they're dynamic by default:

```js
// app/api/posts/route.ts

// Next.js 15: this runs on every request (no caching)
export async function GET() {
  const posts = await db.post.findMany()
  return Response.json(posts)
}

// To opt into caching:
export const dynamic = 'force-static'
export async function GET() {
  const posts = await db.post.findMany()
  return Response.json(posts)
}
```

**Why the change?** The Next.js team found that developers were consistently confused when their data appeared stale in development. The new default — no caching unless you ask for it — is more predictable and matches how most developers expect HTTP to behave.

**Migration checklist:**
- Audit every `fetch()` call in your Server Components
- Add `{ next: { revalidate: N } }` where you want cached responses
- Check route handlers that relied on implicit caching
- Run `next build` and inspect the output — it now clearly labels routes as Static, Dynamic, or ISR

## React 19 Support

Next.js 15 ships with full React 19 support. This brings several new primitives that work seamlessly with the App Router.

### Server Actions Get a Serious Upgrade

React 19 formalizes the form action pattern, and Next.js 15 leans into it:

```tsx
// app/actions.ts
'use server'

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string
  await db.post.create({ data: { title } })
  revalidatePath('/posts')
}

// app/new-post/page.tsx
import { createPost } from '../actions'

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" type="text" required />
      <button type="submit">Create Post</button>
    </form>
  )
}
```

No `useState`, no `onSubmit`, no manual fetch calls. The form wires directly to the server action.

### useActionState Replaces useFormState

The `useFormState` hook from `react-dom` is deprecated in React 19. Use `useActionState` instead:

```tsx
'use client'

import { useActionState } from 'react'
import { createPost } from '../actions'

export function PostForm() {
  const [state, action, isPending] = useActionState(createPost, null)

  return (
    <form action={action}>
      <input name="title" type="text" />
      {state?.error && <p className="error">{state.error}</p>}
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  )
}
```

### The `use` Hook for Promises and Context

React 19 introduces `use()`, which can unwrap promises and read context inside render — including conditionally:

```tsx
import { use } from 'react'

// Unwrap a promise passed as a prop
function PostContent({ postPromise }: { postPromise: Promise<Post> }) {
  const post = use(postPromise) // suspends until resolved
  return <article>{post.content}</article>
}
```

## Partial Prerendering: Closer to Production

Partial Prerendering (PPR) was experimental in Next.js 14. In version 15 it graduates to a more stable experimental API with a cleaner mental model.

PPR lets a single route have a static shell (rendered at build time) with dynamic holes that stream in at request time — without switching the entire route to dynamic rendering.

```js
// next.config.js — enable PPR
const nextConfig = {
  experimental: {
    ppr: 'incremental', // opt in per-page rather than globally
  },
}
```

```tsx
// app/product/[id]/page.tsx
import { Suspense } from 'react'
import { StaticProductInfo } from './StaticProductInfo'
import { DynamicReviews } from './DynamicReviews'

// Mark this page as PPR
export const experimental_ppr = true

export default function ProductPage({ params }) {
  return (
    <div>
      {/* This renders at build time */}
      <StaticProductInfo id={params.id} />

      {/* This streams in dynamically per request */}
      <Suspense fallback={<ReviewsSkeleton />}>
        <DynamicReviews productId={params.id} />
      </Suspense>
    </div>
  )
}
```

The result: your page's static HTML is served from the CDN edge instantly, while the dynamic section streams in right behind it. You get the TTFB of a static page with the freshness of dynamic rendering — no compromise.

## App Router Improvements

### Parallel Routes and Interception Are More Reliable

Next.js 15 fixes a number of edge cases in parallel routes (`@slot` convention) and route interception (`(.)`, `(..)` patterns). If you were working around bugs in these features in v14, it's worth retesting — some workarounds may no longer be needed.

### `after()` for Post-Response Work

A new `after()` API lets you run code after the response has been sent to the client:

```tsx
import { after } from 'next/server'

export async function POST(request: Request) {
  const data = await request.json()
  const result = await saveToDatabase(data)

  // Schedule this to run after the response is sent
  after(async () => {
    await sendAnalyticsEvent('form_submitted', { id: result.id })
    await updateSearchIndex(result)
  })

  return Response.json({ success: true })
}
```

This is useful for analytics, cache warming, and any side effects that shouldn't delay the user's response.

### Improved TypeScript Config

Next.js 15 ships with `next.config.ts` support — your config file can now be TypeScript with full type checking:

```ts
// next.config.ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    ppr: 'incremental',
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.example.com' },
    ],
  },
}

export default nextConfig
```

## Improved Dev Tooling

The error overlay got a significant redesign. Errors now show:

- The exact source line with better context (more surrounding lines)
- A clearer distinction between server errors and client errors
- Hydration mismatch errors now show both the server-rendered HTML and the client-expected output side by side

The `next dev` output also shows a new indicator in the terminal that distinguishes between Turbopack compilation, route compilation, and server action execution — useful when debugging performance issues in development.

## Upgrading to Next.js 15

The official upgrade path uses the codemod CLI:

```bash
npx @next/codemod@canary upgrade latest
```

This handles several mechanical changes automatically: updating import paths that changed, migrating deprecated APIs, and flagging places where manual review is needed.

**What to do manually after the codemod:**

1. Review all `fetch()` calls and decide which ones need explicit caching
2. Test route handlers that previously relied on implicit GET caching
3. Update `useFormState` to `useActionState` if you're on React 19
4. Re-test any custom Webpack plugins for Turbopack compatibility

## Summary

Next.js 15's headline changes are:

| Feature | Change |
|---|---|
| Turbopack | Stable, default for `next dev` |
| Fetch caching | Opt-in instead of opt-out (breaking) |
| Route handler caching | Dynamic by default (breaking) |
| React 19 | Full support, new hooks available |
| Partial Prerendering | Incremental opt-in, more stable |
| `after()` API | Post-response side effects |
| TypeScript config | `next.config.ts` supported |

The caching changes are the main gotcha on upgrade. Spend time there first, and the rest of the migration should be straightforward.
