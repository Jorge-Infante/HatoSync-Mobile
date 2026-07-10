---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.
license: Complete terms in LICENSE.txt
---

# Frontend Design

Create polished, memorable frontend work without falling into generic AI UI patterns.

In DevZeros, this skill is a creative layer, not the source of truth. When working inside this repo:

- `devzeros-design-system` defines canonical tokens, fonts, spacing, and product visual rules
- `uncodixfy` blocks generic AI dashboard moves
- this skill helps choose a strong concept and execute it with intent

## Design Process

Before coding, decide:

1. surface type
   - operator dashboard / office UI
   - auth or workflow surface
   - landing / marketing surface
   - creative or showcase artifact
2. user intent
   - scan and act quickly
   - evaluate and trust
   - explore and discover
   - feel a strong brand impression
3. design direction
   - strict and readable
   - refined and premium
   - expressive and high-energy
   - atmospheric and immersive

Pick one dominant idea. A clear point of view beats a pile of decorative tricks.

## Use What UI/UX Pro Max Gets Right

Adopt these ideas selectively:

- choose design direction from product context, not random taste
- identify anti-patterns before implementation, not after
- keep a pre-delivery checklist for motion, contrast, responsiveness, and product fit
- avoid using charts, metrics, badges, or sections as decoration when they do not serve the feature
- let product category shape the mood: trust-sensitive, creative, operational, premium, playful, etc.

## DevZeros-Specific Rules

- do not override canonical fonts or tokens defined by `devzeros-design-system`
- preserve the office shell and existing product layout language unless the task explicitly changes it
- for dashboard or office surfaces, prioritize hierarchy and scanability over theatrics
- for marketing surfaces, stronger composition and atmosphere are fine, but still keep them brand-aligned
- all user-facing strings must be compatible with repo i18n and chosen product language

## Composition Guidelines

- Typography: build clear hierarchy first, then character
- Color: use dominant surfaces plus restrained accents; avoid timid rainbow palettes
- Motion: emphasize one or two meaningful moments rather than sprinkling motion everywhere
- Layout: allow asymmetry or density only when it improves the concept or flow
- Detail: borders, spacing, shadows, and interaction states should feel intentional, not accidental

## Common Anti-Patterns

- fake KPI cards as the default dashboard move
- hero-strip copy blocks inside app screens
- decorative charts with made-up data
- blur, glow, or glass used to fake polish
- startup filler copy that could belong to any product
- visual style chosen because it is easy for an AI to generate

## Pre-Delivery Checklist

- desktop and mobile both feel designed, not just responsive
- loading, error, empty, hover, focus, active, and disabled states are covered where relevant
- motion respects `prefers-reduced-motion`
- contrast and focus visibility remain solid
- copy sounds like this product, not like a template
- the result feels specific enough that someone could remember it
