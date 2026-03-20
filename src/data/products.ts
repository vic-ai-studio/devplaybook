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
    slug: 'fullstack-boilerplate-collection',
    name: 'Full-Stack Boilerplate Collection',
    price: 49,
    description: 'Three production-ready boilerplates: Next.js SaaS Starter, React Admin Dashboard, and Express API Starter. TypeScript, Tailwind, Stripe, Prisma, Docker — all wired up.',
    features: [
      'Next.js 14 SaaS Starter with Stripe, NextAuth, Prisma',
      'React 18 Admin Dashboard with Recharts & Vite',
      'Express API Starter with JWT, Zod, Docker',
      'Full TypeScript across all boilerplates',
      'Docker Compose for local development',
      'Ready to deploy — just configure env vars',
    ],
    faq: [
      { q: 'What tech stacks are included?', a: 'Next.js 14 + Tailwind + Stripe + Prisma, React 18 + Vite + Recharts, and Express + Prisma + JWT + Docker.' },
      { q: 'Can I use these for commercial projects?', a: 'Yes — MIT licensed. Use them for client work, startups, or side projects.' },
      { q: 'Do I need Docker?', a: 'Docker is optional but included for easy local dev with PostgreSQL.' },
    ],
    tags: ['nextjs', 'react', 'typescript', 'stripe', 'saas', 'boilerplate'],
    icon: '🏗️',
    gumroadUrl: gumroadLink('fullstack-boilerplate'),
  },
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
    gumroadUrl: gumroadLink('dev-productivity-bundle'),
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
    slug: 'mcp-studio-complete',
    name: 'MCP Studio — 10 Production-Ready Templates',
    price: 19,
    description: '10 Model Context Protocol server templates for Claude, GPT-4, and any MCP-compatible client. 70+ tools across appointment booking, e-commerce, DevOps, marketing, and more.',
    features: [
      '10 complete MCP server templates',
      '70+ tool definitions across all templates',
      'Covers: appointments, e-commerce, restaurants, DevOps, content, support, finance, HR, LMS, marketing',
      'Setup scripts and smoke tests included',
      'Works with Claude Desktop, Cursor IDE, any MCP client',
      'Full documentation per template',
    ],
    faq: [
      { q: 'What is MCP?', a: 'Model Context Protocol — an open standard that lets AI assistants use external tools and APIs through a unified interface.' },
      { q: 'Do I need Claude Desktop?', a: 'No — templates work with any MCP-compatible client including Cursor IDE and custom clients.' },
      { q: 'Are the API integrations real?', a: 'Templates include real API patterns (Stripe, Shopify, Google Calendar, etc.) — you provide your own API keys.' },
    ],
    tags: ['mcp', 'claude', 'ai-tools', 'automation', 'api-integration', 'templates'],
    icon: '🔌',
    gumroadUrl: gumroadLink('mcp-studio'),
  },
  {
    slug: 'claude-code-mastery-guide',
    name: 'Claude Code Mastery Guide',
    price: 19,
    description: 'The complete guide to mastering Claude Code CLI. Setup, CLAUDE.md configuration, sub-agents, MCP tools, hooks, troubleshooting, and 10 real-world workflow examples.',
    features: [
      '4 comprehensive chapters from zero to advanced',
      '10 real-world workflow examples',
      '5 ready-to-use templates (CLAUDE.md, hooks, configs)',
      'Sub-agent orchestration patterns',
      'MCP tool integration guide',
      'Troubleshooting playbook for common issues',
    ],
    faq: [
      { q: 'Is this for beginners?', a: 'Yes — starts from installation and goes through advanced autonomous coding workflows.' },
      { q: 'What version of Claude Code is covered?', a: 'Covers the latest Claude Code CLI with Opus 4 and Sonnet 4 models.' },
      { q: 'Does this cover team workflows?', a: 'Yes — includes patterns for CLAUDE.md project config, shared hooks, and multi-agent setups.' },
    ],
    tags: ['claude-code', 'anthropic', 'cli', 'ai-coding', 'automation', 'developer-tools'],
    icon: '📘',
    gumroadUrl: gumroadLink('claude-code-mastery'),
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
    gumroadUrl: gumroadLink('dev-productivity-toolkit'),
  },
  {
    slug: 'css-animation-library',
    name: 'CSS Animation Library',
    price: 15,
    description: 'Pure CSS animation collection: entrance/exit effects, hover interactions, loading spinners, scroll reveals, text effects, and background animations. Drop-in ready.',
    features: [
      '8 animation categories: entrances, exits, attention-seekers, backgrounds, text, spinners, hover, scroll',
      'Utility classes for timing, delay, and iteration',
      'Custom easing/timing functions library',
      'Interactive demo page included',
      'No JavaScript required — pure CSS',
      'Works in Chrome, Firefox, Safari, Edge',
    ],
    faq: [
      { q: 'Do I need a CSS framework?', a: 'No — these are standalone CSS files. Works with Tailwind, Bootstrap, or vanilla CSS.' },
      { q: 'How do I use them?', a: 'Import the CSS file and add class names to your HTML elements. Demo page shows all animations.' },
      { q: 'Are they performant?', a: 'Yes — all animations use transform and opacity for GPU-accelerated rendering.' },
    ],
    tags: ['css', 'animations', 'hover-effects', 'loading-spinners', 'ui-ux', 'web-design'],
    icon: '✨',
    gumroadUrl: gumroadLink('css-animation-library'),
  },
  {
    slug: 'frontend-component-snippets',
    name: 'Frontend Component Snippets',
    price: 14,
    description: 'Copy-paste UI components in React, Vue, and Svelte. Modal, Dropdown, Toast, DataTable, Pagination, FileUpload, and 14 more — all accessible and TypeScript-ready.',
    features: [
      '20 React components (Modal, Dropdown, Toast, DataTable, Tabs, etc.)',
      '15 Vue 3 components (same patterns, Vue idioms)',
      '15 Svelte components (same patterns, Svelte idioms)',
      'Fully accessible (ARIA roles, keyboard navigation)',
      'No external dependencies',
      'TypeScript-ready with prop interfaces',
    ],
    faq: [
      { q: 'Do I need all three frameworks?', a: 'No — pick the framework you use. Each set is independent.' },
      { q: 'Are these styled?', a: 'Minimal inline styles for structure. Designed to integrate with your existing design system.' },
      { q: 'Can I modify them?', a: 'Yes — MIT licensed. They are designed as starting points to customize.' },
    ],
    tags: ['react', 'vue', 'svelte', 'components', 'ui-library', 'frontend', 'typescript'],
    icon: '🧩',
    gumroadUrl: gumroadLink('frontend-components'),
  },
  {
    slug: 'frontend-performance-audit-checklist',
    name: 'Frontend Performance Audit Checklist',
    price: 12,
    description: 'Systematic performance audit checklists for Lighthouse, Core Web Vitals, images, JavaScript, and CSS. Includes testing scripts, Lighthouse CI config, and report templates.',
    features: [
      '5 detailed checklists (Lighthouse, CWV, images, JS, CSS)',
      'Performance testing scripts (Node.js)',
      'Lighthouse CI configuration',
      'Web Vitals real-user monitoring script',
      'Audit report template (Markdown)',
      'Performance budget template (JSON)',
    ],
    faq: [
      { q: 'Is this framework-specific?', a: 'No — checklists apply to any frontend stack (React, Vue, vanilla, etc.).' },
      { q: 'Do I need Lighthouse CI?', a: 'Optional — the config is included for automated performance regression testing in CI/CD.' },
      { q: 'What are Core Web Vitals?', a: 'Google metrics: LCP (loading), INP (interactivity), CLS (visual stability). This guide covers all three.' },
    ],
    tags: ['performance', 'lighthouse', 'core-web-vitals', 'audit', 'optimization', 'frontend'],
    icon: '📊',
    gumroadUrl: gumroadLink('performance-audit'),
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
    gumroadUrl: gumroadLink('api-testing-cheatsheet'),
  },
  {
    slug: 'notion-developer-dashboard-template',
    name: 'Notion Developer Dashboard Template',
    price: 9,
    description: 'Project management templates for Notion: developer dashboard, bug tracker, sprint board, code review tracker, learning log, and meeting notes. Includes Notion API scripts.',
    features: [
      '6 Notion templates: dashboard, bugs, sprints, code review, learning log, meetings',
      'Setup and customization guides',
      'Notion API integration guide',
      'GitHub-to-Notion sync script',
      'Notion API automation scripts',
      'Works with free Notion accounts',
    ],
    faq: [
      { q: 'Do I need Notion Pro?', a: 'No — all templates work with free Notion accounts.' },
      { q: 'Can I customize the templates?', a: 'Yes — templates are Markdown-based and fully customizable in Notion.' },
      { q: 'Does the GitHub sync work automatically?', a: 'The script syncs on-demand. For automation, set it up as a cron job or GitHub Action.' },
    ],
    tags: ['notion', 'project-management', 'sprint-planning', 'kanban', 'developer-dashboard'],
    icon: '📋',
    gumroadUrl: gumroadLink('notion-dev-dashboard'),
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
    gumroadUrl: gumroadLink('notion-freelancer-templates'),
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
    gumroadUrl: gumroadLink('devtoolkit-starter-kit'),
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}
