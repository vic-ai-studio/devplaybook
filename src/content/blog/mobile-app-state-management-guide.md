---
title: "Mobile App State Management: Redux vs Zustand vs Jotai"
description: "Complete comparison of React Native state management in 2026: Redux Toolkit, Zustand, Jotai, React Query for server state, AsyncStorage persistence, and a decision guide for choosing the right tool."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: [react-native, state-management, redux, zustand, jotai, mobile]
readingTime: "9 min read"
category: "mobile"
---

# Mobile App State Management: Redux vs Zustand vs Jotai

State management in React Native has fragmented into a rich ecosystem. Redux Toolkit remains relevant for complex enterprise apps, Zustand has become the pragmatic default for most projects, and Jotai offers an atomic model that shines for fine-grained reactivity. Meanwhile, React Query handles server state so well that it removes entire categories of state from your client stores.

This guide compares all three approaches with side-by-side code, covers server state separately, and ends with a decision guide.

## Redux Toolkit: Still Relevant in 2026

Redux earned its reputation as over-engineered for many use cases. Redux Toolkit (RTK) addressed the boilerplate problem dramatically — it's now the only Redux approach worth considering. RTK is still the right choice for large teams, complex state with many interactions, and apps that need time-travel debugging and a strict unidirectional data flow.

```javascript
// store/slices/cartSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartState {
  items: CartItem[];
  total: number;
}

const cartSlice = createSlice({
  name: 'cart',
  initialState: { items: [], total: 0 } as CartState,
  reducers: {
    addItem(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload); // Immer handles immutability
      state.total += action.payload.price;
    },
    removeItem(state, action: PayloadAction<string>) {
      state.items = state.items.filter(i => i.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
      state.total = 0;
    },
  },
});

export const { addItem, removeItem, clearCart } = cartSlice.actions;
export default cartSlice.reducer;
```

```javascript
// Usage in component
import { useSelector, useDispatch } from 'react-redux';
import { addItem } from '../store/slices/cartSlice';

const ProductCard = ({ product }) => {
  const dispatch = useDispatch();
  const cartCount = useSelector(state => state.cart.items.length);

  return (
    <TouchableOpacity onPress={() => dispatch(addItem(product))}>
      <Text>Add to Cart ({cartCount})</Text>
    </TouchableOpacity>
  );
};
```

RTK Query (built into Redux Toolkit) is excellent for server state with caching, but React Query is more flexible and widely used outside the Redux ecosystem.

**When to use Redux Toolkit:** Large teams (5+ engineers), complex state interactions between many slices, need for Redux DevTools time-travel, migrating an existing Redux app.

## Zustand: Lightweight and Pragmatic

Zustand has become the default for most new React Native projects. It has zero dependencies, weighs under 1KB, requires no Provider wrapper, and its API fits on one screen. The learning curve is minimal — if you understand React hooks, you understand Zustand.

```javascript
// stores/useCartStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CartStore {
  items: CartItem[];
  total: number;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      total: 0,
      addItem: (item) =>
        set(state => ({
          items: [...state.items, item],
          total: state.total + item.price,
        })),
      removeItem: (id) =>
        set(state => ({
          items: state.items.filter(i => i.id !== id),
          total: state.total - (state.items.find(i => i.id === id)?.price ?? 0),
        })),
      clearCart: () => set({ items: [], total: 0 }),
    }),
    {
      name: 'cart-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

```javascript
// Usage — no Provider needed, works anywhere
const ProductCard = ({ product }) => {
  const addItem = useCartStore(state => state.addItem);
  const cartCount = useCartStore(state => state.items.length);

  return (
    <TouchableOpacity onPress={() => addItem(product)}>
      <Text>Add to Cart ({cartCount})</Text>
    </TouchableOpacity>
  );
};
```

The `persist` middleware handles AsyncStorage serialization automatically. Notice the selector pattern `state => state.items.length` — this component only re-renders when the cart count changes, not when other cart properties update.

**When to use Zustand:** Most new projects, small to medium teams, when you want minimal setup with enough power for real apps, when Redux feels heavy for the use case.

## Jotai: Atomic State for Fine-Grained Reactivity

Jotai takes inspiration from Recoil and the React `useState` model. State is broken into atoms — the smallest units of state — and components subscribe only to the atoms they use. This eliminates unnecessary re-renders at a granular level without manual selector optimization.

```javascript
// atoms/cartAtoms.ts
import { atom } from 'jotai';
import { atomWithStorage } from 'jotai/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Primitive atom
export const cartItemsAtom = atomWithStorage<CartItem[]>(
  'cart-items',
  [],
  {
    getItem: async (key) => {
      const val = await AsyncStorage.getItem(key);
      return val ? JSON.parse(val) : [];
    },
    setItem: async (key, value) => {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    },
    removeItem: (key) => AsyncStorage.removeItem(key),
  }
);

// Derived atom (computed, like a selector)
export const cartTotalAtom = atom(
  (get) => get(cartItemsAtom).reduce((sum, item) => sum + item.price, 0)
);

// Write atom (action)
export const addItemAtom = atom(
  null,
  (get, set, item: CartItem) => {
    set(cartItemsAtom, [...get(cartItemsAtom), item]);
  }
);
```

```javascript
// Usage
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

const CartTotal = () => {
  const total = useAtomValue(cartTotalAtom); // read-only
  return <Text>Total: ${total.toFixed(2)}</Text>;
};

const ProductCard = ({ product }) => {
  const addItem = useSetAtom(addItemAtom); // write-only
  return (
    <TouchableOpacity onPress={() => addItem(product)}>
      <Text>Add to Cart</Text>
    </TouchableOpacity>
  );
};
```

`CartTotal` only re-renders when `cartTotalAtom` changes. `ProductCard` never re-renders from state changes at all — it only dispatches writes. This granularity is powerful for performance-sensitive UIs.

**When to use Jotai:** Complex UIs with many independent state subscriptions, when you want automatic fine-grained reactivity without manual selector optimization, apps that already use an atomic mental model.

## React Query: Server State is Different

Server state — data fetched from APIs — has fundamentally different characteristics from local UI state: it can become stale, it's shared between components, and it needs background refresh, optimistic updates, and error handling. Mixing server state into Redux or Zustand creates maintenance complexity. React Query (TanStack Query) handles it correctly:

```javascript
// hooks/useProducts.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchProducts, createProduct } from '../api/products';

export const useProducts = () =>
  useQuery({
    queryKey: ['products'],
    queryFn: fetchProducts,
    staleTime: 5 * 60 * 1000, // 5 minutes before background refetch
    gcTime: 10 * 60 * 1000,   // 10 minutes before cache is garbage collected
  });

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
```

React Query caches responses, deduplicates identical in-flight requests, refetches on app focus, and handles loading/error states with clean typings. For React Native, configure the `focusManager` to use AppState instead of the browser's focus events:

```javascript
import { focusManager } from '@tanstack/react-query';
import { AppState } from 'react-native';

AppState.addEventListener('change', status => {
  focusManager.setFocused(status === 'active');
});
```

## AsyncStorage for Persistence

Both Zustand and Jotai integrate with AsyncStorage for persistence. For more complex persistence needs (relationships, indexing, offline-first), consider MMKV (synchronous, 10x faster than AsyncStorage) or WatermelonDB (full SQLite-backed offline database).

```javascript
// MMKV with Zustand — synchronous reads (no await needed)
import { MMKV } from 'react-native-mmkv';
import { StateStorage } from 'zustand/middleware';

const mmkvStorage = new MMKV();

const zustandMMKVStorage: StateStorage = {
  getItem: (name) => mmkvStorage.getString(name) ?? null,
  setItem: (name, value) => mmkvStorage.set(name, value),
  removeItem: (name) => mmkvStorage.delete(name),
};
```

MMKV's synchronous API eliminates the async waterfall that AsyncStorage introduces during app startup, making it the best choice for persisted app state that needs to be available immediately.

## Side-by-Side Comparison

| Feature | Redux Toolkit | Zustand | Jotai |
|---|---|---|---|
| Bundle size | ~47KB | ~1KB | ~3KB |
| Boilerplate | Medium (RTK helps) | Minimal | Minimal |
| Learning curve | High | Low | Medium |
| DevTools | Excellent | Good | Good |
| Re-render control | Manual selectors | Selectors | Automatic (atomic) |
| Provider required | Yes | No | Yes (Provider optional) |
| TypeScript | Excellent | Excellent | Excellent |
| Best for | Large teams, complex state | Most projects | Fine-grained subscriptions |

## Decision Guide

**Use Redux Toolkit if:**
- Your team already knows Redux and has existing Redux code
- You have complex state machines with many cross-slice interactions
- Time-travel debugging and Redux DevTools are important
- You're building a large enterprise app with 5+ engineers

**Use Zustand if:**
- You're starting a new project and want minimal setup
- Your team is small (1–4 engineers)
- You want the pragmatic choice that scales from simple to complex
- You don't need atomic granularity

**Use Jotai if:**
- Your UI has many independent pieces of state with complex interdependencies
- You want automatic fine-grained re-render optimization without manual selectors
- You're building data-heavy dashboards or real-time UIs

**Always use React Query for server state**, regardless of which client state solution you pick. The two solve different problems and work well together.
