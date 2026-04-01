import { useState } from 'preact/hooks';

interface PipelineTask {
  id: string;
  name: string;
  dependsOn: string[];
  outputs: string[];
  inputs: string[];
  env: string[];
  cache: boolean;
  persistent: boolean;
}

const PRESET_TASKS: PipelineTask[] = [
  { id: '1', name: 'build', dependsOn: ['^build'], outputs: ['dist/**', '.next/**'], inputs: ['src/**', 'tsconfig.json'], env: ['NODE_ENV'], cache: true, persistent: false },
  { id: '2', name: 'test', dependsOn: ['build'], outputs: ['coverage/**'], inputs: ['src/**', '**/*.test.ts'], env: ['CI'], cache: true, persistent: false },
  { id: '3', name: 'lint', dependsOn: [], outputs: [], inputs: ['src/**', '.eslintrc*'], env: [], cache: true, persistent: false },
  { id: '4', name: 'typecheck', dependsOn: ['^typecheck'], outputs: [], inputs: ['src/**', 'tsconfig.json'], env: [], cache: true, persistent: false },
];

function generateTurboJson(tasks: PipelineTask[]): string {
  const pipeline: Record<string, unknown> = {};
  for (const t of tasks) {
    const entry: Record<string, unknown> = {};
    if (t.dependsOn.length > 0) entry.dependsOn = t.dependsOn;
    if (!t.cache) entry.cache = false;
    if (t.outputs.length > 0) entry.outputs = t.outputs;
    if (t.inputs.length > 0) entry.inputs = t.inputs;
    if (t.env.length > 0) entry.env = t.env;
    if (t.persistent) entry.persistent = true;
    pipeline[t.name] = entry;
  }
  return JSON.stringify({ $schema: 'https://turbo.build/schema.json', pipeline }, null, 2);
}

function buildGraph(tasks: PipelineTask[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  for (const t of tasks) {
    graph.set(t.name, t.dependsOn.filter(d => !d.startsWith('^')));
  }
  return graph;
}

export default function TurborepoBuilder() {
  const [tasks, setTasks] = useState<PipelineTask[]>(PRESET_TASKS);
  const [newTaskName, setNewTaskName] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'graph' | 'output'>('editor');
  const [editingTask, setEditingTask] = useState<string | null>(null);

  const addTask = () => {
    const name = newTaskName.trim();
    if (!name || tasks.find(t => t.name === name)) return;
    setTasks(prev => [...prev, {
      id: Date.now().toString(),
      name,
      dependsOn: [],
      outputs: [],
      inputs: ['src/**'],
      env: [],
      cache: true,
      persistent: false,
    }]);
    setNewTaskName('');
  };

  const removeTask = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    if (editingTask === id) setEditingTask(null);
  };

  const updateTask = (id: string, field: keyof PipelineTask, value: unknown) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const toggleDep = (taskId: string, dep: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const has = task.dependsOn.includes(dep);
    updateTask(taskId, 'dependsOn', has ? task.dependsOn.filter(d => d !== dep) : [...task.dependsOn, dep]);
  };

  const editArrayField = (id: string, field: 'outputs' | 'inputs' | 'env', raw: string) => {
    updateTask(id, field, raw.split('\n').map(s => s.trim()).filter(Boolean));
  };

  const output = generateTurboJson(tasks);
  const graph = buildGraph(tasks);
  const taskNames = tasks.map(t => t.name);

  const copyOutput = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const COMMON_DEPS = (taskName: string) => {
    return [`^${taskName}`, ...taskNames.filter(n => n !== taskName)];
  };

  const editing = tasks.find(t => t.id === editingTask);

  return (
    <div class="space-y-4">
      {/* Tab bar */}
      <div class="flex gap-1 border-b border-border">
        {(['editor', 'graph', 'output'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            class={`px-4 py-2 text-sm font-medium capitalize rounded-t transition-colors ${activeTab === tab ? 'bg-surface border border-b-surface border-border text-text' : 'text-text-muted hover:text-text'}`}
          >
            {tab === 'output' ? 'turbo.json' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'editor' && (
        <div class="space-y-3">
          {/* Add task */}
          <div class="flex gap-2">
            <input
              type="text"
              value={newTaskName}
              onInput={(e: Event) => setNewTaskName((e.target as HTMLInputElement).value)}
              onKeyDown={(e: KeyboardEvent) => e.key === 'Enter' && addTask()}
              placeholder="Task name (e.g. deploy, storybook)"
              class="flex-1 bg-surface border border-border rounded px-3 py-2 text-sm text-text placeholder-text-muted focus:outline-none focus:border-primary"
            />
            <button
              onClick={addTask}
              disabled={!newTaskName.trim()}
              class="px-4 py-2 bg-primary text-white rounded text-sm font-medium hover:bg-primary/90 disabled:opacity-40"
            >
              + Add Task
            </button>
          </div>

          {/* Task list */}
          <div class="space-y-2">
            {tasks.map(task => (
              <div key={task.id} class="border border-border rounded-lg bg-surface">
                <div class="flex items-center gap-3 px-4 py-3">
                  <span class="font-mono font-semibold text-sm text-primary flex-1">{task.name}</span>
                  <div class="flex items-center gap-2 text-xs text-text-muted">
                    {task.cache && <span class="bg-green-500/10 text-green-400 px-2 py-0.5 rounded">cached</span>}
                    {task.persistent && <span class="bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded">persistent</span>}
                    {task.dependsOn.length > 0 && <span class="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded">{task.dependsOn.length} dep{task.dependsOn.length > 1 ? 's' : ''}</span>}
                  </div>
                  <button
                    onClick={() => setEditingTask(editingTask === task.id ? null : task.id)}
                    class="text-xs px-2 py-1 rounded border border-border hover:bg-bg text-text-muted hover:text-text"
                  >
                    {editingTask === task.id ? 'Close' : 'Edit'}
                  </button>
                  <button
                    onClick={() => removeTask(task.id)}
                    class="text-red-400 hover:text-red-300 text-sm"
                  >
                    ×
                  </button>
                </div>

                {editingTask === task.id && (
                  <div class="border-t border-border px-4 py-4 space-y-4 bg-bg/50">
                    {/* dependsOn */}
                    <div>
                      <p class="text-xs font-semibold text-text-muted mb-2">dependsOn</p>
                      <div class="flex flex-wrap gap-2">
                        {COMMON_DEPS(task.name).map(dep => (
                          <label key={dep} class="flex items-center gap-1.5 text-xs cursor-pointer">
                            <input
                              type="checkbox"
                              checked={task.dependsOn.includes(dep)}
                              onChange={() => toggleDep(task.id, dep)}
                              class="rounded"
                            />
                            <span class="font-mono text-text">{dep}</span>
                            {dep.startsWith('^') && <span class="text-text-muted">(upstream)</span>}
                          </label>
                        ))}
                      </div>
                      {task.dependsOn.length > 0 && (
                        <p class="text-xs text-text-muted mt-1">Selected: {task.dependsOn.join(', ')}</p>
                      )}
                    </div>

                    {/* outputs */}
                    <div>
                      <label class="text-xs font-semibold text-text-muted block mb-1">outputs[] <span class="font-normal text-text-muted">(one per line)</span></label>
                      <textarea
                        rows={2}
                        value={task.outputs.join('\n')}
                        onInput={(e: Event) => editArrayField(task.id, 'outputs', (e.target as HTMLTextAreaElement).value)}
                        placeholder="dist/**&#10;.next/**"
                        class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    {/* inputs */}
                    <div>
                      <label class="text-xs font-semibold text-text-muted block mb-1">inputs[] <span class="font-normal text-text-muted">(one per line)</span></label>
                      <textarea
                        rows={2}
                        value={task.inputs.join('\n')}
                        onInput={(e: Event) => editArrayField(task.id, 'inputs', (e.target as HTMLTextAreaElement).value)}
                        placeholder="src/**&#10;tsconfig.json"
                        class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    {/* env */}
                    <div>
                      <label class="text-xs font-semibold text-text-muted block mb-1">env[] <span class="font-normal text-text-muted">(one per line)</span></label>
                      <textarea
                        rows={2}
                        value={task.env.join('\n')}
                        onInput={(e: Event) => editArrayField(task.id, 'env', (e.target as HTMLTextAreaElement).value)}
                        placeholder="NODE_ENV&#10;DATABASE_URL"
                        class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono text-text placeholder-text-muted focus:outline-none focus:border-primary resize-none"
                      />
                    </div>

                    {/* toggles */}
                    <div class="flex gap-6">
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={task.cache}
                          onChange={() => updateTask(task.id, 'cache', !task.cache)}
                        />
                        <span class="text-text">Enable cache</span>
                      </label>
                      <label class="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={task.persistent}
                          onChange={() => updateTask(task.id, 'persistent', !task.persistent)}
                        />
                        <span class="text-text">Persistent (dev servers)</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'graph' && (
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          <p class="text-xs text-text-muted mb-3">Task dependency graph — arrows show execution order</p>
          {tasks.map(task => {
            const deps = graph.get(task.name) || [];
            const upstreamDeps = task.dependsOn.filter(d => d.startsWith('^'));
            return (
              <div key={task.name} class="flex items-center gap-3 flex-wrap">
                <div class="bg-primary/10 border border-primary/30 text-primary font-mono text-sm px-3 py-1.5 rounded-lg min-w-[90px] text-center">
                  {task.name}
                </div>
                {(deps.length > 0 || upstreamDeps.length > 0) ? (
                  <>
                    <span class="text-text-muted">←</span>
                    <div class="flex gap-2 flex-wrap">
                      {deps.map(d => (
                        <span key={d} class="bg-surface border border-border font-mono text-sm px-2 py-1 rounded text-text">{d}</span>
                      ))}
                      {upstreamDeps.map(d => (
                        <span key={d} class="bg-yellow-500/10 border border-yellow-500/30 font-mono text-sm px-2 py-1 rounded text-yellow-400">{d} <span class="text-xs opacity-70">(all packages)</span></span>
                      ))}
                    </div>
                  </>
                ) : (
                  <span class="text-text-muted text-sm">← no dependencies (runs first)</span>
                )}
              </div>
            );
          })}
          <div class="mt-4 pt-4 border-t border-border grid grid-cols-2 gap-3 text-xs text-text-muted">
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-primary/20 border border-primary/40 inline-block"></span> Task</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/40 inline-block"></span> ^dep = wait for all upstream packages</div>
          </div>
        </div>
      )}

      {activeTab === 'output' && (
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <p class="text-xs text-text-muted">Generated <code class="font-mono">turbo.json</code> — paste into your monorepo root</p>
            <button
              onClick={copyOutput}
              class="text-xs px-3 py-1.5 bg-primary text-white rounded hover:bg-primary/90"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
          </div>
          <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono text-text overflow-x-auto whitespace-pre leading-relaxed">{output}</pre>
          <div class="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-xs text-blue-300 space-y-1">
            <p class="font-semibold">Usage tips:</p>
            <p>• Run all tasks: <code class="font-mono bg-blue-500/20 px-1 rounded">turbo run build test lint</code></p>
            <p>• Only affected: <code class="font-mono bg-blue-500/20 px-1 rounded">turbo run build --filter=[HEAD^1]</code></p>
            <p>• Dry run: <code class="font-mono bg-blue-500/20 px-1 rounded">turbo run build --dry=json</code></p>
          </div>
        </div>
      )}
    </div>
  );
}
