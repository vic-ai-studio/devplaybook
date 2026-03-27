import { useState } from 'preact/hooks';

type QueryTemplate = {
  label: string;
  description: string;
  sql: string;
  tsCode: string;
};

type ConnectionMode = 'libsql' | 'http' | 'memory';

const TEMPLATES: QueryTemplate[] = [
  {
    label: 'SELECT with params',
    description: 'Fetch rows with parameterized WHERE',
    sql: `SELECT id, name, email, created_at
FROM users
WHERE status = ?
  AND created_at > ?
ORDER BY created_at DESC
LIMIT 50;`,
    tsCode: `import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const result = await db.execute({
  sql: \`SELECT id, name, email, created_at
FROM users
WHERE status = ?
  AND created_at > ?
ORDER BY created_at DESC
LIMIT 50\`,
  args: ['active', '2024-01-01'],
});

console.log(result.rows);`,
  },
  {
    label: 'INSERT + RETURNING',
    description: 'Insert a row and get it back',
    sql: `INSERT INTO users (id, name, email, status)
VALUES (?, ?, ?, 'active')
RETURNING *;`,
    tsCode: `import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const result = await db.execute({
  sql: \`INSERT INTO users (id, name, email, status)
VALUES (?, ?, ?, 'active')
RETURNING *\`,
  args: [crypto.randomUUID(), 'Alice', 'alice@example.com'],
});

const newUser = result.rows[0];
console.log(newUser);`,
  },
  {
    label: 'Batch (transaction)',
    description: 'Execute multiple statements atomically',
    sql: `-- Batch executes all as a transaction
INSERT INTO orders (id, user_id, total)
  VALUES (?, ?, ?);
UPDATE users
  SET order_count = order_count + 1
  WHERE id = ?;`,
    tsCode: `import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// batch() runs all statements in a single transaction
const results = await db.batch([
  {
    sql: 'INSERT INTO orders (id, user_id, total) VALUES (?, ?, ?)',
    args: [crypto.randomUUID(), 'user-123', 99.99],
  },
  {
    sql: 'UPDATE users SET order_count = order_count + 1 WHERE id = ?',
    args: ['user-123'],
  },
]);

console.log('Inserted order:', results[0].rowsAffected);
console.log('Updated user:', results[1].rowsAffected);`,
  },
  {
    label: 'Interactive transaction',
    description: 'Multi-step transaction with rollback',
    sql: `-- Use db.transaction() for read-then-write patterns
-- Step 1: Read current balance
-- Step 2: Check sufficient funds
-- Step 3: Deduct and update`,
    tsCode: `import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const tx = await db.transaction('write');

try {
  const { rows } = await tx.execute({
    sql: 'SELECT balance FROM accounts WHERE id = ?',
    args: ['account-abc'],
  });

  const balance = rows[0].balance as number;
  if (balance < 50) throw new Error('Insufficient funds');

  await tx.execute({
    sql: 'UPDATE accounts SET balance = balance - ? WHERE id = ?',
    args: [50, 'account-abc'],
  });

  await tx.commit();
  console.log('Transfer complete');
} catch (err) {
  await tx.rollback();
  throw err;
}`,
  },
  {
    label: 'CREATE TABLE',
    description: 'SQLite-compatible DDL for Turso',
    sql: `CREATE TABLE IF NOT EXISTS users (
  id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name     TEXT NOT NULL,
  email    TEXT NOT NULL UNIQUE,
  status   TEXT NOT NULL DEFAULT 'active',
  metadata TEXT,   -- JSON stored as TEXT
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`,
    tsCode: `import { createClient } from '@libsql/client';

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Run migrations (idempotent)
await db.executeMultiple(\`
  CREATE TABLE IF NOT EXISTS users (
    id       TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name     TEXT NOT NULL,
    email    TEXT NOT NULL UNIQUE,
    status   TEXT NOT NULL DEFAULT 'active',
    metadata TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
  CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
\`);

console.log('Migration complete');`,
  },
  {
    label: 'Drizzle + Turso',
    description: 'Type-safe queries with Drizzle ORM',
    sql: `-- Drizzle generates this SQL automatically
SELECT id, name, email
FROM users
WHERE status = 'active'
ORDER BY created_at DESC
LIMIT 20;`,
    tsCode: `import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { eq, desc } from 'drizzle-orm';

// Schema
const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  status: text('status').notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp' }),
});

// Setup
const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const db = drizzle(client);

// Type-safe query
const activeUsers = await db
  .select({ id: users.id, name: users.name, email: users.email })
  .from(users)
  .where(eq(users.status, 'active'))
  .orderBy(desc(users.createdAt))
  .limit(20);`,
  },
];

function buildConnectionString(mode: ConnectionMode, url: string): string {
  if (mode === 'memory') {
    return `import { createClient } from '@libsql/client';

// In-memory SQLite — great for tests, resets on restart
const db = createClient({ url: ':memory:' });

// Or use a local file:
// const db = createClient({ url: 'file:local.db' });`;
  }

  if (mode === 'http') {
    return `import { createClient } from '@libsql/client/http';

// HTTP mode — works in Cloudflare Workers & edge runtimes
const db = createClient({
  url: '${url || 'https://your-db-name.turso.io'}',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Note: HTTP mode does not support interactive transactions
// Use batch() for multi-statement atomicity instead`;
  }

  return `import { createClient } from '@libsql/client';

// WebSocket mode — full feature support including transactions
const db = createClient({
  url: '${url || 'libsql://your-db-name-org.turso.io'}',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Environment variables (never commit tokens):
// TURSO_DATABASE_URL=libsql://your-db-org.turso.io
// TURSO_AUTH_TOKEN=eyJ...`;
}

export default function TursoEdgeDbExplorer() {
  const [activeTemplate, setActiveTemplate] = useState(0);
  const [tab, setTab] = useState<'ts' | 'sql'>('ts');
  const [connMode, setConnMode] = useState<ConnectionMode>('libsql');
  const [dbUrl, setDbUrl] = useState('');
  const [connView, setConnView] = useState(false);
  const [copied, setCopied] = useState(false);

  const tmpl = TEMPLATES[activeTemplate];
  const output = connView
    ? buildConnectionString(connMode, dbUrl)
    : tab === 'ts'
    ? tmpl.tsCode
    : tmpl.sql;

  function copy() {
    navigator.clipboard.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  const inputCls = 'bg-surface border border-border rounded px-2 py-1 text-sm text-text focus:outline-none focus:border-primary w-full';
  const btnCls = 'px-3 py-1.5 rounded text-sm font-medium transition-colors';

  return (
    <div class="space-y-5">
      {/* Header nav */}
      <div class="flex gap-2 flex-wrap">
        <button
          onClick={() => setConnView(false)}
          class={`${btnCls} border text-sm ${!connView ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
        >Query Templates</button>
        <button
          onClick={() => setConnView(true)}
          class={`${btnCls} border text-sm ${connView ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
        >Connection Setup</button>
      </div>

      {connView ? (
        <div class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-xs text-text-muted mb-1">Connection Mode</label>
              <div class="flex gap-1">
                {([['libsql', 'WebSocket (libsql)'], ['http', 'HTTP (Edge)'], ['memory', 'In-Memory']] as [ConnectionMode, string][]).map(([m, label]) => (
                  <button
                    key={m}
                    onClick={() => setConnMode(m)}
                    class={`${btnCls} text-xs border flex-1 ${connMode === m ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}
                  >{label}</button>
                ))}
              </div>
            </div>
            <div>
              <label class="block text-xs text-text-muted mb-1">Database URL (optional)</label>
              <input
                value={dbUrl}
                onInput={e => setDbUrl((e.target as HTMLInputElement).value)}
                class={inputCls}
                placeholder={connMode === 'http' ? 'https://your-db.turso.io' : 'libsql://your-db-org.turso.io'}
              />
            </div>
          </div>
        </div>
      ) : (
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Template list */}
          <div class="space-y-1">
            <p class="text-xs text-text-muted mb-2 font-medium uppercase tracking-wide">Templates</p>
            {TEMPLATES.map((t, i) => (
              <button
                key={i}
                onClick={() => { setActiveTemplate(i); setConnView(false); }}
                class={`w-full text-left px-3 py-2 rounded border transition-colors ${activeTemplate === i && !connView ? 'bg-primary/10 border-primary/30 text-text' : 'bg-surface border-transparent hover:border-border text-text-muted hover:text-text'}`}
              >
                <div class="text-sm font-medium">{t.label}</div>
                <div class="text-xs text-text-muted/70 mt-0.5 truncate">{t.description}</div>
              </button>
            ))}
          </div>

          {/* Code output (2/3 width) */}
          <div class="lg:col-span-2 space-y-2">
            <div class="flex items-center justify-between">
              <div class="flex gap-1">
                <button onClick={() => setTab('ts')} class={`${btnCls} text-xs border ${tab === 'ts' && !connView ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}>TypeScript</button>
                <button onClick={() => setTab('sql')} class={`${btnCls} text-xs border ${tab === 'sql' && !connView ? 'bg-primary text-white border-primary' : 'bg-surface border-border text-text-muted hover:text-text'}`}>SQL</button>
              </div>
              <button onClick={copy} class={`${btnCls} text-xs ${copied ? 'bg-green-600 text-white' : 'bg-surface border border-border text-text-muted hover:text-text'}`}>
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <p class="text-xs text-text-muted">{tmpl.description}</p>
          </div>
        </div>
      )}

      {/* Code block */}
      <pre class="bg-[#0d1117] text-green-300 text-xs rounded-lg p-4 overflow-x-auto whitespace-pre font-mono leading-relaxed border border-border">
        {output}
      </pre>

      {/* Key facts */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5">
          <p class="font-medium text-text text-sm">Install</p>
          <p class="text-text-muted">npm: <code class="font-mono bg-bg px-1 rounded">npm install @libsql/client</code></p>
          <p class="text-text-muted">With Drizzle: <code class="font-mono bg-bg px-1 rounded">npm install drizzle-orm drizzle-kit</code></p>
          <p class="text-text-muted">Create DB: <code class="font-mono bg-bg px-1 rounded">turso db create my-db</code></p>
          <p class="text-text-muted">Get token: <code class="font-mono bg-bg px-1 rounded">turso db tokens create my-db</code></p>
        </div>
        <div class="bg-surface border border-border rounded-lg p-3 text-xs space-y-1.5">
          <p class="font-medium text-text text-sm">Turso Key Facts</p>
          <p class="text-text-muted"><span class="text-green-400">✓</span> SQLite-compatible (libSQL fork)</p>
          <p class="text-text-muted"><span class="text-green-400">✓</span> Edge-native: Cloudflare Workers, Deno, Bun</p>
          <p class="text-text-muted"><span class="text-green-400">✓</span> Database replication per-user (embedded replicas)</p>
          <p class="text-text-muted"><span class="text-green-400">✓</span> Free tier: 500 DBs, 9 GB storage</p>
        </div>
      </div>
    </div>
  );
}
