import { useState, useCallback, useEffect } from 'preact/hooks';
import { isProUser, canUse, recordUsage, remainingUses, FREE_DAILY_LIMIT } from '../utils/pro';

const CHARS = {
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  numbers: '0123456789',
  symbols: '!@#$%^&*()-_=+[]{}|;:,.<>?',
};

function generatePassword(
  length: number,
  opts: { uppercase: boolean; lowercase: boolean; numbers: boolean; symbols: boolean; excludeAmbiguous: boolean }
): string {
  let charset = '';
  if (opts.uppercase) charset += opts.excludeAmbiguous ? CHARS.uppercase.replace(/[IOl]/g, '') : CHARS.uppercase;
  if (opts.lowercase) charset += opts.excludeAmbiguous ? CHARS.lowercase.replace(/[lo]/g, '') : CHARS.lowercase;
  if (opts.numbers) charset += opts.excludeAmbiguous ? CHARS.numbers.replace(/[01]/g, '') : CHARS.numbers;
  if (opts.symbols) charset += CHARS.symbols;
  if (!charset) return '';

  const arr = new Uint32Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, v => charset[v % charset.length]).join('');
}

function strengthLabel(pw: string): { label: string; color: string; width: string } {
  if (!pw) return { label: '', color: 'bg-border', width: '0%' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 16) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: '25%' };
  if (score <= 4) return { label: 'Fair', color: 'bg-yellow-500', width: '50%' };
  if (score <= 5) return { label: 'Strong', color: 'bg-blue-500', width: '75%' };
  return { label: 'Very Strong', color: 'bg-green-500', width: '100%' };
}

export default function PasswordGenerator() {
  const [length, setLength] = useState(16);
  const [opts, setOpts] = useState({ uppercase: true, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: false });
  const [password, setPassword] = useState(() => generatePassword(16, { uppercase: true, lowercase: true, numbers: true, symbols: false, excludeAmbiguous: false }));
  const [copied, setCopied] = useState(false);
  const [bulkCount, setBulkCount] = useState(10);
  const [bulk, setBulk] = useState<string[]>([]);
  const [pro, setPro] = useState(false);
  const [remaining, setRemaining] = useState(FREE_DAILY_LIMIT);
  const [limitHit, setLimitHit] = useState(false);

  useEffect(() => {
    setPro(isProUser());
    setRemaining(remainingUses('password-generator'));
  }, []);

  const generate = useCallback(() => {
    if (!pro && !canUse('password-generator')) {
      setLimitHit(true);
      return;
    }
    setPassword(generatePassword(length, opts));
    setCopied(false);
    if (!pro) {
      recordUsage('password-generator');
      setRemaining(remainingUses('password-generator'));
    }
    setLimitHit(false);
  }, [length, opts, pro]);

  const copy = () => {
    if (!password) return;
    navigator.clipboard.writeText(password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const generateBulk = () => {
    if (!pro) return; // Pro only
    const list = Array.from({ length: bulkCount }, () => generatePassword(length, opts));
    setBulk(list);
  };

  const toggle = (key: keyof typeof opts) => {
    const newOpts = { ...opts, [key]: !opts[key] };
    setOpts(newOpts);
    if (pro || canUse('password-generator')) {
      setPassword(generatePassword(length, newOpts));
    }
  };

  const strength = strengthLabel(password);

  return (
    <div class="space-y-6">
      {/* Output */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex items-center gap-3">
          <code class="flex-1 text-lg font-mono text-text break-all select-all">{password || <span class="text-text-muted italic">Select at least one character type</span>}</code>
          <button
            onClick={copy}
            disabled={!password}
            class="shrink-0 bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
          <button
            onClick={generate}
            title="Regenerate"
            class="shrink-0 border border-border hover:border-primary text-text-muted hover:text-primary text-sm px-3 py-2 rounded-lg transition-colors"
          >
            ↻
          </button>
        </div>

        {password && (
          <div class="mt-3">
            <div class="flex justify-between text-xs text-text-muted mb-1">
              <span>Strength</span>
              <span class={strength.label === 'Very Strong' ? 'text-green-400' : strength.label === 'Strong' ? 'text-blue-400' : strength.label === 'Fair' ? 'text-yellow-400' : 'text-red-400'}>{strength.label}</span>
            </div>
            <div class="h-1.5 bg-border rounded-full overflow-hidden">
              <div class={`h-full rounded-full transition-all ${strength.color}`} style={{ width: strength.width }} />
            </div>
          </div>
        )}
      </div>

      {/* Usage indicator */}
      {!pro && (
        <div class="flex items-center justify-between text-xs">
          <span class="text-text-muted">
            {remaining > 0 ? `${remaining} free generate${remaining !== 1 ? 's' : ''} remaining today` : 'Daily limit reached'}
          </span>
          <a href="/pro" class="text-primary hover:underline">Upgrade for unlimited →</a>
        </div>
      )}

      {/* Limit hit banner */}
      {limitHit && (
        <div class="bg-yellow-500/10 border border-yellow-500/40 rounded-lg p-4 flex items-center justify-between">
          <div>
            <p class="text-sm font-medium text-yellow-400">Daily limit reached ({FREE_DAILY_LIMIT}/{FREE_DAILY_LIMIT} uses today)</p>
            <p class="text-xs text-text-muted mt-0.5">Upgrade to Pro for unlimited generation + bulk passwords.</p>
          </div>
          <a href="/pro" class="shrink-0 ml-4 bg-primary text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors">
            Go Pro →
          </a>
        </div>
      )}

      {/* Length */}
      <div>
        <div class="flex justify-between mb-2">
          <label class="text-sm font-medium text-text">Length</label>
          <span class="text-sm font-mono text-primary">{length}</span>
        </div>
        <input
          type="range"
          min={4}
          max={128}
          value={length}
          onInput={(e) => {
            const n = Number((e.target as HTMLInputElement).value);
            setLength(n);
            if (pro || canUse('password-generator')) setPassword(generatePassword(n, opts));
          }}
          class="w-full accent-primary"
        />
        <div class="flex justify-between text-xs text-text-muted mt-1">
          <span>4</span><span>128</span>
        </div>
      </div>

      {/* Options */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {([
          ['uppercase', 'A–Z Uppercase'],
          ['lowercase', 'a–z Lowercase'],
          ['numbers', '0–9 Numbers'],
          ['symbols', '!@# Symbols'],
          ['excludeAmbiguous', 'Exclude Ambiguous (0, O, l, 1)'],
        ] as [keyof typeof opts, string][]).map(([key, label]) => (
          <label key={key} class={`flex items-center gap-2 cursor-pointer p-3 rounded-lg border transition-colors ${opts[key] ? 'border-primary bg-primary/10' : 'border-border bg-bg-card'}`}>
            <input
              type="checkbox"
              checked={opts[key]}
              onChange={() => toggle(key)}
              class="accent-primary"
            />
            <span class="text-sm text-text">{label}</span>
          </label>
        ))}
      </div>

      {/* Bulk Generate — Pro only */}
      <div class={`border rounded-xl p-4 space-y-3 ${pro ? 'border-border' : 'border-border/50 opacity-80'}`}>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <h3 class="text-sm font-semibold text-text">Bulk Generate</h3>
            {!pro && (
              <span class="text-xs bg-primary/10 text-primary border border-primary/30 px-2 py-0.5 rounded-full">Pro</span>
            )}
          </div>
          {pro ? (
            <div class="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={500}
                value={bulkCount}
                onInput={(e) => setBulkCount(Math.max(1, Math.min(500, Number((e.target as HTMLInputElement).value))))}
                class="w-16 text-sm bg-bg border border-border rounded px-2 py-1 text-text text-center"
              />
              <span class="text-sm text-text-muted">passwords</span>
              <button
                onClick={generateBulk}
                class="bg-bg border border-border hover:border-primary text-sm text-text hover:text-primary px-3 py-1.5 rounded-lg transition-colors"
              >
                Generate
              </button>
            </div>
          ) : (
            <a href="/pro" class="text-xs text-primary hover:underline">Unlock with Pro →</a>
          )}
        </div>

        {!pro && (
          <p class="text-xs text-text-muted">Generate up to 500 passwords at once. Available with Pro subscription.</p>
        )}

        {pro && bulk.length > 0 && (
          <div class="space-y-1 max-h-48 overflow-y-auto">
            {bulk.map((pw, i) => (
              <div key={i} class="flex items-center gap-2 bg-bg rounded px-2 py-1">
                <code class="flex-1 text-xs font-mono text-text break-all">{pw}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(pw)}
                  class="text-xs text-text-muted hover:text-primary transition-colors shrink-0"
                >Copy</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {pro && <p class="text-xs text-primary text-right">✓ Pro — unlimited generation</p>}
    </div>
  );
}
