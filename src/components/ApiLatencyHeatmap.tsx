import { useState, useCallback } from 'preact/hooks';

interface Endpoint {
  id: number;
  label: string;
  timings: number[];
}

let endpointCounter = 3;

const DEFAULT_ENDPOINTS: Endpoint[] = [
  { id: 1, label: 'GET /api/users', timings: [45, 120, 88, 310, 55, 780, 92, 140, 60, 250] },
  { id: 2, label: 'POST /api/orders', timings: [180, 220, 560, 195, 810, 240, 175, 630, 200, 415] },
  { id: 3, label: 'GET /api/products', timings: [30, 35, 28, 42, 1200, 38, 31, 55, 29, 88] },
];

const TIME_SLOTS = ['00:00', '00:05', '00:10', '00:15', '00:20', '00:25', '00:30', '00:35', '00:40', '00:45'];

function getColor(ms: number): { bg: string; text: string; label: string } {
  if (ms < 100) return { bg: 'bg-green-500/80', text: 'text-white', label: '< 100ms' };
  if (ms < 300) return { bg: 'bg-yellow-400/80', text: 'text-gray-900', label: '100–300ms' };
  if (ms < 500) return { bg: 'bg-orange-500/80', text: 'text-white', label: '300–500ms' };
  if (ms < 1000) return { bg: 'bg-red-500/80', text: 'text-white', label: '500ms–1s' };
  return { bg: 'bg-red-800/90', text: 'text-white', label: '> 1s' };
}

function parseTimings(raw: string): number[] | null {
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  const nums = parts.map(p => parseFloat(p));
  if (nums.some(isNaN)) return null;
  return nums;
}

function avg(arr: number[]): number {
  return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;
}
function max(arr: number[]): number {
  return arr.length ? Math.max(...arr) : 0;
}
function p95(arr: number[]): number {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1];
}

export default function ApiLatencyHeatmap() {
  const [endpoints, setEndpoints] = useState<Endpoint[]>(DEFAULT_ENDPOINTS);
  const [editId, setEditId] = useState<number | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editTimings, setEditTimings] = useState('');
  const [editError, setEditError] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newTimings, setNewTimings] = useState('');
  const [newError, setNewError] = useState('');
  const [tooltip, setTooltip] = useState<{ ep: string; slot: string; ms: number } | null>(null);

  const startEdit = useCallback((ep: Endpoint) => {
    setEditId(ep.id);
    setEditLabel(ep.label);
    setEditTimings(ep.timings.join(', '));
    setEditError('');
  }, []);

  const saveEdit = useCallback(() => {
    const nums = parseTimings(editTimings);
    if (!nums || nums.length === 0) { setEditError('Enter comma-separated numbers (e.g. 45, 120, 88)'); return; }
    setEndpoints(prev => prev.map(e => e.id === editId ? { ...e, label: editLabel.trim() || e.label, timings: nums } : e));
    setEditId(null);
    setEditError('');
  }, [editId, editLabel, editTimings]);

  const removeEndpoint = useCallback((id: number) => {
    setEndpoints(prev => prev.filter(e => e.id !== id));
  }, []);

  const addEndpoint = useCallback(() => {
    const nums = parseTimings(newTimings);
    if (!newLabel.trim()) { setNewError('Enter an endpoint label'); return; }
    if (!nums || nums.length === 0) { setNewError('Enter comma-separated numbers'); return; }
    endpointCounter++;
    setEndpoints(prev => [...prev, { id: endpointCounter, label: newLabel.trim(), timings: nums }]);
    setNewLabel('');
    setNewTimings('');
    setNewError('');
  }, [newLabel, newTimings]);

  // Use up to 10 time slots
  const slots = TIME_SLOTS;

  return (
    <div class="space-y-6">
      {/* Legend */}
      <div class="flex flex-wrap items-center gap-3 text-xs">
        <span class="text-text-muted font-medium">Latency:</span>
        {[
          { label: '< 100ms', bg: 'bg-green-500/80' },
          { label: '100–300ms', bg: 'bg-yellow-400/80' },
          { label: '300–500ms', bg: 'bg-orange-500/80' },
          { label: '500ms–1s', bg: 'bg-red-500/80' },
          { label: '> 1s', bg: 'bg-red-800/90' },
        ].map(({ label, bg }) => (
          <span key={label} class="flex items-center gap-1">
            <span class={`inline-block w-3 h-3 rounded ${bg}`} />
            <span class="text-text-muted">{label}</span>
          </span>
        ))}
      </div>

      {/* Heatmap grid */}
      <div class="overflow-x-auto">
        <table class="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th class="text-left text-text-muted pr-4 pb-2 font-normal min-w-[160px]">Endpoint</th>
              {slots.map(s => (
                <th key={s} class="text-center text-text-muted pb-2 font-normal px-0.5 w-10">{s}</th>
              ))}
              <th class="text-center text-text-muted pb-2 font-normal px-1 w-14">Avg</th>
              <th class="text-center text-text-muted pb-2 font-normal px-1 w-14">P95</th>
              <th class="text-center text-text-muted pb-2 font-normal px-1 w-14">Max</th>
              <th class="w-16"></th>
            </tr>
          </thead>
          <tbody>
            {endpoints.map(ep => {
              const timings = ep.timings.slice(0, 10);
              return (
                <tr key={ep.id} class="hover:bg-surface/40">
                  <td class="pr-4 py-1 font-mono text-text max-w-[180px] truncate">
                    <span title={ep.label}>{ep.label}</span>
                  </td>
                  {slots.map((s, i) => {
                    const ms = timings[i] ?? null;
                    const col = ms !== null ? getColor(ms) : null;
                    return (
                      <td key={s} class="px-0.5 py-1 text-center">
                        {ms !== null ? (
                          <div
                            class={`relative inline-flex items-center justify-center w-9 h-7 rounded text-[10px] font-bold cursor-pointer ${col!.bg} ${col!.text}`}
                            onMouseEnter={() => setTooltip({ ep: ep.label, slot: s, ms })}
                            onMouseLeave={() => setTooltip(null)}
                          >
                            {ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}`}
                          </div>
                        ) : (
                          <div class="inline-flex items-center justify-center w-9 h-7 text-text-muted/30">–</div>
                        )}
                      </td>
                    );
                  })}
                  <td class="px-1 py-1 text-center font-mono text-text-muted">{avg(timings)}ms</td>
                  <td class="px-1 py-1 text-center font-mono text-text-muted">{p95(timings)}ms</td>
                  <td class="px-1 py-1 text-center font-mono text-text-muted">{max(timings)}ms</td>
                  <td class="px-1 py-1 text-right">
                    <button onClick={() => startEdit(ep)} class="text-text-muted hover:text-accent text-xs mr-2 transition-colors">Edit</button>
                    <button onClick={() => removeEndpoint(ep.id)} class="text-text-muted hover:text-red-400 text-xs transition-colors">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div class="text-xs bg-surface border border-border rounded px-3 py-2 text-text-muted">
          <strong class="text-text">{tooltip.ep}</strong> at {tooltip.slot}: <strong class={getColor(tooltip.ms).text.replace('text-white', 'text-accent').replace('text-gray-900', 'text-yellow-500')}>{tooltip.ms}ms</strong> — {getColor(tooltip.ms).label}
        </div>
      )}

      {/* Edit panel */}
      {editId !== null && (
        <div class="bg-surface border border-accent/50 rounded-lg p-4 space-y-3">
          <p class="text-sm font-medium text-text">Edit Endpoint</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted mb-1 block">Label</label>
              <input
                value={editLabel}
                onInput={e => setEditLabel((e.target as HTMLInputElement).value)}
                class="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-accent text-text"
              />
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Timings (ms, comma-separated, up to 10)</label>
              <input
                value={editTimings}
                onInput={e => setEditTimings((e.target as HTMLInputElement).value)}
                placeholder="45, 120, 88, 310..."
                class="w-full bg-bg border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-accent text-text"
              />
            </div>
          </div>
          {editError && <p class="text-xs text-red-400">{editError}</p>}
          <div class="flex gap-2">
            <button onClick={saveEdit} class="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors">Save</button>
            <button onClick={() => setEditId(null)} class="px-3 py-1.5 text-sm bg-surface border border-border rounded hover:border-accent transition-colors text-text">Cancel</button>
          </div>
        </div>
      )}

      {/* Add endpoint */}
      <div class="border border-border rounded-lg p-4 space-y-3">
        <p class="text-sm font-medium text-text">Add Endpoint</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-text-muted mb-1 block">Label</label>
            <input
              value={newLabel}
              onInput={e => setNewLabel((e.target as HTMLInputElement).value)}
              placeholder="GET /api/search"
              class="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-accent text-text"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Response times (ms, comma-separated)</label>
            <input
              value={newTimings}
              onInput={e => setNewTimings((e.target as HTMLInputElement).value)}
              placeholder="120, 95, 450, 88, 200..."
              class="w-full bg-surface border border-border rounded px-3 py-1.5 text-sm font-mono focus:outline-none focus:border-accent text-text"
            />
          </div>
        </div>
        {newError && <p class="text-xs text-red-400">{newError}</p>}
        <button onClick={addEndpoint} class="px-3 py-1.5 text-sm bg-accent text-white rounded hover:bg-accent/80 transition-colors">
          Add Endpoint
        </button>
      </div>

      <p class="text-xs text-text-muted">
        Enter response times in milliseconds. Color coding: green &lt;100ms (fast), yellow 100–300ms (acceptable), orange 300–500ms (slow), red 500ms+ (critical).
      </p>
    </div>
  );
}
