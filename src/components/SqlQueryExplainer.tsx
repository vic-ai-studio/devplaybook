import { useState } from 'preact/hooks';

interface ClauseExplanation {
  clause: string;
  sql: string;
  explanation: string;
  tip?: string;
}

const EXAMPLE_QUERY = `SELECT
  u.id,
  u.name,
  COUNT(o.id) AS order_count,
  SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
  AND u.status = 'active'
GROUP BY u.id, u.name
HAVING SUM(o.total) > 100
ORDER BY total_spent DESC
LIMIT 10;`;

// Parse and explain SQL clauses
function explainSQL(sql: string): ClauseExplanation[] {
  const clauses: ClauseExplanation[] = [];
  const upper = sql.toUpperCase();
  const normalized = sql.trim();

  // Helper: extract text between two keywords
  function extractBetween(start: string, ends: string[]): string | null {
    const startIdx = upper.indexOf(start);
    if (startIdx === -1) return null;
    let endIdx = sql.length;
    for (const end of ends) {
      const idx = upper.indexOf(end, startIdx + start.length);
      if (idx !== -1 && idx < endIdx) endIdx = idx;
    }
    return normalized.slice(startIdx, endIdx).trim();
  }

  // WITH (CTE)
  if (upper.startsWith('WITH')) {
    const withEnd = upper.indexOf('SELECT');
    if (withEnd !== -1) {
      clauses.push({
        clause: 'WITH (CTE)',
        sql: normalized.slice(0, withEnd).trim(),
        explanation: 'Common Table Expression (CTE) — defines a temporary named result set reusable in the main query. CTEs improve readability and allow recursive queries. They run once and the result is materialized before the main query executes.',
        tip: 'Use CTEs to break complex queries into logical steps. For PostgreSQL 12+, CTEs are inlined (not materialized) by default — add MATERIALIZED keyword to force caching.',
      });
    }
  }

  // SELECT
  const selectText = extractBetween('SELECT', ['FROM', 'INTO', 'WHERE']);
  if (selectText) {
    const cols = selectText.replace(/^SELECT\s+/i, '').trim();
    const hasAgg = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/i.test(cols);
    const hasStar = cols.trim() === '*';
    clauses.push({
      clause: 'SELECT',
      sql: selectText,
      explanation: hasStar
        ? 'Selects all columns from the result set. Avoid SELECT * in production — it fetches unnecessary data, breaks if columns are added/removed, and prevents index-only scans.'
        : hasAgg
        ? `Selects specific columns and applies aggregate functions (${cols.match(/\b(COUNT|SUM|AVG|MAX|MIN)\b/gi)?.join(', ')}). Aggregate functions collapse multiple rows into a single value — they require GROUP BY unless applied to the entire table.`
        : `Selects these specific columns: ${cols}. Naming only required columns reduces data transfer and enables index-only scans for better performance.`,
      tip: hasStar ? 'Replace SELECT * with explicit column names in production queries.' : undefined,
    });
  }

  // FROM
  const fromText = extractBetween('FROM', ['WHERE', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL JOIN', 'CROSS JOIN', 'GROUP BY', 'ORDER BY', 'LIMIT', 'HAVING', ';']);
  if (fromText) {
    clauses.push({
      clause: 'FROM',
      sql: fromText,
      explanation: 'Specifies the primary table(s) to query. Table aliases (e.g., "users u") are shorthand used throughout the query. The FROM clause is logically the first clause evaluated — it defines the initial dataset before filtering.',
    });
  }

  // JOINs
  const joinTypes = ['LEFT JOIN', 'RIGHT JOIN', 'INNER JOIN', 'FULL OUTER JOIN', 'FULL JOIN', 'CROSS JOIN', 'JOIN'];
  for (const jt of joinTypes) {
    const regex = new RegExp(`${jt}\\s+\\w+\\s*(\\w+)?\\s+ON\\s+[\\w\\.\\s=]+`, 'i');
    const match = sql.match(regex);
    if (match) {
      const joinDescriptions: Record<string, string> = {
        'LEFT JOIN': 'Returns ALL rows from the left table, plus matching rows from the right table. Unmatched right-side rows are NULL. Use when you want all left-table records regardless of whether they have a match.',
        'RIGHT JOIN': 'Returns ALL rows from the right table, plus matching rows from the left table. Less common — usually rewritten as LEFT JOIN by swapping table order.',
        'INNER JOIN': 'Returns only rows where the ON condition matches in BOTH tables. Rows with no match on either side are excluded.',
        'FULL JOIN': 'Returns all rows from both tables. Unmatched rows on either side are NULL. Useful for finding rows that exist in one table but not the other.',
        'FULL OUTER JOIN': 'Same as FULL JOIN — returns all rows from both tables, with NULLs for unmatched rows on either side.',
        'CROSS JOIN': 'Produces a Cartesian product — every row from the left table paired with every row from the right. Rarely intentional; can produce huge result sets.',
        'JOIN': 'Implicit INNER JOIN — returns only rows where the ON condition matches in both tables.',
      };
      clauses.push({
        clause: jt,
        sql: match[0],
        explanation: joinDescriptions[jt] || `${jt} combines rows from two tables based on the ON condition.`,
        tip: jt.includes('LEFT') ? 'If you use a WHERE condition on the right table (e.g. WHERE orders.status = "active"), it converts the LEFT JOIN to an effective INNER JOIN, excluding NULLs.' : undefined,
      });
    }
  }

  // WHERE
  const whereText = extractBetween('WHERE', ['GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', ';']);
  if (whereText) {
    clauses.push({
      clause: 'WHERE',
      sql: whereText,
      explanation: 'Filters rows BEFORE aggregation. Only rows matching all conditions are kept. Conditions are evaluated per row using AND/OR logic. WHERE is applied after FROM/JOIN but before GROUP BY.',
      tip: 'Columns in WHERE conditions should be indexed for performance. Avoid wrapping columns in functions (e.g., WHERE YEAR(created_at) = 2024) — this prevents index use. Use ranges instead: WHERE created_at >= \'2024-01-01\' AND created_at < \'2025-01-01\'.',
    });
  }

  // GROUP BY
  const groupText = extractBetween('GROUP BY', ['HAVING', 'ORDER BY', 'LIMIT', ';']);
  if (groupText) {
    clauses.push({
      clause: 'GROUP BY',
      sql: groupText,
      explanation: 'Collapses rows that share the same values in the specified columns into a single summary row. Required when using aggregate functions (COUNT, SUM, AVG, etc.) alongside non-aggregated columns. All non-aggregated SELECT columns must appear in GROUP BY.',
      tip: 'PostgreSQL allows GROUP BY on column position (GROUP BY 1, 2) but this hurts readability. Always use column names.',
    });
  }

  // HAVING
  const havingText = extractBetween('HAVING', ['ORDER BY', 'LIMIT', ';']);
  if (havingText) {
    clauses.push({
      clause: 'HAVING',
      sql: havingText,
      explanation: 'Filters groups AFTER aggregation — unlike WHERE which filters individual rows. HAVING is evaluated after GROUP BY and can reference aggregate functions. Use WHERE to filter rows before grouping; use HAVING to filter the aggregated results.',
      tip: 'If a condition does not use an aggregate function, move it to WHERE for better performance (it reduces rows before grouping).',
    });
  }

  // ORDER BY
  const orderText = extractBetween('ORDER BY', ['LIMIT', 'OFFSET', ';']);
  if (orderText) {
    clauses.push({
      clause: 'ORDER BY',
      sql: orderText,
      explanation: 'Sorts the result set by the specified columns. ASC (ascending, default) or DESC (descending). Multiple columns are sorted left-to-right: primary sort first, then secondary sort for ties. Without ORDER BY, result order is non-deterministic.',
      tip: 'ORDER BY on large datasets without a LIMIT can be slow. Add an index on sort columns. Note: ORDER BY is applied after all filtering — sort the smallest possible dataset.',
    });
  }

  // LIMIT / FETCH FIRST
  const limitText = extractBetween('LIMIT', ['OFFSET', ';']);
  const fetchText = extractBetween('FETCH FIRST', [';']);
  if (limitText || fetchText) {
    const text = limitText || fetchText || '';
    clauses.push({
      clause: 'LIMIT',
      sql: text,
      explanation: 'Restricts the number of rows returned. Essential for pagination and preventing accidental full-table returns. Always combine with ORDER BY for deterministic results — without ORDER BY, which rows are returned is undefined.',
      tip: 'For deep pagination (large OFFSET values), use cursor-based pagination instead: WHERE id > last_seen_id LIMIT 20. Keyset pagination avoids the performance cost of skipping rows.',
    });
  }

  // OFFSET
  const offsetText = extractBetween('OFFSET', [';']);
  if (offsetText) {
    clauses.push({
      clause: 'OFFSET',
      sql: offsetText,
      explanation: 'Skips the first N rows before returning results. Used with LIMIT for page-based pagination. Performance degrades for large offsets — the database must scan and discard all skipped rows.',
      tip: 'Avoid OFFSET > 1000. For deep pagination, use cursor-based approach: WHERE id > cursor_value ORDER BY id LIMIT page_size.',
    });
  }

  return clauses.length > 0 ? clauses : [{
    clause: 'Note',
    sql: '',
    explanation: 'Could not parse SQL clauses. Try a SELECT query with standard clauses (SELECT, FROM, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT).',
  }];
}

const CLAUSE_ICONS: Record<string, string> = {
  'WITH (CTE)': '🔗',
  'SELECT': '📋',
  'FROM': '🗄',
  'LEFT JOIN': '⬅',
  'RIGHT JOIN': '➡',
  'INNER JOIN': '🔀',
  'FULL JOIN': '↔',
  'FULL OUTER JOIN': '↔',
  'CROSS JOIN': '✖',
  'JOIN': '🔀',
  'WHERE': '🔍',
  'GROUP BY': '📊',
  'HAVING': '🎯',
  'ORDER BY': '🔃',
  'LIMIT': '✂',
  'OFFSET': '⏭',
};

export default function SqlQueryExplainer() {
  const [query, setQuery] = useState(EXAMPLE_QUERY);
  const [explained, setExplained] = useState(false);
  const [clauses, setClauses] = useState<ClauseExplanation[]>([]);
  const [copied, setCopied] = useState(false);

  function handleExplain() {
    const result = explainSQL(query);
    setClauses(result);
    setExplained(true);
  }

  function handleClear() {
    setQuery('');
    setClauses([]);
    setExplained(false);
  }

  async function handleCopy() {
    const text = clauses.map(c => `${c.clause}:\n${c.explanation}${c.tip ? '\nTip: ' + c.tip : ''}`).join('\n\n');
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-6">
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="font-semibold text-text">SQL Query</h2>
          <div class="flex gap-2">
            <button
              onClick={() => { setQuery(EXAMPLE_QUERY); setExplained(false); setClauses([]); }}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Load Example
            </button>
            <button
              onClick={handleClear}
              class="text-xs px-3 py-1.5 rounded-lg bg-bg-card border border-border text-text-muted hover:text-text transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={query}
          onInput={(e) => { setQuery((e.target as HTMLTextAreaElement).value); setExplained(false); }}
          class="w-full h-52 bg-surface border border-border rounded-lg p-3 text-sm font-mono text-text resize-y focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
          placeholder="Paste your SQL query here..."
          spellcheck={false}
        />
        <div class="flex gap-3 mt-3">
          <button
            onClick={handleExplain}
            disabled={!query.trim()}
            class="px-5 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Explain Query
          </button>
          {explained && clauses.length > 0 && (
            <button
              onClick={handleCopy}
              class="px-4 py-2 bg-bg-card border border-border text-text-muted text-sm rounded-lg hover:text-text transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy explanations'}
            </button>
          )}
        </div>
      </div>

      {explained && clauses.length > 0 && (
        <div class="space-y-4">
          <p class="text-sm text-text-muted">
            Found <strong class="text-text">{clauses.length} clause{clauses.length !== 1 ? 's' : ''}</strong> — click any card to expand:
          </p>
          {clauses.map((c, i) => (
            <details key={i} open class="bg-bg-card border border-border rounded-xl overflow-hidden group">
              <summary class="flex items-center gap-3 p-4 cursor-pointer hover:bg-surface/50 transition-colors select-none list-none">
                <span class="text-xl">{CLAUSE_ICONS[c.clause] || '📌'}</span>
                <span class="font-semibold text-primary font-mono text-sm">{c.clause}</span>
                {c.sql && (
                  <span class="ml-auto text-xs text-text-muted truncate max-w-xs font-mono opacity-60">
                    {c.sql.replace(/\s+/g, ' ').slice(0, 60)}{c.sql.length > 60 ? '…' : ''}
                  </span>
                )}
              </summary>
              <div class="px-4 pb-4 border-t border-border/50">
                {c.sql && (
                  <pre class="mt-3 bg-surface rounded-lg p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{c.sql}</pre>
                )}
                <p class="mt-3 text-sm text-text leading-relaxed">{c.explanation}</p>
                {c.tip && (
                  <div class="mt-3 flex gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3">
                    <span class="text-yellow-400 text-sm flex-shrink-0">💡</span>
                    <p class="text-xs text-text-muted leading-relaxed">{c.tip}</p>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}
