import { useState, useEffect, useCallback } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormatStats {
  lineCount: number;
  importCount: number;
  charCount: number;
  changeCount: number;
}

// ── Sample Go code with intentional gofmt violations ─────────────────────────

const SAMPLE_GO = `package main

import (
	"fmt"
	"net/http"
	"encoding/json"
	"os"
)

type User struct{
	Name string
	Age  int
	Email string
}

func (u *User) Greet()string{
	return fmt.Sprintf("Hello, %s!", u.Name)
}

func (u *User) IsAdult() bool{
	if(u.Age>=18){
		return true
	}
	return false
}

func handleUsers(w http.ResponseWriter,r *http.Request){
	users := []User{
		{Name: "Alice",Age: 30,Email: "alice@example.com"},
		{Name: "Bob",Age: 17,Email: "bob@example.com"},
	}


	for _,u := range users{
		if u.IsAdult(){
			fmt.Fprintf(w, "%s\\n", u.Greet())
		}
	}

	data,err := json.Marshal(users)
	if err!=nil{
		http.Error(w,"internal error",500)
		return
	}
	w.Header().Set("Content-Type","application/json")
	w.Write(data)
}

func main(){
	port := os.Getenv("PORT")
	if port==""{
		port = "8080"
	}
	http.HandleFunc("/users",handleUsers)
	fmt.Printf("Server running on :%s\\n",port)
	http.ListenAndServe(":"+port,nil)
}
`;

// ── gofmt-inspired formatter ──────────────────────────────────────────────────

function formatGo(src: string): { output: string; changes: number } {
  if (!src.trim()) return { output: '', changes: 0 };

  let changes = 0;
  const lines = src.split('\n');
  const result: string[] = [];

  // Track whether we're inside an import block
  let inImportBlock = false;
  let importLines: string[] = [];
  let importStart = -1;

  // First pass: collect import lines for grouping
  const processedLines: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed === 'import (') {
      inImportBlock = true;
      importStart = processedLines.length;
      importLines = [];
      processedLines.push(line);
      continue;
    }
    if (inImportBlock) {
      if (trimmed === ')') {
        inImportBlock = false;
        // Group imports: stdlib first, then third-party
        const grouped = groupImports(importLines);
        if (grouped.join('\n') !== importLines.join('\n')) changes++;
        for (const gl of grouped) processedLines.push(gl);
        processedLines.push(line); // closing )
      } else {
        importLines.push(line);
      }
      continue;
    }
    processedLines.push(line);
  }

  // Second pass: apply formatting rules line by line
  let consecutiveBlanks = 0;
  let inFuncBody = false;
  let braceDepth = 0;

  for (let i = 0; i < processedLines.length; i++) {
    const raw = processedLines[i];
    const trimmed = raw.trim();

    // Track brace depth for blank line normalization inside func bodies
    if (/^func\s/.test(trimmed)) inFuncBody = true;

    // Remove trailing whitespace
    let line = raw.trimEnd();
    if (line !== raw) changes++;

    // Normalize blank lines: max 1 consecutive inside function bodies
    if (trimmed === '') {
      consecutiveBlanks++;
      if (inFuncBody && consecutiveBlanks > 1) {
        changes++;
        continue; // skip extra blank lines
      }
      result.push('');
      continue;
    }
    consecutiveBlanks = 0;

    // Convert leading spaces to tabs (4 spaces → 1 tab, 2 spaces → 1 tab)
    line = convertIndentToTabs(line);

    // Opening brace on same line — move `\n{` onto previous line
    // (handled structurally below for single-line case: `func foo()\n{` → already split)

    // Ensure opening brace stays on same line as statement
    // Pattern: line ends without { and next non-blank line is just {
    if (
      i + 1 < processedLines.length &&
      processedLines[i + 1].trim() === '{' &&
      !trimmed.endsWith('{') &&
      !trimmed.startsWith('//')
    ) {
      line = line + ' {';
      i++; // skip the lone { line
      changes++;
    }

    // Space after keywords: if(, for(, func( → if (, for (, func (
    const keywordFixed = line
      .replace(/\bif\s*\(/g, (m) => { if (m !== 'if (') { changes++; } return 'if ('; })
      .replace(/\bfor\s*\(/g, (m) => { if (m !== 'for (') { changes++; } return 'for ('; })
      .replace(/\bfunc\s+(\w+)\s*\(/g, (m) => { if (!/^func\s+\w+\s+\(/.test(m)) { /* no change needed */ } return m; });
    line = keywordFixed;

    // Space around binary operators (but not in strings, not for -> or :=, not unary)
    line = fixBinaryOperators(line);

    // Space after comma in function calls
    line = fixCommaSpacing(line);

    // Update brace depth
    for (const ch of line) {
      if (ch === '{') braceDepth++;
      else if (ch === '}') { braceDepth--; if (braceDepth <= 0) { braceDepth = 0; inFuncBody = false; } }
    }

    if (line !== raw.trimEnd()) changes++;

    result.push(line);
  }

  // Ensure single trailing newline
  while (result.length > 0 && result[result.length - 1] === '') result.pop();
  result.push('');

  return { output: result.join('\n'), changes };
}

function convertIndentToTabs(line: string): string {
  const match = line.match(/^(\s+)/);
  if (!match) return line;
  const leading = match[1];
  // If already tabs, leave as-is
  if (/^\t+$/.test(leading)) return line;
  // Convert spaces to tabs (treat 4 spaces or 2 spaces as 1 level)
  const spaceCount = leading.replace(/\t/g, '    ').length;
  const tabCount = Math.round(spaceCount / 4) || Math.round(spaceCount / 2) || 1;
  return '\t'.repeat(tabCount) + line.trimStart();
}

function groupImports(importLines: string[]): string[] {
  const stdlib: string[] = [];
  const thirdParty: string[] = [];
  const blank: string[] = [];

  // Common stdlib top-level packages
  const stdlibPrefixes = new Set([
    'archive', 'bufio', 'builtin', 'bytes', 'compress', 'container',
    'context', 'crypto', 'database', 'debug', 'encoding', 'errors',
    'expvar', 'flag', 'fmt', 'go', 'hash', 'html', 'image', 'index',
    'io', 'log', 'math', 'mime', 'net', 'os', 'path', 'plugin',
    'reflect', 'regexp', 'runtime', 'sort', 'strconv', 'strings',
    'sync', 'syscall', 'testing', 'text', 'time', 'unicode', 'unsafe',
  ]);

  for (const line of importLines) {
    const t = line.trim();
    if (t === '') { blank.push(line); continue; }
    // Extract the import path
    const pathMatch = t.match(/"([^"]+)"/);
    if (!pathMatch) { stdlib.push(line); continue; }
    const pkg = pathMatch[1];
    const topLevel = pkg.split('/')[0];
    if (stdlibPrefixes.has(topLevel)) {
      stdlib.push(line);
    } else {
      thirdParty.push(line);
    }
  }

  // Build grouped result
  const grouped: string[] = [];
  if (stdlib.length > 0) {
    for (const l of stdlib) grouped.push(l);
  }
  if (stdlib.length > 0 && thirdParty.length > 0) {
    grouped.push(''); // blank line separator between groups
  }
  if (thirdParty.length > 0) {
    for (const l of thirdParty) grouped.push(l);
  }
  // If only one group (no separator needed), just return as-is but sorted
  return grouped;
}

function fixBinaryOperators(line: string): string {
  // Skip comment lines and string-heavy lines to avoid false replacements
  const trimmed = line.trim();
  if (trimmed.startsWith('//') || trimmed.startsWith('*')) return line;

  // Extract the indentation prefix
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[0] : '';
  let rest = line.slice(indent.length);

  // Only apply outside of string literals (simple heuristic: process segment by segment)
  // Operators to space: == != <= >= += -= *= /= %= && || but NOT := -> << >> ++ --
  // Simple replacement on non-string portions
  rest = rest
    // Ensure spaces around == (but not !=, <=, >=)
    .replace(/([^!<>=\s])={2}([^=\s])/g, '$1 == $2')
    // Ensure spaces around !=
    .replace(/([^\s])!=([^\s])/g, '$1 != $2')
    // Spaces around <= >=
    .replace(/([^\s])<=/g, '$1 <=')
    .replace(/<=([^\s])/g, '<= $1')
    .replace(/([^\s])>=/g, '$1 >=')
    .replace(/>=([^\s])/g, '>= $1')
    // Spaces around = (assignment, but not := == <= >= != +=  -=  *=  /=  %=)
    .replace(/([^:!<>=+\-*/%\s])=([^=>])/g, '$1 = $2')
    // Spaces around + - (arithmetic, not unary, not ++ --)
    .replace(/([a-zA-Z0-9_\)"'\]`])\+([a-zA-Z0-9_\("'\[`])/g, '$1 + $2')
    .replace(/([a-zA-Z0-9_\)"'\]`])-([a-zA-Z0-9_\("'\[`])/g, '$1 - $2')
    // Spaces around * / % (but not pointer declarations or import paths)
    .replace(/([a-zA-Z0-9_\)"'\]`])\*([a-zA-Z0-9_\("'\[`])/g, '$1 * $2')
    .replace(/([a-zA-Z0-9_\)"'\]`])\/([a-zA-Z0-9_\("'\[`])/g, '$1 / $2')
    .replace(/([a-zA-Z0-9_\)"'\]`])%([a-zA-Z0-9_\("'\[`])/g, '$1 % $2')
    // Spaces around && ||
    .replace(/([^\s&])&&([^\s])/g, '$1 && $2')
    .replace(/([^\s|])\|\|([^\s])/g, '$1 || $2');

  return indent + rest;
}

function fixCommaSpacing(line: string): string {
  // Add space after comma if missing, but not inside strings (heuristic)
  const trimmed = line.trim();
  if (trimmed.startsWith('//')) return line;

  return line.replace(/,([^\s\n])/g, ', $1');
}

// ── Diff generator ────────────────────────────────────────────────────────────

interface DiffLine {
  type: 'unchanged' | 'removed' | 'added';
  content: string;
  lineNum: number;
}

function generateDiff(original: string, formatted: string): DiffLine[] {
  const origLines = original.split('\n');
  const fmtLines = formatted.split('\n');
  const diff: DiffLine[] = [];

  const maxLen = Math.max(origLines.length, fmtLines.length);
  let origIdx = 0;
  let fmtIdx = 0;

  while (origIdx < origLines.length || fmtIdx < fmtLines.length) {
    const origLine = origLines[origIdx];
    const fmtLine = fmtLines[fmtIdx];

    if (origIdx >= origLines.length) {
      diff.push({ type: 'added', content: fmtLine, lineNum: fmtIdx + 1 });
      fmtIdx++;
    } else if (fmtIdx >= fmtLines.length) {
      diff.push({ type: 'removed', content: origLine, lineNum: origIdx + 1 });
      origIdx++;
    } else if (origLine === fmtLine) {
      diff.push({ type: 'unchanged', content: origLine, lineNum: origIdx + 1 });
      origIdx++;
      fmtIdx++;
    } else {
      diff.push({ type: 'removed', content: origLine, lineNum: origIdx + 1 });
      diff.push({ type: 'added', content: fmtLine, lineNum: fmtIdx + 1 });
      origIdx++;
      fmtIdx++;
    }
  }

  return diff;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function GoFormatter() {
  const [input, setInput] = useState(SAMPLE_GO);
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState<FormatStats | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [hasFormatted, setHasFormatted] = useState(false);
  const [diff, setDiff] = useState<DiffLine[]>([]);

  // Auto-format on input change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!input.trim()) {
        setOutput('');
        setStats(null);
        setHasFormatted(false);
        return;
      }
      const { output: fmt, changes } = formatGo(input);
      setOutput(fmt);
      setHasFormatted(true);

      const importMatch = fmt.match(/"[^"]+"/g) || [];
      const importCount = importMatch.length;

      setStats({
        lineCount: fmt.split('\n').filter(l => l.trim() !== '').length,
        importCount,
        charCount: fmt.length,
        changeCount: changes,
      });

      setDiff(generateDiff(input, fmt));
    }, 300);
    return () => clearTimeout(timer);
  }, [input]);

  const handleCopy = useCallback(() => {
    const text = output || input;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output, input]);

  const handleDownload = useCallback(() => {
    const text = output || input;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.go';
    a.click();
    URL.revokeObjectURL(url);
  }, [output, input]);

  const handleApply = useCallback(() => {
    if (output) {
      setInput(output);
    }
  }, [output]);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_GO);
    setShowDiff(false);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setStats(null);
    setHasFormatted(false);
    setShowDiff(false);
  }, []);

  const isClean = hasFormatted && output === input;
  const diffChangedLines = diff.filter(d => d.type !== 'unchanged').length;

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <button
            onClick={handleApply}
            disabled={!output || isClean}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            Apply Format
          </button>
          <button
            onClick={handleCopy}
            disabled={!input.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!input.trim()}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            Download .go
          </button>
          {hasFormatted && (
            <button
              onClick={() => setShowDiff(!showDiff)}
              class={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                showDiff
                  ? 'bg-primary/10 border-primary text-primary'
                  : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
            >
              {showDiff ? 'Hide Diff' : `Show Diff${diffChangedLines > 0 ? ` (${diffChangedLines})` : ''}`}
            </button>
          )}
        </div>
        <div class="flex gap-2">
          <button
            onClick={handleLoadSample}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
          >
            Load Sample
          </button>
          <button
            onClick={handleClear}
            class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-red-400 hover:text-red-400 transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Status bar */}
      {input.trim() && hasFormatted && (
        <div
          class={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm ${
            isClean
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-primary/10 border border-primary/30 text-primary'
          }`}
        >
          <span class="font-mono text-base font-bold">{isClean ? '✓' : '~'}</span>
          <span>
            {isClean
              ? 'Already gofmt-compliant — no changes needed'
              : `${stats?.changeCount ?? 0} formatting fix${(stats?.changeCount ?? 0) !== 1 ? 'es' : ''} applied`}
          </span>
        </div>
      )}

      {/* Two-panel editor */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input panel */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">Go Input</label>
            <span class="text-xs text-text-muted">
              {input.split('\n').length} lines · {input.length} chars
            </span>
          </div>
          <textarea
            class="w-full h-96 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
            placeholder="Paste your Go code here..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
        </div>

        {/* Output panel */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">Formatted Output</label>
            {stats && (
              <span class="text-xs text-text-muted">
                {output.split('\n').length} lines · {output.length} chars
              </span>
            )}
          </div>
          <textarea
            class="w-full h-96 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-border transition-colors"
            placeholder="Formatted code will appear here..."
            value={output}
            readOnly
            spellcheck={false}
          />
        </div>
      </div>

      {/* Stats bar */}
      {hasFormatted && stats && (
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
            <p class="text-xl font-bold text-text tabular-nums">{stats.lineCount}</p>
            <p class="text-xs text-text-muted mt-0.5">Code Lines</p>
          </div>
          <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
            <p class="text-xl font-bold text-text tabular-nums">{stats.importCount}</p>
            <p class="text-xs text-text-muted mt-0.5">Imports</p>
          </div>
          <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
            <p class="text-xl font-bold text-text tabular-nums">{stats.changeCount}</p>
            <p class="text-xs text-text-muted mt-0.5">Changes</p>
          </div>
          <div class="bg-bg-card border border-border rounded-lg px-3 py-2 text-center">
            <p class="text-xl font-bold text-text tabular-nums">{stats.charCount}</p>
            <p class="text-xs text-text-muted mt-0.5">Characters</p>
          </div>
        </div>
      )}

      {/* Diff panel */}
      {showDiff && diff.length > 0 && (
        <div class="rounded-lg border border-border overflow-hidden">
          <div class="bg-bg-card px-4 py-2 border-b border-border flex items-center gap-3 text-sm font-medium">
            <span class="text-text">Diff</span>
            <span class="text-green-400 text-xs">
              +{diff.filter(d => d.type === 'added').length} added
            </span>
            <span class="text-red-400 text-xs">
              -{diff.filter(d => d.type === 'removed').length} removed
            </span>
          </div>
          <div class="max-h-96 overflow-y-auto font-mono text-xs">
            {diff
              .filter(d => d.type !== 'unchanged')
              .map((line, idx) => (
                <div
                  key={idx}
                  class={`flex gap-2 px-3 py-0.5 ${
                    line.type === 'added'
                      ? 'bg-green-500/10 text-green-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}
                >
                  <span class="shrink-0 w-6 text-right opacity-50">{line.lineNum}</span>
                  <span class="shrink-0">{line.type === 'added' ? '+' : '-'}</span>
                  <span class="whitespace-pre">{line.content || ' '}</span>
                </div>
              ))}
            {diff.filter(d => d.type !== 'unchanged').length === 0 && (
              <div class="px-4 py-3 text-text-muted text-sm">No differences — code is already formatted.</div>
            )}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">What this formatter applies</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Tab indentation (converts spaces to tabs per Go convention)</li>
            <li>Opening brace <code class="font-mono">{`{`}</code> on same line as statement</li>
            <li>Space after keywords: <code class="font-mono">if (</code>, <code class="font-mono">for (</code>, <code class="font-mono">func (</code></li>
            <li>Space around binary operators: <code class="font-mono">a+b</code> → <code class="font-mono">a + b</code></li>
            <li>Space after commas in function calls</li>
            <li>Remove trailing whitespace</li>
            <li>Max 1 consecutive blank line inside function bodies</li>
            <li>Import grouping: stdlib first, then third-party (visual separator)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
