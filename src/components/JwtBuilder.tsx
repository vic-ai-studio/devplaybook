import { useState } from 'preact/hooks';

function b64url(str: string): string {
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildJwt(headerStr: string, payloadStr: string, secret: string): Promise<{ ok: boolean; token?: string; error?: string }> {
  try {
    const header = JSON.parse(headerStr);
    const payload = JSON.parse(payloadStr);
    const headerB64 = b64url(JSON.stringify(header));
    const payloadB64 = b64url(JSON.stringify(payload));
    const data = `${headerB64}.${payloadB64}`;
    const key = await crypto.subtle.importKey(
      'raw', new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
    );
    const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
    const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    return { ok: true, token: `${data}.${sigB64}` };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

const DEFAULT_HEADER = JSON.stringify({ alg: 'HS256', typ: 'JWT' }, null, 2);
const DEFAULT_PAYLOAD = JSON.stringify({
  sub: '1234567890',
  name: 'John Doe',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 3600,
}, null, 2);

export default function JwtBuilder() {
  const [header, setHeader] = useState(DEFAULT_HEADER);
  const [payload, setPayload] = useState(DEFAULT_PAYLOAD);
  const [secret, setSecret] = useState('your-secret-key');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true); setError(''); setToken('');
    const result = await buildJwt(header, payload, secret);
    setLoading(false);
    if (result.ok) setToken(result.token!);
    else setError(result.error!);
  };

  const copy = () => {
    navigator.clipboard.writeText(token).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
  };

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Header (JSON)</label>
          <textarea
            class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            value={header}
            onInput={e => setHeader((e.target as HTMLTextAreaElement).value)}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Payload (JSON)</label>
          <textarea
            class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            value={payload}
            onInput={e => setPayload((e.target as HTMLTextAreaElement).value)}
          />
        </div>
      </div>

      <div class="flex gap-3 items-end flex-wrap">
        <div class="flex-1 min-w-48">
          <label class="block text-sm font-medium text-text-muted mb-2">Secret Key (HS256)</label>
          <input
            type="text"
            value={secret}
            onInput={e => setSecret((e.target as HTMLInputElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder="your-secret-key"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading}
          class="px-6 py-2 rounded-lg font-medium text-sm bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate JWT'}
        </button>
      </div>

      {error && <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-sm text-red-400 font-mono">{error}</div>}

      {token && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">Generated JWT Token</label>
            <button onClick={copy} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <div class="bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text break-all leading-relaxed">
            <span class="text-red-400">{token.split('.')[0]}</span>
            <span class="text-text-muted">.</span>
            <span class="text-purple-400">{token.split('.')[1]}</span>
            <span class="text-text-muted">.</span>
            <span class="text-blue-400">{token.split('.')[2]}</span>
          </div>
          <p class="text-xs text-text-muted mt-2">
            <span class="text-red-400">■</span> Header &nbsp;
            <span class="text-purple-400">■</span> Payload &nbsp;
            <span class="text-blue-400">■</span> Signature
            &nbsp;·&nbsp;
            <a href="/tools/jwt-decoder" class="text-primary hover:underline">Decode a JWT →</a>
          </p>
        </div>
      )}

      <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
        ⚠️ This tool generates HS256 JWTs for testing and learning. Never expose your real secret key in a browser tool for production use.
      </div>
    </div>
  );
}
