import { useState } from 'preact/hooks';

const SAMPLE_QUERY = `SELECT u.id, u.name, COUNT(o.id) AS order_count, SUM(o.total) AS total_spent
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at >= '2024-01-01'
GROUP BY u.id, u.name
HAVING total_spent > 100
ORDER BY total_spent DESC
LIMIT 50;`;

type Hint = {
  type: 'info' | 'warning' | 'tip' | 'error';
  text: string;
};

type Explanation = {
  overview: string;
  steps: string[];
  hints: Hint[];
  estimatedRows: string;
};

function explainQuery(sql: string): Explanation {
  const upper = sql.toUpperCase();
  const lines = sql.trim().split('\n').map(l => l.trim()).filter(Boolean);
  const steps: string[] = [];
  const hints: Hint[] = [];

  // Detect query type
  const isSelect = upper.trimStart().startsWith('SELECT');
  const isInsert = upper.trimStart().startsWith('INSERT');
  const isUpdate = upper.trimStart().startsWith('UPDATE');
  const isDelete = upper.trimStart().startsWith('DELETE');
  const isCreate = upper.trimStart().startsWith('CREATE');
  const isAlter = upper.trimStart().startsWith('ALTER');

  let overview = '';
  let estimatedRows = 'Unknown';

  // SELECT analysis
  if (isSelect) {
    const hasJoin = /\bJOIN\b/.test(upper);
    const hasLeft = /\bLEFT\s+JOIN\b/.test(upper);
    const hasRight = /\bRIGHT\s+JOIN\b/.test(upper);
    const hasWhere = /\bWHERE\b/.test(upper);
    const hasGroupBy = /\bGROUP\s+BY\b/.test(upper);
    const hasHaving = /\bHAVING\b/.test(upper);
    const hasOrderBy = /\bORDER\s+BY\b/.test(upper);
    const hasLimit = /\bLIMIT\b/.test(upper);
    const hasDistinct = /\bSELECT\s+DISTINCT\b/.test(upper);
    const hasSubquery = /\bSELECT\b.*\bSELECT\b/s.test(upper);
    const hasAggregate = /\b(COUNT|SUM|AVG|MAX|MIN)\s*\(/.test(upper);
    const hasIndex = /\bUSE\s+INDEX\b|\bFORCE\s+INDEX\b/.test(upper);
    const hasStar = /SELECT\s+\*/.test(upper);
    const hasLike = /\bLIKE\s+'%/.test(upper);
    const hasOrInWhere = /\bWHERE\b.*\bOR\b/.test(upper);

    // Extract tables
    const fromMatch = sql.match(/\bFROM\s+([\w\.]+)(?:\s+(?:AS\s+)?(\w+))?/i);
    const mainTable = fromMatch ? fromMatch[1] : 'table';

    // Count JOINs
    const joinCount = (upper.match(/\bJOIN\b/g) || []).length;

    // Build overview
    const parts: string[] = [];
    if (hasDistinct) parts.push('unique');
    if (hasAggregate) parts.push('aggregated');
    parts.push('rows');
    if (hasJoin) parts.push(`from ${mainTable} joined with ${joinCount} table${joinCount > 1 ? 's' : ''}`);
    else parts.push(`from ${mainTable}`);
    if (hasWhere) parts.push('filtered by WHERE conditions');
    if (hasGroupBy) parts.push('grouped');
    if (hasHaving) parts.push('post-group filtered by HAVING');
    if (hasOrderBy) parts.push('sorted');
    if (hasLimit) {
      const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
      if (limitMatch) parts.push(`limited to ${limitMatch[1]} rows`);
    }
    overview = `This SELECT query retrieves ${parts.join(', ')}.`;

    // Build execution steps
    steps.push(`1. MySQL identifies the main table: \`${mainTable}\``);

    if (hasJoin) {
      const joinLines = lines.filter(l => /JOIN/i.test(l));
      joinLines.forEach((jl, i) => {
        const joinType = hasLeft ? 'LEFT JOIN (includes all rows from left table, NULLs for non-matching right)' :
                        hasRight ? 'RIGHT JOIN (includes all rows from right table)' : 'INNER JOIN (only matching rows)';
        steps.push(`${steps.length + 1}. Applies ${joinType}: \`${jl}\``);
      });
    }

    if (hasWhere) {
      const whereLine = lines.find(l => /WHERE/i.test(l));
      steps.push(`${steps.length + 1}. Filters rows matching WHERE: \`${whereLine || 'WHERE condition'}\``);
    }

    if (hasGroupBy) {
      const groupLine = lines.find(l => /GROUP BY/i.test(l));
      steps.push(`${steps.length + 1}. Groups rows by: \`${groupLine || 'GROUP BY columns'}\``);
    }

    if (hasAggregate) {
      steps.push(`${steps.length + 1}. Computes aggregate functions (COUNT, SUM, AVG, etc.) for each group`);
    }

    if (hasHaving) {
      const havingLine = lines.find(l => /HAVING/i.test(l));
      steps.push(`${steps.length + 1}. Post-aggregation filter with HAVING: \`${havingLine || 'HAVING condition'}\` — runs after GROUP BY, unlike WHERE`);
    }

    if (hasOrderBy) {
      const orderLine = lines.find(l => /ORDER BY/i.test(l));
      steps.push(`${steps.length + 1}. Sorts results: \`${orderLine || 'ORDER BY column'}\` — can be slow without an index`);
    }

    if (hasLimit) {
      const limitLine = lines.find(l => /LIMIT/i.test(l));
      steps.push(`${steps.length + 1}. Returns at most N rows: \`${limitLine || 'LIMIT N'}\``);
    }

    steps.push(`${steps.length + 1}. Returns the final result set to the client`);

    estimatedRows = hasLimit
      ? (() => { const m = sql.match(/LIMIT\s+(\d+)/i); return m ? `≤ ${m[1]} rows` : 'Limited'; })()
      : hasGroupBy ? 'One row per group' : 'All matching rows';

    // Optimization hints
    if (hasStar) {
      hints.push({ type: 'warning', text: 'SELECT * fetches all columns — specify only needed columns to reduce data transfer and improve performance.' });
    }

    if (hasLike) {
      hints.push({ type: 'warning', text: 'LIKE \'%value%\' with a leading wildcard cannot use an index and will cause a full table scan. Consider FULLTEXT search or a search engine for large tables.' });
    }

    if (!hasLimit && !hasGroupBy) {
      hints.push({ type: 'tip', text: 'Add LIMIT to avoid accidentally returning millions of rows in production.' });
    }

    if (hasJoin && !hasWhere) {
      hints.push({ type: 'warning', text: 'No WHERE clause on a JOIN query — this will return a cross product of rows. Make sure this is intentional.' });
    }

    if (hasOrInWhere) {
      hints.push({ type: 'tip', text: 'OR in WHERE can prevent index usage. Consider rewriting with UNION ALL if this query is slow: SELECT ... WHERE a=1 UNION ALL SELECT ... WHERE b=2' });
    }

    if (hasSubquery) {
      hints.push({ type: 'tip', text: 'Subqueries can be rewritten as JOINs for better performance. MySQL often optimizes JOINs better than correlated subqueries.' });
    }

    if (hasOrderBy && !hasLimit) {
      hints.push({ type: 'tip', text: 'ORDER BY without LIMIT can be expensive on large tables. Ensure there is a covering index on the ORDER BY column(s).' });
    }

    if (hasGroupBy) {
      hints.push({ type: 'info', text: 'HAVING filters after grouping. If you can filter before grouping, use WHERE instead — it is more efficient.' });
    }

    if (hasLeft && hasWhere) {
      hints.push({ type: 'tip', text: 'Filtering on a LEFT JOIN\'s right-table column in WHERE turns it into an implicit INNER JOIN. Move that filter to the ON clause if you want to preserve unmatched left rows.' });
    }

    if (!hints.length) {
      hints.push({ type: 'info', text: 'Query looks clean. Run EXPLAIN SELECT ... to check index usage in your MySQL environment.' });
    }

    hints.push({ type: 'tip', text: 'Run EXPLAIN (or EXPLAIN ANALYZE in MySQL 8.0+) to see the actual execution plan, index choices, and row estimates.' });
  }

  // INSERT analysis
  else if (isInsert) {
    overview = 'This INSERT statement adds one or more rows to a table.';
    steps.push('1. MySQL validates the column list and value count');
    steps.push('2. Checks constraints: NOT NULL, UNIQUE, FOREIGN KEY');
    steps.push('3. Acquires a row-level lock on the affected table');
    steps.push('4. Writes the row to the data file and updates indexes');
    steps.push('5. Writes to the binary log (if enabled) for replication');

    if (/INSERT\s+IGNORE/i.test(sql)) {
      hints.push({ type: 'info', text: 'INSERT IGNORE silently skips duplicate key errors. Use ON DUPLICATE KEY UPDATE for more control over conflict handling.' });
    }
    if (/SELECT/i.test(upper.replace(/^INSERT.+?SELECT/s, ''))) {
      hints.push({ type: 'tip', text: 'INSERT ... SELECT locks the source rows during the operation. On large tables, consider batching with LIMIT.' });
    }
    estimatedRows = '1+ rows inserted';
  }

  // UPDATE analysis
  else if (isUpdate) {
    overview = 'This UPDATE statement modifies existing rows in a table.';
    const hasWhere = /\bWHERE\b/.test(upper);
    steps.push('1. MySQL locates rows matching the WHERE condition');
    steps.push('2. Acquires locks on affected rows');
    steps.push('3. Applies the SET changes and updates indexes');
    steps.push('4. Writes to binary log for replication');

    if (!hasWhere) {
      hints.push({ type: 'error', text: '⚠ UPDATE without WHERE — this will modify EVERY row in the table. Double-check this is intentional.' });
    } else {
      hints.push({ type: 'tip', text: 'Run SELECT with the same WHERE first to preview which rows will be affected before committing the UPDATE.' });
    }
    estimatedRows = hasWhere ? 'Matching rows' : 'ALL rows in table';
  }

  // DELETE analysis
  else if (isDelete) {
    overview = 'This DELETE statement removes rows from a table.';
    const hasWhere = /\bWHERE\b/.test(upper);
    steps.push('1. MySQL locates rows matching the WHERE condition');
    steps.push('2. Acquires locks on affected rows');
    steps.push('3. Marks rows as deleted and updates indexes');
    steps.push('4. Writes to binary log; space reclaimed by OPTIMIZE TABLE later');

    if (!hasWhere) {
      hints.push({ type: 'error', text: '⚠ DELETE without WHERE — this will delete ALL rows. Use TRUNCATE TABLE for faster full-table clear if no FK constraints exist.' });
    } else {
      hints.push({ type: 'tip', text: 'Run SELECT COUNT(*) with the same WHERE first to preview how many rows will be deleted.' });
    }
    if (/\bLIMIT\b/.test(upper)) {
      hints.push({ type: 'info', text: 'DELETE ... LIMIT is useful for batched deletes on large tables to avoid long locks.' });
    }
    estimatedRows = hasWhere ? 'Matching rows deleted' : 'ALL rows deleted';
  }

  // CREATE TABLE analysis
  else if (isCreate) {
    overview = 'This CREATE TABLE statement defines a new table schema.';
    steps.push('1. MySQL parses and validates the column definitions and constraints');
    steps.push('2. Creates the .frm / .ibd file (InnoDB) or .MYD/.MYI (MyISAM)');
    steps.push('3. Builds the specified indexes (PRIMARY KEY first, then others)');
    steps.push('4. Registers the table in the information_schema');

    if (!/\bPRIMARY\s+KEY\b/i.test(sql)) {
      hints.push({ type: 'warning', text: 'No PRIMARY KEY defined. InnoDB will create a hidden 6-byte row ID. Always define an explicit primary key for performance and replication.' });
    }
    if (!/\bENGINE\s*=/i.test(sql)) {
      hints.push({ type: 'info', text: 'No ENGINE specified — defaults to InnoDB. InnoDB supports transactions, row-level locking, and foreign keys. Prefer it over MyISAM.' });
    }
    estimatedRows = 'New empty table';
  }

  // Fallback
  else {
    overview = 'SQL statement detected. Analysis shows the key clauses and execution steps.';
    steps.push('1. MySQL parses and validates the SQL syntax');
    steps.push('2. The query optimizer builds an execution plan');
    steps.push('3. Executes the plan and returns results');
    hints.push({ type: 'info', text: 'Use EXPLAIN before SELECT queries to inspect the execution plan and index usage.' });
    estimatedRows = 'Varies';
  }

  return { overview, steps, hints, estimatedRows };
}

const hintColors: Record<string, string> = {
  info: 'bg-blue-900/30 border-blue-500/40 text-blue-200',
  warning: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-200',
  tip: 'bg-green-900/30 border-green-500/40 text-green-200',
  error: 'bg-red-900/30 border-red-500/40 text-red-200',
};

const hintIcon: Record<string, string> = {
  info: 'ℹ',
  warning: '⚠',
  tip: '💡',
  error: '🚨',
};

export default function MysqlQueryExplainer() {
  const [query, setQuery] = useState(SAMPLE_QUERY);
  const [result, setResult] = useState<Explanation | null>(null);
  const [copied, setCopied] = useState(false);

  function handleExplain() {
    if (!query.trim()) return;
    setResult(explainQuery(query));
  }

  function handleCopy() {
    if (!result) return;
    const text = [
      'Overview: ' + result.overview,
      '',
      'Execution Steps:',
      ...result.steps,
      '',
      'Optimization Hints:',
      ...result.hints.map(h => `[${h.type.toUpperCase()}] ${h.text}`),
      '',
      `Estimated Output: ${result.estimatedRows}`,
    ].join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div class="space-y-4">
      <div class="relative">
        <textarea
          class="w-full h-52 font-mono text-sm p-3 rounded-lg bg-bg-secondary border border-border text-text resize-y focus:outline-none focus:border-accent"
          placeholder="Paste your MySQL query here..."
          value={query}
          onInput={(e) => setQuery((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <button
          class="absolute bottom-3 right-3 text-xs text-text-muted hover:text-text bg-bg-secondary px-2 py-1 rounded border border-border"
          onClick={() => setQuery(SAMPLE_QUERY)}
        >
          Load sample
        </button>
      </div>

      <button
        class="w-full py-2.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
        onClick={handleExplain}
      >
        Explain Query
      </button>

      {result && (
        <div class="space-y-4">
          {/* Overview */}
          <div class="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 class="font-semibold text-text mb-1">Overview</h3>
            <p class="text-text-muted text-sm">{result.overview}</p>
            <p class="text-xs text-text-muted mt-2">
              <span class="font-medium text-text">Expected output:</span> {result.estimatedRows}
            </p>
          </div>

          {/* Execution Steps */}
          <div class="p-4 rounded-lg bg-bg-secondary border border-border">
            <h3 class="font-semibold text-text mb-3">Execution Steps</h3>
            <ol class="space-y-2">
              {result.steps.map((step, i) => (
                <li key={i} class="flex gap-3 text-sm">
                  <span class="text-accent font-mono shrink-0 mt-0.5">{String(i + 1).padStart(2, '0')}.</span>
                  <span class="text-text-muted">{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Hints */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <h3 class="font-semibold text-text">Optimization Hints</h3>
              <button
                class="text-xs text-accent hover:underline"
                onClick={handleCopy}
              >
                {copied ? '✓ Copied' : 'Copy all'}
              </button>
            </div>
            <div class="space-y-2">
              {result.hints.map((hint, i) => (
                <div key={i} class={`flex gap-2 p-3 rounded-lg border text-sm ${hintColors[hint.type]}`}>
                  <span class="shrink-0">{hintIcon[hint.type]}</span>
                  <span>{hint.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
