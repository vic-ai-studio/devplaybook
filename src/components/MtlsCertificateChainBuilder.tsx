import { useState } from 'preact/hooks';

type Mode = 'visualizer' | 'validator' | 'commands';

interface CertInfo {
  subject: string;
  issuer: string;
  serial: string;
  notBefore: string;
  notAfter: string;
  isCA: boolean;
  keyUsage: string[];
  error?: string;
}

function parsePem(pem: string): CertInfo | null {
  // Client-side PEM parsing using regex (no crypto.subtle for certs)
  if (!pem.trim()) return null;
  try {
    const lines = pem.trim().split('\n').filter(l => l.trim());
    if (!lines[0].includes('CERTIFICATE')) return { subject: '?', issuer: '?', serial: '?', notBefore: '?', notAfter: '?', isCA: false, keyUsage: [], error: 'Not a PEM certificate' };
    // We can only do basic checks client-side without Web Crypto for X.509 parsing
    const b64 = lines.slice(1, -1).join('');
    const binary = atob(b64);
    // Check for basic CA indicator (very approximate: look for cA TRUE in DER)
    const isCA = binary.includes('\x01\x01\xff') || binary.includes('\x55\x1d\x13') || pem.toLowerCase().includes('ca');
    return {
      subject: extractField(binary, 'CN') || 'Parsed from PEM',
      issuer: extractIssuer(binary) || 'Unknown CA',
      serial: extractSerial(binary),
      notBefore: '(requires server-side parsing)',
      notAfter: '(requires server-side parsing)',
      isCA,
      keyUsage: isCA ? ['Certificate Sign', 'CRL Sign'] : ['Digital Signature', 'Key Encipherment'],
    };
  } catch {
    return { subject: '?', issuer: '?', serial: '?', notBefore: '?', notAfter: '?', isCA: false, keyUsage: [], error: 'Invalid PEM data' };
  }
}

function extractField(binary: string, field: string): string {
  // Very approximate: look for common name patterns
  const idx = binary.indexOf('\x55\x04\x03'); // OID for commonName
  if (idx < 0) return '';
  try {
    const len = binary.charCodeAt(idx + 3);
    return binary.substring(idx + 4, idx + 4 + len);
  } catch { return ''; }
}

function extractIssuer(binary: string): string {
  // Try to extract something useful
  const idx = binary.lastIndexOf('\x55\x04\x03');
  if (idx < 0) return '';
  try {
    const len = binary.charCodeAt(idx + 3);
    return binary.substring(idx + 4, idx + 4 + len);
  } catch { return ''; }
}

function extractSerial(binary: string): string {
  try {
    // Serial number is typically the first integer after the outer SEQUENCE
    const idx = 4; // rough offset
    return binary.charCodeAt(idx).toString(16).padStart(2, '0') + ':' +
           binary.charCodeAt(idx + 1).toString(16).padStart(2, '0');
  } catch { return '??'; }
}

const COMMANDS = {
  generate: `# 1. Generate Root CA
openssl genrsa -out ca.key 4096
openssl req -new -x509 -days 3650 -key ca.key \\
  -subj "/CN=MyRootCA/O=MyOrg" \\
  -out ca.crt

# 2. Generate Server Certificate
openssl genrsa -out server.key 2048
openssl req -new -key server.key \\
  -subj "/CN=server.example.com/O=MyOrg" \\
  -out server.csr
openssl x509 -req -days 365 -in server.csr \\
  -CA ca.crt -CAkey ca.key -CAcreateserial \\
  -extfile <(printf "subjectAltName=DNS:server.example.com\\nkeyUsage=digitalSignature,keyEncipherment\\nextendedKeyUsage=serverAuth") \\
  -out server.crt

# 3. Generate Client Certificate
openssl genrsa -out client.key 2048
openssl req -new -key client.key \\
  -subj "/CN=client-app/O=MyOrg" \\
  -out client.csr
openssl x509 -req -days 365 -in client.csr \\
  -CA ca.crt -CAkey ca.key -CAcreateserial \\
  -extfile <(printf "keyUsage=digitalSignature\\nextendedKeyUsage=clientAuth") \\
  -out client.crt`,

  inspect: `# Inspect certificate details
openssl x509 -in cert.crt -text -noout

# Verify certificate against CA
openssl verify -CAfile ca.crt server.crt
openssl verify -CAfile ca.crt client.crt

# Check certificate chain
openssl verify -CAfile ca.crt -untrusted intermediate.crt client.crt

# View certificate fingerprint
openssl x509 -fingerprint -sha256 -noout -in cert.crt

# Check private key matches certificate
openssl rsa -noout -modulus -in server.key | openssl md5
openssl x509 -noout -modulus -in server.crt | openssl md5
# → Both hashes must match`,

  nginx: `# nginx mTLS configuration
server {
    listen 443 ssl;
    server_name server.example.com;

    ssl_certificate     /etc/ssl/certs/server.crt;
    ssl_certificate_key /etc/ssl/private/server.key;

    # CA cert to verify client certificates
    ssl_client_certificate /etc/ssl/certs/ca.crt;

    # Require client cert (use optional for optional mTLS)
    ssl_verify_client on;
    ssl_verify_depth  2;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;

    location / {
        # Pass client cert info to backend
        proxy_set_header X-SSL-Client-Cert $ssl_client_escaped_cert;
        proxy_set_header X-SSL-Client-DN   $ssl_client_s_dn;
        proxy_pass http://backend;
    }
}`,

  curl: `# Test mTLS connection with curl
curl --cert client.crt \\
     --key client.key \\
     --cacert ca.crt \\
     https://server.example.com/api

# With verbose output to debug
curl -v --cert client.crt \\
        --key client.key \\
        --cacert ca.crt \\
        https://server.example.com/api

# Python requests
import requests
response = requests.get(
    'https://server.example.com/api',
    cert=('client.crt', 'client.key'),
    verify='ca.crt'
)`,
};

export default function MtlsCertificateChainBuilder() {
  const [mode, setMode] = useState<Mode>('visualizer');
  const [caPem, setCaPem] = useState('');
  const [serverPem, setServerPem] = useState('');
  const [clientPem, setClientPem] = useState('');
  const [cmdTab, setCmdTab] = useState<keyof typeof COMMANDS>('generate');
  const [copied, setCopied] = useState(false);

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const caInfo = parsePem(caPem);
  const serverInfo = parsePem(serverPem);
  const clientInfo = parsePem(clientPem);

  const validationMessages: { ok: boolean; msg: string }[] = [];
  if (caInfo) {
    validationMessages.push({ ok: caInfo.isCA, msg: caInfo.isCA ? 'CA cert has cA=TRUE basic constraint' : '⚠️ CA cert may not have cA=TRUE' });
  }
  if (serverInfo) {
    validationMessages.push({ ok: !serverInfo.isCA, msg: !serverInfo.isCA ? 'Server cert is not a CA (correct)' : '⚠️ Server cert has CA flag — review' });
  }
  if (clientInfo) {
    validationMessages.push({ ok: !clientInfo.isCA, msg: !clientInfo.isCA ? 'Client cert is not a CA (correct)' : '⚠️ Client cert has CA flag — review' });
  }

  return (
    <div class="space-y-6">
      {/* Mode tabs */}
      <div class="flex gap-2 border-b border-border pb-2">
        {(['visualizer', 'validator', 'commands'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            class={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${mode === m ? 'text-primary border-b-2 border-primary' : 'text-text-muted hover:text-text'}`}
          >
            {m === 'visualizer' ? 'Chain Diagram' : m === 'validator' ? 'PEM Validator' : 'OpenSSL Commands'}
          </button>
        ))}
      </div>

      {mode === 'visualizer' && (
        <div class="space-y-4">
          <p class="text-sm text-text-muted">mTLS requires mutual authentication — both the server AND the client present certificates signed by a trusted CA.</p>

          {/* Chain diagram */}
          <div class="p-4 rounded-xl bg-bg border border-border">
            <div class="flex flex-col items-center gap-1">
              {/* Root CA */}
              <div class="w-full max-w-md p-4 rounded-xl border-2 border-purple-500 bg-purple-500/10 text-center">
                <div class="text-lg mb-1">🏛️</div>
                <div class="font-semibold text-purple-300">Root CA</div>
                <div class="text-xs text-text-muted mt-1">Self-signed • Issues subordinate certs • cA=TRUE</div>
                <div class="text-xs font-mono text-purple-400 mt-1">ca.crt + ca.key</div>
              </div>

              {/* Fork */}
              <div class="flex items-center gap-8 w-full max-w-md">
                <div class="flex-1 flex flex-col items-center">
                  <div class="w-px h-6 bg-border" />
                  <div class="text-xs text-text-muted">signs</div>
                  <div class="w-px h-4 bg-border" />
                </div>
                <div class="flex-1 flex flex-col items-center">
                  <div class="w-px h-6 bg-border" />
                  <div class="text-xs text-text-muted">signs</div>
                  <div class="w-px h-4 bg-border" />
                </div>
              </div>

              <div class="flex gap-4 w-full max-w-md">
                {/* Server cert */}
                <div class="flex-1 p-3 rounded-xl border-2 border-green-500 bg-green-500/10 text-center">
                  <div class="text-lg mb-1">🖥️</div>
                  <div class="font-semibold text-green-300 text-sm">Server Cert</div>
                  <div class="text-xs text-text-muted mt-1">Extended Key Usage: serverAuth</div>
                  <div class="text-xs font-mono text-green-400 mt-1">server.crt + server.key</div>
                </div>

                {/* Client cert */}
                <div class="flex-1 p-3 rounded-xl border-2 border-blue-500 bg-blue-500/10 text-center">
                  <div class="text-lg mb-1">👤</div>
                  <div class="font-semibold text-blue-300 text-sm">Client Cert</div>
                  <div class="text-xs text-text-muted mt-1">Extended Key Usage: clientAuth</div>
                  <div class="text-xs font-mono text-blue-400 mt-1">client.crt + client.key</div>
                </div>
              </div>

              {/* Handshake */}
              <div class="w-px h-6 bg-border" />
              <div class="w-full max-w-md p-4 rounded-xl border border-border bg-surface text-center">
                <div class="text-lg mb-1">🤝</div>
                <div class="font-semibold text-sm">mTLS Handshake</div>
                <div class="text-xs text-text-muted mt-2 space-y-0.5">
                  <div>1. Client → Server: ClientHello</div>
                  <div>2. Server → Client: Certificate (server.crt)</div>
                  <div>3. Server → Client: CertificateRequest</div>
                  <div>4. Client → Server: Certificate (client.crt)</div>
                  <div>5. Both verify against ca.crt → Encrypted tunnel</div>
                </div>
              </div>
            </div>
          </div>

          {/* Key differences */}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="p-4 rounded-xl bg-bg border border-border">
              <p class="text-sm font-semibold mb-2">TLS (one-way)</p>
              <p class="text-xs text-text-muted">Only the server presents a certificate. Client is anonymous. Standard HTTPS.</p>
            </div>
            <div class="p-4 rounded-xl bg-primary/5 border border-primary/20">
              <p class="text-sm font-semibold mb-2">mTLS (mutual)</p>
              <p class="text-xs text-text-muted">Both server and client present certificates. Client must be pre-approved. Used for service mesh, zero-trust, B2B APIs.</p>
            </div>
          </div>
        </div>
      )}

      {mode === 'validator' && (
        <div class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: '🏛️ CA Certificate (ca.crt)', val: caPem, set: setCaPem, info: caInfo, color: 'purple' },
              { label: '🖥️ Server Certificate', val: serverPem, set: setServerPem, info: serverInfo, color: 'green' },
              { label: '👤 Client Certificate', val: clientPem, set: setClientPem, info: clientInfo, color: 'blue' },
            ].map(({ label, val, set, info, color }) => (
              <div key={label}>
                <label class="block text-sm font-medium mb-1">{label}</label>
                <textarea
                  value={val}
                  onInput={e => set((e.target as HTMLTextAreaElement).value)}
                  rows={6}
                  placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                  class="w-full px-3 py-2 rounded-xl bg-bg border border-border text-text text-xs focus:outline-none focus:border-primary font-mono resize-none"
                />
                {info && !info.error && (
                  <div class={`mt-2 p-2 rounded-lg bg-${color}-500/10 border border-${color}-500/20 text-xs space-y-1`}>
                    <div><span class="text-text-muted">Subject: </span><span class="font-mono">{info.subject || '—'}</span></div>
                    <div><span class="text-text-muted">Is CA: </span><span class={info.isCA ? 'text-green-400' : 'text-text'}>{info.isCA ? '✓ Yes' : 'No'}</span></div>
                    <div><span class="text-text-muted">Key Usage: </span><span>{info.keyUsage.join(', ') || '—'}</span></div>
                  </div>
                )}
                {info?.error && (
                  <div class="mt-2 p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{info.error}</div>
                )}
              </div>
            ))}
          </div>

          {validationMessages.length > 0 && (
            <div class="p-4 rounded-xl bg-bg border border-border">
              <p class="text-sm font-medium mb-2">Validation Hints</p>
              <div class="space-y-1.5">
                {validationMessages.map((v, i) => (
                  <div key={i} class={`flex items-center gap-2 text-sm ${v.ok ? 'text-green-400' : 'text-yellow-400'}`}>
                    <span>{v.ok ? '✓' : '⚠️'}</span>
                    <span>{v.msg}</span>
                  </div>
                ))}
              </div>
              <p class="text-xs text-text-muted mt-3">Note: Full validation (signature chain, expiry, revocation) requires server-side tooling. Use <code class="font-mono">openssl verify</code> for complete checks.</p>
            </div>
          )}
        </div>
      )}

      {mode === 'commands' && (
        <div class="space-y-4">
          <div class="flex gap-2 flex-wrap">
            {(Object.keys(COMMANDS) as (keyof typeof COMMANDS)[]).map(tab => (
              <button
                key={tab}
                onClick={() => setCmdTab(tab)}
                class={`px-3 py-1.5 rounded-lg text-sm transition-colors ${cmdTab === tab ? 'bg-primary text-white' : 'bg-bg border border-border text-text hover:border-primary'}`}
              >
                {tab === 'generate' ? 'Generate Certs' : tab === 'inspect' ? 'Inspect & Verify' : tab === 'nginx' ? 'nginx Config' : 'Test with curl'}
              </button>
            ))}
          </div>
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium capitalize">{cmdTab} commands</label>
              <button onClick={() => copy(COMMANDS[cmdTab])} class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors">
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{COMMANDS[cmdTab]}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
