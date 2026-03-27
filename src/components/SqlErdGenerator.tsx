import { useState, useCallback, useRef, useEffect } from 'preact/hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Column {
  name: string;
  type: string;
  isPK: boolean;
  isFK: boolean;
  fkTable?: string;
  fkCol?: string;
}

interface Table {
  name: string;
  columns: Column[];
}

interface FKEdge {
  fromTable: string;
  fromCol: string;
  toTable: string;
  toCol: string;
}

interface ParsedSchema {
  tables: Table[];
  edges: FKEdge[];
}

interface TableLayout {
  table: Table;
  x: number;
  y: number;
  width: number;
  height: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TABLE_WIDTH = 220;
const HEADER_H = 36;
const ROW_H = 28;
const PADDING_X = 60;
const PADDING_Y = 60;
const COLS_PER_ROW = 3;

const EXAMPLE_SQL = `-- E-commerce schema example
CREATE TABLE users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) NOT NULL UNIQUE,
  name        VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE categories (
  id          INT PRIMARY KEY AUTO_INCREMENT,
  name        VARCHAR(100) NOT NULL,
  parent_id   INT,
  FOREIGN KEY (parent_id) REFERENCES categories(id)
);

CREATE TABLE products (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  price       DECIMAL(10, 2) NOT NULL,
  stock       INT DEFAULT 0,
  category_id INT,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE orders (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL,
  status      VARCHAR(50) DEFAULT 'pending',
  total       DECIMAL(10, 2),
  placed_at   TIMESTAMP DEFAULT NOW(),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id          SERIAL PRIMARY KEY,
  order_id    INT NOT NULL,
  product_id  INT NOT NULL,
  quantity    INT NOT NULL DEFAULT 1,
  unit_price  DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (product_id) REFERENCES products(id)
);
`;

// ─── SQL Parser ───────────────────────────────────────────────────────────────

function stripComments(sql: string): string {
  // Remove single-line comments
  sql = sql.replace(/--[^\n]*/g, '');
  // Remove block comments
  sql = sql.replace(/\/\*[\s\S]*?\*\//g, '');
  return sql;
}

function parseSql(sql: string): ParsedSchema {
  const tables: Table[] = [];
  const edges: FKEdge[] = [];

  const clean = stripComments(sql);

  // Match each CREATE TABLE block
  const createRe = /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["`']?(\w+)["`']?\s*\(([^;]*)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = createRe.exec(clean)) !== null) {
    const tableName = match[1];
    const body = match[2];

    const columns: Column[] = [];
    const pkCols = new Set<string>();
    const fkMap: Record<string, { table: string; col: string }> = {};

    // Split body into lines/clauses — be careful with nested parens (e.g. DECIMAL(10,2))
    const clauses = splitClauses(body);

    for (const clause of clauses) {
      const trimmed = clause.trim();
      if (!trimmed) continue;

      const upper = trimmed.toUpperCase();

      // Table-level PRIMARY KEY (...) constraint
      const pkConstraint = trimmed.match(/^(?:CONSTRAINT\s+\w+\s+)?PRIMARY\s+KEY\s*\(([^)]+)\)/i);
      if (pkConstraint) {
        pkConstraint[1].split(',').forEach(c => pkCols.add(c.trim().replace(/["`']/g, '')));
        continue;
      }

      // Table-level FOREIGN KEY (...) REFERENCES table(col)
      const fkConstraint = trimmed.match(
        /^(?:CONSTRAINT\s+\w+\s+)?FOREIGN\s+KEY\s*\(([^)]+)\)\s+REFERENCES\s+["`']?(\w+)["`']?\s*\(([^)]+)\)/i
      );
      if (fkConstraint) {
        const fromCols = fkConstraint[1].split(',').map(c => c.trim().replace(/["`']/g, ''));
        const refTable = fkConstraint[2];
        const refCols = fkConstraint[3].split(',').map(c => c.trim().replace(/["`']/g, ''));
        fromCols.forEach((fc, i) => {
          fkMap[fc] = { table: refTable, col: refCols[i] || refCols[0] };
          edges.push({ fromTable: tableName, fromCol: fc, toTable: refTable, toCol: refCols[i] || refCols[0] });
        });
        continue;
      }

      // Skip other table-level constraints (UNIQUE, CHECK, INDEX, KEY)
      if (/^(?:CONSTRAINT|UNIQUE|CHECK|INDEX|KEY|FULLTEXT|SPATIAL)\s/i.test(trimmed)) continue;

      // Column definition
      const colMatch = trimmed.match(/^["`']?(\w+)["`']?\s+([A-Za-z_][A-Za-z0-9_]*(?:\s*\([^)]*\))?(?:\s+(?:UNSIGNED|ZEROFILL|BINARY))*)/i);
      if (colMatch) {
        const colName = colMatch[1];
        const colType = normalizeType(colMatch[2]);
        const isInlinePK = /\bPRIMARY\s+KEY\b/i.test(trimmed);
        const isAutoIncrementPK = /\bAUTO_INCREMENT\b|\bSERIAL\b/i.test(trimmed) && /\bPRIMARY\s+KEY\b/i.test(trimmed);

        if (isInlinePK || isAutoIncrementPK) pkCols.add(colName);

        // Inline REFERENCES (rare but valid)
        const inlineRef = trimmed.match(/\bREFERENCES\s+["`']?(\w+)["`']?\s*\(([^)]+)\)/i);
        if (inlineRef) {
          const refTable = inlineRef[1];
          const refCol = inlineRef[2].trim().replace(/["`']/g, '');
          fkMap[colName] = { table: refTable, col: refCol };
          edges.push({ fromTable: tableName, fromCol: colName, toTable: refTable, toCol: refCol });
        }

        columns.push({ name: colName, type: colType, isPK: false, isFK: false });
      }
    }

    // Apply PK/FK flags
    for (const col of columns) {
      if (pkCols.has(col.name)) col.isPK = true;
      if (fkMap[col.name]) {
        col.isFK = true;
        col.fkTable = fkMap[col.name].table;
        col.fkCol = fkMap[col.name].col;
      }
    }

    tables.push({ name: tableName, columns });
  }

  return { tables, edges };
}

function splitClauses(body: string): string[] {
  const clauses: string[] = [];
  let depth = 0;
  let current = '';

  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === '(') { depth++; current += ch; }
    else if (ch === ')') { depth--; current += ch; }
    else if (ch === ',' && depth === 0) {
      clauses.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  if (current.trim()) clauses.push(current.trim());
  return clauses;
}

function normalizeType(raw: string): string {
  // Shorten common verbose types for display
  return raw
    .replace(/CHARACTER\s+VARYING/i, 'VARCHAR')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
}

// ─── Layout ───────────────────────────────────────────────────────────────────

function layoutTables(tables: Table[]): TableLayout[] {
  const layouts: TableLayout[] = [];

  tables.forEach((table, i) => {
    const col = i % COLS_PER_ROW;
    const row = Math.floor(i / COLS_PER_ROW);
    const tableH = HEADER_H + table.columns.length * ROW_H + 8;
    layouts.push({
      table,
      x: PADDING_X + col * (TABLE_WIDTH + PADDING_X),
      y: PADDING_Y + row * (200 + PADDING_Y),
      width: TABLE_WIDTH,
      height: tableH,
    });
  });

  return layouts;
}

function getColumnYCenter(layout: TableLayout, colIndex: number): number {
  return layout.y + HEADER_H + colIndex * ROW_H + ROW_H / 2;
}

function buildEdgePaths(
  edges: FKEdge[],
  layouts: TableLayout[]
): Array<{ d: string; key: string }> {
  const layoutMap: Record<string, TableLayout> = {};
  for (const l of layouts) layoutMap[l.table.name] = l;

  const paths: Array<{ d: string; key: string }> = [];

  for (const edge of edges) {
    const from = layoutMap[edge.fromTable];
    const to = layoutMap[edge.toTable];
    if (!from || !to) continue;

    const fromColIdx = from.table.columns.findIndex(c => c.name === edge.fromCol);
    const toColIdx = to.table.columns.findIndex(c => c.name === edge.toCol);
    if (fromColIdx === -1 || toColIdx === -1) continue;

    const fy = getColumnYCenter(from, fromColIdx);
    const ty = getColumnYCenter(to, toColIdx);

    // Decide whether to connect from left or right side
    const fromRight = from.x + from.width;
    const toRight = to.x + to.width;

    let x1: number, x2: number;
    if (from.x > to.x) {
      x1 = from.x;
      x2 = toRight;
    } else {
      x1 = fromRight;
      x2 = to.x;
    }

    // Cubic bezier curve
    const mx = (x1 + x2) / 2;
    const d = `M ${x1} ${fy} C ${mx} ${fy}, ${mx} ${ty}, ${x2} ${ty}`;

    paths.push({ d, key: `${edge.fromTable}.${edge.fromCol}->${edge.toTable}.${edge.toCol}` });
  }

  return paths;
}

// ─── SVG Serializer ──────────────────────────────────────────────────────────

function buildSvgString(layouts: TableLayout[], edgePaths: Array<{ d: string; key: string }>, svgW: number, svgH: number): string {
  const tablesSvg = layouts.map(({ table, x, y, width, height }) => {
    const colRows = table.columns.map((col, ci) => {
      const cy = y + HEADER_H + ci * ROW_H;
      const icon = col.isPK ? '🔑 ' : col.isFK ? '🔗 ' : '    ';
      const fontWeight = col.isPK ? 'font-weight="600"' : '';
      return `<rect x="${x}" y="${cy}" width="${width}" height="${ROW_H}" fill="${ci % 2 === 0 ? '#1e293b' : '#172032'}" />
<text x="${x + 10}" y="${cy + 18}" font-family="monospace" font-size="12" fill="${col.isPK ? '#f8c55d' : col.isFK ? '#60a5fa' : '#cbd5e1'}" ${fontWeight}>${escXml(icon + col.name)}</text>
<text x="${x + width - 8}" y="${cy + 18}" font-family="monospace" font-size="11" fill="#64748b" text-anchor="end">${escXml(col.type)}</text>`;
    }).join('\n');

    return `<!-- Table: ${table.name} -->
<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="8" ry="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
<rect x="${x}" y="${y}" width="${width}" height="${HEADER_H}" rx="8" ry="8" fill="#0f172a" />
<rect x="${x}" y="${y + 14}" width="${width}" height="${HEADER_H - 14}" fill="#0f172a" />
<text x="${x + width / 2}" y="${y + 23}" font-family="sans-serif" font-size="13" font-weight="700" fill="#e2e8f0" text-anchor="middle">${escXml(table.name)}</text>
${colRows}`;
  }).join('\n\n');

  const edgesSvg = edgePaths.map(({ d, key }) =>
    `<path d="${d}" fill="none" stroke="#475569" stroke-width="1.5" stroke-dasharray="5,3" marker-end="url(#arrowhead)"/>`
  ).join('\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}" style="background:#0f172a">
  <defs>
    <marker id="arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
      <polygon points="0 0, 8 3, 0 6" fill="#475569"/>
    </marker>
  </defs>
  ${edgesSvg}
  ${tablesSvg}
</svg>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function SqlErdGenerator() {
  const [sql, setSql] = useState('');
  const [schema, setSchema] = useState<ParsedSchema | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Pan/zoom state
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleParse = useCallback((value: string) => {
    setSql(value);
    if (!value.trim()) {
      setSchema(null);
      setError('');
      return;
    }
    try {
      const parsed = parseSql(value);
      if (parsed.tables.length === 0) {
        setError('No CREATE TABLE statements found. Make sure your SQL includes valid CREATE TABLE syntax.');
        setSchema(null);
      } else {
        setSchema(parsed);
        setError('');
        setScale(1);
        setPan({ x: 0, y: 0 });
      }
    } catch (e: any) {
      setError('Parse error: ' + (e.message || 'unknown error'));
      setSchema(null);
    }
  }, []);

  const loadExample = useCallback(() => {
    handleParse(EXAMPLE_SQL);
  }, [handleParse]);

  const clearAll = useCallback(() => {
    setSql('');
    setSchema(null);
    setError('');
    setScale(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Compute layout
  const layouts = schema ? layoutTables(schema.tables) : [];
  const edgePaths = schema ? buildEdgePaths(schema.edges, layouts) : [];

  const svgW = layouts.length > 0
    ? Math.max(...layouts.map(l => l.x + l.width)) + PADDING_X
    : 600;
  const svgH = layouts.length > 0
    ? Math.max(...layouts.map(l => l.y + l.height)) + PADDING_Y
    : 400;

  const svgString = schema ? buildSvgString(layouts, edgePaths, svgW, svgH) : '';

  // Copy SVG
  const copySvg = useCallback(() => {
    if (!svgString) return;
    navigator.clipboard.writeText(svgString).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [svgString]);

  // Pan handlers
  const onMouseDown = useCallback((e: MouseEvent) => {
    if ((e.target as Element).tagName === 'TEXTAREA') return;
    isPanning.current = true;
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    (e.currentTarget as HTMLElement).style.cursor = 'grabbing';
  }, [pan]);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!isPanning.current) return;
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y });
  }, []);

  const onMouseUp = useCallback((e: MouseEvent) => {
    isPanning.current = false;
    (e.currentTarget as HTMLElement).style.cursor = 'grab';
  }, []);

  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(3, Math.max(0.2, s * delta)));
  }, []);

  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;
    const handler = (e: WheelEvent) => { e.preventDefault(); };
    container.addEventListener('wheel', handler, { passive: false });
    return () => container.removeEventListener('wheel', handler);
  }, []);

  const tableCount = schema?.tables.length ?? 0;
  const fkCount = schema?.edges.length ?? 0;

  return (
    <div class="space-y-4">
      {/* Input area */}
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
          <label class="text-sm font-medium text-text-muted">SQL CREATE TABLE Statements</label>
          <div class="flex gap-2 flex-wrap">
            <button
              onClick={loadExample}
              class="px-3 py-1.5 text-xs rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors"
            >
              Load Example Schema
            </button>
            <button
              onClick={clearAll}
              class="px-3 py-1.5 text-xs rounded border border-border text-text-muted hover:bg-bg-hover transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
        <textarea
          value={sql}
          onInput={(e) => handleParse((e.target as HTMLTextAreaElement).value)}
          placeholder={`CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  email VARCHAR(255) NOT NULL,\n  ...\n);\n\nCREATE TABLE orders (\n  id SERIAL PRIMARY KEY,\n  user_id INT,\n  FOREIGN KEY (user_id) REFERENCES users(id)\n);`}
          class="w-full h-48 font-mono text-sm bg-bg-input border border-border rounded-lg p-3 text-text resize-y focus:outline-none focus:ring-2 focus:ring-accent/50"
          spellcheck={false}
        />
        <p class="mt-1.5 text-xs text-text-muted">
          Supports PostgreSQL, MySQL, SQLite — inline PRIMARY KEY, table-level PRIMARY KEY (...), and FOREIGN KEY (...) REFERENCES table(col)
        </p>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-900/20 border border-red-700/40 rounded-lg p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Stats bar */}
      {schema && tableCount > 0 && (
        <div class="flex items-center gap-4 flex-wrap">
          <span class="text-sm text-text-muted">
            <span class="font-semibold text-text">{tableCount}</span> table{tableCount !== 1 ? 's' : ''}
          </span>
          <span class="text-sm text-text-muted">
            <span class="font-semibold text-text">{schema.tables.reduce((s, t) => s + t.columns.length, 0)}</span> columns total
          </span>
          <span class="text-sm text-text-muted">
            <span class="font-semibold text-text">{fkCount}</span> relationship{fkCount !== 1 ? 's' : ''}
          </span>
          <div class="ml-auto flex gap-2">
            <button
              onClick={() => setScale(s => Math.min(3, s * 1.2))}
              class="px-2.5 py-1 text-xs rounded border border-border text-text-muted hover:bg-bg-hover transition-colors"
              title="Zoom in"
            >
              + Zoom
            </button>
            <button
              onClick={() => setScale(s => Math.max(0.2, s * 0.8))}
              class="px-2.5 py-1 text-xs rounded border border-border text-text-muted hover:bg-bg-hover transition-colors"
              title="Zoom out"
            >
              − Zoom
            </button>
            <button
              onClick={() => { setScale(1); setPan({ x: 0, y: 0 }); }}
              class="px-2.5 py-1 text-xs rounded border border-border text-text-muted hover:bg-bg-hover transition-colors"
            >
              Reset View
            </button>
            <button
              onClick={copySvg}
              class="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/80 transition-colors"
            >
              {copied ? 'Copied!' : 'Copy SVG'}
            </button>
          </div>
        </div>
      )}

      {/* Diagram canvas */}
      {schema && tableCount > 0 && (
        <div
          ref={svgContainerRef}
          class="relative border border-border rounded-xl overflow-hidden bg-[#0f172a]"
          style={{ height: '520px', cursor: 'grab' }}
          onMouseDown={onMouseDown as any}
          onMouseMove={onMouseMove as any}
          onMouseUp={onMouseUp as any}
          onMouseLeave={onMouseUp as any}
          onWheel={onWheel as any}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              willChange: 'transform',
              display: 'inline-block',
            }}
            dangerouslySetInnerHTML={{ __html: svgString }}
          />
          <div class="absolute bottom-2 right-3 text-xs text-slate-500 pointer-events-none select-none">
            Scroll to zoom · Drag to pan
          </div>
        </div>
      )}

      {/* Legend */}
      {schema && tableCount > 0 && (
        <div class="flex items-center gap-5 text-xs text-text-muted flex-wrap px-1">
          <span class="flex items-center gap-1.5">
            <span class="text-yellow-400 font-bold">🔑</span> Primary Key
          </span>
          <span class="flex items-center gap-1.5">
            <span class="text-blue-400">🔗</span> Foreign Key
          </span>
          <span class="flex items-center gap-1.5">
            <svg width="28" height="10" viewBox="0 0 28 10">
              <line x1="0" y1="5" x2="24" y2="5" stroke="#475569" stroke-width="1.5" stroke-dasharray="4,2"/>
              <polygon points="20,2 28,5 20,8" fill="#475569"/>
            </svg>
            Relationship (FK → PK)
          </span>
        </div>
      )}

      {/* Empty state */}
      {!schema && !error && (
        <div class="border border-dashed border-border rounded-xl p-10 text-center text-text-muted">
          <div class="text-4xl mb-3 opacity-50">🗄️</div>
          <p class="text-sm mb-1">Paste SQL CREATE TABLE statements above to generate your ERD diagram</p>
          <button
            onClick={loadExample}
            class="mt-3 text-xs text-accent hover:underline"
          >
            Or click "Load Example Schema" to try a demo
          </button>
        </div>
      )}

      {/* Table summary cards */}
      {schema && tableCount > 0 && (
        <div class="border-t border-border pt-4">
          <h3 class="text-sm font-semibold text-text-muted mb-3 uppercase tracking-wide">Table Summary</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {schema.tables.map(table => (
              <div key={table.name} class="bg-bg-card border border-border rounded-lg p-3">
                <div class="font-mono text-sm font-bold text-text mb-2">{table.name}</div>
                <ul class="space-y-0.5">
                  {table.columns.map(col => (
                    <li key={col.name} class="flex items-center gap-1.5 text-xs font-mono">
                      {col.isPK
                        ? <span class="text-yellow-400">🔑</span>
                        : col.isFK
                        ? <span class="text-blue-400">🔗</span>
                        : <span class="w-4 inline-block" />
                      }
                      <span class={col.isPK ? 'text-yellow-300 font-semibold' : col.isFK ? 'text-blue-300' : 'text-text-muted'}>
                        {col.name}
                      </span>
                      <span class="text-text-muted/50 ml-auto">{col.type}</span>
                    </li>
                  ))}
                </ul>
                {table.columns.filter(c => c.isFK).map(col => (
                  <div key={col.name} class="mt-1.5 text-xs text-slate-500">
                    {col.name} → {col.fkTable}.{col.fkCol}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
