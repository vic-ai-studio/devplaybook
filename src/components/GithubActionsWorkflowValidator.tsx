import { useState } from 'preact/hooks';

const SAMPLE_WORKFLOW = `name: Deploy

on:
  push:
    branches: [main]
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build
      - name: Upload artifact
        uses: actions/upload-artifact@v4
        with:
          name: dist
          path: dist/

  deploy:
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - name: Download artifact
        uses: actions/download-artifact@v4
        with:
          name: dist
      - name: Deploy
        run: echo "Deploying..."
`;

type ValidationResult = {
  level: 'error' | 'warning' | 'info' | 'success';
  category: string;
  message: string;
  line?: number;
  suggestion?: string;
};

function validateWorkflow(yaml: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const lines = yaml.split('\n');

  if (!yaml.trim()) {
    results.push({ level: 'error', category: 'Structure', message: 'Empty workflow file.' });
    return results;
  }

  // --- Tab characters ---
  lines.forEach((line, idx) => {
    if (line.includes('\t')) {
      results.push({
        level: 'error',
        category: 'YAML Syntax',
        message: `Tab character found on line ${idx + 1}. YAML requires spaces.`,
        line: idx + 1,
        suggestion: 'Replace all tabs with 2-space indentation.',
      });
    }
  });

  // --- Required top-level keys ---
  const hasName = /^name\s*:/m.test(yaml);
  const hasOn = /^on\s*:/m.test(yaml);
  const hasJobs = /^jobs\s*:/m.test(yaml);

  if (!hasName) {
    results.push({
      level: 'warning',
      category: 'Best Practice',
      message: 'No "name:" field at the top level.',
      suggestion: 'Add a descriptive name: e.g., `name: CI Pipeline`. This appears in the GitHub Actions UI.',
    });
  }

  if (!hasOn) {
    results.push({
      level: 'error',
      category: 'Structure',
      message: 'Missing required "on:" trigger block.',
      suggestion: 'Add at minimum: `on: push` or `on: [push, pull_request]`.',
    });
  }

  if (!hasJobs) {
    results.push({
      level: 'error',
      category: 'Structure',
      message: 'Missing required "jobs:" block. Without jobs, the workflow does nothing.',
      suggestion: 'Add at least one job under `jobs:`. Each job needs `runs-on` and `steps`.',
    });
  }

  // --- Trigger event validation ---
  const VALID_EVENTS = new Set([
    'push', 'pull_request', 'pull_request_target', 'schedule', 'workflow_dispatch',
    'workflow_call', 'workflow_run', 'release', 'issues', 'issue_comment',
    'create', 'delete', 'fork', 'gollum', 'label', 'milestone', 'page_build',
    'public', 'registry_package', 'repository_dispatch', 'status', 'watch',
    'deployment', 'deployment_status', 'check_run', 'check_suite',
    'discussion', 'discussion_comment', 'merge_group',
  ]);

  if (hasOn) {
    const onIdx = lines.findIndex(l => /^on\s*:/.test(l));
    // Gather on block
    let i = onIdx + 1;
    const onBlock: string[] = [];
    while (i < lines.length && (lines[i].startsWith('  ') || lines[i].trim() === '')) {
      onBlock.push(lines[i]);
      i++;
    }
    const inlineMatch = lines[onIdx].match(/^on\s*:\s*(.+)/);
    const combined = (inlineMatch ? inlineMatch[1] + '\n' : '') + onBlock.join('\n');

    // Extract event names (top-level keys of on block, or inline list values)
    const inlineList = combined.match(/^\[(.+)\]/);
    if (inlineList) {
      const events = inlineList[1].split(',').map(e => e.trim());
      events.forEach(evt => {
        if (evt && !VALID_EVENTS.has(evt)) {
          results.push({
            level: 'error',
            category: 'Trigger Events',
            message: `Unknown trigger event: "${evt}".`,
            suggestion: `Valid events include: push, pull_request, workflow_dispatch, schedule, release, issues, etc.`,
          });
        }
      });
    } else {
      const eventKeys = combined.matchAll(/^  ([a-z_]+)\s*:/gm);
      for (const match of eventKeys) {
        if (!VALID_EVENTS.has(match[1])) {
          results.push({
            level: 'error',
            category: 'Trigger Events',
            message: `Unknown trigger event: "${match[1]}".`,
            suggestion: `Check GitHub docs for valid event names (push, pull_request, schedule, etc.)`,
          });
        }
      }
      // Inline single event: "on: push"
      if (inlineMatch && inlineMatch[1] && !inlineMatch[1].startsWith('{') && !inlineMatch[1].startsWith('[')) {
        const singleEvt = inlineMatch[1].trim();
        if (singleEvt && !VALID_EVENTS.has(singleEvt)) {
          results.push({
            level: 'error',
            category: 'Trigger Events',
            message: `Unknown trigger event: "${singleEvt}".`,
            suggestion: 'Check valid GitHub Actions trigger events.',
          });
        }
      }
    }
  }

  // --- Jobs structure ---
  if (hasJobs) {
    const jobsIdx = lines.findIndex(l => /^jobs\s*:/.test(l));

    // Find all job IDs (2-space indented keys under jobs:)
    const jobIds: string[] = [];
    for (let j = jobsIdx + 1; j < lines.length; j++) {
      const jobMatch = lines[j].match(/^  ([a-zA-Z0-9_-]+)\s*:/);
      if (jobMatch) {
        jobIds.push(jobMatch[1]);
      }
    }

    if (jobIds.length === 0) {
      results.push({
        level: 'error',
        category: 'Jobs',
        message: 'No jobs defined under the "jobs:" block.',
        suggestion: 'Add at least one job with an id, runs-on, and steps.',
      });
    }

    // Check each job for required fields
    jobIds.forEach(jobId => {
      const jobStart = lines.findIndex(l => new RegExp(`^  ${jobId}\\s*:`).test(l));
      if (jobStart === -1) return;

      // Gather job body (4-space indented)
      const jobLines: string[] = [];
      for (let k = jobStart + 1; k < lines.length; k++) {
        if (/^  \S/.test(lines[k]) && !lines[k].startsWith('    ')) break;
        jobLines.push(lines[k]);
      }
      const jobBody = jobLines.join('\n');

      if (!/runs-on\s*:/.test(jobBody)) {
        results.push({
          level: 'error',
          category: 'Jobs',
          message: `Job "${jobId}" is missing "runs-on:".`,
          suggestion: 'Add runs-on: ubuntu-latest (or windows-latest / macos-latest).',
        });
      }

      if (!/steps\s*:/.test(jobBody)) {
        results.push({
          level: 'error',
          category: 'Jobs',
          message: `Job "${jobId}" is missing "steps:".`,
          suggestion: 'Every job needs a steps: block with at least one step.',
        });
      }

      // needs: reference check
      const needsMatch = jobBody.match(/needs\s*:\s*\[?([^\]\n]+)\]?/);
      if (needsMatch) {
        const needed = needsMatch[1].split(',').map(n => n.trim().replace(/['"]/g, ''));
        needed.forEach(dep => {
          if (dep && !jobIds.includes(dep)) {
            results.push({
              level: 'error',
              category: 'Job Dependencies',
              message: `Job "${jobId}" depends on "${dep}" via needs:, but "${dep}" is not defined.`,
              suggestion: `Fix the job name or add the missing job "${dep}" to your workflow.`,
            });
          }
        });
      }

      // Circular dependency check (simple: job needs itself)
      if (new RegExp(`needs\\s*:.*\\b${jobId}\\b`).test(jobBody)) {
        results.push({
          level: 'error',
          category: 'Job Dependencies',
          message: `Job "${jobId}" depends on itself — circular dependency.`,
          suggestion: 'Remove the self-reference from needs:.',
        });
      }
    });

    // --- Steps validation ---
    const stepLines = lines.filter(l => /^      - /.test(l) || /^    - /.test(l));
    let stepCount = 0;

    lines.forEach((line, idx) => {
      // Count uses: and run: steps
      if (/^\s+- uses\s*:/.test(line) || /^\s+- name\s*:/.test(line) || /^\s+- run\s*:/.test(line)) {
        stepCount++;
      }

      // uses: without version pin
      const usesMatch = line.match(/uses\s*:\s*(.+)/);
      if (usesMatch) {
        const actionRef = usesMatch[1].trim();
        if (/\/(master|main|develop|HEAD)$/.test(actionRef)) {
          results.push({
            level: 'warning',
            category: 'Security',
            message: `Action pinned to a mutable branch ref: "${actionRef}" (line ${idx + 1}).`,
            line: idx + 1,
            suggestion: 'Pin to a version tag (e.g., @v4) or commit SHA for reproducibility and security.',
          });
        }
        // Check for unpinned (no @ at all)
        if (!/@/.test(actionRef) && !actionRef.startsWith('.')) {
          results.push({
            level: 'warning',
            category: 'Security',
            message: `Action "${actionRef}" (line ${idx + 1}) has no version pin (@v4, @main, etc.).`,
            line: idx + 1,
            suggestion: 'Always pin actions to a version tag or commit SHA.',
          });
        }
      }

      // Hardcoded secret/token patterns
      if (/(?:GITHUB_TOKEN|token|secret|password|api_key)\s*:\s*[A-Za-z0-9+\/]{20,}/i.test(line)) {
        results.push({
          level: 'error',
          category: 'Security',
          message: `Possible hardcoded secret on line ${idx + 1}.`,
          line: idx + 1,
          suggestion: 'Store secrets in GitHub Settings → Secrets and use ${{ secrets.MY_SECRET }}.',
        });
      }

      // echo of secret
      if (/echo\s+.*\$\{\{\s*secrets\./i.test(line)) {
        results.push({
          level: 'warning',
          category: 'Security',
          message: `Echoing a secret value on line ${idx + 1} — this will be masked in logs but is bad practice.`,
          line: idx + 1,
          suggestion: 'Never echo secrets directly. Remove this echo statement.',
        });
      }
    });
  }

  // --- Pull request target warning ---
  if (/pull_request_target/.test(yaml) && /github\.event\.pull_request\.head\.sha/.test(yaml)) {
    results.push({
      level: 'error',
      category: 'Security',
      message: 'Dangerous combination: pull_request_target with untrusted head SHA.',
      suggestion: 'pull_request_target runs in the context of the base repo with write access. Avoid checking out PR head code in this trigger without careful review.',
    });
  }

  // --- schedule cron validation ---
  const scheduleMatch = yaml.match(/cron\s*:\s*['"]([^'"]+)['"]/g);
  if (scheduleMatch) {
    scheduleMatch.forEach(s => {
      const cronVal = s.match(/cron\s*:\s*['"]([^'"]+)['"]/)?.[1];
      if (cronVal) {
        const parts = cronVal.trim().split(/\s+/);
        if (parts.length !== 5) {
          results.push({
            level: 'error',
            category: 'Schedule',
            message: `Invalid cron expression: "${cronVal}". Cron must have exactly 5 fields.`,
            suggestion: 'Format: "minute hour day-of-month month day-of-week" — e.g., "0 2 * * 1" for every Monday at 2am UTC.',
          });
        }
      }
    });
  }

  // --- Workflow dispatch inputs ---
  if (/workflow_dispatch/.test(yaml) && !/inputs\s*:/.test(yaml)) {
    results.push({
      level: 'info',
      category: 'Best Practice',
      message: 'workflow_dispatch trigger has no inputs defined.',
      suggestion: 'You can add inputs: under workflow_dispatch to allow customization when manually triggering.',
    });
  }

  // --- Add success if no errors ---
  const errorCount = results.filter(r => r.level === 'error').length;
  const warningCount = results.filter(r => r.level === 'warning').length;

  if (errorCount === 0 && warningCount === 0) {
    results.push({
      level: 'success',
      category: 'Validation',
      message: 'Workflow structure looks valid! No errors or warnings found.',
      suggestion: 'Remember to test by pushing to a branch and checking the Actions tab.',
    });
  }

  return results;
}

const levelColors: Record<string, string> = {
  error: 'bg-red-900/30 border-red-500/40 text-red-200',
  warning: 'bg-yellow-900/30 border-yellow-500/40 text-yellow-200',
  info: 'bg-blue-900/30 border-blue-500/40 text-blue-200',
  success: 'bg-green-900/30 border-green-500/40 text-green-200',
};

const levelIcon: Record<string, string> = {
  error: '✗',
  warning: '⚠',
  info: 'ℹ',
  success: '✓',
};

export default function GithubActionsWorkflowValidator() {
  const [yaml, setYaml] = useState(SAMPLE_WORKFLOW);
  const [results, setResults] = useState<ValidationResult[] | null>(null);

  function handleValidate() {
    setResults(validateWorkflow(yaml));
  }

  const errorCount = results?.filter(r => r.level === 'error').length ?? 0;
  const warningCount = results?.filter(r => r.level === 'warning').length ?? 0;
  const infoCount = results?.filter(r => r.level === 'info').length ?? 0;
  const isValid = results !== null && errorCount === 0;

  return (
    <div class="space-y-4">
      <div class="relative">
        <textarea
          class="w-full h-64 font-mono text-sm p-3 rounded-lg bg-bg-secondary border border-border text-text resize-y focus:outline-none focus:border-accent"
          placeholder="Paste your .github/workflows/*.yml content here..."
          value={yaml}
          onInput={(e) => setYaml((e.target as HTMLTextAreaElement).value)}
          spellcheck={false}
        />
        <button
          class="absolute bottom-3 right-3 text-xs text-text-muted hover:text-text bg-bg-secondary px-2 py-1 rounded border border-border"
          onClick={() => { setYaml(SAMPLE_WORKFLOW); setResults(null); }}
        >
          Load sample
        </button>
      </div>

      <button
        class="w-full py-2.5 rounded-lg bg-accent text-white font-semibold hover:bg-accent/90 transition-colors"
        onClick={handleValidate}
      >
        Validate Workflow
      </button>

      {results !== null && (
        <div class="space-y-3">
          {/* Summary bar */}
          <div class={`flex items-center gap-4 p-3 rounded-lg border text-sm font-medium ${isValid ? 'bg-green-900/20 border-green-500/30 text-green-300' : 'bg-red-900/20 border-red-500/30 text-red-300'}`}>
            <span>{isValid ? '✓ Valid workflow' : `✗ ${errorCount} error${errorCount !== 1 ? 's' : ''}`}</span>
            {warningCount > 0 && <span class="text-yellow-300">⚠ {warningCount} warning{warningCount !== 1 ? 's' : ''}</span>}
            {infoCount > 0 && <span class="text-blue-300">ℹ {infoCount} suggestion{infoCount !== 1 ? 's' : ''}</span>}
          </div>

          {/* Results grouped by category */}
          {results.map((r, i) => (
            <div key={i} class={`p-3 rounded-lg border ${levelColors[r.level]}`}>
              <div class="flex items-start gap-2">
                <span class="shrink-0 font-bold mt-0.5">{levelIcon[r.level]}</span>
                <div class="space-y-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="text-xs font-medium opacity-70 bg-white/10 px-1.5 py-0.5 rounded">{r.category}</span>
                    {r.line && <span class="text-xs opacity-60">Line {r.line}</span>}
                  </div>
                  <p class="text-sm">{r.message}</p>
                  {r.suggestion && (
                    <p class="text-xs opacity-80 mt-1">
                      <span class="font-medium">Fix:</span> {r.suggestion}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
