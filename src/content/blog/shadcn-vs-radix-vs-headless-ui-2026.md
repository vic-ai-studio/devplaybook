---
title: "ShadCN UI vs Radix UI vs Headless UI: Complete Component Library Guide 2026"
description: "In-depth comparison of ShadCN UI, Radix UI, and Headless UI for React in 2026 — customization, accessibility, bundle size, TypeScript support, and which to pick for your project."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["react", "ui-components", "shadcn", "radix-ui", "headless-ui", "accessibility", "typescript"]
readingTime: "11 min read"
---

The React component library space has consolidated around three strong contenders: **ShadCN UI**, **Radix UI**, and **Headless UI**. Each solves the styling-vs-functionality tradeoff differently. This guide cuts through the hype so you can match the right tool to your project.

---

## Quick Overview

| | ShadCN UI | Radix UI | Headless UI |
|--|-----------|----------|-------------|
| Maintainer | shadcn | WorkOS | Tailwind Labs |
| Model | Copy-paste components | npm primitives | npm primitives |
| Styling | Tailwind CSS (built-in) | Unstyled (BYO CSS) | Unstyled (Tailwind-friendly) |
| Accessibility | WCAG 2.1 AA (via Radix) | WCAG 2.1 AA | WCAG 2.1 AA |
| TypeScript | Full | Full | Full |
| Bundle size | 0 (your code) | Per-package | Per-package |
| Framework support | React (Next.js focus) | React | React, Vue |
| Stars (2026) | 85K+ | 16K+ | 25K+ |

---

## ShadCN UI

ShadCN UI isn't a component library in the traditional sense — it's a **CLI that copies component source code into your project**. There's no `shadcn-ui` package to install and update. You own the code.

### Installation

```bash
# Initialize (Next.js example)
npx shadcn@latest init

# Add components individually
npx shadcn@latest add button
npx shadcn@latest add dialog
npx shadcn@latest add form
```

Running `add` copies the component file directly into `components/ui/` in your project. You can edit it freely — it's your code now.

### What You Get

ShadCN components are built on Radix UI primitives, styled with Tailwind CSS, and use `class-variance-authority` (CVA) for variant management:

```tsx
// components/ui/button.tsx (generated code you own)
import { cva, type VariantProps } from 'class-variance-authority';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### Theming System

ShadCN uses CSS custom properties for theming, making dark mode trivial:

```css
/* globals.css */
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 222.2 47.4% 11.2%;
  --primary-foreground: 210 40% 98%;
  --radius: 0.5rem;
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --primary: 210 40% 98%;
  --primary-foreground: 222.2 47.4% 11.2%;
}
```

### Strengths and Limitations

**Strengths:**
- Zero runtime overhead — it's just your Tailwind CSS
- No version lock-in; you own every component
- Beautiful defaults that are actually production-ready
- Deep Next.js integration (Server Components support)
- Growing ecosystem: 50+ components, `shadcn/charts`, blocks

**Limitations:**
- Tailwind CSS is a hard dependency
- Updating components requires re-running the CLI (no automatic updates)
- Less suitable for design systems that need strict version control across multiple apps

---

## Radix UI

Radix UI provides **unstyled, accessible primitives** via individual npm packages. Each component handles all the hard parts — keyboard navigation, focus management, ARIA attributes, browser quirks — and gives you a completely blank canvas for styling.

### Installation

```bash
# Install only what you need
npm install @radix-ui/react-dialog
npm install @radix-ui/react-dropdown-menu
npm install @radix-ui/react-tooltip
```

### Building a Custom Dialog

```tsx
import * as Dialog from '@radix-ui/react-dialog';

export function CustomDialog() {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button className="btn-primary">Open Dialog</button>
      </Dialog.Trigger>

      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 animate-fadeIn" />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
                     bg-white rounded-lg shadow-xl p-6 w-full max-w-md
                     focus:outline-none"
        >
          <Dialog.Title className="text-xl font-semibold">
            Edit Profile
          </Dialog.Title>
          <Dialog.Description className="text-gray-500 mt-1">
            Make changes to your profile here.
          </Dialog.Description>

          {/* content */}

          <Dialog.Close asChild>
            <button className="absolute top-4 right-4" aria-label="Close">
              ✕
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
```

Radix handles: focus trap inside the dialog, `Escape` key to close, ARIA `role="dialog"` and `aria-labelledby`, scroll locking, and portal rendering. You handle zero of that.

### The `asChild` Pattern

`asChild` is Radix's polymorphic rendering API — it merges Radix behavior onto your own component:

```tsx
// Your custom button component gets all Dialog.Trigger behavior
<Dialog.Trigger asChild>
  <MyCustomButton />
</Dialog.Trigger>
```

This avoids nested DOM issues and keeps your component hierarchy clean.

### Bundle Size

Radix packages are granular and tree-shakable:

| Package | Gzipped size |
|---------|-------------|
| `@radix-ui/react-button` | ~1.2 KB |
| `@radix-ui/react-dialog` | ~4.8 KB |
| `@radix-ui/react-dropdown-menu` | ~6.2 KB |
| `@radix-ui/react-select` | ~8.1 KB |

### Strengths and Limitations

**Strengths:**
- Best-in-class accessibility primitives (WAI-ARIA patterns)
- Zero styling opinions — works with any CSS approach
- Granular imports keep bundle size minimal
- Highly composable with `asChild`
- Foundation for many other libraries (ShadCN, Ark UI, etc.)

**Limitations:**
- No default styling — you build everything from scratch
- Higher initial investment for teams without a design system
- Inconsistent animation APIs across packages

---

## Headless UI

Headless UI is maintained by the **Tailwind Labs** team (makers of Tailwind CSS). Like Radix, it provides unstyled accessible components — but it's optimized for **Tailwind CSS users** and also supports **Vue**.

### Installation

```bash
npm install @headlessui/react
```

### Example: Combobox

```tsx
import { Combobox } from '@headlessui/react';
import { useState } from 'react';

const people = ['Alice Johnson', 'Bob Smith', 'Carol Williams'];

export function PersonSearch() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(people[0]);

  const filtered =
    query === ''
      ? people
      : people.filter(p => p.toLowerCase().includes(query.toLowerCase()));

  return (
    <Combobox value={selected} onChange={setSelected}>
      <Combobox.Input
        onChange={(e) => setQuery(e.target.value)}
        className="w-full border border-gray-300 rounded-md py-2 px-3
                   focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <Combobox.Options className="absolute z-10 mt-1 bg-white shadow-lg
                                   rounded-md py-1 max-h-60 overflow-auto">
        {filtered.map(person => (
          <Combobox.Option
            key={person}
            value={person}
            className={({ active }) =>
              `px-4 py-2 cursor-pointer ${active ? 'bg-blue-600 text-white' : 'text-gray-900'}`
            }
          >
            {person}
          </Combobox.Option>
        ))}
      </Combobox.Options>
    </Combobox>
  );
}
```

### Vue Support

Headless UI is the only library in this comparison with first-class Vue support:

```vue
<template>
  <Combobox v-model="selected">
    <ComboboxInput
      @change="query = $event.target.value"
      class="w-full border rounded-md py-2 px-3"
    />
    <ComboboxOptions class="absolute mt-1 bg-white shadow-lg rounded-md">
      <ComboboxOption
        v-for="person in filtered"
        :key="person"
        :value="person"
        v-slot="{ active }"
      >
        <li :class="active ? 'bg-blue-600 text-white' : 'text-gray-900'" class="px-4 py-2">
          {{ person }}
        </li>
      </ComboboxOption>
    </ComboboxOptions>
  </Combobox>
</template>
```

### Component Coverage

Headless UI has fewer components than Radix (v2 ships ~15 vs Radix's 35+). Missing primitives like `Tooltip`, `Accordion`, `Tabs`, and `Toast` must come from elsewhere.

### Strengths and Limitations

**Strengths:**
- Vue support (only option with this)
- Cleaner, more ergonomic API than Radix for simpler cases
- First-party Tailwind CSS integration
- Lighter install footprint (single package for all components)

**Limitations:**
- Fewer components than Radix
- React support less comprehensive than Radix
- Slower release cadence

---

## Side-by-Side: Accessibility

All three libraries implement WCAG 2.1 AA and WAI-ARIA patterns. The differences are in implementation detail:

| Feature | ShadCN | Radix | Headless UI |
|---------|--------|-------|-------------|
| Focus trap | ✅ (via Radix) | ✅ | ✅ |
| Keyboard navigation | ✅ | ✅ | ✅ |
| ARIA attributes | ✅ | ✅ | ✅ |
| Screen reader testing | Community | Dedicated team | Dedicated team |
| Color contrast (defaults) | Passes AA | N/A (unstyled) | N/A (unstyled) |

For pure accessibility guarantees, Radix and Headless UI win because they're tested against the primitives independently of styling.

---

## TypeScript Support

All three are fully TypeScript-first with excellent inference.

```tsx
// ShadCN — ButtonProps extends native HTMLButtonElement attributes
<Button variant="destructive" size="sm" onClick={handleDelete} />

// Radix — Dialog.Content inherits all div attributes
<Dialog.Content onEscapeKeyDown={(e: KeyboardEvent) => {}} />

// Headless UI — render prop types are inferred
<Combobox.Option
  value={person}
  className={({ active, selected }: { active: boolean; selected: boolean }) =>
    active ? 'bg-blue-600' : ''
  }
/>
```

---

## Bundle Size in Practice

Since ShadCN copies code into your project, its bundle size equals exactly what you use after Tailwind purging — typically **0 additional KB** at runtime beyond your CSS.

Radix and Headless UI ship JS. In a realistic app with 10 Radix primitives installed, expect ~35–50 KB gzipped. Headless UI's single-package approach means you pay for all components even if unused (unless your bundler tree-shakes aggressively).

---

## Which Should You Choose?

### Choose ShadCN UI if:
- You're using **Tailwind CSS** already
- You want **beautiful defaults** without spending days on design
- You're building a **Next.js** or **Vite + React** project
- You need to ship fast and own the component code

### Choose Radix UI if:
- You have a **custom design system** or use CSS Modules / Styled Components
- You need the **widest component coverage**
- Accessibility is a **legal or contractual requirement**
- You want components as stable, versioned npm dependencies

### Choose Headless UI if:
- You're building a **Vue.js** project
- Your team is all-in on Tailwind but doesn't want the ShadCN copy-paste model
- You need a **smaller API surface** and simpler mental model

---

## The Practical Answer for Most Projects

**Start with ShadCN UI.** The default components look polished, the CLI workflow is fast, and you get full Radix accessibility for free. If you hit a component that ShadCN doesn't have, install the Radix primitive directly alongside.

This hybrid approach — ShadCN for 80% of components, bare Radix for the remaining 20% — is what most production Next.js projects end up doing anyway.

---

## Resources

- [ShadCN UI docs](https://ui.shadcn.com) — component catalog, themes, blocks
- [Radix UI docs](https://www.radix-ui.com) — all primitives with accessibility notes
- [Headless UI docs](https://headlessui.com) — React and Vue guides
- [Radix Themes](https://www.radix-ui.com/themes) — Radix's own styled component layer built on primitives
