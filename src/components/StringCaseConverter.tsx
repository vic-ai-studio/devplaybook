import { useState } from 'preact/hooks';

function toWords(input: string): string[] {
  return input
    .replace(/([a-z])([A-Z])/g, '$1 $2') // camelCase split
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2') // ABBRWord split
    .replace(/[-_./]+/g, ' ') // separators → space
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.toLowerCase());
}

const conversions: { label: string; key: string; fn: (words: string[]) => string }[] = [
  { label: 'camelCase',        key: 'camel',   fn: w => w[0] + w.slice(1).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') },
  { label: 'PascalCase',       key: 'pascal',  fn: w => w.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') },
  { label: 'snake_case',       key: 'snake',   fn: w => w.join('_') },
  { label: 'SCREAMING_SNAKE',  key: 'screaming',fn: w => w.join('_').toUpperCase() },
  { label: 'kebab-case',       key: 'kebab',   fn: w => w.join('-') },
  { label: 'TRAIN-CASE',       key: 'train',   fn: w => w.map(s => s.toUpperCase()).join('-') },
  { label: 'dot.case',         key: 'dot',     fn: w => w.join('.') },
  { label: 'Title Case',       key: 'title',   fn: w => w.map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ') },
  { label: 'UPPER CASE',       key: 'upper',   fn: w => w.join(' ').toUpperCase() },
  { label: 'lower case',       key: 'lower',   fn: w => w.join(' ').toLowerCase() },
  { label: 'path/case',        key: 'path',    fn: w => w.join('/') },
  { label: 'Sentence case',    key: 'sentence',fn: w => { const s = w.join(' '); return s.charAt(0).toUpperCase() + s.slice(1); } },
];

export default function StringCaseConverter() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const words = toWords(input);
  const hasInput = input.trim() !== '';

  const copy = (value: string, key: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div class="space-y-5">
      {/* Input */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="px-4 py-2 border-b border-gray-700">
          <span class="text-sm font-medium text-gray-300">Input — any format accepted</span>
        </div>
        <input
          type="text"
          value={input}
          onInput={e => setInput((e.target as HTMLInputElement).value)}
          placeholder="e.g. helloWorld, hello-world, hello_world…"
          class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono focus:outline-none placeholder-gray-600"
        />
      </div>

      {/* Detected words */}
      {hasInput && (
        <div class="text-xs text-gray-500 px-1">
          Detected tokens: {words.map((w, i) => <span key={i} class="bg-gray-800 text-gray-300 px-1.5 py-0.5 rounded mr-1">{w}</span>)}
        </div>
      )}

      {/* Conversions grid */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {conversions.map(({ label, key, fn }) => {
          const value = hasInput ? fn(words) : '';
          return (
            <div key={key} class="bg-gray-900 rounded-xl border border-gray-700 p-4 flex items-center gap-3">
              <div class="flex-1 min-w-0">
                <div class="text-xs text-gray-500 mb-1">{label}</div>
                <div class={`font-mono text-sm truncate ${hasInput ? 'text-green-300' : 'text-gray-700'}`}>
                  {hasInput ? value : 'your-text-here'}
                </div>
              </div>
              <button onClick={() => copy(value, key)} disabled={!hasInput}
                class="text-xs bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white px-3 py-1.5 rounded-md transition-colors whitespace-nowrap shrink-0">
                {copied === key ? '✓' : 'Copy'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
