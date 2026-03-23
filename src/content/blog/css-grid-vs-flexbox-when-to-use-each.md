---
title: "CSS Grid vs Flexbox: When to Use Each"
description: "CSS Grid vs Flexbox — a practical decision guide. Learn exactly when to use Grid, when to use Flexbox, and when to combine both for modern responsive layouts."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["css", "css-grid", "flexbox", "frontend", "web-development", "layout"]
readingTime: "10 min read"
---

CSS Grid and Flexbox are both layout tools. Both are modern, both have excellent browser support, and both solve real problems. The trouble is knowing which one to reach for.

This guide gives you a practical decision framework — not just theory, but concrete rules you can apply to any layout problem you encounter.

---

## The One-Line Summary

**Use Flexbox** when you're laying out items in a single direction (a row OR a column).

**Use CSS Grid** when you're controlling layout in two dimensions at once (rows AND columns).

Everything else is commentary. But the commentary matters, so read on.

---

## Understanding Flexbox

Flexbox is a one-dimensional layout model. You define a **flex container** and it manages how its children (flex items) are distributed along one axis.

```css
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}
```

This puts the toolbar items in a row, spaces them out, and centers them vertically. Flexbox is doing exactly what it's designed for.

### Flexbox is ideal for:

- **Navigation bars** — items in a row with flexible spacing
- **Button groups** — inline buttons with consistent spacing
- **Form rows** — label + input pairs side by side
- **Card headers** — icon + title + action in a line
- **Centering a single element** — vertically and horizontally

### Flexbox mental model:

Think of a bookshelf. Books are placed left to right (or top to bottom). You can control spacing between books, alignment, whether they wrap to a new shelf. But each shelf is independent — Flexbox doesn't coordinate across shelves.

---

## Understanding CSS Grid

CSS Grid is a two-dimensional layout model. You define rows AND columns, then place items into the resulting grid.

```css
.dashboard {
  display: grid;
  grid-template-columns: 240px 1fr;
  grid-template-rows: 60px 1fr auto;
  min-height: 100vh;
}
```

This creates a sidebar/main/footer layout. Grid is controlling both axes simultaneously.

### Grid is ideal for:

- **Page-level layouts** — header, sidebar, main content, footer
- **Card grids** — equal-width cards that reflow responsively
- **Complex form layouts** — fields spanning different column widths
- **Overlap** — elements intentionally positioned on top of each other
- **Magazine-style layouts** — asymmetric content placement

### Grid mental model:

Think of a spreadsheet. You define the column and row structure first, then place content into cells. Items can span multiple cells. The grid defines the space; content fills it.

---

## Decision Rules

Use these rules when you're not sure which to reach for:

### Rule 1: One axis or two?

Draw the layout. Are you only moving things left-right or up-down? That's one axis — use Flexbox. Are you aligning things across both rows and columns at the same time? That's two axes — use Grid.

### Rule 2: Content-driven or layout-driven?

**Flexbox is content-driven.** The size and number of items determines the layout. You have a list of nav items and want them spread out — Flexbox sizes and positions them based on what's there.

**Grid is layout-driven.** You define the structure first, then place content into it. The grid exists independently of the content.

### Rule 3: Do you need items to align across rows?

This is the classic Grid use case. Imagine a card grid where each card has a title, image, description, and button. You want all the buttons aligned at the bottom of each card, regardless of title length.

Grid handles this natively with `align-items` across the entire grid. Flexbox handles it per-row only.

### Rule 4: Responsive "as many as fit" columns?

Use Grid:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

This creates as many 280px-minimum columns as will fit in the container, each taking equal space. No media queries needed. Flexbox can approximate this but Grid handles it more cleanly.

---

## Side-by-Side Comparison

| Scenario | Use |
|----------|-----|
| Nav bar with logo left, links right | Flexbox |
| 3-column dashboard layout | Grid |
| Centering a modal | Grid or Flexbox |
| Tag list wrapping to next line | Flexbox |
| Photo gallery with varying sizes | Grid |
| Button group | Flexbox |
| Form with 2-column layout | Grid |
| Sidebar + content | Grid |
| Toolbar with actions | Flexbox |
| Card grid with equal-height cards | Grid |

---

## Using Them Together

The most effective layouts use both. Grid handles the macro structure; Flexbox handles component-level layout.

```css
/* Grid for the page structure */
.app {
  display: grid;
  grid-template-areas:
    "header header"
    "sidebar main"
    "footer footer";
  grid-template-columns: 260px 1fr;
  grid-template-rows: 60px 1fr 40px;
}

/* Flexbox inside the header component */
.header {
  grid-area: header;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
}
```

The page uses Grid. The header uses Flexbox. Each tool is doing exactly what it's best at.

---

## Common Mistakes

### Using Flexbox where Grid would be cleaner

Many developers default to Flexbox for everything because it feels familiar. The result is deeply nested flex containers with magic margin hacks to align things that Grid would handle in 3 lines.

If you have more than 2 levels of nested Flexbox for a layout, consider whether Grid would flatten the structure.

### Using Grid for everything

Grid has more cognitive overhead. For a simple "put these buttons side by side," reaching for Grid adds unnecessary complexity. Match the tool to the task.

### Forgetting about `gap`

Both Grid and Flexbox support `gap` (formerly `grid-gap` and `column-gap`). Use it instead of margins on individual items — it's simpler, consistent, and doesn't add spacing at the edges.

```css
.flex-row {
  display: flex;
  gap: 1rem; /* works! */
}

.card-grid {
  display: grid;
  gap: 1.5rem; /* also works! */
}
```

---

## Practice: Build This Layout

Try building a classic app shell using what you've learned:

```
┌─────────────────────────────────┐
│           Header                │
├──────────┬──────────────────────┤
│          │                      │
│ Sidebar  │    Main Content      │
│          │                      │
├──────────┴──────────────────────┤
│           Footer                │
└─────────────────────────────────┘
```

**The outer structure:** Grid — two columns, three rows.
**The header content:** Flexbox — logo left, nav right.
**The sidebar nav links:** Flexbox — stack vertically.
**Any card components in Main:** Grid — auto-fill columns.

Use the [CSS Grid Generator](/tools/css-grid-generator) to prototype the outer structure visually, and the [CSS Flexbox tool](/tools/css-flexbox) for component internals.

---

## Build Layouts Faster with DevPlaybook Pro

The free CSS tools handle everyday layout work. **DevPlaybook Pro** unlocks:
- **Saved layouts** — store your grid and flexbox configurations
- **Export to frameworks** — generate Tailwind, Bootstrap, or plain CSS
- **Responsive preview** — test your layouts at multiple breakpoints side by side
- **AI Layout Advisor** — describe what you want, get the CSS

[Upgrade to Pro](/pro) and ship layouts faster.
