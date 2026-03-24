import { useState } from 'preact/hooks';

function toPem(buffer: ArrayBuffer, type: string): string {
  const bytes = new Uint8Array(buffer);
  let b64 = '';
  for (let i = 0; i < bytes.length; i++) b64 += String.fromCharCode(bytes[i]);
  const lines = btoa(b64).match(/.{1,64}/g)!.join('\n');
  return `-----BEGIN ${type}-----\n${lines}\n-----END ${type}-----`;
}

async function generateRsaKeys(bits: number): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'RSA-OAEP', modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' },
    true, ['encrypt', 'decrypt']
  );
  const [pubDer, privDer] = await Promise.all([
    crypto.subtle.exportKey('spki', keyPair.publicKey),
    crypto.subtle.exportKey('pkcs8', keyPair.privateKey),
  ]);
  return { publicKey: toPem(pubDer, 'PUBLIC KEY'), privateKey: toPem(privDer, 'PRIVATE KEY') };
}

export default function RsaKeyGenerator() {
  const [bits, setBits] = useState<2048 | 4096>(2048);
  const [publicKey, setPublicKey] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedPub, setCopiedPub] = useState(false);
  const [copiedPriv, setCopiedPriv] = useState(false);

  const generate = async () => {
    setLoading(true); setPublicKey(''); setPrivateKey('');
    try {
      const keys = await generateRsaKeys(bits);
      setPublicKey(keys.publicKey);
      setPrivateKey(keys.privateKey);
    } catch (e: any) {
      setPublicKey('Error: ' + e.message);
    }
    setLoading(false);
  };

  const copyPub = () => navigator.clipboard.writeText(publicKey).then(() => { setCopiedPub(true); setTimeout(() => setCopiedPub(false), 1500); });
  const copyPriv = () => navigator.clipboard.writeText(privateKey).then(() => { setCopiedPriv(true); setTimeout(() => setCopiedPriv(false), 1500); });

  return (
    <div class="space-y-5">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          {([2048, 4096] as const).map(b => (
            <button key={b} onClick={() => setBits(b)} class={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${bits === b ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}>
              {b}-bit
            </button>
          ))}
        </div>
        <button
          onClick={generate}
          disabled={loading}
          class="px-6 py-2 rounded-lg font-medium text-sm bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {loading ? `Generating ${bits}-bit keys…` : 'Generate Key Pair'}
        </button>
        {bits === 4096 && <span class="text-xs text-text-muted">⏱ May take a few seconds</span>}
      </div>

      {!publicKey && !loading && (
        <div class="text-center py-8 text-text-muted text-sm border border-dashed border-border rounded-lg">
          Click "Generate Key Pair" to create a new RSA-OAEP key pair using your browser's Web Crypto API.
        </div>
      )}

      {loading && (
        <div class="text-center py-8 text-text-muted text-sm">
          <div class="animate-spin inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full mb-3"></div>
          <p>Generating {bits}-bit RSA key pair…</p>
        </div>
      )}

      {publicKey && !loading && (
        <div class="space-y-4">
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-sm font-medium text-text-muted">Public Key (SPKI)</label>
              <button onClick={copyPub} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
                {copiedPub ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <textarea readOnly class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none" value={publicKey} />
          </div>
          <div>
            <div class="flex justify-between items-center mb-2">
              <label class="text-sm font-medium text-text-muted">Private Key (PKCS#8)</label>
              <button onClick={copyPriv} class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors">
                {copiedPriv ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <textarea readOnly class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none" value={privateKey} />
          </div>
          <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-xs text-yellow-400">
            ⚠️ Keep your private key secret. These keys are generated locally in your browser and never sent to any server. For production use, generate keys server-side.
          </div>
        </div>
      )}
    </div>
  );
}
