import { useState, useEffect, useCallback } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

interface FormatStats {
  lineCount: number;
  charCount: number;
  longLines: number;
  changedLines: number;
}

// ── Sample Python code with intentional formatting issues ─────────────────────

const SAMPLE_PYTHON = `import os,sys
from typing import List,Dict,Optional

class DataProcessor:
    """Processes data with various transformations."""

    def __init__(self,name:str,max_items:int=100):
        self.name=name
        self.max_items=max_items
        self._cache:Dict[str,List]={}
        self._errors=[]

    def load_data(self,filepath:str)->List[Dict]:
        """Load data from a JSON file."""
        if not os.path.exists( filepath ):
            raise FileNotFoundError(f'File not found: {filepath}')
        import json
        with open(filepath,'r') as f:
            data=json.load(f)
        return data[:self.max_items]

    def transform(self,item:Dict,multiplier:int=1)->Dict:
        """Apply transformation to a single item."""
        result={}
        for key,value in item.items() :
            if isinstance(value,( int,float )):
                result[key]=value*multiplier
            elif isinstance(value,str):
                result[key]=value.strip()
            else:
                result[key]=value
        return result

    def process_all(self,data:List[Dict],multiplier:int=1)->List[Dict]:
        results=[]
        for item in data:
            try:
                transformed=self.transform(item,multiplier)
                results.append(transformed)
            except Exception as e:
                self._errors.append({'item':item,'error':str(e)})
        return results

    def get_summary(self)->Dict:
        return {'name':self.name,'errors':len(self._errors),'cache_size':len(self._cache)}


def run_pipeline(filepath:str,output_dir:str='./output',multiplier:int=1)->bool:
    """Run the full data pipeline."""
    processor=DataProcessor( 'main_processor',max_items=500)
    try:
        data=processor.load_data(filepath)
        results=processor.process_all( data,multiplier )
        os.makedirs(output_dir,exist_ok=True)
        import json
        out=os.path.join(output_dir,'results.json')
        with open(out,'w') as f:
            json.dump(results,f,indent=2)
        return True
    except Exception as e:
        print(f'Pipeline failed: {e}')
        return False


if __name__=='__main__':
    success=run_pipeline(sys.argv[1] if len(sys.argv)>1 else 'data.json')
    sys.exit(0 if success else 1)
`;

// ── Black-inspired Python formatter ───────────────────────────────────────────

function normalizeStringQuotes(line: string): string {
  // Only process simple string literals (single-quoted strings without double quotes inside)
  // Replace 'text' -> "text" unless text contains double quotes or is a multiline/raw/bytes prefix
  return line.replace(
    /([^a-zA-Z\\]|^)'((?:[^'\\"]|\\.)*)'/g,
    (match, prefix, content) => {
      // Don't convert if content contains double quotes
      if (content.includes('"')) return match;
      return `${prefix}"${content}"`;
    }
  );
}

function normalizeOperatorSpacing(line: string): string {
  // Skip comment lines and string-heavy lines (crude but safe heuristic)
  const stripped = line.trimStart();
  if (stripped.startsWith('#')) return line;

  // Add spaces around = (assignment), but not ==, !=, <=, >=, ->, **=, *=, /=, //=, +=, -=, %=, &=, |=, ^=, ~=
  // And not inside strings — we'll do a simplified pass that handles common cases
  let result = line;

  // Spaces around binary operators: +, -, *, /, //, %, @, &, |, ^, ~, << , >>
  // but not for: ** (power), *, ** in function args, -> in annotations
  // We use a conservative approach: only fix obvious `a=b` style (no spaces) assignment
  // and `a+b`, `a-b` etc. in non-ambiguous contexts

  // Fix: no space around = (assignment only, not keyword args or defaults)
  // We match `identifier=value` at statement level (not inside function def defaults)
  // Simple heuristic: if not inside () context treat top-level = as assignment
  const assignMatch = result.match(/^(\s*\w[\w.]*)\s*=\s*(?!=)/);
  if (assignMatch && !result.includes('==')) {
    result = result.replace(/^(\s*\w[\w.]*)\s*=\s*(?!=)/, (m, lhs) => `${lhs} = `);
  }

  // Fix spaces around binary operators in expressions (simple cases)
  // a+b -> a + b, a-b -> a - b (but not negative numbers like -1)
  result = result.replace(/([a-zA-Z0-9_\])'"])\+([a-zA-Z0-9_('"\\])/g, '$1 + $2');
  result = result.replace(/([a-zA-Z0-9_\])'"])-([a-zA-Z0-9_('"\\])/g, '$1 - $2');
  result = result.replace(/([a-zA-Z0-9_\])'"])\*([a-zA-Z0-9_('"\\])/g, (m, a, b) => {
    // Don't touch ** (power)
    return `${a} * ${b}`;
  });
  // Fix ** back (we may have broken it)
  result = result.replace(/\s*\*\s*\*\s*/g, '**');

  // Spaces around comparison operators: ==, !=, <=, >=, <, >
  result = result.replace(/([a-zA-Z0-9_\])'"])([=!<>]=|[<>])([a-zA-Z0-9_('"\\-])/g, '$1 $2 $3');

  return result;
}

function normalizeCommaSpacing(line: string): string {
  // Add space after comma if missing, but not inside strings (rough pass)
  const stripped = line.trimStart();
  if (stripped.startsWith('#')) return line;
  // Add space after comma
  return line.replace(/,([^\s\n])/g, ', $1');
}

function removeSpaceBeforeColon(line: string): string {
  // Remove space before : in slices and annotations (not dict literals)
  // e.g. `def foo(x :int)` -> `def foo(x: int)`, `item.items() :` -> leave (it's a for-colon)
  return line.replace(/\s+:/g, (match, offset, str) => {
    // Only remove space before colon if it's NOT a dict colon or for/if/while/else/try/except/with/class/def colon
    // Simple rule: remove `space :` when followed by a type hint or end of params
    const after = str.slice(offset + match.length);
    if (/^[a-zA-Z_(]/.test(after) || /^\s*$/.test(after) || after.startsWith(')')) {
      return ':';
    }
    return match;
  });
}

function removeSpaceInsideParens(line: string): string {
  const stripped = line.trimStart();
  if (stripped.startsWith('#')) return line;
  // Remove space after ( and before )
  let result = line.replace(/\(\s+/g, '(');
  result = result.replace(/\s+\)/g, ')');
  return result;
}

function normalizeBlankLines(lines: string[]): string[] {
  const result: string[] = [];
  let blankCount = 0;
  let inClass = false;
  let classIndent = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const stripped = line.trim();

    if (stripped === '') {
      blankCount++;
      continue;
    }

    // Determine context
    const indent = line.match(/^(\s*)/)?.[1].length ?? 0;
    const isTopLevel = indent === 0;
    const isClassOrDef = /^(class |def )/.test(stripped);

    if (isTopLevel && isClassOrDef) {
      inClass = /^class /.test(stripped);
      classIndent = indent;
    }

    // Max blank lines: 2 between top-level defs, 1 inside class
    const isInsideClass = inClass && indent > classIndent;
    const maxBlanks = isInsideClass ? 1 : 2;

    const blanksToAdd = Math.min(blankCount, maxBlanks);
    for (let b = 0; b < blanksToAdd; b++) {
      result.push('');
    }
    blankCount = 0;
    result.push(line);
  }

  return result;
}

function normalizeIndentation(lines: string[]): string[] {
  // Detect the minimum indentation unit and normalize to 4 spaces
  let minIndent = Infinity;
  for (const line of lines) {
    if (line.trim() === '' || line.trimStart().startsWith('#')) continue;
    const indent = line.match(/^( +)/)?.[1].length ?? 0;
    if (indent > 0) minIndent = Math.min(minIndent, indent);
  }

  if (!isFinite(minIndent) || minIndent === 4) return lines;

  return lines.map(line => {
    if (line.trim() === '') return line;
    const indent = line.match(/^( +)/)?.[1].length ?? 0;
    if (indent === 0) return line;
    const level = Math.round(indent / minIndent);
    return ' '.repeat(level * 4) + line.trimStart();
  });
}

function formatPython(src: string): string {
  if (!src.trim()) return src;

  let lines = src.split('\n');

  // Per-line passes
  lines = lines.map(line => {
    let l = line;
    l = l.trimEnd();                    // Remove trailing whitespace
    l = normalizeStringQuotes(l);       // Single → double quotes
    l = normalizeOperatorSpacing(l);    // Spaces around operators
    l = normalizeCommaSpacing(l);       // Space after comma
    l = removeSpaceBeforeColon(l);      // Remove space before :
    l = removeSpaceInsideParens(l);     // Remove space inside parens
    return l;
  });

  // Multi-line passes
  lines = normalizeIndentation(lines);
  lines = normalizeBlankLines(lines);

  return lines.join('\n');
}

// ── Diff helpers ──────────────────────────────────────────────────────────────

function computeDiff(original: string, formatted: string): Set<number> {
  const origLines = original.split('\n');
  const fmtLines = formatted.split('\n');
  const changed = new Set<number>();
  const maxLen = Math.max(origLines.length, fmtLines.length);
  for (let i = 0; i < maxLen; i++) {
    if (origLines[i] !== fmtLines[i]) changed.add(i);
  }
  return changed;
}

function countStats(src: string, formatted: string): FormatStats {
  const lines = formatted.split('\n');
  const longLines = lines.filter(l => l.length > 88).length;
  const changedLines = computeDiff(src, formatted).size;
  return {
    lineCount: lines.length,
    charCount: formatted.length,
    longLines,
    changedLines,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PythonFormatter() {
  const [input, setInput] = useState(SAMPLE_PYTHON);
  const [output, setOutput] = useState('');
  const [stats, setStats] = useState<FormatStats | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const [changedLines, setChangedLines] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [hasFormatted, setHasFormatted] = useState(false);

  // Auto-format on input change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!input.trim()) {
        setOutput('');
        setStats(null);
        setChangedLines(new Set());
        setHasFormatted(false);
        return;
      }
      const formatted = formatPython(input);
      setOutput(formatted);
      setStats(countStats(input, formatted));
      setChangedLines(computeDiff(input, formatted));
      setHasFormatted(true);
    }, 350);
    return () => clearTimeout(timer);
  }, [input]);

  const handleCopy = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [output]);

  const handleDownload = useCallback(() => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/x-python' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'formatted.py';
    a.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 1500);
  }, [output]);

  const handleLoadSample = useCallback(() => {
    setInput(SAMPLE_PYTHON);
    setShowDiff(false);
  }, []);

  const handleClear = useCallback(() => {
    setInput('');
    setOutput('');
    setStats(null);
    setChangedLines(new Set());
    setHasFormatted(false);
    setShowDiff(false);
  }, []);

  const handleApply = useCallback(() => {
    if (output) {
      setInput(output);
      setShowDiff(false);
    }
  }, [output]);

  // Render output with optional diff highlighting
  const renderOutputLines = useCallback(() => {
    if (!output) return null;
    const lines = output.split('\n');
    return lines.map((line, idx) => {
      const isLong = line.length > 88;
      const isChanged = showDiff && changedLines.has(idx);
      let className = 'block whitespace-pre font-mono text-sm leading-relaxed px-3';
      if (isChanged) className += ' bg-yellow-400/20 dark:bg-yellow-400/15';
      if (isLong) className += ' border-r-2 border-red-400/60';
      return (
        <span key={idx} class={className}>
          {line || ' '}
        </span>
      );
    });
  }, [output, showDiff, changedLines]);

  const inputLineCount = input.split('\n').length;
  const outputLineCount = output.split('\n').length;

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-2 items-center justify-between">
        <div class="flex gap-2 flex-wrap">
          <button
            onClick={handleCopy}
            disabled={!output}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/80 transition-colors disabled:opacity-40"
          >
            {copied ? '✓ Copied' : 'Copy Output'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!output}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-40"
          >
            {downloaded ? '✓ Saved' : 'Download .py'}
          </button>
          <button
            onClick={handleApply}
            disabled={!output || output === input}
            class="px-4 py-2 rounded-lg text-sm font-medium bg-bg-card border border-border text-text-muted hover:border-green-400 hover:text-green-400 transition-colors disabled:opacity-40"
          >
            Apply to Input
          </button>
        </div>
        <div class="flex gap-2 items-center flex-wrap">
          <button
            onClick={() => setShowDiff(!showDiff)}
            disabled={!hasFormatted}
            class={`text-xs border px-3 py-1.5 rounded transition-colors disabled:opacity-40 ${
              showDiff
                ? 'bg-yellow-400/20 border-yellow-400/60 text-yellow-400'
                : 'bg-bg-card border-border text-text-muted hover:border-primary hover:text-primary'
            }`}
          >
            {showDiff ? 'Diff: ON' : 'Show Diff'}
          </button>
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

      {/* Stats bar */}
      {hasFormatted && stats && (
        <div class="flex flex-wrap gap-4 px-3 py-2 rounded-lg bg-bg-card border border-border text-xs text-text-muted">
          <span>
            <span class="font-medium text-text">{stats.lineCount}</span> lines
          </span>
          <span>
            <span class="font-medium text-text">{stats.charCount}</span> chars
          </span>
          <span class={stats.changedLines > 0 ? 'text-yellow-400' : 'text-green-400'}>
            <span class="font-medium">{stats.changedLines}</span>{' '}
            {stats.changedLines === 0 ? 'no changes' : `line${stats.changedLines !== 1 ? 's' : ''} changed`}
          </span>
          {stats.longLines > 0 && (
            <span class="text-red-400">
              <span class="font-medium">{stats.longLines}</span>{' '}
              line{stats.longLines !== 1 ? 's' : ''} &gt;88 chars
            </span>
          )}
          {stats.longLines === 0 && (
            <span class="text-green-400">All lines ≤88 chars</span>
          )}
          {showDiff && stats.changedLines > 0 && (
            <span class="text-yellow-400 font-medium">· Changed lines highlighted</span>
          )}
        </div>
      )}

      {/* Two-panel layout */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Input panel */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">
              Input Python
            </label>
            <span class="text-xs text-text-muted">
              {inputLineCount} lines · {input.length} chars
            </span>
          </div>
          <textarea
            class="w-full h-[28rem] bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors leading-relaxed"
            placeholder="Paste your Python code here..."
            value={input}
            onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
        </div>

        {/* Output panel */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="block text-sm font-medium text-text-muted">
              Formatted Output{' '}
              <span class="text-xs font-normal text-text-muted/70">(Black / PEP 8)</span>
            </label>
            <span class="text-xs text-text-muted">
              {outputLineCount} lines · {output.length} chars
            </span>
          </div>
          <div class="w-full h-[28rem] bg-bg-card border border-border rounded-lg overflow-auto">
            {output ? (
              <div class="py-2">{renderOutputLines()}</div>
            ) : (
              <div class="flex items-center justify-center h-full text-text-muted text-sm">
                Formatted code will appear here
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Long line legend */}
      {hasFormatted && stats && stats.longLines > 0 && (
        <div class="flex items-center gap-2 text-xs text-text-muted">
          <span class="inline-block w-3 h-3 border-r-2 border-red-400/60 bg-transparent" />
          Lines with a red right-border exceed 88 characters (Black's default line length)
        </div>
      )}

      {/* Empty state */}
      {!input.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">What this formatter applies</p>
          <ul class="list-disc list-inside space-y-1 text-xs">
            <li>Normalize string quotes — single quotes converted to double quotes (Black default)</li>
            <li>Spaces around operators — <code class="font-mono">a=1</code> → <code class="font-mono">a = 1</code>, <code class="font-mono">a+b</code> → <code class="font-mono">a + b</code></li>
            <li>Space after commas in function calls and definitions</li>
            <li>Remove spaces inside parentheses — <code class="font-mono">( x )</code> → <code class="font-mono">(x)</code></li>
            <li>Remove trailing whitespace from every line</li>
            <li>Normalize blank lines — max 2 between top-level defs, max 1 inside classes</li>
            <li>Normalize indentation to 4 spaces per level (PEP 8)</li>
            <li>Highlight lines longer than 88 characters (Black's line length limit)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
