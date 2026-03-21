---
title: "Docker Complete Guide for Beginners: Containerize Your App in 2024"
description: "Complete Docker beginner guide: understand containers vs VMs, install Docker, write Dockerfiles, use Docker Compose for multi-container apps. With hands-on examples."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["docker", "containers", "dockerfile", "docker-compose", "devops", "beginners-guide", "2024"]
readingTime: "14 min read"
---

"Works on my machine" is one of the most frustrating phrases in software development. Docker exists to eliminate it. By packaging your application and all its dependencies into a container, Docker ensures that if it runs on your laptop, it runs in CI, on your teammate's machine, and in production — identically.

This guide walks you through everything you need to go from zero Docker knowledge to running a multi-service application with Docker Compose. We'll containerize a real Node.js application and wire it up with a PostgreSQL database and Redis cache.

## TL;DR

- Docker packages apps into containers — isolated, portable, reproducible environments
- Containers share the host OS kernel (unlike VMs), making them fast and lightweight
- `Dockerfile` defines how to build an image; `docker-compose.yml` orchestrates multiple containers
- Core workflow: write Dockerfile → `docker build` → `docker run`
- Docker Compose is the right tool for local development with multiple services (app + DB + cache)

---

## What Is Docker and Why Does It Exist?

Before Docker, deploying software meant:
1. Setting up a server with the right OS version
2. Installing the right runtime version (Node 18.x, Python 3.11, etc.)
3. Installing system dependencies
4. Configuring environment variables
5. Hoping the server's Python version doesn't conflict with another app's Python version
6. Documenting all of this in a README that immediately goes stale

Docker replaces all of that with a single `Dockerfile`. The file describes exactly what the environment looks like. Anyone with Docker installed can build and run it. The environment is reproducible across every machine.

---

## Containers vs Virtual Machines

The fundamental question: how is Docker different from running a VM?

**Virtual Machines** run a full operating system on top of a hypervisor. Each VM has its own kernel, its own OS, its own memory allocation. A VM running Ubuntu on a macOS host is genuinely running the Ubuntu kernel, isolated from macOS entirely. VMs are heavy — a typical VM might use 1–4 GB of RAM just for the OS.

**Containers** share the host OS kernel. They are isolated at the process level using Linux namespaces and cgroups. A container running on Ubuntu shares the Ubuntu kernel with the host. The container has its own filesystem, network, and process space, but there's no second OS to boot. Containers start in milliseconds and use megabytes, not gigabytes.

| | Containers | VMs |
|---|---|---|
| Startup time | Milliseconds | Seconds to minutes |
| Memory overhead | MBs | GBs |
| Isolation | Process-level | Full OS |
| Portability | High | Lower |
| Security boundary | Weaker | Stronger |

For most application development and deployment scenarios, containers are the right tool. VMs are still appropriate when you need strong security isolation or need to run a different kernel than the host.

---

## Installing Docker

**macOS and Windows**: Install Docker Desktop from [docker.com](https://www.docker.com/products/docker-desktop). It includes the Docker daemon, CLI, and Docker Compose.

**Linux (Ubuntu/Debian)**:
```bash
# Remove old versions
sudo apt-get remove docker docker-engine docker.io containerd runc

# Install using the official script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (no sudo needed)
sudo usermod -aG docker $USER
newgrp docker

# Verify installation
docker --version
docker compose version
```

---

## Core Concepts

Before writing your first Dockerfile, understand these four terms:

**Image**: A read-only template containing the application code, runtime, libraries, and configuration. Think of it like a class in object-oriented programming — a blueprint.

**Container**: A running instance of an image. Like an object instantiated from a class. You can run many containers from the same image.

**Registry**: A storage and distribution system for images. Docker Hub is the public registry. AWS ECR, Google Artifact Registry, and GitHub Container Registry are popular private options.

**Dockerfile**: A text file with instructions for building an image. Each instruction creates a layer in the image.

The relationship:
```
Dockerfile → (docker build) → Image → (docker run) → Container
```

---

## Essential Docker CLI Commands

Get comfortable with these before writing your first Dockerfile:

```bash
# Images
docker images                           # list local images
docker pull node:20-alpine              # download an image from Docker Hub
docker rmi node:20-alpine               # remove a local image
docker build -t myapp:1.0 .             # build image from Dockerfile in current dir

# Containers
docker run node:20-alpine               # create and start a container
docker run -d -p 3000:3000 myapp:1.0   # detached mode, map port 3000
docker run -it node:20-alpine sh        # interactive shell inside container
docker ps                               # list running containers
docker ps -a                            # list all containers (including stopped)
docker stop <container_id>              # gracefully stop a container
docker rm <container_id>                # remove a stopped container
docker logs <container_id>              # view container stdout/stderr
docker exec -it <container_id> sh       # open shell in running container

# Cleanup
docker system prune                     # remove all stopped containers, unused images
docker volume prune                     # remove unused volumes
```

---

## Writing Your First Dockerfile

Let's containerize a simple Node.js Express application. Start with this app structure:

```
myapp/
├── src/
│   └── index.js
├── package.json
├── package-lock.json
└── Dockerfile
```

`src/index.js`:
```javascript
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/users', (req, res) => {
  res.json({ users: [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }] });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

`Dockerfile`:
```dockerfile
# Stage 1: Base image
# Use an official Node.js image. Alpine is smaller (~5MB vs ~300MB).
FROM node:20-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy dependency manifests first (Docker layer caching optimization)
# If package.json hasn't changed, Docker reuses the cached layer
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy the rest of the application source
COPY src/ ./src/

# Expose the port the app listens on (documentation only — doesn't actually publish)
EXPOSE 3000

# Run as non-root user for security
USER node

# The command to run when the container starts
CMD ["node", "src/index.js"]
```

Build and run it:

```bash
# Build the image, tag it as myapp:latest
docker build -t myapp:latest .

# Run it, mapping host port 3000 to container port 3000
docker run -d -p 3000:3000 --name myapp myapp:latest

# Test it
curl http://localhost:3000/health
# → {"status":"ok","timestamp":"2024-01-15T12:00:00.000Z"}

# Check the logs
docker logs myapp
```

### Understanding Layer Caching

Docker builds images layer by layer. Each instruction in the Dockerfile creates a layer. Crucially, Docker caches layers and only rebuilds from the first changed layer onward.

This is why we copy `package*.json` and run `npm install` *before* copying source code:

```dockerfile
# GOOD — npm install only re-runs when package.json changes
COPY package*.json ./
RUN npm ci --only=production
COPY src/ ./src/          # This layer changes on every code edit

# BAD — npm install re-runs on every code change
COPY . .
RUN npm ci --only=production
```

With the good order, iterating on your source code reuses the cached `npm install` layer — rebuilds take seconds instead of minutes.

---

## .dockerignore

Just like `.gitignore`, `.dockerignore` prevents files from being included in the build context sent to the Docker daemon:

```dockerignore
# Dependencies (will be installed inside the container)
node_modules/
npm-debug.log

# Git
.git/
.gitignore

# Documentation
README.md
docs/

# Tests
__tests__/
coverage/

# Environment files (should be injected at runtime, not baked in)
.env
.env.local

# OS artifacts
.DS_Store
Thumbs.db

# Editor
.vscode/
.idea/
```

A good `.dockerignore` dramatically speeds up builds by reducing the build context size. Without it, your `node_modules/` (often 200–500 MB) gets sent to the daemon on every build.

---

## Multi-Stage Builds

For applications that have a build step (TypeScript compilation, webpack bundling), use multi-stage builds to keep the final image small:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build          # compiles TypeScript → dist/

# Stage 2: Production image
FROM node:20-alpine AS production
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist    # only copy compiled output
USER node
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

The final image contains only the production dependencies and compiled output — no TypeScript compiler, no test libraries, no source files.

---

## Docker Compose for Multi-Service Apps

Real applications rarely run as a single container. You need your app, a database, a cache, maybe a message queue. Docker Compose orchestrates multiple containers together.

Create `docker-compose.yml` at the project root:

```yaml
version: '3.9'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://postgres:secret@postgres:5432/myapp
      - REDIS_URL=redis://redis:6379
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    volumes:
      - ./src:/app/src    # mount source for hot reload in development
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: myapp
    ports:
      - "5432:5432"       # expose for local DB clients (TablePlus, pgAdmin)
    volumes:
      - postgres_data:/var/lib/postgresql/data    # persist data between restarts
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes    # enable persistence

volumes:
  postgres_data:
  redis_data:
```

Essential Docker Compose commands:

```bash
docker compose up -d            # start all services in background
docker compose down             # stop and remove containers
docker compose down -v          # also remove named volumes (wipes data)
docker compose logs -f app      # follow logs for the app service
docker compose exec app sh      # open shell in the running app container
docker compose ps               # status of all services
docker compose build            # rebuild images
docker compose restart app      # restart just the app service
```

### Understanding Networking in Compose

Compose automatically creates a network for all services in the file. Services communicate using their service name as the hostname:

```javascript
// From inside the app container, connect to postgres using the service name
const pool = new Pool({
  connectionString: process.env.DATABASE_URL
  // DATABASE_URL = postgresql://postgres:secret@postgres:5432/myapp
  //                                                        ^^^^^^^^
  //                                      This resolves to the postgres container
});
```

This is why you never use `localhost` inside Docker Compose — `localhost` refers to the container itself, not other services.

---

## Volumes: Persisting Data

Containers are ephemeral. When you remove a container, all data inside it is gone. Volumes solve this.

**Named volumes** (managed by Docker — recommended for databases):
```yaml
volumes:
  postgres_data:/var/lib/postgresql/data
```

**Bind mounts** (map a host directory into the container — useful for development hot reload):
```yaml
volumes:
  - ./src:/app/src
```

Inspect and manage volumes:
```bash
docker volume ls
docker volume inspect postgres_data
docker volume rm postgres_data
```

---

## Pushing to Docker Hub

To share your image or deploy it to a server:

```bash
# Log in to Docker Hub
docker login

# Tag your image with your Docker Hub username
docker tag myapp:latest yourusername/myapp:1.0.0
docker tag myapp:latest yourusername/myapp:latest

# Push
docker push yourusername/myapp:1.0.0
docker push yourusername/myapp:latest

# On another machine or server
docker pull yourusername/myapp:latest
docker run -d -p 3000:3000 yourusername/myapp:latest
```

---

## Common Gotchas

**Container exits immediately**: The CMD or ENTRYPOINT process exited. Check `docker logs <container>`. Common cause: the app crashed on startup (missing environment variable, wrong database URL).

**Port already in use**: Another process is using the host port. Change the host port: `-p 3001:3000`.

**Can't connect to the database**: From inside a container, use the service name (`postgres`), not `localhost`. Outside the container, use `localhost` and the exposed host port.

**Changes to source code not reflected**: If you're not using a bind mount, you need to rebuild the image. Use a bind mount in development for hot reload.

**Image size is huge**: Use Alpine-based images (`node:20-alpine` instead of `node:20`). Use multi-stage builds. Add a thorough `.dockerignore`.

**Permission errors**: Files created in the container might be owned by root. Use `USER node` in the Dockerfile and `chown` the working directory if needed:

```dockerfile
RUN mkdir -p /app && chown -R node:node /app
USER node
WORKDIR /app
```

---

## Next Steps

Once you're comfortable with single-app Docker Compose setups, the natural progression is:

- **Docker Compose overrides**: Use `docker-compose.override.yml` for dev-specific settings (volumes, debug ports) without changing the base file
- **Environment-specific configs**: `.env` files with Compose, multiple Compose files for different environments
- **Health checks and restarts**: `healthcheck` ensures dependent services are ready before your app starts
- **Kubernetes**: For production at scale, K8s orchestrates containers across multiple machines

Docker is the foundation of modern backend deployment. Learning it well pays dividends every time you need to ship, reproduce a bug, or onboard a new team member. The ability to hand someone a `docker-compose.yml` and have them running your full stack in three minutes is genuinely transformative.
