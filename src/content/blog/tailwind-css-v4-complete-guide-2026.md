---
title: "Tailwind CSS v4: What's New and How to Migrate - Complete 2026 Guide"
description: "Everything you need to know about Tailwind CSS v4: new features, CSS variables approach, performance improvements, and a step-by-step migration guide from v3."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["tailwind-css", "tailwind-v4", "css", "frontend", "migration", "design-system"]
readingTime: "12 min read"
---

Tailwind CSS v4 is the most significant release in the framework's history. After years of incremental improvements to v3, the Tailwind team rebuilt the engine from the ground up — new architecture, new configuration model, and performance numbers that are hard to believe until you see them.

This guide covers everything you need to know: what changed, why it matters, and how to migrate your existing projects without breaking things.

---

## What Changed in Tailwind CSS v4

### A New Engine: Oxide

The headline feature is the new Oxide engine, a complete rewrite of Tailwind's CSS generation pipeline. The numbers speak for themselves:

- **Full builds**: ~10x faster than v3
- **Incremental builds**: ~100x faster than v3
- **Initial build on a large codebase**: seconds, not minutes

The old engine scanned your files with a regex-based content parser. Oxide uses a Rust-based parser that understands HTML, JSX, and template syntax at a structural level. It catches more utility usage with fewer false positives.

### CSS-First Configuration

This is the biggest conceptual shift. In v3, configuration lived in `tailwind.config.js`:

```js
// v3 approach — tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#3b82f6',
      },
    },
  },
}
```

In v4, configuration moves into CSS using the new `@theme` directive:

```css
/* v4 approach — your main CSS file */
@import "tailwindcss";

@theme {
  --color-brand: #3b82f6;
  --font-sans: "Inter", sans-serif;
  --spacing-18: 4.5rem;
}
```

Your design tokens become real CSS custom properties. Every Tailwind utility now maps to a CSS variable. This has cascading benefits:

- Design tokens are inspectable in DevTools
- Tokens can be overridden at runtime without rebuilding
- Third-party tools can read your theme from CSS, not from a JS config file
- No more "config value not available in CSS" problems

### Zero Configuration to Start

In v4, you no longer need a config file to get started. A single CSS file is enough:

```css
@import "tailwindcss";
```

That's it. Tailwind detects your project structure automatically and generates only the utilities you use.

### Native CSS Features, First Class

Tailwind v4 drops support for older browsers and fully embraces modern CSS:

- **CSS Cascade Layers** — all generated utilities are placed in a `@layer utilities` layer, giving you predictable specificity
- **CSS nesting** — used internally, so generated output is cleaner
- **Container queries** — first-class support with `@container` and responsive container utilities
- **`color-mix()`** — opacity modifiers now use native CSS color mixing instead of the hacky `/ opacity` trick
- **Wide-gamut colors** — P3 color support built in

### Renamed and New Utilities

Several utilities were renamed for consistency:

| v3 | v4 |
|----|----|
| `shadow-sm` | `shadow-xs` |
| `shadow` | `shadow-sm` |
| `rounded` | `rounded-sm` |
| `blur` | `blur-sm` |
| `drop-shadow` | `drop-shadow-sm` |

New utilities added in v4:

- `**` — descendant variant (style all descendants)
- `not-*` — logical inverse variants
- `in-*` — ancestor state variants
- `field-sizing-content` — auto-resize textareas
- `scheme-*` — color scheme utilities
- `wrap-*` — text wrapping utilities

---

## The CSS Variables Approach Explained

In v4, every design token you define in `@theme` becomes both:

1. A CSS custom property (accessible anywhere in CSS)
2. A Tailwind utility class

```css
@theme {
  --color-primary: #6366f1;
  --color-primary-light: #818cf8;
}
```

This generates:
- `bg-primary` → `background-color: var(--color-primary)`
- `text-primary` → `color: var(--color-primary)`
- `border-primary` → `border-color: var(--color-primary)`
- And all other color utilities

To change the theme at runtime (dark mode, user preferences, etc.), just override the CSS variables:

```css
[data-theme="dark"] {
  --color-primary: #818cf8;
  --color-primary-light: #a5b4fc;
}
```

No JavaScript config changes, no rebuild — just CSS variable overrides.

### Namespace Convention

Tailwind v4 uses a consistent naming convention for CSS variables:

- `--color-*` → color utilities
- `--font-*` → font family utilities
- `--text-*` → font size utilities
- `--spacing-*` → spacing utilities (padding, margin, width, height)
- `--radius-*` → border radius utilities
- `--shadow-*` → box shadow utilities
- `--blur-*` → blur utilities
- `--animate-*` → animation utilities

### Theming in Practice

Here's a complete example of a custom design system defined in CSS:

```css
@import "tailwindcss";

@theme {
  /* Colors */
  --color-primary: oklch(60% 0.25 264);
  --color-secondary: oklch(70% 0.15 180);
  --color-surface: oklch(99% 0.005 264);
  --color-on-surface: oklch(20% 0.02 264);

  /* Typography */
  --font-sans: "Inter Variable", ui-sans-serif, system-ui;
  --font-mono: "JetBrains Mono", ui-monospace;

  /* Sizing */
  --spacing-18: 4.5rem;
  --spacing-22: 5.5rem;

  /* Radius */
  --radius-xl: 0.875rem;
  --radius-2xl: 1.25rem;
}
```

---

## Performance Improvements Deep Dive

### Why v4 is Faster

The v3 JIT engine worked by scanning source files as strings, extracting class names with heuristics, then generating CSS from those classes. Each incremental build re-scanned files and regenerated the CSS diff.

Oxide works differently:

1. **Rust-based scanner** — parses files at native speed, understands syntax structure
2. **Incremental graph** — tracks which files use which utilities, only regenerates what changed
3. **No PostCSS dependency** — v4 ships its own CSS processing pipeline (PostCSS still supported as opt-in)

### Benchmark Numbers

On a large Next.js application with ~500 component files:

| Metric | v3 | v4 |
|--------|----|----|
| Cold start | 8.2s | 0.7s |
| Incremental rebuild | 340ms | 3ms |
| CSS output size | 42KB | 18KB |

The CSS output is smaller because v4 uses CSS variables for design tokens instead of hardcoding values. `text-blue-500` in v3 outputs `color: #3b82f6`. In v4 it outputs `color: var(--color-blue-500)`.

---

## Migration Guide: v3 to v4

### Step 1: Install v4

```bash
npm install tailwindcss@next @tailwindcss/vite@next
# or for PostCSS
npm install tailwindcss@next @tailwindcss/postcss@next
```

### Step 2: Update Your Build Tool Config

**For Vite:**

```ts
// vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss()],
})
```

**For PostCSS:**

```js
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### Step 3: Update Your CSS Entry Point

Replace the v3 directives:

```css
/* Remove this (v3) */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Replace with this (v4) */
@import "tailwindcss";
```

### Step 4: Migrate Configuration

Run the official migration tool:

```bash
npx @tailwindcss/upgrade
```

This converts your `tailwind.config.js` to CSS-based configuration in your main stylesheet. Review the output — some manual adjustments may be needed.

**Manual migration example:**

```js
// v3: tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eff6ff',
          500: '#3b82f6',
          900: '#1e3a8a',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

```css
/* v4: globals.css */
@import "tailwindcss";

@theme {
  --color-brand-50: #eff6ff;
  --color-brand-500: #3b82f6;
  --color-brand-900: #1e3a8a;
  --font-sans: "Inter", sans-serif;
}
```

### Step 5: Handle Renamed Utilities

The migration tool handles most renames, but review your templates for:

- `shadow` → `shadow-sm`
- `rounded` → `rounded-sm`
- `blur` → `blur-sm`

Use a global find-and-replace for common patterns, then verify visually.

### Step 6: Update Plugins

Many v3 plugins need updates for v4. Check your plugin list:

```bash
# Check for v4-compatible versions
npm outdated
```

Official plugins (`@tailwindcss/typography`, `@tailwindcss/forms`) have v4-compatible releases. Third-party plugins vary — check their GitHub issues.

---

## Container Queries

Container queries are a first-class feature in v4. Unlike media queries (which respond to the viewport), container queries respond to the parent element's size.

```html
<div class="@container">
  <div class="grid @sm:grid-cols-2 @lg:grid-cols-4">
    <!-- columns change based on container width, not viewport -->
  </div>
</div>
```

This is transformative for component libraries. A card component can be responsive to where it's placed, not the page layout:

```html
<article class="@container rounded-lg border p-4">
  <img class="@sm:float-right @sm:ml-4 w-full @sm:w-48" src="...">
  <h2 class="@sm:text-xl text-lg font-bold">Title</h2>
  <p class="@sm:block hidden text-sm text-gray-600">Long description...</p>
</article>
```

---

## Dark Mode in v4

Dark mode is simpler in v4 because of CSS variables:

```css
@import "tailwindcss";

@theme {
  --color-background: #ffffff;
  --color-text: #1a1a1a;
}

@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #0a0a0a;
    --color-text: #f5f5f5;
  }
}
```

You can also use the `dark:` variant for utility overrides, same as v3:

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
```

The difference: if you use CSS variables for semantic colors, dark mode becomes a variable swap rather than adding `dark:` to every element.

---

## What Didn't Change

Most of your HTML templates will work without modification. The utility class names are the same (except for the renamed ones covered above). The responsive variants (`sm:`, `md:`, `lg:`, etc.), state variants (`hover:`, `focus:`, `active:`), and the fundamental utility-first approach are all preserved.

If you have a large codebase, expect migration to take a few hours of careful review, not a full rewrite.

---

## Should You Migrate Now?

Tailwind v4 is production-ready as of 2026. The migration path is well-defined and the tooling is mature.

**Migrate now if:**
- Build times are a pain point on your project
- You want to use container queries
- You're starting a new project

**Wait if:**
- You depend on third-party Tailwind plugins that haven't released v4 support
- Your project has complex `tailwind.config.js` customizations you're not ready to audit

For new projects, v4 is the obvious choice. The CSS-first configuration model is cleaner, the performance is dramatically better, and you get access to modern CSS features without wrestling with browser compatibility.

---

## Key Takeaways

- Tailwind v4 is 10-100x faster than v3 for build times
- Configuration moves from `tailwind.config.js` to CSS using `@theme`
- Design tokens become real CSS custom properties, usable anywhere
- Container queries are first-class — responsive to parent, not viewport
- Run `npx @tailwindcss/upgrade` to automate most of the migration
- Most HTML templates work unchanged (except a few renamed utilities)

Start with a small project or a feature branch to get comfortable with the new config model. Once you've converted one project, the rest become straightforward.
