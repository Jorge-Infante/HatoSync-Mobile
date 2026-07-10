---
name: systems
description: Design system architecture, component library organization, and token-based design.
agent_ids: [morgan]
---

# Design Systems Skill

Design system architecture, component library organization, and token-based design.

## Design System Architecture

### Token Hierarchy
```yaml
tier_1_primitives:
  description: "Raw values"
  examples:
    - blue-500: "#3B82F6"
    - font-size-base: 16
    - space-4: 16

tier_2_semantic:
  description: "Meaningful aliases"
  examples:
    - color-primary: blue-500
    - text-body: gray-700
    - spacing-component: space-4

tier_3_component:
  description: "Component-specific"
  examples:
    - button-bg-primary: color-primary
    - input-border-default: gray-300
    - card-padding: spacing-component
```

### Component Categories
```yaml
components:
  primitives:
    - Button
    - Input
    - Select
    - Checkbox
    - Radio
    - Badge
    - Avatar
    - Icon
  
  composite:
    - FormField
    - SearchBar
    - SelectDropdown
    - DatePicker
    - Modal
    - Drawer
    - Toast
  
  patterns:
    - DataTable
    - Form
    - Navigation
    - Card
    - EmptyState
```

## Component Documentation

### Props Documentation
```typescript
interface ButtonProps {
  /** Button label content */
  children: React.ReactNode;
  
  /** Visual variant */
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  
  /** Size */
  size?: 'sm' | 'md' | 'lg';
  
  /** Disabled state */
  disabled?: boolean;
  
  /** Loading state */
  isLoading?: boolean;
  
  /** Click handler */
  onClick?: (event: React.MouseEvent) => void;
}
```

### State Documentation
```yaml
component_states:
  button:
    default:
      bg: primary
      text: white
    hover:
      bg: primary-dark
    active:
      bg: primary-darker
    disabled:
      bg: gray-300
      text: gray-500
      cursor: not-allowed
    loading:
      bg: primary
      opacity: 0.7
      spinner: visible
```

## Design Token JSON

```json
{
  "color": {
    "primary": {
      "50": "#EFF6FF",
      "100": "#DBEAFE",
      "200": "#BFDBFE",
      "300": "#93C5FD",
      "400": "#60A5FA",
      "500": "#3B82F6",
      "600": "#2563EB",
      "700": "#1D4ED8",
      "800": "#1E40AF",
      "900": "#1E3A8A"
    }
  },
  "typography": {
    "fontFamily": {
      "sans": "Inter, system-ui, sans-serif",
      "mono": "JetBrains Mono, monospace"
    },
    "fontSize": {
      "xs": "0.75rem",
      "sm": "0.875rem",
      "base": "1rem",
      "lg": "1.125rem",
      "xl": "1.25rem",
      "2xl": "1.5rem"
    }
  },
  "spacing": {
    "1": "0.25rem",
    "2": "0.5rem",
    "3": "0.75rem",
    "4": "1rem",
    "6": "1.5rem",
    "8": "2rem"
  }
}
```

## Versioning

```yaml
versioning:
  strategy: SemVer
  
  breaking_changes:
    - removing_token: true
    - changing_token_value: true
    - removing_component: true
    - changing_component_api: true
  
  backwards_compatible:
    - adding_token: true
    - adding_component_variant: true
    - adding_component_prop: true
    - deprecating_with_warning: true
```

## Design System Checklist

```yaml
design_system_review:
  tokens:
    - primitives_well_organized: true
    - semantic_tokens_defined: true
    - component_tokens_defined: true
    - documentation_complete: true
  
  components:
    - props_typed: true
    - states_documented: true
    - variants_available: true
    - accessibility_built_in: true
  
  governance:
    - contribution_guide: true
    - deprecation_policy: true
    - versioning_strategy: true
```
