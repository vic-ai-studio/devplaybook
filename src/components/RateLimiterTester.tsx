import { useState, useEffect, useRef, useCallback } from 'preact/hooks';

type Algorithm = 'token_bucket' | 'sliding_window' | 'fixed_window';

interface RequestEntry {
  id: number;
  timestamp: number;
  wallTime: string;
  allowed: boolean;
  reason: string;
}

interface Config {
  maxRequests: number;
  windowSecs: number;
  algorithm: Algorithm;
  burstSize: number;
}

// ── Algorithm implementations ─────────────────────────────────────────────────

class TokenBucket {
  tokens: number;
  lastRefill: number;
  maxTokens: number;
  refillRate: number; // tokens per ms

  constructor(maxRequests: number, windowSecs: number, burstSize: number) {
    this.maxTokens = burstSize;
    this.tokens = burstSize;
    this.refillRate = maxRequests / (windowSecs * 1000);
    this.lastRefill = performance.now();
  }

  consume(): { allowed: boolean; tokens: number } {
    const now = performance.now();
    const elapsed = now - this.lastRefill;
    this.tokens = Math.min(this.maxTokens, this.tokens + elapsed * this.refillRate);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return { allowed: true, tokens: this.tokens };
    }
    return { allowed: false, tokens: this.tokens };
  }

  fillPct(): number {
    return Math.min(1, this.tokens / this.maxTokens);
  }
}

class SlidingWindow {
  timestamps: number[];
  maxRequests: number;
  windowMs: number;

  constructor(maxRequests: number, windowSecs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSecs * 1000;
    this.timestamps = [];
  }

  consume(): { allowed: boolean; count: number } {
    const now = performance.now();
    this.timestamps = this.timestamps.filter(t => now - t < this.windowMs);

    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return { allowed: true, count: this.timestamps.length };
    }
    return { allowed: false, count: this.timestamps.length };
  }

  countInWindow(): number {
    const now = performance.now();
    return this.timestamps.filter(t => now - t < this.windowMs).length;
  }
}

class FixedWindow {
  count: number;
  windowStart: number;
  maxRequests: number;
  windowMs: number;

  constructor(maxRequests: number, windowSecs: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSecs * 1000;
    this.count = 0;
    this.windowStart = performance.now();
  }

  consume(): { allowed: boolean; count: number; resetsIn: number } {
    const now = performance.now();
    if (now - this.windowStart >= this.windowMs) {
      this.count = 0;
      this.windowStart = now;
    }
    const resetsIn = this.windowMs - (now - this.windowStart);

    if (this.count < this.maxRequests) {
      this.count += 1;
      return { allowed: true, count: this.count, resetsIn };
    }
    return { allowed: false, count: this.count, resetsIn };
  }

  windowProgress(): number {
    const now = performance.now();
    return Math.min(1, (now - this.windowStart) / this.windowMs);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString('en', { hour12: false }) + '.' + String(d.getMilliseconds()).padStart(3, '0');
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function RateLimiterTester() {
  const [config, setConfig] = useState<Config>({
    maxRequests: 10,
    windowSecs: 60,
    algorithm: 'token_bucket',
    burstSize: 10,
  });

  const [entries, setEntries] = useState<RequestEntry[]>([]);
  const [reqCounter, setReqCounter] = useState(0);
  const [autoOn, setAutoOn] = useState(false);
  const [autoInterval, setAutoInterval] = useState(2);
  const [fillPct, setFillPct] = useState(1);
  const [windowCount, setWindowCount] = useState(0);
  const [windowProgress, setWindowProgress] = useState(0);

  const bucketRef = useRef<TokenBucket | null>(null);
  const slidingRef = useRef<SlidingWindow | null>(null);
  const fixedRef = useRef<FixedWindow | null>(null);
  const counterRef = useRef(0);
  const autoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const uiTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialise or re-initialise limiters when config changes
  const initLimiters = useCallback((cfg: Config) => {
    bucketRef.current = new TokenBucket(cfg.maxRequests, cfg.windowSecs, cfg.burstSize);
    slidingRef.current = new SlidingWindow(cfg.maxRequests, cfg.windowSecs);
    fixedRef.current = new FixedWindow(cfg.maxRequests, cfg.windowSecs);
  }, []);

  useEffect(() => {
    initLimiters(config);
  }, []);

  // UI refresh timer (updates progress bars every 200ms)
  useEffect(() => {
    uiTimerRef.current = setInterval(() => {
      if (config.algorithm === 'token_bucket' && bucketRef.current) {
        // Recalculate fill without consuming
        const now = performance.now();
        const b = bucketRef.current;
        const elapsed = now - b.lastRefill;
        const projected = Math.min(b.maxTokens, b.tokens + elapsed * b.refillRate);
        setFillPct(projected / b.maxTokens);
      } else if (config.algorithm === 'sliding_window' && slidingRef.current) {
        setWindowCount(slidingRef.current.countInWindow());
      } else if (config.algorithm === 'fixed_window' && fixedRef.current) {
        setWindowProgress(fixedRef.current.windowProgress());
        setWindowCount(fixedRef.current.count);
      }
    }, 200);
    return () => {
      if (uiTimerRef.current) clearInterval(uiTimerRef.current);
    };
  }, [config.algorithm]);

  const fireRequest = useCallback(() => {
    counterRef.current += 1;
    const id = counterRef.current;
    setReqCounter(id);

    let allowed = false;
    let reason = '';

    if (config.algorithm === 'token_bucket' && bucketRef.current) {
      const res = bucketRef.current.consume();
      allowed = res.allowed;
      reason = allowed
        ? `${res.tokens.toFixed(1)} tokens remaining`
        : `bucket empty — ${res.tokens.toFixed(1)} tokens`;
      setFillPct(bucketRef.current.fillPct());
    } else if (config.algorithm === 'sliding_window' && slidingRef.current) {
      const res = slidingRef.current.consume();
      allowed = res.allowed;
      reason = allowed
        ? `${res.count}/${config.maxRequests} in window`
        : `window full (${res.count}/${config.maxRequests})`;
      setWindowCount(slidingRef.current.countInWindow());
    } else if (config.algorithm === 'fixed_window' && fixedRef.current) {
      const res = fixedRef.current.consume();
      allowed = res.allowed;
      const resetsSec = (res.resetsIn / 1000).toFixed(1);
      reason = allowed
        ? `${res.count}/${config.maxRequests} in window`
        : `window full — resets in ${resetsSec}s`;
      setWindowCount(fixedRef.current.count);
    }

    const entry: RequestEntry = {
      id,
      timestamp: Date.now(),
      wallTime: fmtTime(Date.now()),
      allowed,
      reason,
    };

    setEntries(prev => [entry, ...prev].slice(0, 200));
  }, [config]);

  const handleFlood = useCallback(() => {
    for (let i = 0; i < 10; i++) {
      setTimeout(fireRequest, i * 30);
    }
  }, [fireRequest]);

  const handleReset = useCallback(() => {
    initLimiters(config);
    setEntries([]);
    setReqCounter(0);
    counterRef.current = 0;
    setFillPct(1);
    setWindowCount(0);
    setWindowProgress(0);
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoOn(false);
  }, [config, initLimiters]);

  const toggleAuto = useCallback(() => {
    if (autoOn) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      setAutoOn(false);
    } else {
      autoTimerRef.current = setInterval(fireRequest, autoInterval * 1000);
      setAutoOn(true);
    }
  }, [autoOn, autoInterval, fireRequest]);

  // Restart auto timer when interval changes while running
  useEffect(() => {
    if (autoOn) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      autoTimerRef.current = setInterval(fireRequest, autoInterval * 1000);
    }
  }, [autoInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      if (uiTimerRef.current) clearInterval(uiTimerRef.current);
    };
  }, []);

  const handleConfigChange = (patch: Partial<Config>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    initLimiters(next);
    setEntries([]);
    counterRef.current = 0;
    setReqCounter(0);
    setFillPct(1);
    setWindowCount(0);
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
      setAutoOn(false);
    }
  };

  const total = entries.length;
  const allowed = entries.filter(e => e.allowed).length;
  const throttled = total - allowed;
  const throttleRate = total > 0 ? ((throttled / total) * 100).toFixed(1) : '0.0';

  const algoLabel: Record<Algorithm, string> = {
    token_bucket: 'Token Bucket',
    sliding_window: 'Sliding Window',
    fixed_window: 'Fixed Window',
  };

  return (
    <div class="space-y-5">

      {/* ── Configuration ── */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Configuration</h2>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          <div>
            <label class="block text-xs font-medium text-text-muted mb-1.5">Algorithm</label>
            <select
              value={config.algorithm}
              onChange={e => handleConfigChange({ algorithm: (e.target as HTMLSelectElement).value as Algorithm })}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            >
              <option value="token_bucket">Token Bucket</option>
              <option value="sliding_window">Sliding Window</option>
              <option value="fixed_window">Fixed Window</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-1.5">Max requests / window</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={config.maxRequests}
              onInput={e => handleConfigChange({ maxRequests: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) })}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-1.5">Window size (seconds)</label>
            <input
              type="number"
              min="1"
              max="3600"
              value={config.windowSecs}
              onInput={e => handleConfigChange({ windowSecs: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) })}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-1.5">
              Burst size
              {config.algorithm !== 'token_bucket' && (
                <span class="ml-1 text-text-muted opacity-50">(token bucket only)</span>
              )}
            </label>
            <input
              type="number"
              min="1"
              max="1000"
              value={config.burstSize}
              disabled={config.algorithm !== 'token_bucket'}
              onInput={e => handleConfigChange({ burstSize: Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1) })}
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            />
          </div>

        </div>
      </div>

      {/* ── Status gauge ── */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">
            {config.algorithm === 'token_bucket' ? 'Token Bucket Fill Level' :
             config.algorithm === 'sliding_window' ? 'Requests in Current Window' :
             'Fixed Window Progress'}
          </h2>
          <span class="text-xs font-mono text-text-muted">
            {config.algorithm === 'token_bucket'
              ? `${(fillPct * config.burstSize).toFixed(1)} / ${config.burstSize} tokens`
              : `${windowCount} / ${config.maxRequests} requests`}
          </span>
        </div>

        {config.algorithm === 'token_bucket' && (
          <div class="relative h-4 bg-bg rounded-full overflow-hidden border border-border">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
              style={{
                width: `${fillPct * 100}%`,
                background: fillPct > 0.5 ? '#22c55e' : fillPct > 0.2 ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        )}

        {config.algorithm === 'sliding_window' && (
          <div class="relative h-4 bg-bg rounded-full overflow-hidden border border-border">
            <div
              class="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
              style={{
                width: `${Math.min(1, windowCount / config.maxRequests) * 100}%`,
                background: windowCount < config.maxRequests * 0.5 ? '#22c55e' : windowCount < config.maxRequests ? '#f59e0b' : '#ef4444',
              }}
            />
          </div>
        )}

        {config.algorithm === 'fixed_window' && (
          <div class="space-y-2">
            <div class="relative h-4 bg-bg rounded-full overflow-hidden border border-border">
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-200 bg-blue-500 opacity-40"
                style={{ width: `${windowProgress * 100}%` }}
              />
              <div
                class="absolute inset-y-0 left-0 rounded-full transition-all duration-200"
                style={{
                  width: `${Math.min(1, windowCount / config.maxRequests) * 100}%`,
                  background: windowCount < config.maxRequests * 0.5 ? '#22c55e' : windowCount < config.maxRequests ? '#f59e0b' : '#ef4444',
                  opacity: 0.85,
                }}
              />
            </div>
            <p class="text-xs text-text-muted">Blue = elapsed window time &nbsp;|&nbsp; Coloured = request fill</p>
          </div>
        )}

        <div class="mt-2 flex items-center gap-4 text-xs text-text-muted">
          <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-green-500" /> Healthy</span>
          <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-amber-500" /> Warning</span>
          <span class="flex items-center gap-1"><span class="inline-block w-2 h-2 rounded-full bg-red-500" /> Throttling</span>
        </div>
      </div>

      {/* ── Stats ── */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total sent', value: String(total), color: '' },
          { label: 'Allowed', value: String(allowed), color: 'text-green-500' },
          { label: 'Throttled', value: String(throttled), color: 'text-red-500' },
          { label: 'Throttle rate', value: `${throttleRate}%`, color: parseFloat(throttleRate) > 0 ? 'text-amber-500' : '' },
        ].map(s => (
          <div class="bg-bg-card border border-border rounded-xl p-4 text-center">
            <p class="text-xs text-text-muted mb-1">{s.label}</p>
            <p class={`text-2xl font-bold font-mono ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide mb-4">Simulation Controls</h2>
        <div class="flex flex-wrap gap-3 items-center">

          <button
            onClick={fireRequest}
            class="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:opacity-90 transition-opacity active:scale-95"
          >
            + Add Request
          </button>

          <button
            onClick={handleFlood}
            class="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:opacity-90 transition-opacity active:scale-95"
          >
            Flood (10 requests)
          </button>

          <div class="flex items-center gap-2 pl-1 border-l border-border">
            <button
              onClick={toggleAuto}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-all active:scale-95 ${
                autoOn
                  ? 'bg-red-500 text-white hover:opacity-90'
                  : 'bg-bg border border-border text-text hover:border-primary hover:text-primary'
              }`}
            >
              {autoOn ? 'Stop Auto' : 'Start Auto'}
            </button>
            <span class="text-sm text-text-muted">every</span>
            <input
              type="number"
              min="0.5"
              max="60"
              step="0.5"
              value={autoInterval}
              onInput={e => setAutoInterval(Math.max(0.5, parseFloat((e.target as HTMLInputElement).value) || 1))}
              class="w-16 bg-bg border border-border rounded-lg px-2 py-2 text-sm text-center focus:outline-none focus:border-primary transition-colors"
            />
            <span class="text-sm text-text-muted">s</span>
          </div>

          <button
            onClick={handleReset}
            class="ml-auto px-4 py-2 rounded-lg bg-bg border border-border text-sm text-text-muted hover:border-red-500 hover:text-red-500 transition-colors active:scale-95"
          >
            Reset
          </button>
        </div>
      </div>

      {/* ── Request timeline ── */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Request Timeline</h2>
          <span class="text-xs text-text-muted">{algoLabel[config.algorithm]} · {config.maxRequests} req / {config.windowSecs}s</span>
        </div>

        {entries.length === 0 ? (
          <div class="text-center py-12 text-text-muted text-sm">
            <p class="text-3xl mb-3">⚡</p>
            <p>No requests yet. Click <strong>+ Add Request</strong> or <strong>Flood</strong> to start.</p>
          </div>
        ) : (
          <div class="space-y-1 max-h-96 overflow-y-auto pr-1">
            {entries.map(entry => (
              <div
                key={entry.id}
                class={`flex items-center gap-3 px-3 py-2 rounded-lg border text-sm font-mono transition-all ${
                  entry.allowed
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                }`}
              >
                <span class="text-text-muted text-xs w-28 shrink-0">{entry.wallTime}</span>
                <span class="text-text-muted text-xs w-16 shrink-0">#{entry.id}</span>
                <span
                  class={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${
                    entry.allowed
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-red-500/20 text-red-500'
                  }`}
                >
                  {entry.allowed ? 'ALLOWED' : '429'}
                </span>
                <span class="text-text-muted text-xs truncate">{entry.reason}</span>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
