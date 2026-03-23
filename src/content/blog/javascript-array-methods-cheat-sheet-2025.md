---
title: "JavaScript Array Methods Cheat Sheet 2025 (Complete Reference)"
description: "Complete JavaScript array methods reference with examples. Covers map, filter, reduce, find, flat, at, toSorted, groupBy, and every modern array method you need."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["javascript", "arrays", "cheat-sheet", "frontend", "reference", "es2024"]
readingTime: "12 min read"
faq:
  - question: "What are the most important JavaScript array methods to know?"
    answer: "The essential ones: map (transform), filter (select), reduce (aggregate), find/findIndex (search), forEach (iterate), some/every (test), includes (membership), flat/flatMap (flatten), and the newer toSorted/toReversed/with (non-mutating versions)."
  - question: "What is the difference between map and forEach in JavaScript?"
    answer: "map returns a new array with transformed values — use it when you need the result. forEach returns undefined — use it for side effects (logging, updating external state). Always prefer map when you need the transformed array."
  - question: "How does reduce work in JavaScript?"
    answer: "reduce(callback, initialValue) iterates over an array, accumulating a single result. The callback receives (accumulator, currentValue, index, array). Use it for summing, grouping, flattening, or building any single value from an array."
---

JavaScript arrays have over 30 built-in methods. Knowing which one to reach for — and understanding the subtle differences between similar methods — is what separates junior developers from experienced ones.

This cheat sheet covers every important array method with practical examples, organized by use case.

---

## Transformation

### `map(callback)` → new array

Transform each element into something else. Never mutates the original.

```javascript
const prices = [10, 20, 30];

// Basic transformation
const doubled = prices.map(p => p * 2);
// [20, 40, 60]

// Transform objects
const users = [
  { id: 1, firstName: 'Alice', lastName: 'Smith' },
  { id: 2, firstName: 'Bob', lastName: 'Jones' },
];
const fullNames = users.map(u => `${u.firstName} ${u.lastName}`);
// ['Alice Smith', 'Bob Jones']

// Extract a field (use for select/pluck)
const ids = users.map(u => u.id);
// [1, 2]

// Map with index
const indexed = ['a', 'b', 'c'].map((item, i) => ({ index: i, value: item }));
// [{index: 0, value: 'a'}, ...]
```

### `flatMap(callback)` → flattened new array

Like `map` followed by `flat(1)`. Useful when each element maps to multiple results.

```javascript
const sentences = ['Hello world', 'foo bar'];
const words = sentences.flatMap(s => s.split(' '));
// ['Hello', 'world', 'foo', 'bar']

// Remove and expand in one step
const cart = [
  { item: 'shirt', variants: ['S', 'M', 'L'] },
  { item: 'hat', variants: ['One Size'] },
];
const allVariants = cart.flatMap(c => c.variants);
// ['S', 'M', 'L', 'One Size']
```

---

## Filtering

### `filter(callback)` → new array of matching elements

Returns only elements where the callback returns truthy. Never mutates.

```javascript
const nums = [1, 2, 3, 4, 5, 6];

// Basic filter
const evens = nums.filter(n => n % 2 === 0);
// [2, 4, 6]

// Filter objects
const activeUsers = users.filter(u => u.active);
const admins = users.filter(u => u.role === 'admin');

// Remove falsy values
const clean = [0, '', null, undefined, false, 1, 'hello'].filter(Boolean);
// [1, 'hello']

// Filter + map chained
const expensiveNames = products
  .filter(p => p.price > 100)
  .map(p => p.name);
```

### `find(callback)` → first matching element or `undefined`

Returns the first element that matches, stops searching immediately.

```javascript
const users = [
  { id: 1, name: 'Alice' },
  { id: 2, name: 'Bob' },
  { id: 3, name: 'Alice' },
];

const alice = users.find(u => u.name === 'Alice');
// { id: 1, name: 'Alice' }  ← first match only

const missing = users.find(u => u.name === 'Charlie');
// undefined
```

### `findIndex(callback)` → index of first match or `-1`

Like `find`, but returns the index instead of the element.

```javascript
const idx = users.findIndex(u => u.id === 2);
// 1

// Replace an item by id
const updated = [...users];
const i = updated.findIndex(u => u.id === 2);
if (i !== -1) updated[i] = { ...updated[i], name: 'Robert' };
```

### `findLast(callback)` / `findLastIndex(callback)` (ES2023)

Search from the end of the array.

```javascript
const logs = [
  { level: 'info', msg: 'start' },
  { level: 'error', msg: 'first error' },
  { level: 'info', msg: 'retry' },
  { level: 'error', msg: 'last error' },
];

const lastError = logs.findLast(l => l.level === 'error');
// { level: 'error', msg: 'last error' }
```

---

## Aggregation & Testing

### `reduce(callback, initialValue)` → single accumulated value

The most powerful array method. Can implement `map`, `filter`, `groupBy`, and more.

```javascript
const nums = [1, 2, 3, 4, 5];

// Sum
const sum = nums.reduce((acc, n) => acc + n, 0);
// 15

// Product
const product = nums.reduce((acc, n) => acc * n, 1);
// 120

// Max value
const max = nums.reduce((acc, n) => Math.max(acc, n), -Infinity);
// 5

// Group by
const people = [
  { name: 'Alice', dept: 'Engineering' },
  { name: 'Bob', dept: 'Marketing' },
  { name: 'Carol', dept: 'Engineering' },
];
const byDept = people.reduce((groups, person) => {
  const key = person.dept;
  return { ...groups, [key]: [...(groups[key] || []), person] };
}, {});
// { Engineering: [{...}, {...}], Marketing: [{...}] }

// Count occurrences
const words = ['apple', 'banana', 'apple', 'cherry', 'banana', 'apple'];
const counts = words.reduce((acc, word) => {
  acc[word] = (acc[word] || 0) + 1;
  return acc;
}, {});
// { apple: 3, banana: 2, cherry: 1 }

// Flatten (better: use flat())
const nested = [[1, 2], [3, 4], [5]];
const flat = nested.reduce((acc, arr) => acc.concat(arr), []);
// [1, 2, 3, 4, 5]
```

### `reduceRight(callback, initialValue)`

Like `reduce`, but iterates right-to-left.

```javascript
const flattened = [[1, 2], [3, 4], [5]].reduceRight((acc, arr) => acc.concat(arr), []);
// [5, 3, 4, 1, 2]
```

### `some(callback)` → boolean

Returns `true` if **any** element matches. Short-circuits on first match.

```javascript
const hasAdmin = users.some(u => u.role === 'admin');
const hasLargeOrder = orders.some(o => o.total > 1000);
```

### `every(callback)` → boolean

Returns `true` if **all** elements match. Short-circuits on first failure.

```javascript
const allActive = users.every(u => u.active);
const allPaid = invoices.every(i => i.paid);
```

### `includes(value)` → boolean

Tests for membership by reference equality (`===`). Fast for primitives.

```javascript
[1, 2, 3].includes(2);      // true
['a', 'b'].includes('c');   // false

// Note: does NOT work for objects (reference equality)
const obj = { id: 1 };
[obj].includes(obj);         // true
[{ id: 1 }].includes({ id: 1 }); // false ← different object
```

---

## Ordering

### `sort(compareFunction)` → mutated array ⚠️

**Mutates the original array.** Always sort a copy:

```javascript
// Sort strings alphabetically
const sorted = [...names].sort((a, b) => a.localeCompare(b));

// Sort numbers ascending
const ascending = [...nums].sort((a, b) => a - b);

// Sort numbers descending
const descending = [...nums].sort((a, b) => b - a);

// Sort objects by field
const byAge = [...people].sort((a, b) => a.age - b.age);

// Sort by multiple fields
const byLastThenFirst = [...people].sort((a, b) =>
  a.lastName.localeCompare(b.lastName) ||
  a.firstName.localeCompare(b.firstName)
);
```

### `toSorted(compareFunction)` → new array (ES2023)

Non-mutating version of `sort`. Prefer this in modern code.

```javascript
const original = [3, 1, 4, 1, 5];
const sorted = original.toSorted((a, b) => a - b);
// sorted: [1, 1, 3, 4, 5]
// original unchanged: [3, 1, 4, 1, 5]
```

### `reverse()` → mutated array ⚠️

Reverses in place. Use `toReversed()` for a new array.

```javascript
const reversed = [...arr].reverse();

// Or ES2023:
const reversed = arr.toReversed();
```

---

## Flattening

### `flat(depth)` → new flattened array

```javascript
const nested = [1, [2, [3, [4]]]];

nested.flat();      // [1, 2, [3, [4]]]  ← default depth 1
nested.flat(2);     // [1, 2, 3, [4]]
nested.flat(Infinity); // [1, 2, 3, 4]   ← completely flatten

// Real-world: flatten API response
const pages = [[item1, item2], [item3, item4]];
const allItems = pages.flat();
```

---

## Searching

### `indexOf(value)` / `lastIndexOf(value)` → index or -1

For primitives. Use `findIndex` for objects.

```javascript
const arr = [1, 2, 3, 2, 1];
arr.indexOf(2);      // 1 (first occurrence)
arr.lastIndexOf(2);  // 3 (last occurrence)
arr.indexOf(99);     // -1
```

---

## Modern Methods (ES2023+)

### `at(index)` → element

Supports negative indexing (count from end):

```javascript
const arr = ['a', 'b', 'c', 'd'];
arr.at(0);   // 'a'
arr.at(-1);  // 'd'  ← last element
arr.at(-2);  // 'c'

// Before: arr[arr.length - 1]
// After:  arr.at(-1)
```

### `with(index, value)` → new array (ES2023)

Non-mutating index replacement:

```javascript
const arr = [1, 2, 3, 4, 5];
const updated = arr.with(2, 99);
// updated: [1, 2, 99, 4, 5]
// arr unchanged: [1, 2, 3, 4, 5]
```

### `toSpliced(start, deleteCount, ...items)` → new array (ES2023)

Non-mutating version of `splice`:

```javascript
const arr = ['a', 'b', 'c', 'd'];
const result = arr.toSpliced(1, 2, 'x', 'y');
// result: ['a', 'x', 'y', 'd']
// arr unchanged
```

### `Object.groupBy(array, keyFn)` (ES2024)

```javascript
const products = [
  { name: 'Apple', category: 'fruit' },
  { name: 'Banana', category: 'fruit' },
  { name: 'Carrot', category: 'vegetable' },
];

const grouped = Object.groupBy(products, p => p.category);
// {
//   fruit: [{ name: 'Apple', ... }, { name: 'Banana', ... }],
//   vegetable: [{ name: 'Carrot', ... }]
// }
```

---

## Iteration

### `forEach(callback)` → `undefined`

Side effects only. Use `map` if you need a result.

```javascript
users.forEach(user => console.log(user.name));

// With index
items.forEach((item, index) => {
  console.log(`${index}: ${item}`);
});
```

---

## Array Creation

```javascript
// From iterables
Array.from('hello');           // ['h', 'e', 'l', 'l', 'o']
Array.from({ length: 5 }, (_, i) => i); // [0, 1, 2, 3, 4]

// Check if array
Array.isArray([]);    // true
Array.isArray({});    // false

// Spread to copy
const copy = [...original];

// Concat
const combined = [...arr1, ...arr2];
// Same as: arr1.concat(arr2)
```

---

## Quick Reference: Mutating vs Non-Mutating

| Mutating (modifies original) | Non-mutating (returns new array) |
|---|---|
| `sort()` | `toSorted()` (ES2023) |
| `reverse()` | `toReversed()` (ES2023) |
| `splice()` | `toSpliced()` (ES2023) |
| `push()`, `pop()` | `[...arr, item]` |
| `shift()`, `unshift()` | `arr.slice(1)` |
| `fill()` | `arr.with(index, value)` (ES2023) |

In React and other immutable-state frameworks, always use non-mutating versions or copy before mutating.

---

## Common Patterns

```javascript
// Remove duplicates
const unique = [...new Set(arr)];

// Remove duplicates by property
const uniqueById = arr.filter((item, i, a) =>
  a.findIndex(t => t.id === item.id) === i
);

// Intersection of two arrays
const intersection = a.filter(x => b.includes(x));

// Difference (items in a but not in b)
const diff = a.filter(x => !b.includes(x));

// Chunk array into groups of n
const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) =>
    arr.slice(i * n, i * n + n)
  );

// Zip two arrays
const zip = (a, b) => a.map((item, i) => [item, b[i]]);
```

---

## Related Tools

- [DevPlaybook Code Formatter](/tools/code) — Format your JavaScript array chains
- [DevPlaybook AI Code Review](/tools/ai-code-review) — Get feedback on your array method usage
- [DevPlaybook Diff Checker](/tools/code-diff) — Compare two versions of array transformation code

---

## Download the Developer Productivity Bundle

Master JavaScript arrays with the **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=js-array-methods-article)** — includes a printable JavaScript reference card, ES2024 feature guide, and code snippet library for common array operations.
