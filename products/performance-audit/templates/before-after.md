# Performance Before/After Comparison

> **Site:** [Your Site URL]
> **Audit Period:** [Start Date] to [End Date]
> **Changes Applied:** [Brief description of what was optimized]

---

## Core Web Vitals Comparison

| Metric | Before | After | Change | Target | Status |
|--------|--------|-------|--------|--------|--------|
| **LCP** | ms | ms | ms (%) | < 2500ms | |
| **INP** | ms | ms | ms (%) | < 200ms | |
| **CLS** | | | (%) | < 0.1 | |
| **FCP** | ms | ms | ms (%) | < 1800ms | |
| **TTFB** | ms | ms | ms (%) | < 800ms | |
| **TBT** | ms | ms | ms (%) | < 200ms | |
| **Speed Index** | ms | ms | ms (%) | < 3400ms | |

### Lighthouse Scores

| Category | Before | After | Change |
|----------|--------|-------|--------|
| Performance | /100 | /100 | +X |
| Accessibility | /100 | /100 | +X |
| Best Practices | /100 | /100 | +X |
| SEO | /100 | /100 | +X |

---

## Resource Size Comparison

| Resource Type | Before (gzip) | After (gzip) | Reduction | % Change |
|--------------|---------------|--------------|-----------|----------|
| JavaScript | KB | KB | KB | % |
| CSS | KB | KB | KB | % |
| Images | KB | KB | KB | % |
| Fonts | KB | KB | KB | % |
| HTML | KB | KB | KB | % |
| **Total** | **KB** | **KB** | **KB** | **%** |

### Request Count

| Resource Type | Before | After | Reduction |
|--------------|--------|-------|-----------|
| JavaScript | | | |
| CSS | | | |
| Images | | | |
| Fonts | | | |
| Third-party | | | |
| **Total** | | | |

---

## Changes Made

### 1. [Change Category — e.g., Image Optimization]

**What was done:**
<!-- Specific description of changes -->

**Files changed:**
- `path/to/file.js` — description
- `path/to/file.css` — description

**Before:**
<!-- Code snippet, screenshot, or metric -->

**After:**
<!-- Code snippet, screenshot, or metric -->

**Impact:**
- LCP: -Xms
- Total bytes: -XKB

---

### 2. [Change Category — e.g., JavaScript Code Splitting]

**What was done:**
<!-- Specific description of changes -->

**Files changed:**
- `path/to/file.js` — description

**Before:**
<!-- Code snippet, screenshot, or metric -->

**After:**
<!-- Code snippet, screenshot, or metric -->

**Impact:**
- TTI: -Xms
- JS bundle: -XKB

---

### 3. [Change Category — e.g., Critical CSS Inlining]

**What was done:**
<!-- Specific description of changes -->

**Files changed:**
- `path/to/file.html` — description
- `path/to/file.css` — description

**Before:**
<!-- Metric or screenshot -->

**After:**
<!-- Metric or screenshot -->

**Impact:**
- FCP: -Xms

---

### 4. [Change Category — e.g., Caching & Compression]

**What was done:**
<!-- Specific description of changes -->

**Configuration changed:**
```
<!-- Config diff -->
```

**Impact:**
- Repeat visit load time: -Xs
- Transfer size: -X%

---

## Waterfall Comparison

### Before
```
<!-- Paste WebPageTest waterfall or describe the critical path -->
Request  Timeline (0-5s)
HTML     |====|
CSS      |    |========|
JS       |    |============|
Font     |         |=======|
LCP Img  |              |==========|
                                    ^ LCP at X.Xs
```

### After
```
Request  Timeline (0-5s)
HTML     |===|
CSS(inl) (inline - no request)
JS(def)  |  |====|
Font(pl) |  |====|
LCP Img  |  |=====|
                   ^ LCP at X.Xs
```

---

## Field Data Comparison (CrUX / RUM)

> Field data takes 28 days to reflect changes in CrUX. Fill this in after the collection period.

| Metric | Before (p75) | After (p75) | Change |
|--------|-------------|------------|--------|
| LCP | ms | ms | |
| INP | ms | ms | |
| CLS | | | |

**Data source:** CrUX API / Google Search Console / RUM (web-vitals)
**Before period:** [dates]
**After period:** [dates]

---

## Business Impact

<!-- Connect performance improvements to business metrics -->

| Metric | Before | After | Change |
|--------|--------|-------|--------|
| Bounce rate | % | % | % |
| Avg. session duration | s | s | s |
| Pages per session | | | |
| Conversion rate | % | % | % |
| Revenue (if applicable) | $ | $ | % |

**Key insight:** <!-- e.g., "1.2s LCP improvement correlated with 8% reduction in bounce rate" -->

---

## Remaining Opportunities

| Item | Priority | Expected Impact | Effort |
|------|----------|----------------|--------|
| | | | |
| | | | |
| | | | |

---

## Methodology

- **Lab tests:** Lighthouse v[X], Chrome [version], [throttling profile]
- **Field data:** CrUX [dates] / RUM via web-vitals [dates]
- **Test conditions:** [mobile/desktop], [connection type], [location]
- **Runs per test:** [N] runs, median reported
- **Server:** [provider, region, config]
