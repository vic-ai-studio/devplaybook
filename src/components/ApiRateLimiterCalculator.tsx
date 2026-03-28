import { useState, useMemo } from 'preact/hooks';

// ── Types ───────────────────────────────────────────────────────────────────

type Algorithm =
  | 'token_bucket'
  | 'leaky_bucket'
  | 'fixed_window'
  | 'sliding_window_log'
  | 'sliding_window_counter';

type RateUnit = 'per_second' | 'per_minute' | 'per_hour';

interface AlgorithmMeta {
  label: string;
  description: string;
  pros: string[];
  cons: string[];
  bestFor: string;
  memoryComplexity: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ALGORITHMS: Record<Algorithm, AlgorithmMeta> = {
  token_bucket: {
    label: 'Token Bucket',
    description: 'Tokens are added at a fixed refill rate. Each request consumes one token. Excess requests are rejected if the bucket is empty.',
    pros: ['Allows controlled bursts', 'Smooth average throughput', 'Simple to implement'],
    cons: ['Burst can cause downstream spikes', 'Two parameters to tune (rate + burst)'],
    bestFor: 'APIs that allow short bursts but need sustained average control',
    memoryComplexity: 'O(1) per user — only store token count + last refill timestamp',
  },
  leaky_bucket: {
    label: 'Leaky Bucket',
    description: 'Requests enter a queue and are processed at a fixed output rate. The bucket "leaks" at a constant pace regardless of input rate.',
    pros: ['Smoothest output rate', 'Prevents bursty traffic from reaching backend'],
    cons: ['No burst allowance', 'Adds latency via queuing', 'Queue overflow still drops requests'],
    bestFor: 'Payment processors, queuing systems, or any service requiring strict output pacing',
    memoryComplexity: 'O(n) per user — queue of pending requests',
  },
  fixed_window: {
    label: 'Fixed Window',
    description: 'A counter resets at fixed time boundaries (e.g., every minute). Requests within the window are counted; excess are rejected.',
    pros: ['Very simple to implement', 'Low memory usage', 'Easy to reason about'],
    cons: ['Boundary burst attack: 2× rate at window edge', 'Uneven distribution within window'],
    bestFor: 'Simple APIs, internal services with trusted clients',
    memoryComplexity: 'O(1) per user — just a counter + window start time',
  },
  sliding_window_log: {
    label: 'Sliding Window Log',
    description: 'Stores a timestamp for every request. The count is computed by looking at all timestamps within the last N seconds.',
    pros: ['Exact rate limiting, no boundary burst problem', 'Most accurate algorithm'],
    cons: ['High memory: stores every request timestamp', 'O(n) per request to prune old entries'],
    bestFor: 'High-value APIs where accuracy matters more than memory (e.g., financial APIs)',
    memoryComplexity: 'O(requests in window) per user — one timestamp per request',
  },
  sliding_window_counter: {
    label: 'Sliding Window Counter',
    description: 'Approximation using the current and previous window counters, weighted by how far into the current window you are.',
    pros: ['Low memory (2 counters)', 'No boundary burst problem (approximate)', 'Fast O(1) operations'],
    cons: ['Approximate: ±10% error at window boundaries', 'Slightly more complex than fixed window'],
    bestFor: 'High-scale APIs (Redis-backed). Used by Cloudflare, Nginx limit_req',
    memoryComplexity: 'O(1) per user — two counters + window boundary timestamp',
  },
};

const RATE_UNIT_TO_SEC: Record<RateUnit, number> = {
  per_second: 1,
  per_minute: 60,
  per_hour: 3600,
};

const RATE_UNIT_LABELS: Record<RateUnit, string> = {
  per_second: 'per second',
  per_minute: 'per minute',
  per_hour: 'per hour',
};

const COMMON_API_LIMITS = [
  { service: 'GitHub', limit: '5,000 req/hr (auth)', rps: 1.39, unit: 'req/hr', tier: 'Authenticated', color: 'text-gray-400' },
  { service: 'Stripe', limit: '100 req/s', rps: 100, unit: 'req/s', tier: 'Live mode', color: 'text-blue-400' },
  { service: 'Twitter/X', limit: '300 req/15min', rps: 0.33, unit: 'req/15min', tier: 'Basic', color: 'text-sky-400' },
  { service: 'OpenAI GPT-4o', limit: 'Varies by tier', rps: 0.17, unit: 'varies', tier: 'Tier 1 ~10 RPM', color: 'text-green-400' },
  { service: 'Cloudflare', limit: '1,200 req/5min', rps: 4, unit: 'req/5min', tier: 'Free', color: 'text-orange-400' },
  { service: 'Twilio', limit: '100 req/s', rps: 100, unit: 'req/s', tier: 'Default', color: 'text-red-400' },
];

function fmt(n: number, decimals = 2): string {
  if (!isFinite(n) || isNaN(n)) return '—';
  if (n === 0) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return n.toLocaleString('en', { maximumFractionDigits: 0 });
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div class="bg-bg border border-border rounded-lg px-3 py-3 text-center">
      <p class="text-xs text-text-muted mb-1">{label}</p>
      <p class="font-bold text-primary text-lg tabular-nums leading-tight">{value}</p>
      {sub && <p class="text-xs text-text-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function InputRow({ label, children, hint }: { label: string; children: preact.ComponentChildren; hint?: string }) {
  return (
    <div>
      <label class="block text-sm font-medium text-text-muted mb-1.5">{label}</label>
      {children}
      {hint && <p class="text-xs text-text-muted mt-1">{hint}</p>}
    </div>
  );
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function ApiRateLimiterCalculator() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('token_bucket');
  const [rateLimit, setRateLimit] = useState('100');
  const [rateUnit, setRateUnit] = useState<RateUnit>('per_minute');
  const [burstCapacity, setBurstCapacity] = useState('20');
  const [refillRate, setRefillRate] = useState('10');
  const [windowSize, setWindowSize] = useState('60');
  const [concurrentUsers, setConcurrentUsers] = useState('1000');
  const [estimatedUsers, setEstimatedUsers] = useState('10000');

  const meta = ALGORITHMS[algorithm];

  const computed = useMemo(() => {
    const rateLimitNum = parseFloat(rateLimit) || 0;
    const burstNum = parseInt(burstCapacity, 10) || 1;
    const refillNum = parseFloat(refillRate) || 0;
    const windowNum = parseInt(windowSize, 10) || 60;
    const usersNum = parseInt(concurrentUsers, 10) || 0;
    const estimatedUsersNum = parseInt(estimatedUsers, 10) || 0;

    const unitSec = RATE_UNIT_TO_SEC[rateUnit];
    // effective RPS based on algorithm
    let effectiveRPS = 0;
    let effectiveBurst = 0;

    switch (algorithm) {
      case 'token_bucket': {
        // refill rate is tokens/sec, sustained rate is refillRate req/s
        // but the configured rate limit is the "ceiling" per unit
        const configuredRPS = rateLimitNum / unitSec;
        // use whichever is more restrictive: configured rate or refill rate
        effectiveRPS = Math.min(configuredRPS, refillNum);
        effectiveBurst = burstNum;
        break;
      }
      case 'leaky_bucket': {
        // output rate is fixed = rateLimit / unit (no burst)
        effectiveRPS = rateLimitNum / unitSec;
        effectiveBurst = 1; // no burst — queue processes one at a time
        break;
      }
      case 'fixed_window':
      case 'sliding_window_counter': {
        effectiveRPS = rateLimitNum / unitSec;
        // fixed window can allow 2× at boundary; sliding window counter ~1×
        effectiveBurst = algorithm === 'fixed_window'
          ? rateLimitNum * 2  // worst-case boundary burst
          : Math.ceil(rateLimitNum * 1.1); // ~10% approximation error
        break;
      }
      case 'sliding_window_log': {
        effectiveRPS = rateLimitNum / unitSec;
        effectiveBurst = rateLimitNum; // exact window, no extra burst
        break;
      }
    }

    const intervalMs = effectiveRPS > 0 ? 1000 / effectiveRPS : Infinity;
    const avgResponseMs = intervalMs < Infinity ? intervalMs : 0;

    // Rejection calculation: 1000 simultaneous users
    // Total capacity per second = effectiveRPS + burst (token bucket) else just RPS
    const totalCapPerSec = algorithm === 'token_bucket'
      ? effectiveRPS + (effectiveBurst / Math.max(1, unitSec))
      : effectiveRPS;
    const rejectionPct = usersNum > 0
      ? Math.max(0, Math.min(100, ((usersNum - totalCapPerSec) / usersNum) * 100))
      : 0;

    // Redis memory for sliding window counter (per user)
    // Two counters (8 bytes each) + timestamp (8 bytes) + key overhead (~50 bytes)
    const bytesPerUserSlidingCounter = 8 + 8 + 8 + 50; // ~74 bytes
    const bytesPerUserSlidingLog = (rateLimitNum / unitSec) * windowNum * 8 + 50; // timestamps * 8 bytes + key
    const bytesPerUser = algorithm === 'sliding_window_log'
      ? bytesPerUserSlidingLog
      : bytesPerUserSlidingCounter;
    const totalRedisBytes = bytesPerUser * estimatedUsersNum;

    return {
      effectiveRPS,
      effectiveBurst,
      intervalMs,
      avgResponseMs,
      rejectionPct,
      bytesPerUser,
      totalRedisBytes,
      rateLimitNum,
      windowNum,
    };
  }, [algorithm, rateLimit, rateUnit, burstCapacity, refillRate, windowSize, concurrentUsers, estimatedUsers]);

  const showBurst = algorithm === 'token_bucket';
  const showRefill = algorithm === 'token_bucket';
  const showWindow = algorithm === 'fixed_window' || algorithm === 'sliding_window_log' || algorithm === 'sliding_window_counter';
  const showRedis = algorithm === 'sliding_window_log' || algorithm === 'sliding_window_counter';

  return (
    <div class="space-y-6">

      {/* Algorithm Selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Rate Limiting Algorithm</label>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(Object.entries(ALGORITHMS) as [Algorithm, AlgorithmMeta][]).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setAlgorithm(key)}
              class={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                algorithm === key
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-bg-card text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              <span class="font-medium block">{m.label}</span>
              <span class="text-xs opacity-75 mt-0.5 block">{m.bestFor.slice(0, 50)}{m.bestFor.length > 50 ? '…' : ''}</span>
            </button>
          ))}
        </div>
        <div class="mt-2 bg-bg-card border border-border rounded-lg px-4 py-3 text-sm text-text-muted">
          <span class="font-medium text-text">{meta.label}:</span> {meta.description}
        </div>
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <InputRow label="Rate limit">
          <div class="flex gap-2">
            <input
              type="number"
              min="0"
              value={rateLimit}
              onInput={(e) => setRateLimit((e.target as HTMLInputElement).value)}
              class="flex-1 min-w-0 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="100"
            />
            <select
              value={rateUnit}
              onChange={(e) => setRateUnit((e.target as HTMLSelectElement).value as RateUnit)}
              class="bg-bg-card border border-border rounded-lg px-2 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              {(Object.entries(RATE_UNIT_LABELS) as [RateUnit, string][]).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
        </InputRow>

        {showBurst && (
          <InputRow label="Burst capacity (tokens)" hint="Max tokens the bucket can hold">
            <input
              type="number"
              min="1"
              value={burstCapacity}
              onInput={(e) => setBurstCapacity((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="20"
            />
          </InputRow>
        )}

        {showRefill && (
          <InputRow label="Refill rate (tokens/sec)" hint="How fast tokens are replenished">
            <input
              type="number"
              min="0.01"
              step="0.1"
              value={refillRate}
              onInput={(e) => setRefillRate((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="10"
            />
          </InputRow>
        )}

        {showWindow && (
          <InputRow label="Window size (seconds)" hint="Duration of the rate limit window">
            <input
              type="number"
              min="1"
              value={windowSize}
              onInput={(e) => setWindowSize((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="60"
            />
          </InputRow>
        )}

        <InputRow label="Simultaneous users (for rejection %)">
          <input
            type="number"
            min="1"
            value={concurrentUsers}
            onInput={(e) => setConcurrentUsers((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="1000"
          />
        </InputRow>

        {showRedis && (
          <InputRow label="Estimated total users (Redis memory)" hint="For sliding window memory estimate">
            <input
              type="number"
              min="1"
              value={estimatedUsers}
              onInput={(e) => setEstimatedUsers((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
              placeholder="10000"
            />
          </InputRow>
        )}
      </div>

      {/* Results */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-5">
        <h3 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Calculated Metrics</h3>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard
            label="Effective RPS"
            value={fmt(computed.effectiveRPS, 3)}
            sub="requests / second"
          />
          <StatCard
            label="Burst Capacity"
            value={fmt(computed.effectiveBurst, 0)}
            sub={algorithm === 'fixed_window' ? 'worst-case (2× window)' : 'max burst tokens'}
          />
          <StatCard
            label="Min Interval"
            value={isFinite(computed.intervalMs) ? `${fmt(computed.intervalMs, 1)} ms` : '∞'}
            sub="between requests"
          />
          <StatCard
            label="Avg Response Under Load"
            value={computed.avgResponseMs > 0 ? `${fmt(computed.avgResponseMs, 0)} ms` : '—'}
            sub="queue delay estimate"
          />
        </div>

        {/* Rejection scenario */}
        <div class="border-t border-border pt-4">
          <div class="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p class="text-sm font-medium text-text">Simultaneous traffic scenario</p>
              <p class="text-xs text-text-muted mt-0.5">
                If <span class="font-mono text-text">{parseInt(concurrentUsers) > 0 ? parseInt(concurrentUsers).toLocaleString() : '0'}</span> users hit your API at the same time:
              </p>
            </div>
            <div class="text-right">
              <p class={`text-2xl font-bold tabular-nums ${computed.rejectionPct > 50 ? 'text-red-400' : computed.rejectionPct > 20 ? 'text-yellow-400' : 'text-green-400'}`}>
                {fmt(computed.rejectionPct, 1)}%
              </p>
              <p class="text-xs text-text-muted">requests rejected</p>
            </div>
          </div>
          <div class="mt-3 w-full bg-bg rounded-full h-2.5 overflow-hidden">
            <div
              class={`h-2.5 rounded-full transition-all duration-300 ${computed.rejectionPct > 50 ? 'bg-red-500' : computed.rejectionPct > 20 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, computed.rejectionPct)}%` }}
            />
          </div>
          <p class="text-xs text-text-muted mt-2">
            Capacity: ~{fmt(computed.effectiveRPS, 1)} req/s sustained
            {algorithm === 'token_bucket' && ` + ${fmt(computed.effectiveBurst, 0)} burst tokens`}
          </p>
        </div>

        {/* Redis memory estimate */}
        {showRedis && (
          <div class="border-t border-border pt-4">
            <p class="text-sm font-medium text-text mb-2">Redis memory estimate ({meta.label})</p>
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-bg border border-border rounded-lg px-3 py-2">
                <p class="text-xs text-text-muted">Per user</p>
                <p class="font-mono font-bold text-primary mt-0.5">{fmtBytes(computed.bytesPerUser)}</p>
              </div>
              <div class="bg-bg border border-border rounded-lg px-3 py-2">
                <p class="text-xs text-text-muted">Total ({parseInt(estimatedUsers) > 0 ? parseInt(estimatedUsers).toLocaleString() : '0'} users)</p>
                <p class="font-mono font-bold text-primary mt-0.5">{fmtBytes(computed.totalRedisBytes)}</p>
              </div>
            </div>
            <p class="text-xs text-text-muted mt-2">{meta.memoryComplexity}</p>
          </div>
        )}

        {!showRedis && (
          <div class="border-t border-border pt-3">
            <p class="text-xs text-text-muted">{meta.memoryComplexity}</p>
          </div>
        )}
      </div>

      {/* Common API Limits Reference */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h3 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Common API Rate Limits Reference</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left pb-2 font-medium text-text-muted text-xs uppercase tracking-wide">Service</th>
                <th class="text-left pb-2 font-medium text-text-muted text-xs uppercase tracking-wide">Limit</th>
                <th class="text-left pb-2 font-medium text-text-muted text-xs uppercase tracking-wide">Approx RPS</th>
                <th class="text-left pb-2 font-medium text-text-muted text-xs uppercase tracking-wide hidden sm:table-cell">Tier</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {COMMON_API_LIMITS.map((api) => (
                <tr key={api.service}>
                  <td class={`py-2 font-medium ${api.color}`}>{api.service}</td>
                  <td class="py-2 font-mono text-xs text-text">{api.limit}</td>
                  <td class="py-2 font-mono text-xs text-text-muted">{api.rps < 1 ? api.rps.toFixed(3) : fmt(api.rps, 1)}</td>
                  <td class="py-2 text-xs text-text-muted hidden sm:table-cell">{api.tier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Algorithm Comparison Table */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h3 class="font-semibold text-sm text-text-muted uppercase tracking-wide mb-3">Algorithm Comparison</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-xs">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left pb-2 font-medium text-text-muted uppercase tracking-wide">Algorithm</th>
                <th class="text-left pb-2 font-medium text-text-muted uppercase tracking-wide hidden sm:table-cell">Burst</th>
                <th class="text-left pb-2 font-medium text-text-muted uppercase tracking-wide hidden md:table-cell">Memory</th>
                <th class="text-left pb-2 font-medium text-text-muted uppercase tracking-wide">Accuracy</th>
                <th class="text-left pb-2 font-medium text-text-muted uppercase tracking-wide hidden lg:table-cell">Best For</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              {(Object.entries(ALGORITHMS) as [Algorithm, AlgorithmMeta][]).map(([key, m]) => (
                <tr
                  key={key}
                  class={algorithm === key ? 'bg-primary/5' : ''}
                >
                  <td class={`py-2 pr-3 font-medium ${algorithm === key ? 'text-primary' : 'text-text'}`}>
                    {m.label}
                    {algorithm === key && <span class="ml-1 text-primary text-xs">←</span>}
                  </td>
                  <td class="py-2 pr-3 hidden sm:table-cell text-text-muted">
                    {key === 'token_bucket' ? 'Yes (controlled)' :
                     key === 'fixed_window' ? 'Yes (boundary burst)' :
                     key === 'leaky_bucket' ? 'No (queued)' :
                     'No'}
                  </td>
                  <td class="py-2 pr-3 hidden md:table-cell text-text-muted">
                    {key === 'sliding_window_log' ? 'High O(n)' :
                     key === 'leaky_bucket' ? 'Medium O(n)' :
                     'Low O(1)'}
                  </td>
                  <td class="py-2 pr-3 text-text-muted">
                    {key === 'sliding_window_log' ? 'Exact' :
                     key === 'sliding_window_counter' ? '~±10%' :
                     key === 'fixed_window' ? 'Low (boundary)' :
                     'High'}
                  </td>
                  <td class="py-2 hidden lg:table-cell text-text-muted">{m.bestFor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pros/Cons for selected algorithm */}
        <div class="mt-4 border-t border-border pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p class="text-xs font-semibold text-green-400 uppercase tracking-wide mb-1.5">Pros — {meta.label}</p>
            <ul class="space-y-1">
              {meta.pros.map((p) => (
                <li key={p} class="text-xs text-text-muted flex gap-1.5">
                  <span class="text-green-400 shrink-0">+</span>{p}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p class="text-xs font-semibold text-red-400 uppercase tracking-wide mb-1.5">Cons — {meta.label}</p>
            <ul class="space-y-1">
              {meta.cons.map((c) => (
                <li key={c} class="text-xs text-text-muted flex gap-1.5">
                  <span class="text-red-400 shrink-0">−</span>{c}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
