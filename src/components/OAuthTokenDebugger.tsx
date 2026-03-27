import { useState } from 'preact/hooks';

interface JwtParts {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  raw: { header: string; payload: string; signature: string };
}

function base64UrlDecode(str: string): string {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + (4 - str.length % 4) % 4, '=');
  try {
    return atob(padded);
  } catch {
    throw new Error('Invalid base64url encoding');
  }
}

function parseJwt(token: string): JwtParts {
  const parts = token.trim().split('.');
  if (parts.length !== 3) throw new Error('Token must have exactly 3 parts (header.payload.signature)');
  const header = JSON.parse(base64UrlDecode(parts[0]));
  const payload = JSON.parse(base64UrlDecode(parts[1]));
  return { header, payload, signature: parts[2], raw: { header: parts[0], payload: parts[1], signature: parts[2] } };
}

function formatTimestamp(ts: unknown): string {
  if (typeof ts !== 'number') return String(ts);
  const d = new Date(ts * 1000);
  return `${d.toISOString().replace('T', ' ').replace('.000Z', ' UTC')} (${Math.round((ts * 1000 - Date.now()) / 1000 / 60)} min from now)`;
}

function isExpired(payload: Record<string, unknown>): boolean | null {
  if (typeof payload.exp !== 'number') return null;
  return payload.exp * 1000 < Date.now();
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  openid: 'Required for OIDC — establishes identity layer',
  profile: 'Name, picture, locale, and profile info',
  email: 'Email address and verification status',
  address: 'Physical address',
  phone: 'Phone number and verification status',
  offline_access: 'Refresh token for offline access',
  'read:users': 'Read user accounts',
  'write:users': 'Modify user accounts',
  'admin:org': 'Full admin access to organization',
  'repo': 'Full access to repositories (GitHub)',
  'read:repo': 'Read-only repository access (GitHub)',
  'user': 'Read user profile data (GitHub)',
};

const CLAIM_INFO: Record<string, { label: string; desc: string }> = {
  iss: { label: 'Issuer', desc: 'Who issued the token (e.g. https://accounts.google.com)' },
  sub: { label: 'Subject', desc: 'User/entity the token represents (usually user ID)' },
  aud: { label: 'Audience', desc: 'Who the token is intended for (client_id or service)' },
  exp: { label: 'Expiration', desc: 'Unix timestamp after which token is invalid' },
  iat: { label: 'Issued At', desc: 'Unix timestamp when token was created' },
  nbf: { label: 'Not Before', desc: 'Token not valid before this Unix timestamp' },
  jti: { label: 'JWT ID', desc: 'Unique identifier for this token (for revocation)' },
  scope: { label: 'Scopes', desc: 'Space-separated OAuth 2.0 permission scopes' },
  client_id: { label: 'Client ID', desc: 'OAuth 2.0 client application that requested this token' },
  token_type: { label: 'Token Type', desc: 'Type of token — typically "Bearer"' },
  azp: { label: 'Authorized Party', desc: 'Client ID of the authorized party (OIDC)' },
  email: { label: 'Email', desc: 'User email address claim' },
  email_verified: { label: 'Email Verified', desc: 'Whether the email has been verified' },
  name: { label: 'Full Name', desc: 'User display name' },
  picture: { label: 'Picture', desc: 'URL to user profile photo' },
  at_hash: { label: 'Access Token Hash', desc: 'Hash of the access token (OIDC ID token)' },
  nonce: { label: 'Nonce', desc: 'CSRF protection value set by the client' },
};

function detectTokenType(payload: Record<string, unknown>): string {
  if (payload.at_hash || payload.nonce) return 'OIDC ID Token';
  if (payload.scope) return 'OAuth 2.0 Access Token';
  if (payload.client_id && !payload.sub) return 'Client Credentials Token';
  if (typeof payload.exp === 'number' && (payload.exp - (payload.iat as number || 0)) > 86400 * 30) return 'Long-lived / Refresh-like Token';
  return 'JWT';
}

const EXAMPLE_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImV4YW1wbGUta2V5LWlkIn0.eyJpc3MiOiJodHRwczovL2FjY291bnRzLmV4YW1wbGUuY29tIiwic3ViIjoidXNlcl8xMjM0NTYiLCJhdWQiOiJteS1hcHAtY2xpZW50LWlkIiwiZXhwIjoxNzU2MDAwMDAwLCJpYXQiOjE3NDMwMDAwMDAsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUgZW1haWwgcmVhZDp1c2VycyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJuYW1lIjoiQWxpY2UgRXhhbXBsZSIsImNsaWVudF9pZCI6Im15LWFwcC1jbGllbnQtaWQifQ.SIGNATURE_NOT_VERIFIED';

export default function OAuthTokenDebugger() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<JwtParts | null>(null);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'header' | 'payload' | 'scopes'>('overview');

  function decode(token: string) {
    setError('');
    try {
      const parsed = parseJwt(token);
      setResult(parsed);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    }
  }

  function handleInput(val: string) {
    setInput(val);
    if (val.trim()) decode(val);
    else { setResult(null); setError(''); }
  }

  function loadExample() {
    setInput(EXAMPLE_TOKEN);
    decode(EXAMPLE_TOKEN);
  }

  const expired = result ? isExpired(result.payload) : null;
  const scopes: string[] = result?.payload?.scope ? String(result.payload.scope).split(/\s+/) : [];
  const tokenType = result ? detectTokenType(result.payload) : '';

  const tabClass = (tab: typeof activeTab) =>
    `px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${
      activeTab === tab ? 'border-blue-500 text-blue-400 bg-surface' : 'border-transparent text-text-muted hover:text-white'
    }`;

  return (
    <div class="space-y-4">
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-text-muted">Paste OAuth 2.0 / JWT token</label>
          <button onClick={loadExample} class="text-xs text-blue-400 hover:text-blue-300">Load example token</button>
        </div>
        <textarea
          value={input}
          onInput={e => handleInput((e.target as HTMLTextAreaElement).value)}
          placeholder="eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsInNjb3BlIjoib3BlbmlkIHByb2ZpbGUiLCJleHAiOjE3NTYwMDAwMDB9.signature"
          class="w-full h-28 bg-[#1a1a2e] border border-border rounded p-3 font-mono text-xs text-white placeholder-text-muted resize-none focus:outline-none focus:border-blue-500"
          spellcheck={false}
        />
      </div>

      {error && (
        <div class="bg-red-900/20 border border-red-500/30 rounded p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Status Bar */}
          <div class="flex items-center gap-3 flex-wrap">
            <span class={`px-3 py-1 rounded-full text-xs font-medium ${expired === true ? 'bg-red-900/30 text-red-400 border border-red-500/30' : expired === false ? 'bg-green-900/30 text-green-400 border border-green-500/30' : 'bg-yellow-900/30 text-yellow-400 border border-yellow-500/30'}`}>
              {expired === true ? '⚠ Expired' : expired === false ? '✓ Valid (not expired)' : '? No expiry claim'}
            </span>
            <span class="px-3 py-1 rounded-full text-xs bg-blue-900/30 text-blue-400 border border-blue-500/30">{tokenType}</span>
            <span class="px-3 py-1 rounded-full text-xs bg-surface text-text-muted border border-border">alg: {String(result.header.alg || 'none')}</span>
            {scopes.length > 0 && <span class="px-3 py-1 rounded-full text-xs bg-surface text-text-muted border border-border">{scopes.length} scope{scopes.length !== 1 ? 's' : ''}</span>}
          </div>

          {/* Tabs */}
          <div class="border-b border-border">
            <div class="flex gap-1">
              {(['overview', 'header', 'payload', 'scopes'] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} class={tabClass(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {tab === 'scopes' && scopes.length > 0 && <span class="ml-1 text-xs bg-blue-700 text-white rounded-full px-1">{scopes.length}</span>}
                </button>
              ))}
            </div>
          </div>

          {activeTab === 'overview' && (
            <div class="space-y-3">
              {Object.entries(result.payload)
                .filter(([k]) => CLAIM_INFO[k])
                .map(([key, val]) => {
                  const info = CLAIM_INFO[key];
                  const isTimestamp = ['exp', 'iat', 'nbf'].includes(key);
                  return (
                    <div key={key} class="bg-surface rounded p-3 border border-border">
                      <div class="flex items-start justify-between gap-2">
                        <div>
                          <span class="font-mono text-sm text-blue-400">{key}</span>
                          <span class="ml-2 text-xs text-text-muted">{info.label}</span>
                        </div>
                        <span class="font-mono text-xs text-white text-right break-all">
                          {isTimestamp ? formatTimestamp(val) : String(val)}
                        </span>
                      </div>
                      <p class="text-xs text-text-muted mt-1">{info.desc}</p>
                    </div>
                  );
                })}
              {Object.entries(result.payload)
                .filter(([k]) => !CLAIM_INFO[k])
                .map(([key, val]) => (
                  <div key={key} class="bg-surface rounded p-3 border border-border">
                    <div class="flex items-start justify-between gap-2">
                      <span class="font-mono text-sm text-green-400">{key}</span>
                      <span class="font-mono text-xs text-white text-right break-all">{JSON.stringify(val)}</span>
                    </div>
                    <p class="text-xs text-text-muted mt-1">Custom claim</p>
                  </div>
                ))}
            </div>
          )}

          {activeTab === 'header' && (
            <div class="space-y-3">
              {Object.entries(result.header).map(([key, val]) => (
                <div key={key} class="bg-surface rounded p-3 border border-border flex justify-between gap-2">
                  <span class="font-mono text-sm text-purple-400">{key}</span>
                  <span class="font-mono text-xs text-white break-all">{JSON.stringify(val)}</span>
                </div>
              ))}
              <div class="mt-2">
                <p class="text-xs text-text-muted mb-1">Raw (base64url)</p>
                <code class="text-xs font-mono text-text-muted break-all">{result.raw.header}</code>
              </div>
            </div>
          )}

          {activeTab === 'payload' && (
            <div>
              <pre class="bg-[#1a1a2e] rounded p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(result.payload, null, 2)}
              </pre>
            </div>
          )}

          {activeTab === 'scopes' && (
            <div class="space-y-3">
              {scopes.length === 0 ? (
                <p class="text-text-muted text-sm">No scope claim found in this token.</p>
              ) : (
                <>
                  <p class="text-sm text-text-muted">Scopes granted to this token:</p>
                  {scopes.map(scope => (
                    <div key={scope} class="bg-surface rounded p-3 border border-border flex items-start gap-3">
                      <span class="font-mono text-sm text-green-400 min-w-fit">{scope}</span>
                      <span class="text-xs text-text-muted">{SCOPE_DESCRIPTIONS[scope] || 'Application-specific scope'}</span>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {!result && !error && (
        <div class="text-center py-8 text-text-muted text-sm">
          <p>Paste an OAuth 2.0 or JWT token above to decode it.</p>
          <p class="mt-1 text-xs">Nothing is sent to any server — runs 100% in your browser.</p>
        </div>
      )}
    </div>
  );
}
