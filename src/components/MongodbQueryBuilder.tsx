import { useState } from 'preact/hooks';

type Operator = '$eq' | '$gt' | '$gte' | '$lt' | '$lte' | '$ne' | '$in' | '$nin' | '$regex' | '$exists';
type SortDir = 'asc' | 'desc';
type QueryType = 'find' | 'findOne' | 'aggregate';
type OutputTab = 'shell' | 'mongoose' | 'driver';

interface FilterRow {
  id: number;
  field: string;
  op: Operator;
  value: string;
}

interface ProjectionRow {
  id: number;
  field: string;
  include: boolean;
}

interface SortRow {
  id: number;
  field: string;
  dir: SortDir;
}

const OPERATORS: { value: Operator; label: string; hint: string }[] = [
  { value: '$eq',     label: '$eq',     hint: 'equals' },
  { value: '$ne',     label: '$ne',     hint: 'not equals' },
  { value: '$gt',     label: '$gt',     hint: 'greater than' },
  { value: '$gte',    label: '$gte',    hint: '>= (gte)' },
  { value: '$lt',     label: '$lt',     hint: 'less than' },
  { value: '$lte',    label: '$lte',    hint: '<= (lte)' },
  { value: '$in',     label: '$in',     hint: 'in array (a,b,c)' },
  { value: '$nin',    label: '$nin',    hint: 'not in array' },
  { value: '$regex',  label: '$regex',  hint: 'regex pattern' },
  { value: '$exists', label: '$exists', hint: 'field exists (true/false)' },
];

let nextId = 1;
const uid = () => nextId++;

// ─── Value coercion helpers ───────────────────────────────────────────────────
function coerceValue(raw: string, op: Operator): unknown {
  const trimmed = raw.trim();
  if (op === '$exists') return trimmed !== 'false';
  if (op === '$in' || op === '$nin') {
    return trimmed.split(',').map(v => coerceScalar(v.trim()));
  }
  if (op === '$regex') return { $regex: trimmed };
  return coerceScalar(trimmed);
}

function coerceScalar(v: string): unknown {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  const n = Number(v);
  if (!isNaN(n) && v !== '') return n;
  return v;
}

function buildFilter(rows: FilterRow[]): Record<string, unknown> {
  const filter: Record<string, unknown> = {};
  for (const row of rows) {
    if (!row.field.trim()) continue;
    const val = coerceValue(row.value, row.op);
    if (row.op === '$eq') {
      filter[row.field] = val;
    } else if (row.op === '$regex') {
      filter[row.field] = val;
    } else {
      filter[row.field] = { [row.op]: (val as Record<string, unknown>)[row.op] ?? val };
    }
  }
  return filter;
}

function buildProjection(rows: ProjectionRow[]): Record<string, 0 | 1> | null {
  const proj: Record<string, 0 | 1> = {};
  let hasAny = false;
  for (const row of rows) {
    if (!row.field.trim()) continue;
    proj[row.field] = row.include ? 1 : 0;
    hasAny = true;
  }
  return hasAny ? proj : null;
}

function buildSort(rows: SortRow[]): Record<string, 1 | -1> | null {
  const sort: Record<string, 1 | -1> = {};
  let hasAny = false;
  for (const row of rows) {
    if (!row.field.trim()) continue;
    sort[row.field] = row.dir === 'asc' ? 1 : -1;
    hasAny = true;
  }
  return hasAny ? sort : null;
}

function jsonStr(obj: unknown, indent = 2): string {
  return JSON.stringify(obj, null, indent);
}

// ─── Output generators ────────────────────────────────────────────────────────
function buildShellQuery(
  collection: string,
  queryType: QueryType,
  filter: Record<string, unknown>,
  projection: Record<string, 0 | 1> | null,
  sort: Record<string, 1 | -1> | null,
  limit: number,
  skip: number,
): string {
  const col = collection || 'myCollection';
  const filterStr = jsonStr(filter);
  const projStr = projection ? jsonStr(projection) : '';

  if (queryType === 'aggregate') {
    const pipeline: unknown[] = [{ $match: filter }];
    if (projection) pipeline.push({ $project: projection });
    if (sort) pipeline.push({ $sort: sort });
    if (skip > 0) pipeline.push({ $skip: skip });
    if (limit > 0) pipeline.push({ $limit: limit });
    return `db.${col}.aggregate(${jsonStr(pipeline)})`;
  }

  const method = queryType === 'findOne' ? 'findOne' : 'find';
  let q = `db.${col}.${method}(${filterStr}${projStr ? ', ' + projStr : ''})`;
  if (sort && queryType === 'find') q += `\n  .sort(${jsonStr(sort)})`;
  if (skip > 0 && queryType === 'find') q += `\n  .skip(${skip})`;
  if (limit > 0 && queryType === 'find') q += `\n  .limit(${limit})`;
  return q;
}

function buildMongooseQuery(
  collection: string,
  queryType: QueryType,
  filter: Record<string, unknown>,
  projection: Record<string, 0 | 1> | null,
  sort: Record<string, 1 | -1> | null,
  limit: number,
  skip: number,
): string {
  const modelName = collection
    ? collection.charAt(0).toUpperCase() + collection.slice(1).replace(/s$/, '')
    : 'MyModel';

  const filterStr = jsonStr(filter);
  const projArg = projection ? `, ${jsonStr(projection)}` : '';

  if (queryType === 'aggregate') {
    const pipeline: unknown[] = [{ $match: filter }];
    if (projection) pipeline.push({ $project: projection });
    if (sort) pipeline.push({ $sort: sort });
    if (skip > 0) pipeline.push({ $skip: skip });
    if (limit > 0) pipeline.push({ $limit: limit });
    return `const results = await ${modelName}.aggregate(${jsonStr(pipeline)});`;
  }

  const method = queryType === 'findOne' ? 'findOne' : 'find';
  let q = `const results = await ${modelName}.${method}(${filterStr}${projArg})`;
  if (sort) q += `\n  .sort(${jsonStr(sort)})`;
  if (skip > 0) q += `\n  .skip(${skip})`;
  if (limit > 0) q += `\n  .limit(${limit})`;
  q += ';';
  return q;
}

function buildDriverQuery(
  collection: string,
  queryType: QueryType,
  filter: Record<string, unknown>,
  projection: Record<string, 0 | 1> | null,
  sort: Record<string, 1 | -1> | null,
  limit: number,
  skip: number,
): string {
  const col = collection || 'myCollection';
  const filterStr = jsonStr(filter);

  const opts: Record<string, unknown> = {};
  if (projection) opts.projection = projection;
  if (sort && queryType !== 'aggregate') opts.sort = sort;
  if (skip > 0 && queryType !== 'aggregate') opts.skip = skip;
  if (limit > 0 && queryType !== 'aggregate') opts.limit = limit;

  const optsStr = Object.keys(opts).length > 0 ? `, ${jsonStr(opts)}` : '';

  if (queryType === 'aggregate') {
    const pipeline: unknown[] = [{ $match: filter }];
    if (projection) pipeline.push({ $project: projection });
    if (sort) pipeline.push({ $sort: sort });
    if (skip > 0) pipeline.push({ $skip: skip });
    if (limit > 0) pipeline.push({ $limit: limit });
    return `const cursor = db.collection('${col}').aggregate(${jsonStr(pipeline)});\nconst results = await cursor.toArray();`;
  }

  if (queryType === 'findOne') {
    return `const result = await db.collection('${col}').findOne(${filterStr}${optsStr});`;
  }

  return `const cursor = db.collection('${col}').find(${filterStr}${optsStr});\nconst results = await cursor.toArray();`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function AddRowButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      class="text-xs text-primary hover:text-primary-dark border border-dashed border-primary/40 hover:border-primary rounded-lg px-3 py-1.5 transition-colors"
    >
      + {label}
    </button>
  );
}

function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      class="shrink-0 text-text-muted hover:text-red-400 transition-colors text-lg leading-none px-1"
      title="Remove"
    >
      ×
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function MongodbQueryBuilder() {
  const [collection, setCollection] = useState('users');
  const [queryType, setQueryType] = useState<QueryType>('find');
  const [filters, setFilters] = useState<FilterRow[]>([
    { id: uid(), field: 'status', op: '$eq', value: 'active' },
  ]);
  const [projections, setProjections] = useState<ProjectionRow[]>([]);
  const [sorts, setSorts] = useState<SortRow[]>([]);
  const [limit, setLimit] = useState(10);
  const [skip, setSkip] = useState(0);
  const [activeTab, setActiveTab] = useState<OutputTab>('shell');
  const [copied, setCopied] = useState(false);

  // ── Filter helpers ──
  const addFilter = () => setFilters(f => [...f, { id: uid(), field: '', op: '$eq', value: '' }]);
  const removeFilter = (id: number) => setFilters(f => f.filter(r => r.id !== id));
  const updateFilter = <K extends keyof FilterRow>(id: number, key: K, val: FilterRow[K]) =>
    setFilters(f => f.map(r => r.id === id ? { ...r, [key]: val } : r));

  // ── Projection helpers ──
  const addProjection = () => setProjections(p => [...p, { id: uid(), field: '', include: true }]);
  const removeProjection = (id: number) => setProjections(p => p.filter(r => r.id !== id));
  const updateProjection = <K extends keyof ProjectionRow>(id: number, key: K, val: ProjectionRow[K]) =>
    setProjections(p => p.map(r => r.id === id ? { ...r, [key]: val } : r));

  // ── Sort helpers ──
  const addSort = () => setSorts(s => [...s, { id: uid(), field: '', dir: 'asc' }]);
  const removeSort = (id: number) => setSorts(s => s.filter(r => r.id !== id));
  const updateSort = <K extends keyof SortRow>(id: number, key: K, val: SortRow[K]) =>
    setSorts(s => s.map(r => r.id === id ? { ...r, [key]: val } : r));

  // ── Build query ──
  const filter = buildFilter(filters);
  const projection = buildProjection(projections);
  const sort = buildSort(sorts);

  const outputMap: Record<OutputTab, string> = {
    shell:    buildShellQuery(collection, queryType, filter, projection, sort, limit, skip),
    mongoose: buildMongooseQuery(collection, queryType, filter, projection, sort, limit, skip),
    driver:   buildDriverQuery(collection, queryType, filter, projection, sort, limit, skip),
  };

  const copyOutput = async () => {
    await navigator.clipboard.writeText(outputMap[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const inputCls = 'w-full text-sm bg-bg border border-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-text';
  const selectCls = 'text-sm bg-bg border border-border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary text-text';

  return (
    <div class="space-y-5">
      {/* Collection + Query Type */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Collection name</label>
          <input
            type="text"
            value={collection}
            onInput={e => setCollection((e.target as HTMLInputElement).value)}
            placeholder="users"
            class={inputCls}
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">Query type</label>
          <div class="flex gap-2">
            {(['find', 'findOne', 'aggregate'] as QueryType[]).map(t => (
              <button
                key={t}
                onClick={() => setQueryType(t)}
                class={`flex-1 py-1.5 rounded-lg border text-sm font-medium transition-colors ${
                  queryType === t
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-surface text-text-muted hover:border-primary/50'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filter builder */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-text-muted">Filter conditions</label>
          <AddRowButton onClick={addFilter} label="Add filter" />
        </div>
        {filters.length === 0 && (
          <p class="text-xs text-text-muted italic">No filters — matches all documents.</p>
        )}
        {filters.map(row => (
          <div key={row.id} class="flex gap-2 items-center">
            <input
              type="text"
              value={row.field}
              onInput={e => updateFilter(row.id, 'field', (e.target as HTMLInputElement).value)}
              placeholder="field name"
              class={`${inputCls} flex-1 min-w-0`}
            />
            <select
              value={row.op}
              onChange={e => updateFilter(row.id, 'op', (e.target as HTMLSelectElement).value as Operator)}
              class={selectCls}
            >
              {OPERATORS.map(o => (
                <option key={o.value} value={o.value} title={o.hint}>{o.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={row.value}
              onInput={e => updateFilter(row.id, 'value', (e.target as HTMLInputElement).value)}
              placeholder={row.op === '$in' || row.op === '$nin' ? 'a,b,c' : row.op === '$exists' ? 'true' : 'value'}
              class={`${inputCls} flex-1 min-w-0`}
            />
            <RemoveButton onClick={() => removeFilter(row.id)} />
          </div>
        ))}
      </div>

      {/* Projection */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-text-muted">Projection (fields)</label>
          <AddRowButton onClick={addProjection} label="Add field" />
        </div>
        {projections.length === 0 && (
          <p class="text-xs text-text-muted italic">No projection — returns all fields.</p>
        )}
        {projections.map(row => (
          <div key={row.id} class="flex gap-2 items-center">
            <input
              type="text"
              value={row.field}
              onInput={e => updateProjection(row.id, 'field', (e.target as HTMLInputElement).value)}
              placeholder="field name"
              class={`${inputCls} flex-1`}
            />
            <select
              value={row.include ? 'include' : 'exclude'}
              onChange={e => updateProjection(row.id, 'include', (e.target as HTMLSelectElement).value === 'include')}
              class={selectCls}
            >
              <option value="include">include (1)</option>
              <option value="exclude">exclude (0)</option>
            </select>
            <RemoveButton onClick={() => removeProjection(row.id)} />
          </div>
        ))}
      </div>

      {/* Sort */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-text-muted">Sort</label>
          <AddRowButton onClick={addSort} label="Add sort" />
        </div>
        {sorts.length === 0 && (
          <p class="text-xs text-text-muted italic">No sort applied.</p>
        )}
        {sorts.map(row => (
          <div key={row.id} class="flex gap-2 items-center">
            <input
              type="text"
              value={row.field}
              onInput={e => updateSort(row.id, 'field', (e.target as HTMLInputElement).value)}
              placeholder="field name"
              class={`${inputCls} flex-1`}
            />
            <select
              value={row.dir}
              onChange={e => updateSort(row.id, 'dir', (e.target as HTMLSelectElement).value as SortDir)}
              class={selectCls}
            >
              <option value="asc">asc (1)</option>
              <option value="desc">desc (-1)</option>
            </select>
            <RemoveButton onClick={() => removeSort(row.id)} />
          </div>
        ))}
      </div>

      {/* Limit + Skip (hide for findOne) */}
      {queryType !== 'findOne' && (
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Limit <span class="font-normal">(0 = none)</span></label>
            <input
              type="number"
              min={0}
              value={limit}
              onInput={e => setLimit(parseInt((e.target as HTMLInputElement).value) || 0)}
              class={inputCls}
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-text-muted mb-1">Skip <span class="font-normal">(offset)</span></label>
            <input
              type="number"
              min={0}
              value={skip}
              onInput={e => setSkip(parseInt((e.target as HTMLInputElement).value) || 0)}
              class={inputCls}
            />
          </div>
        </div>
      )}

      {/* Output tabs */}
      <div class="border border-border rounded-lg overflow-hidden">
        <div class="flex border-b border-border bg-surface justify-between items-center">
          <div class="flex">
            {([
              { key: 'shell',    label: 'MongoDB Shell' },
              { key: 'mongoose', label: 'Mongoose' },
              { key: 'driver',   label: 'Node.js Driver' },
            ] as { key: OutputTab; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                class={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === key
                    ? 'text-primary border-b-2 border-primary bg-bg'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            onClick={copyOutput}
            class={`mr-3 text-xs px-2 py-1 rounded border transition-colors ${
              copied
                ? 'border-green-500 text-green-400 bg-green-500/10'
                : 'border-border bg-bg hover:border-primary text-text-muted'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 text-xs font-mono text-text bg-bg overflow-x-auto whitespace-pre leading-relaxed">
          {outputMap[activeTab]}
        </pre>
      </div>

      {/* Filter object preview */}
      <details class="border border-border rounded-lg overflow-hidden">
        <summary class="px-4 py-2.5 text-sm font-medium text-text-muted bg-surface cursor-pointer select-none hover:text-text transition-colors">
          Filter JSON preview
        </summary>
        <pre class="p-4 text-xs font-mono text-text bg-bg overflow-x-auto whitespace-pre leading-relaxed">
          {jsonStr(filter)}
        </pre>
      </details>
    </div>
  );
}
