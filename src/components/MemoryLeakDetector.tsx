import { useState } from 'preact/hooks';

interface LeakPattern {
  id: string;
  name: string;
  category: string;
  description: string;
  severity: 'critical' | 'warning' | 'info';
  regex: RegExp[];
  antiPattern?: RegExp[]; // patterns that indicate the fix is in place
  fix: string;
  example: { bad: string; good: string };
}

const PATTERNS: LeakPattern[] = [
  {
    id: 'event-listener-no-remove',
    name: 'Event listener never removed',
    category: 'Event Listeners',
    severity: 'critical',
    description: 'addEventListener without a corresponding removeEventListener. In React, this means not cleaning up in useEffect return.',
    regex: [/addEventListener\s*\(/g],
    antiPattern: [/removeEventListener\s*\(/g],
    fix: 'Always pair addEventListener with removeEventListener, typically in a cleanup function (useEffect return, componentWillUnmount, or AbortController).',
    example: {
      bad: `useEffect(() => {
  window.addEventListener('resize', handler);
  // ❌ No cleanup
}, []);`,
      good: `useEffect(() => {
  window.addEventListener('resize', handler);
  return () => {
    window.removeEventListener('resize', handler); // ✅
  };
}, []);`,
    },
  },
  {
    id: 'setinterval-no-clear',
    name: 'setInterval never cleared',
    category: 'Timers',
    severity: 'critical',
    description: 'setInterval creates a repeating timer that holds references to its callback closure. Must be cleared on cleanup.',
    regex: [/setInterval\s*\(/g],
    antiPattern: [/clearInterval\s*\(/g],
    fix: 'Store the interval ID and call clearInterval in cleanup. In React, return it from useEffect.',
    example: {
      bad: `useEffect(() => {
  setInterval(() => fetch('/api/poll'), 5000);
  // ❌ Timer keeps running after unmount
}, []);`,
      good: `useEffect(() => {
  const id = setInterval(() => fetch('/api/poll'), 5000);
  return () => clearInterval(id); // ✅
}, []);`,
    },
  },
  {
    id: 'settimeout-no-clear',
    name: 'setTimeout not cancelled',
    category: 'Timers',
    severity: 'warning',
    description: 'setTimeout callbacks can fire after component unmount, causing setState on unmounted components.',
    regex: [/setTimeout\s*\(/g],
    antiPattern: [/clearTimeout\s*\(/g],
    fix: 'Store timeout ID and call clearTimeout in cleanup, or use AbortController for async operations.',
    example: {
      bad: `useEffect(() => {
  setTimeout(() => setData('loaded'), 1000);
  // ❌ May setState after unmount
}, []);`,
      good: `useEffect(() => {
  const id = setTimeout(() => setData('loaded'), 1000);
  return () => clearTimeout(id); // ✅
}, []);`,
    },
  },
  {
    id: 'observable-no-unsubscribe',
    name: 'Observable/subscription not unsubscribed',
    category: 'Subscriptions',
    severity: 'critical',
    description: 'RxJS subscriptions, WebSocket listeners, and event emitters hold references until explicitly unsubscribed/closed.',
    regex: [/\.subscribe\s*\(/g, /new WebSocket\s*\(/g],
    antiPattern: [/\.unsubscribe\s*\(/g, /\.close\s*\(\)/g],
    fix: 'Store subscription and call unsubscribe() in cleanup. Use takeUntil with a subject, or async/await with AbortController.',
    example: {
      bad: `ngOnInit() {
  this.service.data$.subscribe(d => this.data = d);
  // ❌ Subscription lives forever
}`,
      good: `private destroy$ = new Subject<void>();

ngOnInit() {
  this.service.data$
    .pipe(takeUntil(this.destroy$))
    .subscribe(d => this.data = d);
}

ngOnDestroy() {
  this.destroy$.next(); // ✅
  this.destroy$.complete();
}`,
    },
  },
  {
    id: 'global-variable-accumulation',
    name: 'Global variable accumulation',
    category: 'Global State',
    severity: 'warning',
    description: 'Variables attached to window or module-level arrays/objects that grow without bounds.',
    regex: [/window\.\w+\s*(?:\[|\.|=)/g, /global\.\w+\s*(?:\[|\.|=)/g],
    fix: 'Avoid storing large objects on window. Use WeakMap/WeakSet for object-keyed caches. Implement LRU caching with size limits.',
    example: {
      bad: `window.cache = window.cache || {};
window.cache[key] = largeObject; // ❌ Grows indefinitely`,
      good: `// Use WeakMap for object-keyed caches
const cache = new WeakMap();
cache.set(keyObject, value); // ✅ GC can collect when key is gone`,
    },
  },
  {
    id: 'closure-over-dom',
    name: 'Closure holding DOM reference',
    category: 'DOM References',
    severity: 'warning',
    description: 'Closures that capture DOM nodes prevent garbage collection even after elements are removed from the DOM.',
    regex: [/document\.getElementById\s*\(/g, /document\.querySelector\s*\(/g, /document\.querySelectorAll\s*\(/g],
    fix: 'Nullify DOM references when no longer needed. Avoid storing DOM nodes in long-lived closures or module-level variables.',
    example: {
      bad: `let ref; // module-level
function init() {
  ref = document.getElementById('btn'); // ❌ Keeps DOM alive
  ref.addEventListener('click', handler);
}`,
      good: `function init() {
  const btn = document.getElementById('btn');
  if (!btn) return;
  btn.addEventListener('click', handler);
  // ✅ btn goes out of scope when init() returns
}`,
    },
  },
  {
    id: 'promise-not-cancelled',
    name: 'Unguarded async state update',
    category: 'Async',
    severity: 'warning',
    description: 'setState/dispatch inside async callbacks without checking if component is still mounted can cause memory leaks and React errors.',
    regex: [/async\s*(?:function|\(|=>)/g],
    antiPattern: [/AbortController\s*\(/g, /isMounted\s*(?:=|&&)/g, /cancelled\s*(?:=|&&)/g],
    fix: 'Use AbortController to cancel fetch, or a mounted flag to guard setState calls. In React Query / SWR, cancellation is built-in.',
    example: {
      bad: `useEffect(() => {
  async function load() {
    const data = await fetch('/api/data');
    setData(data); // ❌ Component may be unmounted
  }
  load();
}, []);`,
      good: `useEffect(() => {
  const controller = new AbortController();
  fetch('/api/data', { signal: controller.signal })
    .then(r => r.json())
    .then(data => setData(data))
    .catch(() => {}); // AbortError ignored
  return () => controller.abort(); // ✅
}, []);`,
    },
  },
  {
    id: 'large-object-in-state',
    name: 'Large objects in component state',
    category: 'State Management',
    severity: 'info',
    description: 'Storing large arrays or deeply nested objects in React state keeps them in memory across renders.',
    regex: [/useState\s*\(\s*(?:\[.*\]|\{.*\})/g],
    fix: 'Use pagination, virtualization (react-virtual), or server-side pagination for large datasets. Normalize state shape.',
    example: {
      bad: `const [data, setData] = useState([]); // thousands of items
// ❌ All items in memory, re-renders on any change`,
      good: `// Use virtualization for large lists
import { useVirtualizer } from '@tanstack/react-virtual';
// ✅ Only renders visible items`,
    },
  },
];

interface DetectionResult {
  pattern: LeakPattern;
  count: number;
  antiCount: number;
  lines: number[];
}

function detectLeaks(code: string): DetectionResult[] {
  if (!code.trim()) return [];
  const lines = code.split('\n');
  const results: DetectionResult[] = [];

  for (const pattern of PATTERNS) {
    let count = 0;
    let antiCount = 0;
    const matchLines: number[] = [];

    pattern.regex.forEach(re => {
      lines.forEach((line, i) => {
        const matches = line.match(new RegExp(re.source, re.flags));
        if (matches) {
          count += matches.length;
          if (!matchLines.includes(i + 1)) matchLines.push(i + 1);
        }
      });
    });

    if (pattern.antiPattern) {
      pattern.antiPattern.forEach(re => {
        const allCode = code.match(new RegExp(re.source, re.flags)) || [];
        antiCount += allCode.length;
      });
    }

    if (count > 0) {
      // Heuristic: if anti-pattern count >= pattern count, likely ok
      const netCount = pattern.antiPattern ? Math.max(0, count - antiCount) : count;
      if (netCount > 0 || !pattern.antiPattern) {
        results.push({ pattern, count, antiCount, lines: matchLines });
      }
    }
  }

  return results;
}

const SEVERITY_CONFIG = {
  critical: { color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'bg-red-500' },
  warning: { color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', badge: 'bg-yellow-500' },
  info: { color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', badge: 'bg-blue-500' },
};

const SAMPLE_CODE = `// Sample React component with multiple memory leak patterns
import { useState, useEffect } from 'react';

function DataComponent({ id }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    // Memory leak: no AbortController
    fetch('/api/data/' + id).then(r => r.json()).then(setData);

    // Memory leak: event listener never removed
    window.addEventListener('resize', () => handleResize());

    // Memory leak: interval never cleared
    setInterval(() => console.log('polling'), 5000);
  }, [id]);

  return <div>{data?.name}</div>;
}`;

export default function MemoryLeakDetector() {
  const [code, setCode] = useState('');
  const [results, setResults] = useState<DetectionResult[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  function analyze() {
    setResults(detectLeaks(code));
  }

  function loadSample() {
    setCode(SAMPLE_CODE);
    setResults(null);
  }

  const criticals = results?.filter(r => r.pattern.severity === 'critical') || [];
  const warnings = results?.filter(r => r.pattern.severity === 'warning') || [];
  const infos = results?.filter(r => r.pattern.severity === 'info') || [];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium">JavaScript / TypeScript Code</label>
          <button onClick={loadSample} class="text-xs text-primary hover:underline">Load sample</button>
        </div>
        <textarea
          value={code}
          onInput={e => { setCode((e.target as HTMLTextAreaElement).value); setResults(null); }}
          rows={12}
          placeholder="Paste your JavaScript or TypeScript code here..."
          class="w-full px-4 py-3 rounded-xl bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary font-mono resize-y"
        />
      </div>

      <button
        onClick={analyze}
        disabled={!code.trim()}
        class="w-full py-3 px-6 rounded-xl bg-primary hover:bg-primary-dark text-white font-bold transition-colors disabled:opacity-50"
      >
        Analyze for Memory Leaks
      </button>

      {/* Results */}
      {results !== null && (
        <div class="space-y-4">
          {/* Summary */}
          <div class={`p-4 rounded-xl border flex items-center gap-4 ${results.length === 0 ? 'bg-green-500/10 border-green-500/30' : criticals.length > 0 ? 'bg-red-500/10 border-red-500/30' : 'bg-yellow-500/10 border-yellow-500/30'}`}>
            <div class={`text-3xl font-bold ${results.length === 0 ? 'text-green-400' : criticals.length > 0 ? 'text-red-400' : 'text-yellow-400'}`}>
              {results.length === 0 ? '✓' : results.length}
            </div>
            <div>
              <p class="text-sm font-medium">
                {results.length === 0 ? 'No obvious memory leak patterns detected' : `${results.length} potential leak pattern(s) found`}
              </p>
              {results.length > 0 && (
                <p class="text-xs text-text-muted">
                  {criticals.length > 0 && `${criticals.length} critical`}
                  {warnings.length > 0 && ` • ${warnings.length} warnings`}
                  {infos.length > 0 && ` • ${infos.length} info`}
                  {' '}— static analysis only; review in context
                </p>
              )}
            </div>
          </div>

          {/* Results list */}
          {results.map(r => {
            const cfg = SEVERITY_CONFIG[r.pattern.severity];
            const isExp = expanded === r.pattern.id;
            return (
              <div key={r.pattern.id} class={`rounded-xl border ${cfg.bg} ${cfg.border}`}>
                <div
                  class="p-4 cursor-pointer"
                  onClick={() => setExpanded(isExp ? null : r.pattern.id)}
                >
                  <div class="flex items-start gap-3">
                    <span class={`shrink-0 text-xs px-2 py-0.5 rounded-full text-white uppercase font-bold ${cfg.badge}`}>
                      {r.pattern.severity}
                    </span>
                    <div class="flex-1">
                      <div class="flex items-center justify-between">
                        <p class="text-sm font-semibold">{r.pattern.name}</p>
                        <span class="text-xs text-text-muted">{isExp ? '▲' : '▼'}</span>
                      </div>
                      <p class="text-xs text-text-muted mt-0.5">
                        {r.pattern.category} • Found {r.count} occurrence(s) on line(s): {r.lines.slice(0, 5).join(', ')}{r.lines.length > 5 ? '...' : ''}
                        {r.antiCount > 0 && ` (${r.antiCount} cleanup found — check manually)`}
                      </p>
                    </div>
                  </div>
                </div>

                {isExp && (
                  <div class="border-t border-border/50 p-4 space-y-4">
                    <p class="text-sm text-text-muted">{r.pattern.description}</p>
                    <div>
                      <p class="text-xs font-semibold mb-1">Fix:</p>
                      <p class="text-sm text-text-muted">{r.pattern.fix}</p>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <p class="text-xs text-red-400 font-semibold mb-1">❌ Problematic</p>
                        <pre class="text-xs font-mono bg-bg border border-border p-3 rounded-lg overflow-x-auto whitespace-pre">{r.pattern.example.bad}</pre>
                      </div>
                      <div>
                        <p class="text-xs text-green-400 font-semibold mb-1">✅ Fixed</p>
                        <pre class="text-xs font-mono bg-bg border border-border p-3 rounded-lg overflow-x-auto whitespace-pre">{r.pattern.example.good}</pre>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {results.length === 0 && (
            <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm text-text-muted">
              <p class="font-medium mb-1">No patterns detected — but also check:</p>
              <ul class="space-y-1 text-xs">
                <li>• Chrome DevTools → Memory tab → take heap snapshots over time</li>
                <li>• Look for detached DOM nodes in heap snapshot retainer graph</li>
                <li>• Check performance tab for increasing JS heap size</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
