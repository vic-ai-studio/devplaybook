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
