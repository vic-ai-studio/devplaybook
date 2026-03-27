import { useState, useMemo } from 'preact/hooks';

type SchemaType = 'Article' | 'Product' | 'Organization' | 'FAQPage' | 'BreadcrumbList';

interface FieldDef { key: string; label: string; placeholder?: string; type?: 'text' | 'url' | 'number' | 'textarea' }

const SCHEMAS: Record<SchemaType, FieldDef[]> = {
  Article: [
    { key: 'headline', label: 'Headline', placeholder: 'Your article title' },
    { key: 'description', label: 'Description', placeholder: 'Brief article summary', type: 'textarea' },
    { key: 'author', label: 'Author Name', placeholder: 'Jane Doe' },
    { key: 'datePublished', label: 'Date Published', placeholder: '2024-01-15' },
    { key: 'dateModified', label: 'Date Modified', placeholder: '2024-06-01' },
    { key: 'url', label: 'Article URL', type: 'url', placeholder: 'https://example.com/article' },
    { key: 'image', label: 'Image URL', type: 'url', placeholder: 'https://example.com/image.jpg' },
    { key: 'publisherName', label: 'Publisher Name', placeholder: 'My Blog' },
    { key: 'publisherLogo', label: 'Publisher Logo URL', type: 'url', placeholder: 'https://example.com/logo.png' },
  ],
  Product: [
    { key: 'name', label: 'Product Name', placeholder: 'Awesome Widget' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What this product does' },
    { key: 'image', label: 'Image URL', type: 'url', placeholder: 'https://example.com/product.jpg' },
    { key: 'sku', label: 'SKU', placeholder: 'WGT-001' },
    { key: 'brand', label: 'Brand', placeholder: 'AcmeCo' },
    { key: 'price', label: 'Price', type: 'number', placeholder: '29.99' },
    { key: 'currency', label: 'Currency (ISO 4217)', placeholder: 'USD' },
    { key: 'availability', label: 'Availability', placeholder: 'InStock' },
    { key: 'url', label: 'Product URL', type: 'url', placeholder: 'https://example.com/product' },
    { key: 'ratingValue', label: 'Rating Value (1-5)', type: 'number', placeholder: '4.7' },
    { key: 'reviewCount', label: 'Review Count', type: 'number', placeholder: '128' },
  ],
  Organization: [
    { key: 'name', label: 'Organization Name', placeholder: 'Acme Inc.' },
    { key: 'url', label: 'Website URL', type: 'url', placeholder: 'https://acme.com' },
    { key: 'logo', label: 'Logo URL', type: 'url', placeholder: 'https://acme.com/logo.png' },
    { key: 'description', label: 'Description', type: 'textarea', placeholder: 'What your org does' },
    { key: 'email', label: 'Contact Email', placeholder: 'hello@acme.com' },
    { key: 'telephone', label: 'Phone', placeholder: '+1-800-555-0100' },
    { key: 'addressLocality', label: 'City', placeholder: 'San Francisco' },
    { key: 'addressRegion', label: 'State/Region', placeholder: 'CA' },
    { key: 'addressCountry', label: 'Country (ISO)', placeholder: 'US' },
  ],
  FAQPage: [
    { key: 'q1', label: 'Question 1', placeholder: 'What is this?' },
    { key: 'a1', label: 'Answer 1', type: 'textarea', placeholder: 'It is...' },
    { key: 'q2', label: 'Question 2', placeholder: 'How does it work?' },
    { key: 'a2', label: 'Answer 2', type: 'textarea', placeholder: 'By...' },
    { key: 'q3', label: 'Question 3', placeholder: 'Is it free?' },
    { key: 'a3', label: 'Answer 3', type: 'textarea', placeholder: 'Yes...' },
    { key: 'q4', label: 'Question 4 (optional)', placeholder: '' },
    { key: 'a4', label: 'Answer 4 (optional)', type: 'textarea', placeholder: '' },
  ],
  BreadcrumbList: [
    { key: 'item1Name', label: 'Level 1 Name', placeholder: 'Home' },
    { key: 'item1Url', label: 'Level 1 URL', type: 'url', placeholder: 'https://example.com' },
    { key: 'item2Name', label: 'Level 2 Name', placeholder: 'Blog' },
    { key: 'item2Url', label: 'Level 2 URL', type: 'url', placeholder: 'https://example.com/blog' },
    { key: 'item3Name', label: 'Level 3 Name (optional)', placeholder: 'My Article' },
    { key: 'item3Url', label: 'Level 3 URL (optional)', type: 'url', placeholder: 'https://example.com/blog/article' },
    { key: 'item4Name', label: 'Level 4 Name (optional)', placeholder: '' },
    { key: 'item4Url', label: 'Level 4 URL (optional)', type: 'url', placeholder: '' },
  ],
};

function buildSchema(type: SchemaType, fields: Record<string, string>): object {
  const f = (k: string) => fields[k] || '';

  if (type === 'Article') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: f('headline'),
      description: f('description'),
      author: { '@type': 'Person', name: f('author') },
      datePublished: f('datePublished'),
      dateModified: f('dateModified') || f('datePublished'),
      url: f('url'),
      image: f('image') || undefined,
      publisher: {
        '@type': 'Organization',
        name: f('publisherName'),
        logo: { '@type': 'ImageObject', url: f('publisherLogo') },
      },
    };
  }
  if (type === 'Product') {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: f('name'),
      description: f('description'),
      image: f('image') || undefined,
      sku: f('sku') || undefined,
      brand: f('brand') ? { '@type': 'Brand', name: f('brand') } : undefined,
      offers: {
        '@type': 'Offer',
        price: f('price'),
        priceCurrency: f('currency') || 'USD',
        availability: f('availability') ? `https://schema.org/${f('availability')}` : 'https://schema.org/InStock',
        url: f('url') || undefined,
      },
    };
    if (f('ratingValue')) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: f('ratingValue'),
        reviewCount: f('reviewCount') || '1',
      };
    }
    return schema;
  }
  if (type === 'Organization') {
    return {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: f('name'),
      url: f('url'),
      logo: f('logo') || undefined,
      description: f('description') || undefined,
      email: f('email') || undefined,
      telephone: f('telephone') || undefined,
      address: (f('addressLocality') || f('addressCountry')) ? {
        '@type': 'PostalAddress',
        addressLocality: f('addressLocality') || undefined,
        addressRegion: f('addressRegion') || undefined,
        addressCountry: f('addressCountry') || undefined,
      } : undefined,
    };
  }
  if (type === 'FAQPage') {
    const items = [];
    for (let i = 1; i <= 4; i++) {
      const q = f(`q${i}`), a = f(`a${i}`);
      if (q && a) items.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } });
    }
    return { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: items };
  }
  if (type === 'BreadcrumbList') {
    const items = [];
    for (let i = 1; i <= 4; i++) {
      const name = f(`item${i}Name`), url = f(`item${i}Url`);
      if (name && url) items.push({ '@type': 'ListItem', position: items.length + 1, name, item: url });
    }
    return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items };
  }
  return {};
}

// Remove undefined values recursively
function clean(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(clean);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined && v !== '')
        .map(([k, v]) => [k, clean(v)])
    );
  }
  return obj;
}

export default function JsonLdGenerator() {
  const [type, setType] = useState<SchemaType>('Article');
  const [fields, setFields] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const schema = useMemo(() => clean(buildSchema(type, fields)), [type, fields]);
  const json = JSON.stringify(schema, null, 2);
  const scriptTag = `<script type="application/ld+json">\n${json}\n<\/script>`;

  function setField(key: string, val: string) {
    setFields(prev => ({ ...prev, [key]: val }));
  }

  function handleTypeChange(t: SchemaType) {
    setType(t);
    setFields({});
  }

  async function copy() {
    await navigator.clipboard.writeText(scriptTag);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div class="space-y-5">
      {/* Type selector */}
      <div>
        <label class="block text-sm text-text-muted mb-2">Schema Type</label>
        <div class="flex flex-wrap gap-2">
          {(Object.keys(SCHEMAS) as SchemaType[]).map(t => (
            <button
              key={t}
              onClick={() => handleTypeChange(t)}
              class={`px-3 py-1.5 rounded text-sm border transition-colors ${type === t ? 'bg-accent text-white border-accent' : 'border-border hover:border-accent hover:text-accent'}`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div class="space-y-3">
          {SCHEMAS[type].map(fd => (
            <div key={fd.key}>
              <label class="block text-xs text-text-muted mb-1">{fd.label}</label>
              {fd.type === 'textarea' ? (
                <textarea
                  value={fields[fd.key] || ''}
                  onInput={(e) => setField(fd.key, (e.target as HTMLTextAreaElement).value)}
                  placeholder={fd.placeholder}
                  rows={2}
                  class="w-full px-3 py-2 bg-surface border border-border rounded text-sm font-mono focus:outline-none focus:border-accent resize-y"
                />
              ) : (
                <input
                  type={fd.type || 'text'}
                  value={fields[fd.key] || ''}
                  onInput={(e) => setField(fd.key, (e.target as HTMLInputElement).value)}
                  placeholder={fd.placeholder}
                  class="w-full px-3 py-2 bg-surface border border-border rounded text-sm font-mono focus:outline-none focus:border-accent"
                />
              )}
            </div>
          ))}
        </div>

        {/* Preview */}
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-text-muted">JSON-LD Output</span>
            <button
              onClick={copy}
              class="text-xs px-3 py-1 rounded border border-border hover:border-accent hover:text-accent transition-colors"
            >
              {copied ? '✓ Copied!' : 'Copy <script> tag'}
            </button>
          </div>
          <pre class="bg-surface border border-border rounded p-3 text-xs font-mono overflow-auto max-h-96 text-green-300 whitespace-pre-wrap">{json}</pre>
          <p class="text-xs text-text-muted mt-2">Paste the &lt;script&gt; tag in your page's &lt;head&gt; section. Test with <a href="https://search.google.com/test/rich-results" target="_blank" rel="noopener noreferrer" class="text-accent hover:underline">Google Rich Results Test</a>.</p>
        </div>
      </div>
    </div>
  );
}
