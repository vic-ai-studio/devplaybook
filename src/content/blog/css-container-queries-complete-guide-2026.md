---
title: "CSS Container Queries: The Complete Guide for Modern Web Development (2026)"
description: "Master CSS container queries including @container, container-type, container-name, style queries, size queries, and how to build truly responsive components without media queries."
date: "2026-04-01"
author: "DevPlaybook Team"
tags: ["css", "container-queries", "responsive-design", "frontend", "web-development"]
readingTime: "13 min read"
---

CSS container queries have fundamentally changed how front-end developers think about responsive design. For over a decade, media queries were the only tool available for adapting layouts to screen dimensions — a viewport-centric model that worked well for page-level layouts but fell apart when building reusable components. Container queries solve this at the source: instead of asking "how wide is the screen?", they ask "how wide is my parent element?"

This guide covers everything you need to know about container queries in 2026 — from the core `@container` rule to advanced patterns like style queries, container units, and integration with Tailwind CSS and modern component frameworks.

## Why Media Queries Were Never Enough

Media queries gave developers the ability to adapt styles to the viewport. That was genuinely powerful for top-level layout decisions: switching from a single-column to a multi-column grid, hiding a sidebar, or adjusting type scale at large breakpoints.

The problem surfaces the moment you try to make a reusable component — a card, a product listing, a comment thread — that should look different depending on where it is placed. A product card in a three-column grid has different space available than the same card in a full-width promotional strip. With media queries, you had two bad options:

1. **Write per-context overrides** — scattered, context-coupled CSS that breaks the moment the component moves to a new location.
2. **Use JavaScript** — `ResizeObserver` with class toggling that adds runtime overhead and makes the component stateful.

Neither option is clean. Container queries eliminate the problem entirely by decoupling component style from viewport size.

## Browser Support in 2026

Container queries are now fully production-ready across all major browsers. Support for `@container` size queries (the core feature) shipped in:

- **Chrome/Edge**: 105+ (released August 2022)
- **Firefox**: 110+ (released February 2023)
- **Safari**: 16+ (released September 2022)

As of 2026, global browser support sits above 96% according to caniuse.com. You can use container queries without a polyfill in any modern production application. Style queries (a newer addition) have slightly lower but still substantial support, with all evergreen browsers covering them.

If you're maintaining legacy support for Safari 15 or older Chrome, you can still use container queries with the `@supports` rule as a progressive enhancement layer.

## The `container-type` Property

Before you can query a container, you must explicitly opt an element into containment. This is done with the `container-type` property, which accepts three values:

```css
/* Contain on the inline axis only (most common) */
.card-wrapper {
  container-type: inline-size;
}

/* Contain on both axes */
.widget-wrapper {
  container-type: size;
}

/* No containment — the default */
.normal-wrapper {
  container-type: normal;
}
```

**`inline-size`** is the value you'll use in the vast majority of cases. It establishes size containment on the inline axis (horizontal in left-to-right languages), which means the browser can respond to changes in element width. This is the lowest-cost option because it does not require block-size containment.

**`size`** establishes containment on both the inline and block axes. This is necessary when you need to query an element's height, but it comes with a constraint: the element cannot derive its size from its content in either direction. You must give it an explicit height, or it will collapse to zero.

**`normal`** is the default and disables containment. You might explicitly set this to reset an inherited value.

> Note: Setting `container-type` implicitly creates a new stacking context and establishes a new formatting context, similar to `overflow: hidden`. This can affect `z-index` stacking behavior.

## The `@container` Rule

Once an ancestor has `container-type` set, its descendants can query it using the `@container` at-rule. The syntax mirrors `@media` closely:

```css
@container (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 1fr 2fr;
  }
}

@container (width >= 600px) {
  .card__image {
    aspect-ratio: 16 / 9;
  }
}
```

The range syntax (`width >= 600px`) is the modern form, supported alongside the legacy `min-width`/`max-width` syntax. Both work. The range syntax is more readable for compound conditions:

```css
@container (400px <= width < 800px) {
  .card {
    font-size: 0.9rem;
  }
}
```

The query targets the **nearest ancestor that is a size container**. This automatic scoping is one of the most useful properties of container queries — you don't need to manually specify which container to query unless you have multiple nested containers.

## Named Containers with `container-name`

When you have nested containment — a card inside a sidebar inside a layout — the automatic "nearest ancestor" scoping might not target the right container. Named containers solve this:

```css
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

/* Shorthand using container property */
.layout {
  container: layout / inline-size;
}
```

You can then query a specific named container from anywhere in the subtree:

```css
@container sidebar (width < 300px) {
  .nav-item span {
    display: none;
  }
}

@container main (width > 800px) {
  .article-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

A container can have multiple names, separated by spaces:

```css
.widget {
  container-name: widget card interactive;
  container-type: inline-size;
}
```

This is useful when component libraries expose containers with known names that consumers can query against.

## Practical Example: The Adaptive Card Component

Here is a complete example of a card component that adapts its layout based on its container width — not the viewport:

```html
<div class="card-container">
  <article class="card">
    <img class="card__image" src="/product.jpg" alt="Product" />
    <div class="card__body">
      <h2 class="card__title">Product Name</h2>
      <p class="card__description">A brief description of the product.</p>
      <a class="card__cta" href="#">View Details</a>
    </div>
  </article>
</div>
```

```css
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Default: stacked layout (narrow containers) */
.card {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  border-radius: 0.5rem;
  background: white;
  box-shadow: 0 2px 8px rgb(0 0 0 / 0.1);
}

.card__image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  border-radius: 0.25rem;
}

/* Side-by-side layout when container is wide enough */
@container card (width >= 480px) {
  .card {
    flex-direction: row;
    align-items: start;
  }

  .card__image {
    width: 200px;
    aspect-ratio: 1 / 1;
    flex-shrink: 0;
  }
}

/* Expanded layout for very wide containers */
@container card (width >= 720px) {
  .card {
    gap: 2rem;
    padding: 2rem;
  }

  .card__image {
    width: 280px;
  }

  .card__title {
    font-size: 1.5rem;
  }
}
```

This card now works correctly whether placed in a narrow sidebar, a two-column grid, or a full-width feature row — with zero context-specific CSS overrides.

## Style Queries: Querying Computed Styles

Size queries answer "how big is my container?" Style queries go further and answer "what CSS custom property value does my container have?" This enables component theming based on context.

```css
/* Parent sets a custom property */
.card--featured {
  --featured: true;
}

/* Child queries that property */
@container style(--featured: true) {
  .card__badge {
    display: block;
  }

  .card__title {
    color: var(--color-featured);
  }
}
```

Style queries are particularly powerful for design token propagation. You can set a `--theme` custom property at the layout level and have all nested components automatically adapt without passing props through every layer of the component tree:

```css
.section--dark {
  --color-scheme: dark;
  background: #0f172a;
  color: #f8fafc;
}

@container style(--color-scheme: dark) {
  .button {
    background: #3b82f6;
    color: white;
  }

  .input {
    background: #1e293b;
    border-color: #334155;
  }
}
```

As of 2026, style queries for custom properties are fully supported in all evergreen browsers. Style queries for standard CSS properties (like `color` or `display`) are still in the specification process.

## Container Queries vs Media Queries: When to Use Each

These two tools solve different problems and work best together:

| Scenario | Use |
|---|---|
| Top-level page layout (sidebar, header, main) | Media query |
| Reusable component that adapts to its slot | Container query |
| Typography scale at the page level | Media query |
| Text overflow inside a flexible widget | Container query |
| Print styles | Media query |
| Card grid column count based on card container | Container query |
| `prefers-color-scheme`, `prefers-reduced-motion` | Media query (no container equivalent) |
| Component palette from parent context | Style query |

The general rule: **page structure uses media queries, components use container queries.** In practice, most production codebases need both — media queries at the layout layer and container queries at the component layer.

## Integration with Tailwind CSS

Tailwind CSS introduced first-class container query support via the official `@tailwindcss/container-queries` plugin. In Tailwind v4 (which ships with native CSS cascade layers and container query utilities), the workflow is even cleaner.

**Install the plugin (Tailwind v3):**

```bash
npm install @tailwindcss/container-queries
```

```js
// tailwind.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/container-queries'),
  ],
}
```

**Tailwind v4 (native support via CSS config):**

```css
/* app.css */
@import "tailwindcss";
```

**Usage in markup:**

```html
<!-- Define the container -->
<div class="@container">
  <!-- Query the container in children -->
  <div class="flex flex-col @md:flex-row gap-4">
    <img class="w-full @md:w-48" src="..." />
    <div>
      <h2 class="text-base @lg:text-xl">Title</h2>
      <p class="text-sm">Description</p>
    </div>
  </div>
</div>
```

Named containers work with the `@container/{name}` syntax:

```html
<div class="@container/sidebar">
  <nav class="hidden @sm/sidebar:block">...</nav>
</div>
```

The Tailwind breakpoints for container queries (`@sm`, `@md`, `@lg`, etc.) use the same pixel values as the responsive breakpoints but target the container width, not the viewport.

## Container Queries in React and Vue Components

Container queries are CSS-native and require no JavaScript framework integration. The only consideration is ensuring the container wrapper element is rendered and that `container-type` is applied.

**React:**

```jsx
// CardContainer.tsx
export function CardContainer({ children }: { children: React.ReactNode }) {
  return (
    <div className="card-container">
      {children}
    </div>
  );
}

// card-container.css
.card-container {
  container-type: inline-size;
  container-name: card;
}
```

For component libraries where you want consumers to be able to opt in to container query behavior without knowing implementation details:

```jsx
function ProductCard({ variant = "default" }) {
  return (
    <div data-container="product-card" style={{ containerType: "inline-size" }}>
      <div className={`card card--${variant}`}>
        {/* card content */}
      </div>
    </div>
  );
}
```

**Vue 3:**

```vue
<template>
  <div class="card-wrapper">
    <slot />
  </div>
</template>

<style scoped>
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

@container card (width >= 480px) {
  :deep(.card) {
    flex-direction: row;
  }
}
</style>
```

Note the use of `:deep()` in Vue scoped styles — this is required to pierce the scoped style boundary when the queried element is not in the same component as the container definition.

## Advanced Pattern: Fluid Typography with Container Units

Container queries introduced a new set of relative length units that work exactly like `vw`/`vh` but are relative to the nearest size container instead of the viewport:

| Unit | Definition |
|---|---|
| `cqw` | 1% of container's inline size |
| `cqh` | 1% of container's block size |
| `cqi` | 1% of container's inline size (logical) |
| `cqb` | 1% of container's block size (logical) |
| `cqmin` | Smaller of `cqi` and `cqb` |
| `cqmax` | Larger of `cqi` and `cqb` |

These units enable fluid typography at the component level:

```css
.hero-container {
  container-type: inline-size;
}

.hero__title {
  /* Scales from ~1.5rem at 300px wide to ~3rem at 900px wide */
  font-size: clamp(1.5rem, 5cqi, 3rem);
  line-height: 1.1;
}

.hero__subtitle {
  font-size: clamp(1rem, 2.5cqi, 1.5rem);
}
```

This is more powerful than viewport-based fluid typography (`clamp(1rem, 3vw, 2rem)`) because the scaling responds to the container's actual available width — so the same component placed in a narrow column and a wide full-bleed section both have correctly proportioned text without any additional overrides.

For cards in a grid, `cqi` units let text scale proportionally as the grid columns resize:

```css
.card-grid {
  container-type: inline-size;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
}

/* Each card is its own container */
.card {
  container-type: inline-size;
}

.card__title {
  font-size: clamp(0.9rem, 4cqi, 1.25rem);
}
```

This creates a self-regulating typography system — no media queries needed at any layer.

## CSS Layers and Container Queries Working Together

CSS Cascade Layers (`@layer`) and container queries are fully compatible and complement each other well. Layers handle specificity and override order; container queries handle responsive behavior. Combining them gives you a clean architecture for component libraries:

```css
@layer base, components, utilities;

@layer components {
  .card-container {
    container-type: inline-size;
    container-name: card;
  }

  .card {
    display: flex;
    flex-direction: column;
    padding: 1rem;
  }

  /* Container queries inside a layer work exactly as expected */
  @container card (width >= 480px) {
    .card {
      flex-direction: row;
    }
  }
}

@layer utilities {
  /* Utility overrides have higher specificity due to layer order */
  .flex-col {
    flex-direction: column !important;
  }
}
```

A common pattern for design systems is to define all container breakpoint behavior in a `components` layer, then allow the `utilities` layer to override specific properties when needed. This keeps component defaults clean while enabling fine-grained escape hatches.

You can also nest `@layer` inside `@container` — useful when third-party component styles need to be scoped within a container query:

```css
@container sidebar (width < 200px) {
  @layer overrides {
    .nav-label {
      display: none;
    }
  }
}
```

For more on the cascade and animation improvements, see the [CSS View Transitions guide](/blog/css-view-transitions-api-complete-guide-2026).

## Performance Considerations

Container queries are implemented natively in the browser layout engine, and their performance characteristics are generally good — but there are patterns to be aware of.

**Containment is free at idle, paid at layout time.** Setting `container-type: inline-size` tells the browser that the element's internal layout cannot affect the external size in the inline direction. This isolation actually enables layout optimizations in some cases, because the browser can skip re-checking parent constraints.

**`container-type: size` is more expensive.** Full two-axis containment prevents the element from being sized by its content, which breaks natural document flow. Avoid it unless you genuinely need to query height. If you only need width queries, `inline-size` is always the right choice.

**Avoid deep query chains.** A container query triggers a style recalculation for all elements inside the container that match the query. If you have deeply nested containers that each trigger queries on resize, you can create a cascade of layout work. Profile with Chrome DevTools' Layout panel if you notice jank during resize operations.

**Combine with `content-visibility`.** For components that are off-screen or conditionally rendered, pairing `container-type` with `content-visibility: auto` can significantly reduce render cost for complex off-screen UIs:

```css
.offscreen-panel {
  container-type: inline-size;
  content-visibility: auto;
  contain-intrinsic-size: 0 400px; /* Reserve approximate space */
}
```

**Don't over-containerize.** Not every element needs to be a container. Set `container-type` on the layout wrappers that directly control the available space for components — typically grid cells, flex children, or named layout regions. Applying it universally adds unnecessary containment context overhead.

## Pulling It All Together

Container queries represent a genuine architectural shift in CSS. The old model — viewport queries at the top, component overrides below — inverted responsibility. Container queries restore it: each component now describes its own behavior at different sizes, without needing to know where it will be placed.

In 2026, the full surface area of container queries is available to use:

- **Size queries** (`@container (width >= Npx)`) for layout adaptation
- **Style queries** (`@container style(--prop: value)`) for contextual theming
- **Container units** (`cqi`, `cqb`, etc.) for fluid scaling
- **Named containers** for precise multi-container scenarios
- **Tailwind integration** for utility-first workflows
- **`@layer` compatibility** for cascade-layer-organized codebases

Start by identifying your most context-dependent components — cards, widgets, panels, data tables — and refactor their responsive behavior from viewport breakpoints to container breakpoints. The immediate payoff is components that work correctly in every layout slot without per-context CSS patches. The longer-term payoff is a codebase where components are genuinely portable and self-contained.

Media queries are not going away. They remain the right tool for viewport-level decisions. But for everything inside the layout — everything that can be moved, reused, or embedded — container queries are now the default choice.
