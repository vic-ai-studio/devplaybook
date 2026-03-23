import { useState, useEffect, useCallback } from 'preact/hooks';

// TypeScript → JavaScript converter (client-side, no compiler needed)
function tsToJs(ts: string): { js: string; errors: string[] } {
  if (!ts.trim()) return { js: '', errors: [] };
  const errors: string[] = [];
  let js = ts;

  // Remove decorators
  js = js.replace(/@\w+(?:\([^)]*\))?\s*/g, '');

  // Remove declare statements
  js = js.replace(/^declare\s+(?:module|namespace|global|const|let|var|function|class|type|interface|enum)[^;{]*[;{][^}]*}?/gm, '');
  js = js.replace(/^declare\s+[^;\n]+;/gm, '');

  // Remove interface declarations
  js = removeTopLevelBlocks(js, /\binterface\s+\w+[\w\s,<>]*\s*\{/g);

  // Remove type alias declarations
  js = js.replace(/^type\s+\w+[\w\s,<>=|&\[\]{}()?:=>]*;/gm, '');
  js = removeTopLevelBlocks(js, /^type\s+\w+[\w\s,<>]*\s*=\s*\{/gm);

  // Convert enums
  js = js.replace(/\bconst\s+enum\s+/g, 'const enum_');
  js = convertEnums(js);

  // Remove export type / import type
  js = js.replace(/^export\s+type\s+.+;/gm, '');
  js = js.replace(/^import\s+type\s+.+;/gm, '');
  js = js.replace(/,?\s*type\s+\w+/g, '');

  // Remove generic type parameters
  js = js.replace(/<([^<>]|<[^<>]*>)*>/g, (match) => {
    if (/^<[A-Z]/.test(match) || /^<\w+\s*(?:extends|=)/.test(match)) return '';
    if (/^<\w+(,\s*\w+)*>$/.test(match)) return '';
    return match;
  });

  // Strip type annotations from params and variables
  js = stripTypeAnnotations(js);

  // Remove return type annotations
  js = js.replace(/\)\s*:\s*(?:[\w<>[\]|&{}.,\s()?:=>]+?)(?=\s*[{;,)])/g, ')');

  // Remove 'as Type' casts
  js = js.replace(/\s+as\s+(?:[\w<>[\]|&{}.,\s]+?)(?=[,;)\]}\s])/g, '');

  // Remove access modifiers
  js = js.replace(/\b(public|private|protected|readonly|abstract|override)\s+/g, '');

  // Remove implements clause
  js = js.replace(/\bimplements\s+(?:[\w.,\s<>]+)(?=\s*[{,])/g, '');

  // Remove satisfies
  js = js.replace(/\s+satisfies\s+(?:[\w<>[\]|&{}.,\s]+?)(?=[,;)\]}])/g, '');

  // Remove non-null assertions
  js = js.replace(/(\w+)!/g, '$1');

  // Clean up blank lines
  js = js.replace(/\n{3,}/g, '\n\n').trim();

  return { js, errors };
}

function removeTopLevelBlocks(code: string, pattern: RegExp): string {
  let result = code;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(result)) !== null) {
    const start = match.index;
    let depth = 0;
    let i = start;
    while (i < result.length) {
      if (result[i] === '{') depth++;
      else if (result[i] === '}') { depth--; if (depth === 0) { i++; break; } }
      i++;
    }
    while (i < result.length && (result[i] === ';' || result[i] === '\n')) i++;
    result = result.slice(0, start) + result.slice(i);
    pattern.lastIndex = start;
  }
  return result;
}

function convertEnums(code: string): string {
  return code.replace(/\benum\s+(\w+)\s*\{([^}]*)\}/g, (_, name, body) => {
    const members = body.split(',').map((m: string) => m.trim()).filter(Boolean);
    let val = 0;
    const pairs = members.map((m: string) => {
      const [k, v] = m.split('=').map((s: string) => s.trim());
      if (v !== undefined) {
        const num = Number(v.replace(/['"]/g, ''));
        if (!isNaN(num)) val = num;
        return `  ${k}: ${v}`;
      }
      return `  ${k}: ${val++}`;
    });
    return `const ${name} = {\n${pairs.join(',\n')}\n}`;
  });
}

function stripTypeAnnotations(code: string): string {
  return code
    .replace(/(\w+)\??\s*:\s*(?:[\w<>[\]|&{}.,\s()?:=>]+?)(?=\s*[,)=])/g, (match, name) => {
      if (match.includes('=>') && match.split('=>').length > 2) return match;
      return name;
    })
    .replace(/((?:const|let|var)\s+\w+)\s*:\s*(?:[\w<>[\]|&]+)(\s*=)/g, '$1$2')
    .replace(/^(\s+(?:static\s+)?(?:readonly\s+)?\w+)\s*:\s*[\w<>[\]|& ]+;/gm, '$1;')
    .replace(/^(\s+(?:static\s+)?(?:readonly\s+)?\w+)\s*:\s*[\w<>[\]|& ]+\s*=/gm, '$1 =');
}

const EXAMPLES: Record<string, { label: string; code: string }> = {
  interfaces: {
    label: 'Interfaces & Types',
    code: `interface User {
  id: number;
  name: string;
  email?: string;
  readonly createdAt: Date;
}

type Status = 'active' | 'inactive' | 'banned';

type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

const getUser = async (id: number): Promise<ApiResponse<User>> => {
  const user: User = { id, name: 'Alice', createdAt: new Date() };
  return { data: user, status: 200, message: 'OK' };
};`,
  },
  classes: {
    label: 'Classes & Generics',
    code: `class Stack<T> {
  private items: T[] = [];

  push(item: T): void {
    this.items.push(item);
  }

  pop(): T | undefined {
    return this.items.pop();
  }

  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  get size(): number {
    return this.items.length;
  }
}

const numStack = new Stack<number>();
numStack.push(1);
numStack.push(2);
console.log(numStack.pop()); // 2`,
  },
  enums: {
    label: 'Enums & Decorators',
    code: `enum Direction {
  Up = 'UP',
  Down = 'DOWN',
  Left = 'LEFT',
  Right = 'RIGHT',
}

enum HttpStatus {
  OK = 200,
  Created = 201,
  NotFound = 404,
  ServerError = 500,
}

function move(dir: Direction): string {
  return \`Moving \${dir}\`;
}

const result = move(Direction.Up);
const status: HttpStatus = HttpStatus.OK;`,
  },
  utility: {
    label: 'Utility Types',
    code: `interface Product {
  id: number;
  name: string;
  price: number;
  description: string;
  category: string;
  stock: number;
}

// Utility types
type ProductPreview = Pick<Product, 'id' | 'name' | 'price'>;
type ProductUpdate = Partial<Omit<Product, 'id'>>;
type RequiredProduct = Required<Product>;

// Mapped type
type ReadOnly<T> = {
  readonly [K in keyof T]: T[K];
};

// Conditional type
type NonNullable2<T> = T extends null | undefined ? never : T;

const preview: ProductPreview = { id: 1, name: 'Widget', price: 9.99 };
const update: ProductUpdate = { price: 14.99, stock: 50 };`,
  },
  async: {
    label: 'Async & Error Handling',
    code: `class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function fetchData<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new ApiError(res.status, \`HTTP \${res.status}: \${res.statusText}\`);
  }
  return res.json() as Promise<T>;
}

interface Todo {
  id: number;
  title: string;
  completed: boolean;
}

async function loadTodos(): Promise<Todo[]> {
  try {
    return await fetchData<Todo[]>('/api/todos');
  } catch (err) {
    if (err instanceof ApiError) {
      console.error(\`API Error \${err.statusCode}: \${err.message}\`);
    }
    return [];
  }
}`,
  },
};

function encodeShare(code: string): string {
  try {
    return btoa(encodeURIComponent(code));
  } catch {
    return '';
  }
}

function decodeShare(hash: string): string {
  try {
    return decodeURIComponent(atob(hash));
  } catch {
    return '';
  }
}

export default function TypescriptPlayground() {
  const [input, setInput] = useState('');
  const [activeExample, setActiveExample] = useState('');
  const [copied, setCopied] = useState(false);
  const [shareMsg, setShareMsg] = useState('');
  const [tab, setTab] = useState<'output' | 'diff'>('output');

  // Load from URL hash on mount
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash) {
      const code = decodeShare(hash);
      if (code) setInput(code);
    } else {
      // Load default example
      setInput(EXAMPLES.interfaces.code);
      setActiveExample('interfaces');
    }
  }, []);

  const { js: output } = input ? tsToJs(input) : { js: '' };

  const copyOutput = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const shareCode = () => {
    const encoded = encodeShare(input);
    if (!encoded) return;
    const url = `${window.location.origin}${window.location.pathname}#${encoded}`;
    navigator.clipboard.writeText(url).then(() => {
      setShareMsg('Link copied!');
      setTimeout(() => setShareMsg(''), 2000);
    });
    window.history.replaceState(null, '', `#${encoded}`);
  };

  const loadExample = (key: string) => {
    setInput(EXAMPLES[key].code);
    setActiveExample(key);
    window.history.replaceState(null, '', window.location.pathname);
  };

  const diffLines = useCallback(() => {
    if (!input || !output) return [];
    const inLines = input.split('\n');
    const outLines = output.split('\n');
    const result: Array<{ type: 'removed' | 'kept'; text: string }> = [];
    let oi = 0;
    for (const line of inLines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (oi < outLines.length && outLines[oi].trim() === trimmed) {
        result.push({ type: 'kept', text: line });
        oi++;
      } else {
        result.push({ type: 'removed', text: line });
      }
    }
    return result;
  }, [input, output]);

  const removedCount = diffLines().filter(l => l.type === 'removed').length;
  const keptCount = diffLines().filter(l => l.type === 'kept').length;

  return (
    <div class="space-y-4">
      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        {Object.entries(EXAMPLES).map(([key, ex]) => (
          <button
            key={key}
            onClick={() => loadExample(key)}
            class={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              activeExample === key
                ? 'bg-primary text-white border-primary'
                : 'bg-bg-card border-border hover:border-primary hover:text-primary'
            }`}
          >
            {ex.label}
          </button>
        ))}
        <button
          onClick={() => { setInput(''); setActiveExample(''); window.history.replaceState(null, '', window.location.pathname); }}
          class="text-xs px-3 py-1.5 rounded-lg border border-border bg-bg-card hover:border-red-400 hover:text-red-400 transition-colors ml-auto"
        >
          Clear
        </button>
      </div>

      {/* Editor */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full bg-blue-500"></span>
              TypeScript Input
            </label>
            <div class="flex items-center gap-2">
              <span class="text-xs text-text-muted">{input.length} chars</span>
              <button
                onClick={shareCode}
                class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors"
              >
                {shareMsg || '🔗 Share'}
              </button>
            </div>
          </div>
          <textarea
            class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors leading-relaxed"
            placeholder="// Write TypeScript here..."
            value={input}
            onInput={(e) => { setInput((e.target as HTMLTextAreaElement).value); setActiveExample(''); }}
            spellcheck={false}
          />
        </div>

        {/* Output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <div class="flex gap-1">
              <button
                onClick={() => setTab('output')}
                class={`text-xs px-3 py-1 rounded-t border-b-2 transition-colors ${tab === 'output' ? 'border-primary text-primary font-semibold' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                JavaScript Output
              </button>
              <button
                onClick={() => setTab('diff')}
                class={`text-xs px-3 py-1 rounded-t border-b-2 transition-colors ${tab === 'diff' ? 'border-primary text-primary font-semibold' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                What was removed
                {removedCount > 0 && <span class="ml-1 bg-red-500/20 text-red-400 text-xs px-1.5 rounded-full">{removedCount}</span>}
              </button>
            </div>
            <button
              onClick={copyOutput}
              disabled={!output}
              class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>

          {tab === 'output' ? (
            <textarea
              readOnly
              class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none leading-relaxed"
              placeholder="// Compiled JavaScript appears here..."
              value={output}
            />
          ) : (
            <div class="h-80 overflow-auto bg-bg-card border border-border rounded-lg p-3 font-mono text-xs leading-relaxed">
              {input ? (
                <>
                  <div class="flex gap-4 mb-2 text-xs">
                    <span class="text-red-400">— {removedCount} lines removed (TS-only)</span>
                    <span class="text-green-400">✓ {keptCount} lines kept</span>
                  </div>
                  {diffLines().map((line, i) => (
                    <div
                      key={i}
                      class={`${line.type === 'removed' ? 'text-red-400 bg-red-500/10 line-through' : 'text-text'} px-1`}
                    >
                      {line.text || '\u00a0'}
                    </div>
                  ))}
                </>
              ) : (
                <span class="text-text-muted">Paste TypeScript to see what gets removed</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Info */}
      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm">
          <p class="font-semibold mb-2">What TypeScript Playground does</p>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-muted">
            <ul class="space-y-1">
              <li>✅ Strips <code class="bg-bg px-1 rounded">interface</code> and <code class="bg-bg px-1 rounded">type</code> declarations</li>
              <li>✅ Removes type annotations from params and variables</li>
              <li>✅ Converts <code class="bg-bg px-1 rounded">enum</code> to plain JS objects</li>
              <li>✅ Strips generic type parameters <code class="bg-bg px-1 rounded">&lt;T&gt;</code></li>
            </ul>
            <ul class="space-y-1">
              <li>✅ Removes access modifiers (<code class="bg-bg px-1 rounded">private</code>, <code class="bg-bg px-1 rounded">readonly</code>, etc.)</li>
              <li>✅ Strips <code class="bg-bg px-1 rounded">import type</code> / <code class="bg-bg px-1 rounded">export type</code></li>
              <li>✅ Removes <code class="bg-bg px-1 rounded">as</code> casts and <code class="bg-bg px-1 rounded">!</code> assertions</li>
              <li>✅ Shareable URLs — encode your code in one click</li>
            </ul>
          </div>
          <p class="mt-3 text-xs text-yellow-400">⚠ For production transpilation use <a href="https://www.typescriptlang.org/play" target="_blank" rel="noopener" class="underline">TypeScript official playground</a> or the <code class="bg-bg px-1 rounded">tsc</code> compiler.</p>
        </div>
      )}
    </div>
  );
}
