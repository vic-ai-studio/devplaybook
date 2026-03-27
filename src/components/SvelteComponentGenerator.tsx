import { useState } from 'preact/hooks';

type Prop = { name: string; type: string; defaultVal: string };
type Event = { name: string; detail: string };

function generateSvelteComponent(
  componentName: string,
  useRunes: boolean,
  props: Prop[],
  events: Event[],
  useOnMount: boolean,
  useOnDestroy: boolean,
): string {
  const validProps = props.filter(p => p.name.trim());
  const validEvents = events.filter(e => e.name.trim());

  const lines: string[] = ['<script lang="ts">'];

  if (useRunes) {
    // Svelte 5 runes
    if (useOnMount || useOnDestroy) {
      lines.push(`  import { ${[useOnMount ? '$effect' : '', useOnDestroy ? '$effect' : ''].filter(Boolean).join(', ')} } from 'svelte';`);
    }

    if (validProps.length > 0) {
      lines.push('');
      lines.push('  // Props with runes');
      validProps.forEach(p => {
        const def = p.defaultVal ? ` = ${p.defaultVal}` : '';
        lines.push(`  let { ${p.name}${def} }: { ${p.name}: ${p.type || 'string'} } = $props();`);
      });
    }

    lines.push('');
    lines.push('  // State');
    lines.push('  let count = $state(0);');

    if (validProps.length > 0) {
      lines.push('');
      lines.push('  // Derived');
      lines.push(`  let label = $derived(\`${validProps[0]?.name ?? 'value'}: \${${validProps[0]?.name ?? 'count'}}\`);`);
    }

    if (useOnMount) {
      lines.push('');
      lines.push('  $effect(() => {');
      lines.push('    // runs on mount and when deps change');
      lines.push('    console.log("Component mounted");');
      lines.push('    return () => {');
      lines.push('      // cleanup');
      lines.push('      console.log("Cleanup ran");');
      lines.push('    };');
      lines.push('  });');
    }

    if (validEvents.length > 0) {
      lines.push('');
      lines.push('  // Event handlers');
      validEvents.forEach(ev => {
        const detail = ev.detail || 'string';
        lines.push(`  function dispatch${capitalize(ev.name)}(detail: ${detail}) {`);
        lines.push(`    // Svelte 5: use callback props instead of createEventDispatcher`);
        lines.push(`    // e.g. let { on${capitalize(ev.name)} }: { on${capitalize(ev.name)}: (d: ${detail}) => void } = $props();`);
        lines.push(`    console.log('${ev.name}', detail);`);
        lines.push('  }');
      });
    }
  } else {
    // Svelte 4 style
    if (useOnMount) lines.push("  import { onMount } from 'svelte';");
    if (useOnDestroy) lines.push("  import { onDestroy } from 'svelte';");
    if (validEvents.length > 0) lines.push("  import { createEventDispatcher } from 'svelte';");

    if (validProps.length > 0) {
      lines.push('');
      lines.push('  // Props');
      validProps.forEach(p => {
        const def = p.defaultVal ? ` = ${p.defaultVal}` : '';
        lines.push(`  export let ${p.name}: ${p.type || 'string'}${def};`);
      });
    }

    lines.push('');
    lines.push('  // State');
    lines.push('  let count = 0;');

    if (validEvents.length > 0) {
      lines.push('');
      lines.push('  const dispatch = createEventDispatcher<{');
      validEvents.forEach((ev, i) => {
        const comma = i < validEvents.length - 1 ? ',' : '';
        lines.push(`    ${ev.name}: ${ev.detail || 'string'}${comma}`);
      });
      lines.push('  }>();');
    }

    if (useOnMount) {
      lines.push('');
      lines.push('  onMount(() => {');
      lines.push('    console.log("Component mounted");');
      lines.push('  });');
    }

    if (useOnDestroy) {
      lines.push('');
      lines.push('  onDestroy(() => {');
      lines.push('    console.log("Component destroyed");');
      lines.push('  });');
    }
  }

  lines.push('</script>');
  lines.push('');

  // Template
  lines.push(`<!-- ${componentName}.svelte -->`);
  lines.push('<div class="component-wrapper">');
  if (validProps.length > 0) {
    lines.push(`  <p>{{ ${validProps[0].name} }}</p>`);
  }
  lines.push(`  <button on:click={() => count${useRunes ? '' : '++'}${useRunes ? ' = count + 1' : ''}}>Count: {count}</button>`);

  if (validEvents.length > 0 && !useRunes) {
    lines.push(`  <button on:click={() => dispatch('${validEvents[0].name}', 'payload')}>Emit ${validEvents[0].name}</button>`);
  }
  lines.push('</div>');
  lines.push('');

  // Style
  lines.push('<style>');
  lines.push('  .component-wrapper {');
  lines.push('    padding: 1rem;');
  lines.push('  }');
  lines.push('</style>');

  return lines.join('\n');
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function SvelteComponentGenerator() {
  const [componentName, setComponentName] = useState('MyComponent');
  const [useRunes, setUseRunes] = useState(true);
  const [useOnMount, setUseOnMount] = useState(false);
  const [useOnDestroy, setUseOnDestroy] = useState(false);
  const [props, setProps] = useState<Prop[]>([{ name: 'label', type: 'string', defaultVal: '"Hello"' }]);
  const [events, setEvents] = useState<Event[]>([{ name: 'click', detail: 'string' }]);
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const addProp = () => setProps([...props, { name: '', type: 'string', defaultVal: '' }]);
  const removeProp = (i: number) => setProps(props.filter((_, idx) => idx !== i));
  const updateProp = (i: number, field: keyof Prop, val: string) => {
    const next = [...props];
    next[i] = { ...next[i], [field]: val };
    setProps(next);
  };

  const addEvent = () => setEvents([...events, { name: '', detail: 'string' }]);
  const removeEvent = (i: number) => setEvents(events.filter((_, idx) => idx !== i));
  const updateEvent = (i: number, field: keyof Event, val: string) => {
    const next = [...events];
    next[i] = { ...next[i], [field]: val };
    setEvents(next);
  };

  const generate = () => {
    const code = generateSvelteComponent(componentName, useRunes, props, events, useOnMount, useOnDestroy);
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

      {/* Mode */}
      <div class="flex items-center gap-6">
        <span class="text-sm font-medium text-text">Mode:</span>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" checked={useRunes} onChange={() => setUseRunes(true)} class="accent-accent" />
          Svelte 5 (Runes)
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="radio" checked={!useRunes} onChange={() => setUseRunes(false)} class="accent-accent" />
          Svelte 4 (Legacy)
        </label>
      </div>

      {/* Lifecycle */}
      <div class="flex items-center gap-6">
        <span class="text-sm font-medium text-text">Lifecycle:</span>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={useOnMount} onChange={e => setUseOnMount((e.target as HTMLInputElement).checked)} class="accent-accent" />
          onMount / $effect
        </label>
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" checked={useOnDestroy} onChange={e => setUseOnDestroy((e.target as HTMLInputElement).checked)} class="accent-accent" />
          onDestroy / cleanup
        </label>
      </div>

      {/* Props */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Props</label>
          <button onClick={addProp} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">+ Add Prop</button>
        </div>
        {props.length === 0 && <p class="text-xs text-text-muted">No props. Click "Add Prop" to add one.</p>}
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
                class="w-24 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={p.defaultVal}
                onInput={e => updateProp(i, 'defaultVal', (e.target as HTMLInputElement).value)}
                placeholder="default"
                class="w-28 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={() => removeProp(i)} class="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      {/* Events */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text">Events / Callbacks</label>
          <button onClick={addEvent} class="text-xs px-2 py-1 bg-surface border border-border rounded hover:border-accent transition-colors">+ Add Event</button>
        </div>
        {events.length === 0 && <p class="text-xs text-text-muted">No events defined.</p>}
        <div class="space-y-2">
          {events.map((ev, i) => (
            <div key={i} class="flex gap-2 items-center">
              <input
                type="text"
                value={ev.name}
                onInput={e => updateEvent(i, 'name', (e.target as HTMLInputElement).value)}
                placeholder="event name"
                class="flex-1 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <input
                type="text"
                value={ev.detail}
                onInput={e => updateEvent(i, 'detail', (e.target as HTMLInputElement).value)}
                placeholder="detail type"
                class="w-32 font-mono text-xs bg-background border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              />
              <button onClick={() => removeEvent(i)} class="text-red-400 hover:text-red-300 text-xs px-1">x</button>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={generate}
        class="w-full py-2.5 bg-accent text-white rounded-lg font-medium hover:bg-accent/90 transition-colors"
      >
        Generate Svelte Component
      </button>

      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text">{componentName}.svelte</span>
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
          <li>Enter a PascalCase component name</li>
          <li>Choose Svelte 5 (runes) or Svelte 4 (legacy) mode</li>
          <li>Add props with name, TypeScript type, and optional default value</li>
          <li>Add events / callbacks (Svelte 5 uses callback props; Svelte 4 uses <code class="font-mono">createEventDispatcher</code>)</li>
          <li>Click Generate and paste into your <code class="font-mono">.svelte</code> file</li>
        </ol>
      </div>
    </div>
  );
}
