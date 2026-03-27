import { useState } from 'preact/hooks';

type ValidationIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
};

const SAMPLE_WORKFLOW = `name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test
`;

function validateGithubActionsYaml(yaml: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const lines = yaml.split('\n');

  if (!yaml.trim()) {
    issues.push({ level: 'error', message: 'Empty input. Paste a GitHub Actions workflow YAML to validate.' });
    return issues;
  }

  // Tab characters
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({ level: 'error', message: `Tab character on line ${idx + 1}. YAML requires spaces only.`, line: idx + 1 });
    }
  });

  // Required top-level fields
  const hasOn = lines.some(l => l.match(/^on\s*:/));
  const hasJobs = lines.some(l => l.match(/^jobs\s*:/));
  const hasName = lines.some(l => l.match(/^name\s*:/));

  if (!hasOn) issues.push({ level: 'error', message: 'Missing required field "on:". Define when this workflow triggers (push, pull_request, schedule, etc.).' });
  if (!hasJobs) issues.push({ level: 'error', message: 'Missing required field "jobs:". Workflows need at least one job.' });
  if (!hasName) issues.push({ level: 'warning', message: 'No "name:" field. Adding a name makes the workflow easier to identify in the Actions tab.' });

  // Check for runs-on
  const hasRunsOn = lines.some(l => l.trim().match(/^runs-on\s*:/));
  if (hasJobs && !hasRunsOn) {
    issues.push({ level: 'error', message: 'No "runs-on:" found. Each job must specify a runner (e.g. ubuntu-latest, windows-latest, macos-latest).' });
  }

  // Unpinned action versions (using @main, @master, or no @version)
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('uses:')) {
      const action = trimmed.replace(/^uses:\s*/, '').trim();
      if (action.includes('@main') || action.includes('@master')) {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Action "${action}" uses a mutable branch ref (@main/@master). Pin to a specific version tag or commit SHA for reproducibility.`, line: idx + 1 });
      } else if (!action.includes('@') && !action.startsWith('.')) {
        issues.push({ level: 'warning', message: `Line ${idx + 1}: Action "${action}" has no version pin. Add @vX.Y.Z or a commit SHA.`, line: idx + 1 });
      }
    }
  });

  // Hardcoded secrets (common patterns)
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (trimmed.match(/:\s*['"]?(sk-|ghp_|gho_|glpat-|AKIA[0-9A-Z]{16})/)) {
      issues.push({ level: 'error', message: `Line ${idx + 1}: Possible hardcoded secret detected. Use \${{ secrets.SECRET_NAME }} instead.`, line: idx + 1 });
    }
    if (trimmed.match(/password\s*:\s*['"][^$]/i) || trimmed.match(/token\s*:\s*['"][^$]/i)) {
      issues.push({ level: 'warning', message: `Line ${idx + 1}: Possible hardcoded credential. Store sensitive values in repository secrets and reference with \${{ secrets.NAME }}.`, line: idx + 1 });
    }
  });

  // Missing checkout step
  const hasCheckout = yaml.includes('actions/checkout');
  if (hasJobs && !hasCheckout) {
    issues.push({ level: 'warning', message: 'No "actions/checkout" step found. Most workflows need to check out the repository code first.' });
  }

  // Missing steps under a job
  const jobsIdx = lines.findIndex(l => l.match(/^jobs\s*:/));
  const hasSteps = lines.some(l => l.trim().match(/^steps\s*:/));
  if (jobsIdx !== -1 && !hasSteps) {
    issues.push({ level: 'error', message: 'No "steps:" found under any job. Each job must have at least one step.' });
  }

  // Check for continue-on-error: true on all steps (masks failures)
  const continueOnErrorAll = lines.filter(l => l.trim().match(/^continue-on-error\s*:\s*true/)).length;
  if (continueOnErrorAll > 2) {
    issues.push({ level: 'warning', message: 'Multiple steps use "continue-on-error: true". This can mask failures and make it hard to detect broken builds.' });
  }

  // Workflow permissions — missing permissions block
  const hasPermissions = lines.some(l => l.match(/^permissions\s*:/));
  if (!hasPermissions) {
    issues.push({ level: 'info', message: 'No "permissions:" block. Consider adding minimal permissions (e.g. contents: read) to follow least-privilege principles.' });
  }

  // Concurrency not set
  const hasConcurrency = lines.some(l => l.match(/^concurrency\s*:/));
  if (!hasConcurrency) {
    issues.push({ level: 'info', message: 'No "concurrency:" group defined. Adding concurrency prevents overlapping runs on the same branch and reduces wasted CI minutes.' });
  }

  // on: push without branch filter
  if (hasOn) {
    const onIdx = lines.findIndex(l => l.match(/^on\s*:/));
    const onBlock = lines.slice(onIdx, onIdx + 10).join('\n');
    if (onBlock.includes('push:') && !onBlock.includes('branches:') && !onBlock.includes('tags:') && !onBlock.includes('paths:')) {
      issues.push({ level: 'info', message: '"on: push" has no branch/tag/path filter. This triggers the workflow on every push to any branch.' });
    }
  }

  if (issues.length === 0) {
    issues.push({ level: 'info', message: 'No issues detected. Your GitHub Actions workflow looks valid!' });
  }

  return issues;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400' },
};

export default function GithubActionsValidator() {
  const [input, setInput] = useState(SAMPLE_WORKFLOW);
  const [issues, setIssues] = useState<ValidationIssue[]>(() => validateGithubActionsYaml(SAMPLE_WORKFLOW));
  const [validated, setValidated] = useState(true);

  const handleValidate = () => {
    setIssues(validateGithubActionsYaml(input));
    setValidated(true);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">GitHub Actions workflow YAML</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_WORKFLOW); setIssues(validateGithubActionsYaml(SAMPLE_WORKFLOW)); setValidated(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setIssues([]); setValidated(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your GitHub Actions workflow YAML here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleValidate} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Validate Workflow
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {errors.length === 0 && warnings.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!validated && input.trim() && (
        <p class="text-xs text-text-muted text-center">Click Validate Workflow to check your YAML</p>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Required fields: on, jobs, runs-on, steps</li>
          <li>Unpinned action versions (@main/@master or no tag)</li>
          <li>Hardcoded secrets and credentials</li>
          <li>Missing actions/checkout step</li>
          <li>Workflow permissions (least-privilege)</li>
          <li>Concurrency group for overlapping runs</li>
          <li>Push trigger without branch filter</li>
          <li>Tab characters (not valid in YAML)</li>
        </ul>
      </div>
    </div>
  );
}
