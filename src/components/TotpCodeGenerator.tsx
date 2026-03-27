import { useState, useEffect, useCallback } from 'preact/hooks';

// Base32 decode (RFC 4648)
function base32Decode(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of clean) {
    const idx = alphabet.indexOf(char);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

// HMAC-SHA1 using Web Crypto API
async function hmacSha1(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, data);
  return new Uint8Array(sig);
}

// Generate TOTP
async function generateTotp(secret: string, digits: number, period: number, time?: number): Promise<string> {
  const key = base32Decode(secret);
  if (key.length === 0) throw new Error('Invalid Base32 secret');

  const counter = Math.floor((time ?? Date.now() / 1000) / period);
  const counterBuf = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBuf[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const hmac = await hmacSha1(key, counterBuf);
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (code % Math.pow(10, digits)).toString().padStart(digits, '0');
}

function formatCode(code: string, digits: number): string {
  const half = Math.floor(digits / 2);
  return code.slice(0, half) + ' ' + code.slice(half);
}

const SAMPLE_SECRET = 'JBSWY3DPEHPK3PXP';

export default function TotpCodeGenerator() {
  const [secret, setSecret] = useState(SAMPLE_SECRET);
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [code, setCode] = useState('');
  const [nextCode, setNextCode] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(async () => {
    const trimmed = secret.trim();
    if (!trimmed) { setCode(''); setError(''); return; }
    try {
      const now = Date.now() / 1000;
      const current = await generateTotp(trimmed, digits, period, now);
      const next = await generateTotp(trimmed, digits, period, now + period);
      setCode(current);
      setNextCode(next);
      setError('');
    } catch (e: any) {
      setCode('');
      setError(e.message || 'Invalid secret');
    }
  }, [secret, digits, period]);

  useEffect(() => {
    generate();
    const interval = setInterval(() => {
      const remaining = period - (Math.floor(Date.now() / 1000) % period);
      setTimeLeft(remaining);
      if (remaining === period) generate(); // regenerate at period boundary
    }, 500);
    return () => clearInterval(interval);
  }, [generate, period]);

  const pct = timeLeft / period;
  const isUrgent = timeLeft <= 5;

  const copy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code.replace(' ', '')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-6">
      {/* Config */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="sm:col-span-3">
          <label class="block text-xs font-medium text-text-muted mb-1">Secret Key (Base32)</label>
          <input
            type="text"
            class="w-full font-mono text-sm bg-surface border border-border rounded-lg px-3 py-2 focus:outline-none focus:border-accent uppercase"
            value={secret}
            onInput={e => setSecret((e.target as HTMLInputElement).value.toUpperCase().replace(/\s/g, ''))}
            placeholder="e.g. JBSWY3DPEHPK3PXP"
            spellcheck={false}
          />
          {error && <p class="text-xs text-red-500 mt-1">{error}</p>}
          <p class="text-xs text-text-muted mt-1">Enter the Base32 secret from your app or QR code setup page.</p>
        </div>

        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">Digits</label>
          <select
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={digits}
            onChange={e => setDigits(parseInt((e.target as HTMLSelectElement).value, 10))}
          >
            <option value={6}>6 digits (standard)</option>
            <option value={8}>8 digits</option>
          </select>
        </div>

        <div>
          <label class="block text-xs font-medium text-text-muted mb-1">Period (seconds)</label>
          <select
            class="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
            value={period}
            onChange={e => setPeriod(parseInt((e.target as HTMLSelectElement).value, 10))}
          >
            <option value={30}>30s (standard)</option>
            <option value={60}>60s</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            onClick={() => setSecret(SAMPLE_SECRET)}
            class="w-full text-sm px-3 py-2 bg-surface border border-border rounded-lg text-text-muted hover:border-accent transition-colors"
          >
            Use Sample Secret
          </button>
        </div>
      </div>

      {/* Code display */}
      {code && (
        <div class="text-center space-y-4">
          {/* Timer ring */}
          <div class="flex justify-center">
            <div class="relative w-24 h-24">
              <svg class="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" stroke-width="6" class="text-border" />
                <circle
                  cx="50" cy="50" r="45"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="6"
                  stroke-dasharray={`${2 * Math.PI * 45}`}
                  stroke-dashoffset={`${2 * Math.PI * 45 * (1 - pct)}`}
                  class={`transition-all duration-500 ${isUrgent ? 'text-red-500' : 'text-accent'}`}
                  stroke-linecap="round"
                />
              </svg>
              <div class="absolute inset-0 flex items-center justify-center">
                <span class={`text-2xl font-bold tabular-nums ${isUrgent ? 'text-red-500' : ''}`}>{timeLeft}</span>
              </div>
            </div>
          </div>

          {/* Current code */}
          <div>
            <div class="text-xs text-text-muted mb-1 uppercase tracking-wide">Current Code</div>
            <div class={`text-5xl font-mono font-bold tracking-widest ${isUrgent ? 'text-red-500' : 'text-accent'}`}>
              {formatCode(code, digits)}
            </div>
          </div>

          <button
            onClick={copy}
            class={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-green-500 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
          >
            {copied ? '✓ Copied!' : 'Copy Code'}
          </button>

          {/* Next code */}
          {nextCode && (
            <div class="bg-surface border border-border rounded-lg p-3 text-sm">
              <span class="text-text-muted">Next code: </span>
              <span class="font-mono text-lg font-semibold text-text-muted">{formatCode(nextCode, digits)}</span>
              <span class="text-text-muted ml-2">(in {timeLeft}s)</span>
            </div>
          )}
        </div>
      )}

      {/* Info box */}
      <div class="bg-surface border border-border rounded-lg p-4 text-sm space-y-1.5">
        <div class="font-medium text-xs uppercase tracking-wide text-text-muted mb-2">Compatibility</div>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {['Google Authenticator', 'Authy', 'Microsoft Authenticator', '1Password'].map(app => (
            <span key={app} class="flex items-center gap-1.5 text-text-muted">
              <span class="text-green-500">✓</span>{app}
            </span>
          ))}
        </div>
        <p class="text-xs text-text-muted pt-1">
          This tool implements RFC 6238 TOTP (HMAC-SHA1, 6 digits, 30s). Compatible with any TOTP-based 2FA app.
          Runs entirely in your browser — your secret never leaves your machine.
        </p>
      </div>
    </div>
  );
}
