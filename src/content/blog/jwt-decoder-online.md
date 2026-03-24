---
title: "JWT Decoder Online — Inspect JSON Web Tokens Instantly"
description: "JWT decoder online — paste any token to see the header, payload, expiry time, and claims decoded in seconds. No library required. Learn how JWT works with code examples."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["jwt", "authentication", "security", "developer-tools", "online-tools"]
readingTime: "7 min read"
faq:
  - question: "Is it safe to paste my JWT into an online decoder?"
    answer: "Only if the tool processes the token entirely in your browser with no network requests. DevPlaybook's JWT decoder runs 100% client-side — your token never leaves your machine."
  - question: "Can I verify a JWT signature with an online tool?"
    answer: "Yes, if you provide the secret key (HMAC) or public key (RSA/ECDSA). For debugging payloads, signature verification is usually unnecessary."
  - question: "What does 'exp' mean in a JWT payload?"
    answer: "'exp' is the expiration time as a Unix timestamp. A JWT decoder shows this as a human-readable date so you can see if the token is expired."
---

# JWT Decoder Online

A **JWT decoder online** tool lets you inspect any JSON Web Token instantly — no library, no terminal, no code. Just paste the token and see the decoded header, payload, claims, and expiry time in a readable format.

This guide covers how JWTs work, what each part contains, and how to decode them in code when you need to do it programmatically.

---

## What Is a JWT?

A JSON Web Token (JWT) is a compact, self-contained token used for authentication and information exchange. It is the standard format for OAuth 2.0 access tokens, OpenID Connect ID tokens, and custom auth systems.

A JWT has three parts separated by dots:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEyMywicm9sZSI6ImFkbWluIiwiZXhwIjoxNzQzMDAwMDAwfQ.abc123signature
```

Each part is Base64url-encoded:

1. **Header** — algorithm and token type
2. **Payload** — the claims (user data, expiry, issuer, etc.)
3. **Signature** — cryptographic proof the token was not tampered with

---

## Decoding the Three Parts

### Header

Decoding the first segment:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Common algorithm values:
- `HS256` — HMAC with SHA-256 (symmetric, one shared secret)
- `RS256` — RSA with SHA-256 (asymmetric, public/private key pair)
- `ES256` — ECDSA with P-256 (smaller keys, same security as RS256)

### Payload

Decoding the second segment:

```json
{
  "userId": 123,
  "role": "admin",
  "email": "user@example.com",
  "iat": 1743000000,
  "exp": 1743086400,
  "iss": "https://auth.example.com"
}
```

Standard claims:
| Claim | Meaning |
|-------|---------|
| `iss` | Issuer — who created the token |
| `sub` | Subject — who the token represents |
| `aud` | Audience — intended recipient |
| `exp` | Expiry time (Unix timestamp) |
| `iat` | Issued-at time |
| `nbf` | Not-before time |
| `jti` | JWT ID — unique identifier |

### Signature

The signature is computed as:

```
HMACSHA256(
  base64url(header) + "." + base64url(payload),
  secret
)
```

For RSA tokens, the signature is the private key signing the header+payload hash. Without the correct secret or public key, you cannot verify the token — but you can always **read** the header and payload.

---

## How to Decode a JWT in Code

### JavaScript (Browser)

```javascript
function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const decode = (part) => {
    // Base64url to Base64
    const base64 = part.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    return JSON.parse(atob(padded));
  };

  return {
    header: decode(parts[0]),
    payload: decode(parts[1]),
    signature: parts[2],
  };
}

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
const decoded = decodeJwt(token);
console.log(decoded.payload.exp); // Unix timestamp
console.log(new Date(decoded.payload.exp * 1000)); // Human-readable
```

### Node.js with `jsonwebtoken`

```javascript
const jwt = require('jsonwebtoken');

// Decode without verifying (inspection only)
const decoded = jwt.decode(token);
console.log(decoded);

// Decode and verify signature
try {
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  console.log('Valid token:', verified);
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    console.log('Token expired at:', err.expiredAt);
  } else {
    console.log('Invalid token:', err.message);
  }
}
```

### Python

```python
import base64
import json

def decode_jwt(token: str) -> dict:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")

    def decode_part(part: str) -> dict:
        # Add Base64 padding
        padded = part + '=' * (4 - len(part) % 4)
        # Replace URL-safe chars
        padded = padded.replace('-', '+').replace('_', '/')
        return json.loads(base64.b64decode(padded))

    return {
        'header': decode_part(parts[0]),
        'payload': decode_part(parts[1]),
        'signature': parts[2],
    }

# Using PyJWT library (recommended for verification)
import jwt as pyjwt

payload = pyjwt.decode(token, key, algorithms=["HS256"])
```

---

## JWT Security Best Practices

### Check Expiry Before Trusting

Never assume a token is valid just because it decodes correctly. Always check `exp`:

```javascript
function isExpired(token) {
  const { payload } = decodeJwt(token);
  return payload.exp * 1000 < Date.now();
}
```

### Validate the Algorithm Header

The `alg: "none"` attack sends a token with no signature and claims it is valid. Your server must always specify which algorithms it accepts — never trust the `alg` field from the token:

```javascript
// Correct: explicitly specify allowed algorithms
jwt.verify(token, secret, { algorithms: ['HS256'] });

// Wrong: lets the token dictate the algorithm
jwt.verify(token, secret);
```

### Never Put Secrets in JWT Payloads

The payload is only Base64-encoded — anyone can read it. Never include passwords, credit card numbers, or private API keys in a JWT payload.

---

## Free Online JWT Decoders

**[DevPlaybook JWT Decoder](https://devplaybook.cc/tools/jwt-decoder)** — Decodes header, payload, and shows expiry time in human-readable format. Works entirely in your browser with no external requests.

**[JWT Builder](https://devplaybook.cc/tools/jwt-builder)** — Create and sign JWTs with HS256 for testing your auth flows.

For Base64-encoded payloads inside JWT claims, the **[Base64 Decoder](https://devplaybook.cc/tools/base64)** handles the conversion.

---

## Debugging Common JWT Errors

| Error | Likely Cause | Fix |
|-------|-------------|-----|
| `TokenExpiredError` | `exp` timestamp is in the past | Re-authenticate to get a fresh token |
| `JsonWebTokenError: invalid signature` | Wrong secret or token was tampered | Verify you are using the correct key |
| `NotBeforeError` | Token issued with `nbf` in the future | Check server clock synchronization |
| `invalid token` | Malformed base64 or wrong format | Confirm the full token including all three parts |

---

## Summary

A JWT decoder online tool removes the friction from token debugging. Paste the token, read the claims, check the expiry. No terminal, no npm install, no code.

Key points:
- The payload is always readable — only the signature requires the secret
- Always verify the signature on the server side before trusting a JWT
- Check `exp` to catch expired tokens early
- Never use `alg: "none"` or trust the algorithm field from user-supplied tokens

Use **[DevPlaybook's JWT Decoder](https://devplaybook.cc/tools/jwt-decoder)** for fast, private token inspection.

---

## Build Authentication Systems Faster

Working on JWT-based auth? The **[Developer Productivity Bundle](https://vicnail.gumroad.com/l/dev-productivity-bundle?utm_source=devplaybook&utm_medium=blog&utm_campaign=jwt-article)** includes GitHub Actions CI/CD workflows and VSCode snippets for auth patterns — $29, one-time purchase.
