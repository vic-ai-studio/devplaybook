# Frontend Interview Questions

**55 questions** covering HTML/CSS, JavaScript, React, TypeScript, Performance, and Accessibility.

---

## HTML & CSS (10 questions)

### 1. What is the difference between `display: none` and `visibility: hidden`? `[Junior]`

**Answer:**
- `display: none` removes the element from the document flow — it takes up no space and is not rendered.
- `visibility: hidden` hides the element but keeps it in the document flow — it still occupies space.

**Key points:** `display: none` also affects child elements. `visibility: hidden` can be selectively overridden on children with `visibility: visible`.

**Follow-up:** What about `opacity: 0`? → The element is invisible but still occupies space and still receives pointer events (unless `pointer-events: none` is also set).

---

### 2. Explain the CSS box model. `[Junior]`

**Answer:**
Every element is a rectangular box consisting of (from inside out):
1. **Content** — the actual content area
2. **Padding** — space between content and border
3. **Border** — the visible border line
4. **Margin** — space outside the border

By default, `width` and `height` apply only to the content box. With `box-sizing: border-box`, `width` and `height` include padding and border.

**Follow-up:** Why use `box-sizing: border-box` globally? → It makes layout math predictable. Setting a `width: 200px` means the total visible width is 200px, regardless of padding.

---

### 3. What is the difference between `em`, `rem`, `%`, `vw`, and `vh`? `[Junior]`

**Answer:**
- `em` — relative to the font-size of the **parent** element
- `rem` — relative to the font-size of the **root** (`html`) element. More predictable than `em`.
- `%` — relative to the **parent element's** corresponding property (e.g., `width: 50%` = 50% of parent width)
- `vw` — 1% of the **viewport width**
- `vh` — 1% of the **viewport height**

**Key use case:** Use `rem` for font sizes (respects user browser settings), `vw`/`vh` for full-screen layouts.

---

### 4. What is CSS specificity and how is it calculated? `[Mid]`

**Answer:**
Specificity determines which CSS rule wins when multiple rules target the same element. It's calculated as a 4-component value: `(inline, IDs, classes/attrs/pseudo-classes, elements/pseudo-elements)`.

| Selector | Score |
|----------|-------|
| `*` | 0,0,0,0 |
| `p` | 0,0,0,1 |
| `.class` | 0,0,1,0 |
| `#id` | 0,1,0,0 |
| `style=""` | 1,0,0,0 |
| `!important` | Overrides all |

**Follow-up:** How do you avoid specificity wars? → Use BEM naming, avoid `!important`, keep selectors flat, use CSS custom properties.

---

### 5. What is the difference between Flexbox and CSS Grid? `[Mid]`

**Answer:**
- **Flexbox** is one-dimensional — it lays out items along a single axis (row OR column). Best for component-level layouts (navbars, card rows, centering).
- **CSS Grid** is two-dimensional — it handles rows AND columns simultaneously. Best for page-level layouts and complex grids.

**When to use which:**
- Navigation bar → Flexbox
- Photo gallery → Grid
- Card layout → Either works; Grid if you need consistent row heights
- Centering a div → Flexbox (`display: flex; align-items: center; justify-content: center`)

---

### 6. What is a CSS stacking context? `[Mid]`

**Answer:**
A stacking context is a 3D context in which child elements are stacked along the z-axis. An element creates a new stacking context when it has:
- `position: relative/absolute/fixed/sticky` + `z-index` other than `auto`
- `opacity` less than 1
- `transform`, `filter`, `clip-path`, `will-change`, or `isolation: isolate`

**Key insight:** `z-index` only works within the same stacking context. A child with `z-index: 9999` cannot appear above a sibling stacking context that has lower `z-index`.

---

### 7. Explain the difference between `position: relative`, `absolute`, `fixed`, and `sticky`. `[Junior]`

**Answer:**
- `relative` — positioned relative to its **normal flow** position. `top/left` offsets from where it would naturally be. Still occupies original space.
- `absolute` — removed from normal flow. Positioned relative to the nearest **positioned ancestor** (non-`static`). If none, relative to the initial containing block.
- `fixed` — positioned relative to the **viewport**. Stays in place on scroll.
- `sticky` — hybrid: acts like `relative` until a scroll threshold, then acts like `fixed` within its parent container.

---

### 8. What are CSS custom properties (variables) and how do they work? `[Mid]`

**Answer:**
Custom properties (defined with `--`) allow you to store reusable values in CSS:

```css
:root {
  --primary-color: #3b82f6;
  --font-size-base: 16px;
}

.button {
  background: var(--primary-color);
  font-size: var(--font-size-base);
}
```

**Key features:** They cascade and inherit. You can override them at any scope. JavaScript can read/write them (`element.style.setProperty('--color', 'red')`). Unlike preprocessor variables, they're dynamic and can change at runtime.

---

### 9. What is the `@media` query and how do you use it for responsive design? `[Junior]`

**Answer:**
Media queries apply CSS rules only when certain conditions are met (e.g., viewport width, device type, color scheme):

```css
/* Mobile-first approach */
.container { padding: 16px; }

@media (min-width: 768px) {
  .container { padding: 32px; }
}

@media (prefers-color-scheme: dark) {
  body { background: #111; }
}
```

**Follow-up:** Mobile-first vs. desktop-first? Mobile-first uses `min-width` (starts small, adds complexity). Desktop-first uses `max-width`. Mobile-first is generally preferred for performance.

---

### 10. What is the `will-change` CSS property? `[Senior]`

**Answer:**
`will-change` hints to the browser that an element will change in a specific way, allowing the browser to optimize rendering in advance (e.g., promote the element to its own compositor layer):

```css
.animated {
  will-change: transform;
}
```

**When to use:** Only for elements that will definitely animate. Overuse wastes memory (each layer consumes GPU memory). Add/remove dynamically via JavaScript before/after animation rather than keeping it always set.

---

## JavaScript (20 questions)

### 11. What is the difference between `var`, `let`, and `const`? `[Junior]`

**Answer:**
| | `var` | `let` | `const` |
|---|---|---|---|
| Scope | Function | Block | Block |
| Hoisting | Yes (undefined) | Yes (TDZ error) | Yes (TDZ error) |
| Re-declare | Yes | No | No |
| Re-assign | Yes | Yes | No |
| Global property | Yes | No | No |

**TDZ (Temporal Dead Zone):** `let`/`const` are hoisted but not initialized — accessing them before declaration throws `ReferenceError`.

---

### 12. Explain closures in JavaScript. `[Mid]`

**Answer:**
A closure is a function that retains access to its outer scope even after the outer function has returned.

```javascript
function makeCounter() {
  let count = 0;
  return {
    increment: () => ++count,
    decrement: () => --count,
    value: () => count,
  };
}

const counter = makeCounter();
counter.increment(); // 1
counter.increment(); // 2
counter.value();     // 2
```

**Why it works:** `count` is in the closure scope, not garbage collected because the returned object holds references to functions that reference `count`.

**Practical uses:** Data encapsulation, factory functions, event handlers, memoization.

---

### 13. What is the event loop in JavaScript? `[Mid]`

**Answer:**
JavaScript is single-threaded. The event loop allows non-blocking async operations:

1. **Call Stack** — where synchronous code runs (LIFO)
2. **Web APIs** — handles async operations (setTimeout, fetch, DOM events)
3. **Callback Queue (Macrotask)** — callbacks from Web APIs queue here
4. **Microtask Queue** — Promise callbacks (`.then`, `async/await`), `queueMicrotask`

**Order:** After each macrotask, ALL microtasks are drained before the next macrotask.

```javascript
console.log('1');
setTimeout(() => console.log('4'), 0);
Promise.resolve().then(() => console.log('3'));
console.log('2');
// Output: 1, 2, 3, 4
```

---

### 14. What is prototypal inheritance in JavaScript? `[Mid]`

**Answer:**
Every JavaScript object has an internal `[[Prototype]]` link to another object. When accessing a property, JS looks up the prototype chain until it finds it or reaches `null`.

```javascript
const animal = { breathe() { return 'breathing'; } };
const dog = Object.create(animal);
dog.bark = function() { return 'woof'; };

dog.bark();    // 'woof' (own property)
dog.breathe(); // 'breathing' (inherited from animal)
```

**`class` syntax** is syntactic sugar over prototypal inheritance — `extends` sets up the prototype chain.

---

### 15. Explain `this` in JavaScript. `[Mid]`

**Answer:**
`this` refers to the execution context and changes based on how a function is called:

| Context | `this` value |
|---------|-------------|
| Global (non-strict) | `window` (browser) |
| Global (strict mode) | `undefined` |
| Object method | The object |
| Arrow function | Lexical `this` (inherited from enclosing scope) |
| `new` call | The new instance |
| `call`/`apply`/`bind` | First argument |

**Key insight:** Arrow functions do NOT have their own `this` — this is why they're useful as callbacks inside class methods.

---

### 16. What is `async/await` and how does it work? `[Junior]`

**Answer:**
`async/await` is syntactic sugar over Promises that makes async code read like synchronous code:

```javascript
// Promise chain
fetch('/api/user')
  .then(res => res.json())
  .then(data => console.log(data))
  .catch(err => console.error(err));

// async/await equivalent
async function getUser() {
  try {
    const res = await fetch('/api/user');
    const data = await res.json();
    console.log(data);
  } catch (err) {
    console.error(err);
  }
}
```

`await` pauses execution of the `async` function until the Promise resolves/rejects. It does NOT block the thread.

**Follow-up:** How to run multiple async calls in parallel? → `Promise.all([fetch1, fetch2])` not sequential `await`.

---

### 17. What is the difference between `==` and `===`? `[Junior]`

**Answer:**
- `===` (strict equality) — compares value AND type. No coercion. **Always use this.**
- `==` (loose equality) — performs type coercion before comparing. Leads to surprising results:

```javascript
0 == false     // true
'' == false    // true
null == undefined // true
1 == '1'       // true
[] == 0        // true
```

**Rule of thumb:** Use `===` everywhere. The only valid use case for `==` is `x == null` (matches both `null` and `undefined`).

---

### 18. What are JavaScript generators? `[Senior]`

**Answer:**
Generators are functions that can be paused and resumed, yielding multiple values on demand:

```javascript
function* range(start, end) {
  for (let i = start; i <= end; i++) {
    yield i;
  }
}

const gen = range(1, 3);
gen.next(); // { value: 1, done: false }
gen.next(); // { value: 2, done: false }
gen.next(); // { value: 3, done: false }
gen.next(); // { value: undefined, done: true }
```

**Use cases:** Lazy sequences, infinite streams, custom iterators, `async` flow control (redux-saga).

---

### 19. What is memoization and when would you use it? `[Mid]`

**Answer:**
Memoization caches the results of expensive function calls so repeated calls with the same inputs return the cached result instantly:

```javascript
function memoize(fn) {
  const cache = new Map();
  return function(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

const expensiveFn = memoize((n) => {
  // complex computation
  return n * 2;
});
```

**When to use:** Pure functions (same input → same output), expensive computations, recursive algorithms (fibonacci, DP). React's `useMemo` and `useCallback` are forms of memoization.

---

### 20. What is the difference between `null`, `undefined`, and `NaN`? `[Junior]`

**Answer:**
- `undefined` — variable declared but not assigned, or function that returns nothing, or missing property
- `null` — explicitly assigned "no value." `typeof null === 'object'` (historical bug in JS)
- `NaN` — "Not a Number." Result of invalid math operations. `typeof NaN === 'number'`. Notably, `NaN !== NaN` — use `Number.isNaN()` to check.

```javascript
let x;
console.log(x);         // undefined
console.log(null == undefined); // true (loose)
console.log(null === undefined); // false (strict)
console.log(0 / 0);    // NaN
console.log(Number.isNaN(NaN)); // true
```

---

### 21. How does garbage collection work in JavaScript? `[Mid]`

**Answer:**
Modern engines use **mark-and-sweep** algorithm:
1. Start from "roots" (global objects, call stack variables)
2. Mark all objects reachable from roots
3. Sweep (free) all unmarked objects

**What causes memory leaks:**
- Uncleared timers/intervals that hold references
- Accidental global variables
- Closures retaining large objects unnecessarily
- DOM nodes removed from DOM but still referenced in JS
- `WeakMap`/`WeakSet` exist specifically to avoid these — they hold weak references that don't prevent GC.

---

### 22. What is event delegation? `[Mid]`

**Answer:**
Instead of attaching event listeners to each child element, attach one listener to a parent and use `event.target` to determine which child was clicked:

```javascript
// Without delegation (bad for 1000 items)
document.querySelectorAll('.item').forEach(item => {
  item.addEventListener('click', handleClick);
});

// With delegation (one listener for all items)
document.querySelector('.list').addEventListener('click', (e) => {
  if (e.target.matches('.item')) {
    handleClick(e);
  }
});
```

**Benefits:** Performance (one listener vs. N), works for dynamically added elements.

---

### 23. What is the difference between `call`, `apply`, and `bind`? `[Mid]`

**Answer:**
All three set `this` explicitly:
- `call(context, arg1, arg2)` — invokes immediately with individual args
- `apply(context, [arg1, arg2])` — invokes immediately with args as array
- `bind(context, arg1)` — returns a **new function** with `this` bound, does not invoke

```javascript
function greet(greeting, punctuation) {
  return `${greeting}, ${this.name}${punctuation}`;
}

const user = { name: 'Alice' };
greet.call(user, 'Hello', '!');      // "Hello, Alice!"
greet.apply(user, ['Hi', '?']);      // "Hi, Alice?"
const boundGreet = greet.bind(user);
boundGreet('Hey', '.');              // "Hey, Alice."
```

---

### 24. Explain the concept of immutability in JavaScript. `[Mid]`

**Answer:**
Immutability means not modifying existing data but creating new data instead:

```javascript
// Mutable (modifies original)
const arr = [1, 2, 3];
arr.push(4); // arr is now [1,2,3,4]

// Immutable patterns
const newArr = [...arr, 4];          // spread
const newObj = { ...obj, key: 'val' }; // object spread
const updated = arr.map(x => x * 2); // returns new array
```

**Why it matters:** Predictable state, easier debugging, enables change detection by reference comparison (React, Redux), enables time-travel debugging.

---

### 25. What is the module system in JavaScript (ESM vs CJS)? `[Mid]`

**Answer:**
- **CommonJS (CJS):** `require()` / `module.exports`. Used in Node.js. Synchronous, loads at runtime.
- **ES Modules (ESM):** `import` / `export`. Native JS standard. Asynchronous, statically analyzed, tree-shakeable.

```javascript
// CJS
const fs = require('fs');
module.exports = { fn };

// ESM
import { readFile } from 'fs/promises';
export { fn };
export default class MyClass {}
```

**Follow-up:** Why does ESM enable tree-shaking? → Static imports are analyzable at build time; bundlers can eliminate unused exports.

---

### 26. What is `Symbol` in JavaScript? `[Senior]`

**Answer:**
`Symbol` creates a unique, immutable primitive value. Every `Symbol()` call returns a unique value:

```javascript
const id1 = Symbol('id');
const id2 = Symbol('id');
console.log(id1 === id2); // false — always unique

// Use as object key
const obj = { [id1]: 'value' };
// Symbols are not enumerable in for...in or Object.keys()
```

**Use cases:** Private-ish object properties, well-known symbols (`Symbol.iterator`, `Symbol.toPrimitive`), avoiding key collisions in shared objects.

---

### 27. What are WeakMap and WeakSet? `[Senior]`

**Answer:**
- **WeakMap** — key-value pairs where keys must be objects. Keys are held weakly (don't prevent GC). Keys are not enumerable.
- **WeakSet** — set of objects. Objects are held weakly.

```javascript
const cache = new WeakMap();
function process(element) {
  if (cache.has(element)) return cache.get(element);
  const result = expensiveComputation(element);
  cache.set(element, result);
  return result;
}
// When `element` is removed from DOM, cache entry is GC'd automatically
```

**Use case:** Caching computed values for DOM elements without causing memory leaks.

---

### 28. What is the Proxy object? `[Senior]`

**Answer:**
`Proxy` wraps an object and intercepts operations on it (get, set, delete, etc.):

```javascript
const validator = new Proxy({}, {
  set(target, key, value) {
    if (typeof value !== 'number') throw new TypeError('Must be a number');
    target[key] = value;
    return true;
  }
});

validator.age = 25;   // OK
validator.age = 'old'; // TypeError
```

**Real-world uses:** Vue 3's reactivity system, form validation, logging, access control. `Reflect` is the companion API for default behavior.

---

### 29. How do you handle errors in JavaScript? `[Mid]`

**Answer:**
```javascript
// Synchronous
try {
  riskyOperation();
} catch (error) {
  if (error instanceof TypeError) {
    // handle specific error
  } else {
    throw error; // re-throw unknown errors
  }
} finally {
  cleanup(); // always runs
}

// Async
async function load() {
  try {
    const data = await fetchData();
    return data;
  } catch (error) {
    // Promise rejection caught here
    logger.error(error);
    throw error; // don't swallow errors
  }
}

// Global handler (last resort)
window.addEventListener('unhandledrejection', (e) => {
  console.error(e.reason);
});
```

---

### 30. What is optional chaining (`?.`) and nullish coalescing (`??`)? `[Junior]`

**Answer:**
- `?.` — short-circuits to `undefined` if left side is `null`/`undefined`, instead of throwing
- `??` — returns right side only if left side is `null`/`undefined` (not `0`, `''`, `false`)

```javascript
const user = { address: { city: 'Taipei' } };
user?.address?.city;    // 'Taipei'
user?.phone?.number;    // undefined (no throw)
user?.greet?.();        // undefined (no throw for methods)

const count = 0;
count ?? 'default';     // 0 (0 is not null/undefined)
count || 'default';     // 'default' (0 is falsy — often a bug)
```

---

## React (15 questions)

### 31. What is the virtual DOM and how does React use it? `[Junior]`

**Answer:**
The virtual DOM (vDOM) is a lightweight JavaScript representation of the real DOM. React keeps a vDOM in memory. When state changes:
1. React creates a new vDOM tree
2. **Diffing:** Compares new vDOM with previous (O(n) algorithm)
3. **Reconciliation:** Computes minimal changes needed
4. **Commits** only the real DOM changes

**Why it's fast:** Real DOM operations are expensive. Batching changes and computing the minimal diff reduces DOM manipulation.

**Follow-up:** Does React always use vDOM? → React Native uses the same reconciler but targets native mobile components instead. React Server Components bypass the vDOM entirely.

---

### 32. Explain the difference between `useMemo` and `useCallback`. `[Mid]`

**Answer:**
- `useMemo` — memoizes a **computed value**. Recomputes only when dependencies change.
- `useCallback` — memoizes a **function reference**. Returns same function instance if deps don't change.

```javascript
// useMemo: expensive computation
const sortedList = useMemo(
  () => items.sort((a, b) => a.name.localeCompare(b.name)),
  [items]
);

// useCallback: stable function reference for child component
const handleClick = useCallback((id) => {
  dispatch({ type: 'SELECT', id });
}, [dispatch]);
```

**When to use:** Only when the memoization cost is less than the recomputation/re-render cost. Premature optimization is harmful.

---

### 33. What is React reconciliation and the `key` prop? `[Mid]`

**Answer:**
During reconciliation, React compares element trees. The `key` prop helps React identify which items changed/added/removed in lists:

```jsx
// Wrong — uses index as key, breaks reconciliation on reorder/insert
{items.map((item, i) => <Item key={i} {...item} />)}

// Correct — stable, unique ID
{items.map(item => <Item key={item.id} {...item} />)}
```

**What happens with wrong keys:** React reuses DOM nodes incorrectly, causing bugs with input focus, animations, and uncontrolled component state.

---

### 34. What are React hooks and why were they introduced? `[Junior]`

**Answer:**
Hooks (introduced in React 16.8) are functions that let you use state and lifecycle features in function components.

**Why introduced:**
1. Class components had complex lifecycle methods that were hard to reason about
2. Logic couldn't be easily shared between components (HOCs and render props had wrapper hell)
3. `this` binding was confusing

**Common hooks:**
- `useState` — component state
- `useEffect` — side effects (data fetching, subscriptions, DOM updates)
- `useContext` — consume context without Consumer component
- `useRef` — mutable ref that persists between renders
- `useReducer` — complex state logic (like Redux pattern)
- `useMemo` / `useCallback` — performance optimization

---

### 35. Explain the `useEffect` cleanup function. `[Mid]`

**Answer:**
The function returned from `useEffect` runs before the effect runs again (on deps change) and when the component unmounts:

```javascript
useEffect(() => {
  const subscription = subscribe(userId);

  // Cleanup: runs before re-subscribing or on unmount
  return () => {
    subscription.unsubscribe();
  };
}, [userId]);
```

**Without cleanup:** Memory leaks from subscriptions, stale event listeners, attempting to update state on unmounted components.

**Follow-up:** What happens if you don't provide a deps array? → Effect runs after every render. Empty `[]` runs once (mount/unmount only).

---

### 36. What is React context and when should you use it? `[Mid]`

**Answer:**
Context provides a way to pass data through the component tree without prop drilling:

```jsx
const ThemeContext = createContext('light');

function App() {
  return (
    <ThemeContext.Provider value="dark">
      <DeepChild />
    </ThemeContext.Provider>
  );
}

function DeepChild() {
  const theme = useContext(ThemeContext); // 'dark'
  return <div className={theme}>...</div>;
}
```

**When to use:** Global data that many components need (theme, locale, current user, auth state).

**When NOT to use:** For frequent updates (causes re-renders in all consumers). For server state, use React Query/SWR. For complex client state, use Zustand/Redux.

---

### 37. What is the difference between controlled and uncontrolled components? `[Mid]`

**Answer:**
- **Controlled:** React is the single source of truth. Input value driven by state. Every change updates state.
- **Uncontrolled:** DOM is the source of truth. Access value via `ref` when needed.

```jsx
// Controlled
const [value, setValue] = useState('');
<input value={value} onChange={e => setValue(e.target.value)} />

// Uncontrolled
const inputRef = useRef();
<input ref={inputRef} defaultValue="initial" />
// Access: inputRef.current.value
```

**When to use uncontrolled:** Simple forms, file inputs, integrating with non-React libraries, performance-critical forms.

---

### 38. What is React.memo and when should you use it? `[Mid]`

**Answer:**
`React.memo` is a higher-order component that memoizes a component — it only re-renders if its props changed (shallow comparison):

```jsx
const ExpensiveComponent = React.memo(({ data, onAction }) => {
  return <div>{/* expensive render */}</div>;
});
```

**Use when:**
- Component renders frequently with unchanged props
- Component is expensive to render (large lists, complex charts)
- Parent re-renders often

**Don't use when:**
- Props change on every render anyway
- Component is cheap to render (optimization overhead exceeds benefit)

**Caveat:** Object/function props break memo unless you also use `useMemo`/`useCallback` for them.

---

### 39. Explain the React rendering lifecycle for function components. `[Mid]`

**Answer:**
```
1. Render phase (pure, no side effects):
   - Function executes, returns JSX
   - Reconciler diffs with previous vDOM

2. Commit phase:
   - React updates the real DOM
   - Layout effects run (useLayoutEffect) — synchronous
   - Browser paints

3. Passive effects:
   - useEffect runs — asynchronous, after paint
```

**Order within a render:**
```
parent render → child render → ...
→ child useLayoutEffect → parent useLayoutEffect
→ browser paint
→ child useEffect → parent useEffect
```

---

### 40. What are React Server Components? `[Senior]`

**Answer:**
RSC (introduced with Next.js App Router) allows components to run **on the server only**:

```jsx
// Server Component (default in App Router)
async function ProductPage({ id }) {
  const product = await db.products.findById(id); // Direct DB access!
  return <ProductDetail product={product} />;
}

// Client Component (opt in with 'use client')
'use client';
function AddToCart({ productId }) {
  const [loading, setLoading] = useState(false);
  // ...
}
```

**Benefits:** Zero JS bundle for server components, direct backend access, automatic streaming.

**Limitations:** No state, no hooks, no browser APIs in server components.

---

### 41. How does React handle performance optimization? `[Senior]`

**Answer:**
**Prevent unnecessary renders:**
- `React.memo` for components
- `useMemo` for expensive computations
- `useCallback` for stable function references
- State co-location (keep state close to where it's used)

**Code splitting:**
```jsx
const LazyComponent = React.lazy(() => import('./HeavyComponent'));
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>
```

**Virtual lists:** `react-window` or `react-virtual` for rendering only visible rows in large lists.

**Concurrent features:** `useTransition` to mark non-urgent updates, `useDeferredValue` to defer updating slow parts.

---

### 42. What is the React `useReducer` hook? `[Mid]`

**Answer:**
`useReducer` is an alternative to `useState` for complex state logic. It follows the Redux pattern:

```javascript
const initialState = { count: 0, loading: false };

function reducer(state, action) {
  switch (action.type) {
    case 'INCREMENT': return { ...state, count: state.count + 1 };
    case 'SET_LOADING': return { ...state, loading: action.payload };
    default: throw new Error(`Unknown action: ${action.type}`);
  }
}

function Counter() {
  const [state, dispatch] = useReducer(reducer, initialState);
  return (
    <button onClick={() => dispatch({ type: 'INCREMENT' })}>
      {state.count}
    </button>
  );
}
```

**Use when:** State has multiple sub-values, next state depends on previous state, transitions are complex.

---

### 43. What is the `useRef` hook? `[Mid]`

**Answer:**
`useRef` returns a mutable ref object whose `.current` property persists for the component's lifetime. It does NOT trigger re-renders when changed.

**Two use cases:**

1. Access DOM elements directly:
```javascript
const inputRef = useRef(null);
<input ref={inputRef} />
// Imperative: inputRef.current.focus()
```

2. Store mutable values that shouldn't cause re-renders:
```javascript
const renderCount = useRef(0);
renderCount.current++; // doesn't re-render
```

---

### 44. What are custom hooks and how do you create them? `[Mid]`

**Answer:**
Custom hooks are functions that start with `use` and can call other hooks. They extract reusable stateful logic:

```javascript
function useFetch(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(url)
      .then(res => res.json())
      .then(data => { if (!cancelled) setData(data); })
      .catch(err => { if (!cancelled) setError(err); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [url]);

  return { data, loading, error };
}
```

---

### 45. What is `Suspense` in React? `[Senior]`

**Answer:**
`Suspense` allows components to "wait" for something before rendering, showing a fallback UI:

```jsx
// Code splitting
<Suspense fallback={<Spinner />}>
  <LazyComponent />
</Suspense>

// Data fetching (with frameworks like Next.js, Relay)
<Suspense fallback={<Skeleton />}>
  <UserProfile userId={id} /> {/* throws promise internally */}
</Suspense>
```

**How it works:** A component "suspends" by throwing a Promise. React catches it, shows the fallback, and re-renders the component when the Promise resolves.

**React 18+ additions:** Streaming SSR with `Suspense` — components render incrementally as data loads.

---

## TypeScript (10 questions)

### 46. What is the difference between `interface` and `type` in TypeScript? `[Mid]`

**Answer:**
Both define shapes, but with key differences:

| Feature | `interface` | `type` |
|---------|-------------|--------|
| Declaration merging | ✅ | ❌ |
| Extends | `extends` keyword | Intersection `&` |
| Implements | ✅ | ✅ |
| Union types | ❌ | ✅ |
| Computed properties | ❌ | ✅ |
| Primitive aliases | ❌ | ✅ |

**Rule of thumb:** Use `interface` for public API shapes (allows augmentation). Use `type` for everything else.

---

### 47. What are TypeScript generics? `[Mid]`

**Answer:**
Generics allow you to write reusable code that works with multiple types while maintaining type safety:

```typescript
function identity<T>(arg: T): T {
  return arg;
}

identity<string>('hello'); // T = string
identity(42);              // T inferred as number

// Generic with constraint
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

// Generic class
class Stack<T> {
  private items: T[] = [];
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
}
```

---

### 48. What is `keyof` and `typeof` in TypeScript? `[Mid]`

**Answer:**
- `keyof T` — creates a union type of all keys of `T`
- `typeof x` — gets the TypeScript type of `x` (in a type position)

```typescript
interface User { id: number; name: string; email: string; }
type UserKey = keyof User; // 'id' | 'name' | 'email'

const config = { port: 3000, host: 'localhost' };
type Config = typeof config; // { port: number; host: string }

// Combined usage
function pick<T, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  return keys.reduce((acc, key) => ({ ...acc, [key]: obj[key] }), {} as Pick<T, K>);
}
```

---

### 49. What are utility types in TypeScript? `[Mid]`

**Answer:**
Built-in generic types that transform other types:

```typescript
interface User { id: number; name: string; email: string; age?: number; }

Partial<User>        // All properties optional
Required<User>       // All properties required
Readonly<User>       // All properties readonly
Pick<User, 'id' | 'name'>   // { id: number; name: string }
Omit<User, 'age'>           // User without 'age'
Record<string, User>        // { [key: string]: User }
Exclude<'a' | 'b' | 'c', 'b'> // 'a' | 'c'
Extract<'a' | 'b', 'a' | 'd'>  // 'a'
NonNullable<string | null | undefined> // string
ReturnType<typeof fn>  // return type of function
```

---

### 50. What is a discriminated union? `[Senior]`

**Answer:**
A discriminated union is a union type with a common literal type property (the discriminant) that TypeScript uses for type narrowing:

```typescript
type Shape =
  | { kind: 'circle'; radius: number }
  | { kind: 'square'; side: number }
  | { kind: 'rectangle'; width: number; height: number };

function area(shape: Shape): number {
  switch (shape.kind) {
    case 'circle':    return Math.PI * shape.radius ** 2;
    case 'square':    return shape.side ** 2;
    case 'rectangle': return shape.width * shape.height;
    // TypeScript warns if you don't handle all cases
  }
}
```

**Use case:** Modeling state machines, API responses with different payload shapes, action types in reducers.

---

### 51. What is type narrowing in TypeScript? `[Mid]`

**Answer:**
TypeScript narrows types based on control flow analysis:

```typescript
function process(input: string | number | null) {
  if (input === null) {
    return; // input is null here
  }
  if (typeof input === 'string') {
    input.toUpperCase(); // input is string here
  } else {
    input.toFixed(2); // input is number here
  }
}

// Custom type guard
function isUser(x: unknown): x is User {
  return typeof x === 'object' && x !== null && 'id' in x;
}
```

**Narrowing mechanisms:** `typeof`, `instanceof`, `in`, equality, type predicates (`x is T`), assertion functions.

---

### 52. What is `unknown` vs `any` in TypeScript? `[Mid]`

**Answer:**
- `any` — opt out of type checking completely. Operations on `any` are unchecked. Should be avoided.
- `unknown` — type-safe alternative to `any`. You must narrow/assert before performing operations.

```typescript
function processAny(x: any) {
  x.foo.bar(); // No error — TypeScript trusts you blindly
}

function processUnknown(x: unknown) {
  x.foo.bar(); // Error — must narrow first
  if (typeof x === 'string') {
    x.toUpperCase(); // OK after narrowing
  }
}
```

**Rule:** Use `unknown` for values from untrusted sources (API responses, `JSON.parse`, user input). Never use `any` unless migrating legacy code.

---

### 53. What are conditional types in TypeScript? `[Senior]`

**Answer:**
Conditional types select a type based on a condition:

```typescript
type IsArray<T> = T extends any[] ? true : false;
type IsString = IsArray<string>; // false
type IsNumbers = IsArray<number[]>; // true

// infer keyword
type UnpackArray<T> = T extends (infer Item)[] ? Item : T;
type Str = UnpackArray<string[]>; // string
type Num = UnpackArray<number>;   // number (not array)

// Practical use
type Awaited<T> = T extends Promise<infer R> ? R : T;
type Result = Awaited<Promise<string>>; // string
```

---

### 54. What is declaration merging in TypeScript? `[Senior]`

**Answer:**
TypeScript merges multiple declarations of the same name into one:

```typescript
// Interface merging
interface Window {
  myCustomProp: string;
}
// Now window.myCustomProp is typed (useful for augmenting globals)

// Module augmentation
declare module 'express' {
  interface Request {
    user?: User;
  }
}
// Now req.user is typed throughout your Express app
```

**Use cases:** Extending third-party types, polyfills, environment-specific global augmentation.

---

### 55. How do you type React components in TypeScript? `[Mid]`

**Answer:**
```typescript
// Function component
interface Props {
  name: string;
  age?: number;
  children?: React.ReactNode;
  onClick: (id: string) => void;
}

const MyComponent: React.FC<Props> = ({ name, age = 18, children, onClick }) => {
  return <div onClick={() => onClick(name)}>{children}</div>;
};

// Generic component
function List<T extends { id: string }>({ items, renderItem }: {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return <ul>{items.map(item => <li key={item.id}>{renderItem(item)}</li>)}</ul>;
}

// Event handling
const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setValue(e.target.value);
};

const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
  e.preventDefault();
};
```
