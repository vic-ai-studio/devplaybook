---
title: "Docker Compose Examples for Node.js Apps (2025)"
description: "Real Docker Compose examples for Node.js applications. Covers Node + PostgreSQL, Node + Redis, multi-service setups, hot reload, production configs, and common troubleshooting."
date: "2026-03-21"
author: "DevPlaybook Team"
tags: ["docker", "docker-compose", "nodejs", "postgresql", "redis", "backend", "devops"]
readingTime: "11 min read"
faq:
  - question: "What is Docker Compose used for in Node.js development?"
    answer: "Docker Compose lets you define and run multi-container applications — your Node.js app plus databases, caches, and other services — in a single YAML file. It replaces manual container management with a single `docker compose up` command."
  - question: "How do I connect a Node.js app to PostgreSQL in Docker Compose?"
    answer: "Use the service name as the hostname. If your Postgres service is named `db`, connect with host: `db`, port: `5432`. Docker Compose's internal network handles name resolution automatically."
  - question: "How do I enable hot reload in Docker Compose for Node.js?"
    answer: "Mount your source code as a volume and use nodemon. Set `command: nodemon src/index.js` and add a volume: `- ./src:/app/src`. Changes on your host are reflected inside the container instantly."
---

Docker Compose transforms local development for Node.js applications. Instead of installing and managing PostgreSQL, Redis, and other services locally, you define everything in a `docker-compose.yml` and run `docker compose up`. Everyone on the team gets an identical environment.

This guide covers practical Docker Compose setups for Node.js — from a minimal single-container dev setup to production-ready multi-service configurations.

---

## Prerequisites

Make sure you have Docker and Docker Compose installed:

```bash
# Check versions
docker --version        # Docker 24.x+
docker compose version  # Docker Compose 2.x+
```

Docker Desktop (macOS/Windows) includes both. On Linux, install Docker Engine and the Compose plugin separately.

---

## 1. Minimal Node.js Setup

Start simple: a single containerized Node.js app.

**Project structure:**
```
my-app/
├── src/
│   └── index.js
├── package.json
├── Dockerfile
└── docker-compose.yml
```

**Dockerfile:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 3000
CMD ["node", "src/index.js"]
```

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
```

Run it:
```bash
docker compose up --build
```

This builds the image and starts the container. Visit `http://localhost:3000`.

---

## 2. Node.js + PostgreSQL

The most common full-stack setup.

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
    depends_on:
      db:
        condition: service_healthy
    volumes:
      - ./src:/app/src  # hot reload
    command: npm run dev

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./db/init.sql:/docker-entrypoint-initdb.d/init.sql  # seed data
    ports:
      - "5432:5432"  # expose for local DB clients (TablePlus, pgAdmin)
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

**Key points:**
- `depends_on` with `service_healthy` waits for Postgres to be ready before starting the app — eliminates connection race conditions
- The `healthcheck` uses `pg_isready` to verify Postgres is accepting connections
- `postgres_data` volume persists the database between container restarts
- Port `5432` is exposed so you can connect with TablePlus, pgAdmin, or `psql` from your host

**Connect in Node.js (using `pg`):**
```javascript
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
```

---

## 3. Node.js + PostgreSQL + Redis

Add Redis for caching, sessions, or queues.

**docker-compose.yml:**
```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
      REDIS_URL: redis://redis:6379
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
    command: npm run dev

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

**Connect Redis in Node.js (using `ioredis`):**
```javascript
const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);

// Cache example
async function getCachedUser(id) {
  const cached = await redis.get(`user:${id}`);
  if (cached) return JSON.parse(cached);

  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  await redis.setex(`user:${id}`, 3600, JSON.stringify(user.rows[0]));
  return user.rows[0];
}
```

---

## 4. Development with Hot Reload

For a smooth dev experience with instant code updates:

**Dockerfile.dev:**
```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install nodemon globally for hot reload
RUN npm install -g nodemon

COPY package*.json ./
RUN npm install  # include devDependencies for development

EXPOSE 3000
# Default command — override in docker-compose
CMD ["nodemon", "src/index.js"]
```

**docker-compose.dev.yml:**
```yaml
services:
  app:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
      - "9229:9229"  # Node.js debugger port
    environment:
      NODE_ENV: development
      DATABASE_URL: postgresql://postgres:password@db:5432/myapp
    volumes:
      - ./src:/app/src           # sync source code
      - ./package.json:/app/package.json
      - /app/node_modules        # anonymous volume — don't sync host node_modules
    command: nodemon --inspect=0.0.0.0:9229 src/index.js
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Run the dev setup:
```bash
docker compose -f docker-compose.dev.yml up --build
```

**Critical: The anonymous volume for `node_modules`**

```yaml
volumes:
  - ./src:/app/src
  - /app/node_modules  # This line is essential
```

Without `/app/node_modules`, Docker overwrites the container's node_modules with your host's (which may have different native bindings). The anonymous volume protects it.

---

## 5. Multi-Stage Build for Production

Separate development and production builds to keep the production image lean:

**Dockerfile:**
```dockerfile
# ---- Dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# ---- Build ----
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build  # for TypeScript or bundled apps

# ---- Production ----
FROM node:20-alpine AS production
WORKDIR /app

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY package.json .

EXPOSE 3000
CMD ["node", "dist/index.js"]
```

**docker-compose.prod.yml:**
```yaml
services:
  app:
    build:
      context: .
      target: production
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB}
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

Use environment files:
```bash
# .env.prod
DATABASE_URL=postgresql://user:strongpassword@db:5432/myapp
POSTGRES_DB=myapp
POSTGRES_USER=user
POSTGRES_PASSWORD=strongpassword
```

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

---

## 6. Node.js + MongoDB

For apps using MongoDB instead of PostgreSQL:

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      MONGODB_URI: mongodb://mongo:27017/myapp
    depends_on:
      - mongo

  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    ports:
      - "27017:27017"

volumes:
  mongo_data:
```

---

## Useful Docker Compose Commands

```bash
# Start all services (build if needed)
docker compose up --build

# Start in detached mode (background)
docker compose up -d

# Stop all services
docker compose down

# Stop and remove volumes (reset databases)
docker compose down -v

# View logs
docker compose logs -f app
docker compose logs -f db

# Run a command in a running container
docker compose exec app sh
docker compose exec db psql -U postgres myapp

# Rebuild only one service
docker compose up --build app

# Scale a service
docker compose up --scale worker=3
```

---

## Troubleshooting

**"Connection refused" on startup**

Your app is starting before the database is ready. Use `depends_on` with `service_healthy` and a proper `healthcheck`.

**Changes to `node_modules` not taking effect**

Rebuild the image:
```bash
docker compose build --no-cache app
```

**Port already in use**

```bash
# Find what's using the port
lsof -i :5432
# Or change the host port in docker-compose.yml
ports:
  - "5433:5432"  # host port 5433 maps to container 5432
```

**Database data lost after `docker compose down`**

Named volumes persist by default. Use `docker compose down -v` only when you want to reset. Check that you're using a named volume (e.g., `postgres_data`) not an anonymous bind mount.

**Environment variables not loading**

Docker Compose automatically loads a `.env` file from the same directory. For other files:
```bash
docker compose --env-file .env.local up
```

---

## Production Checklist

Before deploying a Docker Compose setup to production:

- [ ] Use a non-root user in your Dockerfile
- [ ] Set `restart: unless-stopped` on all services
- [ ] Never hardcode passwords — use environment variables or Docker secrets
- [ ] Use named volumes for all persistent data
- [ ] Add `healthcheck` to all stateful services
- [ ] Use multi-stage builds to minimize image size
- [ ] Pin image versions (`postgres:16-alpine`, not `postgres:latest`)
- [ ] Set resource limits for containers

---

## Download the Full Boilerplate

The **[Full-Stack Boilerplate Collection](/products)** includes a production-ready Express API starter with Docker Compose, PostgreSQL, Redis, JWT auth, and CI/CD already configured. Skip the setup and start building.

**Related tools:**
- [DevPlaybook API Tester](/tools/api-tester) — Test your containerized API endpoints
- [DevPlaybook Cron Generator](/tools/cron-generator) — Generate cron expressions for scheduled jobs
- [DevPlaybook API Request Builder](/tools/api-request-builder) — Build and test complex API requests
