import { useState, useMemo } from 'preact/hooks';

type ConditionType = 'min-width' | 'max-width' | 'min-height' | 'max-height';
type ContainerType = 'inline-size' | 'size' | 'style';

interface Breakpoint {
  id: number;
  condition: ConditionType;
  value: string;
  cssProps: string;
}

let nextId = 3;

const DEFAULT_BREAKPOINTS: Breakpoint[] = [
  {
    id: 1,
    condition: 'min-width',
    value: '400px',
    cssProps: `.card {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 1rem;\n}`,
  },
  {
    id: 2,
    condition: 'max-width',
    value: '300px',
    cssProps: `.card {\n  flex-direction: column;\n  padding: 0.5rem;\n}`,
  },
];

function generateCSS(
  containerName: string,
  containerType: ContainerType,
  selectorClass: string,
  breakpoints: Breakpoint[]
): string {
  const lines: string[] = [];

  // Container declaration
  const selector = selectorClass.trim() || '.container';
  lines.push(`${selector} {`);
  lines.push(`  container-type: ${containerType};`);
  if (containerName.trim()) {
    lines.push(`  container-name: ${containerName.trim()};`);
  }
  lines.push(`}`);

  // Breakpoints
  for (const bp of breakpoints) {
    if (!bp.value.trim() && !bp.cssProps.trim()) continue;
    lines.push('');
    const nameSegment = containerName.trim() ? `${containerName.trim()} ` : '';
    lines.push(`@container ${nameSegment}(${bp.condition}: ${bp.value.trim() || '0px'}) {`);
    if (bp.cssProps.trim()) {
      const indented = bp.cssProps
        .trim()
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n');
      lines.push(indented);
    }
    lines.push(`}`);
  }

  return lines.join('\n');
}

export default function CssContainerQueryBuilder() {
  const [containerName, setContainerName] = useState('sidebar');
  const [containerType, setContainerType] = useState<ContainerType>('inline-size');
  const [selectorClass, setSelectorClass] = useState('.container');
  const [breakpoints, setBreakpoints] = useState<Breakpoint[]>(DEFAULT_BREAKPOINTS);
  const [copied, setCopied] = useState(false);

  const css = useMemo(
    () => generateCSS(containerName, containerType, selectorClass, breakpoints),
    [containerName, containerType, selectorClass, breakpoints]
  );

  function addBreakpoint() {
    setBreakpoints((prev) => [
      ...prev,
      {
        id: nextId++,
        condition: 'min-width',
        value: '',
        cssProps: '',
      },
    ]);
  }

  function removeBreakpoint(id: number) {
    setBreakpoints((prev) => prev.filter((bp) => bp.id !== id));
  }

  function updateBreakpoint<K extends keyof Breakpoint>(id: number, key: K, value: Breakpoint[K]) {
    setBreakpoints((prev) =>
      prev.map((bp) => (bp.id === id ? { ...bp, [key]: value } : bp))
    );
  }

  async function copyCSS() {
    try {
      await navigator.clipboard.writeText(css);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback — select all in the pre block
    }
  }

  return (
    <div class="space-y-6">
      {/* Container Setup */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Container Setup</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label class="block text-xs text-text-muted mb-1">
              Selector Class
            </label>
            <input
              type="text"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              value={selectorClass}
              onInput={(e) => setSelectorClass((e.target as HTMLInputElement).value)}
              placeholder=".container"
            />
            <p class="text-xs text-text-muted mt-1">CSS selector for the container element</p>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">
              Container Name <span class="text-text-muted/60">(optional)</span>
            </label>
            <input
              type="text"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
              value={containerName}
              onInput={(e) => setContainerName((e.target as HTMLInputElement).value)}
              placeholder="sidebar"
            />
            <p class="text-xs text-text-muted mt-1">Leave empty for unnamed container</p>
          </div>
          <div>
            <label class="block text-xs text-text-muted mb-1">Container Type</label>
            <select
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
              value={containerType}
              onChange={(e) => setContainerType((e.target as HTMLSelectElement).value as ContainerType)}
            >
              <option value="inline-size">inline-size (recommended)</option>
              <option value="size">size</option>
              <option value="style">style</option>
            </select>
            <p class="text-xs text-text-muted mt-1">
              {containerType === 'inline-size' && 'Queries based on inline axis width'}
              {containerType === 'size' && 'Queries based on both width and height'}
              {containerType === 'style' && 'Queries based on computed style values'}
            </p>
          </div>
        </div>
      </div>

      {/* Breakpoints */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-base font-semibold">Query Breakpoints</h2>
          <button
            onClick={addBreakpoint}
            class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            + Add Breakpoint
          </button>
        </div>

        {breakpoints.length === 0 && (
          <p class="text-sm text-text-muted text-center py-6">
            No breakpoints yet. Click "Add Breakpoint" to start building your container query.
          </p>
        )}

        <div class="space-y-4">
          {breakpoints.map((bp, index) => (
            <div
              key={bp.id}
              class="border border-border rounded-lg p-4 bg-bg space-y-3"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-text-muted uppercase tracking-wider">
                  Breakpoint {index + 1}
                </span>
                <button
                  onClick={() => removeBreakpoint(bp.id)}
                  class="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded hover:bg-red-500/10"
                >
                  Remove
                </button>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs text-text-muted mb-1">Condition</label>
                  <select
                    class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary focus:outline-none"
                    value={bp.condition}
                    onChange={(e) =>
                      updateBreakpoint(bp.id, 'condition', (e.target as HTMLSelectElement).value as ConditionType)
                    }
                  >
                    <option value="min-width">min-width</option>
                    <option value="max-width">max-width</option>
                    <option value="min-height">min-height</option>
                    <option value="max-height">max-height</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs text-text-muted mb-1">Value</label>
                  <input
                    type="text"
                    class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none"
                    value={bp.value}
                    onInput={(e) =>
                      updateBreakpoint(bp.id, 'value', (e.target as HTMLInputElement).value)
                    }
                    placeholder="400px"
                  />
                </div>
              </div>

              <div>
                <label class="block text-xs text-text-muted mb-1">
                  CSS Properties to Apply
                </label>
                <textarea
                  class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-primary focus:outline-none resize-y min-h-[100px]"
                  value={bp.cssProps}
                  onInput={(e) =>
                    updateBreakpoint(bp.id, 'cssProps', (e.target as HTMLTextAreaElement).value)
                  }
                  placeholder={`.card {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n}`}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Generated CSS Preview */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <div class="flex items-center justify-between mb-4">
          <div>
            <h2 class="text-base font-semibold">Generated CSS</h2>
            <p class="text-xs text-text-muted mt-0.5">Copy and paste into your stylesheet</p>
          </div>
          <button
            onClick={copyCSS}
            class={`text-sm px-4 py-2 rounded font-medium transition-colors ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-accent hover:bg-accent-hover text-white'
            }`}
          >
            {copied ? 'Copied!' : 'Copy CSS'}
          </button>
        </div>
        <pre
          class="bg-bg rounded-lg p-4 overflow-x-auto text-sm font-mono text-text leading-relaxed whitespace-pre border border-border"
          style="tab-size: 2;"
        >
          <code>{css}</code>
        </pre>
      </div>

      {/* How to Use */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-3">How to Use Container Queries</h2>
        <div class="space-y-3 text-sm text-text-muted">
          <div class="flex gap-3">
            <span class="text-accent font-bold shrink-0">1.</span>
            <span>
              Apply <code class="bg-bg px-1.5 py-0.5 rounded font-mono text-xs text-text">container-type</code> and optionally{' '}
              <code class="bg-bg px-1.5 py-0.5 rounded font-mono text-xs text-text">container-name</code> to the parent element you want to query.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-accent font-bold shrink-0">2.</span>
            <span>
              Use <code class="bg-bg px-1.5 py-0.5 rounded font-mono text-xs text-text">@container</code> with your condition to style child elements based on the container's size — not the viewport.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-accent font-bold shrink-0">3.</span>
            <span>
              Named containers let you target a specific ancestor when multiple containers are nested. Unnamed containers match the nearest container ancestor.
            </span>
          </div>
          <div class="flex gap-3">
            <span class="text-accent font-bold shrink-0">4.</span>
            <span>
              Browser support: Chrome 105+, Firefox 110+, Safari 16+. Use{' '}
              <code class="bg-bg px-1.5 py-0.5 rounded font-mono text-xs text-text">@supports (container-type: inline-size)</code> for progressive enhancement.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
