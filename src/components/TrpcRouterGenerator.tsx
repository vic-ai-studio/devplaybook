import { useState } from 'preact/hooks';

type ProcedureType = 'query' | 'mutation' | 'subscription';

interface Procedure {
  id: number;
  name: string;
  type: ProcedureType;
  inputSchema: string;
  outputSchema: string;
  description: string;
}

let nextId = 2;

const DEFAULT_PROCEDURES: Procedure[] = [
  {
    id: 1,
    name: 'getUser',
    type: 'query',
    inputSchema: 'z.object({ id: z.string() })',
    outputSchema: 'z.object({ id: z.string(), name: z.string(), email: z.string() })',
    description: 'Fetch a user by ID',
  },
];

function buildRouterCode(routerName: string, procs: Procedure[]): string {
  const imports = `import { z } from 'zod';
import { router, publicProcedure, protectedProcedure } from '../trpc';`;

  const procedures = procs.map(p => {
    const hasInput = p.inputSchema.trim() !== '';
    const hasOutput = p.outputSchema.trim() !== '';
    const inputLine = hasInput ? `\n    .input(${p.inputSchema})` : '';
    const outputLine = hasOutput ? `\n    .output(${p.outputSchema})` : '';

    if (p.type === 'query') {
      return `  /** ${p.description || p.name} */
  ${p.name}: publicProcedure${inputLine}${outputLine}
    .query(async ({ input${hasInput ? '' : ''}, ctx }) => {
      /* [IMPLEMENT] Add your ${p.name} query logic here. Fetch data from your DB/service and return it. Intentional scaffold placeholder — not a bug. Reference: https://trpc.io/docs/server/procedures */
      throw new Error('Not implemented');
    }),`;
    } else if (p.type === 'mutation') {
      return `  /** ${p.description || p.name} */
  ${p.name}: publicProcedure${inputLine}${outputLine}
    .mutation(async ({ input${hasInput ? '' : ''}, ctx }) => {
      /* [IMPLEMENT] Add your ${p.name} mutation logic here. Perform your write/side-effect operation and return the result. Intentional scaffold placeholder — not a bug. Reference: https://trpc.io/docs/server/procedures */
      throw new Error('Not implemented');
    }),`;
    } else {
      return `  /** ${p.description || p.name} — Subscription */
  ${p.name}: publicProcedure${inputLine}
    .subscription(async function* ({ input, ctx }) {
      /* [IMPLEMENT] Add your ${p.name} subscription logic here. Yield events via async generators for real-time data streaming. Intentional scaffold placeholder — not a bug. Reference: https://trpc.io/docs/server/subscriptions */
      yield { data: 'initial' };
    }),`;
    }
  }).join('\n\n');

  return `${imports}

export const ${routerName}Router = router({
${procedures}
});

export type ${capitalize(routerName)}Router = typeof ${routerName}Router;`;
}

function buildClientCode(routerName: string, procs: Procedure[]): string {
  const hooks = procs.map(p => {
    if (p.type === 'query') {
      const hasInput = p.inputSchema.trim() !== '';
      return `// ${p.description || p.name}
const { data, isLoading, error } = trpc.${routerName}.${p.name}.useQuery(${hasInput ? '{ /* input */ }' : ''});`;
    } else if (p.type === 'mutation') {
      return `// ${p.description || p.name}
const ${p.name}Mutation = trpc.${routerName}.${p.name}.useMutation({
  onSuccess: (data) => {
    console.log('${p.name} succeeded', data);
  },
  onError: (error) => {
    console.error('${p.name} failed', error);
  },
});

// Call it:
// ${p.name}Mutation.mutate({ /* input */ });`;
    } else {
      return `// ${p.description || p.name} — Subscription
trpc.${routerName}.${p.name}.useSubscription(undefined, {
  onData: (data) => {
    console.log('${p.name} data:', data);
  },
});`;
    }
  }).join('\n\n');

  return `import { trpc } from '../lib/trpc';

// ─── ${capitalize(routerName)} Router Client Hooks ───

${hooks}`;
}

function buildCallerCode(routerName: string): string {
  return `// Server-side caller (for SSR / API routes)
import { createCallerFactory } from '../trpc';
import { ${routerName}Router } from '../routers/${routerName}';

const createCaller = createCallerFactory(${routerName}Router);

// In your API handler or getServerSideProps:
const caller = createCaller({ /* ctx */ });
const result = await caller.${routerName}.yourProcedure({ /* input */ });`;
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const PROCEDURE_TEMPLATES = [
  { name: 'getList', type: 'query' as ProcedureType, inputSchema: 'z.object({ limit: z.number().default(10), cursor: z.string().optional() })', outputSchema: 'z.object({ items: z.array(z.any()), nextCursor: z.string().optional() })', description: 'Paginated list query' },
  { name: 'create', type: 'mutation' as ProcedureType, inputSchema: 'z.object({ name: z.string().min(1) })', outputSchema: 'z.object({ id: z.string(), name: z.string() })', description: 'Create a new item' },
  { name: 'update', type: 'mutation' as ProcedureType, inputSchema: 'z.object({ id: z.string(), data: z.object({ name: z.string().optional() }) })', outputSchema: 'z.object({ id: z.string() })', description: 'Update an existing item' },
  { name: 'delete', type: 'mutation' as ProcedureType, inputSchema: 'z.object({ id: z.string() })', outputSchema: 'z.object({ success: z.boolean() })', description: 'Delete an item by ID' },
  { name: 'onUpdate', type: 'subscription' as ProcedureType, inputSchema: 'z.object({ id: z.string() })', outputSchema: '', description: 'Subscribe to real-time updates' },
];

export default function TrpcRouterGenerator() {
  const [routerName, setRouterName] = useState('user');
  const [procs, setProcs] = useState<Procedure[]>(DEFAULT_PROCEDURES);
  const [tab, setTab] = useState<'router' | 'client' | 'caller'>('router');
  const [activeId, setActiveId] = useState(1);
  const [copied, setCopied] = useState(false);

  const active = procs.find(p => p.id === activeId);

  const addProcedure = () => {
    const id = nextId++;
    const p: Procedure = { id, name: 'newProcedure', type: 'query', inputSchema: 'z.object({ id: z.string() })', outputSchema: '', description: '' };
    setProcs(prev => [...prev, p]);
    setActiveId(id);
  };

  const addTemplate = (tmpl: typeof PROCEDURE_TEMPLATES[0]) => {
    const id = nextId++;
    setProcs(prev => [...prev, { id, ...tmpl }]);
    setActiveId(id);
  };

  const removeProcedure = (id: number) => {
    setProcs(prev => {
      const next = prev.filter(p => p.id !== id);
      if (activeId === id && next.length > 0) setActiveId(next[next.length - 1].id);
      return next;
    });
  };

  const update = (patch: Partial<Procedure>) => {
    setProcs(prev => prev.map(p => p.id === activeId ? { ...p, ...patch } : p));
  };

  const codeMap = {
    router: buildRouterCode(routerName, procs),
    client: buildClientCode(routerName, procs),
    caller: buildCallerCode(routerName),
  };
  const code = codeMap[tab];

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const typeColors: Record<ProcedureType, string> = {
    query: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    mutation: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    subscription: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  };

  return (
    <div class="space-y-6">
      {/* Router Name */}
      <div class="bg-surface rounded-xl p-5 border border-border">
        <label class="text-sm font-medium block mb-1">Router Name</label>
        <div class="flex items-center gap-2">
          <input
            type="text"
            value={routerName}
            onInput={(e) => setRouterName((e.target as HTMLInputElement).value || 'user')}
            placeholder="user"
            class="bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono flex-1"
          />
          <span class="text-text-muted text-sm">→ <code class="bg-bg px-1 rounded">{routerName}Router</code></span>
        </div>
      </div>

      {/* Procedure List */}
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Sidebar */}
        <div class="bg-surface rounded-xl border border-border overflow-hidden">
          <div class="p-3 border-b border-border flex items-center justify-between">
            <span class="text-sm font-semibold">Procedures ({procs.length})</span>
            <button
              onClick={addProcedure}
              class="text-xs px-2 py-1 rounded bg-accent text-white hover:bg-accent/80 transition-colors"
            >
              + Add
            </button>
          </div>
          <div class="divide-y divide-border">
            {procs.map(p => (
              <button
                key={p.id}
                onClick={() => setActiveId(p.id)}
                class={`w-full text-left px-3 py-2.5 flex items-center gap-2 transition-colors ${activeId === p.id ? 'bg-accent/10' : 'hover:bg-bg'}`}
              >
                <span class={`text-xs px-1.5 py-0.5 rounded border font-mono ${typeColors[p.type]}`}>{p.type[0].toUpperCase()}</span>
                <span class="font-mono text-sm truncate flex-1">{p.name}</span>
                {procs.length > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeProcedure(p.id); }}
                    class="text-text-muted hover:text-red-400 transition-colors text-xs"
                    title="Remove"
                  >×</button>
                )}
              </button>
            ))}
          </div>
          {/* Templates */}
          <div class="p-3 border-t border-border">
            <p class="text-xs text-text-muted mb-2 font-medium">Quick Add:</p>
            <div class="flex flex-wrap gap-1">
              {PROCEDURE_TEMPLATES.map(t => (
                <button
                  key={t.name}
                  onClick={() => addTemplate(t)}
                  class="text-xs px-2 py-0.5 rounded border border-border hover:border-accent transition-colors"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Editor */}
        <div class="md:col-span-2 bg-surface rounded-xl border border-border p-4 space-y-4">
          {active ? (
            <>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs font-medium text-text-muted block mb-1">Procedure Name</label>
                  <input
                    type="text"
                    value={active.name}
                    onInput={(e) => update({ name: (e.target as HTMLInputElement).value })}
                    class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono"
                  />
                </div>
                <div>
                  <label class="text-xs font-medium text-text-muted block mb-1">Type</label>
                  <select
                    value={active.type}
                    onChange={(e) => update({ type: (e.target as HTMLSelectElement).value as ProcedureType })}
                    class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="query">query</option>
                    <option value="mutation">mutation</option>
                    <option value="subscription">subscription</option>
                  </select>
                </div>
              </div>

              <div>
                <label class="text-xs font-medium text-text-muted block mb-1">Input Schema (Zod)</label>
                <textarea
                  value={active.inputSchema}
                  onInput={(e) => update({ inputSchema: (e.target as HTMLTextAreaElement).value })}
                  rows={2}
                  placeholder="z.object({ id: z.string() })"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono resize-none"
                />
              </div>

              {active.type !== 'subscription' && (
                <div>
                  <label class="text-xs font-medium text-text-muted block mb-1">Output Schema (Zod)</label>
                  <textarea
                    value={active.outputSchema}
                    onInput={(e) => update({ outputSchema: (e.target as HTMLTextAreaElement).value })}
                    rows={2}
                    placeholder="z.object({ id: z.string(), name: z.string() })"
                    class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono resize-none"
                  />
                </div>
              )}

              <div>
                <label class="text-xs font-medium text-text-muted block mb-1">Description (comment)</label>
                <input
                  type="text"
                  value={active.description}
                  onInput={(e) => update({ description: (e.target as HTMLInputElement).value })}
                  placeholder="What does this procedure do?"
                  class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
            </>
          ) : (
            <p class="text-text-muted text-sm">Select a procedure to edit</p>
          )}
        </div>
      </div>

      {/* Code Output */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div class="flex gap-1">
            {(['router', 'client', 'caller'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-accent text-white' : 'hover:bg-bg'}`}
              >
                {t === 'router' ? 'Router' : t === 'client' ? 'Client Hooks' : 'Server Caller'}
              </button>
            ))}
          </div>
          <button
            onClick={copy}
            class="px-3 py-1.5 rounded-lg border border-border hover:border-accent text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="p-4 text-sm font-mono overflow-x-auto text-text-muted leading-relaxed max-h-96">
          <code>{code}</code>
        </pre>
      </div>

      {/* Legend */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm">
        <p class="font-medium text-text mb-3">Procedure Types</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { type: 'query', label: 'Query', desc: 'Read data. Uses GET semantics. Results are cached and deduped automatically with useQuery().' },
            { type: 'mutation', label: 'Mutation', desc: 'Write/side-effect operations. Not cached. Triggered manually with useMutation().mutate().' },
            { type: 'subscription', label: 'Subscription', desc: 'Real-time data streaming over WebSocket or SSE. Uses async generators. Requires subscription transport.' },
          ].map(({ type, label, desc }) => (
            <div key={type} class="bg-bg rounded-lg p-3 border border-border">
              <span class={`text-xs px-1.5 py-0.5 rounded border font-mono ${typeColors[type as ProcedureType]}`}>{type}</span>
              <p class="font-medium mt-2 mb-1">{label}</p>
              <p class="text-xs text-text-muted">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
