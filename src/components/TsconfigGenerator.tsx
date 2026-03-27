import { useState } from 'preact/hooks';

type Preset = 'strict' | 'base' | 'nextjs' | 'react' | 'node' | 'deno';
type Target = 'ES2019' | 'ES2020' | 'ES2022' | 'ES2023' | 'ESNext';
type Module = 'commonjs' | 'ESNext' | 'Node16' | 'NodeNext' | 'preserve';
type ModuleResolution = 'node' | 'bundler' | 'node16' | 'nodenext';

interface TsconfigOptions {
  preset: Preset;
  target: Target;
  module: Module;
  moduleResolution: ModuleResolution;
  strict: boolean;
  strictNullChecks: boolean;
  noImplicitAny: boolean;
  strictFunctionTypes: boolean;
  strictBindCallApply: boolean;
  noUnusedLocals: boolean;
  noUnusedParameters: boolean;
  noImplicitReturns: boolean;
  noFallthroughCasesInSwitch: boolean;
  esModuleInterop: boolean;
  allowSyntheticDefaultImports: boolean;
  skipLibCheck: boolean;
  forceConsistentCasingInFileNames: boolean;
  declaration: boolean;
  declarationMap: boolean;
  sourceMap: boolean;
  experimentalDecorators: boolean;
  emitDecoratorMetadata: boolean;
  resolveJsonModule: boolean;
  isolatedModules: boolean;
  allowJs: boolean;
  checkJs: boolean;
  jsx: 'preserve' | 'react' | 'react-jsx' | 'react-jsxdev' | 'none';
  useJsx: boolean;
  outDir: string;
  rootDir: string;
  baseUrl: string;
  usePaths: boolean;
  paths: string;
  lib: string[];
}

const PRESET_CONFIGS: Record<Preset, Partial<TsconfigOptions>> = {
  strict: {
    target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
    strict: true, strictNullChecks: true, noImplicitAny: true,
    strictFunctionTypes: true, strictBindCallApply: true,
    noUnusedLocals: true, noUnusedParameters: true, noImplicitReturns: true,
    noFallthroughCasesInSwitch: true, esModuleInterop: true,
    skipLibCheck: true, forceConsistentCasingInFileNames: true,
    declaration: true, sourceMap: true, resolveJsonModule: true,
    isolatedModules: true, useJsx: false,
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
  },
  base: {
    target: 'ES2020', module: 'commonjs', moduleResolution: 'node',
    strict: false, strictNullChecks: false, noImplicitAny: false,
    esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, sourceMap: true,
    resolveJsonModule: true, useJsx: false,
    lib: ['ES2020'],
  },
  nextjs: {
    target: 'ES2017', module: 'ESNext', moduleResolution: 'bundler',
    strict: true, strictNullChecks: true, noImplicitAny: true,
    strictFunctionTypes: true, esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, resolveJsonModule: true,
    isolatedModules: true, useJsx: true, jsx: 'preserve',
    lib: ['dom', 'dom.iterable', 'esnext'],
    allowJs: true,
  },
  react: {
    target: 'ES2020', module: 'ESNext', moduleResolution: 'bundler',
    strict: true, strictNullChecks: true, noImplicitAny: true,
    esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, resolveJsonModule: true,
    isolatedModules: true, useJsx: true, jsx: 'react-jsx',
    lib: ['ES2020', 'DOM', 'DOM.Iterable'],
  },
  node: {
    target: 'ES2022', module: 'Node16', moduleResolution: 'node16',
    strict: true, strictNullChecks: true, noImplicitAny: true,
    noUnusedLocals: true, noUnusedParameters: true,
    esModuleInterop: true, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, declaration: true,
    declarationMap: true, sourceMap: true, resolveJsonModule: true,
    useJsx: false, lib: ['ES2022'],
  },
  deno: {
    target: 'ESNext', module: 'ESNext', moduleResolution: 'bundler',
    strict: true, strictNullChecks: true, noImplicitAny: true,
    noUnusedLocals: true, noUnusedParameters: true, noImplicitReturns: true,
    esModuleInterop: false, skipLibCheck: true,
    forceConsistentCasingInFileNames: true, useJsx: false,
    lib: ['ESNext', 'DOM'],
  },
};

const DEFAULT: TsconfigOptions = {
  preset: 'strict',
  target: 'ES2022', module: 'ESNext', moduleResolution: 'bundler',
  strict: true, strictNullChecks: true, noImplicitAny: true,
  strictFunctionTypes: true, strictBindCallApply: true,
  noUnusedLocals: true, noUnusedParameters: true, noImplicitReturns: true,
  noFallthroughCasesInSwitch: true, esModuleInterop: true,
  allowSyntheticDefaultImports: true, skipLibCheck: true,
  forceConsistentCasingInFileNames: true, declaration: true,
  declarationMap: false, sourceMap: true, experimentalDecorators: false,
  emitDecoratorMetadata: false, resolveJsonModule: true,
  isolatedModules: true, allowJs: false, checkJs: false,
  jsx: 'react-jsx', useJsx: false,
  outDir: './dist', rootDir: './src', baseUrl: '.', usePaths: false,
  paths: '"@/*": ["./src/*"]',
  lib: ['ES2022', 'DOM', 'DOM.Iterable'],
};

const OPTION_DOCS: Record<string, string> = {
  strict: 'Enables all strict type-checking options. Recommended for all new projects.',
  strictNullChecks: 'null and undefined are distinct types. Prevents "cannot read properties of null" at runtime.',
  noImplicitAny: 'Variables without explicit types that would be inferred as any will error.',
  strictFunctionTypes: 'Checks function parameter types more strictly using contravariance.',
  strictBindCallApply: 'Checks that bind/call/apply are invoked with correct argument types.',
  noUnusedLocals: 'Error on unused local variables. Keeps code clean.',
  noUnusedParameters: 'Error on unused function parameters.',
  noImplicitReturns: 'All code paths in a function must return a value.',
  noFallthroughCasesInSwitch: 'Errors on switch-case fallthrough. Prevents accidental bugs.',
  esModuleInterop: 'Enables CommonJS/ESM interop. Required when using require() style modules.',
  skipLibCheck: 'Skip type checking of .d.ts files. Speeds up compilation.',
  forceConsistentCasingInFileNames: 'Error on import paths with wrong casing. Prevents Linux/macOS differences.',
  declaration: 'Generates .d.ts declaration files alongside JS output.',
  declarationMap: 'Generates sourcemaps for .d.ts files. Enables go-to-source in editors.',
  sourceMap: 'Generates .js.map files for debugging in browser DevTools.',
  experimentalDecorators: 'Enables ES Decorators (class decorators, method decorators).',
  emitDecoratorMetadata: 'Emit metadata for decorators (required by TypeORM, NestJS).',
  resolveJsonModule: 'Allows importing .json files directly with types.',
  isolatedModules: 'Ensures each file can be transpiled independently (required by esbuild/Babel).',
  allowJs: 'Allow JavaScript files in your TypeScript project.',
  checkJs: 'Report errors in .js files. Requires allowJs.',
};

function buildTsconfig(opts: TsconfigOptions): string {
  const co: Record<string, unknown> = {};

  if (opts.useJsx && opts.jsx !== 'none') co.jsx = opts.jsx;
  co.target = opts.target;
  co.module = opts.module;
  if (opts.lib.length) co.lib = opts.lib;
  co.moduleResolution = opts.moduleResolution;
  if (opts.baseUrl && opts.baseUrl !== '.') co.baseUrl = opts.baseUrl;
  if (opts.usePaths) {
    try { co.paths = JSON.parse('{' + opts.paths + '}'); } catch { /* ignore */ }
  }
  if (opts.outDir) co.outDir = opts.outDir;
  if (opts.rootDir) co.rootDir = opts.rootDir;
  if (opts.strict) co.strict = true;
  else {
    if (opts.strictNullChecks) co.strictNullChecks = true;
    if (opts.noImplicitAny) co.noImplicitAny = true;
    if (opts.strictFunctionTypes) co.strictFunctionTypes = true;
    if (opts.strictBindCallApply) co.strictBindCallApply = true;
  }
  if (opts.noUnusedLocals) co.noUnusedLocals = true;
  if (opts.noUnusedParameters) co.noUnusedParameters = true;
  if (opts.noImplicitReturns) co.noImplicitReturns = true;
  if (opts.noFallthroughCasesInSwitch) co.noFallthroughCasesInSwitch = true;
  if (opts.esModuleInterop) co.esModuleInterop = true;
  if (opts.allowSyntheticDefaultImports) co.allowSyntheticDefaultImports = true;
  if (opts.skipLibCheck) co.skipLibCheck = true;
  if (opts.forceConsistentCasingInFileNames) co.forceConsistentCasingInFileNames = true;
  if (opts.declaration) co.declaration = true;
  if (opts.declarationMap) co.declarationMap = true;
  if (opts.sourceMap) co.sourceMap = true;
  if (opts.experimentalDecorators) co.experimentalDecorators = true;
  if (opts.emitDecoratorMetadata) co.emitDecoratorMetadata = true;
  if (opts.resolveJsonModule) co.resolveJsonModule = true;
  if (opts.isolatedModules) co.isolatedModules = true;
  if (opts.allowJs) co.allowJs = true;
  if (opts.checkJs) co.checkJs = true;

  return JSON.stringify({ compilerOptions: co }, null, 2);
}

function Toggle({ checked, onChange, label, doc }: { checked: boolean; onChange: (v: boolean) => void; label: string; doc?: string }) {
  return (
    <div class="flex items-start gap-2">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative mt-0.5 flex-shrink-0 w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <div>
        <span class="text-sm font-mono">{label}</span>
        {doc && <p class="text-xs text-text-muted mt-0.5">{doc}</p>}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-xs font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export default function TsconfigGenerator() {
  const [opts, setOpts] = useState<TsconfigOptions>(DEFAULT);
  const [copied, setCopied] = useState(false);
  const [activeDoc, setActiveDoc] = useState<string | null>(null);

  const set = (key: keyof TsconfigOptions, value: unknown) => {
    setOpts(prev => ({ ...prev, [key]: value }));
  };

  const applyPreset = (preset: Preset) => {
    const p = PRESET_CONFIGS[preset];
    setOpts(prev => ({ ...prev, ...p, preset }));
  };

  const output = buildTsconfig(opts);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const PRESETS: { id: Preset; label: string; desc: string }[] = [
    { id: 'strict', label: 'Strict', desc: 'Max type safety' },
    { id: 'base', label: 'Base', desc: 'Minimal config' },
    { id: 'nextjs', label: 'Next.js', desc: 'Next.js app' },
    { id: 'react', label: 'React', desc: 'Vite + React' },
    { id: 'node', label: 'Node', desc: 'Node.js backend' },
    { id: 'deno', label: 'Deno', desc: 'Deno runtime' },
  ];

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Controls */}
      <div class="space-y-4">
        {/* Presets */}
        <Section title="Preset">
          <div class="grid grid-cols-3 gap-2">
            {PRESETS.map(p => (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                class={`flex flex-col items-center px-2 py-2 rounded border text-sm transition-colors ${opts.preset === p.id ? 'border-accent bg-accent/10 text-accent' : 'border-border hover:border-accent/50'}`}
              >
                <span class="font-semibold">{p.label}</span>
                <span class="text-xs text-text-muted">{p.desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {/* Compiler Settings */}
        <Section title="Compiler Settings">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">target</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={opts.target} onChange={e => set('target', (e.target as HTMLSelectElement).value as Target)}>
                {(['ES2019','ES2020','ES2022','ES2023','ESNext'] as Target[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">module</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={opts.module} onChange={e => set('module', (e.target as HTMLSelectElement).value)}>
                {['commonjs','ESNext','Node16','NodeNext','preserve'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">moduleResolution</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={opts.moduleResolution} onChange={e => set('moduleResolution', (e.target as HTMLSelectElement).value)}>
                {['node','bundler','node16','nodenext'].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">outDir</label>
              <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={opts.outDir} onInput={e => set('outDir', (e.target as HTMLInputElement).value)} />
            </div>
          </div>

          <Toggle checked={opts.useJsx} onChange={v => set('useJsx', v)} label="Enable JSX" />
          {opts.useJsx && (
            <div>
              <label class="text-xs text-text-muted block mb-1">jsx</label>
              <select class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm" value={opts.jsx} onChange={e => set('jsx', (e.target as HTMLSelectElement).value)}>
                {['preserve','react','react-jsx','react-jsxdev'].map(j => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
          )}
        </Section>

        {/* Type Checking */}
        <Section title="Type Checking">
          <Toggle checked={opts.strict} onChange={v => set('strict', v)} label="strict" doc={OPTION_DOCS.strict} />
          {!opts.strict && (
            <div class="space-y-2 pl-4 border-l-2 border-border">
              <Toggle checked={opts.strictNullChecks} onChange={v => set('strictNullChecks', v)} label="strictNullChecks" doc={OPTION_DOCS.strictNullChecks} />
              <Toggle checked={opts.noImplicitAny} onChange={v => set('noImplicitAny', v)} label="noImplicitAny" doc={OPTION_DOCS.noImplicitAny} />
              <Toggle checked={opts.strictFunctionTypes} onChange={v => set('strictFunctionTypes', v)} label="strictFunctionTypes" doc={OPTION_DOCS.strictFunctionTypes} />
              <Toggle checked={opts.strictBindCallApply} onChange={v => set('strictBindCallApply', v)} label="strictBindCallApply" doc={OPTION_DOCS.strictBindCallApply} />
            </div>
          )}
          <Toggle checked={opts.noUnusedLocals} onChange={v => set('noUnusedLocals', v)} label="noUnusedLocals" doc={OPTION_DOCS.noUnusedLocals} />
          <Toggle checked={opts.noUnusedParameters} onChange={v => set('noUnusedParameters', v)} label="noUnusedParameters" doc={OPTION_DOCS.noUnusedParameters} />
          <Toggle checked={opts.noImplicitReturns} onChange={v => set('noImplicitReturns', v)} label="noImplicitReturns" doc={OPTION_DOCS.noImplicitReturns} />
          <Toggle checked={opts.noFallthroughCasesInSwitch} onChange={v => set('noFallthroughCasesInSwitch', v)} label="noFallthroughCasesInSwitch" doc={OPTION_DOCS.noFallthroughCasesInSwitch} />
        </Section>

        {/* Interop & Output */}
        <Section title="Interop & Output">
          <Toggle checked={opts.esModuleInterop} onChange={v => set('esModuleInterop', v)} label="esModuleInterop" doc={OPTION_DOCS.esModuleInterop} />
          <Toggle checked={opts.skipLibCheck} onChange={v => set('skipLibCheck', v)} label="skipLibCheck" doc={OPTION_DOCS.skipLibCheck} />
          <Toggle checked={opts.forceConsistentCasingInFileNames} onChange={v => set('forceConsistentCasingInFileNames', v)} label="forceConsistentCasingInFileNames" doc={OPTION_DOCS.forceConsistentCasingInFileNames} />
          <Toggle checked={opts.declaration} onChange={v => set('declaration', v)} label="declaration" doc={OPTION_DOCS.declaration} />
          <Toggle checked={opts.declarationMap} onChange={v => set('declarationMap', v)} label="declarationMap" doc={OPTION_DOCS.declarationMap} />
          <Toggle checked={opts.sourceMap} onChange={v => set('sourceMap', v)} label="sourceMap" doc={OPTION_DOCS.sourceMap} />
          <Toggle checked={opts.resolveJsonModule} onChange={v => set('resolveJsonModule', v)} label="resolveJsonModule" doc={OPTION_DOCS.resolveJsonModule} />
          <Toggle checked={opts.isolatedModules} onChange={v => set('isolatedModules', v)} label="isolatedModules" doc={OPTION_DOCS.isolatedModules} />
        </Section>

        {/* Decorators */}
        <Section title="Decorators">
          <Toggle checked={opts.experimentalDecorators} onChange={v => set('experimentalDecorators', v)} label="experimentalDecorators" doc={OPTION_DOCS.experimentalDecorators} />
          {opts.experimentalDecorators && (
            <Toggle checked={opts.emitDecoratorMetadata} onChange={v => set('emitDecoratorMetadata', v)} label="emitDecoratorMetadata" doc={OPTION_DOCS.emitDecoratorMetadata} />
          )}
        </Section>

        {/* Paths */}
        <Section title="Path Aliases">
          <Toggle checked={opts.usePaths} onChange={v => set('usePaths', v)} label="Enable path aliases" />
          {opts.usePaths && (
            <div class="space-y-2">
              <div>
                <label class="text-xs text-text-muted block mb-1">baseUrl</label>
                <input class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono" value={opts.baseUrl} onInput={e => set('baseUrl', (e.target as HTMLInputElement).value)} />
              </div>
              <div>
                <label class="text-xs text-text-muted block mb-1">paths (JSON pairs, e.g. "@/*": ["./src/*"])</label>
                <textarea
                  class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm font-mono resize-none"
                  rows={2}
                  value={opts.paths}
                  onInput={e => set('paths', (e.target as HTMLTextAreaElement).value)}
                />
              </div>
            </div>
          )}
        </Section>
      </div>

      {/* Right: Output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">tsconfig.json</span>
          <button
            onClick={handleCopy}
            class={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${copied ? 'bg-green-600 text-white' : 'bg-accent text-white hover:bg-accent/90'}`}
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-bg border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[600px] text-green-400 whitespace-pre leading-relaxed">{output}</pre>
        <p class="text-xs text-text-muted">Place this file in your project root. Run <code class="bg-surface px-1 rounded">tsc --noEmit</code> to type-check without emitting files.</p>
      </div>
    </div>
  );
}
