import { useState } from 'preact/hooks';

// ---- Types ----

interface ExplainNode {
  nodeType: string;
  relation?: string;
  alias?: string;
  estimatedRows: number;
  actualRows: number;
  estimatedCost: number;
  actualTime: number;    // ms per loop
  loops: number;
  totalActualTime: number; // actualTime * loops
  filter?: string;
  indexName?: string;
  rawLine: string;
  depth: number;
  issues: string[];
}

interface QueryStats {
  totalTime: number;
  totalCost: number;
  nodeCount: number;
  slowNodes: number;
  seqScanCount: number;
  suggestions: string[];
}

// ---- Sample EXPLAIN ANALYZE output ----

const SAMPLE_EXPLAIN = `Gather  (cost=1000.00..18765.43 rows=1 width=36) (actual time=112.453..289.101 rows=3 loops=1)
  Workers Planned: 2
  Workers Launched: 2
  ->  Parallel Seq Scan on orders  (cost=0.00..17765.33 rows=1 width=36) (actual time=98.233..260.887 rows=1 loops=3)
        Filter: ((status = 'pending'::text) AND (total_amount > '500'::numeric))
        Rows Removed by Filter: 391823
  ->  Hash Join  (cost=4565.00..22340.12 rows=4521 width=72) (actual time=45.331..128.442 rows=4521 loops=1)
        Hash Cond: (orders.customer_id = customers.id)
        ->  Seq Scan on orders  (cost=0.00..15432.00 rows=500000 width=36) (actual time=0.021..89.112 rows=500000 loops=1)
        ->  Hash  (cost=2315.00..2315.00 rows=100000 width=36) (actual time=30.112..30.112 rows=100000 loops=1)
              Buckets: 131072  Batches: 1  Memory Usage: 7852kB
              ->  Seq Scan on customers  (cost=0.00..2315.00 rows=100000 width=36) (actual time=0.011..15.443 rows=100000 loops=1)
  ->  Sort  (cost=3456.78..3512.34 rows=22224 width=48) (actual time=55.321..62.445 rows=22224 loops=1)
        Sort Key: orders.created_at DESC
        Sort Method: quicksort  Memory: 2853kB
        ->  Index Scan using idx_orders_user on orders  (cost=0.56..2234.12 rows=22224 width=48) (actual time=0.032..38.112 rows=22224 loops=1)
              Index Cond: (user_id = 42)
Planning Time: 3.241 ms
Execution Time: 295.782 ms`;

// ---- Parser ----

function parseExplain(text: string): { nodes: ExplainNode[]; stats: QueryStats } {
  const lines = text.split('\n');
  const nodes: ExplainNode[] = [];
  let totalTime = 0;
  let totalCost = 0;
  let planningTime = 0;

  // Extract planning/execution time from footer lines
  for (const line of lines) {
    const execMatch = line.match(/Execution Time:\s*([\d.]+)\s*ms/i);
    if (execMatch) totalTime = parseFloat(execMatch[1]);
    const planMatch = line.match(/Planning Time:\s*([\d.]+)\s*ms/i);
    if (planMatch) planningTime = parseFloat(planMatch[1]);
  }

  // Regex for node lines
  // Match: optional indent -> node type -> optional table ref -> cost/rows -> actual time/rows -> loops
  const nodeRe = /^(\s*)(->)?\s*(.+?)\s+\(cost=([\d.]+)\.\.([\d.]+)\s+rows=(\d+)\s+width=\d+\)\s+\(actual time=([\d.]+)\.\.([\d.]+)\s+rows=(\d+)\s+loops=(\d+)\)/;
  const filterRe = /Filter:\s*(.+)/;
  const indexRe = /Index Scan using (\S+)/i;
  const relationRe = /(?:Seq Scan|Index Scan\s+using\s+\S+|Bitmap Heap Scan)\s+on\s+(\S+)/i;

  for (const line of lines) {
    const m = nodeRe.exec(line);
    if (!m) continue;

    const indent = m[1].length;
    const depth = Math.floor(indent / 2);
    const rawNodeType = m[3].trim();
    const startupCost = parseFloat(m[4]);
    const totalCostNode = parseFloat(m[5]);
    const estimatedRows = parseInt(m[6]);
    const actualTimeStart = parseFloat(m[7]);
    const actualTimeEnd = parseFloat(m[8]);
    const actualRows = parseInt(m[9]);
    const loops = parseInt(m[10]);

    // Determine node type label
    let nodeType = rawNodeType;
    if (rawNodeType.includes('Seq Scan')) nodeType = 'Seq Scan';
    else if (rawNodeType.includes('Index Scan')) nodeType = 'Index Scan';
    else if (rawNodeType.includes('Hash Join')) nodeType = 'Hash Join';
    else if (rawNodeType.includes('Nested Loop')) nodeType = 'Nested Loop';
    else if (rawNodeType.includes('Sort')) nodeType = 'Sort';
    else if (rawNodeType.includes('Gather')) nodeType = 'Gather';
    else if (rawNodeType.includes('Hash')) nodeType = 'Hash';
    else if (rawNodeType.includes('Aggregate')) nodeType = 'Aggregate';
    else if (rawNodeType.includes('Limit')) nodeType = 'Limit';
    else if (rawNodeType.includes('Merge Join')) nodeType = 'Merge Join';

    // Extract relation name
    const relMatch = relationRe.exec(rawNodeType);
    const relation = relMatch ? relMatch[1] : undefined;

    // Extract index name
    const idxMatch = indexRe.exec(rawNodeType);
    const indexName = idxMatch ? idxMatch[1] : undefined;

    const actualTime = actualTimeEnd; // use end time (inclusive of subtree for leaf nodes)
    const totalActualTime = actualTime * loops;

    totalCost = Math.max(totalCost, totalCostNode);

    // Detect issues
    const issues: string[] = [];

    if (nodeType === 'Seq Scan' && estimatedRows > 10000) {
      issues.push(`Sequential scan on large table (${estimatedRows.toLocaleString()} est. rows)`);
    }
    if (nodeType === 'Seq Scan' && estimatedRows > 100000) {
      issues.push('Critical: full table scan on very large table — consider an index');
    }
    if (nodeType === 'Hash Join' && actualRows > 50000) {
      issues.push(`Hash join processing ${actualRows.toLocaleString()} rows — check join selectivity`);
    }
    if (nodeType === 'Nested Loop' && loops > 100) {
      issues.push(`Nested loop with ${loops} loops — may cause N+1 performance problem`);
    }
    if (nodeType === 'Sort') {
      issues.push('Sort operation detected — an index on the ORDER BY column may eliminate this');
    }
    if (actualTime > 100) {
      issues.push(`Slow: ${actualTime.toFixed(1)}ms per loop (> 100ms threshold)`);
    } else if (actualTime > 10) {
      issues.push(`Moderate: ${actualTime.toFixed(1)}ms per loop (> 10ms threshold)`);
    }
    const rowRatio = estimatedRows > 0 ? actualRows / estimatedRows : 1;
    if (rowRatio > 10 || (rowRatio < 0.1 && estimatedRows > 100)) {
      issues.push(`Row estimate mismatch: estimated ${estimatedRows.toLocaleString()}, actual ${actualRows.toLocaleString()} — stale statistics?`);
    }

    nodes.push({
      nodeType,
      relation,
      alias: undefined,
      estimatedRows,
      actualRows,
      estimatedCost: totalCostNode,
      actualTime,
      loops,
      totalActualTime,
      indexName,
      rawLine: line,
      depth,
      issues,
    });
  }

  // Build suggestions from nodes
  const suggestions: string[] = [];
  const seqScans = nodes.filter(n => n.nodeType === 'Seq Scan');

  for (const node of seqScans) {
    if (node.relation && node.estimatedRows > 1000) {
      suggestions.push(`Consider adding an index on \`${node.relation}\` — a Seq Scan with ${node.estimatedRows.toLocaleString()} est. rows was detected.`);
    }
  }

  const sorts = nodes.filter(n => n.nodeType === 'Sort');
  if (sorts.length > 0) {
    suggestions.push(`${sorts.length} Sort operation(s) found. Add an index on the ORDER BY/GROUP BY columns to avoid in-memory sorting.`);
  }

  const nestedLoops = nodes.filter(n => n.nodeType === 'Nested Loop' && n.loops > 50);
  if (nestedLoops.length > 0) {
    suggestions.push('High-iteration Nested Loop detected. Ensure foreign keys are indexed and consider rewriting as a JOIN with appropriate indexes.');
  }

  if (totalTime > 100) {
    suggestions.push(`Total execution time ${totalTime.toFixed(1)}ms exceeds 100ms. Identify the top slow nodes and focus on those first.`);
  }

  if (suggestions.length === 0 && nodes.length > 0) {
    suggestions.push('No major issues detected. Query plan looks reasonable.');
  }

  const slowNodes = nodes.filter(n => n.actualTime > 10).length;
  const seqScanCount = seqScans.length;

  return {
    nodes,
    stats: {
      totalTime: totalTime + planningTime,
      totalCost,
      nodeCount: nodes.length,
      slowNodes,
      seqScanCount,
      suggestions,
    },
  };
}

// ---- Color helpers ----

function timeColor(ms: number): string {
  if (ms > 100) return 'text-red-400 font-semibold';
  if (ms > 10) return 'text-yellow-400 font-semibold';
  return 'text-green-400';
}

function rowDiffColor(est: number, actual: number): string {
  if (est === 0) return '';
  const ratio = actual / est;
  if (ratio > 10 || (ratio < 0.1 && est > 100)) return 'text-yellow-400';
  return '';
}

function nodeTypeBadge(type: string): string {
  const map: Record<string, string> = {
    'Seq Scan':    'bg-red-500/15 text-red-400 border-red-500/30',
    'Index Scan':  'bg-green-500/15 text-green-400 border-green-500/30',
    'Hash Join':   'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'Nested Loop': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'Sort':        'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
    'Gather':      'bg-purple-500/15 text-purple-400 border-purple-500/30',
    'Hash':        'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
    'Aggregate':   'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
    'Limit':       'bg-pink-500/15 text-pink-400 border-pink-500/30',
    'Merge Join':  'bg-teal-500/15 text-teal-400 border-teal-500/30',
  };
  return map[type] || 'bg-surface text-text-muted border-border';
}

// ---- Main component ----

export default function SqlExplainAnalyzer() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<{ nodes: ExplainNode[]; stats: QueryStats } | null>(null);
  const [error, setError] = useState('');
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  function analyze() {
    setError('');
    setExpandedRow(null);
    const text = input.trim();
    if (!text) { setError('Please paste your EXPLAIN ANALYZE output above.'); return; }
    if (!text.includes('actual time=') && !text.includes('Execution Time')) {
      setError('Output does not look like PostgreSQL EXPLAIN ANALYZE. Make sure to run EXPLAIN (ANALYZE, BUFFERS) in psql.');
      return;
    }
    try {
      const parsed = parseExplain(text);
      if (parsed.nodes.length === 0) {
        setError('Could not parse any plan nodes. Ensure you are pasting the full EXPLAIN ANALYZE output.');
        return;
      }
      setResult(parsed);
    } catch (e) {
      setError('Parse error. Please check the format of your EXPLAIN ANALYZE output.');
    }
  }

  function loadSample() {
    setInput(SAMPLE_EXPLAIN);
    setResult(null);
    setError('');
    setExpandedRow(null);
  }

  function clear() {
    setInput('');
    setResult(null);
    setError('');
    setExpandedRow(null);
  }

  return (
    <div class="space-y-5">
      {/* Input area */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Paste EXPLAIN ANALYZE output</label>
          <button
            onClick={loadSample}
            class="text-xs text-primary hover:underline"
          >
            Load sample output
          </button>
        </div>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          placeholder={"Gather  (cost=1000.00..18765.43 rows=1 width=36) (actual time=112.453..289.101 rows=3 loops=1)\n  ->  Seq Scan on orders  (cost=0.00..15432.00 rows=500000 width=36) (actual time=0.021..89.112 rows=500000 loops=1)\n...\nExecution Time: 295.782 ms"}
          class="w-full h-52 bg-bg border border-border rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-primary transition-colors resize-none placeholder:text-text-muted/50"
          spellcheck={false}
        />
        <p class="text-xs text-text-muted mt-1.5">
          Run <code class="text-primary font-mono">EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)</code> in psql or pgAdmin and paste the result here.
        </p>
      </div>

      {/* Action buttons */}
      <div class="flex gap-3">
        <button
          onClick={analyze}
          class="bg-primary hover:bg-primary-dark text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors"
        >
          Analyze Plan
        </button>
        {(result || input) && (
          <button
            onClick={clear}
            class="bg-bg border border-border hover:border-primary text-text-muted hover:text-text font-medium px-5 py-2.5 rounded-lg text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div class="space-y-5">
          {/* Stats summary */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total Time', value: `${result.stats.totalTime.toFixed(2)} ms`, color: result.stats.totalTime > 100 ? 'text-red-400' : result.stats.totalTime > 10 ? 'text-yellow-400' : 'text-green-400' },
              { label: 'Est. Total Cost', value: result.stats.totalCost.toFixed(2), color: 'text-primary' },
              { label: 'Plan Nodes', value: String(result.stats.nodeCount), color: 'text-text' },
              { label: 'Slow Nodes (>10ms)', value: String(result.stats.slowNodes), color: result.stats.slowNodes > 0 ? 'text-yellow-400' : 'text-green-400' },
            ].map(stat => (
              <div key={stat.label} class="bg-bg border border-border rounded-xl p-4 text-center">
                <p class="text-xs text-text-muted mb-1">{stat.label}</p>
                <p class={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              </div>
            ))}
          </div>

          {/* Suggestions */}
          {result.stats.suggestions.length > 0 && (
            <div class="bg-surface border border-border rounded-xl p-4 space-y-2">
              <h3 class="text-sm font-semibold text-text flex items-center gap-2">
                <span class="text-yellow-400">⚡</span> Optimization Suggestions
              </h3>
              <ul class="space-y-1.5">
                {result.stats.suggestions.map((s, i) => (
                  <li key={i} class="flex gap-2 text-sm">
                    <span class="text-yellow-400 mt-0.5 shrink-0">→</span>
                    <span class="text-text-muted">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Color legend */}
          <div class="flex flex-wrap gap-3 text-xs text-text-muted">
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-red-500 inline-block"></span> Actual time &gt; 100ms (slow)</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block"></span> Actual time &gt; 10ms (moderate)</span>
            <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full bg-green-500 inline-block"></span> Actual time ≤ 10ms (fast)</span>
          </div>

          {/* Node table */}
          <div class="overflow-x-auto">
            <table class="w-full text-sm border-collapse">
              <thead>
                <tr class="bg-surface border-b border-border text-text-muted text-xs uppercase tracking-wide">
                  <th class="text-left px-3 py-2.5 font-semibold">Node Type</th>
                  <th class="text-left px-3 py-2.5 font-semibold">Relation</th>
                  <th class="text-right px-3 py-2.5 font-semibold">Est. Rows</th>
                  <th class="text-right px-3 py-2.5 font-semibold">Actual Rows</th>
                  <th class="text-right px-3 py-2.5 font-semibold">Cost</th>
                  <th class="text-right px-3 py-2.5 font-semibold">Actual Time</th>
                  <th class="text-right px-3 py-2.5 font-semibold">Loops</th>
                  <th class="text-center px-3 py-2.5 font-semibold">Issues</th>
                </tr>
              </thead>
              <tbody>
                {result.nodes.map((node, i) => {
                  const isExpanded = expandedRow === i;
                  const hasIssues = node.issues.length > 0;
                  const rowBg = i % 2 === 0 ? 'bg-bg' : 'bg-surface/50';
                  return (
                    <>
                      <tr
                        key={i}
                        onClick={() => setExpandedRow(isExpanded ? null : i)}
                        class={`${rowBg} border-b border-border cursor-pointer hover:bg-primary/5 transition-colors ${hasIssues ? 'border-l-2 border-l-yellow-500/60' : ''}`}
                      >
                        <td class="px-3 py-2.5">
                          <span class={`text-xs font-mono font-medium px-1.5 py-0.5 rounded border ${nodeTypeBadge(node.nodeType)}`}>
                            {node.nodeType}
                          </span>
                        </td>
                        <td class="px-3 py-2.5">
                          <span class="font-mono text-xs text-text-muted">{node.relation || '—'}</span>
                          {node.indexName && (
                            <span class="block text-xs text-green-400/70 font-mono">idx: {node.indexName}</span>
                          )}
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-xs text-text-muted">
                          {node.estimatedRows.toLocaleString()}
                        </td>
                        <td class={`px-3 py-2.5 text-right font-mono text-xs ${rowDiffColor(node.estimatedRows, node.actualRows)}`}>
                          {node.actualRows.toLocaleString()}
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-xs text-text-muted">
                          {node.estimatedCost.toFixed(2)}
                        </td>
                        <td class={`px-3 py-2.5 text-right font-mono text-xs ${timeColor(node.actualTime)}`}>
                          {node.actualTime.toFixed(3)} ms
                        </td>
                        <td class="px-3 py-2.5 text-right font-mono text-xs text-text-muted">
                          {node.loops}
                        </td>
                        <td class="px-3 py-2.5 text-center">
                          {hasIssues ? (
                            <span class="text-yellow-400 text-xs font-bold">{node.issues.length} ⚠</span>
                          ) : (
                            <span class="text-green-400 text-xs">✓</span>
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${i}-detail`} class={`${rowBg}`}>
                          <td colspan={8} class="px-4 pb-4 pt-2">
                            <div class="bg-bg border border-border rounded-lg p-3 space-y-3">
                              {node.issues.length > 0 && (
                                <div>
                                  <p class="text-xs font-semibold text-yellow-400 uppercase tracking-wide mb-1.5">Issues</p>
                                  <ul class="space-y-1">
                                    {node.issues.map((issue, j) => (
                                      <li key={j} class="text-xs text-text-muted flex gap-1.5">
                                        <span class="text-yellow-400 shrink-0">⚠</span>{issue}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                              <div>
                                <p class="text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Raw Plan Line</p>
                                <code class="block text-xs font-mono text-text-muted bg-surface rounded px-2 py-1.5 break-all">{node.rawLine.trim()}</code>
                              </div>
                              <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div><span class="text-text-muted">Total time (×loops):</span> <span class="font-mono text-text">{node.totalActualTime.toFixed(3)} ms</span></div>
                                <div><span class="text-text-muted">Depth:</span> <span class="font-mono text-text">{node.depth}</span></div>
                                {node.indexName && <div><span class="text-text-muted">Index:</span> <span class="font-mono text-green-400">{node.indexName}</span></div>}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p class="text-xs text-text-muted">
            Click any row to expand issues and raw plan details. Color coding: red = &gt;100ms, yellow = &gt;10ms per loop.
          </p>
        </div>
      )}
    </div>
  );
}
