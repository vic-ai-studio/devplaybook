import { useState, useCallback } from 'preact/hooks';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function toPascalCase(str: string): string {
  return str
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, c => c.toUpperCase());
}

function inferType(value: JsonValue, key: string, interfaces: Map<string, string>, optional: boolean): string {
  if (value === null) return 'null';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'number') return Number.isInteger(value) ? 'number' : 'number';
  if (typeof value === 'string') return 'string';
  if (Array.isArray(value)) {
    if (value.length === 0) return 'unknown[]';
    // Check if all items are same primitive type
    const itemTypes = new Set(value.map(v => inferType(v, key, interfaces, false)));
    const merged = itemTypes.size === 1 ? [...itemTypes][0] : [...itemTypes].join(' | ');
    return `(${merged})[]`;
  }
  if (typeof value === 'object') {
    const interfaceName = toPascalCase(key) || 'NestedObject';
    buildInterface(value as Record<string, JsonValue>, interfaceName, interfaces, optional);
    return interfaceName;
  }
  return 'unknown';
}

function buildInterface(
  obj: Record<string, JsonValue>,
  name: string,
  interfaces: Map<string, string>,
  useOptional: boolean,
): void {
  if (interfaces.has(name)) return;
  const lines: string[] = [`interface ${name} {`];
  for (const [key, val] of Object.entries(obj)) {
    const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key) ? key : `'${key}'`;
    const opt = useOptional ? '?' : '';
    const type = inferType(val, toPascalCase(key), interfaces, useOptional);
    lines.push(`  ${safeKey}${opt}: ${type};`);
  }
  lines.push('}');
  interfaces.set(name, lines.join('\n'));
}

function jsonToTs(json: string, rootName: string, useOptional: boolean, exportKeyword: boolean): string {
  const parsed: JsonValue = JSON.parse(json);
  const interfaces = new Map<string, string>();
  const root = Array.isArray(parsed) ? parsed[0] : parsed;
  if (typeof root !== 'object' || root === null || Array.isArray(root)) {
    const t = inferType(parsed, rootName, interfaces, useOptional);
    const prefix = exportKeyword ? 'export ' : '';
    return `${prefix}type ${toPascalCase(rootName)} = ${t};`;
  }
  buildInterface(root as Record<string, JsonValue>, toPascalCase(rootName), interfaces, useOptional);
  const prefix = exportKeyword ? 'export ' : '';
  return [...interfaces.values()].map(i => `${prefix}${i}`).join('\n\n');
}

const SAMPLE = `{
  "id": 42,
  "name": "Jane Doe",
  "email": "jane@example.com",
  "isPro": true,
  "score": 9.5,
  "tags": ["developer", "designer"],
  "address": {
    "street": "123 Main St",
    "city": "San Francisco",
    "zip": "94105"
  }
}`;

export default function JsonToTypeScript() {
  const [input, setInput] = useState(SAMPLE);
  const [rootName, setRootName] = useState('User');
  const [useOptional, setUseOptional] = useState(false);
  const [exportKw, setExportKw] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const output = useCallback((): string => {
    const trimmed = input.trim();
    if (!trimmed) return '';
    try {
      const result = jsonToTs(trimmed, rootName || 'Root', useOptional, exportKw);
      setError('');
      return result;
    } catch (e) {
      setError((e as Error).message);
      return '';
    }
  }, [input, rootName, useOptional, exportKw]);

  const result = output();

  const copy = () => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      {/* Options */}
      <div class="flex flex-wrap gap-4 items-end">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Root interface name</label>
          <input
            type="text"
            value={rootName}
            onInput={(e) => setRootName((e.target as HTMLInputElement).value)}
            class="bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors w-40"
            placeholder="Root"
          />
        </div>
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            checked={useOptional}
            onChange={() => setUseOptional(v => !v)}
            class="w-4 h-4 accent-primary"
          />
          Optional fields (<code>?</code>)
        </label>
        <label class="flex items-center gap-2 cursor-pointer select-none text-sm">
          <input
            type="checkbox"
            checked={exportKw}
            onChange={() => setExportKw(v => !v)}
            class="w-4 h-4 accent-primary"
          />
          Add <code>export</code>
        </label>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">JSON input</label>
            <button
              onClick={() => setInput(SAMPLE)}
              class="text-xs bg-bg-card border border-border px-2 py-1 rounded hover:border-primary transition-colors"
            >
              Sample
            </button>
          </div>
          <textarea
            class={`w-full h-72 bg-bg-card border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none transition-colors ${
              error ? 'border-red-500' : 'border-border focus:border-primary'
            }`}
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            placeholder='{"key": "value"}'
            spellcheck={false}
          />
          {error && <p class="text-xs text-red-400 mt-1">⚠ {error}</p>}
        </div>

        {/* Output */}
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="text-sm font-medium text-text-muted">TypeScript interfaces</label>
            <button
              onClick={copy}
              disabled={!result}
              class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded-md hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            value={result}
            placeholder="TypeScript output will appear here..."
            spellcheck={false}
          />
        </div>
      </div>
    </div>
  );
}
