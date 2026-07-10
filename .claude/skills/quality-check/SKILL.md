---
name: quality-check
description: Use for final quality checks, release readiness review, and verification evidence.
---

# Quality Check Skill

## Overview

| Field | Value |
|-------|-------|
| **Skill ID** | `quality-check` |
| **Name** | Quality Assurance Check |
| **Category** | Quality Assurance |
| **Complexity** | Medium |
| **Plan Availability** | starter, pro, studio |

## Purpose

Perform systematic quality checks on deliverables before release. Quality checks verify that software meets defined standards for functionality, security, performance, and maintainability.

## Responsibilities

- Execute quality gates at defined milestones
- Verify code meets quality standards
- Check documentation completeness
- Validate security requirements
- Ensure performance criteria are met
- Sign off on release readiness

## Quality Gates

| Gate | Trigger | Pass Criteria |
|------|---------|---------------|
| **Code Complete** | Feature finished | Code reviewed, tests passing |
| **Integration** | PR merged | Integration tests passing |
| **Release Candidate** | Pre-release | All gates passed |
| **Go-Live** | Production deploy | Final sign-off |

## Quality Checklist

### Code Quality

- [ ] No linting errors
- [ ] TypeScript strict mode passing
- [ ] Code coverage > 80%
- [ ] No hardcoded secrets
- [ ] Error handling in place

### Security

- [ ] No critical/high vulnerabilities (SAST)
- [ ] Dependencies up to date
- [ ] Secrets not in code
- [ ] Input validation present
- [ ] Output encoding present

### Documentation

- [ ] README updated
- [ ] API docs updated
- [ ] Migration guide (if needed)
- [ ] Breaking changes documented

### Performance

- [ ] Load test passed
- [ ] No memory leaks
- [ ] API response time < 500ms (p99)
- [ ] Database queries optimized

## Quality Check Process

```typescript
interface QualityCheckResult {
  gate: string;
  status: 'passed' | 'failed' | 'warning';
  checks: CheckResult[];
  timestamp: Date;
  checkedBy: string;
}

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  details?: string;
  evidence?: string[];
}

async function executeQualityGate(
  gate: QualityGate,
  context: ReleaseContext
): Promise<QualityCheckResult> {
  const results: CheckResult[] = [];

  for (const check of gate.checks) {
    const result = await executeCheck(check, context);
    results.push(result);

    if (result.status === 'fail' && check.blocking) {
      break;
    }
  }

  return {
    gate: gate.name,
    status: allPassed(results) ? 'passed' : results.some(r => r.status === 'fail') ? 'failed' : 'warning',
    checks: results,
    timestamp: new Date(),
    checkedBy: context.userId
  };
}
```

## Automated Checks

```yaml
# CI/CD Quality Gates
quality_gates:
  - name: Code Quality
    checks:
      - id: lint
        command: npm run lint
        blocking: true
      - id: typecheck
        command: npm run typecheck
        blocking: true
      - id: coverage
        command: npm run test -- --coverage
        threshold: 80
        blocking: true

  - name: Security
    checks:
      - id: secrets
        command: detect-secrets scan
        blocking: true
      - id: sast
        command: snyk test
        blocking: false
      - id: dependency-audit
        command: npm audit --audit-level=high
        blocking: true

  - name: Performance
    checks:
      - id: bundle-size
        threshold: 500kb
        blocking: false
      - id: load-test
        command: k6 run tests/load.js
        threshold: p99 < 500ms
        blocking: true
```

## Manual Verification

| Check | Verifier | Tool/Method |
|-------|----------|-------------|
| **UI Walkthrough** | QA | Manual test |
| **Documentation Review** | Tech Writer | Markdown lint |
| **Security Review** | Security Team | Manual + SAST |
| **Architecture Review** | Tech Lead | ADR review |

## Quality Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Defect Density** | < 5 per 1000 LOC | Code complexity analysis |
| **Code Coverage** | > 80% | Jest coverage |
| **Technical Debt** | < 5% | SonarQube |
| **Critical Bugs** | 0 at release | Bug tracker |

## Sign-Off Process

```markdown
## Release Sign-Off

### Version: v1.2.0
### Date: 2026-03-23

| Gate | Status | Sign-off |
|------|--------|----------|
| Code Quality | ✅ Pass | @developer |
| Security | ✅ Pass | @security |
| QA | ✅ Pass | @qa |
| Product | ✅ Pass | @product |

### Notes
- All quality gates passed
- Ready for production deployment

### Signatures
- [ ] Tech Lead: _________________ Date: _______
- [ ] QA Lead: _________________ Date: _______
- [ ] Product Owner: _________________ Date: _______
```

## Quality Report

```markdown
# Quality Report: v1.2.0

## Summary
- Total Checks: 15
- Passed: 14
- Warnings: 1
- Failed: 0

## Detailed Results

### Code Quality ✅
- ESLint: No errors
- TypeScript: No errors
- Coverage: 84%

### Security ✅
- SAST: No vulnerabilities
- Dependencies: Up to date

### Performance ✅
- p99 Latency: 234ms
- Load Test: Passed

## Recommendation
**Ready for release**

## Next Review
After deployment to production
```

## Events Consumed

- `release.candidate.created`
- `release.approved`

## Events Emitted

- `quality.check.started`
- `quality.check.completed`
- `quality.gate.passed`
- `quality.gate.failed`

## References

- `backend/src/agents/config/agent-personalities.ts` — Devin agent
- SonarQube Quality Gates
