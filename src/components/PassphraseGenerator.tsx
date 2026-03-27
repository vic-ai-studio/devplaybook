import { useState, useCallback } from 'preact/hooks';

// 200-word EFF-style wordlist (subset for client-side use, no external deps)
const WORDS = [
  'acorn','adobe','agent','agile','algae','alley','almond','aloft','alter','amber',
  'ample','angel','ankle','anvil','apple','apron','armor','arrow','aspen','atlas',
  'attic','audio','avail','avid','awful','azure','badge','bagel','baker','barge',
  'baron','basic','batch','beige','bench','birch','blade','bland','blast','blend',
  'bliss','bloom','blown','board','bonus','booth','braid','brave','brawn','brine',
  'brisk','broil','brook','brush','budge','build','bumpy','burst','cabin','camel',
  'candy','cargo','carol','caste','cause','cedar','chalk','chaos','chase','chest',
  'choir','clamp','clash','clean','clear','clerk','cliff','clock','clone','cloud',
  'coast','cobra','comet','coral','crane','crisp','cross','crown','crush','crust',
  'curve','cycle','dandy','darts','dated','decoy','depot','derby','digit','disco',
  'dodge','dowel','draft','drain','drama','drawn','drift','drill','droit','drool',
  'drove','dwarf','eagle','early','earth','eight','elbow','elder','ember','emery',
  'empty','ender','epoch','equip','evade','event','exert','exile','extra','fable',
  'facet','faint','fairy','faith','false','fancy','fault','feast','feral','fetch',
  'field','finch','first','fixed','flame','flank','flare','flask','fleet','flesh',
  'flint','flock','flood','floor','flora','floss','flour','fluky','focal','foggy',
  'forge','forth','forum','frail','frame','fraud','fresh','frisk','frost','froze',
  'fruit','fungi','glare','gloom','gloss','glove','glyph','gnome','gnash','golem',
  'grace','grade','grain','grand','grant','grasp','grass','gravel','graze','greed',
];

const SEPARATORS = [
  { label: 'Hyphen ( - )', value: '-' },
  { label: 'Dot ( . )', value: '.' },
  { label: 'Space (   )', value: ' ' },
  { label: 'Underscore ( _ )', value: '_' },
  { label: 'None', value: '' },
];

function getRandomWord(): string {
  const arr = new Uint32Array(1);
  crypto.getRandomValues(arr);
  return WORDS[arr[0] % WORDS.length];
}

function calcEntropy(wordCount: number, listSize: number): number {
  return Math.log2(Math.pow(listSize, wordCount));
}

function strengthLabel(bits: number): { label: string; color: string; width: string } {
  if (bits < 40) return { label: 'Weak', color: 'bg-red-500', width: '20%' };
  if (bits < 60) return { label: 'Fair', color: 'bg-yellow-500', width: '45%' };
  if (bits < 80) return { label: 'Strong', color: 'bg-blue-500', width: '70%' };
  return { label: 'Very Strong', color: 'bg-green-500', width: '100%' };
}

export default function PassphraseGenerator() {
  const [wordCount, setWordCount] = useState(4);
  const [separator, setSeparator] = useState('-');
  const [capitalize, setCapitalize] = useState(false);
  const [addNumber, setAddNumber] = useState(false);
  const [passphrase, setPassphrase] = useState('');
  const [copied, setCopied] = useState(false);

  const generate = useCallback(() => {
    const arr = new Uint32Array(1);

    let words = Array.from({ length: wordCount }, () => getRandomWord());
    if (capitalize) words = words.map(w => w[0].toUpperCase() + w.slice(1));

    let result = words.join(separator);

    if (addNumber) {
      crypto.getRandomValues(arr);
      const num = arr[0] % 100;
      result += `${separator}${num}`;
    }

    setPassphrase(result);
    setCopied(false);
  }, [wordCount, separator, capitalize, addNumber]);

  async function copy() {
    if (!passphrase) return;
    await navigator.clipboard.writeText(passphrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const entropy = calcEntropy(wordCount, WORDS.length);
  const strength = strengthLabel(entropy);

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class="block text-sm text-text-muted mb-1">
            Word Count: <span class="text-text font-medium">{wordCount}</span>
          </label>
          <input
            type="range"
            min={3}
            max={8}
            value={wordCount}
            onInput={(e) => setWordCount(Number((e.target as HTMLInputElement).value))}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-1">
            <span>3</span><span>8</span>
          </div>
        </div>
        <div>
          <label class="block text-sm text-text-muted mb-1">Separator</label>
          <select
            value={separator}
            onChange={(e) => setSeparator((e.target as HTMLSelectElement).value)}
            class="w-full px-3 py-2 bg-surface border border-border rounded text-sm focus:outline-none focus:border-accent"
          >
            {SEPARATORS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggles */}
      <div class="flex flex-wrap gap-4">
        <label class="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setCapitalize(v => !v)}
            class={`w-10 h-5 rounded-full transition-colors ${capitalize ? 'bg-accent' : 'bg-border'} relative`}
          >
            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${capitalize ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span class="text-sm">Capitalize Words</span>
        </label>
        <label class="flex items-center gap-2 cursor-pointer">
          <div
            onClick={() => setAddNumber(v => !v)}
            class={`w-10 h-5 rounded-full transition-colors ${addNumber ? 'bg-accent' : 'bg-border'} relative`}
          >
            <div class={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${addNumber ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </div>
          <span class="text-sm">Append Number (0–99)</span>
        </label>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        class="px-5 py-2 bg-accent text-white rounded font-medium hover:bg-accent/90 transition-colors"
      >
        Generate Passphrase
      </button>

      {/* Output */}
      {passphrase && (
        <div class="space-y-3">
          <div class="bg-surface border border-border rounded p-4 flex items-center justify-between gap-3 flex-wrap">
            <code class="font-mono text-lg text-text break-all">{passphrase}</code>
            <button
              onClick={copy}
              class="shrink-0 px-3 py-1.5 text-sm border border-border rounded hover:border-accent hover:text-accent transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          {/* Strength */}
          <div>
            <div class="flex justify-between text-xs mb-1">
              <span class="text-text-muted">Entropy strength</span>
              <span class={`font-medium ${strength.label === 'Weak' ? 'text-red-400' : strength.label === 'Fair' ? 'text-yellow-400' : 'text-green-400'}`}>
                {strength.label} ({Math.round(entropy)} bits)
              </span>
            </div>
            <div class="h-1.5 bg-border rounded-full overflow-hidden">
              <div class={`h-full ${strength.color} transition-all`} style={{ width: strength.width }} />
            </div>
            <p class="text-xs text-text-muted mt-1">
              {Math.round(entropy)} bits of entropy — {entropy >= 60 ? 'suitable for most accounts' : 'add more words for better security'}
            </p>
          </div>
        </div>
      )}

      <div class="text-xs text-text-muted space-y-1">
        <p>Uses <code class="bg-surface px-1 rounded">crypto.getRandomValues()</code> — cryptographically secure, runs entirely in your browser.</p>
        <p>Based on the diceware concept: each word adds ~{Math.round(Math.log2(WORDS.length))} bits of entropy from a {WORDS.length}-word list.</p>
      </div>
    </div>
  );
}
