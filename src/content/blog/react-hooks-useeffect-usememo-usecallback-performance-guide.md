---
title: "React Hooks Deep Dive: useEffect, useMemo, useCallback Performance Guide"
description: "Complete guide to React hooks performance in 2025. Master useEffect lifecycle patterns, useMemo vs useCallback differences, and when each hook helps or hurts performance."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["react", "hooks", "useeffect", "usememo", "usecallback", "performance", "javascript"]
readingTime: "14 min read"
---

React hooks changed how we write components. But `useEffect`, `useMemo`, and `useCallback` are also the source of most React performance bugs and infinite render loops. This guide explains the mental model behind each hook, with concrete rules for when to use them and when to skip them.

---

## Part 1: useEffect — The Full Mental Model

`useEffect` is for synchronizing your component with something outside React — a timer, event listener, WebSocket, DOM API, or external data store.

### The Core Rule

```
useEffect(() => {
  // setup: start the synchronization
  return () => {
    // cleanup: stop the synchronization
  };
}, [dependencies]); // re-run when these change
```

The dependency array tells React when to re-synchronize. Every value used inside the effect that comes from the component (props, state, context, derived values) must be in the dependency array.

### Common Pattern 1: Fetch on Mount or ID Change

```tsx
function UserProfile({ userId }: { userId: string }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    setLoading(true);
    fetchUser(userId).then(data => {
      if (!cancelled) {
        setUser(data);
        setLoading(false);
      }
    });

    // Cleanup: ignore stale responses if userId changes before fetch completes
    return () => {
      cancelled = true;
    };
  }, [userId]); // Re-runs whenever userId changes

  if (loading) return <Spinner />;
  return <div>{user?.name}</div>;
}
```

The `cancelled` flag is critical — without it, a fast userId change can cause a stale response to overwrite a newer one.

### Common Pattern 2: Event Listener Lifecycle

```tsx
function WindowResize() {
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    // Initial measurement
    handleResize();

    window.addEventListener("resize", handleResize);

    // Cleanup: remove listener when component unmounts
    return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array: only run on mount/unmount

  return <div>{size.width}x{size.height}</div>;
}
```

**Rule:** Every `addEventListener` must have a corresponding `removeEventListener` in the cleanup function.

### Common Pattern 3: Subscribe to External Store

```tsx
function useChatRoom(roomId: string) {
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const socket = createSocket(roomId);

    socket.on("message", (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [roomId]); // Reconnect when roomId changes

  return messages;
}
```

### The Infinite Loop Trap

The most common `useEffect` bug: putting an object or function in the dependency array that gets recreated on every render.

```tsx
// BUG: infinite loop
function Component({ userId }: { userId: string }) {
  const [data, setData] = useState(null);

  const options = { headers: { userId } }; // New object every render

  useEffect(() => {
    fetch("/api/data", options).then(setData);
  }, [options]); // options changes every render → infinite loop
}

// FIX: use primitive values in dependencies
function Component({ userId }: { userId: string }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    const options = { headers: { userId } };
    fetch("/api/data", options).then(setData);
  }, [userId]); // userId is a string — stable reference
}
```

**Rule:** Keep objects and functions that don't need to exist between renders inside the effect, not outside.

### What useEffect Is NOT For

```tsx
// WRONG: deriving state (use useMemo instead)
useEffect(() => {
  setFilteredItems(items.filter(i => i.active));
}, [items]);

// WRONG: computing a value for render (just compute it inline)
useEffect(() => {
  setFullName(`${firstName} ${lastName}`);
}, [firstName, lastName]);

// CORRECT: compute directly
const filteredItems = items.filter(i => i.active);
const fullName = `${firstName} ${lastName}`;
```

---

## Part 2: useMemo — Cache Expensive Computations

`useMemo` caches the result of a computation between renders.

```tsx
const memoizedValue = useMemo(() => {
  return expensiveComputation(input);
}, [input]); // Recompute only when input changes
```

### When useMemo Helps

**Case 1: Genuinely expensive calculation**

```tsx
function DataGrid({ rows }: { rows: Row[] }) {
  // Re-computed only when rows changes — not on every render
  const processedRows = useMemo(() => {
    return rows
      .filter(r => r.visible)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(r => ({ ...r, displayName: formatName(r.name) }));
  }, [rows]);

  return <Table rows={processedRows} />;
}
```

**Case 2: Stable reference for child component props**

```tsx
function Parent() {
  const [count, setCount] = useState(0);
  const [text, setText] = useState("");

  // Without useMemo: new object every render → Chart re-renders on every text change
  // With useMemo: same object reference when count hasn't changed → Chart skips render
  const chartConfig = useMemo(() => ({
    data: generateChartData(count),
    color: count > 10 ? "red" : "blue",
  }), [count]);

  return (
    <>
      <input value={text} onChange={e => setText(e.target.value)} />
      <MemoizedChart config={chartConfig} />
    </>
  );
}

const MemoizedChart = React.memo(Chart);
```

### When useMemo Hurts

```tsx
// WASTE: useMemo for trivial computation
const doubled = useMemo(() => count * 2, [count]);
// Just do: const doubled = count * 2;

// WASTE: useMemo when child isn't memoized
function Parent() {
  const config = useMemo(() => ({ color: "blue" }), []);
  return <Child config={config} />; // Child re-renders anyway if Parent does
}
```

**Rule:** Only use `useMemo` when:
1. The computation takes measurable time (filter/sort/transform on 1000+ items), OR
2. The result is passed to a `React.memo` component as a prop

---

## Part 3: useCallback — Stable Function References

`useCallback` is `useMemo` for functions. It returns the same function reference between renders when dependencies haven't changed.

```tsx
const memoizedFn = useCallback(() => {
  doSomething(a, b);
}, [a, b]);
```

### When useCallback Helps

**Case 1: Event handlers passed to memoized children**

```tsx
function List({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string | null>(null);

  // Without useCallback: new function every render → all ListItems re-render
  // With useCallback: same function reference → ListItems skip re-render
  const handleSelect = useCallback((id: string) => {
    setSelected(id);
  }, []); // No dependencies: setSelected is stable

  return items.map(item => (
    <MemoizedListItem
      key={item.id}
      item={item}
      onSelect={handleSelect}
    />
  ));
}
```

**Case 2: Functions in useEffect dependencies**

```tsx
function Search({ query }: { query: string }) {
  const [results, setResults] = useState([]);

  // Without useCallback: fetchResults is new every render
  // → useEffect runs on every render (infinite loop risk)
  const fetchResults = useCallback(async () => {
    const data = await searchApi(query);
    setResults(data);
  }, [query]); // Only recreated when query changes

  useEffect(() => {
    fetchResults();
  }, [fetchResults]); // Now only runs when query changes

  return <ResultList results={results} />;
}
```

### When useCallback Hurts

```tsx
// WASTE: function not passed as prop or used in effect
function Component() {
  const handleClick = useCallback(() => {
    console.log("clicked");
  }, []); // No benefit — just overhead

  return <button onClick={handleClick}>Click</button>;
}
// Just do: const handleClick = () => console.log("clicked");

// WASTE: memoized function passed to non-memoized component
function Parent() {
  const handleClick = useCallback(() => {}, []);
  return <Child onClick={handleClick} />; // Child isn't memoized → re-renders anyway
}
```

**Rule:** Only use `useCallback` when the function is:
1. Passed as a prop to a `React.memo` component, OR
2. Listed in a `useEffect` dependency array

---

## Part 4: When to Use React.memo

`React.memo` is the third piece. `useMemo` and `useCallback` only help if the receiving component is wrapped in `React.memo`.

```tsx
// This component only re-renders when its props actually change
const ExpensiveChart = React.memo(function Chart({ data, color }: ChartProps) {
  return <canvas>{ /* render chart */ }</canvas>;
});

// Without React.memo, the parent's re-render always re-renders Chart
// regardless of whether data or color changed
```

The trio works together:

```
useMemo/useCallback (stable references) + React.memo (skip renders) = skip unnecessary re-renders
```

---

## Decision Framework

```
Do you have a performance problem? Measure first with React DevTools Profiler.

useEffect:
  - Side effect needed (fetch, subscription, DOM mutation)? → useEffect
  - Can the computation happen inline during render? → Skip useEffect

useMemo:
  - Computation takes >1ms on actual hardware? AND
  - Child is memoized (React.memo)? → useMemo
  - Otherwise? → Compute inline

useCallback:
  - Function passed to React.memo component? OR
  - Function used in useEffect dependency array? → useCallback
  - Otherwise? → Regular function
```

---

## Performance Benchmarks: Real Numbers

| Scenario | Without optimization | With optimization | Notes |
|----------|---------------------|------------------|-------|
| Filter 10,000 items on every keystroke | ~40ms/render | ~1ms/render (cached) | useMemo makes a real difference |
| Pass handlers to 50 list items | 50 child re-renders | 0-1 child re-renders | React.memo + useCallback required |
| `useState` setter in effect | Infinite loop | N/A | Common beginner bug |
| Trivial useMemo (count * 2) | 0.01ms | 0.015ms (slower!) | useMemo adds overhead |

---

## Common Bugs Checklist

- [ ] `useEffect` with object/function in dependencies → move inside effect or use useMemo/useCallback
- [ ] Missing cleanup (setInterval, addEventListener, WebSocket) → add return cleanup
- [ ] Empty dependency array but uses props/state → add missing dependencies
- [ ] `useMemo` without `React.memo` on the child → add `React.memo` or remove useMemo
- [ ] `useCallback` for a handler that isn't passed down → remove it
- [ ] State derived in `useEffect` → compute it inline during render

---

## Related Tools on DevPlaybook

- [React Performance Profiler guide](/blog/react-performance-usememo-usecallback-memo) — benchmarks and profiling techniques
- [JavaScript array methods reference](/tools/js-array-methods) — for filtering/mapping in useMemo
- [TypeScript best practices](/blog/typescript-best-practices-2026) — type your React components
