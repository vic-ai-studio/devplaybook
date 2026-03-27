import { useState, useCallback } from 'preact/hooks';

type Framework = 'react' | 'vue' | 'svelte' | 'angular' | 'preact' | 'web-components';
type Renderer = 'preact' | 'preact' | 'vue3' | 'svelte' | 'angular' | 'web-components-vite';

interface Config {
  framework: Framework;
  typescript: boolean;
  addons: string[];
  viteBuilder: boolean;
  staticDir: string;
  storiesGlob: string;
}

const FRAMEWORKS: { id: Framework; label: string; pkg: string; renderer: string }[] = [
  { id: 'react',           label: 'React',           pkg: '@storybook/react-vite',      renderer: '@storybook/react' },
  { id: 'vue',             label: 'Vue 3',            pkg: '@storybook/vue3-vite',       renderer: '@storybook/vue3' },
  { id: 'svelte',          label: 'Svelte',           pkg: '@storybook/svelte-vite',     renderer: '@storybook/svelte' },
  { id: 'angular',         label: 'Angular',          pkg: '@storybook/angular',         renderer: '@storybook/angular' },
  { id: 'preact',          label: 'Preact',           pkg: '@storybook/preact-vite',     renderer: '@storybook/preact' },
  { id: 'web-components',  label: 'Web Components',   pkg: '@storybook/web-components-vite', renderer: '@storybook/web-components' },
];

const ADDONS = [
  { id: '@storybook/addon-essentials',     label: 'Essentials (docs, controls, actions, viewport)', default: true },
  { id: '@storybook/addon-interactions',   label: 'Interactions (play function testing)', default: true },
  { id: '@storybook/addon-a11y',           label: 'Accessibility (axe-core audits)', default: false },
  { id: '@storybook/addon-storysource',    label: 'Story Source (show source code)', default: false },
  { id: '@storybook/addon-coverage',       label: 'Coverage (Istanbul instrumentation)', default: false },
  { id: 'storybook-dark-mode',             label: 'Dark Mode (toggle light/dark)', default: false },
  { id: '@chromatic-com/storybook',        label: 'Chromatic (visual regression)', default: false },
  { id: '@storybook/addon-themes',         label: 'Themes (switch between themes)', default: false },
];

function generateMain(cfg: Config): string {
  const fw = FRAMEWORKS.find(f => f.id === cfg.framework)!;
  const ext = cfg.typescript ? 'ts' : 'js';
  const addonsArr = cfg.addons.map(a => `    '${a}',`).join('\n');
  const staticDir = cfg.staticDir ? `\n  staticDirs: ['../${cfg.staticDir}'],` : '';

  if (cfg.typescript) {
    return `import type { StorybookConfig } from '${fw.pkg}';

const config: StorybookConfig = {
  stories: [${cfg.storiesGlob.split(',').map(g => `\n    '${g.trim()}'`).join(',')}\n  ],
  addons: [
${addonsArr}
  ],
  framework: {
    name: '${fw.pkg}',
    options: {},
  },${staticDir}
  docs: {},
};

export default config;
`;
  }

  return `/** @type { import('${fw.pkg}').StorybookConfig } */
const config = {
  stories: [${cfg.storiesGlob.split(',').map(g => `\n    '${g.trim()}'`).join(',')}\n  ],
  addons: [
${addonsArr}
  ],
  framework: {
    name: '${fw.pkg}',
    options: {},
  },${staticDir}
  docs: {},
};

export default config;
`;
}

function generatePreview(cfg: Config): string {
  const fw = FRAMEWORKS.find(f => f.id === cfg.framework)!;
  const hasA11y = cfg.addons.includes('@storybook/addon-a11y');
  const hasThemes = cfg.addons.includes('@storybook/addon-themes');

  const a11yParam = hasA11y ? `\n    a11y: {\n      config: {},\n      options: {},\n    },` : '';
  const bgParam = hasThemes ? `\n    backgrounds: { disable: true },` : '';

  if (cfg.typescript) {
    return `import type { Preview } from '${fw.renderer}';

const preview: Preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },${a11yParam}${bgParam}
  },
};

export default preview;
`;
  }

  return `/** @type { import('${fw.renderer}').Preview } */
const preview = {
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },${a11yParam}${bgParam}
  },
};

export default preview;
`;
}

function generateStoryTemplate(cfg: Config): string {
  const ext = cfg.typescript ? 'tsx' : 'jsx';
  const fw = FRAMEWORKS.find(f => f.id === cfg.framework)!;

  if (cfg.framework === 'vue') {
    return `<!-- Button.stories.${cfg.typescript ? 'ts' : 'js'} -->
<script setup lang="ts">
</script>

<template>
</template>

<script lang="ts">
import type { Meta, StoryObj } from '@storybook/vue3';
import MyButton from './MyButton.vue';

const meta: Meta<typeof MyButton> = {
  title: 'Example/MyButton',
  component: MyButton,
  tags: ['autodocs'],
  argTypes: {
    backgroundColor: { control: 'color' },
    size: { control: { type: 'select' }, options: ['small', 'medium', 'large'] },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
  },
};
</script>
`;
  }

  if (cfg.framework === 'angular') {
    return `// button.stories.${cfg.typescript ? 'ts' : 'js'}
import type { Meta, StoryObj } from '@storybook/angular';
import { ButtonComponent } from './button.component';

const meta: Meta<ButtonComponent> = {
  title: 'Example/Button',
  component: ButtonComponent,
  tags: ['autodocs'],
  argTypes: {
    backgroundColor: {
      control: 'color',
    },
  },
};

export default meta;
type Story = StoryObj<ButtonComponent>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};
`;
  }

  if (cfg.framework === 'svelte') {
    return `<!-- Button.stories.svelte -->
<script context="module" lang="${cfg.typescript ? 'ts' : 'js'}">
  import type { Meta } from '@storybook/svelte';
  import Button from './Button.svelte';

  const meta: Meta<Button> = {
    title: 'Example/Button',
    component: Button,
    tags: ['autodocs'],
    argTypes: {
      backgroundColor: { control: 'color' },
      size: {
        control: { type: 'select' },
        options: ['small', 'medium', 'large'],
      },
    },
  };

  export default meta;
</script>

<Story name="Primary" args={{ primary: true, label: 'Button' }} />
<Story name="Secondary" args={{ label: 'Button' }} />
`;
  }

  // React / Preact / Web Components
  const importLine = cfg.framework === 'preact'
    ? `import type { Meta, StoryObj } from '@storybook/preact';`
    : cfg.framework === 'web-components'
    ? `import type { Meta, StoryObj } from '@storybook/web-components';`
    : `import type { Meta, StoryObj } from '@storybook/react';`;

  const componentLine = cfg.framework === 'web-components'
    ? `import './my-button';  // your web component`
    : `import { Button } from './Button';`;

  const componentRef = cfg.framework === 'web-components' ? `'my-button'` : `Button`;

  return `// Button.stories.${ext}
${importLine}
${componentLine}

const meta = {
  title: 'Example/Button',
  component: ${componentRef},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    backgroundColor: { control: 'color' },
    size: {
      control: { type: 'select' },
      options: ['small', 'medium', 'large'],
    },
  },
  args: { onClick: () => {} },
} satisfies Meta<typeof ${componentRef}>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};

export const Secondary: Story = {
  args: {
    label: 'Button',
  },
};

export const Large: Story = {
  args: {
    size: 'large',
    label: 'Button',
  },
};

export const Small: Story = {
  args: {
    size: 'small',
    label: 'Button',
  },
};
`;
}

function generatePackageScript(): string {
  return `# Install Storybook dependencies
npx storybook@latest init

# Or install manually:
# npm install --save-dev storybook

# Run Storybook dev server
npx storybook dev -p 6006

# Build static Storybook
npx storybook build
`;
}

export default function StorybookConfigGenerator() {
  const [cfg, setCfg] = useState<Config>({
    framework: 'react',
    typescript: true,
    addons: ADDONS.filter(a => a.default).map(a => a.id),
    viteBuilder: true,
    staticDir: 'public',
    storiesGlob: '../src/**/*.mdx, ../src/**/*.stories.@(js|jsx|mjs|ts|tsx)',
  });
  const [activeFile, setActiveFile] = useState<'main' | 'preview' | 'story' | 'install'>('main');
  const [copied, setCopied] = useState(false);

  const update = useCallback(<K extends keyof Config>(key: K, value: Config[K]) => {
    setCfg(prev => ({ ...prev, [key]: value }));
  }, []);

  const toggleAddon = useCallback((addonId: string) => {
    setCfg(prev => ({
      ...prev,
      addons: prev.addons.includes(addonId)
        ? prev.addons.filter(a => a !== addonId)
        : [...prev.addons, addonId],
    }));
  }, []);

  const ext = cfg.typescript ? 'ts' : 'js';
  const files: Record<string, { name: string; content: string; lang: string }> = {
    main:    { name: `.storybook/main.${ext}`, content: generateMain(cfg), lang: 'typescript' },
    preview: { name: `.storybook/preview.${ext}`, content: generatePreview(cfg), lang: 'typescript' },
    story:   { name: `Button.stories.${cfg.typescript ? (cfg.framework === 'vue' ? 'ts' : 'tsx') : (cfg.framework === 'vue' ? 'js' : 'jsx')}`, content: generateStoryTemplate(cfg), lang: 'typescript' },
    install: { name: 'Installation', content: generatePackageScript(), lang: 'bash' },
  };

  const currentFile = files[activeFile];

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(currentFile.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [currentFile]);

  const download = useCallback(() => {
    const blob = new Blob([currentFile.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentFile.name.split('/').pop() || 'storybook-config.ts';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentFile]);

  const TAB_CLS = (t: string) =>
    `px-3 py-1.5 text-sm rounded-md transition-colors ${activeFile === t ? 'bg-accent text-white' : 'text-text-muted hover:text-text'}`;

  return (
    <div class="space-y-5">
      {/* Framework Selection */}
      <div class="p-4 bg-surface border border-border rounded-lg space-y-4">
        <div class="text-sm font-medium text-text">Configuration</div>

        <div>
          <label class="text-xs text-text-muted block mb-2">Framework</label>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {FRAMEWORKS.map(fw => (
              <button
                key={fw.id}
                onClick={() => update('framework', fw.id)}
                class={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  cfg.framework === fw.id
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-[#0d1117] text-text hover:border-accent/50'
                }`}
              >
                {fw.label}
              </button>
            ))}
          </div>
        </div>

        <div class="flex items-center gap-6 flex-wrap">
          <label class="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cfg.typescript}
              onChange={e => update('typescript', (e.target as HTMLInputElement).checked)}
              class="accent-accent"
            />
            <span class="text-sm text-text">TypeScript</span>
          </label>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label class="text-xs text-text-muted block mb-1">Static Assets Dir (optional)</label>
            <input
              value={cfg.staticDir}
              onInput={e => update('staticDir', (e.target as HTMLInputElement).value)}
              placeholder="public"
              class="w-full bg-[#0d1117] border border-border rounded px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label class="text-xs text-text-muted block mb-1">Stories Glob Pattern</label>
            <input
              value={cfg.storiesGlob}
              onInput={e => update('storiesGlob', (e.target as HTMLInputElement).value)}
              class="w-full bg-[#0d1117] border border-border rounded px-3 py-1.5 text-sm font-mono text-text focus:outline-none focus:border-accent"
            />
          </div>
        </div>
      </div>

      {/* Addons */}
      <div class="p-4 bg-surface border border-border rounded-lg space-y-3">
        <div class="text-sm font-medium text-text">Addons</div>
        <div class="space-y-2">
          {ADDONS.map(addon => (
            <label key={addon.id} class="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={cfg.addons.includes(addon.id)}
                onChange={() => toggleAddon(addon.id)}
                class="accent-accent mt-0.5 shrink-0"
              />
              <div>
                <div class="text-sm text-text group-hover:text-accent transition-colors font-mono">{addon.id}</div>
                <div class="text-xs text-text-muted">{addon.label}</div>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Output */}
      <div class="space-y-3">
        <div class="flex items-center gap-2 flex-wrap justify-between">
          <div class="flex gap-1 flex-wrap">
            {Object.entries(files).map(([key, f]) => (
              <button key={key} onClick={() => setActiveFile(key as typeof activeFile)} class={TAB_CLS(key)}>
                {f.name}
              </button>
            ))}
          </div>
          <div class="flex gap-2">
            <button onClick={copy} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {activeFile !== 'install' && (
              <button onClick={download} class="px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors">
                Download
              </button>
            )}
          </div>
        </div>

        <div class="relative">
          <pre class="bg-[#0d1117] border border-border rounded-lg p-4 text-xs font-mono text-green-400 overflow-x-auto max-h-[480px] whitespace-pre">{currentFile.content}</pre>
        </div>
      </div>

      {/* Summary badge */}
      <div class="flex flex-wrap gap-2 text-xs">
        <span class="px-2 py-1 bg-surface border border-border rounded text-text">
          {FRAMEWORKS.find(f => f.id === cfg.framework)?.label}
        </span>
        <span class="px-2 py-1 bg-surface border border-border rounded text-text">
          {cfg.typescript ? 'TypeScript' : 'JavaScript'}
        </span>
        <span class="px-2 py-1 bg-surface border border-border rounded text-text">
          {cfg.addons.length} addon{cfg.addons.length !== 1 ? 's' : ''}
        </span>
        <span class="px-2 py-1 bg-accent/10 border border-accent/30 rounded text-accent">
          Storybook 8.x
        </span>
      </div>

      <p class="text-xs text-text-muted">
        Generates Storybook 8.x configuration files for React, Vue 3, Svelte, Angular, Preact, and Web Components. Includes <code class="font-mono bg-surface px-1 rounded">.storybook/main.ts</code>, <code class="font-mono bg-surface px-1 rounded">preview.ts</code>, and a story template. All generation happens in your browser.
      </p>
    </div>
  );
}
