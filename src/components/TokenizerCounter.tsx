import { useState, useMemo } from 'preact/hooks';

interface ModelInfo {
  label: string;
  contextK: number;
  inputPer1M: number;
  outputPer1M: number;
  encoding: 'cl100k' | 'o200k' | 'gemini';
}

const MODELS: Record<string, ModelInfo> = {
  'gpt-4o':             { label: 'GPT-4o',             contextK: 128,  inputPer1M: 2.50,   outputPer1M: 10.00,  encoding: 'o200k' },
  'gpt-4o-mini':        { label: 'GPT-4o mini',         contextK: 128,  inputPer1M: 0.15,   outputPer1M: 0.60,   encoding: 'o200k' },
  'gpt-4-turbo':        { label: 'GPT-4 Turbo',         contextK: 128,  inputPer1M: 10.00,  outputPer1M: 30.00,  encoding: 'cl100k' },
  'gpt-3.5-turbo':      { label: 'GPT-3.5 Turbo',       contextK: 16,   inputPer1M: 0.50,   outputPer1M: 1.50,   encoding: 'cl100k' },
  'claude-sonnet-4-6':  { label: 'Claude Sonnet 4.6',   contextK: 200,  inputPer1M: 3.00,   outputPer1M: 15.00,  encoding: 'cl100k' },
  'claude-3-5-sonnet':  { label: 'Claude 3.5 Sonnet',   contextK: 200,  inputPer1M: 3.00,   outputPer1M: 15.00,  encoding: 'cl100k' },
  'claude-3-5-haiku':   { label: 'Claude 3.5 Haiku',    contextK: 200,  inputPer1M: 0.80,   outputPer1M: 4.00,   encoding: 'cl100k' },
  'claude-3-opus':      { label: 'Claude 3 Opus',        contextK: 200,  inputPer1M: 15.00,  outputPer1M: 75.00,  encoding: 'cl100k' },
  'gemini-2.0-flash':   { label: 'Gemini 2.0 Flash',    contextK: 1048, inputPer1M: 0.10,   outputPer1M: 0.40,   encoding: 'gemini' },
  'gemini-1.5-pro':     { label: 'Gemini 1.5 Pro',      contextK: 2097, inputPer1M: 1.25,   outputPer1M: 5.00,   encoding: 'gemini' },
  'gemini-1.5-flash':   { label: 'Gemini 1.5 Flash',    contextK: 1048, inputPer1M: 0.075,  outputPer1M: 0.30,   encoding: 'gemini' },
};

// Token estimation by encoding type
// cl100k_base (GPT-4, Claude): roughly 1 token per 4 chars for English, with BPE adjustments
// o200k_base (GPT-4o): slightly larger vocab, similar ratio
// Gemini SentencePiece: slightly different, ~3.8 chars/token
function estimateTokens(text: string, encoding: ModelInfo['encoding']): number {
  if (!text) return 0;
  const chars = text.length;
  // Adjust for punctuation/whitespace density
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const punctuation = (text.match(/[^\w\s]/g) || []).length;

  if (encoding === 'gemini') {
    // Gemini uses SentencePiece, slightly more efficient
    return Math.ceil(chars / 3.8 + punctuation * 0.2);
  } else if (encoding === 'o200k') {
    // o200k_base has larger vocabulary — slightly fewer tokens
    return Math.ceil(chars / 4.2 + punctuation * 0.3);
  } else {
    // cl100k_base — standard estimate
    return Math.ceil(chars / 4 + punctuation * 0.3);
  }
}

function formatCost(cost: number): string {
  if (cost === 0) return '$0.00';
  if (cost < 0.000001) return `<$0.000001`;
  if (cost < 0.001) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

const EXAMPLE_TEXT = `The quick brown fox jumps over the lazy dog. This is a sample text to demonstrate tokenization.

LangChain is a framework for developing applications powered by large language models (LLMs). It provides abstractions for chaining multiple LLM calls, tools, and data sources together.

Token counting is essential for:
1. Estimating API costs before making calls
2. Staying within context window limits
3. Optimizing prompt engineering
4. Budgeting AI applications at scale`;

export default function TokenizerCounter() {
  const [text, setText] = useState(EXAMPLE_TEXT);
  const [modelKey, setModelKey] = useState('gpt-4o');
  const [compareMode, setCompareMode] = useState(false);

  const model = MODELS[modelKey];

  const stats = useMemo(() => {
    const tokens = estimateTokens(text, model.encoding);
    const chars = text.length;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const lines = text.split('\n').length;
    const sentences = (text.match(/[.!?]+/g) || []).length;
    const cost = (tokens / 1_000_000) * model.inputPer1M;
    const contextPct = (tokens / (model.contextK * 1000)) * 100;
    return { tokens, chars, words, lines, sentences, cost, contextPct };
  }, [text, model]);

  const allModelStats = useMemo(() => {
    return Object.entries(MODELS).map(([key, m]) => ({
      key,
      ...m,
      tokens: estimateTokens(text, m.encoding),
      cost: (estimateTokens(text, m.encoding) / 1_000_000) * m.inputPer1M,
    }));
  }, [text]);

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Text Input</h2>
          <div class="flex gap-2">
            <button
              onClick={() => setText(EXAMPLE_TEXT)}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Load Example
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
          class="w-full h-44 bg-surface border border-border rounded-lg p-3 text-sm text-text font-mono resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          placeholder="Paste your text here to count tokens..."
        />
      </div>

      {/* Model Select */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex flex-wrap items-center gap-3 mb-4">
          <h2 class="font-semibold text-text">Model</h2>
          <select
            value={modelKey}
            onChange={(e) => setModelKey((e.target as HTMLSelectElement).value)}
            class="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary/50"
          >
            {Object.entries(MODELS).map(([key, m]) => (
              <option key={key} value={key}>{m.label}</option>
            ))}
          </select>
          <button
            onClick={() => setCompareMode(!compareMode)}
            class={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${compareMode ? 'bg-primary/10 border-primary/40 text-primary' : 'bg-bg-card border-border text-text-muted hover:text-text'}`}
          >
            Compare all models
          </button>
        </div>

        {/* Main Stats */}
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Tokens', value: stats.tokens.toLocaleString(), color: 'text-primary', big: true },
            { label: 'Characters', value: stats.chars.toLocaleString(), color: 'text-text' },
            { label: 'Words', value: stats.words.toLocaleString(), color: 'text-text' },
            { label: 'Lines', value: stats.lines.toLocaleString(), color: 'text-text' },
            { label: 'Sentences', value: stats.sentences.toLocaleString(), color: 'text-text' },
            { label: 'Input cost', value: formatCost(stats.cost), color: 'text-green-400' },
          ].map(({ label, value, color, big }) => (
            <div key={label} class="bg-surface rounded-lg p-3 text-center">
              <div class={`font-bold ${big ? 'text-2xl' : 'text-lg'} ${color}`}>{value}</div>
              <div class="text-xs text-text-muted mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* Context bar */}
        <div class="mt-4">
          <div class="flex items-center justify-between text-xs text-text-muted mb-1.5">
            <span>{model.label} context window ({(model.contextK).toLocaleString()}K tokens)</span>
            <span class={stats.contextPct > 80 ? 'text-red-400 font-medium' : stats.contextPct > 50 ? 'text-yellow-400' : 'text-green-400'}>
              {stats.contextPct.toFixed(2)}% used
            </span>
          </div>
          <div class="w-full bg-surface rounded-full h-3 overflow-hidden">
            <div
              class={`h-full rounded-full transition-all ${stats.contextPct > 80 ? 'bg-red-500' : stats.contextPct > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.min(100, stats.contextPct)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Compare all models */}
      {compareMode && (
        <div class="bg-bg-card border border-border rounded-xl p-5 overflow-x-auto">
          <h2 class="font-semibold text-text mb-4">All Models Comparison</h2>
          <table class="w-full text-sm min-w-[560px]">
            <thead>
              <tr class="border-b border-border text-xs text-text-muted">
                <th class="text-left py-2 pr-4">Model</th>
                <th class="text-right py-2 pr-4">Tokens</th>
                <th class="text-right py-2 pr-4">Input cost</th>
                <th class="text-right py-2 pr-4">Context</th>
                <th class="text-right py-2">Usage</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border/30">
              {allModelStats.map(m => (
                <tr key={m.key} class={`hover:bg-surface/50 ${m.key === modelKey ? 'bg-primary/5' : ''}`}>
                  <td class="py-2 pr-4 text-text font-medium">{m.label}</td>
                  <td class="py-2 pr-4 text-right font-mono text-text">{m.tokens.toLocaleString()}</td>
                  <td class="py-2 pr-4 text-right font-mono text-green-400">{formatCost(m.cost)}</td>
                  <td class="py-2 pr-4 text-right text-text-muted">{m.contextK}K</td>
                  <td class="py-2 text-right text-xs">
                    <span class={`${(m.tokens / (m.contextK * 1000) * 100) > 80 ? 'text-red-400' : 'text-text-muted'}`}>
                      {((m.tokens / (m.contextK * 1000)) * 100).toFixed(1)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p class="text-xs text-text-muted mt-3">
            Token counts are estimates based on encoding type. Actual counts may vary ±5–10%.
          </p>
        </div>
      )}

      <p class="text-xs text-text-muted text-center">
        Token estimates use BPE/SentencePiece heuristics (~4 chars/token for English). Actual API token counts may differ slightly.
      </p>
    </div>
  );
}
