import { useState } from 'preact/hooks';

// ── Types ─────────────────────────────────────────────────────────────────────

type AttestationType = 'none' | 'indirect' | 'direct' | 'enterprise';
type AuthenticatorAttachment = 'platform' | 'cross-platform' | 'any';
type ResidentKey = 'required' | 'preferred' | 'discouraged';
type UserVerification = 'required' | 'preferred' | 'discouraged';
type OutputTab = 'registration' | 'authentication' | 'server';

// COSE algorithm identifiers
const ALG_MAP: Record<string, number> = {
  'ES256': -7,
  'RS256': -257,
  'Ed25519': -8,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateUserId(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toB64Url(hex: string): string {
  const bytes = hex.match(/.{2}/g)!.map(h => parseInt(h, 16));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function generateChallenge(): string {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return toB64Url(Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''));
}

function copyText(text: string, setCopied: (k: string | null) => void, key: string) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  });
}

// ── Output builders ───────────────────────────────────────────────────────────

function buildRegistrationOptions(cfg: Config): object {
  const algIds = cfg.algorithms.map(a => ({ alg: ALG_MAP[a], type: 'public-key' as const }));
  const opts: Record<string, unknown> = {
    challenge: generateChallenge(),
    rp: { id: cfg.rpId || 'example.com', name: cfg.rpName || 'Example App' },
    user: {
      id: toB64Url(cfg.userId || generateUserId()),
      name: cfg.username || 'alice@example.com',
      displayName: cfg.displayName || 'Alice Dev',
    },
    pubKeyCredParams: algIds,
    timeout: cfg.timeout,
    attestation: cfg.attestation,
    authenticatorSelection: {
      ...(cfg.authenticatorAttachment !== 'any' && { authenticatorAttachment: cfg.authenticatorAttachment }),
      residentKey: cfg.residentKey,
      requireResidentKey: cfg.residentKey === 'required',
      userVerification: cfg.userVerification,
    },
    extensions: {
      credProps: true,
    },
  };
  return opts;
}

function buildAuthenticationOptions(cfg: Config): object {
  return {
    challenge: generateChallenge(),
    rpId: cfg.rpId || 'example.com',
    timeout: cfg.timeout,
    userVerification: cfg.userVerification,
    allowCredentials: [],
  };
}

function buildServerSetup(cfg: Config): string {
  const algs = cfg.algorithms.join(', ');
  return `// Install: npm install @simplewebauthn/server
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';

// ── Registration ──────────────────────────────────────────────────────────────

export async function generateRegOptions(user: { id: string; name: string; displayName: string }) {
  const options = await generateRegistrationOptions({
    rpName: '${cfg.rpName || 'My App'}',
    rpID: '${cfg.rpId || 'example.com'}',
    userID: Buffer.from(user.id),
    userName: user.name,
    userDisplayName: user.displayName,
    timeout: ${cfg.timeout},
    attestationType: '${cfg.attestation}',
    authenticatorSelection: {${cfg.authenticatorAttachment !== 'any' ? `\n      authenticatorAttachment: '${cfg.authenticatorAttachment}',` : ''}
      residentKey: '${cfg.residentKey}',
      requireResidentKey: ${cfg.residentKey === 'required'},
      userVerification: '${cfg.userVerification}',
    },
    supportedAlgorithmIDs: [${cfg.algorithms.map(a => ALG_MAP[a]).join(', ')}], // ${algs}
    excludeCredentials: [], // Pass existing user credentials to prevent re-registration
  });

  // Store options.challenge in session (Redis, DB, etc.) keyed to user
  await saveChallenge(user.id, options.challenge);

  return options;
}

export async function verifyRegResponse(userId: string, response: unknown) {
  const expectedChallenge = await getChallenge(userId);

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin: 'https://${cfg.rpId || 'example.com'}',
    expectedRPID: '${cfg.rpId || 'example.com'}',
    requireUserVerification: ${cfg.userVerification === 'required'},
  });

  if (verification.verified && verification.registrationInfo) {
    // Save to DB: verification.registrationInfo.credentialPublicKey,
    //             verification.registrationInfo.credentialID,
    //             verification.registrationInfo.counter
    await saveCredential(userId, verification.registrationInfo);
  }

  return verification.verified;
}

// ── Authentication ─────────────────────────────────────────────────────────────

export async function generateAuthOptions(userId: string) {
  const userCredentials = await getUserCredentials(userId);

  const options = await generateAuthenticationOptions({
    rpID: '${cfg.rpId || 'example.com'}',
    timeout: ${cfg.timeout},
    userVerification: '${cfg.userVerification}',
    allowCredentials: userCredentials.map(cred => ({
      id: cred.credentialID,
      type: 'public-key',
    })),
  });

  await saveChallenge(userId, options.challenge);
  return options;
}

export async function verifyAuthResponse(userId: string, response: unknown) {
  const expectedChallenge = await getChallenge(userId);
  const credential = await getCredential(userId, response.id);

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge,
    expectedOrigin: 'https://${cfg.rpId || 'example.com'}',
    expectedRPID: '${cfg.rpId || 'example.com'}',
    authenticator: {
      credentialPublicKey: credential.publicKey,
      credentialID: credential.id,
      counter: credential.counter,
    },
    requireUserVerification: ${cfg.userVerification === 'required'},
  });

  if (verification.verified) {
    // Update counter to prevent replay attacks
    await updateCounter(credential.id, verification.authenticationInfo.newCounter);
  }

  return verification.verified;
}`;
}

// ── Config state ──────────────────────────────────────────────────────────────

interface Config {
  rpId: string;
  rpName: string;
  userId: string;
  username: string;
  displayName: string;
  algorithms: string[];
  attestation: AttestationType;
  authenticatorAttachment: AuthenticatorAttachment;
  residentKey: ResidentKey;
  userVerification: UserVerification;
  timeout: number;
}

const DEFAULT_CONFIG: Config = {
  rpId: 'example.com',
  rpName: 'My App',
  userId: '',
  username: 'alice@example.com',
  displayName: 'Alice Dev',
  algorithms: ['ES256', 'RS256'],
  attestation: 'none',
  authenticatorAttachment: 'platform',
  residentKey: 'preferred',
  userVerification: 'preferred',
  timeout: 60000,
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function PasskeyWebauthnConfig() {
  const [cfg, setCfg] = useState<Config>({ ...DEFAULT_CONFIG, userId: generateUserId() });
  const [activeTab, setActiveTab] = useState<OutputTab>('registration');
  const [copied, setCopied] = useState<string | null>(null);

  const update = <K extends keyof Config>(k: K, v: Config[K]) =>
    setCfg(prev => ({ ...prev, [k]: v }));

  const toggleAlg = (alg: string) => {
    setCfg(prev => {
      const has = prev.algorithms.includes(alg);
      if (has && prev.algorithms.length === 1) return prev; // keep at least one
      return { ...prev, algorithms: has ? prev.algorithms.filter(a => a !== alg) : [...prev.algorithms, alg] };
    });
  };

  const regOptions = buildRegistrationOptions(cfg);
  const authOptions = buildAuthenticationOptions(cfg);
  const serverCode = buildServerSetup(cfg);

  const outputContent = {
    registration: JSON.stringify(regOptions, null, 2),
    authentication: JSON.stringify(authOptions, null, 2),
    server: serverCode,
  };

  const currentOutput = outputContent[activeTab];

  const btnBase = 'px-3 py-1.5 text-xs font-medium rounded-md transition-colors';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* ── Left: Config form ── */}
      <div class="space-y-4">
        {/* RP Section */}
        <div class="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 class="text-sm font-semibold text-text uppercase tracking-wide">Relying Party (RP)</h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">RP ID (your domain)</label>
              <input
                type="text"
                value={cfg.rpId}
                onInput={e => update('rpId', (e.target as HTMLInputElement).value)}
                placeholder="example.com"
                class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p class="text-xs text-text-muted mt-1">Must match the domain of your site. Passkeys are scoped to this domain.</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">RP Name (display name)</label>
              <input
                type="text"
                value={cfg.rpName}
                onInput={e => update('rpName', (e.target as HTMLInputElement).value)}
                placeholder="My App"
                class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* User Section */}
        <div class="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 class="text-sm font-semibold text-text uppercase tracking-wide">User</h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-xs font-medium text-text-muted">User ID (unique, opaque)</label>
                <button
                  onClick={() => update('userId', generateUserId())}
                  class={`${btnBase} bg-surface-alt hover:bg-border text-text-muted`}>
                  Regenerate
                </button>
              </div>
              <input
                type="text"
                value={cfg.userId}
                onInput={e => update('userId', (e.target as HTMLInputElement).value)}
                class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <p class="text-xs text-text-muted mt-1">Must not contain PII. Use a random UUID or internal DB ID.</p>
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Username</label>
              <input
                type="text"
                value={cfg.username}
                onInput={e => update('username', (e.target as HTMLInputElement).value)}
                placeholder="alice@example.com"
                class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
            <div>
              <label class="block text-xs font-medium text-text-muted mb-1">Display Name</label>
              <input
                type="text"
                value={cfg.displayName}
                onInput={e => update('displayName', (e.target as HTMLInputElement).value)}
                placeholder="Alice Dev"
                class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>
          </div>
        </div>

        {/* Algorithms */}
        <div class="bg-surface border border-border rounded-xl p-5 space-y-3">
          <h3 class="text-sm font-semibold text-text uppercase tracking-wide">Algorithms (pubKeyCredParams)</h3>
          <div class="flex gap-2 flex-wrap">
            {Object.keys(ALG_MAP).map(alg => (
              <button
                key={alg}
                onClick={() => toggleAlg(alg)}
                class={`${btnBase} border ${cfg.algorithms.includes(alg) ? 'bg-accent text-white border-accent' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
                {alg} <span class="opacity-60">({ALG_MAP[alg]})</span>
              </button>
            ))}
          </div>
          <div class="text-xs text-text-muted space-y-1">
            <p><strong class="text-text">ES256 (-7)</strong> — ECDSA P-256. Recommended: smallest signatures, fast, broadly supported.</p>
            <p><strong class="text-text">RS256 (-257)</strong> — RSA PKCS#1 v1.5. Wider platform support but larger keys.</p>
            <p><strong class="text-text">Ed25519 (-8)</strong> — EdDSA. Fastest, most secure, but limited hardware authenticator support.</p>
          </div>
        </div>

        {/* Auth selection */}
        <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
          <h3 class="text-sm font-semibold text-text uppercase tracking-wide">Authenticator Selection</h3>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-2">Attestation Preference</label>
            <div class="flex flex-wrap gap-2">
              {(['none', 'indirect', 'direct', 'enterprise'] as AttestationType[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => update('attestation', opt)}
                  class={`${btnBase} border ${cfg.attestation === opt ? 'bg-accent text-white border-accent' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {cfg.attestation === 'none' && 'No attestation data collected. Best for consumer apps — highest compatibility.'}
              {cfg.attestation === 'indirect' && 'Attestation may be anonymized by the platform. Good balance of privacy and assurance.'}
              {cfg.attestation === 'direct' && 'Full attestation statement. Used for high-assurance scenarios (enterprise, government).'}
              {cfg.attestation === 'enterprise' && 'Enterprise attestation — includes device identifiers for managed device policies.'}
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-2">Authenticator Attachment</label>
            <div class="flex flex-wrap gap-2">
              {(['platform', 'cross-platform', 'any'] as AuthenticatorAttachment[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => update('authenticatorAttachment', opt)}
                  class={`${btnBase} border ${cfg.authenticatorAttachment === opt ? 'bg-accent text-white border-accent' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {cfg.authenticatorAttachment === 'platform' && 'Built-in authenticator: Face ID, Touch ID, Windows Hello. Creates device-bound passkeys.'}
              {cfg.authenticatorAttachment === 'cross-platform' && 'External authenticator: YubiKey, phone (hybrid QR). Good for hardware security keys.'}
              {cfg.authenticatorAttachment === 'any' && 'Allow both platform and cross-platform. Maximum compatibility.'}
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-2">Resident Key (Discoverable Credential)</label>
            <div class="flex flex-wrap gap-2">
              {(['required', 'preferred', 'discouraged'] as ResidentKey[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => update('residentKey', opt)}
                  class={`${btnBase} border ${cfg.residentKey === opt ? 'bg-accent text-white border-accent' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {cfg.residentKey === 'required' && 'Credential stored on authenticator — enables passwordless login without username. Required for passkeys.'}
              {cfg.residentKey === 'preferred' && 'Store if possible. Enables passkey UX when available, falls back to server-side credential list.'}
              {cfg.residentKey === 'discouraged' && 'Credential stored server-side (allowCredentials must be passed). Traditional 2FA flow.'}
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-2">User Verification</label>
            <div class="flex flex-wrap gap-2">
              {(['required', 'preferred', 'discouraged'] as UserVerification[]).map(opt => (
                <button
                  key={opt}
                  onClick={() => update('userVerification', opt)}
                  class={`${btnBase} border ${cfg.userVerification === opt ? 'bg-accent text-white border-accent' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
                  {opt}
                </button>
              ))}
            </div>
            <p class="text-xs text-text-muted mt-1">
              {cfg.userVerification === 'required' && 'PIN or biometric always required. Satisfies MFA by itself.'}
              {cfg.userVerification === 'preferred' && 'Verify if possible. Recommended for passkey sign-in.'}
              {cfg.userVerification === 'discouraged' && 'Skip user verification (presence only). For 2nd-factor scenarios where you already verified the user.'}
            </p>
          </div>

          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Timeout (ms)</label>
            <input
              type="number"
              value={cfg.timeout}
              onInput={e => update('timeout', parseInt((e.target as HTMLInputElement).value) || 60000)}
              min={1000}
              max={600000}
              step={1000}
              class="w-full bg-surface-alt text-text border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p class="text-xs text-text-muted mt-1">Recommended: 60000ms (60s) for registration, 120000ms (2 min) for authentication.</p>
          </div>
        </div>
      </div>

      {/* ── Right: Output ── */}
      <div class="space-y-4">
        <div class="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <h3 class="text-sm font-semibold text-text uppercase tracking-wide">Generated Config</h3>
            <button
              onClick={() => copyText(currentOutput, setCopied, 'output')}
              class={`${btnBase} border ${copied === 'output' ? 'bg-green-500/20 text-green-400 border-green-500/40' : 'bg-surface-alt text-text-muted border-border hover:border-accent'}`}>
              {copied === 'output' ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {/* Output tabs */}
          <div class="flex gap-1 border-b border-border">
            {([
              { id: 'registration' as OutputTab, label: 'Registration' },
              { id: 'authentication' as OutputTab, label: 'Authentication' },
              { id: 'server' as OutputTab, label: 'Server Setup' },
            ]).map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                class={`px-3 py-2 text-xs font-medium transition-colors border-b-2 ${activeTab === tab.id ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Output area */}
          <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre-wrap break-all">
            {currentOutput}
          </pre>

          {/* Tab-specific notes */}
          {activeTab === 'registration' && (
            <div class="text-xs text-text-muted space-y-1 bg-surface-alt rounded-lg p-3">
              <p class="font-medium text-text">Usage</p>
              <p>Pass this object to <code class="text-accent">navigator.credentials.create({'{ publicKey: options }'} )</code>. The <code class="text-accent">challenge</code> must be generated server-side and verified after the response. A new random challenge is generated each time you change a setting.</p>
            </div>
          )}
          {activeTab === 'authentication' && (
            <div class="text-xs text-text-muted space-y-1 bg-surface-alt rounded-lg p-3">
              <p class="font-medium text-text">Usage</p>
              <p>Pass this to <code class="text-accent">navigator.credentials.get({'{ publicKey: options }'} )</code>. For discoverable credentials (resident keys), <code class="text-accent">allowCredentials</code> can be empty — the authenticator will select the right credential automatically.</p>
            </div>
          )}
          {activeTab === 'server' && (
            <div class="text-xs text-text-muted space-y-1 bg-surface-alt rounded-lg p-3">
              <p class="font-medium text-text">@simplewebauthn/server</p>
              <p>The most popular Node.js WebAuthn library. Install: <code class="text-accent">npm install @simplewebauthn/server @simplewebauthn/types</code>. Implement <code class="text-accent">saveChallenge</code>, <code class="text-accent">getChallenge</code>, <code class="text-accent">saveCredential</code>, and <code class="text-accent">getUserCredentials</code> using your database.</p>
            </div>
          )}
        </div>

        {/* Summary card */}
        <div class="bg-surface-alt border border-border rounded-xl p-4 space-y-2 text-xs">
          <p class="font-medium text-text">Configuration Summary</p>
          <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
            <span>Domain:</span><span class="text-text font-mono">{cfg.rpId || 'example.com'}</span>
            <span>Algorithms:</span><span class="text-text">{cfg.algorithms.join(', ')}</span>
            <span>Attachment:</span><span class="text-text">{cfg.authenticatorAttachment}</span>
            <span>Resident Key:</span><span class="text-text">{cfg.residentKey}</span>
            <span>User Verification:</span><span class="text-text">{cfg.userVerification}</span>
            <span>Attestation:</span><span class="text-text">{cfg.attestation}</span>
            <span>Timeout:</span><span class="text-text">{(cfg.timeout / 1000).toFixed(0)}s</span>
            <span>Passkey-ready:</span>
            <span class={cfg.residentKey !== 'discouraged' && cfg.authenticatorAttachment !== 'cross-platform' ? 'text-green-400' : 'text-orange-400'}>
              {cfg.residentKey !== 'discouraged' && cfg.authenticatorAttachment !== 'cross-platform' ? 'Yes' : 'Partial (check resident key + attachment)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
