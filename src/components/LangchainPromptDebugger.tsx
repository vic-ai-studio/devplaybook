import { useState, useMemo } from 'preact/hooks';

// Rough token estimate: 1 token ≈ 4 chars for English
function countTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function extractVariables(template: string): string[] {
  const matches = template.match(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g) || [];
  const seen = new Set<string>();
  return matches
    .map(m => m.slice(1, -1))
    .filter(v => { if (seen.has(v)) return false; seen.add(v); return true; });
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g, (_, key) =>
    key in values ? (values[key] || `{${key}}`) : `{${key}}`
  );
}

const EXAMPLE_TEMPLATE = `You are a helpful assistant specialized in {domain}.

User query: {user_query}

Please provide a {response_style} response. Limit your answer to {max_words} words.

Additional context: {context}`;

export default function LangchainPromptDebugger() {
  const [template, setTemplate] = useState(EXAMPLE_TEMPLATE);
  const [values, setValues] = useState<Record<string, string>>({
    domain: 'Python programming',
    user_query: 'How do I reverse a list?',
    response_style: 'concise and practical',
    max_words: '100',
    context: 'The user is a beginner developer.',
  });
  const [copied, setCopied] = useState(false);

  const variables = useMemo(() => extractVariables(template), [template]);
  const filled = useMemo(() => fillTemplate(template, values), [template, values]);

  const templateTokens = countTokens(template);
  const filledTokens = countTokens(filled);
  const unfilledVars = variables.filter(v => !values[v]?.trim());

  function handleValueChange(key: string, val: string) {
    setValues(prev => ({ ...prev, [key]: val }));
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleClear() {
    setTemplate('');
    setValues({});
  }

  function handleLoadExample() {
    setTemplate(EXAMPLE_TEMPLATE);
    setValues({
      domain: 'Python programming',
      user_query: 'How do I reverse a list?',
      response_style: 'concise and practical',
      max_words: '100',
      context: 'The user is a beginner developer.',
    });
  }

  return (
    <div class="space-y-6">
      {/* Template Input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">Prompt Template</h2>
          <div class="flex gap-2">
            <button
              onClick={handleLoadExample}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
            >
              Load Example
            </button>
            <button
              onClick={handleClear}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text hover:border-primary/50 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <p class="text-xs text-text-muted mb-3">
          Use <code class="bg-surface px-1 rounded font-mono">{'{variable_name}'}</code> placeholders. Variables are extracted automatically.
        </p>
        <textarea
          value={template}
          onInput={(e) => setTemplate((e.target as HTMLTextAreaElement).value)}
          class="w-full h-48 bg-surface border border-border rounded-lg p-3 text-sm font-mono text-text resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          placeholder="Enter your LangChain prompt template with {variable} placeholders..."
        />
        <div class="flex items-center gap-4 mt-2 text-xs text-text-muted">
          <span>~{templateTokens.toLocaleString()} template tokens</span>
          <span>{template.length.toLocaleString()} chars</span>
          <span class="text-primary font-medium">{variables.length} variable{variables.length !== 1 ? 's' : ''} detected</span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Variable Inputs */}
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-4">
            Variable Injection
            {unfilledVars.length > 0 && (
              <span class="ml-2 text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                {unfilledVars.length} empty
              </span>
            )}
          </h2>
          {variables.length === 0 ? (
            <p class="text-sm text-text-muted italic">
              No variables detected. Add <code class="bg-surface px-1 rounded font-mono text-xs">{'{variable}'}</code> to your template.
            </p>
          ) : (
            <div class="space-y-3">
              {variables.map(v => (
                <div key={v}>
                  <label class="block text-xs font-medium text-text-muted mb-1.5">
                    <code class="font-mono text-primary">{`{${v}}`}</code>
                  </label>
                  <input
                    type="text"
                    value={values[v] ?? ''}
                    onInput={(e) => handleValueChange(v, (e.target as HTMLInputElement).value)}
                    placeholder={`Value for ${v}...`}
                    class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-text-muted/50"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output Preview */}
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-4">
            <h2 class="font-semibold text-text">Filled Prompt Preview</h2>
            <button
              onClick={handleCopy}
              disabled={!filled.trim()}
              class="text-xs px-3 py-1.5 rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <div class="h-48 bg-surface border border-border rounded-lg p-3 text-sm font-mono text-text overflow-y-auto whitespace-pre-wrap break-words">
            {filled || <span class="text-text-muted italic">Start typing in the template above...</span>}
          </div>
          <div class="flex items-center gap-4 mt-2 text-xs text-text-muted">
            <span>~{filledTokens.toLocaleString()} filled tokens</span>
            <span>{filled.length.toLocaleString()} chars</span>
            {filledTokens > 4096 && (
              <span class="text-yellow-400">⚠ Exceeds GPT-3.5 limit</span>
            )}
            {filledTokens > 128000 && (
              <span class="text-red-400">⚠ Exceeds GPT-4o limit</span>
            )}
          </div>
        </div>
      </div>

      {/* Token Analysis */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="font-semibold text-text mb-4">Token Analysis</h2>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Template tokens', value: templateTokens, color: 'text-blue-400' },
            { label: 'Filled tokens', value: filledTokens, color: 'text-green-400' },
            { label: 'Variables', value: variables.length, color: 'text-purple-400' },
            { label: 'Unfilled', value: unfilledVars.length, color: unfilledVars.length > 0 ? 'text-yellow-400' : 'text-text-muted' },
          ].map(({ label, value, color }) => (
            <div key={label} class="bg-surface rounded-lg p-4 text-center">
              <div class={`text-2xl font-bold ${color}`}>{value.toLocaleString()}</div>
              <div class="text-xs text-text-muted mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Context window bars */}
        <div class="mt-4 space-y-2">
          <p class="text-xs font-medium text-text-muted mb-2">Context window usage</p>
          {[
            { model: 'GPT-3.5 Turbo', limit: 16384, color: 'bg-blue-500' },
            { model: 'GPT-4o (128K)', limit: 131072, color: 'bg-green-500' },
            { model: 'Claude 3.5 Sonnet (200K)', limit: 204800, color: 'bg-purple-500' },
            { model: 'Gemini 1.5 Pro (1M)', limit: 1048576, color: 'bg-orange-500' },
          ].map(({ model, limit, color }) => {
            const pct = Math.min(100, (filledTokens / limit) * 100);
            return (
              <div key={model} class="flex items-center gap-3 text-xs">
                <span class="w-48 text-text-muted truncate">{model}</span>
                <div class="flex-1 bg-surface rounded-full h-2 overflow-hidden">
                  <div
                    class={`h-full rounded-full transition-all ${color} ${pct > 90 ? 'opacity-100' : 'opacity-70'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span class="w-12 text-right text-text-muted">{pct.toFixed(1)}%</span>
              </div>
            );
          })}
        </div>
      </div>

      <p class="text-xs text-text-muted text-center">
        Token counts are estimates (~4 chars/token). Use <a href="/tools/tokenizer-counter" class="text-primary hover:underline">Tokenizer Counter</a> for precise model-specific counts.
      </p>
    </div>
  );
}
