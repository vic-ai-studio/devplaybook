import { useState } from 'preact/hooks';

interface Target {
  id: string;
  name: string;
  description: string;
  phony: boolean;
  commands: string;
  dependencies: string;
}

type Preset = {
  label: string;
  targets: Omit<Target, 'id'>[];
};

const PRESETS: Record<string, Preset> = {
  node: {
    label: 'Node.js / npm',
    targets: [
      { name: 'install', description: 'Install dependencies', phony: true, commands: 'npm install', dependencies: '' },
      { name: 'dev', description: 'Start dev server', phony: true, commands: 'npm run dev', dependencies: 'install' },
      { name: 'build', description: 'Build for production', phony: true, commands: 'npm run build', dependencies: 'install' },
      { name: 'test', description: 'Run tests', phony: true, commands: 'npm test', dependencies: 'install' },
      { name: 'lint', description: 'Lint source code', phony: true, commands: 'npm run lint', dependencies: '' },
      { name: 'clean', description: 'Remove build artifacts', phony: true, commands: 'rm -rf node_modules dist .next', dependencies: '' },
    ],
  },
  python: {
    label: 'Python / pip',
    targets: [
      { name: 'install', description: 'Create venv and install deps', phony: true, commands: 'python -m venv .venv && .venv/bin/pip install -r requirements.txt', dependencies: '' },
      { name: 'dev', description: 'Run development server', phony: true, commands: '.venv/bin/python -m uvicorn main:app --reload', dependencies: 'install' },
      { name: 'test', description: 'Run tests with pytest', phony: true, commands: '.venv/bin/pytest', dependencies: 'install' },
      { name: 'lint', description: 'Lint with ruff', phony: true, commands: '.venv/bin/ruff check .', dependencies: '' },
      { name: 'format', description: 'Format with black', phony: true, commands: '.venv/bin/black .', dependencies: '' },
      { name: 'clean', description: 'Remove venv and caches', phony: true, commands: 'rm -rf .venv __pycache__ .pytest_cache .ruff_cache', dependencies: '' },
    ],
  },
  docker: {
    label: 'Docker',
    targets: [
      { name: 'build', description: 'Build Docker image', phony: true, commands: 'docker build -t $(IMAGE_NAME):$(TAG) .', dependencies: '' },
      { name: 'run', description: 'Run container', phony: true, commands: 'docker run -p $(PORT):$(PORT) $(IMAGE_NAME):$(TAG)', dependencies: 'build' },
      { name: 'push', description: 'Push to registry', phony: true, commands: 'docker push $(IMAGE_NAME):$(TAG)', dependencies: 'build' },
      { name: 'pull', description: 'Pull from registry', phony: true, commands: 'docker pull $(IMAGE_NAME):$(TAG)', dependencies: '' },
      { name: 'stop', description: 'Stop all containers', phony: true, commands: 'docker stop $$(docker ps -q)', dependencies: '' },
      { name: 'clean', description: 'Remove stopped containers and images', phony: true, commands: 'docker system prune -f', dependencies: '' },
    ],
  },
  go: {
    label: 'Go',
    targets: [
      { name: 'build', description: 'Build binary', phony: true, commands: 'go build -o bin/$(APP_NAME) ./cmd/...', dependencies: '' },
      { name: 'run', description: 'Run development server', phony: true, commands: 'go run ./cmd/...', dependencies: '' },
      { name: 'test', description: 'Run all tests', phony: true, commands: 'go test -v ./...', dependencies: '' },
      { name: 'lint', description: 'Lint with golangci-lint', phony: true, commands: 'golangci-lint run', dependencies: '' },
      { name: 'tidy', description: 'Tidy go modules', phony: true, commands: 'go mod tidy', dependencies: '' },
      { name: 'clean', description: 'Remove binaries', phony: true, commands: 'rm -rf bin/', dependencies: '' },
    ],
  },
  terraform: {
    label: 'Terraform',
    targets: [
      { name: 'init', description: 'Initialize Terraform', phony: true, commands: 'terraform init', dependencies: '' },
      { name: 'plan', description: 'Plan changes', phony: true, commands: 'terraform plan -out=tfplan', dependencies: 'init' },
      { name: 'apply', description: 'Apply changes', phony: true, commands: 'terraform apply tfplan', dependencies: 'plan' },
      { name: 'destroy', description: 'Destroy infrastructure', phony: true, commands: 'terraform destroy', dependencies: 'init' },
      { name: 'fmt', description: 'Format HCL files', phony: true, commands: 'terraform fmt -recursive', dependencies: '' },
      { name: 'validate', description: 'Validate configuration', phony: true, commands: 'terraform validate', dependencies: 'init' },
    ],
  },
  ci: {
    label: 'CI/CD',
    targets: [
      { name: 'ci', description: 'Full CI pipeline', phony: true, commands: '', dependencies: 'lint test build' },
      { name: 'lint', description: 'Lint all code', phony: true, commands: 'echo "Running linter..."', dependencies: '' },
      { name: 'test', description: 'Run test suite', phony: true, commands: 'echo "Running tests..."', dependencies: '' },
      { name: 'build', description: 'Build artifacts', phony: true, commands: 'echo "Building..."', dependencies: '' },
      { name: 'deploy-staging', description: 'Deploy to staging', phony: true, commands: 'echo "Deploying to staging..."', dependencies: 'ci' },
      { name: 'deploy-prod', description: 'Deploy to production', phony: true, commands: 'echo "Deploying to production..."', dependencies: 'ci' },
    ],
  },
};

let idSeq = 0;
function uid() { return `t${++idSeq}`; }

function presetToTargets(preset: Preset): Target[] {
  return preset.targets.map((t) => ({ ...t, id: uid() }));
}

interface VariableDef {
  name: string;
  value: string;
}

const PRESET_VARS: Record<string, VariableDef[]> = {
  node: [{ name: 'NODE_ENV', value: 'production' }],
  python: [{ name: 'PYTHON', value: '.venv/bin/python' }],
  docker: [
    { name: 'IMAGE_NAME', value: 'my-app' },
    { name: 'TAG', value: 'latest' },
    { name: 'PORT', value: '8080' },
  ],
  go: [{ name: 'APP_NAME', value: 'myapp' }],
  terraform: [{ name: 'TF_VAR_env', value: 'dev' }],
  ci: [],
};

function generateMakefile(targets: Target[], vars: VariableDef[], shellBin: string): string {
  const lines: string[] = [];

  lines.push(`SHELL := ${shellBin}`);
  lines.push('');

  if (vars.length > 0) {
    for (const v of vars) {
      lines.push(`${v.name} := ${v.value}`);
    }
    lines.push('');
  }

  const phonies = targets.filter((t) => t.phony).map((t) => t.name);
  if (phonies.length > 0) {
    lines.push(`.PHONY: ${phonies.join(' ')}`);
    lines.push('');
  }

  for (const t of targets) {
    if (t.description) {
      lines.push(`## ${t.description}`);
    }
    const deps = t.dependencies.trim();
    lines.push(`${t.name}:${deps ? ' ' + deps : ''}`);
    if (t.commands.trim()) {
      for (const cmd of t.commands.split('\n')) {
        if (cmd.trim()) lines.push(`\t${cmd.trim()}`);
      }
    }
    lines.push('');
  }

  // Add help target
  lines.push('## Show this help');
  lines.push('help:');
  lines.push('\t@echo "Available targets:"');
  lines.push('\t@grep -E \'^## \' $(MAKEFILE_LIST) | sed \'s/## //\'');
  lines.push('');

  return lines.join('\n');
}

export default function MakefileGenerator() {
  const [selectedPreset, setSelectedPreset] = useState<string>('node');
  const [targets, setTargets] = useState<Target[]>(presetToTargets(PRESETS.node));
  const [variables, setVariables] = useState<VariableDef[]>(PRESET_VARS.node);
  const [shellBin, setShellBin] = useState('/bin/bash');
  const [editingTarget, setEditingTarget] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handlePreset = (key: string) => {
    setSelectedPreset(key);
    setTargets(presetToTargets(PRESETS[key]));
    setVariables(PRESET_VARS[key] || []);
    setEditingTarget(null);
    setCopied(false);
  };

  const addTarget = () => {
    const id = uid();
    setTargets((ts) => [...ts, { id, name: 'new-target', description: '', phony: true, commands: 'echo "Running new-target"', dependencies: '' }]);
    setEditingTarget(id);
  };

  const removeTarget = (id: string) => {
    setTargets((ts) => ts.filter((t) => t.id !== id));
    if (editingTarget === id) setEditingTarget(null);
  };

  const updateTarget = (id: string, key: keyof Target, val: string | boolean) => {
    setTargets((ts) => ts.map((t) => t.id === id ? { ...t, [key]: val } : t));
    setCopied(false);
  };

  const addVar = () => setVariables((vs) => [...vs, { name: 'MY_VAR', value: 'value' }]);
  const removeVar = (i: number) => setVariables((vs) => vs.filter((_, idx) => idx !== i));
  const updateVar = (i: number, key: 'name' | 'value', val: string) => {
    setVariables((vs) => vs.map((v, idx) => idx === i ? { ...v, [key]: val } : v));
    setCopied(false);
  };

  const output = generateMakefile(targets, variables, shellBin);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const editTarget = targets.find((t) => t.id === editingTarget);

  return (
    <div class="space-y-6">
      {/* Preset buttons */}
      <div>
        <p class="text-sm text-text-muted mb-2 font-medium">Start from a preset:</p>
        <div class="flex gap-2 flex-wrap">
          {Object.entries(PRESETS).map(([key, p]) => (
            <button
              key={key}
              onClick={() => handlePreset(key)}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedPreset === key
                  ? 'bg-brand-primary text-white'
                  : 'bg-surface-elevated text-text-muted hover:text-text-primary border border-border-default'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Editor */}
        <div class="space-y-4">
          {/* Variables */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-text-muted">Variables</p>
              <button onClick={addVar} class="text-xs px-2 py-1 rounded bg-surface-elevated border border-border-default text-text-muted hover:text-text-primary">+ Add</button>
            </div>
            <div class="space-y-2">
              {variables.map((v, i) => (
                <div key={i} class="flex gap-2 items-center">
                  <input
                    type="text"
                    class="flex-1 bg-surface-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    value={v.name}
                    onInput={(e) => updateVar(i, 'name', (e.target as HTMLInputElement).value)}
                  />
                  <span class="text-text-muted text-sm">:=</span>
                  <input
                    type="text"
                    class="flex-1 bg-surface-elevated border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                    value={v.value}
                    onInput={(e) => updateVar(i, 'value', (e.target as HTMLInputElement).value)}
                  />
                  <button onClick={() => removeVar(i)} class="text-red-400 hover:text-red-600 text-xs px-1">✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Shell */}
          <div>
            <label class="text-sm font-medium text-text-muted block mb-1">Shell</label>
            <select
              class="w-full bg-surface-elevated border border-border-default rounded-lg px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
              value={shellBin}
              onChange={(e) => { setShellBin((e.target as HTMLSelectElement).value); setCopied(false); }}
            >
              <option value="/bin/bash">/bin/bash</option>
              <option value="/bin/sh">/bin/sh</option>
              <option value="/usr/bin/env bash">/usr/bin/env bash</option>
              <option value="/bin/zsh">/bin/zsh</option>
            </select>
          </div>

          {/* Targets List */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <p class="text-sm font-medium text-text-muted">Targets</p>
              <button onClick={addTarget} class="text-xs px-2 py-1 rounded bg-surface-elevated border border-border-default text-text-muted hover:text-text-primary">+ Add Target</button>
            </div>
            <div class="space-y-1">
              {targets.map((t) => (
                <div
                  key={t.id}
                  class={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer border transition-colors ${
                    editingTarget === t.id
                      ? 'bg-brand-primary/10 border-brand-primary'
                      : 'bg-surface-elevated border-border-default hover:border-brand-primary/50'
                  }`}
                  onClick={() => setEditingTarget(editingTarget === t.id ? null : t.id)}
                >
                  <span class="font-mono text-sm text-text-primary flex-1">{t.name}</span>
                  {t.phony && <span class="text-xs text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded border border-border-default">.PHONY</span>}
                  <button
                    onClick={(e) => { e.stopPropagation(); removeTarget(t.id); }}
                    class="text-red-400 hover:text-red-600 text-xs ml-1"
                  >✕</button>
                </div>
              ))}
            </div>
          </div>

          {/* Target Editor */}
          {editTarget && (
            <div class="bg-surface-elevated border border-border-default rounded-lg p-4 space-y-3">
              <p class="text-sm font-medium text-text-primary">Edit: <code class="font-mono">{editTarget.name}</code></p>
              <div>
                <label class="text-xs text-text-muted block mb-1">Target Name</label>
                <input
                  type="text"
                  class="w-full bg-background border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  value={editTarget.name}
                  onInput={(e) => updateTarget(editTarget.id, 'name', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">Description (shown in ## comment)</label>
                <input
                  type="text"
                  class="w-full bg-background border border-border-default rounded px-2 py-1 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  value={editTarget.description}
                  onInput={(e) => updateTarget(editTarget.id, 'description', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">Dependencies (space-separated)</label>
                <input
                  type="text"
                  class="w-full bg-background border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  placeholder="e.g. install lint"
                  value={editTarget.dependencies}
                  onInput={(e) => updateTarget(editTarget.id, 'dependencies', (e.target as HTMLInputElement).value)}
                />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">Commands (one per line, tabs added automatically)</label>
                <textarea
                  class="w-full bg-background border border-border-default rounded px-2 py-1 text-sm text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-brand-primary resize-none"
                  rows={3}
                  value={editTarget.commands}
                  onInput={(e) => updateTarget(editTarget.id, 'commands', (e.target as HTMLTextAreaElement).value)}
                />
              </div>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editTarget.phony}
                  onChange={(e) => updateTarget(editTarget.id, 'phony', (e.target as HTMLInputElement).checked)}
                  class="w-4 h-4 accent-brand-primary"
                />
                <span class="text-sm text-text-muted">Mark as .PHONY (recommended for non-file targets)</span>
              </label>
            </div>
          )}
        </div>

        {/* Right: Output */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">Generated Makefile</label>
            <button
              onClick={handleCopy}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                copied ? 'bg-green-500 text-white' : 'bg-brand-primary text-white hover:bg-brand-hover'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy Makefile'}
            </button>
          </div>
          <pre class="bg-surface-elevated border border-border-default rounded-lg p-4 text-sm text-text-primary overflow-auto font-mono whitespace-pre min-h-[400px] text-xs leading-5">
            {output}
          </pre>
          <p class="text-xs text-text-muted">
            Save as <code class="bg-surface-elevated px-1 rounded">Makefile</code> (no extension) in your project root. Run with <code class="bg-surface-elevated px-1 rounded">make &lt;target&gt;</code>.
          </p>
        </div>
      </div>
    </div>
  );
}
