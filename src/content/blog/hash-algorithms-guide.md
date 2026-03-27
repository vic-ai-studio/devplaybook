---
title: "Hash Functions Explained: MD5, SHA-1, SHA-256, and When to Use Each"
description: "Understand cryptographic hash functions: how MD5, SHA-1, SHA-256, and bcrypt work, why you should never use MD5 for passwords, and when each is appropriate in 2026."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["hash", "security", "md5", "sha256", "cryptography"]
readingTime: "2 min read"
---

# Hash Functions Explained: MD5, SHA-1, SHA-256, and When to Use Each

## What is a Hash Function?

A hash function converts input of any size into a fixed-length "fingerprint." The same input always produces the same output. You cannot reverse a hash.

```javascript
// Node.js
const crypto = require('crypto');

console.log(crypto.createHash('sha256').update('hello').digest('hex'));
// Output: 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824

console.log(crypto.createHash('md5').update('hello').digest('hex'));
// Output: 5d41402abc4b2a76b9719d911017c592
```

## Comparison Table

| Algorithm | Output Length | Speed | Security | Use Case |
|-----------|--------------|-------|----------|----------|
| MD5 | 128-bit | Fast | ❌ Broken | File checksums (non-security) |
| SHA-1 | 160-bit | Fast | ❌ Deprecated | Git commits (historical) |
| SHA-256 | 256-bit | Medium | ✅ Secure | General-purpose hashing |
| bcrypt | Variable | Slow | ✅ Secure | Password storage |
| Argon2 | Variable | Slow | ✅ Best | Password storage (recommended) |

## Why MD5 and SHA-1 Are Broken

```javascript
// MD5 collision example (simplified concept)
// Two different inputs can produce the same hash
// This means an attacker can:
const maliciousFile = "malicious content";
const hash = md5(maliciousFile);
// If hash matches a legitimate file's hash, attacker wins
```

**Practical risk:** If your app uses MD5 for password hashing and your database leaks, attackers can look up the password in a rainbow table instantly.

## Password Hashing — Never MD5

```javascript
// ❌ NEVER use MD5/SHA-256 for passwords (fast to brute force)
const hash = sha256(password);

// ✅ Use bcrypt (designed for passwords)
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 12);  // cost factor 12

// Verify
const match = await bcrypt.compare(password, hash);

// ✅ Best: Argon2 (winner of Password Hashing Competition)
const argon2 = require('argon2');
const hash = await argon2.hash(password);
```

## When to Use Each

✅ **SHA-256:** File integrity checks, digital signatures, blockchain
✅ **bcrypt:** Password storage (always use with a salt)
✅ **SHA-1:** Git commit IDs (only for historical reasons)
❌ **MD5:** Never for security (only for non-critical file checksums)

## The Salt

```javascript
// Always use a random salt when hashing passwords
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.createHmac('sha256', salt).update(password).digest('hex');
// Store: salt + hash
```

But use bcrypt or Argon2 instead — they handle salting automatically.
