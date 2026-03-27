import { useState } from 'preact/hooks';

type LintIssue = {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
  fix?: string;
};

const SAMPLE_YAML = `name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  build:
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/
`;

const VALID_EVENTS = new Set([
  'push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_dispatch',
  'workflow_call', 'workflow_run', 'release', 'issues', 'issue_comment',
  'create', 'delete', 'fork', 'gollum', 'label', 'milestone', 'page_build',
  'project', 'public', 'registry_package', 'repository_dispatch', 'status',
  'watch', 'deployment', 'deployment_status', 'check_run', 'check_suite',
  'discussion', 'discussion_comment', 'merge_group',
]);

function lintGithubActions(yaml: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = yaml.split('\n');

  // Tab check
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      issues.push({
        level: 'error',
        message: `Tab character on line ${idx + 1}. YAML requires spaces, not tabs.`,
        line: idx + 1,
        fix: 'Replace tabs with spaces (2-space indent recommended)',
      });
    }
  });

  // Check for "on:" key
  const onLineIdx = lines.findIndex(l => l.match(/^on\s*:/));
  if (onLineIdx === -1) {
    issues.push({
      level: 'error',
      message: 'Missing "on:" trigger block. GitHub Actions workflows require at least one trigger event.',
      fix: 'Add "on: push" or "on: [push, pull_request]" at the top level.',
    });
  } else {
    // Check event names
    const onBlock: string[] = [];
    let i = onLineIdx + 1;
    while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
      onBlock.push(lines[i]);
      i++;
    }
    // Also check inline: "on: push" or "on: [push, pull_request]"
    const onLine = lines[onLineIdx];
    const inlineMatch = onLine.match(/^on\s*:\s*(.+)/);
    const allText = inlineMatch ? inlineMatch[1] + '\n' + onBlock.join('\n') : onBlock.join('\n');
    const eventMatches = allText.matchAll(/^\s*([a-z_]+)\s*:/gm);
    for (const match of eventMatches) {
      const evt = match[1];
      if (evt && !VALID_EVENTS.has(evt)) {
        issues.push({
          level: 'error',
          message: `Unknown trigger event "${evt}". Check GitHub docs for valid event names.`,
          fix: `Valid events include: push, pull_request, schedule, workflow_dispatch, release, issues, etc.`,
        });
      }
    }
  }

  // Check for jobs: key
  const jobsLineIdx = lines.findIndex(l => l.match(/^jobs\s*:/));
  if (jobsLineIdx === -1) {
    issues.push({
      level: 'error',
      message: 'Missing "jobs:" block. Workflows must define at least one job.',
    });
    return issues;
  }

  // Extract jobs
  const jobNames: string[] = [];
  const jobNeedsMap: Map<string, string[]> = new Map();
  let currentJob = '';
  let inJobs = false;

  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    if (line.match(/^jobs\s*:/)) { inJobs = true; return; }
    if (inJobs && line.match(/^[a-zA-Z]/)) { inJobs = false; }

    if (inJobs && line.match(/^  [a-zA-Z_][a-zA-Z0-9_-]*\s*:/)) {
      currentJob = line.trim().replace(':', '');
      jobNames.push(currentJob);
      jobNeedsMap.set(currentJob, []);
    }

    if (inJobs && currentJob) {
      // runs-on check
      if (line.trim().startsWith('runs-on:')) {
        const runner = line.trim().replace('runs-on:', '').trim().replace(/['"]/g, '');
        if (!runner.startsWith('ubuntu') && !runner.startsWith('windows') && !runner.startsWith('macos') && !runner.startsWith('self-hosted') && !runner.startsWith('${{')) {
          issues.push({
            level: 'warning',
            message: `Job "${currentJob}": unusual runs-on value "${runner}". Common values: ubuntu-latest, windows-latest, macos-latest.`,
            line: lineNum,
          });
        }
      }

      // needs: references
      const needsMatch = line.trim().match(/^needs\s*:\s*(.+)/);
      if (needsMatch) {
        const needsVal = needsMatch[1].replace(/[\[\]'"]/g, '').split(',').map(s => s.trim()).filter(Boolean);
        jobNeedsMap.set(currentJob, needsVal);
      }
    }
  });

  // Validate needs references
  jobNeedsMap.forEach((needs, job) => {
    needs.forEach(dep => {
      if (!jobNames.includes(dep)) {
        issues.push({
          level: 'error',
          message: `Job "${job}" needs "${dep}" which is not defined in this workflow.`,
          fix: `Define a job named "${dep}" or fix the needs reference.`,
        });
      }
      if (dep === job) {
        issues.push({
          level: 'error',
          message: `Job "${job}" has a circular dependency on itself via needs.`,
        });
      }
    });
  });

  // Secrets usage without env context
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    // Check for ${{ secrets.X }} in env/with blocks
    const secretRef = line.match(/\$\{\{\s*secrets\.([A-Z0-9_]+)\s*\}\}/g);
    if (secretRef) {
      secretRef.forEach(ref => {
        // This is fine — just make sure it's not in a run: echo directly exposed
        if (line.trim().startsWith('run:') && line.includes('echo') && line.includes('secrets.')) {
          issues.push({
            level: 'warning',
            message: `Line ${lineNum}: Printing secret in run step may expose it in logs. Avoid echoing secrets directly.`,
            line: lineNum,
          });
        }
      });
    }

    // Hardcoded tokens
    if (line.match(/token\s*:\s*[a-zA-Z0-9_]{20,}/) && !line.includes('${{') && !line.includes('#')) {
      issues.push({
        level: 'error',
        message: `Line ${lineNum}: Possible hardcoded token value detected. Use \${{ secrets.TOKEN_NAME }} instead.`,
        line: lineNum,
        fix: 'Move the token to GitHub Secrets and reference with ${{ secrets.YOUR_SECRET }}',
      });
    }
  });

  // actions/ pinned versions check
  lines.forEach((line, idx) => {
    const lineNum = idx + 1;
    const usesMatch = line.trim().match(/^-?\s*uses:\s*([^\s#]+)/);
    if (usesMatch) {
      const action = usesMatch[1];
      if (action.includes('@')) {
        const [, ref] = action.split('@');
        // SHA pinning is safest, warn about branch refs
        if (ref === 'main' || ref === 'master' || ref === 'latest') {
          issues.push({
            level: 'warning',
            message: `Line ${lineNum}: Action "${action}" is pinned to branch "${ref}". For security and reproducibility, pin to a version tag (e.g. @v4) or a commit SHA.`,
            line: lineNum,
          });
        }
      } else {
        issues.push({
          level: 'warning',
          message: `Line ${lineNum}: Action "${action}" has no version pin. Add @v4 or a commit SHA to prevent unexpected breakage.`,
          line: lineNum,
        });
      }
    }
  });

  // Check for workflow_dispatch without inputs (info)
  const hasWorkflowDispatch = yaml.includes('workflow_dispatch');
  if (hasWorkflowDispatch && !yaml.includes('inputs:')) {
    issues.push({
      level: 'info',
      message: 'workflow_dispatch has no inputs defined. Consider adding inputs to allow parameterized manual runs.',
    });
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

export default function GithubActionsLinter() {
  const [input, setInput] = useState(SAMPLE_YAML);
  const [issues, setIssues] = useState<LintIssue[]>(() => lintGithubActions(SAMPLE_YAML));
  const [validated, setValidated] = useState(true);

  const handleLint = () => {
    setIssues(lintGithubActions(input));
    setValidated(true);
  };

  const handleLoad = () => {
    setInput(SAMPLE_YAML);
    setIssues(lintGithubActions(SAMPLE_YAML));
    setValidated(true);
  };

  const handleClear = () => {
    setInput('');
    setIssues([]);
    setValidated(false);
  };

  const errors = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');

  return (
    <div class="space-y-4">
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">.github/workflows/workflow.yml</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setValidated(false); }}
          rows={20}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your GitHub Actions YAML workflow here..."
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleLint}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Lint Workflow
      </button>

      {validated && issues.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>
            )}
            {warnings.length > 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>
            )}
            {errors.length === 0 && warnings.length === 0 && (
              <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">Valid</span>
            )}
          </div>
          <div class="space-y-2">
            {issues.map((issue, i) => {
              const style = LEVEL_STYLES[issue.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1">
                    <div class="flex items-center gap-2 mb-0.5">
                      <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                      {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                    </div>
                    <p class="text-sm text-text">{issue.message}</p>
                    {issue.fix && <p class="text-xs text-text-muted mt-1">Fix: {issue.fix}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!validated && input.trim() && (
        <p class="text-xs text-text-muted text-center">Click Lint Workflow to analyze your YAML</p>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Missing <code class="font-mono bg-background px-1 rounded">on:</code> trigger block</li>
          <li>Invalid trigger event names</li>
          <li>Missing <code class="font-mono bg-background px-1 rounded">jobs:</code> block</li>
          <li>Broken <code class="font-mono bg-background px-1 rounded">needs:</code> job references</li>
          <li>Circular job dependencies</li>
          <li>Hardcoded tokens/secrets</li>
          <li>Actions pinned to branch refs (security risk)</li>
          <li>Unusual <code class="font-mono bg-background px-1 rounded">runs-on</code> runner values</li>
          <li>Secrets printed in echo commands</li>
          <li>Tab characters (not allowed in YAML)</li>
        </ul>
      </div>
    </div>
  );
}
