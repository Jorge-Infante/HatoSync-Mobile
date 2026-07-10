---
name: design-skill-stack
description: Route DevZeros design work across the project design system, production frontend skills, motion skills, and HyperFrames video skills. Use when a task asks which design skill to use, asks to organize design skills, or spans UI, prototype, motion, video, accessibility, and visual quality guidance.
---

# Design Skill Stack

Use this skill as a routing layer, not as a replacement for the specialized skills.

## Default Order

1. Load `devzeros-design-system` for any DevZeros product UI, styling, layout, or visual decision.
2. Add `frontend-design` and `uncodixfy` for production-grade web UI, HTML/CSS/React surfaces, and anti-generic visual polish.
3. Add `ui`, `ux`, `ui-architecture`, `systems`, or `prototyping` when the work is design strategy, user flow, component architecture, design tokens, or prototype structure.
4. Add `animation` plus the relevant `gsap-*` skill for in-app motion.
5. Add `accessibility` and `seo` when the output affects public pages, keyboard/screen-reader behavior, or search visibility.
6. Add `hyperframes` and `hyperframes-cli` only for HTML-native video, title cards, captions, voiceover, motion graphics, or rendered MP4 deliverables.

## HyperFrames Routing

- `hyperframes`: author HTML video compositions, scenes, captions, transitions, and motion.
- `hyperframes-cli`: scaffold, lint, inspect, preview, render, transcribe, TTS, and troubleshoot HyperFrames projects.
- `hyperframes-registry`: install and wire reusable HyperFrames blocks/components.
- `website-to-hyperframes`: turn an existing website into a storyboarded HyperFrames video.
- `remotion-to-hyperframes`: port Remotion/React video compositions to HyperFrames HTML.
- `gsap`: use only as the HyperFrames-scoped GSAP reference. For app animation, prefer the existing `gsap-core`, `gsap-react`, `gsap-timeline`, `gsap-scrolltrigger`, `gsap-performance`, `gsap-plugins`, `gsap-frameworks`, and `gsap-utils` skills.

## Huashu Design Status

Huashu Design is useful as a research reference for HTML-native prototypes, design variants, critique, and slide/video workflows, but the upstream license is personal-use only and requires written authorization for company, team, customer, or commercial use.

Do not install, copy, or use the full upstream `huashu-design` skill for DevZeros company/customer work unless commercial authorization is obtained first. Use the project-native stack above and HyperFrames for Apache-2.0 video workflows.

## Evidence

See `devzeros-ai-office/docs/runbooks/design-skill-stack.md` for the researched inventory, source links, and installation notes.
