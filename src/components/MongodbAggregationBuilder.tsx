import { useState } from 'preact/hooks';

type StageType = '$match' | '$group' | '$sort' | '$project' | '$limit' | '$lookup';

type Stage = {
  id: string;
  type: StageType;
  raw: string;
};

let nextId = 1;
function makeId() { return String(nextId++); }

const STAGE_DEFAULTS: Record<StageType, string> = {
  '$match': '{ "status": "active" }',
  '$group': '{ "_id": "$category", "count": { "$sum": 1 }, "total": { "$sum": "$amount" } }',
  '$sort': '{ "count": -1 }',
  '$project': '{ "name": 1, "email": 1, "_id": 0 }',
  '$limit': '10',
  '$lookup': '{ "from": "orders", "localField": "_id", "foreignField": "userId", "as": "orders" }',
};

const DEFAULT_STAGES: Stage[] = [
  { id: makeId(), type: '$match', raw: STAGE_DEFAULTS['$match'] },
  { id: makeId(), type: '$group', raw: STAGE_DEFAULTS['$group'] },
  { id: makeId(), type: '$sort', raw: STAGE_DEFAULTS['$sort'] },
];

function buildPipeline(stages: Stage[]): string {
  const pipeline = stages.map(s => {
    try {
      const parsed = JSON.parse(s.raw);
      return { [s.type]: parsed };
    } catch {
      return { [s.type]: `/* invalid JSON: ${s.raw} */` };
    }
  });
  return 'db.collection.aggregate(' + JSON.stringify(pipeline, null, 2) + ')';
}

function validateStages(stages: Stage[]): string[] {
  const errors: string[] = [];
  stages.forEach((s, i) => {
    try {
      JSON.parse(s.raw);
    } catch (e) {
      errors.push(`Stage ${i + 1} (${s.type}): Invalid JSON — ${(e as Error).message}`);
    }
  });
  return errors;
}

const STAGE_COLORS: Record<StageType, string> = {
  '$match': 'border-green-500/40 bg-green-500/5',
  '$group': 'border-purple-500/40 bg-purple-500/5',
  '$sort': 'border-blue-500/40 bg-blue-500/5',
  '$project': 'border-yellow-500/40 bg-yellow-500/5',
  '$limit': 'border-orange-500/40 bg-orange-500/5',
  '$lookup': 'border-pink-500/40 bg-pink-500/5',
};

export default function MongodbAggregationBuilder() {
  const [stages, setStages] = useState<Stage[]>(DEFAULT_STAGES);
  const [copied, setCopied] = useState(false);

  const pipeline = buildPipeline(stages);
  const errors = validateStages(stages);

  const addStage = (type: StageType) => {
    setStages(prev => [...prev, { id: makeId(), type, raw: STAGE_DEFAULTS[type] }]);
  };

  const removeStage = (id: string) => {
    setStages(prev => prev.filter(s => s.id !== id));
  };

  const updateStage = (id: string, patch: Partial<Stage>) => {
    setStages(prev => prev.map(s => s.id === id ? { ...s, ...patch } : s));
  };

  const moveStage = (id: string, dir: -1 | 1) => {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[next]] = [arr[next], arr[idx]];
      return arr;
    });
  };

  const copyPipeline = () => {
    navigator.clipboard.writeText(pipeline).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div class="space-y-3">
        {stages.map((s, i) => (
          <div key={s.id} class={`p-3 border rounded-lg ${STAGE_COLORS[s.type]}`}>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-xs text-text-muted w-5">{i + 1}.</span>
              <select
                value={s.type}
                onChange={e => {
                  const t = (e.target as HTMLSelectElement).value as StageType;
                  updateStage(s.id, { type: t, raw: STAGE_DEFAULTS[t] });
                }}
                class="text-xs font-mono font-medium px-2 py-1 bg-background border border-border rounded focus:outline-none"
              >
                {(['$match', '$group', '$sort', '$project', '$limit', '$lookup'] as StageType[]).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <div class="ml-auto flex gap-1">
                <button onClick={() => moveStage(s.id, -1)} disabled={i === 0} class="text-xs px-1.5 py-0.5 bg-surface border border-border rounded disabled:opacity-30 hover:border-accent transition-colors">↑</button>
                <button onClick={() => moveStage(s.id, 1)} disabled={i === stages.length - 1} class="text-xs px-1.5 py-0.5 bg-surface border border-border rounded disabled:opacity-30 hover:border-accent transition-colors">↓</button>
                <button onClick={() => removeStage(s.id)} class="text-xs px-1.5 py-0.5 text-red-400 hover:bg-red-500/10 border border-transparent rounded transition-colors">✕</button>
              </div>
            </div>
            <textarea
              value={s.raw}
              onInput={e => updateStage(s.id, { raw: (e.target as HTMLTextAreaElement).value })}
              rows={s.type === '$lookup' ? 4 : 2}
              class="w-full font-mono text-xs bg-background border border-border rounded p-2 resize-y focus:outline-none focus:ring-1 focus:ring-accent"
              spellcheck={false}
            />
          </div>
        ))}
      </div>

      <div class="flex flex-wrap gap-2">
        {(['$match', '$group', '$sort', '$project', '$limit', '$lookup'] as StageType[]).map(t => (
          <button key={t} onClick={() => addStage(t)} class="text-xs px-2 py-1 border border-border rounded hover:border-accent hover:text-accent transition-colors font-mono">
            + {t}
          </button>
        ))}
      </div>

      {errors.length > 0 && (
        <div class="space-y-1">
          {errors.map((e, i) => (
            <div key={i} class="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded px-3 py-2">{e}</div>
          ))}
        </div>
      )}

      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text-muted">Aggregation Pipeline</span>
          <button onClick={copyPipeline} class="text-xs px-3 py-1 bg-accent text-white rounded hover:bg-accent/90 transition-colors">
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="w-full font-mono text-xs bg-background border border-border rounded-lg p-3 overflow-x-auto text-text whitespace-pre">{pipeline}</pre>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Stage reference</p>
        <ul class="space-y-1">
          <li><code class="font-mono text-green-400">$match</code> — Filter documents (like WHERE in SQL)</li>
          <li><code class="font-mono text-purple-400">$group</code> — Group and aggregate (_id is the group key)</li>
          <li><code class="font-mono text-blue-400">$sort</code> — Sort by fields (1 = asc, -1 = desc)</li>
          <li><code class="font-mono text-yellow-400">$project</code> — Include/exclude fields (1 = include, 0 = exclude)</li>
          <li><code class="font-mono text-orange-400">$limit</code> — Limit number of output documents</li>
          <li><code class="font-mono text-pink-400">$lookup</code> — Left join with another collection</li>
        </ul>
      </div>
    </div>
  );
}
