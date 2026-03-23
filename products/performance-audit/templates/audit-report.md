# Performance Audit Report

> **Site:** [Your Site URL]
> **Date:** YYYY-MM-DD
> **Auditor:** [Name]
> **Tools Used:** Lighthouse, Chrome DevTools, WebPageTest, CrUX

---

## Executive Summary

**Overall Performance Rating:** [Good / Needs Work / Poor]

<!-- Brief 2-3 sentence summary of findings and recommended priority actions -->

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Performance Score | /100 | > 90 | |
| LCP | ms | < 2500ms | |
| INP | ms | < 200ms | |
| CLS | | < 0.1 | |
| FCP | ms | < 1800ms | |
| TTFB | ms | < 800ms | |
| TBT | ms | < 200ms | |
| Speed Index | ms | < 3400ms | |

**Estimated improvement if all Critical items are fixed:** [X seconds faster LCP, X% better CLS]

---

## Core Web Vitals Assessment

### LCP (Largest Contentful Paint): [Value] — [Good/Needs Work/Poor]

**LCP Element:** <!-- Describe what the LCP element is (hero image, heading, etc.) -->

**Root Causes:**
- [ ] <!-- e.g., LCP image not discoverable in initial HTML -->
- [ ] <!-- e.g., Render-blocking CSS delays paint -->
- [ ] <!-- e.g., Slow server response (TTFB > 1s) -->

**Recommendations:**
1. <!-- Specific action with expected impact -->
2. <!-- Specific action with expected impact -->
3. <!-- Specific action with expected impact -->

### INP (Interaction to Next Paint): [Value] — [Good/Needs Work/Poor]

**Slowest Interaction:** <!-- Describe the interaction that causes highest INP -->

**Root Causes:**
- [ ] <!-- e.g., Long task blocking main thread during click handler -->
- [ ] <!-- e.g., Synchronous layout thrashing in event handler -->

**Recommendations:**
1. <!-- Specific action with expected impact -->
2. <!-- Specific action with expected impact -->

### CLS (Cumulative Layout Shift): [Value] — [Good/Needs Work/Poor]

**Largest Shift Sources:**
1. <!-- Element that shifted, how much, and when -->
2. <!-- Element that shifted, how much, and when -->

**Root Causes:**
- [ ] <!-- e.g., Images without dimensions -->
- [ ] <!-- e.g., Web font swap causing text reflow -->
- [ ] <!-- e.g., Dynamically injected content above fold -->

**Recommendations:**
1. <!-- Specific action with expected impact -->
2. <!-- Specific action with expected impact -->

---

## Resource Analysis

### JavaScript

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total JS (gzipped) | KB | < 200KB | |
| Number of JS files | | < 15 | |
| Largest chunk | KB | < 100KB | |
| JS coverage (used %) | % | > 60% | |
| Third-party JS | KB | < 100KB | |

**Top 5 Largest JS Bundles:**
1. `filename.js` — XXkb gzipped
2. `filename.js` — XXkb gzipped
3. `filename.js` — XXkb gzipped
4. `filename.js` — XXkb gzipped
5. `filename.js` — XXkb gzipped

**Issues Found:**
- [ ] <!-- e.g., lodash imported as full bundle (71KB) — switch to lodash-es -->
- [ ] <!-- e.g., No code splitting — entire app loaded on every page -->
- [ ] <!-- e.g., moment.js included with all locales (232KB) -->

### CSS

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total CSS (gzipped) | KB | < 50KB | |
| CSS coverage (used %) | % | > 50% | |
| Number of CSS files | | < 5 | |
| Render-blocking CSS | | 0 | |

**Issues Found:**
- [ ] <!-- e.g., 85% of CSS is unused on this page -->
- [ ] <!-- e.g., No critical CSS inlining — FCP blocked by external CSS -->

### Images

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total image weight | KB | < 500KB | |
| Images without dimensions | | 0 | |
| Images in next-gen format | % | > 80% | |
| Oversized images | | 0 | |

**Issues Found:**
- [ ] <!-- e.g., Hero image is 2.4MB JPEG — should be WebP at 80% quality (~200KB) -->
- [ ] <!-- e.g., 12 images below fold are not lazy loaded -->
- [ ] <!-- e.g., Thumbnails served at 2000px for 200px display -->

### Fonts

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total font weight | KB | < 100KB | |
| Number of font files | | < 5 | |
| Font display strategy | | swap/optional | |

**Issues Found:**
- [ ] <!-- e.g., 4 font weights loaded but only 2 are used -->
- [ ] <!-- e.g., Fonts loaded from Google Fonts (extra DNS + connection) -->

---

## Network Analysis

| Metric | Value | Budget | Status |
|--------|-------|--------|--------|
| Total requests (initial) | | < 50 | |
| Total transfer size | KB | < 500KB | |
| Third-party requests | | < 10 | |
| HTTP protocol | | HTTP/2+ | |
| Compression | | Brotli | |
| CDN usage | | Yes | |

**Caching Issues:**
- [ ] <!-- e.g., Static assets served without Cache-Control headers -->
- [ ] <!-- e.g., No content hashing in filenames — can't cache aggressively -->

**Third-Party Impact:**
| Third Party | Requests | Size | Blocking? |
|------------|----------|------|-----------|
| Google Analytics | | KB | |
| Google Fonts | | KB | |
| Facebook Pixel | | KB | |
| <!-- Add more --> | | | |

---

## Server Performance

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| TTFB (origin) | ms | < 200ms | |
| TTFB (CDN) | ms | < 100ms | |
| Rendering strategy | | SSG/ISR | |
| Response compression | | Brotli | |

**Issues Found:**
- [ ] <!-- e.g., TTFB is 1.2s — server-side rendering is slow -->
- [ ] <!-- e.g., No CDN configured — all requests go to origin -->

---

## Prioritized Action Plan

### Critical (Do This Week) — Expected Impact: [X seconds LCP improvement]

| # | Action | Expected Impact | Effort |
|---|--------|----------------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### High Priority (Do This Sprint) — Expected Impact: [X seconds improvement]

| # | Action | Expected Impact | Effort |
|---|--------|----------------|--------|
| 1 | | | |
| 2 | | | |
| 3 | | | |

### Medium Priority (Next Sprint)

| # | Action | Expected Impact | Effort |
|---|--------|----------------|--------|
| 1 | | | |
| 2 | | | |

### Low Priority (Backlog)

| # | Action | Expected Impact | Effort |
|---|--------|----------------|--------|
| 1 | | | |
| 2 | | | |

---

## Monitoring Setup Recommendations

- [ ] Add Lighthouse CI to GitHub Actions (see `scripts/lighthouse-ci.yml`)
- [ ] Configure performance budgets (see `scripts/performance-budget.json`)
- [ ] Add Real User Monitoring (RUM) with `web-vitals` library or `scripts/measure-cwv.js`
- [ ] Set up alerts for CWV regression in Google Search Console
- [ ] Schedule quarterly performance audits

---

## Test Environment

| Property | Value |
|----------|-------|
| Device | Desktop / Mobile (specify) |
| Connection | WiFi / 4G / 3G Slow |
| Browser | Chrome [version] |
| Lighthouse Version | [version] |
| Location | [city/region] |
| Date/Time | YYYY-MM-DD HH:MM UTC |

---

## Appendix

### Lighthouse Report Links
- Desktop: [link to report]
- Mobile: [link to report]

### WebPageTest Results
- [link to results]

### CrUX Data (28-day field data)
- [link to CrUX dashboard or API results]

### Screenshots
<!-- Before/after screenshots, filmstrips, waterfall charts -->
