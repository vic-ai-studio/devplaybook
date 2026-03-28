import { useState, useMemo } from 'preact/hooks';

// ── JSONPath evaluator (no external library) ──────────────────────────────────

interface MatchResult {
  path: string;
  value: unknown;
}

type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
interface JsonObject { [key: string]: JsonValue; }
type JsonArray = JsonValue[];

function jsonPathQuery(root: JsonValue, expression: string): MatchResult[] {
  const results: MatchResult[] = [];

  // Normalize: strip leading $ or $.
  let expr = expression.trim();
  if (expr === '$' || expr === '') {
    results.push({ path: '$', value: root });
    return results;
  }
  if (expr.startsWith('$')) expr = expr.slice(1);
  if (expr.startsWith('.') && !expr.startsWith('..')) expr = expr.slice(1);

  function addResult(path: string, value: unknown) {
    results.push({ path, value });
  }

  function traverse(node: unknown, pathSoFar: string, segments: string[]) {
    if (segments.length === 0) {
      addResult(pathSoFar, node);
      return;
    }

    const seg = segments[0];
    const rest = segments.slice(1);

    // Recursive descent: ..key
    if (seg.startsWith('.')) {
      const key = seg.slice(1);
      // Apply to current node first
      traverseSegment(node, pathSoFar, key, rest);
      // Then recurse into all children
      if (Array.isArray(node)) {
        node.forEach((item, i) => {
          traverse(item, `${pathSoFar}[${i}]`, segments);
        });
      } else if (node !== null && typeof node === 'object') {
        for (const k of Object.keys(node as object)) {
          traverse((node as JsonObject)[k], `${pathSoFar}['${k}']`, segments);
        }
      }
      return;
    }

    traverseSegment(node, pathSoFar, seg, rest);
  }

  function traverseSegment(node: unknown, pathSoFar: string, seg: string, rest: string[]) {
    // Wildcard: *
    if (seg === '*' || seg === '[*]') {
      if (Array.isArray(node)) {
        node.forEach((item, i) => {
          traverse(item, `${pathSoFar}[${i}]`, rest);
        });
      } else if (node !== null && typeof node === 'object') {
        for (const k of Object.keys(node as object)) {
          traverse((node as JsonObject)[k], `${pathSoFar}['${k}']`, rest);
        }
      }
      return;
    }

    // Array index: [0], [1], [-1], etc. or bare number
    const indexMatch = seg.match(/^\[(-?\d+)\]$/) || seg.match(/^(-?\d+)$/);
    if (indexMatch) {
      let idx = parseInt(indexMatch[1], 10);
      if (Array.isArray(node)) {
        if (idx < 0) idx = node.length + idx;
        if (idx >= 0 && idx < node.length) {
          traverse(node[idx], `${pathSoFar}[${idx}]`, rest);
        }
      }
      return;
    }

    // Array slice: [start:end] (basic)
    const sliceMatch = seg.match(/^\[(\d*):(\d*)\]$/);
    if (sliceMatch) {
      if (Array.isArray(node)) {
        const start = sliceMatch[1] ? parseInt(sliceMatch[1], 10) : 0;
        const end = sliceMatch[2] ? parseInt(sliceMatch[2], 10) : node.length;
        for (let i = start; i < Math.min(end, node.length); i++) {
          traverse(node[i], `${pathSoFar}[${i}]`, rest);
        }
      }
      return;
    }

    // Bracket notation: ['key'] or ["key"]
    const bracketMatch = seg.match(/^\[['"](.+)['"]\]$/);
    if (bracketMatch) {
      const key = bracketMatch[1];
      if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
        const obj = node as JsonObject;
        if (key in obj) {
          traverse(obj[key], `${pathSoFar}['${key}']`, rest);
        }
      }
      return;
    }

    // Property name (dot notation): key
    if (/^[a-zA-Z0-9_$]+$/.test(seg) || seg.includes('-')) {
      if (node !== null && typeof node === 'object' && !Array.isArray(node)) {
        const obj = node as JsonObject;
        if (seg in obj) {
          traverse(obj[seg], `${pathSoFar}.${seg}`, rest);
        }
      }
      return;
    }
  }

  // Tokenize expression into segments
  // Handles: .key, ..key, [0], [*], ['key'], ["key"], [start:end]
  function tokenize(expr: string): string[] {
    const tokens: string[] = [];
    let i = 0;
    while (i < expr.length) {
      if (expr[i] === '.') {
        if (expr[i + 1] === '.') {
          // Recursive descent
          i += 2;
          if (expr[i] === '[') {
            // ..[ — collect bracket
            let j = i + 1;
            while (j < expr.length && expr[j] !== ']') j++;
            const inner = expr.slice(i + 1, j);
            tokens.push(`.[${inner}]`); // mark as recursive
            i = j + 1;
          } else {
            // ..key
            let j = i;
            while (j < expr.length && expr[j] !== '.' && expr[j] !== '[') j++;
            tokens.push('.' + expr.slice(i, j));
            i = j;
          }
        } else {
          // Normal dot
          i++;
          if (i >= expr.length) break;
          if (expr[i] === '*') {
            tokens.push('*');
            i++;
          } else {
            let j = i;
            while (j < expr.length && expr[j] !== '.' && expr[j] !== '[') j++;
            tokens.push(expr.slice(i, j));
            i = j;
          }
        }
      } else if (expr[i] === '[') {
        let j = i + 1;
        // handle nested quotes inside brackets
        let inQuote = false;
        let quoteChar = '';
        while (j < expr.length) {
          if (!inQuote && (expr[j] === "'" || expr[j] === '"')) {
            inQuote = true;
            quoteChar = expr[j];
          } else if (inQuote && expr[j] === quoteChar) {
            inQuote = false;
          } else if (!inQuote && expr[j] === ']') {
            break;
          }
          j++;
        }
        tokens.push(expr.slice(i, j + 1));
        i = j + 1;
      } else {
        // bare key without leading dot (edge case)
        let j = i;
        while (j < expr.length && expr[j] !== '.' && expr[j] !== '[') j++;
        tokens.push(expr.slice(i, j));
        i = j;
      }
    }
    return tokens.filter(t => t.length > 0);
  }

  const tokens = tokenize(expr);
  traverse(root, '$', tokens);
  return results;
}

// ── Sample JSON ───────────────────────────────────────────────────────────────

const SAMPLE_JSON = `{
  "store": {
    "name": "TechMart Online",
    "orders": [
      {
        "id": "ORD-1001",
        "status": "shipped",
        "customer": {
          "name": "Alice Chen",
          "email": "alice@example.com"
        },
        "items": [
          { "sku": "LAPTOP-PRO", "name": "Pro Laptop 15\"", "qty": 1, "price": 1299.00 },
          { "sku": "USB-HUB", "name": "USB-C Hub 7-Port", "qty": 2, "price": 39.99 }
        ],
        "total": 1378.98,
        "shippedAt": "2024-03-01T09:15:00Z"
      },
      {
        "id": "ORD-1002",
        "status": "pending",
        "customer": {
          "name": "Bob Kim",
          "email": "bob@example.com"
        },
        "items": [
          { "sku": "MONITOR-4K", "name": "4K Monitor 27\"", "qty": 1, "price": 549.00 }
        ],
        "total": 549.00,
        "shippedAt": null
      }
    ],
    "inventory": {
      "LAPTOP-PRO": 12,
      "USB-HUB": 84,
      "MONITOR-4K": 7
    }
  }
}`;

const QUICK_REF = [
  { syntax: '$', description: 'Root element', example: '$' },
  { syntax: '$.key', description: 'Child property', example: '$.store.name' },
  { syntax: '$.arr[0]', description: 'Array index (zero-based)', example: '$.store.orders[0]' },
  { syntax: '$.arr[-1]', description: 'Last array element', example: '$.store.orders[-1]' },
  { syntax: '$.arr[*]', description: 'All array elements', example: '$.store.orders[*]' },
  { syntax: '$.obj.*', description: 'All object values', example: '$.store.inventory.*' },
  { syntax: '$..key', description: 'Recursive descent (all depths)', example: '$..name' },
  { syntax: "$..['key']", description: 'Bracket notation', example: "$..['email']" },
  { syntax: '$.arr[0:2]', description: 'Array slice [start:end]', example: '$.store.orders[0:1]' },
  { syntax: '$..items[*].price', description: 'Nested wildcard', example: '$..items[*].price' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatValue(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return `"${v}"`;
  if (typeof v === 'object') return JSON.stringify(v, null, 2);
  return String(v);
}

function getValueType(v: unknown): string {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  return typeof v;
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'string': return 'bg-green-500/15 text-green-400 border-green-500/30';
    case 'number': return 'bg-blue-500/15 text-blue-400 border-blue-500/30';
    case 'boolean': return 'bg-purple-500/15 text-purple-400 border-purple-500/30';
    case 'null': return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
    case 'array': return 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30';
    case 'object': return 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    default: return 'bg-gray-500/15 text-gray-400 border-gray-500/30';
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function JsonPathTester() {
  const [jsonInput, setJsonInput] = useState(SAMPLE_JSON);
  const [pathExpr, setPathExpr] = useState('$.store.orders[*].customer.name');
  const [copied, setCopied] = useState(false);
  const [showRef, setShowRef] = useState(false);

  // Parse JSON
  const parsedJson = useMemo<{ ok: boolean; value?: JsonValue; error?: string }>(() => {
    if (!jsonInput.trim()) return { ok: false, error: 'Enter JSON to query.' };
    try {
      return { ok: true, value: JSON.parse(jsonInput) as JsonValue };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [jsonInput]);

  // Evaluate JSONPath
  const queryResult = useMemo<{ ok: boolean; matches?: MatchResult[]; error?: string }>(() => {
    if (!parsedJson.ok) return { ok: false, error: 'Fix JSON errors first.' };
    if (!pathExpr.trim()) return { ok: true, matches: [] };
    try {
      const matches = jsonPathQuery(parsedJson.value!, pathExpr.trim());
      return { ok: true, matches };
    } catch (e: unknown) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }, [parsedJson, pathExpr]);

  const copyResults = () => {
    if (!queryResult.matches) return;
    const text = queryResult.matches
      .map(m => `${m.path}  =>  ${formatValue(m.value)}`)
      .join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const copyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  const lineCount = jsonInput.split('\n').length;
  const matchCount = queryResult.matches?.length ?? 0;

  return (
    <div class="space-y-4">

      {/* Top status bar */}
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex gap-2 items-center text-sm text-text-muted">
          <span
            class={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
              parsedJson.ok
                ? 'bg-green-500/10 border-green-500/30 text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-400'
            }`}
          >
            {parsedJson.ok ? '✓ Valid JSON' : '✗ Invalid JSON'}
          </span>
          {parsedJson.ok && pathExpr.trim() && (
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-primary/10 border-primary/30 text-primary">
              {matchCount} match{matchCount !== 1 ? 'es' : ''}
            </span>
          )}
        </div>
        <div class="flex gap-2">
          <button
            onClick={() => { setJsonInput(SAMPLE_JSON); setPathExpr('$.store.orders[*].customer.name'); }}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={() => setShowRef(!showRef)}
            class={`text-xs px-3 py-1.5 rounded border transition-colors ${showRef ? 'bg-primary text-white border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'}`}
          >
            Quick Reference
          </button>
        </div>
      </div>

      {/* Main two-panel layout */}
      <div class="grid md:grid-cols-2 gap-4">

        {/* Left panel: JSON input */}
        <div class="flex flex-col gap-2">
          <div class="flex justify-between items-center">
            <label class="text-sm font-medium text-text-muted">JSON Input</label>
            <button
              onClick={() => setJsonInput('')}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            class="w-full h-96 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your JSON here..."
            value={jsonInput}
            onInput={(e) => setJsonInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
          <div class="flex justify-between text-xs text-text-muted">
            <span>{lineCount} lines · {jsonInput.length} chars</span>
            {!parsedJson.ok && parsedJson.error && (
              <span class="text-red-400 truncate max-w-xs" title={parsedJson.error}>
                {parsedJson.error}
              </span>
            )}
          </div>
        </div>

        {/* Right panel: expression + results */}
        <div class="flex flex-col gap-3">

          {/* Expression input */}
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1.5">JSONPath Expression</label>
            <div class="relative">
              <input
                type="text"
                class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors pr-16"
                placeholder="$.store.orders[*].id"
                value={pathExpr}
                onInput={(e) => setPathExpr((e.target as HTMLInputElement).value)}
                spellcheck={false}
              />
              {pathExpr && (
                <button
                  onClick={() => setPathExpr('')}
                  class="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary text-xs px-1.5 py-0.5 rounded transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Quick expression examples */}
          <div class="flex flex-wrap gap-1.5">
            {[
              '$.store.name',
              '$..name',
              '$.store.orders[0]',
              '$..items[*].price',
              '$.store.inventory.*',
            ].map((ex) => (
              <button
                key={ex}
                onClick={() => setPathExpr(ex)}
                class="text-xs font-mono px-2 py-1 rounded bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>

          {/* Results */}
          <div class="flex flex-col flex-1 min-h-0">
            <div class="flex justify-between items-center mb-1.5">
              <label class="text-sm font-medium text-text-muted">
                Results
                {matchCount > 0 && (
                  <span class="ml-2 text-xs font-normal text-primary">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span>
                )}
              </label>
              <button
                onClick={copyResults}
                disabled={matchCount === 0}
                class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
              >
                {copied ? '✓ Copied' : 'Copy All'}
              </button>
            </div>

            <div class="h-72 overflow-y-auto bg-bg-card border border-border rounded-lg p-2 space-y-1.5">
              {!pathExpr.trim() && (
                <p class="text-xs text-text-muted p-2">Enter a JSONPath expression above to see matches.</p>
              )}
              {pathExpr.trim() && !queryResult.ok && (
                <div class="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                  <span class="text-red-400 text-xs font-mono">✗</span>
                  <span class="text-red-400 text-xs">{queryResult.error}</span>
                </div>
              )}
              {queryResult.ok && queryResult.matches?.length === 0 && pathExpr.trim() && (
                <p class="text-xs text-text-muted p-2 italic">No matches found for this expression.</p>
              )}
              {queryResult.ok && queryResult.matches?.map((m, idx) => {
                const type = getValueType(m.value);
                const typeBadge = getTypeBadgeClass(type);
                const isComplex = typeof m.value === 'object' && m.value !== null;
                return (
                  <div
                    key={idx}
                    class="group rounded-md border border-border bg-bg p-2 hover:border-primary/50 transition-colors"
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-xs text-text-muted font-mono flex-1 truncate" title={m.path}>
                        {m.path}
                      </span>
                      <span class={`text-xs px-1.5 py-0.5 rounded border font-mono shrink-0 ${typeBadge}`}>
                        {type}
                      </span>
                      <button
                        onClick={() => copyPath(m.path)}
                        class="text-xs text-text-muted hover:text-primary opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title="Copy path"
                      >
                        Copy path
                      </button>
                    </div>
                    <pre class={`text-xs font-mono text-text ${isComplex ? 'max-h-24 overflow-y-auto' : ''} whitespace-pre-wrap break-all`}>
                      {formatValue(m.value)}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Reference table */}
      {showRef && (
        <div class="rounded-lg border border-border bg-bg-card overflow-hidden">
          <div class="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 class="text-sm font-semibold text-text">JSONPath Quick Reference</h3>
            <button
              onClick={() => setShowRef(false)}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Hide
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border text-left">
                  <th class="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider w-36">Syntax</th>
                  <th class="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">Description</th>
                  <th class="px-4 py-2 text-xs font-medium text-text-muted uppercase tracking-wider">Example (click to try)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                {QUICK_REF.map((row, i) => (
                  <tr key={i} class="hover:bg-bg transition-colors">
                    <td class="px-4 py-2 font-mono text-xs text-primary whitespace-nowrap">{row.syntax}</td>
                    <td class="px-4 py-2 text-xs text-text-muted">{row.description}</td>
                    <td class="px-4 py-2">
                      <button
                        onClick={() => setPathExpr(row.example)}
                        class="font-mono text-xs text-text-muted hover:text-primary underline decoration-dashed underline-offset-2 transition-colors"
                        title={`Try: ${row.example}`}
                      >
                        {row.example}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div class="px-4 py-3 border-t border-border text-xs text-text-muted">
            Click any example in the table to load it into the expression input above.
          </div>
        </div>
      )}
    </div>
  );
}
