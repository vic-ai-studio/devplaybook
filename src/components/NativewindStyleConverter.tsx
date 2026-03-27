import { useState } from 'preact/hooks';

// ── Types ──────────────────────────────────────────────────────────────────

interface ConversionResult {
  selector: string;
  classes: string[];
  unconverted: string[];
}

// ── CSS → NativeWind mapping helpers ──────────────────────────────────────

const PX_TO_SPACING: Record<number, string> = {
  0: '0',
  1: 'px',
  2: '0.5',
  4: '1',
  6: '1.5',
  8: '2',
  10: '2.5',
  12: '3',
  14: '3.5',
  16: '4',
  20: '5',
  24: '6',
  28: '7',
  32: '8',
  36: '9',
  40: '10',
  44: '11',
  48: '12',
  56: '14',
  64: '16',
  80: '20',
  96: '24',
  112: '28',
  128: '32',
};

const PX_TO_FONTSIZE: Record<number, string> = {
  10: 'text-xs',
  12: 'text-xs',
  14: 'text-sm',
  16: 'text-base',
  18: 'text-lg',
  20: 'text-xl',
  24: 'text-2xl',
  28: 'text-3xl',
  30: 'text-3xl',
  32: 'text-4xl',
  36: 'text-4xl',
  48: 'text-5xl',
  64: 'text-6xl',
  72: 'text-7xl',
};

const NAMED_COLORS: Record<string, string> = {
  white: 'white',
  black: 'black',
  red: 'red-500',
  blue: 'blue-500',
  green: 'green-500',
  yellow: 'yellow-500',
  orange: 'orange-500',
  purple: 'purple-500',
  pink: 'pink-500',
  gray: 'gray-500',
  grey: 'gray-500',
  transparent: 'transparent',
};

function closestSpacing(px: number): string {
  const keys = Object.keys(PX_TO_SPACING).map(Number).sort((a, b) => a - b);
  let best = keys[0];
  let bestDiff = Math.abs(px - best);
  for (const k of keys) {
    const diff = Math.abs(px - k);
    if (diff < bestDiff) { best = k; bestDiff = diff; }
  }
  return PX_TO_SPACING[best];
}

function parsePxValue(val: string): number | null {
  const m = val.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return m ? parseFloat(m[1]) : null;
}

function parsePercentValue(val: string): string | null {
  const m = val.trim().match(/^(\d+(?:\.\d+)?)%$/);
  return m ? m[1] : null;
}

function resolveColor(val: string, prefix: string): string | null {
  const v = val.trim().toLowerCase();
  if (NAMED_COLORS[v]) return `${prefix}-${NAMED_COLORS[v]}`;
  // hex shortcuts
  if (v === '#fff' || v === '#ffffff') return `${prefix}-white`;
  if (v === '#000' || v === '#000000') return `${prefix}-black`;
  return null;
}

function convertDeclaration(prop: string, val: string): { classes: string[]; unconverted: string[] } {
  const classes: string[] = [];
  const unconverted: string[] = [];
  const p = prop.trim().toLowerCase();
  const v = val.trim();

  switch (p) {
    case 'display': {
      if (v === 'flex') classes.push('flex');
      else if (v === 'none') classes.push('hidden');
      else if (v === 'block') classes.push('block');
      else if (v === 'inline') classes.push('inline');
      else if (v === 'inline-flex') classes.push('inline-flex');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'flex-direction': {
      if (v === 'row') classes.push('flex-row');
      else if (v === 'column') classes.push('flex-col');
      else if (v === 'row-reverse') classes.push('flex-row-reverse');
      else if (v === 'column-reverse') classes.push('flex-col-reverse');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'flex': {
      if (v === '1') classes.push('flex-1');
      else if (v === 'auto') classes.push('flex-auto');
      else if (v === 'none') classes.push('flex-none');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'flex-wrap': {
      if (v === 'wrap') classes.push('flex-wrap');
      else if (v === 'nowrap') classes.push('flex-nowrap');
      else if (v === 'wrap-reverse') classes.push('flex-wrap-reverse');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'justify-content': {
      const map: Record<string, string> = {
        'flex-start': 'justify-start',
        'flex-end': 'justify-end',
        center: 'justify-center',
        'space-between': 'justify-between',
        'space-around': 'justify-around',
        'space-evenly': 'justify-evenly',
      };
      if (map[v]) classes.push(map[v]);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'align-items': {
      const map: Record<string, string> = {
        'flex-start': 'items-start',
        'flex-end': 'items-end',
        center: 'items-center',
        stretch: 'items-stretch',
        baseline: 'items-baseline',
      };
      if (map[v]) classes.push(map[v]);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'align-self': {
      const map: Record<string, string> = {
        'flex-start': 'self-start',
        'flex-end': 'self-end',
        center: 'self-center',
        stretch: 'self-stretch',
        auto: 'self-auto',
      };
      if (map[v]) classes.push(map[v]);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'background-color':
    case 'background': {
      const c = resolveColor(v, 'bg');
      if (c) classes.push(c);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'color': {
      const c = resolveColor(v, 'text');
      if (c) classes.push(c);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'padding': {
      const parts = v.split(/\s+/);
      if (parts.length === 1) {
        const px = parsePxValue(parts[0]);
        if (px !== null) classes.push(`p-${closestSpacing(px)}`);
        else unconverted.push(`${p}: ${v}`);
      } else if (parts.length === 2) {
        const py = parsePxValue(parts[0]);
        const px = parsePxValue(parts[1]);
        if (py !== null) classes.push(`py-${closestSpacing(py)}`);
        if (px !== null) classes.push(`px-${closestSpacing(px)}`);
        if (py === null || px === null) unconverted.push(`${p}: ${v}`);
      } else {
        unconverted.push(`${p}: ${v}`);
      }
      break;
    }
    case 'padding-top': { const px = parsePxValue(v); if (px !== null) classes.push(`pt-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'padding-bottom': { const px = parsePxValue(v); if (px !== null) classes.push(`pb-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'padding-left': { const px = parsePxValue(v); if (px !== null) classes.push(`pl-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'padding-right': { const px = parsePxValue(v); if (px !== null) classes.push(`pr-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'margin': {
      const parts = v.split(/\s+/);
      if (parts.length === 1) {
        if (v === 'auto') { classes.push('m-auto'); break; }
        const px = parsePxValue(parts[0]);
        if (px !== null) classes.push(`m-${closestSpacing(px)}`);
        else unconverted.push(`${p}: ${v}`);
      } else if (parts.length === 2) {
        const my = parsePxValue(parts[0]);
        const mx = parsePxValue(parts[1]);
        if (my !== null) classes.push(`my-${closestSpacing(my)}`);
        if (mx !== null) classes.push(`mx-${closestSpacing(mx)}`);
        if (my === null || mx === null) unconverted.push(`${p}: ${v}`);
      } else {
        unconverted.push(`${p}: ${v}`);
      }
      break;
    }
    case 'margin-top': { const px = parsePxValue(v); if (px !== null) classes.push(`mt-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'margin-bottom': { const px = parsePxValue(v); if (px !== null) classes.push(`mb-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'margin-left': { const px = parsePxValue(v); if (px !== null) classes.push(v === 'auto' ? 'ml-auto' : `ml-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'margin-right': { const px = parsePxValue(v); if (px !== null) classes.push(v === 'auto' ? 'mr-auto' : `mr-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'gap': {
      const px = parsePxValue(v);
      if (px !== null) classes.push(`gap-${closestSpacing(px)}`);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'gap-x':
    case 'column-gap': { const px = parsePxValue(v); if (px !== null) classes.push(`gap-x-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'gap-y':
    case 'row-gap': { const px = parsePxValue(v); if (px !== null) classes.push(`gap-y-${closestSpacing(px)}`); else unconverted.push(`${p}: ${v}`); break; }
    case 'border-radius': {
      const px = parsePxValue(v);
      if (v === '9999px' || v === '50%') classes.push('rounded-full');
      else if (px !== null) {
        if (px <= 2) classes.push('rounded-sm');
        else if (px <= 4) classes.push('rounded');
        else if (px <= 6) classes.push('rounded-md');
        else if (px <= 8) classes.push('rounded-lg');
        else if (px <= 12) classes.push('rounded-xl');
        else classes.push('rounded-2xl');
      } else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'font-size': {
      const px = parsePxValue(v);
      if (px !== null) {
        const cls = PX_TO_FONTSIZE[px] || (px <= 10 ? 'text-xs' : px >= 64 ? 'text-6xl' : null);
        if (cls) classes.push(cls);
        else unconverted.push(`${p}: ${v}`);
      } else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'font-weight': {
      const map: Record<string, string> = {
        '100': 'font-thin',
        '200': 'font-extralight',
        '300': 'font-light',
        '400': 'font-normal',
        normal: 'font-normal',
        '500': 'font-medium',
        '600': 'font-semibold',
        '700': 'font-bold',
        bold: 'font-bold',
        '800': 'font-extrabold',
        '900': 'font-black',
      };
      if (map[v]) classes.push(map[v]);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'width': {
      if (v === '100%') classes.push('w-full');
      else if (v === '50%') classes.push('w-1/2');
      else if (v === '33.33%' || v === '33%') classes.push('w-1/3');
      else if (v === '25%') classes.push('w-1/4');
      else if (v === 'auto') classes.push('w-auto');
      else {
        const pct = parsePercentValue(v);
        if (pct) { classes.push(`w-[${v}]`); }
        else {
          const px = parsePxValue(v);
          if (px !== null) classes.push(`w-${closestSpacing(px)}`);
          else unconverted.push(`${p}: ${v}`);
        }
      }
      break;
    }
    case 'height': {
      if (v === '100%') classes.push('h-full');
      else if (v === '50%') classes.push('h-1/2');
      else if (v === 'auto') classes.push('h-auto');
      else {
        const px = parsePxValue(v);
        if (px !== null) classes.push(`h-${closestSpacing(px)}`);
        else unconverted.push(`${p}: ${v}`);
      }
      break;
    }
    case 'min-width': { const px = parsePxValue(v); if (px !== null) classes.push(`min-w-${closestSpacing(px)}`); else if (v === '100%') classes.push('min-w-full'); else unconverted.push(`${p}: ${v}`); break; }
    case 'max-width': { const px = parsePxValue(v); if (px !== null) classes.push(`max-w-${closestSpacing(px)}`); else if (v === '100%') classes.push('max-w-full'); else unconverted.push(`${p}: ${v}`); break; }
    case 'opacity': {
      const n = parseFloat(v);
      if (!isNaN(n)) {
        const pct = Math.round(n * 100);
        const snap = [0, 5, 10, 20, 25, 30, 40, 50, 60, 70, 75, 80, 90, 95, 100];
        const closest = snap.reduce((a, b) => Math.abs(b - pct) < Math.abs(a - pct) ? b : a);
        classes.push(`opacity-${closest}`);
      } else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'border-width': { const px = parsePxValue(v); if (px === 1) classes.push('border'); else if (px === 2) classes.push('border-2'); else if (px === 4) classes.push('border-4'); else if (px === 8) classes.push('border-8'); else if (px === 0) classes.push('border-0'); else unconverted.push(`${p}: ${v}`); break; }
    case 'border-color': { const c = resolveColor(v, 'border'); if (c) classes.push(c); else unconverted.push(`${p}: ${v}`); break; }
    case 'border-style': { if (v === 'solid') classes.push('border-solid'); else if (v === 'dashed') classes.push('border-dashed'); else if (v === 'dotted') classes.push('border-dotted'); else unconverted.push(`${p}: ${v}`); break; }
    case 'border': {
      // shorthand: width style color
      const parts = v.split(/\s+/);
      let handled = 0;
      for (const part of parts) {
        const px = parsePxValue(part);
        if (px !== null) {
          if (px === 1) classes.push('border');
          else if (px === 2) classes.push('border-2');
          handled++;
        } else if (['solid', 'dashed', 'dotted'].includes(part)) {
          classes.push(`border-${part}`);
          handled++;
        } else {
          const c = resolveColor(part, 'border');
          if (c) { classes.push(c); handled++; }
        }
      }
      if (handled === 0) unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'overflow': {
      if (v === 'hidden') classes.push('overflow-hidden');
      else if (v === 'scroll') classes.push('overflow-scroll');
      else if (v === 'auto') classes.push('overflow-auto');
      else if (v === 'visible') classes.push('overflow-visible');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'position': {
      if (v === 'absolute') classes.push('absolute');
      else if (v === 'relative') classes.push('relative');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'top': { const px = parsePxValue(v); if (px !== null) classes.push(`top-${closestSpacing(px)}`); else if (v === '0') classes.push('top-0'); else unconverted.push(`${p}: ${v}`); break; }
    case 'bottom': { const px = parsePxValue(v); if (px !== null) classes.push(`bottom-${closestSpacing(px)}`); else if (v === '0') classes.push('bottom-0'); else unconverted.push(`${p}: ${v}`); break; }
    case 'left': { const px = parsePxValue(v); if (px !== null) classes.push(`left-${closestSpacing(px)}`); else if (v === '0') classes.push('left-0'); else unconverted.push(`${p}: ${v}`); break; }
    case 'right': { const px = parsePxValue(v); if (px !== null) classes.push(`right-${closestSpacing(px)}`); else if (v === '0') classes.push('right-0'); else unconverted.push(`${p}: ${v}`); break; }
    case 'text-align': {
      if (v === 'center') classes.push('text-center');
      else if (v === 'left') classes.push('text-left');
      else if (v === 'right') classes.push('text-right');
      else if (v === 'justify') classes.push('text-justify');
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    case 'line-height': {
      const map: Record<string, string> = {
        '1': 'leading-none',
        '1.25': 'leading-tight',
        '1.375': 'leading-snug',
        '1.5': 'leading-normal',
        '1.625': 'leading-relaxed',
        '2': 'leading-loose',
      };
      if (map[v]) classes.push(map[v]);
      else unconverted.push(`${p}: ${v}`);
      break;
    }
    default:
      unconverted.push(`${p}: ${v}`);
  }

  return { classes, unconverted };
}

// ── CSS Parser ─────────────────────────────────────────────────────────────

function parseCSS(css: string): ConversionResult[] {
  const results: ConversionResult[] = [];

  // Match selector { ... } blocks
  const ruleRegex = /([^{]+)\{([^}]*)\}/g;
  let match: RegExpExecArray | null;

  while ((match = ruleRegex.exec(css)) !== null) {
    const selector = match[1].trim();
    const body = match[2];

    const allClasses: string[] = [];
    const allUnconverted: string[] = [];

    const declarations = body.split(';').map(s => s.trim()).filter(Boolean);
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      const { classes, unconverted } = convertDeclaration(prop, val);
      allClasses.push(...classes);
      allUnconverted.push(...unconverted);
    }

    results.push({ selector, classes: allClasses, unconverted: allUnconverted });
  }

  // If no rule blocks found, try parsing as plain declarations
  if (results.length === 0 && css.trim()) {
    const allClasses: string[] = [];
    const allUnconverted: string[] = [];
    const declarations = css.split(';').map(s => s.trim()).filter(Boolean);
    for (const decl of declarations) {
      const colonIdx = decl.indexOf(':');
      if (colonIdx === -1) continue;
      const prop = decl.slice(0, colonIdx).trim();
      const val = decl.slice(colonIdx + 1).trim();
      const { classes, unconverted } = convertDeclaration(prop, val);
      allClasses.push(...classes);
      allUnconverted.push(...unconverted);
    }
    if (allClasses.length > 0 || allUnconverted.length > 0) {
      results.push({ selector: '(inline)', classes: allClasses, unconverted: allUnconverted });
    }
  }

  return results;
}

// ── Output builder ─────────────────────────────────────────────────────────

function buildOutput(results: ConversionResult[]): string {
  if (results.length === 0) return '// Paste CSS on the left to see results';

  const lines: string[] = [];
  for (const r of results) {
    const classStr = r.classes.join(' ');
    const cleanSelector = r.selector.replace(/^\./, '').replace(/[^a-zA-Z0-9_-]/g, '_');
    lines.push(`// ${r.selector}`);
    lines.push(`// className="${classStr}"`);
    lines.push('');
    lines.push(`<View className="${classStr}">`);
    lines.push(`  {/* content */}`);
    lines.push(`</View>`);
    if (r.unconverted.length > 0) {
      lines.push('');
      lines.push(`// NOTE: Could not convert ${r.unconverted.length} propert${r.unconverted.length === 1 ? 'y' : 'ies'}:`);
      for (const u of r.unconverted) {
        lines.push(`//   ${u}`);
      }
    }
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n').replace(/\n---\n$/, '');
}

// ── Main Component ─────────────────────────────────────────────────────────

const EXAMPLE_CSS = `.container {
  display: flex;
  flex-direction: column;
  padding: 16px;
  background-color: white;
  border-radius: 8px;
  gap: 8px;
}

.title {
  font-size: 24px;
  font-weight: 700;
  color: black;
}

.button {
  padding: 8px 16px;
  background-color: blue;
  border-radius: 4px;
  opacity: 0.9;
}`;

export default function NativewindStyleConverter() {
  const [input, setInput] = useState(EXAMPLE_CSS);
  const [copied, setCopied] = useState(false);
  const [copiedClasses, setCopiedClasses] = useState<string | null>(null);

  const results = parseCSS(input);
  const output = buildOutput(results);

  const totalConverted = results.reduce((s, r) => s + r.classes.length, 0);
  const totalUnconverted = results.reduce((s, r) => s + r.unconverted.length, 0);

  function handleCopy() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function handleCopyClasses(classes: string[], selectorKey: string) {
    navigator.clipboard.writeText(classes.join(' ')).then(() => {
      setCopiedClasses(selectorKey);
      setTimeout(() => setCopiedClasses(null), 2000);
    });
  }

  return (
    <div class="space-y-6">
      {/* Stats bar */}
      {results.length > 0 && (
        <div class="flex flex-wrap gap-4 rounded-lg border border-border bg-surface px-4 py-3">
          <span class="text-xs text-text-muted">
            <span class="font-semibold text-accent">{results.length}</span> rule{results.length !== 1 ? 's' : ''} parsed
          </span>
          <span class="text-xs text-text-muted">
            <span class="font-semibold text-green-400">{totalConverted}</span> propert{totalConverted !== 1 ? 'ies' : 'y'} converted
          </span>
          {totalUnconverted > 0 && (
            <span class="text-xs text-text-muted">
              <span class="font-semibold text-yellow-400">{totalUnconverted}</span> not converted
            </span>
          )}
        </div>
      )}

      {/* Input */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-3 text-sm font-semibold text-text-muted uppercase tracking-wide">CSS Input</h2>
        <textarea
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
          rows={14}
          spellcheck={false}
          placeholder=".myClass { display: flex; padding: 16px; }"
          class="w-full resize-y rounded border border-border bg-bg px-3 py-2 font-mono text-xs text-text-muted focus:border-accent focus:outline-none"
        />
      </section>

      {/* Per-selector results */}
      {results.length > 0 && (
        <section class="rounded-lg border border-border bg-surface p-4 space-y-4">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Converted Classes</h2>
          {results.map((r, i) => (
            <div key={i} class="rounded border border-border bg-bg p-3 space-y-2">
              <div class="flex items-center justify-between gap-2">
                <code class="text-xs text-accent font-semibold">{r.selector}</code>
                <button
                  onClick={() => handleCopyClasses(r.classes, r.selector)}
                  class="rounded border border-border bg-surface px-2 py-0.5 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
                >
                  {copiedClasses === r.selector ? 'Copied!' : 'Copy classes'}
                </button>
              </div>
              {r.classes.length > 0 ? (
                <div class="flex flex-wrap gap-1">
                  {r.classes.map((cls, j) => (
                    <span
                      key={j}
                      class="rounded bg-accent/10 px-2 py-0.5 font-mono text-xs text-accent"
                    >
                      {cls}
                    </span>
                  ))}
                </div>
              ) : (
                <p class="text-xs text-text-muted italic">No convertible properties</p>
              )}
              {r.unconverted.length > 0 && (
                <div class="mt-2 rounded border border-yellow-800/40 bg-yellow-950/20 p-2">
                  <p class="mb-1 text-xs font-semibold text-yellow-400">Not converted:</p>
                  <div class="space-y-0.5">
                    {r.unconverted.map((u, k) => (
                      <p key={k} class="font-mono text-xs text-yellow-300/70">{u}</p>
                    ))}
                  </div>
                </div>
              )}

              {/* React Native component example */}
              {r.classes.length > 0 && (
                <div class="mt-2 rounded border border-border bg-surface p-2">
                  <p class="mb-1 text-xs text-text-muted">React Native usage:</p>
                  <pre class="text-xs text-accent overflow-auto">
{`<View className="${r.classes.join(' ')}">
  {/* content */}
</View>`}
                  </pre>
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {/* Full output */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-semibold text-text-muted uppercase tracking-wide">Full Output</h2>
          <button
            onClick={handleCopy}
            class="rounded border border-border bg-bg px-3 py-1 text-xs text-text-muted hover:border-accent hover:text-accent transition-colors"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="overflow-auto rounded border border-border bg-bg p-4 text-xs text-accent leading-relaxed">
          {output}
        </pre>
      </section>

      {/* Legend */}
      <section class="rounded-lg border border-border bg-surface p-4">
        <h2 class="mb-2 text-sm font-semibold text-text-muted uppercase tracking-wide">Conversion Notes</h2>
        <ul class="space-y-1 text-xs text-text-muted">
          <li>• Spacing values snap to nearest Tailwind scale (0→px→0.5→1→2→4→6→8...)</li>
          <li>• Named colors (white/black/red/blue etc.) map to Tailwind equivalents</li>
          <li>• Hex colors #fff / #000 convert; other hex values are marked as not converted</li>
          <li>• NativeWind v4 uses className prop on React Native core components (View, Text, etc.)</li>
          <li>• Complex values like gradients, box-shadow, and transforms are not supported</li>
        </ul>
      </section>
    </div>
  );
}
