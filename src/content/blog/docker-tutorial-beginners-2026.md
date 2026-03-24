---
title: "Docker Tutorial for Beginners 2026: From Zero to Running Containers"
description: "Learn Docker from scratch in 2026. This step-by-step tutorial covers installation, images, containers, volumes, Docker Compose, and real-world examples for developers."
date: "2026-03-25"
author: "DevPlaybook Team"
tags: ["docker", "containers", "devops", "tutorial", "beginners", "docker-compose", "2026"]
readingTime: "16 min read"
---

Docker has become a non-negotiable skill for developers. Whether you're deploying web apps, running databases locally, or setting up a consistent development environment across a team, Docker solves the "works on my machine" problem permanently.

This tutorial starts from the very beginning and takes you to the point where you're running multi-container applications with Docker Compose. No Docker experience required. Just a terminal and some patience.

---

## What Is Docker and Why Does It Matter?

Docker is a platform for packaging applications into **containers** — isolated, lightweight environments that include everything the application needs to run: code, runtime, libraries, and configuration.

Contrast this with a traditional virtual machine (VM). A VM emulates an entire operating system — CPU, memory, disk, all virtualized. A Docker container shares the host OS kernel and only packages what the application needs. The result: containers start in seconds, use far less memory, and are easy to move between environments.

**The practical benefit for developers:**

- Eliminate "it works on my machine" by packaging the exact environment
- Run PostgreSQL, Redis, or any service locally without installing it natively
- Share a development environment with your team via a single file
- Deploy the same container to staging and production

---

## Installation: Getting Docker Running

### macOS and Windows

Download [Docker Desktop](https://www.docker.com/products/docker-desktop/) — the official GUI application that includes the Docker daemon, CLI, and Docker Compose.

- **macOS**: Requires macOS 12 (Monterey) or later. Apple Silicon (M1/M2/M3) fully supported.
- **Windows**: Requires Windows 10/11 Pro or Home (WSL 2 backend). Enable WSL 2 first: `wsl --install`

After installing, verify it's running:

```bash
docker --version
# Docker version 27.x.x
docker compose version
# Docker Compose version v2.x.x
```

### Linux (Ubuntu/Debian)

```bash
# Remove old versions
sudo apt remove docker docker-engine docker.io containerd runc

# Install using the convenience script
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (avoid needing sudo)
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker run hello-world
```

### Windows with WSL 2 (Recommended for Developers)

If you're on Windows, using Docker inside WSL 2 (Ubuntu) gives you a better developer experience than Docker Desktop's Windows mode:

1. Install WSL 2: `wsl --install`
2. Install Ubuntu from the Microsoft Store
3. Inside Ubuntu, follow the Linux installation steps above

---

## Core Concepts: The Mental Model

Before running commands, understand these four things:

**Image**: A read-only blueprint for a container. Like a class in programming — it defines the environment.

**Container**: A running instance of an image. Like an object instantiated from a class. You can run many containers from one image.

**Registry**: A storage service for images. Docker Hub (`hub.docker.com`) is the public registry. You can push and pull images from registries.

**Dockerfile**: A text file with instructions to build a custom image. The recipe.

The workflow is:
1. Write a `Dockerfile`
2. Build it into an `image`
3. Run the image as a `container`

---

## Your First Container

Let's start immediately:

```bash
docker run hello-world
```

Docker pulls the `hello-world` image from Docker Hub and runs it. You'll see a success message and the container exits.

Now run something interactive:

```bash
docker run -it ubuntu bash
```

Flags explained:
- `-i`: Interactive (keep STDIN open)
- `-t`: Allocate a pseudo-TTY (terminal)

You're now inside an Ubuntu container. Try `ls`, `apt update`, `cat /etc/os-release`. Type `exit` to leave. The container stops.

Run a web server in the background:

```bash
docker run -d -p 8080:80 nginx
```

Flags:
- `-d`: Detached mode (runs in background)
- `-p 8080:80`: Map port 8080 on your machine to port 80 inside the container

Open `http://localhost:8080` in your browser — the Nginx welcome page.

---

## Essential Docker Commands

```bash
# List running containers
docker ps

# List all containers (including stopped)
docker ps -a

# Stop a container
docker stop <container-id-or-name>

# Remove a container
docker rm <container-id-or-name>

# List downloaded images
docker images

# Remove an image
docker rmi <image-name>

# Pull an image without running it
docker pull postgres:16

# View container logs
docker logs <container-id>

# Follow logs in real time
docker logs -f <container-id>

# Execute a command inside a running container
docker exec -it <container-id> bash

# Inspect container details (IP, volumes, env vars)
docker inspect <container-id>
```

**Shortcut for container IDs**: You only need enough characters to be unique. `docker stop a3f` works if `a3f` is unique among your containers.

---

## Building Your First Docker Image

Create a simple Node.js app. Start with a new directory:

```bash
mkdir my-docker-app && cd my-docker-app
```

Create `app.js`:

```javascript
const http = require('http');

const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello from Docker!\n');
});

server.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

Create `package.json`:

```json
{
  "name": "my-docker-app",
  "version": "1.0.0",
  "main": "app.js",
  "scripts": {
    "start": "node app.js"
  }
}
```

Create the `Dockerfile`:

```dockerfile
# Base image
FROM node:20-alpine

# Set working directory inside the container
WORKDIR /app

# Copy dependency files first (for better caching)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Expose the port the app listens on
EXPOSE 3000

# Command to run the app
CMD ["node", "app.js"]
```

Build the image:

```bash
docker build -t my-docker-app:latest .
```

- `-t my-docker-app:latest`: Tag the image with name and version
- `.`: Build context is the current directory

Run it:

```bash
docker run -d -p 3000:3000 my-docker-app:latest
```

Visit `http://localhost:3000` — "Hello from Docker!"

---

## Dockerfile Best Practices

A well-written Dockerfile is crucial for fast builds and small images.

### Layer Caching

Each instruction in a Dockerfile creates a layer. Docker caches layers. Copy files that change infrequently before files that change often:

```dockerfile
# Good: dependencies rarely change, so this layer is cached
COPY package*.json ./
RUN npm install

# Changing app.js only invalidates from here onward
COPY . .
```

If you put `COPY . .` before `npm install`, every code change invalidates the install layer.

### Use Alpine Images

Alpine Linux is a minimal distribution (~5MB vs ~100MB for Debian). Use `-alpine` variants:

```dockerfile
FROM node:20-alpine     # 140MB
# vs
FROM node:20            # 1GB+
```

### Multi-Stage Builds

For compiled languages (Go, Rust, TypeScript), use multi-stage builds to keep final images small:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/index.js"]
```

The final image contains only the built output and production dependencies — not the TypeScript compiler or dev tools.

### .dockerignore

Create `.dockerignore` to prevent unnecessary files from being included in the build context:

```
node_modules
.git
.gitignore
*.log
.env
dist
coverage
README.md
```

---

## Volumes: Persistent Data

Containers are ephemeral — when they stop, their filesystem changes are lost. Volumes solve this.

### Named Volume

```bash
# Create a named volume
docker volume create postgres-data

# Mount it when running a container
docker run -d \
  -e POSTGRES_PASSWORD=mypassword \
  -e POSTGRES_DB=myapp \
  -v postgres-data:/var/lib/postgresql/data \
  -p 5432:5432 \
  postgres:16
```

Data in `/var/lib/postgresql/data` inside the container is persisted in the `postgres-data` volume. Stop and restart the container — your data is still there.

### Bind Mount (Development)

Bind mounts map a directory from your host machine into the container. Use this during development to see code changes without rebuilding:

```bash
docker run -d \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v /app/node_modules \
  my-docker-app:latest
```

The `-v $(pwd):/app` maps your current directory into `/app`. The second `-v /app/node_modules` prevents the bind mount from overwriting the container's node_modules.

**Important:** Bind mounts are for development only. Production deployments should use named volumes or bake files into the image.

---

## Environment Variables

Never hardcode secrets in images. Pass configuration via environment variables:

```bash
# Inline
docker run -d \
  -e DATABASE_URL=postgres://user:pass@localhost/mydb \
  -e APP_ENV=production \
  my-app:latest

# From a file (.env)
docker run -d --env-file .env my-app:latest
```

`.env` file:
```
DATABASE_URL=postgres://user:pass@localhost/mydb
APP_ENV=production
SECRET_KEY=your-secret-key
```

In your application code, read from `process.env.DATABASE_URL` (Node) or `os.environ["DATABASE_URL"]` (Python).

**Never commit `.env` files to git.** Add `.env` to `.gitignore`.

---

## Docker Compose: Multi-Container Applications

Real applications have multiple services: a web server, a database, a cache. Docker Compose lets you define and run them together with a single file.

### Installing Docker Compose

On modern installations, Compose is included as `docker compose` (v2). On older systems, it's a separate binary `docker-compose` (v1). Use v2 — it's faster and the syntax is the same.

### Example: Node.js + PostgreSQL + Redis

Create `docker-compose.yml`:

```yaml
version: "3.9"

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://myuser:mypassword@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      db:
        condition: service_healthy
      cache:
        condition: service_started
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: myuser
      POSTGRES_PASSWORD: mypassword
      POSTGRES_DB: myapp
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U myuser -d myapp"]
      interval: 10s
      timeout: 5s
      retries: 5

  cache:
    image: redis:7-alpine
    volumes:
      - redis-data:/data

volumes:
  postgres-data:
  redis-data:
```

Run everything:

```bash
# Start all services in the background
docker compose up -d

# View logs for all services
docker compose logs -f

# View logs for a specific service
docker compose logs -f app

# Stop all services
docker compose down

# Stop and remove volumes (database data)
docker compose down -v
```

Notice `db:5432` in the `DATABASE_URL`. Docker Compose creates an internal network — containers communicate using service names as hostnames. `db` resolves to the PostgreSQL container's internal IP automatically.

### Compose for Development vs Production

Use separate Compose files for different environments:

```bash
# Development (includes bind mounts, debug tools)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up
```

`docker-compose.dev.yml` overrides the base with development-specific settings:

```yaml
services:
  app:
    volumes:
      - .:/app
    environment:
      - NODE_ENV=development
    command: npm run dev
```

---

## Networking: How Containers Communicate

Docker creates networks so containers can talk to each other.

```bash
# List networks
docker network ls

# Create a custom network
docker network create my-network

# Run containers on the same network
docker run -d --network my-network --name db postgres:16
docker run -d --network my-network --name app my-app:latest
```

Containers on the same network can reach each other by container name. `app` container can connect to `db` at `postgres://db:5432`.

Docker Compose automatically creates a network for your project — that's why service names work as hostnames.

---

## Common Patterns and Recipes

### Run a Local Database (No Installation Needed)

```bash
# PostgreSQL
docker run -d \
  --name local-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_USER=dev \
  -e POSTGRES_DB=myapp \
  -p 5432:5432 \
  postgres:16-alpine

# MySQL
docker run -d \
  --name local-mysql \
  -e MYSQL_ROOT_PASSWORD=password \
  -e MYSQL_DATABASE=myapp \
  -p 3306:3306 \
  mysql:8.0

# MongoDB
docker run -d \
  --name local-mongo \
  -p 27017:27017 \
  mongo:7

# Redis
docker run -d \
  --name local-redis \
  -p 6379:6379 \
  redis:7-alpine
```

### Access a Running Container's Shell

```bash
docker exec -it <container-name> sh    # Alpine (no bash)
docker exec -it <container-name> bash  # Debian/Ubuntu
```

### Copy Files To/From a Container

```bash
# Copy from container to host
docker cp mycontainer:/app/logs/error.log ./error.log

# Copy from host to container
docker cp ./config.json mycontainer:/app/config.json
```

### Clean Up Everything

```bash
# Remove stopped containers
docker container prune

# Remove unused images
docker image prune

# Remove unused volumes
docker volume prune

# Remove everything unused (containers, images, volumes, networks)
docker system prune -a --volumes
```

---

## Troubleshooting Common Issues

**Container exits immediately:**
```bash
docker logs <container-id>  # Check what happened
```
Usually a missing environment variable, a missing file, or an application crash.

**Port already in use:**
```bash
# Find what's using port 5432
lsof -i :5432  # macOS/Linux
netstat -ano | findstr :5432  # Windows

# Or just use a different host port
docker run -p 5433:5432 postgres:16
```

**"Permission denied" on volumes:**
Linux volume permissions can cause issues. The container runs as a specific user that may not own the mounted files. Fix by setting `user` in docker-compose.yml or using `chmod`:
```bash
# Make the volume directory writable
chmod 777 ./data
```

**Container can't reach the internet:**
Check if the Docker daemon is running. On Linux, restart it: `sudo systemctl restart docker`

---

## Next Steps

You now understand the Docker fundamentals used in 90% of real workflows. Where to go next:

- **Docker Hub**: Explore official images at `hub.docker.com/search?q=&image_filter=official`
- **Docker Scout**: Security scanning for your images (`docker scout cves my-image`)
- **Kubernetes**: The next step after Docker for production orchestration at scale
- **Dev Containers**: VS Code's Docker integration for fully containerized development environments

---

For more development tools and guides, visit **[devplaybook.cc](https://devplaybook.cc)** — we cover Docker, CI/CD, APIs, and the full modern developer toolchain.
