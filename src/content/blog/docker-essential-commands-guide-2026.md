---
title: "Docker for Developers: Essential Commands Guide (2026)"
description: "Docker essential commands guide 2026: containers, images, volumes, networking, Docker Compose, and real-world workflows with copy-paste examples."
date: "2026-03-24"
author: "DevPlaybook Team"
tags: ["docker", "containers", "devops", "command-line", "developer-tools", "cheatsheet"]
readingTime: "14 min read"
---

Docker changed how software gets built, shipped, and run. A container that works on your laptop runs identically in production — no more "it works on my machine." But the command-line interface can feel overwhelming at first. There are hundreds of flags across dozens of subcommands.

This guide cuts through the noise. These are the Docker commands you will actually use, organized the way you will reach for them, with real examples you can copy directly.

> Want to generate Docker Compose configs automatically? Try our [Docker Compose Generator](/tools/docker-compose-generator).

---

## Core Concepts in 60 Seconds

- **Image** — a read-only snapshot of a filesystem and config (like a class)
- **Container** — a running instance of an image (like an object)
- **Volume** — persistent storage that survives container restarts
- **Network** — isolated communication layer between containers
- **Registry** — where images are stored (Docker Hub, ECR, GHCR)

---

## Working with Images

```bash
# Pull an image from Docker Hub
docker pull node:20-alpine

# List local images
docker images

# Search Docker Hub
docker search nginx

# Build an image from a Dockerfile
docker build -t my-app:1.0 .

# Build with a specific Dockerfile
docker build -f Dockerfile.prod -t my-app:prod .

# Tag an image
docker tag my-app:1.0 username/my-app:latest

# Push to Docker Hub
docker push username/my-app:latest

# Remove an image
docker rmi my-app:1.0

# Remove all dangling images
docker image prune

# Remove all unused images
docker image prune -a

# Inspect image layers
docker history my-app:1.0
```

---

## Running Containers

```bash
# Run a container (and remove when stopped)
docker run --rm nginx

# Run in detached mode (background)
docker run -d --name my-nginx nginx

# Run with port mapping (host:container)
docker run -d -p 8080:80 nginx

# Run with environment variables
docker run -d -e NODE_ENV=production -e PORT=3000 my-app

# Run with a volume mount
docker run -d -v /host/data:/container/data nginx

# Run an interactive shell
docker run -it ubuntu bash

# Run a command in a new container
docker run --rm alpine echo "hello world"

# Run with memory and CPU limits
docker run -d --memory="256m" --cpus="0.5" my-app
```

### Common `docker run` Flags

| Flag | Meaning |
|---|---|
| `-d` | Detached (background) |
| `-p 8080:80` | Port mapping |
| `-v ./data:/data` | Volume mount |
| `-e VAR=value` | Environment variable |
| `--name my-app` | Container name |
| `--rm` | Remove when stopped |
| `--network my-net` | Attach to network |
| `-it` | Interactive terminal |
| `--restart=always` | Auto-restart policy |

---

## Managing Running Containers

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container gracefully
docker stop my-nginx

# Kill immediately
docker kill my-nginx

# Start a stopped container
docker start my-nginx

# Restart a container
docker restart my-nginx

# Remove a stopped container
docker rm my-nginx

# Remove and stop in one step
docker rm -f my-nginx

# Remove all stopped containers
docker container prune

# View container logs
docker logs my-nginx

# Follow live logs
docker logs -f my-nginx

# Last 50 lines of logs
docker logs --tail=50 my-nginx

# Execute a command in a running container
docker exec -it my-nginx bash

# Copy files to/from container
docker cp ./config.json my-nginx:/app/config.json
docker cp my-nginx:/app/logs ./local-logs
```

---

## Inspecting Containers

```bash
# View detailed info (JSON)
docker inspect my-nginx

# Get just the IP address
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' my-nginx

# View resource usage (live)
docker stats

# View resource usage (once)
docker stats --no-stream

# View running processes inside container
docker top my-nginx

# View port mappings
docker port my-nginx
```

---

## Writing an Efficient Dockerfile

```dockerfile
# Base image (use specific tags, never `latest` in production)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy dependency files first (cache optimization)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/health || exit 1

# Start command
CMD ["node", "server.js"]
```

### Dockerfile Best Practices

1. **Order layers by change frequency** — put rarely-changing steps (OS deps, base installs) first
2. **Combine RUN commands** to reduce layers: `RUN apt-get update && apt-get install -y curl vim`
3. **Use `.dockerignore`** to exclude `node_modules`, `.git`, `.env`
4. **Never store secrets** in Dockerfiles or image layers
5. **Use multi-stage builds** for compiled languages

### Multi-Stage Build Example

```dockerfile
# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (smaller image)
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/server.js"]
```

This pattern gives you a production image with no build tools — much smaller and more secure.

---

## Volumes (Persistent Storage)

```bash
# Create a named volume
docker volume create my-data

# List volumes
docker volume ls

# Inspect a volume
docker volume inspect my-data

# Mount a volume to a container
docker run -d -v my-data:/var/lib/postgresql/data postgres:15

# Remove a volume
docker volume rm my-data

# Remove all unused volumes
docker volume prune
```

### Volume Types

| Type | Syntax | Use case |
|---|---|---|
| Named volume | `-v my-volume:/data` | Persistent data (DB, uploads) |
| Bind mount | `-v ./local:/container` | Dev hot-reload |
| Anonymous | `-v /data` | Temporary scratch space |

---

## Networking

```bash
# List networks
docker network ls

# Create a custom network
docker network create my-network

# Run container on custom network
docker run -d --network my-network --name api my-app
docker run -d --network my-network --name db postgres:15

# Containers on the same network can reach each other by name:
# From `api`, you can connect to `db:5432`

# Connect a running container to a network
docker network connect my-network existing-container

# Inspect a network
docker network inspect my-network

# Remove a network
docker network rm my-network
```

**Key insight:** Containers on the same custom network can resolve each other by name. No need to expose ports for internal communication.

---

## Docker Compose

Compose is the go-to tool for multi-container apps. Define everything in `docker-compose.yml`:

```yaml
version: "3.9"

services:
  api:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/myapp
      - NODE_ENV=development
    volumes:
      - .:/app
      - /app/node_modules
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

### Docker Compose Commands

```bash
# Start all services
docker compose up

# Start in background
docker compose up -d

# Build images before starting
docker compose up --build

# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# View logs for all services
docker compose logs

# Follow logs for a specific service
docker compose logs -f api

# Scale a service
docker compose up -d --scale api=3

# Run a one-off command
docker compose run --rm api npm run migrate

# View running services
docker compose ps

# Restart a single service
docker compose restart api

# Pull latest images
docker compose pull
```

---

## Cleaning Up

Docker accumulates disk space quickly. Run these regularly:

```bash
# Remove stopped containers, unused networks, dangling images, build cache
docker system prune

# Same but also remove unused volumes
docker system prune --volumes

# Remove everything unused (including stopped containers)
docker system prune -a

# Check disk usage
docker system df
```

---

## Common Real-World Patterns

### Local Development with Hot Reload

```bash
docker run -d \
  --name my-dev \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  -e NODE_ENV=development \
  my-app:dev
```

### Database with Seed Data

```bash
# Start Postgres
docker run -d \
  --name dev-db \
  -e POSTGRES_PASSWORD=password \
  -p 5432:5432 \
  postgres:15

# Run migrations
docker exec -it dev-db psql -U postgres -c "CREATE DATABASE myapp;"
```

### Debug a Broken Container

```bash
# Override entrypoint to start with a shell
docker run --rm -it --entrypoint sh my-app

# Attach to a running container
docker exec -it container-name sh
```

---

## Quick Reference

| Goal | Command |
|---|---|
| Pull image | `docker pull image:tag` |
| Build image | `docker build -t name .` |
| Run container | `docker run -d -p 8080:80 image` |
| List running | `docker ps` |
| Shell into container | `docker exec -it name sh` |
| View logs | `docker logs -f name` |
| Stop container | `docker stop name` |
| Remove container | `docker rm -f name` |
| Start Compose stack | `docker compose up -d` |
| Stop Compose stack | `docker compose down` |
| Clean up everything | `docker system prune -a` |
| Disk usage | `docker system df` |

Docker becomes second nature fast. The hardest part is understanding the mental model — images are blueprints, containers are instances. Once that clicks, the commands follow naturally.
