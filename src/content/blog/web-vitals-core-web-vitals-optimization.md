---
title: "Web Vitals Optimization: Achieve Core Web Vitals Score 90+ in 2026"
description: "Step-by-step guide to achieving Core Web Vitals score of 90+ in 2026. Covers LCP, INP, CLS optimization techniques with code examples, measurement tools, and before/after benchmarks."
date: "2026-03-24"
tags: ["web-vitals", "performance", "lcp", "inp", "cls", "seo", "javascript"]
readingTime: "11 min read"
---

# Web Vitals Optimization: Achieve Core Web Vitals Score 90+ in 2026

Core Web Vitals directly affect Google search rankings. A score under 50 hurts your SEO; above 90 gives you a ranking boost. Here's a systematic guide to achieving and maintaining 90+ scores.

## The 2026 Core Web Vitals Metrics

| Metric | What It Measures | Good | Needs Work | Poor |
|--------|-----------------|------|------------|------|
| **LCP** (Largest Contentful Paint) | Loading speed | <2.5s | 2.5-4s | >4s |
| **INP** (Interaction to Next Paint) | Responsiveness | <200ms | 200-500ms | >500ms |
| **CLS** (Cumulative Layout Shift) | Visual stability | <0.1 | 0.1-0.25 | >0.25 |

INP replaced FID (First Input Delay) in March 2024 and is the metric most developers underestimate.

---

## Measure First

### PageSpeed Insights (Field Data)

Test your real URLs at [pagespeed.web.dev](https://pagespeed.web.dev). It shows both lab data (Lighthouse) and field data (real user Chrome data). **Field data is what Google uses for rankings.**

### Lighthouse CI in Your Pipeline

```yaml
# GitHub Actions: block deploys when vitals regress
- name: Run Lighthouse CI
  uses: treosh/lighthouse-ci-action@v11
  with:
    urls: |
      https://preview-${{ github.sha }}.your-app.com/
    budgetPath: .lighthouserc.json
    uploadArtifacts: true

# .lighthouserc.json
{
  "ci": {
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 2500 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }],
        "total-blocking-time": ["error", { "maxNumericValue": 300 }]
      }
    }
  }
}
```

### Real User Monitoring (RUM)

```javascript
// Measure CWV in production with the web-vitals library
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';

function sendToAnalytics(metric) {
  // Send to your analytics endpoint
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({
      name: metric.name,
      value: metric.value,
      rating: metric.rating, // 'good' | 'needs-improvement' | 'poor'
      delta: metric.delta,
      id: metric.id,
      navigationType: metric.navigationType,
    }),
    keepalive: true,
  });
}

onCLS(sendToAnalytics);
onINP(sendToAnalytics);
onLCP(sendToAnalytics);
```

---

## Optimizing LCP (Largest Contentful Paint)

LCP is usually your hero image, above-the-fold text, or a banner. The browser needs to discover, fetch, and render it quickly.

### 1. Preload Your LCP Element

```html
<!-- Tell the browser to fetch the LCP image immediately -->
<link rel="preload" as="image" href="/hero.webp"
      fetchpriority="high"
      imagesrcset="/hero-400.webp 400w, /hero-800.webp 800w, /hero-1200.webp 1200w"
      imagesizes="100vw">
```

### 2. Use Modern Image Formats

```html
<!-- WebP with AVIF fallback — significant size reduction -->
<picture>
  <source type="image/avif" srcset="/hero.avif">
  <source type="image/webp" srcset="/hero.webp">
  <img src="/hero.jpg" alt="Hero" width="1200" height="600"
       fetchpriority="high">
</picture>
```

AVIF achieves 50% better compression than WebP at equivalent quality. Use ImageMagick or Squoosh for conversion:

```bash
# Convert to AVIF (ImageMagick 7+)
magick hero.jpg -quality 80 hero.avif

# Convert to WebP
magick hero.jpg -quality 85 hero.webp
```

### 3. Eliminate Render-Blocking Resources

```html
<!-- ❌ Render-blocking CSS in <head> -->
<link rel="stylesheet" href="/vendor.css">

<!-- ✅ Critical CSS inlined, rest deferred -->
<style>
  /* Critical above-the-fold styles inline */
  body { margin: 0; font-family: system-ui; }
  .hero { ... }
</style>
<link rel="stylesheet" href="/vendor.css" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="/vendor.css"></noscript>
```

### 4. Use a CDN with Edge Caching

Without CDN: request travels datacenter → user (200-400ms added latency)
With CDN: cached at edge node near user (<50ms)

```nginx
# Cache control for static assets
location ~* \.(webp|avif|woff2|js|css)$ {
  expires 1y;
  add_header Cache-Control "public, immutable";
}
```

### 5. Server-Side Rendering for Text LCP

If your LCP element is text inside a JavaScript-rendered component, SSR it:

```jsx
// Next.js: SSR the above-the-fold content
export async function getServerSideProps() {
  const heroData = await fetchHeroContent();
  return { props: { heroData } };
}

function HeroSection({ heroData }) {
  // Rendered on server → LCP text appears immediately
  return <h1>{heroData.headline}</h1>;
}
```

---

## Optimizing INP (Interaction to Next Paint)

INP measures how quickly your page responds to user interactions: clicks, taps, keyboard input. Unlike FID (which measured first interaction only), INP measures all interactions.

### 1. Break Up Long Tasks

The browser can't process user input during a long JavaScript task. Tasks over 50ms block the main thread.

```javascript
// ❌ Long synchronous task blocks interactions
function processLargeDataset(items) {
  return items.map(item => expensiveTransform(item)); // 500ms+
}

// ✅ Yield to browser between chunks
async function processLargeDatasetAsync(items) {
  const results = [];
  const CHUNK_SIZE = 100;

  for (let i = 0; i < items.length; i += CHUNK_SIZE) {
    const chunk = items.slice(i, i + CHUNK_SIZE);
    results.push(...chunk.map(expensiveTransform));

    // Yield to browser: let it process pending interactions
    await new Promise(resolve => setTimeout(resolve, 0));
    // Or: await scheduler.yield(); (Chrome 115+)
  }

  return results;
}
```

### 2. Use Scheduler.yield() for Smoother Interactions

```javascript
// Scheduler.yield: purpose-built for cooperative scheduling
async function handleButtonClick(event) {
  // First paint: show immediate feedback
  setLoading(true);

  // Yield: let browser update the UI before heavy work
  await scheduler.yield();

  // Now do expensive work
  const result = await processData(largeDataset);
  setResult(result);
  setLoading(false);
}
```

### 3. Defer Non-Critical JavaScript

```javascript
// ❌ Import at top level: runs during initial parse
import { heavyAnalytics } from './analytics';
heavyAnalytics.init(); // Blocks first render

// ✅ Lazy load after user interaction
document.querySelector('#analytics-btn')?.addEventListener('click', async () => {
  const { heavyAnalytics } = await import('./analytics');
  heavyAnalytics.track('click');
});
```

### 4. Optimize Event Handlers

```javascript
// ❌ Expensive work in input handler
input.addEventListener('input', (e) => {
  const results = searchItems(allItems, e.target.value); // Runs every keystroke
  renderResults(results);
});

// ✅ Debounce expensive operations
import { debounce } from './utils';

const debouncedSearch = debounce((query) => {
  const results = searchItems(allItems, query);
  renderResults(results);
}, 150);

input.addEventListener('input', (e) => {
  // Immediate feedback (input value update is instant)
  debouncedSearch(e.target.value); // Heavy work waits
});
```

---

## Optimizing CLS (Cumulative Layout Shift)

CLS penalizes unexpected layout shifts — elements moving around as the page loads. The most common causes:

### 1. Reserve Space for Images and Embeds

```html
<!-- ❌ No dimensions → layout shift when image loads -->
<img src="/product.jpg" alt="Product">

<!-- ✅ Width/height prevents layout shift -->
<img src="/product.jpg" alt="Product" width="800" height="600">

<!-- ✅ aspect-ratio in CSS for responsive images -->
<style>
  img {
    width: 100%;
    aspect-ratio: 4/3;
    height: auto;
  }
</style>
```

### 2. Avoid Injecting Content Above Existing Content

```javascript
// ❌ Inserting banner above existing content
document.body.insertBefore(cookieBanner, document.body.firstChild);

// ✅ Use position: fixed or reserve space in layout
const cookieBanner = document.getElementById('cookie-banner');
// Already in HTML with reserved height, initially hidden
cookieBanner.style.display = 'block';
```

### 3. Font Loading Optimization

```css
/* Prevent flash of invisible/unstyled text */
@font-face {
  font-family: 'CustomFont';
  src: url('/fonts/custom.woff2') format('woff2');
  font-display: swap;     /* Show system font → swap to custom font */
  font-display: optional; /* Use custom font only if cached — best for CLS */
}
```

```html
<!-- Preload critical fonts -->
<link rel="preload" href="/fonts/custom.woff2" as="font" type="font/woff2" crossorigin>
```

### 4. Animations That Cause Layout Shifts

```css
/* ❌ These properties trigger layout recalculation */
.expanding {
  transition: height 0.3s; /* Causes layout shift */
  transition: margin 0.3s; /* Causes layout shift */
  transition: padding 0.3s; /* Causes layout shift */
}

/* ✅ Use transform and opacity — no layout recalculation */
.expanding {
  transition: transform 0.3s, opacity 0.3s;
  transform: scaleY(1);
}
.collapsed {
  transform: scaleY(0);
  opacity: 0;
}
```

---

## The 90+ Score Checklist

### LCP < 2.5s
- [ ] Preload LCP image with `fetchpriority="high"`
- [ ] Serve images in WebP/AVIF format
- [ ] Use a CDN with edge caching
- [ ] Eliminate render-blocking CSS/JS
- [ ] SSR above-the-fold content

### INP < 200ms
- [ ] No long tasks (>50ms) in JavaScript
- [ ] Use `scheduler.yield()` or `setTimeout(0)` to yield
- [ ] Debounce input handlers
- [ ] Defer non-critical JavaScript loading
- [ ] Code split routes and features

### CLS < 0.1
- [ ] All images have `width` and `height` attributes
- [ ] Reserve space for dynamic content (ads, embeds)
- [ ] Use `font-display: optional` for web fonts
- [ ] Only animate `transform` and `opacity`
- [ ] No content injected above existing content

---

## Related Articles

- **[JavaScript Bundle Size Optimization](/blog/javascript-bundle-size-optimization-guide)** — reduce JavaScript that hurts LCP and INP
- **[React Performance: useMemo vs useCallback vs memo](/blog/react-performance-usememo-usecallback-memo)** — reduce JavaScript execution time
- **[TypeScript Performance 2026](/blog/typescript-performance-optimization-2026)** — build-time optimizations
- **[Node.js Memory Management Guide](/blog/nodejs-memory-management-profiling)** — server response time affects LCP

---

## Summary

Achieving 90+ Core Web Vitals requires attacking all three metrics simultaneously. LCP responds best to image optimization, CDN deployment, and eliminating render-blocking resources. INP requires breaking up long JavaScript tasks and deferring non-critical work. CLS is fixed by reserving space for dynamic content and using transform-based animations.

Set up Lighthouse CI in your pipeline to catch regressions before they reach production. Add real user monitoring with the `web-vitals` library to track actual user experience, not just lab conditions. The gap between lab and field data is often 20-40% — optimizing for real users is what moves the needle on search rankings.
