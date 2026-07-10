---
name: prioritization
description: Prioritizing features and tasks using frameworks like MoSCoW, RICE, and Kano.
agent_ids: [taylor]
---

# Prioritization Skill

Prioritize features and tasks using frameworks like MoSCoW, RICE, and Kano.

## Prioritization Frameworks

### 1. MoSCoW Method

```yaml
moscow:
  must_have:
    description: "Non-negotiable requirements"
    examples:
      - User authentication
      - Core feature without which system doesn't work
    percentage: 60% of effort
  
  should_have:
    description: "Important but not critical"
    examples:
      - Performance optimization
      - Advanced search
    percentage: 20% of effort
  
  could_have:
    description: "Desirable but not necessary"
    examples:
      - UI polish
      - Extra documentation
    percentage: 15% of effort
  
  wont_have:
    description: "Explicitly not in scope"
    examples:
      - Future features
      - Deprioritized items
    percentage: 5% of effort
```

### 2. RICE Scoring

```yaml
rice:
  formula: "(Reach × Impact × Confidence) / Effort"
  
  factors:
    reach:
      description: "How many users affected per quarter?"
      unit: users
      
    impact:
      description: "How much does it affect users?"
      scale: [0.25, 0.5, 1, 2, 3]
      3 = massive improvement
      2 = significant improvement
      1 = minimal improvement
      0.25 = negligible
      0 = no change
      
    confidence:
      description: "How confident are we in estimates?"
      scale: [0.5, 0.8, 1.0]
      100% = high confidence
      80% = medium confidence
      50% = low confidence
      
    effort:
      description: "Person-months required"
      unit: months
```

### 3. Kano Model

```yaml
kano:
  categories:
    must_be:
      description: "Basic needs - absence causes dissatisfaction"
      example: "Login works"
      
    performance:
      description: "More is better - linear satisfaction"
      example: "Faster is better"
      
    delighters:
      description: "Unexpected extras - create excitement"
      example: "Voice commands"
```

## Decision Matrix

| Criteria | Weight | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| Business Value | 30% | 9 | 7 | 8 |
| Technical Effort | 20% | 5 | 6 | 4 |
| User Impact | 25% | 8 | 6 | 9 |
| Strategic Fit | 15% | 7 | 8 | 6 |
| Risk | 10% | 6 | 7 | 5 |
| **Weighted Total** | 100% | **7.35** | **6.8** | **6.9** |

## Prioritization Workflow

1. **List** all items to prioritize
2. **Score** using RICE framework
3. **Category** using MoSCoW
4. **Map** to Kano model
5. **Review** with stakeholders
6. **Finalize** priority order

## Priority Levels

```yaml
priority:
  p0_critical:
    score_range: 80-100
    timeline: Immediately
    criteria: Blocked work, security, data loss
    
  p1_high:
    score_range: 60-79
    timeline: This sprint
    criteria: Core features, major bugs
    
  p2_medium:
    score_range: 40-59
    timeline: Next sprint
    criteria: Important enhancements
    
  p3_low:
    score_range: 20-39
    timeline: Backlog
    criteria: Nice to have, polish
```
