import { useState, useMemo } from 'preact/hooks';

type Operator = '=' | '!=' | '=~' | '!~';
type AggFunc =
  | 'none'
  | 'sum'
  | 'count'
  | 'avg'
  | 'min'
  | 'max'
  | 'rate'
  | 'increase'
  | 'irate'
  | 'histogram_quantile';

interface LabelMatcher {
  id: number;
  key: string;
  op: Operator;
  value: string;
}

const TIME_RANGES = ['1m', '5m', '15m', '30m', '1h', '6h', '12h', '24h', '7d'];
const RATE_INTERVALS = ['1m', '5m', '15m', '1h'];
const OPERATORS: Operator[] = ['=', '!=', '=~', '!~'];

const AGG_FUNCS: { value: AggFunc; label: string }[] = [
  { value: 'none', label: 'None (raw metric)' },
  { value: 'sum', label: 'sum()' },
  { value: 'count', label: 'count()' },
  { value: 'avg', label: 'avg()' },
  { value: 'min', label: 'min()' },
  { value: 'max', label: 'max()' },
  { value: 'rate', label: 'rate()' },
  { value: 'increase', label: 'increase()' },
  { value: 'irate', label: 'irate()' },
  { value: 'histogram_quantile', label: 'histogram_quantile()' },
];

const NEEDS_RANGE: AggFunc[] = ['rate', 'increase', 'irate'];
const WRAPS_RANGE: AggFunc[] = ['rate', 'increase', 'irate'];

function buildPromQL(opts: {
  metric: string;
  matchers: LabelMatcher[];
  aggFunc: AggFunc;
  byLabels: string;
  withoutLabels: string;
  groupMode: 'by' | 'without' | 'none';
  rateInterval: string;
  quantile: string;
  timeRange: string;
}): string {
  const {
    metric, matchers, aggFunc, byLabels, withoutLabels,
    groupMode, rateInterval, quantile,
  } = opts;

  const metricName = metric.trim() || 'metric_name';

  // Build label selector
  const validMatchers = matchers.filter(m => m.key.trim());
  const selectorInner = validMatchers.length
    ? validMatchers.map(m => `${m.key.trim()}${m.op}"${m.value}"`).join(', ')
    : '';
  const selector = selectorInner ? `{${selectorInner}}` : '';

  // Inner expression
  let inner = `${metricName}${selector}`;

  // Wrap with range interval for rate/increase/irate
  if (WRAPS_RANGE.includes(aggFunc)) {
    inner = `${metricName}${selector}[${rateInterval}]`;
    inner = `${aggFunc}(${inner})`;
  } else if (aggFunc === 'histogram_quantile') {
    const q = parseFloat(quantile);
    const safeQ = isNaN(q) ? 0.95 : Math.max(0, Math.min(1, q));
    inner = `${metricName}_bucket${selector}[${rateInterval}]`;
    inner = `histogram_quantile(${safeQ}, rate(${inner}))`;
  } else if (aggFunc !== 'none') {
    // Standard aggregation — optionally wrap with by/without
    const grouping = buildGrouping(groupMode, byLabels, withoutLabels);
    inner = `${aggFunc}${grouping}(${inner})`;
    return inner;
  }

  // For rate/increase/irate/histogram_quantile — apply outer aggregation grouping
  if (WRAPS_RANGE.includes(aggFunc) && groupMode !== 'none') {
    const labels = groupMode === 'by' ? byLabels : withoutLabels;
    const validLabels = labels.split(',').map(l => l.trim()).filter(Boolean);
    if (validLabels.length) {
      const kw = groupMode === 'by' ? 'by' : 'without';
      inner = `${aggFunc}${' '}${kw} (${validLabels.join(', ')})(\n  ${metricName}${selector}[${rateInterval}]\n)`;
    }
  }

  return inner;
}

function buildGrouping(
  mode: 'by' | 'without' | 'none',
  byLabels: string,
  withoutLabels: string,
): string {
  if (mode === 'none') return '';
  const raw = mode === 'by' ? byLabels : withoutLabels;
  const labels = raw.split(',').map(l => l.trim()).filter(Boolean);
  if (!labels.length) return '';
  return ` ${mode} (${labels.join(', ')})`;
}

function buildGrafanaPanelJson(query: string, metric: string): string {
  const panel = {
    id: 1,
    type: 'timeseries',
    title: metric.trim() || 'Metric Panel',
    datasource: { type: 'prometheus', uid: 'your-prometheus-uid' },
    targets: [
      {
        datasource: { type: 'prometheus', uid: 'your-prometheus-uid' },
        expr: query,
        legendFormat: '__auto',
        refId: 'A',
      },
    ],
    fieldConfig: {
      defaults: {
        color: { mode: 'palette-classic' },
        custom: { lineWidth: 1, fillOpacity: 10 },
      },
      overrides: [],
    },
    options: {
      tooltip: { mode: 'single', sort: 'none' },
      legend: { displayMode: 'list', placement: 'bottom' },
    },
    gridPos: { h: 8, w: 12, x: 0, y: 0 },
  };
  return JSON.stringify(panel, null, 2);
}

let nextId = 1;
function newMatcher(): LabelMatcher {
  return { id: nextId++, key: '', op: '=', value: '' };
}

type OutputTab = 'promql' | 'grafana';

export default function PrometheusQueryBuilder() {
  const [metric, setMetric] = useState('http_requests_total');
  const [matchers, setMatchers] = useState<LabelMatcher[]>([
    { id: nextId++, key: 'job', op: '=', value: 'api-server' },
  ]);
  const [aggFunc, setAggFunc] = useState<AggFunc>('rate');
  const [groupMode, setGroupMode] = useState<'by' | 'without' | 'none'>('by');
  const [byLabels, setByLabels] = useState('job, instance');
  const [withoutLabels, setWithoutLabels] = useState('');
  const [rateInterval, setRateInterval] = useState('5m');
  const [quantile, setQuantile] = useState('0.95');
  const [timeRange, setTimeRange] = useState('1h');
  const [activeTab, setActiveTab] = useState<OutputTab>('promql');
  const [copied, setCopied] = useState(false);

  const promql = useMemo(() => buildPromQL({
    metric, matchers, aggFunc, byLabels, withoutLabels,
    groupMode, rateInterval, quantile, timeRange,
  }), [metric, matchers, aggFunc, byLabels, withoutLabels, groupMode, rateInterval, quantile, timeRange]);

  const grafanaJson = useMemo(() => buildGrafanaPanelJson(promql, metric), [promql, metric]);

  const outputText = activeTab === 'promql' ? promql : grafanaJson;

  function addMatcher() {
    setMatchers(prev => [...prev, newMatcher()]);
  }

  function removeMatcher(id: number) {
    setMatchers(prev => prev.filter(m => m.id !== id));
  }

  function updateMatcher(id: number, field: keyof LabelMatcher, value: string) {
    setMatchers(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
  }

  function handleCopy() {
    navigator.clipboard.writeText(outputText).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const showRateInterval = NEEDS_RANGE.includes(aggFunc) || aggFunc === 'histogram_quantile';
  const showGrouping = aggFunc !== 'none' && aggFunc !== 'histogram_quantile';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — Config */}
      <div class="space-y-5">

        {/* Metric name */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Metric Name</label>
          <input
            type="text"
            value={metric}
            onInput={e => setMetric((e.target as HTMLInputElement).value)}
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent text-text"
            placeholder="http_requests_total"
          />
        </div>

        {/* Label matchers */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Label Matchers</label>
            <button
              onClick={addMatcher}
              class="text-xs bg-accent hover:bg-accent/90 text-white font-medium py-1 px-2.5 rounded-lg transition-colors"
            >
              + Add Matcher
            </button>
          </div>
          <div class="space-y-2">
            {matchers.length === 0 && (
              <p class="text-xs text-text-muted italic">No label matchers — query will select all time series for this metric.</p>
            )}
            {matchers.map(m => (
              <div key={m.id} class="flex items-center gap-2">
                <input
                  type="text"
                  value={m.key}
                  onInput={e => updateMatcher(m.id, 'key', (e.target as HTMLInputElement).value)}
                  class="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent text-text"
                  placeholder="label_name"
                />
                <select
                  value={m.op}
                  onChange={e => updateMatcher(m.id, 'op', (e.target as HTMLSelectElement).value as Operator)}
                  class="bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent text-text"
                >
                  {OPERATORS.map(op => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={m.value}
                  onInput={e => updateMatcher(m.id, 'value', (e.target as HTMLInputElement).value)}
                  class="flex-1 bg-surface border border-border rounded px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-accent text-text"
                  placeholder="value"
                />
                <button
                  onClick={() => removeMatcher(m.id)}
                  class="text-text-muted hover:text-red-400 transition-colors text-xs px-1"
                  title="Remove matcher"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <p class="text-xs text-text-muted mt-1.5">
            <span class="font-mono bg-surface-alt px-1 rounded">=</span> exact &nbsp;
            <span class="font-mono bg-surface-alt px-1 rounded">!=</span> not equal &nbsp;
            <span class="font-mono bg-surface-alt px-1 rounded">=~</span> regex &nbsp;
            <span class="font-mono bg-surface-alt px-1 rounded">!~</span> not regex
          </p>
        </div>

        {/* Aggregation function */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Aggregation Function</label>
          <select
            value={aggFunc}
            onChange={e => setAggFunc((e.target as HTMLSelectElement).value as AggFunc)}
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent text-text"
          >
            {AGG_FUNCS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Rate interval (for rate/irate/increase/histogram_quantile) */}
        {showRateInterval && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">
              Rate Interval
              <span class="ml-1 text-xs text-text-muted font-normal">(range window)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              {RATE_INTERVALS.map(r => (
                <button
                  key={r}
                  onClick={() => setRateInterval(r)}
                  class={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                    rateInterval === r
                      ? 'bg-accent/20 border-accent/50 text-accent'
                      : 'bg-surface border-border text-text-muted hover:bg-surface-alt'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quantile (histogram_quantile only) */}
        {aggFunc === 'histogram_quantile' && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Quantile (0–1)</label>
            <input
              type="number"
              value={quantile}
              min="0"
              max="1"
              step="0.01"
              onInput={e => setQuantile((e.target as HTMLInputElement).value)}
              class="w-32 bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent text-text"
            />
            <p class="text-xs text-text-muted mt-1">Common values: 0.5 (median), 0.90, 0.95, 0.99</p>
          </div>
        )}

        {/* Grouping by/without */}
        {showGrouping && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Grouping</label>
            <div class="flex gap-2 mb-2">
              {(['none', 'by', 'without'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setGroupMode(m)}
                  class={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                    groupMode === m
                      ? 'bg-accent/20 border-accent/50 text-accent'
                      : 'bg-surface border-border text-text-muted hover:bg-surface-alt'
                  }`}
                >
                  {m === 'none' ? 'None' : m}
                </button>
              ))}
            </div>
            {groupMode === 'by' && (
              <input
                type="text"
                value={byLabels}
                onInput={e => setByLabels((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent text-text"
                placeholder="job, instance, status_code"
              />
            )}
            {groupMode === 'without' && (
              <input
                type="text"
                value={withoutLabels}
                onInput={e => setWithoutLabels((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-accent text-text"
                placeholder="instance"
              />
            )}
            <p class="text-xs text-text-muted mt-1">Separate label names with commas</p>
          </div>
        )}

        {/* Time range */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">
            Query Time Range
            <span class="ml-1 text-xs font-normal">(for Grafana / range queries)</span>
          </label>
          <div class="flex flex-wrap gap-2">
            {TIME_RANGES.map(r => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                class={`px-3 py-1 rounded-lg text-sm border transition-colors ${
                  timeRange === r
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'bg-surface border-border text-text-muted hover:bg-surface-alt'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Output */}
      <div class="flex flex-col gap-3">
        {/* Live preview badge */}
        <div class="flex items-center gap-2">
          <span class="inline-flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <span class="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block"></span>
            Live preview
          </span>
        </div>

        {/* Output tabs */}
        <div class="flex gap-1 border-b border-border">
          {([
            { id: 'promql' as const, label: 'PromQL Query' },
            { id: 'grafana' as const, label: 'Grafana Panel JSON' },
          ] as { id: OutputTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              class={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Copy button + output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs text-text-muted font-medium uppercase tracking-wide">
              {activeTab === 'promql' ? 'Generated PromQL' : 'Grafana Panel JSON'}
            </span>
            <button
              onClick={handleCopy}
              class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-1.5 px-3 rounded-lg transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap break-all">{outputText}</pre>
        </div>

        {/* Quick explanation */}
        {activeTab === 'promql' && (
          <div class="bg-surface-alt border border-border rounded-lg p-3 text-xs text-text-muted space-y-1">
            <p class="font-semibold text-text">Query breakdown:</p>
            <p><span class="font-mono text-accent">{metric.trim() || 'metric_name'}</span> — metric name</p>
            {matchers.filter(m => m.key.trim()).length > 0 && (
              <p>
                <span class="font-mono text-accent">
                  {'{' + matchers.filter(m => m.key.trim()).map(m => `${m.key.trim()}${m.op}"${m.value}"`).join(', ') + '}'}
                </span> — label selector
              </p>
            )}
            {showRateInterval && (
              <p><span class="font-mono text-accent">[{rateInterval}]</span> — range window for per-second rate calculation</p>
            )}
            {aggFunc !== 'none' && (
              <p><span class="font-mono text-accent">{aggFunc}()</span> — aggregation function</p>
            )}
          </div>
        )}

        {activeTab === 'grafana' && (
          <div class="bg-surface-alt border border-border rounded-lg p-3 text-xs text-text-muted">
            Paste this JSON into a Grafana dashboard JSON model under <span class="font-mono">.panels[]</span>. Update <span class="font-mono">datasource.uid</span> to match your Prometheus data source UID.
          </div>
        )}
      </div>
    </div>
  );
}
