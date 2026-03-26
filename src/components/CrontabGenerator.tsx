import { useState, useCallback } from 'preact/hooks';

type Field = 'minute' | 'hour' | 'day' | 'month' | 'weekday';

interface CronFields {
  minute: string;
  hour: string;
  day: string;
  month: string;
  weekday: string;
}

const PRESETS: { label: string; cron: string; desc: string }[] = [
  { label: 'Every minute', cron: '* * * * *', desc: 'Runs every minute' },
  { label: 'Every hour', cron: '0 * * * *', desc: 'Runs at minute 0 of every hour' },
  { label: 'Every day at midnight', cron: '0 0 * * *', desc: 'Runs at 00:00 every day' },
  { label: 'Every day at noon', cron: '0 12 * * *', desc: 'Runs at 12:00 every day' },
  { label: 'Every Monday', cron: '0 9 * * 1', desc: 'Runs at 09:00 every Monday' },
  { label: 'Every weekday', cron: '0 9 * * 1-5', desc: 'Runs at 09:00 Mon–Fri' },
  { label: 'Every weekend', cron: '0 10 * * 6,0', desc: 'Runs at 10:00 Sat & Sun' },
  { label: 'Every month 1st', cron: '0 0 1 * *', desc: 'Runs at 00:00 on the 1st of each month' },
  { label: 'Every quarter', cron: '0 0 1 1,4,7,10 *', desc: 'Runs at 00:00 on Jan 1, Apr 1, Jul 1, Oct 1' },
  { label: 'Every 15 minutes', cron: '*/15 * * * *', desc: 'Runs every 15 minutes' },
  { label: 'Every 5 minutes', cron: '*/5 * * * *', desc: 'Runs every 5 minutes' },
  { label: 'Every Sunday midnight', cron: '0 0 * * 0', desc: 'Runs at 00:00 every Sunday' },
];

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WEEKDAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseField(value: string, min: number, max: number): number[] {
  const results: number[] = [];
  if (value === '*') {
    for (let i = min; i <= max; i++) results.push(i);
    return results;
  }
  const parts = value.split(',');
  for (const part of parts) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const stepNum = parseInt(step);
      const start = range === '*' ? min : parseInt(range.split('-')[0]);
      const end = range === '*' ? max : (range.includes('-') ? parseInt(range.split('-')[1]) : max);
      for (let i = start; i <= end; i += stepNum) results.push(i);
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      for (let i = start; i <= end; i++) results.push(i);
    } else {
      const n = parseInt(part);
      if (!isNaN(n)) results.push(n);
    }
  }
  return [...new Set(results)].sort((a, b) => a - b);
}

function getNextRuns(cron: string, count: number): string[] {
  try {
    const parts = cron.trim().split(/\s+/);
    if (parts.length !== 5) return [];
    const [minF, hourF, dayF, monthF, wdayF] = parts;

    const minutes = parseField(minF, 0, 59);
    const hours = parseField(hourF, 0, 23);
    const days = parseField(dayF, 1, 31);
    const months = parseField(monthF, 1, 12);
    const weekdays = parseField(wdayF, 0, 6);
    const useDayOfWeek = wdayF !== '*';
    const useDayOfMonth = dayF !== '*';

    const runs: Date[] = [];
    const now = new Date();
    now.setSeconds(0, 0);
    const d = new Date(now.getTime() + 60000);

    let safety = 0;
    while (runs.length < count && safety < 500000) {
      safety++;
      if (!months.includes(d.getMonth() + 1)) {
        d.setMonth(d.getMonth() + 1);
        d.setDate(1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      const dayMatch = useDayOfMonth ? days.includes(d.getDate()) : true;
      const wdayMatch = useDayOfWeek ? weekdays.includes(d.getDay()) : true;
      const combinedDay = (useDayOfMonth && useDayOfWeek) ? (dayMatch || wdayMatch) : (dayMatch && wdayMatch);

      if (!combinedDay) {
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        continue;
      }
      if (!hours.includes(d.getHours())) {
        const nextHour = hours.find(h => h > d.getHours());
        if (nextHour === undefined) {
          d.setDate(d.getDate() + 1);
          d.setHours(0, 0, 0, 0);
        } else {
          d.setHours(nextHour, 0, 0, 0);
        }
        continue;
      }
      if (!minutes.includes(d.getMinutes())) {
        const nextMin = minutes.find(m => m > d.getMinutes());
        if (nextMin === undefined) {
          const nextHour = hours.find(h => h > d.getHours());
          if (nextHour === undefined) {
            d.setDate(d.getDate() + 1);
            d.setHours(0, 0, 0, 0);
          } else {
            d.setHours(nextHour, 0, 0, 0);
          }
        } else {
          d.setMinutes(nextMin, 0, 0);
        }
        continue;
      }
      runs.push(new Date(d));
      d.setMinutes(d.getMinutes() + 1, 0, 0);
    }
    return runs.map(r => r.toLocaleString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
  } catch {
    return [];
  }
}

function describeField(field: string, type: Field): string {
  if (field === '*') return `every ${type}`;
  if (field.startsWith('*/')) return `every ${field.slice(2)} ${type}s`;
  if (field.includes('-')) {
    const [a, b] = field.split('-');
    if (type === 'month') return `${MONTHS[parseInt(a)-1]}–${MONTHS[parseInt(b)-1]}`;
    if (type === 'weekday') return `${WEEKDAYS[parseInt(a)]}–${WEEKDAYS[parseInt(b)]}`;
    return `${a} to ${b}`;
  }
  if (field.includes(',')) {
    const parts = field.split(',');
    if (type === 'month') return parts.map(p => MONTHS[parseInt(p)-1]).join(', ');
    if (type === 'weekday') return parts.map(p => WEEKDAYS[parseInt(p)]).join(', ');
    return parts.join(', ');
  }
  if (type === 'month') return MONTHS[parseInt(field)-1] || field;
  if (type === 'weekday') return WEEKDAYS[parseInt(field)] || field;
  return field;
}

function humanReadable(fields: CronFields): string {
  const { minute, hour, day, month, weekday } = fields;
  const parts: string[] = [];
  parts.push(`At ${describeField(minute, 'minute')} past ${describeField(hour, 'hour')}`);
  if (day !== '*' || month !== '*' || weekday !== '*') {
    const dayPart = day !== '*' ? `on day ${describeField(day, 'day')} of the month` : '';
    const monthPart = month !== '*' ? `in ${describeField(month, 'month')}` : '';
    const wdPart = weekday !== '*' ? `on ${describeField(weekday, 'weekday')}` : '';
    const timeParts = [dayPart, monthPart, wdPart].filter(Boolean).join(', ');
    if (timeParts) parts.push(timeParts);
  }
  return parts.join(', ') + '.';
}

export default function CrontabGenerator() {
  const [fields, setFields] = useState<CronFields>({ minute: '*', hour: '*', day: '*', month: '*', weekday: '*' });
  const [raw, setRaw] = useState('* * * * *');
  const [syncMode, setSyncMode] = useState<'fields' | 'raw'>('fields');
  const [copied, setCopied] = useState(false);

  const cronExpr = `${fields.minute} ${fields.hour} ${fields.day} ${fields.month} ${fields.weekday}`;
  const nextRuns = getNextRuns(syncMode === 'fields' ? cronExpr : raw, 5);
  const readable = syncMode === 'fields' ? humanReadable(fields) : humanReadable({ minute: (raw.split(' ')[0] || '*'), hour: (raw.split(' ')[1] || '*'), day: (raw.split(' ')[2] || '*'), month: (raw.split(' ')[3] || '*'), weekday: (raw.split(' ')[4] || '*') });

  const setField = (f: Field, v: string) => setFields(prev => ({ ...prev, [f]: v }));

  const applyPreset = (cron: string) => {
    const parts = cron.split(' ');
    if (parts.length === 5) {
      setFields({ minute: parts[0], hour: parts[1], day: parts[2], month: parts[3], weekday: parts[4] });
      setRaw(cron);
      setSyncMode('fields');
    }
  };

  const copy = () => {
    const expr = syncMode === 'fields' ? cronExpr : raw;
    navigator.clipboard.writeText(expr).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  };

  const inputClass = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text font-mono text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div>
        <p class="text-sm font-semibold text-text mb-2">Common Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.cron)} title={p.desc}
              class="px-3 py-1.5 rounded-lg text-xs bg-surface border border-border text-text-muted hover:border-accent hover:text-accent transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field editors */}
      <div class="grid grid-cols-5 gap-3">
        {(['minute','hour','day','month','weekday'] as Field[]).map(f => (
          <div key={f}>
            <label class="block text-xs text-text-muted mb-1 capitalize">{f}</label>
            <input value={fields[f]} onInput={e => { setField(f, (e.target as HTMLInputElement).value); setSyncMode('fields'); }}
              class={inputClass} placeholder="*" />
          </div>
        ))}
      </div>

      {/* Raw input */}
      <div>
        <label class="block text-xs text-text-muted mb-1">Raw Cron Expression</label>
        <div class="flex gap-2">
          <input value={syncMode === 'fields' ? cronExpr : raw}
            onInput={e => { setRaw((e.target as HTMLInputElement).value); setSyncMode('raw'); }}
            class={`${inputClass} flex-1`} placeholder="* * * * *" />
          <button onClick={copy}
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors whitespace-nowrap">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Human-readable */}
      <div class="rounded-xl bg-surface border border-border p-4">
        <p class="text-xs text-text-muted mb-1">Human-readable</p>
        <p class="text-text font-medium">{readable}</p>
      </div>

      {/* Next runs */}
      {nextRuns.length > 0 && (
        <div class="rounded-xl bg-surface border border-border p-4">
          <p class="text-xs text-text-muted mb-2">Next 5 runs (local time)</p>
          <ol class="space-y-1">
            {nextRuns.map((r, i) => (
              <li key={i} class="flex items-center gap-2 text-sm">
                <span class="text-accent font-mono w-4 text-right">{i + 1}.</span>
                <span class="font-mono text-text">{r}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
      {nextRuns.length === 0 && (
        <div class="rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-500">
          Invalid cron expression — cannot compute next runs.
        </div>
      )}
    </div>
  );
}
