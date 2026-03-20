import { useState, useMemo } from 'preact/hooks';

const PRESETS = [
  { name: 'Every minute', cron: '* * * * *' },
  { name: 'Every hour', cron: '0 * * * *' },
  { name: 'Every day at midnight', cron: '0 0 * * *' },
  { name: 'Every Monday 9 AM', cron: '0 9 * * 1' },
  { name: 'Every 1st of month', cron: '0 0 1 * *' },
  { name: 'Every 5 minutes', cron: '*/5 * * * *' },
  { name: 'Weekdays at 8 AM', cron: '0 8 * * 1-5' },
  { name: 'Every Sunday 2 AM', cron: '0 2 * * 0' },
];

const FIELDS = ['Minute', 'Hour', 'Day of Month', 'Month', 'Day of Week'] as const;
const RANGES = ['0-59', '0-23', '1-31', '1-12', '0-6 (Sun-Sat)'];
const SPECIALS = ['*', ',', '-', '/'];

function describeCron(parts: string[]): string {
  if (parts.length !== 5) return 'Invalid cron expression';
  const [min, hr, dom, mon, dow] = parts;

  const descs: string[] = [];

  if (min === '*' && hr === '*') descs.push('Every minute');
  else if (min.startsWith('*/')) descs.push(`Every ${min.slice(2)} minutes`);
  else if (hr === '*') descs.push(`At minute ${min} of every hour`);
  else if (min === '0' && !hr.includes(',') && !hr.includes('-') && !hr.includes('/'))
    descs.push(`At ${hr.padStart(2, '0')}:00`);
  else descs.push(`At ${hr.padStart(2, '0')}:${min.padStart(2, '0')}`);

  if (dom !== '*') descs.push(`on day ${dom} of the month`);

  const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  if (mon !== '*') {
    const m = parseInt(mon);
    descs.push(m >= 1 && m <= 12 ? `in ${monthNames[m]}` : `in month ${mon}`);
  }

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  if (dow !== '*') {
    if (dow === '1-5') descs.push('on weekdays');
    else if (dow === '0,6') descs.push('on weekends');
    else {
      const d = parseInt(dow);
      descs.push(d >= 0 && d <= 6 ? `on ${dayNames[d]}` : `on day-of-week ${dow}`);
    }
  }

  return descs.join(' ');
}

function getNextRuns(parts: string[], count = 5): string[] {
  if (parts.length !== 5) return [];
  try {
    const [minP, hrP, domP, monP, dowP] = parts;
    const expand = (p: string, max: number, offset = 0): number[] => {
      if (p === '*') return Array.from({ length: max - offset + 1 }, (_, i) => i + offset);
      const nums: number[] = [];
      for (const seg of p.split(',')) {
        if (seg.includes('/')) {
          const [range, step] = seg.split('/');
          const s = parseInt(step);
          const start = range === '*' ? offset : parseInt(range);
          for (let i = start; i <= max; i += s) nums.push(i);
        } else if (seg.includes('-')) {
          const [a, b] = seg.split('-').map(Number);
          for (let i = a; i <= b; i++) nums.push(i);
        } else {
          nums.push(parseInt(seg));
        }
      }
      return nums.filter(n => n >= offset && n <= max);
    };

    const mins = expand(minP, 59, 0);
    const hrs = expand(hrP, 23, 0);
    const doms = expand(domP, 31, 1);
    const mons = expand(monP, 12, 1);
    const dows = expand(dowP, 6, 0);

    const results: string[] = [];
    const now = new Date();
    const d = new Date(now);

    for (let i = 0; i < 525960 && results.length < count; i++) {
      d.setTime(now.getTime() + i * 60000);
      if (mons.includes(d.getMonth() + 1) && doms.includes(d.getDate()) &&
          dows.includes(d.getDay()) && hrs.includes(d.getHours()) && mins.includes(d.getMinutes())) {
        results.push(d.toLocaleString());
      }
    }
    return results;
  } catch {
    return [];
  }
}

export default function CronGenerator() {
  const [fields, setFields] = useState(['0', '*', '*', '*', '*']);

  const cron = fields.join(' ');
  const parts = cron.split(' ');
  const description = useMemo(() => describeCron(parts), [cron]);
  const nextRuns = useMemo(() => getNextRuns(parts), [cron]);

  const updateField = (i: number, val: string) => {
    const next = [...fields];
    next[i] = val;
    setFields(next);
  };

  const loadPreset = (cronStr: string) => setFields(cronStr.split(' '));

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div class="flex gap-2 flex-wrap">
        {PRESETS.map(p => (
          <button
            key={p.name}
            onClick={() => loadPreset(p.cron)}
            class="bg-bg-card border border-border rounded-lg px-3 py-1 text-sm hover:border-primary text-text-muted hover:text-text"
          >
            {p.name}
          </button>
        ))}
      </div>

      {/* Expression display */}
      <div class="bg-bg-card border border-border rounded-xl p-6 text-center">
        <div class="font-mono text-3xl font-bold text-primary mb-2">{cron}</div>
        <p class="text-text-muted">{description}</p>
      </div>

      {/* Field editors */}
      <div class="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {FIELDS.map((name, i) => (
          <div key={name} class="bg-bg-card border border-border rounded-xl p-4">
            <label class="block text-sm font-semibold mb-1">{name}</label>
            <div class="text-xs text-text-muted mb-2">{RANGES[i]}</div>
            <input
              value={fields[i]}
              onInput={(e) => updateField(i, (e.target as HTMLInputElement).value)}
              class="w-full bg-bg-input border border-border rounded px-3 py-2 text-text font-mono text-center"
            />
            <div class="flex gap-1 mt-2 flex-wrap">
              {SPECIALS.map(s => (
                <button
                  key={s}
                  onClick={() => updateField(i, fields[i] === '*' ? s : fields[i] + s)}
                  class="text-xs bg-bg-input border border-border rounded px-2 py-0.5 text-text-muted hover:text-text"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Next Runs */}
      {nextRuns.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-4">
          <h3 class="font-semibold mb-3">Next 5 Runs</h3>
          <div class="space-y-1 text-sm font-mono">
            {nextRuns.map((r, i) => (
              <div key={i} class="flex gap-3">
                <span class="text-text-muted">#{i + 1}</span>
                <span class="text-secondary">{r}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Copy section */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="font-semibold mb-2">Usage Examples</h3>
        <div class="space-y-2 text-sm font-mono text-text-muted">
          <div>crontab: <span class="text-text">{cron} /path/to/command</span></div>
          <div>GitHub Actions: <span class="text-text">cron: '{cron}'</span></div>
          <div>node-cron: <span class="text-text">cron.schedule('{cron}', callback)</span></div>
        </div>
      </div>
    </div>
  );
}
