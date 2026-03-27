import { useState, useMemo } from 'preact/hooks';

type GQLType = 'String' | 'Int' | 'Float' | 'Boolean' | 'ID' | 'custom';

interface Variable {
  id: string;
  name: string;
  type: GQLType;
  customType: string;
  required: boolean;
  value: string;
  isList: boolean;
}

function uid() { return Math.random().toString(36).slice(2, 9); }

const TYPE_DEFAULTS: Record<GQLType, string> = {
  String: '"example"',
  Int: '42',
  Float: '3.14',
  Boolean: 'true',
  ID: '"abc123"',
  custom: '"value"',
};

function buildJsonValue(v: Variable): unknown {
  const raw = v.value.trim();
  if (!raw) {
    // Use placeholder
    if (v.type === 'Boolean') return true;
    if (v.type === 'Int') return 42;
    if (v.type === 'Float') return 3.14;
    if (v.isList) return [];
    return 'example';
  }
  if (v.type === 'Int') { const n = parseInt(raw, 10); return isNaN(n) ? raw : n; }
  if (v.type === 'Float') { const n = parseFloat(raw); return isNaN(n) ? raw : n; }
  if (v.type === 'Boolean') return raw === 'true' || raw === '1';
  if (v.isList) {
    try { return JSON.parse(raw); } catch { return raw.split(',').map(s => s.trim()); }
  }
  // Try JSON parse for nested objects
  if (raw.startsWith('{') || raw.startsWith('[')) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  return raw;
}

function buildSignature(vars: Variable[]): string {
  if (!vars.length) return '';
  const params = vars.map(v => {
    const typeName = v.type === 'custom' ? (v.customType || 'String') : v.type;
    const listWrap = v.isList ? `[${typeName}]` : typeName;
    const bang = v.required ? '!' : '';
    return `$${v.name || 'variable'}: ${listWrap}${bang}`;
  });
  return `(${params.join(', ')})`;
}

function buildUsage(vars: Variable[]): string {
  if (!vars.length) return '';
  return vars.map(v => `  ${v.name || 'variable'}: $${v.name || 'variable'}`).join('\n');
}

const EXAMPLE_PRESETS = [
  {
    label: 'User Query',
    vars: [
      { id: uid(), name: 'userId', type: 'ID' as GQLType, customType: '', required: true, value: 'abc123', isList: false },
      { id: uid(), name: 'includeProfile', type: 'Boolean' as GQLType, customType: '', required: false, value: 'true', isList: false },
    ],
  },
  {
    label: 'Pagination',
    vars: [
      { id: uid(), name: 'limit', type: 'Int' as GQLType, customType: '', required: false, value: '10', isList: false },
      { id: uid(), name: 'offset', type: 'Int' as GQLType, customType: '', required: false, value: '0', isList: false },
      { id: uid(), name: 'orderBy', type: 'String' as GQLType, customType: '', required: false, value: 'createdAt', isList: false },
    ],
  },
  {
    label: 'Create Post',
    vars: [
      { id: uid(), name: 'title', type: 'String' as GQLType, customType: '', required: true, value: 'Hello World', isList: false },
      { id: uid(), name: 'tags', type: 'String' as GQLType, customType: '', required: false, value: 'news,tech', isList: true },
      { id: uid(), name: 'authorId', type: 'ID' as GQLType, customType: '', required: true, value: 'user_1', isList: false },
    ],
  },
];

export default function GraphQLVariablesBuilder() {
  const [vars, setVars] = useState<Variable[]>([
    { id: uid(), name: 'userId', type: 'ID', customType: '', required: true, value: 'abc123', isList: false },
  ]);
  const [copied, setCopied] = useState<'json' | 'sig' | null>(null);
  const [queryName, setQueryName] = useState('GetUser');
  const [queryType, setQueryType] = useState<'query' | 'mutation' | 'subscription'>('query');

  const variablesJson = useMemo(() => {
    const obj: Record<string, unknown> = {};
    for (const v of vars) {
      if (v.name) obj[v.name] = buildJsonValue(v);
    }
    return JSON.stringify(obj, null, 2);
  }, [vars]);

  const signature = useMemo(() => buildSignature(vars), [vars]);
  const usage = useMemo(() => buildUsage(vars), [vars]);

  const queryPreview = useMemo(() => {
    const sig = signature ? `${queryType} ${queryName}${signature}` : `${queryType} ${queryName}`;
    return `${sig} {\n  # use your fields here\n${usage ? usage + '\n' : ''}  field1\n  field2\n}`;
  }, [queryType, queryName, signature, usage]);

  function copy(type: 'json' | 'sig') {
    const text = type === 'json' ? variablesJson : signature;
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  }

  function addVar() {
    setVars(prev => [...prev, { id: uid(), name: '', type: 'String', customType: '', required: false, value: '', isList: false }]);
  }

  function removeVar(id: string) {
    setVars(prev => prev.filter(v => v.id !== id));
  }

  function updateVar(id: string, patch: Partial<Variable>) {
    setVars(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v));
  }

  function loadPreset(idx: number) {
    setVars(EXAMPLE_PRESETS[idx].vars.map(v => ({ ...v, id: uid() })));
  }

  return (
    <div class="space-y-6">
      {/* Presets */}
      <div class="flex flex-wrap gap-2">
        <span class="text-sm text-text-muted self-center">Presets:</span>
        {EXAMPLE_PRESETS.map((p, i) => (
          <button
            key={i}
            onClick={() => loadPreset(i)}
            class="px-3 py-1 rounded border border-border text-sm hover:bg-surface transition-colors"
          >{p.label}</button>
        ))}
      </div>

      {/* Query options */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label class="block text-xs text-text-muted mb-1">Operation Type</label>
          <select
            value={queryType}
            onChange={e => setQueryType((e.target as HTMLSelectElement).value as typeof queryType)}
            class="w-full border border-border rounded px-3 py-2 bg-background text-sm"
          >
            <option value="query">query</option>
            <option value="mutation">mutation</option>
            <option value="subscription">subscription</option>
          </select>
        </div>
        <div class="sm:col-span-2">
          <label class="block text-xs text-text-muted mb-1">Operation Name</label>
          <input
            type="text"
            value={queryName}
            onInput={e => setQueryName((e.target as HTMLInputElement).value)}
            placeholder="GetUser"
            class="w-full border border-border rounded px-3 py-2 bg-background text-sm"
          />
        </div>
      </div>

      {/* Variable rows */}
      <div class="space-y-2">
        <div class="flex justify-between items-center">
          <h3 class="font-semibold text-sm">Variables</h3>
          <button
            onClick={addVar}
            class="px-3 py-1 bg-primary text-white rounded text-sm hover:opacity-90 transition-opacity"
          >+ Add Variable</button>
        </div>

        {/* Header */}
        <div class="hidden sm:grid grid-cols-12 gap-2 text-xs text-text-muted px-1">
          <div class="col-span-3">Name</div>
          <div class="col-span-2">Type</div>
          <div class="col-span-3">Value</div>
          <div class="col-span-2">Options</div>
          <div class="col-span-2"></div>
        </div>

        {vars.map(v => (
          <div key={v.id} class="grid grid-cols-12 gap-2 items-center p-2 border border-border rounded bg-surface">
            {/* Name */}
            <div class="col-span-12 sm:col-span-3">
              <input
                type="text"
                value={v.name}
                onInput={e => updateVar(v.id, { name: (e.target as HTMLInputElement).value.replace(/\s/g, '') })}
                placeholder="variableName"
                class="w-full border border-border rounded px-2 py-1 bg-background text-sm font-mono"
              />
            </div>
            {/* Type */}
            <div class="col-span-6 sm:col-span-2">
              <select
                value={v.type}
                onChange={e => updateVar(v.id, { type: (e.target as HTMLSelectElement).value as GQLType })}
                class="w-full border border-border rounded px-2 py-1 bg-background text-sm"
              >
                {(['String', 'Int', 'Float', 'Boolean', 'ID', 'custom'] as GQLType[]).map(t => (
                  <option key={t} value={t}>{t === 'custom' ? 'Custom…' : t}</option>
                ))}
              </select>
              {v.type === 'custom' && (
                <input
                  type="text"
                  value={v.customType}
                  onInput={e => updateVar(v.id, { customType: (e.target as HTMLInputElement).value })}
                  placeholder="MyType"
                  class="w-full mt-1 border border-border rounded px-2 py-1 bg-background text-sm font-mono"
                />
              )}
            </div>
            {/* Value */}
            <div class="col-span-6 sm:col-span-3">
              <input
                type="text"
                value={v.value}
                onInput={e => updateVar(v.id, { value: (e.target as HTMLInputElement).value })}
                placeholder={TYPE_DEFAULTS[v.type] ?? '"value"'}
                class="w-full border border-border rounded px-2 py-1 bg-background text-sm font-mono"
              />
            </div>
            {/* Options */}
            <div class="col-span-8 sm:col-span-2 flex gap-3 text-sm">
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={v.required}
                  onChange={e => updateVar(v.id, { required: (e.target as HTMLInputElement).checked })}
                  class="accent-primary"
                />
                <span class="text-xs">Required</span>
              </label>
              <label class="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={v.isList}
                  onChange={e => updateVar(v.id, { isList: (e.target as HTMLInputElement).checked })}
                  class="accent-primary"
                />
                <span class="text-xs">List</span>
              </label>
            </div>
            {/* Delete */}
            <div class="col-span-4 sm:col-span-2 flex justify-end">
              <button
                onClick={() => removeVar(v.id)}
                class="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded"
                title="Remove variable"
              >Remove</button>
            </div>
          </div>
        ))}

        {vars.length === 0 && (
          <p class="text-sm text-text-muted text-center py-4">No variables. Click "Add Variable" to start.</p>
        )}
      </div>

      {/* Outputs */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Variables JSON */}
        <div>
          <div class="flex justify-between items-center mb-1">
            <h3 class="font-semibold text-sm">Variables JSON</h3>
            <button
              onClick={() => copy('json')}
              class="px-3 py-1 text-xs border border-border rounded hover:bg-surface transition-colors"
            >{copied === 'json' ? '✓ Copied!' : 'Copy JSON'}</button>
          </div>
          <pre class="bg-surface border border-border rounded p-3 text-xs font-mono overflow-auto max-h-48 text-text-muted">{variablesJson}</pre>
        </div>

        {/* Query Signature */}
        <div>
          <div class="flex justify-between items-center mb-1">
            <h3 class="font-semibold text-sm">Query Signature</h3>
            <button
              onClick={() => copy('sig')}
              class="px-3 py-1 text-xs border border-border rounded hover:bg-surface transition-colors"
            >{copied === 'sig' ? '✓ Copied!' : 'Copy Signature'}</button>
          </div>
          <pre class="bg-surface border border-border rounded p-3 text-xs font-mono overflow-auto max-h-48 text-text-muted">{queryPreview}</pre>
        </div>
      </div>

      {/* Type cheatsheet */}
      <details class="border border-border rounded">
        <summary class="px-3 py-2 cursor-pointer text-sm font-medium select-none">GraphQL Scalar Types Reference</summary>
        <div class="px-3 pb-3 pt-1">
          <table class="w-full text-xs text-text-muted">
            <thead><tr class="border-b border-border"><th class="text-left py-1">Type</th><th class="text-left py-1">JSON Example</th><th class="text-left py-1">Notes</th></tr></thead>
            <tbody>
              {[
                ['String', '"hello"', 'UTF-8 string'],
                ['Int', '42', '32-bit signed integer'],
                ['Float', '3.14', 'Double-precision float'],
                ['Boolean', 'true / false', 'true or false'],
                ['ID', '"abc123"', 'Unique identifier (string or int)'],
                ['[Type]', '["a", "b"]', 'List — check "List" checkbox'],
                ['Type!', '(required)', 'Non-null — check "Required" checkbox'],
              ].map(([type, example, notes]) => (
                <tr key={type} class="border-b border-border last:border-0">
                  <td class="py-1 font-mono text-primary">{type}</td>
                  <td class="py-1 font-mono">{example}</td>
                  <td class="py-1">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
