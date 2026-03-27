import { useState, useCallback } from 'preact/hooks';

type LintLevel = 'error' | 'warning' | 'info';
type CiPlatform = 'github-actions' | 'gitlab-ci';

interface LintIssue {
  level: LintLevel;
  message: string;
  line?: number;
  doc?: string;
}

const GITHUB_SAMPLE = `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install deps
        run: npm install
      - name: Run tests
        run: npm test
        env:
          API_KEY: supersecret123
`;

const GITLAB_SAMPLE = `stages:
  - test
  - build
  - deploy

variables:
  NODE_VERSION: "18"

test:
  stage: test
  image: node:latest
  script:
    - npm install
    - npm test
  only:
    - main

build:
  stage: build
  image: docker:latest
  script:
    - docker build -t myapp .
  only:
    - main
`;

function linesOf(yaml: string): string[] {
  return yaml.split('\n');
}

function lintGitHubActions(yaml: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = linesOf(yaml);

  if (!yaml.trim()) {
    issues.push({ level: 'error', message: 'Empty file — paste a GitHub Actions YAML workflow.' });
    return issues;
  }

  // Check for 'on:' trigger
  if (!yaml.includes('on:') && !yaml.includes("'on':") && !yaml.includes('"on":')) {
    issues.push({ level: 'error', message: 'Missing required "on:" trigger (e.g. on: push, pull_request).', doc: 'https://docs.github.com/en/actions/writing-workflows/choosing-when-your-workflow-runs' });
  }

  // Check for 'jobs:' key
  if (!yaml.includes('jobs:')) {
    issues.push({ level: 'error', message: 'Missing required "jobs:" key.', doc: 'https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobs' });
  }

  // Check for name
  if (!yaml.match(/^name:/m)) {
    issues.push({ level: 'info', message: 'Consider adding a "name:" field to identify this workflow in the GitHub UI.' });
  }

  // Detect hardcoded secrets / tokens in env/with blocks
  const secretPatterns = [/password\s*[:=]\s*\S+/i, /api[_-]?key\s*[:=]\s*[^${\s][^\s]+/i, /token\s*[:=]\s*[^${\s][^\s]+/i, /secret\s*[:=]\s*[^${\s][^\s]+/i];
  lines.forEach((line, i) => {
    secretPatterns.forEach(pat => {
      if (pat.test(line) && !line.trim().startsWith('#') && !line.includes('${{') && !line.includes('secrets.')) {
        issues.push({ level: 'error', message: `Line ${i + 1}: Possible hardcoded secret — use \${{ secrets.YOUR_SECRET }} instead.`, line: i + 1 });
      }
    });
  });

  // Warn about uses: actions/...@v without pinning to SHA
  lines.forEach((line, i) => {
    const m = line.match(/uses:\s+([\w\-./]+)@(main|master|latest|HEAD)/);
    if (m) {
      issues.push({ level: 'warning', message: `Line ${i + 1}: \`${m[0].trim()}\` uses a mutable ref (${m[2]}). Pin to a specific version or commit SHA for reproducible builds.`, line: i + 1 });
    }
  });

  // Warn about runs-on: self-hosted without label
  lines.forEach((line, i) => {
    if (/runs-on:\s*self-hosted/.test(line)) {
      issues.push({ level: 'warning', message: `Line ${i + 1}: "runs-on: self-hosted" without OS/arch labels may route to any runner. Add labels like [self-hosted, linux, x64].`, line: i + 1 });
    }
  });

  // Warn about missing timeout-minutes
  if (!yaml.includes('timeout-minutes')) {
    issues.push({ level: 'warning', message: 'No "timeout-minutes" set. Stuck jobs can consume credits indefinitely. Set a reasonable timeout (e.g. 30).', doc: 'https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions#jobsjob_idtimeout-minutes' });
  }

  // Check for permissions block (security best practice)
  if (!yaml.includes('permissions:')) {
    issues.push({ level: 'info', message: 'Consider adding a "permissions:" block to restrict the GITHUB_TOKEN scope (principle of least privilege).', doc: 'https://docs.github.com/en/actions/security-guides/automatic-token-authentication#permissions-for-the-github_token' });
  }

  // Warn about run: npm install without cache
  const hasNpmInstall = yaml.includes('npm install') || yaml.includes('npm ci');
  const hasCache = yaml.includes('cache:') || yaml.includes('actions/cache') || yaml.includes("cache: 'npm'");
  if (hasNpmInstall && !hasCache) {
    issues.push({ level: 'warning', message: 'npm install/ci detected but no cache configured. Add cache: "npm" to actions/setup-node or use actions/cache to speed up workflows.' });
  }

  // Warn about tab characters (YAML requires spaces)
  lines.forEach((line, i) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Line ${i + 1}: Tab character found. YAML requires spaces, not tabs.`, line: i + 1 });
    }
  });

  // Info: suggest concurrency group to cancel outdated runs
  if (!yaml.includes('concurrency:')) {
    issues.push({ level: 'info', message: 'Consider adding a "concurrency:" group to auto-cancel outdated PR runs and save CI minutes.' });
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: '✓ No issues found in this GitHub Actions workflow.' });
  }

  return issues;
}

function lintGitLabCI(yaml: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = linesOf(yaml);

  if (!yaml.trim()) {
    issues.push({ level: 'error', message: 'Empty file — paste a .gitlab-ci.yml content.' });
    return issues;
  }

  // Check for stages
  if (!yaml.includes('stages:')) {
    issues.push({ level: 'warning', message: 'No "stages:" defined. GitLab CI will default to [build, test, deploy] order.' });
  }

  // Warn about image: <name>:latest
  lines.forEach((line, i) => {
    if (/image:\s+\S+:latest/.test(line)) {
      issues.push({ level: 'warning', message: `Line ${i + 1}: Using ":latest" tag is not reproducible. Pin to a specific version (e.g. node:18.20).`, line: i + 1 });
    }
  });

  // Detect hardcoded secrets
  const secretPatterns = [/password\s*[:=]\s*\S+/i, /api[_-]?key\s*[:=]\s*[^$\s][^\s]+/i, /token\s*[:=]\s*[^$\s][^\s]+/i];
  lines.forEach((line, i) => {
    secretPatterns.forEach(pat => {
      if (pat.test(line) && !line.trim().startsWith('#') && !line.includes('$CI_') && !line.includes('${')) {
        issues.push({ level: 'error', message: `Line ${i + 1}: Possible hardcoded secret — use a GitLab CI/CD variable instead (Settings > CI/CD > Variables).`, line: i + 1 });
      }
    });
  });

  // Warn about only/except (deprecated, prefer rules:)
  const hasOnly = yaml.match(/^\s+only:/m);
  const hasExcept = yaml.match(/^\s+except:/m);
  if (hasOnly || hasExcept) {
    issues.push({ level: 'warning', message: '"only:" and "except:" are deprecated. Use "rules:" for more flexible pipeline logic.', doc: 'https://docs.gitlab.com/ee/ci/yaml/#rules' });
  }

  // Check for missing image at job level without default
  const hasDefaultImage = yaml.includes('default:') && yaml.includes('image:');
  const jobsWithoutImage: number[] = [];
  let inJob = false;
  let currentJobLine = 0;
  let jobHasImage = false;
  lines.forEach((line, i) => {
    if (/^[a-zA-Z_][\w-]*\s*:/.test(line) && !line.startsWith(' ') && !['stages', 'variables', 'default', 'include', 'workflow', 'cache', 'before_script', 'after_script', 'image', 'services'].includes(line.split(':')[0].trim())) {
      if (inJob && !jobHasImage && !hasDefaultImage) jobsWithoutImage.push(currentJobLine);
      inJob = true;
      currentJobLine = i + 1;
      jobHasImage = false;
    }
    if (inJob && /^\s+image\s*:/.test(line)) jobHasImage = true;
  });
  if (inJob && !jobHasImage && !hasDefaultImage) jobsWithoutImage.push(currentJobLine);
  if (jobsWithoutImage.length > 0) {
    issues.push({ level: 'info', message: `${jobsWithoutImage.length} job(s) have no image defined. Set a "default: image:" or specify "image:" per job to ensure consistent runners.` });
  }

  // Warn about tab characters
  lines.forEach((line, i) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Line ${i + 1}: Tab character found. YAML requires spaces, not tabs.`, line: i + 1 });
    }
  });

  // Info: suggest artifacts for test results
  if (!yaml.includes('artifacts:')) {
    issues.push({ level: 'info', message: 'No "artifacts:" defined. Consider saving test reports or build outputs for use across pipeline stages.' });
  }

  // Info: suggest cache
  if (!yaml.includes('cache:')) {
    issues.push({ level: 'info', message: 'No "cache:" defined. Add a cache for node_modules, pip, or Maven to speed up jobs.' });
  }

  if (issues.filter(i => i.level !== 'info').length === 0 && issues.length > 0) {
    issues.unshift({ level: 'info', message: '✓ No errors or warnings found in this GitLab CI config.' });
  }

  return issues;
}

const LEVEL_CONFIG: Record<LintLevel, { icon: string; bg: string; border: string; text: string; label: string }> = {
  error: { icon: '✖', bg: 'bg-red-500/10', border: 'border-red-500/40', text: 'text-red-400', label: 'Error' },
  warning: { icon: '⚠', bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', label: 'Warning' },
  info: { icon: 'ℹ', bg: 'bg-blue-500/10', border: 'border-blue-500/40', text: 'text-blue-400', label: 'Info' },
};

export default function CiPipelineLinter() {
  const [platform, setPlatform] = useState<CiPlatform>('github-actions');
  const [yaml, setYaml] = useState(GITHUB_SAMPLE);
  const [issues, setIssues] = useState<LintIssue[] | null>(null);
  const [hasRun, setHasRun] = useState(false);

  const lint = useCallback(() => {
    const result = platform === 'github-actions' ? lintGitHubActions(yaml) : lintGitLabCI(yaml);
    setIssues(result);
    setHasRun(true);
  }, [platform, yaml]);

  const loadSample = useCallback(() => {
    setYaml(platform === 'github-actions' ? GITHUB_SAMPLE : GITLAB_SAMPLE);
    setIssues(null);
    setHasRun(false);
  }, [platform]);

  const handlePlatformChange = useCallback((p: CiPlatform) => {
    setPlatform(p);
    setYaml(p === 'github-actions' ? GITHUB_SAMPLE : GITLAB_SAMPLE);
    setIssues(null);
    setHasRun(false);
  }, []);

  const errorCount = issues?.filter(i => i.level === 'error').length ?? 0;
  const warnCount = issues?.filter(i => i.level === 'warning').length ?? 0;
  const infoCount = issues?.filter(i => i.level === 'info').length ?? 0;

  return (
    <div class="space-y-4">
      {/* Platform selector */}
      <div class="flex gap-2">
        {(['github-actions', 'gitlab-ci'] as CiPlatform[]).map(p => (
          <button
            key={p}
            onClick={() => handlePlatformChange(p)}
            class={`px-4 py-2 text-sm rounded transition-colors ${platform === p ? 'bg-accent text-white' : 'bg-surface border border-border text-text-muted hover:border-accent'}`}
          >
            {p === 'github-actions' ? '⚡ GitHub Actions' : '🦊 GitLab CI'}
          </button>
        ))}
        <button
          onClick={loadSample}
          class="ml-auto px-3 py-2 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
      </div>

      {/* YAML editor */}
      <div>
        <label class="text-sm font-medium text-text mb-2 block">
          {platform === 'github-actions' ? '.github/workflows/*.yml' : '.gitlab-ci.yml'}
        </label>
        <textarea
          value={yaml}
          onInput={e => { setYaml((e.target as HTMLTextAreaElement).value); setHasRun(false); setIssues(null); }}
          placeholder={`Paste your ${platform === 'github-actions' ? 'GitHub Actions' : 'GitLab CI'} YAML here...`}
          class="w-full h-72 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
          spellcheck={false}
        />
      </div>

      <button
        onClick={lint}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Lint Pipeline
      </button>

      {/* Results */}
      {hasRun && issues && (
        <div class="space-y-3">
          {/* Summary */}
          <div class="flex items-center gap-4 text-sm p-3 bg-surface border border-border rounded-lg">
            <span class="font-medium text-text">Results:</span>
            <span class="flex items-center gap-1 text-red-400">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>
            <span class="flex items-center gap-1 text-yellow-400">{warnCount} warning{warnCount !== 1 ? 's' : ''}</span>
            <span class="flex items-center gap-1 text-blue-400">{infoCount} suggestion{infoCount !== 1 ? 's' : ''}</span>
          </div>

          {/* Issues list */}
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const cfg = LEVEL_CONFIG[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <span class={`text-sm font-bold shrink-0 mt-0.5 ${cfg.text}`}>{cfg.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                    {issue.doc && (
                      <a href={issue.doc} target="_blank" rel="noopener noreferrer" class="text-xs text-accent hover:underline mt-1 block">
                        Docs ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Checks for hardcoded secrets, missing required fields, deprecated syntax, mutable image tags, and security best practices. Runs entirely in your browser — nothing is sent to any server.
      </p>
    </div>
  );
}
