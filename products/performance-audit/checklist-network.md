# Network Optimization Checklist

> Network performance determines how fast resources reach the browser. Even perfectly optimized code is slow if the network delivery is inefficient. This checklist covers caching, compression, resource hints, protocols, and CDN configuration.

---

## Caching

- [ ] **[CRITICAL] Set proper Cache-Control headers for static assets**
  ```
  # Hashed/fingerprinted assets (app.a1b2c3.js, style.d4e5f6.css)
  Cache-Control: public, max-age=31536000, immutable

  # HTML documents
  Cache-Control: no-cache
  # (no-cache means "always revalidate" — NOT "don't cache")

  # API responses (dynamic)
  Cache-Control: private, max-age=0, must-revalidate

  # Frequently updated assets (sw.js, manifest.json)
  Cache-Control: no-cache, max-age=0
  ```
  - `immutable`: Tells browser to never revalidate (no conditional requests)
  - Verify: DevTools > Network > check Cache-Control header on each resource
  - Impact: Eliminates re-download of assets on subsequent visits (saves seconds)

- [ ] **[CRITICAL] Use content hashing in filenames for cache busting**
  ```javascript
  // Webpack
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].js',
  }

  // Vite — enabled by default
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
      }
    }
  }
  ```
  - Content hash changes only when file content changes
  - Enables `max-age=31536000` (1 year) without risk of stale content
  - Verify: Build twice without changes — hashes should be identical
  - Impact: Enables aggressive caching with zero risk of stale content

- [ ] **[HIGH] Implement stale-while-revalidate for semi-dynamic content**
  ```
  Cache-Control: public, max-age=300, stale-while-revalidate=86400
  ```
  - Serves cached version immediately while fetching fresh version in background
  - After `max-age` (300s), content is "stale" but still served for up to 86400s
  - Ideal for: API data, user feeds, product listings
  - Impact: Instant response for returning users on semi-dynamic pages

- [ ] **[HIGH] Configure service worker caching for offline and repeat visits**
  ```javascript
  // Using Workbox (recommended)
  // workbox-config.js
  module.exports = {
    globDirectory: 'dist/',
    globPatterns: ['**/*.{js,css,html,woff2,webp}'],
    swDest: 'dist/sw.js',
    runtimeCaching: [
      {
        urlPattern: /\/api\//,
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'api-cache', expiration: { maxEntries: 50 } }
      },
      {
        urlPattern: /\.(?:png|jpg|webp|avif)$/,
        handler: 'CacheFirst',
        options: { cacheName: 'image-cache', expiration: { maxEntries: 100 } }
      }
    ]
  };
  ```
  - Impact: Instant load on repeat visits, offline capability

- [ ] **[MEDIUM] Use ETag / Last-Modified for conditional requests**
  ```
  # Server response
  ETag: "abc123"
  Last-Modified: Tue, 15 Jan 2026 12:00:00 GMT

  # Browser re-request
  If-None-Match: "abc123"
  If-Modified-Since: Tue, 15 Jan 2026 12:00:00 GMT

  # Server response if unchanged: 304 Not Modified (no body)
  ```
  - Useful for HTML and API responses that change occasionally
  - Verify: DevTools > Network > check for `304` status codes
  - Impact: Saves bandwidth on unchanged resources

---

## Compression

- [ ] **[CRITICAL] Enable Brotli compression on the server/CDN**
  ```nginx
  # Nginx
  brotli on;
  brotli_comp_level 6;
  brotli_types text/html text/css application/javascript application/json image/svg+xml;
  ```
  ```apache
  # Apache
  <IfModule mod_brotli.c>
    AddOutputFilterByType BROTLI_COMPRESS text/html text/css application/javascript application/json
  </IfModule>
  ```
  - Brotli is 15-20% smaller than gzip for text resources
  - Verify: DevTools > Network > check `Content-Encoding: br` header
  - Verify: `curl -H "Accept-Encoding: br" -sI https://your-site.com | grep content-encoding`
  - Impact: 15-20% smaller transfers vs gzip, 50-70% smaller than uncompressed

- [ ] **[HIGH] Pre-compress static assets at build time**
  ```bash
  # Generate .br and .gz files at build time
  # Vite plugin
  npm install vite-plugin-compression

  # Or manual
  find dist -type f \( -name "*.js" -o -name "*.css" -o -name "*.html" -o -name "*.json" \) \
    -exec brotli -k {} \;
  ```
  ```nginx
  # Nginx — serve pre-compressed files
  brotli_static on;
  gzip_static on;
  ```
  - Build-time compression uses higher compression levels (slower but smaller)
  - Impact: 5-10% additional savings vs dynamic compression

- [ ] **[HIGH] Ensure gzip fallback for browsers that don't support Brotli**
  ```nginx
  gzip on;
  gzip_comp_level 6;
  gzip_types text/html text/css application/javascript application/json image/svg+xml;
  gzip_min_length 256;
  ```
  - Almost all modern browsers support Brotli, but gzip fallback is essential
  - Verify: Test with `curl -H "Accept-Encoding: gzip" -sI URL | grep content-encoding`
  - Impact: Ensures compression for all users

- [ ] **[MEDIUM] Do not compress already-compressed formats**
  - Already compressed (skip): `.jpg`, `.png`, `.webp`, `.avif`, `.woff2`, `.mp4`, `.zip`
  - Should compress: `.html`, `.css`, `.js`, `.json`, `.svg`, `.xml`, `.woff` (not woff2)
  - Compressing already-compressed files wastes CPU with no benefit
  - Impact: Saves server CPU

---

## Resource Hints

- [ ] **[CRITICAL] Preconnect to critical third-party origins**
  ```html
  <!-- DNS + TCP + TLS handshake — saves 100-300ms per origin -->
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link rel="preconnect" href="https://cdn.your-analytics.com" />

  <!-- dns-prefetch as fallback for older browsers -->
  <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
  ```
  - Only preconnect to origins used within the first 5 seconds
  - Limit to 4-6 preconnects (too many wastes connections)
  - Verify: DevTools > Network > check timing for third-party resources
  - Impact: 100-300ms per origin saved

- [ ] **[HIGH] Preload critical resources**
  ```html
  <!-- Preload critical font -->
  <link rel="preload" href="/fonts/Inter.woff2" as="font" type="font/woff2" crossorigin />

  <!-- Preload LCP image (if not in <img> tag) -->
  <link rel="preload" href="/hero.webp" as="image" type="image/webp" />

  <!-- Preload critical CSS (if loaded dynamically) -->
  <link rel="preload" href="/critical.css" as="style" />

  <!-- Preload data needed for initial render -->
  <link rel="preload" href="/api/initial-data" as="fetch" crossorigin />
  ```
  - `preload`: High-priority fetch for resources needed in current page
  - Limit preloads to truly critical resources (3-5 max)
  - Verify: DevTools > Network > preloaded resources should appear early in waterfall
  - Impact: 200-600ms improvement for preloaded resources

- [ ] **[MEDIUM] Prefetch resources for likely next navigation**
  ```html
  <!-- Prefetch next page's JS bundle -->
  <link rel="prefetch" href="/dashboard.chunk.js" />

  <!-- Prefetch on hover (just-in-time) -->
  <script>
  document.querySelectorAll('a[data-prefetch]').forEach(link => {
    link.addEventListener('mouseenter', () => {
      const prefetch = document.createElement('link');
      prefetch.rel = 'prefetch';
      prefetch.href = link.href;
      document.head.appendChild(prefetch);
    }, { once: true });
  });
  </script>
  ```
  - `prefetch`: Low-priority fetch for resources needed on the next page
  - Only prefetch high-probability next pages
  - Impact: Near-instant navigation to prefetched pages

- [ ] **[MEDIUM] Use `fetchpriority` to control resource priority**
  ```html
  <!-- High priority for LCP image -->
  <img src="hero.webp" fetchpriority="high" alt="..." />

  <!-- Low priority for below-fold images -->
  <img src="thumbnail.webp" fetchpriority="low" loading="lazy" alt="..." />

  <!-- High priority for critical script -->
  <script src="critical.js" fetchpriority="high"></script>

  <!-- Low priority for analytics -->
  <script src="analytics.js" fetchpriority="low" async></script>
  ```
  - Impact: Ensures critical resources load before non-critical ones

---

## HTTP/2 & HTTP/3

- [ ] **[HIGH] Verify HTTP/2 is enabled on your server**
  ```bash
  curl -sI https://your-site.com -o /dev/null -w "HTTP version: %{http_version}\n"
  # Should output: HTTP version: 2 (or 3)
  ```
  - HTTP/2 enables multiplexing (many requests over one connection)
  - All major CDNs and hosting providers support HTTP/2
  - Impact: Eliminates head-of-line blocking, faster parallel downloads

- [ ] **[HIGH] Stop concatenating files if using HTTP/2**
  - HTTP/1.1: Concatenating CSS/JS into one file was beneficial (fewer connections)
  - HTTP/2: Individual files are better (granular caching, parallel loading)
  - Exception: Still bundle by route for code-splitting purposes
  - Impact: Better caching granularity, no need to re-download unchanged bundles

- [ ] **[MEDIUM] Enable HTTP/3 (QUIC) if your CDN supports it**
  - HTTP/3 uses QUIC (UDP) instead of TCP — faster connection establishment
  - Cloudflare, Google Cloud, AWS CloudFront all support HTTP/3
  - Verify: DevTools > Network > Protocol column should show "h3"
  - Impact: 0-RTT connection resumption, better on lossy connections

- [ ] **[MEDIUM] Optimize for HTTP/2 server push (or use 103 Early Hints)**
  ```
  # 103 Early Hints (preferred over Server Push)
  HTTP/1.1 103 Early Hints
  Link: </style.css>; rel=preload; as=style
  Link: </app.js>; rel=preload; as=script

  HTTP/1.1 200 OK
  Content-Type: text/html
  ```
  - 103 Early Hints: Server sends hints while processing the request
  - Impact: Resources begin loading before HTML arrives

---

## CDN Configuration

- [ ] **[CRITICAL] Serve all static assets through a CDN**
  - CDNs: Cloudflare (free tier), AWS CloudFront, Vercel Edge, Fastly
  - Assets to serve via CDN: JS, CSS, images, fonts, videos
  - Verify: Check response headers for CDN identifiers
  - Impact: 50-300ms improvement per resource depending on geography

- [ ] **[HIGH] Configure CDN cache rules by file type**
  ```
  # Cloudflare Page Rule example:
  # *.your-site.com/assets/*
  # Cache Level: Cache Everything
  # Edge Cache TTL: 1 month
  # Browser Cache TTL: 1 year

  # Vercel — vercel.json:
  {
    "headers": [
      {
        "source": "/assets/(.*)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      }
    ]
  }
  ```
  - Impact: Ensures assets are cached at edge locations

- [ ] **[MEDIUM] Enable Cloudflare Auto-Minify or equivalent**
  - Cloudflare: Speed > Optimization > Auto Minify (HTML, CSS, JS)
  - Impact: 5-15% size reduction if not already minified at build time

- [ ] **[LOW] Consider edge computing for dynamic content**
  - Cloudflare Workers, Vercel Edge Functions, AWS Lambda@Edge
  - Run server logic at the edge (closest to user)
  - Good for: A/B tests, personalization, redirects, auth checks
  - Impact: Reduces TTFB for dynamic pages by 50-200ms

---

## Reducing Requests

- [ ] **[HIGH] Minimize the number of HTTP requests on initial load**
  - Target: < 30 requests for initial page load
  - Audit: DevTools > Network > count requests before `load` event
  - Strategies:
    - Inline small CSS/JS (< 1KB)
    - Use CSS sprites or inline SVGs for icons
    - Combine small images into sprite sheets
    - Remove unnecessary third-party scripts
  - Impact: Each request has overhead (DNS, TCP, TLS, TTFB)

- [ ] **[HIGH] Eliminate render-blocking third-party requests**
  ```html
  <!-- BAD — blocks rendering -->
  <link rel="stylesheet" href="https://cdn.third-party.com/widget.css" />
  <script src="https://cdn.third-party.com/widget.js"></script>

  <!-- GOOD — load asynchronously -->
  <link rel="preload" href="https://cdn.third-party.com/widget.css" as="style"
        onload="this.onload=null;this.rel='stylesheet'" />
  <script src="https://cdn.third-party.com/widget.js" defer></script>
  ```
  - Verify: DevTools > Network > filter third-party > check if they block rendering
  - Impact: Removes dependency on third-party server speed

- [ ] **[MEDIUM] Self-host critical third-party resources**
  ```bash
  # Download and self-host Google Fonts
  npx google-fonts-helper download -f woff2 -o ./fonts "https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700"
  ```
  - Self-hosting eliminates DNS lookup + connection to third-party origin
  - Applicable to: fonts, analytics libraries, common CSS frameworks
  - Impact: 100-300ms improvement per third-party origin eliminated

---

## Audit Commands

```bash
# Check HTTP version
curl -sI https://your-site.com -o /dev/null -w "%{http_version}\n"

# Check compression
curl -sI -H "Accept-Encoding: br,gzip" https://your-site.com | grep -i content-encoding

# Check cache headers
curl -sI https://your-site.com/assets/app.js | grep -i -E "cache-control|etag|expires"

# Count requests per domain
# DevTools > Network > right-click column header > enable "Domain" > sort by domain

# Measure connection timing
curl -o /dev/null -s -w "DNS: %{time_namelookup}s\nConnect: %{time_connect}s\nTLS: %{time_appconnect}s\nTTFB: %{time_starttransfer}s\nTotal: %{time_total}s\n" https://your-site.com

# Check if resource hints are present
curl -s https://your-site.com | grep -oP '<link[^>]*(preload|preconnect|prefetch|dns-prefetch)[^>]*>'

# Test from different locations
npx sitespeed.io https://your-site.com --browsertime.connectivity.profile 3g
```
