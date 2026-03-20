import { useState, useMemo } from 'preact/hooks';

type FlexDirection = 'row' | 'row-reverse' | 'column' | 'column-reverse';
type FlexWrap = 'nowrap' | 'wrap' | 'wrap-reverse';
type JustifyContent = 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly';
type AlignItems = 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';
type AlignContent = 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around';
type AlignSelf = 'auto' | 'stretch' | 'flex-start' | 'flex-end' | 'center' | 'baseline';

interface FlexItem {
  id: number;
  flexGrow: number;
  flexShrink: number;
  flexBasis: string;
  alignSelf: AlignSelf;
}

const COLORS = [
  'bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-yellow-500',
  'bg-red-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500',
];

let nextId = 1;

function makeItem(): FlexItem {
  return { id: nextId++, flexGrow: 0, flexShrink: 1, flexBasis: 'auto', alignSelf: 'auto' };
}

const SELECT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';
const INPUT_CLASS  = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent w-full';

function LabeledSelect({ label, value, onChange, options }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div>
      <label class="block text-xs text-text-muted mb-1">{label}</label>
      <select class={SELECT_CLASS} value={value} onChange={(e) => onChange((e.target as HTMLSelectElement).value)}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function CssFlexbox() {
  const [flexDirection, setFlexDirection]   = useState<FlexDirection>('row');
  const [flexWrap, setFlexWrap]             = useState<FlexWrap>('nowrap');
  const [justifyContent, setJustifyContent] = useState<JustifyContent>('flex-start');
  const [alignItems, setAlignItems]         = useState<AlignItems>('stretch');
  const [alignContent, setAlignContent]     = useState<AlignContent>('stretch');
  const [items, setItems]                   = useState<FlexItem[]>([makeItem(), makeItem(), makeItem()]);
  const [selectedId, setSelectedId]         = useState<number | null>(null);
  const [copied, setCopied]                 = useState(false);

  const selectedItem = items.find(i => i.id === selectedId) ?? null;

  function addItem() {
    if (items.length >= 8) return;
    setItems(prev => [...prev, makeItem()]);
  }

  function removeItem(id: number) {
    setItems(prev => prev.filter(i => i.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function updateItem(id: number, patch: Partial<FlexItem>) {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  }

  const containerStyle = {
    display: 'flex',
    flexDirection,
    flexWrap,
    justifyContent,
    alignItems,
    alignContent,
    minHeight: '180px',
    gap: '8px',
  } as Record<string, string>;

  const generatedCss = useMemo(() => {
    const containerCss =
`.container {
  display: flex;
  flex-direction: ${flexDirection};
  flex-wrap: ${flexWrap};
  justify-content: ${justifyContent};
  align-items: ${alignItems};
  align-content: ${alignContent};
  gap: 8px;
}`;

    const itemsCss = items.map((item, idx) => {
      const parts: string[] = [];
      if (item.flexGrow !== 0)     parts.push(`  flex-grow: ${item.flexGrow};`);
      if (item.flexShrink !== 1)   parts.push(`  flex-shrink: ${item.flexShrink};`);
      if (item.flexBasis !== 'auto') parts.push(`  flex-basis: ${item.flexBasis};`);
      if (item.alignSelf !== 'auto') parts.push(`  align-self: ${item.alignSelf};`);
      if (parts.length === 0) return null;
      return `.item-${idx + 1} {\n${parts.join('\n')}\n}`;
    }).filter(Boolean);

    return [containerCss, ...itemsCss].join('\n\n');
  }, [flexDirection, flexWrap, justifyContent, alignItems, alignContent, items]);

  async function copyCSS() {
    try {
      await navigator.clipboard.writeText(generatedCss);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div class="space-y-6">
      {/* Container Controls */}
      <div class="bg-bg-card rounded-xl p-6 border border-border">
        <h2 class="text-lg font-semibold mb-4">Container Properties</h2>
        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <LabeledSelect
            label="flex-direction"
            value={flexDirection}
            onChange={v => setFlexDirection(v as FlexDirection)}
            options={['row', 'row-reverse', 'column', 'column-reverse']}
          />
          <LabeledSelect
            label="flex-wrap"
            value={flexWrap}
            onChange={v => setFlexWrap(v as FlexWrap)}
            options={['nowrap', 'wrap', 'wrap-reverse']}
          />
          <LabeledSelect
            label="justify-content"
            value={justifyContent}
            onChange={v => setJustifyContent(v as JustifyContent)}
            options={['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly']}
          />
          <LabeledSelect
            label="align-items"
            value={alignItems}
            onChange={v => setAlignItems(v as AlignItems)}
            options={['stretch', 'flex-start', 'flex-end', 'center', 'baseline']}
          />
          <LabeledSelect
            label="align-content"
            value={alignContent}
            onChange={v => setAlignContent(v as AlignContent)}
            options={['stretch', 'flex-start', 'flex-end', 'center', 'space-between', 'space-around']}
          />
        </div>
      </div>

      {/* Preview */}
      <div class="bg-bg-card rounded-xl p-6 border border-border">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold">Live Preview</h2>
          <div class="flex gap-2">
            <button
              onClick={addItem}
              disabled={items.length >= 8}
              class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              + Add Item
            </button>
          </div>
        </div>

        <div
          class="border-2 border-dashed border-border rounded-lg p-4 overflow-auto"
          style={containerStyle}
        >
          {items.map((item, idx) => {
            const itemStyle: Record<string, string | number> = {
              flexGrow: item.flexGrow,
              flexShrink: item.flexShrink,
              flexBasis: item.flexBasis,
              alignSelf: item.alignSelf,
              minWidth: '48px',
              minHeight: '48px',
            };
            const isSelected = selectedId === item.id;
            return (
              <div
                key={item.id}
                style={itemStyle}
                onClick={() => setSelectedId(isSelected ? null : item.id)}
                class={`${COLORS[idx % COLORS.length]} rounded-lg flex flex-col items-center justify-center text-white text-xs font-bold cursor-pointer select-none transition-all ${isSelected ? 'ring-4 ring-white ring-offset-2' : 'hover:opacity-80'} relative`}
              >
                <span>{idx + 1}</span>
                {isSelected && (
                  <button
                    onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
                    class="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-white text-xs leading-none hover:bg-red-600"
                    title="Remove item"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
        <p class="text-xs text-text-muted mt-2">Click an item to select it and edit its properties. Click × to remove.</p>
      </div>

      {/* Per-Item Controls */}
      {selectedItem && (
        <div class="bg-bg-card rounded-xl p-6 border border-border">
          <h2 class="text-lg font-semibold mb-4">
            Item {items.findIndex(i => i.id === selectedItem.id) + 1} Properties
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label class="block text-xs text-text-muted mb-1">flex-grow</label>
              <input
                type="number"
                min={0}
                max={10}
                class={INPUT_CLASS}
                value={selectedItem.flexGrow}
                onInput={(e) => updateItem(selectedItem.id, { flexGrow: Number((e.target as HTMLInputElement).value) })}
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">flex-shrink</label>
              <input
                type="number"
                min={0}
                max={10}
                class={INPUT_CLASS}
                value={selectedItem.flexShrink}
                onInput={(e) => updateItem(selectedItem.id, { flexShrink: Number((e.target as HTMLInputElement).value) })}
              />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">flex-basis</label>
              <input
                type="text"
                class={INPUT_CLASS}
                value={selectedItem.flexBasis}
                placeholder="auto / 100px / 20%"
                onInput={(e) => updateItem(selectedItem.id, { flexBasis: (e.target as HTMLInputElement).value })}
              />
            </div>
            <LabeledSelect
              label="align-self"
              value={selectedItem.alignSelf}
              onChange={v => updateItem(selectedItem.id, { alignSelf: v as AlignSelf })}
              options={['auto', 'stretch', 'flex-start', 'flex-end', 'center', 'baseline']}
            />
          </div>
        </div>
      )}

      {/* Generated CSS */}
      <div class="bg-bg-card rounded-xl p-6 border border-border">
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-lg font-semibold">Generated CSS</h2>
          <button
            onClick={copyCSS}
            class="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            {copied ? 'Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre class="bg-black/30 rounded-lg p-4 text-sm font-mono text-green-400 overflow-x-auto whitespace-pre">{generatedCss}</pre>
      </div>
    </div>
  );
}
