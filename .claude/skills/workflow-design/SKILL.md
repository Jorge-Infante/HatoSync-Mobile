---
name: workflow-design
description: Designing efficient workflows for multi-agent collaboration and task orchestration.
agent_ids: [atlas]
---

# Workflow Design Skill

Design efficient workflows for multi-agent collaboration.

## Core Concepts

### Workflow Decomposition
- Break complex features into sequential steps with clear ownership
- Identify parallelizable work streams
- Define dependencies between tasks using DAG (Directed Acyclic Graph)
- Create milestone definitions with clear deliverables

### Workflow Patterns
1. **Sequential**: A → B → C (one completes before next starts)
2. **Parallel**: A ‖ B ‖ C (all run simultaneously)
3. **Fan-out/Fan-in**: A → [B, C, D] → E (distribute then consolidate)
4. **Pipeline**: A → B → C → D (assembly line pattern)

### Workflow Documentation
```yaml
workflow:
  name: feature-development
  steps:
    - id: design
      owner: morgan
      parallel: false
      depends_on: []
    - id: frontend
      owner: alex
      parallel: false
      depends_on: [design]
    - id: backend
      owner: jordan
      parallel: false
      depends_on: [design]
    - id: qa
      owner: casey
      parallel: false
      depends_on: [frontend, backend]
```

## Best Practices

1. **Clear ownership**: Each step has one明确 owner
2. **Minimal dependencies**: Reduce coupling between steps
3. **Parallel where possible**: Identify steps that can run concurrently
4. **Quality gates**: Each step should have exit criteria
5. **Fail fast**: Detect and report failures early

## Integration with Other Skills

- Combine with `handoff-planning` for smooth transitions
- Combine with `quality-gates` for automated validation
- Combine with `team-routing` for optimal task assignment
