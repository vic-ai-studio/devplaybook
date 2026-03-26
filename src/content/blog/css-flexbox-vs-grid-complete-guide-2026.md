---
title: "CSS Flexbox vs Grid: Complete Guide with Examples 2026"
description: "Master CSS Flexbox vs Grid with practical examples, comparison tables, and real-world layouts. Know exactly which layout tool to reach for in 2026."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["css", "flexbox", "css-grid", "web-development", "layout", "frontend", "responsive-design"]
readingTime: "14 min read"
---

If you've been writing CSS for more than a week, you've hit the question: **Flexbox or Grid?** Both are modern layout tools. Both handle alignment. Both are well-supported in 2026. But they're designed for different problems — and mixing them up leads to fragile, over-engineered layouts.

This guide gives you a complete picture of CSS Flexbox vs Grid: how each works, what each excels at, real code examples for every major layout pattern, and a practical decision framework you can apply to any design.

---

## TL;DR: The One-Sentence Rule

**Flexbox** solves one-dimensional layout problems (items in a row _or_ a column).

**CSS Grid** solves two-dimensional layout problems (items in rows _and_ columns simultaneously).

Everything below is an elaboration of this rule.

---

## Understanding CSS Flexbox

Flexbox (Flexible Box Layout) was introduced to solve the "why is vertical centering so hard?" problem. It gives you control over how items are distributed along a single axis — either horizontal or vertical.

### How Flexbox Thinks

When you write `display: flex`, you're creating a **flex container**. The container controls how its **flex items** are laid out. The key axis is the **main axis** (direction of flow) and the perpendicular **cross axis**.

```css
.container {
  display: flex;
  /* Default: items in a row, left to right */
}
```

```html
<div class="container">
  <div class="item">A</div>
  <div class="item">B</div>
  <div class="item">C</div>
</div>
```

*Visual: Three boxes side by side in a horizontal row, automatically sized to their content.*

### Core Flexbox Properties

**Container properties** — control all items:

```css
.flex-container {
  display: flex;

  /* Direction of the main axis */
  flex-direction: row;           /* → default: left to right */
  flex-direction: row-reverse;   /* ← right to left */
  flex-direction: column;        /* ↓ top to bottom */
  flex-direction: column-reverse;/* ↑ bottom to top */

  /* Alignment along main axis */
  justify-content: flex-start;   /* pack to start */
  justify-content: flex-end;     /* pack to end */
  justify-content: center;       /* center all items */
  justify-content: space-between;/* max gap between items */
  justify-content: space-around; /* equal gaps around items */
  justify-content: space-evenly; /* perfectly equal gaps */

  /* Alignment along cross axis */
  align-items: stretch;          /* default: fill container height */
  align-items: flex-start;       /* align to top */
  align-items: center;           /* vertical center */
  align-items: flex-end;         /* align to bottom */
  align-items: baseline;         /* align text baselines */

  /* Wrapping */
  flex-wrap: nowrap;             /* default: single row, may overflow */
  flex-wrap: wrap;               /* wrap to new lines */

  /* Gap between items */
  gap: 1rem;
  row-gap: 1rem;
  column-gap: 0.5rem;
}
```

**Item properties** — control individual items:

```css
.flex-item {
  /* How the item grows to fill extra space */
  flex-grow: 0;      /* default: don't grow */
  flex-grow: 1;      /* grow proportionally */

  /* How the item shrinks when space is tight */
  flex-shrink: 1;    /* default: shrink proportionally */
  flex-shrink: 0;    /* never shrink */

  /* Starting size before space is distributed */
  flex-basis: auto;  /* use item's natural size */
  flex-basis: 200px; /* start at exactly 200px */
  flex-basis: 0;     /* ignore natural size, distribute all space */

  /* Shorthand (grow shrink basis) */
  flex: 1;           /* flex: 1 1 0% — grow and shrink equally */
  flex: 0 0 200px;   /* fixed 200px, no flex behavior */
  flex: 1 0 auto;    /* grow but never shrink */

  /* Override container's align-items for this one item */
  align-self: center;

  /* Visual reordering without changing the DOM */
  order: -1;         /* move to front */
  order: 2;          /* move to end */
}
```

### Flexbox in Practice: 5 Real-World Patterns

#### Pattern 1: Navigation Bar

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 2rem;
  height: 64px;
}

.navbar-logo { font-weight: bold; }

.navbar-links {
  display: flex;
  gap: 2rem;
  list-style: none;
}

.navbar-actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}
```

*Result: Logo on the left, nav links centered, action buttons on the right — all vertically centered. This is Flexbox's home turf.*

#### Pattern 2: Card with Pushed Footer

```css
.card {
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  height: 100%;
}

.card-content {
  flex: 1; /* This is the key: push footer down */
}

.card-footer {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}
```

*Result: Card footer always sticks to the bottom regardless of content length — without absolute positioning.*

#### Pattern 3: Centering (Both Axes)

```css
.centered-hero {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  text-align: center;
}
```

*Result: Content perfectly centered in the viewport — the most common use of Flexbox.*

#### Pattern 4: Wrapping Tag/Badge List

```css
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #f3f4f6;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  white-space: nowrap;
}
```

*Result: Tags flow naturally, wrapping to the next line when they run out of horizontal space — no fixed column widths needed.*

#### Pattern 5: Sticky Footer Layout

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  margin: 0;
}

main {
  flex: 1; /* Grows to fill, pushes footer down */
}

footer {
  /* Always at the bottom, even on short pages */
}
```

*Result: Footer sticks to the bottom of the viewport on short pages, but scrolls naturally on long pages.*

---

## Understanding CSS Grid

CSS Grid (Grid Layout) is built for two-dimensional control. You define rows and columns explicitly, then place items anywhere in that grid — or let them auto-place.

### How Grid Thinks

When you write `display: grid`, you're creating a **grid container** with **tracks** (rows and columns). Items can span multiple tracks and be placed at specific intersections.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}
```

```html
<section class="card-grid">
  <article>Card 1</article>
  <article>Card 2</article>
  <article>Card 3</article>
  <article>Card 4</article>
  <article>Card 5</article>
  <article>Card 6</article>
</section>
```

*Visual: 6 cards arranged in a 3-column, 2-row grid. Equal widths, equal gaps. Cards auto-flow left to right, top to bottom.*

### Core Grid Properties

**Container properties:**

```css
.grid-container {
  display: grid;

  /* Define columns */
  grid-template-columns: 200px 1fr 1fr;         /* fixed + flexible */
  grid-template-columns: repeat(3, 1fr);         /* 3 equal columns */
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); /* responsive */

  /* Define rows */
  grid-template-rows: 60px 1fr 60px;            /* header + content + footer */
  grid-template-rows: auto;                      /* rows size to content */

  /* Named areas */
  grid-template-areas:
    "header header header"
    "sidebar main   main"
    "footer  footer footer";

  /* Gaps */
  gap: 1rem;
  row-gap: 1.5rem;
  column-gap: 1rem;

  /* Auto-generated row height */
  grid-auto-rows: minmax(100px, auto);

  /* Alignment of all items */
  justify-items: start | center | end | stretch;
  align-items: start | center | end | stretch;
}
```

**Item properties:**

```css
.grid-item {
  /* Place by line numbers */
  grid-column: 1 / 3;       /* from column line 1 to 3 (spans 2 cols) */
  grid-row: 2 / 4;          /* from row line 2 to 4 (spans 2 rows) */

  /* Span syntax (relative) */
  grid-column: span 2;      /* take 2 columns */
  grid-row: span 3;         /* take 3 rows */

  /* Place in named area */
  grid-area: header;
  grid-area: sidebar;
  grid-area: main;

  /* Self-alignment */
  justify-self: center;
  align-self: center;
}
```

### Grid in Practice: 5 Real-World Patterns

#### Pattern 1: Responsive Card Grid (No Media Queries)

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

*Result: At 900px → 3 columns. At 600px → 2 columns. At 320px → 1 column. Zero media queries. This is Grid's killer feature.*

#### Pattern 2: Full Page App Layout

```css
.app-shell {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 64px 1fr 48px;
  grid-template-areas:
    "sidebar header"
    "sidebar main"
    "sidebar footer";
  height: 100vh;
}

.sidebar { grid-area: sidebar; }
.header  { grid-area: header; }
.main    { grid-area: main; overflow-y: auto; }
.footer  { grid-area: footer; }
```

*Result: Classic app layout with fixed sidebar, scrollable main area, and sticky footer — in ~15 lines of CSS.*

#### Pattern 3: Magazine / Editorial Layout

```css
.magazine {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-auto-rows: 200px;
  gap: 1rem;
}

.feature-article {
  grid-column: span 4;
  grid-row: span 2;
}

.side-article {
  grid-column: span 2;
}

.wide-article {
  grid-column: span 6;
}
```

*Result: Hero article takes 4 of 6 columns and 2 rows. Sidebar articles fill the remaining space. This two-dimensional placement is impossible with Flexbox alone.*

#### Pattern 4: Dashboard Grid with Mixed Sizes

```css
.dashboard {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  grid-auto-rows: 120px;
  gap: 1rem;
}

.stat-card   { grid-column: span 3; }  /* 4 stats per row */
.chart-big   { grid-column: span 8; grid-row: span 3; }
.chart-small { grid-column: span 4; grid-row: span 2; }
.table-full  { grid-column: span 12; grid-row: span 4; }
```

*Result: Dashboard widgets of varying sizes locked into a consistent grid. Rearranging only requires changing `span` values.*

#### Pattern 5: Subgrid for Aligned Cards

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title | body | footer */
  gap: 1.5rem;
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherit parent's row tracks */
}

.card-title   { /* row 1 — always same height across cards */ }
.card-body    { /* row 2 — grows to fill, pushes footer down */ }
.card-footer  { /* row 3 — always aligned at the same baseline */ }
```

*Result: Card titles, bodies, and footers align across columns — even with varying content length. This requires Subgrid and is impossible with Flexbox.*

---

## Flexbox vs Grid: Full Comparison

### Feature Comparison Table

| Feature | CSS Flexbox | CSS Grid |
|---------|-------------|----------|
| **Dimension** | 1D (row OR column) | 2D (rows AND columns) |
| **Primary use** | Component layout | Page/section layout |
| **Axis control** | One main axis | Two axes simultaneously |
| **Item placement** | Flow-based (automatic) | Explicit or automatic |
| **Gap support** | ✅ `gap` property | ✅ `gap` property |
| **Alignment** | `justify-content`, `align-items` | `justify-items`, `align-items` |
| **Named areas** | ❌ | ✅ `grid-template-areas` |
| **Responsive without media queries** | With `flex-wrap` | With `auto-fill` + `minmax()` |
| **Overlap/layering** | ❌ | ✅ Items can overlap |
| **Subgrid** | ❌ | ✅ (CSS Grid Level 2) |
| **Order without DOM change** | ✅ `order` | ✅ `order` + placement |
| **Content-driven sizing** | ✅ Natural | ✅ Natural |
| **Track-driven sizing** | ❌ | ✅ Explicit row/column sizes |

### Use Case Decision Table

| Layout Task | Best Tool | Why |
|------------|-----------|-----|
| Navigation bar (horizontal) | **Flexbox** | Single row, space distribution |
| Vertical navigation menu | **Flexbox** | Single column, item stacking |
| Button group / toolbar | **Flexbox** | Single axis, gap control |
| Tag/chip cloud | **Flexbox** | Wrapping in one direction |
| Centering (single item) | **Either** | Both work well |
| Card grid (equal columns) | **Grid** | Two-dimensional layout |
| Page skeleton (header/sidebar/main) | **Grid** | Named areas, 2D placement |
| Hero section | **Flexbox** | Center content vertically + horizontally |
| Dashboard with mixed widget sizes | **Grid** | Explicit span control |
| Editorial/magazine layout | **Grid** | Non-uniform item sizes across 2D |
| Sticky footer | **Flexbox** | `flex: 1` on main content |
| Media object (image + text) | **Flexbox** | Row with controlled alignment |
| Form field rows | **Either** | Flexbox for inline, Grid for aligned labels |
| Responsive grid (auto-responsive) | **Grid** | `auto-fill` + `minmax()` |
| Items overlapping | **Grid** | Can place multiple items in same cell |
| Unknown number of columns | **Flexbox** | Items wrap naturally |

### Browser Support Table (2026)

| Feature | Chrome | Firefox | Safari | Edge | Global |
|---------|--------|---------|--------|------|--------|
| Flexbox | 29+ ✅ | 28+ ✅ | 9+ ✅ | 12+ ✅ | ~99% |
| CSS Grid (basic) | 57+ ✅ | 52+ ✅ | 10.1+ ✅ | 16+ ✅ | ~99% |
| CSS Grid (subgrid) | 117+ ✅ | 71+ ✅ | 16+ ✅ | 117+ ✅ | ~95% |
| CSS Grid (masonry) | 🧪 flag | 🧪 flag | ❌ | 🧪 flag | Experimental |
| `gap` in Flexbox | 84+ ✅ | 63+ ✅ | 14.1+ ✅ | 84+ ✅ | ~97% |

**Bottom line:** Use Flexbox and Grid freely in 2026. The only exception is Subgrid — check support if your audience includes older browsers. Masonry layout is still experimental.

---

## Combining Flexbox and Grid

The most maintainable approach: **Grid for the outer structure, Flexbox for the inner components**. They are not competitors — they complement each other.

```css
/* 1. Grid defines the page structure */
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 64px 1fr 48px;
  grid-template-areas:
    "nav    header"
    "nav    main"
    "nav    footer";
  min-height: 100vh;
}

/* 2. Flexbox handles nav item layout */
.nav {
  grid-area: nav;
  display: flex;
  flex-direction: column;
  padding: 1rem;
  gap: 0.25rem;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
}

/* 3. Flexbox handles header layout */
.header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

/* 4. Grid handles the main content layout */
.main {
  grid-area: main;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  align-content: start;
  gap: 1rem;
  padding: 1.5rem;
  overflow-y: auto;
}

/* 5. Flexbox handles each card's internal layout */
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.card-body {
  flex: 1; /* Push card footer to bottom */
}
```

This is the pattern used in virtually every modern dashboard, admin panel, and SaaS app UI.

---

## Common Mistakes and How to Fix Them

### Mistake 1: Using Flexbox When You Need Two-Dimensional Control

```css
/* ❌ Flexbox card grid — row heights are coupled, spanning is impossible */
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.card {
  flex: 0 0 calc(33.333% - 1rem); /* Fragile width calculation */
}

/* ✅ Grid — automatic columns, no width math */
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}
```

### Mistake 2: Using Grid When Flexbox Is Simpler

```css
/* ❌ Overkill for a simple nav */
.nav {
  display: grid;
  grid-template-columns: auto 1fr auto;
}

/* ✅ Flexbox is perfect for one-dimensional distribution */
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

### Mistake 3: Forgetting `align-content` on Wrapping Flex Containers

```css
/* ❌ Rows bunch together when wrapping */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* ✅ Control how wrapped rows distribute space */
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-content: flex-start; /* or center, space-between */
}
```

### Mistake 4: Fixed Columns That Break on Small Screens

```css
/* ❌ Always 3 columns regardless of viewport */
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

/* ✅ Responsive without media queries */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}
```

### Mistake 5: Using `width` Instead of `flex-basis`

```css
/* ❌ Confusing — width conflicts with flex calculations */
.item {
  flex: 1;
  width: 200px;
}

/* ✅ Use flex-basis for the base size */
.item {
  flex: 0 0 200px; /* no grow, no shrink, exactly 200px */
}
```

---

## Quick Decision Framework

Ask these questions when starting a layout:

**1. Does the layout have explicit rows AND columns?**
- Yes → Grid
- No → Go to question 2

**2. Are items flowing in a single direction (row or column)?**
- Yes → Flexbox
- No → Grid

**3. Do any items need to span multiple rows OR multiple columns?**
- Yes → Grid
- No → Either works; prefer Flexbox for simpler setups

**4. Is the number of items unknown (dynamic data)?**
- Items should wrap naturally → Flexbox with `flex-wrap: wrap`
- Items should form a responsive grid → Grid with `auto-fill` + `minmax`

**5. Are you building a page-level structure vs a component?**
- Page structure → Grid (for named areas, 2D placement)
- UI component → Flexbox (for alignment, spacing)

---

## Related DevPlaybook Resources

Deepen your CSS layout skills with these DevPlaybook guides:

- **[CSS Flexbox Complete Guide](/blog/css-flexbox-complete-guide)** — Deep dive into every Flexbox property with visual examples
- **[CSS Grid Guide](/blog/css-grid-guide)** — Master CSS Grid from zero to advanced layouts
- **[HTML, CSS & JavaScript Fundamentals](/blog/html-css-javascript-fundamentals)** — Start here if you're new to CSS
- **[Top CSS Tools for Web Developers](/blog/top-css-tools-for-web-developers)** — Browser DevTools, generators, and frameworks
- **[Best Tailwind CSS Tools & Resources](/blog/best-tailwind-css-tools-resources-developers-2026)** — If you're working with utility-first CSS
- **[CSS in JS vs Tailwind vs CSS Modules](/blog/css-in-js-vs-tailwind-vs-css-modules-comparison-2025)** — Architectural choices for modern styling

---

## Key Takeaways

- **Flexbox = one-dimensional layout.** Items in a row or a column. Use it for navigation bars, toolbars, card internals, centering, and wrapping item lists.

- **CSS Grid = two-dimensional layout.** Items in rows AND columns. Use it for page structure, card grids, dashboards, and any layout where items need to span or be placed at specific grid positions.

- **Combine them:** Grid for page structure, Flexbox inside each grid cell. Most production UIs use both together.

- **`repeat(auto-fill, minmax(X, 1fr))`** is the most powerful responsive Grid pattern — zero media queries needed for responsive column behavior.

- **Subgrid** (2026) solves the aligned-card-heights problem without JavaScript. Check browser support for older audiences.

- **Both are safe to use in 2026.** Browser support for core Flexbox and Grid features is at 99%+.

The fastest way to internalize the difference: build the same layout twice — once with Flexbox, once with Grid. You'll immediately feel where each one fights you and where it clicks.
