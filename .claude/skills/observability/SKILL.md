---
name: observability
description: Use for logs, metrics, tracing, runtime diagnostics, and production visibility.
---

# Observability Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `observability` |
| **Name** | Observability & Monitoring |
| **Category** | DevOps |
| **Complexity** | High |
| **Plan Availability** | pro, studio |

## Purpose

Implement comprehensive monitoring, logging, and tracing to provide visibility into system behavior. Observability enables rapid problem detection and diagnosis.

## Responsibilities

- Configure centralized logging (ELK/Grafana Loki)
- Set up metrics collection (Prometheus)
- Implement distributed tracing (Jaeger)
- Create dashboards for service health
- Define and monitor SLIs/SLOs
- Configure alerting rules
- Conduct post-incident reviews

## Three Pillars of Observability

### 1. Logs

```typescript
// Structured logging with correlation
logger.info('Document processing completed', {
  documentId: document.id,
  tenantId: document.tenantId,
  processingTimeMs: duration,
  chunkCount: chunks.length,
  traceId: context.traceId,
  spanId: context.spanId
});
```

### 2. Metrics

```typescript
// Prometheus metrics
const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const documentProcessingTotal = new Counter({
  name: 'document_processing_total',
  help: 'Total number of documents processed',
  labelNames: ['status', 'tenant_id']
});
```

### 3. Traces

```typescript
// OpenTelemetry tracing
const span = tracer.startSpan('document.process', {
  attributes: {
    'document.id': document.id,
    'tenant.id': tenantId
  }
});

try {
  await processDocument(document);
  span.setStatus({ code: SpanStatusCode.OK });
} catch (error) {
  span.recordException(error);
  span.setStatus({ code: SpanStatusCode.ERROR });
} finally {
  span.end();
}
```

## Key Metrics

| Category | Metric | Target |
|----------|--------|--------|
| **Availability** | Uptime | > 99.9% |
| **Latency** | p99 Response Time | < 500ms |
| **Errors** | Error Rate | < 0.1% |
| **Throughput** | Requests/Second | > 1000 |
| **Resources** | CPU/Memory Usage | < 80% |

## Alerting Rules

```yaml
# Prometheus alerting rules
groups:
  - name: ebrisk-alerts
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status_code=~"5.."}[5m]) > 0.01
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "High error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: histogram_quantile(0.99, http_request_duration_seconds) > 2
        for: 5m
        labels:
          severity: warning
```

## Dashboard Panels

| Panel | Visualization | Source |
|-------|--------------|--------|
| **Request Rate** | Graph | Prometheus counter |
| **Error Rate** | Graph | Prometheus counter |
| **Latency Distribution** | Heatmap | Prometheus histogram |
| **Active Users** | Stat | Database query |
| **Queue Depth** | Graph | Redis metrics |

## Log Aggregation

```typescript
// Winston with ELK integration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  defaultMeta: { service: 'ebrisk-backend' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.Http({
      host: 'elk.internal',
      path: '/logs'
    })
  ]
});
```

## Health Endpoints

```typescript
// Kubernetes liveness/readiness probes
app.get('/health/live', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (req, res) => {
  const checks = await Promise.all([
    checkDatabase(),
    checkRedis(),
    checkMinio()
  ]);

  const healthy = checks.every(c => c.healthy);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ready' : 'not ready',
    checks
  });
});
```

## SLO Definition

```yaml
# Service Level Objectives
slos:
  - name: API Availability
    target: 99.9%
    window: 30d
    indicator:
      type: availability
      good: http_requests_total{status_code!~"5.."}
      total: http_requests_total

  - name: API Latency
    target: 99%
    threshold: 500ms
    window: 30d
    indicator:
      type: latency
      total: http_request_duration_seconds
```

## Post-Incident Review

```markdown
## PIR: [Incident Title]

### Timeline (UTC)
- 10:00 - Alert triggered
- 10:02 - On-call acknowledged
- 10:05 - Incident commander assigned
- 10:15 - Root cause identified
- 10:30 - Fix deployed
- 10:45 - Incident resolved

### Root Cause
[Technical root cause]

### Impact
- Users affected: X
- Duration: Y minutes
- Revenue impact: Z

### Action Items
- [ ] Implement better error handling
- [ ] Add more monitoring
- [ ] Update runbook
```

## Events Consumed

- `deploy.completed`
- `alert.triggered`

## Events Emitted

- `observability.dashboard.created`
- `alert.created`
- `incident.created`

## References

- `backend/src/agents/config/agent-personalities.ts` — Riley agent
- OpenTelemetry Specification
