import { useState } from 'preact/hooks';

type IndentSize = 2 | 4 | 'tab';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState<IndentSize>(2);
  const [copied, setCopied] = useState(false);

  const format = (value: string, ind: IndentSize) => {
    const src = value.trim();
    if (!src) { setOutput(''); setError(''); return; }
    try {
      const parsed = JSON.parse(src);
      const space = ind === 'tab' ? '\t' : ind;
      setOutput(JSON.stringify(parsed, null, space));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setOutput('');
    }
  };

  const minify = () => {
    const src = input.trim();
    if (!src) return;
    try {
      const parsed = JSON.parse(src);
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e: any) {
      setError(e.message);
      setOutput('');
    }
  };

  const handleInput = (val: string) => {
    setInput(val);
    format(val, indent);
  };

  const handleIndent = (ind: IndentSize) => {
    setIndent(ind);
    format(input, ind);
  };

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const clear = () => { setInput(''); setOutput(''); setError(''); };

  const loadSample = () => {
    const sample = `{"name":"DevPlaybook","version":"2.0","tools":["JSON Formatter","Base64","JWT Decoder"],"meta":{"author":"DevPlaybook Team","url":"https://devplaybook.cc"}}`;
    setInput(sample);
    format(sample, indent);
  };

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Indent:</label>
          {(['2', '4', 'tab'] as string[]).map(v => {
            const val = v === '2' ? 2 : v === '4' ? 4 : 'tab' as IndentSize;
            return (
              <button
                key={v}
                onClick={() => handleIndent(val)}
                class={`px-3 py-1 text-xs rounded border transition-colors ${indent === val ? 'bg-primary text-bg border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'}`}
              >
                {v === 'tab' ? 'Tab' : `${v} spaces`}
              </button>
            );
          })}
        </div>
        <div class="flex gap-2 ml-auto">
          <button onClick={loadSample} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Sample</button>
          <button onClick={minify} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Minify</button>
          <button onClick={clear} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Input JSON</label>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
          placeholder='Paste your JSON here... {"key": "value"}'
          value={input}
          onInput={(e) => handleInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <div class="flex justify-between mt-1">
          <span class="text-xs text-text-muted">{input.length} characters</span>
          {error && <span class="text-xs text-red-400">⚠ {error}</span>}
        </div>
      </div>

      {/* Output */}
      {output && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">Formatted JSON</label>
            <button
              onClick={copy}
              class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="w-full bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text overflow-auto max-h-96 whitespace-pre">{output}</pre>
          <div class="mt-1 text-xs text-text-muted">{output.split('\n').length} lines · {output.length} characters</div>
        </div>
      )}

      {!input && (
        <div class="text-center py-8 text-text-muted text-sm">
          Paste JSON above to auto-format with syntax validation.
          <br /><span class="text-xs">All processing happens in your browser — nothing is sent to any server.</span>
        </div>
      )}
    </div>
  );
}
