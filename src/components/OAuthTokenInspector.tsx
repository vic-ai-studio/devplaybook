import { useState, useCallback } from 'preact/hooks';

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4;
  const padded2 = pad ? padded + '='.repeat(4 - pad) : padded;
  try {
    return decodeURIComponent(
      atob(padded2)
        .split('')
        .map((c) => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return atob(padded2);
  }
}

function formatDate(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleString();
  } catch {
    return String(ts);
  }
}

function isExpired(exp: number): boolean {
  return Date.now() / 1000 > exp;
}

function expiresIn(exp: number): string {
  const diff = exp - Date.now() / 1000;
  if (diff <= 0) return 'Expired';
  if (diff < 60) return `${Math.round(diff)}s`;
  if (diff < 3600) return `${Math.round(diff / 60)}m`;
  if (diff < 86400) return `${Math.round(diff / 3600)}h`;
  return `${Math.round(diff / 86400)}d`;
}

interface TokenPayload {
  [key: string]: unknown;
}

const SENSITIVE_KEYS = ['password', 'secret', 'token', 'key', 'credential'];

const EXAMPLE_TOKENS = [
  {
    label: 'Sample JWT',
    value: 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1NiIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImlzcyI6Imh0dHBzOi8vYXV0aC5leGFtcGxlLmNvbSIsImF1ZCI6ImFwaS5leGFtcGxlLmNvbSIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgcmVhZDp1c2VycyIsImlhdCI6MTcxMDAwMDAwMCwiZXhwIjoxNzEwMDAzNjAwfQ.signature',
  },
];

function ClaimRow({ k, v }: { k: string; v: unknown }) {
  const isSensitive = SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s));
  const [show, setShow] = useState(!isSensitive);

  let display: string;
  if (typeof v === 'object') {
    display = JSON.stringify(v, null, 2);
  } else {
    display = String(v);
  }

  return (
    <div class="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4">
      <span class="text-sm font-mono text-primary shrink-0">{k}</span>
      <span class="text-sm font-mono text-text text-right break-all">
        {isSensitive && !show ? (
          <button
            onClick={() => setShow(true)}
            class="text-xs text-text-muted underline hover:text-text"
          >
            [reveal]
          </button>
        ) : (
          display
        )}
      </span>
    </div>
  );
}

export default function OAuthTokenInspector() {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const result = useCallback(() => {
    const token = input.trim();
    if (!token) return null;

    const parts = token.split('.');
    if (parts.length < 2) {
      setError('Not a valid JWT — must have at least 2 dot-separated parts.');
      return null;
    }

    try {
      const header: TokenPayload = JSON.parse(base64UrlDecode(parts[0]));
      const payload: TokenPayload = JSON.parse(base64UrlDecode(parts[1]));
      const hasSignature = parts.length === 3 && parts[2].length > 0;
      setError('');
      return { header, payload, hasSignature };
    } catch (e) {
      setError('Failed to decode token. Make sure it is a valid JWT/OIDC token.');
      return null;
    }
  }, [input])();

  const payload = result?.payload ?? {};
  const exp = typeof payload.exp === 'number' ? payload.exp : null;
  const iat = typeof payload.iat === 'number' ? payload.iat : null;
  const nbf = typeof payload.nbf === 'number' ? payload.nbf : null;

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Paste OAuth / OIDC / JWT token
        </label>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
          rows={4}
          class={`w-full bg-bg-card border rounded-lg px-4 py-3 text-sm font-mono text-text focus:outline-none transition-colors resize-none ${
            error ? 'border-red-500 focus:border-red-500' : 'border-border focus:border-primary'
          }`}
          spellcheck={false}
        />
        {error && <p class="mt-1.5 text-sm text-red-400">{error}</p>}
      </div>

      {/* Example */}
      <div class="flex gap-2 flex-wrap">
        {EXAMPLE_TOKENS.map((ex) => (
          <button
            key={ex.label}
            onClick={() => setInput(ex.value)}
            class="px-3 py-1 text-xs rounded-lg bg-bg-card border border-border hover:border-primary hover:text-primary text-text-muted transition-colors"
          >
            {ex.label}
          </button>
        ))}
        {input && (
          <button
            onClick={() => { setInput(''); setError(''); }}
            class="px-3 py-1 text-xs rounded-lg bg-bg-card border border-border hover:border-red-500 hover:text-red-400 text-text-muted transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {result && (
        <div class="space-y-4">
          {/* Status banner */}
          {exp !== null && (
            <div
              class={`flex items-center gap-3 px-4 py-3 rounded-xl border ${
                isExpired(exp)
                  ? 'bg-red-500/10 border-red-500/30 text-red-400'
                  : 'bg-green-500/10 border-green-500/30 text-green-400'
              }`}
            >
              <span class="text-lg">{isExpired(exp) ? '⚠️' : '✅'}</span>
              <div>
                <p class="text-sm font-semibold">
                  {isExpired(exp) ? 'Token Expired' : `Valid — expires in ${expiresIn(exp)}`}
                </p>
                <p class="text-xs opacity-75">Expiry: {formatDate(exp)}</p>
              </div>
            </div>
          )}

          {/* Quick info */}
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Algorithm', value: String(result.header.alg ?? 'unknown') },
              { label: 'Type', value: String(result.header.typ ?? 'JWT') },
              { label: 'Signature', value: result.hasSignature ? 'Present' : 'None' },
              { label: 'Issued At', value: iat ? formatDate(iat) : '—' },
            ].map(({ label, value }) => (
              <div key={label} class="bg-bg-card border border-border rounded-xl p-3">
                <p class="text-xs text-text-muted mb-1">{label}</p>
                <p class="text-sm font-mono font-medium text-text truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* Header claims */}
          <details open class="border border-border rounded-xl overflow-hidden">
            <summary class="px-4 py-3 bg-bg-card cursor-pointer select-none text-sm font-semibold text-text flex items-center justify-between">
              <span>Header</span>
              <span class="text-xs text-text-muted font-normal">{Object.keys(result.header).length} claims</span>
            </summary>
            <div class="px-4 bg-bg-card">
              {Object.entries(result.header).map(([k, v]) => (
                <ClaimRow key={k} k={k} v={v} />
              ))}
            </div>
          </details>

          {/* Payload claims */}
          <details open class="border border-border rounded-xl overflow-hidden">
            <summary class="px-4 py-3 bg-bg-card cursor-pointer select-none text-sm font-semibold text-text flex items-center justify-between">
              <span>Payload Claims</span>
              <span class="text-xs text-text-muted font-normal">{Object.keys(payload).length} claims</span>
            </summary>
            <div class="px-4 bg-bg-card">
              {Object.entries(payload).map(([k, v]) => {
                // Format timestamps nicely
                if ((k === 'exp' || k === 'iat' || k === 'nbf') && typeof v === 'number') {
                  return (
                    <div key={k} class="flex items-start justify-between py-2.5 border-b border-border last:border-0 gap-4">
                      <span class="text-sm font-mono text-primary shrink-0">{k}</span>
                      <span class="text-sm font-mono text-text text-right">
                        {formatDate(v)}
                        <span class="text-xs text-text-muted ml-2">({v})</span>
                      </span>
                    </div>
                  );
                }
                return <ClaimRow key={k} k={k} v={v} />;
              })}
            </div>
          </details>

          {/* Scopes */}
          {typeof payload.scope === 'string' && payload.scope.length > 0 && (
            <div class="border border-border rounded-xl p-4 bg-bg-card">
              <p class="text-sm font-semibold text-text mb-2">Scopes</p>
              <div class="flex flex-wrap gap-2">
                {(payload.scope as string).split(' ').map((s) => (
                  <span key={s} class="px-2.5 py-1 text-xs font-mono bg-primary/10 text-primary border border-primary/20 rounded-lg">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
