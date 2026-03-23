---
title: "JWT Decoder: How to Read Token Payloads"
description: "Learn how to decode JWT tokens and read their payloads. A practical guide to JWT structure, claims, expiry checking, and debugging auth issues with a free online decoder."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["jwt", "authentication", "security", "api", "debugging", "web-development"]
readingTime: "9 min read"
---

JWTs (JSON Web Tokens) look intimidating — long strings of seemingly random characters separated by dots. But they're just encoded JSON. Once you know how to read them, debugging auth issues becomes dramatically faster.

This guide shows you exactly what's inside a JWT payload, how to decode and read it, and what to look for when auth is breaking.

---

## What Is a JWT?

A JWT is a compact, signed token used to transmit information between parties. You'll find them in:

- OAuth 2.0 and OpenID Connect flows
- REST API authorization headers (`Authorization: Bearer <token>`)
- Session tokens in single-page applications
- Identity provider assertions (Auth0, Okta, Cognito, Firebase)

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

Three sections, separated by dots. Each section is Base64URL-encoded.

---

## The Three Parts of a JWT

### Part 1: Header

The first section is the **header**. It describes the token type and the signing algorithm.

Decoded:
```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

**`alg`** — the signing algorithm. Common values:
- `HS256` — HMAC with SHA-256 (symmetric, shared secret)
- `RS256` — RSA with SHA-256 (asymmetric, public/private key)
- `ES256` — ECDSA with SHA-256 (asymmetric, elliptic curve)

**`typ`** — always `JWT` for JSON Web Tokens.

**Security note:** Some algorithms are insecure. Watch for `none` (no signature verification — reject immediately) and `HS256` used in contexts that should use asymmetric keys.

---

### Part 2: Payload

The second section is the **payload** — the actual data. This is the part you read most often when debugging.

Decoded:
```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["user", "editor"],
  "iat": 1516239022,
  "exp": 1516242622
}
```

This section contains **claims** — statements about the user or the token itself.

---

## Standard Claims to Know

The JWT specification defines registered claims that have standard meanings. You'll encounter these in almost every JWT.

### `sub` — Subject

Who the token is about. Usually a user ID or account identifier.

```json
"sub": "user_abc123"
```

### `iss` — Issuer

Who issued the token. Your auth server, identity provider, or a third-party service.

```json
"iss": "https://auth.yourapp.com"
```

Validate this if you accept tokens from multiple issuers.

### `aud` — Audience

Who the token is intended for. Your API, a specific service, or a list of authorized consumers.

```json
"aud": "https://api.yourapp.com"
```

Your API should reject tokens where `aud` doesn't match.

### `iat` — Issued At

Unix timestamp of when the token was issued. Useful for detecting very old tokens.

```json
"iat": 1716239022
```

### `exp` — Expiration

Unix timestamp of when the token expires. **This is the most important claim to check when debugging auth failures.**

```json
"exp": 1716242622
```

### `nbf` — Not Before

Token is not valid before this timestamp. Less common but worth knowing.

---

## How to Decode a JWT Payload

### Using a Browser Tool

The fastest approach: paste the token into the [JWT Decoder](/tools/jwt-decoder) and read the decoded output instantly.

The decoder will:
1. Split the token into header, payload, and signature
2. Base64URL-decode each section
3. Display the JSON with formatting
4. Highlight expiry status and flag expired tokens
5. Show human-readable timestamps for `iat`, `exp`, and `nbf`

No signup, no server-side processing — the token is decoded entirely in your browser.

---

### Manually (to understand how it works)

The payload is Base64URL-encoded. To decode it manually:

1. Take the middle section (between the first and second dot)
2. Convert Base64URL characters: replace `-` with `+` and `_` with `/`
3. Pad to a multiple of 4 characters with `=`
4. Base64-decode
5. Parse as JSON

In JavaScript:

```javascript
function decodePayload(token) {
  const base64Url = token.split('.')[1];
  const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const jsonString = atob(base64);
  return JSON.parse(jsonString);
}

const payload = decodePayload(yourToken);
console.log(payload);
```

In Python:

```python
import base64, json

def decode_payload(token):
    payload_b64 = token.split('.')[1]
    # Add padding
    padding = 4 - len(payload_b64) % 4
    payload_b64 += '=' * padding
    decoded = base64.urlsafe_b64decode(payload_b64)
    return json.loads(decoded)

payload = decode_payload(your_token)
print(payload)
```

**Important:** Decoding a JWT does NOT verify its signature. Anyone can decode a JWT. Only signature verification confirms the token is authentic and unmodified.

---

## Common Auth Debugging Scenarios

### "Token expired" errors

Check the `exp` claim. Convert the Unix timestamp to a human-readable date:

```javascript
const expDate = new Date(payload.exp * 1000);
console.log('Expires:', expDate.toISOString());
console.log('Expired:', Date.now() > payload.exp * 1000);
```

The [JWT Decoder](/tools/jwt-decoder) does this automatically and highlights expired tokens in red.

---

### "Invalid audience" errors

Check the `aud` claim in the token against what your API validates. Mismatch here is a common misconfiguration when moving between environments.

---

### "Permission denied" on specific routes

Look at custom claims — typically `roles`, `permissions`, or `scope`. Your auth provider may be setting these differently than your API expects.

```json
{
  "sub": "user_123",
  "scope": "read:posts write:comments",
  "roles": ["member"]
}
```

---

### Token from wrong issuer

Check the `iss` claim. In multi-environment setups (dev/staging/prod), tokens often leak across environments.

---

## What You Should NOT Do with a JWT Decoder

**Never paste production tokens into untrusted online tools.** A JWT payload contains real user data — IDs, emails, roles. The signature section contains cryptographic material.

Use only tools that:
- Decode in the browser (client-side only, no server processing)
- Clearly state they don't log or store tokens
- Are open source or from a trusted provider

The [JWT Decoder](/tools/jwt-decoder) on DevPlaybook is client-side only — nothing leaves your browser.

---

### Part 3: Signature

The third section is the **signature** — a cryptographic hash that proves the token was issued by the correct party and hasn't been modified.

You cannot decode the signature into readable data (it's a hash, not encoded JSON). But you can verify it using the issuer's public key or secret.

For debugging purposes, focus on the header and payload. Signature verification is handled by your auth library.

---

## Debug Auth Issues Faster with DevPlaybook Pro

The free [JWT Decoder](/tools/jwt-decoder) handles everyday decoding tasks. **DevPlaybook Pro** adds:
- **JWT history** — access previously decoded tokens during a session
- **JWKS fetcher** — automatically fetch public keys from an issuer and verify signatures
- **Claim comparison** — compare tokens from different environments side by side
- **Team sharing** — share decoded token views (without secrets) with your team

[Upgrade to Pro](/pro) — faster auth debugging, fewer back-and-forth sessions.
