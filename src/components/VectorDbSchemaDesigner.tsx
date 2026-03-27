import { useState } from 'preact/hooks';

type VectorDB = 'pinecone' | 'weaviate' | 'qdrant';
type Dimension = 128 | 256 | 384 | 768 | 1024 | 1536 | 3072;
type DistanceMetric = 'cosine' | 'euclidean' | 'dot';
type FieldType = 'string' | 'number' | 'boolean' | 'array';

interface MetadataField {
  id: string;
  name: string;
  type: FieldType;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

const DIMENSIONS: Dimension[] = [128, 256, 384, 768, 1024, 1536, 3072];

const DIM_MODELS: Record<Dimension, string> = {
  128: 'FastEmbed small, custom models',
  256: 'Cohere embed-light',
  384: 'all-MiniLM-L6-v2 (sentence-transformers)',
  768: 'all-mpnet-base-v2, nomic-embed-text',
  1024: 'Cohere embed-v3, Mistral embed',
  1536: 'OpenAI text-embedding-3-small / ada-002',
  3072: 'OpenAI text-embedding-3-large',
};

const DISTANCE_LABELS: Record<DistanceMetric, string> = {
  cosine: 'Cosine Similarity',
  euclidean: 'Euclidean (L2) Distance',
  dot: 'Dot Product',
};

const QDRANT_DISTANCE: Record<DistanceMetric, string> = {
  cosine: 'Cosine',
  euclidean: 'Euclid',
  dot: 'Dot',
};

function generatePinecone(name: string, dim: Dimension, metric: DistanceMetric, fields: MetadataField[]): string {
  const safeName = name || 'my-index';
  const metricStr = metric === 'dot' ? 'dotproduct' : metric;
  const fieldComment = fields.length > 0
    ? '\n# Metadata fields that will be stored alongside vectors:\n' +
      fields.map(f => `# ${f.name}: ${f.type}`).join('\n')
    : '';
  return `from pinecone import Pinecone, ServerlessSpec

pc = Pinecone(api_key="YOUR_API_KEY")

pc.create_index(
    name="${safeName}",
    dimension=${dim},
    metric="${metricStr}",
    spec=ServerlessSpec(
        cloud="aws",
        region="us-east-1"
    )
)
${fieldComment}
# Connect to index
index = pc.Index("${safeName}")

# Upsert example
index.upsert(vectors=[
    {
        "id": "doc-001",
        "values": [0.1] * ${dim},  # replace with real embedding
        "metadata": {${fields.map(f => `\n            "${f.name}": ${defaultMetaValue(f.type)}`).join(',') || ''}
        }
    }
])`;
}

function generateWeaviate(name: string, dim: Dimension, metric: DistanceMetric, fields: MetadataField[]): string {
  const className = (name || 'MyCollection')
    .replace(/[^a-zA-Z0-9]/g, '')
    .replace(/^[a-z]/, c => c.toUpperCase()) || 'MyCollection';

  const weaviateMetric: Record<DistanceMetric, string> = {
    cosine: 'cosine',
    euclidean: 'l2-squared',
    dot: 'dot',
  };

  const weaviateType: Record<FieldType, string> = {
    string: 'text',
    number: 'number',
    boolean: 'boolean',
    array: 'text[]',
  };

  const schema: Record<string, any> = {
    class: className,
    vectorizer: 'none',
    vectorIndexConfig: {
      distance: weaviateMetric[metric],
    },
    properties: fields.map(f => ({
      name: f.name || 'field',
      dataType: [weaviateType[f.type]],
    })),
  };

  return `import weaviate

client = weaviate.Client("http://localhost:8080")

# Class definition (schema)
class_schema = ${JSON.stringify(schema, null, 2)}

client.schema.create_class(class_schema)

# Insert example (dimension: ${dim})
client.data_object.create(
    data_object={${fields.map(f => `\n        "${f.name || 'field'}": ${defaultMetaValue(f.type)}`).join(',') || ''}
    },
    class_name="${className}",
    vector=[0.1] * ${dim}  # replace with real embedding
)`;
}

function generateQdrant(name: string, dim: Dimension, metric: DistanceMetric, fields: MetadataField[]): string {
  const safeName = (name || 'my_collection').replace(/[^a-z0-9_]/gi, '_').toLowerCase();
  const payload: Record<string, any> = {
    vectors: {
      size: dim,
      distance: QDRANT_DISTANCE[metric],
    },
  };

  return `from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, VectorParams, PointStruct

client = QdrantClient(host="localhost", port=6333)

# Create collection
client.create_collection(
    collection_name="${safeName}",
    vectors_config=VectorParams(
        size=${dim},
        distance=Distance.${QDRANT_DISTANCE[metric].toUpperCase()}
    ),
)

# Insert example with payload (metadata)
client.upsert(
    collection_name="${safeName}",
    points=[
        PointStruct(
            id=1,
            vector=[0.1] * ${dim},  # replace with real embedding
            payload={${fields.map(f => `\n                "${f.name || 'field'}": ${defaultMetaValue(f.type)}`).join(',') || ''}
            }
        )
    ]
)

# Filtered search example
# results = client.search(
#     collection_name="${safeName}",
#     query_vector=[0.1] * ${dim},
#     query_filter=models.Filter(
#         must=[models.FieldCondition(
#             key="${fields[0]?.name || 'field'}",
#             match=models.MatchValue(value="example")
#         )]
#     ),
#     limit=10
# )`;
}

function defaultMetaValue(type: FieldType): string {
  switch (type) {
    case 'string': return '"example"';
    case 'number': return '42';
    case 'boolean': return 'True';
    case 'array': return '["tag1", "tag2"]';
  }
}

export default function VectorDbSchemaDesigner() {
  const [activeDb, setActiveDb] = useState<VectorDB>('pinecone');
  const [collectionName, setCollectionName] = useState('my-collection');
  const [dimension, setDimension] = useState<Dimension>(1536);
  const [metric, setMetric] = useState<DistanceMetric>('cosine');
  const [fields, setFields] = useState<MetadataField[]>([
    { id: makeId(), name: 'source', type: 'string' },
    { id: makeId(), name: 'score', type: 'number' },
    { id: makeId(), name: 'tags', type: 'array' },
  ]);
  const [copied, setCopied] = useState(false);

  function addField() {
    setFields(prev => [...prev, { id: makeId(), name: '', type: 'string' }]);
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id));
  }

  function updateField(id: string, key: keyof MetadataField, value: string) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, [key]: value } : f));
  }

  function getOutput(): string {
    switch (activeDb) {
      case 'pinecone': return generatePinecone(collectionName, dimension, metric, fields);
      case 'weaviate': return generateWeaviate(collectionName, dimension, metric, fields);
      case 'qdrant': return generateQdrant(collectionName, dimension, metric, fields);
    }
  }

  const output = getOutput();

  function copyOutput() {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const DB_TABS: { id: VectorDB; label: string }[] = [
    { id: 'pinecone', label: 'Pinecone' },
    { id: 'weaviate', label: 'Weaviate' },
    { id: 'qdrant', label: 'Qdrant' },
  ];

  return (
    <div class="space-y-4">
      {/* DB tabs */}
      <div class="flex gap-2">
        {DB_TABS.map(db => (
          <button
            key={db.id}
            onClick={() => setActiveDb(db.id)}
            class={`px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
              activeDb === db.id
                ? 'bg-accent/20 border-accent/50 text-accent'
                : 'border-border text-text-muted hover:bg-surface'
            }`}
          >
            {db.label}
          </button>
        ))}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: schema config */}
        <div class="space-y-4">
          {/* Collection name */}
          <div class="bg-surface border border-border rounded-lg p-4 space-y-2">
            <label class="block text-sm font-medium">
              {activeDb === 'pinecone' ? 'Index Name' : 'Collection Name'}
            </label>
            <input
              type="text"
              class="w-full font-mono text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
              value={collectionName}
              onInput={(e) => setCollectionName((e.target as HTMLInputElement).value)}
              placeholder="my-collection"
            />
          </div>

          {/* Vector config */}
          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div class="text-sm font-medium">Vector Configuration</div>

            <div>
              <label class="block text-xs text-text-muted mb-1">Dimensions</label>
              <select
                class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                value={dimension}
                onChange={(e) => setDimension(parseInt((e.target as HTMLSelectElement).value) as Dimension)}
              >
                {DIMENSIONS.map(d => (
                  <option key={d} value={d}>{d} — {DIM_MODELS[d]}</option>
                ))}
              </select>
            </div>

            <div>
              <label class="block text-xs text-text-muted mb-1">Distance Metric</label>
              <select
                class="w-full text-sm bg-surface-alt border border-border rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-accent"
                value={metric}
                onChange={(e) => setMetric((e.target as HTMLSelectElement).value as DistanceMetric)}
              >
                {(Object.keys(DISTANCE_LABELS) as DistanceMetric[]).map(m => (
                  <option key={m} value={m}>{DISTANCE_LABELS[m]}</option>
                ))}
              </select>
              <p class="text-xs text-text-muted mt-1">
                {metric === 'cosine' && 'Best for text embeddings — measures angle between vectors, ignores magnitude. Most common choice.'}
                {metric === 'euclidean' && 'Measures straight-line distance. Good for image or audio embeddings where magnitude matters.'}
                {metric === 'dot' && 'Dot product (inner product). Fast, but requires normalized vectors for meaningful similarity.'}
              </p>
            </div>
          </div>

          {/* Metadata fields */}
          <div class="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div class="flex items-center justify-between">
              <div class="text-sm font-medium">Metadata Fields ({fields.length})</div>
              <button
                onClick={addField}
                class="bg-accent hover:bg-accent/90 text-white text-xs font-medium py-1 px-2.5 rounded-lg transition-colors"
              >
                + Add Field
              </button>
            </div>

            <div class="space-y-2 max-h-[200px] overflow-y-auto pr-1">
              {fields.length === 0 && (
                <p class="text-xs text-text-muted">No metadata fields. Click "+ Add Field" to add filterable payload fields.</p>
              )}
              {fields.map(f => (
                <div key={f.id} class="flex gap-2 items-center">
                  <input
                    type="text"
                    class="flex-1 font-mono text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={f.name}
                    onInput={(e) => updateField(f.id, 'name', (e.target as HTMLInputElement).value.replace(/\s/g, '_'))}
                    placeholder="field_name"
                  />
                  <select
                    class="text-xs bg-surface-alt border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
                    value={f.type}
                    onChange={(e) => updateField(f.id, 'type', (e.target as HTMLSelectElement).value)}
                  >
                    <option value="string">string</option>
                    <option value="number">number</option>
                    <option value="boolean">boolean</option>
                    <option value="array">array</option>
                  </select>
                  <button
                    onClick={() => removeField(f.id)}
                    class="text-text-muted hover:text-red-400 text-xs transition-colors shrink-0"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: generated code */}
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <div class="text-sm font-medium">
              Generated {activeDb === 'pinecone' ? 'Python (Pinecone SDK)' : activeDb === 'weaviate' ? 'Python (Weaviate Client)' : 'Python (Qdrant Client)'}
            </div>
            <button
              onClick={copyOutput}
              class="text-sm px-3 py-1.5 border border-border rounded-lg hover:bg-surface transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>

          <pre class="w-full h-[480px] overflow-auto font-mono text-xs bg-surface border border-border rounded-lg p-4 text-text whitespace-pre">
{output}
          </pre>
        </div>
      </div>
    </div>
  );
}
