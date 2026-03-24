import { useState } from 'preact/hooks';

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')      // remove comments
    .replace(/\s+/g, ' ')                   // collapse whitespace
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .replace(/;}/g, '}')                    // remove trailing semicolons
    .trim();
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(2)} KB`;
}

export default function CssMinifier() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = input.trim() ? minifyCss(input) : '';

  const originalBytes = new TextEncoder().encode(input).length;
  const minifiedBytes = new TextEncoder().encode(output).length;
  const savings = originalBytes > 0 ? Math.round((1 - minifiedBytes / originalBytes) * 100) : 0;

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const clear = () => {
    setInput('');
    setCopied(false);
  };

  return (
    <div class="space-y-6">
      {/* Stats bar */}
      {output && (
        <div class="grid grid-cols-3 gap-3 text-center">
          <div class="bg-bg-card border border-border rounded-xl p-3">
            <p class="text-xs text-text-muted mb-1">Original</p>
            <p class="text-sm font-semibold text-text">{formatBytes(originalBytes)}</p>
          </div>
          <div class="bg-bg-card border border-border rounded-xl p-3">
            <p class="text-xs text-text-muted mb-1">Minified</p>
            <p class="text-sm font-semibold text-text">{formatBytes(minifiedBytes)}</p>
          </div>
          <div class={`border rounded-xl p-3 ${savings > 0 ? 'bg-green-500/10 border-green-500/40' : 'bg-bg-card border-border'}`}>
            <p class="text-xs text-text-muted mb-1">Saved</p>
            <p class={`text-sm font-semibold ${savings > 0 ? 'text-green-400' : 'text-text'}`}>{savings}%</p>
          </div>
        </div>
      )}

      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold text-text">Input CSS</label>
          {input && (
            <button onClick={clear} class="text-xs text-text-muted hover:text-red-400 transition-colors">
              Clear
            </button>
          )}
        </div>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder={`.container {\n  display: flex;\n  align-items: center;\n  /* center children */\n  justify-content: center;\n}\n\n.button {\n  background-color: #3b82f6;\n  color: white;\n  padding: 0.5rem 1rem;\n}`}
          rows={12}
          class="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-y"
          spellcheck={false}
        />
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold text-text">Minified Output</label>
          <button
            onClick={copy}
            disabled={!output}
            class="bg-primary hover:bg-primary-dark text-white text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <div class="bg-bg-card border border-border rounded-xl px-4 py-3 min-h-[80px] overflow-x-auto">
          {output ? (
            <code class="text-sm font-mono text-text whitespace-pre-wrap break-all select-all">{output}</code>
          ) : (
            <span class="text-sm text-text-muted italic">Minified CSS will appear here…</span>
          )}
        </div>
      </div>

      {/* Info */}
      <div class="bg-bg-card border border-border rounded-xl p-4 text-sm text-text-muted space-y-1">
        <p class="font-semibold text-text text-xs uppercase tracking-wide mb-2">What gets removed</p>
        <ul class="space-y-1 text-xs">
          <li>✓ All CSS comments (<code class="font-mono">/* … */</code>)</li>
          <li>✓ Unnecessary whitespace and newlines</li>
          <li>✓ Spaces around <code class="font-mono">{'{ } : ; ,'}</code></li>
          <li>✓ Trailing semicolons before closing braces</li>
        </ul>
      </div>
    </div>
  );
}
