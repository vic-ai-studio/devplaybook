import { useState, useCallback } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────────

interface WasmExport {
  name: string;
  kind: string;
}

interface WasmImport {
  module: string;
  name: string;
  kind: string;
}

interface WasmAnalysis {
  source: 'wat' | 'wasm';
  exports: WasmExport[];
  imports: WasmImport[];
  sections: string[];
  funcCount: number;
  memoryDecls: string[];
  globalDecls: string[];
  tableDecls: string[];
  byteSize?: number;
}

// ── WAT text parser ────────────────────────────────────────────────────────────

function parseWat(src: string): { analysis?: WasmAnalysis; error?: string } {
  // Quick sanity check — a WAT module should have (module ...) at its root
  const trimmed = src.trim();
  if (!trimmed.startsWith('(')) {
    return { error: 'Input does not look like WAT. WAT source must start with a ( character (e.g. "(module ...").' };
  }

  // Strip line comments (;; ...) so they don't confuse our regexes
  const stripped = trimmed.replace(/;;[^\n]*/g, '');

  // ── exports: (export "name" (func|memory|global|table ...))
  const exports: WasmExport[] = [];
  const exportRe = /\(\s*export\s+"([^"]+)"\s+\(\s*(func|memory|global|table)[^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = exportRe.exec(stripped)) !== null) {
    exports.push({ name: m[1], kind: m[2] });
  }

  // ── imports: (import "module" "name" (func|memory|global|table ...))
  const imports: WasmImport[] = [];
  const importRe = /\(\s*import\s+"([^"]+)"\s+"([^"]+)"\s+\(\s*(func|memory|global|table)[^)]*\)/g;
  while ((m = importRe.exec(stripped)) !== null) {
    imports.push({ module: m[1], name: m[2], kind: m[3] });
  }

  // ── func count (top-level func declarations, not imports)
  // Match (func ... without being preceded by (import "..." "..."
  const funcMatches = [...stripped.matchAll(/\(\s*func\b/g)];
  // Subtract imported funcs
  const funcCount = Math.max(0, funcMatches.length - imports.filter(i => i.kind === 'func').length);

  // ── memory declarations
  const memoryDecls: string[] = [];
  const memRe = /\(\s*memory\s+((?:[^()]*|\([^)]*\))*)\)/g;
  while ((m = memRe.exec(stripped)) !== null) {
    const inner = m[1].trim();
    // Skip imported memories (they appear inside (import ...) blocks)
    const pos = m.index;
    const before = stripped.slice(Math.max(0, pos - 60), pos);
    if (!before.includes('(import')) {
      memoryDecls.push(`(memory ${inner})`);
    }
  }

  // ── global declarations
  const globalDecls: string[] = [];
  const globalRe = /\(\s*global\s+((?:[^()]*|\([^)]*\))*)\)/g;
  while ((m = globalRe.exec(stripped)) !== null) {
    const inner = m[1].trim();
    const pos = m.index;
    const before = stripped.slice(Math.max(0, pos - 60), pos);
    if (!before.includes('(import')) {
      // Trim to a reasonable length
      const label = inner.length > 60 ? inner.slice(0, 57) + '…' : inner;
      globalDecls.push(`(global ${label})`);
    }
  }

  // ── table declarations
  const tableDecls: string[] = [];
  const tableRe = /\(\s*table\s+((?:[^()]*|\([^)]*\))*)\)/g;
  while ((m = tableRe.exec(stripped)) !== null) {
    const inner = m[1].trim();
    const pos = m.index;
    const before = stripped.slice(Math.max(0, pos - 60), pos);
    if (!before.includes('(import')) {
      tableDecls.push(`(table ${inner})`);
    }
  }

  // ── sections inferred from WAT keywords
  const sections: string[] = ['type', 'code']; // always present if funcs exist
  if (imports.length > 0) sections.unshift('import');
  if (funcCount > 0 && !sections.includes('function')) sections.splice(sections.indexOf('code'), 0, 'function');
  if (tableDecls.length > 0) sections.push('table');
  if (memoryDecls.length > 0) sections.push('memory');
  if (globalDecls.length > 0) sections.push('global');
  if (exports.length > 0) sections.push('export');
  const hasData = /\(\s*data\b/.test(stripped);
  if (hasData) sections.push('data');
  const hasElem = /\(\s*elem\b/.test(stripped);
  if (hasElem) sections.push('element');
  const hasStart = /\(\s*start\b/.test(stripped);
  if (hasStart) sections.push('start');

  // Deduplicate and sort in logical WASM section order
  const sectionOrder = ['type', 'import', 'function', 'table', 'memory', 'global', 'export', 'start', 'element', 'code', 'data'];
  const uniqueSections = [...new Set(sections)].sort(
    (a, b) => sectionOrder.indexOf(a) - sectionOrder.indexOf(b)
  );

  return {
    analysis: {
      source: 'wat',
      exports,
      imports,
      sections: uniqueSections,
      funcCount,
      memoryDecls,
      globalDecls,
      tableDecls,
    },
  };
}

// ── WASM binary analyser ───────────────────────────────────────────────────────

async function analyzeWasm(buffer: ArrayBuffer): Promise<{ analysis?: WasmAnalysis; error?: string }> {
  // Validate magic bytes: \0asm
  const header = new Uint8Array(buffer.slice(0, 4));
  if (header[0] !== 0x00 || header[1] !== 0x61 || header[2] !== 0x73 || header[3] !== 0x6d) {
    return { error: 'Not a valid WebAssembly binary. Magic bytes do not match (expected 00 61 73 6D).' };
  }

  let wasmModule: WebAssembly.Module;
  try {
    wasmModule = await WebAssembly.compile(buffer);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: `WebAssembly.compile failed: ${msg}` };
  }

  const rawExports = WebAssembly.Module.exports(wasmModule);
  const rawImports = WebAssembly.Module.imports(wasmModule);

  const exports: WasmExport[] = rawExports.map(e => ({ name: e.name, kind: e.kind }));
  const imports: WasmImport[] = rawImports.map(i => ({ module: i.module, name: i.name, kind: i.kind }));

  const funcCount = exports.filter(e => e.kind === 'function').length;
  const memoryDecls = exports.filter(e => e.kind === 'memory').map(e => `(export "${e.name}" memory)`);
  const globalDecls = exports.filter(e => e.kind === 'global').map(e => `(export "${e.name}" global)`);
  const tableDecls = exports.filter(e => e.kind === 'table').map(e => `(export "${e.name}" table)`);

  // Infer sections from binary by scanning section IDs
  const sections = parseBinarySections(buffer);

  return {
    analysis: {
      source: 'wasm',
      exports,
      imports,
      sections,
      funcCount,
      memoryDecls,
      globalDecls,
      tableDecls,
      byteSize: buffer.byteLength,
    },
  };
}

function parseBinarySections(buffer: ArrayBuffer): string[] {
  const sectionNames: Record<number, string> = {
    0: 'custom',
    1: 'type',
    2: 'import',
    3: 'function',
    4: 'table',
    5: 'memory',
    6: 'global',
    7: 'export',
    8: 'start',
    9: 'element',
    10: 'code',
    11: 'data',
    12: 'data count',
  };

  const bytes = new Uint8Array(buffer);
  const sections: string[] = [];
  let pos = 8; // skip magic (4) + version (4)

  while (pos < bytes.length) {
    const id = bytes[pos];
    pos++;
    // Read LEB128 section size
    let size = 0;
    let shift = 0;
    while (pos < bytes.length) {
      const byte = bytes[pos++];
      size |= (byte & 0x7f) << shift;
      shift += 7;
      if ((byte & 0x80) === 0) break;
    }
    const name = sectionNames[id] ?? `unknown(${id})`;
    if (!sections.includes(name)) sections.push(name);
    pos += size;
  }

  return sections;
}

// ── Collapsible section ────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  count,
  badge,
  children,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  badge?: string;
  children: preact.ComponentChildren;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div class="bg-surface border border-border rounded-lg overflow-hidden">
      <button
        class="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/5 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div class="flex items-center gap-2">
          <span class="text-sm font-medium">{title}</span>
          {count !== undefined && (
            <span class={`text-xs px-2 py-0.5 rounded-full font-mono ${count === 0 ? 'bg-border text-text-muted' : 'bg-accent/20 text-accent'}`}>
              {count}
            </span>
          )}
          {badge && (
            <span class="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">{badge}</span>
          )}
        </div>
        <span class="text-text-muted text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && <div class="px-4 pb-4 pt-1">{children}</div>}
    </div>
  );
}

// ── Kind badge ────────────────────────────────────────────────────────────────

const kindColors: Record<string, string> = {
  function: 'bg-purple-500/20 text-purple-400',
  func: 'bg-purple-500/20 text-purple-400',
  memory: 'bg-blue-500/20 text-blue-400',
  global: 'bg-yellow-500/20 text-yellow-400',
  table: 'bg-green-500/20 text-green-400',
  tag: 'bg-orange-500/20 text-orange-400',
};

function KindBadge({ kind }: { kind: string }) {
  const cls = kindColors[kind] ?? 'bg-border text-text-muted';
  return <span class={`text-xs px-2 py-0.5 rounded font-mono ${cls}`}>{kind}</span>;
}

// ── Main component ─────────────────────────────────────────────────────────────

const SAMPLE_WAT = `(module
  (import "env" "memory" (memory 1))
  (import "env" "log" (func $log (param i32 i32)))

  (global $counter (mut i32) (i32.const 0))

  (table 1 funcref)

  (func $add (export "add") (param $a i32) (param $b i32) (result i32)
    local.get $a
    local.get $b
    i32.add
  )

  (func $increment (export "increment") (result i32)
    global.get $counter
    i32.const 1
    i32.add
    global.set $counter
    global.get $counter
  )

  (export "counter" (global $counter))
)`;

export default function WasmModuleExplorer() {
  const [watInput, setWatInput] = useState('');
  const [analysis, setAnalysis] = useState<WasmAnalysis | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [activeTab, setActiveTab] = useState<'wat' | 'wasm'>('wat');
  const [dragOver, setDragOver] = useState(false);

  function reset() {
    setAnalysis(null);
    setError('');
  }

  function handleAnalyzeWat() {
    reset();
    if (!watInput.trim()) {
      setError('Please paste WAT source code before analyzing.');
      return;
    }
    const { analysis: a, error: e } = parseWat(watInput);
    if (e) setError(e);
    else setAnalysis(a!);
  }

  function loadSample() {
    setWatInput(SAMPLE_WAT);
    setError('');
    setAnalysis(null);
  }

  const handleWasmFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.wasm')) {
      setError('Please upload a .wasm binary file.');
      return;
    }
    reset();
    setLoading(true);
    setFileName(file.name);
    try {
      const buffer = await file.arrayBuffer();
      const { analysis: a, error: e } = await analyzeWasm(buffer);
      if (e) setError(e);
      else setAnalysis(a!);
    } catch (ex: unknown) {
      setError(`Failed to read file: ${ex instanceof Error ? ex.message : String(ex)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  function handleFileInput(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleWasmFile(file);
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer?.files[0];
    if (file) {
      setActiveTab('wasm');
      handleWasmFile(file);
    }
  }

  return (
    <div class="space-y-5">
      {/* Tab switcher */}
      <div class="flex gap-1">
        {(['wat', 'wasm'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); reset(); }}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
              activeTab === tab
                ? 'bg-accent text-white border-accent'
                : 'bg-surface border-border text-text-muted hover:text-text'
            }`}
          >
            {tab === 'wat' ? 'WAT Text Input' : '.wasm Binary Upload'}
          </button>
        ))}
      </div>

      {/* WAT input panel */}
      {activeTab === 'wat' && (
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          <div class="flex items-center justify-between flex-wrap gap-2">
            <label class="text-sm font-medium">Paste WAT (WebAssembly Text Format) source</label>
            <button
              onClick={loadSample}
              class="text-xs px-3 py-1.5 bg-accent/10 text-accent border border-accent/30 rounded hover:bg-accent/20 transition-colors"
            >
              Load sample
            </button>
          </div>
          <textarea
            class="w-full h-52 font-mono text-xs bg-bg border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-text-muted"
            placeholder={"(module\n  (import \"env\" \"log\" (func $log (param i32)))\n  (func $main (export \"main\") (result i32)\n    i32.const 42\n  )\n  (memory 1)\n  (export \"mem\" (memory 0))\n)"}
            value={watInput}
            onInput={(e) => setWatInput((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
          <button
            class="px-5 py-2 bg-accent hover:bg-accent/90 text-white rounded-lg text-sm font-medium transition-colors"
            onClick={handleAnalyzeWat}
          >
            Analyze WAT
          </button>
        </div>
      )}

      {/* WASM binary upload panel */}
      {activeTab === 'wasm' && (
        <div class="space-y-3">
          <div
            class={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
              dragOver ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
          >
            <div class="text-3xl mb-3">&#x1F4E6;</div>
            <p class="text-text-muted text-sm mb-1">Drag & drop a <code class="font-mono text-accent">.wasm</code> file here</p>
            <p class="text-text-muted text-xs mb-4">or click the button below to browse</p>
            <label class="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg cursor-pointer text-sm font-medium hover:bg-accent/90 transition-colors">
              <span>Choose .wasm file</span>
              <input
                type="file"
                accept=".wasm"
                class="hidden"
                onChange={handleFileInput}
              />
            </label>
            {fileName && (
              <p class="mt-3 text-xs text-text-muted font-mono">{fileName}</p>
            )}
          </div>
          <p class="text-xs text-text-muted">
            Uses <code class="font-mono">WebAssembly.compile()</code> and <code class="font-mono">WebAssembly.Module.exports/imports()</code> browser APIs.
            No data is sent to any server — analysis runs entirely in your browser.
          </p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div class="flex items-center gap-3 p-4 bg-surface border border-border rounded-lg text-sm text-text-muted">
          <span class="animate-spin">&#x21BB;</span>
          Compiling WebAssembly module…
        </div>
      )}

      {/* Error */}
      {error && (
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm font-mono whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Results */}
      {analysis && (
        <div class="space-y-3">
          {/* Summary bar */}
          <div class="bg-surface border border-border rounded-lg p-4">
            <div class="flex items-center gap-2 mb-3 flex-wrap">
              <span class="text-sm font-semibold">Module Summary</span>
              <span class={`text-xs px-2 py-0.5 rounded-full font-mono ${analysis.source === 'wasm' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'}`}>
                {analysis.source === 'wasm' ? 'binary .wasm' : 'text WAT'}
              </span>
              {analysis.byteSize !== undefined && (
                <span class="text-xs text-text-muted font-mono">{(analysis.byteSize / 1024).toFixed(1)} KB</span>
              )}
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Exports', value: analysis.exports.length, color: 'text-accent' },
                { label: 'Imports', value: analysis.imports.length, color: 'text-blue-400' },
                { label: 'Functions', value: analysis.funcCount, color: 'text-purple-400' },
                { label: 'Sections', value: analysis.sections.length, color: 'text-yellow-400' },
              ].map(({ label, value, color }) => (
                <div key={label} class="bg-bg rounded-lg p-3 text-center">
                  <div class={`text-2xl font-bold ${color}`}>{value}</div>
                  <div class="text-xs text-text-muted mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Exports */}
          <CollapsibleSection title="Exports" count={analysis.exports.length} defaultOpen={true}>
            {analysis.exports.length === 0 ? (
              <p class="text-sm text-text-muted">No exports found.</p>
            ) : (
              <div class="space-y-1">
                {analysis.exports.map((exp, i) => (
                  <div key={i} class="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0">
                    <KindBadge kind={exp.kind} />
                    <code class="text-sm font-mono text-text flex-1">{exp.name}</code>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Imports */}
          <CollapsibleSection title="Imports" count={analysis.imports.length} defaultOpen={true}>
            {analysis.imports.length === 0 ? (
              <p class="text-sm text-text-muted">No imports found.</p>
            ) : (
              <div class="space-y-1">
                {analysis.imports.map((imp, i) => (
                  <div key={i} class="flex items-center gap-3 py-1.5 border-b border-border/50 last:border-0 flex-wrap">
                    <KindBadge kind={imp.kind} />
                    <code class="text-sm font-mono text-text-muted">{imp.module}</code>
                    <span class="text-text-muted text-xs">→</span>
                    <code class="text-sm font-mono text-text">{imp.name}</code>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Sections */}
          <CollapsibleSection title="Sections Detected" count={analysis.sections.length} defaultOpen={true}>
            {analysis.sections.length === 0 ? (
              <p class="text-sm text-text-muted">No sections detected.</p>
            ) : (
              <div class="flex flex-wrap gap-2">
                {analysis.sections.map((sec) => (
                  <span key={sec} class="font-mono text-xs px-3 py-1.5 bg-bg border border-border rounded text-text">
                    {sec}
                  </span>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Memory declarations */}
          <CollapsibleSection
            title="Memory Declarations"
            count={analysis.memoryDecls.length}
            defaultOpen={analysis.memoryDecls.length > 0}
          >
            {analysis.memoryDecls.length === 0 ? (
              <p class="text-sm text-text-muted">No memory declarations found (memory may be imported).</p>
            ) : (
              <div class="space-y-1">
                {analysis.memoryDecls.map((m, i) => (
                  <div key={i} class="font-mono text-xs bg-bg border border-border rounded px-3 py-2 text-blue-400">
                    {m}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Global declarations */}
          <CollapsibleSection
            title="Global Declarations"
            count={analysis.globalDecls.length}
            defaultOpen={analysis.globalDecls.length > 0}
          >
            {analysis.globalDecls.length === 0 ? (
              <p class="text-sm text-text-muted">No global declarations found.</p>
            ) : (
              <div class="space-y-1">
                {analysis.globalDecls.map((g, i) => (
                  <div key={i} class="font-mono text-xs bg-bg border border-border rounded px-3 py-2 text-yellow-400">
                    {g}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Table declarations */}
          <CollapsibleSection
            title="Table Declarations"
            count={analysis.tableDecls.length}
            defaultOpen={analysis.tableDecls.length > 0}
          >
            {analysis.tableDecls.length === 0 ? (
              <p class="text-sm text-text-muted">No table declarations found.</p>
            ) : (
              <div class="space-y-1">
                {analysis.tableDecls.map((t, i) => (
                  <div key={i} class="font-mono text-xs bg-bg border border-border rounded px-3 py-2 text-green-400">
                    {t}
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Functions count note */}
          <CollapsibleSection
            title="Function Count"
            badge={`${analysis.funcCount} defined`}
            defaultOpen={false}
          >
            <p class="text-sm text-text-muted">
              This module defines <span class="font-semibold text-text">{analysis.funcCount}</span> function{analysis.funcCount !== 1 ? 's' : ''}.
              {analysis.imports.filter(i => i.kind === 'func' || i.kind === 'function').length > 0 && (
                <> Additionally, {analysis.imports.filter(i => i.kind === 'func' || i.kind === 'function').length} function{analysis.imports.filter(i => i.kind === 'func' || i.kind === 'function').length !== 1 ? 's' : ''} are imported from the host environment.</>
              )}
            </p>
          </CollapsibleSection>
        </div>
      )}
    </div>
  );
}
