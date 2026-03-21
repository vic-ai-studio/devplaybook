import { useState, useMemo } from 'preact/hooks';

type JustifyItems = 'start' | 'end' | 'center' | 'stretch';
type AlignItems = 'start' | 'end' | 'center' | 'stretch';
type JustifyContent = 'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly';
type AlignContent = 'start' | 'end' | 'center' | 'stretch' | 'space-around' | 'space-between' | 'space-evenly';

interface GridItem {
  id: number;
  colStart: string;
  colEnd: string;
  rowStart: string;
  rowEnd: string;
  justifySelf: 'auto' | JustifyItems;
  alignSelf: 'auto' | AlignItems;
}

const ITEM_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#06b6d4',
];

let nextId = 1;
function makeItem(): GridItem {
  return { id: nextId++, colStart: 'auto', colEnd: 'auto', rowStart: 'auto', rowEnd: 'auto', justifySelf: 'auto', alignSelf: 'auto' };
}

const SELECT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';
const INPUT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';

function Lbl({ label, children }: { label: string; children: preact.ComponentChildren }) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <Lbl label={label}>
      <select class={SELECT_CLASS} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </Lbl>
  );
}

export default function CssGrid() {
  const [cols, setCols] = useState('repeat(3, 1fr)');
  const [rows, setRows] = useState('repeat(2, 120px)');
  const [colGap, setColGap] = useState('16px');
  const [rowGap, setRowGap] = useState('16px');
  const [justifyItems, setJustifyItems] = useState<JustifyItems>('stretch');
  const [alignItems, setAlignItems] = useState<AlignItems>('stretch');
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('start');
  const [alignContent, setAlignContent] = useState<AlignContent>('start');
  const [items, setItems] = useState<GridItem[]>([makeItem(), makeItem(), makeItem(), makeItem(), makeItem(), makeItem()]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const selected = items.find(i => i.id === selectedId) ?? null;

  function updateSelected(patch: Partial<GridItem>) {
    if (!selectedId) return;
    setItems(items.map(i => i.id === selectedId ? { ...i, ...patch } : i));
  }

  const containerCss = useMemo(() => {
    const lines: string[] = [
      'display: grid;',
      `grid-template-columns: ${cols};`,
      `grid-template-rows: ${rows};`,
      `column-gap: ${colGap};`,
      `row-gap: ${rowGap};`,
    ];
    if (justifyItems !== 'stretch') lines.push(`justify-items: ${justifyItems};`);
    if (alignItems !== 'stretch') lines.push(`align-items: ${alignItems};`);
    if (justifyContent !== 'start') lines.push(`justify-content: ${justifyContent};`);
    if (alignContent !== 'start') lines.push(`align-content: ${alignContent};`);
    return `.container {\n  ${lines.join('\n  ')}\n}`;
  }, [cols, rows, colGap, rowGap, justifyItems, alignItems, justifyContent, alignContent]);

  const itemsCss = useMemo(() => {
    return items.map((item, i) => {
      const lines: string[] = [];
      if (item.colStart !== 'auto') lines.push(`grid-column-start: ${item.colStart};`);
      if (item.colEnd !== 'auto') lines.push(`grid-column-end: ${item.colEnd};`);
      if (item.rowStart !== 'auto') lines.push(`grid-row-start: ${item.rowStart};`);
      if (item.rowEnd !== 'auto') lines.push(`grid-row-end: ${item.rowEnd};`);
      if (item.justifySelf !== 'auto') lines.push(`justify-self: ${item.justifySelf};`);
      if (item.alignSelf !== 'auto') lines.push(`align-self: ${item.alignSelf};`);
      if (!lines.length) return null;
      return `.item-${i + 1} {\n  ${lines.join('\n  ')}\n}`;
    }).filter(Boolean).join('\n\n');
  }, [items]);

  const fullCss = [containerCss, itemsCss].filter(Boolean).join('\n\n');

  async function copy() {
    await navigator.clipboard.writeText(fullCss);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // Build preview style
  const previewStyle = {
    display: 'grid',
    gridTemplateColumns: cols,
    gridTemplateRows: rows,
    columnGap: colGap,
    rowGap: rowGap,
    justifyItems,
    alignItems,
    justifyContent,
    alignContent,
    minHeight: '200px',
    padding: '16px',
    background: 'var(--color-bg-card, #1a1a2e)',
    border: '1px solid var(--color-border, #333)',
    borderRadius: '8px',
  };

  return (
    <div class="space-y-6">
      {/* Grid container settings */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Container Properties</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Lbl label="grid-template-columns">
            <input class={INPUT_CLASS} value={cols} onInput={(e) => setCols((e.target as HTMLInputElement).value)} />
          </Lbl>
          <Lbl label="grid-template-rows">
            <input class={INPUT_CLASS} value={rows} onInput={(e) => setRows((e.target as HTMLInputElement).value)} />
          </Lbl>
          <Lbl label="column-gap">
            <input class={INPUT_CLASS} value={colGap} onInput={(e) => setColGap((e.target as HTMLInputElement).value)} />
          </Lbl>
          <Lbl label="row-gap">
            <input class={INPUT_CLASS} value={rowGap} onInput={(e) => setRowGap((e.target as HTMLInputElement).value)} />
          </Lbl>
          <Sel label="justify-items" value={justifyItems} onChange={(v) => setJustifyItems(v as JustifyItems)}
            options={['stretch', 'start', 'end', 'center']} />
          <Sel label="align-items" value={alignItems} onChange={(v) => setAlignItems(v as AlignItems)}
            options={['stretch', 'start', 'end', 'center']} />
          <Sel label="justify-content" value={justifyContent} onChange={(v) => setJustifyContent(v as JustifyContent)}
            options={['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly']} />
          <Sel label="align-content" value={alignContent} onChange={(v) => setAlignContent(v as AlignContent)}
            options={['start', 'end', 'center', 'stretch', 'space-around', 'space-between', 'space-evenly']} />
        </div>

        <div class="flex gap-2 mt-4 flex-wrap">
          <span class="text-xs text-text-muted self-center">Presets:</span>
          {[
            { label: '3-col equal', cols: 'repeat(3, 1fr)', rows: 'repeat(2, 120px)' },
            { label: '12-col grid', cols: 'repeat(12, 1fr)', rows: 'auto' },
            { label: 'Holy Grail', cols: '200px 1fr 200px', rows: 'auto 1fr auto' },
            { label: '2-col sidebar', cols: '280px 1fr', rows: 'auto' },
            { label: 'Masonry-ish', cols: 'repeat(auto-fill, minmax(200px, 1fr))', rows: 'auto' },
          ].map(p => (
            <button key={p.label}
              onClick={() => { setCols(p.cols); setRows(p.rows); }}
              class="text-xs bg-primary/10 border border-primary/30 hover:border-primary text-primary px-3 py-1.5 rounded-full transition-colors">
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Live Preview</h2>
          <div class="flex gap-2">
            <button onClick={() => setItems([...items, makeItem()])}
              class="text-xs bg-primary/10 border border-primary/30 hover:border-primary text-primary px-3 py-1.5 rounded-full transition-colors">
              + Add Item
            </button>
            {items.length > 1 && (
              <button onClick={() => { setItems(items.slice(0, -1)); if (selectedId === items[items.length - 1]?.id) setSelectedId(null); }}
                class="text-xs bg-red-500/10 border border-red-500/30 hover:border-red-500 text-red-400 px-3 py-1.5 rounded-full transition-colors">
                − Remove
              </button>
            )}
          </div>
        </div>
        <div style={previewStyle}>
          {items.map((item, i) => {
            const isSelected = item.id === selectedId;
            const itemStyle: Record<string, string> = {
              background: ITEM_COLORS[i % ITEM_COLORS.length] + '33',
              border: `2px solid ${ITEM_COLORS[i % ITEM_COLORS.length]}${isSelected ? '' : '88'}`,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '60px',
              cursor: 'pointer',
              outline: isSelected ? `2px solid ${ITEM_COLORS[i % ITEM_COLORS.length]}` : 'none',
              outlineOffset: '2px',
            };
            if (item.colStart !== 'auto') itemStyle.gridColumnStart = item.colStart;
            if (item.colEnd !== 'auto') itemStyle.gridColumnEnd = item.colEnd;
            if (item.rowStart !== 'auto') itemStyle.gridRowStart = item.rowStart;
            if (item.rowEnd !== 'auto') itemStyle.gridRowEnd = item.rowEnd;
            if (item.justifySelf !== 'auto') itemStyle.justifySelf = item.justifySelf;
            if (item.alignSelf !== 'auto') itemStyle.alignSelf = item.alignSelf;
            return (
              <div key={item.id} style={itemStyle} onClick={() => setSelectedId(isSelected ? null : item.id)}>
                <span class="text-xs font-mono font-bold" style={{ color: ITEM_COLORS[i % ITEM_COLORS.length] }}>
                  Item {i + 1}
                </span>
              </div>
            );
          })}
        </div>
        <p class="text-xs text-text-muted mt-2">Click an item to edit its placement properties.</p>
      </div>

      {/* Item editor */}
      {selected && (
        <div class="bg-bg-card border border-primary/50 rounded-xl p-5">
          <h2 class="text-base font-semibold mb-4">
            Item {items.findIndex(i => i.id === selectedId) + 1} Properties
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Lbl label="grid-column-start">
              <input class={INPUT_CLASS} value={selected.colStart}
                onInput={(e) => updateSelected({ colStart: (e.target as HTMLInputElement).value })} />
            </Lbl>
            <Lbl label="grid-column-end">
              <input class={INPUT_CLASS} value={selected.colEnd}
                onInput={(e) => updateSelected({ colEnd: (e.target as HTMLInputElement).value })} />
            </Lbl>
            <Lbl label="grid-row-start">
              <input class={INPUT_CLASS} value={selected.rowStart}
                onInput={(e) => updateSelected({ rowStart: (e.target as HTMLInputElement).value })} />
            </Lbl>
            <Lbl label="grid-row-end">
              <input class={INPUT_CLASS} value={selected.rowEnd}
                onInput={(e) => updateSelected({ rowEnd: (e.target as HTMLInputElement).value })} />
            </Lbl>
            <Sel label="justify-self" value={selected.justifySelf}
              onChange={(v) => updateSelected({ justifySelf: v as GridItem['justifySelf'] })}
              options={['auto', 'start', 'end', 'center', 'stretch']} />
            <Sel label="align-self" value={selected.alignSelf}
              onChange={(v) => updateSelected({ alignSelf: v as GridItem['alignSelf'] })}
              options={['auto', 'start', 'end', 'center', 'stretch']} />
          </div>
          <div class="flex gap-2 mt-3 flex-wrap">
            <span class="text-xs text-text-muted self-center">Quick span:</span>
            <button onClick={() => updateSelected({ colStart: 'auto', colEnd: 'span 2' })}
              class="text-xs bg-bg border border-border hover:border-primary px-3 py-1 rounded-full">col span 2</button>
            <button onClick={() => updateSelected({ colStart: 'auto', colEnd: 'span 3' })}
              class="text-xs bg-bg border border-border hover:border-primary px-3 py-1 rounded-full">col span 3</button>
            <button onClick={() => updateSelected({ rowStart: 'auto', rowEnd: 'span 2' })}
              class="text-xs bg-bg border border-border hover:border-primary px-3 py-1 rounded-full">row span 2</button>
            <button onClick={() => updateSelected({ colStart: '1', colEnd: '-1' })}
              class="text-xs bg-bg border border-border hover:border-primary px-3 py-1 rounded-full">full width</button>
          </div>
        </div>
      )}

      {/* CSS output */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-base font-semibold">Generated CSS</h2>
          <button onClick={copy}
            class="text-sm bg-primary hover:bg-primary/80 text-white px-4 py-1.5 rounded-lg transition-colors">
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="bg-bg text-green-400 text-sm rounded-lg p-4 overflow-x-auto font-mono whitespace-pre-wrap">{fullCss}</pre>
      </div>

      {/* Reference */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">CSS Grid Quick Reference</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          {[
            { val: 'repeat(3, 1fr)', desc: 'Three equal columns' },
            { val: 'repeat(auto-fill, minmax(200px, 1fr))', desc: 'Responsive auto-fill columns' },
            { val: '200px 1fr 200px', desc: 'Sidebar layout' },
            { val: 'repeat(12, 1fr)', desc: '12-column Bootstrap-style grid' },
            { val: 'minmax(100px, auto)', desc: 'Min 100px, grows with content' },
            { val: 'fit-content(300px)', desc: 'Fits content up to 300px' },
          ].map(r => (
            <div key={r.val} class="bg-bg rounded-lg p-3">
              <code class="text-primary text-xs font-mono">{r.val}</code>
              <p class="text-text-muted text-xs mt-1">{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
