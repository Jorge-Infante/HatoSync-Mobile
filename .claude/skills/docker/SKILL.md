---
name: docker
description: Use for Dockerfiles, compose services, container runtime debugging, and image build hygiene.
---

# Docker Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `docker` |
| **Name** | Docker & Containerization |
| **Category** | DevOps |
| **Complexity** | Medium |
| **Plan Availability** | pro, studio |

## Purpose

Build, configure, and manage Docker containers for the DevZeros AI Office microservices. Docker provides consistent runtime environments across development, staging, and production.

## Responsibilities

- Create and maintain Dockerfiles for all services
- Configure docker-compose for local development
- Optimize image sizes using multi-stage builds
- Ensure healthchecks are defined for all services
- Manage volume mounts for development workflows
- Handle Docker networking between services

## Dockerfile Guidelines

### Multi-Stage Builds

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build

# Stage 2: Runtime
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s CMD node healthcheck.js
CMD ["node", "dist/main.js"]
```

### Security Best Practices

```dockerfile
# Use specific version tags, not 'latest'
FROM node:20.11.1-alpine3.19

# Create non-root user
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -D appuser
USER appuser

# Read-only filesystem
RUN chown -R appuser:appgroup /app
```

## Docker Compose Configuration

### Local Development Stack

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s

  minio:
    image: minio/minio:latest
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s

volumes:
  postgres_data:
```

## Networking

### Service Discovery

```yaml
# Services communicate via service names
# ebrisk-backend can reach postgres via: postgresql://postgres:5432
services:
  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:5432/ebrisk
      REDIS_URL: redis://redis:6379
```

## Volume Management

| Use Case | Volume Type | Example |
|----------|-------------|---------|
| **Development** | Bind mount | `./src:/app/src` |
| **Production** | Named volume | `postgres_data:/var/lib/postgresql/data` |
| **Temp files** | tmpfs | Memory-only storage |

## Build Optimization

```dockerfile
# Layer caching - copy package files first
COPY package*.json ./
RUN npm ci
COPY . .

# .dockerignore
node_modules
.git
*.log
.env*
dist
```

## Healthchecks

```dockerfile
# HTTP healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Or custom script
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js
```

## Common Commands

| Command | Use Case |
|---------|----------|
| `docker-compose up -d` | Start stack in background |
| `docker-compose logs -f [service]` | Follow service logs |
| `docker-compose exec [service] sh` | Shell into container |
| `docker-compose restart [service]` | Restart single service |
| `docker-compose down -v` | Stop and remove volumes |

## Troubleshooting

| Issue | Solution |
|-------|----------|
| **Port conflict** | Change port mapping in docker-compose |
| **Permission denied** | Use bind mount with correct permissions |
| **Out of memory** | Increase Docker desktop resources |
| **Network unreachable** | Check Docker networking configuration |

## Events Consumed

- `deploy.started`
- `deploy.completed`

## Events Emitted

- `docker.image.built`
- `docker.container.started`
- `docker.healthcheck.failed`

## References

- `backend/src/agents/config/agent-personalities.ts` — Riley agent
- Docker Best Practices
