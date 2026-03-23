# JavaScript Performance Checklist

> JavaScript is the most expensive resource on the web byte-for-byte. Unlike images (which can be decoded off the main thread), JS must be downloaded, parsed, compiled, and executed — all of which can block the main thread and delay interactivity.

---

## Bundle Size

- [ ] **[CRITICAL] Analyze your bundle and identify the largest dependencies**
  ```bash
  # Webpack
  npx webpack-bundle-analyzer stats.json

  # Vite / Rollup
  npx vite-bundle-visualizer

  # Next.js
  ANALYZE=true next build  # with @next/bundle-analyzer

  # Generic — check a specific package's cost
  npx bundlephobia lodash
  ```
  - Target: Total JS < 200KB gzipped for initial load
  - Verify: DevTools > Network > filter JS > check "Transferred" column total
  - Impact: Every 100KB of JS adds ~300ms parse time on mid-range mobile

- [ ] **[CRITICAL] Replace heavy libraries with lighter alternatives**
  | Heavy Library | Size (min+gz) | Alternative | Size (min+gz) |
  |--------------|---------------|-------------|----------------|
  | moment.js | 72KB | date-fns (tree-shakeable) | 2-8KB |
  | lodash (full) | 71KB | lodash-es (tree-shake) or native | 0-5KB |
  | axios | 13KB | fetch (native) | 0KB |
  | Chart.js | 65KB | lightweight-charts or uPlot | 15-35KB |
  | animate.css | 16KB | CSS @keyframes | 0KB |
  | jQuery | 30KB | Native DOM APIs | 0KB |
  | numeral.js | 8KB | Intl.NumberFormat (native) | 0KB |

  - Verify: `npx bundlephobia <package-name>` before adding any dependency
  - Impact: 20-100KB reduction per replacement

- [ ] **[HIGH] Remove unused JavaScript (dead code)**
  ```bash
  # Find unused JS in Chrome DevTools:
  # 1. DevTools > Sources > Coverage (Ctrl+Shift+P > "Coverage")
  # 2. Reload page
  # 3. Red = unused bytes, Green = used bytes

  # Remove unused exports with tree shaking (ensure ESM imports)
  import { debounce } from 'lodash-es'; // Tree-shakeable
  import _ from 'lodash'; // NOT tree-shakeable — imports everything
  ```
  - Verify: DevTools > Coverage > check % of unused JS
  - Impact: Most sites ship 50-70% unused JS; removing it is transformative

- [ ] **[HIGH] Set a performance budget for JavaScript**
  ```json
  {
    "budgets": [{
      "resourceSizes": [
        { "resourceType": "script", "budget": 200 }
      ],
      "resourceCounts": [
        { "resourceType": "script", "budget": 15 }
      ]
    }]
  }
  ```
  - Enforce in CI: See `scripts/performance-budget.json` and `scripts/lighthouse-ci.yml`
  - Impact: Prevents bundle size regression over time

---

## Code Splitting

- [ ] **[CRITICAL] Implement route-based code splitting**
  ```javascript
  // React (with React.lazy)
  const Dashboard = React.lazy(() => import('./pages/Dashboard'));
  const Settings = React.lazy(() => import('./pages/Settings'));

  function App() {
    return (
      <Suspense fallback={<Spinner />}>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Suspense>
    );
  }

  // Next.js — automatic per-page splitting, but dynamic import for components:
  const HeavyChart = dynamic(() => import('../components/HeavyChart'), {
    loading: () => <Skeleton />,
    ssr: false,
  });

  // Vue
  const Dashboard = () => import('./pages/Dashboard.vue');
  ```
  - Verify: DevTools > Network > navigate between routes > confirm separate chunk loads
  - Impact: 30-70% reduction in initial JS payload

- [ ] **[HIGH] Lazy load heavy components that are not immediately visible**
  ```javascript
  // Load a chart library only when the chart section scrolls into view
  const ChartSection = React.lazy(() => import('./ChartSection'));

  function Page() {
    const [visible, setVisible] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      const observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) setVisible(true);
      });
      observer.observe(ref.current);
      return () => observer.disconnect();
    }, []);

    return (
      <div ref={ref}>
        {visible && (
          <Suspense fallback={<Skeleton />}>
            <ChartSection />
          </Suspense>
        )}
      </div>
    );
  }
  ```
  - Good candidates: charts, maps, rich text editors, modals, below-fold sections
  - Impact: 50-200KB less JS on initial load

- [ ] **[MEDIUM] Use `import()` with magic comments for named chunks**
  ```javascript
  // Webpack — name the chunk for debugging
  const AdminPanel = () => import(/* webpackChunkName: "admin" */ './AdminPanel');

  // Prefetch — load when browser is idle
  const Settings = () => import(/* webpackPrefetch: true */ './Settings');

  // Preload — load immediately (high priority)
  const Checkout = () => import(/* webpackPreload: true */ './Checkout');
  ```
  - `prefetch`: Loads during idle time, good for likely-next routes
  - `preload`: Loads immediately, good for components needed very soon
  - Impact: Faster navigation to secondary routes

---

## Loading Strategy

- [ ] **[CRITICAL] Use `defer` for all non-critical scripts**
  ```html
  <!-- GOOD — downloads in parallel, executes after HTML parsing -->
  <script src="app.js" defer></script>

  <!-- BAD — blocks HTML parsing -->
  <script src="app.js"></script>

  <!-- async — downloads in parallel, executes immediately (blocks parsing) -->
  <!-- Use ONLY for independent scripts like analytics -->
  <script src="analytics.js" async></script>
  ```
  - `defer`: Download in parallel, execute in order after DOM ready (best for app code)
  - `async`: Download in parallel, execute immediately when ready (best for analytics)
  - Verify: DevTools > Performance > look for long parser-blocking script blocks
  - Impact: 200-1000ms improvement in First Contentful Paint

- [ ] **[CRITICAL] Move third-party scripts to load after interactive**
  ```javascript
  // Load third-party scripts after the page is interactive
  window.addEventListener('load', () => {
    // Wait additional 3 seconds for user to start engaging
    setTimeout(() => {
      loadScript('https://www.googletagmanager.com/gtag/js?id=GA_ID');
      loadScript('https://connect.facebook.net/en_US/fbevents.js');
    }, 3000);
  });

  function loadScript(src) {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    document.head.appendChild(s);
  }
  ```
  - Impact: 500ms-2s improvement in TTI, major INP improvement

- [ ] **[HIGH] Inline critical JavaScript (< 1KB) in the HTML**
  ```html
  <head>
    <script>
      // Inline critical: theme detection, above-fold interactivity
      document.documentElement.classList.add(
        localStorage.getItem('theme') || 'light'
      );
    </script>
  </head>
  ```
  - Only inline truly critical code (< 1KB). Larger scripts lose caching benefit.
  - Impact: Eliminates round-trip for critical functionality

- [ ] **[MEDIUM] Use `type="module"` for modern browsers with `nomodule` fallback**
  ```html
  <!-- Modern browsers get smaller, modern JS -->
  <script type="module" src="app.modern.js"></script>
  <!-- Legacy browsers get transpiled version -->
  <script nomodule src="app.legacy.js"></script>
  ```
  - Modern JS (no polyfills) is typically 20-30% smaller
  - Impact: 15-25% smaller JS for modern browsers

---

## Tree Shaking & Dead Code

- [ ] **[HIGH] Ensure all imports use ESM syntax for tree shaking**
  ```javascript
  // Tree-shakeable
  import { debounce } from 'lodash-es';
  import { format } from 'date-fns';

  // NOT tree-shakeable
  const _ = require('lodash');
  import _ from 'lodash';
  ```
  - Check `package.json` of dependencies for `"module"` or `"exports"` field
  - Verify: Build output should not contain unused functions from the library
  - Impact: 20-80% reduction in library size

- [ ] **[HIGH] Mark your package as side-effect-free**
  ```json
  // package.json
  {
    "sideEffects": false
  }

  // Or specify files with side effects
  {
    "sideEffects": ["*.css", "./src/polyfills.js"]
  }
  ```
  - Enables the bundler to remove unused exports from your code
  - Impact: 10-30% reduction in your app code

- [ ] **[MEDIUM] Remove console.log and debugger statements in production**
  ```javascript
  // Webpack — use terser options
  optimization: {
    minimizer: [new TerserPlugin({
      terserOptions: {
        compress: { drop_console: true, drop_debugger: true }
      }
    })]
  }

  // Vite
  build: {
    terserOptions: {
      compress: { drop_console: true }
    }
  }
  ```
  - `console.log` with large objects can cause memory leaks and slowdowns
  - Impact: Minor size reduction, prevents production logging overhead

---

## Runtime Performance

- [ ] **[CRITICAL] Avoid synchronous layout reads in loops**
  ```javascript
  // BAD — forces layout recalculation on every iteration
  for (const el of elements) {
    el.style.width = container.offsetWidth + 'px'; // offsetWidth forces layout
  }

  // GOOD — read once, write in batch
  const width = container.offsetWidth;
  for (const el of elements) {
    el.style.width = width + 'px';
  }
  ```
  - Verify: DevTools > Performance > look for repeated purple "Layout" bars
  - Impact: Can reduce frame time from 100ms+ to under 16ms

- [ ] **[HIGH] Use `requestAnimationFrame` for visual updates**
  ```javascript
  function animate() {
    element.style.transform = `translateX(${position}px)`;
    position += speed;
    if (position < target) requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
  ```
  - Never use `setInterval` for animations — it causes jank
  - Impact: Smooth 60fps animations instead of janky updates

- [ ] **[HIGH] Virtualize long lists (> 100 items)**
  ```javascript
  // React — react-window (lightweight) or react-virtuoso
  import { FixedSizeList } from 'react-window';

  <FixedSizeList height={600} width={400} itemSize={50} itemCount={10000}>
    {({ index, style }) => (
      <div style={style}>Item {index}</div>
    )}
  </FixedSizeList>

  // Vanilla — use Intersection Observer to render in chunks
  ```
  - Rendering 1000+ DOM nodes causes layout thrashing and memory issues
  - Impact: Reduces DOM nodes from thousands to ~20-50 visible items

- [ ] **[MEDIUM] Use Web Workers for CPU-intensive operations**
  ```javascript
  // main.js
  const worker = new Worker(new URL('./worker.js', import.meta.url));
  worker.postMessage({ type: 'PARSE_CSV', data: rawCSV });
  worker.onmessage = (e) => renderTable(e.data);

  // worker.js
  self.onmessage = ({ data }) => {
    if (data.type === 'PARSE_CSV') {
      const parsed = parseCSV(data.data); // Heavy computation
      self.postMessage(parsed);
    }
  };
  ```
  - Good candidates: CSV/JSON parsing, search/filter, image processing, encryption
  - Impact: Keeps main thread free for user interactions

- [ ] **[MEDIUM] Debounce expensive event handlers**
  ```javascript
  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // Search input — wait 300ms after user stops typing
  searchInput.addEventListener('input', debounce(handleSearch, 300));

  // Window resize — wait 150ms after user stops resizing
  window.addEventListener('resize', debounce(handleResize, 150));
  ```
  - Impact: Prevents hundreds of unnecessary function calls

---

## Audit Commands

```bash
# Analyze bundle composition
npx source-map-explorer dist/main.*.js

# Find largest dependencies
npx cost-of-modules --no-install

# Check a package's bundle size before installing
npx bundlephobia react-datepicker

# List all JS files and sizes in build output
find dist -name "*.js" -exec ls -lh {} \; | sort -k5 -h

# Check for duplicate packages in bundle
npx duplicate-package-checker-webpack-plugin  # Webpack
npx depcheck  # Find unused dependencies

# Measure JS parse time (run in DevTools Console)
const start = performance.now();
eval('1+1'); // Minimal parse
console.log(`JS engine overhead: ${performance.now() - start}ms`);
```
