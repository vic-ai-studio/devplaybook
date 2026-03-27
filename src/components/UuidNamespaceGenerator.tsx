import { useState, useCallback } from 'preact/hooks';

// RFC 4122 standard namespace UUIDs
const NAMESPACES = {
  DNS: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
  URL: '6ba7b811-9dad-11d1-80b4-00c04fd430c8',
  OID: '6ba7b812-9dad-11d1-80b4-00c04fd430c8',
  X500: '6ba7b814-9dad-11d1-80b4-00c04fd430c8',
};

function parseUuidToBytes(uuid: string): Uint8Array {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const h = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// UUID v3 — MD5 name-based
async function uuidv3(name: string, namespace: string): Promise<string> {
  const nsBytes = parseUuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest('MD5' as AlgorithmIdentifier, combined).catch(() => null);
  if (!hashBuffer) {
    // MD5 not available in Web Crypto — fallback pure JS MD5
    return uuidv3Fallback(name, namespace);
  }
  const hash = new Uint8Array(hashBuffer);
  hash[6] = (hash[6] & 0x0f) | 0x30; // version 3
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  return bytesToUuid(hash.slice(0, 16));
}

// Pure-JS MD5 fallback (needed because Web Crypto doesn't support MD5)
function md5(input: Uint8Array): Uint8Array {
  function safeAdd(x: number, y: number) { return (x + y) | 0; }
  function bitRotateLeft(num: number, cnt: number) { return (num << cnt) | (num >>> (32 - cnt)); }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // Pad the input
  const msgLen = input.length;
  const padLen = (msgLen % 64 < 56) ? (56 - msgLen % 64) : (120 - msgLen % 64);
  const padded = new Uint8Array(msgLen + padLen + 8);
  padded.set(input);
  padded[msgLen] = 0x80;
  const bitLen = BigInt(msgLen * 8);
  for (let i = 0; i < 8; i++) {
    padded[msgLen + padLen + i] = Number((bitLen >> BigInt(i * 8)) & 0xffn);
  }

  const m = new Int32Array(padded.buffer);
  let [a, b, c, d] = [1732584193, -271733879, -1732584194, 271733878];

  for (let i = 0; i < m.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = md5ff(a, b, c, d, m[i], 7, -680876936); d = md5ff(d, a, b, c, m[i+1], 12, -389564586); c = md5ff(c, d, a, b, m[i+2], 17, 606105819); b = md5ff(b, c, d, a, m[i+3], 22, -1044525330);
    a = md5ff(a, b, c, d, m[i+4], 7, -176418897); d = md5ff(d, a, b, c, m[i+5], 12, 1200080426); c = md5ff(c, d, a, b, m[i+6], 17, -1473231341); b = md5ff(b, c, d, a, m[i+7], 22, -45705983);
    a = md5ff(a, b, c, d, m[i+8], 7, 1770035416); d = md5ff(d, a, b, c, m[i+9], 12, -1958414417); c = md5ff(c, d, a, b, m[i+10], 17, -42063); b = md5ff(b, c, d, a, m[i+11], 22, -1990404162);
    a = md5ff(a, b, c, d, m[i+12], 7, 1804603682); d = md5ff(d, a, b, c, m[i+13], 12, -40341101); c = md5ff(c, d, a, b, m[i+14], 17, -1502002290); b = md5ff(b, c, d, a, m[i+15], 22, 1236535329);
    a = md5gg(a, b, c, d, m[i+1], 5, -165796510); d = md5gg(d, a, b, c, m[i+6], 9, -1069501632); c = md5gg(c, d, a, b, m[i+11], 14, 643717713); b = md5gg(b, c, d, a, m[i], 20, -373897302);
    a = md5gg(a, b, c, d, m[i+5], 5, -701558691); d = md5gg(d, a, b, c, m[i+10], 9, 38016083); c = md5gg(c, d, a, b, m[i+15], 14, -660478335); b = md5gg(b, c, d, a, m[i+4], 20, -405537848);
    a = md5gg(a, b, c, d, m[i+9], 5, 568446438); d = md5gg(d, a, b, c, m[i+14], 9, -1019803690); c = md5gg(c, d, a, b, m[i+3], 14, -187363961); b = md5gg(b, c, d, a, m[i+8], 20, 1163531501);
    a = md5gg(a, b, c, d, m[i+13], 5, -1444681467); d = md5gg(d, a, b, c, m[i+2], 9, -51403784); c = md5gg(c, d, a, b, m[i+7], 14, 1735328473); b = md5gg(b, c, d, a, m[i+12], 20, -1926607734);
    a = md5hh(a, b, c, d, m[i+5], 4, -378558); d = md5hh(d, a, b, c, m[i+8], 11, -2022574463); c = md5hh(c, d, a, b, m[i+11], 16, 1839030562); b = md5hh(b, c, d, a, m[i+14], 23, -35309556);
    a = md5hh(a, b, c, d, m[i+1], 4, -1530992060); d = md5hh(d, a, b, c, m[i+4], 11, 1272893353); c = md5hh(c, d, a, b, m[i+7], 16, -155497632); b = md5hh(b, c, d, a, m[i+10], 23, -1094730640);
    a = md5hh(a, b, c, d, m[i+13], 4, 681279174); d = md5hh(d, a, b, c, m[i], 11, -358537222); c = md5hh(c, d, a, b, m[i+3], 16, -722521979); b = md5hh(b, c, d, a, m[i+6], 23, 76029189);
    a = md5hh(a, b, c, d, m[i+9], 4, -640364487); d = md5hh(d, a, b, c, m[i+12], 11, -421815835); c = md5hh(c, d, a, b, m[i+15], 16, 530742520); b = md5hh(b, c, d, a, m[i+2], 23, -995338651);
    a = md5ii(a, b, c, d, m[i], 6, -198630844); d = md5ii(d, a, b, c, m[i+7], 10, 1126891415); c = md5ii(c, d, a, b, m[i+14], 15, -1416354905); b = md5ii(b, c, d, a, m[i+5], 21, -57434055);
    a = md5ii(a, b, c, d, m[i+12], 6, 1700485571); d = md5ii(d, a, b, c, m[i+3], 10, -1894986606); c = md5ii(c, d, a, b, m[i+10], 15, -1051523); b = md5ii(b, c, d, a, m[i+1], 21, -2054922799);
    a = md5ii(a, b, c, d, m[i+8], 6, 1873313359); d = md5ii(d, a, b, c, m[i+15], 10, -30611744); c = md5ii(c, d, a, b, m[i+6], 15, -1560198380); b = md5ii(b, c, d, a, m[i+13], 21, 1309151649);
    a = md5ii(a, b, c, d, m[i+4], 6, -145523070); d = md5ii(d, a, b, c, m[i+11], 10, -1120210379); c = md5ii(c, d, a, b, m[i+2], 15, 718787259); b = md5ii(b, c, d, a, m[i+9], 21, -343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }

  const result = new Uint8Array(16);
  const view = new DataView(result.buffer);
  view.setInt32(0, a, true); view.setInt32(4, b, true);
  view.setInt32(8, c, true); view.setInt32(12, d, true);
  return result;
}

async function uuidv3Fallback(name: string, namespace: string): Promise<string> {
  const nsBytes = parseUuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);
  const hash = md5(combined);
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash);
}

// UUID v4 — random
function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

// UUID v5 — SHA-1 name-based
async function uuidv5(name: string, namespace: string): Promise<string> {
  const nsBytes = parseUuidToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  const hash = new Uint8Array(hashBuffer);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  return bytesToUuid(hash.slice(0, 16));
}

function isValidUuid(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

type Version = 'v3' | 'v4' | 'v5';
type NamespaceKey = 'DNS' | 'URL' | 'OID' | 'X500' | 'Custom';

export default function UuidNamespaceGenerator() {
  const [version, setVersion] = useState<Version>('v5');
  const [namespaceKey, setNamespaceKey] = useState<NamespaceKey>('DNS');
  const [customNamespace, setCustomNamespace] = useState('');
  const [name, setName] = useState('');
  const [batchNames, setBatchNames] = useState('');
  const [batchMode, setBatchMode] = useState(false);
  const [result, setResult] = useState('');
  const [batchResults, setBatchResults] = useState<Array<{ name: string; uuid: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  const getNamespace = () => {
    if (namespaceKey === 'Custom') return customNamespace;
    return NAMESPACES[namespaceKey];
  };

  const generate = useCallback(async () => {
    setError('');
    setResult('');
    setBatchResults([]);
    const ns = getNamespace();

    if (version !== 'v4') {
      if (!ns) { setError('Please enter a custom namespace UUID'); return; }
      if (!isValidUuid(ns)) { setError('Custom namespace must be a valid UUID (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)'); return; }
    }

    setLoading(true);
    try {
      if (batchMode) {
        const names = batchNames.split('\n').map(n => n.trim()).filter(Boolean);
        if (names.length === 0) { setError('Enter at least one name for batch generation'); setLoading(false); return; }
        if (names.length > 100) { setError('Batch limit is 100 names'); setLoading(false); return; }

        const results: Array<{ name: string; uuid: string }> = [];
        for (const n of names) {
          let uuid: string;
          if (version === 'v3') uuid = await uuidv3(n, ns);
          else if (version === 'v5') uuid = await uuidv5(n, ns);
          else uuid = uuidv4();
          results.push({ name: n, uuid });
        }
        setBatchResults(results);
      } else {
        if (version !== 'v4' && !name) { setError('Please enter a name to hash'); setLoading(false); return; }
        let uuid: string;
        if (version === 'v3') uuid = await uuidv3(name, ns);
        else if (version === 'v5') uuid = await uuidv5(name, ns);
        else uuid = uuidv4();
        setResult(uuid);
      }
    } catch (e: any) {
      setError(e.message || 'Generation failed');
    } finally {
      setLoading(false);
    }
  }, [version, namespaceKey, customNamespace, name, batchNames, batchMode]);

  const copyResult = async () => {
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const copyAll = async () => {
    const text = batchResults.map(r => r.uuid).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const versionInfo: Record<Version, { label: string; desc: string; needsName: boolean }> = {
    v3: { label: 'v3 (MD5)', desc: 'Deterministic UUID using MD5 hash of namespace + name. Same inputs always produce same UUID.', needsName: true },
    v4: { label: 'v4 (Random)', desc: 'Cryptographically random UUID. No namespace needed. Each generation is unique.', needsName: false },
    v5: { label: 'v5 (SHA-1)', desc: 'Deterministic UUID using SHA-1 hash of namespace + name. Preferred over v3 for new projects.', needsName: true },
  };

  return (
    <div class="space-y-6">
      {/* Version selector */}
      <div>
        <label class="block text-sm font-medium mb-2">UUID Version</label>
        <div class="flex gap-2 flex-wrap">
          {(['v3', 'v4', 'v5'] as Version[]).map(v => (
            <button
              key={v}
              onClick={() => setVersion(v)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${version === v ? 'bg-accent text-white' : 'bg-surface-2 hover:bg-surface-3 text-text'}`}
            >
              {versionInfo[v].label}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-2">{versionInfo[version].desc}</p>
      </div>

      {/* Namespace selector */}
      {version !== 'v4' && (
        <div>
          <label class="block text-sm font-medium mb-2">Namespace</label>
          <div class="flex gap-2 flex-wrap mb-3">
            {(['DNS', 'URL', 'OID', 'X500', 'Custom'] as NamespaceKey[]).map(k => (
              <button
                key={k}
                onClick={() => setNamespaceKey(k)}
                class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${namespaceKey === k ? 'bg-accent text-white' : 'bg-surface-2 hover:bg-surface-3 text-text'}`}
              >
                {k}
              </button>
            ))}
          </div>
          {namespaceKey !== 'Custom' ? (
            <div class="font-mono text-sm bg-surface-2 rounded px-3 py-2 text-text-muted break-all">
              {NAMESPACES[namespaceKey as Exclude<NamespaceKey, 'Custom'>]}
              <span class="ml-2 text-xs text-text-muted">
                {namespaceKey === 'DNS' && '(RFC 4122 DNS namespace)'}
                {namespaceKey === 'URL' && '(RFC 4122 URL namespace)'}
                {namespaceKey === 'OID' && '(RFC 4122 ISO OID namespace)'}
                {namespaceKey === 'X500' && '(RFC 4122 X.500 DN namespace)'}
              </span>
            </div>
          ) : (
            <input
              type="text"
              value={customNamespace}
              onInput={(e) => setCustomNamespace((e.target as HTMLInputElement).value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              class="w-full font-mono text-sm bg-surface-2 border border-border rounded px-3 py-2 text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          )}
        </div>
      )}

      {/* Batch toggle */}
      <div class="flex items-center gap-2">
        <button
          onClick={() => setBatchMode(!batchMode)}
          class={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${batchMode ? 'bg-accent' : 'bg-surface-3'}`}
        >
          <span class={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${batchMode ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
        <span class="text-sm text-text-muted">Batch mode (multiple names, one per line)</span>
      </div>

      {/* Name input */}
      {version !== 'v4' && (
        batchMode ? (
          <div>
            <label class="block text-sm font-medium mb-1">Names (one per line, max 100)</label>
            <textarea
              value={batchNames}
              onInput={(e) => setBatchNames((e.target as HTMLTextAreaElement).value)}
              placeholder={"example.com\nhello.world\nmy-service"}
              rows={6}
              class="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent resize-y"
            />
          </div>
        ) : (
          <div>
            <label class="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onInput={(e) => setName((e.target as HTMLInputElement).value)}
              placeholder={namespaceKey === 'DNS' ? 'example.com' : namespaceKey === 'URL' ? 'https://example.com/path' : 'your-name-here'}
              class="w-full bg-surface-2 border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
              onKeyDown={(e) => e.key === 'Enter' && generate()}
            />
          </div>
        )
      )}

      <button
        onClick={generate}
        disabled={loading}
        class="px-6 py-2.5 bg-accent hover:bg-accent/90 disabled:opacity-60 text-white rounded-lg text-sm font-medium transition-colors"
      >
        {loading ? 'Generating…' : 'Generate UUID'}
      </button>

      {error && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm">{error}</div>
      )}

      {/* Single result */}
      {result && !batchMode && (
        <div class="space-y-3">
          <div class="flex items-center gap-2 p-3 bg-surface-2 rounded-lg font-mono text-sm break-all">
            <span class="flex-1 text-text">{result}</span>
            <button
              onClick={copyResult}
              class="shrink-0 px-3 py-1 text-xs bg-accent hover:bg-accent/90 text-white rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          {version !== 'v4' && (
            <div class="text-xs text-text-muted space-y-0.5">
              <p><span class="font-medium">Version:</span> {version.toUpperCase()}</p>
              <p><span class="font-medium">Namespace:</span> {namespaceKey === 'Custom' ? customNamespace : NAMESPACES[namespaceKey as Exclude<NamespaceKey, 'Custom'>]}</p>
              <p><span class="font-medium">Name:</span> {name}</p>
              <p class="text-green-500 text-xs mt-1">✓ Deterministic — same inputs will always produce this UUID</p>
            </div>
          )}
        </div>
      )}

      {/* Batch results */}
      {batchResults.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium">{batchResults.length} UUIDs generated</span>
            <button
              onClick={copyAll}
              class="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-white rounded transition-colors"
            >
              {copiedAll ? 'Copied!' : 'Copy All'}
            </button>
          </div>
          <div class="bg-surface-2 rounded-lg divide-y divide-border max-h-96 overflow-y-auto">
            {batchResults.map(({ name: n, uuid }) => (
              <div key={n} class="flex items-center gap-3 px-3 py-2 text-xs font-mono">
                <span class="text-text-muted w-40 shrink-0 truncate">{n}</span>
                <span class="flex-1 text-text break-all">{uuid}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info box */}
      <div class="p-4 bg-surface-2 rounded-lg text-sm space-y-2">
        <p class="font-medium text-text">How namespace UUIDs work</p>
        <ul class="text-text-muted space-y-1 text-xs">
          <li>• <strong>v3 and v5</strong> are deterministic: the same namespace + name always produces the same UUID.</li>
          <li>• <strong>DNS namespace</strong> is for domain names (e.g., <code>example.com</code>).</li>
          <li>• <strong>URL namespace</strong> is for full URLs (e.g., <code>https://example.com/path</code>).</li>
          <li>• <strong>Custom namespace</strong> lets you scope UUIDs to your own application.</li>
          <li>• Prefer <strong>v5</strong> over v3 — SHA-1 is more collision-resistant than MD5.</li>
        </ul>
      </div>
    </div>
  );
}
