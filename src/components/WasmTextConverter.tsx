import { useState } from 'preact/hooks';

const EXAMPLES: { name: string; code: string; desc: string }[] = [
  {
    name: 'Add Function',
    desc: 'Simple integer addition',
    code: `(module
  (func $add (export "add") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )
)`,
  },
  {
    name: 'Factorial',
    desc: 'Recursive factorial (i32)',
    code: `(module
  (func $factorial (export "factorial") (param $n i32) (result i32)
    local.get $n
    i32.const 1
    i32.le_s
    if (result i32)
      i32.const 1
    else
      local.get $n
      local.get $n
      i32.const 1
      i32.sub
      call $factorial
      i32.mul
    end
  )
)`,
  },
  {
    name: 'Memory / String',
    desc: 'Linear memory with string data',
    code: `(module
  (memory (export "memory") 1)
  (data (i32.const 0) "Hello, WASM!")

  (func (export "getStringPtr") (result i32)
    i32.const 0
  )

  (func (export "getStringLen") (result i32)
    i32.const 12
  )
)`,
  },
  {
    name: 'Imports + Table',
    desc: 'Importing JS functions',
    code: `(module
  (import "console" "log" (func $log (param i32)))
  (import "math" "random" (func $random (result f64)))

  (memory 1)
  (data (i32.const 0) "value: ")

  (func (export "run")
    i32.const 42
    call $log
  )
)`,
  },
  {
    name: 'Global Counter',
    desc: 'Mutable global state',
    code: `(module
  (global $counter (mut i32) (i32.const 0))

  (func (export "increment")
    global.get $counter
    i32.const 1
    i32.add
    global.set $counter
  )

  (func (export "getCount") (result i32)
    global.get $counter
  )

  (func (export "reset")
    i32.const 0
    global.set $counter
  )
)`,
  },
];

interface ValidationResult {
  valid: boolean;
  issues: string[];
  moduleFound: boolean;
  funcs: string[];
  imports: string[];
  exports: string[];
  memories: number;
  globals: string[];
}

function validateWAT(code: string): ValidationResult {
  const issues: string[] = [];
  const funcs: string[] = [];
  const exports: string[] = [];
  const imports: string[] = [];
  const globals: string[] = [];
  let memories = 0;

  const trimmed = code.trim();
  const moduleFound = trimmed.startsWith('(module');

  if (!moduleFound) issues.push('Module must start with (module ...)');

  // Count parens balance
  let depth = 0;
  let maxDepth = 0;
  for (const ch of trimmed) {
    if (ch === '(') { depth++; maxDepth = Math.max(maxDepth, depth); }
    else if (ch === ')') { depth--; }
    if (depth < 0) { issues.push('Unbalanced parentheses — extra closing ")"'); break; }
  }
  if (depth > 0) issues.push(`Unbalanced parentheses — ${depth} unclosed "(" remaining`);

  // Extract func definitions
  const funcMatches = [...code.matchAll(/\(func\s+(\$[\w.]+)?/g)];
  funcMatches.forEach(m => {
    funcs.push(m[1] || '<anonymous>');
  });

  // Extract exports
  const exportMatches = [...code.matchAll(/\(export\s+"([^"]+)"/g)];
  exportMatches.forEach(m => exports.push(m[1]));

  // Extract imports
  const importMatches = [...code.matchAll(/\(import\s+"([^"]+)"\s+"([^"]+)"/g)];
  importMatches.forEach(m => imports.push(`${m[1]}.${m[2]}`));

  // Detect memory declarations
  const memMatches = [...code.matchAll(/\(memory\b/g)];
  memories = memMatches.length;

  // Extract globals
  const globalMatches = [...code.matchAll(/\(global\s+(\$[\w.]+)?/g)];
  globalMatches.forEach(m => globals.push(m[1] || '<anonymous>'));

  // Check for common mistakes
  if (code.includes('(func') && !code.includes('result') && !code.includes('param') && funcs.length > 0) {
    // not really an error, just a note
  }
  if (exports.length === 0 && imports.length === 0 && funcs.length > 0) {
    issues.push('Warning: no exports defined — this module cannot be called from JS');
  }

  return {
    valid: issues.filter(i => !i.startsWith('Warning')).length === 0 && moduleFound,
    issues,
    moduleFound,
    funcs,
    imports,
    exports,
    memories,
    globals,
  };
}

function getWat2WasmCommands(code: string): string[] {
  const cmds: string[] = [];
  cmds.push('# Install wat2wasm (part of wabt toolkit)');
  cmds.push('npm install -g wabt   # OR  brew install wabt');
  cmds.push('');
  cmds.push('# Compile WAT → WASM binary');
  cmds.push('wat2wasm module.wat -o module.wasm');
  cmds.push('');
  cmds.push('# Disassemble WASM → WAT');
  cmds.push('wasm2wat module.wasm -o module.wat');
  cmds.push('');
  cmds.push('# Validate only (no output)');
  cmds.push('wat2wasm --no-canonicalize-leb128s module.wat --output=-');
  cmds.push('');
  cmds.push('# Use in Node.js / browser');
  cmds.push('const { instance } = await WebAssembly.instantiateStreaming(');
  cmds.push('  fetch("./module.wasm"),');
  const exportMatches = [...code.matchAll(/\(import\s+"([^"]+)"\s+"([^"]+)"/g)];
  if (exportMatches.length > 0) {
    const importObj: Record<string, string[]> = {};
    exportMatches.forEach(m => {
      if (!importObj[m[1]]) importObj[m[1]] = [];
      importObj[m[1]].push(m[2]);
    });
    cmds.push('  {');
    Object.entries(importObj).forEach(([mod, names]) => {
      cmds.push(`    ${mod}: { ${names.map(n => `${n}: () => {}`).join(', ')} },`);
    });
    cmds.push('  }');
  } else {
    cmds.push('  {} // imports object');
  }
  cmds.push(');');
  const allExports = [...code.matchAll(/\(export\s+"([^"]+)"/g)].map(m => m[1]);
  if (allExports.length > 0) {
    cmds.push(`const { ${allExports.join(', ')} } = instance.exports;`);
  }
  return cmds;
}

function highlight(code: string): string {
  return code
    .replace(/(\(module|\(func|\(import|\(export|\(memory|\(global|\(table|\(data|\(elem|\(type|\(param|\(result|\(local|\(if|\(else|\(end|\(loop|\(block|\(br|\(br_if|\(return|\(call|\(drop)/g, '<span class="text-purple-400">$1</span>')
    .replace(/\b(i32|i64|f32|f64|funcref|externref)\b/g, '<span class="text-yellow-300">$1</span>')
    .replace(/\b(local\.get|local\.set|local\.tee|global\.get|global\.set|i32\.add|i32\.sub|i32\.mul|i32\.div_s|i32\.le_s|i32\.lt_s|i32\.gt_s|i32\.eq|i32\.ne|i32\.const|i64\.const|f32\.const|f64\.const|i32\.load|i32\.store|call|if|else|end|loop|block|br|br_if|return|drop|select|nop|unreachable|memory\.size|memory\.grow)\b/g, '<span class="text-blue-300">$1</span>')
    .replace(/\$[\w.]+/g, '<span class="text-green-300">$&</span>')
    .replace(/"([^"]*?)"/g, '<span class="text-orange-300">"$1"</span>')
    .replace(/;;.*/g, '<span class="text-gray-500">$&</span>');
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
      class={`text-xs px-2 py-1 rounded transition-colors ${copied ? 'bg-green-700 text-white' : 'bg-bg border border-border text-text-muted hover:border-primary hover:text-primary'}`}
    >
      {copied ? '✓' : 'Copy'}
    </button>
  );
}

export default function WasmTextConverter() {
  const [code, setCode] = useState(EXAMPLES[0].code);
  const [activeExample, setActiveExample] = useState(0);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [showCommands, setShowCommands] = useState(false);

  const analyze = () => {
    setValidation(validateWAT(code));
    setShowCommands(true);
  };

  const loadExample = (i: number) => {
    setActiveExample(i);
    setCode(EXAMPLES[i].code);
    setValidation(null);
    setShowCommands(false);
  };

  const commands = getWat2WasmCommands(code);

  return (
    <div class="space-y-4">
      {/* Example selector */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h2 class="text-sm font-semibold mb-3">WAT Snippet Library</h2>
        <div class="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={ex.name}
              onClick={() => loadExample(i)}
              class={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                activeExample === i
                  ? 'bg-primary/20 border-primary text-primary'
                  : 'border-border text-text-muted hover:border-primary hover:text-primary'
              }`}
              title={ex.desc}
            >
              {ex.name}
            </button>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-2">{EXAMPLES[activeExample].desc}</p>
      </div>

      {/* Editor */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-mono text-text-muted">WAT Editor (WebAssembly Text Format)</span>
          <div class="flex items-center gap-2">
            <CopyButton value={code} />
            <button
              onClick={analyze}
              class="text-xs bg-primary hover:bg-primary/80 text-white px-3 py-1.5 rounded transition-colors"
            >
              Analyze
            </button>
          </div>
        </div>
        <textarea
          value={code}
          onInput={(e: any) => { setCode(e.target.value); setValidation(null); }}
          rows={16}
          class="w-full bg-gray-950 px-4 py-3 font-mono text-xs text-green-300 focus:outline-none resize-none"
          spellcheck={false}
          style={{ tabSize: 2 }}
        />
      </div>

      {/* Syntax-highlighted preview */}
      <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
          <span class="text-xs font-mono text-text-muted">Syntax Highlighted Preview</span>
        </div>
        <pre
          class="px-4 py-3 text-xs font-mono overflow-x-auto bg-gray-950 text-gray-300"
          dangerouslySetInnerHTML={{ __html: highlight(code) }}
          style={{ lineHeight: '1.6' }}
        />
      </div>

      {/* Validation result */}
      {validation && (
        <div class={`border rounded-xl p-4 ${validation.valid ? 'bg-green-950/20 border-green-800/40' : 'bg-yellow-950/20 border-yellow-800/40'}`}>
          <div class="flex items-center gap-2 mb-3">
            <span class={`text-base ${validation.valid ? 'text-green-400' : 'text-yellow-400'}`}>{validation.valid ? '✓' : '⚠'}</span>
            <span class={`text-sm font-semibold ${validation.valid ? 'text-green-300' : 'text-yellow-300'}`}>
              {validation.valid ? 'Structurally Valid WAT' : 'Potential Issues Found'}
            </span>
          </div>
          {validation.issues.length > 0 && (
            <ul class="text-xs space-y-1 mb-3">
              {validation.issues.map((issue, i) => (
                <li key={i} class={`font-mono ${issue.startsWith('Warning') ? 'text-yellow-300/80' : 'text-red-300'}`}>
                  {issue.startsWith('Warning') ? '⚠' : '✕'} {issue}
                </li>
              ))}
            </ul>
          )}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div class="bg-bg/40 rounded-lg p-2">
              <div class="text-text-muted mb-1">Functions</div>
              <div class="font-mono text-text">{validation.funcs.length > 0 ? validation.funcs.join(', ') : '0'}</div>
            </div>
            <div class="bg-bg/40 rounded-lg p-2">
              <div class="text-text-muted mb-1">Exports</div>
              <div class="font-mono text-green-300">{validation.exports.length > 0 ? validation.exports.join(', ') : 'none'}</div>
            </div>
            <div class="bg-bg/40 rounded-lg p-2">
              <div class="text-text-muted mb-1">Imports</div>
              <div class="font-mono text-blue-300">{validation.imports.length > 0 ? validation.imports.join(', ') : 'none'}</div>
            </div>
            <div class="bg-bg/40 rounded-lg p-2">
              <div class="text-text-muted mb-1">Memory / Globals</div>
              <div class="font-mono text-text">{validation.memories} / {validation.globals.length}</div>
            </div>
          </div>
        </div>
      )}

      {/* Toolchain commands */}
      {showCommands && (
        <div class="bg-bg-card border border-border rounded-xl overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2.5 border-b border-border bg-bg">
            <span class="text-xs font-semibold text-text">wat2wasm Toolchain Commands</span>
            <CopyButton value={commands.join('\n')} />
          </div>
          <pre class="px-4 py-3 text-xs font-mono text-green-300 bg-gray-950 overflow-x-auto">
            {commands.map((line, i) => (
              <div key={i} class={line.startsWith('#') ? 'text-gray-500' : line === '' ? 'h-3' : 'text-green-300'}>
                {line || '\u00A0'}
              </div>
            ))}
          </pre>
        </div>
      )}

      {/* Reference */}
      <div class="bg-blue-950/20 border border-blue-800/30 rounded-xl p-4 text-xs text-blue-300/80 space-y-1">
        <div class="font-medium text-blue-300">WAT Format Cheat Sheet</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-1">
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">(param $name type)</code> — named param</div>
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">(result type)</code> — return type</div>
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">local.get $x</code> — push local to stack</div>
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">i32.add</code> — pop 2, push sum</div>
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">(export "name" (func $f))</code> — export</div>
          <div><code class="font-mono bg-blue-950/40 px-1 rounded">(memory 1)</code> — 64KB page</div>
        </div>
      </div>
    </div>
  );
}
