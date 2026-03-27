import { useState } from 'preact/hooks';

type Prop = { name: string; type: string; required: boolean; defaultVal: string };
type Emit = { name: string; payload: string };
type Composable = { name: string; from: string };

function generateVueComponent(
  componentName: string,
  useTs: boolean,
  props: Prop[],
  emits: Emit[],
  composables: Composable[],
  useProvide: boolean,
  useWatcher: boolean,
): string {
  const validProps = props.filter(p => p.name.trim());
  const validEmits = emits.filter(e => e.name.trim());
  const validComposables = composables.filter(c => c.name.trim() && c.from.trim());

  const lines: string[] = [];

  // script setup
  lines.push(`<script setup${useTs ? ' lang="ts"' : ''}>`);

  if (validComposables.length > 0) {
    validComposables.forEach(c => {
      lines.push(`import { ${c.name} } from '${c.from}';`);
    });
  }

  if (useProvide) {
    lines.push("import { provide, inject, ref, computed, watch } from 'vue';");
  } else if (useWatcher) {
    lines.push("import { ref, computed, watch } from 'vue';");
  } else {
    lines.push("import { ref, computed } from 'vue';");
  }

  // Props
  if (validProps.length > 0) {
    lines.push('');
    if (useTs) {
      lines.push('interface Props {');
      validProps.forEach(p => {
        const q = p.required ? '' : '?';
        lines.push(`  ${p.name}${q}: ${p.type || 'string'};`);
      });
      lines.push('}');
      lines.push('');
      const withDefaults = validProps.some(p => p.defaultVal);
      if (withDefaults) {
        lines.push('const props = withDefaults(defineProps<Props>(), {');
        validProps.filter(p => p.defaultVal).forEach(p => {
          lines.push(`  ${p.name}: ${p.defaultVal},`);
        });
        lines.push('});');
      } else {
        lines.push('const props = defineProps<Props>();');
      }
    } else {
      lines.push('const props = defineProps({');
      validProps.forEach(p => {
        const req = p.required ? ', required: true' : '';
        const def = p.defaultVal ? `, default: ${p.defaultVal}` : '';
        lines.push(`  ${p.name}: { type: ${mapVueType(p.type)}${req}${def} },`);
      });
      lines.push('});');
    }
  }

  // Emits
  if (validEmits.length > 0) {
    lines.push('');
    if (useTs) {
      lines.push('const emit = defineEmits<{');
      validEmits.forEach(e => {
        lines.push(`  ${e.name}: [payload: ${e.payload || 'string'}];`);
      });
      lines.push('}>();');
    } else {
      lines.push(`const emit = defineEmits([${validEmits.map(e => `'${e.name}'`).join(', ')}]);`);
    }
  }

  // State
  lines.push('');
  lines.push('// Reactive state');
  lines.push('const count = ref(0);');
  if (validProps.length > 0) {
    lines.push(`const doubled = computed(() => count.value * 2);`);
  }

  // Composables usage
  if (validComposables.length > 0) {
    lines.push('');
    lines.push('// Composables');
    validComposables.forEach(c => {
      lines.push(`const { /* destructure ${c.name} return */ } = ${c.name}();`);
    });
  }

  // Provide/Inject
  if (useProvide) {
    lines.push('');
    lines.push('// Provide to descendants');
    lines.push("provide('count', count);");
  }

  // Watcher
  if (useWatcher) {
    lines.push('');
    lines.push('// Watcher');
    lines.push('watch(count, (newVal, oldVal) => {');
    lines.push('  console.log(`count changed: ${oldVal} -> ${newVal}`);');
    lines.push('});');
  }

  // Methods
  lines.push('');
  lines.push('// Methods');
  lines.push('function increment() {');
  lines.push('  count.value++;');
  if (validEmits.length > 0) {
    lines.push(`  emit('${validEmits[0].name}', ${validEmits[0].payload === 'number' ? 'count.value' : `'event payload'`});`);
  }
  lines.push('}');

  lines.push('</script>');
  lines.push('');

  // Template
  lines.push('<template>');
  lines.push(`  <div class="${camelToKebab(componentName)}">`);
  if (validProps.length > 0) {
    lines.push(`    <p>{{ props.${validProps[0].name} }}</p>`);
  }
  lines.push('    <p>Count: {{ count }} | Doubled: {{ doubled }}</p>');
  lines.push('    <button @click="increment">Increment</button>');
  lines.push('  </div>');
  lines.push('</template>');
  lines.push('');

  // Style
  lines.push('<style scoped>');
  lines.push(`.${camelToKebab(componentName)} {`);
  lines.push('  padding: 1rem;');
  lines.push('}');
  lines.push('</style>');

  return lines.join('\n');
}

function mapVueType(ts: string): string {
  const map: Record<string, string> = {
    string: 'String', number: 'Number', boolean: 'Boolean',
    object: 'Object', array: 'Array', 'string[]': 'Array', 'number[]': 'Array',
  };
  return map[ts?.toLowerCase()] ?? 'String';
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, m => `-${m.toLowerCase()}`).replace(/^-/, '');
}

export default function VueComponentGenerator() {
  const [componentName, setComponentName] = useState('MyComponent');
  const [useTs, setUseTs] = useState(true);
  const [useProvide, setUseProvide] = useState(false);
  const [useWatcher, setUseWatcher] = useState(false);
  const [props, setProps] = useState<Prop[]>([
    { name: 'title', type: 'string', required: true, defaultVal: '' },
  ]);
  const [emits, setEmits] = useState<Emit[]>([{ name: 'update', payload: 'string' }]);
  const [composables, setComposables] = useState<Composable[]>([]);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const addProp = () => setProps([...props, { name: '', type: 'string', required: false, defaultVal: '' }]);
  const removeProp = (i: number) => setProps(props.filter((_, idx) => idx !== i));
  const updateProp = (i: number, field: keyof Prop, val: string | boolean) => {
    const next = [...props];
    (next[i] as any)[field] = val;
    setProps(next);
  };

  const addEmit = () => setEmits([...emits, { name: '', payload: 'string' }]);
  const removeEmit = (i: number) => setEmits(emits.filter((_, idx) => idx !== i));
  const updateEmit = (i: number, field: keyof Emit, val: string) => {
    const next = [...emits];
    next[i] = { ...next[i], [field]: val };
    setEmits(next);
  };

  const addComposable = () => setComposables([...composables, { name: '', from: '' }]);
  const removeComposable = (i: number) => setComposables(composables.filter((_, idx) => idx !== i));
  const updateComposable = (i: number, field: keyof Composable, val: string) => {
    const next = [...composables];
    next[i] = { ...next[i], [field]: val };
    setComposables(next);
  };

  const generate = () => {
    const code = generateVueComponent(componentName, useTs, props, emits, composables, useProvide, useWatcher);
    setOutput(code);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-5">
      {/* Component Name */}
      <div>
        <label class="block text-sm font-medium text-text mb-1">Component Name</label>
        <input
          type="text"
          value={componentName}
          onInput={e => setComponentName((e.target as HTMLInputElement).value)}
          class="w-full font-mono text-sm bg-background border border-border rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-accent"
          placeholder="MyComponent"
        />
      </div>

      {/* TypeScript */}
      <div class="flex items-center gap-6">
        <span class="text-sm font-medium text-text">Language:</span>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" checked={useTs} onChange={() => setUseTs(true)} class="accent-accent" />
          TypeScript
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" checked={!useTs} onChange={() => setUseTs(false)} class="accent-accent" />
          JavaScript
        </label>
      </div>

      {/* Options */}
      <div class="flex items-center gap-6 flex-wrap">
        <span class="text-sm font-medium text-text">Options:</span>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={useWatcher} onChange={e => setUseWatcher((e.target as HTMLInputElement).checked)} class="accent-accent" />
          watch()
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={useProvide} onChange={e => setUseProvide((e.target as HTMLInputElement).checked)} class="accent-accent" />
          provide/inject
        </label>
      </div>

      {/* Props */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Props</label>
          <button onClick={addProp} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">+ Add Prop</button>
        </div>
        {props.length === 0 && <p class="text-xs text-text-muted">No props.</p>}
        <div class="space-y-2">
          {props.map((p, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={p.name}
                onInput={e => updateProp(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="name"
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={p.type}
                onInput={e => updateProp(i, 'type', (e.target as HTMLInputElement).value)}
                placeholder="type"
                class="w-20 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={p.defaultVal}
                onInput={e => updateProp(i, 'defaultVal', (e.target as HTMLInputElement).value)}
                placeholder="default"
                class="w-24 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <label class="flex items-center gap-1 text-xs text-text-muted whitespace-nowrap">
                <input type="checkbox" checked={p.required} onChange={e => updateProp(i, 'required', (e.target as HTMLInputElement).checked)} class="accent-accent" />
                req
              </label>
              <button onClick={() => removeProp(i)} class="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      {/* Emits */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Emits</label>
          <button onClick={addEmit} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">+ Add Emit</button>
        </div>
        {emits.length === 0 && <p class="text-xs text-text-muted">No emits.</p>}
        <div class="space-y-2">
          {emits.map((em, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={em.name}
                onInput={e => updateEmit(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="event name"
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={em.payload}
                onInput={e => updateEmit(i, 'payload', (e.target as HTMLInputElement).value)}
                placeholder="payload type"
                class="w-32 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={() => removeEmit(i)} class="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      {/* Composables */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Composables</label>
          <button onClick={addComposable} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">+ Add Composable</button>
        </div>
        {composables.length === 0 && <p class="text-xs text-text-muted">e.g. useFetch from @vueuse/core</p>}
        <div class="space-y-2">
          {composables.map((c, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={c.name}
                onInput={e => updateComposable(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="useFetch"
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={c.from}
                onInput={e => updateComposable(i, 'from', (e.target as HTMLInputElement).value)}
                placeholder="@vueuse/core"
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={() => removeComposable(i)} class="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Generate Vue Component
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">{componentName}.vue</span>
            <button
              onClick={copyToClipboard}
              class="text-xs px-3 py-1 bg-surface border border-border rounded hover:border-accent transition-colors"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
          <pre class="bg-background border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 text-text whitespace-pre-wrap">{output}</pre>
        </div>
      )}

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">How to use</p>
        <ol class="space-y-1 list-decimal list-inside">
          <li>Enter a PascalCase component name (generates kebab-case CSS class automatically)</li>
          <li>Choose TypeScript or JavaScript mode</li>
          <li>Define props with type, required flag, and optional default value</li>
          <li>Add emits with their payload types</li>
          <li>Add composables imported from libraries like VueUse or your own <code class="font-mono">composables/</code> directory</li>
          <li>Click Generate and paste into your <code class="font-mono">.vue</code> file</li>
        </ol>
      </div>
    </div>
  );
}
