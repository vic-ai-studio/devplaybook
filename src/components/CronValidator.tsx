import { useState, useMemo } from 'preact/hooks';

const FIELD_DEFS = [
  { name: 'Minute',      range: '0–59',  special: '* , - /' },
  { name: 'Hour',        range: '0–23',  special: '* , - /' },
  { name: 'Day of month', range: '1–31', special: '* , - / ?' },
  { name: 'Month',       range: '1–12',  special: '* , - /' },
  { name: 'Day of week', range: '0–6 (Sun=0)', special: '* , - / ?' },
];

const MONTH_NAMES = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const PRESETS = [
  { label: 'Every minute',          cron: '* * * * *' },
  { label: 'Every 5 minutes',       cron: '*/5 * * * *' },
  { label: 'Every 15 minutes',      cron: '*/15 * * * *' },
  { label: 'Every hour',            cron: '0 * * * *' },
  { label: 'Every day at midnight', cron: '0 0 * * *' },
  { label: 'Every day at noon',     cron: '0 12 * * *' },
  { label: 'Every Monday at 9am',   cron: '0 9 * * 1' },
  { label: 'Weekdays at 8am',       cron: '0 8 * * 1-5' },
  { label: 'Every Sunday 2am',      cron: '0 2 * * 0' },
  { label: '1st of every month',    cron: '0 0 1 * *' },
  { label: 'Every 6 hours',         cron: '0 */6 * * *' },
  { label: 'Quarterly (1st Jan/Apr/Jul/Oct)', cron: '0 0 1 1,4,7,10 *' },
];

// Expand a cron field to a set of matching values
function expand(field: string, min: number, max: number): number[] | null {
  if (field === '*' || field === '?') return Array.from({ length: max - min + 1 }, (_, i) => i + min);
  const result: number[] = [];
  for (const seg of field.split(',')) {
    if (seg.includes('/')) {
      const [rangePart, stepStr] = seg.split('/');
      const step = parseInt(stepStr);
      if (isNaN(step) || step <= 0) return null;
      let start = min, end = max;
      if (rangePart !== '*') {
        if (rangePart.includes('-')) {
          const [a, b] = rangePart.split('-').map(Number);
          if (isNaN(a) || isNaN(b)) return null;
          start = a; end = b;
        } else {
          start = parseInt(rangePart);
          if (isNaN(start)) return null;
        }
      }
      for (let i = start; i <= end; i += step) result.push(i);
    } else if (seg.includes('-')) {
      const [a, b] = seg.split('-').map(Number);
      if (isNaN(a) || isNaN(b)) return null;
      for (let i = a; i <= b; i++) result.push(i);
    } else {
      const n = parseInt(seg);
      if (isNaN(n)) return null;
      result.push(n);
    }
  }
  const valid = [...new Set(result)].filter(n => n >= min && n <= max).sort((a, b) => a - b);
  return valid.length ? valid : null;
}

function validateCron(expr: string): { valid: boolean; error?: string; parts?: string[] } {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return { valid: false, error: `Expected 5 fields, got ${parts.length}.` };
  const ranges: [number, number][] = [[0, 59], [0, 23], [1, 31], [1, 12], [0, 6]];
  for (let i = 0; i < 5; i++) {
    const expanded = expand(parts[i], ranges[i][0], ranges[i][1]);
    if (!expanded) return { valid: false, error: `Invalid ${FIELD_DEFS[i].name.toLowerCase()} field: "${parts[i]}"` };
  }
  return { valid: true, parts };
}

function describeCron(parts: string[]): string {
  const [min, hr, dom, mon, dow] = parts;
  const tokens: string[] = [];

  // Time description
  if (min === '*' && hr === '*') {
    tokens.push('every minute');
  } else if (min.startsWith('*/') && hr === '*') {
    tokens.push(`every ${min.slice(2)} minutes`);
  } else if (min.startsWith('*/') && hr.startsWith('*/')) {
    tokens.push(`every ${min.slice(2)} min, every ${hr.slice(2)} hours`);
  } else if (hr === '*') {
    tokens.push(`at minute ${min} of every hour`);
  } else if (hr.startsWith('*/')) {
    const m = min === '0' ? 'on the hour' : `at minute ${min}`;
    tokens.push(`every ${hr.slice(2)} hours (${m})`);
  } else if (hr.includes(',')) {
    const hours = hr.split(',').map(h => h.padStart(2, '0') + ':' + min.padStart(2, '0'));
    tokens.push(`at ${hours.join(', ')}`);
  } else if (hr.includes('-')) {
    tokens.push(`at minute ${min} during hours ${hr}`);
  } else {
    tokens.push(`at ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`);
  }

  // Month
  if (mon !== '*' && mon !== '?') {
    const months = expand(mon, 1, 12)?.map(m => MONTH_NAMES[m]).join(', ');
    if (months) tokens.push(`in ${months}`);
  }

  // Day of month
  if (dom !== '*' && dom !== '?') {
    const days = expand(dom, 1, 31);
    if (days) tokens.push(`on day${days.length > 1 ? 's' : ''} ${days.join(', ')} of the month`);
  }

  // Day of week
  if (dow !== '*' && dow !== '?') {
    if (dow === '1-5') tokens.push('on weekdays (Mon–Fri)');
    else if (dow === '0,6' || dow === '6,0') tokens.push('on weekends (Sat–Sun)');
    else {
      const days = expand(dow, 0, 6)?.map(d => DAY_NAMES[d]).join(', ');
      if (days) tokens.push(`on ${days}`);
    }
  }

  return tokens.join(', ').charAt(0).toUpperCase() + tokens.join(', ').slice(1);
}

function getNextRuns(parts: string[], count = 5): Date[] {
  const [minP, hrP, domP, monP, dowP] = parts;
  const mins = expand(minP, 0, 59) ?? [];
  const hrs = expand(hrP, 0, 23) ?? [];
  const doms = expand(domP, 1, 31) ?? [];
  const mons = expand(monP, 1, 12) ?? [];
  const dows = expand(dowP, 0, 6) ?? [];

  const runs: Date[] = [];
  const now = new Date();
  now.setSeconds(0, 0);
  const cursor = new Date(now.getTime() + 60000); // start from next minute

  let limit = 0;
  while (runs.length < count && limit < 527040) { // max 1 year of minutes
    limit++;
    const mo = cursor.getMonth() + 1;
    const d = cursor.getDate();
    const h = cursor.getHours();
    const m = cursor.getMinutes();
    const dow = cursor.getDay();

    if (
      mons.includes(mo) &&
      doms.includes(d) &&
      dows.includes(dow) &&
      hrs.includes(h) &&
      mins.includes(m)
    ) {
      runs.push(new Date(cursor));
      cursor.setMinutes(cursor.getMinutes() + 1);
    } else {
      // Skip to next valid minute
      const nextMin = mins.find(mn => mn > m);
      if (nextMin !== undefined && hrs.includes(h)) {
        cursor.setMinutes(nextMin);
      } else {
        const nextHr = hrs.find(hr => hr > h);
        if (nextHr !== undefined) {
          cursor.setHours(nextHr, mins[0], 0, 0);
        } else {
          cursor.setDate(cursor.getDate() + 1);
          cursor.setHours(hrs[0], mins[0], 0, 0);
        }
      }
    }
  }
  return runs;
}

function formatDate(d: Date) {
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function timeUntil(d: Date): string {
  const diff = Math.floor((d.getTime() - Date.now()) / 1000);
  if (diff < 60) return `${diff}s from now`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m from now`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m from now`;
  return `${Math.floor(diff / 86400)}d from now`;
}

export default function CronValidator() {
  const [input, setInput] = useState('*/5 * * * *');
  const [copied, setCopied] = useState(false);

  const validation = useMemo(() => validateCron(input), [input]);
  const description = useMemo(() => {
    if (!validation.valid || !validation.parts) return '';
    return describeCron(validation.parts);
  }, [validation]);

  const nextRuns = useMemo(() => {
    if (!validation.valid || !validation.parts) return [];
    return getNextRuns(validation.parts, 5);
  }, [validation]);

  const fields = useMemo(() => {
    const parts = input.trim().split(/\s+/);
    return FIELD_DEFS.map((f, i) => ({ ...f, value: parts[i] ?? '' }));
  }, [input]);

  function copy() {
    navigator.clipboard.writeText(input.trim()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function setPreset(cron: string) {
    setInput(cron);
  }

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-bg-card border border-border rounded-xl p-6">
        <label class="block text-sm font-medium text-text-muted mb-2">Cron expression (5 fields)</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={input}
            onInput={(e) => setInput((e.target as HTMLInputElement).value)}
            placeholder="*/5 * * * *"
            class={`flex-1 bg-bg-main border rounded-lg px-4 py-2 text-sm font-mono focus:outline-none transition-colors ${
              input.trim() === '' ? 'border-border' :
              validation.valid ? 'border-emerald-500 focus:border-emerald-400' : 'border-red-500 focus:border-red-400'
            }`}
          />
          <button
            onClick={copy}
            class="border border-border hover:border-primary text-text-muted hover:text-primary px-4 py-2 rounded-lg text-sm transition-colors"
          >
            {copied ? '✓' : 'Copy'}
          </button>
        </div>

        {/* Field labels */}
        <div class="mt-3 grid grid-cols-5 gap-1 text-xs">
          {fields.map((f, i) => (
            <div key={i} class="text-center">
              <div class={`font-mono font-bold text-base ${f.value ? 'text-primary' : 'text-text-muted'}`}>{f.value || '–'}</div>
              <div class="text-text-muted/70 mt-0.5">{f.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Validation result */}
      {input.trim() !== '' && (
        <div class={`rounded-xl p-4 border ${validation.valid ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
          {validation.valid ? (
            <div class="space-y-1">
              <div class="flex items-center gap-2">
                <span class="text-emerald-400 font-semibold">✓ Valid expression</span>
              </div>
              <p class="text-text-main text-base font-medium">{description}</p>
            </div>
          ) : (
            <div class="flex items-center gap-2 text-red-400">
              <span class="font-semibold">✗ Invalid:</span>
              <span class="text-sm">{validation.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Next runs */}
      {nextRuns.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="px-4 py-3 border-b border-border text-xs text-text-muted font-semibold uppercase tracking-wide">
            Next 5 scheduled runs
          </div>
          <div class="divide-y divide-border">
            {nextRuns.map((d, i) => (
              <div key={i} class="px-4 py-3 flex items-center justify-between">
                <span class="font-mono text-sm text-text-main">{formatDate(d)}</span>
                <span class="text-xs text-text-muted">{timeUntil(d)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Field reference */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="px-4 py-3 border-b border-border text-xs text-text-muted font-semibold uppercase tracking-wide">
          Field reference
        </div>
        <div class="divide-y divide-border">
          {FIELD_DEFS.map((f, i) => (
            <div key={i} class="px-4 py-3 grid grid-cols-3 gap-4 text-sm">
              <span class="font-semibold text-text-main">{f.name}</span>
              <span class="font-mono text-text-muted">{f.range}</span>
              <span class="font-mono text-xs text-primary/80">{f.special}</span>
            </div>
          ))}
        </div>
        <div class="px-4 py-3 border-t border-border bg-bg-main/30 text-xs text-text-muted space-y-1">
          <p><span class="font-mono text-primary">*</span> = any value &nbsp;|&nbsp; <span class="font-mono text-primary">,</span> = list (1,5,10) &nbsp;|&nbsp; <span class="font-mono text-primary">-</span> = range (1-5) &nbsp;|&nbsp; <span class="font-mono text-primary">/</span> = step (*/5 = every 5)</p>
        </div>
      </div>

      {/* Presets */}
      <div class="bg-bg-card/50 border border-border/50 rounded-xl p-4">
        <p class="text-xs text-text-muted font-semibold uppercase tracking-wide mb-3">Quick presets</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {PRESETS.map(p => (
            <button
              key={p.cron}
              onClick={() => setPreset(p.cron)}
              class={`text-left text-xs px-3 py-2 rounded-lg border transition-colors ${input.trim() === p.cron ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary hover:bg-primary/5 text-text-muted'}`}
            >
              <span class="font-mono text-primary">{p.cron}</span>
              <span class="ml-2 text-text-muted">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
