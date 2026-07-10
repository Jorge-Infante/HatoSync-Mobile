---
name: triage
description: Assessing and categorizing incoming requests by completeness, feasibility, and priority.
agent_ids: [sam]
---

# Triage Skill

Assess and categorize incoming requests by completeness, feasibility, and priority.

## Triage Categories

### Completeness Check
```yaml
completeness:
  required_fields:
    - project_name
    - description
    - tech_stack
    - timeline
  optional_fields:
    - budget
    - target_users
    - success_criteria
  status: complete|incomplete|partial
```

### Feasibility Assessment
```yaml
feasibility:
  technical:
    assessable: true
    blockers: []
  resource:
    assessable: true
    gaps: []
  timeline:
    realistic: true
    risk_factors: []
```

### Priority Levels
```yaml
priority:
  P0_critical:
    description: "Blocking production, security issue"
    response_time: 1 hour
    examples:
      - Data breach
      - Complete system down
      - Critical data loss
  
  P1_high:
    description: "Core feature broken"
    response_time: 4 hours
    examples:
      - Login broken for all users
      - Payment processing failed
      
  P2_medium:
    description: "Enhancement, non-blocking"
    response_time: 24 hours
    examples:
      - UI alignment issue
      - Performance degradation
      
  P3_low:
    description: "Nice-to-have, polish"
    response_time: 72 hours
    examples:
      - Typo in copy
      - Minor visual issue
```

## Triage Process

1. **Receive** incoming request
2. **Validate** completeness of information
3. **Assess** feasibility (technical + resource)
4. **Categorize** by type (feature/bug/refactor)
5. **Prioritize** using P0-P3 scale
6. **Route** to appropriate handler

## Output Format

```yaml
triage_result:
  request_id: "uuid"
  completeness: complete
  feasibility: feasible
  priority: P2
  category: feature
  routed_to: taylor
  notes: "Missing timeline - added estimate"
  created_at: "ISO8601"
```

## Red Flags

- Vague requirements → Flag for clarification
- Conflicting requirements → Escalate to Taylor
- Unrealistic timeline → Negotiate or escalate
- Missing tech stack → Request before routing
