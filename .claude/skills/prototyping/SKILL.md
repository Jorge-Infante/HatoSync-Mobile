---
name: prototyping
description: Creating interactive prototypes for user testing and stakeholder validation.
agent_ids: [morgan]
---

# Prototyping Skill

Create interactive prototypes for user testing and stakeholder validation.

## Prototype Types

### 1. Low-Fidelity (Wireframes)
```yaml
low_fidelity:
  tools: [Figma, Balsamiq, Pen + Paper]
  purpose: "Layout, structure, flow"
  fidelity: "Minimal visual design"
  time: "30 min - 2 hours"
```

### 2. Mid-Fidelity
```yaml
mid_fidelity:
  tools: [Figma, Sketch]
  purpose: "Interactions, basic styling"
  fidelity: "Grayscale, no images"
  time: "2-8 hours"
```

### 3. High-Fidelity
```yaml
high_fidelity:
  tools: [Figma, Adobe XD, Principle]
  purpose: "Visual design, micro-interactions"
  fidelity: "Final colors, typography, assets"
  time: "8-40 hours"
```

## Figma Workflow

### Auto Layout
```yaml
auto_layout:
  purpose: "Responsive components"
  
  settings:
    - width: hug_contents / fill_container
    - height: hug_contents / fixed
    - gap: 16
    - padding: 16
    - alignment: center / left / right
```

### Interactive Components
```yaml
component_interactions:
  hover:
    trigger: "On hover"
    action: "Smart animate"
    properties: [fill, opacity]
  
  click:
    trigger: "On click"
    action: "Open overlay"
    target: [Component name]
  
  scroll:
    trigger: "While scrolling"
    action: "stick to viewport"
```

## Prototype Handoff

### Developer Handoff Notes
```markdown
## Component: Modal

**States:**
- Default: Centered, overlay visible
- Full screen: Below 768px breakpoint
- Loading: Spinner in body
- Error: Error message in body

**Interactions:**
- Click overlay → Close modal
- Escape key → Close modal
- Tab navigation → Constrained within modal

**Spacing:**
- Header padding: 24px
- Body padding: 16px
- Footer padding: 16px
```

### Annotation Standards
```yaml
annotations:
  style: "Callout boxes with numbers"
  placement: "Outside the design"
  content:
    - Interaction description
    - Edge cases
    - States
    - Responsive behavior
```

## Prototype Testing

### Test Script
```yaml
test_script:
  introduction:
    - "Thank you for coming"
    - "We're testing the design, not you"
    - "Think aloud protocol"
  
  tasks:
    - id: 1
      task: "Find and purchase a product"
      success: "Completed in < 3 min"
    
    - id: 2
      task: "Track your order"
      success: "Completed in < 1 min"
  
  follow_up:
    - "What was confusing?"
    - "What worked well?"
    - "Any suggestions?"
```

## Prototype Checklist

```yaml
prototype_review:
  functionality:
    - all_links_work: true
    - all_states_reachable: true
    - no_dead_ends: true
    - responsive_behavior: true
  
  usability:
    - clear_navigation: true
    - logical_flow: true
    - error_states_handled: true
    - loading_states_shown: true
  
  handoff:
    - annotations_complete: true
    - states_documented: true
    - interactions_documented: true
```
