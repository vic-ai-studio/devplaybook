import { useState, useCallback } from 'preact/hooks';

// ─── Static lookup tables ────────────────────────────────────────────────────

const FIRST_NAMES = [
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'William', 'Sophia',
  'Benjamin', 'Isabella', 'Lucas', 'Mia', 'Henry', 'Charlotte', 'Alexander',
  'Amelia', 'Mason', 'Harper', 'Ethan', 'Evelyn',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller',
  'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee',
];

const COMPANIES = [
  'Acme Corp', 'Initech', 'Umbrella Ltd', 'Globex Solutions', 'Soylent Inc',
  'Initrode', 'Hooli', 'Pied Piper', 'Dunder Mifflin', 'Stark Industries',
  'Wayne Enterprises', 'Oscorp', 'Cyberdyne Systems', 'Weyland-Yutani', 'Aperture Science',
];

const JOB_TITLES = [
  'Software Engineer', 'Product Manager', 'Data Analyst', 'UX Designer',
  'DevOps Engineer', 'QA Engineer', 'Backend Developer', 'Frontend Developer',
  'Engineering Manager', 'Solutions Architect',
];

const CITIES = [
  'New York', 'San Francisco', 'Austin', 'Seattle', 'Chicago',
  'Boston', 'Denver', 'Los Angeles', 'Atlanta', 'Portland',
];

const STATES = ['NY', 'CA', 'TX', 'WA', 'IL', 'MA', 'CO', 'CA', 'GA', 'OR'];

const COUNTRIES = ['United States', 'Canada', 'United Kingdom', 'Australia', 'Germany'];

const STREET_NAMES = [
  'Maple', 'Oak', 'Pine', 'Cedar', 'Elm', 'Willow', 'Birch', 'Spruce', 'Walnut', 'Cherry',
];

const STREET_TYPES = ['St', 'Ave', 'Blvd', 'Dr', 'Ln', 'Way', 'Ct', 'Rd'];

const EMAIL_DOMAINS = ['example.com', 'test.org', 'sample.net', 'demo.io', 'fake.dev'];

const AVATAR_STYLES = ['adventurer', 'bottts', 'fun-emoji', 'lorelei', 'micah'];

// ─── All available fields ────────────────────────────────────────────────────

const ALL_FIELDS = [
  'id', 'firstName', 'lastName', 'email', 'phone', 'username', 'password',
  'age', 'birthDate', 'company', 'jobTitle', 'address', 'country',
  'website', 'avatar', 'createdAt', 'updatedAt',
] as const;

type Field = typeof ALL_FIELDS[number];
type OutputFormat = 'json' | 'csv' | 'sql' | 'ts';

// ─── PRNG helpers (seeded per record so output looks deterministic/varied) ───

function seededRand(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

function pick<T>(arr: T[], rand: () => number): T {
  return arr[Math.floor(rand() * arr.length)];
}

function randInt(min: number, max: number, rand: () => number): number {
  return min + Math.floor(rand() * (max - min + 1));
}

// ─── UUID v4 generator ───────────────────────────────────────────────────────

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  // Fallback
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  buf[6] = (buf[6] & 0x0f) | 0x40;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const h = Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

// ─── Per-record data generator ───────────────────────────────────────────────

interface GeneratedRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  username: string;
  password: string;
  age: number;
  birthDate: string;
  company: string;
  jobTitle: string;
  address: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  country: string;
  website: string;
  avatar: string;
  createdAt: string;
  updatedAt: string;
}

function generateRecord(index: number): GeneratedRecord {
  // Use a different seed offset per field cluster to increase variety
  const rand = seededRand((index + 1) * 2654435769);
  const rand2 = seededRand((index + 7) * 1234567891);
  const rand3 = seededRand((index + 13) * 987654321);

  const firstName = pick(FIRST_NAMES, rand);
  const lastName = pick(LAST_NAMES, rand2);
  const domain = pick(EMAIL_DOMAINS, rand3);
  const emailSlug = `${firstName.toLowerCase()}.${lastName.toLowerCase()}`;
  const email = `${emailSlug}@${domain}`;
  const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${randInt(10, 99, rand)}`;
  const age = randInt(18, 65, rand2);
  const birthYear = new Date().getFullYear() - age;
  const birthMonth = randInt(1, 12, rand3);
  const birthDay = randInt(1, 28, rand);
  const birthDate = `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`;
  const streetNum = randInt(100, 9999, rand2);
  const streetName = pick(STREET_NAMES, rand3);
  const streetType = pick(STREET_TYPES, rand);
  const cityIdx = Math.floor(rand2() * CITIES.length);
  const city = CITIES[cityIdx];
  const state = STATES[cityIdx];
  const zip = String(randInt(10000, 99999, rand3));
  const country = pick(COUNTRIES, rand);
  const company = pick(COMPANIES, rand2);
  const jobTitle = pick(JOB_TITLES, rand3);
  const website = `https://www.${firstName.toLowerCase()}${lastName.toLowerCase()}.${pick(['com', 'dev', 'io', 'net'], rand)}`;
  const avatarStyle = pick(AVATAR_STYLES, rand2);
  const avatarSeed = `${firstName}${lastName}${index}`;
  const avatar = `https://api.dicebear.com/7.x/${avatarStyle}/svg?seed=${encodeURIComponent(avatarSeed)}`;

  // Password: bcrypt-style placeholder
  const saltRounds = pick(['10', '11', '12'], rand3);
  const hashChars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789./';
  let hashPart = '';
  for (let i = 0; i < 53; i++) {
    hashPart += hashChars[Math.floor(rand() * hashChars.length)];
  }
  const password = `$2b$${saltRounds}$${hashPart}`;

  // Phone: US format
  const areaCode = randInt(200, 999, rand2);
  const exchange = randInt(200, 999, rand3);
  const lineNum = randInt(1000, 9999, rand);
  const phone = `+1-${areaCode}-${exchange}-${lineNum}`;

  // Timestamps
  const now = Date.now();
  const createdMsAgo = randInt(0, 365 * 24 * 60 * 60 * 1000, rand2);
  const createdAt = new Date(now - createdMsAgo).toISOString();
  const updatedMsAgo = randInt(0, createdMsAgo, rand3);
  const updatedAt = new Date(now - updatedMsAgo).toISOString();

  return {
    id: generateUUID(),
    firstName,
    lastName,
    email,
    phone,
    username,
    password,
    age,
    birthDate,
    company,
    jobTitle,
    address: { street: `${streetNum} ${streetName} ${streetType}`, city, state, zip },
    country,
    website,
    avatar,
    createdAt,
    updatedAt,
  };
}

// ─── Flatten record to key-value for selected fields ─────────────────────────

function flattenRecord(rec: GeneratedRecord, fields: Field[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    if (f === 'address') {
      out['address_street'] = rec.address.street;
      out['address_city'] = rec.address.city;
      out['address_state'] = rec.address.state;
      out['address_zip'] = rec.address.zip;
    } else {
      out[f] = (rec as unknown as Record<string, unknown>)[f];
    }
  }
  return out;
}

function flatHeaders(fields: Field[]): string[] {
  const cols: string[] = [];
  for (const f of fields) {
    if (f === 'address') {
      cols.push('address_street', 'address_city', 'address_state', 'address_zip');
    } else {
      cols.push(f);
    }
  }
  return cols;
}

// ─── Format converters ────────────────────────────────────────────────────────

function toJSON(records: GeneratedRecord[], fields: Field[]): string {
  const arr = records.map(r => {
    const flat = flattenRecord(r, fields);
    // Re-nest address if all 4 sub-fields are present
    if (
      fields.includes('address') &&
      'address_street' in flat
    ) {
      const { address_street, address_city, address_state, address_zip, ...rest } = flat;
      return { ...rest, address: { street: address_street, city: address_city, state: address_state, zip: address_zip } };
    }
    return flat;
  });
  return JSON.stringify(arr, null, 2);
}

function toCSV(records: GeneratedRecord[], fields: Field[]): string {
  const headers = flatHeaders(fields);
  const lines: string[] = [headers.join(',')];
  for (const rec of records) {
    const flat = flattenRecord(rec, fields);
    const row = headers.map(h => {
      const val = String(flat[h] ?? '');
      return val.includes(',') || val.includes('"') || val.includes('\n')
        ? `"${val.replace(/"/g, '""')}"`
        : val;
    });
    lines.push(row.join(','));
  }
  return lines.join('\n');
}

function toSQL(records: GeneratedRecord[], fields: Field[]): string {
  const headers = flatHeaders(fields);
  const cols = headers.join(', ');
  const lines: string[] = [`-- Test data generated by DevPlaybook Test Data Generator\nINSERT INTO users (${cols}) VALUES`];
  const valueRows = records.map(rec => {
    const flat = flattenRecord(rec, fields);
    const vals = headers.map(h => {
      const v = flat[h];
      if (typeof v === 'number') return String(v);
      return `'${String(v ?? '').replace(/'/g, "''")}'`;
    });
    return `  (${vals.join(', ')})`;
  });
  lines.push(valueRows.join(',\n') + ';');
  return lines.join('\n');
}

function toTS(records: GeneratedRecord[], fields: Field[]): string {
  const arr = records.map(r => {
    const flat = flattenRecord(r, fields);
    if (fields.includes('address') && 'address_street' in flat) {
      const { address_street, address_city, address_state, address_zip, ...rest } = flat;
      return { ...rest, address: { street: address_street, city: address_city, state: address_state, zip: address_zip } };
    }
    return flat;
  });
  return `const testData = ${JSON.stringify(arr, null, 2)} as const;\n\nexport default testData;`;
}

// ─── Component ────────────────────────────────────────────────────────────────

const FORMAT_LABELS: Record<OutputFormat, string> = {
  json: 'JSON Array',
  csv: 'CSV',
  sql: 'SQL INSERT',
  ts: 'TypeScript Array',
};

const FIELD_LABELS: Record<Field, string> = {
  id: 'ID (UUID v4)',
  firstName: 'First Name',
  lastName: 'Last Name',
  email: 'Email',
  phone: 'Phone',
  username: 'Username',
  password: 'Password Hash',
  age: 'Age',
  birthDate: 'Birth Date',
  company: 'Company',
  jobTitle: 'Job Title',
  address: 'Address (street/city/state/zip)',
  country: 'Country',
  website: 'Website URL',
  avatar: 'Avatar URL',
  createdAt: 'Created At',
  updatedAt: 'Updated At',
};

const DEFAULT_FIELDS: Field[] = [
  'id', 'firstName', 'lastName', 'email', 'phone', 'username',
  'age', 'company', 'jobTitle', 'address', 'createdAt',
];

export default function TestDataGenerator() {
  const [count, setCount] = useState(5);
  const [selectedFields, setSelectedFields] = useState<Set<Field>>(new Set(DEFAULT_FIELDS));
  const [format, setFormat] = useState<OutputFormat>('json');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const toggleField = useCallback((field: Field) => {
    setSelectedFields(prev => {
      const next = new Set(prev);
      if (next.has(field)) {
        if (next.size > 1) next.delete(field); // require at least 1
      } else {
        next.add(field);
      }
      return next;
    });
    setOutput('');
  }, []);

  const selectAll = () => {
    setSelectedFields(new Set(ALL_FIELDS));
    setOutput('');
  };

  const selectNone = () => {
    setSelectedFields(new Set(['id'] as Field[]));
    setOutput('');
  };

  const generate = useCallback(() => {
    setIsGenerating(true);
    // Use requestAnimationFrame to let the button state render before heavy work
    requestAnimationFrame(() => {
      const fields = ALL_FIELDS.filter(f => selectedFields.has(f));
      const records = Array.from({ length: count }, (_, i) => generateRecord(i));
      let result = '';
      if (format === 'json') result = toJSON(records, fields);
      else if (format === 'csv') result = toCSV(records, fields);
      else if (format === 'sql') result = toSQL(records, fields);
      else if (format === 'ts') result = toTS(records, fields);
      setOutput(result);
      setCopied(false);
      setIsGenerating(false);
    });
  }, [count, selectedFields, format]);

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = () => {
    if (!output) return;
    const ext: Record<OutputFormat, string> = { json: 'json', csv: 'csv', sql: 'sql', ts: 'ts' };
    const mime: Record<OutputFormat, string> = {
      json: 'application/json',
      csv: 'text/csv',
      sql: 'text/plain',
      ts: 'text/plain',
    };
    const blob = new Blob([output], { type: mime[format] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-data.${ext[format]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const lineCount = output ? output.split('\n').length : 0;

  return (
    <div class="space-y-6">
      {/* Count + Format row */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Record count */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-1">
            Records: <span class="text-text font-semibold">{count}</span>
          </label>
          <input
            type="range"
            min={1}
            max={100}
            value={count}
            onInput={e => { setCount(parseInt((e.target as HTMLInputElement).value)); setOutput(''); }}
            class="w-full accent-accent"
          />
          <div class="flex justify-between text-xs text-text-muted mt-0.5">
            <span>1</span><span>50</span><span>100</span>
          </div>
          <div class="mt-2 flex items-center gap-2">
            <label class="text-xs text-text-muted">Or type exact:</label>
            <input
              type="number"
              min={1}
              max={100}
              value={count}
              onInput={e => {
                const v = Math.min(100, Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1));
                setCount(v);
                setOutput('');
              }}
              class="w-20 text-sm bg-background border border-border rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </div>

        {/* Output format */}
        <div>
          <label class="block text-sm font-medium text-text-muted mb-2">Output Format</label>
          <div class="grid grid-cols-2 gap-2">
            {(Object.entries(FORMAT_LABELS) as [OutputFormat, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => { setFormat(f); setOutput(''); }}
                class={`px-3 py-2 rounded-lg border text-sm text-left transition-colors ${
                  format === f
                    ? 'border-accent bg-accent/10 text-accent font-medium'
                    : 'border-border bg-surface text-text-muted hover:border-accent/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Field selector */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-medium text-text-muted">Include Fields</label>
          <div class="flex gap-2">
            <button
              onClick={selectAll}
              class="text-xs px-2 py-1 border border-border rounded hover:border-accent text-text-muted transition-colors"
            >
              All
            </button>
            <button
              onClick={selectNone}
              class="text-xs px-2 py-1 border border-border rounded hover:border-accent text-text-muted transition-colors"
            >
              ID only
            </button>
          </div>
        </div>
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {ALL_FIELDS.map(field => {
            const checked = selectedFields.has(field);
            return (
              <label
                key={field}
                class={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm select-none transition-colors ${
                  checked
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-border bg-surface text-text-muted hover:border-accent/40'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleField(field)}
                  class="accent-accent shrink-0"
                />
                <span class="leading-snug">{FIELD_LABELS[field]}</span>
              </label>
            );
          })}
        </div>
        <p class="text-xs text-text-muted mt-1.5">
          {selectedFields.size} of {ALL_FIELDS.length} fields selected
          {selectedFields.has('address') && (
            <span class="ml-1 text-accent/80">· Address expands to 4 columns in CSV/SQL</span>
          )}
        </p>
      </div>

      {/* Generate button */}
      <button
        onClick={generate}
        disabled={isGenerating}
        class="w-full py-3 bg-accent text-white rounded-lg font-semibold text-sm hover:bg-accent/90 disabled:opacity-60 transition-colors"
      >
        {isGenerating ? 'Generating…' : `Generate ${count} Record${count !== 1 ? 's' : ''}`}
      </button>

      {/* Output panel */}
      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <span class="text-sm font-medium text-text-muted">
              Output
              <span class="ml-2 text-xs bg-surface border border-border px-2 py-0.5 rounded-full text-text-muted">
                {lineCount} lines
              </span>
            </span>
            <div class="flex items-center gap-2">
              <button
                onClick={handleCopy}
                class={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                  copied
                    ? 'border-green-500 text-green-400 bg-green-500/10'
                    : 'border-border bg-surface text-text-muted hover:border-accent hover:text-accent'
                }`}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={handleDownload}
                class="text-xs px-3 py-1.5 rounded-lg border border-border bg-surface text-text-muted hover:border-accent hover:text-accent font-medium transition-colors"
              >
                Download .{format === 'ts' ? 'ts' : format}
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={output}
            rows={Math.min(20, lineCount + 2)}
            class="w-full font-mono text-xs bg-background border border-border rounded-lg px-4 py-3 text-text resize-y focus:outline-none focus:ring-1 focus:ring-accent leading-relaxed"
          />
        </div>
      )}

      {/* Info box */}
      <div class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted space-y-1.5">
        <p class="font-medium text-text">About the generated data</p>
        <p>All data is fictional and generated entirely in your browser — no server calls, no tracking. Names, emails, companies, and addresses are built from pre-defined arrays combined with a seeded PRNG. Password fields are formatted as bcrypt placeholder hashes (not real hashes). Avatar URLs point to <span class="font-mono bg-background px-1 rounded">dicebear.com</span> for visual previews.</p>
        <p class="text-text-muted/70">Tip: use different record counts per generation run to get different seeds and more variety.</p>
      </div>
    </div>
  );
}
