import { useState } from 'preact/hooks';

interface Issue {
  severity: 'error' | 'warning' | 'info';
  line: number | null;
  message: string;
  fix: string;
}

interface AnalysisResult {
  score: number;
  issues: Issue[];
  suggestions: string[];
  optimized: string;
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      class={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${
        copied ? 'bg-green-700 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
      }`}
    >
      {copied ? '✓ Copied' : 'Copy'}
    </button>
  );
}

function analyzeDockerfile(content: string): AnalysisResult {
  const lines = content.split('\n');
  const issues: Issue[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for COPY/ADD before package install (cache invalidation anti-pattern)
  let foundCopyBeforeInstall = false;
  let copyLineIdx = -1;
  let installLineIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('COPY') || line.startsWith('ADD')) {
      if (copyLineIdx === -1) copyLineIdx = i;
    }
    if (
      (line.includes('npm install') || line.includes('npm ci') ||
       line.includes('pip install') || line.includes('yarn install') ||
       line.includes('bundle install') || line.includes('go mod download') ||
       line.includes('cargo build') || line.includes('composer install')) &&
      copyLineIdx !== -1 && copyLineIdx < i
    ) {
      foundCopyBeforeInstall = true;
      installLineIdx = i;
    }
  }
  if (foundCopyBeforeInstall) {
    issues.push({
      severity: 'error',
      line: copyLineIdx + 1,
      message: 'COPY (all files) before dependency install invalidates Docker layer cache on every code change',
      fix: 'Copy only package.json/requirements.txt first, run install, then COPY the rest of your code',
    });
    score -= 25;
  }

  // Check for multi-stage build
  const fromLines = lines.filter(l => l.trim().toUpperCase().startsWith('FROM'));
  if (fromLines.length === 1) {
    const hasCompilerTools = content.includes('gcc') || content.includes('build-essential') ||
      content.includes('go build') || content.includes('cargo build') || content.includes('mvn package') ||
      content.includes('npm run build') || content.includes('tsc ');
    if (hasCompilerTools) {
      issues.push({
        severity: 'warning',
        line: null,
        message: 'Build tools detected but no multi-stage build — final image likely contains unnecessary build dependencies',
        fix: 'Use multi-stage builds: FROM node:20 AS builder ... FROM node:20-slim AS runtime COPY --from=builder',
      });
      score -= 20;
      suggestions.push('Add multi-stage build to reduce final image size');
    }
  } else {
    suggestions.push(`Good: Multi-stage build detected (${fromLines.length} stages)`);
  }

  // Check for latest tag
  const latestTags = lines.filter(l => l.trim().toUpperCase().startsWith('FROM') && l.includes(':latest'));
  if (latestTags.length > 0) {
    issues.push({
      severity: 'warning',
      line: lines.findIndex(l => l.trim().toUpperCase().startsWith('FROM') && l.includes(':latest')) + 1,
      message: 'Using :latest tag is non-deterministic — builds may break when base image updates',
      fix: 'Pin to a specific version: FROM node:20.11-alpine instead of FROM node:latest',
    });
    score -= 10;
  }

  // Check for running as root
  const hasUser = lines.some(l => l.trim().toUpperCase().startsWith('USER') && !l.includes('root'));
  if (!hasUser) {
    issues.push({
      severity: 'warning',
      line: null,
      message: 'No non-root USER directive — container runs as root which is a security risk',
      fix: 'Add: RUN addgroup -S appgroup && adduser -S appuser -G appgroup\nUSER appuser',
    });
    score -= 10;
  } else {
    suggestions.push('Good: Non-root USER configured');
  }

  // Check for .dockerignore recommendation
  if (content.includes('COPY . .') || content.includes('COPY ./ ')) {
    suggestions.push('.dockerignore recommended: COPY . . copies everything including node_modules, .git, .env — add a .dockerignore to exclude them');
    score -= 5;
  }

  // Check for apt-get cleanup
  const hasAptGet = lines.some(l => l.includes('apt-get install'));
  const hasAptClean = lines.some(l => l.includes('apt-get clean') || l.includes('rm -rf /var/lib/apt/lists'));
  if (hasAptGet && !hasAptClean) {
    issues.push({
      severity: 'info',
      line: null,
      message: 'apt-get install without cleanup increases image size',
      fix: 'Add && apt-get clean && rm -rf /var/lib/apt/lists/* after apt-get install in the same RUN layer',
    });
    score -= 5;
  }

  // Check for multiple RUN commands that could be combined
  const runCmds = lines.filter(l => l.trim().startsWith('RUN') && !l.includes('&&'));
  if (runCmds.length > 3) {
    issues.push({
      severity: 'info',
      line: null,
      message: `${runCmds.length} separate RUN instructions create extra layers — combine sequential commands`,
      fix: 'Combine with &&: RUN apt-get update && apt-get install -y curl && apt-get clean',
    });
    score -= 5;
  }

  // HEALTHCHECK
  const hasHealthcheck = lines.some(l => l.trim().toUpperCase().startsWith('HEALTHCHECK'));
  if (!hasHealthcheck) {
    suggestions.push('Consider adding HEALTHCHECK for production containers: HEALTHCHECK --interval=30s CMD curl -f http://localhost:3000/health || exit 1');
  }

  // Generate optimized suggestion
  let optimized = content;
  // If COPY before npm install, rewrite to show correct order (simplified)
  if (foundCopyBeforeInstall && installLineIdx !== -1) {
    optimized = generateOptimizedHint(lines, copyLineIdx, installLineIdx);
  }

  score = Math.max(0, score);

  return { score, issues, suggestions, optimized };
}

function generateOptimizedHint(lines: string[], copyLine: number, installLine: number): string {
  // Show a comment-annotated version with guidance
  const result = [...lines];
  result.splice(copyLine, 0, '# ✅ COPY package files first (for layer cache)');
  return result.join('\n') + '\n\n# 💡 Tip: Move COPY . . to after the dependency install step';
}

const SAMPLE = `FROM node:20

WORKDIR /app

COPY . .

RUN npm install

RUN npm run build

EXPOSE 3000

CMD ["node", "dist/server.js"]
`;

export default function DockerLayerOptimizer() {
  const [dockerfile, setDockerfile] = useState(SAMPLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  function analyze() {
    if (!dockerfile.trim()) return;
    setResult(analyzeDockerfile(dockerfile));
  }

  const severityColor = {
    error: 'text-red-400 border-red-800 bg-red-950/30',
    warning: 'text-yellow-400 border-yellow-800 bg-yellow-950/30',
    info: 'text-blue-400 border-blue-800 bg-blue-950/30',
  };

  const severityIcon = { error: '✗', warning: '⚠', info: 'ℹ' };

  const scoreColor = result
    ? result.score >= 80 ? 'text-green-400' : result.score >= 60 ? 'text-yellow-400' : 'text-red-400'
    : '';

  return (
    <div class="space-y-6">
      <div class="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Paste your Dockerfile</label>
            <button
              onClick={() => { setDockerfile(SAMPLE); setResult(null); }}
              class="text-xs text-text-muted hover:text-text transition-colors"
            >
              Load sample
            </button>
          </div>
          <textarea
            class="w-full h-80 bg-bg-card border border-border rounded-xl p-4 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary"
            value={dockerfile}
            onInput={(e) => setDockerfile((e.target as HTMLTextAreaElement).value)}
            placeholder="FROM node:20&#10;WORKDIR /app&#10;COPY . .&#10;RUN npm install&#10;..."
            spellcheck={false}
          />
          <button
            onClick={analyze}
            class="mt-3 w-full bg-primary hover:bg-primary/90 text-white font-semibold py-2.5 px-4 rounded-lg transition-colors"
          >
            Analyze Dockerfile
          </button>
        </div>

        {/* Results */}
        <div>
          {result && (
            <div class="space-y-4">
              {/* Score */}
              <div class="bg-bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div class="text-sm text-text-muted">Optimization Score</div>
                  <div class={`text-4xl font-bold mt-1 ${scoreColor}`}>{result.score}<span class="text-lg font-normal text-text-muted">/100</span></div>
                </div>
                <div class="text-right text-sm text-text-muted">
                  <div>{result.issues.filter(i => i.severity === 'error').length} errors</div>
                  <div>{result.issues.filter(i => i.severity === 'warning').length} warnings</div>
                  <div>{result.issues.filter(i => i.severity === 'info').length} hints</div>
                </div>
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div class="space-y-2">
                  <div class="text-sm font-medium text-text-muted">Issues Found</div>
                  {result.issues.map((issue, i) => (
                    <div key={i} class={`border rounded-lg p-3 text-sm ${severityColor[issue.severity]}`}>
                      <div class="flex items-start gap-2">
                        <span class="font-bold shrink-0">{severityIcon[issue.severity]}</span>
                        <div class="flex-1">
                          {issue.line && <div class="text-xs opacity-70 mb-0.5">Line {issue.line}</div>}
                          <div class="font-medium">{issue.message}</div>
                          <div class="mt-1 text-xs opacity-80 font-mono whitespace-pre-wrap">{issue.fix}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggestions */}
              {result.suggestions.length > 0 && (
                <div class="space-y-2">
                  <div class="text-sm font-medium text-text-muted">Recommendations</div>
                  {result.suggestions.map((s, i) => (
                    <div key={i} class="bg-bg-card border border-border rounded-lg p-3 text-sm text-text-muted">
                      💡 {s}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {!result && (
            <div class="bg-bg-card border border-border rounded-xl p-6 h-full flex items-center justify-center">
              <div class="text-center text-text-muted">
                <div class="text-4xl mb-3">🐳</div>
                <div class="text-sm">Paste your Dockerfile and click Analyze</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reference */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="text-sm font-semibold text-text mb-3">Layer Cache Quick Reference</div>
        <div class="grid gap-3 sm:grid-cols-2 text-xs font-mono">
          <div>
            <div class="text-red-400 font-semibold mb-1">❌ Anti-pattern (cache busted on every change)</div>
            <pre class="bg-bg p-3 rounded text-text-muted overflow-x-auto">{`FROM node:20
COPY . .           # ← invalidates cache
RUN npm install    # ← re-runs every time`}</pre>
          </div>
          <div>
            <div class="text-green-400 font-semibold mb-1">✅ Correct (deps cached until package.json changes)</div>
            <pre class="bg-bg p-3 rounded text-text-muted overflow-x-auto">{`FROM node:20
COPY package*.json ./
RUN npm ci         # ← cached layer
COPY . .           # ← only app code`}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}
