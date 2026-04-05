---
title: "Nextra — Next.js-Based Static Site Generator for Documentation"
description: "Nextra brings file-system routing and full React ecosystem to docs — minimal config, built-in search, and the same Next.js stack your app already uses."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://nextra.site"
github: "https://github.com/shuding/nextra"
tags: ["documentation", "nextjs", "mdx", "static-site", "open-source", "developer-tools", "react", "docs-site"]
pros:
  - "Built on Next.js — full React ecosystem, image optimization, ISR"
  - "File-system routing — folder structure becomes navigation automatically"
  - "Full-text search out of the box (no Algolia required for basic use)"
  - "Two themes: Docs (documentation) and Blog — both polished"
  - "Minimal config — create `_meta.json` to control navigation order"
cons:
  - "Smaller community than Docusaurus"
  - "No built-in versioning support"
  - "Theming is more opinionated and harder to customize"
  - "Less enterprise features (no i18n out of the box)"
date: "2026-04-02"
---

## Overview

Nextra is a minimal documentation framework built on Next.js. Where Docusaurus has a large plugin ecosystem, Nextra stays lean — if you're already comfortable with Next.js, Nextra feels like a natural extension. The Vercel team uses it for their own documentation.

## Quick Start

```bash
npx create-next-app -e https://github.com/shuding/nextra-docs-template my-docs
cd my-docs
npm dev
```

## File Structure

```
pages/
├── _meta.json          ← navigation order and labels
├── index.mdx           ← home page
├── getting-started.mdx
└── api/
    ├── _meta.json
    ├── index.mdx
    └── authentication.mdx
```

## \_meta.json Navigation Control

```json
{
  "index": "Introduction",
  "getting-started": "Getting Started",
  "api": {
    "title": "API Reference",
    "type": "menu",
    "items": {
      "index": "Overview",
      "authentication": "Authentication"
    }
  },
  "contact": {
    "title": "Contact",
    "type": "page",
    "href": "https://example.com/contact",
    "newWindow": true
  }
}
```

## MDX with Callouts

Nextra ships built-in callout components:

```mdx
import { Callout, Steps, Tabs } from 'nextra/components'

<Callout type="warning">
  This API is deprecated. Use v2 instead.
</Callout>

<Steps>
### Step 1: Install

```bash
npm install my-package
```

### Step 2: Configure

Add to your config...
</Steps>
```

## Theme Configuration

```javascript
// theme.config.tsx
export default {
  logo: <span>My Docs</span>,
  project: {
    link: 'https://github.com/org/repo',
  },
  docsRepositoryBase: 'https://github.com/org/repo/tree/main',
  footer: {
    text: 'MIT 2026 © My Project',
  },
  useNextSeoProps() {
    return { titleTemplate: '%s – My Docs' };
  },
}
```

## Nextra vs Docusaurus

| | Nextra | Docusaurus |
|--|--------|------------|
| Framework | Next.js | Custom React |
| Setup complexity | Low | Medium |
| Versioning | ❌ | ✅ |
| i18n | ❌ | ✅ |
| Search | Built-in (basic) | Algolia |
| Customization | Limited | High |
| Best for | Simple/medium docs | Large product docs |

---

## Concrete Use Case: Building a Library's API Documentation

Imagine you're maintaining an open-source TypeScript library with 50+ exported functions. Users constantly ask "which parameters does this function accept?" and "what does it return?" You need a docs site that:

1. Renders your existing README and contribution guides in MDX
2. Auto-generates API reference pages from your TSDoc comments
3. Has full-text search so users can find functions by name
4. Looks polished without weeks of customization work

Nextra handles this end-to-end. Your `pages/api/` folder maps directly to URL paths, so adding a new API page is just creating an MDX file. The built-in `note`, `warning`, and `danger` callout components let you highlight breaking changes and migration guides. Since Nextra is built on Next.js, you can sprinkle in React components anywhere in MDX — for example, an interactive parameter table component that renders from your type definitions.

The result is a documentation site that a solo maintainer can set up in an afternoon and extend indefinitely without fighting a plugin system.

## Real Code Example: Adding an API Reference Page with Auto-Generated Props

Here's a pattern for a library that uses TypeScript and exports types alongside implementations:

```mdx
---
title: useLocalStorage Hook
---

import { Callout } from 'nextra/components'

# useLocalStorage

A React hook that syncs state to `localStorage` with SSR safety.

## Usage

```tsx
import { useLocalStorage } from '@/hooks/useLocalStorage';

function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('theme', 'light');
  return <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
    Current: {theme}
  </button>;
}
```

## Parameters

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `key` | `string` | — | `localStorage` key to sync with |
| `initialValue` | `T` | — | Default value if key is absent |

## Returns

A `useState`-style tuple: `[value, setValue]`.

<Callout type="warning">
**SSR Note:** This hook returns `initialValue` on the first render (server-side) and the stored value after hydration. Wrap in a `useEffect` if you need the stored value immediately on mount.
</Callout>
```

The key insight is that Nextra's MDX support lets you mix prose, tables, and callouts with live code blocks — no separate documentation generator required.

## When to Use Nextra

**Use Nextra when:**
- You already know Next.js or React and want docs that feel like a natural extension of your existing stack
- You're building docs for a library, API, or developer tool where MDX gives you the right expressiveness
- You want a fast, lightweight docs site without the overhead of Docusaurus's plugin ecosystem
- You're comfortable with file-system routing as your primary navigation model
- You want a polished blog and docs site from the same codebase (Nextra supports both themes)

**When NOT to use Nextra:**
- You need built-in internationalization (i18n) — Docusaurus or VitePress handle this better out of the box
- You're documenting a large, multi-versioned product (Docusaurus's versioning system is battle-tested for this)
- You need deep theming customization beyond what the theme.config.tsx API exposes
- You want to use an existing Docusaurus plugin or the broader React ecosystem of documentation tooling
- Your team has no React/Next.js experience and needs the fastest possible ramp-up — raw VitePress may be simpler

## Other Notable Alternatives

| Tool | Framework | Best For |
|------|-----------|----------|
| **VitePress** | Vue + Vite | Simpler than Nextra, fast, good for static docs |
| **Docusaurus** | React (custom) | Large docs, versioning, i18n, Algolia search |
| **Docsify** | None (runtime) | Quick docs from markdown, no build step |
| **GitBook** | SaaS | Teams that want hosted docs with CMS features |
