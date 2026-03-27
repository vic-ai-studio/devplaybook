import { useState } from 'preact/hooks';

type TestType = 'navigation' | 'form' | 'button' | 'api';

interface CypressConfig {
  componentName: string;
  url: string;
  testType: TestType;
  selectors: string;
  expectText: string;
  apiMethod: 'GET' | 'POST' | 'PUT' | 'DELETE';
  apiAlias: string;
  includeBeforeEach: boolean;
  includeViewport: boolean;
  viewport: '1280x720' | '375x667' | '768x1024';
  includeScreenshot: boolean;
  useDataTestId: boolean;
}

const DEFAULT: CypressConfig = {
  componentName: 'LoginPage',
  url: '/login',
  testType: 'form',
  selectors: '[data-testid="email-input"]\n[data-testid="password-input"]\n[data-testid="submit-btn"]',
  expectText: 'Welcome back',
  apiMethod: 'POST',
  apiAlias: 'loginRequest',
  includeBeforeEach: true,
  includeViewport: false,
  viewport: '1280x720',
  includeScreenshot: false,
  useDataTestId: true,
};

function parseSelectors(raw: string): string[] {
  return raw
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);
}

function buildTest(cfg: CypressConfig): string {
  const lines: string[] = [];
  const sels = parseSelectors(cfg.selectors);
  const [vw, vh] = cfg.viewport.split('x').map(Number);

  lines.push(`/// <reference types="cypress" />`);
  lines.push('');
  lines.push(`describe('${cfg.componentName}', () => {`);

  if (cfg.includeBeforeEach) {
    lines.push('  beforeEach(() => {');
    if (cfg.includeViewport) {
      lines.push(`    cy.viewport(${vw}, ${vh});`);
    }
    if (cfg.testType === 'api') {
      lines.push(`    cy.intercept('${cfg.apiMethod}', '${cfg.url}').as('${cfg.apiAlias}');`);
    }
    lines.push(`    cy.visit('${cfg.url}');`);
    lines.push('  });');
    lines.push('');
  }

  if (cfg.testType === 'navigation') {
    lines.push(`  it('navigates to ${cfg.url} and renders content', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    lines.push(`    cy.url().should('include', '${cfg.url}');`);
    if (sels.length > 0) {
      sels.forEach(sel => {
        lines.push(`    cy.get('${sel}').should('be.visible');`);
      });
    }
    if (cfg.expectText) {
      lines.push(`    cy.contains('${cfg.expectText}').should('be.visible');`);
    }
    if (cfg.includeScreenshot) {
      lines.push(`    cy.screenshot('${cfg.componentName.toLowerCase()}-navigation');`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  it('has correct page title', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    lines.push(`    cy.title().should('not.be.empty');`);
    lines.push('  });');

  } else if (cfg.testType === 'form') {
    const [firstSel, secondSel, submitSel, ...restSels] = sels;

    lines.push(`  it('submits the form with valid data', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    if (firstSel) {
      lines.push(`    cy.get('${firstSel}')`);
      lines.push(`      .should('be.visible')`);
      lines.push(`      .clear()`);
      lines.push(`      .type('test@example.com');`);
    }
    if (secondSel) {
      lines.push(`    cy.get('${secondSel}')`);
      lines.push(`      .should('be.visible')`);
      lines.push(`      .clear()`);
      lines.push(`      .type('SecurePassword123!');`);
    }
    restSels.forEach(sel => {
      lines.push(`    cy.get('${sel}').should('exist');`);
    });
    if (submitSel) {
      lines.push(`    cy.get('${submitSel}').should('not.be.disabled').click();`);
    }
    if (cfg.expectText) {
      lines.push(`    cy.contains('${cfg.expectText}').should('be.visible');`);
    }
    if (cfg.includeScreenshot) {
      lines.push(`    cy.screenshot('${cfg.componentName.toLowerCase()}-form-success');`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  it('shows validation errors on empty submit', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    if (submitSel) {
      lines.push(`    cy.get('${submitSel}').click();`);
    } else if (firstSel) {
      lines.push(`    // Submit without filling in fields`);
      lines.push(`    cy.get('form').submit();`);
    }
    lines.push(`    // Expect at least one error message`);
    lines.push(`    cy.get('[role="alert"], .error, [data-testid*="error"]').should('exist');`);
    lines.push('  });');
    lines.push('');
    lines.push(`  it('clears fields on reset', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    if (firstSel) {
      lines.push(`    cy.get('${firstSel}').type('test@example.com');`);
      lines.push(`    cy.get('${firstSel}').clear();`);
      lines.push(`    cy.get('${firstSel}').should('have.value', '');`);
    }
    lines.push('  });');

  } else if (cfg.testType === 'button') {
    lines.push(`  it('renders all interactive elements', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    sels.forEach(sel => {
      lines.push(`    cy.get('${sel}').should('be.visible').and('not.be.disabled');`);
    });
    lines.push('  });');
    lines.push('');

    if (sels.length > 0) {
      lines.push(`  it('handles click on primary button', () => {`);
      if (!cfg.includeBeforeEach) {
        lines.push(`    cy.visit('${cfg.url}');`);
      }
      lines.push(`    cy.get('${sels[0]}').click();`);
      if (cfg.expectText) {
        lines.push(`    cy.contains('${cfg.expectText}').should('be.visible');`);
      } else {
        lines.push(`    // Assert expected outcome after click`);
        lines.push(`    cy.url().should('not.eq', 'about:blank');`);
      }
      if (cfg.includeScreenshot) {
        lines.push(`    cy.screenshot('${cfg.componentName.toLowerCase()}-after-click');`);
      }
      lines.push('  });');
      lines.push('');
      lines.push(`  it('is keyboard accessible', () => {`);
      if (!cfg.includeBeforeEach) {
        lines.push(`    cy.visit('${cfg.url}');`);
      }
      lines.push(`    cy.get('${sels[0]}').focus().type('{enter}');`);
      if (cfg.expectText) {
        lines.push(`    cy.contains('${cfg.expectText}').should('exist');`);
      }
      lines.push('  });');
    }

  } else if (cfg.testType === 'api') {
    lines.push(`  it('intercepts and validates ${cfg.apiMethod} request', () => {`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.intercept('${cfg.apiMethod}', '${cfg.url}').as('${cfg.apiAlias}');`);
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    if (sels.length > 0) {
      lines.push(`    cy.get('${sels[0]}').click();`);
    } else {
      lines.push(`    // Trigger the action that fires the API request`);
      lines.push(`    cy.get('[type="submit"]').click();`);
    }
    lines.push(`    cy.wait('@${cfg.apiAlias}').then((interception) => {`);
    lines.push(`      expect(interception.response?.statusCode).to.be.oneOf([200, 201]);`);
    if (cfg.apiMethod === 'POST' || cfg.apiMethod === 'PUT') {
      lines.push(`      expect(interception.request.body).to.not.be.empty;`);
    }
    lines.push(`    });`);
    if (cfg.expectText) {
      lines.push(`    cy.contains('${cfg.expectText}').should('be.visible');`);
    }
    lines.push('  });');
    lines.push('');
    lines.push(`  it('handles API error gracefully', () => {`);
    lines.push(`    cy.intercept('${cfg.apiMethod}', '${cfg.url}', {`);
    lines.push(`      statusCode: 500,`);
    lines.push(`      body: { error: 'Internal Server Error' },`);
    lines.push(`    }).as('${cfg.apiAlias}Error');`);
    if (!cfg.includeBeforeEach) {
      lines.push(`    cy.visit('${cfg.url}');`);
    }
    if (sels.length > 0) {
      lines.push(`    cy.get('${sels[0]}').click();`);
    } else {
      lines.push(`    cy.get('[type="submit"]').click();`);
    }
    lines.push(`    cy.wait('@${cfg.apiAlias}Error');`);
    lines.push(`    cy.get('[role="alert"], .error, [data-testid*="error"]').should('exist');`);
    lines.push('  });');
  }

  lines.push('});');
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
  { value: 'navigation', label: 'Navigation', desc: 'Page visit, URL checks, visibility' },
  { value: 'form',       label: 'Form',       desc: 'Type, submit, validation errors' },
  { value: 'button',     label: 'Button',     desc: 'Click, keyboard, state changes' },
  { value: 'api',        label: 'API',        desc: 'cy.intercept, wait, response check' },
];

export default function CypressTestGenerator() {
  const [cfg, setCfg] = useState<CypressConfig>(DEFAULT);
  const [copied, setCopied] = useState(false);

  const set = (key: keyof CypressConfig, value: unknown) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  };

  const output = buildTest(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">

        <Section title="Target">
          <div>
            <label class="text-xs text-text-muted block mb-1">Component / describe name</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.componentName}
              placeholder="LoginPage"
              onInput={e => set('componentName', (e.target as HTMLInputElement).value)}
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">URL to visit</label>
            <input
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
              value={cfg.url}
              placeholder="/login"
              onInput={e => set('url', (e.target as HTMLInputElement).value)}
            />
          </div>
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

        <Section title="Element Selectors">
          <div>
            <label class="text-xs text-text-muted block mb-1">One selector per line (CSS / data-testid)</label>
            <textarea
              class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono resize-y"
              rows={4}
              value={cfg.selectors}
              placeholder={'[data-testid="email-input"]\n[data-testid="submit-btn"]'}
              onInput={e => set('selectors', (e.target as HTMLTextAreaElement).value)}
            />
          </div>
          {cfg.testType !== 'api' && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Expected text on success</label>
              <input
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
                value={cfg.expectText}
                placeholder="Welcome back"
                onInput={e => set('expectText', (e.target as HTMLInputElement).value)}
              />
            </div>
          )}
        </Section>

        {cfg.testType === 'api' && (
          <Section title="API Options">
            <div>
              <label class="text-xs text-text-muted block mb-1">HTTP method</label>
              <div class="flex gap-2 flex-wrap">
                {(['GET', 'POST', 'PUT', 'DELETE'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => set('apiMethod', m)}
                    class={`px-3 py-1.5 rounded border text-sm transition-colors ${cfg.apiMethod === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Intercept alias</label>
              <input
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
                value={cfg.apiAlias}
                placeholder="loginRequest"
                onInput={e => set('apiAlias', (e.target as HTMLInputElement).value)}
              />
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Expected text on success</label>
              <input
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono"
                value={cfg.expectText}
                placeholder="Welcome back"
                onInput={e => set('expectText', (e.target as HTMLInputElement).value)}
              />
            </div>
          </Section>
        )}

        <Section title="Options">
          <Toggle
            checked={cfg.includeBeforeEach}
            onChange={v => set('includeBeforeEach', v)}
            label="beforeEach hook"
            doc="Move cy.visit() into a beforeEach block shared by all tests."
          />
          <Toggle
            checked={cfg.includeViewport}
            onChange={v => set('includeViewport', v)}
            label="Set viewport size"
            doc="Add cy.viewport() to control the browser window size."
          />
          {cfg.includeViewport && (
            <div>
              <label class="text-xs text-text-muted block mb-1">Viewport preset</label>
              <div class="flex gap-2 flex-wrap">
                {(['1280x720', '375x667', '768x1024'] as const).map(vp => (
                  <button
                    key={vp}
                    onClick={() => set('viewport', vp)}
                    class={`px-2 py-1 rounded border text-xs transition-colors ${cfg.viewport === vp ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                  >
                    {vp === '1280x720' ? 'Desktop' : vp === '375x667' ? 'Mobile' : 'Tablet'} ({vp})
                  </button>
                ))}
              </div>
            </div>
          )}
          <Toggle
            checked={cfg.includeScreenshot}
            onChange={v => set('includeScreenshot', v)}
            label="cy.screenshot()"
            doc="Capture a screenshot at the end of the main test case."
          />
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">
            {cfg.componentName ? `${cfg.componentName.replace(/\s+/g, '-').toLowerCase()}.cy.ts` : 'test.cy.ts'}
          </span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-primary text-white hover:bg-primary-dark'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[640px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <div class="text-xs text-text-muted space-y-1">
          <p>Install: <code class="bg-surface px-1 rounded">npm install -D cypress</code></p>
          <p>Run: <code class="bg-surface px-1 rounded">npx cypress open</code> or <code class="bg-surface px-1 rounded">npx cypress run</code></p>
          <p>Save file to: <code class="bg-surface px-1 rounded">cypress/e2e/</code></p>
        </div>
      </div>
    </div>
  );
}
