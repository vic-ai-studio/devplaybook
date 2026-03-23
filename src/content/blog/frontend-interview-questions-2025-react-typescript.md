---
title: "Frontend Interview Questions 2026: React, TypeScript & More"
description: "The most common frontend interview questions in 2026 with detailed answers covering React, TypeScript, performance, accessibility, and system design."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["interview", "frontend", "react", "typescript", "career"]
readingTime: "15 min read"
ogDescription: "The most common frontend interview questions in 2026 with detailed answers covering React, TypeScript, performance, accessibility, and system design."
---

Frontend interviews in 2025 have evolved beyond "how does the event loop work." You'll face React architectural questions, TypeScript type system challenges, performance deep-dives, and often a system design component. This guide covers what's actually being asked and what a strong answer looks like.

---

## React Fundamentals

### Q: How does React's reconciliation algorithm work?

**What they're testing:** Understanding of virtual DOM, fiber architecture, and why keys matter.

**Strong answer:** React maintains a virtual DOM — a lightweight JavaScript representation of the actual DOM. When state or props change, React creates a new virtual DOM tree and diffs it against the previous one (reconciliation). It uses a heuristic O(n) algorithm that makes two assumptions: elements of different types produce different trees, and list items with stable keys can be identified across renders.

The Fiber architecture (introduced in React 16) made reconciliation interruptible. Work is split into units of work (fibers), allowing React to pause, prioritize, and resume work. This enables Concurrent Mode features like transitions and suspense.

**Key points to mention:** Keys aren't just a React lint warning — using unstable keys (like array index) causes React to think nodes are different and forces expensive re-creation instead of updates.

### Q: Explain the difference between useEffect and useLayoutEffect.

**Strong answer:** Both run after render, but at different times in the browser cycle:

- `useEffect` runs asynchronously after the browser has painted. Use it for data fetching, subscriptions, and side effects that don't require DOM measurements.
- `useLayoutEffect` runs synchronously after DOM mutations but before the browser paints. Use it for DOM measurements, animations that require reading layout, or preventing visual flicker.

**Rule of thumb:** Default to `useEffect`. Switch to `useLayoutEffect` only when you notice visual flicker or when your effect needs to read/write DOM layout before painting.

### Q: What are React Server Components, and how do they differ from Client Components?

**Strong answer:** Server Components run on the server and never ship their JavaScript to the client. They can directly access databases, file systems, and other server-only resources. They can't use browser APIs, event handlers, or hooks like `useState`.

Client Components are the traditional React components with the full interactive API. They're marked with `"use client"` in Next.js App Router.

The key architectural insight: Server Components reduce the amount of JavaScript sent to the browser and enable server-side data fetching at the component level without waterfalls. A common pattern is a Server Component shell that fetches data and passes it to Client Components for interactivity.

### Q: How would you prevent unnecessary re-renders in a large React application?

**Strong answer (layered approach):**

1. **`React.memo`** — Wraps a component to skip re-render if props haven't changed (shallow comparison).
2. **`useMemo`** — Memoizes expensive computed values between renders.
3. **`useCallback`** — Memoizes function references so they don't trigger child re-renders when passed as props.
4. **State colocation** — Move state as close to where it's used as possible. Global state causes components that don't need it to re-render.
5. **Context splitting** — Separate frequently-changing context (like current user selection) from rarely-changing context (like theme settings).
6. **Code splitting** — Use `React.lazy` to defer loading of non-critical components.

**What to avoid saying:** "I just use memo everywhere." Show you understand the tradeoff — memoization has overhead; it's only worth it for expensive computations or components that render frequently with the same props.

---

## TypeScript Deep-Dives

### Q: What's the difference between `interface` and `type` in TypeScript?

**Strong answer:**

They're functionally similar for most use cases, but have key differences:

```typescript
// interface can be extended (declaration merging)
interface User { name: string }
interface User { age: number }  // OK — merges into { name: string, age: number }

// type cannot be redeclared
type User = { name: string }
type User = { age: number }  // Error: Duplicate identifier

// type can represent non-object types
type StringOrNumber = string | number
type Callback = (x: number) => void

// interface can use extends; type uses intersection
interface AdminUser extends User { role: 'admin' }
type AdminUser = User & { role: 'admin' }
```

**Rule of thumb:** Use `interface` for object shapes (especially when extending or in public APIs). Use `type` for unions, intersections, function signatures, and aliases.

### Q: Explain TypeScript generics with a practical example.

**Strong answer:**

Generics let you write reusable code that works with multiple types while maintaining type safety.

```typescript
// Without generics: only works for strings
function firstItem(arr: string[]): string {
  return arr[0];
}

// With generics: works for any type
function firstItem<T>(arr: T[]): T {
  return arr[0];
}

const str = firstItem(["a", "b"]);   // TypeScript infers: string
const num = firstItem([1, 2, 3]);    // TypeScript infers: number

// Constrained generics
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: "Alice", age: 30 };
const name = getProperty(user, "name");  // type: string
const age = getProperty(user, "age");    // type: number
// getProperty(user, "email")  // Error: not a key of user
```

### Q: What is the `unknown` type and when would you use it over `any`?

**Strong answer:** Both `any` and `unknown` can hold values of any type, but `unknown` is type-safe — you can't do anything with an `unknown` value without first narrowing its type.

```typescript
function process(value: any) {
  value.toUpperCase()  // No error, but crashes if value is a number
}

function processSafe(value: unknown) {
  value.toUpperCase()  // Error: Object is of type 'unknown'

  if (typeof value === "string") {
    value.toUpperCase()  // OK — narrowed to string
  }
}
```

**Use `unknown` when:** You're receiving data from an external source (API response, JSON.parse, user input) and want TypeScript to force you to validate before using it.

---

## Performance Questions

### Q: Walk me through how you'd debug a slow React application.

**Strong answer (structured approach):**

1. **Identify with profiling first.** Open Chrome DevTools Performance tab or React DevTools Profiler. Don't guess — measure. Identify which components are rendering most frequently and taking longest.

2. **Check for unnecessary re-renders.** React DevTools "Highlight updates" mode makes this visual. Common causes: unstable object/array literals as props, context that changes too frequently, missing memo.

3. **Audit the render tree.** Look for large lists without virtualization. 1000+ DOM nodes without `react-window` or `react-virtual` is a common culprit.

4. **Check bundle size.** Webpack Bundle Analyzer or `next build --analyze` shows what's in your bundle. Common issues: shipping all of lodash instead of individual functions, moment.js, large component libraries.

5. **Measure Core Web Vitals.** LCP, FID, CLS. These are what users experience and what Google ranks.

### Q: What is layout thrashing and how do you prevent it?

**Strong answer:** Layout thrashing occurs when JavaScript alternates between reading and writing DOM layout properties, forcing the browser to recalculate layout on every read.

```javascript
// Thrashing: read, write, read, write (4 layout recalculations)
elements.forEach(el => {
  const height = el.offsetHeight     // read → triggers layout
  el.style.height = height + 10 + 'px'  // write → invalidates layout
})

// Fixed: batch reads first, then writes (1 layout recalculation)
const heights = elements.map(el => el.offsetHeight)  // all reads
elements.forEach((el, i) => {
  el.style.height = heights[i] + 10 + 'px'  // all writes
})
```

Modern React largely protects you from this via batched state updates, but direct DOM manipulation in `useLayoutEffect` or third-party libraries can still cause it.

---

## CSS & Browser Questions

### Q: How does the CSS cascade work?

**Answer:** Specificity determines which styles win when multiple rules target the same element. Specificity is calculated as (inline styles, IDs, classes/attributes/pseudo-classes, elements):

- Inline styles: `1,0,0,0`
- ID selectors: `0,1,0,0`
- Class, attribute, pseudo-class: `0,0,1,0`
- Element, pseudo-element: `0,0,0,1`

`!important` overrides all specificity (and should be avoided in most cases).

**Cascade order when specificity ties:** Later rules win. This makes source order matter for same-specificity rules.

### Q: Explain CSS Grid vs. Flexbox — when do you use each?

**Answer:**
- **Flexbox** is one-dimensional — it controls layout along a single axis (row or column). Use it for navigation bars, button groups, aligning items within a single row/column.
- **CSS Grid** is two-dimensional — it controls rows AND columns simultaneously. Use it for page layout, card grids, any design that requires alignment across both axes.

**Rule of thumb:** If you're thinking in rows OR columns, use Flexbox. If you're thinking in rows AND columns, use Grid.

---

## Accessibility (a11y) Questions

### Q: What does "semantic HTML" mean and why does it matter?

**Strong answer:** Semantic HTML uses elements that describe their meaning to both the browser and assistive technologies. `<article>`, `<nav>`, `<button>`, `<h1>–<h6>` communicate structure. `<div>` and `<span>` communicate nothing.

It matters because:
1. Screen readers use HTML semantics to navigate pages
2. Keyboard navigation works automatically for semantic interactive elements (`<button>`, `<a>`, `<input>`)
3. Search engines use semantic structure for ranking
4. Custom interactive elements built with `<div>` require manual ARIA attributes and keyboard handlers to match what `<button>` gives you for free

### Q: What is ARIA and when should you use it?

**Answer:** ARIA (Accessible Rich Internet Applications) is a set of HTML attributes that communicate additional semantics to assistive technologies. Use it when:
- Native HTML semantics are insufficient (custom dropdowns, date pickers)
- A visual design pattern has no HTML equivalent
- You need to communicate live updates (`aria-live`)

**The first rule of ARIA:** Don't use ARIA when a native HTML element would work. `<button>` is better than `<div role="button">`. Always.

---

## Frontend System Design

### Q: How would you build a real-time notification system on the frontend?

**Key decision points:**

1. **Transport:** WebSocket for bidirectional real-time, Server-Sent Events (SSE) for server-to-client only (simpler, HTTP-based, auto-reconnect), long-polling for maximum compatibility.

2. **State management:** Notifications live in global state (Zustand, Redux, React Context). Updates via WebSocket push to this store.

3. **UX patterns:** Toast for transient notifications, notification bell with count badge, drawer/panel for notification history.

4. **Reliability:** Handle connection drops with exponential backoff reconnection. Queue unsent actions locally for when connection resumes.

5. **Scale:** For high-volume notifications, implement client-side deduplication and batching. Don't re-render on every individual event.

---

## What to Expect in 2025 Interviews

**New topics gaining frequency:**
- React Server Components and App Router architecture
- Core Web Vitals and performance budgets
- Accessibility auditing with real tools (axe, Lighthouse)
- TypeScript strict mode and advanced types

**Still common:**
- Closure and hoisting questions (less than 5 years ago, but still appear)
- Event loop and async/await
- CSS specificity and layout

**Declining:**
- Class-based React (may appear at legacy companies)
- jQuery (legacy projects only)
- Browser compatibility hacks (CSS mostly handles this now)

---

## Interview Preparation Tools

The **[DevToolkit Starter Kit](https://devplaybook.gumroad.com)** includes a frontend interview question bank with 150+ questions organized by topic and difficulty, plus a 4-week study schedule.

For the algorithm portion of frontend interviews, see our [LeetCode Patterns Guide](/blog/leetcode-patterns-14-templates-95-percent-problems). For the full interview strategy including behavioral, see the [Senior Developer Interview Checklist](/blog/senior-developer-interview-checklist).
