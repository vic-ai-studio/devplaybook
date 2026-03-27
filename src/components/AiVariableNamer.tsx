import { useState } from 'preact/hooks';

// Common word mappings for better naming
const ABBR_MAP: Record<string, string> = {
  'identifier': 'id',
  'identification': 'id',
  'configuration': 'config',
  'authenticate': 'auth',
  'authentication': 'auth',
  'authorization': 'auth',
  'administrator': 'admin',
  'administration': 'admin',
  'application': 'app',
  'applications': 'apps',
  'component': 'comp',
  'components': 'comps',
  'database': 'db',
  'error': 'err',
  'errors': 'errs',
  'function': 'fn',
  'handler': 'handler',
  'message': 'msg',
  'messages': 'msgs',
  'number': 'num',
  'numbers': 'nums',
  'object': 'obj',
  'parameter': 'param',
  'parameters': 'params',
  'reference': 'ref',
  'references': 'refs',
  'request': 'req',
  'response': 'res',
  'result': 'result',
  'results': 'results',
  'temporary': 'temp',
  'timestamp': 'timestamp',
  'button': 'btn',
  'index': 'idx',
  'maximum': 'max',
  'minimum': 'min',
  'previous': 'prev',
  'current': 'curr',
  'count': 'count',
  'total': 'total',
  'value': 'val',
  'values': 'vals',
};

function tokenize(desc: string): string[] {
  return desc
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function mapTokens(tokens: string[]): string[] {
  // Filter filler words
  const FILLER = new Set(['a', 'an', 'the', 'of', 'in', 'to', 'for', 'with', 'that', 'this', 'it', 'is', 'are', 'be', 'as', 'at', 'by', 'from', 'on', 'or', 'and', 'which', 'stores', 'holds', 'contains', 'represents', 'indicates', 'checks', 'whether', 'if', 'into', 'its', 'all', 'will']);
  const mapped = tokens
    .filter(t => !FILLER.has(t))
    .map(t => ABBR_MAP[t] ?? t);
  // Remove duplicates while preserving order
  const seen = new Set<string>();
  return mapped.filter(t => { if (seen.has(t)) return false; seen.add(t); return true; });
}

function toCamelCase(words: string[]): string {
  return words.map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toPascalCase(words: string[]): string {
  return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('');
}

function toSnakeCase(words: string[]): string {
  return words.join('_').toLowerCase();
}

function toScreamingSnakeCase(words: string[]): string {
  return words.join('_').toUpperCase();
}

function toKebabCase(words: string[]): string {
  return words.join('-').toLowerCase();
}

type Kind = 'variable' | 'function' | 'constant' | 'class' | 'css-class';

function generateNames(desc: string, kind: Kind): Array<{ style: string; value: string; note: string }> {
  if (!desc.trim()) return [];
  const tokens = tokenize(desc);
  const words = mapTokens(tokens);
  if (!words.length) return [];

  const isBool = /\b(is|has|can|should|was|will|does|did|have)\b/i.test(desc);
  const verbPrefix = isBool ? '' : '';

  // For boolean-like descriptions, add is/has prefix
  let boolWords = words;
  if (isBool) {
    const boolToken = /\b(is|has|can|should|was|will|does|did|have)\b/i.exec(desc)?.[0]?.toLowerCase() ?? 'is';
    boolWords = boolToken === words[0] ? words : [boolToken, ...words.filter(w => w !== boolToken)];
  }

  if (kind === 'variable') {
    const results = [
      { style: 'camelCase', value: toCamelCase(words), note: 'JS/TS variables, React state' },
      { style: 'snake_case', value: toSnakeCase(words), note: 'Python, Ruby, SQL columns' },
      { style: 'SCREAMING_SNAKE', value: toScreamingSnakeCase(words), note: 'Constants, env vars' },
    ];
    if (isBool) {
      results.unshift({ style: 'boolean camelCase', value: toCamelCase(boolWords), note: 'boolean flag (is/has prefix)' });
    }
    return results;
  }

  if (kind === 'function') {
    const verbMap: Record<string, string> = {
      get: 'get', fetch: 'fetch', load: 'load', create: 'create', make: 'make',
      build: 'build', set: 'set', update: 'update', save: 'save', delete: 'delete',
      remove: 'remove', add: 'add', push: 'push', check: 'check', validate: 'validate',
      parse: 'parse', format: 'format', convert: 'convert', transform: 'transform',
      handle: 'handle', process: 'process', calculate: 'calc', compute: 'calc',
      find: 'find', search: 'search', filter: 'filter', sort: 'sort',
      send: 'send', emit: 'emit', dispatch: 'dispatch', trigger: 'trigger',
      init: 'init', initialize: 'init', start: 'start', stop: 'stop', reset: 'reset',
    };
    let verb = '';
    for (const tok of tokens) {
      if (verbMap[tok]) { verb = verbMap[tok]; break; }
    }
    const nonVerbWords = verb ? words.filter(w => w !== verb) : words;
    const fnWords = verb ? [verb, ...nonVerbWords] : words;

    return [
      { style: 'camelCase', value: toCamelCase(fnWords), note: 'JS/TS function' },
      { style: 'snake_case', value: toSnakeCase(fnWords), note: 'Python function' },
      isBool
        ? { style: 'boolean camelCase', value: toCamelCase(boolWords), note: 'boolean predicate (is/has/can)' }
        : { style: 'arrow const', value: `const ${toCamelCase(fnWords)} = () => {}`, note: 'JS arrow function' },
    ];
  }

  if (kind === 'constant') {
    return [
      { style: 'SCREAMING_SNAKE', value: toScreamingSnakeCase(words), note: 'JS/TS const, env vars, config' },
      { style: 'camelCase', value: toCamelCase(words), note: 'camelCase alternative' },
      { style: 'PascalCase', value: toPascalCase(words), note: 'named export / module constant' },
    ];
  }

  if (kind === 'class') {
    return [
      { style: 'PascalCase', value: toPascalCase(words), note: 'JS/TS/Java/C# class' },
      { style: 'snake_case', value: toSnakeCase(words), note: 'Python class (rare, typically PascalCase)' },
      { style: 'camelCase', value: toCamelCase(words), note: 'rare — avoid for classes' },
    ];
  }

  if (kind === 'css-class') {
    return [
      { style: 'kebab-case', value: toKebabCase(words), note: 'CSS class (BEM block)' },
      { style: 'BEM element', value: `${toKebabCase(words.slice(0, 1))}__${toKebabCase(words.slice(1))}`, note: 'BEM element syntax' },
      { style: 'camelCase', value: toCamelCase(words), note: 'CSS Modules / Tailwind preset' },
    ];
  }

  return [];
}

const KIND_OPTIONS: Array<{ value: Kind; label: string }> = [
  { value: 'variable', label: 'Variable / prop' },
  { value: 'function', label: 'Function / method' },
  { value: 'constant', label: 'Constant / config' },
  { value: 'class', label: 'Class / type' },
  { value: 'css-class', label: 'CSS class / selector' },
];

export default function AiVariableNamer() {
  const [desc, setDesc] = useState('');
  const [kind, setKind] = useState<Kind>('variable');
  const [names, setNames] = useState<Array<{ style: string; value: string; note: string }>>([]);
  const [copied, setCopied] = useState<string | null>(null);

  const generate = () => setNames(generateNames(desc, kind));

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div class="space-y-5">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">
          Describe what this identifier represents
        </label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors resize-none h-20"
          placeholder={'Examples:\n• "stores the current user authentication token"\n• "checks if the user is logged in"\n• "fetches all active products from the database"'}
          value={desc}
          onInput={e => { setDesc((e.target as HTMLTextAreaElement).value); setNames([]); }}
        />
      </div>

      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Identifier type</label>
        <div class="flex flex-wrap gap-2">
          {KIND_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => { setKind(opt.value); setNames([]); }}
              class={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${kind === opt.value ? 'border-primary text-primary bg-primary/10' : 'border-border text-text-muted hover:border-primary/50'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        disabled={!desc.trim()}
        class="w-full py-3 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Generate Names
      </button>

      {names.length > 0 && (
        <div class="space-y-2">
          <p class="text-sm font-medium text-text-muted">Suggestions</p>
          {names.map((n, i) => (
            <div key={i} class="flex items-center gap-3 p-3 rounded-lg bg-bg-card border border-border">
              <div class="flex-1 min-w-0">
                <code class="text-sm font-mono text-primary block truncate">{n.value}</code>
                <div class="flex items-center gap-2 mt-0.5">
                  <span class="text-xs text-text-muted font-semibold">{n.style}</span>
                  <span class="text-xs text-text-muted">— {n.note}</span>
                </div>
              </div>
              <button
                onClick={() => copy(n.value, String(i))}
                class="shrink-0 text-xs text-primary hover:underline"
              >
                {copied === String(i) ? 'Copied!' : 'Copy'}
              </button>
            </div>
          ))}
        </div>
      )}

      <div class="border-t border-border pt-4 text-xs text-text-muted space-y-1">
        <p>Tip: Use descriptive names over short abbreviations. Code is read far more than it's written.</p>
        <p>
          <a href="/tools/ai-commit-generator" class="text-primary hover:underline">
            AI Commit Generator →
          </a>
          {' · '}
          <a href="/tools/ai-jsdoc-generator" class="text-primary hover:underline">
            JSDoc Generator →
          </a>
        </p>
      </div>
    </div>
  );
}
