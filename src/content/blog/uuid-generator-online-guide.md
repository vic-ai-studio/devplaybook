---
title: "UUID Generator Online: Generate v4, v1, and v7 UUIDs Instantly Free"
description: "Generate UUIDs online for free — v4 random, v1 time-based, and v7 sortable. Learn UUID formats, use cases, and how to generate UUIDs in JavaScript, Python, Go, and SQL."
date: "2026-03-24"
tags: ["uuid", "generator", "unique-id", "developer-tools", "database", "api"]
readingTime: "6 min read"
---

# UUID Generator Online: Generate v4, v1, and v7 UUIDs Instantly Free

UUIDs (Universally Unique Identifiers) are the standard way to generate unique IDs without a central authority. Whether you're seeding a database, testing an API, or generating session tokens, an online UUID generator gives you ready-to-use identifiers in seconds.

This guide covers the UUID versions, when to use each, and how to generate them in code.

---

## What Is a UUID?

A UUID is a 128-bit identifier formatted as a 36-character string:

```
xxxxxxxx-xxxx-Mxxx-Nxxx-xxxxxxxxxxxx

Example: f47ac10b-58cc-4372-a567-0e02b2c3d479
```

- 32 hexadecimal digits
- 4 hyphens separating 5 groups (8-4-4-4-12 characters)
- The `M` position indicates the version; `N` indicates the variant

**Try it now:** [DevPlaybook UUID Generator](https://devplaybook.cc/tools/uuid-generator) — generate single or bulk UUIDs in any version instantly.

---

## UUID Versions Explained

### UUID v4 (Random) — Most Common

UUID v4 uses 122 random bits. The probability of generating two identical UUIDs is astronomically low — roughly 1 in 5.3 × 10^36.

```
f47ac10b-58cc-4372-a567-0e02b2c3d479
              ^                      ← "4" indicates v4
```

**Use when:** You need unique IDs that don't encode any information about creation time or source. Best for primary keys, session tokens, resource identifiers.

### UUID v1 (Time-Based) — Contains MAC Address

UUID v1 embeds the current timestamp (100-nanosecond intervals since Oct 15, 1582) and the MAC address of the generating machine.

```
6ba7b810-9dad-11d1-80b4-00c04fd430c8
              ^                      ← "1" indicates v1
```

**Use when:** You need UUIDs that sort roughly by creation time. **Avoid for privacy** — the MAC address reveals the generating machine.

### UUID v7 (Time-Ordered) — Modern Recommended

UUID v7 combines a Unix timestamp (millisecond precision) with random bits. This makes them monotonically increasing, which is much better for database indexes than random v4 UUIDs.

```
018e5716-a2a0-7b4e-8f5c-d9f3b1e67a2c
^^^^^^^^^^^^^^^                      ← first 48 bits = timestamp
```

**Use when:** You want database-friendly IDs that sort by creation time. UUID v7 provides the uniqueness of v4 with the sortability of auto-increment integers.

---

## UUID v4 vs UUID v7: Which Should You Use?

| Factor | UUID v4 | UUID v7 |
|--------|---------|---------|
| Randomness | 122 random bits | ~74 random bits |
| Sortable by time | ❌ No | ✅ Yes |
| Database index efficiency | ⚠️ Poor (random insertions) | ✅ Good (sequential inserts) |
| Privacy | ✅ No metadata | ✅ No MAC address |
| Browser support | ✅ `crypto.randomUUID()` | ⚠️ Library required |
| Recommended for new projects | ✅ Widely supported | ✅ Better for databases |

For most web applications in 2026, **UUID v7 is the recommended choice** for database primary keys. Use v4 when you need broader library support or don't care about insert performance.

---

## How to Use the UUID Generator Online

1. **Open** [DevPlaybook UUID Generator](https://devplaybook.cc/tools/uuid-generator)
2. **Select the UUID version** (v4, v1, v7)
3. **Choose how many UUIDs** you need (1 to bulk)
4. **Select format** — standard hyphenated, compact (no hyphens), uppercase
5. **Click Generate**
6. **Copy** the UUIDs for use in seeds, test fixtures, API testing

---

## Generating UUIDs in Code

### JavaScript / Node.js

```javascript
// v4 — built into modern environments (no library needed)
const uuid = crypto.randomUUID();
// "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// v4 — older Node.js or browser compatibility
import { v4 as uuidv4 } from 'uuid';
console.log(uuidv4());

// v7 — requires library
import { v7 as uuidv7 } from 'uuid';
console.log(uuidv7());
// "018e5716-a2a0-7b4e-8f5c-d9f3b1e67a2c"
```

### Python

```python
import uuid

# v4
id = str(uuid.uuid4())
# "f47ac10b-58cc-4372-a567-0e02b2c3d479"

# v1
id = str(uuid.uuid1())

# As a compact string (no hyphens)
compact = str(uuid.uuid4()).replace('-', '')
```

### Go

```go
import "github.com/google/uuid"

// v4
id := uuid.New()
fmt.Println(id.String())

// v7
id, err := uuid.NewV7()
fmt.Println(id.String())
```

### SQL

```sql
-- PostgreSQL: generate UUID v4
SELECT gen_random_uuid();

-- PostgreSQL: UUID as default column value
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL
);

-- MySQL 8+
SELECT UUID();

-- SQLite (no built-in, use application layer)
```

---

## UUIDs as Database Primary Keys

### The Problem with Auto-Increment

Auto-increment integers work well for small, single-database applications but break down when:
- You need to merge datasets from multiple sources
- You generate IDs before they're committed to the database (offline-first)
- You're running multiple database instances
- You don't want to expose record counts to users via guessable IDs

### UUID Trade-offs

```sql
-- UUID v4: random insertions cause index fragmentation
INSERT INTO users (id, name) VALUES (gen_random_uuid(), 'Alice');
-- Every insert potentially goes to a different B-tree page

-- UUID v7: sequential inserts are index-friendly
-- New records always append to the end of the index
```

For high-write-throughput systems, UUID v7 or ULIDs can provide the best of both worlds.

---

## UUID Validation

A valid UUID matches this regex pattern:

```regex
^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$
```

Quick JavaScript validation:

```javascript
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}
```

---

## Frequently Asked Questions

### Can two UUIDs ever be identical?

In theory, yes — they're random. In practice, no — the probability of collision is so small (1 in 5.3 × 10^36 for v4) that it's not a realistic concern for any application. You'd need to generate approximately 2.7 quintillion UUIDs before having a 50% chance of even one collision.

### Should I store UUIDs as strings or binary in databases?

Binary (16 bytes) is more efficient than string (36 bytes). PostgreSQL's native `UUID` type stores it as 16 bytes. MySQL `BINARY(16)` is more efficient than `VARCHAR(36)`. If storage efficiency matters, use the native type.

### What's a ULID and how is it different from UUID?

ULID (Universally Unique Lexicographically Sortable Identifier) is a UUID alternative with 128 bits: 48-bit timestamp + 80-bit randomness. Like UUID v7, it's sortable. The difference is ULIDs use a different character set (Crockford Base32) for a more compact 26-character string vs UUID's 36 characters.

### Are UUIDs case-sensitive?

No. `F47AC10B-58CC-4372-A567-0E02B2C3D479` and `f47ac10b-58cc-4372-a567-0e02b2c3d479` are the same UUID. Convention is lowercase. Use lowercase unless your system requires otherwise.

### Can I use a UUID as an API key?

You can, but it's not ideal. UUIDs are not designed for security — they're just unique, not secret in the same way. For API keys, use a cryptographically random value (e.g., 32 random bytes encoded as hex or base64) and optionally prefix it with a service identifier (e.g., `sk_live_`).

---

## Related Tools

- [JSON Formatter](https://devplaybook.cc/tools/json-formatter) — format API responses containing UUIDs
- [Timestamp Converter](https://devplaybook.cc/tools/unix-timestamp) — decode timestamps embedded in UUID v1 or v7
- [URL Encoder/Decoder](https://devplaybook.cc/tools/url-encoder) — safely include UUIDs in URL parameters
