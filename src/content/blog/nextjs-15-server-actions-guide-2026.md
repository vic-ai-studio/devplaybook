---
title: "Next.js 15 Server Actions: The Complete Guide for 2026"
description: "Master Next.js 15 Server Actions: form handling, progressive enhancement, caching, mutations, and real-world patterns. The definitive guide for 2026."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["nextjs", "server-actions", "react", "typescript", "web-development"]
readingTime: "12 min read"
---

Next.js 15 Server Actions have matured from an experimental feature into the recommended way to handle form submissions and data mutations in React applications. If you're still using API routes for every form, you're writing unnecessary boilerplate.

This guide covers everything: how Server Actions work under the hood, progressive enhancement, caching strategies, error handling, and the patterns that actually work in production.

---

## What Are Server Actions?

Server Actions are async functions that run on the server but can be called directly from client components. They're marked with the `'use server'` directive and eliminate the need for explicit API route handlers for mutations.

```typescript
// app/actions.ts
'use server'

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';

export async function createTodo(formData: FormData) {
  const title = formData.get('title') as string;

  if (!title?.trim()) {
    return { error: 'Title is required' };
  }

  const todo = await db.todo.create({
    data: { title: title.trim(), completed: false }
  });

  revalidatePath('/todos');
  return { success: true, todo };
}
```

The `formData` parameter is typed as `FormData` when the action is used in a `<form>`. When called programmatically, you can pass any serializable data.

---

## The Progressive Enhancement Model

This is the most important concept to internalize: Server Actions work **without JavaScript**. A form with a Server Action as its `action` prop submits as a standard HTML form if JS hasn't loaded yet.

```tsx
// app/todos/page.tsx
import { createTodo } from '../actions';

export default function TodoPage() {
  return (
    <form action={createTodo}>
      <input name="title" type="text" placeholder="New todo" required />
      <button type="submit">Add Todo</button>
    </form>
  );
}
```

No `onSubmit` handler. No `preventDefault`. No `fetch`. This form works on a Nokia 3310 with JavaScript disabled.

When JavaScript loads, Next.js enhances it with client-side submission — no full page reload. This is progressive enhancement done right.

---

## Form State with useActionState

Next.js 15 stabilized the `useActionState` hook (previously `useFormState`) for handling action responses and loading states.

```tsx
'use client';

import { useActionState } from 'react';
import { createTodo } from '../actions';

const initialState = { error: null, success: false };

export function TodoForm() {
  const [state, formAction, isPending] = useActionState(createTodo, initialState);

  return (
    <form action={formAction}>
      <input
        name="title"
        type="text"
        placeholder="New todo"
        disabled={isPending}
        required
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Adding...' : 'Add Todo'}
      </button>
      {state?.error && (
        <p className="text-red-500 text-sm mt-1">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-green-500 text-sm mt-1">Todo added!</p>
      )}
    </form>
  );
}
```

`useActionState` returns `[state, formAction, isPending]`. The `isPending` boolean is true while the action is in-flight — use it to disable inputs and show loading states.

The action signature changes when used with `useActionState`: it receives the previous state as the first argument.

```typescript
'use server'

export async function createTodo(
  prevState: { error: string | null; success: boolean },
  formData: FormData
) {
  const title = formData.get('title') as string;

  if (!title?.trim()) {
    return { error: 'Title is required', success: false };
  }

  try {
    await db.todo.create({ data: { title: title.trim(), completed: false } });
    revalidatePath('/todos');
    return { error: null, success: true };
  } catch {
    return { error: 'Failed to create todo', success: false };
  }
}
```

---

## Optimistic Updates with useOptimistic

For instant UI feedback, React 19's `useOptimistic` hook pairs perfectly with Server Actions.

```tsx
'use client';

import { useOptimistic, useTransition } from 'react';
import { toggleTodo } from '../actions';

interface Todo { id: string; title: string; completed: boolean; }

export function TodoList({ todos }: { todos: Todo[] }) {
  const [optimisticTodos, updateOptimistic] = useOptimistic(
    todos,
    (current, { id, completed }: { id: string; completed: boolean }) =>
      current.map(t => t.id === id ? { ...t, completed } : t)
  );
  const [isPending, startTransition] = useTransition();

  function handleToggle(todo: Todo) {
    startTransition(async () => {
      updateOptimistic({ id: todo.id, completed: !todo.completed });
      await toggleTodo(todo.id, !todo.completed);
    });
  }

  return (
    <ul className={isPending ? 'opacity-80' : ''}>
      {optimisticTodos.map(todo => (
        <li key={todo.id} onClick={() => handleToggle(todo)}>
          <input type="checkbox" checked={todo.completed} readOnly />
          <span className={todo.completed ? 'line-through' : ''}>{todo.title}</span>
        </li>
      ))}
    </ul>
  );
}
```

The UI updates immediately when the user clicks. If the Server Action fails, the optimistic update reverts automatically.

---

## Caching and Revalidation

Server Actions integrate deeply with Next.js caching. After a mutation, you need to invalidate affected cache entries.

### revalidatePath

Revalidates all cached data for a URL path:

```typescript
'use server'
import { revalidatePath } from 'next/cache';

export async function deletePost(id: string) {
  await db.post.delete({ where: { id } });
  revalidatePath('/blog');           // revalidate the blog index
  revalidatePath(`/blog/${id}`);     // revalidate the specific post page
}
```

### revalidateTag

More precise: tag-based cache invalidation. Tag your `fetch` calls and invalidate by tag.

```typescript
// In your data fetching
const posts = await fetch('/api/posts', {
  next: { tags: ['posts'] }
}).then(r => r.json());

// In your Server Action
'use server'
import { revalidateTag } from 'next/cache';

export async function createPost(formData: FormData) {
  // ... create post logic
  revalidateTag('posts'); // invalidates all fetches tagged 'posts'
}
```

### redirect

Redirect after a mutation using Next.js `redirect` — it must be called outside try/catch because it throws internally.

```typescript
'use server'
import { redirect } from 'next/navigation';

export async function createPost(formData: FormData) {
  const post = await db.post.create({ data: parsePostForm(formData) });
  redirect(`/blog/${post.slug}`); // throws, don't wrap in try/catch
}
```

---

## Error Handling Patterns

### Return errors as values

The simplest pattern — return error objects instead of throwing:

```typescript
'use server'

export async function updateProfile(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const name = formData.get('name') as string;

  if (name.length < 2) {
    return { success: false, error: 'Name must be at least 2 characters' };
  }

  try {
    await db.user.update({ where: { id: userId }, data: { name } });
    return { success: true, error: null };
  } catch (e) {
    return { success: false, error: 'Failed to update profile' };
  }
}
```

### Zod validation

For complex forms, validate with Zod before hitting the database:

```typescript
'use server'
import { z } from 'zod';

const schema = z.object({
  title: z.string().min(1, 'Title required').max(200),
  content: z.string().min(10, 'Content too short'),
  published: z.coerce.boolean(),
});

export async function createPost(prevState: any, formData: FormData) {
  const parsed = schema.safeParse({
    title: formData.get('title'),
    content: formData.get('content'),
    published: formData.get('published'),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.post.create({ data: parsed.data });
  revalidatePath('/blog');
  return { errors: null, success: true };
}
```

---

## Calling Actions Programmatically

Server Actions aren't limited to forms. Call them from event handlers, effects, or anywhere in your client components:

```tsx
'use client';

import { deleteComment } from '../actions';

export function CommentCard({ comment }: { comment: Comment }) {
  async function handleDelete() {
    if (!confirm('Delete this comment?')) return;
    await deleteComment(comment.id);
  }

  return (
    <div>
      <p>{comment.body}</p>
      <button onClick={handleDelete}>Delete</button>
    </div>
  );
}
```

---

## Security Considerations

### Never trust the client

Always validate and authorize server-side — clients can call Server Actions directly via HTTP:

```typescript
'use server'
import { auth } from '@/lib/auth';

export async function deletePost(id: string) {
  const session = await auth();

  if (!session) {
    throw new Error('Unauthorized');
  }

  const post = await db.post.findUnique({ where: { id } });

  if (post?.authorId !== session.user.id) {
    throw new Error('Forbidden'); // don't delete someone else's post
  }

  await db.post.delete({ where: { id } });
  revalidatePath('/blog');
}
```

### CSRF protection

Next.js 15 automatically includes CSRF protection for Server Actions via the `Origin` header check. You don't need to implement this yourself — but never disable it.

---

## Comparison: Server Actions vs API Routes

| Scenario | Server Actions | API Routes |
|----------|---------------|------------|
| Form submissions | ✅ Ideal | ❌ Verbose |
| Progressive enhancement | ✅ Built-in | ❌ Manual |
| Third-party webhooks | ❌ Can't receive | ✅ Ideal |
| Mobile app backend | ❌ React-only | ✅ Ideal |
| File uploads | ✅ Via formData | ✅ |
| Real-time (SSE/WS) | ❌ | ✅ |

Use Server Actions for mutations triggered from your Next.js UI. Keep API Routes for webhooks, mobile clients, or external consumers.

---

## Production Patterns

### Action composition

Extract reusable logic into helper functions called by multiple actions:

```typescript
// lib/auth-action.ts
import { auth } from './auth';

export function withAuth<T>(
  action: (session: Session, ...args: any[]) => Promise<T>
) {
  return async (...args: any[]) => {
    const session = await auth();
    if (!session) throw new Error('Unauthorized');
    return action(session, ...args);
  };
}

// actions.ts
export const deletePost = withAuth(async (session, id: string) => {
  // session is guaranteed here
  await db.post.delete({ where: { id, authorId: session.user.id } });
  revalidatePath('/blog');
});
```

### Loading UI with Suspense

For Server Actions that trigger server re-renders, combine with Suspense boundaries and `loading.tsx` for smooth transitions.

---

## What's Next

Server Actions in Next.js 15 represent a fundamental shift toward the server as the primary execution environment. Combined with React 19's concurrent features, they enable patterns that were previously complex to implement: optimistic UI, progressive enhancement, and type-safe RPC — all without a separate API layer.

Try the [JSON formatter](/tools/json-formatter) and [TypeScript playground](/tools/typescript-playground) while building your next Server Actions implementation.
