import { useState, useMemo } from 'preact/hooks';

// ── Model database ────────────────────────────────────────────────────────────
type Model = {
  id: string;
  label: string;
  provider: string;
  inputPer1M: number;   // $ per 1M input tokens
  outputPer1M: number;  // $ per 1M output tokens
  contextK: number;
  note?: string;
};

const MODELS: Model[] = [
  // OpenAI
  { id: 'gpt-4o',       label: 'GPT-4o',        provider: 'OpenAI',    inputPer1M: 2.50,  outputPer1M: 10.00, contextK: 128 },
  { id: 'gpt-4o-mini',  label: 'GPT-4o mini',   provider: 'OpenAI',    inputPer1M: 0.15,  outputPer1M: 0.60,  contextK: 128 },
  { id: 'gpt-4-turbo',  label: 'GPT-4 Turbo',   provider: 'OpenAI',    inputPer1M: 10.00, outputPer1M: 30.00, contextK: 128 },
  { id: 'o1',           label: 'o1',             provider: 'OpenAI',    inputPer1M: 15.00, outputPer1M: 60.00, contextK: 200 },
  { id: 'o1-mini',      label: 'o1-mini',        provider: 'OpenAI',    inputPer1M: 3.00,  outputPer1M: 12.00, contextK: 128 },
  { id: 'o3-mini',      label: 'o3-mini',        provider: 'OpenAI',    inputPer1M: 1.10,  outputPer1M: 4.40,  contextK: 200 },
  // Anthropic
  { id: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPer1M: 3.00,  outputPer1M: 15.00, contextK: 200, note: 'Prompt caching available' },
  { id: 'claude-3-5-haiku',  label: 'Claude 3.5 Haiku',  provider: 'Anthropic', inputPer1M: 0.80,  outputPer1M: 4.00,  contextK: 200, note: 'Prompt caching available' },
  { id: 'claude-3-opus',     label: 'Claude 3 Opus',     provider: 'Anthropic', inputPer1M: 15.00, outputPer1M: 75.00, contextK: 200, note: 'Prompt caching available' },
  { id: 'claude-3-haiku',    label: 'Claude 3 Haiku',    provider: 'Anthropic', inputPer1M: 0.25,  outputPer1M: 1.25,  contextK: 200, note: 'Prompt caching available' },
  // Google
  { id: 'gemini-1.5-pro',   label: 'Gemini 1.5 Pro',   provider: 'Google', inputPer1M: 1.25,  outputPer1M: 5.00,  contextK: 128, note: '<128K ctx pricing' },
  { id: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'Google', inputPer1M: 0.075, outputPer1M: 0.30,  contextK: 1000 },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', inputPer1M: 0.10,  outputPer1M: 0.40,  contextK: 1000 },
  // Meta / Open (via Groq)
  { id: 'llama-3.1-70b', label: 'Llama 3.1 70B (Groq)', provider: 'Meta/Groq', inputPer1M: 0.59, outputPer1M: 0.79, contextK: 128 },
  { id: 'llama-3.1-8b',  label: 'Llama 3.1 8B (Groq)',  provider: 'Meta/Groq', inputPer1M: 0.05, outputPer1M: 0.08, contextK: 128 },
];

const DEFAULT_SELECTED = new Set(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'claude-3-5-haiku', 'gemini-2.0-flash', 'llama-3.1-8b']);

const PROVIDER_COLORS: Record<string, string> = {
  OpenAI: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  Anthropic: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  Google: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  'Meta/Groq': 'bg-purple-500/10 text-purple-600 border-purple-500/20',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(n: number, decimals = 4): string {
  if (!isFinite(n) || n === 0) return '$0.00';
  if (n < 0.0001) return `$${n.toExponential(2)}`;
  if (n >= 1000) return `$${n.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  return `$${n.toFixed(decimals).replace(/\.?0+$/, '')}`;
}

function fmtRaw(n: number): string {
  return fmt(n, 4);
}

// Rough token estimate: 1 token ≈ 4 chars (English)
function textToTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function AiTokenCostCalculator() {
  const [tab, setTab] = useState<'compare' | 'estimate'>('compare');

  // Inputs
  const [inputTokens, setInputTokens] = useState('1000');
  const [outputTokens, setOutputTokens] = useState('500');
  const [requestsPerMonth, setRequestsPerMonth] = useState('10000');
  const [cacheHitRate, setCacheHitRate] = useState('0');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(DEFAULT_SELECTED));

  // Estimate-from-text tab
  const [pastedText, setPastedText] = useState('');

  // Sorting
  const [sortCol, setSortCol] = useState<'monthly' | 'input' | 'output' | 'perReq'>('monthly');

  const inputTok = Math.max(0, parseInt(inputTokens.replace(/,/g, ''), 10) || 0);
  const outputTok = Math.max(0, parseInt(outputTokens.replace(/,/g, ''), 10) || 0);
  const reqPerMo = Math.max(1, parseInt(requestsPerMonth.replace(/,/g, ''), 10) || 1);
  const cacheRate = Math.min(1, Math.max(0, (parseFloat(cacheHitRate) || 0) / 100));

  // When using estimate-from-text, override inputTok with auto count
  const estimatedInputTokens = tab === 'estimate' ? textToTokens(pastedText) : inputTok;
  const effectiveInputTok = tab === 'estimate' ? estimatedInputTokens : inputTok;

  function calcCosts(m: Model) {
    // Anthropic prompt caching: cache hits cost 10% of input price
    const isAnthropic = m.provider === 'Anthropic';
    const cachedInputTok = isAnthropic ? effectiveInputTok * cacheRate : 0;
    const uncachedInputTok = effectiveInputTok - cachedInputTok;

    const inputCostPerReq = (uncachedInputTok / 1_000_000) * m.inputPer1M
      + (cachedInputTok / 1_000_000) * (m.inputPer1M * 0.10);
    const outputCostPerReq = (outputTok / 1_000_000) * m.outputPer1M;
    const totalPerReq = inputCostPerReq + outputCostPerReq;
    const totalMonthly = totalPerReq * reqPerMo;

    return { inputCostPerReq, outputCostPerReq, totalPerReq, totalMonthly };
  }

  const rows = useMemo(() => {
    return MODELS
      .filter(m => selectedIds.has(m.id))
      .map(m => ({ ...m, costs: calcCosts(m) }))
      .sort((a, b) => {
        if (sortCol === 'monthly') return a.costs.totalMonthly - b.costs.totalMonthly;
        if (sortCol === 'input') return a.costs.inputCostPerReq - b.costs.inputCostPerReq;
        if (sortCol === 'output') return a.costs.outputCostPerReq - b.costs.outputCostPerReq;
        return a.costs.totalPerReq - b.costs.totalPerReq;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIds, effectiveInputTok, outputTok, reqPerMo, cacheRate, sortCol]);

  const maxMonthly = rows.length > 0 ? Math.max(...rows.map(r => r.costs.totalMonthly)) : 1;
  const cheapestId = rows.length > 0 ? rows[0].id : '';

  function toggleModel(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }

  function selectAll() { setSelectedIds(new Set(MODELS.map(m => m.id))); }
  function selectNone() { setSelectedIds(new Set()); }

  // ROI comparison: cheapest vs most expensive selected
  const roiSavingsMonthly = rows.length >= 2
    ? rows[rows.length - 1].costs.totalMonthly - rows[0].costs.totalMonthly
    : 0;
  const roiCheapestLabel = rows.length >= 2 ? rows[0].label : '';
  const roiExpensiveLabel = rows.length >= 2 ? rows[rows.length - 1].label : '';

  const SortBtn = ({ col, label }: { col: typeof sortCol; label: string }) => (
    <button
      onClick={() => setSortCol(col)}
      class={`text-xs font-medium transition-colors ${sortCol === col ? 'text-primary' : 'text-text-muted hover:text-text'}`}
    >
      {label}{sortCol === col ? ' ↑' : ''}
    </button>
  );

  return (
    <div class="space-y-6">
      {/* Tab switch */}
      <div class="flex gap-1 bg-bg-card border border-border rounded-xl p-1 w-fit">
        {(['compare', 'estimate'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            class={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
              tab === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {t === 'compare' ? 'Compare Models' : 'Estimate from Text'}
          </button>
        ))}
      </div>

      {tab === 'compare' ? (
        /* ── Compare Models tab ── */
        <div class="space-y-6">
          {/* Config inputs */}
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Input tokens
                <span class="block text-xs font-normal mt-0.5 text-text-muted/70">~750 tokens ≈ 1 page</span>
              </label>
              <input
                type="number"
                min="0"
                value={inputTokens}
                onInput={(e) => setInputTokens((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="1000"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Output tokens
                <span class="block text-xs font-normal mt-0.5 text-text-muted/70">Avg response length</span>
              </label>
              <input
                type="number"
                min="0"
                value={outputTokens}
                onInput={(e) => setOutputTokens((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Requests / month
                <span class="block text-xs font-normal mt-0.5 text-text-muted/70">Total API calls</span>
              </label>
              <input
                type="number"
                min="1"
                value={requestsPerMonth}
                onInput={(e) => setRequestsPerMonth((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="10000"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Cache hit rate %
                <span class="block text-xs font-normal mt-0.5 text-text-muted/70">Anthropic only</span>
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={cacheHitRate}
                onInput={(e) => setCacheHitRate((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Model selector */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium text-text-muted">Models to compare</label>
              <div class="flex gap-3 text-xs">
                <button onClick={selectAll} class="text-primary hover:underline">All</button>
                <button onClick={selectNone} class="text-text-muted hover:text-text hover:underline">None</button>
              </div>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {MODELS.map(m => (
                <label
                  key={m.id}
                  class={`flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors text-sm ${
                    selectedIds.has(m.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-bg-card hover:border-border/80'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleModel(m.id)}
                    class="mt-0.5 accent-primary shrink-0"
                  />
                  <span class="leading-snug">
                    <span class="font-medium text-text">{m.label}</span>
                    <span class={`block text-xs mt-0.5 px-1.5 py-0.5 rounded-full border w-fit ${PROVIDER_COLORS[m.provider] ?? ''}`}>
                      {m.provider}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Results table */}
          {rows.length > 0 ? (
            <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
              {/* Table header */}
              <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 px-4 py-3 border-b border-border bg-bg text-xs font-medium">
                <span class="text-text-muted">Model / Provider</span>
                <SortBtn col="input" label="Input/req" />
                <SortBtn col="output" label="Output/req" />
                <SortBtn col="perReq" label="Total/req" />
                <SortBtn col="monthly" label="Monthly" />
              </div>

              {rows.map((m, i) => {
                const isCheapest = m.id === cheapestId;
                const barWidth = maxMonthly > 0 ? Math.max(2, (m.costs.totalMonthly / maxMonthly) * 100) : 0;

                return (
                  <div
                    key={m.id}
                    class={`px-4 py-3 border-b border-border last:border-b-0 ${isCheapest ? 'bg-emerald-500/5' : i % 2 === 0 ? '' : 'bg-bg'}`}
                  >
                    {/* Row data */}
                    <div class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-x-4 items-center mb-2">
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-medium text-sm text-text">{m.label}</span>
                          {isCheapest && (
                            <span class="text-xs bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-medium">
                              cheapest
                            </span>
                          )}
                        </div>
                        <span class={`text-xs px-1.5 py-0.5 rounded-full border ${PROVIDER_COLORS[m.provider] ?? 'text-text-muted'}`}>
                          {m.provider}
                        </span>
                        {m.note && <span class="text-xs text-text-muted ml-1">{m.note}</span>}
                      </div>
                      <span class="font-mono text-xs text-text-muted tabular-nums">{fmtRaw(m.costs.inputCostPerReq)}</span>
                      <span class="font-mono text-xs text-text-muted tabular-nums">{fmtRaw(m.costs.outputCostPerReq)}</span>
                      <span class="font-mono text-xs font-medium tabular-nums">{fmtRaw(m.costs.totalPerReq)}</span>
                      <span class={`font-mono text-sm font-bold tabular-nums ${isCheapest ? 'text-emerald-600' : 'text-text'}`}>
                        {fmt(m.costs.totalMonthly, 2)}
                      </span>
                    </div>

                    {/* CSS bar chart */}
                    <div class="h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        class={`h-full rounded-full transition-all duration-300 ${isCheapest ? 'bg-emerald-500' : 'bg-primary/60'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div class="bg-bg-card border border-border rounded-xl p-8 text-center text-text-muted text-sm">
              Select at least one model above to see cost comparison.
            </div>
          )}

          {/* ROI calculator */}
          {rows.length >= 2 && roiSavingsMonthly > 1 && (
            <div class="bg-bg-card border border-border rounded-xl p-4">
              <h3 class="text-sm font-semibold mb-2">ROI: Cost Savings</h3>
              <p class="text-sm text-text-muted">
                Switching from <span class="font-medium text-text">{roiExpensiveLabel}</span> to{' '}
                <span class="font-medium text-emerald-600">{roiCheapestLabel}</span> saves{' '}
                <span class="font-bold text-emerald-600">{fmt(roiSavingsMonthly, 2)}/month</span>
                {' '}({fmt(roiSavingsMonthly * 12, 2)}/year) at {reqPerMo.toLocaleString()} requests/month.
              </p>
            </div>
          )}

          {/* Price note */}
          <p class="text-xs text-text-muted">
            Prices as of Q1 2025. Anthropic prompt caching reduces input costs by ~90% on cache hits — only applies to system prompts/repeated context.
            Verify current pricing at each provider's API pricing page before budgeting.
          </p>
        </div>
      ) : (
        /* ── Estimate from Text tab ── */
        <div class="space-y-5">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5">
              Paste your prompt / context text
              <span class="block text-xs font-normal mt-0.5 text-text-muted/70">Token count estimated at ~4 chars/token (English)</span>
            </label>
            <textarea
              value={pastedText}
              onInput={(e) => setPastedText((e.target as HTMLTextAreaElement).value)}
              class="w-full h-40 bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors resize-y font-mono"
              placeholder="Paste your system prompt, user message, or context here..."
            />
            <div class="flex gap-4 mt-2 text-xs text-text-muted">
              <span>Characters: <strong class="text-text">{pastedText.length.toLocaleString()}</strong></span>
              <span>Est. tokens: <strong class="text-primary">{estimatedInputTokens.toLocaleString()}</strong></span>
              <span>Est. pages: <strong class="text-text">{(estimatedInputTokens / 750).toFixed(1)}</strong></span>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Expected output tokens
              </label>
              <input
                type="number"
                min="0"
                value={outputTokens}
                onInput={(e) => setOutputTokens((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="500"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Requests / month
              </label>
              <input
                type="number"
                min="1"
                value={requestsPerMonth}
                onInput={(e) => setRequestsPerMonth((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="10000"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-text-muted mb-1.5">
                Cache hit rate %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={cacheHitRate}
                onInput={(e) => setCacheHitRate((e.target as HTMLInputElement).value)}
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
                placeholder="0"
              />
            </div>
          </div>

          {/* Results for all models */}
          <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="px-4 py-3 border-b border-border bg-bg">
              <h3 class="text-sm font-semibold">Cost for all models — {estimatedInputTokens.toLocaleString()} input tokens</h3>
            </div>
            {MODELS.map((m, i) => {
              const costs = calcCosts(m);
              const isCheapest = i === 0;
              const allCosts = MODELS.map(mm => calcCosts(mm).totalMonthly);
              const maxCost = Math.max(...allCosts);
              const barW = maxCost > 0 ? Math.max(2, (costs.totalMonthly / maxCost) * 100) : 0;
              const isActuallyCheapest = costs.totalMonthly === Math.min(...allCosts);
              return (
                <div key={m.id} class={`px-4 py-3 border-b border-border last:border-b-0 ${isActuallyCheapest ? 'bg-emerald-500/5' : i % 2 === 0 ? '' : 'bg-bg'}`}>
                  <div class="flex items-center justify-between mb-1.5">
                    <div class="flex items-center gap-2">
                      <span class="text-sm font-medium">{m.label}</span>
                      <span class={`text-xs px-1.5 py-0.5 rounded-full border ${PROVIDER_COLORS[m.provider] ?? ''}`}>{m.provider}</span>
                      {isActuallyCheapest && (
                        <span class="text-xs bg-emerald-500/15 text-emerald-600 border border-emerald-500/25 px-1.5 py-0.5 rounded-full font-medium">cheapest</span>
                      )}
                    </div>
                    <div class="text-right">
                      <span class={`font-mono text-sm font-bold ${isActuallyCheapest ? 'text-emerald-600' : ''}`}>{fmt(costs.totalMonthly, 2)}/mo</span>
                      <span class="text-xs text-text-muted ml-2">{fmtRaw(costs.totalPerReq)}/req</span>
                    </div>
                  </div>
                  <div class="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      class={`h-full rounded-full ${isActuallyCheapest ? 'bg-emerald-500' : 'bg-primary/60'}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <p class="text-xs text-text-muted">
            Token estimate uses ~4 chars/token heuristic. Actual token counts vary by model tokenizer (GPT uses cl100k_base, Claude uses its own BPE).
            For precise counts use the provider's tokenizer library.
          </p>
        </div>
      )}
    </div>
  );
}
