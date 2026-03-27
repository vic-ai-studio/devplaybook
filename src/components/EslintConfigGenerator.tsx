import { useState } from 'preact/hooks';

type Preset = 'react' | 'next' | 'node' | 'typescript' | 'vue';

const PRESET_LABELS: Record<Preset, string> = {
  react: 'React',
  next: 'Next.js',
  node: 'Node.js',
  typescript: 'TypeScript',
  vue: 'Vue 3',
};

type ConfigFormat = 'flat' | 'legacy';

const FORMAT_LABELS: Record<ConfigFormat, string> = {
  flat: 'eslint.config.js (Flat, v9+)',
  legacy: '.eslintrc.json (Legacy, v8)',
};

function generateConfig(preset: Preset, format: ConfigFormat, opts: {
  enablePrettier: boolean;
  enableImportPlugin: boolean;
  enableUnusedVars: boolean;
  enableNoConsole: boolean;
  enableA11y: boolean;
  envBrowser: boolean;
  envNode: boolean;
}): string {
  const { enablePrettier, enableImportPlugin, enableUnusedVars, enableNoConsole, enableA11y, envBrowser, envNode } = opts;

  if (format === 'legacy') {
    const extendsArr: string[] = ['eslint:recommended'];
    const plugins: string[] = [];
    const rules: Record<string, unknown> = {};

    if (preset === 'react' || preset === 'next') {
      extendsArr.push('plugin:react/recommended', 'plugin:react-hooks/recommended');
      plugins.push('react', 'react-hooks');
    }
    if (preset === 'next') {
      extendsArr.push('next/core-web-vitals');
    }
    if (preset === 'typescript' || preset === 'next') {
      extendsArr.push('plugin:@typescript-eslint/recommended');
      plugins.push('@typescript-eslint');
    }
    if (preset === 'vue') {
      extendsArr.push('plugin:vue/vue3-recommended');
      plugins.push('vue');
    }
    if (enablePrettier) {
      extendsArr.push('prettier');
    }
    if (enableImportPlugin) {
      plugins.push('import');
      rules['import/order'] = ['warn', { 'newlines-between': 'always' }];
    }
    if (enableA11y && (preset === 'react' || preset === 'next')) {
      plugins.push('jsx-a11y');
      extendsArr.push('plugin:jsx-a11y/recommended');
    }
    if (enableUnusedVars) {
      rules['no-unused-vars'] = ['warn', { argsIgnorePattern: '^_' }];
    }
    if (enableNoConsole) {
      rules['no-console'] = ['warn', { allow: ['warn', 'error'] }];
    }

    const envObj: Record<string, boolean> = {};
    if (envBrowser) envObj['browser'] = true;
    if (envNode) envObj['node'] = true;
    envObj['es2022'] = true;

    const config: Record<string, unknown> = {
      env: envObj,
      extends: extendsArr,
      ...(plugins.length > 0 ? { plugins } : {}),
      rules,
    };

    if (preset === 'typescript' || preset === 'next') {
      config['parser'] = '@typescript-eslint/parser';
      config['parserOptions'] = { ecmaVersion: 'latest', sourceType: 'module' };
    } else {
      config['parserOptions'] = { ecmaVersion: 'latest', sourceType: 'module' };
    }

    return JSON.stringify(config, null, 2);
  }

  // Flat config (v9+)
  const imports: string[] = ['import js from "@eslint/js";'];
  const configBlocks: string[] = ['  js.configs.recommended,'];

  if (preset === 'react' || preset === 'next') {
    imports.push('import reactPlugin from "eslint-plugin-react";', 'import hooksPlugin from "eslint-plugin-react-hooks";');
    configBlocks.push('  reactPlugin.configs.flat.recommended,', '  hooksPlugin.configs.recommended,');
  }
  if (preset === 'typescript' || preset === 'next') {
    imports.push('import tsPlugin from "@typescript-eslint/eslint-plugin";', 'import tsParser from "@typescript-eslint/parser";');
  }
  if (preset === 'vue') {
    imports.push('import vuePlugin from "eslint-plugin-vue";');
    configBlocks.push('  ...vuePlugin.configs["flat/recommended"],');
  }

  const rules: Record<string, unknown> = {};
  if (enableUnusedVars) rules['no-unused-vars'] = ['warn', { argsIgnorePattern: '^_' }];
  if (enableNoConsole) rules['no-console'] = ['warn', { allow: ['warn', 'error'] }];
  if (enableImportPlugin) {
    imports.push('import importPlugin from "eslint-plugin-import";');
    rules['import/order'] = ['warn', { 'newlines-between': 'always' }];
  }

  const mainBlock = `  {
    files: ["**/*.{js,mjs,cjs${preset === 'typescript' || preset === 'next' ? ',ts,tsx' : preset === 'react' ? ',jsx,tsx' : ''}}"],
    ${(preset === 'typescript' || preset === 'next') ? `languageOptions: { parser: tsParser, parserOptions: { ecmaVersion: "latest", sourceType: "module" } },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ${Object.entries(rules).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(',\n      ')}
    },` : `rules: {
      ${Object.entries(rules).map(([k, v]) => `"${k}": ${JSON.stringify(v)}`).join(',\n      ')}
    },`}
  },`;

  if (enablePrettier) {
    imports.push('import prettierConfig from "eslint-config-prettier";');
    configBlocks.push('  prettierConfig,');
  }

  return `${imports.join('\n')}

/** @type {import("eslint").Linter.Config[]} */
export default [
${configBlocks.join('\n')}
${mainBlock}
];`;
}

export default function EslintConfigGenerator() {
  const [preset, setPreset] = useState<Preset>('react');
  const [format, setFormat] = useState<ConfigFormat>('flat');
  const [enablePrettier, setEnablePrettier] = useState(true);
  const [enableImportPlugin, setEnableImportPlugin] = useState(true);
  const [enableUnusedVars, setEnableUnusedVars] = useState(true);
  const [enableNoConsole, setEnableNoConsole] = useState(false);
  const [enableA11y, setEnableA11y] = useState(false);
  const [envBrowser, setEnvBrowser] = useState(true);
  const [envNode, setEnvNode] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = generateConfig(preset, format, {
    enablePrettier, enableImportPlugin, enableUnusedVars,
    enableNoConsole, enableA11y, envBrowser, envNode,
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(config);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* Preset */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Framework / Preset</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(PRESET_LABELS) as Preset[]).map(p => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                preset === p
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Config Format</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(FORMAT_LABELS) as ConfigFormat[]).map(f => (
            <button
              key={f}
              onClick={() => setFormat(f)}
              class={`px-3 py-1 rounded text-sm border transition-colors ${
                format === f
                  ? 'bg-accent text-white border-accent'
                  : 'bg-surface border-border text-text-muted hover:border-accent'
              }`}
            >
              {FORMAT_LABELS[f]}
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Plugins &amp; Rules</label>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { key: 'prettier', label: 'Prettier Integration', value: enablePrettier, set: setEnablePrettier },
            { key: 'import', label: 'Import Order Plugin', value: enableImportPlugin, set: setEnableImportPlugin },
            { key: 'unusedVars', label: 'Warn Unused Vars', value: enableUnusedVars, set: setEnableUnusedVars },
            { key: 'noConsole', label: 'Warn console.log', value: enableNoConsole, set: setEnableNoConsole },
            { key: 'a11y', label: 'JSX Accessibility (React)', value: enableA11y, set: setEnableA11y },
            { key: 'browser', label: 'Browser Globals', value: envBrowser, set: setEnvBrowser },
            { key: 'node', label: 'Node.js Globals', value: envNode, set: setEnvNode },
          ].map(opt => (
            <label key={opt.key} class="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={opt.value}
                onChange={() => opt.set(!opt.value)}
                class="accent-accent w-4 h-4"
              />
              <span class="text-sm text-text-muted">{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Generated Config</label>
          <button
            onClick={handleCopy}
            class="px-3 py-1 bg-accent hover:bg-accent/80 text-white rounded text-sm transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-x-auto whitespace-pre text-text-muted max-h-96 overflow-y-auto">{config}</pre>
        <p class="text-xs text-text-muted mt-2">
          Save as <code class="bg-surface px-1 rounded">{format === 'flat' ? 'eslint.config.js' : '.eslintrc.json'}</code> in your project root.
          Install: <code class="bg-surface px-1 rounded">npm install --save-dev eslint{enablePrettier ? ' eslint-config-prettier' : ''}</code>
        </p>
      </div>
    </div>
  );
}
