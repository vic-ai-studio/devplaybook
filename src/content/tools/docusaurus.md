---
title: "Docusaurus"
description: "Meta's open-source documentation framework — build fast, searchable docs sites with MDX, versioning, i18n, and Algolia search, powered by React under the hood."
category: "Documentation & DX Tools"
pricing: "Free"
pricingDetail: "Open source (MIT)"
website: "https://docusaurus.io"
github: "https://github.com/facebook/docusaurus"
tags: [documentation, mdx, react, static-site, open-source, developer-tools, algolia]
pros:
  - "MDX support — embed React components directly in Markdown docs"
  - "Built-in versioning — maintain docs for multiple release versions"
  - "Algolia DocSearch integration — powerful full-text search out of the box"
  - "i18n ready — localization support with per-locale content"
  - "Active community and maintained by Meta"
cons:
  - "React dependency — heavier than pure static generators"
  - "Custom theming requires React knowledge"
  - "Build times increase significantly with large doc sites"
  - "Plugin ecosystem smaller than general-purpose SSGs"
date: "2026-04-02"
---

## Overview

Docusaurus is Meta's battle-tested documentation framework used by projects like React, Jest, Redux, and Prettier. It turns Markdown/MDX files into a fast, SEO-optimized docs site with features teams actually need: versioning for multiple release branches, i18n for translated docs, and Algolia search.

## Quick Start

```bash
npx create-docusaurus@latest my-docs classic --typescript
cd my-docs
npm start
```

## Configuration

```typescript
// docusaurus.config.ts
import type { Config } from '@docusaurus/types';

const config: Config = {
  title: 'My Project',
  tagline: 'Documentation',
  url: 'https://docs.myproject.com',
  baseUrl: '/',

  presets: [
    ['classic', {
      docs: {
        sidebarPath: './sidebars.ts',
        editUrl: 'https://github.com/org/repo/tree/main/',
        versions: {
          current: { label: '2.0.0-beta' },
        },
      },
      blog: { showReadingTime: true },
      theme: { customCss: './src/css/custom.css' },
    }],
  ],

  themeConfig: {
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'my-project',
    },
  },
};

export default config;
```

## MDX with Components

```mdx
---
title: API Reference
---

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';
import ApiExample from '@site/src/components/ApiExample';

## Authentication

<Tabs>
  <TabItem value="bearer" label="Bearer Token">
    ```http
    Authorization: Bearer <token>
    ```
  </TabItem>
  <TabItem value="apikey" label="API Key">
    ```http
    X-API-Key: <your-key>
    ```
  </TabItem>
</Tabs>

<ApiExample endpoint="/users" method="GET" />
```

## Versioning

```bash
# Create a new docs version snapshot
npm run docusaurus docs:version 1.0.0

# Resulting structure:
# versioned_docs/version-1.0.0/   ← snapshot
# docs/                            ← next (current)
```

## Deployment

```bash
# GitHub Pages
npm run build
npm run deploy  # Uses gh-pages branch

# Vercel: zero config — auto-detects Docusaurus
# Set output directory to: build
```
