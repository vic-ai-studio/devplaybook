import { useState, useEffect, useRef } from 'preact/hooks';

type DiagramType = 'flowchart' | 'sequence' | 'class' | 'er' | 'gantt';

const SAMPLES: Record<DiagramType, string> = {
  flowchart: `flowchart TD
    A[Start] --> B{Is it valid?}
    B -- Yes --> C[Process data]
    B -- No --> D[Show error]
    C --> E[Save to DB]
    D --> F[End]
    E --> F`,

  sequence: `sequenceDiagram
    participant Client
    participant API
    participant DB

    Client->>API: POST /login
    API->>DB: SELECT user WHERE email=?
    DB-->>API: user record
    API-->>Client: 200 OK { token }
    Client->>API: GET /profile (Authorization: Bearer token)
    API-->>Client: 200 OK { profile }`,

  class: `classDiagram
    class User {
      +String id
      +String email
      +String name
      +login() bool
      +logout() void
    }

    class Order {
      +String id
      +Date createdAt
      +Float total
      +submit() void
    }

    class Product {
      +String id
      +String name
      +Float price
    }

    User "1" --> "0..*" Order : places
    Order "1" --> "1..*" Product : contains`,

  er: `erDiagram
    USER {
      string id PK
      string email UK
      string name
      datetime created_at
    }

    ORDER {
      string id PK
      string user_id FK
      float total
      string status
      datetime created_at
    }

    ORDER_ITEM {
      string id PK
      string order_id FK
      string product_id FK
      int quantity
      float unit_price
    }

    USER ||--o{ ORDER : places
    ORDER ||--|{ ORDER_ITEM : contains`,

  gantt: `gantt
    title Project Timeline
    dateFormat  YYYY-MM-DD
    section Planning
    Requirements    :a1, 2024-01-01, 7d
    Design          :a2, after a1, 5d
    section Development
    Backend API     :b1, after a2, 14d
    Frontend UI     :b2, after a2, 14d
    section Testing
    QA Testing      :c1, after b1, 7d
    Bug Fixes       :c2, after c1, 5d
    section Release
    Deploy to prod  :d1, after c2, 1d`,
};

const TYPE_LABELS: Record<DiagramType, string> = {
  flowchart: 'Flowchart',
  sequence: 'Sequence',
  class: 'Class',
  er: 'ER Diagram',
  gantt: 'Gantt Chart',
};

declare const mermaid: any;

export default function MermaidDiagramGenerator() {
  const [type, setType] = useState<DiagramType>('flowchart');
  const [code, setCode] = useState(SAMPLES['flowchart']);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const renderIdRef = useRef(0);

  // Load mermaid.js from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if ((window as any).mermaid) {
      setMermaidLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.async = true;
    script.onload = () => {
      (window as any).mermaid.initialize({
        startOnLoad: false,
        theme: 'dark',
        themeVariables: {
          background: '#0f1117',
          primaryColor: '#7c3aed',
          primaryTextColor: '#e5e7eb',
          edgeLabelBackground: '#1e2030',
          tertiaryColor: '#1e2030',
        },
      });
      setMermaidLoaded(true);
    };
    document.head.appendChild(script);
  }, []);

  // Re-render preview when code or mermaid changes
  useEffect(() => {
    if (!mermaidLoaded || !previewRef.current) return;
    const id = `mermaid-${++renderIdRef.current}`;
    const container = previewRef.current;
    container.innerHTML = '';
    setError('');

    (async () => {
      try {
        const { svg } = await (window as any).mermaid.render(id, code);
        container.innerHTML = svg;
      } catch (e: any) {
        setError(e?.message ?? 'Diagram syntax error. Check your Mermaid code.');
        container.innerHTML = '';
      }
    })();
  }, [code, mermaidLoaded]);

  const handleTypeChange = (t: DiagramType) => {
    setType(t);
    setCode(SAMPLES[t]);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div class="space-y-4">
      {/* Type selector */}
      <div class="flex flex-wrap gap-2">
        {(Object.keys(TYPE_LABELS) as DiagramType[]).map(t => (
          <button
            key={t}
            onClick={() => handleTypeChange(t)}
            class={`px-3 py-1.5 text-sm rounded border transition-colors ${
              type === t
                ? 'bg-accent text-white border-accent'
                : 'bg-surface border-border hover:border-accent'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Editor */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Mermaid code</label>
            <button
              onClick={handleCopy}
              class={`text-xs px-3 py-1.5 rounded border font-medium transition-colors ${
                copied ? 'bg-green-500/20 text-green-400 border-green-500/30' : 'bg-surface border-border hover:border-accent'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy code'}
            </button>
          </div>
          <textarea
            value={code}
            onInput={e => setCode((e.target as HTMLTextAreaElement).value)}
            rows={20}
            spellcheck={false}
            class="w-full font-mono text-sm bg-background border border-border rounded-lg p-3 resize-y focus:outline-none focus:ring-1 focus:ring-accent transition-colors"
            placeholder="Enter Mermaid diagram syntax..."
          />
        </div>

        {/* Preview */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <label class="text-sm font-medium text-text-muted">Live preview</label>
            {!mermaidLoaded && <span class="text-xs text-text-muted">Loading renderer…</span>}
          </div>
          <div class="bg-background border border-border rounded-lg p-4 min-h-[400px] flex items-center justify-center overflow-auto">
            {error ? (
              <div class="w-full p-3 bg-red-500/10 border border-red-500/30 rounded text-red-400 text-sm font-mono whitespace-pre-wrap">
                {error}
              </div>
            ) : (
              <div ref={previewRef} class="w-full flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto" />
            )}
            {!mermaidLoaded && !error && (
              <p class="text-text-muted text-sm">Loading Mermaid renderer…</p>
            )}
          </div>
        </div>
      </div>

      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted">
        <p class="font-medium text-text mb-2">Supported diagram types</p>
        <ul class="space-y-1 list-disc list-inside">
          <li><strong>Flowchart</strong> — processes, decisions, data flows</li>
          <li><strong>Sequence</strong> — actor interactions over time (APIs, auth flows)</li>
          <li><strong>Class</strong> — OOP class relationships and methods</li>
          <li><strong>ER Diagram</strong> — database entity relationships</li>
          <li><strong>Gantt Chart</strong> — project timelines and tasks</li>
        </ul>
      </div>
    </div>
  );
}
