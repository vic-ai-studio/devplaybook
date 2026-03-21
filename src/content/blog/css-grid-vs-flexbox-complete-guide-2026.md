---
title: "CSS Grid vs Flexbox: Complete Guide with Examples (2026)"
description: "CSS Grid vs Flexbox explained with real examples. Learn when to use Grid, when to use Flexbox, and how to combine both for modern, responsive layouts."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["css", "css-grid", "flexbox", "web-development", "layout", "frontend"]
readingTime: "12 min read"
---

The single most common layout question in front-end development is still: **Grid or Flexbox?** Both are powerful. Both solve layout problems. And both get misused constantly.

This guide cuts through the confusion with a clear mental model, concrete examples, and decision rules you can apply immediately. By the end, you'll know not just what each tool does—but when to reach for each one.

---

## The Core Difference (One Sentence Each)

**Flexbox** is for laying out items along a single axis—either a row or a column.

**CSS Grid** is for laying out items across two axes simultaneously—rows and columns together.

That's it. Everything else flows from this distinction.

---

## Flexbox: One-Dimensional Layout

Flexbox operates on a **flex container** and its **flex items**. You define a direction (`row` or `column`), and the container distributes space along that axis.

### Basic Flexbox Example

```css
.nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
```

```html
<nav class="nav">
  <a href="/">Home</a>
  <a href="/about">About</a>
  <a href="/blog">Blog</a>
  <a href="/contact">Contact</a>
</nav>
```

This places all nav links in a row, distributes space between them evenly, and centers them vertically. Classic Flexbox territory.

### Key Flexbox Properties

**On the container:**

```css
.container {
  display: flex;
  flex-direction: row | row-reverse | column | column-reverse;
  justify-content: flex-start | flex-end | center | space-between | space-around | space-evenly;
  align-items: stretch | flex-start | flex-end | center | baseline;
  flex-wrap: nowrap | wrap | wrap-reverse;
  gap: 1rem;            /* spacing between items */
}
```

**On the items:**

```css
.item {
  flex-grow: 0;    /* how much to grow relative to siblings */
  flex-shrink: 1;  /* how much to shrink relative to siblings */
  flex-basis: auto; /* default size before remaining space is distributed */

  /* shorthand */
  flex: 1;         /* flex-grow: 1; flex-shrink: 1; flex-basis: 0%; */

  align-self: auto | flex-start | flex-end | center | stretch;
  order: 0;        /* visual reordering without changing DOM */
}
```

### When Flexbox Wins

Flexbox is the right tool when you have a **list of items** that should flow in one direction:

- Navigation bars
- Button groups
- Tag/chip lists
- Card rows where items should wrap naturally
- Any "put these things in a line and space them out" problem

```css
/* Tags that wrap naturally when they run out of space */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

/* Centered hero content */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}
```

---

## CSS Grid: Two-Dimensional Layout

CSS Grid lets you define explicit rows and columns, then place items anywhere within that grid—or let items flow automatically.

### Basic Grid Example

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

This creates a 3-column grid. Cards flow automatically left-to-right, top-to-bottom. The `1fr` unit divides available space equally.

### Key Grid Properties

**On the container:**

```css
.container {
  display: grid;
  grid-template-columns: 200px 1fr 1fr;  /* explicit column sizes */
  grid-template-rows: auto 1fr auto;      /* explicit row sizes */
  gap: 1rem;                              /* shorthand for row-gap + column-gap */
  grid-template-areas:
    "header header header"
    "sidebar main main"
    "footer footer footer";
}
```

**On the items:**

```css
.item {
  grid-column: 1 / 3;     /* span from line 1 to line 3 (2 columns wide) */
  grid-row: 2 / 4;        /* span from line 2 to line 4 (2 rows tall) */

  /* shorthand */
  grid-area: header;      /* place in named area */

  /* or with span keyword */
  grid-column: span 2;    /* take up 2 columns */
}
```

### Responsive Grid with `minmax` and `auto-fill`

One of Grid's most powerful features is the combination of `minmax()` and `auto-fill`:

```css
.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

This creates as many columns as fit, each at least 280px wide. At a 900px viewport: 3 columns. At 600px: 2 columns. At 320px: 1 column. No media queries needed.

### Named Grid Areas

For page-level layouts, named areas make structure readable:

```css
.page {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr 60px;
  grid-template-areas:
    "header header"
    "sidebar content"
    "footer footer";
  min-height: 100vh;
}

.header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
.content { grid-area: content; }
.footer  { grid-area: footer; }
```

This produces a classic app shell layout in ~10 lines of CSS.

---

## Side-by-Side Comparison

| Situation | Use Flexbox | Use Grid |
|-----------|-------------|----------|
| Navigation bar | ✅ | Overkill |
| Card grid (3 columns) | Possible but awkward | ✅ |
| Page layout (header/sidebar/main) | Doable | ✅ |
| Button group | ✅ | Overkill |
| Masonry-style layout | ❌ | ✅ |
| Form fields aligned in a row | ✅ | Either works |
| Dashboard with fixed column widths | ❌ | ✅ |
| Tag cloud | ✅ (flex-wrap) | Either works |
| Items spanning multiple columns/rows | ❌ | ✅ |
| Vertically centering a single element | ✅ | ✅ |

---

## The Decision Rule (Practical)

Here's the question to ask:

> **"Do I need to control layout in two dimensions (rows AND columns simultaneously)?"**

- **Yes** → Use CSS Grid
- **No** → Use Flexbox

More specifically:

- If you're thinking about **items in a row that might wrap** → Flexbox with `flex-wrap`
- If you're thinking about **a grid of cards** → Grid
- If you're placing items **at specific row/column intersections** → Grid
- If you're distributing **space between items in a line** → Flexbox
- If you're building a **page-level structure** (header, sidebar, footer) → Grid

---

## Combining Grid and Flexbox

The best layouts often use **both**. This isn't a contradiction—it's good practice.

A common pattern: Grid for the outer page structure, Flexbox for the content inside each grid cell.

```css
/* Outer layout: Grid */
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 64px 1fr;
  grid-template-areas:
    "nav     header"
    "nav     main";
  height: 100vh;
}

/* Navigation: Flexbox for its internal items */
.nav {
  grid-area: nav;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

/* Main content: Grid for the card layout */
.main {
  grid-area: main;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  padding: 1.5rem;
  align-content: start;
}

/* Each card: Flexbox for its internal layout */
.card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}
```

---

## Common Mistakes to Avoid

### 1. Using Grid for simple row/column centering

```css
/* Overkill */
.center-me {
  display: grid;
  place-items: center;
}

/* Fine, but Flexbox is simpler for single-axis centering */
.center-me {
  display: flex;
  justify-content: center;
  align-items: center;
}
```

Both work. But `place-items: center` on a Grid is a common pattern—it's not wrong, just be deliberate.

### 2. Forgetting `align-content` on wrapping Flex containers

When items wrap, `justify-content` controls the cross-axis distribution of rows—not individual items. Confusion here causes unexpected spacing.

```css
/* Items wrap into multiple rows but stack at top */
.container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  /* Missing: align-content to control vertical distribution of rows */
  align-content: flex-start; /* or center, space-between, etc. */
}
```

### 3. Using `grid-template-columns: repeat(3, 1fr)` without `minmax`

```css
/* Breaks on small screens—items can go below 0 width */
.cards {
  grid-template-columns: repeat(3, 1fr);
}

/* Better: responsive without media queries */
.cards {
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
}
```

### 4. Overriding flex-basis with width

```css
/* Confusing: width conflicts with flex calculations */
.item {
  flex: 1;
  width: 200px; /* This conflicts with flex-basis: 0% */
}

/* Clear: use flex-basis for the base size */
.item {
  flex: 0 0 200px; /* no grow, no shrink, 200px basis */
}
```

---

## Real-World Layout Patterns

### Sticky Footer

```css
body {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

main {
  flex: 1; /* Grows to fill available space, pushing footer down */
}
```

### Two-Column Layout with Sidebar

```css
.layout {
  display: grid;
  grid-template-columns: minmax(200px, 300px) 1fr;
  gap: 2rem;
}

@media (max-width: 768px) {
  .layout {
    grid-template-columns: 1fr; /* Stack on mobile */
  }
}
```

### Holy Grail Layout

```css
.page {
  display: grid;
  grid-template:
    "header" auto
    "main  " 1fr
    "footer" auto
    / 1fr;
  min-height: 100vh;
}

@media (min-width: 768px) {
  .page {
    grid-template:
      "header header  header" auto
      "nav    main    aside " 1fr
      "footer footer  footer" auto
      / 200px 1fr     200px;
  }
}
```

---

## Browser Support

Both CSS Grid and Flexbox have **full support** across all modern browsers. As of 2026:

- Flexbox: 99%+ global support
- CSS Grid (basic): 99%+ global support
- CSS Grid (subgrid): 95%+ support (Chrome 117+, Firefox 71+, Safari 16+)
- CSS Grid (masonry): Still experimental (Chrome flag, Firefox flag)

You do not need to worry about browser support for standard Flexbox or Grid in 2026. Use them freely.

**Subgrid** is worth knowing: it lets nested grids align to the parent grid's tracks.

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: auto 1fr auto; /* title, body, footer */
}

.card {
  display: grid;
  grid-row: span 3;
  grid-template-rows: subgrid; /* inherit parent row tracks */
}
```

This solves the "card headers all different heights" problem without JavaScript.

---

## Quick Reference Cheat Sheet

### Flexbox Container

```css
display: flex;
flex-direction: row | column;
justify-content: flex-start | center | flex-end | space-between | space-around | space-evenly;
align-items: stretch | flex-start | center | flex-end;
flex-wrap: nowrap | wrap;
gap: 1rem;
```

### Flexbox Item

```css
flex: 1;                /* grow and shrink equally */
flex: 0 0 200px;        /* fixed 200px, no grow/shrink */
align-self: center;     /* override container alignment */
order: -1;              /* move to front visually */
```

### Grid Container

```css
display: grid;
grid-template-columns: repeat(3, 1fr);
grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
gap: 1rem;
grid-template-areas: "header header" "sidebar main";
```

### Grid Item

```css
grid-column: 1 / 3;     /* span 2 columns */
grid-column: span 2;    /* span 2 columns (relative) */
grid-area: header;      /* named area placement */
```

---

## Key Takeaways

- **Flexbox = one axis** (row or column). Use it for navigation, button groups, tag lists, and centering.
- **Grid = two axes** (rows and columns). Use it for card grids, page layouts, and anything that needs precise two-dimensional placement.
- **Combine them**: Grid for outer structure, Flexbox for inner component layout.
- **`repeat(auto-fill, minmax(X, 1fr))`** is your best friend for responsive grids without media queries.
- **Both have full browser support** in 2026. Use them without hesitation.

The fastest way to get comfortable with both: build a dashboard layout. You'll end up using Grid for the page structure, Flexbox inside each panel, and you'll see immediately why they're different tools for different problems.
