import { useState, useMemo } from 'preact/hooks';

// ── Sample data ───────────────────────────────────────────────────────────────

const SAMPLE_DATA = `45
62
78
91
103
118
134
147
159
172
188
201
214
223
238
251
267
279
292
308
321
335
347
362
378
391
404
416
429
443
457
469
482
495
508
521
534
547
561
573
586
598
612
625
638
651
664
678
691
704
717
729
743
756
768
782
795
808
821
835
848
861
874
887
901
914
927
941
954
967
980
993
1006
1019
1033
1046
1059
1072
1086
1099
1150
1203
1278
1345
1412
1489
1567
1623
1789
1934
2156
2489
2901
3567
4123
5234
7891
12450
24600
48000
125
198`;

// ── Statistics helpers ────────────────────────────────────────────────────────

function parseInput(raw: string): number[] {
  const tokens = raw
    .replace(/,/g, '\n')
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const nums: number[] = [];
  for (const t of tokens) {
    const n = parseFloat(t);
    if (!isNaN(n) && n >= 0) nums.push(n);
  }
  return nums;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  const frac = idx - lower;
  return sorted[lower] * (1 - frac) + sorted[upper] * frac;
}

function mean(nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function stddev(nums: number[], avg: number): number {
  if (nums.length < 2) return 0;
  const variance = nums.reduce((acc, v) => acc + (v - avg) ** 2, 0) / nums.length;
  return Math.sqrt(variance);
}

function pctUnder(nums: number[], threshold: number): number {
  if (nums.length === 0) return 0;
  return (nums.filter((v) => v < threshold).length / nums.length) * 100;
}

interface Stats {
  count: number;
  min: number;
  max: number;
  mean: number;
  stddev: number;
  p50: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
  under100: number;
  under200: number;
  under500: number;
  under1000: number;
}

function computeStats(nums: number[]): Stats | null {
  if (nums.length === 0) return null;
  const sorted = [...nums].sort((a, b) => a - b);
  const avg = mean(nums);
  return {
    count: nums.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    mean: avg,
    stddev: stddev(nums, avg),
    p50: percentile(sorted, 50),
    p75: percentile(sorted, 75),
    p90: percentile(sorted, 90),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    under100: pctUnder(nums, 100),
    under200: pctUnder(nums, 200),
    under500: pctUnder(nums, 500),
    under1000: pctUnder(nums, 1000),
  };
}

function fmt(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(2) + 's';
  return n.toFixed(1) + 'ms';
}

function fmtRaw(n: number): string {
  return n.toFixed(2);
}

// ── Histogram buckets ─────────────────────────────────────────────────────────

interface Bucket { label: string; count: number; pct: number; }

function buildHistogram(nums: number[]): Bucket[] {
  const buckets = [
    { label: '0–100ms', min: 0, max: 100 },
    { label: '100–200ms', min: 100, max: 200 },
    { label: '200–500ms', min: 200, max: 500 },
    { label: '500ms–1s', min: 500, max: 1000 },
    { label: '1s–2s', min: 1000, max: 2000 },
    { label: '2s+', min: 2000, max: Infinity },
  ];
  const total = nums.length || 1;
  return buckets.map(({ label, min, max }) => {
    const count = nums.filter((v) => v >= min && v < max).length;
    return { label, count, pct: (count / total) * 100 };
  });
}

// ── Markdown export ───────────────────────────────────────────────────────────

function toMarkdown(stats: Stats): string {
  const rows = [
    ['Count', String(stats.count)],
    ['Min', fmt(stats.min)],
    ['Max', fmt(stats.max)],
    ['Mean', fmt(stats.mean)],
    ['Std Dev', fmt(stats.stddev)],
    ['p50 (median)', fmt(stats.p50)],
    ['p75', fmt(stats.p75)],
    ['p90', fmt(stats.p90)],
    ['p95', fmt(stats.p95)],
    ['p99', fmt(stats.p99)],
    ['< 100ms', stats.under100.toFixed(1) + '%'],
    ['< 200ms', stats.under200.toFixed(1) + '%'],
    ['< 500ms', stats.under500.toFixed(1) + '%'],
    ['< 1000ms', stats.under1000.toFixed(1) + '%'],
  ];
  const header = '| Metric | Value |\n|--------|-------|\n';
  return header + rows.map(([m, v]) => `| ${m} | ${v} |`).join('\n');
}

// ── Component ─────────────────────────────────────────────────────────────────

const PERCENTILE_OPTIONS = ['p50', 'p75', 'p90', 'p95', 'p99'] as const;
type PercentileKey = typeof PERCENTILE_OPTIONS[number];

export default function ApiResponseTimeCalculator() {
  const [input, setInput] = useState(SAMPLE_DATA);
  const [slaPercentile, setSlaPercentile] = useState<PercentileKey>('p99');
  const [slaThreshold, setSlaThreshold] = useState('500');
  const [copied, setCopied] = useState(false);
  const [copyMsg, setCopyMsg] = useState('Copy as Markdown');

  const nums = useMemo(() => parseInput(input), [input]);
  const stats = useMemo(() => computeStats(nums), [nums]);
  const histogram = useMemo(() => buildHistogram(nums), [nums]);

  const slaPass = useMemo(() => {
    if (!stats) return null;
    const threshold = parseFloat(slaThreshold);
    if (isNaN(threshold) || threshold <= 0) return null;
    const value = stats[slaPercentile];
    return value <= threshold;
  }, [stats, slaPercentile, slaThreshold]);

  const slaValue = stats ? stats[slaPercentile] : null;

  const histMax = useMemo(() => Math.max(...histogram.map((b) => b.count), 1), [histogram]);

  const copyMarkdown = () => {
    if (!stats) return;
    navigator.clipboard.writeText(toMarkdown(stats)).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg('Copy as Markdown'), 1800);
    });
  };

  const lineCount = input.split('\n').filter((l) => l.trim()).length;

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex justify-between items-center">
          <label class="text-sm font-medium text-text">Response Times Input</label>
          <div class="flex gap-2">
            <button
              onClick={() => setInput(SAMPLE_DATA)}
              class="text-xs bg-bg border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
            >
              Load Sample
            </button>
            <button
              onClick={() => setInput('')}
              class="text-xs bg-bg border border-border px-3 py-1.5 rounded hover:border-red-500 hover:text-red-400 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          class="w-full h-44 bg-bg border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/50"
          placeholder={"Paste response times here — one per line or comma-separated (in ms):\n45\n120\n350\n1200\n...\n\nOr CSV: 45, 120, 350, 1200"}
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <p class="text-xs text-text-muted">
          {nums.length > 0
            ? `Parsed ${nums.length} value${nums.length !== 1 ? 's' : ''} (one per line or comma-separated, in ms)`
            : 'Enter response times in milliseconds — one per line or comma-separated'}
        </p>
      </div>

      {/* No data state */}
      {nums.length === 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-6 text-center text-text-muted text-sm">
          Paste response times above to see statistics, percentiles, and SLA analysis.
        </div>
      )}

      {/* Stats grid */}
      {stats && (
        <>
          {/* Summary stats */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-sm font-semibold text-text uppercase tracking-wider">Statistics</h2>
              <button
                onClick={copyMarkdown}
                class="text-xs bg-bg border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
              >
                {copyMsg}
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Count', value: stats.count.toLocaleString() },
                { label: 'Min', value: fmt(stats.min) },
                { label: 'Max', value: fmt(stats.max) },
                { label: 'Mean', value: fmt(stats.mean) },
                { label: 'Std Dev', value: fmt(stats.stddev) },
                { label: 'p50 (Median)', value: fmt(stats.p50), highlight: true },
                { label: 'p75', value: fmt(stats.p75) },
                { label: 'p90', value: fmt(stats.p90) },
                { label: 'p95', value: fmt(stats.p95), highlight: true },
                { label: 'p99', value: fmt(stats.p99), highlight: true },
              ].map(({ label, value, highlight }) => (
                <div
                  key={label}
                  class={`rounded-lg p-3 ${highlight ? 'bg-primary/10 border border-primary/30' : 'bg-bg border border-border'}`}
                >
                  <p class="text-xs text-text-muted mb-1">{label}</p>
                  <p class={`text-lg font-bold font-mono ${highlight ? 'text-primary' : 'text-text'}`}>{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* SLA thresholds */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <h2 class="text-sm font-semibold text-text uppercase tracking-wider mb-4">SLA Thresholds</h2>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '< 100ms', pct: stats.under100 },
                { label: '< 200ms', pct: stats.under200 },
                { label: '< 500ms', pct: stats.under500 },
                { label: '< 1000ms', pct: stats.under1000 },
              ].map(({ label, pct }) => {
                const good = pct >= 95;
                const warn = pct >= 80 && pct < 95;
                const color = good ? 'text-green-400' : warn ? 'text-yellow-400' : 'text-red-400';
                const bg = good ? 'bg-green-500/10 border-green-500/30' : warn ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-red-500/10 border-red-500/30';
                return (
                  <div key={label} class={`rounded-lg p-3 border ${bg}`}>
                    <p class="text-xs text-text-muted mb-1">{label}</p>
                    <p class={`text-xl font-bold font-mono ${color}`}>{pct.toFixed(1)}%</p>
                    <div class="mt-2 h-1.5 bg-bg rounded-full overflow-hidden">
                      <div
                        class={`h-full rounded-full transition-all ${good ? 'bg-green-500' : warn ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SLA Checker */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <h2 class="text-sm font-semibold text-text uppercase tracking-wider mb-4">SLA Checker</h2>
            <div class="flex flex-wrap items-end gap-4">
              <div>
                <label class="block text-xs text-text-muted mb-1.5">Percentile</label>
                <select
                  value={slaPercentile}
                  onChange={(e) => setSlaPercentile((e.target as HTMLSelectElement).value as PercentileKey)}
                  class="bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                >
                  {PERCENTILE_OPTIONS.map((p) => (
                    <option key={p} value={p}>{p.toUpperCase()}</option>
                  ))}
                </select>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1.5">must be under (ms)</label>
                <input
                  type="number"
                  min="1"
                  value={slaThreshold}
                  onInput={(e) => setSlaThreshold((e.target as HTMLInputElement).value)}
                  class="w-32 bg-bg border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary transition-colors"
                  placeholder="500"
                />
              </div>
              {slaPass !== null && slaValue !== null && (
                <div class="flex items-center gap-3 pb-0.5">
                  <span
                    class={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-bold ${
                      slaPass
                        ? 'bg-green-500/15 border border-green-500/40 text-green-400'
                        : 'bg-red-500/15 border border-red-500/40 text-red-400'
                    }`}
                  >
                    {slaPass ? '✓ PASS' : '✗ FAIL'}
                  </span>
                  <span class="text-sm text-text-muted">
                    {slaPercentile.toUpperCase()} = <span class="font-mono font-semibold text-text">{fmt(slaValue)}</span>
                    {' '}
                    {slaPass ? '≤' : '>'}{' '}
                    <span class="font-mono font-semibold text-text">{slaThreshold}ms</span>
                  </span>
                </div>
              )}
            </div>
            <p class="mt-3 text-xs text-text-muted">
              Example SLA targets: "p99 &lt; 500ms" for APIs, "p95 &lt; 200ms" for interactive UIs, "p99 &lt; 1000ms" for background jobs.
            </p>
          </div>

          {/* Histogram */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <h2 class="text-sm font-semibold text-text uppercase tracking-wider mb-4">Distribution Histogram</h2>
            <div class="space-y-2.5">
              {histogram.map(({ label, count, pct }) => {
                const barWidth = histMax > 0 ? (count / histMax) * 100 : 0;
                const isHeavy = pct > 30;
                return (
                  <div key={label} class="flex items-center gap-3">
                    <span class="text-xs font-mono text-text-muted w-20 shrink-0 text-right">{label}</span>
                    <div class="flex-1 h-6 bg-bg rounded overflow-hidden border border-border">
                      <div
                        class={`h-full rounded transition-all ${isHeavy ? 'bg-primary' : 'bg-primary/50'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                    <span class="text-xs font-mono text-text-muted w-24 shrink-0">
                      {count} ({pct.toFixed(1)}%)
                    </span>
                  </div>
                );
              })}
            </div>
            <p class="mt-3 text-xs text-text-muted">
              Ideal distribution: majority of requests in 0–200ms, minimal tail in 1s+ buckets.
            </p>
          </div>

          {/* Percentile table */}
          <div class="bg-bg-card border border-border rounded-xl p-4 overflow-x-auto">
            <h2 class="text-sm font-semibold text-text uppercase tracking-wider mb-4">Full Percentile Table</h2>
            <table class="w-full text-sm">
              <thead>
                <tr class="text-left border-b border-border">
                  <th class="pb-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wider">Percentile</th>
                  <th class="pb-2 pr-4 text-xs font-medium text-text-muted uppercase tracking-wider">Value (ms)</th>
                  <th class="pb-2 text-xs font-medium text-text-muted uppercase tracking-wider">Formatted</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                {[
                  { label: 'p50 (Median)', key: 'p50' as const },
                  { label: 'p75', key: 'p75' as const },
                  { label: 'p90', key: 'p90' as const },
                  { label: 'p95', key: 'p95' as const },
                  { label: 'p99', key: 'p99' as const },
                ].map(({ label, key }) => (
                  <tr key={key} class="hover:bg-bg/50 transition-colors">
                    <td class="py-2 pr-4 font-mono text-text font-medium">{label}</td>
                    <td class="py-2 pr-4 font-mono text-text-muted">{fmtRaw(stats[key])}</td>
                    <td class="py-2 font-mono text-primary font-semibold">{fmt(stats[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
