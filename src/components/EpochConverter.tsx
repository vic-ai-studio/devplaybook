import { useState, useEffect, useCallback } from 'preact/hooks';

// ── Timezone list (common zones) ─────────────────────────────────────────────
const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Moscow',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Shanghai',
  'Asia/Taipei',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Pacific/Auckland',
];

// ── Relative time ─────────────────────────────────────────────────────────────
function relativeTime(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const abs = Math.abs(diff);
  const future = diff < 0;
  const prefix = future ? 'in ' : '';
  const suffix = future ? '' : ' ago';

  if (abs < 1000) return 'just now';
  if (abs < 60_000) return `${prefix}${Math.round(abs / 1000)}s${suffix}`;
  if (abs < 3_600_000) return `${prefix}${Math.round(abs / 60_000)}m${suffix}`;
  if (abs < 86_400_000) return `${prefix}${Math.round(abs / 3_600_000)}h${suffix}`;
  if (abs < 2_592_000_000) return `${prefix}${Math.round(abs / 86_400_000)}d${suffix}`;
  if (abs < 31_536_000_000) return `${prefix}${Math.round(abs / 2_592_000_000)} months${suffix}`;
  return `${prefix}${Math.round(abs / 31_536_000_000)} years${suffix}`;
}

// ── Format date in a timezone ─────────────────────────────────────────────────
function formatInTz(epochMs: number, tz: string, fmt: 'iso' | 'locale' | 'rfc'): string {
  try {
    const d = new Date(epochMs);
    if (fmt === 'iso') {
      // ISO 8601 in local tz
      return new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false,
      }).format(d).replace(', ', 'T');
    }
    if (fmt === 'rfc') {
      return d.toUTCString();
    }
    return new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric', month: 'short', day: 'numeric',
      weekday: 'short',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      timeZoneName: 'short',
      hour12: true,
    }).format(d);
  } catch {
    return 'Invalid timezone';
  }
}

// ── Parse datetime string to epoch (ms) ──────────────────────────────────────
function parseDatetimeToEpoch(input: string, tz: string): number | null {
  const s = input.trim();
  if (!s) return null;

  // Try ISO format
  const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (isoMatch) {
    const [, y, mo, d, h, mi, sec = '00'] = isoMatch;
    // Construct a date string with timezone offset
    try {
      const tzDate = new Date(`${y}-${mo}-${d}T${h}:${mi}:${sec}+00:00`);
      // Get offset for tz at that point
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
      // Binary search offset (Intl doesn't expose offset directly)
      // Simple approach: parse as UTC, adjust by tz offset
      const utcMs = Date.UTC(+y, +mo - 1, +d, +h, +mi, +sec);
      // Get tz offset by formatting UTC=0 and seeing what local time it gives
      const parts = formatter.formatToParts(new Date(utcMs));
      const get = (t: string) => +(parts.find(p => p.type === t)?.value ?? 0);
      const localH = get('hour');
      const localM = get('minute');
      const localS = get('second');
      // Find offset in ms
      const offsetMs = (+h * 3600 + +mi * 60 + +sec - localH * 3600 - localM * 60 - localS) * 1000;
      return utcMs + offsetMs;
    } catch {
      return null;
    }
  }

  // Try plain date
  const dateOnly = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) {
    const utcMs = Date.UTC(+dateOnly[1], +dateOnly[2] - 1, +dateOnly[3]);
    return utcMs;
  }

  // Fallback: native Date.parse (treats as local)
  const ms = Date.parse(s);
  return isNaN(ms) ? null : ms;
}

// ── Component ─────────────────────────────────────────────────────────────────
type Direction = 'epoch-to-date' | 'date-to-epoch';

export default function EpochConverter() {
  const [dir, setDir] = useState<Direction>('epoch-to-date');
  const [epochInput, setEpochInput] = useState('');
  const [epochUnit, setEpochUnit] = useState<'ms' | 's'>('s');
  const [dateInput, setDateInput] = useState('');
  const [tz, setTz] = useState('UTC');
  const [liveEpoch, setLiveEpoch] = useState(Date.now());
  const [copied, setCopied] = useState<string | null>(null);

  // Live clock
  useEffect(() => {
    const iv = setInterval(() => setLiveEpoch(Date.now()), 1000);
    return () => clearInterval(iv);
  }, []);

  const epochMs = useCallback((): number | null => {
    if (dir === 'epoch-to-date') {
      const n = Number(epochInput.trim());
      if (isNaN(n) || epochInput.trim() === '') return null;
      return epochUnit === 's' ? n * 1000 : n;
    } else {
      return parseDatetimeToEpoch(dateInput, tz);
    }
  }, [dir, epochInput, epochUnit, dateInput, tz]);

  const ms = epochMs();
  const valid = ms !== null && !isNaN(ms);

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const CopyBtn = ({ text, id }: { text: string; id: string }) => (
    <button
      onClick={() => copy(text, id)}
      class="text-xs text-accent hover:underline ml-2 font-sans"
    >{copied === id ? '✓' : 'Copy'}</button>
  );

  return (
    <div class="space-y-5 font-sans text-sm">
      {/* Live epoch display */}
      <div class="p-4 bg-bg-secondary border border-border rounded-xl">
        <p class="text-xs text-text-muted mb-1">Current Unix Epoch (live)</p>
        <div class="flex items-baseline gap-3 flex-wrap">
          <span class="text-2xl font-mono font-bold text-accent">{Math.floor(liveEpoch / 1000)}</span>
          <span class="text-text-muted text-xs">seconds</span>
          <span class="text-lg font-mono text-text-muted">{liveEpoch}</span>
          <span class="text-text-muted text-xs">ms</span>
        </div>
        <div class="flex gap-2 mt-2 flex-wrap">
          <button
            onClick={() => { setEpochInput(String(Math.floor(liveEpoch / 1000))); setDir('epoch-to-date'); setEpochUnit('s'); }}
            class="text-xs text-accent hover:underline"
          >Use current →</button>
        </div>
      </div>

      {/* Direction tabs */}
      <div class="flex gap-2">
        <button
          onClick={() => setDir('epoch-to-date')}
          class={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${dir === 'epoch-to-date' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}
        >Epoch → Date</button>
        <button
          onClick={() => setDir('date-to-epoch')}
          class={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${dir === 'date-to-epoch' ? 'bg-accent text-white border-accent' : 'border-border text-text-muted hover:border-accent'}`}
        >Date → Epoch</button>
      </div>

      {/* Inputs */}
      {dir === 'epoch-to-date' ? (
        <div class="space-y-3">
          <div class="flex gap-2">
            <input
              type="number"
              value={epochInput}
              onInput={e => setEpochInput((e.target as HTMLInputElement).value)}
              placeholder="Enter Unix timestamp..."
              class="flex-1 p-3 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent font-mono"
            />
            <select
              value={epochUnit}
              onChange={e => setEpochUnit((e.target as HTMLSelectElement).value as 's' | 'ms')}
              class="p-3 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent text-text-muted"
            >
              <option value="s">seconds</option>
              <option value="ms">milliseconds</option>
            </select>
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Display timezone</label>
            <select
              value={tz}
              onChange={e => setTz((e.target as HTMLSelectElement).value)}
              class="w-full p-2 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent text-sm"
            >
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      ) : (
        <div class="space-y-3">
          <div>
            <label class="text-xs text-text-muted mb-1 block">Date &amp; time (YYYY-MM-DD HH:MM:SS or YYYY-MM-DD)</label>
            <input
              type="text"
              value={dateInput}
              onInput={e => setDateInput((e.target as HTMLInputElement).value)}
              placeholder="2024-01-15 09:30:00"
              class="w-full p-3 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent font-mono"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted mb-1 block">Interpret as timezone</label>
            <select
              value={tz}
              onChange={e => setTz((e.target as HTMLSelectElement).value)}
              class="w-full p-2 bg-bg-secondary border border-border rounded-lg focus:outline-none focus:border-accent text-sm"
            >
              {TIMEZONES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Results */}
      {valid && ms !== null && (
        <div class="space-y-3">
          {dir === 'epoch-to-date' ? (
            <>
              {/* Formatted dates */}
              <div class="p-4 bg-bg-secondary border border-border rounded-xl space-y-2">
                <p class="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Converted dates ({tz})</p>

                {[
                  { label: 'Human readable', val: formatInTz(ms, tz, 'locale') },
                  { label: 'ISO 8601', val: formatInTz(ms, tz, 'iso') },
                  { label: 'RFC 2822 (UTC)', val: formatInTz(ms, 'UTC', 'rfc') },
                  { label: 'Relative', val: relativeTime(ms) },
                  { label: 'Epoch (seconds)', val: String(Math.floor(ms / 1000)) },
                  { label: 'Epoch (ms)', val: String(ms) },
                ].map(({ label, val }) => (
                  <div key={label} class="flex items-start justify-between gap-2">
                    <span class="text-text-muted text-xs w-36 shrink-0">{label}</span>
                    <span class="font-mono text-xs break-all flex-1">{val}</span>
                    <CopyBtn text={val} id={label} />
                  </div>
                ))}
              </div>

              {/* Multi-timezone table */}
              <div class="p-4 bg-bg-secondary border border-border rounded-xl">
                <p class="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">World clock</p>
                <div class="space-y-1.5 max-h-60 overflow-y-auto">
                  {TIMEZONES.map(t => (
                    <div key={t} class="flex items-center justify-between gap-2 text-xs">
                      <span class="text-text-muted w-40 shrink-0">{t}</span>
                      <span class="font-mono">{formatInTz(ms, t, 'locale')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div class="p-4 bg-bg-secondary border border-border rounded-xl space-y-2">
              <p class="text-xs text-text-muted font-medium uppercase tracking-wide mb-2">Epoch output</p>
              {[
                { label: 'Epoch (seconds)', val: String(Math.floor(ms / 1000)) },
                { label: 'Epoch (ms)', val: String(ms) },
                { label: 'Human readable (UTC)', val: formatInTz(ms, 'UTC', 'locale') },
                { label: 'ISO 8601 (UTC)', val: new Date(ms).toISOString() },
                { label: 'Relative', val: relativeTime(ms) },
              ].map(({ label, val }) => (
                <div key={label} class="flex items-start justify-between gap-2">
                  <span class="text-text-muted text-xs w-40 shrink-0">{label}</span>
                  <span class="font-mono text-xs break-all flex-1">{val}</span>
                  <CopyBtn text={val} id={label} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {(epochInput || dateInput) && !valid && (
        <div class="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
          ⚠ Could not parse the input. Check the format and try again.
        </div>
      )}

      <p class="text-xs text-text-muted">
        💡 Unix epoch = seconds since January 1, 1970 00:00:00 UTC. Epoch 0 is the "Unix epoch origin".
      </p>
    </div>
  );
}
