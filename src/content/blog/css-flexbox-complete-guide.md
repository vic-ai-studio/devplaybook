---
title: "CSS Flexbox Complete Guide: Properties, Examples, and Layouts"
description: "Master every CSS Flexbox property with clear examples. Build navbars, card grids, and centered layouts with confidence."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["css", "flexbox", "web-design", "frontend", "layout"]
readingTime: "9 min read"
---

CSS Flexbox transformed how developers build layouts. Before Flexbox, centering an element vertically required hacks. Today it takes one line. This complete guide covers every Flexbox property — container and item — with code examples for the layouts you build most often.

## How Flexbox Works

Flexbox operates on two axes: the **main axis** (determined by `flex-direction`) and the **cross axis** (perpendicular to it). Properties on the **flex container** control how items are distributed along both axes. Properties on **flex items** control how individual items size and position themselves.

## Container Properties

### `display: flex`

Turns an element into a flex container. All direct children become flex items.

```css
.container {
  display: flex;
}
/* Use display: inline-flex to keep the container inline */
```

### `flex-direction`

Sets the main axis direction.

```css
.container {
  flex-direction: row;            /* default — left to right */
  flex-direction: row-reverse;    /* right to left */
  flex-direction: column;         /* top to bottom */
  flex-direction: column-reverse; /* bottom to top */
}
```

Changing `flex-direction` to `column` makes `justify-content` control vertical distribution and `align-items` control horizontal distribution — the opposite of `row`.

### `justify-content`

Aligns items along the **main axis**.

```css
.container {
  justify-content: flex-start;    /* default — pack to start */
  justify-content: flex-end;      /* pack to end */
  justify-content: center;        /* center */
  justify-content: space-between; /* first and last at edges, space between */
  justify-content: space-around;  /* equal space around each item */
  justify-content: space-evenly;  /* equal space between all gaps */
}
```

### `align-items`

Aligns items along the **cross axis** (for a single row/column).

```css
.container {
  align-items: stretch;      /* default — items fill the cross size */
  align-items: flex-start;   /* align to cross-start edge */
  align-items: flex-end;     /* align to cross-end edge */
  align-items: center;       /* center on cross axis */
  align-items: baseline;     /* align text baselines */
}
```

### `flex-wrap`

Controls whether items wrap onto multiple lines.

```css
.container {
  flex-wrap: nowrap;        /* default — all items on one line, may overflow */
  flex-wrap: wrap;          /* items wrap to next line when needed */
  flex-wrap: wrap-reverse;  /* wrap to previous line */
}
```

### `align-content`

Aligns **rows** of wrapped items along the cross axis. Only has effect when `flex-wrap: wrap` and there are multiple rows.

```css
.container {
  align-content: flex-start;
  align-content: flex-end;
  align-content: center;
  align-content: space-between;
  align-content: space-around;
  align-content: stretch;    /* default */
}
```

### `gap`

Sets spacing between flex items without touching outer edges.

```css
.container {
  gap: 16px;           /* same gap on both axes */
  gap: 12px 24px;      /* row-gap column-gap */
  row-gap: 12px;
  column-gap: 24px;
}
```

`gap` replaces the old margin-hack approach and is now widely supported.

## Item Properties

### `flex-grow`

Defines how much a flex item grows relative to others when there is extra space.

```css
.item-a { flex-grow: 1; }  /* takes 1 share of free space */
.item-b { flex-grow: 2; }  /* takes 2 shares — twice as wide as item-a */
.item-c { flex-grow: 0; }  /* does not grow (default) */
```

### `flex-shrink`

Defines how much an item shrinks relative to others when space is scarce.

```css
.item { flex-shrink: 1; }  /* default — shrinks proportionally */
.item { flex-shrink: 0; }  /* never shrinks — useful for fixed-width sidebars */
```

### `flex-basis`

Sets the initial main-size of an item before free space is distributed.

```css
.item { flex-basis: auto; }    /* default — use item's width/height */
.item { flex-basis: 200px; }   /* start at 200px, then grow/shrink */
.item { flex-basis: 33.33%; }  /* one-third of the container */
```

### The `flex` Shorthand

Always use the shorthand — it sets `grow`, `shrink`, and `basis` together and handles edge cases correctly.

```css
.item { flex: 1; }          /* flex: 1 1 0 — grow, shrink, start at 0 */
.item { flex: auto; }       /* flex: 1 1 auto */
.item { flex: none; }       /* flex: 0 0 auto — rigid, no grow or shrink */
.item { flex: 0 0 200px; }  /* fixed 200px, no flexibility */
```

### `align-self`

Overrides `align-items` for a single flex item.

```css
.special-item {
  align-self: flex-end;   /* align this one item to the cross-end */
}
```

### `order`

Changes the visual order of items without altering the HTML.

```css
.item-first { order: -1; }  /* moves to front */
.item-last  { order: 99; }  /* moves to end */
/* Default order is 0 for all items */
```

Use sparingly — mismatched visual and DOM order hurts keyboard navigation and accessibility.

## Common Layout Recipes

### Horizontal Navbar

```css
.navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  height: 60px;
}

.navbar-logo { flex: 0 0 auto; }
.navbar-links { display: flex; gap: 24px; }
.navbar-actions { flex: 0 0 auto; }
```

```html
<nav class="navbar">
  <div class="navbar-logo">Logo</div>
  <ul class="navbar-links">
    <li>Home</li><li>Docs</li><li>Blog</li>
  </ul>
  <div class="navbar-actions">
    <button>Sign In</button>
  </div>
</nav>
```

### Centered Content (The Classic)

```css
.center-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
}
```

This pattern — `justify-content: center` + `align-items: center` — is the most common Flexbox use-case and the thing that used to require CSS dark magic.

### Responsive Card Grid

```css
.card-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.card {
  flex: 1 1 280px;   /* grow and shrink, but never below 280px */
  max-width: 360px;
}
```

This creates a grid that automatically reflows without media queries: cards sit side by side on wide screens and stack on narrow ones.

### Sidebar Layout

```css
.page-layout {
  display: flex;
  min-height: 100vh;
}

.sidebar {
  flex: 0 0 260px;   /* fixed width, no flexibility */
}

.main-content {
  flex: 1;           /* takes all remaining space */
}
```

### Sticky Footer

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1;   /* pushes footer to the bottom */
}

footer {
  flex: 0 0 auto;
}
```

## Flexbox vs Grid

Use **Flexbox** when you are laying out items in one dimension — a row of buttons, a navigation bar, a list of cards that wraps.

Use **CSS Grid** when you need two-dimensional control — rows and columns at the same time, named areas, or strict alignment across both axes.

They are not competitors — most modern layouts use both: Grid for page structure, Flexbox for component internals.

## Debugging Tips

- **`outline: 1px solid red`** on your container and items instantly reveals their actual boundaries.
- Browser DevTools (Chrome, Firefox) have dedicated Flexbox inspectors that show axis direction, item sizes, and free space.
- If `align-items` is not working, check that the container has a defined height — Flexbox cannot distribute space on the cross axis if the container has no height.
- If `justify-content` seems ignored, items may already fill the container — there is no free space left to distribute.

Flexbox is one of the most useful CSS tools you will use every day. With these properties internalized, you can build virtually any one-dimensional layout cleanly and without hacks.
