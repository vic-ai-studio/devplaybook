---
title: "HashiCorp Vault — Secrets Management & Dynamic Credentials"
description: "HashiCorp Vault is the industry-standard secrets management platform. Store, rotate, and audit access to API keys, passwords, certificates, and dynamic credentials — with zero-secrets-in-code architecture."
category: "Security"
pricing: "Open Source / Enterprise"
pricingDetail: "Open Source (BSL license). HCP Vault Dedicated from ~$0.03/hr. Enterprise self-hosted with audit/governance features."
website: "https://www.vaultproject.io"
github: "https://github.com/hashicorp/vault"
tags: ["secrets-management", "security", "devops", "encryption", "pki", "key-rotation", "zero-trust"]
pros:
  - "Dynamic secrets: generate short-lived credentials per request instead of sharing static keys"
  - "Broad integrations: AWS/GCP/Azure, Kubernetes, databases, PKI, SSH"
  - "Audit logging of every secret access — crucial for compliance"
  - "Fine-grained policies with Sentinel for attribute-based control"
  - "Transit encryption engine: encrypt data without storing it in Vault"
cons:
  - "Operational complexity — requires careful HA/seal/unseal management"
  - "Learning curve for policy language (HCL)"
  - "License changed to BSL 1.1 in 2023; not OSI-approved open source"
  - "HCP Vault can get expensive at scale"
date: "2026-04-01"
---

## What is HashiCorp Vault?

HashiCorp Vault is a secrets management platform designed around one principle: **no secrets in code, configs, or environment variables**. Instead, applications authenticate to Vault and receive short-lived credentials on demand. Vault acts as the single source of truth for all sensitive data — API keys, database passwords, TLS certificates, and encryption keys.

## Core Concepts

**Static vs Dynamic Secrets:** Static secrets (stored key/value pairs) are fine for third-party API keys. But for databases, cloud credentials, and SSH access, Vault generates *dynamic secrets* — unique, short-lived credentials that expire automatically. A breach of one credential is limited in scope and time.

```bash
# Store a static secret
vault kv put secret/myapp db_password="s3cr3t"

# Read it (application auth required)
vault kv get secret/myapp
```

## Key Features

### Dynamic Database Credentials

```hcl
# Vault generates a unique Postgres user per request, valid for 1 hour
path "database/creds/my-role" {
  capabilities = ["read"]
}
```

Applications call `vault read database/creds/my-role` and get a fresh username/password. No shared credentials. Vault revokes them automatically on TTL expiry or manual revocation.

### PKI & Certificate Management

Vault acts as an internal CA. Issue TLS certificates programmatically, rotate them before expiry, and revoke them instantly — all via API. This is a foundational piece of zero-trust service mesh architecture.

### Kubernetes Integration

```yaml
# Vault Agent Injector: inject secrets as files into pods
annotations:
  vault.hashicorp.com/agent-inject: "true"
  vault.hashicorp.com/role: "my-app-role"
  vault.hashicorp.com/agent-inject-secret-config.txt: "secret/data/myapp"
```

No application code changes needed — secrets appear as files in the container.

## Pricing

- **Open Source:** Self-hosted, BSL license. Full core functionality.
- **HCP Vault Dedicated:** Managed service on AWS/Azure/GCP. Pay per cluster/hour.
- **Enterprise:** Advanced features — Disaster Recovery, namespaces, FIPS compliance, Sentinel policies.

## Best For

- Teams running microservices that need per-service dynamic credentials
- Organizations with compliance requirements (SOC2, PCI-DSS, HIPAA) needing audit trails
- Kubernetes environments with workload identity authentication
- Replacing `.env` files and hardcoded secrets in CI/CD pipelines

## Concrete Use Case: Migrating from .env Files to Vault for SOC2 Compliance

A 30-person startup running a fintech SaaS product has been storing database passwords, Stripe API keys, and AWS credentials in `.env` files committed to a private repository. Their SOC2 auditor flags three critical findings: no audit trail for secret access, shared credentials across all developers, and no automated key rotation. The team decides to migrate to HashiCorp Vault to address all three findings in a single initiative.

The migration starts with the lowest-risk path: deploying HCP Vault Dedicated on AWS and moving the Stripe API keys and database credentials into Vault's KV v2 secrets engine. The CI/CD pipeline (GitHub Actions) authenticates to Vault via JWT/OIDC — no more long-lived tokens stored as repository secrets. Each microservice in their Kubernetes cluster uses the Vault Agent Injector to pull secrets at pod startup, so application code never touches credentials directly. The team configures dynamic database credentials next, so each service instance gets its own short-lived Postgres user that expires after 24 hours. If a credential leaks, blast radius is limited to one service instance and one day.

Within two months, the startup passes their SOC2 Type II audit. The audit log in Vault shows exactly which service accessed which secret and when — a requirement the auditor specifically praised. Developers no longer share a single `.env` file; instead, they authenticate to Vault via their SSO identity and receive scoped, time-limited credentials for local development. The total cost is roughly $500/month for HCP Vault Dedicated, which the team considers a reasonable trade-off against the compliance risk and the engineering time previously spent rotating credentials manually.

## When to Use HashiCorp Vault

**Use HashiCorp Vault when:**
- You need an audit trail of every secret access for compliance frameworks like SOC2, PCI-DSS, or HIPAA
- Your team shares static credentials via `.env` files, Slack messages, or password managers and you want to eliminate that practice
- You run microservices or Kubernetes workloads that each need isolated, short-lived credentials
- You need dynamic database credentials that rotate automatically without application redeployment
- You want a centralized PKI to issue and manage internal TLS certificates programmatically

**When NOT to use HashiCorp Vault:**
- You are a solo developer or very small team with a single application and no compliance requirements — a simpler tool like `doppler` or encrypted `.env` files may suffice
- You need only basic secret storage without dynamic credentials or audit logging — cloud-native solutions like AWS Secrets Manager or GCP Secret Manager are simpler to operate
- You lack the operational capacity to manage Vault's HA cluster, seal/unseal procedures, and upgrade lifecycle (unless you use HCP Vault Dedicated)
- Your secrets are exclusively within a single cloud provider's ecosystem and you prefer vendor-native tooling for tighter integration
