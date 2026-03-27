---
title: "Zustand vs Jotai vs Recoil: React State Management Compared 2026"
description: "Compare Zustand, Jotai, and Recoil for React state management. Learn when to use each library, with performance tips and migration guidance."
pubDate: 2026-03-28
tags: ["react", "state-management", "zustand", "jotai", "javascript"]
author: "DevPlaybook Team"
---

React's ecosystem has never lacked for state management options. But in 2026, three lightweight alternatives to Redux have solidified their positions: **Zustand**, **Jotai**, and **Recoil**. Each solves a different problem, and picking the wrong one costs refactoring time. This guide cuts through the noise with real patterns, performance data, and migration guidance.

---

## The State of State Management in 2026

Redux Toolkit still holds a large share of enterprise codebases, but new projects increasingly reach for simpler solutions. The reasons are practical:

- **Bundle size matters**: Zustand ships ~3KB, Jotai ~3KB, Recoil ~21KB gzipped.
- **Boilerplate fatigue**: Developers want atoms and stores, not action types and reducers.
- **React 19 Concurrent Mode** is now the default, and all three libraries handle Suspense and transitions natively.

Let's look at each in depth.

---

## Zustand: Minimal Store, Maximum Flexibility

Zustand (German for "state") is built around a single `create` function that returns a hook. No providers, no context overhead — just a plain JavaScript object with methods.

### Basic Setup

```bash
npm install zustand
```

```tsx
// store/useCounterStore.ts
import { create } from 'zustand'

interface CounterState {
  count: number
  increment: () => void
  decrement: () => void
  reset: () => void
}

export const useCounterStore = create<CounterState>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}))
```

```tsx
// Component usage — no Provider needed
function Counter() {
  const count = useCounterStore((state) => state.count)
  const increment = useCounterStore((state) => state.increment)

  return <button onClick={increment}>{count}</button>
}
```

The selector pattern `(state) => state.count` is crucial. Components only re-render when their selected slice changes, not on any store update.

### Async Actions and Middleware

Zustand handles async naturally inside actions:

```tsx
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UserStore {
  user: User | null
  loading: boolean
  fetchUser: (id: string) => Promise<void>
}

const useUserStore = create<UserStore>()(
  devtools(
    persist(
      (set) => ({
        user: null,
        loading: false,
        fetchUser: async (id) => {
          set({ loading: true })
          try {
            const user = await api.getUser(id)
            set({ user, loading: false })
          } catch {
            set({ loading: false })
          }
        },
      }),
      { name: 'user-storage' }
    )
  )
)
```

The `persist` middleware serializes state to `localStorage` automatically. The `devtools` middleware integrates with Redux DevTools.

### Slices Pattern for Large Apps

When stores grow, split them into slices:

```tsx
// store/slices/cartSlice.ts
import { StateCreator } from 'zustand'

export interface CartSlice {
  items: CartItem[]
  addItem: (item: CartItem) => void
  removeItem: (id: string) => void
}

export const createCartSlice: StateCreator<CartSlice> = (set) => ({
  items: [],
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  removeItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
})

// store/useAppStore.ts
import { create } from 'zustand'
import { createCartSlice, CartSlice } from './slices/cartSlice'
import { createUserSlice, UserSlice } from './slices/userSlice'

type AppStore = CartSlice & UserSlice

export const useAppStore = create<AppStore>()((...args) => ({
  ...createCartSlice(...args),
  ...createUserSlice(...args),
}))
```

---

## Jotai: Atomic State for Fine-Grained Reactivity

Jotai takes a bottom-up approach. Instead of one global store, state is split into **atoms** — individual units that components subscribe to independently. This is the same mental model as Recoil, but Jotai is lighter and requires no mandatory Provider for basic use.

### Basic Atoms

```bash
npm install jotai
```

```tsx
// atoms/counterAtom.ts
import { atom } from 'jotai'

export const countAtom = atom(0)
export const doubleCountAtom = atom((get) => get(countAtom) * 2)
```

```tsx
import { useAtom, useAtomValue } from 'jotai'
import { countAtom, doubleCountAtom } from './atoms/counterAtom'

function Counter() {
  const [count, setCount] = useAtom(countAtom)
  const doubled = useAtomValue(doubleCountAtom)

  return (
    <div>
      <p>Count: {count} | Doubled: {doubled}</p>
      <button onClick={() => setCount((c) => c + 1)}>Increment</button>
    </div>
  )
}
```

`doubleCountAtom` is a **derived atom** — it recalculates whenever `countAtom` changes. Only components that consume `doubleCountAtom` re-render.

### Async Atoms with Suspense

Jotai's async atoms work natively with React Suspense:

```tsx
import { atom } from 'jotai'
import { Suspense } from 'react'

const userIdAtom = atom<string>('user-123')

const userAtom = atom(async (get) => {
  const id = get(userIdAtom)
  const res = await fetch(`/api/users/${id}`)
  return res.json()
})

function UserProfile() {
  const user = useAtomValue(userAtom) // Suspends until resolved
  return <div>{user.name}</div>
}

function App() {
  return (
    <Suspense fallback={<Spinner />}>
      <UserProfile />
    </Suspense>
  )
}
```

### Atom Families

When you need dynamic atoms (e.g., per-item state in a list), use `atomFamily`:

```tsx
import { atomFamily } from 'jotai/utils'

const todoAtomFamily = atomFamily((id: string) =>
  atom({ id, text: '', completed: false })
)

function TodoItem({ id }: { id: string }) {
  const [todo, setTodo] = useAtom(todoAtomFamily(id))
  // ...
}
```

---

## Recoil: Selector Graphs for Complex Dependencies

Recoil, originally from Meta, introduces the most sophisticated data model of the three. Its power comes from **selector graphs** — a directed acyclic graph of atoms and selectors where derived state is automatically memoized and invalidated.

### Atoms and Selectors

```bash
npm install recoil
```

```tsx
// App must be wrapped in RecoilRoot
import { RecoilRoot } from 'recoil'

function App() {
  return (
    <RecoilRoot>
      <Dashboard />
    </RecoilRoot>
  )
}
```

```tsx
import { atom, selector, useRecoilState, useRecoilValue } from 'recoil'

const cartItemsAtom = atom<CartItem[]>({
  key: 'cartItems',
  default: [],
})

const cartTotalSelector = selector({
  key: 'cartTotal',
  get: ({ get }) => {
    const items = get(cartItemsAtom)
    return items.reduce((sum, item) => sum + item.price * item.qty, 0)
  },
})

const taxSelector = selector({
  key: 'cartTax',
  get: ({ get }) => {
    const total = get(cartTotalSelector)
    return total * 0.1
  },
})
```

`taxSelector` depends on `cartTotalSelector`, which depends on `cartItemsAtom`. Recoil tracks this graph — update `cartItemsAtom` and both selectors recompute in the correct order.

### Async Selectors

```tsx
const productDetailsSelector = selectorFamily({
  key: 'productDetails',
  get: (productId: string) => async () => {
    const res = await fetch(`/api/products/${productId}`)
    return res.json()
  },
})
```

Recoil's `selectorFamily` is the equivalent of Jotai's `atomFamily`, but it participates fully in the selector graph.

---

## Performance Comparison

| Metric | Zustand | Jotai | Recoil |
|---|---|---|---|
| Bundle size (gzip) | ~3KB | ~3KB | ~21KB |
| Re-render granularity | Per selector | Per atom | Per atom/selector |
| Concurrent Mode | Yes | Yes | Yes |
| DevTools | Redux DevTools | Jotai DevTools | Built-in |
| SSR support | Yes | Yes | Partial |

**Re-render granularity** is where Jotai and Recoil shine. Because each atom is an independent subscription, a component that reads only `userNameAtom` will not re-render when `cartItemsAtom` changes — even if both atoms live in the "same" application state. Zustand achieves similar granularity through disciplined use of selectors, but it requires developer effort rather than being structural.

**Large selector graphs** (50+ interdependent derived values) are where Recoil's architecture pays off. The automatic memoization and topological evaluation order avoids wasteful recalculations that you'd have to manage manually in Zustand or Jotai.

---

## When to Use Each Library

### Choose Zustand when:

- You need a **simple global store** without much derived state
- Your team values **familiarity** — the pattern resembles Redux without the boilerplate
- You want **middleware** (logging, persistence, devtools) out of the box
- You're building a **dashboard or form-heavy app** where state is mostly flat

### Choose Jotai when:

- You want **atomic state** that co-locates with components
- Your app has **many independent pieces of state** with occasional dependencies
- You're using **React Suspense heavily** for data fetching
- You want the lightest possible bundle with a Recoil-like model

### Choose Recoil when:

- You have **complex derived state** with deep dependency chains
- You're working on a **large team** that benefits from Recoil's explicit `key` naming
- You need **fine-grained subscriptions** across many components reading overlapping state
- Your app originated from a **Meta-style architecture** (Relay, GraphQL fragments)

---

## Vs Redux Toolkit

Redux Toolkit (RTK) remains the best choice for:

- **Large enterprise codebases** with strict state change auditing requirements
- Apps that need **RTK Query** for server state with normalized caching
- Teams that **already know Redux** and want to reduce boilerplate without a migration

If you're starting fresh in 2026, the overhead of actions, reducers, and selectors in RTK is harder to justify unless you need RTK Query's normalized cache invalidation. For most new projects, Zustand covers 80% of RTK use cases at a fraction of the conceptual overhead.

---

## Vs React Query for Server State

A common mistake is using Zustand/Jotai/Recoil to cache API responses. **Server state is not client state.** Server state has different concerns: staleness, background refetching, cache invalidation, and optimistic updates.

The right separation in 2026:

```
Server state  → TanStack Query (React Query) or SWR
Client state  → Zustand, Jotai, or Recoil
```

A common pattern pairs Zustand with TanStack Query:

```tsx
// Server state: TanStack Query handles fetching, caching, revalidation
const { data: user } = useQuery({
  queryKey: ['user', userId],
  queryFn: () => fetchUser(userId),
})

// Client state: Zustand handles UI-only state
const sidebarOpen = useUIStore((state) => state.sidebarOpen)
```

Trying to replicate TanStack Query's behavior in a Zustand store leads to reinventing background refresh, stale-while-revalidate, and request deduplication — work that TanStack Query already handles.

---

## Migration Path from Redux

If you're migrating from Redux to Zustand:

1. **Identify leaf reducers** — start with the simplest ones
2. **Convert each reducer to a Zustand store slice** — actions become methods
3. **Replace `useSelector` + `useDispatch`** with the Zustand hook
4. **Remove the Redux Provider** once all stores are migrated

The slice pattern in Zustand maps cleanly to Redux slices, making incremental migration practical without a full rewrite.

---

## Summary

| | Zustand | Jotai | Recoil |
|---|---|---|---|
| Best for | Global store, familiar API | Atomic, component-local | Complex derived state |
| Learning curve | Low | Low | Medium |
| Bundle | Tiny | Tiny | Medium |
| Derived state | Manual selectors | Derived atoms | Selector graphs |
| Async | Manual + middleware | Native Suspense | Native Suspense |
| Provider required | No | Optional | Yes (RecoilRoot) |

In 2026, **Zustand** is the pragmatic default for most apps. **Jotai** is the right call when your state naturally decomposes into independent atoms and you want Suspense integration. **Recoil** justifies its larger footprint when derived state dependencies become complex enough that manual memoization would be error-prone.

Pick based on your state's shape, not hype.
