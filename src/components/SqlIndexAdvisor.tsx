import { useState } from 'preact/hooks';

type IndexSuggestion = {
  table: string;
  columns: string[];
  type: 'single' | 'composite' | 'covering';
  reason: string;
  sql: string;
};

const SAMPLE_QUERY = `SELECT u.id, u.name, u.email, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.status = 'active'
  AND o.created_at >= '2024-01-01'
  AND o.status = 'completed'
ORDER BY o.created_at DESC
LIMIT 100;`;

function tokenize(sql: string): string[] {
  return sql.toUpperCase().replace(/[(),;]/g, ' ').split(/\s+/).filter(Boolean);
}

function extractTableAlias(sql: string): Record<string, string> {
  const map: Record<string, string> = {};
  const re = /(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)/gi;
  let m;
  while ((m = re.exec(sql)) !== null) {
    map[m[2].toUpperCase()] = m[1].toUpperCase();
  }
  return map;
}

function resolveColumn(col: string, aliases: Record<string, string>): { table: string; column: string } {
  if (col.includes('.')) {
    const [alias, column] = col.split('.');
    return { table: aliases[alias.toUpperCase()] || alias.toUpperCase(), column: column.toUpperCase() };
  }
  return { table: 'UNKNOWN', column: col.toUpperCase() };
}

function analyzeQuery(sql: string): IndexSuggestion[] {
  const suggestions: IndexSuggestion[] = [];
  const aliases = extractTableAlias(sql);
  const upperSql = sql.toUpperCase();

  // Extract WHERE conditions
  const whereMatch = upperSql.match(/WHERE\s+([\s\S]+?)(?:ORDER BY|GROUP BY|HAVING|LIMIT|$)/i);
  const whereClause = whereMatch ? whereMatch[1] : '';

  // Extract ORDER BY columns
  const orderMatch = upperSql.match(/ORDER\s+BY\s+([\s\S]+?)(?:LIMIT|$)/i);
  const orderClause = orderMatch ? orderMatch[1] : '';

  // Extract JOIN ON conditions
  const joinCols: Array<{ table: string; col: string }> = [];
  const joinRe = /JOIN\s+(\w+)\s+(?:AS\s+)?(\w+)\s+ON\s+([\w.]+)\s*=\s*([\w.]+)/gi;
  let jm;
  while ((jm = joinRe.exec(sql)) !== null) {
    const table = jm[1].toUpperCase();
    const alias = jm[2].toUpperCase();
    // The foreign key column is the one on the joined table
    const left = resolveColumn(jm[3], aliases);
    const right = resolveColumn(jm[4], aliases);
    const fk = left.table === table || left.table === alias ? left.column : right.column;
    joinCols.push({ table, col: fk });
  }

  // Join index suggestions
  joinCols.forEach(({ table, col }) => {
    if (col && col !== 'UNKNOWN') {
      suggestions.push({
        table: table,
        columns: [col.toLowerCase()],
        type: 'single',
        reason: `Foreign key used in JOIN ON condition — improves join lookup performance`,
        sql: `CREATE INDEX idx_${table.toLowerCase()}_${col.toLowerCase()} ON ${table.toLowerCase()} (${col.toLowerCase()});`,
      });
    }
  });

  // WHERE clause index suggestions
  const whereColRe = /(\w+\.\w+|\w+)\s*(?:=|>=|<=|>|<|LIKE|IN\s*\()/gi;
  const whereCols: Array<{ table: string; col: string }> = [];
  let wm;
  while ((wm = whereColRe.exec(whereClause)) !== null) {
    const r = resolveColumn(wm[1], aliases);
    if (r.column !== 'UNKNOWN' && r.table !== 'UNKNOWN') {
      whereCols.push({ table: r.table, col: r.column });
    }
  }

  // Group WHERE columns by table and suggest composite index
  const byTable: Record<string, string[]> = {};
  whereCols.forEach(({ table, col }) => {
    if (!byTable[table]) byTable[table] = [];
    if (!byTable[table].includes(col)) byTable[table].push(col);
  });

  Object.entries(byTable).forEach(([table, cols]) => {
    // Skip if already covered by join index
    const alreadySuggested = suggestions.some(s => s.table === table && cols.some(c => s.columns.includes(c.toLowerCase())));
    if (cols.length === 1 && !alreadySuggested) {
      suggestions.push({
        table: table,
        columns: cols.map(c => c.toLowerCase()),
        type: 'single',
        reason: `Column used in WHERE clause equality/range filter`,
        sql: `CREATE INDEX idx_${table.toLowerCase()}_${cols[0].toLowerCase()} ON ${table.toLowerCase()} (${cols[0].toLowerCase()});`,
      });
    } else if (cols.length > 1) {
      suggestions.push({
        table: table,
        columns: cols.map(c => c.toLowerCase()),
        type: 'composite',
        reason: `Multiple WHERE conditions on same table — composite index more efficient than separate single-column indexes`,
        sql: `CREATE INDEX idx_${table.toLowerCase()}_${cols.map(c => c.toLowerCase()).join('_')} ON ${table.toLowerCase()} (${cols.map(c => c.toLowerCase()).join(', ')});`,
      });
    }
  });

  // ORDER BY suggestion
  if (orderClause.trim()) {
    const orderColRe = /(\w+\.\w+|\w+)\s*(?:ASC|DESC)?/gi;
    let om;
    const orderItems: Array<{ table: string; col: string }> = [];
    while ((om = orderColRe.exec(orderClause)) !== null) {
      const r = resolveColumn(om[1], aliases);
      if (r.col !== 'LIMIT' && r.column !== 'UNKNOWN' && r.table !== 'UNKNOWN') {
        orderItems.push(r);
      }
    }
    orderItems.forEach(({ table, col }) => {
      if (!suggestions.some(s => s.table === table && s.columns.includes(col.toLowerCase()))) {
        suggestions.push({
          table,
          columns: [col.toLowerCase()],
          type: 'single',
          reason: `Column used in ORDER BY — index eliminates filesort, avoids full table scan for sorted results`,
          sql: `CREATE INDEX idx_${table.toLowerCase()}_${col.toLowerCase()} ON ${table.toLowerCase()} (${col.toLowerCase()});`,
        });
      }
    });
  }

  if (suggestions.length === 0) {
    // fallback
    suggestions.push({
      table: 'TABLE',
      columns: ['column'],
      type: 'single',
      reason: 'No specific columns detected. Paste a query with explicit table.column references for better analysis.',
      sql: '-- Paste a query with explicit table.column references (e.g. u.id, o.user_id)',
    });
  }

  return suggestions;
}

const TYPE_BADGE: Record<string, string> = {
  single: 'bg-blue-500/20 text-blue-400',
  composite: 'bg-purple-500/20 text-purple-400',
  covering: 'bg-green-500/20 text-green-400',
};

export default function SqlIndexAdvisor() {
  const [sql, setSql] = useState(SAMPLE_QUERY);
  const [suggestions, setSuggestions] = useState<IndexSuggestion[]>(() => analyzeQuery(SAMPLE_QUERY));
  const [analyzed, setAnalyzed] = useState(true);
  const [copied, setCopied] = useState(false);

  const handleAnalyze = () => {
    setSuggestions(analyzeQuery(sql));
    setAnalyzed(true);
  };

  const allSql = suggestions.map(s => s.sql).join('\n');

  const copyAll = () => {
    navigator.clipboard.writeText(allSql).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">SQL SELECT Query</label>
          <button onClick={() => { setSql(SAMPLE_QUERY); setSuggestions(analyzeQuery(SAMPLE_QUERY)); setAnalyzed(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
        </div>
        <textarea
          value={sql}
          onInput={e => { setSql((e.target as HTMLTextAreaElement).value); setAnalyzed(false); }}
          rows={10}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="Paste your SELECT query here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleAnalyze} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Analyze &amp; Suggest Indexes
      </button>

      {analyzed && suggestions.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">{suggestions.length} index suggestion{suggestions.length > 1 ? 's' : ''}</span>
            <button onClick={copyAll} class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors">
              {copied ? 'Copied!' : 'Copy All SQL'}
            </button>
          </div>
          {suggestions.map((s, i) => (
            <div key={i} class="border border-border rounded-lg p-3 space-y-2">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-medium text-text">{s.table.toLowerCase()}</span>
                <span class="text-text-muted text-xs">({s.columns.join(', ')})</span>
                <span class={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_BADGE[s.type]}`}>{s.type}</span>
              </div>
              <p class="text-xs text-text-muted">{s.reason}</p>
              <pre class="font-mono text-xs bg-background border border-border rounded p-2 overflow-x-auto text-green-400">{s.sql}</pre>
            </div>
          ))}
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Index design rules</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Put equality columns first in composite indexes, range columns last</li>
          <li>Index foreign key columns used in JOIN ON conditions</li>
          <li>Index ORDER BY columns when used with WHERE on the same table</li>
          <li>Avoid over-indexing — each index slows down INSERT/UPDATE/DELETE</li>
          <li>Use EXPLAIN / EXPLAIN ANALYZE to verify index usage after creation</li>
        </ul>
      </div>
    </div>
  );
}
