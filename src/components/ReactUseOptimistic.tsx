import { useState, useRef } from 'preact/hooks';

interface Todo {
  id: number;
  text: string;
  done: boolean;
  status: 'real' | 'optimistic' | 'error';
}

let nextId = 10;

const INITIAL_TODOS: Todo[] = [
  { id: 1, text: 'Read the useOptimistic docs', done: true, status: 'real' },
  { id: 2, text: 'Build a demo app', done: false, status: 'real' },
];

function simulateServer(action: 'add' | 'toggle' | 'delete', delayMs: number, failRate: number): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < failRate) {
        reject(new Error('Server error (simulated)'));
      } else {
        resolve();
      }
    }, delayMs);
  });
}

const CODE_ADD = `// React 19 useOptimistic pattern
function TodoList() {
  const [todos, setTodos] = useState(initialTodos);
  const [optimisticTodos, addOptimistic] = useOptimistic(
    todos,
    (currentTodos, newTodo) => [...currentTodos, { ...newTodo, pending: true }]
  );

  async function addTodo(text) {
    const tempTodo = { id: Date.now(), text, done: false };

    // Immediately show in UI
    addOptimistic(tempTodo);

    try {
      const saved = await api.createTodo(text); // real server call
      setTodos(prev => [...prev, saved]);        // commit real data
    } catch (err) {
      // useOptimistic auto-rolls back to \`todos\` on error
      toast.error('Failed to add todo');
    }
  }

  return optimisticTodos.map(todo => (
    <TodoItem key={todo.id} todo={todo} />
  ));
}`;

const CODE_TOGGLE = `// Optimistic toggle (mutation)
async function toggleTodo(id) {
  // Optimistic update: flip done immediately
  addOptimistic({ type: 'toggle', id });

  try {
    await api.toggleTodo(id);
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, done: !t.done } : t
    ));
  } catch {
    // Auto-rollback: UI reverts to real \`todos\` state
  }
}

// The reducer handles the optimistic state:
const [optimisticTodos, addOptimistic] = useOptimistic(
  todos,
  (state, { type, id }) => {
    if (type === 'toggle') {
      return state.map(t =>
        t.id === id ? { ...t, done: !t.done, pending: true } : t
      );
    }
    return state;
  }
);`;

const CODE_ROLLBACK = `// Rollback behavior
// useOptimistic automatically reverts optimistic state
// when the async action completes (success or failure).

// On SUCCESS:
// 1. addOptimistic() → immediate UI update
// 2. setTodos() → commits real server data
// 3. optimisticTodos re-derives from new todos

// On FAILURE (auto-rollback):
// 1. addOptimistic() → immediate UI update
// 2. Server call throws
// 3. useOptimistic reverts to last committed \`todos\`
// 4. No manual cleanup needed!

// The key insight:
// optimisticTodos = todos + pending optimistic changes
// When todos changes (setTodos), pending changes vanish`;

export default function ReactUseOptimistic() {
  const [todos, setTodos] = useState<Todo[]>(INITIAL_TODOS);
  // Simulate optimistic state manually (no real React 19 hook in Preact)
  const [pendingItems, setPendingItems] = useState<Set<number>>(new Set());
  const [errorItems, setErrorItems] = useState<Set<number>>(new Set());
  const [text, setText] = useState('');
  const [delay, setDelay] = useState(1500);
  const [failRate, setFailRate] = useState(0.3);
  const [tab, setTab] = useState<'add' | 'toggle' | 'rollback'>('add');
  const [copied, setCopied] = useState(false);
  const [log, setLog] = useState<string[]>(['→ useOptimistic playground ready']);

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 9)]);

  const optimisticTodos = todos.map(t => ({
    ...t,
    status: errorItems.has(t.id) ? 'error' as const : pendingItems.has(t.id) ? 'optimistic' as const : 'real' as const,
  }));

  const addTodo = async () => {
    if (!text.trim()) return;
    const id = nextId++;
    const newTodo: Todo = { id, text: text.trim(), done: false, status: 'optimistic' };
    setText('');

    // Optimistic: add immediately
    setTodos(prev => [...prev, newTodo]);
    setPendingItems(prev => new Set([...prev, id]));
    addLog(`⚡ Optimistic: added "${newTodo.text}"`);

    try {
      await simulateServer('add', delay, failRate);
      // Commit
      setTodos(prev => prev.map(t => t.id === id ? { ...t, status: 'real' } : t));
      setPendingItems(prev => { const s = new Set(prev); s.delete(id); return s; });
      addLog(`✅ Server confirmed: "${newTodo.text}"`);
    } catch {
      // Rollback
      setTodos(prev => prev.filter(t => t.id !== id));
      setPendingItems(prev => { const s = new Set(prev); s.delete(id); return s; });
      addLog(`❌ Rollback: "${newTodo.text}" removed`);
    }
  };

  const toggleTodo = async (id: number) => {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    // Optimistic toggle
    setTodos(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    setPendingItems(prev => new Set([...prev, id]));
    setErrorItems(prev => { const s = new Set(prev); s.delete(id); return s; });
    addLog(`⚡ Optimistic: toggled "${todo.text}"`);

    try {
      await simulateServer('toggle', delay, failRate);
      setPendingItems(prev => { const s = new Set(prev); s.delete(id); return s; });
      addLog(`✅ Server confirmed: toggled "${todo.text}"`);
    } catch {
      // Rollback
      setTodos(prev => prev.map(t => t.id === id ? { ...t, done: todo.done } : t));
      setPendingItems(prev => { const s = new Set(prev); s.delete(id); return s; });
      setErrorItems(prev => new Set([...prev, id]));
      addLog(`❌ Rollback: "${todo.text}" reverted`);
      setTimeout(() => setErrorItems(prev => { const s = new Set(prev); s.delete(id); return s; }), 2000);
    }
  };

  const codeMap = { add: CODE_ADD, toggle: CODE_TOGGLE, rollback: CODE_ROLLBACK };

  const copy = () => {
    navigator.clipboard.writeText(codeMap[tab]).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const statusColors = {
    real: 'text-text',
    optimistic: 'text-amber-400',
    error: 'text-red-400',
  };

  const statusLabels = {
    real: '',
    optimistic: ' ⟳ pending',
    error: ' ✗ failed',
  };

  return (
    <div class="space-y-6">
      {/* Demo */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Todo List */}
        <div class="bg-surface rounded-xl border border-border overflow-hidden">
          <div class="p-4 border-b border-border">
            <h2 class="font-semibold text-sm uppercase tracking-wide text-text-muted">Live Demo — optimisticTodos</h2>
          </div>
          <div class="divide-y divide-border">
            {optimisticTodos.map(todo => (
              <div
                key={todo.id}
                class={`flex items-center gap-3 px-4 py-3 transition-all ${todo.status === 'optimistic' ? 'opacity-60' : todo.status === 'error' ? 'bg-red-500/5' : ''}`}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  disabled={todo.status === 'optimistic'}
                  class={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${todo.done ? 'bg-green-500 border-green-500 text-white' : 'border-border hover:border-accent'}`}
                >
                  {todo.done && '✓'}
                </button>
                <span class={`flex-1 text-sm ${todo.done ? 'line-through text-text-muted' : ''} ${statusColors[todo.status]}`}>
                  {todo.text}
                  <span class="text-xs ml-1 opacity-70">{statusLabels[todo.status]}</span>
                </span>
                <span class={`text-xs px-1.5 py-0.5 rounded border font-mono ${
                  todo.status === 'real' ? 'border-green-500/30 text-green-400 bg-green-500/10' :
                  todo.status === 'optimistic' ? 'border-amber-500/30 text-amber-400 bg-amber-500/10' :
                  'border-red-500/30 text-red-400 bg-red-500/10'
                }`}>{todo.status}</span>
              </div>
            ))}
          </div>
          <div class="p-4 border-t border-border">
            <div class="flex gap-2">
              <input
                type="text"
                value={text}
                onInput={(e) => setText((e.target as HTMLInputElement).value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                placeholder="New todo..."
                class="flex-1 bg-bg border border-border rounded-lg px-3 py-2 text-sm"
              />
              <button
                onClick={addTodo}
                disabled={!text.trim()}
                class="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Controls + Log */}
        <div class="space-y-4">
          {/* Controls */}
          <div class="bg-surface rounded-xl p-4 border border-border space-y-3">
            <h2 class="font-semibold text-sm uppercase tracking-wide text-text-muted">Simulation Controls</h2>
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-sm font-medium">Server Delay</label>
                <span class="font-mono text-sm text-text-muted">{delay}ms</span>
              </div>
              <input
                type="range" min="500" max="4000" step="100" value={delay}
                onInput={(e) => setDelay(parseInt((e.target as HTMLInputElement).value))}
                class="w-full accent-accent"
              />
            </div>
            <div>
              <div class="flex justify-between mb-1">
                <label class="text-sm font-medium">Failure Rate</label>
                <span class="font-mono text-sm text-text-muted">{Math.round(failRate * 100)}%</span>
              </div>
              <input
                type="range" min="0" max="1" step="0.05" value={failRate}
                onInput={(e) => setFailRate(parseFloat((e.target as HTMLInputElement).value))}
                class="w-full accent-accent"
              />
              <p class="text-xs text-text-muted mt-1">Increase to trigger rollbacks more often</p>
            </div>
          </div>

          {/* Log */}
          <div class="bg-surface rounded-xl border border-border overflow-hidden">
            <div class="px-4 py-3 border-b border-border">
              <h2 class="font-semibold text-sm uppercase tracking-wide text-text-muted">Event Log</h2>
            </div>
            <div class="p-3 space-y-1 font-mono text-xs max-h-40 overflow-y-auto">
              {log.map((entry, i) => (
                <div key={i} class={`${entry.includes('⚡') ? 'text-amber-400' : entry.includes('✅') ? 'text-green-400' : entry.includes('❌') ? 'text-red-400' : 'text-text-muted'}`}>
                  {entry}
                </div>
              ))}
            </div>
          </div>

          {/* State Legend */}
          <div class="bg-surface rounded-xl p-4 border border-border text-sm">
            <p class="font-medium text-text mb-2">State Legend</p>
            <div class="space-y-1.5">
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded border border-green-500/30 text-green-400 bg-green-500/10 font-mono">real</span>
                <span class="text-text-muted">Committed to server — source of truth</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded border border-amber-500/30 text-amber-400 bg-amber-500/10 font-mono">optimistic</span>
                <span class="text-text-muted">Shown immediately, awaiting server</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-xs px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/10 font-mono">error</span>
                <span class="text-text-muted">Server rejected — rolled back</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Code */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between p-4 border-b border-border">
          <div class="flex gap-1">
            {(['add', 'toggle', 'rollback'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-accent text-white' : 'hover:bg-bg'}`}
              >
                {t === 'add' ? 'Add Item' : t === 'toggle' ? 'Toggle' : 'Rollback'}
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
        <pre class="p-4 text-sm font-mono overflow-x-auto text-text-muted leading-relaxed max-h-80">
          <code>{codeMap[tab]}</code>
        </pre>
      </div>

      {/* Key Concepts */}
      <div class="bg-surface rounded-xl p-5 border border-border text-sm">
        <p class="font-medium text-text mb-3">How useOptimistic Works</p>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { step: '1', title: 'Optimistic update', desc: 'Call addOptimistic(data) to immediately apply a change to the UI. The optimisticState reflects this right away.' },
            { step: '2', title: 'Real async call', desc: 'Run the actual server mutation in the background. The UI already shows the expected result — no spinner needed.' },
            { step: '3', title: 'Auto rollback', desc: 'On success, commit with setRealState(). On failure, React automatically reverts optimisticState to the last real state.' },
          ].map(({ step, title, desc }) => (
            <div key={step} class="bg-bg rounded-lg p-3 border border-border">
              <div class="w-6 h-6 rounded-full bg-accent text-white text-xs flex items-center justify-center mb-2 font-bold">{step}</div>
              <p class="font-medium mb-1">{title}</p>
              <p class="text-xs text-text-muted">{desc}</p>
            </div>
          ))}
        </div>
        <p class="text-text-muted mt-3 text-xs">
          <strong class="text-text">React 19 only.</strong> useOptimistic is available in React 19+ (stable). For React 18, use a manual optimistic state pattern with try/catch and useState.
        </p>
      </div>
    </div>
  );
}
