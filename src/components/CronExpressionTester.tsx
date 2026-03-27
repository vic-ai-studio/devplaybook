import { useState } from 'preact/hooks';

const PRESETS = [
  { label: 'Every minute', value: '* * * * *' },
  { label: 'Every 5 minutes', value: '*/5 * * * *' },
  { label: 'Every hour', value: '0 * * * *' },
  { label: 'Daily at midnight', value: '0 0 * * *' },
  { label: 'Daily at 9am', value: '0 9 * * *' },
  { label: 'Every Monday 9am', value: '0 9 * * 1' },
  { label: 'Weekdays at 8am', value: '0 8 * * 1-5' },
  { label: 'Every Sunday midnight', value: '0 0 * * 0' },
  { label: '1st of month', value: '0 0 1 * *' },
  { label: 'Every 15 minutes', value: '*/15 * * * *' },
  { label: 'Noon and midnight', value: '0 0,12 * * *' },
  { label: 'Every 6 hours', value: '0 */6 * * *' },
];

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function matchField(value: number, field: string): boolean {
  if (field === '*') return true;
  for (const part of field.split(',')) {
    if (part.startsWith('*/')) {
      const step = parseInt(part.slice(2));
      if (!isNaN(step) && step > 0 && value % step === 0) return true;
    } else if (part.includes('-') && !part.includes('/')) {
      const [lo, hi] = part.split('-').map(Number);
      if (!isNaN(lo) && !isNaN(hi) && value >= lo && value <= hi) return true;
    } else if (part.includes('/')) {
      const [base, step] = part.split('/');
      const b = base === '*' ? 0 : parseInt(base);
      const s = parseInt(step);
      if (!isNaN(b) && !isNaN(s) && s > 0 && value >= b && (value - b) % s === 0) return true;
    } else {
      if (parseInt(part) === value) return true;
    }
  }
  return false;
}

function getNextRuns(cron: string, from: Date, count: number): Date[] {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return [];
  const [minF, hourF, domF, monF, dowF] = parts;
  const results: Date[] = [];
  const d = new Date(from);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() + 1);
  const limit = new Date(d.getTime() + 366 * 24 * 60 * 60 * 1000);
  while (results.length < count && d < limit) {
    if (
      matchField(d.getMonth() + 1, monF) &&
      matchField(d.getDate(), domF) &&
      matchField(d.getDay(), dowF) &&
      matchField(d.getHours(), hourF) &&
      matchField(d.getMinutes(), minF)
    ) {
      results.push(new Date(d));
    }
    d.setMinutes(d.getMinutes() + 1);
  }
  return results;
}

function validateCron(cron: string): string | null {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return 'Need exactly 5 fields: minute hour day-of-month month day-of-week';
  const limits: [number, number, string][] = [
    [0, 59, 'Minute'],
    [0, 23, 'Hour'],
    [1, 31, 'Day-of-month'],
    [1, 12, 'Month'],
    [0, 6, 'Day-of-week'],
  ];
  for (let i = 0; i < 5; i++) {
    const field = parts[i];
    const [min, max, name] = limits[i];
    if (field === '*') continue;
    for (const part of field.split(',')) {
      if (part.startsWith('*/')) {
        const s = parseInt(part.slice(2));
        if (isNaN(s) || s <= 0) return `${name}: invalid step "${part}"`;
        continue;
      }
      if (part.includes('-')) {
        const [lo, hi] = part.split('-').map(Number);
        if (isNaN(lo) || isNaN(hi) || lo > hi || lo < min || hi > max)
          return `${name}: invalid range "${part}" (valid: ${min}-${max})`;
        continue;
      }
      if (part.includes('/')) {
        const [base, step] = part.split('/');
        const b = parseInt(base), s = parseInt(step);
        if (isNaN(b) || isNaN(s) || s <= 0 || b < min || b > max)
          return `${name}: invalid step expression "${part}"`;
        continue;
      }
      const n = parseInt(part);
      if (isNaN(n) || n < min || n > max)
        return `${name}: "${part}" is out of range (${min}-${max})`;
    }
  }
  return null;
}

function explainCron(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return '';
  const [min, hour, dom, mon, dow] = parts;

  const hourNum = !isNaN(Number(hour)) ? parseInt(hour) : -1;
  const minNum = !isNaN(Number(min)) ? parseInt(min) : -1;

  let desc = '';

  // Time part
  if (min === '0' && hourNum >= 0) {
    desc = `At ${String(hourNum).padStart(2, '0')}:00`;
  } else if (minNum >= 0 && hourNum >= 0) {
    desc = `At ${String(hourNum).padStart(2, '0')}:${String(minNum).padStart(2, '0')}`;
  } else if (min.startsWith('*/')) {
    desc = `Every ${min.slice(2)} minutes`;
  } else if (hour.startsWith('*/')) {
    desc = `Every ${hour.slice(2)} hours`;
  } else if (min === '*' && hour === '*') {
    desc = 'Every minute';
  } else {
    desc = `At minute ${min}`;
    if (hour !== '*') desc += ` of hour ${hour}`;
  }

  // Day/week part
  if (dom !== '*') {
    desc += ` on day ${dom} of every month`;
  } else if (dow !== '*') {
    const dayNames: Record<string, string> = {
      '0': 'Sunday', '1': 'Monday', '2': 'Tuesday', '3': 'Wednesday',
      '4': 'Thursday', '5': 'Friday', '6': 'Saturday',
    };
    if (dow === '1-5') desc += ', every weekday (Mon-Fri)';
    else if (dow === '0,6' || dow === '6,0') desc += ', on weekends';
    else desc += `, on ${dayNames[dow] || 'day ' + dow}`;
  }

  if (mon !== '*') {
    const monthNames: Record<string, string> = {
      '1': 'January', '2': 'February', '3': 'March', '4': 'April',
      '5': 'May', '6': 'June', '7': 'July', '8': 'August',
      '9': 'September', '10': 'October', '11': 'November', '12': 'December',
    };
    desc += ` in ${monthNames[mon] || 'month ' + mon}`;
  }

  return desc;
}

function formatDate(d: Date): string {
  return d.toLocaleString('en-US', {
    weekday: 'short', year: 'numeric', month: 'short',
    day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function CronExpressionTester() {
  const now = new Date();
  const [cron, setCron] = useState('0 9 * * 1-5');
  const [startDate, setStartDate] = useState(toLocalInputValue(now));
  const [count, setCount] = useState(10);
  const [results, setResults] = useState<Date[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleTest() {
    const err = validateCron(cron);
    if (err) { setError(err); setResults(null); return; }
    setError(null);
    const from = startDate ? new Date(startDate) : now;
    setResults(getNextRuns(cron, from, count));
  }

  const explanation = !error && cron.trim().split(/\s+/).length === 5 && !validateCron(cron) ? explainCron(cron) : '';

  return (
    <div class="space-y-4">
      <div>
        <p class="text-xs text-text-muted mb-2">Quick presets:</p>
        <div class="flex flex-wrap gap-1.5">
          {PRESETS.map(p => (
            <button
              key={p.value}
              class={`text-xs px-2 py-1 rounded border transition-colors ${cron === p.value ? 'bg-accent/20 border-accent/50 text-accent' : 'bg-bg-secondary border-border text-text-muted hover:text-text hover:border-accent/40'}`}
              onClick={() => { setCron(p.value); setResults(null); setError(null); }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label class="block text-sm font-medium text-text mb-1.5">Cron Expression</label>
        <input
          type="text"
          class="w-full font-mono text-lg p-3 rounded-lg bg-bg-secondary border border-border text-text focus:outline-none focus:border-accent"
          placeholder="* * * * *"
          value={cron}
          onInput={(e) => { setCron((e.target as HTMLInputElement).value); setResults(null); setError(null); }}
          spellcheck={false}
        />
        <div class="flex gap-4 mt-1.5 text-xs text-text-muted">
          {['minute (0-59)', 'hour (0-23)', 'day (1-31)', 'month (1-12)', 'weekday (0-6)'].map((f, i) => {
            const parts = cron.split(/\s+/);
            const active = parts[i] && parts[i] !== '*';
            return <span key={f} class={active ? 'text-accent' : ''}>{f}</span>;
          })}
        </div>
        {explanation && !error && (
          <p class="text-sm text-accent mt-2 font-medium">📅 {explanation}</p>
        )}
        {error && (
          <p class="text-sm text-red-400 mt-2">✗ {error}</p>
        )}
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Start From</label>
          <input
            type="datetime-local"
            class="w-full p-2.5 rounded-lg bg-bg-secondary border border-border text-text focus:outline-none focus:border-accent text-sm"
            value={startDate}
            onInput={(e) => { setStartDate((e.target as HTMLInputElement).value); setResults(null); }}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Show Next</label>
          <select
            class="w-full p-2.5 rounded-lg bg-bg-secondary border border-border text-text focus:outline-none focus:border-accent text-sm"
            value={count}
            onChange={(e) => { setCount(parseInt((e.target as HTMLSelectElement).value)); setResults(null); }}
          >
            {[5, 10, 20, 50].map(n => (
              <option key={n} value={n}>{n} run times</option>
            ))}
          </select>
        </div>
      </div>

      <button
        class="w-full py-2.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
        onClick={handleTest}
      >
        Calculate Next Run Times
      </button>

      {results !== null && (
        <div class="space-y-2">
          <h3 class="text-sm font-semibold text-text">
            {results.length > 0 ? `Next ${results.length} scheduled run${results.length !== 1 ? 's' : ''}:` : 'No runs found within one year'}
          </h3>
          {results.length === 0 && (
            <p class="text-sm text-text-muted p-4 bg-bg-secondary rounded-lg border border-border">
              This cron expression has no matching times within one year from the start date. Check your expression.
            </p>
          )}
          <div class="rounded-lg border border-border overflow-hidden">
            {results.map((d, i) => (
              <div
                key={i}
                class={`flex items-center gap-3 px-4 py-2.5 text-sm border-b border-border/30 last:border-0 ${i === 0 ? 'bg-accent/10' : 'hover:bg-bg-secondary/50'}`}
              >
                <span class="text-xs text-text-muted font-mono w-5 shrink-0 text-right">{i + 1}.</span>
                <span class={`font-mono flex-1 ${i === 0 ? 'text-accent font-medium' : 'text-text'}`}>{formatDate(d)}</span>
                {i === 0 && (
                  <span class="text-xs text-accent bg-accent/15 px-2 py-0.5 rounded shrink-0">next run</span>
                )}
              </div>
            ))}
          </div>
          <p class="text-xs text-text-muted">Times shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})</p>
        </div>
      )}
    </div>
  );
}
