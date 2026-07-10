---
name: quality-gates
description: Implementing quality gates to ensure standards are met before proceeding to next stage.
agent_ids: [atlas]
---

# Quality Gates Skill

Implement quality gates to ensure standards are met before proceeding.

## Gate Types

### 1. Build Gate
```yaml
gate:
  name: build
  criteria:
    - compilation: true
    - tests_pass: true
    - lint_clean: true
    - coverage_min: 80%
```

### 2. Review Gate
```yaml
gate:
  name: review
  criteria:
    - approvals: 1
    - lgtm_from: peer or lead
    - no_blocking_comments: true
```

### 3. Test Gate
```yaml
gate:
  name: test
  criteria:
    - unit_tests: passing
    - integration_tests: passing
    - e2e_tests: passing
    - no_regressions: true
```

### 4. Security Gate
```yaml
gate:
  name: security
  criteria:
    - no_secrets: true
    - no_sql_injection: true
    - no_xss: true
    - dependencies_secure: true
```

### 5. Sign-off Gate
```yaml
gate:
  name: sign-off
  criteria:
    - stakeholder_approval: true
    - po_signoff: true
    - qa_signoff: true
```

## Gate Automation

```yaml
automation:
  build_gate:
    tools: [github-actions, jenkins]
    trigger: on_push
  test_gate:
    tools: [jest, pytest, playwright]
    trigger: on_pr
  security_gate:
    tools: [snyk, dependabot]
    trigger: on_deploy
```

## Pass/Fail Criteria

### Pass
- All criteria met
- Evidence documented
- Gate signed off

### Fail
- Any criterion unmet
- Blocking issues identified
- Remediation required

## Reporting

Quality gates should produce:
```json
{
  "gate": "build",
  "status": "passed|failed|pending",
  "timestamp": "ISO8601",
  "checks": [
    {"name": "compilation", "status": "pass", "evidence": "..."},
    {"name": "tests", "status": "pass", "coverage": "85%"}
  ],
  "signed_off_by": "agent-id"
}
```
