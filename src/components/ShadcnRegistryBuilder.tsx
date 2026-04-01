import { useState } from 'preact/hooks';

type RegistryType = 'registry:ui' | 'registry:component' | 'registry:lib' | 'registry:hook' | 'registry:block';

interface RegistryFile {
  path: string;
  type: 'registry:ui' | 'registry:component' | 'registry:lib';
  content?: string;
}

interface Dependency { name: string }
interface DevDependency { name: string }

export default function ShadcnRegistryBuilder() {
  const [componentName, setComponentName] = useState('data-table');
  const [registryType, setRegistryType] = useState<RegistryType>('registry:ui');
  const [description, setDescription] = useState('A reusable data table component with sorting and filtering');
  const [files, setFiles] = useState<RegistryFile[]>([
    { path: 'registry/ui/data-table.tsx', type: 'registry:ui' },
  ]);
  const [deps, setDeps] = useState<Dependency[]>([
    { name: '@tanstack/react-table' },
  ]);
  const [devDeps, setDevDeps] = useState<DevDependency[]>([]);
  const [tailwindConfig, setTailwindConfig] = useState('');
  const [registryDeps, setRegistryDeps] = useState('button,badge');
  const [registryUrl, setRegistryUrl] = useState('https://your-registry.com/r');
  const [copied, setCopied] = useState(false);
  const [copiedInstall, setCopiedInstall] = useState(false);

  function generateRegistryJson(): object {
    const entry: Record<string, unknown> = {
      name: componentName,
      type: registryType,
      description,
      registryDependencies: registryDeps ? registryDeps.split(',').map(s => s.trim()).filter(Boolean) : [],
      dependencies: deps.map(d => d.name).filter(Boolean),
      devDependencies: devDeps.map(d => d.name).filter(Boolean),
      files: files.map(f => ({
        path: f.path,
        type: f.type,
      })),
    };

    if (tailwindConfig.trim()) {
      entry.tailwind = { config: { theme: { extend: {} } } };
    }

    const registry = {
      $schema: 'https://ui.shadcn.com/schema/registry-item.json',
      ...entry,
    };

    return registry;
  }

  function generateRegistryIndexJson(): object {
    return {
      $schema: 'https://ui.shadcn.com/schema/registry.json',
      name: 'my-registry',
      homepage: registryUrl.replace('/r', ''),
      items: [generateRegistryJson()],
    };
  }

  const registryJson = JSON.stringify(generateRegistryJson(), null, 2);
  const registryIndexJson = JSON.stringify(generateRegistryIndexJson(), null, 2);
  const installCmd = `npx shadcn@latest add ${registryUrl}/${componentName}.json`;

  const copy = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const download = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const inputCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono';
  const selectCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';
  const btnSmCls = 'px-2 py-1 text-xs bg-bg-card border border-border rounded hover:border-primary transition-colors';

  return (
    <div class="space-y-6">
      {/* Basic info */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Component Name (slug)</label>
          <input class={inputCls} type="text" value={componentName} onInput={e => setComponentName((e.target as HTMLInputElement).value)} placeholder="data-table" />
        </div>
        <div>
          <label class={labelCls}>Registry Type</label>
          <select class={selectCls} value={registryType} onChange={e => setRegistryType((e.target as HTMLSelectElement).value as RegistryType)}>
            <option value="registry:ui">registry:ui (UI component)</option>
            <option value="registry:component">registry:component (complex component)</option>
            <option value="registry:lib">registry:lib (utility library)</option>
            <option value="registry:hook">registry:hook (React hook)</option>
            <option value="registry:block">registry:block (page block/section)</option>
          </select>
        </div>
        <div class="md:col-span-2">
          <label class={labelCls}>Description</label>
          <input class={inputCls} type="text" value={description} onInput={e => setDescription((e.target as HTMLInputElement).value)} placeholder="A reusable component..." />
        </div>
        <div class="md:col-span-2">
          <label class={labelCls}>Registry URL (where your registry is hosted)</label>
          <input class={inputCls} type="text" value={registryUrl} onInput={e => setRegistryUrl((e.target as HTMLInputElement).value)} placeholder="https://your-registry.com/r" />
        </div>
        <div class="md:col-span-2">
          <label class={labelCls}>shadcn/ui Registry Dependencies (comma-separated)</label>
          <input class={inputCls} type="text" value={registryDeps} onInput={e => setRegistryDeps((e.target as HTMLInputElement).value)} placeholder="button,badge,card" />
          <p class="text-xs text-text-muted mt-1">Standard shadcn/ui components this depends on (e.g. button, badge)</p>
        </div>
      </div>

      {/* Files */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class={labelCls}>Component Files</label>
          <button onClick={() => setFiles(prev => [...prev, { path: 'registry/ui/new-file.tsx', type: 'registry:ui' }])} class={btnSmCls}>+ Add File</button>
        </div>
        {files.map((f, i) => (
          <div key={i} class="flex gap-2 mb-2">
            <input
              class={inputCls + ' flex-1'}
              placeholder="registry/ui/component.tsx"
              value={f.path}
              onInput={e => { const v = [...files]; v[i].path = (e.target as HTMLInputElement).value; setFiles(v); }}
            />
            <select
              class="bg-bg-card border border-border rounded-lg px-2 py-2 text-xs"
              value={f.type}
              onChange={e => { const v = [...files]; v[i].type = (e.target as HTMLSelectElement).value as RegistryFile['type']; setFiles(v); }}
            >
              <option value="registry:ui">ui</option>
              <option value="registry:component">component</option>
              <option value="registry:lib">lib</option>
            </select>
            <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} class="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
          </div>
        ))}
      </div>

      {/* Dependencies */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class={labelCls}>npm Dependencies</label>
            <button onClick={() => setDeps(prev => [...prev, { name: '' }])} class={btnSmCls}>+ Add</button>
          </div>
          {deps.map((d, i) => (
            <div key={i} class="flex gap-2 mb-2">
              <input class={inputCls + ' flex-1'} placeholder="package-name" value={d.name} onInput={e => { const v = [...deps]; v[i].name = (e.target as HTMLInputElement).value; setDeps(v); }} />
              <button onClick={() => setDeps(prev => prev.filter((_, idx) => idx !== i))} class="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
            </div>
          ))}
        </div>
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class={labelCls}>Dev Dependencies</label>
            <button onClick={() => setDevDeps(prev => [...prev, { name: '' }])} class={btnSmCls}>+ Add</button>
          </div>
          {devDeps.map((d, i) => (
            <div key={i} class="flex gap-2 mb-2">
              <input class={inputCls + ' flex-1'} placeholder="package-name" value={d.name} onInput={e => { const v = [...devDeps]; v[i].name = (e.target as HTMLInputElement).value; setDevDeps(v); }} />
              <button onClick={() => setDevDeps(prev => prev.filter((_, idx) => idx !== i))} class="text-xs text-red-400 hover:text-red-600 px-1">✕</button>
            </div>
          ))}
        </div>
      </div>

      {/* Install command */}
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Install command for users</label>
          <button onClick={() => copy(installCmd, setCopiedInstall)} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
            {copiedInstall ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <code class="text-xs font-mono text-primary">{installCmd}</code>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Registry item JSON ({componentName}.json)</label>
          <div class="flex gap-2">
            <button onClick={() => copy(registryJson, setCopied)} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button onClick={() => download(registryJson, `${componentName}.json`)} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-opacity">
              ↓ Download {componentName}.json
            </button>
          </div>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap">{registryJson}</pre>
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Registry index JSON (registry.json)</label>
          <button onClick={() => download(registryIndexJson, 'registry.json')} class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors">
            ↓ Download registry.json
          </button>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-72 whitespace-pre-wrap">{registryIndexJson}</pre>
      </div>
    </div>
  );
}
