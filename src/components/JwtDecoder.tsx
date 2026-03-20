import { useState } from 'preact/hooks';

function base64UrlDecode(str: string): string {
  // Pad base64url to standard base64
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0'))
        .join('')
    );
  } catch {
    return atob(base64);
  }
}

function parseJwt(token: string): { header: object; payload: object; signature: string } | null {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return { header, payload, signature: parts[2] };
  } catch {
    return null;
  }
}

function formatTs(ts: number): string {
  try {
    return new Date(ts * 1000).toISOString().replace('T', ' ').replace('.000Z', ' UTC');
  } catch {
    return String(ts);
  }
}

function getExpStatus(payload: Record<string, unknown>): { label: string; color: string } | null {
  if (typeof payload.exp !== 'number') return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp < now) {
    const ago = now - payload.exp;
    const h = Math.floor(ago / 3600);
    const m = Math.floor((ago % 3600) / 60);
    return { label: `Expired ${h}h ${m}m ago`, color: 'text-red-400' };
  }
  const left = payload.exp - now;
  const d = Math.floor(left / 86400);
  const h = Math.floor((left % 86400) / 3600);
  return { label: `Valid — expires in ${d}d ${h}h`, color: 'text-green-400' };
}

function JsonView({ data }: { data: object }) {
  const str = JSON.stringify(data, null, 2);
  return (
    <pre class="text-sm font-mono text-green-300 bg-gray-950 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap break-all">
      {str}
    </pre>
  );
}

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const parsed = token.trim() ? parseJwt(token.trim()) : null;
  const error = token.trim() && !parsed ? 'Invalid JWT — must have 3 base64url parts separated by dots.' : null;

  const payload = parsed?.payload as Record<string, unknown> | undefined;
  const expStatus = payload ? getExpStatus(payload) : null;

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const loadSample = () => setToken(SAMPLE);

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-gray-300">Paste JWT Token</label>
          <button onClick={loadSample}
            class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors">
            Load Sample
          </button>
        </div>
        <textarea
          value={token}
          onInput={e => setToken((e.target as HTMLTextAreaElement).value)}
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0..."
          rows={4}
          class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-none placeholder-gray-600"
        />
        {error && <p class="text-red-400 text-sm">{error}</p>}
      </div>

      {parsed && (
        <>
          {/* Expiry status */}
          {expStatus && (
            <div class={`rounded-lg border px-4 py-2 text-sm font-medium ${expStatus.color} ${expStatus.color === 'text-green-400' ? 'border-green-800 bg-green-950/30' : 'border-red-800 bg-red-950/30'}`}>
              {expStatus.label}
              {payload?.exp && <span class="ml-2 font-mono text-xs opacity-70">({formatTs(payload.exp as number)})</span>}
            </div>
          )}

          {/* Header */}
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-indigo-400 uppercase tracking-wide">Header</span>
              <button onClick={() => copy(JSON.stringify(parsed.header, null, 2), 'header')}
                class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
                {copied === 'header' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <JsonView data={parsed.header} />
          </div>

          {/* Payload */}
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-yellow-400 uppercase tracking-wide">Payload</span>
              <button onClick={() => copy(JSON.stringify(parsed.payload, null, 2), 'payload')}
                class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
                {copied === 'payload' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <JsonView data={parsed.payload} />
            {/* Claim explanations */}
            {payload && (
              <div class="mt-3 space-y-1 text-xs text-gray-500">
                {typeof payload.iat === 'number' && <p><span class="text-gray-400 font-medium">iat</span> (issued at): {formatTs(payload.iat as number)}</p>}
                {typeof payload.exp === 'number' && <p><span class="text-gray-400 font-medium">exp</span> (expires): {formatTs(payload.exp as number)}</p>}
                {typeof payload.nbf === 'number' && <p><span class="text-gray-400 font-medium">nbf</span> (not before): {formatTs(payload.nbf as number)}</p>}
                {typeof payload.sub === 'string' && <p><span class="text-gray-400 font-medium">sub</span> (subject): {payload.sub as string}</p>}
                {typeof payload.iss === 'string' && <p><span class="text-gray-400 font-medium">iss</span> (issuer): {payload.iss as string}</p>}
                {typeof payload.aud !== 'undefined' && <p><span class="text-gray-400 font-medium">aud</span> (audience): {JSON.stringify(payload.aud)}</p>}
              </div>
            )}
          </div>

          {/* Signature */}
          <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold text-rose-400 uppercase tracking-wide">Signature</span>
              <button onClick={() => copy(parsed.signature, 'sig')}
                class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors">
                {copied === 'sig' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <code class="block text-rose-300 font-mono text-sm break-all bg-gray-950 rounded-lg p-4">{parsed.signature}</code>
            <p class="text-xs text-gray-500 mt-2">Signature verification requires the secret key and cannot be done client-side safely. Use your server or a trusted library (e.g. <code class="text-gray-400">jsonwebtoken</code> in Node.js).</p>
          </div>
        </>
      )}

      {/* Info box */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1">
        <p class="font-medium text-gray-300">About JWT</p>
        <p>A JWT (JSON Web Token) consists of three base64url-encoded parts: <strong class="text-indigo-300">Header</strong> (algorithm &amp; type), <strong class="text-yellow-300">Payload</strong> (claims), and <strong class="text-rose-300">Signature</strong> (integrity).</p>
        <p class="text-xs text-gray-500">This tool decodes locally in your browser. No data is sent to any server.</p>
      </div>
    </div>
  );
}
