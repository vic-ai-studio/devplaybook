---
title: "JavaScript Array Methods Cheat Sheet: map, filter, reduce, and More"
description: "Every JavaScript array method explained with concise examples. From map and filter to flatMap and sort — your go-to quick reference."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["javascript", "arrays", "cheat-sheet", "frontend", "web-development"]
readingTime: "8 min read"
---

JavaScript arrays come with a rich set of built-in methods that cover nearly every data-manipulation need. Instead of reaching for a utility library, master these native methods and your code stays lean and readable. This cheat sheet covers every essential array method with a one-sentence description and a practical example.

## Transformation Methods

### `map`

Returns a new array where each element is the result of calling the callback.

```js
const prices = [10, 20, 30];
const withTax = prices.map(p => p * 1.08);
// [10.8, 21.6, 32.4]
```

### `filter`

Returns a new array containing only elements where the callback returns `true`.

```js
const scores = [45, 72, 88, 33, 95];
const passing = scores.filter(s => s >= 60);
// [72, 88, 95]
```

### `reduce`

Reduces the array to a single value by accumulating results through the callback.

```js
const cart = [{ price: 12 }, { price: 8 }, { price: 25 }];
const total = cart.reduce((sum, item) => sum + item.price, 0);
// 45
```

Always supply the initial value (second argument to `reduce`) to avoid surprising behavior on empty arrays.

### `flat`

Flattens nested arrays by the specified depth (default: 1).

```js
const nested = [1, [2, 3], [4, [5, 6]]];
nested.flat();    // [1, 2, 3, 4, [5, 6]]
nested.flat(2);   // [1, 2, 3, 4, 5, 6]
nested.flat(Infinity); // fully flatten any depth
```

### `flatMap`

Maps each element and then flattens the result one level — more efficient than `map` followed by `flat(1)`.

```js
const sentences = ["hello world", "foo bar"];
const words = sentences.flatMap(s => s.split(" "));
// ["hello", "world", "foo", "bar"]
```

## Search and Testing Methods

### `find`

Returns the **first** element where the callback returns `true`, or `undefined` if none match.

```js
const users = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
const user = users.find(u => u.id === 2);
// { id: 2, name: "Bob" }
```

### `findIndex`

Returns the index of the **first** matching element, or `-1` if none match.

```js
const items = ["apple", "banana", "cherry"];
const idx = items.findIndex(item => item.startsWith("b"));
// 1
```

### `some`

Returns `true` if **at least one** element satisfies the callback (short-circuits on first match).

```js
const numbers = [1, 3, 5, 4, 7];
const hasEven = numbers.some(n => n % 2 === 0);
// true
```

### `every`

Returns `true` if **all** elements satisfy the callback (short-circuits on first failure).

```js
const ages = [21, 25, 30];
const allAdults = ages.every(age => age >= 18);
// true
```

### `includes`

Returns `true` if the array contains the specified value (uses strict equality, `===`).

```js
const roles = ["admin", "editor", "viewer"];
roles.includes("editor");  // true
roles.includes("owner");   // false
```

### `indexOf`

Returns the index of the first occurrence of a value, or `-1` if not found.

```js
const fruits = ["apple", "banana", "apple"];
fruits.indexOf("apple");    // 0
fruits.lastIndexOf("apple"); // 2 — searches from the end
```

## Iteration Methods

### `forEach`

Executes a callback for each element. Returns `undefined` — not chainable like `map`.

```js
const logs = ["start", "process", "end"];
logs.forEach((entry, index) => {
  console.log(`${index}: ${entry}`);
});
// 0: start
// 1: process
// 2: end
```

Use `map` when you need the result; use `forEach` when you only need the side effect.

## Slicing and Splicing

### `slice`

Returns a shallow copy of a portion of the array from `start` to `end` (exclusive) — **does not mutate** the original.

```js
const arr = [0, 1, 2, 3, 4];
arr.slice(1, 3);   // [1, 2]
arr.slice(-2);     // [3, 4] — last two elements
arr.slice();       // full shallow copy
```

### `splice`

Adds, removes, or replaces elements **in place** — **mutates** the original array.

```js
const arr = ["a", "b", "c", "d"];
arr.splice(1, 2);         // removes 2 items at index 1 → arr is ["a", "d"]
arr.splice(1, 0, "x", "y"); // insert at index 1 without removing
arr.splice(2, 1, "z");    // replace 1 item at index 2 with "z"
```

## Ordering Methods

### `sort`

Sorts the array **in place** and returns the array. Default sort is lexicographic (string-based) — always provide a compare function for numbers.

```js
const nums = [10, 2, 30, 4];
nums.sort();              // [10, 2, 30, 4] — WRONG for numbers!
nums.sort((a, b) => a - b); // [2, 4, 10, 30] — ascending
nums.sort((a, b) => b - a); // [30, 10, 4, 2] — descending

const words = ["banana", "apple", "cherry"];
words.sort(); // ["apple", "banana", "cherry"] — fine for strings
```

### `reverse`

Reverses the array **in place**.

```js
const arr = [1, 2, 3];
arr.reverse(); // [3, 2, 1] — arr is now mutated
// To avoid mutation:
const reversed = [...arr].reverse();
```

## Combining Methods

### `concat`

Returns a new array that is the result of merging two or more arrays — **does not mutate**.

```js
const a = [1, 2];
const b = [3, 4];
const c = a.concat(b, [5, 6]); // [1, 2, 3, 4, 5, 6]
// Equivalent spread syntax:
const c2 = [...a, ...b, 5, 6];
```

### `join`

Converts the array to a string, with elements separated by the given delimiter.

```js
const parts = ["2026", "03", "20"];
parts.join("-");   // "2026-03-20"
parts.join(", ");  // "2026, 03, 20"
parts.join("");    // "20260320"
```

## Chaining in Practice

The real power of array methods is chaining them together:

```js
const orders = [
  { product: "Widget", qty: 3, price: 9.99, shipped: true },
  { product: "Gadget", qty: 1, price: 49.99, shipped: false },
  { product: "Doohickey", qty: 5, price: 4.99, shipped: true },
];

// Total revenue from shipped orders only
const shippedRevenue = orders
  .filter(o => o.shipped)
  .reduce((sum, o) => sum + o.qty * o.price, 0);
// (3 * 9.99) + (5 * 4.99) = 54.92

// Product names in uppercase, sorted alphabetically
const names = orders
  .map(o => o.product.toUpperCase())
  .sort();
// ["DOOHICKEY", "GADGET", "WIDGET"]
```

## Mutation Quick Reference

Knowing which methods mutate the original array prevents nasty bugs:

| Mutates original | Does NOT mutate |
|---|---|
| `sort`, `reverse` | `map`, `filter`, `reduce` |
| `splice` | `slice`, `concat`, `flat`, `flatMap` |
| `push`, `pop`, `shift`, `unshift` | `find`, `findIndex`, `some`, `every` |

When working with React state or other immutable patterns, always prefer the non-mutating methods or spread a copy first: `[...arr].sort(...)`.

These methods cover the overwhelming majority of array work in real codebases. Bookmark this page and refer back until the patterns are automatic.
