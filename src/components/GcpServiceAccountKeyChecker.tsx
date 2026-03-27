import { useState } from 'preact/hooks';

type CheckResult = {
  level: 'error' | 'warning' | 'info' | 'pass';
  message: string;
};

// NOTE: SAMPLE_KEY uses placeholder values only — no real credentials
const SAMPLE_KEY = `{
  "type": "service_account",
  "project_id": "my-project-123456",
  "private_key_id": "EXAMPLE_KEY_ID_00000000000000000000",
  "private_key": "<PASTE_YOUR_PRIVATE_KEY_PEM_HERE>",
  "client_email": "my-service-account@my-project-123456.iam.gserviceaccount.com",
  "client_id": "000000000000000000000",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/my-service-account%40my-project-123456.iam.gserviceaccount.com",
  "universe_domain": "googleapis.com"
}`;

const REQUIRED_FIELDS = ['type', 'project_id', 'private_key_id', 'private_key', 'client_email', 'client_id', 'auth_uri', 'token_uri'];

function checkGcpKey(jsonStr: string): CheckResult[] {
  const results: CheckResult[] = [];

  if (!jsonStr.trim()) {
    return [{ level: 'error', message: 'Empty input. Paste a GCP service account key JSON to check.' }];
  }

  // Parse JSON
  let key: any;
  try {
    key = JSON.parse(jsonStr);
  } catch (e: any) {
    return [{ level: 'error', message: `Invalid JSON: ${e.message}. GCP key files are JSON — fix the syntax first.` }];
  }

  // type field
  if (!key.type) {
    results.push({ level: 'error', message: 'Missing "type" field. Valid GCP key types: "service_account", "authorized_user".' });
  } else if (key.type === 'service_account') {
    results.push({ level: 'pass', message: 'type: service_account — recognized GCP key type.' });
  } else if (key.type === 'authorized_user') {
    results.push({ level: 'warning', message: 'type: authorized_user — this is an OAuth token for a user account, not a service account. Use service_account keys for application authentication.' });
  } else {
    results.push({ level: 'error', message: `Unknown type "${key.type}". Expected "service_account" or "authorized_user".` });
  }

  // Required fields
  REQUIRED_FIELDS.slice(1).forEach(field => {
    if (!key[field]) {
      results.push({ level: 'error', message: `Missing required field "${field}". This field is required for GCP authentication.` });
    }
  });

  // project_id format
  if (key.project_id) {
    if (key.project_id.length > 30) {
      results.push({ level: 'warning', message: `project_id "${key.project_id}" is unusually long. GCP project IDs are typically 6-30 characters.` });
    } else {
      results.push({ level: 'pass', message: `project_id: ${key.project_id}` });
    }
  }

  // client_email format
  if (key.client_email) {
    if (!key.client_email.endsWith('.iam.gserviceaccount.com')) {
      results.push({ level: 'error', message: `client_email "${key.client_email}" does not end with ".iam.gserviceaccount.com". This may not be a valid service account email.` });
    } else {
      results.push({ level: 'pass', message: `client_email format valid: ${key.client_email}` });
      // Check if it contains project_id
      if (key.project_id && !key.client_email.includes(key.project_id)) {
        results.push({ level: 'warning', message: 'client_email project does not match project_id. Verify this key belongs to the correct project.' });
      }
    }
  }

  // private_key format
  if (key.private_key) {
    const pk = key.private_key;
    if (!pk.includes('BEGIN') || !pk.includes('PRIVATE KEY')) {
      results.push({ level: 'error', message: 'private_key does not look like a valid PEM key. It should start with "-----BEGIN RSA PRIVATE KEY-----" or "-----BEGIN PRIVATE KEY-----".' });
    } else {
      results.push({ level: 'pass', message: 'private_key PEM format looks valid.' });
    }
  }

  // private_key_id length
  if (key.private_key_id) {
    if (key.private_key_id.length < 20) {
      results.push({ level: 'warning', message: `private_key_id "${key.private_key_id}" is shorter than expected (typically 40 hex characters).` });
    } else {
      results.push({ level: 'pass', message: 'private_key_id length looks valid.' });
    }
  }

  // auth_uri and token_uri
  if (key.auth_uri && !key.auth_uri.includes('accounts.google.com')) {
    results.push({ level: 'warning', message: `auth_uri "${key.auth_uri}" does not point to accounts.google.com. Verify this is correct for your environment.` });
  }
  if (key.token_uri && !key.token_uri.includes('oauth2.googleapis.com') && !key.token_uri.includes('googleapis.com')) {
    results.push({ level: 'warning', message: `token_uri "${key.token_uri}" does not point to googleapis.com. Verify this is correct.` });
  }

  // universe_domain
  if (key.universe_domain && key.universe_domain !== 'googleapis.com') {
    results.push({ level: 'info', message: `universe_domain: "${key.universe_domain}" — non-standard domain. Only use if targeting a specific Google Cloud universe (e.g. government clouds).` });
  }

  // Security reminders
  results.push({ level: 'warning', message: 'Security reminder: Never commit service account key files to version control. Use Workload Identity Federation or Secret Manager for production environments.' });
  results.push({ level: 'info', message: 'Best practice: Rotate service account keys every 90 days. Prefer Workload Identity Federation over key files when running on GCP infrastructure.' });

  return results;
}

const LEVEL_STYLES = {
  error: { bg: 'bg-red-500/10 border-red-500/30', icon: '✗', text: 'text-red-400', label: 'ERROR' },
  warning: { bg: 'bg-yellow-500/10 border-yellow-500/30', icon: '⚠', text: 'text-yellow-400', label: 'WARNING' },
  info: { bg: 'bg-blue-500/10 border-blue-500/30', icon: 'ℹ', text: 'text-blue-400', label: 'INFO' },
  pass: { bg: 'bg-green-500/10 border-green-500/30', icon: '✓', text: 'text-green-400', label: 'PASS' },
};

export default function GcpServiceAccountKeyChecker() {
  const [input, setInput] = useState(SAMPLE_KEY);
  const [results, setResults] = useState<CheckResult[]>(() => checkGcpKey(SAMPLE_KEY));
  const [checked, setChecked] = useState(true);

  const handleCheck = () => {
    setResults(checkGcpKey(input));
    setChecked(true);
  };

  const errors = results.filter(r => r.level === 'error');
  const warnings = results.filter(r => r.level === 'warning');
  const passes = results.filter(r => r.level === 'pass');

  return (
    <div class="space-y-4">
      <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 text-sm text-yellow-400">
        <strong>Privacy note:</strong> All validation runs 100% in your browser. Your key file is never sent to any server.
      </div>

      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">GCP Service Account Key JSON</label>
          <div class="flex gap-2">
            <button onClick={() => { setInput(SAMPLE_KEY); setResults(checkGcpKey(SAMPLE_KEY)); setChecked(true); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Load example</button>
            <button onClick={() => { setInput(''); setResults([]); setChecked(false); }} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">Clear</button>
          </div>
        </div>
        <textarea
          value={input}
          onInput={e => { setInput((e.target as HTMLTextAreaElement).value); setChecked(false); }}
          rows={18}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
          placeholder="Paste your GCP service account key JSON here..."
          spellcheck={false}
        />
      </div>

      <button onClick={handleCheck} class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors">
        Check Key
      </button>

      {checked && results.length > 0 && (
        <div class="space-y-3">
          <div class="flex items-center gap-3 text-sm flex-wrap">
            <span class="font-medium text-text">Results:</span>
            {errors.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400">{errors.length} error{errors.length > 1 ? 's' : ''}</span>}
            {warnings.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">{warnings.length} warning{warnings.length > 1 ? 's' : ''}</span>}
            {passes.length > 0 && <span class="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400">{passes.length} passed</span>}
          </div>
          <div class="space-y-2">
            {results.map((r, i) => {
              const style = LEVEL_STYLES[r.level];
              return (
                <div key={i} class={`flex gap-3 p-3 border rounded-lg ${style.bg}`}>
                  <span class={`font-bold text-lg leading-none mt-0.5 ${style.text}`}>{style.icon}</span>
                  <div class="flex-1 min-w-0">
                    <span class={`text-xs font-medium uppercase tracking-wide ${style.text}`}>{style.label}</span>
                    <p class="text-sm text-text mt-0.5">{r.message}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Checks performed</p>
        <ul class="space-y-1 list-disc list-inside">
          <li>JSON syntax validation</li>
          <li>type: service_account vs authorized_user</li>
          <li>All required fields presence</li>
          <li>client_email format (.iam.gserviceaccount.com)</li>
          <li>client_email / project_id consistency</li>
          <li>private_key PEM format validation</li>
          <li>private_key_id length check</li>
          <li>auth_uri / token_uri domain validation</li>
          <li>Security and rotation best-practice reminders</li>
        </ul>
      </div>
    </div>
  );
}
