---
title: "UUID v4 Guide: When to Use UUIDs Instead of Auto-Increment IDs"
description: "What are UUIDs, why use them over auto-increment integers, and how to generate them in JavaScript, Python, and Node.js. Includes performance tradeoffs and use cases."
date: "2026-03-24"
tags: ["uuid", "database", "api", "javascript", "backend"]
readingTime: "2 min read"
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
