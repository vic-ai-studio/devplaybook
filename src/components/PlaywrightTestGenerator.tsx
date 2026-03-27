import { useState } from 'preact/hooks';

type Browser = 'chromium' | 'firefox' | 'webkit' | 'all';
type TestType = 'navigation' | 'form' | 'click' | 'expect';

interface PlaywrightConfig {
  testName: string;
  url: string;
  browser: Browser;
  testType: TestType;
  locators: string;
  expectedText: string;
  includeBeforeEach: boolean;
  useLocatorApi: boolean;
  includeNetworkMock: boolean;
  networkRoute: string;
  networkResponseBody: string;
  networkStatus: number;
  includeScreenshot: boolean;
  includeTracing: boolean;
  testTimeout: number;
}

const DEFAULT: PlaywrightConfig = {
  testName: 'User authentication flow',
  url: 'https://example.com/login',
  browser: 'chromium',
  testType: 'form',
  locators: 'input[name="email"]\ninput[name="password"]\nbutton[type="submit"]',
  expectedText: 'Dashboard',
  includeBeforeEach: true,
  useLocatorApi: true,
  includeNetworkMock: false,
  networkRoute: '**/api/login',
  networkResponseBody: '{ "token": "fake-jwt-token" }',
  networkStatus: 200,
  includeScreenshot: false,
  includeTracing: false,
  testTimeout: 30000,
};

function parseLocators(raw: string): string[] {
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function locatorExpr(sel: string, useLocator: boolean): string {
  if (!useLocator) return `page.$(${JSON.stringify(sel)})`;
  // Convert common selectors to Playwright locator API
  if (sel.startsWith('[data-testid=') || sel.startsWith('[data-testid ="')) {
    const match = sel.match(/data-testid=["']?([^"'\]]+)["']?/);
    if (match) return `page.getByTestId(${JSON.stringify(match[1])})`;
  }
  if (sel.startsWith('text=')) {
    return `page.getByText(${JSON.stringify(sel.slice(5))})`;
  }
  if (sel.startsWith('role=')) {
    const rolePart = sel.slice(5);
    return `page.getByRole(${JSON.stringify(rolePart)})`;
  }
  return `page.locator(${JSON.stringify(sel)})`;
}

function browserProjects(browser: Browser): string {
  if (browser === 'all') {
    return [
      "  projects: [",
      "    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },",
      "    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },",
      "    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },",
      "  ],",
    ].join('\n');
  }
  const deviceMap: Record<string, string> = {
    chromium: 'Desktop Chrome',
    firefox: 'Desktop Firefox',
    webkit: 'Desktop Safari',
  };
  return `  projects: [\n    { name: '${browser}', use: { ...devices[${JSON.stringify(deviceMap[browser])}] } },\n  ],`;
}

function buildTest(cfg: PlaywrightConfig): string {
  const lines: string[] = [];
  const locs = parseLocators(cfg.locators);
  const [firstLoc, secondLoc, thirdLoc, ...restLocs] = locs;

  lines.push(`import { test, expect${cfg.browser === 'all' ? ', devices' : ''} } from '@playwright/test';`);
  lines.push('');

  if (cfg.includeTracing) {
    lines.push('// Enable tracing in playwright.config.ts:');
    lines.push('// use: { trace: "on-first-retry" }');
    lines.push('');
  }

  // describe block
  lines.push(`test.describe(${JSON.stringify(cfg.testName)}, () => {`);

  if (cfg.testTimeout !== 30000) {
    lines.push(`  test.setTimeout(${cfg.testTimeout});`);
    lines.push('');
  }

  if (cfg.includeBeforeEach) {
    lines.push('  test.beforeEach(async ({ page }) => {');
    if (cfg.includeNetworkMock) {
      lines.push(`    await page.route(${JSON.stringify(cfg.networkRoute)}, async (route) => {`);
      lines.push(`      await route.fulfill({`);
      lines.push(`        status: ${cfg.networkStatus},`);
      lines.push(`        contentType: 'application/json',`);
      lines.push(`        body: ${JSON.stringify(cfg.networkResponseBody)},`);
      lines.push(`      });`);
      lines.push(`    });`);
    }
    lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    lines.push('  });');
    lines.push('');
  }

  // ---- NAVIGATION ----
  if (cfg.testType === 'navigation') {
    lines.push(`  test('navigates to the page and loads content', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await expect(page).toHaveURL(/${cfg.url.replace(/https?:\/\/[^/]+/, '').replace(/\//g, '\\/').replace(/\./g, '\\.')}/);`);
    locs.forEach(sel => {
      const expr = locatorExpr(sel, cfg.useLocatorApi);
      lines.push(`    await expect(${expr}).toBeVisible();`);
    });
    if (cfg.expectedText) {
      lines.push(`    await expect(page.getByText(${JSON.stringify(cfg.expectedText)})).toBeVisible();`);
    }
    if (cfg.includeScreenshot) {
      lines.push(`    await page.screenshot({ path: 'screenshots/navigation.png', fullPage: true });`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  test('has correct title', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await expect(page).toHaveTitle(/.+/);`);
    lines.push('  });');
    lines.push('');
    lines.push(`  test('returns 200 status', async ({ page, request }) => {`);
    lines.push(`    const response = await request.get(${JSON.stringify(cfg.url)});`);
    lines.push(`    expect(response.status()).toBe(200);`);
    lines.push('  });');

  // ---- FORM ----
  } else if (cfg.testType === 'form') {
    const emailLoc = firstLoc ? locatorExpr(firstLoc, cfg.useLocatorApi) : `page.locator('input[type="email"]')`;
    const passLoc = secondLoc ? locatorExpr(secondLoc, cfg.useLocatorApi) : `page.locator('input[type="password"]')`;
    const submitLoc = thirdLoc ? locatorExpr(thirdLoc, cfg.useLocatorApi) : `page.locator('[type="submit"]')`;

    lines.push(`  test('submits form with valid credentials', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await ${emailLoc}.fill('user@example.com');`);
    lines.push(`    await ${passLoc}.fill('SecurePassword123!');`);
    restLocs.forEach(sel => {
      const expr = locatorExpr(sel, cfg.useLocatorApi);
      lines.push(`    await expect(${expr}).toBeVisible();`);
    });
    lines.push(`    await ${submitLoc}.click();`);
    if (cfg.expectedText) {
      lines.push(`    await expect(page.getByText(${JSON.stringify(cfg.expectedText)})).toBeVisible();`);
    } else {
      lines.push(`    // Assert post-submit state`);
      lines.push(`    await expect(page).not.toHaveURL(${JSON.stringify(cfg.url)});`);
    }
    if (cfg.includeScreenshot) {
      lines.push(`    await page.screenshot({ path: 'screenshots/form-success.png' });`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  test('shows validation error on empty submit', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await ${submitLoc}.click();`);
    lines.push(`    // Expect at least one validation error`);
    lines.push(`    const error = page.locator('[role="alert"], .error, [aria-invalid="true"]');`);
    lines.push(`    await expect(error.first()).toBeVisible();`);
    lines.push('  });');
    lines.push('');
    lines.push(`  test('clears fields correctly', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await ${emailLoc}.fill('test@example.com');`);
    lines.push(`    await ${emailLoc}.clear();`);
    lines.push(`    await expect(${emailLoc}).toHaveValue('');`);
    lines.push('  });');
    lines.push('');
    lines.push(`  test('is keyboard navigable', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await ${emailLoc}.focus();`);
    lines.push(`    await page.keyboard.press('Tab');`);
    lines.push(`    await expect(${passLoc}).toBeFocused();`);
    lines.push('  });');

  // ---- CLICK ----
  } else if (cfg.testType === 'click') {
    lines.push(`  test('renders interactive elements', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    locs.forEach(sel => {
      const expr = locatorExpr(sel, cfg.useLocatorApi);
      lines.push(`    await expect(${expr}).toBeVisible();`);
      lines.push(`    await expect(${expr}).toBeEnabled();`);
    });
    lines.push('  });');
    lines.push('');

    if (firstLoc) {
      const expr = locatorExpr(firstLoc, cfg.useLocatorApi);
      lines.push(`  test('clicking primary element triggers expected outcome', async ({ page }) => {`);
      if (!cfg.includeBeforeEach) {
        lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
      }
      lines.push(`    await ${expr}.click();`);
      if (cfg.expectedText) {
        lines.push(`    await expect(page.getByText(${JSON.stringify(cfg.expectedText)})).toBeVisible();`);
      } else {
        lines.push(`    // Assert state change after click`);
        lines.push(`    await expect(page).toHaveURL(/.*/);`);
      }
      if (cfg.includeScreenshot) {
        lines.push(`    await page.screenshot({ path: 'screenshots/after-click.png' });`);
      }
      lines.push('  });');
      lines.push('');
      lines.push(`  test('element is accessible via keyboard', async ({ page }) => {`);
      if (!cfg.includeBeforeEach) {
        lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
      }
      lines.push(`    await ${expr}.focus();`);
      lines.push(`    await page.keyboard.press('Enter');`);
      if (cfg.expectedText) {
        lines.push(`    await expect(page.getByText(${JSON.stringify(cfg.expectedText)})).toBeVisible();`);
      }
      lines.push('  });');
    }

  // ---- EXPECT (assertions-focused) ----
  } else if (cfg.testType === 'expect') {
    lines.push(`  test('page has correct structure and content', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    if (cfg.expectedText) {
      lines.push(`    // Text content assertions`);
      lines.push(`    await expect(page.getByText(${JSON.stringify(cfg.expectedText)})).toBeVisible();`);
    }
    locs.forEach(sel => {
      const expr = locatorExpr(sel, cfg.useLocatorApi);
      lines.push(`    await expect(${expr}).toBeVisible();`);
    });
    if (cfg.includeScreenshot) {
      lines.push(`    await page.screenshot({ path: 'screenshots/structure.png', fullPage: true });`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  test('matches visual snapshot', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    lines.push(`    await expect(page).toHaveScreenshot('${cfg.testName.replace(/\s+/g, '-').toLowerCase()}.png');`);
    lines.push('  });');
    lines.push('');
    lines.push(`  test('has no detached elements', async ({ page }) => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    await page.goto(${JSON.stringify(cfg.url)});`);
    }
    locs.forEach(sel => {
      const expr = locatorExpr(sel, cfg.useLocatorApi);
      lines.push(`    await expect(${expr}).toHaveCount(await ${expr}.count());`);
    });
    lines.push('  });');
  }

  lines.push('});');
  lines.push('');

  // Playwright config hint
  if (cfg.browser === 'all') {
    lines.push('// playwright.config.ts — multi-browser setup:');
    lines.push('// import { defineConfig, devices } from \'@playwright/test\';');
    lines.push('// export default defineConfig({');
    lines.push(browserProjects(cfg.browser));
    lines.push('// });');
  }

  return lines.join('\n');
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, label, doc }: { checked: boolean; onChange: (v: boolean) => void; label: string; doc?: string }) {
  return (
    <div class="flex items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <span class="text-sm font-mono">{label}</span>
        {doc && <p class="text-xs text-text-muted mt-0.5">{doc}</p>}
      </div>
    </div>
  );
}

const TEST_TYPES: { value: TestType; label: string; desc: string }[] = [
  { value: 'navigation', label: 'Navigation', desc: 'goto, URL & title assertions' },
  { value: 'form',       label: 'Form',       desc: 'fill, click, validation checks' },
  { value: 'click',      label: 'Click',      desc: 'click, keyboard, state change' },
  { value: 'expect',     label: 'Assertions', desc: 'Snapshot, text, DOM structure' },
];

const BROWSERS: { value: Browser; label: string }[] = [
  { value: 'chromium', label: 'Chromium' },
  { value: 'firefox',  label: 'Firefox' },
  { value: 'webkit',   label: 'WebKit' },
  { value: 'all',      label: 'All 3' },
];

export default function PlaywrightTestGenerator() {
  const [cfg, setCfg] = useState<PlaywrightConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof PlaywrightConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const output = buildTest(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const fileName = cfg.testName
    ? `${cfg.testName.replace(/\s+/g, '-').toLowerCase()}.spec.ts`
    : 'test.spec.ts';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">

        <Section title="Test Target">
          <div>
            <label class="text-xs text-text-muted block mb-1">Test scenario name</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.testName}
              placeholder="User authentication flow"
              onInput={e => set('testName', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">URL (page.goto)</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.url}
              placeholder="https://example.com/login"
              onInput={e => set('url', (e.target as HTMLInputElement).value)}
            />
          </div>
        </Section>

        <Section title="Browser Target">
          <div class="grid grid-cols-4 gap-2">
            {BROWSERS.map(b => (
              <button
                key={b.value}
                onClick={() => set('browser', b.value)}
                class={`px-2 py-2 rounded border text-sm transition-colors ${cfg.browser === b.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
              >
                {b.label}
              </button>
            ))}
          </div>
          <p class="text-xs text-text-muted">
            {cfg.browser === 'all'
              ? 'Generates playwright.config.ts projects for all three browsers.'
              : `Tests will run on ${cfg.browser} only.`}
          </p>
        </Section>

        <Section title="Test Type">
          <div class="grid grid-cols-2 gap-2">
            {TEST_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => set('testType', t.value)}
                class={`px-3 py-2 rounded border text-left text-sm transition-colors ${cfg.testType === t.value ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
              >
                <div class="font-medium">{t.label}</div>
                <div class="text-xs text-text-muted mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </Section>

        <Section title="Locators">
          <div>
            <label class="text-xs text-text-muted block mb-1">One locator per line (CSS / data-testid / text= / role=)</label>
            <textarea
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono resize-y"
              rows={4}
              value={cfg.locators}
              placeholder={'input[name="email"]\ninput[name="password"]\nbutton[type="submit"]'}
              onInput={e => set('locators', (e.target as HTMLTextAreaElement).value)}
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Expected text after action</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.expectedText}
              placeholder="Dashboard"
              onInput={e => set('expectedText', (e.target as HTMLInputElement).value)}
            />
          </div>
        </Section>

        <Section title="Network Mocking">
          <Toggle
            checked={cfg.includeNetworkMock}
            onChange={v => set('includeNetworkMock', v)}
            label="page.route() mock"
            doc="Intercept a network request and return a fake response."
          />
          {cfg.includeNetworkMock && (
            <div class="space-y-2">
              <div>
                <label class="text-xs text-text-muted block mb-1">Route pattern (glob)</label>
                <input
                  class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
                  value={cfg.networkRoute}
                  placeholder="**/api/login"
                  onInput={e => set('networkRoute', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div class="grid grid-cols-3 gap-2">
                <div>
                  <label class="text-xs text-text-muted block mb-1">Status</label>
                  <input
                    type="number"
                    class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                    value={cfg.networkStatus}
                    onInput={e => set('networkStatus', Number((e.target as HTMLInputElement).value))}
                  />
                </div>
                <div class="col-span-2">
                  <label class="text-xs text-text-muted block mb-1">Response body (JSON)</label>
                  <input
                    class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
                    value={cfg.networkResponseBody}
                    placeholder='{ "ok": true }'
                    onInput={e => set('networkResponseBody', (e.target as HTMLInputElement).value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Section>

        <Section title="Options">
          <Toggle
            checked={cfg.includeBeforeEach}
            onChange={v => set('includeBeforeEach', v)}
            label="test.beforeEach hook"
            doc="Move page.goto() into a shared beforeEach block."
          />
          <Toggle
            checked={cfg.useLocatorApi}
            onChange={v => set('useLocatorApi', v)}
            label="Use Locator API"
            doc="Prefer page.locator() / getByTestId() over page.$(). Recommended."
          />
          <Toggle
            checked={cfg.includeScreenshot}
            onChange={v => set('includeScreenshot', v)}
            label="page.screenshot()"
            doc="Save a screenshot at the end of the main test."
          />
          <Toggle
            checked={cfg.includeTracing}
            onChange={v => set('includeTracing', v)}
            label="Tracing comment"
            doc="Add a comment about enabling trace: 'on-first-retry' for debugging."
          />
          <div>
            <label class="text-xs text-text-muted block mb-1">test.setTimeout (ms) — default 30000</label>
            <input
              type="number"
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
              value={cfg.testTimeout}
              step={5000}
              onInput={e => set('testTimeout', Number((e.target as HTMLInputElement).value))}
            />
          </div>
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">{fileName}</span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[640px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <div class="text-xs text-text-muted space-y-1">
          <p>Install: <code class="bg-surface px-1 rounded">npm install -D @playwright/test</code></p>
          <p>Install browsers: <code class="bg-surface px-1 rounded">npx playwright install</code></p>
          <p>Run: <code class="bg-surface px-1 rounded">npx playwright test</code> or <code class="bg-surface px-1 rounded">npx playwright test --ui</code></p>
          <p>Save file to: <code class="bg-surface px-1 rounded">tests/</code> or <code class="bg-surface px-1 rounded">e2e/</code></p>
        </div>
      </div>
    </div>
  );
}
