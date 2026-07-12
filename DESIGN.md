---
version: alpha
name: Braun
description: Industrial-design grid: concrete grey, utility orange stroke.
colors:
  primary: "#0F1113"
  secondary: "#6B6F74"
  tertiary: "#D95600"
  neutral: "#E7E5E1"
  surface: "#F3F1EC"
  on-primary: "#F3F1EC"
typography:
  display:
    fontFamily: Inter
    fontSize: 3.5rem
    fontWeight: 500
    letterSpacing: "-0.02em"
  h1:
    fontFamily: Inter
    fontSize: 1.9rem
    fontWeight: 500
  body:
    fontFamily: Inter
    fontSize: 0.95rem
    lineHeight: 1.55
  label:
    fontFamily: JetBrains Mono
    fontSize: 0.72rem
    letterSpacing: "0.08em"
rounded:
  sm: 0px
  md: 2px
  lg: 4px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
components:
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: 12px 20px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    rounded: "{rounded.lg}"
    padding: 24px
---
## Overview

An industrial-design portfolio palette: concrete grey, single utility-orange stroke, disciplined grid.

## Colors

The palette is built around high-contrast neutrals and a single accent that drives interaction.

- **Primary (`#0F1113`):** Headlines and core text.
- **Secondary (`#6B6F74`):** Borders, captions, and metadata.
- **Tertiary (`#D95600`):** The sole driver for interaction. Reserve it.
- **Neutral (`#E7E5E1`):** The page foundation.

## Typography

- **display:** Inter 3.5rem
- **h1:** Inter 1.9rem
- **body:** Inter 0.95rem
- **label:** JetBrains Mono 0.72rem

## Do's and Don'ts

- **Do** use Tertiary for exactly one action per screen.
- **Do** let Neutral carry the composition — negative space is a feature.
- **Don't** introduce gradients. This system is flat on purpose.
- **Don't** mix Tertiary with alternate accents; the single-accent rule is load-bearing.

## Provenance & application

Installed from the DESIGN.md directory (https://designdotmd.directory) via
`npx designdotmd add dieter-grid` (Google Labs DESIGN.md format), then moved
to the repo root so the brand layer's source of truth ships with the code.

This spec lands in the codebase exclusively through the token tiers in
`packages/ui/src/styles/globals.css` — components never see it. Deliberate
deviations (each documented at the token that makes it): amber stays as the
at-risk middle of the urgency ramp; text inks use AA-solved ramp steps where
the spec literals fail 4.5:1 on their own surfaces (secondary #6B6F74 and
tertiary #D95600 remain in the ramp as large-type/fill values); borders are
a quiet concrete hairline rather than secondary-strength grid strokes; the
dark theme is an authored inversion the spec does not ship.
