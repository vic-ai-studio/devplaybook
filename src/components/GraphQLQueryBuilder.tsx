import { useState, useMemo } from 'preact/hooks';

type FieldDef = {
  name: string;
  type: string;
  args?: string;
  description?: string;
};

type TypeDef = {
  name: string;
  fields: FieldDef[];
};

type QueryType = 'query' | 'mutation' | 'subscription';

const EXAMPLE_SCHEMAS: { name: string; sdl: string }[] = [
  {
    name: 'Blog',
    sdl: `type Query {
  posts(limit: Int, offset: Int): [Post!]!
  post(id: ID!): Post
  author(id: ID!): Author
  authors: [Author!]!
}

type Mutation {
  createPost(title: String!, content: String!, authorId: ID!): Post!
  updatePost(id: ID!, title: String, content: String): Post
  deletePost(id: ID!): Boolean!
}

type Post {
  id: ID!
  title: String!
  content: String!
  publishedAt: String
  tags: [String!]!
  author: Author!
}

type Author {
  id: ID!
  name: String!
  email: String!
  bio: String
  posts: [Post!]!
}`,
  },
  {
    name: 'E-commerce',
    sdl: `type Query {
  products(category: String, inStock: Boolean): [Product!]!
  product(id: ID!): Product
  order(id: ID!): Order
  customer(id: ID!): Customer
}

type Mutation {
  addToCart(productId: ID!, quantity: Int!): CartItem!
  checkout(customerId: ID!, items: [CartItemInput!]!): Order!
  updateOrderStatus(orderId: ID!, status: String!): Order!
}

type Product {
  id: ID!
  name: String!
  price: Float!
  description: String
  category: String!
  inStock: Boolean!
  images: [String!]!
}

type Order {
  id: ID!
  status: String!
  total: Float!
  createdAt: String!
  items: [OrderItem!]!
  customer: Customer!
}

type OrderItem {
  product: Product!
  quantity: Int!
  price: Float!
}

type Customer {
  id: ID!
  name: String!
  email: String!
  orders: [Order!]!
}`,
  },
  {
    name: 'GitHub-like',
    sdl: `type Query {
  user(login: String!): User
  repository(owner: String!, name: String!): Repository
  repositories(userId: ID!, first: Int): [Repository!]!
}

type User {
  id: ID!
  login: String!
  name: String
  email: String
  bio: String
  avatarUrl: String!
  repositories: [Repository!]!
  followers: Int!
  following: Int!
}

type Repository {
  id: ID!
  name: String!
  description: String
  isPrivate: Boolean!
  stargazerCount: Int!
  forkCount: Int!
  primaryLanguage: String
  issues: [Issue!]!
  owner: User!
}

type Issue {
  id: ID!
  number: Int!
  title: String!
  body: String
  state: String!
  createdAt: String!
  author: User!
}`,
  },
];

function parseSDL(sdl: string): TypeDef[] {
  const types: TypeDef[] = [];
  const typeRegex = /type\s+(\w+)\s*\{([^}]+)\}/g;
  let match;
  while ((match = typeRegex.exec(sdl)) !== null) {
    const typeName = match[1];
    const body = match[2];
    const fieldRegex = /^\s*(\w+)(\([^)]*\))?\s*:\s*([^\n#]+)/gm;
    const fields: FieldDef[] = [];
    let fmatch;
    while ((fmatch = fieldRegex.exec(body)) !== null) {
      fields.push({
        name: fmatch[1],
        args: fmatch[2]?.replace(/[()]/g, '').trim() || undefined,
        type: fmatch[3].trim(),
      });
    }
    if (fields.length > 0) {
      types.push({ name: typeName, fields });
    }
  }
  return types;
}

function buildQuery(
  opType: QueryType,
  opName: string,
  rootField: string,
  rootArgs: string,
  selectedFields: string[],
  nestedFields: Record<string, string[]>
): string {
  if (!rootField) return '';
  const argsStr = rootArgs.trim() ? `(${rootArgs.trim()})` : '';
  const buildFieldList = (fields: string[], nested: Record<string, string[]>, indent: number): string => {
    const pad = '  '.repeat(indent);
    return fields.map(f => {
      const sub = nested[f];
      if (sub && sub.length > 0) {
        return `${pad}${f} {\n${buildFieldList(sub, {}, indent + 1)}\n${pad}}`;
      }
      return `${pad}${f}`;
    }).join('\n');
  };

  if (selectedFields.length === 0) {
    return `${opType} ${opName} {\n  ${rootField}${argsStr}\n}`;
  }

  const fields = buildFieldList(selectedFields, nestedFields, 2);
  return `${opType} ${opName} {\n  ${rootField}${argsStr} {\n${fields}\n  }\n}`;
}

export default function GraphQLQueryBuilder() {
  const [schemaText, setSchemaText] = useState(EXAMPLE_SCHEMAS[0].sdl);
  const [selectedPreset, setSelectedPreset] = useState(0);
  const [opType, setOpType] = useState<QueryType>('query');
  const [opName, setOpName] = useState('MyQuery');
  const [rootField, setRootField] = useState('');
  const [rootArgs, setRootArgs] = useState('');
  const [selectedFields, setSelectedFields] = useState<string[]>([]);
  const [nestedFields, setNestedFields] = useState<Record<string, string[]>>({});
  const [expandedType, setExpandedType] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<'builder' | 'schema'>('builder');

  const types = useMemo(() => parseSDL(schemaText), [schemaText]);

  const rootTypes = types.filter(t => {
    if (opType === 'query') return t.name === 'Query';
    if (opType === 'mutation') return t.name === 'Mutation';
    if (opType === 'subscription') return t.name === 'Subscription';
    return false;
  });

  const rootTypeDef = rootTypes[0];
  const availableRootFields = rootTypeDef?.fields || [];

  const getReturnType = (field: FieldDef): string => {
    return field.type.replace(/[!\[\]]/g, '').trim();
  };

  const selectedRootField = availableRootFields.find(f => f.name === rootField);
  const returnTypeName = selectedRootField ? getReturnType(selectedRootField) : null;
  const returnType = returnTypeName ? types.find(t => t.name === returnTypeName) : null;

  const handlePresetChange = (idx: number) => {
    setSelectedPreset(idx);
    setSchemaText(EXAMPLE_SCHEMAS[idx].sdl);
    setRootField('');
    setRootArgs('');
    setSelectedFields([]);
    setNestedFields({});
  };

  const handleRootFieldSelect = (name: string) => {
    setRootField(name);
    setSelectedFields([]);
    setNestedFields({});
    const f = availableRootFields.find(x => x.name === name);
    if (f?.args) setRootArgs(f.args.split(',').map(a => a.trim().split(':')[0].trim() + ': ""').join(', '));
    else setRootArgs('');
  };

  const toggleField = (fname: string) => {
    setSelectedFields(prev =>
      prev.includes(fname) ? prev.filter(x => x !== fname) : [...prev, fname]
    );
    setNestedFields(prev => {
      const next = { ...prev };
      delete next[fname];
      return next;
    });
  };

  const toggleNestedField = (parentField: string, nestedF: string) => {
    setNestedFields(prev => {
      const current = prev[parentField] || [];
      return {
        ...prev,
        [parentField]: current.includes(nestedF)
          ? current.filter(x => x !== nestedF)
          : [...current, nestedF],
      };
    });
    if (!selectedFields.includes(parentField)) {
      setSelectedFields(prev => [...prev, parentField]);
    }
  };

  const getNestedType = (fname: string) => {
    if (!returnType) return null;
    const f = returnType.fields.find(x => x.name === fname);
    if (!f) return null;
    const typeName = getReturnType(f);
    return types.find(t => t.name === typeName) || null;
  };

  const generatedQuery = buildQuery(opType, opName, rootField, rootArgs, selectedFields, nestedFields);

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedQuery);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-4">
      {/* Schema presets */}
      <div class="flex gap-2 items-center flex-wrap">
        <span class="text-sm text-text-muted">Schema preset:</span>
        {EXAMPLE_SCHEMAS.map((s, i) => (
          <button
            key={s.name}
            onClick={() => handlePresetChange(i)}
            class={`px-3 py-1 rounded text-sm font-medium transition-colors ${
              selectedPreset === i
                ? 'bg-primary text-white'
                : 'bg-surface text-text-muted hover:bg-surface-hover'
            }`}
          >
            {s.name}
          </button>
        ))}
      </div>

      {/* Tab toggle */}
      <div class="border-b border-border">
        <div class="flex gap-4">
          {(['builder', 'schema'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              class={`pb-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text'
              }`}
            >
              {t === 'builder' ? 'Query Builder' : 'Schema (SDL)'}
            </button>
          ))}
        </div>
      </div>

      {tab === 'schema' && (
        <textarea
          value={schemaText}
          onInput={e => {
            setSchemaText((e.target as HTMLTextAreaElement).value);
            setRootField('');
            setSelectedFields([]);
            setNestedFields({});
          }}
          class="w-full h-72 font-mono text-sm bg-surface border border-border rounded p-3 focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          spellcheck={false}
          placeholder="Paste your GraphQL SDL schema here..."
        />
      )}

      {tab === 'builder' && (
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left: Builder controls */}
          <div class="space-y-4">
            {/* Operation type & name */}
            <div class="flex gap-3 flex-wrap">
              <div>
                <label class="block text-xs text-text-muted mb-1">Operation</label>
                <div class="flex gap-1">
                  {(['query', 'mutation', 'subscription'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => { setOpType(t); setRootField(''); setSelectedFields([]); setNestedFields({}); }}
                      class={`px-2.5 py-1 rounded text-xs font-medium capitalize transition-colors ${
                        opType === t
                          ? 'bg-primary text-white'
                          : 'bg-surface text-text-muted hover:bg-surface-hover'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div class="flex-1 min-w-32">
                <label class="block text-xs text-text-muted mb-1">Name</label>
                <input
                  value={opName}
                  onInput={e => setOpName((e.target as HTMLInputElement).value)}
                  class="w-full font-mono text-sm bg-surface border border-border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            {/* Root field selector */}
            {availableRootFields.length > 0 && (
              <div>
                <label class="block text-xs text-text-muted mb-1">Root field ({opType})</label>
                <div class="space-y-1 max-h-36 overflow-y-auto">
                  {availableRootFields.map(f => (
                    <button
                      key={f.name}
                      onClick={() => handleRootFieldSelect(f.name)}
                      class={`w-full text-left px-2.5 py-1.5 rounded text-sm flex items-center justify-between transition-colors ${
                        rootField === f.name
                          ? 'bg-primary/20 text-primary border border-primary/40'
                          : 'bg-surface hover:bg-surface-hover border border-border'
                      }`}
                    >
                      <span class="font-mono">{f.name}{f.args ? `(…)` : ''}</span>
                      <span class="text-xs text-text-muted font-mono">{f.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Args input */}
            {rootField && selectedRootField?.args && (
              <div>
                <label class="block text-xs text-text-muted mb-1">Arguments</label>
                <input
                  value={rootArgs}
                  onInput={e => setRootArgs((e.target as HTMLInputElement).value)}
                  placeholder={selectedRootField.args}
                  class="w-full font-mono text-xs bg-surface border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            )}

            {/* Field selector */}
            {returnType && (
              <div>
                <label class="block text-xs text-text-muted mb-1">
                  Fields on <span class="font-mono text-primary">{returnTypeName}</span>
                </label>
                <div class="space-y-1 max-h-48 overflow-y-auto">
                  {returnType.fields.map(f => {
                    const nested = getNestedType(f.name);
                    const isSelected = selectedFields.includes(f.name);
                    const nestedSubs = nestedFields[f.name] || [];
                    return (
                      <div key={f.name}>
                        <div
                          class={`flex items-center gap-2 px-2.5 py-1.5 rounded border cursor-pointer transition-colors ${
                            isSelected
                              ? 'bg-primary/10 border-primary/30'
                              : 'bg-surface border-border hover:bg-surface-hover'
                          }`}
                          onClick={() => {
                            if (nested) setExpandedType(expandedType === f.name ? null : f.name);
                            else toggleField(f.name);
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleField(f.name)}
                            onClick={e => e.stopPropagation()}
                            class="rounded"
                          />
                          <span class="font-mono text-sm">{f.name}</span>
                          <span class="text-xs text-text-muted ml-auto font-mono">{f.type}</span>
                          {nested && <span class="text-xs text-text-muted">{expandedType === f.name ? '▲' : '▼'}</span>}
                        </div>
                        {nested && expandedType === f.name && (
                          <div class="ml-4 mt-1 space-y-0.5 border-l-2 border-primary/20 pl-2">
                            {nested.fields.map(nf => (
                              <div
                                key={nf.name}
                                class={`flex items-center gap-2 px-2 py-1 rounded text-xs cursor-pointer transition-colors ${
                                  nestedSubs.includes(nf.name)
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-text-muted hover:bg-surface'
                                }`}
                                onClick={() => toggleNestedField(f.name, nf.name)}
                              >
                                <input
                                  type="checkbox"
                                  checked={nestedSubs.includes(nf.name)}
                                  onChange={() => toggleNestedField(f.name, nf.name)}
                                  onClick={e => e.stopPropagation()}
                                  class="rounded"
                                />
                                <span class="font-mono">{nf.name}</span>
                                <span class="ml-auto font-mono text-text-muted">{nf.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {!rootTypeDef && (
              <p class="text-sm text-text-muted bg-surface rounded p-3">
                No <code class="font-mono text-xs">{opType === 'query' ? 'Query' : opType === 'mutation' ? 'Mutation' : 'Subscription'}</code> type found in schema.
                Switch to the Schema tab to add one.
              </p>
            )}
          </div>

          {/* Right: Generated query */}
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="text-sm font-medium">Generated Query</label>
              <button
                onClick={handleCopy}
                disabled={!generatedQuery}
                class="px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary/80 transition-colors disabled:opacity-40"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            <pre class="bg-surface border border-border rounded p-4 text-sm font-mono overflow-auto min-h-48 max-h-80 text-text whitespace-pre">
              {generatedQuery || '# Select a root field to start building your query'}
            </pre>

            {generatedQuery && (
              <div class="mt-3 p-3 bg-surface rounded text-xs text-text-muted space-y-1">
                <div>Lines: <span class="font-mono">{generatedQuery.split('\n').length}</span></div>
                <div>Fields selected: <span class="font-mono">{selectedFields.length}</span></div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
