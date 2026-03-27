import { useState } from 'preact/hooks';

type Environment = 'base' | 'dev' | 'staging' | 'prod';
type OutputTab = 'base' | 'overlay' | 'structure';

interface ImagePatch {
  id: string;
  name: string;
  newName: string;
  newTag: string;
}

interface LabelEntry {
  id: string;
  key: string;
  value: string;
}

interface ConfigMapGen {
  id: string;
  name: string;
  entries: { id: string; key: string; value: string }[];
}

interface PatchEntry {
  id: string;
  type: 'strategicMerge' | 'json';
  target: string;
  patch: string;
}

interface KustomizeConfig {
  environment: Environment;
  // Base settings
  baseResources: { id: string; name: string }[];
  // Overlay settings
  namespace: string;
  namePrefix: string;
  nameSuffix: string;
  labels: LabelEntry[];
  annotations: LabelEntry[];
  images: ImagePatch[];
  configMapGenerators: ConfigMapGen[];
  patches: PatchEntry[];
}

let counter = 0;
function newId() { return `k-${++counter}`; }

const ENV_DEFAULTS: Record<Environment, Partial<KustomizeConfig>> = {
  base: {
    namespace: '',
    namePrefix: '',
    nameSuffix: '',
  },
  dev: {
    namespace: 'dev',
    namePrefix: 'dev-',
    nameSuffix: '',
  },
  staging: {
    namespace: 'staging',
    namePrefix: 'staging-',
    nameSuffix: '',
  },
  prod: {
    namespace: 'production',
    namePrefix: '',
    nameSuffix: '',
  },
};

const ENV_IMAGE_TAGS: Record<Environment, string> = {
  base: 'latest',
  dev: 'dev',
  staging: 'staging',
  prod: 'v1.0.0',
};

function defaultConfig(env: Environment): KustomizeConfig {
  const isBase = env === 'base';
  return {
    environment: env,
    baseResources: [
      { id: newId(), name: 'deployment.yaml' },
      { id: newId(), name: 'service.yaml' },
      ...(isBase ? [{ id: newId(), name: 'configmap.yaml' }] : []),
    ],
    namespace: ENV_DEFAULTS[env].namespace ?? '',
    namePrefix: ENV_DEFAULTS[env].namePrefix ?? '',
    nameSuffix: ENV_DEFAULTS[env].nameSuffix ?? '',
    labels: isBase
      ? [{ id: newId(), key: 'app.kubernetes.io/managed-by', value: 'kustomize' }]
      : [{ id: newId(), key: 'environment', value: env }],
    annotations: [],
    images: isBase
      ? []
      : [{ id: newId(), name: 'nginx', newName: 'my-registry/nginx', newTag: ENV_IMAGE_TAGS[env] }],
    configMapGenerators: isBase
      ? [{ id: newId(), name: 'app-config', entries: [{ id: newId(), key: 'LOG_LEVEL', value: 'info' }, { id: newId(), key: 'PORT', value: '8080' }] }]
      : [{ id: newId(), name: 'app-config', entries: [{ id: newId(), key: 'LOG_LEVEL', value: env === 'prod' ? 'warn' : 'debug' }] }],
    patches: isBase
      ? []
      : [
          {
            id: newId(),
            type: 'strategicMerge',
            target: 'deployment-patch.yaml',
            patch: env === 'prod'
              ? `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 3`
              : `apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 1`,
          },
        ],
  };
}

function indent(n: number) { return ' '.repeat(n); }

function generateBaseKustomization(cfg: KustomizeConfig): string {
  const lines: string[] = ['apiVersion: kustomize.config.k8s.io/v1beta1', 'kind: Kustomization', ''];

  if (cfg.baseResources.length > 0) {
    lines.push('resources:');
    cfg.baseResources.forEach(r => {
      if (r.name.trim()) lines.push(`${indent(2)}- ${r.name.trim()}`);
    });
    lines.push('');
  }

  if (cfg.labels.length > 0) {
    lines.push('commonLabels:');
    cfg.labels.forEach(l => {
      if (l.key.trim()) lines.push(`${indent(2)}${l.key.trim()}: ${l.value}`);
    });
    lines.push('');
  }

  if (cfg.annotations.length > 0) {
    lines.push('commonAnnotations:');
    cfg.annotations.forEach(a => {
      if (a.key.trim()) lines.push(`${indent(2)}${a.key.trim()}: ${a.value}`);
    });
    lines.push('');
  }

  if (cfg.configMapGenerators.length > 0) {
    lines.push('configMapGenerator:');
    cfg.configMapGenerators.forEach(cm => {
      if (!cm.name.trim()) return;
      lines.push(`${indent(2)}- name: ${cm.name.trim()}`);
      const validEntries = cm.entries.filter(e => e.key.trim());
      if (validEntries.length > 0) {
        lines.push(`${indent(4)}literals:`);
        validEntries.forEach(e => {
          lines.push(`${indent(6)}- ${e.key.trim()}=${e.value}`);
        });
      }
    });
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

function generateOverlayKustomization(cfg: KustomizeConfig): string {
  const lines: string[] = ['apiVersion: kustomize.config.k8s.io/v1beta1', 'kind: Kustomization', ''];

  lines.push('resources:');
  lines.push(`${indent(2)}- ../../base`);
  lines.push('');

  if (cfg.namespace.trim()) {
    lines.push(`namespace: ${cfg.namespace.trim()}`);
    lines.push('');
  }

  if (cfg.namePrefix.trim()) {
    lines.push(`namePrefix: ${cfg.namePrefix.trim()}`);
  }
  if (cfg.nameSuffix.trim()) {
    lines.push(`nameSuffix: ${cfg.nameSuffix.trim()}`);
  }
  if (cfg.namePrefix.trim() || cfg.nameSuffix.trim()) {
    lines.push('');
  }

  if (cfg.labels.length > 0) {
    lines.push('commonLabels:');
    cfg.labels.forEach(l => {
      if (l.key.trim()) lines.push(`${indent(2)}${l.key.trim()}: ${l.value}`);
    });
    lines.push('');
  }

  if (cfg.annotations.length > 0) {
    lines.push('commonAnnotations:');
    cfg.annotations.forEach(a => {
      if (a.key.trim()) lines.push(`${indent(2)}${a.key.trim()}: ${a.value}`);
    });
    lines.push('');
  }

  const validImages = cfg.images.filter(img => img.name.trim());
  if (validImages.length > 0) {
    lines.push('images:');
    validImages.forEach(img => {
      lines.push(`${indent(2)}- name: ${img.name.trim()}`);
      if (img.newName.trim()) lines.push(`${indent(4)}newName: ${img.newName.trim()}`);
      if (img.newTag.trim()) lines.push(`${indent(4)}newTag: ${img.newTag.trim()}`);
    });
    lines.push('');
  }

  if (cfg.configMapGenerators.length > 0) {
    lines.push('configMapGenerator:');
    cfg.configMapGenerators.forEach(cm => {
      if (!cm.name.trim()) return;
      lines.push(`${indent(2)}- name: ${cm.name.trim()}`);
      lines.push(`${indent(4)}behavior: merge`);
      const validEntries = cm.entries.filter(e => e.key.trim());
      if (validEntries.length > 0) {
        lines.push(`${indent(4)}literals:`);
        validEntries.forEach(e => {
          lines.push(`${indent(6)}- ${e.key.trim()}=${e.value}`);
        });
      }
    });
    lines.push('');
  }

  const validPatches = cfg.patches.filter(p => p.target.trim());
  if (validPatches.length > 0) {
    const smPatches = validPatches.filter(p => p.type === 'strategicMerge');
    const jsonPatches = validPatches.filter(p => p.type === 'json');

    if (smPatches.length > 0) {
      lines.push('patches:');
      smPatches.forEach(p => {
        lines.push(`${indent(2)}- path: ${p.target.trim()}`);
      });
      lines.push('');
    }

    if (jsonPatches.length > 0) {
      lines.push('# JSON patches — define target + patch inline');
      lines.push('patchesJson6902:');
      jsonPatches.forEach(p => {
        lines.push(`${indent(2)}- target:`);
        lines.push(`${indent(6)}group: apps`);
        lines.push(`${indent(6)}version: v1`);
        lines.push(`${indent(6)}kind: Deployment`);
        lines.push(`${indent(6)}name: my-app`);
        lines.push(`${indent(4)}patch: |`);
        p.patch.split('\n').forEach(line => {
          lines.push(`${indent(6)}${line}`);
        });
      });
      lines.push('');
    }
  }

  return lines.join('\n').trimEnd();
}

function generateDirectoryStructure(cfg: KustomizeConfig): string {
  const env = cfg.environment === 'base' ? '(select an overlay)' : cfg.environment;
  const lines: string[] = [
    'k8s/',
    '├── base/',
    '│   ├── kustomization.yaml',
    '│   ├── deployment.yaml',
    '│   ├── service.yaml',
    '│   └── configmap.yaml',
    '└── overlays/',
    '    ├── dev/',
    '    │   ├── kustomization.yaml',
    '    │   └── deployment-patch.yaml',
    '    ├── staging/',
    '    │   ├── kustomization.yaml',
    '    │   └── deployment-patch.yaml',
    '    └── prod/',
    '        ├── kustomization.yaml',
    '        └── deployment-patch.yaml',
    '',
    '# Apply base:',
    'kubectl apply -k k8s/base/',
    '',
    `# Apply ${env === '(select an overlay)' ? 'an overlay' : cfg.environment} overlay:`,
    `kubectl apply -k k8s/overlays/${cfg.environment === 'base' ? '<env>' : cfg.environment}/`,
    '',
    '# Preview rendered manifests (dry run):',
    `kubectl kustomize k8s/overlays/${cfg.environment === 'base' ? '<env>' : cfg.environment}/`,
    '',
    '# Using kustomize CLI directly:',
    `kustomize build k8s/overlays/${cfg.environment === 'base' ? '<env>' : cfg.environment}/ | kubectl apply -f -`,
    '',
    '# Diff before applying:',
    `kubectl diff -k k8s/overlays/${cfg.environment === 'base' ? '<env>' : cfg.environment}/`,
  ];

  if (cfg.patches.length > 0 && cfg.environment !== 'base') {
    lines.push('');
    lines.push(`# Patch files to create in overlays/${cfg.environment}/:`);
    cfg.patches.forEach(p => {
      if (!p.target.trim()) return;
      lines.push(`# ${p.target.trim()}:`);
      p.patch.split('\n').forEach(line => lines.push(`#   ${line}`));
    });
  }

  return lines.join('\n');
}

export default function KustomizeOverlayGenerator() {
  const [cfg, setCfg] = useState<KustomizeConfig>(defaultConfig('base'));
  const [activeTab, setActiveTab] = useState<OutputTab>('base');
  const [copied, setCopied] = useState(false);

  function applyEnv(env: Environment) {
    setCfg(defaultConfig(env));
    setActiveTab(env === 'base' ? 'base' : 'overlay');
  }

  function update<K extends keyof KustomizeConfig>(key: K, val: KustomizeConfig[K]) {
    setCfg(c => ({ ...c, [key]: val }));
  }

  // Resources
  function addResource() {
    setCfg(c => ({ ...c, baseResources: [...c.baseResources, { id: newId(), name: '' }] }));
  }
  function removeResource(id: string) {
    setCfg(c => ({ ...c, baseResources: c.baseResources.filter(r => r.id !== id) }));
  }
  function updateResource(id: string, name: string) {
    setCfg(c => ({ ...c, baseResources: c.baseResources.map(r => r.id === id ? { ...r, name } : r) }));
  }

  // Labels
  function addLabel() {
    setCfg(c => ({ ...c, labels: [...c.labels, { id: newId(), key: '', value: '' }] }));
  }
  function removeLabel(id: string) {
    setCfg(c => ({ ...c, labels: c.labels.filter(l => l.id !== id) }));
  }
  function updateLabel(id: string, field: 'key' | 'value', val: string) {
    setCfg(c => ({ ...c, labels: c.labels.map(l => l.id === id ? { ...l, [field]: val } : l) }));
  }

  // Annotations
  function addAnnotation() {
    setCfg(c => ({ ...c, annotations: [...c.annotations, { id: newId(), key: '', value: '' }] }));
  }
  function removeAnnotation(id: string) {
    setCfg(c => ({ ...c, annotations: c.annotations.filter(a => a.id !== id) }));
  }
  function updateAnnotation(id: string, field: 'key' | 'value', val: string) {
    setCfg(c => ({ ...c, annotations: c.annotations.map(a => a.id === id ? { ...a, [field]: val } : a) }));
  }

  // Images
  function addImage() {
    setCfg(c => ({ ...c, images: [...c.images, { id: newId(), name: '', newName: '', newTag: '' }] }));
  }
  function removeImage(id: string) {
    setCfg(c => ({ ...c, images: c.images.filter(i => i.id !== id) }));
  }
  function updateImage(id: string, field: keyof Omit<ImagePatch, 'id'>, val: string) {
    setCfg(c => ({ ...c, images: c.images.map(i => i.id === id ? { ...i, [field]: val } : i) }));
  }

  // ConfigMap generators
  function addCM() {
    setCfg(c => ({ ...c, configMapGenerators: [...c.configMapGenerators, { id: newId(), name: '', entries: [{ id: newId(), key: '', value: '' }] }] }));
  }
  function removeCM(id: string) {
    setCfg(c => ({ ...c, configMapGenerators: c.configMapGenerators.filter(cm => cm.id !== id) }));
  }
  function updateCMName(id: string, name: string) {
    setCfg(c => ({ ...c, configMapGenerators: c.configMapGenerators.map(cm => cm.id === id ? { ...cm, name } : cm) }));
  }
  function addCMEntry(cmId: string) {
    setCfg(c => ({ ...c, configMapGenerators: c.configMapGenerators.map(cm => cm.id === cmId ? { ...cm, entries: [...cm.entries, { id: newId(), key: '', value: '' }] } : cm) }));
  }
  function removeCMEntry(cmId: string, entryId: string) {
    setCfg(c => ({ ...c, configMapGenerators: c.configMapGenerators.map(cm => cm.id === cmId ? { ...cm, entries: cm.entries.filter(e => e.id !== entryId) } : cm) }));
  }
  function updateCMEntry(cmId: string, entryId: string, field: 'key' | 'value', val: string) {
    setCfg(c => ({ ...c, configMapGenerators: c.configMapGenerators.map(cm => cm.id === cmId ? { ...cm, entries: cm.entries.map(e => e.id === entryId ? { ...e, [field]: val } : e) } : cm) }));
  }

  // Patches
  function addPatch() {
    setCfg(c => ({ ...c, patches: [...c.patches, { id: newId(), type: 'strategicMerge', target: 'deployment-patch.yaml', patch: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: my-app\nspec:\n  replicas: 2' }] }));
  }
  function removePatch(id: string) {
    setCfg(c => ({ ...c, patches: c.patches.filter(p => p.id !== id) }));
  }
  function updatePatch(id: string, field: keyof Omit<PatchEntry, 'id'>, val: string) {
    setCfg(c => ({ ...c, patches: c.patches.map(p => p.id === id ? { ...p, [field]: val } : p) }));
  }

  const baseYaml = generateBaseKustomization(cfg);
  const overlayYaml = generateOverlayKustomization(cfg);
  const structure = generateDirectoryStructure(cfg);

  const outputContent = activeTab === 'base' ? baseYaml : activeTab === 'overlay' ? overlayYaml : structure;

  function copy() {
    navigator.clipboard.writeText(outputContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-1 focus:ring-accent font-mono';
  const labelCls = 'block text-xs font-medium text-text-muted mb-1';
  const addBtnCls = 'text-xs px-2.5 py-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config Form */}
      <div class="space-y-5">
        {/* Environment Selector */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <label class={labelCls}>Environment</label>
          <div class="grid grid-cols-4 gap-2">
            {(['base', 'dev', 'staging', 'prod'] as Environment[]).map(env => (
              <button
                key={env}
                onClick={() => applyEnv(env)}
                class={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                  cfg.environment === env
                    ? 'bg-accent text-white border-accent'
                    : 'bg-surface border-border text-text hover:border-accent'
                }`}
              >
                {env}
              </button>
            ))}
          </div>
          <p class="text-xs text-text-muted mt-2">
            {cfg.environment === 'base'
              ? 'Base: shared resources referenced by all overlays'
              : `Overlay: ${cfg.environment} environment-specific configuration`}
          </p>
        </div>

        {/* Resources */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">
              {cfg.environment === 'base' ? 'Resources' : 'Base Path'}
            </h3>
            {cfg.environment === 'base' && (
              <button onClick={addResource} class={addBtnCls}>+ Add</button>
            )}
          </div>
          {cfg.environment !== 'base' ? (
            <p class="text-xs font-mono text-text-muted bg-surface px-3 py-2 rounded border border-border">../../base</p>
          ) : (
            <div class="space-y-2">
              {cfg.baseResources.map(r => (
                <div key={r.id} class="flex items-center gap-2">
                  <input value={r.name} onInput={e => updateResource(r.id, (e.target as HTMLInputElement).value)}
                    placeholder="deployment.yaml" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                  <button onClick={() => removeResource(r.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Namespace / Prefix / Suffix */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <h3 class="text-sm font-semibold text-text mb-3">Namespace & Naming</h3>
          <div class="space-y-2">
            <div>
              <label class={labelCls}>Namespace Override</label>
              <input value={cfg.namespace} onInput={e => update('namespace', (e.target as HTMLInputElement).value)}
                placeholder="production" class={inputCls} />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class={labelCls}>Name Prefix</label>
                <input value={cfg.namePrefix} onInput={e => update('namePrefix', (e.target as HTMLInputElement).value)}
                  placeholder="prod-" class={inputCls} />
              </div>
              <div>
                <label class={labelCls}>Name Suffix</label>
                <input value={cfg.nameSuffix} onInput={e => update('nameSuffix', (e.target as HTMLInputElement).value)}
                  placeholder="-v2" class={inputCls} />
              </div>
            </div>
          </div>
        </div>

        {/* Labels */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Common Labels</h3>
            <button onClick={addLabel} class={addBtnCls}>+ Add</button>
          </div>
          {cfg.labels.length === 0 && <p class="text-xs text-text-muted">No labels. Click + Add to insert one.</p>}
          <div class="space-y-2">
            {cfg.labels.map(l => (
              <div key={l.id} class="flex items-center gap-2">
                <input value={l.key} onInput={e => updateLabel(l.id, 'key', (e.target as HTMLInputElement).value)}
                  placeholder="key" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <span class="text-text-muted text-xs">:</span>
                <input value={l.value} onInput={e => updateLabel(l.id, 'value', (e.target as HTMLInputElement).value)}
                  placeholder="value" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <button onClick={() => removeLabel(l.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Annotations */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Common Annotations</h3>
            <button onClick={addAnnotation} class={addBtnCls}>+ Add</button>
          </div>
          {cfg.annotations.length === 0 && <p class="text-xs text-text-muted">No annotations. Click + Add to insert one.</p>}
          <div class="space-y-2">
            {cfg.annotations.map(a => (
              <div key={a.id} class="flex items-center gap-2">
                <input value={a.key} onInput={e => updateAnnotation(a.id, 'key', (e.target as HTMLInputElement).value)}
                  placeholder="key" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <span class="text-text-muted text-xs">:</span>
                <input value={a.value} onInput={e => updateAnnotation(a.id, 'value', (e.target as HTMLInputElement).value)}
                  placeholder="value" class="flex-1 px-2 py-1.5 rounded bg-surface border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                <button onClick={() => removeAnnotation(a.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
              </div>
            ))}
          </div>
        </div>

        {/* Image Patches */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Image Replacements</h3>
            <button onClick={addImage} class={addBtnCls}>+ Add</button>
          </div>
          {cfg.images.length === 0 && <p class="text-xs text-text-muted">No image overrides. Click + Add to insert one.</p>}
          <div class="space-y-3">
            {cfg.images.map(img => (
              <div key={img.id} class="space-y-1.5 p-3 rounded-lg bg-surface border border-border">
                <div class="flex items-center gap-2">
                  <input value={img.name} onInput={e => updateImage(img.id, 'name', (e.target as HTMLInputElement).value)}
                    placeholder="original image name" class="flex-1 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                  <button onClick={() => removeImage(img.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <input value={img.newName} onInput={e => updateImage(img.id, 'newName', (e.target as HTMLInputElement).value)}
                    placeholder="newName (optional)" class="px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                  <input value={img.newTag} onInput={e => updateImage(img.id, 'newTag', (e.target as HTMLInputElement).value)}
                    placeholder="newTag" class="px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ConfigMap Generators */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">ConfigMap Generators</h3>
            <button onClick={addCM} class={addBtnCls}>+ Add</button>
          </div>
          {cfg.configMapGenerators.length === 0 && <p class="text-xs text-text-muted">No ConfigMap generators.</p>}
          <div class="space-y-3">
            {cfg.configMapGenerators.map(cm => (
              <div key={cm.id} class="p-3 rounded-lg bg-surface border border-border space-y-2">
                <div class="flex items-center gap-2">
                  <input value={cm.name} onInput={e => updateCMName(cm.id, (e.target as HTMLInputElement).value)}
                    placeholder="configmap-name" class="flex-1 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                  <button onClick={() => addCMEntry(cm.id)} class="text-xs px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20">+</button>
                  <button onClick={() => removeCM(cm.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>
                {cm.entries.map(entry => (
                  <div key={entry.id} class="flex items-center gap-2 pl-2">
                    <input value={entry.key} onInput={e => updateCMEntry(cm.id, entry.id, 'key', (e.target as HTMLInputElement).value)}
                      placeholder="KEY" class="flex-1 px-2 py-1 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                    <span class="text-text-muted text-xs">=</span>
                    <input value={entry.value} onInput={e => updateCMEntry(cm.id, entry.id, 'value', (e.target as HTMLInputElement).value)}
                      placeholder="value" class="flex-1 px-2 py-1 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                    <button onClick={() => removeCMEntry(cm.id, entry.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Patches */}
        <div class="p-4 rounded-xl border border-border bg-surface-alt">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-text">Patches</h3>
            <button onClick={addPatch} class={addBtnCls}>+ Add</button>
          </div>
          {cfg.patches.length === 0 && <p class="text-xs text-text-muted">No patches. Click + Add to add a strategic merge or JSON patch.</p>}
          <div class="space-y-3">
            {cfg.patches.map(p => (
              <div key={p.id} class="p-3 rounded-lg bg-surface border border-border space-y-2">
                <div class="flex items-center gap-2">
                  <select value={p.type} onChange={e => updatePatch(p.id, 'type', (e.target as HTMLSelectElement).value as any)}
                    class="px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs focus:outline-none focus:border-accent">
                    <option value="strategicMerge">Strategic Merge</option>
                    <option value="json">JSON Patch</option>
                  </select>
                  <input value={p.target} onInput={e => updatePatch(p.id, 'target', (e.target as HTMLInputElement).value)}
                    placeholder="patch-file.yaml" class="flex-1 px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent" />
                  <button onClick={() => removePatch(p.id)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
                </div>
                <textarea
                  value={p.patch}
                  onInput={e => updatePatch(p.id, 'patch', (e.target as HTMLTextAreaElement).value)}
                  rows={4}
                  placeholder="Patch YAML content..."
                  class="w-full px-2 py-1.5 rounded bg-surface-alt border border-border text-text text-xs font-mono focus:outline-none focus:border-accent resize-none"
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT: Output */}
      <div class="flex flex-col gap-3">
        {/* Tabs */}
        <div class="flex items-center gap-1 bg-surface-alt rounded-lg p-1 border border-border">
          {([
            { id: 'base', label: 'Base kustomization.yaml' },
            { id: 'overlay', label: 'Overlay kustomization.yaml' },
            { id: 'structure', label: 'Directory Structure' },
          ] as { id: OutputTab; label: string }[]).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              class={`flex-1 text-xs font-medium px-2 py-1.5 rounded-md transition-colors ${
                activeTab === tab.id ? 'bg-accent text-white' : 'text-text-muted hover:text-text'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Output header */}
        <div class="flex items-center justify-between">
          <span class="text-xs font-mono text-text-muted">
            {activeTab === 'base'
              ? 'k8s/base/kustomization.yaml'
              : activeTab === 'overlay'
              ? `k8s/overlays/${cfg.environment}/kustomization.yaml`
              : 'Directory layout & apply commands'}
          </span>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-accent transition-colors text-text">
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text whitespace-pre">{outputContent}</pre>

        {/* Apply commands */}
        <div class="p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs space-y-1 text-text-muted">
          <p class="font-semibold text-text text-sm mb-2">Apply Commands</p>
          <p><code class="font-mono">kubectl apply -k k8s/base/</code></p>
          <p><code class="font-mono">kubectl apply -k k8s/overlays/{cfg.environment === 'base' ? '<env>' : cfg.environment}/</code></p>
          <p class="mt-2"><code class="font-mono">kubectl kustomize k8s/overlays/{cfg.environment === 'base' ? '<env>' : cfg.environment}/</code> — preview without applying</p>
          <p><code class="font-mono">kubectl diff -k k8s/overlays/{cfg.environment === 'base' ? '<env>' : cfg.environment}/</code> — diff before apply</p>
        </div>
      </div>
    </div>
  );
}
