---
title: "Docker Multi-Stage Builds: Reduce Image Size by 90% with Real Examples"
description: "Learn Docker multi-stage builds to dramatically reduce image size. Real examples showing 1.2GB → 23MB reduction for Node.js, Python, and Go applications."
date: "2026-04-02"
author: "DevPlaybook Team"
tags: ["docker", "containers", "devops", "optimization", "build", "ci-cd"]
readingTime: "10 min read"
---

Bloated Docker images are a silent productivity killer. A 1.2GB Node.js image that takes 4 minutes to push in CI, 3 minutes to pull in production, and eats storage budget — all for an app that at runtime needs less than 25MB of actual code. Multi-stage builds solve this problem elegantly, and in 2026 they're a non-negotiable best practice for production containers.

This guide shows you exactly how multi-stage builds work, with three complete real-world examples achieving dramatic size reductions.

---

## The Problem: Why Docker Images Get Bloated

A typical naive Dockerfile for a Node.js app looks something like this:

```dockerfile
# BAD: Single-stage Dockerfile
FROM node:20

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/server.js"]
```

This image includes:
- The full Node.js runtime and npm (800MB+)
- All `devDependencies` (TypeScript compiler, test runners, linters)
- Source files, `.ts` files, test files
- Build toolchain artifacts
- npm cache

The result: **~1.2GB for an app whose runtime only needs ~23MB**.

---

## Multi-Stage Build Fundamentals

Multi-stage builds use multiple `FROM` statements in one Dockerfile. Each `FROM` starts a new build stage with its own filesystem. You can selectively `COPY --from=<stage>` artifacts from earlier stages into the final, lean image.

```dockerfile
# Stage 1: Builder (heavy, temporary)
FROM node:20 AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

# Stage 2: Runner (lean, production)
FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev
CMD ["node", "dist/server.js"]
```

The `builder` stage is used only during the build process and is discarded. The final image only contains what's in the `runner` stage.

---

## Key Concepts

### Stage Naming

```dockerfile
FROM node:20 AS builder    # Named stage
FROM node:20-alpine AS runner
```

Names are arbitrary but should be descriptive. Use `--target` to build a specific stage:

```bash
# Build only the builder stage (useful for debugging)
docker build --target builder -t myapp:debug .

# Build the final production image
docker build -t myapp:prod .
```

### COPY --from

```dockerfile
# Copy from a named stage
COPY --from=builder /app/dist ./dist

# Copy from an external image (useful for binaries)
COPY --from=alpine:3.19 /bin/sh /bin/sh

# Copy from a stage by index (0-based)
COPY --from=0 /app/dist ./dist
```

### Build Arguments Across Stages

```dockerfile
ARG NODE_VERSION=20
FROM node:${NODE_VERSION} AS builder

# ARG needs to be redeclared in each stage
ARG NODE_VERSION=20
FROM node:${NODE_VERSION}-alpine AS runner
```

---

## Example 1: Node.js App — 1.2GB to 23MB

A production Next.js or Express application with TypeScript:

```dockerfile
# ---- Dependencies Stage ----
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

# ---- Builder Stage ----
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN npm run build

# Prune devDependencies
RUN npm prune --omit=dev

# ---- Runner Stage (Final) ----
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Non-root user for security
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nodeuser

# Copy only production artifacts
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodeuser
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

**Size comparison:**

| Stage | Base Image | Result Size |
|---|---|---|
| Naive single-stage | `node:20` | ~1.2GB |
| Multi-stage (alpine) | `node:20-alpine` | ~180MB |
| Multi-stage + distroless | `gcr.io/distroless/nodejs20` | ~23MB |

For the distroless variant:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build && npm prune --omit=dev

FROM gcr.io/distroless/nodejs20-debian12 AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["dist/server.js"]
```

---

## Example 2: Python FastAPI — 2.1GB to 180MB

FastAPI apps with ML libraries can balloon to multiple gigabytes. Multi-stage builds combined with slim/alpine base images cut this dramatically.

```dockerfile
# ---- Builder Stage ----
FROM python:3.12 AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
 && rm -rf /var/lib/apt/lists/*

# Install Python dependencies into a virtual environment
COPY requirements.txt .
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r requirements.txt

# ---- Runtime Stage (Final) ----
FROM python:3.12-slim AS runner

WORKDIR /app

# Install only runtime system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
 && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY app/ ./app/

# Non-root user
RUN useradd --create-home appuser
USER appuser

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Why this works:**
- `python:3.12` (full) has compilers, headers, and build tools (~1.1GB)
- `python:3.12-slim` has only the Python runtime (~130MB)
- The virtual environment in `/opt/venv` is portable — all compiled `.so` files are included, but build tools are left behind

**Size comparison:**

| Approach | Image Size |
|---|---|
| Single-stage (python:3.12) | ~2.1GB |
| Single-stage (python:3.12-slim) | ~780MB |
| Multi-stage (builder + slim runtime) | ~180MB |

For further reduction, consider replacing `python:3.12-slim` with `python:3.12-alpine`:

```dockerfile
FROM python:3.12-alpine AS runner
# Note: Alpine uses musl libc. Some C extensions need recompilation.
# Test thoroughly before using in production.
```

---

## Example 3: Go Binary — 1.1GB to 8MB

Go is uniquely suited for Docker multi-stage builds because Go compiles to a single static binary. The production image can be completely empty (scratch) or minimal (distroless/static).

```dockerfile
# ---- Builder Stage ----
FROM golang:1.23-alpine AS builder

WORKDIR /build

# Cache dependencies separately from source
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .

# Build a fully static binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="-w -s -extldflags=-static" \
    -trimpath \
    -o server \
    ./cmd/server

# ---- Final Stage: Scratch (empty OS) ----
FROM scratch AS runner

# Copy CA certificates for HTTPS
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy the binary
COPY --from=builder /build/server /server

EXPOSE 8080
ENTRYPOINT ["/server"]
```

**Build flags explained:**
- `CGO_ENABLED=0` — disable C bindings, enables pure-Go static binary
- `-ldflags="-w -s"` — strip debug symbols and DWARF tables
- `-extldflags=-static` — static link C libraries (if any)
- `-trimpath` — remove local file paths from the binary (security + size)

**Size comparison:**

| Approach | Image Size |
|---|---|
| Single-stage (golang:1.23) | ~1.1GB |
| Single-stage (golang:1.23-alpine) | ~380MB |
| Multi-stage → scratch | ~8MB |
| Multi-stage → distroless/static | ~12MB |

For applications that need a shell (debugging, entrypoint scripts), use `gcr.io/distroless/static-debian12` instead of `scratch`.

---

## Advanced Technique: Cache Mount for Faster Builds

Docker BuildKit's `--mount=type=cache` speeds up repeated builds in CI without polluting the image:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./

# Mount npm cache across builds (never enters the image)
RUN --mount=type=cache,target=/root/.npm \
    npm ci

COPY . .
RUN npm run build
```

```yaml
# In GitHub Actions, enable BuildKit
- name: Build Docker image
  env:
    DOCKER_BUILDKIT: 1
  run: docker build -t myapp .
```

---

## .dockerignore is Critical

A forgotten `.dockerignore` bloats your build context, slowing down builds even with multi-stage:

```dockerignore
# .dockerignore
node_modules/
.git/
.github/
*.log
.env
.env.*
dist/
coverage/
.nyc_output/
*.md
!README.md
__pycache__/
*.pyc
.pytest_cache/
.DS_Store
Thumbs.db
```

A well-written `.dockerignore` can reduce build context from 500MB to under 5MB for a typical Node.js project.

---

## Distroless Base Images

Google's distroless images contain only the application runtime — no shell, no package manager, no OS utilities. This minimizes the attack surface:

| Language | Distroless Image | Size |
|---|---|---|
| Node.js | `gcr.io/distroless/nodejs20-debian12` | ~90MB |
| Python | `gcr.io/distroless/python3-debian12` | ~52MB |
| Java | `gcr.io/distroless/java21-debian12` | ~220MB |
| Static binary | `gcr.io/distroless/static-debian12` | ~2MB |
| Any (with glibc) | `gcr.io/distroless/base-debian12` | ~20MB |

Tradeoff: without a shell, debugging in production requires `kubectl exec` with a debug sidecar or ephemeral debug containers (`kubectl debug`).

---

## Image Size Comparison Summary

| Application | Naive | Multi-Stage Alpine | Multi-Stage Distroless/Scratch |
|---|---|---|---|
| Node.js (Express) | 1.2GB | 180MB | 23MB |
| Python (FastAPI) | 2.1GB | 180MB | ~120MB |
| Go (API server) | 1.1GB | 380MB | 8MB |

---

## CI/CD Integration Tips

```yaml
# GitHub Actions: build with BuildKit, cache layers
- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build and push
  uses: docker/build-push-action@v5
  with:
    context: .
    push: true
    tags: myapp:latest
    cache-from: type=gha
    cache-to: type=gha,mode=max
    target: runner    # Only build the final stage
```

---

## Conclusion

Multi-stage builds are the single most impactful optimization you can make to your Docker workflow. The investment is low — it's the same Dockerfile, just with multiple `FROM` statements — and the returns are massive: smaller images, faster CI, cheaper storage, better security posture.

Start with any of the three templates above and adapt them to your stack. Your CI pipeline and on-call engineer will thank you.
