---
name: scope
description: Defining project boundaries, identifying what's in/out of scope, and managing scope changes.
agent_ids: [taylor]
---

# Scope Definition Skill

Define project boundaries, identify what's in/out of scope, and manage scope changes.

## Scope Document Template

```markdown
## Scope Definition

### Project: [Name]

### In Scope (Included)
1. [Feature/Task 1]
2. [Feature/Task 2]
3. [Feature/Task 3]

### Out of Scope (Excluded)
1. [Feature/Task 1]
2. [Feature/Task 2]

### Assumptions
1. [Assumption 1]
2. [Assumption 2]

### Constraints
1. [Constraint 1]
2. [Constraint 2]

### Dependencies
1. [External dependency 1]
2. [External dependency 2]

### Scope Change Process
1. Request scope change
2. Impact assessment
3. Stakeholder approval
4. Update scope document
5. Adjust timeline if needed
```

## Scope Boundaries

### Hard Boundaries (Never Change)
- Security requirements
- Compliance requirements
- Foundational architecture decisions

### Soft Boundaries (Negotiable)
- Feature scope
- User count limits
- Timeline adjustments

### Flexible Boundaries (Can Expand)
- UI polish
- Additional documentation
- Performance optimization

## Scope Creep Prevention

1. **Document everything**: Write scope before starting
2. **Sign-off required**: Get stakeholder approval on scope
3. **Change control**: Any scope change requires formal process
4. **Impact analysis**: Always assess impact before accepting changes
5. **Prioritize**: If adding, remove something else

## Scope Change Request Template

```yaml
scope_change:
  requestor: 
  date: 
  type: [add|remove|modify]
  item: 
  reason: 
  impact:
    timeline: [+/- days]
    budget: [+/- hours]
    quality: [+/- risk]
  approved_by: 
  date_approved: 
```

## Questions to Clarify Scope

1. Does this include mobile web?
2. Is admin panel in scope?
3. Do we need offline support?
4. What browsers need to be supported?
5. Is there a max concurrent user assumption?
6. What happens if we find technical debt during development?
