---
title: "SVG Optimization Techniques: Reduce File Size by 70% Without Quality Loss"
description: "Step-by-step SVG optimization guide. Use SVGO, manual techniques, and build tool integration to cut SVG file sizes by 50-80% while preserving visual quality."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["svg", "performance", "optimization", "frontend", "web-performance", "images"]
readingTime: "11 min read"
---

SVG files exported from Figma, Illustrator, or Sketch are bloated by default. Design tools prioritize round-tripping (being able to re-open the file in the editor) over delivery size. That means your exported SVGs carry metadata, editor comments, redundant attributes, and inefficient path data that browsers don't need.

A typical icon SVG from Figma: 3-8KB. After optimization: 400-900 bytes. That's a 70-85% reduction.

Here's how to achieve it.

---

## Why SVGs Are Oversized by Default

Open an SVG exported from Figma and you'll see this:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">
  <!-- Generator: Figma 116.0 -->
  <title>icon-home</title>
  <desc>Created with Figma</desc>
  <defs>
    <style>
      .cls-1 { fill: #000000; }
    </style>
  </defs>
  <g id="Layer_1" data-name="Layer 1">
    <g id="home" data-name="home icon">
      <path class="cls-1" d="M 12.000 3.000 L 3.000 9.000 L 3.000 21.000..."
        fill-rule="nonzero" clip-rule="nonzero"/>
    </g>
  </g>
</svg>
```

What's wasted:
- XML declaration (browsers don't need it for inline SVG)
- Generator comment
- `xmlns:xlink` (deprecated)
- `<title>` and `<desc>` (keep for accessibility, remove for decorative icons)
- Unnecessary `<defs>` and `<style>` blocks
- Nested `<g>` groups with labels
- Redundant attributes (`fill-rule="nonzero"` is the default)
- Verbose path coordinates (6 decimal places where 0 or 1 suffices)

---

## Method 1: SVGO — The Standard Tool

[SVGO](https://github.com/svg/svgo) is the most widely-used SVG optimizer. It runs a configurable set of transforms to remove and simplify SVG markup.

**Install:**
```bash
npm install -g svgo
# or
npm install --save-dev svgo
```

**Basic usage:**
```bash
# Optimize a single file
svgo input.svg -o output.svg

# Optimize all SVGs in a folder
svgo -f ./src/assets/icons

# Show statistics
svgo input.svg --pretty
```

**What SVGO does by default:**
- Removes XML declarations, comments, metadata
- Removes editor namespaces and IDs that serve no purpose
- Collapses nested groups
- Removes default attribute values
- Rounds floating-point numbers
- Converts colors to shorter hex notation
- Merges path segments where possible

### SVGO Configuration

For production, customize the plugin list in `svgo.config.js`:

```javascript
// svgo.config.js
module.exports = {
  plugins: [
    "preset-default",
    {
      name: "removeViewBox",
      active: false, // Keep viewBox — needed for responsive scaling
    },
    {
      name: "cleanupIds",
      params: {
        minify: true, // Shorten IDs: "gradient-blue-shadow" → "a"
      },
    },
    {
      name: "removeAttrs",
      params: {
        attrs: ["data-name", "data-layer"], // Remove Figma-specific attributes
      },
    },
    {
      name: "convertPathData",
      params: {
        floatPrecision: 1, // 1 decimal place is usually enough
      },
    },
  ],
};
```

**Typical results with SVGO:**

| File type | Before | After | Reduction |
|-----------|--------|-------|-----------|
| Figma icon | 2.8KB | 680B | 76% |
| Illustrator logo | 18KB | 4.2KB | 77% |
| Complex illustration | 85KB | 22KB | 74% |
| Simple shape | 450B | 95B | 79% |

---

## Method 2: Build Tool Integration

Don't optimize SVGs manually. Integrate SVGO into your build pipeline so every SVG is optimized automatically.

### Vite

```javascript
// vite.config.ts
import { defineConfig } from "vite";
import svgo from "vite-plugin-svgo";

export default defineConfig({
  plugins: [
    svgo({
      svgoConfig: {
        plugins: ["preset-default"],
      },
    }),
  ],
});
```

### webpack

```javascript
// webpack.config.js
module.exports = {
  module: {
    rules: [
      {
        test: /\.svg$/,
        use: [
          "url-loader",
          {
            loader: "svgo-loader",
            options: {
              plugins: ["preset-default"],
            },
          },
        ],
      },
    ],
  },
};
```

### Next.js (with @svgr/webpack)

```javascript
// next.config.js
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: [
        {
          loader: "@svgr/webpack",
          options: {
            svgo: true,
            svgoConfig: {
              plugins: ["preset-default"],
            },
          },
        },
      ],
    });
    return config;
  },
};
```

---

## Method 3: Manual Optimization Techniques

SVGO handles most cases, but understanding what it does helps you write cleaner SVGs from the start.

### Simplify Path Data

Path data (`d` attribute) is usually the largest part of an SVG. Key techniques:

```xml
<!-- Verbose: absolute coordinates with excessive precision -->
<path d="M 12.3456789 3.4567891 L 3.1234567 9.8765432 L 3.1234567 21.0000000"/>

<!-- Optimized: relative coordinates, 1 decimal place -->
<path d="m12.3 3.5 L3.1 9.9v11.1"/>
```

- Use relative commands (lowercase) when the offset is smaller than the absolute coordinate
- Reduce floating-point precision (1-2 places is usually enough)
- Use shorthand path commands: `H` (horizontal line), `V` (vertical line), `Z` (close path)

### Remove Unnecessary Groups

```xml
<!-- Before: nested groups from Figma layers -->
<g id="frame">
  <g id="content">
    <g id="icon">
      <path d="..."/>
    </g>
  </g>
</g>

<!-- After: just the path -->
<path d="..."/>
```

Groups are only needed when:
- Applying a transform to multiple elements
- Setting shared attributes (fill, opacity) on multiple children

### Consolidate Attributes

```xml
<!-- Before: mix of attributes and CSS -->
<path style="fill: #000000; stroke: none;" fill-rule="nonzero" d="..."/>

<!-- After: attribute only (shorter, no specificity issues) -->
<path fill="#000" d="..."/>
```

Remove `fill="none"` on elements that already inherit `fill: none` from a parent.

### Use Symbol + Use for Repeated Icons

If the same icon appears multiple times on a page:

```html
<!-- Define once in a sprite sheet -->
<svg style="display:none">
  <symbol id="icon-home" viewBox="0 0 24 24">
    <path d="M12 3L3 9v12h6v-7h6v7h6V9L12 3z"/>
  </symbol>
  <symbol id="icon-search" viewBox="0 0 24 24">
    <path d="M21 21l-5.2-5.2M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"/>
  </symbol>
</svg>

<!-- Use anywhere in the document -->
<svg><use href="#icon-home"/></svg>
<svg><use href="#icon-search"/></svg>
<svg><use href="#icon-home"/></svg> <!-- Same icon, no extra bytes -->
```

The browser downloads and parses the path data once.

---

## Method 4: Figma Export Settings

Get smaller SVGs before any optimization by adjusting Figma's export settings:

1. **File > Export** → select your frame/component
2. **Format: SVG**
3. Check **"Flatten"** for icons (merges all layers into a single path)
4. Uncheck **"Include 'id' attribute"** — removes layer names from markup
5. Uncheck **"Outline text"** only if you don't use custom fonts in the SVG

With flattening enabled, a multi-layer icon becomes a single `<path>` element, which SVGO can then further optimize.

---

## Compression: Gzip and Brotli

SVG is text — it compresses well. After SVGO, enable Brotli compression on your server:

| SVG size | After SVGO | After Brotli |
|----------|------------|--------------|
| 18KB logo | 4.2KB | 1.8KB |
| 2.8KB icon | 680B | 340B |

Most CDNs (Cloudflare, Vercel, Netlify) enable Brotli by default. For self-hosted servers, configure your web server:

```nginx
# nginx.conf
brotli on;
brotli_types image/svg+xml;
brotli_comp_level 6;
```

---

## When NOT to Optimize

**Don't optimize SVGs that are still being edited.** SVGO removes IDs, groups, and metadata that are needed for re-importing into Figma or Illustrator. Keep originals in a source folder; put optimized versions in a build/dist folder.

**Be careful with `cleanupIds` when using CSS animations or JavaScript.** If your JavaScript does `document.querySelector("#myElement")` on an SVG element, SVGO's ID minification will break it.

```javascript
// svgo.config.js — disable ID cleanup for animated SVGs
{
  name: "cleanupIds",
  active: false,
}
```

**Illustrations with gradients:** SVGO sometimes merges gradient definitions in ways that change appearance. Preview before committing.

---

## Checklist: SVG Optimization Pipeline

```
□ Export from Figma with "Flatten" enabled
□ Run SVGO with preset-default
□ Verify visual output in browser (especially for gradients/clips)
□ Add svgo-loader to webpack/Vite build
□ Enable Brotli compression on CDN/server
□ Use <symbol> + <use> for repeated icons
□ Set `role="img"` + `aria-label` on meaningful SVGs
□ Set `aria-hidden="true"` on decorative SVGs
```

---

## Online SVG Optimizer

Don't want to set up a CLI? Use [DevPlaybook's SVG optimizer](/tools/svg-optimizer) — paste your SVG, get the optimized version, see the size reduction instantly.

---

## Related Tools on DevPlaybook

- [SVG Optimizer](/tools/svg-optimizer) — optimize SVGs in the browser
- [Image format comparison guide](/blog/webp-vs-avif-vs-png-image-formats) — choose the right format
- [Web performance guide](/blog/web-performance-core-web-vitals-optimization-guide) — Core Web Vitals optimization
