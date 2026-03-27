import { useState, useCallback } from 'preact/hooks';

type Ecosystem = 'npm' | 'pip' | 'cargo' | 'go' | 'unknown';

interface Dependency {
  name: string;
  version: string;
  ecosystem: Ecosystem;
  purl: string;
}

interface SbomResult {
  deps: Dependency[];
  ecosystem: Ecosystem;
}

function generateUUID(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const h = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function detectEcosystem(content: string): Ecosystem {
  const trimmed = content.trim();
  // Cargo.toml — has [dependencies] or [package]
  if (trimmed.includes('[dependencies]') || trimmed.includes('[package]')) return 'cargo';
  // go.mod — starts with module
  if (/^module\s+\S/m.test(trimmed) && trimmed.includes('require')) return 'go';
  // requirements.txt — no braces, no colons at top level, just pkg==ver lines
  if (/^[A-Za-z0-9_\-\.]+(\s*[=!<>~]{1,3}\s*[\d\w\.]+)?(\s*;.*)?$/m.test(trimmed) && !trimmed.includes('{')) return 'pip';
  // package.json — JSON with dependencies key
  try {
    const json = JSON.parse(trimmed);
    if (json && (json.dependencies || json.devDependencies || json.peerDependencies)) return 'npm';
  } catch {}
  return 'unknown';
}

function parseNpm(content: string): Dependency[] {
  try {
    const json = JSON.parse(content);
    const deps: Dependency[] = [];
    const sources = [
      { obj: json.dependencies, dev: false },
      { obj: json.devDependencies, dev: true },
      { obj: json.peerDependencies, dev: false },
      { obj: json.optionalDependencies, dev: false },
    ];
    for (const { obj } of sources) {
      if (!obj) continue;
      for (const [name, ver] of Object.entries(obj as Record<string, string>)) {
        // Strip semver range prefixes like ^, ~, >=
        const version = String(ver).replace(/^[^0-9a-zA-Z]*/, '') || 'unknown';
        deps.push({ name, version, ecosystem: 'npm', purl: `pkg:npm/${name}@${version}` });
      }
    }
    // Deduplicate by name (keep first occurrence)
    const seen = new Set<string>();
    return deps.filter(d => {
      if (seen.has(d.name)) return false;
      seen.add(d.name);
      return true;
    });
  } catch {
    return [];
  }
}

function parsePip(content: string): Dependency[] {
  const deps: Dependency[] = [];
  for (const raw of content.split('\n')) {
    const line = raw.split('#')[0].trim();
    if (!line || line.startsWith('-') || line.startsWith('--')) continue;
    // Handles: pkg==1.0.0, pkg>=1.0, pkg~=1.0, pkg[extra]==1.0, pkg @ url
    const match = line.match(/^([A-Za-z0-9_\-\.]+)(?:\[.*?\])?(?:\s*(?:==|>=|<=|~=|!=|>|<)\s*([\d\w\.\*]+))?/);
    if (match) {
      const name = match[1];
      const version = match[2] || 'unknown';
      deps.push({ name, version, ecosystem: 'pip', purl: `pkg:pypi/${name.toLowerCase()}@${version}` });
    }
  }
  return deps;
}

function parseCargo(content: string): Dependency[] {
  const deps: Dependency[] = [];
  let inDeps = false;
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (/^\[.*dependencies.*\]/.test(line)) { inDeps = true; continue; }
    if (/^\[/.test(line) && inDeps) { inDeps = false; }
    if (!inDeps || !line || line.startsWith('#')) continue;
    // name = "1.0.0"  or  name = { version = "1.0.0", ... }
    const simple = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*"([^"]+)"/);
    if (simple) {
      deps.push({ name: simple[1], version: simple[2], ecosystem: 'cargo', purl: `pkg:cargo/${simple[1]}@${simple[2]}` });
      continue;
    }
    const inlineVer = line.match(/^([A-Za-z0-9_\-]+)\s*=\s*\{[^}]*version\s*=\s*"([^"]+)"/);
    if (inlineVer) {
      deps.push({ name: inlineVer[1], version: inlineVer[2], ecosystem: 'cargo', purl: `pkg:cargo/${inlineVer[1]}@${inlineVer[2]}` });
    }
  }
  return deps;
}

function parseGo(content: string): Dependency[] {
  const deps: Dependency[] = [];
  let inRequire = false;
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (line === 'require (') { inRequire = true; continue; }
    if (inRequire && line === ')') { inRequire = false; continue; }
    // Single-line require: require module/path v1.2.3
    const single = line.match(/^require\s+(\S+)\s+(v[\d\w\.\-\+]+)/);
    if (single) {
      const name = single[1];
      const version = single[2];
      deps.push({ name, version, ecosystem: 'go', purl: `pkg:golang/${name}@${version}` });
      continue;
    }
    // Inside require block
    if (inRequire && line && !line.startsWith('//')) {
      const m = line.match(/^(\S+)\s+(v[\d\w\.\-\+]+)/);
      if (m) {
        deps.push({ name: m[1], version: m[2], ecosystem: 'go', purl: `pkg:golang/${m[1]}@${m[2]}` });
      }
    }
  }
  return deps;
}

function parseFile(content: string, ecosystem: Ecosystem): Dependency[] {
  if (ecosystem === 'npm') return parseNpm(content);
  if (ecosystem === 'pip') return parsePip(content);
  if (ecosystem === 'cargo') return parseCargo(content);
  if (ecosystem === 'go') return parseGo(content);
  return [];
}

function buildCycloneDX(deps: Dependency[]) {
  return {
    bomFormat: 'CycloneDX',
    specVersion: '1.5',
    serialNumber: `urn:uuid:${generateUUID()}`,
    version: 1,
    metadata: {
      timestamp: new Date().toISOString(),
      tools: [{ name: 'DevPlaybook SBOM Generator', version: '1.0' }],
    },
    components: deps.map(d => ({
      type: 'library',
      name: d.name,
      version: d.version,
      purl: d.purl,
    })),
  };
}

const ECOSYSTEM_LABELS: Record<Ecosystem, string> = {
  npm: 'npm (package.json)',
  pip: 'pip (requirements.txt)',
  cargo: 'Cargo (Cargo.toml)',
  go: 'Go (go.mod)',
  unknown: 'Unknown',
};

const ECOSYSTEM_COLORS: Record<Ecosystem, string> = {
  npm: 'text-red-400',
  pip: 'text-blue-400',
  cargo: 'text-orange-400',
  go: 'text-cyan-400',
  unknown: 'text-text-muted',
};

const SAMPLE_PACKAGE_JSON = `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "axios": "^1.6.0",
    "lodash": "~4.17.21",
    "zod": "3.22.4"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "eslint": "^8.55.0"
  }
}`;

export default function SbomGenerator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<SbomResult | null>(null);
  const [error, setError] = useState('');
  const [exported, setExported] = useState(false);

  const analyze = useCallback(() => {
    setError('');
    setExported(false);
    const content = input.trim();
    if (!content) { setError('Paste a package file (package.json, requirements.txt, Cargo.toml, or go.mod).'); return; }
    const ecosystem = detectEcosystem(content);
    if (ecosystem === 'unknown') {
      setError('Could not detect ecosystem. Supported formats: package.json, requirements.txt, Cargo.toml, go.mod.');
      setResult(null);
      return;
    }
    const deps = parseFile(content, ecosystem);
    if (deps.length === 0) {
      setError('No dependencies found. Make sure the file has a valid dependency section.');
      setResult(null);
      return;
    }
    setResult({ deps, ecosystem });
  }, [input]);

  const loadSample = () => {
    setInput(SAMPLE_PACKAGE_JSON);
    setResult(null);
    setError('');
  };

  const exportJson = () => {
    if (!result) return;
    const sbom = buildCycloneDX(result.deps);
    const blob = new Blob([JSON.stringify(sbom, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sbom.cyclonedx.json';
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="block text-sm font-medium text-text-muted">Paste Package File</label>
          <button
            onClick={loadSample}
            class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors text-text-muted"
          >
            Load sample package.json
          </button>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setResult(null); setError(''); }}
          placeholder={"Paste your package.json, requirements.txt, Cargo.toml, or go.mod here…"}
          rows={12}
          class="w-full font-mono text-sm bg-surface border border-border rounded-lg px-4 py-3 focus:outline-none focus:ring-1 focus:ring-accent resize-y text-text"
          spellcheck={false}
        />
      </div>

      {/* Generate button */}
      <button
        onClick={analyze}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Generate SBOM
      </button>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Summary bar */}
          <div class="flex items-center justify-between flex-wrap gap-3 bg-surface border border-border rounded-lg px-4 py-3">
            <div class="flex items-center gap-4 text-sm flex-wrap">
              <span class="text-text-muted">
                Ecosystem: <span class={`font-semibold ${ECOSYSTEM_COLORS[result.ecosystem]}`}>{ECOSYSTEM_LABELS[result.ecosystem]}</span>
              </span>
              <span class="text-text-muted">
                Format: <span class="font-semibold text-accent">CycloneDX 1.5</span>
              </span>
              <span class="text-text-muted">
                Total: <span class="font-semibold text-text">{result.deps.length} component{result.deps.length !== 1 ? 's' : ''}</span>
              </span>
            </div>
            <button
              onClick={exportJson}
              class={`text-sm px-4 py-1.5 rounded-lg border font-medium transition-colors ${
                exported
                  ? 'border-green-500 text-green-400 bg-green-500/10'
                  : 'border-accent text-accent bg-accent/10 hover:bg-accent/20'
              }`}
            >
              {exported ? '✓ Downloaded' : 'Export JSON'}
            </button>
          </div>

          {/* Dependency table */}
          <div class="overflow-x-auto rounded-lg border border-border">
            <table class="w-full text-sm">
              <thead>
                <tr class="bg-surface border-b border-border text-text-muted text-left">
                  <th class="px-4 py-2.5 font-medium">#</th>
                  <th class="px-4 py-2.5 font-medium">Package</th>
                  <th class="px-4 py-2.5 font-medium">Version</th>
                  <th class="px-4 py-2.5 font-medium">Ecosystem</th>
                  <th class="px-4 py-2.5 font-medium">PURL</th>
                </tr>
              </thead>
              <tbody>
                {result.deps.map((dep, i) => (
                  <tr key={dep.name} class={`border-b border-border last:border-0 ${i % 2 === 0 ? '' : 'bg-surface/50'}`}>
                    <td class="px-4 py-2 text-text-muted">{i + 1}</td>
                    <td class="px-4 py-2 font-mono font-medium text-text">{dep.name}</td>
                    <td class="px-4 py-2 font-mono text-text-muted">{dep.version}</td>
                    <td class="px-4 py-2">
                      <span class={`text-xs font-medium ${ECOSYSTEM_COLORS[dep.ecosystem]}`}>
                        {dep.ecosystem}
                      </span>
                    </td>
                    <td class="px-4 py-2 font-mono text-xs text-text-muted truncate max-w-[240px]" title={dep.purl}>{dep.purl}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* CycloneDX preview */}
          <details class="group">
            <summary class="cursor-pointer text-sm text-text-muted hover:text-text flex items-center gap-2 select-none">
              <span class="transition-transform group-open:rotate-90">▶</span>
              Preview CycloneDX JSON (first 5 components)
            </summary>
            <pre class="mt-2 bg-surface border border-border rounded-lg px-4 py-3 text-xs font-mono overflow-x-auto text-text-muted leading-relaxed">
              {JSON.stringify(
                { ...buildCycloneDX(result.deps.slice(0, 5)), components: buildCycloneDX(result.deps.slice(0, 5)).components },
                null, 2
              )}
            </pre>
          </details>
        </div>
      )}

      {/* Info box */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-1">
        <p class="font-medium text-text mb-1">What is an SBOM?</p>
        <p>A Software Bill of Materials (SBOM) is a formal, machine-readable inventory of the components in a software product. CycloneDX is an OWASP standard widely used for supply chain security, vulnerability management, and compliance (NTIA, EO 14028).</p>
        <p class="mt-1">All parsing happens entirely in your browser — no files are uploaded to any server.</p>
      </div>
    </div>
  );
}
