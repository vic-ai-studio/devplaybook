import { useState } from 'preact/hooks';

// ── helpers ──────────────────────────────────────────────────────────────────

function b64UrlDecode(str: string): string {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  try {
    return decodeURIComponent(
      atob(b64).split('').map(c => '%' + c.charCodeAt(0).toString(16).padStart(2, '0')).join('')
    );
  } catch {
    return atob(b64);
  }
}

function parseJwt(token: string) {
  const parts = token.trim().split('.');
  if (parts.length !== 3) return null;
  try {
    const header = JSON.parse(b64UrlDecode(parts[0])) as Record<string, unknown>;
    const payload = JSON.parse(b64UrlDecode(parts[1])) as Record<string, unknown>;
    return { header, payload, signature: parts[2], raw: parts };
  } catch {
    return null;
  }
}

function formatTs(ts: number): string {
  try { return new Date(ts * 1000).toUTCString(); } catch { return String(ts); }
}

function relativeTime(ts: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = ts - now;
  const abs = Math.abs(diff);
  const d = Math.floor(abs / 86400);
  const h = Math.floor((abs % 86400) / 3600);
  const m = Math.floor((abs % 3600) / 60);
  if (diff > 0) return `expires in ${d}d ${h}h ${m}m`;
  return `expired ${d}d ${h}h ${m}m ago`;
}

// Algorithms supported by SubtleCrypto
const ASYMMETRIC_ALGS = ['RS256','RS384','RS512','ES256','ES384','ES512','PS256','PS384','PS512'];

const ALG_INFO: Record<string, { family: string; hash: string; description: string }> = {
  RS256: { family: 'RSA-PKCS1-v1_5', hash: 'SHA-256', description: 'RSA with PKCS#1 v1.5 padding, SHA-256 hash' },
  RS384: { family: 'RSA-PKCS1-v1_5', hash: 'SHA-384', description: 'RSA with PKCS#1 v1.5 padding, SHA-384 hash' },
  RS512: { family: 'RSA-PKCS1-v1_5', hash: 'SHA-512', description: 'RSA with PKCS#1 v1.5 padding, SHA-512 hash' },
  ES256: { family: 'ECDSA', hash: 'SHA-256', description: 'ECDSA with P-256 curve, SHA-256 hash' },
  ES384: { family: 'ECDSA', hash: 'SHA-384', description: 'ECDSA with P-384 curve, SHA-384 hash' },
  ES512: { family: 'ECDSA', hash: 'SHA-512', description: 'ECDSA with P-521 curve, SHA-512 hash' },
  PS256: { family: 'RSA-PSS', hash: 'SHA-256', description: 'RSA-PSS with SHA-256 (modern, recommended over RS256)' },
  PS384: { family: 'RSA-PSS', hash: 'SHA-384', description: 'RSA-PSS with SHA-384' },
  PS512: { family: 'RSA-PSS', hash: 'SHA-512', description: 'RSA-PSS with SHA-512' },
};

const CURVE_MAP: Record<string, string> = {
  ES256: 'P-256', ES384: 'P-384', ES512: 'P-521',
};

// RSA salt length for PSS
const PSS_SALT: Record<string, number> = {
  PS256: 32, PS384: 48, PS512: 64,
};

// Sample RS256 JWT (signed with a test key, payload only for illustration)
const SAMPLE_TOKEN =
  'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImRlbW8ta2V5LTEifQ' +
  '.eyJzdWIiOiJ1c2VyXzEyMzQ1IiwibmFtZSI6IkFsaWNlIERldiIsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJhZG1pbiIsImRldmVsb3BlciJdLCJpc3MiOiJodHRwczovL2F1dGguZXhhbXBsZS5jb20iLCJhdWQiOiJodHRwczovL2FwaS5leGFtcGxlLmNvbSIsImlhdCI6MTcxMTU3NjAwMCwiZXhwIjoxNzQzMTEyMDAwLCJuYmYiOjE3MTE1NzYwMDAsImp0aSI6ImE4YjJjNGQzLWY1ZTYtNDc4OC1hOWIwLWMxZDJlM2Y0YTViNiJ9' +
  '.SIGNATURE_PLACEHOLDER_NOT_VERIFIABLE';

const STANDARD_CLAIMS: Record<string, string> = {
  iss: 'Issuer — who issued the token',
  sub: 'Subject — who the token is about',
  aud: 'Audience — who the token is intended for',
  exp: 'Expiration Time — after this time the token is invalid',
  nbf: 'Not Before — token is not valid before this time',
  iat: 'Issued At — when the token was issued',
  jti: 'JWT ID — unique identifier for the token',
};

// ── Web Crypto verify ─────────────────────────────────────────────────────────

async function importPublicKey(pem: string, alg: string): Promise<CryptoKey> {
  // Strip PEM headers and decode
  const b64 = pem
    .replace(/-----BEGIN[^-]+-----/g, '')
    .replace(/-----END[^-]+-----/g, '')
    .replace(/\s+/g, '');
  const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  const info = ALG_INFO[alg];
  if (!info) throw new Error(`Unsupported algorithm: ${alg}`);

  let algorithm: RsaHashedImportParams | EcKeyImportParams;
  let keyUsages: KeyUsage[] = ['verify'];

  if (info.family === 'RSA-PKCS1-v1_5') {
    algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: info.hash };
  } else if (info.family === 'RSA-PSS') {
    algorithm = { name: 'RSA-PSS', hash: info.hash };
  } else if (info.family === 'ECDSA') {
    algorithm = { name: 'ECDSA', namedCurve: CURVE_MAP[alg] };
  } else {
    throw new Error(`Unknown family: ${info.family}`);
  }

  return crypto.subtle.importKey('spki', der.buffer, algorithm, false, keyUsages);
}

async function verifyJwt(token: string, pem: string, alg: string): Promise<boolean> {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Not a valid JWT');

  const key = await importPublicKey(pem, alg);
  const info = ALG_INFO[alg];

  const data = new TextEncoder().encode(parts[0] + '.' + parts[1]);

  // Decode base64url signature
  const sigPad = parts[2].length % 4 === 0 ? '' : '='.repeat(4 - (parts[2].length % 4));
  const sigB64 = (parts[2] + sigPad).replace(/-/g, '+').replace(/_/g, '/');
  const sig = Uint8Array.from(atob(sigB64), c => c.charCodeAt(0));

  let verifyAlg: AlgorithmIdentifier | RsaPssParams | EcdsaParams;
  if (info.family === 'RSA-PKCS1-v1_5') {
    verifyAlg = { name: 'RSASSA-PKCS1-v1_5' };
  } else if (info.family === 'RSA-PSS') {
    verifyAlg = { name: 'RSA-PSS', saltLength: PSS_SALT[alg] };
  } else {
    verifyAlg = { name: 'ECDSA', hash: info.hash };
  }

  return crypto.subtle.verify(verifyAlg, key, sig, data);
}

// ── JsonView ──────────────────────────────────────────────────────────────────

function JsonView({ data, highlightKeys }: { data: Record<string, unknown>; highlightKeys?: string[] }) {
  const lines = JSON.stringify(data, null, 2).split('\n');
  return (
    <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto">
      {lines.map((line, i) => {
        const keyMatch = line.match(/^(\s*)"([^"]+)":/);
        if (keyMatch && highlightKeys?.includes(keyMatch[2])) {
          return (
            <div key={i} class="text-yellow-400">{line}</div>
          );
        }
        // Color strings green, numbers blue, booleans/null orange
        const colored = line
          .replace(/"([^"]*)"(,?)$/g, (_m, v, c) => `<span class="text-green-400">"${v}"</span>${c}`)
          .replace(/: (\d+\.?\d*)(,?)$/g, (_m, v, c) => `: <span class="text-blue-400">${v}</span>${c}`)
          .replace(/: (true|false|null)(,?)$/g, (_m, v, c) => `: <span class="text-orange-400">${v}</span>${c}`);
        return <div key={i} class="text-text" dangerouslySetInnerHTML={{ __html: colored }} />;
      })}
    </pre>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function JwtRs256EcdsaDecoder() {
  const [token, setToken] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; message: string } | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<'header' | 'payload' | 'signature'>('payload');

  const parsed = token.trim() ? parseJwt(token.trim()) : null;
  const parseError = token.trim() && !parsed ? 'Invalid JWT — must have exactly 3 base64url parts.' : null;

  const alg = parsed?.header?.alg as string | undefined;
  const isAsymmetric = alg ? ASYMMETRIC_ALGS.includes(alg) : false;
  const algInfo = alg ? ALG_INFO[alg] : undefined;

  const payload = parsed?.payload ?? {};

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const handleVerify = async () => {
    if (!parsed || !publicKey.trim()) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const valid = await verifyJwt(token.trim(), publicKey.trim(), alg!);
      setVerifyResult({
        valid,
        message: valid
          ? 'Signature is VALID. The token was signed by the private key matching this public key.'
          : 'Signature is INVALID. The token may have been tampered with, or the wrong public key was used.',
      });
    } catch (err: unknown) {
      setVerifyResult({
        valid: false,
        message: `Verification error: ${err instanceof Error ? err.message : String(err)}. Check that your key is in SPKI/PEM format and matches the token algorithm.`,
      });
    }
    setVerifying(false);
  };

  const loadSample = () => {
    setToken(SAMPLE_TOKEN);
    setVerifyResult(null);
  };

  const clear = () => {
    setToken('');
    setPublicKey('');
    setVerifyResult(null);
  };

  return (
    <div class="space-y-5">
      {/* ── Input ── */}
      <div class="bg-surface border border-border rounded-xl p-5 space-y-3">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-text">JWT Token</label>
          <div class="flex gap-2">
            <button
              onClick={loadSample}
              class="text-xs bg-surface-alt hover:bg-border text-text-muted px-3 py-1.5 rounded-md transition-colors">
              Load Sample RS256
            </button>
            <button
              onClick={clear}
              class="text-xs bg-surface-alt hover:bg-border text-text-muted px-3 py-1.5 rounded-md transition-colors">
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={token}
          onInput={e => { setToken((e.target as HTMLTextAreaElement).value); setVerifyResult(null); }}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMzQ1IiwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIn0.SIGNATURE"
          rows={4}
          class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder-text-muted"
        />
        {parseError && <p class="text-red-400 text-sm">{parseError}</p>}

        {/* Algorithm badge */}
        {alg && (
          <div class="flex items-center gap-2 flex-wrap">
            <span class={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${isAsymmetric ? 'bg-accent/10 text-accent border border-accent/30' : 'bg-orange-500/10 text-orange-400 border border-orange-500/30'}`}>
              {alg}
              {isAsymmetric ? ' — Asymmetric' : ' — Symmetric (not supported for verification here)'}
            </span>
            {algInfo && <span class="text-xs text-text-muted">{algInfo.description}</span>}
          </div>
        )}
      </div>

      {parsed && (
        <>
          {/* ── Panel tabs ── */}
          <div class="flex gap-1 border-b border-border">
            {(['payload', 'header', 'signature'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActivePanel(tab)}
                class={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 ${activePanel === tab ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}>
                {tab}
              </button>
            ))}
          </div>

          {/* ── Payload panel ── */}
          {activePanel === 'payload' && (
            <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-yellow-400 uppercase tracking-wide">Payload</span>
                <button
                  onClick={() => copy(JSON.stringify(parsed.payload, null, 2), 'payload')}
                  class="text-xs bg-surface-alt hover:bg-border text-text-muted px-3 py-1 rounded-md transition-colors">
                  {copied === 'payload' ? '✓ Copied' : 'Copy JSON'}
                </button>
              </div>

              <JsonView data={parsed.payload} highlightKeys={Object.keys(STANDARD_CLAIMS)} />

              {/* Claims table */}
              <div class="space-y-2">
                <p class="text-xs font-medium text-text-muted uppercase tracking-wide">Standard Claims</p>
                <div class="space-y-1">
                  {(Object.keys(STANDARD_CLAIMS) as string[])
                    .filter(k => payload[k] !== undefined)
                    .map(k => {
                      const v = payload[k];
                      const isTs = (k === 'exp' || k === 'iat' || k === 'nbf') && typeof v === 'number';
                      return (
                        <div key={k} class="flex flex-wrap items-start gap-x-2 text-xs bg-surface-alt rounded-md px-3 py-2">
                          <span class="font-mono font-bold text-yellow-400 w-8 shrink-0">{k}</span>
                          <span class="text-text-muted flex-1">{STANDARD_CLAIMS[k]}</span>
                          {isTs && (
                            <span class="font-mono text-text w-full mt-1 pl-10">
                              {formatTs(v as number)}
                              <span class={`ml-2 ${(k === 'exp' && (v as number) < Date.now() / 1000) ? 'text-red-400' : 'text-green-400'}`}>
                                ({relativeTime(v as number)})
                              </span>
                            </span>
                          )}
                          {!isTs && (
                            <span class="font-mono text-text break-all">{JSON.stringify(v)}</span>
                          )}
                        </div>
                      );
                    })}
                  {Object.keys(STANDARD_CLAIMS).every(k => payload[k] === undefined) && (
                    <p class="text-xs text-text-muted italic">No standard claims found in payload.</p>
                  )}
                </div>

                {/* Custom claims */}
                {Object.keys(payload).filter(k => !STANDARD_CLAIMS[k]).length > 0 && (
                  <>
                    <p class="text-xs font-medium text-text-muted uppercase tracking-wide mt-3">Custom Claims</p>
                    <div class="space-y-1">
                      {Object.keys(payload)
                        .filter(k => !STANDARD_CLAIMS[k])
                        .map(k => (
                          <div key={k} class="flex flex-wrap items-center gap-x-2 text-xs bg-surface-alt rounded-md px-3 py-2">
                            <span class="font-mono font-bold text-blue-400 w-auto shrink-0">{k}</span>
                            <span class="font-mono text-text break-all">{JSON.stringify(payload[k])}</span>
                          </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* ── Header panel ── */}
          {activePanel === 'header' && (
            <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-blue-400 uppercase tracking-wide">Header</span>
                <button
                  onClick={() => copy(JSON.stringify(parsed.header, null, 2), 'header')}
                  class="text-xs bg-surface-alt hover:bg-border text-text-muted px-3 py-1 rounded-md transition-colors">
                  {copied === 'header' ? '✓ Copied' : 'Copy JSON'}
                </button>
              </div>
              <JsonView data={parsed.header} />

              {/* Algorithm info panel */}
              {alg && algInfo && (
                <div class="bg-surface-alt border border-border rounded-lg p-4 space-y-3 text-sm">
                  <p class="font-medium text-text">Algorithm: <span class="text-accent">{alg}</span></p>
                  <p class="text-text-muted">{algInfo.description}</p>
                  <div class="grid grid-cols-1 gap-2 text-xs">
                    <div class="flex gap-2">
                      <span class="text-text-muted w-28 shrink-0">Family:</span>
                      <span class="text-text">{algInfo.family}</span>
                    </div>
                    <div class="flex gap-2">
                      <span class="text-text-muted w-28 shrink-0">Hash:</span>
                      <span class="text-text">{algInfo.hash}</span>
                    </div>
                    {CURVE_MAP[alg] && (
                      <div class="flex gap-2">
                        <span class="text-text-muted w-28 shrink-0">Curve:</span>
                        <span class="text-text">{CURVE_MAP[alg]}</span>
                      </div>
                    )}
                  </div>
                  <div class="pt-2 border-t border-border text-xs text-text-muted space-y-1">
                    <p class="font-medium text-text">RS256 vs ES256 vs HS256</p>
                    <p><span class="text-text">HS256</span> — Shared secret (HMAC). Fast, but both parties need the same secret.</p>
                    <p><span class="text-text">RS256</span> — RSA key pair. Private key signs, public key verifies. Larger keys/signatures.</p>
                    <p><span class="text-text">ES256</span> — ECDSA key pair. Same asymmetric model as RSA but smaller keys and signatures.</p>
                    <p><span class="text-text">PS256</span> — RSA-PSS. Like RS256 but with probabilistic padding, considered more secure.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Signature panel ── */}
          {activePanel === 'signature' && (
            <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div class="flex items-center justify-between">
                <span class="text-sm font-semibold text-rose-400 uppercase tracking-wide">Signature</span>
                <button
                  onClick={() => copy(parsed.signature, 'sig')}
                  class="text-xs bg-surface-alt hover:bg-border text-text-muted px-3 py-1 rounded-md transition-colors">
                  {copied === 'sig' ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code class="block font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-rose-400 break-all whitespace-pre-wrap">
                {parsed.signature}
              </code>

              {/* Public key input */}
              <div class="space-y-2">
                <label class="text-sm font-medium text-text">Public Key (PEM/SPKI format)</label>
                <textarea
                  value={publicKey}
                  onInput={e => { setPublicKey((e.target as HTMLTextAreaElement).value); setVerifyResult(null); }}
                  placeholder={'-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...\n-----END PUBLIC KEY-----'}
                  rows={6}
                  class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-none placeholder-text-muted"
                />
                <p class="text-xs text-text-muted">
                  Paste the <strong class="text-text">SPKI-format PEM public key</strong>. For RSA keys this is the standard output from <code class="text-accent">openssl rsa -pubout</code>. For EC keys use <code class="text-accent">openssl ec -pubout</code>. JWK keys must be converted to PEM first.
                </p>
              </div>

              {!isAsymmetric && alg && (
                <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg px-4 py-3 text-sm text-orange-300">
                  Algorithm <strong>{alg}</strong> is symmetric (HMAC). Use the JWT Debugger tool to verify HMAC signatures.
                </div>
              )}

              {isAsymmetric && (
                <button
                  onClick={handleVerify}
                  disabled={!publicKey.trim() || verifying}
                  class="w-full bg-accent hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg text-sm transition-opacity">
                  {verifying ? 'Verifying…' : `Verify ${alg} Signature`}
                </button>
              )}

              {verifyResult && (
                <div class={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${verifyResult.valid ? 'bg-green-500/10 border-green-500/30 text-green-300' : 'bg-red-500/10 border-red-500/30 text-red-300'}`}>
                  <span class="text-lg shrink-0">{verifyResult.valid ? '✓' : '✗'}</span>
                  <div>
                    <p class="font-bold">{verifyResult.valid ? 'VALID' : 'INVALID'}</p>
                    <p class="text-xs mt-1 opacity-80">{verifyResult.message}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Info box ── */}
      <div class="bg-surface-alt border border-border rounded-lg p-4 text-sm text-text-muted space-y-1">
        <p class="font-medium text-text">About Asymmetric JWT</p>
        <p>Asymmetric JWT algorithms (RS*, ES*, PS*) use a <strong class="text-text">private key to sign</strong> and a <strong class="text-text">public key to verify</strong>. The server never needs to share its private key — clients can verify tokens using only the public key, making this ideal for microservices and third-party integrations.</p>
        <p class="text-xs mt-1">All operations run locally in your browser using the Web Crypto API. No data is sent to any server.</p>
      </div>
    </div>
  );
}
