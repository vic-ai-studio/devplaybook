import { useState, useMemo } from 'preact/hooks';

type JoinType = 'inner' | 'left' | 'right' | 'full';
type OrderDir = 'asc' | 'desc';
type AggFn = '' | 'count' | 'sum' | 'avg' | 'min' | 'max';

interface Column {
  id: string;
  name: string;
  selected: boolean;
  alias: string;
  agg: AggFn;
}

interface WhereClause {
  id: string;
  column: string;
  op: string;
  value: string;
  connector: 'and' | 'or';
}

interface JoinClause {
  id: string;
  type: JoinType;
  table: string;
  onLeft: string;
  onRight: string;
}

interface OrderClause {
  id: string;
  column: string;
  dir: OrderDir;
}

const WHERE_OPS = ['=', '!=', '<', '>', '<=', '>=', 'like', 'not like', 'in', 'is null', 'is not null'];
const JOIN_TYPES: JoinType[] = ['inner', 'left', 'right', 'full'];

let nextId = 1;
const uid = () => String(nextId++);

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function camelCase(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function generateKyselyCode(
  table: string,
  columns: Column[],
  wheres: WhereClause[],
  joins: JoinClause[],
  orders: OrderClause[],
  limit: number | null,
  offset: number | null,
): string {
  if (!table) return '// Enter a table name to generate a query';

  const selectedCols = columns.filter((c) => c.selected);
  const lines: string[] = [];

  lines.push(`import { db } from './database'; // your Kysely db instance`);
  lines.push('');

  // Interface generation
  const interfaceName = table
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');

  if (selectedCols.length > 0) {
    lines.push(`interface ${interfaceName}Row {`);
    for (const col of selectedCols) {
      const colName = col.alias || col.name;
      lines.push(`  ${camelCase(colName)}: string | number | null; // adjust type as needed`);
    }
    lines.push(`}`);
    lines.push('');
  }

  lines.push(`const result = await db`);
  lines.push(`  .selectFrom('${table}')`);

  if (selectedCols.length === 0) {
    lines.push(`  .selectAll()`);
  } else {
    const selects = selectedCols.map((col) => {
      if (col.agg) {
        const expr = col.agg === 'count'
          ? `db.fn.count('${col.name}')`
          : `db.fn.${col.agg}('${col.name}')`;
        return col.alias ? `${expr}.as('${col.alias}')` : expr;
      }
      return col.alias ? `'${table}.${col.name} as ${col.alias}'` : `'${table}.${col.name}'`;
    });
    if (selects.length === 1) {
      lines.push(`  .select(${selects[0]})`);
    } else {
      lines.push(`  .select([`);
      selects.forEach((s, i) => {
        lines.push(`    ${s}${i < selects.length - 1 ? ',' : ''}`);
      });
      lines.push(`  ])`);
    }
  }

  // JOINs
  for (const join of joins) {
    if (!join.table || !join.onLeft || !join.onRight) continue;
    const method =
      join.type === 'inner'
        ? 'innerJoin'
        : join.type === 'left'
        ? 'leftJoin'
        : join.type === 'right'
        ? 'rightJoin'
        : 'fullJoin';
    lines.push(`  .${method}('${join.table}', '${join.onLeft}', '${join.onRight}')`);
  }

  // WHERE clauses
  const validWheres = wheres.filter((w) => w.column && (w.op.includes('null') || w.value !== ''));
  for (let i = 0; i < validWheres.length; i++) {
    const w = validWheres[i];
    const method = i === 0 ? 'where' : w.connector === 'and' ? 'where' : 'orWhere';
    if (w.op === 'is null' || w.op === 'is not null') {
      lines.push(`  .${method}('${w.column}', '${w.op === 'is null' ? 'is' : 'is not'}', null)`);
    } else if (w.op === 'in') {
      const vals = w.value.split(',').map((v) => `'${v.trim()}'`).join(', ');
      lines.push(`  .${method}('${w.column}', 'in', [${vals}])`);
    } else if (w.op === 'like' || w.op === 'not like') {
      lines.push(`  .${method}('${w.column}', '${w.op}', '%${w.value}%')`);
    } else {
      lines.push(`  .${method}('${w.column}', '${w.op}', '${w.value}')`);
    }
  }

  // ORDER BY
  for (const o of orders) {
    if (!o.column) continue;
    lines.push(`  .orderBy('${o.column}', '${o.dir}')`);
  }

  // LIMIT / OFFSET
  if (limit !== null) lines.push(`  .limit(${limit})`);
  if (offset !== null) lines.push(`  .offset(${offset})`);

  lines.push(`  .execute();`);

  return lines.join('\n');
}

function generateTypeInterface(table: string, columns: Column[]): string {
  if (!table) return '';
  const name = table
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join('');
  const fields = columns.map((c) => `  ${c.name}: Generated<number> | string | null;`);
  return `// Database schema type (add to your Database interface)\ninterface ${name}Table {\n${fields.join('\n')}\n}\n\ninterface Database {\n  ${table}: ${name}Table;\n  // ...other tables\n}`;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: uid(), name: 'id', selected: true, alias: '', agg: '' },
  { id: uid(), name: 'name', selected: true, alias: '', agg: '' },
  { id: uid(), name: 'email', selected: true, alias: '', agg: '' },
  { id: uid(), name: 'created_at', selected: false, alias: '', agg: '' },
];

export default function KyselyQueryBuilder() {
  const [table, setTable] = useState('users');
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [newColName, setNewColName] = useState('');
  const [wheres, setWheres] = useState<WhereClause[]>([]);
  const [joins, setJoins] = useState<JoinClause[]>([]);
  const [orders, setOrders] = useState<OrderClause[]>([]);
  const [limit, setLimit] = useState<string>('');
  const [offset, setOffset] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'query' | 'types'>('query');

  const toggleColumn = (id: string) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, selected: !c.selected } : c)));
  };

  const updateColumn = (id: string, update: Partial<Column>) => {
    setColumns((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));
  };

  const addColumn = () => {
    const n = newColName.trim();
    if (!n) return;
    setColumns((prev) => [...prev, { id: uid(), name: n, selected: true, alias: '', agg: '' }]);
    setNewColName('');
  };

  const removeColumn = (id: string) => setColumns((prev) => prev.filter((c) => c.id !== id));

  const addWhere = () =>
    setWheres((prev) => [...prev, { id: uid(), column: '', op: '=', value: '', connector: 'and' }]);

  const updateWhere = (id: string, update: Partial<WhereClause>) =>
    setWheres((prev) => prev.map((w) => (w.id === id ? { ...w, ...update } : w)));

  const removeWhere = (id: string) => setWheres((prev) => prev.filter((w) => w.id !== id));

  const addJoin = () =>
    setJoins((prev) => [...prev, { id: uid(), type: 'inner', table: '', onLeft: '', onRight: '' }]);

  const updateJoin = (id: string, update: Partial<JoinClause>) =>
    setJoins((prev) => prev.map((j) => (j.id === id ? { ...j, ...update } : j)));

  const removeJoin = (id: string) => setJoins((prev) => prev.filter((j) => j.id !== id));

  const addOrder = () => setOrders((prev) => [...prev, { id: uid(), column: '', dir: 'asc' }]);

  const updateOrder = (id: string, update: Partial<OrderClause>) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...update } : o)));

  const removeOrder = (id: string) => setOrders((prev) => prev.filter((o) => o.id !== id));

  const limitNum = limit !== '' ? parseInt(limit, 10) : null;
  const offsetNum = offset !== '' ? parseInt(offset, 10) : null;

  const code = useMemo(
    () => generateKyselyCode(table, columns, wheres, joins, orders, limitNum, offsetNum),
    [table, columns, wheres, joins, orders, limitNum, offsetNum],
  );

  const typeCode = useMemo(() => generateTypeInterface(table, columns), [table, columns]);

  return (
    <div class="space-y-5">
      {/* Table name */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Table</div>
        <input
          type="text"
          value={table}
          onInput={(e: any) => setTable(e.target.value)}
          placeholder="table_name"
          class="w-full max-w-xs bg-bg border border-border rounded-lg px-3 py-2 font-mono text-sm focus:outline-none focus:border-primary"
          spellcheck={false}
        />
      </div>

      {/* Columns */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="text-sm font-semibold text-text">Columns</div>
        <div class="space-y-2">
          {columns.map((col) => (
            <div key={col.id} class="flex items-center gap-2 flex-wrap">
              <input
                type="checkbox"
                checked={col.selected}
                onChange={() => toggleColumn(col.id)}
                class="accent-primary w-4 h-4 shrink-0"
              />
              <input
                type="text"
                value={col.name}
                onInput={(e: any) => updateColumn(col.id, { name: e.target.value })}
                class="w-32 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
              <input
                type="text"
                value={col.alias}
                onInput={(e: any) => updateColumn(col.id, { alias: e.target.value })}
                placeholder="alias"
                class="w-24 bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
              <select
                value={col.agg}
                onChange={(e: any) => updateColumn(col.id, { agg: e.target.value as AggFn })}
                class="bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
              >
                <option value="">no agg</option>
                {(['count', 'sum', 'avg', 'min', 'max'] as AggFn[]).filter(Boolean).map((a) => (
                  <option key={a} value={a}>{a}()</option>
                ))}
              </select>
              <button
                onClick={() => removeColumn(col.id)}
                class="text-text-muted hover:text-red-400 text-sm px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div class="flex items-center gap-2">
          <input
            type="text"
            value={newColName}
            onInput={(e: any) => setNewColName(e.target.value)}
            onKeyDown={(e: any) => e.key === 'Enter' && addColumn()}
            placeholder="new column name"
            class="bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
            spellcheck={false}
          />
          <button
            onClick={addColumn}
            class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded-lg transition-colors"
          >
            + Add
          </button>
        </div>
      </div>

      {/* JOINs */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">JOINs</div>
          <button onClick={addJoin} class="text-xs text-primary hover:text-primary/80">+ Add JOIN</button>
        </div>
        {joins.map((j) => (
          <div key={j.id} class="flex items-center gap-2 flex-wrap">
            <select
              value={j.type}
              onChange={(e: any) => updateJoin(j.id, { type: e.target.value as JoinType })}
              class="bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary uppercase"
            >
              {JOIN_TYPES.map((t) => <option key={t} value={t}>{t.toUpperCase()} JOIN</option>)}
            </select>
            <input
              type="text"
              value={j.table}
              onInput={(e: any) => updateJoin(j.id, { table: e.target.value })}
              placeholder="join_table"
              class="w-28 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
              spellcheck={false}
            />
            <span class="text-xs text-text-muted">ON</span>
            <input
              type="text"
              value={j.onLeft}
              onInput={(e: any) => updateJoin(j.id, { onLeft: e.target.value })}
              placeholder="table.id"
              class="w-28 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
              spellcheck={false}
            />
            <span class="text-xs text-text-muted">=</span>
            <input
              type="text"
              value={j.onRight}
              onInput={(e: any) => updateJoin(j.id, { onRight: e.target.value })}
              placeholder="join_table.fk"
              class="w-28 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
              spellcheck={false}
            />
            <button onClick={() => removeJoin(j.id)} class="text-text-muted hover:text-red-400 text-sm px-1">×</button>
          </div>
        ))}
        {joins.length === 0 && <div class="text-xs text-text-muted">No JOINs added.</div>}
      </div>

      {/* WHERE */}
      <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold text-text">WHERE Conditions</div>
          <button onClick={addWhere} class="text-xs text-primary hover:text-primary/80">+ Add Condition</button>
        </div>
        {wheres.map((w, i) => (
          <div key={w.id} class="flex items-center gap-2 flex-wrap">
            {i > 0 && (
              <select
                value={w.connector}
                onChange={(e: any) => updateWhere(w.id, { connector: e.target.value })}
                class="bg-bg border border-border rounded-lg px-2 py-1 text-xs font-bold focus:outline-none focus:border-primary uppercase"
              >
                <option value="and">AND</option>
                <option value="or">OR</option>
              </select>
            )}
            <input
              type="text"
              value={w.column}
              onInput={(e: any) => updateWhere(w.id, { column: e.target.value })}
              placeholder="column"
              class="w-28 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
              spellcheck={false}
            />
            <select
              value={w.op}
              onChange={(e: any) => updateWhere(w.id, { op: e.target.value })}
              class="bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
            >
              {WHERE_OPS.map((op) => <option key={op} value={op}>{op}</option>)}
            </select>
            {!w.op.includes('null') && (
              <input
                type="text"
                value={w.value}
                onInput={(e: any) => updateWhere(w.id, { value: e.target.value })}
                placeholder="value"
                class="w-32 bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
            )}
            <button onClick={() => removeWhere(w.id)} class="text-text-muted hover:text-red-400 text-sm px-1">×</button>
          </div>
        ))}
        {wheres.length === 0 && <div class="text-xs text-text-muted">No conditions added.</div>}
      </div>

      {/* ORDER BY + LIMIT/OFFSET */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <div class="text-sm font-semibold text-text">ORDER BY</div>
            <button onClick={addOrder} class="text-xs text-primary hover:text-primary/80">+ Add</button>
          </div>
          {orders.map((o) => (
            <div key={o.id} class="flex items-center gap-2">
              <input
                type="text"
                value={o.column}
                onInput={(e: any) => updateOrder(o.id, { column: e.target.value })}
                placeholder="column"
                class="flex-1 bg-bg border border-border rounded-lg px-2 py-1 font-mono text-xs focus:outline-none focus:border-primary"
                spellcheck={false}
              />
              <select
                value={o.dir}
                onChange={(e: any) => updateOrder(o.id, { dir: e.target.value as OrderDir })}
                class="bg-bg border border-border rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-primary"
              >
                <option value="asc">ASC</option>
                <option value="desc">DESC</option>
              </select>
              <button onClick={() => removeOrder(o.id)} class="text-text-muted hover:text-red-400 text-sm px-1">×</button>
            </div>
          ))}
          {orders.length === 0 && <div class="text-xs text-text-muted">No ordering.</div>}
        </div>

        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div class="text-sm font-semibold text-text">Pagination</div>
          <div class="flex items-center gap-3">
            <div class="flex-1">
              <label class="text-xs text-text-muted mb-1 block">LIMIT</label>
              <input
                type="number"
                value={limit}
                onInput={(e: any) => setLimit(e.target.value)}
                placeholder="e.g. 20"
                class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
            <div class="flex-1">
              <label class="text-xs text-text-muted mb-1 block">OFFSET</label>
              <input
                type="number"
                value={offset}
                onInput={(e: any) => setOffset(e.target.value)}
                placeholder="e.g. 0"
                class="w-full bg-bg border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Output */}
      <div class="space-y-3">
        <div class="flex gap-2 border-b border-border pb-2">
          {(['query', 'types'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`text-sm px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === tab
                  ? 'bg-primary/20 text-primary'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'query' ? 'Kysely Query' : 'TypeScript Types'}
            </button>
          ))}
        </div>

        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
            <span class="text-xs font-mono text-text-muted">
              {activeTab === 'query' ? `${table} query` : 'database.ts'}
            </span>
            <CopyButton value={activeTab === 'query' ? code : typeCode} />
          </div>
          <pre class="p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre">
            {activeTab === 'query' ? code : typeCode}
          </pre>
        </div>
      </div>
    </div>
  );
}
