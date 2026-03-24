---
title: "CSS-in-JS vs Tailwind CSS vs CSS Modules: Which to Choose in 2025?"
description: "An honest comparison of CSS-in-JS (styled-components, Emotion), Tailwind CSS, and CSS Modules in 2025 — covering developer experience, performance, bundle size, team scalability, and when each approach wins."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["css", "tailwind", "css-in-js", "styled-components", "css-modules", "frontend", "developer-tools"]
readingTime: "11 min read"
---

CSS architecture is one of the most argued-about topics in frontend development. The debate between CSS-in-JS, Tailwind, and CSS Modules isn't just about preference — each approach has real trade-offs that affect bundle size, runtime performance, team scalability, and developer experience.

In 2025, the landscape has shifted. Here's the honest breakdown.

---

## The State of CSS Tooling in 2025

Three approaches dominate production React/Next.js applications:

1. **Tailwind CSS**: Utility-first CSS with atomic classes
2. **CSS Modules**: Locally-scoped CSS files with generated class names
3. **CSS-in-JS**: Styles written in JavaScript (styled-components, Emotion, vanilla-extract)

A fourth approach — plain CSS with custom properties and container queries — has seen a renaissance as browsers improved, but it's less common in large applications.

---

## Tailwind CSS

### What It Is

Tailwind gives you a large set of small, single-purpose utility classes: `flex`, `pt-4`, `text-gray-500`, `rounded-lg`. You build UI by combining these classes directly in your HTML/JSX.

```jsx
function Card({ title, description }) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-sm">
      <h2 className="text-xl font-semibold text-gray-900 mb-2">{title}</h2>
      <p className="text-gray-600 text-sm leading-relaxed">{description}</p>
    </div>
  )
}
```

### Why It Works

**Speed**: No context switching. You write JSX and style it in the same place. No creating component files, naming classes, or writing `.card { background: white; ... }`.

**Consistency**: Tailwind's design tokens (spacing, colors, type scale) prevent the "300 shades of gray" problem. `text-gray-500` is always the same gray.

**Small production CSS**: Tailwind scans your files and only includes classes you actually use. A typical production Tailwind bundle is 5-20kb gzipped.

**Easy to maintain**: When you delete a component, its styles go with it. No orphaned CSS.

### Where It Struggles

**Verbose JSX**: A complex component's className can be 200 characters long. This is ugly. Libraries like `clsx`, `tailwind-merge`, and `cva` (class-variance-authority) help, but add boilerplate.

```jsx
// Gets messy fast
<button
  className={cn(
    "inline-flex items-center justify-center rounded-md text-sm font-medium",
    "ring-offset-background transition-colors focus-visible:outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    variant === "default" && "bg-primary text-primary-foreground hover:bg-primary/90",
    variant === "outline" && "border border-input bg-background hover:bg-accent",
    size === "sm" && "h-9 rounded-md px-3",
    size === "lg" && "h-11 rounded-md px-8",
    className
  )}
>
```

**Learning curve**: Tailwind has a lot of utility classes to learn. New developers spend 1-2 weeks getting fluent.

**Design system limitations**: Tailwind's config is powerful but complex. Highly custom designs require significant customization.

**Arbitrary values accumulate**: Real projects inevitably use `w-[347px]` or `mt-[13px]` — arbitrary values that bypass the design system.

### Best For

- Teams that value shipping speed over code elegance
- Projects using shadcn/ui, Radix, or Headless UI (all designed for Tailwind)
- Solo developers or small teams
- Projects where design tokens are flexible

---

## CSS Modules

### What It Is

CSS Modules scopes CSS class names to the component that imports them, preventing style leakage and naming collisions.

```tsx
// Button.module.css
.button {
  display: inline-flex;
  padding: 0.5rem 1rem;
  background: var(--color-primary);
  border-radius: 0.375rem;
  font-weight: 500;
}

.button:hover {
  background: var(--color-primary-dark);
}

.primary { background: blue; }
.secondary { background: gray; }
```

```tsx
// Button.tsx
import styles from './Button.module.css'

function Button({ variant = 'primary', children }) {
  return (
    <button className={`${styles.button} ${styles[variant]}`}>
      {children}
    </button>
  )
}
```

The class `button` becomes something like `Button_button__x9KdL` in the output — unique to this component.

### Why It Works

**Standard CSS**: You write real CSS. No new syntax, no runtime. Every CSS property, selector, and media query works exactly as expected.

**Local scope**: Style collisions are impossible. `.button` in `Button.module.css` never conflicts with `.button` in `Card.module.css`.

**Zero runtime overhead**: CSS Modules are processed at build time. The output is static CSS. No JavaScript execution for styling.

**Great for complex styles**: Pseudo-elements, animations, media queries, complex selectors — all work naturally.

**Framework agnostic**: Works with React, Vue, Angular, Svelte, or any framework that supports it.

### Where It Struggles

**Context switching**: You work across two files. Need to change a style? Switch to the `.module.css` file, find the class, make the change.

**Dynamic styles require work**: Conditional classes need string concatenation or a helper:

```tsx
import cn from 'clsx'
import styles from './Button.module.css'

// Not terrible, but more verbose than Tailwind
<button className={cn(
  styles.button,
  isActive && styles.active,
  size === 'large' && styles.large
)}>
```

**Naming fatigue**: You still have to name things. `.cardHeaderTitleText` is just as much of a naming problem as vanilla CSS.

**Composition is manual**: Sharing styles between components requires importing and combining modules explicitly.

### Best For

- Teams with strong CSS skills who prefer writing real CSS
- Projects with complex animations or CSS art
- Applications requiring maximum styling flexibility
- Teams migrating from vanilla CSS or SCSS

---

## CSS-in-JS (styled-components, Emotion)

### What It Is

CSS-in-JS allows writing CSS directly in JavaScript files, creating styled components with co-located styles.

```tsx
// styled-components example
import styled from 'styled-components'

const Button = styled.button<{ $variant?: 'primary' | 'secondary' }>`
  display: inline-flex;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  font-weight: 500;
  background: ${({ $variant }) =>
    $variant === 'secondary' ? 'var(--color-secondary)' : 'var(--color-primary)'
  };

  &:hover {
    opacity: 0.9;
  }

  @media (max-width: 640px) {
    width: 100%;
  }
`
```

### Why It Works

**Dynamic styles are natural**: Access props, theme, or state directly in your CSS. No class toggling needed.

**Component co-location**: The component and its styles live together. Moving or deleting the component takes its styles with it.

**Theming system**: styled-components and Emotion have built-in theme providers — useful for products with multiple visual themes (light/dark, customer branding).

**TypeScript support**: Props-based styling is fully typed.

### Where It Struggles

**Runtime cost**: CSS-in-JS generates CSS strings and injects them at runtime. This adds JavaScript to your bundle and costs CPU cycles.

The runtime cost matters most for:
- Server-side rendering (SSR) — styled-components requires specific server-side setup
- Content-heavy pages with many components
- Low-end devices

**Bundle size**: styled-components adds ~30kb gzipped to your bundle. Emotion adds ~12kb.

**React Server Components incompatibility**: This is the major 2024-2025 problem. CSS-in-JS libraries that use React context are fundamentally incompatible with React Server Components (RSC). If you're using Next.js App Router, runtime CSS-in-JS becomes problematic.

**Performance at scale**: At 100+ components with complex dynamic styles, runtime CSS generation shows up in performance profiles.

### The RSC Problem Explained

React Server Components don't run in the browser — they run on the server and stream HTML. Context-based CSS-in-JS (styled-components, Emotion) can't function because there's no React context in server components.

This pushed many teams toward:
- **vanilla-extract**: Zero-runtime CSS-in-JS that generates static CSS at build time
- **Tailwind**: No runtime at all
- **CSS Modules**: No runtime at all

### vanilla-extract

vanilla-extract deserves special mention as the "zero-runtime CSS-in-JS" option:

```ts
// button.css.ts
import { style, styleVariants } from '@vanilla-extract/css'

export const button = style({
  display: 'inline-flex',
  padding: '0.5rem 1rem',
  borderRadius: '0.375rem',
  fontWeight: 500,
})

export const variants = styleVariants({
  primary: { background: 'var(--color-primary)' },
  secondary: { background: 'var(--color-secondary)' },
})
```

```tsx
import { button, variants } from './button.css'

function Button({ variant = 'primary' }) {
  return <button className={`${button} ${variants[variant]}`}>...</button>
}
```

vanilla-extract generates static CSS at build time (like CSS Modules) but uses TypeScript for type-safe styling with zero runtime overhead. It's RSC-compatible.

### Best For CSS-in-JS

- Projects that started with styled-components/Emotion and are working well
- Multi-theme products where runtime theming is valuable
- NOT recommended for new Next.js App Router projects

---

## Performance Comparison

| Approach | Bundle Size | Runtime Cost | SSR Complexity | RSC Compatible |
|----------|-------------|-------------|----------------|----------------|
| Tailwind | 5-20kb CSS | None | None | Yes |
| CSS Modules | Varies | None | None | Yes |
| styled-components | +30kb JS | Medium | Complex | No |
| Emotion | +12kb JS | Medium | Medium | No |
| vanilla-extract | Small CSS | None | None | Yes |

---

## The 2025 Recommendation

**New projects:**

1. **Using Next.js App Router?** → Tailwind or CSS Modules. Avoid runtime CSS-in-JS.
2. **Small to medium app?** → Tailwind (plus shadcn/ui for component primitives)
3. **Large design system with many themes?** → vanilla-extract (zero-runtime, type-safe)
4. **Strong CSS team, complex animations?** → CSS Modules

**Existing projects:**

- **Working styled-components project on Pages Router?** → No need to migrate. Works fine.
- **Migrating to App Router?** → Plan migration to Tailwind, CSS Modules, or vanilla-extract.
- **Performance problems?** → Profile first; CSS-in-JS runtime might not be the culprit.

---

## Mixing Approaches

You don't have to pick just one. Many mature codebases use:

- Tailwind for layout and spacing
- CSS Modules for complex component styles
- CSS custom properties for theming

The rule: pick one approach for each concern and be consistent within that concern.

---

*More free developer tools at [DevPlaybook.cc](https://devplaybook.cc), including tools for working with [JSON](https://devplaybook.cc/tools/json-formatter), [Base64](https://devplaybook.cc/tools/base64-encoder), [regex](https://devplaybook.cc/tools/regex-tester), and more.*
