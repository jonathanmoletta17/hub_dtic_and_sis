# Workflow And Gates

## Mandatory Order

1. inspect the current surface
2. diagnose the problem
3. identify whether the issue is local or foundational
4. create or update stories for the target surface
5. patch in small steps
6. run Storybook validation
7. validate in the real app
8. record evidence

## Validation Stack

Minimum UI gate:

1. `npm run build`
2. `npm run build-storybook`
3. `npm run storybook:test`
4. `npm run storybook:visual`
5. runtime validation in the real app

## What Storybook Proves

Storybook proves:

- isolated surface rendering
- theme switching at component/surface level
- repeatable visual baseline

Storybook does not prove:

- full layout integration
- runtime data pressure
- navigation and shell composition
- async refresh effects in context

## What Runtime Proves

Runtime proves:

- real layout composition
- app shell interaction
- integration with actual data and states
- whether the product still feels coherent

## Evidence Format

Each round should capture:

- before/after diagnosis
- files changed
- tests run
- visual evidence
- remaining debt

## Theme-Only Safety

If the task is theme-only:

- do not redesign structure
- do not rename product copy broadly
- do not re-platform components
- do not refactor unrelated runtime logic
