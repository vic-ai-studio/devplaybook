---
title: "Tailwind CSS v4: Everything Changed (Migration Guide 2026)"
description: "Complete guide to migrating from Tailwind CSS v3 to v4. CSS-first configuration, new utility classes, and step-by-step migration checklist."
readingTime: "9 min read"
date: "2026-03-28"
tags: ["tailwind", "css", "frontend", "migration"]
author: "DevPlaybook Team"
---

# Tailwind CSS v4: Everything Changed (Migration Guide 2026)

Tailwind CSS v4 is not a minor update. It is a ground-up architectural rewrite that replaces JavaScript configuration with CSS-first design tokens, drops PostCSS as a required dependency, and ships a new Rust-based engine that claims up to 5x faster builds. If you have a production project on v3, you are going to feel this migration — but the end result is worth it.

This guide covers every breaking change, shows real before/after code comparisons, and walks you through the migration step by step for both Astro and Next.js projects.

---

## What Changed in Tailwind v4

The core philosophy shift: **configuration moves from `tailwind.config.js` into your CSS file**. No more JavaScript config object. No more `theme.extend`. No more separate purge/content arrays.

Here is what that means in practice:

**What's gone:**
- `tailwind.config.js` (or `.ts`) — no longer needed
- `postcss.config.js` in most setups — the new Vite plugin handles it natively
- `@tailwind base; @tailwind components; @tailwind utilities;` — replaced by a single import
- The `theme()` function in PostCSS — replaced by native CSS variables
- JIT mode toggle — it's always on, always full JIT

**What's new:**
- CSS-first configuration via `@theme` and `@layer`
- Design tokens exposed as CSS custom properties automatically
- Native `@import "tailwindcss"` syntax
- New `field-sizing`, `starting-style`, `not-*`, `in-*`, and container query variants
- First-class `@property` support for type-safe CSS variables
- Vite plugin (`@tailwindcss/vite`) replaces the PostCSS setup for most projects

---

## The New `@import "tailwindcss"` Syntax

**v3 — three directives, PostCSS required:**

```css
/* globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**v4 — single import, Vite-native:**

```css
/* globals.css */
@import "tailwindcss";
```

That single line replaces the three `@tailwind` directives and triggers the full Tailwind pipeline. If you are using the Vite plugin, PostCSS is no longer involved at all. For projects still using PostCSS (like Create React App derivatives), you can use `@tailwindcss/postcss` as a drop-in.

You can also selectively import layers if you need fine-grained control:

```css
@import "tailwindcss/preflight";
@import "tailwindcss/utilities";
```

---

## CSS Variables for Design Tokens

This is the biggest conceptual change. In v3, design tokens lived in JavaScript and were inaccessible to vanilla CSS. In v4, every theme value is automatically exposed as a CSS custom property.

**v3 — JavaScript-only config:**

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#6366f1",
          dark: "#4f46e5",
        },
      },
      fontFamily: {
        display: ["Inter", "sans-serif"],
      },
    },
  },
};
```

**v4 — CSS-first with `@theme`:**

```css
/* globals.css */
@import "tailwindcss";

@theme {
  --color-brand: #6366f1;
  --color-brand-dark: #4f46e5;
  --font-display: "Inter", sans-serif;
  --spacing-18: 4.5rem;
  --radius-xl: 1rem;
}
```

After defining tokens in `@theme`, Tailwind generates utility classes for them automatically. `bg-brand`, `text-brand-dark`, `font-display`, `p-18`, and `rounded-xl` all just work. You can also reference these variables in arbitrary CSS:

```css
.hero {
  background: var(--color-brand);
  font-family: var(--font-display);
}
```

This is a major win. Your design tokens are now accessible everywhere — in CSS animations, in `calc()` expressions, in `color-mix()` — without needing the Tailwind `theme()` function.

If you need to reference a spacing or color value in custom CSS, replace `theme('colors.brand')` with `var(--color-brand)`.

**Before (v3):**
```css
.custom-card {
  border-color: theme('colors.brand.DEFAULT');
  padding: theme('spacing.4');
}
```

**After (v4):**
```css
.custom-card {
  border-color: var(--color-brand);
  padding: var(--spacing-4);
}
```

---

## New Utility Classes and Variants

### Container Queries (No Plugin Required)

Container queries were a plugin in v3. In v4 they are built in.

```html
<!-- v3: required @tailwindcss/container-queries plugin -->
<div class="@container">
  <div class="@md:grid @md:grid-cols-2">...</div>
</div>

<!-- v4: same syntax, no plugin needed -->
<div class="@container">
  <div class="@md:grid @md:grid-cols-2">...</div>
</div>
```

### `not-*` Variant

```html
<!-- Apply styles to elements that do NOT match a condition -->
<button class="not-disabled:hover:bg-brand not-disabled:cursor-pointer disabled:opacity-50">
  Submit
</button>
```

### `in-*` Variant (Parent-Context Styling)

```html
<!-- Style an element based on its ancestor's state -->
<div class="group">
  <p class="in-[.group:hover]:text-brand">Highlights when parent hovered</p>
</div>
```

### `starting-style` for Entry Animations

```css
/* Animate elements when they first appear in the DOM */
.popover {
  @starting-style {
    opacity: 0;
    transform: translateY(-4px);
  }
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.2s, transform 0.2s;
}
```

Or with utilities:
```html
<div class="starting:opacity-0 starting:translate-y-1 transition-all duration-200">
  Animated popover
</div>
```

### `field-sizing` for Auto-Resizing Textareas

```html
<textarea class="field-sizing-content">Auto-resizes to content</textarea>
```

> When building custom CSS for these features, the [CSS Box Shadow Generator](https://devplaybook.cc/tools/css-box-shadow-generator) and [CSS Animation Builder](https://devplaybook.cc/tools/css-animation-builder) can help you prototype values before committing them to your theme config.

---

## Breaking Changes Checklist

Work through this list systematically before running the migration script.

**Configuration:**
- [ ] `tailwind.config.js` must be converted to `@theme` blocks in CSS
- [ ] `content` array is no longer needed — v4 auto-detects files
- [ ] `darkMode: 'class'` becomes `@variant dark (&:where(.dark, .dark *))` or use the new `@custom-variant` API
- [ ] `plugins: [require('@tailwindcss/typography')]` becomes `@plugin "@tailwindcss/typography"`

**Removed utilities:**
- [ ] `bg-opacity-*` → use `bg-black/50` opacity modifier syntax (this existed in v3 too, but the old utilities are removed)
- [ ] `text-opacity-*` → use `text-black/50`
- [ ] `border-opacity-*` → use `border-black/50`
- [ ] `flex-shrink-0` → `shrink-0` (the old alias is removed)
- [ ] `flex-grow` → `grow` (old alias removed)
- [ ] `overflow-ellipsis` → `text-ellipsis`

**Renamed utilities:**
- [ ] `shadow-sm` default values changed — audit your shadows and use the [CSS Box Shadow Generator](https://devplaybook.cc/tools/css-box-shadow-generator) to match visuals
- [ ] `ring` default width changed from 3px to 1px — update `ring` to `ring-3` to preserve v3 behavior
- [ ] `blur` default value increased — update explicit `blur-sm` where needed

**PostCSS / build:**
- [ ] Replace `postcss.config.js` + `tailwindcss` plugin with `@tailwindcss/vite` (Vite) or `@tailwindcss/postcss` (other)
- [ ] Remove `autoprefixer` — v4 handles vendor prefixes internally
- [ ] `@tailwind base/components/utilities` → `@import "tailwindcss"`

---

## Step-by-Step Migration from v3 to v4

### Step 1: Install v4 Packages

For Vite-based projects (Astro, SvelteKit, plain Vite):
```bash
npm install tailwindcss@^4.0 @tailwindcss/vite@^4.0
npm uninstall autoprefixer postcss
```

For Next.js (still uses PostCSS under the hood):
```bash
npm install tailwindcss@^4.0 @tailwindcss/postcss@^4.0
npm uninstall autoprefixer
```

### Step 2: Run the Official Upgrade Tool

The Tailwind team ships an automated codemod that handles most of the migration:

```bash
npx @tailwindcss/upgrade@next
```

This tool will:
- Convert `tailwind.config.js` into `@theme` blocks
- Replace the three `@tailwind` directives with `@import "tailwindcss"`
- Update deprecated utility class names in your templates
- Generate a diff report of changes it could not handle automatically

Review the diff carefully. The codemod is thorough but not perfect — custom plugins and complex `theme()` usages often need manual review.

### Step 3: Update Your CSS Entry Point

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
```

If you have custom base styles, keep them after the import using `@layer base`:

```css
@import "tailwindcss";

@layer base {
  h1, h2, h3 {
    font-family: var(--font-display);
  }

  body {
    color: var(--color-gray-900);
  }
}
```

### Step 4: Convert Your Theme

Take each `theme.extend` block from your config and convert it to `@theme`:

```js
// v3: tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: { 50: "#eff6ff", 500: "#3b82f6", 900: "#1e3a5f" },
      },
      borderRadius: { "4xl": "2rem" },
      maxWidth: { "8xl": "88rem" },
    },
  },
};
```

```css
/* v4: globals.css */
@theme {
  --color-primary-50: #eff6ff;
  --color-primary-500: #3b82f6;
  --color-primary-900: #1e3a5f;
  --radius-4xl: 2rem;
  --container-8xl: 88rem;
}
```

### Step 5: Update Dark Mode Config

```css
/* v3 equivalent: darkMode: 'class' */
@custom-variant dark (&:where(.dark, .dark *));

/* or use the media-query based dark mode (default in v4) */
/* no config needed — @media (prefers-color-scheme: dark) is automatic */
```

### Step 6: Convert Plugins

```css
/* v3: plugins: [require('@tailwindcss/typography'), require('@tailwindcss/forms')] */

/* v4: */
@plugin "@tailwindcss/typography";
@plugin "@tailwindcss/forms";
```

Third-party plugins that expose their own utility classes will need v4-compatible releases. Check each plugin's changelog before migrating.

### Step 7: Fix the Ring Width Regression

This trips up almost everyone. In v3, `ring` applies a 3px ring. In v4 it applies a 1px ring. If you use `ring` for focus indicators, update:

```html
<!-- v3 behavior: 3px ring -->
<input class="focus:ring focus:ring-blue-500" />

<!-- v4: explicit width to preserve v3 behavior -->
<input class="focus:ring-3 focus:ring-blue-500" />
```

### Step 8: Verify Your Build

```bash
npm run build
```

Check for:
- Any remaining `theme()` calls in CSS (replace with `var()`)
- Classes using the removed `*-opacity-*` pattern
- Any `flex-shrink`, `flex-grow`, `overflow-ellipsis` old names

---

## Astro-Specific Migration

Astro projects using the official `@astrojs/tailwind` integration need to switch to the Vite plugin directly:

```bash
npm uninstall @astrojs/tailwind
npm install @tailwindcss/vite@^4.0
```

Update `astro.config.mjs`:

```js
// Before
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  integrations: [tailwind()],
});
```

```js
// After
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Move your CSS import to a global layout file if it isn't already:

```astro
---
// src/layouts/BaseLayout.astro
---
<html>
  <head>
    <!-- other head content -->
  </head>
  <body>
    <slot />
  </body>
</html>

<style is:global>
  @import "tailwindcss";
  /* your @theme blocks here */
</style>
```

Or keep CSS in a separate file and import it in your layout:

```astro
---
import "../styles/globals.css";
---
```

> Generating gradients for your Astro site? Use the [CSS Gradient Generator](https://devplaybook.cc/tools/css-gradient-generator) to create gradient values you can drop directly into your `@theme` block as custom properties.

---

## Next.js-Specific Migration

Next.js 15 still relies on PostCSS internally, so the migration path differs slightly.

```bash
npm install tailwindcss@^4.0 @tailwindcss/postcss@^4.0
```

Update `postcss.config.mjs`:

```js
// Before
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

```js
// After
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

Delete `tailwind.config.ts` after running the upgrade tool and verifying your `@theme` blocks are correct.

For App Router projects, update `app/globals.css`:

```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";

@theme {
  /* your tokens */
}
```

One gotcha in Next.js: if you use CSS Modules alongside Tailwind, the new variable-based tokens are available in `.module.css` files via `var(--color-*)` just like any other CSS custom property. No special handling needed.

---

## Performance Improvements in v4

The headline number from the Tailwind team is a **5x faster full build** and a **100x faster incremental rebuild** compared to v3 in large projects.

This is achieved through:

**Oxide engine (Rust-based):** The scanner that detects Tailwind classes in your source files is rewritten in Rust. For a project with hundreds of components, the difference is measurable — cold builds that took 2+ seconds in v3 complete in under 500ms in v4.

**No content scanning config needed:** v4 automatically scans all files that Vite processes. This eliminates false negatives from misconfigured `content` arrays (a common source of missing classes in production builds) and removes a whole class of "works in dev, broken in prod" bugs.

**Smaller CSS output:** The new engine produces tighter CSS with better deduplication. Design tokens as CSS variables also means the browser can apply them natively without Tailwind generating separate property variants for every combination.

**Lightning CSS integration:** v4 uses Lightning CSS for transforms, vendor prefixing, and modern CSS syntax lowering. This replaces autoprefixer and adds support for nesting, `:is()`, `color-mix()`, and other modern features that get compiled down for older browsers automatically.

For teams using the [CSS Flexbox](https://devplaybook.cc/tools/css-flexbox) or [CSS Grid Generator](https://devplaybook.cc/tools/css-grid-generator) tools to plan layouts, you will notice that v4's native CSS nesting support means you can write nested flex/grid rules directly in `@layer` blocks without a preprocessor.

---

## Summary

Tailwind CSS v4 is a significant migration, but the upgrade codemod handles the mechanical parts. The conceptual shift to CSS-first configuration actually makes the framework easier to reason about — your design tokens live in one place, they are real CSS variables accessible everywhere, and the build is dramatically faster.

Key points to remember:

- Run `npx @tailwindcss/upgrade@next` first — it does the heavy lifting
- Move from `tailwind.config.js` to `@theme {}` blocks in CSS
- Replace `@tailwind base/components/utilities` with `@import "tailwindcss"`
- Fix the `ring` width regression (3px → 1px default)
- Switch to `@tailwindcss/vite` for Vite/Astro, `@tailwindcss/postcss` for Next.js
- Use `var(--color-*)` instead of `theme()` in custom CSS

The build speed improvements alone are worth the migration for large projects. Start with a feature branch, run the codemod, fix the handful of manual issues, and you will be on v4 in an afternoon.
