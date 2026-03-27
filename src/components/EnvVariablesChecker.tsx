import { useState, useCallback } from 'preact/hooks';

interface EnvLine {
  lineNum: number;
  raw: string;
  key: string | null;
  value: string | null;
  type: 'pair' | 'comment' | 'blank' | 'invalid';
}

interface Issue {
  level: 'error' | 'warning' | 'info';
  message: string;
  line?: number;
}

const SAMPLE_ENV = `# App configuration
NODE_ENV=production
PORT=3000
APP_NAME="My Awesome App"

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb
DB_POOL_SIZE=10

# Auth
JWT_SECRET=my_super_secret_key_here
JWT_EXPIRES_IN=7d

# External APIs
STRIPE_SECRET_KEY=sk_live_abc123xyz
OPENAI_API_KEY=
SENDGRID_API_KEY=

# Feature flags
FEATURE_FLAG_NEW_UI=true
DEBUG=false
`;

function parseLine(raw: string, lineNum: number): EnvLine {
  const trimmed = raw.trim();
  if (trimmed === '') return { lineNum, raw, key: null, value: null, type: 'blank' };
  if (trimmed.startsWith('#')) return { lineNum, raw, key: null, value: null, type: 'comment' };

  const eqIdx = raw.indexOf('=');
  if (eqIdx === -1) return { lineNum, raw, key: null, value: null, type: 'invalid' };

  const key = raw.slice(0, eqIdx).trim();
  const value = raw.slice(eqIdx + 1).trim();
  if (!key) return { lineNum, raw, key: null, value: null, type: 'invalid' };

  return { lineNum, raw, key, value, type: 'pair' };
}

function checkEnv(content: string): Issue[] {
  const issues: Issue[] = [];
  const lines = content.split('\n');
  const parsed = lines.map((raw, i) => parseLine(raw, i + 1));
  const pairs = parsed.filter(l => l.type === 'pair') as (EnvLine & { key: string; value: string })[];

  // Invalid lines
  for (const l of parsed) {
    if (l.type === 'invalid') {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: Not a valid KEY=VALUE format — "${l.raw.slice(0, 60)}"`, line: l.lineNum });
    }
  }

  // Duplicate keys
  const seen = new Map<string, number>();
  for (const l of pairs) {
    if (seen.has(l.key)) {
      issues.push({ level: 'warning', message: `Duplicate key "${l.key}" (first at line ${seen.get(l.key)}, again at line ${l.lineNum})`, line: l.lineNum });
    } else {
      seen.set(l.key, l.lineNum);
    }
  }

  // Key naming convention (should be UPPER_SNAKE_CASE)
  for (const l of pairs) {
    if (/[a-z]/.test(l.key)) {
      issues.push({ level: 'warning', message: `Line ${l.lineNum}: Key "${l.key}" uses lowercase. Convention is UPPER_SNAKE_CASE.`, line: l.lineNum });
    }
    if (/[^A-Za-z0-9_]/.test(l.key)) {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: Key "${l.key}" contains invalid characters. Only A-Z, 0-9, _ are allowed.`, line: l.lineNum });
    }
    if (/^\d/.test(l.key)) {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: Key "${l.key}" starts with a digit, which is not valid.`, line: l.lineNum });
    }
  }

  // Empty values (may be intentional, but worth flagging)
  for (const l of pairs) {
    if (l.value === '') {
      issues.push({ level: 'info', message: `Line ${l.lineNum}: "${l.key}" has an empty value. If intentional, consider adding a comment explaining why.`, line: l.lineNum });
    }
  }

  // Values with spaces but no quotes
  for (const l of pairs) {
    if (l.value && !l.value.startsWith('"') && !l.value.startsWith("'") && l.value.includes(' ') && !l.value.startsWith('#')) {
      issues.push({ level: 'warning', message: `Line ${l.lineNum}: "${l.key}" value contains spaces but is not quoted. Wrap in double quotes to be safe.`, line: l.lineNum });
    }
  }

  // Potential secrets with weak values
  const secretKeywords = /SECRET|PASSWORD|PASSWD|PWD|TOKEN|KEY|PRIVATE|CREDENTIAL|AUTH/i;
  const weakValues = /^(password|secret|test|example|changeme|placeholder|xxx|abc123|123456|todo|fixme|your_|<.*>|\$\{.*)$/i;
  for (const l of pairs) {
    if (secretKeywords.test(l.key) && l.value && weakValues.test(l.value)) {
      issues.push({ level: 'warning', message: `Line ${l.lineNum}: "${l.key}" looks like a secret but has a weak/placeholder value. Replace with a real secret before deploying.`, line: l.lineNum });
    }
  }

  // Mixed quote styles
  for (const l of pairs) {
    const v = l.value;
    if (v && v.startsWith('"') && !v.endsWith('"')) {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: "${l.key}" value starts with " but doesn't close it. Check for mismatched quotes.`, line: l.lineNum });
    }
    if (v && v.startsWith("'") && !v.endsWith("'")) {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: "${l.key}" value starts with ' but doesn't close it. Check for mismatched quotes.`, line: l.lineNum });
    }
  }

  // Tab characters
  for (const l of parsed) {
    if (l.raw.includes('\t')) {
      issues.push({ level: 'error', message: `Line ${l.lineNum}: Contains tab character(s). Use spaces instead.`, line: l.lineNum });
    }
  }

  // Trailing whitespace in values (unquoted)
  for (const l of pairs) {
    const raw = l.raw;
    const eqIdx = raw.indexOf('=');
    const rawValue = raw.slice(eqIdx + 1);
    if (rawValue !== rawValue.trimEnd() && !rawValue.trim().startsWith('"') && !rawValue.trim().startsWith("'")) {
      issues.push({ level: 'warning', message: `Line ${l.lineNum}: "${l.key}" value has trailing whitespace, which may cause subtle bugs.`, line: l.lineNum });
    }
  }

  return issues;
}

function generateExample(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];

  for (const raw of lines) {
    const l = parseLine(raw, 0);
    if (l.type === 'comment' || l.type === 'blank') {
      result.push(raw);
    } else if (l.type === 'pair' && l.key) {
      const secretKeywords = /SECRET|PASSWORD|PASSWD|PWD|TOKEN|KEY|PRIVATE|CREDENTIAL|AUTH/i;
      if (secretKeywords.test(l.key)) {
        result.push(`${l.key}=`);
      } else {
        result.push(`${l.key}=${l.value ?? ''}`);
      }
    }
  }

  return result.join('\n');
}

const LEVEL_STYLES = {
  error:   { bg: 'bg-red-500/10 border-red-500/30',    text: 'text-red-400',    icon: '✕' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', text: 'text-yellow-400', icon: '⚠' },
  info:    { bg: 'bg-blue-500/10 border-blue-500/30',   text: 'text-blue-400',   icon: 'ℹ' },
};

export default function EnvVariablesChecker() {
  const [input, setInput] = useState('');
  const [issues, setIssues] = useState<Issue[]>([]);
  const [checked, setChecked] = useState(false);
  const [example, setExample] = useState('');
  const [copiedExample, setCopiedExample] = useState(false);
  const [activeTab, setActiveTab] = useState<'issues' | 'example'>('issues');

  const handleInput = useCallback((val: string) => {
    setInput(val);
    if (checked) {
      const newIssues = checkEnv(val);
      setIssues(newIssues);
      setExample(generateExample(val));
    }
  }, [checked]);

  const handleCheck = () => {
    const newIssues = checkEnv(input);
    const ex = generateExample(input);
    setIssues(newIssues);
    setExample(ex);
    setChecked(true);
    setActiveTab('issues');
  };

  const handleLoad = () => {
    setInput(SAMPLE_ENV);
    const newIssues = checkEnv(SAMPLE_ENV);
    setIssues(newIssues);
    setExample(generateExample(SAMPLE_ENV));
    setChecked(true);
  };

  const handleClear = () => {
    setInput('');
    setIssues([]);
    setExample('');
    setChecked(false);
  };

  const copyExample = async () => {
    await navigator.clipboard.writeText(example);
    setCopiedExample(true);
    setTimeout(() => setCopiedExample(false), 1500);
  };

  const errors   = issues.filter(i => i.level === 'error');
  const warnings = issues.filter(i => i.level === 'warning');
  const infos    = issues.filter(i => i.level === 'info');

  const pairs = input.split('\n').filter(l => {
    const t = l.trim();
    return t && !t.startsWith('#') && l.includes('=');
  });

  return (
    <div class="space-y-4">
      {/* Input */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">.env file content</label>
          <div class="flex gap-2">
            <button onClick={handleLoad} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={handleClear} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => handleInput((e.target as HTMLTextAreaElement).value)}
          rows={16}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your .env file content here..."
          spellcheck={false}
        />
      </div>

      <button
        onClick={handleCheck}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Check .env
      </button>

      {/* Results */}
      {checked && (
        <div class="space-y-3">
          {/* Summary */}
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">{pairs.length} variable{pairs.length !== 1 ? 's' : ''} found</span>
            {errors.length > 0   && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {infos.length > 0    && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">{infos.length} note{infos.length > 1 ? 's' : ''}</span>}
            {issues.length === 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">All good!</span>}
          </div>

          {/* Tabs */}
          <div class="flex border-b border-border">
            <button
              onClick={() => setActiveTab('issues')}
              class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'issues' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              Issues {issues.length > 0 ? `(${issues.length})` : ''}
            </button>
            <button
              onClick={() => setActiveTab('example')}
              class={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'example' ? 'border-accent text-accent' : 'border-transparent text-text-muted hover:text-text'}`}
            >
              .env.example
            </button>
          </div>

          {activeTab === 'issues' && (
            <div class="space-y-2">
              {issues.length === 0 ? (
                <div class="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-400 text-center">
                  ✓ No issues found — your .env file looks good!
                </div>
              ) : (
                issues.map((issue, i) => {
                  const style = LEVEL_STYLES[issue.level];
                  return (
                    <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                      <span class={`font-bold text-base leading-none mt-0.5 shrink-0 ${style.text}`}>{style.icon}</span>
                      <div class="flex-1 min-w-0">
                        <div class="flex items-center gap-2 mb-0.5">
                          <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{issue.level}</span>
                          {issue.line && <span class="text-xs text-text-muted">line {issue.line}</span>}
                        </div>
                        <p class="text-sm text-text">{issue.message}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'example' && (
            <div>
              <div class="flex items-center justify-between mb-2">
                <p class="text-xs text-text-muted">Secrets are redacted (empty values). Safe to commit as <code class="font-mono bg-surface px-1 rounded">.env.example</code>.</p>
                <button
                  onClick={copyExample}
                  class={`text-xs px-2 py-1 border rounded transition-colors ${copiedExample ? 'border-green-500 text-green-400 bg-green-500/10' : 'border-border hover:border-accent'}`}
                >
                  {copiedExample ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{example}</pre>
            </div>
          )}
        </div>
      )}

      {/* Checks performed */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>Valid KEY=VALUE format on every non-comment line</li>
          <li>Duplicate key detection</li>
          <li>Key naming convention (UPPER_SNAKE_CASE)</li>
          <li>Empty values</li>
          <li>Unquoted values containing spaces</li>
          <li>Weak/placeholder secret values</li>
          <li>Mismatched quote characters</li>
          <li>Tab characters (use spaces)</li>
          <li>Trailing whitespace in values</li>
        </ul>
        <p class="mt-2 text-text-muted/70">All checks run in your browser — no content is sent to any server.</p>
      </div>
    </div>
  );
}
