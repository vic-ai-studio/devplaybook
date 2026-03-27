---
title: "CSS View Transitions API: Smooth Page Animations Without JavaScript Frameworks 2026"
description: "The View Transitions API enables fluid page animations and shared element transitions natively in the browser — no React Spring, Framer Motion, or animation libraries required. Complete guide with real-world examples for 2026."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["css", "view-transitions", "web-animations", "javascript", "performance", "spa", "mpa"]
readingTime: "15 min read"
---

Smooth page transitions have always required a JavaScript animation framework — until now. The View Transitions API landed in Chrome 111, shipped in Safari 18, and has reached full cross-browser support in 2026. It gives you cinematic page transitions, shared element animations, and cross-document navigation effects using roughly 10 lines of JavaScript and a few CSS rules.

This guide covers everything: the API fundamentals, cross-document transitions for multi-page apps, shared element animations, the `::view-transition` pseudo-element system, browser support handling, and production patterns from real deployments.

---

## What Is the View Transitions API?

The View Transitions API is a browser-native mechanism for animating between two visual states. Instead of you manually positioning elements, capturing screenshots, and tweening between them — the browser does all of that automatically.

The mental model: you tell the browser "I'm about to change the DOM," the browser captures a screenshot of the current state, you make your DOM changes, the browser captures the new state, then animates between the two screenshots using CSS animations you control.

```javascript
// Without View Transitions — jarring instant swap
document.querySelector('#content').innerHTML = newContent;

// With View Transitions — smooth animated transition
document.startViewTransition(() => {
  document.querySelector('#content').innerHTML = newContent;
});
```

The second version produces a smooth crossfade by default. No CSS written yet.

---

## The Core API: `document.startViewTransition()`

The entire JavaScript API surface is one method:

```javascript
const transition = document.startViewTransition(updateCallback);
```

`updateCallback` is a synchronous or async function that makes your DOM changes. The browser:

1. Takes a screenshot of the current page (the "old" state)
2. Calls your `updateCallback`
3. Takes a screenshot of the new page state
4. Animates from old → new using `::view-transition` pseudo-elements

The returned `transition` object has several useful properties:

```javascript
const transition = document.startViewTransition(async () => {
  await fetchAndUpdateDOM();
});

// Promise that resolves when the transition animation is complete
await transition.finished;

// Promise that resolves when the new DOM state is rendered
await transition.ready;

// Skip the transition animation immediately
transition.skipTransition();
```

### Async Updates

If your DOM update involves fetching data, pass an async callback:

```javascript
async function navigateTo(url) {
  const transition = document.startViewTransition(async () => {
    const response = await fetch(url);
    const html = await response.text();
    document.querySelector('main').innerHTML =
      new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector('main').innerHTML;
  });

  await transition.finished;
  history.pushState({}, '', url);
}
```

---

## The `::view-transition` Pseudo-Element Tree

When a view transition runs, the browser creates a virtual pseudo-element tree overlaid on top of your page:

```
::view-transition
└── ::view-transition-group(root)
    └── ::view-transition-image-pair(root)
        ├── ::view-transition-old(root)   ← screenshot of old state
        └── ::view-transition-new(root)   ← screenshot of new state
```

The `root` group represents the entire page. You can target these with CSS to customize the animation:

```css
/* Slow down the default crossfade */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 500ms;
}

/* Custom easing */
::view-transition-old(root) {
  animation: fade-out 300ms ease-in forwards;
}

::view-transition-new(root) {
  animation: fade-in 300ms ease-out forwards;
}

@keyframes fade-out {
  from { opacity: 1; }
  to { opacity: 0; }
}

@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
```

### Slide Transition Example

```css
@keyframes slide-out-left {
  to { transform: translateX(-100%); }
}

@keyframes slide-in-right {
  from { transform: translateX(100%); }
}

::view-transition-old(root) {
  animation: slide-out-left 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

::view-transition-new(root) {
  animation: slide-in-right 400ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
}
```

---

## Named Transitions: `view-transition-name`

The real power of the API comes from **named view transitions** — animating specific elements independently from the rest of the page. This is what creates the "shared element transition" effect you've seen in Material Design apps.

```css
/* Give a specific element its own transition group */
.hero-image {
  view-transition-name: hero;
}

.page-title {
  view-transition-name: page-title;
}
```

When you use `view-transition-name`, the browser creates a separate pseudo-element group for that element:

```
::view-transition
├── ::view-transition-group(root)     ← entire page fade
├── ::view-transition-group(hero)     ← hero image animated separately
└── ::view-transition-group(page-title) ← title animated separately
```

The browser automatically handles moving the named element from its position on the old page to its position on the new page — even if the positions are completely different. This is the "shared element" animation:

```javascript
// User clicks a card in a grid
function expandCard(cardElement) {
  // Tag the element before the transition
  cardElement.style.viewTransitionName = 'expanded-card';

  document.startViewTransition(() => {
    // Navigate to detail view
    renderDetailView(cardElement.dataset.id);

    // The detail view's hero image should have the same name
    document.querySelector('.detail-hero')
      .style.viewTransitionName = 'expanded-card';
  });
}
```

### Critical Rule: Names Must Be Unique

`view-transition-name` values must be unique per page snapshot. Duplicate names cause the browser to skip the transition for those elements. Always clear names after a transition:

```javascript
function startTransition(element) {
  element.style.viewTransitionName = 'card';

  const transition = document.startViewTransition(() => {
    updateView();
  });

  transition.finished.then(() => {
    element.style.viewTransitionName = '';
  });
}
```

---

## Customizing Named Element Animations

Named transition groups have their own `::view-transition-old(name)` and `::view-transition-new(name)` pseudo-elements:

```css
/* Default crossfade for root */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 300ms;
}

/* Hero image: scale + fade with longer duration */
::view-transition-old(hero) {
  animation: scale-fade-out 400ms ease-in forwards;
}

::view-transition-new(hero) {
  animation: scale-fade-in 400ms ease-out forwards;
}

@keyframes scale-fade-out {
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}

@keyframes scale-fade-in {
  from {
    opacity: 0;
    transform: scale(1.2);
  }
}

/* Title: slide in from below */
::view-transition-new(page-title) {
  animation: slide-up 350ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes slide-up {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
}
```

---

## Cross-Document Transitions (MPA)

The original API required JavaScript and was SPA-only. The cross-document View Transitions API (now in Chrome 126+ and Safari 18.2+) enables transitions between actual separate HTML pages — no JavaScript required for basic transitions.

### Opt-In with CSS

```css
/* In your CSS (both pages need this) */
@view-transition {
  navigation: auto;
}
```

That's the entire opt-in. With this single declaration, navigating between pages on the same origin automatically produces a crossfade.

### Customizing Cross-Document Transitions

The same `::view-transition` pseudo-elements work for cross-document transitions. Put this in a shared CSS file:

```css
@view-transition {
  navigation: auto;
}

/* Custom page transition */
::view-transition-old(root) {
  animation: slide-out 300ms ease-in forwards;
}

::view-transition-new(root) {
  animation: slide-in 300ms ease-out forwards;
}

@keyframes slide-out {
  to { transform: translateX(-30px); opacity: 0; }
}

@keyframes slide-in {
  from { transform: translateX(30px); opacity: 0; }
}
```

### Named Elements Across Pages

For shared element transitions across pages, assign the same `view-transition-name` to corresponding elements on both pages:

```html
<!-- Page 1: product listing -->
<img
  src="/products/shoe-1.jpg"
  alt="Red Sneaker"
  style="view-transition-name: product-1-image"
/>

<!-- Page 2: product detail -->
<img
  src="/products/shoe-1.jpg"
  alt="Red Sneaker"
  style="view-transition-name: product-1-image"
/>
```

The browser matches the names and animates the image from its position on page 1 to its position on page 2 — giving you the fluid, app-like "expand from card" transition pattern.

For dynamic content where you don't know the element in advance:

```css
/* Use a CSS custom property to generate unique names */
.product-card {
  view-transition-name: var(--product-id);
}
```

```javascript
// Set the custom property from data
cards.forEach(card => {
  card.style.setProperty('--product-id', `product-${card.dataset.id}`);
});
```

---

## The `pageswap` and `pagereveal` Events

For programmatic control over cross-document transitions, two new events fire during navigation:

```javascript
// Fires on the old page before it unloads
window.addEventListener('pageswap', (event) => {
  if (event.viewTransition) {
    const url = new URL(event.activation.entry.url);

    // Customize transition based on destination
    if (url.pathname.startsWith('/products/')) {
      event.viewTransition.types.add('product-detail');
    }
  }
});

// Fires on the new page before it renders
window.addEventListener('pagereveal', (event) => {
  if (event.viewTransition) {
    const fromUrl = new URL(navigation.activation.from.url);

    if (fromUrl.pathname === '/products') {
      event.viewTransition.types.add('product-expand');
    }
  }
});
```

### Transition Types

`viewTransition.types` is a `Set` that lets you categorize transitions and apply different CSS:

```javascript
document.startViewTransition(() => {
  loadNextPage();
}).types = new Set(['slide-forward']);

// Going back
document.startViewTransition(() => {
  loadPreviousPage();
}).types = new Set(['slide-back']);
```

```css
/* Apply different animations based on transition type */
html:active-view-transition-type(slide-forward) {
  &::view-transition-old(root) {
    animation: slide-out-left 400ms ease-in forwards;
  }
  &::view-transition-new(root) {
    animation: slide-in-right 400ms ease-out forwards;
  }
}

html:active-view-transition-type(slide-back) {
  &::view-transition-old(root) {
    animation: slide-out-right 400ms ease-in forwards;
  }
  &::view-transition-new(root) {
    animation: slide-in-left 400ms ease-out forwards;
  }
}
```

---

## Fallback Handling for Unsupported Browsers

Always check for API support before using View Transitions:

```javascript
function navigate(url) {
  if (!document.startViewTransition) {
    // Fallback: instant navigation
    updatePage(url);
    return;
  }

  document.startViewTransition(() => updatePage(url));
}
```

For cross-document transitions, the `@view-transition` rule is simply ignored by unsupported browsers — no fallback code needed.

### CSS Feature Detection

```css
/* Only apply transition-related styles when supported */
@supports (view-transition-name: test) {
  .hero {
    view-transition-name: hero;
  }
}
```

### Respecting Reduced Motion

Always respect `prefers-reduced-motion`:

```css
@media (prefers-reduced-motion: reduce) {
  ::view-transition-old(root),
  ::view-transition-new(root) {
    animation: none;
  }

  /* Let named elements just crossfade instead of moving */
  ::view-transition-group(*) {
    animation-duration: 0.01ms;
  }
}
```

---

## Browser Support in 2026

| Browser | Same-document | Cross-document (`@view-transition`) |
|---------|--------------|--------------------------------------|
| Chrome 126+ | ✅ Full | ✅ Full |
| Edge 126+ | ✅ Full | ✅ Full |
| Safari 18.2+ | ✅ Full | ✅ Full |
| Firefox 130+ | ✅ Partial | ✅ Partial |

As of 2026, the API has ~90% global browser coverage for same-document transitions. Cross-document transitions are at ~80% (Firefox support is partial — basic transitions work, some advanced features don't).

---

## Real-World Implementation: SPA Router Integration

Here's how to integrate View Transitions into a vanilla JavaScript SPA router:

```javascript
class Router {
  constructor() {
    this.routes = new Map();
    this.currentPath = location.pathname;

    // Handle back/forward navigation
    window.addEventListener('popstate', (e) => {
      this.navigate(location.pathname, { skipPush: true });
    });
  }

  register(path, component) {
    this.routes.set(path, component);
  }

  async navigate(path, options = {}) {
    if (path === this.currentPath) return;

    const component = this.routes.get(path);
    if (!component) return;

    // Determine transition direction
    const isForward = this.historyStack?.indexOf(path) === -1;

    if (!document.startViewTransition) {
      // No support — instant update
      await component.render(document.querySelector('#app'));
      if (!options.skipPush) history.pushState({}, '', path);
      this.currentPath = path;
      return;
    }

    const transition = document.startViewTransition(async () => {
      await component.render(document.querySelector('#app'));
    });

    // Tag transition direction for CSS
    transition.types = new Set([isForward ? 'forward' : 'back']);

    if (!options.skipPush) history.pushState({}, '', path);
    this.currentPath = path;

    await transition.finished;
  }
}
```

---

## Performance Considerations

View Transitions are GPU-accelerated and use compositor-layer screenshots — they're inherently performant. But a few patterns can degrade performance:

**Avoid `view-transition-name` on large, complex elements.** Each named element requires a separate GPU texture. Setting `view-transition-name` on a container with 100 children is expensive.

**Limit simultaneous named transitions.** More than 5–6 named elements animating simultaneously taxes the GPU on low-end devices. Profile on real hardware.

**Use `contain: layout` on transition containers.** This prevents transition animations from triggering layout recalculations in sibling elements:

```css
.transition-container {
  contain: layout;
  view-transition-name: main-content;
}
```

**Prefer `transform` and `opacity` in your custom animations.** These run on the compositor thread. Animating `width`, `height`, or `margin` in your custom keyframes defeats the performance advantage.

---

## Practical Example: E-Commerce Product Expansion

A complete example showing card-to-detail shared element transition:

```html
<!-- Product grid page -->
<div class="product-grid">
  <article class="product-card" data-id="42">
    <img class="card-image" src="/products/42.jpg" alt="Product">
    <h2>Product Name</h2>
    <button class="view-details">View Details</button>
  </article>
</div>
```

```javascript
document.querySelectorAll('.view-details').forEach(btn => {
  btn.addEventListener('click', async (e) => {
    const card = e.target.closest('.product-card');
    const productId = card.dataset.id;

    // Assign transition names before the transition
    const cardImage = card.querySelector('.card-image');
    cardImage.style.viewTransitionName = `product-image`;

    const transition = document.startViewTransition(async () => {
      const detailHtml = await fetchProductDetail(productId);
      document.querySelector('main').innerHTML = detailHtml;

      // The detail page hero must have the same name
      document.querySelector('.detail-hero').style.viewTransitionName =
        `product-image`;
    });

    transition.finished.then(() => {
      // Clean up — names must be unique per snapshot
      const hero = document.querySelector('.detail-hero');
      if (hero) hero.style.viewTransitionName = '';
    });
  });
});
```

```css
/* Animate the hero image from card size to full width */
::view-transition-group(product-image) {
  animation-duration: 400ms;
  animation-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Fade the rest of the page */
::view-transition-old(root),
::view-transition-new(root) {
  animation-duration: 250ms;
}
```

---

## Conclusion

The View Transitions API removes one of the last compelling reasons to reach for a JavaScript animation framework for page transitions. The browser-native implementation is faster, requires less JavaScript, works with server-rendered pages, and degrades gracefully.

The cross-document `@view-transition` support is the more exciting development — it brings app-like transitions to traditional multi-page sites with a single CSS rule. CMS-powered sites, e-commerce storefronts, and documentation sites can all gain fluid transitions without adding client-side JavaScript.

Start with the basics: `document.startViewTransition()` wrapping your DOM updates, and `view-transition-name` on 1–2 key elements. Once you see the browser handling the animation math, you'll wonder why you ever wrote manual animation code.

---

## Resources

- [MDN: View Transitions API](https://developer.mozilla.org/en-US/docs/Web/API/View_Transitions_API) — Complete API reference
- [Chrome Developers: Getting Started Guide](https://developer.chrome.com/docs/web-platform/view-transitions) — Detailed tutorial with demos
- [Can I Use: View Transitions](https://caniuse.com/view-transitions) — Current browser support table
- [Jake Archibald's Deep Dive](https://jakearchibald.com/2024/view-transitions-handling-staggered-animations/) — Advanced staggered animation patterns
