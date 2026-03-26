import { useState, useCallback } from 'preact/hooks';

async function getKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function bufToB64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64ToBuf(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

async function encryptText(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await getKey(password, salt);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(plaintext));
  // Format: base64(salt) . base64(iv) . base64(ciphertext)
  const payload = { s: bufToB64(salt), i: bufToB64(iv), c: bufToB64(encrypted), v: 1 };
  return btoa(JSON.stringify(payload));
}

async function decryptText(token: string, password: string): Promise<string> {
  const payload = JSON.parse(atob(token));
  if (payload.v !== 1) throw new Error('Unsupported encryption version');
  const salt = b64ToBuf(payload.s);
  const iv = b64ToBuf(payload.i);
  const ciphertext = b64ToBuf(payload.c);
  const key = await getKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export default function TextEncryption() {
  const [mode, setMode] = useState<'encrypt' | 'decrypt'>('encrypt');
  const [input, setInput] = useState('');
  const [password, setPassword] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const run = useCallback(async () => {
    if (!input.trim()) { setError('Input text is required'); return; }
    if (!password) { setError('Password is required'); return; }
    setError(''); setOutput(''); setLoading(true);
    try {
      if (mode === 'encrypt') {
        const result = await encryptText(input, password);
        setOutput(result);
      } else {
        const result = await decryptText(input.trim(), password);
        setOutput(result);
      }
    } catch (e) {
      setError(mode === 'decrypt'
        ? 'Decryption failed — wrong password or corrupted input'
        : 'Encryption failed: ' + String(e));
    } finally {
      setLoading(false);
    }
  }, [mode, input, password]);

  const copy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const swap = useCallback(() => {
    if (output) {
      setInput(output);
      setOutput('');
    }
    setMode(m => m === 'encrypt' ? 'decrypt' : 'encrypt');
    setError('');
  }, [output]);

  return (
    <div class="space-y-4">
      {/* Mode Toggle */}
      <div class="flex gap-2">
        <button
          onClick={() => { setMode('encrypt'); setOutput(''); setError(''); }}
          class={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${mode === 'encrypt' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:bg-bg'}`}
        >
          🔒 Encrypt
        </button>
        <button
          onClick={() => { setMode('decrypt'); setOutput(''); setError(''); }}
          class={`flex-1 py-3 rounded-xl font-medium text-sm transition-colors ${mode === 'decrypt' ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:bg-bg'}`}
        >
          🔓 Decrypt
        </button>
      </div>

      {/* Info Banner */}
      <div class="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-xs text-blue-400">
        <strong>AES-256-GCM</strong> encryption using the browser's Web Crypto API. Your password never leaves your device. PBKDF2 key derivation (100k iterations, SHA-256). Nothing is sent to any server.
      </div>

      {/* Input */}
      <div class="space-y-2">
        <label class="text-xs font-medium text-text-muted">
          {mode === 'encrypt' ? 'Plaintext to encrypt' : 'Encrypted token to decrypt'}
        </label>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={5}
          spellcheck={false}
          class="w-full p-3 font-mono text-sm bg-surface border border-border rounded-xl text-text resize-y focus:outline-none focus:border-accent"
          placeholder={mode === 'encrypt' ? 'Enter your secret message here...' : 'Paste the encrypted token here...'}
        />
      </div>

      {/* Password */}
      <div class="space-y-2">
        <label class="text-xs font-medium text-text-muted">Password</label>
        <div class="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onInput={e => setPassword((e.target as HTMLInputElement).value)}
            class="w-full p-3 pr-10 font-mono text-sm bg-surface border border-border rounded-xl text-text focus:outline-none focus:border-accent"
            placeholder="Encryption password (share separately from ciphertext)"
            onKeyDown={(e) => { if (e.key === 'Enter') run(); }}
          />
          <button
            onClick={() => setShowPassword(s => !s)}
            class="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {/* Run Button */}
      <button
        onClick={run}
        disabled={loading}
        class="w-full py-3 bg-accent text-white rounded-xl font-medium text-sm hover:bg-accent/90 transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing…' : mode === 'encrypt' ? 'Encrypt Text' : 'Decrypt Token'}
      </button>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-sm text-red-400">
          ✗ {error}
        </div>
      )}

      {/* Output */}
      {output && (
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-border">
            <span class="text-xs text-text-muted font-medium">
              {mode === 'encrypt' ? 'Encrypted Token' : 'Decrypted Text'}
            </span>
            <div class="flex gap-2">
              <button
                onClick={copy}
                class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
              <button
                onClick={swap}
                class="text-xs px-3 py-1 bg-surface border border-border text-text-muted rounded hover:bg-bg transition-colors"
                title={mode === 'encrypt' ? 'Switch to Decrypt mode with this output' : 'Switch to Encrypt mode with this output'}
              >
                ⇄ Swap
              </button>
            </div>
          </div>
          <pre class="p-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap break-all">{output}</pre>
        </div>
      )}

      {/* Security Notes */}
      <div class="bg-surface border border-border rounded-xl p-4 space-y-2 text-xs text-text-muted">
        <div class="font-medium text-text mb-1">Security Notes</div>
        <div>• Use a strong, unique password — the encryption is only as secure as your password</div>
        <div>• Never share your password in the same channel as the encrypted text</div>
        <div>• AES-256-GCM provides both confidentiality and authenticity (tamper detection)</div>
        <div>• Each encryption uses a random salt + IV — encrypting the same text twice produces different tokens</div>
        <div>• For sensitive data, use proper key management — this tool is for convenience, not enterprise security</div>
      </div>
    </div>
  );
}
