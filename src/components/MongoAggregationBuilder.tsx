import { useState } from 'preact/hooks';

type StageType = '$match' | '$group' | '$project' | '$sort' | '$limit' | '$skip' | '$unwind' | '$lookup' | '$addFields' | '$count';

interface Stage {
  id: number;
  type: StageType;
  content: string;
}

const STAGE_TEMPLATES: Record<StageType, { template: string; description: string }> = {
  '$match': {
    template: '{\n  "status": "active",\n  "age": { "$gte": 18 }\n}',
    description: 'Filter documents (like SQL WHERE). Applied early for best performance.',
  },
  '$group': {
    template: '{\n  "_id": "$category",\n  "total": { "$sum": "$amount" },\n  "count": { "$sum": 1 },\n  "avg": { "$avg": "$amount" }\n}',
    description: 'Aggregate documents by a key. _id is the group-by field. Use $sum, $avg, $max, $min, $push.',
  },
  '$project': {
    template: '{\n  "name": 1,\n  "email": 1,\n  "_id": 0,\n  "fullName": { "$concat": ["$firstName", " ", "$lastName"] }\n}',
    description: 'Include/exclude fields (1=include, 0=exclude) or add computed fields.',
  },
  '$sort': {
    template: '{\n  "createdAt": -1,\n  "name": 1\n}',
    description: 'Sort documents. 1 = ascending, -1 = descending.',
  },
  '$limit': {
    template: '10',
    description: 'Limit output to N documents. Place after $sort for pagination.',
  },
  '$skip': {
    template: '20',
    description: 'Skip N documents. Use with $limit for pagination.',
  },
  '$unwind': {
    template: '"$tags"',
    description: 'Deconstruct an array field — one output document per array element.',
  },
  '$lookup': {
    template: '{\n  "from": "orders",\n  "localField": "_id",\n  "foreignField": "userId",\n  "as": "userOrders"\n}',
    description: 'Left outer join with another collection (like SQL JOIN).',
  },
  '$addFields': {
    template: '{\n  "fullName": { "$concat": ["$firstName", " ", "$lastName"] },\n  "year": { "$year": "$createdAt" }\n}',
    description: 'Add or overwrite fields without removing existing ones.',
  },
  '$count': {
    template: '"totalDocuments"',
    description: 'Count documents and return as a single field.',
  },
};

let nextId = 1;

export default function MongoAggregationBuilder() {
  const [stages, setStages] = useState<Stage[]>([
    { id: nextId++, type: '$match', content: '{\n  "status": "active"\n}' },
    { id: nextId++, type: '$group', content: '{\n  "_id": "$category",\n  "count": { "$sum": 1 },\n  "total": { "$sum": "$price" }\n}' },
    { id: nextId++, type: '$sort', content: '{\n  "total": -1\n}' },
    { id: nextId++, type: '$limit', content: '5' },
  ]);
  const [collection, setCollection] = useState('products');
  const [copied, setCopied] = useState(false);
  const [errors, setErrors] = useState<Record<number, string>>({});

  function addStage(type: StageType) {
    const tmpl = STAGE_TEMPLATES[type].template;
    setStages(prev => [...prev, { id: nextId++, type, content: tmpl }]);
  }

  function removeStage(id: number) {
    setStages(prev => prev.filter(s => s.id !== id));
    setErrors(prev => { const n = { ...prev }; delete n[id]; return n; });
  }

  function moveStage(id: number, dir: -1 | 1) {
    setStages(prev => {
      const idx = prev.findIndex(s => s.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const arr = [...prev];
      [arr[idx], arr[newIdx]] = [arr[newIdx], arr[idx]];
      return arr;
    });
  }

  function updateContent(id: number, content: string) {
    setStages(prev => prev.map(s => s.id === id ? { ...s, content } : s));
    // Validate JSON (except for simple values like numbers/strings)
    setErrors(prev => {
      const n = { ...prev };
      const trimmed = content.trim();
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        try { JSON.parse(trimmed); delete n[id]; }
        catch (e) { n[id] = 'Invalid JSON'; }
      } else { delete n[id]; }
      return n;
    });
  }

  function generatePipeline(): string {
    const pipeline = stages.map(s => {
      const trimmed = s.content.trim();
      try {
        const val = trimmed.startsWith('{') || trimmed.startsWith('[') || trimmed.startsWith('"')
          ? JSON.parse(trimmed)
          : isNaN(Number(trimmed)) ? trimmed : Number(trimmed);
        return { [s.type]: val };
      } catch {
        return { [s.type]: s.content };
      }
    });
    return JSON.stringify(pipeline, null, 2);
  }

  function generateDriverCode(): string {
    return `db.collection('${collection}').aggregate(${generatePipeline()});`;
  }

  function generateMongoShell(): string {
    return `db.${collection}.aggregate(${generatePipeline()})`;
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const hasErrors = Object.keys(errors).length > 0;

  return (
    <div class="space-y-6">
      {/* Collection name */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex flex-wrap items-center gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">Collection name</label>
            <input
              type="text"
              value={collection}
              onInput={(e) => setCollection((e.target as HTMLInputElement).value)}
              class="bg-surface border border-border rounded-lg px-3 py-2 text-sm font-mono text-text focus:outline-none focus:border-primary/50 w-40"
              placeholder="collection"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Add stage</label>
            <select
              class="bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-primary/50"
              onChange={(e) => {
                const val = (e.target as HTMLSelectElement).value as StageType;
                if (val) { addStage(val); (e.target as HTMLSelectElement).value = ''; }
              }}
            >
              <option value="">+ Add stage...</option>
              {(Object.keys(STAGE_TEMPLATES) as StageType[]).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pipeline stages */}
      <div class="space-y-3">
        {stages.length === 0 && (
          <div class="bg-bg-card border border-dashed border-border rounded-xl p-8 text-center text-text-muted text-sm">
            No stages yet. Add a stage using the dropdown above.
          </div>
        )}
        {stages.map((stage, i) => (
          <div key={stage.id} class="bg-bg-card border border-border rounded-xl overflow-hidden">
            <div class="flex items-center gap-3 px-4 py-3 bg-surface/50 border-b border-border/50">
              <span class="text-xs font-medium text-text-muted w-5 text-right">{i + 1}.</span>
              <span class="font-mono text-sm font-semibold text-primary">{stage.type}</span>
              <span class="text-xs text-text-muted flex-1 hidden sm:block">{STAGE_TEMPLATES[stage.type].description}</span>
              <div class="flex gap-1 ml-auto">
                <button
                  onClick={() => moveStage(stage.id, -1)}
                  disabled={i === 0}
                  class="w-7 h-7 text-text-muted hover:text-text disabled:opacity-30 transition-colors text-sm"
                  title="Move up"
                >↑</button>
                <button
                  onClick={() => moveStage(stage.id, 1)}
                  disabled={i === stages.length - 1}
                  class="w-7 h-7 text-text-muted hover:text-text disabled:opacity-30 transition-colors text-sm"
                  title="Move down"
                >↓</button>
                <button
                  onClick={() => removeStage(stage.id)}
                  class="w-7 h-7 text-text-muted hover:text-red-400 transition-colors text-lg leading-none"
                  title="Remove"
                >×</button>
              </div>
            </div>
            <div class="p-4">
              <textarea
                value={stage.content}
                onInput={(e) => updateContent(stage.id, (e.target as HTMLTextAreaElement).value)}
                rows={stage.content.split('\n').length + 1}
                class={`w-full bg-surface border rounded-lg p-3 text-sm font-mono text-text resize-none focus:outline-none transition-colors ${errors[stage.id] ? 'border-red-500/50 focus:border-red-500/70' : 'border-border focus:border-primary/50 focus:ring-1 focus:ring-primary/20'}`}
                spellcheck={false}
              />
              {errors[stage.id] && (
                <p class="text-xs text-red-400 mt-1">⚠ {errors[stage.id]}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Generated Pipeline */}
      {stages.length > 0 && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <h2 class="font-semibold text-text mb-4">Generated Pipeline</h2>
          {hasErrors && (
            <div class="mb-3 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-xs text-yellow-400">
              ⚠ Some stages have invalid JSON. Fix errors before using in production.
            </div>
          )}

          {/* MongoDB Shell */}
          <div class="mb-4">
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-text-muted">MongoDB Shell</span>
              <button
                onClick={() => handleCopy(generateMongoShell())}
                class="text-xs px-2.5 py-1 rounded bg-surface border border-border text-text-muted hover:text-text transition-colors"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{generateMongoShell()}</pre>
          </div>

          {/* Node.js Driver */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-xs font-medium text-text-muted">Node.js (MongoDB Driver)</span>
              <button
                onClick={() => handleCopy(generateDriverCode())}
                class="text-xs px-2.5 py-1 rounded bg-surface border border-border text-text-muted hover:text-text transition-colors"
              >
                {copied ? '✓' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface border border-border rounded-lg p-3 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap">{generateDriverCode()}</pre>
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted text-center">
        Pipeline is generated client-side. Stage order matters — $match early for best performance.
      </p>
    </div>
  );
}
