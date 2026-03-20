---
title: "How to Decode JWT Tokens Online: Complete Developer Guide"
description: "Learn how to decode JWT tokens online and understand their structure. Includes code examples in JavaScript and Python, security best practices, and common JWT pitfalls."
date: "2026-03-20"
author: "DevPlaybook Team"
tags: ["jwt", "authentication", "javascript", "python", "security", "web-development"]
readingTime: "8 min read"
---

JSON Web Tokens (JWTs) are everywhere in modern web development. Every time you authenticate with OAuth, call a secured API, or implement single sign-on, JWTs are likely involved. Yet most developers have copy-pasted JWT handling code without fully understanding what is inside the token.

This guide explains how JWTs work, how to decode them, and how to avoid the security traps that catch developers off guard. You can also use our free [JWT Decoder tool](/tools/jwt-decoder) to inspect tokens directly in your browser.

## What Is a JWT?

A JWT (pronounced "jot") is a compact, URL-safe token format defined by [RFC 7519](https://tools.ietf.org/html/rfc7519). It encodes claims — statements about a user or system — in a way that can be verified and trusted.

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Three parts separated by dots:

1. **Header** — algorithm and token type
2. **Payload** — the actual claims
3. **Signature** — cryptographic verification

## The Three Parts Explained

### Header

The header is a Base64URL-encoded JSON object:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

The `alg` field tells you the signing algorithm. Common values are `HS256` (HMAC-SHA256), `RS256` (RSA-SHA256), and `ES256` (ECDSA-SHA256). The `none` algorithm is dangerous — more on that below.

### Payload

The payload contains claims — key-value pairs about the subject:

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "admin",
  "iat": 1516239022,
  "exp": 1516242622
}
```

**Standard claims** (registered by IANA):

| Claim | Meaning |
|-------|---------|
| `sub` | Subject (user ID) |
| `iss` | Issuer (who created the token) |
| `aud` | Audience (intended recipient) |
| `exp` | Expiration time (Unix timestamp) |
| `iat` | Issued at (Unix timestamp) |
| `nbf` | Not before (token not valid before this time) |
| `jti` | JWT ID (unique identifier) |

### Signature

The signature verifies the token has not been tampered with:

```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  secret
)
```

**The payload is NOT encrypted — it is only encoded.** Anyone can read the payload. The signature only proves the token was created by someone who knows the secret key.

## How to Decode a JWT in JavaScript

### Browser (one-liner)

```javascript
function decodeJWT(token) {
  const [header, payload, signature] = token.split('.');

  const decode = (str) => {
    // Base64URL to Base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Pad to multiple of 4
    const padded = base64.padEnd(base64.length + (4 - base64.length % 4) % 4, '=');
    return JSON.parse(atob(padded));
  };

  return {
    header: decode(header),
    payload: decode(payload),
    signature: signature
  };
}

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFsaWNlIn0.abc123';
console.log(decodeJWT(token));
// { header: { alg: 'HS256', typ: 'JWT' }, payload: { sub: '1234', name: 'Alice' }, signature: 'abc123' }
```

### Node.js with `jsonwebtoken`

```javascript
const jwt = require('jsonwebtoken');

// Decode without verification (read-only)
const decoded = jwt.decode(token, { complete: true });
console.log(decoded.header);   // { alg: 'HS256', typ: 'JWT' }
console.log(decoded.payload);  // { sub: '1234', name: 'Alice', iat: ... }

// Verify and decode (requires secret/public key)
try {
  const verified = jwt.verify(token, process.env.JWT_SECRET);
  console.log(verified.sub); // '1234'
} catch (err) {
  if (err.name === 'TokenExpiredError') {
    console.error('Token has expired');
  } else if (err.name === 'JsonWebTokenError') {
    console.error('Invalid token');
  }
}
```

## How to Decode a JWT in Python

### Standard library only

```python
import base64
import json

def decode_jwt(token: str) -> dict:
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError("Invalid JWT format")

    def decode_part(part: str) -> dict:
        # Add Base64 padding
        padding = 4 - len(part) % 4
        part += '=' * (padding % 4)
        # Base64URL to Base64
        part = part.replace('-', '+').replace('_', '/')
        return json.loads(base64.b64decode(part))

    return {
        'header': decode_part(parts[0]),
        'payload': decode_part(parts[1]),
        'signature': parts[2]
    }

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0IiwibmFtZSI6IkFsaWNlIn0.abc123"
result = decode_jwt(token)
print(result['payload'])  # {'sub': '1234', 'name': 'Alice'}
```

### With `PyJWT`

```python
import jwt

# Decode without verification
decoded = jwt.decode(token, options={"verify_signature": False})
print(decoded)  # {'sub': '1234', 'name': 'Alice'}

# Verify and decode
try:
    verified = jwt.decode(token, key=SECRET_KEY, algorithms=["HS256"])
    print(verified['sub'])
except jwt.ExpiredSignatureError:
    print("Token has expired")
except jwt.InvalidTokenError as e:
    print(f"Invalid token: {e}")
```

## Checking Token Expiry

Always check `exp` before trusting a JWT:

```javascript
function isTokenExpired(token) {
  const { payload } = decodeJWT(token);
  if (!payload.exp) return false; // No expiry = never expires
  return Date.now() >= payload.exp * 1000; // exp is in seconds
}
```

```python
from datetime import datetime

def is_expired(token: str) -> bool:
    payload = decode_jwt(token)['payload']
    if 'exp' not in payload:
        return False
    return datetime.utcnow().timestamp() >= payload['exp']
```

## Security Pitfalls to Avoid

### 1. The `alg: none` attack

An attacker strips the signature and sets `"alg": "none"`. Libraries that trust the header's algorithm claim will accept unsigned tokens. Always specify allowed algorithms explicitly:

```javascript
// VULNERABLE
jwt.verify(token, secret); // trusts header alg

// SAFE
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### 2. Storing JWTs in localStorage

`localStorage` is accessible to any JavaScript on the page, making it vulnerable to XSS attacks. Store tokens in `httpOnly` cookies instead.

### 3. Not validating `iss` and `aud`

Always verify the issuer and audience match your expected values:

```python
jwt.decode(token, key=PUBLIC_KEY, algorithms=["RS256"],
           audience="https://your-api.com",
           issuer="https://auth.your-app.com")
```

### 4. Sensitive data in the payload

Remember: the payload is only encoded, not encrypted. Never put passwords, credit card numbers, or PII in a JWT payload.

## Quick Reference: Common JWT Issues

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `TokenExpiredError` | `exp` claim in the past | Refresh the token |
| `InvalidSignatureError` | Wrong secret or key | Check key rotation |
| Garbled payload | Base64URL vs Base64 confusion | Handle `-` `_` padding correctly |
| `alg: none` accepted | Missing algorithm validation | Specify `algorithms` parameter |

## Inspect JWTs Without Code

For debugging during development, paste your token into the [JWT Decoder](/tools/jwt-decoder) — it decodes the header and payload instantly in your browser with no data sent to any server.

Understanding the structure inside your tokens is the first step to building secure, reliable authentication systems. Once you can read a JWT, you can debug auth issues in seconds instead of hours.
