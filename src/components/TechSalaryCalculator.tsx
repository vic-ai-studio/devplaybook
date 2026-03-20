import { useState } from 'preact/hooks';

const SALARY_DATA: Record<string, Record<string, Record<string, [number, number]>>> = {
  'Software Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [105000, 145000],
      'New York': [95000, 135000],
      'Seattle': [100000, 140000],
      'Austin': [80000, 115000],
      'Chicago': [75000, 110000],
      'Remote (US)': [85000, 125000],
      'London': [45000, 70000],
      'Berlin': [40000, 60000],
      'Toronto': [65000, 90000],
      'Sydney': [70000, 100000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [145000, 200000],
      'New York': [130000, 185000],
      'Seattle': [140000, 195000],
      'Austin': [115000, 160000],
      'Chicago': [110000, 150000],
      'Remote (US)': [120000, 170000],
      'London': [65000, 95000],
      'Berlin': [55000, 80000],
      'Toronto': [85000, 120000],
      'Sydney': [95000, 135000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [200000, 280000],
      'New York': [185000, 260000],
      'Seattle': [195000, 275000],
      'Austin': [160000, 220000],
      'Chicago': [150000, 210000],
      'Remote (US)': [170000, 240000],
      'London': [90000, 130000],
      'Berlin': [75000, 110000],
      'Toronto': [115000, 165000],
      'Sydney': [130000, 185000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [280000, 400000],
      'New York': [260000, 370000],
      'Seattle': [275000, 390000],
      'Austin': [220000, 310000],
      'Chicago': [210000, 295000],
      'Remote (US)': [240000, 340000],
      'London': [130000, 185000],
      'Berlin': [110000, 155000],
      'Toronto': [165000, 235000],
      'Sydney': [185000, 260000],
    },
  },
  'Frontend Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [95000, 135000],
      'New York': [88000, 125000],
      'Seattle': [92000, 130000],
      'Austin': [72000, 105000],
      'Chicago': [70000, 100000],
      'Remote (US)': [78000, 115000],
      'London': [40000, 62000],
      'Berlin': [38000, 56000],
      'Toronto': [60000, 85000],
      'Sydney': [65000, 92000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [135000, 185000],
      'New York': [120000, 170000],
      'Seattle': [130000, 180000],
      'Austin': [105000, 148000],
      'Chicago': [100000, 140000],
      'Remote (US)': [110000, 158000],
      'London': [60000, 88000],
      'Berlin': [50000, 74000],
      'Toronto': [78000, 112000],
      'Sydney': [88000, 125000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [185000, 260000],
      'New York': [170000, 240000],
      'Seattle': [180000, 255000],
      'Austin': [148000, 205000],
      'Chicago': [140000, 195000],
      'Remote (US)': [158000, 225000],
      'London': [85000, 120000],
      'Berlin': [70000, 102000],
      'Toronto': [108000, 152000],
      'Sydney': [122000, 172000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [260000, 370000],
      'New York': [240000, 340000],
      'Seattle': [255000, 360000],
      'Austin': [205000, 285000],
      'Chicago': [195000, 275000],
      'Remote (US)': [225000, 315000],
      'London': [120000, 172000],
      'Berlin': [102000, 144000],
      'Toronto': [152000, 218000],
      'Sydney': [172000, 242000],
    },
  },
  'Backend Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [100000, 140000],
      'New York': [92000, 130000],
      'Seattle': [96000, 135000],
      'Austin': [76000, 110000],
      'Chicago': [73000, 105000],
      'Remote (US)': [82000, 120000],
      'London': [43000, 66000],
      'Berlin': [39000, 58000],
      'Toronto': [62000, 88000],
      'Sydney': [67000, 96000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [140000, 192000],
      'New York': [125000, 175000],
      'Seattle': [135000, 188000],
      'Austin': [110000, 155000],
      'Chicago': [105000, 145000],
      'Remote (US)': [115000, 163000],
      'London': [62000, 90000],
      'Berlin': [52000, 76000],
      'Toronto': [80000, 115000],
      'Sydney': [90000, 128000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [192000, 268000],
      'New York': [175000, 248000],
      'Seattle': [188000, 265000],
      'Austin': [155000, 215000],
      'Chicago': [145000, 202000],
      'Remote (US)': [163000, 232000],
      'London': [88000, 125000],
      'Berlin': [73000, 106000],
      'Toronto': [112000, 158000],
      'Sydney': [126000, 178000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [268000, 385000],
      'New York': [248000, 355000],
      'Seattle': [265000, 375000],
      'Austin': [215000, 300000],
      'Chicago': [202000, 285000],
      'Remote (US)': [232000, 328000],
      'London': [125000, 178000],
      'Berlin': [106000, 150000],
      'Toronto': [158000, 225000],
      'Sydney': [178000, 252000],
    },
  },
  'Full Stack Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [100000, 142000],
      'New York': [90000, 128000],
      'Seattle': [95000, 134000],
      'Austin': [75000, 108000],
      'Chicago': [72000, 104000],
      'Remote (US)': [80000, 118000],
      'London': [42000, 64000],
      'Berlin': [38000, 57000],
      'Toronto': [61000, 86000],
      'Sydney': [66000, 94000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [142000, 195000],
      'New York': [128000, 178000],
      'Seattle': [134000, 186000],
      'Austin': [108000, 152000],
      'Chicago': [104000, 144000],
      'Remote (US)': [118000, 165000],
      'London': [62000, 90000],
      'Berlin': [52000, 76000],
      'Toronto': [80000, 115000],
      'Sydney': [90000, 128000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [195000, 272000],
      'New York': [178000, 252000],
      'Seattle': [186000, 262000],
      'Austin': [152000, 212000],
      'Chicago': [144000, 200000],
      'Remote (US)': [165000, 232000],
      'London': [88000, 126000],
      'Berlin': [73000, 106000],
      'Toronto': [112000, 160000],
      'Sydney': [126000, 178000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [272000, 388000],
      'New York': [252000, 358000],
      'Seattle': [262000, 372000],
      'Austin': [212000, 298000],
      'Chicago': [200000, 282000],
      'Remote (US)': [232000, 325000],
      'London': [126000, 180000],
      'Berlin': [106000, 150000],
      'Toronto': [160000, 228000],
      'Sydney': [178000, 252000],
    },
  },
  'DevOps / Platform Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [98000, 138000],
      'New York': [90000, 128000],
      'Seattle': [94000, 133000],
      'Austin': [74000, 107000],
      'Chicago': [71000, 103000],
      'Remote (US)': [79000, 116000],
      'London': [42000, 65000],
      'Berlin': [38000, 56000],
      'Toronto': [61000, 86000],
      'Sydney': [66000, 93000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [138000, 190000],
      'New York': [128000, 178000],
      'Seattle': [133000, 185000],
      'Austin': [107000, 150000],
      'Chicago': [103000, 143000],
      'Remote (US)': [116000, 162000],
      'London': [63000, 92000],
      'Berlin': [52000, 76000],
      'Toronto': [79000, 113000],
      'Sydney': [89000, 127000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [190000, 265000],
      'New York': [178000, 250000],
      'Seattle': [185000, 260000],
      'Austin': [150000, 210000],
      'Chicago': [143000, 200000],
      'Remote (US)': [162000, 228000],
      'London': [87000, 124000],
      'Berlin': [72000, 105000],
      'Toronto': [110000, 156000],
      'Sydney': [124000, 175000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [265000, 375000],
      'New York': [250000, 355000],
      'Seattle': [260000, 368000],
      'Austin': [210000, 295000],
      'Chicago': [200000, 280000],
      'Remote (US)': [228000, 320000],
      'London': [124000, 176000],
      'Berlin': [105000, 148000],
      'Toronto': [156000, 222000],
      'Sydney': [175000, 248000],
    },
  },
  'Data Engineer': {
    'Entry (0-2 yrs)': {
      'San Francisco': [95000, 132000],
      'New York': [88000, 124000],
      'Seattle': [92000, 130000],
      'Austin': [72000, 104000],
      'Chicago': [70000, 100000],
      'Remote (US)': [77000, 113000],
      'London': [40000, 62000],
      'Berlin': [37000, 55000],
      'Toronto': [59000, 84000],
      'Sydney': [64000, 91000],
    },
    'Mid (3-5 yrs)': {
      'San Francisco': [132000, 182000],
      'New York': [124000, 172000],
      'Seattle': [130000, 180000],
      'Austin': [104000, 146000],
      'Chicago': [100000, 140000],
      'Remote (US)': [113000, 158000],
      'London': [60000, 88000],
      'Berlin': [50000, 74000],
      'Toronto': [77000, 110000],
      'Sydney': [87000, 124000],
    },
    'Senior (6-10 yrs)': {
      'San Francisco': [182000, 255000],
      'New York': [172000, 240000],
      'Seattle': [180000, 252000],
      'Austin': [146000, 204000],
      'Chicago': [140000, 196000],
      'Remote (US)': [158000, 220000],
      'London': [85000, 120000],
      'Berlin': [70000, 102000],
      'Toronto': [107000, 152000],
      'Sydney': [121000, 170000],
    },
    'Staff/Principal (10+ yrs)': {
      'San Francisco': [255000, 362000],
      'New York': [240000, 340000],
      'Seattle': [252000, 358000],
      'Austin': [204000, 288000],
      'Chicago': [196000, 275000],
      'Remote (US)': [220000, 312000],
      'London': [120000, 170000],
      'Berlin': [102000, 144000],
      'Toronto': [152000, 215000],
      'Sydney': [170000, 242000],
    },
  },
};

const ROLES = Object.keys(SALARY_DATA);
const EXPERIENCES = ['Entry (0-2 yrs)', 'Mid (3-5 yrs)', 'Senior (6-10 yrs)', 'Staff/Principal (10+ yrs)'];
const LOCATIONS = ['San Francisco', 'New York', 'Seattle', 'Austin', 'Chicago', 'Remote (US)', 'London', 'Berlin', 'Toronto', 'Sydney'];

function fmt(n: number) {
  return n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
}

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit';

export default function TechSalaryCalculator() {
  const [role, setRole] = useState(ROLES[0]);
  const [exp, setExp] = useState(EXPERIENCES[1]);
  const [loc, setLoc] = useState('San Francisco');
  const [copied, setCopied] = useState(false);

  const range = SALARY_DATA[role]?.[exp]?.[loc];
  const low = range?.[0] ?? 0;
  const high = range?.[1] ?? 0;
  const mid = Math.round((low + high) / 2);

  const result = range
    ? `${role} · ${exp} · ${loc}\nRange: ${fmt(low)} – ${fmt(high)}\nMedian: ${fmt(mid)}`
    : '';

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Inputs */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Role</label>
          <select
            value={role}
            onChange={(e) => setRole((e.target as HTMLSelectElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Experience</label>
          <select
            value={exp}
            onChange={(e) => setExp((e.target as HTMLSelectElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {EXPERIENCES.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </div>
        <div>
          <label class="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Location</label>
          <select
            value={loc}
            onChange={(e) => setLoc((e.target as HTMLSelectElement).value)}
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
          >
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>

      {/* Result */}
      {range && (
        <div class="bg-bg-card border border-border rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold">{role}</h2>
            <span class="text-xs text-text-muted">{exp} · {loc}</span>
          </div>
          <div class="grid grid-cols-3 gap-4 mb-4">
            <div class="text-center p-4 bg-bg rounded-lg border border-border">
              <div class="text-xs text-text-muted mb-1">Low</div>
              <div class="text-2xl font-bold text-text">{fmt(low)}</div>
            </div>
            <div class="text-center p-4 bg-primary/10 rounded-lg border border-primary/30">
              <div class="text-xs text-primary font-semibold mb-1">Median</div>
              <div class="text-2xl font-bold text-primary">{fmt(mid)}</div>
            </div>
            <div class="text-center p-4 bg-bg rounded-lg border border-border">
              <div class="text-xs text-text-muted mb-1">High</div>
              <div class="text-2xl font-bold text-text">{fmt(high)}</div>
            </div>
          </div>
          {/* Bar */}
          <div class="relative h-3 bg-bg rounded-full overflow-hidden mb-2">
            <div
              class="absolute left-0 top-0 h-full bg-gradient-to-r from-primary/40 to-primary rounded-full"
              style={{ width: '100%' }}
            />
          </div>
          <div class="flex justify-between text-xs text-text-muted mb-4">
            <span>{fmt(low)}</span>
            <span>{fmt(high)}</span>
          </div>
          <button
            onClick={copy}
            class="w-full py-2 rounded-lg border border-border text-sm hover:border-primary hover:text-primary transition-colors"
          >
            {copied ? '✅ Copied!' : '📋 Copy result'}
          </button>
        </div>
      )}

      {/* Notes */}
      <p class="text-xs text-text-muted">
        Data is approximate and based on publicly available compensation reports (Levels.fyi, LinkedIn Salary, Glassdoor, 2024–2025).
        Numbers represent total cash compensation (base + bonus). Equity not included.
      </p>

      {/* Gumroad CTA */}
      <div class="rounded-xl border border-primary/30 bg-gradient-to-br from-bg-card to-bg p-6 text-center mt-4">
        <p class="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Want more career tools?</p>
        <h3 class="text-xl font-bold mb-1">DevToolkit Starter Kit</h3>
        <p class="text-text-muted text-sm mb-4">Build your own developer tools site with 12 pre-built tools. Astro + Preact + Tailwind, ready to deploy on Cloudflare Pages.</p>
        <a
          href={DEVTOOLKIT_URL}
          target="_blank"
          rel="noopener noreferrer"
          class="inline-block bg-primary hover:bg-primary-dark text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
        >
          Get DevToolkit Starter Kit — $19 →
        </a>
      </div>
    </div>
  );
}
