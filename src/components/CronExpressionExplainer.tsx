import { useState } from 'preact/hooks';

const FIELD_COLORS = [
  { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500/40' },
  { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/40' },
  { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/40' },
  { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/40' },
  { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/40' },
];

const FIELD_NAMES = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'];
const FIELD_RANGES = [
  { min: 0, max: 59, label: '0–59' },
  { min: 0, max: 23, label: '0–23' },
  { min: 1, max: 31, label: '1–31' },
  { min: 1, max: 12, label: '1–12' },
  { min: 0, max: 7, label: '0–7 (0/7=Sun)' },
];

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PRESETS = [
  { expr: '* * * * *', label: 'Every minute' },
  { expr: '0 * * * *', label: 'Every hour' },
  { expr: '0 9 * * *', label: 'Every day at 9 AM' },
  { expr: '0 9 * * 1-5', label: 'Every weekday at 9 AM' },
  { expr: '0 0 * * 0', label: 'Every Sunday at midnight' },
  { expr: '0 0 1 * *', label: 'First of every month' },
  { expr: '0 0 1 1 *', label: 'Every January 1st' },
  { expr: '*/15 * * * *', label: 'Every 15 minutes' },
];

function explainField(value: string, index: number): string {
  const { min, max } = FIELD_RANGES[index];
  const fieldName = FIELD_NAMES[index];

  const monthName = (n: number) => MONTH_NAMES[n - 1] ?? String(n);
  const dowName = (n: number) => DOW_NAMES[n % 7] ?? String(n);
  const unitLabel = (n: number): string => {
    if (index === 0) return n === 1 ? 'minute' : 'minutes';
    if (index === 1) return n === 1 ? 'hour' : 'hours';
    if (index === 2) return n === 1 ? 'day' : 'days';
    if (index === 3) return n === 1 ? 'month' : 'months';
    return 'days';
  };

  const formatValue = (n: number): string => {
    if (index === 3) return monthName(n);
    if (index === 4) return dowName(n);
    if (index === 1) return `${n}:00`;
    return String(n);
  };

  if (value === '*') return `Every ${fieldName.toLowerCase()}`;

  // Step: */n or n/n
  const stepMatch = value.match(/^(\*|(\d+))\/?(\d+)$/);
  if (stepMatch && stepMatch[3]) {
    const step = parseInt(stepMatch[3], 10);
    const start = stepMatch[2] ? parseInt(stepMatch[2], 10) : min;
    if (step === 1) return `Every ${fieldName.toLowerCase()} from ${formatValue(start)}`;
    return `Every ${step} ${unitLabel(step)} starting at ${formatValue(start)}`;
  }

  // Range: n-m
  const rangeMatch = value.match(/^(\d+)-(\d+)$/);
  if (rangeMatch) {
    const from = parseInt(rangeMatch[1], 10);
    const to = parseInt(rangeMatch[2], 10);
    if (index === 4) return `${dowName(from)} through ${dowName(to)}`;
    if (index === 3) return `${monthName(from)} through ${monthName(to)}`;
    return `${fieldName} from ${from} to ${to}`;
  }

  // List: n,m,o
  if (value.includes(',')) {
    const parts = value.split(',').map(p => p.trim());
    const labels = parts.map(p => {
      const n = parseInt(p, 10);
      return formatValue(n);
    });
    const last = labels.pop();
    return `${fieldName} ${labels.join(', ')}${labels.length > 0 ? ' and ' : ''}${last}`;
  }

  // Single number
  const num = parseInt(value, 10);
  if (!isNaN(num)) {
    if (index === 0) return `At minute ${num}`;
    if (index === 1) return `At ${num}:00`;
    if (index === 2) return `On day ${num} of the month`;
    if (index === 3) return `In ${monthName(num)}`;
    if (index === 4) return `On ${dowName(num)}`;
  }

  return value;
}

function parseCronField(value: string, min: number, max: number): number[] {
  const result = new Set<number>();

  const addRange = (from: number, to: number, step = 1) => {
    for (let i = from; i <= to; i += step) result.add(i);
  };

  const parts = value.split(',');
  for (const part of parts) {
    if (part === '*') {
      addRange(min, max);
      continue;
    }
    const stepMatch = part.match(/^(\*|(\d+))-?(\d+)?\/(\d+)$/);
    if (stepMatch) {
      const step = parseInt(stepMatch[4], 10);
      const start = stepMatch[2] ? parseInt(stepMatch[2], 10) : min;
      const end = stepMatch[3] ? parseInt(stepMatch[3], 10) : max;
      addRange(start, end, step);
      continue;
    }
    // */step without range
    const simpleStep = part.match(/^\*\/(\d+)$/);
    if (simpleStep) {
      addRange(min, max, parseInt(simpleStep[1], 10));
      continue;
    }
    const rangeMatch = part.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      addRange(parseInt(rangeMatch[1], 10), parseInt(rangeMatch[2], 10));
      continue;
    }
    const num = parseInt(part, 10);
    if (!isNaN(num)) result.add(num);
  }

  return Array.from(result).sort((a, b) => a - b);
}

function getNextRuns(expr: string, count: number): Date[] {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return [];

  const [mField, hField, domField, monField, dowField] = fields;

  const minutes = parseCronField(mField, 0, 59);
  const hours = parseCronField(hField, 0, 23);
  const doms = parseCronField(domField, 1, 31);
  const months = parseCronField(monField, 1, 12);
  const dows = parseCronField(dowField, 0, 7).map(d => d % 7);

  const domStar = domField === '*';
  const dowStar = dowField === '*';

  const results: Date[] = [];
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(now.getMinutes() + 1);

  let cur = new Date(now);
  const limit = new Date(cur);
  limit.setFullYear(limit.getFullYear() + 2);

  while (results.length < count && cur < limit) {
    const mo = cur.getMonth() + 1;
    if (!months.includes(mo)) {
      cur.setMonth(cur.getMonth() + 1);
      cur.setDate(1);
      cur.setHours(0, 0, 0, 0);
      continue;
    }

    const dom = cur.getDate();
    const dow = cur.getDay();
    const domMatch = doms.includes(dom);
    const dowMatch = dows.includes(dow);
    const dayMatch = domStar && dowStar ? true
      : domStar ? dowMatch
      : dowStar ? domMatch
      : domMatch || dowMatch;

    if (!dayMatch) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
      continue;
    }

    const hr = cur.getHours();
    if (!hours.includes(hr)) {
      const nextHr = hours.find(h => h > hr);
      if (nextHr !== undefined) {
        cur.setHours(nextHr, 0, 0, 0);
      } else {
        cur.setDate(cur.getDate() + 1);
        cur.setHours(0, 0, 0, 0);
      }
      continue;
    }

    const mn = cur.getMinutes();
    const nextMin = minutes.find(m => m >= mn);
    if (nextMin !== undefined && nextMin === mn) {
      results.push(new Date(cur));
      cur.setMinutes(mn + 1);
    } else if (nextMin !== undefined) {
      cur.setMinutes(nextMin, 0, 0);
    } else {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(0, 0, 0, 0);
    }
  }

  return results;
}

function validateCron(expr: string): string | null {
  const fields = expr.trim().split(/\s+/);
  if (fields.length !== 5) return 'Cron expression must have exactly 5 fields.';

  const fieldPattern = /^(\*|(\d+(-\d+)?(\/\d+)?)(,\d+(-\d+)?(\/\d+)?)*|\*\/\d+|\d+\/\d+)$/;
  for (let i = 0; i < 5; i++) {
    if (!fieldPattern.test(fields[i])) {
      return `Invalid syntax in field ${i + 1} (${FIELD_NAMES[i]}): "${fields[i]}"`;
    }
  }
  return null;
}

function formatDate(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())} (${days[d.getDay()]})`;
}

export default function CronExpressionExplainer() {
  const [input, setInput] = useState('0 9 * * 1-5');
  const [expr, setExpr] = useState('0 9 * * 1-5');
  const [error, setError] = useState<string | null>(null);
  const [explained, setExplained] = useState(true);

  const fields = expr.trim().split(/\s+/);
  const validFields = fields.length === 5;

  const handleExplain = () => {
    const err = validateCron(input);
    setError(err);
    if (!err) {
      setExpr(input);
      setExplained(true);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') handleExplain();
  };

  const handlePreset = (preset: string) => {
    setInput(preset);
    setError(null);
    setExpr(preset);
    setExplained(true);
  };

  const nextRuns = explained && validFields && !error ? getNextRuns(expr, 5) : [];

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="bg-surface rounded-xl border border-border p-5 space-y-4">
        <label class="block text-sm font-medium text-text-muted mb-1">Cron Expression</label>
        <div class="flex gap-2">
          <input
            type="text"
            value={input}
            onInput={(e) => { setInput((e.target as HTMLInputElement).value); setExplained(false); }}
            onKeyDown={handleKeyDown}
            placeholder="e.g. 0 9 * * 1-5"
            class="flex-1 font-mono bg-bg border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-primary text-text placeholder-text-muted"
          />
          <button
            onClick={handleExplain}
            class="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Explain
          </button>
        </div>

        {/* Color-coded field chips */}
        {validFields && (
          <div class="flex flex-wrap gap-2 pt-1">
            {fields.map((f, i) => (
              <span
                key={i}
                class={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg border text-xs font-mono ${FIELD_COLORS[i].bg} ${FIELD_COLORS[i].text} ${FIELD_COLORS[i].border}`}
              >
                <span class="font-bold text-base leading-tight">{f}</span>
                <span class="opacity-70 text-[10px] font-sans">{FIELD_NAMES[i]}</span>
              </span>
            ))}
          </div>
        )}

        {error && (
          <p class="text-red-400 text-sm flex items-center gap-1.5">
            <span>✕</span> {error}
          </p>
        )}
      </div>

      {/* Presets */}
      <div class="bg-surface rounded-xl border border-border p-5">
        <p class="text-sm font-medium text-text-muted mb-3">Common Presets</p>
        <div class="flex flex-wrap gap-2">
          {PRESETS.map(({ expr: pe, label }) => (
            <button
              key={pe}
              onClick={() => handlePreset(pe)}
              class={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                expr === pe && explained
                  ? 'bg-primary/20 border-primary/50 text-primary'
                  : 'bg-bg border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              <span class="font-mono mr-1.5">{pe}</span>
              <span class="opacity-70">— {label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Field explanations */}
      {explained && validFields && !error && (
        <div class="bg-surface rounded-xl border border-border p-5 space-y-3">
          <p class="text-sm font-semibold text-text mb-2">Field Breakdown</p>
          {fields.map((f, i) => (
            <div
              key={i}
              class={`flex items-start gap-3 p-3 rounded-lg border ${FIELD_COLORS[i].bg} ${FIELD_COLORS[i].border}`}
            >
              <span class={`font-mono font-bold text-sm min-w-[3rem] text-center px-2 py-0.5 rounded ${FIELD_COLORS[i].text}`}>
                {f}
              </span>
              <div class="flex-1 min-w-0">
                <span class={`text-xs font-semibold uppercase tracking-wide ${FIELD_COLORS[i].text} opacity-80`}>
                  {FIELD_NAMES[i]}
                </span>
                <span class="text-xs text-text-muted ml-2">({FIELD_RANGES[i].label})</span>
                <p class="text-sm text-text mt-0.5">{explainField(f, i)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Next runs */}
      {nextRuns.length > 0 && (
        <div class="bg-surface rounded-xl border border-border p-5">
          <p class="text-sm font-semibold text-text mb-3">Next 5 Scheduled Runs</p>
          <ul class="space-y-2">
            {nextRuns.map((d, i) => (
              <li key={i} class="flex items-center gap-3 text-sm">
                <span class="w-5 h-5 rounded-full bg-primary/20 text-primary text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {i + 1}
                </span>
                <span class="font-mono text-text">{formatDate(d)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {explained && validFields && !error && nextRuns.length === 0 && (
        <div class="bg-surface rounded-xl border border-border p-5 text-sm text-text-muted">
          No upcoming run times found within the next 2 years for this expression.
        </div>
      )}
    </div>
  );
}
