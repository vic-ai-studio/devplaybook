import { useState } from 'preact/hooks';

type StageCategory = 'source' | 'transform' | 'sink';
type SourceType = 'database' | 'file' | 'api' | 'stream';
type TransformType = 'filter' | 'join' | 'aggregate' | 'normalize' | 'enrich' | 'validate' | 'deduplicate';
type SinkType = 'database' | 'data-warehouse' | 'file' | 'api' | 'stream';

const SOURCE_ICONS: Record<SourceType, string> = {
  database: '🗄️', file: '📄', api: '🌐', stream: '📡',
};
const SINK_ICONS: Record<SinkType, string> = {
  database: '🗄️', 'data-warehouse': '🏭', file: '📄', api: '🌐', stream: '📡',
};
const TRANSFORM_ICONS: Record<TransformType, string> = {
  filter: '🔍', join: '🔗', aggregate: '📊', normalize: '⚖️', enrich: '✨', validate: '✅', deduplicate: '🔁',
};

interface Stage {
  id: string;
  category: StageCategory;
  name: string;
  subtype: string;
  notes: string;
}

let _sid = 0;
function sid() { return `s-${++_sid}`; }

function defaultStage(category: StageCategory): Stage {
  const defaults: Record<StageCategory, { name: string; subtype: string }> = {
    source: { name: 'New Source', subtype: 'database' },
    transform: { name: 'New Transform', subtype: 'filter' },
    sink: { name: 'New Sink', subtype: 'database' },
  };
  return { id: sid(), category, ...defaults[category], notes: '' };
}

function mermaidId(s: Stage, idx: number): string {
  return `${s.category.charAt(0).toUpperCase()}${idx}`;
}

function generateMermaid(stages: Stage[]): string {
  if (stages.length === 0) return 'flowchart LR\n  %% Add stages above to generate a diagram';

  const lines: string[] = ['flowchart LR'];

  // Styles
  lines.push('  classDef source fill:#1e40af,stroke:#3b82f6,color:#fff');
  lines.push('  classDef transform fill:#6b21a8,stroke:#a855f7,color:#fff');
  lines.push('  classDef sink fill:#166534,stroke:#22c55e,color:#fff');
  lines.push('');

  // Node definitions
  const ids: string[] = [];
  const counters: Record<StageCategory, number> = { source: 0, transform: 0, sink: 0 };

  stages.forEach(s => {
    counters[s.category]++;
    const id = `${s.category.charAt(0).toUpperCase()}${counters[s.category]}`;
    ids.push(id);

    const icons: Record<StageCategory, string> = {
      source: SOURCE_ICONS[s.subtype as SourceType] || '📦',
      transform: TRANSFORM_ICONS[s.subtype as TransformType] || '⚙️',
      sink: SINK_ICONS[s.subtype as SinkType] || '📦',
    };

    const label = s.notes
      ? `${icons[s.category]} ${s.name}\\n${s.subtype}\\n${s.notes}`
      : `${icons[s.category]} ${s.name}\\n${s.subtype}`;

    if (s.category === 'source') {
      lines.push(`  ${id}["${label}"]:::source`);
    } else if (s.category === 'transform') {
      lines.push(`  ${id}(["${label}"]):::transform`);
    } else {
      lines.push(`  ${id}[/"${label}"/]:::sink`);
    }
  });

  lines.push('');

  // Edges
  for (let i = 0; i < ids.length - 1; i++) {
    lines.push(`  ${ids[i]} --> ${ids[i + 1]}`);
  }

  return lines.join('\n');
}

function generateText(stages: Stage[]): string {
  if (stages.length === 0) return 'No stages defined.';
  return stages.map((s, i) => {
    const arrow = i < stages.length - 1 ? ' →' : '';
    const note = s.notes ? ` (${s.notes})` : '';
    return `[${s.category.toUpperCase()}] ${s.name} (${s.subtype})${note}${arrow}`;
  }).join('\n');
}

const INITIAL_STAGES: Stage[] = [
  { id: sid(), category: 'source', name: 'PostgreSQL', subtype: 'database', notes: 'orders table' },
  { id: sid(), category: 'transform', name: 'Filter & Join', subtype: 'join', notes: 'join with users' },
  { id: sid(), category: 'transform', name: 'Aggregate', subtype: 'aggregate', notes: 'daily revenue' },
  { id: sid(), category: 'sink', name: 'Snowflake', subtype: 'data-warehouse', notes: 'analytics schema' },
];

export default function DataPipelineDiagramGenerator() {
  const [stages, setStages] = useState<Stage[]>(INITIAL_STAGES);
  const [copiedMermaid, setCopiedMermaid] = useState(false);
  const [activeView, setActiveView] = useState<'mermaid' | 'text'>('mermaid');

  function addStage(category: StageCategory) {
    setStages(s => [...s, defaultStage(category)]);
  }

  function removeStage(id: string) {
    setStages(s => s.filter(x => x.id !== id));
  }

  function updateStage(id: string, patch: Partial<Stage>) {
    setStages(s => s.map(x => x.id === id ? { ...x, ...patch } : x));
  }

  function moveUp(idx: number) {
    if (idx === 0) return;
    setStages(s => {
      const arr = [...s];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  }

  function moveDown(idx: number) {
    setStages(s => {
      if (idx >= s.length - 1) return s;
      const arr = [...s];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  }

  const mermaid = generateMermaid(stages);
  const textRep = generateText(stages);

  function copyMermaid() {
    navigator.clipboard.writeText(mermaid).then(() => {
      setCopiedMermaid(true);
      setTimeout(() => setCopiedMermaid(false), 2000);
    });
  }

  const catColors: Record<StageCategory, string> = {
    source: 'border-l-blue-500 bg-blue-500/5',
    transform: 'border-l-purple-500 bg-purple-500/5',
    sink: 'border-l-green-500 bg-green-500/5',
  };
  const catBadge: Record<StageCategory, string> = {
    source: 'bg-blue-500/20 text-blue-400',
    transform: 'bg-purple-500/20 text-purple-400',
    sink: 'bg-green-500/20 text-green-400',
  };

  const SOURCE_SUBTYPES: SourceType[] = ['database', 'file', 'api', 'stream'];
  const TRANSFORM_SUBTYPES: TransformType[] = ['filter', 'join', 'aggregate', 'normalize', 'enrich', 'validate', 'deduplicate'];
  const SINK_SUBTYPES: SinkType[] = ['database', 'data-warehouse', 'file', 'api', 'stream'];

  function subtypesFor(cat: StageCategory): string[] {
    if (cat === 'source') return SOURCE_SUBTYPES;
    if (cat === 'transform') return TRANSFORM_SUBTYPES;
    return SINK_SUBTYPES;
  }

  const inputCls = 'px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div class="space-y-6">
      {/* Add stage buttons */}
      <div class="flex gap-2 flex-wrap">
        <button onClick={() => addStage('source')} class="px-3 py-1.5 rounded-lg border border-blue-500/40 bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors">+ Source</button>
        <button onClick={() => addStage('transform')} class="px-3 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 transition-colors">+ Transform</button>
        <button onClick={() => addStage('sink')} class="px-3 py-1.5 rounded-lg border border-green-500/40 bg-green-500/10 text-green-400 text-sm font-medium hover:bg-green-500/20 transition-colors">+ Sink</button>
      </div>

      {/* Stage list */}
      <div class="space-y-2">
        {stages.map((stage, i) => (
          <div key={stage.id} class={`p-3 rounded-xl border border-border border-l-4 ${catColors[stage.category]}`}>
            <div class="flex items-center gap-2 flex-wrap">
              <div class="flex flex-col gap-0.5">
                <button onClick={() => moveUp(i)} disabled={i === 0} class="text-text-muted hover:text-text text-xs disabled:opacity-30 leading-none">▲</button>
                <button onClick={() => moveDown(i)} disabled={i === stages.length - 1} class="text-text-muted hover:text-text text-xs disabled:opacity-30 leading-none">▼</button>
              </div>
              <span class={`text-xs px-2 py-0.5 rounded font-medium ${catBadge[stage.category]}`}>{stage.category}</span>
              <input
                value={stage.name}
                onInput={e => updateStage(stage.id, { name: (e.target as HTMLInputElement).value })}
                placeholder="Stage name"
                class={`${inputCls} flex-1 min-w-0`}
              />
              <select
                value={stage.subtype}
                onChange={e => updateStage(stage.id, { subtype: (e.target as HTMLSelectElement).value })}
                class={inputCls}
              >
                {subtypesFor(stage.category).map(st => <option key={st} value={st}>{st}</option>)}
              </select>
              <input
                value={stage.notes}
                onInput={e => updateStage(stage.id, { notes: (e.target as HTMLInputElement).value })}
                placeholder="Notes (optional)"
                class={`${inputCls} w-36`}
              />
              <button onClick={() => removeStage(stage.id)} class="text-red-400 hover:text-red-300 text-sm px-1">✕</button>
            </div>
          </div>
        ))}
        {stages.length === 0 && (
          <div class="p-6 text-center text-sm text-text-muted border border-border rounded-xl">
            Add stages above to build your pipeline.
          </div>
        )}
      </div>

      {/* Pipeline flow preview */}
      {stages.length > 0 && (
        <div class="p-4 rounded-xl border border-border bg-surface overflow-x-auto">
          <p class="text-xs text-text-muted mb-2 font-medium">Pipeline Flow</p>
          <div class="flex items-center gap-2 flex-nowrap">
            {stages.map((s, i) => (
              <div key={s.id} class="flex items-center gap-2">
                <div class={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap ${catBadge[s.category]}`}>
                  {s.name}
                </div>
                {i < stages.length - 1 && <span class="text-text-muted">→</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output tabs */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex gap-2">
            <button
              onClick={() => setActiveView('mermaid')}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'mermaid' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
            >
              Mermaid Code
            </button>
            <button
              onClick={() => setActiveView('text')}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeView === 'text' ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
            >
              Text View
            </button>
          </div>
          {activeView === 'mermaid' && (
            <button onClick={copyMermaid} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
              {copiedMermaid ? '✓ Copied!' : 'Copy Mermaid'}
            </button>
          )}
        </div>
        <pre class="p-4 rounded-xl bg-surface-alt border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">
          {activeView === 'mermaid' ? mermaid : textRep}
        </pre>
      </div>

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Render this diagram:</p>
        <p class="text-xs text-text-muted">Paste the Mermaid code into <strong>mermaid.live</strong>, <strong>GitHub Markdown</strong> (```mermaid block), or <strong>Notion</strong> (Mermaid diagram block).</p>
      </div>
    </div>
  );
}
