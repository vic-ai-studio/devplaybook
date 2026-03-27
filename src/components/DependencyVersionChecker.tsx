import { useState, useCallback } from 'preact/hooks';

interface DepResult {
  name: string;
  range: string;
  type: 'dep' | 'dev' | 'peer' | 'optional';
  semverType: 'exact' | 'caret' | 'tilde' | 'wildcard' | 'range' | 'url' | 'tag';
  risk: 'low' | 'medium' | 'high';
  notes: string[];
}

function classifySemver(version: string): Pick<DepResult, 'semverType' | 'risk' | 'notes'> {
  const notes: string[] = [];
  let semverType: DepResult['semverType'] = 'exact';
  let risk: DepResult['risk'] = 'low';

  if (version.startsWith('http') || version.startsWith('git') || version.includes('github')) {
    semverType = 'url';
    risk = 'high';
    notes.push('URL/Git dependency — not version-pinned, can change at any time');
  } else if (version === '*' || version === '' || version === 'latest') {
    semverType = 'wildcard';
    risk = 'high';
    notes.push('"*" or "latest" installs the newest version — breaking changes possible');
  } else if (version.startsWith('^')) {
    semverType = 'caret';
    risk = 'medium';
    const vParts = version.slice(1).split('.');
    if (vParts[0] === '0') {
      risk = 'high';
      notes.push('Major version 0: ^ allows minor/patch bumps which may be breaking (semver 0.x policy)');
    } else {
      notes.push('Caret (^): allows minor/patch updates — safe for most packages');
    }
  } else if (version.startsWith('~')) {
    semverType = 'tilde';
    risk = 'low';
    notes.push('Tilde (~): patch updates only — conservative and safe');
  } else if (version.includes(' ') || version.includes('>') || version.includes('<') || version.includes('||')) {
    semverType = 'range';
    risk = 'medium';
    notes.push('Version range — multiple allowed versions, verify range is intentional');
  } else if (/^\d/.test(version) || version.startsWith('=')) {
    semverType = 'exact';
    risk = 'low';
    notes.push('Exact pin — reproducible installs, but no automatic security patches');
  } else {
    semverType = 'tag';
    risk = 'medium';
    notes.push(`Tag/channel "${version}" — resolves to a moving target`);
  }

  return { semverType, risk, notes };
}

function analyzePackageJson(input: string): DepResult[] | { error: string } {
  let pkg: any;
  try {
    pkg = JSON.parse(input);
  } catch {
    return { error: 'Invalid JSON. Paste the full contents of your package.json file.' };
  }

  const sections: { key: string; type: DepResult['type'] }[] = [
    { key: 'dependencies', type: 'dep' },
    { key: 'devDependencies', type: 'dev' },
    { key: 'peerDependencies', type: 'peer' },
    { key: 'optionalDependencies', type: 'optional' },
  ];

  const results: DepResult[] = [];

  for (const { key, type } of sections) {
    const deps = pkg[key];
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, version] of Object.entries(deps) as [string, string][]) {
      const { semverType, risk, notes } = classifySemver(String(version));
      results.push({ name, range: String(version), type, semverType, risk, notes });
    }
  }

  if (results.length === 0) {
    return { error: 'No dependencies found. Make sure your package.json has "dependencies", "devDependencies", "peerDependencies", or "optionalDependencies".' };
  }

  // Sort: high risk first
  results.sort((a, b) => {
    const o = { high: 0, medium: 1, low: 2 };
    return o[a.risk] - o[b.risk];
  });

  return results;
}

const SAMPLE_PKG = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^0.21.0",
    "lodash": "4.17.21",
    "some-lib": "*",
    "legacy-pkg": "~1.2.3",
    "private-tool": "github:org/private-repo#main"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "eslint": "8.x",
    "jest": ">=27.0.0 <30.0.0",
    "vite": "latest"
  },
  "peerDependencies": {
    "react": ">=16"
  }
}`;

const RISK_CONFIG = {
  high:   { bg: 'bg-red-500/10',    border: 'border-red-500/40',    text: 'text-red-400',    badge: 'High Risk' },
  medium: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/40', text: 'text-yellow-400', badge: 'Medium' },
  low:    { bg: 'bg-green-500/10',  border: 'border-green-500/40',  text: 'text-green-400',  badge: 'Low Risk' },
};

const TYPE_LABEL: Record<DepResult['type'], string> = {
  dep: 'dep', dev: 'dev', peer: 'peer', optional: 'optional',
};

const SEMVER_LABEL: Record<DepResult['semverType'], string> = {
  exact: 'exact', caret: '^caret', tilde: '~tilde', wildcard: '*wildcard',
  range: 'range', url: 'url/git', tag: 'tag',
};

export default function DependencyVersionChecker() {
  const [input, setInput] = useState(SAMPLE_PKG);
  const [results, setResults] = useState<DepResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  const analyze = useCallback(() => {
    setError(null);
    const out = analyzePackageJson(input);
    if ('error' in out) {
      setError(out.error);
      setResults(null);
    } else {
      setResults(out);
    }
  }, [input]);

  const copyReport = useCallback(() => {
    if (!results) return;
    const lines = results.map(r =>
      `[${r.risk.toUpperCase()}] ${r.name}@${r.range} (${r.semverType}, ${r.type}) — ${r.notes.join('; ')}`
    );
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }, [results]);

  const filtered = results?.filter(r => filter === 'all' || r.risk === filter) ?? [];
  const highCount = results?.filter(r => r.risk === 'high').length ?? 0;
  const mediumCount = results?.filter(r => r.risk === 'medium').length ?? 0;
  const lowCount = results?.filter(r => r.risk === 'low').length ?? 0;

  return (
    <div class="space-y-4">
      <div class="flex gap-2 flex-wrap items-center">
        <span class="text-sm text-text-muted">package.json</span>
        <button
          onClick={() => { setInput(SAMPLE_PKG); setResults(null); setError(null); }}
          class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
        >
          Load Sample
        </button>
      </div>

      <textarea
        value={input}
        onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setResults(null); setError(null); }}
        placeholder="Paste your package.json contents here..."
        class="w-full h-56 bg-[#0d1117] border border-border rounded-lg p-3 font-mono text-xs resize-none focus:outline-none focus:border-accent text-text"
        spellcheck={false}
      />

      <button
        onClick={analyze}
        class="px-5 py-2 bg-accent text-white rounded hover:bg-accent/80 transition-colors text-sm font-medium"
      >
        Analyze Dependencies
      </button>

      {error && (
        <div class="p-3 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-400">{error}</div>
      )}

      {results && (
        <div class="space-y-3">
          <div class="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg text-sm flex-wrap">
            <span class="font-medium text-text">{results.length} dependencies</span>
            <span class="text-red-400">{highCount} high risk</span>
            <span class="text-yellow-400">{mediumCount} medium</span>
            <span class="text-green-400">{lowCount} low risk</span>
            <button
              onClick={copyReport}
              class="ml-auto px-3 py-1.5 text-xs bg-surface border border-border rounded text-text-muted hover:border-accent transition-colors"
            >
              {copied ? 'Copied!' : 'Copy Report'}
            </button>
          </div>

          <div class="flex gap-2 flex-wrap">
            {(['all', 'high', 'medium', 'low'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                class={`px-3 py-1 text-xs rounded border transition-colors ${filter === f ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-muted hover:border-accent'}`}
              >
                {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div class="space-y-2">
            {filtered.map((r, i) => {
              const cfg = RISK_CONFIG[r.risk];
              return (
                <div key={i} class={`p-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
                  <div class="flex items-start gap-2 flex-wrap">
                    <code class="text-sm font-mono font-bold text-text">{r.name}</code>
                    <span class="font-mono text-xs text-text-muted">{r.range}</span>
                    <span class={`text-xs font-bold uppercase tracking-wide ml-auto ${cfg.text}`}>{cfg.badge}</span>
                  </div>
                  <div class="flex gap-2 mt-1.5 flex-wrap">
                    <span class="text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">{TYPE_LABEL[r.type]}</span>
                    <span class="text-xs px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">{SEMVER_LABEL[r.semverType]}</span>
                  </div>
                  {r.notes.map((n, j) => (
                    <p key={j} class={`text-xs mt-1.5 ${cfg.text}`}>{n}</p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <p class="text-xs text-text-muted">
        Parses package.json dependencies and devDependencies. Identifies version range risks — wildcards, caret on v0.x, URL deps, and ambiguous ranges. Runs 100% in your browser.
      </p>
    </div>
  );
}
