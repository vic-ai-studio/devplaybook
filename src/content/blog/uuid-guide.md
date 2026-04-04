---
title: "UUID v4 Guide: When to Use UUIDs Instead of Auto-Increment IDs"
description: "Learn when and how to use UUIDs over auto-increment IDs in JavaScript, Python, and Node.js. Covers v4 vs v7, performance tradeoffs, database storage strategies, and real-world use cases."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["uuid", "database", "api", "javascript", "backend"]
readingTime: "10 min read"
---

# UUID v4 Guide: When to Use UUIDs Instead of Auto-Increment IDs

Every database record needs an identifier. The two most common choices are **auto-increment integers** (1, 2, 3...) and **UUIDs** (universally unique identifiers). The right choice depends on your architecture, scale, and security requirements — and picking the wrong one early can cause significant pain later.

This guide covers what UUIDs are, the different versions, when to use them, how to generate them in JavaScript and Python, database storage strategies, and performance tradeoffs you need to understand before committing to either approach.

---

## What is a UUID?

A UUID (Universally Unique Identifier) is a 128-bit identifier formatted as 32 hexadecimal characters grouped into five sections:

```
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx
Example: 550e8400-e29b-41d4-a716-446655440000
```

- **M** = version digit (tells you which UUID version it is)
- **N** = variant bits (always 8, 9, a, or b in standard UUIDs)

The "universally unique" claim is probabilistic, not guaranteed. But the probability of collision between two randomly generated UUIDs is so vanishingly small that it's treated as functionally impossible for any practical application. For UUID v4, you'd need to generate approximately **2.7 quintillion** UUIDs before having a 50% chance of even a single collision.

---

## UUID Versions Explained

There are several UUID versions, each with different generation strategies:

| Version | Strategy | Best For |
|---------|-----------|----------|
| v1 | Time + MAC address | Legacy systems; leaks MAC address |
| v3 | MD5 hash of namespace + name | Deterministic IDs from known input |
| **v4** | **Random (122 random bits)** | **General-purpose; most common** |
| v5 | SHA-1 hash of namespace + name | Deterministic; safer than v3 |
| **v7** | **Time-ordered + random** | **Database primary keys; 2023+ recommended** |

### UUID v4 (Random)

UUID v4 generates 122 random bits + 6 fixed bits for version and variant. It's the default for most UUID libraries and the right choice when you need an identifier that doesn't encode any information about when or where it was created.

```javascript
// Browser — native Web API, no library needed
const uuid = crypto.randomUUID();
// → "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// Node.js 14.17+
const { randomUUID } = require('crypto');
const uuid = randomUUID();

// npm 'uuid' package (older Node.js or explicit version control)
import { v4 as uuidv4 } from 'uuid';
const uuid = uuidv4();
```

### UUID v7 (Time-Ordered)

UUID v7 was standardized in RFC 9562 (2023) and is now the recommended choice for **database primary keys**. It embeds a millisecond-precision timestamp in the first 48 bits, which means generated IDs sort chronologically. This is critical for database B-tree index performance.

```javascript
// Using the 'uuid' npm package (v9+)
import { v7 as uuidv7 } from 'uuid';
const uuid = uuidv7();
// → "018f2b6e-3c2a-7abc-8def-123456789abc"
//   ^^^^^^^^^^^^^ timestamp prefix (sortable)
```

```python
# Python 3.12+ includes uuid7 support
import uuid
uid7 = uuid.uuid7()  # Python 3.12+

# Older Python: use the 'uuid6' package
pip install uuid6
import uuid6
uid = uuid6.uuid7()
```

---

## UUID v4 vs Auto-Increment: Full Comparison

| Feature | Auto-Increment | UUID v4 | UUID v7 |
|---------|----------------|---------|---------|
| Exposes record count | ✅ Yes (security risk) | ❌ No | ❌ No |
| URLs are guessable | ✅ Yes | ❌ No | ❌ No |
| Distributed generation | ❌ Requires coordination | ✅ Independent | ✅ Independent |
| Merge across databases | ❌ Collision risk | ✅ No collision | ✅ No collision |
| Index size | 4–8 bytes | 16–36 bytes | 16–36 bytes |
| Insert performance (DB) | ✅ Sequential, fast | ⚠️ Random, fragmented | ✅ Time-ordered, near-sequential |
| Human readable | ✅ Easy to remember | ❌ Long and opaque | ❌ Long and opaque |
| Offline generation | ❌ Needs server round-trip | ✅ Client-side | ✅ Client-side |

---

## When UUIDs Are the Right Choice

### Microservices and Distributed Systems

When multiple services independently create records, auto-increment IDs from different databases collide. An order ID `1042` in the orders database conflicts with `1042` in the billing database. UUIDs eliminate this entirely — each service generates globally unique IDs independently, enabling seamless cross-service event joins in your analytics pipeline.

### Public APIs and Security

Sequential IDs expose your business internals. If your public API returns `/api/orders/1042`, competitors can send requests to `/api/orders/1`, `/api/orders/2`, and `/api/orders/1043` to enumerate your records and estimate your transaction volume. Switching to UUID-based public identifiers closes this information leak immediately, even if you keep auto-increment as the internal primary key.

### Offline-First Applications

Mobile apps and progressive web apps need to create records before network connectivity is available. With auto-increment IDs, the client must wait for a server response to get an ID. With `crypto.randomUUID()`, the client generates a permanent, stable ID at creation time. Sync becomes a simple upsert: the server stores the record under its UUID, or ignores it if already present.

### Multi-Tenant SaaS Platforms

When you need to export data for one tenant and import it into another tenant's account (or a different environment), auto-increment IDs create collision nightmares. UUID-identified records can be moved between environments without remapping.

### When Auto-Increment Is the Better Choice

- Internal tables never exposed through public APIs
- Single-database applications with no cross-system joins
- High-volume insert workloads where write performance is critical (or use UUID v7)
- When IDs need to be user-readable (support tickets, order numbers)

---

## Generating UUIDs in JavaScript

### Browser (No Library Required)

```javascript
// crypto.randomUUID() — available in all modern browsers and Node.js 19+
const id = crypto.randomUUID();
console.log(id); // "110e8400-e29b-41d4-a716-446655440000"

// Generate multiple at once
const ids = Array.from({ length: 5 }, () => crypto.randomUUID());
```

### Node.js with the 'uuid' Package

```javascript
import { v4 as uuidv4, v7 as uuidv7, validate, version } from 'uuid';

// Generate
const idV4 = uuidv4();  // random
const idV7 = uuidv7();  // time-ordered (better for DB primary keys)

// Validate
console.log(validate(idV4));   // true
console.log(validate('not-a-uuid'));  // false

// Detect version
console.log(version(idV4));  // 4
console.log(version(idV7));  // 7

// Parse to bytes (for binary storage)
import { parse as uuidParse } from 'uuid';
const bytes = uuidParse(idV4);  // Uint8Array(16)
```

### TypeScript with Type Safety

```typescript
type UUID = `${string}-${string}-${string}-${string}-${string}`;

function createUser(): { id: UUID; name: string } {
  return {
    id: crypto.randomUUID() as UUID,
    name: 'Alice'
  };
}
```

---

## Generating UUIDs in Python

```python
import uuid

# UUID v4 — random
id_v4 = uuid.uuid4()
print(id_v4)           # UUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')
print(str(id_v4))      # 'f47ac10b-58cc-4372-a567-0e02b2c3d479'

# Convert to hex (no dashes)
print(id_v4.hex)       # 'f47ac10b58cc4372a5670e02b2c3d479'

# Convert to bytes (for binary storage)
print(id_v4.bytes)     # b'\xf4z\xc1\x0bX\xccCr\xa5g\x0e\x02\xb2\xc3\xd4y'

# Parse from string
parsed = uuid.UUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')

# Validate
def is_valid_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
        return True
    except ValueError:
        return False
```

---

## Database Storage Strategies

### Storing UUIDs Efficiently

The default string representation is 36 characters (`xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`). Stored as `VARCHAR(36)`, this is ~5x larger than the underlying 16 bytes.

**PostgreSQL** — use the native `UUID` type:

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Query by UUID
SELECT * FROM users WHERE id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';
```

**MySQL** — use `BINARY(16)` to save space:

```sql
CREATE TABLE users (
  id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
  name VARCHAR(255) NOT NULL
);

-- Insert
INSERT INTO users (id, name) VALUES (UUID_TO_BIN(UUID(), 1), 'Alice');

-- Query
SELECT BIN_TO_UUID(id, 1) as id, name FROM users
WHERE id = UUID_TO_BIN('f47ac10b-58cc-4372-a567-0e02b2c3d479', 1);
```

The `1` flag in `UUID_TO_BIN(uuid, 1)` reorders the time component of UUID v1/v7 to maintain sortability. Use this flag for UUID v7 for best index performance.

**SQLite** — store as `TEXT` (no binary UUID type):

```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL
);
```

### The Migration Strategy: Internal + Public IDs

For existing tables with auto-increment primary keys, you don't have to change the primary key. Add a `public_id` column instead:

```sql
ALTER TABLE orders ADD COLUMN public_id UUID DEFAULT gen_random_uuid() NOT NULL UNIQUE;
CREATE INDEX idx_orders_public_id ON orders(public_id);
```

Use `id` internally for joins (fast integer arithmetic), expose `public_id` in all API responses. This gives you UUID security benefits without a costly table migration.

---

## Performance Deep Dive

### Why UUID v4 Slows Down Database Inserts

Modern databases use B-tree indexes for primary keys. With auto-increment, each new record inserts at the end of the B-tree — sequential, cache-friendly, fast.

With UUID v4, each new record inserts at a random position in the B-tree. This causes **index fragmentation**: the database must constantly reorganize pages and frequently read pages that aren't in cache. On write-heavy workloads with millions of rows, this can cause 5-10x slower insert performance.

### UUID v7 Solves the Performance Problem

UUID v7 is time-ordered. Records generated within the same millisecond have the same timestamp prefix, so they cluster together in the B-tree index. Performance is near-identical to auto-increment while retaining the uniqueness and distributed generation benefits of UUIDs.

```
UUID v4: f47ac10b-58cc-4372-a567-0e02b2c3d479  (random everywhere)
UUID v7: 018f2b6e-3c2a-7abc-8def-123456789abc  (time prefix first)
          ^^^^^^^^^ timestamp (sortable)
```

**Recommendation for 2026:** Use UUID v7 for all new database primary keys. Use UUID v4 only when you explicitly need non-time-correlated identifiers (e.g., session tokens where you don't want timing information embedded).

---

## Common Mistakes to Avoid

### 1. Using UUID v4 as a Database Primary Key on MySQL

MySQL's `BINARY(16)` storage with UUID v4 causes severe fragmentation on write-heavy tables. Switch to UUID v7, or use `UUID_TO_BIN(uuid, 1)` with the swap flag to reorder the time bytes for better index locality.

### 2. Comparing UUIDs as Strings in Case-Sensitive Contexts

UUID string representations are case-insensitive by spec, but string comparison is case-sensitive. Normalize to lowercase before storing or comparing:

```javascript
const normalized = uuid.toLowerCase();
```

### 3. Generating UUIDs with `Math.random()`

Don't implement your own UUID v4. `Math.random()` is not cryptographically secure and produces non-uniform distributions. Use `crypto.randomUUID()` (browser/Node.js) or a proper UUID library.

### 4. Forgetting to Index UUID Foreign Keys

Primary keys are automatically indexed, but foreign key columns (`user_id UUID`) are not. Always create explicit indexes on UUID foreign keys you filter or join on:

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);
```

---

## Quick Reference

```javascript
// Browser/Node.js — zero dependencies
const id = crypto.randomUUID();          // UUID v4, best for non-DB use

// Node.js with 'uuid' package
import { v7 as uuidv7 } from 'uuid';
const dbId = uuidv7();                   // UUID v7, best for DB primary keys

// Validate
const isValid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  .test(someString);
```

```python
import uuid

id_v4 = str(uuid.uuid4())     # General purpose
# id_v7 = str(uuid.uuid7())   # Python 3.12+ — best for DB primary keys
```

---

## Summary

UUIDs solve real problems in distributed systems, API security, and offline-capable applications. The key decisions:

- **UUID v4** for session tokens, temporary IDs, and cases where randomness is required
- **UUID v7** for database primary keys where you need sortability and good index performance
- **Auto-increment** for high-write internal tables that never appear in public APIs
- **Composite approach** (internal integer + public UUID) for migrating existing tables safely

The cost of switching from auto-increment to UUIDs after a table has millions of rows is significant. If there's any possibility your application will become distributed, expose IDs publicly, or need offline generation — start with UUIDs.
