---
title: "UUID vs ULID vs CUID: Which Should You Use?"
description: "A practical comparison of UUID, ULID, and CUID for unique ID generation. Learn which identifier format is right for your database, API, or distributed system in 2026."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["uuid", "ulid", "cuid", "database", "backend", "distributed-systems", "identifiers"]
readingTime: "11 min read"
---

Every application that stores data needs a way to uniquely identify records. For decades, the default choice was auto-incrementing integers. Then distributed systems made sequential IDs impractical, and UUID became the go-to standard. Now, newer formats like ULID and CUID are gaining adoption—each solving different problems with auto-increment and UUID's limitations.

This guide explains what each format is, when to use it, and the real-world trade-offs that should inform your choice. You can generate UUIDs instantly with the [DevPlaybook UUID Generator](/tools/uuid-generator).

---

## The Problem with Auto-Increment IDs

Before comparing UUID, ULID, and CUID, it's worth understanding why we moved away from simple integers.

Auto-increment IDs like `1`, `2`, `3` work fine for single-database applications. They fail when:

- **You merge databases** — records from two systems both have ID `42`
- **You scale horizontally** — multiple write nodes can't coordinate a single counter without a bottleneck
- **You expose IDs to users** — sequential IDs leak record count and invite enumeration attacks (`/users/1`, `/users/2`...)
- **You need to generate IDs client-side** — the client can't know the next database ID without a round trip

Unique identifiers solve all of these. The question is *which* format.

---

## UUID: The Standard

### What it is

UUID (Universally Unique Identifier) is defined by [RFC 4122](https://www.rfc-editor.org/rfc/rfc4122). It's a 128-bit number typically displayed as 32 hexadecimal digits in five groups:

```
550e8400-e29b-41d4-a716-446655440000
```

There are several versions:

| Version | Algorithm | Use Case |
|---------|-----------|----------|
| v1 | Time + MAC address | Sortable but leaks hardware info |
| v3 | MD5 hash of namespace + name | Deterministic, reproducible |
| v4 | Random | Most common general-purpose use |
| v5 | SHA-1 hash of namespace + name | Deterministic, more secure than v3 |
| v7 | Unix timestamp + random (new) | Sortable, replaces v1 safely |

**UUID v4** is what most developers use when they say "UUID." It's 122 bits of randomness—collision probability is astronomically low (you'd need to generate 2.71 quintillion UUIDs to reach a 50% collision chance).

### Generating UUID v4

```javascript
// Node.js (built-in crypto module, no dependencies)
const { randomUUID } = require('crypto');
const id = randomUUID();
// '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Modern browsers
const id = crypto.randomUUID();
```

```python
import uuid
id = str(uuid.uuid4())
# '550e8400-e29b-41d4-a716-446655440000'
```

```sql
-- PostgreSQL (native support)
SELECT gen_random_uuid();
-- UUID: a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11
```

### UUID v7 (2023 RFC Update)

UUID v7 is newer and worth knowing about. It uses a millisecond-precision Unix timestamp as the high bits, making it time-sortable—similar to ULID (covered below). If you're starting a new project and want UUID with sortability, v7 is the right call.

```javascript
// Using uuid library
import { v7 as uuidv7 } from 'uuid';
const id = uuidv7();
// '018e2e9e-24b0-7e7a-b47d-9b3a8d8a2e4c'
```

### UUID Pros

- **Universally supported** — every database, ORM, and language has native UUID support
- **No coordination required** — any process can generate one independently
- **Non-sequential** — doesn't reveal record count or creation order
- **Standard format** — well-understood by all developers

### UUID Cons

- **Not sortable by default** — v4 UUIDs are random; index fragmentation in B-tree databases
- **Large storage footprint** — 36 bytes as a string, 16 bytes as binary; significantly larger than an integer
- **Index performance** — random inserts cause B-tree page splits, degrading write performance at scale
- **Not human-readable** — difficult to reference in logs or support tickets

---

## ULID: Sortable Unique IDs

### What it is

ULID (Universally Unique Lexicographically Sortable Identifier) was designed to fix UUID's sortability problem while keeping global uniqueness.

A ULID looks like this:

```
01ARZ3NDEKTSV4RRFFQ69G5FAV
```

It's 26 characters using Crockford's base32 encoding, representing 128 bits:

- **First 10 characters** — 48-bit millisecond-precision Unix timestamp
- **Last 16 characters** — 80 bits of randomness

Because the timestamp is the high bits, ULIDs sort lexicographically in creation order—newer IDs are always greater.

### Generating ULIDs

```javascript
// Using ulid package
import { ulid } from 'ulid';
const id = ulid();
// '01ARZ3NDEKTSV4RRFFQ69G5FAV'

// With custom timestamp
const id = ulid(Date.now());

// Monotonic factory (guaranteed sort order within same millisecond)
import { monotonicFactory } from 'ulid';
const ulid = monotonicFactory();
const id1 = ulid(1000); // '01BX5ZZKBKACTAV9WEVGEMMVS0'
const id2 = ulid(1000); // '01BX5ZZKBKACTAV9WEVGEMMVS1' (incremented)
```

```python
# Using python-ulid
from ulid import ULID
id = str(ULID())
# '01ARZ3NDEKTSV4RRFFQ69G5FAV'
```

```go
// Using oklog/ulid
import (
    "github.com/oklog/ulid/v2"
    "math/rand"
    "time"
)
entropy := rand.New(rand.NewSource(time.Now().UnixNano()))
ms := ulid.Timestamp(time.Now())
id := ulid.MustNew(ms, entropy).String()
```

### ULID Pros

- **Time-sortable** — lexicographic sort = creation order; great for database indexes
- **Efficient B-tree inserts** — sequential IDs minimize page splits in databases like PostgreSQL, MySQL
- **Compact** — 26 chars vs UUID's 36
- **Case-insensitive** — Crockford base32 avoids ambiguous characters (0/O, 1/I/l)
- **Millisecond precision** — timestamp is always embedded

### ULID Cons

- **Leaks timing information** — someone with two ULIDs can calculate when records were created
- **Library dependency** — no native support in most languages or databases
- **Monotonic mode complexity** — without the monotonic factory, multiple ULIDs in the same millisecond are not guaranteed to sort correctly
- **Less universal** — fewer developers recognize the format at a glance

### When ULID Shines

- **High-write-throughput tables** — event logs, audit trails, time-series data
- **Pagination by ID** — cursor-based pagination `WHERE id > :cursor` works naturally
- **Multi-region writes** — sortable without coordination
- **Anything that benefits from "most recent = largest ID"**

---

## CUID: Collision-Resistant IDs

### What it is

CUID (Collision-Resistant Unique IDentifier) was created by Eric Elliott as a URL-safe, human-friendly alternative to UUID. The current version, **CUID2**, redesigned the format for improved security and randomness.

**CUID (v1) example:**

```
cjld2cjxh0000qzrmn831i7rn
```

**CUID2 example:**

```
tz4a98xxat96iws9zmbrgj3a
```

CUID2 structure: a random letter prefix + a hash of a large random value combined with a counter. Length is configurable (default 24 characters).

### Generating CUIDs

```javascript
// CUID2 (recommended - v1 is deprecated)
import { createId } from '@paralleldrive/cuid2';
const id = createId();
// 'tz4a98xxat96iws9zmbrgj3a'

// Custom length (4-32)
import { init } from '@paralleldrive/cuid2';
const createShortId = init({ length: 10 });
const shortId = createShortId();
// 'lxoq3j8v2p'
```

```python
# Using cuid2
from cuid2 import cuid_wrapper
cuid = cuid_wrapper()
id = cuid()
# 'tz4a98xxat96iws9zmbrgj3a'
```

### CUID2 Pros

- **URL-safe** — only lowercase letters and numbers; no hyphens or special characters
- **Configurable length** — can generate shorter IDs for URLs, longer for maximum collision resistance
- **Starts with a letter** — safe to use as HTML IDs and CSS class names
- **No timestamp exposure** — pure randomness; no timing information leaked
- **Designed for web** — default format works in URLs, DOM IDs, CSS, everywhere

### CUID2 Cons

- **Not sortable** — random by design
- **Not a standard** — less universal than UUID
- **Library required** — no native support anywhere
- **v1 deprecated** — teams on CUID v1 should migrate; v1 has known weaknesses

---

## Side-by-Side Comparison

| Property | UUID v4 | UUID v7 | ULID | CUID2 |
|----------|---------|---------|------|-------|
| Length (string) | 36 | 36 | 26 | 24 (default) |
| Length (bytes) | 16 | 16 | 16 | ~18 |
| Sortable | ❌ | ✅ | ✅ | ❌ |
| Timestamp embedded | ❌ | ✅ | ✅ | ❌ |
| URL-safe | ❌ (hyphens) | ❌ (hyphens) | ✅ | ✅ |
| Native DB support | ✅ | ✅ (growing) | ❌ | ❌ |
| Standard (RFC) | ✅ | ✅ | ❌ | ❌ |
| No library needed | ✅ | ✅ | ❌ | ❌ |
| Leaks timing | ❌ | ✅ | ✅ | ❌ |
| DOM/CSS safe | ❌ (starts w/ digit possible) | ❌ | ❌ | ✅ |

---

## Which Should You Use?

### Use UUID v4 when:

- **Default choice for most applications** — universally supported, zero dependencies, well-understood
- **You're using PostgreSQL, MySQL, or any SQL database** with built-in UUID support
- **Your team is mixed-experience** — everyone knows UUID
- **You don't need sortability** — most CRUD applications don't

```javascript
// Node.js — no dependencies
const { randomUUID } = require('crypto');
const userId = randomUUID();
```

### Use UUID v7 when:

- **You want sortability with UUID compatibility** — same RFC standard, native database support growing
- **You're starting fresh** and want the modern choice
- **You use ORMs** that are adding UUID v7 support (Prisma, TypeORM, Hibernate)

### Use ULID when:

- **Write performance matters** — event sourcing, audit logs, analytics tables with millions of rows/day
- **You need cursor-based pagination** — `WHERE id > :cursor ORDER BY id` works perfectly
- **Time-series data** — natural ordering by insertion time
- **You're comfortable adding a library dependency**

### Use CUID2 when:

- **URLs and DOM elements** — IDs used in HTML, CSS, or URLs benefit from the URL-safe, starts-with-letter format
- **Privacy-sensitive records** — no timestamp means no timing inference from the ID
- **Configurable length** — generating short IDs for user-facing tokens or codes
- **JavaScript/TypeScript projects** — excellent library support in the ecosystem

---

## Database Considerations

### PostgreSQL

PostgreSQL has native UUID support with the `gen_random_uuid()` function and `uuid` column type. For ULID or CUID, store as `VARCHAR(26)` or `TEXT`.

```sql
-- UUID (native)
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL
);

-- ULID (store as text or bytes)
CREATE TABLE events (
  id CHAR(26) PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index efficiency tip: for UUID v4, consider UUID v7 or ULID
-- to avoid B-tree fragmentation on high-insert tables
```

### MySQL / MariaDB

MySQL has a `UUID()` function but no native UUID column type (store as `CHAR(36)` or `BINARY(16)`).

```sql
-- UUID stored as binary (more efficient)
CREATE TABLE users (
  id BINARY(16) PRIMARY KEY DEFAULT (UUID_TO_BIN(UUID(), 1)),
  email VARCHAR(255)
);

-- Retrieve as string
SELECT BIN_TO_UUID(id, 1) as id, email FROM users;
```

The second argument `1` to `UUID_TO_BIN` swaps the time components to make v1 UUIDs sortable—MySQL's workaround before UUID v7.

### MongoDB

MongoDB uses ObjectID by default—a 12-byte BSON type that includes a timestamp (sortable). UUID, ULID, and CUID are all valid string or binary fields in MongoDB documents.

---

## Practical Rule of Thumb

```
Are you building a new project?
├── Yes → Use UUID v4 (default) or UUID v7 (if you want sortability)
└── No → Does your existing codebase use UUID?
    ├── Yes → Stay consistent, add UUID v7 for new high-write tables if needed
    └── No → What's your use case?
        ├── High-write tables, time-series, pagination → ULID
        ├── DOM IDs, URLs, short tokens → CUID2
        └── General records → UUID v4
```

---

## Generate IDs Right Now

The [DevPlaybook UUID Generator](/tools/uuid-generator) generates UUID v1, v4, and v5 directly in your browser—no library needed. Use it to:

- Generate IDs for test data
- Understand UUID format differences visually
- Copy UUIDs for database seed scripts

---

## Conclusion

**UUID v4** remains the safest default for most applications. It's supported natively everywhere, has no dependencies, and works for 95% of use cases.

**UUID v7** is the modern upgrade—same RFC standard, sortable, and gaining database support quickly. For new projects, it's worth considering.

**ULID** wins on high-write, time-ordered workloads. If you're building event logs, audit trails, or any table where insertion order matters for queries, ULID's index efficiency pays real dividends.

**CUID2** is the right choice when IDs appear in URLs, HTML, or CSS—its URL-safe format and letter-prefix make it naturally compatible with the web layer.

The worst choice is debating this for hours. Pick UUID v4, ship, and migrate if a specific performance bottleneck demands it.

---

*Need to validate UUID formats with regex? See our [Regex Cheat Sheet](/blog/regex-cheat-sheet-complete-guide-developers) for UUID patterns. Use the [UUID Generator](/tools/uuid-generator) to generate and validate UUIDs in your browser.*
