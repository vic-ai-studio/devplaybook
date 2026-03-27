import { useState } from 'preact/hooks';

const QUERY_TEMPLATES: Record<string, { label: string; query: object; desc: string }> = {
  match: {
    label: 'match',
    desc: 'Full-text search on analyzed fields. Applies the field\'s analyzer to the query string.',
    query: { query: { match: { title: { query: 'elasticsearch tutorial', operator: 'and' } } } },
  },
  term: {
    label: 'term',
    desc: 'Exact value match on keyword/numeric fields. Not analyzed — use for IDs, status codes, tags.',
    query: { query: { term: { status: { value: 'published' } } } },
  },
  range: {
    label: 'range',
    desc: 'Match documents with field values in a range. Supports gte, lte, gt, lt. Works on dates and numbers.',
    query: { query: { range: { created_at: { gte: '2024-01-01', lte: '2024-12-31', format: 'yyyy-MM-dd' } } } },
  },
  bool: {
    label: 'bool',
    desc: 'Combine multiple queries. must = required + scored, filter = required + cached, should = optional boost, must_not = exclude.',
    query: {
      query: {
        bool: {
          must: [{ match: { title: 'elasticsearch' } }],
          filter: [{ term: { status: 'published' } }, { range: { views: { gte: 100 } } }],
          must_not: [{ term: { deleted: true } }],
        },
      },
    },
  },
  wildcard: {
    label: 'wildcard',
    desc: 'Pattern matching with * (any chars) and ? (single char). Avoid leading wildcards — they scan all terms.',
    query: { query: { wildcard: { username: { value: 'user_*', boost: 1.0 } } } },
  },
  match_phrase: {
    label: 'match_phrase',
    desc: 'Matches exact phrase in order. Terms must appear adjacent and in sequence.',
    query: { query: { match_phrase: { description: 'quick brown fox' } } },
  },
  multi_match: {
    label: 'multi_match',
    desc: 'Run a match query across multiple fields. Use ^ to boost specific fields.',
    query: { query: { multi_match: { query: 'devops tools', fields: ['title^3', 'description', 'tags'], type: 'best_fields' } } },
  },
  exists: {
    label: 'exists',
    desc: 'Match documents where a field exists and is not null.',
    query: { query: { exists: { field: 'email' } } },
  },
  aggregation: {
    label: 'aggregation',
    desc: 'Compute statistics over your dataset. Terms agg = group by field. Avg/sum/min/max over numeric fields.',
    query: {
      size: 0,
      query: { term: { status: 'published' } },
      aggs: {
        by_category: { terms: { field: 'category', size: 10 } },
        avg_views: { avg: { field: 'views' } },
      },
    },
  },
};

type ExplainResult = { type: string; level: 'info' | 'warn' | 'error'; message: string };

function explainQuery(obj: unknown, path = ''): ExplainResult[] {
  const results: ExplainResult[] = [];

  if (typeof obj !== 'object' || obj === null) return results;

  const rec = (node: unknown, p: string) => {
    if (typeof node !== 'object' || node === null) return;
    const o = node as Record<string, unknown>;

    for (const [key, val] of Object.entries(o)) {
      const fullPath = p ? `${p}.${key}` : key;

      if (key === 'match' && typeof val === 'object') {
        const field = Object.keys(val as object)[0];
        results.push({ type: 'match', level: 'info', message: `match on "${field}" — full-text search, analyzed field. ` + (((val as Record<string, unknown>)[field] as Record<string,unknown>)?.operator === 'and' ? 'operator:and means all tokens must match.' : 'Default operator is OR.') });
      }
      if (key === 'term' && typeof val === 'object') {
        const field = Object.keys(val as object)[0];
        results.push({ type: 'term', level: 'info', message: `term on "${field}" — exact match, not analyzed. Use keyword fields only. Avoid on text fields.` });
      }
      if (key === 'range' && typeof val === 'object') {
        const field = Object.keys(val as object)[0];
        const range = (val as Record<string, unknown>)[field] as Record<string, unknown> || {};
        const parts = [];
        if (range.gte) parts.push(`gte: ${range.gte}`);
        if (range.lte) parts.push(`lte: ${range.lte}`);
        if (range.gt) parts.push(`gt: ${range.gt}`);
        if (range.lt) parts.push(`lt: ${range.lt}`);
        results.push({ type: 'range', level: 'info', message: `range on "${field}": ${parts.join(', ')}. Works on dates (ISO 8601) and numerics.` });
      }
      if (key === 'bool' && typeof val === 'object') {
        const b = val as Record<string, unknown>;
        const clauses = [];
        if (b.must) clauses.push(`must (${Array.isArray(b.must) ? b.must.length : 1} — scored, required)`);
        if (b.filter) clauses.push(`filter (${Array.isArray(b.filter) ? b.filter.length : 1} — cached, required, no score)`);
        if (b.should) clauses.push(`should (${Array.isArray(b.should) ? b.should.length : 1} — optional, boosts score)`);
        if (b.must_not) clauses.push(`must_not (${Array.isArray(b.must_not) ? b.must_not.length : 1} — excluded, cached)`);
        results.push({ type: 'bool', level: 'info', message: `bool query with: ${clauses.join('; ')}.` });
        if (b.minimum_should_match) results.push({ type: 'bool', level: 'info', message: `minimum_should_match: ${b.minimum_should_match} — at least this many should clauses must match.` });
      }
      if (key === 'wildcard' && typeof val === 'object') {
        const field = Object.keys(val as object)[0];
        const wc = ((val as Record<string, unknown>)[field] as Record<string, unknown>)?.value as string || '';
        if (wc.startsWith('*') || wc.startsWith('?')) {
          results.push({ type: 'wildcard', level: 'warn', message: `wildcard on "${field}" starts with * or ? — leading wildcards require full term scan and are very slow. Consider prefix query instead.` });
        } else {
          results.push({ type: 'wildcard', level: 'info', message: `wildcard on "${field}": "${wc}" — pattern matching with * (any) and ? (single char).` });
        }
      }
      if (key === 'multi_match' && typeof val === 'object') {
        const mm = val as Record<string, unknown>;
        const fields = (mm.fields as string[]) || [];
        const boosted = fields.filter(f => f.includes('^'));
        results.push({ type: 'multi_match', level: 'info', message: `multi_match across [${fields.join(', ')}]. type: ${mm.type || 'best_fields'}.${boosted.length ? ` Boosted: ${boosted.join(', ')}.` : ''}` });
      }
      if (key === 'match_phrase' && typeof val === 'object') {
        const field = Object.keys(val as object)[0];
        results.push({ type: 'match_phrase', level: 'info', message: `match_phrase on "${field}" — terms must appear in order and adjacent.` });
      }
      if (key === 'exists' && typeof val === 'object') {
        results.push({ type: 'exists', level: 'info', message: `exists on "${(val as Record<string,unknown>).field}" — matches docs where field is present and not null.` });
      }
      if (key === 'aggs' || key === 'aggregations') {
        const aggs = val as Record<string, unknown>;
        for (const [aggName, aggVal] of Object.entries(aggs)) {
          const aggType = Object.keys(aggVal as object)[0];
          results.push({ type: 'agg', level: 'info', message: `aggregation "${aggName}" — type: ${aggType}.${aggType === 'terms' ? ` Groups by field "${((aggVal as Record<string,unknown>)[aggType] as Record<string,unknown>)?.field}".` : ''}` });
        }
      }
      if (key === 'size' && typeof val === 'number' && val === 0) {
        results.push({ type: 'size', level: 'info', message: 'size: 0 — returns only aggregation results, no document hits. Efficient for analytics queries.' });
      }

      if (typeof val === 'object') rec(val, fullPath);
    }
  };

  rec(obj, path);
  return results;
}

function validateJson(text: string): { ok: boolean; parsed?: unknown; error?: string } {
  try {
    return { ok: true, parsed: JSON.parse(text) };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default function ElasticsearchQueryTester() {
  const [queryText, setQueryText] = useState(JSON.stringify(QUERY_TEMPLATES.bool.query, null, 2));
  const [activeTemplate, setActiveTemplate] = useState('bool');
  const [copied, setCopied] = useState(false);

  const validation = validateJson(queryText);
  const explanations = validation.ok ? explainQuery(validation.parsed) : [];

  function loadTemplate(key: string) {
    setActiveTemplate(key);
    setQueryText(JSON.stringify(QUERY_TEMPLATES[key].query, null, 2));
  }

  function formatJson() {
    if (validation.ok) {
      setQueryText(JSON.stringify(validation.parsed, null, 2));
    }
  }

  function copyQuery() {
    navigator.clipboard.writeText(queryText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const levelColor: Record<string, string> = {
    info: 'text-accent-blue',
    warn: 'text-yellow-400',
    error: 'text-red-400',
  };
  const levelIcon: Record<string, string> = { info: 'ℹ', warn: '⚠', error: '✕' };

  return (
    <div class="font-mono text-sm">
      {/* Template selector */}
      <div class="mb-3">
        <div class="text-xs text-text-muted uppercase tracking-wide mb-2">Query Templates</div>
        <div class="flex flex-wrap gap-1">
          {Object.entries(QUERY_TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => loadTemplate(key)}
              class={`px-2 py-1 text-xs rounded border ${activeTemplate === key ? 'bg-accent-blue text-white border-accent-blue' : 'border-border text-text-muted hover:text-text hover:border-text-muted'}`}
            >
              {tpl.label}
            </button>
          ))}
        </div>
        {activeTemplate && (
          <p class="text-xs text-text-muted mt-2 italic">{QUERY_TEMPLATES[activeTemplate]?.desc}</p>
        )}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div>
          <div class="flex items-center justify-between mb-1">
            <span class="text-xs text-text-muted uppercase tracking-wide">Query JSON</span>
            <div class="flex gap-1">
              <button onClick={formatJson} class="px-2 py-0.5 text-xs border border-border rounded hover:border-text-muted text-text-muted">Format</button>
              <button onClick={copyQuery} class="px-2 py-0.5 text-xs border border-border rounded hover:border-accent-blue text-text-muted">{copied ? '✓ Copied' : '⎘ Copy'}</button>
            </div>
          </div>
          <textarea
            value={queryText}
            onInput={e => setQueryText((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
            class={`w-full bg-surface border rounded p-3 text-xs leading-relaxed resize-y min-h-64 focus:outline-none focus:border-accent-blue ${validation.ok ? 'border-border' : 'border-red-500'}`}
            style={{ fontFamily: 'monospace' }}
          />
          {!validation.ok && (
            <p class="text-red-400 text-xs mt-1">JSON parse error: {validation.error}</p>
          )}
          {validation.ok && (
            <p class="text-green-500 text-xs mt-1">✓ Valid JSON</p>
          )}
        </div>

        {/* Analysis */}
        <div>
          <div class="text-xs text-text-muted uppercase tracking-wide mb-1">Query Analysis</div>
          <div class="bg-surface border border-border rounded p-3 min-h-64 space-y-2 overflow-y-auto" style={{ maxHeight: '400px' }}>
            {!validation.ok && (
              <p class="text-text-muted italic">Fix JSON errors to see analysis.</p>
            )}
            {validation.ok && explanations.length === 0 && (
              <p class="text-text-muted italic">No recognized query clauses found. Try a template above.</p>
            )}
            {explanations.map((ex, i) => (
              <div key={i} class="flex gap-2 text-xs">
                <span class={`flex-shrink-0 ${levelColor[ex.level]}`}>{levelIcon[ex.level]}</span>
                <div>
                  <span class="text-text-muted mr-1">[{ex.type}]</span>
                  <span class="text-text">{ex.message}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Field mapping helper */}
          <div class="mt-3 border border-border rounded p-3 bg-surface">
            <div class="text-xs text-text-muted uppercase tracking-wide mb-2">Field Type Guide</div>
            <div class="space-y-1 text-xs">
              {[
                { type: 'text', use: 'Full-text search', queries: 'match, match_phrase, multi_match' },
                { type: 'keyword', use: 'Exact values, aggregations', queries: 'term, terms, aggregations' },
                { type: 'integer / float', use: 'Numeric values', queries: 'range, term' },
                { type: 'date', use: 'Timestamps', queries: 'range (ISO 8601 or now-7d)' },
                { type: 'boolean', use: 'true/false flags', queries: 'term' },
                { type: 'nested', use: 'Array of objects', queries: 'nested query (requires nested type)' },
              ].map(row => (
                <div key={row.type} class="grid grid-cols-3 gap-1">
                  <span class="text-accent-blue">{row.type}</span>
                  <span class="text-text-muted">{row.use}</span>
                  <span class="text-text-muted">{row.queries}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
