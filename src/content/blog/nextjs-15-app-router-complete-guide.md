---
title: "Next.js 15 App Router Complete Guide: Server Components, Streaming & Performance"
description: "Master Next.js 15 App Router with this comprehensive guide. Learn Server Components, Streaming with Suspense, Parallel Routes, Server Actions, caching strategies, and performance optimizations."
author: "DevPlaybook Team"
date: "2026-03-27"
tags: ["nextjs", "react", "app-router", "server-components", "performance", "javascript", "web-development"]
readingTime: "12 min read"
---

# Next.js 15 App Router Complete Guide: Server Components, Streaming & Performance

Next.js 15 represents the most significant evolution of the App Router since its introduction. With refined caching defaults, enhanced Server Actions, improved Turbopack stability, and better TypeScript support, it's now the production-ready choice for serious React applications. This guide gives you everything you need to build fast, scalable apps with the App Router in 2026.

## What Changed in Next.js 15

Before diving into patterns, here are the biggest shifts in v15:

- **Caching is no longer aggressive by default** — `fetch` requests and Route Handlers are no longer cached unless you opt in
- **Turbopack** is now stable for development (`next dev --turbopack`)
- **React 19** is the supported peer dependency, bringing new hooks like `use()`, `useActionState()`, and `useOptimistic()`
- **`after()` API** — run code after a response is sent without blocking the user
- **Partial Prerendering (PPR)** — incremental adoption path for mixing static and dynamic content

```bash
npx create-next-app@latest my-app
# Select App Router when prompted
```

---

## App Router vs Pages Router: When to Choose

The App Router uses React Server Components by default, co-locates layouts with routes, and enables streaming. The Pages Router uses traditional React — every component is a Client Component.

**Use App Router when:**
- Starting a new project
- You need fine-grained data fetching at the component level
- You want streaming/progressive rendering
- You need nested layouts with persistent state

**Stick with Pages Router when:**
- Migrating a large existing app incrementally
- You rely on `getServerSideProps`/`getStaticProps` patterns and aren't ready to migrate

```
app/
├── layout.tsx          ← Root layout (always server component)
├── page.tsx            ← Home page
├── about/
│   └── page.tsx
├── blog/
│   ├── layout.tsx      ← Blog-specific layout
│   ├── page.tsx        ← Blog index
│   └── [slug]/
│       └── page.tsx    ← Dynamic blog post
└── api/
    └── route.ts        ← API Route Handler
```

---

## Server Components vs Client Components

This is the mental model that unlocks everything else in the App Router.

### Server Components (Default)

Every component in `app/` is a Server Component by default. They run only on the server — no JavaScript sent to the browser.

```tsx
// app/blog/[slug]/page.tsx
// No "use client" = Server Component

import { notFound } from 'next/navigation'
import { getPost } from '@/lib/db'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params  // params is now a Promise in Next.js 15
  const post = await getPost(slug)

  if (!post) notFound()

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.publishedAt}</p>
      <div dangerouslySetInnerHTML={{ __html: post.content }} />
    </article>
  )
}
```

**What Server Components can do:**
- Direct database queries (no API layer needed)
- Access filesystem, secrets, environment variables
- Import heavy libraries without affecting bundle size
- Fetch data directly in the component

**What they can't do:**
- Use `useState`, `useEffect`, or other hooks
- Add event listeners
- Use browser APIs

### Client Components

Add `"use client"` at the top of the file to opt into interactivity.

```tsx
// components/like-button.tsx
'use client'

import { useState } from 'react'

interface Props {
  initialCount: number
  postId: string
}

export function LikeButton({ initialCount, postId }: Props) {
  const [count, setCount] = useState(initialCount)
  const [liked, setLiked] = useState(false)

  async function handleLike() {
    if (liked) return
    setCount(c => c + 1)
    setLiked(true)
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' })
  }

  return (
    <button onClick={handleLike} disabled={liked}>
      ❤️ {count}
    </button>
  )
}
```

### The Composition Pattern

The real power comes from composing them together. Pass Server Component data as props to Client Components:

```tsx
// app/blog/[slug]/page.tsx (Server Component)
import { LikeButton } from '@/components/like-button'
import { getPost, getLikeCount } from '@/lib/db'

export default async function BlogPost({ params }: Props) {
  const { slug } = await params
  const [post, likeCount] = await Promise.all([
    getPost(slug),
    getLikeCount(slug)
  ])

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
      {/* Pass serializable data to client component */}
      <LikeButton initialCount={likeCount} postId={post.id} />
    </article>
  )
}
```

---

## Streaming with Suspense

Streaming lets you progressively render a page — send the static shell immediately, then stream in dynamic pieces as they resolve.

### Basic Streaming

```tsx
// app/dashboard/page.tsx
import { Suspense } from 'react'
import { RecentActivity } from './recent-activity'
import { Analytics } from './analytics'
import { Skeleton } from '@/components/skeleton'

export default function Dashboard() {
  return (
    <div className="dashboard">
      <h1>Dashboard</h1>

      {/* This streams in when ready */}
      <Suspense fallback={<Skeleton rows={5} />}>
        <RecentActivity />
      </Suspense>

      {/* Independent stream — doesn't block above */}
      <Suspense fallback={<Skeleton rows={3} />}>
        <Analytics />
      </Suspense>
    </div>
  )
}
```

```tsx
// app/dashboard/recent-activity.tsx (Server Component)
import { getRecentActivity } from '@/lib/db'

export async function RecentActivity() {
  // Slow query — doesn't block the rest of the page
  const activities = await getRecentActivity()

  return (
    <ul>
      {activities.map(a => (
        <li key={a.id}>{a.description}</li>
      ))}
    </ul>
  )
}
```

### loading.tsx — Automatic Suspense Boundaries

Place a `loading.tsx` file in any route folder to automatically wrap that route's `page.tsx` in a Suspense boundary:

```tsx
// app/blog/loading.tsx
export default function Loading() {
  return (
    <div className="animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-200 rounded w-full mb-2" />
      <div className="h-4 bg-gray-200 rounded w-5/6 mb-2" />
    </div>
  )
}
```

---

## Layouts and Nested Layouts

Layouts persist between navigations — they don't re-render when child routes change. This is perfect for sidebars, navigation, and persistent UI.

```tsx
// app/layout.tsx — Root layout (required)
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Navigation } from '@/components/navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: { template: '%s | My App', default: 'My App' },
  description: 'The best app ever',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navigation />
        <main>{children}</main>
      </body>
    </html>
  )
}
```

```tsx
// app/dashboard/layout.tsx — Nested layout
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 p-8">{children}</div>
    </div>
  )
}
```

---

## Parallel Routes

Parallel Routes render multiple pages simultaneously within the same layout. The classic use case: a split view or a dashboard with independently fetching panels.

```
app/
└── dashboard/
    ├── layout.tsx
    ├── page.tsx
    ├── @analytics/
    │   ├── page.tsx
    │   └── loading.tsx
    └── @users/
        ├── page.tsx
        └── loading.tsx
```

```tsx
// app/dashboard/layout.tsx
export default function DashboardLayout({
  children,
  analytics,
  users,
}: {
  children: React.ReactNode
  analytics: React.ReactNode
  users: React.ReactNode
}) {
  return (
    <div>
      {children}
      <div className="grid grid-cols-2 gap-4">
        {analytics}
        {users}
      </div>
    </div>
  )
}
```

Each slot (`@analytics`, `@users`) fetches data independently — a slow analytics query won't block the users panel.

---

## Intercepting Routes

Intercepting Routes let you render a route within the context of another route. The canonical example: clicking a photo in a feed opens a modal (intercepting route), but navigating directly to `/photos/123` opens the full page.

```
app/
├── feed/
│   └── page.tsx
├── photos/
│   └── [id]/
│       └── page.tsx        ← Full photo page
└── @modal/
    └── (.)photos/
        └── [id]/
            └── page.tsx    ← Intercepted (modal) version
```

The `(.)` prefix tells Next.js to intercept routes at the same level. Use `(..)` for one level up.

---

## Server Actions

Server Actions are async functions that run on the server, called directly from Client Components. They're the recommended way to handle form submissions and mutations.

```tsx
// app/todos/actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string

  if (!title?.trim()) {
    return { error: 'Title is required' }
  }

  await db.todo.create({ data: { title } })
  revalidatePath('/todos')
}

export async function deleteTodo(id: string) {
  await db.todo.delete({ where: { id } })
  revalidatePath('/todos')
}
```

```tsx
// app/todos/page.tsx (Server Component)
import { createTodo, deleteTodo } from './actions'
import { db } from '@/lib/db'

export default async function TodosPage() {
  const todos = await db.todo.findMany()

  return (
    <div>
      <form action={createTodo}>
        <input name="title" placeholder="New todo..." />
        <button type="submit">Add</button>
      </form>

      <ul>
        {todos.map(todo => (
          <li key={todo.id}>
            {todo.title}
            <form action={deleteTodo.bind(null, todo.id)}>
              <button type="submit">Delete</button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  )
}
```

### useActionState for Better UX

React 19's `useActionState` (formerly `useFormState`) makes handling loading/error states cleaner:

```tsx
'use client'

import { useActionState } from 'react'
import { createTodo } from './actions'

export function TodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, null)

  return (
    <form action={formAction}>
      <input name="title" disabled={isPending} />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
      {state?.error && <p className="text-red-500">{state.error}</p>}
    </form>
  )
}
```

---

## Caching in Next.js 15

Next.js 15 made a **breaking change**: caching is now opt-in, not opt-out.

### Request Memoization (automatic, within a request)

Multiple `fetch` calls to the same URL within a single render are automatically deduplicated — no change needed.

### Data Cache (persistent across requests)

```tsx
// Opt in to caching with `force-cache` or `revalidate`
const data = await fetch('https://api.example.com/data', {
  next: { revalidate: 3600 }  // Cache for 1 hour
})

// Cache indefinitely (until manually invalidated)
const data = await fetch('https://api.example.com/static', {
  cache: 'force-cache'
})

// Never cache (new default in Next.js 15)
const data = await fetch('https://api.example.com/live', {
  cache: 'no-store'
})
```

### On-Demand Revalidation

```tsx
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from 'next/cache'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { path, tag } = await req.json()

  if (path) revalidatePath(path)
  if (tag) revalidateTag(tag)

  return Response.json({ revalidated: true })
}
```

```tsx
// Tag your fetches for granular invalidation
const post = await fetch(`/api/posts/${slug}`, {
  next: { tags: [`post-${slug}`, 'posts'] }
})
```

---

## Route Handlers (API Routes)

Route Handlers replace `pages/api/` with a more flexible, web-standard API.

```tsx
// app/api/users/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const page = Number(searchParams.get('page') ?? '1')
  const limit = 20

  const users = await db.user.findMany({
    skip: (page - 1) * limit,
    take: limit,
  })

  return NextResponse.json({ users, page })
}

export async function POST(req: NextRequest) {
  const body = await req.json()

  const user = await db.user.create({ data: body })

  return NextResponse.json(user, { status: 201 })
}
```

```tsx
// app/api/users/[id]/route.ts — Dynamic route handler
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  await db.user.delete({ where: { id } })
  return new Response(null, { status: 204 })
}
```

---

## Performance Optimizations

### Image Optimization

```tsx
import Image from 'next/image'

export function Hero() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero image"
      width={1200}
      height={600}
      priority              // LCP image — load eagerly
      placeholder="blur"    // Show blurred version while loading
      blurDataURL="data:image/jpeg;base64,..."
    />
  )
}
```

### Font Optimization

```tsx
// app/layout.tsx
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
```

### `after()` — Non-blocking Side Effects

New in Next.js 15: run analytics, logging, or cleanup after the response is sent:

```tsx
import { after } from 'next/server'
import { logPageView } from '@/lib/analytics'

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  // Fires after response is sent — doesn't slow down the user
  after(async () => {
    await logPageView({ productId: id, timestamp: Date.now() })
  })

  return <ProductDisplay product={product} />
}
```

### Metadata API for SEO

```tsx
// app/blog/[slug]/page.tsx
import type { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)

  return {
    title: post.title,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [{ url: post.coverImage, width: 1200, height: 630 }],
    },
    alternates: {
      canonical: `https://mysite.com/blog/${slug}`,
    },
  }
}
```

---

## Common Mistakes to Avoid

**1. Using `"use client"` on every component**
Only leaf components that need interactivity should be Client Components. Push `"use client"` as far down the tree as possible.

**2. Forgetting `params` is a Promise in Next.js 15**
```tsx
// ❌ Wrong
export default async function Page({ params }) {
  const { slug } = params  // Will cause errors in Next.js 15

// ✅ Correct
export default async function Page({ params }) {
  const { slug } = await params
```

**3. Assuming `fetch` is cached by default**
In Next.js 15, `fetch` is `no-store` by default. Add `next: { revalidate }` or `cache: 'force-cache'` explicitly.

**4. Importing Client Components into Server Components without wrapping**
You can't import a Client Component that imports server-only code. Use the `server-only` package to guard this:
```bash
npm install server-only
```
```tsx
// lib/db.ts
import 'server-only'
// Any import of this file in a Client Component will throw at build time
```

---

## Putting It All Together: A Production Pattern

Here's a realistic product page combining multiple patterns:

```tsx
// app/products/[id]/page.tsx
import { Suspense } from 'react'
import { after } from 'next/server'
import type { Metadata } from 'next'
import { getProduct, getRelatedProducts } from '@/lib/db'
import { AddToCartButton } from '@/components/add-to-cart'
import { RelatedProducts } from './related-products'
import { ReviewSkeleton } from '@/components/skeletons'
import { Reviews } from './reviews'
import { logView } from '@/lib/analytics'
import { notFound } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProduct(id)
  if (!product) return {}

  return {
    title: product.name,
    description: product.description,
    openGraph: { images: [product.imageUrl] },
  }
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) notFound()

  after(async () => {
    await logView({ productId: id })
  })

  return (
    <div className="max-w-6xl mx-auto py-12">
      <div className="grid grid-cols-2 gap-12">
        <img src={product.imageUrl} alt={product.name} className="w-full rounded-xl" />
        <div>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl mt-4">${product.price}</p>
          <p className="mt-4 text-gray-600">{product.description}</p>
          {/* Client Component for cart interaction */}
          <AddToCartButton productId={id} />
        </div>
      </div>

      {/* Reviews stream in independently */}
      <Suspense fallback={<ReviewSkeleton />}>
        <Reviews productId={id} />
      </Suspense>

      {/* Related products stream in independently */}
      <Suspense fallback={<div>Loading related...</div>}>
        <RelatedProducts productId={id} />
      </Suspense>
    </div>
  )
}
```

---

## Migration from Pages Router

If you're migrating an existing app, you can run both routers simultaneously:

1. Keep all existing `pages/` routes — they continue to work
2. Create new routes in `app/` alongside `pages/`
3. Migrate routes incrementally, starting with simpler ones
4. Use the [official migration guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration) for `getServerSideProps` → async Server Components and `getStaticProps` → `generateStaticParams`

```tsx
// Migrate getStaticProps → generateStaticParams + async page component
// Before (pages/)
export async function getStaticProps({ params }) {
  const post = await getPost(params.slug)
  return { props: { post }, revalidate: 3600 }
}

// After (app/)
export async function generateStaticParams() {
  const posts = await getAllPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export const revalidate = 3600

export default async function PostPage({ params }) {
  const { slug } = await params
  const post = await getPost(slug)
  return <Post post={post} />
}
```

---

## Summary

Next.js 15 App Router gives you a powerful, composable system for building fast web applications:

- **Server Components** — query databases directly, zero client JS overhead
- **Streaming** — progressive rendering with Suspense for better perceived performance
- **Layouts** — persistent, nested UI without re-renders
- **Parallel + Intercepting Routes** — advanced routing patterns for modals and dashboards
- **Server Actions** — type-safe mutations without manual API routes
- **Explicit caching** — full control over what gets cached and for how long
- **`after()`** — non-blocking side effects after response delivery

The learning curve is real, but once the Server/Client Component mental model clicks, building with Next.js 15 is dramatically more productive than what came before. Start a new project, push `"use client"` as far toward the leaves as possible, and let streaming handle the rest.
