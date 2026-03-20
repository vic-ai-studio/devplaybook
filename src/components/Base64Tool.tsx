import { useState, useCallback } from 'preact/hooks';

type Mode = 'encode' | 'decode';

function encodeBase64(text: string): string {
  try {
    return btoa(unescape(encodeURIComponent(text)));
  } catch {
    return 'Error: invalid input';
  }
}

function decodeBase64(text: string): string {
  try {
    return decodeURIComponent(escape(atob(text.trim())));
  } catch {
    return 'Error: invalid Base64 string';
  }
}

export default function Base64Tool() {
  const [mode, setMode] = useState<Mode>('encode');
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);

  const output = useCallback(() => {
    if (!input.trim()) return '';
    return mode === 'encode' ? encodeBase64(input) : decodeBase64(input);
  }, [input, mode]);

  const result = output();

  const copyResult = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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
      <div class="flex gap-2">
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
            {mode === 'encode' ? 'Base64 output' : 'Decoded text'}
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
        </p>
      )}
    </div>
  );
}
