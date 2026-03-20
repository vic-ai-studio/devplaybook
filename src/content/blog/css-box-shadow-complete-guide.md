---
title: "CSS box-shadow Property: Complete Guide with Examples"
description: "Master the CSS box-shadow property with a complete guide covering syntax, multiple shadows, inset shadows, performance tips, and real-world design patterns with code examples."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["css", "box-shadow", "web-design", "frontend", "ui", "design-systems"]
readingTime: "9 min read"
---

The CSS `box-shadow` property is one of the most versatile yet underused tools in frontend development. Most developers know the basics — offset, blur, color — but miss the advanced techniques that produce polished, production-quality shadows.

This guide covers the full `box-shadow` syntax, every parameter explained, layered shadows, inset effects, performance considerations, and practical design patterns you can copy directly into your projects. Use our free [CSS Box Shadow Generator](/tools/box-shadow-generator) to preview shadows in real-time while you follow along.

## The Syntax

```css
box-shadow: [inset] offset-x offset-y [blur-radius] [spread-radius] color;
```

A complete example:

```css
.card {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
```

Multiple shadows are comma-separated. The first shadow in the list renders on top.

## Each Parameter Explained

### `offset-x` (required)

Horizontal offset. Positive moves the shadow right, negative moves it left.

```css
box-shadow: 10px 0 10px rgba(0,0,0,0.3);   /* shadow right */
box-shadow: -10px 0 10px rgba(0,0,0,0.3);  /* shadow left */
```

### `offset-y` (required)

Vertical offset. Positive moves the shadow down, negative moves it up.

```css
box-shadow: 0 10px 10px rgba(0,0,0,0.3);   /* shadow below */
box-shadow: 0 -10px 10px rgba(0,0,0,0.3);  /* shadow above */
```

### `blur-radius` (optional, default: 0)

Controls how soft/blurry the shadow edge is. `0` produces a hard, crisp edge. Higher values produce softer shadows.

```css
box-shadow: 5px 5px 0 black;    /* hard shadow */
box-shadow: 5px 5px 20px black; /* soft shadow */
```

### `spread-radius` (optional, default: 0)

Expands or contracts the shadow before blurring. Positive values make the shadow larger than the element; negative values shrink it.

```css
box-shadow: 0 0 0 3px blue;     /* solid outline effect */
box-shadow: 0 10px 20px -5px rgba(0,0,0,0.3); /* shrunk shadow */
```

The spread-radius trick with `0 0 0 Npx` creates a box outline without changing layout (unlike `border`).

### `inset`

Changes the shadow from outer to inner. The shadow appears inside the element's border.

```css
box-shadow: inset 0 2px 4px rgba(0,0,0,0.2);  /* pressed/recessed effect */
```

### `color`

Any valid CSS color: named colors, hex, rgb, rgba, hsl, hsla. Using `rgba` or `hsla` with transparency is almost always better than solid colors.

```css
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);    /* neutral dark */
box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); /* brand-colored shadow */
```

## Multiple Shadows

Comma-separate shadows to layer them. This produces richer, more realistic depth:

```css
/* Tailwind-style layered shadow */
.card {
  box-shadow:
    0 1px 3px rgba(0,0,0,0.12),
    0 1px 2px rgba(0,0,0,0.24);
}

/* Elevated card effect */
.card-elevated {
  box-shadow:
    0 10px 15px -3px rgba(0,0,0,0.1),
    0 4px 6px -2px rgba(0,0,0,0.05);
}

/* Deep shadow with ambient + direct light simulation */
.card-deep {
  box-shadow:
    0 25px 50px -12px rgba(0,0,0,0.25),
    0 0 15px rgba(0,0,0,0.05);
}
```

## Practical Design Patterns

### Elevation System

Consistent shadow scales communicate depth hierarchy in design systems:

```css
:root {
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
  --shadow-2xl: 0 25px 50px -12px rgba(0,0,0,0.25);
}

.button { box-shadow: var(--shadow-sm); }
.card { box-shadow: var(--shadow-md); }
.modal { box-shadow: var(--shadow-xl); }
.dropdown { box-shadow: var(--shadow-lg); }
```

### Hover Lift Effect

```css
.card {
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
  transition: box-shadow 0.3s ease, transform 0.3s ease;
}

.card:hover {
  box-shadow: 0 12px 24px rgba(0,0,0,0.2);
  transform: translateY(-2px);
}
```

### Button States

```css
.btn {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.15);
}

.btn:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.15);
}

.btn:active {
  box-shadow: 0 1px 2px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.15);
}

.btn:focus-visible {
  box-shadow: 0 0 0 3px rgba(99,102,241,0.5);
}
```

### Inset / Pressed Effect

```css
.input {
  box-shadow: inset 0 2px 4px rgba(0,0,0,0.06);
}

.pressed-button {
  box-shadow: inset 0 3px 6px rgba(0,0,0,0.2);
}
```

### Glow Effects

```css
/* Colored glow for interactive elements */
.glow-purple {
  box-shadow: 0 0 20px rgba(139, 92, 246, 0.5);
}

/* Neon text/button effect */
.neon {
  box-shadow:
    0 0 5px rgba(0, 255, 136, 0.8),
    0 0 20px rgba(0, 255, 136, 0.5),
    0 0 60px rgba(0, 255, 136, 0.3);
}
```

### Focus Ring

Accessible focus indicators using box-shadow instead of outline (maintains rounded corners):

```css
.interactive:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 2px white,
    0 0 0 4px rgb(99, 102, 241);
}
```

## Dark Mode Shadows

Shadows work by contrast — on dark backgrounds, dark shadows disappear. Adapt your shadow strategy for dark mode:

```css
/* Light mode: dark shadow works */
:root {
  --shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

/* Dark mode: use colored/lighter shadow or rely on borders */
@media (prefers-color-scheme: dark) {
  :root {
    --shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
    /* Or: use a subtle border instead */
  }
}

/* Alternative: use opacity on current color */
.card {
  box-shadow: 0 4px 12px color-mix(in srgb, currentColor 15%, transparent);
}
```

## Performance Considerations

`box-shadow` triggers a repaint (not layout) when changed, which is cheaper than changes that trigger reflow. However, animating `box-shadow` on complex pages can still be expensive.

**Best practices:**

```css
/* Prefer animating opacity of a pseudo-element over box-shadow */
.card {
  position: relative;
}

.card::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: 0 20px 40px rgba(0,0,0,0.3);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.card:hover::after {
  opacity: 1;
}
```

This animates `opacity` instead of `box-shadow`, which is GPU-accelerated and performs better.

Also use `will-change: box-shadow` sparingly — it creates a new compositor layer and uses memory:

```css
/* Only add this if you have confirmed performance issues */
.frequently-animated {
  will-change: box-shadow;
}
```

## Common Mistakes

**Spread-radius instead of blur-radius:**
```css
/* Wrong: missing blur, using spread instead */
box-shadow: 0 4px 10px black;  /* This is blur, not spread */

/* Right: using both blur and spread */
box-shadow: 0 4px 10px 2px black;  /* blur=10px, spread=2px */
```

**Using hard shadows for UI elements:**
```css
/* Looks amateurish */
box-shadow: 3px 3px 0 black;

/* Looks professional */
box-shadow: 0 4px 12px rgba(0,0,0,0.12);
```

**Forgetting to add `transition` for interactive shadows:**
```css
/* Jumpy effect without transition */
.button { box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
.button:hover { box-shadow: 0 8px 16px rgba(0,0,0,0.2); }

/* Smooth transition */
.button {
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.2s ease;
}
```

## Quick Reference Table

| Effect | CSS |
|--------|-----|
| Soft card shadow | `0 4px 6px -1px rgba(0,0,0,0.1)` |
| Hard drop shadow | `4px 4px 0 rgba(0,0,0,0.8)` |
| Inset pressed | `inset 0 2px 4px rgba(0,0,0,0.2)` |
| Focus ring | `0 0 0 3px rgba(99,102,241,0.5)` |
| Glow | `0 0 20px rgba(139,92,246,0.5)` |
| Top shadow only | `0 -4px 6px rgba(0,0,0,0.1)` |
| Both sides | `4px 0 6px rgba(0,0,0,0.1), -4px 0 6px rgba(0,0,0,0.1)` |

Experiment with all these values using the [CSS Box Shadow Generator](/tools/box-shadow-generator) — drag sliders, see results live, and copy the exact CSS you need.
