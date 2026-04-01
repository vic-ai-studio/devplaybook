import { useState, useMemo } from 'preact/hooks';

type ComponentType = 'functional' | 'memo' | 'forwardRef';
type StyleType = 'none' | 'tailwind' | 'cssmodule' | 'styled';
type ExportType = 'default' | 'named' | 'both';

interface Prop {
  id: number;
  name: string;
  type: string;
  required: boolean;
  defaultValue: string;
}

interface Hook {
  id: number;
  name: string;
  initialValue: string;
}

let nextPropId = 1;
let nextHookId = 1;

function makeProp(): Prop {
  return { id: nextPropId++, name: 'label', type: 'string', required: true, defaultValue: '' };
}

function makeHook(): Hook {
  return { id: nextHookId++, name: 'count', initialValue: '0' };
}

const INPUT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent';
const SELECT_CLASS = 'bg-bg-card border border-border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-primary focus:border-transparent';
const BTN = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors';

const COMMON_PROP_TYPES = ['string', 'number', 'boolean', 'React.ReactNode', 'React.ReactElement', '() => void', '(value: string) => void', 'string[]', 'number[]', 'Record<string, string>'];

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function toPascalCase(s: string) {
  return s.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^(.)/, c => c.toUpperCase());
}

export default function ReactComponentGenerator() {
  const [componentName, setComponentName] = useState('MyComponent');
  const [componentType, setComponentType] = useState<ComponentType>('functional');
  const [styleType, setStyleType] = useState<StyleType>('tailwind');
  const [exportType, setExportType] = useState<ExportType>('default');
  const [useTypeScript, setUseTypeScript] = useState(true);
  const [props, setProps] = useState<Prop[]>([makeProp()]);
  const [hooks, setHooks] = useState<Hook[]>([]);
  const [includeChildren, setIncludeChildren] = useState(false);
  const [includeTestFile, setIncludeTestFile] = useState(false);
  const [copied, setCopied] = useState<'main' | 'test' | null>(null);

  const safeName = useMemo(() => toPascalCase(componentName || 'MyComponent'), [componentName]);

  function addProp() {
    setProps(prev => [...prev, makeProp()]);
  }

  function removeProp(id: number) {
    setProps(prev => prev.filter(p => p.id !== id));
  }

  function updateProp(id: number, patch: Partial<Prop>) {
    setProps(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));
  }

  function addHook() {
    setHooks(prev => [...prev, makeHook()]);
  }

  function removeHook(id: number) {
    setHooks(prev => prev.filter(h => h.id !== id));
  }

  function updateHook(id: number, patch: Partial<Hook>) {
    setHooks(prev => prev.map(h => h.id === id ? { ...h, ...patch } : h));
  }

  const mainCode = useMemo(() => {
    const ext = useTypeScript ? 'tsx' : 'jsx';
    const lines: string[] = [];

    // Imports
    const reactImports: string[] = [];
    if (componentType === 'memo') reactImports.push('memo');
    if (componentType === 'forwardRef') reactImports.push('forwardRef', 'Ref');
    if (hooks.length > 0) reactImports.push('useState');
    if (includeChildren && useTypeScript) reactImports.push('ReactNode');

    if (reactImports.length > 0) {
      lines.push(`import { ${reactImports.join(', ')} } from 'react';`);
    } else {
      lines.push(`import React from 'react';`);
    }

    if (styleType === 'cssmodule') {
      lines.push(`import styles from './${safeName}.module.css';`);
    } else if (styleType === 'styled') {
      lines.push(`import styled from 'styled-components';`);
    }

    lines.push('');

    // Props interface
    if (useTypeScript) {
      const propLines = props.map(p => {
        const opt = p.required ? '' : '?';
        const def = p.defaultValue ? ` // default: ${p.defaultValue}` : '';
        return `  ${p.name}${opt}: ${p.type};${def}`;
      });
      if (includeChildren) propLines.push('  children?: ReactNode;');

      if (propLines.length > 0) {
        lines.push(`interface ${safeName}Props {`);
        propLines.forEach(l => lines.push(l));
        lines.push('}');
        lines.push('');
      }
    }

    // Styled components
    if (styleType === 'styled') {
      lines.push(`const Wrapper = styled.div\`\n  /* add your styles here */\n\`;`);
      lines.push('');
    }

    // Component definition
    const propsParam = useTypeScript ? `{ ${[...props.map(p => p.name), ...(includeChildren ? ['children'] : [])].join(', ')} }: ${safeName}Props` : `{ ${[...props.map(p => p.name), ...(includeChildren ? ['children'] : [])].join(', ')} }`;
    const returnType = useTypeScript ? ': JSX.Element' : '';

    if (componentType === 'functional') {
      lines.push(`function ${safeName}(${propsParam})${returnType} {`);
    } else if (componentType === 'memo') {
      lines.push(`const ${safeName} = memo(function ${safeName}(${propsParam})${returnType} {`);
    } else if (componentType === 'forwardRef') {
      const refType = useTypeScript ? ', ref: Ref<HTMLDivElement>' : ', ref';
      lines.push(`const ${safeName} = forwardRef(function ${safeName}(${propsParam}${refType})${returnType} {`);
    }

    // useState hooks
    hooks.forEach(h => {
      const typeAnnot = useTypeScript && h.initialValue !== '' ? '' : '';
      const initial = isNaN(Number(h.initialValue)) ? `'${h.initialValue}'` : h.initialValue;
      lines.push(`  const [${h.name}, set${capitalize(h.name)}] = useState(${initial});`);
    });

    if (hooks.length > 0) lines.push('');

    // JSX return
    const wrapEl = styleType === 'styled' ? 'Wrapper' : 'div';
    const classAttr = styleType === 'tailwind' ? ` className="flex flex-col gap-4 p-4"` :
                     styleType === 'cssmodule' ? ` className={styles.container}` : '';
    const refAttr = componentType === 'forwardRef' ? ' ref={ref}' : '';

    lines.push(`  return (`);
    lines.push(`    <${wrapEl}${classAttr}${refAttr}>`);

    props.filter(p => ['string', 'number'].includes(p.type)).slice(0, 2).forEach(p => {
      lines.push(`      <span>{${p.name}}</span>`);
    });

    if (includeChildren) lines.push('      {children}');

    lines.push(`    </${wrapEl}>`);
    lines.push(`  );`);

    if (componentType === 'functional') {
      lines.push('}');
    } else {
      lines.push('});');
    }

    lines.push('');

    // Display name for memo/forwardRef
    if (componentType !== 'functional') {
      lines.push(`${safeName}.displayName = '${safeName}';`);
      lines.push('');
    }

    // Default value props (JS only)
    if (!useTypeScript) {
      const defaultProps = props.filter(p => p.defaultValue);
      if (defaultProps.length > 0) {
        lines.push(`${safeName}.defaultProps = {`);
        defaultProps.forEach(p => {
          const val = isNaN(Number(p.defaultValue)) ? `'${p.defaultValue}'` : p.defaultValue;
          lines.push(`  ${p.name}: ${val},`);
        });
        lines.push('};');
        lines.push('');
      }
    }

    // Export
    if (exportType === 'default') {
      lines.push(`export default ${safeName};`);
    } else if (exportType === 'named') {
      lines.push(`export { ${safeName} };`);
    } else {
      lines.push(`export { ${safeName} };`);
      lines.push(`export default ${safeName};`);
    }

    return lines.join('\n');
  }, [safeName, componentType, styleType, exportType, useTypeScript, props, hooks, includeChildren]);

  const testCode = useMemo(() => {
    const lines: string[] = [];
    lines.push(`import { render, screen } from '@testing-library/react';`);
    lines.push(`import ${safeName} from './${safeName}';`);
    lines.push('');
    lines.push(`describe('${safeName}', () => {`);
    lines.push(`  it('renders without crashing', () => {`);

    const requiredProps = props.filter(p => p.required);
    const propsStr = requiredProps.map(p => {
      const val = p.type === 'string' ? `"test"` :
                  p.type === 'number' ? '42' :
                  p.type === 'boolean' ? '{true}' :
                  p.type.includes('=>') ? '{jest.fn()}' : '{"test"}';
      return `${p.name}=${val}`;
    }).join(' ');

    lines.push(`    render(<${safeName} ${propsStr} />);`);
    lines.push(`    expect(document.querySelector('div')).toBeInTheDocument();`);
    lines.push(`  });`);

    if (props.some(p => p.type === 'string')) {
      const strProp = props.find(p => p.type === 'string');
      if (strProp) {
        lines.push('');
        lines.push(`  it('displays ${strProp.name} prop', () => {`);
        const allPropsStr = requiredProps.map(p => {
          const val = p.name === strProp.name ? `"Hello World"` :
                      p.type === 'string' ? `"test"` :
                      p.type === 'number' ? '42' :
                      p.type === 'boolean' ? '{true}' : '{"test"}';
          return `${p.name}=${val}`;
        }).join(' ');
        lines.push(`    render(<${safeName} ${allPropsStr} />);`);
        lines.push(`    expect(screen.getByText('Hello World')).toBeInTheDocument();`);
        lines.push(`  });`);
      }
    }

    lines.push(`});`);
    return lines.join('\n');
  }, [safeName, props]);

  function copyCode(which: 'main' | 'test') {
    const text = which === 'main' ? mainCode : testCode;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Config panel */}
        <div class="space-y-4">
          {/* Component settings */}
          <div class="bg-bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 class="text-sm font-semibold">Component Settings</h3>
            <div>
              <label class="block text-xs text-text-muted mb-1">Component Name</label>
              <input type="text" class={`${INPUT_CLASS} w-full`} value={componentName}
                onInput={(e) => setComponentName((e.target as HTMLInputElement).value)}
                placeholder="MyComponent" />
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Type</label>
              <select class={`${SELECT_CLASS} w-full`} value={componentType}
                onChange={(e) => setComponentType((e.target as HTMLSelectElement).value as ComponentType)}>
                <option value="functional">Functional Component</option>
                <option value="memo">React.memo</option>
                <option value="forwardRef">forwardRef</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Styling</label>
              <select class={`${SELECT_CLASS} w-full`} value={styleType}
                onChange={(e) => setStyleType((e.target as HTMLSelectElement).value as StyleType)}>
                <option value="tailwind">Tailwind CSS</option>
                <option value="cssmodule">CSS Modules</option>
                <option value="styled">Styled Components</option>
                <option value="none">None</option>
              </select>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Export</label>
              <select class={`${SELECT_CLASS} w-full`} value={exportType}
                onChange={(e) => setExportType((e.target as HTMLSelectElement).value as ExportType)}>
                <option value="default">default export</option>
                <option value="named">named export</option>
                <option value="both">both</option>
              </select>
            </div>
            <div class="flex gap-4">
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={useTypeScript} onChange={(e) => setUseTypeScript((e.target as HTMLInputElement).checked)} class="accent-primary" />
                TypeScript
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeChildren} onChange={(e) => setIncludeChildren((e.target as HTMLInputElement).checked)} class="accent-primary" />
                children prop
              </label>
              <label class="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={includeTestFile} onChange={(e) => setIncludeTestFile((e.target as HTMLInputElement).checked)} class="accent-primary" />
                Test file
              </label>
            </div>
          </div>

          {/* Props */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold">Props</h3>
              <button onClick={addProp} class={`${BTN} bg-primary/10 text-primary hover:bg-primary/20`}>
                + Add Prop
              </button>
            </div>
            <div class="space-y-2">
              {props.map(p => (
                <div key={p.id} class="grid grid-cols-12 gap-2 items-center">
                  <input type="text" class={`${INPUT_CLASS} col-span-3`} value={p.name}
                    onInput={(e) => updateProp(p.id, { name: (e.target as HTMLInputElement).value })}
                    placeholder="name" />
                  <select class={`${SELECT_CLASS} col-span-4`} value={p.type}
                    onChange={(e) => updateProp(p.id, { type: (e.target as HTMLSelectElement).value })}>
                    {COMMON_PROP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <label class="col-span-2 flex items-center gap-1 text-xs cursor-pointer justify-center">
                    <input type="checkbox" checked={p.required} onChange={(e) => updateProp(p.id, { required: (e.target as HTMLInputElement).checked })} class="accent-primary" />
                    req
                  </label>
                  <button onClick={() => removeProp(p.id)} class="col-span-1 text-red-400 hover:text-red-300 text-center text-lg leading-none">×</button>
                </div>
              ))}
              {props.length === 0 && <p class="text-xs text-text-muted">No props. Click "+ Add Prop" to add one.</p>}
            </div>
          </div>

          {/* Hooks */}
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold">useState Hooks</h3>
              <button onClick={addHook} class={`${BTN} bg-primary/10 text-primary hover:bg-primary/20`}>
                + Add Hook
              </button>
            </div>
            <div class="space-y-2">
              {hooks.map(h => (
                <div key={h.id} class="grid grid-cols-12 gap-2 items-center">
                  <input type="text" class={`${INPUT_CLASS} col-span-4`} value={h.name}
                    onInput={(e) => updateHook(h.id, { name: (e.target as HTMLInputElement).value })}
                    placeholder="state name" />
                  <input type="text" class={`${INPUT_CLASS} col-span-6`} value={h.initialValue}
                    onInput={(e) => updateHook(h.id, { initialValue: (e.target as HTMLInputElement).value })}
                    placeholder="initial value" />
                  <button onClick={() => removeHook(h.id)} class="col-span-1 text-red-400 hover:text-red-300 text-center text-lg leading-none">×</button>
                </div>
              ))}
              {hooks.length === 0 && <p class="text-xs text-text-muted">No hooks. Click "+ Add Hook" to add useState.</p>}
            </div>
          </div>
        </div>

        {/* Code output */}
        <div class="space-y-4">
          <div class="bg-bg-card border border-border rounded-xl p-4">
            <div class="flex items-center justify-between mb-3">
              <h3 class="text-sm font-semibold">
                {safeName}.{useTypeScript ? 'tsx' : 'jsx'}
              </h3>
              <button onClick={() => copyCode('main')}
                class={`${BTN} ${copied === 'main' ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                {copied === 'main' ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="text-xs font-mono text-green-400 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre max-h-[500px] overflow-y-auto">{mainCode}</pre>
          </div>

          {includeTestFile && (
            <div class="bg-bg-card border border-border rounded-xl p-4">
              <div class="flex items-center justify-between mb-3">
                <h3 class="text-sm font-semibold">{safeName}.test.{useTypeScript ? 'tsx' : 'jsx'}</h3>
                <button onClick={() => copyCode('test')}
                  class={`${BTN} ${copied === 'test' ? 'bg-green-500/20 text-green-400' : 'bg-primary/10 text-primary hover:bg-primary/20'}`}>
                  {copied === 'test' ? '✓ Copied!' : 'Copy'}
                </button>
              </div>
              <pre class="text-xs font-mono text-green-400 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre">{testCode}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
