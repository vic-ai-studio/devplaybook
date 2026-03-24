import { useState } from 'preact/hooks';

type IndentSize = 2 | 4 | 'tab';

// Simple JSONPath evaluator — supports $, .key, [0], [*], .*
function evalJsonPath(data: unknown, path: string): unknown {
  if (!path.trim() || path.trim() === '$') return data;

  const src = path.trim().startsWith('$') ? path.trim().slice(1) : path.trim();

  // Tokenise
  const tokens: string[] = [];
  let i = 0;
  while (i < src.length) {
    if (src[i] === '.') {
      i++;
      if (i < src.length && src[i] === '.') i++; // skip recursive-descent dot
      const start = i;
      while (i < src.length && src[i] !== '.' && src[i] !== '[') i++;
      const tok = src.slice(start, i).trim();
      if (tok) tokens.push(tok);
    } else if (src[i] === '[') {
      i++;
      const start = i;
      while (i < src.length && src[i] !== ']') i++;
      const inner = src.slice(start, i).trim();
      i++; // skip ]
      if (inner === '*') tokens.push('*');
      else tokens.push(inner.replace(/^['"]|['"]$/g, ''));
    } else {
      i++;
    }
  }

  function evaluate(node: unknown, toks: string[]): unknown {
    if (toks.length === 0) return node;
    const [head, ...rest] = toks;
    if (node === null || node === undefined) return undefined;

    if (head === '*') {
      const items = Array.isArray(node) ? node : (typeof node === 'object' ? Object.values(node as object) : []);
      return rest.length === 0 ? items : (items as unknown[]).map(v => evaluate(v, rest)).filter(v => v !== undefined);
    }

    const idx = Number(head);
    if (!isNaN(idx) && Array.isArray(node)) return evaluate((node as unknown[])[idx], rest);
    if (typeof node === 'object') return evaluate((node as Record<string, unknown>)[head], rest);
    return undefined;
  }

  return evaluate(data, tokens);
}

export default function JsonFormatterPro() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [indent, setIndent] = useState<IndentSize>(2);
  const [copied, setCopied] = useState(false);
  const [jsonPath, setJsonPath] = useState('');
  const [pathResult, setPathResult] = useState('');
  const [pathError, setPathError] = useState('');
  const [pathCopied, setPathCopied] = useState(false);

  const parsedRef = { current: null as unknown };

  const format = (value: string, ind: IndentSize) => {
    const src = value.trim();
    if (!src) { setOutput(''); setError(''); return null; }
    try {
      const parsed = JSON.parse(src);
      parsedRef.current = parsed;
      const space = ind === 'tab' ? '\t' : ind;
      setOutput(JSON.stringify(parsed, null, space));
      setError('');
      return parsed;
    } catch (e: unknown) {
      setError((e as Error).message);
      setOutput('');
      return null;
    }
  };

  const runJsonPath = (src: string, path: string, parsed: unknown) => {
    if (!path.trim() || parsed === null) { setPathResult(''); setPathError(''); return; }
    try {
      const result = evalJsonPath(parsed, path);
      if (result === undefined) {
        setPathError('No match — path returned undefined');
        setPathResult('');
      } else {
        setPathResult(JSON.stringify(result, null, 2));
        setPathError('');
      }
    } catch (e: unknown) {
      setPathError((e as Error).message);
      setPathResult('');
    }
  };

  const handleInput = (val: string) => {
    setInput(val);
    try {
      const parsed = JSON.parse(val.trim());
      const space = indent === 'tab' ? '\t' : indent;
      setOutput(JSON.stringify(parsed, null, space));
      setError('');
      if (jsonPath) runJsonPath(val, jsonPath, parsed);
    } catch (e: unknown) {
      if (val.trim()) {
        setError((e as Error).message);
        setOutput('');
      } else {
        setOutput(''); setError('');
      }
    }
  };

  const handleIndent = (ind: IndentSize) => {
    setIndent(ind);
    format(input, ind);
  };

  const handlePathInput = (path: string) => {
    setJsonPath(path);
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input.trim());
      runJsonPath(input, path, parsed);
    } catch {}
  };

  const minify = () => {
    if (!input.trim()) return;
    try {
      const parsed = JSON.parse(input.trim());
      setOutput(JSON.stringify(parsed));
      setError('');
    } catch (e: unknown) { setError((e as Error).message); }
  };

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text).then(() => {
      setter(true);
      setTimeout(() => setter(false), 1500);
    });
  };

  const clear = () => { setInput(''); setOutput(''); setError(''); setPathResult(''); setPathError(''); setJsonPath(''); };

  const loadSample = () => {
    const sample = `{"store":{"name":"DevPlaybook","version":2,"books":[{"title":"Clean Code","author":"Martin","price":35},{"title":"The Pragmatic Programmer","author":"Hunt","price":42}],"tags":["tools","dev","open-source"]}}`;
    setInput(sample);
    try {
      const parsed = JSON.parse(sample);
      const space = indent === 'tab' ? '\t' : indent;
      setOutput(JSON.stringify(parsed, null, space));
      setError('');
      if (jsonPath) runJsonPath(sample, jsonPath, parsed);
    } catch {}
  };

  return (
    <div class="space-y-4">
      {/* Controls */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-2">
          <label class="text-sm text-text-muted">Indent:</label>
          {(['2', '4', 'tab'] as string[]).map(v => {
            const val = v === '2' ? 2 : v === '4' ? 4 : 'tab' as IndentSize;
            return (
              <button
                key={v}
                onClick={() => handleIndent(val)}
                class={`px-3 py-1 text-xs rounded border transition-colors ${indent === val ? 'bg-primary text-bg border-primary' : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'}`}
              >
                {v === 'tab' ? 'Tab' : `${v} spaces`}
              </button>
            );
          })}
        </div>
        <div class="flex gap-2 ml-auto">
          <button onClick={loadSample} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Sample</button>
          <button onClick={minify} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Minify</button>
          <button onClick={clear} class="px-3 py-1 text-xs rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Input JSON</label>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors"
          placeholder='Paste your JSON here... {"key": "value"}'
          value={input}
          onInput={(e) => handleInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <div class="flex justify-between mt-1">
          <span class="text-xs text-text-muted">{input.length} chars</span>
          {error && <span class="text-xs text-red-400 max-w-sm truncate">⚠ {error}</span>}
        </div>
      </div>

      {/* Formatted Output */}
      {output && (
        <div>
          <div class="flex justify-between items-center mb-2">
            <label class="block text-sm font-medium text-text-muted">Formatted JSON</label>
            <button
              onClick={() => copy(output, setCopied)}
              class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="w-full bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text overflow-auto max-h-80 whitespace-pre">{output}</pre>
          <div class="mt-1 text-xs text-text-muted">{output.split('\n').length} lines · {output.length} chars</div>
        </div>
      )}

      {/* JSONPath Query */}
      <div class="border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center gap-2">
          <h3 class="text-sm font-semibold text-text">JSONPath Query</h3>
          <span class="text-xs bg-accent/10 text-accent border border-accent/20 px-2 py-0.5 rounded-full">Pro Feature</span>
        </div>
        <p class="text-xs text-text-muted">Query your JSON with JSONPath expressions. Examples: <code class="font-mono bg-bg-card px-1 rounded">$.store.name</code> · <code class="font-mono bg-bg-card px-1 rounded">$.store.books[0].title</code> · <code class="font-mono bg-bg-card px-1 rounded">$.store.books[*].price</code></p>
        <div class="flex gap-2">
          <input
            type="text"
            class="flex-1 bg-bg-card border border-border rounded-lg px-3 py-2 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder="$.store.books[*].title"
            value={jsonPath}
            onInput={(e) => handlePathInput((e.target as HTMLInputElement).value)}
            spellcheck={false}
          />
        </div>
        {pathError && <p class="text-xs text-red-400">⚠ {pathError}</p>}
        {pathResult && (
          <div>
            <div class="flex justify-between items-center mb-1">
              <label class="text-xs text-text-muted">Query result</label>
              <button onClick={() => copy(pathResult, setPathCopied)} class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors">
                {pathCopied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="w-full bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text overflow-auto max-h-48 whitespace-pre">{pathResult}</pre>
          </div>
        )}
        {!pathResult && !pathError && (
          <p class="text-xs text-text-muted italic">Load JSON above, then type a JSONPath expression to query it.</p>
        )}
      </div>

      {!input && (
        <div class="text-center py-8 text-text-muted text-sm">
          Paste JSON above to format, validate, and query with JSONPath.
          <br /><span class="text-xs">All processing happens in your browser — nothing is sent to any server.</span>
        </div>
      )}
    </div>
  );
}
