import { useState } from 'preact/hooks';

type Algorithm = 'SHA-256' | 'SHA-512' | 'SHA-1';
type OutputFormat = 'hex' | 'base64';

async function computeHmac(message: string, key: string, algo: Algorithm): Promise<ArrayBuffer> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(key),
    { name: 'HMAC', hash: algo },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, enc.encode(message));
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

export default function HmacGenerator() {
  const [message, setMessage] = useState('Hello, World!');
  const [key, setKey] = useState('my-secret-key');
  const [algo, setAlgo] = useState<Algorithm>('SHA-256');
  const [format, setFormat] = useState<OutputFormat>('hex');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function generate() {
    setError('');
    if (!key) { setError('Secret key is required.'); return; }
    try {
      const buf = await computeHmac(message, key, algo);
      setResult(format === 'hex' ? toHex(buf) : toBase64(buf));
      setCopied(false);
    } catch (e) {
      setError(`Error: ${(e as Error).message}`);
    }
  }

  async function copy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="block text-sm text-text-muted mb-1">Message</label>
          <textarea
            rows={4}
            value={message}
            onInput={(e) => setMessage((e.target as HTMLTextAreaElement).value)}
            placeholder="Enter message to hash..."
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent resize-y"
          />
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Secret Key</label>
          <input
            type="text"
            value={key}
            onInput={(e) => setKey((e.target as HTMLInputElement).value)}
            placeholder="my-secret-key"
            class="w-full px-3 py-2 bg-surface border border-border rounded font-mono text-sm focus:outline-none focus:border-accent"
          />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-sm text-text-muted mb-1">Algorithm</label>
            <select
              value={algo}
              onChange={(e) => setAlgo((e.target as HTMLSelectElement).value as Algorithm)}
              class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
            >
              <option value="SHA-256">HMAC-SHA256</option>
              <option value="SHA-512">HMAC-SHA512</option>
              <option value="SHA-1">HMAC-SHA1</option>
            </select>
          </div>
          <div>
            <label class="block text-sm text-text-muted mb-1">Output Format</label>
            <select
              value={format}
              onChange={(e) => setFormat((e.target as HTMLSelectElement).value as OutputFormat)}
              class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
            >
              <option value="hex">Hex</option>
              <option value="base64">Base64</option>
            </select>
          </div>
        </div>
      </div>

      {/* Generate */}
      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded font-medium hover:bg-accent/90 transition-colors"
      >
        Generate HMAC
      </button>

      {/* Error */}
      {error && (
        <p class="text-sm text-red-400">{error}</p>
      )}

      {/* Result */}
      {result && (
        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-sm text-text-muted">HMAC-{algo.replace('SHA-', 'SHA')} ({format})</label>
            <button
              onClick={copy}
              class="text-sm px-3 py-1 border border-border rounded hover:border-accent hover:text-accent transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div class="bg-surface border border-border rounded p-4">
            <code class="font-mono text-sm break-all text-green-400">{result}</code>
          </div>
          <p class="text-xs text-text-muted mt-2">
            Length: {result.length} chars · {format === 'hex' ? result.length / 2 : Math.round(result.length * 0.75)} bytes
          </p>
        </div>
      )}

      <div class="text-xs text-text-muted space-y-1 pt-2 border-t border-border">
        <p>Uses <code class="bg-surface px-1 rounded">crypto.subtle.sign()</code> — Web Crypto API, runs entirely in your browser. Nothing is sent to any server.</p>
        <p>HMAC-SHA256 is the standard for JWT signatures, webhook verification (GitHub, Stripe), and API request signing.</p>
      </div>
    </div>
  );
}
