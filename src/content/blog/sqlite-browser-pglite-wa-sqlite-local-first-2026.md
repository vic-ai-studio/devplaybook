---
title: "SQLite in the Browser: PGlite, wa-sqlite, and the Local-First Revolution in 2026"
description: "A complete guide to running SQLite and Postgres in the browser in 2026. Set up PGlite (Postgres in WASM) in React, compare wa-sqlite vs sql.js, sync with Electric SQL, and choose between OPFS and IndexedDB storage backends."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["sqlite", "pglite", "wa-sqlite", "local-first", "wasm", "postgres", "javascript", "react", "indexeddb", "opfs"]
readingTime: "13 min read"
---

Your database shouldn't live thousands of miles away when your user is sitting right there with 16GB of RAM. The local-first movement has been building for a decade, and in 2026, the browser finally has the infrastructure to support it properly.

WebAssembly matured. The Origin Private File System (OPFS) API landed in all major browsers. SQLite compiled to WASM became fast enough to use for real applications. And then PGlite shipped — actual Postgres, running in a browser tab.

This is a complete guide to using SQLite and Postgres in the browser, with real code examples and honest benchmarks.

---

## The Local-First Revolution: Why Browser SQLite Is Trending

Traditional web apps are fundamentally latency-bound. Every user interaction that touches data requires a round trip to a server. Login page? Round trip. Load dashboard? Multiple round trips. Autocomplete? Round trip per keystroke.

Local-first flips the model: **the primary database is on the client**. Reads are instant (no network). Writes are instant (optimistic). The server becomes a sync target, not a gatekeeper.

The practical benefits in 2026:
- **Offline-first**: users work without internet; changes sync when connectivity returns
- **Zero latency queries**: filtering, sorting, aggregating 100k rows in milliseconds in the browser
- **AI-native apps**: embedding vector search (pgvector) alongside relational data without cloud costs
- **Developer tools**: IDEs, notebook apps, and dashboards that don't need a backend at all

The tech that made this possible:
- **WASM + Asyncify**: SQLite compiled to WebAssembly, with async I/O bridges
- **OPFS (Origin Private File System)**: a high-performance, file-system-like storage API in browsers that's much faster than IndexedDB for sequential access
- **SharedArrayBuffer + COOP/COEP**: multi-threaded WASM execution via Web Workers

---

## Options Overview: wa-sqlite, sql.js, and PGlite

### sql.js
The original browser SQLite. Compiles SQLite to WASM, stores everything in memory (or persists to IndexedDB). Mature, stable, widely used.

**Pros**: well-documented, synchronous API option, zero dependencies
**Cons**: memory-only by default (data lost on page reload unless you serialize), slow persistence via IndexedDB, lacks OPFS support in core package

**Best for**: quick scripts, simple tools, cases where you don't need persistence

### wa-sqlite
A more modern SQLite-to-WASM compilation with explicit OPFS backend support. Uses the IDBBatchAtomicVFS or AccessHandlePoolVFS virtual file systems for real persistence.

**Pros**: OPFS support (much faster persistence), VFS abstraction lets you swap storage backends, actively maintained
**Cons**: lower-level API than PGlite, requires more setup, smaller community

**Best for**: teams that want raw SQLite with good persistence and control over storage backends

### PGlite
The most exciting option: actual **PostgreSQL** compiled to WASM, running in the browser. Built by the Electric SQL team. Full Postgres query support including CTEs, window functions, and extensions.

**Pros**: real Postgres syntax, pgvector extension support, built-in React hooks, Electric SQL sync integration, actively developed
**Cons**: larger bundle size (~3MB gzipped), newer and less battle-tested than SQLite options, Postgres WASM has more overhead than SQLite WASM

**Best for**: apps already using Postgres server-side, AI apps needing vector search, teams wanting full SQL power in the browser

---

## Setting Up PGlite in a React App

### Install

```bash
npm install @electric-sql/pglite
```

### Basic Usage

```typescript
// lib/db.ts
import { PGlite } from '@electric-sql/pglite';

let db: PGlite | null = null;

export async function getDb(): Promise<PGlite> {
  if (db) return db;

  // Use OPFS for persistent storage (survives page reloads)
  db = new PGlite('idb://my-app-db');  // IndexedDB backend
  // OR: db = new PGlite('opfs://my-app-db');  // OPFS backend (faster, needs cross-origin isolation)

  await db.exec(`
    CREATE TABLE IF NOT EXISTS todos (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  return db;
}
```

### React Integration with @electric-sql/pglite-react

PGlite ships with React hooks for live queries — think React Query but powered by a local Postgres database:

```bash
npm install @electric-sql/pglite-react
```

```tsx
// App.tsx
import { PGliteProvider } from '@electric-sql/pglite-react';
import { PGlite } from '@electric-sql/pglite';
import { useLiveQuery } from '@electric-sql/pglite-react';
import { useEffect, useState } from 'react';

// Initialize the database once
const db = new PGlite('idb://todos-app');

// Schema migration on first load
db.exec(`
  CREATE TABLE IF NOT EXISTS todos (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
  )
`);

function TodoList() {
  // This query re-runs automatically whenever the todos table changes
  const todos = useLiveQuery<{ id: number; title: string; completed: boolean }>(
    'SELECT * FROM todos ORDER BY created_at DESC',
    []
  );

  const addTodo = async (title: string) => {
    await db.query('INSERT INTO todos (title) VALUES ($1)', [title]);
    // useLiveQuery picks up the change automatically
  };

  const toggleTodo = async (id: number, completed: boolean) => {
    await db.query(
      'UPDATE todos SET completed = $1 WHERE id = $2',
      [!completed, id]
    );
  };

  if (!todos) return <div>Loading...</div>;

  return (
    <div>
      <button onClick={() => addTodo('New task')}>Add Todo</button>
      {todos.rows.map((todo) => (
        <div key={todo.id}>
          <input
            type="checkbox"
            checked={todo.completed}
            onChange={() => toggleTodo(todo.id, todo.completed)}
          />
          <span style={{ textDecoration: todo.completed ? 'line-through' : 'none' }}>
            {todo.title}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function App() {
  return (
    <PGliteProvider db={db}>
      <TodoList />
    </PGliteProvider>
  );
}
```

### Using pgvector for AI Features

PGlite supports the `pgvector` extension for vector similarity search — the core primitive for AI search and recommendations:

```typescript
import { PGlite } from '@electric-sql/pglite';
import { vector } from '@electric-sql/pglite/vector';

const db = new PGlite('idb://ai-notes', {
  extensions: { vector },
});

await db.exec(`
  CREATE EXTENSION IF NOT EXISTS vector;

  CREATE TABLE IF NOT EXISTS notes (
    id SERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    embedding vector(1536)  -- OpenAI ada-002 dimensions
  )
`);

// Store a note with its embedding
async function addNote(content: string, embedding: number[]) {
  await db.query(
    'INSERT INTO notes (content, embedding) VALUES ($1, $2)',
    [content, JSON.stringify(embedding)]
  );
}

// Find similar notes
async function findSimilar(queryEmbedding: number[], limit = 5) {
  const result = await db.query(
    `SELECT content, embedding <-> $1 AS distance
     FROM notes
     ORDER BY distance
     LIMIT $2`,
    [JSON.stringify(queryEmbedding), limit]
  );
  return result.rows;
}
```

This is genuinely powerful: you can build a full semantic search over local documents, running entirely in the browser, with no server required.

---

## Syncing Local Data with a Remote Server

Local-first means local *primary*, not local *only*. You need sync.

### Electric SQL (Recommended with PGlite)

Electric SQL provides server-to-client sync using Postgres logical replication. Your server runs a standard Postgres database; Electric SQL streams changes to PGlite in the browser.

```bash
npm install @electric-sql/pglite electric-sql
```

```typescript
import { PGlite } from '@electric-sql/pglite';
import { electrify } from 'electric-sql/pglite';
import { schema } from './generated/client';  // Generated from your Postgres schema

const db = new PGlite('idb://electric-app');
const electric = await electrify(db, schema);

// Sync specific tables (not full database — you shape the sync)
const { synced } = await electric.db.todos.sync({
  where: { user_id: currentUserId },  // Filter to user's data
});

await synced;  // Wait for initial sync

// Now db.todos queries use local data with Postgres semantics
const todos = await electric.db.todos.findMany({
  where: { completed: false },
  orderBy: { created_at: 'desc' },
});
```

### PowerSync (Alternative)

PowerSync uses a different sync architecture — client-defined sync rules in YAML, with automatic conflict resolution. Works with Postgres, MySQL, and MongoDB on the backend.

```typescript
import { PowerSyncDatabase, WASQLiteOpenFactory } from '@powersync/wa-sqlite';

const db = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({ dbFilename: 'myapp.db' }),
});

await db.connect(new MyConnector());  // Your backend connector

// Live queries with real-time sync
const { data: todos } = db.useLiveQuery(
  db.watch('SELECT * FROM todos WHERE completed = false ORDER BY created_at DESC')
);
```

---

## OPFS vs IndexedDB: Storage Backends Compared

Both store data persistently in the browser, but they have very different performance profiles.

### IndexedDB
The original browser key-value/object store. Every browser supports it. SQLite/PGlite can use it as a VFS (virtual file system) backend.

**Performance**: ~2-5MB/s write throughput for large sequential writes
**Latency**: each transaction has significant overhead (~5-20ms)
**Compatibility**: all browsers including Safari, mobile
**Limitations**: can't be used in Web Workers without wrapper libraries

### OPFS (Origin Private File System)
Introduced in Chrome 86, Safari 15.2, Firefox 111. Provides a sandboxed file system with much better sequential I/O performance than IndexedDB.

**Performance**: ~50-200MB/s write throughput (10-40× faster than IndexedDB for sequential access)
**Latency**: much lower per-operation overhead
**Compatibility**: all modern browsers — but requires cross-origin isolation headers for synchronous access
**Requirement**: `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers

**Headers to add on your server:**
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

**Recommendation**: Use OPFS if your app writes or reads large amounts of data (50k+ rows, binary blobs, file attachments). Use IndexedDB for simple use cases or when you can't set COOP/COEP headers.

| Metric | IndexedDB | OPFS (sync access) |
|--------|-----------|-------------------|
| Sequential write (1MB) | ~500ms | ~5ms |
| Random read (4KB) | ~10ms | ~0.1ms |
| Browser support | Universal | Chrome 86+, Safari 15.2+, FF 111+ |
| Worker support | With wrapper | Native |
| Headers required | None | COOP + COEP |

---

## Performance Benchmarks and Limitations

### What's Fast

- **Reading**: scanning 100k rows with a WHERE clause: ~50ms in PGlite, ~20ms in wa-sqlite
- **Aggregations**: COUNT, SUM, GROUP BY over 100k rows: ~80-150ms
- **Vector search** (pgvector, 1k vectors × 1536 dims): ~200ms — fast enough for interactive search
- **Inserts**: bulk INSERT (10k rows in transaction): ~300ms

### What's Slow or Limited

- **Initial load**: PGlite bundles ~3MB gzipped. First paint must wait for WASM initialization (~200-500ms)
- **Full table scans on large datasets**: 1M+ rows will feel slow — design your queries with indexes
- **Concurrent writes**: WASM SQLite/Postgres is single-threaded. Use a shared worker pattern if multiple browser tabs need write access
- **No networked extensions**: Postgres extensions that require OS-level libraries (PostGIS, pg_crypto heavy functions) won't work in WASM

### Multi-Tab Considerations

Running PGlite in a regular page script means each tab has its own database instance. For shared state across tabs, use a Shared Worker:

```typescript
// db-worker.ts (Shared Worker)
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite('opfs://shared-db');

self.onconnect = (event) => {
  const port = event.ports[0];
  port.onmessage = async (e) => {
    const { query, params, id } = e.data;
    const result = await db.query(query, params);
    port.postMessage({ id, result });
  };
};
```

---

## Real Use Cases: When Browser SQLite Shines

### Offline-First Apps
Field apps (inspections, surveys, delivery tracking) need to work without network access. Local SQLite stores all data; sync happens in the background when connectivity returns. Users never see loading spinners.

### AI and LLM-Powered Apps
Combine pgvector with a local embedding model (via Transformers.js) and you get entirely client-side semantic search — no server, no API key, no latency, no cost per query. Personal knowledge management tools, local document Q&A.

### Developer Tools
Browser-based IDEs, SQL playgrounds, schema designers, and data explorers that need real query capability without a backend. Observable Framework uses DuckDB WASM for in-browser data analysis; the same pattern works with SQLite for relational data.

### Interactive Data Apps
Dashboards with complex filtering and aggregation over medium-sized datasets (up to ~5M rows depending on schema complexity). The user loads data once; all interactions are local queries.

### Collaborative Editing
Combined with CRDT-based sync (like Automerge or Yjs), local-first databases enable conflict-free collaborative editing without the operational complexity of operational transformation.

---

## Getting Started Today

If you're building a new browser app in 2026 and it needs any kind of persistent data:

1. **Try PGlite first** if you're already using Postgres. The familiarity is worth the ~3MB overhead.
2. **Use wa-sqlite** if bundle size is critical or you want lighter-weight SQLite semantics.
3. **Add Electric SQL** when you need server sync — it handles the hard parts (conflict resolution, partial sync, offline queuing).
4. **Store to OPFS** if your data exceeds a few hundred MB or write performance matters.

The local-first web is no longer a research project. The infrastructure is here. The question isn't whether browser databases are viable — it's whether you're leaving UX and performance on the table by not using them.

---

## Further Reading

- [PGlite documentation](https://pglite.dev/docs)
- [Electric SQL local-first guide](https://electric-sql.com/docs/intro)
- [wa-sqlite on GitHub](https://github.com/rhashimoto/wa-sqlite)
- [OPFS MDN documentation](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API/Origin_private_file_system)
- [Local-first software manifesto](https://www.inkandswitch.com/local-first/)
