import { useState, useMemo } from 'preact/hooks';

interface BudgetItem {
  id: string;
  name: string;
  category: 'js' | 'css' | 'images' | 'fonts' | 'other';
  budget: number; // KB
  actual: number; // KB
}

interface CWVTarget {
  lcp: number;   // ms
  fid: number;   // ms
  cls: number;   // ratio
  fcp: number;   // ms
  ttfb: number;  // ms
}

const DEFAULT_BUDGETS: BudgetItem[] = [
  { id: '1', name: 'JavaScript (total)', category: 'js', budget: 200, actual: 0 },
  { id: '2', name: 'CSS (total)', category: 'css', budget: 50, actual: 0 },
  { id: '3', name: 'Images (per page)', category: 'images', budget: 400, actual: 0 },
  { id: '4', name: 'Web Fonts', category: 'fonts', budget: 75, actual: 0 },
  { id: '5', name: 'Third-party scripts', category: 'other', budget: 50, actual: 0 },
];

const CWV_PRESETS = {
  good: { lcp: 2500, fid: 100, cls: 0.1, fcp: 1800, ttfb: 800 },
  moderate: { lcp: 4000, fid: 300, cls: 0.25, fcp: 3000, ttfb: 1800 },
  custom: { lcp: 2500, fid: 100, cls: 0.1, fcp: 1800, ttfb: 800 },
};

const CATEGORY_COLORS: Record<string, string> = {
  js: 'bg-yellow-500',
  css: 'bg-blue-500',
  images: 'bg-green-500',
  fonts: 'bg-purple-500',
  other: 'bg-orange-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  js: 'JavaScript',
  css: 'CSS',
  images: 'Images',
  fonts: 'Fonts',
  other: 'Other',
};

type PresetKey = 'good' | 'moderate' | 'custom';

export default function PerformanceBudgetCalculator() {
  const [budgets, setBudgets] = useState<BudgetItem[]>(DEFAULT_BUDGETS);
  const [cwvPreset, setCwvPreset] = useState<PresetKey>('good');
  const [cwv, setCwv] = useState<CWVTarget>(CWV_PRESETS.good);
  const [connectionSpeed, setConnectionSpeed] = useState<'3g' | '4g' | 'cable'>('4g');

  const CONNECTION_SPEEDS = {
    '3g': { label: '3G (1.5 Mbps)', kbps: 1500 },
    '4g': { label: '4G (25 Mbps)', kbps: 25000 },
    'cable': { label: 'Cable (50 Mbps)', kbps: 50000 },
  };

  const totalBudgetKB = useMemo(() => budgets.reduce((s, b) => s + b.budget, 0), [budgets]);
  const totalActualKB = useMemo(() => budgets.reduce((s, b) => s + b.actual, 0), [budgets]);

  const loadTimeMs = useMemo(() => {
    const speed = CONNECTION_SPEEDS[connectionSpeed];
    return Math.round((totalActualKB * 8) / speed.kbps * 1000);
  }, [totalActualKB, connectionSpeed]);

  const budgetLoadTimeMs = useMemo(() => {
    const speed = CONNECTION_SPEEDS[connectionSpeed];
    return Math.round((totalBudgetKB * 8) / speed.kbps * 1000);
  }, [totalBudgetKB, connectionSpeed]);

  function updateBudget(id: string, field: 'budget' | 'actual', value: number) {
    setBudgets(bs => bs.map(b => b.id === id ? { ...b, [field]: Math.max(0, value) } : b));
  }

  function addRow() {
    setBudgets(bs => [...bs, {
      id: Date.now().toString(),
      name: 'New Resource',
      category: 'other',
      budget: 50,
      actual: 0,
    }]);
  }

  function removeRow(id: string) {
    setBudgets(bs => bs.filter(b => b.id !== id));
  }

  function updateName(id: string, name: string) {
    setBudgets(bs => bs.map(b => b.id === id ? { ...b, name } : b));
  }

  function updateCategory(id: string, category: BudgetItem['category']) {
    setBudgets(bs => bs.map(b => b.id === id ? { ...b, category } : b));
  }

  function applyPreset(preset: PresetKey) {
    setCwvPreset(preset);
    if (preset !== 'custom') setCwv(CWV_PRESETS[preset]);
  }

  function cwvStatus(metric: keyof CWVTarget, value: number): 'pass' | 'warn' | 'fail' {
    const good = CWV_PRESETS.good;
    const mod = CWV_PRESETS.moderate;
    if (metric === 'cls') {
      if (value <= good.cls) return 'pass';
      if (value <= mod.cls) return 'warn';
      return 'fail';
    }
    const goodVal = good[metric], modVal = mod[metric];
    if (value <= goodVal) return 'pass';
    if (value <= modVal) return 'warn';
    return 'fail';
  }

  const statusColor = { pass: 'text-green-400', warn: 'text-yellow-400', fail: 'text-red-400' };
  const statusLabel = { pass: 'Good', warn: 'Needs Improvement', fail: 'Poor' };
  const statusBg = { pass: 'bg-green-500/10 border-green-500/30', warn: 'bg-yellow-500/10 border-yellow-500/30', fail: 'bg-red-500/10 border-red-500/30' };

  const overBudgetItems = budgets.filter(b => b.actual > b.budget && b.actual > 0);
  const totalStatus = totalActualKB <= totalBudgetKB ? 'pass' : totalActualKB <= totalBudgetKB * 1.2 ? 'warn' : 'fail';

  return (
    <div class="space-y-6">
      {/* Resource Budget Table */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold">Resource Size Budgets</h2>
            <p class="text-xs text-text-muted mt-0.5">Set budgets per resource type and enter actual sizes to get a pass/fail report.</p>
          </div>
          <select
            value={connectionSpeed}
            onChange={(e) => setConnectionSpeed((e.target as HTMLSelectElement).value as typeof connectionSpeed)}
            class="text-sm bg-bg border border-border rounded-lg px-3 py-1.5"
          >
            {Object.entries(CONNECTION_SPEEDS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-text-muted border-b border-border">
                <th class="text-left pb-2 font-medium w-1/3">Resource</th>
                <th class="text-left pb-2 font-medium">Category</th>
                <th class="text-right pb-2 font-medium">Budget (KB)</th>
                <th class="text-right pb-2 font-medium">Actual (KB)</th>
                <th class="text-center pb-2 font-medium">Status</th>
                <th class="pb-2 w-8"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {budgets.map(b => {
                const pct = b.budget > 0 ? (b.actual / b.budget) * 100 : 0;
                const status = b.actual === 0 ? 'na' : b.actual <= b.budget ? 'pass' : b.actual <= b.budget * 1.2 ? 'warn' : 'fail';
                return (
                  <tr key={b.id}>
                    <td class="py-2 pr-2">
                      <input
                        class="bg-transparent border-b border-transparent hover:border-border focus:border-primary text-sm w-full focus:outline-none"
                        value={b.name}
                        onInput={(e) => updateName(b.id, (e.target as HTMLInputElement).value)}
                      />
                    </td>
                    <td class="py-2 pr-2">
                      <select
                        value={b.category}
                        onChange={(e) => updateCategory(b.id, (e.target as HTMLSelectElement).value as BudgetItem['category'])}
                        class="text-xs bg-bg border border-border rounded px-2 py-1"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                    </td>
                    <td class="py-2 pr-2">
                      <input
                        type="number" min="0"
                        class="bg-bg border border-border rounded px-2 py-1 text-sm text-right w-20 focus:ring-1 focus:ring-primary"
                        value={b.budget}
                        onInput={(e) => updateBudget(b.id, 'budget', parseInt((e.target as HTMLInputElement).value) || 0)}
                      />
                    </td>
                    <td class="py-2 pr-2">
                      <input
                        type="number" min="0"
                        class="bg-bg border border-border rounded px-2 py-1 text-sm text-right w-20 focus:ring-1 focus:ring-primary"
                        value={b.actual}
                        onInput={(e) => updateBudget(b.id, 'actual', parseInt((e.target as HTMLInputElement).value) || 0)}
                        placeholder="0"
                      />
                    </td>
                    <td class="py-2 text-center">
                      {status === 'na' ? (
                        <span class="text-xs text-text-muted">—</span>
                      ) : (
                        <span class={`text-xs font-medium ${status === 'pass' ? 'text-green-400' : status === 'warn' ? 'text-yellow-400' : 'text-red-400'}`}>
                          {status === 'pass' ? '✓ Pass' : status === 'warn' ? '⚠ +20%' : '✗ Fail'}
                        </span>
                      )}
                    </td>
                    <td class="py-2 pl-1">
                      <button onClick={() => removeRow(b.id)} class="text-text-muted hover:text-red-400 text-xs">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <button onClick={addRow} class="mt-3 text-xs text-primary hover:underline">+ Add row</button>

        {/* Summary */}
        <div class={`mt-4 p-4 rounded-lg border ${statusBg[totalStatus]}`}>
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div class="text-xs text-text-muted">Total Page Weight</div>
              <div class="text-xl font-bold">
                <span class={statusColor[totalStatus]}>{totalActualKB > 0 ? totalActualKB.toLocaleString() : '—'}</span>
                {totalActualKB > 0 && <span class="text-sm text-text-muted font-normal"> / {totalBudgetKB.toLocaleString()} KB budget</span>}
              </div>
            </div>
            {totalActualKB > 0 && (
              <>
                <div class="text-center">
                  <div class="text-xs text-text-muted">Est. Load Time ({CONNECTION_SPEEDS[connectionSpeed].label})</div>
                  <div class={`text-xl font-bold ${statusColor[totalStatus]}`}>{loadTimeMs < 1000 ? loadTimeMs + 'ms' : (loadTimeMs / 1000).toFixed(1) + 's'}</div>
                  <div class="text-xs text-text-muted">Budget: {budgetLoadTimeMs < 1000 ? budgetLoadTimeMs + 'ms' : (budgetLoadTimeMs / 1000).toFixed(1) + 's'}</div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-text-muted">Budget Status</div>
                  <div class={`text-xl font-bold ${statusColor[totalStatus]}`}>{statusLabel[totalStatus]}</div>
                </div>
              </>
            )}
          </div>
          {overBudgetItems.length > 0 && (
            <div class="mt-3 text-xs space-y-1">
              {overBudgetItems.map(b => (
                <div key={b.id} class="text-red-400">
                  ✗ {b.name}: {b.actual} KB (budget: {b.budget} KB, over by {b.actual - b.budget} KB)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Core Web Vitals Targets */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h2 class="text-base font-semibold">Core Web Vitals Targets</h2>
            <p class="text-xs text-text-muted mt-0.5">Check your CWV targets against Google's thresholds.</p>
          </div>
          <div class="flex gap-2">
            {(['good', 'moderate', 'custom'] as PresetKey[]).map(p => (
              <button
                key={p}
                onClick={() => applyPreset(p)}
                class={`text-xs px-3 py-1.5 rounded-lg border transition-colors capitalize ${
                  cwvPreset === p ? 'bg-primary text-white border-primary' : 'bg-bg border-border hover:border-primary text-text-muted'
                }`}
              >
                {p === 'good' ? 'Google Good' : p === 'moderate' ? 'Moderate' : 'Custom'}
              </button>
            ))}
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {([
            { key: 'lcp' as const, label: 'LCP', unit: 'ms', desc: 'Largest Contentful Paint', good: '≤ 2500ms', bad: '> 4000ms' },
            { key: 'fid' as const, label: 'FID / INP', unit: 'ms', desc: 'First Input Delay', good: '≤ 100ms', bad: '> 300ms' },
            { key: 'cls' as const, label: 'CLS', unit: '', desc: 'Cumulative Layout Shift', good: '≤ 0.1', bad: '> 0.25' },
            { key: 'fcp' as const, label: 'FCP', unit: 'ms', desc: 'First Contentful Paint', good: '≤ 1800ms', bad: '> 3000ms' },
            { key: 'ttfb' as const, label: 'TTFB', unit: 'ms', desc: 'Time to First Byte', good: '≤ 800ms', bad: '> 1800ms' },
          ]).map(({ key, label, unit, desc, good, bad }) => {
            const st = cwvStatus(key, cwv[key]);
            return (
              <div key={key} class={`rounded-lg p-3 border ${statusBg[st]}`}>
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-semibold">{label}</span>
                  <span class={`text-xs font-medium ${statusColor[st]}`}>{statusLabel[st]}</span>
                </div>
                <div class="text-xs text-text-muted mb-2">{desc}</div>
                <input
                  type="number" min="0" step={key === 'cls' ? '0.01' : '50'}
                  class="w-full bg-bg border border-border rounded px-2 py-1 text-sm focus:ring-1 focus:ring-primary"
                  value={cwv[key]}
                  onInput={(e) => {
                    const v = parseFloat((e.target as HTMLInputElement).value) || 0;
                    setCwvPreset('custom');
                    setCwv(c => ({ ...c, [key]: v }));
                  }}
                />
                <div class="text-xs text-text-muted mt-1">Good: {good} · Poor: {bad}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
