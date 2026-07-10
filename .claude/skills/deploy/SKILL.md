---
name: deploy
description: Use for deployment workflows, environment rollout checks, and release operation guardrails.
---

# Deploy Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `deploy` |
| **Name** | Deployment & Release Management |
| **Category** | DevOps |
| **Complexity** | High |
| **Plan Availability** | pro, studio |

## Purpose

Manage the deployment pipeline from development to production. Ensure safe, consistent, and rollback-capable deployments across all environments.

## Responsibilities

- Execute deployments to staging and production
- Monitor deployment health and roll back if needed
- Coordinate deployment schedules with team
- Maintain deployment runbooks
- Manage environment configurations
- Ensure zero-downtime deployments

## Deployment Strategies

### Blue-Green Deployment

```
┌─────────────────────────────────────────┐
│           Load Balancer                 │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
┌─────────────┐        ┌─────────────┐
│  Blue       │        │  Green      │
│  (Current)  │        │  (New)      │
│  v1.2.0     │        │  v1.3.0    │
└─────────────┘        └─────────────┘
     active               standby
```

### Rolling Deployment

```yaml
# Kubernetes rolling update
spec:
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
```

### Canary Deployment

```yaml
# Deploy to 10% of traffic first
apiVersion: flagger.app/v1beta1
kind: Canary
spec:
  analysis:
    interval: 1m
    threshold: 5
    stepWeight: 10
    maxWeight: 50
```

## Pre-Deployment Checklist

| Check | Description |
|-------|-------------|
| **Code Freeze** | No unapproved PRs in release |
| **Tests Passed** | All CI/CD checks green |
| **Database Migration** | Migration tested on staging |
| **Rollback Plan** | Documented rollback procedure |
| **Feature Flags** | New features toggled off |
| **Notification** | Team notified of deployment |

## Deployment Execution

```bash
# 1. Tag release
git tag -a v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0

# 2. Deploy to staging
kubectl apply -f k8s/staging/

# 3. Run smoke tests
./scripts/smoke-test.sh staging

# 4. Deploy to production
kubectl apply -f k8s/production/

# 5. Monitor
kubectl rollout status deployment/ebrisk-backend
```

## Rollback Procedures

### Kubernetes Rollback

```bash
# Check rollout history
kubectl rollout history deployment/ebrisk-backend

# Rollback to previous revision
kubectl rollout undo deployment/ebrisk-backend

# Rollback to specific revision
kubectl rollout undo deployment/ebrisk-backend --to-revision=3
```

### Database Rollback

```bash
# Using Flyway
flyway -url=jdbc:postgresql://localhost:5432/ebrisk \
       -user=admin \
       -password=secret \
       undo
```

## Environment Configuration

| Environment | Purpose | Deployment Frequency |
|-------------|---------|---------------------|
| **Development** | Local development | On demand |
| **Staging** | Pre-production testing | Every PR |
| **Production** | Live users | Release-based |

## Monitoring Post-Deployment

```bash
# Check deployment health
kubectl get pods -l app=ebrisk-backend

# View logs
kubectl logs -l app=ebrisk-backend --tail=100 -f

# Check resource usage
kubectl top pods -l app=ebrisk-backend
```

## Incident Response

| Severity | Action |
|----------|--------|
| **Deployment Failed** | Automatic rollback, alert team |
| **Post-Deploy Error Spike** | Investigate, rollback if needed |
| **Performance Degradation** | Scale up, profile, investigate |

## Events Consumed

- `deploy.requested`
- `deploy.approved`

## Events Emitted

- `deploy.started`
- `deploy.completed`
- `deploy.failed`
- `deploy.rolled_back`

## References

- `backend/src/agents/config/agent-personalities.ts` — Riley agent
