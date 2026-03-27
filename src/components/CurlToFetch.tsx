import { useState, useMemo } from 'preact/hooks';

type OutputFormat = 'fetch' | 'fetch-ts' | 'axios' | 'node-fetch';

interface ParsedCurl {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string | null;
  bodyType: 'json' | 'form' | 'text' | null;
  auth: { type: 'bearer' | 'basic' | null; value: string };
  cookies: string;
}

function parseCurl(input: string): ParsedCurl | null {
  const raw = input.trim();
  if (!raw.startsWith('curl')) return null;

  // Normalize line continuations
  const normalized = raw.replace(/\\\n/g, ' ').replace(/\s+/g, ' ');

  const result: ParsedCurl = {
    method: 'GET',
    url: '',
    headers: {},
    body: null,
    bodyType: null,
    auth: { type: null, value: '' },
    cookies: '',
  };

  // Tokenize respecting quotes
  const tokens: string[] = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < normalized.length; i++) {
    const ch = normalized[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (ch === ' ' && !inSingle && !inDouble) {
      if (current) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  let i = 0;
  while (i < tokens.length) {
    const t = tokens[i];

    if (t === 'curl') { i++; continue; }

    // URL — anything that looks like a URL not starting with -
    if (!t.startsWith('-') && (t.startsWith('http') || t.startsWith('https') || result.url === '')) {
      if (!t.startsWith('-')) { result.url = result.url || t; i++; continue; }
    }

    if (t === '-X' || t === '--request') {
      result.method = tokens[++i]?.toUpperCase() || 'GET';
      i++; continue;
    }

    if (t === '-H' || t === '--header') {
      const hdr = tokens[++i] || '';
      const colon = hdr.indexOf(':');
      if (colon > 0) {
        const key = hdr.slice(0, colon).trim().toLowerCase();
        const val = hdr.slice(colon + 1).trim();
        result.headers[key] = val;
      }
      i++; continue;
    }

    if (t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') {
      result.body = tokens[++i] || '';
      result.method = result.method === 'GET' ? 'POST' : result.method;
      i++; continue;
    }

    if (t === '--data-urlencode') {
      const val = tokens[++i] || '';
      result.body = result.body ? result.body + '&' + val : val;
      result.bodyType = 'form';
      result.method = result.method === 'GET' ? 'POST' : result.method;
      i++; continue;
    }

    if (t === '-u' || t === '--user') {
      const creds = tokens[++i] || '';
      const [user, pass] = creds.split(':');
      result.auth = { type: 'basic', value: btoa(`${user}:${pass || ''}`) };
      i++; continue;
    }

    if (t === '-b' || t === '--cookie') {
      result.cookies = tokens[++i] || '';
      i++; continue;
    }

    // Skip flags we don't translate
    if (t === '-L' || t === '--location' || t === '-v' || t === '--verbose' ||
        t === '-s' || t === '--silent' || t === '-k' || t === '--insecure' ||
        t === '-i' || t === '--include') {
      i++; continue;
    }

    if (t.startsWith('--max-time') || t === '--connect-timeout') { i += 2; continue; }

    // Fallback: if it doesn't start with - it might be the URL
    if (!t.startsWith('-') && !result.url) { result.url = t; }

    i++;
  }

  // Detect content type
  const ct = result.headers['content-type'] || '';
  if (ct.includes('application/json') || (result.body && result.body.trim().startsWith('{'))) {
    result.bodyType = 'json';
  } else if (ct.includes('application/x-www-form-urlencoded')) {
    result.bodyType = 'form';
  } else if (result.body) {
    result.bodyType = 'text';
  }

  // Detect bearer auth from headers
  const authHeader = result.headers['authorization'] || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    result.auth = { type: 'bearer', value: authHeader.slice(7) };
  }

  return result;
}

function toFetch(p: ParsedCurl, ts: boolean): string {
  const opts: string[] = [];

  if (p.method !== 'GET') opts.push(`  method: '${p.method}'`);

  // Build headers object
  const headerEntries = Object.entries(p.headers);
  if (p.cookies) headerEntries.push(['cookie', p.cookies]);
  if (p.auth.type === 'basic') headerEntries.push(['authorization', `Basic ${p.auth.value}`]);

  if (headerEntries.length) {
    const lines = headerEntries.map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`).join(',\n');
    opts.push(`  headers: {\n${lines}\n  }`);
  }

  if (p.body) {
    if (p.bodyType === 'json') {
      try {
        const parsed = JSON.parse(p.body);
        opts.push(`  body: JSON.stringify(${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')})`);
      } catch {
        opts.push(`  body: '${p.body.replace(/'/g, "\\'")}'`);
      }
    } else {
      opts.push(`  body: '${p.body.replace(/'/g, "\\'")}'`);
    }
  }

  const resType = ts ? ': Response' : '';
  const optStr = opts.length ? `, {\n${opts.join(',\n')}\n}` : '';
  return `const response${resType} = await fetch('${p.url}'${optStr});\nconst data = await response.json();`;
}

function toAxios(p: ParsedCurl): string {
  const config: string[] = [];

  if (p.method !== 'GET') config.push(`  method: '${p.method.toLowerCase()}'`);
  config.push(`  url: '${p.url}'`);

  const headerEntries = Object.entries(p.headers);
  if (p.cookies) headerEntries.push(['cookie', p.cookies]);
  if (p.auth.type === 'basic') headerEntries.push(['authorization', `Basic ${p.auth.value}`]);

  if (headerEntries.length) {
    const lines = headerEntries.map(([k, v]) => `    '${k}': '${v.replace(/'/g, "\\'")}'`).join(',\n');
    config.push(`  headers: {\n${lines}\n  }`);
  }

  if (p.body) {
    if (p.bodyType === 'json') {
      try {
        const parsed = JSON.parse(p.body);
        config.push(`  data: ${JSON.stringify(parsed, null, 4).replace(/\n/g, '\n  ')}`);
      } catch {
        config.push(`  data: '${p.body.replace(/'/g, "\\'")}'`);
      }
    } else {
      config.push(`  data: '${p.body.replace(/'/g, "\\'")}'`);
    }
  }

  return `const response = await axios({\n${config.join(',\n')}\n});\nconst data = response.data;`;
}

function toNodeFetch(p: ParsedCurl): string {
  return `import fetch from 'node-fetch';\n\n` + toFetch(p, false);
}

const EXAMPLES = [
  { label: 'GET with Auth', curl: `curl -H "Authorization: Bearer mytoken123" https://api.example.com/users/1` },
  { label: 'POST JSON', curl: `curl -X POST https://api.example.com/posts -H "Content-Type: application/json" -d '{"title":"Hello","body":"World","userId":1}'` },
  { label: 'Basic Auth', curl: `curl -u admin:password123 https://api.example.com/admin/stats` },
  { label: 'Form Data', curl: `curl -X POST https://example.com/login -H "Content-Type: application/x-www-form-urlencoded" -d "username=user&password=secret"` },
];

export default function CurlToFetch() {
  const [input, setInput] = useState('');
  const [format, setFormat] = useState<OutputFormat>('fetch');
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => input.trim() ? parseCurl(input) : null, [input]);

  const output = useMemo(() => {
    if (!parsed) return '';
    switch (format) {
      case 'fetch': return toFetch(parsed, false);
      case 'fetch-ts': return toFetch(parsed, true);
      case 'axios': return toAxios(parsed);
      case 'node-fetch': return toNodeFetch(parsed);
      default: return '';
    }
  }, [parsed, format]);

  function copy() {
    navigator.clipboard?.writeText(output).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const formatOptions: { value: OutputFormat; label: string }[] = [
    { value: 'fetch', label: 'fetch() — Browser' },
    { value: 'fetch-ts', label: 'fetch() — TypeScript' },
    { value: 'axios', label: 'axios' },
    { value: 'node-fetch', label: 'node-fetch' },
  ];

  return (
    <div class="space-y-5">
      {/* Format selector */}
      <div class="flex flex-wrap gap-2">
        {formatOptions.map(opt => (
          <button
            key={opt.value}
            onClick={() => setFormat(opt.value)}
            class={`px-3 py-1.5 rounded border text-sm transition-colors ${
              format === opt.value
                ? 'bg-primary text-white border-primary'
                : 'border-border hover:bg-surface'
            }`}
          >{opt.label}</button>
        ))}
      </div>

      {/* Examples */}
      <div class="flex flex-wrap gap-2">
        <span class="text-sm text-text-muted self-center">Examples:</span>
        {EXAMPLES.map((ex, i) => (
          <button key={i} onClick={() => setInput(ex.curl)}
            class="px-3 py-1 rounded border border-border text-xs hover:bg-surface transition-colors"
          >{ex.label}</button>
        ))}
      </div>

      {/* Input */}
      <div>
        <label class="block text-sm font-medium mb-2">Paste your cURL command</label>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={5}
          placeholder={'curl -X POST https://api.example.com/data \\\n  -H "Authorization: Bearer token" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"key": "value"}\''}
          class="w-full border border-border rounded px-3 py-2 bg-background text-sm font-mono resize-y"
        />
      </div>

      {/* Parsed summary */}
      {parsed && (
        <div class="flex flex-wrap gap-2 text-xs">
          <span class="px-2 py-1 bg-blue-500/10 text-blue-500 rounded font-mono">{parsed.method}</span>
          <span class="px-2 py-1 bg-surface border border-border rounded font-mono truncate max-w-xs">{parsed.url || '(no URL)'}</span>
          {Object.keys(parsed.headers).length > 0 && (
            <span class="px-2 py-1 bg-surface border border-border rounded">{Object.keys(parsed.headers).length} header{Object.keys(parsed.headers).length !== 1 ? 's' : ''}</span>
          )}
          {parsed.body && (
            <span class="px-2 py-1 bg-surface border border-border rounded">{parsed.bodyType} body</span>
          )}
          {parsed.auth.type && (
            <span class="px-2 py-1 bg-surface border border-border rounded">{parsed.auth.type} auth</span>
          )}
        </div>
      )}

      {/* Output */}
      <div>
        <div class="flex justify-between items-center mb-2">
          <h3 class="font-semibold text-sm">
            {format === 'fetch' && 'fetch() Output'}
            {format === 'fetch-ts' && 'fetch() TypeScript Output'}
            {format === 'axios' && 'axios Output'}
            {format === 'node-fetch' && 'node-fetch Output'}
          </h3>
          {output && (
            <button onClick={copy}
              class="px-3 py-1 text-xs border border-border rounded hover:bg-surface transition-colors"
            >{copied ? '✓ Copied!' : 'Copy'}</button>
          )}
        </div>
        {output ? (
          <pre class="bg-surface border border-border rounded p-4 text-xs font-mono overflow-auto max-h-64 text-text-muted">{output}</pre>
        ) : (
          <div class="bg-surface border border-border rounded p-4 text-sm text-text-muted">
            {input ? '⚠️ Could not parse cURL command. Make sure it starts with "curl".' : 'Paste a cURL command above to see the converted output.'}
          </div>
        )}
      </div>

      {/* Supported flags table */}
      <details class="border border-border rounded">
        <summary class="px-3 py-2 cursor-pointer text-sm font-medium select-none">Supported cURL Flags</summary>
        <div class="px-3 pb-3 pt-1">
          <table class="w-full text-xs text-text-muted">
            <thead><tr class="border-b border-border"><th class="text-left py-1">Flag</th><th class="text-left py-1">Translated to</th></tr></thead>
            <tbody>
              {[
                ['-X / --request', 'method'],
                ['-H / --header', 'headers object'],
                ['-d / --data / --data-raw', 'body (auto-detects JSON)'],
                ['--data-urlencode', 'form-encoded body'],
                ['-u / --user user:pass', 'Authorization: Basic header'],
                ['-b / --cookie', 'cookie header'],
                ['-L / -v / -s / -k / -i', 'ignored (no equivalent needed)'],
              ].map(([flag, out]) => (
                <tr key={flag} class="border-b border-border last:border-0">
                  <td class="py-1 font-mono text-primary">{flag}</td>
                  <td class="py-1">{out}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
