import { useState } from 'preact/hooks';

const KEYWORDS_NEWLINE = [
  'SELECT', 'FROM', 'WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN',
  'ON', 'GROUP BY', 'ORDER BY', 'HAVING', 'LIMIT', 'OFFSET', 'UNION',
  'INSERT INTO', 'VALUES', 'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE',
  'ALTER TABLE', 'WITH',
];

const KEYWORDS_INLINE = [
  'AND', 'OR', 'NOT', 'IN', 'IS', 'NULL', 'LIKE', 'BETWEEN', 'EXISTS',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END', 'AS', 'DISTINCT', 'ALL', 'ANY',
];

function tokenize(sql: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < sql.length) {
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length && (sql[j] !== "'" || sql[j - 1] === '\\')) j++;
      tokens.push(sql.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '"') j++;
      tokens.push(sql.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (sql[i] === '`') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '`') j++;
      tokens.push(sql.slice(i, j + 1));
      i = j + 1;
      continue;
    }
    if (sql[i] === '-' && sql[i + 1] === '-') {
      let j = i + 2;
      while (j < sql.length && sql[j] !== '\n') j++;
      tokens.push(sql.slice(i, j));
      i = j;
      continue;
    }
    if (sql[i] === '/' && sql[i + 1] === '*') {
      let j = i + 2;
      while (j < sql.length - 1 && !(sql[j] === '*' && sql[j + 1] === '/')) j++;
      tokens.push(sql.slice(i, j + 2));
      i = j + 2;
      continue;
    }
    if (sql[i] === ',') { tokens.push(','); i++; continue; }
    if (sql[i] === '(' || sql[i] === ')') { tokens.push(sql[i]); i++; continue; }
    if (sql[i] === ';') { tokens.push(';'); i++; continue; }
    if (/\s/.test(sql[i])) {
      while (i < sql.length && /\s/.test(sql[i])) i++;
      tokens.push(' ');
      continue;
    }
    let j = i;
    while (j < sql.length && !/[\s,();'"\/\-`]/.test(sql[j])) j++;
    if (j === i) { tokens.push(sql[i]); i++; continue; }
    tokens.push(sql.slice(i, j));
    i = j;
  }

  return tokens;
}

function formatSql(sql: string, indentSize: number, keywordCase: 'upper' | 'lower'): string {
  if (!sql.trim()) return '';

  const tokens = tokenize(sql);
  const pad = ' '.repeat(indentSize);
  let result = '';
  let depth = 0;
  let lineStart = true;

  const applyCase = (kw: string) => keywordCase === 'upper' ? kw.toUpperCase() : kw.toLowerCase();

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

    const twoWord = upper + ' ' + (tokens[ti + 1] || '').toUpperCase();
    const threeWord = twoWord + ' ' + (tokens[ti + 2] || '').toUpperCase();

    let matched = '';
    if (KEYWORDS_NEWLINE.includes(threeWord)) { matched = threeWord; ti += 2; }
    else if (KEYWORDS_NEWLINE.includes(twoWord)) { matched = twoWord; ti += 1; }
    else if (KEYWORDS_NEWLINE.includes(upper)) { matched = upper; }

    if (matched) {
      result += (lineStart ? '' : '\n') + pad.repeat(depth) + applyCase(matched) + ' ';
      lineStart = false;
      continue;
    }

    if (KEYWORDS_INLINE.includes(upper)) {
      result += applyCase(upper) + ' ';
      lineStart = false;
      continue;
    }

    result += (lineStart ? pad.repeat(depth) : '') + t + ' ';
    lineStart = false;
  }

  return result.replace(/[ \t]+$/gm, '').trim();
}

function wrapLines(text: string, width: number): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.length <= width) return line;
      const parts: string[] = [];
      let remaining = line;
      while (remaining.length > width) {
        let breakAt = remaining.lastIndexOf(' ', width);
        if (breakAt <= 0) breakAt = width;
        parts.push(remaining.slice(0, breakAt));
        remaining = remaining.slice(breakAt).trimStart();
      }
      parts.push(remaining);
      return parts.join('\n  ');
    })
    .join('\n');
}

export default function SqlQueryFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [indentSize, setIndentSize] = useState<2 | 4>(2);
  const [keywordCase, setKeywordCase] = useState<'upper' | 'lower'>('upper');
  const [lineWrap, setLineWrap] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleFormat = () => {
    if (!input.trim()) return;
    let result = formatSql(input, indentSize, keywordCase);
    if (lineWrap) result = wrapLines(result, 80);
    setOutput(result);
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setCopied(false);
  };

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-5">
      {/* Options bar */}
      <div class="flex flex-wrap gap-x-6 gap-y-3 items-center bg-bg-card border border-border rounded-lg px-4 py-3">
        {/* Indent size */}
        <div class="flex items-center gap-2">
          <span class="text-sm text-text-muted font-medium">Indent:</span>
          {([2, 4] as const).map((n) => (
            <label key={n} class="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="indent"
                value={String(n)}
                checked={indentSize === n}
                onChange={() => setIndentSize(n)}
                class="accent-primary"
              />
              <span class="text-sm text-text">{n} spaces</span>
            </label>
          ))}
        </div>

        {/* Keyword case */}
        <div class="flex items-center gap-2">
          <span class="text-sm text-text-muted font-medium">Keywords:</span>
          {(['upper', 'lower'] as const).map((c) => (
            <label key={c} class="flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name="kwcase"
                value={c}
                checked={keywordCase === c}
                onChange={() => setKeywordCase(c)}
                class="accent-primary"
              />
              <span class="text-sm text-text">{c === 'upper' ? 'UPPERCASE' : 'lowercase'}</span>
            </label>
          ))}
        </div>

        {/* Line wrap */}
        <label class="flex items-center gap-2 cursor-pointer">
          <div
            role="checkbox"
            aria-checked={lineWrap}
            tabIndex={0}
            onClick={() => setLineWrap(!lineWrap)}
            onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setLineWrap(!lineWrap); }}
            class={`relative w-9 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${lineWrap ? 'bg-primary' : 'bg-border'}`}
          >
            <span
              class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${lineWrap ? 'translate-x-4' : 'translate-x-0'}`}
            />
          </div>
          <span class="text-sm text-text">Line wrap (80 chars)</span>
        </label>
      </div>

      {/* Input area */}
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-sm font-medium text-text-muted">Input SQL</label>
          <div class="flex items-center gap-3">
            <span class="text-xs text-text-muted">{input.length} chars</span>
            <button
              onClick={handleClear}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          class="w-full h-48 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/50"
          placeholder="Paste your SQL query here..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Format button */}
      <button
        onClick={handleFormat}
        disabled={!input.trim()}
        class="bg-primary hover:bg-primary-dark text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Format SQL
      </button>

      {/* Output area */}
      <div>
        <div class="flex justify-between items-center mb-1.5">
          <label class="text-sm font-medium text-text-muted">Formatted SQL</label>
          <button
            onClick={handleCopy}
            disabled={!output}
            class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre
          class={`w-full min-h-48 bg-[#0d1117] border border-border rounded-lg p-4 font-mono text-sm text-[#e6edf3] overflow-x-auto whitespace-pre leading-relaxed ${!output ? 'text-[#6e7681]' : ''}`}
        >
          {output || 'Formatted SQL will appear here...'}
        </pre>
      </div>

      {/* Feature hints when empty */}
      {!input && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">Supported statements</p>
          <ul class="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>SELECT, FROM, WHERE, JOIN (LEFT / RIGHT / INNER), ON, GROUP BY, ORDER BY, HAVING</li>
            <li>INSERT INTO, VALUES, UPDATE, SET, DELETE FROM</li>
            <li>CREATE TABLE, ALTER TABLE, WITH (CTE)</li>
            <li>Preserves quoted strings, backtick identifiers, and -- / /* */ comments</li>
            <li>Configurable indent size and keyword case</li>
          </ul>
        </div>
      )}
    </div>
  );
}
