import { useState, useCallback, useEffect } from 'preact/hooks';

const PRESETS = [
  { label: 'Every minute', expr: '* * * * *' },
  { label: 'Every 5 min', expr: '*/5 * * * *' },
  { label: 'Every 15 min', expr: '*/15 * * * *' },
  { label: 'Every 30 min', expr: '*/30 * * * *' },
  { label: 'Every hour', expr: '0 * * * *' },
  { label: 'Daily midnight', expr: '0 0 * * *' },
  { label: 'Daily 9 AM', expr: '0 9 * * *' },
  { label: 'Weekdays 9 AM', expr: '0 9 * * 1-5' },
  { label: 'Every Monday', expr: '0 0 * * 1' },
  { label: 'Weekly Sunday', expr: '0 0 * * 0' },
  { label: '1st of month', expr: '0 0 1 * *' },
  { label: 'Quarterly', expr: '0 0 1 */3 *' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const FIELD_NAMES = ['Minute', 'Hour', 'Day (Month)', 'Month', 'Day (Week)'];
const FIELD_RANGES = [
  { min: 0, max: 59, names: undefined },
  { min: 0, max: 23, names: undefined },
  { min: 1, max: 31, names: undefined },
  { min: 1, max: 12, names: MONTHS },
  { min: 0, max: 6, names: DAYS },
];

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
      for (let i = isNaN(rStart) ? min : rStart; i <= (isNaN(rEnd) ? max : rEnd); i += s) {
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
      if (!isNaN(n) && n >= min && n <= max) result.push(n);
    }
  }
  return [...new Set(result)].sort((a, b) => a - b);
}

function describeField(val: string, unit: string, min: number, max: number, names?: string[]): string {
  if (val === '*') return `every ${unit}`;
  const values = parseField(val, min, max);
  if (values.length === 0) return '(invalid)';
  const label = (n: number) => names ? (names[min === 1 ? n - 1 : n] ?? String(n)) : String(n);
  if (val.startsWith('*/')) {
    const step = parseInt(val.slice(2), 10);
    return `every ${step} ${unit}s`;
  }
  if (val.includes('-') && !val.includes(',')) {
    const [a, b] = val.split('-');
    return `${unit}s ${label(+a)}–${label(+b)}`;
  }
  if (values.length === 1) return `at ${unit} ${label(values[0])}`;
  return `${unit}s ${values.map(label).join(', ')}`;
}

function describeExpression(expr: string): string {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return 'Invalid cron expression (needs 5 fields)';
  const [min, hour, dom, month, dow] = parts;

  const minuteDesc = describeField(min, 'minute', 0, 59);
  const hourDesc = describeField(hour, 'hour', 0, 23);
  const domDesc = describeField(dom, 'day', 1, 31);
  const monthDesc = describeField(month, 'month', 1, 12, MONTHS);
  const dowDesc = describeField(dow, 'weekday', 0, 6, DAYS);

  const segments: string[] = [];

  if (min === '*' && hour === '*') {
    segments.push('every minute');
  } else if (min === '*') {
    segments.push(`every minute of ${hour === '*' ? 'every hour' : `hour ${parseField(hour, 0, 23).join(', ')}`}`);
  } else {
    const hours = parseField(hour, 0, 23);
    const mins = parseField(min, 0, 59);
    if (min.startsWith('*/')) {
      segments.push(minuteDesc);
      if (hour !== '*') segments.push(`past ${hourDesc}`);
    } else if (hour === '*') {
      segments.push(`at minute ${mins.join(', ')} of every hour`);
    } else {
      const times = hours.flatMap(h => mins.map(m => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`));
      segments.push(`at ${times.join(', ')}`);
    }
  }

  if (dom !== '*' && dow !== '*') {
    segments.push(`on ${domDesc} or ${dowDesc}`);
  } else if (dom !== '*') {
    segments.push(`on ${domDesc} of each month`);
  } else if (dow !== '*') {
    segments.push(`on ${dowDesc}`);
  }

  if (month !== '*') segments.push(`in ${monthDesc}`);

  return segments.join(', ');
}

function isValidField(val: string, min: number, max: number): boolean {
  if (!val) return false;
  const values = parseField(val, min, max);
  return values.length > 0;
}

function isValidExpr(expr: string): boolean {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return [0, 1, 2, 3, 4].every(i =>
    isValidField(parts[i], FIELD_RANGES[i].min, FIELD_RANGES[i].max)
  );
}

function getNextRuns(expr: string, count: number = 5): Date[] {
  if (!isValidExpr(expr)) return [];
  const parts = expr.trim().split(/\s+/);
  const [min, hour, dom, month, dow] = parts;

  const minuteSet = new Set(parseField(min, 0, 59));
  const hourSet = new Set(parseField(hour, 0, 23));
  const domSet = new Set(parseField(dom, 1, 31));
  const monthSet = new Set(parseField(month, 1, 12));
  const dowSet = new Set(parseField(dow, 0, 6));

  const domWild = dom === '*';
  const dowWild = dow === '*';

  const results: Date[] = [];
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours(), now.getMinutes() + 1, 0, 0);

  let cursor = new Date(start);
  let iterations = 0;
  const maxIterations = 500000;

  while (results.length < count && iterations < maxIterations) {
    iterations++;

    if (!monthSet.has(cursor.getMonth() + 1)) {
      cursor.setMonth(cursor.getMonth() + 1, 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    const dayMatch = domWild && dowWild
      ? true
      : domWild
        ? dowSet.has(cursor.getDay())
        : dowWild
          ? domSet.has(cursor.getDate())
          : domSet.has(cursor.getDate()) || dowSet.has(cursor.getDay());

    if (!dayMatch) {
      cursor.setDate(cursor.getDate() + 1);
      cursor.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hourSet.has(cursor.getHours())) {
      const nextHour = [...hourSet].find(h => h > cursor.getHours());
      if (nextHour === undefined) {
        cursor.setDate(cursor.getDate() + 1);
        cursor.setHours(0, 0, 0, 0);
      } else {
        cursor.setHours(nextHour, 0, 0, 0);
      }
      continue;
    }

    if (!minuteSet.has(cursor.getMinutes())) {
      const nextMin = [...minuteSet].find(m => m > cursor.getMinutes());
      if (nextMin === undefined) {
        cursor.setHours(cursor.getHours() + 1, 0, 0, 0);
      } else {
        cursor.setMinutes(nextMin, 0, 0);
      }
      continue;
    }

    results.push(new Date(cursor));
    cursor.setMinutes(cursor.getMinutes() + 1, 0, 0);
  }

  return results;
}

function formatDate(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = days[d.getDay()];
  const month = months[d.getMonth()];
  const date = d.getDate();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${day}, ${month} ${date} — ${h}:${m}`;
}

function timeUntil(d: Date): string {
  const diff = d.getTime() - Date.now();
  if (diff < 0) return 'past';
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `in ${days}d ${hours % 24}h`;
  if (hours > 0) return `in ${hours}h ${mins % 60}m`;
  if (mins > 0) return `in ${mins}m`;
  return 'in <1m';
}

export default function CronExpressionVisualizer() {
  const [expr, setExpr] = useState('0 9 * * 1-5');
  const [copied, setCopied] = useState(false);
  const [nextRuns, setNextRuns] = useState<Date[]>([]);

  const valid = isValidExpr(expr);
  const description = valid ? describeExpression(expr) : 'Invalid expression';
  const parts = expr.trim().split(/\s+/);

  useEffect(() => {
    if (valid) {
      setNextRuns(getNextRuns(expr, 5));
    } else {
      setNextRuns([]);
    }
  }, [expr]);

  const copyExpr = () => {
    navigator.clipboard.writeText(expr).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const setPreset = (e: string) => setExpr(e);

  return (
    <div class="space-y-5">
      {/* Input + Copy */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Cron Expression</label>
          <div class="flex gap-2">
            <input
              type="text"
              value={expr}
              onInput={e => setExpr((e.target as HTMLInputElement).value)}
              placeholder="* * * * *"
              class={`flex-1 bg-gray-800 text-gray-100 border rounded-md px-3 py-2 text-sm font-mono focus:outline-none transition-colors ${
                valid ? 'border-gray-700 focus:border-indigo-500' : 'border-red-500/50 focus:border-red-500'
              }`}
              spellcheck={false}
            />
            <button onClick={copyExpr}
              class="text-sm bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap">
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <p class="text-xs text-gray-500 mt-1.5 font-mono">minute  hour  day(month)  month  day(week)</p>
        </div>

        {/* Human description */}
        <div class={`rounded-lg p-3 ${valid ? 'bg-indigo-900/30 border border-indigo-700/40' : 'bg-red-900/20 border border-red-700/30'}`}>
          <p class={`text-sm ${valid ? 'text-indigo-200' : 'text-red-400'}`}>
            {valid ? `▶ Runs ${description}` : '✗ Invalid cron expression'}
          </p>
        </div>

        {/* Presets */}
        <div>
          <label class="block text-xs font-medium text-gray-400 mb-2">Common Presets</label>
          <div class="flex flex-wrap gap-2">
            {PRESETS.map(p => (
              <button key={p.expr} onClick={() => setPreset(p.expr)}
                class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  expr === p.expr
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Field breakdown */}
      {valid && parts.length === 5 && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <p class="text-sm font-medium text-gray-300 mb-3">Field Breakdown</p>
          <div class="grid grid-cols-5 gap-2">
            {parts.map((p, i) => (
              <div key={i} class="bg-gray-800 rounded-lg p-3 text-center">
                <p class="text-xs text-gray-500 mb-1">{FIELD_NAMES[i]}</p>
                <p class="text-lg font-mono text-indigo-300 font-bold">{p}</p>
                <p class="text-xs text-gray-400 mt-1 break-words">
                  {describeField(p, FIELD_NAMES[i].toLowerCase().split(' ')[0], FIELD_RANGES[i].min, FIELD_RANGES[i].max, FIELD_RANGES[i].names)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Next runs */}
      {valid && nextRuns.length > 0 && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-5">
          <p class="text-sm font-medium text-gray-300 mb-3">Next 5 Run Times</p>
          <div class="space-y-2">
            {nextRuns.map((d, i) => (
              <div key={i} class="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
                <div class="flex items-center gap-3">
                  <span class="w-5 h-5 bg-indigo-600 rounded-full text-xs text-white flex items-center justify-center font-bold shrink-0">{i + 1}</span>
                  <code class="text-sm text-green-300 font-mono">{formatDate(d)}</code>
                </div>
                <span class="text-xs text-gray-500">{timeUntil(d)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400 space-y-1.5">
        <p class="font-medium text-gray-300">Cron Field Reference</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
          <p><code class="text-gray-500">*</code> — every value</p>
          <p><code class="text-gray-500">*/5</code> — every 5th value</p>
          <p><code class="text-gray-500">1-5</code> — range 1 through 5</p>
          <p><code class="text-gray-500">1,3,5</code> — specific values</p>
          <p><code class="text-gray-500">0-23</code> — hours range</p>
          <p><code class="text-gray-500">0=Sun, 6=Sat</code> — day of week</p>
        </div>
      </div>
    </div>
  );
}
