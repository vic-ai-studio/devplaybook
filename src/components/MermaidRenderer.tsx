import { useState, useEffect, useRef } from 'preact/hooks';

const EXAMPLES: Record<string, string> = {
  Flowchart: `flowchart TD
    A[Start] --> B{Is it working?}
    B -->|Yes| C[Great!]
    B -->|No| D[Debug]
    D --> B
    C --> E[Ship it]`,
  Sequence: `sequenceDiagram
    participant Browser
    participant Server
    participant DB
    Browser->>Server: GET /api/users
    Server->>DB: SELECT * FROM users
    DB-->>Server: rows
    Server-->>Browser: JSON response`,
  ERD: `erDiagram
    USER ||--o{ ORDER : places
    ORDER ||--|{ LINE_ITEM : contains
    USER {
        int id PK
        string email
        string name
    }
    ORDER {
        int id PK
        int user_id FK
        date created_at
    }`,
  Class: `classDiagram
    class Animal {
        +String name
        +int age
        +makeSound() void
    }
    class Dog {
        +fetch() void
    }
    class Cat {
        +purr() void
    }
    Animal <|-- Dog
    Animal <|-- Cat`,
  Gantt: `gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Planning
    Requirements :a1, 2026-01-01, 7d
    Design       :a2, after a1, 5d
    section Development
    Backend  :b1, after a2, 14d
    Frontend :b2, after a2, 14d
    section Launch
    Testing  :c1, after b1, 7d
    Deploy   :c2, after c1, 2d`,
};

export default function MermaidRenderer() {
  const [code, setCode] = useState(EXAMPLES['Flowchart']);
  const [svg, setSvg] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeExample, setActiveExample] = useState('Flowchart');
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const renderCount = useRef(0);

  // Load mermaid from CDN
  useEffect(() => {
    if ((window as any).mermaid) {
      setMermaidLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.onload = () => {
      (window as any).mermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'loose' });
      setMermaidLoaded(true);
    };
    script.onerror = () => setError('Failed to load Mermaid library.');
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!mermaidLoaded) return;
    render();
  }, [code, mermaidLoaded]);

  async function render() {
    if (!(window as any).mermaid) return;
    setLoading(true);
    setError('');
    const id = `mermaid-${++renderCount.current}`;
    try {
      const { svg: rendered } = await (window as any).mermaid.render(id, code);
      setSvg(rendered);
    } catch (e: any) {
      setError(e?.message || 'Invalid diagram syntax');
      setSvg('');
    } finally {
      setLoading(false);
    }
  }

  function downloadSvg() {
    if (!svg) return;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.svg';
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyCode() {
    navigator.clipboard.writeText(code);
  }

  return (
    <div class="space-y-4">
      {/* Example selector */}
      <div>
        <p class="text-xs text-text-muted mb-2">Examples</p>
        <div class="flex flex-wrap gap-2">
          {Object.keys(EXAMPLES).map((name) => (
            <button
              key={name}
              onClick={() => { setCode(EXAMPLES[name]); setActiveExample(name); }}
              class={`px-3 py-1 text-xs rounded-lg border transition-colors ${
                activeExample === name
                  ? 'bg-primary/15 border-primary/40 text-primary'
                  : 'bg-bg-card border-border text-text-muted hover:border-primary/40 hover:text-text'
              }`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">Mermaid code</label>
            <button
              onClick={copyCode}
              class="text-xs text-text-muted hover:text-primary transition-colors"
            >
              Copy
            </button>
          </div>
          <textarea
            value={code}
            onInput={(e) => setCode((e.target as HTMLTextAreaElement).value)}
            rows={16}
            class="w-full bg-bg-card border border-border rounded-xl px-4 py-3 text-sm font-mono text-text focus:outline-none focus:border-primary transition-colors resize-y"
            spellcheck={false}
          />
          {error && (
            <div class="px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Preview */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-medium text-text-muted">Preview</label>
            {svg && (
              <button
                onClick={downloadSvg}
                class="text-xs text-text-muted hover:text-primary transition-colors"
              >
                Download SVG
              </button>
            )}
          </div>
          <div class="min-h-64 bg-bg-card border border-border rounded-xl p-4 flex items-center justify-center overflow-auto">
            {loading && <span class="text-sm text-text-muted animate-pulse">Rendering…</span>}
            {!loading && !mermaidLoaded && <span class="text-sm text-text-muted">Loading Mermaid…</span>}
            {!loading && svg && (
              <div
                class="w-full"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            )}
            {!loading && !svg && !error && mermaidLoaded && (
              <span class="text-sm text-text-muted">Start typing to render</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
