import { useState } from 'preact/hooks';

type DtypeOption = 'object' | 'int64' | 'float64' | 'bool' | 'datetime64[ns]' | 'category';

const DTYPE_OPTIONS: DtypeOption[] = ['object', 'int64', 'float64', 'bool', 'datetime64[ns]', 'category'];

interface ColumnDef {
  id: string;
  name: string;
  dtype: DtypeOption;
}

let _cid = 0;
function cid() { return `col-${++_cid}`; }

function parseCSVHeaders(input: string): string[] {
  return input.split(',').map(s => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
}

function parseJSONSample(input: string): string[] {
  try {
    const obj = JSON.parse(input);
    if (typeof obj === 'object' && obj !== null && !Array.isArray(obj)) {
      return Object.keys(obj);
    }
    if (Array.isArray(obj) && obj.length > 0 && typeof obj[0] === 'object') {
      return Object.keys(obj[0]);
    }
    return [];
  } catch {
    return [];
  }
}

function guessType(key: string): DtypeOption {
  const k = key.toLowerCase();
  if (k.includes('date') || k.includes('time') || k.includes('_at') || k.includes('_on')) return 'datetime64[ns]';
  if (k.includes('is_') || k.includes('has_') || k.includes('flag') || k === 'active' || k === 'enabled') return 'bool';
  if (k.includes('id') || k.includes('count') || k.includes('num') || k.includes('qty') || k.includes('age') || k.includes('year')) return 'int64';
  if (k.includes('price') || k.includes('rate') || k.includes('score') || k.includes('pct') || k.includes('ratio') || k.includes('amount')) return 'float64';
  if (k.includes('category') || k.includes('status') || k.includes('type') || k.includes('label') || k.includes('gender') || k.includes('region')) return 'category';
  return 'object';
}

function generateCode(columns: ColumnDef[]): string {
  if (columns.length === 0) return '# No columns defined yet.';

  const colNames = columns.map(c => `"${c.name}"`).join(', ');
  const asTypeEntries = columns.map(c => `    "${c.name}": "${c.dtype}"`).join(',\n');
  const dtypes64 = columns.filter(c => c.dtype === 'datetime64[ns]');
  const assertLines = columns.map(c => `assert df["${c.name}"].dtype == "${c.dtype}", f'Expected ${c.dtype} for ${c.name}, got {df["${c.name}"].dtype}'`).join('\n');

  const schemaDict = columns.map(c => `    "${c.name}": {"dtype": "${c.dtype}", "nullable": True}`).join(',\n');

  let code = `import pandas as pd

# ── Column list ──────────────────────────────────────────
COLUMNS = [${colNames}]

# ── Create empty DataFrame with schema ───────────────────
df = pd.DataFrame(columns=COLUMNS)

# ── Apply dtypes ─────────────────────────────────────────
dtype_map = {
${asTypeEntries}
}
df = df.astype(dtype_map)`;

  if (dtypes64.length > 0) {
    const dtCols = dtypes64.map(c => `"${c.name}"`).join(', ');
    code += `

# ── Parse datetime columns (when loading real data) ──────
# df[[${dtCols}]] = df[[${dtCols}]].apply(pd.to_datetime)`;
  }

  code += `

# ── Show dtypes ───────────────────────────────────────────
print(df.dtypes)

# ── Validation assertions ─────────────────────────────────
${assertLines}

print("✓ Schema validation passed")

# ── Schema definition dict ────────────────────────────────
SCHEMA = {
${schemaDict}
}`;

  return code;
}

export default function PandasDataframeSchemaGenerator() {
  const [inputMode, setInputMode] = useState<'csv' | 'json'>('csv');
  const [rawInput, setRawInput] = useState('user_id, name, age, price, category, is_active, created_at');
  const [columns, setColumns] = useState<ColumnDef[]>([]);
  const [parsed, setParsed] = useState(false);
  const [copied, setCopied] = useState(false);

  function parseInput() {
    let names: string[] = [];
    if (inputMode === 'csv') {
      names = parseCSVHeaders(rawInput);
    } else {
      names = parseJSONSample(rawInput);
    }
    if (names.length === 0) return;
    setColumns(names.map(n => ({ id: cid(), name: n, dtype: guessType(n) })));
    setParsed(true);
  }

  function updateDtype(id: string, dtype: DtypeOption) {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, dtype } : c));
  }

  function addColumn() {
    setColumns(cols => [...cols, { id: cid(), name: 'new_column', dtype: 'object' }]);
    setParsed(true);
  }

  function removeColumn(id: string) {
    setColumns(cols => cols.filter(c => c.id !== id));
  }

  function updateName(id: string, name: string) {
    setColumns(cols => cols.map(c => c.id === id ? { ...c, name } : c));
  }

  const code = generateCode(columns);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const dtypeBadge: Record<DtypeOption, string> = {
    object: 'bg-blue-500/20 text-blue-400',
    int64: 'bg-green-500/20 text-green-400',
    float64: 'bg-yellow-500/20 text-yellow-400',
    bool: 'bg-purple-500/20 text-purple-400',
    'datetime64[ns]': 'bg-orange-500/20 text-orange-400',
    category: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div class="space-y-6">
      {/* Input section */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <div class="flex gap-2 mb-3">
          <button
            onClick={() => setInputMode('csv')}
            class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${inputMode === 'csv' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
          >
            CSV Headers
          </button>
          <button
            onClick={() => setInputMode('json')}
            class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${inputMode === 'json' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
          >
            JSON Sample
          </button>
        </div>
        <textarea
          value={rawInput}
          onInput={e => setRawInput((e.target as HTMLTextAreaElement).value)}
          rows={3}
          placeholder={inputMode === 'csv' ? 'user_id, name, age, price, is_active, created_at' : '{"user_id": 1, "name": "Alice", "age": 30}'}
          class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent font-mono resize-none"
        />
        <div class="flex gap-2 mt-3">
          <button
            onClick={parseInput}
            class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Parse &amp; Generate
          </button>
          <button
            onClick={addColumn}
            class="px-4 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm hover:border-accent transition-colors"
          >
            + Add Column
          </button>
        </div>
      </div>

      {/* Column dtype editor */}
      {columns.length > 0 && (
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3">Column Schema ({columns.length} columns)</h3>
          <div class="space-y-2">
            {columns.map(col => (
              <div key={col.id} class="flex items-center gap-2 flex-wrap">
                <input
                  value={col.name}
                  onInput={e => updateName(col.id, (e.target as HTMLInputElement).value)}
                  class="flex-1 min-w-0 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <select
                  value={col.dtype}
                  onChange={e => updateDtype(col.id, (e.target as HTMLSelectElement).value as DtypeOption)}
                  class="px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {DTYPE_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <span class={`text-xs px-2 py-0.5 rounded font-mono ${dtypeBadge[col.dtype]}`}>{col.dtype}</span>
                <button onClick={() => removeColumn(col.id)} class="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output */}
      {parsed && columns.length > 0 && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium">Generated Python Code</span>
            <button
              onClick={copy}
              class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="p-4 rounded-xl bg-surface-alt border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{code}</pre>
        </div>
      )}

      {!parsed && (
        <div class="p-4 rounded-xl bg-surface-alt border border-border text-sm text-text-muted text-center">
          Paste CSV headers or a JSON sample above, then click <strong>Parse &amp; Generate</strong>.
        </div>
      )}
    </div>
  );
}
