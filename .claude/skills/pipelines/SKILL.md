---
name: pipelines
description: Use for CI/CD pipeline design, build automation, and quality gate orchestration.
---

# Pipelines Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `pipelines` |
| **Name** | CI/CD Pipeline Engineering |
| **Category** | DevOps |
| **Complexity** | High |
| **Plan Availability** | pro, studio |

## Purpose

Design, implement, and maintain continuous integration and delivery pipelines. Pipelines automate the path from code commit to production deployment.

## Responsibilities

- Design and maintain GitHub Actions workflows
- Implement build, test, and deployment automation
- Ensure pipeline security (SAST, dependency scanning)
- Optimize pipeline performance and caching
- Manage secrets and credentials in pipelines
- Create pipeline documentation and runbooks

## Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        CI/CD Pipeline                           │
├─────────────────────────────────────────────────────────────────┤
│  Commit → Lint → Test → Build → Security → Deploy → Verify    │
└─────────────────────────────────────────────────────────────────┘
```

## GitHub Actions Workflow

### Main Workflow

```yaml
# .github/workflows/ci.yml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

env:
  NODE_VERSION: '20'
  REGISTRY: ghcr.io

jobs:
  lint:
    name: Lint & Type Check
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: ESLint
        run: npm run lint

      - name: TypeScript
        run: npm run typecheck

  test:
    name: Unit Tests
    runs-on: ubuntu-latest
    needs: lint
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run Tests
        run: npm test -- --coverage
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/test

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    name: Build Docker Image
    runs-on: ubuntu-latest
    needs: test
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build and push
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ${{ env.REGISTRY }}/${{ github.repository }}:${{ github.sha }}
            ${{ env.REGISTRY }}/${{ github.repository }}:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max

  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: build
    if: github.ref == 'refs/heads/main'
    environment: staging
    steps:
      - name: Deploy
        run: |
          kubectl apply -f k8s/staging/
          kubectl rollout status deployment/ebrisk-backend --timeout=5m
```

## Pipeline Security

### SAST (Static Application Security Testing)

```yaml
- name: Run Snyk Security Scan
  uses: snyk/actions/node@master
  env:
    SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
```

### Dependency Scanning

```yaml
- name: Dependency Review
  uses: actions/dependency-review-action@v3
```

### Secret Scanning

```yaml
- name: Detect secrets
  run: |
    npm install -g detect-secrets
    detect-secrets scan --baseline .secrets.baseline
```

## Caching Strategies

| Cache Type | Tool | Benefit |
|------------|------|---------|
| **npm modules** | actions/setup-node | Faster installs |
| **Docker layers** | buildx cache | Faster builds |
| **Build output** | actions/cache | Faster rebuilds |

```yaml
# npm cache
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    cache: 'npm'

# Docker layer cache
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

## Matrix Builds

```yaml
jobs:
  test:
    strategy:
      matrix:
        node-version: [18, 20, 22]
        database: [postgres:14, postgres:15, postgres:16]
    steps:
      - name: Use Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
```

## Pipeline Quality Gates

| Gate | Tool | Pass Criteria |
|------|------|---------------|
| **Lint** | ESLint | No errors |
| **Type Check** | tsc --noEmit | No errors |
| **Unit Tests** | Jest | > 80% coverage |
| **Security** | Snyk | No high/critical vulns |
| **Build** | Docker | Image created |

## Events Consumed

- `workflow.started`
- `code.committed`

## Events Emitted

- `pipeline.started`
- `pipeline.completed`
- `pipeline.failed`
- `pipeline.deployment.triggered`

## References

- `backend/src/agents/config/agent-personalities.ts` — Riley agent
- GitHub Actions Documentation
