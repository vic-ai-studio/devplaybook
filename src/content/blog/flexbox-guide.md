---
title: "Flexbox Master Guide: The Modern Way to Build Layouts in 2026"
description: "Master Flexbox layout with practical examples. Covers flex container, flex items, alignment, wrapping, and common patterns like sticky footers and card grids."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["css", "flexbox", "layout", "frontend", "responsive"]
readingTime: "2 min read"
---

# Flexbox Master Guide: The Modern Way to Build Layouts in 2026

## The One-Dimensional Model

Flexbox is a one-dimensional layout method. It works on either a row OR a column, not both simultaneously. For two-dimensional control, use CSS Grid.

```css
.container {
  display: flex;
  flex-direction: row;    /* row | row-reverse | column | column-reverse */
  flex-wrap: wrap;       /* nowrap | wrap | wrap-reverse */
}
```

## The `flex` Shorthand

```css
/* flex: <grow> <shrink> <basis> */

.item {
  flex: 1;         /* flex: 1 1 0 — grow, shrink, basis 0 */
  flex: 1 0;       /* flex: 1 0 auto — basis defaults to auto */
  flex: 0 0 200px; /* fixed 200px, no grow/shrink */
  flex: 1;         /* flex: 1 1 0 — all available space */
}
```

## Justify vs Align

| Property | Axis | What it controls |
|----------|------|-----------------|
| `justify-content` | Main axis (direction) | How items are distributed along the main axis |
| `align-items` | Cross axis (perpendicular) | How items are aligned on the cross axis |
| `align-content` | Cross axis | How lines are distributed when multiple lines exist |

## Common Patterns

### Center Anything
```css
.parent {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

### Sticky Footer
```css
.page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}
.main { flex: 1; }  /* Footer pushes to bottom */
```

### Card Grid with Flexbox
```css
.card-container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.card {
  flex: 1 1 300px; /* Grow, shrink, min-width 300px */
}
```

### Navigation Bar
```css
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
```

## Gap Property

```css
.container {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;           /* row-gap + column-gap */
  row-gap: 8px;        /* override row gap */
  column-gap: 24px;    /* override column gap */
}
```

## Browser Support

Flexbox has 98%+ global support. No prefixes needed in 2026. Use it freely.
