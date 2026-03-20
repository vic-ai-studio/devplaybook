import { useState, useMemo } from 'preact/hooks';

// Transliteration map for common accented characters
const TRANSLITERATE: Record<string, string> = {
  'à':'a','á':'a','â':'a','ã':'a','ä':'a','å':'a','æ':'ae',
  'ç':'c','è':'e','é':'e','ê':'e','ë':'e','ì':'i','í':'i','î':'i','ï':'i',
  'ð':'d','ñ':'n','ò':'o','ó':'o','ô':'o','õ':'o','ö':'o','ø':'o',
  'ù':'u','ú':'u','û':'u','ü':'u','ý':'y','þ':'th','ß':'ss',
  'À':'a','Á':'a','Â':'a','Ã':'a','Ä':'a','Å':'a','Æ':'ae',
  'Ç':'c','È':'e','É':'e','Ê':'e','Ë':'e','Ì':'i','Í':'i','Î':'i','Ï':'i',
  'Ð':'d','Ñ':'n','Ò':'o','Ó':'o','Ô':'o','Õ':'o','Ö':'o','Ø':'o',
  'Ù':'u','Ú':'u','Û':'u','Ü':'u','Ý':'y','Þ':'th',
};

function toSlug(text: string, separator: string, lowercase: boolean): string {
  let s = text;
  // Transliterate
  s = s.replace(/[^\u0000-\u007E]/g, c => TRANSLITERATE[c] || '');
  if (lowercase) s = s.toLowerCase();
  s = s
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // remove non-alphanumeric except spaces/dash/underscore
    .trim()
    .replace(/[\s_-]+/g, separator);   // collapse whitespace/separators
  return s;
}

const EXAMPLES = [
  'Hello World! My First Blog Post',
  'How to Build a REST API with Node.js',
  '10 CSS Tips & Tricks for 2024',
  'Über-cool Résumé Builder App',
];

export default function SlugGenerator() {
  const [input, setInput] = useState('Hello World! My First Blog Post');
  const [separator, setSeparator] = useState('-');
  const [lowercase, setLowercase] = useState(true);
  const [copied, setCopied] = useState(false);

  const slug = useMemo(() => toSlug(input, separator, lowercase), [input, separator, lowercase]);

  const copy = () => {
    navigator.clipboard.writeText(slug).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">Input Text</span>
        </div>
        <textarea
          value={input}
          onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
          rows={3}
          placeholder="Enter your title or text here…"
          class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm resize-none focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Options */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex flex-wrap gap-4 items-center">
        <div>
          <label class="block text-xs text-gray-400 mb-1.5">Separator</label>
          <div class="flex gap-2">
            {[{ label: 'Hyphen (-)', val: '-' }, { label: 'Underscore (_)', val: '_' }, { label: 'None', val: '' }].map(s => (
              <button key={s.val} onClick={() => setSeparator(s.val)}
                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${separator === s.val ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
          <input type="checkbox" checked={lowercase}
            onChange={e => setLowercase((e.target as HTMLInputElement).checked)}
            class="accent-indigo-500 w-4 h-4" />
          Lowercase
        </label>
      </div>

      {/* Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-gray-300">Slug Output</span>
          <button onClick={copy}
            class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-md transition-colors font-medium">
            {copied ? '✓ Copied!' : 'Copy Slug'}
          </button>
        </div>
        <code class="block bg-gray-800 rounded-lg px-4 py-3 text-green-300 font-mono text-sm break-all">
          {slug || <span class="text-gray-600 italic">slug will appear here</span>}
        </code>
      </div>

      {/* URL preview */}
      {slug && (
        <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
          <p class="text-xs text-gray-400 mb-2">URL Preview</p>
          <code class="text-sm font-mono text-gray-300">
            https://example.com/<span class="text-indigo-400">{slug}</span>
          </code>
        </div>
      )}

      {/* Examples */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4">
        <p class="text-sm font-medium text-gray-300 mb-3">Quick Examples</p>
        <div class="space-y-2">
          {EXAMPLES.map(ex => (
            <button key={ex} onClick={() => setInput(ex)}
              class="block w-full text-left text-sm text-gray-400 hover:text-gray-100 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
