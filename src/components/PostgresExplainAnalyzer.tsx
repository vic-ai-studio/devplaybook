import { useState } from 'preact/hooks';

interface PlanNode {
  type: string;
  cost: { startup: number; total: number };
  rows: number;
  width: number;
  actualTime?: { startup: number; total: number };
  actualRows?: number;
  loops?: number;
  filter?: string;
  indexName?: string;
  relation?: string;
  children: PlanNode[];
  raw: string;
  indent: number;
  suggestions: string[];
}

const NODE_ICONS: Record<string, string> = {
  'Seq Scan': '🔍',
  'Index Scan': '📇',
  'Index Only Scan': '⚡',
  'Bitmap Heap Scan': '🗺️',
  'Bitmap Index Scan': '📑',
  'Hash Join': '🔗',
  'Merge Join': '🔀',
  'Nested Loop': '🔄',
  'Sort': '🔤',
  'Hash': '#️⃣',
  'Aggregate': '∑',
  'GroupAggregate': '∑',
  'HashAggregate': '∑',
  'Limit': '✂️',
  'Materialize': '💾',
  'Subquery Scan': '📦',
  'CTE Scan': '📋',
  'Result': '✅',
  'Append': '➕',
};

const COST_COLOR = (cost: number, maxCost: number): string => {
  const pct = maxCost > 0 ? cost / maxCost : 0;
  if (pct > 0.7) return 'text-red-500';
  if (pct > 0.4) return 'text-yellow-500';
  return 'text-green-500';
};

function parseLine(line: string): Partial<PlanNode> | null {
  const indent = line.search(/\S/);
  const trimmed = line.trim();

  // Match node type line: "-> Seq Scan on table  (cost=0.00..10.00 rows=100 width=32)"
  const nodeMatch = trimmed.match(/(?:->)?\s*(\w[\w\s]*?)\s+(?:on\s+(\S+)\s+)?(?:using\s+(\S+)\s+)?(?:\(cost=(\d+\.?\d*)\.\.(\d+\.?\d*)\s+rows=(\d+)\s+width=(\d+)\))?/);
  if (!nodeMatch) return null;

  const typeRaw = nodeMatch[1].trim();
  const relation = nodeMatch[2];
  const indexName = nodeMatch[3];
  const startup = parseFloat(nodeMatch[4] || '0');
  const total = parseFloat(nodeMatch[5] || '0');
  const rows = parseInt(nodeMatch[6] || '0', 10);
  const width = parseInt(nodeMatch[7] || '0', 10);

  // Actual time: "(actual time=0.1..0.5 rows=3 loops=1)"
  const actualMatch = trimmed.match(/actual time=(\d+\.?\d*)\.\.(\d+\.?\d*)\s+rows=(\d+)\s+loops=(\d+)/);
  const actualTime = actualMatch ? { startup: parseFloat(actualMatch[1]), total: parseFloat(actualMatch[2]) } : undefined;
  const actualRows = actualMatch ? parseInt(actualMatch[3], 10) : undefined;
  const loops = actualMatch ? parseInt(actualMatch[4], 10) : undefined;

  // Filter
  const filterMatch = trimmed.match(/Filter:\s*(.+)/);
  const filter = filterMatch ? filterMatch[1] : undefined;

  const suggestions: string[] = [];
  if (typeRaw === 'Seq Scan' && rows > 1000) suggestions.push('Consider adding an index — sequential scan on large table');
  if (typeRaw === 'Sort') suggestions.push('Sort can be expensive; check if an index covers this ORDER BY');
  if (typeRaw.includes('Nested Loop') && rows > 10000) suggestions.push('Nested loop on large sets may be slow — check join conditions and indexes');
  if (filter) suggestions.push(`Filter applied after scan: ${filter.substring(0, 60)}${filter.length > 60 ? '...' : ''}`);

  return {
    type: typeRaw,
    cost: { startup, total },
    rows,
    width,
    actualTime,
    actualRows,
    loops,
    filter,
    indexName,
    relation,
    raw: trimmed,
    indent,
    suggestions,
    children: [],
  };
}

function parseExplain(text: string): PlanNode[] {
  const lines = text.split('\n').filter(l => l.trim());
  const nodes: PlanNode[] = [];
  const stack: PlanNode[] = [];

  for (const line of lines) {
    if (!line.trim().match(/(?:->|Seq Scan|Index|Bitmap|Hash|Merge|Nested|Sort|Aggregate|Limit|Materialize|Append|Result|CTE|Subquery)/)) continue;
    const parsed = parseLine(line);
    if (!parsed || !parsed.type) continue;

    const node: PlanNode = { ...parsed, children: [] } as PlanNode;

    if (stack.length === 0) {
      nodes.push(node);
      stack.push(node);
    } else {
      // Find parent: last node with less indent
      while (stack.length > 1 && stack[stack.length - 1].indent >= node.indent) {
        stack.pop();
      }
      stack[stack.length - 1].children.push(node);
      stack.push(node);
    }
  }

  return nodes;
}

function collectAll(nodes: PlanNode[]): PlanNode[] {
  const result: PlanNode[] = [];
  const visit = (n: PlanNode) => { result.push(n); n.children.forEach(visit); };
  nodes.forEach(visit);
  return result;
}

function NodeCard({ node, maxCost, depth }: { node: PlanNode; maxCost: number; depth: number }) {
  const [open, setOpen] = useState(true);
  const icon = NODE_ICONS[node.type] || '📊';
  const costColor = COST_COLOR(node.cost.total, maxCost);
  const pct = maxCost > 0 ? Math.round((node.cost.total / maxCost) * 100) : 0;

  return (
    <div class={`border border-border rounded-lg overflow-hidden ${depth > 0 ? 'ml-4 mt-2' : 'mt-2'}`}>
      <div
        class="flex items-center gap-2 px-3 py-2 bg-surface cursor-pointer hover:bg-border/30 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <span class="text-base">{icon}</span>
        <span class="font-medium text-sm flex-1">{node.type}</span>
        {node.relation && <span class="text-xs text-text-muted bg-border/40 px-2 py-0.5 rounded">on {node.relation}</span>}
        {node.indexName && <span class="text-xs text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">idx: {node.indexName}</span>}
        <span class={`text-xs font-mono ${costColor}`}>cost {node.cost.total.toFixed(2)}</span>
        <span class="text-xs text-text-muted">{pct}%</span>
        {node.children.length > 0 && <span class="text-xs text-text-muted ml-1">{open ? '▲' : '▼'}</span>}
      </div>

      {open && (
        <div class="px-3 pb-3 pt-1 space-y-1.5 border-t border-border">
          {/* Cost bar */}
          <div class="w-full bg-border/30 rounded-full h-1.5 mt-2">
            <div class={`h-1.5 rounded-full ${pct > 70 ? 'bg-red-500' : pct > 40 ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${pct}%` }} />
          </div>

          <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs mt-2">
            <div>
              <div class="text-text-muted">Startup cost</div>
              <div class="font-mono">{node.cost.startup.toFixed(2)}</div>
            </div>
            <div>
              <div class="text-text-muted">Total cost</div>
              <div class={`font-mono ${costColor}`}>{node.cost.total.toFixed(2)}</div>
            </div>
            <div>
              <div class="text-text-muted">Est. rows</div>
              <div class="font-mono">{node.rows.toLocaleString()}</div>
            </div>
            <div>
              <div class="text-text-muted">Width</div>
              <div class="font-mono">{node.width}B</div>
            </div>
          </div>

          {node.actualTime && (
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-blue-500/5 border border-blue-500/20 rounded p-2">
              <div>
                <div class="text-text-muted">Actual time</div>
                <div class="font-mono text-blue-500">{node.actualTime.startup.toFixed(3)}..{node.actualTime.total.toFixed(3)}ms</div>
              </div>
              <div>
                <div class="text-text-muted">Actual rows</div>
                <div class="font-mono text-blue-500">{node.actualRows?.toLocaleString()}</div>
              </div>
              <div>
                <div class="text-text-muted">Loops</div>
                <div class="font-mono text-blue-500">{node.loops}</div>
              </div>
            </div>
          )}

          {node.suggestions.length > 0 && (
            <div class="space-y-1">
              {node.suggestions.map((s, i) => (
                <div key={i} class="text-xs flex items-start gap-1.5 text-yellow-600 dark:text-yellow-400 bg-yellow-500/10 rounded px-2 py-1">
                  <span>⚠️</span><span>{s}</span>
                </div>
              ))}
            </div>
          )}

          {/* Children */}
          {node.children.map((child, i) => (
            <NodeCard key={i} node={child} maxCost={maxCost} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

const SAMPLE = `Seq Scan on orders  (cost=0.00..2850.00 rows=150000 width=48) (actual time=0.032..45.210 rows=150000 loops=1)
  Filter: (status = 'pending'::text)
  Rows Removed by Filter: 50000
  ->  Hash Join  (cost=125.00..2500.00 rows=5000 width=72) (actual time=1.230..12.450 rows=4800 loops=1)
        Hash Cond: (orders.customer_id = customers.id)
        ->  Seq Scan on orders  (cost=0.00..1850.00 rows=5000 width=48)
        ->  Hash  (cost=75.00..75.00 rows=4000 width=32)
              ->  Index Scan using customers_pkey on customers  (cost=0.29..75.00 rows=4000 width=32)
Planning Time: 0.5 ms
Execution Time: 47.3 ms`;

export default function PostgresExplainAnalyzer() {
  const [input, setInput] = useState(SAMPLE);

  const nodes = input.trim() ? parseExplain(input) : [];
  const all = collectAll(nodes);
  const maxCost = all.reduce((m, n) => Math.max(m, n.cost.total), 0);
  const totalSuggestions = all.flatMap(n => n.suggestions).length;

  // Extract planning/execution time
  const planningMatch = input.match(/Planning Time:\s*([\d.]+)\s*ms/i);
  const execMatch = input.match(/Execution Time:\s*([\d.]+)\s*ms/i);

  return (
    <div class="space-y-4">
      <textarea
        class="w-full h-48 font-mono text-sm bg-surface border border-border rounded-lg p-3 resize-y focus:outline-none focus:border-accent"
        value={input}
        onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        placeholder="Paste EXPLAIN or EXPLAIN ANALYZE output here..."
        spellcheck={false}
      />

      <div class="flex gap-2">
        <button
          onClick={() => setInput(SAMPLE)}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-md text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
        <button
          onClick={() => setInput('')}
          class="text-xs px-3 py-1.5 bg-surface border border-border rounded-md text-text-muted hover:border-accent transition-colors"
        >
          Clear
        </button>
      </div>

      {nodes.length > 0 && (
        <div class="space-y-3">
          {/* Summary bar */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-accent">{all.length}</div>
              <div class="text-xs text-text-muted">Nodes</div>
            </div>
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class={`text-2xl font-bold ${COST_COLOR(maxCost, maxCost)}`}>{maxCost.toFixed(1)}</div>
              <div class="text-xs text-text-muted">Max Cost</div>
            </div>
            {execMatch && (
              <div class="bg-surface border border-border rounded-lg p-3 text-center">
                <div class="text-2xl font-bold text-blue-500">{execMatch[1]}ms</div>
                <div class="text-xs text-text-muted">Exec Time</div>
              </div>
            )}
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class={`text-2xl font-bold ${totalSuggestions > 0 ? 'text-yellow-500' : 'text-green-500'}`}>{totalSuggestions}</div>
              <div class="text-xs text-text-muted">Suggestions</div>
            </div>
          </div>

          {/* Legend */}
          <div class="flex gap-4 text-xs text-text-muted">
            <span><span class="text-green-500">●</span> Low cost (&lt;40%)</span>
            <span><span class="text-yellow-500">●</span> Medium (40–70%)</span>
            <span><span class="text-red-500">●</span> High (&gt;70%)</span>
          </div>

          {/* Plan tree */}
          <div>
            {nodes.map((node, i) => (
              <NodeCard key={i} node={node} maxCost={maxCost} depth={0} />
            ))}
          </div>

          {planningMatch && (
            <div class="text-xs text-text-muted border-t border-border pt-2">
              Planning time: {planningMatch[1]}ms{execMatch ? ` · Execution time: ${execMatch[1]}ms` : ''}
            </div>
          )}
        </div>
      )}

      {!nodes.length && input.trim() && (
        <div class="text-sm text-text-muted bg-surface border border-border rounded-lg p-4 text-center">
          No recognizable plan nodes found. Make sure you paste the output of <code class="font-mono bg-border px-1 rounded">EXPLAIN</code> or <code class="font-mono bg-border px-1 rounded">EXPLAIN ANALYZE</code>.
        </div>
      )}
    </div>
  );
}
