import { useState, useCallback } from 'preact/hooks';

type KeyFormat = 'hex' | 'base64' | 'uuid' | 'jwt-like' | 'alphanumeric' | 'numeric';

interface GeneratorConfig {
  format: KeyFormat;
  length: number;
  prefix: string;
  count: number;
  separateEvery: number;
  separator: string;
}

const FORMAT_INFO: Record<KeyFormat, { label: string; description: string; defaultLength: number }> = {
  hex:          { label: 'Hex',          description: 'Lowercase hex characters (0-9, a-f)',           defaultLength: 32 },
  base64:       { label: 'Base64 URL',   description: 'URL-safe base64 (A-Z, a-z, 0-9, -, _)',        defaultLength: 32 },
  uuid:         { label: 'UUID v4',      description: 'Standard UUID format (8-4-4-4-12)',             defaultLength: 36 },
  'jwt-like':   { label: 'JWT-style',    description: 'Three dot-separated base64url segments',       defaultLength: 0 },
  alphanumeric: { label: 'Alphanumeric', description: 'Letters and numbers (A-Z, a-z, 0-9)',           defaultLength: 32 },
  numeric:      { label: 'Numeric',      description: 'Digits only (0-9)',                             defaultLength: 16 },
};

function randomBytes(n: number): Uint8Array {
  const buf = new Uint8Array(n);
  crypto.getRandomValues(buf);
  return buf;
}

function toHex(buf: Uint8Array): string {
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

function toBase64Url(buf: Uint8Array): string {
  const binary = String.fromCharCode(...buf);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function toAlphanumeric(buf: Uint8Array, length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[buf[i % buf.length] % chars.length];
  }
  return result;
}

function toNumeric(buf: Uint8Array, length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += (buf[i % buf.length] % 10).toString();
  }
  return result;
}

function generateUUID(): string {
  const buf = randomBytes(16);
  buf[6] = (buf[6] & 0x0f) | 0x40; // version 4
  buf[8] = (buf[8] & 0x3f) | 0x80; // variant
  const hex = toHex(buf);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function generateKey(config: GeneratorConfig): string {
  const { format, length, prefix, separateEvery, separator } = config;
  let raw = '';

  if (format === 'uuid') {
    raw = generateUUID();
  } else if (format === 'jwt-like') {
    // header.payload.signature
    const header  = toBase64Url(randomBytes(12));
    const payload = toBase64Url(randomBytes(24));
    const sig     = toBase64Url(randomBytes(32));
    raw = `${header}.${payload}.${sig}`;
  } else if (format === 'hex') {
    raw = toHex(randomBytes(Math.ceil(length / 2))).slice(0, length);
  } else if (format === 'base64') {
    raw = toBase64Url(randomBytes(Math.ceil(length * 0.75))).slice(0, length);
  } else if (format === 'alphanumeric') {
    raw = toAlphanumeric(randomBytes(length + 8), length);
  } else if (format === 'numeric') {
    raw = toNumeric(randomBytes(length + 4), length);
  }

  // Apply separator grouping (skip for uuid/jwt-like)
  if (separateEvery > 0 && separator && format !== 'uuid' && format !== 'jwt-like') {
    const parts: string[] = [];
    for (let i = 0; i < raw.length; i += separateEvery) {
      parts.push(raw.slice(i, i + separateEvery));
    }
    raw = parts.join(separator);
  }

  return prefix ? `${prefix}${raw}` : raw;
}

function estimateEntropy(config: GeneratorConfig): number {
  const { format, length } = config;
  if (format === 'uuid') return 122;
  if (format === 'jwt-like') return (12 + 24 + 32) * 8;
  const bitsPerChar: Record<string, number> = {
    hex: 4, base64: 6, alphanumeric: 5.95, numeric: 3.32,
  };
  return Math.round((bitsPerChar[format] ?? 4) * length);
}

function entropyLabel(bits: number): { label: string; color: string } {
  if (bits < 64)  return { label: 'Weak',   color: 'text-red-400' };
  if (bits < 128) return { label: 'Good',   color: 'text-yellow-400' };
  if (bits < 192) return { label: 'Strong', color: 'text-green-400' };
  return { label: 'Very Strong', color: 'text-green-400' };
}

export default function ApiKeyGenerator() {
  const [config, setConfig] = useState<GeneratorConfig>({
    format: 'hex',
    length: 32,
    prefix: '',
    count: 1,
    separateEvery: 0,
    separator: '-',
  });
  const [keys, setKeys] = useState<string[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  const update = useCallback(<K extends keyof GeneratorConfig>(field: K, value: GeneratorConfig[K]) => {
    setConfig(prev => ({ ...prev, [field]: value }));
    setKeys([]); // reset on config change
  }, []);

  const handleFormatChange = (f: KeyFormat) => {
    const len = FORMAT_INFO[f].defaultLength || config.length;
    setConfig(prev => ({ ...prev, format: f, length: len }));
    setKeys([]);
  };

  const generate = () => {
    const generated: string[] = [];
    for (let i = 0; i < config.count; i++) {
      generated.push(generateKey(config));
    }
    setKeys(generated);
    setCopiedIdx(null);
    setCopiedAll(false);
  };

  const copy = async (text: string, idx: number) => {
    await navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(keys.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1500);
  };

  const isUuidOrJwt = config.format === 'uuid' || config.format === 'jwt-like';
  const entropy = estimateEntropy(config);
  const { label: entropyLabel_, color: entropyColor } = entropyLabel(entropy);

  return (
    <div class="space-y-5">
      {/* Format selector */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Key Format</label>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {(Object.keys(FORMAT_INFO) as KeyFormat[]).map(f => (
            <button
              key={f}
              onClick={() => handleFormatChange(f)}
              class={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                config.format === f
                  ? 'border-accent bg-accent/10 text-accent font-medium'
                  : 'border-border bg-surface text-text-muted hover:border-accent/50'
              }`}
            >
              <div class="font-medium">{FORMAT_INFO[f].label}</div>
              <div class="text-xs opacity-70 mt-0.5 leading-snug">{FORMAT_INFO[f].description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Options row */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Length */}
        {!isUuidOrJwt && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">
              Length: <span class="text-text font-semibold">{config.length}</span>
            </label>
            <input
              type="range"
              min={8}
              max={128}
              step={4}
              value={config.length}
              onInput={e => update('length', parseInt((e.target as HTMLInputElement).value))}
              class="w-full accent-accent"
            />
            <div class="flex justify-between text-xs text-text-muted mt-0.5">
              <span>8</span><span>128</span>
            </div>
          </div>
        )}

        {/* Count */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">
            Generate: <span class="text-text font-semibold">{config.count}</span> key{config.count > 1 ? 's' : ''}
          </label>
          <input
            type="range"
            min={1}
            max={20}
            value={config.count}
            onInput={e => update('count', parseInt((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-0.5">
            <span>1</span><span>20</span>
          </div>
        </div>
      </div>

      {/* Prefix + Separator (hide for uuid/jwt) */}
      {!isUuidOrJwt && (
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Prefix (optional)</label>
            <input
              type="text"
              value={config.prefix}
              onInput={e => update('prefix', (e.target as HTMLInputElement).value)}
              placeholder="sk-, pk_live_, ..."
              class="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Group every N chars</label>
            <input
              type="number"
              min={0}
              max={32}
              value={config.separateEvery}
              onInput={e => update('separateEvery', parseInt((e.target as HTMLInputElement).value) || 0)}
              class="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
          <div>
            <label class="block text-xs font-medium text-text-muted mb-1">Group separator</label>
            <input
              type="text"
              value={config.separator}
              onInput={e => update('separator', (e.target as HTMLInputElement).value)}
              maxLength={3}
              class="w-full text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>
      )}

      {/* Entropy indicator */}
      {!isUuidOrJwt && (
        <div class="text-sm text-text-muted">
          Estimated entropy: <span class={`font-semibold ${entropyColor}`}>{entropy} bits — {entropyLabel_}</span>
        </div>
      )}
      {config.format === 'uuid' && (
        <div class="text-sm text-text-muted">
          UUID v4 entropy: <span class="font-semibold text-green-400">122 bits — Very Strong</span>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={generate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Generate {config.count > 1 ? `${config.count} Keys` : 'Key'}
      </button>

      {/* Output */}
      {keys.length > 0 && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-muted">Generated Keys</span>
            {keys.length > 1 && (
              <button
                onClick={copyAll}
                class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors"
              >
                {copiedAll ? '✓ Copied all' : 'Copy all'}
              </button>
            )}
          </div>
          <div class="space-y-2">
            {keys.map((key, i) => (
              <div key={i} class="flex items-center gap-2 bg-surface border border-border rounded-lg px-3 py-2">
                <code class="flex-1 font-mono text-sm text-text break-all">{key}</code>
                <button
                  onClick={() => copy(key, i)}
                  class={`shrink-0 text-xs px-2 py-1 rounded border transition-colors ${
                    copiedIdx === i
                      ? 'border-green-500 text-green-400 bg-green-500/10'
                      : 'border-border hover:border-accent'
                  }`}
                >
                  {copiedIdx === i ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Usage note */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text mb-1">Security note</p>
        <p>Keys are generated entirely in your browser using <code class="font-mono bg-background px-1 rounded">crypto.getRandomValues()</code> — cryptographically secure and never sent to a server. Treat generated keys like passwords: store in a secret manager, rotate regularly, and never commit to source control.</p>
      </div>
    </div>
  );
}
