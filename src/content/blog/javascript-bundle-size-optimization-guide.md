---
title: "JavaScript Bundle Size Optimization: From 2MB to 200KB — A Practical Guide"
description: "Practical techniques to reduce JavaScript bundle size from megabytes to kilobytes. Covers tree shaking, code splitting, dynamic imports, bundle analysis, and tools that actually work in 2026."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["javascript", "performance", "webpack", "vite", "optimization", "web-vitals"]
readingTime: "11 min read"
---

# JavaScript Bundle Size Optimization: From 2MB to 200KB

A 2MB JavaScript bundle is a performance emergency. On a 4G connection it takes 2-3 seconds to download and parse — before your app renders anything. Here's a systematic approach to cutting bundle size dramatically.

## Step 1: Analyze Before You Optimize

Never guess. Measure first.

### Webpack Bundle Analyzer

```bash
npm install --save-dev webpack-bundle-analyzer

# webpack.config.js
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');

module.exports = {
  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
      reportFilename: 'bundle-report.html',
    }),
  ],
};
```

Run `npm run build` and open `bundle-report.html`. You'll see a treemap of every dependency's contribution to your bundle. Common offenders: moment.js (330KB), lodash (70KB), date-fns (34KB per locale).

### Vite Bundle Analysis

```bash
npm install --save-dev rollup-plugin-visualizer

# vite.config.ts
import { visualizer } from 'rollup-plugin-visualizer';

export default {
  plugins: [
    visualizer({
      open: true,
      filename: 'dist/stats.html',
      gzipSize: true,
      brotliSize: true,
    }),
  ],
};
```

### Bundlephobia for Quick Checks

Before adding any npm package, check [bundlephobia.com](https://bundlephobia.com) for the bundle cost. Example: `lodash` costs 70KB — `lodash-es` with tree shaking costs 0-70KB depending on what you import.

---

## Step 2: Replace Heavy Libraries

### Moment.js → date-fns or Temporal API

```javascript
// Before: moment.js (330KB)
import moment from 'moment';
const formatted = moment(date).format('MMMM Do YYYY');

// After: date-fns (tree-shakeable, ~1KB for this function)
import { format } from 'date-fns';
const formatted = format(date, 'MMMM do yyyy');

// Even better: Temporal API (zero bundle cost, native 2026)
const formatted = new Temporal.PlainDate
  .from(date)
  .toLocaleString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
```

### Lodash → Native JavaScript

```javascript
// Before: lodash (70KB)
import _ from 'lodash';
const result = _.groupBy(users, 'department');
const unique = _.uniqBy(items, 'id');
const sorted = _.sortBy(data, ['name', 'age']);

// After: native JS (0KB)
const result = Object.groupBy(users, u => u.department);  // ES2024
const unique = [...new Map(items.map(i => [i.id, i])).values()];
const sorted = data.toSorted((a, b) =>
  a.name.localeCompare(b.name) || a.age - b.age
);
```

If you genuinely need lodash, import individual functions:

```javascript
// Partial import with tree shaking
import groupBy from 'lodash/groupBy';
import uniqBy from 'lodash/uniqBy';
```

### Axios → Fetch API

```javascript
// Before: axios (14KB)
import axios from 'axios';
const { data } = await axios.get('/api/users');

// After: fetch (0KB, native)
const data = await fetch('/api/users').then(r => r.json());

// With error handling
async function fetchUsers() {
  const res = await fetch('/api/users');
  if (!res.ok) throw new Error(`HTTP error: ${res.status}`);
  return res.json();
}
```

---

## Step 3: Tree Shaking — Make It Actually Work

Tree shaking removes unused code, but only works with ES modules (import/export syntax).

### Common Tree Shaking Failures

```javascript
// ❌ CommonJS: can't tree shake
const { pick } = require('lodash');

// ✅ ESM: fully tree-shakeable
import { pick } from 'lodash-es';

// ❌ Re-exporting entire library defeats tree shaking
export * from 'some-library';

// ✅ Named re-exports preserve tree shaking
export { Button, Input, Modal } from 'some-library';
```

### Webpack Tree Shaking Config

```javascript
// webpack.config.js
module.exports = {
  mode: 'production',  // Enables tree shaking automatically
  optimization: {
    usedExports: true,  // Mark unused exports
    sideEffects: false, // Trust package.json sideEffects field
  },
};
```

Add `"sideEffects": false` to your `package.json` to tell bundlers your code is side-effect free:

```json
{
  "sideEffects": ["*.css", "*.scss"]
}
```

---

## Step 4: Code Splitting

Don't ship code users haven't requested yet.

### Route-Based Splitting (React)

```jsx
// Before: all routes in one bundle
import Dashboard from './Dashboard';
import Settings from './Settings';
import AdminPanel from './AdminPanel';

// After: each route loaded on demand
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const AdminPanel = lazy(() => import('./AdminPanel'));

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
    </Suspense>
  );
}
```

### Dynamic Imports for Features

```javascript
// Load heavy features only when needed
async function handleExport() {
  // xlsx is 200KB — only load when user clicks Export
  const { default: XLSX } = await import('xlsx');
  const workbook = XLSX.utils.book_new();
  // ...
}

// Load syntax highlighting only on code pages
async function highlightCode(code, language) {
  const { highlight } = await import('highlight.js');
  return highlight(code, { language }).value;
}
```

### Webpack SplitChunksPlugin

```javascript
optimization: {
  splitChunks: {
    chunks: 'all',
    cacheGroups: {
      // Separate vendor chunks for better caching
      react: {
        test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
        name: 'react',
        priority: 20,
      },
      vendors: {
        test: /[\\/]node_modules[\\/]/,
        name: 'vendors',
        priority: 10,
        reuseExistingChunk: true,
      },
    },
  },
},
```

---

## Step 5: Compression

Modern compression is dramatically effective on JavaScript.

### Brotli Compression (Best)

```nginx
# nginx.conf
gzip on;
gzip_static on;

brotli on;
brotli_static on;
brotli_comp_level 6;
brotli_types text/javascript application/javascript application/json;
```

A 500KB JavaScript file typically compresses to:
- Gzip: ~150KB (70% reduction)
- Brotli: ~120KB (76% reduction)

Serve pre-compressed `.br` files for maximum efficiency.

### Vite/Webpack Compression Plugin

```javascript
// vite.config.ts
import viteCompression from 'vite-plugin-compression';

export default {
  plugins: [
    viteCompression({ algorithm: 'brotliCompress' }),
    viteCompression({ algorithm: 'gzip' }),
  ],
};
```

---

## Step 6: Optimize Images and Assets in JS

Sometimes the "JavaScript bundle" includes base64-encoded assets.

```javascript
// webpack.config.js — prevent base64 inlining for large assets
module.exports = {
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 4 * 1024, // Only inline files under 4KB
          },
        },
      },
    ],
  },
};
```

---

## Step 7: Measure the Real-World Impact

Bundle size and runtime performance aren't the same thing. Measure both.

```javascript
// Performance Observer API: measure parsing time
const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    if (entry.name.includes('chunk')) {
      console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
    }
  }
});
observer.observe({ type: 'resource', buffered: true });
```

### Core Web Vitals Targets

| Metric | Good | Needs Improvement | Poor |
|--------|------|-------------------|------|
| LCP | <2.5s | 2.5-4s | >4s |
| FID/INP | <100ms | 100-300ms | >300ms |
| CLS | <0.1 | 0.1-0.25 | >0.25 |

Bundle size primarily affects LCP (Largest Contentful Paint) and INP (Interaction to Next Paint).

---

## Bundle Size Budget

Enforce limits in CI to prevent regressions:

```javascript
// package.json
{
  "bundlesize": [
    {
      "path": "./dist/js/main.*.js",
      "maxSize": "100 kB"
    },
    {
      "path": "./dist/js/vendors.*.js",
      "maxSize": "200 kB"
    }
  ]
}
```

```yaml
# GitHub Actions
- name: Check bundle size
  run: npx bundlesize
```

---

## Quick Wins Checklist

- [ ] Remove unused dependencies (`npx depcheck`)
- [ ] Replace moment.js with date-fns
- [ ] Replace lodash with native JS or lodash-es
- [ ] Enable production mode in webpack/Vite
- [ ] Add code splitting for routes
- [ ] Enable Brotli/gzip compression on the server
- [ ] Audit with webpack-bundle-analyzer
- [ ] Set bundle size budgets in CI

---

## Related Tools

- **[TypeScript Performance Optimization 2026](/blog/typescript-performance-optimization-2026)** — TypeScript-specific techniques
- **[Web Vitals Optimization Guide](/blog/web-vitals-core-web-vitals-optimization)** — measure and improve Core Web Vitals
- **[React Performance: useMemo vs useCallback vs memo](/blog/react-performance-usememo-usecallback-memo)** — React-specific optimization
- **[DevPlaybook Performance Tools](/tools/performance)** — bundle analyzers, profilers, and benchmarks

---

## Summary

Bundle size optimization follows a consistent pattern: measure → identify biggest offenders → replace or split → compress → enforce budgets.

The highest-impact steps are replacing moment.js, adding route-based code splitting, and enabling Brotli compression. Together, these typically achieve 60-80% bundle size reduction before touching any application code.

Start with the bundle analyzer. The treemap will immediately reveal which dependencies are worth replacing — it's almost always a few large libraries that can be swapped for smaller alternatives or modern native APIs.
