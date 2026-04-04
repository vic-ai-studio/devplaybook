---
title: "Nextra"
description: "Next.js-based documentation framework — write docs in MDX and get a fast, beautiful site with file-system routing, built-in search, and full Next.js ecosystem access."
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
