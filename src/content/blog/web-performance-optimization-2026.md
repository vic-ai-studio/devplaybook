---
title: "Web Performance Optimization 2026: Core Web Vitals, LCP, CLS, FID"
description: "Web performance optimization guide for 2026: improve Core Web Vitals (LCP, CLS, INP), reduce JavaScript bundle size, optimize images, implement lazy loading, and measure with Lighthouse."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["web performance", "Core Web Vitals", "LCP", "CLS", "INP", "Lighthouse", "optimization"]
readingTime: "9 min read"
category: "performance"
---

Google's Core Web Vitals are now a confirmed ranking factor. More importantly, they are direct measures of user experience: how fast content appears, how stable the layout is, and how quickly the page responds to interaction. This guide gives you concrete techniques to hit the "Good" threshold on all three metrics, with practical examples for Next.js and Astro.

## Understanding Core Web Vitals Thresholds

| Metric | Good | Needs Improvement | Poor |
|--------|------|------------------|------|
| LCP (Largest Contentful Paint) | < 2.5s | 2.5s – 4s | > 4s |
| CLS (Cumulative Layout Shift) | < 0.1 | 0.1 – 0.25 | > 0.25 |
| INP (Interaction to Next Paint) | < 200ms | 200ms – 500ms | > 500ms |

INP replaced FID (First Input Delay) as an official Core Web Vital in 2024. Unlike FID which measured the delay for the first interaction, INP measures the responsiveness of all interactions throughout the page lifecycle.

## Measuring Core Web Vitals

### In the Browser (web-vitals library)

```javascript
import { onLCP, onCLS, onINP } from 'web-vitals';

function sendToAnalytics({ name, value, id, rating }) {
  // Send to your analytics endpoint
  navigator.sendBeacon('/analytics', JSON.stringify({
    metric: name,
    value: Math.round(name === 'CLS' ? value * 1000 : value),
    id,
    rating, // 'good' | 'needs-improvement' | 'poor'
    url: window.location.href,
    timestamp: Date.now(),
  }));
}

onLCP(sendToAnalytics);
onCLS(sendToAnalytics);
onINP(sendToAnalytics);
```

### With Lighthouse CI

Add Lighthouse to your CI pipeline to prevent regressions:

```bash
npm install -g @lhci/cli

# .lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/', 'http://localhost:3000/blog/'],
      startServerCommand: 'npm run start',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};

# In CI
lhci autorun
```

## Improving LCP (Largest Contentful Paint)

LCP measures when the largest visible element — usually a hero image or heading — is painted. The most impactful fixes:

### 1. Preload the LCP Image

```html
<!-- Add to <head> — critical for LCP images above the fold -->
<link rel="preload" as="image" href="/hero.webp"
  imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1600.webp 1600w"
  imagesizes="100vw"
  fetchpriority="high">
```

In Next.js:

```jsx
import Image from 'next/image';

// priority prop triggers <link rel="preload">
<Image
  src="/hero.jpg"
  alt="Hero"
  width={1600}
  height={900}
  priority  // <-- this is the key
  fetchPriority="high"
/>
```

### 2. Optimize Image Format and Size

Switch to WebP or AVIF (30-50% smaller than JPEG at same quality):

```jsx
// Next.js — automatic format optimization
// next.config.js
module.exports = {
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
};

// Astro — built-in image optimization
---
import { Image } from 'astro:assets';
import heroImage from '../assets/hero.jpg';
---
<Image
  src={heroImage}
  alt="Hero"
  width={1200}
  height={675}
  format="avif"
  quality={80}
  loading="eager"
  fetchpriority="high"
/>
```

### 3. Eliminate Render-Blocking Resources

```html
<!-- Defer non-critical scripts -->
<script src="analytics.js" defer></script>
<script src="chat-widget.js" async></script>

<!-- Inline critical CSS, defer the rest -->
<style>
  /* critical above-the-fold styles inlined here */
  body { margin: 0; font-family: system-ui; }
  .hero { min-height: 100vh; display: flex; align-items: center; }
</style>
<link rel="preload" href="/styles/main.css" as="style"
  onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="/styles/main.css"></noscript>
```

### 4. Use a CDN and Edge Caching

An LCP image served from a CDN 50ms away will always beat one from an origin server 200ms away. Ensure your CDN cache hit ratio for images is >95%.

## Improving CLS (Cumulative Layout Shift)

CLS measures unexpected layout movement. The most common causes:

### Always Set Image Dimensions

```html
<!-- BAD — browser doesn't know height until image loads, causing shift -->
<img src="photo.jpg" alt="Photo">

<!-- GOOD — browser reserves space before image loads -->
<img src="photo.jpg" alt="Photo" width="800" height="600">
```

```css
/* Modern CSS aspect-ratio approach */
.hero-image {
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
```

### Reserve Space for Dynamic Content

```css
/* Skeleton screen for content that loads after hydration */
.card-skeleton {
  min-height: 200px;
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
```

### Avoid Inserting Content Above Existing Content

```javascript
// BAD — inserting a banner above existing content shifts everything down
document.body.insertAdjacentHTML('afterbegin', '<div class="cookie-banner">...</div>');

// GOOD — use a fixed/sticky element that doesn't affect document flow
// Or pre-allocate the space so no shift occurs
```

### Font Loading Without FOUT

```css
/* Reserve space for fonts to prevent layout shift */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: optional; /* skip font if not loaded quickly (best for CLS) */
}

/* Or use font-display: swap with size-adjust to match fallback metrics */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;
  size-adjust: 100%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}
```

## Improving INP (Interaction to Next Paint)

INP measures how quickly the page responds to user interactions. Poor INP is caused by long tasks blocking the main thread.

### Break Up Long Tasks

```javascript
// BAD — 500ms synchronous work blocks the main thread
function processLargeData(items) {
  return items.map(item => expensiveTransform(item)); // blocks for 500ms
}

// GOOD — yield to the browser between chunks
async function processLargeDataAsync(items, chunkSize = 50) {
  const results = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    results.push(...chunk.map(item => expensiveTransform(item)));

    // Yield to browser after each chunk
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
      // Or use scheduler.yield() in Chrome 115+
      // await scheduler.yield();
    }
  }

  return results;
}
```

### Optimize Event Handlers

```javascript
// BAD — heavy computation directly in click handler
button.addEventListener('click', (e) => {
  const result = heavyComputation(e.target.dataset.id); // blocks INP
  updateUI(result);
});

// GOOD — start UI update immediately, defer heavy work
button.addEventListener('click', (e) => {
  // Immediate visual feedback (keeps INP low)
  button.setAttribute('aria-busy', 'true');
  button.textContent = 'Processing...';

  // Defer heavy work
  setTimeout(() => {
    const result = heavyComputation(e.target.dataset.id);
    updateUI(result);
    button.removeAttribute('aria-busy');
  }, 0);
});

// Better — move to web worker
const worker = new Worker('/workers/compute.js');
button.addEventListener('click', (e) => {
  button.setAttribute('aria-busy', 'true');
  worker.postMessage({ id: e.target.dataset.id });
});
worker.onmessage = ({ data }) => {
  updateUI(data.result);
  button.removeAttribute('aria-busy');
};
```

## JavaScript Bundle Optimization

### Code Splitting in Next.js

```jsx
import dynamic from 'next/dynamic';

// Load heavy components only when needed
const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
  loading: () => <div className="chart-skeleton" style={{ height: 400 }} />,
  ssr: false, // client-only if it uses browser APIs
});

const HeavyEditor = dynamic(() => import('../components/RichTextEditor'), {
  loading: () => <textarea placeholder="Loading editor..." />,
});

export default function Dashboard() {
  const [showChart, setShowChart] = useState(false);

  return (
    <div>
      <button onClick={() => setShowChart(true)}>Show Chart</button>
      {showChart && <HeavyChart />}
    </div>
  );
}
```

### Analyzing Your Bundle

```bash
# Next.js bundle analyzer
npm install @next/bundle-analyzer

# next.config.js
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});
module.exports = withBundleAnalyzer({});

# Run
ANALYZE=true npm run build
```

Look for:
- Duplicate packages (two versions of the same library)
- Large packages imported fully but only partially used
- Server-side packages accidentally included in client bundle

### Tree Shaking

```javascript
// BAD — imports the entire lodash library (~70KB)
import _ from 'lodash';
const sorted = _.sortBy(items, 'name');

// GOOD — imports only the function used (~1KB)
import sortBy from 'lodash/sortBy';
const sorted = sortBy(items, 'name');

// Even better — use native alternatives
const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name));
```

## Resource Hints

```html
<!-- Preload: critical resources for current page -->
<link rel="preload" href="/fonts/inter.woff2" as="font" crossorigin>
<link rel="preload" href="/hero.webp" as="image" fetchpriority="high">

<!-- Prefetch: resources needed for next navigation -->
<link rel="prefetch" href="/blog/next-article" as="document">

<!-- Preconnect: establish connection to external origins early -->
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://api.yourdomain.com">

<!-- DNS-prefetch: cheaper fallback when preconnect is not supported -->
<link rel="dns-prefetch" href="https://analytics.yourdomain.com">
```

In Next.js 14+ App Router, resource hints are handled automatically for fonts and images when using the built-in components. For Astro, use the `<head>` slot in your layout.

## Lazy Loading Images Below the Fold

```html
<!-- Native lazy loading — browser handles it automatically -->
<img src="image.jpg" alt="..." loading="lazy" width="800" height="600">

<!-- Never lazy-load LCP images (above fold) -->
<img src="hero.jpg" alt="Hero" loading="eager" fetchpriority="high">
```

```jsx
// Next.js — lazy loading is default for non-priority images
<Image src="/below-fold.jpg" alt="..." width={800} height={600} />
// priority images are NOT lazy loaded
<Image src="/hero.jpg" alt="Hero" priority width={1600} height={900} />
```

## Web Performance 2026 Checklist

**LCP**
- [ ] LCP image preloaded with `<link rel="preload" fetchpriority="high">`
- [ ] Hero images in WebP/AVIF format
- [ ] No render-blocking scripts in `<head>`
- [ ] Critical CSS inlined, rest deferred

**CLS**
- [ ] All images have explicit `width` and `height` attributes
- [ ] Fonts use `font-display: optional` or `swap` with size adjustments
- [ ] No content inserted above the fold after load
- [ ] Skeleton screens for dynamically loaded content

**INP**
- [ ] No long tasks (>50ms) in event handlers
- [ ] Heavy computation offloaded to web workers
- [ ] Code splitting for large components
- [ ] Immediate visual feedback on all interactive elements

**General**
- [ ] Bundle analyzed with @next/bundle-analyzer — no obvious bloat
- [ ] Tree shaking verified for large libraries
- [ ] Resource hints set for critical external origins
- [ ] Lighthouse CI running on every PR with score thresholds

Small improvements compound: fixing your LCP image preload alone can move LCP from 3.5s to 2.1s. Measure each change with Lighthouse and real user data from the `web-vitals` library to confirm impact before moving on.
