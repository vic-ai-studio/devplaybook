import { useState } from 'preact/hooks';

interface Column {
  name: string;
  type: string;
  isPrimaryKey: boolean;
  isNotNull: boolean;
  isUnique: boolean;
  foreignKey: { table: string; column: string } | null;
  defaultValue: string | null;
}

interface Table {
  name: string;
  columns: Column[];
}

const SAMPLE_SQL = `CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title VARCHAR(255) NOT NULL,
  body TEXT,
  published_at TIMESTAMP
);

CREATE TABLE comments (
  id INTEGER PRIMARY KEY,
  post_id INTEGER NOT NULL REFERENCES posts(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);`;

function parseSql(sql: string): { tables: Table[]; errors: string[] } {
  const tables: Table[] = [];
  const errors: string[] = [];

  // Normalize line endings and remove block comments
  const normalized = sql
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/--[^\n]*/g, '');

  // Extract CREATE TABLE blocks
  const tableRegex = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:`|"|\[)?(\w+)(?:`|"|\])?[\s\n]*\(([\s\S]*?)\)\s*;/gi;
  let match: RegExpExecArray | null;

  while ((match = tableRegex.exec(normalized)) !== null) {
    const tableName = match[1];
    const body = match[2];

    try {
      const columns = parseColumns(body, tableName);
      tables.push({ name: tableName, columns });
    } catch (e) {
      errors.push(`Error parsing table "${tableName}": ${(e as Error).message}`);
    }
  }

  if (tables.length === 0 && errors.length === 0) {
    errors.push('No valid CREATE TABLE statements found. Make sure each statement ends with a semicolon.');
  }

  return { tables, errors };
}

function parseColumns(body: string, _tableName: string): Column[] {
  const columns: Column[] = [];

  // Track table-level primary keys and foreign keys
  const tablePrimaryKeys: string[] = [];
  const tableForeignKeys: Array<{ column: string; refTable: string; refColumn: string }> = [];

  // Split by commas that are NOT inside parentheses
  const lines = splitByTopLevelComma(body);

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    const upper = line.toUpperCase();

    // Table-level PRIMARY KEY constraint
    if (/^PRIMARY\s+KEY/i.test(line)) {
      const pkCols = extractParenContent(line);
      if (pkCols) {
        pkCols.split(',').forEach(c => {
          const col = c.trim().replace(/[`"[\]]/g, '');
          if (col) tablePrimaryKeys.push(col.toLowerCase());
        });
      }
      continue;
    }

    // Table-level FOREIGN KEY constraint
    if (/^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY/i.test(line)) {
      const fkMatch = line.match(/FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+(?:`|"|\[)?(\w+)(?:`|"|\])?\s*\(([^)]+)\)/i);
      if (fkMatch) {
        const cols = fkMatch[1].split(',').map(c => c.trim().replace(/[`"[\]]/g, '').toLowerCase());
        const refTable = fkMatch[2];
        const refCols = fkMatch[3].split(',').map(c => c.trim().replace(/[`"[\]]/g, ''));
        cols.forEach((col, i) => {
          tableForeignKeys.push({ column: col, refTable, refColumn: refCols[i] || refCols[0] });
        });
      }
      continue;
    }

    // Skip UNIQUE, CHECK, INDEX table-level constraints
    if (/^(?:UNIQUE|CHECK|INDEX|KEY|CONSTRAINT)\b/i.test(line) && !/^CONSTRAINT\s+\w+\s+FOREIGN\s+KEY/i.test(line)) {
      // Handle table-level UNIQUE — mark columns
      if (/^UNIQUE\s*\(/i.test(line)) {
        // We'll handle this later when applying to columns
      }
      continue;
    }

    // Parse column definition
    const col = parseColumnDef(line);
    if (col) {
      columns.push(col);
    }
  }

  // Apply table-level constraints to columns
  for (const col of columns) {
    if (tablePrimaryKeys.includes(col.name.toLowerCase())) {
      col.isPrimaryKey = true;
      col.isNotNull = true;
    }
    const fk = tableForeignKeys.find(f => f.column === col.name.toLowerCase());
    if (fk) {
      col.foreignKey = { table: fk.refTable, column: fk.refColumn };
    }
  }

  return columns;
}

function parseColumnDef(line: string): Column | null {
  // Match: [name] TYPE(...) constraints...
  // Column name may be quoted
  const colMatch = line.match(/^(?:`|"|\[)?(\w+)(?:`|"|\])?\s+(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?(?:\s+(?:UNSIGNED|SIGNED|ZEROFILL|BINARY|CHARACTER\s+SET\s+\w+|COLLATE\s+\w+))*)/i);
  if (!colMatch) return null;

  const name = colMatch[1];
  // Skip if it looks like a keyword that starts a constraint
  const upperName = name.toUpperCase();
  if (['PRIMARY', 'FOREIGN', 'UNIQUE', 'CHECK', 'INDEX', 'KEY', 'CONSTRAINT'].includes(upperName)) {
    return null;
  }

  const typeRaw = colMatch[2].trim();
  // Clean up type — keep base type + size
  const typeMatch = typeRaw.match(/^(\w+(?:\s*\([^)]*\))?(?:\s*\[\])?)/);
  const type = typeMatch ? typeMatch[1].trim() : typeRaw;

  const rest = line.slice(colMatch[0].length).trim();
  const upper = rest.toUpperCase();

  const isPrimaryKey = /\bPRIMARY\s+KEY\b/i.test(rest);
  const isNotNull = /\bNOT\s+NULL\b/i.test(rest) || isPrimaryKey;
  const isUnique = /\bUNIQUE\b/i.test(rest);

  // Parse REFERENCES
  let foreignKey: { table: string; column: string } | null = null;
  const refMatch = rest.match(/\bREFERENCES\s+(?:`|"|\[)?(\w+)(?:`|"|\])?\s*\(\s*(?:`|"|\[)?(\w+)(?:`|"|\])?\s*\)/i);
  if (refMatch) {
    foreignKey = { table: refMatch[1], column: refMatch[2] };
  }

  // Parse DEFAULT
  let defaultValue: string | null = null;
  const defaultMatch = rest.match(/\bDEFAULT\s+([^\s,]+(?:\([^)]*\))?)/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1];
  }

  return { name, type, isPrimaryKey, isNotNull, isUnique, foreignKey, defaultValue };
}

function splitByTopLevelComma(input: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function extractParenContent(line: string): string | null {
  const m = line.match(/\(([^)]+)\)/);
  return m ? m[1] : null;
}

function PkBadge() {
  return (
    <span class="inline-flex items-center bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">
      PK
    </span>
  );
}

function FkBadge() {
  return (
    <span class="inline-flex items-center bg-blue-500/20 text-blue-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">
      FK
    </span>
  );
}

function UniqueBadge() {
  return (
    <span class="inline-flex items-center bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">
      UQ
    </span>
  );
}

function TableCard({ table }: { table: Table }) {
  return (
    <div class="bg-bg-card border border-border rounded-lg overflow-hidden shadow-sm min-w-[260px] max-w-[420px] flex-1">
      {/* Table header */}
      <div class="bg-primary/10 border-b border-border px-4 py-2.5 flex items-center gap-2">
        <span class="text-base font-bold font-mono text-text">{table.name}</span>
        <span class="text-xs text-text-muted ml-auto">{table.columns.length} col{table.columns.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Columns */}
      <div class="divide-y divide-border/50">
        {table.columns.map((col) => (
          <div key={col.name} class="px-4 py-2 flex items-start gap-2 hover:bg-surface/50 transition-colors">
            {/* Badges */}
            <div class="flex items-center gap-1 mt-0.5 shrink-0">
              {col.isPrimaryKey && <PkBadge />}
              {col.foreignKey && <FkBadge />}
              {col.isUnique && !col.isPrimaryKey && <UniqueBadge />}
            </div>

            {/* Column info */}
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 flex-wrap">
                <span class="font-mono text-sm font-medium text-text">{col.name}</span>
                <span class="font-mono text-xs text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded">
                  {col.type}
                </span>
              </div>

              {/* Constraints row */}
              <div class="flex flex-wrap items-center gap-2 mt-0.5">
                {col.isNotNull && !col.isPrimaryKey && (
                  <span class="text-xs text-text-muted">NOT NULL</span>
                )}
                {col.defaultValue && (
                  <span class="text-xs text-text-muted">
                    DEFAULT <code class="font-mono">{col.defaultValue}</code>
                  </span>
                )}
                {col.foreignKey && (
                  <span class="text-xs text-blue-400 font-mono">
                    → {col.foreignKey.table}.{col.foreignKey.column}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {table.columns.length === 0 && (
          <div class="px-4 py-3 text-xs text-text-muted italic">No columns parsed</div>
        )}
      </div>
    </div>
  );
}

export default function DbSchemaVisualizer() {
  const [sql, setSql] = useState('');
  const [tables, setTables] = useState<Table[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [hasVisualized, setHasVisualized] = useState(false);

  function handleVisualize() {
    if (!sql.trim()) {
      setErrors(['Please enter some SQL to visualize.']);
      setTables([]);
      setHasVisualized(true);
      return;
    }
    const result = parseSql(sql);
    setTables(result.tables);
    setErrors(result.errors);
    setHasVisualized(true);
  }

  function handleClear() {
    setSql('');
    setTables([]);
    setErrors([]);
    setHasVisualized(false);
  }

  function handleLoadExample() {
    setSql(SAMPLE_SQL);
    setTables([]);
    setErrors([]);
    setHasVisualized(false);
  }

  return (
    <div class="space-y-4">
      {/* Textarea */}
      <div class="relative">
        <label class="block text-sm font-medium text-text-muted mb-1.5">
          SQL CREATE TABLE Statements
        </label>
        <textarea
          class="w-full h-52 font-mono text-sm bg-surface border border-border rounded-lg px-4 py-3 text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 resize-y transition-colors"
          placeholder={"CREATE TABLE users (\n  id INTEGER PRIMARY KEY,\n  email VARCHAR(255) NOT NULL UNIQUE\n);"}
          value={sql}
          onInput={(e) => setSql((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
      </div>

      {/* Actions */}
      <div class="flex flex-wrap items-center gap-2">
        <button
          onClick={handleVisualize}
          class="inline-flex items-center gap-2 bg-primary hover:bg-primary/90 text-white font-semibold text-sm px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M3 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h14a1 1 0 100-2H3zm0 4a1 1 0 000 2h8a1 1 0 100-2H3z" />
          </svg>
          Visualize Schema
        </button>

        <button
          onClick={handleLoadExample}
          class="inline-flex items-center gap-2 bg-surface hover:bg-border border border-border text-text-muted hover:text-text font-medium text-sm px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          Load Example
        </button>

        {(sql || hasVisualized) && (
          <button
            onClick={handleClear}
            class="inline-flex items-center gap-2 bg-surface hover:bg-border border border-border text-text-muted hover:text-text font-medium text-sm px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 space-y-1">
          {errors.map((err, i) => (
            <p key={i} class="text-sm text-red-400 flex items-start gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
              </svg>
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Results */}
      {tables.length > 0 && (
        <div class="space-y-3">
          {/* Summary bar */}
          <div class="flex items-center gap-4 text-sm text-text-muted border-b border-border pb-3">
            <span class="font-medium text-text">{tables.length} table{tables.length !== 1 ? 's' : ''} parsed</span>
            <span>{tables.reduce((sum, t) => sum + t.columns.length, 0)} total columns</span>
            <span>
              {tables.reduce((sum, t) => sum + t.columns.filter(c => c.foreignKey).length, 0)} FK relationship{tables.reduce((sum, t) => sum + t.columns.filter(c => c.foreignKey).length, 0) !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Legend */}
          <div class="flex flex-wrap items-center gap-3 text-xs text-text-muted">
            <span class="font-medium">Legend:</span>
            <span class="flex items-center gap-1">
              <span class="inline-flex items-center bg-yellow-500/20 text-yellow-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">PK</span>
              Primary Key
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-flex items-center bg-blue-500/20 text-blue-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">FK</span>
              Foreign Key
            </span>
            <span class="flex items-center gap-1">
              <span class="inline-flex items-center bg-purple-500/20 text-purple-400 text-xs px-1.5 py-0.5 rounded font-mono font-semibold">UQ</span>
              Unique
            </span>
            <span class="flex items-center gap-1 font-mono text-blue-400">→ table.col</span>
            <span>FK reference target</span>
          </div>

          {/* Table cards */}
          <div class="flex flex-wrap gap-4">
            {tables.map((table) => (
              <TableCard key={table.name} table={table} />
            ))}
          </div>
        </div>
      )}

      {/* Empty state after visualize with no results */}
      {hasVisualized && tables.length === 0 && errors.length === 0 && (
        <div class="text-center py-10 text-text-muted text-sm">
          No tables found. Check your SQL syntax and try again.
        </div>
      )}
    </div>
  );
}
