export interface Product {
  slug: string;
  name: string;
  price: number;
  description: string;
  features: string[];
  faq: { q: string; a: string }[];
  tags: string[];
  icon: string;
  gumroadUrl: string;
}

const GUMROAD_BASE = 'https://vicnail.gumroad.com/l';

function gumroadLink(slug: string): string {
  return `${GUMROAD_BASE}/${slug}?utm_source=devplaybook&utm_medium=product_page&utm_campaign=${slug}`;
}

export const products: Product[] = [
  {
    slug: 'developer-productivity-bundle',
    name: 'Developer Productivity Bundle',
    price: 29,
    description: 'Battle-tested automation scripts, CLI tools, and CI/CD workflows. Git cleanup, Docker pruning, log analysis, GitHub Actions CI, pre-commit hooks, and more.',
    features: [
      '5 automation scripts (git cleanup, Docker prune, log analyzer, env sync, DB backup)',
      '4 CLI tools (project init, port finder, SSL check, API health)',
      'GitHub Actions CI workflow',
      'Docker Compose dev environment',
      'Pre-commit hook configuration',
      'Production-ready Makefile',
    ],
    faq: [
      { q: 'What languages are the scripts in?', a: 'Mostly Bash with one Python script (log analyzer). Requires Bash 4+ and Python 3.10+.' },
      { q: 'Do these work on macOS and Linux?', a: 'Yes — all scripts are POSIX-compatible and tested on both platforms.' },
      { q: 'Can I customize the workflows?', a: 'Absolutely. Everything is MIT licensed and designed to be forked and modified.' },
    ],
    tags: ['automation', 'scripts', 'cli', 'devops', 'ci-cd', 'bash'],
    icon: '⚡',
    gumroadUrl: gumroadLink('dev-productivity'),
  },
  {
    slug: 'ai-prompt-engineering-toolkit',
    name: 'AI Prompt Engineering Toolkit',
    price: 19,
    description: 'Production-ready prompt templates, chain-of-thought workflows, and API integration code for GPT-4, Claude, Gemini, and any instruction-following LLM.',
    features: [
      '8 production-ready prompt templates',
      '4 chain-of-thought workflow patterns',
      '4 API integration templates (Python & Node)',
      'Works with GPT-4, Claude, Gemini, Llama, Mixtral',
      'Copy-paste ready — no setup required',
      'Includes evaluation and testing patterns',
    ],
    faq: [
      { q: 'Which AI models are supported?', a: 'GPT-4o, Claude 3.5 Sonnet, Gemini Pro, Llama 3, Mixtral, and any instruction-following LLM.' },
      { q: 'Do I need coding experience?', a: 'Templates work standalone. API integrations require basic Python or Node.js knowledge.' },
      { q: 'Are these just basic prompts?', a: 'No — these are structured engineering patterns with chain-of-thought, few-shot examples, and output formatting.' },
    ],
    tags: ['ai', 'prompt-engineering', 'llm', 'chatgpt', 'claude', 'openai'],
    icon: '🤖',
    gumroadUrl: gumroadLink('ai-prompt-toolkit'),
  },
  {
    slug: 'developer-productivity-toolkit',
    name: 'Developer Productivity Toolkit',
    price: 19,
    description: 'Complete dev environment setup: VS Code settings, keybindings, snippets, shell aliases, Git hooks, tmux config, and Starship prompt. Copy, paste, code faster.',
    features: [
      'VS Code settings, keybindings, and language snippets (JS, Python, Markdown)',
      'Shell aliases and functions for daily workflows',
      'Git hooks (pre-commit, commit-msg, pre-push) + global gitignore',
      'Terminal configs: tmux, WezTerm, Starship prompt',
      'Extension recommendations list',
      'Works with Bash and Zsh',
    ],
    faq: [
      { q: 'Will this overwrite my existing configs?', a: 'No — all files are standalone. Merge what you want into your existing dotfiles.' },
      { q: 'Does this work on Windows?', a: 'VS Code configs work everywhere. Shell/terminal configs are for macOS/Linux/WSL.' },
      { q: 'What editors are supported?', a: 'Optimized for VS Code. Shell configs work with any terminal.' },
    ],
    tags: ['vscode', 'dotfiles', 'shell', 'git-hooks', 'productivity', 'terminal'],
    icon: '🛠️',
    gumroadUrl: gumroadLink('vscode-pack'),
  },
  {
    slug: 'api-testing-cheatsheet-pack',
    name: 'API Testing Cheatsheet Pack',
    price: 9,
    description: 'Quick-reference cheatsheets for REST, GraphQL, and WebSocket testing. Includes Postman collections, shell scripts for smoke tests and load tests, and JWT decoder.',
    features: [
      '6 cheatsheets: REST, GraphQL, WebSocket, HTTP status codes, auth patterns, rate limiting',
      '3 Postman collections with environment templates',
      'Shell scripts: API smoke test, quick load test, JWT decoder',
      'Covers authentication: API key, Bearer, OAuth2, JWT',
      'Copy-paste curl commands for every scenario',
      'Works with any REST/GraphQL API',
    ],
    faq: [
      { q: 'Do I need Postman?', a: 'Optional — cheatsheets and curl scripts work standalone. Postman collections are a bonus.' },
      { q: 'Is this for beginners?', a: 'Great for beginners and as a quick reference for experienced developers.' },
      { q: 'Does it cover GraphQL subscriptions?', a: 'WebSocket cheatsheet covers real-time protocols including GraphQL subscriptions.' },
    ],
    tags: ['api-testing', 'rest-api', 'graphql', 'websocket', 'postman', 'cheatsheet'],
    icon: '🧪',
    gumroadUrl: gumroadLink('api-testing'),
  },
  {
    slug: 'notion-productivity-templates-for-freelancers',
    name: 'Notion Productivity Templates for Freelancers',
    price: 9,
    description: 'Notion workspace templates designed for freelancers: client tracker, project pipeline, invoicing, time tracking, and goal setting. Get organized in minutes.',
    features: [
      'Client management database',
      'Project pipeline with Kanban view',
      'Invoice tracker with payment status',
      'Weekly time tracking template',
      'Goal setting and review system',
      'Ready to duplicate into your Notion workspace',
    ],
    faq: [
      { q: 'Is this for developers only?', a: 'No — these templates work for any freelancer: designers, writers, consultants, developers.' },
      { q: 'Can I use this with Notion free?', a: 'Yes — all templates work with free Notion accounts.' },
      { q: 'How do I set it up?', a: 'Duplicate the templates into your Notion workspace and start customizing.' },
    ],
    tags: ['notion', 'freelancer', 'productivity', 'project-management', 'invoicing', 'templates'],
    icon: '📒',
    gumroadUrl: gumroadLink('freelancer-os'),
  },
  {
    slug: 'devtoolkit-starter-kit',
    name: 'DevToolkit Starter Kit',
    price: 19,
    description: 'A ready-to-deploy developer tools website with 12 built-in tools. Astro + Preact + Tailwind. Deploy to Cloudflare Pages for free. Built-in SEO, dark mode, and ad-ready layout.',
    features: [
      '12 built-in developer tools (JSON formatter, Base64, token counter, etc.)',
      'Astro 4 + Preact + Tailwind CSS stack',
      'Deploy to Cloudflare Pages in 5 minutes',
      'SEO-optimized with sitemap and robots.txt',
      'Dark mode with professional design',
      'Ad-ready layout for monetization',
    ],
    faq: [
      { q: 'What tools are included?', a: 'JSON Formatter, Base64 Encoder, URL Encoder, Token Counter, Regex Tester, Color Converter, and 6 more.' },
      { q: 'Can I add my own tools?', a: 'Yes — each tool is a standalone Astro page. Copy the pattern and add your own.' },
      { q: 'Is hosting really free?', a: 'Yes — Cloudflare Pages offers free hosting with unlimited bandwidth and global CDN.' },
    ],
    tags: ['astro', 'developer-tools', 'starter-kit', 'cloudflare', 'tailwind', 'website'],
    icon: '🚀',
    gumroadUrl: gumroadLink('devtoolkit'),
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}
