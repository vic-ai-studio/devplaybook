import { useState, useCallback } from 'preact/hooks';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GqlField {
  name: string;
  rawType: string;       // e.g. "String!", "[Post!]!", "Address"
  baseType: string;      // e.g. "String", "Post", "Address"
  isScalar: boolean;
  isList: boolean;
  isNonNull: boolean;
}

interface GqlType {
  kind: 'type' | 'interface';
  name: string;
  interfaces: string[];  // implements X & Y
  fields: GqlField[];
}

interface GqlUnion {
  kind: 'union';
  name: string;
  members: string[];
}

type GqlDef = GqlType | GqlUnion;

// ─── Scalar detection ─────────────────────────────────────────────────────────

const BUILT_IN_SCALARS = new Set([
  'String', 'Int', 'Float', 'Boolean', 'ID',
  'Date', 'DateTime', 'Time', 'JSON', 'Upload',
  'BigInt', 'Long', 'Byte', 'Short', 'Decimal',
  'UUID', 'URL', 'EmailAddress', 'PhoneNumber',
]);

function isScalarType(name: string, knownTypes: Set<string>): boolean {
  return BUILT_IN_SCALARS.has(name) || !knownTypes.has(name);
}

// ─── Parser ───────────────────────────────────────────────────────────────────

function stripComments(sdl: string): string {
  // Remove # line comments, but preserve string content (simplistic — good enough for SDL)
  return sdl.replace(/#[^\n]*/g, '');
}

function extractBaseType(rawType: string): string {
  // Strip !, [...], nested brackets
  return rawType.replace(/[\[\]!]/g, '').trim();
}

function parseField(line: string): GqlField | null {
  // Match: fieldName: TypeExpression (ignore arguments for simplicity)
  // fieldName(args...): Type  → strip args
  const withoutArgs = line.replace(/\([^)]*\)/g, '').trim();
  const match = withoutArgs.match(/^(\w+)\s*:\s*(.+)$/);
  if (!match) return null;
  const [, name, rawType] = match;
  const trimmed = rawType.trim();
  const baseType = extractBaseType(trimmed);
  return {
    name,
    rawType: trimmed,
    baseType,
    isScalar: false,       // resolved later
    isList: trimmed.includes('['),
    isNonNull: trimmed.endsWith('!'),
  };
}

function parseSDL(sdl: string): GqlDef[] {
  const clean = stripComments(sdl);
  const defs: GqlDef[] = [];

  // ── Union definitions ──────────────────────────────────────────────────────
  const unionRe = /union\s+(\w+)\s*=\s*([^{]+?)(?=\s*(?:type|interface|union|input|enum|scalar|directive|extend|$))/gs;
  let m: RegExpExecArray | null;
  while ((m = unionRe.exec(clean)) !== null) {
    const members = m[2].split('|').map(s => s.trim()).filter(Boolean);
    defs.push({ kind: 'union', name: m[1], members });
  }

  // ── Object / Interface type definitions ────────────────────────────────────
  const typeRe = /(type|interface)\s+(\w+)(?:\s+implements\s+([\w\s&]+))?\s*\{([^}]*)\}/gs;
  while ((m = typeRe.exec(clean)) !== null) {
    const [, keyword, typeName, implRaw, body] = m;
    if (typeName === 'Query' || typeName === 'Mutation' || typeName === 'Subscription') continue;

    const interfaces = implRaw
      ? implRaw.split('&').map(s => s.trim()).filter(Boolean)
      : [];

    const fields: GqlField[] = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const field = parseField(trimmed);
      if (field) fields.push(field);
    }

    defs.push({
      kind: keyword as 'type' | 'interface',
      name: typeName,
      interfaces,
      fields,
    });
  }

  return defs;
}

// ─── Fragment generator ───────────────────────────────────────────────────────

interface GenerateOptions {
  includeNested: boolean;
  includeTypename: boolean;
  prefix: string;
}

function generateFragments(defs: GqlDef[], options: GenerateOptions): string {
  const { includeNested, includeTypename, prefix } = options;

  // Build a map of type name → definition
  const typeMap = new Map<string, GqlDef>();
  for (const def of defs) typeMap.set(def.name, def);

  const knownTypes = new Set(typeMap.keys());
  const lines: string[] = [];
  const generated = new Set<string>();

  function fragmentName(typeName: string): string {
    return `${prefix}${typeName}Fields`;
  }

  function renderType(def: GqlDef, depth = 0): void {
    if (generated.has(def.name)) return;
    generated.add(def.name);

    if (def.kind === 'union') {
      // Inline fragment spread for union
      const fragName = fragmentName(def.name);
      lines.push(`fragment ${fragName} on ${def.name} {`);
      if (includeTypename) lines.push('  __typename');
      for (const member of def.members) {
        lines.push(`  ... on ${member} {`);
        const memberDef = typeMap.get(member);
        if (memberDef && memberDef.kind !== 'union') {
          const memberFields = (memberDef as GqlType).fields;
          for (const f of memberFields) {
            const scalar = isScalarType(f.baseType, knownTypes);
            if (scalar) {
              lines.push(`    ${f.name}`);
            } else if (includeNested) {
              lines.push(`    ${f.name} {`);
              lines.push(`      ...${fragmentName(f.baseType)}`);
              lines.push(`    }`);
            }
          }
        } else {
          lines.push(`    id`);
        }
        lines.push(`  }`);
      }
      lines.push(`}`);
      lines.push('');

      // Generate member fragments if needed
      if (includeNested) {
        for (const member of def.members) {
          const memberDef = typeMap.get(member);
          if (memberDef && !generated.has(member)) renderType(memberDef, depth + 1);
        }
      }
      return;
    }

    // Object type / interface
    const typeDef = def as GqlType;
    const fragName = fragmentName(typeDef.name);
    const nestedToGenerate: string[] = [];

    lines.push(`fragment ${fragName} on ${typeDef.name} {`);
    if (includeTypename) lines.push('  __typename');

    for (const field of typeDef.fields) {
      const scalar = isScalarType(field.baseType, knownTypes);
      if (scalar) {
        lines.push(`  ${field.name}`);
      } else {
        const nested = typeMap.get(field.baseType);
        if (!nested) {
          // Unknown type — treat as scalar leaf
          lines.push(`  ${field.name}`);
        } else if (!includeNested) {
          // Don't expand — comment hint
          lines.push(`  # ${field.name} { ... } # expand with nested option`);
        } else {
          // Inline: use separate fragment spread
          lines.push(`  ${field.name} {`);
          lines.push(`    ...${fragmentName(field.baseType)}`);
          lines.push(`  }`);
          nestedToGenerate.push(field.baseType);
        }
      }
    }

    lines.push(`}`);
    lines.push('');

    // Generate nested fragments (after parent to keep ordering readable)
    if (includeNested) {
      for (const nestedName of nestedToGenerate) {
        const nestedDef = typeMap.get(nestedName);
        if (nestedDef && !generated.has(nestedName)) renderType(nestedDef, depth + 1);
      }
    }
  }

  for (const def of defs) renderType(def);

  return lines.join('\n').trimEnd();
}

// ─── Default example schema ───────────────────────────────────────────────────

const EXAMPLE_SCHEMA = `type User {
  id: ID!
  name: String!
  email: String!
  avatarUrl: String
  bio: String
  createdAt: DateTime!
  updatedAt: DateTime!
  address: Address
  posts: [Post!]!
  role: UserRole
}

type Address {
  id: ID!
  street: String!
  city: String!
  state: String
  country: String!
  postalCode: String
}

type Post {
  id: ID!
  title: String!
  slug: String!
  excerpt: String
  body: String!
  publishedAt: DateTime
  tags: [String!]!
  author: User!
  comments: [Comment!]!
}

type Comment {
  id: ID!
  body: String!
  createdAt: DateTime!
  author: User!
}

interface Node {
  id: ID!
}

union SearchResult = User | Post | Comment
`.trim();

// ─── Component ────────────────────────────────────────────────────────────────

export default function GraphqlFragmentGenerator() {
  const [schema, setSchema] = useState(EXAMPLE_SCHEMA);
  const [includeNested, setIncludeNested] = useState(true);
  const [includeTypename, setIncludeTypename] = useState(false);
  const [prefix, setPrefix] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [parseInfo, setParseInfo] = useState<{ types: number; unions: number; interfaces: number } | null>(null);

  const generate = useCallback(() => {
    setError('');
    setCopied(false);
    try {
      if (!schema.trim()) {
        setError('Paste a GraphQL schema to generate fragments.');
        setOutput('');
        setParseInfo(null);
        return;
      }
      const defs = parseSDL(schema);
      if (defs.length === 0) {
        setError('No type definitions found. Make sure your schema uses standard SDL syntax (type Foo { ... }).');
        setOutput('');
        setParseInfo(null);
        return;
      }
      const types = defs.filter(d => d.kind === 'type').length;
      const interfaces = defs.filter(d => d.kind === 'interface').length;
      const unions = defs.filter(d => d.kind === 'union').length;
      setParseInfo({ types, unions, interfaces });

      const result = generateFragments(defs, { includeNested, includeTypename, prefix: prefix.trim() });
      setOutput(result || '# No fragments could be generated from this schema.');
    } catch (e: any) {
      setError(`Parse error: ${e?.message ?? String(e)}`);
      setOutput('');
      setParseInfo(null);
    }
  }, [schema, includeNested, includeTypename, prefix]);

  const copyOutput = useCallback(() => {
    if (!output) return;
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [output]);

  return (
    <div class="space-y-5">
      {/* Schema input */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-1">GraphQL Schema SDL</h2>
        <p class="text-xs text-text-muted mb-3">
          Paste your GraphQL SDL — <code class="font-mono bg-bg px-1 rounded">type</code>,{' '}
          <code class="font-mono bg-bg px-1 rounded">interface</code>, and{' '}
          <code class="font-mono bg-bg px-1 rounded">union</code> definitions are all supported.
          Comments (<code class="font-mono bg-bg px-1 rounded">#</code>) are stripped automatically.
        </p>
        <textarea
          class="w-full bg-bg border border-border rounded-lg px-3 py-3 font-mono text-sm text-text focus:ring-2 focus:ring-primary resize-y"
          rows={18}
          spellcheck={false}
          value={schema}
          onInput={(e) => setSchema((e.target as HTMLTextAreaElement).value)}
          placeholder="type User { id: ID! name: String! email: String! }"
        />
      </div>

      {/* Options */}
      <div class="bg-bg-card border border-border rounded-xl p-5">
        <h2 class="text-base font-semibold mb-4">Fragment Options</h2>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {/* Nested types */}
          <label class="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              class="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
              checked={includeNested}
              onChange={(e) => setIncludeNested((e.target as HTMLInputElement).checked)}
            />
            <div>
              <div class="text-sm font-medium group-hover:text-primary transition-colors">Expand nested types</div>
              <div class="text-xs text-text-muted mt-0.5">
                Generate separate fragments for nested object types and spread them inline
              </div>
            </div>
          </label>

          {/* __typename */}
          <label class="flex items-start gap-3 cursor-pointer group">
            <input
              type="checkbox"
              class="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
              checked={includeTypename}
              onChange={(e) => setIncludeTypename((e.target as HTMLInputElement).checked)}
            />
            <div>
              <div class="text-sm font-medium group-hover:text-primary transition-colors">Include __typename</div>
              <div class="text-xs text-text-muted mt-0.5">
                Adds <code class="font-mono bg-bg px-0.5 rounded">__typename</code> to every fragment — useful for Apollo cache normalization
              </div>
            </div>
          </label>

          {/* Prefix */}
          <div>
            <label class="block text-sm font-medium mb-1">Fragment name prefix</label>
            <input
              type="text"
              class="w-full bg-bg border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary"
              placeholder="e.g. Core, Base, My"
              value={prefix}
              onInput={(e) => setPrefix((e.target as HTMLInputElement).value)}
            />
            <p class="text-xs text-text-muted mt-1">
              Result: <code class="font-mono bg-bg px-1 rounded">{prefix ? `${prefix.trim()}UserFields` : 'UserFields'}</code>
            </p>
          </div>
        </div>

        <div class="mt-5">
          <button
            onClick={generate}
            class="bg-accent hover:bg-accent-hover text-white px-5 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            Generate Fragments
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div class="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Parse summary */}
      {parseInfo && (
        <div class="flex flex-wrap gap-3">
          {parseInfo.types > 0 && (
            <span class="bg-blue-500/10 text-blue-400 text-xs font-medium px-3 py-1 rounded-full border border-blue-500/20">
              {parseInfo.types} object type{parseInfo.types !== 1 ? 's' : ''}
            </span>
          )}
          {parseInfo.interfaces > 0 && (
            <span class="bg-purple-500/10 text-purple-400 text-xs font-medium px-3 py-1 rounded-full border border-purple-500/20">
              {parseInfo.interfaces} interface{parseInfo.interfaces !== 1 ? 's' : ''}
            </span>
          )}
          {parseInfo.unions > 0 && (
            <span class="bg-amber-500/10 text-amber-400 text-xs font-medium px-3 py-1 rounded-full border border-amber-500/20">
              {parseInfo.unions} union{parseInfo.unions !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      )}

      {/* Output */}
      {output && (
        <div class="bg-bg-card border border-border rounded-xl p-5">
          <div class="flex items-center justify-between mb-3 flex-wrap gap-3">
            <h2 class="text-base font-semibold">Generated Fragments</h2>
            <button
              onClick={copyOutput}
              class={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-bg border-border hover:border-primary text-text-muted hover:text-text'
              }`}
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="font-mono text-sm bg-bg p-4 rounded-lg border border-border overflow-x-auto whitespace-pre leading-relaxed max-h-[520px] overflow-y-auto">
            <code>{output}</code>
          </pre>
          <p class="text-xs text-text-muted mt-3">
            Paste these fragments into your GraphQL client (Apollo, urql, URQL, Relay, etc.) and spread them in your queries with <code class="font-mono bg-bg px-1 rounded">...{prefix || ''}UserFields</code>.
          </p>
        </div>
      )}
    </div>
  );
}
