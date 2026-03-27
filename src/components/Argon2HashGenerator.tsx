import { useState, useEffect, useCallback } from 'preact/hooks';

type Mode = 'generate' | 'verify';

declare global {
  interface Window {
    argon2?: {
      ArgonType: { Argon2d: number; Argon2i: number; Argon2id: number };
      hash: (opts: {
        pass: string;
        salt: string;
        time: number;
        mem: number;
        parallelism: number;
        hashLen: number;
        type: number;
      }) => Promise<{ encoded: string; hashHex: string }>;
      verify: (opts: { pass: string; encoded: string }) => Promise<void>;
    };
    loadArgon2WasmBinary?: () => Promise<Uint8Array>;
  }
}

const ARGON_TYPE_LABELS: Record<string, string> = {
  '0': 'Argon2d (data-dependent, faster)',
  '1': 'Argon2i (data-independent, side-channel resistant)',
  '2': 'Argon2id (hybrid, recommended)',
};

function randomSalt(len = 16): string {
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function useArgon2() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.argon2) { setReady(true); return; }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/argon2-browser@1.18.0/dist/argon2-bundled.min.js';
    script.onload = () => setReady(true);
    script.onerror = () => console.error('Failed to load argon2-browser');
    document.head.appendChild(script);
  }, []);

  return ready;
}

export default function Argon2HashGenerator() {
  const argon2Ready = useArgon2();
  const [mode, setMode] = useState<Mode>('generate');
  const [password, setPassword] = useState('');
  const [salt, setSalt] = useState('');
  const [autoSalt, setAutoSalt] = useState(true);
  const [memoryCost, setMemoryCost] = useState(65536); // 64 MB
  const [timeCost, setTimeCost] = useState(3);
  const [parallelism, setParallelism] = useState(1);
  const [hashType, setHashType] = useState(2); // Argon2id
  const [hashLen, setHashLen] = useState(32);
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [verifyEncoded, setVerifyEncoded] = useState('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);

  const effectiveSalt = autoSalt ? '' : salt;

  const handleGenerate = useCallback(async () => {
    if (!argon2Ready || !window.argon2) { setError('argon2 library not loaded yet'); return; }
    if (!password) { setError('Please enter a password'); return; }
    setError('');
    setLoading(true);
    setResult('');

    try {
      const useSalt = autoSalt ? randomSalt(16) : salt || randomSalt(16);
      const res = await window.argon2.hash({
        pass: password,
        salt: useSalt,
        time: timeCost,
        mem: memoryCost,
        parallelism,
        hashLen,
        type: hashType,
      });
      setResult(res.encoded);
    } catch (e: any) {
      setError(e.message || String(e) || 'Hashing failed');
    } finally {
      setLoading(false);
    }
  }, [argon2Ready, password, salt, autoSalt, memoryCost, timeCost, parallelism, hashType, hashLen]);

  const handleVerify = useCallback(async () => {
    if (!argon2Ready || !window.argon2) { setError('argon2 library not loaded yet'); return; }
    if (!password || !verifyEncoded) { setError('Please enter both password and encoded hash'); return; }
    setError('');
    setLoading(true);
    setVerifyResult(null);

    try {
      await window.argon2.verify({ pass: password, encoded: verifyEncoded });
      setVerifyResult(true);
    } catch {
      setVerifyResult(false);
    } finally {
      setLoading(false);
    }
  }, [argon2Ready, password, verifyEncoded]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const memLabel = (mem: number) => {
    if (mem >= 1024) return `${mem / 1024} MB`;
    return `${mem} KB`;
  };

  return (
    <div class="space-y-5">
      {!argon2Ready && (
        <div class="px-3 py-2 rounded-lg bg-surface border border-border text-sm text-text-muted flex items-center gap-2">
          <span class="inline-block w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          Loading argon2-browser WASM…
        </div>
      )}

      {/* Mode Toggle */}
      <div class="flex gap-1 p-1 bg-surface rounded-lg w-fit">
        {(['generate', 'verify'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => { setMode(m); setError(''); setVerifyResult(null); }}
            class={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
              mode === m ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
            }`}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Password */}
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input
          type="text"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          placeholder="Enter password..."
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono focus:outline-none focus:border-accent"
        />
      </div>

      {mode === 'generate' && (
        <>
          {/* Salt */}
          <div>
            <div class="flex items-center gap-3 mb-2">
              <label class="text-sm font-medium">Salt</label>
              <label class="flex items-center gap-1.5 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoSalt}
                  onChange={(e) => setAutoSalt((e.target as HTMLInputElement).checked)}
                  class="accent-accent"
                />
                Auto-generate (recommended)
              </label>
            </div>
            {!autoSalt && (
              <input
                type="text"
                value={salt}
                onInput={(e) => setSalt((e.target as HTMLInputElement).value)}
                placeholder="Custom salt string..."
                class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono focus:outline-none focus:border-accent"
              />
            )}
          </div>

          {/* Hash Type */}
          <div>
            <label class="block text-sm font-medium mb-1">Algorithm Type</label>
            <select
              value={hashType}
              onChange={(e) => setHashType(parseInt((e.target as HTMLSelectElement).value))}
              class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm focus:outline-none focus:border-accent"
            >
              <option value={2}>Argon2id (recommended — hybrid)</option>
              <option value={1}>Argon2i — side-channel resistant</option>
              <option value={0}>Argon2d — data-dependent (faster)</option>
            </select>
          </div>

          {/* Parameters */}
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-sm font-medium">Memory Cost</label>
                <span class="text-xs text-accent font-mono">{memLabel(memoryCost)}</span>
              </div>
              <input
                type="range"
                min={1024}
                max={262144}
                step={1024}
                value={memoryCost}
                onInput={(e) => setMemoryCost(parseInt((e.target as HTMLInputElement).value))}
                class="w-full accent-accent"
              />
              <div class="flex justify-between text-xs text-text-muted mt-0.5">
                <span>1 MB</span><span>256 MB</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <label class="text-sm font-medium">Iterations</label>
                <span class="text-xs text-accent font-mono">{timeCost}</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={timeCost}
                onInput={(e) => setTimeCost(parseInt((e.target as HTMLInputElement).value))}
                class="w-full accent-accent"
              />
              <div class="flex justify-between text-xs text-text-muted mt-0.5">
                <span>1</span><span>20</span>
              </div>
            </div>

            <div>
              <div class="flex justify-between mb-1">
                <label class="text-sm font-medium">Parallelism</label>
                <span class="text-xs text-accent font-mono">{parallelism}</span>
              </div>
              <input
                type="range"
                min={1}
                max={8}
                value={parallelism}
                onInput={(e) => setParallelism(parseInt((e.target as HTMLInputElement).value))}
                class="w-full accent-accent"
              />
              <div class="flex justify-between text-xs text-text-muted mt-0.5">
                <span>1</span><span>8</span>
              </div>
            </div>
          </div>

          {/* Hash length */}
          <div class="flex items-center gap-3">
            <label class="text-sm font-medium shrink-0">Hash Length (bytes):</label>
            <select
              value={hashLen}
              onChange={(e) => setHashLen(parseInt((e.target as HTMLSelectElement).value))}
              class="px-2 py-1 rounded bg-surface border border-border text-sm focus:outline-none focus:border-accent"
            >
              {[16, 32, 64].map(v => (
                <option key={v} value={v}>{v} bytes ({v * 8} bits)</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !argon2Ready}
            class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Hashing…
              </>
            ) : 'Generate Argon2 Hash'}
          </button>

          {result && (
            <div>
              <div class="flex justify-between items-center mb-1">
                <label class="text-sm font-medium">Encoded Hash</label>
                <button
                  onClick={handleCopy}
                  class="text-xs px-2 py-1 rounded bg-surface border border-border hover:border-accent text-text-muted"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <div class="px-3 py-2 bg-surface border border-border rounded-lg font-mono text-xs break-all">
                {result}
              </div>
              <div class="mt-3 rounded-lg border border-border overflow-hidden text-sm">
                <div class="px-3 py-2 bg-surface font-medium text-xs text-text-muted uppercase tracking-wide">Parameter Explanation</div>
                {[
                  { label: 'Format', value: '$argon2id$v=19$m=...,t=...,p=...$<salt>$<hash>' },
                  { label: 'Memory (m)', value: `${memLabel(memoryCost)} — more memory = harder to brute force` },
                  { label: 'Iterations (t)', value: `${timeCost} — more iterations = slower hash` },
                  { label: 'Parallelism (p)', value: `${parallelism} thread(s) — use CPU cores count` },
                  { label: 'Hash Length', value: `${hashLen} bytes = ${hashLen * 8} bits output` },
                ].map(row => (
                  <div key={row.label} class="flex gap-3 px-3 py-2 border-t border-border">
                    <div class="w-28 shrink-0 text-text-muted text-xs mt-0.5">{row.label}</div>
                    <div class="font-mono text-xs break-all flex-1">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {mode === 'verify' && (
        <>
          <div>
            <label class="block text-sm font-medium mb-1">Encoded Hash</label>
            <input
              type="text"
              value={verifyEncoded}
              onInput={(e) => setVerifyEncoded((e.target as HTMLInputElement).value)}
              placeholder="$argon2id$v=19$..."
              class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading || !argon2Ready}
            class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Verifying…
              </>
            ) : 'Verify Password'}
          </button>

          {verifyResult !== null && (
            <div class={`px-4 py-3 rounded-lg border text-sm font-medium flex items-center gap-2 ${
              verifyResult
                ? 'bg-green-500/10 border-green-500/30 text-green-500'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}>
              {verifyResult ? '✓ Password matches the hash' : '✗ Password does NOT match the hash'}
            </div>
          )}
        </>
      )}

      {error && (
        <div class="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
