import { useState, useCallback } from 'preact/hooks';

const OS_OPTIONS = [
  { value: 'ubuntu-latest', label: 'Ubuntu Latest' },
  { value: 'ubuntu-22.04', label: 'Ubuntu 22.04' },
  { value: 'ubuntu-20.04', label: 'Ubuntu 20.04' },
  { value: 'windows-latest', label: 'Windows Latest' },
  { value: 'windows-2022', label: 'Windows 2022' },
  { value: 'macos-latest', label: 'macOS Latest' },
  { value: 'macos-13', label: 'macOS 13' },
];

const NODE_VERSIONS = ['18', '20', '21', '22'];
const PYTHON_VERSIONS = ['3.9', '3.10', '3.11', '3.12'];
const JAVA_VERSIONS = ['11', '17', '21'];
const GO_VERSIONS = ['1.21', '1.22', '1.23'];

type Lang = 'node' | 'python' | 'java' | 'go' | 'none';

interface MatrixConfig {
  os: string[];
  language: Lang;
  versions: string[];
  failFast: boolean;
  maxParallel: number | null;
  includeExcludes: boolean;
  jobName: string;
  stepsTemplate: string;
}

const DEFAULT_STEPS: Record<Lang | 'none', string> = {
  node: `      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm test`,
  python: `      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: \${{ matrix.python-version }}
      - run: pip install -r requirements.txt
      - run: pytest`,
  java: `      - uses: actions/checkout@v4
      - uses: actions/setup-java@v4
        with:
          java-version: \${{ matrix.java-version }}
          distribution: 'temurin'
      - run: mvn test`,
  go: `      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: \${{ matrix.go-version }}
      - run: go test ./...`,
  none: `      - uses: actions/checkout@v4
      - run: echo "Running on \${{ matrix.os }}"`,
};

const VERSION_KEY: Record<Lang, string> = {
  node: 'node-version',
  python: 'python-version',
  java: 'java-version',
  go: 'go-version',
  none: '',
};

const VERSION_OPTIONS: Record<Lang, string[]> = {
  node: NODE_VERSIONS,
  python: PYTHON_VERSIONS,
  java: JAVA_VERSIONS,
  go: GO_VERSIONS,
  none: [],
};

function buildYaml(config: MatrixConfig): string {
  const { os, language, versions, failFast, maxParallel, jobName } = config;

  const matrixEntries: string[] = [`        os: [${os.map(o => JSON.stringify(o)).join(', ')}]`];

  if (language !== 'none' && versions.length > 0) {
    const key = VERSION_KEY[language];
    matrixEntries.push(`        ${key}: [${versions.map(v => JSON.stringify(v)).join(', ')}]`);
  }

  let failFastLine = '';
  if (!failFast) failFastLine = '\n      fail-fast: false';

  let maxParallelLine = '';
  if (maxParallel !== null) maxParallelLine = `\n      max-parallel: ${maxParallel}`;

  const steps = DEFAULT_STEPS[language];
  const osRef = `\${{ matrix.os }}`;
  const versionRef = language !== 'none' && versions.length > 0
    ? ` / ${VERSION_KEY[language]} \${{ matrix.${VERSION_KEY[language]} }}`
    : '';

  const nameRef = `\${{ matrix.os }}${language !== 'none' && versions.length > 0 ? ` / \${{ matrix.${VERSION_KEY[language]} }}` : ''}`;

  return `name: CI Matrix

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  ${jobName || 'test'}:
    name: Test on ${nameRef}
    runs-on: ${osRef}
    strategy:${failFastLine}${maxParallelLine}
      matrix:
${matrixEntries.join('\n')}

    steps:
${steps}
`;
}

export default function GitHubActionsMatrixBuilder() {
  const [os, setOs] = useState<string[]>(['ubuntu-latest', 'windows-latest', 'macos-latest']);
  const [language, setLanguage] = useState<Lang>('node');
  const [versions, setVersions] = useState<string[]>(['18', '20', '22']);
  const [failFast, setFailFast] = useState(false);
  const [maxParallel, setMaxParallel] = useState<number | null>(null);
  const [jobName, setJobName] = useState('test');
  const [copied, setCopied] = useState(false);

  const toggleOs = useCallback((val: string) => {
    setOs(prev => prev.includes(val) ? prev.filter(o => o !== val) : [...prev, val]);
  }, []);

  const toggleVersion = useCallback((val: string) => {
    setVersions(prev => prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]);
  }, []);

  const handleLanguageChange = (lang: Lang) => {
    setLanguage(lang);
    setVersions(lang !== 'none' ? VERSION_OPTIONS[lang].slice(0, 3) : []);
  };

  const yaml = buildYaml({ os, language, versions, failFast, maxParallel, includeExcludes: false, jobName, stepsTemplate: '' });

  const combinations = os.length * (language !== 'none' && versions.length > 0 ? versions.length : 1);

  const copy = useCallback(async () => {
    await navigator.clipboard.writeText(yaml);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [yaml]);

  const inputClass = 'bg-surface border border-border rounded px-3 py-2 text-sm text-text w-full focus:outline-none focus:ring-1 focus:ring-primary';
  const checkboxClass = 'w-4 h-4 accent-primary cursor-pointer';
  const chipBase = 'px-3 py-1.5 text-sm rounded border cursor-pointer select-none transition-colors';
  const chipActive = 'bg-primary/20 border-primary text-primary';
  const chipInactive = 'bg-surface border-border text-text-muted hover:border-text-muted';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Config panel */}
      <div class="space-y-5">
        {/* Job name */}
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Job name</label>
          <input
            type="text"
            value={jobName}
            onInput={(e) => setJobName((e.target as HTMLInputElement).value)}
            placeholder="test"
            class={inputClass}
          />
        </div>

        {/* OS selection */}
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">
            Operating systems <span class="text-text-muted font-normal">({os.length} selected)</span>
          </label>
          <div class="flex flex-wrap gap-2">
            {OS_OPTIONS.map(o => (
              <button
                key={o.value}
                onClick={() => toggleOs(o.value)}
                class={`${chipBase} ${os.includes(o.value) ? chipActive : chipInactive}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Language / Runtime</label>
          <div class="flex flex-wrap gap-2">
            {(['node', 'python', 'java', 'go', 'none'] as Lang[]).map(lang => (
              <button
                key={lang}
                onClick={() => handleLanguageChange(lang)}
                class={`${chipBase} ${language === lang ? chipActive : chipInactive}`}
              >
                {lang === 'none' ? 'None (OS only)' : lang.charAt(0).toUpperCase() + lang.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Versions */}
        {language !== 'none' && (
          <div>
            <label class="block text-sm font-medium text-text mb-1.5">
              {VERSION_KEY[language]} versions <span class="text-text-muted font-normal">({versions.length} selected)</span>
            </label>
            <div class="flex flex-wrap gap-2">
              {VERSION_OPTIONS[language].map(v => (
                <button
                  key={v}
                  onClick={() => toggleVersion(v)}
                  class={`${chipBase} ${versions.includes(v) ? chipActive : chipInactive}`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Options */}
        <div class="space-y-3">
          <label class="block text-sm font-medium text-text">Options</label>
          <label class="flex items-center gap-2 cursor-pointer text-sm text-text">
            <input
              type="checkbox"
              checked={!failFast}
              onChange={(e) => setFailFast(!(e.target as HTMLInputElement).checked)}
              class={checkboxClass}
            />
            Disable fail-fast (run all combinations even if one fails)
          </label>
          <div class="flex items-center gap-3">
            <label class="text-sm text-text whitespace-nowrap">Max parallel jobs:</label>
            <input
              type="number"
              value={maxParallel ?? ''}
              onInput={(e) => {
                const v = (e.target as HTMLInputElement).value;
                setMaxParallel(v ? Number(v) : null);
              }}
              placeholder="unlimited"
              min="1"
              max="20"
              class={`${inputClass} w-32`}
            />
          </div>
        </div>

        {/* Stats */}
        <div class="bg-surface border border-border rounded p-3 text-sm">
          <span class="text-text-muted">Total combinations: </span>
          <span class="font-mono font-semibold text-primary">{combinations}</span>
          <span class="text-text-muted ml-3">= {os.length} OS</span>
          {language !== 'none' && versions.length > 0 && (
            <span class="text-text-muted"> × {versions.length} versions</span>
          )}
        </div>
      </div>

      {/* Output panel */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Generated YAML</label>
          <button
            onClick={copy}
            class="text-sm px-3 py-1 bg-primary text-white rounded hover:bg-primary/80 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded p-4 text-xs font-mono text-text overflow-auto max-h-[520px] whitespace-pre">{yaml}</pre>
        <p class="mt-2 text-xs text-text-muted">
          Save as <code class="font-mono bg-surface px-1 rounded">.github/workflows/ci.yml</code> in your repository.
        </p>
      </div>
    </div>
  );
}
