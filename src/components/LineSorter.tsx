import { useState, useMemo } from 'preact/hooks';

type SortMode = 'az' | 'za' | 'length-asc' | 'length-desc' | 'random' | 'reverse';

function processLines(input: string, mode: SortMode, dedupe: boolean, trim: boolean, removeEmpty: boolean): string {
  let lines = input.split('\n');
  if (trim) lines = lines.map(l => l.trim());
  if (removeEmpty) lines = lines.filter(l => l !== '');
  if (dedupe) {
    const seen = new Set<string>();
    lines = lines.filter(l => {
      const key = l.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  switch (mode) {
    case 'az': lines.sort((a, b) => a.localeCompare(b)); break;
    case 'za': lines.sort((a, b) => b.localeCompare(a)); break;
    case 'length-asc': lines.sort((a, b) => a.length - b.length || a.localeCompare(b)); break;
    case 'length-desc': lines.sort((a, b) => b.length - a.length || a.localeCompare(b)); break;
    case 'random': for (let i = lines.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [lines[i], lines[j]] = [lines[j], lines[i]]; } break;
    case 'reverse': lines.reverse(); break;
  }

  return lines.join('\n');
}

const MODES: { value: SortMode; label: string }[] = [
  { value: 'az', label: 'A → Z' },
  { value: 'za', label: 'Z → A' },
  { value: 'length-asc', label: 'Shortest first' },
  { value: 'length-desc', label: 'Longest first' },
  { value: 'reverse', label: 'Reverse order' },
  { value: 'random', label: 'Shuffle' },
];

const EXAMPLE = `banana
apple
cherry
date
apple
elderberry
fig
grape
cherry`;

export default function LineSorter() {
  const [input, setInput] = useState(EXAMPLE);
  const [mode, setMode] = useState<SortMode>('az');
  const [dedupe, setDedupe] = useState(false);
  const [trim, setTrim] = useState(true);
  const [removeEmpty, setRemoveEmpty] = useState(false);
  const [copied, setCopied] = useState(false);
  const [randomSeed, setRandomSeed] = useState(0);

  const output = useMemo(() => processLines(input, mode, dedupe, trim, removeEmpty), [input, mode, dedupe, trim, removeEmpty, randomSeed]);

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const inputLines = input.split('\n').length;
  const outputLines = output === '' ? 0 : output.split('\n').length;

  return (
    <div class="space-y-5">
      {/* Options */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-300 mb-2">Sort Mode</label>
          <div class="flex flex-wrap gap-2">
            {MODES.map(m => (
              <button key={m.value} onClick={() => { setMode(m.value); if (m.value === 'random') setRandomSeed(s => s + 1); }}
                class={`px-3 py-1.5 text-sm rounded-md border transition-colors ${mode === m.value ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                {m.label}
              </button>
            ))}
          </div>
        </div>
        <div class="flex flex-wrap gap-5">
          {[
            { label: 'Remove duplicates', checked: dedupe, set: setDedupe },
            { label: 'Trim whitespace', checked: trim, set: setTrim },
            { label: 'Remove empty lines', checked: removeEmpty, set: setRemoveEmpty },
          ].map(opt => (
            <label key={opt.label} class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input type="checkbox" checked={opt.checked}
                onChange={e => opt.set((e.target as HTMLInputElement).checked)}
                class="accent-indigo-500 w-4 h-4" />
              {opt.label}
            </label>
          ))}
          {mode === 'random' && (
            <button onClick={() => setRandomSeed(s => s + 1)}
              class="text-sm text-indigo-400 hover:text-indigo-300 underline">
              Re-shuffle
            </button>
          )}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Input */}
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span class="text-sm font-medium text-gray-300">Input ({inputLines} lines)</span>
            <button onClick={() => setInput('')} class="text-xs text-gray-500 hover:text-red-400 transition-colors">Clear</button>
          </div>
          <textarea
            value={input}
            onInput={e => setInput((e.target as HTMLTextAreaElement).value)}
            rows={12}
            placeholder="Paste your lines here, one per line…"
            class="w-full bg-transparent text-gray-100 px-4 py-3 text-sm font-mono resize-none focus:outline-none placeholder-gray-600"
          />
        </div>

        {/* Output */}
        <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
          <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
            <span class="text-sm font-medium text-gray-300">Output ({outputLines} lines)</span>
            <button onClick={copy} disabled={!output}
              class="text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-3 py-1 rounded-md transition-colors font-medium">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <textarea
            value={output}
            readOnly
            rows={12}
            class="w-full bg-transparent text-green-300 px-4 py-3 text-sm font-mono resize-none focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
}
