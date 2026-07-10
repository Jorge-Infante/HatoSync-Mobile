---
name: uncodixfy
description: Prevents generic AI/Codex UI patterns when generating frontend code. Use this skill whenever generating HTML, CSS, React, Vue, Svelte, or any frontend UI code to enforce clean, human-designed aesthetics inspired by Linear, Raycast, Stripe, and GitHub instead of typical AI-generated UI.
---

# Uncodixfy

Prevent generic AI UI.

This skill is not a style guide by itself. It is an anti-pattern filter. In DevZeros, it works under `devzeros-design-system`, not against it.

## Core Rule

If a visual decision feels like the default AI move, stop and choose the cleaner, more product-specific option.

## What To Block

- fake dashboard filler: invented KPIs, fake charts, empty control-room theatrics
- decorative copy blocks that explain obvious UI behavior
- pseudo-hero sections inside internal app screens
- oversized radii, pill overload, and over-soft geometry everywhere
- blur haze, glow fog, or glass shells used as the default surface treatment
- random premium-dark styling with no product reason
- ornamental sidebars, right rails, or badge clusters that add noise but no action
- layout choices made only to look expensive rather than to improve hierarchy
- generic startup copy, fake trust slogans, and headings that could fit any SaaS

## What Is Allowed In DevZeros

- dark blue-black surfaces
- selective glassmorphism on overlays and floating elements
- uppercase micro-labels when they fit the product language
- subtle ambient glow used sparingly
- stronger composition on landing surfaces

Those are allowed only when they follow the design system and remain functional.

## Practical Filters

Before shipping UI, ask:

1. Does this look like a real product screen or like an AI demo?
2. Would removing one decorative layer improve clarity?
3. Are the strongest visual elements actually the most important functional elements?
4. Is any chart, badge, or side panel here only to fill space?
5. Would a designer keep this if all placeholder content disappeared?

## Safer Defaults

- stable layouts over novelty for operator surfaces
- clear actions over ornamental labels
- restrained shadows over floating spectacle
- meaningful data density over fake visual complexity
- product-specific copy over generic inspirational text

## In This Repo

- preserve the office/product shell
- use the real design tokens and fonts
- keep panels and cards readable first
- avoid introducing a second visual language next to the existing one
- do not let polish reduce clarity, contrast, or operator trust
