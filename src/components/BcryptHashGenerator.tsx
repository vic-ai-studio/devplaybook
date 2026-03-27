import { useState, useCallback } from 'preact/hooks';
import bcrypt from 'bcryptjs';

type Mode = 'generate' | 'verify';

interface HashBreakdown {
  version: string;
  cost: string;
  salt: string;
  hash: string;
}

function parseHash(hash: string): HashBreakdown | null {
  // $2b$12$<22 chars salt><31 chars hash>
  const match = hash.match(/^\$(\w+)\$(\d+)\$(.{22})(.{31})$/);
  if (!match) return null;
  return {
    version: `$${match[1]}$`,
    cost: match[2],
    salt: match[3],
    hash: match[4],
  };
}

export default function BcryptHashGenerator() {
  const [mode, setMode] = useState<Mode>('generate');
  const [password, setPassword] = useState('');
  const [costFactor, setCostFactor] = useState(12);
  const [result, setResult] = useState('');
  const [breakdown, setBreakdown] = useState<HashBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [verifyHash, setVerifyHash] = useState('');
  const [verifyResult, setVerifyResult] = useState<boolean | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = useCallback(async () => {
    if (!password) { setError('Please enter a password'); return; }
    setError('');
    setLoading(true);
    setResult('');
    setBreakdown(null);
    try {
      const hash = await bcrypt.hash(password, costFactor);
      setResult(hash);
      setBreakdown(parseHash(hash));
    } catch (e: any) {
      setError(e.message || 'Hashing failed');
    } finally {
      setLoading(false);
    }
  }, [password, costFactor]);

  const handleVerify = useCallback(async () => {
    if (!password || !verifyHash) { setError('Please enter both password and hash'); return; }
    setError('');
    setLoading(true);
    setVerifyResult(null);
    try {
      const match = await bcrypt.compare(password, verifyHash);
      setVerifyResult(match);
    } catch (e: any) {
      setError('Invalid hash format');
      setVerifyResult(false);
    } finally {
      setLoading(false);
    }
  }, [password, verifyHash]);

  const handleCopy = () => {
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const estimateTime = (cost: number) => {
    // ~100ms at cost 10 on modern hardware, doubles each step
    const ms = 100 * Math.pow(2, cost - 10);
    if (ms < 1000) return `~${Math.round(ms)}ms`;
    return `~${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div class="space-y-5">
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

      {/* Password Input */}
      <div>
        <label class="block text-sm font-medium mb-1">Password</label>
        <input
          type="text"
          value={password}
          onInput={(e) => setPassword((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && (mode === 'generate' ? handleGenerate() : handleVerify())}
          placeholder="Enter password to hash..."
          class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono focus:outline-none focus:border-accent"
        />
      </div>

      {mode === 'generate' && (
        <>
          {/* Cost Factor */}
          <div>
            <div class="flex justify-between mb-1">
              <label class="text-sm font-medium">Cost Factor: <span class="text-accent font-mono">{costFactor}</span></label>
              <span class="text-xs text-text-muted">{estimateTime(costFactor)} per hash</span>
            </div>
            <input
              type="range"
              min={4}
              max={31}
              value={costFactor}
              onInput={(e) => setCostFactor(parseInt((e.target as HTMLInputElement).value))}
              class="w-full accent-accent"
            />
            <div class="flex justify-between text-xs text-text-muted mt-0.5">
              <span>4 (fastest)</span>
              <span>12 (recommended)</span>
              <span>31 (slowest)</span>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            class="px-4 py-2 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span class="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Hashing ({estimateTime(costFactor)})…
              </>
            ) : 'Generate Hash'}
          </button>

          {result && (
            <div class="space-y-3">
              <div>
                <div class="flex justify-between items-center mb-1">
                  <label class="text-sm font-medium">bcrypt Hash</label>
                  <button
                    onClick={handleCopy}
                    class="text-xs px-2 py-1 rounded bg-surface border border-border hover:border-accent text-text-muted"
                  >
                    {copied ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <div class="px-3 py-2 bg-surface border border-border rounded-lg font-mono text-sm break-all">
                  {result}
                </div>
              </div>

              {breakdown && (
                <div class="rounded-lg border border-border overflow-hidden text-sm">
                  <div class="px-3 py-2 bg-surface font-medium text-xs text-text-muted uppercase tracking-wide">Hash Breakdown</div>
                  {[
                    { label: 'Algorithm Version', value: breakdown.version, desc: 'bcrypt version 2b' },
                    { label: 'Cost Factor', value: `${breakdown.cost} (2^${breakdown.cost} = ${Math.pow(2, parseInt(breakdown.cost)).toLocaleString()} iterations)`, desc: 'Work factor' },
                    { label: 'Salt (22 chars)', value: breakdown.salt, desc: 'Random base64 salt' },
                    { label: 'Hash (31 chars)', value: breakdown.hash, desc: 'Derived key' },
                  ].map(row => (
                    <div key={row.label} class="flex gap-3 px-3 py-2 border-t border-border">
                      <div class="w-40 shrink-0 text-text-muted text-xs mt-0.5">{row.label}</div>
                      <div class="font-mono text-xs break-all flex-1">{row.value}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {mode === 'verify' && (
        <>
          <div>
            <label class="block text-sm font-medium mb-1">Stored Hash</label>
            <input
              type="text"
              value={verifyHash}
              onInput={(e) => setVerifyHash((e.target as HTMLInputElement).value)}
              placeholder="$2b$12$..."
              class="w-full px-3 py-2 rounded-lg bg-surface border border-border text-sm font-mono focus:outline-none focus:border-accent"
            />
          </div>

          <button
            onClick={handleVerify}
            disabled={loading}
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
