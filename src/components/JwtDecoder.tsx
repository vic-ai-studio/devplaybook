import { useState, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

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

interface ParsedToken {
  raw: string;
  index: number;
  result: ReturnType<typeof parseJwt>;
  error: string | null;
}

const SAMPLE = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE5OTk5OTk5OTl9.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

export default function JwtDecoder() {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [pro, setPro] = useState(false);
  // Batch mode (Pro)
  const [batchMode, setBatchMode] = useState(false);
  const [batchInput, setBatchInput] = useState('');
  const [batchExpanded, setBatchExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    setPro(isProUser());
  }, []);

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

  // Batch parsing
  const batchTokens: ParsedToken[] = batchInput
    .split('\n')
    .map((line, i) => ({ raw: line.trim(), index: i }))
    .filter(t => t.raw.length > 0)
    .map(t => {
      const result = parseJwt(t.raw);
      return {
        raw: t.raw,
        index: t.index,
        result,
        error: t.raw && !result ? 'Invalid JWT' : null,
      };
    });

  const toggleBatchExpanded = (i: number) => {
    setBatchExpanded(prev => ({ ...prev, [i]: !prev[i] }));
  };

  const exportBatchJson = () => {
    const data = batchTokens.map(t => ({
      index: t.index + 1,
      valid: !!t.result,
      header: t.result?.header ?? null,
      payload: t.result?.payload ?? null,
      error: t.error,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'jwt-batch-decode.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <div class="flex items-center justify-between mb-1">
          <label class="text-sm font-medium text-gray-300">Paste JWT Token</label>
          <div class="flex gap-2">
            {pro && (
              <button onClick={() => setBatchMode(b => !b)}
                class={`text-xs px-3 py-1.5 rounded-md transition-colors font-medium ${batchMode ? 'bg-indigo-600 text-white' : 'bg-gray-700 hover:bg-gray-600 text-white'}`}>
                {batchMode ? '✓ Batch Mode' : 'Batch Mode'}
              </button>
            )}
            {!pro && (
              <a href="/pro"
                class="text-xs bg-primary/10 text-primary border border-primary/30 px-3 py-1.5 rounded-md hover:underline font-medium">
                Batch Mode (Pro) →
              </a>
            )}
            <button onClick={loadSample}
              class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors">
              Load Sample
            </button>
          </div>
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

      {/* Batch Decode — Pro only */}
      {pro && batchMode && (
        <div class="bg-gray-900 rounded-xl border border-indigo-700/50 p-5 space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm font-semibold text-gray-200">Batch JWT Decoder</h3>
              <p class="text-xs text-gray-500 mt-0.5">Paste multiple JWTs, one per line</p>
            </div>
            {batchTokens.length > 0 && (
              <button onClick={exportBatchJson}
                class="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
                Export JSON
              </button>
            )}
          </div>

          <textarea
            value={batchInput}
            onInput={e => setBatchInput((e.target as HTMLTextAreaElement).value)}
            rows={5}
            placeholder={'eyJhbGci...\neyJhbGci...\neyJhbGci...'}
            class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500 resize-y placeholder-gray-600"
          />

          {batchTokens.length > 0 && (
            <div class="space-y-3">
              <p class="text-xs text-gray-500">{batchTokens.length} token{batchTokens.length !== 1 ? 's' : ''} — {batchTokens.filter(t => t.result).length} valid</p>
              {batchTokens.map((t, i) => (
                <div key={i} class={`rounded-lg border p-3 ${t.result ? 'border-gray-700 bg-gray-800/50' : 'border-red-800 bg-red-950/20'}`}>
                  <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-medium text-gray-400">#{i + 1}</span>
                    {t.result ? (
                      <button onClick={() => toggleBatchExpanded(i)}
                        class="text-xs text-indigo-400 hover:underline">
                        {batchExpanded[i] ? 'Collapse' : 'Expand'}
                      </button>
                    ) : (
                      <span class="text-xs text-red-400">Invalid JWT</span>
                    )}
                  </div>
                  <code class="block text-gray-500 font-mono text-xs truncate">{t.raw.slice(0, 60)}{t.raw.length > 60 ? '…' : ''}</code>
                  {t.result && batchExpanded[i] && (
                    <div class="mt-3 space-y-2">
                      {t.result.payload && (() => {
                        const p = t.result!.payload as Record<string, unknown>;
                        const exp = getExpStatus(p);
                        return exp ? (
                          <p class={`text-xs font-medium ${exp.color}`}>{exp.label}</p>
                        ) : null;
                      })()}
                      <details class="text-xs">
                        <summary class="text-indigo-400 cursor-pointer">Header</summary>
                        <pre class="text-green-300 bg-gray-950 rounded p-2 mt-1 overflow-x-auto text-xs">{JSON.stringify(t.result.header, null, 2)}</pre>
                      </details>
                      <details class="text-xs">
                        <summary class="text-yellow-400 cursor-pointer">Payload</summary>
                        <pre class="text-green-300 bg-gray-950 rounded p-2 mt-1 overflow-x-auto text-xs">{JSON.stringify(t.result.payload, null, 2)}</pre>
                      </details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1">
        <p class="font-medium text-gray-300">About JWT</p>
        <p>A JWT (JSON Web Token) consists of three base64url-encoded parts: <strong class="text-indigo-300">Header</strong> (algorithm &amp; type), <strong class="text-yellow-300">Payload</strong> (claims), and <strong class="text-rose-300">Signature</strong> (integrity).</p>
        <p class="text-xs text-gray-500">This tool decodes locally in your browser. No data is sent to any server.</p>
      </div>

      {pro && <p class="text-xs text-primary text-right">✓ Pro — batch decode &amp; JSON export enabled</p>}
    </div>
  );
}
