---
name: delivery
description: Use for release delivery planning, artifact handoff, deployment validation, and rollback coordination.
---

# Delivery Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `delivery` |
| **Name** | Software Delivery |
| **Category** | Operations |
| **Complexity** | Medium |
| **Plan Availability** | pro, studio |

## Purpose

Manage the end-to-end delivery process from build artifacts to target environments. Delivery ensures software reaches users reliably and efficiently.

## Responsibilities

- Coordinate release schedules
- Execute delivery procedures
- Validate delivery targets
- Monitor delivery success
- Handle delivery failures
- Maintain delivery runbooks

## Delivery Pipeline

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Build     │ → │  Package    │ → │   Deploy    │ → │   Verify    │
│  Artifact   │    │   Artifact  │    │  to Target  │    │  Delivery   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

## Delivery Strategies

### Direct Deployment

```yaml
# Direct deployment to servers
- name: Deploy to Production
  run: |
    scp -r ./dist/* user@prod-server:/var/www/app/
    ssh user@prod-server "cd /var/www/app && npm install --production"
    ssh user@prod-server "systemctl restart app"
```

### Rolling Deployment

```yaml
# Kubernetes rolling update
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ebrisk-backend
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: backend
          image: ebrisk/backend:latest
```

### Blue-Green Deployment

```yaml
# Blue-green switch
- name: Switch traffic to green
  run: |
    kubectl patch service app \
      -p '{"spec":{"selector":{"slot":"green"}}}'
    # Wait for health check
    sleep 30
    kubectl scale deployment app-green --replicas=3
```

## Pre-Delivery Checklist

| Check | Description |
|-------|-------------|
| **Build Verified** | Artifacts built successfully |
| **Tests Passed** | All tests green |
| **Security Scan** | No critical vulnerabilities |
| **Rollback Plan** | Documented rollback procedure |
| **Change Approved** | Change request approved |
| **Stakeholders Notified** | Team notified of delivery |

## Delivery Execution

```typescript
interface DeliveryTask {
  id: string;
  version: string;
  environment: 'staging' | 'production';
  artifacts: Artifact[];
  strategy: 'rolling' | 'blue-green' | 'direct';
  rollbackPlan: RollbackPlan;
  notifyOnComplete: string[];
}

async function executeDelivery(task: DeliveryTask): Promise<DeliveryResult> {
  // 1. Validate artifacts exist
  await validateArtifacts(task.artifacts);

  // 2. Pre-delivery health check
  const currentHealth = await checkEnvironmentHealth(task.environment);
  if (!currentHealth.healthy) {
    throw new Error(`Environment not healthy: ${currentHealth.issues}`);
  }

  // 3. Execute delivery
  const result = await task.strategy === 'rolling'
    ? executeRollingDelivery(task)
    : executeBlueGreenDelivery(task);

  // 4. Post-delivery verification
  await verifyDelivery(task, result);

  // 5. Notify stakeholders
  await notifyStakeholders(task, result);

  return result;
}
```

## Target Environments

| Environment | Purpose | Update Frequency |
|-------------|---------|------------------|
| **Development** | Testing | On commit |
| **Staging** | Pre-production | Every release |
| **Production** | Live users | Release schedule |

## Delivery Monitoring

```bash
# Monitor deployment progress
kubectl rollout status deployment/ebrisk-backend --timeout=10m

# Check pod health
kubectl get pods -l app=ebrisk-backend

# View deployment logs
kubectl logs -l app=ebrisk-backend --tail=100
```

## Rollback Procedures

```bash
# Kubernetes rollback
kubectl rollout undo deployment/ebrisk-backend

# Docker rollback
docker-compose pull && docker-compose up -d

# Direct deployment rollback
ssh user@server "cd /var/www/app && git checkout v1.0.0"
```

## Delivery Metrics

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| **Success Rate** | > 99% | < 95% |
| **Deployment Time** | < 10 min | > 30 min |
| **MTTR** | < 15 min | > 30 min |

## Events Consumed

- `package.created`
- `release.approved`

## Events Emitted

- `delivery.started`
- `delivery.completed`
- `delivery.failed`
- `delivery.rolled_back`

## References

- `backend/src/agents/config/agent-personalities.ts` — Devin agent
