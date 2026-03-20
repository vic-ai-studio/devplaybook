import { useState } from 'preact/hooks';

const WORDS = [
  'lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit','sed','do',
  'eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua','enim',
  'ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi','aliquip',
  'ex','ea','commodo','consequat','duis','aute','irure','in','reprehenderit','voluptate',
  'velit','esse','cillum','fugiat','nulla','pariatur','excepteur','sint','occaecat','cupidatat',
  'non','proident','sunt','culpa','qui','officia','deserunt','mollit','anim','id','est',
  'laborum','perspiciatis','unde','omnis','iste','natus','error','accusantium','doloremque',
  'laudantium','totam','rem','aperiam','eaque','ipsa','quae','ab','illo','inventore',
  'veritatis','quasi','architecto','beatae','vitae','dicta','explicabo','nemo','ipsam','quia',
  'voluptas','aspernatur','odit','aut','fugit','consequuntur','magni','dolores','ratione',
  'sequi','nesciunt','neque','porro','quisquam','dolorem','adipisci','numquam','eius','modi',
];

function pickWords(n: number): string[] {
  const result: string[] = [];
  for (let i = 0; i < n; i++) {
    result.push(WORDS[Math.floor(Math.random() * WORDS.length)]);
  }
  return result;
}

function makeSentence(): string {
  const wordCount = 8 + Math.floor(Math.random() * 12);
  const words = pickWords(wordCount);
  words[0] = words[0].charAt(0).toUpperCase() + words[0].slice(1);
  return words.join(' ') + '.';
}

function makeParagraph(): string {
  const sentCount = 3 + Math.floor(Math.random() * 4);
  return Array.from({ length: sentCount }, makeSentence).join(' ');
}

function generate(type: 'paragraphs' | 'sentences' | 'words', amount: number, startWithLorem: boolean): string {
  let result = '';
  if (type === 'words') {
    const words = pickWords(amount);
    if (startWithLorem && amount > 0) words[0] = 'Lorem';
    if (startWithLorem && amount > 1) words[1] = 'ipsum';
    result = words.join(' ') + '.';
  } else if (type === 'sentences') {
    const sents = Array.from({ length: amount }, makeSentence);
    if (startWithLorem && sents.length > 0) {
      sents[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.';
    }
    result = sents.join(' ');
  } else {
    const paras = Array.from({ length: amount }, makeParagraph);
    if (startWithLorem && paras.length > 0) {
      paras[0] = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.';
    }
    result = paras.join('\n\n');
  }
  return result;
}

type GenType = 'paragraphs' | 'sentences' | 'words';

export default function LoremIpsum() {
  const [type, setType] = useState<GenType>('paragraphs');
  const [amount, setAmount] = useState(3);
  const [startWithLorem, setStartWithLorem] = useState(true);
  const [output, setOutput] = useState(() => generate('paragraphs', 3, true));
  const [copied, setCopied] = useState(false);

  const handleGenerate = () => {
    setOutput(generate(type, Math.max(1, amount), startWithLorem));
  };

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const maxAmount = type === 'words' ? 500 : type === 'sentences' ? 50 : 20;

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 p-5 space-y-4">
        <div class="flex flex-wrap gap-4 items-end">
          {/* Type */}
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Generate</label>
            <div class="flex gap-2">
              {(['paragraphs', 'sentences', 'words'] as GenType[]).map(t => (
                <button key={t} onClick={() => { setType(t); setAmount(t === 'paragraphs' ? 3 : t === 'sentences' ? 5 : 50); }}
                  class={`px-3 py-1.5 rounded-md text-sm font-medium border transition-colors ${type === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Amount */}
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Amount</label>
            <div class="flex gap-2 items-center">
              {(type === 'paragraphs' ? [1, 2, 3, 5] : type === 'sentences' ? [1, 3, 5, 10] : [10, 25, 50, 100]).map(n => (
                <button key={n} onClick={() => setAmount(n)}
                  class={`px-3 py-1.5 rounded-md text-sm border transition-colors ${amount === n ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'}`}>
                  {n}
                </button>
              ))}
              <input type="number" min={1} max={maxAmount} value={amount}
                onInput={e => setAmount(Number((e.target as HTMLInputElement).value))}
                class="w-16 bg-gray-800 border border-gray-700 text-gray-100 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:border-indigo-500" />
            </div>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <label class="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input type="checkbox" checked={startWithLorem}
              onChange={e => setStartWithLorem((e.target as HTMLInputElement).checked)}
              class="accent-indigo-500 w-4 h-4" />
            Start with "Lorem ipsum…"
          </label>
          <button onClick={handleGenerate}
            class="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors text-sm">
            Generate
          </button>
        </div>
      </div>

      {/* Output */}
      <div class="bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
        <div class="flex items-center justify-between px-4 py-2 border-b border-gray-700">
          <span class="text-sm text-gray-400">{output.split(/\s+/).filter(Boolean).length} words generated</span>
          <button onClick={copy}
            class="text-sm bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1 rounded-md transition-colors font-medium">
            {copied ? '✓ Copied!' : 'Copy Text'}
          </button>
        </div>
        <div class="p-4 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-80 overflow-y-auto">
          {output}
        </div>
      </div>
    </div>
  );
}
