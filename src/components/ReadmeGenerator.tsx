import { useState } from 'preact/hooks';

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=readme-generator';

interface ReadmeInput {
  projectName: string;
  tagline: string;
  description: string;
  demoUrl: string;
  githubUrl: string;
  techStack: string;
  features: string;
  installation: string;
  usage: string;
  contributing: boolean;
  license: string;
  screenshots: boolean;
  badges: boolean;
  tableOfContents: boolean;
}

const DEFAULT: ReadmeInput = {
  projectName: '',
  tagline: '',
  description: '',
  demoUrl: '',
  githubUrl: '',
  techStack: '',
  features: '',
  installation: '',
  usage: '',
  contributing: true,
  license: 'MIT',
  screenshots: false,
  badges: true,
  tableOfContents: true,
};

const LICENSE_TEXTS: Record<string, string> = {
  MIT: 'MIT',
  Apache: 'Apache 2.0',
  GPL: 'GPL v3',
  ISC: 'ISC',
  Unlicense: 'The Unlicense',
  None: '',
};

function generateReadme(inp: ReadmeInput): string {
  const lines: string[] = [];
  const name = inp.projectName || 'My Project';
  const repo = inp.githubUrl.replace(/https?:\/\/github\.com\//, '').replace(/\.git$/, '');

  // Badges
  if (inp.badges && repo) {
    lines.push(`![License](https://img.shields.io/github/license/${repo})`);
    lines.push(`![Stars](https://img.shields.io/github/stars/${repo}?style=social)`);
    lines.push(`![Issues](https://img.shields.io/github/issues/${repo})`);
    lines.push('');
  }

  // Title
  lines.push(`# ${name}`);
  if (inp.tagline) lines.push(`\n> ${inp.tagline}`);
  lines.push('');

  if (inp.demoUrl) {
    lines.push(`[🚀 Live Demo](${inp.demoUrl}) · [📖 Docs](#usage) · [🐛 Report Bug](${inp.githubUrl || '#'}/issues) · [✨ Request Feature](${inp.githubUrl || '#'}/issues)`);
    lines.push('');
  }

  // Table of contents
  if (inp.tableOfContents) {
    lines.push('## Table of Contents');
    const sections = ['Description', inp.techStack && 'Built With', inp.features && 'Features', 'Getting Started', inp.usage && 'Usage', inp.contributing && 'Contributing', inp.license && LICENSE_TEXTS[inp.license] && 'License'].filter(Boolean);
    for (const s of sections) {
      lines.push(`- [${s}](#${(s as string).toLowerCase().replace(/\s+/g, '-')})`);
    }
    lines.push('');
  }

  // Description
  if (inp.description) {
    lines.push('## Description');
    lines.push(inp.description.trim());
    lines.push('');
  }

  if (inp.screenshots) {
    lines.push('## Screenshots');
    lines.push('');
    lines.push('![Screenshot](./screenshots/screenshot.png)');
    lines.push('');
    lines.push('> Replace with actual screenshots.');
    lines.push('');
  }

  // Tech stack
  if (inp.techStack) {
    lines.push('## Built With');
    const techs = inp.techStack.split(/[,\n]/).map(t => t.trim()).filter(Boolean);
    for (const t of techs) lines.push(`- ${t}`);
    lines.push('');
  }

  // Features
  if (inp.features) {
    lines.push('## Features');
    const feats = inp.features.split('\n').map(f => f.trim()).filter(Boolean);
    for (const f of feats) lines.push(`- ${f.replace(/^[-•*]\s*/, '')}`);
    lines.push('');
  }

  // Getting started
  lines.push('## Getting Started');
  lines.push('');
  lines.push('### Prerequisites');
  lines.push('');
  lines.push('- Node.js 18+');
  lines.push('- npm or yarn');
  lines.push('');
  lines.push('### Installation');
  lines.push('');

  if (inp.installation.trim()) {
    lines.push('```bash');
    lines.push(inp.installation.trim());
    lines.push('```');
  } else {
    const gitClone = inp.githubUrl ? `git clone ${inp.githubUrl}` : `git clone https://github.com/yourusername/${name.toLowerCase().replace(/\s+/g, '-')}`;
    lines.push('```bash');
    lines.push(`# Clone the repository`);
    lines.push(gitClone);
    lines.push('');
    lines.push('# Navigate to the project directory');
    lines.push(`cd ${name.toLowerCase().replace(/\s+/g, '-')}`);
    lines.push('');
    lines.push('# Install dependencies');
    lines.push('npm install');
    lines.push('');
    lines.push('# Start the development server');
    lines.push('npm run dev');
    lines.push('```');
  }
  lines.push('');

  // Usage
  if (inp.usage.trim()) {
    lines.push('## Usage');
    lines.push('');
    lines.push('```bash');
    lines.push(inp.usage.trim());
    lines.push('```');
    lines.push('');
  }

  // Contributing
  if (inp.contributing) {
    lines.push('## Contributing');
    lines.push('');
    lines.push('Contributions are welcome! Please follow these steps:');
    lines.push('');
    lines.push('1. Fork the repository');
    lines.push('2. Create a feature branch (`git checkout -b feat/amazing-feature`)');
    lines.push('3. Commit your changes (`git commit -m "feat: add amazing feature"`)');
    lines.push('4. Push to the branch (`git push origin feat/amazing-feature`)');
    lines.push('5. Open a Pull Request');
    lines.push('');
  }

  // License
  if (inp.license && LICENSE_TEXTS[inp.license]) {
    lines.push('## License');
    lines.push('');
    lines.push(`Distributed under the ${LICENSE_TEXTS[inp.license]} License. See \`LICENSE\` for more information.`);
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`*Generated with [DevPlaybook README Generator](https://devplaybook.cc/tools/readme-generator)*`);

  return lines.join('\n');
}

type Tab = 'basics' | 'content' | 'options';

export default function ReadmeGenerator() {
  const [tab, setTab] = useState<Tab>('basics');
  const [inp, setInp] = useState<ReadmeInput>(DEFAULT);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = <K extends keyof ReadmeInput>(k: K, v: ReadmeInput[K]) =>
    setInp(prev => ({ ...prev, [k]: v }));

  const readme = generateReadme(inp);

  const copy = () => {
    navigator.clipboard.writeText(readme).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputClass = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary transition-colors';
  const labelClass = 'block text-xs font-medium text-text-muted mb-1';
  const taClass = `${inputClass} resize-none`;

  const TABS: { id: Tab; label: string }[] = [
    { id: 'basics', label: 'Basics' },
    { id: 'content', label: 'Content' },
    { id: 'options', label: 'Options' },
  ];

  return (
    <div class="space-y-4">
      {/* Tabs */}
      <div class="flex gap-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.id ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary/50'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Basics */}
      {tab === 'basics' && (
        <div class="space-y-3">
          <div>
            <label class={labelClass}>Project Name *</label>
            <input class={inputClass} value={inp.projectName} placeholder="Awesome CLI Tool"
              onInput={e => update('projectName', (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Tagline (one-liner)</label>
            <input class={inputClass} value={inp.tagline}
              placeholder="A blazing-fast CLI tool that does X in under 5 seconds."
              onInput={e => update('tagline', (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label class={labelClass}>GitHub URL</label>
            <input class={inputClass} value={inp.githubUrl}
              placeholder="https://github.com/yourusername/your-repo"
              onInput={e => update('githubUrl', (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Live Demo URL (optional)</label>
            <input class={inputClass} value={inp.demoUrl}
              placeholder="https://yourproject.com"
              onInput={e => update('demoUrl', (e.target as HTMLInputElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Tech Stack (comma-separated)</label>
            <input class={inputClass} value={inp.techStack}
              placeholder="React, TypeScript, Node.js, PostgreSQL, Tailwind CSS"
              onInput={e => update('techStack', (e.target as HTMLInputElement).value)} />
          </div>
        </div>
      )}

      {/* Content */}
      {tab === 'content' && (
        <div class="space-y-3">
          <div>
            <label class={labelClass}>Description (1-3 paragraphs)</label>
            <textarea class={`${taClass} h-28`} value={inp.description}
              placeholder="A comprehensive description of what your project does, why it exists, and who it's for."
              onInput={e => update('description', (e.target as HTMLTextAreaElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Key Features (one per line)</label>
            <textarea class={`${taClass} h-28`} value={inp.features}
              placeholder={"Real-time sync with WebSockets\nAI-powered autocomplete\nWorks offline with Service Workers\nExport to PDF, CSV, JSON"}
              onInput={e => update('features', (e.target as HTMLTextAreaElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Installation commands (leave empty for default)</label>
            <textarea class={`${taClass} h-24 font-mono`} value={inp.installation}
              placeholder={"git clone https://github.com/you/repo\ncd repo\nnpm install\nnpm run dev"}
              onInput={e => update('installation', (e.target as HTMLTextAreaElement).value)} />
          </div>
          <div>
            <label class={labelClass}>Usage examples (code/commands, optional)</label>
            <textarea class={`${taClass} h-20 font-mono`} value={inp.usage}
              placeholder={"npm run build\nnpm start"}
              onInput={e => update('usage', (e.target as HTMLTextAreaElement).value)} />
          </div>
        </div>
      )}

      {/* Options */}
      {tab === 'options' && (
        <div class="space-y-3">
          <p class="text-sm font-medium">Include sections:</p>
          {[
            { key: 'badges', label: 'Badges (stars, issues, license)' },
            { key: 'tableOfContents', label: 'Table of Contents' },
            { key: 'screenshots', label: 'Screenshots placeholder' },
            { key: 'contributing', label: 'Contributing guide' },
          ].map(opt => (
            <label key={opt.key} class="flex items-center gap-3 cursor-pointer select-none text-sm">
              <input type="checkbox"
                checked={inp[opt.key as keyof ReadmeInput] as boolean}
                onChange={e => update(opt.key as keyof ReadmeInput, (e.target as HTMLInputElement).checked as any)} />
              {opt.label}
            </label>
          ))}
          <div class="pt-2">
            <label class={labelClass}>License</label>
            <select
              class={inputClass}
              value={inp.license}
              onChange={e => update('license', (e.target as HTMLSelectElement).value)}
            >
              {Object.entries(LICENSE_TEXTS).map(([k, v]) => (
                <option key={k} value={k}>{v || 'None'}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Output */}
      <div class="border-t border-border pt-4 space-y-3">
        <div class="flex items-center justify-between">
          <div class="text-sm font-semibold">Generated README.md</div>
          <button onClick={() => setShowPreview(v => !v)} class="text-xs text-primary hover:underline">
            {showPreview ? 'Hide' : 'Preview'}
          </button>
        </div>

        {showPreview && (
          <pre class="text-xs bg-bg-card border border-border rounded-lg p-4 overflow-auto max-h-80 whitespace-pre-wrap font-mono text-text">{readme}</pre>
        )}

        <div class="flex flex-wrap gap-2">
          <button onClick={copy}
            class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
            {copied ? 'Copied!' : 'Copy README.md'}
          </button>
          <a
            href={`data:text/markdown;charset=utf-8,${encodeURIComponent(readme)}`}
            download="README.md"
            class="px-4 py-2 bg-bg-card border border-border text-text rounded-lg text-sm hover:border-primary/50 transition-colors"
          >
            Download README.md
          </a>
          <a
            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just generated a README for ${inp.projectName || 'my project'} with devplaybook.cc/tools/readme-generator`)}`}
            target="_blank" rel="noopener"
            class="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors"
          >
            Share
          </a>
        </div>

        <p class="text-xs text-text-muted">
          <a href={DEVTOOLKIT_URL} target="_blank" rel="noopener" class="text-primary hover:underline">
            Get the DevToolkit Starter Kit — pro templates, checklists & more →
          </a>
        </p>
      </div>
    </div>
  );
}
