---
name: planning
description: Breaking down features into epics, stories, and tasks with effort estimates and milestones.
agent_ids: [taylor]
---

# Planning Skill

Break down features into epics, stories, and tasks with effort estimates and milestones.

## Planning Hierarchy

```
Epic
├── Feature 1
│   ├── Story 1.1
│   │   ├── Task 1.1.1
│   │   ├── Task 1.1.2
│   │   └── Task 1.1.3
│   └── Story 1.2
│       └── ...
└── Feature 2
    └── ...
```

## Story Template

```markdown
## User Story: [Title]

**As a** [user type]  
**I want** [goal]  
**So that** [benefit]

### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

### Technical Notes
- [Technical consideration 1]
- [Technical consideration 2]

### Effort Estimate
- XS: < 2 hours
- S: 2-4 hours
- M: 4-8 hours
- L: 8-16 hours
- XL: 16-40 hours
```

## Task Template

```yaml
task:
  id: TASK-XXX
  title: "[Action] [object]"
  type: [development|testing|documentation|research]
  story: STORY-XXX
  assigned_to: agent-id
  estimate: [hours]
  status: todo|in_progress|done|blocked
  dependencies: [TASK-XXX]
  definition_of_done:
    - code_complete
    - tests_written
    - code_reviewed
    - merged_to_branch
```

## Sprint Planning

### Sprint Goal Template
```yaml
sprint:
  number: N
  goal: "What we expect to achieve"
  start_date: 
  end_date: 
  capacity: [total hours]
  commitment: [hours committed]
  stories:
    - STORY-XXX
```

### Capacity Calculation
```yaml
capacity:
  team_members:
    - name: alex
      availability: 32h
      skills: [frontend]
    - name: jordan
      availability: 32h
      skills: [backend]
  total_capacity: 64h
  buffer: 10%  # for unexpected work
  usable_capacity: 57.6h
```

## Milestone Definition

```yaml
milestone:
  name: MVP
  target_date: 2026-04-01
  criteria:
    - User authentication
    - Basic dashboard
    - Core feature A
    - Core feature B
  stories:
    - STORY-001
    - STORY-002
    - STORY-003
  status: at_risk|on_track|complete
```
