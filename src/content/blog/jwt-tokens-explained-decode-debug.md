---
title: "JWT Tokens Explained: How to Decode and Debug Them"
description: "Understand JSON Web Tokens from header to signature. Learn how to decode JWTs, read their claims, debug authentication issues, and use free online JWT tools."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["jwt", "authentication", "security", "developer-tools", "api"]
readingTime: "10 min read"
---

JWTs (JSON Web Tokens) are everywhere in modern web development. They're the standard format for authentication tokens in REST APIs, OAuth flows, session management, and microservice communication. But they look like impenetrable strings of random characters — until you know how to read them.

This guide explains the JWT format from scratch: what each part means, how to decode one, how to verify it, how to debug common authentication errors, and what security mistakes to avoid.

---

## What Is a JWT?

A JWT is a compact, self-contained token that encodes a set of claims as a JSON object. It's digitally signed, so the recipient can verify that the token came from a trusted source and hasn't been tampered with.

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

It's three Base64URL-encoded sections separated by dots:

```
[header].[payload].[signature]
```

---

## JWT Structure: The Three Parts

### Part 1: Header

The header describes the token type and the signing algorithm.

Decode the first part:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9
```

Result:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Common `alg` values:
| Algorithm | Type | Notes |
|-----------|------|-------|
| `HS256` | HMAC-SHA256 | Symmetric — same key to sign and verify |
| `HS384` | HMAC-SHA384 | Symmetric |
| `HS512` | HMAC-SHA512 | Symmetric |
| `RS256` | RSA-SHA256 | Asymmetric — private key signs, public key verifies |
| `RS512` | RSA-SHA512 | Asymmetric |
| `ES256` | ECDSA-SHA256 | Asymmetric, smaller signatures than RSA |
| `none` | No algorithm | ⚠️ Extremely dangerous — never accept in production |

### Part 2: Payload

The payload contains the claims — the actual data in the token.

Decode the second part:
```
eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkFsaWNlIiwiaWF0IjoxNTE2MjM5MDIyfQ
```

Result:
```json
{
  "sub": "1234567890",
  "name": "Alice",
  "iat": 1516239022
}
```

**Registered Claims** (standardized, short names to save space):

| Claim | Name | Meaning |
|-------|------|---------|
| `iss` | Issuer | Who issued the token |
| `sub` | Subject | Who the token is about (usually user ID) |
| `aud` | Audience | Who the token is intended for |
| `exp` | Expiration | Unix timestamp when token expires |
| `nbf` | Not Before | Token not valid before this timestamp |
| `iat` | Issued At | When the token was created |
| `jti` | JWT ID | Unique identifier for this token |

**Custom Claims**: You can add any additional data:
```json
{
  "sub": "user-123",
  "role": "admin",
  "permissions": ["read", "write"],
  "tenant": "acme-corp",
  "exp": 1735689600
}
```

### Part 3: Signature

The signature verifies that the token hasn't been tampered with.

For `HS256`, the signature is calculated as:
```
HMAC-SHA256(
  base64url(header) + "." + base64url(payload),
  secret
)
```

For `RS256`, it's calculated using a private key and can be verified using the corresponding public key.

**Important:** The signature verifies integrity, not confidentiality. The header and payload are just Base64URL encoded — not encrypted. Anyone can read the payload without the secret.

---

## How to Decode a JWT Online

Use the [JWT Decoder](/tools/jwt-decoder) on DevPlaybook to instantly decode any JWT token.

1. Paste the JWT string
2. The tool splits it into header, payload, and signature
3. Decodes each part from Base64URL
4. Shows formatted JSON for header and payload
5. Checks expiration (`exp`) against the current time

This is invaluable for debugging — when an authentication error occurs, the first step is always to decode the token and check what's actually in it.

---

## Decoding JWTs in Code

### JavaScript (Browser & Node.js)

```javascript
// Manual decode (no library needed for reading claims)
function decodeJWT(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT');

  const decode = (str) => {
    // Add padding if needed
    const padded = str + '=='.slice(0, (4 - str.length % 4) % 4);
    return JSON.parse(atob(padded.replace(/-/g, '+').replace(/_/g, '/')));
  };

  return {
    header: decode(parts[0]),
    payload: decode(parts[1]),
    signature: parts[2]
  };
}

const { header, payload } = decodeJWT(token);
console.log(payload.sub); // user ID
console.log(new Date(payload.exp * 1000)); // expiration date
```

For verification (requires a library):
```javascript
// Using jsonwebtoken (Node.js)
import jwt from 'jsonwebtoken';

const decoded = jwt.verify(token, process.env.JWT_SECRET);
console.log(decoded.sub);

// For RS256 with public key
const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] });
```

### Python

```python
import base64
import json

def decode_jwt(token):
    parts = token.split('.')

    def decode_part(part):
        # Add padding
        padded = part + '=' * (4 - len(part) % 4)
        decoded = base64.urlsafe_b64decode(padded)
        return json.loads(decoded)

    return {
        'header': decode_part(parts[0]),
        'payload': decode_part(parts[1]),
    }

# For verification, use PyJWT
import jwt

payload = jwt.decode(token, secret, algorithms=['HS256'])
print(payload['sub'])
```

### Go

```go
import (
    "github.com/golang-jwt/jwt/v5"
)

// Parse and verify
token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
    if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
        return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
    }
    return []byte(secretKey), nil
})

if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
    fmt.Println(claims["sub"])
}
```

---

## JWT Authentication Flow

Understanding the full authentication flow helps you debug issues:

```
Client                          Server
  │                               │
  ├─── POST /login ──────────────►│
  │    {email, password}          │
  │                               │ Verify credentials
  │◄── 200 OK ───────────────────┤
  │    {token: "eyJ..."}          │ Create JWT, sign with secret
  │                               │
  ├─── GET /api/data ────────────►│
  │    Authorization: Bearer eyJ..│
  │                               │ Verify signature
  │                               │ Check exp, iss, aud
  │◄── 200 OK ───────────────────┤
  │    {data: ...}                │
```

**The JWT is:**
1. Issued by the auth server (or the same server)
2. Stored client-side (in memory, localStorage, or a cookie)
3. Sent with every subsequent request in the `Authorization: Bearer` header
4. Verified by the server on every request

---

## Debugging JWT Authentication Errors

When JWT authentication fails, here's a systematic debugging process:

### Step 1: Decode the token

Paste the token into the [JWT Decoder](/tools/jwt-decoder). Check:
- Is the payload what you expect?
- Is the `exp` in the future?
- Is the `iss` (issuer) correct?
- Is the `aud` (audience) correct?

### Step 2: Check expiration

The `exp` claim is a Unix timestamp. If it's in the past, the token is expired.

```javascript
const isExpired = payload.exp < Date.now() / 1000;
```

If tokens are expiring too quickly, check:
- The token TTL setting on your auth server
- Whether the server's clock is in sync with the client's clock

### Step 3: Verify the signature

If the signature verification fails:
- Are you using the correct secret/key?
- Is the algorithm in the header matching what you expect?
- Did the token get modified in transit?

### Step 4: Check the authorization header format

The standard format is:
```
Authorization: Bearer eyJhbGci...
```

Not:
```
Authorization: eyJhbGci...      ← missing "Bearer "
Authorization: bearer eyJhbGci... ← lowercase may fail in some parsers
Authorization: JWT eyJhbGci...  ← wrong prefix
```

### Step 5: Check CORS and cookie settings

If your token is in a cookie:
- Is the `SameSite` attribute correct?
- Is the `Secure` flag set? (required for HTTPS-only)
- Is the `HttpOnly` flag set? (prevents JavaScript access)
- Is the domain correct for cross-origin requests?

---

## Common JWT Security Mistakes

### Accepting `alg: none`

The `none` algorithm means "no signature." Some early JWT libraries accepted it, allowing attackers to forge tokens by:
1. Decoding an existing token
2. Modifying the payload
3. Setting `alg: none` and removing the signature

**Fix:** Explicitly specify which algorithms you accept. Never accept `none`.

```javascript
// Correct — explicitly specify algorithm
jwt.verify(token, secret, { algorithms: ['HS256'] });
```

### Storing JWTs in localStorage

localStorage is accessible to any JavaScript on the page. If your site has an XSS vulnerability, an attacker can read the JWT.

**Fix:** Use `HttpOnly` cookies. These cannot be accessed via JavaScript.

### Not Validating Claims

Just because a JWT has a valid signature doesn't mean you should trust it. You must verify:
- `exp` — token not expired
- `iss` — token from expected issuer
- `aud` — token intended for your service

### Using Weak Secrets for HS256

HS256 with a short or guessable secret can be brute-forced. Weak secrets exposed in public code allow attackers to generate arbitrary valid tokens.

**Fix:** Use secrets of at least 32 random bytes. Or switch to RS256 (asymmetric) where the secret is never shared.

### Logging JWT Tokens

JWT tokens are credentials. Logging them exposes them in your log management system.

**Fix:** Redact tokens in logs. Log token IDs (`jti`) instead of full tokens.

### Not Implementing Token Revocation

JWTs are stateless — once issued, they're valid until they expire. If a user logs out or their account is compromised, you can't easily invalidate the token.

**Approaches:**
- Short expiration + refresh tokens
- Token blocklist (redis-based deny list for `jti` values)
- Reference tokens (opaque tokens that look up a database record)

---

## JWT vs. Opaque Tokens

| Property | JWT | Opaque Token |
|----------|-----|-------------|
| Self-contained | Yes — data encoded in token | No — data in database |
| Stateless verification | Yes | No — requires DB lookup |
| Revocable | Difficult | Easy |
| Size | Grows with claims | Fixed small size |
| Inspection | Decodable without secret | Requires DB lookup |

JWTs are great for stateless APIs at scale. Opaque tokens are simpler when you need easy revocation.

---

## Quick Reference: JWT Tools

| Task | Tool |
|------|------|
| Decode a JWT and inspect claims | [JWT Decoder](/tools/jwt-decoder) |
| Build a JWT from scratch | [JWT Builder](/tools/jwt-builder) |
| Decode Base64URL manually | [Base64 Encoder/Decoder](/tools/base64) |
| Test API endpoints with JWT auth | [API Tester](/tools/api-tester) |

---

## Summary

JWT tokens are Base64URL-encoded JSON, split into three parts: header (algorithm), payload (claims), and signature (verification).

Key takeaways:
- The payload is encoded, not encrypted — don't put secrets in JWTs
- Always verify the signature server-side before trusting claims
- Check `exp`, `iss`, and `aud` claims explicitly
- Never accept `alg: none` in production
- Use the [JWT Decoder](/tools/jwt-decoder) to inspect tokens when debugging auth issues

When authentication breaks, the fastest path to understanding why is decoding the token and reading its actual claims — not guessing what the server might be checking.
