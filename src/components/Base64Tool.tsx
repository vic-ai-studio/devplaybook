import { useState, useCallback, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

type Mode = 'encode' | 'decode';

function encodeBase64(text: string, urlSafe: boolean = false): string {
  try {
    const b64 = btoa(unescape(encodeURIComponent(text)));
    return urlSafe ? b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') : b64;
  } catch {
    return 'Error: invalid input';
  }
}

function decodeBase64(text: string): string {
  try {
    // Normalize URL-safe base64 back to standard
    const normalized = text.trim().replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    return decodeURIComponent(escape(atob(padded)));
  } catch {
    return 'Error: invalid Base64 string';
  }
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [pro, setPro] = useState(false);
  // Pro features
  const [urlSafe, setUrlSafe] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchCopied, setBatchCopied] = useState(false);

  useEffect(() => {
    setPro(isProUser());
  }, []);

  const output = useCallback(() => {
    if (!input.trim()) return '';
    return mode === 'encode' ? encodeBase64(input, urlSafe) : decodeBase64(input);
  }, [input, mode, urlSafe]);

  const result = output();

  const batchOutput = (() => {
    if (!batchInput.trim()) return '';
    return batchInput
      .split('\n')
      .map(line => {
        if (!line) return '';
        return mode === 'encode' ? encodeBase64(line, urlSafe) : decodeBase64(line);
      })
      .join('\n');
  })();

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
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

  const swapMode = () => {
    const newMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(newMode);
    setInput(result);
  };

  return (
    <div class="space-y-4">
      {/* Mode toggle */}
      <div class="flex gap-2 flex-wrap items-center">
        <button
          onClick={() => setMode('encode')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            mode === 'encode'
              ? 'bg-primary text-white'
              : 'bg-bg-card border border-border text-text-muted hover:border-primary'
          }`}
        >
          Encode → Base64
        </button>
        <button
          onClick={() => setMode('decode')}
          class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            mode === 'decode'
              ? 'bg-primary text-white'
              : 'bg-bg-card border border-border text-text-muted hover:border-primary'
          }`}
        >
          Decode ← Base64
        </button>

        {/* URL-safe toggle — Pro only */}
        {mode === 'encode' && (
          <label class={`flex items-center gap-2 text-sm cursor-pointer select-none ml-auto ${pro ? 'text-text-muted' : 'text-text-muted/50'}`}>
            <input
              type="checkbox"
              checked={urlSafe}
              disabled={!pro}
              onChange={(e) => pro && setUrlSafe((e.target as HTMLInputElement).checked)}
              class="accent-primary disabled:opacity-40"
            />
            URL-safe
            {!pro && (
              <a href="/pro" class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full hover:underline">Pro</a>
            )}
          </label>
        )}
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          {mode === 'encode' ? 'Plain text input' : 'Base64 input'}
        </label>
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder={mode === 'encode' ? 'Enter text to encode...' : 'Enter Base64 string to decode...'}
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      {/* Controls */}
      <div class="flex gap-2">
        <button
          onClick={swapMode}
          class="px-4 py-2 rounded-lg bg-bg-card border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors"
          title="Use output as new input (swap mode)"
        >
          ⇅ Use as input
        </button>
        <button
          onClick={() => setInput('')}
          class="px-4 py-2 rounded-lg bg-bg-card border border-border text-text-muted text-sm hover:border-primary hover:text-primary transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <label class="text-sm font-medium text-text-muted">
            {mode === 'encode' ? `Base64 output${urlSafe ? ' (URL-safe)' : ''}` : 'Decoded text'}
          </label>
          <button
            onClick={copyResult}
            disabled={!result || result.startsWith('Error:')}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <textarea
          readOnly
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
          value={result}
          placeholder="Output will appear here..."
        />
      </div>

      {result && !result.startsWith('Error:') && (
        <p class="text-xs text-text-muted">
          Input: {input.length} chars → Output: {result.length} chars
          {urlSafe && mode === 'encode' && <span class="text-primary ml-2">· URL-safe (no +/= chars)</span>}
        </p>
      )}

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
            <p class="text-xs text-text-muted">{mode === 'encode' ? 'Encode' : 'Decode'} multiple strings at once — one per line. Available with Pro.</p>
            <a href="/pro" class="text-xs text-primary hover:underline shrink-0 ml-2">Unlock with Pro →</a>
          </div>
        ) : batchMode ? (
          <div class="space-y-3">
            <div>
              <label class="block text-xs text-text-muted mb-1">Input — one {mode === 'encode' ? 'text string' : 'Base64 value'} per line</label>
              <textarea
                class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
                placeholder={mode === 'encode' ? 'Hello World\nfoo bar\nexample text' : 'SGVsbG8gV29ybGQ=\nZm9vIGJhcg=='}
                value={batchInput}
                onInput={(e) => setBatchInput((e.target as HTMLTextAreaElement).value)}
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

      {pro && <p class="text-xs text-primary text-right">✓ Pro — URL-safe mode &amp; batch encode/decode enabled</p>}
    </div>
  );
}
