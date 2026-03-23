---
title: "Color Picker Tools for Developers: HEX, RGB, HSL, and CSS Custom Properties in 2026"
description: "How to use color picker tools effectively for web development. Covers HEX/RGB/HSL conversion, CSS custom properties for theming, accessibility contrast checking, and generating palettes."
date: "2026-03-24"
tags: ["color", "css", "design", "hex", "rgb", "hsl", "accessibility"]
readingTime: "3 min read"
---

# Color Picker Tools for Developers: HEX, RGB, HSL, and CSS Custom Properties in 2026

## The Three Color Formats

| Format | Syntax | Use Case |
|--------|--------|---------|
| HEX | `#ff5733` | CSS, design tools |
| RGB | `rgb(255, 87, 51)` | JavaScript, Canvas |
| HSL | `hsl(14, 100%, 60%)` | Intuitive manipulation |

## Converting Between Formats

```javascript
// HEX → RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// RGB → HEX
function rgbToHex(r, g, b) {
  return "#" + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

// RGB → HSL
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}
```

## CSS Custom Properties for Theming

```css
:root {
  /* Base colors */
  --color-primary: hsl(210, 100%, 50%);
  --color-secondary: hsl(160, 100%, 40%);
  --color-background: hsl(0, 0%, 100%);
  --color-text: hsl(0, 0%, 10%);

  /* Dark mode */
  @media (prefers-color-scheme: dark) {
    :root {
      --color-background: hsl(220, 20%, 10%);
      --color-text: hsl(0, 0%, 95%);
    }
  }
}

/* Usage */
.button {
  background: var(--color-primary);
  color: white;
}
```

## Accessibility: Contrast Checking

```javascript
// WCAG 2.1 contrast ratio
function contrastRatio(color1, color2) {
  const lum1 = relativeLuminance(color1);
  const lum2 = relativeLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

function relativeLuminance(hex) {
  const rgb = hexToRgb(hex).map(c => {
    c /= 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

// WCAG requirements
// AA: 4.5:1 for normal text
// AAA: 7:1 for normal text
// AA: 3:1 for large text (18pt+)
```

## Generating Palettes Programmatically

```javascript
function generatePalette(baseColor, steps = 5) {
  const hsl = hexToHsl(baseColor);
  return Array.from({ length: steps }, (_, i) => {
    const lightness = 10 + (i * (80 - 10) / (steps - 1));
    return `hsl(${hsl.h}, ${hsl.s}%, ${lightness}%)`;
  });
}

// Example: generate 5 shades of blue
generatePalette('#3b82f6');
// ['hsl(217, 91%, 60%)', 'hsl(217, 91%, 70%)', ...]
```

## Color Picker Tools

Use browser-based color pickers that show HEX, RGB, and HSL simultaneously, plus a contrast checker against white and black backgrounds.
