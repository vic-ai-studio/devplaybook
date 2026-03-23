import { useState, useCallback, useEffect } from 'preact/hooks';
import { isProUser } from '../utils/pro';

const FREE_COUNT_LIMIT = 10;

// RFC 4122 v4 UUID — cryptographically random
function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// RFC 4122 v1 UUID — time-based (simulated: uses current time + random node)
function uuidv1(): string {
  // Timestamps in UUID v1 are 100-nanosecond intervals since Oct 15, 1582
  const now = Date.now();
  const gregorianOffset = 122192928000000000n; // ms offset to 100ns ticks
  const timestamp = BigInt(now) * 10000n + gregorianOffset;

  const timeLow = Number(timestamp & 0xffffffffn).toString(16).padStart(8, '0');
  const timeMid = Number((timestamp >> 32n) & 0xffffn).toString(16).padStart(4, '0');
  const timeHiVersion = Number((timestamp >> 48n) & 0x0fffn | 0x1000n).toString(16).padStart(4, '0');

  const clockSeq = (Math.random() * 0x3fff | 0x8000).toString(16).padStart(4, '0');

  // Random node (48-bit, multicast bit set to indicate non-IEEE 802 address)
  const nodeBytes = new Uint8Array(6);
  crypto.getRandomValues(nodeBytes);
  nodeBytes[0] |= 0x01; // multicast bit
  const node = Array.from(nodeBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${timeLow}-${timeMid}-${timeHiVersion}-${clockSeq}-${node}`;
}

// RFC 4122 v5 UUID — SHA-1 name-based (DNS namespace by default)
async function uuidv5(name: string, namespace: string = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'): Promise<string> {
  // Parse namespace UUID bytes
  const nsHex = namespace.replace(/-/g, '');
  const nsBytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    nsBytes[i] = parseInt(nsHex.slice(i * 2, i * 2 + 2), 16);
  }
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  const hash = new Uint8Array(hashBuffer);
  hash[6] = (hash[6] & 0x0f) | 0x50; // version 5
  hash[8] = (hash[8] & 0x3f) | 0x80; // variant
  const h = Array.from(hash.slice(0, 16)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

type Version = 'v4' | 'v1' | 'v5';
type Format = 'standard' | 'uppercase' | 'no-hyphens' | 'braces';

function applyFormat(uuid: string, fmt: Format): string {
  switch (fmt) {
    case 'uppercase': return uuid.toUpperCase();
    case 'no-hyphens': return uuid.replace(/-/g, '');
    case 'braces': return `{${uuid}}`;
    default: return uuid;
  }
}

function ShareButton() {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== 'undefined' ? window.location.href : 'https://devplaybook.cc/tools/uuid-generator';

  const copyLink = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Free UUID Generator — v1/v4/v5 bulk UUID generation, multiple formats, instant copy 🔑')}&url=${encodeURIComponent(url)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Free UUID Generator — v1/v4/v5 bulk generation with format options, no signup')}`;

  return (
    <div class="flex gap-2 flex-wrap">
      <span class="text-sm text-gray-400 self-center">Share:</span>
      <a href={tweetUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        𝕏 Twitter
      </a>
      <a href={redditUrl} target="_blank" rel="noopener noreferrer"
        class="text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        Reddit
      </a>
      <button onClick={copyLink}
        class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1.5 rounded-md transition-colors font-medium">
        {copied ? '✓ Copied!' : '🔗 Copy Link'}
      </button>
    </div>
  );
}

const VERSION_INFO: Record<Version, { label: string; desc: string; pattern: string }> = {
  v4: {
    label: 'v4 — Random',
    desc: 'Cryptographically random. Best for most use cases.',
    pattern: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx',
  },
  v1: {
    label: 'v1 — Time-based',
    desc: 'Encodes current timestamp + random node. Sortable by creation time.',
    pattern: 'tttttttt-tttt-1ttt-yxxx-xxxxxxxxxxxx',
  },
  v5: {
    label: 'v5 — Name-based (SHA-1)',
    desc: 'Deterministic: same name always produces the same UUID.',
    pattern: 'xxxxxxxx-xxxx-5xxx-yxxx-xxxxxxxxxxxx',
  },
};

export default function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>(() => [uuidv4()]);
  const [format, setFormat] = useState<Format>('standard');
  const [count, setCount] = useState(1);
  const [version, setVersion] = useState<Version>('v4');
  const [v5Name, setV5Name] = useState('example.com');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);
  const [pro, setPro] = useState(false);
  const [showProBanner, setShowProBanner] = useState(false);

  useEffect(() => {
    setPro(isProUser());
  }, []);

  const effectiveCount = !pro ? Math.min(count, FREE_COUNT_LIMIT) : Math.min(Math.max(1, count), 100);

  const generate = useCallback(async () => {
    const n = effectiveCount;
    if (!pro && count > FREE_COUNT_LIMIT) {
      setShowProBanner(true);
    } else {
      setShowProBanner(false);
    }
    if (version === 'v4') {
      setUuids(Array.from({ length: n }, () => uuidv4()));
    } else if (version === 'v1') {
      // Slight delay between v1 UUIDs so timestamps differ
      const results: string[] = [];
      for (let i = 0; i < n; i++) {
        await new Promise(r => setTimeout(r, 1));
        results.push(uuidv1());
      }
      setUuids(results);
    } else if (version === 'v5') {
      // v5 with incrementing names for bulk: name, name-2, name-3...
      const results: string[] = [];
      for (let i = 0; i < n; i++) {
        const name = n === 1 ? v5Name : `${v5Name}${i > 0 ? `-${i + 1}` : ''}`;
        results.push(await uuidv5(name));
      }
      setUuids(results);
    }
  }, [count, version, v5Name, pro, effectiveCount]);

  const copyOne = (idx: number) => {
    navigator.clipboard.writeText(applyFormat(uuids[idx], format)).then(() => {
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1500);
    });
  };

  const copyAll = () => {
    const text = uuids.map(u => applyFormat(u, format)).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    });
  };

  const formats: { value: Format; label: string; example: string }[] = [
    { value: 'standard', label: 'Standard', example: '550e8400-e29b-41d4-a716-446655440000' },
    { value: 'uppercase', label: 'UPPERCASE', example: '550E8400-E29B-41D4-A716-446655440000' },
    { value: 'no-hyphens', label: 'No Hyphens', example: '550e8400e29b41d4a716446655440000' },
    { value: 'braces', label: 'Braces', example: '{550e8400-e29b-41d4-a716-446655440000}' },
  ];

  // Quick-select counts: free users can pick 1-10, Pro gets 25/50/100 too
  const quickCounts = pro ? [1, 5, 10, 25, 50, 100] : [1, 5, 10];

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        {/* Version selector */}
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">UUID Version</label>
          <div class="flex flex-wrap gap-2">
            {(Object.keys(VERSION_INFO) as Version[]).map(v => (
              <button key={v} onClick={() => setVersion(v)}
                class={`text-sm px-4 py-1.5 rounded-md border transition-colors ${
                  version === v
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {VERSION_INFO[v].label}
              </button>
            ))}
          </div>
          <p class="text-xs text-gray-500 mt-1.5">{VERSION_INFO[version].desc}</p>
        </div>

        {/* v5 name input */}
        {version === 'v5' && (
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Name (input string)</label>
            <input
              type="text"
              value={v5Name}
              onInput={e => setV5Name((e.target as HTMLInputElement).value)}
              placeholder="e.g. example.com"
              class="w-full bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:border-indigo-500"
            />
            <p class="text-xs text-gray-500 mt-1">Namespace: DNS (6ba7b810-9dad-11d1-80b4-00c04fd430c8)</p>
          </div>
        )}

        <div class="flex flex-wrap gap-4 items-end">
          {/* Count */}
          <div>
            <div class="flex items-center gap-2 mb-1">
              <label class="block text-sm font-medium text-gray-300">Count</label>
              {!pro && <span class="text-xs text-gray-500">(max {FREE_COUNT_LIMIT} on free plan)</span>}
            </div>
            <div class="flex gap-2 flex-wrap">
              {quickCounts.map(n => (
                <button key={n} onClick={() => setCount(n)}
                  class={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                    count === n
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {n}
                </button>
              ))}
              {/* Show Pro-gated buttons for free users */}
              {!pro && [25, 50, 100].map(n => (
                <a key={n} href="/pro"
                  class="text-sm px-3 py-1.5 rounded-md border border-gray-700 bg-gray-900 text-gray-600 cursor-pointer relative group"
                  title="Unlock with Pro">
                  {n}
                  <span class="absolute -top-1 -right-1 text-xs bg-primary text-white rounded-full w-4 h-4 flex items-center justify-center leading-none">★</span>
                </a>
              ))}
              <input
                type="number"
                min={1}
                max={pro ? 100 : FREE_COUNT_LIMIT}
                value={count}
                onInput={e => {
                  const val = Number((e.target as HTMLInputElement).value);
                  setCount(val);
                  if (!pro && val > FREE_COUNT_LIMIT) setShowProBanner(true);
                  else setShowProBanner(false);
                }}
                class="w-20 bg-gray-800 text-gray-100 border border-gray-700 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
                placeholder="custom"
              />
            </div>
          </div>

          {/* Generate button */}
          <button onClick={generate}
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
            Generate
          </button>
        </div>

        {/* Format */}
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Output Format</label>
          <div class="flex flex-wrap gap-2">
            {formats.map(f => (
              <button key={f.value} onClick={() => setFormat(f.value)}
                class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  format === f.value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {f.label}
              </button>
            ))}
          </div>
          <p class="text-xs text-gray-500 mt-2 font-mono">{formats.find(f => f.value === format)?.example}</p>
        </div>
      </div>

      {/* Pro upgrade banner */}
      {showProBanner && (
        <div class="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-yellow-400">Free plan: up to {FREE_COUNT_LIMIT} UUIDs per generate</p>
            <p class="text-xs text-gray-400 mt-0.5">Generated {FREE_COUNT_LIMIT} instead of {count}. Upgrade to Pro for up to 100 at once.</p>
          </div>
          <a href="/pro" class="shrink-0 ml-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Go Pro →
          </a>
        </div>
      )}

      {/* Copy all + count header */}
      <div class="flex items-center justify-between">
        <span class="text-sm text-gray-400">{uuids.length} UUID{uuids.length > 1 ? 's' : ''} generated</span>
        <button onClick={copyAll}
          class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded-lg transition-colors font-medium">
          {allCopied ? '✓ All Copied!' : `Copy All (${uuids.length})`}
        </button>
      </div>

      {/* UUID list */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 divide-y divide-gray-800 overflow-hidden">
        {uuids.map((uuid, idx) => (
          <div key={idx} class="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/50 group">
            <span class="text-gray-600 text-xs w-6 text-right select-none">{idx + 1}</span>
            <code class="flex-1 text-green-300 font-mono text-sm break-all">
              {applyFormat(uuid, format)}
            </code>
            <button onClick={() => copyOne(idx)}
              class="text-xs bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded-md transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 font-medium whitespace-nowrap">
              {copiedIdx === idx ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      {/* Info box */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-2">
        <p class="font-medium text-gray-300">UUID Version Guide</p>
        <div class="space-y-1 text-xs">
          <p><span class="text-indigo-400 font-medium">v4 (Random)</span> — Best for most use cases. Uses CSPRNG. Pattern: <code class="text-gray-500">xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx</code></p>
          <p><span class="text-indigo-400 font-medium">v1 (Time-based)</span> — Encodes creation timestamp. Useful when ordering by creation time matters.</p>
          <p><span class="text-indigo-400 font-medium">v5 (Name-based)</span> — SHA-1 hash of a name. Deterministic: same input = same UUID, every time.</p>
        </div>
        {!pro && (
          <p class="text-xs text-gray-500 border-t border-gray-800 pt-2 mt-2">
            Free plan: up to {FREE_COUNT_LIMIT} UUIDs per generate. <a href="/pro" class="text-primary hover:underline">Upgrade to Pro</a> for up to 100 at once.
          </p>
        )}
      </div>

      {pro && <p class="text-xs text-primary text-right">✓ Pro — generate up to 100 UUIDs at once</p>}

      {/* Share */}
      <div class="border-t border-gray-800 pt-4">
        <ShareButton />
      </div>
    </div>
  );
}
