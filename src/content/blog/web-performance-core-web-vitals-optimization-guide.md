---
title: "Web Performance Optimization: Improve Your Core Web Vitals in 15 Steps"
description: "15 actionable web performance optimization techniques to improve LCP, CLS, and INP (Core Web Vitals). Real code examples, measurement tools, and before/after results."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["web-performance", "core-web-vitals", "lcp", "cls", "inp", "seo", "optimization", "2024"]
readingTime: "14 min read"
---

Web performance is not a nice-to-have. Google uses Core Web Vitals as a direct ranking signal. A one-second delay in page load time reduces conversions by 7%. Users abandon mobile pages that take more than three seconds to load at a rate of 53%. Performance is product quality.

The good news: most performance problems are predictable and fixable. This guide covers 15 concrete steps to improve your Core Web Vitals, with code examples for each.

## TL;DR

- Core Web Vitals: LCP (loading), CLS (visual stability), INP (interactivity)
- Good thresholds: LCP < 2.5s, CLS < 0.1, INP < 200ms
- Biggest wins: optimize images, reduce JavaScript, eliminate render-blocking resources
- Measure first with PageSpeed Insights and Lighthouse — fix what the data tells you
- Monitor production with real user metrics (RUM), not just lab tests

---

## Core Web Vitals Explained

Google's Core Web Vitals are three metrics that measure real user experience:

### LCP — Largest Contentful Paint

LCP measures how long it takes for the largest visible element on the page to render. Usually a hero image, video poster, or large heading. It's the best proxy for "when does the page feel loaded?"

| Score | LCP |
|-------|-----|
| Good | < 2.5 seconds |
| Needs improvement | 2.5 – 4.0 seconds |
| Poor | > 4.0 seconds |

Main causes of slow LCP: large unoptimized images, render-blocking CSS/JS, slow server response times.

### CLS — Cumulative Layout Shift

CLS measures unexpected visual instability — elements jumping around as the page loads. The number of times you've started clicking a button only to have it move because an ad loaded above it? That's CLS.

| Score | CLS |
|-------|-----|
| Good | < 0.1 |
| Needs improvement | 0.1 – 0.25 |
| Poor | > 0.25 |

Main causes: images without dimensions, dynamically injected content, late-loading fonts, third-party ads.

### INP — Interaction to Next Paint

INP (replaced FID in 2024) measures responsiveness. It tracks the latency of all user interactions (clicks, taps, keyboard input) throughout the page's lifetime and reports the worst one.

| Score | INP |
|-------|-----|
| Good | < 200ms |
| Needs improvement | 200ms – 500ms |
| Poor | > 500ms |

Main causes: large JavaScript bundles, long tasks blocking the main thread, unoptimized event handlers.

---

## Measuring Before You Optimize

Don't guess. Measure first.

**PageSpeed Insights**: Paste your URL at [pagespeed.web.dev](https://pagespeed.web.dev). Shows both lab data (Lighthouse) and real-world field data from Chrome UX Report (CrUX). This distinction matters — lab data shows what's possible; field data shows what real users experience.

**Chrome DevTools**: Open DevTools → Performance tab → Record while loading. Look for long tasks (red bars), large layout shifts, and render-blocking resources.

**Lighthouse CLI** (for CI integration):
```bash
npm install -g lighthouse
lighthouse https://yoursite.com --output html --output-path report.html
lighthouse https://yoursite.com --output json | jq '.categories.performance.score'
```

**web-vitals library** (for real user monitoring):
```javascript
import { getLCP, getCLS, getINP } from 'web-vitals';

getLCP(({ value, rating }) => {
  analytics.track('LCP', { value, rating });
});

getCLS(({ value, rating }) => {
  analytics.track('CLS', { value, rating });
});

getINP(({ value, rating }) => {
  analytics.track('INP', { value, rating });
});
```

---

## Step 1: Optimize Images

Images are typically the largest assets on a page and the single biggest lever for improving LCP.

**Use modern formats**: WebP is ~30% smaller than JPEG at equivalent quality. AVIF is even smaller but browser support is slightly lower.

```html
<!-- Use <picture> for format fallbacks -->
<picture>
  <source srcset="hero.avif" type="image/avif">
  <source srcset="hero.webp" type="image/webp">
  <img src="hero.jpg" alt="Hero image" width="1200" height="630">
</picture>
```

**Always specify width and height**: This prevents layout shifts (CLS) by reserving space before the image loads.

```html
<!-- Bad: no dimensions → layout shift when image loads -->
<img src="hero.webp" alt="Hero">

<!-- Good: dimensions reserve space -->
<img src="hero.webp" alt="Hero" width="1200" height="630">
```

**Lazy load below-the-fold images**:
```html
<!-- Lazy load everything below the fold -->
<img src="product.webp" alt="Product" width="400" height="300" loading="lazy">

<!-- Never lazy load the LCP element — it needs to load ASAP -->
<img src="hero.webp" alt="Hero" width="1200" height="630" loading="eager" fetchpriority="high">
```

**Use `srcset` for responsive images**:
```html
<img
  srcset="hero-480w.webp 480w, hero-800w.webp 800w, hero-1200w.webp 1200w"
  sizes="(max-width: 600px) 480px, (max-width: 900px) 800px, 1200px"
  src="hero-1200w.webp"
  alt="Hero"
  width="1200"
  height="630"
>
```

---

## Step 2: Eliminate Render-Blocking Resources

The browser can't render until it has processed all blocking CSS and JS. Every render-blocking resource delays your LCP.

**Identify blocking resources** in DevTools: Network tab → filter by JS/CSS → look for files loaded in the `<head>` that block rendering.

**Defer non-critical JavaScript**:
```html
<!-- Blocking — delays rendering -->
<script src="analytics.js"></script>

<!-- Deferred — downloads in parallel, executes after HTML parsed -->
<script src="app.js" defer></script>

<!-- Async — downloads in parallel, executes as soon as downloaded -->
<script src="chat-widget.js" async></script>
```

Use `defer` for scripts that depend on DOM or each other. Use `async` for truly independent scripts (analytics, chat widgets).

**Inline critical CSS, load the rest asynchronously**:
```html
<head>
  <!-- Critical CSS inlined — no render blocking -->
  <style>
    /* Above-the-fold styles only */
    body { margin: 0; font-family: system-ui, sans-serif; }
    .hero { height: 100vh; background: #f0f0f0; }
  </style>

  <!-- Non-critical CSS loaded without blocking -->
  <link rel="preload" href="full-styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
  <noscript><link rel="stylesheet" href="full-styles.css"></noscript>
</head>
```

---

## Step 3: Use a CDN

A CDN serves assets from servers geographically close to each user. A user in Tokyo downloading assets from a server in Virginia adds 150–200ms of network latency. A CDN cuts this to under 20ms.

Modern CDNs (Cloudflare, Fastly, AWS CloudFront) also provide:
- Automatic HTTPS termination
- HTTP/2 and HTTP/3
- Automatic image optimization (some)
- Edge caching for API responses

For static sites and SPAs, deploying directly to a CDN (Vercel, Netlify, Cloudflare Pages) gives you the best possible latency with minimal configuration.

---

## Step 4: Minify and Compress

**Minification** removes whitespace, comments, and renames variables. Run it as part of your build:

```javascript
// vite.config.js
export default {
  build: {
    minify: 'esbuild',  // or 'terser'
    cssMinify: true
  }
}

// webpack.config.js
const TerserPlugin = require('terser-webpack-plugin');
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin()]
  }
}
```

**Compression**: Enable Brotli (preferred over gzip) on your server. Brotli achieves 15–20% better compression than gzip for text assets.

```nginx
# Nginx: enable Brotli and gzip
brotli on;
brotli_comp_level 6;
brotli_types text/html text/css application/javascript application/json;

gzip on;
gzip_types text/html text/css application/javascript application/json;
gzip_vary on;
```

```javascript
// Express: compression middleware
const compression = require('compression');
app.use(compression({ level: 6 }));
```

---

## Step 5: Implement Caching Headers

Proper caching means returning visitors load your site from disk instead of the network. The strategy:

- **Static assets with hashed filenames** (main.a1b2c3.js): Cache forever
- **HTML** (the entry point): Don't cache, or short cache
- **API responses**: Cache based on content freshness

```nginx
# Nginx caching configuration

# Hashed static assets — immutable means "this never changes"
location ~* \.(js|css|woff2)$ {
  add_header Cache-Control "public, max-age=31536000, immutable";
}

# Images
location ~* \.(jpg|jpeg|png|webp|avif|gif|svg)$ {
  add_header Cache-Control "public, max-age=2592000";  # 30 days
}

# HTML — always revalidate
location ~* \.html$ {
  add_header Cache-Control "no-cache";
}
```

For API responses, use `ETag` and `Last-Modified` headers to enable conditional requests:
```http
HTTP/1.1 200 OK
ETag: "abc123"
Cache-Control: max-age=3600

# Subsequent request
GET /api/products HTTP/1.1
If-None-Match: "abc123"

# Response if unchanged
HTTP/1.1 304 Not Modified
```

---

## Step 6: Reduce JavaScript Bundle Size

Large JS bundles are the biggest driver of slow INP. The browser has to download, parse, and compile every byte of JavaScript before it can run.

**Code splitting**: Load code only when it's needed.

```javascript
// React: lazy load routes
import { lazy, Suspense } from 'react';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Suspense>
  );
}

// Dynamic import for a heavy library (used only on interaction)
button.addEventListener('click', async () => {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF();
  doc.save('report.pdf');
});
```

**Tree shaking**: Import only what you use.

```javascript
// Bad — imports entire lodash (70 KB)
import _ from 'lodash';
const result = _.groupBy(items, 'category');

// Good — imports just groupBy (3 KB)
import groupBy from 'lodash/groupBy';
const result = groupBy(items, 'category');
```

**Analyze your bundle** before and after:
```bash
# webpack
npm install --save-dev webpack-bundle-analyzer
# Add to webpack config, run build, view interactive treemap

# Vite
npm install --save-dev rollup-plugin-visualizer
```

---

## Step 7: Defer Non-Critical JavaScript

Third-party scripts (chat widgets, A/B testing, analytics) often run expensive code that blocks the main thread. Defer their initialization:

```javascript
// Load chat widget only after page is interactive
function loadChatWidget() {
  const script = document.createElement('script');
  script.src = 'https://cdn.chatwidget.com/widget.js';
  script.defer = true;
  document.head.appendChild(script);
}

// Wait until after LCP + initial interactions
if (document.readyState === 'complete') {
  setTimeout(loadChatWidget, 3000);
} else {
  window.addEventListener('load', () => setTimeout(loadChatWidget, 3000));
}
```

A more principled approach using `requestIdleCallback`:
```javascript
if ('requestIdleCallback' in window) {
  requestIdleCallback(() => loadChatWidget(), { timeout: 5000 });
} else {
  setTimeout(loadChatWidget, 3000);
}
```

---

## Step 8: Preconnect to Third-Party Origins

Establishing connections to external domains (Google Fonts, CDNs, APIs) takes time: DNS lookup + TCP handshake + TLS negotiation. Preconnect starts this process early:

```html
<head>
  <!-- Preconnect to origins you'll load from -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="preconnect" href="https://cdn.example.com">

  <!-- DNS prefetch for origins you might load from (lighter weight) -->
  <link rel="dns-prefetch" href="https://analytics.example.com">
</head>
```

Use `preconnect` sparingly — too many preconnect hints compete for bandwidth. Reserve it for origins that are definitely used in the critical rendering path.

---

## Step 9: Use System Fonts or font-display: swap

Custom fonts are a common source of both slow LCP (font file download) and CLS (layout shift when font swaps in).

```css
/* Option 1: System font stack — zero download time */
body {
  font-family: system-ui, -apple-system, BlinkMacSystemFont,
               'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
}

/* Option 2: If you need a custom font, use font-display: swap */
@font-face {
  font-family: 'Inter';
  src: url('/fonts/inter.woff2') format('woff2');
  font-display: swap;  /* Show fallback immediately, swap when loaded */
  font-weight: 400;
}
```

To minimize the layout shift that `swap` causes, use `size-adjust` to match the fallback font's metrics to your custom font:

```css
@font-face {
  font-family: 'Inter-Fallback';
  src: local('Arial');
  size-adjust: 107%;
  ascent-override: 90%;
  descent-override: 22%;
  line-gap-override: 0%;
}

body {
  font-family: 'Inter', 'Inter-Fallback', sans-serif;
}
```

Self-host your fonts rather than loading from Google Fonts — eliminates a third-party connection and gives you full control over caching.

---

## Step 10: Avoid Layout Shifts

CLS above 0.1 is often caused by a few predictable patterns:

**Always set explicit dimensions on images and video**:
```html
<!-- Sets aspect ratio, prevents layout shift -->
<img src="product.webp" width="400" height="300" alt="Product">

<!-- For responsive images, use aspect-ratio CSS -->
<style>
  .product-img { width: 100%; aspect-ratio: 4/3; }
</style>
```

**Reserve space for ads and embeds**:
```css
.ad-slot {
  min-height: 250px;  /* Reserve the expected ad height */
  background: #f5f5f5;
}
```

**Avoid inserting content above existing content**:
```javascript
// Bad: inserts a banner at top, pushes everything down
document.body.prepend(cookieBanner);

// Good: position fixed/sticky, doesn't affect document flow
cookieBanner.style.position = 'fixed';
cookieBanner.style.bottom = '0';
document.body.appendChild(cookieBanner);
```

---

## Step 11: Optimize CSS

**Remove unused CSS**: Large CSS frameworks often ship hundreds of kilobytes you don't use. Tools like PurgeCSS remove unused selectors:

```javascript
// postcss.config.js
module.exports = {
  plugins: [
    require('@fullhuman/postcss-purgecss')({
      content: ['./src/**/*.html', './src/**/*.jsx', './src/**/*.tsx'],
      defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || []
    })
  ]
}
```

**Inline critical CSS**: Extract and inline the CSS needed to render above-the-fold content. Tools like `critical` automate this:

```bash
npx critical index.html --base dist/ --inline --width 1300 --height 900
```

**Avoid `@import` in CSS**: Each `@import` creates a new request and blocks rendering. Combine files in your build step instead.

---

## Step 12: Use HTTP/2 or HTTP/3

HTTP/1.1 limits browsers to 6 simultaneous connections per origin. HTTP/2 eliminates this with multiplexing — many requests over a single connection.

HTTP/2 is enabled at the server/CDN level. If you're using a modern CDN, you almost certainly have it already. Check with:

```bash
curl -I --http2 https://yoursite.com | grep HTTP
# HTTP/2 200
```

HTTP/3 (QUIC) reduces connection establishment time further, especially beneficial on mobile. Cloudflare enables HTTP/3 automatically. For nginx:

```nginx
listen 443 quic reuseport;
listen 443 ssl;
add_header Alt-Svc 'h3=":443"; ma=86400';
```

With HTTP/2, the old optimization of combining many small files into one large file is often counterproductive. Smaller, separately cacheable files are preferable.

---

## Step 13: Implement Resource Hints

Resource hints tell the browser to act early on resources you'll need:

```html
<head>
  <!-- Preload: high priority, this page will definitely use this -->
  <link rel="preload" href="/fonts/inter.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/hero.webp" as="image">  <!-- Preload LCP image -->
  <link rel="preload" href="/api/critical-data" as="fetch" crossorigin>

  <!-- Prefetch: load for the next page navigation (low priority) -->
  <link rel="prefetch" href="/dashboard.js">

  <!-- Prerender: speculatively render the next page (aggressive) -->
  <link rel="prerender" href="/checkout">
</head>
```

The Speculation Rules API (Chrome 108+) gives more control over prefetch and prerender:

```html
<script type="speculationrules">
{
  "prerender": [
    {
      "where": { "href_matches": "/checkout" },
      "eagerness": "moderate"
    }
  ],
  "prefetch": [
    {
      "where": { "and": [{ "href_matches": "/*" }, { "not": { "href_matches": "/admin/*" } }] },
      "eagerness": "conservative"
    }
  ]
}
</script>
```

---

## Step 14: Optimize Third-Party Scripts

Third-party scripts are responsible for 40–60% of main thread blocking time on average. Be ruthless:

**Audit what you have**: Use the Coverage tab in Chrome DevTools (Cmd+Shift+P → Show Coverage) to see how much of each script is actually executed.

**Load order matters**:
```html
<!-- Don't let third parties block your critical path -->
<script>
  // Delay all third-party scripts until after TTI
  window.addEventListener('load', function() {
    // Google Tag Manager
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-XXXX');
  });
</script>
```

**Use Partytown** for isolating third-party scripts in a web worker:
```bash
npm install @builder.io/partytown
```
Partytown runs third-party scripts off the main thread, eliminating their impact on INP.

---

## Step 15: Monitor in Production

Lab tests show potential. Real user monitoring (RUM) shows what actually happens to your users.

**Lighthouse CI** — run Lighthouse in your CI pipeline and fail builds that regress:

```yaml
# .github/workflows/lighthouse.yml
name: Lighthouse CI
on: [push]
jobs:
  lighthouse:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - run: npx lhci autorun
```

`.lighthouserc.json`:
```json
{
  "ci": {
    "collect": {
      "url": ["http://localhost:3000"],
      "startServerCommand": "npm run serve"
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 2000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]
      }
    }
  }
}
```

**Production RUM** with the web-vitals library:
```javascript
import { getLCP, getCLS, getINP, getFCP, getTTFB } from 'web-vitals';

function sendToAnalytics({ name, value, id, rating }) {
  fetch('/api/vitals', {
    method: 'POST',
    body: JSON.stringify({ name, value, id, rating, url: window.location.href }),
    keepalive: true  // ensures the request completes even if user navigates away
  });
}

getLCP(sendToAnalytics);
getCLS(sendToAnalytics);
getINP(sendToAnalytics);
getFCP(sendToAnalytics);
getTTFB(sendToAnalytics);
```

Use the [JSON Formatter](/tools/json-formatter) to inspect and validate the vitals payloads your monitoring is sending.

---

## Prioritizing the Work

Not all 15 steps are equal. Based on typical real-world impact:

**Highest impact (do these first)**:
1. Optimize images (Step 1) — often 40–60% of page weight
2. Reduce JS bundle (Step 6) — biggest lever for INP
3. Eliminate render-blocking resources (Step 2) — direct LCP improvement
4. Set explicit image dimensions (Step 10) — eliminates CLS immediately

**High impact**:
5. Enable compression (Step 4) — easy win, significant size reduction
6. Use a CDN (Step 3) — transforms network latency
7. Preload LCP image (Step 13) — targeted LCP improvement

**Ongoing**:
8. Monitor in production (Step 15) — without this, you won't know when regressions happen

Run PageSpeed Insights before and after each optimization to quantify the improvement. The field data usually shows change within 28 days as real users experience the updated site.

Performance work is never done — new features, new dependencies, and new third-party scripts will keep introducing regressions. The teams with the fastest sites are the ones with monitoring that catches regressions before they compound.
