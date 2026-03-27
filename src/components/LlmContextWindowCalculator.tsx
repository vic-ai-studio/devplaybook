import { useState } from 'preact/hooks';

interface LlmModel {
  id: string;
  name: string;
  provider: string;
  contextWindow: number; // tokens
  inputPricePerMToken: number; // $ per 1M tokens
  outputPricePerMToken: number;
  tokensPerWord: number; // approx
}

const MODELS: LlmModel[] = [
  // Anthropic
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', contextWindow: 200000, inputPricePerMToken: 3.0, outputPricePerMToken: 15.0, tokensPerWord: 1.3 },
  { id: 'claude-3-7-sonnet', name: 'Claude 3.7 Sonnet', provider: 'Anthropic', contextWindow: 200000, inputPricePerMToken: 3.0, outputPricePerMToken: 15.0, tokensPerWord: 1.3 },
  { id: 'claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', contextWindow: 200000, inputPricePerMToken: 15.0, outputPricePerMToken: 75.0, tokensPerWord: 1.3 },
  { id: 'claude-3-haiku', name: 'Claude 3.5 Haiku', provider: 'Anthropic', contextWindow: 200000, inputPricePerMToken: 0.8, outputPricePerMToken: 4.0, tokensPerWord: 1.3 },
  // OpenAI
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', contextWindow: 128000, inputPricePerMToken: 2.5, outputPricePerMToken: 10.0, tokensPerWord: 1.3 },
  { id: 'gpt-4o-mini', name: 'GPT-4o mini', provider: 'OpenAI', contextWindow: 128000, inputPricePerMToken: 0.15, outputPricePerMToken: 0.6, tokensPerWord: 1.3 },
  { id: 'o1', name: 'o1', provider: 'OpenAI', contextWindow: 200000, inputPricePerMToken: 15.0, outputPricePerMToken: 60.0, tokensPerWord: 1.3 },
  { id: 'o3-mini', name: 'o3-mini', provider: 'OpenAI', contextWindow: 200000, inputPricePerMToken: 1.1, outputPricePerMToken: 4.4, tokensPerWord: 1.3 },
  // Google
  { id: 'gemini-2-flash', name: 'Gemini 2.0 Flash', provider: 'Google', contextWindow: 1048576, inputPricePerMToken: 0.1, outputPricePerMToken: 0.4, tokensPerWord: 1.3 },
  { id: 'gemini-1-5-pro', name: 'Gemini 1.5 Pro', provider: 'Google', contextWindow: 2000000, inputPricePerMToken: 1.25, outputPricePerMToken: 5.0, tokensPerWord: 1.3 },
  { id: 'gemini-2-pro', name: 'Gemini 2.0 Pro', provider: 'Google', contextWindow: 2000000, inputPricePerMToken: 1.25, outputPricePerMToken: 10.0, tokensPerWord: 1.3 },
  // Meta
  { id: 'llama-3-70b', name: 'Llama 3.1 70B', provider: 'Meta (Groq)', contextWindow: 128000, inputPricePerMToken: 0.59, outputPricePerMToken: 0.79, tokensPerWord: 1.3 },
  { id: 'llama-3-405b', name: 'Llama 3.1 405B', provider: 'Meta (Groq)', contextWindow: 32768, inputPricePerMToken: 5.0, outputPricePerMToken: 8.0, tokensPerWord: 1.3 },
  // Mistral
  { id: 'mistral-large', name: 'Mistral Large', provider: 'Mistral', contextWindow: 128000, inputPricePerMToken: 2.0, outputPricePerMToken: 6.0, tokensPerWord: 1.3 },
  { id: 'mistral-small', name: 'Mistral Small', provider: 'Mistral', contextWindow: 32000, inputPricePerMToken: 0.1, outputPricePerMToken: 0.3, tokensPerWord: 1.3 },
  // DeepSeek
  { id: 'deepseek-v3', name: 'DeepSeek V3', provider: 'DeepSeek', contextWindow: 128000, inputPricePerMToken: 0.27, outputPricePerMToken: 1.1, tokensPerWord: 1.3 },
  { id: 'deepseek-r1', name: 'DeepSeek R1', provider: 'DeepSeek', contextWindow: 64000, inputPricePerMToken: 0.55, outputPricePerMToken: 2.19, tokensPerWord: 1.3 },
];

function estimateTokens(text: string): number {
  if (!text.trim()) return 0;
  // Rough approximation: ~4 chars per token for English, less for code
  const chars = text.length;
  const words = text.trim().split(/\s+/).length;
  // Blend: code has more tokens per word
  const codeRatio = (text.match(/[{}();=<>\/]/g) || []).length / Math.max(chars, 1);
  const tokPerWord = codeRatio > 0.05 ? 1.6 : 1.3;
  return Math.ceil(words * tokPerWord);
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toString();
}

function formatPrice(dollars: number): string {
  if (dollars < 0.001) return '<$0.001';
  if (dollars < 0.01) return '$' + dollars.toFixed(4);
  if (dollars < 1) return '$' + dollars.toFixed(3);
  return '$' + dollars.toFixed(2);
}

function getUsageColor(pct: number): string {
  if (pct >= 95) return 'bg-red-500';
  if (pct >= 80) return 'bg-amber-500';
  if (pct >= 60) return 'bg-yellow-500';
  return 'bg-green-500';
}

function getUsageTextColor(pct: number): string {
  if (pct >= 95) return 'text-red-400';
  if (pct >= 80) return 'text-amber-400';
  if (pct >= 60) return 'text-yellow-400';
  return 'text-green-400';
}

const providers = [...new Set(MODELS.map(m => m.provider))];

export default function LlmContextWindowCalculator() {
  const [selectedModelId, setSelectedModelId] = useState('claude-3-5-sonnet');
  const [inputText, setInputText] = useState('');
  const [estimatedOutputTokens, setEstimatedOutputTokens] = useState(500);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState('All');

  const model = MODELS.find(m => m.id === selectedModelId) || MODELS[0];
  const inputTokens = estimateTokens(inputText);
  const totalTokens = inputTokens + estimatedOutputTokens;
  const usagePct = Math.min((inputTokens / model.contextWindow) * 100, 100);
  const totalUsagePct = Math.min((totalTokens / model.contextWindow) * 100, 100);

  const inputCost = (inputTokens / 1_000_000) * model.inputPricePerMToken;
  const outputCost = (estimatedOutputTokens / 1_000_000) * model.outputPricePerMToken;
  const totalCost = inputCost + outputCost;

  const filteredModels = selectedProvider === 'All' ? MODELS : MODELS.filter(m => m.provider === selectedProvider);

  return (
    <div class="space-y-6">
      {/* Model Selector */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Select Model</h3>
        <div class="flex flex-wrap gap-2 mb-2">
          <button
            onClick={() => setSelectedProvider('All')}
            class={`px-2 py-1 rounded text-xs transition-colors ${selectedProvider === 'All' ? 'bg-accent text-white' : 'bg-bg border border-border hover:border-accent/50'}`}
          >
            All
          </button>
          {providers.map(p => (
            <button
              key={p}
              onClick={() => setSelectedProvider(p)}
              class={`px-2 py-1 rounded text-xs transition-colors ${selectedProvider === p ? 'bg-accent text-white' : 'bg-bg border border-border hover:border-accent/50'}`}
            >
              {p}
            </button>
          ))}
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {filteredModels.map(m => (
            <button
              key={m.id}
              onClick={() => setSelectedModelId(m.id)}
              class={`flex items-center justify-between px-3 py-2 rounded border text-left text-sm transition-colors ${m.id === selectedModelId ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50 bg-bg'}`}
            >
              <div>
                <div class={`font-medium text-xs ${m.id === selectedModelId ? 'text-accent' : ''}`}>{m.name}</div>
                <div class="text-xs text-text-muted">{m.provider}</div>
              </div>
              <div class="text-right">
                <div class="text-xs font-mono text-text-muted">{formatNumber(m.contextWindow)} ctx</div>
                <div class="text-xs text-text-muted">${m.inputPricePerMToken}/1M in</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div class="space-y-4">
          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Your Input Text</h3>
            <textarea
              class="w-full bg-bg border border-border rounded-lg p-3 text-sm font-mono resize-none"
              rows={10}
              value={inputText}
              onInput={e => setInputText((e.target as HTMLTextAreaElement).value)}
              placeholder="Paste your prompt, document, or code here to estimate token count and cost..."
            />
            <p class="text-xs text-text-muted">Token count is estimated (~4 chars/token). Actual count may vary by ±10%.</p>
          </div>

          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Expected Output Tokens</h3>
            <div class="flex items-center gap-3">
              <input
                type="range"
                min="50"
                max="8000"
                step="50"
                value={estimatedOutputTokens}
                onInput={e => setEstimatedOutputTokens(Number((e.target as HTMLInputElement).value))}
                class="flex-1"
              />
              <input
                type="number"
                min="0"
                max="100000"
                class="w-24 bg-bg border border-border rounded px-2 py-1.5 text-sm text-right font-mono"
                value={estimatedOutputTokens}
                onInput={e => setEstimatedOutputTokens(Number((e.target as HTMLInputElement).value))}
              />
            </div>
            <div class="flex gap-2">
              {[100, 500, 1000, 2000, 4000].map(n => (
                <button
                  key={n}
                  onClick={() => setEstimatedOutputTokens(n)}
                  class={`px-2 py-1 rounded text-xs transition-colors ${estimatedOutputTokens === n ? 'bg-accent text-white' : 'bg-bg border border-border hover:border-accent/50'}`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results */}
        <div class="space-y-4">
          {/* Main stats */}
          <div class="bg-surface border border-border rounded-lg p-4 space-y-4">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">
              {model.name} — {formatNumber(model.contextWindow)} context window
            </h3>

            {/* Input tokens usage */}
            <div class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>Input tokens</span>
                <span class={`font-mono font-semibold ${getUsageTextColor(usagePct)}`}>{formatNumber(inputTokens)} / {formatNumber(model.contextWindow)}</span>
              </div>
              <div class="w-full bg-bg rounded-full h-3 overflow-hidden">
                <div
                  class={`h-3 rounded-full transition-all ${getUsageColor(usagePct)}`}
                  style={{ width: `${Math.min(usagePct, 100)}%` }}
                />
              </div>
              <div class="flex justify-between text-xs text-text-muted">
                <span>{usagePct.toFixed(1)}% of context used by input</span>
                <span>{formatNumber(model.contextWindow - inputTokens)} remaining</span>
              </div>
            </div>

            {/* Total usage (input + output) */}
            <div class="space-y-1">
              <div class="flex justify-between text-sm">
                <span>Total (input + output)</span>
                <span class={`font-mono font-semibold ${getUsageTextColor(totalUsagePct)}`}>{formatNumber(totalTokens)} / {formatNumber(model.contextWindow)}</span>
              </div>
              <div class="w-full bg-bg rounded-full h-3 overflow-hidden flex">
                <div class="h-3 bg-blue-500 transition-all" style={{ width: `${Math.min(usagePct, 100)}%` }} />
                <div class="h-3 bg-purple-500 transition-all" style={{ width: `${Math.min(Math.max(totalUsagePct - usagePct, 0), 100 - Math.min(usagePct, 100))}%` }} />
              </div>
              <div class="flex gap-4 text-xs text-text-muted">
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-blue-500 rounded-sm inline-block" /> Input</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 bg-purple-500 rounded-sm inline-block" /> Output</span>
              </div>
            </div>

            {/* Warnings */}
            {usagePct >= 95 && (
              <div class="bg-red-900/30 border border-red-500/50 rounded p-3 text-xs text-red-400">
                ⚠ Input exceeds 95% of context window. The model may truncate your input or produce degraded results.
              </div>
            )}
            {usagePct >= 80 && usagePct < 95 && (
              <div class="bg-amber-900/30 border border-amber-500/50 rounded p-3 text-xs text-amber-400">
                ⚡ Input is approaching the context limit. Consider chunking your content.
              </div>
            )}
            {totalUsagePct > 100 && (
              <div class="bg-red-900/30 border border-red-500/50 rounded p-3 text-xs text-red-400">
                ✗ Total tokens exceed the context window. Reduce input or expected output.
              </div>
            )}
          </div>

          {/* Cost breakdown */}
          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Cost Estimate (single call)</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-text-muted">Input ({formatNumber(inputTokens)} tokens × ${model.inputPricePerMToken}/1M)</span>
                <span class="font-mono">{formatPrice(inputCost)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-text-muted">Output ({formatNumber(estimatedOutputTokens)} tokens × ${model.outputPricePerMToken}/1M)</span>
                <span class="font-mono">{formatPrice(outputCost)}</span>
              </div>
              <div class="border-t border-border pt-2 flex justify-between font-semibold">
                <span>Total per call</span>
                <span class="font-mono text-accent">{formatPrice(totalCost)}</span>
              </div>
            </div>
            {/* Scale estimates */}
            <div class="bg-bg rounded p-3 space-y-1">
              <p class="text-xs font-semibold text-text-muted mb-2">At scale:</p>
              {[100, 1000, 10000].map(calls => (
                <div key={calls} class="flex justify-between text-xs">
                  <span class="text-text-muted">{calls.toLocaleString()} calls/day</span>
                  <span class="font-mono">{formatPrice(totalCost * calls)}/day · {formatPrice(totalCost * calls * 30)}/mo</span>
                </div>
              ))}
            </div>
          </div>

          {/* Text stats */}
          {inputText && (
            <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
              <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Text Analysis</h3>
              <div class="grid grid-cols-3 gap-3 text-center">
                <div>
                  <div class="text-lg font-bold font-mono">{formatNumber(inputText.length)}</div>
                  <div class="text-xs text-text-muted">characters</div>
                </div>
                <div>
                  <div class="text-lg font-bold font-mono">{formatNumber(inputText.trim().split(/\s+/).filter(Boolean).length)}</div>
                  <div class="text-xs text-text-muted">words</div>
                </div>
                <div>
                  <div class="text-lg font-bold font-mono text-accent">{formatNumber(inputTokens)}</div>
                  <div class="text-xs text-text-muted">est. tokens</div>
                </div>
              </div>
              <p class="text-xs text-text-muted">
                ~{(inputTokens / Math.max(inputText.trim().split(/\s+/).filter(Boolean).length, 1)).toFixed(1)} tokens/word detected
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
