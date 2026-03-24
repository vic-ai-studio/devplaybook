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
    description: 'Stop rebuilding the same setup every project. 51 VSCode snippets, 40 Git aliases, 5 Docker Compose stacks, 5 GitHub Actions workflows, 5 README templates, and a dotfiles kit. Set up a professional dev environment in under an hour.',
    features: [
      '51 VSCode snippets for JavaScript, TypeScript, React, and Python',
      '40 Git aliases + 30 shell productivity functions',
      '5 Docker Compose templates (PostgreSQL, Redis, Nginx, Monitoring, Dev services)',
      '5 GitHub Actions CI/CD workflows (Node.js, Python, Docker, Vercel, Release)',
      '5 README templates (SaaS, library, API docs, CLI, minimal)',
      'Dotfiles starter kit (.zshrc, .gitconfig, .editorconfig)',
    ],
    faq: [
      { q: 'What tools are the snippets for?', a: 'VSCode (works with Cursor too). Snippets for JavaScript, TypeScript, React, and Python — 51 snippets total.' },
      { q: 'Do the Docker templates work on macOS and Linux?', a: 'Yes — all templates use standard Docker Compose v2 syntax compatible with any platform.' },
      { q: 'Can I customize everything?', a: 'Absolutely. MIT licensed. Every file is readable, well-commented, and designed to be forked and modified.' },
      { q: 'Do the shell scripts work on Windows?', a: 'Shell scripts and dotfiles target macOS/Linux/WSL. VSCode snippets and GitHub Actions workflows work on all platforms.' },
    ],
    tags: ['vscode', 'snippets', 'git', 'docker', 'github-actions', 'dotfiles', 'productivity'],
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
  {
    slug: 'ai-developer-prompts-pack',
    name: 'AI Developer Prompts Pack',
    price: 24,
    description: '55 battle-tested prompt templates for the workflows developers actually use: code review, debugging, architecture, documentation, and testing. Stop writing prompts from scratch.',
    features: [
      '10 code review prompts (security, performance, PR review, API/DB design)',
      '10 debugging prompts (stack traces, memory leaks, production incidents)',
      '10 architecture prompts (system design, tech choice, scalability planning)',
      '10 documentation prompts (README, ADR, runbooks, post-mortems)',
      '10 testing prompts (unit, integration, E2E, property-based, legacy)',
      '5 bonus refactoring prompts',
      'VSCode snippet format included',
      'Works with Claude, GPT-4o, Gemini, and any instruction-following LLM',
    ],
    faq: [
      { q: 'Which AI tools do these work with?', a: 'Any instruction-following LLM: Claude (recommended), GPT-4o, Gemini Pro, Llama 3, Mixtral, and others.' },
      { q: 'How do I use the prompts?', a: 'Each prompt has {{PLACEHOLDER}} variables. Replace them with your code/context and paste into your AI assistant. Takes about 10 seconds.' },
      { q: 'Can I use these in a team?', a: 'Yes — MIT licensed. Share freely across your team, use in internal tooling, or build on them.' },
      { q: 'What format are the files?', a: 'Markdown files organized by category. Also includes VSCode snippet JSON so you can trigger prompts from your editor.' },
    ],
    tags: ['ai', 'prompts', 'claude', 'chatgpt', 'code-review', 'debugging', 'productivity'],
    icon: '💬',
    gumroadUrl: gumroadLink('ai-developer-prompts-pack'),
  },
  {
    slug: 'premium-workflow-pack',
    name: 'Premium Workflow Pack',
    price: 19,
    description: 'Production-grade workflows, architecture guides, and deployment scripts for teams that ship. 10 advanced CI/CD workflows (blue-green, canary, E2E, security), 5 architecture deep-dives, code review checklist, PR process guide, and 5 battle-tested Bash deployment scripts.',
    features: [
      '10 advanced GitHub Actions workflows (blue-green deploy, canary release, E2E with Playwright sharding)',
      'Automated rollback workflow with health-check verification',
      'Database migration CI with backup + dry-run mode',
      'Container security scanning: Trivy + Grype + gitleaks',
      '5 architecture guides: microservices, monorepo, serverless, event-driven, API gateway',
      'Code review checklist covering security, performance, design, and testing',
      'PR workflow guide with branch naming, conventional commits, and PR template',
      '5 deployment Bash scripts: deploy, rollback, db-migrate, health-check, setup-env',
      'Every script has # CUSTOMIZE: comments — no guessing what to change',
      'MIT licensed — use in personal and commercial projects',
    ],
    faq: [
      { q: 'How is this different from the GitHub Actions Templates Pack?', a: 'The GitHub Actions Templates Pack covers standard CI patterns (Node, Python, Docker). This pack focuses on advanced deployment strategies (blue-green, canary, automated rollback), security scanning, and E2E testing — plus architecture guides and deployment scripts that are not in the other pack.' },
      { q: 'Do I need all 10 workflows?', a: 'No — pick what you need. Each workflow is self-contained. Use just the canary release workflow, or just the security scanner, or just the E2E tests. Nothing is interdependent.' },
      { q: 'Which cloud providers are supported?', a: 'The workflows are cloud-agnostic. AWS examples are shown in comments, but every workflow has instructions for swapping in your provider (GCP, Azure, Kubernetes, Cloudflare).' },
      { q: 'Are the Bash scripts production-safe?', a: 'Yes — they use set -euo pipefail, include dry-run modes, validate inputs, and back up databases before migrations. Designed for cautious production use.' },
      { q: 'What Node/Python versions are required?', a: 'Node 18+ for running workflows locally. The scripts are pure Bash and work on macOS, Linux, and WSL. No specific runtime required for the architecture guides.' },
    ],
    tags: ['github-actions', 'ci-cd', 'devops', 'blue-green', 'canary', 'architecture', 'bash', 'deployment'],
    icon: '🚀',
    gumroadUrl: gumroadLink('premium-workflow-pack'),
  },
  {
    slug: 'interview-vault',
    name: 'DevPlaybook Interview Vault',
    price: 29,
    description: '210+ real technical interview questions with model answers, asked at Google, Meta, Amazon, Microsoft, Stripe, and Shopify. Covers Frontend (55), Backend (55), System Design (50), and DSA (50). Available in English and Traditional Chinese.',
    features: [
      '55 Frontend questions: HTML/CSS, JavaScript, React, TypeScript with detailed answers',
      '55 Backend questions: REST APIs, Node.js, Databases, Auth, Security, Caching',
      '50 System Design questions: distributed systems, scalability, real-world architecture problems',
      '50 DSA questions: Arrays, Trees, Graphs, Dynamic Programming with Python code solutions',
      'Traditional Chinese (ZH-TW) + English — all 210 questions fully bilingual',
      'Difficulty levels: Junior, Mid, Senior — filter for your experience level',
      'Model answers with key points, follow-up questions, and common mistakes to avoid',
      'Pay What You Want — name your price starting at $29',
    ],
    faq: [
      { q: 'What companies are these questions from?', a: 'Questions are representative of what\'s asked at top tech companies including Google, Meta, Amazon, Microsoft, Stripe, Shopify, and similar FAANG/tier-1 companies.' },
      { q: 'What programming language are the DSA solutions in?', a: 'Python — clean, readable, and what most interviewers accept for algorithm problems. The patterns are language-agnostic.' },
      { q: 'Is Traditional Chinese (ZH-TW) fully translated?', a: 'Yes — all 210 questions with complete answers are available in both English and Traditional Chinese.' },
      { q: 'What format is the content in?', a: 'Markdown files organized by category. Open in any text editor, VS Code, Obsidian, or Notion.' },
      { q: 'Is this suitable for junior developers?', a: 'Yes — questions are tagged [Junior] [Mid] [Senior]. Start with Junior-tagged questions and work your way up.' },
    ],
    tags: ['interview', 'frontend', 'backend', 'system-design', 'algorithms', 'dsa', 'react', 'typescript', 'career'],
    icon: '🔒',
    gumroadUrl: gumroadLink('interview-vault'),
  },
  {
    slug: 'github-actions-templates',
    name: 'GitHub Actions CI/CD Templates Pack',
    price: 19,
    description: '12 production-ready GitHub Actions workflow templates covering Node.js, Python, Docker, multi-environment deployments, security scanning, and auto-changelog. Copy, paste, ship.',
    features: [
      '12 workflow templates (Node.js, Python, Docker, Astro, Go)',
      'Multi-environment deploy (dev → staging → production)',
      'Docker build + push to GHCR with layer caching',
      'Security scanning: SAST, dependency audit, secret detection',
      'Auto-changelog + GitHub Release on semver tags',
      'Matrix testing across Node 18/20/22 and Python 3.11/3.12',
      'Deployment to Cloudflare Pages, Vercel, AWS S3',
      'Pre-built reusable composite actions',
      'Annotated YAML with inline comments for easy customization',
    ],
    faq: [
      { q: 'Do I need to know YAML to use these?', a: 'Basic YAML familiarity helps, but every file has inline comments explaining each key. Most users copy the template and only change the branch names, secrets, and run commands.' },
      { q: 'Which deployment targets are supported?', a: 'Cloudflare Pages, Vercel, AWS S3 + CloudFront, GitHub Pages, and generic SSH deploys. Docker templates target GitHub Container Registry (GHCR).' },
      { q: 'Do these work with private repos?', a: 'Yes. All templates use standard GitHub Actions secrets and GITHUB_TOKEN. No third-party tokens required except for your specific deployment target.' },
      { q: 'Can I use these for open source projects?', a: 'Yes — MIT licensed. Use, fork, and modify freely.' },
    ],
    tags: ['github-actions', 'ci-cd', 'devops', 'automation', 'docker', 'deployment'],
    icon: '⚙️',
    gumroadUrl: gumroadLink('github-actions-templates'),
  },
  {
    slug: 'developer-interview-vault',
    name: 'Developer Interview Vault',
    price: 29,
    description: '210 technical interview questions with model answers, key points, and follow-up questions. Covers Frontend, Backend, System Design, and DSA — bilingual English + Traditional Chinese (ZH-TW). PWYW from $29.',
    features: [
      '210 questions across 4 categories (Frontend, Backend, System Design, DSA)',
      'Every question includes a model answer + key talking points',
      'Most questions include follow-up questions interviewers actually ask',
      'Difficulty tags: [Junior] [Mid] [Senior]',
      'Full English + Traditional Chinese (ZH-TW) bilingual edition',
      'PDF-ready Markdown format — read anywhere, print anytime',
      'Covers FAANG-style interviews: Google, Meta, Amazon, Stripe, Shopify',
      'System Design questions use the structured SNAKE framework',
    ],
    faq: [
      { q: 'What experience level is this for?', a: 'Covers Junior through Senior. Each question is tagged [Junior], [Mid], or [Senior] so you can focus on your level.' },
      { q: 'Is it really bilingual?', a: 'Yes — complete Traditional Chinese (ZH-TW) and English editions are both included. All 210 questions, fully translated.' },
      { q: 'What format is the content in?', a: 'Markdown files organized by category. Open in VS Code, Obsidian, Notion, or any text editor. Convert to PDF anytime.' },
      { q: 'How is this different from LeetCode?', a: 'Focuses on conceptual and behavioral questions — the kind that decide whether you get the offer. DSA is included but this is not a LeetCode grind pack.' },
      { q: 'Does it cover system design?', a: '50 system design questions with structured SNAKE-framework answers: URL shorteners, Twitter timeline, YouTube, rate limiters, and more.' },
    ],
    tags: ['interview', 'career', 'frontend', 'backend', 'system-design', 'dsa', 'algorithms'],
    icon: '🎯',
    gumroadUrl: gumroadLink('developer-interview-vault'),
  },
];

export function getProductBySlug(slug: string): Product | undefined {
  return products.find(p => p.slug === slug);
}
