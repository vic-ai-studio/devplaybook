# Docker Cheat Sheet

---

## Images

```bash
docker images                              # list images
docker pull nginx:latest                   # pull image
docker build -t myapp:1.0 .               # build from Dockerfile
docker build -t myapp:1.0 -f Dockerfile.prod .   # specify Dockerfile
docker tag myapp:1.0 registry/myapp:1.0   # tag for registry
docker push registry/myapp:1.0            # push to registry
docker rmi myapp:1.0                       # remove image
docker image prune -a                      # remove unused images ⚠️
```

---

## Containers

```bash
docker run nginx                              # run container (foreground)
docker run -d nginx                           # run detached
docker run -d -p 8080:80 nginx               # port mapping (host:container)
docker run -d -v ./data:/data nginx          # volume mount
docker run -e ENV_VAR=value nginx            # environment variable
docker run --name mycontainer nginx          # named container
docker run --rm nginx                        # auto-remove on exit
docker run -it ubuntu bash                   # interactive shell

docker ps                                    # running containers
docker ps -a                                 # all containers
docker stop <name/id>                        # graceful stop
docker kill <name/id>                        # force stop
docker rm <name/id>                          # remove container
docker rm -f <name/id>                       # force remove (running)
```

---

## Container Operations

```bash
docker exec -it <name> bash              # shell into running container
docker exec -it <name> sh                # use sh if no bash
docker logs <name>                       # view logs
docker logs -f <name>                    # follow logs
docker logs --tail 100 <name>            # last 100 lines
docker inspect <name>                    # detailed container info
docker stats                             # live resource usage
docker top <name>                        # processes in container
docker cp <name>:/path/file ./local      # copy file from container
docker cp ./local <name>:/path/file      # copy file to container
```

---

## Volumes

```bash
docker volume ls                          # list volumes
docker volume create myvolume             # create volume
docker volume inspect myvolume           # volume details
docker volume rm myvolume                # remove volume
docker volume prune                       # remove unused volumes

# Mount types:
-v /host/path:/container/path            # bind mount (host directory)
-v myvolume:/container/path              # named volume
--mount type=tmpfs,target=/tmp           # in-memory tmpfs
```

---

## Docker Compose

```bash
docker compose up                         # start all services
docker compose up -d                      # detached mode
docker compose up --build                 # rebuild images
docker compose down                       # stop + remove containers
docker compose down -v                    # also remove volumes ⚠️
docker compose logs -f                    # follow all logs
docker compose logs -f service_name      # logs for one service
docker compose ps                         # status of services
docker compose exec service_name bash    # shell into service
docker compose restart service_name      # restart one service
docker compose pull                       # pull latest images
docker compose config                     # validate + view config
```

---

## Essential docker-compose.yml

```yaml
version: "3.9"
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
    volumes:
      - ./src:/app/src          # dev: hot reload
    depends_on:
      db:
        condition: service_healthy
    restart: unless-stopped

  db:
    image: postgres:16
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    healthcheck:
      test: ["CMD", "pg_isready"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

---

## Dockerfile Best Practices

```dockerfile
FROM node:20-alpine                    # use specific version + slim base
WORKDIR /app

# Copy deps first (layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Non-root user (security)
RUN adduser -D appuser
USER appuser

EXPOSE 3000
CMD ["node", "server.js"]
```

---

## Cleanup

```bash
docker system prune           # remove stopped containers + unused images/networks
docker system prune -a        # also remove unused images (not just dangling) ⚠️
docker system prune --volumes # also remove volumes ⚠️
docker system df              # disk usage overview
```

---

## Debugging

```bash
docker inspect <name> | grep -i ip              # container IP
docker inspect <name> | grep -A5 "Env"          # environment vars
docker run --entrypoint bash myapp:1.0 -i       # override entrypoint
docker history myapp:1.0                         # image layer history
```

---

*Developer Cheat Sheet Bundle v1.0 — DevPlaybook*
