import { useState } from 'preact/hooks';

interface ModelRow {
  model: string;
  provider: string;
  ttft: number;
  throughput: number;
  context: string;
  inputPer1M: number;
  outputPer1M: number;
  bestFor: string;
}

const ALL_MODELS: ModelRow[] = [
  {
    model: 'GPT-4o',
    provider: 'OpenAI',
    ttft: 320,
    throughput: 110,
    context: '128K',
    inputPer1M: 2.5,
    outputPer1M: 10.0,
    bestFor: 'Balanced quality + speed, multimodal',
  },
  {
    model: 'GPT-4o mini',
    provider: 'OpenAI',
    ttft: 180,
    throughput: 185,
    context: '128K',
    inputPer1M: 0.15,
    outputPer1M: 0.6,
    bestFor: 'Low-cost fast tasks, high-volume apps',
  },
  {
    model: 'Claude 3.5 Sonnet',
    provider: 'Anthropic',
    ttft: 350,
    throughput: 95,
    context: '200K',
    inputPer1M: 3.0,
    outputPer1M: 15.0,
    bestFor: 'Long-context reasoning, coding, analysis',
  },
  {
    model: 'Claude 3 Haiku',
    provider: 'Anthropic',
    ttft: 200,
    throughput: 160,
    context: '200K',
    inputPer1M: 0.25,
    outputPer1M: 1.25,
    bestFor: 'Fast, affordable assistant tasks',
  },
  {
    model: 'Claude 3 Opus',
    provider: 'Anthropic',
    ttft: 520,
    throughput: 40,
    context: '200K',
    inputPer1M: 15.0,
    outputPer1M: 75.0,
    bestFor: 'Highest quality, complex reasoning',
  },
  {
    model: 'Gemini 1.5 Flash',
    provider: 'Google',
    ttft: 210,
    throughput: 200,
    context: '1M',
    inputPer1M: 0.075,
    outputPer1M: 0.3,
    bestFor: 'Huge context, cheapest option',
  },
  {
    model: 'Gemini 1.5 Pro',
    provider: 'Google',
    ttft: 410,
    throughput: 75,
    context: '2M',
    inputPer1M: 1.25,
    outputPer1M: 5.0,
    bestFor: 'Very large context, multimodal tasks',
  },
  {
    model: 'Llama 3.1 70B (Groq)',
    provider: 'Meta',
    ttft: 35,
    throughput: 800,
    context: '128K',
    inputPer1M: 0.59,
    outputPer1M: 0.79,
    bestFor: 'Ultra-low latency, streaming apps',
  },
  {
    model: 'Mistral Large',
    provider: 'Mistral',
    ttft: 380,
    throughput: 85,
    context: '128K',
    inputPer1M: 2.0,
    outputPer1M: 6.0,
    bestFor: 'European data residency, function calling',
  },
];

const PROVIDERS = ['All', 'OpenAI', 'Anthropic', 'Google', 'Meta', 'Mistral'];
const MAX_THROUGHPUT = Math.max(...ALL_MODELS.map(m => m.throughput));

type SortKey = keyof ModelRow;
type SortDir = 'asc' | 'desc';

function formatPrice(p: number): string {
  return `$${p.toFixed(p < 1 ? 3 : 2)}`;
}

export default function AiModelLatencyBenchmark() {
  const [provider, setProvider] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('throughput');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir(key === 'model' || key === 'provider' || key === 'context' || key === 'bestFor' ? 'asc' : 'desc');
    }
  }

  const filtered = ALL_MODELS.filter(m => provider === 'All' || m.provider === provider);

  const sorted = [...filtered].sort((a, b) => {
    const av = a[sortKey];
    const bv = b[sortKey];
    const cmp = typeof av === 'number' && typeof bv === 'number'
      ? av - bv
      : String(av).localeCompare(String(bv));
    return sortDir === 'asc' ? cmp : -cmp;
  });

  function SortIndicator({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span class="text-text-muted/40 ml-1">⇅</span>;
    return <span class="ml-1 text-accent">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function ThBtn({ col, children }: { col: SortKey; children: any }) {
    return (
      <th
        class="px-3 py-2 text-left text-xs font-medium text-text-muted cursor-pointer hover:text-text select-none whitespace-nowrap"
        onClick={() => handleSort(col)}
      >
        {children}<SortIndicator col={col} />
      </th>
    );
  }

  return (
    <div class="space-y-4">
      {/* Filter bar */}
      <div class="flex flex-wrap gap-2 items-center">
        <span class="text-sm text-text-muted">Filter by provider:</span>
        {PROVIDERS.map(p => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            class={`px-3 py-1 text-sm rounded-lg border transition-colors ${
              provider === p
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'border-border text-text-muted hover:bg-surface'
            }`}
          >
            {p}
          </button>
        ))}
      </div>

      {/* Table */}
      <div class="overflow-x-auto rounded-lg border border-border">
        <table class="w-full text-sm">
          <thead class="bg-surface-alt border-b border-border">
            <tr>
              <ThBtn col="model">Model</ThBtn>
              <ThBtn col="provider">Provider</ThBtn>
              <ThBtn col="ttft">TTFT (ms)</ThBtn>
              <ThBtn col="throughput">Speed (tok/s)</ThBtn>
              <th class="px-3 py-2 text-left text-xs font-medium text-text-muted whitespace-nowrap">Speed Score</th>
              <ThBtn col="context">Context</ThBtn>
              <ThBtn col="inputPer1M">Input $/1M</ThBtn>
              <ThBtn col="outputPer1M">Output $/1M</ThBtn>
              <ThBtn col="bestFor">Best For</ThBtn>
            </tr>
          </thead>
          <tbody>
            {sorted.map((m, i) => {
              const speedPct = Math.round((m.throughput / MAX_THROUGHPUT) * 100);
              return (
                <tr key={m.model} class={i % 2 === 0 ? 'bg-surface' : 'bg-surface-alt'}>
                  <td class="px-3 py-2.5 font-medium whitespace-nowrap">{m.model}</td>
                  <td class="px-3 py-2.5 text-text-muted whitespace-nowrap">{m.provider}</td>
                  <td class="px-3 py-2.5 font-mono whitespace-nowrap">
                    <span class={m.ttft <= 100 ? 'text-green-400' : m.ttft <= 300 ? 'text-yellow-400' : 'text-orange-400'}>
                      {m.ttft}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 font-mono whitespace-nowrap">
                    <span class={m.throughput >= 400 ? 'text-green-400' : m.throughput >= 100 ? 'text-text' : 'text-text-muted'}>
                      {m.throughput}
                    </span>
                  </td>
                  <td class="px-3 py-2.5 min-w-[100px]">
                    <div class="flex items-center gap-2">
                      <div class="flex-1 h-2 bg-surface-alt rounded-full overflow-hidden">
                        <div
                          class="h-full bg-accent rounded-full"
                          style={{ width: `${speedPct}%` }}
                        />
                      </div>
                      <span class="text-xs text-text-muted w-8 text-right">{speedPct}%</span>
                    </div>
                  </td>
                  <td class="px-3 py-2.5 font-mono text-text-muted whitespace-nowrap">{m.context}</td>
                  <td class="px-3 py-2.5 font-mono whitespace-nowrap">{formatPrice(m.inputPer1M)}</td>
                  <td class="px-3 py-2.5 font-mono whitespace-nowrap">{formatPrice(m.outputPer1M)}</td>
                  <td class="px-3 py-2.5 text-text-muted text-xs max-w-[180px]">{m.bestFor}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p class="text-xs text-text-muted italic">
        Data based on community benchmarks and provider documentation, March 2026. TTFT = Time to First Token. Actual latency varies by region, load, prompt length, and streaming configuration. Prices may have changed — verify with provider pricing pages before budgeting.
      </p>
    </div>
  );
}
