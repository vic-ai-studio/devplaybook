# Image Optimization Checklist

> Images account for 40-60% of total page weight on most websites. Optimizing images is typically the single highest-impact performance improvement you can make.

---

## Format Selection

- [ ] **[CRITICAL] Serve images in next-gen formats (WebP or AVIF)**
  ```html
  <picture>
    <source srcset="image.avif" type="image/avif" />
    <source srcset="image.webp" type="image/webp" />
    <img src="image.jpg" alt="Description" width="800" height="600" />
  </picture>
  ```
  - WebP: 25-35% smaller than JPEG, 26% smaller than PNG (97% browser support)
  - AVIF: 50% smaller than JPEG (92% browser support, slower to encode)
  - Verify: DevTools > Network > filter "Img" > check Content-Type column
  - Tool: `npx @squoosh/cli --webp auto image.jpg`
  - Impact: 30-60% reduction in image bytes

- [ ] **[HIGH] Use SVG for icons, logos, and simple illustrations**
  - SVGs are resolution-independent and typically 1-10KB
  - Optimize: `npx svgo icon.svg --output icon.min.svg`
  - Inline small SVGs (< 2KB) to eliminate HTTP requests
  ```html
  <!-- Inline for small icons -->
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d="M12 2L2 22h20L12 2z" />
  </svg>
  ```
  - Impact: Eliminates raster image overhead for vector graphics

- [ ] **[MEDIUM] Use CSS for simple gradients and shapes instead of images**
  ```css
  /* Replace gradient images with CSS */
  .hero-bg {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }
  ```
  - Impact: Eliminates image requests entirely for decorative elements

- [ ] **[LOW] Consider JPEG XL for high-quality photography (when browser support improves)**
  - Currently supported only in Safari 17+
  - Excellent quality-to-size ratio for photos
  - Monitor: caniuse.com/jpegxl

---

## Responsive Images

- [ ] **[CRITICAL] Use `srcset` and `sizes` to serve appropriately sized images**
  ```html
  <img
    srcset="
      image-400.webp 400w,
      image-800.webp 800w,
      image-1200.webp 1200w,
      image-1600.webp 1600w"
    sizes="(max-width: 600px) 100vw,
           (max-width: 1200px) 50vw,
           800px"
    src="image-800.webp"
    alt="Description"
    width="800"
    height="600"
  />
  ```
  - Rule of thumb: Generate at 400, 800, 1200, 1600, 2000px widths
  - Verify: DevTools > Network > check that mobile loads smaller images
  - Impact: 40-70% byte reduction on mobile devices

- [ ] **[HIGH] Generate responsive image sets as part of the build process**
  ```javascript
  // sharp (Node.js) — generate multiple sizes
  const sharp = require('sharp');
  const widths = [400, 800, 1200, 1600];

  for (const w of widths) {
    await sharp('input.jpg')
      .resize(w)
      .webp({ quality: 80 })
      .toFile(`output-${w}.webp`);
  }
  ```
  - Tools: sharp, imagemin, @11ty/eleventy-img, next/image (auto)
  - Impact: Automates responsive images, prevents serving oversized images

- [ ] **[HIGH] Never serve images larger than 2x the display size**
  - A 400px container needs at most an 800px image (for 2x retina)
  - Verify: DevTools > hover over image > compare "Natural size" vs "Rendered size"
  - Quick audit:
  ```javascript
  document.querySelectorAll('img').forEach(img => {
    const ratio = img.naturalWidth / img.clientWidth;
    if (ratio > 2.5) console.warn(`Oversized: ${img.src} (${ratio.toFixed(1)}x)`);
  });
  ```
  - Impact: Prevents downloading 2-5x more data than needed

- [ ] **[MEDIUM] Use `art direction` with `<picture>` for different crops on mobile**
  ```html
  <picture>
    <source media="(max-width: 600px)" srcset="hero-mobile.webp" />
    <source media="(max-width: 1200px)" srcset="hero-tablet.webp" />
    <img src="hero-desktop.webp" alt="..." />
  </picture>
  ```
  - Use when cropping matters (e.g., landscape hero on desktop, portrait on mobile)
  - Impact: Better UX + smaller image files on mobile

---

## Lazy Loading

- [ ] **[CRITICAL] Lazy load all images below the fold**
  ```html
  <!-- Above the fold (LCP image) — DO NOT lazy load -->
  <img src="hero.webp" fetchpriority="high" alt="..." width="1200" height="600" />

  <!-- Below the fold — lazy load -->
  <img src="product.webp" loading="lazy" alt="..." width="400" height="300" />
  ```
  - The browser's native `loading="lazy"` loads images when they are ~1250px from the viewport
  - Verify: DevTools > Network > scroll down > images should load as you scroll
  - Impact: 30-50% reduction in initial page bytes

- [ ] **[CRITICAL] Never lazy load the LCP image or above-the-fold images**
  - Lazy loading the hero image delays it by 200-1000ms
  - Rule: First 1-3 images in the viewport should NOT have `loading="lazy"`
  - Verify: Run Lighthouse > check for "Largest Contentful Paint image was lazily loaded"
  - Impact: 500ms-2s LCP improvement

- [ ] **[HIGH] Use Intersection Observer for complex lazy-loading scenarios**
  ```javascript
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.srcset = img.dataset.srcset || '';
        observer.unobserve(img);
      }
    });
  }, { rootMargin: '200px' }); // Load 200px before entering viewport

  document.querySelectorAll('img[data-src]').forEach(img => observer.observe(img));
  ```
  - Use when you need custom loading distance or animation triggers
  - Impact: Fine-grained control over image loading

- [ ] **[MEDIUM] Lazy load background images with Intersection Observer**
  ```javascript
  const bgObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.backgroundImage = `url(${entry.target.dataset.bg})`;
        bgObserver.unobserve(entry.target);
      }
    });
  });

  document.querySelectorAll('[data-bg]').forEach(el => bgObserver.observe(el));
  ```
  - `loading="lazy"` does not work on CSS background images
  - Impact: Prevents loading background images that are never scrolled to

---

## Compression & Quality

- [ ] **[HIGH] Compress images to appropriate quality levels**
  | Use Case | JPEG Quality | WebP Quality | AVIF Quality |
  |----------|-------------|-------------|-------------|
  | Hero/product images | 80-85 | 75-80 | 60-70 |
  | Thumbnails | 70-75 | 65-70 | 50-60 |
  | Blog post images | 75-80 | 70-75 | 55-65 |
  | Decorative/background | 60-70 | 55-65 | 45-55 |

  ```bash
  # Compress with sharp CLI
  npx sharp-cli -i input.jpg -o output.webp --format webp --quality 75

  # Batch compress a directory
  npx sharp-cli -i "images/*.jpg" -o compressed/ --format webp --quality 75
  ```
  - Verify: Compare file sizes before and after. Visual quality check at 100% zoom.
  - Impact: 20-50% reduction without visible quality loss

- [ ] **[HIGH] Strip EXIF metadata from production images**
  ```bash
  # Using sharp
  sharp('input.jpg').withMetadata(false).toFile('output.jpg')

  # Using exiftool
  exiftool -all= -overwrite_original image.jpg
  ```
  - EXIF data can add 5-50KB per image (GPS, camera info, thumbnails)
  - Exception: Keep copyright metadata if legally required
  - Impact: 5-50KB per image

- [ ] **[MEDIUM] Use progressive JPEG for large images (> 10KB)**
  ```javascript
  sharp('input.jpg')
    .jpeg({ progressive: true, quality: 80 })
    .toFile('output.jpg');
  ```
  - Progressive JPEGs render a blurry version first, then sharpen
  - Actually compresses slightly better than baseline JPEG for large files
  - Impact: Better perceived loading speed

- [ ] **[LOW] Enable image compression at the CDN/server level**
  ```nginx
  # Nginx — auto-convert to WebP if browser supports it
  map $http_accept $webp_suffix {
    default "";
    "~*webp" ".webp";
  }

  location ~* \.(jpg|jpeg|png)$ {
    try_files $uri$webp_suffix $uri =404;
  }
  ```
  - Cloudflare: Enable Polish (Pro plan) or use Cloudflare Images
  - Vercel/Netlify: Built-in image optimization
  - Impact: Automatic format conversion without code changes

---

## CDN & Delivery

- [ ] **[HIGH] Serve images from a CDN**
  - CDNs serve images from the edge location closest to the user
  - Options: Cloudflare Images, Imgix, Cloudinary, AWS CloudFront + S3
  - Verify: Check image response headers for CDN identifiers (e.g., `cf-cache-status`, `x-amz-cf-id`)
  - Impact: 100-500ms improvement per image load

- [ ] **[HIGH] Set proper cache headers for images**
  ```
  Cache-Control: public, max-age=31536000, immutable
  ```
  - Use content hashing in filenames for cache busting: `hero.a1b2c3.webp`
  - `immutable` tells the browser to never revalidate (supported in Firefox, Safari)
  - Verify: DevTools > Network > check Cache-Control header on image responses
  - Impact: Eliminates image re-downloads for returning visitors

- [ ] **[MEDIUM] Use an image CDN with on-the-fly transformation**
  ```html
  <!-- Cloudinary example -->
  <img src="https://res.cloudinary.com/demo/image/upload/w_800,f_auto,q_auto/hero.jpg" />

  <!-- Imgix example -->
  <img src="https://your-source.imgix.net/hero.jpg?w=800&auto=format,compress" />
  ```
  - Auto-format: Serves WebP/AVIF based on browser support
  - Auto-quality: Adjusts compression based on image content
  - Impact: Hands-off optimization, typically 40-60% byte reduction

- [ ] **[MEDIUM] Implement Low-Quality Image Placeholders (LQIP)**
  ```html
  <!-- Tiny blurred placeholder (inline as base64, ~300 bytes) -->
  <img
    src="data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    data-src="full-image.webp"
    class="blur-up"
    alt="..."
  />

  <style>
    .blur-up {
      filter: blur(20px);
      transition: filter 0.3s;
    }
    .blur-up.loaded {
      filter: blur(0);
    }
  </style>
  ```
  - Tools: `npx sqip` (SVG-based), `sharp` (tiny JPEG), `blurhash`
  - Impact: Better perceived performance, eliminates blank space during load

---

## Audit Commands

```bash
# Find all images on a page and their sizes
curl -s https://your-site.com | grep -oP 'src="[^"]*\.(jpg|jpeg|png|gif|webp|avif|svg)"' | sort -u

# Check if images have width/height attributes (CLS prevention)
curl -s https://your-site.com | grep -oP '<img[^>]*>' | grep -v 'width='

# Find oversized images served to the page
# Run in DevTools Console:
document.querySelectorAll('img').forEach(i => {
  if (i.naturalWidth > i.clientWidth * 2.5) {
    console.warn(`${i.src}: ${i.naturalWidth}px served for ${i.clientWidth}px display`);
  }
});

# Batch convert directory to WebP
for f in *.jpg *.png; do
  npx sharp-cli -i "$f" -o "${f%.*}.webp" --format webp --quality 75
done

# Calculate total image weight on a page
curl -s https://your-site.com | grep -oP 'src="([^"]*\.(jpg|jpeg|png|gif|webp))"' | \
  while read -r url; do curl -sI "$url" | grep -i content-length; done
```
