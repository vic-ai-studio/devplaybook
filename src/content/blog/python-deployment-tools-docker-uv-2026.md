---
title: "Python App Deployment 2026: Docker, uv & Containerization Guide"
description: "Python deployment guide 2026: Docker multi-stage builds with uv, virtual environment in Docker, Gunicorn/Uvicorn for production, healthchecks, environment management, and GitHub Actions CI."
pubDate: "2026-04-02"
author: "DevPlaybook Team"
tags: ["Python", "Docker", "uv", "deployment", "Gunicorn", "Uvicorn", "containerization"]
readingTime: "12 min read"
category: "python"
---

Deploying Python applications reliably is harder than it looks. Virtual environments, C extension compilation, dependency pinning, and production server configuration all have failure modes that bite teams who haven't thought through their deployment strategy. In 2026, Docker with `uv` is the fastest and most reproducible path to production. This guide shows you the full stack from Dockerfile to Kubernetes manifest.

---

## Why Python Deployment Is Complex

Python deployment has three core challenges:

1. **Virtual environment isolation** — your app's dependencies must not conflict with system Python or other apps
2. **Compiled extensions** — packages like `numpy`, `cryptography`, and `psycopg2` include C code that must be compiled for the target architecture and OS
3. **Dependency reproducibility** — "works on my machine" problems from unpinned dependencies

Docker solves all three by creating a consistent, isolated environment that runs identically on any host. Combined with `uv` for fast, reproducible installs, you get the smallest and fastest Python container workflow available.

---

## Docker Multi-Stage Build with uv

Multi-stage builds separate the build environment (with compilers, dev tools) from the runtime environment (minimal, secure). The result: smaller images and a smaller attack surface.

### Full production Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# ============================================================
# Stage 1: Builder — install uv, resolve and install deps
# ============================================================
FROM python:3.12-slim AS builder

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Set uv environment variables for optimal Docker behavior
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0

WORKDIR /app

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies into /app/.venv
# --frozen: don't update lockfile
# --no-dev: skip dev dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

# Copy application code
COPY . .

# Install the project itself
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ============================================================
# Stage 2: Runtime — minimal image with just what's needed
# ============================================================
FROM python:3.12-slim AS runtime

# Security: create non-root user
RUN groupadd --gid 1000 appuser && \
    useradd --uid 1000 --gid appuser --shell /bin/bash --create-home appuser

WORKDIR /app

# Copy only the virtual environment and app code from builder
COPY --from=builder --chown=appuser:appuser /app/.venv /app/.venv
COPY --from=builder --chown=appuser:appuser /app/src /app/src

# Add venv to PATH
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Switch to non-root user
USER appuser

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:8000/health').raise_for_status()" \
    || exit 1

EXPOSE 8000

# Use exec form to properly handle signals
CMD ["gunicorn", "src.main:app", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--workers", "4", \
     "--bind", "0.0.0.0:8000", \
     "--timeout", "30", \
     "--keep-alive", "2", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "100", \
     "--log-level", "info"]
```

Build and test:
```bash
docker build -t myapp:latest .
docker run --rm -p 8000:8000 myapp:latest

# Check image size
docker images myapp
# myapp  latest  abc123def456  2 minutes ago  142MB
```

### Why this Dockerfile is production-ready

- **Layer caching**: dependency files copied before app code — deps only reinstall when `pyproject.toml` or `uv.lock` changes
- **BuildKit cache mount**: uv's cache is preserved between builds via `--mount=type=cache`
- **Multi-stage**: build tools stay in the builder stage, runtime image is minimal
- **Non-root user**: running as `appuser` limits blast radius of container escape
- **Proper signal handling**: `CMD` in exec form means Gunicorn receives SIGTERM correctly
- **Healthcheck**: Docker and Kubernetes can detect unhealthy containers

---

## Gunicorn vs. Uvicorn vs. Hypercorn

For production, you need a production-grade WSGI/ASGI server. Here's how the options compare:

| Server | Protocol | Best For | Workers |
|---|---|---|---|
| **Gunicorn** | WSGI only | Django, Flask | Multi-process |
| **Uvicorn** | ASGI | FastAPI, Litestar (dev only) | Single process |
| **Gunicorn + UvicornWorker** | ASGI | FastAPI in production | Multi-process |
| **Hypercorn** | ASGI + HTTP/2 | When HTTP/2 matters | Multi-process |

### The recommended production setup for FastAPI

```bash
# Do NOT use plain uvicorn in production for high-traffic apps
# uvicorn alone is single-process

# Use Gunicorn with UvicornWorker for:
# - Multi-process (utilize all CPU cores)
# - Graceful restarts
# - Worker management
gunicorn main:app \
    --worker-class uvicorn.workers.UvicornWorker \
    --workers 4 \
    --bind 0.0.0.0:8000
```

```python
# gunicorn.conf.py — full config
import multiprocessing

bind = "0.0.0.0:8000"
workers = multiprocessing.cpu_count() * 2 + 1  # Rule of thumb
worker_class = "uvicorn.workers.UvicornWorker"
worker_connections = 1000
timeout = 30
keepalive = 2
max_requests = 1000          # Restart workers periodically (prevents memory leaks)
max_requests_jitter = 100    # Add jitter to avoid thundering herd
preload_app = True           # Load app before forking workers (faster starts)
graceful_timeout = 30        # Time to finish handling requests on SIGTERM
loglevel = "info"
accesslog = "-"              # Log to stdout (Docker/Kubernetes handles rotation)
errorlog = "-"
```

---

## Environment Variables and Secrets

Never hardcode credentials. Use environment variables, validated at startup with pydantic-settings:

```bash
uv add pydantic-settings
```

```python
# src/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import PostgresDsn, RedisDsn, SecretStr

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    # App config
    app_name: str = "MyApp"
    debug: bool = False
    log_level: str = "INFO"

    # Database
    database_url: PostgresDsn
    db_pool_size: int = 10
    db_max_overflow: int = 20

    # Cache
    redis_url: RedisDsn = "redis://localhost:6379/0"

    # Secrets
    secret_key: SecretStr
    api_key: SecretStr

    # Feature flags
    enable_rate_limiting: bool = True
    rate_limit_per_minute: int = 100

settings = Settings()  # Raises ValidationError if required vars are missing
```

```bash
# .env (never commit this)
DATABASE_URL=postgresql+asyncpg://user:pass@db:5432/myapp
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here
DEBUG=false
```

```python
# Use in your app
from src.config import settings

@app.on_event("startup")
async def startup():
    print(f"Starting {settings.app_name}")
    # settings.secret_key.get_secret_value() — only access when needed
```

---

## Docker Compose for Development

```yaml
# docker-compose.yml
version: "3.9"

services:
  app:
    build:
      context: .
      target: builder  # Use builder stage for dev (has all tools)
    command: uv run uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
    volumes:
      - .:/app  # Hot reload
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/myapp
      - SECRET_KEY=dev-secret-key-not-for-production
      - DEBUG=true
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

```bash
docker compose up --build       # Start everything
docker compose run app pytest   # Run tests in container
docker compose down -v          # Stop and remove volumes
```

---

## GitHub Actions CI: Build, Test, Push

```yaml
# .github/workflows/deploy.yml
name: Build and Deploy

on:
  push:
    branches: [main]
  pull_request:

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install uv
        uses: astral-sh/setup-uv@v3

      - name: Set up Python
        run: uv python install 3.12

      - name: Install dependencies
        run: uv sync --all-extras

      - name: Run tests
        run: uv run pytest --cov=src --cov-fail-under=80 -v

  build-push:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    permissions:
      contents: read
      packages: write

    steps:
      - uses: actions/checkout@v4

      - name: Log in to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract Docker metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=sha-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
```

---

## Kubernetes Deployment Manifest

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0  # Zero-downtime deployments
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: ghcr.io/myorg/myapp:latest
          ports:
            - containerPort: 8000
          env:
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: database-url
            - name: SECRET_KEY
              valueFrom:
                secretKeyRef:
                  name: myapp-secrets
                  key: secret-key
          resources:
            requests:
              memory: "256Mi"
              cpu: "250m"
            limits:
              memory: "512Mi"
              cpu: "500m"
          livenessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /health
              port: 8000
            initialDelaySeconds: 5
            periodSeconds: 5
          securityContext:
            runAsNonRoot: true
            runAsUser: 1000
            readOnlyRootFilesystem: true
            allowPrivilegeEscalation: false
---
apiVersion: v1
kind: Service
metadata:
  name: myapp
spec:
  selector:
    app: myapp
  ports:
    - port: 80
      targetPort: 8000
  type: ClusterIP
```

---

## .dockerignore: Keep Images Clean

```dockerignore
# Python
__pycache__/
*.py[cod]
*.pyo
.pytest_cache/
.mypy_cache/
.ruff_cache/
htmlcov/
.coverage

# Virtual environments
.venv/
venv/
env/

# Development
.git/
.github/
.env
.env.*
*.log

# Docker
docker-compose*.yml
Dockerfile*

# Tests
tests/
```

---

## Deployment Checklist

Before shipping to production:

- `uv.lock` is committed (reproducible installs)
- No hardcoded secrets (using environment variables + pydantic-settings)
- Non-root user in Dockerfile
- Healthcheck endpoint implemented (`/health` returns 200 with basic status)
- `CMD` uses exec form (proper signal handling)
- Resource limits set in Kubernetes manifest
- Multi-stage build (minimal runtime image)
- `.dockerignore` excludes `.git`, `.env`, `__pycache__`
- CI runs tests before building image
- Image tagged with git SHA for traceability

The combination of uv (fast, reproducible installs), multi-stage Docker builds (minimal images), and Gunicorn with UvicornWorker (production ASGI) gives you a deployment setup that is fast to build, small to ship, and reliable to run.
