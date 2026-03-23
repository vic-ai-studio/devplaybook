---
title: "HTML/CSS/JavaScript Fundamentals: The Core Every Developer Must Know in 2026"
description: "The essential HTML, CSS, and JavaScript knowledge that separates senior developers from juniors. Covers semantic HTML, CSS specificity, JavaScript async patterns, and common mistakes."
date: "2026-03-24"
tags: ["html", "css", "javascript", "frontend", "fundamentals"]
readingTime: "3 min read"
---

# HTML/CSS/JavaScript Fundamentals: The Core Every Developer Must Know in 2026

## Semantic HTML Matters

```html
<!-- ❌ Non-semantic -->
<div class="nav">
  <div class="item"><a href="/">Home</a></div>
  <div class="item"><a href="/about">About</a></div>
</div>

<!-- ✅ Semantic -->
<nav>
  <a href="/">Home</a>
  <a href="/about">About</a>
</nav>
```

**Why:** Screen readers, search engines, and browsers understand semantic HTML better. It's also easier to style.

## CSS Specificity

When multiple rules target the same element, CSS specificity decides who wins:

| Selector | Specificity Score |
|----------|------------------|
| `*` | 0 |
| `p` | 1 |
| `.nav` | 10 |
| `#sidebar` | 100 |
| `style="..."` | 1000 |
| `!important` | Infinity (avoid) |

```css
/* Example specificity battle */
/* Line 1: specificity = 1 */
p { color: blue; }

/* Line 2: specificity = 10 */
.nav p { color: red; }     /* WINS — specificity 10 > 1 */

/* Line 3: specificity = 100 */
#sidebar p { color: green; }  /* WINS — specificity 100 > 10 */
```

**Rule:** Keep specificity low. Avoid `!important`. Use BEM or CSS Modules to scope styles.

## JavaScript Async: Promise vs async/await

```javascript
// ❌ Callback hell
getUser(userId, (user) => {
  getOrders(user.id, (orders) => {
    getProducts(orders, (products) => {
      render(user, orders, products);
    });
  });
});

// ✅ Promise chain
getUser(userId)
  .then(user => getOrders(user.id))
  .then(orders => getProducts(orders))
  .then(products => render(user, orders, products))
  .catch(error => console.error(error));

// ✅ async/await (recommended)
async function loadData(userId) {
  try {
    const user = await getUser(userId);
    const orders = await getOrders(user.id);
    const products = await getProducts(orders);
    render(user, orders, products);
  } catch (error) {
    console.error(error);
  }
}
```

## The Event Loop

```javascript
console.log('1');          // runs first (synchronous)

setTimeout(() => console.log('3'), 0);  // added to queue, runs after sync code

Promise.resolve().then(() => console.log('4'));  // added to microtask queue, runs before setTimeout

console.log('2');

// Output: 1 → 2 → 4 → 3
```

**Why:** Microtasks (Promises) run before macrotasks (setTimeout). The event loop processes all microtasks before picking up the next macrotask.

## DOM Manipulation Performance

```javascript
// ❌ Causes reflow every iteration
for (let i = 0; i < 1000; i++) {
  document.body.appendChild(document.createElement('div'));
}

// ✅ Batch DOM operations
const fragment = document.createDocumentFragment();
for (let i = 0; i < 1000; i++) {
  fragment.appendChild(document.createElement('div'));
}
document.body.appendChild(fragment);  // Single reflow
```

## The `this` Keyword

```javascript
const obj = {
  name: 'Alice',
  greet: function() {
    console.log(`Hello, ${this.name}`);
  },
  greetArrow: () => {
    console.log(`Hello, ${this.name}`);  // `this` is NOT obj!
  }
};

obj.greet();        // "Hello, Alice" — `this` is obj
obj.greetArrow();   // "Hello, undefined" — arrow captures outer `this`
```

## Local Storage vs Session Storage vs Cookies

| Feature | localStorage | sessionStorage | Cookies |
|---------|-------------|---------------|---------|
| Capacity | 5-10 MB | 5-10 MB | 4 KB |
| Expiry | Never | Tab close | Configurable |
| Sent with HTTP | ❌ No | ❌ No | ✅ Yes (automatically) |
| Accessible from JS | ✅ Yes | ✅ Yes | ✅ Yes |

```javascript
// localStorage
localStorage.setItem('token', 'abc123');
const token = localStorage.getItem('token');
localStorage.removeItem('token');
```
