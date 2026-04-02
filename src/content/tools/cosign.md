---
title: "Cosign — Container Image Signing & Verification"
description: "Cosign is the standard tool for signing, verifying, and attaching metadata to container images. Part of the Sigstore project, it enables software supply chain security without managing key infrastructure."
category: "Security"
pricing: "Free / Open Source"
pricingDetail: "Cosign is 100% free and open-source (Apache 2.0). Part of the Sigstore project, hosted by the OpenSSF."
website: "https://sigstore.dev"
github: "https://github.com/sigstore/cosign"
tags: ["security", "containers", "supply-chain", "signing", "kubernetes", "ci-cd", "sigstore", "sbom"]
pros:
  - "Keyless signing: sign with OIDC identity (GitHub Actions, Google, Microsoft) — no key management"
  - "Transparent log (Rekor): all signatures recorded publicly for auditability"
  - "OCI registry native: signatures stored alongside images in the same registry"
  - "Kubernetes policy enforcement via Kyverno or OPA Gatekeeper"
  - "SBOM attestation: attach SBOMs, SLSA provenance, and custom attestations to images"
cons:
  - "Keyless signing requires OIDC provider — complex in air-gapped environments"
  - "Verification policies require additional tooling (Kyverno, Connaisseur)"
  - "Relatively new: ecosystem still maturing, some rough edges"
  - "Rekor transparency log entries are public — not suitable for private infrastructure details"
date: "2026-04-02"
---

## What is Cosign?

Cosign is a tool for signing and verifying container images. It's part of the Sigstore project — a set of open-source tools for code signing that provides a transparent, auditable record of who signed what and when.

Supply chain attacks have become a major threat vector (SolarWinds, Log4Shell, XZ Utils). Cosign addresses this by enabling you to cryptographically verify that a container image was built by your CI/CD system, hasn't been tampered with, and meets your security policy before it runs in production.

## Quick Start

```bash
# Install Cosign
brew install cosign
# Or via Go
go install github.com/sigstore/cosign/v2/cmd/cosign@latest

# Sign an image with keyless signing (GitHub Actions OIDC)
cosign sign --yes ghcr.io/myorg/myapp:v1.0.0

# Verify a signed image
cosign verify \
  --certificate-identity "https://github.com/myorg/myapp/.github/workflows/release.yml@refs/heads/main" \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myapp:v1.0.0

# Sign with a key pair (traditional approach)
cosign generate-key-pair  # Creates cosign.key and cosign.pub
cosign sign --key cosign.key ghcr.io/myorg/myapp:v1.0.0
cosign verify --key cosign.pub ghcr.io/myorg/myapp:v1.0.0
```

## Keyless Signing with Sigstore

Keyless signing is the recommended approach — no key management required:

```bash
# In GitHub Actions CI/CD:
# 1. GitHub generates an OIDC token for the workflow
# 2. Cosign exchanges the OIDC token for a short-lived certificate
# 3. The certificate ties the signature to the workflow identity
# 4. Signature + certificate recorded in Rekor (public transparency log)
# 5. Certificate expires after signing — no long-lived keys to manage

cosign sign --yes \
  --rekor-url=https://rekor.sigstore.dev \
  ghcr.io/myorg/myapp:${{ github.sha }}
```

The verification command checks:
1. The signature is cryptographically valid
2. The signing certificate was issued by the trusted CA
3. The signing identity matches the expected CI/CD workflow
4. The signature is recorded in the Rekor transparency log

## CI/CD Integration

### GitHub Actions

```yaml
name: Build and Sign
on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write
  id-token: write  # Required for keyless signing

jobs:
  build-sign:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Log in to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        id: build-push
        uses: docker/build-push-action@v5
        with:
          push: true
          tags: ghcr.io/${{ github.repository }}:${{ github.sha }}

      - name: Install Cosign
        uses: sigstore/cosign-installer@v3

      - name: Sign the image
        run: |
          cosign sign --yes \
            ghcr.io/${{ github.repository }}@${{ steps.build-push.outputs.digest }}
        env:
          COSIGN_EXPERIMENTAL: 1
```

### Verification in CI

```yaml
- name: Verify image before deployment
  run: |
    cosign verify \
      --certificate-identity "https://github.com/${{ github.repository }}/.github/workflows/release.yml@refs/heads/main" \
      --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
      ghcr.io/myorg/myapp:${{ env.IMAGE_TAG }}
```

## Attestations

Cosign supports attaching attestations — structured claims about the image:

```bash
# Attach an SBOM as an attestation
syft ghcr.io/myorg/myapp:latest -o cyclonedx-json > sbom.json
cosign attest --yes \
  --predicate sbom.json \
  --type cyclonedx \
  ghcr.io/myorg/myapp:latest

# Verify the SBOM attestation
cosign verify-attestation \
  --type cyclonedx \
  --certificate-identity "..." \
  --certificate-oidc-issuer "https://token.actions.githubusercontent.com" \
  ghcr.io/myorg/myapp:latest | jq '.payload | @base64d | fromjson'

# Attach SLSA provenance attestation
cosign attest --yes \
  --predicate provenance.json \
  --type slsaprovenance \
  ghcr.io/myorg/myapp:latest
```

## Kubernetes Policy Enforcement with Kyverno

Ensure only signed images run in your cluster:

```yaml
# Kyverno ClusterPolicy to require Cosign signatures
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  rules:
    - name: check-image-signature
      match:
        resources:
          kinds: [Pod]
          namespaces: [production, staging]
      verifyImages:
        - imageReferences:
            - "ghcr.io/myorg/*"
          attestors:
            - count: 1
              entries:
                - keyless:
                    subject: "https://github.com/myorg/*/.github/workflows/*.yml@*"
                    issuer: "https://token.actions.githubusercontent.com"
                    rekor:
                      url: https://rekor.sigstore.dev
```

## Verify Before Pull (Admission Control)

With Kyverno or Connaisseur, unsigned images are rejected at admission:

```
Error from server: admission webhook "mutate.kyverno.svc" denied the request:
policy Pod/production/myapp for resource violation:
require-signed-images/check-image-signature:
  Image ghcr.io/myorg/myapp:latest failed signature verification.
```

Cosign + Kyverno is the standard approach for software supply chain security in Kubernetes environments in 2026.
