import { useState } from 'preact/hooks';

const SAMPLE_JSON = `{
  "user": {
    "id": 42,
    "name": "Alice",
    "roles": ["admin", "editor"],
    "address": {
      "city": "Taipei",
      "zip": "100"
    }
  },
  "meta": {
    "version": "1.0",
    "active": true
  }
}`;

interface SelectedPath {
  jsonpath: string;
  jq: string;
  value: string;
}

function toJq(jsonpath: string): string {
  // Convert JSONPath to jq
  let jq = jsonpath
    .replace(/^\$/, '.')
    .replace(/\[(\d+)\]/g, '.[$1]')
    .replace(/\./g, '.')
    .replace(/\.\[/g, '[');
  if (jq === '.') jq = '.';
  return jq;
}

interface TreeNodeProps {
  data: unknown;
  path: string;
  onSelect: (p: SelectedPath) => void;
  selectedPath: string;
  depth?: number;
}

function valueDisplay(v: unknown): string {
  if (v === null) return 'null';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  return '';
}

function valueClass(v: unknown): string {
  if (v === null) return 'text-gray-400';
  if (typeof v === 'string') return 'text-green-600 dark:text-green-400';
  if (typeof v === 'boolean') return 'text-purple-600 dark:text-purple-400';
  if (typeof v === 'number') return 'text-blue-600 dark:text-blue-400';
  return 'text-text';
}

function TreeNode({ data, path, onSelect, selectedPath, depth = 0 }: TreeNodeProps) {
  const [collapsed, setCollapsed] = useState(depth > 2);
  const indent = depth * 16;

  if (data === null || typeof data !== 'object') {
    const isSelected = path === selectedPath;
    return (
      <div
        style={{ paddingLeft: `${indent}px` }}
        class={`flex items-center gap-1 py-0.5 px-2 rounded cursor-pointer hover:bg-primary/10 transition-colors group ${isSelected ? 'bg-primary/20' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          onSelect({ jsonpath: path, jq: toJq(path), value: valueDisplay(data) });
        }}
      >
        <span class={`text-sm font-mono ${valueClass(data)}`}>{valueDisplay(data)}</span>
        <span class="text-xs text-text-muted opacity-0 group-hover:opacity-100 ml-1 font-mono">{path}</span>
      </div>
    );
  }

  const isArray = Array.isArray(data);
  const entries = isArray
    ? (data as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(data as Record<string, unknown>);

  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';

  return (
    <div style={{ paddingLeft: depth === 0 ? '0px' : `${indent}px` }}>
      <div
        class="flex items-center gap-1 py-0.5 px-2 rounded cursor-pointer hover:bg-bg-secondary transition-colors select-none"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span class="text-xs text-text-muted w-3 text-center">{collapsed ? '▶' : '▼'}</span>
        <span class="text-sm font-mono text-text-muted">
          {openBracket}
          {collapsed && <span class="text-text-muted"> {entries.length} items </span>}
          {collapsed && closeBracket}
        </span>
      </div>
      {!collapsed && (
        <>
          {entries.map(([key, val]) => {
            const childPath = isArray ? `${path}[${key}]` : `${path}.${key}`;
            const isObj = val !== null && typeof val === 'object';
            const isSelected = !isObj && childPath === selectedPath;
            return (
              <div key={key} style={{ paddingLeft: `${16}px` }}>
                <div
                  class={`flex items-center gap-1 py-0.5 px-2 rounded ${!isObj ? 'cursor-pointer hover:bg-primary/10 group' : ''} transition-colors ${isSelected ? 'bg-primary/20' : ''}`}
                  onClick={!isObj ? (e) => {
                    e.stopPropagation();
                    onSelect({ jsonpath: childPath, jq: toJq(childPath), value: valueDisplay(val) });
                  } : undefined}
                >
                  <span class="text-sm font-mono text-orange-600 dark:text-orange-400">{isArray ? '' : `"${key}"`}</span>
                  {!isArray && <span class="text-sm font-mono text-text-muted">: </span>}
                  {isObj ? null : (
                    <>
                      <span class={`text-sm font-mono ${valueClass(val)}`}>{valueDisplay(val)}</span>
                      <span class="text-xs text-text-muted opacity-0 group-hover:opacity-100 ml-1 font-mono">{childPath}</span>
                    </>
                  )}
                </div>
                {isObj && (
                  <TreeNode
                    data={val}
                    path={childPath}
                    onSelect={onSelect}
                    selectedPath={selectedPath}
                    depth={depth + 1}
                  />
                )}
              </div>
            );
          })}
          <div style={{ paddingLeft: depth === 0 ? '0px' : `${indent}px` }} class="px-2 text-sm font-mono text-text-muted py-0.5">{closeBracket}</div>
        </>
      )}
    </div>
  );
}

export default function JsonPathFinder() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<unknown>(() => JSON.parse(SAMPLE_JSON));
  const [selected, setSelected] = useState<SelectedPath | null>(null);
  const [copied, setCopied] = useState<'jsonpath' | 'jq' | null>(null);

  const handleInput = (e: Event) => {
    const val = (e.currentTarget as HTMLTextAreaElement).value;
    setInput(val);
    try {
      setParsed(JSON.parse(val));
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setParsed(null);
    }
  };

  const copy = (type: 'jsonpath' | 'jq', text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="space-y-2">
        <label class="text-xs font-semibold text-text-muted uppercase tracking-wide">JSON Input</label>
        <textarea
          value={input}
          onInput={handleInput}
          rows={6}
          spellcheck={false}
          class={`w-full px-3 py-2 bg-bg-secondary border rounded-lg text-sm font-mono resize-y focus:outline-none focus:border-primary ${
            error ? 'border-red-500' : 'border-border'
          }`}
          placeholder="Paste your JSON here..."
        />
        {error && <p class="text-xs text-red-500">⚠ {error}</p>}
      </div>

      {/* Selected path display */}
      {selected && (
        <div class="bg-bg-secondary border border-border rounded-xl p-4 space-y-3">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wide">Selected Path</p>
          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-text-muted w-16 shrink-0">JSONPath</span>
              <code class="flex-1 font-mono text-sm bg-bg-tertiary px-2 py-1 rounded text-primary">{selected.jsonpath}</code>
              <button
                onClick={() => copy('jsonpath', selected.jsonpath)}
                class="text-xs px-2 py-1 bg-primary text-white rounded hover:bg-primary-dark transition-colors shrink-0"
              >
                {copied === 'jsonpath' ? '✓' : 'Copy'}
              </button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-text-muted w-16 shrink-0">jq</span>
              <code class="flex-1 font-mono text-sm bg-bg-tertiary px-2 py-1 rounded text-green-600 dark:text-green-400">{selected.jq}</code>
              <button
                onClick={() => copy('jq', selected.jq)}
                class="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors shrink-0"
              >
                {copied === 'jq' ? '✓' : 'Copy'}
              </button>
            </div>
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs text-text-muted w-16 shrink-0">Value</span>
              <code class="flex-1 font-mono text-sm bg-bg-tertiary px-2 py-1 rounded text-text">{selected.value}</code>
            </div>
          </div>
        </div>
      )}

      {!selected && parsed && (
        <div class="bg-bg-secondary border border-dashed border-border rounded-xl p-3 text-center text-sm text-text-muted">
          👆 Click any value in the tree below to get its path
        </div>
      )}

      {/* Tree */}
      {parsed !== null && (
        <div class="bg-bg-secondary border border-border rounded-xl p-4 overflow-x-auto">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Interactive Tree</p>
          <TreeNode
            data={parsed}
            path="$"
            onSelect={setSelected}
            selectedPath={selected?.jsonpath ?? ''}
            depth={0}
          />
        </div>
      )}
    </div>
  );
}
