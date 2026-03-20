import { useState, useMemo } from 'preact/hooks';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
type Language = 'curl' | 'fetch' | 'axios' | 'python' | 'go' | 'php';

interface Header { key: string; value: string; enabled: boolean }

function buildCurl(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const lines: string[] = [`curl -X ${method} '${url}'`];
  for (const h of headers.filter(h => h.enabled && h.key)) {
    lines.push(`  -H '${h.key}: ${h.value}'`);
  }
  if (hasBody && body) {
    lines.push(`  -d '${body.replace(/'/g, "\\'")}'`);
  }
  return lines.join(' \\\n');
}

function buildFetch(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const hdrs = headers.filter(h => h.enabled && h.key);
  const hObj = hdrs.length ? '{\n' + hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n') + '\n  }' : '{}';
  const opts = [`method: '${method}'`, `headers: ${hObj}`];
  if (hasBody && body) opts.push(`body: ${JSON.stringify(body)}`);
  return `const response = await fetch('${url}', {\n  ${opts.join(',\n  ')}\n});\nconst data = await response.json();\nconsole.log(data);`;
}

function buildAxios(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const hdrs = headers.filter(h => h.enabled && h.key);
  const hObj = hdrs.length ? '{\n' + hdrs.map(h => `    '${h.key}': '${h.value}'`).join(',\n') + '\n  }' : '{}';
  const m = method.toLowerCase();
  if (hasBody && body) {
    let parsed: string;
    try { parsed = JSON.stringify(JSON.parse(body), null, 2).split('\n').join('\n  '); } catch { parsed = JSON.stringify(body); }
    return `const { data } = await axios.${m}('${url}', ${parsed}, {\n  headers: ${hObj}\n});\nconsole.log(data);`;
  }
  return `const { data } = await axios.${m}('${url}', {\n  headers: ${hObj}\n});\nconsole.log(data);`;
}

function buildPython(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const hdrs = headers.filter(h => h.enabled && h.key);
  const hLines = hdrs.map(h => `    "${h.key}": "${h.value}"`).join(',\n');
  const hObj = hdrs.length ? `{\n${hLines}\n}` : '{}';
  const lines = [
    'import requests',
    '',
    `headers = ${hObj}`,
  ];
  if (hasBody && body) {
    lines.push('');
    try {
      JSON.parse(body);
      lines.push(`payload = ${body}`);
      lines.push(`response = requests.${method.toLowerCase()}("${url}", json=payload, headers=headers)`);
    } catch {
      lines.push(`data = ${JSON.stringify(body)}`);
      lines.push(`response = requests.${method.toLowerCase()}("${url}", data=data, headers=headers)`);
    }
  } else {
    lines.push(`response = requests.${method.toLowerCase()}("${url}", headers=headers)`);
  }
  lines.push('print(response.json())');
  return lines.join('\n');
}

function buildGo(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const hdrs = headers.filter(h => h.enabled && h.key);
  const lines = [
    'package main',
    '',
    'import (',
    '\t"fmt"',
    '\t"io"',
    '\t"net/http"',
    ...(hasBody && body ? ['\t"strings"'] : []),
    ')',
    '',
    'func main() {',
  ];
  if (hasBody && body) {
    lines.push(`\tbody := strings.NewReader(\`${body.replace(/`/g, '\\`')}\`)`);
    lines.push(`\treq, _ := http.NewRequest("${method}", "${url}", body)`);
  } else {
    lines.push(`\treq, _ := http.NewRequest("${method}", "${url}", nil)`);
  }
  for (const h of hdrs) {
    lines.push(`\treq.Header.Set("${h.key}", "${h.value}")`);
  }
  lines.push(
    '',
    '\tclient := &http.Client{}',
    '\tresp, _ := client.Do(req)',
    '\tdefer resp.Body.Close()',
    '\tbody2, _ := io.ReadAll(resp.Body)',
    '\tfmt.Println(string(body2))',
    '}',
  );
  return lines.join('\n');
}

function buildPhp(method: Method, url: string, headers: Header[], body: string, hasBody: boolean): string {
  const hdrs = headers.filter(h => h.enabled && h.key);
  const hArr = hdrs.map(h => `    '${h.key}: ${h.value}'`).join(',\n');
  const lines = [
    '<?php',
    '',
    '$ch = curl_init();',
    `curl_setopt($ch, CURLOPT_URL, '${url}');`,
    'curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);',
    `curl_setopt($ch, CURLOPT_CUSTOMREQUEST, '${method}');`,
  ];
  if (hdrs.length) {
    lines.push(`curl_setopt($ch, CURLOPT_HTTPHEADER, [\n${hArr}\n]);`);
  }
  if (hasBody && body) {
    lines.push(`curl_setopt($ch, CURLOPT_POSTFIELDS, '${body.replace(/'/g, "\\'")}');`);
  }
  lines.push(
    '',
    '$response = curl_exec($ch);',
    'curl_close($ch);',
    '',
    'echo $response;',
  );
  return lines.join('\n');
}

const METHODS: Method[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const LANGUAGES: { id: Language; label: string; icon: string }[] = [
  { id: 'curl', label: 'cURL', icon: '🐚' },
  { id: 'fetch', label: 'Fetch', icon: '🟨' },
  { id: 'axios', label: 'Axios', icon: '⚡' },
  { id: 'python', label: 'Python', icon: '🐍' },
  { id: 'go', label: 'Go', icon: '🐹' },
  { id: 'php', label: 'PHP', icon: '🐘' },
];

const PRESET_HEADERS: Record<string, Header[]> = {
  json: [
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Accept', value: 'application/json', enabled: true },
  ],
  auth: [
    { key: 'Authorization', value: 'Bearer YOUR_TOKEN', enabled: true },
  ],
  cors: [
    { key: 'Origin', value: 'https://example.com', enabled: true },
  ],
};

export default function HttpSnippetGenerator() {
  const [method, setMethod] = useState<Method>('GET');
  const [url, setUrl] = useState('https://api.example.com/users');
  const [headers, setHeaders] = useState<Header[]>([
    { key: 'Content-Type', value: 'application/json', enabled: true },
    { key: 'Authorization', value: 'Bearer YOUR_TOKEN', enabled: true },
  ]);
  const [body, setBody] = useState('{\n  "name": "John",\n  "email": "john@example.com"\n}');
  const [lang, setLang] = useState<Language>('curl');
  const [copied, setCopied] = useState(false);

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method);

  function addHeader() {
    setHeaders(h => [...h, { key: '', value: '', enabled: true }]);
  }

  function removeHeader(i: number) {
    setHeaders(h => h.filter((_, idx) => idx !== i));
  }

  function updateHeader(i: number, field: keyof Header, value: string | boolean) {
    setHeaders(h => h.map((hdr, idx) => idx === i ? { ...hdr, [field]: value } : hdr));
  }

  function addPreset(key: string) {
    const preset = PRESET_HEADERS[key];
    if (!preset) return;
    setHeaders(h => {
      const existing = h.map(hdr => hdr.key.toLowerCase());
      const toAdd = preset.filter(p => !existing.includes(p.key.toLowerCase()));
      return [...h, ...toAdd];
    });
  }

  const snippet = useMemo(() => {
    switch (lang) {
      case 'curl': return buildCurl(method, url, headers, body, hasBody);
      case 'fetch': return buildFetch(method, url, headers, body, hasBody);
      case 'axios': return buildAxios(method, url, headers, body, hasBody);
      case 'python': return buildPython(method, url, headers, body, hasBody);
      case 'go': return buildGo(method, url, headers, body, hasBody);
      case 'php': return buildPhp(method, url, headers, body, hasBody);
    }
  }, [lang, method, url, headers, body, hasBody]);

  function copy() {
    navigator.clipboard?.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Method + URL */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex gap-2">
          <select
            value={method}
            onChange={e => setMethod((e.target as HTMLSelectElement).value as Method)}
            class="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
          >
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <input
            type="text"
            value={url}
            onInput={e => setUrl((e.target as HTMLInputElement).value)}
            placeholder="https://api.example.com/endpoint"
            class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>
      </div>

      {/* Headers */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex items-center justify-between mb-3">
          <p class="text-sm font-medium text-gray-300">Headers</p>
          <div class="flex gap-2">
            {Object.keys(PRESET_HEADERS).map(k => (
              <button key={k} onClick={() => addPreset(k)} class="text-xs text-gray-500 hover:text-indigo-400 border border-gray-700 hover:border-indigo-500 px-2 py-1 rounded-lg transition-colors capitalize">
                +{k}
              </button>
            ))}
            <button onClick={addHeader} class="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-700 px-2 py-1 rounded-lg transition-colors">
              + Add
            </button>
          </div>
        </div>
        <div class="space-y-2">
          {headers.map((h, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="checkbox"
                checked={h.enabled}
                onChange={e => updateHeader(i, 'enabled', (e.target as HTMLInputElement).checked)}
                class="accent-indigo-500"
              />
              <input
                type="text"
                value={h.key}
                onInput={e => updateHeader(i, 'key', (e.target as HTMLInputElement).value)}
                placeholder="Header-Name"
                class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <input
                type="text"
                value={h.value}
                onInput={e => updateHeader(i, 'value', (e.target as HTMLInputElement).value)}
                placeholder="value"
                class="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
              <button onClick={() => removeHeader(i)} class="text-gray-600 hover:text-red-400 transition-colors text-sm">✕</button>
            </div>
          ))}
          {headers.length === 0 && (
            <div class="text-xs text-gray-600 text-center py-2">No headers — click + Add</div>
          )}
        </div>
      </div>

      {/* Body */}
      {hasBody && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span class="text-sm text-gray-300">Request Body (JSON)</span>
          </div>
          <textarea
            value={body}
            onInput={e => setBody((e.target as HTMLTextAreaElement).value)}
            rows={5}
            class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono resize-none focus:outline-none"
            spellcheck={false}
          />
        </div>
      )}

      {/* Language picker */}
      <div class="flex flex-wrap gap-2">
        {LANGUAGES.map(l => (
          <button
            key={l.id}
            onClick={() => setLang(l.id)}
            class={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${lang === l.id ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-900 border-gray-700 text-gray-300 hover:border-indigo-500'}`}
          >
            {l.icon} {l.label}
          </button>
        ))}
      </div>

      {/* Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm text-gray-300">{LANGUAGES.find(l => l.id === lang)?.label} snippet</span>
          <button
            onClick={copy}
            class="text-xs text-gray-400 hover:text-indigo-400 transition-colors"
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <pre class="text-xs text-gray-300 px-4 py-3 overflow-x-auto font-mono whitespace-pre">{snippet}</pre>
      </div>
    </div>
  );
}
