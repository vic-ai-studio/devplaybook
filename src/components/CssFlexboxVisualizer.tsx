import { useState, useMemo } from 'preact/hooks';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
type AlignItems = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';
type AlignContent = 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'space-between' | 'space-around';
type AlignSelf = 'auto' | 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline';

interface FlexItem {
  id: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: AlignSelf;
  order: number;
}

const ITEM_COLORS = [
  '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
  '#ef4444', '#ec4899', '#6366f1', '#14b8a6',
  '#f97316', '#06b6d4',
];

let nextId = 1;
function makeItem(): FlexItem {
  return { id: nextId++, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto', order: 0 };
}

const SELECT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';
const INPUT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';
const BTN = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';

function Lbl({ label, children }: { label: string; children: any }) {
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

export default function CssFlexboxVisualizer() {
  const [items, setItems] = useState<FlexItem[]>([makeItem(), makeItem(), makeItem()]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  // Container props
  const [flexDirection, setFlexDirection] = useState<FlexDirection>('row');
  const [flexWrap, setFlexWrap] = useState<FlexWrap>('nowrap');
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('flex-start');
  const [alignItems, setAlignItems] = useState<AlignItems>('stretch');
  const [alignContent, setAlignContent] = useState<AlignContent>('stretch');
  const [gap, setGap] = useState('8');

  const selected = items.find(i => i.id === selectedId) ?? null;

  function updateItem(id: number, patch: Partial<FlexItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  function addItem() {
    if (items.length >= 10) return;
    const item = makeItem();
    setItems(prev => [...prev, item]);
    setSelectedId(item.id);
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  const containerCss = useMemo(() => {
    const lines = [
      'display: flex;',
      `flex-direction: ${flexDirection};`,
      `flex-wrap: ${flexWrap};`,
      `justify-content: ${justifyContent};`,
      `align-items: ${alignItems};`,
      ...(flexWrap !== 'nowrap' ? [`align-content: ${alignContent};`] : []),
      `gap: ${gap}px;`,
    ];
    return lines;
  }, [flexDirection, flexWrap, justifyContent, alignItems, alignContent, gap]);

  const fullCss = useMemo(() => {
    let css = `.container {\n${containerCss.map(l => `  ${l}`).join('\n')}\n}`;
    items.forEach((item, i) => {
      const itemLines: string[] = [];
      if (item.order !== 0) itemLines.push(`order: ${item.order};`);
      if (item.flexGrow !== 0) itemLines.push(`flex-grow: ${item.flexGrow};`);
      if (item.flexShrink !== 1) itemLines.push(`flex-shrink: ${item.flexShrink};`);
      if (item.flexBasis !== 'auto') itemLines.push(`flex-basis: ${item.flexBasis};`);
      if (item.alignSelf !== 'auto') itemLines.push(`align-self: ${item.alignSelf};`);
      if (itemLines.length > 0) {
        css += `\n\n.item-${i + 1} {\n${itemLines.map(l => `  ${l}`).join('\n')}\n}`;
      }
    });
    return css;
  }, [containerCss, items]);

  function copyCSS() {
    navigator.clipboard.writeText(fullCss).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const containerStyle = {
    display: 'flex',
    flexDirection,
    flexWrap,
    justifyContent,
    alignItems,
    alignContent: flexWrap !== 'nowrap' ? alignContent : undefined,
    gap: `${gap}px`,
    minHeight: '160px',
    border: '2px dashed #4b5563',
    borderRadius: '8px',
    padding: '12px',
    background: '#111827',
  } as any;

  return (
    <div class="space-y-6">
      {/* Preview */}
      <div>
        <div class="text-xs text-text-muted mb-2 uppercase tracking-wide font-medium">Preview</div>
        <div style={containerStyle}>
          {items.map((item, i) => (
            <div
              key={item.id}
              onClick={() => setSelectedId(item.id === selectedId ? null : item.id)}
              style={{
                background: ITEM_COLORS[i % ITEM_COLORS.length],
                color: '#fff',
                borderRadius: '6px',
                padding: '12px 16px',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '14px',
                minWidth: '48px',
                textAlign: 'center',
                outline: item.id === selectedId ? '2px solid #fff' : 'none',
                outlineOffset: '2px',
                order: item.order,
                flexGrow: item.flexGrow,
                flexShrink: item.flexShrink,
                flexBasis: item.flexBasis !== 'auto' ? item.flexBasis : undefined,
                alignSelf: item.alignSelf !== 'auto' ? item.alignSelf : undefined,
              } as any}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <p class="text-xs text-text-muted mt-1">Click an item to edit its properties</p>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Container controls */}
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-sm font-semibold">Container</h3>
            <div class="flex gap-2">
              <button onClick={addItem} disabled={items.length >= 10}
                class={`${BTN} bg-primary/10 text-primary hover:bg-primary/20 disabled:opacity-50`}>
                + Add Item
              </button>
            </div>
          </div>
          <Sel label="flex-direction" value={flexDirection} onChange={(v) => setFlexDirection(v as FlexDirection)}
            options={['row', 'row-reverse', 'column', 'column-reverse']} />
          <Sel label="flex-wrap" value={flexWrap} onChange={(v) => setFlexWrap(v as FlexWrap)}
            options={['nowrap', 'wrap', 'wrap-reverse']} />
          <Sel label="justify-content" value={justifyContent} onChange={(v) => setJustifyContent(v as JustifyContent)}
            options={['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']} />
          <Sel label="align-items" value={alignItems} onChange={(v) => setAlignItems(v as AlignItems)}
            options={['flex-start', 'flex-end', 'center', 'stretch', 'baseline']} />
          {flexWrap !== 'nowrap' && (
            <Sel label="align-content" value={alignContent} onChange={(v) => setAlignContent(v as AlignContent)}
              options={['flex-start', 'flex-end', 'center', 'stretch', 'space-between', 'space-around']} />
          )}
          <Lbl label={`gap: ${gap}px`}>
            <input type="range" min="0" max="48" value={gap}
              onInput={(e) => setGap((e.target as HTMLInputElement).value)}
              class="w-full accent-primary" />
          </Lbl>
        </div>

        {/* Item controls */}
        <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
          <h3 class="text-sm font-semibold mb-2">
            {selected ? `Item ${items.indexOf(selected) + 1} Properties` : 'Item Properties'}
            {selected && (
              <span class="ml-2 text-xs text-text-muted">(click item in preview)</span>
            )}
          </h3>
          {!selected ? (
            <p class="text-sm text-text-muted">Click an item in the preview to edit its flex properties.</p>
          ) : (
            <>
              <Lbl label={`flex-grow: ${selected.flexGrow}`}>
                <input type="range" min="0" max="5" step="1" value={selected.flexGrow}
                  onInput={(e) => updateItem(selected.id, { flexGrow: Number((e.target as HTMLInputElement).value) })}
                  class="w-full accent-primary" />
              </Lbl>
              <Lbl label={`flex-shrink: ${selected.flexShrink}`}>
                <input type="range" min="0" max="5" step="1" value={selected.flexShrink}
                  onInput={(e) => updateItem(selected.id, { flexShrink: Number((e.target as HTMLInputElement).value) })}
                  class="w-full accent-primary" />
              </Lbl>
              <Lbl label="flex-basis">
                <input type="text" class={INPUT_CLASS} value={selected.flexBasis}
                  onInput={(e) => updateItem(selected.id, { flexBasis: (e.target as HTMLInputElement).value })}
                  placeholder="auto, 100px, 50%, etc." />
              </Lbl>
              <Sel label="align-self" value={selected.alignSelf}
                onChange={(v) => updateItem(selected.id, { alignSelf: v as AlignSelf })}
                options={['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline']} />
              <Lbl label={`order: ${selected.order}`}>
                <input type="range" min="-5" max="5" step="1" value={selected.order}
                  onInput={(e) => updateItem(selected.id, { order: Number((e.target as HTMLInputElement).value) })}
                  class="w-full accent-primary" />
              </Lbl>
              <button onClick={() => removeItem(selected.id)}
                class={`${BTN} bg-red-500/10 text-red-400 hover:bg-red-500/20 w-full`}>
                Remove Item
              </button>
            </>
          )}
        </div>
      </div>

      {/* Generated CSS */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-sm font-semibold">Generated CSS</h3>
          <button onClick={copyCSS}
            class={`${BTN} ${copied ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
            {copied ? '✓ Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="text-xs font-mono text-green-400 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{fullCss}</pre>
      </div>

      {/* Quick reference */}
      <div class="bg-bg-card border border-border rounded-xl p-4">
        <h3 class="text-sm font-semibold mb-3">Current Container CSS</h3>
        <div class="flex flex-wrap gap-2">
          {containerCss.map(line => (
            <code key={line} class="text-xs bg-black/30 text-primary px-2 py-1 rounded font-mono">{line}</code>
          ))}
        </div>
      </div>
    </div>
  );
}
