import { useState } from 'preact/hooks';

type ProjectType = 'nodejs' | 'python' | 'go' | 'rust' | 'docker';

const PROJECT_LABELS: Record<ProjectType, string> = {
  nodejs: 'Node.js',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
  docker: 'Docker Only',
};

interface TriggerConfig {
  pushMain: boolean;
  pullRequest: boolean;
  scheduled: boolean;
  cronExpression: string;
}

interface StepConfig {
  lint: boolean;
  test: boolean;
  build: boolean;
  dockerBuildPush: boolean;
  deployVercel: boolean;
  deployNetlify: boolean;
  deployFly: boolean;
}

interface NodeSettings {
  nodeVersion: '18' | '20' | '22';
  packageManager: 'npm' | 'pnpm' | 'yarn';
}

interface PythonSettings {
  pythonVersion: '3.11' | '3.12';
  testRunner: 'pytest' | 'unittest';
}

interface DockerSettings {
  registry: 'ghcr' | 'dockerhub';
  imageName: string;
}

function getLockFile(pm: string): string {
  if (pm === 'pnpm') return 'pnpm-lock.yaml';
  if (pm === 'yarn') return 'yarn.lock';
  return 'package-lock.json';
}

function getInstallCmd(pm: string): string {
  if (pm === 'pnpm') return 'pnpm install --frozen-lockfile';
  if (pm === 'yarn') return 'yarn install --frozen-lockfile';
  return 'npm ci';
}

function getBuildCmd(pm: string): string {
  if (pm === 'pnpm') return 'pnpm run build';
  if (pm === 'yarn') return 'yarn build';
  return 'npm run build';
}

function getLintCmd(pm: string): string {
  if (pm === 'pnpm') return 'pnpm run lint';
  if (pm === 'yarn') return 'yarn lint';
  return 'npm run lint';
}

function getTestCmd(pm: string): string {
  if (pm === 'pnpm') return 'pnpm test';
  if (pm === 'yarn') return 'yarn test';
  return 'npm test';
}

function generateWorkflow(
  projectType: ProjectType,
  triggers: TriggerConfig,
  steps: StepConfig,
  nodeSettings: NodeSettings,
  pythonSettings: PythonSettings,
  dockerSettings: DockerSettings,
): string {
  const lines: string[] = [];
  lines.push('name: CI/CD');
  lines.push('');
  lines.push('on:');

  const onLines: string[] = [];
  if (triggers.pushMain) {
    onLines.push('  push:');
    onLines.push('    branches: [main]');
  }
  if (triggers.pullRequest) {
    onLines.push('  pull_request:');
    onLines.push('    branches: [main]');
  }
  if (triggers.scheduled) {
    onLines.push('  schedule:');
    onLines.push(`    - cron: '${triggers.cronExpression || '0 2 * * *'}'`);
  }
  if (onLines.length === 0) {
    onLines.push('  push:');
    onLines.push('    branches: [main]');
  }
  lines.push(...onLines);
  lines.push('');

  // Registry login env if needed
  const needsDocker = steps.dockerBuildPush || projectType === 'docker';
  if (needsDocker) {
    lines.push('env:');
    if (dockerSettings.registry === 'ghcr') {
      lines.push('  REGISTRY: ghcr.io');
      lines.push('  IMAGE_NAME: ${{ github.repository }}');
    } else {
      lines.push(`  IMAGE_NAME: ${dockerSettings.imageName || '${{ github.repository_owner }}/my-app'}`);
    }
    lines.push('');
  }

  lines.push('jobs:');

  // Build + test job
  if (projectType !== 'docker') {
    lines.push('  build:');
    lines.push('    runs-on: ubuntu-latest');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');

    if (projectType === 'nodejs') {
      if (nodeSettings.packageManager === 'pnpm') {
        lines.push('      - name: Setup pnpm');
        lines.push('        uses: pnpm/action-setup@v4');
        lines.push('        with:');
        lines.push('          version: latest');
        lines.push('');
      }
      lines.push('      - name: Setup Node.js');
      lines.push('        uses: actions/setup-node@v4');
      lines.push('        with:');
      lines.push(`          node-version: '${nodeSettings.nodeVersion}'`);
      lines.push(`          cache: '${nodeSettings.packageManager}'`);
      lines.push('');
      lines.push('      - name: Install dependencies');
      lines.push(`        run: ${getInstallCmd(nodeSettings.packageManager)}`);
      lines.push('');
      if (steps.lint) {
        lines.push('      - name: Lint');
        lines.push(`        run: ${getLintCmd(nodeSettings.packageManager)}`);
        lines.push('');
      }
      if (steps.test) {
        lines.push('      - name: Test');
        lines.push(`        run: ${getTestCmd(nodeSettings.packageManager)}`);
        lines.push('');
      }
      if (steps.build) {
        lines.push('      - name: Build');
        lines.push(`        run: ${getBuildCmd(nodeSettings.packageManager)}`);
        lines.push('');
      }
    }

    if (projectType === 'python') {
      lines.push('      - name: Setup Python');
      lines.push('        uses: actions/setup-python@v5');
      lines.push('        with:');
      lines.push(`          python-version: '${pythonSettings.pythonVersion}'`);
      lines.push('');
      lines.push('      - name: Cache pip');
      lines.push('        uses: actions/cache@v4');
      lines.push('        with:');
      lines.push('          path: ~/.cache/pip');
      lines.push('          key: ${{ runner.os }}-pip-${{ hashFiles(\'**/requirements*.txt\') }}');
      lines.push('          restore-keys: |');
      lines.push('            ${{ runner.os }}-pip-');
      lines.push('');
      lines.push('      - name: Install dependencies');
      lines.push('        run: pip install -r requirements.txt');
      lines.push('');
      if (steps.lint) {
        lines.push('      - name: Lint');
        lines.push('        run: |');
        lines.push('          pip install ruff');
        lines.push('          ruff check .');
        lines.push('');
      }
      if (steps.test) {
        lines.push('      - name: Test');
        if (pythonSettings.testRunner === 'pytest') {
          lines.push('        run: pytest --tb=short');
        } else {
          lines.push('        run: python -m unittest discover');
        }
        lines.push('');
      }
    }

    if (projectType === 'go') {
      lines.push('      - name: Setup Go');
      lines.push('        uses: actions/setup-go@v5');
      lines.push('        with:');
      lines.push("          go-version-file: 'go.mod'");
      lines.push('          cache: true');
      lines.push('');
      lines.push('      - name: Download dependencies');
      lines.push('        run: go mod download');
      lines.push('');
      if (steps.lint) {
        lines.push('      - name: Lint');
        lines.push('        uses: golangci/golangci-lint-action@v6');
        lines.push('        with:');
        lines.push('          version: latest');
        lines.push('');
      }
      if (steps.test) {
        lines.push('      - name: Test');
        lines.push('        run: go test ./... -v -race -coverprofile=coverage.out');
        lines.push('');
      }
      if (steps.build) {
        lines.push('      - name: Build');
        lines.push('        run: go build -ldflags="-w -s" -o app ./...');
        lines.push('');
      }
    }

    if (projectType === 'rust') {
      lines.push('      - name: Cache Rust');
      lines.push('        uses: Swatinem/rust-cache@v2');
      lines.push('');
      if (steps.lint) {
        lines.push('      - name: Lint (clippy)');
        lines.push('        run: cargo clippy -- -D warnings');
        lines.push('');
        lines.push('      - name: Format check');
        lines.push('        run: cargo fmt --check');
        lines.push('');
      }
      if (steps.test) {
        lines.push('      - name: Test');
        lines.push('        run: cargo test');
        lines.push('');
      }
      if (steps.build) {
        lines.push('      - name: Build');
        lines.push('        run: cargo build --release');
        lines.push('');
      }
    }
  }

  // Docker job
  if (needsDocker) {
    const jobName = projectType === 'docker' ? '  docker:' : '  docker:';
    lines.push(jobName);
    lines.push('    runs-on: ubuntu-latest');
    if (projectType !== 'docker' && (steps.test || steps.build)) {
      lines.push('    needs: build');
    }
    lines.push('    permissions:');
    lines.push('      contents: read');
    lines.push('      packages: write');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');
    lines.push('      - name: Set up Docker Buildx');
    lines.push('        uses: docker/setup-buildx-action@v3');
    lines.push('');
    if (dockerSettings.registry === 'ghcr') {
      lines.push('      - name: Log in to GitHub Container Registry');
      lines.push('        uses: docker/login-action@v3');
      lines.push('        with:');
      lines.push('          registry: ${{ env.REGISTRY }}');
      lines.push('          username: ${{ github.actor }}');
      lines.push('          password: ${{ secrets.GITHUB_TOKEN }}');
    } else {
      lines.push('      - name: Log in to Docker Hub');
      lines.push('        uses: docker/login-action@v3');
      lines.push('        with:');
      lines.push('          username: ${{ secrets.DOCKERHUB_USERNAME }}');
      lines.push('          password: ${{ secrets.DOCKERHUB_TOKEN }}');
    }
    lines.push('');
    lines.push('      - name: Extract metadata');
    lines.push('        id: meta');
    lines.push('        uses: docker/metadata-action@v5');
    lines.push('        with:');
    if (dockerSettings.registry === 'ghcr') {
      lines.push('          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}');
    } else {
      lines.push('          images: ${{ env.IMAGE_NAME }}');
    }
    lines.push('');
    lines.push('      - name: Build and push');
    lines.push('        uses: docker/build-push-action@v6');
    lines.push('        with:');
    lines.push('          context: .');
    lines.push('          push: ${{ github.ref == \'refs/heads/main\' }}');
    lines.push('          tags: ${{ steps.meta.outputs.tags }}');
    lines.push('          labels: ${{ steps.meta.outputs.labels }}');
    lines.push('          cache-from: type=gha');
    lines.push('          cache-to: type=gha,mode=max');
    lines.push('');
  }

  // Deploy jobs
  if (steps.deployVercel) {
    lines.push('  deploy-vercel:');
    lines.push('    runs-on: ubuntu-latest');
    if (projectType !== 'docker') lines.push('    needs: build');
    lines.push('    if: github.ref == \'refs/heads/main\'');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');
    lines.push('      - name: Deploy to Vercel');
    lines.push('        uses: amondnet/vercel-action@v25');
    lines.push('        with:');
    lines.push('          vercel-token: ${{ secrets.VERCEL_TOKEN }}');
    lines.push('          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}');
    lines.push('          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}');
    lines.push('          vercel-args: --prod');
    lines.push('');
  }

  if (steps.deployNetlify) {
    lines.push('  deploy-netlify:');
    lines.push('    runs-on: ubuntu-latest');
    if (projectType !== 'docker') lines.push('    needs: build');
    lines.push('    if: github.ref == \'refs/heads/main\'');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');
    lines.push('      - name: Deploy to Netlify');
    lines.push('        uses: netlify/actions/cli@master');
    lines.push('        with:');
    lines.push("          args: deploy --dir=dist --prod");
    lines.push('        env:');
    lines.push('          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}');
    lines.push('          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}');
    lines.push('');
  }

  if (steps.deployFly) {
    lines.push('  deploy-fly:');
    lines.push('    runs-on: ubuntu-latest');
    if (needsDocker) {
      lines.push('    needs: docker');
    } else if (projectType !== 'docker') {
      lines.push('    needs: build');
    }
    lines.push('    if: github.ref == \'refs/heads/main\'');
    lines.push('');
    lines.push('    steps:');
    lines.push('      - name: Checkout');
    lines.push('        uses: actions/checkout@v4');
    lines.push('');
    lines.push('      - name: Setup flyctl');
    lines.push('        uses: superfly/flyctl-actions/setup-flyctl@master');
    lines.push('');
    lines.push('      - name: Deploy to Fly.io');
    lines.push('        run: flyctl deploy --remote-only');
    lines.push('        env:');
    lines.push('          FLY_API_TOKEN: ${{ secrets.FLY_API_TOKEN }}');
    lines.push('');
  }

  return lines.join('\n');
}

export default function GithubActionsWorkflowGenerator() {
  const [projectType, setProjectType] = useState<ProjectType>('nodejs');
  const [triggers, setTriggers] = useState<TriggerConfig>({
    pushMain: true,
    pullRequest: true,
    scheduled: false,
    cronExpression: '0 2 * * *',
  });
  const [steps, setSteps] = useState<StepConfig>({
    lint: true,
    test: true,
    build: true,
    dockerBuildPush: false,
    deployVercel: false,
    deployNetlify: false,
    deployFly: false,
  });
  const [nodeSettings, setNodeSettings] = useState<NodeSettings>({ nodeVersion: '22', packageManager: 'npm' });
  const [pythonSettings, setPythonSettings] = useState<PythonSettings>({ pythonVersion: '3.12', testRunner: 'pytest' });
  const [dockerSettings, setDockerSettings] = useState<DockerSettings>({ registry: 'ghcr', imageName: '' });
  const [copied, setCopied] = useState(false);

  const yaml = generateWorkflow(projectType, triggers, steps, nodeSettings, pythonSettings, dockerSettings);

  function copy() {
    navigator.clipboard.writeText(yaml).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function setStep(key: keyof StepConfig, val: boolean) {
    setSteps(s => ({ ...s, [key]: val }));
  }

  return (
    <div class="space-y-6">
      {/* Project Type */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <label class="block text-sm font-semibold mb-3">Project Type</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(PROJECT_LABELS) as ProjectType[]).map(pt => (
            <button
              key={pt}
              onClick={() => setProjectType(pt)}
              class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${projectType === pt ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:border-accent'}`}
            >
              {PROJECT_LABELS[pt]}
            </button>
          ))}
        </div>
      </div>

      {/* Triggers */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Triggers</h3>
        <div class="flex flex-wrap gap-4">
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={triggers.pushMain} onChange={e => setTriggers(t => ({ ...t, pushMain: (e.target as HTMLInputElement).checked }))} class="accent-accent" />
            <span class="text-sm">Push to main</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={triggers.pullRequest} onChange={e => setTriggers(t => ({ ...t, pullRequest: (e.target as HTMLInputElement).checked }))} class="accent-accent" />
            <span class="text-sm">Pull Requests</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={triggers.scheduled} onChange={e => setTriggers(t => ({ ...t, scheduled: (e.target as HTMLInputElement).checked }))} class="accent-accent" />
            <span class="text-sm">Scheduled (cron)</span>
          </label>
          {triggers.scheduled && (
            <input value={triggers.cronExpression} onInput={e => setTriggers(t => ({ ...t, cronExpression: (e.target as HTMLInputElement).value }))}
              placeholder="0 2 * * *"
              class="px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
          )}
        </div>
      </div>

      {/* Language Settings */}
      {projectType === 'nodejs' && (
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3">Node.js Settings</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Node Version</label>
              <select value={nodeSettings.nodeVersion} onChange={e => setNodeSettings(s => ({ ...s, nodeVersion: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="22">Node 22 (LTS)</option>
                <option value="20">Node 20 (LTS)</option>
                <option value="18">Node 18 (LTS)</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Package Manager</label>
              <select value={nodeSettings.packageManager} onChange={e => setNodeSettings(s => ({ ...s, packageManager: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="npm">npm</option>
                <option value="pnpm">pnpm</option>
                <option value="yarn">yarn</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {projectType === 'python' && (
        <div class="p-4 rounded-xl border border-border bg-surface">
          <h3 class="text-sm font-semibold mb-3">Python Settings</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-medium mb-1">Python Version</label>
              <select value={pythonSettings.pythonVersion} onChange={e => setPythonSettings(s => ({ ...s, pythonVersion: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="3.12">3.12</option>
                <option value="3.11">3.11</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-medium mb-1">Test Runner</label>
              <select value={pythonSettings.testRunner} onChange={e => setPythonSettings(s => ({ ...s, testRunner: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="pytest">pytest</option>
                <option value="unittest">unittest</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Steps */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Steps to Include</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
          {projectType !== 'docker' && (
            <>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={steps.lint} onChange={e => setStep('lint', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                <span class="text-sm">Lint</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={steps.test} onChange={e => setStep('test', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                <span class="text-sm">Test</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={steps.build} onChange={e => setStep('build', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                <span class="text-sm">Build</span>
              </label>
            </>
          )}
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={steps.dockerBuildPush || projectType === 'docker'} disabled={projectType === 'docker'} onChange={e => setStep('dockerBuildPush', (e.target as HTMLInputElement).checked)} class="accent-accent" />
            <span class="text-sm">Docker Build &amp; Push</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={steps.deployVercel} onChange={e => setStep('deployVercel', (e.target as HTMLInputElement).checked)} class="accent-accent" />
            <span class="text-sm">Deploy to Vercel</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={steps.deployNetlify} onChange={e => setStep('deployNetlify', (e.target as HTMLInputElement).checked)} class="accent-accent" />
            <span class="text-sm">Deploy to Netlify</span>
          </label>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={steps.deployFly} onChange={e => setStep('deployFly', (e.target as HTMLInputElement).checked)} class="accent-accent" />
            <span class="text-sm">Deploy to Fly.io</span>
          </label>
        </div>

        {(steps.dockerBuildPush || projectType === 'docker') && (
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <label class="block text-xs font-medium mb-1">Docker Registry</label>
              <select value={dockerSettings.registry} onChange={e => setDockerSettings(s => ({ ...s, registry: (e.target as HTMLSelectElement).value as any }))}
                class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent">
                <option value="ghcr">GitHub Container Registry (ghcr.io)</option>
                <option value="dockerhub">Docker Hub</option>
              </select>
            </div>
            {dockerSettings.registry === 'dockerhub' && (
              <div>
                <label class="block text-xs font-medium mb-1">Image Name</label>
                <input value={dockerSettings.imageName} onInput={e => setDockerSettings(s => ({ ...s, imageName: (e.target as HTMLInputElement).value }))}
                  placeholder="username/my-app"
                  class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <div>
            <label class="text-sm font-medium">.github/workflows/ci.yml</label>
            <span class="ml-2 text-xs text-text-muted">Save as this path in your repo</span>
          </div>
          <button onClick={copy} class="text-sm px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
            {copied ? '✓ Copied!' : 'Copy YAML'}
          </button>
        </div>
        <pre class="p-4 rounded-xl bg-surface border border-border text-sm font-mono overflow-x-auto whitespace-pre text-text">{yaml}</pre>
      </div>

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Save to your repo</p>
        <code class="text-xs font-mono text-text-muted">mkdir -p .github/workflows && # paste content into .github/workflows/ci.yml</code>
      </div>
    </div>
  );
}
