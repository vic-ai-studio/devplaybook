import { useState } from 'preact/hooks';

type Trigger = 'push' | 'pull_request' | 'schedule' | 'workflow_dispatch';
type Language = 'node' | 'python' | 'go' | 'rust';
type Job = 'test' | 'lint' | 'build' | 'docker' | 'deploy_pages';

const LANGUAGE_LABELS: Record<Language, string> = {
  node: 'Node.js / TypeScript',
  python: 'Python',
  go: 'Go',
  rust: 'Rust',
};

const JOB_LABELS: Record<Job, string> = {
  test: 'Run Tests',
  lint: 'Lint & Format',
  build: 'Build Artifact',
  docker: 'Build & Push Docker',
  deploy_pages: 'Deploy to GitHub Pages',
};

function generateNodeSetup(version: string) {
  return `      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '${version}'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci`;
}

function generatePythonSetup(version: string) {
  return `      - name: Setup Python
        uses: actions/setup-python@v5
        with:
          python-version: '${version}'
      - name: Install dependencies
        run: pip install -r requirements.txt`;
}

function generateGoSetup(version: string) {
  return `      - name: Setup Go
        uses: actions/setup-go@v5
        with:
          go-version: '${version}'
          cache: true`;
}

function generateRustSetup() {
  return `      - name: Setup Rust
        uses: dtolnay/rust-toolchain@stable
      - name: Cache Cargo
        uses: actions/cache@v4
        with:
          path: |
            ~/.cargo/bin/
            ~/.cargo/registry/index/
            ~/.cargo/registry/cache/
            ~/.cargo/git/db/
            target/
          key: \${{ runner.os }}-cargo-\${{ hashFiles('**/Cargo.lock') }}`;
}

function generateWorkflow(opts: {
  workflowName: string;
  triggers: Trigger[];
  language: Language;
  langVersion: string;
  jobs: Job[];
  branch: string;
  cronSchedule: string;
  dockerImage: string;
  dockerRegistry: 'ghcr' | 'dockerhub';
}): string {
  const { workflowName, triggers, language, langVersion, jobs, branch, cronSchedule, dockerImage, dockerRegistry } = opts;

  // Trigger section
  const triggerLines: string[] = [];
  if (triggers.includes('push')) {
    triggerLines.push(`  push:\n    branches: [ ${branch} ]`);
  }
  if (triggers.includes('pull_request')) {
    triggerLines.push(`  pull_request:\n    branches: [ ${branch} ]`);
  }
  if (triggers.includes('schedule')) {
    triggerLines.push(`  schedule:\n    - cron: '${cronSchedule}'`);
  }
  if (triggers.includes('workflow_dispatch')) {
    triggerLines.push(`  workflow_dispatch:`);
  }

  const setupStep = language === 'node'
    ? generateNodeSetup(langVersion)
    : language === 'python'
    ? generatePythonSetup(langVersion)
    : language === 'go'
    ? generateGoSetup(langVersion)
    : generateRustSetup();

  const checkoutStep = `      - name: Checkout code
        uses: actions/checkout@v4`;

  const jobBlocks: string[] = [];

  if (jobs.includes('test')) {
    const testCmd = language === 'node' ? 'npm test'
      : language === 'python' ? 'pytest'
      : language === 'go' ? 'go test ./...'
      : 'cargo test';
    jobBlocks.push(`  test:
    name: Run Tests
    runs-on: ubuntu-latest
    steps:
${checkoutStep}
${setupStep}
      - name: Run tests
        run: ${testCmd}`);
  }

  if (jobs.includes('lint')) {
    const lintCmd = language === 'node'
      ? 'npm run lint\n        run: npm run format:check'
      : language === 'python'
      ? 'pip install ruff && ruff check . && ruff format --check .'
      : language === 'go'
      ? 'go vet ./...'
      : 'cargo clippy -- -D warnings && cargo fmt -- --check';
    jobBlocks.push(`  lint:
    name: Lint & Format
    runs-on: ubuntu-latest
    steps:
${checkoutStep}
${setupStep}
      - name: Lint
        run: ${lintCmd}`);
  }

  if (jobs.includes('build')) {
    const buildCmd = language === 'node' ? 'npm run build'
      : language === 'python' ? 'python -m build'
      : language === 'go' ? 'go build -v ./...'
      : 'cargo build --release';
    jobBlocks.push(`  build:
    name: Build
    runs-on: ubuntu-latest
    steps:
${checkoutStep}
${setupStep}
      - name: Build
        run: ${buildCmd}
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: build-output
          path: dist/`);
  }

  if (jobs.includes('docker')) {
    const registry = dockerRegistry === 'ghcr' ? 'ghcr.io' : 'docker.io';
    const loginStep = dockerRegistry === 'ghcr'
      ? `      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: \${{ github.actor }}
          password: \${{ secrets.GITHUB_TOKEN }}`
      : `      - name: Login to Docker Hub
        uses: docker/login-action@v3
        with:
          username: \${{ secrets.DOCKERHUB_USERNAME }}
          password: \${{ secrets.DOCKERHUB_TOKEN }}`;

    jobBlocks.push(`  docker:
    name: Build & Push Docker
    runs-on: ubuntu-latest
    steps:
${checkoutStep}
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3
${loginStep}
      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: \${{ github.event_name != 'pull_request' }}
          tags: ${registry}/${dockerImage || 'your-org/your-image'}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max`);
  }

  if (jobs.includes('deploy_pages')) {
    jobBlocks.push(`  deploy:
    name: Deploy to GitHub Pages
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    steps:
${checkoutStep}
${setupStep}
      - name: Build
        run: ${language === 'node' ? 'npm run build' : 'python -m build'}
      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist/
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4`);
  }

  return `name: ${workflowName}

on:
${triggerLines.join('\n')}

jobs:
${jobBlocks.join('\n\n')}
`;
}

const NODE_VERSIONS = ['20', '18', '22'];
const PYTHON_VERSIONS = ['3.12', '3.11', '3.10'];
const GO_VERSIONS = ['1.22', '1.21'];
const RUST_VERSIONS = ['stable'];

export default function GithubActionsGenerator() {
  const [workflowName, setWorkflowName] = useState('CI');
  const [triggers, setTriggers] = useState<Trigger[]>(['push', 'pull_request']);
  const [language, setLanguage] = useState<Language>('node');
  const [langVersion, setLangVersion] = useState('20');
  const [selectedJobs, setSelectedJobs] = useState<Job[]>(['test', 'lint']);
  const [branch, setBranch] = useState('main');
  const [cronSchedule, setCronSchedule] = useState('0 0 * * 1');
  const [dockerImage, setDockerImage] = useState('');
  const [dockerRegistry, setDockerRegistry] = useState<'ghcr' | 'dockerhub'>('ghcr');
  const [copied, setCopied] = useState(false);

  const toggleTrigger = (t: Trigger) => {
    setTriggers(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const toggleJob = (j: Job) => {
    setSelectedJobs(prev => prev.includes(j) ? prev.filter(x => x !== j) : [...prev, j]);
  };

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
    if (lang === 'node') setLangVersion('20');
    else if (lang === 'python') setLangVersion('3.12');
    else if (lang === 'go') setLangVersion('1.22');
    else setLangVersion('stable');
  };

  const versionOptions = language === 'node' ? NODE_VERSIONS
    : language === 'python' ? PYTHON_VERSIONS
    : language === 'go' ? GO_VERSIONS
    : RUST_VERSIONS;

  const yaml = generateWorkflow({
    workflowName,
    triggers: triggers.length ? triggers : ['push'],
    language,
    langVersion,
    jobs: selectedJobs.length ? selectedJobs : ['test'],
    branch,
    cronSchedule,
    dockerImage,
    dockerRegistry,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Workflow name */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-1">Workflow Name</label>
        <input
          type="text"
          value={workflowName}
          onInput={(e) => setWorkflowName((e.target as HTMLInputElement).value)}
          class="w-full bg-surface border border-border rounded px-3 py-2 text-sm font-mono focus:outline-none focus:border-accent"
          placeholder="CI"
        />
      </div>

      {/* Triggers */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Triggers</label>
        <div class="flex flex-wrap gap-2">
          {(['push', 'pull_request', 'schedule', 'workflow_dispatch'] as Trigger[]).map(t => (
            <button
              key={t}
              onClick={() => toggleTrigger(t)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                triggers.includes(t)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
        {triggers.includes('push') || triggers.includes('pull_request') ? (
          <div class="mt-2">
            <label class="block text-xs text-text-muted mb-1">Branch</label>
            <input
              type="text"
              value={branch}
              onInput={(e) => setBranch((e.target as HTMLInputElement).value)}
              class="bg-surface border border-border rounded px-3 py-1 text-sm font-mono focus:outline-none focus:border-accent w-40"
              placeholder="main"
            />
          </div>
        ) : null}
        {triggers.includes('schedule') ? (
          <div class="mt-2">
            <label class="block text-xs text-text-muted mb-1">Cron schedule</label>
            <input
              type="text"
              value={cronSchedule}
              onInput={(e) => setCronSchedule((e.target as HTMLInputElement).value)}
              class="bg-surface border border-border rounded px-3 py-1 text-sm font-mono focus:outline-none focus:border-accent w-48"
              placeholder="0 0 * * 1"
            />
            <span class="text-xs text-text-muted ml-2">e.g. every Monday at midnight</span>
          </div>
        ) : null}
      </div>

      {/* Language */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Language / Runtime</label>
        <div class="flex flex-wrap gap-2 mb-2">
          {(Object.keys(LANGUAGE_LABELS) as Language[]).map(lang => (
            <button
              key={lang}
              onClick={() => handleLanguageChange(lang)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                language === lang
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
        {language !== 'rust' && (
          <div>
            <label class="block text-xs text-text-muted mb-1">Version</label>
            <select
              value={langVersion}
              onChange={(e) => setLangVersion((e.target as HTMLSelectElement).value)}
              class="bg-surface border border-border rounded px-3 py-1 text-sm focus:outline-none focus:border-accent"
            >
              {versionOptions.map(v => <option key={v} value={v}>{v}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Jobs */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Jobs</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(JOB_LABELS) as Job[]).map(j => (
            <button
              key={j}
              onClick={() => toggleJob(j)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                selectedJobs.includes(j)
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {JOB_LABELS[j]}
            </button>
          ))}
        </div>
        {selectedJobs.includes('docker') && (
          <div class="mt-3 space-y-2">
            <div>
              <label class="block text-xs text-text-muted mb-1">Registry</label>
              <div class="flex gap-2">
                {(['ghcr', 'dockerhub'] as const).map(r => (
                  <button
                    key={r}
                    onClick={() => setDockerRegistry(r)}
                    class={`px-3 py-1 rounded text-sm border transition-colors ${
                      dockerRegistry === r
                        ? 'bg-accent text-white border-accent'
                        : 'bg-surface border-border text-text-muted hover:border-accent'
                    }`}
                  >
                    {r === 'ghcr' ? 'GitHub Container Registry' : 'Docker Hub'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Image name (org/image)</label>
              <input
                type="text"
                value={dockerImage}
                onInput={(e) => setDockerImage((e.target as HTMLInputElement).value)}
                class="bg-surface border border-border rounded px-3 py-1 text-sm font-mono focus:outline-none focus:border-accent w-64"
                placeholder="your-org/your-image"
              />
            </div>
          </div>
        )}
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated Workflow YAML</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted max-h-96 overflow-y-auto">{yaml}</pre>
        <p class="text-xs text-text-muted mt-2">Save as <code class="bg-surface px-1 rounded">.github/workflows/ci.yml</code> in your repository root.</p>
      </div>
    </div>
  );
}
