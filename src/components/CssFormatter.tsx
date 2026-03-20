import { useState } from 'preact/hooks';

function formatCss(css: string, indentSize: number): string {
  if (!css.trim()) return '';
  const indent = ' '.repeat(indentSize);

  // Tokenize: preserve strings and comments
  const tokens: string[] = [];
  let i = 0;
  while (i < css.length) {
    if (css[i] === '/' && css[i + 1] === '*') {
      const end = css.indexOf('*/', i + 2);
      tokens.push(css.slice(i, end === -1 ? css.length : end + 2));
      i = end === -1 ? css.length : end + 2;
    } else if (css[i] === '"' || css[i] === "'") {
      const q = css[i];
      let j = i + 1;
      while (j < css.length && css[j] !== q) { if (css[j] === '\\') j++; j++; }
      tokens.push(css.slice(i, j + 1));
      i = j + 1;
    } else if (css[i] === '{') { tokens.push('{'); i++; }
    else if (css[i] === '}') { tokens.push('}'); i++; }
    else if (css[i] === ';') { tokens.push(';'); i++; }
    else {
      let j = i;
      while (j < css.length && css[j] !== '{' && css[j] !== '}' && css[j] !== ';' && css[j] !== '"' && css[j] !== "'" && !(css[j] === '/' && css[j + 1] === '*')) j++;
      const chunk = css.slice(i, j);
      if (chunk.trim()) tokens.push(chunk.trim());
      i = j;
    }
  }

  let level = 0;
  const lines: string[] = [];

  for (let k = 0; k < tokens.length; k++) {
    const t = tokens[k];
    if (t === '{') {
      const prev = lines[lines.length - 1];
      if (prev !== undefined && !prev.endsWith('{')) {
        lines[lines.length - 1] = (lines[lines.length - 1] || '').trimEnd() + ' {';
      } else {
        lines.push(indent.repeat(level) + '{');
      }
      level++;
    } else if (t === '}') {
      level = Math.max(0, level - 1);
      lines.push(indent.repeat(level) + '}');
      lines.push(''); // blank line after block
    } else if (t === ';') {
      if (lines.length > 0) {
        lines[lines.length - 1] = lines[lines.length - 1].trimEnd() + ';';
      }
    } else if (t.startsWith('/*')) {
      lines.push(indent.repeat(level) + t.trim());
    } else {
      // Check if this token contains ':' (property: value) or is a selector
      const colonIdx = t.indexOf(':');
      if (level > 0 && colonIdx > 0 && !t.trim().startsWith('@') && !t.trim().endsWith(',')) {
        // It's a property declaration
        const prop = t.slice(0, colonIdx).trim();
        const val = t.slice(colonIdx + 1).trim();
        if (prop && val) {
          lines.push(indent.repeat(level) + prop + ': ' + val);
        } else {
          lines.push(indent.repeat(level) + t);
        }
      } else {
        lines.push(indent.repeat(level) + t);
      }
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function minifyCss(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .replace(/\s*{\s*/g, '{')
    .replace(/\s*}\s*/g, '}')
    .replace(/\s*:\s*/g, ':')
    .replace(/\s*;\s*/g, ';')
    .replace(/\s*,\s*/g, ',')
    .replace(/;}/g, '}')
    .trim();
}

export default function CssFormatter() {
  const [input, setInput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [copied, setCopied] = useState(false);

  const output = input ? (mode === 'format' ? formatCss(input, indentSize) : minifyCss(input)) : '';

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
          <label class="block text-sm font-medium text-text-muted mb-2">Input CSS</label>
          <textarea
            class="w-full h-72 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your CSS here..."
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
              {mode === 'format' ? 'Formatted CSS' : 'Minified CSS'}
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
            <li>Format CSS with consistent indentation and spacing</li>
            <li>Handles nested rules, @media, @keyframes, and @supports</li>
            <li>Minify removes whitespace and comments to reduce file size</li>
            <li>Shows compression savings percentage</li>
          </ul>
        </div>
      )}
    </div>
  );
}
