---
name: team-routing
description: Routing tasks to appropriate team members based on skills, workload, and relationships.
agent_ids: [atlas, sam]
---

# Team Routing Skill

Route tasks to appropriate team members based on skills, workload, and relationships.

## Routing Criteria

### 1. Skill Match
```yaml
routing:
  criteria:
    skill_required: [react, typescript]
    agent_capabilities:
      alex: [react, vue, css]  # 2/3 match
      jordan: [node, db, api]  # 0/3 match
    best_match: alex
```

### 2. Workload Balancing
```yaml
routing:
  criteria:
    max_tasks_per_agent: 3
    current_load:
      alex: 2 tasks
      jordan: 1 task
      morgan: 1 task
    least_loaded: jordan
```

### 3. Relationship Affinity
```yaml
routing:
  criteria:
    task_requires: pair-programming
    pairs_well_with:
      alex + jordan: collaborates
      taylor + morgan: collaborates
    recommended_pair: alex + jordan
```

### 4. Room/Location Proximity
```yaml
routing:
  criteria:
    task_team: frontend
    agent_locations:
      alex: frontend_room
      jordan: backend_room
    same_room: alex
```

## Routing Matrix

| Task Type | Primary | Secondary | Avoid |
|-----------|---------|-----------|-------|
| UI Component | alex | morgan | jordan |
| API Endpoint | jordan | alex | - |
| Database | jordan | - | alex |
| Design | morgan | alex | jordan |
| Testing | casey | alex | - |
| DevOps | riley | jordan | - |

## Decision Flow

```
Is task urgent?
├── Yes → Route to available specialist (ignore workload)
└── No → Check skill match
    ├── Multiple matches → Check workload
    │   └── Route to least loaded
    └── Single match → Route to specialist
        └── Check relationships
            └── Prefer positive relationships
```

## Conflict Resolution

When multiple tasks compete for same agent:
1. Priority first (P0 > P1 > P2 > P3)
2. Deadline second (earliest deadline first)
3. Complexity third (simple tasks to junior when possible)
