import { useState, useEffect } from 'preact/hooks';

type Format = 'unix-s' | 'unix-ms' | 'iso8601' | 'utc' | 'local' | 'rfc2822';

const FORMATS: { id: Format; label: string; example: string }[] = [
  { id: 'unix-s', label: 'Unix (seconds)', example: '1711238400' },
  { id: 'unix-ms', label: 'Unix (milliseconds)', example: '1711238400000' },
  { id: 'iso8601', label: 'ISO 8601', example: '2024-03-24T00:00:00.000Z' },
  { id: 'utc', label: 'UTC String', example: 'Sun, 24 Mar 2024 00:00:00 GMT' },
  { id: 'local', label: 'Local DateTime', example: '2024-03-24T08:00:00' },
  { id: 'rfc2822', label: 'RFC 2822 / Email', example: 'Sun, 24 Mar 2024 00:00:00 +0000' },
];

function parseInput(value: string, format: Format): Date | null {
  const v = value.trim();
  if (!v) return null;
  try {
    switch (format) {
      case 'unix-s': {
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        return new Date(n * 1000);
      }
      case 'unix-ms': {
        const n = parseFloat(v);
        if (isNaN(n)) return null;
        return new Date(n);
      }
      case 'iso8601':
      case 'utc':
      case 'rfc2822':
      case 'local': {
        const d = new Date(v);
        return isNaN(d.getTime()) ? null : d;
      }
    }
  } catch { return null; }
}

function toFormat(d: Date, format: Format): string {
  switch (format) {
    case 'unix-s': return Math.floor(d.getTime() / 1000).toString();
    case 'unix-ms': return d.getTime().toString();
    case 'iso8601': return d.toISOString();
    case 'utc': return d.toUTCString();
    case 'rfc2822': {
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      return `${days[d.getUTCDay()]}, ${d.getUTCDate()} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} ${String(d.getUTCHours()).padStart(2,'0')}:${String(d.getUTCMinutes()).padStart(2,'0')}:${String(d.getUTCSeconds()).padStart(2,'0')} +0000`;
    }
    case 'local': {
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }
  }
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }); }}
      class={`text-xs px-2.5 py-1 rounded font-medium transition-colors shrink-0 ${copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'}`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

export default function TimestampConverter() {
  const [inputFormat, setInputFormat] = useState<Format>('unix-s');
  const [inputValue, setInputValue] = useState('');
  const [now, setNow] = useState<Date>(new Date());
  const [parsed, setParsed] = useState<Date | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const handleInput = (v: string) => {
    setInputValue(v);
    if (!v.trim()) { setParsed(null); setError(''); return; }
    const d = parseInput(v, inputFormat);
    if (d) { setParsed(d); setError(''); }
    else { setParsed(null); setError(`Cannot parse as ${FORMATS.find(f => f.id === inputFormat)?.label}`); }
  };

  const handleFormatChange = (f: Format) => {
    setInputFormat(f);
    if (inputValue.trim()) {
      const d = parseInput(inputValue, f);
      if (d) { setParsed(d); setError(''); }
      else setError(`Cannot parse as ${FORMATS.find(fmt => fmt.id === f)?.label}`);
    }
  };

  const useNow = () => {
    const d = new Date();
    setParsed(d);
    setError('');
    setInputValue(toFormat(d, inputFormat));
  };

  return (
    <div class="space-y-6">
      {/* Live clock */}
      <div class="bg-bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div class="text-xs text-text-muted mb-1">Current Unix Timestamp</div>
          <code class="text-2xl font-mono font-bold text-primary">{Math.floor(now.getTime() / 1000)}</code>
        </div>
        <div class="text-right">
          <div class="text-xs text-text-muted mb-1">UTC</div>
          <code class="text-sm font-mono text-text-muted">{now.toUTCString()}</code>
        </div>
        <button
          onClick={useNow}
          class="bg-primary hover:bg-primary/80 text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors"
        >
          Use Now
        </button>
      </div>

      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div class="text-sm font-medium text-text-muted">Input Format</div>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {FORMATS.map(f => (
            <button
              key={f.id}
              onClick={() => handleFormatChange(f.id)}
              class={`text-xs px-3 py-2 rounded-lg text-left transition-colors border ${
                inputFormat === f.id
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary hover:text-text'
              }`}
            >
              <div class="font-medium">{f.label}</div>
              <div class="text-text-muted/60 mt-0.5 truncate font-mono text-[10px]">{f.example}</div>
            </button>
          ))}
        </div>
        <div>
          <input
            type="text"
            value={inputValue}
            onInput={(e: any) => handleInput(e.target.value)}
            placeholder={FORMATS.find(f => f.id === inputFormat)?.example}
            class="w-full bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
            spellcheck={false}
          />
          {error && <div class="text-red-400 text-xs mt-1.5">⚠ {error}</div>}
          {parsed && !error && (
            <div class="text-green-400 text-xs mt-1.5">✓ Parsed: {parsed.toISOString()}</div>
          )}
        </div>
      </div>

      {/* Conversions */}
      {parsed && (
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div class="text-sm font-medium text-text-muted">All Formats</div>
          <div class="divide-y divide-border">
            {FORMATS.map(f => {
              const converted = toFormat(parsed, f.id);
              return (
                <div key={f.id} class={`flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0 ${f.id === inputFormat ? 'opacity-60' : ''}`}>
                  <div class="w-36 shrink-0">
                    <div class="text-xs font-medium text-text">{f.label}</div>
                    {f.id === inputFormat && <div class="text-xs text-text-muted">(input)</div>}
                  </div>
                  <code class="flex-1 text-sm font-mono text-green-300 break-all">{converted}</code>
                  <CopyButton value={converted} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!parsed && !inputValue && (
        <div class="bg-bg-card border border-border rounded-xl p-6 text-center text-text-muted text-sm">
          Enter a timestamp above or click <strong>Use Now</strong> to convert the current time across all formats.
        </div>
      )}
    </div>
  );
}
