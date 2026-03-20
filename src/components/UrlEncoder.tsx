import { useState } from 'preact/hooks';

type Mode = 'encode' | 'decode';

export default function UrlEncoder() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [fullUrl, setFullUrl] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const convert = (value: string, m: Mode, fu: boolean): string => {
    if (!value.trim()) return '';
    try {
      if (m === 'encode') {
        return fu ? encodeURI(value) : encodeURIComponent(value);
      } else {
        return fu ? decodeURI(value) : decodeURIComponent(value);
      }
    } catch (e: any) {
      throw new Error(e.message);
    }
  };

  const output = (() => {
    if (!input.trim()) return '';
    try {
      setError('');
      return convert(input, mode, fullUrl);
    } catch (e: any) {
      setError(e.message);
      return '';
    }
  })();

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const swap = () => {
    if (output) {
      setInput(output);
      setMode(mode === 'encode' ? 'decode' : 'encode');
    }
  };

  const loadSample = () => {
    if (mode === 'encode') {
      setInput('Hello World! user@example.com query=a&b=c&foo=bar baz');
    } else {
      setInput('Hello%20World%21%20user%40example.com%20query%3Da%26b%3Dc%26foo%3Dbar%20baz');
    }
    setError('');
  };

  return (
    <div class="space-y-4">
      {/* Mode toggle */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex rounded-lg border border-border overflow-hidden">
          {(['encode', 'decode'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              class={`px-4 py-2 text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-bg' : 'bg-bg-card text-text-muted hover:text-primary'}`}
            >
              {m === 'encode' ? 'Encode' : 'Decode'}
            </button>
          ))}
        </div>

        <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer select-none">
          <input
            type="checkbox"
            checked={fullUrl}
            onChange={(e) => { setFullUrl((e.target as HTMLInputElement).checked); setError(''); }}
            class="accent-primary"
          />
          Full URL mode <span class="text-xs">(preserve <code class="font-mono">://?#&</code>)</span>
        </label>

        <div class="flex gap-2 ml-auto">
          <button onClick={loadSample} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Sample</button>
          <button onClick={swap} disabled={!output} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40">Swap ⇄</button>
          <button onClick={() => { setInput(''); setError(''); }} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          {mode === 'encode' ? 'Plain text / URL to encode' : 'Encoded string to decode'}
        </label>
        <textarea
          class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
          placeholder={mode === 'encode' ? 'Hello World! user@example.com' : 'Hello%20World%21'}
          value={input}
          onInput={(e) => { setInput((e.target as HTMLTextAreaElement).value); setError(''); }}
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
            <label class="block text-sm font-medium text-text-muted">
              {mode === 'encode' ? 'Encoded output' : 'Decoded output'}
            </label>
            <button
              onClick={copy}
              class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div class="w-full bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text break-all select-all">
            {output}
          </div>
          <div class="mt-1 text-xs text-text-muted">{output.length} characters</div>
        </div>
      )}

      {!input && (
        <div class="text-center py-8 text-text-muted text-sm">
          {mode === 'encode' ? 'Enter text above to URL-encode it.' : 'Enter a percent-encoded string to decode it.'}
          <br /><span class="text-xs">All processing runs in your browser — nothing is sent to any server.</span>
        </div>
      )}

      {/* Quick reference */}
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Common encodings</div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            [' ', '%20'], ['@', '%40'], ['&', '%26'], ['=', '%3D'],
            ['#', '%23'], ['+', '%2B'], ['/', '%2F'], ['?', '%3F'],
          ].map(([char, enc]) => (
            <div key={char} class="flex items-center justify-between bg-bg border border-border rounded px-3 py-1.5">
              <code class="text-xs font-mono text-primary">{char}</code>
              <span class="text-xs text-text-muted mx-2">→</span>
              <code class="text-xs font-mono text-text">{enc}</code>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
