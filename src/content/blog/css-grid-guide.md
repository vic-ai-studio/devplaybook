---
title: "CSS Grid Layout Master Guide: From Zero to Production in 2026"
description: "Master CSS Grid layout with practical examples. Covers grid container properties, named areas, auto-placement, and responsive grids without media queries."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["css", "grid", "layout", "responsive", "frontend"]
readingTime: "2 min read"
---

# CSS Grid Layout Master Guide: From Zero to Production in 2026

## The Two-Dimensional Model

CSS Grid is a two-dimensional layout system. Flexbox is one-dimensional. Use Grid when you need to control both rows and columns simultaneously.

```css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto;
  gap: 16px;
}
```

## Grid Template Areas

```css
.page {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 60px 1fr 50px;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.main    { grid-area: main; }
.footer  { grid-area: footer; }
```

**HTML:**
```html
<div class="page">
  <header class="header"></header>
  <aside class="sidebar"></aside>
  <main class="main"></main>
  <footer class="footer"></footer>
</div>
```

## The `fr` Unit

The `fr` unit means "fraction of available space."

```css
/* Equal columns */
grid-template-columns: 1fr 1fr 1fr;  /* 3 equal columns */
grid-template-columns: 2fr 1fr 1fr;     /* 50% 25% 25% */
grid-template-columns: repeat(4, 1fr);   /* 4 equal */
```

## Auto-Placement

Grid automatically places items that don't have explicit positioning:

```css
.gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}
```

This creates a responsive grid with no media queries — cards automatically wrap as the viewport shrinks.

## Named Lines

```css
.main {
  display: grid;
  grid-template-columns:
    [full-start] 1rem
    [content-start] minmax(0, 65ch) [content-end]
    1rem [full-end];
}

.full-bleed {
  grid-column: full-start / full-end;
}
```

## Common Patterns

### Holy Grail Layout
```css
.holy-grail {
  display: grid;
  grid-template: auto 1fr auto / auto 1fr auto;
  min-height: 100vh;
}
```

### Card Grid
```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
}
```

## Browser Support

CSS Grid has 97%+ global browser support. No prefixes needed in 2026. Ship it.
