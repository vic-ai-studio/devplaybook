---
title: "JWT Decoder Online: Inspect JSON Web Tokens Without a Library"
description: "Decode and inspect JWT tokens online for free. Learn JWT structure, how to read claims, verify signatures, and debug authentication issues in your apps."
author: "DevPlaybook Team"
date: "2026-03-24"
tags: ["jwt", "jwt-decoder", "authentication", "developer-tools", "security"]
readingTime: "9 min read"
---

When something goes wrong with authentication in your app, the first thing you want to do is look inside the JWT. What claims does it contain? Is it expired? What audience is it issued for? Does the user have the right roles?

The problem: JWT tokens look like random garbage to the naked eye.

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c
```

That's a JWT. It contains structured data — but it's Base64-encoded in a format designed for transmission, not readability. You could decode it with a one-liner in a terminal, but when you're in the middle of debugging an auth issue, you want something faster.

This guide explains what JWTs are, how they work, what's inside them, and how to use a JWT decoder to debug authentication problems quickly.

## What Is a JWT?

A JSON Web Token (JWT, pronounced "jot") is an open standard (RFC 7519) for securely transmitting information between parties as a JSON object. The information is signed so it can be verified — the receiver can confirm that the token was issued by a trusted party and hasn't been tampered with.

JWTs are used heavily for:
- **Authentication** — after login, the server issues a JWT; the client sends it with every request
- **Authorization** — the JWT contains claims about what the user can do (roles, permissions, scopes)
- **Information exchange** — securely passing verified data between services

The key property of JWTs is that they are **self-contained**: the token itself carries all the information needed to verify the user's identity and permissions, without requiring a database lookup on every request. This is what makes them popular for stateless, scalable APIs.

## JWT Structure: Three Parts

A JWT consists of three Base64URL-encoded parts separated by dots:

```
header.payload.signature
```

Each part encodes different information:

### Part 1: Header

The header is a JSON object describing the token type and the signing algorithm:

```json
{
  "alg": "HS256",
  "typ": "JWT"
}
```

Common algorithm values:
- `HS256` — HMAC with SHA-256 (symmetric, shared secret)
- `HS384`, `HS512` — HMAC with larger hash sizes
- `RS256` — RSA with SHA-256 (asymmetric, public/private key)
- `RS384`, `RS512` — RSA with larger hash sizes
- `ES256` — ECDSA with P-256 and SHA-256
- `none` — no signature (dangerous — see security notes below)

### Part 2: Payload (Claims)

The payload contains the **claims** — statements about the subject (usually a user) and metadata about the token:

```json
{
  "sub": "1234567890",
  "name": "John Doe",
  "email": "john@example.com",
  "roles": ["user", "admin"],
  "iat": 1516239022,
  "exp": 1516242622,
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com"
}
```

**Standard registered claims** (defined in RFC 7519):

| Claim | Name | Description |
|-------|------|-------------|
| `iss` | Issuer | Who issued the token |
| `sub` | Subject | Who the token is about (usually user ID) |
| `aud` | Audience | Who should accept the token |
| `exp` | Expiration | Unix timestamp when the token expires |
| `nbf` | Not Before | Token not valid before this timestamp |
| `iat` | Issued At | When the token was issued |
| `jti` | JWT ID | Unique identifier for the token |

**Custom claims** can be anything your application needs: user roles, permissions, organization ID, subscription tier, feature flags, etc.

### Part 3: Signature

The signature verifies that the token hasn't been tampered with. It's computed by:

```
HMAC-SHA256(
  base64url(header) + "." + base64url(payload),
  secret
)
```

For asymmetric algorithms (RS256, ES256), it's signed with a private key and verified with the corresponding public key.

**Critical point:** The header and payload are Base64URL-encoded, not encrypted. Anyone with a JWT can decode and read the claims. The signature only proves the token's authenticity — it doesn't hide the contents. Never put sensitive information (passwords, SSNs, credit card numbers) in a JWT payload.

## How JWT Decoding Works

Decoding a JWT is simple:

1. Split the token on the `.` character into three parts
2. Base64URL-decode the header and payload
3. Parse the resulting strings as JSON

Base64URL is a variant of Base64 that uses `-` instead of `+`, `_` instead of `/`, and omits the `=` padding. When decoding, you may need to add padding back:

```python
import base64
import json

def decode_jwt_part(encoded):
    # Add padding if needed
    padding = 4 - len(encoded) % 4
    if padding != 4:
        encoded += '=' * padding
    decoded_bytes = base64.urlsafe_b64decode(encoded)
    return json.loads(decoded_bytes)

token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"
parts = token.split('.')
header = decode_jwt_part(parts[0])
payload = decode_jwt_part(parts[1])
# signature is parts[2] — verify, don't decode
```

In JavaScript:
```javascript
function decodeJWT(token) {
  const [headerB64, payloadB64, signature] = token.split('.');

  const decode = (str) => {
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  };

  return {
    header: decode(headerB64),
    payload: decode(payloadB64),
    signature
  };
}
```

## Reading JWT Claims for Debugging

When you decode a JWT during debugging, here's what to check:

### Check Expiration

```json
{
  "iat": 1711238400,
  "exp": 1711242000
}
```

Convert the Unix timestamps to human-readable dates. `exp` of `1711238400` = April 23, 2024 at 16:00 UTC. If `exp` is in the past, the token has expired and your auth middleware will reject it.

Common bug: the token expires but your frontend keeps using it because you're not checking the `exp` claim client-side before sending requests.

### Check the Issuer and Audience

```json
{
  "iss": "https://auth.example.com",
  "aud": "https://api.example.com"
}
```

Your API should validate that `iss` matches your expected auth server and `aud` matches your API's identifier. If you're getting `invalid audience` errors, compare the `aud` claim in the token against what your API expects.

### Check the Subject

```json
{
  "sub": "user_01H8X9K2M3P4Q5R6S7T8U9V0W"
}
```

The `sub` is typically the user's ID in your system. If you're seeing authorization errors, verify this matches an existing user in your database.

### Check Custom Claims

```json
{
  "roles": ["user"],
  "permissions": ["read:profile", "write:posts"],
  "org_id": "org_01H8X9K2M3"
}
```

If a user can't access a resource they should have access to, check whether their token actually contains the expected roles/permissions. The token may have been issued before their permissions were updated.

## Common JWT Debugging Scenarios

### "Token has expired"

1. Decode the token and check `exp`
2. Check `iat` — when was it issued?
3. Verify your server's clock is synchronized (NTP issues can cause premature expiration)
4. Check your token refresh logic — is the frontend refreshing before expiry?

### "Invalid signature"

1. Verify you're using the correct signing secret or public key
2. Check if the token was signed with a different algorithm than your server expects
3. Verify the token hasn't been truncated (common when copying from logs)
4. Check for encoding issues — the token should be pure ASCII

### "Invalid audience"

1. Decode and read the `aud` claim
2. Compare it to what your API's JWT validation config expects
3. Often happens when using tokens from a dev environment in staging or production

### "JWT malformed"

1. The token is missing one or more parts (check for missing dots)
2. The Base64URL encoding is corrupted
3. The token was double-encoded (URL-encoded on top of Base64URL)
4. Whitespace or newline characters were included

### Role or Permission Issues

1. Decode the token and inspect the custom claims
2. The user may have the right permissions in your database, but their token was issued before the permission was granted — they need to log out and back in
3. Check for case sensitivity: `Admin` vs `admin` are different

## JWT Security Considerations

### Never Trust Client-Side Validation Alone

You can decode a JWT in the browser, but never trust client-side validation for authorization decisions. Always validate on the server.

### The `alg: none` Attack

Some early JWT libraries accepted tokens with `"alg": "none"` and no signature, treating them as valid. Always verify that your library rejects tokens with `alg: none` unless explicitly configured to accept them.

```json
// An attacker might send this — make sure your library rejects it
{
  "alg": "none",
  "typ": "JWT"
}
```

### Algorithm Confusion Attacks

Some libraries had bugs where you could switch from RS256 (asymmetric) to HS256 (symmetric) and sign the token with the public key (which is public knowledge). Use libraries that require you to specify the expected algorithm explicitly.

### Short Expiration Times

Long-lived JWTs are a security risk — if a token is stolen, the attacker has access until it expires. Use short expiration times (15–60 minutes) combined with refresh tokens.

### Never Put Sensitive Data in Payloads

The payload is Base64-encoded, not encrypted. Anyone who intercepts the token can read it. Use it for identifiers and non-sensitive claims, not for passwords, personal details, or secrets.

## JWT Libraries by Language

| Language | Library | Notes |
|----------|---------|-------|
| Node.js | `jsonwebtoken` | Most popular, good defaults |
| Python | `python-jose`, `PyJWT` | PyJWT is simpler |
| Java | `jjwt`, `auth0/java-jwt` | jjwt is widely used |
| Go | `golang-jwt/jwt` | Standard choice |
| Ruby | `ruby-jwt` | Simple and well-maintained |
| PHP | `firebase/php-jwt` | The de-facto standard |
| Rust | `jsonwebtoken` | Great type safety |
| .NET | `System.IdentityModel.Tokens.Jwt` | Built into Microsoft stack |

## When to Use an Online JWT Decoder

Writing a decode function or using a library is overkill for debugging. An online JWT decoder is the right tool when:

- **Debugging auth failures** — you need to see what's actually in a token your app is rejecting
- **Checking expiration** — is this token still valid? What time does it expire?
- **Inspecting tokens from third-party services** — reading claims from tokens issued by Auth0, Okta, Firebase, Cognito, etc.
- **Verifying token contents after login** — confirming the right claims were included
- **Onboarding new developers** — showing team members what JWT payloads look like
- **Reading tokens from logs** — decoding tokens you've extracted from access logs

One note on security: use an online decoder for debugging in development and staging only. For production tokens that may contain sensitive user data, decode locally or use your own tooling.

## FAQ

**Q: Can I verify the signature with an online decoder?**

Some online decoders support signature verification if you provide the secret or public key. However, for sensitive production tokens, verify locally — don't paste your signing secret into third-party tools. For inspection and debugging purposes, the payload is readable without signature verification.

**Q: What's the difference between JWT and OAuth?**

OAuth is an authorization framework that defines how tokens are issued and used. JWT is a token format. OAuth often uses JWTs as access tokens, but it can also use opaque tokens (random strings that must be looked up in a database). Many OAuth implementations (OAuth 2.0 with OIDC) use JWTs specifically for their self-contained, stateless properties.

**Q: Are JWTs encrypted?**

Standard JWTs (JWS — JSON Web Signature) are signed but not encrypted. The payload is readable by anyone with the token. JWE (JSON Web Encryption) is a separate standard that encrypts the payload. If you need encrypted tokens, look for JWE support in your library.

**Q: What's a refresh token and how does it relate to JWTs?**

A refresh token is a long-lived credential (often stored in an HTTP-only cookie) used to obtain new short-lived access tokens (JWTs) without requiring re-authentication. The access JWT expires quickly (minutes), but the refresh token lasts longer (days/weeks). When the access token expires, the client uses the refresh token to get a new one silently.

**Q: How do I invalidate a JWT before it expires?**

You can't directly invalidate a JWT without a database — that's the tradeoff of stateless tokens. Common approaches: maintain a token blacklist (checked on every request), use very short expiration times, or rotate the signing secret (invalidates all tokens, not just one).

---

## Decode Your JWT in Seconds

The next time you're staring at an `eyJ...` token wondering why your auth is failing, skip the terminal and go straight to the answer. The **[DevPlaybook JWT Decoder](https://devplaybook.cc/tools/jwt-decoder)** decodes JWT tokens instantly in your browser — no install, no server requests, client-side only.

See the header, payload, and signature in a clean, readable format. Check expiration timestamps displayed as human-readable dates. Inspect every claim without writing a single line of code.

**[Open JWT Decoder →](https://devplaybook.cc/tools/jwt-decoder)**

Your token never leaves your browser — all decoding happens locally. Fast, private, and exactly what you need when you're 30 minutes deep into an auth debugging session.
