import { useState, useMemo } from 'preact/hooks';

type Browser = 'chromium' | 'firefox' | 'webkit';
type Reporter = 'list' | 'dot' | 'line' | 'html' | 'json' | 'junit' | 'github';
type ProjectMode = 'single' | 'multi';

interface Config {
  browsers: Browser[];
  baseURL: string;
  timeout: number;
  expectTimeout: number;
  retries: number;
  workers: string;
  fullyParallel: boolean;
  reporter: Reporter[];
  outputDir: string;
  screenshotOn: 'off' | 'on' | 'only-on-failure';
  videoOn: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  traceOn: 'off' | 'on' | 'retain-on-failure' | 'on-first-retry';
  testDir: string;
  testMatch: string;
  forbidOnly: boolean;
  projectMode: ProjectMode;
  useTypeScript: boolean;
  webServerCommand: string;
  webServerPort: string;
}

const DEFAULT: Config = {
  browsers: ['chromium'],
  baseURL: 'http://localhost:3000',
  timeout: 30000,
  expectTimeout: 5000,
  retries: 0,
  workers: '50%',
  fullyParallel: true,
  reporter: ['html'],
  outputDir: 'test-results',
  screenshotOn: 'only-on-failure',
  videoOn: 'retain-on-failure',
  traceOn: 'on-first-retry',
  testDir: 'tests',
  testMatch: '**/*.spec.{ts,js}',
  forbidOnly: false,
  projectMode: 'single',
  useTypeScript: true,
  webServerCommand: '',
  webServerPort: '',
};

function generateConfig(cfg: Config): string {
  const lang = cfg.useTypeScript;
  const imp = lang
    ? `import { defineConfig, devices } from '@playwright/test';`
    : `const { defineConfig, devices } = require('@playwright/test');`;

  const reporters = cfg.reporter.map(r => {
    if (r === 'html') return `  ['html']`;
    if (r === 'json') return `  ['json', { outputFile: 'test-results/results.json' }]`;
    if (r === 'junit') return `  ['junit', { outputFile: 'test-results/results.xml' }]`;
    return `  ['${r}']`;
  });

  const projects = cfg.projectMode === 'multi'
    ? cfg.browsers.map(b => {
        const deviceMap: Record<Browser, string> = {
          chromium: 'Desktop Chrome',
          firefox: 'Desktop Firefox',
          webkit: 'Desktop Safari',
        };
        return `    {
      name: '${b}',
      use: { ...devices['${deviceMap[b]}'] },
    }`;
      }).join(',\n')
    : cfg.browsers.map(b => {
        return `    { name: '${b}', use: { browserName: '${b}' } }`;
      }).join(',\n');

  const webServer = cfg.webServerCommand
    ? `\n  webServer: {
    command: '${cfg.webServerCommand}',
    url: 'http://localhost:${cfg.webServerPort || '3000'}',
    reuseExistingServer: !process.env.CI,
  },`
    : '';

  const forbidOnly = cfg.forbidOnly
    ? `\n  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,`
    : '';

  const output = `${imp}

${lang ? 'export default' : 'module.exports ='} defineConfig({
  testDir: './${cfg.testDir}',
  testMatch: '${cfg.testMatch}',

  /* Maximum time one test can run (ms) */
  timeout: ${cfg.timeout},

  /* Global assertion timeout */
  expect: {
    timeout: ${cfg.expectTimeout},
  },

  /* Run tests in files in parallel */
  fullyParallel: ${cfg.fullyParallel},
${forbidOnly}
  /* Retry on CI only */
  retries: ${cfg.retries},

  /* Parallel workers (number or percentage of CPUs) */
  workers: ${/^\d+$/.test(cfg.workers) ? cfg.workers : `'${cfg.workers}'`},

  /* Reporter to use */
  reporter: [
${reporters.join(',\n')}
  ],

  /* Output directory for artifacts */
  outputDir: './${cfg.outputDir}',

  /* Shared settings for all projects */
  use: {
    /* Base URL for navigation */
    baseURL: '${cfg.baseURL}',

    /* Collect trace: ${cfg.traceOn} */
    trace: '${cfg.traceOn}',

    /* Screenshot on failure */
    screenshot: '${cfg.screenshotOn}',

    /* Video recording */
    video: '${cfg.videoOn}',
  },

  /* Configure projects for browsers */
  projects: [
${projects}
  ],
${webServer}
});
`;

  return output.trim();
}

const BROWSER_OPTIONS: { value: Browser; label: string }[] = [
  { value: 'chromium', label: 'Chromium (Chrome/Edge)' },
  { value: 'firefox', label: 'Firefox' },
  { value: 'webkit', label: 'WebKit (Safari)' },
];

const REPORTER_OPTIONS: { value: Reporter; label: string; desc: string }[] = [
  { value: 'html', label: 'HTML', desc: 'Interactive HTML report (recommended)' },
  { value: 'list', label: 'List', desc: 'Default terminal output' },
  { value: 'dot', label: 'Dot', desc: 'Compact dots per test' },
  { value: 'line', label: 'Line', desc: 'One line per test' },
  { value: 'json', label: 'JSON', desc: 'Machine-readable JSON output' },
  { value: 'junit', label: 'JUnit XML', desc: 'For CI systems (Jenkins, Azure)' },
  { value: 'github', label: 'GitHub', desc: 'GitHub Actions annotations' },
];

export default function PlaywrightTestRunnerHelper() {
  const [cfg, setCfg] = useState<Config>({ ...DEFAULT });
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => generateConfig(cfg), [cfg]);

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setCfg(prev => ({ ...prev, [key]: value }));
  }

  function toggleBrowser(b: Browser) {
    const next = cfg.browsers.includes(b)
      ? cfg.browsers.filter(x => x !== b)
      : [...cfg.browsers, b];
    if (next.length > 0) set('browsers', next);
  }

  function toggleReporter(r: Reporter) {
    const next = cfg.reporter.includes(r)
      ? cfg.reporter.filter(x => x !== r)
      : [...cfg.reporter, r];
    if (next.length > 0) set('reporter', next);
  }

  function copyToClipboard() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputClass = 'bg-surface border border-border rounded px-3 py-1.5 text-sm focus:outline-none focus:border-accent w-full';
  const labelClass = 'block text-xs text-text-muted mb-1';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-5">
        {/* Browsers */}
        <div>
          <p class={labelClass}>Browsers</p>
          <div class="flex flex-wrap gap-2">
            {BROWSER_OPTIONS.map(b => (
              <label key={b.value} class="flex items-center gap-2 cursor-pointer text-sm bg-surface border border-border rounded px-3 py-1.5 hover:border-accent transition-colors">
                <input
                  type="checkbox"
                  checked={cfg.browsers.includes(b.value)}
                  onChange={() => toggleBrowser(b.value)}
                  class="accent-accent"
                />
                {b.label}
              </label>
            ))}
          </div>
        </div>

        {/* Base URL */}
        <div>
          <label class={labelClass}>Base URL</label>
          <input
            value={cfg.baseURL}
            onInput={e => set('baseURL', (e.target as HTMLInputElement).value)}
            placeholder="http://localhost:3000"
            class={inputClass}
          />
        </div>

        {/* Timeouts */}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class={labelClass}>Test timeout (ms)</label>
            <input
              type="number"
              value={cfg.timeout}
              onInput={e => set('timeout', Number((e.target as HTMLInputElement).value))}
              min={1000}
              step={1000}
              class={inputClass}
            />
          </div>
          <div>
            <label class={labelClass}>Expect timeout (ms)</label>
            <input
              type="number"
              value={cfg.expectTimeout}
              onInput={e => set('expectTimeout', Number((e.target as HTMLInputElement).value))}
              min={500}
              step={500}
              class={inputClass}
            />
          </div>
        </div>

        {/* Retries + Workers */}
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class={labelClass}>Retries</label>
            <select value={cfg.retries} onChange={e => set('retries', Number((e.target as HTMLSelectElement).value))} class={inputClass}>
              {[0, 1, 2, 3].map(n => <option key={n} value={n}>{n} {n === 0 ? '(no retry)' : n === 1 ? '(retry once)' : 'retries'}</option>)}
            </select>
          </div>
          <div>
            <label class={labelClass}>Workers</label>
            <select value={cfg.workers} onChange={e => set('workers', (e.target as HTMLSelectElement).value)} class={inputClass}>
              <option value="1">1 (serial)</option>
              <option value="2">2</option>
              <option value="4">4</option>
              <option value="50%">50% of CPUs</option>
              <option value="100%">100% of CPUs</option>
            </select>
          </div>
        </div>

        {/* Reporters */}
        <div>
          <p class={labelClass}>Reporters</p>
          <div class="space-y-1.5">
            {REPORTER_OPTIONS.map(r => (
              <label key={r.value} class="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={cfg.reporter.includes(r.value)}
                  onChange={() => toggleReporter(r.value)}
                  class="accent-accent"
                />
                <span class="font-medium">{r.label}</span>
                <span class="text-xs text-text-muted">{r.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Artifacts */}
        <div class="grid grid-cols-1 gap-3">
          <div>
            <label class={labelClass}>Screenshots</label>
            <select value={cfg.screenshotOn} onChange={e => set('screenshotOn', (e.target as HTMLSelectElement).value as Config['screenshotOn'])} class={inputClass}>
              <option value="off">Off</option>
              <option value="on">Always on</option>
              <option value="only-on-failure">Only on failure</option>
            </select>
          </div>
          <div>
            <label class={labelClass}>Video recording</label>
            <select value={cfg.videoOn} onChange={e => set('videoOn', (e.target as HTMLSelectElement).value as Config['videoOn'])} class={inputClass}>
              <option value="off">Off</option>
              <option value="on">Always on</option>
              <option value="retain-on-failure">Retain on failure</option>
              <option value="on-first-retry">On first retry</option>
            </select>
          </div>
          <div>
            <label class={labelClass}>Trace</label>
            <select value={cfg.traceOn} onChange={e => set('traceOn', (e.target as HTMLSelectElement).value as Config['traceOn'])} class={inputClass}>
              <option value="off">Off</option>
              <option value="on">Always on</option>
              <option value="retain-on-failure">Retain on failure</option>
              <option value="on-first-retry">On first retry</option>
            </select>
          </div>
        </div>

        {/* Advanced */}
        <div class="space-y-3">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class={labelClass}>Test directory</label>
              <input value={cfg.testDir} onInput={e => set('testDir', (e.target as HTMLInputElement).value)} class={inputClass} />
            </div>
            <div>
              <label class={labelClass}>Output directory</label>
              <input value={cfg.outputDir} onInput={e => set('outputDir', (e.target as HTMLInputElement).value)} class={inputClass} />
            </div>
          </div>
          <div class="flex flex-wrap gap-4 text-sm">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.fullyParallel} onChange={e => set('fullyParallel', (e.target as HTMLInputElement).checked)} class="accent-accent" />
              Fully parallel
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.forbidOnly} onChange={e => set('forbidOnly', (e.target as HTMLInputElement).checked)} class="accent-accent" />
              Forbid .only on CI
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={cfg.useTypeScript} onChange={e => set('useTypeScript', (e.target as HTMLInputElement).checked)} class="accent-accent" />
              TypeScript
            </label>
          </div>
        </div>

        {/* Dev server */}
        <div>
          <p class={labelClass}>Web server (optional) — auto-start dev server before tests</p>
          <div class="grid grid-cols-3 gap-2">
            <div class="col-span-2">
              <input
                value={cfg.webServerCommand}
                onInput={e => set('webServerCommand', (e.target as HTMLInputElement).value)}
                placeholder="npm run dev"
                class={inputClass}
              />
            </div>
            <div>
              <input
                value={cfg.webServerPort}
                onInput={e => set('webServerPort', (e.target as HTMLInputElement).value)}
                placeholder="3000"
                class={inputClass}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <p class="text-sm font-semibold">
            playwright.config.{cfg.useTypeScript ? 'ts' : 'js'}
          </p>
          <button
            onClick={copyToClipboard}
            class="text-xs px-3 py-1.5 bg-accent hover:bg-accent/80 text-white rounded transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[580px] text-green-300 whitespace-pre leading-relaxed">
          {output}
        </pre>

        <div class="space-y-2 text-xs text-text-muted">
          <p class="font-semibold text-text">Quick start commands:</p>
          <div class="bg-surface border border-border rounded p-3 font-mono space-y-1">
            <div><span class="text-text-muted"># Install Playwright</span></div>
            <div class="text-green-400">npm init playwright@latest</div>
            <div class="mt-2"><span class="text-text-muted"># Run all tests</span></div>
            <div class="text-green-400">npx playwright test</div>
            <div class="mt-2"><span class="text-text-muted"># Run with UI mode</span></div>
            <div class="text-green-400">npx playwright test --ui</div>
            <div class="mt-2"><span class="text-text-muted"># Run specific browser</span></div>
            <div class="text-green-400">npx playwright test --project=chromium</div>
            <div class="mt-2"><span class="text-text-muted"># Debug mode</span></div>
            <div class="text-green-400">npx playwright test --debug</div>
            <div class="mt-2"><span class="text-text-muted"># Show HTML report</span></div>
            <div class="text-green-400">npx playwright show-report</div>
          </div>
        </div>
      </div>
    </div>
  );
}
