import { useState, useEffect, useCallback } from 'preact/hooks';

function copyToClipboard(text: string, setCopied: (v: boolean) => void) {
  navigator.clipboard.writeText(text).then(() => {
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  });
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => copyToClipboard(value, setCopied)}
      class={`text-xs px-3 py-1 rounded-md font-medium transition-colors whitespace-nowrap ${
        copied
          ? 'bg-green-700 text-white'
          : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function OutputRow({ label, value }: { label: string; value: string }) {
  return (
    <div class="flex items-center justify-between gap-3 py-2.5 border-b border-border last:border-0">
      <span class="text-sm text-text-muted w-28 shrink-0">{label}</span>
      <code class="flex-1 text-sm font-mono text-green-300 break-all">{value}</code>
      <CopyButton value={value} />
    </div>
  );
}

function formatUnix(ts: number, tz: 'utc' | 'local'): Record<string, string> {
  const d = new Date(ts * 1000);
  if (isNaN(d.getTime())) return {};

  const opts = (extra?: Intl.DateTimeFormatOptions): Intl.DateTimeFormatOptions => ({
    timeZone: tz === 'utc' ? 'UTC' : undefined,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    ...extra,
  });

  const iso = tz === 'utc' ? d.toISOString() : d.toISOString().replace('Z', getLocalOffsetStr(d));
  const utcStr = d.toUTCString();
  const localStr = tz === 'utc'
    ? new Intl.DateTimeFormat('en-US', opts()).format(d) + ' UTC'
    : new Intl.DateTimeFormat('en-US', opts()).format(d) + ' ' + Intl.DateTimeFormat().resolvedOptions().timeZone;

  return {
    'ISO 8601': iso,
    'UTC String': utcStr,
    'Local / Selected': localStr,
    'Date Only': tz === 'utc'
      ? d.toISOString().slice(0, 10)
      : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
  };
}

function getLocalOffsetStr(d: Date): string {
  const off = -d.getTimezoneOffset();
  const sign = off >= 0 ? '+' : '-';
  const h = String(Math.floor(Math.abs(off) / 60)).padStart(2, '0');
  const m = String(Math.abs(off) % 60).padStart(2, '0');
  return `${sign}${h}:${m}`;
}

function parseDateToUnix(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return null;
  return Math.floor(d.getTime() / 1000);
}

export default function UnixTimestamp() {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  const [tsInput, setTsInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [tz, setTz] = useState<'utc' | 'local'>('utc');
  const [tsError, setTsError] = useState('');
  const [dateError, setDateError] = useState('');
  const [tsResult, setTsResult] = useState<Record<string, string>>({});
  const [dateResult, setDateResult] = useState<number | null>(null);
  const [copiedNow, setCopiedNow] = useState(false);

  // Auto-update live clock
  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const convertTs = useCallback(() => {
    const num = parseInt(tsInput.trim(), 10);
    if (isNaN(num)) {
      setTsError('Please enter a valid integer Unix timestamp.');
      setTsResult({});
      return;
    }
    // Guard unreasonable values (before 1970 or far future)
    if (num < 0 || num > 9999999999) {
      setTsError('Timestamp out of reasonable range (0 – 9999999999).');
      setTsResult({});
      return;
    }
    setTsError('');
    setTsResult(formatUnix(num, tz));
  }, [tsInput, tz]);

  const convertDate = useCallback(() => {
    const result = parseDateToUnix(dateInput);
    if (result === null) {
      setDateError('Could not parse date. Try formats like "2024-06-15", "June 15 2024 10:00:00", or an ISO 8601 string.');
      setDateResult(null);
      return;
    }
    setDateError('');
    setDateResult(result);
  }, [dateInput]);

  // Re-run conversion when timezone changes if there's a result
  useEffect(() => {
    if (tsInput && Object.keys(tsResult).length > 0) convertTs();
  }, [tz]);

  const localTz = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : 'Local';

  return (
    <div class="space-y-6">
      {/* Live clock */}
      <div class="bg-bg-card rounded-xl p-6 border border-border">
        <div class="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p class="text-sm text-text-muted mb-1">Current Unix Timestamp</p>
            <p class="text-4xl font-mono font-bold text-primary tabular-nums">{now}</p>
          </div>
          <button
            onClick={() => copyToClipboard(String(now), setCopiedNow)}
            class={`px-5 py-2.5 rounded-lg font-semibold text-sm transition-colors ${
              copiedNow ? 'bg-green-700 text-white' : 'bg-primary text-white hover:opacity-90'
            }`}
          >
            {copiedNow ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <p class="text-xs text-text-muted mt-3">Updates every second — seconds elapsed since 1970-01-01 00:00:00 UTC</p>
      </div>

      {/* Timezone selector */}
      <div class="flex items-center gap-3">
        <span class="text-sm text-text-muted">Output timezone:</span>
        {(['utc', 'local'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTz(t)}
            class={`text-sm px-4 py-1.5 rounded-md border transition-colors font-medium ${
              tz === t
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-card border-border text-text-muted hover:border-primary'
            }`}
          >
            {t === 'utc' ? 'UTC' : `Local (${localTz})`}
          </button>
        ))}
      </div>

      {/* Timestamp → Date */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 class="font-semibold text-base">Unix Timestamp → Human-Readable Date</h2>
        <div class="flex gap-3">
          <input
            type="text"
            value={tsInput}
            onInput={e => setTsInput((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && convertTs()}
            placeholder="e.g. 1718438400"
            class="flex-1 bg-bg-card border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none font-mono"
          />
          <button
            onClick={convertTs}
            class="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Convert
          </button>
        </div>
        {tsError && <p class="text-red-400 text-sm">{tsError}</p>}
        {Object.keys(tsResult).length > 0 && (
          <div class="border border-border rounded-lg px-4 divide-y divide-border">
            {Object.entries(tsResult).map(([label, value]) => (
              <OutputRow key={label} label={label} value={value} />
            ))}
          </div>
        )}
      </div>

      {/* Date → Timestamp */}
      <div class="bg-bg-card rounded-xl p-6 border border-border space-y-4">
        <h2 class="font-semibold text-base">Human-Readable Date → Unix Timestamp</h2>
        <div class="flex gap-3">
          <input
            type="text"
            value={dateInput}
            onInput={e => setDateInput((e.target as HTMLInputElement).value)}
            onKeyDown={e => e.key === 'Enter' && convertDate()}
            placeholder="e.g. 2024-06-15T10:00:00Z or June 15 2024"
            class="flex-1 bg-bg-card border border-border rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
          <button
            onClick={convertDate}
            class="bg-primary text-white px-5 py-2 rounded-lg font-semibold text-sm hover:opacity-90 transition-opacity whitespace-nowrap"
          >
            Convert
          </button>
        </div>
        {dateError && <p class="text-red-400 text-sm">{dateError}</p>}
        {dateResult !== null && (
          <div class="border border-border rounded-lg px-4">
            <OutputRow label="Unix Timestamp" value={String(dateResult)} />
          </div>
        )}
      </div>

      {/* Info */}
      <div class="bg-bg-card/50 rounded-lg border border-border p-4 text-sm text-text-muted space-y-1">
        <p class="font-medium text-white">About Unix Timestamps</p>
        <p>A Unix timestamp is the number of seconds elapsed since the <strong class="text-white">Unix Epoch</strong> (January 1, 1970, 00:00:00 UTC), not counting leap seconds. Widely used in APIs, databases, and log files.</p>
        <p class="text-xs mt-1">The Year 2038 Problem affects 32-bit signed integers, which overflow at timestamp <code class="font-mono">2147483647</code> (2038-01-19 03:14:07 UTC).</p>
      </div>
    </div>
  );
}
