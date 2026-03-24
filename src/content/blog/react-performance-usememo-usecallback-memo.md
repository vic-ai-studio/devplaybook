---
title: "React Performance: useMemo vs useCallback vs React.memo — When to Use Each"
description: "Clear explanation of React's useMemo, useCallback, and React.memo with real performance benchmarks. Learn when these optimizations help, when they hurt, and how to measure the difference."
date: "2026-03-24"
tags: ["react", "performance", "usememo", "usecallback", "javascript", "optimization"]
readingTime: "9 min read"
---

# React Performance: useMemo vs useCallback vs React.memo

These three optimization tools confuse most React developers. Used correctly, they prevent unnecessary re-renders. Used incorrectly, they add overhead without benefit. Here's a precise guide to when each one helps.

## The Core Problem: Referential Equality

React re-renders a component when its props or state change. The tricky part: JavaScript objects and functions are compared by reference, not value.

```javascript
// New render → new function reference
function Parent() {
  // handleClick is a NEW function on every render
  const handleClick = () => console.log('clicked');

  // Even though handleClick "looks" the same, it's a new reference
  // This causes Child to re-render every time Parent renders
  return <Child onClick={handleClick} />;
}
```

This is why `useMemo`, `useCallback`, and `React.memo` exist: to stabilize references across renders.

---

## React.memo: Memoize Component Renders

`React.memo` wraps a component and prevents re-renders when props haven't changed (shallow comparison).

```jsx
// Without memo: re-renders whenever Parent renders
function ExpensiveList({ items, onSelect }) {
  console.log('ExpensiveList rendered');
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
}

// With memo: only re-renders when items or onSelect changes
const ExpensiveList = React.memo(function ExpensiveList({ items, onSelect }) {
  console.log('ExpensiveList rendered');
  return (
    <ul>
      {items.map(item => (
        <li key={item.id} onClick={() => onSelect(item.id)}>
          {item.name}
        </li>
      ))}
    </ul>
  );
});
```

### The Problem: Unstable Prop References

`React.memo` does a shallow comparison. Objects and functions created in the parent are new references on every render — memo can't help if props change every render anyway.

```jsx
function Parent() {
  const [count, setCount] = useState(0);

  // ❌ New array reference every render → memo is useless
  const items = [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }];

  // ❌ New function reference every render → memo is useless
  const handleSelect = (id) => console.log(id);

  return <ExpensiveList items={items} onSelect={handleSelect} />;
}
```

This is where `useMemo` and `useCallback` come in.

---

## useCallback: Stable Function References

`useCallback` returns a memoized function — the same reference unless dependencies change.

```jsx
function Parent() {
  const [count, setCount] = useState(0);
  const [selectedId, setSelectedId] = useState(null);

  // ✅ Same function reference across renders (until selectedId changes)
  const handleSelect = useCallback((id) => {
    setSelectedId(id);
    console.log('Selected:', id);
  }, []); // No dependencies → stable forever

  // ✅ Same function, updates when count changes
  const handleCountedSelect = useCallback((id) => {
    setSelectedId(id);
    analytics.track('select', { id, count }); // Needs current count
  }, [count]); // Re-creates when count changes

  return <ExpensiveList items={items} onSelect={handleSelect} />;
}
```

### When useCallback Helps

```jsx
// ✅ Prop to a memoized component
const MemoizedComponent = React.memo(Child);
const stableCallback = useCallback(() => { ... }, []);
<MemoizedComponent onAction={stableCallback} />;

// ✅ Dependency of useEffect to prevent infinite loops
const fetchData = useCallback(async () => {
  const data = await api.get('/users');
  setUsers(data);
}, []); // Stable reference prevents effect from re-running

useEffect(() => {
  fetchData();
}, [fetchData]); // Lint-safe and stable
```

### When useCallback Doesn't Help

```jsx
// ❌ Callback not passed to a memoized component
function SimpleButton() {
  // No memo on parent → useCallback is overhead with no benefit
  const handleClick = useCallback(() => {
    setCount(c => c + 1);
  }, []);

  return <button onClick={handleClick}>Click me</button>;
}

// ❌ Always-changing dependencies defeat the purpose
const onChange = useCallback((value) => {
  processValue(value, someObj); // someObj changes every render
}, [someObj]); // → callback changes every render anyway
```

---

## useMemo: Memoize Computed Values

`useMemo` memoizes the result of an expensive computation, only recomputing when dependencies change.

```jsx
function ProductList({ products, searchQuery, sortBy }) {
  // ❌ Computed on every render regardless of what changed
  const filteredProducts = products
    .filter(p => p.name.includes(searchQuery))
    .sort((a, b) => a[sortBy] - b[sortBy]);

  // ✅ Only recomputed when products, searchQuery, or sortBy changes
  const filteredProducts = useMemo(() => {
    return products
      .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'price') return a.price - b.price;
        return a.name.localeCompare(b.name);
      });
  }, [products, searchQuery, sortBy]);

  return (
    <ul>
      {filteredProducts.map(p => <ProductItem key={p.id} product={p} />)}
    </ul>
  );
}
```

### useMemo for Stable Object References

```jsx
// ❌ New config object every render → child re-renders even with React.memo
const chartConfig = {
  colors: ['#ff0000', '#00ff00'],
  animation: true,
};

// ✅ Same reference unless colors or animation prop changes
const chartConfig = useMemo(() => ({
  colors: ['#ff0000', '#00ff00'],
  animation: props.animated,
}), [props.animated]);
```

### When useMemo Helps

- Expensive computations: sorting/filtering large arrays, complex math, data transformations
- Stable references for child component props (with `React.memo`)
- Avoiding expensive re-initializations

### When useMemo Doesn't Help

```jsx
// ❌ Cheap computations: memoization overhead > computation cost
const doubled = useMemo(() => count * 2, [count]);
// Just write: const doubled = count * 2;

// ❌ Memoizing primitive values: primitives compare by value
const message = useMemo(() => `Hello, ${name}!`, [name]);
// Strings are primitives — no reference issue
// Just write: const message = `Hello, ${name}!`;
```

---

## Measuring Before Optimizing

### React DevTools Profiler

1. Open React DevTools → Profiler tab
2. Click Record
3. Interact with your app
4. Click Stop
5. Look for components with high render times or unnecessary re-renders (gray = memoized, colored = re-rendered)

### Why Did This Render? (Library)

```bash
npm install @welldone-software/why-did-you-render
```

```javascript
// src/wdyr.ts (import before React in index.ts)
import React from 'react';

if (process.env.NODE_ENV === 'development') {
  const whyDidYouRender = require('@welldone-software/why-did-you-render');
  whyDidYouRender(React, {
    trackAllPureComponents: true,
    logOwnerReasons: true,
  });
}
```

Console output:

```
ProductList re-rendered because of props changes:
  filteredProducts: [{ id: 1, ... }] !== [{ id: 1, ... }]
  (Objects are equal but different references → add useMemo)
```

---

## React Compiler (React 19+): The Future of Memoization

React 19 introduced the React Compiler (previously "React Forget") which automatically inserts `useMemo` and `useCallback` where needed — without you writing them manually.

```jsx
// You write:
function ProductList({ products, searchQuery }) {
  const filtered = products.filter(p => p.name.includes(searchQuery));
  return <List items={filtered} />;
}

// React Compiler transforms to (approximately):
function ProductList({ products, searchQuery }) {
  const filtered = useMemo(
    () => products.filter(p => p.name.includes(searchQuery)),
    [products, searchQuery]
  );
  return <List items={filtered} />;
}
```

**If you're on React 19+**: enable the compiler and reduce manual memoization. The compiler is more consistent than manual `useMemo`/`useCallback` usage.

```bash
npm install babel-plugin-react-compiler
```

```json
// babel.config.json
{
  "plugins": ["babel-plugin-react-compiler"]
}
```

---

## Decision Framework

```
Does the function/value cause unnecessary re-renders?
├── No → Don't memoize (adds overhead for no benefit)
└── Yes → Which type?
    ├── Function passed as prop → useCallback
    ├── Expensive computation → useMemo
    ├── Object reference passed as prop → useMemo
    └── Component re-renders with same props → React.memo
         └── Also memoize the unstable props it receives
```

### Quick Reference

| Tool | Input | Output | Use When |
|------|-------|--------|----------|
| `React.memo` | Component | Memoized component | Child re-renders with same props |
| `useCallback` | Function | Stable function ref | Function passed to memoized child or useEffect |
| `useMemo` | Computation | Memoized value | Expensive computation or unstable object reference |

---

## Common Mistakes

```jsx
// ❌ Memoizing everything "just in case"
// Every useMemo/useCallback has a cost (memory + comparison)
const value = useMemo(() => x + 1, [x]); // Pointless

// ❌ Missing dependencies
const fetchUser = useCallback(async () => {
  const data = await api.get(`/users/${userId}`); // userId not in deps!
  setUser(data);
}, []); // Bug: always fetches the initial userId

// ✅ Correct dependencies
const fetchUser = useCallback(async () => {
  const data = await api.get(`/users/${userId}`);
  setUser(data);
}, [userId]);

// ❌ Inline objects in memoized component props
<MemoizedChart
  config={{ theme: 'dark' }}  // New object every render → memo useless
/>

// ✅ Stable references
const chartConfig = useMemo(() => ({ theme: 'dark' }), []);
<MemoizedChart config={chartConfig} />
```

---

## Related Articles

- **[JavaScript Bundle Size Optimization](/blog/javascript-bundle-size-optimization-guide)** — reduce your app's overall footprint
- **[TypeScript Performance 2026](/blog/typescript-performance-optimization-2026)** — compile-time optimizations
- **[Web Vitals Optimization Guide](/blog/web-vitals-core-web-vitals-optimization)** — INP and rendering performance
- **[Node.js Memory Management](/blog/nodejs-memory-management-profiling)** — server-side performance

---

## Summary

Use `React.memo` on components that receive the same props but re-render due to parent renders. Use `useCallback` to stabilize function references passed to memoized children or used in `useEffect` dependencies. Use `useMemo` for expensive computations and to stabilize object references.

The golden rule: **measure before memoizing**. React DevTools Profiler shows exactly which components re-render unnecessarily. Optimize based on data, not intuition — premature memoization adds memory and computation overhead that can actually slow things down.

If you're on React 19+, let the React Compiler handle memoization automatically and focus your optimization energy on actual bottlenecks.
