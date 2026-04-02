---
title: "Mintlify"
description: "Modern hosted documentation platform — write docs in MDX, sync from GitHub, and get a polished branded site with AI-powered search, analytics, and API reference generation."
category: "Documentation & DX Tools"
pricing: "Freemium"
pricingDetail: "Free: 1 deployment; Growth $150/month (custom domain + analytics); Enterprise custom"
website: "https://mintlify.com"
github: ""
tags: [documentation, mdx, hosted, api-reference, developer-tools, ai-search]
pros:
  - "Zero infrastructure — hosted, deployed from GitHub automatically"
  - "AI-powered search and chat (ask questions about your docs)"
  - "OpenAPI/Swagger auto-generates API reference pages"
  - "Beautiful default theme — looks professional with zero design work"
  - "Analytics: see which docs pages get traffic, where users drop off"
cons:
  - "Paid for custom domains and advanced features"
  - "Less flexible than self-hosted options (limited to Mintlify's MDX components)"
  - "Vendor lock-in to Mintlify's platform"
  - "Enterprise features expensive compared to self-hosted alternatives"
date: "2026-04-02"
---

## Overview

Mintlify is a hosted docs platform popular with developer tool startups and API companies (Resend, Loops, Trigger.dev use it). The core value prop: write MDX in your GitHub repo, and Mintlify handles the rest — hosting, search, AI chat, and auto-generated API references from your OpenAPI spec.

## Quick Start

```bash
npm install -g mintlify

# Initialize in your repo
mintlify init

# Preview locally
mintlify dev
```

## docs.json Configuration

```json
{
  "name": "My API",
  "logo": {
    "light": "/logo/light.svg",
    "dark": "/logo/dark.svg"
  },
  "favicon": "/favicon.ico",
  "colors": {
    "primary": "#6366F1"
  },
  "topbarLinks": [
    { "name": "Dashboard", "url": "https://app.myproduct.com" }
  ],
  "navigation": [
    {
      "group": "Get Started",
      "pages": ["introduction", "quickstart"]
    },
    {
      "group": "API Reference",
      "pages": ["api-reference/overview", "api-reference/authentication"]
    }
  ],
  "api": {
    "baseUrl": "https://api.myproduct.com",
    "auth": {
      "method": "bearer"
    }
  }
}
```

## OpenAPI Integration

Mintlify auto-generates interactive API reference pages from your OpenAPI spec:

```yaml
# docs.json — point to your OpenAPI file
{
  "openapi": "openapi.yaml"
}
```

Each endpoint gets its own page with:
- Request/response schema
- Interactive "Try it" panel
- Code examples in 10+ languages
- Authentication pre-filled from user's API key

## MDX Components

```mdx
---
title: "Authentication"
description: "How to authenticate requests to the API"
---

<Note>
  All API requests require a valid API key in the `Authorization` header.
</Note>

<CodeGroup>
```bash curl
curl -H "Authorization: Bearer $API_KEY" \
  https://api.example.com/v1/users
```

```python Python
import requests
resp = requests.get(
  "https://api.example.com/v1/users",
  headers={"Authorization": f"Bearer {API_KEY}"}
)
```
</CodeGroup>

<Card title="Get your API key" icon="key" href="/settings/api-keys">
  Generate an API key in the dashboard
</Card>
```

## GitHub Deployment

Mintlify deploys automatically from your GitHub repository:

```yaml
# .github/workflows/mintlify-preview.yml (auto-created by Mintlify)
# PRs get preview deployments with unique URLs
# Merges to main auto-deploy to your docs URL
```

Every PR gets a preview URL — team members can review doc changes without local setup.
