import { useState } from 'preact/hooks';

type ConfigFormat = 'json' | 'js' | 'yaml';

const FORMAT_LABELS: Record<ConfigFormat, string> = {
  json: '.prettierrc (JSON)',
  js: 'prettier.config.js',
  yaml: '.prettierrc.yaml',
};

interface PrettierOptions {
  printWidth: number;
  tabWidth: number;
  useTabs: boolean;
  semi: boolean;
  singleQuote: boolean;
  jsxSingleQuote: boolean;
  trailingComma: 'none' | 'es5' | 'all';
  bracketSpacing: boolean;
  bracketSameLine: boolean;
  arrowParens: 'always' | 'avoid';
  endOfLine: 'lf' | 'crlf' | 'cr' | 'auto';
}

function generateConfig(opts: PrettierOptions, format: ConfigFormat): string {
  const obj: Record<string, unknown> = {
    printWidth: opts.printWidth,
    tabWidth: opts.tabWidth,
    useTabs: opts.useTabs,
    semi: opts.semi,
    singleQuote: opts.singleQuote,
    jsxSingleQuote: opts.jsxSingleQuote,
    trailingComma: opts.trailingComma,
    bracketSpacing: opts.bracketSpacing,
    bracketSameLine: opts.bracketSameLine,
    arrowParens: opts.arrowParens,
    endOfLine: opts.endOfLine,
  };

  if (format === 'json') {
    return JSON.stringify(obj, null, 2);
  }

  if (format === 'yaml') {
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${typeof v === 'string' ? `"${v}"` : v}`)
      .join('\n');
  }

  // JS
  const entries = Object.entries(obj)
    .map(([k, v]) => `  ${k}: ${typeof v === 'string' ? `'${v}'` : v},`)
    .join('\n');
  return `/** @type {import("prettier").Config} */\nexport default {\n${entries}\n};`;
}

export default function PrettierConfigGenerator() {
  const [format, setFormat] = useState<ConfigFormat>('json');
  const [printWidth, setPrintWidth] = useState(80);
  const [tabWidth, setTabWidth] = useState(2);
  const [useTabs, setUseTabs] = useState(false);
  const [semi, setSemi] = useState(true);
  const [singleQuote, setSingleQuote] = useState(false);
  const [jsxSingleQuote, setJsxSingleQuote] = useState(false);
  const [trailingComma, setTrailingComma] = useState<'none' | 'es5' | 'all'>('all');
  const [bracketSpacing, setBracketSpacing] = useState(true);
  const [bracketSameLine, setBracketSameLine] = useState(false);
  const [arrowParens, setArrowParens] = useState<'always' | 'avoid'>('always');
  const [endOfLine, setEndOfLine] = useState<'lf' | 'crlf' | 'cr' | 'auto'>('lf');
  const [copied, setCopied] = useState(false);

  const config = generateConfig(
    { printWidth, tabWidth, useTabs, semi, singleQuote, jsxSingleQuote, trailingComma, bracketSpacing, bracketSameLine, arrowParens, endOfLine },
    format,
  );

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = "w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent";
  const selectClass = "bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent w-full";

  return (
    <div class="space-y-6">
      {/* Output format */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Output Format</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(FORMAT_LABELS) as ConfigFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                format === f
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Numeric options */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Print Width</label>
          <input
            type="number"
            value={printWidth}
            onInput={(e) => setPrintWidth(Number((e.target as HTMLInputElement).value))}
            class={inputClass}
            min={40} max={200}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Tab Width</label>
          <input
            type="number"
            value={tabWidth}
            onInput={(e) => setTabWidth(Number((e.target as HTMLInputElement).value))}
            class={inputClass}
            min={1} max={8}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Trailing Comma</label>
          <select
            value={trailingComma}
            onChange={(e) => setTrailingComma((e.target as HTMLSelectElement).value as 'none' | 'es5' | 'all')}
            class={selectClass}
          >
            <option value="none">none</option>
            <option value="es5">es5</option>
            <option value="all">all</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">End of Line</label>
          <select
            value={endOfLine}
            onChange={(e) => setEndOfLine((e.target as HTMLSelectElement).value as 'lf' | 'crlf' | 'cr' | 'auto')}
            class={selectClass}
          >
            <option value="lf">lf</option>
            <option value="crlf">crlf</option>
            <option value="cr">cr</option>
            <option value="auto">auto</option>
          </select>
        </div>
      </div>

      {/* Arrow parens */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">Arrow Function Parens</label>
        <div class="flex gap-2">
          {(['always', 'avoid'] as const).map(v => (
            <button
              key={v}
              onClick={() => setArrowParens(v)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                arrowParens === v
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Boolean toggles */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Options</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'semi', label: 'Semicolons', value: semi, set: setSemi },
            { key: 'singleQuote', label: 'Single Quotes', value: singleQuote, set: setSingleQuote },
            { key: 'jsxSingleQuote', label: 'JSX Single Quotes', value: jsxSingleQuote, set: setJsxSingleQuote },
            { key: 'useTabs', label: 'Use Tabs', value: useTabs, set: setUseTabs },
            { key: 'bracketSpacing', label: 'Bracket Spacing', value: bracketSpacing, set: setBracketSpacing },
            { key: 'bracketSameLine', label: 'JSX Bracket Same Line', value: bracketSameLine, set: setBracketSameLine },
          ].map(opt => (
            <label key={opt.key} class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.value}
                onChange={() => opt.set(!opt.value)}
                class="accent-accent w-4 h-4"
              />
              <span class="text-sm text-text-muted">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated Config</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted max-h-80 overflow-y-auto">{config}</pre>
        <p class="text-xs text-text-muted mt-2">
          Save as <code class="bg-surface px-1 rounded">{format === 'js' ? 'prettier.config.js' : format === 'yaml' ? '.prettierrc.yaml' : '.prettierrc'}</code> in your project root.
          Install Prettier: <code class="bg-surface px-1 rounded">npm install --save-dev prettier</code>
        </p>
      </div>
    </div>
  );
}
