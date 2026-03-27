import { useState } from 'preact/hooks';

interface WorkspaceDef {
  id: string;
  name: string;
  description: string;
}

interface PipelineParam {
  id: string;
  name: string;
  type: 'string' | 'array';
  default: string;
  description: string;
}

interface TaskWorkspaceBinding {
  name: string;
  workspace: string;
}

interface TaskParamBinding {
  name: string;
  value: string;
}

interface PipelineTask {
  id: string;
  name: string;
  taskRefName: string;
  taskRefKind: 'Task' | 'ClusterTask';
  runAfter: string;
  timeout: string;
  workspaces: TaskWorkspaceBinding[];
  params: TaskParamBinding[];
}

const PRESET_TASKS: Record<string, Partial<PipelineTask>> = {
  'git-clone': {
    taskRefName: 'git-clone',
    taskRefKind: 'ClusterTask',
    params: [
      { name: 'url', value: '$(params.repo-url)' },
      { name: 'revision', value: '$(params.revision)' },
    ],
    workspaces: [{ name: 'output', workspace: 'source' }],
  },
  'buildah': {
    taskRefName: 'buildah',
    taskRefKind: 'ClusterTask',
    params: [
      { name: 'IMAGE', value: '$(params.image-name)' },
      { name: 'DOCKERFILE', value: './Dockerfile' },
    ],
    workspaces: [{ name: 'source', workspace: 'source' }],
  },
  'kaniko': {
    taskRefName: 'kaniko',
    taskRefKind: 'ClusterTask',
    params: [
      { name: 'IMAGE', value: '$(params.image-name)' },
      { name: 'DOCKERFILE', value: './Dockerfile' },
      { name: 'CONTEXT', value: './' },
    ],
    workspaces: [{ name: 'source', workspace: 'source' }],
  },
  'trivy-scan': {
    taskRefName: 'trivy-scanner',
    taskRefKind: 'Task',
    params: [
      { name: 'ARGS', value: 'image' },
      { name: 'IMAGE_PATH', value: '$(params.image-name)' },
    ],
    workspaces: [],
  },
  'kubectl-apply': {
    taskRefName: 'kubernetes-actions',
    taskRefKind: 'ClusterTask',
    params: [
      { name: 'script', value: 'kubectl apply -f k8s/' },
    ],
    workspaces: [{ name: 'kubeconfig-dir', workspace: 'kubeconfig' }],
  },
  'helm-upgrade': {
    taskRefName: 'helm-upgrade-from-source',
    taskRefKind: 'ClusterTask',
    params: [
      { name: 'charts_dir', value: './chart' },
      { name: 'release_name', value: '$(params.release-name)' },
      { name: 'release_namespace', value: 'default' },
    ],
    workspaces: [{ name: 'source', workspace: 'source' }],
  },
};

let counter = 0;
function newId() { return `item-${++counter}`; }

function defaultTask(preset?: string, taskList?: PipelineTask[]): PipelineTask {
  const base: PipelineTask = {
    id: newId(),
    name: preset ? preset : 'my-task',
    taskRefName: preset ? PRESET_TASKS[preset]!.taskRefName! : 'my-task',
    taskRefKind: 'ClusterTask',
    runAfter: taskList && taskList.length > 0 ? taskList[taskList.length - 1].name : '',
    timeout: '',
    workspaces: [],
    params: [],
  };
  if (preset && PRESET_TASKS[preset]) {
    const p = PRESET_TASKS[preset];
    return {
      ...base,
      taskRefName: p.taskRefName ?? base.taskRefName,
      taskRefKind: p.taskRefKind ?? base.taskRefKind,
      workspaces: p.workspaces ? p.workspaces.map(w => ({ ...w })) : [],
      params: p.params ? p.params.map(p2 => ({ ...p2 })) : [],
    };
  }
  return base;
}

function generatePipelineYAML(
  pipelineName: string,
  namespace: string,
  workspaces: WorkspaceDef[],
  params: PipelineParam[],
  tasks: PipelineTask[]
): string {
  const lines: string[] = [];
  lines.push('apiVersion: tekton.dev/v1');
  lines.push('kind: Pipeline');
  lines.push('metadata:');
  lines.push(`  name: ${pipelineName || 'my-pipeline'}`);
  if (namespace) lines.push(`  namespace: ${namespace}`);

  lines.push('spec:');

  if (workspaces.length > 0) {
    lines.push('  workspaces:');
    workspaces.forEach(ws => {
      lines.push(`    - name: ${ws.name || 'workspace'}`);
      if (ws.description) lines.push(`      description: "${ws.description}"`);
    });
  }

  if (params.length > 0) {
    lines.push('  params:');
    params.forEach(p => {
      lines.push(`    - name: ${p.name || 'param'}`);
      lines.push(`      type: ${p.type}`);
      if (p.description) lines.push(`      description: "${p.description}"`);
      if (p.default) lines.push(`      default: "${p.default}"`);
    });
  }

  if (tasks.length > 0) {
    lines.push('  tasks:');
    tasks.forEach(task => {
      lines.push(`    - name: ${task.name || 'task'}`);
      lines.push('      taskRef:');
      lines.push(`        name: ${task.taskRefName || 'my-task'}`);
      if (task.taskRefKind === 'ClusterTask') {
        lines.push('        kind: ClusterTask');
      }
      if (task.runAfter.trim()) {
        const deps = task.runAfter.split(',').map(s => s.trim()).filter(Boolean);
        if (deps.length > 0) {
          lines.push('      runAfter:');
          deps.forEach(d => lines.push(`        - ${d}`));
        }
      }
      if (task.timeout) lines.push(`      timeout: "${task.timeout}"`);
      if (task.workspaces.length > 0) {
        lines.push('      workspaces:');
        task.workspaces.forEach(wb => {
          lines.push(`        - name: ${wb.name}`);
          lines.push(`          workspace: ${wb.workspace}`);
        });
      }
      if (task.params.length > 0) {
        lines.push('      params:');
        task.params.forEach(pb => {
          lines.push(`        - name: ${pb.name}`);
          lines.push(`          value: ${pb.value}`);
        });
      }
    });
  }

  return lines.join('\n');
}

function generatePipelineRunYAML(
  pipelineName: string,
  namespace: string,
  workspaces: WorkspaceDef[],
  params: PipelineParam[]
): string {
  const lines: string[] = [];
  lines.push('apiVersion: tekton.dev/v1');
  lines.push('kind: PipelineRun');
  lines.push('metadata:');
  lines.push(`  name: ${pipelineName || 'my-pipeline'}-run-001`);
  if (namespace) lines.push(`  namespace: ${namespace}`);
  lines.push('spec:');
  lines.push('  pipelineRef:');
  lines.push(`    name: ${pipelineName || 'my-pipeline'}`);

  if (params.length > 0) {
    lines.push('  params:');
    params.forEach(p => {
      const val = p.default || (p.type === 'string' ? 'my-value' : '["item"]');
      lines.push(`    - name: ${p.name || 'param'}`);
      lines.push(`      value: "${val}"`);
    });
  }

  if (workspaces.length > 0) {
    lines.push('  workspaces:');
    workspaces.forEach(ws => {
      lines.push(`    - name: ${ws.name || 'workspace'}`);
      lines.push(`      persistentVolumeClaim:`);
      lines.push(`        claimName: ${ws.name || 'workspace'}-pvc`);
    });
  }

  return lines.join('\n');
}

function generateWorkspacesYAML(workspaces: WorkspaceDef[], namespace: string): string {
  if (workspaces.length === 0) return '# No workspaces defined';
  return workspaces.map(ws => {
    const lines: string[] = [];
    lines.push('apiVersion: v1');
    lines.push('kind: PersistentVolumeClaim');
    lines.push('metadata:');
    lines.push(`  name: ${ws.name || 'workspace'}-pvc`);
    if (namespace) lines.push(`  namespace: ${namespace}`);
    lines.push('spec:');
    lines.push('  accessModes:');
    lines.push('    - ReadWriteOnce');
    lines.push('  resources:');
    lines.push('    requests:');
    lines.push('      storage: 1Gi');
    return lines.join('\n');
  }).join('\n---\n');
}

type ActiveTab = 'pipeline' | 'pipelinerun' | 'workspaces';

export default function TektonPipelineBuilder() {
  const [pipelineName, setPipelineName] = useState('build-and-deploy');
  const [namespace, setNamespace] = useState('default');
  const [workspaces, setWorkspaces] = useState<WorkspaceDef[]>([
    { id: newId(), name: 'source', description: 'Source code workspace' },
  ]);
  const [params, setParams] = useState<PipelineParam[]>([
    { id: newId(), name: 'repo-url', type: 'string', default: 'https://github.com/my-org/my-repo', description: 'Git repository URL' },
    { id: newId(), name: 'image-name', type: 'string', default: 'my-org/my-app:latest', description: 'Container image name and tag' },
  ]);
  const [tasks, setTasks] = useState<PipelineTask[]>([
    { ...defaultTask('git-clone'), name: 'clone-source', runAfter: '' },
    { ...defaultTask('buildah'), name: 'build-image', runAfter: 'clone-source', id: newId() },
  ]);
  const [activeTab, setActiveTab] = useState<ActiveTab>('pipeline');
  const [copied, setCopied] = useState(false);

  // Workspace actions
  function addWorkspace() {
    setWorkspaces(prev => [...prev, { id: newId(), name: 'my-workspace', description: '' }]);
  }
  function removeWorkspace(id: string) {
    setWorkspaces(prev => prev.filter(w => w.id !== id));
  }
  function updateWorkspace(id: string, field: keyof WorkspaceDef, val: string) {
    setWorkspaces(prev => prev.map(w => w.id === id ? { ...w, [field]: val } : w));
  }

  // Param actions
  function addParam() {
    setParams(prev => [...prev, { id: newId(), name: 'my-param', type: 'string', default: '', description: '' }]);
  }
  function removeParam(id: string) {
    setParams(prev => prev.filter(p => p.id !== id));
  }
  function updateParam(id: string, field: keyof PipelineParam, val: string) {
    setParams(prev => prev.map(p => p.id === id ? { ...p, [field]: val } : p));
  }

  // Task actions
  function addTask(preset?: string) {
    setTasks(prev => [...prev, defaultTask(preset, prev)]);
  }
  function removeTask(id: string) {
    setTasks(prev => prev.filter(t => t.id !== id));
  }
  function updateTask(id: string, field: keyof PipelineTask, val: any) {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, [field]: val } : t));
  }
  function addTaskWorkspace(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, workspaces: [...t.workspaces, { name: '', workspace: workspaces[0]?.name || '' }] }
      : t));
  }
  function removeTaskWorkspace(taskId: string, i: number) {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, workspaces: t.workspaces.filter((_, idx) => idx !== i) }
      : t));
  }
  function updateTaskWorkspace(taskId: string, i: number, field: 'name' | 'workspace', val: string) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const next = [...t.workspaces];
      next[i] = { ...next[i], [field]: val };
      return { ...t, workspaces: next };
    }));
  }
  function addTaskParam(taskId: string) {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, params: [...t.params, { name: '', value: '' }] }
      : t));
  }
  function removeTaskParam(taskId: string, i: number) {
    setTasks(prev => prev.map(t => t.id === taskId
      ? { ...t, params: t.params.filter((_, idx) => idx !== i) }
      : t));
  }
  function updateTaskParam(taskId: string, i: number, field: 'name' | 'value', val: string) {
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const next = [...t.params];
      next[i] = { ...next[i], [field]: val };
      return { ...t, params: next };
    }));
  }

  const pipelineYAML = generatePipelineYAML(pipelineName, namespace, workspaces, params, tasks);
  const pipelineRunYAML = generatePipelineRunYAML(pipelineName, namespace, workspaces, params);
  const workspacesYAML = generateWorkspacesYAML(workspaces, namespace);

  const currentOutput = activeTab === 'pipeline' ? pipelineYAML
    : activeTab === 'pipelinerun' ? pipelineRunYAML
    : workspacesYAML;

  function handleCopy() {
    navigator.clipboard.writeText(currentOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config form */}
      <div class="space-y-5">

        {/* Pipeline metadata */}
        <div>
          <h3 class="text-sm font-semibold text-text mb-2">Pipeline</h3>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class={labelCls}>Pipeline Name</label>
              <input class={inputCls} value={pipelineName} placeholder="build-and-deploy"
                onInput={e => setPipelineName((e.target as HTMLInputElement).value)} />
            </div>
            <div>
              <label class={labelCls}>Namespace</label>
              <input class={inputCls} value={namespace} placeholder="default"
                onInput={e => setNamespace((e.target as HTMLInputElement).value)} />
            </div>
          </div>
        </div>

        {/* Workspaces */}
        <div class="border-t border-border pt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-text">Workspaces ({workspaces.length})</h3>
            <button onClick={addWorkspace} class="text-xs text-accent hover:underline">+ Add</button>
          </div>
          {workspaces.map((ws) => (
            <div key={ws.id} class="flex gap-1 mb-1 items-start">
              <div class="flex-1 space-y-1">
                <input class={inputCls} value={ws.name} placeholder="source"
                  onInput={e => updateWorkspace(ws.id, 'name', (e.target as HTMLInputElement).value)} />
                <input class="w-full text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text-muted"
                  value={ws.description} placeholder="Description (optional)"
                  onInput={e => updateWorkspace(ws.id, 'description', (e.target as HTMLInputElement).value)} />
              </div>
              <button onClick={() => removeWorkspace(ws.id)} class="text-red-400 hover:text-red-300 text-xs px-1 pt-1">✕</button>
            </div>
          ))}
        </div>

        {/* Params */}
        <div class="border-t border-border pt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-text">Pipeline Params ({params.length})</h3>
            <button onClick={addParam} class="text-xs text-accent hover:underline">+ Add</button>
          </div>
          {params.map(p => (
            <div key={p.id} class="mb-2 border border-border rounded p-2 bg-surface space-y-1">
              <div class="flex gap-1 items-center">
                <input class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={p.name} placeholder="param-name"
                  onInput={e => updateParam(p.id, 'name', (e.target as HTMLInputElement).value)} />
                <select class="font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                  value={p.type} onChange={e => updateParam(p.id, 'type', (e.target as HTMLSelectElement).value)}>
                  <option value="string">string</option>
                  <option value="array">array</option>
                </select>
                <button onClick={() => removeParam(p.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
              <input class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text-muted"
                value={p.default} placeholder="default value"
                onInput={e => updateParam(p.id, 'default', (e.target as HTMLInputElement).value)} />
              <input class="w-full text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text-muted"
                value={p.description} placeholder="Description (optional)"
                onInput={e => updateParam(p.id, 'description', (e.target as HTMLInputElement).value)} />
            </div>
          ))}
        </div>

        {/* Tasks */}
        <div class="border-t border-border pt-4">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold text-text">Tasks ({tasks.length})</h3>
            <div class="flex items-center gap-2">
              <select
                class="font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text-muted"
                onChange={e => {
                  const v = (e.target as HTMLSelectElement).value;
                  if (v === '__blank') addTask();
                  else if (v) addTask(v);
                  (e.target as HTMLSelectElement).value = '';
                }}
              >
                <option value="">+ Add task...</option>
                <option value="__blank">Blank task</option>
                <optgroup label="Pre-built">
                  {Object.keys(PRESET_TASKS).map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          <div class="space-y-3">
            {tasks.map((task, i) => (
              <div key={task.id} class="border border-border rounded-lg p-3 bg-surface space-y-2">
                <div class="flex items-center gap-1">
                  <span class="text-xs text-text-muted w-4">{i + 1}.</span>
                  <input class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={task.name} placeholder="task-name"
                    onInput={e => updateTask(task.id, 'name', (e.target as HTMLInputElement).value)} />
                  <button onClick={() => removeTask(task.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>

                <div class="grid grid-cols-2 gap-1">
                  <div>
                    <label class={labelCls}>Task Ref Name</label>
                    <input class={inputCls} value={task.taskRefName} placeholder="my-task"
                      onInput={e => updateTask(task.id, 'taskRefName', (e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label class={labelCls}>Kind</label>
                    <select class={inputCls} value={task.taskRefKind}
                      onChange={e => updateTask(task.id, 'taskRefKind', (e.target as HTMLSelectElement).value)}>
                      <option value="Task">Task</option>
                      <option value="ClusterTask">ClusterTask</option>
                    </select>
                  </div>
                </div>

                <div class="grid grid-cols-2 gap-1">
                  <div>
                    <label class={labelCls}>runAfter (comma-separated task names)</label>
                    <input class={inputCls} value={task.runAfter} placeholder="clone-source"
                      onInput={e => updateTask(task.id, 'runAfter', (e.target as HTMLInputElement).value)} />
                  </div>
                  <div>
                    <label class={labelCls}>Timeout (optional)</label>
                    <input class={inputCls} value={task.timeout} placeholder="10m"
                      onInput={e => updateTask(task.id, 'timeout', (e.target as HTMLInputElement).value)} />
                  </div>
                </div>

                {/* Task workspace bindings */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class={labelCls}>Workspace Bindings</label>
                    <button onClick={() => addTaskWorkspace(task.id)} class="text-xs text-accent hover:underline">+ Bind</button>
                  </div>
                  {task.workspaces.map((wb, wi) => (
                    <div key={wi} class="flex gap-1 mb-1 items-center">
                      <input value={wb.name} onInput={e => updateTaskWorkspace(task.id, wi, 'name', (e.target as HTMLInputElement).value)}
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent" placeholder="task-ws-name" />
                      <span class="text-text-muted text-xs">→</span>
                      <select value={wb.workspace} onChange={e => updateTaskWorkspace(task.id, wi, 'workspace', (e.target as HTMLSelectElement).value)}
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent">
                        {workspaces.map(ws => <option key={ws.id} value={ws.name}>{ws.name}</option>)}
                        <option value="">-- choose --</option>
                      </select>
                      <button onClick={() => removeTaskWorkspace(task.id, wi)} class="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>
                  ))}
                </div>

                {/* Task param bindings */}
                <div>
                  <div class="flex items-center justify-between mb-1">
                    <label class={labelCls}>Param Overrides</label>
                    <button onClick={() => addTaskParam(task.id)} class="text-xs text-accent hover:underline">+ Param</button>
                  </div>
                  {task.params.map((pb, pi) => (
                    <div key={pi} class="flex gap-1 mb-1 items-center">
                      <input value={pb.name} onInput={e => updateTaskParam(task.id, pi, 'name', (e.target as HTMLInputElement).value)}
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent" placeholder="name" />
                      <span class="text-text-muted text-xs">:</span>
                      <input value={pb.value} onInput={e => updateTaskParam(task.id, pi, 'value', (e.target as HTMLInputElement).value)}
                        class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent" placeholder="$(params.my-param)" />
                      <button onClick={() => removeTaskParam(task.id, pi)} class="text-red-400 hover:text-red-300 text-xs">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div class="border border-dashed border-border rounded-lg p-4 text-center text-text-muted text-sm">
                No tasks yet. Use "Add task..." to build your pipeline.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT: Output */}
      <div>
        {/* Tab bar */}
        <div class="flex gap-1 mb-2 bg-surface border border-border rounded-lg p-1">
          {([
            { id: 'pipeline', label: 'Pipeline YAML' },
            { id: 'pipelinerun', label: 'PipelineRun YAML' },
            { id: 'workspaces', label: 'Workspaces YAML' },
          ] as const).map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              class={`flex-1 text-xs font-medium px-2 py-1.5 rounded transition-colors ${
                activeTab === t.id
                  ? 'bg-accent text-white'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-text-muted">
            {activeTab === 'pipeline' && 'kubectl apply -f pipeline.yaml'}
            {activeTab === 'pipelinerun' && 'kubectl create -f pipelinerun.yaml'}
            {activeTab === 'workspaces' && 'kubectl apply -f workspaces.yaml (before the pipeline run)'}
          </span>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text-muted whitespace-pre">{currentOutput}</pre>

        <p class="text-xs text-text-muted mt-2">
          {activeTab === 'pipeline' && <>Apply then run: <code class="bg-surface px-1 rounded">tkn pipeline start {pipelineName || 'my-pipeline'} --use-param-defaults</code></>}
          {activeTab === 'pipelinerun' && <>Watch logs: <code class="bg-surface px-1 rounded">tkn pipelinerun logs -f --last</code></>}
          {activeTab === 'workspaces' && <>Apply workspaces first, then the Pipeline, then the PipelineRun.</>}
        </p>
      </div>
    </div>
  );
}
