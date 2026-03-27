import { useState } from 'preact/hooks';

function base64urlEncode(str: string): string {
  return btoa(unescape(encodeURIComponent(str)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function getNow(): number {
  return Math.floor(Date.now() / 1000);
}

interface ClaimRow {
  id: string;
  key: string;
  value: string;
  type: 'string' | 'number' | 'boolean';
}

function parseClaimValue(val: string, type: 'string' | 'number' | 'boolean'): unknown {
  if (type === 'number') {
    const n = Number(val);
    return isNaN(n) ? 0 : n;
  }
  if (type === 'boolean') return val === 'true';
  return val;
}

function buildHeader(alg: string) {
  return { alg, typ: 'JWT' };
}

function buildPayload(claims: ClaimRow[], sub: string, iss: string, aud: string, includeExp: boolean, expOffset: number): Record<string, unknown> {
  const now = getNow();
  const payload: Record<string, unknown> = {};
  if (iss) payload.iss = iss;
  if (sub) payload.sub = sub;
  if (aud) payload.aud = aud;
  payload.iat = now;
  if (includeExp) payload.exp = now + expOffset;
  payload.jti = randomHex(8);
  for (const c of claims) {
    if (c.key.trim()) {
      payload[c.key.trim()] = parseClaimValue(c.value, c.type);
    }
  }
  return payload;
}

function assembleMockJwt(header: object, payload: object): string {
  const h = base64urlEncode(JSON.stringify(header));
  const p = base64urlEncode(JSON.stringify(payload));
  // Mock signature — not cryptographically valid, for demo only
  const sig = base64urlEncode(randomHex(32));
  return `${h}.${p}.${sig}`;
}

function decodeJwtParts(token: string): { header: string; payload: string; sig: string } | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const h = JSON.parse(decodeURIComponent(escape(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')))));
    const p = JSON.parse(decodeURIComponent(escape(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))));
    return {
      header: JSON.stringify(h, null, 2),
      payload: JSON.stringify(p, null, 2),
      sig: parts[2],
    };
  } catch {
    return null;
  }
}

const ALG_OPTIONS = ['RS256', 'RS384', 'RS512', 'ES256', 'ES384', 'PS256'];
const EXP_OPTIONS = [
  { label: '15 minutes', value: 900 },
  { label: '1 hour', value: 3600 },
  { label: '24 hours', value: 86400 },
  { label: '7 days', value: 604800 },
  { label: '30 days', value: 2592000 },
];

export default function JwtRs256Generator() {
  const [alg, setAlg] = useState('RS256');
  const [sub, setSub] = useState('user_123');
  const [iss, setIss] = useState('https://auth.example.com');
  const [aud, setAud] = useState('https://api.example.com');
  const [includeExp, setIncludeExp] = useState(true);
  const [expOffset, setExpOffset] = useState(3600);
  const [claims, setClaims] = useState<ClaimRow[]>([
    { id: makeId(), key: 'role', value: 'admin', type: 'string' },
    { id: makeId(), key: 'email', value: 'user@example.com', type: 'string' },
  ]);
  const [pemKey, setPemKey] = useState('');
  const [mockToken, setMockToken] = useState('');
  const [activeTab, setActiveTab] = useState<'builder' | 'decoded' | 'pem'>('builder');
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedDecoded, setCopiedDecoded] = useState(false);

  function addClaim() {
    setClaims(prev => [...prev, { id: makeId(), key: '', value: '', type: 'string' }]);
  }

  function removeClaim(id: string) {
    setClaims(prev => prev.filter(c => c.id !== id));
  }

  function updateClaim(id: string, field: keyof ClaimRow, value: string) {
    setClaims(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
  }

  function generateMockToken() {
    const header = buildHeader(alg);
    const payload = buildPayload(claims, sub, iss, aud, includeExp, expOffset);
    const token = assembleMockJwt(header, payload);
    setMockToken(token);
    setActiveTab('decoded');
  }

  const displayToken = mockToken || (() => {
    const header = buildHeader(alg);
    const payload = buildPayload(claims, sub, iss, aud, includeExp, expOffset);
    return assembleMockJwt(header, payload);
  })();

  const decoded = decodeJwtParts(displayToken);
  const decodedText = decoded
    ? `// Header\n${decoded.header}\n\n// Payload\n${decoded.payload}\n\n// Signature (mock — not cryptographically valid)\n"${decoded.sig}"`
    : 'Invalid token';

  function copyToken() {
    navigator.clipboard.writeText(displayToken).then(() => {
      setCopiedToken(true);
      setTimeout(() => setCopiedToken(false), 2000);
    });
  }

  function copyDecoded() {
    navigator.clipboard.writeText(decodedText).then(() => {
      setCopiedDecoded(true);
      setTimeout(() => setCopiedDecoded(false), 2000);
    });
  }

  const parts = displayToken.split('.');

  return (
    <div class="space-y-4">
      <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg px-4 py-3 text-sm text-amber-600 dark:text-amber-400">
        <strong>Note:</strong> Real RS256/ES256 signing requires a private key on the server side or a crypto library. This tool assembles the JWT structure with a <strong>mock signature</strong> for educational purposes. The header and payload are genuine Base64url-encoded JSON.
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Builder */}
        <div class="space-y-3">
          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div class="text-sm font-semibold">Header</div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Algorithm</label>
              <select
                class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                value={alg}
                onChange={(e) => setAlg((e.target as HTMLSelectElement).value)}
              >
                {ALG_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>

          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div class="text-sm font-semibold">Standard Claims</div>

            <div class="grid grid-cols-2 gap-2">
              <div>
                <label class="block text-xs text-text-muted mb-1">Issuer (iss)</label>
                <input
                  type="text"
                  class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={iss}
                  onInput={(e) => setIss((e.target as HTMLInputElement).value)}
                  placeholder="https://auth.example.com"
                />
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Subject (sub)</label>
                <input
                  type="text"
                  class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={sub}
                  onInput={(e) => setSub((e.target as HTMLInputElement).value)}
                  placeholder="user_123"
                />
              </div>
            </div>

            <div>
              <label class="block text-xs text-text-muted mb-1">Audience (aud)</label>
              <input
                type="text"
                class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                value={aud}
                onInput={(e) => setAud((e.target as HTMLInputElement).value)}
                placeholder="https://api.example.com"
              />
            </div>

            <div class="flex items-center gap-3 flex-wrap">
              <label class="flex items-center gap-1.5 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeExp}
                  onChange={(e) => setIncludeExp((e.target as HTMLInputElement).checked)}
                  class="rounded"
                />
                Include exp
              </label>
              {includeExp && (
                <select
                  class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={expOffset}
                  onChange={(e) => setExpOffset(Number((e.target as HTMLSelectElement).value))}
                >
                  {EXP_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              )}
            </div>
          </div>

          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-semibold">Custom Claims</div>
              <button
                onClick={addClaim}
                class="bg-accent hover:bg-accent/90 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-colors"
              >
                + Add Claim
              </button>
            </div>

            <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
              {claims.map(c => (
                <div key={c.id} class="grid grid-cols-[1fr_1fr_auto_auto] gap-1.5 items-center">
                  <input
                    type="text"
                    class="font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={c.key}
                    onInput={(e) => updateClaim(c.id, 'key', (e.target as HTMLInputElement).value)}
                    placeholder="claim_key"
                  />
                  <input
                    type="text"
                    class="font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={c.value}
                    onInput={(e) => updateClaim(c.id, 'value', (e.target as HTMLInputElement).value)}
                    placeholder="value"
                  />
                  <select
                    class="font-mono text-xs bg-surface-alt border border-border rounded px-1.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={c.type}
                    onChange={(e) => updateClaim(c.id, 'type', (e.target as HTMLSelectElement).value)}
                  >
                    <option value="string">str</option>
                    <option value="number">num</option>
                    <option value="boolean">bool</option>
                  </select>
                  <button
                    onClick={() => removeClaim(c.id)}
                    class="text-text-muted hover:text-red-400 text-xs transition-colors px-1"
                  >
                    ✕
                  </button>
                </div>
              ))}
              {claims.length === 0 && (
                <p class="text-xs text-text-muted">No custom claims. Click + Add Claim.</p>
              )}
            </div>
          </div>

          <button
            onClick={generateMockToken}
            class="w-full bg-accent hover:bg-accent/90 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Generate Mock Token
          </button>
        </div>

        {/* Right: Output */}
        <div class="space-y-2">
          <div class="flex items-center gap-2 flex-wrap">
            {(['builder', 'decoded', 'pem'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                class={`px-3 py-1.5 text-sm font-mono rounded-lg border transition-colors capitalize ${
                  activeTab === tab
                    ? 'bg-accent/20 border-accent/50 text-accent'
                    : 'border-border text-text-muted hover:bg-surface'
                }`}
              >
                {tab === 'builder' ? 'Token' : tab === 'decoded' ? 'Decoded' : 'PEM Key'}
              </button>
            ))}
          </div>

          {activeTab === 'builder' && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-muted">3-part JWT structure</span>
                <button
                  onClick={copyToken}
                  class="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  {copiedToken ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <div class="font-mono text-xs bg-surface border border-border rounded-lg p-4 break-all leading-relaxed">
                <span class="text-red-400">{parts[0]}</span>
                <span class="text-text-muted">.</span>
                <span class="text-blue-400">{parts[1]}</span>
                <span class="text-text-muted">.</span>
                <span class="text-green-400">{parts[2]}</span>
              </div>
              <div class="flex gap-4 text-xs text-text-muted">
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-400 inline-block"></span>Header</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-400 inline-block"></span>Payload</span>
                <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-green-400 inline-block"></span>Signature (mock)</span>
              </div>
            </div>
          )}

          {activeTab === 'decoded' && (
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-xs text-text-muted">Decoded header + payload</span>
                <button
                  onClick={copyDecoded}
                  class="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
                >
                  {copiedDecoded ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="w-full h-[420px] overflow-auto font-mono text-xs bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{decodedText}
              </pre>
            </div>
          )}

          {activeTab === 'pem' && (
            <div class="space-y-3">
              <p class="text-xs text-text-muted">
                Paste your RSA/EC public or private key in PEM format below. This tool does not transmit it — it stays in your browser. Real RS256 signing must happen server-side.
              </p>
              <textarea
                class="w-full h-64 font-mono text-xs bg-surface-alt border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent resize-none"
                placeholder={"-----BEGIN RSA PRIVATE KEY-----\nMIIEowIBAAKCAQEA...\n-----END RSA PRIVATE KEY-----"}
                value={pemKey}
                onInput={(e) => setPemKey((e.target as HTMLTextAreaElement).value)}
              />
              <div class="bg-surface border border-border rounded-lg p-3 space-y-1.5 text-xs">
                <div class="font-semibold text-sm mb-2">Key Format Reference</div>
                <div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-text-muted">
                  <span>RSA private key:</span><span>BEGIN RSA PRIVATE KEY</span>
                  <span>RSA public key:</span><span>BEGIN PUBLIC KEY</span>
                  <span>EC private key:</span><span>BEGIN EC PRIVATE KEY</span>
                  <span>PKCS#8 private:</span><span>BEGIN PRIVATE KEY</span>
                </div>
              </div>
              <p class="text-xs text-text-muted">
                To generate a key pair on your machine: <code class="font-mono bg-surface-alt px-1 rounded">openssl genrsa -out private.pem 2048</code> then <code class="font-mono bg-surface-alt px-1 rounded">openssl rsa -in private.pem -pubout -out public.pem</code>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
