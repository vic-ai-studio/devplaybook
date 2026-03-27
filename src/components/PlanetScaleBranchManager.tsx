import { useState } from 'preact/hooks';

type BranchStatus = 'production' | 'development' | 'feature';

interface Branch {
  id: string;
  name: string;
  parentId: string | null;
  status: BranchStatus;
  note: string;
}

type CommandCategory = 'create' | 'delete' | 'deploy' | 'diff' | 'connect' | 'schema';

const STATUS_COLORS: Record<BranchStatus, string> = {
  production: 'text-yellow-400 border-yellow-400 bg-yellow-400/10',
  development: 'text-blue-400 border-blue-400 bg-blue-400/10',
  feature: 'text-purple-400 border-purple-400 bg-purple-400/10',
};

const STATUS_LABELS: Record<BranchStatus, string> = {
  production: '🏭 Production',
  development: '🔧 Development',
  feature: '🌿 Feature',
};

const INITIAL_BRANCHES: Branch[] = [
  { id: 'main', name: 'main', parentId: null, status: 'production', note: 'Production database' },
  { id: 'dev', name: 'dev', parentId: 'main', status: 'development', note: 'Staging / dev environment' },
  { id: 'feat-auth', name: 'feat/add-auth-tables', parentId: 'dev', status: 'feature', note: 'Adding users + sessions tables' },
  { id: 'feat-orders', name: 'feat/orders-schema', parentId: 'dev', status: 'feature', note: 'New orders & line_items tables' },
];

function generateCmd(category: CommandCategory, branch: string, parent: string, db: string): string {
  const org = db || 'my-database';
  switch (category) {
    case 'create':
      return `# Create a new branch from ${parent || 'main'}
pscale branch create ${org} ${branch || 'my-feature'} --from ${parent || 'main'}

# Or using the web dashboard:
# Database > Branches > New branch`;

    case 'delete':
      return `# Delete a branch (cannot be undone)
pscale branch delete ${org} ${branch || 'my-feature'}

# Force delete without confirmation
pscale branch delete ${org} ${branch || 'my-feature'} --force`;

    case 'deploy':
      return `# Create a deploy request (like a PR for DB changes)
pscale deploy-request create ${org} ${branch || 'my-feature'}

# List open deploy requests
pscale deploy-request list ${org}

# Deploy to production (merges schema changes)
pscale deploy-request deploy ${org} <deploy-request-number>`;

    case 'diff':
      return `# Show schema diff between branches
pscale branch diff ${org} ${branch || 'my-feature'}

# Compare to a specific branch
pscale branch diff ${org} ${branch || 'my-feature'} --base ${parent || 'main'}`;

    case 'connect':
      return `# Connect to a branch (opens local MySQL proxy)
pscale connect ${org} ${branch || 'my-feature'} --port 3309

# In another terminal, connect with MySQL client:
mysql -u root -h 127.0.0.1 -P 3309

# Or use the connection string in your app:
DATABASE_URL="mysql://root@127.0.0.1:3309/${org}"`;

    case 'schema':
      return `# Show branch schema
pscale branch schema ${org} ${branch || 'my-feature'}

# Run a migration (DDL) on a branch
pscale shell ${org} ${branch || 'my-feature'} < migration.sql

# Example migration:
# ALTER TABLE users ADD COLUMN avatar_url TEXT;
# CREATE INDEX idx_users_email ON users(email);`;
  }
}

function renderTree(branches: Branch[], parentId: string | null, depth: number, selected: string, onSelect: (id: string) => void): JSX.Element[] {
  const children = branches.filter(b => b.parentId === parentId);
  return children.flatMap(b => [
    <div
      key={b.id}
      onClick={() => onSelect(b.id)}
      style={{ paddingLeft: `${depth * 20}px` }}
      class={`flex items-start gap-2 py-2 px-3 rounded cursor-pointer transition-colors ${selected === b.id ? 'bg-primary/10 border border-primary/30' : 'hover:bg-surface border border-transparent'}`}
    >
      {depth > 0 && <span class="text-text-muted mt-0.5 text-xs select-none">└─</span>}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 flex-wrap">
          <code class="text-sm font-mono font-medium text-text">{b.name}</code>
          <span class={`text-xs px-1.5 py-0.5 rounded border font-medium ${STATUS_COLORS[b.status]}`}>
            {STATUS_LABELS[b.status]}
          </span>
        </div>
        {b.note && <p class="text-xs text-text-muted mt-0.5 truncate">{b.note}</p>}
        {b.parentId && (
          <p class="text-xs text-text-muted/70 mt-0.5">branched from: {branches.find(x => x.id === b.parentId)?.name}</p>
        )}
      </div>
    </div>,
    ...renderTree(branches, b.id, depth + 1, selected, onSelect),
  ]);
}

export default function PlanetScaleBranchManager() {
  const [branches, setBranches] = useState<Branch[]>(INITIAL_BRANCHES);
  const [selected, setSelected] = useState('feat-auth');
  const [db, setDb] = useState('my-database');
  const [cmdCat, setCmdCat] = useState<CommandCategory>('create');
  const [copied, setCopied] = useState(false);

  // New branch form
  const [newName, setNewName] = useState('');
  const [newParent, setNewParent] = useState('dev');
  const [newStatus, setNewStatus] = useState<BranchStatus>('feature');
  const [newNote, setNewNote] = useState('');

  const selectedBranch = branches.find(b => b.id === selected);
  const parentBranch = branches.find(b => b.id === selectedBranch?.parentId);

  const cmd = generateCmd(cmdCat, selectedBranch?.name || '', parentBranch?.name || 'main', db);

  function copy() {
    navigator.clipboard.writeText(cmd).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  function addBranch() {
    if (!newName.trim()) return;
    const id = newName.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    setBranches(prev => [...prev, { id, name: newName.trim(), parentId: newParent, status: newStatus, note: newNote.trim() }]);
    setNewName('');
    setNewNote('');
    setSelected(id);
  }

  function deleteBranch(id: string) {
    if (id === 'main') return;
    setBranches(prev => {
      const filtered = prev.filter(b => b.id !== id);
      // Re-parent children to the deleted branch's parent
      const deleted = prev.find(b => b.id === id);
      return filtered.map(b => b.parentId === id ? { ...b, parentId: deleted?.parentId || 'main' } : b);
    });
    if (selected === id) setSelected('main');
  }

  const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-primary w-full';
  const btnCls = 'px-3 py-1.5 rounded text-sm font-medium transition-colors';

  const CMD_CATEGORIES: [CommandCategory, string][] = [
    ['create', 'Create Branch'],
    ['connect', 'Connect'],
    ['schema', 'Run Schema'],
    ['diff', 'Diff Branches'],
    ['deploy', 'Deploy Request'],
    ['delete', 'Delete Branch'],
  ];

  return (
    <div class="space-y-5">
      {/* DB name */}
      <div class="flex gap-3 items-end">
        <div class="flex-1">
          <label class="block text-xs text-text-muted mb-1">Database Name</label>
          <input value={db} onInput={e => setDb((e.target as HTMLInputElement).value)} class={inputCls} placeholder="my-database" />
        </div>
        <div class="text-xs text-text-muted pb-2">
          <span class="font-medium text-text">{branches.length}</span> branches
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Branch tree */}
        <div>
          <p class="text-sm font-medium text-text mb-2">Branch Tree</p>
          <div class="bg-surface border border-border rounded-lg p-2 space-y-0.5 min-h-48">
            {renderTree(branches, null, 0, selected, setSelected)}
          </div>

          {/* Add branch */}
          <div class="mt-3 bg-surface border border-border rounded-lg p-3 space-y-2">
            <p class="text-xs font-medium text-text">Add Branch</p>
            <div class="grid grid-cols-2 gap-2">
              <input value={newName} onInput={e => setNewName((e.target as HTMLInputElement).value)} class={inputCls} placeholder="feat/new-feature" onKeyDown={e => e.key === 'Enter' && addBranch()} />
              <select value={newParent} onChange={e => setNewParent((e.target as HTMLSelectElement).value)} class={inputCls}>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <select value={newStatus} onChange={e => setNewStatus((e.target as HTMLSelectElement).value as BranchStatus)} class={inputCls}>
                {(Object.keys(STATUS_LABELS) as BranchStatus[]).map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
              <input value={newNote} onInput={e => setNewNote((e.target as HTMLInputElement).value)} class={inputCls} placeholder="Short note" />
            </div>
            <div class="flex gap-2">
              <button onClick={addBranch} class={`${btnCls} bg-primary text-white flex-1`}>+ Add Branch</button>
              {selected !== 'main' && (
                <button onClick={() => deleteBranch(selected)} class={`${btnCls} bg-red-900/30 text-red-400 border border-red-800 hover:bg-red-900/50`}>Delete Selected</button>
              )}
            </div>
          </div>
        </div>

        {/* Command generator */}
        <div>
          <p class="text-sm font-medium text-text mb-2">
            pscale CLI Commands
            {selectedBranch && <span class="ml-1 text-text-muted font-normal">— {selectedBranch.name}</span>}
          </p>
          <div class="flex flex-wrap gap-1 mb-3">
            {CMD_CATEGORIES.map(([cat, label]) => (
              <button
                key={cat}
                onClick={() => setCmdCat(cat)}
                class={`${btnCls} text-xs border ${cmdCat === cat ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
              >{label}</button>
            ))}
          </div>
          <div class="relative">
            <pre class="bg-[#0d1117] text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre font-mono leading-relaxed border border-border min-h-36">{cmd}</pre>
            <button
              onClick={copy}
              class={`absolute top-2 right-2 ${btnCls} text-xs ${copied ? 'bg-green-600 text-white' : 'bg-surface/80 border border-border text-text-muted hover:text-text'}`}
            >{copied ? '✓ Copied' : 'Copy'}</button>
          </div>

          {/* Deploy request flow */}
          <div class="mt-3 bg-surface border border-border rounded-lg p-3 text-xs text-text-muted space-y-1.5">
            <p class="font-medium text-text text-sm">Deploy Request Workflow</p>
            <div class="flex items-center gap-2 flex-wrap">
              {['feature branch', '→', 'create deploy-request', '→', 'schema diff review', '→', 'deploy to production', '→', 'branch deleted'].map((s, i) => (
                <span key={i} class={s === '→' ? 'text-text-muted' : 'bg-bg px-2 py-0.5 rounded border border-border text-text'}>{s}</span>
              ))}
            </div>
            <p class="text-text-muted/70">PlanetScale deploy requests are non-blocking — queries continue running during schema migrations via online DDL.</p>
          </div>
        </div>
      </div>

      {/* Install hint */}
      <div class="bg-surface border border-border rounded-lg p-3 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text">Install pscale CLI</p>
        <p>macOS: <code class="font-mono bg-bg px-1 rounded">brew install planetscale/tap/pscale</code></p>
        <p>Windows: <code class="font-mono bg-bg px-1 rounded">scoop bucket add pscale https://github.com/planetscale/scoop-bucket && scoop install pscale</code></p>
        <p>Authenticate: <code class="font-mono bg-bg px-1 rounded">pscale auth login</code></p>
      </div>
    </div>
  );
}
