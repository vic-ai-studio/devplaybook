---
title: "React Query + Zustand: The Server/Client State Separation Pattern in 2026"
description: "Stop fighting your state management. Learn how to correctly separate server state (React Query) from client state (Zustand) in React apps. Covers the mental model, integration patterns, optimistic updates, and architecture decisions for 2026."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["react", "react-query", "zustand", "state-management", "typescript", "tanstack-query", "patterns", "frontend-architecture"]
readingTime: "12 min read"
---

Most React applications have a state management problem that isn't immediately obvious: they're treating server state and client state as the same thing, and using tools designed for one to manage the other.

Server state (data from an API) has fundamentally different characteristics than client state (UI state, user preferences, app behavior). It's asynchronous, can be stale, can fail to fetch, needs caching, and often needs to be synchronized across multiple components. Client state is synchronous, always accurate, and owned entirely by your application.

React Query handles server state. Zustand handles client state. Together, they cover every state management use case in a typical React application without the ceremony of Redux or the footguns of Context.

---

## The Mental Model

Before code, get the mental model right.

**Server state** (use React Query):
- User profile data
- Blog posts, products, messages
- Anything that comes from an API
- Anything that might be stale
- Anything that needs loading/error states

**Client state** (use Zustand):
- Is the sidebar open?
- What's in the shopping cart (not yet persisted)?
- Which modal is showing?
- The currently selected items in a multi-select
- UI preferences like theme or density
- Optimistic state that hasn't been confirmed by the server

When you mix these — putting server data in Zustand, or UI state in React Query — you create accidental complexity. Zustand data goes stale and you need manual invalidation logic. React Query becomes a global variable store that bypasses its own caching system.

---

## Setting Up Both Libraries

```bash
npm install @tanstack/react-query zustand
npm install -D @tanstack/react-query-devtools
```

Configure React Query at your app root:

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      gcTime: 5 * 60 * 1000, // 5 minutes (was cacheTime in v4)
      retry: 2,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0,
    },
  },
})

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

Create your Zustand store separately — no provider needed:

```typescript
// src/stores/ui.ts
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface UIState {
  sidebarOpen: boolean
  activeModal: string | null
  selectedItemIds: Set<string>

  // Actions
  toggleSidebar: () => void
  openModal: (id: string) => void
  closeModal: () => void
  selectItem: (id: string) => void
  deselectItem: (id: string) => void
  clearSelection: () => void
}

export const useUIStore = create<UIState>()(
  devtools(
    (set) => ({
      sidebarOpen: true,
      activeModal: null,
      selectedItemIds: new Set(),

      toggleSidebar: () =>
        set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      openModal: (id) => set({ activeModal: id }),
      closeModal: () => set({ activeModal: null }),

      selectItem: (id) =>
        set((s) => ({ selectedItemIds: new Set([...s.selectedItemIds, id]) })),

      deselectItem: (id) =>
        set((s) => {
          const next = new Set(s.selectedItemIds)
          next.delete(id)
          return { selectedItemIds: next }
        }),

      clearSelection: () => set({ selectedItemIds: new Set() }),
    }),
    { name: 'UIStore' }
  )
)
```

---

## Fetching Server State with React Query

Define query functions and hooks per data domain:

```typescript
// src/queries/users.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

// Query keys — centralize to avoid typos and enable precise invalidation
export const userKeys = {
  all: ['users'] as const,
  lists: () => [...userKeys.all, 'list'] as const,
  list: (filters: Record<string, unknown>) =>
    [...userKeys.lists(), filters] as const,
  details: () => [...userKeys.all, 'detail'] as const,
  detail: (id: string) => [...userKeys.details(), id] as const,
}

// Fetch all users
export function useUsers(filters?: { role?: string; search?: string }) {
  return useQuery({
    queryKey: userKeys.list(filters ?? {}),
    queryFn: () => api.get('/users', { params: filters }),
    staleTime: 2 * 60 * 1000, // users list can be 2 minutes stale
  })
}

// Fetch single user
export function useUser(id: string) {
  return useQuery({
    queryKey: userKeys.detail(id),
    queryFn: () => api.get(`/users/${id}`),
    enabled: !!id, // don't run if id is empty
  })
}

// Update user
export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: { id: string; name?: string; email?: string }) =>
      api.patch(`/users/${data.id}`, data),

    onSuccess: (updatedUser) => {
      // Update the specific user's cache
      queryClient.setQueryData(userKeys.detail(updatedUser.id), updatedUser)

      // Invalidate list queries (they may have stale name/email)
      queryClient.invalidateQueries({ queryKey: userKeys.lists() })
    },
  })
}
```

Use in components:

```typescript
// src/components/UserProfile.tsx
function UserProfile({ userId }: { userId: string }) {
  const { data: user, isLoading, error } = useUser(userId)
  const updateUser = useUpdateUser()

  if (isLoading) return <Skeleton />
  if (error) return <ErrorMessage error={error} />

  return (
    <div>
      <h1>{user.name}</h1>
      <button
        onClick={() => updateUser.mutate({ id: userId, name: 'New Name' })}
        disabled={updateUser.isPending}
      >
        {updateUser.isPending ? 'Saving...' : 'Update Name'}
      </button>
    </div>
  )
}
```

---

## Optimistic Updates

Optimistic updates are where React Query's design pays off. You update the cache immediately, make the API call, and roll back if it fails:

```typescript
export function useToggleTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (todo: { id: string; done: boolean }) =>
      api.patch(`/todos/${todo.id}`, { done: !todo.done }),

    // Called before the mutation fires
    onMutate: async (todo) => {
      // Cancel any in-flight refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: ['todos'] })

      // Snapshot the current value
      const previousTodos = queryClient.getQueryData(['todos'])

      // Optimistically update
      queryClient.setQueryData(['todos'], (old: Todo[] | undefined) =>
        old?.map(t => t.id === todo.id ? { ...t, done: !t.done } : t)
      )

      // Return snapshot for rollback
      return { previousTodos }
    },

    // If mutation fails, roll back to snapshot
    onError: (err, todo, context) => {
      if (context?.previousTodos) {
        queryClient.setQueryData(['todos'], context.previousTodos)
      }
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] })
    },
  })
}
```

This pattern is more code than a simple Zustand toggle, but you get automatic rollback, race condition protection (the `cancelQueries` call), and guaranteed consistency with the server after settlement.

---

## Coordinating React Query and Zustand

The most common integration point: Zustand triggers React Query invalidation.

Example — bulk delete selected items:

```typescript
// src/components/BulkActions.tsx
import { useUIStore } from '../stores/ui'
import { useDeleteItems } from '../queries/items'

function BulkActions() {
  const selectedIds = useUIStore((s) => s.selectedItemIds)
  const clearSelection = useUIStore((s) => s.clearSelection)
  const deleteItems = useDeleteItems()

  const handleBulkDelete = async () => {
    await deleteItems.mutateAsync({ ids: [...selectedIds] })
    clearSelection() // clear Zustand state after server confirms
  }

  if (selectedIds.size === 0) return null

  return (
    <div className="bulk-actions">
      <span>{selectedIds.size} selected</span>
      <button onClick={handleBulkDelete} disabled={deleteItems.isPending}>
        Delete Selected
      </button>
    </div>
  )
}
```

Zustand owns the selection state (which items are checked). React Query owns the mutation. The Zustand state clears only after the server mutation succeeds — not before, which would be premature.

---

## Shopping Cart: The Classic Edge Case

Carts are tricky because they're both client state (while building the order) and server state (once persisted). The right pattern depends on your requirements.

**Client-only cart (simpler, no server sync required):**

```typescript
// src/stores/cart.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CartItem {
  productId: string
  name: string
  price: number
  quantity: number
}

interface CartStore {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  total: () => number
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) =>
        set((s) => {
          const existing = s.items.find(i => i.productId === item.productId)
          if (existing) {
            return {
              items: s.items.map(i =>
                i.productId === item.productId
                  ? { ...i, quantity: i.quantity + 1 }
                  : i
              ),
            }
          }
          return { items: [...s.items, { ...item, quantity: 1 }] }
        }),

      removeItem: (productId) =>
        set((s) => ({ items: s.items.filter(i => i.productId !== productId) })),

      updateQuantity: (productId, quantity) =>
        set((s) => ({
          items: quantity === 0
            ? s.items.filter(i => i.productId !== productId)
            : s.items.map(i => i.productId === productId ? { ...i, quantity } : i),
        })),

      clearCart: () => set({ items: [] }),

      total: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: 'cart-storage' } // persists to localStorage
  )
)
```

On checkout, read Zustand, call the API with React Query, then clear Zustand:

```typescript
function useCheckout() {
  const { items, clearCart } = useCart()

  return useMutation({
    mutationFn: () => api.post('/orders', { items }),
    onSuccess: () => clearCart(),
  })
}
```

---

## Derived State: Combining Both Stores

Sometimes you need to derive state from both sources. Keep this in the component or a custom hook — don't try to sync Zustand with React Query:

```typescript
// Which selected items have unread notifications?
function useSelectedItemsWithNotifications() {
  const selectedIds = useUIStore((s) => s.selectedItemIds)
  const { data: notifications } = useNotifications()

  // Derive client + server state together — no sync needed
  const unreadSelectedIds = useMemo(() => {
    if (!notifications) return new Set<string>()

    const unreadItemIds = new Set(
      notifications
        .filter(n => !n.read)
        .map(n => n.itemId)
    )

    return new Set([...selectedIds].filter(id => unreadItemIds.has(id)))
  }, [selectedIds, notifications])

  return unreadSelectedIds
}
```

The key: derive at the point of use rather than syncing one store into another. Stores that watch each other create circular dependencies and race conditions.

---

## When React Query Alone Is Enough

For apps with minimal UI state — data tables, dashboards, content sites — you may not need Zustand at all. React Query's `useQuery` is often sufficient for everything:

```typescript
// Search filter state — could be Zustand, but URL is better
function UserList() {
  const [search, setSearch] = useSearchParam('q')
  const [role, setRole] = useSearchParam('role')

  const { data, isLoading } = useUsers({ search, role })

  // ...
}
```

URL state (via a library like `nuqs`) is often better than Zustand for filter/search state — it's shareable, bookmarkable, and survives page refresh. Reserve Zustand for state that shouldn't be in the URL (modals, selection state, transient UI state).

---

## Decision Framework

| State type | Tool | Example |
|---|---|---|
| API data | React Query | User profiles, posts, products |
| Modal visibility | Zustand | `isModalOpen: boolean` |
| Multi-select | Zustand | `selectedIds: Set<string>` |
| Filter/search | URL params | `?q=search&page=2` |
| Form values | React Hook Form / local state | Controlled inputs |
| Cart (pre-checkout) | Zustand + persist | Items before purchase |
| Auth state | React Query or Zustand | Depends on your auth flow |
| Theme preference | Zustand + persist | `'light' \| 'dark'` |
| Optimistic UI | React Query mutation cache | Toggling done/undone |

The separator is simple: **if the source of truth is the server, use React Query. If the source of truth is the browser, use Zustand.**

Following this split eliminates an entire class of bugs — stale server data in Zustand, redundant fetching, cache invalidation puzzles — because each tool is used for what it was designed to do.
