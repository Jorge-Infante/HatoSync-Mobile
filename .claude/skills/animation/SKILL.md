---
name: animation
description: Implementing micro-interactions, page transitions, and loading states with motion design principles.
agent_ids: [alex]
---

# Animation Skill

Implement micro-interactions, page transitions, and loading states with motion design principles.

## Animation Principles

### 1. Purpose
Every animation should serve a purpose:
- **Feedback**: Confirm user action (button press)
- **orientation**: Show where user is (page transition)
- **demonstration**: Explain how to use (tooltip)
- **delight**: Add personality (success celebration)

### 2. Timing
```typescript
const timing = {
  instant: '100ms',      // micro-interactions
  fast: '150ms',         // hover states
  normal: '250ms',      // standard transitions
  slow: '400ms',        // page transitions
  deliberate: '600ms',   // complex animations
};

// Easing
const easing = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)',  // Most animations
  enter: 'cubic-bezier(0, 0, 0.2, 1)',         // Elements entering
  exit: 'cubic-bezier(0.4, 0, 1, 1)',           // Elements leaving
  bounce: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)', // Playful
};
```

## Animation Patterns

### 1. Hover Effects
```css
.button {
  transition: transform 150ms ease, background-color 150ms ease;
}

.button:hover {
  transform: translateY(-1px);
  background-color: var(--color-primary-dark);
}

.button:active {
  transform: translateY(0);
}
```

### 2. Page Transitions
```tsx
const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
};

function PageTransition({ children }: Props) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  );
}
```

### 3. Loading States
```tsx
// Skeleton
function UserCardSkeleton() {
  return (
    <div className="skeleton">
      <div className="skeleton-avatar" />
      <div className="skeleton-text" />
      <div className="skeleton-text short" />
    </div>
  );
}

// Spinner
function LoadingSpinner({ size = 'md' }: Props) {
  return (
    <motion.div
      className={`spinner spinner-${size}`}
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    />
  );
}
```

### 4. Staggered List Animation
```tsx
const listVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

function AnimatedList({ items }: Props) {
  return (
    <motion.ul variants={listVariants} initial="hidden" animate="visible">
      {items.map(item => (
        <motion.li key={item.id} variants={itemVariants}>
          {item.name}
        </motion.li>
      ))}
    </motion.ul>
  );
}
```

## Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Animation Checklist

```yaml
animation_review:
  performance:
    - use_transform_opacity: true
    - no_layout_thrashing: true
    - will_change_used_sparingly: true
    - compositor_thread_only: true
  
  accessibility:
    - reduced_motion_respected: true
    - no_flashing_content: true
    - duration_not_excessive: true
  
  user_experience:
    - purposeful: true
    - not_distracting: true
    - consistent_timing: true
```
