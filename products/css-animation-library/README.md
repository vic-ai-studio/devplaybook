# DevPlaybook CSS Animation Library

A professional, production-ready CSS animation library with 80+ animations, hover effects, loading spinners, text effects, scroll reveals, and background animations.

**No JavaScript required.** Pure CSS. Works with any framework or vanilla HTML.

---

## What's Included

| File | Description | Size |
|------|-------------|------|
| `animations.css` | Full animation library (commented, readable) | ~36 KB |
| `animations.min.css` | Minified version for production | ~28 KB |
| `utility-classes.css` | Delays, durations, easing, stagger helpers | ~5 KB |
| `preview.html` | Interactive demo page | — |
| `USAGE.md` | Detailed usage guide with examples | — |

## Quick Start

### 1. Link the CSS

```html
<link rel="stylesheet" href="animations.min.css">
<link rel="stylesheet" href="utility-classes.css">
```

### 2. Add Classes

```html
<div class="animate animate-fadeInUp">Hello World</div>
```

### 3. Customize (Optional)

```html
<div class="animate animate-fadeInUp animate-slow animate-delay-300">
  Slow fade in with 300ms delay
</div>
```

Or use CSS custom properties:

```css
.my-element {
  --animate-duration: 1.5s;
  --animate-delay: 200ms;
}
```

## Animation Categories

### Entrance (21 animations)
`fadeIn`, `fadeInUp`, `fadeInDown`, `fadeInLeft`, `fadeInRight`, `slideInUp`, `slideInDown`, `slideInLeft`, `slideInRight`, `bounceIn`, `bounceInUp`, `bounceInDown`, `bounceInLeft`, `bounceInRight`, `zoomIn`, `zoomInUp`, `zoomInDown`, `zoomInLeft`, `zoomInRight`, `flipInUp`, `flipInLeft`

### Exit (21 animations)
`fadeOut`, `fadeOutUp`, `fadeOutDown`, `fadeOutLeft`, `fadeOutRight`, `slideOutUp`, `slideOutDown`, `slideOutLeft`, `slideOutRight`, `bounceOut`, `bounceOutUp`, `bounceOutDown`, `bounceOutLeft`, `bounceOutRight`, `zoomOut`, `zoomOutUp`, `zoomOutDown`, `zoomOutLeft`, `zoomOutRight`, `flipOutUp`, `flipOutLeft`

### Attention Seekers (10 animations)
`bounce`, `flash`, `pulse`, `rubberBand`, `shake`, `swing`, `tada`, `wobble`, `heartBeat`, `jello`

### Hover Effects (8 effects)
`hover-grow`, `hover-shrink`, `hover-float`, `hover-shadow`, `hover-glow`, `hover-underline-slide`, `hover-bg-sweep`, `hover-border-draw`

### Loading Spinners (7 spinners)
`spinner`, `dots`, `bars`, `ring`, `dual-ring`, `ripple`, `pulse-dot`

### Text Effects (6 effects)
`typewriter`, `glitch`, `text-gradient`, `blur-in`, `letter-spacing`, `wave`

### Scroll Reveal (4 helpers)
`reveal-up`, `reveal-left`, `reveal-right`, `reveal-scale`

### Background Animations (4 effects)
`bg-gradient`, `bg-particles`, `bg-aurora`, `bg-wave`

## Features

- **CSS Custom Properties** — Override `--animate-duration`, `--animate-delay`, and more
- **Reduced Motion** — Respects `prefers-reduced-motion` automatically
- **Utility Classes** — Fine-grained control over timing, easing, iteration, direction
- **Stagger Support** — Animate child elements sequentially with `.animate-stagger`
- **Responsive** — Disable animations on mobile/tablet with `.animate-disable-mobile`
- **Zero Dependencies** — Pure CSS, no JavaScript required
- **Framework Agnostic** — Works with React, Vue, Svelte, vanilla HTML, anything

## Browser Support

All modern browsers (Chrome, Firefox, Safari, Edge). CSS animations have excellent browser support (97%+ global coverage).

## License

Commercial license. See LICENSE file for details.
