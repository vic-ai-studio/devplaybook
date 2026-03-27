import { useState } from 'preact/hooks';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type OutputTab = 'curl' | 'fetch' | 'axios';

interface Header {
  id: number;
  key: string;
  value: string;
}

const METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const BODY_METHODS: HttpMethod[] = ['POST', 'PUT', 'PATCH'];

const METHOD_COLORS: Record<HttpMethod, string> = {
  GET:     'text-green-400',
  POST:    'text-blue-400',
  PUT:     'text-yellow-400',
  PATCH:   'text-orange-400',
  DELETE:  'text-red-400',
  HEAD:    'text-purple-400',
  OPTIONS: 'text-cyan-400',
};

let headerIdCounter = 3;

function generateCurl(method: HttpMethod, url: string, headers: Header[], body: string): string {
  if (!url.trim()) return '# Enter a URL above to generate a snippet.';
  const lines: string[] = [`curl -X ${method} \\`];
  const activeHeaders = headers.filter((h) => h.key.trim());
  for (const h of activeHeaders) {
    lines.push(`  -H '${h.key.trim()}: ${h.value.trim()}' \\`);
  }
  if (BODY_METHODS.includes(method) && body.trim()) {
    const escaped = body.trim().replace(/'/g, "'\\''");
    lines.push(`  -d '${escaped}' \\`);
  }
  lines.push(`  '${url.trim()}'`);
  // remove trailing backslash from last line
  return lines.join('\n');
}

function generateFetch(method: HttpMethod, url: string, headers: Header[], body: string): string {
  if (!url.trim()) return '// Enter a URL above to generate a snippet.';
  const activeHeaders = headers.filter((h) => h.key.trim());
  const hasBody = BODY_METHODS.includes(method) && body.trim();
  const lines: string[] = [];

  lines.push(`const response = await fetch('${url.trim()}', {`);
  lines.push(`  method: '${method}',`);

  if (activeHeaders.length > 0) {
    lines.push('  headers: {');
    for (const h of activeHeaders) {
      lines.push(`    '${h.key.trim()}': '${h.value.trim()}',`);
    }
    lines.push('  },');
  }

  if (hasBody) {
    lines.push(`  body: \`${body.trim()}\`,`);
  }

  lines.push('});');
  lines.push('');
  lines.push('const data = await response.json();');
  lines.push('console.log(data);');

  return lines.join('\n');
}

function generateAxios(method: HttpMethod, url: string, headers: Header[], body: string): string {
  if (!url.trim()) return '// Enter a URL above to generate a snippet.';
  const activeHeaders = headers.filter((h) => h.key.trim());
  const hasBody = BODY_METHODS.includes(method) && body.trim();
  const methodLower = method.toLowerCase();
  const lines: string[] = [];

  lines.push("import axios from 'axios';");
  lines.push('');
  lines.push('const { data } = await axios({');
  lines.push(`  method: '${methodLower}',`);
  lines.push(`  url: '${url.trim()}',`);

  if (activeHeaders.length > 0) {
    lines.push('  headers: {');
    for (const h of activeHeaders) {
      lines.push(`    '${h.key.trim()}': '${h.value.trim()}',`);
    }
    lines.push('  },');
  }

  if (hasBody) {
    lines.push(`  data: \`${body.trim()}\`,`);
  }

  lines.push('});');
  lines.push('');
  lines.push('console.log(data);');

  return lines.join('\n');
}

export default function RestApiBuilder() {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState('');
  const [headers, setHeaders] = useState<Header[]>([
    { id: 1, key: 'Content-Type', value: 'application/json' },
    { id: 2, key: 'Accept', value: 'application/json' },
  ]);
  const [body, setBody] = useState('{\n  "key": "value"\n}');
  const [activeTab, setActiveTab] = useState<OutputTab>('curl');
  const [copiedTab, setCopiedTab] = useState<OutputTab | null>(null);

  const showBody = BODY_METHODS.includes(method);

  const addHeader = () => {
    headerIdCounter++;
    setHeaders((prev) => [...prev, { id: headerIdCounter, key: '', value: '' }]);
  };

  const removeHeader = (id: number) => {
    setHeaders((prev) => prev.filter((h) => h.id !== id));
  };

  const updateHeader = (id: number, field: 'key' | 'value', val: string) => {
    setHeaders((prev) => prev.map((h) => (h.id === id ? { ...h, [field]: val } : h)));
  };

  const getSnippet = (tab: OutputTab) => {
    if (tab === 'curl')  return generateCurl(method, url, headers, body);
    if (tab === 'fetch') return generateFetch(method, url, headers, body);
    return generateAxios(method, url, headers, body);
  };

  const handleCopy = (tab: OutputTab) => {
    const snippet = getSnippet(tab);
    navigator.clipboard.writeText(snippet).then(() => {
      setCopiedTab(tab);
      setTimeout(() => setCopiedTab(null), 1500);
    });
  };

  const tabs: OutputTab[] = ['curl', 'fetch', 'axios'];

  return (
    <div class="space-y-5">

      {/* ── Method + URL ── */}
      <div class="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <p class="text-sm font-medium text-text-muted">Request</p>

        <div class="flex gap-2 flex-wrap sm:flex-nowrap">
          {/* Method selector */}
          <div class="relative">
            <select
              value={method}
              onChange={(e) => setMethod((e.target as HTMLSelectElement).value as HttpMethod)}
              class={`bg-bg-card border border-border rounded px-3 py-2 text-sm font-semibold focus:outline-none focus:border-primary appearance-none pr-8 cursor-pointer ${METHOD_COLORS[method]}`}
            >
              {METHODS.map((m) => (
                <option key={m} value={m} class="text-text">
                  {m}
                </option>
              ))}
            </select>
            <span class="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-text-muted text-xs">▾</span>
          </div>

          {/* URL input */}
          <input
            type="url"
            placeholder="https://api.example.com/v1/users"
            value={url}
            onInput={(e) => setUrl((e.target as HTMLInputElement).value)}
            class="flex-1 min-w-0 bg-bg-card border border-border rounded px-3 py-2 text-sm text-text focus:outline-none focus:border-primary font-mono placeholder:text-text-muted/50"
            spellcheck={false}
          />
        </div>
      </div>

      {/* ── Headers ── */}
      <div class="bg-bg-card border border-border rounded-lg p-4 space-y-3">
        <div class="flex justify-between items-center">
          <p class="text-sm font-medium text-text-muted">Headers</p>
          <button
            onClick={addHeader}
            class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
          >
            + Add Header
          </button>
        </div>

        {headers.length === 0 && (
          <p class="text-xs text-text-muted/60 italic">No headers — click Add Header to add one.</p>
        )}

        <div class="space-y-2">
          {headers.map((h) => (
            <div key={h.id} class="flex gap-2 items-center">
              <input
                type="text"
                placeholder="Header name"
                value={h.key}
                onInput={(e) => updateHeader(h.id, 'key', (e.target as HTMLInputElement).value)}
                class="w-2/5 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary font-mono placeholder:text-text-muted/40"
                spellcheck={false}
              />
              <input
                type="text"
                placeholder="Value"
                value={h.value}
                onInput={(e) => updateHeader(h.id, 'value', (e.target as HTMLInputElement).value)}
                class="flex-1 bg-bg-card border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:border-primary font-mono placeholder:text-text-muted/40"
                spellcheck={false}
              />
              <button
                onClick={() => removeHeader(h.id)}
                title="Remove header"
                class="text-text-muted hover:text-red-400 transition-colors text-lg leading-none px-1 flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Request body (POST / PUT / PATCH only) ── */}
      {showBody && (
        <div class="bg-bg-card border border-border rounded-lg p-4 space-y-2">
          <div class="flex justify-between items-center">
            <p class="text-sm font-medium text-text-muted">Request Body</p>
            <span class="text-xs text-text-muted/60">JSON / plain text</span>
          </div>
          <textarea
            class="w-full h-36 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-y focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted/50"
            placeholder={'{\n  "key": "value"\n}'}
            value={body}
            onInput={(e) => setBody((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
        </div>
      )}

      {/* ── Output tabs ── */}
      <div class="bg-bg-card border border-border rounded-lg overflow-hidden">
        {/* Tab bar */}
        <div class="flex border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              class={`px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                activeTab === tab
                  ? 'text-primary border-b-2 border-primary bg-bg-card'
                  : 'text-text-muted hover:text-text'
              }`}
            >
              {tab === 'curl' ? 'curl' : tab === 'fetch' ? 'fetch' : 'axios'}
            </button>
          ))}

          {/* Copy button pushed to right */}
          <div class="ml-auto flex items-center pr-3">
            <button
              onClick={() => handleCopy(activeTab)}
              class="text-xs bg-bg border border-border px-3 py-1 rounded hover:border-primary hover:text-primary transition-colors"
            >
              {copiedTab === activeTab ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Code output */}
        <pre class="w-full min-h-36 bg-[#0d1117] p-4 font-mono text-sm text-[#e6edf3] overflow-x-auto whitespace-pre leading-relaxed">
          {getSnippet(activeTab)}
        </pre>
      </div>

      {/* ── Tips ── */}
      {!url.trim() && (
        <div class="bg-bg-card border border-border rounded-lg p-4 text-sm text-text-muted">
          <p class="font-medium text-text mb-2">Quick tips</p>
          <ul class="list-disc list-inside space-y-1 text-xs leading-relaxed">
            <li>Select an HTTP method and enter a URL — the snippets update live as you type.</li>
            <li>Request body is shown for POST, PUT, and PATCH methods only.</li>
            <li>Add an <code class="font-mono bg-surface px-1 rounded">Authorization</code> header for Bearer / Basic auth.</li>
            <li>Nothing is sent to any server — this is a code generator only.</li>
            <li>Switch tabs to copy the curl, fetch, or axios snippet for your preferred environment.</li>
          </ul>
        </div>
      )}
    </div>
  );
}
