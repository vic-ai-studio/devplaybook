# CSS Performance Checklist

> CSS is render-blocking by default. The browser cannot paint anything until it has downloaded and parsed all CSS. Optimizing CSS delivery and reducing its computational cost directly impacts FCP, LCP, and CLS.

---

## Critical CSS

- [ ] **[CRITICAL] Inline critical CSS for above-the-fold content**
  ```html
  <head>
    <style>
      /* Inlined critical CSS — only what's needed for first viewport */
      body { margin: 0; font-family: system-ui, sans-serif; }
      .header { height: 64px; background: #1a1a2e; color: white; }
      .hero { padding: 4rem 2rem; }
      .hero h1 { font-size: 2.5rem; line-height: 1.2; }
    </style>
    <!-- Load full CSS asynchronously -->
    <link rel="preload" href="styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'" />
    <noscript><link rel="stylesheet" href="styles.css" /></noscript>
  </head>
  ```
  - Generate critical CSS:
    ```bash
    npx critical https://your-site.com --inline --minify
    # Or programmatically
    npx penthouse https://your-site.com --css styles.css --out critical.css
    ```
  - Verify: Disable JS > reload > above-fold content should be styled
  - Impact: 300-1000ms improvement in FCP

- [ ] **[HIGH] Split CSS per route/page instead of one monolithic bundle**
  ```javascript
  // Next.js — CSS Modules are automatically per-component
  import styles from './Dashboard.module.css';

  // Webpack — dynamic CSS imports
  const DashboardStyles = () => import('./dashboard.css');

  // Vite — automatic CSS code splitting with dynamic imports
  ```
  - Verify: DevTools > Network > navigate to different pages > check if different CSS files load
  - Impact: 30-60% reduction in CSS loaded per page

- [ ] **[MEDIUM] Avoid `@import` in CSS files**
  ```css
  /* BAD — creates sequential waterfall */
  @import url('reset.css');
  @import url('typography.css');
  @import url('components.css');

  /* GOOD — parallel loading */
  /* In HTML: */
  /* <link rel="stylesheet" href="reset.css" />
     <link rel="stylesheet" href="typography.css" />
     <link rel="stylesheet" href="components.css" /> */

  /* BEST — bundle into one file at build time */
  ```
  - Each `@import` creates a sequential request — CSS B cannot start until CSS A finishes
  - Verify: DevTools > Network > check for waterfall pattern in CSS requests
  - Impact: 200-600ms improvement (depends on number of imports)

---

## Unused CSS Removal

- [ ] **[CRITICAL] Remove unused CSS rules**
  ```bash
  # Identify unused CSS
  # DevTools > Sources > Coverage (Ctrl+Shift+P > "Coverage") > Reload

  # PurgeCSS — removes unused CSS based on HTML/JS content
  npx purgecss --css styles.css --content "**/*.html" "**/*.js" --output purged/

  # PostCSS plugin
  # postcss.config.js
  module.exports = {
    plugins: [
      require('@fullhuman/postcss-purgecss')({
        content: ['./src/**/*.{html,js,jsx,tsx}'],
        defaultExtractor: content => content.match(/[\w-/:]+(?<!:)/g) || [],
        safelist: ['active', 'open', 'is-visible', /^modal/],
      }),
    ],
  };
  ```
  - Safelist: Dynamic classes (toggled by JS), third-party widget classes
  - Verify: DevTools > Coverage > CSS coverage should be > 80%
  - Impact: Typical sites have 60-90% unused CSS; removal saves 50-200KB

- [ ] **[HIGH] Remove unused Tailwind CSS utilities in production**
  ```javascript
  // tailwind.config.js
  module.exports = {
    content: [
      './src/**/*.{html,js,jsx,tsx,mdx}',
      './components/**/*.{js,jsx,tsx}',
    ],
    // Tailwind v3+ purges automatically based on content
  };
  ```
  - Full Tailwind CSS is ~3.5MB. After purging, typically 5-30KB.
  - Verify: Check CSS file size in production build
  - Impact: 95%+ reduction in Tailwind CSS size

- [ ] **[MEDIUM] Audit and remove CSS framework components you don't use**
  - Bootstrap: Import only needed components
    ```scss
    // Instead of @import "bootstrap";
    @import "bootstrap/scss/functions";
    @import "bootstrap/scss/variables";
    @import "bootstrap/scss/mixins";
    @import "bootstrap/scss/grid";
    @import "bootstrap/scss/buttons";
    // Only import what you use
    ```
  - Material UI: Import components individually (tree-shaking)
  - Impact: 20-80KB reduction depending on framework

---

## Rendering Performance

- [ ] **[CRITICAL] Never animate layout properties — use `transform` and `opacity`**
  ```css
  /* BAD — triggers layout + paint + composite on every frame */
  .animate-bad {
    transition: width 0.3s, height 0.3s, top 0.3s, left 0.3s;
  }

  /* GOOD — only triggers composite (GPU-accelerated) */
  .animate-good {
    transition: transform 0.3s, opacity 0.3s;
  }

  /* Specific examples */
  /* Move element: use transform, not top/left */
  .slide-in { transform: translateX(0); }
  .slide-out { transform: translateX(-100%); }

  /* Resize element: use transform, not width/height */
  .grow { transform: scale(1.2); }

  /* Show/hide: use opacity, not display/visibility */
  .fade-in { opacity: 1; }
  .fade-out { opacity: 0; pointer-events: none; }
  ```
  - Properties safe to animate (composite only): `transform`, `opacity`, `filter`
  - Properties to avoid animating: `width`, `height`, `top`, `left`, `margin`, `padding`, `border`
  - Verify: DevTools > Performance > check for "Layout" during animations
  - Impact: 60fps vs janky animations, eliminates CLS from animations

- [ ] **[HIGH] Use `contain` to isolate component rendering**
  ```css
  /* Full containment — browser can skip this subtree during layout */
  .card {
    contain: layout style paint;
  }

  /* Content containment — strictest, best performance */
  .widget {
    contain: content; /* Shorthand for layout + style + paint */
  }

  /* Size containment — useful for off-screen elements */
  .off-screen-section {
    contain: size layout style paint;
    content-visibility: auto;
    contain-intrinsic-size: 0 500px;
  }
  ```
  - `contain` tells the browser that changes inside this element cannot affect layout outside
  - Impact: Reduces layout recalculation scope, 10-50% improvement on complex pages

- [ ] **[HIGH] Use `content-visibility: auto` for long pages**
  ```css
  .below-fold-section {
    content-visibility: auto;
    contain-intrinsic-size: 0 600px; /* Estimated height */
  }

  /* Apply to repeated items like cards, articles */
  .article-card {
    content-visibility: auto;
    contain-intrinsic-size: 0 350px;
  }
  ```
  - Skips rendering of off-screen elements entirely
  - `contain-intrinsic-size` prevents CLS by reserving space
  - Verify: DevTools > Rendering > check "Content visibility" overlay
  - Impact: 50-90% reduction in initial rendering time for long pages

- [ ] **[MEDIUM] Use `will-change` sparingly for known animations**
  ```css
  /* Apply only to elements that WILL animate */
  .dropdown-menu {
    will-change: transform, opacity;
  }

  /* Remove after animation completes */
  .dropdown-menu.closed {
    will-change: auto;
  }
  ```
  - Promotes element to GPU layer BEFORE animation starts
  - Do NOT apply to many elements — each layer uses GPU memory
  - Verify: DevTools > Layers > check layer count is reasonable (< 30)
  - Impact: Eliminates animation startup jank

---

## Selector Performance

- [ ] **[MEDIUM] Avoid deeply nested selectors**
  ```css
  /* BAD — browser matches right-to-left, so it finds ALL spans first */
  .page .content .article .paragraph .text span.highlight { }

  /* GOOD — specific class */
  .text-highlight { }

  /* Acceptable — 2-3 levels max */
  .article .text-highlight { }
  ```
  - CSS selectors are matched right-to-left; deep nesting means more work
  - Verify: DevTools > Performance > check "Recalculate Style" duration
  - Impact: Minor on small pages; significant on pages with 1000+ elements

- [ ] **[MEDIUM] Avoid universal selectors in complex rules**
  ```css
  /* BAD — matches every element, then checks parent */
  .container * { box-sizing: border-box; }

  /* GOOD — set once at root */
  *, *::before, *::after { box-sizing: border-box; }

  /* BAD — expensive */
  .sidebar > * > * { margin-bottom: 1rem; }

  /* GOOD — explicit class */
  .sidebar-item { margin-bottom: 1rem; }
  ```
  - Impact: Minor for most sites, significant for DOM-heavy pages (1000+ nodes)

- [ ] **[LOW] Minimize use of expensive CSS properties**
  ```css
  /* Expensive — triggers layout or paint on every change */
  box-shadow: 0 4px 20px rgba(0,0,0,0.3); /* Expensive to paint */
  filter: blur(10px); /* Expensive unless GPU-accelerated */
  backdrop-filter: blur(10px); /* Very expensive */

  /* Optimization: promote to own layer */
  .blurred-bg {
    backdrop-filter: blur(10px);
    will-change: backdrop-filter; /* GPU accelerate */
    contain: strict; /* Isolate from rest of page */
  }
  ```
  - Properties by cost: `backdrop-filter` > `filter` > `box-shadow` > `border-radius` > `opacity`
  - Impact: Noticeable on pages with many such elements or during scroll

---

## Minification & Optimization

- [ ] **[HIGH] Minify CSS in production**
  ```javascript
  // PostCSS with cssnano
  // postcss.config.js
  module.exports = {
    plugins: [
      require('cssnano')({
        preset: ['default', {
          discardComments: { removeAll: true },
          normalizeWhitespace: true,
          minifySelectors: true,
        }],
      }),
    ],
  };
  ```
  - All modern bundlers (Webpack, Vite, Parcel) minify CSS by default in production
  - Verify: Check that production CSS has no whitespace or comments
  - Impact: 15-30% size reduction

- [ ] **[MEDIUM] Use CSS custom properties (variables) to reduce duplication**
  ```css
  :root {
    --color-primary: #3b82f6;
    --spacing-md: 1rem;
    --radius: 0.5rem;
  }

  /* Reuse throughout — smaller file, easier to maintain */
  .button { background: var(--color-primary); border-radius: var(--radius); }
  .card { padding: var(--spacing-md); border-radius: var(--radius); }
  ```
  - Impact: Reduces CSS duplication, smaller files, better maintainability

- [ ] **[LOW] Prefer `prefers-reduced-motion` for accessibility and performance**
  ```css
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
    }
  }
  ```
  - Respects user preference and eliminates animation CPU cost
  - Impact: Better accessibility, eliminates animation overhead for users who prefer it

---

## Audit Commands

```bash
# Check CSS file sizes
find dist -name "*.css" -exec ls -lh {} \;

# Count CSS rules (rough estimate of complexity)
cat dist/styles.css | grep -c '{'

# Find duplicate CSS properties (potential for deduplication)
cat dist/styles.css | grep -oP '[a-z-]+(?=:)' | sort | uniq -c | sort -rn | head -20

# Analyze CSS with Wallace (detailed stats)
npx wallace-cli https://your-site.com

# Check CSS specificity issues
npx specificity dist/styles.css

# Measure CSS coverage in Chrome
# DevTools > Ctrl+Shift+P > "Coverage" > Reload > filter .css files
```
