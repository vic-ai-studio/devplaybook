import { useState } from 'preact/hooks';

type Tool = 'venv' | 'conda' | 'poetry' | 'uv' | 'pipenv';
type UseCase = 'quick-script' | 'library-dev' | 'ml-project' | 'team-project';

interface ToolInfo {
  name: string;
  speed: string;
  speedScore: number;
  disk: string;
  lockFile: boolean;
  pythonMgmt: boolean;
  pros: string[];
  cons: string[];
  color: string;
}

const TOOLS: Record<Tool, ToolInfo> = {
  venv: {
    name: 'venv',
    speed: 'Medium',
    speedScore: 3,
    disk: 'Low',
    lockFile: false,
    pythonMgmt: false,
    pros: ['Built into Python 3.3+', 'Zero dependencies', 'Simple & predictable', 'Universal support'],
    cons: ['No lock file', 'No Python version mgmt', 'Manual dependency mgmt', 'No monorepo support'],
    color: 'blue',
  },
  conda: {
    name: 'conda',
    speed: 'Slow',
    speedScore: 1,
    disk: 'Very High',
    lockFile: true,
    pythonMgmt: true,
    pros: ['Manages Python versions', 'Non-Python packages (C libs)', 'Great for data science', 'environment.yml standard'],
    cons: ['Very slow solver', 'Large disk footprint', 'Mamba needed for speed', 'Conda-forge complexity'],
    color: 'green',
  },
  poetry: {
    name: 'Poetry',
    speed: 'Medium',
    speedScore: 3,
    disk: 'Medium',
    lockFile: true,
    pythonMgmt: false,
    pros: ['poetry.lock reproducibility', 'pyproject.toml standard', 'Publish to PyPI built-in', 'Dependency groups'],
    cons: ['No Python version mgmt', 'Slower than uv', 'Complex resolver sometimes', 'Separate pyenv needed'],
    color: 'pink',
  },
  uv: {
    name: 'uv',
    speed: 'Very Fast',
    speedScore: 5,
    disk: 'Low',
    lockFile: true,
    pythonMgmt: true,
    pros: ['10–100× faster than pip', 'Python version management', 'pyproject.toml compatible', 'Drop-in pip replacement'],
    cons: ['Relatively new (2024)', 'Ecosystem still maturing', 'Some edge cases differ from pip', 'Requires learning new CLI'],
    color: 'orange',
  },
  pipenv: {
    name: 'Pipenv',
    speed: 'Slow',
    speedScore: 2,
    disk: 'Medium',
    lockFile: true,
    pythonMgmt: false,
    pros: ['Pipfile.lock reproducibility', 'Integrated Pipfile format', 'Automatic .env loading', 'Mature ecosystem'],
    cons: ['Slow resolver', 'Maintenance slowed', 'No Python version mgmt', 'Replaced by Poetry/uv in new projects'],
    color: 'purple',
  },
};

interface SetupGuide {
  create: string;
  activate: string;
  install: string;
  export: string;
  restore: string;
}

const SETUP: Record<Tool, SetupGuide> = {
  venv: {
    create: 'python -m venv .venv',
    activate: 'source .venv/bin/activate  # Linux/Mac\n.venv\\Scripts\\activate     # Windows',
    install: 'pip install requests numpy',
    export: 'pip freeze > requirements.txt',
    restore: 'pip install -r requirements.txt',
  },
  conda: {
    create: 'conda create -n myenv python=3.11',
    activate: 'conda activate myenv',
    install: 'conda install numpy pandas  # or:\npip install requests',
    export: 'conda env export > environment.yml',
    restore: 'conda env create -f environment.yml',
  },
  poetry: {
    create: 'poetry new myproject  # new project\n# or: poetry init   # existing project',
    activate: 'poetry shell',
    install: 'poetry add requests numpy',
    export: 'poetry export -f requirements.txt --output requirements.txt',
    restore: 'poetry install',
  },
  uv: {
    create: 'uv venv .venv  # or: uv init myproject',
    activate: 'source .venv/bin/activate  # Linux/Mac\n.venv\\Scripts\\activate     # Windows',
    install: 'uv pip install requests numpy  # or: uv add requests',
    export: 'uv pip freeze > requirements.txt\n# or: uv lock (pyproject.toml)',
    restore: 'uv pip install -r requirements.txt\n# or: uv sync',
  },
  pipenv: {
    create: 'pipenv --python 3.11',
    activate: 'pipenv shell',
    install: 'pipenv install requests numpy',
    export: 'pipenv lock\npipenv requirements > requirements.txt',
    restore: 'pipenv install --deploy',
  },
};

const RECOMMENDATIONS: Record<UseCase, { tool: Tool; reason: string }> = {
  'quick-script': {
    tool: 'venv',
    reason: 'For quick scripts, the built-in venv is all you need. Zero setup, zero dependencies — just python -m venv .venv and you\'re ready.',
  },
  'library-dev': {
    tool: 'poetry',
    reason: 'Poetry is the gold standard for library development. pyproject.toml, dependency groups, and one-command PyPI publishing make it ideal.',
  },
  'ml-project': {
    tool: 'uv',
    reason: 'uv installs packages 10–100× faster than pip, manages Python versions, and handles large ML dependency trees (PyTorch, TensorFlow) without the conda overhead.',
  },
  'team-project': {
    tool: 'uv',
    reason: 'uv\'s lock files, Python version management, and blazing speed make it the best choice for team projects in 2026. Compatible with pyproject.toml standards.',
  },
};

const USE_CASES: { value: UseCase; label: string }[] = [
  { value: 'quick-script', label: 'Quick script / prototype' },
  { value: 'library-dev', label: 'Library / package development' },
  { value: 'ml-project', label: 'ML / data science project' },
  { value: 'team-project', label: 'Team / production project' },
];

const toolColors: Record<string, string> = {
  blue: 'text-blue-400',
  green: 'text-green-400',
  pink: 'text-pink-400',
  orange: 'text-orange-400',
  purple: 'text-purple-400',
};

const speedDots = (score: number) => '●'.repeat(score) + '○'.repeat(5 - score);

export default function PythonVenvComparator() {
  const [activeTab, setActiveTab] = useState<Tool>('uv');
  const [useCase, setUseCase] = useState<UseCase>('team-project');

  const rec = RECOMMENDATIONS[useCase];
  const guide = SETUP[activeTab];

  return (
    <div class="space-y-6">
      {/* Comparison table */}
      <div class="p-4 rounded-xl border border-border bg-surface overflow-x-auto">
        <h3 class="text-sm font-semibold mb-3">Feature Comparison</h3>
        <table class="w-full text-sm min-w-[600px]">
          <thead>
            <tr class="border-b border-border">
              <th class="text-left py-2 pr-4 text-text-muted font-medium w-36">Feature</th>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <th key={t} class={`text-center py-2 px-2 font-semibold ${toolColors[TOOLS[t].color]}`}>{TOOLS[t].name}</th>
              ))}
            </tr>
          </thead>
          <tbody class="divide-y divide-border/50">
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs">Speed</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="text-center py-2 px-2">
                  <span class={`text-xs font-mono tracking-tighter ${toolColors[TOOLS[t].color]}`}>{speedDots(TOOLS[t].speedScore)}</span>
                  <div class="text-xs text-text-muted">{TOOLS[t].speed}</div>
                </td>
              ))}
            </tr>
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs">Disk usage</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="text-center py-2 px-2 text-xs">{TOOLS[t].disk}</td>
              ))}
            </tr>
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs">Lock file</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="text-center py-2 px-2 text-sm">{TOOLS[t].lockFile ? '✓' : '✗'}</td>
              ))}
            </tr>
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs">Python version mgmt</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="text-center py-2 px-2 text-sm">{TOOLS[t].pythonMgmt ? '✓' : '✗'}</td>
              ))}
            </tr>
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs align-top pt-3">Pros</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="py-2 px-2 align-top">
                  <ul class="space-y-0.5">
                    {TOOLS[t].pros.map(p => (
                      <li key={p} class="text-xs text-text flex gap-1"><span class="text-green-400 shrink-0">+</span>{p}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
            <tr>
              <td class="py-2 pr-4 text-text-muted text-xs align-top pt-3">Cons</td>
              {(Object.keys(TOOLS) as Tool[]).map(t => (
                <td key={t} class="py-2 px-2 align-top">
                  <ul class="space-y-0.5">
                    {TOOLS[t].cons.map(c => (
                      <li key={c} class="text-xs text-text-muted flex gap-1"><span class="text-red-400 shrink-0">–</span>{c}</li>
                    ))}
                  </ul>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Recommendation widget */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Get a Recommendation</h3>
        <div class="flex flex-wrap gap-2 mb-4">
          {USE_CASES.map(uc => (
            <button
              key={uc.value}
              onClick={() => setUseCase(uc.value)}
              class={`px-3 py-1.5 rounded-lg text-sm transition-colors ${useCase === uc.value ? 'bg-accent text-white' : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
            >
              {uc.label}
            </button>
          ))}
        </div>
        <div class="p-4 rounded-xl bg-accent/5 border border-accent/20">
          <div class="flex items-center gap-2 mb-2">
            <span class="text-sm font-medium">Recommended:</span>
            <span class={`text-base font-bold ${toolColors[TOOLS[rec.tool].color]}`}>{TOOLS[rec.tool].name}</span>
          </div>
          <p class="text-sm text-text-muted">{rec.reason}</p>
        </div>
      </div>

      {/* Setup guide tab switcher */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <h3 class="text-sm font-semibold mb-3">Setup Guide</h3>
        <div class="flex gap-2 flex-wrap mb-4">
          {(Object.keys(TOOLS) as Tool[]).map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              class={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === t ? `bg-accent text-white` : 'bg-surface-alt border border-border text-text-muted hover:text-text'}`}
            >
              {TOOLS[t].name}
            </button>
          ))}
        </div>

        <div class="space-y-3">
          {([
            ['Create environment', guide.create],
            ['Activate', guide.activate],
            ['Install packages', guide.install],
            ['Export dependencies', guide.export],
            ['Install from lock/requirements', guide.restore],
          ] as [string, string][]).map(([label, cmd]) => (
            <div key={label}>
              <p class="text-xs text-text-muted mb-1 font-medium">{label}</p>
              <pre class="p-3 rounded-lg bg-surface-alt border border-border text-sm font-mono text-text overflow-x-auto whitespace-pre">{cmd}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
