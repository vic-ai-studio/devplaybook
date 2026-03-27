import { useState, useMemo } from 'preact/hooks';

interface Model {
  name: string;
  provider: string;
  contextK: number;
  inputPrice: number | null;
  outputPrice: number | null;
  vision: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
  releaseDate: string;
}

const MODELS: Model[] = [
  { name: 'GPT-4o', provider: 'OpenAI', contextK: 128, inputPrice: 2.50, outputPrice: 10.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-05' },
  { name: 'GPT-4o mini', provider: 'OpenAI', contextK: 128, inputPrice: 0.15, outputPrice: 0.60, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-07' },
  { name: 'GPT-4 Turbo', provider: 'OpenAI', contextK: 128, inputPrice: 10.00, outputPrice: 30.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-04' },
  { name: 'o1', provider: 'OpenAI', contextK: 200, inputPrice: 15.00, outputPrice: 60.00, vision: true, functionCalling: false, jsonMode: false, releaseDate: '2024-12' },
  { name: 'o3-mini', provider: 'OpenAI', contextK: 200, inputPrice: 1.10, outputPrice: 4.40, vision: false, functionCalling: true, jsonMode: true, releaseDate: '2025-01' },
  { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextK: 200, inputPrice: 3.00, outputPrice: 15.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-10' },
  { name: 'Claude 3.7 Sonnet', provider: 'Anthropic', contextK: 200, inputPrice: 3.00, outputPrice: 15.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2025-02' },
  { name: 'Claude 3 Opus', provider: 'Anthropic', contextK: 200, inputPrice: 15.00, outputPrice: 75.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-03' },
  { name: 'Claude 3 Haiku', provider: 'Anthropic', contextK: 200, inputPrice: 0.25, outputPrice: 1.25, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-03' },
  { name: 'Gemini 1.5 Flash', provider: 'Google', contextK: 1000, inputPrice: 0.075, outputPrice: 0.30, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-05' },
  { name: 'Gemini 1.5 Pro', provider: 'Google', contextK: 2000, inputPrice: 1.25, outputPrice: 5.00, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2024-05' },
  { name: 'Gemini 2.0 Flash', provider: 'Google', contextK: 1000, inputPrice: 0.10, outputPrice: 0.40, vision: true, functionCalling: true, jsonMode: true, releaseDate: '2025-01' },
  { name: 'Llama 3.1 70B', provider: 'Meta', contextK: 128, inputPrice: 0.72, outputPrice: 0.72, vision: false, functionCalling: true, jsonMode: true, releaseDate: '2024-07' },
  { name: 'Llama 3.1 405B', provider: 'Meta', contextK: 128, inputPrice: 3.00, outputPrice: 3.00, vision: false, functionCalling: true, jsonMode: true, releaseDate: '2024-07' },
  { name: 'Mistral Large', provider: 'Mistral', contextK: 128, inputPrice: 2.00, outputPrice: 6.00, vision: false, functionCalling: true, jsonMode: true, releaseDate: '2024-11' },
  { name: 'DeepSeek V3', provider: 'DeepSeek', contextK: 128, inputPrice: 0.27, outputPrice: 1.10, vision: false, functionCalling: true, jsonMode: true, releaseDate: '2024-12' },
];

const ALL_PROVIDERS = [...new Set(MODELS.map(m => m.provider))];

type SortKey = keyof Model;
type SortDir = 'asc' | 'desc';

function fmtPrice(p: number | null) {
  if (p === null) return '—';
  if (p < 1) return `$${p.toFixed(3)}`;
  return `$${p.toFixed(2)}`;
}

function fmtContext(k: number) {
  if (k >= 1000) return `${k / 1000}M`;
  return `${k}K`;
}

function Badge({ ok }: { ok: boolean }) {
  return ok
    ? <span class="inline-block bg-green-900/40 text-green-400 border border-green-800 text-xs px-2 py-0.5 rounded-full">Yes</span>
    : <span class="inline-block bg-gray-800 text-gray-500 border border-gray-700 text-xs px-2 py-0.5 rounded-full">No</span>;
}

export default function LlmModelComparison() {
  const [selectedProviders, setSelectedProviders] = useState<Set<string>>(new Set(ALL_PROVIDERS));
  const [sortKey, setSortKey] = useState<SortKey>('inputPrice');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [search, setSearch] = useState('');

  const minInput = Math.min(...MODELS.filter(m => m.inputPrice !== null).map(m => m.inputPrice as number));
  const maxContext = Math.max(...MODELS.map(m => m.contextK));

  const filtered = useMemo(() => {
    let result = MODELS.filter(m => selectedProviders.has(m.provider));
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(m => m.name.toLowerCase().includes(q) || m.provider.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'boolean' && typeof bv === 'boolean') {
        return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return result;
  }, [selectedProviders, sortKey, sortDir, search]);

  function toggleProvider(p: string) {
    setSelectedProviders(prev => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size > 1) next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span class="text-gray-600 ml-1">↕</span>;
    return <span class="text-indigo-400 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  const providerColors: Record<string, string> = {
    OpenAI: 'border-green-600 text-green-300',
    Anthropic: 'border-orange-600 text-orange-300',
    Google: 'border-blue-600 text-blue-300',
    Meta: 'border-purple-600 text-purple-300',
    Mistral: 'border-pink-600 text-pink-300',
    DeepSeek: 'border-cyan-600 text-cyan-300',
  };

  const thClass = "text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 cursor-pointer hover:text-gray-200 whitespace-nowrap select-none";

  return (
    <div class="space-y-5">
      {/* Filters */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-3">
        <div class="flex flex-wrap gap-2">
          {ALL_PROVIDERS.map(p => (
            <button
              key={p}
              onClick={() => toggleProvider(p)}
              class={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${
                selectedProviders.has(p)
                  ? (providerColors[p] || 'border-gray-500 text-gray-300') + ' bg-gray-800'
                  : 'border-gray-700 text-gray-600 hover:border-gray-500'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onInput={e => setSearch((e.target as HTMLInputElement).value)}
          placeholder="Search model name..."
          class="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 placeholder-gray-600"
        />
      </div>

      {/* Legend */}
      <div class="flex flex-wrap gap-4 text-xs text-gray-500">
        <span><span class="text-yellow-400 font-bold">★</span> Best-in-class highlight</span>
        <span><span class="text-green-400">●</span> Cheapest input price</span>
        <span><span class="text-blue-400">●</span> Largest context window</span>
      </div>

      {/* Table */}
      <div class="overflow-x-auto rounded-xl border border-gray-700">
        <table class="w-full text-sm">
          <thead class="bg-gray-900 border-b border-gray-700">
            <tr>
              <th class={thClass} onClick={() => handleSort('name')}>Model <SortIcon col="name" /></th>
              <th class={thClass + " hidden sm:table-cell"} onClick={() => handleSort('provider')}>Provider <SortIcon col="provider" /></th>
              <th class={thClass} onClick={() => handleSort('contextK')}>Context <SortIcon col="contextK" /></th>
              <th class={thClass} onClick={() => handleSort('inputPrice')}>Input $/1M <SortIcon col="inputPrice" /></th>
              <th class={thClass + " hidden md:table-cell"} onClick={() => handleSort('outputPrice')}>Output $/1M <SortIcon col="outputPrice" /></th>
              <th class={thClass + " hidden lg:table-cell"} onClick={() => handleSort('vision')}>Vision <SortIcon col="vision" /></th>
              <th class={thClass + " hidden lg:table-cell"} onClick={() => handleSort('functionCalling')}>Functions <SortIcon col="functionCalling" /></th>
              <th class={thClass + " hidden xl:table-cell"} onClick={() => handleSort('jsonMode')}>JSON Mode <SortIcon col="jsonMode" /></th>
              <th class={thClass + " hidden md:table-cell"} onClick={() => handleSort('releaseDate')}>Released <SortIcon col="releaseDate" /></th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-800">
            {filtered.map(m => {
              const isCheapestInput = m.inputPrice === minInput;
              const isLargestContext = m.contextK === maxContext;
              return (
                <tr key={m.name} class="bg-gray-950 hover:bg-gray-900 transition-colors">
                  <td class="px-3 py-3">
                    <div class="font-medium text-gray-100 flex items-center gap-1.5">
                      {m.name}
                      {(isCheapestInput || isLargestContext) && <span class="text-yellow-400 text-xs">★</span>}
                    </div>
                    <div class="text-xs text-gray-500 sm:hidden">{m.provider}</div>
                  </td>
                  <td class="px-3 py-3 hidden sm:table-cell">
                    <span class={`text-xs font-medium px-2 py-0.5 rounded-full border ${providerColors[m.provider] || 'border-gray-600 text-gray-300'} bg-gray-900`}>
                      {m.provider}
                    </span>
                  </td>
                  <td class={`px-3 py-3 font-mono text-sm font-semibold ${isLargestContext ? 'text-blue-400' : 'text-gray-300'}`}>
                    {fmtContext(m.contextK)}
                  </td>
                  <td class={`px-3 py-3 font-mono text-sm ${isCheapestInput ? 'text-green-400 font-bold' : 'text-gray-300'}`}>
                    {fmtPrice(m.inputPrice)}
                  </td>
                  <td class="px-3 py-3 font-mono text-sm text-gray-300 hidden md:table-cell">
                    {fmtPrice(m.outputPrice)}
                  </td>
                  <td class="px-3 py-3 hidden lg:table-cell"><Badge ok={m.vision} /></td>
                  <td class="px-3 py-3 hidden lg:table-cell"><Badge ok={m.functionCalling} /></td>
                  <td class="px-3 py-3 hidden xl:table-cell"><Badge ok={m.jsonMode} /></td>
                  <td class="px-3 py-3 text-xs text-gray-500 hidden md:table-cell">{m.releaseDate}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colspan={9} class="px-4 py-8 text-center text-gray-500">No models match your filters.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Stats bar */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Models shown', value: filtered.length, color: 'text-indigo-400' },
          { label: 'Cheapest input', value: `$${minInput.toFixed(3)}/1M`, color: 'text-green-400' },
          { label: 'Largest context', value: fmtContext(maxContext), color: 'text-blue-400' },
          { label: 'Providers', value: selectedProviders.size, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} class="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center">
            <div class={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div class="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      <p class="text-xs text-gray-600">Prices are API list prices in USD per 1M tokens. Context windows in thousands (K) or millions (M) of tokens. Data current as of early 2026 — verify with provider for latest pricing.</p>
    </div>
  );
}
