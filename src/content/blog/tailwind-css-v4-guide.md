---
title: "Tailwind CSS v4 Complete Guide: CSS-First Config, Lightning CSS & What's New"
description: "Master Tailwind CSS v4 with this complete guide. Learn the CSS-first configuration, Lightning CSS engine, new utility classes, performance improvements, and how to migrate from v3."
pubDate: "2026-03-27"
tags: ["tailwind-css", "css", "frontend", "javascript", "web-development", "performance"]
author: "DevPlaybook Team"
readingTime: "11 min read"
---

# Tailwind CSS v4 Complete Guide: CSS-First Config, Lightning CSS & What's New

Tailwind CSS v4 is a ground-up rewrite. The JavaScript config file is gone. PostCSS is optional. The engine is now Lightning CSS — a Rust-powered CSS compiler — and the performance numbers are staggering: **5x faster full builds, 100x faster incremental builds**. If you've been using Tailwind for years, v4 will feel familiar but fundamentally different under the hood. This guide covers everything you need to know.

## What Changed in Tailwind CSS v4

Here's the short version of what's new:

| Feature | v3 | v4 |
|---------|----|----|
| Config | `tailwind.config.js` | CSS `@import "tailwindcss"` |
| Engine | PostCSS + Autoprefixer | Lightning CSS (Rust) |
| Content detection | Manual `content` array | Automatic |
| CSS variables | Limited | Full design tokens as CSS vars |
| Performance | Baseline | 5x faster full, 100x incremental |
| Installation | `npm install tailwindcss` | `npm install tailwindcss@next` |

---

## Installation and Setup

### New Project

```bash
npm install tailwindcss@next @tailwindcss/vite
```

With Vite:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

With Next.js:

```bash
npm install tailwindcss@next @tailwindcss/postcss
```

```javascript
// postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

### The New CSS Entry Point

Instead of a `tailwind.config.js`, you now configure everything in your CSS file:

```css
/* app/globals.css */
@import "tailwindcss";

/* That's it for a basic setup */
```

No more `@tailwind base;`, `@tailwind components;`, `@tailwind utilities;` — a single import handles everything.

---

## CSS-First Configuration

The biggest conceptual shift in v4 is that configuration moves from JavaScript to CSS. You customize Tailwind using `@theme` inside your CSS file.

### Defining Your Design Tokens

```css
/* globals.css */
@import "tailwindcss";

@theme {
  /* Colors */
  --color-brand: oklch(55% 0.25 264);
  --color-brand-light: oklch(75% 0.2 264);
  --color-brand-dark: oklch(35% 0.25 264);

  /* Typography */
  --font-sans: "Inter", sans-serif;
  --font-mono: "JetBrains Mono", monospace;
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  --font-size-3xl: 1.875rem;
  --font-size-4xl: 2.25rem;

  /* Spacing */
  --spacing-128: 32rem;
  --spacing-144: 36rem;

  /* Border radius */
  --radius-4xl: 2rem;

  /* Breakpoints */
  --breakpoint-3xl: 1920px;
}
```

Every token in `@theme` becomes:
1. A utility class (`bg-brand`, `text-brand-light`, `text-3xl`)
2. A CSS variable (`--color-brand`, `--font-size-3xl`)

This is a huge improvement over v3, where custom values created utility classes but not CSS variables automatically.

### Using Theme Values as CSS Variables

Because your theme values are now real CSS variables, you can use them anywhere in your CSS:

```css
.my-component {
  background: var(--color-brand);
  font-family: var(--font-mono);
  border-radius: var(--radius-4xl);
}
```

```jsx
// Or inline styles in React
<div style={{ background: 'var(--color-brand)' }}>
  Dynamic brand color
</div>
```

---

## Content Detection: Now Automatic

In v3, you had to tell Tailwind where your template files were:

```javascript
// v3 - required
module.exports = {
  content: ['./src/**/*.{html,js,jsx,ts,tsx,vue}'],
}
```

In v4, **Tailwind automatically detects your source files**. It scans all files in your project, excluding `node_modules`, hidden directories, and binary files. You don't need to configure this unless you have non-standard locations.

If you do need to customize:

```css
@import "tailwindcss";
@source "../node_modules/@my-org/ui-lib";  /* Include external package */
```

---

## New and Changed Utility Classes

### Dynamic Values (No More Arbitrary Syntax Needed for Common Cases)

v4 expands what you can do without brackets:

```html
<!-- v3: required arbitrary values for many things -->
<div class="grid-cols-[1fr_2fr_1fr]">

<!-- v4: named utilities for more things -->
<div class="grid-cols-subgrid">
```

### Container Queries Built-In

Container queries were previously only available via a plugin. In v4, they're built in:

```html
<div class="@container">
  <div class="@lg:grid @lg:grid-cols-2">
    <!-- This layout responds to the container size, not the viewport -->
  </div>
</div>
```

```html
<!-- Named containers -->
<div class="@container/sidebar">
  <nav class="@sidebar/lg:flex-row flex-col">
    <!-- Responds specifically to the sidebar container -->
  </nav>
</div>
```

### New 3D Transform Utilities

```html
<div class="rotate-x-45 rotate-y-30 translate-z-12 perspective-500">
  3D transform!
</div>
```

### Starting Style (for Entry Animations)

```html
<div class="starting:opacity-0 starting:translate-y-4 transition-all">
  Animates in from opacity-0 + translate-y-4 on mount
</div>
```

This uses the CSS `@starting-style` rule, which is now a first-class Tailwind utility.

### Not-* Variant

```html
<!-- Apply style when element is NOT focused -->
<input class="not-focus:border-gray-300 focus:border-blue-500">

<!-- Apply style when NOT the first child -->
<li class="not-first:border-t">
```

### Field-Sizing for Auto-Resizing Textareas

```html
<textarea class="field-sizing-content">
  This textarea grows with its content automatically
</textarea>
```

### Color Mix

```css
/* Natively mix colors using CSS color-mix() */
@theme {
  --color-primary-faded: color-mix(in oklch, var(--color-primary) 50%, transparent);
}
```

---

## Performance: Lightning CSS

Lightning CSS is a Rust-based CSS tool that replaces PostCSS for most Tailwind operations. It handles:

- CSS parsing and transformation
- Vendor prefix injection (replaces Autoprefixer)
- CSS nesting (native CSS nesting syntax)
- Color space transformations
- Import inlining

### Benchmark Numbers (Official)

Running Tailwind's test suite:
- **Full build**: 3.78s → 0.24s (~15x faster on large projects)
- **Incremental rebuild**: 85ms → 1ms on typical changes

For most real projects you'll see:
- Small projects: 200-500ms → 50-100ms
- Large projects (10k+ classes): 3-8s → 400-900ms

### What You Don't Need Anymore

Because Lightning CSS handles vendor prefixes, you can remove Autoprefixer from your PostCSS config:

```javascript
// Before (v3)
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},  // ← Remove this
  },
}

// After (v4)
export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
}
```

---

## CSS Nesting (Native Syntax)

v4 supports native CSS nesting via Lightning CSS, which means you can use it in your `@layer` and custom CSS too:

```css
@layer components {
  .card {
    padding: 1.5rem;
    border-radius: 0.75rem;
    background: white;

    &:hover {
      box-shadow: 0 4px 12px rgb(0 0 0 / 0.1);
    }

    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: var(--color-gray-900);
    }

    @media (min-width: 768px) {
      padding: 2rem;
    }
  }
}
```

---

## Migrating from Tailwind CSS v3

### 1. Update Dependencies

```bash
npm install tailwindcss@next @tailwindcss/vite
# or
npm install tailwindcss@next @tailwindcss/postcss
```

### 2. Replace Your CSS Entry Point

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
```

### 3. Move Config to CSS

```javascript
// Before: tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#3B82F6',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
}
```

```css
/* After: globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #3B82F6;
  --font-sans: "Inter", sans-serif;
}
```

### 4. Update PostCSS Config

```javascript
// Before
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
}

// After
export default {
  plugins: { '@tailwindcss/postcss': {} }
}
```

### 5. Handle Breaking Changes

**`bg-opacity-*` is removed** — use the opacity modifier instead:
```html
<!-- Before -->
<div class="bg-blue-500 bg-opacity-50">

<!-- After -->
<div class="bg-blue-500/50">
```

**`text-opacity-*` is removed:**
```html
<!-- Before -->
<div class="text-blue-500 text-opacity-75">

<!-- After -->
<div class="text-blue-500/75">
```

**`ring` default size changed** — `ring` is now `ring-1` (was `ring-3`):
```html
<!-- Before: ring gave a 3px ring -->
<button class="focus:ring">

<!-- After: explicit size -->
<button class="focus:ring-2">
```

**`shadow` default changed** — the default shadow is smaller. Use `shadow-sm` for the old default appearance.

**JIT is the only mode** — the legacy engine is completely removed. But since JIT was already the default in v3, this likely doesn't affect you.

### 6. Use the Official Migration Tool

```bash
npx @tailwindcss/upgrade
```

This automated tool handles most of the mechanical changes. Always review the output.

---

## Working with Dark Mode

Dark mode in v4 works the same as v3, but you can now customize it via CSS:

```css
@import "tailwindcss";

/* Default: use media query */
/* @variant dark (@media (prefers-color-scheme: dark)); */

/* Opt into class-based dark mode */
@custom-variant dark (&:where(.dark, .dark *));
```

```html
<div class="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  Automatically adapts to dark mode
</div>
```

---

## Practical Example: Component with v4 Features

Here's a notification card using multiple v4 features:

```html
<div class="
  @container
  bg-white dark:bg-gray-800
  rounded-2xl
  p-4 @lg:p-6
  shadow-sm
  border border-gray-200 dark:border-gray-700
  starting:opacity-0 starting:translate-y-2
  transition-all duration-300
">
  <div class="flex items-start gap-3">
    <div class="
      size-10
      rounded-full
      bg-brand/10
      flex items-center justify-center
      shrink-0
    ">
      <svg class="size-5 text-brand" ...></svg>
    </div>

    <div class="@lg:flex @lg:items-center @lg:justify-between w-full">
      <div>
        <p class="text-sm font-medium text-gray-900 dark:text-white">
          New message from Alice
        </p>
        <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          2 minutes ago
        </p>
      </div>

      <button class="
        mt-2 @lg:mt-0
        text-sm text-brand hover:text-brand-dark
        not-hover:opacity-70
        transition-opacity
      ">
        View
      </button>
    </div>
  </div>
</div>
```

This uses:
- `@container` / `@lg:` — container queries
- `size-10` — width + height shorthand
- `bg-brand/10` — color with opacity modifier
- `starting:` — entry animation
- `not-hover:` — negation variant

---

## Summary

Tailwind CSS v4 is the biggest release in the project's history:

- **CSS-first config** with `@theme` — no more `tailwind.config.js`
- **Automatic content detection** — no more `content` array
- **Lightning CSS engine** — 5-15x faster builds in real projects
- **Container queries built-in** — no plugin needed
- **New utilities** — 3D transforms, `starting:`, `not-*`, `field-sizing`, CSS nesting
- **CSS variables for everything** — design tokens are real CSS custom properties

The migration from v3 is a half-day job for most projects — mostly updating your CSS entry point and moving theme config into `@theme {}`. The performance improvements and CSS-native approach are worth it, especially as projects grow larger.
