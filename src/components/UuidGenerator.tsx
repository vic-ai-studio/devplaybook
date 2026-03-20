import { useState, useCallback } from 'preact/hooks';

// RFC 4122 v4 UUID implementation (no external deps)
function uuidv4(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

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

  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent('Free UUID Generator — generate UUID v4 in bulk, multiple formats, instant copy 🔑')}&url=${encodeURIComponent(url)}`;
  const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent('Free UUID Generator — bulk UUID v4 generation with format options, no signup')}`;

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

export default function UuidGenerator() {
  const [uuids, setUuids] = useState<string[]>(() => [uuidv4()]);
  const [format, setFormat] = useState<Format>('standard');
  const [count, setCount] = useState(1);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [allCopied, setAllCopied] = useState(false);

  const generate = useCallback(() => {
    const n = Math.min(Math.max(1, count), 100);
    setUuids(Array.from({ length: n }, () => uuidv4()));
  }, [count]);

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

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div class="flex flex-wrap gap-4 items-end">
          {/* Count */}
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Count</label>
            <div class="flex gap-2">
              {[1, 5, 10, 25, 50].map(n => (
                <button key={n} onClick={() => setCount(n)}
                  class={`text-sm px-3 py-1.5 rounded-md border transition-colors ${
                    count === n
                      ? 'bg-indigo-600 border-indigo-500 text-white'
                      : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                  }`}>
                  {n}
                </button>
              ))}
              <input
                type="number"
                min={1}
                max={100}
                value={count}
                onInput={e => setCount(Number((e.target as HTMLInputElement).value))}
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
          <label class="block text-sm font-medium text-gray-300 mb-2">Format</label>
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
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1">
        <p class="font-medium text-gray-300">About UUID v4</p>
        <p>UUID v4 uses <strong class="text-gray-200">cryptographically secure random</strong> bytes. The probability of collision is astronomically low (about 1 in 5.3 × 10³⁶).</p>
        <p class="font-mono text-xs text-gray-500">xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx (where y ∈ {8,9,a,b})</p>
      </div>

      {/* Share */}
      <div class="border-t border-gray-800 pt-4">
        <ShareButton />
      </div>
    </div>
  );
}
