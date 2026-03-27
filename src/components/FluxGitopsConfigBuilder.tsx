import { useState } from 'preact/hooks';

type ResourceType = 'GitRepository' | 'HelmRepository' | 'HelmRelease' | 'Kustomization' | 'ImagePolicy' | 'ImageUpdateAutomation';

const RESOURCE_LABELS: Record<ResourceType, string> = {
  GitRepository: 'GitRepository',
  HelmRepository: 'HelmRepository',
  HelmRelease: 'HelmRelease',
  Kustomization: 'Kustomization',
  ImagePolicy: 'ImagePolicy',
  ImageUpdateAutomation: 'ImageUpdateAutomation',
};

interface HelmValue { key: string; value: string; }

interface GitRepositoryResource {
  type: 'GitRepository';
  name: string;
  namespace: string;
  url: string;
  branch: string;
  interval: string;
  secretName: string;
}

interface HelmRepositoryResource {
  type: 'HelmRepository';
  name: string;
  namespace: string;
  url: string;
  interval: string;
  repoType: 'default' | 'oci';
}

interface HelmReleaseResource {
  type: 'HelmRelease';
  name: string;
  namespace: string;
  chartName: string;
  chartVersion: string;
  sourceRefName: string;
  sourceRefKind: 'HelmRepository' | 'GitRepository';
  interval: string;
  timeout: string;
  values: HelmValue[];
  installRemediation: boolean;
  upgradeRemediation: boolean;
  remediationRetries: string;
}

interface KustomizationResource {
  type: 'Kustomization';
  name: string;
  namespace: string;
  sourceRefName: string;
  path: string;
  prune: boolean;
  interval: string;
  timeout: string;
  targetNamespace: string;
}

interface ImagePolicyResource {
  type: 'ImagePolicy';
  name: string;
  namespace: string;
  imageRepoName: string;
  policyType: 'semver' | 'alphabetical' | 'numerical';
  semverRange: string;
  order: 'asc' | 'desc';
}

interface ImageUpdateAutomationResource {
  type: 'ImageUpdateAutomation';
  name: string;
  namespace: string;
  sourceRefName: string;
  branch: string;
  interval: string;
  commitAuthorName: string;
  commitAuthorEmail: string;
  commitMessageTemplate: string;
}

type FluxResource =
  | GitRepositoryResource
  | HelmRepositoryResource
  | HelmReleaseResource
  | KustomizationResource
  | ImagePolicyResource
  | ImageUpdateAutomationResource;

function defaultResource(type: ResourceType, idx: number): FluxResource {
  const suffix = idx > 0 ? `-${idx}` : '';
  switch (type) {
    case 'GitRepository':
      return {
        type, name: `my-repo${suffix}`, namespace: 'flux-system',
        url: 'https://github.com/my-org/my-repo', branch: 'main',
        interval: '1m', secretName: '',
      };
    case 'HelmRepository':
      return {
        type, name: `bitnami${suffix}`, namespace: 'flux-system',
        url: 'https://charts.bitnami.com/bitnami', interval: '10m',
        repoType: 'default',
      };
    case 'HelmRelease':
      return {
        type, name: `my-app${suffix}`, namespace: 'default',
        chartName: 'nginx', chartVersion: '>=1.0.0',
        sourceRefName: 'bitnami', sourceRefKind: 'HelmRepository',
        interval: '5m', timeout: '5m',
        values: [{ key: 'replicaCount', value: '2' }],
        installRemediation: true, upgradeRemediation: true, remediationRetries: '3',
      };
    case 'Kustomization':
      return {
        type, name: `my-app${suffix}`, namespace: 'flux-system',
        sourceRefName: 'my-repo', path: './k8s/overlays/production',
        prune: true, interval: '5m', timeout: '2m', targetNamespace: 'default',
      };
    case 'ImagePolicy':
      return {
        type, name: `my-app${suffix}`, namespace: 'flux-system',
        imageRepoName: 'my-app', policyType: 'semver',
        semverRange: '>=1.0.0', order: 'asc',
      };
    case 'ImageUpdateAutomation':
      return {
        type, name: `my-app${suffix}`, namespace: 'flux-system',
        sourceRefName: 'my-repo', branch: 'main', interval: '1m',
        commitAuthorName: 'Flux Bot', commitAuthorEmail: 'fluxbot@example.com',
        commitMessageTemplate: 'Update image to {{range .Updated.Images}}{{println .}}{{end}}',
      };
  }
}

function generateResourceYAML(res: FluxResource): string {
  const lines: string[] = [];

  if (res.type === 'GitRepository') {
    lines.push('apiVersion: source.toolkit.fluxcd.io/v1');
    lines.push('kind: GitRepository');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-repo'}`);
    lines.push(`  namespace: ${res.namespace || 'flux-system'}`);
    lines.push('spec:');
    lines.push(`  interval: ${res.interval || '1m'}`);
    lines.push(`  url: ${res.url || 'https://github.com/my-org/my-repo'}`);
    lines.push('  ref:');
    lines.push(`    branch: ${res.branch || 'main'}`);
    if (res.secretName) {
      lines.push('  secretRef:');
      lines.push(`    name: ${res.secretName}`);
    }
  }

  if (res.type === 'HelmRepository') {
    lines.push('apiVersion: source.toolkit.fluxcd.io/v1');
    lines.push('kind: HelmRepository');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-helmrepo'}`);
    lines.push(`  namespace: ${res.namespace || 'flux-system'}`);
    lines.push('spec:');
    lines.push(`  interval: ${res.interval || '10m'}`);
    lines.push(`  url: ${res.url || 'https://charts.example.com'}`);
    if (res.repoType === 'oci') {
      lines.push('  type: oci');
    }
  }

  if (res.type === 'HelmRelease') {
    lines.push('apiVersion: helm.toolkit.fluxcd.io/v2');
    lines.push('kind: HelmRelease');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-app'}`);
    lines.push(`  namespace: ${res.namespace || 'default'}`);
    lines.push('spec:');
    lines.push(`  interval: ${res.interval || '5m'}`);
    lines.push(`  timeout: ${res.timeout || '5m'}`);
    lines.push('  chart:');
    lines.push('    spec:');
    lines.push(`      chart: ${res.chartName || 'my-chart'}`);
    if (res.chartVersion) {
      lines.push(`      version: "${res.chartVersion}"`);
    }
    lines.push('      sourceRef:');
    lines.push(`        kind: ${res.sourceRefKind}`);
    lines.push(`        name: ${res.sourceRefName || 'my-helmrepo'}`);
    lines.push('        namespace: flux-system');
    if (res.installRemediation) {
      lines.push('  install:');
      lines.push('    remediation:');
      lines.push(`      retries: ${res.remediationRetries || '3'}`);
    }
    if (res.upgradeRemediation) {
      lines.push('  upgrade:');
      lines.push('    remediation:');
      lines.push(`      retries: ${res.remediationRetries || '3'}`);
      lines.push('      remediateLastFailure: true');
    }
    const validValues = res.values.filter(v => v.key);
    if (validValues.length > 0) {
      lines.push('  values:');
      validValues.forEach(v => {
        lines.push(`    ${v.key}: ${v.value}`);
      });
    }
  }

  if (res.type === 'Kustomization') {
    lines.push('apiVersion: kustomize.toolkit.fluxcd.io/v1');
    lines.push('kind: Kustomization');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-app'}`);
    lines.push(`  namespace: ${res.namespace || 'flux-system'}`);
    lines.push('spec:');
    lines.push(`  interval: ${res.interval || '5m'}`);
    lines.push(`  timeout: ${res.timeout || '2m'}`);
    lines.push(`  prune: ${res.prune}`);
    lines.push(`  path: "${res.path || './k8s'}"`);
    lines.push('  sourceRef:');
    lines.push('    kind: GitRepository');
    lines.push(`    name: ${res.sourceRefName || 'my-repo'}`);
    if (res.targetNamespace) {
      lines.push(`  targetNamespace: ${res.targetNamespace}`);
    }
  }

  if (res.type === 'ImagePolicy') {
    lines.push('apiVersion: image.toolkit.fluxcd.io/v1beta2');
    lines.push('kind: ImagePolicy');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-app'}`);
    lines.push(`  namespace: ${res.namespace || 'flux-system'}`);
    lines.push('spec:');
    lines.push('  imageRepositoryRef:');
    lines.push(`    name: ${res.imageRepoName || 'my-app'}`);
    lines.push('  policy:');
    if (res.policyType === 'semver') {
      lines.push('    semver:');
      lines.push(`      range: "${res.semverRange || '>=1.0.0'}"`);
    } else if (res.policyType === 'alphabetical') {
      lines.push('    alphabetical:');
      lines.push(`      order: ${res.order}`);
    } else {
      lines.push('    numerical:');
      lines.push(`      order: ${res.order}`);
    }
  }

  if (res.type === 'ImageUpdateAutomation') {
    lines.push('apiVersion: image.toolkit.fluxcd.io/v1beta2');
    lines.push('kind: ImageUpdateAutomation');
    lines.push('metadata:');
    lines.push(`  name: ${res.name || 'my-app'}`);
    lines.push(`  namespace: ${res.namespace || 'flux-system'}`);
    lines.push('spec:');
    lines.push(`  interval: ${res.interval || '1m'}`);
    lines.push('  sourceRef:');
    lines.push('    kind: GitRepository');
    lines.push(`    name: ${res.sourceRefName || 'my-repo'}`);
    lines.push('  git:');
    lines.push('    checkout:');
    lines.push('      ref:');
    lines.push(`        branch: ${res.branch || 'main'}`);
    lines.push('    commit:');
    lines.push('      author:');
    lines.push(`        name: ${res.commitAuthorName || 'Flux Bot'}`);
    lines.push(`        email: ${res.commitAuthorEmail || 'fluxbot@example.com'}`);
    if (res.commitMessageTemplate) {
      lines.push(`      messageTemplate: |-`);
      lines.push(`        ${res.commitMessageTemplate}`);
    }
    lines.push('    push:');
    lines.push(`      branch: ${res.branch || 'main'}`);
  }

  return lines.join('\n');
}

let counter = 0;
function newId() { return `res-${++counter}`; }

interface ResourceEntry {
  id: string;
  resource: FluxResource;
}

// Sub-forms for each resource type
function GitRepositoryForm({ res, onChange }: { res: GitRepositoryResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="my-repo"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="flux-system"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Repository URL</label>
        <input class={inputCls} value={res.url} placeholder="https://github.com/my-org/my-repo"
          onInput={e => onChange({ ...res, url: (e.target as HTMLInputElement).value })} /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Branch</label>
          <input class={inputCls} value={res.branch} placeholder="main"
            onInput={e => onChange({ ...res, branch: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Interval</label>
          <input class={inputCls} value={res.interval} placeholder="1m"
            onInput={e => onChange({ ...res, interval: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Secret Name (for private repos, leave empty if public)</label>
        <input class={inputCls} value={res.secretName} placeholder="my-repo-credentials"
          onInput={e => onChange({ ...res, secretName: (e.target as HTMLInputElement).value })} /></div>
    </div>
  );
}

function HelmRepositoryForm({ res, onChange }: { res: HelmRepositoryResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="bitnami"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="flux-system"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Helm Repository URL</label>
        <input class={inputCls} value={res.url} placeholder="https://charts.bitnami.com/bitnami"
          onInput={e => onChange({ ...res, url: (e.target as HTMLInputElement).value })} /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Interval</label>
          <input class={inputCls} value={res.interval} placeholder="10m"
            onInput={e => onChange({ ...res, interval: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Type</label>
          <select class={inputCls} value={res.repoType}
            onChange={e => onChange({ ...res, repoType: (e.target as HTMLSelectElement).value as 'default' | 'oci' })}>
            <option value="default">default (HTTPS)</option>
            <option value="oci">oci (OCI registry)</option>
          </select></div>
      </div>
    </div>
  );
}

function HelmReleaseForm({ res, onChange }: { res: HelmReleaseResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  const addValue = () => onChange({ ...res, values: [...res.values, { key: '', value: '' }] });
  const removeValue = (i: number) => onChange({ ...res, values: res.values.filter((_, idx) => idx !== i) });
  const updateValue = (i: number, field: 'key' | 'value', val: string) => {
    const next = [...res.values];
    next[i] = { ...next[i], [field]: val };
    onChange({ ...res, values: next });
  };
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="my-app"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="default"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Chart Name</label>
          <input class={inputCls} value={res.chartName} placeholder="nginx"
            onInput={e => onChange({ ...res, chartName: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Chart Version / Range</label>
          <input class={inputCls} value={res.chartVersion} placeholder=">=1.0.0"
            onInput={e => onChange({ ...res, chartVersion: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>SourceRef Name</label>
          <input class={inputCls} value={res.sourceRefName} placeholder="bitnami"
            onInput={e => onChange({ ...res, sourceRefName: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>SourceRef Kind</label>
          <select class={inputCls} value={res.sourceRefKind}
            onChange={e => onChange({ ...res, sourceRefKind: (e.target as HTMLSelectElement).value as 'HelmRepository' | 'GitRepository' })}>
            <option value="HelmRepository">HelmRepository</option>
            <option value="GitRepository">GitRepository</option>
          </select></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Interval</label>
          <input class={inputCls} value={res.interval} placeholder="5m"
            onInput={e => onChange({ ...res, interval: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Timeout</label>
          <input class={inputCls} value={res.timeout} placeholder="5m"
            onInput={e => onChange({ ...res, timeout: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Remediation Retries</label>
          <input class={inputCls} value={res.remediationRetries} placeholder="3"
            onInput={e => onChange({ ...res, remediationRetries: (e.target as HTMLInputElement).value })} /></div>
        <div class="flex flex-col gap-1 pt-4">
          <label class="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
            <input type="checkbox" checked={res.installRemediation} class="accent-accent"
              onChange={() => onChange({ ...res, installRemediation: !res.installRemediation })} />
            install remediation
          </label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
            <input type="checkbox" checked={res.upgradeRemediation} class="accent-accent"
              onChange={() => onChange({ ...res, upgradeRemediation: !res.upgradeRemediation })} />
            upgrade remediation
          </label>
        </div>
      </div>
      <div>
        <div class="flex items-center justify-between mb-1">
          <label class={labelCls}>Values (key: value)</label>
          <button onClick={addValue} class="text-xs text-accent hover:underline">+ Add</button>
        </div>
        {res.values.map((v, i) => (
          <div key={i} class="flex gap-1 mb-1 items-center">
            <input value={v.key} onInput={e => updateValue(i, 'key', (e.target as HTMLInputElement).value)}
              class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent" placeholder="key" />
            <span class="text-text-muted text-xs">:</span>
            <input value={v.value} onInput={e => updateValue(i, 'value', (e.target as HTMLInputElement).value)}
              class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent" placeholder="value" />
            <button onClick={() => removeValue(i)} class="text-red-400 hover:text-red-300 text-xs px-1">✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function KustomizationForm({ res, onChange }: { res: KustomizationResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="my-app"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="flux-system"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Source GitRepository Name</label>
        <input class={inputCls} value={res.sourceRefName} placeholder="my-repo"
          onInput={e => onChange({ ...res, sourceRefName: (e.target as HTMLInputElement).value })} /></div>
      <div><label class={labelCls}>Path (relative to repo root)</label>
        <input class={inputCls} value={res.path} placeholder="./k8s/overlays/production"
          onInput={e => onChange({ ...res, path: (e.target as HTMLInputElement).value })} /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Interval</label>
          <input class={inputCls} value={res.interval} placeholder="5m"
            onInput={e => onChange({ ...res, interval: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Timeout</label>
          <input class={inputCls} value={res.timeout} placeholder="2m"
            onInput={e => onChange({ ...res, timeout: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Target Namespace (optional override)</label>
        <input class={inputCls} value={res.targetNamespace} placeholder="default"
          onInput={e => onChange({ ...res, targetNamespace: (e.target as HTMLInputElement).value })} /></div>
      <label class="flex items-center gap-2 cursor-pointer text-sm text-text-muted">
        <input type="checkbox" checked={res.prune} class="accent-accent"
          onChange={() => onChange({ ...res, prune: !res.prune })} />
        prune (delete removed resources)
      </label>
    </div>
  );
}

function ImagePolicyForm({ res, onChange }: { res: ImagePolicyResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="my-app"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="flux-system"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>ImageRepository Ref Name</label>
        <input class={inputCls} value={res.imageRepoName} placeholder="my-app"
          onInput={e => onChange({ ...res, imageRepoName: (e.target as HTMLInputElement).value })} /></div>
      <div><label class={labelCls}>Policy Type</label>
        <select class={inputCls} value={res.policyType}
          onChange={e => onChange({ ...res, policyType: (e.target as HTMLSelectElement).value as 'semver' | 'alphabetical' | 'numerical' })}>
          <option value="semver">semver</option>
          <option value="alphabetical">alphabetical</option>
          <option value="numerical">numerical</option>
        </select></div>
      {res.policyType === 'semver' ? (
        <div><label class={labelCls}>SemVer Range</label>
          <input class={inputCls} value={res.semverRange} placeholder=">=1.0.0"
            onInput={e => onChange({ ...res, semverRange: (e.target as HTMLInputElement).value })} /></div>
      ) : (
        <div><label class={labelCls}>Order</label>
          <select class={inputCls} value={res.order}
            onChange={e => onChange({ ...res, order: (e.target as HTMLSelectElement).value as 'asc' | 'desc' })}>
            <option value="asc">asc</option>
            <option value="desc">desc</option>
          </select></div>
      )}
    </div>
  );
}

function ImageUpdateAutomationForm({ res, onChange }: { res: ImageUpdateAutomationResource; onChange: (r: FluxResource) => void }) {
  const inputCls = 'w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent';
  const labelCls = 'block text-xs text-text-muted mb-0.5';
  return (
    <div class="space-y-2">
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Name</label>
          <input class={inputCls} value={res.name} placeholder="my-app"
            onInput={e => onChange({ ...res, name: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Namespace</label>
          <input class={inputCls} value={res.namespace} placeholder="flux-system"
            onInput={e => onChange({ ...res, namespace: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Source GitRepository Name</label>
          <input class={inputCls} value={res.sourceRefName} placeholder="my-repo"
            onInput={e => onChange({ ...res, sourceRefName: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Branch</label>
          <input class={inputCls} value={res.branch} placeholder="main"
            onInput={e => onChange({ ...res, branch: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Interval</label>
        <input class={inputCls} value={res.interval} placeholder="1m"
          onInput={e => onChange({ ...res, interval: (e.target as HTMLInputElement).value })} /></div>
      <div class="grid grid-cols-2 gap-2">
        <div><label class={labelCls}>Commit Author Name</label>
          <input class={inputCls} value={res.commitAuthorName} placeholder="Flux Bot"
            onInput={e => onChange({ ...res, commitAuthorName: (e.target as HTMLInputElement).value })} /></div>
        <div><label class={labelCls}>Commit Author Email</label>
          <input class={inputCls} value={res.commitAuthorEmail} placeholder="fluxbot@example.com"
            onInput={e => onChange({ ...res, commitAuthorEmail: (e.target as HTMLInputElement).value })} /></div>
      </div>
      <div><label class={labelCls}>Commit Message Template</label>
        <input class={inputCls} value={res.commitMessageTemplate} placeholder="Update image to ..."
          onInput={e => onChange({ ...res, commitMessageTemplate: (e.target as HTMLInputElement).value })} /></div>
    </div>
  );
}

function ResourceForm({ entry, onChange }: { entry: ResourceEntry; onChange: (r: FluxResource) => void }) {
  const res = entry.resource;
  switch (res.type) {
    case 'GitRepository': return <GitRepositoryForm res={res} onChange={onChange} />;
    case 'HelmRepository': return <HelmRepositoryForm res={res} onChange={onChange} />;
    case 'HelmRelease': return <HelmReleaseForm res={res} onChange={onChange} />;
    case 'Kustomization': return <KustomizationForm res={res} onChange={onChange} />;
    case 'ImagePolicy': return <ImagePolicyForm res={res} onChange={onChange} />;
    case 'ImageUpdateAutomation': return <ImageUpdateAutomationForm res={res} onChange={onChange} />;
  }
}

export default function FluxGitopsConfigBuilder() {
  const [entries, setEntries] = useState<ResourceEntry[]>([
    { id: newId(), resource: defaultResource('GitRepository', 0) },
    { id: newId(), resource: defaultResource('HelmRelease', 0) },
  ]);
  const [copied, setCopied] = useState(false);

  function addResource(type: ResourceType) {
    setEntries(prev => [...prev, { id: newId(), resource: defaultResource(type, prev.length) }]);
  }

  function removeEntry(id: string) {
    setEntries(prev => prev.filter(e => e.id !== id));
  }

  function updateEntry(id: string, res: FluxResource) {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, resource: res } : e));
  }

  function changeType(id: string, type: ResourceType) {
    setEntries(prev => prev.map((e, i) => e.id === id ? { ...e, resource: defaultResource(type, i) } : e));
  }

  const yamlOutput = entries.map(e => generateResourceYAML(e.resource)).join('\n---\n');

  function handleCopy() {
    navigator.clipboard.writeText(yamlOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* LEFT: Config form */}
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-sm font-semibold text-text">Resources ({entries.length})</h3>
          <div class="flex items-center gap-2">
            <select
              class="font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text-muted"
              onChange={e => {
                const type = (e.target as HTMLSelectElement).value as ResourceType;
                if (type) { addResource(type); (e.target as HTMLSelectElement).value = ''; }
              }}
            >
              <option value="">+ Add resource...</option>
              {Object.keys(RESOURCE_LABELS).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {entries.map((entry, i) => (
          <div key={entry.id} class="border border-border rounded-lg p-3 bg-surface space-y-3">
            <div class="flex items-center gap-2">
              <span class="text-xs text-text-muted font-mono w-4">{i + 1}.</span>
              <select
                class="flex-1 font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent text-text"
                value={entry.resource.type}
                onChange={e => changeType(entry.id, (e.target as HTMLSelectElement).value as ResourceType)}
              >
                {Object.keys(RESOURCE_LABELS).map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <button onClick={() => removeEntry(entry.id)} class="text-red-400 hover:text-red-300 text-xs px-2 py-1">✕</button>
            </div>
            <ResourceForm entry={entry} onChange={r => updateEntry(entry.id, r)} />
          </div>
        ))}

        {entries.length === 0 && (
          <div class="border border-dashed border-border rounded-lg p-6 text-center text-text-muted text-sm">
            No resources yet. Use "Add resource..." to build your GitOps setup.
          </div>
        )}
      </div>

      {/* RIGHT: Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-xs text-text-muted">
            {entries.length} resource{entries.length !== 1 ? 's' : ''} — multi-document YAML
          </span>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>

        <pre class="font-mono text-sm bg-surface border border-border rounded-lg p-4 h-[480px] overflow-auto text-text-muted whitespace-pre">{yamlOutput || '# Add resources on the left to generate YAML'}</pre>

        <p class="text-xs text-text-muted mt-2">
          Apply with: <code class="bg-surface px-1 rounded">kubectl apply -f flux-config.yaml</code>
          {' '}or <code class="bg-surface px-1 rounded">flux reconcile source git my-repo</code>
        </p>
      </div>
    </div>
  );
}
