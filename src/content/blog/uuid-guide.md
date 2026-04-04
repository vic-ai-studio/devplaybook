---
title: "UUID v4 Guide: When to Use UUIDs Instead of Auto-Increment IDs"
description: "Learn when and how to use UUIDs over auto-increment IDs in JavaScript, Python, and Node.js. Covers v4 vs v7, performance tradeoffs, and real-world use cases."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["uuid", "database", "api", "javascript", "backend"]
readingTime: "5 min read"
---

# UUID v4 Guide: When to Use UUIDs Instead of Auto-Increment IDs

## What is a UUID?

A UUID (Universally Unique Identifier) is a 128-bit identifier formatted as 36 characters.

```
xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
Example: 550e8400-e29b-41d4-a716-446655440000
```

## UUID v4 (Random)

UUID v4 generates 122 random bits + 4 fixed bits. Probability of collision is essentially zero for any practical application.

```javascript
// Browser
const uuid = crypto.randomUUID();  // native browser API
// Output: "f47ac10b-58cc-4372-a567-0e02b2c3d479"

// Node.js
import { v4 as uuidv4 } from 'uuid';
console.log(uuidv4());  // requires 'uuid' package
```

## Why Not Auto-Increment?

| Feature | Auto-Increment | UUID v4 |
|---------|----------------|---------|
| Exposes record count | ✅ Yes | ❌ No |
| URLs are guessable | ✅ Yes | ❌ No |
| Merge across databases | ❌ Difficult | ✅ Easy |
| Distributed generation | ❌ Requires coordination | ✅ Independent |
| Security | ❌ Sequential | ✅ Random |

## When UUIDs Make Sense

✅ **Microservices:** Each service generates IDs independently
✅ **Offline-first apps:** IDs created without database connection
✅ **Public APIs:** Don't expose internal record counts
✅ **Merging datasets:** No ID collisions across systems

## Performance Tradeoffs

| Aspect | Auto-Increment | UUID v4 |
|---------|----------------|---------|
| Index size | 4-8 bytes | 36 bytes |
| Insert performance | ✅ Fast (sequential) | ⚠️ Slower (random, index fragmentation) |
| Read performance | ✅ Fast | ✅ Same |
| Database size | Smaller | ~5x larger indexes |

**Solution for performance:** Use UUID v7 (time-ordered UUID) — combines time sorting with uniqueness.

## Python Example

```python
import uuid

# UUID v4 (random)
uid = uuid.uuid4()
print(uid)  # UUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')
print(str(uid))  # f47ac10b-58cc-4372-a567-0e02b2c3d479

# UUID v7 (time-ordered, recommended for databases)
uid7 = uuid.uuid7()
```

## When to Stick with Auto-Increment

Internal-only records with no public API exposure
High-volume inserts where index performance matters
Single-database applications with no merging needs

---

## Real-World Scenario

Consider a SaaS platform that starts as a single monolithic application with a single PostgreSQL database. Early on, auto-increment IDs work fine — everything lives in one place, and sequential IDs keep inserts fast. But six months later, you need to split off a separate billing service and a notification service. Suddenly, your order ID `1042` in the orders database conflicts with billing record `1042` in the billing database. You cannot merge event logs across services without collision, and any attempt to do so requires building a manual mapping layer.

Had you used UUIDs from the start, every record generated across every service would carry a globally unique ID regardless of which database created it. Your billing service, orders service, and notification service could all emit events with their native IDs, and an analytics pipeline could join them without ambiguity. This is not a hypothetical — it is the exact reason companies like Stripe, Twilio, and GitHub use UUID-based resource identifiers in all their public APIs.

A second common scenario is offline-first mobile apps. When a field technician uses your app without network connectivity, they may create 50 records before syncing. With auto-increment IDs, the client has no way to assign IDs — it must wait for the server to respond. With UUIDs generated client-side using `crypto.randomUUID()`, each record gets a stable, permanent ID the moment it is created on the device. Sync becomes a simple upsert operation: the server either stores the record under its UUID or ignores it if already present.

---

## Quick Tips

1. **Use `crypto.randomUUID()` in the browser instead of a library.** It is a native Web API available in all modern browsers and Node.js 19+, with no dependency overhead and cryptographically secure output.

2. **Store UUIDs as binary in MySQL.** The string representation `f47ac10b-58cc-...` is 36 bytes. Storing as `BINARY(16)` cuts that to 16 bytes and dramatically reduces index size. Use `UUID_TO_BIN(uuid, 1)` with the swap flag enabled to keep the time component sortable.

3. **Prefer UUID v7 for new database-heavy projects.** Unlike v4 (fully random), v7 is time-ordered. This means inserts land near the end of the B-tree index rather than scattered randomly, which eliminates the page fragmentation that makes UUID v4 slow on write-heavy workloads.

4. **Never expose auto-increment IDs in public URLs or API responses.** Sequential IDs let anyone enumerate your records: a competitor can hit `/api/orders/1`, `/api/orders/2`, and so on to estimate your transaction volume. Switching to UUIDs in public-facing endpoints closes this information leak even if you keep auto-increment as the internal primary key.

5. **Use a composite approach when migrating legacy tables.** Add a `public_id UUID DEFAULT gen_random_uuid()` column to existing tables rather than changing the primary key. Keep auto-increment as the internal join key and expose only the UUID externally. This avoids a costly table migration while gaining the security benefit immediately.
