import { useState } from 'preact/hooks';

type FlowType = 'authorization_code' | 'implicit' | 'client_credentials' | 'device_code';

interface FlowStep {
  id: number;
  actor: string;
  actorColor: string;
  title: string;
  summary: string;
  direction?: string;
  request?: string;
  response?: string;
  note?: string;
}

interface Flow {
  name: string;
  badge?: string;
  description: string;
  useCases: string[];
  steps: FlowStep[];
}

const FLOWS: Record<FlowType, Flow> = {
  authorization_code: {
    name: 'Authorization Code',
    description: 'The most secure and most common OAuth 2.0 flow. The authorization server issues a short-lived code that the client exchanges for tokens server-side — access tokens are never exposed in the browser.',
    useCases: ['Web apps with a backend', 'Mobile apps (with PKCE)', 'Any confidential client'],
    steps: [
      {
        id: 1,
        actor: 'User → Client',
        actorColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        title: 'User initiates login',
        summary: 'User clicks "Login with Provider". Client builds the authorization URL and redirects the browser.',
        direction: 'Client → Auth Server (redirect)',
        request: `GET /authorize HTTP/1.1
Host: auth.example.com

?response_type=code
&client_id=your_client_id
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&scope=openid%20profile%20email
&state=xK9mP2rTqLvN          ← CSRF protection, random value
&code_challenge=E9Melhoa...  ← PKCE (recommended)
&code_challenge_method=S256`,
        note: 'The state parameter MUST be validated on return to prevent CSRF attacks. PKCE (RFC 7636) is strongly recommended even for confidential clients.',
      },
      {
        id: 2,
        actor: 'User → Auth Server',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'User authenticates',
        summary: 'The authorization server shows a login page. The user enters their credentials and (optionally) grants consent to the requested scopes.',
        direction: 'Auth Server UI',
        request: `Auth server presents:
• Login form (username + password, SSO, passkeys, etc.)
• Consent screen listing requested scopes:
  - openid: Verify your identity
  - profile: Read your name and avatar
  - email: Read your email address

User clicks "Allow" or "Authorize".`,
        note: 'If the user previously authorized the same scopes, many providers skip the consent screen (prompt=none).',
      },
      {
        id: 3,
        actor: 'Auth Server → Client',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'Auth server issues authorization code',
        summary: 'The auth server redirects the user back to the client\'s redirect_uri with a short-lived authorization code.',
        direction: 'Auth Server → Client (redirect)',
        request: `HTTP/1.1 302 Found
Location: https://app.example.com/callback
  ?code=SplxlOBeZQQYbYS6WxSbIA   ← short-lived, one-time code
  &state=xK9mP2rTqLvN            ← must match what you sent`,
        note: 'The code typically expires in 30–60 seconds and is single-use. The client MUST verify state matches.',
      },
      {
        id: 4,
        actor: 'Client → Auth Server',
        actorColor: 'bg-green-500/15 text-green-400 border-green-500/30',
        title: 'Client exchanges code for tokens',
        summary: 'The client backend POSTs the authorization code to the token endpoint along with its credentials.',
        direction: 'Client Backend → Auth Server (server-to-server)',
        request: `POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=authorization_code
&code=SplxlOBeZQQYbYS6WxSbIA
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&code_verifier=dBjftJeZ4CVP-mB92K27uhbUJU1p1r_...  ← PKCE`,
        note: 'This request is server-to-server — the client secret never touches the browser.',
      },
      {
        id: 5,
        actor: 'Auth Server → Client',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'Auth server returns tokens',
        summary: 'The auth server validates the code and credentials, then returns the access token, refresh token, and ID token.',
        direction: 'Auth Server → Client (JSON response)',
        response: `HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8",
  "id_token": "eyJhbGciOiJSUzI1NiJ9...",  ← OpenID Connect
  "scope": "openid profile email"
}`,
        note: 'Store the refresh_token securely (HttpOnly cookie or encrypted server-side). Never expose it to client-side JS.',
      },
      {
        id: 6,
        actor: 'Client → Resource Server',
        actorColor: 'bg-green-500/15 text-green-400 border-green-500/30',
        title: 'Client calls API with access token',
        summary: 'The client includes the access token in the Authorization header for subsequent API requests.',
        direction: 'Client → Resource Server (API call)',
        request: `GET /api/user/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...`,
        response: `HTTP/1.1 200 OK
Content-Type: application/json

{
  "id": "usr_01HX",
  "name": "Jane Developer",
  "email": "jane@example.com"
}`,
        note: 'When the access token expires, use the refresh_token to obtain a new one via grant_type=refresh_token.',
      },
    ],
  },

  implicit: {
    name: 'Implicit (Deprecated)',
    badge: 'Deprecated',
    description: 'The Implicit flow skips the code exchange step — the access token is returned directly in the redirect URI fragment. It was designed for browser-only apps but is now deprecated because tokens are exposed in browser history and referrer headers. Use Authorization Code + PKCE instead.',
    useCases: ['Legacy SPAs (do not use for new projects)', 'Superseded by Authorization Code + PKCE'],
    steps: [
      {
        id: 1,
        actor: 'Client → Auth Server',
        actorColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        title: 'Client redirects to /authorize with response_type=token',
        summary: 'The SPA redirects the browser to the authorization server with response_type=token.',
        direction: 'Browser → Auth Server (redirect)',
        request: `GET /authorize HTTP/1.1
Host: auth.example.com

?response_type=token          ← key difference: token, not code
&client_id=spa_client_id
&redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback
&scope=profile%20email
&state=randomState123`,
        note: 'No client secret is used. No PKCE support in the original spec.',
      },
      {
        id: 2,
        actor: 'User → Auth Server',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'User logs in and grants consent',
        summary: 'User authenticates with the authorization server and approves the requested scopes.',
        direction: 'Auth Server UI',
        request: `Auth server shows login + consent screen.
User authenticates and clicks "Allow".`,
      },
      {
        id: 3,
        actor: 'Auth Server → Browser',
        actorColor: 'bg-red-500/15 text-red-400 border-red-500/30',
        title: 'Access token returned in URL fragment (INSECURE)',
        summary: 'The access token is embedded directly in the redirect URL hash — visible in browser history, referrer headers, and browser extensions.',
        direction: 'Auth Server → Browser (INSECURE redirect)',
        response: `HTTP/1.1 302 Found
Location: https://app.example.com/callback
  #access_token=eyJhbGciOiJSUzI1NiJ9...  ← TOKEN IN URL!
  &token_type=Bearer
  &expires_in=3600
  &state=randomState123`,
        note: 'SECURITY RISK: Token appears in browser history, server logs, and Referer headers. No refresh token is issued. RFC 9700 and OAuth 2.1 deprecate this flow entirely.',
      },
      {
        id: 4,
        actor: 'Client → Resource Server',
        actorColor: 'bg-green-500/15 text-green-400 border-green-500/30',
        title: 'Client uses token to call API',
        summary: 'The SPA extracts the token from the URL fragment and uses it for API calls.',
        direction: 'Browser → Resource Server',
        request: `// SPA reads token from hash (do not do this in new apps)
const token = new URLSearchParams(window.location.hash.slice(1))
  .get('access_token');

// API call
GET /api/profile HTTP/1.1
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...`,
        note: 'Use Authorization Code + PKCE instead. It\'s equally simple for SPAs but avoids token exposure in the URL.',
      },
    ],
  },

  client_credentials: {
    name: 'Client Credentials',
    description: 'Machine-to-machine (M2M) flow — no user involved. The client authenticates directly with the auth server using its client ID and secret and receives an access token. Used for backend services, daemons, and microservices.',
    useCases: ['Backend microservices', 'Scheduled jobs / cron', 'CLI tools calling APIs', 'Server-to-server integrations'],
    steps: [
      {
        id: 1,
        actor: 'Client → Auth Server',
        actorColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        title: 'Client requests access token with its own credentials',
        summary: 'The service POSTs its client_id and client_secret directly to the token endpoint. No user redirect happens.',
        direction: 'Client → Auth Server (direct POST)',
        request: `POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded
Authorization: Basic base64(client_id:client_secret)

grant_type=client_credentials
&scope=api:read%20api:write`,
        note: 'Store the client_secret in environment variables or a secret manager — never hardcode or commit it.',
      },
      {
        id: 2,
        actor: 'Auth Server → Client',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'Auth server returns access token',
        summary: 'The auth server validates credentials and returns an access token. No refresh token is issued — just request a new token when this one expires.',
        direction: 'Auth Server → Client (JSON)',
        response: `HTTP/1.1 200 OK
Content-Type: application/json

{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "scope": "api:read api:write"
}

// Note: No refresh_token — simply re-request when expired`,
        note: 'Cache the token until it expires minus a small buffer (e.g. 60s) to avoid requesting a new token on every call.',
      },
      {
        id: 3,
        actor: 'Client → Resource Server',
        actorColor: 'bg-green-500/15 text-green-400 border-green-500/30',
        title: 'Client calls API with access token',
        summary: 'Use the Bearer token in all subsequent API requests.',
        direction: 'Client → Resource Server',
        request: `GET /api/v1/metrics HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJSUzI1NiJ9...`,
        response: `HTTP/1.1 200 OK
Content-Type: application/json

{
  "requests_today": 14203,
  "errors_today": 12,
  "uptime_percent": 99.97
}`,
        note: 'When the token expires, go back to step 1. Unlike Authorization Code flow, there is no user session to maintain.',
      },
    ],
  },

  device_code: {
    name: 'Device Code',
    description: 'Designed for input-constrained devices (smart TVs, CLI tools, IoT devices) that cannot open a browser. The device displays a code; the user enters it on a separate device (phone/laptop) to authenticate.',
    useCases: ['Smart TVs / streaming devices', 'CLI tools (GitHub CLI, AWS CLI)', 'IoT devices', 'Headless servers'],
    steps: [
      {
        id: 1,
        actor: 'Device → Auth Server',
        actorColor: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
        title: 'Device requests device code',
        summary: 'The device POSTs to the device authorization endpoint to start the flow.',
        direction: 'Device → Auth Server',
        request: `POST /device/code HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

client_id=device_client_id
&scope=openid%20profile`,
        response: `HTTP/1.1 200 OK
Content-Type: application/json

{
  "device_code": "GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS",
  "user_code": "WDJB-MJHT",          ← short code shown to user
  "verification_uri": "https://example.com/device",
  "verification_uri_complete": "https://example.com/device?user_code=WDJB-MJHT",
  "expires_in": 1800,                ← 30 minutes
  "interval": 5                      ← poll every 5 seconds
}`,
        note: 'The interval field tells the device how often to poll. Polling faster than this will return a slow_down error.',
      },
      {
        id: 2,
        actor: 'Device → User',
        actorColor: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
        title: 'Device shows instructions to user',
        summary: 'The device displays the verification URL and user code. The user opens the URL on their phone or laptop.',
        direction: 'Device UI',
        request: `Device screen shows:

  ┌─────────────────────────────────────────┐
  │ To sign in, visit:                      │
  │   https://example.com/device           │
  │                                         │
  │ Enter this code: WDJB-MJHT             │
  │                                         │
  │ Code expires in 30 minutes              │
  └─────────────────────────────────────────┘

(Or scan QR code from verification_uri_complete)`,
        note: 'Make the user_code easy to type — 8 characters, no ambiguous chars (0/O, l/1). Some devices show a QR code for the complete URI.',
      },
      {
        id: 3,
        actor: 'User → Auth Server',
        actorColor: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
        title: 'User authenticates on secondary device',
        summary: 'The user opens the URL on their phone/laptop, enters the code, authenticates, and grants consent.',
        direction: 'Browser (phone/laptop) → Auth Server',
        request: `User on phone/laptop:
1. Navigates to https://example.com/device
2. Enters code: WDJB-MJHT
3. Auth server shows login form + consent screen
4. User logs in and clicks "Allow"

Auth server marks device_code as authorized.`,
        note: 'The user can be on a completely separate device and network from the TV/CLI — only the user_code links them.',
      },
      {
        id: 4,
        actor: 'Device ↔ Auth Server',
        actorColor: 'bg-green-500/15 text-green-400 border-green-500/30',
        title: 'Device polls for token',
        summary: 'While the user is authenticating, the device polls the token endpoint at the specified interval until it receives tokens or the code expires.',
        direction: 'Device → Auth Server (repeated polling)',
        request: `// Poll every {interval} seconds:
POST /token HTTP/1.1
Host: auth.example.com
Content-Type: application/x-www-form-urlencoded

grant_type=urn:ietf:params:oauth:grant-type:device_code
&device_code=GmRhmhcxhwAzkoEqiMEg_DnyEysNkuNhszIySk9eS
&client_id=device_client_id`,
        response: `// While user hasn't authorized yet:
HTTP/1.1 400 Bad Request
{ "error": "authorization_pending" }

// If polling too fast:
{ "error": "slow_down" }   ← increase interval by 5s

// After user authorizes:
HTTP/1.1 200 OK
{
  "access_token": "eyJhbGciOiJSUzI1NiJ9...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "8xLOxBtZp8"
}`,
        note: 'Handle slow_down by increasing the poll interval by 5 seconds. Stop polling if you receive access_denied or expired_token.',
      },
    ],
  },
};

const FLOW_OPTIONS: { id: FlowType; label: string; badge?: string }[] = [
  { id: 'authorization_code', label: 'Authorization Code' },
  { id: 'implicit', label: 'Implicit', badge: 'Deprecated' },
  { id: 'client_credentials', label: 'Client Credentials' },
  { id: 'device_code', label: 'Device Code' },
];

export default function OAuthFlowVisualizer() {
  const [selectedFlow, setSelectedFlow] = useState<FlowType>('authorization_code');
  const [activeStep, setActiveStep] = useState<number>(1);

  const flow = FLOWS[selectedFlow];
  const step = flow.steps.find(s => s.id === activeStep) ?? flow.steps[0];

  const handleFlowChange = (id: FlowType) => {
    setSelectedFlow(id);
    setActiveStep(1);
  };

  return (
    <div class="space-y-6">
      {/* Flow selector */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {FLOW_OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => handleFlowChange(opt.id)}
            class={`relative px-3 py-3 rounded-xl border text-sm font-medium text-left transition-colors ${
              selectedFlow === opt.id
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-surface text-text-muted hover:border-primary/50 hover:text-text'
            }`}
          >
            {opt.label}
            {opt.badge && (
              <span class="absolute top-1.5 right-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
                {opt.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Flow description */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <div class="flex items-center gap-2 mb-2">
          <h2 class="font-semibold text-text">{flow.name} Flow</h2>
          {flow.badge && (
            <span class="text-xs px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 border border-red-500/30 font-semibold">
              {flow.badge}
            </span>
          )}
        </div>
        <p class="text-sm text-text-muted leading-relaxed mb-3">{flow.description}</p>
        <div>
          <span class="text-xs font-medium text-text-muted uppercase tracking-wide">Best for</span>
          <div class="flex flex-wrap gap-2 mt-1.5">
            {flow.useCases.map(uc => (
              <span key={uc} class="text-xs px-2.5 py-1 rounded-full bg-bg border border-border text-text-muted">{uc}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Two-column: stepper + detail */}
      <div class="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-4">
        {/* Vertical stepper */}
        <div class="space-y-1">
          {flow.steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(s.id)}
              class={`w-full flex items-start gap-3 px-3 py-3 rounded-xl border text-left transition-colors ${
                activeStep === s.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-surface hover:border-primary/40'
              }`}
            >
              <div class={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mt-0.5 ${
                activeStep === s.id ? 'bg-primary text-white' : 'bg-bg border border-border text-text-muted'
              }`}>
                {s.id}
              </div>
              <div class="min-w-0">
                <div class={`text-sm font-medium leading-snug ${activeStep === s.id ? 'text-primary' : 'text-text'}`}>
                  {s.title}
                </div>
                <div class={`text-xs mt-0.5 leading-snug ${activeStep === s.id ? 'text-primary/70' : 'text-text-muted'}`}>
                  <span class={`inline-block px-1.5 py-0.5 rounded text-[10px] border ${s.actorColor}`}>{s.actor}</span>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Step detail */}
        <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
          {/* Header */}
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class={`text-xs px-2 py-0.5 rounded border ${step.actorColor}`}>{step.actor}</span>
              {step.direction && (
                <span class="text-xs text-text-muted">{step.direction}</span>
              )}
            </div>
            <h3 class="text-lg font-semibold text-text">{step.title}</h3>
            <p class="text-sm text-text-muted mt-1 leading-relaxed">{step.summary}</p>
          </div>

          {/* Request */}
          {step.request && (
            <div>
              <div class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">
                {step.response ? 'Request / Code' : 'Request / Detail'}
              </div>
              <pre class="bg-bg border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto leading-relaxed whitespace-pre-wrap">{step.request}</pre>
            </div>
          )}

          {/* Response */}
          {step.response && (
            <div>
              <div class="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Response</div>
              <pre class="bg-bg border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto leading-relaxed whitespace-pre-wrap">{step.response}</pre>
            </div>
          )}

          {/* Note */}
          {step.note && (
            <div class="flex gap-2 bg-bg border border-border rounded-lg p-3">
              <span class="text-primary mt-0.5 flex-shrink-0">ℹ</span>
              <p class="text-xs text-text-muted leading-relaxed">{step.note}</p>
            </div>
          )}

          {/* Navigation */}
          <div class="flex items-center justify-between pt-2 border-t border-border">
            <button
              onClick={() => setActiveStep(s => Math.max(1, s - 1))}
              disabled={activeStep === 1}
              class="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span class="text-xs text-text-muted">Step {activeStep} of {flow.steps.length}</span>
            <button
              onClick={() => setActiveStep(s => Math.min(flow.steps.length, s + 1))}
              disabled={activeStep === flow.steps.length}
              class="px-4 py-2 text-sm border border-border rounded-lg text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {/* Quick comparison */}
      <div class="bg-surface border border-border rounded-xl p-5">
        <h3 class="font-semibold text-text mb-3">Quick Flow Comparison</h3>
        <div class="overflow-x-auto">
          <table class="w-full text-xs text-left">
            <thead>
              <tr class="border-b border-border">
                <th class="pb-2 pr-4 text-text-muted font-medium">Flow</th>
                <th class="pb-2 pr-4 text-text-muted font-medium">User involved?</th>
                <th class="pb-2 pr-4 text-text-muted font-medium">Refresh token?</th>
                <th class="pb-2 pr-4 text-text-muted font-medium">Client secret?</th>
                <th class="pb-2 text-text-muted font-medium">Use for</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-border">
              <tr class={selectedFlow === 'authorization_code' ? 'bg-primary/5' : ''}>
                <td class="py-2 pr-4 font-medium text-text">Authorization Code</td>
                <td class="py-2 pr-4 text-green-400">Yes</td>
                <td class="py-2 pr-4 text-green-400">Yes</td>
                <td class="py-2 pr-4 text-green-400">Recommended</td>
                <td class="py-2 text-text-muted">Web/mobile apps with backend</td>
              </tr>
              <tr class={selectedFlow === 'implicit' ? 'bg-primary/5' : ''}>
                <td class="py-2 pr-4 font-medium text-text">Implicit</td>
                <td class="py-2 pr-4 text-green-400">Yes</td>
                <td class="py-2 pr-4 text-red-400">No</td>
                <td class="py-2 pr-4 text-red-400">No</td>
                <td class="py-2 text-text-muted">Deprecated — use Auth Code + PKCE</td>
              </tr>
              <tr class={selectedFlow === 'client_credentials' ? 'bg-primary/5' : ''}>
                <td class="py-2 pr-4 font-medium text-text">Client Credentials</td>
                <td class="py-2 pr-4 text-red-400">No</td>
                <td class="py-2 pr-4 text-red-400">No</td>
                <td class="py-2 pr-4 text-green-400">Yes</td>
                <td class="py-2 text-text-muted">Machine-to-machine (M2M)</td>
              </tr>
              <tr class={selectedFlow === 'device_code' ? 'bg-primary/5' : ''}>
                <td class="py-2 pr-4 font-medium text-text">Device Code</td>
                <td class="py-2 pr-4 text-green-400">Yes (separate device)</td>
                <td class="py-2 pr-4 text-green-400">Yes</td>
                <td class="py-2 pr-4 text-text-muted">Optional</td>
                <td class="py-2 text-text-muted">TVs, CLIs, IoT</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
