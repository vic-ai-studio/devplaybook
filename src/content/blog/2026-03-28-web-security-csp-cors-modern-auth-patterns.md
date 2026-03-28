---
title: "Web Security in 2026: CSP, CORS, and Modern Auth Patterns"
description: "Master content security policy, CORS configuration, and WebAuthn passkeys. Practical security patterns for modern web applications."
date: "2026-03-28"
tags: [security, csp, cors, webauthn, passkeys]
readingTime: "10 min read"
---

Web security isn't optional anymore — it's a baseline expectation. In 2026, browsers are stricter, attackers are more automated, and your users deserve better. This guide covers the most impactful security patterns for modern web apps: Content Security Policy, CORS configuration, WebAuthn passkeys, and HTTP security headers — with real code you can deploy today.

## Content Security Policy: From Allowlist to Nonce-Based

Content Security Policy (CSP) is your primary defense against cross-site scripting (XSS). It tells the browser which resources are allowed to load and execute.

### The Old Way: Allowlisting Domains

```http
Content-Security-Policy: script-src 'self' https://cdn.example.com
```

This works but breaks when CDN URLs change or third-party scripts load sub-resources. It also does nothing if your own domain gets compromised.

### The Modern Way: Nonces + strict-dynamic

Nonces generate a unique token per request. Scripts without the matching nonce don't execute — even inline ones.

**Express.js implementation:**

```javascript
import crypto from 'crypto';
import helmet from 'helmet';

app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('base64');
  next();
});

app.use((req, res, next) => {
  helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: [
        "'strict-dynamic'",
        `'nonce-${res.locals.nonce}'`,
        // Fallback for older browsers
        "'unsafe-inline'",
        "https:",
      ],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      upgradeInsecureRequests: [],
    },
  })(req, res, next);
});
```

**In your HTML template:**

```html
<script nonce="<%= nonce %>">
  // This script executes — nonce matches
  console.log('Secure script');
</script>

<script>
  // This is BLOCKED — no nonce
  alert('XSS attempt');
</script>
```

`strict-dynamic` propagates trust to dynamically loaded scripts (e.g., scripts loaded by a trusted script). This means you don't need to allowlist every CDN.

### CSP Reporting

Before enforcing, use report-only mode to detect violations without breaking anything:

```http
Content-Security-Policy-Report-Only: default-src 'self'; report-uri /csp-violations
```

Set up an endpoint to collect reports:

```javascript
app.post('/csp-violations', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.error('CSP violation:', req.body['csp-report']);
  // Send to your logging service (Sentry, Datadog, etc.)
  res.status(204).send();
});
```

**Next.js CSP with nonces (App Router):**

```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export function middleware(request) {
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'nonce-${nonce}' 'strict-dynamic';
    style-src 'self' 'nonce-${nonce}';
    img-src 'self' blob: data:;
    font-src 'self';
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', cspHeader);
  response.headers.set('x-nonce', nonce);
  return response;
}
```

---

## CORS Deep Dive: What Actually Happens

Cross-Origin Resource Sharing (CORS) is commonly misconfigured in ways that either break the app or accidentally expose it.

### How Preflight Works

For "non-simple" requests (PUT, DELETE, custom headers, JSON bodies), the browser sends an OPTIONS preflight before the actual request:

```
OPTIONS /api/data HTTP/1.1
Origin: https://app.example.com
Access-Control-Request-Method: POST
Access-Control-Request-Headers: Content-Type, Authorization
```

Your server must respond:

```
HTTP/1.1 204 No Content
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Max-Age: 86400
```

`Access-Control-Max-Age` caches the preflight result for 24 hours — important for performance.

### Credentials and Cookies

When sending cookies or HTTP auth cross-origin, you need explicit opt-in on both sides:

```javascript
// Client
fetch('https://api.example.com/data', {
  credentials: 'include', // Send cookies
});

// Server — CANNOT use wildcard with credentials
res.setHeader('Access-Control-Allow-Origin', 'https://app.example.com'); // Exact origin
res.setHeader('Access-Control-Allow-Credentials', 'true');
```

**Common mistake:** Using `Access-Control-Allow-Origin: *` with `credentials: 'include'`. The browser will reject this.

### Production CORS Configuration (Express)

```javascript
import cors from 'cors';

const allowedOrigins = [
  'https://app.yourdomain.com',
  'https://admin.yourdomain.com',
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:3000'] : []),
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
```

### Wildcard Pitfalls

Never use these patterns in production:

```javascript
// DANGEROUS: Reflects the Origin header — allows any origin
res.setHeader('Access-Control-Allow-Origin', req.headers.origin);

// DANGEROUS: Allows all origins with credentials
res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Credentials', 'true'); // Browser ignores credentials header here, but still a bad pattern
```

---

## WebAuthn and Passkeys: Passwords Are Obsolete

WebAuthn (Web Authentication API) enables hardware-backed authentication using FIDO2 credentials. Passkeys are the user-facing name for WebAuthn credentials synced across devices via Apple/Google/Microsoft.

### Why Passkeys Win

- **Phishing-resistant**: credentials are bound to the exact origin
- **No shared secrets**: the server never sees the private key
- **Biometric-friendly**: Face ID, Touch ID, Windows Hello
- **No password reset flows**: lost device = re-register with another passkey

### Registration Flow

```javascript
// 1. Server generates a challenge
app.post('/auth/register/begin', async (req, res) => {
  const user = await getUser(req.body.username);

  const options = await generateRegistrationOptions({
    rpName: 'Your App',
    rpID: 'yourdomain.com',
    userID: user.id,
    userName: user.username,
    attestationType: 'none', // Don't require hardware attestation
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  // Store challenge in session (expires in 5 minutes)
  req.session.challenge = options.challenge;
  res.json(options);
});

// 2. Client creates credential
const credential = await navigator.credentials.create({
  publicKey: registrationOptions,
});

// 3. Server verifies and stores
app.post('/auth/register/complete', async (req, res) => {
  const verification = await verifyRegistrationResponse({
    response: req.body,
    expectedChallenge: req.session.challenge,
    expectedOrigin: 'https://yourdomain.com',
    expectedRPID: 'yourdomain.com',
  });

  if (verification.verified) {
    await savePasskey(user.id, verification.registrationInfo);
    res.json({ success: true });
  }
});
```

### Authentication Flow

```javascript
// 1. Server generates assertion challenge
app.post('/auth/login/begin', async (req, res) => {
  const user = await getUserByUsername(req.body.username);
  const passkeys = await getUserPasskeys(user.id);

  const options = await generateAuthenticationOptions({
    rpID: 'yourdomain.com',
    allowCredentials: passkeys.map(p => ({
      id: p.credentialID,
      type: 'public-key',
    })),
    userVerification: 'preferred',
  });

  req.session.challenge = options.challenge;
  res.json(options);
});

// 2. Client performs assertion
const assertion = await navigator.credentials.get({
  publicKey: authenticationOptions,
});

// 3. Server verifies
app.post('/auth/login/complete', async (req, res) => {
  const passkey = await getPasskeyByID(req.body.id);

  const verification = await verifyAuthenticationResponse({
    response: req.body,
    expectedChallenge: req.session.challenge,
    expectedOrigin: 'https://yourdomain.com',
    expectedRPID: 'yourdomain.com',
    authenticator: passkey,
  });

  if (verification.verified) {
    // Update counter to prevent replay attacks
    await updatePasskeyCounter(passkey.id, verification.authenticationInfo.newCounter);
    req.session.userId = passkey.userId;
    res.json({ success: true });
  }
});
```

Use the `@simplewebauthn/server` and `@simplewebauthn/browser` packages — they handle the cryptographic complexity.

---

## HTTP Security Headers Checklist

These headers cost nothing to add and significantly reduce attack surface.

### The Essential Set

```javascript
// helmet.js covers most of these
import helmet from 'helmet';

app.use(helmet({
  // HSTS: force HTTPS for 1 year, include subdomains
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true, // Submit to browser preload lists
  },
  // Prevent clickjacking
  frameguard: { action: 'deny' },
  // Block MIME sniffing
  noSniff: true,
  // Referrer control
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  // Disable dangerous browser features
  permittedCrossDomainPolicies: false,
}));

// Permissions-Policy (not yet in helmet stable)
app.use((req, res, next) => {
  res.setHeader(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );
  next();
});
```

### Headers Quick Reference

| Header | Value | What It Does |
|--------|-------|--------------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Force HTTPS |
| `X-Frame-Options` | `DENY` | Block iframe embedding |
| `X-Content-Type-Options` | `nosniff` | No MIME sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Limit referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=()` | Disable browser APIs |
| `Cross-Origin-Opener-Policy` | `same-origin` | Isolate browsing context |
| `Cross-Origin-Resource-Policy` | `same-origin` | Block cross-origin reads |

**Next.js headers config:**

```javascript
// next.config.mjs
const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

export default {
  async headers() {
    return [{ source: '/(.*)', headers: securityHeaders }];
  },
};
```

---

## OWASP Top 10: What Changed in 2025

The OWASP Top 10 for 2025 shifted to reflect modern application patterns:

1. **Broken Access Control** — still #1; vertical/horizontal privilege escalation
2. **Cryptographic Failures** — weak algorithms, unencrypted sensitive data
3. **Injection** — SQL, NoSQL, command injection (now includes prompt injection)
4. **Insecure Design** — missing threat modeling; no security in design phase
5. **Security Misconfiguration** — default creds, unnecessary features, verbose errors
6. **Vulnerable Components** — outdated dependencies (run `npm audit` regularly)
7. **Identification & Authentication Failures** — weak passwords, missing MFA
8. **Software & Data Integrity Failures** — unsigned updates, insecure deserialization
9. **Logging & Monitoring Failures** — can't detect breaches without observability
10. **Server-Side Request Forgery (SSRF)** — metadata endpoints, internal network exposure

**New in 2025:** AI/LLM-specific risks now appear in supplementary guidance — prompt injection, training data poisoning, and insecure model outputs.

### Quick Wins for Each

```javascript
// #1 Broken Access Control — always check permissions server-side
app.get('/api/users/:id', authenticate, async (req, res) => {
  // Don't trust client-supplied role
  const requestingUser = req.user;
  if (requestingUser.id !== req.params.id && requestingUser.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  // ...
});

// #3 Injection — parameterized queries, always
const user = await db.query(
  'SELECT * FROM users WHERE email = $1',
  [req.body.email] // Never: `WHERE email = '${req.body.email}'`
);

// #5 Security Misconfiguration — never expose stack traces
app.use((err, req, res, next) => {
  console.error(err); // Log internally
  res.status(500).json({ error: 'Internal server error' }); // Generic externally
});

// #6 Vulnerable Components
// Add to CI pipeline:
// npm audit --audit-level=moderate
// npx better-npm-audit audit
```

---

## Putting It Together: Security Audit Checklist

Before shipping, run through this list:

**CSP**
- [ ] CSP header present on all HTML responses
- [ ] No `unsafe-eval` in script-src (breaks eval-based attacks)
- [ ] CSP violations reported to an endpoint you monitor
- [ ] Tested with Google CSP Evaluator

**CORS**
- [ ] Exact origin allowlist (no wildcard in production)
- [ ] Preflight handled for non-simple requests
- [ ] Credentials only sent to trusted, same-organization origins

**Auth**
- [ ] Passkeys or MFA available for user accounts
- [ ] Sessions expire after inactivity
- [ ] Logout invalidates server-side session (not just client cookie)
- [ ] Rate limiting on login endpoint

**Headers**
- [ ] HSTS enabled with preload
- [ ] X-Frame-Options set
- [ ] Permissions-Policy restricts unused APIs

**Dependencies**
- [ ] `npm audit` passes with no critical/high issues
- [ ] Dependabot or Renovate configured for automatic PRs

**Infrastructure**
- [ ] Error messages don't leak stack traces to clients
- [ ] Admin endpoints protected by IP allowlist or separate auth
- [ ] Secrets in environment variables, not in code

---

## Key Takeaways

Web security in 2026 isn't about one-time hardening — it's about layered defaults. Start with `helmet.js` for headers (5 minutes), add nonce-based CSP (30 minutes), tighten your CORS allowlist (15 minutes), and put passkey registration on your roadmap. Each layer independently reduces your attack surface; together they make your application meaningfully harder to compromise.

The cost is low. The alternatives are worse.
