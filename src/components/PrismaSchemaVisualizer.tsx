import { useState, useEffect, useRef } from 'preact/hooks';

interface PrismaField {
  name: string;
  type: string;
  isRequired: boolean;
  isList: boolean;
  isId: boolean;
  isUnique: boolean;
  isRelation: boolean;
  relationTarget?: string;
  comment?: string;
}

interface PrismaModel {
  name: string;
  fields: PrismaField[];
}

interface Relation {
  from: string;
  to: string;
  fromField: string;
  toField: string;
  isList: boolean;
}

// ---- Parser ----
function parsePrismaSchema(schema: string): { models: PrismaModel[]; relations: Relation[] } {
  const models: PrismaModel[] = [];
  const relations: Relation[] = [];
  const modelBlocks = schema.matchAll(/model\s+(\w+)\s*\{([^}]+)\}/g);

  for (const match of modelBlocks) {
    const name = match[1];
    const body = match[2];
    const fields: PrismaField[] = [];

    for (const line of body.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length < 2) continue;

      const fieldName = parts[0];
      let rawType = parts[1];
      const isList = rawType.endsWith('[]');
      const isRequired = !rawType.endsWith('?') && !isList;
      rawType = rawType.replace(/[\[\]?]/g, '');

      const scalarTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'DateTime', 'Json', 'Bytes', 'Decimal', 'BigInt']);
      const isRelation = !scalarTypes.has(rawType) && /^[A-Z]/.test(rawType);
      const isId = trimmed.includes('@id');
      const isUnique = trimmed.includes('@unique');

      const field: PrismaField = {
        name: fieldName,
        type: rawType,
        isRequired,
        isList,
        isId,
        isUnique,
        isRelation,
        relationTarget: isRelation ? rawType : undefined,
      };
      fields.push(field);

      if (isRelation) {
        relations.push({
          from: name,
          to: rawType,
          fromField: fieldName,
          toField: '',
          isList,
        });
      }
    }
    models.push({ name, fields });
  }

  return { models, relations };
}

// ---- Type Colors ----
function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    String: '#60a5fa',   // blue
    Int: '#34d399',      // green
    Float: '#34d399',
    Decimal: '#34d399',
    BigInt: '#34d399',
    Boolean: '#f59e0b',  // amber
    DateTime: '#a78bfa', // purple
    Json: '#fb923c',     // orange
    Bytes: '#94a3b8',    // slate
  };
  return colors[type] || '#f472b6'; // pink for relations
}

const SAMPLE_SCHEMA = `model User {
  id        Int      @id @default(autoincrement())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  posts     Post[]
  profile   Profile?
}

model Post {
  id        Int      @id @default(autoincrement())
  title     String
  content   String?
  published Boolean  @default(false)
  author    User     @relation(fields: [authorId], references: [id])
  authorId  Int
  tags      Tag[]
}

model Profile {
  id     Int    @id @default(autoincrement())
  bio    String?
  user   User   @relation(fields: [userId], references: [id])
  userId Int    @unique
}

model Tag {
  id    Int    @id @default(autoincrement())
  name  String @unique
  posts Post[]
}`;

interface ModelPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function PrismaSchemaVisualizer() {
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [parsed, setParsed] = useState(() => parsePrismaSchema(SAMPLE_SCHEMA));
  const [error, setError] = useState<string | null>(null);
  const [positions, setPositions] = useState<Record<string, ModelPosition>>({});
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  const CARD_WIDTH = 220;
  const FIELD_HEIGHT = 28;
  const HEADER_HEIGHT = 36;

  useEffect(() => {
    try {
      const result = parsePrismaSchema(schema);
      setParsed(result);
      setError(null);

      // Auto-layout: grid
      const cols = Math.ceil(Math.sqrt(result.models.length));
      const newPositions: Record<string, ModelPosition> = {};
      result.models.forEach((m, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const height = HEADER_HEIGHT + m.fields.length * FIELD_HEIGHT + 12;
        newPositions[m.name] = {
          x: 40 + col * 280,
          y: 40 + row * 260,
          width: CARD_WIDTH,
          height,
        };
      });
      setPositions(newPositions);
    } catch (e) {
      setError('Parse error: check your schema syntax');
    }
  }, [schema]);

  const handleMouseDown = (e: MouseEvent, modelName: string) => {
    const pos = positions[modelName];
    if (!pos) return;
    setDragging(modelName);
    setDragOffset({ x: e.clientX - pos.x, y: e.clientY - pos.y });
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!dragging) return;
    setPositions(prev => ({
      ...prev,
      [dragging]: {
        ...prev[dragging],
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      },
    }));
  };

  const handleMouseUp = () => setDragging(null);

  // SVG dimensions
  const maxX = Math.max(...Object.values(positions).map(p => p.x + p.width + 40), 600);
  const maxY = Math.max(...Object.values(positions).map(p => p.y + p.height + 40), 400);

  const getEdgeMidpoint = (m1: string, m2: string): { x1: number; y1: number; x2: number; y2: number } | null => {
    const p1 = positions[m1];
    const p2 = positions[m2];
    if (!p1 || !p2) return null;
    const cx1 = p1.x + p1.width / 2;
    const cy1 = p1.y + p1.height / 2;
    const cx2 = p2.x + p2.width / 2;
    const cy2 = p2.y + p2.height / 2;
    // Connect from right/left edge
    const x1 = cx1 < cx2 ? p1.x + p1.width : p1.x;
    const y1 = cy1;
    const x2 = cx1 < cx2 ? p2.x : p2.x + p2.width;
    const y2 = cy2;
    return { x1, y1, x2, y2 };
  };

  return (
    <div class="space-y-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Schema Input */}
        <div class="space-y-2">
          <label class="text-sm font-semibold block">Paste Prisma Schema</label>
          <textarea
            class="w-full bg-bg border border-border rounded-lg p-3 text-xs font-mono resize-none"
            rows={24}
            value={schema}
            onInput={e => setSchema((e.target as HTMLTextAreaElement).value)}
            spellcheck={false}
          />
          {error && <p class="text-red-400 text-xs">{error}</p>}
          <p class="text-xs text-text-muted">Paste your Prisma schema. <strong>Drag</strong> model cards to rearrange.</p>
        </div>

        {/* Visual Diagram */}
        <div class="lg:col-span-2 space-y-2">
          <div class="flex items-center justify-between">
            <label class="text-sm font-semibold">ER Diagram</label>
            <span class="text-xs text-text-muted">{parsed.models.length} models · {parsed.relations.length} relations</span>
          </div>
          <div class="border border-border rounded-lg overflow-auto bg-bg" style={{ minHeight: '420px', maxHeight: '560px' }}>
            <svg
              ref={svgRef}
              width={maxX}
              height={maxY}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{ userSelect: 'none', display: 'block' }}
            >
              {/* Relation lines */}
              <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#6b7280" />
                </marker>
              </defs>
              {parsed.relations.map((rel, i) => {
                const edge = getEdgeMidpoint(rel.from, rel.to);
                if (!edge) return null;
                const { x1, y1, x2, y2 } = edge;
                const mx = (x1 + x2) / 2;
                const cp1x = x1 + (mx - x1) * 0.5;
                const cp2x = x2 - (x2 - mx) * 0.5;
                const d = `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2}`;
                return (
                  <g key={i}>
                    <path d={d} fill="none" stroke="#4b5563" strokeWidth="1.5" strokeDasharray={rel.isList ? '6,3' : 'none'} markerEnd="url(#arrowhead)" />
                  </g>
                );
              })}

              {/* Model cards */}
              {parsed.models.map(model => {
                const pos = positions[model.name];
                if (!pos) return null;
                return (
                  <g
                    key={model.name}
                    transform={`translate(${pos.x}, ${pos.y})`}
                    onMouseDown={e => handleMouseDown(e, model.name)}
                    style={{ cursor: dragging === model.name ? 'grabbing' : 'grab' }}
                  >
                    {/* Card background */}
                    <rect
                      width={pos.width}
                      height={pos.height}
                      rx="8"
                      fill="#1e293b"
                      stroke="#334155"
                      strokeWidth="1.5"
                    />
                    {/* Header */}
                    <rect width={pos.width} height={HEADER_HEIGHT} rx="8" fill="#334155" />
                    <rect y={HEADER_HEIGHT - 4} width={pos.width} height={8} fill="#334155" />
                    <text
                      x={pos.width / 2}
                      y={HEADER_HEIGHT / 2 + 5}
                      textAnchor="middle"
                      fill="white"
                      fontSize="13"
                      fontWeight="600"
                      fontFamily="monospace"
                    >
                      {model.name}
                    </text>

                    {/* Fields */}
                    {model.fields.map((field, fi) => {
                      const fy = HEADER_HEIGHT + 4 + fi * FIELD_HEIGHT;
                      const color = getTypeColor(field.type);
                      return (
                        <g key={field.name}>
                          <text x={10} y={fy + 18} fill="#cbd5e1" fontSize="11" fontFamily="monospace">
                            {field.isId ? '🔑 ' : field.isUnique ? '✦ ' : '  '}
                            {field.name}
                            {!field.isRequired && !field.isList ? '?' : ''}
                            {field.isList ? '[]' : ''}
                          </text>
                          <text x={pos.width - 8} y={fy + 18} textAnchor="end" fill={color} fontSize="10" fontFamily="monospace">
                            {field.type}
                          </text>
                          {fi < model.fields.length - 1 && (
                            <line x1={8} y1={fy + FIELD_HEIGHT - 2} x2={pos.width - 8} y2={fy + FIELD_HEIGHT - 2} stroke="#2d3f55" strokeWidth="1" />
                          )}
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Legend */}
          <div class="flex flex-wrap gap-3 text-xs text-text-muted bg-surface border border-border rounded p-3">
            <span class="font-semibold">Field types:</span>
            {[['String','#60a5fa'],['Int/Float','#34d399'],['Boolean','#f59e0b'],['DateTime','#a78bfa'],['Json','#fb923c'],['Relation','#f472b6']].map(([label, color]) => (
              <span key={label} class="flex items-center gap-1">
                <span class="w-2 h-2 rounded-full inline-block" style={{ background: color }} />
                {label}
              </span>
            ))}
            <span class="ml-auto">· · · = list relation</span>
            <span>——— = single relation</span>
          </div>
        </div>
      </div>
    </div>
  );
}
