---
title: "React 19 Complete Guide: useOptimistic, Server Actions & React Compiler 2026"
description: "Master React 19's biggest features: useOptimistic hook, Server Actions, React Compiler auto-memoization, the use() hook, and more. Real code examples for every new API."
date: "2026-03-28"
readingTime: "12 min read"
tags: [react, react19, javascript, frontend, server-actions]
---

React 19 shipped with the biggest API surface change since hooks landed in React 16.8. If you're still writing `useMemo` everywhere and managing form state manually, you're working harder than you need to.

This guide covers every major React 19 feature with practical code you can drop into real projects today.

---

## What's New in React 19

Before diving into code, here's what actually changed:

- **React Compiler** — auto-memoization replaces manual `useMemo`/`useCallback`
- **Server Actions** — call server functions directly from components
- **`useOptimistic`** — optimistic UI updates without complex state management
- **`useFormStatus` / `useFormState`** (now `useActionState`) — built-in form state
- **`use()` hook** — consume promises and context in render
- **ref as prop** — no more `forwardRef` wrapper
- **Document metadata** — `<title>`, `<meta>` directly in components

---

## React Compiler: Automatic Memoization

The React Compiler (formerly React Forget) transforms your code at build time to automatically add memoization where needed. You no longer manually wrap everything in `useMemo` and `useCallback`.

### Before React 19

```tsx
// React 18: manual memoization everywhere
function ProductList({ products, category }: Props) {
  const filtered = useMemo(
    () => products.filter(p => p.category === category),
    [products, category]
  );

  const handleClick = useCallback((id: string) => {
    console.log('clicked', id);
  }, []);

  return (
    <ul>
      {filtered.map(p => (
        <ProductItem key={p.id} product={p} onClick={handleClick} />
      ))}
    </ul>
  );
}
```

### After React 19 with Compiler

```tsx
// React 19: write normal code, compiler handles memoization
function ProductList({ products, category }: Props) {
  const filtered = products.filter(p => p.category === category);

  function handleClick(id: string) {
    console.log('clicked', id);
  }

  return (
    <ul>
      {filtered.map(p => (
        <ProductItem key={p.id} product={p} onClick={handleClick} />
      ))}
    </ul>
  );
}
```

The compiler analyzes your code and inserts memoization automatically — only where it actually helps.

### Enabling the Compiler

```bash
npm install babel-plugin-react-compiler react-compiler-runtime
```

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19'
    }]
  ]
};
```

For Next.js 15:

```js
// next.config.js
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};
```

---

## Server Actions

Server Actions let you call server-side functions directly from client components. No API route files, no fetch boilerplate.

### Defining a Server Action

```tsx
// app/actions.ts
'use server';

import { db } from '@/lib/db';
import { revalidatePath } from 'next/cache';

export async function createPost(formData: FormData) {
  const title = formData.get('title') as string;
  const content = formData.get('content') as string;

  if (!title || title.length < 3) {
    return { error: 'Title must be at least 3 characters' };
  }

  const post = await db.post.create({
    data: { title, content },
  });

  revalidatePath('/posts');
  return { success: true, id: post.id };
}
```

### Using a Server Action in a Form

```tsx
// app/new-post/page.tsx
import { createPost } from '@/app/actions';

export default function NewPostPage() {
  return (
    <form action={createPost}>
      <input name="title" placeholder="Post title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit">Create Post</button>
    </form>
  );
}
```

### Server Actions with `useActionState`

`useActionState` (renamed from `useFormState`) gives you the action's return value and pending state:

```tsx
'use client';
import { useActionState } from 'react';
import { createPost } from '@/app/actions';

export default function NewPostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      {state?.error && (
        <p className="text-red-500">{state.error}</p>
      )}
      {state?.success && (
        <p className="text-green-500">Post created!</p>
      )}
      <input name="title" placeholder="Post title" required />
      <textarea name="content" placeholder="Content" required />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Post'}
      </button>
    </form>
  );
}
```

---

## `useOptimistic`: Optimistic UI Without the Pain

`useOptimistic` handles the pattern of showing an immediate UI update while waiting for a server response — and rolling back on failure.

### The Old Way (React 18)

```tsx
// React 18: manual optimistic state management
function LikeButton({ postId, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, setOptimisticLikes] = useState(initialLikes);

  async function handleLike() {
    setOptimisticLikes(prev => prev + 1); // optimistic update
    try {
      const result = await likePost(postId);
      setLikes(result.likes); // real update
      setOptimisticLikes(result.likes);
    } catch {
      setOptimisticLikes(likes); // rollback
    }
  }

  return <button onClick={handleLike}>❤️ {optimisticLikes}</button>;
}
```

### The React 19 Way

```tsx
'use client';
import { useOptimistic, useTransition } from 'react';
import { likePost } from '@/app/actions';

function LikeButton({ postId, initialLikes }: Props) {
  const [likes, setLikes] = useState(initialLikes);
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (currentLikes, _delta) => currentLikes + 1
  );
  const [isPending, startTransition] = useTransition();

  async function handleLike() {
    startTransition(async () => {
      addOptimisticLike(1); // immediately updates UI
      const result = await likePost(postId);
      setLikes(result.likes); // syncs real value when done
    });
  }

  return (
    <button onClick={handleLike} disabled={isPending}>
      ❤️ {optimisticLikes}
    </button>
  );
}
```

### Optimistic List Updates

```tsx
'use client';
import { useOptimistic } from 'react';

function CommentList({ postId, initialComments }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [optimisticComments, addOptimisticComment] = useOptimistic(
    comments,
    (currentComments, newComment: Comment) => [
      ...currentComments,
      { ...newComment, id: `temp-${Date.now()}`, pending: true },
    ]
  );

  async function handleSubmit(formData: FormData) {
    const text = formData.get('text') as string;
    const tempComment = { text, author: 'You' };

    addOptimisticComment(tempComment);

    const saved = await addComment(postId, text);
    setComments(prev => [...prev, saved]);
  }

  return (
    <div>
      {optimisticComments.map(comment => (
        <div
          key={comment.id}
          className={comment.pending ? 'opacity-50' : ''}
        >
          {comment.text}
        </div>
      ))}
      <form action={handleSubmit}>
        <input name="text" placeholder="Add a comment..." />
        <button type="submit">Comment</button>
      </form>
    </div>
  );
}
```

---

## `useFormStatus`: Submit Button State

`useFormStatus` gives child components access to the parent form's pending state — no prop drilling required.

```tsx
'use client';
import { useFormStatus } from 'react-dom';

// This component can be used in any form
function SubmitButton({ label }: { label: string }) {
  const { pending, data, method } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Spinner size="sm" />
          Processing...
        </span>
      ) : (
        label
      )}
    </button>
  );
}

// Use it in any form
function LoginForm() {
  return (
    <form action={loginAction}>
      <input name="email" type="email" />
      <input name="password" type="password" />
      <SubmitButton label="Sign In" />
    </form>
  );
}
```

---

## The `use()` Hook

`use()` is a new primitive that reads a resource — a Promise or a Context — during render. It can be called inside loops and conditionals (unlike other hooks).

### Reading Promises

```tsx
import { use, Suspense } from 'react';

// Fetch data at the component level
function UserProfile({ userPromise }: { userPromise: Promise<User> }) {
  const user = use(userPromise); // suspends until resolved

  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// Wrap with Suspense in the parent
function ProfilePage({ userId }: { userId: string }) {
  const userPromise = fetchUser(userId); // create promise, don't await

  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <UserProfile userPromise={userPromise} />
    </Suspense>
  );
}
```

### Reading Context Conditionally

```tsx
import { use } from 'react';
import { ThemeContext } from '@/contexts/theme';

function ThemedButton({ show }: { show: boolean }) {
  // use() can be called inside conditionals — regular hooks cannot
  if (!show) return null;

  const theme = use(ThemeContext);

  return (
    <button style={{ background: theme.primary }}>
      Click me
    </button>
  );
}
```

---

## ref as a Prop

`forwardRef` is no longer needed. Refs are now just props.

### React 18

```tsx
// React 18: forwardRef boilerplate
const CustomInput = forwardRef<HTMLInputElement, InputProps>(
  ({ label, ...props }, ref) => (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  )
);
```

### React 19

```tsx
// React 19: ref is just a prop
function CustomInput({ label, ref, ...props }: InputProps & { ref?: Ref<HTMLInputElement> }) {
  return (
    <div>
      <label>{label}</label>
      <input ref={ref} {...props} />
    </div>
  );
}

// Usage is identical
const inputRef = useRef<HTMLInputElement>(null);
<CustomInput label="Email" ref={inputRef} type="email" />
```

---

## Document Metadata in Components

React 19 supports rendering `<title>`, `<meta>`, and `<link>` tags directly in components. React hoists them to `<head>` automatically.

```tsx
function BlogPost({ post }: { post: Post }) {
  return (
    <article>
      {/* React hoists these to <head> */}
      <title>{post.title} | DevPlaybook</title>
      <meta name="description" content={post.excerpt} />
      <meta property="og:title" content={post.title} />
      <meta property="og:image" content={post.coverImage} />
      <link rel="canonical" href={`https://devplaybook.cc/blog/${post.slug}`} />

      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

No more helmet libraries needed for basic use cases.

---

## React 18 vs React 19: Migration Guide

### What You Can Remove

| React 18 Pattern | React 19 Equivalent |
|---|---|
| `forwardRef()` | `ref` as regular prop |
| `React.memo()` everywhere | React Compiler handles it |
| `useMemo` / `useCallback` | React Compiler handles it |
| `useFormState` (React DOM) | `useActionState` (React) |
| Helmet/next-head for metadata | Native `<title>` / `<meta>` |
| Manual fetch + state in forms | Server Actions + `useActionState` |

### Upgrade Path

```bash
# 1. Update React
npm install react@19 react-dom@19

# 2. Update types
npm install @types/react@19 @types/react-dom@19

# 3. (Optional) Add React Compiler
npm install babel-plugin-react-compiler react-compiler-runtime
```

### Codemod for Breaking Changes

```bash
# Run official React 19 codemod
npx codemod@latest react/19/migration
```

This handles the `useFormState` → `useActionState` rename and other minor breaking changes automatically.

---

## Practical Project: Task Manager with React 19

Here's a complete mini-app using all the new features together:

```tsx
// app/tasks/page.tsx
import { getTasks } from '@/app/tasks/actions';
import { TaskList } from '@/components/task-list';
import { Suspense } from 'react';

export default function TasksPage() {
  const tasksPromise = getTasks();

  return (
    <main>
      <h1>Tasks</h1>
      <Suspense fallback={<div>Loading tasks...</div>}>
        <TaskList tasksPromise={tasksPromise} />
      </Suspense>
    </main>
  );
}
```

```tsx
// components/task-list.tsx
'use client';
import { use, useOptimistic, useTransition } from 'react';
import { useActionState } from 'react';
import { addTask, toggleTask } from '@/app/tasks/actions';

export function TaskList({ tasksPromise }: { tasksPromise: Promise<Task[]> }) {
  const initialTasks = use(tasksPromise);
  const [tasks, setTasks] = useState(initialTasks);
  const [optimisticTasks, updateOptimistic] = useOptimistic(
    tasks,
    (current, update: { type: 'add' | 'toggle'; task?: Task; id?: string }) => {
      if (update.type === 'add') {
        return [...current, { ...update.task!, pending: true }];
      }
      return current.map(t =>
        t.id === update.id ? { ...t, completed: !t.completed } : t
      );
    }
  );

  const [addState, addAction, isAdding] = useActionState(addTask, null);

  return (
    <div>
      <form action={addAction}>
        <input name="title" placeholder="New task..." required />
        <button type="submit" disabled={isAdding}>
          {isAdding ? 'Adding...' : 'Add Task'}
        </button>
      </form>

      {addState?.error && <p className="error">{addState.error}</p>}

      <ul>
        {optimisticTasks.map(task => (
          <li
            key={task.id}
            className={task.pending ? 'opacity-50' : ''}
          >
            <input
              type="checkbox"
              checked={task.completed}
              onChange={() => {
                updateOptimistic({ type: 'toggle', id: task.id });
                toggleTask(task.id);
              }}
            />
            <span className={task.completed ? 'line-through' : ''}>
              {task.title}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Key Takeaways

- **React Compiler** eliminates the need for manual `useMemo`/`useCallback` — upgrade first, remove the boilerplate later
- **Server Actions** replace the API-route-per-form pattern — less code, better type safety
- **`useOptimistic`** is the right way to do optimistic UI — it handles rollback automatically
- **`use()`** is powerful for data fetching patterns and conditional context reads
- **`ref` as prop** is a small QoL win — remove `forwardRef` wrappers as you encounter them

React 19's biggest theme is reducing boilerplate. The code you write after the upgrade should be shorter, not longer.
