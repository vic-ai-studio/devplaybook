import { useState } from 'preact/hooks';

// PKCE helpers — browser crypto
async function generateCodeVerifier(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

type Step = 'config' | 'pkce' | 'authurl' | 'exchange';

type Config = {
  authEndpoint: string;
  tokenEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  responseType: 'code' | 'token';
  usePkce: boolean;
};

const DEFAULT_CONFIG: Config = {
  authEndpoint: 'https://auth.example.com/oauth/authorize',
  tokenEndpoint: 'https://auth.example.com/oauth/token',
  clientId: 'my-client-id',
  redirectUri: 'http://localhost:3000/callback',
  scope: 'openid profile email',
  responseType: 'code',
  usePkce: true,
};

function buildAuthUrl(config: Config, state: string, codeChallenge?: string): string {
  const params = new URLSearchParams({
    response_type: config.responseType,
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
  });
  if (config.usePkce && codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }
  return `${config.authEndpoint}?${params.toString()}`;
}

function buildTokenRequest(config: Config, code: string, verifier?: string): string {
  const body: Record<string, string> = {
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
  };
  if (config.usePkce && verifier) {
    body.code_verifier = verifier;
  }
  const lines = [
    `POST ${config.tokenEndpoint}`,
    'Content-Type: application/x-www-form-urlencoded',
    '',
    Object.entries(body).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&'),
  ];
  return lines.join('\n');
}

function validateConfig(config: Config): string[] {
  const errs: string[] = [];
  if (!config.authEndpoint.startsWith('https://') && !config.authEndpoint.startsWith('http://localhost')) {
    errs.push('Authorization endpoint should use HTTPS in production.');
  }
  if (!config.tokenEndpoint.startsWith('https://') && !config.tokenEndpoint.startsWith('http://localhost')) {
    errs.push('Token endpoint should use HTTPS — tokens must never travel over plain HTTP.');
  }
  if (!config.redirectUri.startsWith('https://') && !config.redirectUri.startsWith('http://localhost')) {
    errs.push('Redirect URI should use HTTPS in production to prevent authorization code interception.');
  }
  if (!config.usePkce && config.responseType === 'code') {
    errs.push('PKCE is strongly recommended for authorization code flow. Without it, authorization codes can be intercepted.');
  }
  if (config.scope.split(' ').includes('offline_access') && !config.scope.includes('openid')) {
    errs.push('Requesting offline_access without openid scope is unusual. Include "openid" for standard OIDC refresh token flows.');
  }
  return errs;
}

export default function OAuth2FlowTester() {
  const [step, setStep] = useState<Step>('config');
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [pkce, setPkce] = useState<{ verifier: string; challenge: string } | null>(null);
  const [state, setState] = useState('');
  const [authUrl, setAuthUrl] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [tokenRequest, setTokenRequest] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const validationErrors = validateConfig(config);

  const handleGeneratePkce = async () => {
    setGenerating(true);
    const verifier = await generateCodeVerifier();
    const challenge = await generateCodeChallenge(verifier);
    const randomState = Math.random().toString(36).substring(2, 18);
    setPkce({ verifier, challenge });
    setState(randomState);
    const url = buildAuthUrl(config, randomState, challenge);
    setAuthUrl(url);
    setStep('pkce');
    setGenerating(false);
  };

  const handleBuildAuthUrl = () => {
    const randomState = state || Math.random().toString(36).substring(2, 18);
    setState(randomState);
    const url = buildAuthUrl(config, randomState, pkce?.challenge);
    setAuthUrl(url);
    setStep('authurl');
  };

  const handleBuildTokenRequest = () => {
    const req = buildTokenRequest(config, authCode || '<AUTHORIZATION_CODE>', pkce?.verifier);
    setTokenRequest(req);
    setStep('exchange');
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const updateConfig = (key: keyof Config, value: string | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }));
    setPkce(null);
    setAuthUrl('');
    setStep('config');
  };

  return (
    <div class="space-y-4">
      {/* Config */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <p class="text-sm font-medium text-text">OAuth2 Configuration</p>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { key: 'authEndpoint' as const, label: 'Authorization Endpoint' },
            { key: 'tokenEndpoint' as const, label: 'Token Endpoint' },
            { key: 'clientId' as const, label: 'Client ID' },
            { key: 'redirectUri' as const, label: 'Redirect URI' },
            { key: 'scope' as const, label: 'Scope' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label class="text-xs text-text-muted block mb-1">{label}</label>
              <input
                type="text"
                value={config[key] as string}
                onInput={e => updateConfig(key, (e.target as HTMLInputElement).value)}
                class="w-full font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              />
            </div>
          ))}
          <div>
            <label class="text-xs text-text-muted block mb-1">Response Type</label>
            <select
              value={config.responseType}
              onChange={e => updateConfig('responseType', (e.target as HTMLSelectElement).value as 'code' | 'token')}
              class="w-full font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            >
              <option value="code">code (Authorization Code Flow)</option>
              <option value="token">token (Implicit — deprecated)</option>
            </select>
          </div>
        </div>
        <label class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={config.usePkce}
            onChange={e => updateConfig('usePkce', (e.target as HTMLInputElement).checked)}
            class="rounded"
          />
          <span class="text-sm text-text">Use PKCE (recommended for public clients)</span>
        </label>
      </div>

      {/* Validation */}
      {validationErrors.length > 0 && (
        <div class="space-y-1">
          {validationErrors.map((err, i) => (
            <div key={i} class="flex gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-xs text-yellow-400">
              <span>⚠</span><span>{err}</span>
            </div>
          ))}
        </div>
      )}

      {/* Step 1: Generate PKCE */}
      {config.usePkce && (
        <div>
          <button
            onClick={handleGeneratePkce}
            disabled={generating}
            class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors disabled:opacity-60"
          >
            {generating ? 'Generating…' : 'Generate PKCE Codes + Auth URL'}
          </button>

          {pkce && (
            <div class="mt-3 space-y-3">
              <p class="text-xs font-medium text-text">Step 1 — PKCE Codes (keep code_verifier secret)</p>
              {[
                { label: 'code_verifier', value: pkce.verifier, key: 'verifier', note: 'Store securely — sent in token request' },
                { label: 'code_challenge', value: pkce.challenge, key: 'challenge', note: 'SHA-256 hash of verifier — sent in auth request' },
                { label: 'state', value: state, key: 'state', note: 'CSRF protection — verify this on callback' },
              ].map(item => (
                <div key={item.key} class="p-3 bg-background border border-border rounded-lg">
                  <div class="flex items-center justify-between mb-1">
                    <span class="font-mono text-xs text-accent">{item.label}</span>
                    <button
                      onClick={() => copyToClipboard(item.value, item.key)}
                      class="text-xs px-2 py-0.5 bg-surface border border-border rounded hover:border-accent transition-colors"
                    >
                      {copied === item.key ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>
                  <p class="font-mono text-xs text-text break-all">{item.value}</p>
                  <p class="text-xs text-text-muted mt-1">{item.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Auth URL */}
      {!config.usePkce && (
        <button onClick={handleBuildAuthUrl} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
          Build Authorization URL
        </button>
      )}

      {authUrl && (
        <div class="space-y-2">
          <p class="text-xs font-medium text-text">Step 2 — Authorization URL (open in browser)</p>
          <div class="p-3 bg-background border border-border rounded-lg">
            <div class="flex items-start justify-between gap-2 mb-2">
              <span class="font-mono text-xs text-text break-all">{authUrl}</span>
              <button
                onClick={() => copyToClipboard(authUrl, 'authurl')}
                class="shrink-0 text-xs px-2 py-0.5 bg-surface border border-border rounded hover:border-accent transition-colors"
              >
                {copied === 'authurl' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <div class="space-y-1 text-xs text-text-muted">
              {Array.from(new URLSearchParams(authUrl.split('?')[1] ?? '')).map(([k, v]) => (
                <div key={k} class="flex gap-2">
                  <span class="text-accent w-28 shrink-0">{k}</span>
                  <span class="truncate">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Token exchange */}
      {(step === 'pkce' || step === 'authurl') && (
        <div class="space-y-2">
          <p class="text-xs font-medium text-text">Step 3 — Enter authorization code from callback</p>
          <div class="flex gap-2">
            <input
              type="text"
              value={authCode}
              onInput={e => setAuthCode((e.target as HTMLInputElement).value)}
              class="flex-1 font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
              placeholder="Authorization code from redirect URI ?code=..."
            />
            <button onClick={handleBuildTokenRequest} class="px-4 py-2 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors text-sm">
              Build Token Request
            </button>
          </div>
        </div>
      )}

      {tokenRequest && (
        <div class="space-y-2">
          <p class="text-xs font-medium text-text">Step 4 — Token exchange request</p>
          <div class="p-3 bg-background border border-border rounded-lg">
            <div class="flex items-start justify-between gap-2 mb-2">
              <pre class="font-mono text-xs text-text whitespace-pre-wrap break-all flex-1">{tokenRequest}</pre>
              <button
                onClick={() => copyToClipboard(tokenRequest, 'token')}
                class="shrink-0 text-xs px-2 py-0.5 bg-surface border border-border rounded hover:border-accent transition-colors"
              >
                {copied === 'token' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">OAuth2 Authorization Code + PKCE Flow</p>
        <ol class="space-y-1 list-decimal list-inside">
          <li>Generate code_verifier (random) and code_challenge (SHA-256 hash)</li>
          <li>Redirect user to Authorization URL with code_challenge</li>
          <li>User authenticates; auth server redirects back with authorization code</li>
          <li>Exchange code + code_verifier for access token at Token Endpoint</li>
          <li>Validate returned tokens (signature, exp, aud) before use</li>
        </ol>
      </div>
    </div>
  );
}
