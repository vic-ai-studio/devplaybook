---
title: "Color Picker Hex RGB — Convert and Pick Colors for Web Development"
description: "Color picker hex RGB — convert between HEX, RGB, HSL, and CSS color formats instantly. Learn how color systems work in CSS, JavaScript, and design tools with practical examples."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["color", "css", "design", "hex", "rgb", "developer-tools", "web-development"]
readingTime: "7 min read"
faq:
  - question: "What is the difference between HEX and RGB colors?"
    answer: "HEX and RGB represent the same color in different notations. #ff5733 and rgb(255, 87, 51) are identical — HEX is just a compact base-16 representation of the three RGB values."
  - question: "When should I use HSL instead of RGB in CSS?"
    answer: "HSL is more intuitive for generating color variations. To create a lighter version of a color, you adjust the Lightness value in HSL rather than calculating new RGB values from scratch."
  - question: "What does the alpha channel do?"
    answer: "Alpha controls opacity. rgba(255, 0, 0, 0.5) is 50% transparent red. In CSS, you can also use hex with alpha: #ff000080 (the last two hex digits are the alpha)."
---

# Color Picker Hex RGB

A **color picker hex RGB** tool converts between color formats, lets you sample colors from a visual palette, and gives you the exact values for CSS and JavaScript. Whether you are matching a brand color, building a design system, or debugging a CSS variable, having instant format conversion saves time.

This guide covers how HEX, RGB, HSL, and modern CSS color formats work — and how to convert between them programmatically.

---

## The Three Core Color Formats

### HEX (`#rrggbb`)

HEX encodes each channel (red, green, blue) as two hexadecimal digits from `00` (0) to `ff` (255):

```
#ff5733
  ^^     Red   = 0xff = 255
    ^^   Green = 0x57 = 87
      ^^ Blue  = 0x33 = 51
```

Shorthand HEX works when each pair is identical: `#aabbcc` → `#abc`.

### RGB (`rgb(r, g, b)`)

RGB uses decimal values 0–255 for each channel:

```css
color: rgb(255, 87, 51);
```

Both HEX and RGB are exact aliases. `#ff5733` and `rgb(255, 87, 51)` produce the identical color in any browser.

### HSL (`hsl(h, s%, l%)`)

HSL stands for Hue, Saturation, Lightness:

- **Hue** — angle on the color wheel (0–360): 0 = red, 120 = green, 240 = blue
- **Saturation** — color intensity (0% = gray, 100% = full color)
- **Lightness** — brightness (0% = black, 50% = base color, 100% = white)

```css
color: hsl(14, 100%, 60%); /* same orange as #ff5733 */
```

HSL is much easier to adjust by feel. To lighten a button hover state:

```css
.button { background: hsl(14, 100%, 60%); }
.button:hover { background: hsl(14, 100%, 70%); } /* just increase lightness */
```

---

## Converting Between Formats

### HEX to RGB

```javascript
function hexToRgb(hex) {
  // Remove # if present
  const clean = hex.replace('#', '');

  // Expand shorthand: #abc → #aabbcc
  const full = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;

  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);

  return { r, g, b };
}

hexToRgb('#ff5733'); // { r: 255, g: 87, b: 51 }
hexToRgb('#abc');    // { r: 170, g: 187, b: 204 }
```

### RGB to HEX

```javascript
function rgbToHex(r, g, b) {
  return '#' + [r, g, b]
    .map(v => Math.max(0, Math.min(255, v))
      .toString(16)
      .padStart(2, '0'))
    .join('');
}

rgbToHex(255, 87, 51); // "#ff5733"
```

### RGB to HSL

```javascript
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r: h = ((g - b) / delta) % 6; break;
      case g: h = (b - r) / delta + 2; break;
      case b: h = (r - g) / delta + 4; break;
    }

    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  return {
    h,
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

rgbToHsl(255, 87, 51); // { h: 14, s: 100, l: 60 }
```

### Python Conversion

```python
import colorsys

def hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip('#')
    if len(hex_color) == 3:
        hex_color = ''.join(c * 2 for c in hex_color)
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return r, g, b

def rgb_to_hsl(r: int, g: int, b: int) -> tuple[int, int, int]:
    h, l, s = colorsys.rgb_to_hls(r/255, g/255, b/255)
    return round(h * 360), round(s * 100), round(l * 100)

r, g, b = hex_to_rgb('#ff5733')
print(rgb_to_hsl(r, g, b))  # (14, 100, 60)
```

---

## Modern CSS Color Functions

CSS has expanded significantly beyond basic HEX and RGB:

### `oklch()` — Perceptual Color (CSS Color Level 4)

```css
/* oklch(lightness chroma hue) */
.primary { color: oklch(0.65 0.15 29); }
.lighter { color: oklch(0.75 0.15 29); } /* just increase lightness */
```

`oklch` is perceptually uniform — equal steps in lightness look equal to the human eye, which HEX and RGB do not guarantee.

### CSS Color Mix

```css
/* Mix two colors */
.blended {
  color: color-mix(in srgb, #ff5733 30%, #3366ff);
}
```

### CSS Custom Properties for Theming

```css
:root {
  --color-primary-h: 14;
  --color-primary-s: 100%;
  --color-primary-l: 60%;
  --color-primary: hsl(var(--color-primary-h), var(--color-primary-s), var(--color-primary-l));
}

.button-hover {
  --color-primary-l: 70%; /* just change lightness */
  background: var(--color-primary);
}
```

This makes a complete theme adjustable by changing a few variables.

---

## Accessibility: Color Contrast

WCAG 2.1 requires a contrast ratio of:
- **4.5:1** for normal text (AA)
- **3:1** for large text (18pt+ or 14pt+ bold)
- **7:1** for enhanced contrast (AAA)

Check contrast programmatically:

```javascript
function getLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const rgb1 = hexToRgb(hex1);
  const rgb2 = hexToRgb(hex2);
  const l1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

contrastRatio('#ff5733', '#ffffff'); // ~3.1 (fails AA for normal text)
contrastRatio('#000000', '#ffffff'); // 21 (maximum contrast)
```

---

## Free Color Picker Tools

**[DevPlaybook Color Picker](https://devplaybook.cc/tools/color-picker)** — Pick from a visual palette or enter HEX/RGB/HSL values to convert between formats instantly.

**[Color Converter](https://devplaybook.cc/tools/color-converter)** — Batch convert color values between HEX, RGB, HSL, and CSS formats.

**[Color Contrast Checker](https://devplaybook.cc/tools/color-contrast-checker)** — Check WCAG contrast ratios for any color pair.

**[Color Palette Generator](https://devplaybook.cc/tools/color-palette-generator)** — Generate harmonious color palettes (complementary, triadic, split-complementary) from a base color.

---

## Quick Reference

```
Format          Example                Notes
-------         --------               -----
HEX             #ff5733                Compact, most common in CSS/design
HEX with alpha  #ff573380              Last 2 digits = alpha (80 ≈ 50%)
RGB             rgb(255, 87, 51)       Clear, easy to read values
RGBA            rgba(255, 87, 51, 0.5) With opacity
HSL             hsl(14, 100%, 60%)     Best for programmatic adjustments
HSLA            hsla(14, 100%, 60%, 0.5)
oklch           oklch(0.65 0.15 29)    Perceptual, best for design systems
CSS named       tomato, cornflowerblue 140+ named colors in CSS
```

---

## Summary

HEX and RGB represent the same color in different notations. HSL is best for generating color variations programmatically. Modern `oklch` provides perceptually uniform color manipulation.

Key tools for daily use:
- **Pick a color** → [Color Picker](https://devplaybook.cc/tools/color-picker)
- **Convert formats** → [Color Converter](https://devplaybook.cc/tools/color-converter)
- **Check accessibility** → [Color Contrast Checker](https://devplaybook.cc/tools/color-contrast-checker)

---

## Accelerate Your Dev Workflow

The **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=color-picker-article)** includes VSCode snippets for CSS custom properties, Tailwind utilities, and component patterns — so you spend less time on boilerplate and more on building. $29, one-time.
