---
title: "JWT Token Decoder: How to Debug Authentication Issues"
description: "Learn how to use a JWT token decoder to diagnose 401 errors, expired tokens, missing claims, and auth misconfiguration. Practical debugging guide with code examples."
date: "2026-03-25"
author: "DevPlaybook Team"
tags: ["jwt", "authentication", "debugging", "developer-tools", "security", "api"]
readingTime: "11 min read"
faq:
  - question: "How do I decode a JWT without a tool?"
    answer: "Split the token on dots to get three parts. Base64url-decode the second part (payload) to get the JSON claims. In JavaScript: JSON.parse(atob(token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')))."
  - question: "Why am I getting a 401 Unauthorized even with a valid-looking JWT?"
    answer: "Common causes: the token is expired (check the exp claim), the signature is invalid (wrong secret or key), the audience (aud) claim doesn't match the expected value, or the token is being sent in the wrong header format."
  - question: "Is it safe to decode a JWT in an online tool?"
    answer: "For development/staging tokens with fake data, yes. For production tokens containing real user data (emails, user IDs, roles), use local decoding only — never paste production tokens into public websites."
  - question: "What is the difference between JWT signing and JWT encryption?"
    answer: "A signed JWT (JWS) has a verifiable signature but the payload is readable by anyone. An encrypted JWT (JWE) makes the payload unreadable without the decryption key. Most systems use JWS, not JWE."
  - question: "How do I check if a JWT has expired?"
    answer: "The exp claim is a Unix timestamp (seconds since epoch). Compare it to the current time: if exp < Date.now()/1000 in JavaScript, the token is expired."
---

Authentication bugs are among the most frustrating to debug. A 401 Unauthorized response gives you nothing to work with. The request looks right. The token looks right. Something is wrong — but what?

JWT tokens contain the answer. Every claim, expiration time, issuer, and audience value is encoded inside the token itself. Decoding the token shows exactly what the server is receiving and often makes the bug obvious immediately.

This guide shows how to use a JWT decoder effectively, explains what each part of a token means, and walks through the most common authentication issues with step-by-step debugging approaches.

---

## JWT Structure: What You're Looking At

A JWT looks like this:

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyXzEyMyIsImVtYWlsIjoidXNlckBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxMTA1ODQwMCwiZXhwIjoxNzExMTQ0ODAwfQ.signature_here
```

It's three Base64url-encoded sections separated by dots:

1. **Header** — algorithm and token type
2. **Payload** — claims (the actual data)
3. **Signature** — cryptographic proof of integrity

### Decoded Header

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

The header tells you which algorithm was used to sign the token. This is critical for debugging signature verification failures.

### Decoded Payload

```json
{
  "sub": "user_123",
  "email": "user@example.com",
  "role": "admin",
  "iat": 1711058400,
  "exp": 1711144800
}
```

The payload contains the claims — the actual data the token carries. Standard claims (`sub`, `iat`, `exp`) have defined meanings. Custom claims (`email`, `role`) are application-specific.

### Signature

The signature is a cryptographic hash of `base64url(header) + "." + base64url(payload)` using the signing key. You can't verify it without the secret (for HMAC) or public key (for RSA/EC), but you can inspect the header and payload without it.

---

## How to Decode a JWT

### Using DevPlaybook JWT Decoder

[DevPlaybook's JWT Decoder](/tools/jwt-decoder) is built for speed. Paste your token — the header, payload, and signature appear immediately in separate panels. Key features:

- Human-readable timestamps for `exp`, `iat`, and `nbf`
- Color-coded expired/valid indication
- Highlights the `alg` field so you immediately see if `none` is present
- No data sent to any server — all decoding happens in your browser

For development tokens, this is the fastest way to inspect what you're working with.

### Decoding Without a Tool

In JavaScript (browser or Node.js):

```javascript
function decodeJwt(token) {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  // Base64url → Base64 → JSON
  const header = JSON.parse(atob(
    parts[0].replace(/-/g, '+').replace(/_/g, '/')
  ));
  const payload = JSON.parse(atob(
    parts[1].replace(/-/g, '+').replace(/_/g, '/')
  ));

  return { header, payload, signature: parts[2] };
}

const decoded = decodeJwt('eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIn0.sig');
console.log(decoded.payload.sub); // "user123"
```

In Python:

```python
import base64
import json

def decode_jwt(token):
    parts = token.split('.')
    if len(parts) != 3:
        raise ValueError('Invalid JWT format')

    # Add padding if needed
    def decode_part(part):
        padded = part + '=' * (4 - len(part) % 4)
        return json.loads(base64.urlsafe_b64decode(padded))

    return {
        'header': decode_part(parts[0]),
        'payload': decode_part(parts[1]),
        'signature': parts[2]
    }

decoded = decode_jwt(token)
print(decoded['payload']['email'])
```

In the command line:

```bash
# Decode JWT payload using jq and base64
TOKEN="eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyMTIzIiwiZXhwIjoxNzExMTQ0ODAwfQ.sig"

# Extract and decode the payload (second part)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

---

## Debugging Common JWT Authentication Issues

### Issue 1: Token Expired (401 with "token expired" or "jwt expired")

**Symptom:** Authentication worked yesterday. Now it returns 401 with a message like `"exp claim is in the past"` or `"jwt expired"`.

**Debug steps:**

1. Decode the token and find the `exp` claim
2. Compare to current time

```javascript
// Check if token is expired
function isExpired(token) {
  const { payload } = decodeJwt(token);
  if (!payload.exp) return false; // No expiry
  return payload.exp < Date.now() / 1000;
}

// Show human-readable expiry
function getExpiry(token) {
  const { payload } = decodeJwt(token);
  if (!payload.exp) return 'No expiry';
  return new Date(payload.exp * 1000).toLocaleString();
}

console.log('Expired:', isExpired(token));
console.log('Expires at:', getExpiry(token));
```

**Common causes:**
- Short-lived access tokens (15 minutes is common) that need refresh
- Clock skew between client and server — the issuer's clock is ahead
- Token not refreshed after the user session resumed

**Fixes:**
- Implement token refresh logic before expiration
- Add clock skew tolerance in your validator: `if (exp < now - CLOCK_SKEW_SECONDS)`
- Check that your token storage is persisting the refreshed token

---

### Issue 2: Signature Verification Failed

**Symptom:** Token isn't expired. Claims look correct. But the server returns 401 with `"invalid signature"` or `"signature verification failed"`.

**Debug steps:**

1. Check the `alg` claim in the header

```javascript
const { header } = decodeJwt(token);
console.log('Algorithm:', header.alg);
```

2. Verify the algorithm matches what your server expects

**Common causes:**

- **Wrong secret:** The token was signed with `secret_A`, but the server validates with `secret_B`. This happens when secrets rotate and old tokens aren't invalidated.
- **Algorithm mismatch:** Token uses `HS256`, server expects `RS256`. Check server config.
- **Key encoding:** HMAC secrets may be stored as raw strings in one place and base64-encoded in another.
- **`alg: none` attack mitigation:** Some libraries reject tokens with `alg: none` by default — check if you're intentionally sending unsigned tokens.

```javascript
// Verify signature locally (Node.js with jsonwebtoken)
const jwt = require('jsonwebtoken');

try {
  const decoded = jwt.verify(token, process.env.JWT_SECRET, {
    algorithms: ['HS256'] // Be explicit about allowed algorithms
  });
  console.log('Valid token:', decoded);
} catch (err) {
  console.log('Verification failed:', err.message);
  // err.message gives specific reason: "invalid signature", "jwt expired", etc.
}
```

---

### Issue 3: Missing or Wrong Claims

**Symptom:** Token is valid, but the application returns a 403 Forbidden, or specific features are inaccessible.

**Debug steps:**

1. Decode and inspect the payload for the expected claims

```javascript
const { payload } = decodeJwt(token);
console.log('All claims:', JSON.stringify(payload, null, 2));
console.log('Role:', payload.role);
console.log('Permissions:', payload.permissions);
console.log('Audience:', payload.aud);
```

**Common causes:**

- **Role not assigned:** The user exists but the role claim wasn't included when the token was issued. Check the token issuance logic.
- **Wrong audience (`aud`):** A token issued for `api.company.com` is being sent to `admin.company.com`. The `aud` claim must match.
- **Tenant/organization ID missing:** Multi-tenant apps often require a `tenantId` claim. If it's missing, the server rejects the request.
- **Stale token:** User's role was updated after the token was issued. The token still carries the old role.

```javascript
// Validate required claims
function validateClaims(token, requiredRole, audience) {
  const { payload } = decodeJwt(token);
  const errors = [];

  if (payload.role !== requiredRole) {
    errors.push(`Expected role '${requiredRole}', got '${payload.role}'`);
  }

  if (payload.aud !== audience && !payload.aud?.includes(audience)) {
    errors.push(`Expected audience '${audience}', got '${payload.aud}'`);
  }

  if (!payload.sub) {
    errors.push('Missing sub (subject) claim');
  }

  return { valid: errors.length === 0, errors };
}
```

---

### Issue 4: Token Not Sent Correctly

**Symptom:** Server logs show no token received, or the token can't be parsed.

**Debug steps:**

Check how the token is being sent in the request header.

**Correct format:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
```

Note the space after `Bearer`. Common mistakes:

```
// Wrong — no space
Authorization: BearereyJhbGc...

// Wrong — different capitalization (some servers are case-sensitive)
authorization: bearer eyJhbGc...

// Wrong — token in wrong header
X-Auth-Token: eyJhbGc...  (when server expects Authorization: Bearer)

// Wrong — extra quotes around token
Authorization: Bearer "eyJhbGc..."
```

In browser fetch:

```javascript
const response = await fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${token}`, // Note the template literal — no extra quotes
    'Content-Type': 'application/json'
  }
});
```

In curl:

```bash
# Correct
curl -H "Authorization: Bearer $TOKEN" https://api.example.com/data

# Check what headers are being sent
curl -v -H "Authorization: Bearer $TOKEN" https://api.example.com/data 2>&1 | grep "Authorization"
```

---

### Issue 5: CORS Preflight Blocking the Token

**Symptom:** Authentication works in Postman or curl, but fails in the browser. DevTools shows a CORS error before the 401.

**Debug steps:**

This is a CORS configuration issue on the server, not a JWT issue. But checking the token helps confirm the token itself is fine.

1. Open DevTools → Network tab
2. Find the preflight (OPTIONS) request to the API
3. Check the response headers for `Access-Control-Allow-Headers`

The server must explicitly allow the `Authorization` header in CORS:

```
Access-Control-Allow-Headers: Content-Type, Authorization
```

If `Authorization` is missing from that list, the browser blocks the request before the token is even evaluated.

---

### Issue 6: Clock Skew Between Client and Server

**Symptom:** Token appears valid when decoded locally but the server rejects it as expired.

**Debug steps:**

1. Check the current time on both client and server
2. Compare with the `exp` and `iat` claims

```javascript
const { payload } = decodeJwt(token);
const now = Math.floor(Date.now() / 1000);

console.log('Current time (unix):', now);
console.log('Token issued at:', payload.iat, '=', new Date(payload.iat * 1000).toISOString());
console.log('Token expires at:', payload.exp, '=', new Date(payload.exp * 1000).toISOString());
console.log('Seconds until expiry:', payload.exp - now);
console.log('Seconds since issued:', now - payload.iat);
```

If the server's clock is 5 minutes ahead of the client's, tokens that look valid to the client appear expired to the server.

**Fix:** Add clock skew tolerance (typically 30-300 seconds) in your JWT validation configuration:

```javascript
// jsonwebtoken library example
jwt.verify(token, secret, {
  clockTolerance: 300 // 5 minutes
});
```

---

## JWT Security Checklist

When debugging auth issues, also verify your implementation against these security requirements:

- [ ] **Algorithm explicitly specified** — never accept `alg: none` or trust the token's algorithm claim
- [ ] **Expiration enforced** — always validate `exp` claim
- [ ] **Issuer validated** — check `iss` claim matches your expected issuer
- [ ] **Audience validated** — check `aud` claim matches the intended service
- [ ] **Tokens invalidated on logout** — either use short expiry or maintain a revocation list
- [ ] **HTTPS only** — tokens in transit over plain HTTP are trivially stolen
- [ ] **No sensitive data in payload** — payload is readable by anyone who has the token
- [ ] **Secrets rotated periodically** — have a plan for rotating signing keys

---

## Quick Reference: JWT Standard Claims

| Claim | Name | Type | Description |
|-------|------|------|-------------|
| `iss` | Issuer | string | Who issued the token |
| `sub` | Subject | string | Whom the token refers to (user ID) |
| `aud` | Audience | string/array | Who the token is intended for |
| `exp` | Expiration | number | Unix timestamp — when the token expires |
| `nbf` | Not Before | number | Unix timestamp — token is invalid before this |
| `iat` | Issued At | number | Unix timestamp — when the token was issued |
| `jti` | JWT ID | string | Unique identifier for the token (for revocation) |

---

## Conclusion

When authentication breaks, a JWT decoder is your first debugging tool. Decode the token, check expiration, verify the claims match what the server expects, and confirm the token is being sent in the correct format.

[DevPlaybook's JWT Decoder](/tools/jwt-decoder) makes this instant — paste the token, see the decoded header and payload with human-readable timestamps, and identify the issue in seconds rather than minutes.

For production tokens with real user data, use the local decoding approaches in this guide instead of any online tool.

---

*Working with Base64 values inside JWT payloads? The [Base64 Decoder](/tools/base64) handles those. Formatting the JSON claims for readability? Try the [JSON Formatter Pro](/tools/json-formatter-pro).*
