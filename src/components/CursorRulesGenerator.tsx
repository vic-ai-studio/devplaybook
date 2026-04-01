import { useState } from 'preact/hooks';

type ProjectType = 'nextjs' | 'react' | 'python' | 'go' | 'rust' | 'node' | 'vue' | 'svelte';
type CodingStyle = 'functional' | 'oop' | 'mixed';
type TestingFramework = 'jest' | 'vitest' | 'pytest' | 'go-test' | 'cargo-test' | 'none';

const PROJECT_PRESETS: Record<ProjectType, { label: string; lang: string; extras: string[] }> = {
  nextjs: { label: 'Next.js', lang: 'TypeScript', extras: ['App Router', 'Server Components', 'Tailwind CSS'] },
  react: { label: 'React', lang: 'TypeScript', extras: ['Vite', 'React Query', 'Zustand'] },
  python: { label: 'Python', lang: 'Python', extras: ['FastAPI', 'Pydantic', 'async/await'] },
  go: { label: 'Go', lang: 'Go', extras: ['idiomatic Go', 'interfaces', 'goroutines'] },
  rust: { label: 'Rust', lang: 'Rust', extras: ['ownership model', 'Result/Option types', 'cargo'] },
  node: { label: 'Node.js', lang: 'TypeScript', extras: ['Express', 'Prisma', 'Zod'] },
  vue: { label: 'Vue 3', lang: 'TypeScript', extras: ['Composition API', 'Pinia', 'Vite'] },
  svelte: { label: 'SvelteKit', lang: 'TypeScript', extras: ['SvelteKit', 'Svelte stores', 'Vite'] },
};

function generateRules(
  projectType: ProjectType,
  style: CodingStyle,
  testingFw: TestingFramework,
  customBehaviors: string,
  includeComments: boolean
): string {
  const preset = PROJECT_PRESETS[projectType];
  const lines: string[] = [];

  if (includeComments) lines.push(`# .cursorrules — ${preset.label} project`);
  lines.push('');

  // Project context
  lines.push('## Project Context');
  lines.push(`- Language: ${preset.lang}`);
  lines.push(`- Project type: ${preset.label}`);
  lines.push(`- Key technologies: ${preset.extras.join(', ')}`);
  lines.push('');

  // Coding style
  lines.push('## Code Style');
  if (style === 'functional') {
    lines.push('- Prefer functional programming patterns');
    lines.push('- Use pure functions and immutable data');
    lines.push('- Avoid classes unless framework requires them');
    lines.push('- Prefer const over let, never use var');
  } else if (style === 'oop') {
    lines.push('- Use object-oriented patterns where appropriate');
    lines.push('- Encapsulate logic in classes with clear responsibilities');
    lines.push('- Follow SOLID principles');
    lines.push('- Use interfaces/protocols to define contracts');
  } else {
    lines.push('- Use functional patterns for data transformations');
    lines.push('- Use classes for stateful services and repositories');
    lines.push('- Keep components/modules focused and small');
  }
  lines.push('');

  // Language-specific rules
  lines.push('## Language-Specific Rules');
  if (projectType === 'nextjs' || projectType === 'react' || projectType === 'node') {
    lines.push('- Always use TypeScript with strict mode');
    lines.push('- Use explicit return types on functions');
    lines.push('- Prefer type over interface for object shapes');
    lines.push('- Use Zod or similar for runtime validation at boundaries');
    lines.push('- No any types — use unknown and narrow it');
  } else if (projectType === 'python') {
    lines.push('- Use type hints on all function signatures');
    lines.push('- Prefer dataclasses or Pydantic models over plain dicts');
    lines.push('- Use pathlib.Path instead of os.path');
    lines.push('- Async functions must be consistently async throughout the call chain');
    lines.push('- Follow PEP 8 naming: snake_case functions, PascalCase classes');
  } else if (projectType === 'go') {
    lines.push('- Follow effective Go idioms');
    lines.push('- Return errors as last value, never panic in library code');
    lines.push('- Use context.Context as first argument for IO functions');
    lines.push('- Prefer composition over inheritance via interfaces');
    lines.push('- Group related functions under a single package, keep packages small');
  } else if (projectType === 'rust') {
    lines.push('- Use Result<T, E> for recoverable errors, not unwrap() in library code');
    lines.push('- Prefer owned types over references when cloning is cheap');
    lines.push('- Use the ? operator for error propagation');
    lines.push('- Add #[derive(Debug)] to all public structs/enums');
    lines.push('- Document public APIs with /// doc comments');
  } else if (projectType === 'vue' || projectType === 'svelte') {
    lines.push('- Always use TypeScript with strict mode');
    lines.push('- Keep components small and single-purpose');
    lines.push('- Extract complex logic into composables/stores');
  }
  lines.push('');

  // AI behavior rules
  lines.push('## AI Behavior Rules');
  lines.push('- When modifying existing code, preserve the existing style and naming conventions');
  lines.push('- Never introduce new dependencies without explicitly asking first');
  lines.push('- Always handle error cases — never silently swallow errors');
  lines.push('- Write self-documenting code; add comments only for non-obvious logic');
  lines.push('- When refactoring, keep the same public API unless told otherwise');
  lines.push('- Suggest the simplest solution that works — avoid over-engineering');
  lines.push('');

  // Testing
  if (testingFw !== 'none') {
    lines.push('## Testing');
    lines.push(`- Use ${testingFw} as the test framework`);
    lines.push('- Write tests alongside implementation (not after)');
    lines.push('- Test behavior, not implementation details');
    lines.push('- Use descriptive test names: "should [behavior] when [condition]"');
    if (testingFw === 'jest' || testingFw === 'vitest') {
      lines.push('- Mock external dependencies (HTTP, DB) in unit tests');
      lines.push('- Use describe blocks to group related tests');
    } else if (testingFw === 'pytest') {
      lines.push('- Use fixtures for test setup/teardown');
      lines.push('- Parametrize tests for multiple input scenarios');
    }
    lines.push('');
  }

  // Next.js specific
  if (projectType === 'nextjs') {
    lines.push('## Next.js Specific');
    lines.push('- Default to Server Components; use "use client" only when necessary');
    lines.push('- Use server actions for form mutations');
    lines.push('- Fetch data in Server Components, not useEffect');
    lines.push('- Use next/image for all images');
    lines.push('- Keep client bundles small — check bundle analyzer before adding deps');
    lines.push('');
  }

  // Custom behaviors
  if (customBehaviors.trim()) {
    lines.push('## Project-Specific Rules');
    customBehaviors.split('\n').filter(l => l.trim()).forEach(l => {
      lines.push(`- ${l.trim().replace(/^-\s*/, '')}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

export default function CursorRulesGenerator() {
  const [projectType, setProjectType] = useState<ProjectType>('nextjs');
  const [style, setStyle] = useState<CodingStyle>('functional');
  const [testingFw, setTestingFw] = useState<TestingFramework>('jest');
  const [customBehaviors, setCustomBehaviors] = useState('');
  const [includeComments, setIncludeComments] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = generateRules(projectType, style, testingFw, customBehaviors, includeComments);

  const copy = () => {
    navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const download = () => {
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.cursorrules';
    a.click();
    URL.revokeObjectURL(url);
  };

  const labelCls = 'block text-sm font-medium text-text-muted mb-1';
  const selectCls = 'w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary';

  return (
    <div class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label class={labelCls}>Project Type</label>
          <select class={selectCls} value={projectType} onChange={(e) => setProjectType((e.target as HTMLSelectElement).value as ProjectType)}>
            {Object.entries(PROJECT_PRESETS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label class={labelCls}>Coding Style</label>
          <select class={selectCls} value={style} onChange={(e) => setStyle((e.target as HTMLSelectElement).value as CodingStyle)}>
            <option value="functional">Functional</option>
            <option value="oop">Object-Oriented</option>
            <option value="mixed">Mixed (pragmatic)</option>
          </select>
        </div>
        <div>
          <label class={labelCls}>Testing Framework</label>
          <select class={selectCls} value={testingFw} onChange={(e) => setTestingFw((e.target as HTMLSelectElement).value as TestingFramework)}>
            <option value="jest">Jest</option>
            <option value="vitest">Vitest</option>
            <option value="pytest">Pytest</option>
            <option value="go-test">Go test</option>
            <option value="cargo-test">cargo test (Rust)</option>
            <option value="none">No testing rules</option>
          </select>
        </div>
        <div class="flex items-center gap-3 pt-6">
          <input
            type="checkbox"
            id="comments"
            checked={includeComments}
            onChange={(e) => setIncludeComments((e.target as HTMLInputElement).checked)}
            class="w-4 h-4 accent-primary"
          />
          <label for="comments" class="text-sm text-text-muted cursor-pointer">Include header comment</label>
        </div>
      </div>

      <div>
        <label class={labelCls}>Custom Rules (one per line, optional)</label>
        <textarea
          class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono resize-none"
          rows={4}
          placeholder={"Always use Tailwind for styling, never CSS modules\nPrefer server-side data fetching over client-side\nUse Zod schemas as the single source of truth for types"}
          value={customBehaviors}
          onInput={(e) => setCustomBehaviors((e.target as HTMLTextAreaElement).value)}
        />
      </div>

      <div class="relative">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">.cursorrules output</label>
          <div class="flex gap-2">
            <button
              onClick={copy}
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-bg-card border border-border rounded-lg hover:border-primary transition-colors"
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
            <button
              onClick={download}
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              ↓ Download .cursorrules
            </button>
          </div>
        </div>
        <pre class="bg-bg-card border border-border rounded-lg p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">{output}</pre>
      </div>
    </div>
  );
}
