import { useState, useMemo } from 'preact/hooks';

type MetricKey = 'lines' | 'functions' | 'branches' | 'statements';

interface Metric {
  key: MetricKey;
  label: string;
  covered: string;
  total: string;
  threshold: string;
}

const DEFAULT_METRICS: Metric[] = [
  { key: 'lines',      label: 'Lines',      covered: '820', total: '1000', threshold: '80' },
  { key: 'functions',  label: 'Functions',  covered: '92',  total: '110',  threshold: '80' },
  { key: 'branches',   label: 'Branches',   covered: '145', total: '200',  threshold: '80' },
  { key: 'statements', label: 'Statements', covered: '870', total: '1050', threshold: '80' },
];

function pct(covered: number, total: number): number | null {
  if (total <= 0 || covered < 0 || covered > total) return null;
  return (covered / total) * 100;
}

function badgeColor(p: number): { bg: string; text: string; label: string } {
  if (p >= 80) return { bg: 'bg-green-500',  text: 'text-white', label: 'brightgreen' };
  if (p >= 50) return { bg: 'bg-yellow-500', text: 'text-black', label: 'yellow'      };
  return          { bg: 'bg-red-500',    text: 'text-white', label: 'red'         };
}

export default function CodeCoverageCalculator() {
  const [metrics, setMetrics] = useState<Metric[]>(DEFAULT_METRICS);
  const [copied, setCopied] = useState(false);

  function updateMetric(key: MetricKey, field: 'covered' | 'total' | 'threshold', value: string) {
    setMetrics(prev => prev.map(m => m.key === key ? { ...m, [field]: value } : m));
  }

  const computed = useMemo(() => {
    return metrics.map(m => {
      const covered = parseFloat(m.covered);
      const total   = parseFloat(m.total);
      const thresh  = parseFloat(m.threshold);
      const p       = pct(covered, total);
      const passes  = p !== null && !isNaN(thresh) ? p >= thresh : null;
      return { ...m, p, passes, thresh };
    });
  }, [metrics]);

  // Weighted average: weight = total count of each metric
  const overall = useMemo(() => {
    let totalItems = 0, totalCovered = 0;
    for (const m of metrics) {
      const c = parseFloat(m.covered);
      const t = parseFloat(m.total);
      if (!isNaN(c) && !isNaN(t) && t > 0 && c >= 0 && c <= t) {
        totalCovered += c;
        totalItems   += t;
      }
    }
    return totalItems > 0 ? (totalCovered / totalItems) * 100 : null;
  }, [metrics]);

  const configSnippet = useMemo(() => {
    const thresholds = metrics.reduce<Record<string, number>>((acc, m) => {
      const t = parseFloat(m.threshold);
      acc[m.key] = isNaN(t) ? 80 : Math.max(0, Math.min(100, t));
      return acc;
    }, {});
    return `// jest.config.js / vitest.config.js
coverageThreshold: {
  global: {
    lines: ${thresholds.lines},
    functions: ${thresholds.functions},
    branches: ${thresholds.branches},
    statements: ${thresholds.statements},
  }
}`;
  }, [metrics]);

  async function copyConfig() {
    try {
      await navigator.clipboard.writeText(configSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = configSnippet;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  const overallBadge = overall !== null ? badgeColor(overall) : null;

  return (
    <div class="space-y-6">

      {/* Coverage Input Table */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Coverage Metrics</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-text-muted border-b border-border">
                <th class="text-left pb-2 pr-3 font-medium">Metric</th>
                <th class="text-left pb-2 pr-3 font-medium">Covered</th>
                <th class="text-left pb-2 pr-3 font-medium">Total</th>
                <th class="text-left pb-2 pr-3 font-medium">Coverage %</th>
                <th class="text-left pb-2 pr-3 font-medium">Threshold %</th>
                <th class="text-left pb-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/50">
              {computed.map((m) => (
                <tr key={m.key} class="group">
                  <td class="py-3 pr-3">
                    <span class="font-medium">{m.label}</span>
                  </td>
                  <td class="py-3 pr-3">
                    <input
                      type="number"
                      min="0"
                      class="w-24 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      value={m.covered}
                      onInput={(e) => updateMetric(m.key, 'covered', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="py-3 pr-3">
                    <input
                      type="number"
                      min="1"
                      class="w-24 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                      value={m.total}
                      onInput={(e) => updateMetric(m.key, 'total', (e.target as HTMLInputElement).value)}
                    />
                  </td>
                  <td class="py-3 pr-3">
                    {m.p !== null ? (
                      <span class={`font-mono font-semibold text-base ${m.passes === true ? 'text-green-400' : m.passes === false ? 'text-red-400' : 'text-text-muted'}`}>
                        {m.p.toFixed(1)}%
                      </span>
                    ) : (
                      <span class="text-text-muted text-xs">—</span>
                    )}
                  </td>
                  <td class="py-3 pr-3">
                    <div class="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        class="w-20 bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                        value={m.threshold}
                        onInput={(e) => updateMetric(m.key, 'threshold', (e.target as HTMLInputElement).value)}
                      />
                      <span class="text-text-muted text-xs">%</span>
                    </div>
                  </td>
                  <td class="py-3">
                    {m.passes === true && (
                      <span class="inline-flex items-center gap-1 text-green-400 font-medium text-sm">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Pass
                      </span>
                    )}
                    {m.passes === false && (
                      <span class="inline-flex items-center gap-1 text-red-400 font-medium text-sm">
                        <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Fail
                      </span>
                    )}
                    {m.passes === null && (
                      <span class="text-text-muted text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Overall Score + Badge Preview */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* Overall Weighted Average */}
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">Overall Coverage</div>
          {overall !== null ? (
            <>
              <div class={`text-5xl font-bold tabular-nums mb-1 ${overall >= 80 ? 'text-green-400' : overall >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                {overall.toFixed(1)}%
              </div>
              <div class="text-xs text-text-muted">Weighted average across all metrics</div>
              {/* Progress bar */}
              <div class="mt-3 h-2 bg-bg rounded-full overflow-hidden">
                <div
                  class={`h-full rounded-full transition-all duration-300 ${overall >= 80 ? 'bg-green-500' : overall >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(100, overall)}%` }}
                />
              </div>
              <div class="flex justify-between text-xs text-text-muted mt-1">
                <span>0%</span>
                <span class="text-yellow-400">50%</span>
                <span class="text-green-400">80%</span>
                <span>100%</span>
              </div>
            </>
          ) : (
            <div class="text-text-muted text-sm">Enter coverage data above</div>
          )}
        </div>

        {/* Badge Preview */}
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="text-xs text-text-muted font-medium uppercase tracking-wider mb-2">Badge Preview</div>
          {overall !== null && overallBadge ? (
            <>
              <div class="flex items-center gap-0 rounded overflow-hidden w-fit mb-3 text-xs font-bold shadow">
                <span class="bg-gray-600 text-white px-2.5 py-1">coverage</span>
                <span class={`${overallBadge.bg} ${overallBadge.text} px-2.5 py-1`}>
                  {overall.toFixed(1)}%
                </span>
              </div>
              <div class="space-y-1.5 text-xs text-text-muted">
                <div class="flex items-center gap-2">
                  <span class="inline-block w-3 h-3 rounded-sm bg-green-500 flex-shrink-0"></span>
                  <span>Green — coverage &ge; 80%</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-block w-3 h-3 rounded-sm bg-yellow-500 flex-shrink-0"></span>
                  <span>Yellow — 50% &le; coverage &lt; 80%</span>
                </div>
                <div class="flex items-center gap-2">
                  <span class="inline-block w-3 h-3 rounded-sm bg-red-500 flex-shrink-0"></span>
                  <span>Red — coverage &lt; 50%</span>
                </div>
              </div>
              <div class="mt-3 text-xs text-text-muted font-mono bg-bg rounded px-2 py-1 break-all">
                https://img.shields.io/badge/coverage-{overall.toFixed(1)}%25-{overallBadge.label}
              </div>
            </>
          ) : (
            <div class="text-text-muted text-sm">Enter coverage data to preview badge</div>
          )}
        </div>
      </div>

      {/* Per-metric progress bars */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Coverage Breakdown</h2>
        <div class="space-y-4">
          {computed.map((m) => (
            <div key={m.key}>
              <div class="flex justify-between items-center mb-1">
                <span class="text-sm font-medium">{m.label}</span>
                <div class="flex items-center gap-2">
                  {m.p !== null && (
                    <span class={`text-sm font-mono font-semibold ${m.passes === true ? 'text-green-400' : m.passes === false ? 'text-red-400' : 'text-text-muted'}`}>
                      {m.p.toFixed(1)}%
                    </span>
                  )}
                  {m.p !== null && !isNaN(m.thresh) && (
                    <span class="text-xs text-text-muted">/ {m.thresh}% threshold</span>
                  )}
                </div>
              </div>
              <div class="h-2.5 bg-bg rounded-full overflow-hidden relative">
                {m.p !== null && (
                  <div
                    class={`h-full rounded-full transition-all duration-300 ${m.passes === true ? 'bg-green-500' : m.passes === false ? 'bg-red-500' : 'bg-blue-500'}`}
                    style={{ width: `${Math.min(100, m.p)}%` }}
                  />
                )}
                {/* Threshold marker */}
                {!isNaN(m.thresh) && m.thresh > 0 && m.thresh <= 100 && (
                  <div
                    class="absolute top-0 bottom-0 w-0.5 bg-white/40"
                    style={{ left: `${m.thresh}%` }}
                    title={`Threshold: ${m.thresh}%`}
                  />
                )}
              </div>
              {m.p !== null && (
                <div class="flex justify-between text-xs text-text-muted mt-0.5">
                  <span>{parseFloat(m.covered).toLocaleString()} covered</span>
                  <span>{parseFloat(m.total).toLocaleString()} total</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Config Snippet */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Jest / Vitest Config Snippet</h2>
          <button
            onClick={copyConfig}
            class={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
              copied
                ? 'bg-green-500/20 border-green-500/40 text-green-400'
                : 'bg-bg border-border text-text-muted hover:text-text hover:border-border/80'
            }`}
          >
            {copied ? (
              <>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy
              </>
            )}
          </button>
        </div>
        <pre class="bg-bg rounded-lg p-4 text-xs font-mono text-green-300 overflow-x-auto leading-relaxed whitespace-pre">{configSnippet}</pre>
        <p class="text-xs text-text-muted mt-2">
          Paste into your <code class="bg-bg px-1 py-0.5 rounded text-xs">jest.config.js</code> or <code class="bg-bg px-1 py-0.5 rounded text-xs">vitest.config.ts</code> to enforce coverage thresholds in CI.
        </p>
      </div>

      {/* Summary pass/fail */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Threshold Summary</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {computed.map((m) => (
            <div
              key={m.key}
              class={`rounded-lg p-3 border text-center ${
                m.passes === true
                  ? 'bg-green-500/10 border-green-500/30'
                  : m.passes === false
                  ? 'bg-red-500/10 border-red-500/30'
                  : 'bg-bg border-border'
              }`}
            >
              <div class="text-xs text-text-muted mb-1">{m.label}</div>
              <div class={`text-xl font-bold tabular-nums ${m.passes === true ? 'text-green-400' : m.passes === false ? 'text-red-400' : 'text-text-muted'}`}>
                {m.p !== null ? `${m.p.toFixed(1)}%` : '—'}
              </div>
              {m.passes === true && (
                <div class="text-green-400 text-xs mt-1 flex items-center justify-center gap-0.5">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Pass
                </div>
              )}
              {m.passes === false && (
                <div class="text-red-400 text-xs mt-1 flex items-center justify-center gap-0.5">
                  <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Fail
                </div>
              )}
              {m.passes === null && <div class="text-text-muted text-xs mt-1">No data</div>}
            </div>
          ))}
        </div>
        {computed.some(m => m.passes !== null) && (
          <div class={`mt-4 rounded-lg p-3 text-sm font-medium flex items-center gap-2 ${
            computed.filter(m => m.passes !== null).every(m => m.passes)
              ? 'bg-green-500/10 text-green-400 border border-green-500/30'
              : 'bg-red-500/10 text-red-400 border border-red-500/30'
          }`}>
            {computed.filter(m => m.passes !== null).every(m => m.passes) ? (
              <>
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                All thresholds passed — your project meets the configured coverage requirements.
              </>
            ) : (
              <>
                <svg class="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {computed.filter(m => m.passes === false).length} metric(s) below threshold — increase test coverage to pass CI checks.
              </>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
