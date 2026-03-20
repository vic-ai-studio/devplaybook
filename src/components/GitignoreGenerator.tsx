import { useState } from 'preact/hooks';

const TEMPLATES: Record<string, { label: string; entries: string[] }> = {
  node: {
    label: 'Node.js',
    entries: [
      '# Dependencies',
      'node_modules/',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      'pnpm-debug.log*',
      '',
      '# Build output',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      '.output/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '.env.*.local',
      '',
      '# Logs',
      'logs/',
      '*.log',
      '',
      '# Runtime data',
      'pids/',
      '*.pid',
      '*.seed',
      '',
      '# Coverage',
      'coverage/',
      '.nyc_output/',
      '',
      '# Cache',
      '.cache/',
      '.parcel-cache/',
      '.eslintcache',
      '.stylelintcache',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  python: {
    label: 'Python',
    entries: [
      '# Byte-compiled / optimized / DLL files',
      '__pycache__/',
      '*.py[cod]',
      '*$py.class',
      '',
      '# Virtual environments',
      '.venv/',
      'venv/',
      'env/',
      '.env/',
      '',
      '# Distribution / packaging',
      'dist/',
      'build/',
      '*.egg-info/',
      '*.egg',
      '',
      '# Testing',
      '.pytest_cache/',
      '.tox/',
      'htmlcov/',
      '.coverage',
      'coverage.xml',
      '',
      '# Jupyter',
      '.ipynb_checkpoints/',
      '',
      '# Environment variables',
      '.env',
      '.env.local',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  react: {
    label: 'React / Next.js',
    entries: [
      '# Dependencies',
      'node_modules/',
      '',
      '# Build output',
      '.next/',
      'out/',
      'build/',
      'dist/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '.env.development.local',
      '.env.test.local',
      '.env.production.local',
      '',
      '# Debug',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',
      '',
      '# Vercel',
      '.vercel',
      '',
      '# TypeScript',
      '*.tsbuildinfo',
      'next-env.d.ts',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  java: {
    label: 'Java / Maven / Gradle',
    entries: [
      '# Compiled class files',
      '*.class',
      '',
      '# Log files',
      '*.log',
      '',
      '# BlueJ',
      '*.ctxt',
      '',
      '# Mobile Tools for Java (J2ME)',
      '.mtj.tmp/',
      '',
      '# Package Files',
      '*.jar',
      '*.war',
      '*.nar',
      '*.ear',
      '*.zip',
      '*.tar.gz',
      '*.rar',
      '',
      '# Build output',
      'target/',
      'build/',
      'out/',
      '',
      '# Maven',
      '.m2/',
      '',
      '# Gradle',
      '.gradle/',
      'gradle-app.setting',
      '',
      '# IDE',
      '.idea/',
      '*.iml',
      '.eclipse/',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  go: {
    label: 'Go',
    entries: [
      '# Binaries',
      '*.exe',
      '*.exe~',
      '*.dll',
      '*.so',
      '*.dylib',
      '',
      '# Test binary',
      '*.test',
      '',
      '# Output of the go coverage tool',
      '*.out',
      '',
      '# Dependency directories',
      'vendor/',
      '',
      '# Build output',
      'bin/',
      'dist/',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  rust: {
    label: 'Rust',
    entries: [
      '# Build output',
      'target/',
      '',
      '# Cargo lock (keep for binaries, remove for libraries)',
      '# Cargo.lock',
      '',
      '# Environment',
      '.env',
      '.env.local',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  dotnet: {
    label: '.NET / C#',
    entries: [
      '# Build results',
      '[Dd]ebug/',
      '[Dd]ebugPublic/',
      '[Rr]elease/',
      '[Rr]eleases/',
      'x64/',
      'x86/',
      '[Ww][Ii][Nn]32/',
      '[Aa][Rr][Mm]/',
      '[Aa][Rr][Mm]64/',
      'bld/',
      '[Bb]in/',
      '[Oo]bj/',
      '[Ll]og/',
      '[Ll]ogs/',
      '',
      '# Visual Studio',
      '.vs/',
      '*.user',
      '*.suo',
      '*.sln.docstates',
      '',
      '# NuGet',
      'packages/',
      '*.nupkg',
      '',
      '# Environment',
      '.env',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
  docker: {
    label: 'Docker',
    entries: [
      '# Docker build context',
      '.dockerignore',
      '',
      '# Local environment overrides',
      'docker-compose.override.yml',
      'docker-compose.local.yml',
      '',
      '# Data volumes',
      'data/',
      'volumes/',
      '',
      '# Secrets',
      '.env',
      '.env.local',
      'secrets/',
      '',
      '# Logs',
      'logs/',
      '*.log',
      '',
      '# OS',
      '.DS_Store',
      'Thumbs.db',
    ],
  },
};

const EXTRAS: Record<string, { label: string; entries: string[] }> = {
  vscode: { label: 'VS Code', entries: ['.vscode/', '*.code-workspace'] },
  jetbrains: { label: 'JetBrains IDEs', entries: ['.idea/', '*.iml', '*.iws', '*.ipr'] },
  macos: { label: 'macOS', entries: ['.DS_Store', '.AppleDouble', '.LSOverride', 'Icon\r', '._*'] },
  windows: { label: 'Windows', entries: ['Thumbs.db', 'ehthumbs.db', 'Desktop.ini', '$RECYCLE.BIN/'] },
  linux: { label: 'Linux', entries: ['*~', '.fuse_hidden*', '.directory', '.Trash-*', '.nfs*'] },
  terraform: { label: 'Terraform', entries: ['.terraform/', '*.tfstate', '*.tfstate.*', 'crash.log', '*.tfvars', 'override.tf', 'override.tf.json'] },
  env: { label: 'Environment Files', entries: ['.env', '.env.local', '.env.*.local', '*.env'] },
  logs: { label: 'Log Files', entries: ['*.log', 'logs/', 'npm-debug.log*', 'yarn-debug.log*'] },
};

export default function GitignoreGenerator() {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('node');
  const [selectedExtras, setSelectedExtras] = useState<Set<string>>(new Set(['vscode', 'macos']));
  const [copied, setCopied] = useState(false);

  const toggleExtra = (key: string) => {
    setSelectedExtras(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const generateOutput = () => {
    const template = TEMPLATES[selectedTemplate];
    const lines: string[] = [
      `# .gitignore — ${template.label}`,
      `# Generated by devplaybook.cc`,
      '',
      ...template.entries,
    ];

    for (const key of selectedExtras) {
      const extra = EXTRAS[key];
      lines.push('', `# ${extra.label}`, ...extra.entries);
    }

    return lines.join('\n');
  };

  const output = generateOutput();

  const handleCopy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.gitignore';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div class="space-y-6">
      {/* Project Type */}
      <div>
        <label class="block text-sm font-semibold mb-3">Project Type</label>
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {Object.entries(TEMPLATES).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => setSelectedTemplate(key)}
              class={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
                selectedTemplate === key
                  ? 'bg-accent text-white border-accent'
                  : 'border-border hover:border-accent/50 bg-surface text-text-muted hover:text-text'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Extras */}
      <div>
        <label class="block text-sm font-semibold mb-3">Add Extras</label>
        <div class="flex flex-wrap gap-2">
          {Object.entries(EXTRAS).map(([key, { label }]) => (
            <button
              key={key}
              onClick={() => toggleExtra(key)}
              class={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedExtras.has(key)
                  ? 'bg-accent/20 text-accent border-accent/50'
                  : 'border-border hover:border-accent/30 bg-surface text-text-muted hover:text-text'
              }`}
            >
              {selectedExtras.has(key) ? '✓ ' : '+ '}{label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div class="flex gap-2">
        <button
          onClick={handleCopy}
          class="px-4 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
        >
          {copied ? '✓ Copied!' : 'Copy to Clipboard'}
        </button>
        <button
          onClick={handleDownload}
          class="px-4 py-2 bg-surface border border-border hover:border-accent/50 text-text rounded-lg text-sm font-medium transition-colors"
        >
          ↓ Download .gitignore
        </button>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Generated .gitignore</label>
          <span class="text-xs text-text-muted">{output.split('\n').length} lines</span>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-sm font-mono overflow-auto max-h-[500px] text-text leading-relaxed whitespace-pre">
          {output}
        </pre>
      </div>
    </div>
  );
}
