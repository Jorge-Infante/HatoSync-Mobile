---
name: devzeros-design-system
description: DevZeros AI Office unified design system. Use this skill whenever generating frontend UI code, styling components, or making visual design decisions for the DevZeros project. Defines the canonical color palette, typography, spacing, component patterns, and visual language.
---

# DevZeros AI Office Design System

This is the **single source of truth** for all visual design decisions in the DevZeros AI Office project. When building or modifying frontend UI, follow these specifications exactly.

## Design Philosophy

DevZeros is a **professional SaaS dashboard** with a 2.5D visual office layer. The visual language is:

- **Dark-first**: Deep blue-black backgrounds with layered surfaces
- **Refined, not flashy**: Polished and professional, not generic AI aesthetic
- **Atmospheric**: Subtle glassmorphism, ambient glows, and depth through layering
- **Purposeful motion**: Animations serve UX goals, not decoration
- **Consistent**: One unified token system across all views

## Decision Order

When making visual decisions in DevZeros, use this order:

1. existing product patterns in the touched surface
2. canonical rules in this skill
3. anti-generic filtering from `uncodixfy`
4. creative direction from `frontend-design` when it does not conflict with 1-2

The product should feel intentional and cohesive, not like multiple UI philosophies stitched together.

### When to Apply These Rules

| Context | Apply? | Notes |
|---------|--------|-------|
| Dashboard UI | Yes | Full compliance |
| Modals, panels, forms | Yes | Full compliance |
| Landing page | Partially | Marketing sections may use bolder gradients |
| Phaser/Canvas office | No | Pixel art layer has its own visual logic |
| Auth pages | Yes | Accent may shift to green for trust |

---

## 1. Color Palette (Canonical Tokens)

### Backgrounds (dark scale)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg` | `#070a10` | Deepest background, page body |
| `--surface` | `#0d1117` | Primary surface, main panels |
| `--surface-2` | `#131720` | Elevated cards, secondary panels |
| `--surface-3` | `#1a2030` | Highest elevation, popovers |

### Borders

| Token | Value | Usage |
|-------|-------|-------|
| `--line` | `#1e2535` | Subtle dividers, default borders |
| `--line-2` | `#252d3d` | Stronger borders, active states |
| `--line-alpha` | `rgba(255,255,255,0.07)` | Glassmorphism card borders |
| `--line-hover` | `rgba(255,255,255,0.12)` | Hover border state |

### Brand Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--primary` | `#8b5cf6` | Primary actions, active states, key accents |
| `--primary-dim` | `#7c3aed` | Pressed/darker primary |
| `--primary-hi` | `#a78bfa` | Lighter primary, hover glow |
| `--primary-glow` | `rgba(139,92,246,0.15)` | Primary ambient glow |
| `--primary-soft` | `rgba(139,92,246,0.08)` | Very subtle primary tint |
| `--secondary` | `#3b82f6` | Secondary actions, links, info states |
| `--secondary-hi` | `#60a5fa` | Lighter secondary |
| `--accent` | `#f472b6` | Highlight, notifications, brand moments |
| `--accent-dim` | `#ec4899` | Pressed accent |

### Semantic Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--ok` | `#22c55e` | Success, online, complete |
| `--warn` | `#f59e0b` | Warning, in-progress, caution |
| `--danger` | `#ef4444` | Error, destructive, offline |
| `--info` | `#3b82f6` | Informational (same as secondary) |
| `--cyan` | `#06b6d4` | Tertiary accent, data viz |
| `--purple` | `#a855f7` | Tags, categories, NPC roles |

### Text Colors

| Token | Value | Usage |
|-------|-------|-------|
| `--text` | `#e8eaf0` | Primary text |
| `--text-dim` | `#8b96ac` | Secondary text, descriptions |
| `--muted` | `#5a637a` | Disabled, placeholder, meta |

---

## 2. Typography

### Font Stack

| Role | Font Family | Fallback |
|------|------------|----------|
| **UI** | `'Space Grotesk'` | `system-ui, -apple-system, sans-serif` |
| **Code** | `'JetBrains Mono'` | `'Fira Code', monospace` |

Do **not** use Inter, Roboto, Arial, or generic system fonts for UI text. Space Grotesk is the project's typographic identity.

### Size Scale (tokens)

| Token | Value | Usage |
|-------|-------|-------|
| `--font-2xs` | `9px` | Tiny labels, fine print |
| `--font-xs` | `11px` | Meta text, timestamps, uppercase labels |
| `--font-sm` | `12px` | Secondary labels, badges |
| `--font-base` | `14px` | Body text, inputs, buttons |
| `--font-md` | `15px` | Emphasized body text |
| `--font-lg` | `18px` | Section headings |
| `--font-xl` | `20px` | Page headings |
| `--font-2xl` | `32px` | Hero/feature headings (landing only) |

### Weight Usage

| Weight | Name | Usage |
|--------|------|-------|
| `300` | Light | Decorative taglines, landing page subtext |
| `400` | Regular | Body text, descriptions |
| `500` | Medium | Nav items, secondary labels, emphasized text |
| `600` | Semibold | Buttons, section headers, active labels |
| `700` | Bold | Page headings, brand marks, uppercase tags |

### Text Patterns

- **Uppercase labels**: `text-transform: uppercase; letter-spacing: 0.08em; font-size: var(--font-xs); font-weight: 700; color: var(--muted);`
- **Monospace labels**: `font-family: var(--font-code); font-size: var(--font-xs); letter-spacing: 0.04em;`
- **Truncation**: `overflow: hidden; text-overflow: ellipsis; white-space: nowrap;`
- **Body line-height**: `1.5`
- **Heading line-height**: `1.2`

---

## 3. Spacing Scale

Use multiples of 4px. Prefer these values:

| Token | Value |
|-------|-------|
| `--space-1` | `4px` |
| `--space-2` | `8px` |
| `--space-3` | `12px` |
| `--space-4` | `16px` |
| `--space-5` | `20px` |
| `--space-6` | `24px` |
| `--space-8` | `32px` |
| `--space-10` | `40px` |
| `--space-12` | `48px` |
| `--space-16` | `64px` |

### Common Patterns

- Component internal padding: `12px` or `16px`
- Card padding: `16px` to `24px`
- Section gaps: `24px` to `32px`
- Page margin: `32px` to `48px`
- Compact element gaps (badge row, tag list): `6px` to `8px`
- Form field gaps: `12px` to `16px`

---

## 4. Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `--radius-xs` | `4px` | Small chips, code blocks, inline elements |
| `--radius-sm` | `6px` | Buttons, small cards, inputs |
| `--radius-md` | `8px` | Standard cards, inputs, dropdowns |
| `--radius-lg` | `12px` | Large cards, modals, panels |
| `--radius-xl` | `16px` | Hero cards, feature panels |
| `--radius-pill` | `999px` | Pill badges, toggle switches |
| `--radius-full` | `50%` | Avatars, status dots, circular icons |

**Limit**: Do not use border-radius above `16px` on dashboard components. `20px+` is reserved for landing page decorative elements only.

---

## 5. Shadows

| Name | Value | Usage |
|------|-------|-------|
| **subtle** | `0 2px 8px rgba(0,0,0,0.3)` | Default card shadow |
| **medium** | `0 8px 24px rgba(0,0,0,0.4)` | Elevated panels, dropdowns |
| **heavy** | `0 16px 48px rgba(0,0,0,0.6)` | Modals, floating panels |
| **primary-glow** | `0 0 12px var(--primary-glow)` | Primary action hover |
| **accent-glow** | `0 0 12px rgba(244,114,182,0.15)` | Accent elements |
| **inset** | `0 0 0 1px rgba(255,255,255,0.04) inset` | Inner border effect on glass cards |

### Composite Shadow (modals)

```css
box-shadow:
  0 0 0 1px var(--line),
  0 16px 48px rgba(0,0,0,0.6),
  0 0 80px var(--primary-glow);
```

---

## 6. Glassmorphism Rules

Glassmorphism is used **selectively** in DevZeros for depth and atmosphere. It is NOT the default surface style.

### When to Use

- Floating overlays (modals, popovers, tooltips)
- Navigation bars (topbar, sidebar headers)
- Cards that float over a visual background (office canvas)

### When NOT to Use

- Standard content cards in a dashboard grid
- Form containers
- Table wrappers
- Main content panels

### Implementation

```css
/* Light glass */
background: rgba(13, 17, 23, 0.85);
backdrop-filter: blur(12px);
border: 1px solid var(--line-alpha);

/* Heavy glass (modals, overlays) */
background: rgba(7, 10, 16, 0.92);
backdrop-filter: blur(20px);
border: 1px solid var(--line-alpha);
```

Always include a solid border for definition. Never rely on blur alone.

---

## 7. Component Patterns

### Cards

```css
.card {
  background: var(--surface-2);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}
.card:hover {
  border-color: var(--line-2);
  box-shadow: 0 4px 16px rgba(0,0,0,0.3);
}
```

### Buttons

```css
/* Primary */
.btn-primary {
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: var(--radius-sm);
  padding: 8px 16px;
  font-weight: 600;
  font-size: var(--font-base);
  transition: all 0.15s ease;
}
.btn-primary:hover {
  background: var(--primary-hi);
  box-shadow: 0 0 16px var(--primary-glow);
  transform: translateY(-1px);
}

/* Secondary */
.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--line);
  border-radius: var(--radius-sm);
  padding: 8px 16px;
}
.btn-secondary:hover {
  border-color: var(--line-2);
  background: var(--surface-2);
}

/* Ghost */
.btn-ghost {
  background: transparent;
  color: var(--text-dim);
  border: none;
  padding: 6px 10px;
}
.btn-ghost:hover {
  color: var(--text);
  background: rgba(255,255,255,0.04);
}
```

### Inputs

```css
.input {
  background: rgba(255,255,255,0.04);
  border: 1px solid var(--line);
  border-radius: var(--radius-md);
  padding: 10px 12px;
  color: var(--text);
  font-size: var(--font-base);
  transition: border-color 0.15s ease;
}
.input:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-soft);
}
.input::placeholder {
  color: var(--muted);
}
```

### Tags / Badges

```css
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: var(--font-xs);
  font-weight: 600;
  border-radius: var(--radius-xs);
  background: var(--primary-soft);
  color: var(--primary-hi);
}
```

### Status Indicators

```css
.status-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--ok);
  box-shadow: 0 0 6px var(--ok);
}
```

### Modals

```css
.modal-overlay {
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(8px);
}
.modal {
  background: var(--surface);
  border: 1px solid var(--line);
  border-radius: var(--radius-lg);
  box-shadow: 0 16px 48px rgba(0,0,0,0.6);
  max-width: 560px;
  width: 90%;
}
```

### Scrollbars

```css
::-webkit-scrollbar { width: 4px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--line-2);
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover { background: var(--muted); }
```

---

## 8. Layout System

### Primary Layout (3-Column Office Shell)

```css
.shell {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr) 300px;
  grid-template-rows: 56px 1fr;
  height: 100vh;
}
```

### Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| `> 1500px` | Full 3-column layout |
| `1280-1500px` | Compressed sidebars (220px / 280px) |
| `1024-1280px` | Right panel collapses, 2-column |
| `< 1024px` | Single-column stacked layout |
| `< 768px` | Mobile optimizations |

### Panel Widths

| Element | Width |
|---------|-------|
| Left sidebar | `240px` (compact: `220px`) |
| Right panel | `300px` (compact: `280px`) |
| Studio sidebar | `260px` |
| Studio guide | `288px` |
| NPC Builder sidebar | `260px` |
| NPC Builder config | `280px` |
| Max content width | `1400px` |

---

## 9. Transitions and Motion

### Timing

| Name | Duration | Usage |
|------|----------|-------|
| **instant** | `100ms` | Color changes, opacity |
| **fast** | `150ms` | Hover states, small interactions |
| **standard** | `200ms` | Most UI transitions |
| **deliberate** | `300ms` | Panel open/close, layout shifts |
| **slow** | `500ms` | Page transitions, entrance animations |

### Easing

| Name | Value | Usage |
|------|-------|-------|
| **default** | `ease` | General purpose |
| **smooth** | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard motion |
| **enter** | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering view |
| **exit** | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving view |

### Rules

- Prefer `transform` and `opacity` for animations (GPU-composited)
- Use `will-change` sparingly and only on actively animated elements
- Respect `prefers-reduced-motion`: disable all non-essential animations
- Button hover: `translateY(-1px)` max lift
- Card hover: `translateY(-2px)` max lift, no more

---

## 10. Gradients and Decorative Effects

### Background Gradients (landing/marketing only)

```css
/* Ambient glow orb */
.glow-orb {
  position: absolute;
  width: 400px;
  height: 400px;
  background: radial-gradient(circle, var(--primary-glow), transparent 70%);
  filter: blur(80px);
  pointer-events: none;
}
```

### Text Gradients (headings only, landing)

```css
.gradient-text {
  background: linear-gradient(135deg, var(--primary-hi), var(--secondary));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Rules

- Dashboard UI: **no decorative gradients**. Use solid colors.
- Landing page: gradients allowed for hero section, CTAs, and atmospheric effects.
- Never use gradient backgrounds on buttons in dashboard context.
- Glow effects on hover only, never as a permanent state.

## Product-Fit Heuristics

### Office and Dashboard Surfaces

- prioritize scanability over theatrics
- prefer stable panels, clear grouping, and obvious operator hierarchy
- decoration should support orientation, not distract from action
- avoid fake KPIs, fake charts, and filler control-room visuals

### Marketing and Showcase Surfaces

- stronger visual concept is allowed
- expressiveness should come from composition, motion, and material treatment, not from abandoning token discipline
- keep typography and spacing consistent with the brand

### Trust-Sensitive Surfaces

- reduce unnecessary motion and decorative effects
- emphasize clarity, confidence, and unmistakable state communication
- make warnings, errors, and confirmations visually unambiguous

---

## 11. Existing CSS Variable Prefixes (Migration Guide)

The codebase currently uses per-component variable prefixes. When touching these files, gradually migrate to the canonical tokens above:

| File | Current Prefix | Migrate To |
|------|---------------|------------|
| `App.css` | `--bg`, `--surface`, `--accent` | Direct mapping (already close) |
| `LandingPage.css` | `--dz-*` | Keep scoped for landing specifics |
| `AuthLayout.css` | `--auth-*` | Migrate to canonical + auth-specific overrides |
| `ProjectStudio.css` | `--ps-*` | Migrate to canonical |
| `AssistantChat.css` | `--ac-*` | Migrate to canonical |
| `ProjectPage.css` | `--pg-*` | Migrate to canonical |
| `NpcBuilder.css` | `--nb-*` | Migrate to canonical |

Migration priority: **Do not break existing UI**. Migrate incrementally when touching a component. Never do a bulk find-replace.

---

## 12. Anti-Patterns (Do Not)

- Do not invent new CSS variable prefixes per component
- Do not use `border-radius` > 16px on dashboard elements
- Do not add glassmorphism to standard content cards
- Do not use decorative glow orbs in dashboard views
- Do not mix Inter/Roboto with Space Grotesk
- Do not create "hero sections" inside dashboard/app views
- Do not use eyebrow labels (`<small>` + uppercase) as section intros
- Do not add gradient backgrounds to standard buttons
- Do not use `box-shadow` > `0 8px 24px` on non-modal elements
- Do not add animations > 300ms for standard interactions
- Do not hardcode color hex values - always use CSS variables
- Do not create new `:root` variable blocks in component CSS files
- Do not insert decorative copy blocks or pseudo-hero sections inside app screens
- Do not use made-up metrics, charts, or status widgets to imply sophistication
- Do not overload sidebars or right rails with non-functional brand theater
- Do not let polish reduce readability, contrast, or operator trust

---

## 13. Accessibility Baseline

- Minimum contrast ratio: `4.5:1` for body text, `3:1` for large text
- `--text` (#e8eaf0) on `--surface` (#0d1117) = ~13:1 (passes)
- `--text-dim` (#8b96ac) on `--surface` (#0d1117) = ~6.5:1 (passes)
- `--muted` (#5a637a) on `--surface` (#0d1117) = ~3.5:1 (large text only)
- Focus indicators: `box-shadow: 0 0 0 3px var(--primary-soft)` on focus
- All interactive elements must have visible focus states
- Never remove `outline` without providing an alternative indicator

## Pre-Delivery Review

Before shipping UI work in this repo, confirm:

- the touched surface still matches the existing product language
- desktop and mobile behavior both feel deliberate
- loading, error, empty, hover, focus, active, and disabled states exist where relevant
- motion stays within project timing rules and respects reduced motion
- no hardcoded user-facing strings bypass i18n expectations
- the result feels product-specific rather than template-generated
