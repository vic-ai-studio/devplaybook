---
title: "CSS Grid vs Flexbox: Complete Guide with Interactive Examples 2025"
description: "CSS Grid vs Flexbox with real code examples for every common layout pattern. Holy Grail layout, card grid, navigation bar, sidebar — see exactly when to use each one."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["css", "css-grid", "flexbox", "layout", "frontend", "web-development", "responsive"]
readingTime: "12 min read"
---

CSS Grid and Flexbox are both layout tools — but they solve different problems. Choosing the wrong one leads to hacks, media query overload, and layouts that break at unexpected screen sizes.

This guide cuts straight to working examples for every common layout pattern, with the CSS you can copy directly.

---

## The One-Line Mental Model

**Flexbox:** one dimension — row OR column
**Grid:** two dimensions — rows AND columns simultaneously

When your layout needs to flow in one direction (a navigation bar, a row of tags, a vertical list), reach for Flexbox. When your layout has a defined structure with both rows and columns (a page layout, a card grid, a form), reach for Grid.

---

## Pattern 1: Navigation Bar (Flexbox)

A nav bar is one-dimensional: a row of items. Flexbox is the right choice.

```html
<nav class="navbar">
  <a class="logo" href="/">Logo</a>
  <ul class="nav-links">
    <li><a href="/features">Features</a></li>
    <li><a href="/pricing">Pricing</a></li>
    <li><a href="/docs">Docs</a></li>
  </ul>
  <button class="cta">Sign up</button>
</nav>
```

```css
.navbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1.5rem;
}

.nav-links {
  display: flex;
  gap: 1.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Push CTA to the right */
.navbar .cta {
  margin-left: auto;
}
```

Key technique: `margin-left: auto` on the last item pushes it to the far end of the flex container. This is the idiomatic way to split a flex row into "left group" and "right group."

---

## Pattern 2: Card Grid (CSS Grid)

A responsive grid of cards is two-dimensional with known column count. Grid wins.

```html
<div class="card-grid">
  <div class="card">...</div>
  <div class="card">...</div>
  <div class="card">...</div>
  <!-- more cards -->
</div>
```

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}
```

This single CSS rule:
- Creates as many columns as fit at 280px minimum
- Expands columns to fill available space equally
- Automatically wraps to new rows
- Works at any container width with zero media queries

`auto-fill` creates empty tracks if there's space; `auto-fit` collapses them. Use `auto-fill` when you want consistent column count, `auto-fit` when you want items to stretch to fill the row.

---

## Pattern 3: Holy Grail Layout (CSS Grid)

Header, main content, sidebar, and footer. This is the classic two-dimensional layout problem.

```html
<div class="page">
  <header>Header</header>
  <nav class="sidebar">Sidebar</nav>
  <main>Main Content</main>
  <footer>Footer</footer>
</div>
```

```css
.page {
  display: grid;
  grid-template-areas:
    "header  header"
    "sidebar main"
    "footer  footer";
  grid-template-columns: 240px 1fr;
  grid-template-rows: auto 1fr auto;
  min-height: 100vh;
}

header  { grid-area: header; }
.sidebar { grid-area: sidebar; }
main    { grid-area: main; }
footer  { grid-area: footer; }
```

`grid-template-areas` gives you a visual map of your layout in CSS. It's self-documenting and easy to rearrange for different breakpoints:

```css
@media (max-width: 768px) {
  .page {
    grid-template-areas:
      "header"
      "main"
      "sidebar"
      "footer";
    grid-template-columns: 1fr;
  }
}
```

---

## Pattern 4: Centering an Element (Flexbox)

Perfect centering: the single most common layout task.

```css
/* Center in viewport */
.centered-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}

/* Center in a fixed-size box */
.box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 400px;
  height: 300px;
}
```

Or with CSS Grid (slightly cleaner syntax):

```css
.centered-container {
  display: grid;
  place-items: center; /* shorthand for align-items + justify-items */
  height: 100vh;
}
```

`place-items: center` is the most concise way to center with Grid.

---

## Pattern 5: Sidebar Layout with Sticky Positioning (Grid)

Content with a sticky sidebar that scrolls independently:

```css
.layout {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 2rem;
  align-items: start; /* CRITICAL: prevents sidebar from stretching full height */
}

.sidebar {
  position: sticky;
  top: 1rem;
}
```

Without `align-items: start` on the grid container, the sidebar stretches to the full height of the grid row — making `position: sticky` ineffective (a sticky element can't scroll within its own container).

---

## Pattern 6: Tag Cloud / Badge Row (Flexbox)

A row of tags that wraps naturally:

```html
<div class="tags">
  <span class="tag">React</span>
  <span class="tag">TypeScript</span>
  <span class="tag">CSS Grid</span>
  <span class="tag">Performance</span>
  <!-- more tags -->
</div>
```

```css
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: #f0f4ff;
  font-size: 0.875rem;
}
```

`flex-wrap: wrap` is what makes the tags flow to the next line when there isn't enough horizontal space.

---

## Pattern 7: Feature Grid with Unequal Spans (CSS Grid)

Marketing pages often have a featured card that takes up more space than regular cards:

```html
<div class="feature-grid">
  <div class="featured">Featured</div>
  <div>Item 2</div>
  <div>Item 3</div>
  <div>Item 4</div>
  <div>Item 5</div>
</div>
```

```css
.feature-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}

.featured {
  grid-column: span 2; /* Takes up 2 of 3 columns */
  grid-row: span 2;    /* Takes up 2 rows */
}
```

Controlling span directly on child elements is one of Grid's superpowers — you can't do this with Flexbox.

---

## Pattern 8: Form Layout (CSS Grid)

Forms with labels and inputs aligned:

```html
<form class="form">
  <label>First Name</label>
  <input type="text" />
  <label>Email</label>
  <input type="email" />
  <label>Message</label>
  <textarea rows="4"></textarea>
  <div></div><!-- spacer for label column -->
  <button type="submit">Send</button>
</form>
```

```css
.form {
  display: grid;
  grid-template-columns: 140px 1fr;
  gap: 0.75rem 1rem;
  align-items: start;
}

label {
  padding-top: 0.5rem; /* Align with input text */
  text-align: right;
}
```

The two-column grid keeps labels and inputs perfectly aligned without any manual positioning.

---

## Pattern 9: Subgrid — Align Across Cards (Modern CSS)

`subgrid` solves the "card with title, description, CTA" alignment problem:

```css
.card-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.5rem;
}

.card {
  display: grid;
  grid-template-rows: subgrid; /* Inherit row tracks from parent */
  grid-row: span 3;            /* Title, description, CTA */
  gap: 0.5rem;
}
```

With `subgrid`, card titles align across all cards, card descriptions align, and CTAs always sit at the same vertical position — even when content lengths vary. Chrome, Firefox, and Safari all support `subgrid` as of 2023.

---

## Quick Reference: Which to Use

| Layout task | Tool | Reason |
|-------------|------|--------|
| Navigation bar | Flexbox | Single row of items |
| Button group | Flexbox | Single row |
| Tag / badge cloud | Flexbox + wrap | Natural flow |
| Card grid | Grid | Two-dimensional |
| Page layout (header/sidebar/main/footer) | Grid | Named areas |
| Centering one element | Either | `place-items` (Grid) is cleanest |
| Sticky sidebar | Grid + sticky | Needs `align-items: start` |
| Feature card with span | Grid | `grid-column: span N` |
| Form label/input | Grid | Two-column alignment |
| Unknown number of items | Either | Flexbox wraps; Grid auto-fills |

---

## The Combination Pattern

Most real layouts use both:

```css
/* Outer page: Grid */
.page {
  display: grid;
  grid-template-areas: "header" "main" "footer";
}

/* Nav inside header: Flexbox */
header {
  display: flex;
  align-items: center;
}

/* Card grid inside main: Grid */
main {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}

/* Actions inside each card: Flexbox */
.card-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
}
```

Grid handles the macro structure. Flexbox handles the micro layout within components.

---

## Browser Support

Both Grid and Flexbox have 97%+ global browser support. `subgrid` is at 93%+ as of 2025. You can use all of these in production without polyfills.

---

## Related Tools on DevPlaybook

- [CSS Grid Generator](/tools/css-grid-generator) — visual grid builder
- [Flexbox playground](/tools/flexbox-playground) — interactive flexbox tester
- [CSS minifier](/tools/css-minifier) — compress your CSS for production
- [CSS Grid vs Flexbox deep dive](/blog/css-grid-vs-flexbox-complete-guide-2026) — detailed comparison with decision trees
