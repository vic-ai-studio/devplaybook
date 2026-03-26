import { useState, useCallback } from 'preact/hooks';

type ComplexityResult = {
  cyclomaticComplexity: number;
  linesOfCode: number;
  blankLines: number;
  commentLines: number;
  functions: string[];
  maxNestingDepth: number;
  avgFunctionLength: number;
  rating: 'low' | 'medium' | 'high' | 'critical';
  details: string[];
};

const SAMPLE_CODE = `function processOrder(order, user) {
  if (!order) {
    throw new Error('Order is required');
  }

  if (user.isPremium) {
    if (order.total > 100) {
      order.discount = 0.2;
    } else if (order.total > 50) {
      order.discount = 0.1;
    } else {
      order.discount = 0.05;
    }
  }

  for (const item of order.items) {
    if (item.stock > 0) {
      if (item.category === 'digital') {
        item.status = 'ready';
      } else if (item.shipsFrom === 'warehouse') {
        item.status = 'pending_shipment';
      } else {
        item.status = 'backordered';
      }
    } else {
      item.status = 'out_of_stock';
    }
  }

  return order;
}

function validateUser(user) {
  return user && user.id && user.email;
}`;

function detectLanguage(code: string): 'javascript' | 'typescript' | 'python' | 'generic' {
  if (code.includes('def ') && code.includes(':')) return 'python';
  if (code.includes(': ') && (code.includes('interface ') || code.includes('type ') || code.includes('<T'))) return 'typescript';
  if (code.includes('function ') || code.includes('=>') || code.includes('const ') || code.includes('var ')) return 'javascript';
  return 'generic';
}

function extractFunctions(code: string, lang: string): string[] {
  const fns: string[] = [];
  const lines = code.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (lang === 'python') {
      const m = trimmed.match(/^def\s+(\w+)\s*\(/);
      if (m) fns.push(m[1]);
    } else {
      const m =
        trimmed.match(/^(?:async\s+)?function\s+(\w+)\s*[\(<]/) ||
        trimmed.match(/^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[\(<]/) ||
        trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(/) ||
        trimmed.match(/^(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?function/);
      if (m) fns.push(m[1]);
    }
  }
  return fns;
}

function calculateNesting(code: string, lang: string): number {
  let maxDepth = 0, depth = 0;
  if (lang === 'python') {
    const lines = code.split('\n');
    for (const line of lines) {
      if (!line.trim()) continue;
      const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
      const level = Math.floor(indent / 4);
      if (level > maxDepth) maxDepth = level;
    }
    return maxDepth;
  }
  for (const ch of code) {
    if (ch === '{') { depth++; if (depth > maxDepth) maxDepth = depth; }
    else if (ch === '}') depth = Math.max(0, depth - 1);
  }
  return maxDepth;
}

function calculateCyclomatic(code: string, lang: string): number {
  // McCabe's cyclomatic complexity: 1 + decision points
  const decisionKeywords = lang === 'python'
    ? /\b(if|elif|else|for|while|except|and|or|with)\b/g
    : /\b(if|else\s+if|else|for|while|catch|switch|case|&&|\|\||\?)\b/g;
  const matches = code.match(decisionKeywords) || [];
  return 1 + matches.length;
}

function analyzeCode(code: string): ComplexityResult {
  const lang = detectLanguage(code);
  const lines = code.split('\n');

  let loc = 0, blanks = 0, comments = 0;
  let inBlockComment = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { blanks++; continue; }
    if (trimmed.startsWith('/*') || trimmed.startsWith('"""') || trimmed.startsWith("'''")) inBlockComment = true;
    if (inBlockComment) {
      comments++;
      if (trimmed.endsWith('*/') || (trimmed.endsWith('"""') && !trimmed.startsWith('"""')) || (trimmed.endsWith("'''") && !trimmed.startsWith("'''"))) inBlockComment = false;
      continue;
    }
    if (trimmed.startsWith('//') || trimmed.startsWith('#')) { comments++; continue; }
    loc++;
  }

  const cc = calculateCyclomatic(code, lang);
  const fns = extractFunctions(code, lang);
  const nestingDepth = calculateNesting(code, lang);
  const avgFnLen = fns.length > 0 ? Math.round(loc / fns.length) : loc;

  let rating: ComplexityResult['rating'] = 'low';
  if (cc >= 20 || nestingDepth >= 6) rating = 'critical';
  else if (cc >= 10 || nestingDepth >= 4) rating = 'high';
  else if (cc >= 5 || nestingDepth >= 3) rating = 'medium';

  const details: string[] = [];
  if (cc <= 5) details.push('Cyclomatic complexity is low — easy to test and understand');
  else if (cc <= 10) details.push('Moderate complexity — consider breaking into smaller functions');
  else if (cc <= 20) details.push('High complexity — refactor into smaller, single-responsibility functions');
  else details.push('Very high complexity — this code will be difficult to maintain and test');

  if (nestingDepth >= 4) details.push(`Deep nesting (${nestingDepth} levels) — consider early returns or extracting logic`);
  if (avgFnLen > 40) details.push(`Functions average ${avgFnLen} lines — aim for under 20–30 lines per function`);
  if (fns.length === 0) details.push('No functions detected — consider modularizing this code');
  if (lang === 'generic') details.push('Language not recognized — metrics may be less accurate');

  return { cyclomaticComplexity: cc, linesOfCode: loc, blankLines: blanks, commentLines: comments, functions: fns, maxNestingDepth: nestingDepth, avgFunctionLength: avgFnLen, rating, details };
}

const RATING_CONFIG = {
  low:      { color: 'text-green-400',  bg: 'bg-green-400/10 border-green-400/30',  label: 'Low',      desc: 'Simple and easy to test' },
  medium:   { color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/30', label: 'Medium',   desc: 'Some complexity, watch nesting' },
  high:     { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/30', label: 'High',     desc: 'Consider refactoring' },
  critical: { color: 'text-red-400',    bg: 'bg-red-400/10 border-red-400/30',       label: 'Critical', desc: 'Refactor urgently' },
};

export default function CodeComplexityCalculator() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [result, setResult] = useState<ComplexityResult | null>(() => analyzeCode(SAMPLE_CODE));

  const analyze = useCallback(() => {
    if (code.trim()) setResult(analyzeCode(code));
  }, [code]);

  const handleInput = useCallback((e: Event) => {
    const val = (e.target as HTMLTextAreaElement).value;
    setCode(val);
    if (val.trim()) setResult(analyzeCode(val));
    else setResult(null);
  }, []);

  const cfg = result ? RATING_CONFIG[result.rating] : null;

  return (
    <div class="space-y-4">
      {/* Input */}
      <div class="bg-surface rounded-xl border border-border overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-border">
          <span class="text-xs text-text-muted font-medium">Paste your code (JS/TS/Python)</span>
          <button
            onClick={() => { setCode(SAMPLE_CODE); setResult(analyzeCode(SAMPLE_CODE)); }}
            class="text-xs text-accent hover:underline"
          >
            Load Sample
          </button>
        </div>
        <textarea
          value={code}
          onInput={handleInput}
          rows={14}
          spellcheck={false}
          class="w-full p-4 font-mono text-sm bg-bg text-text resize-y focus:outline-none"
          placeholder="Paste JS, TypeScript, or Python code here..."
        />
      </div>

      {result && cfg && (
        <>
          {/* Rating Badge */}
          <div class={`rounded-xl border p-4 flex items-center gap-4 ${cfg.bg}`}>
            <div class="text-4xl font-black font-mono">
              <span class={cfg.color}>{result.cyclomaticComplexity}</span>
            </div>
            <div>
              <div class={`text-lg font-bold ${cfg.color}`}>{cfg.label} Complexity</div>
              <div class="text-sm text-text-muted">{cfg.desc}</div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Cyclomatic CC', value: result.cyclomaticComplexity, note: 'Decision paths' },
              { label: 'Lines of Code', value: result.linesOfCode, note: 'Executable lines' },
              { label: 'Max Nesting', value: result.maxNestingDepth, note: 'Deepest block level' },
              { label: 'Functions', value: result.functions.length, note: 'Detected functions' },
            ].map(m => (
              <div key={m.label} class="bg-surface border border-border rounded-xl p-3 text-center">
                <div class="text-2xl font-bold font-mono text-text">{m.value}</div>
                <div class="text-xs font-medium text-text mt-0.5">{m.label}</div>
                <div class="text-xs text-text-muted">{m.note}</div>
              </div>
            ))}
          </div>

          {/* Additional stats */}
          <div class="bg-surface border border-border rounded-xl p-4 grid grid-cols-3 gap-4 text-sm">
            <div><span class="text-text-muted">Blank lines:</span> <span class="font-mono text-text ml-1">{result.blankLines}</span></div>
            <div><span class="text-text-muted">Comment lines:</span> <span class="font-mono text-text ml-1">{result.commentLines}</span></div>
            <div><span class="text-text-muted">Avg fn length:</span> <span class="font-mono text-text ml-1">{result.avgFunctionLength} lines</span></div>
          </div>

          {/* Functions list */}
          {result.functions.length > 0 && (
            <div class="bg-surface border border-border rounded-xl p-4">
              <div class="text-xs font-medium text-text-muted mb-2">Detected Functions</div>
              <div class="flex flex-wrap gap-2">
                {result.functions.map(fn => (
                  <span key={fn} class="px-2 py-1 bg-accent/10 text-accent text-xs font-mono rounded">{fn}()</span>
                ))}
              </div>
            </div>
          )}

          {/* Suggestions */}
          <div class="space-y-2">
            {result.details.map((d, i) => (
              <div key={i} class="flex items-start gap-2 text-sm">
                <span class={`mt-0.5 flex-shrink-0 ${cfg.color}`}>
                  {result.rating === 'low' ? '✓' : result.rating === 'critical' ? '✗' : '⚠'}
                </span>
                <span class="text-text-muted">{d}</span>
              </div>
            ))}
          </div>

          {/* Reference */}
          <div class="bg-surface border border-border rounded-xl p-4 text-xs text-text-muted space-y-1">
            <div class="font-medium text-text mb-2">Cyclomatic Complexity Reference (McCabe)</div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div><span class="text-green-400 font-medium">1–5</span> — Low (simple)</div>
              <div><span class="text-yellow-400 font-medium">6–10</span> — Medium</div>
              <div><span class="text-orange-400 font-medium">11–20</span> — High</div>
              <div><span class="text-red-400 font-medium">21+</span> — Critical</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
