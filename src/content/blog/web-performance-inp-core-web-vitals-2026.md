---
title: "Web Performance 2026: INP, Core Web Vitals & Lighthouse CI"
description: "Master web performance in 2026: INP replacing FID, LCP and CLS optimization, Lighthouse CI in GitHub Actions, RUM with web-vitals.js, and setting performance budgets to keep your site fast."
date: "2026-03-28"
tags: [performance, core-web-vitals, lighthouse, inp, lcp, cls]
readingTime: "14 min read"
---

# Web Performance 2026: INP, Core Web Vitals & Lighthouse CI

Web performance in 2026 is no longer a nice-to-have. Google's Core Web Vitals directly affect search rankings, and users abandon pages that don't respond within 400ms. The good news: the tooling has never been better.

This guide covers the current state of Core Web Vitals — including the INP metric that replaced FID in 2024 — plus practical techniques for LCP and CLS, integrating Lighthouse into CI/CD, Real User Monitoring (RUM) with the web-vitals.js library, and performance budgets that prevent regressions before they ship.

## Core Web Vitals in 2026: What's Changed

Google's Core Web Vitals are three field metrics measured from real users:

| Metric | Measures | Good | Needs Improvement | Poor |
|--------|----------|------|-------------------|------|
| **LCP** | Loading | ≤ 2.5s | 2.5s–4.0s | > 4.0s |
| **INP** | Interactivity | ≤ 200ms | 200ms–500ms | > 500ms |
| **CLS** | Visual stability | ≤ 0.1 | 0.1–0.25 | > 0.25 |

The biggest change since 2024: **INP (Interaction to Next Paint) replaced FID (First Input Delay)**. FID only measured the delay before the browser could start processing an input event. INP measures the full cost of any interaction — from click to visual update — throughout the page's entire lifetime.

## INP: The New Interactivity Metric

### What INP Actually Measures

INP captures the latency of all click, tap, and keyboard interactions during a session, then reports the worst one (with some outlier filtering for long sessions). It has three phases:

```
User Input → [Input Delay] → [Processing Time] → [Presentation Delay] → Visual Update
                                                                          ↑
                                                                     This is INP
```

- **Input delay**: time from interaction start to when the event handler runs (often caused by long tasks blocking the main thread)
- **Processing time**: how long the event handlers themselves take
- **Presentation delay**: time for the browser to render after handlers complete

### Diagnosing INP Problems

The best tool for diagnosing INP is Chrome DevTools Performance panel combined with the web-vitals.js `onINP` callback:

```javascript
import { onINP } from 'web-vitals/attribution';

onINP(({ value, attribution }) => {
  const { interactionTarget, inputDelay, processingDuration, presentationDelay } = attribution;

  console.log({
    inp: value,
    element: interactionTarget,
    inputDelay,
    processingDuration,
    presentationDelay
  });

  // Send to analytics
  sendToAnalytics({
    metric: 'INP',
    value,
    element: interactionTarget,
    breakdown: { inputDelay, processingDuration, presentationDelay }
  });
});
```

The `attribution` object tells you *which* element caused the poor INP, and *where* the time was spent.

### Fixing INP: Input Delay

Input delay usually means a long task is blocking the main thread when the user interacts. Break up long tasks with `scheduler.yield()` (or the older `setTimeout` trick):

```javascript
// Before: one big blocking task
function processLargeDataset(items) {
  for (const item of items) {
    expensiveOperation(item);
  }
}

// After: yield between chunks to stay responsive
async function processLargeDataset(items) {
  for (let i = 0; i < items.length; i++) {
    expensiveOperation(items[i]);

    // Yield every 50 items to let the browser handle input events
    if (i % 50 === 0) {
      await scheduler.yield(); // Chrome 115+
      // Fallback: await new Promise(r => setTimeout(r, 0));
    }
  }
}
```

Use the Scheduler API with priorities for critical work:

```javascript
// Prioritize user-visible work
await scheduler.postTask(updateUI, { priority: 'user-blocking' });

// Defer analytics until browser is idle
await scheduler.postTask(sendAnalytics, { priority: 'background' });
```

### Fixing INP: Processing Time

Expensive event handlers are the second culprit. Profile them and optimize:

```javascript
// Bad: synchronous, blocking render
button.addEventListener('click', () => {
  const data = heavyComputation(); // blocks for 200ms
  updateDOM(data);
});

// Better: move heavy work off the critical path
button.addEventListener('click', async () => {
  showLoadingState(); // immediate feedback

  const data = await new Promise(resolve => {
    requestIdleCallback(() => resolve(heavyComputation()));
  });

  updateDOM(data);
  hideLoadingState();
});

// Best: use a Web Worker for CPU-intensive work
const worker = new Worker('./heavy-computation-worker.js');

button.addEventListener('click', () => {
  showLoadingState();
  worker.postMessage({ type: 'compute', payload: inputData });
});

worker.onmessage = ({ data }) => {
  updateDOM(data.result);
  hideLoadingState();
};
```

## LCP Optimization

LCP measures when the largest visible content element (usually a hero image or heading) loads. Getting to ≤ 2.5s requires attacking every phase of loading.

### Prioritize the LCP Resource

The most common LCP fix is ensuring the browser discovers the LCP image early:

```html
<!-- Add fetchpriority="high" to your LCP image -->
<img
  src="/hero.jpg"
  fetchpriority="high"
  loading="eager"
  alt="Hero image"
  width="1200"
  height="600"
/>

<!-- Or preload it in <head> -->
<link rel="preload" as="image" href="/hero.jpg" fetchpriority="high" />

<!-- For responsive images -->
<link
  rel="preload"
  as="image"
  href="/hero.jpg"
  imagesrcset="/hero-400.jpg 400w, /hero-800.jpg 800w, /hero-1200.jpg 1200w"
  imagesizes="(max-width: 400px) 400px, (max-width: 800px) 800px, 1200px"
  fetchpriority="high"
/>
```

Never lazy-load your LCP image. Use `loading="eager"` (the default) and add `fetchpriority="high"`.

### Reduce Time to First Byte (TTFB)

LCP can't start until the HTML arrives. Improve TTFB with:

**Edge caching** — serve HTML from CDN edge nodes close to users:

```javascript
// Next.js: cache the page at the edge
export const revalidate = 3600; // revalidate every hour

// Or in middleware for fine-grained control
export function middleware(request) {
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  return response;
}
```

**Streaming SSR** — start sending HTML immediately, stream the rest:

```javascript
// React 18 streaming with Suspense
import { Suspense } from 'react';

export default function Page() {
  return (
    <>
      <AboveTheFold /> {/* renders immediately */}
      <Suspense fallback={<Skeleton />}>
        <SlowDataSection /> {/* streams in after data loads */}
      </Suspense>
    </>
  );
}
```

### Image Optimization

Modern image formats and proper sizing eliminate most image-related LCP problems:

```javascript
// Next.js Image component handles most of this automatically
import Image from 'next/image';

export function HeroImage() {
  return (
    <Image
      src="/hero.jpg"
      alt="Hero"
      width={1200}
      height={600}
      priority // equivalent to fetchpriority="high"
      quality={85}
      placeholder="blur"
      blurDataURL="data:image/jpeg;base64,/9j/4AAQ..." // tiny base64 placeholder
    />
  );
}
```

For non-Next.js setups, use the `<picture>` element with AVIF/WebP:

```html
<picture>
  <source type="image/avif" srcset="/hero.avif 1x, /hero@2x.avif 2x" />
  <source type="image/webp" srcset="/hero.webp 1x, /hero@2x.webp 2x" />
  <img
    src="/hero.jpg"
    srcset="/hero.jpg 1x, /hero@2x.jpg 2x"
    alt="Hero"
    fetchpriority="high"
    width="1200"
    height="600"
  />
</picture>
```

## CLS: Preventing Layout Shifts

Cumulative Layout Shift measures how much the page layout moves unexpectedly while loading. The most common causes and fixes:

### Always Set Image Dimensions

```html
<!-- Bad: browser doesn't reserve space, causes CLS when image loads -->
<img src="/product.jpg" alt="Product" />

<!-- Good: browser reserves space using aspect ratio -->
<img src="/product.jpg" alt="Product" width="800" height="600" />
```

```css
/* Or use aspect-ratio in CSS */
.product-image {
  aspect-ratio: 4 / 3;
  width: 100%;
  object-fit: cover;
}
```

### Reserve Space for Dynamic Content

```css
/* Reserve space for ads, embeds, and async content */
.ad-slot {
  min-height: 250px; /* standard ad height */
  width: 300px;
  contain: layout; /* prevent content outside from affecting this */
}

/* Use content-visibility for off-screen sections */
.article-section {
  content-visibility: auto;
  contain-intrinsic-size: 0 500px; /* estimate the height */
}
```

### Handle Web Fonts Without Shifts

```css
/* Use font-display: optional to prevent FOUT/FOUT */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: optional; /* don't show fallback at all if font loads slow */
}

/* Or use swap with size-adjust to minimize layout shift */
@font-face {
  font-family: 'MyFont';
  src: url('/fonts/myfont.woff2') format('woff2');
  font-display: swap;
}

@font-face {
  font-family: 'MyFontFallback';
  src: local('Arial');
  size-adjust: 104%; /* adjust fallback to match custom font metrics */
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

Use the [Font style matcher](https://meowni.ca/font-style-matcher/) to find the right adjustment values for your specific fonts.

## Lighthouse CI in GitHub Actions

Automate performance testing on every PR with Lighthouse CI:

### Install and Configure

```bash
npm install --save-dev @lhci/cli
```

Create `lighthouserc.js` in your project root:

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/blog',
        'http://localhost:3000/products',
      ],
      startServerCommand: 'npm run start',
      startServerReadyPattern: 'ready on',
      numberOfRuns: 3, // run 3 times, report median
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
      },
    },
    upload: {
      target: 'temporary-public-storage', // free, links expire in 7 days
      // Or use LHCI server: target: 'lhci', serverBaseUrl: 'https://lhci.example.com'
    },
  },
};
```

### GitHub Actions Workflow

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build
        run: npm run build

      - name: Run Lighthouse CI
        run: npx lhci autorun
        env:
          LHCI_GITHUB_APP_TOKEN: ${{ secrets.LHCI_GITHUB_APP_TOKEN }}

      - name: Upload Lighthouse results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: lighthouse-results
          path: .lighthouseci/
```

### PR Status Checks

With the GitHub App token, LHCI posts results directly to PR checks:

```yaml
# Tighter thresholds for performance-critical pages
assert:
  assertions:
    'categories:performance': ['error', { minScore: 0.9 }]
    'largest-contentful-paint':
      - error
      - maxNumericValue: 2500
        aggregationMethod: optimistic  # use best of 3 runs
    'cumulative-layout-shift':
      - error
      - maxNumericValue: 0.1
        aggregationMethod: median
    'total-blocking-time':
      - warn
      - maxNumericValue: 200
        aggregationMethod: pessimistic  # use worst of 3 runs
```

## Real User Monitoring with web-vitals.js

Lab data (Lighthouse) tells you what performance looks like in a controlled environment. RUM tells you what real users experience.

### Basic Setup

```bash
npm install web-vitals
```

```javascript
// lib/analytics.js
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id, attribution }) {
  // Send to your analytics provider
  // Example: Google Analytics 4
  window.gtag('event', name, {
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    metric_id: id,
    metric_value: value,
    metric_delta: value,
    // Attribution data for INP
    ...(attribution && {
      metric_element: attribution.interactionTarget,
      metric_input_delay: attribution.inputDelay,
      metric_processing: attribution.processingDuration,
    }),
  });
}

// Register all Core Web Vitals
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
onFCP(sendToAnalytics);
onTTFB(sendToAnalytics);
```

### Advanced: Segment by Connection Type

Understanding how performance varies by device and connection is crucial:

```javascript
import { onLCP, onINP, onCLS } from 'web-vitals/attribution';

function getConnectionInfo() {
  const nav = navigator.connection || {};
  return {
    effectiveType: nav.effectiveType || 'unknown', // '4g', '3g', etc.
    saveData: nav.saveData || false,
    rtt: nav.rtt || 0,
  };
}

function sendToAnalytics({ name, value, attribution }) {
  const connection = getConnectionInfo();
  const deviceMemory = navigator.deviceMemory || 'unknown';
  const cores = navigator.hardwareConcurrency || 'unknown';

  sendBeacon('/api/metrics', {
    name,
    value,
    url: window.location.pathname,
    connection,
    deviceMemory,
    cores,
    attribution,
    timestamp: Date.now(),
  });
}
```

### Building a Metrics Dashboard

Store metrics in a time-series database and visualize them:

```javascript
// api/metrics.js (Next.js API route)
import { sql } from '@vercel/postgres';

export async function POST(request) {
  const { name, value, url, connection, deviceMemory } = await request.json();

  await sql`
    INSERT INTO web_vitals (metric, value, url, connection_type, device_memory, created_at)
    VALUES (${name}, ${value}, ${url}, ${connection.effectiveType}, ${deviceMemory}, NOW())
  `;

  return new Response('ok');
}

// Query for dashboard: p75 per metric per day
// SELECT
//   DATE_TRUNC('day', created_at) as day,
//   metric,
//   PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75
// FROM web_vitals
// WHERE created_at > NOW() - INTERVAL '30 days'
// GROUP BY day, metric
// ORDER BY day, metric;
```

## Performance Budgets

Performance budgets define thresholds you're not allowed to cross. When integrated into CI, they catch regressions before they ship.

### Types of Budgets

```javascript
// lighthouserc.js — multiple budget types
module.exports = {
  ci: {
    assert: {
      budgets: [
        {
          path: '/',
          timings: [
            { metric: 'first-contentful-paint', budget: 1500 },
            { metric: 'largest-contentful-paint', budget: 2500 },
            { metric: 'total-blocking-time', budget: 200 },
          ],
          resourceSizes: [
            { resourceType: 'script', budget: 300 }, // KB
            { resourceType: 'image', budget: 500 },
            { resourceType: 'total', budget: 1000 },
          ],
          resourceCounts: [
            { resourceType: 'script', budget: 10 },
            { resourceType: 'third-party', budget: 5 },
          ],
        },
      ],
    },
  },
};
```

### Webpack Bundle Analysis

Track JavaScript bundle size as part of CI:

```bash
npm install --save-dev webpack-bundle-analyzer bundlesize
```

```json
// package.json
{
  "bundlesize": [
    {
      "path": ".next/static/chunks/pages/*.js",
      "maxSize": "100 kB"
    },
    {
      "path": ".next/static/chunks/framework-*.js",
      "maxSize": "45 kB"
    }
  ]
}
```

```yaml
# In your GitHub Actions workflow
- name: Check bundle sizes
  run: npx bundlesize
```

### Automated Performance Regression Alerts

```javascript
// scripts/check-perf-budget.js
const BUDGETS = {
  LCP: 2500,
  INP: 200,
  CLS: 0.1,
  TBT: 300,
  FCP: 1800,
};

async function checkBudgets() {
  // Fetch p75 from your RUM database
  const metrics = await fetchCurrentMetrics();

  const violations = Object.entries(BUDGETS).filter(([metric, budget]) => {
    return metrics[metric]?.p75 > budget;
  });

  if (violations.length > 0) {
    await sendSlackAlert({
      text: `⚠️ Performance budget violation detected`,
      violations: violations.map(([metric, budget]) => ({
        metric,
        budget,
        actual: metrics[metric].p75,
        overage: `${((metrics[metric].p75 / budget - 1) * 100).toFixed(1)}% over`,
      })),
    });
  }
}
```

## Quick Wins Checklist

Before diving into complex optimizations, run through these high-impact changes:

**Loading:**
- [ ] Add `fetchpriority="high"` to LCP image
- [ ] Remove `loading="lazy"` from above-the-fold images
- [ ] Enable HTTP/2 or HTTP/3 on your server
- [ ] Preconnect to third-party origins: `<link rel="preconnect" href="https://fonts.googleapis.com">`
- [ ] Compress assets with Brotli (better than gzip for text)

**Interactivity:**
- [ ] Defer non-critical JavaScript: `<script defer src="...">` or dynamic `import()`
- [ ] Remove unused JavaScript (check with Chrome Coverage tab)
- [ ] Move heavy computations to Web Workers
- [ ] Add `content-visibility: auto` to off-screen content

**Visual stability:**
- [ ] Set explicit `width` and `height` on all images
- [ ] Reserve space for ads and async embeds
- [ ] Use `font-display: optional` or size-adjust for web fonts
- [ ] Avoid inserting content above existing content on load

**Monitoring:**
- [ ] Install web-vitals.js and pipe to analytics
- [ ] Set up Lighthouse CI in GitHub Actions
- [ ] Create a Grafana or DataDog dashboard for Core Web Vitals trends

## Tools Reference

| Tool | Purpose | When to Use |
|------|---------|-------------|
| [PageSpeed Insights](https://pagespeed.web.dev/) | Field + lab data combined | Audit any public URL |
| Chrome DevTools Performance | Frame-by-frame profiling | Debug specific interactions |
| [web-vitals.js](https://github.com/GoogleChrome/web-vitals) | RUM library | Production monitoring |
| Lighthouse CLI | Automated audits | Local development |
| `@lhci/cli` | CI integration | GitHub Actions |
| Chrome User Experience Report | Aggregate field data | Competitive benchmarking |
| WebPageTest | Advanced waterfall analysis | Deep-dive root cause analysis |

## Summary

Web performance in 2026 centers on three things:

1. **INP** is your new interactivity target — use `scheduler.yield()`, Web Workers, and attribution data from web-vitals.js to find and fix slow interactions
2. **LCP** requires attacking the full loading chain: TTFB, resource discovery, and image optimization
3. **CLS** is mostly about reserving space upfront — dimensions on images, space for ads, and font metrics adjustments

Automate the feedback loop with Lighthouse CI on every PR and RUM dashboards in production. Performance regressions caught pre-deploy cost minutes to fix; caught in production, they cost you rankings and conversions.
