import { useState } from 'preact/hooks';

interface BiomeConfig {
  formatter: {
    enabled: boolean;
    indentStyle: 'tab' | 'space';
    indentWidth: number;
    lineWidth: number;
    lineEnding: 'lf' | 'crlf' | 'cr';
  };
  linter: {
    enabled: boolean;
    rules: {
      recommended: boolean;
      style: { noVar: boolean; useConst: boolean; useSingleVarDeclarator: boolean };
      correctness: { noUnusedVariables: boolean; useExhaustiveDependencies: boolean };
      suspicious: { noExplicitAny: boolean; noDoubleEquals: boolean };
      complexity: { noExtraBooleanCast: boolean; useFlatMap: boolean };
      a11y: { useAltText: boolean; noAccessKey: boolean };
    };
  };
  organizeImports: { enabled: boolean };
  javascript: {
    formatter: {
      quoteStyle: 'single' | 'double';
      trailingCommas: 'none' | 'es5' | 'all';
      semicolons: 'always' | 'asNeeded';
      arrowParentheses: 'always' | 'asNeeded';
      bracketSpacing: boolean;
      bracketSameLine: boolean;
    };
  };
}

const DEFAULT_CONFIG: BiomeConfig = {
  formatter: {
    enabled: true,
    indentStyle: 'tab',
    indentWidth: 2,
    lineWidth: 80,
    lineEnding: 'lf',
  },
  linter: {
    enabled: true,
    rules: {
      recommended: true,
      style: { noVar: true, useConst: true, useSingleVarDeclarator: false },
      correctness: { noUnusedVariables: true, useExhaustiveDependencies: true },
      suspicious: { noExplicitAny: false, noDoubleEquals: true },
      complexity: { noExtraBooleanCast: true, useFlatMap: false },
      a11y: { useAltText: false, noAccessKey: false },
    },
  },
  organizeImports: { enabled: true },
  javascript: {
    formatter: {
      quoteStyle: 'double',
      trailingCommas: 'es5',
      semicolons: 'always',
      arrowParentheses: 'always',
      bracketSpacing: true,
      bracketSameLine: false,
    },
  },
};

function buildBiomeJson(cfg: BiomeConfig): string {
  const obj: Record<string, unknown> = {
    $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
    organizeImports: { enabled: cfg.organizeImports.enabled },
    formatter: {
      enabled: cfg.formatter.enabled,
      indentStyle: cfg.formatter.indentStyle,
      indentWidth: cfg.formatter.indentWidth,
      lineWidth: cfg.formatter.lineWidth,
      lineEnding: cfg.formatter.lineEnding,
    },
    linter: {
      enabled: cfg.linter.enabled,
      rules: {},
    },
    javascript: {
      formatter: {
        quoteStyle: cfg.javascript.formatter.quoteStyle,
        trailingCommas: cfg.javascript.formatter.trailingCommas,
        semicolons: cfg.javascript.formatter.semicolons,
        arrowParentheses: cfg.javascript.formatter.arrowParentheses,
        bracketSpacing: cfg.javascript.formatter.bracketSpacing,
        bracketSameLine: cfg.javascript.formatter.bracketSameLine,
      },
    },
  };

  const rules: Record<string, Record<string, unknown>> = {};

  if (cfg.linter.rules.recommended) {
    rules.all = { recommended: true };
  }

  const styleRules: Record<string, string> = {};
  if (cfg.linter.rules.style.noVar) styleRules.noVar = 'error';
  if (cfg.linter.rules.style.useConst) styleRules.useConst = 'error';
  if (cfg.linter.rules.style.useSingleVarDeclarator) styleRules.useSingleVarDeclarator = 'warn';
  if (Object.keys(styleRules).length) rules.style = styleRules;

  const correctnessRules: Record<string, string> = {};
  if (cfg.linter.rules.correctness.noUnusedVariables) correctnessRules.noUnusedVariables = 'warn';
  if (cfg.linter.rules.correctness.useExhaustiveDependencies) correctnessRules.useExhaustiveDependencies = 'warn';
  if (Object.keys(correctnessRules).length) rules.correctness = correctnessRules;

  const suspiciousRules: Record<string, string> = {};
  if (cfg.linter.rules.suspicious.noExplicitAny) suspiciousRules.noExplicitAny = 'error';
  if (cfg.linter.rules.suspicious.noDoubleEquals) suspiciousRules.noDoubleEquals = 'error';
  if (Object.keys(suspiciousRules).length) rules.suspicious = suspiciousRules;

  const complexityRules: Record<string, string> = {};
  if (cfg.linter.rules.complexity.noExtraBooleanCast) complexityRules.noExtraBooleanCast = 'error';
  if (cfg.linter.rules.complexity.useFlatMap) complexityRules.useFlatMap = 'warn';
  if (Object.keys(complexityRules).length) rules.complexity = complexityRules;

  const a11yRules: Record<string, string> = {};
  if (cfg.linter.rules.a11y.useAltText) a11yRules.useAltText = 'error';
  if (cfg.linter.rules.a11y.noAccessKey) a11yRules.noAccessKey = 'warn';
  if (Object.keys(a11yRules).length) rules.a11y = a11yRules;

  (obj.linter as Record<string, unknown>).rules = rules;

  return JSON.stringify(obj, null, 2);
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label class="flex items-center gap-2 cursor-pointer">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        class={`relative w-9 h-5 rounded-full transition-colors ${checked ? 'bg-accent' : 'bg-border'}`}
      >
        <span class={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
      </button>
      <span class="text-sm">{label}</span>
    </label>
  );
}

function Section({ title, children }: { title: string; children: preact.ComponentChildren }) {
  return (
    <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
      <h3 class="text-sm font-semibold text-text-muted uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export default function BiomeConfigGenerator() {
  const [cfg, setCfg] = useState<BiomeConfig>(DEFAULT_CONFIG);
  const [copied, setCopied] = useState(false);

  const update = (path: string[], value: unknown) => {
    setCfg(prev => {
      const next = JSON.parse(JSON.stringify(prev)) as BiomeConfig;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let cur: any = next;
      for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]];
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  const output = buildBiomeJson(cfg);

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: controls */}
      <div class="space-y-4">
        {/* Formatter */}
        <Section title="Formatter">
          <Toggle checked={cfg.formatter.enabled} onChange={v => update(['formatter', 'enabled'], v)} label="Enable formatter" />
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">Indent style</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.formatter.indentStyle}
                onChange={e => update(['formatter', 'indentStyle'], (e.target as HTMLSelectElement).value)}
              >
                <option value="tab">Tab</option>
                <option value="space">Space</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Indent width</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.formatter.indentWidth}
                onChange={e => update(['formatter', 'indentWidth'], parseInt((e.target as HTMLSelectElement).value))}
              >
                <option value="2">2</option>
                <option value="4">4</option>
                <option value="8">8</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Line width</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.formatter.lineWidth}
                onChange={e => update(['formatter', 'lineWidth'], parseInt((e.target as HTMLSelectElement).value))}
              >
                <option value="80">80</option>
                <option value="100">100</option>
                <option value="120">120</option>
                <option value="160">160</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Line ending</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.formatter.lineEnding}
                onChange={e => update(['formatter', 'lineEnding'], (e.target as HTMLSelectElement).value)}
              >
                <option value="lf">LF (Unix)</option>
                <option value="crlf">CRLF (Windows)</option>
                <option value="cr">CR</option>
              </select>
            </div>
          </div>
        </Section>

        {/* JavaScript Formatter */}
        <Section title="JavaScript Formatter">
          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="text-xs text-text-muted block mb-1">Quote style</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.javascript.formatter.quoteStyle}
                onChange={e => update(['javascript', 'formatter', 'quoteStyle'], (e.target as HTMLSelectElement).value)}
              >
                <option value="double">Double "…"</option>
                <option value="single">Single '…'</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Trailing commas</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.javascript.formatter.trailingCommas}
                onChange={e => update(['javascript', 'formatter', 'trailingCommas'], (e.target as HTMLSelectElement).value)}
              >
                <option value="none">None</option>
                <option value="es5">ES5</option>
                <option value="all">All</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Semicolons</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.javascript.formatter.semicolons}
                onChange={e => update(['javascript', 'formatter', 'semicolons'], (e.target as HTMLSelectElement).value)}
              >
                <option value="always">Always</option>
                <option value="asNeeded">As needed</option>
              </select>
            </div>
            <div>
              <label class="text-xs text-text-muted block mb-1">Arrow parens</label>
              <select
                class="w-full bg-bg border border-border rounded px-2 py-1.5 text-sm"
                value={cfg.javascript.formatter.arrowParentheses}
                onChange={e => update(['javascript', 'formatter', 'arrowParentheses'], (e.target as HTMLSelectElement).value)}
              >
                <option value="always">Always</option>
                <option value="asNeeded">As needed</option>
              </select>
            </div>
          </div>
          <div class="flex gap-4 flex-wrap">
            <Toggle checked={cfg.javascript.formatter.bracketSpacing} onChange={v => update(['javascript', 'formatter', 'bracketSpacing'], v)} label="Bracket spacing" />
            <Toggle checked={cfg.javascript.formatter.bracketSameLine} onChange={v => update(['javascript', 'formatter', 'bracketSameLine'], v)} label="Bracket same line (JSX)" />
          </div>
        </Section>

        {/* Linter */}
        <Section title="Linter">
          <Toggle checked={cfg.linter.enabled} onChange={v => update(['linter', 'enabled'], v)} label="Enable linter" />
          <Toggle checked={cfg.linter.rules.recommended} onChange={v => update(['linter', 'rules', 'recommended'], v)} label="All recommended rules" />
          <div class="space-y-2 pt-2 border-t border-border">
            <p class="text-xs text-text-muted font-semibold">Style rules</p>
            <Toggle checked={cfg.linter.rules.style.noVar} onChange={v => update(['linter', 'rules', 'style', 'noVar'], v)} label="noVar — disallow var declarations" />
            <Toggle checked={cfg.linter.rules.style.useConst} onChange={v => update(['linter', 'rules', 'style', 'useConst'], v)} label="useConst — prefer const" />
            <Toggle checked={cfg.linter.rules.style.useSingleVarDeclarator} onChange={v => update(['linter', 'rules', 'style', 'useSingleVarDeclarator'], v)} label="useSingleVarDeclarator" />
          </div>
          <div class="space-y-2 pt-2 border-t border-border">
            <p class="text-xs text-text-muted font-semibold">Correctness rules</p>
            <Toggle checked={cfg.linter.rules.correctness.noUnusedVariables} onChange={v => update(['linter', 'rules', 'correctness', 'noUnusedVariables'], v)} label="noUnusedVariables" />
            <Toggle checked={cfg.linter.rules.correctness.useExhaustiveDependencies} onChange={v => update(['linter', 'rules', 'correctness', 'useExhaustiveDependencies'], v)} label="useExhaustiveDependencies (React)" />
          </div>
          <div class="space-y-2 pt-2 border-t border-border">
            <p class="text-xs text-text-muted font-semibold">Suspicious rules</p>
            <Toggle checked={cfg.linter.rules.suspicious.noExplicitAny} onChange={v => update(['linter', 'rules', 'suspicious', 'noExplicitAny'], v)} label="noExplicitAny (TypeScript)" />
            <Toggle checked={cfg.linter.rules.suspicious.noDoubleEquals} onChange={v => update(['linter', 'rules', 'suspicious', 'noDoubleEquals'], v)} label="noDoubleEquals — require ===" />
          </div>
          <div class="space-y-2 pt-2 border-t border-border">
            <p class="text-xs text-text-muted font-semibold">Complexity rules</p>
            <Toggle checked={cfg.linter.rules.complexity.noExtraBooleanCast} onChange={v => update(['linter', 'rules', 'complexity', 'noExtraBooleanCast'], v)} label="noExtraBooleanCast" />
            <Toggle checked={cfg.linter.rules.complexity.useFlatMap} onChange={v => update(['linter', 'rules', 'complexity', 'useFlatMap'], v)} label="useFlatMap" />
          </div>
          <div class="space-y-2 pt-2 border-t border-border">
            <p class="text-xs text-text-muted font-semibold">Accessibility rules</p>
            <Toggle checked={cfg.linter.rules.a11y.useAltText} onChange={v => update(['linter', 'rules', 'a11y', 'useAltText'], v)} label="useAltText (JSX images)" />
            <Toggle checked={cfg.linter.rules.a11y.noAccessKey} onChange={v => update(['linter', 'rules', 'a11y', 'noAccessKey'], v)} label="noAccessKey" />
          </div>
        </Section>

        {/* Import organizer */}
        <Section title="Import Organizer">
          <Toggle checked={cfg.organizeImports.enabled} onChange={v => update(['organizeImports', 'enabled'], v)} label="Auto-organize imports on format" />
        </Section>
      </div>

      {/* Right: output */}
      <div class="space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-sm font-semibold">biome.json output</span>
          <button
            onClick={handleCopy}
            class="px-3 py-1.5 text-xs bg-accent hover:bg-accent/90 text-white rounded-lg transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-[700px] text-green-400 whitespace-pre-wrap">
          {output}
        </pre>

        {/* Before/after example */}
        <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
          <h4 class="text-xs font-semibold text-text-muted uppercase tracking-wide">Before / After Example</h4>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <p class="text-xs text-red-400 font-semibold mb-1">Before (unformatted)</p>
              <pre class="text-xs font-mono bg-bg rounded p-2 text-text-muted overflow-x-auto">{`var x = 1
const arr = [1,2,3]
function foo(a,b){
return a+b
}`}</pre>
            </div>
            <div>
              <p class="text-xs text-green-400 font-semibold mb-1">After (biome format)</p>
              <pre class="text-xs font-mono bg-bg rounded p-2 text-text-muted overflow-x-auto">{`const x = 1;
const arr = [1, 2, 3];
function foo(a, b) {
${cfg.formatter.indentStyle === 'tab' ? '\t' : ' '.repeat(cfg.formatter.indentWidth)}return a + b;
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
