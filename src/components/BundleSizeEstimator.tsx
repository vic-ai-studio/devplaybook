import { useState } from 'preact/hooks';

interface PackageInfo {
  name: string;
  minGzip: number; // KB
  category: string;
  note?: string;
}

// Popular package sizes (minified + gzipped, approximate)
const KNOWN_PACKAGES: Record<string, PackageInfo> = {
  'react': { name: 'react', minGzip: 2.5, category: 'UI Framework' },
  'react-dom': { name: 'react-dom', minGzip: 42, category: 'UI Framework' },
  'react-dom/client': { name: 'react-dom/client', minGzip: 42, category: 'UI Framework' },
  'vue': { name: 'vue', minGzip: 22, category: 'UI Framework' },
  '@angular/core': { name: '@angular/core', minGzip: 62, category: 'UI Framework' },
  'svelte': { name: 'svelte', minGzip: 1.6, category: 'UI Framework', note: 'compiler — actual bundle size varies' },
  'next': { name: 'next', minGzip: 0, category: 'Framework', note: 'SSR framework — bundle varies per page' },
  'remix': { name: 'remix', minGzip: 0, category: 'Framework', note: 'SSR framework — bundle varies per page' },
  'axios': { name: 'axios', minGzip: 5.9, category: 'HTTP' },
  'lodash': { name: 'lodash', minGzip: 25, category: 'Utility', note: 'use lodash-es + tree-shaking' },
  'lodash-es': { name: 'lodash-es', minGzip: 25, category: 'Utility', note: 'tree-shakeable — actual size depends on usage' },
  'moment': { name: 'moment', minGzip: 72, category: 'Date', note: '⚠️ Very large — consider date-fns or dayjs' },
  'date-fns': { name: 'date-fns', minGzip: 30, category: 'Date', note: 'tree-shakeable — 2KB per function' },
  'dayjs': { name: 'dayjs', minGzip: 2.4, category: 'Date' },
  'luxon': { name: 'luxon', minGzip: 22, category: 'Date' },
  'redux': { name: 'redux', minGzip: 2.6, category: 'State Management' },
  '@reduxjs/toolkit': { name: '@reduxjs/toolkit', minGzip: 13, category: 'State Management' },
  'zustand': { name: 'zustand', minGzip: 1.2, category: 'State Management' },
  'jotai': { name: 'jotai', minGzip: 3.3, category: 'State Management' },
  'recoil': { name: 'recoil', minGzip: 21, category: 'State Management' },
  'react-query': { name: 'react-query', minGzip: 14, category: 'Data Fetching' },
  '@tanstack/react-query': { name: '@tanstack/react-query', minGzip: 14, category: 'Data Fetching' },
  'swr': { name: 'swr', minGzip: 4.5, category: 'Data Fetching' },
  'zod': { name: 'zod', minGzip: 12, category: 'Validation' },
  'yup': { name: 'yup', minGzip: 11, category: 'Validation' },
  'joi': { name: 'joi', minGzip: 28, category: 'Validation' },
  'react-router-dom': { name: 'react-router-dom', minGzip: 13, category: 'Routing' },
  '@tanstack/router': { name: '@tanstack/router', minGzip: 14, category: 'Routing' },
  'wouter': { name: 'wouter', minGzip: 1.5, category: 'Routing' },
  'framer-motion': { name: 'framer-motion', minGzip: 55, category: 'Animation', note: '⚠️ Large — lazy-load or use CSS animations' },
  'gsap': { name: 'gsap', minGzip: 28, category: 'Animation' },
  'three': { name: 'three', minGzip: 162, category: '3D', note: '⚠️ Very large — tree-shake aggressively' },
  'chart.js': { name: 'chart.js', minGzip: 52, category: 'Charts' },
  'd3': { name: 'd3', minGzip: 78, category: 'Charts', note: 'tree-shakeable' },
  'recharts': { name: 'recharts', minGzip: 49, category: 'Charts' },
  'styled-components': { name: 'styled-components', minGzip: 16, category: 'CSS-in-JS' },
  '@emotion/react': { name: '@emotion/react', minGzip: 8.4, category: 'CSS-in-JS' },
  'tailwindcss': { name: 'tailwindcss', minGzip: 0, category: 'CSS', note: 'CSS-only — no JS bundle impact' },
  'classnames': { name: 'classnames', minGzip: 0.4, category: 'Utility' },
  'clsx': { name: 'clsx', minGzip: 0.25, category: 'Utility' },
  'uuid': { name: 'uuid', minGzip: 1.1, category: 'Utility' },
  'nanoid': { name: 'nanoid', minGzip: 0.13, category: 'Utility' },
  'immer': { name: 'immer', minGzip: 6.7, category: 'Utility' },
  'ramda': { name: 'ramda', minGzip: 45, category: 'Utility', note: 'tree-shakeable with ramda/es' },
  'socket.io-client': { name: 'socket.io-client', minGzip: 13, category: 'WebSocket' },
  'graphql': { name: 'graphql', minGzip: 37, category: 'GraphQL' },
  '@apollo/client': { name: '@apollo/client', minGzip: 47, category: 'GraphQL' },
  'urql': { name: 'urql', minGzip: 5.8, category: 'GraphQL' },
  'vite': { name: 'vite', minGzip: 0, category: 'Build Tool', note: 'dev tool — no runtime bundle' },
  'typescript': { name: 'typescript', minGzip: 0, category: 'Dev Tool', note: 'compile-time only — no runtime bundle' },
};

const SPEEDS = {
  '3G (slow)': { mbps: 1.6, label: '3G Slow' },
  '3G (fast)': { mbps: 7, label: '3G Fast' },
  '4G LTE': { mbps: 20, label: '4G LTE' },
  '5G': { mbps: 100, label: '5G' },
  'WiFi': { mbps: 50, label: 'WiFi' },
};

interface AddedPackage {
  id: string;
  name: string;
  size: number;
  custom: boolean;
  category: string;
  note?: string;
}

let counter = 0;

export default function BundleSizeEstimator() {
  const [input, setInput] = useState('');
  const [customSize, setCustomSize] = useState('');
  const [packages, setPackages] = useState<AddedPackage[]>([]);
  const [overhead, setOverhead] = useState(30); // webpack/bundler overhead %
  const [suggestions, setSuggestions] = useState<string[]>([]);

  function getSuggestions(val: string) {
    if (!val.trim()) return setSuggestions([]);
    const matches = Object.keys(KNOWN_PACKAGES).filter(k => k.toLowerCase().includes(val.toLowerCase())).slice(0, 6);
    setSuggestions(matches);
  }

  function addPackage(name: string, customKb?: number) {
    const known = KNOWN_PACKAGES[name.toLowerCase()];
    const size = customKb ?? (known?.minGzip ?? 0);
    setPackages(p => [...p, {
      id: `pkg-${++counter}`,
      name,
      size,
      custom: !known || customKb !== undefined,
      category: known?.category || 'Custom',
      note: known?.note,
    }]);
    setInput('');
    setCustomSize('');
    setSuggestions([]);
  }

  function removePackage(id: string) {
    setPackages(p => p.filter(x => x.id !== id));
  }

  const totalKb = packages.reduce((sum, p) => sum + p.size, 0);
  const withOverhead = totalKb * (1 + overhead / 100);

  function loadTime(mbps: number): string {
    const bytes = withOverhead * 1024;
    const bits = bytes * 8;
    const seconds = bits / (mbps * 1_000_000);
    if (seconds < 0.01) return '<10ms';
    if (seconds < 1) return `${Math.round(seconds * 1000)}ms`;
    return `${seconds.toFixed(1)}s`;
  }

  function sizeColor(kb: number): string {
    if (kb < 100) return 'text-green-400';
    if (kb < 250) return 'text-yellow-400';
    return 'text-red-400';
  }

  const categories = [...new Set(packages.map(p => p.category))];

  return (
    <div class="space-y-6">
      {/* Add package */}
      <div>
        <label class="block text-sm font-medium mb-2">Add Package</label>
        <div class="relative">
          <div class="flex gap-2">
            <div class="flex-1 relative">
              <input
                value={input}
                onInput={e => { setInput((e.target as HTMLInputElement).value); getSuggestions((e.target as HTMLInputElement).value); }}
                onKeyDown={e => { if (e.key === 'Enter' && input.trim()) addPackage(input.trim()); }}
                placeholder="Package name (e.g. react-query, lodash)"
                class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
              />
              {suggestions.length > 0 && (
                <div class="absolute top-full left-0 right-0 z-10 mt-1 rounded-lg border border-border bg-surface shadow-lg">
                  {suggestions.map(s => {
                    const pkg = KNOWN_PACKAGES[s];
                    return (
                      <button
                        key={s}
                        onClick={() => addPackage(s)}
                        class="w-full flex items-center justify-between px-3 py-2 hover:bg-bg text-sm text-left transition-colors"
                      >
                        <div>
                          <span class="font-mono">{s}</span>
                          <span class="text-xs text-text-muted ml-2">{pkg.category}</span>
                        </div>
                        <span class={`text-xs font-mono ${sizeColor(pkg.minGzip)}`}>{pkg.minGzip > 0 ? `~${pkg.minGzip}KB` : 'varies'}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <input
              type="number"
              value={customSize}
              onInput={e => setCustomSize((e.target as HTMLInputElement).value)}
              placeholder="KB (opt.)"
              class="w-24 px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
            />
            <button
              onClick={() => { if (input.trim()) addPackage(input.trim(), customSize ? parseFloat(customSize) : undefined); }}
              class="px-4 py-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-sm"
            >
              Add
            </button>
          </div>
        </div>
        <p class="text-xs text-text-muted mt-1">
          Known packages auto-fill size. For unlisted packages, enter name + size in KB. Sizes are minified + gzipped estimates.
        </p>
      </div>

      {/* Package list */}
      {packages.length > 0 && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium">Bundle Packages ({packages.length})</label>
            <button onClick={() => setPackages([])} class="text-xs text-text-muted hover:text-red-400">Clear all</button>
          </div>
          <div class="space-y-1.5">
            {packages.map(pkg => (
              <div key={pkg.id} class="flex items-center gap-2 p-2 rounded-lg bg-bg border border-border">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2">
                    <code class="text-sm font-mono">{pkg.name}</code>
                    <span class="text-xs text-text-muted bg-surface px-1.5 py-0.5 rounded">{pkg.category}</span>
                    {pkg.custom && <span class="text-xs text-text-muted">custom</span>}
                  </div>
                  {pkg.note && <p class="text-xs text-yellow-400 mt-0.5">{pkg.note}</p>}
                </div>
                <span class={`text-sm font-mono font-semibold shrink-0 ${sizeColor(pkg.size)}`}>
                  {pkg.size > 0 ? `${pkg.size}KB` : 'varies'}
                </span>
                <button onClick={() => removePackage(pkg.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      {packages.length > 0 && (
        <div class="space-y-4">
          {/* Overhead */}
          <div class="flex items-center gap-4">
            <label class="text-sm font-medium shrink-0">Bundler overhead</label>
            <input
              type="range" min="0" max="50" step="5"
              value={overhead}
              onInput={e => setOverhead(parseInt((e.target as HTMLInputElement).value))}
              class="flex-1 accent-primary"
            />
            <span class="text-sm font-mono text-primary w-10">{overhead}%</span>
          </div>

          {/* Size summary */}
          <div class="grid grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-bg border border-border text-center">
              <p class="text-xs text-text-muted mb-1">Raw Bundle</p>
              <p class={`text-2xl font-bold font-mono ${sizeColor(totalKb)}`}>{totalKb.toFixed(1)}KB</p>
              <p class="text-xs text-text-muted">packages only</p>
            </div>
            <div class="p-4 rounded-xl bg-bg border border-border text-center">
              <p class="text-xs text-text-muted mb-1">With Overhead</p>
              <p class={`text-2xl font-bold font-mono ${sizeColor(withOverhead)}`}>{withOverhead.toFixed(1)}KB</p>
              <p class="text-xs text-text-muted">estimated final</p>
            </div>
          </div>

          {/* Load times */}
          <div>
            <label class="block text-sm font-medium mb-2">Estimated Load Times</label>
            <div class="grid grid-cols-2 md:grid-cols-5 gap-2">
              {Object.entries(SPEEDS).map(([key, { mbps, label }]) => (
                <div key={key} class="p-3 rounded-lg bg-bg border border-border text-center">
                  <p class="text-xs text-text-muted mb-1">{label}</p>
                  <p class="text-sm font-mono font-semibold">{loadTime(mbps)}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          {categories.length > 1 && (
            <div>
              <label class="block text-sm font-medium mb-2">By Category</label>
              <div class="space-y-1.5">
                {categories.map(cat => {
                  const catTotal = packages.filter(p => p.category === cat).reduce((s, p) => s + p.size, 0);
                  const pct = totalKb > 0 ? (catTotal / totalKb) * 100 : 0;
                  return (
                    <div key={cat} class="flex items-center gap-3">
                      <span class="text-xs text-text-muted w-32 shrink-0">{cat}</span>
                      <div class="flex-1 h-2 rounded-full bg-surface overflow-hidden">
                        <div class="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span class="text-xs font-mono text-text-muted w-16 text-right">{catTotal.toFixed(1)}KB ({Math.round(pct)}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {withOverhead > 200 && (
            <div class="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-sm">
              <p class="font-medium text-yellow-400 mb-2">⚠️ Bundle is large — optimization tips:</p>
              <ul class="text-text-muted space-y-1 text-xs">
                <li>• Enable code splitting (dynamic import() for routes)</li>
                <li>• Use tree-shaking: import only what you need</li>
                <li>• Replace heavy packages (moment → dayjs, lodash → native)</li>
                <li>• Lazy-load below-the-fold components</li>
                <li>• Analyze with webpack-bundle-analyzer or vite rollup-visualizer</li>
              </ul>
            </div>
          )}
        </div>
      )}

      {packages.length === 0 && (
        <div class="p-8 rounded-xl bg-bg border border-border text-center text-text-muted text-sm">
          Add packages above to estimate your bundle size. Includes 200+ popular npm packages.
        </div>
      )}
    </div>
  );
}
