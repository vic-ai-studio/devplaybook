import { useState, useCallback } from 'preact/hooks';

const SAMPLE_TEMPLATE = `You are a {role} expert.

Your task: {task}

Context:
{context}

Constraints:
- Keep the response under {max_words} words
- Format: {output_format}

Begin:`;

function extractSlots(template: string): string[] {
  const matches = [...template.matchAll(/\{([^}]+)\}/g)];
  const seen = new Set<string>();
  return matches.map(m => m[1]).filter(s => { if (seen.has(s)) return false; seen.add(s); return true; });
}

function fillTemplate(template: string, values: Record<string, string>): string {
  return template.replace(/\{([^}]+)\}/g, (_, key) => values[key] || `{${key}}`);
}

export default function PromptTemplateBuilder() {
  const [template, setTemplate] = useState(SAMPLE_TEMPLATE);
  const [values, setValues] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'build' | 'preview'>('build');

  const slots = extractSlots(template);
  const filled = fillTemplate(template, values);
  const unfilled = slots.filter(s => !values[s]);

  const copyFilled = () => {
    navigator.clipboard.writeText(filled).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const exportJSON = () => {
    const data = JSON.stringify({ template, slots, values }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt-template.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSample = () => {
    setTemplate(SAMPLE_TEMPLATE);
    setValues({
      role: 'software engineering',
      task: 'review this Python function for bugs and best-practice violations',
      context: '[paste your code here]',
      max_words: '300',
      output_format: 'numbered list of issues, severity: high/medium/low',
    });
  };

  return (
    <div class="space-y-4">
      {/* Tab bar */}
      <div class="flex gap-2">
        {(['build', 'preview'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors capitalize ${
              tab === t ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'
            }`}
          >
            {t === 'build' ? '🔧 Build' : '👁 Preview'}
          </button>
        ))}
        <button
          onClick={loadSample}
          class="ml-auto px-3 py-2 rounded-lg bg-bg-card border border-border text-text-muted text-sm hover:border-primary transition-colors"
        >
          Load sample
        </button>
      </div>

      {tab === 'build' ? (
        <>
          {/* Template editor */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">
              Template <span class="text-xs font-normal">— use <code class="bg-bg border border-border px-1 rounded">&#123;slot_name&#125;</code> for variables</span>
            </label>
            <textarea
              class="w-full h-52 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
              value={template}
              onInput={(e) => { setTemplate((e.target as HTMLTextAreaElement).value); setValues({}); }}
              placeholder="Write your prompt template with {slot} placeholders..."
            />
          </div>

          {/* Slot fillers */}
          {slots.length > 0 && (
            <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 class="text-sm font-semibold text-text-muted">Fill Variables</h3>
              {slots.map(slot => (
                <div key={slot} class="flex items-center gap-3">
                  <label class="text-sm font-mono text-primary min-w-[140px] flex-shrink-0">
                    {`{${slot}}`}
                  </label>
                  <input
                    type="text"
                    value={values[slot] || ''}
                    onInput={(e) => setValues(v => ({ ...v, [slot]: (e.target as HTMLInputElement).value }))}
                    placeholder={`Enter ${slot}...`}
                    class="flex-1 bg-bg border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-primary transition-colors"
                  />
                </div>
              ))}
              {unfilled.length > 0 && (
                <p class="text-xs text-yellow-400">⚠ Unfilled: {unfilled.map(s => `{${s}}`).join(', ')}</p>
              )}
            </div>
          )}

          {slots.length === 0 && template.trim() && (
            <p class="text-xs text-text-muted">No <code>&#123;slots&#125;</code> detected. Add some to make this template reusable.</p>
          )}
        </>
      ) : (
        /* Preview tab */
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">Filled prompt</label>
            <div class="flex gap-2">
              <button
                onClick={exportJSON}
                class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors"
              >
                Export JSON
              </button>
              <button
                onClick={copyFilled}
                class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy prompt'}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            value={filled}
          />
          <p class="text-xs text-text-muted mt-2">
            {filled.length} chars · ~{Math.ceil(filled.length / 4).toLocaleString()} tokens · {slots.length} variable{slots.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
}
