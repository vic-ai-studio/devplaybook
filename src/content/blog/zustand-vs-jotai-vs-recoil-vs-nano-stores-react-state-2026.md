---
title: "Zustand vs Jotai vs Recoil vs Nano Stores: React State Management 2026"
description: "Deep comparison of Zustand, Jotai, Recoil, and Nano Stores for React state management in 2026 — bundle size, boilerplate, TypeScript, devtools, performance, and real code examples."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["react", "state-management", "zustand", "jotai", "recoil", "nano-stores", "typescript"]
readingTime: "13 min read"
---

Redux is no longer the default choice for React state management. In 2026, a new generation of lightweight libraries has taken over: Zustand, Jotai, Recoil, and Nano Stores. Each tackles the same problem — sharing state between components without prop drilling — but with fundamentally different mental models.

This guide compares all four in depth: bundle size, API design, TypeScript support, devtools, performance characteristics, and the scenarios where each shines.

---

## The Lightweight State Library Landscape

Before diving in, let's understand what problem these libraries solve — and what they don't.

**Client-side UI state** (modal open/closed, form values, selected tab) is what these libraries handle. If your data comes from a server, you want a data-fetching library like TanStack Query or SWR instead — using a global store for server data leads to cache management headaches.

The sweet spot for these libraries:
- Auth state (is the user logged in?)
- UI preferences (theme, sidebar collapsed)
- Multi-step wizard state
- Shopping cart contents
- Real-time WebSocket data
- Cross-component selection state

---

## Zustand

Zustand ("state" in German) is the most widely adopted lightweight state library in React today. It uses a single store with a simple `set` function and has almost no boilerplate.

### Setup and Basic Usage

```tsx
import { create } from 'zustand';

interface CartState {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

const useCartStore = create<CartState>((set, get) => ({
  items: [],
  total: 0,
  addItem: (item) =>
    set((state) => ({
      items: [...state.items, item],
      total: state.total + item.price,
    })),
  removeItem: (id) =>
    set((state) => {
      const item = state.items.find((i) => i.id === id);
      return {
        items: state.items.filter((i) => i.id !== id),
        total: state.total - (item?.price ?? 0),
      };
    }),
  clearCart: () => set({ items: [], total: 0 }),
}));

// In a component
function CartButton() {
  const { items, addItem } = useCartStore();
  return <button onClick={() => addItem(newItem)}>Add ({items.length})</button>;
}
```

No providers. No reducers. No action creators. Just a store and a hook.

### Selective Subscriptions for Performance

Zustand components only re-render when the selected slice changes:

```tsx
// Only re-renders when items.length changes — not on total changes
const itemCount = useCartStore((state) => state.items.length);

// Only re-renders when total changes
const total = useCartStore((state) => state.total);

// Subscribe to multiple values efficiently
const { items, total } = useCartStore(
  (state) => ({ items: state.items, total: state.total }),
  shallow  // shallow equality check to avoid unnecessary re-renders
);
```

### Middleware

Zustand has a rich middleware ecosystem:

```tsx
import { create } from 'zustand';
import { persist, devtools, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

const useStore = create<State>()(
  devtools(
    persist(
      immer((set) => ({
        count: 0,
        increment: () => set((state) => { state.count += 1; }),
      })),
      { name: 'my-store' }  // localStorage key
    )
  )
);
```

The `persist` middleware handles localStorage/sessionStorage serialization. `immer` lets you write mutable-style updates. `devtools` integrates with Redux DevTools.

### Async Actions

Async actions are just regular functions in Zustand — no thunks, no sagas:

```tsx
const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: false,
  fetchUser: async (id: string) => {
    set({ isLoading: true });
    try {
      const user = await fetchUser(id);
      set({ user, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
    }
  },
}));
```

---

## Jotai

Jotai ("state" in Japanese) takes an atomic approach. Instead of one store, you define small pieces of state called atoms. This maps well to React's component model and eliminates the need for selectors.

### Setup and Basic Usage

```tsx
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';

// Define atoms
const countAtom = atom(0);
const userAtom = atom<User | null>(null);

// In components
function Counter() {
  const [count, setCount] = useAtom(countAtom);
  return (
    <button onClick={() => setCount(c => c + 1)}>
      Count: {count}
    </button>
  );
}

// Read-only — no re-render on write
function DisplayCount() {
  const count = useAtomValue(countAtom);
  return <span>{count}</span>;
}

// Write-only — no re-render on value change
function IncrementButton() {
  const setCount = useSetAtom(countAtom);
  return <button onClick={() => setCount(c => c + 1)}>+</button>;
}
```

The `useAtomValue` / `useSetAtom` split is a Jotai pattern for minimizing re-renders: components that only write don't re-render when the value changes.

### Derived Atoms

Jotai's killer feature is derived atoms — computed values that update reactively:

```tsx
const itemsAtom = atom<CartItem[]>([]);
const totalAtom = atom((get) => {
  return get(itemsAtom).reduce((sum, item) => sum + item.price, 0);
});

const filteredItemsAtom = atom((get) => {
  const items = get(itemsAtom);
  const filter = get(filterAtom);
  return items.filter(item => item.category === filter);
});
```

Derived atoms automatically update when their dependencies change — similar to computed values in Vue or MobX.

### Async Atoms

Jotai handles async natively with `atomWithQuery` or Suspense-compatible atoms:

```tsx
import { atom } from 'jotai';
import { atomWithQuery } from 'jotai-tanstack-query';

const userIdAtom = atom(1);

const userAtom = atomWithQuery((get) => ({
  queryKey: ['user', get(userIdAtom)],
  queryFn: () => fetchUser(get(userIdAtom)),
}));

// Suspense-based usage
function UserProfile() {
  const [user] = useAtom(userAtom);
  return <div>{user.name}</div>; // Throws a promise until resolved
}
```

### Atom Families

For dynamic sets of atoms (e.g., per-item state in a list):

```tsx
import { atomFamily } from 'jotai/utils';

const todoAtomFamily = atomFamily((id: string) => atom<Todo | null>(null));

function TodoItem({ id }: { id: string }) {
  const [todo, setTodo] = useAtom(todoAtomFamily(id));
  // ...
}
```

### Persistence

```tsx
import { atomWithStorage } from 'jotai/utils';

const themeAtom = atomWithStorage('theme', 'light'); // auto syncs with localStorage
```

---

## Recoil

Recoil is Facebook's (Meta's) atomic state library. It pioneered the atom/selector pattern that Jotai later refined. However, as of 2026, Recoil's maintenance status is uncertain — Meta has significantly slowed down active development.

### Setup

Recoil requires a `RecoilRoot` provider:

```tsx
import { RecoilRoot } from 'recoil';

function App() {
  return (
    <RecoilRoot>
      <MyApp />
    </RecoilRoot>
  );
}
```

### Atoms and Selectors

```tsx
import { atom, selector, useRecoilState, useRecoilValue } from 'recoil';

const cartItemsAtom = atom<CartItem[]>({
  key: 'cartItems',
  default: [],
});

const cartTotalSelector = selector({
  key: 'cartTotal',
  get: ({ get }) => {
    const items = get(cartItemsAtom);
    return items.reduce((sum, item) => sum + item.price, 0);
  },
});

function CartTotal() {
  const total = useRecoilValue(cartTotalSelector);
  return <span>${total.toFixed(2)}</span>;
}
```

Recoil requires a unique string `key` for every atom and selector — a common source of errors in large codebases.

### Async Selectors

Recoil supports Suspense-based async selectors:

```tsx
const userSelector = selector({
  key: 'user',
  get: async ({ get }) => {
    const id = get(userIdAtom);
    return await fetchUser(id);
  },
});
```

---

## Nano Stores

Nano Stores is framework-agnostic and the smallest option in this comparison. It works with React, Vue, Svelte, Solid, and vanilla JS. The API is minimal by design.

### Setup and Basic Usage

```tsx
import { atom, map, computed } from 'nanostores';
import { useStore } from '@nanostores/react';

// Primitive value
const countStore = atom(0);

// Object store (for mutable objects)
const userStore = map({
  name: '',
  email: '',
  role: 'user' as const,
});

// Computed store
const isAdminStore = computed(userStore, user => user.role === 'admin');

function Counter() {
  const count = useStore(countStore);
  return (
    <button onClick={() => countStore.set(count + 1)}>
      Count: {count}
    </button>
  );
}
```

### Mutations

Nano Stores values are mutated by calling methods on the store:

```tsx
// Set the whole value
countStore.set(42);

// Map stores have setKey for partial updates
userStore.setKey('name', 'Alice');

// Or set the whole object
userStore.set({ name: 'Alice', email: 'alice@example.com', role: 'admin' });
```

### Cross-Framework Sharing

The standout feature: the same store works in React, Vue, and Svelte. If you're building a micro-frontend or using islands architecture (Astro), Nano Stores is uniquely suited.

```tsx
// React
import { useStore } from '@nanostores/react';
const count = useStore(countStore);

// Vue
import { useStore } from '@nanostores/vue';
const count = useStore(countStore);

// Svelte
import { readable } from 'nanostores/readable';
// Use $countStore directly in templates
```

---

## Side-by-Side Comparison

| Feature | Zustand | Jotai | Recoil | Nano Stores |
|---|---|---|---|---|
| **Bundle size** | ~1.1 KB (gzip) | ~2.4 KB (gzip) | ~21 KB (gzip) | ~<1 KB (gzip) |
| **Mental model** | Single store + actions | Atoms (bottom-up) | Atoms + Selectors | Atom stores |
| **Boilerplate** | Low | Very low | Medium (required keys) | Very low |
| **TypeScript** | Excellent | Excellent | Good | Good |
| **Devtools** | Redux DevTools (middleware) | Jotai DevTools | Recoil DevTools | None |
| **Persistence** | `persist` middleware | `atomWithStorage` | Custom | `persistentAtom` |
| **Async support** | Manual in actions | `atomWithQuery` / Suspense | Async selectors | Manual |
| **Framework support** | React only | React only | React only | React, Vue, Svelte, Solid |
| **SSR support** | Good (with hydration) | Good | Limited | Good |
| **Maintenance** | Very active | Very active | Slowing (Meta) | Active |
| **Learning curve** | Low | Low-medium | Medium | Very low |
| **Best for** | Most apps | Atomic/granular state | Legacy projects | Multi-framework, Astro |

---

## Performance: What Actually Matters

All four libraries are fast enough for typical apps. The performance differences become meaningful at scale — 100+ stores, 1000+ list items, or frequent updates.

**Zustand** with selector subscriptions and `shallow` comparisons performs well. Each component subscribes to exactly the slice it needs.

**Jotai** excels at granular updates. Because each atom is independent, a change to `itemsAtom` doesn't re-render components subscribed only to `filterAtom`. This atom isolation is a real performance advantage for complex UIs.

**Recoil** has similar theoretical performance to Jotai but has historically had more overhead in practice. The required string keys add cognitive load.

**Nano Stores** has the smallest runtime footprint and excellent performance for simple use cases, but lacks the granular subscription control of Jotai.

### Avoiding Common Re-render Traps

**Zustand:** Always use selectors. Never subscribe to the whole store:

```tsx
// Bad — re-renders on ANY store change
const store = useCartStore();

// Good — re-renders only when items changes
const items = useCartStore((state) => state.items);
```

**Jotai:** Use `useAtomValue` for read-only and `useSetAtom` for write-only:

```tsx
// Only re-renders when count changes
const count = useAtomValue(countAtom);

// Never re-renders (write-only)
const setCount = useSetAtom(countAtom);
```

---

## TypeScript Integration

### Zustand TypeScript

Zustand's TypeScript support is straightforward — define your interface, pass it as a generic:

```tsx
interface BearState {
  bears: number;
  increase: (by: number) => void;
  reset: () => void;
}

const useBearStore = create<BearState>()((set) => ({
  bears: 0,
  increase: (by) => set((state) => ({ bears: state.bears + by })),
  reset: () => set({ bears: 0 }),
}));
```

The `()()` curried syntax is required when using middleware with TypeScript.

### Jotai TypeScript

Jotai infers types from the atom's initial value:

```tsx
const countAtom = atom(0);         // Atom<number>
const userAtom = atom<User | null>(null); // Atom<User | null>

// Derived atom types are inferred
const doubleAtom = atom((get) => get(countAtom) * 2); // Atom<number>
```

---

## SSR and Next.js

### Zustand with Next.js

For SSR, Zustand recommends creating the store inside the request (not as a singleton) to avoid state leaking between requests:

```tsx
import { createStore } from 'zustand';
import { useStore as useZustandStore } from 'zustand';
import { createContext, useContext, useRef } from 'react';

const StoreContext = createContext(null);

export function StoreProvider({ children, initialState }) {
  const storeRef = useRef(null);
  if (!storeRef.current) {
    storeRef.current = createStore((set) => ({
      ...initialState,
      // actions...
    }));
  }
  return (
    <StoreContext.Provider value={storeRef.current}>
      {children}
    </StoreContext.Provider>
  );
}
```

### Jotai with Next.js

Jotai provides `<Provider>` for SSR isolation:

```tsx
import { Provider, createStore } from 'jotai';

function App({ initialState }) {
  const store = createStore();
  store.set(userAtom, initialState.user);

  return <Provider store={store}>{children}</Provider>;
}
```

---

## When to Use Each

### Choose Zustand when:
- You want a simple, battle-tested solution with minimal setup
- You need middleware (persist, devtools, immer)
- Your team is coming from Redux and prefers a store+actions model
- You're building a medium-to-large React app

### Choose Jotai when:
- Your state is naturally granular (many small pieces that compose)
- You want to co-locate state near the components that use it
- You need Suspense-compatible async state
- You care about minimizing re-renders in a component-heavy UI

### Choose Recoil when:
- You're maintaining an existing Recoil codebase
- You're on a Meta/Facebook tech stack
- (For new projects in 2026: consider Jotai instead — same model, better maintenance)

### Choose Nano Stores when:
- You're building for multiple frameworks (Astro islands, micro-frontends)
- You need the absolute smallest bundle size
- Your state management needs are simple

---

## Migration Path from Redux

If you're coming from Redux, Zustand is the most natural migration. The concepts map directly:

| Redux | Zustand |
|-------|---------|
| Store + `createSlice` | `create<State>()` |
| Reducer + actions | Functions in `create` |
| `useSelector` | Selector function in `useStore` |
| `useDispatch` | Functions directly from `useStore` |
| Thunks | Async functions in `create` |
| Redux DevTools | `devtools` middleware |

---

## Practical Bundle Impact

For a production app that uses Zustand with persist + devtools (dev only):

```
zustand: ~1.1 KB
zustand/middleware (persist + devtools): ~2.1 KB
Total: ~3.2 KB gzip
```

Compare to Redux Toolkit's ~9 KB + React-Redux's ~5 KB = ~14 KB for a minimal Redux setup.

The difference matters on mobile connections and low-powered devices. For a 3G connection, 14 KB vs 3 KB can mean a noticeable difference in initial load time.

---

## The Verdict in 2026

**Zustand** is the default pick for most React apps. It has the best balance of simplicity, features, and ecosystem maturity.

**Jotai** is the right choice when your state is atomic by nature — many small, independent pieces that derive from each other. It's especially well-suited for apps with complex UI state that changes at a fine-grained level.

**Recoil** is not recommended for new projects. Meta's reduced maintenance investment means bugs may not get fixed and new React features may not be supported promptly. If you're on Recoil, consider migrating to Jotai — the mental model is nearly identical.

**Nano Stores** is the right pick for multi-framework projects and Astro-based sites where state needs to cross framework boundaries.

For most teams starting fresh in 2026: **Zustand** for global UI state, **TanStack Query** (or SWR) for server state. That combination covers 90% of React state management needs with minimal boilerplate and excellent TypeScript support.

---

## Quick Start

```bash
# Zustand
npm install zustand

# Jotai
npm install jotai

# Recoil
npm install recoil

# Nano Stores
npm install nanostores @nanostores/react
```

Explore live examples and compare these libraries interactively in the [React state playground](/tools/react-playground).
