import { useState } from 'preact/hooks';

interface LintIssue {
  line: number;
  col?: number;
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  fix?: string;
}

interface LintResult {
  issues: LintIssue[];
  shellType: string;
  lineCount: number;
}

const EXAMPLE_SCRIPT = `#!/bin/bash
# Example script with common issues

FILES=$(ls /tmp/*.log)

for file in $FILES; do
  echo Processing $file
  cat $file | grep ERROR | wc -l
done

if [ $1 == "clean" ]; then
  rm -rf /tmp/logs
fi

function backup {
  cp $1 $1.bak
  echo Done
}

backup /etc/config`;

function detectShellType(code: string): string {
  const shebang = code.split('\n')[0];
  if (shebang.includes('bash')) return 'bash';
  if (shebang.includes('zsh')) return 'zsh';
  if (shebang.includes('/sh')) return 'sh (POSIX)';
  return 'bash (assumed)';
}

function lintScript(code: string, _shell: string): LintIssue[] {
  const issues: LintIssue[] = [];
  const lines = code.split('\n');

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine;
    const trimmed = line.trim();

    // Skip comments and empty
    if (trimmed.startsWith('#') || trimmed === '') return;

    // SC2006: Use $() instead of backticks
    if (/`[^`]+`/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        code: 'SC2006',
        message: 'Use $(...) instead of legacy backtick command substitution',
        fix: 'Replace `cmd` with $(cmd)',
      });
    }

    // SC2012: Use find instead of ls
    if (/\$\(ls\s|=\s*\$\(ls\s|=\$(ls\s)/.test(line) || /\bls\b.*\*/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        code: 'SC2012',
        message: 'Use find instead of ls to parse filenames. ls output is not safe for scripting.',
        fix: 'Use: find /path -name "*.log" instead of ls /path/*.log',
      });
    }

    // SC2086: Double-quote variables to prevent word splitting
    const unquotedVarPattern = /(?<!["])(\$(?!\{)[A-Za-z_][A-Za-z0-9_]*)(?!\w)(?!")/g;
    let match;
    while ((match = unquotedVarPattern.exec(line)) !== null) {
      // Skip inside double-quotes
      const before = line.slice(0, match.index);
      const quoteCount = (before.match(/"/g) || []).length;
      if (quoteCount % 2 === 0) {
        issues.push({
          line: lineNum,
          col: match.index + 1,
          severity: 'warning',
          code: 'SC2086',
          message: `Unquoted variable ${match[1]}: may cause word splitting or globbing`,
          fix: `Use "${match[1]}" instead of ${match[1]}`,
        });
        break; // one per line to avoid noise
      }
    }

    // SC2046: Quote command substitution
    if (/=\s*\$\([^)]+\)(?!")/.test(line) || /for\s+\w+\s+in\s+\$\(/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'info',
        code: 'SC2046',
        message: 'Quote command substitution to prevent word splitting',
        fix: 'Use "$(cmd)" instead of $(cmd) in assignments and loops',
      });
    }

    // SC2010: Avoid ls | grep
    if (/ls.*\|.*grep/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        code: 'SC2010',
        message: 'Avoid ls | grep. Use find -name or glob patterns instead.',
        fix: 'find . -name "pattern"',
      });
    }

    // USELESS_CAT: Useless use of cat
    if (/\bcat\b[^|]+\|/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'info',
        code: 'SC2002',
        message: 'Useless use of cat — pipe directly: grep "pattern" file',
        fix: 'grep PATTERN file instead of cat file | grep PATTERN',
      });
    }

    // SC2039: function keyword not POSIX
    if (/^function\s+\w+\s*\{?/.test(trimmed) || /^function\s+\w+\s*\(\)/.test(trimmed)) {
      if (!code.split('\n')[0].includes('bash') && !code.split('\n')[0].includes('zsh')) {
        issues.push({
          line: lineNum,
          severity: 'info',
          code: 'SC2039',
          message: '"function" keyword is not POSIX compliant. Use name() { ... } syntax for /bin/sh scripts.',
          fix: 'Rename: funcname() { ... }',
        });
      }
    }

    // SC2039: == vs = in [ ]
    if (/\[\s+.*==/.test(line) && !/\[\[/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'error',
        code: 'SC2039',
        message: '[ ] uses = for comparison, not ==. Use [[ ]] for == or change to single =.',
        fix: 'Use [ "$var" = "value" ] or [[ "$var" == "value" ]]',
      });
    }

    // Missing error handling: rm -rf
    if (/rm\s+-rf/.test(line) && !/#.*rm/.test(line)) {
      issues.push({
        line: lineNum,
        severity: 'warning',
        code: 'DANGEROUS',
        message: 'Potentially dangerous rm -rf — ensure variable is quoted and not empty',
        fix: 'Add guards: [ -n "$dir" ] && rm -rf "$dir"',
      });
    }

    // No set -e at top
    if (lineNum <= 5 && /^set\s+-e/.test(trimmed)) {
      // good, found it
    }
  });

  // Check for missing set -e / set -u
  const hasSetE = lines.some(l => /^\s*set\s+.*-[a-z]*e/.test(l));
  const hasSetU = lines.some(l => /^\s*set\s+.*-[a-z]*u/.test(l));
  const hasShebang = lines[0]?.startsWith('#!');

  if (hasShebang && !hasSetE) {
    issues.push({
      line: 1,
      severity: 'info',
      code: 'BEST_PRACTICE',
      message: 'Consider adding "set -e" at the top to exit on any error',
      fix: 'Add: set -euo pipefail after the shebang',
    });
  }

  if (hasShebang && !hasSetU) {
    issues.push({
      line: 1,
      severity: 'info',
      code: 'BEST_PRACTICE',
      message: 'Consider adding "set -u" to catch unbound variable references',
      fix: 'Add: set -u or set -euo pipefail',
    });
  }

  // Sort by line
  issues.sort((a, b) => a.line - b.line);
  return issues;
}

const SEV_COLOR = {
  error: 'text-red-400 bg-red-500/10 border-red-500/30',
  warning: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  info: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
};

const SEV_BADGE = {
  error: 'bg-red-500/20 text-red-400',
  warning: 'bg-yellow-500/20 text-yellow-400',
  info: 'bg-blue-500/20 text-blue-400',
};

const SEV_ICON = { error: '✕', warning: '⚠', info: 'ℹ' };

export default function ShellScriptLinter() {
  const [code, setCode] = useState('');
  const [result, setResult] = useState<LintResult | null>(null);
  const [activeShell, setActiveShell] = useState('bash');

  const handleLint = () => {
    if (!code.trim()) return;
    const shellType = detectShellType(code);
    const issues = lintScript(code, activeShell);
    setResult({ issues, shellType, lineCount: code.split('\n').length });
  };

  const handleExample = () => {
    setCode(EXAMPLE_SCRIPT);
    setResult(null);
  };

  const lineNums = (code: string) =>
    code.split('\n').map((l, i) => ({ num: i + 1, text: l }));

  const issuesByLine = result
    ? result.issues.reduce((acc: Record<number, LintIssue[]>, issue) => {
        if (!acc[issue.line]) acc[issue.line] = [];
        acc[issue.line].push(issue);
        return acc;
      }, {})
    : {};

  const counts = result
    ? {
        errors: result.issues.filter(i => i.severity === 'error').length,
        warnings: result.issues.filter(i => i.severity === 'warning').length,
        info: result.issues.filter(i => i.severity === 'info').length,
      }
    : null;

  return (
    <div class="space-y-4">
      {/* Shell selector */}
      <div class="flex items-center gap-4">
        <span class="text-sm text-text-muted">Shell target:</span>
        {['bash', 'sh', 'zsh'].map(s => (
          <button
            key={s}
            onClick={() => setActiveShell(s)}
            class={`px-3 py-1 text-sm rounded-full border transition-colors ${activeShell === s ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-muted'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input + line-annotated view */}
      <div class="relative">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">Paste your shell script</label>
          <button onClick={handleExample} class="text-xs text-accent hover:underline">Load example</button>
        </div>
        <textarea
          class="w-full h-56 bg-surface border border-border rounded-lg p-3 text-sm font-mono resize-y focus:outline-none focus:border-accent"
          placeholder="#!/bin/bash&#10;echo Hello, world!"
          value={code}
          onInput={e => { setCode((e.target as HTMLTextAreaElement).value); setResult(null); }}
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleLint}
        disabled={!code.trim()}
        class="px-5 py-2 bg-accent hover:bg-accent/90 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors"
      >
        Lint Script
      </button>

      {result && (
        <div class="space-y-4">
          {/* Summary bar */}
          <div class="flex items-center gap-4 flex-wrap bg-surface border border-border rounded-lg p-3">
            <span class="text-sm text-text-muted">Shell detected: <strong class="text-text">{result.shellType}</strong></span>
            <span class="text-sm text-text-muted">{result.lineCount} lines</span>
            <span class={`text-sm font-semibold px-2 py-0.5 rounded ${counts!.errors > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
              {counts!.errors} errors
            </span>
            <span class="text-sm font-semibold px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-400">
              {counts!.warnings} warnings
            </span>
            <span class="text-sm font-semibold px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">
              {counts!.info} suggestions
            </span>
          </div>

          {result.issues.length === 0 && (
            <div class="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-sm">
              ✓ No issues found! Script looks clean.
            </div>
          )}

          {/* Annotated code */}
          {result.issues.length > 0 && (
            <div class="bg-surface border border-border rounded-lg overflow-hidden">
              <div class="text-xs font-semibold text-text-muted px-3 py-2 border-b border-border">Annotated Source</div>
              <div class="overflow-auto max-h-96 font-mono text-xs">
                {lineNums(code).map(({ num, text }) => (
                  <div key={num}>
                    <div class={`flex gap-2 px-3 py-0.5 ${issuesByLine[num] ? 'bg-yellow-500/5' : ''}`}>
                      <span class="text-text-muted w-6 text-right shrink-0 select-none">{num}</span>
                      <span class="text-text whitespace-pre">{text || ' '}</span>
                    </div>
                    {issuesByLine[num]?.map((issue, i) => (
                      <div key={i} class={`flex gap-2 px-3 py-1 border-l-2 ${issue.severity === 'error' ? 'border-red-500 bg-red-500/5' : issue.severity === 'warning' ? 'border-yellow-500 bg-yellow-500/5' : 'border-blue-500 bg-blue-500/5'}`}>
                        <span class="w-6 shrink-0" />
                        <div class="flex-1 space-y-0.5">
                          <div class="flex items-center gap-2">
                            <span class={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${SEV_BADGE[issue.severity]}`}>{issue.severity.toUpperCase()}</span>
                            <span class="text-[10px] text-text-muted font-mono">{issue.code}</span>
                          </div>
                          <p class={`${SEV_COLOR[issue.severity].split(' ')[0]} text-xs`}>{issue.message}</p>
                          {issue.fix && <p class="text-text-muted text-[11px]">Fix: {issue.fix}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Issues list */}
          <div class="space-y-2">
            <h3 class="text-sm font-semibold">All Issues ({result.issues.length})</h3>
            {result.issues.map((issue, i) => (
              <div key={i} class={`border rounded-lg p-3 flex gap-3 ${SEV_COLOR[issue.severity]}`}>
                <span class="text-sm font-bold mt-0.5 shrink-0">{SEV_ICON[issue.severity]}</span>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap mb-0.5">
                    <span class={`text-[10px] font-bold px-1.5 py-0.5 rounded ${SEV_BADGE[issue.severity]}`}>{issue.code}</span>
                    <span class="text-xs text-text-muted">line {issue.line}{issue.col ? `, col ${issue.col}` : ''}</span>
                  </div>
                  <p class="text-sm">{issue.message}</p>
                  {issue.fix && <p class="text-xs text-text-muted mt-1">💡 {issue.fix}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
