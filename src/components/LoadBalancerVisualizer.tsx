import { useState, useRef, useEffect, useCallback } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

type Algorithm = 'round-robin' | 'least-connections' | 'ip-hash' | 'weighted-round-robin' | 'random' | 'least-response-time';

interface Server {
  id: number;
  name: string;
  connections: number;
  totalRequests: number;
  health: 'healthy' | 'degraded' | 'down';
  weight: number;
  responseTime: number; // ms (simulated)
}

interface RequestDot {
  id: number;
  targetServer: number;
  animating: boolean;
}

// ── Algorithm metadata ─────────────────────────────────────────────────────────

interface AlgorithmInfo {
  label: string;
  description: string;
}

const ALGORITHMS: Record<Algorithm, AlgorithmInfo> = {
  'round-robin': {
    label: 'Round Robin',
    description:
      'Distributes requests sequentially to each server in a repeating cycle. Best for homogeneous servers with roughly equal capacity and uniform request cost. Simple, predictable, and requires no state about ongoing connections.',
  },
  'least-connections': {
    label: 'Least Connections',
    description:
      'Routes each new request to the server currently handling the fewest active connections. Ideal when requests vary significantly in processing time, since it naturally avoids overloading busy servers.',
  },
  'ip-hash': {
    label: 'IP Hash',
    description:
      'Hashes the client IP address to deterministically assign it to a specific server. Best for stateful applications where session affinity (sticky sessions) is needed, ensuring the same client always reaches the same backend.',
  },
  'weighted-round-robin': {
    label: 'Weighted Round Robin',
    description:
      'Extends Round Robin by assigning a numeric weight to each server; higher-weight servers receive proportionally more requests. Use when servers have different processing capacity or hardware specs.',
  },
  random: {
    label: 'Random',
    description:
      'Picks a healthy server uniformly at random for each request. Works well under high traffic where statistical distribution is sufficient, and avoids coordination overhead of tracking connection state.',
  },
  'least-response-time': {
    label: 'Least Response Time',
    description:
      'Combines active connection count with average response time to select the server likely to respond fastest. Ideal for latency-sensitive APIs where backend response times fluctuate.',
  },
};

const ALGORITHM_ORDER: Algorithm[] = [
  'round-robin',
  'least-connections',
  'ip-hash',
  'weighted-round-robin',
  'random',
  'least-response-time',
];

// ── Server colors ──────────────────────────────────────────────────────────────

const SERVER_COLORS = [
  { bg: 'bg-blue-500/15', border: 'border-blue-500/40', accent: 'bg-blue-500', text: 'text-blue-400', bar: 'bg-blue-500' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500/40', accent: 'bg-violet-500', text: 'text-violet-400', bar: 'bg-violet-500' },
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', accent: 'bg-emerald-500', text: 'text-emerald-400', bar: 'bg-emerald-500' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', accent: 'bg-amber-500', text: 'text-amber-400', bar: 'bg-amber-500' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/40', accent: 'bg-rose-500', text: 'text-rose-400', bar: 'bg-rose-500' },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function hashIp(ip: string, serverCount: number): number {
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = (hash * 31 + ip.charCodeAt(i)) >>> 0;
  }
  return hash % serverCount;
}

function pickServer(
  servers: Server[],
  algorithm: Algorithm,
  rrCursor: number,
  wrCursor: number,
  requestIndex: number,
): { serverId: number; nextRrCursor: number; nextWrCursor: number } {
  const alive = servers.filter(s => s.health !== 'down');
  if (alive.length === 0) return { serverId: 0, nextRrCursor: rrCursor, nextWrCursor: wrCursor };

  switch (algorithm) {
    case 'round-robin': {
      // advance cursor among alive servers
      const idx = rrCursor % alive.length;
      return { serverId: alive[idx].id, nextRrCursor: (rrCursor + 1) % alive.length, nextWrCursor: wrCursor };
    }
    case 'least-connections': {
      const best = alive.reduce((a, b) => (a.connections <= b.connections ? a : b));
      return { serverId: best.id, nextRrCursor: rrCursor, nextWrCursor: wrCursor };
    }
    case 'ip-hash': {
      // simulate a distinct IP per request batch of 10 (each batch = one "client")
      const fakeIp = `192.168.1.${(requestIndex % 256)}`;
      const aliveIdx = hashIp(fakeIp, alive.length);
      return { serverId: alive[aliveIdx].id, nextRrCursor: rrCursor, nextWrCursor: wrCursor };
    }
    case 'weighted-round-robin': {
      // build an expanded pool of server IDs according to weight
      const pool: number[] = [];
      for (const s of alive) {
        for (let w = 0; w < s.weight; w++) pool.push(s.id);
      }
      const idx = wrCursor % pool.length;
      return { serverId: pool[idx], nextRrCursor: rrCursor, nextWrCursor: (wrCursor + 1) % pool.length };
    }
    case 'random': {
      const pick = alive[Math.floor(Math.random() * alive.length)];
      return { serverId: pick.id, nextRrCursor: rrCursor, nextWrCursor: wrCursor };
    }
    case 'least-response-time': {
      // score = connections * responseTime (lower is better)
      const best = alive.reduce((a, b) =>
        a.connections * a.responseTime <= b.connections * b.responseTime ? a : b,
      );
      return { serverId: best.id, nextRrCursor: rrCursor, nextWrCursor: wrCursor };
    }
    default:
      return { serverId: alive[0].id, nextRrCursor: rrCursor, nextWrCursor: wrCursor };
  }
}

function uniformityScore(servers: Server[]): number {
  const counts = servers.map(s => s.totalRequests);
  const total = counts.reduce((a, b) => a + b, 0);
  if (total === 0) return 100;
  const avg = total / counts.length;
  const variance = counts.reduce((sum, c) => sum + Math.pow(c - avg, 2), 0) / counts.length;
  const stddev = Math.sqrt(variance);
  const cv = avg > 0 ? stddev / avg : 0; // coefficient of variation (0 = perfect)
  return Math.max(0, Math.round((1 - cv) * 100));
}

function initialServers(count: number): Server[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `Server ${i + 1}`,
    connections: 0,
    totalRequests: 0,
    health: 'healthy' as const,
    weight: 1,
    responseTime: 50 + i * 30, // simulate different response times: 50ms, 80ms, 110ms...
  }));
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function LoadBalancerVisualizer() {
  const [algorithm, setAlgorithm] = useState<Algorithm>('round-robin');
  const [serverCount, setServerCount] = useState(3);
  const [servers, setServers] = useState<Server[]>(() => initialServers(3));
  const [totalRequests, setTotalRequests] = useState(0);
  const [running, setRunning] = useState(false);
  const [requestDots, setRequestDots] = useState<RequestDot[]>([]);
  const [rrCursor, setRrCursor] = useState(0);
  const [wrCursor, setWrCursor] = useState(0);
  const requestIndexRef = useRef(0);
  const dotIdRef = useRef(0);

  // Sync server list when serverCount changes
  useEffect(() => {
    setServers(prev => {
      const next = initialServers(serverCount);
      // preserve health and weight settings
      for (let i = 0; i < Math.min(prev.length, next.length); i++) {
        next[i].health = prev[i].health;
        next[i].weight = prev[i].weight;
      }
      return next;
    });
    setRrCursor(0);
    setWrCursor(0);
  }, [serverCount]);

  const handleReset = useCallback(() => {
    setServers(prev => prev.map(s => ({ ...s, connections: 0, totalRequests: 0 })));
    setTotalRequests(0);
    setRequestDots([]);
    setRrCursor(0);
    setWrCursor(0);
    requestIndexRef.current = 0;
  }, []);

  const handleSend10 = useCallback(() => {
    if (running) return;
    setRunning(true);

    let currentRrCursor = rrCursor;
    let currentWrCursor = wrCursor;
    let currentRequestIndex = requestIndexRef.current;

    const sendOne = (i: number) => {
      setServers(prev => {
        const result = pickServer(prev, algorithm, currentRrCursor, currentWrCursor, currentRequestIndex);
        currentRrCursor = result.nextRrCursor;
        currentWrCursor = result.nextWrCursor;
        currentRequestIndex++;

        const dotId = ++dotIdRef.current;
        setRequestDots(d => [...d, { id: dotId, targetServer: result.serverId, animating: true }]);
        setTimeout(() => {
          setRequestDots(d => d.filter(x => x.id !== dotId));
        }, 700);

        return prev.map(s =>
          s.id === result.serverId
            ? { ...s, connections: s.connections + 1, totalRequests: s.totalRequests + 1 }
            : s,
        );
      });
      setTotalRequests(t => t + 1);

      // Simulate connection ending after ~500ms
      setTimeout(() => {
        setServers(prev =>
          prev.map(s =>
            s.id === (servers.find((_, idx) => idx === i)?.id ?? -1)
              ? s
              : s,
          ),
        );
      }, 500);

      if (i < 9) {
        setTimeout(() => sendOne(i + 1), 200);
      } else {
        setTimeout(() => {
          setRrCursor(currentRrCursor);
          setWrCursor(currentWrCursor);
          requestIndexRef.current = currentRequestIndex;
          setRunning(false);
        }, 250);
      }
    };

    sendOne(0);
  }, [running, algorithm, rrCursor, wrCursor, servers]);

  const handleHealthToggle = useCallback((serverId: number) => {
    setServers(prev =>
      prev.map(s => {
        if (s.id !== serverId) return s;
        const cycle: Record<Server['health'], Server['health']> = {
          healthy: 'degraded',
          degraded: 'down',
          down: 'healthy',
        };
        return { ...s, health: cycle[s.health] };
      }),
    );
  }, []);

  const handleWeightChange = useCallback((serverId: number, weight: number) => {
    setServers(prev => prev.map(s => (s.id === serverId ? { ...s, weight } : s)));
    setWrCursor(0); // reset WRR cursor when weights change
  }, []);

  const score = uniformityScore(servers);
  const maxRequests = Math.max(...servers.map(s => s.totalRequests), 1);

  const healthColors: Record<Server['health'], string> = {
    healthy: 'bg-emerald-500',
    degraded: 'bg-amber-500',
    down: 'bg-red-500',
  };
  const healthLabels: Record<Server['health'], string> = {
    healthy: 'Healthy',
    degraded: 'Degraded',
    down: 'Down',
  };

  return (
    <div class="space-y-5">
      {/* Algorithm tabs */}
      <div>
        <p class="text-xs font-medium text-text-muted uppercase tracking-wider mb-2">Algorithm</p>
        <div class="flex flex-wrap gap-2">
          {ALGORITHM_ORDER.map(alg => (
            <button
              key={alg}
              onClick={() => { setAlgorithm(alg); handleReset(); }}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                algorithm === alg
                  ? 'bg-primary text-white'
                  : 'bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {ALGORITHMS[alg].label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls row */}
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex items-center gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-sm text-text-muted">Servers:</span>
            {[3, 4, 5].map(n => (
              <button
                key={n}
                onClick={() => { setServerCount(n); handleReset(); }}
                class={`w-8 h-8 rounded text-sm font-medium transition-colors ${
                  serverCount === n
                    ? 'bg-primary text-white'
                    : 'bg-bg-card border border-border text-text-muted hover:border-primary'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          <div class="h-5 w-px bg-border hidden sm:block" />
          <span class="text-sm font-mono text-text">
            Total requests: <span class="font-bold text-primary">{totalRequests}</span>
          </span>
        </div>
        <div class="flex gap-2">
          <button
            onClick={handleSend10}
            disabled={running}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? 'Sending...' : 'Send 10 Requests'}
          </button>
          <button
            onClick={handleReset}
            disabled={running}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-red-400 hover:text-red-400 transition-colors disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>

      {/* Server cards */}
      <div class={`grid gap-3 ${serverCount === 3 ? 'grid-cols-3' : serverCount === 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-5'}`}>
        {servers.map((server, idx) => {
          const color = SERVER_COLORS[idx % SERVER_COLORS.length];
          const activeDots = requestDots.filter(d => d.targetServer === server.id);
          const isDown = server.health === 'down';
          return (
            <div
              key={server.id}
              class={`relative rounded-xl border p-3 transition-all ${color.bg} ${color.border} ${isDown ? 'opacity-50' : ''}`}
            >
              {/* Incoming request dots */}
              {activeDots.map(dot => (
                <span
                  key={dot.id}
                  class={`absolute -top-2 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full ${color.accent} shadow-lg animate-bounce`}
                  style="animation-duration:0.35s"
                />
              ))}

              <div class="flex items-center justify-between mb-2">
                <span class={`text-xs font-bold ${color.text}`}>{server.name}</span>
                <button
                  onClick={() => handleHealthToggle(server.id)}
                  title={`Toggle health (current: ${server.health})`}
                  class={`w-2.5 h-2.5 rounded-full ${healthColors[server.health]} cursor-pointer flex-shrink-0 hover:ring-2 ring-offset-1 ring-current transition`}
                />
              </div>

              <div class="space-y-1 text-xs text-text-muted">
                <div class="flex justify-between">
                  <span>Active</span>
                  <span class="font-mono font-medium text-text">{server.connections}</span>
                </div>
                <div class="flex justify-between">
                  <span>Total</span>
                  <span class="font-mono font-medium text-text">{server.totalRequests}</span>
                </div>
                {algorithm === 'least-response-time' && (
                  <div class="flex justify-between">
                    <span>Avg RT</span>
                    <span class="font-mono font-medium text-text">{server.responseTime}ms</span>
                  </div>
                )}
              </div>

              {algorithm === 'weighted-round-robin' && (
                <div class="mt-2">
                  <label class="text-xs text-text-muted">Weight</label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={server.weight}
                    onInput={(e) => handleWeightChange(server.id, parseInt((e.target as HTMLInputElement).value, 10))}
                    class="w-full accent-primary h-1 mt-1"
                  />
                  <span class="text-xs font-mono font-bold text-text">{server.weight}</span>
                </div>
              )}

              <div class="mt-2 text-xs text-center">
                <span class={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                  server.health === 'healthy' ? 'bg-emerald-500/20 text-emerald-400'
                  : server.health === 'degraded' ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-red-500/20 text-red-400'
                }`}>
                  {healthLabels[server.health]}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stats panel */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-text">Distribution Stats</p>
          <div class="flex items-center gap-2">
            <span class="text-xs text-text-muted">Uniformity</span>
            <span class={`text-sm font-bold tabular-nums ${score >= 80 ? 'text-emerald-400' : score >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
              {score}%
            </span>
          </div>
        </div>

        {/* Per-server bar chart */}
        <div class="space-y-2">
          {servers.map((server, idx) => {
            const color = SERVER_COLORS[idx % SERVER_COLORS.length];
            const pct = totalRequests > 0 ? Math.round((server.totalRequests / totalRequests) * 100) : 0;
            const barWidth = maxRequests > 0 ? Math.round((server.totalRequests / maxRequests) * 100) : 0;
            return (
              <div key={server.id} class="flex items-center gap-2">
                <span class={`text-xs font-medium w-16 shrink-0 ${color.text}`}>{server.name}</span>
                <div class="flex-1 bg-bg rounded-full h-2 overflow-hidden">
                  <div
                    class={`h-2 rounded-full transition-all duration-300 ${color.bar}`}
                    style={`width:${barWidth}%`}
                  />
                </div>
                <span class="text-xs font-mono text-text-muted w-20 text-right shrink-0">
                  {server.totalRequests} req ({pct}%)
                </span>
              </div>
            );
          })}
        </div>

        {totalRequests === 0 && (
          <p class="text-xs text-text-muted text-center py-1">Click "Send 10 Requests" to start the simulation</p>
        )}
      </div>

      {/* Health legend */}
      <div class="flex flex-wrap gap-4 text-xs text-text-muted">
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Healthy — receives normal traffic</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" /> Degraded — still receives traffic</span>
        <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> Down — excluded from routing</span>
        <span class="text-text-muted italic">Click the dot on a server to cycle its health status.</span>
      </div>

      {/* Algorithm explanation */}
      <div class="bg-primary/5 border border-primary/20 rounded-xl p-4">
        <p class="text-xs font-medium text-primary uppercase tracking-wider mb-1">{ALGORITHMS[algorithm].label}</p>
        <p class="text-sm text-text-muted leading-relaxed">{ALGORITHMS[algorithm].description}</p>
      </div>
    </div>
  );
}
