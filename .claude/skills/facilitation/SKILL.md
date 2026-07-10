---
name: facilitation
description: Leading planning sessions, mediating discussions, and driving consensus on decisions.
agent_ids: [taylor]
---

# Facilitation Skill

Lead planning sessions, mediate discussions, and drive consensus on decisions.

## Meeting Types

### 1. Sprint Planning
```yaml
sprint_planning:
  duration: 2-4 hours
  participants: [team leads, dev team]
  agenda:
    - review_previous_sprint: 15min
    - prioritize_backlog: 30min
    - capacity_planning: 30min
    - assign_stories: 60min
    - define_sprint_goal: 15min
    - risks_and_blockers: 15min
  outcomes:
    - sprint_goal
    - committed_stories
    - sprint_backlog
```

### 2. Backlog Refinement
```yaml
refinement:
  duration: 1 hour
  frequency: twice per sprint
  participants: [dev team, product]
  agenda:
    - review_upcoming_stories: 30min
    - estimate_complexity: 20min
    - clarify_requirements: 10min
  outcomes:
    - refined_stories
    - acceptance_criteria
    - effort_estimates
```

### 3. Retrospective
```yaml
retrospective:
  duration: 1.5 hours
  format: "Start-Stop-Continue"
  participants: [full team]
  agenda:
    - start_doing: 20min
    - stop_doing: 20min
    - continue_doing: 20min
    - action_items: 20min
  outcomes:
    - action_items
    - process_improvements
```

## Facilitation Techniques

### 1. Timeboxing
- Set strict time limits for each agenda item
- Use visible timer
- Move to next topic when time expires

### 2. Round Robin
- Give everyone chance to speak
- Go around the table or virtual room
- No interruptions

### 3. Fist of Five
```yaml
fist_of_five:
  1: "I need major changes"
  2: "I have concerns"
  3: "I'm okay with this"
  4: "I'm good, could be better"
  5: "Best thing ever"
```

### 4. Parking Lot
```yaml
parking_lot:
  description: "Hold off-topic items for later"
  process:
    - note_item
    - defer_discussion
    - address_after_main_agenda
```

## Consensus Building

### Gradual Consensus
1. Present proposal
2. Identify concerns (round robin)
3. Address concerns
4. Check for agreement (fist of five)
5. If blocked, escalate or vote

### Decision Tree
```yaml
decision:
  can_we_decide_now:
    yes → document_decision
    no → is_it_blocking
      yes → escalate
      no → park_for_later
```

## Meeting Roles

| Role | Responsibilities |
|------|------------------|
| Facilitator | Guide discussion, enforce timebox |
| Note Taker | Record decisions and actions |
| Timekeeper | Monitor time, signal warnings |
| Escalator | Handle blocked decisions |
