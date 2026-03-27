import { useState } from 'preact/hooks';

const MAGIC_PATTERN = /^[%!]/;
const MAGIC_CELL_PATTERN = /^%%\w+/;

interface ConvertOptions {
  includeMdAsComments: boolean;
  keepMagic: boolean;
  separatorStyle: '# %%' | '# Cell N:';
}

interface Stats {
  codeCells: number;
  mdCells: number;
  magicRemoved: number;
  emptyCells: number;
}

function convertNotebook(rawJson: string, opts: ConvertOptions): { output: string; stats: Stats; error: string } {
  const stats: Stats = { codeCells: 0, mdCells: 0, magicRemoved: 0, emptyCells: 0 };

  let nb: any;
  try {
    nb = JSON.parse(rawJson);
  } catch {
    return { output: '', stats, error: 'Invalid JSON. Please paste the full contents of a .ipynb file.' };
  }

  const cells: any[] = nb.cells || nb.worksheets?.[0]?.cells || [];
  if (!Array.isArray(cells) || cells.length === 0) {
    return { output: '', stats, error: 'No cells found. Make sure the JSON is a valid Jupyter notebook.' };
  }

  const outputLines: string[] = [];
  const nbLang: string = nb.metadata?.kernelspec?.language || 'python';

  outputLines.push(`#!/usr/bin/env ${nbLang}`);
  outputLines.push(`# Converted from Jupyter Notebook`);
  outputLines.push(`# nbformat: ${nb.nbformat || '?'}.${nb.nbformat_minor || '?'}`);
  outputLines.push('');

  let codeIdx = 0;

  for (let i = 0; i < cells.length; i++) {
    const cell = cells[i];
    const cellType: string = cell.cell_type;
    const rawSource: string | string[] = cell.source;
    const sourceLines: string[] = Array.isArray(rawSource) ? rawSource.join('').split('\n') : (rawSource || '').split('\n');

    if (cellType === 'markdown') {
      stats.mdCells++;
      if (opts.includeMdAsComments) {
        const sep = opts.separatorStyle === '# %%' ? `# %% [markdown]` : `# Markdown Cell ${i + 1}:`;
        outputLines.push(sep);
        sourceLines.forEach(line => outputLines.push(`# ${line}`));
        outputLines.push('');
      }
      continue;
    }

    if (cellType !== 'code') continue;

    const trimmedLines = sourceLines.filter(l => l.trim() !== '');
    if (trimmedLines.length === 0) {
      stats.emptyCells++;
      continue;
    }

    codeIdx++;
    stats.codeCells++;

    const sep = opts.separatorStyle === '# %%' ? '# %%' : `# Cell ${codeIdx}:`;
    outputLines.push(sep);

    const filteredLines: string[] = [];
    for (const line of sourceLines) {
      const stripped = line.trim();
      if (!opts.keepMagic && (MAGIC_PATTERN.test(stripped) || MAGIC_CELL_PATTERN.test(stripped))) {
        stats.magicRemoved++;
        filteredLines.push(`# [magic removed] ${line}`);
        continue;
      }
      filteredLines.push(line);
    }

    // Remove trailing empty lines within a cell
    while (filteredLines.length > 0 && filteredLines[filteredLines.length - 1].trim() === '') {
      filteredLines.pop();
    }

    filteredLines.forEach(l => outputLines.push(l));
    outputLines.push('');
  }

  return { output: outputLines.join('\n'), stats, error: '' };
}

const EXAMPLE_NOTEBOOK = JSON.stringify({
  nbformat: 4,
  nbformat_minor: 5,
  metadata: { kernelspec: { display_name: 'Python 3', language: 'python', name: 'python3' } },
  cells: [
    { cell_type: 'markdown', source: ['# Data Analysis\n', 'Load and explore the dataset.'], metadata: {} },
    { cell_type: 'code', source: ['%matplotlib inline\n', 'import pandas as pd\n', 'import numpy as np\n', 'import matplotlib.pyplot as plt'], metadata: {}, outputs: [], execution_count: 1 },
    { cell_type: 'code', source: ['df = pd.read_csv("data.csv")\n', 'df.head()'], metadata: {}, outputs: [], execution_count: 2 },
    { cell_type: 'markdown', source: ['## Feature Engineering'], metadata: {} },
    { cell_type: 'code', source: ['!pip install scikit-learn\n', 'from sklearn.preprocessing import StandardScaler\n', '\n', 'scaler = StandardScaler()\n', 'df_scaled = scaler.fit_transform(df.select_dtypes(include="number"))'], metadata: {}, outputs: [], execution_count: 3 },
    { cell_type: 'code', source: ['plt.figure(figsize=(10, 6))\n', 'plt.hist(df["age"], bins=30)\n', 'plt.title("Age Distribution")\n', 'plt.show()'], metadata: {}, outputs: [], execution_count: 4 },
  ],
}, null, 2);

export default function JupyterToScriptConverter() {
  const [input, setInput] = useState('');
  const [opts, setOpts] = useState<ConvertOptions>({
    includeMdAsComments: true,
    keepMagic: false,
    separatorStyle: '# %%',
  });
  const [result, setResult] = useState<{ output: string; stats: Stats; error: string } | null>(null);
  const [copied, setCopied] = useState(false);

  function convert() {
    if (!input.trim()) return;
    setResult(convertNotebook(input, opts));
  }

  function loadExample() {
    setInput(EXAMPLE_NOTEBOOK);
    setResult(null);
  }

  function copy() {
    if (!result?.output) return;
    navigator.clipboard.writeText(result.output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Options */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Conversion Options</h3>
        <div class="flex gap-6 flex-wrap">
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={opts.includeMdAsComments}
              onChange={e => setOpts(o => ({ ...o, includeMdAsComments: (e.target as HTMLInputElement).checked }))}
              class="accent-accent"
            />
            Include markdown cells as comments
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm">
            <input
              type="checkbox"
              checked={opts.keepMagic}
              onChange={e => setOpts(o => ({ ...o, keepMagic: (e.target as HTMLInputElement).checked }))}
              class="accent-accent"
            />
            Keep magic commands (%matplotlib, !pip, etc.)
          </label>
          <div class="flex items-center gap-2 text-sm">
            <span class="text-text-muted">Cell separator:</span>
            <select
              value={opts.separatorStyle}
              onChange={e => setOpts(o => ({ ...o, separatorStyle: (e.target as HTMLSelectElement).value as ConvertOptions['separatorStyle'] }))}
              class="px-2 py-1 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono"
            >
              <option value="# %%"># %% (VS Code / Spyder)</option>
              <option value="# Cell N:"># Cell N: (descriptive)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium">Paste .ipynb JSON content</label>
          <button onClick={loadExample} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
            Load Example
          </button>
        </div>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={8}
          placeholder='Paste the full contents of your .ipynb file here (the JSON)...'
          class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-y"
        />
        <button
          onClick={convert}
          disabled={!input.trim()}
          class="mt-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Convert to Python Script
        </button>
      </div>

      {/* Error */}
      {result?.error && (
        <div class="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          {result.error}
        </div>
      )}

      {/* Stats */}
      {result && !result.error && (
        <div class="flex gap-4 flex-wrap">
          <div class="px-3 py-2 rounded-lg bg-surface-alt border border-border text-center">
            <div class="text-lg font-bold text-text">{result.stats.codeCells}</div>
            <div class="text-xs text-text-muted">Code cells</div>
          </div>
          <div class="px-3 py-2 rounded-lg bg-surface-alt border border-border text-center">
            <div class="text-lg font-bold text-text">{result.stats.mdCells}</div>
            <div class="text-xs text-text-muted">Markdown cells</div>
          </div>
          <div class="px-3 py-2 rounded-lg bg-surface-alt border border-border text-center">
            <div class={`text-lg font-bold ${result.stats.magicRemoved > 0 ? 'text-orange-400' : 'text-text'}`}>{result.stats.magicRemoved}</div>
            <div class="text-xs text-text-muted">Magic removed</div>
          </div>
          <div class="px-3 py-2 rounded-lg bg-surface-alt border border-border text-center">
            <div class="text-lg font-bold text-text-muted">{result.stats.emptyCells}</div>
            <div class="text-xs text-text-muted">Empty cells skipped</div>
          </div>
        </div>
      )}

      {/* Output */}
      {result?.output && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Python Script Output</span>
            <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
              {copied ? '✓ Copied!' : 'Copy .py'}
            </button>
          </div>
          <pre class="p-4 rounded-xl bg-surface-alt border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text max-h-[500px] overflow-y-auto">{result.output}</pre>
        </div>
      )}

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Also convert via CLI:</p>
        <code class="text-xs text-text-muted">jupyter nbconvert --to script notebook.ipynb</code>
      </div>
    </div>
  );
}
