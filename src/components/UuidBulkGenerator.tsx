import { useState, useCallback } from 'preact/hooks';

// RFC 4122 v4 UUID
function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// RFC 4122 v1 (time-based, simulated)
function uuidv1(): string {
  const now = Date.now();
  const gregorianOffset = 122192928000000000n;
  const timestamp = BigInt(now) * 10000n + gregorianOffset;
  const timeLow = Number(timestamp & 0xffffffffn).toString(16).padStart(8, '0');
  const timeMid = Number((timestamp >> 32n) & 0xffffn).toString(16).padStart(4, '0');
  const timeHiVersion = Number((timestamp >> 48n) & 0x0fffn | 0x1000n).toString(16).padStart(4, '0');
  const clockSeq = (Math.random() * 0x3fff | 0x8000).toString(16).padStart(4, '0');
  const nodeBytes = new Uint8Array(6);
  crypto.getRandomValues(nodeBytes);
  nodeBytes[0] |= 0x01;
  const node = Array.from(nodeBytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${timeLow}-${timeMid}-${timeHiVersion}-${clockSeq}-${node}`;
}

// RFC 4122 v5 (SHA-1 name-based)
async function uuidv5(name: string, namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'): Promise<string> {
  const nsHex = namespace.replace(/-/g, '');
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) nsBytes[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);
  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  const hash = new Uint8Array(hashBuffer);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const h = Array.from(hash.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// UUID v7 (Unix timestamp-ordered, RFC 9562)
function uuidv7(): string {
  const ms = BigInt(Date.now());
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[0] = Number((ms >> 40n) & 0xffn);
  bytes[1] = Number((ms >> 32n) & 0xffn);
  bytes[2] = Number((ms >> 24n) & 0xffn);
  bytes[3] = Number((ms >> 16n) & 0xffn);
  bytes[4] = Number((ms >> 8n) & 0xffn);
  bytes[5] = Number(ms & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

type Version = 'v4' | 'v1' | 'v5' | 'v7';
type CaseFormat = 'lower' | 'upper';
type HyphenFormat = 'hyphens' | 'no-hyphens';

function applyFormat(uuid: string, caseFormat: CaseFormat, hyphenFormat: HyphenFormat): string {
  let result = uuid;
  if (hyphenFormat === 'no-hyphens') result = result.replace(/-/g, '');
  if (caseFormat === 'upper') result = result.toUpperCase();
  return result;
}

export default function UuidBulkGenerator() {
  const [version, setVersion] = useState<Version>('v4');
  const [quantity, setQuantity] = useState(10);
  const [caseFormat, setCaseFormat] = useState<CaseFormat>('lower');
  const [hyphenFormat, setHyphenFormat] = useState<HyphenFormat>('hyphens');
  const [v5Name, setV5Name] = useState('example.com');
  const [output, setOutput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [count, setCount] = useState(0);

  const clampedQty = Math.min(Math.max(1, quantity), 1000);

  const generate = useCallback(async () => {
    setGenerating(true);
    setCopied(false);
    const n = clampedQty;
    const uuids: string[] = [];

    if (version === 'v4') {
      for (let i = 0; i < n; i++) uuids.push(uuidv4());
    } else if (version === 'v7') {
      for (let i = 0; i < n; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 0));
        uuids.push(uuidv7());
      }
    } else if (version === 'v1') {
      for (let i = 0; i < n; i++) {
        if (i > 0) await new Promise(r => setTimeout(r, 0));
        uuids.push(uuidv1());
      }
    } else if (version === 'v5') {
      for (let i = 0; i < n; i++) {
        const name = n === 1 ? v5Name : `${v5Name}${i > 0 ? `-${i + 1}` : ''}`;
        uuids.push(await uuidv5(name));
      }
    }

    const formatted = uuids.map(u => applyFormat(u, caseFormat, hyphenFormat));
    setOutput(formatted.join('\n'));
    setCount(formatted.length);
    setGenerating(false);
  }, [version, clampedQty, caseFormat, hyphenFormat, v5Name]);

  const copyAll = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadTxt = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `uuids-${version}-${clampedQty}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const VERSION_OPTIONS: { value: Version; label: string; desc: string }[] = [
    { value: 'v4', label: 'v4 — Random', desc: 'Cryptographically random. Best for most use cases.' },
    { value: 'v7', label: 'v7 — Sortable', desc: 'Timestamp-first, lexicographically sortable. Best for DB primary keys.' },
    { value: 'v1', label: 'v1 — Time-based', desc: 'Encodes current timestamp + random node.' },
    { value: 'v5', label: 'v5 — Name-based', desc: 'Deterministic: same name always produces the same UUID.' },
  ];

  const QUICK_COUNTS = [1, 10, 50, 100, 500, 1000];

  return (
    <div class="space-y-5">
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-5">
        {/* Version */}
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">UUID Version</label>
          <div class="flex flex-wrap gap-2">
            {VERSION_OPTIONS.map(v => (
              <button key={v.value} onClick={() => setVersion(v.value)}
                class={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
                  version === v.value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {v.label}
              </button>
            ))}
          </div>
          <p class="text-xs text-gray-500 mt-1.5">
            {VERSION_OPTIONS.find(v => v.value === version)?.desc}
          </p>
        </div>

        {/* v5 name input */}
        {version === 'v5' && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Name (seed string)</label>
            <input
              type="text"
              value={v5Name}
              onInput={e => setV5Name((e.target as HTMLInputElement).value)}
              placeholder="e.g. example.com"
              class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
            <p class="text-xs text-gray-500 mt-1">
              Namespace: DNS — each UUID in the batch is derived from <code class="text-gray-400">{v5Name}-N</code>
            </p>
          </div>
        )}

        {/* Quantity */}
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Quantity (1 – 1,000)</label>
          <div class="flex flex-wrap gap-2 items-center">
            {QUICK_COUNTS.map(n => (
              <button key={n} onClick={() => setQuantity(n)}
                class={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                  quantity === n
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {n.toLocaleString()}
              </button>
            ))}
            <input
              type="number"
              min={1}
              max={1000}
              value={quantity}
              onInput={e => setQuantity(Number((e.target as HTMLInputElement).value))}
              class="w-24 bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
              placeholder="custom"
            />
          </div>
        </div>

        {/* Format options */}
        <div class="flex flex-wrap gap-6">
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Case</label>
            <div class="flex gap-2">
              {([['lower', 'lowercase'], ['upper', 'UPPERCASE']] as [CaseFormat, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setCaseFormat(v)}
                  class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    caseFormat === v
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-gray-400 mb-1.5">Hyphens</label>
            <div class="flex gap-2">
              {([['hyphens', 'With hyphens'], ['no-hyphens', 'No hyphens']] as [HyphenFormat, string][]).map(([v, l]) => (
                <button key={v} onClick={() => setHyphenFormat(v)}
                  class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                    hyphenFormat === v
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Format preview */}
        <p class="text-xs text-gray-500 font-mono">
          Example: {applyFormat('550e8400-e29b-41d4-a716-446655440000', caseFormat, hyphenFormat)}
        </p>

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={generating}
          class="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold px-8 py-2.5 rounded-lg transition-colors">
          {generating ? 'Generating…' : `Generate ${clampedQty.toLocaleString()} UUID${clampedQty !== 1 ? 's' : ''}`}
        </button>
      </div>

      {/* Output */}
      {output && (
        <div class="space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <span class="text-sm text-gray-400">{count.toLocaleString()} UUID{count !== 1 ? 's' : ''} generated</span>
            <div class="flex gap-2">
              <button onClick={copyAll}
                class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
                {copied ? '✓ Copied!' : 'Copy All'}
              </button>
              <button onClick={downloadTxt}
                class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
                ↓ Download .txt
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={output}
            rows={Math.min(count, 15)}
            class="w-full bg-gray-900 text-green-300 font-mono text-xs border border-gray-700 rounded-xl p-4 resize-y focus:outline-none focus:border-indigo-500"
          />
        </div>
      )}

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1.5">
        <p class="font-medium text-gray-300">UUID Version Guide</p>
        <div class="space-y-1 text-xs">
          <p><span class="text-indigo-400 font-medium">v4 (Random)</span> — Best for most use cases. Cryptographically secure. No time encoding.</p>
          <p><span class="text-indigo-400 font-medium">v7 (Sortable)</span> — Timestamp-first per RFC 9562. Lexicographically sortable — ideal for DB primary keys.</p>
          <p><span class="text-indigo-400 font-medium">v1 (Time-based)</span> — Encodes creation timestamp + node. Sortable by time.</p>
          <p><span class="text-indigo-400 font-medium">v5 (Name-based)</span> — SHA-1 deterministic. Same input always returns the same UUID.</p>
        </div>
      </div>
    </div>
  );
}
