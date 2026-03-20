import { useState } from 'preact/hooks';

// JS/TS beautifier — bracket-based indentation, handles strings, template literals, comments
function formatJs(code: string, indentSize: number): string {
  if (!code.trim()) return '';
  const indent = ' '.repeat(indentSize);

  // Tokenize into meaningful chunks
  type Token = { type: 'brace_open' | 'brace_close' | 'bracket_open' | 'bracket_close' | 'paren_open' | 'paren_close' | 'semicolon' | 'newline' | 'comma' | 'string' | 'comment' | 'other'; value: string };

  const tokens: Token[] = [];
  let i = 0;
  const src = code;

  while (i < src.length) {
    const ch = src[i];

    // Line comment
    if (ch === '/' && src[i + 1] === '/') {
      let j = i + 2;
      while (j < src.length && src[j] !== '\n') j++;
      tokens.push({ type: 'comment', value: src.slice(i, j) });
      i = j;
      continue;
    }

    // Block comment
    if (ch === '/' && src[i + 1] === '*') {
      const end = src.indexOf('*/', i + 2);
      const end2 = end === -1 ? src.length : end + 2;
      tokens.push({ type: 'comment', value: src.slice(i, end2) });
      i = end2;
      continue;
    }

    // Template literal
    if (ch === '`') {
      let j = i + 1;
      while (j < src.length && src[j] !== '`') {
        if (src[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    // String
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === '\\') j++;
        j++;
      }
      tokens.push({ type: 'string', value: src.slice(i, j + 1) });
      i = j + 1;
      continue;
    }

    if (ch === '{') { tokens.push({ type: 'brace_open', value: '{' }); i++; continue; }
    if (ch === '}') { tokens.push({ type: 'brace_close', value: '}' }); i++; continue; }
    if (ch === '[') { tokens.push({ type: 'bracket_open', value: '[' }); i++; continue; }
    if (ch === ']') { tokens.push({ type: 'bracket_close', value: ']' }); i++; continue; }
    if (ch === '(') { tokens.push({ type: 'paren_open', value: '(' }); i++; continue; }
    if (ch === ')') { tokens.push({ type: 'paren_close', value: ')' }); i++; continue; }
    if (ch === ';') { tokens.push({ type: 'semicolon', value: ';' }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma', value: ',' }); i++; continue; }
    if (ch === '\n' || ch === '\r') { tokens.push({ type: 'newline', value: '\n' }); while (i < src.length && (src[i] === '\n' || src[i] === '\r')) i++; continue; }
    if (ch === ' ' || ch === '\t') { i++; continue; } // skip whitespace, rebuild later

    // Other characters (word, operator, etc.)
    let j = i + 1;
    while (j < src.length && src[j] !== '{' && src[j] !== '}' && src[j] !== '[' && src[j] !== ']' && src[j] !== '(' && src[j] !== ')' && src[j] !== ';' && src[j] !== ',' && src[j] !== '\n' && src[j] !== '\r' && src[j] !== '"' && src[j] !== "'" && src[j] !== '`' && !(src[j] === '/' && (src[j + 1] === '/' || src[j + 1] === '*'))) j++;
    const word = src.slice(i, j).trim();
    if (word) tokens.push({ type: 'other', value: word });
    i = j;
  }

  // Now reconstruct with indentation
  let level = 0;
  const lines: string[] = [];
  let currentLine = '';

  const flush = () => {
    const t = currentLine.trim();
    if (t) lines.push(indent.repeat(level) + t);
    currentLine = '';
  };

  for (let k = 0; k < tokens.length; k++) {
    const tok = tokens[k];
    const next = tokens[k + 1];

    if (tok.type === 'brace_open') {
      currentLine += ' {';
      flush();
      level++;
    } else if (tok.type === 'brace_close') {
      flush();
      level = Math.max(0, level - 1);
      currentLine = indent.repeat(level) + '}';
      // Check if next token is else/catch/finally
      if (next && next.type === 'other' && /^(else|catch|finally)/.test(next.value)) {
        currentLine += ' ';
      } else {
        flush();
      }
    } else if (tok.type === 'bracket_open') {
      currentLine += '[';
    } else if (tok.type === 'bracket_close') {
      currentLine += ']';
    } else if (tok.type === 'paren_open') {
      currentLine += '(';
    } else if (tok.type === 'paren_close') {
      currentLine += ')';
    } else if (tok.type === 'semicolon') {
      currentLine += ';';
      flush();
    } else if (tok.type === 'comma') {
      currentLine += ', ';
    } else if (tok.type === 'newline') {
      flush();
    } else if (tok.type === 'comment') {
      flush();
      lines.push(indent.repeat(level) + tok.value.trim());
    } else if (tok.type === 'string') {
      currentLine += tok.value;
    } else {
      // 'other'
      if (currentLine.length > 0 && !currentLine.endsWith(' ') && !currentLine.endsWith('(') && !currentLine.endsWith('[')) {
        currentLine += ' ';
      }
      currentLine += tok.value;
    }
  }
  flush();

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function minifyJs(code: string): string {
  // Remove comments, collapse whitespace
  return code
    .replace(/\/\/[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*([{}[\]();,=+\-*/<>!&|?:])\s*/g, '$1')
    .replace(/;\s*}/g, '}')
    .trim();
}

export default function JsFormatter() {
  const [input, setInput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [copied, setCopied] = useState(false);

  const output = input ? (mode === 'format' ? formatJs(input, indentSize) : minifyJs(input)) : '';

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const savings = input && mode === 'minify'
    ? Math.round((1 - output.length / input.length) * 100)
    : null;

  return (
    <div class="space-y-4">
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex gap-2">
          {(['format', 'minify'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
            >
              {m === 'format' ? 'Format / Beautify' : 'Minify'}
            </button>
          ))}
        </div>
        {mode === 'format' && (
          <div class="flex items-center gap-2 ml-2">
            <label class="text-sm text-text-muted">Indent:</label>
            {[2, 4].map((n) => (
              <button
                key={n}
                onClick={() => setIndentSize(n)}
                class={`px-3 py-1.5 rounded text-sm transition-colors ${indentSize === n ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
              >
                {n}
              </button>
            ))}
          </div>
        )}
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Input JavaScript</label>
          <textarea
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your JavaScript here..."
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
            <label class="block text-sm font-medium text-text-muted">
              {mode === 'format' ? 'Formatted JS' : 'Minified JS'}
              {savings !== null && savings > 0 && (
                <span class="ml-2 text-xs text-green-400">−{savings}% smaller</span>
              )}
            </label>
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
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            placeholder="Output appears here..."
            value={output}
          />
        </div>
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-1">Features</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Auto-indent based on braces, brackets, and parentheses</li>
            <li>Preserves strings and template literals intact</li>
            <li>Removes comments when minifying</li>
            <li>Works with JavaScript, TypeScript, JSX, and JSON-like code</li>
          </ul>
        </div>
      )}
    </div>
  );
}
