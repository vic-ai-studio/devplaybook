import { useState, useEffect, useMemo } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

type Dialect = 'standard' | 'mysql' | 'postgresql' | 'sqlite';
type IndentSize = '2' | '4' | 'tab';

interface FormatOptions {
  dialect: Dialect;
  indentSize: IndentSize;
}

// ── SQL Keywords ───────────────────────────────────────────────────────────────

const CLAUSE_KEYWORDS = [
  'SELECT DISTINCT',
  'SELECT',
  'FROM',
  'LEFT OUTER JOIN',
  'RIGHT OUTER JOIN',
  'FULL OUTER JOIN',
  'CROSS JOIN',
  'INNER JOIN',
  'LEFT JOIN',
  'RIGHT JOIN',
  'FULL JOIN',
  'JOIN',
  'ON',
  'WHERE',
  'GROUP BY',
  'HAVING',
  'ORDER BY',
  'LIMIT',
  'OFFSET',
  'UNION ALL',
  'UNION',
  'INTERSECT',
  'EXCEPT',
  'INSERT INTO',
  'INSERT',
  'VALUES',
  'UPDATE',
  'SET',
  'DELETE FROM',
  'DELETE',
  'CREATE TABLE',
  'CREATE INDEX',
  'CREATE VIEW',
  'CREATE',
  'ALTER TABLE',
  'ALTER',
  'DROP TABLE',
  'DROP',
  'TRUNCATE',
  'WITH',
  'RETURNING',
  'INTO',
];

// Keywords that are uppercased but do NOT trigger a new line
const INLINE_KEYWORDS = [
  'AS', 'AND', 'OR', 'NOT', 'IN', 'EXISTS', 'BETWEEN', 'LIKE', 'ILIKE',
  'IS NULL', 'IS NOT NULL', 'IS',
  'CASE', 'WHEN', 'THEN', 'ELSE', 'END',
  'DISTINCT', 'ALL', 'ANY', 'SOME',
  'CAST', 'OVER', 'PARTITION BY',
  'ASC', 'DESC', 'NULLS FIRST', 'NULLS LAST',
  'NULL', 'TRUE', 'FALSE',
  'PRIMARY KEY', 'FOREIGN KEY', 'REFERENCES', 'UNIQUE', 'NOT NULL', 'DEFAULT',
  'AUTO_INCREMENT', 'AUTOINCREMENT', 'SERIAL',
  'COUNT', 'SUM', 'AVG', 'MIN', 'MAX', 'COALESCE', 'NULLIF', 'GREATEST', 'LEAST',
  'CONCAT', 'LENGTH', 'SUBSTRING', 'TRIM', 'UPPER', 'LOWER', 'REPLACE',
  'NOW', 'CURRENT_TIMESTAMP', 'CURRENT_DATE', 'CURRENT_TIME',
  'DATE', 'DATETIME', 'TIMESTAMP', 'INTERVAL',
  'IF', 'IFNULL', 'ISNULL', 'NVL',
  'ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE',
  'EXTRACT', 'DATE_FORMAT', 'DATE_TRUNC', 'TO_DATE', 'TO_CHAR',
  'INNER', 'LEFT', 'RIGHT', 'FULL', 'OUTER', 'CROSS',
  'CONSTRAINT', 'INDEX', 'VIEW', 'TABLE', 'DATABASE', 'SCHEMA',
  'LIMIT', 'OFFSET',
  'BY',
];

// ── Indent helper ──────────────────────────────────────────────────────────────

function getIndentStr(size: IndentSize): string {
  if (size === 'tab') return '\t';
  return ' '.repeat(parseInt(size, 10));
}

// ── Comment extraction ─────────────────────────────────────────────────────────

interface Token {
  type: 'comment-line' | 'comment-block' | 'string' | 'code';
  value: string;
}

function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    // -- line comment
    if (sql[i] === '-' && sql[i + 1] === '-') {
      const end = sql.indexOf('\n', i);
      const val = end === -1 ? sql.slice(i) : sql.slice(i, end + 1);
      tokens.push({ type: 'comment-line', value: val });
      i += val.length;
      continue;
    }
    // /* block comment */
    if (sql[i] === '/' && sql[i + 1] === '*') {
      const end = sql.indexOf('*/', i + 2);
      const val = end === -1 ? sql.slice(i) : sql.slice(i, end + 2);
      tokens.push({ type: 'comment-block', value: val });
      i += val.length;
      continue;
    }
    // Single-quoted string
    if (sql[i] === "'") {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === "'" && sql[j + 1] === "'") { j += 2; continue; }
        if (sql[j] === "'") { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Double-quoted identifier
    if (sql[i] === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === '"' && sql[j + 1] === '"') { j += 2; continue; }
        if (sql[j] === '"') { j++; break; }
        j++;
      }
      tokens.push({ type: 'string', value: sql.slice(i, j) });
      i = j;
      continue;
    }
    // Backtick identifier (MySQL)
    if (sql[i] === '`') {
      let j = i + 1;
      while (j < sql.length && sql[j] !== '`') j++;
      tokens.push({ type: 'string', value: sql.slice(i, j + 1) });
      i = j + 1;
      continue;
    }
    // Accumulate code
    let j = i;
    while (j < sql.length) {
      const c = sql[j];
      if (c === '-' && sql[j + 1] === '-') break;
      if (c === '/' && sql[j + 1] === '*') break;
      if (c === "'" || c === '"' || c === '`') break;
      j++;
    }
    if (j > i) {
      tokens.push({ type: 'code', value: sql.slice(i, j) });
      i = j;
    }
  }
  return tokens;
}

// ── SQL keyword uppercase (applied only to code tokens) ────────────────────────

function upperKeywords(code: string): string {
  // All keywords: clause + inline, sorted longest first to avoid partial matches
  const allKws = [...CLAUSE_KEYWORDS, ...INLINE_KEYWORDS].sort((a, b) => b.length - a.length);
  let result = code;
  for (const kw of allKws) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    result = result.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), kw);
  }
  return result;
}

// ── Operator spacing ───────────────────────────────────────────────────────────

function normalizeOperators(code: string): string {
  return code
    // <>, >=, <=, !=  — keep as 2-char ops
    .replace(/\s*(<>)\s*/g, ' <> ')
    .replace(/\s*(!=)\s*/g, ' != ')
    .replace(/\s*(>=)\s*/g, ' >= ')
    .replace(/\s*(<=)\s*/g, ' <= ')
    // Single-char ops (not inside -> or =>)
    .replace(/\s*(?<!<|>|!|=)(=)(?!=)\s*/g, ' = ')
    .replace(/\s*(?<![<>!])(<)(?![>=])\s*/g, ' < ')
    .replace(/\s*(?<![<>!])(>)(?![=])\s*/g, ' > ');
}

// ── Core formatter ─────────────────────────────────────────────────────────────

function formatSql(sql: string, options: FormatOptions): string {
  if (!sql.trim()) return '';

  const indent = getIndentStr(options.indentSize);

  // Tokenize to preserve comments and strings
  const tokens = tokenize(sql);

  // Rebuild code sections with uppercased keywords + operator spacing,
  // while preserving comments and string literals verbatim
  const processedTokens = tokens.map(t => {
    if (t.type === 'code') {
      return { ...t, value: normalizeOperators(upperKeywords(t.value)) };
    }
    return t;
  });

  // Re-join for clause-level splitting
  // We'll place placeholder markers for comments/strings, then split on clauses
  const COMMENT_PLACEHOLDER = '\x00C\x00';
  const STRING_PLACEHOLDER = '\x00S\x00';
  const commentStore: string[] = [];
  const stringStore: string[] = [];

  let flatSql = '';
  for (const t of processedTokens) {
    if (t.type === 'comment-line' || t.type === 'comment-block') {
      commentStore.push(t.value);
      flatSql += COMMENT_PLACEHOLDER;
    } else if (t.type === 'string') {
      stringStore.push(t.value);
      flatSql += STRING_PLACEHOLDER;
    } else {
      flatSql += t.value;
    }
  }

  // Collapse whitespace in code (not in placeholders — they're single chars)
  flatSql = flatSql.replace(/[\r\n\t ]+/g, ' ').trim();

  // ── Clause splitting ────────────────────────────────────────────────────────

  // Build regex that matches clause keywords at word boundaries
  const clausePattern = CLAUSE_KEYWORDS
    .slice()
    .sort((a, b) => b.length - a.length)
    .map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
    .join('|');
  const clauseRe = new RegExp(`(?=\\b(?:${clausePattern})\\b)`, 'gi');

  // Split on clause boundaries, being careful inside parens (subqueries)
  // We do a depth-aware split
  function splitClauses(src: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let start = 0;

    // Pre-scan for clause positions
    const matches: number[] = [];
    const re = new RegExp(`\\b(?:${clausePattern})\\b`, 'gi');
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      // Count parens up to this position
      let d = 0;
      for (let k = 0; k < m.index; k++) {
        if (src[k] === '(') d++;
        else if (src[k] === ')') d--;
      }
      if (d === 0 && m.index > 0) matches.push(m.index);
    }

    // Split at top-level clause positions
    let prev = 0;
    for (const pos of matches) {
      const chunk = src.slice(prev, pos).trim();
      if (chunk) parts.push(chunk);
      prev = pos;
    }
    const last = src.slice(prev).trim();
    if (last) parts.push(last);
    return parts.length ? parts : [src];
  }

  const clauses = splitClauses(flatSql);

  // ── Format each clause ──────────────────────────────────────────────────────

  const lines: string[] = [];

  function formatClause(clause: string, baseDepth: number): string[] {
    const result: string[] = [];
    const indentPrefix = indent.repeat(baseDepth);

    // Determine which keyword this clause starts with
    const clauseKeyword = CLAUSE_KEYWORDS.find(k => {
      const re = new RegExp(`^${k.replace(/ /g, '\\s+')}\\b`, 'i');
      return re.test(clause.trim());
    });

    if (!clauseKeyword) {
      result.push(indentPrefix + clause.trim());
      return result;
    }

    const kwRe = new RegExp(`^(${clauseKeyword.replace(/ /g, '\\s+')})\\s*`, 'i');
    const afterKw = clause.replace(kwRe, '').trim();

    const kwUpper = clauseKeyword.toUpperCase();

    // Clauses where each comma-separated item goes on its own line
    const multiItemClauses = new Set(['SELECT', 'SELECT DISTINCT', 'GROUP BY', 'ORDER BY', 'SET', 'VALUES']);

    if (multiItemClauses.has(kwUpper) && afterKw) {
      result.push(indentPrefix + kwUpper);
      const items = splitTopLevelCommas(afterKw);
      items.forEach((item, idx) => {
        const prefix = idx === 0 ? `${indent.repeat(baseDepth + 1)}  ` : `${indent.repeat(baseDepth + 1)}, `;
        result.push(prefix + item.trim());
      });
    } else if ((kwUpper === 'WHERE' || kwUpper === 'HAVING' || kwUpper === 'ON') && afterKw) {
      result.push(indentPrefix + kwUpper);
      const conditions = splitTopLevelConditions(afterKw);
      conditions.forEach((cond, idx) => {
        const prefix = idx === 0 ? `${indent.repeat(baseDepth + 1)}  ` : `${indent.repeat(baseDepth + 1)}  `;
        result.push(prefix + cond.trim());
      });
    } else if (kwUpper === 'FROM' && afterKw) {
      result.push(indentPrefix + `${kwUpper} ${afterKw.trim()}`);
    } else if (afterKw) {
      result.push(indentPrefix + `${kwUpper} ${afterKw.trim()}`);
    } else {
      result.push(indentPrefix + kwUpper);
    }

    return result;
  }

  // Handle subquery formatting by detecting parens
  function formatParts(src: string, depth: number): string[] {
    const out: string[] = [];
    // Check if this clause contains a subquery at top level
    // We'll look for ( SELECT ... ) patterns
    const subRe = /\(\s*SELECT\b/i;
    if (!subRe.test(src)) {
      return formatClause(src, depth);
    }

    // Split around subqueries
    let i = 0;
    let parenDepth = 0;
    let subStart = -1;
    let lastEnd = 0;

    while (i < src.length) {
      if (src[i] === '(') {
        if (parenDepth === 0 && /select/i.test(src.slice(i + 1, i + 10))) {
          // Flush preceding text
          const pre = src.slice(lastEnd, i).trim();
          if (pre) {
            out.push(...formatClause(pre, depth));
          }
          subStart = i;
        }
        parenDepth++;
      } else if (src[i] === ')') {
        parenDepth--;
        if (parenDepth === 0 && subStart !== -1) {
          // Extract subquery content (without outer parens)
          const inner = src.slice(subStart + 1, i).trim();
          out.push(indent.repeat(depth) + '(');
          const subClauses = splitClauses(inner);
          for (const sc of subClauses) {
            out.push(...formatClause(sc, depth + 1));
          }
          out.push(indent.repeat(depth) + ')');
          lastEnd = i + 1;
          subStart = -1;
        }
      }
      i++;
    }
    // Remaining text after last subquery
    const remaining = src.slice(lastEnd).trim();
    if (remaining) {
      out.push(...formatClause(remaining, depth));
    }
    return out;
  }

  for (const clause of clauses) {
    lines.push(...formatParts(clause, 0));
  }

  // ── Restore placeholders ────────────────────────────────────────────────────

  let ci = 0;
  let si = 0;
  const restored = lines
    .join('\n')
    .replace(new RegExp(COMMENT_PLACEHOLDER.replace(/\x00/g, '\\x00'), 'g'), () => {
      const val = commentStore[ci++] ?? '';
      return val.endsWith('\n') ? val.trimEnd() : val;
    })
    .replace(new RegExp(STRING_PLACEHOLDER.replace(/\x00/g, '\\x00'), 'g'), () => stringStore[si++] ?? '');

  return restored.trim();
}

// ── Top-level comma split (respects parens) ────────────────────────────────────

function splitTopLevelCommas(src: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < src.length; i++) {
    if (src[i] === '(' || src[i] === '[') depth++;
    else if (src[i] === ')' || src[i] === ']') depth--;
    else if (src[i] === ',' && depth === 0) {
      parts.push(src.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(src.slice(start));
  return parts.filter(p => p.trim());
}

// ── Top-level AND/OR split ─────────────────────────────────────────────────────

function splitTopLevelConditions(src: string): string[] {
  // Split on top-level AND / OR (not inside parens)
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  const andOrRe = /\b(AND|OR)\b/gi;
  let m: RegExpExecArray | null;
  const positions: number[] = [];

  while ((m = andOrRe.exec(src)) !== null) {
    let d = 0;
    for (let k = 0; k < m.index; k++) {
      if (src[k] === '(') d++;
      else if (src[k] === ')') d--;
    }
    if (d === 0) positions.push(m.index);
  }

  let prev = 0;
  for (const pos of positions) {
    const chunk = src.slice(prev, pos).trim();
    if (chunk) parts.push(chunk);
    prev = pos;
  }
  const last = src.slice(prev).trim();
  if (last) parts.push(last);
  return parts.length ? parts : [src];
}

// ── Syntax highlighting ────────────────────────────────────────────────────────

function highlightSql(sql: string): string {
  if (!sql) return '';

  const allClause = CLAUSE_KEYWORDS.sort((a, b) => b.length - a.length);
  const allInline = INLINE_KEYWORDS.sort((a, b) => b.length - a.length);
  const allKws = [...allClause, ...allInline];

  // Escape HTML
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Tokenize for highlighting
  const tokens = tokenize(sql);
  let html = '';

  for (const token of tokens) {
    if (token.type === 'comment-line' || token.type === 'comment-block') {
      html += `<span class="sql-comment">${escape(token.value)}</span>`;
    } else if (token.type === 'string') {
      html += `<span class="sql-string">${escape(token.value)}</span>`;
    } else {
      // Code: highlight keywords, numbers, operators
      let code = escape(token.value);

      // Keywords (longest first to avoid partial matches)
      for (const kw of allKws) {
        const cls = allClause.includes(kw) ? 'sql-clause' : 'sql-keyword';
        const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+');
        code = code.replace(
          new RegExp(`\\b(${escaped})\\b`, 'g'),
          `<span class="${cls}">$1</span>`
        );
      }

      // Numbers
      code = code.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="sql-number">$1</span>');

      // Operators
      code = code.replace(/(\s*(?:=|&lt;&gt;|!=|&lt;=|&gt;=|&lt;|&gt;)\s*)/g, '<span class="sql-operator">$1</span>');

      html += code;
    }
  }

  return html;
}

// ── Sample SQL ─────────────────────────────────────────────────────────────────

const SAMPLE_SQL = `-- E-commerce order analytics query
select o.order_id, o.created_at, c.name as customer_name, c.email,
sum(oi.quantity * oi.unit_price) as order_total,
count(oi.item_id) as item_count,
case when sum(oi.quantity * oi.unit_price) >= 500 then 'high_value' when sum(oi.quantity * oi.unit_price) >= 100 then 'medium_value' else 'low_value' end as order_tier
from orders o
inner join customers c on o.customer_id=c.id
left join order_items oi on o.order_id=oi.order_id
left join products p on oi.product_id=p.id
where o.status<>'cancelled' and o.created_at>='2024-01-01'
and c.region in (select region_code from active_regions where is_active=true)
group by o.order_id, o.created_at, c.name, c.email
having sum(oi.quantity * oi.unit_price) > 0
order by order_total desc, o.created_at desc
limit 100`;

// ── Component ─────────────────────────────────────────────────────────────────

export default function SqlBeautifier() {
  const [input, setInput] = useState(SAMPLE_SQL);
  const [dialect, setDialect] = useState<Dialect>('standard');
  const [indentSize, setIndentSize] = useState<IndentSize>('2');
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const formatted = useMemo(() => {
    try {
      return formatSql(input, { dialect, indentSize });
    } catch {
      return input;
    }
  }, [input, dialect, indentSize]);

  const highlighted = useMemo(() => highlightSql(formatted), [formatted]);

  const handleCopy = () => {
    navigator.clipboard.writeText(formatted).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const handleDownload = () => {
    const blob = new Blob([formatted], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.sql';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  };

  const handleLoadSample = () => setInput(SAMPLE_SQL);
  const handleClear = () => setInput('');

  const lineCount = formatted.split('\n').length;
  const charCount = formatted.length;

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2 flex-wrap items-center">
          {/* Dialect selector */}
          <select
            value={dialect}
            onChange={(e) => setDialect((e.target as HTMLSelectElement).value as Dialect)}
            class="px-3 py-2 rounded-lg text-sm bg-bg-card border border-border text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="standard">Standard SQL</option>
            <option value="mysql">MySQL</option>
            <option value="postgresql">PostgreSQL</option>
            <option value="sqlite">SQLite</option>
          </select>

          {/* Indent selector */}
          <select
            value={indentSize}
            onChange={(e) => setIndentSize((e.target as HTMLSelectElement).value as IndentSize)}
            class="px-3 py-2 rounded-lg text-sm bg-bg-card border border-border text-text focus:outline-none focus:border-primary transition-colors"
          >
            <option value="2">2 Spaces</option>
            <option value="4">4 Spaces</option>
            <option value="tab">Tab</option>
          </select>

          {/* Copy */}
          <button
            onClick={handleCopy}
            disabled={!formatted.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied' : 'Copy SQL'}
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!formatted.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {downloaded ? '✓ Saved' : 'Download .sql'}
          </button>
        </div>

        <div class="flex gap-2">
          <button
            onClick={handleLoadSample}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={handleClear}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-red-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Split pane: input left, output right */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">Raw SQL Input</label>
            <span class="text-xs text-text-muted">{input.split('\n').length} lines</span>
          </div>
          <textarea
            class="w-full h-96 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your SQL query here..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
        </div>

        {/* Formatted output */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">Formatted Output</label>
            <span class="text-xs text-text-muted">{lineCount} lines · {charCount} chars</span>
          </div>
          <div class="relative h-96 bg-bg-card border border-border rounded-lg overflow-auto">
            {formatted ? (
              <pre
                class="p-3 font-mono text-sm leading-relaxed min-h-full sql-highlight"
                dangerouslySetInnerHTML={{ __html: highlighted }}
              />
            ) : (
              <div class="flex items-center justify-center h-full text-text-muted text-sm">
                Formatted SQL will appear here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Empty state */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">What this formatter does</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Capitalizes SQL keywords (SELECT, FROM, WHERE, JOIN, etc.)</li>
            <li>Places each clause on its own line for readability</li>
            <li>Puts each selected column on its own indented line</li>
            <li>Aligns comma at the start of continuation lines</li>
            <li>Normalizes spacing around operators (=, &lt;&gt;, &gt;=, &lt;=)</li>
            <li>Handles nested subqueries with increased indentation</li>
            <li>Preserves <code class="font-mono">--</code> and <code class="font-mono">/* */</code> comments verbatim</li>
            <li>Supports Standard SQL, MySQL, PostgreSQL, and SQLite dialects</li>
          </ul>
        </div>
      )}

      {/* Highlight styles */}
      <style>{`
        .sql-highlight { color: var(--color-text, #e2e8f0); }
        .sql-clause { color: #7dd3fc; font-weight: 600; }
        .sql-keyword { color: #a5b4fc; }
        .sql-string { color: #86efac; }
        .sql-comment { color: #6b7280; font-style: italic; }
        .sql-number { color: #fbbf24; }
        .sql-operator { color: #f472b6; }
      `}</style>
    </div>
  );
}
