import { useState } from 'preact/hooks';

type Op = 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
type OutputMode = 'sql' | 'ts-neon' | 'ts-drizzle';

interface Column {
  name: string;
  type: string;
  nullable: boolean;
}

interface Condition {
  column: string;
  op: string;
  value: string;
}

const SAMPLE_COLUMNS: Column[] = [
  { name: 'id', type: 'uuid', nullable: false },
  { name: 'user_id', type: 'uuid', nullable: false },
  { name: 'email', type: 'text', nullable: false },
  { name: 'created_at', type: 'timestamptz', nullable: false },
  { name: 'status', type: 'text', nullable: true },
];

const PG_TYPES = ['text', 'int4', 'int8', 'uuid', 'bool', 'timestamptz', 'jsonb', 'numeric', 'varchar', 'serial'];
const COND_OPS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'ILIKE', 'IN', 'IS NULL', 'IS NOT NULL'];

function buildSql(op: Op, table: string, cols: Column[], selected: string[], conditions: Condition[], orderBy: string, limit: string): string {
  if (!table.trim()) return '-- Set a table name above';

  const safeCols = cols.filter(c => c.name.trim());
  const selCols = selected.length ? selected : ['*'];

  if (op === 'SELECT') {
    let q = `SELECT ${selCols.join(', ')}\nFROM ${table}`;
    const conds = conditions.filter(c => c.column && c.op);
    if (conds.length) {
      q += `\nWHERE ${conds.map(c => c.op === 'IS NULL' || c.op === 'IS NOT NULL' ? `${c.column} ${c.op}` : `${c.column} ${c.op} $${conds.indexOf(c) + 1}`).join('\n  AND ')}`;
    }
    if (orderBy) q += `\nORDER BY ${orderBy}`;
    if (limit) q += `\nLIMIT ${limit}`;
    q += ';';
    return q;
  }

  if (op === 'INSERT') {
    const insertCols = safeCols.filter(c => c.name !== 'id' && c.name !== 'created_at');
    const names = insertCols.map(c => c.name).join(', ');
    const vals = insertCols.map((_, i) => `$${i + 1}`).join(', ');
    return `INSERT INTO ${table} (${names})\nVALUES (${vals})\nRETURNING *;`;
  }

  if (op === 'UPDATE') {
    const updCols = safeCols.filter(c => c.name !== 'id' && c.name !== 'created_at');
    const sets = updCols.map((c, i) => `${c.name} = $${i + 1}`).join(', ');
    const pkIdx = updCols.length + 1;
    return `UPDATE ${table}\nSET ${sets}\nWHERE id = $${pkIdx}\nRETURNING *;`;
  }

  if (op === 'DELETE') {
    return `DELETE FROM ${table}\nWHERE id = $1\nRETURNING id;`;
  }

  return '';
}

function buildNeonTs(op: Op, table: string, cols: Column[], selected: string[], conditions: Condition[], orderBy: string, limit: string): string {
  const sql = buildSql(op, table, cols, selected, conditions, orderBy, limit);
  const conds = conditions.filter(c => c.column && c.op && c.op !== 'IS NULL' && c.op !== 'IS NOT NULL');

  const paramNames = op === 'SELECT'
    ? conds.map(c => `${c.column}: ${c.value || `'value'`}`)
    : cols.filter(c => c.name !== 'id' && c.name !== 'created_at').map(c => `${c.name}: ${c.type === 'bool' ? 'true' : c.type === 'int4' || c.type === 'int8' || c.type === 'numeric' ? '0' : `'value'`}`);

  const paramArr = op === 'SELECT'
    ? conds.map(c => c.value || `${c.column}Value`)
    : cols.filter(c => c.name !== 'id' && c.name !== 'created_at').map(c => c.name);

  return `import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

// ${op} from ${table || 'your_table'}
${paramNames.length ? `interface Params {\n  ${paramNames.join(';\n  ')};\n}\n\n` : ''}async function ${op.toLowerCase()}${table ? table.charAt(0).toUpperCase() + table.slice(1).replace(/_([a-z])/g, g => g[1].toUpperCase()) : 'Data'}(${paramNames.length ? `params: Params` : ''}) {
  const result = await sql\`
    ${sql.split('\n').join('\n    ')}
  \`${paramArr.length ? `\n  // Params: ${paramArr.join(', ')}` : ''};
  return result;
}`;
}

function buildDrizzleTs(op: Op, table: string, cols: Column[]): string {
  if (!table) return '// Set a table name above';
  const schemaName = table.replace(/_([a-z])/g, g => g[1].toUpperCase());
  const columnDefs = cols.filter(c => c.name).map(c => {
    const t = c.type === 'uuid' ? 'uuid' : c.type === 'bool' ? 'boolean' : c.type === 'jsonb' ? 'jsonb' : c.type === 'timestamptz' ? 'timestamp' : c.type === 'int4' || c.type === 'serial' ? 'integer' : c.type === 'int8' ? 'bigint' : 'text';
    const extras = c.name === 'id' ? '.primaryKey().defaultRandom()' : c.nullable ? '.notNull()' : '';
    return `  ${c.name}: ${t}('${c.name}')${extras},`;
  });

  return `import { pgTable, uuid, text, boolean, jsonb, timestamp, integer } from 'drizzle-orm/pg-core';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

// Schema
export const ${schemaName} = pgTable('${table}', {
${columnDefs.join('\n')}
});

// ${op === 'SELECT' ? 'Query' : op === 'INSERT' ? 'Insert' : op === 'UPDATE' ? 'Update' : 'Delete'}
${op === 'SELECT' ? `const rows = await db.select().from(${schemaName}).limit(50);` : op === 'INSERT' ? `const [row] = await db.insert(${schemaName}).values({ /* your data */ }).returning();` : op === 'UPDATE' ? `const [row] = await db.update(${schemaName}).set({ /* fields */ }).where(eq(${schemaName}.id, id)).returning();` : `await db.delete(${schemaName}).where(eq(${schemaName}.id, id));`}`;
}

export default function NeonDbQueryBuilder() {
  const [op, setOp] = useState<Op>('SELECT');
  const [table, setTable] = useState('users');
  const [cols, setCols] = useState<Column[]>(SAMPLE_COLUMNS);
  const [selected, setSelected] = useState<string[]>(['id', 'email', 'status', 'created_at']);
  const [conditions, setConditions] = useState<Condition[]>([{ column: 'status', op: '=', value: "'active'" }]);
  const [orderBy, setOrderBy] = useState('created_at DESC');
  const [limit, setLimit] = useState('50');
  const [outputMode, setOutputMode] = useState<OutputMode>('ts-neon');
  const [copied, setCopied] = useState(false);
  const [newCol, setNewCol] = useState({ name: '', type: 'text', nullable: false });

  const output = outputMode === 'sql'
    ? buildSql(op, table, cols, selected, conditions, orderBy, limit)
    : outputMode === 'ts-neon'
    ? buildNeonTs(op, table, cols, selected, conditions, orderBy, limit)
    : buildDrizzleTs(op, table, cols);

  function copy() {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function toggleSelect(col: string) {
    setSelected(prev => prev.includes(col) ? prev.filter(c => c !== col) : [...prev, col]);
  }

  function addColumn() {
    if (!newCol.name.trim()) return;
    setCols(prev => [...prev, { ...newCol }]);
    setNewCol({ name: '', type: 'text', nullable: false });
  }

  function removeCol(idx: number) {
    const name = cols[idx].name;
    setCols(prev => prev.filter((_, i) => i !== idx));
    setSelected(prev => prev.filter(c => c !== name));
    setConditions(prev => prev.filter(c => c.column !== name));
  }

  function addCondition() {
    const firstCol = cols[0]?.name || '';
    setConditions(prev => [...prev, { column: firstCol, op: '=', value: '' }]);
  }

  function updateCondition(idx: number, field: keyof Condition, val: string) {
    setConditions(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
  }

  const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-primary w-full';
  const btnCls = 'px-3 py-1.5 rounded text-sm font-medium transition-colors';

  return (
    <div class="space-y-5">
      {/* Top row: operation + table */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-xs text-text-muted mb-1">Operation</label>
          <div class="flex gap-1">
            {(['SELECT', 'INSERT', 'UPDATE', 'DELETE'] as Op[]).map(o => (
              <button
                key={o}
                onClick={() => setOp(o)}
                class={`${btnCls} flex-1 border ${op === o ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
              >{o}</button>
            ))}
          </div>
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Table Name</label>
          <input value={table} onInput={e => setTable((e.target as HTMLInputElement).value)} class={inputCls} placeholder="e.g. users" />
        </div>
      </div>

      {/* Columns */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text">Columns</span>
          <span class="text-xs text-text-muted">{cols.length} defined</span>
        </div>
        <div class="space-y-1.5 mb-2">
          {cols.map((c, i) => (
            <div key={i} class="flex items-center gap-2">
              {op === 'SELECT' && (
                <input type="checkbox" checked={selected.includes(c.name)} onChange={() => toggleSelect(c.name)} class="accent-primary" />
              )}
              <input value={c.name} onInput={e => { const v = (e.target as HTMLInputElement).value; setCols(prev => prev.map((x, j) => j === i ? { ...x, name: v } : x)); }} class={`${inputCls} flex-1`} placeholder="column_name" />
              <select value={c.type} onChange={e => setCols(prev => prev.map((x, j) => j === i ? { ...x, type: (e.target as HTMLSelectElement).value } : x))} class={`${inputCls} w-28`}>
                {PG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <button onClick={() => removeCol(i)} class="text-xs text-red-400 hover:text-red-300 px-1">✕</button>
            </div>
          ))}
        </div>
        <div class="flex gap-2">
          <input value={newCol.name} onInput={e => setNewCol(prev => ({ ...prev, name: (e.target as HTMLInputElement).value }))} class={`${inputCls} flex-1`} placeholder="New column name" onKeyDown={e => e.key === 'Enter' && addColumn()} />
          <select value={newCol.type} onChange={e => setNewCol(prev => ({ ...prev, type: (e.target as HTMLSelectElement).value }))} class={`${inputCls} w-28`}>
            {PG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
          <button onClick={addColumn} class={`${btnCls} bg-surface border border-border hover:border-primary text-text-muted hover:text-primary`}>+ Add</button>
        </div>
      </div>

      {/* WHERE conditions (SELECT/UPDATE/DELETE) */}
      {(op === 'SELECT' || op === 'UPDATE' || op === 'DELETE') && (
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-text">WHERE Conditions</span>
            <button onClick={addCondition} class={`${btnCls} text-xs bg-surface border border-border hover:border-primary text-text-muted hover:text-primary`}>+ Add</button>
          </div>
          {conditions.length === 0 && <p class="text-xs text-text-muted">No conditions — returns all rows</p>}
          <div class="space-y-1.5">
            {conditions.map((c, i) => (
              <div key={i} class="flex gap-2 items-center">
                <select value={c.column} onChange={e => updateCondition(i, 'column', (e.target as HTMLSelectElement).value)} class={`${inputCls} flex-1`}>
                  {cols.filter(x => x.name).map(x => <option key={x.name} value={x.name}>{x.name}</option>)}
                </select>
                <select value={c.op} onChange={e => updateCondition(i, 'op', (e.target as HTMLSelectElement).value)} class={`${inputCls} w-32`}>
                  {COND_OPS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                {c.op !== 'IS NULL' && c.op !== 'IS NOT NULL' && (
                  <input value={c.value} onInput={e => updateCondition(i, 'value', (e.target as HTMLInputElement).value)} class={`${inputCls} flex-1`} placeholder="$1 value" />
                )}
                <button onClick={() => setConditions(prev => prev.filter((_, j) => j !== i))} class="text-xs text-red-400 hover:text-red-300 px-1">✕</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ORDER BY / LIMIT (SELECT only) */}
      {op === 'SELECT' && (
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="block text-xs text-text-muted mb-1">ORDER BY</label>
            <input value={orderBy} onInput={e => setOrderBy((e.target as HTMLInputElement).value)} class={inputCls} placeholder="created_at DESC" />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">LIMIT</label>
            <input value={limit} onInput={e => setLimit((e.target as HTMLInputElement).value)} class={inputCls} placeholder="50" />
          </div>
        </div>
      )}

      {/* Output mode */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex gap-1">
            {([['sql', 'Raw SQL'], ['ts-neon', 'TypeScript (Neon)'], ['ts-drizzle', 'TypeScript (Drizzle)']] as [OutputMode, string][]).map(([m, label]) => (
              <button
                key={m}
                onClick={() => setOutputMode(m)}
                class={`${btnCls} text-xs border ${outputMode === m ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
              >{label}</button>
            ))}
          </div>
          <button onClick={copy} class={`${btnCls} text-xs ${copied ? 'bg-green-600 text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-[#0d1117] text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre font-mono leading-relaxed border border-border">{output}</pre>
      </div>

      {/* Connection hint */}
      <div class="bg-surface border border-border rounded-lg p-3 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text">Neon Connection Setup</p>
        <p>Install: <code class="font-mono bg-bg px-1 rounded">npm install @neondatabase/serverless</code></p>
        <p>Set env: <code class="font-mono bg-bg px-1 rounded">DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require</code></p>
        <p>Serverless: Works in Vercel Edge, Cloudflare Workers, and any Node.js environment.</p>
      </div>
    </div>
  );
}
