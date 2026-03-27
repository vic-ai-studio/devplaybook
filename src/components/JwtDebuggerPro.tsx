import { useState } from 'preact/hooks';

const SAMPLE_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsIm5hbWUiOiJBbGljZSIsImVtYWlsIjoiYWxpY2VAZXhhbXBsZS5jb20iLCJpYXQiOjE3MTE1MDAwMDAsImV4cCI6MTcxMTUwMzYwMCwiaXNzIjoiaHR0cHM6Ly9hdXRoLmV4YW1wbGUuY29tIiwiYXVkIjoiaHR0cHM6Ly9hcGkuZXhhbXBsZS5jb20iLCJyb2xlcyI6WyJ1c2VyIiwiYWRtaW4iXSwianRpIjoiYWJjZGVmMTIzNDU2In0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';

type SecurityFinding = {
  level: 'critical' | 'warning' | 'info' | 'pass';
  title: string;
  detail: string;
};

function b64Decode(str: string): string {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
  try {
    return atob(padded);
  } catch {
    throw new Error('Invalid Base64URL encoding');
  }
}

function parseJwt(token: string): { header: any; payload: any; signature: string; parts: string[] } {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error(`JWT must have 3 parts (got ${parts.length}). Format: header.payload.signature`);
  const header = JSON.parse(b64Decode(parts[0]));
  const payload = JSON.parse(b64Decode(parts[1]));
  return { header, payload, signature: parts[2], parts };
}

function auditJwt(header: any, payload: any): SecurityFinding[] {
  const findings: SecurityFinding[] = [];
  const now = Math.floor(Date.now() / 1000);

  // Algorithm check
  const alg = header.alg as string;
  if (!alg) {
    findings.push({ level: 'critical', title: 'Missing algorithm', detail: 'No "alg" field in header. JWT spec requires an algorithm. Accept-all validators may treat this as "none" (unsigned).' });
  } else if (alg.toLowerCase() === 'none') {
    findings.push({ level: 'critical', title: 'Algorithm: none', detail: 'alg=none means the token is unsigned. Never accept alg=none tokens in production — they bypass signature verification entirely.' });
  } else if (alg === 'HS256') {
    findings.push({ level: 'info', title: 'Algorithm: HS256 (HMAC-SHA256)', detail: 'Symmetric algorithm. The same secret signs and verifies. Acceptable for single-service auth. For distributed systems, prefer RS256/ES256 (asymmetric) so services can verify without the private key.' });
  } else if (alg === 'HS384' || alg === 'HS512') {
    findings.push({ level: 'info', title: `Algorithm: ${alg}`, detail: `Symmetric HMAC with stronger hash. Same trade-offs as HS256 but harder to brute-force due to longer digest.` });
  } else if (alg === 'RS256' || alg === 'RS384' || alg === 'RS512') {
    findings.push({ level: 'pass', title: `Algorithm: ${alg} (RSA)`, detail: 'Asymmetric algorithm. Private key signs; public key verifies. Good for distributed systems — verifiers don\'t need the private key.' });
  } else if (alg === 'ES256' || alg === 'ES384' || alg === 'ES512') {
    findings.push({ level: 'pass', title: `Algorithm: ${alg} (ECDSA)`, detail: 'Asymmetric elliptic curve algorithm. Shorter keys than RSA with equivalent security. ES256 (P-256) is the recommended modern choice.' });
  } else if (alg === 'PS256' || alg === 'PS384' || alg === 'PS512') {
    findings.push({ level: 'pass', title: `Algorithm: ${alg} (RSA-PSS)`, detail: 'Probabilistic signature scheme — more secure than PKCS1v1.5 (RS256). Recommended when using RSA.' });
  } else {
    findings.push({ level: 'warning', title: `Unknown algorithm: ${alg}`, detail: `"${alg}" is not a standard JOSE algorithm. Verify your JWT library supports it and that it is not a weak custom algorithm.` });
  }

  // Token type
  if (header.typ && header.typ !== 'JWT') {
    findings.push({ level: 'warning', title: `Non-standard type: ${header.typ}`, detail: `Expected "JWT" but got "${header.typ}". This may be intentional (e.g. "at+JWT" for OAuth access tokens per RFC 9068), but verify your parser accepts it.` });
  }

  // Expiry check
  if (!payload.exp) {
    findings.push({ level: 'warning', title: 'No expiry (exp claim)', detail: 'Tokens without an expiry never expire. Always set exp for production tokens — if a token is leaked, an expiry limits the attack window.' });
  } else {
    const exp = payload.exp as number;
    const ttl = exp - now;
    if (now > exp) {
      findings.push({ level: 'critical', title: `Token expired ${Math.abs(Math.round(ttl / 60))} minutes ago`, detail: `exp=${exp} (${new Date(exp * 1000).toISOString()}). This token is no longer valid. Issue a new token.` });
    } else if (ttl > 86400 * 30) {
      findings.push({ level: 'warning', title: `Long expiry: ${Math.round(ttl / 86400)} days remaining`, detail: `Tokens valid for more than 30 days increase risk if leaked. Consider shorter-lived access tokens (15m–1h) with refresh tokens for long-lived sessions.` });
    } else if (ttl < 300) {
      findings.push({ level: 'warning', title: `Token expires in ${Math.round(ttl / 60)} minutes`, detail: 'Token is about to expire. Prepare to refresh or re-authenticate.' });
    } else {
      findings.push({ level: 'pass', title: `Token valid for ${ttl > 3600 ? Math.round(ttl / 3600) + ' hours' : Math.round(ttl / 60) + ' minutes'}`, detail: `Expires at ${new Date(exp * 1000).toISOString()}` });
    }
  }

  // nbf check
  if (payload.nbf) {
    const nbf = payload.nbf as number;
    if (now < nbf) {
      findings.push({ level: 'warning', title: 'Token not yet valid (nbf)', detail: `nbf=${nbf} (${new Date(nbf * 1000).toISOString()}). This token cannot be used yet. Check for clock skew between issuer and consumer.` });
    } else {
      findings.push({ level: 'pass', title: 'Not-before claim (nbf) satisfied', detail: `Valid since ${new Date(nbf * 1000).toISOString()}` });
    }
  }

  // iss check
  if (!payload.iss) {
    findings.push({ level: 'warning', title: 'No issuer (iss claim)', detail: 'Missing issuer makes it harder to validate token origin. Always include iss and validate it against your known issuers to prevent token substitution attacks.' });
  }

  // aud check
  if (!payload.aud) {
    findings.push({ level: 'warning', title: 'No audience (aud claim)', detail: 'Missing audience. A token without aud could be used against any service. Always include and validate aud to prevent token replay across different APIs.' });
  } else {
    findings.push({ level: 'pass', title: 'Audience (aud) present', detail: `Validate that your service matches: ${JSON.stringify(payload.aud)}` });
  }

  // jti check
  if (!payload.jti) {
    findings.push({ level: 'info', title: 'No JWT ID (jti claim)', detail: 'Without jti, you cannot implement token replay detection. For one-time-use tokens (password reset, email verification), always include a unique jti and store used tokens in a blocklist.' });
  }

  // sub check
  if (!payload.sub) {
    findings.push({ level: 'info', title: 'No subject (sub claim)', detail: 'No "sub" (subject) claim. For user authentication, sub should contain the user identifier to associate the token with a principal.' });
  }

  // Sensitive data in payload
  const sensitiveKeys = ['password', 'secret', 'ssn', 'credit_card', 'card_number', 'cvv', 'pin'];
  const payloadStr = JSON.stringify(payload).toLowerCase();
  for (const key of sensitiveKeys) {
    if (payloadStr.includes(key)) {
      findings.push({ level: 'critical', title: `Sensitive key "${key}" in payload`, detail: 'JWT payloads are Base64URL-encoded — NOT encrypted. Anyone who has the token can read it. Never put passwords, SSNs, credit card numbers, or other sensitive data in a JWT payload.' });
      break;
    }
  }

  return findings;
}

const LEVEL_STYLES = {
  critical: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
  pass: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400', badge: 'bg-green-500/20 text-green-400' },
};

type Tab = 'audit' | 'header' | 'payload';

export default function JwtDebuggerPro() {
  const [input, setInput] = useState(SAMPLE_JWT);
  const [result, setResult] = useState<{ header: any; payload: any; signature: string; findings: SecurityFinding[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('audit');

  const handleDebug = () => {
    try {
      const { header, payload, signature } = parseJwt(input);
      const findings = auditJwt(header, payload);
      setResult({ header, payload, signature, findings });
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  };

  const handleLoad = () => {
    setInput(SAMPLE_JWT);
    setResult(null);
    setError(null);
  };

  const handleClear = () => {
    setInput('');
    setResult(null);
    setError(null);
  };

  const criticals = result?.findings.filter(f => f.level === 'critical') ?? [];
  const warnings = result?.findings.filter(f => f.level === 'warning') ?? [];
  const passes = result?.findings.filter(f => f.level === 'pass') ?? [];

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">JWT token</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setResult(null); setError(null); }}
          rows={5}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors break-all"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleDebug} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Audit JWT
      </button>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
          ✗ {error}
        </div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Score bar */}
          <div class="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg text-sm flex-wrap">
            {criticals.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{criticals.length} critical</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {passes.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{passes.length} pass{passes.length > 1 ? 'es' : ''}</span>}
            <span class="text-text-muted ml-auto text-xs font-mono truncate max-w-xs">alg={result.header.alg} typ={result.header.typ ?? '—'}</span>
          </div>

          {/* Tabs */}
          <div class="flex border-b border-border">
            {(['audit', 'header', 'payload'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                class={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px capitalize ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'audit' && (
            <div class="space-y-2">
              {result.findings.map((f, i) => {
                const style = LEVEL_STYLES[f.level];
                return (
                  <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                    <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 mb-0.5">
                        <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{f.level}</span>
                        <span class="text-sm font-medium text-text">{f.title}</span>
                      </div>
                      <p class="text-xs text-text-muted">{f.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {(tab === 'header' || tab === 'payload') && (
            <pre class="bg-background border border-border rounded-lg p-4 text-xs font-mono overflow-auto text-text whitespace-pre-wrap">
              {JSON.stringify(tab === 'header' ? result.header : result.payload, null, 2)}
            </pre>
          )}

          {tab === 'payload' && (
            <div class="bg-surface border border-border rounded-lg p-3 text-xs space-y-1">
              <p class="font-medium text-text mb-2">Standard claims</p>
              {[
                ['sub', 'Subject (principal identifier)'],
                ['iss', 'Issuer'],
                ['aud', 'Audience'],
                ['exp', 'Expiration time'],
                ['iat', 'Issued at'],
                ['nbf', 'Not before'],
                ['jti', 'JWT ID (unique identifier)'],
              ].map(([claim, label]) => {
                const val = result.payload[claim];
                if (val === undefined) return null;
                const display = (claim === 'exp' || claim === 'iat' || claim === 'nbf') && typeof val === 'number'
                  ? `${val} (${new Date(val * 1000).toISOString()})`
                  : JSON.stringify(val);
                return (
                  <div key={claim} class="flex gap-2">
                    <span class="font-mono text-accent w-8 shrink-0">{claim}</span>
                    <span class="text-text-muted">{label}:</span>
                    <span class="font-mono text-text truncate">{display}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
