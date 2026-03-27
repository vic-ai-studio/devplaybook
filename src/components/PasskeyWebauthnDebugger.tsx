import { useState } from 'preact/hooks';

function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64url(hex: string): string {
  // hex -> bytes -> base64url
  const bytes = new Uint8Array(hex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
  let bin = '';
  bytes.forEach(b => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

interface RegistrationStep {
  step: number;
  name: string;
  actor: 'Client' | 'Server' | 'Authenticator';
  browserDoes: string;
  serverExpects: string;
  example: string;
}

interface AuthStep {
  step: number;
  name: string;
  actor: 'Client' | 'Server' | 'Authenticator';
  browserDoes: string;
  serverExpects: string;
  example: string;
}

const REGISTRATION_STEPS: RegistrationStep[] = [
  {
    step: 1,
    name: 'Client initiates registration',
    actor: 'Client',
    browserDoes: 'User clicks "Register with Passkey". The app calls your server to get a challenge and options.',
    serverExpects: 'POST /webauthn/registration/start with user identifier.',
    example: JSON.stringify({ userId: 'usr_abc123', username: 'alice@example.com' }, null, 2),
  },
  {
    step: 2,
    name: 'Server returns creation options',
    actor: 'Server',
    browserDoes: 'Browser receives PublicKeyCredentialCreationOptions including challenge, rp, user, pubKeyCredParams.',
    serverExpects: 'Server generates a random challenge (≥16 bytes), stores it in session, returns options JSON.',
    example: JSON.stringify({
      challenge: '<base64url-random-16-bytes>',
      rp: { id: 'example.com', name: 'Example App' },
      user: { id: '<base64url-user-id>', name: 'alice@example.com', displayName: 'Alice' },
      pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
      authenticatorSelection: { residentKey: 'required', userVerification: 'preferred' },
      timeout: 60000,
    }, null, 2),
  },
  {
    step: 3,
    name: 'navigator.credentials.create() called',
    actor: 'Client',
    browserDoes: 'Browser calls navigator.credentials.create({ publicKey: options }). OS prompts user (FaceID, TouchID, PIN, or security key).',
    serverExpects: 'Nothing yet — waiting for browser to return credential.',
    example: `// Browser call
const credential = await navigator.credentials.create({
  publicKey: creationOptions
});`,
  },
  {
    step: 4,
    name: 'Authenticator creates key pair',
    actor: 'Authenticator',
    browserDoes: 'Platform authenticator generates a new asymmetric key pair (usually P-256). Private key stored in secure enclave. Public key returned.',
    serverExpects: 'Public key, credential ID, attestation object, and client data JSON.',
    example: JSON.stringify({
      id: '<base64url-credential-id>',
      rawId: '<ArrayBuffer>',
      type: 'public-key',
      response: {
        clientDataJSON: '<base64url: {type, challenge, origin}>',
        attestationObject: '<base64url: CBOR-encoded attestation>',
      },
    }, null, 2),
  },
  {
    step: 5,
    name: 'Client sends credential to server',
    actor: 'Client',
    browserDoes: 'App serializes the PublicKeyCredential and POSTs it to the server registration endpoint.',
    serverExpects: 'POST /webauthn/registration/finish with credential JSON.',
    example: JSON.stringify({
      id: 'AbCdEfGh1234...',
      type: 'public-key',
      response: {
        clientDataJSON: 'eyJ0eXBlIjoiY...',
        attestationObject: 'o2NmbXRkbm9uZ...',
      },
    }, null, 2),
  },
  {
    step: 6,
    name: 'Server verifies and stores credential',
    actor: 'Server',
    browserDoes: 'Browser waits for server confirmation.',
    serverExpects: 'Server must: (1) decode clientDataJSON and verify type="webauthn.create", origin, and challenge match session. (2) Parse attestation object. (3) Extract and store public key + credential ID linked to the user.',
    example: JSON.stringify({
      verified: true,
      credentialId: 'AbCdEfGh1234...',
      publicKey: '<COSE-encoded public key stored in DB>',
      counter: 0,
      aaguid: '00000000-0000-0000-0000-000000000000',
    }, null, 2),
  },
];

const AUTH_STEPS: AuthStep[] = [
  {
    step: 1,
    name: 'Client initiates authentication',
    actor: 'Client',
    browserDoes: 'User clicks "Sign in with Passkey". App calls server for a new challenge.',
    serverExpects: 'POST /webauthn/authentication/start with optional user identifier.',
    example: JSON.stringify({ username: 'alice@example.com' }, null, 2),
  },
  {
    step: 2,
    name: 'Server returns request options',
    actor: 'Server',
    browserDoes: 'Browser receives PublicKeyCredentialRequestOptions with a fresh challenge and allowed credentials.',
    serverExpects: 'Server generates new random challenge, stores in session, returns allowCredentials listing registered credential IDs for this user.',
    example: JSON.stringify({
      challenge: '<base64url-random-16-bytes>',
      allowCredentials: [{ type: 'public-key', id: 'AbCdEfGh1234...' }],
      userVerification: 'preferred',
      timeout: 60000,
      rpId: 'example.com',
    }, null, 2),
  },
  {
    step: 3,
    name: 'navigator.credentials.get() called',
    actor: 'Client',
    browserDoes: 'Browser calls navigator.credentials.get({ publicKey: options }). OS shows passkey selector or prompts biometric/PIN.',
    serverExpects: 'Nothing yet — waiting for assertion response.',
    example: `// Browser call
const assertion = await navigator.credentials.get({
  publicKey: requestOptions
});`,
  },
  {
    step: 4,
    name: 'Authenticator signs assertion',
    actor: 'Authenticator',
    browserDoes: 'Platform authenticator looks up private key by credential ID, signs authenticatorData + clientDataHash with private key. Returns assertion.',
    serverExpects: 'Signed assertion: authenticatorData, clientDataJSON, signature, and user handle.',
    example: JSON.stringify({
      id: 'AbCdEfGh1234...',
      type: 'public-key',
      response: {
        clientDataJSON: '<base64url>',
        authenticatorData: '<base64url: rpIdHash + flags + counter>',
        signature: '<base64url: ECDSA signature>',
        userHandle: '<base64url: user.id>',
      },
    }, null, 2),
  },
  {
    step: 5,
    name: 'Client sends assertion to server',
    actor: 'Client',
    browserDoes: 'App POSTs the assertion to the server authentication endpoint.',
    serverExpects: 'POST /webauthn/authentication/finish with assertion JSON.',
    example: JSON.stringify({
      id: 'AbCdEfGh1234...',
      type: 'public-key',
      response: {
        authenticatorData: 'SZYN5YgOjGh...',
        clientDataJSON: 'eyJ0eXBlIjoiY...',
        signature: 'MEYCIQDk3B...',
        userHandle: 'dXNyX2FiYzEyMw==',
      },
    }, null, 2),
  },
  {
    step: 6,
    name: 'Server verifies signature',
    actor: 'Server',
    browserDoes: 'Browser waits for sign-in confirmation.',
    serverExpects: 'Server must: (1) Decode clientDataJSON — verify type="webauthn.get", challenge matches session, origin matches. (2) Hash clientDataJSON (SHA-256) → clientDataHash. (3) Concatenate authenticatorData + clientDataHash. (4) Verify ECDSA signature with stored public key. (5) Check counter > stored counter to detect cloning. (6) Update stored counter. Session established.',
    example: JSON.stringify({
      verified: true,
      userId: 'usr_abc123',
      credentialId: 'AbCdEfGh1234...',
      newCounter: 42,
    }, null, 2),
  },
];

const ACTOR_COLOR: Record<string, string> = {
  Client: 'bg-blue-500/10 border-blue-500/30 text-blue-500',
  Server: 'bg-green-500/10 border-green-500/30 text-green-500',
  Authenticator: 'bg-purple-500/10 border-purple-500/30 text-purple-500',
};

export default function PasskeyWebauthnDebugger() {
  const [mainTab, setMainTab] = useState<'registration' | 'authentication' | 'builder'>('registration');
  const [openStep, setOpenStep] = useState<number | null>(1);

  // Credential options builder state
  const [rpId, setRpId] = useState('example.com');
  const [rpName, setRpName] = useState('My App');
  const [userName, setUserName] = useState('alice@example.com');
  const [displayName, setDisplayName] = useState('Alice');
  const [challenge, setChallenge] = useState(randomHex(16));
  const [residentKey, setResidentKey] = useState<'required' | 'preferred' | 'discouraged'>('required');
  const [userVerification, setUserVerification] = useState<'required' | 'preferred' | 'discouraged'>('preferred');
  const [timeout, setTimeout_] = useState(60000);
  const [copied, setCopied] = useState(false);

  function refreshChallenge() {
    setChallenge(randomHex(16));
  }

  const creationOptions = {
    challenge: toBase64url(challenge),
    rp: { id: rpId, name: rpName },
    user: {
      id: toBase64url(randomHex(8)),
      name: userName,
      displayName: displayName,
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 },
      { type: 'public-key', alg: -257 },
    ],
    authenticatorSelection: {
      residentKey,
      userVerification,
    },
    timeout,
    attestation: 'none',
  };

  const optionsJson = JSON.stringify(creationOptions, null, 2);

  function copyOptions() {
    navigator.clipboard.writeText(optionsJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const steps = mainTab === 'registration' ? REGISTRATION_STEPS : AUTH_STEPS;

  return (
    <div class="space-y-4">
      {/* Main tabs */}
      <div class="flex items-center gap-2 flex-wrap">
        {(['registration', 'authentication', 'builder'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setMainTab(tab); setOpenStep(1); }}
            class={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors capitalize ${
              mainTab === tab
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'border-border text-text-muted hover:bg-surface'
            }`}
          >
            {tab === 'registration' ? 'Registration Flow' : tab === 'authentication' ? 'Authentication Flow' : 'Options Builder'}
          </button>
        ))}
      </div>

      {mainTab !== 'builder' && (
        <div class="space-y-2">
          <div class="flex items-center gap-4 text-xs text-text-muted flex-wrap mb-1">
            <span class="flex items-center gap-1.5"><span class="px-1.5 py-0.5 rounded border bg-blue-500/10 border-blue-500/30 text-blue-500">Client</span>Browser/App</span>
            <span class="flex items-center gap-1.5"><span class="px-1.5 py-0.5 rounded border bg-green-500/10 border-green-500/30 text-green-500">Server</span>Your backend</span>
            <span class="flex items-center gap-1.5"><span class="px-1.5 py-0.5 rounded border bg-purple-500/10 border-purple-500/30 text-purple-500">Authenticator</span>Platform / hardware key</span>
          </div>

          {steps.map(s => (
            <div key={s.step} class="bg-surface border border-border rounded-lg overflow-hidden">
              <button
                class="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-alt transition-colors"
                onClick={() => setOpenStep(openStep === s.step ? null : s.step)}
              >
                <span class="flex-shrink-0 w-6 h-6 rounded-full bg-accent/20 text-accent text-xs font-bold flex items-center justify-center">
                  {s.step}
                </span>
                <span class="font-medium text-sm flex-1">{s.name}</span>
                <span class={`text-xs px-2 py-0.5 rounded border flex-shrink-0 ${ACTOR_COLOR[s.actor]}`}>
                  {s.actor}
                </span>
                <span class="text-text-muted text-xs ml-1">{openStep === s.step ? '▲' : '▼'}</span>
              </button>

              {openStep === s.step && (
                <div class="border-t border-border px-4 py-3 space-y-3">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Browser / Client does</div>
                      <p class="text-sm text-text">{s.browserDoes}</p>
                    </div>
                    <div>
                      <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Server expects</div>
                      <p class="text-sm text-text">{s.serverExpects}</p>
                    </div>
                  </div>
                  <div>
                    <div class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Example</div>
                    <pre class="font-mono text-xs bg-surface-alt border border-border rounded p-3 overflow-auto max-h-48 whitespace-pre">
{s.example}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {mainTab === 'builder' && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: inputs */}
          <div class="space-y-3">
            <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div class="text-sm font-semibold">Relying Party</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-text-muted mb-1">RP ID (domain)</label>
                  <input
                    type="text"
                    class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={rpId}
                    onInput={(e) => setRpId((e.target as HTMLInputElement).value)}
                    placeholder="example.com"
                  />
                </div>
                <div>
                  <label class="block text-xs text-text-muted mb-1">RP Name</label>
                  <input
                    type="text"
                    class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={rpName}
                    onInput={(e) => setRpName((e.target as HTMLInputElement).value)}
                    placeholder="My App"
                  />
                </div>
              </div>
            </div>

            <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div class="text-sm font-semibold">User</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-text-muted mb-1">Username / email</label>
                  <input
                    type="text"
                    class="w-full font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={userName}
                    onInput={(e) => setUserName((e.target as HTMLInputElement).value)}
                  />
                </div>
                <div>
                  <label class="block text-xs text-text-muted mb-1">Display name</label>
                  <input
                    type="text"
                    class="w-full text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={displayName}
                    onInput={(e) => setDisplayName((e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
            </div>

            <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div class="text-sm font-semibold">Challenge</div>
              <div class="flex gap-2">
                <input
                  type="text"
                  class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={challenge}
                  onInput={(e) => setChallenge((e.target as HTMLInputElement).value)}
                />
                <button
                  onClick={refreshChallenge}
                  class="text-sm px-3 py-1.5 bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors flex-shrink-0"
                >
                  New
                </button>
              </div>
              <p class="text-xs text-text-muted">Hex string — will be Base64url-encoded in the options. Generate fresh on every registration attempt.</p>
            </div>

            <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
              <div class="text-sm font-semibold">Authenticator Selection</div>
              <div class="grid grid-cols-2 gap-2">
                <div>
                  <label class="block text-xs text-text-muted mb-1">Resident Key</label>
                  <select
                    class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={residentKey}
                    onChange={(e) => setResidentKey((e.target as HTMLSelectElement).value as any)}
                  >
                    <option value="required">required</option>
                    <option value="preferred">preferred</option>
                    <option value="discouraged">discouraged</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-text-muted mb-1">User Verification</label>
                  <select
                    class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={userVerification}
                    onChange={(e) => setUserVerification((e.target as HTMLSelectElement).value as any)}
                  >
                    <option value="required">required</option>
                    <option value="preferred">preferred</option>
                    <option value="discouraged">discouraged</option>
                  </select>
                </div>
              </div>
              <div>
                <label class="block text-xs text-text-muted mb-1">Timeout (ms)</label>
                <input
                  type="number"
                  class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={timeout}
                  onInput={(e) => setTimeout_(Number((e.target as HTMLInputElement).value))}
                />
              </div>
            </div>
          </div>

          {/* Right: generated JSON */}
          <div class="space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-sm font-semibold">PublicKeyCredentialCreationOptions</span>
              <button
                onClick={copyOptions}
                class="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre class="w-full h-[520px] overflow-auto font-mono text-xs bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{optionsJson}
            </pre>
            <div class="text-xs text-text-muted space-y-1">
              <p><strong>alg -7</strong> = ES256 (P-256 ECDSA) — preferred for passkeys.</p>
              <p><strong>alg -257</strong> = RS256 (RSA-PKCS1-v1_5) — fallback for older security keys.</p>
              <p><strong>residentKey: required</strong> enables discoverable credentials (true passkeys — no username needed at sign-in).</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
