---
title: "UUID Generator Bulk: Generate Hundreds of UUIDs Instantly Online"
description: "Generate UUIDs in bulk online — v4 random, v1 time-based, v7 sortable. Download as CSV, JSON, or plain text. Free, no install, no account required."
date: "2026-03-24"
tags: ["uuid", "bulk-generator", "unique-id", "developer-tools", "database", "testing"]
readingTime: "6 min read"
canonicalUrl: "https://devplaybook.cc/blog/uuid-generator-bulk"
---

# UUID Generator Bulk: Generate Hundreds of UUIDs Instantly Online

Seeding a database, populating test fixtures, creating sample data for a demo — all of these need UUIDs in quantity. A bulk UUID generator lets you produce hundreds or thousands of unique IDs in seconds and export them in whatever format you need.

**[Generate UUIDs in Bulk →](/tools/uuid-generator)**

---

## UUID Versions: Which to Use

| Version | Algorithm | Best For |
|---------|-----------|----------|
| v1 | Timestamp + MAC address | When time-ordering matters, audit logs |
| v4 | Random | General purpose — default choice |
| v5 | SHA-1 + namespace | Reproducible IDs from known input |
| v7 | Unix timestamp + random | Database primary keys, sortable IDs |

### UUID v4 (Random) — The Default

```
550e8400-e29b-41d4-a716-446655440000
f47ac10b-58cc-4372-a567-0e02b2c3d479
```

128 bits with 122 random bits. Collision probability is astronomically low (requires generating 103 trillion UUIDs to reach 1% collision probability). Use this for most cases.

### UUID v7 (Sortable) — The Modern Choice

```
018e3c0a-4e5b-7000-8000-000000000001
018e3c0a-4e5c-7000-8000-000000000002
```

v7 encodes Unix timestamp in the first 48 bits, making UUIDs sortable chronologically. This matters for:
- Database indexes (b-tree indexes stay efficient when IDs are monotonically increasing)
- Log correlation
- Event sourcing
- Any system where "creation order" should be visible from the ID

**If you're choosing a UUID version for new database primary keys, choose v7.**

---

## Bulk Generation Use Cases

### Database Seeding

Creating test data for a relational database:

```sql
INSERT INTO users (id, name, email) VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Alice', 'alice@example.com'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479', 'Bob', 'bob@example.com'),
  -- ... 98 more rows
```

Generate 100 UUIDs, download as CSV, import to SQL.

### Test Fixtures

```json
[
  { "id": "550e8400-e29b-41d4-a716-446655440000", "type": "order" },
  { "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479", "type": "order" },
  { "id": "7c9e6679-7425-40de-944b-e07fc1f90ae7", "type": "order" }
]
```

### API Mock Data

Building a mock API that returns consistent UUIDs for demo purposes.

### Load Testing

Generate unique IDs for 10,000 synthetic users to load test your system without polluting production data.

---

## Generating UUIDs in Code

### JavaScript / Node.js

```javascript
// Built-in (Node.js 14.17+, browsers)
import { randomUUID } from 'crypto';
const id = randomUUID(); // v4

// Generate bulk
const uuids = Array.from({ length: 100 }, () => randomUUID());

// uuid package (all versions)
import { v4 as uuidv4, v7 as uuidv7 } from 'uuid';

const v4id = uuidv4();
const v7id = uuidv7();

// Bulk v7 (sortable, good for DB)
const sortableIds = Array.from({ length: 1000 }, () => uuidv7());
```

### Python

```python
import uuid

# Single v4
uid = uuid.uuid4()
print(str(uid))  # "550e8400-e29b-41d4-a716-446655440000"

# Bulk generation
uuids = [str(uuid.uuid4()) for _ in range(100)]

# Namespaced v5 (reproducible)
namespace = uuid.NAMESPACE_URL
uid5 = uuid.uuid5(namespace, "https://example.com/users/alice")

# Export to CSV
import csv
with open('uuids.csv', 'w') as f:
    writer = csv.writer(f)
    for uid in uuids:
        writer.writerow([uid])
```

### Go

```go
import "github.com/google/uuid"

// Single v4
id := uuid.New()
fmt.Println(id.String())

// Bulk v4
ids := make([]string, 1000)
for i := range ids {
    ids[i] = uuid.New().String()
}

// v7 (sortable)
id7, err := uuid.NewV7()
```

### SQL (PostgreSQL)

```sql
-- Generate UUIDs in SQL
SELECT gen_random_uuid() FROM generate_series(1, 100);

-- Insert with UUIDs
INSERT INTO items (id, name)
SELECT gen_random_uuid(), 'Item ' || n
FROM generate_series(1, 1000) AS s(n);

-- UUID primary key column
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL
);
```

### Bash

```bash
# Single UUID (Linux)
cat /proc/sys/kernel/random/uuid

# Bulk with uuidgen
for i in $(seq 1 100); do uuidgen; done

# Export to file
for i in $(seq 1 1000); do uuidgen; done > uuids.txt

# macOS
uuidgen | tr '[:upper:]' '[:lower:]'
```

---

## UUID Format Variants

Standard UUID: `550e8400-e29b-41d4-a716-446655440000`

Applications sometimes use non-standard formats:

| Format | Example | Use case |
|--------|---------|----------|
| Standard | `550e8400-e29b-41d4-a716-446655440000` | Most systems |
| No hyphens | `550e8400e29b41d4a716446655440000` | Compact storage |
| Uppercase | `550E8400-E29B-41D4-A716-446655440000` | Some legacy systems |
| Braces | `{550e8400-e29b-41d4-a716-446655440000}` | Windows/COM |
| URN | `urn:uuid:550e8400-e29b-41d4-a716-446655440000` | Semantic web |

---

## UUID vs ULID vs CUID

| ID Type | Sortable | URL-safe | Length | Notes |
|---------|----------|----------|--------|-------|
| UUID v4 | No | With encoding | 36 chars | Industry standard |
| UUID v7 | Yes | With encoding | 36 chars | Best for databases |
| ULID | Yes | Yes | 26 chars | Compact, readable |
| CUID2 | Approximately | Yes | Configurable | Anti-fingerprinting |
| NanoID | No | Yes | Configurable | Short, URL-safe |

For new projects in 2026:
- **General use**: UUID v4 (universal support)
- **Database PKs**: UUID v7 or ULID
- **URLs**: NanoID or CUID2

---

## Export Formats for Bulk UUIDs

A good bulk generator exports in multiple formats:

**Plain text (one per line)**
```
550e8400-e29b-41d4-a716-446655440000
f47ac10b-58cc-4372-a567-0e02b2c3d479
7c9e6679-7425-40de-944b-e07fc1f90ae7
```

**CSV (with index)**
```csv
index,uuid
1,550e8400-e29b-41d4-a716-446655440000
2,f47ac10b-58cc-4372-a567-0e02b2c3d479
```

**JSON array**
```json
[
  "550e8400-e29b-41d4-a716-446655440000",
  "f47ac10b-58cc-4372-a567-0e02b2c3d479"
]
```

**SQL INSERT**
```sql
INSERT INTO table_name (id) VALUES
  ('550e8400-e29b-41d4-a716-446655440000'),
  ('f47ac10b-58cc-4372-a567-0e02b2c3d479');
```

---

## Related Tools

- [UUID Generator](/tools/uuid-generator) — single and bulk UUID generation
- [JSON Formatter](/tools/json-formatter) — format UUID arrays in JSON
- [API Request Builder](/tools/api-request-builder) — test endpoints with generated UUIDs

---

## Conclusion

Bulk UUID generation is a routine task in database seeding, testing, and mock data creation. An online bulk UUID generator handles it in seconds with no code, in whatever format your workflow needs.

**[Generate Bulk UUIDs Online →](/tools/uuid-generator)**
