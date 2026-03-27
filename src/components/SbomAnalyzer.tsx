import { useState } from 'preact/hooks';

type SbomFormat = 'cyclonedx' | 'spdx' | 'unknown';

interface ComponentRow {
  name: string;
  version: string;
  license: string;
  type: string;
  hasLicense: boolean;
}

interface AnalysisResult {
  format: SbomFormat;
  formatVersion: string;
  componentCount: number;
  components: ComponentRow[];
  licenseCounts: Record<string, number>;
  unlicensedCount: number;
  errors: string[];
}

function detectFormat(obj: any): SbomFormat {
  if (obj && obj.bomFormat === 'CycloneDX') return 'cyclonedx';
  if (obj && typeof obj.spdxVersion === 'string') return 'spdx';
  return 'unknown';
}

function parseLicenseCycloneDX(licenses: any): string {
  if (!licenses || !Array.isArray(licenses) || licenses.length === 0) return '';
  return licenses.map((l: any) => {
    if (l.license) {
      return l.license.id || l.license.name || '';
    }
    if (l.expression) return l.expression;
    return '';
  }).filter(Boolean).join(', ');
}

function parseLicenseSpdx(pkgLicenses: any): string {
  if (!pkgLicenses) return '';
  if (pkgLicenses === 'NOASSERTION' || pkgLicenses === 'NONE') return pkgLicenses;
  return String(pkgLicenses);
}

function analyzeCycloneDX(obj: any): AnalysisResult {
  const version = obj.specVersion || obj.version || '';
  const components: ComponentRow[] = [];
  const licenseCounts: Record<string, number> = {};
  const errors: string[] = [];

  const raw: any[] = Array.isArray(obj.components) ? obj.components : [];

  for (const c of raw) {
    const name = c.name || '(unnamed)';
    const ver = c.version || '';
    const type = c.type || '';
    const licenseStr = parseLicenseCycloneDX(c.licenses);
    const hasLicense = licenseStr.length > 0;
    const displayLicense = hasLicense ? licenseStr : '— no license —';

    if (hasLicense) {
      licenseCounts[licenseStr] = (licenseCounts[licenseStr] || 0) + 1;
    }

    components.push({ name, version: ver, license: displayLicense, type, hasLicense });
  }

  const unlicensedCount = components.filter(c => !c.hasLicense).length;

  if (raw.length === 0) {
    errors.push('No components array found or it is empty.');
  }

  return {
    format: 'cyclonedx',
    formatVersion: version,
    componentCount: components.length,
    components,
    licenseCounts,
    unlicensedCount,
    errors,
  };
}

function analyzeSpdx(obj: any): AnalysisResult {
  const version = obj.spdxVersion || '';
  const components: ComponentRow[] = [];
  const licenseCounts: Record<string, number> = {};
  const errors: string[] = [];

  const raw: any[] = Array.isArray(obj.packages) ? obj.packages : [];

  for (const p of raw) {
    const name = p.name || '(unnamed)';
    const ver = p.versionInfo || '';
    const type = p.primaryPackagePurpose || '';
    const licenseStr = parseLicenseSpdx(p.licenseConcluded || p.licenseDeclared);
    const isMissing = !licenseStr || licenseStr === 'NOASSERTION' || licenseStr === 'NONE';
    const hasLicense = !isMissing;
    const displayLicense = hasLicense ? licenseStr : '— no license —';

    if (hasLicense) {
      licenseCounts[licenseStr] = (licenseCounts[licenseStr] || 0) + 1;
    }

    components.push({ name, version: ver, license: displayLicense, type, hasLicense });
  }

  const unlicensedCount = components.filter(c => !c.hasLicense).length;

  if (raw.length === 0) {
    errors.push('No packages array found or it is empty.');
  }

  return {
    format: 'spdx',
    formatVersion: version,
    componentCount: components.length,
    components,
    licenseCounts,
    unlicensedCount,
    errors,
  };
}

function buildSummaryReport(result: AnalysisResult): string {
  const lines: string[] = [
    `SBOM Analysis Report`,
    `====================`,
    `Format:      ${result.format === 'cyclonedx' ? 'CycloneDX' : result.format === 'spdx' ? 'SPDX' : 'Unknown'} ${result.formatVersion}`,
    `Components:  ${result.componentCount}`,
    `Licensed:    ${result.componentCount - result.unlicensedCount}`,
    `Unlicensed:  ${result.unlicensedCount}`,
    ``,
    `License Breakdown:`,
  ];

  const sorted = Object.entries(result.licenseCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) {
    lines.push('  (none)');
  } else {
    for (const [lic, count] of sorted) {
      lines.push(`  ${count.toString().padStart(4)}x  ${lic}`);
    }
  }

  if (result.unlicensedCount > 0) {
    lines.push('');
    lines.push('Unlicensed Components (compliance risk):');
    result.components
      .filter(c => !c.hasLicense)
      .forEach(c => lines.push(`  - ${c.name}${c.version ? '@' + c.version : ''}`));
  }

  return lines.join('\n');
}

const EXAMPLE_CYCLONEDX = JSON.stringify({
  bomFormat: "CycloneDX",
  specVersion: "1.5",
  components: [
    { name: "lodash", version: "4.17.21", type: "library", licenses: [{ license: { id: "MIT" } }] },
    { name: "express", version: "4.18.2", type: "library", licenses: [{ license: { id: "MIT" } }] },
    { name: "pg", version: "8.11.3", type: "library", licenses: [{ license: { id: "MIT" } }] },
    { name: "unknown-lib", version: "1.0.0", type: "library" }
  ]
}, null, 2);

export default function SbomAnalyzer() {
  const [input, setInput] = useState('');
  const [filter, setFilter] = useState('');
  const [showUnlicensedOnly, setShowUnlicensedOnly] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [parseError, setParseError] = useState('');
  const [copied, setCopied] = useState(false);

  function analyze() {
    setParseError('');
    setResult(null);
    const trimmed = input.trim();
    if (!trimmed) {
      setParseError('Paste a CycloneDX or SPDX JSON document to analyze.');
      return;
    }

    let obj: any;
    try {
      obj = JSON.parse(trimmed);
    } catch (err: any) {
      setParseError(`JSON parse error: ${err.message}`);
      return;
    }

    const fmt = detectFormat(obj);
    if (fmt === 'cyclonedx') {
      setResult(analyzeCycloneDX(obj));
    } else if (fmt === 'spdx') {
      setResult(analyzeSpdx(obj));
    } else {
      setParseError('Could not detect SBOM format. Expected CycloneDX (bomFormat: "CycloneDX") or SPDX (spdxVersion field).');
    }
  }

  function loadExample() {
    setInput(EXAMPLE_CYCLONEDX);
    setResult(null);
    setParseError('');
    setFilter('');
    setShowUnlicensedOnly(false);
  }

  function copyReport() {
    if (!result) return;
    navigator.clipboard.writeText(buildSummaryReport(result)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const filteredComponents = result
    ? result.components.filter(c => {
        const q = filter.toLowerCase();
        const matchesFilter = !q || c.name.toLowerCase().includes(q) || c.license.toLowerCase().includes(q) || c.version.toLowerCase().includes(q);
        const matchesUnlicensed = !showUnlicensedOnly || !c.hasLicense;
        return matchesFilter && matchesUnlicensed;
      })
    : [];

  const sortedLicenses = result
    ? Object.entries(result.licenseCounts).sort((a, b) => b[1] - a[1])
    : [];

  return (
    <div class="space-y-4">
      {/* Input area */}
      <div class="space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <label class="text-sm font-medium">Paste SBOM JSON (CycloneDX or SPDX)</label>
          <button
            onClick={loadExample}
            class="text-xs px-2.5 py-1 border border-border rounded-lg hover:bg-surface transition-colors text-text-muted"
          >
            Load example
          </button>
        </div>
        <textarea
          class="w-full h-40 font-mono text-xs bg-surface border border-border rounded-lg p-3 focus:outline-none focus:ring-1 focus:ring-accent resize-y"
          placeholder='{ "bomFormat": "CycloneDX", "specVersion": "1.5", "components": [...] }'
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
        />
        {parseError && (
          <p class="text-red-400 text-sm font-mono bg-surface border border-red-400/30 rounded-lg px-3 py-2">{parseError}</p>
        )}
        <button
          onClick={analyze}
          class="bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 px-5 rounded-lg transition-colors"
        >
          Analyze SBOM
        </button>
      </div>

      {/* Results */}
      {result && (
        <div class="space-y-4">
          {/* Summary cards */}
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class="text-2xl font-bold">{result.componentCount}</div>
              <div class="text-xs text-text-muted mt-0.5">Total Components</div>
            </div>
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class="text-2xl font-bold text-green-500">{result.componentCount - result.unlicensedCount}</div>
              <div class="text-xs text-text-muted mt-0.5">Licensed</div>
            </div>
            <div class={`border rounded-lg p-3 text-center ${result.unlicensedCount > 0 ? 'bg-red-500/10 border-red-400/40' : 'bg-surface border-border'}`}>
              <div class={`text-2xl font-bold ${result.unlicensedCount > 0 ? 'text-red-400' : ''}`}>{result.unlicensedCount}</div>
              <div class="text-xs text-text-muted mt-0.5">Unlicensed</div>
            </div>
            <div class="bg-surface border border-border rounded-lg p-3 text-center">
              <div class="text-lg font-bold font-mono">{result.format === 'cyclonedx' ? 'CycloneDX' : 'SPDX'}</div>
              <div class="text-xs text-text-muted mt-0.5">{result.formatVersion}</div>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div class="bg-yellow-500/10 border border-yellow-400/40 rounded-lg px-3 py-2 text-xs text-yellow-300">
              {result.errors.map((e, i) => <p key={i}>{e}</p>)}
            </div>
          )}

          {/* License breakdown */}
          {sortedLicenses.length > 0 && (
            <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
              <div class="text-sm font-medium">License Breakdown ({sortedLicenses.length} distinct)</div>
              <div class="flex flex-wrap gap-2">
                {sortedLicenses.map(([lic, count]) => (
                  <span key={lic} class="inline-flex items-center gap-1.5 bg-surface-alt border border-border rounded-full px-2.5 py-0.5 text-xs font-mono">
                    <span class="font-medium">{lic}</span>
                    <span class="text-text-muted">×{count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Component list */}
          <div class="space-y-2">
            <div class="flex items-center gap-2 flex-wrap">
              <div class="text-sm font-medium">Components</div>
              <input
                type="text"
                class="flex-1 min-w-[160px] text-sm bg-surface-alt border border-border rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                placeholder="Filter by name, version, or license..."
                value={filter}
                onInput={e => setFilter((e.target as HTMLInputElement).value)}
              />
              <label class="flex items-center gap-1.5 text-sm cursor-pointer text-text-muted">
                <input
                  type="checkbox"
                  checked={showUnlicensedOnly}
                  onChange={e => setShowUnlicensedOnly((e.target as HTMLInputElement).checked)}
                  class="rounded"
                />
                Unlicensed only
              </label>
              <button
                onClick={copyReport}
                class="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
              >
                {copied ? '✓ Copied!' : 'Copy Report'}
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-sm border-collapse">
                <thead>
                  <tr class="border-b border-border text-left">
                    <th class="text-xs text-text-muted font-medium pb-2 pr-4">Name</th>
                    <th class="text-xs text-text-muted font-medium pb-2 pr-4">Version</th>
                    <th class="text-xs text-text-muted font-medium pb-2 pr-4">Type</th>
                    <th class="text-xs text-text-muted font-medium pb-2">License</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredComponents.length === 0 ? (
                    <tr>
                      <td colspan={4} class="text-center text-text-muted text-xs py-6">No components match the filter.</td>
                    </tr>
                  ) : (
                    filteredComponents.map((c, i) => (
                      <tr key={i} class={`border-b border-border/50 hover:bg-surface transition-colors ${!c.hasLicense ? 'bg-red-500/5' : ''}`}>
                        <td class="py-1.5 pr-4 font-mono text-xs font-medium">{c.name}</td>
                        <td class="py-1.5 pr-4 font-mono text-xs text-text-muted">{c.version || '—'}</td>
                        <td class="py-1.5 pr-4 text-xs text-text-muted">{c.type || '—'}</td>
                        <td class={`py-1.5 text-xs font-mono ${!c.hasLicense ? 'text-red-400' : 'text-text-muted'}`}>{c.license}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <p class="text-xs text-text-muted">Showing {filteredComponents.length} of {result.componentCount} components.</p>
          </div>
        </div>
      )}
    </div>
  );
}
