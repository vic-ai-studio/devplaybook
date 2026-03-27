---
title: "D3.js vs Chart.js vs Recharts vs Nivo: Data Visualization in 2026"
description: "Compare D3.js, Chart.js, Recharts, and Nivo for data visualization in 2026. We analyze bundle size, React integration, customization, SSR support, and learning curve so you can pick the right charting library for your project."
author: "DevPlaybook Team"
date: "2026-03-27"
readingTime: "10 min read"
tags: ["data-visualization", "d3", "chartjs", "recharts"]
---

# D3.js vs Chart.js vs Recharts vs Nivo: Data Visualization in 2026

Data visualization on the web has four dominant options in 2026: **D3.js**, **Chart.js**, **Recharts**, and **Nivo**. Each one occupies a different position on the spectrum from raw power to out-of-the-box convenience. Picking the wrong one wastes days of integration work; picking the right one gets you a production-ready chart in an afternoon.

This guide compares all four across the dimensions that actually matter: bundle size, React integration, TypeScript support, server-side rendering, customization ceiling, and learning curve. Every section includes the same bar chart implemented in each library so you can compare the API directly.

---

## Why There Is No Single Answer

The reason this comparison exists is that each library solves a genuinely different problem:

- **D3.js** is a data manipulation and DOM binding toolkit. It can build anything — but it requires you to build it.
- **Chart.js** is a plug-and-play charting library. It renders to Canvas with sensible defaults and minimal configuration.
- **Recharts** is a React-native charting library built on top of D3 primitives. It treats charts as React component trees.
- **Nivo** is a high-level declarative library with first-class SSR support and a strong visual aesthetic out of the box.

We will also briefly cover **Observable Plot**, a newer option from the Observable team that is worth knowing about.

---

## The Libraries at a Glance

| Library | Stars (2026) | Renderer | React Native | SSR | Bundle Size (min+gz) |
|---|---|---|---|---|---|
| D3.js v7 | ~109k | SVG + Canvas | Manual | Manual | ~75 kB (full) / ~12 kB (modular) |
| Chart.js v4 | ~65k | Canvas | Via react-chartjs-2 | Limited | ~60 kB |
| Recharts v2 | ~24k | SVG (via D3) | Yes (built-in) | Yes | ~145 kB |
| Nivo | ~14k | SVG + Canvas + HTML | Yes (built-in) | Yes (first-class) | ~90 kB (per chart) |
| Observable Plot | ~4.2k | SVG | Manual | Yes | ~28 kB |

---

## The Same Bar Chart in Every Library

We will visualize this dataset throughout the article:

```javascript
const data = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5800 },
  { month: 'Mar', revenue: 3900 },
  { month: 'Apr', revenue: 7100 },
  { month: 'May', revenue: 6500 },
  { month: 'Jun', revenue: 8900 },
]
```

### D3.js v7

```javascript
import * as d3 from 'd3'

const width = 600
const height = 400
const margin = { top: 20, right: 30, bottom: 40, left: 60 }

const svg = d3.select('#chart')
  .append('svg')
  .attr('width', width)
  .attr('height', height)

const x = d3.scaleBand()
  .domain(data.map(d => d.month))
  .range([margin.left, width - margin.right])
  .padding(0.2)

const y = d3.scaleLinear()
  .domain([0, d3.max(data, d => d.revenue)])
  .nice()
  .range([height - margin.bottom, margin.top])

svg.append('g')
  .attr('transform', `translate(0,${height - margin.bottom})`)
  .call(d3.axisBottom(x))

svg.append('g')
  .attr('transform', `translate(${margin.left},0)`)
  .call(d3.axisLeft(y).tickFormat(d => `$${d / 1000}k`))

svg.selectAll('rect')
  .data(data)
  .join('rect')
  .attr('x', d => x(d.month))
  .attr('y', d => y(d.revenue))
  .attr('width', x.bandwidth())
  .attr('height', d => y(0) - y(d.revenue))
  .attr('fill', '#6366f1')
```

D3 requires you to manually define scales, axes, and shapes. That is about 35 lines for a basic bar chart — and this is the abbreviated version without tooltips or animations.

### Chart.js v4

```javascript
import { Chart, BarController, BarElement, CategoryScale, LinearScale, Tooltip } from 'chart.js'

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Tooltip)

const ctx = document.getElementById('chart').getContext('2d')

new Chart(ctx, {
  type: 'bar',
  data: {
    labels: data.map(d => d.month),
    datasets: [{
      label: 'Revenue',
      data: data.map(d => d.revenue),
      backgroundColor: '#6366f1',
      borderRadius: 4,
    }],
  },
  options: {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (ctx) => `$${ctx.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (val) => `$${val / 1000}k` },
      },
    },
  },
})
```

Chart.js is dramatically shorter for standard chart types. The tree-shaking import pattern (registering only what you use) keeps the bundle lean.

### Recharts

```jsx
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

function RevenueChart() {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={(val) => `$${val / 1000}k`} />
        <Tooltip formatter={(val) => [`$${val.toLocaleString()}`, 'Revenue']} />
        <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

Recharts feels natural in a React codebase. The chart is a component tree — you add features by composing components. `ResponsiveContainer` handles resize automatically.

### Nivo

```jsx
import { ResponsiveBar } from '@nivo/bar'

function RevenueChart() {
  const nivoData = data.map(d => ({ month: d.month, Revenue: d.revenue }))

  return (
    <div style={{ height: 400 }}>
      <ResponsiveBar
        data={nivoData}
        keys={['Revenue']}
        indexBy="month"
        margin={{ top: 20, right: 30, bottom: 50, left: 70 }}
        colors={['#6366f1']}
        borderRadius={4}
        axisLeft={{
          format: (val) => `$${val / 1000}k`,
        }}
        tooltip={({ value }) => (
          <div style={{ background: 'white', padding: '8px', border: '1px solid #ccc' }}>
            ${value.toLocaleString()}
          </div>
        )}
        animate
      />
    </div>
  )
}
```

Nivo requires slightly different data shaping (keys and indexBy instead of dataKey), but the result is a polished chart with animations and accessible tooltips by default.

---

## D3.js v7: Maximum Flexibility

D3 is not a charting library — it is a toolkit for building custom visualizations. If you need a standard bar chart, D3 is overkill. If you need a custom Voronoi diagram, a force-directed network graph, or a geographic choropleth, D3 is the only realistic option.

### What D3 Does Best

- **Scale functions**: linear, log, power, time, ordinal, sequential, quantize, and more
- **Shape generators**: lines, areas, arcs, curves, stacks
- **Geographic projections**: over 50 built-in map projections
- **Force simulation**: physics-based graph layouts
- **Transitions**: fine-grained animation control with easing functions
- **Data joins**: efficient DOM updates using the enter/update/exit pattern

### D3 v7 Modular Imports

One of D3's biggest improvements in recent versions is tree-shakeable modular imports. Instead of importing the entire library (~75 kB), import only what you need:

```javascript
import { scaleLinear, scaleBand } from 'd3-scale'
import { axisBottom, axisLeft } from 'd3-axis'
import { select } from 'd3-selection'
import { max } from 'd3-array'
// Result: ~18 kB instead of ~75 kB
```

### D3 + React Patterns

D3 and React both want to control the DOM, which creates a tension. The standard approach is to use React for the outer structure and refs for D3's inner workings:

```jsx
import { useRef, useEffect } from 'react'
import * as d3 from 'd3'

function D3Chart({ data }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    const svg = d3.select(svgRef.current)
    // ... D3 logic here
  }, [data])

  return <svg ref={svgRef} width={600} height={400} />
}
```

An alternative pattern uses D3 only for math (scales, shapes) and React for rendering:

```jsx
const xScale = scaleBand().domain(data.map(d => d.month)).range([0, 600]).padding(0.2)
const yScale = scaleLinear().domain([0, max(data, d => d.revenue)]).range([400, 0])

return (
  <svg width={600} height={400}>
    {data.map(d => (
      <rect
        key={d.month}
        x={xScale(d.month)}
        y={yScale(d.revenue)}
        width={xScale.bandwidth()}
        height={400 - yScale(d.revenue)}
        fill="#6366f1"
      />
    ))}
  </svg>
)
```

This second pattern is more idiomatic React and easier to maintain.

---

## Chart.js v4: The Practical Default

Chart.js is the default choice when you need standard chart types (bar, line, pie, scatter, radar, doughnut) and want to ship quickly. It renders to Canvas rather than SVG, which means:

- Better performance with large datasets (10,000+ data points)
- No DOM elements per data point (good for memory)
- Harder to style with CSS
- No built-in accessibility per element (workarounds exist)

### react-chartjs-2 Wrapper

```jsx
import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip)

function RevenueChart() {
  const chartData = {
    labels: data.map(d => d.month),
    datasets: [{
      data: data.map(d => d.revenue),
      backgroundColor: '#6366f1',
    }],
  }

  return <Bar data={chartData} options={{ responsive: true }} />
}
```

The `react-chartjs-2` wrapper is maintained separately from Chart.js and is the standard way to use Chart.js in React projects.

### Chart.js Limitations

- No built-in SSR — Canvas APIs are browser-only. Use `chart.js/auto` with `ssr: false` in Next.js or use a workaround like `chartjs-node-canvas` on the server.
- Limited SVG support — everything is Canvas.
- Custom chart types require plugin authoring.
- TypeScript types are bundled but occasionally lag behind releases.

---

## Recharts: React-Native Charting

Recharts treats every part of a chart as a React component. This makes it the most ergonomic choice in a React codebase because chart customization follows the same patterns as UI customization — you compose components.

### Custom Tooltip Example

```jsx
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border bg-white p-3 shadow-md">
      <p className="font-semibold">{label}</p>
      <p className="text-indigo-600">${payload[0].value.toLocaleString()}</p>
    </div>
  )
}

<Tooltip content={<CustomTooltip />} />
```

Custom tooltips in Recharts are just React components. No special API to learn.

### Recharts Limitations

The main criticism of Recharts in 2026 is **bundle size**. At ~145 kB minified and gzipped, it is the heaviest option in this comparison. It bundles a significant portion of D3 internally. This matters on mobile-first sites with aggressive performance budgets.

Recharts also has limited support for complex custom shapes — anything beyond its built-in chart types requires dropping down to D3 anyway.

### Recharts TypeScript Support

```typescript
import { BarChart, Bar } from 'recharts'
// Types are bundled — no @types package needed
// Tooltip payload types are the main pain point

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number }> }) {
  // ...
}
```

TypeScript support is good but has rough edges around tooltip payload types. This is a known limitation the Recharts team is actively improving.

---

## Nivo: SSR-First with Beautiful Defaults

Nivo is built on top of D3 but provides a high-level declarative API. Its defining features are first-class server-side rendering and an opinionated visual system that makes charts look polished without custom CSS.

### Why Nivo Wins on SSR

Chart.js uses Canvas (no SSR). Recharts uses SVG but requires React to render. Nivo supports all three renderers — SVG, Canvas, and HTML — and each works in server-side rendering environments:

```jsx
// SVG version — works in SSR
import { ResponsiveBar } from '@nivo/bar'

// Canvas version — better performance for large datasets
import { ResponsiveBarCanvas } from '@nivo/bar'

// HTML version — best for accessibility
import { ResponsiveBarHtml } from '@nivo/bar'
```

### Nivo Theming

```javascript
const theme = {
  axis: {
    ticks: { text: { fontSize: 12, fill: '#6b7280' } },
    legend: { text: { fontSize: 14, fill: '#374151' } },
  },
  grid: { line: { stroke: '#e5e7eb' } },
  tooltip: { container: { borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } },
}

<ResponsiveBar theme={theme} {...otherProps} />
```

### Nivo Bundle Size Caveat

Nivo ships as separate packages per chart type (`@nivo/bar`, `@nivo/line`, etc.). The per-package size (~90 kB min+gz) includes shared dependencies. If you use five chart types, you will share most of the core bundle — but tree-shaking across packages is not perfect. Audit your actual bundle output with your specific usage.

---

## Observable Plot: The Honorable Mention

[Observable Plot](https://observablehq.com/plot/) from the D3 creator (Mike Bostock) offers a grammar-of-graphics API with a tiny bundle. It is worth considering for dashboards with many small charts where bundle size dominates:

```javascript
import * as Plot from '@observablehq/plot'

const chart = Plot.plot({
  marks: [
    Plot.barY(data, { x: 'month', y: 'revenue', fill: '#6366f1' }),
    Plot.ruleY([0]),
  ],
})

document.getElementById('chart').append(chart)
```

Observable Plot is SSR-compatible and produces SVG. Its React integration requires a `useEffect` wrapper similar to D3. It is not yet at parity with D3 for complex custom visualizations, but for standard chart types it is the leanest option.

---

## Feature Comparison Tables

### Core Capabilities

| Feature | D3.js | Chart.js | Recharts | Nivo |
|---|---|---|---|---|
| Custom chart types | Full control | Plugin API | Limited | Limited |
| Animations | Manual (transitions) | Built-in | Built-in | Built-in |
| Responsive sizing | Manual | Built-in | ResponsiveContainer | Responsive* prefix |
| Legends | Manual | Built-in | Built-in | Built-in |
| Tooltips | Manual | Built-in | Built-in | Built-in |
| Zoom / Pan | Via d3-zoom | Plugin | Plugin | No |
| Maps / Geo | Full (d3-geo) | No | No | No |

### TypeScript and React Support

| Library | TypeScript Support | React Integration | React Native | hooks-friendly |
|---|---|---|---|---|
| D3.js | Good (@types/d3) | Manual (ref pattern) | Manual | Yes (with care) |
| Chart.js | Good (bundled) | react-chartjs-2 | No | Yes |
| Recharts | Good (bundled) | Native | No | Yes |
| Nivo | Excellent (bundled) | Native | No | Yes |

### SSR and Performance

| Library | SSR Support | Canvas Renderer | Large Datasets (>10k pts) | WCAG Accessibility |
|---|---|---|---|---|
| D3.js | Yes (manual) | Via d3-canvas | Excellent | Manual |
| Chart.js | Limited | Yes (native) | Excellent | Limited |
| Recharts | Yes (SVG) | No | Poor (SVG limit) | Good |
| Nivo | Yes (first-class) | Yes (canvas variant) | Good | Good |

### Bundle Size Breakdown

| Library | Min+gz (basic bar chart) | Notes |
|---|---|---|
| D3.js (modular) | ~12–18 kB | Tree-shaken to what you use |
| Chart.js (tree-shaken) | ~35–45 kB | Register only needed controllers |
| Recharts | ~145 kB | Bundles much of D3 internally |
| Nivo (@nivo/bar) | ~90 kB | Shared core across packages |
| Observable Plot | ~28 kB | Impressively lean |

---

## Internal Tools for Visualization Work

When designing chart layouts or experimenting with color palettes, the [Color Picker tool at /tools/color-picker](/tools/color-picker) on DevPlaybook lets you generate accessible color schemes for your data series. For inspecting API response shapes before mapping them to chart data, use the [JSON Formatter at /tools/json-formatter](/tools/json-formatter) to validate and prettify your data structures before they touch your chart components.

---

## Learning Curve Reality Check

### D3.js — Steep

D3 has a steep learning curve because it is not really a charting library. You are learning a data binding paradigm, a scales system, and SVG fundamentals simultaneously. Plan for 2–4 weeks before you feel productive building custom visualizations from scratch.

The best resource in 2026 is [Observable notebooks](https://observablehq.com) — the interactive environment where D3 examples live. You can fork any notebook and modify it in the browser without local setup.

### Chart.js — Gentle

Chart.js has the lowest barrier to entry. Read the documentation for your chart type, copy the config structure, and customize. Most developers are productive within a day. The configuration object structure is deeply nested and can be hard to remember, but the TypeScript types help considerably.

### Recharts — Low (for React developers)

If you already know React, Recharts feels immediately familiar. You are just composing components. The main learning investment is understanding how `ResponsiveContainer`, scale customization, and the tooltip render prop work. A competent React developer can ship a dashboard with Recharts in an afternoon.

### Nivo — Low-Medium

Nivo's API is declarative and well-documented. The main friction is the data format requirement (Nivo expects specific field names that differ from your raw data) and understanding which props belong to the chart vs the SVG vs the theme. The [Nivo storybook](https://nivo.rocks/) is an excellent interactive reference.

---

## Decision Guide

### Choose D3.js if:

- You need a chart type that does not exist in any library (custom layouts, geographic visualizations, network graphs, force simulations)
- You have specific interaction or animation requirements that libraries cannot accommodate
- Bundle size is critical and you will tree-shake aggressively
- You have a developer with D3 experience on the team

### Choose Chart.js if:

- You need standard chart types (bar, line, pie, radar, scatter) and nothing exotic
- Performance with large datasets (>10,000 points) is important
- You are not using React or your React app has SSR requirements you can work around
- You want the smallest possible bundle for a basic charting use case

### Choose Recharts if:

- You are building a React application and want chart components to feel like the rest of your component tree
- Customization via React component composition is more important than bundle size
- You need accessible, semantic SVG output
- Server-side rendering is a requirement (Recharts SVG renders fine on the server)

### Choose Nivo if:

- Server-side rendering is a first-class requirement (Next.js App Router, Remix, Astro)
- You want polished visuals out of the box with minimal custom CSS
- Accessibility is a priority (Nivo's HTML renderer is particularly accessible)
- You are building a data-heavy dashboard where a consistent visual system matters

### Choose Observable Plot if:

- Bundle size is the primary constraint
- You are familiar with grammar-of-graphics concepts (ggplot2, Vega-Lite)
- You do not need React-native integration
- You want D3's precision without D3's verbosity for standard chart types

---

## Summary

In 2026, **Recharts** is the default choice for React applications that need standard chart types with minimal friction. **Nivo** is the better choice when SSR is a hard requirement or when visual polish matters. **Chart.js** remains the best option for Canvas-based rendering and large dataset performance. **D3.js** is irreplaceable for custom visualizations — nothing else comes close when you need to build something that does not exist yet.

The good news: none of these choices is irreversible. The data layer is always independent of the rendering library. If you start with Chart.js and later need Recharts' React integration, the migration is a UI-layer change, not a data model change.

Pick the library that fits your team's knowledge and your project's constraints today. Optimize later if the evidence demands it.
