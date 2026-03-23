import { useState } from 'preact/hooks';

interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
  public_repos: number;
  followers: number;
  following: number;
  bio: string | null;
}

interface GitHubRepo {
  stargazers_count: number;
  language: string | null;
  fork: boolean;
}

interface StatsResult {
  user: GitHubUser;
  totalStars: number;
  topLanguages: Array<{ name: string; count: number }>;
}

const DEVTOOLKIT_URL = 'https://vicnail.gumroad.com/l/devtoolkit-starter-kit?utm_source=devplaybook&utm_medium=tool&utm_campaign=github-stats-card';

const CARD_THEMES = [
  { id: 'dark', label: 'Dark', bg: '#0d1117', text: '#e6edf3', border: '#30363d', accent: '#58a6ff', sub: '#8b949e' },
  { id: 'light', label: 'Light', bg: '#ffffff', text: '#24292f', border: '#d0d7de', accent: '#0969da', sub: '#57606a' },
  { id: 'tokyo', label: 'Tokyo Night', bg: '#1a1b2e', text: '#c0caf5', border: '#292e42', accent: '#7aa2f7', sub: '#565f89' },
  { id: 'dracula', label: 'Dracula', bg: '#282a36', text: '#f8f8f2', border: '#44475a', accent: '#bd93f9', sub: '#6272a4' },
];

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function generateSVG(stats: StatsResult, theme: typeof CARD_THEMES[0]): string {
  const { user, totalStars, topLanguages } = stats;
  const displayName = escapeHtml(user.name || user.login);
  const safeLogin = escapeHtml(user.login);
  const bio = user.bio ? escapeHtml(user.bio.length > 50 ? user.bio.slice(0, 47) + '...' : user.bio) : '';
  const langs = topLanguages.slice(0, 5);

  const langDots = langs.map((l, i) => {
    const colors = ['#f1e05a', '#3572A5', '#e34c26', '#b07219', '#563d7c', '#00b4d8', '#4ec820'];
    return `<circle cx="${16}" cy="${160 + i * 22}" r="5" fill="${colors[i % colors.length]}"/>
      <text x="28" y="${165 + i * 22}" fill="${theme.sub}" font-size="12" font-family="monospace">${l.name} (${l.count})</text>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="${180 + langs.length * 22}" viewBox="0 0 400 ${180 + langs.length * 22}">
  <rect width="400" height="${180 + langs.length * 22}" rx="10" fill="${theme.bg}" stroke="${theme.border}" stroke-width="1"/>
  <text x="20" y="35" fill="${theme.text}" font-size="18" font-weight="bold" font-family="monospace">@${safeLogin}</text>
  ${displayName !== safeLogin ? `<text x="20" y="55" fill="${theme.sub}" font-size="13" font-family="monospace">${displayName}</text>` : ''}
  ${bio ? `<text x="20" y="${displayName !== safeLogin ? 75 : 55}" fill="${theme.sub}" font-size="11" font-family="monospace">${bio}</text>` : ''}
  <line x1="20" y1="95" x2="380" y2="95" stroke="${theme.border}" stroke-width="1"/>
  <text x="20" y="118" fill="${theme.accent}" font-size="22" font-weight="bold" font-family="monospace">${user.public_repos}</text>
  <text x="20" y="132" fill="${theme.sub}" font-size="11" font-family="monospace">Repos</text>
  <text x="130" y="118" fill="${theme.accent}" font-size="22" font-weight="bold" font-family="monospace">${totalStars}</text>
  <text x="130" y="132" fill="${theme.sub}" font-size="11" font-family="monospace">Stars</text>
  <text x="240" y="118" fill="${theme.accent}" font-size="22" font-weight="bold" font-family="monospace">${user.followers}</text>
  <text x="240" y="132" fill="${theme.sub}" font-size="11" font-family="monospace">Followers</text>
  <line x1="20" y1="148" x2="380" y2="148" stroke="${theme.border}" stroke-width="1"/>
  ${langDots}
</svg>`;
}

export default function GitHubStatsCard() {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<StatsResult | null>(null);
  const [themeId, setThemeId] = useState('dark');
  const [copied, setCopied] = useState<string | null>(null);

  const theme = CARD_THEMES.find(t => t.id === themeId)!;

  const fetchStats = async () => {
    const u = username.trim().replace(/^@/, '');
    if (!u) return;
    setLoading(true);
    setError('');
    setStats(null);
    try {
      const [userRes, reposRes] = await Promise.all([
        fetch(`https://api.github.com/users/${u}`),
        fetch(`https://api.github.com/users/${u}/repos?per_page=100&type=owner`),
      ]);
      if (!userRes.ok) {
        setError(userRes.status === 404 ? `User "${u}" not found on GitHub.` : 'GitHub API error. Try again later.');
        return;
      }
      const user: GitHubUser = await userRes.json();
      const repos: GitHubRepo[] = reposRes.ok ? await reposRes.json() : [];

      const nonForks = repos.filter(r => !r.fork);
      const totalStars = nonForks.reduce((s, r) => s + r.stargazers_count, 0);
      const langCounts: Record<string, number> = {};
      for (const r of nonForks) {
        if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
      }
      const topLanguages = Object.entries(langCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, count]) => ({ name, count }));

      setStats({ user, totalStars, topLanguages });
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const svg = stats ? generateSVG(stats, theme) : '';
  const svgBlob = svg ? `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}` : '';
  const markdownEmbed = stats ? `![${stats.user.login} GitHub Stats](${svgBlob})` : '';
  const htmlEmbed = stats ? `<img src="${svgBlob}" alt="${stats.user.login} GitHub Stats" />` : '';

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const shareUrl = `https://devplaybook.cc/tools/github-stats-card?u=${encodeURIComponent(username)}`;

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="flex gap-3">
        <input
          type="text"
          placeholder="GitHub username (e.g. torvalds)"
          value={username}
          onInput={(e) => setUsername((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchStats()}
          class="flex-1 bg-bg-card border border-border rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-primary transition-colors"
        />
        <button
          onClick={fetchStats}
          disabled={loading || !username.trim()}
          class="px-6 py-3 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Loading…' : 'Generate Card'}
        </button>
      </div>

      {error && (
        <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">{error}</div>
      )}

      {/* Theme picker */}
      {stats && (
        <div>
          <p class="text-sm font-medium text-text-muted mb-2">Card Theme</p>
          <div class="flex gap-2 flex-wrap">
            {CARD_THEMES.map(t => (
              <button
                key={t.id}
                onClick={() => setThemeId(t.id)}
                class={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${themeId === t.id ? 'border-primary text-primary' : 'border-border text-text-muted hover:border-primary/50'}`}
                style={{ background: t.bg, color: themeId === t.id ? t.accent : t.sub }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Card preview */}
      {stats && (
        <div class="space-y-4">
          <div class="p-4 rounded-lg border border-border bg-bg-card flex justify-center">
            <div dangerouslySetInnerHTML={{ __html: svg }} />
          </div>

          {/* Stats row */}
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="p-3 rounded-lg bg-bg-card border border-border">
              <div class="text-2xl font-bold text-primary">{stats.user.public_repos}</div>
              <div class="text-xs text-text-muted mt-1">Public Repos</div>
            </div>
            <div class="p-3 rounded-lg bg-bg-card border border-border">
              <div class="text-2xl font-bold text-primary">{stats.totalStars}</div>
              <div class="text-xs text-text-muted mt-1">Total Stars</div>
            </div>
            <div class="p-3 rounded-lg bg-bg-card border border-border">
              <div class="text-2xl font-bold text-primary">{stats.user.followers}</div>
              <div class="text-xs text-text-muted mt-1">Followers</div>
            </div>
          </div>

          {/* Embed codes */}
          <div class="space-y-3">
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-sm font-medium text-text-muted">Markdown embed (for your README)</label>
                <button
                  onClick={() => copy(markdownEmbed, 'md')}
                  class="text-xs text-primary hover:underline"
                >
                  {copied === 'md' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="text-xs bg-bg-card border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-text-muted select-all">{markdownEmbed.slice(0, 120)}…</pre>
            </div>
            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="text-sm font-medium text-text-muted">HTML embed</label>
                <button
                  onClick={() => copy(htmlEmbed, 'html')}
                  class="text-xs text-primary hover:underline"
                >
                  {copied === 'html' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="text-xs bg-bg-card border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-all text-text-muted select-all">{htmlEmbed.slice(0, 120)}…</pre>
            </div>
          </div>

          {/* Share */}
          <div class="flex flex-wrap gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=Check%20out%20my%20GitHub%20stats%20card%20generated%20by%20devplaybook.cc!&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener"
              class="px-4 py-2 bg-sky-500/10 border border-sky-500/30 text-sky-400 rounded-lg text-sm hover:bg-sky-500/20 transition-colors"
            >
              Share on X/Twitter
            </a>
            <button
              onClick={() => copy(shareUrl, 'url')}
              class="px-4 py-2 bg-bg-card border border-border text-text-muted rounded-lg text-sm hover:border-primary/50 transition-colors"
            >
              {copied === 'url' ? 'Link copied!' : 'Copy link'}
            </button>
          </div>

          <p class="text-xs text-text-muted">
            Want ready-made GitHub profile templates and dev tools?{' '}
            <a href={DEVTOOLKIT_URL} target="_blank" rel="noopener" class="text-primary hover:underline">
              Get the DevToolkit Starter Kit →
            </a>
          </p>
        </div>
      )}
    </div>
  );
}
