---
title: "Svelte 5 Runes: Complete Migration Guide 2026"
description: "Master Svelte 5 runes: $state, $derived, $effect, $props, and $bindable. Learn how to migrate from Svelte 4 stores and reactive declarations with practical examples."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["svelte", "svelte-5", "runes", "frontend", "javascript", "reactive"]
readingTime: "11 min read"
---

Svelte 5 rewrites the reactivity model from the ground up. The old `$:` reactive declarations, `writable()` stores, and `export let` props are replaced by a set of reactive primitives called **runes** — functions prefixed with `$` that the Svelte compiler transforms into fine-grained reactive code.

The result is more predictable, more composable, and works the same way inside `.svelte` files, `.js` files, and `.ts` files. This guide covers everything you need to understand and migrate to Svelte 5 runes.

---

## Why Runes?

Svelte 4's reactivity worked but had friction:

- `$:` declarations were order-dependent and confusing in complex components
- Stores required explicit subscribe/unsubscribe and the `$store` prefix magic
- Reactive state couldn't be defined in plain `.js`/`.ts` files
- The component boundary was too rigid for sharing reactive logic

Runes solve all of this with a consistent primitive that works everywhere.

---

## $state — Reactive State

`$state` replaces `let` for reactive variables.

**Svelte 4:**
```svelte
<script>
  let count = 0;
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0);
</script>

<button onclick={() => count++}>
  Clicked {count} times
</button>
```

The key difference: in Svelte 4, `let count = 0` was implicitly reactive because of the compiler's top-level analysis. In Svelte 5, `$state()` explicitly marks a variable as reactive — and this works anywhere, not just in `.svelte` files.

### Deep Reactivity with $state

For objects and arrays, `$state` creates deeply reactive proxies:

```svelte
<script>
  let user = $state({
    name: 'Alice',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  });

  let items = $state(['apple', 'banana']);
</script>

<!-- All of these trigger reactivity -->
<button onclick={() => user.name = 'Bob'}>Rename</button>
<button onclick={() => user.preferences.theme = 'light'}>Toggle theme</button>
<button onclick={() => items.push('cherry')}>Add item</button>
```

Array mutations (`push`, `splice`, etc.) work reactively — no need for `items = [...items, 'cherry']`.

### $state.raw — Opt Out of Deep Reactivity

For large objects you update wholesale (not property-by-property), use `$state.raw` to avoid the proxy overhead:

```javascript
let bigDataset = $state.raw(largeArray);

// Must reassign, not mutate
bigDataset = computeNewDataset();
```

### $state.snapshot — Get a Plain Copy

To get a non-proxy snapshot of reactive state (useful for JSON serialization or passing to non-reactive code):

```javascript
let formData = $state({ name: '', email: '' });

function handleSubmit() {
  const plain = $state.snapshot(formData);
  await fetch('/api/submit', {
    method: 'POST',
    body: JSON.stringify(plain) // Works correctly
  });
}
```

---

## $derived — Computed Values

`$derived` replaces `$:` reactive declarations for computed values.

**Svelte 4:**
```svelte
<script>
  let count = 0;
  $: doubled = count * 2;
  $: isEven = count % 2 === 0;
</script>
```

**Svelte 5:**
```svelte
<script>
  let count = $state(0);
  const doubled = $derived(count * 2);
  const isEven = $derived(count % 2 === 0);
</script>
```

`$derived` takes an expression and automatically tracks its reactive dependencies.

### $derived.by — Multi-Line Derivations

For complex computations that need multiple statements:

```svelte
<script>
  let items = $state([3, 1, 4, 1, 5, 9, 2, 6]);

  const stats = $derived.by(() => {
    const sorted = [...items].sort((a, b) => a - b);
    const sum = items.reduce((a, b) => a + b, 0);
    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / items.length,
      sum
    };
  });
</script>

<p>Min: {stats.min}, Max: {stats.max}, Avg: {stats.avg.toFixed(2)}</p>
```

---

## $effect — Side Effects

`$effect` replaces `$:` statements used for side effects (not derived values) and Svelte 4's `onMount`/`afterUpdate` in many cases.

**Svelte 4:**
```svelte
<script>
  import { onMount } from 'svelte';

  let searchTerm = '';
  let results = [];

  $: {
    if (searchTerm.length > 2) {
      fetchResults(searchTerm).then(r => results = r);
    }
  }
</script>
```

**Svelte 5:**
```svelte
<script>
  let searchTerm = $state('');
  let results = $state([]);

  $effect(() => {
    if (searchTerm.length > 2) {
      fetchResults(searchTerm).then(r => results = r);
    }
  });
</script>
```

### Cleanup in $effect

Return a cleanup function for subscriptions, timers, or event listeners:

```svelte
<script>
  let position = $state({ x: 0, y: 0 });

  $effect(() => {
    function handleMouseMove(e) {
      position.x = e.clientX;
      position.y = e.clientY;
    }

    window.addEventListener('mousemove', handleMouseMove);

    // Runs on re-execution or unmount
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  });
</script>
```

### $effect.pre — Run Before DOM Update

`$effect.pre` runs before the DOM updates, equivalent to `beforeUpdate` in Svelte 4:

```svelte
<script>
  let messages = $state([]);
  let container;

  $effect.pre(() => {
    // Capture scroll position before new messages render
    const scrolledToBottom =
      container.scrollHeight - container.scrollTop === container.clientHeight;

    $effect(() => {
      if (scrolledToBottom) {
        container.scrollTop = container.scrollHeight;
      }
    });
  });
</script>
```

### When NOT to Use $effect

`$effect` is for **side effects** (DOM manipulation, network calls, subscriptions). Do not use it to synchronize state:

```svelte
<!-- BAD: Use $derived instead -->
<script>
  let count = $state(0);
  let doubled = $state(0);

  $effect(() => {
    doubled = count * 2; // Don't do this
  });
</script>

<!-- GOOD -->
<script>
  let count = $state(0);
  const doubled = $derived(count * 2);
</script>
```

---

## $props — Component Props

`$props` replaces `export let` for declaring component props.

**Svelte 4:**
```svelte
<script>
  export let name;
  export let count = 0;
  export let onIncrement;
</script>
```

**Svelte 5:**
```svelte
<script>
  let { name, count = 0, onincrement } = $props();
</script>
```

### Rest Props and TypeScript

```svelte
<script lang="ts">
  interface Props {
    name: string;
    count?: number;
    onincrement?: () => void;
    [key: string]: unknown; // Allow extra props
  }

  let { name, count = 0, onincrement, ...rest }: Props = $props();
</script>

<div {...rest}>
  <span>{name}: {count}</span>
  <button onclick={onincrement}>+</button>
</div>
```

---

## $bindable — Two-Way Binding Props

For props that support two-way binding (replacing Svelte 4's `bind:value`):

**Child component (TextInput.svelte):**
```svelte
<script>
  let { value = $bindable('') } = $props();
</script>

<input bind:value={value} />
```

**Parent:**
```svelte
<script>
  import TextInput from './TextInput.svelte';
  let text = $state('');
</script>

<TextInput bind:value={text} />
<p>You typed: {text}</p>
```

---

## Reactive Logic in .js/.ts Files

This is Svelte 5's biggest win for architecture. Reactive logic no longer has to live in `.svelte` files.

### Creating Reusable State (Replacing Stores)

**Svelte 4 store:**
```javascript
// counter.js
import { writable, derived } from 'svelte/store';

export const count = writable(0);
export const doubled = derived(count, $count => $count * 2);
export const increment = () => count.update(n => n + 1);
```

**Svelte 5 rune-based:**
```javascript
// counter.svelte.js  ← Note the .svelte.js extension!
export function createCounter(initial = 0) {
  let count = $state(initial);
  const doubled = $derived(count * 2);

  return {
    get count() { return count; },
    get doubled() { return doubled; },
    increment: () => count++,
    reset: () => count = initial
  };
}
```

```svelte
<script>
  import { createCounter } from './counter.svelte.js';
  const counter = createCounter(10);
</script>

<p>{counter.count} (×2: {counter.doubled})</p>
<button onclick={counter.increment}>+</button>
```

The `.svelte.js` extension tells the Svelte compiler to process runes in that file.

### A More Complex Example: Fetch State

```javascript
// useFetch.svelte.js
export function useFetch(url) {
  let data = $state(null);
  let error = $state(null);
  let loading = $state(false);

  $effect(() => {
    loading = true;
    error = null;

    fetch(url)
      .then(r => r.json())
      .then(d => { data = d; loading = false; })
      .catch(e => { error = e; loading = false; });
  });

  return {
    get data() { return data; },
    get error() { return error; },
    get loading() { return loading; }
  };
}
```

---

## Migration from Svelte 4: Quick Reference

| Svelte 4 | Svelte 5 |
|----------|----------|
| `let x = 0` (top-level reactive) | `let x = $state(0)` |
| `$: doubled = x * 2` | `const doubled = $derived(x * 2)` |
| `$: { doSideEffect(x); }` | `$effect(() => { doSideEffect(x); })` |
| `export let prop` | `let { prop } = $props()` |
| `export let val = $bindable(...)` | `let { val = $bindable() } = $props()` |
| `writable(0)` | `$state(0)` in `.svelte.js` |
| `on:click={handler}` | `onclick={handler}` |
| `<svelte:component>` | `{@render children()}` with snippets |

### Event Handler Change

Svelte 5 drops the `on:` directive in favor of standard DOM event names:

```svelte
<!-- Svelte 4 -->
<button on:click={handleClick} on:keydown={handleKey}>

<!-- Svelte 5 -->
<button onclick={handleClick} onkeydown={handleKey}>
```

### Slots vs Snippets

```svelte
<!-- Svelte 4: slots -->
<Card>
  <svelte:fragment slot="header">Title</svelte:fragment>
  Content
</Card>

<!-- Svelte 5: snippets -->
{#snippet header()}
  Title
{/snippet}

<Card {header}>
  Content
</Card>
```

---

## Coexistence: Svelte 4 + 5

Svelte 5 is backward compatible — you can migrate file by file. Components using the old API work alongside components using runes. Migrate gradually:

1. Start with shared state logic (convert stores to `.svelte.js` files)
2. Migrate leaf components (no children) first
3. Work up the component tree

Use `svelte-migrate` for automated codemods:

```bash
npx sv migrate svelte-5
```

---

## Performance: What Actually Changed

Svelte 5's rune-based reactivity uses a **signal graph** (similar to Solid.js) instead of the component-level dirty checking in Svelte 4. Practical implications:

- Fine-grained updates: only the DOM nodes dependent on changed state re-render
- No wasted work for components that reference multiple state values
- Better handling of large lists and complex derived state
- Slightly larger runtime (~10kb) compared to Svelte 4's near-zero runtime

For most apps, you won't notice the difference. For highly dynamic UIs with lots of state updates, the fine-grained model is measurably better.

---

## Key Takeaways

- `$state` = reactive variable (works in `.svelte.js` files too)
- `$derived` = computed values (replaces `$:` for derivations)
- `$effect` = side effects with automatic cleanup (return a function)
- `$props` = component props (replaces `export let`)
- Use `.svelte.js` extension for reactive logic outside components
- Migration is gradual — Svelte 4 and 5 APIs coexist

Svelte 5's runes are a cleaner mental model once you get past the unfamiliarity. The payoff is reactive logic that composes well, works in plain JS files, and eliminates the implicit magic that made Svelte 4 tricky to debug.
