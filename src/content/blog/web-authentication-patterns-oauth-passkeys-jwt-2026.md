---
title: "Web Authentication Patterns in 2026: OAuth, Passkeys, and JWT Best Practices"
description: "A complete guide to modern web authentication: OAuth 2.0/OIDC, Passkeys/WebAuthn, JWT best practices, session management, and MFA strategies for secure apps."
date: "2026-03-26"
author: "DevPlaybook Team"
tags: ["authentication", "security", "oauth", "passkeys", "jwt", "webauthn", "web-development"]
readingTime: "14 min read"
category: "blog"
---

Authentication is the front door to your application. Get it wrong and you're handing attackers the keys. Get it right and users barely notice it exists — which is exactly the goal.

In 2026, the authentication landscape has matured significantly. Passkeys have gone mainstream. OAuth 2.0 + OIDC is the industry standard for federated identity. JWT abuse remains a top security issue. And MFA is table stakes for anything that matters.

This guide walks through each major pattern, when to use it, and how to implement it correctly — with code examples you can adapt directly.

---

## The Authentication Landscape in 2026

Before choosing an approach, understand what you're solving:

| Pattern | Best For | Complexity |
|---|---|---|
| Passkeys / WebAuthn | First-party login, consumer apps | Medium |
| OAuth 2.0 + OIDC | Third-party login, enterprise SSO | Medium-High |
| JWT (access tokens) | API authorization, stateless backends | Low-Medium |
| Session cookies | Traditional web apps, server-rendered | Low |
| MFA (TOTP/WebAuthn) | Layered security on top of any auth | Medium |

The good news: these patterns complement each other. Most production apps combine 2–3 of them.

---

## OAuth 2.0 and OpenID Connect

OAuth 2.0 handles *authorization* ("what can you do?"). OpenID Connect (OIDC) extends it with *authentication* ("who are you?"). When people say "login with Google," they mean OAuth 2.0 + OIDC.

### The Authorization Code Flow (with PKCE)

PKCE (Proof Key for Code Exchange) is mandatory for public clients (SPAs, mobile apps) and recommended everywhere. Never use the implicit flow in new projects — it was deprecated for good reason.

**Step 1: Generate a code verifier and challenge**

```javascript
// Generate cryptographically random code verifier
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// SHA-256 hash the verifier to create the challenge
async function generateCodeChallenge(verifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}
```

**Step 2: Redirect to the authorization server**

```javascript
async function startOAuthFlow() {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);

  // Store verifier in sessionStorage (not localStorage)
  sessionStorage.setItem('pkce_verifier', verifier);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: 'YOUR_CLIENT_ID',
    redirect_uri: 'https://yourapp.com/callback',
    scope: 'openid email profile',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    state: crypto.randomUUID(), // CSRF protection
  });

  window.location.href = `https://auth.provider.com/authorize?${params}`;
}
```

**Step 3: Exchange the code for tokens**

```javascript
async function handleCallback(code, state) {
  const verifier = sessionStorage.getItem('pkce_verifier');
  sessionStorage.removeItem('pkce_verifier');

  const response = await fetch('https://auth.provider.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: 'YOUR_CLIENT_ID',
      redirect_uri: 'https://yourapp.com/callback',
      code,
      code_verifier: verifier,
    }),
  });

  const { access_token, id_token, refresh_token } = await response.json();
  // Store tokens securely — more on this below
}
```

### Token Storage: The Right Call

**Don't store tokens in localStorage.** It's accessible to any JavaScript on the page, including third-party scripts. Use one of these instead:

- **HttpOnly cookies**: Best for server-rendered apps. Inaccessible to JS, automatic CSRF protection with `SameSite=Strict`.
- **Memory (React state, closure)**: Best for SPAs. Lost on refresh, but use a refresh token in an HttpOnly cookie to re-authenticate silently.
- **BFF pattern (Backend for Frontend)**: The frontend session cookie talks to a backend, which holds the real tokens. Best security posture for sensitive apps.

```javascript
// BFF pattern: your backend handles token exchange
// Frontend just gets a session cookie
async function handleCallbackViaBFF(code, state) {
  await fetch('/api/auth/callback', {
    method: 'POST',
    credentials: 'include', // send/receive cookies
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, state }),
  });
  // Backend exchanges code for tokens, stores them server-side
  // Returns a session cookie to the browser
}
```

---

## Passkeys and WebAuthn

Passkeys are FIDO2/WebAuthn credentials that replace passwords entirely. They're phishing-resistant (bound to the origin), can't be guessed or leaked in database dumps, and support multi-device sync through iCloud Keychain or Google Password Manager.

Browser support is now universal. This is the auth flow you should be building toward.

### Registration Flow

```javascript
async function registerPasskey(userId, username) {
  // 1. Get registration options from your server
  const optionsResponse = await fetch('/api/auth/passkey/register/begin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, username }),
  });
  const options = await optionsResponse.json();

  // 2. Create the credential using the browser API
  // options.challenge must be base64url-decoded
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: base64urlDecode(options.challenge),
      user: {
        ...options.user,
        id: base64urlDecode(options.user.id),
      },
    },
  });

  // 3. Send the credential to your server for verification and storage
  await fetch('/api/auth/passkey/register/complete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeCredential(credential)),
  });
}
```

### Authentication Flow

```javascript
async function authenticateWithPasskey() {
  // 1. Get authentication options from server
  const optionsResponse = await fetch('/api/auth/passkey/authenticate/begin', {
    method: 'POST',
    credentials: 'include',
  });
  const options = await optionsResponse.json();

  // 2. Use the browser to get an assertion
  const assertion = await navigator.credentials.get({
    publicKey: {
      ...options,
      challenge: base64urlDecode(options.challenge),
      allowCredentials: options.allowCredentials?.map(cred => ({
        ...cred,
        id: base64urlDecode(cred.id),
      })),
    },
  });

  // 3. Send assertion to server for verification
  const result = await fetch('/api/auth/passkey/authenticate/complete', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(serializeAssertion(assertion)),
  });

  const { authenticated } = await result.json();
  return authenticated;
}
```

### Server-Side Passkey Verification (Node.js)

Use a well-maintained library. Don't implement the verification yourself.

```javascript
import { verifyAuthenticationResponse } from '@simplewebauthn/server';

async function verifyPasskeyAuthentication(body, expectedChallenge) {
  const { credential } = await db.passkeys.findByCredentialId(body.id);

  const verification = await verifyAuthenticationResponse({
    response: body,
    expectedChallenge,
    expectedOrigin: 'https://yourapp.com',
    expectedRPID: 'yourapp.com',
    authenticator: {
      credentialPublicKey: credential.publicKey,
      credentialID: credential.id,
      counter: credential.counter,
    },
  });

  if (verification.verified) {
    // Update the counter to prevent replay attacks
    await db.passkeys.updateCounter(
      credential.id,
      verification.authenticationInfo.newCounter
    );
  }

  return verification.verified;
}
```

**Recommended library:** `@simplewebauthn/server` and `@simplewebauthn/browser` handle the hard parts correctly.

---

## JWT Best Practices

JWTs (JSON Web Tokens) are commonly misused. They're great for stateless API authorization. They're a poor fit for session management when you need instant revocation.

### Structure and Signing

```javascript
import { SignJWT, jwtVerify } from 'jose';

// Sign a JWT (use RS256 or ES256 for production, not HS256 if sharing tokens across services)
async function createAccessToken(userId, roles) {
  const privateKey = await importPrivateKey(process.env.JWT_PRIVATE_KEY);

  return await new SignJWT({ sub: userId, roles })
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setIssuer('https://yourapp.com')
    .setAudience('https://api.yourapp.com')
    .setExpirationTime('15m') // Short-lived — this is important
    .sign(privateKey);
}

// Verify a JWT
async function verifyAccessToken(token) {
  const publicKey = await importPublicKey(process.env.JWT_PUBLIC_KEY);

  const { payload } = await jwtVerify(token, publicKey, {
    issuer: 'https://yourapp.com',
    audience: 'https://api.yourapp.com',
  });

  return payload;
}
```

### The Refresh Token Pattern

Short-lived access tokens + long-lived refresh tokens is the standard pattern.

```
Access Token:  15 minutes, stored in memory
Refresh Token: 30 days, stored in HttpOnly cookie
```

```javascript
async function refreshAccessToken(req, res) {
  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.status(401).json({ error: 'No refresh token' });

  // Validate and rotate the refresh token
  const stored = await db.refreshTokens.findOne({ token: refreshToken });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  // Rotate: delete old, issue new
  await db.refreshTokens.delete(stored.id);
  const newRefreshToken = crypto.randomUUID();
  await db.refreshTokens.create({
    userId: stored.userId,
    token: newRefreshToken,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  const accessToken = await createAccessToken(stored.userId, stored.roles);

  res.cookie('refresh_token', newRefreshToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json({ access_token: accessToken });
}
```

### Common JWT Mistakes to Avoid

**1. Algorithm confusion attacks** — Always specify the expected algorithm explicitly. Never accept `alg: none`.

```javascript
// WRONG: trusting the alg header
jwt.verify(token, publicKey); // attacker can switch to HS256

// RIGHT: specify the algorithm
jwtVerify(token, publicKey, { algorithms: ['ES256'] });
```

**2. Storing sensitive data in the payload** — JWT payloads are base64-encoded, not encrypted. Anyone with the token can decode them.

**3. Long expiration times** — A 7-day access token that gets compromised is a 7-day attack window. Keep them short (15 minutes) and use refresh tokens.

**4. Not validating claims** — Always validate `iss`, `aud`, and `exp`. Libraries like `jose` do this, but you need to pass the expected values.

---

## Session Management

Traditional server-side sessions are not obsolete. For server-rendered apps, they're often the right choice.

```javascript
// Express session with Redis storage
import session from 'express-session';
import RedisStore from 'connect-redis';
import { createClient } from 'redis';

const redis = createClient({ url: process.env.REDIS_URL });
await redis.connect();

app.use(session({
  store: new RedisStore({ client: redis }),
  secret: process.env.SESSION_SECRET, // 32+ random bytes
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true,        // HTTPS only
    httpOnly: true,      // no JS access
    sameSite: 'strict',  // CSRF protection
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));
```

**Session fixation protection:** Regenerate the session ID after login.

```javascript
app.post('/login', async (req, res) => {
  const user = await verifyCredentials(req.body);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  // Regenerate session to prevent fixation attacks
  req.session.regenerate((err) => {
    if (err) return next(err);
    req.session.userId = user.id;
    req.session.save((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });
});
```

---

## Multi-Factor Authentication (MFA)

MFA is not optional for applications handling sensitive data. Here's how to implement TOTP (Time-based One-Time Passwords) correctly.

### TOTP Setup

```javascript
import { authenticator } from 'otplib';

async function setupMFA(userId) {
  const secret = authenticator.generateSecret();

  // Store the secret (encrypted at rest)
  await db.users.update(userId, {
    mfaSecret: encrypt(secret),
    mfaEnabled: false, // not enabled until verified
  });

  // Generate the QR code URI for authenticator apps
  const user = await db.users.findById(userId);
  const otpUri = authenticator.keyuri(user.email, 'YourApp', secret);

  return { secret, otpUri };
}

async function verifyAndEnableMFA(userId, code) {
  const user = await db.users.findById(userId);
  const secret = decrypt(user.mfaSecret);

  const isValid = authenticator.check(code, secret);
  if (!isValid) throw new Error('Invalid code');

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex')
  );

  await db.users.update(userId, {
    mfaEnabled: true,
    backupCodes: backupCodes.map(code => hashBackupCode(code)),
  });

  return backupCodes; // Show these to the user ONCE
}
```

### TOTP Verification

```javascript
async function verifyMFACode(userId, code) {
  const user = await db.users.findById(userId);
  if (!user.mfaEnabled) return true; // MFA not set up

  const secret = decrypt(user.mfaSecret);

  // Check TOTP code (allows 1 step drift in each direction)
  authenticator.options = { window: 1 };
  if (authenticator.check(code, secret)) return true;

  // Check backup codes
  const matchingBackupCode = user.backupCodes.find(
    stored => verifyBackupCode(code, stored)
  );

  if (matchingBackupCode) {
    // Consume the backup code (one-time use)
    await db.users.removeBackupCode(userId, matchingBackupCode);
    return true;
  }

  return false;
}
```

### WebAuthn as Second Factor

Passkeys can also serve as the second factor rather than the primary credential. The API is the same — the difference is context: the user already has a session, and you're asserting the passkey to elevate it.

---

## Comparison: Which Pattern for Your App?

| Scenario | Recommended Approach |
|---|---|
| Consumer app, primary login | Passkeys + email magic link fallback |
| Enterprise SaaS | OIDC/OAuth (Okta, Azure AD, Google) + MFA |
| API-first backend | Short-lived JWTs + refresh token rotation |
| Traditional SSR web app | Server sessions (Redis) + CSRF tokens |
| High-security app (banking, health) | Passkeys + step-up MFA for sensitive actions |
| Internal tools | SSO with your identity provider (OIDC) |

---

## Security Checklist

Before shipping any authentication system, verify:

- [ ] **No credentials in URLs** — tokens in query params end up in server logs
- [ ] **HTTPS everywhere** — no exceptions
- [ ] **Rate limiting on auth endpoints** — prevent brute force
- [ ] **Account lockout** — after N failed attempts, lock or require CAPTCHA
- [ ] **Secure cookie flags** — `httpOnly`, `secure`, `sameSite`
- [ ] **CSRF protection** — for session-based auth, use CSRF tokens or `SameSite=Strict`
- [ ] **Short token expiry** — access tokens ≤15 min
- [ ] **Refresh token rotation** — detect token theft via rotation
- [ ] **Log authentication events** — login, logout, failed attempts, MFA changes
- [ ] **MFA for admin accounts** — at minimum
- [ ] **Secrets in env vars** — not in code or config files

---

## Libraries Worth Using

Don't reinvent authentication. Use battle-tested libraries:

| Need | Library |
|---|---|
| OAuth/OIDC (Node.js) | `openid-client`, `passport-openidconnect` |
| Passkeys (Node.js) | `@simplewebauthn/server` + `@simplewebauthn/browser` |
| JWT (Node.js) | `jose` (not `jsonwebtoken` — it's unmaintained) |
| Full auth stack | Auth.js (formerly NextAuth), Lucia, Better Auth |
| Managed identity | Clerk, Auth0, Supabase Auth, WorkOS |
| TOTP | `otplib` |

**Auth.js** is worth highlighting: it handles OAuth, database sessions, and JWT in a unified API across Next.js, SvelteKit, Astro, and Express.

---

## Key Takeaways

1. **Passkeys are ready** — ship them as your primary auth flow for consumer apps. They're phishing-resistant and users prefer them to passwords.
2. **Use OAuth 2.0 + OIDC for federation** — don't build your own identity if an identity provider fits your use case.
3. **JWT ≠ sessions** — short-lived JWTs for API access, server sessions for stateful web apps. Don't use them interchangeably.
4. **Refresh token rotation detects theft** — if two clients try to use the same refresh token, invalidate the entire family.
5. **MFA is table stakes** — require it for admin accounts, offer it for all users.
6. **Use a library** — authentication edge cases will humble you. Stand on the shoulders of people who've already made the mistakes.

Security is an ongoing commitment, not a one-time feature. Audit your auth implementation regularly, subscribe to security advisories for your dependencies, and treat credentials as the sensitive data they are.
