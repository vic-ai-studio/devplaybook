# Usage Guide — DevPlaybook CSS Animation Library

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Custom Properties](#custom-properties)
- [Entrance Animations](#entrance-animations)
- [Exit Animations](#exit-animations)
- [Attention Seekers](#attention-seekers)
- [Hover Effects](#hover-effects)
- [Loading Spinners](#loading-spinners)
- [Text Effects](#text-effects)
- [Scroll Reveal](#scroll-reveal)
- [Background Animations](#background-animations)
- [Utility Classes](#utility-classes)
- [JavaScript Integration](#javascript-integration)
- [Framework Examples](#framework-examples)

---

## Installation

### Option 1: Direct Link

```html
<link rel="stylesheet" href="animations.min.css">
<link rel="stylesheet" href="utility-classes.css">
```

### Option 2: Import in CSS

```css
@import url('animations.min.css');
@import url('utility-classes.css');
```

### Option 3: Import in JS (Webpack/Vite)

```js
import './animations.min.css';
import './utility-classes.css';
```

---

## Basic Usage

Every animation requires the base `.animate` class plus the specific animation class:

```html
<div class="animate animate-fadeIn">I fade in!</div>
```

Combine with utility classes for fine control:

```html
<div class="animate animate-bounceIn animate-slow animate-delay-500">
  Slow bounce with 500ms delay
</div>
```

---

## Custom Properties

Override defaults with CSS custom properties on any element:

```css
/* Global override */
:root {
  --animate-duration: 1s;
  --animate-delay: 0s;
  --animate-timing: ease-out;
}

/* Per-element override */
.my-hero {
  --animate-duration: 2s;
  --animate-delay: 300ms;
  --animate-distance: 150%;
}
```

### Available Properties

| Property | Default | Description |
|----------|---------|-------------|
| `--animate-duration` | `0.8s` | Animation duration |
| `--animate-delay` | `0s` | Animation delay |
| `--animate-timing` | `ease` | Timing function |
| `--animate-fill` | `both` | Fill mode |
| `--animate-iteration` | `1` | Iteration count |
| `--animate-distance` | `100%` | Slide/fade travel distance |
| `--animate-scale-from` | `0.3` | Zoom start scale |

---

## Entrance Animations

### Fade In

```html
<div class="animate animate-fadeIn">Fade in from transparent</div>
<div class="animate animate-fadeInUp">Fade in sliding up</div>
<div class="animate animate-fadeInDown">Fade in sliding down</div>
<div class="animate animate-fadeInLeft">Fade in from left</div>
<div class="animate animate-fadeInRight">Fade in from right</div>
```

### Slide In

```html
<div class="animate animate-slideInUp">Slide in from below</div>
<div class="animate animate-slideInDown">Slide in from above</div>
<div class="animate animate-slideInLeft">Slide in from left</div>
<div class="animate animate-slideInRight">Slide in from right</div>
```

### Bounce In

```html
<div class="animate animate-bounceIn">Bounce in from center</div>
<div class="animate animate-bounceInUp">Bounce in from below</div>
<div class="animate animate-bounceInDown">Bounce in from above</div>
<div class="animate animate-bounceInLeft">Bounce in from left</div>
<div class="animate animate-bounceInRight">Bounce in from right</div>
```

### Zoom In

```html
<div class="animate animate-zoomIn">Zoom in from small</div>
<div class="animate animate-zoomInUp">Zoom in from below</div>
<div class="animate animate-zoomInDown">Zoom in from above</div>
<div class="animate animate-zoomInLeft">Zoom in from left</div>
<div class="animate animate-zoomInRight">Zoom in from right</div>
```

### Flip In

```html
<div class="animate animate-flipInUp">Flip in on X axis</div>
<div class="animate animate-flipInLeft">Flip in on Y axis</div>
```

---

## Exit Animations

Same pattern as entrance, replacing "In" with "Out":

```html
<div class="animate animate-fadeOut">Fade out</div>
<div class="animate animate-fadeOutUp">Fade out upward</div>
<div class="animate animate-slideOutLeft">Slide out to left</div>
<div class="animate animate-bounceOutDown">Bounce out downward</div>
<div class="animate animate-zoomOutRight">Zoom out to right</div>
<div class="animate animate-flipOutUp">Flip out on X axis</div>
```

---

## Attention Seekers

These loop well with `.animate-infinite` or `.animate-repeat-3`:

```html
<div class="animate animate-bounce">Bounce</div>
<div class="animate animate-flash">Flash</div>
<div class="animate animate-pulse animate-infinite">Continuous pulse</div>
<div class="animate animate-rubberBand">Rubber band</div>
<div class="animate animate-shake">Shake (great for error states)</div>
<div class="animate animate-swing">Swing</div>
<div class="animate animate-tada">Tada!</div>
<div class="animate animate-wobble">Wobble</div>
<div class="animate animate-heartBeat animate-infinite">Heartbeat</div>
<div class="animate animate-jello">Jello</div>
```

### Common Use Cases

```html
<!-- Error shake on invalid input -->
<input class="animate animate-shake" style="border-color: red;">

<!-- Notification badge pulse -->
<span class="badge animate animate-pulse animate-infinite">3</span>

<!-- Sale banner attention -->
<div class="sale-banner animate animate-tada">50% OFF!</div>
```

---

## Hover Effects

Hover effects do NOT use the `.animate` base class. Apply directly:

```html
<!-- Scale effects -->
<button class="animate-hover-grow">Grow on hover</button>
<button class="animate-hover-shrink">Shrink on hover</button>

<!-- Elevation -->
<div class="card animate-hover-float">Floats up with shadow</div>
<div class="card animate-hover-shadow">Shadow appears</div>
<div class="card animate-hover-glow">Blue glow effect</div>

<!-- Text/link effects -->
<a class="animate-hover-underline-slide" href="#">Underline slides in</a>

<!-- Button sweep -->
<button class="animate-hover-bg-sweep">Background sweeps in</button>

<!-- Border draw -->
<div class="animate-hover-border-draw" style="padding: 20px;">
  Border draws around on hover
</div>
```

### Customizing Hover Colors

```css
.my-button {
  --animate-sweep-color: #10b981;      /* bg-sweep background */
  --animate-sweep-text-color: #fff;     /* bg-sweep text color */
  --animate-border-color: #f59e0b;      /* border-draw color */
}
```

---

## Loading Spinners

Spinners animate immediately. No `.animate` base class needed:

```html
<!-- Basic spinner -->
<div class="animate-spinner"></div>

<!-- Three dots -->
<div class="animate-dots"><span></span></div>

<!-- Equalizer bars (5 spans required) -->
<div class="animate-bars">
  <span></span><span></span><span></span><span></span><span></span>
</div>

<!-- Ring -->
<div class="animate-ring"></div>

<!-- Dual ring (two colors) -->
<div class="animate-dual-ring"></div>

<!-- Ripple -->
<div class="animate-ripple"></div>

<!-- Pulse dot -->
<div class="animate-pulse-dot"></div>
```

### Customizing Spinners

```css
.my-spinner {
  --animate-spinner-size: 60px;
  --animate-spinner-color: #10b981;
  --animate-spinner-track: rgba(0,0,0,0.1);
  --animate-spinner-color2: #f59e0b;  /* dual-ring second color */
  --animate-dot-size: 16px;
  --animate-bar-height: 50px;
  --animate-bar-width: 6px;
}
```

---

## Text Effects

### Typewriter

```html
<p class="animate animate-typewriter"
   style="--animate-steps: 20; --animate-duration: 3s;">
  This text types itself out
</p>
```

Set `--animate-steps` to the character count for accurate timing.

### Glitch

Requires `data-text` attribute matching the content:

```html
<h1 class="animate-glitch" data-text="GLITCH EFFECT">
  GLITCH EFFECT
</h1>
```

Customize glitch colors:
```css
.my-glitch {
  --animate-glitch-color1: #ff0000;
  --animate-glitch-color2: #00ff00;
}
```

### Gradient Text

```html
<h2 class="animate-text-gradient">Shifting Gradient</h2>
```

Customize gradient:
```css
.my-gradient {
  --animate-gradient-1: #ff6b6b;
  --animate-gradient-2: #ffd93d;
  --animate-gradient-3: #6bcb77;
  --animate-gradient-4: #4d96ff;
}
```

### Blur In

```html
<h2 class="animate animate-blur-in">Blur to sharp</h2>
```

### Letter Spacing

```html
<h2 class="animate animate-letter-spacing">EXPAND</h2>
```

### Wave

Wrap each character in a `<span>`:

```html
<div class="animate-wave">
  <span>H</span><span>e</span><span>l</span><span>l</span><span>o</span>
</div>
```

---

## Scroll Reveal

Scroll reveal uses CSS transitions triggered by adding `.animate-revealed`:

```html
<div class="animate-reveal-up">Reveals sliding up</div>
<div class="animate-reveal-left">Reveals from left</div>
<div class="animate-reveal-right">Reveals from right</div>
<div class="animate-reveal-scale">Reveals scaling up</div>
```

### JavaScript Required for Scroll Detection

Add this small script to trigger reveals:

```html
<script>
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-revealed');
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('[class*="animate-reveal-"]').forEach(el => {
  observer.observe(el);
});
</script>
```

### Staggered Scroll Reveal

```html
<div class="animate-stagger" style="--animate-stagger-interval: 150ms;">
  <div class="animate animate-fadeInUp">Item 1</div>
  <div class="animate animate-fadeInUp">Item 2</div>
  <div class="animate animate-fadeInUp">Item 3</div>
</div>
```

---

## Background Animations

### Gradient Shift

```html
<section class="animate-bg-gradient" style="padding: 100px;">
  <h1>Shifting gradient background</h1>
</section>
```

Customize colors:
```css
.my-section {
  --animate-bg-1: #667eea;
  --animate-bg-2: #764ba2;
  --animate-bg-3: #f093fb;
  --animate-bg-4: #f5576c;
}
```

### Aurora

```html
<section class="animate-bg-aurora" style="padding: 100px; color: white;">
  <h1 style="position: relative; z-index: 1;">Aurora background</h1>
</section>
```

Content inside aurora needs `position: relative; z-index: 1;` to appear above the effect.

### Wave

```html
<section class="animate-bg-wave" style="padding: 100px; background: #1e40af; color: white;">
  <h1>Wave at bottom</h1>
</section>
```

### Particles

Requires particle `<div>` elements inside:

```html
<section class="animate-bg-particles" style="padding: 100px; background: #0f172a;">
  <div class="particle"></div>
  <div class="particle"></div>
  <div class="particle"></div>
  <div class="particle"></div>
  <div class="particle"></div>
  <div class="particle"></div>
  <h1 style="position: relative; z-index: 1;">Floating particles</h1>
</section>
```

---

## Utility Classes

### Delays

| Class | Delay |
|-------|-------|
| `.animate-delay-100` | 100ms |
| `.animate-delay-200` | 200ms |
| `.animate-delay-300` | 300ms |
| `.animate-delay-500` | 500ms |
| `.animate-delay-1000` | 1000ms |
| `.animate-delay-2000` | 2000ms |
| `.animate-delay-3000` | 3000ms |

### Durations

| Class | Duration |
|-------|----------|
| `.animate-fastest` | 0.2s |
| `.animate-faster` | 0.4s |
| `.animate-fast` | 0.6s |
| `.animate-normal` | 0.8s |
| `.animate-slow` | 1.2s |
| `.animate-slower` | 1.8s |
| `.animate-slowest` | 3s |

### Easing

| Class | Curve |
|-------|-------|
| `.animate-ease` | ease |
| `.animate-ease-in` | ease-in |
| `.animate-ease-out` | ease-out |
| `.animate-ease-in-out` | ease-in-out |
| `.animate-ease-bounce` | cubic-bezier(0.68, -0.55, 0.265, 1.55) |
| `.animate-ease-elastic` | cubic-bezier(0.175, 0.885, 0.32, 1.275) |
| `.animate-ease-smooth` | cubic-bezier(0.25, 0.1, 0.25, 1) |
| `.animate-ease-snappy` | cubic-bezier(0.55, 0, 0.1, 1) |

### Iteration

```html
<div class="animate animate-pulse animate-repeat-3">Pulses 3 times</div>
<div class="animate animate-pulse animate-repeat-infinite">Pulses forever</div>
```

### Stagger Children

```html
<ul class="animate-stagger" style="--animate-stagger-interval: 120ms;">
  <li class="animate animate-fadeInUp">First (0ms delay)</li>
  <li class="animate animate-fadeInUp">Second (120ms delay)</li>
  <li class="animate animate-fadeInUp">Third (240ms delay)</li>
</ul>
```

### Responsive

```html
<!-- No animation on mobile -->
<div class="animate animate-fadeIn animate-disable-mobile">
  Only animates on screens > 768px
</div>
```

---

## JavaScript Integration

### Replay an Animation

```js
function replay(element, animationClass) {
  element.classList.remove('animate', animationClass);
  void element.offsetWidth; // force reflow
  element.classList.add('animate', animationClass);
}
```

### Trigger on Event

```js
button.addEventListener('click', () => {
  replay(targetElement, 'animate-tada');
});
```

### Listen for Animation End

```js
element.addEventListener('animationend', () => {
  element.classList.remove('animate', 'animate-fadeIn');
  // do something after animation completes
});
```

---

## Framework Examples

### React

```jsx
function AnimatedCard({ children }) {
  return (
    <div className="animate animate-fadeInUp animate-fast">
      {children}
    </div>
  );
}
```

### Vue

```html
<template>
  <div :class="['animate', show ? 'animate-fadeIn' : 'animate-fadeOut']">
    {{ message }}
  </div>
</template>
```

### Svelte

```html
<div class="animate animate-zoomIn">
  <slot />
</div>
```

---

## Accessibility

This library automatically respects the `prefers-reduced-motion` media query. When a user has reduced motion enabled in their OS settings, all animations are effectively disabled (set to 1ms duration, 1 iteration).

No additional configuration is needed.
