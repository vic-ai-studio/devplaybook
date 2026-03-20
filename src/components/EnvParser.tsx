import { useState, useMemo } from 'preact/hooks';

interface EnvEntry {
  key: string;
  value: string;
  comment: string;
  isComment: boolean;
  isBlank: boolean;
  line: number;
  error?: string;
}

function parseEnvFile(text: string): EnvEntry[] {
  const lines = text.split('\n');
  return lines.map((raw, i) => {
    const line = i + 1;
    const trimmed = raw.trim();

    if (!trimmed) return { key: '', value: '', comment: '', isComment: false, isBlank: true, line };
    if (trimmed.startsWith('#')) {
      return { key: '', value: '', comment: trimmed.slice(1).trim(), isComment: true, isBlank: false, line };
    }

    const eqIdx = raw.indexOf('=');
    if (eqIdx === -1) {
      return { key: trimmed, value: '', comment: '', isComment: false, isBlank: false, line, error: 'Missing = sign' };
    }

    const key = raw.slice(0, eqIdx).trim();
    let rest = raw.slice(eqIdx + 1);

    // Strip inline comment (unquoted part)
    let inlineComment = '';
    let value = rest;

    // Handle quotes
    const firstChar = rest.trimStart()[0];
    if (firstChar === '"' || firstChar === "'") {
      const quoteChar = firstChar;
      const start = rest.indexOf(quoteChar);
      const end = rest.indexOf(quoteChar, start + 1);
      if (end === -1) {
        return { key, value: rest.trim(), comment: '', isComment: false, isBlank: false, line, error: `Unclosed ${quoteChar} quote` };
      }
      value = rest.slice(start + 1, end);
      inlineComment = rest.slice(end + 1).trim().replace(/^#\s*/, '');
    } else {
      // Unquoted: strip inline comment
      const commentIdx = rest.indexOf(' #');
      if (commentIdx !== -1) {
        inlineComment = rest.slice(commentIdx + 2).trim();
        value = rest.slice(0, commentIdx).trim();
      } else {
        value = rest.trim();
      }
    }

    // Validate key
    const keyError = /^[A-Za-z_][A-Za-z0-9_]*$/.test(key) ? undefined : 'Key should match [A-Za-z_][A-Za-z0-9_]*';

    return { key, value, comment: inlineComment, isComment: false, isBlank: false, line, error: keyError };
  });
}

function toTemplate(entries: EnvEntry[]): string {
  return entries.map(e => {
    if (e.isBlank) return '';
    if (e.isComment) return `# ${e.comment}`;
    return `${e.key}=`;
  }).join('\n');
}

function toExportScript(entries: EnvEntry[]): string {
  return entries
    .filter(e => !e.isBlank && !e.isComment && e.key)
    .map(e => `export ${e.key}="${e.value.replace(/"/g, '\\"')}"`)
    .join('\n');
}

const SAMPLE = `# App configuration
APP_NAME=My App
APP_ENV=development
DEBUG=true

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_POOL_SIZE=5

# API Keys
OPENAI_API_KEY=sk-proj-abc123...
STRIPE_SECRET_KEY=sk_test_...

# Feature flags
ENABLE_BETA=false
MAX_UPLOAD_MB=10
`;

export default function EnvParser() {
  const [text, setText] = useState(SAMPLE);
  const [tab, setTab] = useState<'parsed' | 'template' | 'export'>('parsed');
  const [copied, setCopied] = useState('');
  const [filter, setFilter] = useState('');
  const [showValues, setShowValues] = useState(true);

  const entries = useMemo(() => parseEnvFile(text), [text]);
  const errors = entries.filter(e => e.error);
  const vars = entries.filter(e => !e.isBlank && !e.isComment && e.key);
  const filtered = filter
    ? vars.filter(e => e.key.toLowerCase().includes(filter.toLowerCase()) || e.value.toLowerCase().includes(filter.toLowerCase()))
    : vars;

  function copy(str: string, label: string) {
    navigator.clipboard?.writeText(str);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  }

  const tabs = [
    { id: 'parsed', label: `Parsed (${vars.length})` },
    { id: 'template', label: 'Template' },
    { id: 'export', label: 'Shell Export' },
  ] as const;

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">.env file contents</span>
          <div class="flex gap-2">
            <button onClick={() => setText(SAMPLE)} class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Load sample</button>
            {text && <button onClick={() => setText('')} class="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear</button>}
          </div>
        </div>
        <textarea
          value={text}
          onInput={e => setText((e.target as HTMLTextAreaElement).value)}
          placeholder="Paste your .env file here..."
          rows={10}
          class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono resize-none focus:outline-none placeholder-gray-600"
          spellcheck={false}
        />
      </div>

      {/* Stats */}
      <div class="grid grid-cols-3 gap-3">
        {[
          { label: 'Variables', value: vars.length, color: 'text-indigo-400' },
          { label: 'Errors', value: errors.length, color: errors.length > 0 ? 'text-red-400' : 'text-green-400' },
          { label: 'Comments', value: entries.filter(e => e.isComment).length, color: 'text-gray-400' },
        ].map(s => (
          <div key={s.label} class="bg-gray-900 rounded-xl border border-gray-700 p-4 text-center">
            <div class={`text-2xl font-bold ${s.color}`}>{s.value}</div>
            <div class="text-xs text-gray-400 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div class="bg-red-950/20 border border-red-800 rounded-xl p-4 space-y-1">
          <p class="text-sm font-medium text-red-400 mb-2">Errors found</p>
          {errors.map(e => (
            <div key={e.line} class="text-xs text-red-300">Line {e.line}: <code class="text-red-200">{e.key || '?'}</code> — {e.error}</div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div class="flex gap-1 bg-gray-900 border border-gray-700 p-1 rounded-xl">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            class={`flex-1 text-sm font-medium px-3 py-2 rounded-lg transition-colors ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-gray-200'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Parsed tab */}
      {tab === 'parsed' && (
        <div class="space-y-3">
          <div class="flex gap-3 items-center">
            <input
              type="text"
              value={filter}
              onInput={e => setFilter((e.target as HTMLInputElement).value)}
              placeholder="Filter variables..."
              class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => setShowValues(v => !v)}
              class="text-xs text-gray-400 hover:text-gray-200 border border-gray-700 px-3 py-2 rounded-lg transition-colors"
            >
              {showValues ? '👁️ Hide values' : '👁️ Show values'}
            </button>
          </div>

          <div class="space-y-2">
            {filtered.map(e => (
              <div key={`${e.line}-${e.key}`} class="bg-gray-900 rounded-xl border border-gray-700 p-3 flex items-start gap-3">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-mono text-sm text-indigo-300 font-semibold">{e.key}</span>
                    {e.error && <span class="text-xs text-red-400 bg-red-950/30 border border-red-900 px-2 py-0.5 rounded-full">{e.error}</span>}
                  </div>
                  {showValues ? (
                    <span class="font-mono text-xs text-gray-300 break-all">{e.value || <span class="text-gray-600 italic">empty</span>}</span>
                  ) : (
                    <span class="font-mono text-xs text-gray-600">{'•'.repeat(Math.min(e.value.length, 20))}</span>
                  )}
                  {e.comment && <div class="text-xs text-gray-500 mt-1">#{e.comment}</div>}
                </div>
                <button
                  onClick={() => copy(`${e.key}=${e.value}`, e.key)}
                  class="text-xs text-gray-500 hover:text-indigo-400 shrink-0 border border-gray-700 hover:border-indigo-500 px-2 py-1 rounded-lg transition-colors"
                >
                  {copied === e.key ? '✓' : 'Copy'}
                </button>
              </div>
            ))}
            {filtered.length === 0 && vars.length > 0 && (
              <div class="text-sm text-gray-500 text-center py-4">No variables match "{filter}"</div>
            )}
          </div>
        </div>
      )}

      {/* Template tab */}
      {tab === 'template' && (
        <div class="space-y-3">
          <p class="text-sm text-gray-400">Template with keys only — safe to share or commit to version control.</p>
          <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span class="text-xs text-gray-400">.env.template</span>
              <button
                onClick={() => copy(toTemplate(entries), 'template')}
                class="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
              >
                {copied === 'template' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs text-gray-300 px-4 py-3 overflow-x-auto font-mono whitespace-pre-wrap">{toTemplate(entries)}</pre>
          </div>
        </div>
      )}

      {/* Export tab */}
      {tab === 'export' && (
        <div class="space-y-3">
          <p class="text-sm text-gray-400">Shell export commands to source in your terminal.</p>
          <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
            <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
              <span class="text-xs text-gray-400">bash / zsh</span>
              <button
                onClick={() => copy(toExportScript(entries), 'export')}
                class="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
              >
                {copied === 'export' ? '✓ Copied' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs text-gray-300 px-4 py-3 overflow-x-auto font-mono whitespace-pre-wrap">{toExportScript(entries)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}
