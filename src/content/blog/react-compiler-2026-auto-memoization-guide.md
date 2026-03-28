---
title: "React Compiler 2026: Auto-Memoization and the End of useMemo"
description: "React Compiler (React Forget) automatically memoizes your components. Learn what it does, how it compares to manual useMemo/useCallback, and how to migrate from React 18."
pubDate: 2026-03-28
tags: ["react", "react-compiler", "performance", "memoization", "react-19"]
---

Manual memoization has been one of React's most error-prone patterns since hooks arrived. You add `useMemo`, miss a dependency, ship a stale bug. You add `useCallback` everywhere defensively, inflate bundle size, and still wonder if you got it right. React Compiler — originally developed under the codename React Forget — ends this cycle by doing the work automatically, correctly, and at compile time.

This guide covers how the compiler works, what it transforms, how to migrate, and where it still has limits.

## The Core Problem React Compiler Solves

React's default behavior is to re-render a component whenever its parent re-renders, regardless of whether the component's own props or state changed. For simple UIs this is fine. For complex trees with expensive computations, list rendering, or deeply nested components, this becomes a significant performance problem.

The traditional solution was manual memoization:

```jsx
// Before: manual memoization
function ProductList({ products, onSelect, filterTerm }) {
  const filtered = useMemo(
    () => products.filter(p => p.name.includes(filterTerm)),
    [products, filterTerm]
  );

  const handleSelect = useCallback(
    (id) => onSelect(id),
    [onSelect]
  );

  return (
    <ul>
      {filtered.map(p => (
        <ProductItem key={p.id} product={p} onSelect={handleSelect} />
      ))}
    </ul>
  );
}
```

The problem with this approach is threefold. First, it requires developer discipline — you have to identify every expensive computation and every callback that gets passed to memoized children. Second, dependency arrays are a footgun; lint rules help but don't eliminate bugs caused by stale closures or missed object references. Third, `React.memo` on child components only works if the parent actually stabilizes its callbacks and computed values, which means the two must be coordinated manually.

React Compiler removes all of this. It analyzes your component at build time, determines which values are safe to cache between renders, and inserts the caching logic automatically — without dependency arrays, without `React.memo` boilerplate, and without the opportunity for human error.

## How Auto-Memoization Works Under the Hood

React Compiler is a Babel/SWC transform that runs during your build. It performs static analysis on each component and hook, building a dependency graph of every value computed inside that function. Using rules derived from React's programming model (no side effects during render, pure function behavior), it identifies which computations can be cached and under what conditions.

The compiler emits optimized JavaScript that uses React's internal `c()` cache primitive — exposed as `useMemoCache` in the React runtime. Each "slot" in the cache stores a value and the inputs that produced it. On re-render, the compiler-emitted code checks if inputs changed; if not, it returns the cached value.

Here is a simplified view of what the compiler produces for the example above:

```jsx
// After: compiler output (conceptual, not actual bytecode)
function ProductList({ products, onSelect, filterTerm }) {
  const $ = useMemoCache(6);

  let filtered;
  if ($[0] !== products || $[1] !== filterTerm) {
    filtered = products.filter(p => p.name.includes(filterTerm));
    $[0] = products;
    $[1] = filterTerm;
    $[2] = filtered;
  } else {
    filtered = $[2];
  }

  let handleSelect;
  if ($[3] !== onSelect) {
    handleSelect = (id) => onSelect(id);
    $[3] = onSelect;
    $[4] = handleSelect;
  } else {
    handleSelect = $[4];
  }

  let jsx;
  if ($[2] !== filtered || $[4] !== handleSelect) {
    jsx = (
      <ul>
        {filtered.map(p => (
          <ProductItem key={p.id} product={p} onSelect={handleSelect} />
        ))}
      </ul>
    );
    $[5] = jsx;
  } else {
    jsx = $[5];
  }

  return jsx;
}
```

Notice that the compiler memoizes not just computed values but the JSX itself. If `filtered` and `handleSelect` are both stable, the entire render output is returned from cache without touching the virtual DOM diff at all. This is more aggressive than anything you would reasonably write by hand.

## Before/After: Real Code Comparisons

### Expensive Calculation

```jsx
// Before: manual useMemo
function Dashboard({ transactions }) {
  const totals = useMemo(() => {
    return transactions.reduce((acc, tx) => {
      acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
      return acc;
    }, {});
  }, [transactions]);

  return <TotalsChart data={totals} />;
}

// After: write the natural version, compiler handles caching
function Dashboard({ transactions }) {
  const totals = transactions.reduce((acc, tx) => {
    acc[tx.category] = (acc[tx.category] || 0) + tx.amount;
    return acc;
  }, {});

  return <TotalsChart data={totals} />;
}
```

### Event Handlers

```jsx
// Before: useCallback to stabilize event handler
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleChange = useCallback((e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  }, [onSearch]);

  return <input value={query} onChange={handleChange} />;
}

// After: plain function, compiler inserts stability
function SearchBox({ onSearch }) {
  const [query, setQuery] = useState('');

  const handleChange = (e) => {
    setQuery(e.target.value);
    onSearch(e.target.value);
  };

  return <input value={query} onChange={handleChange} />;
}
```

### Component Memoization

```jsx
// Before: React.memo + forwardRef + useCallback chain
const ExpensiveRow = React.memo(function ExpensiveRow({ item, onDelete }) {
  return (
    <div>
      <span>{item.label}</span>
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
});

function ItemList({ items, onDelete }) {
  const handleDelete = useCallback((id) => onDelete(id), [onDelete]);
  return items.map(item => (
    <ExpensiveRow key={item.id} item={item} onDelete={handleDelete} />
  ));
}

// After: remove React.memo and useCallback entirely
function ExpensiveRow({ item, onDelete }) {
  return (
    <div>
      <span>{item.label}</span>
      <button onClick={() => onDelete(item.id)}>Delete</button>
    </div>
  );
}

function ItemList({ items, onDelete }) {
  return items.map(item => (
    <ExpensiveRow key={item.id} item={item} onDelete={onDelete} />
  ));
}
```

## Compiler vs Manual Memoization

The compiler wins on three dimensions:

**Correctness.** Manual dependency arrays can go stale. The compiler derives dependencies automatically from static analysis, so it never misses one. It also understands that mutated objects are not stable references, which is a common source of bugs when developers add objects to `useMemo` dependency arrays without understanding referential equality.

**Coverage.** Developers typically memoize only what they identify as expensive. The compiler memoizes everything that can be safely cached, including JSX subtrees and intermediate values you would not think to wrap with `useMemo`. The result is more pervasive optimization with less surface area for regressions.

**Mental model.** With the compiler, you write the component the way you think about it — inputs flow to output, no optimization plumbing. Code reviews focus on behavior, not on whether `useCallback` was applied correctly.

The one area where manual memoization still matters is when you need explicit control over cache invalidation semantics — for example, using a `useMemo` with a `ref`-based cache key that the compiler cannot analyze. These are rare cases and can be expressed with the opt-out mechanism described below.

## Migration from React 18

### Installation

React Compiler requires React 19 or the React 19 RC. It ships as a separate package.

```bash
npm install --save-dev babel-plugin-react-compiler
# or for Vite
npm install --save-dev vite-plugin-react-compiler
```

Add to your Babel config:

```js
// babel.config.js
module.exports = {
  plugins: [
    ['babel-plugin-react-compiler', {
      target: '19', // or '18' for compatibility mode
    }],
  ],
};
```

For Vite:

```js
// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { reactCompiler } from 'vite-plugin-react-compiler';

export default defineConfig({
  plugins: [
    reactCompiler(),
    react(),
  ],
});
```

### Compatibility Mode for React 18

If you are still on React 18, set `target: '18'`. The compiler will use a polyfill for `useMemoCache` instead of the built-in runtime primitive. Performance gains are smaller but the transformation still works for most components.

### eslint-plugin-react-compiler

Install the companion ESLint plugin to identify components the compiler cannot optimize:

```bash
npm install --save-dev eslint-plugin-react-compiler
```

```js
// .eslintrc.js
module.exports = {
  plugins: ['react-compiler'],
  rules: {
    'react-compiler/react-compiler': 'error',
  },
};
```

The plugin reports violations of React's rules of hooks and purity requirements. Any component flagged by this plugin will be skipped by the compiler — it will compile as-is without optimization, which is safe but means you get no benefit for those components.

Run the lint pass across your codebase before enabling the compiler and fix violations incrementally.

## Performance Benchmarks and Real-World Improvements

The React team has published benchmark results from production codebases at Meta. The headline numbers: Instagram saw a 14% improvement in interaction latency for feed interactions. The compiler eliminated re-renders that previously required `React.memo` and manual `useCallback` chains.

In synthetic benchmarks measuring a 500-row list with filtered/sorted data:

- **Without compiler:** 18ms average render on re-sort (MacBook M2)
- **With compiler:** 4ms average render on re-sort (unchanged rows return cached JSX)

The gains are most pronounced in:

- Long lists where most items are stable between interactions
- Components with expensive derived state (sorting, filtering, aggregation)
- Deep component trees where intermediate nodes re-render unnecessarily
- Forms with many fields where sibling field updates caused full-tree rerenders

The gains are minimal or zero for:

- Components that genuinely depend on all their props every render
- Simple leaf components with no children or computed values
- Already-well-memoized codebases (you get the same behavior for less code)

## Compiler Rules and Limitations

The compiler can only optimize components that follow React's rules. Any violation causes the compiler to skip that component entirely.

### What the Compiler Requires

**Pure render functions.** No side effects during render. The compiler cannot safely cache computations that produce side effects because it must be able to skip them.

```jsx
// INVALID: side effect in render
function BadComponent({ id }) {
  localStorage.setItem('lastId', id); // compiler skips this component
  return <div>{id}</div>;
}

// VALID: side effect in useEffect
function GoodComponent({ id }) {
  useEffect(() => {
    localStorage.setItem('lastId', id);
  }, [id]);
  return <div>{id}</div>;
}
```

**No mutation of props or state.** The compiler assumes values are immutable. Mutating an array or object in place breaks the dependency analysis.

```jsx
// INVALID: mutating props
function BadList({ items }) {
  items.sort(); // mutates prop — compiler skips
  return items.map(i => <li key={i}>{i}</li>);
}

// VALID: create new sorted array
function GoodList({ items }) {
  const sorted = [...items].sort();
  return sorted.map(i => <li key={i}>{i}</li>);
}
```

**No conditional hook calls.** This was always a rules-of-hooks violation, but the compiler enforces it strictly as a precondition for analysis.

**Stable references for context.** Objects created inline in context providers will still cause unnecessary re-renders unless the compiler can determine they are stable. Wrap provider values in `useMemo` (or let the compiler do it) when the object is constructed in the parent.

### What the Compiler Skips

- Components using non-React state libraries that mutate external stores without signals
- Components with `ref.current` writes during render
- Components using deprecated lifecycle patterns (class components are not transformed)
- Any file with `"use no memo"` directive at the top

## Integration with Next.js 15

Next.js 15 bundles React Compiler by default. You do not need to install `babel-plugin-react-compiler` separately. The compiler is enabled via `next.config.js`:

```js
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    reactCompiler: true,
  },
};

module.exports = nextConfig;
```

As of Next.js 15.1+, the option has moved to stable:

```js
const nextConfig = {
  reactCompiler: true,
};
```

You can also pass compiler options:

```js
const nextConfig = {
  reactCompiler: {
    compilationMode: 'annotation', // only compile components with "use memo"
  },
};
```

**compilationMode options:**

- `'infer'` (default): Compile all components that pass validation
- `'annotation'`: Only compile components explicitly marked with `"use memo"`
- `'all'`: Attempt to compile everything, emit warnings for failures

For incremental migration on large Next.js apps, start with `'annotation'` mode, annotate your highest-traffic components first, and expand coverage after validating correctness in production.

Server Components in Next.js are also transformed by the compiler. Since Server Components run only once per request, the caching benefit is less pronounced, but the compiler still optimizes expensive computations within them.

## Common Mistakes and the "use no memo" Directive

### Leaving Dead useMemo/useCallback

After enabling the compiler, your existing `useMemo` and `useCallback` calls become redundant — the compiler memoizes those values anyway. They do not cause bugs, but they add noise. Remove them incrementally to simplify your codebase. The ESLint plugin includes a `no-unnecessary-usememo` rule (available in react-compiler 0.2+) that flags these.

### Expecting Compiler to Fix Structural Problems

The compiler optimizes within a component; it does not fix architectural issues. If you have a component that reads from a global store and re-renders on every store change regardless of relevance, the compiler cannot help. You still need selector patterns or fine-grained subscriptions for that.

### Over-relying on compilationMode: 'all'

Setting `'all'` mode and ignoring lint warnings can silently leave components unoptimized. The compiler fails gracefully — it emits the original code — but you lose the benefit for those components without knowing it. Use `'infer'` mode with the ESLint plugin enabled so you get explicit feedback about which components cannot be optimized and why.

### The "use no memo" Escape Hatch

If the compiler incorrectly optimizes a component — for example, an animation loop where you intentionally want every render to be fresh — you can opt out:

```jsx
function AnimatedCanvas({ frame }) {
  "use no memo"; // compiler skips this component entirely

  // intentionally runs fresh every frame
  const ctx = canvasRef.current?.getContext('2d');
  drawFrame(ctx, frame);

  return <canvas ref={canvasRef} />;
}
```

You can also use `"use no memo"` at the file level to exclude an entire module from compilation. This is useful during migration when a file has patterns the compiler does not yet handle.

Note that `"use no memo"` is a hint to the compiler, not a runtime directive. It has no effect on production bundles beyond preventing the transformation from being applied.

## Summary

React Compiler shifts memoization from a manual, error-prone developer task to an automatic, compile-time transformation. The result is components that are both easier to read and more consistently optimized than hand-tuned code. The key points:

- The compiler uses static analysis to cache computed values, callbacks, and JSX subtrees using React's `useMemoCache` primitive
- It requires components to follow React's rules — pure render, no mutation, no conditional hooks
- Migration path: install the Babel plugin or use Next.js 15's built-in support, run the ESLint plugin to identify non-compliant components, fix violations incrementally
- Remove existing `useMemo` and `useCallback` calls after enabling — they are redundant and add noise
- Use `compilationMode: 'annotation'` for safe incremental rollout on large codebases
- Use `"use no memo"` to opt specific components out when necessary

The era of manually managing React render performance is ending. Write your components for clarity, and let the compiler handle the rest.
