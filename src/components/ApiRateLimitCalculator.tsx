import { useState } from 'preact/hooks';

type Unit = 'per_second' | 'per_minute' | 'per_hour' | 'per_day';

const UNIT_LABELS: Record<Unit, string> = {
  per_second: 'req/s',
  per_minute: 'req/min',
  per_hour: 'req/hr',
  per_day: 'req/day',
};

const TO_PER_SEC: Record<Unit, number> = {
  per_second: 1,
  per_minute: 1 / 60,
  per_hour: 1 / 3600,
  per_day: 1 / 86400,
};

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n) || n === 0) return '0';
  if (n >= 1000) return n.toLocaleString('en', { maximumFractionDigits: 0 });
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

function fmtDuration(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(1)} ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(2)} s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(2)} min`;
  return `${(ms / 3600000).toFixed(2)} hr`;
}

const PRESETS = [
  { label: 'Twitter API (Free)', rpm: 15, note: '15 req/15 min' },
  { label: 'OpenAI GPT-4o Tier 1', rpm: 500, note: '500 RPM' },
  { label: 'GitHub REST API', rpm: 5000, note: '5000/hr ÷ 60' },
  { label: 'Stripe API', rps: 100, note: '100 req/s' },
  { label: 'Google Maps', rpm: 3000, note: '50 req/s' },
  { label: 'Twilio', rpm: 100, note: '100 req/min' },
];

export default function ApiRateLimitCalculator() {
  const [rate, setRate] = useState('100');
  const [unit, setUnit] = useState<Unit>('per_minute');
  const [burstSize, setBurstSize] = useState('10');
  const [concurrency, setConcurrency] = useState('1');

  const rateNum = parseFloat(rate) || 0;
  const perSec = rateNum * TO_PER_SEC[unit];
  const intervalMs = perSec > 0 ? 1000 / perSec : Infinity;

  const burstNum = parseInt(burstSize, 10) || 1;
  const concurrencyNum = parseInt(concurrency, 10) || 1;

  // How many requests per time window
  const per_second = perSec;
  const per_minute = perSec * 60;
  const per_hour = perSec * 3600;
  const per_day = perSec * 86400;

  // Delay needed between requests for given concurrency
  const delayPerWorker = concurrencyNum > 0 ? intervalMs * concurrencyNum : intervalMs;

  // Retry after burst
  const burstRefillMs = burstNum / perSec * 1000;

  const loadPreset = (preset: typeof PRESETS[0]) => {
    if ('rps' in preset && preset.rps) { setRate(String(preset.rps)); setUnit('per_second'); }
    else if ('rpm' in preset && preset.rpm) { setRate(String(preset.rpm)); setUnit('per_minute'); }
  };

  return (
    <div class="space-y-5">
      {/* Presets */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Common API presets</label>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button
              key={p.label}
              onClick={() => loadPreset(p)}
              title={p.note}
              class="px-3 py-1.5 rounded-lg bg-bg-card border border-border text-sm text-text-muted hover:border-primary hover:text-primary transition-colors"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rate input */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-2">
          <label class="block text-sm font-medium text-text-muted mb-2">Rate limit</label>
          <div class="flex gap-2">
            <input
              type="number"
              min="0"
              value={rate}
              onInput={(e) => setRate((e.target as HTMLInputElement).value)}
              class="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="100"
            />
            <select
              value={unit}
              onChange={(e) => setUnit((e.target as HTMLSelectElement).value as Unit)}
              class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              {(Object.entries(UNIT_LABELS) as [Unit, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Burst capacity</label>
          <input
            type="number"
            min="1"
            value={burstSize}
            onInput={(e) => setBurstSize((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
          />
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Parallel workers / concurrency
        </label>
        <input
          type="number"
          min="1"
          value={concurrency}
          onInput={(e) => setConcurrency((e.target as HTMLInputElement).value)}
          class="w-40 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
        />
      </div>

      {/* Results */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Rate Analysis</h3>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[['Per second', fmt(per_second, 3)], ['Per minute', fmt(per_minute)], ['Per hour', fmt(per_hour, 0)], ['Per day', fmt(per_day, 0)]].map(([label, val]) => (
            <div class="bg-bg rounded-lg p-3 border border-border text-center">
              <p class="text-xs text-text-muted mb-1">{label}</p>
              <p class="font-bold text-primary">{val}</p>
            </div>
          ))}
        </div>

        <div class="border-t border-border pt-4 space-y-3">
          <div class="flex justify-between text-sm">
            <span class="text-text-muted">Min interval between requests</span>
            <span class="font-mono font-medium">{isFinite(intervalMs) ? fmtDuration(intervalMs) : '∞'}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-text-muted">Delay per worker ({concurrencyNum} concurrent)</span>
            <span class="font-mono font-medium">{isFinite(delayPerWorker) ? fmtDuration(delayPerWorker) : '∞'}</span>
          </div>
          <div class="flex justify-between text-sm">
            <span class="text-text-muted">Burst refill time ({burstNum} tokens)</span>
            <span class="font-mono font-medium">{isFinite(burstRefillMs) ? fmtDuration(burstRefillMs) : '∞'}</span>
          </div>
        </div>

        {/* Code snippet */}
        <div class="border-t border-border pt-4">
          <p class="text-xs text-text-muted mb-2 font-medium">Recommended throttle (Node.js)</p>
          <pre class="bg-bg border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto">{`// Throttle to ${fmt(per_second, 3)} req/s${concurrencyNum > 1 ? ` with ${concurrencyNum} workers` : ''}
const DELAY_MS = ${isFinite(delayPerWorker) ? Math.ceil(delayPerWorker) : 0}; // ms between calls per worker
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function throttledRequest(fn) {
  const result = await fn();
  await sleep(DELAY_MS);
  return result;
}`}</pre>
        </div>
      </div>
    </div>
  );
}
