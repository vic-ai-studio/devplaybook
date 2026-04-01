---
title: "Container Security Beyond Scanning: Runtime & Supply Chain 2026"
description: "Go beyond image scanning for container security in 2026. Cover supply chain security with Sigstore/Cosign, SBOM generation, runtime security with Falco, seccomp profiles, distroless images, and OPA Gatekeeper."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["container-security", "sigstore", "cosign", "falco", "sbom", "opa-gatekeeper", "devops"]
readingTime: "12 min read"
category: "devops"
---

Most teams stop container security at image scanning — run Trivy on your Dockerfile, fix the high-severity CVEs, ship it. But image scanning is only one layer of a defense-in-depth strategy. The SolarWinds, Log4Shell, and XZ Utils incidents all showed that vulnerabilities slip through scanning, and that runtime behavior and supply chain integrity matter as much as the image contents.

This guide covers the complete container security stack for 2026.

## The Container Security Layers

| Layer | What it covers | Tools |
|-------|---------------|-------|
| Source code | SAST, secret scanning | CodeQL, Semgrep, GitLeaks |
| Dockerfile | Misconfigurations, base image | Hadolint, Dockle |
| Image (static) | Known CVEs in packages | Trivy, Snyk, Grype |
| Image (supply chain) | Who built it, was it tampered? | Cosign, SLSA |
| Registry | Admission control before pull | OPA Gatekeeper, Kyverno |
| Runtime | Actual container behavior | Falco, Tetragon |
| Host/kernel | Syscall filtering | seccomp, AppArmor, SELinux |

Scanning addresses only the third row. The weakest point is often the supply chain (row 5) — attackers compromise build pipelines and inject malicious code into trusted images.

## Image Scanning: What Trivy and Snyk Actually Cover

Trivy and Snyk scan OS package databases and language dependency manifests against known CVE databases (NVD, GitHub Advisory, etc.):

```bash
# Trivy: comprehensive scanner (OS packages + language deps + secrets)
trivy image myapp:latest

# Scan with JSON output for CI integration
trivy image --format json --output results.json myapp:latest

# Fail CI if critical vulnerabilities found
trivy image --exit-code 1 --severity CRITICAL myapp:latest

# Scan a running Kubernetes cluster
trivy k8s --report summary cluster
```

**What scanning catches:**
- Known CVEs in installed OS packages (libssl, glibc, etc.)
- Vulnerable npm/pip/maven dependencies
- Hardcoded secrets in the image (API keys, passwords)
- Dockerfile misconfigurations (running as root, ADD instead of COPY)

**What scanning misses:**
- Zero-day vulnerabilities (not yet in CVE databases)
- Logic vulnerabilities in application code
- Supply chain attacks that inject clean-looking malicious code
- Runtime behavior (a clean image might behave maliciously at runtime)

## Supply Chain Security: Sigstore and Cosign

The 2020-2021 wave of supply chain attacks prompted the industry to develop a framework for cryptographically verifying who built a container image and whether it was tampered with. Sigstore (a Linux Foundation project) provides the infrastructure.

### Signing Images with Cosign

```bash
# Install Cosign
brew install cosign

# Generate a key pair (or use keyless via OIDC — recommended)
cosign generate-key-pair

# Sign an image after push
cosign sign --key cosign.key ghcr.io/myorg/myapp:v1.2.3

# Verify a signature
cosign verify --key cosign.pub ghcr.io/myorg/myapp:v1.2.3

# Keyless signing (uses OIDC identity — no key to manage)
# Requires OIDC token (GitHub Actions, GCP Workload Identity, etc.)
COSIGN_EXPERIMENTAL=1 cosign sign ghcr.io/myorg/myapp:v1.2.3
```

### Keyless Signing in GitHub Actions

```yaml
- name: Sign the image
  uses: sigstore/cosign-installer@main

- name: Sign container image
  env:
    COSIGN_EXPERIMENTAL: "true"
  run: |
    cosign sign \
      --yes \
      ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }}
```

With keyless signing, Cosign uses your GitHub Actions OIDC token to bind the signature to your GitHub identity. The signature is stored in the Sigstore transparency log (Rekor) — anyone can verify it was signed by your CI pipeline.

### Enforcing Signature Verification at Admission

Use Kyverno or OPA Gatekeeper to reject unsigned or unverified images:

```yaml
# Kyverno: require image signature before admission
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-signed-images
spec:
  validationFailureAction: Enforce
  rules:
  - name: check-image-signature
    match:
      any:
      - resources:
          kinds: [Pod]
    verifyImages:
    - imageReferences:
      - "ghcr.io/myorg/*"
      attestors:
      - count: 1
        entries:
        - keyless:
            subject: "https://github.com/myorg/*"
            issuer: "https://token.actions.githubusercontent.com"
```

## SBOM Generation

A Software Bill of Materials (SBOM) is a machine-readable inventory of every package and dependency in your image. The US Executive Order on Cybersecurity (2021) requires SBOMs for software sold to federal agencies, and it's becoming standard practice.

```bash
# Generate SBOM with Syft
syft myapp:latest -o spdx-json > sbom.spdx.json

# Scan SBOM for vulnerabilities (faster than re-scanning image)
grype sbom:./sbom.spdx.json

# Attach SBOM to image as OCI artifact
cosign attach sbom --sbom sbom.spdx.json ghcr.io/myorg/myapp:v1.2.3

# Verify SBOM is attached
cosign download sbom ghcr.io/myorg/myapp:v1.2.3
```

SBOM formats: **SPDX** (Linux Foundation standard, JSON/YAML/RDF) and **CycloneDX** (OWASP standard, XML/JSON). Both are widely supported.

## Runtime Security with Falco

Falco is a CNCF-graduated runtime security tool that uses eBPF to monitor kernel syscalls and detect anomalous container behavior in real time.

### What Falco Detects

- Container shell spawned (e.g., `kubectl exec` — or an attacker getting a shell)
- Sensitive file reads (`/etc/shadow`, `/proc/*/environ`)
- Network connections to unexpected destinations
- Privilege escalation attempts
- Unexpected outbound connections
- Container running as root executing unexpected commands

```yaml
# Example Falco rule: alert on shell in container
- rule: Terminal shell in container
  desc: A shell was used as the entrypoint/exec point into a container
  condition: >
    spawned_process and container
    and shell_procs and proc.tty != 0
    and container_entrypoint
  output: >
    A shell was spawned in a container with an attached terminal
    (evt.time=%evt.time.s user=%user.name %container.info
    shell=%proc.name parent=%proc.pname cmdline=%proc.cmdline)
  priority: NOTICE
  tags: [container, shell, mitre_execution]
```

```bash
# Install Falco via Helm (eBPF driver — no kernel module needed)
helm install falco falcosecurity/falco \
  --set driver.kind=ebpf \
  --set falcosidekick.enabled=true \
  --set falcosidekick.config.slack.webhookurl=https://hooks.slack.com/...
```

### Tetragon (eBPF Security)

Tetragon (Isovalent/Cilium) goes deeper than Falco — it enforces security policies at the kernel level using eBPF, not just alerting. A TracingPolicy can terminate a process or drop a network connection in real time, not just log it.

## seccomp and AppArmor Profiles

**seccomp** (secure computing mode) limits which Linux syscalls a container can make. Containers typically only need 30-40 of the 300+ available syscalls. Blocking the rest eliminates entire attack classes.

```yaml
# Kubernetes Pod with seccomp profile
apiVersion: v1
kind: Pod
spec:
  securityContext:
    seccompProfile:
      type: RuntimeDefault    # Docker/containerd's built-in default profile
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      readOnlyRootFilesystem: true
      runAsNonRoot: true
      runAsUser: 10001
      capabilities:
        drop: [ALL]           # Drop all Linux capabilities
        add: [NET_BIND_SERVICE]  # Add back only what's needed
```

## Distroless Images

Distroless images (from Google) contain only the runtime (Java, Node, Python, Go) and your application — no shell (`/bin/sh`), no package manager, no extra utilities. This dramatically reduces the attack surface.

```dockerfile
# Go binary with distroless
FROM golang:1.22 AS builder
WORKDIR /build
COPY . .
RUN CGO_ENABLED=0 go build -o server .

# distroless: no shell, no apt, no tools for attackers
FROM gcr.io/distroless/static-debian12
COPY --from=builder /build/server /server
ENTRYPOINT ["/server"]
```

| Base Image | Size | Shell | Attack Surface |
|-----------|------|-------|----------------|
| ubuntu:24.04 | 78MB | Yes | High |
| debian:bookworm-slim | 75MB | Yes | Medium |
| alpine:3.20 | 7MB | sh | Low |
| distroless/static | 2MB | None | Minimal |
| scratch | 0MB | None | Zero (Go only) |

## OPA Gatekeeper: Admission Control Policies

OPA Gatekeeper enforces security policies at admission time — before a pod is created, it validates against your policy set.

```yaml
# Constraint Template: require non-root containers
apiVersion: templates.gatekeeper.sh/v1
kind: ConstraintTemplate
metadata:
  name: requirenonroot
spec:
  crd:
    spec:
      names:
        kind: RequireNonRoot
  targets:
  - target: admission.k8s.gatekeeper.sh
    rego: |
      package requirenonroot
      violation[{"msg": msg}] {
        c := input.review.object.spec.containers[_]
        c.securityContext.runAsNonRoot != true
        msg := sprintf("Container %v must run as non-root", [c.name])
      }

---
# Constraint: apply the policy cluster-wide
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: RequireNonRoot
metadata:
  name: require-non-root
spec:
  match:
    kinds:
    - apiGroups: [*]
      kinds: [Pod]
    excludedNamespaces: [kube-system]
```

## Security Layers Summary

| Layer | Tool | Blocks | Alert |
|-------|------|--------|-------|
| Static scanning | Trivy/Snyk | CVEs in packages | Build time |
| Supply chain | Cosign + Kyverno | Unsigned images | Admission |
| SBOM | Syft/Grype | Dependency vulnerabilities | Build time |
| Admission | OPA Gatekeeper | Policy violations | Admission |
| Runtime | Falco | Suspicious behavior | Runtime |
| Syscall filter | seccomp | Unexpected syscalls | Runtime |
| Capabilities | Pod SecurityContext | Privilege escalation | Runtime |

The key insight is that each layer catches different things. A defense-in-depth strategy implements at least scanning + admission control + runtime monitoring — not just scanning alone.
