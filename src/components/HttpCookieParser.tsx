import { useState } from 'preact/hooks';

interface ParsedCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  expiresDate?: string;
  maxAge?: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite?: string;
  partitioned: boolean;
}

function parseCookieHeader(raw: string): ParsedCookie | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parts = trimmed.split(';').map(p => p.trim());
  if (parts.length === 0) return null;

  // First part is name=value
  const firstEq = parts[0].indexOf('=');
  if (firstEq === -1) return null;

  const name = parts[0].slice(0, firstEq).trim();
  const value = parts[0].slice(firstEq + 1).trim();

  const result: ParsedCookie = {
    name,
    value,
    httpOnly: false,
    secure: false,
    partitioned: false,
  };

  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const eqIdx = part.indexOf('=');
    const key = eqIdx === -1 ? part.trim().toLowerCase() : part.slice(0, eqIdx).trim().toLowerCase();
    const val = eqIdx === -1 ? '' : part.slice(eqIdx + 1).trim();

    if (key === 'domain') result.domain = val;
    else if (key === 'path') result.path = val;
    else if (key === 'expires') {
      result.expires = val;
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
          const now = new Date();
          const diffMs = d.getTime() - now.getTime();
          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
          result.expiresDate = `${d.toISOString().replace('T', ' ').slice(0, 19)} UTC${
            diffMs < 0 ? ` (expired ${Math.abs(diffDays)}d ago)` : ` (in ${diffDays}d)`
          }`;
        }
      } catch {}
    }
    else if (key === 'max-age') result.maxAge = val;
    else if (key === 'httponly') result.httpOnly = true;
    else if (key === 'secure') result.secure = true;
    else if (key === 'samesite') result.sameSite = val || 'Lax';
    else if (key === 'partitioned') result.partitioned = true;
  }

  return result;
}

const EXAMPLES = [
  {
    label: 'Session cookie',
    value: 'sessionId=abc123xyz; Path=/; HttpOnly; Secure; SameSite=Strict',
  },
  {
    label: 'Persistent cookie',
    value: 'user_pref=dark_mode; Domain=example.com; Path=/; Expires=Fri, 01 Jan 2027 00:00:00 GMT; SameSite=Lax',
  },
  {
    label: 'Max-Age cookie',
    value: 'token=eyJhbGciOiJIUzI1NiJ9; Path=/api; Max-Age=3600; HttpOnly; Secure; SameSite=None; Partitioned',
  },
];

function Row({ label, value, mono = false, badge }: { label: string; value: string; mono?: boolean; badge?: 'green' | 'yellow' | 'red' }) {
  const badgeClass = badge === 'green' ? 'text-green-400 bg-green-400/10 border-green-400/20'
    : badge === 'yellow' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
    : badge === 'red' ? 'text-red-400 bg-red-400/10 border-red-400/20' : '';

  return (
    <div class="flex gap-3 py-2 border-b border-border/50 last:border-0">
      <span class="text-text-muted text-sm w-28 shrink-0">{label}</span>
      {badge ? (
        <span class={`text-xs font-medium px-2 py-0.5 rounded border ${badgeClass}`}>{value}</span>
      ) : (
        <span class={`text-sm text-text break-all ${mono ? 'font-mono' : ''}`}>{value || '—'}</span>
      )}
    </div>
  );
}

export default function HttpCookieParser() {
  const [input, setInput] = useState('');
  const [parsed, setParsed] = useState<ParsedCookie | null>(null);
  const [error, setError] = useState('');

  const parse = () => {
    // Strip "Set-Cookie:" prefix if present
    const cleaned = input.replace(/^set-cookie\s*:\s*/i, '').trim();
    const result = parseCookieHeader(cleaned);
    if (result) {
      setParsed(result);
      setError('');
    } else {
      setParsed(null);
      setError('Could not parse cookie header. Make sure it follows the format: name=value; Attribute; ...');
    }
  };

  const loadExample = (val: string) => {
    setInput(val);
    const result = parseCookieHeader(val);
    setParsed(result);
    setError('');
  };

  return (
    <div class="space-y-5">
      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        {EXAMPLES.map(ex => (
          <button
            key={ex.label}
            onClick={() => loadExample(ex.value)}
            class="text-xs px-3 py-1.5 bg-surface border border-border rounded-full text-text-muted hover:border-brand hover:text-brand transition-colors"
          >
            {ex.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text mb-2">
          Set-Cookie Header Value
        </label>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder="sessionId=abc123; Path=/; HttpOnly; Secure; SameSite=Strict; Expires=Thu, 01 Jan 2026 00:00:00 GMT"
          rows={3}
          class="w-full px-3 py-2.5 bg-surface border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-brand resize-y"
        />
        <p class="text-xs text-text-muted mt-1">Paste a <code class="bg-surface px-1 rounded">Set-Cookie</code> header value (with or without the "Set-Cookie:" prefix)</p>
      </div>

      <button
        onClick={parse}
        class="px-5 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand/90 transition-colors"
      >
        Parse Cookie
      </button>

      {error && (
        <div class="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">{error}</div>
      )}

      {parsed && (
        <div class="bg-surface border border-border rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-border bg-surface/50">
            <h3 class="font-semibold text-text text-sm">Parsed Cookie Attributes</h3>
          </div>
          <div class="px-4 py-2">
            <Row label="Name" value={parsed.name} mono />
            <Row label="Value" value={parsed.value} mono />
            {parsed.domain && <Row label="Domain" value={parsed.domain} />}
            {parsed.path && <Row label="Path" value={parsed.path} mono />}
            {parsed.expires && <Row label="Expires" value={parsed.expiresDate || parsed.expires} />}
            {parsed.maxAge && <Row label="Max-Age" value={`${parsed.maxAge}s (${Math.round(Number(parsed.maxAge) / 3600)}h)`} />}
            <Row
              label="HttpOnly"
              value={parsed.httpOnly ? 'Yes — JS cannot access via document.cookie' : 'No — accessible via document.cookie'}
              badge={parsed.httpOnly ? 'green' : 'yellow'}
            />
            <Row
              label="Secure"
              value={parsed.secure ? 'Yes — HTTPS only' : 'No — sent over HTTP and HTTPS'}
              badge={parsed.secure ? 'green' : 'yellow'}
            />
            {parsed.sameSite && (
              <Row
                label="SameSite"
                value={`${parsed.sameSite}${
                  parsed.sameSite === 'Strict' ? ' — not sent on cross-site requests'
                  : parsed.sameSite === 'Lax' ? ' — sent on top-level navigation'
                  : parsed.sameSite === 'None' ? ' — requires Secure flag'
                  : ''
                }`}
                badge={parsed.sameSite === 'Strict' ? 'green' : parsed.sameSite === 'Lax' ? 'yellow' : 'red'}
              />
            )}
            {parsed.partitioned && (
              <Row label="Partitioned" value="Yes — CHIPS (Cookies Having Independent Partitioned State)" badge="green" />
            )}
          </div>
        </div>
      )}

      {parsed && (
        <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-1">
          <p class="font-medium text-text text-sm mb-2">Security Summary</p>
          {!parsed.httpOnly && <p class="text-yellow-400">⚠ Missing HttpOnly — this cookie is readable by JavaScript (XSS risk)</p>}
          {!parsed.secure && <p class="text-yellow-400">⚠ Missing Secure — this cookie can be sent over HTTP</p>}
          {!parsed.sameSite && <p class="text-yellow-400">⚠ Missing SameSite — defaults to Lax in modern browsers, but explicit is better</p>}
          {parsed.httpOnly && parsed.secure && parsed.sameSite && (
            <p class="text-green-400">✓ Good security flags set (HttpOnly + Secure + SameSite)</p>
          )}
        </div>
      )}
    </div>
  );
}
