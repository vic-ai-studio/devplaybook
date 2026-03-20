import { useState } from 'preact/hooks';

const MODELS: Record<string, { inputPer1M: number; outputPer1M: number; label: string; contextK: number }> = {
  'gpt-4o':           { inputPer1M: 2.50,  outputPer1M: 10.00, label: 'GPT-4o',           contextK: 128 },
  'gpt-4o-mini':      { inputPer1M: 0.15,  outputPer1M: 0.60,  label: 'GPT-4o mini',       contextK: 128 },
  'gpt-4-turbo':      { inputPer1M: 10.00, outputPer1M: 30.00, label: 'GPT-4 Turbo',       contextK: 128 },
  'gpt-3.5-turbo':    { inputPer1M: 0.50,  outputPer1M: 1.50,  label: 'GPT-3.5 Turbo',    contextK: 16  },
  'claude-3-5-sonnet':{ inputPer1M: 3.00,  outputPer1M: 15.00, label: 'Claude 3.5 Sonnet', contextK: 200 },
  'claude-3-5-haiku': { inputPer1M: 0.80,  outputPer1M: 4.00,  label: 'Claude 3.5 Haiku',  contextK: 200 },
  'claude-3-opus':    { inputPer1M: 15.00, outputPer1M: 75.00, label: 'Claude 3 Opus',      contextK: 200 },
  'gemini-1.5-pro':   { inputPer1M: 1.25,  outputPer1M: 5.00,  label: 'Gemini 1.5 Pro',    contextK: 1000},
  'gemini-1.5-flash': { inputPer1M: 0.075, outputPer1M: 0.30,  label: 'Gemini 1.5 Flash',  contextK: 1000},
  'gemini-2.0-flash': { inputPer1M: 0.10,  outputPer1M: 0.40,  label: 'Gemini 2.0 Flash',  contextK: 1000},
};

// Rough approximation: 1 token ≈ 4 chars for English
function charsToTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function tokensToChars(tokens: number): number {
  return tokens * 4;
}

function fmt(n: number, decimals = 4): string {
  if (n === 0) return '0';
  if (n < 0.001) return n.toExponential(2);
  return n.toFixed(decimals).replace(/\.?0+$/, '');
}

export default function AiTokenCalculator() {
  const [modelKey, setModelKey] = useState('gpt-4o');
  const [inputMode, setInputMode] = useState<'tokens' | 'chars' | 'words'>('tokens');
  const [inputTokens, setInputTokens] = useState('1000');
  const [outputTokens, setOutputTokens] = useState('500');
  const [calls, setCalls] = useState('1');

  const model = MODELS[modelKey];

  function parseInput(val: string, mode: typeof inputMode): number {
    const n = parseInt(val.replace(/,/g, ''), 10) || 0;
    if (mode === 'chars') return charsToTokens(n);
    if (mode === 'words') return Math.ceil(n * 1.33); // ~0.75 words/token
    return n;
  }

  const inputTok = parseInput(inputTokens, inputMode);
  const outputTok = parseInput(outputTokens, 'tokens'); // output always tokens
  const numCalls = Math.max(1, parseInt(calls, 10) || 1);

  const costPerCall = (inputTok / 1_000_000) * model.inputPer1M + (outputTok / 1_000_000) * model.outputPer1M;
  const totalCost = costPerCall * numCalls;

  const monthlyCost100 = costPerCall * 100;
  const monthlyCost1k = costPerCall * 1000;
  const monthlyCost10k = costPerCall * 10000;

  const inputLabel = inputMode === 'chars' ? 'characters' : inputMode === 'words' ? 'words' : 'tokens';

  return (
    <div class="space-y-6">
      {/* Model selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Model</label>
        <select
          value={modelKey}
          onChange={(e) => setModelKey((e.target as HTMLSelectElement).value)}
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
        >
          {Object.entries(MODELS).map(([key, m]) => (
            <option key={key} value={key}>{m.label}</option>
          ))}
        </select>
        <p class="text-xs text-text-muted mt-1">
          Input: ${model.inputPer1M}/1M tokens · Output: ${model.outputPer1M}/1M tokens · Context: {model.contextK}K tokens
        </p>
      </div>

      {/* Input mode toggle */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Input size in</label>
        <div class="flex gap-2">
          {(['tokens', 'chars', 'words'] as const).map(m => (
            <button
              key={m}
              onClick={() => setInputMode(m)}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                inputMode === m
                  ? 'bg-primary text-white'
                  : 'bg-bg-card border border-border text-text-muted hover:border-primary'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Input size */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">
            Input {inputLabel}
          </label>
          <input
            type="number"
            min="0"
            value={inputTokens}
            onInput={(e) => setInputTokens((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="1000"
          />
          {inputMode !== 'tokens' && (
            <p class="text-xs text-text-muted mt-1">≈ {inputTok.toLocaleString()} tokens</p>
          )}
        </div>

        {/* Output tokens */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Output tokens</label>
          <input
            type="number"
            min="0"
            value={outputTokens}
            onInput={(e) => setOutputTokens((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="500"
          />
          <p class="text-xs text-text-muted mt-1">≈ {tokensToChars(outputTok).toLocaleString()} chars</p>
        </div>

        {/* Number of calls */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">API calls</label>
          <input
            type="number"
            min="1"
            value={calls}
            onInput={(e) => setCalls((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors"
            placeholder="1"
          />
        </div>
      </div>

      {/* Results */}
      <div class="bg-bg-card border border-border rounded-xl p-5 space-y-4">
        <h3 class="font-semibold text-sm text-text-muted uppercase tracking-wide">Cost Estimate</h3>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <p class="text-xs text-text-muted mb-1">Per call</p>
            <p class="text-2xl font-bold text-primary">${fmt(costPerCall)}</p>
          </div>
          <div>
            <p class="text-xs text-text-muted mb-1">Total ({numCalls.toLocaleString()} calls)</p>
            <p class="text-2xl font-bold">${fmt(totalCost)}</p>
          </div>
        </div>

        <div class="border-t border-border pt-4">
          <p class="text-xs text-text-muted mb-3 uppercase tracking-wide font-medium">Monthly projections (per-call cost × volume)</p>
          <div class="grid grid-cols-3 gap-3">
            {[['100 calls/mo', monthlyCost100], ['1K calls/mo', monthlyCost1k], ['10K calls/mo', monthlyCost10k]].map(([label, cost]) => (
              <div class="text-center bg-bg rounded-lg p-3 border border-border">
                <p class="text-xs text-text-muted mb-1">{label as string}</p>
                <p class="font-bold text-sm">${fmt(cost as number, 2)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p class="text-xs text-text-muted">
        Token estimates use ~4 chars/token (English text). Prices sourced from public model pages — verify with provider before budgeting.
      </p>
    </div>
  );
}
