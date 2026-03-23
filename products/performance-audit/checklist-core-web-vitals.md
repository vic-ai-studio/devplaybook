# Core Web Vitals Optimization Checklist

> Google's Core Web Vitals are the primary ranking signal for page experience. These three metrics determine whether your site passes the CWV assessment in Search Console and PageSpeed Insights.

**Thresholds (Good / Needs Improvement / Poor):**
- **LCP** (Largest Contentful Paint): < 2.5s / < 4.0s / > 4.0s
- **INP** (Interaction to Next Paint): < 200ms / < 500ms / > 500ms
- **CLS** (Cumulative Layout Shift): < 0.1 / < 0.25 / > 0.25

---

## LCP — Largest Contentful Paint

### Resource Discovery

- [ ] **[CRITICAL] Ensure the LCP element is discoverable in the initial HTML**
  - The LCP image/element must be in the server-rendered HTML, not injected by JavaScript
  - Verify: `curl -s YOUR_URL | grep -i "your-hero-image"`
  - Impact: Can improve LCP by 1-3 seconds

- [ ] **[CRITICAL] Add `fetchpriority="high"` to the LCP image**
  ```html
  <img src="hero.webp" fetchpriority="high" alt="..." />
  ```
  - Tells the browser to prioritize this resource over others
  - Verify: DevTools > Network > Priority column shows "High"
  - Impact: 200-800ms improvement

- [ ] **[CRITICAL] Preload the LCP image if it is a CSS background or dynamically loaded**
  ```html
  <link rel="preload" as="image" href="hero.webp" type="image/webp" />
  ```
  - Only needed when the image is not directly in an `<img>` tag in HTML
  - Verify: DevTools > Network > Initiator shows "preload"
  - Impact: 500ms-2s improvement

- [ ] **[HIGH] Remove `loading="lazy"` from the LCP image**
  - Lazy loading the LCP element delays its load until it enters the viewport
  - Verify: Inspect the LCP element, confirm no `loading="lazy"` attribute
  - Impact: 500ms-1.5s improvement

- [ ] **[HIGH] Inline critical CSS for above-the-fold content**
  - Extract and inline CSS needed for the first viewport render
  - Tool: `npx critical https://your-site.com --inline`
  - Verify: First paint occurs before external CSS finishes loading
  - Impact: 300-800ms improvement

### Server Response

- [ ] **[CRITICAL] Reduce Time to First Byte (TTFB) to under 800ms**
  - TTFB > 800ms makes achieving good LCP nearly impossible
  - Measure: `curl -o /dev/null -s -w "TTFB: %{time_starttransfer}s\n" YOUR_URL`
  - Fix: Enable server caching, use CDN, optimize database queries
  - Impact: Direct 1:1 improvement on LCP

- [ ] **[HIGH] Enable server-side rendering or static generation for the landing page**
  - Client-rendered pages require JS download + parse + execute before LCP can begin
  - Framework-specific:
    - Next.js: Use `getServerSideProps` or `getStaticProps`
    - Nuxt: Use `useAsyncData` or `useFetch` in `<script setup>`
  - Impact: 1-4s improvement for client-rendered apps

- [ ] **[HIGH] Implement stale-while-revalidate caching**
  ```
  Cache-Control: public, max-age=3600, stale-while-revalidate=86400
  ```
  - Serves cached content immediately while refreshing in background
  - Impact: Eliminates TTFB for cached pages

### Image Optimization

- [ ] **[HIGH] Serve the LCP image in WebP or AVIF format**
  - WebP: 25-35% smaller than JPEG. AVIF: 50% smaller.
  ```html
  <picture>
    <source srcset="hero.avif" type="image/avif" />
    <source srcset="hero.webp" type="image/webp" />
    <img src="hero.jpg" alt="..." fetchpriority="high" />
  </picture>
  ```
  - Verify: DevTools > Network > check Content-Type of LCP image
  - Impact: 200-600ms improvement

- [ ] **[MEDIUM] Size the LCP image appropriately for the viewport**
  - Serving a 4000px image for a 1200px container wastes bandwidth
  - Use `srcset` and `sizes` attributes
  - Verify: DevTools > Network > compare image natural size vs displayed size
  - Impact: 100-500ms improvement

- [ ] **[MEDIUM] Use a CDN for the LCP image**
  - CDNs serve images from edge locations closer to the user
  - Impact: 100-400ms improvement depending on geography

### Font Loading

- [ ] **[HIGH] Prevent fonts from blocking LCP text rendering**
  ```css
  @font-face {
    font-family: 'CustomFont';
    src: url('font.woff2') format('woff2');
    font-display: swap; /* or optional */
  }
  ```
  - `swap`: Shows fallback immediately, swaps when loaded (can cause CLS)
  - `optional`: Shows fallback if font not loaded in ~100ms (best for LCP)
  - Verify: DevTools > Performance > check for "Flash of Invisible Text"
  - Impact: 200-800ms improvement

- [ ] **[MEDIUM] Preload critical fonts**
  ```html
  <link rel="preload" as="font" href="font.woff2" type="font/woff2" crossorigin />
  ```
  - Note: `crossorigin` is required even for same-origin fonts
  - Impact: 100-300ms improvement

---

## INP — Interaction to Next Paint

### Main Thread Optimization

- [ ] **[CRITICAL] Break up long tasks (> 50ms) on the main thread**
  - Long tasks block user interactions from being processed
  - Identify: DevTools > Performance > record interaction > look for long yellow bars
  ```javascript
  // Break up work using scheduler.yield() (Chrome 129+)
  async function processItems(items) {
    for (const item of items) {
      processItem(item);
      await scheduler.yield(); // Give browser a chance to handle events
    }
  }

  // Fallback for older browsers
  function yieldToMain() {
    return new Promise(resolve => setTimeout(resolve, 0));
  }
  ```
  - Impact: Can improve INP by 100-400ms

- [ ] **[CRITICAL] Avoid layout thrashing in event handlers**
  ```javascript
  // BAD - forces synchronous layout
  element.addEventListener('click', () => {
    const width = element.offsetWidth; // Read
    element.style.width = width + 10 + 'px'; // Write
    const height = element.offsetHeight; // Read - FORCES LAYOUT
    element.style.height = height + 10 + 'px'; // Write
  });

  // GOOD - batch reads then writes
  element.addEventListener('click', () => {
    const width = element.offsetWidth;
    const height = element.offsetHeight;
    element.style.width = width + 10 + 'px';
    element.style.height = height + 10 + 'px';
  });
  ```
  - Verify: DevTools > Performance > look for purple "Layout" events in handlers
  - Impact: 50-200ms improvement per interaction

- [ ] **[HIGH] Debounce or throttle high-frequency input handlers**
  ```javascript
  // Throttle scroll/resize handlers
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        updateUI();
        ticking = false;
      });
      ticking = true;
    }
  });
  ```
  - Impact: Prevents INP spikes during scroll/resize

- [ ] **[HIGH] Move heavy computation to Web Workers**
  ```javascript
  // main.js
  const worker = new Worker('worker.js');
  worker.postMessage({ data: largeDataSet });
  worker.onmessage = (e) => updateUI(e.data);

  // worker.js
  self.onmessage = (e) => {
    const result = heavyComputation(e.data);
    self.postMessage(result);
  };
  ```
  - Use for: JSON parsing, data transformation, search/filter on large datasets
  - Impact: Keeps main thread free, 100-500ms INP improvement

### Event Handler Optimization

- [ ] **[HIGH] Defer non-critical work triggered by user interaction**
  ```javascript
  button.addEventListener('click', () => {
    // Do the visual update immediately
    showLoadingState();

    // Defer non-visual work
    requestIdleCallback(() => {
      sendAnalyticsEvent();
      updateLocalStorage();
      prefetchNextPage();
    });
  });
  ```
  - Impact: 50-200ms improvement

- [ ] **[MEDIUM] Use `content-visibility: auto` for off-screen content**
  ```css
  .below-fold-section {
    content-visibility: auto;
    contain-intrinsic-size: 0 500px;
  }
  ```
  - Skips rendering of off-screen elements, reducing interaction processing time
  - Impact: Depends on page complexity, 50-300ms

- [ ] **[MEDIUM] Reduce third-party script impact on INP**
  - Audit: DevTools > Performance > filter by third-party domains
  - Load analytics/ads after page is interactive
  - Use `loading="lazy"` for third-party iframes
  - Impact: 100-500ms improvement

---

## CLS — Cumulative Layout Shift

### Image & Media Dimensions

- [ ] **[CRITICAL] Set explicit width and height on all images and videos**
  ```html
  <img src="photo.jpg" width="800" height="600" alt="..." />
  <!-- Or use CSS aspect-ratio -->
  <style>
    img { aspect-ratio: 4/3; width: 100%; height: auto; }
  </style>
  ```
  - Verify: DevTools > Rendering > check "Layout Shift Regions" (blue highlights)
  - Impact: Eliminates image-related CLS entirely

- [ ] **[CRITICAL] Reserve space for ad slots and embeds**
  ```css
  .ad-slot {
    min-height: 250px; /* Match the expected ad size */
    background: #f0f0f0; /* Optional placeholder */
  }
  ```
  - Verify: Scroll slowly and watch for content jumps near ad positions
  - Impact: Ads are the #1 cause of CLS on most sites

- [ ] **[HIGH] Set dimensions on iframes (YouTube, maps, etc.)**
  ```html
  <iframe width="560" height="315" src="..." loading="lazy"></iframe>
  <!-- Or use a responsive wrapper -->
  <div style="aspect-ratio: 16/9;">
    <iframe src="..." style="width:100%;height:100%;border:0;"></iframe>
  </div>
  ```
  - Impact: Eliminates iframe-related CLS

### Font-Induced Layout Shifts

- [ ] **[HIGH] Use `font-display: optional` to eliminate font-swap CLS**
  - `swap` shows fallback then swaps to custom font, causing text reflow
  - `optional` only uses the custom font if it loads within ~100ms
  - Trade-off: Users on slow connections see system font instead
  - Impact: Eliminates font-related CLS (often 0.05-0.15 CLS)

- [ ] **[MEDIUM] Match fallback font metrics to custom font**
  ```css
  @font-face {
    font-family: 'Custom Font Fallback';
    src: local('Arial');
    ascent-override: 90%;
    descent-override: 20%;
    line-gap-override: 0%;
    size-adjust: 105%;
  }
  ```
  - Tool: [Fallback Font Generator](https://screenspan.net/fallback)
  - Impact: Reduces font-swap CLS by 80-95%

### Dynamic Content

- [ ] **[HIGH] Use CSS `transform` for animations, never animate layout properties**
  ```css
  /* BAD - triggers layout shift */
  .notification { top: 0; transition: top 0.3s; }
  .notification.show { top: 60px; }

  /* GOOD - no layout shift */
  .notification { transform: translateY(-100%); transition: transform 0.3s; }
  .notification.show { transform: translateY(0); }
  ```
  - Layout properties to avoid animating: `top`, `left`, `width`, `height`, `margin`, `padding`
  - Impact: Eliminates animation-related CLS

- [ ] **[HIGH] Insert dynamic content below the viewport or in reserved space**
  - Banners, cookie notices, and notifications should push content down from the top sparingly
  - Use `position: fixed` or `sticky` for overlays
  - If inserting into the flow, reserve the space with `min-height`
  - Impact: Variable, can eliminate 0.1-0.5 CLS

- [ ] **[MEDIUM] Use `will-change: transform` on elements that will animate**
  ```css
  .animated-element {
    will-change: transform;
  }
  ```
  - Promotes element to its own compositor layer
  - Caution: Do not overuse — each layer consumes GPU memory
  - Impact: Smoother animations, prevents unexpected layout shifts

---

## Measurement & Verification

### Tools

| Tool | What It Measures | Lab/Field |
|------|-----------------|-----------|
| `scripts/measure-cwv.js` (included) | LCP, INP, CLS | Field |
| Chrome DevTools > Performance | All metrics + flamechart | Lab |
| PageSpeed Insights | CWV + opportunities | Both |
| Chrome UX Report (CrUX) | Real user CWV data | Field |
| `web-vitals` npm package | All CWV metrics | Field |
| WebPageTest | Detailed waterfall + filmstrip | Lab |

### Quick Verification Commands

```bash
# Run Lighthouse from CLI
npx lighthouse https://your-site.com --output=json --output-path=./report.json

# Check CWV from CrUX API (needs API key)
curl "https://chromeuxreport.googleapis.com/v1/records:queryRecord?key=YOUR_KEY" \
  -d '{"url": "https://your-site.com"}'

# Measure TTFB
curl -o /dev/null -s -w "DNS: %{time_namelookup}s\nTCP: %{time_connect}s\nTLS: %{time_appconnect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://your-site.com
```
