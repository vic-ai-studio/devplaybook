import { useState } from 'preact/hooks';

type Algorithm = 'token_bucket' | 'sliding_window' | 'fixed_window' | 'leaky_bucket';
type OutputTab = 'config' | 'visualization' | 'metrics';

const ALGO_LABELS: Record<Algorithm, string> = {
  token_bucket: 'Token Bucket',
  sliding_window: 'Sliding Window',
  fixed_window: 'Fixed Window',
  leaky_bucket: 'Leaky Bucket',
};

const ALGO_DESC: Record<Algorithm, string> = {
  token_bucket: 'Tokens accumulate over time up to a burst cap. Ideal for bursty traffic that needs smoothing.',
  sliding_window: 'Tracks request count in a rolling time window. Most accurate, higher memory usage.',
  fixed_window: 'Resets counter every fixed interval. Simple but can allow 2x rate at window boundaries.',
  leaky_bucket: 'Requests processed at a constant rate. Queue absorbs bursts, drops excess. Smooth output.',
};

function fmt(n: number, dec = 0): string {
  if (!isFinite(n)) return '∞';
  return n.toLocaleString('en', { maximumFractionDigits: dec });
}

function generateExpressConfig(rps: number, burst: number, windowSec: number, algo: Algorithm): string {
  if (algo === 'token_bucket' || algo === 'leaky_bucket') {
    return `// express-rate-limit (npm install express-rate-limit)
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: ${windowSec * 1000}, // ${windowSec}s window
  max: ${Math.round(rps * windowSec)}, // max requests per window
  standardHeaders: true,  // Return rate limit info in headers
  legacyHeaders: false,
  // Token bucket approximation: burst=${burst}
  skipSuccessfulRequests: false,
  message: {
    status: 429,
    error: 'Too Many Requests',
    retryAfter: ${windowSec},
  },
});

app.use('/api/', limiter);`;
  }

  if (algo === 'sliding_window') {
    return `// express-rate-limit + rate-limit-redis (sliding window)
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const { createClient } = require('redis');

const redisClient = createClient({ url: process.env.REDIS_URL });
await redisClient.connect();

const limiter = rateLimit({
  windowMs: ${windowSec * 1000}, // ${windowSec}s sliding window
  max: ${Math.round(rps * windowSec)},
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.sendCommand(args),
  }),
});

app.use('/api/', limiter);`;
  }

  // fixed_window
  return `// express-rate-limit — Fixed Window
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: ${windowSec * 1000},
  max: ${Math.round(rps * windowSec)},
  standardHeaders: true,
  legacyHeaders: false,
  // Fixed window: counter resets every ${windowSec}s
  // WARNING: allows up to 2x rate at window boundary
});

app.use('/api/', limiter);`;
}

function generateNginxConfig(rps: number, burst: number, algo: Algorithm): string {
  const zone = 'api';
  const rateStr = rps >= 1 ? `${Math.round(rps)}r/s` : `${Math.round(rps * 60)}r/m`;
  const burstStr = burst > 0 ? `burst=${burst} nodelay` : '';

  if (algo === 'leaky_bucket') {
    return `# nginx — Leaky Bucket (limit_req)
# Add to http{} block:
limit_req_zone $binary_remote_addr zone=${zone}:10m rate=${rateStr};
limit_req_status 429;

# Add to server{}/location{} block:
limit_req zone=${zone}${burstStr ? ' burst=' + burst : ''};
# No 'nodelay' = strict leaky bucket: excess queued, then dropped`;
  }

  return `# nginx — ${ALGO_LABELS[algo]}
# Add to http{} block:
limit_req_zone $binary_remote_addr zone=${zone}:10m rate=${rateStr};
limit_req_status 429;
limit_req_log_level warn;

# Add to server{}/location{} block:
limit_req zone=${zone}${burstStr ? ' ' + burstStr : ''};

# Optional: per-connection limit
limit_conn_zone $binary_remote_addr zone=conn_limit:10m;
limit_conn conn_limit 20;`;
}

function generateRedisConfig(rps: number, burst: number, windowSec: number, algo: Algorithm): string {
  if (algo === 'sliding_window') {
    return `-- Redis Lua script — Sliding Window Log
-- Keys: KEYS[1] = rate_limit:{user_id}
-- Args: ARGV[1] = now_ms, ARGV[2] = window_ms, ARGV[3] = max_requests

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])  -- ${windowSec * 1000} ms
local limit = tonumber(ARGV[3])   -- ${Math.round(rps * windowSec)} requests

-- Remove timestamps outside the window
redis.call('ZREMRANGEBYSCORE', key, 0, now - window)

-- Count requests in current window
local count = redis.call('ZCARD', key)

if count < limit then
  -- Allow: add this request timestamp
  redis.call('ZADD', key, now, now .. math.random())
  redis.call('EXPIRE', key, math.ceil(window / 1000) + 1)
  return {1, limit - count - 1}  -- {allowed, remaining}
else
  return {0, 0}  -- {denied, remaining}
end`;
  }

  if (algo === 'token_bucket') {
    return `-- Redis Lua script — Token Bucket
-- Keys: KEYS[1] = tokens:{user_id}, KEYS[2] = ts:{user_id}
-- Args: ARGV[1] = now_sec, ARGV[2] = capacity, ARGV[3] = refill_rate

local tokens_key = KEYS[1]
local ts_key = KEYS[2]
local now = tonumber(ARGV[1])
local capacity = tonumber(ARGV[2])  -- ${burst} tokens
local rate = tonumber(ARGV[3])      -- ${rps} tokens/sec

local last_ts = tonumber(redis.call('GET', ts_key)) or now
local current = tonumber(redis.call('GET', tokens_key)) or capacity

-- Refill tokens since last request
local elapsed = now - last_ts
local refill = elapsed * rate
current = math.min(capacity, current + refill)

if current >= 1 then
  -- Allow: consume 1 token
  redis.call('SET', tokens_key, current - 1, 'EX', ${Math.ceil(burst / rps + 10)})
  redis.call('SET', ts_key, now, 'EX', ${Math.ceil(burst / rps + 10)})
  return {1, math.floor(current - 1)}
else
  return {0, 0}
end`;
  }

  // fixed_window / leaky_bucket
  return `-- Redis — Fixed Window Counter
-- Key pattern: rate_limit:{user_id}:{window_start}

local key = KEYS[1]  -- rate_limit:{user}:{math.floor(now/${windowSec})*${windowSec}}
local limit = ${Math.round(rps * windowSec)}
local window = ${windowSec}

local count = redis.call('INCR', key)

if count == 1 then
  -- First request in window — set TTL
  redis.call('EXPIRE', key, window + 1)
end

if count <= limit then
  return {1, limit - count}  -- {allowed, remaining}
else
  return {0, 0}
end

-- Node.js usage:
-- const windowStart = Math.floor(Date.now() / 1000 / ${windowSec}) * ${windowSec};
-- const key = \`rate_limit:\${userId}:\${windowStart}\`;`;
}

function generateKongConfig(rps: number, burst: number, windowSec: number, algo: Algorithm): string {
  const policy = algo === 'sliding_window' ? 'redis' : 'local';
  return `# Kong Gateway — rate-limiting plugin
# Apply via Kong Admin API or declarative config (deck)

plugins:
  - name: rate-limiting
    config:
      second: ${rps >= 1 ? Math.round(rps) : null}
      minute: ${Math.round(rps * 60)}
      hour: ${Math.round(rps * 3600)}
      policy: ${policy}${policy === 'redis' ? `
      redis_host: redis.internal
      redis_port: 6379
      redis_database: 0` : ''}
      limit_by: consumer      # or ip, credential, service
      header_name: null
      path: null
      hide_client_headers: false
      fault_tolerant: true    # allow traffic if limiter fails
      # Algorithm: ${ALGO_LABELS[algo]}${algo === 'token_bucket' ? `
      # Burst capacity: ${burst} (Kong uses sliding window internally)` : ''}

# Apply to a specific route:
routes:
  - name: api-route
    paths: ['/api']
    plugins:
      - name: rate-limiting
        config:
          minute: ${Math.round(rps * 60)}
          policy: ${policy}`;
}

function generateVisualization(rps: number, burst: number, windowSec: number, algo: Algorithm): string {
  const timeline = 20; // chars wide = 10 seconds
  const secPerChar = 0.5;
  const capacity = burst > 0 ? burst : Math.round(rps * windowSec);
  let output = '';

  if (algo === 'token_bucket') {
    output += `Token Bucket Visualization (${rps} req/s, burst=${burst})\n`;
    output += '─'.repeat(60) + '\n';
    output += `Bucket capacity: ${capacity} tokens  |  Refill rate: ${rps}/s\n\n`;
    output += 'Time  │ Tokens │ Request │ Status\n';
    output += '──────┼────────┼─────────┼────────\n';
    let tokens = capacity;
    const events = [
      { t: 0.0, reqs: 1 }, { t: 0.1, reqs: 1 }, { t: 0.2, reqs: 1 },
      { t: 0.3, reqs: 3 }, // burst
      { t: 1.0, reqs: 1 }, { t: 2.0, reqs: 1 }, { t: 3.0, reqs: 5 }, // over limit
      { t: 4.0, reqs: 1 },
    ];
    let prevT = 0;
    for (const ev of events) {
      tokens = Math.min(capacity, tokens + (ev.t - prevT) * rps);
      prevT = ev.t;
      for (let i = 0; i < ev.reqs; i++) {
        const allowed = tokens >= 1;
        if (allowed) tokens -= 1;
        const bar = '█'.repeat(Math.max(0, Math.round(tokens))) + '░'.repeat(Math.max(0, capacity - Math.round(tokens)));
        output += `t=${ev.t.toFixed(1)}s │ [${bar.slice(0, 6).padEnd(6)}] │ ${('req #' + (i + 1)).padEnd(8)} │ ${allowed ? '✓ OK' : '✗ 429'}\n`;
      }
    }
    output += '\n[█] = token available  [░] = empty slot\n';

  } else if (algo === 'sliding_window') {
    output += `Sliding Window Visualization (${rps} req/s over ${windowSec}s)\n`;
    output += '─'.repeat(60) + '\n';
    output += `Max: ${Math.round(rps * windowSec)} req/${windowSec}s  |  Window slides with each request\n\n`;
    output += 'Timeline (each ■ = 1 request, window = last 5s)\n\n';
    const maxReq = Math.round(rps * windowSec);
    const reqs = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    let inWindow = 0;
    for (let t = 0; t <= 10; t++) {
      inWindow = Math.min(maxReq, inWindow + (t < 5 ? 2 : 1));
      const bar = '■'.repeat(Math.min(inWindow, 20));
      const allowed = inWindow <= maxReq;
      output += `t=${t.toString().padStart(2)}s │${bar.padEnd(20)}│ ${inWindow}/${maxReq} ${allowed ? '✓' : '✗ LIMIT'}\n`;
    }
    output += '\nWindow slides: old requests fall off the left as time advances\n';

  } else if (algo === 'fixed_window') {
    output += `Fixed Window Visualization (${rps} req/s, window=${windowSec}s)\n`;
    output += '─'.repeat(60) + '\n';
    const maxReq = Math.round(rps * windowSec);
    output += `Max: ${maxReq} requests per ${windowSec}s window  |  Hard reset at boundary\n\n`;
    output += '⚠ Boundary Attack: 2x rate possible at window edges!\n\n';
    output += `Window 1 (t=0–${windowSec}s):\n`;
    output += `${'─'.repeat(windowSec * 2)}\n`;
    output += `Last ${Math.round(maxReq * 0.8)} reqs → │ ← First ${Math.round(maxReq)} reqs = ${Math.round(maxReq * 1.8)} in ${windowSec}s!\n`;
    output += `${'─'.repeat(windowSec * 2)}\n`;
    output += `Window 2 (t=${windowSec}–${windowSec * 2}s):\n\n`;
    output += 'Counter resets → allowed to burst again immediately\n\n';
    for (let i = 0; i < 2; i++) {
      output += `[Window ${i + 1}] `;
      let count = 0;
      for (let j = 0; j < maxReq + 3; j++) {
        count++;
        output += count <= maxReq ? '■' : '✗';
      }
      output += ` (${maxReq} allowed, 3 denied)\n`;
    }

  } else { // leaky_bucket
    output += `Leaky Bucket Visualization (rate=${rps} req/s, queue=${burst})\n`;
    output += '─'.repeat(60) + '\n';
    output += `Output rate: CONSTANT ${rps} req/s  |  Queue depth: ${burst}\n\n`;
    output += 'Bucket (queue):           Output pipe:\n';
    const levels = [burst, burst, Math.round(burst * 0.8), Math.round(burst * 0.5), Math.round(burst * 0.3), 1, 0];
    for (let i = 0; i < levels.length; i++) {
      const level = levels[i];
      const fill = '█'.repeat(level) + '░'.repeat(burst - level);
      const dropping = i < 2 ? ' ← DROP (full!)' : '';
      output += `t=${i}s  [${fill.slice(0, 10).padEnd(10)}]    → ${rps} req/s${dropping}\n`;
    }
    output += '\nBurst of requests fills the bucket; excess is dropped.\n';
    output += 'Output is smooth regardless of input bursts.\n';
  }

  return output;
}

export default function RateLimiterConfigCalculator() {
  const [algo, setAlgo] = useState<Algorithm>('token_bucket');
  const [rps, setRps] = useState('100');
  const [burst, setBurst] = useState('200');
  const [windowSec, setWindowSec] = useState('60');
  const [expectedUsers, setExpectedUsers] = useState('1000');
  const [peakMultiplier, setPeakMultiplier] = useState('3');
  const [outputTab, setOutputTab] = useState<OutputTab>('config');
  const [configTarget, setConfigTarget] = useState<'express' | 'nginx' | 'redis' | 'kong'>('express');
  const [copied, setCopied] = useState(false);

  const rpsNum = parseFloat(rps) || 100;
  const burstNum = parseInt(burst, 10) || 200;
  const windowSecNum = parseInt(windowSec, 10) || 60;
  const usersNum = parseInt(expectedUsers, 10) || 1000;
  const peakMult = parseFloat(peakMultiplier) || 3;

  // Traffic estimation
  const avgRpsPerUser = rpsNum / usersNum;
  const peakRps = rpsNum * peakMult;
  const sustainedRate = rpsNum;
  const p95LatencyMs = Math.round(1000 / rpsNum * 0.95 * 10) / 10;
  const recommendedBurst = Math.round(rpsNum * 2);
  const maxReqPerWindow = Math.round(rpsNum * windowSecNum);
  const refillTimeMs = burstNum > 0 && rpsNum > 0 ? Math.round(burstNum / rpsNum * 1000) : 0;

  const getConfigOutput = (): string => {
    switch (configTarget) {
      case 'express': return generateExpressConfig(rpsNum, burstNum, windowSecNum, algo);
      case 'nginx': return generateNginxConfig(rpsNum, burstNum, algo);
      case 'redis': return generateRedisConfig(rpsNum, burstNum, windowSecNum, algo);
      case 'kong': return generateKongConfig(rpsNum, burstNum, windowSecNum, algo);
    }
  };

  const getVisualization = (): string => generateVisualization(rpsNum, burstNum, windowSecNum, algo);

  const getMetrics = (): string => {
    return `Rate Limiter Metrics — ${ALGO_LABELS[algo]}
${'═'.repeat(50)}

Target Configuration
  Algorithm       : ${ALGO_LABELS[algo]}
  Target RPS      : ${fmt(rpsNum, 1)} req/s
  Window Size     : ${windowSecNum}s
  Burst Capacity  : ${burstNum} requests
  Expected Users  : ${fmt(usersNum)}

Calculated Limits
  Max per window  : ${fmt(maxReqPerWindow)} req/${windowSecNum}s
  Max per minute  : ${fmt(rpsNum * 60)} req/min
  Max per hour    : ${fmt(rpsNum * 3600)} req/hr
  Sustained rate  : ${fmt(sustainedRate, 1)} req/s
  Peak (${peakMult}x)     : ${fmt(peakRps, 1)} req/s

Token Bucket Specifics
  Refill rate     : ${fmt(rpsNum, 2)} tokens/s
  Full refill in  : ${refillTimeMs > 0 ? (refillTimeMs < 1000 ? refillTimeMs + 'ms' : (refillTimeMs / 1000).toFixed(1) + 's') : 'N/A'}
  Burst capacity  : ${burstNum} tokens
  Recommended     : ${recommendedBurst} tokens (2x rate)

Traffic Estimation
  Users           : ${fmt(usersNum)}
  Avg/user        : ${avgRpsPerUser.toFixed(4)} req/s
  Peak scenario   : ${fmt(peakRps, 1)} req/s (${peakMult}x multiplier)
  P95 latency est : ~${p95LatencyMs}ms at target rate

HTTP Headers to Return
  X-RateLimit-Limit     : ${maxReqPerWindow}
  X-RateLimit-Remaining : <current_remaining>
  X-RateLimit-Reset     : <unix_timestamp>
  Retry-After           : ${windowSecNum}  (on 429)

Algorithm Notes
${algo === 'token_bucket' ? `  • Best for: APIs with bursty traffic patterns
  • Allows burst=${burstNum} then throttles to ${rpsNum} req/s
  • Clients can "save up" capacity during low usage` : ''}${algo === 'sliding_window' ? `  • Best for: strict fairness, accurate enforcement
  • No boundary attack vulnerability (unlike Fixed Window)
  • Higher memory: O(requests) per user per window
  • Recommended for: public APIs, financial services` : ''}${algo === 'fixed_window' ? `  • Best for: simple counting, low memory usage
  • WARNING: allows ${maxReqPerWindow * 2} req in worst case (boundary attack)
  • Mitigate: use shorter windows or sliding window instead
  • Recommended for: internal APIs, less critical paths` : ''}${algo === 'leaky_bucket' ? `  • Best for: downstream service protection, smooth flow
  • Guarantees constant output rate of ${rpsNum} req/s
  • Queue depth ${burstNum}: excess requests dropped (not queued forever)
  • Recommended for: payment gateways, third-party APIs` : ''}`;
  };

  const getOutput = (): string => {
    if (outputTab === 'config') return getConfigOutput();
    if (outputTab === 'visualization') return getVisualization();
    return getMetrics();
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getOutput());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const OUTPUT_TABS: { key: OutputTab; label: string }[] = [
    { key: 'config', label: 'Config' },
    { key: 'visualization', label: 'Visualization' },
    { key: 'metrics', label: 'Metrics' },
  ];

  const CONFIG_TARGETS = [
    { key: 'express' as const, label: 'Express.js' },
    { key: 'nginx' as const, label: 'Nginx' },
    { key: 'redis' as const, label: 'Redis Lua' },
    { key: 'kong' as const, label: 'Kong' },
  ];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT — Config form */}
      <div class="space-y-5">
        {/* Algorithm selector */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Algorithm</label>
          <div class="grid grid-cols-2 gap-2">
            {(Object.keys(ALGO_LABELS) as Algorithm[]).map(a => (
              <button
                key={a}
                onClick={() => setAlgo(a)}
                class={`px-3 py-2 rounded text-sm border transition-colors text-left ${
                  algo === a
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text-muted hover:border-accent'
                }`}
              >
                {ALGO_LABELS[a]}
              </button>
            ))}
          </div>
          <p class="mt-2 text-xs text-text-muted bg-surface-alt border border-border rounded px-3 py-2">
            {ALGO_DESC[algo]}
          </p>
        </div>

        {/* Core inputs */}
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Target RPS</label>
            <input
              type="number"
              min="0.1"
              step="any"
              value={rps}
              onInput={e => setRps((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent text-text"
              placeholder="100"
            />
            <p class="text-xs text-text-muted mt-1">requests / second</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">
              {algo === 'leaky_bucket' ? 'Queue Depth' : 'Burst Capacity'}
            </label>
            <input
              type="number"
              min="1"
              value={burst}
              onInput={e => setBurst((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent text-text"
              placeholder="200"
            />
            <p class="text-xs text-text-muted mt-1">
              {algo === 'token_bucket' ? 'max tokens in bucket' : algo === 'leaky_bucket' ? 'max queue depth' : 'burst allowance'}
            </p>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Window Size (s)</label>
            <input
              type="number"
              min="1"
              value={windowSec}
              onInput={e => setWindowSec((e.target as HTMLInputElement).value)}
              class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent text-text"
              placeholder="60"
            />
            <p class="text-xs text-text-muted mt-1">seconds per window</p>
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Effective Max</label>
            <div class="bg-surface-alt border border-border rounded px-3 py-2 text-sm font-mono text-accent font-bold">
              {fmt(maxReqPerWindow)} req/{windowSecNum}s
            </div>
            <p class="text-xs text-text-muted mt-1">= {fmt(rpsNum, 1)} × {windowSecNum}s</p>
          </div>
        </div>

        {/* Traffic estimator */}
        <div class="border border-border rounded-lg p-4 space-y-3 bg-surface-alt">
          <h3 class="text-sm font-medium">Traffic Estimator</h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs text-text-muted mb-1">Expected Users</label>
              <input
                type="number"
                min="1"
                value={expectedUsers}
                onInput={e => setExpectedUsers((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent text-text"
                placeholder="1000"
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Peak Multiplier</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={peakMultiplier}
                onInput={e => setPeakMultiplier((e.target as HTMLInputElement).value)}
                class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent text-text"
                placeholder="3"
              />
            </div>
          </div>
          <div class="grid grid-cols-3 gap-2 text-xs">
            {[
              { label: 'Avg/user', value: `${avgRpsPerUser.toFixed(4)} req/s` },
              { label: 'Peak RPS', value: `${fmt(peakRps, 0)} req/s` },
              { label: 'Rec. burst', value: `${recommendedBurst} tokens` },
            ].map(m => (
              <div key={m.label} class="bg-surface border border-border rounded px-2 py-1.5 text-center">
                <p class="text-text-muted">{m.label}</p>
                <p class="font-mono font-bold text-text">{m.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT — Output */}
      <div class="space-y-3">
        {/* Output tabs */}
        <div class="flex gap-1">
          {OUTPUT_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setOutputTab(tab.key)}
              class={`px-3 py-1.5 rounded text-sm border transition-colors ${
                outputTab === tab.key
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Config target (only when config tab active) */}
        {outputTab === 'config' && (
          <div class="flex gap-1 flex-wrap">
            {CONFIG_TARGETS.map(t => (
              <button
                key={t.key}
                onClick={() => setConfigTarget(t.key)}
                class={`px-2 py-1 rounded text-xs border transition-colors ${
                  configTarget === t.key
                    ? 'bg-surface-alt text-text border-accent'
                    : 'bg-surface border-border text-text-muted hover:border-accent'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Output area */}
        <div class="relative">
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap">{getOutput()}</pre>
          <button
            onClick={handleCopy}
            class="absolute top-2 right-2 px-2 py-1 bg-accent hover:bg-accent/80 text-white rounded text-xs transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>

        {/* Quick reference */}
        <div class="text-xs text-text-muted space-y-1 bg-surface-alt border border-border rounded p-3">
          <p class="font-medium text-text">Response headers for 429:</p>
          <p class="font-mono">Retry-After: {windowSecNum}</p>
          <p class="font-mono">X-RateLimit-Limit: {maxReqPerWindow}</p>
          <p class="font-mono">X-RateLimit-Reset: &lt;unix_ts&gt;</p>
        </div>
      </div>
    </div>
  );
}
