---
title: "Docker Security Hardening: Container Best Practices 2026"
description: "Docker security hardening guide: non-root users, minimal base images, multi-stage builds, read-only filesystems, Seccomp/AppArmor profiles, image scanning with Trivy, and Docker Bench."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Docker", "container security", "Dockerfile", "security hardening", "Trivy", "DevSecOps"]
readingTime: "10 min read"
category: "devops"
---

Containers are not automatically secure. A poorly written Dockerfile can expose your host system, leak credentials, or ship hundreds of known vulnerabilities. Docker security hardening is not a one-time checklist — it is a set of layered practices that must be applied consistently across your build pipeline, runtime configuration, and registry workflow.

## Start with Minimal Base Images

Your base image determines the attack surface of every container that inherits from it. A full Ubuntu image includes thousands of packages you will never use, each a potential vulnerability vector.

```dockerfile
# Bad: full OS with hundreds of packages
FROM ubuntu:22.04

# Better: slim variant
FROM python:3.12-slim

# Best for production: distroless (no shell, no package manager)
FROM gcr.io/distroless/python3-debian12

# Or scratch for statically compiled Go binaries
FROM scratch
COPY --from=builder /app/server /server
CMD ["/server"]
```

`distroless` images from Google contain only the application runtime and its dependencies — no shell, no `apt`, no `curl`. An attacker who gains code execution has almost no tools to work with.

## Run as Non-Root User

Running as `root` inside a container is a critical mistake. If your container is compromised, a root process can potentially escape to the host, especially in misconfigured setups or older kernel versions.

```dockerfile
FROM python:3.12-slim

# Create a dedicated app user
RUN groupadd --gid 1001 appgroup && \
    useradd --uid 1001 --gid appgroup --shell /bin/bash --create-home appuser

WORKDIR /app
COPY --chown=appuser:appgroup requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=appuser:appgroup . .

# Switch to non-root before running the application
USER appuser

EXPOSE 8000
CMD ["gunicorn", "app:application", "--bind", "0.0.0.0:8000"]
```

The `--chown` flag on `COPY` ensures files are owned by the app user, not root. Verify in your Kubernetes pod spec that `runAsNonRoot: true` and `runAsUser: 1001` match.

## Use Multi-Stage Builds

Multi-stage builds are the single most impactful technique for reducing image size and attack surface. Build tools, test dependencies, and intermediate artifacts never make it into the final image.

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

# Copy only what the app needs to run
COPY --from=builder --chown=nextjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/package.json .

USER nextjs
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

The production image has no compiler, no `npm`, no source code, and no test files. The attack surface shrinks dramatically.

## Make the Filesystem Read-Only

Most applications write to specific directories (logs, temp files, uploads). Everything else should be immutable at runtime.

```yaml
# Docker Compose
services:
  api:
    image: my-api:latest
    read_only: true
    tmpfs:
      - /tmp:noexec,nosuid,size=100m
    volumes:
      - type: bind
        source: ./uploads
        target: /app/uploads
```

```yaml
# Kubernetes
securityContext:
  readOnlyRootFilesystem: true

volumeMounts:
- name: tmp-dir
  mountPath: /tmp
volumes:
- name: tmp-dir
  emptyDir: {}
```

A read-only filesystem means that if an attacker achieves code execution, they cannot write persistence scripts, install tools, or modify application binaries.

## Apply Seccomp and AppArmor Profiles

Seccomp (Secure Computing Mode) filters which system calls a container can make. Docker ships with a default Seccomp profile that blocks about 44 dangerous syscalls. In production, consider a custom profile tailored to your application.

```json
{
  "defaultAction": "SCMP_ACT_ERRNO",
  "architectures": ["SCMP_ARCH_X86_64"],
  "syscalls": [
    {
      "names": [
        "read", "write", "open", "close", "stat", "fstat",
        "mmap", "mprotect", "munmap", "brk", "rt_sigaction",
        "rt_sigprocmask", "ioctl", "access", "execve",
        "exit", "exit_group", "getdents64", "futex",
        "clone", "fork", "wait4", "socket", "connect",
        "accept", "sendto", "recvfrom", "bind", "listen"
      ],
      "action": "SCMP_ACT_ALLOW"
    }
  ]
}
```

Apply it at runtime:

```bash
docker run --security-opt seccomp=custom-profile.json my-api:latest
```

AppArmor provides mandatory access control at the OS level. Docker applies the `docker-default` AppArmor profile automatically when AppArmor is enabled on the host. You can write custom profiles for additional restriction using `aa-genprof`.

## Scan Images with Trivy

Trivy is the leading open-source vulnerability scanner for container images. Integrate it into your CI pipeline to catch CVEs before they reach production.

```bash
# Scan a local image
trivy image --exit-code 1 --severity HIGH,CRITICAL my-api:latest

# Scan with SBOM output
trivy image --format cyclonedx --output sbom.json my-api:latest

# Scan a Dockerfile for misconfigurations
trivy config --exit-code 1 Dockerfile
```

```yaml
# GitHub Actions integration
- name: Scan image with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ${{ env.IMAGE_TAG }}
    format: sarif
    output: trivy-results.sarif
    severity: CRITICAL,HIGH
    exit-code: 1

- name: Upload Trivy results to GitHub Security
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: trivy-results.sarif
```

Set `exit-code: 1` to fail the build when HIGH or CRITICAL vulnerabilities are found. This forces teams to address CVEs rather than shipping around them.

## Run Docker Bench for Security

Docker Bench for Security audits your Docker host configuration against CIS Docker Benchmark recommendations:

```bash
docker run --net host --pid host --userns host --cap-add audit_control \
  -e DOCKER_CONTENT_TRUST=$DOCKER_CONTENT_TRUST \
  -v /etc:/etc:ro \
  -v /usr/bin/containerd:/usr/bin/containerd:ro \
  -v /usr/bin/runc:/usr/bin/runc:ro \
  -v /usr/lib/systemd:/usr/lib/systemd:ro \
  -v /var/lib:/var/lib:ro \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  --label docker_bench_security \
  docker/docker-bench-security
```

It checks categories including host configuration, Docker daemon settings, container runtime defaults, image integrity, and audit logging. Run it after provisioning new Docker hosts and after major Docker version upgrades.

## Additional Hardening Measures

**Never store secrets in images.** Use environment variables injected at runtime, Docker secrets, or Kubernetes secrets:

```dockerfile
# Bad — baked into the image layer
ENV DATABASE_URL=postgres://user:password@host/db

# Good — injected at runtime via orchestrator
# Access via os.environ["DATABASE_URL"] in application code
```

**Enable Docker Content Trust** to verify image signatures:

```bash
export DOCKER_CONTENT_TRUST=1
docker pull my-registry.com/my-api:latest
```

**Drop all capabilities** then add back only what you need:

```yaml
# Kubernetes
securityContext:
  capabilities:
    drop: ["ALL"]
    add: ["NET_BIND_SERVICE"]  # Only if binding to port < 1024
```

**Use a private registry** with access controls instead of relying on public Docker Hub for production images. Configure registry scanning (AWS ECR, Google Artifact Registry, and Harbor all offer built-in scanning).

## Quick Reference: Security Checklist

| Practice | Command / Config |
|---|---|
| Non-root user | `USER 1001` in Dockerfile |
| Minimal base image | `FROM distroless` or `-slim` |
| Multi-stage build | `FROM ... AS builder` / `FROM ... AS production` |
| Read-only filesystem | `read_only: true` / `readOnlyRootFilesystem: true` |
| No new privileges | `--security-opt=no-new-privileges:true` |
| Seccomp profile | `--security-opt seccomp=profile.json` |
| Vulnerability scan | `trivy image --exit-code 1` in CI |
| No secrets in layers | Runtime injection only |
| Drop capabilities | `capabilities.drop: [ALL]` |
| CIS benchmark | Docker Bench for Security |

Security in containers is defense in depth. No single measure is sufficient on its own, but together these practices make your containers significantly harder to exploit and limit the damage if a breach does occur.
