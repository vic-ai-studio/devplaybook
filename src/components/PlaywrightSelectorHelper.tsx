import { useState } from 'preact/hooks';

type SelectorType = 'css' | 'text' | 'role' | 'testId' | 'label' | 'placeholder';
type ChainAction = 'click' | 'fill' | 'expect';

const ARIA_ROLES = [
  'button', 'link', 'checkbox', 'radio', 'textbox', 'heading',
  'listitem', 'menuitem', 'tab', 'option', 'combobox', 'switch',
  'dialog', 'alert', 'navigation', 'main', 'img', 'figure',
];

const SELECTOR_TYPES: { value: SelectorType; label: string }[] = [
  { value: 'css', label: 'CSS' },
  { value: 'text', label: 'Text' },
  { value: 'role', label: 'Role' },
  { value: 'testId', label: 'Test ID' },
  { value: 'label', label: 'Label' },
  { value: 'placeholder', label: 'Placeholder' },
];

const CHAIN_ACTIONS: { value: ChainAction; label: string }[] = [
  { value: 'click', label: '.click()' },
  { value: 'fill', label: '.fill(value)' },
  { value: 'expect', label: 'expect().toBeVisible()' },
];

const COMMON_SELECTORS = [
  { selector: 'page.getByRole("button", { name: "Submit" })', use: 'Accessible button by name' },
  { selector: 'page.getByLabel("Email address")', use: 'Input associated with a label' },
  { selector: 'page.getByPlaceholder("Search...")', use: 'Input by placeholder text' },
  { selector: 'page.getByText("Welcome")', use: 'Element containing visible text' },
  { selector: 'page.getByTestId("submit-btn")', use: 'Element with data-testid attribute' },
  { selector: 'page.locator(".btn-primary")', use: 'CSS class selector' },
  { selector: 'page.locator("#modal-close")', use: 'CSS ID selector' },
  { selector: 'page.locator("input[type=email]")', use: 'CSS attribute selector' },
  { selector: 'page.locator("table >> nth=0")', use: 'First matching table (nth)' },
  { selector: 'page.locator("li").filter({ hasText: "Alice" })', use: 'List item filtered by text' },
];

export default function PlaywrightSelectorHelper() {
  const [selectorType, setSelectorType] = useState<SelectorType>('css');
  const [cssSelector, setCssSelector] = useState('.submit-button');
  const [textValue, setTextValue] = useState('Submit');
  const [textExact, setTextExact] = useState(false);
  const [role, setRole] = useState('button');
  const [roleName, setRoleName] = useState('Submit');
  const [testId, setTestId] = useState('submit-btn');
  const [labelText, setLabelText] = useState('Email address');
  const [placeholderText, setPlaceholderText] = useState('Enter your email');
  const [chainAction, setChainAction] = useState<ChainAction>('click');
  const [fillValue, setFillValue] = useState('hello@example.com');
  const [copied, setCopied] = useState(false);

  const getLocator = (): string => {
    switch (selectorType) {
      case 'css':
        return `page.locator('${cssSelector}')`;
      case 'text':
        return textExact
          ? `page.getByText('${textValue}', { exact: true })`
          : `page.getByText('${textValue}')`;
      case 'role':
        return roleName.trim()
          ? `page.getByRole('${role}', { name: '${roleName}' })`
          : `page.getByRole('${role}')`;
      case 'testId':
        return `page.getByTestId('${testId}')`;
      case 'label':
        return `page.getByLabel('${labelText}')`;
      case 'placeholder':
        return `page.getByPlaceholder('${placeholderText}')`;
    }
  };

  const getChain = (): string => {
    switch (chainAction) {
      case 'click':
        return `.click()`;
      case 'fill':
        return `.fill('${fillValue}')`;
      case 'expect':
        return null as unknown as string;
    }
  };

  const generateCode = (): string => {
    const locator = getLocator();
    if (chainAction === 'expect') {
      return `await expect(${locator}).toBeVisible();`;
    }
    return `await ${locator}${getChain()};`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generateCode()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Selector Type Toggle */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-4">
        <h2 class="text-sm font-semibold text-text">Selector Type</h2>
        <div class="flex flex-wrap gap-2">
          {SELECTOR_TYPES.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setSelectorType(value)}
              class={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
                selectorType === value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-background border-border text-text-muted hover:border-accent hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* CSS */}
        {selectorType === 'css' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">CSS Selector</label>
            <input
              type="text"
              value={cssSelector}
              onInput={e => setCssSelector((e.target as HTMLInputElement).value)}
              placeholder=".btn-primary, #submit, input[type=email]"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p class="text-xs text-text-muted mt-1.5">
              Any valid CSS selector — class, ID, attribute, pseudo-selector, or combinator.
            </p>
          </div>
        )}

        {/* Text */}
        {selectorType === 'text' && (
          <div class="space-y-3">
            <div>
              <label class="text-xs text-text-muted mb-1 block">Visible text content</label>
              <input
                type="text"
                value={textValue}
                onInput={e => setTextValue((e.target as HTMLInputElement).value)}
                placeholder="Submit"
                class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={textExact}
                onChange={e => setTextExact((e.target as HTMLInputElement).checked)}
                class="accent-accent"
              />
              <span class="text-sm text-text">Exact match (case-sensitive, no partial)</span>
            </label>
          </div>
        )}

        {/* Role */}
        {selectorType === 'role' && (
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted mb-1 block">ARIA Role</label>
              <select
                value={role}
                onChange={e => setRole((e.target as HTMLSelectElement).value)}
                class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              >
                {ARIA_ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted mb-1 block">Accessible Name (optional)</label>
              <input
                type="text"
                value={roleName}
                onInput={e => setRoleName((e.target as HTMLInputElement).value)}
                placeholder="Submit"
                class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>
        )}

        {/* Test ID */}
        {selectorType === 'testId' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">data-testid value</label>
            <input
              type="text"
              value={testId}
              onInput={e => setTestId((e.target as HTMLInputElement).value)}
              placeholder="submit-btn"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 font-mono focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p class="text-xs text-text-muted mt-1.5">
              Matches <code class="bg-background px-1 rounded">data-testid="…"</code> attributes. Configure with <code class="bg-background px-1 rounded">testIdAttribute</code> in playwright.config.ts.
            </p>
          </div>
        )}

        {/* Label */}
        {selectorType === 'label' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">Label text</label>
            <input
              type="text"
              value={labelText}
              onInput={e => setLabelText((e.target as HTMLInputElement).value)}
              placeholder="Email address"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <p class="text-xs text-text-muted mt-1.5">
              Finds the form control associated with this <code class="bg-background px-1 rounded">&lt;label&gt;</code> element.
            </p>
          </div>
        )}

        {/* Placeholder */}
        {selectorType === 'placeholder' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">Placeholder text</label>
            <input
              type="text"
              value={placeholderText}
              onInput={e => setPlaceholderText((e.target as HTMLInputElement).value)}
              placeholder="Enter your email"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}
      </div>

      {/* Chain Action */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h2 class="text-sm font-semibold text-text">Chaining Action</h2>
        <div class="flex flex-wrap gap-2">
          {CHAIN_ACTIONS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setChainAction(value)}
              class={`text-xs px-3 py-1.5 rounded border font-mono transition-colors ${
                chainAction === value
                  ? 'bg-accent text-white border-accent'
                  : 'bg-background border-border text-text-muted hover:border-accent hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {chainAction === 'fill' && (
          <div>
            <label class="text-xs text-text-muted mb-1 block">Fill value</label>
            <input
              type="text"
              value={fillValue}
              onInput={e => setFillValue((e.target as HTMLInputElement).value)}
              placeholder="hello@example.com"
              class="w-full text-sm bg-background border border-border rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        )}
      </div>

      {/* Generated Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated Playwright code</label>
          <button
            onClick={handleCopy}
            class={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
              copied
                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                : 'bg-surface border-border hover:border-accent text-text'
            }`}
          >
            {copied ? '✓ Copied!' : 'Copy code'}
          </button>
        </div>
        <pre class="w-full font-mono text-sm bg-background border border-border rounded-lg px-4 py-3 overflow-x-auto whitespace-pre text-text leading-relaxed">
          <span class="text-text-muted select-none">// Playwright — </span>
          <span class="text-text-muted select-none">{selectorType} selector{'\n'}</span>
          {generateCode()}
        </pre>
      </div>

      {/* Locator preview (without chain) */}
      {chainAction !== 'expect' && (
        <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Locator only</p>
          <code class="block font-mono text-sm text-text bg-background border border-border rounded px-3 py-2 break-all">
            {getLocator()}
          </code>
          <p class="text-xs text-text-muted">
            Chain additional actions: <code class="bg-background px-1 rounded">.fill()</code>{' '}
            <code class="bg-background px-1 rounded">.click()</code>{' '}
            <code class="bg-background px-1 rounded">.waitFor()</code>{' '}
            <code class="bg-background px-1 rounded">.screenshot()</code>
          </p>
        </div>
      )}

      {/* Quick Reference */}
      <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
        <h2 class="text-sm font-semibold text-text">Quick Reference — Common Selectors</h2>
        <div class="overflow-x-auto">
          <table class="w-full text-xs border-collapse">
            <thead>
              <tr class="border-b border-border">
                <th class="text-left py-1.5 pr-4 text-text-muted font-medium w-1/2">Selector</th>
                <th class="text-left py-1.5 text-text-muted font-medium">Best used for</th>
              </tr>
            </thead>
            <tbody>
              {COMMON_SELECTORS.map(({ selector, use }) => (
                <tr key={selector} class="border-b border-border/50 hover:bg-background/50 transition-colors">
                  <td class="py-1.5 pr-4 font-mono text-accent break-all">{selector}</td>
                  <td class="py-1.5 text-text-muted">{use}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div class="pt-1 text-xs text-text-muted space-y-1">
          <p><span class="font-medium text-text">Priority order (Playwright docs):</span> role → label → placeholder → text → testId → CSS/XPath</p>
          <p>Prefer role/label/text selectors — they are resilient to markup changes and align with how users interact with the UI.</p>
        </div>
      </div>

      {/* Tips */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-2">
        <p class="font-semibold text-text">Tips for writing stable selectors</p>
        <ul class="space-y-1.5 list-disc list-inside">
          <li>Use <code class="bg-background px-1 rounded">getByRole</code> first — it tests accessibility and is refactor-proof.</li>
          <li>Add <code class="bg-background px-1 rounded">data-testid</code> attributes to elements that have no other stable locator.</li>
          <li>Avoid index-based selectors (<code class="bg-background px-1 rounded">nth=0</code>) — they break when the DOM changes.</li>
          <li>Avoid XPath and text that changes between environments (e.g., translated labels).</li>
          <li>Use <code class="bg-background px-1 rounded">.filter()</code> to narrow a locator set before asserting or acting.</li>
        </ul>
      </div>
    </div>
  );
}
