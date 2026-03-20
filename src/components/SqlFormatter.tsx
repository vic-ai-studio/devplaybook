import { useState } from 'preact/hooks';

// SQL keywords to uppercase and identify line breaks
const KEYWORDS_NEWLINE = ['SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION', 'UNION ALL', 'INTERSECT', 'EXCEPT', 'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'ALTER TABLE', 'DROP TABLE', 'WITH'];
const KEYWORDS_INLINE = ['AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'EXISTS', 'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'DISTINCT', 'ALL', 'ANY'];

function formatSql(sql: string, indent: number = 2): string {
  if (!sql.trim()) return '';

  // Tokenize: preserve strings and comments
  const tokens: string[] = [];
  let i = 0;
  const src = sql;

  while (i < src.length) {
    // Single-quoted string
    if (src[i] === "'") {
      let j = i + 1;
      while (j < src.length && (src[j] !== "'" || src[j - 1] === '\\')) j++;
      tokens.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    // Double-quoted identifier
    if (src[i] === '"') {
      let j = i + 1;
      while (j < src.length && src[j] !== '"') j++;
      tokens.push(src.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    // Line comment
    if (src[i] === '-' && src[i + 1] === '-') {
      let j = i + 2;
      while (j < src.length && src[j] !== '\n') j++;
      tokens.push(src.slice(i, j));
      i = j;
      continue;
    }
    // Block comment
    if (src[i] === '/' && src[i + 1] === '*') {
      let j = i + 2;
      while (j < src.length - 1 && !(src[j] === '*' && src[j + 1] === '/')) j++;
      tokens.push(src.slice(i, j + 2));
      i = j + 2;
      continue;
    }
    // Comma
    if (src[i] === ',') { tokens.push(','); i++; continue; }
    // Paren
    if (src[i] === '(' || src[i] === ')') { tokens.push(src[i]); i++; continue; }
    // Semicolon
    if (src[i] === ';') { tokens.push(';'); i++; continue; }
    // Whitespace (collapse)
    if (/\s/.test(src[i])) {
      while (i < src.length && /\s/.test(src[i])) i++;
      tokens.push(' ');
      continue;
    }
    // Word token
    let j = i;
    while (j < src.length && !/[\s,();'"\/\-]/.test(src[j])) j++;
    tokens.push(src.slice(i, j));
    i = j;
  }

  const pad = ' '.repeat(indent);
  let result = '';
  let depth = 0;
  let lineStart = true;

  for (let ti = 0; ti < tokens.length; ti++) {
    const t = tokens[ti];
    if (t === ' ') continue;

    const upper = t.toUpperCase();

    if (t === ')') {
      depth = Math.max(0, depth - 1);
      result += '\n' + pad.repeat(depth) + ')';
      lineStart = false;
      continue;
    }

    if (t === '(') {
      result += '(';
      depth++;
      lineStart = false;
      continue;
    }

    if (t === ',') {
      result += ',\n' + pad.repeat(depth);
      lineStart = true;
      continue;
    }

    if (t === ';') {
      result += ';\n';
      lineStart = true;
      continue;
    }

    // Check for multi-word keywords like "GROUP BY"
    const twoWord = t.toUpperCase() + ' ' + (tokens[ti + 1] || '').toUpperCase();
    const threeWord = twoWord + ' ' + (tokens[ti + 2] || '').toUpperCase();

    let matched = '';
    if (KEYWORDS_NEWLINE.includes(threeWord)) { matched = threeWord; ti += 2; }
    else if (KEYWORDS_NEWLINE.includes(twoWord)) { matched = twoWord; ti += 1; }
    else if (KEYWORDS_NEWLINE.includes(upper)) { matched = upper; }

    if (matched) {
      result += (lineStart ? '' : '\n') + pad.repeat(depth) + matched + ' ';
      lineStart = false;
      continue;
    }

    if (KEYWORDS_INLINE.includes(upper)) {
      result += upper + ' ';
      lineStart = false;
      continue;
    }

    result += (lineStart ? pad.repeat(depth) : '') + t + ' ';
    lineStart = false;
  }

  return result.replace(/\s+$/gm, '').trim();
}

function minifySql(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function SqlFormatter() {
  const [input, setInput] = useState('');
  const [indentSize, setIndentSize] = useState(2);
  const [mode, setMode] = useState<'format' | 'minify'>('format');
  const [copied, setCopied] = useState(false);

  const output = input ? (mode === 'format' ? formatSql(input, indentSize) : minifySql(input)) : '';

  const copy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

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
          <label class="block text-sm font-medium text-text-muted mb-2">Input SQL</label>
          <textarea
            class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your SQL here..."
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
            <label class="block text-sm font-medium text-text-muted">Formatted SQL</label>
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
            class="w-full h-64 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none"
            placeholder="Formatted SQL appears here..."
            value={output}
          />
        </div>
      </div>

      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-1">Features</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Formats SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER statements</li>
            <li>Preserves quoted strings and comments</li>
            <li>Uppercase SQL keywords automatically</li>
            <li>Minify removes whitespace and comments for compact queries</li>
          </ul>
        </div>
      )}
    </div>
  );
}
