import { useState, useCallback } from 'preact/hooks';

// ULID implementation (Universally Unique Lexicographically Sortable Identifier)
const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = '';
  for (let i = len - 1; i >= 0; i--) {
    str = ENCODING[now % ENCODING_LEN] + str;
    now = Math.floor(now / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(len: number): string {
  let str = '';
  const arr = new Uint8Array(len);
  crypto.getRandomValues(arr);
  for (let i = 0; i < len; i++) {
    str += ENCODING[arr[i] % ENCODING_LEN];
  }
  return str;
}

function generateULID(): string {
  const now = Date.now();
  return encodeTime(now, TIME_LEN) + encodeRandom(RANDOM_LEN);
}

// NanoID implementation (URL-friendly unique IDs)
const NANOID_ALPHABET = 'useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict';

function generateNanoID(size = 21, alphabet = NANOID_ALPHABET): string {
  const mask = (2 << (31 - Math.clz32((alphabet.length - 1) | 1))) - 1;
  const step = Math.ceil((1.6 * mask * size) / alphabet.length);
  let id = '';
  while (id.length < size) {
    const bytes = new Uint8Array(step);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < step; i++) {
      const byte = bytes[i] & mask;
      if (byte < alphabet.length) {
        id += alphabet[byte];
        if (id.length === size) break;
      }
    }
  }
  return id;
}

// UUID v4
function generateUUIDv4(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  arr[6] = (arr[6] & 0x0f) | 0x40;
  arr[8] = (arr[8] & 0x3f) | 0x80;
  const hex = Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

const CUSTOM_ALPHABETS: Record<string, string> = {
  'Default (URL-safe)': NANOID_ALPHABET,
  'Alphanumeric': 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
  'Lowercase': 'abcdefghijklmnopqrstuvwxyz0123456789',
  'Numbers only': '0123456789',
  'Hex': '0123456789abcdef',
};

type IdType = 'ulid' | 'nanoid' | 'uuid';

export default function UlidNanoidGenerator() {
  const [idType, setIdType] = useState<IdType>('ulid');
  const [count, setCount] = useState(1);
  const [nanoSize, setNanoSize] = useState(21);
  const [nanoAlphabet, setNanoAlphabet] = useState('Default (URL-safe)');
  const [results, setResults] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const [ulidInfo, setUlidInfo] = useState<{ts: string; random: string} | null>(null);

  const generate = useCallback(() => {
    const ids: string[] = [];
    for (let i = 0; i < Math.min(count, 100); i++) {
      if (idType === 'ulid') {
        ids.push(generateULID());
      } else if (idType === 'nanoid') {
        ids.push(generateNanoID(nanoSize, CUSTOM_ALPHABETS[nanoAlphabet]));
      } else {
        ids.push(generateUUIDv4());
      }
    }
    setResults(ids);
    setCopied(false);
    if (idType === 'ulid' && ids.length === 1) {
      setUlidInfo({ ts: ids[0].slice(0, 10), random: ids[0].slice(10) });
    } else {
      setUlidInfo(null);
    }
  }, [idType, count, nanoSize, nanoAlphabet]);

  const copyAll = () => {
    navigator.clipboard.writeText(results.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const copyOne = (id: string) => {
    navigator.clipboard.writeText(id);
  };

  const decodeUlid = (ulid: string) => {
    if (ulid.length !== 26) return null;
    const timePart = ulid.slice(0, 10);
    let ms = 0;
    for (const c of timePart) {
      ms = ms * ENCODING_LEN + ENCODING.indexOf(c);
    }
    return new Date(ms).toISOString();
  };

  return (
    <div class="space-y-4">
      {/* Type Selector */}
      <div class="flex gap-2 flex-wrap">
        {(['ulid', 'nanoid', 'uuid'] as IdType[]).map(t => (
          <button
            key={t}
            onClick={() => { setIdType(t); setResults([]); setUlidInfo(null); }}
            class={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${idType === t ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary'}`}
          >
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Type Description */}
      <div class="bg-bg-card border border-border rounded-lg p-3 text-sm text-text-muted">
        {idType === 'ulid' && (
          <span><strong class="text-text">ULID</strong> — Universally Unique Lexicographically Sortable Identifier. 26-char, timestamp-prefixed, sortable, URL-safe. Ideal for databases and distributed systems.</span>
        )}
        {idType === 'nanoid' && (
          <span><strong class="text-text">NanoID</strong> — URL-friendly, tiny (21 chars by default), secure random ID. Smaller than UUID, customizable alphabet and size. Great for short URLs and tokens.</span>
        )}
        {idType === 'uuid' && (
          <span><strong class="text-text">UUID v4</strong> — Random 128-bit universally unique identifier in 8-4-4-4-12 format. Industry standard, widely supported in all databases and frameworks.</span>
        )}
      </div>

      {/* Config */}
      <div class="flex flex-wrap gap-3 items-end">
        <div>
          <label class="block text-xs text-text-muted mb-1">Count (max 100)</label>
          <input
            type="number"
            min={1}
            max={100}
            value={count}
            onInput={(e) => setCount(Math.max(1, Math.min(100, parseInt((e.target as HTMLInputElement).value) || 1)))}
            class="bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text w-24 focus:outline-none focus:border-primary"
          />
        </div>
        {idType === 'nanoid' && (
          <>
            <div>
              <label class="block text-xs text-text-muted mb-1">Size (chars)</label>
              <input
                type="number"
                min={4}
                max={64}
                value={nanoSize}
                onInput={(e) => setNanoSize(Math.max(4, Math.min(64, parseInt((e.target as HTMLInputElement).value) || 21)))}
                class="bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text w-24 focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Alphabet</label>
              <select
                value={nanoAlphabet}
                onChange={(e) => setNanoAlphabet((e.target as HTMLSelectElement).value)}
                class="bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary"
              >
                {Object.keys(CUSTOM_ALPHABETS).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </>
        )}
        <button
          onClick={generate}
          class="px-5 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Generate
        </button>
      </div>

      {/* Results */}
      {results.length > 0 && (
        <div class="space-y-2">
          <div class="flex justify-between items-center">
            <span class="text-xs text-text-muted">{results.length} ID{results.length > 1 ? 's' : ''} generated</span>
            <button
              onClick={copyAll}
              class="text-xs bg-bg-card border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy All'}
            </button>
          </div>

          <div class="bg-bg-card border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
            {results.map((id, i) => (
              <div key={i} class="flex items-center justify-between px-3 py-2 hover:bg-border/10 group">
                <code class="font-mono text-sm text-primary break-all">{id}</code>
                <button
                  onClick={() => copyOne(id)}
                  class="ml-3 text-xs text-text-muted opacity-0 group-hover:opacity-100 hover:text-primary transition-all shrink-0"
                >
                  Copy
                </button>
              </div>
            ))}
          </div>

          {/* ULID Decoder */}
          {idType === 'ulid' && results.length === 1 && (
            <div class="bg-bg-card border border-border rounded-lg p-3 text-sm space-y-1">
              <p class="text-xs font-medium text-text-muted uppercase tracking-wide">ULID Structure</p>
              <div class="font-mono text-base break-all">
                <span class="text-yellow-400" title="Timestamp (10 chars)">{results[0].slice(0, 10)}</span>
                <span class="text-blue-400" title="Random (16 chars)">{results[0].slice(10)}</span>
              </div>
              <div class="flex gap-4 text-xs text-text-muted mt-1">
                <span><span class="text-yellow-400">■</span> Timestamp: {decodeUlid(results[0])}</span>
                <span><span class="text-blue-400">■</span> Random: 80 bits</span>
              </div>
            </div>
          )}
        </div>
      )}

      {results.length === 0 && (
        <div class="bg-bg-card border border-dashed border-border rounded-lg p-8 text-center text-text-muted text-sm">
          Click Generate to create {idType.toUpperCase()} IDs
        </div>
      )}
    </div>
  );
}
