import { useState } from 'preact/hooks';

function base64UrlDecode(str: string): string {
  let s = str.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  try {
    return decodeURIComponent(
      atob(s).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
  } catch {
    return atob(s);
  }
}

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

function parseJwt(token: string): { parts: JwtParts | null; error: string | null } {
  const trimmed = token.trim();
  const segments = trimmed.split('.');
  if (segments.length !== 3) return { parts: null, error: `Expected 3 segments separated by dots, got ${segments.length}` };

  try {
    const header = JSON.parse(base64UrlDecode(segments[0]));
    const payload = JSON.parse(base64UrlDecode(segments[1]));
    return {
      parts: {
        header,
        payload,
        signature: segments[2],
        raw: { header: segments[0], payload: segments[1], signature: segments[2] },
      },
      error: null,
    };
  } catch (e: unknown) {
    return { parts: null, error: `Failed to parse JWT: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function formatTimestamp(ts: unknown): string {
  if (typeof ts !== 'number') return String(ts);
  const d = new Date(ts * 1000);
  return `${d.toLocaleString()} (Unix: ${ts})`;
}

function getExpiryStatus(payload: Record<string, unknown>): { label: string; color: string } | null {
  if (!('exp' in payload)) return null;
  const exp = payload['exp'] as number;
  const now = Math.floor(Date.now() / 1000);
  if (exp < now) {
    const diff = now - exp;
    const mins = Math.floor(diff / 60);
    const label = mins < 60 ? `Expired ${mins}m ago` : `Expired ${Math.floor(mins/60)}h ${mins%60}m ago`;
    return { label, color: 'text-red-500 bg-red-500/10 border-red-500/20' };
  }
  const diff = exp - now;
  const mins = Math.floor(diff / 60);
  const label = mins < 60 ? `Expires in ${mins}m` : mins < 1440 ? `Expires in ${Math.floor(mins/60)}h ${mins%60}m` : `Expires in ${Math.floor(mins/1440)}d`;
  return { label, color: 'text-green-500 bg-green-500/10 border-green-500/20' };
}

const CLAIM_DOCS: Record<string, string> = {
  iss: 'Issuer — who issued this token',
  sub: 'Subject — who this token represents',
  aud: 'Audience — intended recipient(s)',
  exp: 'Expiration — when this token expires (Unix timestamp)',
  nbf: 'Not Before — token not valid before this time',
  iat: 'Issued At — when the token was created (Unix timestamp)',
  jti: 'JWT ID — unique identifier for this token',
  alg: 'Algorithm — signing algorithm (e.g. HS256, RS256)',
  typ: 'Type — typically "JWT"',
  kid: 'Key ID — which key was used to sign this token',
};

function JsonTable({ data, timestamps }: { data: Record<string, unknown>; timestamps?: Set<string> }) {
  return (
    <table class="w-full text-sm">
      <tbody class="divide-y divide-border">
        {Object.entries(data).map(([k, v]) => {
          const doc = CLAIM_DOCS[k];
          const isTs = timestamps?.has(k);
          return (
            <tr key={k} class="group">
              <td class="py-2 pr-4 font-mono text-accent w-1/4 align-top">
                {k}
                {doc && <span class="block text-xs text-text-muted font-sans">{doc}</span>}
              </td>
              <td class="py-2 font-mono text-text break-all">
                {isTs ? formatTimestamp(v) : JSON.stringify(v)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

export default function JwtDebugger() {
  const [token, setToken] = useState('');
  const [result, setResult] = useState<{ parts: JwtParts | null; error: string | null } | null>(null);
  const [copiedSig, setCopiedSig] = useState(false);

  const debug = () => {
    if (!token.trim()) return;
    setResult(parseJwt(token));
  };

  const handleKey = (e: KeyboardEvent) => { if (e.key === 'Enter' && e.ctrlKey) debug(); };

  const copySig = () => {
    if (!result?.parts) return;
    navigator.clipboard.writeText(result.parts.signature).then(() => {
      setCopiedSig(true);
      setTimeout(() => setCopiedSig(false), 2000);
    });
  };

  const expiryStatus = result?.parts ? getExpiryStatus(result.parts.payload) : null;
  const tsFields = new Set(['exp', 'nbf', 'iat']);

  const EXAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <div class="flex justify-between items-center mb-1">
          <label class="text-xs text-text-muted">Paste JWT Token</label>
          <button onClick={() => { setToken(EXAMPLE); setResult(parseJwt(EXAMPLE)); }}
            class="text-xs text-accent hover:underline">Load example</button>
        </div>
        <textarea
          value={token}
          onInput={e => setToken((e.target as HTMLTextAreaElement).value)}
          onKeyDown={handleKey}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiZXhwIjoxNjAwMDAwMDAwfQ..."
          rows={4}
          class="w-full px-4 py-3 rounded-xl bg-surface border border-border text-text font-mono text-xs placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent resize-none"
        />
        <div class="flex justify-between mt-2">
          <p class="text-xs text-text-muted">Tip: Ctrl+Enter to decode</p>
          <button onClick={debug}
            class="px-6 py-2 rounded-xl bg-accent text-white font-semibold hover:bg-accent/90 transition-colors text-sm">
            Decode
          </button>
        </div>
      </div>

      {/* Error */}
      {result?.error && (
        <div class="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
          ✗ {result.error}
        </div>
      )}

      {/* Results */}
      {result?.parts && (
        <div class="space-y-4">
          {/* Status bar */}
          <div class="flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 border border-green-500/20 text-green-500">
              ✓ Valid JWT structure
            </span>
            {expiryStatus && (
              <span class={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold border ${expiryStatus.color}`}>
                {expiryStatus.label}
              </span>
            )}
            <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface border border-border text-text-muted">
              alg: {String(result.parts.header['alg'] || 'unknown')}
            </span>
          </div>

          {/* Visual token */}
          <div class="rounded-xl bg-surface border border-border p-4">
            <p class="text-xs text-text-muted mb-2">Token Structure</p>
            <p class="font-mono text-xs break-all leading-relaxed">
              <span class="text-pink-400">{result.parts.raw.header}</span>
              <span class="text-text-muted">.</span>
              <span class="text-yellow-400">{result.parts.raw.payload}</span>
              <span class="text-text-muted">.</span>
              <span class="text-blue-400">{result.parts.raw.signature}</span>
            </p>
            <div class="flex gap-4 mt-2 text-xs">
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-pink-400 inline-block"></span>Header</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-yellow-400 inline-block"></span>Payload</span>
              <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Signature</span>
            </div>
          </div>

          {/* Header */}
          <div class="rounded-xl bg-surface border border-border p-4">
            <p class="text-xs font-semibold text-pink-400 mb-3">HEADER</p>
            <JsonTable data={result.parts.header} />
          </div>

          {/* Payload */}
          <div class="rounded-xl bg-surface border border-border p-4">
            <p class="text-xs font-semibold text-yellow-400 mb-3">PAYLOAD</p>
            <JsonTable data={result.parts.payload} timestamps={tsFields} />
          </div>

          {/* Signature */}
          <div class="rounded-xl bg-surface border border-border p-4">
            <div class="flex justify-between items-center mb-2">
              <p class="text-xs font-semibold text-blue-400">SIGNATURE</p>
              <button onClick={copySig} class="text-xs text-accent hover:underline">
                {copiedSig ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <p class="font-mono text-xs text-text break-all">{result.parts.signature}</p>
            <p class="text-xs text-text-muted mt-2">⚠ Signature cannot be verified client-side — requires your secret key or public key.</p>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!result && (
        <div class="rounded-xl bg-surface border border-border border-dashed p-8 text-center text-text-muted text-sm">
          Paste a JWT token above to decode and inspect its header, payload, and claims.
        </div>
      )}
    </div>
  );
}
