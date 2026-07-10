---
name: handoff-planning
description: Planning and executing smooth handoffs between agents with clear validation criteria.
agent_ids: [atlas]
---

# Handoff Planning Skill

Plan and execute smooth handoffs between agents with clear validation criteria.

## Handoff Document Structure

Every handoff must include:

```yaml
handoff:
  id: unique-identifier
  from_agent: sender-agent-id
  to_agent: receiver-agent-id
  task: task-description
  input:
    artifacts: [list of produced artifacts]
    context: [relevant background]
    open_questions: [unresolved items]
  output:
    expected: [what receiver should produce]
    format: [ deliverable format]
    quality_bar: [minimum quality bar]
  validation_criteria:
    - [criterion 1]
    - [criterion 2]
  blocked_by: [dependencies]
  status: pending|in_progress|completed|blocked
```

## Handoff Types

### 1. Sequential Handoff
One agent completes work, another begins. Most common pattern.

### 2. Parallel Handoff
Multiple agents work on parts simultaneously, then converge.

### 3. Review Handoff
Agent submits for review, reviewer provides feedback.

## Validation Checklist

- [ ] Input artifacts are complete and accessible
- [ ] Context is documented and sufficient
- [ ] Open questions are resolved or documented
- [ ] Output expectations are clear and measurable
- [ ] Quality bar is defined and achievable
- [ ] Receiver acknowledges receipt

## Anti-Patterns to Avoid

1. **Handoff without context**: Don't assume implicit knowledge
2. **Blocking handoff**: Never hand off blocked work
3. **One-way handoff**: Always confirm receipt
4. **Vague criteria**: Quality bar must be measurable

## Best Practices

1. **Proactive communication**: Alert receiving agent before handoff
2. **Time-boxed acceptance**: Receiver should acknowledge within N hours
3. **Escalation path**: Define what happens if handoff fails
4. **Documentation**: Record all handoffs in project context
