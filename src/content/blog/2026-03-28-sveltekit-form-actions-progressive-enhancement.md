---
title: "SvelteKit Form Actions: Progressive Enhancement and Server-Side State in 2026"
description: "Master SvelteKit's form actions system for building apps that work without JavaScript and become faster with it. Covers actions, use:enhance, validation, error handling, and real-world patterns for full-stack SvelteKit development."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["sveltekit", "svelte", "form-actions", "progressive-enhancement", "full-stack", "typescript", "web-development"]
readingTime: "12 min read"
---

SvelteKit's form actions are one of the framework's most underrated features. They let you write server-side mutation logic that works with plain HTML forms — no JavaScript required — and then progressively enhance with client-side behavior when JS is available. The result is faster perceived performance, better resilience, and simpler code than most client-side form libraries.

This guide covers the full form actions system: defining actions, validating input, handling errors, and enhancing the user experience with `use:enhance` — all with TypeScript and production patterns.

---

## Why Form Actions?

The standard approach to mutations in SPAs is:

1. User submits form
2. JavaScript intercepts the event
3. Client validates input
4. Client sends `fetch` to API endpoint
5. Server processes and responds
6. Client updates UI based on response

This works but requires JavaScript at every step. If the script bundle doesn't load — slow network, CDN issue, content blocker — the form is dead.

SvelteKit form actions work differently:

1. Form submits natively to a server endpoint (no JS needed)
2. Server processes and returns data
3. SvelteKit reloads the page with updated state

When JavaScript *is* available, `use:enhance` intercepts the submission and handles it without a full page reload. Same server code, better experience.

---

## Defining Your First Action

Actions live in `+page.server.ts` files alongside their corresponding page:

```typescript
// src/routes/contact/+page.server.ts
import type { Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    const name = data.get('name') as string
    const email = data.get('email') as string
    const message = data.get('message') as string

    if (!name || !email || !message) {
      return fail(400, {
        error: 'All fields are required',
        values: { name, email, message },
      })
    }

    if (!email.includes('@')) {
      return fail(400, {
        error: 'Invalid email address',
        values: { name, email, message },
      })
    }

    // Send email, save to database, etc.
    await sendContactEmail({ name, email, message })

    return { success: true }
  },
}
```

The corresponding page:

```svelte
<!-- src/routes/contact/+page.svelte -->
<script lang="ts">
  import type { ActionData } from './$types'

  export let form: ActionData
</script>

{#if form?.success}
  <p class="success">Message sent! We'll be in touch.</p>
{/if}

<form method="POST">
  {#if form?.error}
    <p class="error">{form.error}</p>
  {/if}

  <label>
    Name
    <input name="name" value={form?.values?.name ?? ''} />
  </label>

  <label>
    Email
    <input name="email" type="email" value={form?.values?.email ?? ''} />
  </label>

  <label>
    Message
    <textarea name="message">{form?.values?.message ?? ''}</textarea>
  </label>

  <button type="submit">Send Message</button>
</form>
```

This works with zero JavaScript. Submit the form and the server handles it. The `form` prop re-populates values on error so users don't lose their input.

---

## Multiple Named Actions

When a page has multiple actions (edit, delete, archive), use named actions:

```typescript
// src/routes/posts/[id]/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ params }) => {
  const post = await db.post.findUnique({ where: { id: params.id } })
  if (!post) throw redirect(302, '/posts')
  return { post }
}

export const actions: Actions = {
  update: async ({ request, params }) => {
    const data = await request.formData()
    const title = data.get('title') as string
    const body = data.get('body') as string

    if (!title?.trim()) {
      return fail(400, { action: 'update', error: 'Title is required' })
    }

    await db.post.update({
      where: { id: params.id },
      data: { title, body, updatedAt: new Date() },
    })

    return { action: 'update', success: true }
  },

  publish: async ({ params }) => {
    await db.post.update({
      where: { id: params.id },
      data: { published: true, publishedAt: new Date() },
    })

    return { action: 'publish', success: true }
  },

  delete: async ({ params }) => {
    await db.post.delete({ where: { id: params.id } })
    throw redirect(303, '/posts')
  },
}
```

Target named actions with the `?/actionName` query parameter:

```svelte
<!-- src/routes/posts/[id]/+page.svelte -->
<script lang="ts">
  import type { ActionData, PageData } from './$types'

  export let data: PageData
  export let form: ActionData
</script>

<form method="POST" action="?/update">
  {#if form?.action === 'update' && form.error}
    <p class="error">{form.error}</p>
  {/if}

  <input name="title" value={data.post.title} />
  <textarea name="body">{data.post.body}</textarea>
  <button type="submit">Save Changes</button>
</form>

{#if !data.post.published}
  <form method="POST" action="?/publish">
    <button type="submit">Publish Post</button>
  </form>
{/if}

<form method="POST" action="?/delete">
  <button type="submit" class="danger">Delete Post</button>
</form>
```

Each form targets a different action independently. No JavaScript routing needed.

---

## Progressive Enhancement with `use:enhance`

`use:enhance` intercepts form submission and handles it without a full navigation, giving you a smoother experience while keeping the same server code:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms'
  import type { ActionData } from './$types'

  export let form: ActionData

  let loading = false
</script>

<form
  method="POST"
  use:enhance={() => {
    loading = true

    return async ({ result, update }) => {
      loading = false

      if (result.type === 'success') {
        // Custom success behavior
        await update()
      } else if (result.type === 'failure') {
        // Handle validation errors without page reload
        await update()
      }
    }
  }}
>
  <button type="submit" disabled={loading}>
    {loading ? 'Sending...' : 'Send Message'}
  </button>
</form>
```

The callback pattern gives you hooks before and after the action completes. Common use cases:

- Show loading spinners
- Optimistic UI updates
- Custom redirect handling
- Toast notifications on success/failure

For simple cases, `use:enhance` with no callback is enough — it just prevents the full page reload:

```svelte
<form method="POST" use:enhance>
  <button type="submit">Save</button>
</form>
```

---

## Form Validation with Zod

Don't re-implement validation logic for every action. Use Zod to validate and extract typed data:

```typescript
// src/lib/server/validation.ts
import { z } from 'zod'
import { fail } from '@sveltejs/kit'

export function validateForm<T extends z.ZodSchema>(
  schema: T,
  data: FormData
): z.infer<T> | Response {
  const raw = Object.fromEntries(data)
  const result = schema.safeParse(raw)

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors
    return fail(400, { errors, values: raw }) as unknown as Response
  }

  return result.data
}
```

```typescript
// src/routes/signup/+page.server.ts
import { z } from 'zod'
import type { Actions } from './$types'
import { validateForm } from '$lib/server/validation'

const signupSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
})

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData()
    const validated = validateForm(signupSchema, data)

    if (validated instanceof Response) return validated

    // validated is now typed as { email: string; password: string; name: string }
    await createUser(validated)
    throw redirect(303, '/dashboard')
  },
}
```

Display Zod validation errors per field:

```svelte
<script lang="ts">
  export let form: ActionData
</script>

<form method="POST" use:enhance>
  <label>
    Email
    <input name="email" value={form?.values?.email ?? ''} />
    {#if form?.errors?.email}
      <span class="field-error">{form.errors.email[0]}</span>
    {/if}
  </label>
  <!-- ... -->
</form>
```

---

## Authentication Actions

Login and logout are natural fits for form actions:

```typescript
// src/routes/login/+page.server.ts
import type { Actions, PageServerLoad } from './$types'
import { fail, redirect } from '@sveltejs/kit'
import { verifyPassword } from '$lib/server/auth'
import { db } from '$lib/server/db'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) throw redirect(302, '/dashboard')
  return {}
}

export const actions: Actions = {
  default: async ({ request, cookies }) => {
    const data = await request.formData()
    const email = data.get('email') as string
    const password = data.get('password') as string

    const user = await db.user.findUnique({ where: { email } })

    if (!user || !await verifyPassword(password, user.passwordHash)) {
      return fail(401, {
        error: 'Invalid email or password',
        values: { email },
      })
    }

    const sessionToken = await createSession(user.id)

    cookies.set('session', sessionToken, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    })

    throw redirect(303, '/dashboard')
  },
}
```

```typescript
// src/routes/logout/+page.server.ts
import type { Actions } from './$types'
import { redirect } from '@sveltejs/kit'

export const actions: Actions = {
  default: async ({ cookies, locals }) => {
    if (locals.session) {
      await deleteSession(locals.session.id)
    }

    cookies.delete('session', { path: '/' })
    throw redirect(303, '/login')
  },
}
```

Logout as a form (not a GET link) is correct — it's a state-changing operation and should be POST-only:

```svelte
<form method="POST" action="/logout">
  <button type="submit">Log out</button>
</form>
```

---

## File Upload Actions

Form actions handle file uploads cleanly:

```typescript
// src/routes/profile/avatar/+page.server.ts
import type { Actions } from './$types'
import { fail } from '@sveltejs/kit'

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData()
    const file = data.get('avatar') as File

    if (!file || file.size === 0) {
      return fail(400, { error: 'No file selected' })
    }

    if (file.size > 5 * 1024 * 1024) {
      return fail(400, { error: 'File must be under 5MB' })
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      return fail(400, { error: 'Only JPEG, PNG, and WebP files are allowed' })
    }

    const buffer = await file.arrayBuffer()
    const url = await uploadToStorage(buffer, file.type, locals.user.id)

    await db.user.update({
      where: { id: locals.user.id },
      data: { avatarUrl: url },
    })

    return { success: true, url }
  },
}
```

```svelte
<form method="POST" enctype="multipart/form-data" use:enhance>
  <input type="file" name="avatar" accept="image/*" />
  <button type="submit">Upload Avatar</button>
</form>
```

---

## Hooks and Auth Guards

Use `hooks.server.ts` to parse sessions and attach user data to `locals`, then protect actions with a guard function:

```typescript
// src/hooks.server.ts
import type { Handle } from '@sveltejs/kit'

export const handle: Handle = async ({ event, resolve }) => {
  const sessionToken = event.cookies.get('session')

  if (sessionToken) {
    const session = await getSession(sessionToken)
    if (session) {
      event.locals.user = session.user
      event.locals.session = session
    }
  }

  return resolve(event)
}
```

```typescript
// src/lib/server/guards.ts
import { error } from '@sveltejs/kit'
import type { RequestEvent } from '@sveltejs/kit'

export function requireUser(event: RequestEvent) {
  if (!event.locals.user) {
    throw error(401, 'Authentication required')
  }
  return event.locals.user
}
```

Use in actions:

```typescript
export const actions: Actions = {
  update: async (event) => {
    const user = requireUser(event) // throws 401 if not authenticated
    const data = await event.request.formData()
    // ...
  },
}
```

---

## Optimistic UI Pattern

For high-interactivity scenarios, combine `use:enhance` with Svelte stores for optimistic updates:

```svelte
<script lang="ts">
  import { enhance } from '$app/forms'
  import type { PageData } from './$types'

  export let data: PageData

  let todos = data.todos

  function optimisticToggle(id: string) {
    todos = todos.map(t => t.id === id ? { ...t, done: !t.done } : t)
  }
</script>

{#each todos as todo (todo.id)}
  <form
    method="POST"
    action="?/toggle"
    use:enhance={() => {
      optimisticToggle(todo.id)

      return async ({ result, update }) => {
        if (result.type === 'failure') {
          // Revert on failure
          optimisticToggle(todo.id)
        }
        // Don't call update() — we already mutated locally
      }
    }}
  >
    <input type="hidden" name="id" value={todo.id} />
    <button type="submit" class:done={todo.done}>
      {todo.title}
    </button>
  </form>
{/each}
```

The key insight: you control whether to call `update()`. If you skip it, the page doesn't re-fetch from the server — your local mutation stands. Call it only if you need server-confirmed state.

---

## Common Patterns Summary

| Pattern | How |
|---|---|
| Basic mutation | `export const actions = { default: async ({ request }) => {} }` |
| Multiple actions | Named actions + `action="?/name"` on form |
| Validation | Return `fail(400, { error, values })` from action |
| Auth guard | `requireUser(event)` helper in every protected action |
| Progressive enhancement | `use:enhance` on `<form>` |
| Loading state | Writable store set in `use:enhance` callback before return |
| Optimistic UI | Mutate local data, skip `update()` call |
| File uploads | `enctype="multipart/form-data"`, read `File` from `formData()` |
| Redirect after action | `throw redirect(303, '/path')` |

Form actions make the full-stack data layer in SvelteKit cohesive and predictable. Server and client share the same mental model, and the progressive enhancement story means your app degrades gracefully when JS isn't available. For most CRUD-heavy applications, form actions should be your first choice for mutations — reach for dedicated API routes only when you need to expose endpoints to external consumers.
