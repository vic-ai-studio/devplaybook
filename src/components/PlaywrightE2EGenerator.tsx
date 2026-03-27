import { useState } from 'preact/hooks';

type Lang = 'typescript' | 'javascript';
type Action = 'click' | 'fill' | 'expect' | 'navigate' | 'hover' | 'select' | 'check' | 'screenshot';

interface TestStep {
  id: string;
  action: Action;
  selector: string;
  value: string;
}

const ACTION_LABELS: Record<Action, string> = {
  click: 'Click',
  fill: 'Fill / Type',
  expect: 'Expect (assertion)',
  navigate: 'Navigate to URL',
  hover: 'Hover',
  select: 'Select option',
  check: 'Check / Uncheck',
  screenshot: 'Take Screenshot',
};

function genStep(step: TestStep, lang: Lang): string {
  const a = lang === 'typescript' ? 'await ' : 'await ';
  switch (step.action) {
    case 'click':
      return `  ${a}page.locator('${step.selector || 'button'}').click();`;
    case 'fill':
      return `  ${a}page.locator('${step.selector || 'input'}').fill('${step.value || 'value'}');`;
    case 'expect':
      return `  ${a}expect(page.locator('${step.selector || 'h1'}')).toBeVisible();`;
    case 'navigate':
      return `  ${a}page.goto('${step.value || 'https://example.com'}');`;
    case 'hover':
      return `  ${a}page.locator('${step.selector || '.menu'}').hover();`;
    case 'select':
      return `  ${a}page.locator('${step.selector || 'select'}').selectOption('${step.value || 'option'}');`;
    case 'check':
      return `  ${a}page.locator('${step.selector || 'input[type=checkbox]'}').${step.value === 'uncheck' ? 'uncheck' : 'check'}();`;
    case 'screenshot':
      return `  ${a}page.screenshot({ path: '${step.value || 'screenshot.png'}' });`;
    default:
      return '';
  }
}

function generateCode(testName: string, baseUrl: string, steps: TestStep[], lang: Lang): string {
  const isTs = lang === 'typescript';
  const imports = isTs
    ? `import { test, expect } from '@playwright/test';`
    : `const { test, expect } = require('@playwright/test');`;

  const stepLines = steps.map(s => genStep(s, lang)).join('\n');

  return `${imports}

test('${testName || 'my e2e test'}', async ({ page }) => {
  await page.goto('${baseUrl || 'https://example.com'}');
${stepLines}
});`;
}

let counter = 0;
function newId() { return `step-${++counter}`; }

export default function PlaywrightE2EGenerator() {
  const [lang, setLang] = useState<Lang>('typescript');
  const [testName, setTestName] = useState('should complete user flow');
  const [baseUrl, setBaseUrl] = useState('https://example.com');
  const [steps, setSteps] = useState<TestStep[]>([
    { id: newId(), action: 'click', selector: 'button[type=submit]', value: '' },
    { id: newId(), action: 'expect', selector: '.success-message', value: '' },
  ]);
  const [copied, setCopied] = useState(false);

  function addStep() {
    setSteps(s => [...s, { id: newId(), action: 'click', selector: '', value: '' }]);
  }

  function removeStep(id: string) {
    setSteps(s => s.filter(x => x.id !== id));
  }

  function updateStep(id: string, field: keyof TestStep, val: string) {
    setSteps(s => s.map(x => x.id === id ? { ...x, [field]: val } : x));
  }

  function moveStep(id: string, dir: -1 | 1) {
    setSteps(s => {
      const i = s.findIndex(x => x.id === id);
      if (i + dir < 0 || i + dir >= s.length) return s;
      const arr = [...s];
      [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
      return arr;
    });
  }

  const code = generateCode(testName, baseUrl, steps, lang);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const needsValue = (action: Action) => ['fill', 'navigate', 'select', 'screenshot'].includes(action);
  const needsSelector = (action: Action) => action !== 'navigate' && action !== 'screenshot';
  const checkAction = (action: Action) => action === 'check';

  return (
    <div class="space-y-6">
      {/* Config row */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label class="block text-sm font-medium mb-1">Test Name</label>
          <input
            value={testName}
            onInput={e => setTestName((e.target as HTMLInputElement).value)}
            placeholder="should complete user flow"
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Base URL</label>
          <input
            value={baseUrl}
            onInput={e => setBaseUrl((e.target as HTMLInputElement).value)}
            placeholder="https://example.com"
            class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text text-sm focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label class="block text-sm font-medium mb-1">Language</label>
          <div class="flex gap-2">
            {(['typescript', 'javascript'] as Lang[]).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                class={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${lang === l ? 'bg-primary text-white' : 'bg-bg border border-border text-text hover:border-primary'}`}
              >
                {l === 'typescript' ? 'TypeScript' : 'JavaScript'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Steps */}
      <div>
        <div class="flex items-center justify-between mb-3">
          <label class="text-sm font-medium">Test Steps</label>
          <button
            onClick={addStep}
            class="text-sm px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
          >
            + Add Step
          </button>
        </div>
        <div class="space-y-2">
          {steps.map((step, i) => (
            <div key={step.id} class="flex items-start gap-2 p-3 rounded-lg bg-bg border border-border">
              <span class="text-xs text-text-muted mt-2.5 w-5 shrink-0">{i + 1}.</span>
              <select
                value={step.action}
                onChange={e => updateStep(step.id, 'action', (e.target as HTMLSelectElement).value as Action)}
                class="px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary shrink-0"
              >
                {Object.entries(ACTION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
              {needsSelector(step.action) && (
                <input
                  value={step.selector}
                  onInput={e => updateStep(step.id, 'selector', (e.target as HTMLInputElement).value)}
                  placeholder="CSS selector or text='...'"
                  class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary font-mono"
                />
              )}
              {needsValue(step.action) && (
                <input
                  value={step.value}
                  onInput={e => updateStep(step.id, 'value', (e.target as HTMLInputElement).value)}
                  placeholder={step.action === 'navigate' ? 'URL' : step.action === 'screenshot' ? 'filename.png' : 'value'}
                  class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary"
                />
              )}
              {checkAction(step.action) && (
                <select
                  value={step.value || 'check'}
                  onChange={e => updateStep(step.id, 'value', (e.target as HTMLSelectElement).value)}
                  class="px-2 py-1.5 rounded bg-surface border border-border text-text text-sm focus:outline-none focus:border-primary"
                >
                  <option value="check">Check</option>
                  <option value="uncheck">Uncheck</option>
                </select>
              )}
              <div class="flex gap-1 shrink-0">
                <button onClick={() => moveStep(step.id, -1)} disabled={i === 0} class="p-1.5 rounded hover:bg-surface text-text-muted disabled:opacity-30 text-xs">▲</button>
                <button onClick={() => moveStep(step.id, 1)} disabled={i === steps.length - 1} class="p-1.5 rounded hover:bg-surface text-text-muted disabled:opacity-30 text-xs">▼</button>
                <button onClick={() => removeStep(step.id)} class="p-1.5 rounded hover:bg-red-500/10 text-red-400 text-xs">✕</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Generated Test Code</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-bg border border-border text-sm font-mono overflow-x-auto whitespace-pre">{code}</pre>
      </div>

      {/* Tips */}
      <div class="p-4 rounded-xl bg-primary/5 border border-primary/20 text-sm">
        <p class="font-medium mb-2">Quick Setup</p>
        <div class="font-mono text-xs space-y-1 text-text-muted">
          <div>npm init playwright@latest</div>
          <div>npx playwright test</div>
          <div>npx playwright test --ui  <span class="text-text-muted font-sans">(interactive mode)</span></div>
        </div>
      </div>
    </div>
  );
}
