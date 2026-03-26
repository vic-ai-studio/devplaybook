import { useState } from 'preact/hooks';

type CronField = { name: string; value: string; desc: string; valid: boolean };

const PRESETS = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Every 5 minutes', expr: '*/5 * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Daily at midnight', expr: '0 0 * * *' },
  { label: 'Daily at noon', expr: '0 12 * * *' },
  { label: 'Every Monday', expr: '0 0 * * 1' },
  { label: 'Weekdays at 9 AM', expr: '0 9 * * 1-5' },
  { label: 'First of month', expr: '0 0 1 * *' },
  { label: 'Every Sunday midnight', expr: '0 0 * * 0' },
  { label: 'Quarterly', expr: '0 0 1 */3 *' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseField(val: string, min: number, max: number): number[] {
  const result: number[] = [];
  if (val === '*') {
    for (let i = min; i <= max; i++) result.push(i);
    return result;
  }
  for (const part of val.split(',')) {
    if (part.includes('/')) {
      const [range, step] = part.split('/');
      const s = parseInt(step, 10);
      if (isNaN(s) || s <= 0) return [];
      const [rStart, rEnd] = range === '*' ? [min, max] : range.split('-').map(Number);
      for (let i = (isNaN(rStart) ? min : rStart); i <= (isNaN(rEnd) ? max : rEnd); i += s) {
        if (i >= min && i <= max) result.push(i);
      }
    } else if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number);
      if (isNaN(start) || isNaN(end)) return [];
      for (let i = start; i <= end; i++) {
        if (i >= min && i <= max) result.push(i);
      }
    } else {
      const n = parseInt(part, 10);
      if (isNaN(n) || n < min || n > max) return [];
      result.push(n);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function describeField(val: string, unit: string, min: number, max: number, names?: string[]): string {
  if (val === '*') return `every ${unit}`;
  const values = parseField(val, min, max);
  if (values.length === 0) return '(invalid)';
  const label = (n: number) => names ? names[n] ?? String(n) : String(n);

  if (val.startsWith('*/')) {
    const step = parseInt(val.slice(2), 10);
    return `every ${step} ${unit}s`;
  }
  if (val.includes('-') && !val.includes(',')) {
    const [a, b] = val.split('-');
    return `${unit}s ${label(+a)}–${label(+b)}`;
  }
  if (values.length === 1) return `${unit} ${label(values[0])}`;
  return `${unit}s ${values.map(label).join(', ')}`;
}

function describeExpression(parts: string[]): string {
  const [min, hour, dom, month, dow] = parts;
  const minuteDesc = describeField(min, 'minute', 0, 59);
  const hourDesc = describeField(hour, 'hour', 0, 23);
  const domDesc = describeField(dom, 'day of month', 1, 31);
  const monthDesc = describeField(month, 'month', 1, 12, MONTHS);
  const dowDesc = describeField(dow, 'weekday', 0, 6, DAYS);

  const parts2: string[] = [];
  if (minuteDesc !== 'every minute') parts2.push(`at ${minuteDesc}`);
  if (hourDesc !== 'every hour') parts2.push(hour === '*' ? 'every hour' : `at hour ${parseField(hour, 0, 23).map(h => `${h}:${min === '0' ? '00' : min}`).join(', ')}`);
  if (domDesc !== 'every day of month') parts2.push(`on ${domDesc}`);
  if (monthDesc !== 'every month') parts2.push(`in ${monthDesc}`);
  if (dowDesc !== 'every weekday') parts2.push(`on ${dowDesc}`);

  if (min === '0' && hour !== '*') {
    const hours = parseField(hour, 0, 23);
    const timeStr = hours.map(h => {
      const suffix = h >= 12 ? 'PM' : 'AM';
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${h12}:00 ${suffix}`;
    }).join(', ');
    const base = `At ${timeStr}`;
    const extra = [];
    if (domDesc !== 'every day of month') extra.push(domDesc);
    if (monthDesc !== 'every month') extra.push(monthDesc);
    if (dowDesc !== 'every weekday') extra.push(dowDesc);
    return extra.length ? `${base}, ${extra.join(', ')}` : base;
  }

  if (min === '*' && hour === '*') return `Every minute${domDesc !== 'every day of month' ? `, ${domDesc}` : ''}`;
  if (min.startsWith('*/') && hour === '*') return `Every ${min.slice(2)} minutes`;

  return parts2.length ? parts2.join(', ') : 'Every minute';
}

function getNextRuns(parts: string[], count = 5): Date[] {
  const [minF, hourF, domF, monthF, dowF] = parts;
  const minutes = parseField(minF, 0, 59);
  const hours = parseField(hourF, 0, 23);
  const months = parseField(monthF, 1, 12);
  const dows = parseField(dowF, 0, 6);
  if (!minutes.length || !hours.length || !months.length || !dows.length) return [];

  const results: Date[] = [];
  const now = new Date();
  now.setSeconds(0, 0);
  const cur = new Date(now.getTime() + 60000); // next minute

  let limit = 0;
  while (results.length < count && limit < 525960) { // max 1 year of minutes
    const m = cur.getMonth() + 1;
    const d = cur.getDate();
    const h = cur.getHours();
    const mn = cur.getMinutes();
    const dw = cur.getDay();
    const domWild = domF === '*';
    const dowWild = dowF === '*';
    const domMatch = parseField(domF, 1, 31).includes(d);
    const dowMatch = dows.includes(dw);
    const dayMatch = domWild && dowWild ? true : domWild ? dowMatch : dowWild ? domMatch : domMatch || dowMatch;

    if (months.includes(m) && dayMatch && hours.includes(h) && minutes.includes(mn)) {
      results.push(new Date(cur));
    }
    cur.setMinutes(cur.getMinutes() + 1);
    limit++;
  }
  return results;
}

function validateParts(parts: string[]): CronField[] {
  if (parts.length !== 5) return [];
  const [min, hour, dom, month, dow] = parts;
  const fields: Array<[string, string, number, number]> = [
    [min, 'Minute', 0, 59],
    [hour, 'Hour', 0, 23],
    [dom, 'Day of Month', 1, 31],
    [month, 'Month', 1, 12],
    [dow, 'Day of Week', 0, 6],
  ];
  return fields.map(([val, name, mn, mx]) => {
    const parsed = parseField(val, mn, mx);
    const valid = val === '*' || parsed.length > 0;
    const desc = valid ? describeField(val, name.toLowerCase(), mn, mx, name === 'Month' ? MONTHS : name === 'Day of Week' ? DAYS : undefined) : 'Invalid';
    return { name, value: val, desc, valid };
  });
}

export default function CronExpressionParser() {
  const [expr, setExpr] = useState('0 9 * * 1-5');
  const [copied, setCopied] = useState(false);

  const parts = expr.trim().split(/\s+/);
  const isValid = parts.length === 5;
  const fields = isValid ? validateParts(parts) : [];
  const allValid = isValid && fields.every(f => f.valid);
  const description = allValid ? describeExpression(parts) : null;
  const nextRuns = allValid ? getNextRuns(parts) : [];

  const copy = () => {
    navigator.clipboard.writeText(expr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const formatDate = (d: Date) => d.toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-3">
        <label class="block text-sm font-medium text-gray-300">Cron Expression</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={expr}
            onInput={e => setExpr((e.target as HTMLInputElement).value)}
            placeholder="* * * * *"
            class={`flex-1 bg-gray-800 border rounded-lg px-4 py-2.5 font-mono text-sm text-white focus:outline-none focus:ring-2 ${allValid ? 'border-gray-600 focus:ring-indigo-500' : 'border-red-600 focus:ring-red-500'}`}
          />
          <button onClick={copy}
            class="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap">
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <div class="flex gap-1 text-xs text-gray-500 font-mono">
          {['Minute', 'Hour', 'Day', 'Month', 'Weekday'].map((f, i) => (
            <span key={i} class="flex-1 text-center">{f}</span>
          ))}
        </div>
        {!isValid && (
          <p class="text-sm text-red-400">⚠ A cron expression must have exactly 5 fields: minute hour day month weekday</p>
        )}
      </div>

      {/* Presets */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
        <p class="text-sm font-medium text-gray-300 mb-3">Common Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(p => (
            <button key={p.expr} onClick={() => setExpr(p.expr)}
              class={`px-3 py-1.5 text-xs rounded-md border transition-colors font-mono ${expr === p.expr ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Field breakdown */}
      {isValid && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <p class="text-sm font-medium text-gray-300 mb-3">Field Breakdown</p>
          <div class="space-y-2">
            {fields.map(f => (
              <div key={f.name} class="flex items-center gap-3">
                <span class={`w-2 h-2 rounded-full flex-shrink-0 ${f.valid ? 'bg-green-500' : 'bg-red-500'}`} />
                <span class="text-sm font-medium text-gray-400 w-28 flex-shrink-0">{f.name}</span>
                <code class="text-sm font-mono text-indigo-300 w-16 flex-shrink-0">{f.value}</code>
                <span class="text-sm text-gray-400">{f.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Human description */}
      {description && (
        <div class="bg-indigo-950/50 rounded-xl border border-indigo-800 p-5">
          <p class="text-xs font-medium text-indigo-400 uppercase tracking-wide mb-1">Runs</p>
          <p class="text-base text-white font-medium">{description}</p>
        </div>
      )}

      {/* Next runs */}
      {nextRuns.length > 0 && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <p class="text-sm font-medium text-gray-300 mb-3">Next 5 Run Times</p>
          <ol class="space-y-2">
            {nextRuns.map((d, i) => (
              <li key={i} class="flex items-center gap-3">
                <span class="w-5 h-5 rounded-full bg-gray-700 text-gray-400 text-xs flex items-center justify-center flex-shrink-0">{i + 1}</span>
                <code class="text-sm font-mono text-green-300">{formatDate(d)}</code>
              </li>
            ))}
          </ol>
        </div>
      )}

      {isValid && !allValid && (
        <div class="bg-red-950/50 rounded-xl border border-red-800 p-4 text-sm text-red-300">
          One or more fields contain invalid values. Check the field breakdown above.
        </div>
      )}
    </div>
  );
}
