---
title: "Best Environment Variable Management Tools for Developers in 2025"
description: "A practical guide to managing environment variables in 2025 — covering .env files, dotenvx, Infisical, Doppler, AWS Secrets Manager, and how to handle secrets across local, staging, and production."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["environment-variables", "secrets-management", "dotenv", "doppler", "infisical", "security", "devops"]
readingTime: "10 min read"
---

Every application has secrets: API keys, database credentials, OAuth tokens, encryption keys. How you manage them determines whether those secrets stay secret — and whether your team can actually work with them without emailing each other `.env` files.

This guide covers the real options in 2025, from basic `.env` files to production-grade secrets managers.

---

## The Core Problem

Environment variable management has three distinct challenges:

1. **Local development**: Developers need secrets on their machines to run the app
2. **Team synchronization**: Everyone's local environment needs to stay in sync
3. **Production deployment**: Secrets need to reach deployed environments securely

Most teams solve #1 poorly, #2 not at all, and #3 acceptably. This guide covers doing all three well.

---

## The Bad Practice (That Everyone Uses)

**The `.env` file committed to git.**

Don't do this. Secrets in git history are compromised secrets, even if you delete the file later. If your repo is ever public, ever leaked, or ever shared with a contractor — those secrets are exposed forever.

What people do instead (but shouldn't):
- Email `.env` files to new team members
- Share them in Slack DMs
- Use the same credentials for dev and production

All of these fail in different ways. Here's how to actually do it.

---

## Option 1: Basic `.env` With `dotenv` (Fine for Solo Projects)

The `dotenv` package loads a `.env` file into `process.env` at runtime. It's simple and universally understood.

**Setup:**

```bash
npm install dotenv
```

```js
// At the top of your entry file
require('dotenv').config()

// Or with ES modules
import 'dotenv/config'
```

```bash
# .env (NEVER commit this)
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
API_KEY=sk-abc123
REDIS_URL=redis://localhost:6379

# .env.example (DO commit this)
DATABASE_URL=postgresql://user:pass@localhost:5432/myapp
API_KEY=your-api-key-here
REDIS_URL=redis://localhost:6379
```

**Rules:**
- `.env` in `.gitignore` — always
- `.env.example` committed with placeholder values — always
- New team members copy `.env.example` to `.env` and fill in real values

**Limitations:**
- No sync between team members
- No audit trail
- No separation between environments
- Secrets live in plaintext on disk

**Best for:** Solo projects, learning, prototypes.

---

## Option 2: dotenvx — Encrypted `.env` Files

dotenvx is an open-source tool from the creator of the original `dotenv`. It adds encryption to `.env` files so you can actually commit them safely.

**How it works:**

```bash
# Install
npm install -g @dotenvx/dotenvx

# Encrypt your .env file
dotenvx encrypt

# .env is now encrypted — safe to commit
# .env.keys contains your private key — DO NOT COMMIT THIS
```

Your `.env` file becomes:

```bash
#/-------------------[DOTENV_PUBLIC_KEY]--------------------/
#/            public-key encryption for .env files          /
#/       [how it works](https://dotenvx.com/encryption)     /
#/----------------------------------------------------------/
DOTENV_PUBLIC_KEY="025a54c5d04b..."

# .env
DATABASE_URL="encrypted:BGYE53..."
API_KEY="encrypted:BH8f2..."
```

The encrypted `.env` can be committed. The `.env.keys` file (private key) goes in `.gitignore` and is shared through a separate, secure channel.

**Running your app:**

```bash
# Development (using .env.keys)
dotenvx run -- node server.js

# Production (inject DOTENV_PRIVATE_KEY as env var)
DOTENV_PRIVATE_KEY="your-key" dotenvx run -- node server.js
```

**Why this is good:**
- Solves the "how do I share secrets with team members" problem
- Encrypted values are safe in git history
- Works with any language, any deployment
- Open source, no external service required

**Limitations:**
- Key rotation requires re-encrypting all values
- No web UI or audit log
- Trusting key distribution is still a people problem

**Best for:** Small teams that want encryption without a full secrets service.

---

## Option 3: Infisical — Open-Source Secrets Manager

Infisical is the most popular open-source secrets management platform. It offers a Vault-like experience with a developer-friendly interface, and you can self-host or use their cloud.

**Key features:**
- Web UI to manage secrets across environments (development, staging, production)
- CLI to inject secrets at runtime
- SDK integrations for Node.js, Python, Go, etc.
- Secret rotation
- Access control (who can see which secrets in which environment)
- Audit log
- GitHub, GitLab, Kubernetes integrations

**CLI usage:**

```bash
# Install
brew install infisical/get-infisical/infisical

# Login
infisical login

# Initialize project
infisical init

# Run with secrets injected
infisical run -- npm run dev

# Pull secrets to a .env file (for tools that need it)
infisical export --format dotenv > .env
```

**SDK usage (Node.js):**

```bash
npm install @infisical/sdk
```

```ts
import { InfisicalClient } from "@infisical/sdk"

const client = new InfisicalClient({
  clientId: process.env.INFISICAL_CLIENT_ID,
  clientSecret: process.env.INFISICAL_CLIENT_SECRET,
})

const { secretValue } = await client.getSecret({
  secretName: "DATABASE_URL",
  projectId: "your-project-id",
  environment: "production",
})
```

**Pricing:**
- Self-hosted: free
- Cloud free tier: 5 members, unlimited secrets
- Cloud paid: starts around $8/user/month

**Best for:** Teams that want open-source but need a full secrets management platform.

---

## Option 4: Doppler — Commercial Secrets Manager with Great DX

Doppler is a commercial secrets management platform focused on developer experience. It's particularly popular with teams using Vercel, Railway, or similar platforms.

**Key features:**
- Clean, fast web UI
- Native integrations: Vercel, Heroku, Railway, AWS, GCP, Azure
- Branch/PR-based secret environments
- Automatic secret injection into deployed environments
- Audit log and access control
- CLI with autocomplete

**CLI usage:**

```bash
# Install
brew install dopplerhq/cli/doppler

# Login
doppler login

# Configure project
doppler setup

# Run with secrets
doppler run -- npm run dev

# Pull to .env
doppler secrets download --no-file --format env > .env
```

**Vercel integration:**

```bash
# Sync Doppler secrets to Vercel
doppler secrets download --no-file --format env | \
  vercel env add --environment production
```

Or use the native Vercel ↔ Doppler integration that auto-syncs.

**Pricing:**
- Free: up to 5 users, 3 projects
- Team: $6/user/month
- Enterprise: custom

**Best for:** Small-to-medium teams that want polished tooling and native integration with deployment platforms.

---

## Option 5: AWS Secrets Manager / GCP Secret Manager / Azure Key Vault

For teams already on a cloud provider, using their native secrets service is often the right choice — especially for production workloads.

**AWS Secrets Manager:**

```ts
import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager"

const client = new SecretsManagerClient({ region: "us-east-1" })

const response = await client.send(
  new GetSecretValueCommand({ SecretId: "myapp/production/database" })
)

const { DATABASE_URL } = JSON.parse(response.SecretString)
```

**Pros:**
- Tight integration with IAM (fine-grained access control)
- Automatic rotation for supported services (RDS, etc.)
- Audit via CloudTrail
- Works well with Lambda, ECS, EKS

**Cons:**
- $0.40/secret/month + API call costs
- Adds AWS SDK as a dependency
- Latency on every secret fetch (use caching)
- Requires AWS credentials to access (bootstrapping problem)

**Best for:** Teams with significant AWS workloads that want secrets close to their infrastructure.

---

## Recommended Setup by Team Size

### Solo developer / small project

1. `dotenv` for local development
2. `.env.example` committed to repo
3. Platform-native env vars for production (Vercel, Railway, Render all have good secret UIs)

### Small team (2-10 people)

1. Doppler or Infisical for secret synchronization
2. CLI injection in dev, native platform integration in prod
3. Separate environments: development, staging, production

### Medium team (10-50 people)

1. Infisical (self-hosted) or Doppler
2. Service accounts with scoped access
3. Audit log review process
4. Secret rotation policy

### Enterprise / cloud-native

1. Cloud provider native (AWS Secrets Manager / GCP / Azure Key Vault)
2. Kubernetes Secrets with encryption at rest + External Secrets Operator
3. HashiCorp Vault for complex rotation requirements
4. Full audit trail and compliance tooling

---

## Best Practices Regardless of Tool

**Never commit secrets to git.** Check your `.gitignore` includes `.env`, `.env.local`, `.env.*.local`, `*.pem`, `*.key`.

**Separate by environment.** Development secrets should never have production access. Different services, different credentials.

**Rotate after exposure.** Any secret that was exposed (leaked repo, terminated employee, tool breach) must be rotated immediately — not "eventually."

**Principle of least privilege.** Each service should only have access to the secrets it needs. Your API server doesn't need your database admin credentials.

**Audit access.** Know who can see which secrets. This matters for both security and compliance.

**Don't log secrets.** Audit your logging for accidental secret exposure. Environment variables are particularly easy to accidentally log in error messages.

---

## Quick Comparison

| Tool | Self-hosted | Sync | UI | CI Integration | Cost |
|------|-------------|------|----|----|------|
| dotenv | Yes | No | No | Manual | Free |
| dotenvx | Yes | Via git | No | Good | Free |
| Infisical | Yes/Cloud | Yes | Yes | Excellent | Free/Paid |
| Doppler | Cloud | Yes | Yes | Excellent | Free tier |
| AWS Secrets Manager | AWS | Yes | AWS Console | Good | ~$0.40/secret/month |

---

*More free tools for developers at [DevPlaybook.cc](https://devplaybook.cc) — including [JSON Formatter](https://devplaybook.cc/tools/json-formatter), [Base64 Encoder](https://devplaybook.cc/tools/base64-encoder), and 15+ utilities for daily development work.*
