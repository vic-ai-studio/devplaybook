---
title: "Web Application Security Checklist 2026: OWASP Top 10, Headers, CSP"
description: "Complete web application security checklist for 2026: OWASP Top 10 mitigations, security headers, CSP, HTTPS, authentication best practices, and automated scanning tools."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["web security", "OWASP", "CSP", "security headers", "authentication", "XSS", "CSRF"]
readingTime: "8 min read"
category: "security"
---

Security breaches cost companies an average of $4.88 million per incident in 2025. For most web applications, the vulnerabilities exploited are not exotic zero-days — they are well-documented weaknesses that could have been caught with a proper checklist. This guide gives you a concrete, actionable security checklist for 2026 covering OWASP Top 10 mitigations, security headers, and automated tooling.

## OWASP Top 10 Mitigations

### 1. Injection (SQL, NoSQL, Command)

Never concatenate user input into queries. Use parameterized queries or prepared statements at all times.

```javascript
// BAD — SQL injection vulnerability
const query = `SELECT * FROM users WHERE email = '${req.body.email}'`;

// GOOD — parameterized query (node-postgres)
const { rows } = await pool.query(
  'SELECT * FROM users WHERE email = $1',
  [req.body.email]
);
```

For NoSQL databases like MongoDB, sanitize operators:

```javascript
const mongoSanitize = require('express-mongo-sanitize');
app.use(mongoSanitize()); // strips $ and . from input
```

### 2. Broken Authentication

Enforce strong password policies and use proven libraries. Never roll your own crypto.

```javascript
const bcrypt = require('bcryptjs');

// Hash on registration
const hash = await bcrypt.hash(password, 12); // cost factor 12+

// Verify on login
const valid = await bcrypt.compare(inputPassword, storedHash);
```

Implement account lockout after repeated failures:

```javascript
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: { error: 'Too many login attempts, try again in 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/login', loginLimiter, loginHandler);
```

### 3. Insecure Direct Object References (IDOR)

Always validate that the authenticated user owns the resource they are accessing:

```javascript
// BAD — trusts user-supplied ID without ownership check
app.get('/invoice/:id', async (req, res) => {
  const invoice = await Invoice.findById(req.params.id);
  res.json(invoice);
});

// GOOD — enforce ownership
app.get('/invoice/:id', authenticate, async (req, res) => {
  const invoice = await Invoice.findOne({
    _id: req.params.id,
    userId: req.user.id  // scoped to authenticated user
  });
  if (!invoice) return res.status(404).json({ error: 'Not found' });
  res.json(invoice);
});
```

### 4. Cross-Site Scripting (XSS)

Escape all output. Use a template engine that auto-escapes by default. For React, avoid `dangerouslySetInnerHTML`. Validate and sanitize rich text with DOMPurify:

```javascript
import DOMPurify from 'dompurify';

// Only when you must render HTML
const clean = DOMPurify.sanitize(userHtml, {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
  ALLOWED_ATTR: ['href']
});
```

### 5. Security Misconfiguration

Disable unnecessary features and use environment-appropriate settings:

```javascript
// Never expose stack traces in production
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

// Disable X-Powered-By header
app.disable('x-powered-by');
```

### 6. Vulnerable and Outdated Components

Run dependency audits in your CI pipeline:

```bash
npm audit --audit-level=high
npx snyk test
```

## HTTP Security Headers with helmet.js

The fastest way to set all critical headers in Express is `helmet`:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.yourdomain.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  hsts: {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  },
  frameguard: { action: 'deny' },     // X-Frame-Options: DENY
  noSniff: true,                       // X-Content-Type-Options: nosniff
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  permissionsPolicy: {
    features: {
      camera: [],
      microphone: [],
      geolocation: [],
    },
  },
}));
```

### Verifying Headers

After deploying, verify with:

```bash
curl -I https://yourdomain.com | grep -E "(Content-Security|Strict-Transport|X-Frame|X-Content)"
```

Or use [securityheaders.com](https://securityheaders.com) for a scored report.

## Content Security Policy (CSP) Deep Dive

A strict CSP is your last line of defense against XSS. Start with a report-only policy to avoid breaking anything:

```javascript
// Report-only mode — logs violations but doesn't block
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy-Report-Only',
    "default-src 'self'; " +
    "script-src 'self'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "report-uri /csp-report"
  );
  next();
});

// Collect reports
app.post('/csp-report', express.json({ type: 'application/csp-report' }), (req, res) => {
  console.warn('CSP violation:', req.body['csp-report']);
  res.status(204).end();
});
```

Once violations are resolved, switch to enforcement mode:

```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{RANDOM}'; object-src 'none'; base-uri 'self';
```

Use a per-request nonce for inline scripts instead of `'unsafe-inline'`:

```javascript
const crypto = require('crypto');

app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(16).toString('base64');
  res.setHeader('Content-Security-Policy',
    `script-src 'self' 'nonce-${res.locals.cspNonce}'`
  );
  next();
});

// In your template
// <script nonce="<%= cspNonce %>">...</script>
```

## HTTPS and TLS Configuration

Force HTTPS at the application level as a backup to your infrastructure:

```javascript
// Redirect HTTP to HTTPS
app.use((req, res, next) => {
  if (req.headers['x-forwarded-proto'] !== 'https' && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});
```

TLS configuration checklist:
- Use TLS 1.2 minimum (TLS 1.3 preferred)
- Disable SSL 3.0, TLS 1.0, TLS 1.1
- Use strong cipher suites (ECDHE + AES-GCM)
- Enable HSTS with `preload` and submit to the preload list
- Set secure and HttpOnly flags on all cookies

```javascript
res.cookie('session', token, {
  httpOnly: true,   // not accessible via JavaScript
  secure: true,     // HTTPS only
  sameSite: 'Strict', // CSRF protection
  maxAge: 3600000,  // 1 hour
});
```

## CSRF Protection

For state-changing endpoints, use CSRF tokens or verify the `Origin`/`Referer` header:

```javascript
const csrf = require('csurf');

const csrfProtection = csrf({ cookie: { httpOnly: true, secure: true } });

app.get('/form', csrfProtection, (req, res) => {
  res.render('form', { csrfToken: req.csrfToken() });
});

app.post('/submit', csrfProtection, (req, res) => {
  // Token validated automatically
  res.send('OK');
});
```

## Input Validation

Use `zod` or `joi` to validate all incoming data at the boundary:

```javascript
const { z } = require('zod');

const createUserSchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100).regex(/^[a-zA-Z\s]+$/),
  age: z.number().int().min(13).max(120),
});

app.post('/users', (req, res) => {
  const result = createUserSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ errors: result.error.flatten() });
  }
  // result.data is safe to use
});
```

## Automated Security Scanning Checklist

Add these tools to your CI/CD pipeline:

| Tool | Purpose | Command |
|------|---------|---------|
| `npm audit` | Known vulnerabilities in dependencies | `npm audit --audit-level=high` |
| Snyk | Deep dependency scanning + fix PRs | `snyk test && snyk monitor` |
| OWASP ZAP | Dynamic application scanning | `zap-baseline.py -t https://staging.app` |
| Trivy | Container image scanning | `trivy image myapp:latest` |
| ESLint security plugin | Static analysis for JS | `eslint-plugin-security` |
| Semgrep | Custom rule-based SAST | `semgrep --config=p/owasp-top-ten` |

## Quick Audit Checklist

Before every release, verify:

- [ ] All SQL queries use parameterized statements
- [ ] Authentication uses bcrypt/argon2 with cost factor ≥ 12
- [ ] All endpoints enforce authorization (not just authentication)
- [ ] `helmet()` is configured with CSP directives
- [ ] HSTS header is set with `preload`
- [ ] All cookies have `HttpOnly`, `Secure`, `SameSite=Strict`
- [ ] CSRF protection on all state-changing endpoints
- [ ] Input validated with schema library at every entry point
- [ ] `npm audit` passes with no high/critical issues
- [ ] Error responses do not leak stack traces in production
- [ ] Sensitive data is not logged (passwords, tokens, PII)
- [ ] Rate limiting on authentication and sensitive endpoints

Security is not a one-time task — make this checklist part of your pull request template and run automated scans on every deploy. The vulnerabilities that bring down companies are almost always the obvious ones that slipped through because nobody checked.
