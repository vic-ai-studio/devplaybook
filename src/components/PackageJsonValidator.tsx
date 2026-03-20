import { useState } from 'preact/hooks';

interface Issue {
  level: 'error' | 'warning' | 'info';
  field: string;
  message: string;
}

interface AuditResult {
  valid: boolean;
  score: number;
  issues: Issue[];
  parsed?: Record<string, unknown>;
}

const EXAMPLE = JSON.stringify({
  name: 'my-app',
  version: '1.0.0',
  description: 'A sample Node.js app',
  main: 'index.js',
  scripts: {
    start: 'node index.js',
    test: 'jest',
  },
  dependencies: {
    express: '^4.18.2',
    lodash: '*',
  },
  devDependencies: {
    jest: '^29.0.0',
  },
  license: 'MIT',
}, null, 2);

function auditPackageJson(json: Record<string, unknown>): AuditResult {
  const issues: Issue[] = [];
  let score = 100;

  // Required fields
  if (!json.name) {
    issues.push({ level: 'error', field: 'name', message: 'Missing required field "name"' });
    score -= 20;
  } else if (typeof json.name !== 'string' || !/^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(json.name as string)) {
    issues.push({ level: 'warning', field: 'name', message: 'Package name should be lowercase, no spaces, URL-safe' });
    score -= 5;
  }

  if (!json.version) {
    issues.push({ level: 'error', field: 'version', message: 'Missing required field "version"' });
    score -= 15;
  } else if (!/^\d+\.\d+\.\d+/.test(json.version as string)) {
    issues.push({ level: 'warning', field: 'version', message: 'Version should follow semver (e.g. 1.0.0)' });
    score -= 5;
  }

  // Recommended fields
  if (!json.description) {
    issues.push({ level: 'warning', field: 'description', message: 'Missing "description" — helps users understand the package' });
    score -= 5;
  }

  if (!json.license) {
    issues.push({ level: 'warning', field: 'license', message: 'Missing "license" field — add "MIT", "ISC", "UNLICENSED", etc.' });
    score -= 5;
  }

  if (!json.scripts) {
    issues.push({ level: 'info', field: 'scripts', message: 'No "scripts" defined — consider adding "start", "build", "test"' });
    score -= 2;
  } else {
    const scripts = json.scripts as Record<string, string>;
    if (!scripts.test || scripts.test === 'echo "Error: no test specified" && exit 1') {
      issues.push({ level: 'warning', field: 'scripts.test', message: '"test" script is missing or is the default placeholder' });
      score -= 5;
    }
  }

  // Dependency issues
  const deps = (json.dependencies || {}) as Record<string, string>;
  const devDeps = (json.devDependencies || {}) as Record<string, string>;

  for (const [pkg, ver] of Object.entries(deps)) {
    if (ver === '*') {
      issues.push({ level: 'error', field: `dependencies.${pkg}`, message: `"${pkg}": wildcard "*" is dangerous — pin or use range like "^1.0.0"` });
      score -= 10;
    } else if (ver === 'latest') {
      issues.push({ level: 'warning', field: `dependencies.${pkg}`, message: `"${pkg}": using "latest" can cause unpredictable behavior` });
      score -= 5;
    } else if (!ver.startsWith('^') && !ver.startsWith('~') && !ver.startsWith('>') && !/^\d/.test(ver) && !ver.startsWith('workspace')) {
      issues.push({ level: 'info', field: `dependencies.${pkg}`, message: `"${pkg}": non-standard version specifier "${ver}"` });
    }
  }

  for (const [pkg, ver] of Object.entries(devDeps)) {
    if (ver === '*') {
      issues.push({ level: 'warning', field: `devDependencies.${pkg}`, message: `"${pkg}": wildcard "*" in devDependencies` });
      score -= 3;
    }
    // Detect potential prod deps accidentally in devDeps
    if (['express', 'fastify', 'koa', 'hapi', 'react', 'vue', 'angular'].includes(pkg)) {
      issues.push({ level: 'warning', field: `devDependencies.${pkg}`, message: `"${pkg}" looks like a production dependency — should it be in "dependencies"?` });
      score -= 5;
    }
  }

  // Cross-checks
  const allDeps = { ...deps, ...devDeps };
  if (allDeps['lodash'] && !allDeps['@types/lodash']) {
    issues.push({ level: 'info', field: 'dependencies', message: '"lodash" found but "@types/lodash" is missing — consider adding for TypeScript support' });
  }

  // Repository / author
  if (!json.repository && !json.homepage) {
    issues.push({ level: 'info', field: 'repository', message: 'No "repository" or "homepage" — helps users find source code' });
  }

  // Engines
  if (!json.engines) {
    issues.push({ level: 'info', field: 'engines', message: 'No "engines" field — consider specifying required Node.js version (e.g. ">=18.0.0")' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', field: '—', message: 'No issues found! Package looks well-configured.' });
  }

  return {
    valid: !issues.some(i => i.level === 'error'),
    score: Math.max(0, score),
    issues,
  };
}

export default function PackageJsonValidator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [parseError, setParseError] = useState('');

  const handleValidate = () => {
    if (!input.trim()) return;
    setParseError('');
    try {
      const parsed = JSON.parse(input);
      setResult(auditPackageJson(parsed));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setParseError(`JSON parse error: ${msg}`);
      setResult(null);
    }
  };

  const handleExample = () => {
    setInput(EXAMPLE);
    setResult(null);
    setParseError('');
  };

  const levelColor = (level: string) => {
    if (level === 'error') return 'text-red-500';
    if (level === 'warning') return 'text-yellow-500';
    return 'text-blue-400';
  };

  const levelBg = (level: string) => {
    if (level === 'error') return 'bg-red-500/10 border-red-500/30';
    if (level === 'warning') return 'bg-yellow-500/10 border-yellow-500/30';
    return 'bg-blue-500/10 border-blue-500/30';
  };

  const levelIcon = (level: string) => {
    if (level === 'error') return '✕';
    if (level === 'warning') return '⚠';
    return 'ℹ';
  };

  const scoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div class="space-y-6">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Paste your package.json</label>
          <button onClick={handleExample} class="text-xs text-accent hover:underline">Load example</button>
        </div>
        <textarea
          class="w-full h-64 bg-surface border border-border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-accent"
          placeholder='{"name": "my-app", "version": "1.0.0", ...}'
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      <button
        onClick={handleValidate}
        disabled={!input.trim()}
        class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Validate & Audit
      </button>

      {parseError && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm font-mono">
          {parseError}
        </div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Score */}
          <div class="flex items-center gap-6 bg-surface border border-border rounded-lg p-4">
            <div class="text-center">
              <div class={`text-4xl font-bold ${scoreColor(result.score)}`}>{result.score}</div>
              <div class="text-xs text-text-muted mt-1">Score / 100</div>
            </div>
            <div class="flex-1">
              <div class={`text-sm font-semibold ${result.valid ? 'text-green-400' : 'text-red-400'}`}>
                {result.valid ? '✓ Valid JSON — no errors' : '✕ Has errors — fix before publishing'}
              </div>
              <div class="text-xs text-text-muted mt-1">
                {result.issues.filter(i => i.level === 'error').length} errors ·{' '}
                {result.issues.filter(i => i.level === 'warning').length} warnings ·{' '}
                {result.issues.filter(i => i.level === 'info').length} suggestions
              </div>
            </div>
          </div>

          {/* Issues */}
          <div class="space-y-2">
            {result.issues.map((issue, i) => (
              <div key={i} class={`border rounded-lg p-3 flex gap-3 ${levelBg(issue.level)}`}>
                <span class={`text-xs font-bold mt-0.5 ${levelColor(issue.level)}`}>{levelIcon(issue.level)}</span>
                <div>
                  <span class="text-xs font-mono text-text-muted">{issue.field}</span>
                  <p class="text-sm mt-0.5">{issue.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
