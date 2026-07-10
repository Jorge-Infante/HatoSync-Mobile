---
name: ui-architecture
description: Designing scalable UI component architectures with design systems and atomic design patterns.
agent_ids: [alex]
---

# UI Architecture Skill

Design scalable UI structures that fit the repo you are actually working in.

## In DevZeros

- prefer existing feature boundaries over forcing a pure atomic-design folder taxonomy
- keep components close to the surfaces they serve unless reuse is clear
- split large TSX files when doing so improves clarity and ownership
- preserve shared contracts and avoid duplicate abstractions

## Component API Rules

- keep props small and explicit
- represent states clearly: loading, empty, error, success
- design for CSS-variable theming and vanilla CSS
- avoid component APIs that assume Tailwind or utility-class composition
- when shared types matter, inspect consumers before changing contracts

## Layout Architecture

- respect the office shell and other established page structures
- keep navigation, main workspace, and secondary rails clearly separated when they exist
- do not invent a second design system through ad hoc component patterns

## State Architecture

- keep local state local unless reuse or coordination requires lift
- follow existing repo patterns for async state and shared context
- do not optimize prematurely with abstraction or memoization layers

## Review Checklist

- structure matches existing project patterns
- component boundaries are understandable
- API surface is not larger than necessary
- states are fully represented
- CSS integration is straightforward
- shared contracts remain safe for both backend and frontend consumers
