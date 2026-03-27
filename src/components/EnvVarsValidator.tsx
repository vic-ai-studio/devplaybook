import { useState, useMemo } from 'preact/hooks';

type Status = 'ok' | 'warning' | 'error';

interface EnvResult {
  lineNum: number;
  key: string;
  rawValue: string;
  displayValue: string;
  isSecret: boolean;
  status: Status;
  messages: string[];
}

const SECRET_PATTERN = /SECRET|KEY|TOKEN|PASSWORD|PASS|CREDENTIAL|PRIVATE|AUTH|CERT|SALT|SEED/i;
const WEAK_VALUES = new Set(['test', 'password', 'password123', '123456', 'secret', 'changeme', 'example', 'placeholder', 'xxx', 'your_key_here', 'replace_me', 'todo', 'fixme', '']);
const COMMON_LOCALHOST = /^(localhost|127\.0\.0\.1|::1|postgres:\/\/\w+:\w+@localhost|mysql:\/\/\w+:\w+@localhost|redis:\/\/localhost)/i;

function isSecretKey(key: string): boolean {
  return SECRET_PATTERN.test(key);
}

function maskValue(val: string): string {
  if (!val) return '';
  if (val.length <= 4) return '****';
  return val.slice(0, 2) + '****' + val.slice(-2);
}

function validateLine(raw: string, lineNum: number, seenKeys: Map<string, number>): EnvResult | null {
  const trimmed = raw.trim();

  // Skip blank lines and comments
  if (!trimmed || trimmed.startsWith('#')) return null;

  const eqIdx = raw.indexOf('=');
  if (eqIdx === -1) {
    return {
      lineNum,
      key: trimmed,
      rawValue: '',
      displayValue: '',
      isSecret: false,
      status: 'error',
      messages: ['Missing = sign — every line must be KEY=VALUE'],
    };
  }

  const key = raw.slice(0, eqIdx);
  const rawValue = raw.slice(eqIdx + 1);

  const messages: string[] = [];
  let status: Status = 'ok';

  // Key format checks
  if (key !== key.trim()) {
    messages.push('Key has leading/trailing spaces — remove spaces around the key');
    status = 'error';
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key.trim())) {
    messages.push('Key name should only contain letters, digits, and underscores, starting with a letter or underscore');
    status = 'error';
  }

  // Value parsing: detect unquoted spaces
  const normalKey = key.trim();
  let value = rawValue;

  // Strip inline comment for unquoted values
  const firstChar = rawValue.trimStart()[0];
  if (firstChar === '"') {
    const end = rawValue.indexOf('"', rawValue.indexOf('"') + 1);
    if (end === -1) {
      messages.push('Unclosed double quote');
      if (status === 'ok') status = 'error';
    } else {
      value = rawValue.slice(rawValue.indexOf('"') + 1, end);
    }
  } else if (firstChar === "'") {
    const end = rawValue.indexOf("'", rawValue.indexOf("'") + 1);
    if (end === -1) {
      messages.push('Unclosed single quote');
      if (status === 'ok') status = 'error';
    } else {
      value = rawValue.slice(rawValue.indexOf("'") + 1, end);
    }
  } else {
    // Unquoted
    value = rawValue.trim();
    if (rawValue !== rawValue.trimEnd() && !rawValue.includes('#')) {
      // trailing spaces
    }
    if (/\s/.test(value) && !value.includes('#')) {
      messages.push('Value contains spaces but is not quoted — wrap in double quotes: VAR="hello world"');
      if (status === 'ok') status = 'warning';
    }
  }

  // Empty value
  if (value === '') {
    messages.push('Value is empty');
    if (status === 'ok') status = 'warning';
  }

  // Duplicate key
  if (seenKeys.has(normalKey)) {
    messages.push(`Duplicate key — also defined on line ${seenKeys.get(normalKey)}`);
    if (status === 'ok') status = 'error';
  } else {
    seenKeys.set(normalKey, lineNum);
  }

  const secret = isSecretKey(normalKey);

  // Weak secret check
  if (secret && value) {
    const lower = value.toLowerCase();
    if (WEAK_VALUES.has(lower)) {
      messages.push('Secret key has a weak/common value — use a strong random value in production');
      if (status === 'ok') status = 'error';
    }
    if (COMMON_LOCALHOST.test(value) && normalKey.includes('DATABASE')) {
      messages.push('Database URL points to localhost — acceptable for development, not for production');
      if (status === 'ok') status = 'warning';
    }
    if (normalKey.includes('API_KEY') && value.length < 16) {
      messages.push('API key looks too short (under 16 chars)');
      if (status === 'ok') status = 'warning';
    }
  }

  if (messages.length === 0) {
    messages.push('Looks good');
  }

  const displayValue = secret ? maskValue(value) : value;

  return {
    lineNum,
    key: normalKey,
    rawValue: value,
    displayValue,
    isSecret: secret,
    status,
    messages,
  };
}

function analyzeEnv(text: string): EnvResult[] {
  const lines = text.split('\n');
  const seenKeys = new Map<string, number>();
  const results: EnvResult[] = [];
  lines.forEach((line, i) => {
    const r = validateLine(line, i + 1, seenKeys);
    if (r) results.push(r);
  });
  return results;
}

const SAMPLE = `# Production Environment
APP_NAME=MyApp
APP_ENV=production
PORT=3000
DEBUG=false

# Database
DATABASE_URL=postgresql://admin:password@localhost:5432/mydb
DB_POOL_SIZE=10

# Authentication
JWT_SECRET=secret
API_KEY=test
SESSION_TOKEN=

# External Services
STRIPE_SECRET_KEY=sk_live_abc123def456ghi789jkl
OPENAI_API_KEY=sk-proj-abc1234

# Bad examples (intentional)
BADKEY NAME=hello world
DUPLICATE_KEY=first
DUPLICATE_KEY=second
`;

const STATUS_COLORS: Record<Status, string> = {
  ok: 'text-green-400 bg-green-900/20 border-green-800',
  warning: 'text-yellow-400 bg-yellow-900/20 border-yellow-800',
  error: 'text-red-400 bg-red-900/20 border-red-800',
};
const STATUS_ICONS: Record<Status, string> = { ok: '✓', warning: '⚠', error: '✕' };
const STATUS_LABELS: Record<Status, string> = { ok: 'OK', warning: 'Warning', error: 'Error' };

export default function EnvVarsValidator() {
  const [input, setInput] = useState(SAMPLE);
  const [filterStatus, setFilterStatus] = useState<Status | 'all'>('all');

  const results = useMemo(() => analyzeEnv(input), [input]);
  const errors = results.filter(r => r.status === 'error').length;
  const warnings = results.filter(r => r.status === 'warning').length;
  const ok = results.filter(r => r.status === 'ok').length;
  const secrets = results.filter(r => r.isSecret).length;

  const filtered = filterStatus === 'all' ? results : results.filter(r => r.status === filterStatus);

  const filterBtns: Array<{ id: Status | 'all'; label: string; count?: number; color: string }> = [
    { id: 'all', label: 'All', count: results.length, color: 'border-gray-600 text-gray-300' },
    { id: 'error', label: 'Errors', count: errors, color: 'border-red-600 text-red-400' },
    { id: 'warning', label: 'Warnings', count: warnings, color: 'border-yellow-600 text-yellow-400' },
    { id: 'ok', label: 'OK', count: ok, color: 'border-green-600 text-green-400' },
  ];

  return (
    <div class="space-y-5">
      {/* Badges */}
      <div class="flex flex-wrap gap-3 text-xs text-gray-500">
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> Detects empty values</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> Duplicate keys</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> Weak secrets</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> Unquoted spaces</span>
        <span class="flex items-center gap-1.5"><span class="text-green-500">✓</span> Masks secret values</span>
      </div>

      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">.env file contents</span>
          <div class="flex gap-3">
            <button onClick={() => setInput(SAMPLE)} class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Load example</button>
            {input && <button onClick={() => setInput('')} class="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear</button>}
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder="Paste your .env file here..."
          rows={12}
          class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono resize-none focus:outline-none placeholder-gray-600"
          spellcheck={false}
        />
      </div>

      {/* Summary stats */}
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Variables', value: results.length, color: 'text-indigo-400' },
          { label: 'Errors', value: errors, color: errors > 0 ? 'text-red-400' : 'text-gray-500' },
          { label: 'Warnings', value: warnings, color: warnings > 0 ? 'text-yellow-400' : 'text-gray-500' },
          { label: 'Secrets masked', value: secrets, color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} class="bg-gray-900 border border-gray-700 rounded-xl p-3 text-center">
            <div class={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div class="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Score bar */}
      {results.length > 0 && (
        <div class="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-300">Health Score</span>
            <span class={`text-sm font-bold ${errors > 0 ? 'text-red-400' : warnings > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
              {errors > 0 ? 'Issues found' : warnings > 0 ? 'Review needed' : '✓ All good'}
            </span>
          </div>
          <div class="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
            <div
              class={`h-full rounded-full transition-all ${errors > 0 ? 'bg-red-500' : warnings > 0 ? 'bg-yellow-500' : 'bg-green-500'}`}
              style={{ width: `${Math.round((ok / Math.max(results.length, 1)) * 100)}%` }}
            />
          </div>
          <div class="flex justify-between text-xs text-gray-600 mt-1">
            <span>{ok} passing</span>
            <span>{Math.round((ok / Math.max(results.length, 1)) * 100)}%</span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      {results.length > 0 && (
        <div class="flex gap-2 flex-wrap">
          {filterBtns.map(b => (
            <button
              key={b.id}
              onClick={() => setFilterStatus(b.id)}
              class={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${
                filterStatus === b.id
                  ? b.color + ' bg-gray-800'
                  : 'border-gray-700 text-gray-600 hover:border-gray-500 hover:text-gray-400'
              }`}
            >
              {b.label}{b.count !== undefined ? ` (${b.count})` : ''}
            </button>
          ))}
        </div>
      )}

      {/* Results table */}
      {results.length > 0 && (
        <div class="overflow-x-auto rounded-xl border border-gray-700">
          <table class="w-full text-sm">
            <thead class="bg-gray-900 border-b border-gray-700">
              <tr>
                <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 w-10">#</th>
                <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">Key</th>
                <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 hidden sm:table-cell">Value</th>
                <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3 w-24">Status</th>
                <th class="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 py-3">Notes</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-800">
              {filtered.map(r => (
                <tr key={`${r.lineNum}-${r.key}`} class="bg-gray-950 hover:bg-gray-900 transition-colors">
                  <td class="px-3 py-2.5 text-xs text-gray-600 font-mono">{r.lineNum}</td>
                  <td class="px-3 py-2.5">
                    <div class="flex items-center gap-1.5">
                      <span class="font-mono text-sm text-indigo-300 font-semibold">{r.key}</span>
                      {r.isSecret && <span class="text-xs text-purple-400 bg-purple-900/20 border border-purple-800 px-1.5 py-0.5 rounded-full">secret</span>}
                    </div>
                  </td>
                  <td class="px-3 py-2.5 hidden sm:table-cell">
                    <span class="font-mono text-xs text-gray-400 break-all">
                      {r.displayValue
                        ? <span class={r.isSecret ? 'text-purple-300' : 'text-gray-300'}>{r.displayValue}</span>
                        : <span class="text-gray-600 italic">empty</span>
                      }
                    </span>
                  </td>
                  <td class="px-3 py-2.5">
                    <span class={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[r.status]}`}>
                      <span>{STATUS_ICONS[r.status]}</span>
                      <span>{STATUS_LABELS[r.status]}</span>
                    </span>
                  </td>
                  <td class="px-3 py-2.5">
                    <ul class="space-y-0.5">
                      {r.messages.map((msg, i) => (
                        <li key={i} class={`text-xs ${r.status === 'ok' ? 'text-gray-500' : r.status === 'warning' ? 'text-yellow-400/80' : 'text-red-400/80'}`}>
                          {msg}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colspan={5} class="px-4 py-8 text-center text-gray-500">No entries match the selected filter.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {results.length === 0 && (
        <div class="text-center py-8 text-gray-500">Paste a .env file above to start validation.</div>
      )}

      <p class="text-xs text-gray-600">All processing happens entirely in your browser — your environment variables are never sent to any server.</p>
    </div>
  );
}
