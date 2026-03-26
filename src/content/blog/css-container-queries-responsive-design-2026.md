---
title: "CSS Container Queries: Responsive Design in 2026"
description: "A practical guide to CSS Container Queries — how they work, browser support in 2026, container query units, use cases vs media queries, and migration strategies for component-based responsive design."
date: "2026-03-27"
author: "DevPlaybook Team"
tags: ["css", "container-queries", "responsive-design", "frontend", "css-containment"]
readingTime: "14 min read"
---

For over a decade, media queries were the only reliable tool for responsive CSS. They solved a real problem: making layouts adapt to screen size. But they have a fundamental, structural flaw — they respond to the **viewport**, not to the **component's actual available space**. This limitation forced developers to write brittle overrides, context-specific hacks, and viewport-dependent breakpoints that broke the moment a component was placed somewhere new.

CSS Container Queries fix this at the architecture level. Instead of asking *"how wide is the viewport?"*, a component can now ask *"how wide is my container?"* — a shift that transforms how we build reusable, context-aware UI.

In this guide, you'll learn how container queries work, what the browser support landscape looks like in 2026, how to use the container query unit system, when to reach for container queries versus media queries, and how to migrate an existing codebase without breaking anything.

---

## What Are Container Queries and Why They Matter

Container queries let you apply CSS styles to an element based on the size (or style properties) of its nearest **containment context** — a parent element that has been explicitly designated as a container. The core idea is a shift from **viewport-relative responsiveness** to **container-relative responsiveness**.

The practical impact is significant. Consider a card component that needs to display its content vertically when narrow and horizontally when wide. With a media query approach, you might write:

```css
/* Media query approach — tied to viewport, not container */
.card {
  display: flex;
  flex-direction: column;
}

@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}
```

This works fine when the card occupies the full page width. But place that same card inside a 300px sidebar on a wide desktop viewport, and the media query fires incorrectly — the viewport is 1200px wide, so the card renders horizontally even though it only has 300px of available space. The result is a broken layout.

With container queries, the same card **asks about its own container**:

```css
/* Define the container */
.card-wrapper {
  container-type: inline-size;
}

/* Query the container */
.card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

@container (min-width: 450px) {
  .card {
    flex-direction: row;
    gap: 1.5rem;
  }
}
```

Now the card switches layout based on its own available space, regardless of where it's placed — sidebar, modal, grid cell, or full-width section. One component. Every context. No overrides.

As noted by the CODERCOPS team in early 2026, **container queries replaced 600 lines of media query overrides for reusable components** in a real production codebase — a compelling signal of the practical code reduction possible with this feature.

There are two parts to using container queries:

1. **Define a container** — set `container-type` on a parent element to establish a containment context.
2. **Query the container** — use `@container` rules to apply styles based on the container's dimensions or custom properties.

### Types of Container Queries

In 2026, three variants of container queries exist:

- **Container size queries** — Apply styles based on the container's dimensions (width, height, inline-size, block-size). This is the most widely supported variant and the focus of this article.
- **Container style queries** — Apply styles based on CSS custom property values defined on the container. Currently supported in Chrome 111+ and Edge 111+ only.
- **Container scroll-state queries** — Respond to scroll state (sticky, scrolled, scroll position). The newest variant.

As of late 2025, actual usage data shows that **fewer than 7% of developers reported using style queries**, and fewer than 1% reported using scroll-state queries, suggesting these advanced variants remain experimental for most of the CSS community.

---

## How @container Works: Syntax, container-type, and container-name

### The container-type Property

The `container-type` property establishes an element as a query container. It accepts three values:

```css
/* inline-size: containment on the inline axis only (width).
   This is the value you'll use approximately 95% of the time. */
.wrapper {
  container-type: inline-size;
}

/* size: containment on both inline and block axes (width + height).
   Requires the container to have an explicit height set.
   Useful for fixed-dimension panels like dashboard widgets. */
.fixed-panel {
  container-type: size;
  height: 400px;
}

/* normal: no containment (the default).
   Use this to disable a container you previously defined. */
.wrapper {
  container-type: normal;
}
```

Use `inline-size` as your default. It enables width-based queries without requiring an explicit height on the container. The `size` value tracks both width and height, but the container must have a declared height — if it doesn't, it may collapse to zero, which breaks the query.

Setting `container-type` also applies CSS **containment** to the element, which means the container cannot depend on its children for sizing in the contained axis. In practice, this is rarely a problem because containers are usually wrapper elements whose width is determined by the layout around them, not by their content.

### The container-name Property

When you have multiple nested containers, `container-name` lets you target a specific one in your queries. Without a name, `@container` queries match the nearest ancestor with `container-type` set.

```css
/* Name each container individually */
.page-layout {
  container-type: inline-size;
  container-name: layout;
}

.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}

.main-content {
  container-type: inline-size;
  container-name: main;
}

/* Query a specific container by name */
@container sidebar (min-width: 300px) {
  .sidebar-widget {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
}

@container main (min-width: 700px) {
  .article-card {
    flex-direction: row;
  }
}
```

### Shorthand: The container Property

The `container` shorthand combines `container-name` and `container-type` in a single declaration:

```css
/* Shorthand: container: <name> / <type> */
.sidebar {
  container: sidebar / inline-size;
}

/* Equivalent to: */
.sidebar {
  container-type: inline-size;
  container-name: sidebar;
}
```

The property also accepts a **list of names**, which is useful when a container might be queried from multiple contexts:

```css
.card {
  container: molecule card / inline-size;
}
```

### The @container At-Rule Syntax

The `@container` at-rule works analogously to `@media`, but queries the container instead of the viewport:

```css
/* Basic size query */
@container (min-width: 500px) {
  .component { /* styles */ }
}

/* Named container query */
@container card-area (min-width: 400px) {
  .card { /* styles */ }
}

/* Range syntax (CSS Media Queries Level 4 style) */
@container (width >= 600px) {
  .component { /* styles */ }
}

@container (300px <= width < 600px) {
  .component { /* medium layout */ }
}

/* Combining conditions */
@container (min-width: 500px) and (min-height: 300px) {
  .panel { /* both conditions must be true */ }
}
```

### Size Query Dimensions

With `container-type: inline-size`, you can query these dimensions:

```css
/* Width-based queries (require container-type: inline-size or size) */
@container (min-width: 400px) { ... }
@container (max-width: 599px) { ... }
@container (width >= 400px) { ... }
@container (400px <= width < 800px) { ... }

/* Logical equivalents using inline-size */
@container (min-inline-size: 400px) { ... }
@container (inline-size >= 400px) { ... }

/* Height-based queries (require container-type: size + explicit height) */
@container (min-height: 300px) { ... }
@container (height >= 300px) { ... }

/* Aspect ratio and orientation */
@container (aspect-ratio > 1) {
  /* Container is wider than it is tall */
}

@container (orientation: landscape) {
  /* Container width exceeds its height */
}
```

In practice, width-based queries dominate usage. Height queries are rare because they require `container-type: size` with an explicit height, which limits where they can be applied. Reserve height queries for fixed-dimension contexts like dashboard widgets or split-pane editors.

### Nesting @container Rules

You can nest `@container` rules for fine-grained control:

```css
@container (width >= 350px) {
  h2 {
    font-weight: bold;
  }

  @container (width < 500px) {
    h2 {
      color: red;
    }
  }
}
/* Text is red and bold between 350px and 499px.
   Above 499px, it is bold only. */
```

A more readable approach uses logical operators:

```css
@container (width >= 350px) and (width < 500px) {
  h2 {
    color: red;
  }
}
```

---

## Container Query Units

Container queries introduce six new length units relative to the container's dimensions. They work like viewport units (`vw`, `vh`) but are scoped to the query container, making them ideal for component-level fluid scaling.

### The Six Units

| Unit   | Definition                                          |
|--------|------------------------------------------------------|
| `cqw`  | 1% of a query container's width                     |
| `cqh`  | 1% of a query container's height                     |
| `cqi`  | 1% of a query container's inline size                |
| `cqb`  | 1% of a query container's block size                 |
| `cqmin` | The smaller value of either `cqi` or `cqb`          |
| `cqmax` | The larger value of either `cqi` or `cqb`            |

For horizontal writing modes (English, most European languages), `cqi` is equivalent to `cqw`. For vertical writing modes (Japanese, traditional Chinese), `cqi` refers to the vertical dimension — the container's height. For this reason, **CSS experts recommend using `cqi` and `cqb` over `cqw` and `cqh`** for writing-mode-agnostic, internationally-compatible CSS.

### Using Container Query Units in Practice

The real power of container query units emerges inside `clamp()` for fluid, bounded scaling:

```css
/* Fluid typography that scales with the container */
.card-title {
  font-size: clamp(1rem, 4cqi, 2rem);
}

/* Padding that grows proportionally */
.card-body {
  padding: clamp(0.75rem, 3cqi, 2rem);
}

/* Images that scale within their container */
.card-image {
  height: clamp(120px, 30cqi, 300px);
}

/* Responsive icon size */
.widget-icon {
  width: clamp(24px, 8cqi, 48px);
  height: clamp(24px, 8cqi, 48px);
}
```

`clamp(min, preferred, max)` works here as: *use the preferred value, but never go below min or above max*. With `4cqi` as the preferred value, the title's font size is always 4% of the container's inline size, scaled fluidly between 1rem and 2rem.

When no eligible container is available for the query, container query units fall back to the small viewport units (`sv*`) for that axis, ensuring content remains readable even in broken states.

---

## Container Queries vs Media Queries: A Decision Framework

This is the question practitioners ask most: *when should I use container queries, and when should I stick with media queries?*

The answer is not "replace one with the other" — it's "use the right tool for the right layer of layout."

### Media Queries Are Still Essential For:

- **Macro-level layout structures** — page grid columns, overall page breakpoints, full-width section changes
- **Viewport-level concerns** — viewport width, orientation, print styles
- **Device-level characteristics** — `prefers-color-scheme`, `prefers-reduced-motion`, `prefers-contrast`
- **Media type targeting** — `@media print`, `@media speech`

Media queries remain the correct choice when you're making decisions about the *page*, not about a *component within the page*.

### Container Queries Are the Right Choice When:

- A **component needs to adapt to its available space**, regardless of viewport
- The **same component is reused in multiple contexts** with different sizes (card in sidebar vs. card in main column)
- You want **self-contained responsive components** that don't require parent-level knowledge

As the MDN documentation states, container queries "enable you to apply styles to an element based on certain attributes of its container" — the emphasis is on *the element's container*, not the viewport.

### A Practical Decision Framework

Use this question as a litmus test:

> *"If I place this element in a 250px sidebar, a 600px content column, and a 1200px hero section — does it need to look different in each?"*

If yes → **Container query**. The component needs to know about its own space.

> *"Does this layout change apply to the entire page at a specific screen width?"*

If yes → **Media query**. The layout decision is page-level.

### The Complementary Pattern

The most robust responsive designs in 2026 use both together:

```css
/* Page-level: switch from 3-column to 1-column grid at 768px */
.page-grid {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 768px) {
  .page-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Component-level: card adapts to its column width */
.card-wrapper {
  container-type: inline-size;
}

@container (min-width: 400px) {
  .card {
    flex-direction: row;
  }
}
```

Container size queries represent a game-changer for component-based design — they fill a long-standing gap by making it possible to build components that are truly layout-agnostic. As LogRocket's 2025 analysis noted, container queries are best understood as a **complementary pattern** to media queries, not a wholesale replacement.

---

## Browser Support in 2026

Browser support for container queries has matured significantly. As of early 2026, the support landscape looks like this:

### Container Size Queries

Size container queries (the most widely used variant) are supported in:

- **Chrome 105+** (released August 2022)
- **Firefox 110+** (released February 2023)
- **Safari 16+** (released September 2022)
- **Edge 105+** (released August 2022)

This translates to **over 95% global browser coverage**, making size container queries safe to use in production without fallbacks for the vast majority of audiences.

### Container Style Queries

Style queries (`@container style()`) are currently limited:

- **Chrome 111+** and **Edge 111+** only
- **Firefox and Safari** support is still in development as of early 2026

If you use style queries, provide a non-style-query fallback for Firefox and Safari users.

### Container Scroll-State Queries

Scroll-state queries are the newest variant and have the most limited support. They require `container-type: scroll-state` to be set on the container. Expect this feature to be production-ready across all major browsers by late 2026.

### Feature Detection

Always feature-detect container query support using `@supports`:

```css
/* Fallback for browsers without container query support */
.card {
  display: flex;
  flex-direction: column;
}

/* Enhanced version for browsers with support */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  @container (min-width: 450px) {
    .card {
      flex-direction: row;
    }
  }
}
```

---

## Real-World Use Cases

### Card Components

The canonical container query use case. A card that switches from vertical to horizontal layout based on its available space — without any knowledge of the viewport:

```css
.card-wrapper {
  container-type: inline-size;
  container-name: card;
}

.card {
  display: flex;
  flex-direction: column;
  padding: 1rem;
}

@container card (min-width: 400px) {
  .card {
    flex-direction: row;
    align-items: center;
  }

  .card-image {
    width: 40%;
    flex-shrink: 0;
  }

  .card-body {
    flex: 1;
  }
}

@container card (min-width: 700px) {
  .card {
    padding: 1.5rem 2rem;
  }

  .card-title {
    font-size: clamp(1.25rem, 2cqi, 2rem);
  }
}
```

The same card component works in a sidebar (narrow, vertical layout), a main content column (medium, horizontal layout), and a featured section (wide, expanded layout with larger typography).

### Sidebar Widgets

Sidebar widgets have traditionally been difficult to style responsively because they sit in a narrow column regardless of viewport size. Container queries solve this cleanly:

```css
.sidebar {
  container: sidebar / inline-size;
}

.sidebar-widget {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

/* When the sidebar has enough space, switch to a 2-column grid */
@container sidebar (min-width: 280px) {
  .sidebar-widget {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: center;
  }

  .widget-icon {
    width: clamp(32px, 10cqi, 56px);
    height: clamp(32px, 10cqi, 56px);
  }
}

/* Wide sidebar: full details visible */
@container sidebar (min-width: 400px) {
  .widget-description {
    display: block;
  }

  .widget-cta {
    justify-self: end;
  }
}
```

### Image Galleries

Galleries that need to show different layouts based on the available space — a masonry-style 2-column grid when the container is narrow, a clean 4-column grid when there's room:

```css
.gallery-wrapper {
  container-type: inline-size;
  container-name: gallery;
}

.gallery {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: 1fr;
}

/* Medium gallery: 2 columns */
@container gallery (min-width: 400px) {
  .gallery {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Large gallery: 3 columns */
@container gallery (min-width: 600px) {
  .gallery {
    grid-template-columns: repeat(3, 1fr);
  }
}

/* Full gallery: 4 columns with aspect-ratio aware images */
@container gallery (min-width: 900px) {
  .gallery {
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }

  .gallery-item img {
    height: clamp(150px, 20cqi, 300px);
    object-fit: cover;
  }
}
```

---

## Migration Strategy: From Media Queries to Container Queries

Migrating from media queries to container queries doesn't have to be a big-bang rewrite. Follow this incremental strategy to reduce risk.

### Step 1: Audit Your Existing Components

Go through your component library and identify components that:

1. Have media query breakpoints tied to their internal layout (not page-level)
2. Are reused in multiple page contexts (sidebar, main content, modals, etc.)
3. Have override classes like `.card--sidebar`, `.card--featured`, `.card--compact`

These are your migration candidates. Truly page-level media queries (like changing the overall grid from 3 columns to 1) can stay as-is.

### Step 2: Identify the Container

For each migration candidate, identify the nearest semantic wrapper that should become the container. Don't add extra wrapper divs just for containment — use the element that's already there.

For a `Card` component, the container is likely the grid cell or section that holds the card, not the card itself. The card is the *child* being styled; the wrapper is the *container* being queried.

### Step 3: Add container-type Inline

Add `container-type: inline-size` to the container elements you've identified. Start with a non-breaking addition — this alone doesn't change any layout.

```css
/* Before */
.card-wrapper {
  /* existing styles */
}

/* After */
.card-wrapper {
  container-type: inline-size;
  /* existing styles */
}
```

### Step 4: Introduce @container Rules Incrementally

Start adding `@container` rules alongside existing media queries. The two can coexist during the transition:

```css
.card-wrapper {
  container-type: inline-size;
}

.card {
  /* Base styles — no breakpoint, mobile-first */
  display: flex;
  flex-direction: column;
}

/* Existing media query — keep for fallback */
@media (min-width: 768px) {
  .card {
    flex-direction: row;
  }
}

/* New container query — replaces the media query intent for this component */
@container (min-width: 450px) {
  .card {
    flex-direction: row;
    gap: 1.5rem;
  }
}
```

### Step 5: Feature-Detect for Progressive Enhancement

Use `@supports` to progressively enhance for browsers with container query support while maintaining fallback for older browsers:

```css
.card {
  display: flex;
  flex-direction: column;
}

@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  .card {
    /* Reset from media query fallback */
    flex-direction: column;
  }

  @container (min-width: 450px) {
    .card {
      flex-direction: row;
      gap: 1.5rem;
    }
  }
}
```

### Step 6: Remove Media Query Overrides

Once container queries are stable in your codebase and you're confident the fallback is no longer needed, remove the old media query overrides that were compensating for context-specific failures. This is where you'll see the biggest code reduction.

### What to Keep as Media Queries

Don't migrate these — they belong to media queries:

- `@media (prefers-color-scheme: dark)` — user preference, not container size
- `@media (min-width: X)` on page-level grid layouts — structural decisions
- `@media print` — media type targeting
- `@media (orientation: portrait)` on the viewport — device-level concern
- `@media (min-width: X) and (max-width: Y)` that define overall page breakpoints

---

## Polyfills and Fallbacks

Despite >95% global browser support for size container queries, production sites often need to support older browsers — particularly enterprise environments with mandated browser versions, or users in regions with slower browser update cycles.

### CSS-Based Fallback Pattern

The simplest fallback uses `@supports` for progressive enhancement:

```css
/* Baseline: single column, no container dependency */
.card {
  display: flex;
  flex-direction: column;
}

@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  @container (min-width: 400px) {
    .card {
      flex-direction: row;
    }
  }
}
```

### Grid and Flex Fallbacks for Layout Queries

For browsers that don't support container queries at all, grid and flex layouts can approximate the same behavior using percentage-based widths and media queries:

```css
/* Browser without container query support */
.card {
  display: grid;
  grid-template-columns: 1fr;
}

@media (min-width: 700px) and (max-width: 1199px) {
  /* Simulate narrow container behavior */
  .card {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1200px) {
  /* Simulate wide container behavior */
  .card {
    grid-template-columns: 2fr 1fr;
  }
}

/* With container query support: cleaner, context-aware */
@supports (container-type: inline-size) {
  .card-wrapper {
    container-type: inline-size;
  }

  .card {
    display: flex;
    flex-direction: column;
  }

  @container (min-width: 400px) {
    .card {
      flex-direction: row;
    }
  }

  @container (min-width: 700px) {
    .card {
      grid-template-columns: 2fr 1fr;
    }
  }
}
```

### CSS Houdini Container Queries Polyfill

For projects that need to support browsers with no container query support at all (e.g., very old Safari or Firefox ESR versions), the CSS Houdini-based Container Queries polyfill provides a JavaScript-based fallback that registers a custom `@container` style rule using the CSS Properties and Values API.

This polyfill has limitations — it requires JavaScript execution, adds runtime overhead, and doesn't support all container query features. Use it only when browser support gaps are a genuine business constraint.

### The PostCSS cq-fill Plugin

For projects using a PostCSS build pipeline, `postcss-container-query` allows you to write container query syntax and compiles it to compatible CSS for older browsers. This approach shifts the compatibility burden from runtime to build time, which is generally preferable for performance.

---

## Key Takeaways

1. **Container queries are not a replacement for media queries** — they're a complement. Media queries handle page-level layout decisions; container queries handle component-level responsiveness.

2. **Browser support is excellent for size queries** — over 95% global coverage as of 2026. You can use `container-type: inline-size` in production today without meaningful risk.

3. **Use `inline-size` as your default `container-type`** — it's the right choice for most components and doesn't require an explicit height.

4. **Name your containers** when you have multiple nested containers — this makes your CSS self-documenting and prevents accidental query mismatches.

5. **Container query units (`cqi`, `cqb`, `cqmin`, `cqmax`)** enable fluid typography and spacing that scales naturally with the container. Prefer `cqi`/`cqb` over `cqw`/`cqh` for writing-mode compatibility.

6. **Migrate incrementally** — identify context-dependent media query overrides, add `container-type`, introduce `@container` rules alongside existing queries, then remove the old overrides once stable.

7. **Style queries and scroll-state queries** are powerful future-facing features, but they have limited browser support. Use them with progressive enhancement in mind.

The shift from viewport-relative to container-relative responsiveness is one of the most significant architectural improvements in CSS in years. It makes components genuinely reusable, eliminates an entire class of context-specific overrides, and brings intrinsic web design principles into the component layer where they belong.

---

## Sources

- [MDN — CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Containment/Container_queries)
- [LogRocket Blog — Container Queries in 2026](https://blog.logrocket.com/container-queries-2026/) (December 2025)
- [DevToolbox — CSS Container Queries: The Complete Guide for 2026](https://devtoolbox.dedyn.io/blog/css-container-queries-guide) (February 11, 2026)
- [CODERCOPS — The State of CSS in 2026](https://www.codercops.com/blog/state-of-css-2026) (February 21, 2026)
- [Can I Use — CSS Container Queries](https://caniuse.com/css-container-queries)
- [Can I Use — CSS Container Query Units](https://caniuse.com/css-container-query-units)
- [FreeCodeCamp — Media Queries vs Container Queries](https://www.freecodecamp.org/news/media-queries-vs-container-queries/)
- [Josh W. Comeau — A Friendly Introduction to Container Queries](https://www.joshwcomeau.com/css/container-queries-introduction/)
