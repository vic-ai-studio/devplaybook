import { useState } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────

type RuleLevel = 'off' | 'warn' | 'error';

interface RuleEntry {
  name: string;
  category: 'correctness' | 'suspicious' | 'pedantic' | 'style';
  level: RuleLevel;
}

interface PluginToggles {
  import: boolean;
  react: boolean;
  unicorn: boolean;
  typescript: boolean;
}

interface EnvToggles {
  browser: boolean;
  node: boolean;
  es6: boolean;
  es2020: boolean;
  es2022: boolean;
}

// ── Default rules ──────────────────────────────────────────────────────────

const DEFAULT_RULES: RuleEntry[] = [
  // correctness
  { name: 'no-unused-vars', category: 'correctness', level: 'warn' },
  { name: 'no-undef', category: 'correctness', level: 'error' },
  { name: 'no-unreachable', category: 'correctness', level: 'error' },
  { name: 'no-const-assign', category: 'correctness', level: 'error' },
  { name: 'no-dupe-keys', category: 'correctness', level: 'error' },
  { name: 'use-isnan', category: 'correctness', level: 'error' },
  { name: 'valid-typeof', category: 'correctness', level: 'error' },
  // suspicious
  { name: 'no-debugger', category: 'suspicious', level: 'warn' },
  { name: 'no-console', category: 'suspicious', level: 'warn' },
  { name: 'no-empty', category: 'suspicious', level: 'warn' },
  { name: 'no-fallthrough', category: 'suspicious', level: 'warn' },
  { name: 'no-prototype-builtins', category: 'suspicious', level: 'warn' },
  { name: 'no-shadow', category: 'suspicious', level: 'warn' },
  // pedantic
  { name: 'eqeqeq', category: 'pedantic', level: 'warn' },
  { name: 'no-var', category: 'pedantic', level: 'warn' },
  { name: 'prefer-const', category: 'pedantic', level: 'warn' },
  { name: 'no-eval', category: 'pedantic', level: 'error' },
  { name: 'no-implied-eval', category: 'pedantic', level: 'error' },
  // style
  { name: 'camelcase', category: 'style', level: 'warn' },
  { name: 'no-trailing-spaces', category: 'style', level: 'warn' },
  { name: 'semi', category: 'style', level: 'warn' },
  { name: 'quotes', category: 'style', level: 'warn' },
  { name: 'indent', category: 'style', level: 'warn' },
];

const CATEGORIES = ['correctness', 'suspicious', 'pedantic', 'style'] as const;
const LEVELS: RuleLevel[] = ['off', 'warn', 'error'];

const LEVEL_COLOR: Record<RuleLevel, string> = {
  off: 'text-text-muted',
  warn: 'text-yellow-400',
  error: 'text-red-400',
};

// ── Helpers ────────────────────────────────────────────────────────────────

function buildConfig(
  rules: RuleEntry[],
  env: EnvToggles,
  plugins: PluginToggles,
  ignorePatterns: string
): string {
  const rulesObj: Record<string, string> = {};
  for (const r of rules) {
    if (r.level !== 'off') rulesObj[r.name] = r.level;
  }

  const envObj: Record<string, boolean> = {};
  if (env.browser) envObj['browser'] = true;
  if (env.node) envObj['node'] = true;
  if (env.es6) envObj['es6'] = true;
  if (env.es2020) envObj['es2020'] = true;
  if (env.es2022) envObj['es2022'] = true;

  const pluginsArr: string[] = [];
  if (plugins.import) pluginsArr.push('import');
  if (plugins.react) pluginsArr.push('react');
  if (plugins.unicorn) pluginsArr.push('unicorn');
  if (plugins.typescript) pluginsArr.push('typescript');

  const ignorePatternsArr = ignorePatterns
    .split('\n')
    .map(s => s.trim())
    .filter(Boolean);

  const config: Record<string, unknown> = {};
  if (Object.keys(envObj).length > 0) config['env'] = envObj;
  if (pluginsArr.length > 0) config['plugins'] = pluginsArr;
  if (Object.keys(rulesObj).length > 0) config['rules'] = rulesObj;
  if (ignorePatternsArr.length > 0) config['ignorePatterns'] = ignorePatternsArr;

  return JSON.stringify(config, null, 2);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function OxcLintConfigGenerator() {
  const [rules, setRules] = useState<RuleEntry[]>(DEFAULT_RULES);
  const [env, setEnv] = useState<EnvToggles>({
    browser: true,
    node: false,
    es6: true,
    es2020: false,
    es2022: false,
  });
  const [plugins, setPlugins] = useState<PluginToggles>({
    import: false,
    react: false,
    unicorn: false,
    typescript: false,
  });
  const [ignorePatterns, setIgnorePatterns] = useState('node_modules\ndist\nbuild\n.next');
  const [copied, setCopied] = useState(false);

  const output = buildConfig(rules, env, plugins, ignorePatterns);

  function setRuleLevel(name: string, level: RuleLevel) {
    setRules(prev => prev.map(r => (r.name === name ? { ...r, level } : r)));
  }

  function toggleEnv(key: keyof EnvToggles) {
    setEnv(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function togglePlugin(key: keyof PluginToggles) {
    setPlugins(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function setCategoryLevel(cat: typeof CATEGORIES[number], level: RuleLevel) {
    setRules(prev =>
      prev.map(r => (r.category === cat ? { ...r, level } : r))
    );
  }

  return (
    <div class="space-y-6">
      {/* Environments */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">Environments</h2>
        <div class="flex flex-wrap gap-3">
          {(Object.keys(env) as Array<keyof EnvToggles>).map(key => (
            <label key={key} class="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={env[key]}
                onChange={() => toggleEnv(key)}
                class="accent-accent"
              />
              <span class="text-sm font-mono text-text-muted">{key}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Plugins */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">Plugins</h2>
        <div class="flex flex-wrap gap-3">
          {(Object.keys(plugins) as Array<keyof PluginToggles>).map(key => (
            <label key={key} class="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={plugins[key]}
                onChange={() => togglePlugin(key)}
                class="accent-accent"
              />
              <span class="text-sm font-mono text-text-muted">{key}</span>
            </label>
          ))}
        </div>
      </section>

      {/* Rules by category */}
      {CATEGORIES.map(cat => {
        const catRules = rules.filter(r => r.category === cat);
        return (
          <section key={cat} class="rounded-lg border border-border bg-surface p-4">
            <div class="mb-3 flex items-center justify-between">
              <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide capitalize">
                {cat}
              </h2>
              <div class="flex gap-2">
                {LEVELS.map(lvl => (
                  <button
                    key={lvl}
                    onClick={() => setCategoryLevel(cat, lvl)}
                    class="rounded px-2 py-0.5 text-xs border border-border bg-bg text-text-muted hover:border-accent hover:text-accent transition-colors"
                  >
                    All {lvl}
                  </button>
                ))}
              </div>
            </div>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {catRules.map(rule => (
                <div key={rule.name} class="flex items-center justify-between gap-2">
                  <span class="font-mono text-xs text-text-muted truncate">{rule.name}</span>
                  <div class="flex gap-1">
                    {LEVELS.map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => setRuleLevel(rule.name, lvl)}
                        class={`rounded px-2 py-0.5 text-xs border transition-colors ${
                          rule.level === lvl
                            ? `border-accent bg-accent/10 ${LEVEL_COLOR[lvl]} font-semibold`
                            : 'border-border bg-bg text-text-muted hover:border-accent'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}

      {/* Ignore patterns */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">Ignore Patterns</h2>
        <textarea
          value={ignorePatterns}
          onInput={(e) => setIgnorePatterns((e.target as HTMLTextAreaElement).value)}
          rows={4}
          placeholder="node_modules&#10;dist&#10;build"
          class="w-full resize-y rounded border border-border bg-bg px-3 py-2 font-mono text-sm text-text-muted focus:border-accent focus:outline-none"
        />
        <p class="mt-1 text-xs text-text-muted">One pattern per line</p>
      </section>

      {/* Output */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">
            oxlint.json
          </h2>
          <button
            onClick={handleCopy}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="overflow-auto rounded border border-border bg-bg p-4 text-xs text-accent">
          {output}
        </pre>
      </section>
    </div>
  );
}
