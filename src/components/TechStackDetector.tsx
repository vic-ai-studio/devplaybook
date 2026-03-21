import { useState } from 'preact/hooks';

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=tech-stack-detector';

interface DetectedStack {
  repoName: string;
  description: string;
  stars: number;
  forks: number;
  languages: Array<{ name: string; bytes: number; percent: number }>;
  frameworks: string[];
  databases: string[];
  devops: string[];
  testing: string[];
  other: string[];
}

const FRAMEWORK_SIGNALS: Record<string, string[]> = {
  'React': ['react', 'react-dom', 'next', '@types/react'],
  'Next.js': ['next'],
  'Vue': ['vue', 'nuxt', '@vue/'],
  'Angular': ['@angular/core', '@angular/'],
  'Svelte': ['svelte', '@sveltejs/'],
  'Astro': ['astro', '@astrojs/'],
  'Express': ['express'],
  'FastAPI': ['fastapi'],
  'Django': ['django'],
  'Flask': ['flask'],
  'Rails': ['rails', 'actioncable'],
  'Laravel': ['laravel/'],
  'Spring': ['spring-boot', 'spring-framework'],
  'Nest.js': ['@nestjs/'],
  'Electron': ['electron'],
  'Tauri': ['tauri'],
  'React Native': ['react-native', 'expo'],
  'Flutter': ['flutter'],
  'GraphQL': ['graphql', 'apollo', '@apollo/'],
  'tRPC': ['@trpc/'],
  'Prisma': ['prisma', '@prisma/'],
  'Drizzle': ['drizzle-orm'],
  'Tailwind CSS': ['tailwindcss'],
  'Vite': ['vite'],
  'Webpack': ['webpack'],
  'Turbo': ['turbo', 'turborepo'],
};

const DATABASE_SIGNALS: Record<string, string[]> = {
  'PostgreSQL': ['pg', 'postgres', 'postgresql', 'psycopg'],
  'MySQL': ['mysql', 'mysql2', 'mariadb'],
  'MongoDB': ['mongoose', 'mongodb'],
  'Redis': ['redis', 'ioredis'],
  'SQLite': ['sqlite', 'better-sqlite3'],
  'Supabase': ['supabase', '@supabase/'],
  'Firebase': ['firebase', '@firebase/'],
  'PlanetScale': ['planetscale'],
  'Neon': ['@neondatabase/'],
};

const DEVOPS_SIGNALS: Record<string, string[]> = {
  'Docker': ['dockerfile', 'docker-compose'],
  'GitHub Actions': ['.github/workflows'],
  'Vercel': ['vercel', '@vercel/'],
  'Cloudflare': ['wrangler', '@cloudflare/'],
  'AWS': ['aws-sdk', '@aws-sdk/'],
  'Terraform': ['terraform'],
  'Kubernetes': ['kubernetes'],
};

const TEST_SIGNALS: Record<string, string[]> = {
  'Jest': ['jest', '@jest/'],
  'Vitest': ['vitest'],
  'Playwright': ['playwright', '@playwright/'],
  'Cypress': ['cypress'],
  'pytest': ['pytest'],
  'Mocha': ['mocha'],
};

function detectFromDeps(deps: Record<string, string>): { frameworks: string[]; databases: string[]; testing: string[]; other: string[] } {
  const keys = Object.keys(deps).map(k => k.toLowerCase());

  const match = (signals: Record<string, string[]>) =>
    Object.entries(signals)
      .filter(([, triggers]) => triggers.some(t => keys.some(k => k.includes(t))))
      .map(([name]) => name);

  return {
    frameworks: match(FRAMEWORK_SIGNALS),
    databases: match(DATABASE_SIGNALS),
    testing: match(TEST_SIGNALS),
    other: [],
  };
}

function parseGitHubUrl(input: string): { owner: string; repo: string } | null {
  try {
    const cleaned = input.trim().replace(/\.git$/, '');
    const match = cleaned.match(/github\.com[/:]([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2] };
    // bare "owner/repo"
    const bare = cleaned.match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (bare) return { owner: bare[1], repo: bare[2] };
  } catch {}
  return null;
}

const LANG_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a', TypeScript: '#3178c6', Python: '#3572A5',
  Go: '#00add8', Rust: '#dea584', Java: '#b07219', 'C++': '#f34b7d',
  C: '#555555', Ruby: '#701516', PHP: '#4f5d95', Swift: '#f05138',
  Kotlin: '#a97bff', Dart: '#00b4d8', Scala: '#c22d40', HTML: '#e34c26',
  CSS: '#563d7c', Shell: '#89e051', Dockerfile: '#384d54',
};

export default function TechStackDetector() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<DetectedStack | null>(null);
  const [copied, setCopied] = useState(false);

  const detect = async () => {
    const parsed = parseGitHubUrl(input);
    if (!parsed) {
      setError('Please enter a valid GitHub URL or "owner/repo" format.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const { owner, repo } = parsed;
      const [repoRes, langsRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${owner}/${repo}`),
        fetch(`https://api.github.com/repos/${owner}/${repo}/languages`),
      ]);

      if (!repoRes.ok) {
        setError(repoRes.status === 404 ? 'Repository not found. Make sure it\'s public.' : 'GitHub API error.');
        return;
      }

      const repoData = await repoRes.json();
      const langsData: Record<string, number> = langsRes.ok ? await langsRes.json() : {};

      // Fetch package.json for dep analysis
      let frameworks: string[] = [];
      let databases: string[] = [];
      let testing: string[] = [];
      const other: string[] = [];

      try {
        const pkgRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch || 'main'}/package.json`);
        if (pkgRes.ok) {
          const pkg = await pkgRes.json();
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          const detected = detectFromDeps(deps);
          frameworks = detected.frameworks;
          databases = detected.databases;
          testing = detected.testing;
        }
      } catch {}

      // Try requirements.txt for Python
      try {
        const reqRes = await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${repoData.default_branch || 'main'}/requirements.txt`);
        if (reqRes.ok) {
          const txt = await reqRes.text();
          const deps = Object.fromEntries(txt.split('\n').filter(Boolean).map(l => [l.split(/[>=<]/)[0].toLowerCase(), '']));
          const detected = detectFromDeps(deps);
          frameworks = [...new Set([...frameworks, ...detected.frameworks])];
          databases = [...new Set([...databases, ...detected.databases])];
          testing = [...new Set([...testing, ...detected.testing])];
        }
      } catch {}

      // Languages
      const totalBytes = Object.values(langsData).reduce((s, v) => s + v, 0);
      const languages = Object.entries(langsData)
        .sort(([, a], [, b]) => b - a)
        .map(([name, bytes]) => ({ name, bytes, percent: Math.round((bytes / totalBytes) * 100) }));

      // DevOps detection from repo topics
      const devops: string[] = [];
      for (const topic of (repoData.topics || [])) {
        for (const [name, signals] of Object.entries(DEVOPS_SIGNALS)) {
          if (signals.some(s => topic.includes(s.toLowerCase()))) {
            if (!devops.includes(name)) devops.push(name);
          }
        }
      }

      setResult({
        repoName: repoData.full_name,
        description: repoData.description || '',
        stars: repoData.stargazers_count,
        forks: repoData.forks_count,
        languages,
        frameworks,
        databases,
        devops,
        testing,
        other,
      });
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const shareText = result
    ? `Tech stack for ${result.repoName}: ${[...result.frameworks, ...result.databases].join(', ')} — detected by devplaybook.cc`
    : '';

  const copyReport = () => {
    if (!result) return;
    const text = [
      `# Tech Stack: ${result.repoName}`,
      result.description && `> ${result.description}`,
      '',
      `**Languages:** ${result.languages.map(l => `${l.name} ${l.percent}%`).join(', ')}`,
      result.frameworks.length && `**Frameworks:** ${result.frameworks.join(', ')}`,
      result.databases.length && `**Databases:** ${result.databases.join(', ')}`,
      result.testing.length && `**Testing:** ${result.testing.join(', ')}`,
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="flex gap-3">
        <input
          type="text"
          placeholder="github.com/vercel/next.js or vercel/next.js"
          value={input}
          onInput={e => setInput((e.target as HTMLInputElement).value)}
          onKeyDown={e => e.key === 'Enter' && detect()}
          class="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={detect}
          disabled={loading || !input.trim()}
          class="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
        >
          {loading ? 'Detecting…' : 'Detect Stack'}
        </button>
      </div>

      {error && (
        <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {result && (
        <div class="space-y-4">
          {/* Repo header */}
          <div class="p-4 rounded-lg border border-border bg-bg-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <h3 class="font-mono font-bold text-primary">{result.repoName}</h3>
                {result.description && <p class="text-sm text-text-muted mt-1">{result.description}</p>}
              </div>
              <div class="flex gap-4 text-sm shrink-0">
                <span class="text-text-muted">⭐ {result.stars.toLocaleString()}</span>
                <span class="text-text-muted">🍴 {result.forks.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Languages */}
          {result.languages.length > 0 && (
            <div>
              <h4 class="text-sm font-semibold mb-3">Languages</h4>
              <div class="space-y-2">
                {result.languages.slice(0, 8).map(l => (
                  <div key={l.name} class="flex items-center gap-3">
                    <div class="w-3 h-3 rounded-full shrink-0" style={{ background: LANG_COLORS[l.name] || '#888' }} />
                    <span class="text-sm w-28 shrink-0">{l.name}</span>
                    <div class="flex-1 bg-border rounded-full h-2">
                      <div class="h-2 rounded-full transition-all" style={{ width: `${l.percent}%`, background: LANG_COLORS[l.name] || '#888' }} />
                    </div>
                    <span class="text-xs text-text-muted w-10 text-right shrink-0">{l.percent}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stack badges */}
          {[
            { label: 'Frameworks & Libraries', items: result.frameworks, color: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
            { label: 'Databases', items: result.databases, color: 'bg-green-500/10 border-green-500/30 text-green-400' },
            { label: 'Testing', items: result.testing, color: 'bg-purple-500/10 border-purple-500/30 text-purple-400' },
            { label: 'DevOps', items: result.devops, color: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
          ].map(group => group.items.length > 0 && (
            <div key={group.label}>
              <h4 class="text-sm font-semibold mb-2">{group.label}</h4>
              <div class="flex flex-wrap gap-2">
                {group.items.map(item => (
                  <span key={item} class={`px-3 py-1 rounded-full text-xs font-medium border ${group.color}`}>{item}</span>
                ))}
              </div>
            </div>
          ))}

          {/* Share */}
          <div class="flex flex-wrap gap-2 pt-2">
            <button onClick={copyReport}
              class="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`}
              target="_blank" rel="noopener"
              class="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors"
            >
              Share on X/Twitter
            </a>
          </div>

          <p class="text-xs text-text-muted">
            Note: Framework detection is based on package.json/requirements.txt analysis. Not all tools may be detected.{' '}
            <a href={DEVTOOLKIT_URL} target="_blank" rel="noopener" class="text-primary hover:underline">
              Get the DevToolkit Starter Kit →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
