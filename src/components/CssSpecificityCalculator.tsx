import { useState } from 'preact/hooks';

interface Specificity {
  inline: number;
  ids: number;
  classes: number;
  elements: number;
}

function parseSpecificity(selector: string): Specificity {
  let s = selector.trim();

  // Remove pseudo-element ::before etc. (count as 1 element each)
  let elements = 0;
  let classes = 0;
  let ids = 0;

  // Count pseudo-elements (:: or single-colon legacy like :before, :after, :first-line, :first-letter)
  const pseudoElements = ['::before', '::after', '::first-line', '::first-letter', '::selection', '::placeholder', '::marker', '::backdrop', '::cue', '::slotted', ':before', ':after', ':first-line', ':first-letter'];
  for (const pe of pseudoElements) {
    const regex = new RegExp(pe.replace(/:/g, '\\:'), 'gi');
    const matches = s.match(regex);
    if (matches) {
      elements += matches.length;
      s = s.replace(regex, '');
    }
  }

  // Remove :not(), :is(), :has(), :where() but count contents
  // :where() contributes 0 specificity to its arguments
  s = s.replace(/:where\([^)]*\)/gi, '');

  // :not(), :is(), :has() - take specificity of most specific argument (simplified: count normally)
  s = s.replace(/:(?:not|is|has)\(/gi, ' ').replace(/\)/g, ' ');

  // Remove attribute selectors (count each as 1 class-level)
  const attrMatches = s.match(/\[[^\]]*\]/g);
  if (attrMatches) {
    classes += attrMatches.length;
    s = s.replace(/\[[^\]]*\]/g, '');
  }

  // Remove pseudo-classes (count as 1 class-level each)
  const pseudoClassMatches = s.match(/:[a-zA-Z-]+(?:\([^)]*\))?/g);
  if (pseudoClassMatches) {
    classes += pseudoClassMatches.length;
    s = s.replace(/:[a-zA-Z-]+(?:\([^)]*\))?/g, '');
  }

  // Count ID selectors
  const idMatches = s.match(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g);
  if (idMatches) {
    ids += idMatches.length;
    s = s.replace(/#[a-zA-Z_-][a-zA-Z0-9_-]*/g, '');
  }

  // Count class selectors
  const classMatches = s.match(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g);
  if (classMatches) {
    classes += classMatches.length;
    s = s.replace(/\.[a-zA-Z_-][a-zA-Z0-9_-]*/g, '');
  }

  // Count element selectors (remaining word tokens, excluding *, combinators)
  const elementMatches = s.match(/[a-zA-Z][a-zA-Z0-9-]*/g);
  if (elementMatches) {
    elements += elementMatches.length;
  }

  return { inline: 0, ids, classes, elements };
}

function specificityToScore(s: Specificity): number {
  return s.inline * 1000000 + s.ids * 10000 + s.classes * 100 + s.elements;
}

function compareResult(a: Specificity, b: Specificity): 'a' | 'b' | 'equal' {
  const sa = specificityToScore(a);
  const sb = specificityToScore(b);
  if (sa > sb) return 'a';
  if (sb > sa) return 'b';
  return 'equal';
}

const EXAMPLES = [
  { selector: '#nav .item:hover', label: 'ID + class + pseudo' },
  { selector: '.btn.btn-primary', label: 'Two classes' },
  { selector: 'div > p::first-line', label: 'Elements + pseudo-element' },
  { selector: '[type="text"]', label: 'Attribute selector' },
  { selector: '*', label: 'Universal selector' },
];

export default function CssSpecificityCalculator() {
  const [selectorA, setSelectorA] = useState('.nav #logo:hover');
  const [selectorB, setSelectorB] = useState('div.container .link');
  const [mode, setMode] = useState<'single' | 'compare'>('single');
  const [copied, setCopied] = useState('');

  const specA = selectorA ? parseSpecificity(selectorA) : null;
  const specB = selectorB ? parseSpecificity(selectorB) : null;
  const winner = specA && specB ? compareResult(specA, specB) : null;

  const copySpec = (spec: Specificity, label: string) => {
    const text = `(${spec.inline}, ${spec.ids}, ${spec.classes}, ${spec.elements})`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 1500);
    });
  };

  return (
    <div class="space-y-6">
      {/* Mode Toggle */}
      <div class="flex gap-2">
        {(['single', 'compare'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            class={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${mode === m ? 'bg-primary text-white' : 'bg-bg-card border border-border text-text-muted hover:border-primary'}`}
          >
            {m === 'single' ? 'Single Selector' : 'Compare Two'}
          </button>
        ))}
      </div>

      {/* Inputs */}
      <div class={`grid gap-4 ${mode === 'compare' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">{mode === 'compare' ? 'Selector A' : 'CSS Selector'}</label>
          <input
            type="text"
            class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
            placeholder="e.g. .nav #logo:hover"
            value={selectorA}
            onInput={(e) => setSelectorA((e.target as HTMLInputElement).value)}
          />
        </div>
        {mode === 'compare' && (
          <div>
            <label class="block text-sm font-medium text-text-muted mb-2">Selector B</label>
            <input
              type="text"
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2.5 font-mono text-sm text-text focus:outline-none focus:border-primary transition-colors"
              placeholder="e.g. div.container .link"
              value={selectorB}
              onInput={(e) => setSelectorB((e.target as HTMLInputElement).value)}
            />
          </div>
        )}
      </div>

      {/* Results */}
      <div class={`grid gap-4 ${mode === 'compare' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
        {specA && (
          <SpecificityCard
            selector={selectorA}
            spec={specA}
            label="A"
            highlight={mode === 'compare' ? winner === 'a' : false}
            onCopy={() => copySpec(specA, 'A')}
            copied={copied === 'A'}
          />
        )}
        {mode === 'compare' && specB && (
          <SpecificityCard
            selector={selectorB}
            spec={specB}
            label="B"
            highlight={winner === 'b'}
            onCopy={() => copySpec(specB, 'B')}
            copied={copied === 'B'}
          />
        )}
      </div>

      {/* Compare result */}
      {mode === 'compare' && specA && specB && winner && (
        <div class={`rounded-lg p-4 text-sm font-medium text-center ${winner === 'equal' ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}>
          {winner === 'equal'
            ? 'Equal specificity — last rule wins (cascade order)'
            : `Selector ${winner.toUpperCase()} wins with higher specificity`}
        </div>
      )}

      {/* Reference table */}
      <div class="bg-bg-card border border-border rounded-lg p-4">
        <p class="text-sm font-medium text-text mb-3">Specificity Scoring Rules</p>
        <div class="space-y-2 text-sm text-text-muted">
          {[
            ['0,1,0,0', 'ID selectors', '#header, #nav'],
            ['0,0,1,0', 'Class / attribute / pseudo-class', '.btn, [type], :hover'],
            ['0,0,0,1', 'Element / pseudo-element', 'div, p, ::before'],
            ['0,0,0,0', 'Universal selector', '*, combinators'],
          ].map(([score, desc, ex]) => (
            <div key={score} class="grid grid-cols-3 gap-2">
              <span class="font-mono text-primary text-xs">{score}</span>
              <span>{desc}</span>
              <span class="font-mono text-xs opacity-70">{ex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Examples */}
      <div>
        <p class="text-sm font-medium text-text-muted mb-2">Try an example</p>
        <div class="flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex.selector}
              onClick={() => setSelectorA(ex.selector)}
              class="text-xs px-3 py-1.5 bg-bg-card border border-border rounded-full hover:border-primary hover:text-primary transition-colors"
            >
              {ex.selector}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SpecificityCard({ selector, spec, label, highlight, onCopy, copied }: {
  selector: string;
  spec: Specificity;
  label: string;
  highlight: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  const score = specificityToScore(spec);
  const categories = [
    { key: 'inline', label: 'Inline', color: 'text-red-400', bg: 'bg-red-500/10' },
    { key: 'ids', label: 'ID', color: 'text-purple-400', bg: 'bg-purple-500/10' },
    { key: 'classes', label: 'Class/Attr', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    { key: 'elements', label: 'Element', color: 'text-green-400', bg: 'bg-green-500/10' },
  ] as const;

  return (
    <div class={`bg-bg-card rounded-lg p-4 border transition-colors ${highlight ? 'border-green-500/50' : 'border-border'}`}>
      <div class="flex items-center justify-between mb-3">
        <span class="font-mono text-sm text-text truncate max-w-[200px]" title={selector}>{selector || '–'}</span>
        <button
          onClick={onCopy}
          class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors shrink-0 ml-2"
        >
          {copied ? '✓' : 'Copy'}
        </button>
      </div>

      {/* Big score display */}
      <div class="flex justify-center gap-3 my-4">
        {categories.map(({ key, label: cat, color, bg }) => (
          <div key={key} class={`flex flex-col items-center rounded-lg px-3 py-2 ${bg}`}>
            <span class={`text-2xl font-bold ${color}`}>{spec[key]}</span>
            <span class="text-xs text-text-muted mt-1">{cat}</span>
          </div>
        ))}
      </div>

      <div class="text-center">
        <span class="font-mono text-lg text-text">
          ({spec.inline},{spec.ids},{spec.classes},{spec.elements})
        </span>
        <p class="text-xs text-text-muted mt-1">Score: {score}</p>
      </div>
    </div>
  );
}
