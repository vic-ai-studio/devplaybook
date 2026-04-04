---
title: "Hash Functions Explained: MD5, SHA-1, SHA-256, and When to Use Each"
description: "Understand cryptographic hash functions: how MD5, SHA-1, SHA-256, and bcrypt work, why you should never use MD5 for passwords, and when each is appropriate in 2026."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["hash", "security", "md5", "sha256", "cryptography"]
readingTime: "9 min read"
---

# Hash Functions Explained: MD5, SHA-1, SHA-256, and When to Use Each

Hash functions are one of the most important primitives in computer security. They're used everywhere: password storage, digital signatures, file integrity verification, blockchain, git commits, and API request signing. But using the wrong one — especially for passwords — is a serious security vulnerability.

This guide explains what hash functions are, why some are broken, and which to use for each purpose in 2026.

## What is a Hash Function?

A hash function converts input of any size into a fixed-length "fingerprint." The same input always produces the same output. You cannot (in theory) reverse a hash.

```javascript
// Node.js
const crypto = require('crypto');

crypto.createHash('sha256').update('hello').digest('hex');
// 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824

crypto.createHash('md5').update('hello').digest('hex');
// 5d41402abc4b2a76b9719d911017c592
```

Three key properties of a good cryptographic hash:

1. **Deterministic**: Same input → same output, every time
2. **One-way**: Computationally infeasible to reverse (given the hash, you can't get the input)
3. **Collision-resistant**: Hard to find two different inputs that produce the same hash

When an algorithm breaks, it typically breaks property 3 (collisions become findable) or property 2 (pre-image attacks become practical).

## Comparison Table

| Algorithm | Output Length | Speed | Security Status | Use Case |
|-----------|--------------|-------|---------|----------|
| MD5 | 128-bit (32 hex chars) | Very fast | **BROKEN** | Non-security checksums only |
| SHA-1 | 160-bit (40 hex chars) | Fast | **DEPRECATED** | Git commits (legacy) |
| SHA-256 | 256-bit (64 hex chars) | Medium | Secure | General-purpose hashing |
| SHA-512 | 512-bit (128 hex chars) | Medium | Secure | Higher security requirements |
| bcrypt | Variable | Slow (intentionally) | Secure | Password storage |
| scrypt | Variable | Very slow | Secure | Password storage (memory-hard) |
| Argon2 | Variable | Configurable | Best | Password storage (recommended) |

The "speed" column is key: fast algorithms (MD5, SHA-256) are bad for password storage precisely because they're fast — an attacker can try billions of guesses per second. Password hashing algorithms (bcrypt, Argon2) are deliberately slow.

## Why MD5 is Broken

MD5 was broken in 2004 when researchers demonstrated practical collision attacks — meaning they could find two different inputs that produce the same MD5 hash. By 2008, this was being exploited in the wild to forge SSL certificates.

The practical implications:

```python
# MD5 rainbow tables exist with BILLIONS of pre-computed values
# If your database leaks with MD5 passwords, an attacker can look them up instantly:

import hashlib
password = "password123"
hash_value = hashlib.md5(password.encode()).hexdigest()
# d0199f51d2728db6011945145a1b607a
# This is immediately crackable via online lookup tables
```

MD5 should never be used for:
- Password storage
- Digital signatures
- Security-critical applications

MD5 is still acceptable for:
- Non-security checksums (verifying file transfer integrity, not detecting malicious tampering)
- Legacy systems where migration isn't possible
- Hash-based data structures (like HashMap) where security isn't relevant

## Why SHA-1 is Deprecated

SHA-1 was officially deprecated by NIST in 2011 and Google demonstrated a practical SHA-1 collision attack in 2017 (SHAttered attack). The attack required massive computational resources, but it's now within reach of well-funded attackers.

SHA-1 is still used in Git for commit hashes (historically), but Git is migrating to SHA-256. SHA-1 is not used in any new security-critical context.

## SHA-256: The Workhorse

SHA-256 is the current standard for general-purpose hashing. It's part of the SHA-2 family (SHA-224, SHA-256, SHA-384, SHA-512), all of which remain secure.

```javascript
// Node.js
const crypto = require('crypto');

// SHA-256 for file integrity
function hashFile(filePath) {
  const content = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(content).digest('hex');
}

// SHA-256 for API request signing (HMAC)
function signRequest(secretKey, message) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

// SHA-256 for generating deterministic IDs from content
function contentId(content) {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}
```

```python
# Python
import hashlib
import hmac

# SHA-256
hash_value = hashlib.sha256(b'hello').hexdigest()

# HMAC-SHA256 (for request signing, token verification)
mac = hmac.new(b'secret-key', b'message', hashlib.sha256).hexdigest()
```

SHA-256 is appropriate for:
- File integrity verification
- Digital signatures (as part of RSA or ECDSA)
- HMAC-based authentication (API request signing)
- Blockchain and Merkle trees
- Deriving keys (as part of key derivation functions)

SHA-256 is **NOT** appropriate for:
- Password storage — use bcrypt, scrypt, or Argon2

## Password Hashing: Never Use Regular Hash Functions

This is the most important part of this guide. Using SHA-256 or MD5 for password storage is wrong, even with a salt.

The reason: SHA-256 is designed to be fast. Modern GPUs can compute billions of SHA-256 hashes per second. An attacker with a stolen database can try every word in the dictionary, every common password, and billions of variations in hours or days.

Password hashing algorithms solve this by being intentionally slow and expensive:

```javascript
// bcrypt — the safe default for most applications
const bcrypt = require('bcrypt');

// Hash (during registration)
const saltRounds = 12;  // Higher = slower (2^12 rounds)
const hash = await bcrypt.hash(password, saltRounds);
// $2b$12$... (bcrypt includes the salt and rounds in the hash string)

// Verify (during login)
const match = await bcrypt.compare(password, hash);  // true or false

// How slow is it? Intentionally:
// saltRounds = 10: ~100ms
// saltRounds = 12: ~250ms
// saltRounds = 14: ~1000ms
// An attacker can only try a few thousand per second, not billions
```

```python
# Python: bcrypt
import bcrypt

# Hash
password = "user_password_123"
hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=12))

# Verify
is_valid = bcrypt.checkpw(password.encode(), hashed)
```

### Argon2 — The Best Choice for New Systems

Argon2 won the Password Hashing Competition in 2015 and is the recommended algorithm for new applications. It's memory-hard (an attacker needs lots of RAM, not just CPU), making it resistant to GPU and ASIC attacks.

```javascript
// argon2 (Node.js)
const argon2 = require('argon2');

// Hash (sensible defaults)
const hash = await argon2.hash(password);
// $argon2id$v=19$m=65536,t=3,p=4$...

// Verify
const match = await argon2.verify(hash, password);
```

```python
# Python
import argon2

ph = argon2.PasswordHasher()

# Hash
hash = ph.hash("user_password")

# Verify
try:
    ph.verify(hash, "user_password")
    is_valid = True
except argon2.exceptions.VerifyMismatchError:
    is_valid = False
```

## The Salt

When you see bcrypt or Argon2 hashes, they include the salt embedded in the hash string. You don't need to manage salts separately.

For manual salting with SHA-256 (not recommended for passwords, but sometimes needed for other purposes):

```javascript
// Generate a random salt
const salt = crypto.randomBytes(32).toString('hex');

// Hash with salt
const hash = crypto.createHash('sha256').update(salt + password).digest('hex');

// Store both: { salt, hash }
// To verify: same salt + password → should produce same hash
```

Even with salting, don't use SHA-256 for passwords. Salts prevent rainbow table attacks but not brute force. Bcrypt/Argon2 are still orders of magnitude slower than SHA-256 with a salt.

## HMAC — Hash-Based Message Authentication

HMAC (Hash-based Message Authentication Code) is how you use hashing for API authentication and message integrity. It uses a secret key to prove that a message came from someone who knows the key.

```javascript
// Create an HMAC signature (for API request signing)
const crypto = require('crypto');

function createHmacSignature(secretKey, message) {
  return crypto
    .createHmac('sha256', secretKey)
    .update(message)
    .digest('hex');
}

// Verify an incoming webhook (e.g., from GitHub)
function verifyWebhookSignature(secretKey, body, receivedSignature) {
  const expected = 'sha256=' + createHmacSignature(secretKey, body);
  // Use timingSafeEqual to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(receivedSignature),
    Buffer.from(expected)
  );
}
```

Always use `timingSafeEqual` (or equivalent) when comparing signatures. Regular string comparison (`===`) has variable execution time based on how many characters match, which can leak information about the signature to timing attacks.

## Practical Decision Guide

**Use SHA-256 when:**
- Verifying file integrity (checksums)
- Signing API requests (via HMAC-SHA256)
- Building digital signatures (as part of RSA/ECDSA)
- Content-based deduplication (hashing file content to detect duplicates)
- Generating deterministic IDs from content

**Use bcrypt when:**
- Storing passwords in a SQL database
- Building a new authentication system where simplicity matters
- Your language has a battle-tested bcrypt library

**Use Argon2id when:**
- Building a new system and you want the best available security
- You have memory-constrained attackers as your threat model
- You can add the `argon2` package to your dependencies

**Never use MD5 or SHA-1 for:**
- Passwords (ever)
- Digital signatures
- Any new security-critical application

**MD5 is acceptable for:**
- Verifying file transfer integrity (not security, just "did the download complete successfully?")
- Non-security checksum generation

## Key Takeaways

- **MD5 and SHA-1 are broken** for security purposes. Don't use them.
- **SHA-256** is secure for general-purpose hashing (files, signatures, HMACs).
- **Never use SHA-256 for passwords** — it's too fast. Use bcrypt, scrypt, or Argon2.
- **Argon2id** is the recommended algorithm for new password storage systems.
- **HMAC** is how you use hash functions for authentication — always use a secret key.
- Use **timingSafeEqual** when comparing signatures to prevent timing attacks.

## FAQ

**Can I add a salt to SHA-256 and use it for passwords?**
No. Even with a salt, SHA-256 is still 10,000x faster than bcrypt for attackers using GPUs. Use a proper password hashing algorithm.

**How do I choose the cost factor for bcrypt?**
Pick the highest value where hashing still takes less than 500ms on your server. Start with 12 and test. As servers get faster, increase the rounds.

**Is bcrypt or Argon2 better?**
Argon2 is technically superior (memory-hard, more configurable, won the competition). Use it for new projects. bcrypt is battle-tested with decades of real-world use. Both are excellent choices.

**Why does git use SHA-1 if it's deprecated?**
Git uses SHA-1 for content addressing, not security — it's used to detect accidental corruption (bit rot), not malicious attacks. Git is migrating to SHA-256 for new repositories. For most projects, the collision risk in git is theoretical.
