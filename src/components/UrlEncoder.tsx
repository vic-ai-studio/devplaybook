import { useState, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

type Mode = 'encode' | 'decode';

export default function UrlEncoder() {
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('encode');
  const [fullUrl, setFullUrl] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [pro, setPro] = useState(false);
  // Batch mode (Pro)
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchCopied, setBatchCopied] = useState(false);

  useEffect(() => {
    setPro(isProUser());
  }, []);

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

  const batchOutput = (() => {
    if (!batchInput.trim()) return '';
    return batchInput
      .split('\n')
      .map(line => {
        if (!line.trim()) return '';
        try {
          return convert(line, mode, fullUrl);
        } catch {
          return `[Error: invalid input]`;
        }
      })
      .join('\n');
  })();

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const copyBatch = () => {
    if (!batchOutput) return;
    navigator.clipboard.writeText(batchOutput).then(() => {
      setBatchCopied(true);
      setTimeout(() => setBatchCopied(false), 1500);
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

      {/* Batch Mode — Pro only */}
      <div class={`border rounded-xl p-4 space-y-3 ${pro ? 'border-border' : 'border-border/50'}`}>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-text">Batch {mode === 'encode' ? 'Encode' : 'Decode'}</h3>
            {!pro && (
              <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Pro</span>
            )}
          </div>
          {pro && (
            <button
              onClick={() => setBatchMode(b => !b)}
              class="text-xs border border-border hover:border-primary text-text-muted hover:text-primary px-3 py-1 rounded-lg transition-colors"
            >
              {batchMode ? 'Hide' : 'Open'}
            </button>
          )}
        </div>

        {!pro ? (
          <div class="flex items-center justify-between">
            <p class="text-xs text-text-muted">{mode === 'encode' ? 'Encode' : 'Decode'} multiple URLs at once — one per line. Available with Pro.</p>
            <a href="/pro" class="text-xs text-primary hover:underline shrink-0 ml-2">Unlock with Pro →</a>
          </div>
        ) : batchMode ? (
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-text-muted mb-1">Input — one {mode === 'encode' ? 'value' : 'encoded string'} per line</label>
              <textarea
                class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
                placeholder={mode === 'encode' ? 'Hello World!\nuser@example.com\nfoo bar baz' : 'Hello%20World%21\nuser%40example.com'}
                value={batchInput}
                onInput={(e) => setBatchInput((e.target as HTMLTextAreaElement).value)}
                spellcheck={false}
              />
            </div>
            {batchOutput && (
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-xs text-text-muted">Batch output</label>
                  <button onClick={copyBatch} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                    {batchCopied ? '✓ Copied!' : 'Copy All'}
                  </button>
                </div>
                <pre class="w-full bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text overflow-x-auto whitespace-pre-wrap break-all">{batchOutput}</pre>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {pro && <p class="text-xs text-primary text-right">✓ Pro — batch mode enabled</p>}
    </div>
  );
}
