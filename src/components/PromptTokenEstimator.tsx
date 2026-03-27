import { useState, useCallback } from 'preact/hooks';

interface ModelConfig {
  name: string;
  provider: string;
  inputPricePer1M: number;
  outputPricePer1M: number;
  tokensPerChar: number;
  maxContext: number;
  color: string;
}

const MODELS: ModelConfig[] = [
  { name: 'GPT-4o', provider: 'OpenAI', inputPricePer1M: 2.50, outputPricePer1M: 10.00, tokensPerChar: 0.25, maxContext: 128000, color: '#10a37f' },
  { name: 'GPT-4o mini', provider: 'OpenAI', inputPricePer1M: 0.15, outputPricePer1M: 0.60, tokensPerChar: 0.25, maxContext: 128000, color: '#10a37f' },
  { name: 'GPT-4 Turbo', provider: 'OpenAI', inputPricePer1M: 10.00, outputPricePer1M: 30.00, tokensPerChar: 0.25, maxContext: 128000, color: '#10a37f' },
  { name: 'Claude 3.5 Sonnet', provider: 'Anthropic', inputPricePer1M: 3.00, outputPricePer1M: 15.00, tokensPerChar: 0.24, maxContext: 200000, color: '#d97706' },
  { name: 'Claude 3 Haiku', provider: 'Anthropic', inputPricePer1M: 0.25, outputPricePer1M: 1.25, tokensPerChar: 0.24, maxContext: 200000, color: '#d97706' },
  { name: 'Claude 3 Opus', provider: 'Anthropic', inputPricePer1M: 15.00, outputPricePer1M: 75.00, tokensPerChar: 0.24, maxContext: 200000, color: '#d97706' },
  { name: 'Gemini 1.5 Pro', provider: 'Google', inputPricePer1M: 3.50, outputPricePer1M: 10.50, tokensPerChar: 0.26, maxContext: 2000000, color: '#4285f4' },
  { name: 'Gemini 1.5 Flash', provider: 'Google', inputPricePer1M: 0.075, outputPricePer1M: 0.30, tokensPerChar: 0.26, maxContext: 1000000, color: '#4285f4' },
  { name: 'Llama 3.1 70B', provider: 'Meta (via Groq)', inputPricePer1M: 0.59, outputPricePer1M: 0.79, tokensPerChar: 0.25, maxContext: 128000, color: '#0066cc' },
];

function estimateTokens(text: string, tokensPerChar: number): number {
  if (!text) return 0;
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const charCount = text.length;
  // GPT-style: ~1 token per 4 chars or ~1.3 tokens per word, whichever is larger
  return Math.ceil(Math.max(charCount * tokensPerChar, wordCount * 1.3));
}

function formatCost(dollars: number): string {
  if (dollars < 0.001) return `$${(dollars * 1000).toFixed(4)}m`;
  if (dollars < 1) return `$${dollars.toFixed(4)}`;
  return `$${dollars.toFixed(2)}`;
}

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function PromptTokenEstimator() {
  const [prompt, setPrompt] = useState('');
  const [outputTokens, setOutputTokens] = useState(500);
  const [callsPerDay, setCallsPerDay] = useState(100);
  const [selectedModels, setSelectedModels] = useState<Set<string>>(new Set(['GPT-4o', 'Claude 3.5 Sonnet', 'Gemini 1.5 Flash']));
  const [copyMsg, setCopyMsg] = useState('');

  const toggleModel = useCallback((name: string) => {
    setSelectedModels(prev => {
      const next = new Set(prev);
      if (next.has(name)) {
        if (next.size > 1) next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const results = MODELS
    .filter(m => selectedModels.has(m.name))
    .map(m => {
      const inputTokens = estimateTokens(prompt, m.tokensPerChar);
      const totalPerCall = inputTokens + outputTokens;
      const inputCostPerCall = (inputTokens / 1_000_000) * m.inputPricePer1M;
      const outputCostPerCall = (outputTokens / 1_000_000) * m.outputPricePer1M;
      const totalCostPerCall = inputCostPerCall + outputCostPerCall;
      const dailyCost = totalCostPerCall * callsPerDay;
      const monthlyCost = dailyCost * 30;
      const contextPct = Math.min(100, (totalPerCall / m.maxContext) * 100);
      return { ...m, inputTokens, totalPerCall, inputCostPerCall, outputCostPerCall, totalCostPerCall, dailyCost, monthlyCost, contextPct };
    });

  const copyReport = useCallback(() => {
    if (!results.length) return;
    const lines = ['Prompt Token Cost Report', '='.repeat(40), `Prompt: ${prompt.length} chars`, `Output: ${outputTokens} tokens`, `Calls/day: ${callsPerDay}`, '', 'Model Results:', ...results.map(r =>
      `${r.name} (${r.provider}): ${r.inputTokens} input tokens | $${r.totalCostPerCall.toFixed(6)}/call | $${r.monthlyCost.toFixed(2)}/month`
    )];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopyMsg('Copied!');
      setTimeout(() => setCopyMsg(''), 2000);
    });
  }, [results, prompt, outputTokens, callsPerDay]);

  return (
    <div class="space-y-6">
      {/* Prompt Input */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <label class="block text-sm font-semibold mb-2">Prompt / System Message</label>
        <textarea
          class="w-full bg-bg border border-border rounded-lg p-3 font-mono text-sm resize-y min-h-[140px] focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="Paste your prompt or system message here..."
          value={prompt}
          onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
        />
        <p class="text-xs text-text-muted mt-1">
          {prompt.length} chars · ~{formatNumber(estimateTokens(prompt, 0.25))} tokens (GPT-style)
        </p>
      </div>

      {/* Parameters */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-surface border border-border rounded-xl p-4">
          <label class="block text-sm font-semibold mb-2">Expected Output Tokens</label>
          <input
            type="number"
            class="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={outputTokens}
            min={1}
            max={100000}
            onInput={(e) => setOutputTokens(Math.max(1, parseInt((e.target as HTMLInputElement).value) || 500))}
          />
          <p class="text-xs text-text-muted mt-1">~{Math.round(outputTokens * 0.75)} words</p>
        </div>
        <div class="bg-surface border border-border rounded-xl p-4">
          <label class="block text-sm font-semibold mb-2">API Calls per Day</label>
          <input
            type="number"
            class="w-full bg-bg border border-border rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            value={callsPerDay}
            min={1}
            max={1000000}
            onInput={(e) => setCallsPerDay(Math.max(1, parseInt((e.target as HTMLInputElement).value) || 100))}
          />
          <p class="text-xs text-text-muted mt-1">{formatNumber(callsPerDay * 30)} calls/month</p>
        </div>
      </div>

      {/* Model Selector */}
      <div class="bg-surface border border-border rounded-xl p-4">
        <label class="block text-sm font-semibold mb-3">Models to Compare</label>
        <div class="flex flex-wrap gap-2">
          {MODELS.map(m => (
            <button
              key={m.name}
              onClick={() => toggleModel(m.name)}
              class={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedModels.has(m.name)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-bg border-border text-text-muted hover:border-accent'
              }`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div class="bg-surface border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3 border-b border-border">
          <h2 class="font-semibold text-sm">Cost Comparison</h2>
          <button
            onClick={copyReport}
            class="text-xs px-3 py-1.5 bg-bg border border-border rounded-lg hover:border-accent transition-colors"
          >
            {copyMsg || 'Copy Report'}
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-xs text-text-muted border-b border-border">
                <th class="text-left px-4 py-2 font-medium">Model</th>
                <th class="text-right px-4 py-2 font-medium">Input Tokens</th>
                <th class="text-right px-4 py-2 font-medium">Per Call</th>
                <th class="text-right px-4 py-2 font-medium">Daily</th>
                <th class="text-right px-4 py-2 font-medium">Monthly</th>
                <th class="text-right px-4 py-2 font-medium">Context Used</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.name} class={i % 2 === 0 ? 'bg-surface' : 'bg-bg'}>
                  <td class="px-4 py-3">
                    <div class="font-medium">{r.name}</div>
                    <div class="text-xs text-text-muted">{r.provider}</div>
                  </td>
                  <td class="px-4 py-3 text-right font-mono">{formatNumber(r.inputTokens)}</td>
                  <td class="px-4 py-3 text-right font-mono text-accent">{formatCost(r.totalCostPerCall)}</td>
                  <td class="px-4 py-3 text-right font-mono">{formatCost(r.dailyCost)}</td>
                  <td class="px-4 py-3 text-right font-mono font-semibold">{formatCost(r.monthlyCost)}</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex items-center justify-end gap-2">
                      <div class="w-16 bg-border rounded-full h-1.5 overflow-hidden">
                        <div
                          class="h-full rounded-full"
                          style={{ width: `${r.contextPct}%`, backgroundColor: r.contextPct > 80 ? '#ef4444' : r.contextPct > 50 ? '#f59e0b' : '#10b981' }}
                        />
                      </div>
                      <span class="text-xs text-text-muted w-10 text-right">{r.contextPct.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p class="text-xs text-text-muted px-5 py-3 border-t border-border">
          Token counts are estimates. Actual billing depends on the provider's tokenizer. Prices as of Q1 2026 — verify at provider pricing pages.
        </p>
      </div>

      {/* Breakdown Cards */}
      {results.length > 0 && (
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {results.slice(0, 3).map(r => (
            <div key={r.name} class="bg-surface border border-border rounded-xl p-4">
              <div class="flex items-center gap-2 mb-3">
                <div class="w-2 h-2 rounded-full" style={{ backgroundColor: r.color }} />
                <span class="font-semibold text-sm">{r.name}</span>
              </div>
              <div class="space-y-2 text-xs">
                <div class="flex justify-between">
                  <span class="text-text-muted">Input cost/call</span>
                  <span class="font-mono">{formatCost(r.inputCostPerCall)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-muted">Output cost/call</span>
                  <span class="font-mono">{formatCost(r.outputCostPerCall)}</span>
                </div>
                <div class="flex justify-between border-t border-border pt-2">
                  <span class="text-text-muted font-medium">Total/call</span>
                  <span class="font-mono font-semibold text-accent">{formatCost(r.totalCostPerCall)}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-text-muted">30-day total</span>
                  <span class="font-mono font-semibold">{formatCost(r.monthlyCost)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
