---
title: "API Authentication Guide: JWT, OAuth 2.0 & API Keys 2026"
description: "API authentication guide 2026: JWT structure and validation, OAuth 2.0 flows (authorization code, client credentials), API key management, refresh tokens, and security best practices."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["JWT", "OAuth 2.0", "API authentication", "API keys", "security", "refresh tokens", "Bearer"]
readingTime: "9 min read"
category: "api"
---

Authentication is the gatekeeper of your API. Get it wrong and you're either locking out legitimate users or handing attackers the keys. This guide covers the three main authentication patterns — API keys, JWT, and OAuth 2.0 — with Node.js/Express code examples and a security checklist for each.

## API Key Authentication

API keys are the simplest authentication method: a static secret string that identifies and authenticates a caller.

### When to Use API Keys

- Server-to-server communication where a human isn't in the loop
- Developer access to third-party APIs (Stripe, SendGrid, OpenAI)
- Simple internal services where OAuth complexity isn't justified

### Implementation

Pass the API key in the `Authorization` header using a custom scheme, or via a dedicated header:

```http
# Recommended: Authorization header
GET /api/data
Authorization: Bearer sk-prod-abc123xyz

# Acceptable: Custom header
GET /api/data
X-API-Key: sk-prod-abc123xyz
```

**Never** pass API keys in URL query parameters. They leak into server logs, browser history, and referrer headers.

```javascript
// Express middleware: API key validation
import crypto from 'crypto';

const apiKeyMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({
      type: 'https://api.example.com/errors/unauthorized',
      title: 'Authentication Required',
      status: 401,
      detail: 'A valid API key is required'
    });
  }

  const key = authHeader.slice(7); // Strip "Bearer "

  // Hash the key before comparing — never store plaintext keys
  const keyHash = crypto.createHash('sha256').update(key).digest('hex');
  const apiKey = await db.apiKeys.findOne({
    where: { keyHash, revokedAt: null }
  });

  if (!apiKey) {
    return res.status(401).json({ status: 401, title: 'Invalid API Key' });
  }

  // Log usage for rate limiting and auditing
  await db.apiKeyUsage.create({ data: { keyId: apiKey.id, endpoint: req.path } });

  req.tenantId = apiKey.tenantId;
  next();
};
```

### API Key Security

- Store only the hash of the key in your database
- Prefix keys with a readable identifier: `sk-live-`, `sk-test-`, `pk-` to help users identify them
- Support key rotation and revocation without downtime
- Scope keys to specific permissions (read-only vs read-write)
- Show the key only once at creation time, never again

---

## JWT: JSON Web Tokens

JWTs are self-contained tokens that carry claims (user identity, permissions) encoded inside the token itself. The server doesn't need to query a database on every request.

### Token Structure

A JWT is three Base64URL-encoded parts separated by dots:

```
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.    <- Header
eyJzdWIiOiJ1c2VyXzEyMyIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTcxMjA2NjQwMCwiZXhwIjoxNzEyMDcwMDAwfQ.  <- Payload
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c  <- Signature
```

**Header**: Algorithm and token type (`{"alg": "RS256", "typ": "JWT"}`)

**Payload**: Claims — `sub` (subject/user ID), `iat` (issued at), `exp` (expiration), `role`, custom claims

**Signature**: Cryptographic proof the token wasn't tampered with

### Generating and Validating JWTs

```javascript
import jwt from 'jsonwebtoken';
import { readFileSync } from 'fs';

// Use RS256 (asymmetric) in production — private key to sign, public key to verify
const privateKey = readFileSync('./keys/private.pem');
const publicKey = readFileSync('./keys/public.pem');

// Generate access token (short-lived: 15 minutes)
function generateAccessToken(userId, role) {
  return jwt.sign(
    { sub: userId, role, type: 'access' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '15m', issuer: 'api.example.com' }
  );
}

// Generate refresh token (long-lived: 30 days)
function generateRefreshToken(userId) {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    privateKey,
    { algorithm: 'RS256', expiresIn: '30d', issuer: 'api.example.com' }
  );
}

// Middleware: validate JWT on protected routes
const jwtMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ status: 401, title: 'Token required' });
  }

  try {
    const token = authHeader.slice(7);
    const payload = jwt.verify(token, publicKey, {
      algorithms: ['RS256'],        // Explicitly allow only RS256
      issuer: 'api.example.com',   // Validate issuer
    });

    if (payload.type !== 'access') {
      return res.status(401).json({ status: 401, title: 'Wrong token type' });
    }

    req.user = payload;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ status: 401, title: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ status: 401, title: 'Invalid token' });
  }
};
```

### Refresh Token Flow

```javascript
// Refresh endpoint: exchange refresh token for new access token
app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.cookies; // Use httpOnly cookie

  if (!refreshToken) {
    return res.status(401).json({ status: 401, title: 'Refresh token required' });
  }

  try {
    const payload = jwt.verify(refreshToken, publicKey, {
      algorithms: ['RS256'],
      issuer: 'api.example.com'
    });

    if (payload.type !== 'refresh') throw new Error('Wrong type');

    // Check if token has been revoked (token rotation)
    const isRevoked = await db.revokedTokens.findOne({ where: { jti: payload.jti } });
    if (isRevoked) {
      return res.status(401).json({ status: 401, title: 'Token revoked' });
    }

    // Rotate: revoke old refresh token, issue new pair
    await db.revokedTokens.create({ data: { jti: payload.jti } });

    const newAccessToken = generateAccessToken(payload.sub, payload.role);
    const newRefreshToken = generateRefreshToken(payload.sub);

    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000
    });

    res.json({ accessToken: newAccessToken });
  } catch {
    res.status(401).json({ status: 401, title: 'Invalid refresh token' });
  }
});
```

---

## OAuth 2.0 Flows

OAuth 2.0 is a delegated authorization framework. Users grant your app access to their data on another service without sharing their password.

### Authorization Code + PKCE (for SPAs and Mobile Apps)

PKCE (Proof Key for Code Exchange) prevents authorization code interception attacks in public clients:

```javascript
// Step 1: Generate code verifier and challenge
function generatePKCE() {
  const verifier = crypto.randomBytes(32).toString('base64url');
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
  return { verifier, challenge };
}

// Step 2: Redirect user to authorization server
app.get('/auth/login', (req, res) => {
  const { verifier, challenge } = generatePKCE();
  const state = crypto.randomBytes(16).toString('hex');

  req.session.pkceVerifier = verifier;
  req.session.oauthState = state;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.OAUTH_CLIENT_ID,
    redirect_uri: 'https://app.example.com/auth/callback',
    scope: 'openid profile email orders:read',
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256'
  });

  res.redirect(`https://auth.example.com/oauth/authorize?${params}`);
});

// Step 3: Handle callback, exchange code for tokens
app.get('/auth/callback', async (req, res) => {
  const { code, state } = req.query;

  // Validate state to prevent CSRF
  if (state !== req.session.oauthState) {
    return res.status(400).send('State mismatch');
  }

  const tokenResponse = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: 'https://app.example.com/auth/callback',
      client_id: process.env.OAUTH_CLIENT_ID,
      code_verifier: req.session.pkceVerifier
    })
  });

  const tokens = await tokenResponse.json();
  // Store access token in memory, refresh token in httpOnly cookie
});
```

### Client Credentials (for Machine-to-Machine)

For server-to-server API calls where no user is involved:

```javascript
// Request a token using client credentials
async function getServiceToken() {
  const response = await fetch('https://auth.example.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: process.env.SERVICE_CLIENT_ID,
      client_secret: process.env.SERVICE_CLIENT_SECRET,
      scope: 'internal:read internal:write'
    })
  });

  const { access_token, expires_in } = await response.json();
  return { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
}

// Cache and auto-refresh tokens for service clients
class ServiceTokenCache {
  constructor() { this.cache = null; }

  async getToken() {
    if (!this.cache || this.cache.expiresAt < Date.now() + 60_000) {
      this.cache = await getServiceToken();
    }
    return this.cache.token;
  }
}
```

---

## Token Storage: httpOnly Cookies vs localStorage

| Storage | XSS Safe | CSRF Risk | Recommendation |
|---------|----------|-----------|----------------|
| `localStorage` | No | No | Avoid for sensitive tokens |
| `sessionStorage` | No | No | Avoid |
| Memory (JS variable) | Yes | No | Good for access tokens |
| `httpOnly` cookie | Yes | Yes (mitigated with SameSite) | Best for refresh tokens |

**Best practice**: Store the short-lived access token in JavaScript memory (lost on page refresh, re-fetched from cookie). Store the refresh token in an `httpOnly; Secure; SameSite=Strict` cookie.

---

## Common Vulnerabilities

**Algorithm confusion attack**: If your validator accepts `alg: "none"`, an attacker can forge tokens. Always explicitly specify accepted algorithms.

**Token leakage via logs**: Never log `Authorization` headers. Redact them at your logging middleware.

**Weak signing secrets**: HS256 with a short or guessable secret is breakable. Use RS256 with 2048-bit keys, or ES256 with P-256 curves.

**Missing expiration validation**: Always verify `exp` claims. Don't assume your JWT library does this by default.

**CSRF on cookie-based auth**: Use `SameSite=Strict` or `SameSite=Lax` on cookies, and validate `Origin`/`Referer` headers on state-changing requests.

---

## Quick Security Checklist

- [ ] API keys hashed in database, prefixed for readability
- [ ] JWTs use RS256 or ES256 (not HS256 with weak secrets)
- [ ] Explicit algorithm allowlist in JWT validation
- [ ] Access tokens expire in 15 minutes or less
- [ ] Refresh tokens stored in httpOnly cookies
- [ ] Refresh token rotation implemented
- [ ] OAuth PKCE enabled for all public clients
- [ ] State parameter validated in OAuth callbacks
- [ ] Authorization headers redacted from logs
- [ ] Rate limiting on all authentication endpoints
