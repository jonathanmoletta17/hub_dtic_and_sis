---
name: casa-civil-frontend-system
description: Shared frontend workflow and visual governance for Casa Civil operational applications. Use when implementing or reviewing UI in hub-operacional-web, gestao-carregadores-oficial, buscadores, dashboards, or future Casa Civil apps, especially for theming, design consistency, Storybook visual review, operational dashboards, shell/layout, chat surfaces, cards, modals, and contrast/accessibility stabilization.
---

# Casa Civil Frontend System

Use this skill when the task is about visual consistency, theme implementation, frontend review, or operational UI quality in Casa Civil applications.

This skill is a shared discipline, not a redesign generator.

## Start Here

1. Classify the work before editing:
   - `UI`
   - `Tooling`
   - `Runtime`
2. Inspect the real surface before proposing changes.
3. Identify whether the work is:
   - `theme`
   - `visual refinement`
   - `design consistency`
   - `new surface`
4. If the request is only `light mode`, do not turn it into redesign work.

## Mandatory Product Doctrine

- Preserve the current dark mode as protected baseline.
- Treat light mode as a parallel system, never as quick inversion.
- Preserve operational density and scanning speed.
- Prefer semantic tokens over hardcoded colors.
- Validate in Storybook before calling the runtime “done”.
- Validate again in the real app before calling the work “done”.

## Non-Negotiable Anti-Patterns

- Do not solve hierarchy mainly with low opacity text.
- Do not reuse dark shadows unchanged in light mode.
- Do not hardcode `bg-white`, `text-black`, `text-white` as structural fixes.
- Do not accept mixed-theme surfaces by accident.
- Do not declare success from functional tests alone.
- Do not redesign shells, headers, or navigation during a theme-only task.

## Canonical Workflow

1. Diagnose the target surface.
2. Inventory hardcoded colors, weak contrast, unstable clusters, and theme leaks.
3. Patch foundations first when the issue is systemic.
4. Patch the surface in small, reviewable steps.
5. Run Storybook tests and visual review.
6. Run the real app and compare dark vs light.
7. Record evidence and unresolved debt.

## Required Output Shape

For every significant frontend round, report:

1. diagnosis
2. target files
3. what changed
4. validation commands
5. runtime evidence
6. pending risks

## Surface Archetypes

Use these archetypes when reviewing or implementing:

- `auth`
- `selector`
- `dashboard`
- `ticket-list`
- `ticket-detail`
- `agent-chat`
- `portal`
- `modal-form`

Read the matching reference before editing a surface family.

- For doctrine and product rules: read `references/visual-doctrine.md`
- For workflow, gates, and validation order: read `references/workflow-and-gates.md`
- For surface archetypes and what each one must preserve: read `references/surface-archetypes.md`

## Shared Theme Rules

- Separate `canvas`, `panel`, `card`, `muted-surface`, and `floating-surface`.
- Keep status semantics stable across themes.
- Keep focus visible in both themes.
- Keep placeholder and metadata readable.
- Keep CTA clusters stable during refresh and async state transitions.

## Storybook And Runtime

- Create or update stories for critical surfaces before trusting runtime review.
- Use Storybook for visual isolation.
- Use the real app for integration truth.
- If a change passes Storybook but feels wrong in runtime, the work is not done.

## Scope Safety

- If the repo has protected files or operational boundaries, respect them.
- Do not broaden a UI request into architecture refactors without explicit approval.
- If a problem is upstream or environment-specific, state that clearly and separate it from UI regressions.

## Current Maturity

This skill is still a draft until its rules are proven in at least:

1. `hub-operacional-web`
2. `gestao-carregadores-oficial`

Until then, treat it as a controlled shared playbook, not a frozen universal standard.
