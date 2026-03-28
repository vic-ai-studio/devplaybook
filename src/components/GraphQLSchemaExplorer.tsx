import { useState, useMemo } from 'preact/hooks';

// ── Types ────────────────────────────────────────────────────────────────────

interface GqlField {
  name: string;
  type: string;
  required: boolean;
  description: string;
  args: string;
}

interface GqlType {
  name: string;
  kind: 'query' | 'mutation' | 'subscription' | 'object' | 'input' | 'enum' | 'scalar' | 'interface' | 'union';
  description: string;
  fields: GqlField[];
  rawBlock: string;
}

type GroupKey = 'query' | 'mutation' | 'subscription' | 'object' | 'input' | 'enum' | 'scalar' | 'interface' | 'union';

const GROUP_LABELS: Record<GroupKey, string> = {
  query: 'Query',
  mutation: 'Mutation',
  subscription: 'Subscription',
  object: 'Object Types',
  input: 'Input Types',
  enum: 'Enum Types',
  scalar: 'Scalar Types',
  interface: 'Interfaces & Unions',
  union: 'Interfaces & Unions',
};

const GROUP_ORDER: GroupKey[] = ['query', 'mutation', 'subscription', 'object', 'input', 'enum', 'scalar', 'interface', 'union'];

// ── SDL Parser ────────────────────────────────────────────────────────────────

function stripBlockComments(sdl: string): string {
  // Remove block strings used as stand-alone comments (not doc-comments)
  return sdl.replace(/"""[\s\S]*?"""/g, (match) => {
    // count newlines so line numbers are preserved
    const newlines = (match.match(/\n/g) || []).length;
    return '\n'.repeat(newlines);
  });
}

function extractDocComment(block: string, beforeIndex: number): string {
  // Look backwards from beforeIndex for """ ... """ or # comments
  const before = block.slice(0, beforeIndex);
  // Triple-quote doc comment immediately before
  const tripleMatch = before.match(/"""([\s\S]*?)"""\s*$/);
  if (tripleMatch) return tripleMatch[1].trim();
  // Hash comments on consecutive preceding lines
  const lines = before.split('\n');
  const commentLines: string[] = [];
  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('#')) {
      commentLines.unshift(trimmed.slice(1).trim());
    } else if (trimmed === '') {
      continue;
    } else {
      break;
    }
  }
  return commentLines.join(' ');
}

function parseFieldType(raw: string): { type: string; required: boolean } {
  const trimmed = raw.trim();
  const required = trimmed.endsWith('!');
  const type = required ? trimmed.slice(0, -1).trim() : trimmed;
  return { type, required };
}

function parseFields(body: string): GqlField[] {
  const fields: GqlField[] = [];
  // Match field definitions: optional doc comment, name, optional args, colon, type
  // Pattern: fieldName(args...): Type
  const fieldRegex = /(?:"""([\s\S]*?)"""\s*)?(\w+)(\([^)]*\))?\s*:\s*(\[?\w+\]?!?)/g;
  let match: RegExpExecArray | null;

  while ((match = fieldRegex.exec(body)) !== null) {
    const docComment = match[1] ? match[1].trim() : extractDocComment(body, match.index);
    const name = match[2];
    const argsRaw = match[3] ? match[3].slice(1, -1).trim() : '';
    const typeRaw = match[4];
    const { type, required } = parseFieldType(typeRaw);

    // Build args string for display
    let args = '';
    if (argsRaw) {
      const argParts = argsRaw.split(/\s*,\s*|\n/).map(a => a.trim()).filter(Boolean);
      args = argParts.join(', ');
    }

    fields.push({ name, type, required, description: docComment, args });
  }
  return fields;
}

function parseEnumValues(body: string): GqlField[] {
  const values: GqlField[] = [];
  const lines = body.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('"')) continue;
    const valueMatch = trimmed.match(/^([A-Z_][A-Z0-9_]*)$/);
    if (valueMatch) {
      values.push({ name: valueMatch[1], type: 'enum value', required: false, description: '', args: '' });
    }
  }
  return values;
}

function parseSdl(sdl: string): GqlType[] {
  const types: GqlType[] = [];
  if (!sdl.trim()) return types;

  // Match top-level type declarations
  // Support: type, input, enum, interface, union, scalar — with optional doc strings before them
  const topLevelRegex = /(?:"""([\s\S]*?)"""\s*)?(type|input|enum|interface|union|scalar)\s+(\w+)(?:\s+implements\s+[\w&\s]+)?\s*(?:\{([\s\S]*?)\})?/g;

  let match: RegExpExecArray | null;
  while ((match = topLevelRegex.exec(sdl)) !== null) {
    const docComment = match[1] ? match[1].trim() : extractDocComment(sdl, match.index);
    const keyword = match[2];
    const name = match[3];
    const body = match[4] || '';

    let kind: GqlType['kind'];
    let fields: GqlField[];

    if (keyword === 'scalar') {
      kind = 'scalar';
      fields = [];
    } else if (keyword === 'union') {
      kind = 'union';
      // union members are after = sign
      const unionMatch = sdl.slice(match.index, match.index + match[0].length + 100).match(/=\s*([\w\s|]+)/);
      const members = unionMatch
        ? unionMatch[1].split('|').map(m => m.trim()).filter(Boolean).map(m => ({
            name: m, type: 'union member', required: false, description: '', args: ''
          }))
        : [];
      fields = members;
    } else if (keyword === 'enum') {
      kind = 'enum';
      fields = parseEnumValues(body);
    } else if (keyword === 'input') {
      kind = 'input';
      fields = parseFields(body);
    } else if (keyword === 'interface') {
      kind = 'interface';
      fields = parseFields(body);
    } else {
      // type — check for Query/Mutation/Subscription root types
      if (name === 'Query') kind = 'query';
      else if (name === 'Mutation') kind = 'mutation';
      else if (name === 'Subscription') kind = 'subscription';
      else kind = 'object';
      fields = parseFields(body);
    }

    types.push({
      name,
      kind,
      description: docComment,
      fields,
      rawBlock: match[0],
    });
  }

  return types;
}

// ── Sample Schema ─────────────────────────────────────────────────────────────

const SAMPLE_SCHEMA = `"""
E-commerce & Blog GraphQL Schema
A realistic example with products, orders, users, and blog posts.
"""

scalar DateTime
scalar JSON

"""
Supported currencies for pricing
"""
enum Currency {
  USD
  EUR
  GBP
  JPY
}

"""
Order fulfilment status
"""
enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
}

"""
Represents a registered user account
"""
type User {
  id: ID!
  email: String!
  username: String!
  displayName: String
  avatarUrl: String
  createdAt: DateTime!
  updatedAt: DateTime!
  orders: [Order!]!
  posts: [BlogPost!]!
}

"""
A product available for purchase
"""
type Product {
  id: ID!
  slug: String!
  name: String!
  description: String
  price: Float!
  currency: Currency!
  stockQty: Int!
  tags: [String!]!
  category: Category
  images: [String!]!
  createdAt: DateTime!
}

"""
Product category (supports nesting via parent)
"""
type Category {
  id: ID!
  name: String!
  slug: String!
  parent: Category
  children: [Category!]!
}

"""
A line item within an order
"""
type OrderItem {
  id: ID!
  product: Product!
  quantity: Int!
  unitPrice: Float!
  total: Float!
}

"""
A customer purchase order
"""
type Order {
  id: ID!
  user: User!
  items: [OrderItem!]!
  status: OrderStatus!
  total: Float!
  currency: Currency!
  createdAt: DateTime!
  updatedAt: DateTime!
}

"""
A blog post authored by a user
"""
type BlogPost {
  id: ID!
  slug: String!
  title: String!
  excerpt: String
  content: String!
  author: User!
  tags: [String!]!
  published: Boolean!
  publishedAt: DateTime
  viewCount: Int!
}

"""
Paginated list of products
"""
type ProductConnection {
  nodes: [Product!]!
  totalCount: Int!
  hasNextPage: Boolean!
  endCursor: String
}

"""
Paginated list of blog posts
"""
type PostConnection {
  nodes: [BlogPost!]!
  totalCount: Int!
  hasNextPage: Boolean!
}

"""
Input for creating a new user
"""
input CreateUserInput {
  email: String!
  username: String!
  password: String!
  displayName: String
}

"""
Input for placing a new order
"""
input PlaceOrderInput {
  items: [OrderItemInput!]!
  currency: Currency
}

input OrderItemInput {
  productId: ID!
  quantity: Int!
}

"""
Input for creating or updating a blog post
"""
input BlogPostInput {
  title: String!
  content: String!
  excerpt: String
  tags: [String!]
  published: Boolean
}

type Query {
  me: User
  user(id: ID!): User
  product(id: ID, slug: String): Product
  products(first: Int, after: String, tag: String, categoryId: ID): ProductConnection!
  categories: [Category!]!
  order(id: ID!): Order
  myOrders(status: OrderStatus): [Order!]!
  post(id: ID, slug: String): BlogPost
  posts(first: Int, after: String, tag: String, published: Boolean): PostConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, displayName: String, avatarUrl: String): User!
  placeOrder(input: PlaceOrderInput!): Order!
  cancelOrder(orderId: ID!): Order!
  createPost(input: BlogPostInput!): BlogPost!
  updatePost(id: ID!, input: BlogPostInput!): BlogPost!
  deletePost(id: ID!): Boolean!
}

type Subscription {
  orderUpdated(orderId: ID!): Order!
  newPost(tag: String): BlogPost!
}

union SearchResult = Product | BlogPost | User
`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const KIND_BADGE: Record<string, string> = {
  query: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  mutation: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  subscription: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  object: 'bg-green-500/20 text-green-400 border-green-500/30',
  input: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  enum: 'bg-pink-500/20 text-pink-400 border-pink-500/30',
  scalar: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  interface: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
  union: 'bg-teal-500/20 text-teal-400 border-teal-500/30',
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function GraphQLSchemaExplorer() {
  const [schema, setSchema] = useState(SAMPLE_SCHEMA);
  const [selectedType, setSelectedType] = useState<string | null>('Query');
  const [search, setSearch] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedField, setCopiedField] = useState(false);

  const types = useMemo<GqlType[]>(() => parseSdl(schema), [schema]);

  const filteredTypes = useMemo<GqlType[]>(() => {
    if (!search.trim()) return types;
    const q = search.toLowerCase();
    return types.filter(t => t.name.toLowerCase().includes(q));
  }, [types, search]);

  const selectedTypeObj = useMemo<GqlType | null>(
    () => types.find(t => t.name === selectedType) ?? null,
    [types, selectedType]
  );

  // Group filtered types, but merge 'union' into 'interface' bucket for display
  const groups = useMemo<Partial<Record<GroupKey, GqlType[]>>>(() => {
    const g: Partial<Record<GroupKey, GqlType[]>> = {};
    for (const t of filteredTypes) {
      const key: GroupKey = t.kind === 'union' ? 'interface' : t.kind;
      if (!g[key]) g[key] = [];
      g[key]!.push(t);
    }
    return g;
  }, [filteredTypes]);

  const copySchema = () => {
    navigator.clipboard.writeText(schema).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const copyTypeBlock = () => {
    if (!selectedTypeObj) return;
    navigator.clipboard.writeText(selectedTypeObj.rawBlock).then(() => {
      setCopiedField(true);
      setTimeout(() => setCopiedField(false), 1500);
    });
  };

  const typeCount = types.length;

  return (
    <div class="space-y-4">
      {/* Toolbar */}
      <div class="flex flex-wrap gap-3 items-center">
        <div class="flex items-center gap-2 text-sm text-text-muted">
          <span class="font-medium text-text">{typeCount}</span> types parsed
        </div>
        <button
          onClick={() => { setSchema(SAMPLE_SCHEMA); setSelectedType('Query'); setSearch(''); }}
          class="ml-auto text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
        >
          Load Sample
        </button>
        <button
          onClick={copySchema}
          class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy SDL'}
        </button>
        <button
          onClick={() => { setSchema(''); setSelectedType(null); setSearch(''); }}
          class="text-xs bg-bg-card border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
        >
          Clear
        </button>
      </div>

      {/* Schema input */}
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">GraphQL SDL Schema</label>
        <textarea
          class="w-full h-40 bg-bg-card border border-border rounded-lg p-3 font-mono text-xs text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="Paste your GraphQL SDL schema here..."
          value={schema}
          onInput={(e) => {
            setSchema((e.target as HTMLTextAreaElement).value);
            setSelectedType(null);
          }}
          spellcheck={false}
        />
        <p class="text-xs text-text-muted mt-1">{schema.split('\n').length} lines · {schema.length} chars</p>
      </div>

      {typeCount === 0 && schema.trim() && (
        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3 text-sm text-yellow-400">
          No types found. Make sure your SDL uses standard GraphQL syntax (type, input, enum, interface, union, scalar).
        </div>
      )}

      {typeCount > 0 && (
        <div class="flex flex-col md:flex-row gap-4 min-h-[520px]">
          {/* Sidebar */}
          <div class="md:w-56 shrink-0 flex flex-col gap-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Filter types..."
              value={search}
              onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
              class="w-full bg-bg-card border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-text-muted focus:outline-none focus:border-primary transition-colors"
            />

            <div class="bg-bg-card border border-border rounded-lg overflow-hidden flex-1 overflow-y-auto max-h-[460px]">
              {GROUP_ORDER.filter(gk => groups[gk]?.length).map(gk => {
                const groupTypes = groups[gk]!;
                return (
                  <div key={gk}>
                    <div class="px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-muted bg-bg border-b border-border">
                      {GROUP_LABELS[gk]}
                      <span class="ml-1.5 text-text-muted/60">({groupTypes.length})</span>
                    </div>
                    {groupTypes.map(t => (
                      <button
                        key={t.name}
                        onClick={() => setSelectedType(t.name)}
                        class={`w-full text-left px-3 py-2 text-sm transition-colors border-b border-border/50 last:border-0 ${
                          selectedType === t.name
                            ? 'bg-primary/10 text-primary border-l-2 border-l-primary'
                            : 'text-text hover:bg-bg hover:text-primary'
                        }`}
                      >
                        {t.name}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Detail panel */}
          <div class="flex-1 bg-bg-card border border-border rounded-lg overflow-hidden flex flex-col">
            {selectedTypeObj ? (
              <>
                {/* Type header */}
                <div class="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap">
                      <h2 class="text-lg font-bold text-text font-mono">{selectedTypeObj.name}</h2>
                      <span class={`text-xs px-2 py-0.5 rounded-full border ${KIND_BADGE[selectedTypeObj.kind] || KIND_BADGE.object}`}>
                        {selectedTypeObj.kind}
                      </span>
                    </div>
                    {selectedTypeObj.description && (
                      <p class="text-sm text-text-muted mt-1">{selectedTypeObj.description}</p>
                    )}
                    <p class="text-xs text-text-muted/60 mt-1">
                      {selectedTypeObj.fields.length} {selectedTypeObj.kind === 'enum' ? 'values' : selectedTypeObj.kind === 'union' ? 'members' : 'fields'}
                    </p>
                  </div>
                  <button
                    onClick={copyTypeBlock}
                    class="shrink-0 text-xs bg-bg border border-border px-3 py-1.5 rounded hover:border-primary hover:text-primary transition-colors"
                  >
                    {copiedField ? '✓ Copied' : 'Copy SDL'}
                  </button>
                </div>

                {/* Fields list */}
                <div class="flex-1 overflow-y-auto">
                  {selectedTypeObj.fields.length === 0 ? (
                    <p class="px-5 py-6 text-sm text-text-muted italic">
                      {selectedTypeObj.kind === 'scalar' ? 'Scalar type — no fields.' : 'No fields found.'}
                    </p>
                  ) : (
                    <table class="w-full text-sm">
                      <thead class="sticky top-0 bg-bg-card border-b border-border">
                        <tr>
                          <th class="text-left px-5 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide w-1/3">
                            {selectedTypeObj.kind === 'enum' ? 'Value' : 'Field'}
                          </th>
                          {selectedTypeObj.kind !== 'enum' && (
                            <th class="text-left px-3 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide w-1/3">Type</th>
                          )}
                          <th class="text-left px-3 py-2.5 text-xs font-semibold text-text-muted uppercase tracking-wide">
                            {selectedTypeObj.kind === 'enum' ? '' : 'Description'}
                          </th>
                        </tr>
                      </thead>
                      <tbody class="divide-y divide-border/50">
                        {selectedTypeObj.fields.map((field, i) => (
                          <tr key={i} class="hover:bg-bg transition-colors">
                            <td class="px-5 py-3 align-top">
                              <div class="flex items-start gap-1 flex-col">
                                <code class="font-mono text-sm text-text font-medium">{field.name}</code>
                                {field.args && (
                                  <span class="text-xs text-text-muted/70 font-mono">({field.args})</span>
                                )}
                              </div>
                            </td>
                            {selectedTypeObj.kind !== 'enum' && (
                              <td class="px-3 py-3 align-top">
                                <div class="flex items-center gap-1.5 flex-wrap">
                                  <code class="font-mono text-xs text-primary">{field.type}</code>
                                  {field.required ? (
                                    <span class="text-xs px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/20">required</span>
                                  ) : (
                                    <span class="text-xs px-1.5 py-0.5 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">optional</span>
                                  )}
                                </div>
                              </td>
                            )}
                            <td class="px-3 py-3 align-top text-xs text-text-muted">
                              {field.description || (selectedTypeObj.kind === 'enum' ? '' : <span class="italic text-text-muted/40">—</span>)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Raw SDL block */}
                <div class="border-t border-border">
                  <details class="group">
                    <summary class="px-5 py-2.5 text-xs text-text-muted cursor-pointer hover:text-primary transition-colors select-none">
                      Raw SDL
                    </summary>
                    <pre class="px-5 pb-4 text-xs font-mono text-text overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">{selectedTypeObj.rawBlock.trim()}</pre>
                  </details>
                </div>
              </>
            ) : (
              <div class="flex flex-col items-center justify-center h-full py-20 text-text-muted">
                <div class="text-4xl mb-3 opacity-30">⬡</div>
                <p class="text-sm">Select a type from the sidebar to explore its fields</p>
                <p class="text-xs mt-1 opacity-60">{typeCount} types available</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Type overview chips when nothing selected */}
      {typeCount > 0 && !selectedTypeObj && !search && (
        <div class="bg-bg-card border border-border rounded-lg p-4">
          <p class="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">All Types</p>
          <div class="flex flex-wrap gap-2">
            {types.map(t => (
              <button
                key={t.name}
                onClick={() => setSelectedType(t.name)}
                class={`text-xs px-2.5 py-1 rounded-full border transition-colors hover:opacity-80 ${KIND_BADGE[t.kind] || KIND_BADGE.object}`}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
