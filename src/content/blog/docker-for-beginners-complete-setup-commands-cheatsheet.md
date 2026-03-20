---
title: "Docker for Beginners: Complete Setup + Essential Commands Cheatsheet"
description: "Learn Docker from scratch: installation on Mac, Linux, and Windows, core concepts explained simply, your first container, Dockerfile best practices, Docker Compose, and 20+ essential commands with examples."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: [docker, containers, devops, beginners, deployment]
readingTime: "12 min read"
---

# Docker for Beginners: Complete Setup + Essential Commands Cheatsheet

If you've heard the phrase "works on my machine" — Docker exists to kill it. It's one of those tools that sounds complicated from the outside but clicks instantly once you run your first container. This guide walks you through everything: what Docker actually is, how to install it, the concepts you need to understand, and a cheatsheet of 20+ commands you'll use every day.

## What Is Docker — and Why Not Just Use a VM?

Docker is a platform for packaging and running applications in **containers**. A container bundles your app with everything it needs to run: the runtime, libraries, config files, and dependencies. You build it once, and it runs identically anywhere Docker is installed — your laptop, a teammate's machine, a CI server, or a cloud VM.

**The key difference from virtual machines:**

| | Virtual Machine | Docker Container |
|---|---|---|
| Includes OS kernel | Yes (full OS) | No (shares host kernel) |
| Startup time | Minutes | Seconds |
| Size | Gigabytes | Megabytes |
| Isolation | Hardware-level | Process-level |
| Performance overhead | High | Near-native |

A VM virtualizes the entire machine, including the operating system kernel. A container shares the host OS kernel but keeps the filesystem, processes, and network isolated. This makes containers dramatically lighter and faster to start.

The practical result: you can run 50 containers on a laptop that would struggle with 5 VMs.

**Why developers use Docker:**
- Eliminate "it works on my machine" environment discrepancies
- Spin up databases, queues, and services without installing them globally
- Ship applications with all dependencies baked in
- Run the exact same environment from development to production

---

## Installation

### Mac

The easiest path is Docker Desktop for Mac:

1. Download from [docker.com/products/docker-desktop](https://docker.com/products/docker-desktop)
2. Open the `.dmg` and drag to Applications
3. Launch Docker Desktop — it installs the CLI and daemon together
4. Verify: `docker --version`

For Apple Silicon (M1/M2/M3), Docker Desktop handles the ARM/x86 architecture difference transparently using Rosetta and QEMU emulation.

**Alternative (no GUI):** Use [OrbStack](https://orbstack.dev) — lighter, faster, and free for personal use. Worth it if Docker Desktop feels heavy.

### Linux (Ubuntu/Debian)

```bash
# Remove old versions if present
sudo apt-get remove docker docker-engine docker.io containerd runc

# Add Docker's official GPG key and repository
sudo apt-get update
sudo apt-get install ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install
sudo apt-get update
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Run without sudo (log out and back in after this)
sudo usermod -aG docker $USER
```

### Windows

1. Enable WSL 2 first: `wsl --install` in PowerShell as Administrator
2. Download and install Docker Desktop for Windows
3. In Docker Desktop settings, ensure "Use WSL 2 based engine" is checked
4. Verify in a terminal: `docker --version`

**Verify your install across all platforms:**

```bash
docker run hello-world
```

You should see a "Hello from Docker!" message — your first container.

---

## Core Concepts

Before running real containers, you need to understand six terms. Everything else builds on these.

### Images

An **image** is a read-only blueprint for a container. Think of it as a class in object-oriented programming. It includes the OS base layer, your application code, dependencies, and configuration. Images are stored in registries (Docker Hub is the public default).

```bash
docker pull nginx          # Download the official nginx image
docker images              # List downloaded images
```

### Containers

A **container** is a running instance of an image — the object instantiated from the class. You can run many containers from the same image. Each is isolated with its own filesystem, network, and process space.

```bash
docker run nginx           # Create and start a container from nginx image
docker ps                  # List running containers
```

### Volumes

By default, container filesystems are ephemeral — when the container stops, any data written inside it is lost. **Volumes** are the solution: they mount directories from the host (or Docker-managed storage) into the container, so data persists across container restarts.

```bash
docker run -v /host/path:/container/path nginx
docker run -v myvolume:/data nginx          # Docker-managed named volume
```

### Networks

Docker containers get their own virtual network. By default, containers can't talk to each other unless connected to the same **network**. Docker creates a `bridge` network by default for containers on the same host.

```bash
docker network create mynetwork
docker run --network mynetwork nginx
```

### Dockerfile

A **Dockerfile** is a text file with instructions for building an image. It defines the base image, copies files, installs dependencies, sets environment variables, and specifies the startup command. Running `docker build` processes these instructions layer by layer.

### Docker Compose

**Docker Compose** lets you define and run multi-container applications using a single `docker-compose.yml` file. Instead of running multiple `docker run` commands with a dozen flags, you describe all services, networks, and volumes in one file.

---

## Your First Container: nginx

```bash
# Run nginx, map port 8080 on host to port 80 in the container
docker run -d -p 8080:80 --name my-nginx nginx
```

Flags explained:
- `-d` — detached mode (run in background)
- `-p 8080:80` — port mapping: `host:container`
- `--name my-nginx` — give the container a memorable name

Open `http://localhost:8080` and you should see the nginx welcome page. You just ran a web server without installing nginx.

```bash
docker stop my-nginx       # Stop the container
docker start my-nginx      # Start it again
docker rm my-nginx         # Remove the container
```

## Your Second Container: A Node.js App

Create a simple Node.js app:

```js
// app.js
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Hello from Docker!\n');
});
server.listen(3000, () => console.log('Running on port 3000'));
```

Now Dockerize it with a `Dockerfile`:

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "app.js"]
```

Build and run:

```bash
docker build -t my-node-app .
docker run -d -p 3000:3000 my-node-app
curl http://localhost:3000
```

---

## Dockerfile Best Practices

### Use Specific Base Image Tags

```dockerfile
# Bad: unpredictable, could break on rebuild
FROM node:latest

# Good: locked to a specific version
FROM node:20.11-alpine
```

Always pin your base image version. `latest` will silently pull a newer version during your next build and break things.

### Order Layers from Least to Most Frequently Changed

Docker caches each layer. If a layer changes, all subsequent layers are invalidated. Put rarely-changed things first:

```dockerfile
FROM node:20-alpine
WORKDIR /app

# This changes rarely — good to copy first
COPY package*.json ./
RUN npm ci --only=production

# This changes constantly — copy last
COPY . .

CMD ["node", "app.js"]
```

This way, the `npm ci` layer is cached as long as `package.json` hasn't changed, even if your source code has.

### Multi-Stage Builds

Multi-stage builds let you use a large "builder" image (with compilers, build tools, etc.) and copy only the artifacts into a small "production" image:

```dockerfile
# Stage 1: Build
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Production (much smaller)
FROM node:20-alpine AS production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
RUN npm ci --only=production
CMD ["node", "dist/index.js"]
```

The final image only contains the production build, not the dev tools or source code that compiled it. Images shrink from 1GB+ to under 200MB.

### Use .dockerignore

Create a `.dockerignore` file at the same level as your `Dockerfile`:

```
node_modules
.git
.env
*.log
dist
coverage
.DS_Store
```

This prevents large or sensitive directories from being sent to the Docker build context. Without it, `COPY . .` copies `node_modules` (500MB+) into the build context before throwing it away — adding minutes to your build.

---

## Docker Compose for Multi-Service Apps

Real applications are rarely just one service. A typical web app might need a Node.js server, a PostgreSQL database, and a Redis cache. Docker Compose handles this cleanly.

```yaml
# docker-compose.yml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgres://user:password@db:5432/myapp
      - REDIS_URL=redis://cache:6379
    depends_on:
      - db
      - cache
    volumes:
      - .:/app
      - /app/node_modules

  db:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=myapp
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  cache:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

```bash
docker compose up -d           # Start all services in background
docker compose logs -f app     # Follow logs for the app service
docker compose down            # Stop and remove containers
docker compose down -v         # Also remove volumes (wipe data)
```

The `depends_on` field ensures `db` and `cache` start before `app`. The `volumes` mount on `app` gives you live code reloading in development — changes to your source are reflected immediately without rebuilding.

---

## 20+ Essential Docker Commands

### Images

```bash
docker pull nginx:latest              # Download image from registry
docker images                          # List all local images
docker image rm nginx                  # Remove an image
docker image prune                     # Remove all unused images
docker build -t myapp:1.0 .           # Build image from Dockerfile in current dir
docker tag myapp:1.0 myapp:latest     # Tag an image with a new name
docker push myrepo/myapp:1.0          # Push image to registry
```

### Containers

```bash
docker run -d -p 8080:80 nginx        # Run in background, map ports
docker run -it ubuntu bash            # Run interactively with a shell
docker run --rm alpine echo "hello"   # Auto-remove container after it exits
docker ps                              # List running containers
docker ps -a                           # List all containers (including stopped)
docker stop <name|id>                 # Gracefully stop a container
docker kill <name|id>                 # Force-stop a container
docker rm <name|id>                   # Remove a stopped container
docker rm -f <name|id>               # Force-remove a running container
docker container prune                 # Remove all stopped containers
```

### Debugging

```bash
docker logs <name|id>                 # View container logs
docker logs -f <name|id>              # Follow logs in real time
docker logs --tail 50 <name|id>       # Last 50 lines
docker exec -it <name|id> bash        # Open a shell in a running container
docker exec -it <name|id> sh          # Use sh if bash isn't available
docker inspect <name|id>              # Full JSON metadata about a container
docker stats                           # Live resource usage for all containers
docker top <name|id>                  # Processes running inside a container
```

### Volumes and Networks

```bash
docker volume create mydata           # Create a named volume
docker volume ls                       # List volumes
docker volume rm mydata               # Remove a volume
docker network create mynet           # Create a custom network
docker network ls                      # List networks
docker network inspect mynet          # Details about a network
```

### System Cleanup

```bash
docker system prune                    # Remove all stopped containers, unused images, networks
docker system prune -a                 # Also remove images not used by any container
docker system df                       # Show disk usage
```

---

## Common Mistakes and How to Avoid Them

**Mistake 1: Running as root inside the container**
By default, Docker containers run as root. If your container is ever compromised, the attacker has root-level access inside it. Fix: add a non-root user in your Dockerfile.

```dockerfile
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser
```

**Mistake 2: Storing secrets in environment variables in docker-compose.yml**
Hardcoded credentials in your compose file end up in version control. Use `.env` files (and add them to `.gitignore`) or Docker secrets for production.

```yaml
env_file:
  - .env        # .env file is not committed to git
```

**Mistake 3: Not using .dockerignore**
Without `.dockerignore`, your entire project directory (including `node_modules`, `.git`, and `.env`) is sent to the Docker daemon as the build context. This slows builds and can expose secrets.

**Mistake 4: One big RUN command vs. one per step**
The opposite is also true: splitting every `apt-get install` into separate `RUN` statements creates unnecessary layers. Group related commands:

```dockerfile
# Good: single layer for package installation and cleanup
RUN apt-get update && \
    apt-get install -y curl wget && \
    rm -rf /var/lib/apt/lists/*
```

**Mistake 5: Forgetting `--rm` on one-off containers**
Every time you run `docker run` without `--rm`, a stopped container is left behind. Over time these pile up. Use `--rm` for any container you don't intend to restart.

**Mistake 6: Binding to 0.0.0.0 unintentionally in production**
`-p 8080:80` binds to all interfaces, making your container accessible from anywhere. In production, bind to localhost only unless you need external access: `-p 127.0.0.1:8080:80`.

---

## What to Learn Next

Once you're comfortable with the basics:

- **Docker Registry**: Push images to Docker Hub or a private registry (AWS ECR, GitHub Container Registry)
- **Health checks**: Use `HEALTHCHECK` in your Dockerfile so Docker knows when a container is truly ready
- **Kubernetes**: The orchestrator for running containers at scale — Docker is the building block, Kubernetes manages fleets of them
- **Docker BuildKit**: Faster builds with cache mounts and secret injection: `DOCKER_BUILDKIT=1 docker build .`

Docker is the foundation of modern deployment. Once you understand containers, everything from CI/CD pipelines to cloud deployments starts to make more sense. The 20 minutes you spend getting your first app containerized will save you hundreds of hours of "it works on my machine" debugging.
