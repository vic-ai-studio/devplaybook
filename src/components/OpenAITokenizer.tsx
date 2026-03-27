import { useState, useMemo } from 'preact/hooks';

interface ModelInfo {
  label: string;
  encoding: 'cl100k' | 'o200k';
  contextK: number;
  inputPer1M: number;
}

const MODELS: Record<string, ModelInfo> = {
  'gpt-4o':        { label: 'GPT-4o',        encoding: 'o200k',  contextK: 128, inputPer1M: 2.50 },
  'gpt-4o-mini':   { label: 'GPT-4o mini',   encoding: 'o200k',  contextK: 128, inputPer1M: 0.15 },
  'gpt-4-turbo':   { label: 'GPT-4 Turbo',   encoding: 'cl100k', contextK: 128, inputPer1M: 10.00 },
  'gpt-3.5-turbo': { label: 'GPT-3.5 Turbo', encoding: 'cl100k', contextK: 16,  inputPer1M: 0.50 },
};

function estimateTokens(text: string, encoding: 'cl100k' | 'o200k'): number {
  if (!text) return 0;
  const punctuation = (text.match(/[^\w\s]/g) || []).length;
  if (encoding === 'o200k') {
    return Math.ceil(text.length / 4.2 + punctuation * 0.3);
  }
  return Math.ceil(text.length / 4.0 + punctuation * 0.3);
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.000000';
  if (cost < 0.000001) return '<$0.000001';
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
        copied
          ? 'bg-green-700 text-white'
          : 'bg-bg-card border border-border text-text-muted hover:text-text'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy prompt'}
    </button>
  );
}

const EXAMPLE_PROMPT = `You are a helpful assistant that answers questions clearly and concisely.

User question: What is the difference between GPT-4o and GPT-4 Turbo?

Please provide a comparison covering: model architecture, context window size, pricing, speed, and recommended use cases. Format your answer with headers for each comparison dimension.`;

export default function OpenAITokenizer() {
  const [text, setText] = useState(EXAMPLE_PROMPT);
  const [modelKey, setModelKey] = useState('gpt-4o');

  const model = MODELS[modelKey];

  const stats = useMemo(() => {
    const tokens = estimateTokens(text, model.encoding);
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const cost = (tokens / 1_000_000) * model.inputPer1M;
    const contextPct = (tokens / (model.contextK * 1000)) * 100;
    return { tokens, chars, words, cost, contextPct };
  }, [text, model]);

  return (
    <div class="space-y-6">
      {/* Prompt textarea */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Prompt Input</h2>
          <div class="flex gap-2">
            <CopyButton value={text} />
            <button
              onClick={() => setText(EXAMPLE_PROMPT)}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Load example
            </button>
            <button
              onClick={() => setText('')}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={text}
          onInput={(e) => setText((e.target as HTMLTextAreaElement).value)}
          class="w-full h-52 bg-surface border border-border rounded-lg p-3 text-sm text-text font-mono resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          placeholder="Paste your prompt here to count tokens..."
        />
        <p class="text-xs text-text-muted mt-2">
          Tip: Paste your full system prompt + user message to see total input token usage.
        </p>
      </div>

      {/* Model selector */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-4">Model</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
          {Object.entries(MODELS).map(([key, m]) => (
            <button
              key={key}
              onClick={() => setModelKey(key)}
              class={`p-3 rounded-lg border text-left transition-colors ${
                modelKey === key
                  ? 'bg-primary/15 border-primary text-primary'
                  : 'bg-surface border-border text-text-muted hover:border-primary/50 hover:text-text'
              }`}
            >
              <div class="text-sm font-medium leading-tight">{m.label}</div>
              <div class="text-xs mt-1 opacity-70">{m.encoding}</div>
            </button>
          ))}
        </div>

        {/* Stats grid */}
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          <div class="bg-surface rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-primary">{stats.tokens.toLocaleString()}</div>
            <div class="text-xs text-text-muted mt-0.5">Tokens (est.)</div>
          </div>
          <div class="bg-surface rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-text">{stats.chars.toLocaleString()}</div>
            <div class="text-xs text-text-muted mt-0.5">Characters</div>
          </div>
          <div class="bg-surface rounded-lg p-3 text-center">
            <div class="text-2xl font-bold text-text">{stats.words.toLocaleString()}</div>
            <div class="text-xs text-text-muted mt-0.5">Words</div>
          </div>
          <div class="bg-surface rounded-lg p-3 text-center">
            <div class="text-lg font-bold text-green-400">{formatCost(stats.cost)}</div>
            <div class="text-xs text-text-muted mt-0.5">Input cost</div>
          </div>
        </div>

        {/* Context window bar */}
        <div>
          <div class="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>{model.label} context window ({model.contextK}K tokens)</span>
            <span class={
              stats.contextPct > 80 ? 'text-red-400 font-semibold' :
              stats.contextPct > 50 ? 'text-yellow-400 font-semibold' :
              'text-green-400'
            }>
              {stats.contextPct < 0.01
                ? '<0.01'
                : stats.contextPct.toFixed(2)}% used
            </span>
          </div>
          <div class="w-full bg-surface rounded-full h-3 overflow-hidden">
            <div
              class={`h-full rounded-full transition-all duration-300 ${
                stats.contextPct > 80 ? 'bg-red-500' :
                stats.contextPct > 50 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, stats.contextPct)}%` }}
            />
          </div>
          {stats.contextPct > 80 && (
            <p class="text-xs text-red-400 mt-2">
              Warning: prompt is using over 80% of the context window. Leave room for the response.
            </p>
          )}
        </div>
      </div>

      {/* Pricing reference */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-3">Model Pricing Reference</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-sm min-w-[420px]">
            <thead>
              <tr class="border-b border-border text-xs text-text-muted">
                <th class="text-left py-2 pr-4">Model</th>
                <th class="text-right py-2 pr-4">Encoding</th>
                <th class="text-right py-2 pr-4">Context</th>
                <th class="text-right py-2 pr-4">Input / 1M tokens</th>
                <th class="text-right py-2">Your prompt cost</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/30">
              {Object.entries(MODELS).map(([key, m]) => {
                const t = estimateTokens(text, m.encoding);
                const c = (t / 1_000_000) * m.inputPer1M;
                return (
                  <tr key={key} class={`hover:bg-surface/50 ${key === modelKey ? 'bg-primary/5' : ''}`}>
                    <td class="py-2 pr-4 font-medium text-text">{m.label}</td>
                    <td class="py-2 pr-4 text-right font-mono text-xs text-text-muted">{m.encoding}</td>
                    <td class="py-2 pr-4 text-right text-text-muted">{m.contextK}K</td>
                    <td class="py-2 pr-4 text-right text-text-muted">${m.inputPer1M.toFixed(2)}</td>
                    <td class="py-2 text-right font-mono text-green-400">{formatCost(c)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p class="text-xs text-text-muted mt-3">
          Token counts are estimates using BPE heuristics (~4 chars/token for English). Actual API counts may differ by ±5–10%. Pricing as of 2025.
        </p>
      </div>
    </div>
  );
}
