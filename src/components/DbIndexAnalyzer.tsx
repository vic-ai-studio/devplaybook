import { useState } from 'preact/hooks';

type IndexIssue = {
  level: 'missing' | 'redundant' | 'warning' | 'info';
  table: string;
  message: string;
  suggestion: string;
  sql?: string;
};

const SAMPLE_SCHEMA = `CREATE TABLE users (
  id BIGINT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL,
  country_code CHAR(2),
  INDEX idx_email (email),
  INDEX idx_status (status),
  INDEX idx_status_country (status, country_code)
);

CREATE TABLE orders (
  id BIGINT PRIMARY KEY,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP NOT NULL
);

-- Queries to analyze:
SELECT * FROM users WHERE email = 'user@example.com';
SELECT * FROM orders WHERE user_id = 123 AND status = 'completed' ORDER BY created_at DESC;
SELECT u.id, o.total FROM users u JOIN orders o ON u.id = o.user_id WHERE u.status = 'active';
`;

type TableDef = {
  name: string;
  columns: Set<string>;
  existingIndexes: Array<{ name: string; columns: string[] }>;
  primaryKey?: string;
};

function parseSchema(sql: string): TableDef[] {
  const tables: TableDef[] = [];
  const tableRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"]?(\w+)[`"]?\s*\(([^;]+)\)/gi;
  let tm;
  while ((tm = tableRe.exec(sql)) !== null) {
    const tableName = tm[1].toUpperCase();
    const body = tm[2];
    const columns = new Set<string>();
    const existingIndexes: Array<{ name: string; columns: string[] }> = [];
    let primaryKey: string | undefined;

    const lines = body.split(',').map(l => l.trim());
    for (const line of lines) {
      const upper = line.toUpperCase();
      // Column definition
      const colMatch = line.match(/^[`"]?(\w+)[`"]?\s+\w/);
      if (colMatch && !upper.startsWith('PRIMARY') && !upper.startsWith('INDEX') &&
          !upper.startsWith('KEY') && !upper.startsWith('UNIQUE') &&
          !upper.startsWith('FOREIGN') && !upper.startsWith('CONSTRAINT')) {
        columns.add(colMatch[1].toUpperCase());
      }
      // Primary key inline
      if (upper.includes('PRIMARY KEY')) {
        const pkMatch = line.match(/PRIMARY\s+KEY\s*\([`"]?(\w+)[`"]?\)/i);
        if (pkMatch) primaryKey = pkMatch[1].toUpperCase();
        else {
          // inline PK
          const inlinePk = line.match(/^[`"]?(\w+)[`"]?.*PRIMARY\s+KEY/i);
          if (inlinePk) primaryKey = inlinePk[1].toUpperCase();
        }
      }
      // INDEX / KEY
      const idxMatch = line.match(/(?:INDEX|KEY|UNIQUE\s+(?:INDEX|KEY))\s+[`"]?(\w+)[`"]?\s*\(([^)]+)\)/i);
      if (idxMatch) {
        const cols = idxMatch[2].split(',').map(c => c.trim().replace(/[`"]/g, '').replace(/\s*\(\d+\)/, '').toUpperCase());
        existingIndexes.push({ name: idxMatch[1].toUpperCase(), columns: cols });
      }
    }
    tables.push({ name: tableName, columns, existingIndexes, primaryKey });
  }
  return tables;
}

function extractQueries(sql: string): string[] {
  // Extract SELECT queries (lines starting with SELECT or after --)
  const queries: string[] = [];
  // Remove comment lines, then find SELECT statements
  const lines = sql.split('\n');
  let current = '';
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;
    current += ' ' + trimmed;
    if (trimmed.endsWith(';')) {
      const q = current.trim();
      if (/^\s*SELECT\s/i.test(q)) queries.push(q);
      current = '';
    }
  }
  if (current.trim() && /^\s*SELECT\s/i.test(current)) queries.push(current.trim());
  return queries;
}

function isIndexedBy(col: string, table: TableDef): boolean {
  const c = col.toUpperCase();
  if (table.primaryKey === c) return true;
  return table.existingIndexes.some(idx => idx.columns[0] === c || idx.columns.includes(c));
}

function analyzeIndexes(sql: string): IndexIssue[] {
  const issues: IndexIssue[] = [];
  const tables = parseSchema(sql);
  const queries = extractQueries(sql);

  if (tables.length === 0) {
    issues.push({ level: 'warning', table: '', message: 'No CREATE TABLE statements found.', suggestion: 'Add CREATE TABLE definitions above your queries.' });
    return issues;
  }

  const tableMap: Record<string, TableDef> = {};
  tables.forEach(t => { tableMap[t.name] = t; });

  // 1. Check redundant indexes (prefix covered by another index)
  for (const table of tables) {
    const idxs = table.existingIndexes;
    for (let i = 0; i < idxs.length; i++) {
      for (let j = 0; j < idxs.length; j++) {
        if (i === j) continue;
        const a = idxs[i].columns;
        const b = idxs[j].columns;
        // b is a strict prefix of a
        if (b.length < a.length && b.every((c, k) => c === a[k])) {
          issues.push({
            level: 'redundant',
            table: table.name,
            message: `Index \`${idxs[j].name}\` on (${b.join(', ')}) is redundant — it is a prefix of \`${idxs[i].name}\` on (${a.join(', ')}).`,
            suggestion: `Drop \`${idxs[j].name}\` — queries that can use it will use the composite index instead.`,
            sql: `ALTER TABLE ${table.name.toLowerCase()} DROP INDEX ${idxs[j].name.toLowerCase()};`,
          });
        }
      }
    }
  }

  // 2. Analyze each query for missing indexes
  for (const query of queries) {
    const upper = query.toUpperCase();

    // Build alias map
    const aliasMap: Record<string, string> = {};
    const aliasRe = /(?:FROM|JOIN)\s+[`"]?(\w+)[`"]?\s+(?:AS\s+)?[`"]?(\w+)[`"]?/gi;
    let am;
    while ((am = aliasRe.exec(query)) !== null) {
      aliasMap[am[2].toUpperCase()] = am[1].toUpperCase();
    }
    // Also direct table refs
    const fromRe = /(?:FROM|JOIN)\s+[`"]?(\w+)[`"]?(?:\s+(?:WHERE|ON|GROUP|ORDER|LIMIT|$)|\s*,|\s*$)/gi;
    let fm;
    while ((fm = fromRe.exec(query)) !== null) {
      const t = fm[1].toUpperCase();
      if (!Object.values(aliasMap).includes(t)) aliasMap[t] = t;
    }

    function resolveTable(token: string): string {
      const parts = token.split('.');
      if (parts.length === 2) {
        return aliasMap[parts[0].toUpperCase()] || parts[0].toUpperCase();
      }
      return '';
    }
    function resolveCol(token: string): string {
      const parts = token.split('.');
      return parts[parts.length - 1].toUpperCase();
    }

    // Extract WHERE columns
    const whereMatch = upper.match(/WHERE\s+([\s\S]+?)(?:ORDER\s+BY|GROUP\s+BY|HAVING|LIMIT|$)/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const condRe = /([a-z_]\w*(?:\.[a-z_]\w*)?)\s*(?:=|>=|<=|>|<|LIKE|IN\s*\(|IS\s+NULL|IS\s+NOT\s+NULL|BETWEEN)/gi;
      const byTable: Record<string, string[]> = {};
      let cm;
      while ((cm = condRe.exec(whereClause)) !== null) {
        const token = cm[1];
        if (!token.includes('.')) continue;
        const tbl = resolveTable(token);
        const col = resolveCol(token);
        if (!tbl || !tableMap[tbl]) continue;
        if (!byTable[tbl]) byTable[tbl] = [];
        if (!byTable[tbl].includes(col)) byTable[tbl].push(col);
      }

      for (const [tbl, cols] of Object.entries(byTable)) {
        const tableDef = tableMap[tbl];
        if (!tableDef) continue;

        if (cols.length === 1) {
          const col = cols[0];
          if (!isIndexedBy(col, tableDef)) {
            issues.push({
              level: 'missing',
              table: tbl,
              message: `Column \`${col.toLowerCase()}\` used in WHERE filter but has no index on \`${tbl.toLowerCase()}\`.`,
              suggestion: `Add a single-column index on \`${col.toLowerCase()}\`.`,
              sql: `CREATE INDEX idx_${tbl.toLowerCase()}_${col.toLowerCase()} ON ${tbl.toLowerCase()} (${col.toLowerCase()});`,
            });
          }
        } else if (cols.length > 1) {
          // Check if composite index exists covering these
          const hasComposite = tableDef.existingIndexes.some(idx =>
            cols.every(c => idx.columns.includes(c))
          );
          if (!hasComposite) {
            issues.push({
              level: 'missing',
              table: tbl,
              message: `Multiple WHERE columns (${cols.map(c => `\`${c.toLowerCase()}\``).join(', ')}) on \`${tbl.toLowerCase()}\` — no composite index covers them.`,
              suggestion: `Add a composite index. Put equality columns first, range columns last.`,
              sql: `CREATE INDEX idx_${tbl.toLowerCase()}_${cols.map(c => c.toLowerCase()).join('_')} ON ${tbl.toLowerCase()} (${cols.map(c => c.toLowerCase()).join(', ')});`,
            });
          }
        }
      }
    }

    // Extract JOIN ON columns (foreign key side)
    const joinRe = /JOIN\s+[`"]?(\w+)[`"]?\s+(?:AS\s+)?[`"]?(\w+)[`"]?\s+ON\s+([\w.`"]+)\s*=\s*([\w.`"]+)/gi;
    let jm2;
    while ((jm2 = joinRe.exec(query)) !== null) {
      const joinedTable = jm2[1].toUpperCase();
      const joinedAlias = jm2[2].toUpperCase();
      const leftToken = jm2[3].replace(/[`"]/g, '');
      const rightToken = jm2[4].replace(/[`"]/g, '');

      // The FK is on the joined table side
      for (const token of [leftToken, rightToken]) {
        const tbl = resolveTable(token);
        const col = resolveCol(token);
        if ((tbl === joinedTable || tbl === joinedAlias) && tableMap[joinedTable]) {
          const tableDef = tableMap[joinedTable];
          if (!isIndexedBy(col, tableDef)) {
            issues.push({
              level: 'missing',
              table: joinedTable,
              message: `JOIN foreign key \`${col.toLowerCase()}\` on \`${joinedTable.toLowerCase()}\` has no index — causes full table scan on join.`,
              suggestion: `Add an index on the foreign key column.`,
              sql: `CREATE INDEX idx_${joinedTable.toLowerCase()}_${col.toLowerCase()} ON ${joinedTable.toLowerCase()} (${col.toLowerCase()});`,
            });
          }
        }
      }
    }

    // ORDER BY
    const orderMatch = upper.match(/ORDER\s+BY\s+([\s\S]+?)(?:LIMIT|$)/i);
    if (orderMatch) {
      const orderClause = orderMatch[1];
      const colRe = /([a-z_]\w*\.[a-z_]\w*)/gi;
      let ocm;
      while ((ocm = colRe.exec(orderClause)) !== null) {
        const token = ocm[1];
        const tbl = resolveTable(token);
        const col = resolveCol(token);
        if (!tbl || !tableMap[tbl]) continue;
        const tableDef = tableMap[tbl];
        if (!isIndexedBy(col, tableDef)) {
          issues.push({
            level: 'warning',
            table: tbl,
            message: `ORDER BY column \`${col.toLowerCase()}\` on \`${tbl.toLowerCase()}\` is not indexed — filesort may occur.`,
            suggestion: `Consider adding an index on \`${col.toLowerCase()}\`, especially if combined with WHERE filters.`,
            sql: `CREATE INDEX idx_${tbl.toLowerCase()}_${col.toLowerCase()} ON ${tbl.toLowerCase()} (${col.toLowerCase()});`,
          });
        }
      }
    }
  }

  // Deduplicate by sql
  const seen = new Set<string>();
  return issues.filter(i => {
    const key = (i.sql || i.message);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const LEVEL_CONFIG = {
  missing: { label: 'Missing Index', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400', badge: 'bg-red-500/20 text-red-400' },
  redundant: { label: 'Redundant Index', bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', badge: 'bg-yellow-500/20 text-yellow-400' },
  warning: { label: 'Warning', bg: 'bg-orange-500/10 border-orange-500/30', text: 'text-orange-400', badge: 'bg-orange-500/20 text-orange-400' },
  info: { label: 'Info', bg: 'bg-blue-500/10 border-blue-500/30', text: 'text-blue-400', badge: 'bg-blue-500/20 text-blue-400' },
};

export default function DbIndexAnalyzer() {
  const [input, setInput] = useState(SAMPLE_SCHEMA);
  const [issues, setIssues] = useState<IndexIssue[] | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  function analyze() {
    setIssues(analyzeIndexes(input));
  }

  function copyAll() {
    const sqls = (issues || []).filter(i => i.sql).map(i => i.sql).join('\n');
    navigator.clipboard.writeText(sqls).then(() => {
      setCopied('all');
      setTimeout(() => setCopied(null), 1500);
    });
  }

  function copySql(sql: string, key: string) {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const missing = issues?.filter(i => i.level === 'missing') ?? [];
  const redundant = issues?.filter(i => i.level === 'redundant') ?? [];
  const warnings = issues?.filter(i => i.level === 'warning') ?? [];
  const allSqls = issues?.filter(i => i.sql) ?? [];

  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">
          Schema + Queries
          <span class="text-xs ml-2 text-text-muted/60">Paste CREATE TABLE statements followed by SELECT queries</span>
        </label>
        <textarea
          class="w-full h-72 font-mono text-sm bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:border-accent"
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder="Paste CREATE TABLE + SELECT queries here..."
          spellcheck={false}
        />
      </div>

      <button
        class="px-5 py-2 bg-accent hover:bg-accent/80 text-white font-medium rounded-lg transition-colors"
        onClick={analyze}
      >
        Analyze Indexes
      </button>

      {issues !== null && (
        <div class="space-y-4">
          {/* Summary */}
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <div class="text-2xl font-bold text-red-400">{missing.length}</div>
              <div class="text-xs text-text-muted mt-0.5">Missing Indexes</div>
            </div>
            <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <div class="text-2xl font-bold text-yellow-400">{redundant.length}</div>
              <div class="text-xs text-text-muted mt-0.5">Redundant Indexes</div>
            </div>
            <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
              <div class="text-2xl font-bold text-orange-400">{warnings.length}</div>
              <div class="text-xs text-text-muted mt-0.5">Warnings</div>
            </div>
          </div>

          {issues.length === 0 && (
            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
              No index issues found. Your schema looks well-indexed for these queries.
            </div>
          )}

          {/* Generated SQL */}
          {allSqls.length > 0 && (
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="flex items-center justify-between px-4 py-2 border-b border-border bg-surface/60">
                <span class="text-sm font-medium">Generated SQL</span>
                <button
                  class="text-xs px-2 py-1 bg-accent/20 hover:bg-accent/30 text-accent rounded transition-colors"
                  onClick={copyAll}
                >
                  {copied === 'all' ? 'Copied!' : 'Copy All'}
                </button>
              </div>
              <pre class="p-4 text-xs font-mono text-text-muted overflow-x-auto whitespace-pre-wrap">
                {allSqls.map(i => i.sql).join('\n')}
              </pre>
            </div>
          )}

          {/* Issue list */}
          {issues.length > 0 && (
            <div class="space-y-2">
              <h3 class="text-sm font-medium text-text-muted">Analysis Details</h3>
              {issues.map((issue, idx) => {
                const cfg = LEVEL_CONFIG[issue.level];
                return (
                  <div key={idx} class={`border rounded-lg p-3 ${cfg.bg}`}>
                    <div class="flex items-start gap-2">
                      <span class={`text-xs px-2 py-0.5 rounded font-medium shrink-0 mt-0.5 ${cfg.badge}`}>
                        {cfg.label}
                      </span>
                      {issue.table && (
                        <span class="text-xs px-2 py-0.5 rounded bg-surface/60 text-text-muted font-mono shrink-0 mt-0.5">
                          {issue.table.toLowerCase()}
                        </span>
                      )}
                    </div>
                    <p class="text-sm mt-2 text-text">{issue.message}</p>
                    <p class="text-xs text-text-muted mt-1">{issue.suggestion}</p>
                    {issue.sql && (
                      <div class="mt-2 flex items-center gap-2">
                        <code class="text-xs font-mono bg-surface/80 px-2 py-1 rounded text-text-muted flex-1 overflow-x-auto">
                          {issue.sql}
                        </code>
                        <button
                          class="text-xs px-2 py-1 bg-surface/80 hover:bg-surface text-text-muted rounded transition-colors shrink-0"
                          onClick={() => copySql(issue.sql!, `${idx}`)}
                        >
                          {copied === `${idx}` ? '✓' : 'Copy'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
