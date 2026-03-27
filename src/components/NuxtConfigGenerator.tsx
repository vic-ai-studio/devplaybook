import { useState } from 'preact/hooks';

interface NuxtOptions {
  // Modules
  tailwind: boolean;
  pinia: boolean;
  image: boolean;
  icon: boolean;
  colorMode: boolean;
  i18n: boolean;
  // Runtime config
  apiBase: string;
  runtimePublicKeys: string;
  runtimePrivateKeys: string;
  // SEO
  siteTitle: string;
  siteDescription: string;
  siteUrl: string;
  // Features
  ssr: boolean;
  typescript: boolean;
  devtools: boolean;
  // Routing
  trailingSlash: boolean;
  // CSS
  globalCss: boolean;
}

function generateNuxtConfig(opts: NuxtOptions): string {
  const lines: string[] = [];

  // Modules list
  const modules: string[] = [];
  if (opts.tailwind) modules.push("'@nuxtjs/tailwindcss'");
  if (opts.pinia) modules.push("'@pinia/nuxt'");
  if (opts.image) modules.push("'@nuxt/image'");
  if (opts.icon) modules.push("'nuxt-icon'");
  if (opts.colorMode) modules.push("'@nuxtjs/color-mode'");
  if (opts.i18n) modules.push("'@nuxtjs/i18n'");

  // Runtime config
  const publicKeys = opts.runtimePublicKeys
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [k, v] = l.split(':').map(s => s.trim());
      return `      ${k}: '${v ?? ''}',`;
    });

  const privateKeys = opts.runtimePrivateKeys
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [k, v] = l.split(':').map(s => s.trim());
      return `    ${k}: process.env.${(k ?? '').toUpperCase()},`;
    });

  lines.push('// https://nuxt.com/docs/api/configuration/nuxt-config');
  lines.push('export default defineNuxtConfig({');

  // devtools
  lines.push(`  devtools: { enabled: ${opts.devtools} },`);

  // ssr
  if (!opts.ssr) {
    lines.push('  ssr: false, // SPA mode');
  }

  // typescript
  if (opts.typescript) {
    lines.push('  typescript: {');
    lines.push('    strict: true,');
    lines.push('    typeCheck: true,');
    lines.push('  },');
  }

  // modules
  if (modules.length > 0) {
    lines.push('');
    lines.push('  modules: [');
    modules.forEach(m => lines.push(`    ${m},`));
    lines.push('  ],');
  }

  // globalCss
  if (opts.globalCss) {
    lines.push('');
    lines.push('  css: [');
    lines.push("    '~/assets/css/main.css',");
    lines.push('  ],');
  }

  // app (SEO defaults)
  if (opts.siteTitle || opts.siteDescription || opts.siteUrl) {
    lines.push('');
    lines.push('  app: {');
    lines.push('    head: {');
    if (opts.siteTitle) {
      lines.push(`      titleTemplate: '%s — ${opts.siteTitle}',`);
      lines.push(`      title: '${opts.siteTitle}',`);
    }
    lines.push('      meta: [');
    lines.push("        { charset: 'utf-8' },");
    lines.push("        { name: 'viewport', content: 'width=device-width, initial-scale=1' },");
    if (opts.siteDescription) {
      lines.push(`        { name: 'description', content: '${opts.siteDescription}' },`);
      lines.push(`        { property: 'og:description', content: '${opts.siteDescription}' },`);
    }
    if (opts.siteTitle) {
      lines.push(`        { property: 'og:title', content: '${opts.siteTitle}' },`);
    }
    if (opts.siteUrl) {
      lines.push(`        { property: 'og:url', content: '${opts.siteUrl}' },`);
    }
    lines.push('      ],');
    lines.push('      link: [');
    lines.push("        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },");
    lines.push('      ],');
    lines.push('    },');
    lines.push('  },');
  }

  // routeRules
  if (opts.trailingSlash) {
    lines.push('');
    lines.push('  routeRules: {');
    lines.push("    '/**': { redirect: { trailingSlash: true } },");
    lines.push('  },');
  }

  // runtimeConfig
  const hasRuntime = opts.apiBase || publicKeys.length > 0 || privateKeys.length > 0;
  if (hasRuntime) {
    lines.push('');
    lines.push('  runtimeConfig: {');
    if (privateKeys.length > 0) {
      lines.push('    // Private keys — server-side only');
      privateKeys.forEach(l => lines.push(l));
    }
    lines.push('    public: {');
    if (opts.apiBase) {
      lines.push(`      apiBase: process.env.NUXT_PUBLIC_API_BASE ?? '${opts.apiBase}',`);
    }
    if (publicKeys.length > 0) {
      publicKeys.forEach(l => lines.push(l));
    }
    lines.push('    },');
    lines.push('  },');
  }

  // i18n config
  if (opts.i18n) {
    lines.push('');
    lines.push('  i18n: {');
    lines.push("    defaultLocale: 'en',");
    lines.push('    locales: [');
    lines.push("      { code: 'en', language: 'en-US', name: 'English' },");
    lines.push("      { code: 'zh', language: 'zh-TW', name: '繁體中文' },");
    lines.push('    ],');
    lines.push("    strategy: 'prefix_except_default',");
    lines.push('  },');
  }

  // colorMode config
  if (opts.colorMode) {
    lines.push('');
    lines.push('  colorMode: {');
    lines.push("    classSuffix: '',");
    lines.push("    preference: 'system',");
    lines.push("    fallback: 'light',");
    lines.push('  },');
  }

  lines.push('})');

  return lines.join('\n');
}

export default function NuxtConfigGenerator() {
  const [opts, setOpts] = useState<NuxtOptions>({
    tailwind: true,
    pinia: false,
    image: false,
    icon: false,
    colorMode: false,
    i18n: false,
    apiBase: 'https://api.example.com',
    runtimePublicKeys: '',
    runtimePrivateKeys: '',
    siteTitle: 'My Nuxt App',
    siteDescription: 'A Nuxt 3 application',
    siteUrl: 'https://example.com',
    ssr: true,
    typescript: true,
    devtools: true,
    trailingSlash: false,
    globalCss: false,
  });
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const set = (key: keyof NuxtOptions, val: string | boolean) =>
    setOpts(prev => ({ ...prev, [key]: val }));

  const generate = () => {
    setOutput(generateNuxtConfig(opts));
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-5">
      {/* Modules */}
      <div>
        <p class="text-sm font-medium text-text mb-2">Modules</p>
        <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {([
            ['tailwind', '@nuxtjs/tailwindcss'],
            ['pinia', '@pinia/nuxt'],
            ['image', '@nuxt/image'],
            ['icon', 'nuxt-icon'],
            ['colorMode', '@nuxtjs/color-mode'],
            ['i18n', '@nuxtjs/i18n'],
          ] as [keyof NuxtOptions, string][]).map(([key, label]) => (
            <label key={key} class="flex items-center gap-2 cursor-pointer text-sm p-2 bg-surface border border-border rounded-lg hover:border-accent transition-colors">
              <input
                type="checkbox"
                checked={opts[key] as boolean}
                onChange={e => set(key, (e.target as HTMLInputElement).checked)}
                class="accent-accent"
              />
              <code class="text-xs font-mono text-text-muted">{label}</code>
            </label>
          ))}
        </div>
      </div>

      {/* Features */}
      <div>
        <p class="text-sm font-medium text-text mb-2">Features</p>
        <div class="flex flex-wrap gap-4">
          {([
            ['ssr', 'SSR enabled'],
            ['typescript', 'TypeScript strict'],
            ['devtools', 'Devtools'],
            ['trailingSlash', 'Trailing slash'],
            ['globalCss', 'Global CSS'],
          ] as [keyof NuxtOptions, string][]).map(([key, label]) => (
            <label key={key} class="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={opts[key] as boolean}
                onChange={e => set(key, (e.target as HTMLInputElement).checked)}
                class="accent-accent"
              />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* SEO */}
      <div>
        <p class="text-sm font-medium text-text mb-2">SEO Defaults</p>
        <div class="space-y-2">
          {([
            ['siteTitle', 'Site title'],
            ['siteDescription', 'Meta description'],
            ['siteUrl', 'Canonical URL'],
          ] as [keyof NuxtOptions, string][]).map(([key, label]) => (
            <div key={key} class="flex gap-2 items-center">
              <span class="text-xs text-text-muted w-28">{label}</span>
              <input
                type="text"
                value={opts[key] as string}
                onInput={e => set(key, (e.target as HTMLInputElement).value)}
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Runtime Config */}
      <div>
        <p class="text-sm font-medium text-text mb-2">Runtime Config</p>
        <div class="space-y-3">
          <div>
            <label class="block text-xs text-text-muted mb-1">API Base URL (public)</label>
            <input
              type="text"
              value={opts.apiBase}
              onInput={e => set('apiBase', (e.target as HTMLInputElement).value)}
              class="w-full font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              placeholder="https://api.example.com"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Extra public keys (key: value per line)</label>
            <textarea
              value={opts.runtimePublicKeys}
              onInput={e => set('runtimePublicKeys', (e.target as HTMLTextAreaElement).value)}
              rows={2}
              class="w-full font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              placeholder="stripeKey: pk_live_xxx"
            />
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Private keys (server-only, key per line)</label>
            <textarea
              value={opts.runtimePrivateKeys}
              onInput={e => set('runtimePrivateKeys', (e.target as HTMLTextAreaElement).value)}
              rows={2}
              class="w-full font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
              placeholder="databaseUrl&#10;stripeSecret"
            />
          </div>
        </div>
      </div>

      <button
        onClick={generate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Generate nuxt.config.ts
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">nuxt.config.ts</span>
            <button
              onClick={copyToClipboard}
              class="text-xs px-3 py-1 bg-surface border border-border rounded hover:border-accent transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="bg-background border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 text-text whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to use</p>
        <ol class="space-y-1 list-decimal list-inside">
          <li>Select the Nuxt modules your project uses (installs are shown as inline comments)</li>
          <li>Toggle features: SSR, TypeScript strict mode, devtools, trailing slash, global CSS</li>
          <li>Fill in SEO defaults for the <code class="font-mono">app.head</code> section</li>
          <li>Add runtime config keys — public keys are exposed to the browser, private keys stay server-side</li>
          <li>Click Generate and replace your <code class="font-mono">nuxt.config.ts</code></li>
        </ol>
      </div>
    </div>
  );
}
