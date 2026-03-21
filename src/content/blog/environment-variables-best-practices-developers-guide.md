---
title: "Environment Variables Best Practices: A Developer's Complete Guide"
description: "Master environment variables: how to use them correctly, avoid common security mistakes, manage secrets across environments, and implement .env best practices in any stack."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["environment-variables", "security", "devops", "backend", "secrets-management", "best-practices"]
readingTime: "11 min read"
---

Environment variables seem simple. They're just key-value pairs, right? In practice, they're one of the most common sources of security breaches, production outages, and "it works on my machine" bugs in modern software development.

This guide covers how to use environment variables correctly—from basic usage to production secrets management.

---

## Why Environment Variables Exist

The core principle: **configuration should be separate from code**.

Your code should be identical across environments. The difference between development, staging, and production should only be configuration: database URLs, API keys, feature flags, service endpoints.

Before environment variables became the standard, developers hardcoded configuration:

```python
# Don't do this
DATABASE_URL = "postgresql://admin:password123@prod-db.internal:5432/myapp"
STRIPE_SECRET_KEY = "sk_live_abc123..."
```

Problems with this approach:
1. Secrets end up in version control
2. Different environments require code changes
3. Rotating credentials requires a deployment
4. Credentials are visible to everyone with repo access

Environment variables solve all of these.

---

## The Twelve-Factor App Model

The modern standard for environment variable usage comes from [The Twelve-Factor App](https://12factor.net/), specifically Factor III:

> "Store config in the environment. An app's config is everything that is likely to vary between deploys (staging, production, developer environments, etc.). This includes: resource handles to the database, Memcached, and other backing services; credentials to external services such as Amazon S3 or Twitter; per-deploy values such as the canonical hostname for the deploy."

The rule is simple: **anything that changes between environments or contains a secret goes in environment variables, not in code.**

---

## Basic Usage Across Languages

### Reading Environment Variables

**Node.js:**

```javascript
const dbUrl = process.env.DATABASE_URL;
const port = parseInt(process.env.PORT ?? '3000', 10);
const debug = process.env.DEBUG === 'true';

// With validation
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}
```

**Python:**

```python
import os

db_url = os.environ.get('DATABASE_URL')
port = int(os.environ.get('PORT', 3000))
debug = os.environ.get('DEBUG', 'false').lower() == 'true'

# Strict - raises KeyError if missing
api_key = os.environ['STRIPE_SECRET_KEY']
```

**Go:**

```go
import "os"

dbURL := os.Getenv("DATABASE_URL")
port := os.Getenv("PORT")
if port == "" {
    port = "3000"
}

// Verify required variables
apiKey, ok := os.LookupEnv("STRIPE_SECRET_KEY")
if !ok {
    log.Fatal("STRIPE_SECRET_KEY is required")
}
```

**Shell:**

```bash
export DATABASE_URL="postgresql://localhost:5432/myapp"
export NODE_ENV="production"

# Access in scripts
echo $DATABASE_URL
echo "${DATABASE_URL:-postgresql://localhost:5432/default}"  # with default
```

---

## `.env` Files

`.env` files are the standard way to manage environment variables locally.

### Basic `.env` Structure

```bash
# .env
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/myapp_dev

# External services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG...

# Feature flags
FEATURE_NEW_DASHBOARD=true
```

### Loading `.env` Files

**Node.js (dotenv):**

```bash
npm install dotenv
```

```javascript
// Load at application entry point
import 'dotenv/config';

// Or conditionally
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}
```

**Python (python-dotenv):**

```bash
pip install python-dotenv
```

```python
from dotenv import load_dotenv
import os

load_dotenv()  # Loads .env from current directory
# Or specify path: load_dotenv('/path/to/.env')

database_url = os.environ.get('DATABASE_URL')
```

**Go (godotenv):**

```bash
go get github.com/joho/godotenv
```

```go
import "github.com/joho/godotenv"

func init() {
    if err := godotenv.Load(); err != nil {
        log.Println("No .env file found")
    }
}
```

---

## The `.env.example` Pattern

This is essential for team collaboration.

**Never commit `.env`** — it contains secrets.

**Always commit `.env.example`** — it documents what variables are needed, with placeholder values.

```bash
# .env.example — COMMIT THIS FILE
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://localhost:5432/myapp_dev

# Get these from the team Vault / 1Password / LastPass
STRIPE_SECRET_KEY=sk_test_your_key_here
SENDGRID_API_KEY=your_key_here
SENTRY_DSN=your_dsn_here
```

Your `.gitignore`:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

Team onboarding process:
1. `cp .env.example .env`
2. Fill in actual values from your team's secrets manager
3. Start the application

---

## Multiple Environment Files

Most frameworks support multiple `.env` files for different environments:

```
.env                # Base defaults, shared across all environments
.env.local          # Local overrides (not committed)
.env.development    # Development-specific (usually committed, no secrets)
.env.test           # Test environment
.env.production     # Production defaults (no secrets, only non-sensitive config)
```

**Next.js** loads them in this order (later files take precedence):
1. `.env`
2. `.env.local`
3. `.env.[NODE_ENV]`
4. `.env.[NODE_ENV].local`

**Vite** uses the same convention with `import.meta.env.VITE_*` for client-side variables.

---

## Security Best Practices

### 1. Never Commit Secrets to Version Control

This is the most important rule. Once a secret is in git history, it's compromised—even if you delete it later. Bots scan GitHub continuously for leaked credentials.

```bash
# Check if any secrets might be staged
git diff --staged

# If you accidentally committed a secret:
# 1. Rotate the credential immediately (assume it's compromised)
# 2. Use BFG Repo Cleaner or git filter-branch to remove from history
# 3. Force push (coordinate with team)
```

Use tools to prevent accidental commits:
- **git-secrets** — scans commits for secrets patterns
- **gitleaks** — detects secrets in git repos
- **pre-commit hooks** with detect-secrets

### 2. Validate Required Variables at Startup

Fail fast. Don't let the app start if required configuration is missing.

```javascript
// config.js — Validate all required env vars at startup
function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Required environment variable ${name} is not set`);
  }
  return value;
}

export const config = {
  databaseUrl: requireEnv('DATABASE_URL'),
  stripeSecretKey: requireEnv('STRIPE_SECRET_KEY'),
  port: parseInt(process.env.PORT ?? '3000', 10),
  debug: process.env.DEBUG === 'true',
  environment: process.env.NODE_ENV ?? 'development',
};
```

Using **Zod** for typed configuration validation:

```typescript
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().url(),
  STRIPE_SECRET_KEY: z.string().startsWith('sk_'),
  SENDGRID_API_KEY: z.string().optional(),
  FEATURE_NEW_DASHBOARD: z.coerce.boolean().default(false),
});

export const env = envSchema.parse(process.env);
// TypeScript now knows the exact shape and types
```

### 3. Separate Variables by Sensitivity

Not all environment variables are equally sensitive. Group them:

```bash
# Public (non-secret): can be in version control
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
API_BASE_URL=https://api.example.com

# Private (secrets): NEVER in version control
DATABASE_URL=postgresql://...  # contains credentials
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=random_256_bit_string
ENCRYPTION_KEY=...
```

### 4. Use Different Credentials Per Environment

Never use production credentials in development or testing.

```bash
# Development
STRIPE_SECRET_KEY=sk_test_...   # Test mode key — safe to use
DATABASE_URL=postgresql://localhost:5432/myapp_dev

# Production
STRIPE_SECRET_KEY=sk_live_...   # Live key — restrict access
DATABASE_URL=postgresql://prod-db.internal:5432/myapp
```

Test API keys are designed to be safe in development—they don't charge real money, don't send real emails, etc.

### 5. Least Privilege for Database Credentials

Your application's database user should only have the permissions it needs:

```sql
-- Create an application user with limited permissions
CREATE USER myapp_user WITH PASSWORD 'secure_random_password';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO myapp_user;
-- Do NOT grant CREATE TABLE, DROP, or TRUNCATE unless needed
```

The `DATABASE_URL` in production uses `myapp_user`, not the admin/root user.

---

## Secrets Management in Production

Local `.env` files are for development only. Production needs proper secrets management.

### Option 1: Platform-Managed Secrets

Most hosting platforms provide environment variable management:

**Vercel:**
```bash
vercel env add STRIPE_SECRET_KEY production
```

**Railway / Render / Fly.io:** Environment variable UI or CLI

**Heroku:**
```bash
heroku config:set STRIPE_SECRET_KEY=sk_live_...
```

These are injected at runtime—not stored in files.

### Option 2: AWS Secrets Manager

```javascript
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

const client = new SecretsManagerClient({ region: "us-east-1" });

async function getSecret(secretName) {
  const response = await client.send(
    new GetSecretValueCommand({ SecretId: secretName })
  );
  return JSON.parse(response.SecretString);
}

const secrets = await getSecret("myapp/production");
// { DATABASE_URL: "...", STRIPE_SECRET_KEY: "..." }
```

### Option 3: HashiCorp Vault

```bash
# Store a secret
vault kv put secret/myapp/production \
  STRIPE_SECRET_KEY=sk_live_... \
  DATABASE_PASSWORD=...

# Retrieve in application
vault kv get -field=STRIPE_SECRET_KEY secret/myapp/production
```

### Option 4: Doppler (Developer-Focused)

Doppler syncs secrets across environments and provides SDKs for every language. It's particularly ergonomic for teams:

```bash
# Install CLI and authenticate
doppler setup

# Run your app with secrets injected
doppler run -- node server.js
```

### Option 5: Docker Secrets / Kubernetes Secrets

**Docker Compose:**
```yaml
services:
  app:
    image: myapp
    environment:
      - NODE_ENV=production
    secrets:
      - stripe_key

secrets:
  stripe_key:
    external: true
```

**Kubernetes:**
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secrets
type: Opaque
stringData:
  STRIPE_SECRET_KEY: "sk_live_..."
  DATABASE_PASSWORD: "secure_password"
```

---

## Naming Conventions

Clear naming prevents confusion:

```bash
# Pattern: CATEGORY_SUBCATEGORY_SPECIFICITY

# Database
DATABASE_URL=
DATABASE_POOL_SIZE=20
DATABASE_SSL=true

# External services (by provider name)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PUBLISHABLE_KEY=

SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=

AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=

# Application config
APP_PORT=3000
APP_ENV=production
APP_BASE_URL=https://example.com
APP_JWT_SECRET=

# Feature flags
FEATURE_NEW_CHECKOUT=true
FEATURE_DARK_MODE=true

# Limits/quotas
MAX_UPLOAD_SIZE_MB=10
RATE_LIMIT_PER_MINUTE=60
```

**Rules:**
- ALL_CAPS with underscores
- Prefix with service name for third-party credentials
- Prefix with FEATURE_ for feature flags
- Be specific enough to be unambiguous

---

## Frontend: What Can Be Public?

In frontend applications (React, Vue, Next.js), there's a critical distinction:

**Variables baked into the client bundle at build time are PUBLIC.** Anyone can read them in the browser's DevTools or by decompiling the bundle.

Never put the following in client-side env vars:
- Secret API keys
- Database credentials
- Private tokens

Only put non-sensitive configuration:
- Public API base URLs
- Stripe publishable key (designed to be public)
- Feature flags
- Analytics IDs (designed to be public)

**Next.js** uses `NEXT_PUBLIC_` prefix to explicitly mark what goes to the client:

```bash
# Server-only (safe)
STRIPE_SECRET_KEY=sk_live_...
DATABASE_URL=postgresql://...

# Client-exposed (public)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
NEXT_PUBLIC_API_URL=https://api.example.com
NEXT_PUBLIC_ANALYTICS_ID=UA-123456
```

**Vite** uses `VITE_` prefix:

```bash
# Server-only (not exposed)
SECRET_KEY=...

# Client-exposed
VITE_API_URL=https://api.example.com
VITE_STRIPE_PUBLIC_KEY=pk_live_...
```

---

## Debugging Environment Variable Issues

Common problems and how to diagnose them:

```bash
# Verify what's set in the current shell
env | grep STRIPE
printenv DATABASE_URL

# Check what a running process sees
cat /proc/<pid>/environ | tr '\0' '\n' | grep NODE

# In Node.js
console.log(Object.keys(process.env).sort());
```

**Common issues:**

1. **Variable not loaded** — `dotenv` not called before the variable is accessed
2. **Wrong environment** — `.env.local` not loaded, or `NODE_ENV` mismatch
3. **String vs boolean** — `process.env.DEBUG` is always a string, never a boolean
4. **Trailing whitespace** — `SECRET_KEY=abc123 ` includes the space
5. **Quotes in values** — `KEY="value"` may or may not strip quotes depending on the loader

```bash
# In .env files, these are equivalent:
KEY=value
KEY="value"     # dotenv strips quotes
KEY='value'     # dotenv strips quotes

# But in shell:
export KEY="value with spaces"   # Fine
export KEY=value with spaces      # Breaks
```

---

## Key Takeaways

- **Never commit secrets to version control.** Once committed, assume compromised.
- **Always have a `.env.example`** documenting required variables.
- **Validate required variables at startup.** Fail fast with a clear error.
- **Use different credentials per environment.** Dev/staging/prod should never share secrets.
- **Frontend env vars are public.** Only put non-sensitive config there.
- **In production, use a secrets manager** — not files.
- **Use the `NEXT_PUBLIC_`/`VITE_` prefix conventions** to make public vs private explicit.
- **Least privilege** for database and service credentials.

Environment variables done right are invisible—they just work. Done wrong, they're a security incident waiting to happen.
