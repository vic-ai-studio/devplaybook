import { useState, useMemo } from 'preact/hooks';

function jsonToCsv(data: unknown[], delimiter: string): string {
  if (!Array.isArray(data) || data.length === 0) return '';
  const headers = Array.from(new Set(data.flatMap(row => Object.keys(row as object))));
  const escape = (val: unknown): string => {
    const str = val == null ? '' : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n')) {
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  };
  const rows = data.map(row =>
    headers.map(h => escape((row as Record<string, unknown>)[h])).join(delimiter)
  );
  return [headers.map(h => escape(h)).join(delimiter), ...rows].join('\n');
}

const EXAMPLE = `[
  { "name": "Alice", "age": 30, "city": "New York" },
  { "name": "Bob",   "age": 25, "city": "London" },
  { "name": "Carol", "age": 35, "city": "Tokyo" }
]`;

export default function JsonToCsv() {
  const [json, setJson] = useState(EXAMPLE);
  const [delimiter, setDelimiter] = useState(',');
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    try {
      const parsed = JSON.parse(json.trim());
      if (!Array.isArray(parsed)) return { error: 'Root must be a JSON array', csv: '' };
      return { error: '', csv: jsonToCsv(parsed, delimiter) };
    } catch (e: any) {
      return { error: e.message, csv: '' };
    }
  }, [json, delimiter]);

  const copy = () => {
    navigator.clipboard.writeText(result.csv).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const download = () => {
    const blob = new Blob([result.csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'export.csv';
    a.click();
  };

  return (
    <div class="space-y-5">
      {/* Options */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label class="block text-xs text-gray-400 mb-1">Delimiter</label>
          <div class="flex gap-2">
            {[{ label: 'Comma (,)', val: ',' }, { label: 'Tab', val: '\t' }, { label: 'Semicolon (;)', val: ';' }, { label: 'Pipe (|)', val: '|' }].map(d => (
              <button key={d.val} onClick={() => setDelimiter(d.val)}
                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${delimiter === d.val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* JSON input */}
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span class="text-sm font-medium text-gray-300">JSON Input</span>
            <button onClick={() => setJson(EXAMPLE)}
              class="text-xs text-gray-500 hover:text-gray-300 transition-colors">Reset example</button>
          </div>
          <textarea
            value={json}
            onInput={e => setJson((e.target as HTMLTextAreaElement).value)}
            rows={12}
            spellcheck={false}
            class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono resize-none focus:outline-none"
          />
          {result.error && (
            <div class="px-4 py-2 border-t border-gray-700 text-red-400 text-xs font-mono">⚠ {result.error}</div>
          )}
        </div>

        {/* CSV output */}
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span class="text-sm font-medium text-gray-300">CSV Output</span>
            <div class="flex gap-2">
              <button onClick={copy} disabled={!result.csv}
                class="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1 rounded-md transition-colors font-medium">
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button onClick={download} disabled={!result.csv}
                class="text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-3 py-1 rounded-md transition-colors">
                Download .csv
              </button>
            </div>
          </div>
          <textarea
            value={result.csv}
            readOnly
            rows={12}
            class="w-full bg-transparent text-green-300 px-4 py-3 text-sm font-mono resize-none focus:outline-none"
            placeholder="CSV output will appear here"
          />
        </div>
      </div>

      <div class="bg-gray-900/50 rounded-lg border border-gray-800 p-4 text-sm text-gray-400">
        <p class="font-medium text-gray-300 mb-1">Tips</p>
        <ul class="list-disc list-inside space-y-1">
          <li>Input must be a JSON <strong class="text-gray-300">array of objects</strong></li>
          <li>Values containing the delimiter or quotes are automatically quoted</li>
          <li>Nested objects are converted to their string representation</li>
          <li>All processing happens in your browser — no data is uploaded</li>
        </ul>
      </div>
    </div>
  );
}
