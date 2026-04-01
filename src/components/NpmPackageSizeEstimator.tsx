import { useState } from 'preact/hooks';

interface PackageInfo {
  name: string;
  minGzip: number; // KB
  category: string;
  alternatives?: { name: string; minGzip: number }[];
  note?: string;
}

const PACKAGE_DB: PackageInfo[] = [
  // UI Frameworks
  { name: 'react', minGzip: 6.4, category: 'UI Framework' },
  { name: 'react-dom', minGzip: 42.2, category: 'UI Framework' },
  { name: 'vue', minGzip: 22.5, category: 'UI Framework', note: 'Vue 3 composition API' },
  { name: '@angular/core', minGzip: 62.0, category: 'UI Framework' },
  { name: 'svelte', minGzip: 1.6, category: 'UI Framework', note: 'Compiler-based, near zero runtime' },
  { name: 'preact', minGzip: 3.5, category: 'UI Framework', alternatives: [{ name: 'react+react-dom', minGzip: 48.6 }] },
  { name: 'solid-js', minGzip: 6.4, category: 'UI Framework' },
  { name: 'lit', minGzip: 15.0, category: 'UI Framework' },
  // Component libs
  { name: '@mui/material', minGzip: 93.5, category: 'Component Library', alternatives: [{ name: 'shadcn/ui (0KB)', minGzip: 0 }] },
  { name: 'antd', minGzip: 185.0, category: 'Component Library' },
  { name: 'react-bootstrap', minGzip: 20.3, category: 'Component Library' },
  { name: '@radix-ui/react-dialog', minGzip: 3.8, category: 'Component Library' },
  // State
  { name: 'redux', minGzip: 2.6, category: 'State Management' },
  { name: 'react-redux', minGzip: 4.9, category: 'State Management' },
  { name: '@reduxjs/toolkit', minGzip: 13.9, category: 'State Management', alternatives: [{ name: 'zustand', minGzip: 1.2 }, { name: 'jotai', minGzip: 3.1 }] },
  { name: 'zustand', minGzip: 1.2, category: 'State Management' },
  { name: 'mobx', minGzip: 16.4, category: 'State Management' },
  { name: 'jotai', minGzip: 3.1, category: 'State Management' },
  { name: 'recoil', minGzip: 21.1, category: 'State Management' },
  { name: 'valtio', minGzip: 3.9, category: 'State Management' },
  // HTTP
  { name: 'axios', minGzip: 11.6, category: 'HTTP', alternatives: [{ name: 'ky', minGzip: 4.0 }, { name: 'fetch (native)', minGzip: 0 }] },
  { name: 'ky', minGzip: 4.0, category: 'HTTP' },
  { name: 'got', minGzip: 31.0, category: 'HTTP', note: 'Node.js only' },
  { name: 'node-fetch', minGzip: 5.6, category: 'HTTP', note: 'Node.js only' },
  // Routing
  { name: 'react-router-dom', minGzip: 13.5, category: 'Routing' },
  { name: '@tanstack/react-router', minGzip: 21.8, category: 'Routing' },
  { name: 'wouter', minGzip: 2.1, category: 'Routing', alternatives: [{ name: 'react-router-dom', minGzip: 13.5 }] },
  // Date
  { name: 'moment', minGzip: 72.1, category: 'Date', alternatives: [{ name: 'date-fns', minGzip: 5.4 }, { name: 'dayjs', minGzip: 2.6 }] },
  { name: 'date-fns', minGzip: 5.4, category: 'Date', note: 'Tree-shakeable' },
  { name: 'dayjs', minGzip: 2.6, category: 'Date' },
  { name: 'luxon', minGzip: 23.6, category: 'Date' },
  { name: 'temporal-polyfill', minGzip: 18.0, category: 'Date' },
  // Validation
  { name: 'zod', minGzip: 12.8, category: 'Validation' },
  { name: 'yup', minGzip: 18.4, category: 'Validation', alternatives: [{ name: 'zod', minGzip: 12.8 }] },
  { name: 'joi', minGzip: 24.6, category: 'Validation' },
  { name: 'valibot', minGzip: 1.2, category: 'Validation', alternatives: [{ name: 'zod', minGzip: 12.8 }] },
  // Animation
  { name: 'framer-motion', minGzip: 47.6, category: 'Animation', alternatives: [{ name: 'motion/react (subset)', minGzip: 18.0 }] },
  { name: 'gsap', minGzip: 27.0, category: 'Animation' },
  { name: '@react-spring/web', minGzip: 26.7, category: 'Animation' },
  // Query / data
  { name: '@tanstack/react-query', minGzip: 16.4, category: 'Data Fetching' },
  { name: 'swr', minGzip: 4.4, category: 'Data Fetching' },
  { name: 'apollo-client', minGzip: 34.8, category: 'Data Fetching' },
  // Forms
  { name: 'react-hook-form', minGzip: 8.6, category: 'Forms' },
  { name: 'formik', minGzip: 15.1, category: 'Forms', alternatives: [{ name: 'react-hook-form', minGzip: 8.6 }] },
  // Utilities
  { name: 'lodash', minGzip: 24.5, category: 'Utilities', alternatives: [{ name: 'lodash-es (tree-shake)', minGzip: 3.0 }, { name: 'radash', minGzip: 4.2 }] },
  { name: 'lodash-es', minGzip: 24.5, category: 'Utilities', note: 'Same size but tree-shakeable' },
  { name: 'ramda', minGzip: 13.0, category: 'Utilities' },
  { name: 'immer', minGzip: 5.5, category: 'Utilities' },
  { name: 'uuid', minGzip: 1.0, category: 'Utilities' },
  { name: 'nanoid', minGzip: 0.4, category: 'Utilities' },
  { name: 'clsx', minGzip: 0.3, category: 'Utilities' },
  // Styling
  { name: 'styled-components', minGzip: 15.9, category: 'Styling' },
  { name: '@emotion/react', minGzip: 11.3, category: 'Styling' },
  { name: 'classnames', minGzip: 0.3, category: 'Styling' },
  // i18n
  { name: 'i18next', minGzip: 15.6, category: 'i18n' },
  { name: 'react-i18next', minGzip: 8.0, category: 'i18n' },
  // Charts
  { name: 'recharts', minGzip: 48.5, category: 'Charts' },
  { name: 'd3', minGzip: 73.6, category: 'Charts', alternatives: [{ name: 'd3 (subset)', minGzip: 10.0 }] },
  { name: 'chart.js', minGzip: 62.0, category: 'Charts' },
  { name: 'victory', minGzip: 64.0, category: 'Charts' },
];

function parsePackageInput(raw: string): string[] {
  return raw
    .split(/[\n,]+/)
    .map(s => s.trim().replace(/^["']|["']$/g, '').replace(/@[\d^~].+$/, '').trim())
    .filter(Boolean);
}

export default function NpmPackageSizeEstimator() {
  const [input, setInput] = useState('react\nreact-dom\naxios\n@tanstack/react-query\nzod');
  const [showAll, setShowAll] = useState(false);

  const packageNames = parsePackageInput(input);
  const results = packageNames.map(name => {
    const found = PACKAGE_DB.find(p => p.name === name);
    return { name, info: found || null };
  });

  const knownResults = results.filter(r => r.info);
  const unknownResults = results.filter(r => !r.info);
  const totalKB = knownResults.reduce((sum, r) => sum + (r.info?.minGzip || 0), 0);

  const budgetColor = totalKB < 50 ? 'text-green-400' : totalKB < 100 ? 'text-yellow-400' : 'text-red-400';
  const budgetBg = totalKB < 50 ? 'bg-green-500/10 border-green-500/30' : totalKB < 100 ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';
  const budgetLabel = totalKB < 50 ? 'Excellent — under 50 KB' : totalKB < 100 ? 'Acceptable — under 100 KB' : 'Heavy — consider alternatives';
  const budgetPercent = Math.min(100, (totalKB / 150) * 100);

  const categoryGroups = knownResults.reduce((acc, r) => {
    const cat = r.info!.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(r);
    return acc;
  }, {} as Record<string, typeof knownResults>);

  const dbFiltered = showAll ? PACKAGE_DB : PACKAGE_DB.slice(0, 20);

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Input */}
        <div class="space-y-2">
          <label class="block text-sm text-text-muted">Enter package names (one per line or comma-separated):</label>
          <textarea
            rows={8}
            value={input}
            onInput={(e: Event) => setInput((e.target as HTMLTextAreaElement).value)}
            placeholder="react&#10;axios&#10;lodash&#10;moment"
            class="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm font-mono text-text focus:outline-none focus:border-primary resize-none"
            spellcheck={false}
          />
          <p class="text-xs text-text-muted">Sizes are minified + gzipped. {PACKAGE_DB.length} packages in database.</p>
        </div>

        {/* Budget */}
        <div class="space-y-3">
          <div class={`border rounded-lg p-4 ${budgetBg}`}>
            <div class="flex items-end justify-between mb-2">
              <span class="text-sm text-text-muted">Total bundle size</span>
              <span class={`text-2xl font-bold font-mono ${budgetColor}`}>{totalKB.toFixed(1)} KB</span>
            </div>
            <div class="w-full bg-bg rounded-full h-2 mb-2">
              <div
                class={`h-2 rounded-full transition-all ${totalKB < 50 ? 'bg-green-500' : totalKB < 100 ? 'bg-yellow-500' : 'bg-red-500'}`}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
            <p class={`text-sm font-medium ${budgetColor}`}>{budgetLabel}</p>
          </div>

          {/* Category breakdown */}
          {Object.entries(categoryGroups).length > 0 && (
            <div class="bg-surface border border-border rounded-lg p-3 space-y-2">
              <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">By category</p>
              {Object.entries(categoryGroups).map(([cat, items]) => {
                const catTotal = items.reduce((s, r) => s + (r.info?.minGzip || 0), 0);
                return (
                  <div key={cat} class="flex justify-between text-sm">
                    <span class="text-text-muted">{cat}</span>
                    <span class="font-mono text-text">{catTotal.toFixed(1)} KB</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      {knownResults.length > 0 && (
        <div class="space-y-2">
          <p class="text-sm font-semibold text-text">Package breakdown</p>
          <div class="space-y-2">
            {knownResults.map(({ name, info }) => (
              <div key={name} class="bg-surface border border-border rounded-lg p-3">
                <div class="flex items-center gap-3 flex-wrap">
                  <span class="font-mono text-sm font-semibold text-text flex-1">{name}</span>
                  <span class="text-xs bg-bg px-2 py-0.5 rounded text-text-muted">{info!.category}</span>
                  <span class={`font-mono text-sm font-bold ${info!.minGzip < 5 ? 'text-green-400' : info!.minGzip < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {info!.minGzip} KB
                  </span>
                </div>
                {info!.note && <p class="text-xs text-text-muted mt-1">{info!.note}</p>}
                {info!.alternatives && info!.alternatives.length > 0 && (
                  <div class="mt-2 flex items-center gap-2 flex-wrap">
                    <span class="text-xs text-text-muted">Lighter alternatives:</span>
                    {info!.alternatives.map(alt => (
                      <span key={alt.name} class="text-xs bg-green-500/10 border border-green-500/20 text-green-400 px-2 py-0.5 rounded font-mono">
                        {alt.name} ({alt.minGzip} KB)
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {unknownResults.length > 0 && (
        <div class="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
          <p class="text-xs text-yellow-400 font-semibold mb-1">Not in database:</p>
          <p class="text-xs text-text-muted">{unknownResults.map(r => r.name).join(', ')} — check bundlephobia.com for accurate sizes</p>
        </div>
      )}

      {/* Browse DB */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold text-text">Package database</p>
          <button onClick={() => setShowAll(!showAll)} class="text-xs text-primary hover:underline">
            {showAll ? 'Show less' : `Show all ${PACKAGE_DB.length}`}
          </button>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-2">
          {dbFiltered.map(pkg => (
            <button
              key={pkg.name}
              onClick={() => {
                const names = parsePackageInput(input);
                if (!names.includes(pkg.name)) {
                  setInput(prev => prev.trim() + '\n' + pkg.name);
                }
              }}
              class="text-left bg-surface border border-border rounded px-3 py-2 hover:border-primary/50 transition-colors"
            >
              <div class="flex justify-between items-center">
                <span class="font-mono text-xs text-text truncate mr-2">{pkg.name}</span>
                <span class={`text-xs font-mono font-semibold shrink-0 ${pkg.minGzip < 5 ? 'text-green-400' : pkg.minGzip < 20 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {pkg.minGzip}KB
                </span>
              </div>
              <p class="text-xs text-text-muted mt-0.5">{pkg.category}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
