import { useState } from 'preact/hooks';

type ClauseType = 'must' | 'should' | 'filter' | 'must_not';
type QueryType = 'term' | 'match' | 'range' | 'wildcard' | 'exists';

type Clause = {
  id: string;
  clauseType: ClauseType;
  queryType: QueryType;
  field: string;
  value: string;
  rangeGte: string;
  rangeLte: string;
};

let nextId = 1;
function makeId() { return String(nextId++); }

const DEFAULT_CLAUSES: Clause[] = [
  { id: makeId(), clauseType: 'must', queryType: 'match', field: 'title', value: 'elasticsearch', rangeGte: '', rangeLte: '' },
  { id: makeId(), clauseType: 'filter', queryType: 'term', field: 'status', value: 'published', rangeGte: '', rangeLte: '' },
  { id: makeId(), clauseType: 'filter', queryType: 'range', field: 'created_at', value: '', rangeGte: '2024-01-01', rangeLte: '2024-12-31' },
];

function buildQuery(clauses: Clause[]) {
  const groups: Record<ClauseType, object[]> = { must: [], should: [], filter: [], must_not: [] };

  clauses.forEach(c => {
    let q: object;
    if (c.queryType === 'range') {
      const r: Record<string, string> = {};
      if (c.rangeGte) r.gte = c.rangeGte;
      if (c.rangeLte) r.lte = c.rangeLte;
      q = { range: { [c.field || 'field']: r } };
    } else if (c.queryType === 'exists') {
      q = { exists: { field: c.field || 'field' } };
    } else if (c.queryType === 'term') {
      q = { term: { [c.field || 'field']: c.value || '' } };
    } else if (c.queryType === 'match') {
      q = { match: { [c.field || 'field']: c.value || '' } };
    } else {
      q = { wildcard: { [c.field || 'field']: c.value || '*' } };
    }
    groups[c.clauseType].push(q);
  });

  const bool: Record<string, object[]> = {};
  if (groups.must.length) bool.must = groups.must;
  if (groups.should.length) bool.should = groups.should;
  if (groups.filter.length) bool.filter = groups.filter;
  if (groups.must_not.length) bool.must_not = groups.must_not;

  return { query: { bool } };
}

const CLAUSE_COLORS: Record<ClauseType, string> = {
  must: 'text-green-400 bg-green-500/10 border-green-500/30',
  should: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
  filter: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
  must_not: 'text-red-400 bg-red-500/10 border-red-500/30',
};

export default function ElasticsearchQueryBuilder() {
  const [clauses, setClauses] = useState<Clause[]>(DEFAULT_CLAUSES);
  const [copied, setCopied] = useState(false);

  const query = buildQuery(clauses);
  const json = JSON.stringify(query, null, 2);

  const addClause = () => {
    setClauses(prev => [...prev, { id: makeId(), clauseType: 'must', queryType: 'match', field: '', value: '', rangeGte: '', rangeLte: '' }]);
  };

  const removeClause = (id: string) => {
    setClauses(prev => prev.filter(c => c.id !== id));
  };

  const updateClause = (id: string, patch: Partial<Clause>) => {
    setClauses(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const copyJson = () => {
    navigator.clipboard.writeText(json).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div class="space-y-2">
        {clauses.map((c, i) => (
          <div key={c.id} class={`p-3 border rounded-lg ${CLAUSE_COLORS[c.clauseType]}`}>
            <div class="flex flex-wrap gap-2 items-center">
              <select
                value={c.clauseType}
                onChange={e => updateClause(c.id, { clauseType: (e.target as HTMLSelectElement).value as ClauseType })}
                class="text-xs font-medium px-2 py-1 bg-background border border-border rounded focus:outline-none"
              >
                <option value="must">must</option>
                <option value="should">should</option>
                <option value="filter">filter</option>
                <option value="must_not">must_not</option>
              </select>
              <select
                value={c.queryType}
                onChange={e => updateClause(c.id, { queryType: (e.target as HTMLSelectElement).value as QueryType })}
                class="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none"
              >
                <option value="match">match</option>
                <option value="term">term</option>
                <option value="range">range</option>
                <option value="wildcard">wildcard</option>
                <option value="exists">exists</option>
              </select>
              <input
                type="text"
                value={c.field}
                onInput={e => updateClause(c.id, { field: (e.target as HTMLInputElement).value })}
                placeholder="field"
                class="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none w-28"
              />
              {c.queryType === 'range' ? (
                <>
                  <input type="text" value={c.rangeGte} onInput={e => updateClause(c.id, { rangeGte: (e.target as HTMLInputElement).value })} placeholder="gte" class="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none w-24" />
                  <input type="text" value={c.rangeLte} onInput={e => updateClause(c.id, { rangeLte: (e.target as HTMLInputElement).value })} placeholder="lte" class="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none w-24" />
                </>
              ) : c.queryType !== 'exists' ? (
                <input
                  type="text"
                  value={c.value}
                  onInput={e => updateClause(c.id, { value: (e.target as HTMLInputElement).value })}
                  placeholder="value"
                  class="text-xs px-2 py-1 bg-background border border-border rounded focus:outline-none w-36"
                />
              ) : null}
              <button onClick={() => removeClause(c.id)} class="ml-auto text-xs text-text-muted hover:text-red-400 transition-colors px-1">✕</button>
            </div>
          </div>
        ))}
      </div>

      <button onClick={addClause} class="w-full py-2 border border-dashed border-border rounded-lg text-sm text-text-muted hover:text-text hover:border-accent transition-colors">
        + Add clause
      </button>

      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-muted">Elasticsearch DSL Query</span>
          <button onClick={copyJson} class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors">
            {copied ? 'Copied!' : 'Copy JSON'}
          </button>
        </div>
        <pre class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 overflow-x-auto text-text whitespace-pre">{json}</pre>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Clause types</p>
        <ul class="space-y-1">
          <li><span class="text-green-400 font-medium">must</span> — All must match (AND). Contributes to relevance score.</li>
          <li><span class="text-blue-400 font-medium">should</span> — At least one should match (OR). Boosts score if matched.</li>
          <li><span class="text-purple-400 font-medium">filter</span> — Must match (AND). Does not affect score. Cached.</li>
          <li><span class="text-red-400 font-medium">must_not</span> — Must not match (NOT). Cached.</li>
        </ul>
      </div>
    </div>
  );
}
