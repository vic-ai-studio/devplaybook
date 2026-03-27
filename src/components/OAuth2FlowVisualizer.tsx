import { useState } from 'preact/hooks';

type FlowType = 'authorization_code' | 'implicit' | 'client_credentials' | 'device_code' | 'pkce';

const FLOWS: Record<FlowType, { label: string; description: string; steps: { actor: string; arrow: string; label: string; note: string }[] }> = {
  authorization_code: {
    label: 'Authorization Code',
    description: 'Most secure flow for server-side apps. Exchange code for tokens server-side — client secret never exposed to browser.',
    steps: [
      { actor: 'User', arrow: 'Browser → Auth Server', label: 'GET /authorize?response_type=code&client_id=...&redirect_uri=...&scope=...&state=random', note: 'User is redirected to login page' },
      { actor: 'Auth Server', arrow: 'Auth Server → User', label: 'Login & Consent screen', note: 'User authenticates and approves scopes' },
      { actor: 'Auth Server', arrow: 'Auth Server → Browser', label: 'Redirect to redirect_uri?code=AUTH_CODE&state=...', note: 'Authorization code returned (short-lived, ~10 min)' },
      { actor: 'App Server', arrow: 'App Server → Auth Server', label: 'POST /token { code, client_id, client_secret, redirect_uri }', note: 'Server-side exchange — secret never leaves backend' },
      { actor: 'Auth Server', arrow: 'Auth Server → App Server', label: '{ access_token, refresh_token, expires_in }', note: 'Tokens returned to server' },
      { actor: 'App Server', arrow: 'App → User', label: 'Set session cookie / return access token', note: 'User is now authenticated' },
    ],
  },
  pkce: {
    label: 'Authorization Code + PKCE',
    description: 'Authorization Code flow hardened for SPAs and mobile apps where a client secret cannot be kept confidential. Uses code_verifier/code_challenge pair.',
    steps: [
      { actor: 'Client', arrow: 'Client (local)', label: 'Generate code_verifier (random 43-128 chars) → code_challenge = BASE64URL(SHA256(verifier))', note: 'PKCE challenge generated locally' },
      { actor: 'Client', arrow: 'Browser → Auth Server', label: 'GET /authorize?response_type=code&code_challenge=...&code_challenge_method=S256', note: 'No client_secret sent' },
      { actor: 'Auth Server', arrow: 'Auth Server → Browser', label: 'Redirect to redirect_uri?code=AUTH_CODE', note: 'Authorization code returned' },
      { actor: 'Client', arrow: 'Client → Auth Server', label: 'POST /token { code, code_verifier, client_id }', note: 'Verifier sent (not the challenge) — server validates' },
      { actor: 'Auth Server', arrow: 'Auth Server → Client', label: '{ access_token, refresh_token, expires_in }', note: 'Tokens returned only if verifier matches challenge' },
    ],
  },
  implicit: {
    label: 'Implicit (Legacy)',
    description: 'Deprecated. Tokens returned directly in URL fragment — use Authorization Code + PKCE instead for SPAs.',
    steps: [
      { actor: 'User', arrow: 'Browser → Auth Server', label: 'GET /authorize?response_type=token&client_id=...&redirect_uri=...', note: '⚠️ Deprecated — tokens exposed in URL' },
      { actor: 'Auth Server', arrow: 'Auth Server → User', label: 'Login & Consent screen', note: 'User authenticates' },
      { actor: 'Auth Server', arrow: 'Auth Server → Browser', label: 'Redirect to redirect_uri#access_token=TOKEN', note: 'Token in URL fragment — visible in browser history' },
      { actor: 'Client', arrow: 'Browser (local)', label: 'Extract token from fragment via JS', note: 'No refresh token issued' },
    ],
  },
  client_credentials: {
    label: 'Client Credentials',
    description: 'Machine-to-machine (M2M) flow. No user involved — service authenticates with its own credentials to get a token.',
    steps: [
      { actor: 'Service', arrow: 'Service → Auth Server', label: 'POST /token { grant_type=client_credentials, client_id, client_secret, scope }', note: 'Service authenticates directly — no user redirect' },
      { actor: 'Auth Server', arrow: 'Auth Server → Service', label: '{ access_token, expires_in, token_type: "Bearer" }', note: 'No refresh token — request new token when expired' },
      { actor: 'Service', arrow: 'Service → API', label: 'GET /api/resource  Authorization: Bearer TOKEN', note: 'Use token for all API calls' },
    ],
  },
  device_code: {
    label: 'Device Code',
    description: 'For devices without a browser (smart TVs, CLIs). User authenticates on a separate device using a short code.',
    steps: [
      { actor: 'Device', arrow: 'Device → Auth Server', label: 'POST /device/code { client_id, scope }', note: 'Device requests authorization' },
      { actor: 'Auth Server', arrow: 'Auth Server → Device', label: '{ device_code, user_code: "ABCD-1234", verification_uri, expires_in }', note: 'user_code shown to user on device' },
      { actor: 'Device', arrow: 'Display → User', label: 'Show: "Visit example.com/activate — enter code ABCD-1234"', note: 'User opens URL on phone/PC' },
      { actor: 'User', arrow: 'Browser → Auth Server', label: 'Enter user_code + login + consent', note: 'User authenticates on secondary device' },
      { actor: 'Device', arrow: 'Device → Auth Server (polling)', label: 'POST /token { grant_type=device_code, device_code } (poll every 5s)', note: 'Device polls until user completes' },
      { actor: 'Auth Server', arrow: 'Auth Server → Device', label: '{ access_token, refresh_token }', note: 'Token returned after user authorizes' },
    ],
  },
};

const CODE_EXAMPLES: Record<FlowType, string> = {
  authorization_code: `// Step 1: Redirect to authorization URL
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('client_id', CLIENT_ID);
authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
authUrl.searchParams.set('scope', 'openid profile email');
authUrl.searchParams.set('state', crypto.randomUUID());
window.location.href = authUrl.toString();

// Step 2: Exchange code for tokens (server-side)
const res = await fetch('https://auth.example.com/token', {
  method: 'POST',
  body: new URLSearchParams({
    grant_type: 'authorization_code',
    code: req.query.code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
  }),
});
const tokens = await res.json();`,
  pkce: `// Generate PKCE pair
async function generatePKCE() {
  const verifier = crypto.randomUUID().replace(/-/g,'') + crypto.randomUUID().replace(/-/g,'');
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  const challenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=/g,'');
  return { verifier, challenge };
}

const { verifier, challenge } = await generatePKCE();
sessionStorage.setItem('pkce_verifier', verifier);

// Build auth URL with PKCE
authUrl.searchParams.set('code_challenge', challenge);
authUrl.searchParams.set('code_challenge_method', 'S256');

// Exchange code (send verifier, not challenge)
body.set('code_verifier', sessionStorage.getItem('pkce_verifier'));`,
  implicit: `// DEPRECATED — use PKCE instead
// Redirect to get token directly in fragment
const authUrl = new URL('https://auth.example.com/authorize');
authUrl.searchParams.set('response_type', 'token');
authUrl.searchParams.set('client_id', CLIENT_ID);
window.location.href = authUrl.toString();

// Extract token from URL fragment
const fragment = new URLSearchParams(window.location.hash.slice(1));
const token = fragment.get('access_token');
// ⚠️ No refresh token. Token in browser history.`,
  client_credentials: `// Machine-to-machine authentication
const res = await fetch('https://auth.example.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    scope: 'api:read api:write',
  }),
});
const { access_token, expires_in } = await res.json();

// Use token
const apiRes = await fetch('https://api.example.com/data', {
  headers: { Authorization: \`Bearer \${access_token}\` },
});`,
  device_code: `// Step 1: Request device code
const { device_code, user_code, verification_uri, interval } =
  await fetch('https://auth.example.com/device/code', {
    method: 'POST',
    body: new URLSearchParams({ client_id: CLIENT_ID, scope: 'openid' }),
  }).then(r => r.json());

console.log(\`Visit \${verification_uri} and enter: \${user_code}\`);

// Step 2: Poll for token
const pollForToken = async () => {
  const res = await fetch('https://auth.example.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth2:grant-type:device_code',
      device_code,
      client_id: CLIENT_ID,
    }),
  });
  const data = await res.json();
  if (data.access_token) return data;
  if (data.error === 'authorization_pending') {
    await new Promise(r => setTimeout(r, interval * 1000));
    return pollForToken();
  }
  throw new Error(data.error);
};`,
};

export default function OAuth2FlowVisualizer() {
  const [flow, setFlow] = useState<FlowType>('authorization_code');
  const [showCode, setShowCode] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);

  const flowDef = FLOWS[flow];

  function copy() {
    navigator.clipboard.writeText(CODE_EXAMPLES[flow]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const ACTOR_COLORS: Record<string, string> = {
    'User': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Auth Server': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'App Server': 'bg-green-500/20 text-green-300 border-green-500/30',
    'Client': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'Service': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Device': 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
    'Browser': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  };

  function actorColor(actor: string): string {
    return ACTOR_COLORS[actor] || 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }

  return (
    <div class="space-y-6">
      {/* Flow selector */}
      <div>
        <label class="block text-sm font-medium mb-2">OAuth2 Flow Type</label>
        <div class="flex flex-wrap gap-2">
          {(Object.entries(FLOWS) as [FlowType, typeof FLOWS[FlowType]][]).map(([key, def]) => (
            <button
              key={key}
              onClick={() => { setFlow(key); setActiveStep(null); }}
              class={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${flow === key ? 'bg-primary text-white' : 'bg-bg border border-border text-text hover:border-primary'}`}
            >
              {def.label}
              {key === 'implicit' && <span class="ml-1 text-xs opacity-70">(deprecated)</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p>{flowDef.description}</p>
      </div>

      {/* Step diagram */}
      <div>
        <label class="block text-sm font-medium mb-3">Flow Steps — click a step to expand</label>
        <div class="space-y-1">
          {flowDef.steps.map((step, i) => (
            <div
              key={i}
              onClick={() => setActiveStep(activeStep === i ? null : i)}
              class={`cursor-pointer rounded-xl border transition-all ${activeStep === i ? 'border-primary bg-primary/5' : 'border-border bg-bg hover:border-primary/40'}`}
            >
              <div class="flex items-start gap-3 p-3">
                <span class={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${activeStep === i ? 'bg-primary text-white' : 'bg-surface text-text-muted'}`}>
                  {i + 1}
                </span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-1">
                    <span class={`text-xs px-2 py-0.5 rounded-full border ${actorColor(step.actor)}`}>{step.actor}</span>
                    <span class="text-xs text-text-muted">→</span>
                    <span class="text-xs text-text-muted">{step.arrow.split('→')[1]?.trim()}</span>
                  </div>
                  <code class="text-xs font-mono text-primary break-all">{step.label}</code>
                  {activeStep === i && (
                    <p class="text-sm text-text-muted mt-2 border-t border-border/50 pt-2">{step.note}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Token explanation */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        {[
          { name: 'Access Token', desc: 'Short-lived (15min–1h). Sent with every API request as Bearer token. JWT or opaque string.', color: 'green' },
          { name: 'Refresh Token', desc: 'Long-lived (days/weeks). Used to get new access tokens. Store securely — treat like a password.', color: 'blue' },
          { name: 'ID Token (OIDC)', desc: 'JWT containing user identity claims (sub, email, name). For authentication, not authorization.', color: 'purple' },
        ].map(({ name, desc, color }) => (
          <div key={name} class={`p-3 rounded-xl bg-${color}-500/5 border border-${color}-500/20`}>
            <p class={`text-xs font-semibold text-${color}-400 mb-1`}>{name}</p>
            <p class="text-xs text-text-muted">{desc}</p>
          </div>
        ))}
      </div>

      {/* Code example */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <button
            onClick={() => setShowCode(s => !s)}
            class="text-sm font-medium text-primary hover:underline"
          >
            {showCode ? '▼' : '▶'} JavaScript Code Example
          </button>
          {showCode && (
            <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          )}
        </div>
        {showCode && (
          <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{CODE_EXAMPLES[flow]}</pre>
        )}
      </div>
    </div>
  );
}
