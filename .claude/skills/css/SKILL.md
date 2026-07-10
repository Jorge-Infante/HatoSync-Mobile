---
name: css
description: CSS expertise including variables, Flexbox, Grid, BEM methodology, and responsive design.
agent_ids: [alex]
---

# CSS Skill

CSS expertise including variables, Flexbox, Grid, BEM methodology, and responsive design.

## CSS Variables

```css
:root {
  /* Colors */
  --color-primary: #3B82F6;
  --color-primary-dark: #2563EB;
  --color-primary-light: #60A5FA;
  
  /* Typography */
  --font-family: 'Inter', system-ui, sans-serif;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  
  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  
  /* Shadows */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
  
  /* Transitions */
  --transition-fast: 150ms ease;
  --transition-normal: 250ms ease;
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  :root {
    --color-background: #1F2937;
    --color-text: #F9FAFB;
  }
}
```

## Flexbox Patterns

```css
/* Center content */
.center {
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Space between */
.space-between {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Stack vertically */
.stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

/* Responsive wrap */
.flex-wrap {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
}
```

## Grid Patterns

```css
/* Auto-fit grid */
.auto-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-6);
}

/* Dashboard layout */
.dashboard {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
  grid-template-areas:
    "sidebar header"
    "sidebar main"
    "sidebar footer";
  min-height: 100vh;
}

/* Responsive grid */
.responsive-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--space-4);
}

@media (min-width: 768px) {
  .responsive-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 1024px) {
  .responsive-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
```

## BEM Methodology

```css
/* Block */
.card { }

/* Element */
.card__header { }
.card__body { }
.card__footer { }
.card__title { }
.card__image { }

/* Modifier */
.card--highlighted { }
.card--disabled { }
.card__button--primary { }
.card__button--secondary { }

/* Nested */
.card__header .card__title { }
.card__body .card__text { }
```

## Responsive Breakpoints

```css
/* Mobile first approach */
/* Base: Mobile (0 - 639px) */

/* Small: Tablet portrait (640px - 767px) */
@media (min-width: 640px) { }

/* Medium: Tablet landscape (768px - 1023px) */
@media (min-width: 768px) { }

/* Large: Desktop (1024px - 1279px) */
@media (min-width: 1024px) { }

/* Extra Large: Large desktop (1280px+) */
@media (min-width: 1280px) { }
```

## CSS Checklist

```yaml
css_review:
  variables:
    - design_tokens_extracted: true
    - no_hardcoded_values: true
    - semantic_naming: true
  
  layout:
    - flexbox_for_1d: true
    - grid_for_2d: true
    - no_float_for_layout: true
  
  responsive:
    - mobile_first: true
    - breakpoints_consistent: true
    - no_horizontal_scroll: true
  
  performance:
    - minimal_specificity: true
    - no_unused_styles: true
    - critical_css_extracted: true
```
