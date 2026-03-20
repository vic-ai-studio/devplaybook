import { useState } from 'preact/hooks';

// TypeScript to JavaScript converter
// Handles: type annotations, interfaces, type aliases, generics, enums, decorators, access modifiers
function tsToJs(ts: string): string {
  if (!ts.trim()) return '';
  let js = ts;

  // Remove decorators (@SomeName or @SomeName(...))
  js = js.replace(/@\w+(?:\([^)]*\))?\s*/g, '');

  // Remove 'declare' statements entirely
  js = js.replace(/^declare\s+(?:module|namespace|global|const|let|var|function|class|type|interface|enum)[^;{]*[;{][^}]*}?/gm, '');
  js = js.replace(/^declare\s+[^;\n]+;/gm, '');

  // Remove interface declarations (interface Foo { ... })
  js = removeTopLevelBlocks(js, /\binterface\s+\w+[\w\s,<>]*\s*\{/g);

  // Remove type alias declarations (type Foo = ...)
  js = js.replace(/^type\s+\w+[\w\s,<>=|&\[\]{}]*;/gm, '');
  // Multi-line type aliases
  js = removeTopLevelBlocks(js, /^type\s+\w+[\w\s,<>]*\s*=\s*\{/gm);

  // Remove enum declarations (replace with const object)
  js = js.replace(/\bconst\s+enum\s+/g, 'const enum_');
  js = convertEnums(js);

  // Remove 'export type' and 'import type'
  js = js.replace(/^export\s+type\s+.+;/gm, '');
  js = js.replace(/^import\s+type\s+.+;/gm, '');

  // Remove type imports from regular import statements: import { Foo, type Bar } from '...'
  js = js.replace(/,?\s*type\s+\w+/g, '');

  // Remove generic type parameters from function/class/interface declarations
  // e.g., function foo<T, U>(...)  =>  function foo(...)
  // e.g., class Foo<T>  =>  class Foo
  js = js.replace(/<([^<>]|<[^<>]*>)*>/g, (match) => {
    // Only remove if it looks like a type param (not JSX-like comparison)
    if (/^<[A-Z]/.test(match) || /^<\w+\s*(?:extends|=)/.test(match)) return '';
    if (/^<\w+(,\s*\w+)*>$/.test(match)) return '';
    return match;
  });

  // Remove type annotations after parameter names: (a: string, b: number) => (a, b)
  // Also handles optional ? and default values
  js = stripTypeAnnotations(js);

  // Remove return type annotations: function foo(): string { => function foo() {
  js = js.replace(/\):\s*(?:[\w<>[\]|&{}.,\s]+?)(?=\s*[{;,)])/g, (match, offset, str) => {
    // Ensure we're after a function signature closing paren
    return ')';
  });

  // Remove 'as Type' casts
  js = js.replace(/\s+as\s+(?:[\w<>[\]|&{}.,\s]+?)(?=[,;)\]}\s])/g, '');

  // Remove access modifiers in class bodies: public, private, protected, readonly, abstract, override
  js = js.replace(/\b(public|private|protected|readonly|abstract|override)\s+/g, '');

  // Remove implements clause: class Foo implements Bar, Baz {
  js = js.replace(/\bimplements\s+(?:[\w.,\s<>]+)(?=\s*[{,])/g, '');

  // Remove 'satisfies' operator
  js = js.replace(/\s+satisfies\s+(?:[\w<>[\]|&{}.,\s]+?)(?=[,;)\]}])/g, '');

  // Remove non-null assertion operator (!)  e.g. foo!.bar => foo.bar
  js = js.replace(/(\w+)!/g, '$1');

  // Clean up extra blank lines
  js = js.replace(/\n{3,}/g, '\n\n').trim();

  return js;
}

function removeTopLevelBlocks(code: string, pattern: RegExp): string {
  let result = code;
  let match: RegExpExecArray | null;
  pattern.lastIndex = 0;
  while ((match = pattern.exec(result)) !== null) {
    const start = match.index;
    // Find matching closing brace
    let depth = 0;
    let i = start;
    while (i < result.length) {
      if (result[i] === '{') depth++;
      else if (result[i] === '}') { depth--; if (depth === 0) { i++; break; } }
      else if ((result[i] === '"' || result[i] === "'") && depth > 0) {
        const q = result[i++];
        while (i < result.length && result[i] !== q) { if (result[i] === '\\') i++; i++; }
      }
      i++;
    }
    // Remove optional trailing semicolon and newline
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
  // Strip ': TypeAnnotation' after variable names, params — careful not to strip object literals
  // Strategy: remove annotations in parameter lists and after variable declarations
  return code
    // Remove parameter type annotations (handles nested generics)
    .replace(/(\w+)\??\s*:\s*(?:[\w<>[\]|&{}.,\s()?:=>]+?)(?=\s*[,)=])/g, (match, name) => {
      // Be conservative: skip if it looks like an object or code
      if (match.includes('=>') && match.split('=>').length > 2) return match;
      return name;
    })
    // Remove variable declaration types: let x: string = ...
    .replace(/((?:const|let|var)\s+\w+)\s*:\s*(?:[\w<>[\]|&]+)(\s*=)/g, '$1$2')
    // Remove class property types: myProp: string;
    .replace(/^(\s+(?:static\s+)?(?:readonly\s+)?\w+)\s*:\s*[\w<>[\]|& ]+;/gm, '$1;')
    // Remove class property types with initializers: myProp: string = '...'
    .replace(/^(\s+(?:static\s+)?(?:readonly\s+)?\w+)\s*:\s*[\w<>[\]|& ]+\s*=/gm, '$1 =');
}

export default function TypescriptToJs() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [keepComments, setKeepComments] = useState(true);

  let output = input ? tsToJs(input) : '';
  if (!keepComments && output) {
    output = output.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const exampleTs = `interface User {
  id: number;
  name: string;
  email?: string;
}

type Status = 'active' | 'inactive';

enum Direction {
  Up,
  Down,
  Left,
  Right
}

class UserService {
  private users: User[] = [];

  constructor(private readonly db: Database) {}

  async getUser(id: number): Promise<User | null> {
    const user = this.users.find(u => u.id === id)!;
    return user as User;
  }

  public addUser(user: User): void {
    this.users.push(user);
  }
}

function greet<T extends User>(user: T): string {
  return \`Hello, \${user.name}\`;
}`;

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center justify-between">
        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={keepComments}
              onChange={(e) => setKeepComments((e.target as HTMLInputElement).checked)}
              class="rounded"
            />
            Keep comments
          </label>
        </div>
        <button
          onClick={() => setInput(exampleTs)}
          class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
        >
          Load Example
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">TypeScript Input</label>
          <textarea
            class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste TypeScript code here..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          />
          <div class="flex justify-between mt-1">
            <span class="text-xs text-text-muted">{input.length} chars</span>
            <button onClick={() => setInput('')} class="text-xs text-text-muted hover:text-primary transition-colors">Clear</button>
          </div>
        </div>

        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">JavaScript Output</label>
            <button
              onClick={copy}
              disabled={!output}
              class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <textarea
            readOnly
            class="w-full h-80 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            placeholder="JavaScript output appears here..."
            value={output}
          />
        </div>
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-1">What gets removed</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Interface and type declarations</li>
            <li>Type annotations on variables, parameters, and return types</li>
            <li>Generic type parameters (&lt;T&gt;, &lt;T extends U&gt;)</li>
            <li>Access modifiers (public, private, protected, readonly)</li>
            <li>Enum declarations → converted to plain objects</li>
            <li>Decorators, implements clauses, non-null assertions (!)</li>
            <li>import type / export type statements</li>
          </ul>
          <p class="mt-2 text-xs text-yellow-400">⚠ For production use, prefer the official TypeScript compiler or Babel.</p>
        </div>
      )}
    </div>
  );
}
