# Phase 41 - Agent, Trading and Hub Operational Backlog v1 - 2026-04-12

## Objective

Convert the portfolio execution plan into an immediate operational backlog for:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`
- `C:\Users\jonathan-moletta\code\hub-operacional-web`
- `C:\Users\jonathan-moletta\code\trading-algoritimo`

This backlog is not a roadmap substitute.
It is the first practical cut of what should be executed next, in what order, and with which proof.

References:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase39-agent-trading-hub-portfolio-study-2026-04-12.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase40-agent-trading-hub-execution-plan-30-60-90-2026-04-12.md`

## Priority Model

Priority is defined by portfolio impact, not by local convenience.

- `P0`: blocks portfolio quality or creates false confidence
- `P1`: materially improves operational maturity
- `P2`: strengthens product quality after the main risk is controlled
- `P3`: useful, but should wait

## Global Queue

### P0

1. Agent semantic intake stabilization
2. Hub assisted-flow reliability around the DTIC agent path
3. Trading phase contract and no-live-before-paper enforcement

### P1

4. Agent corpus and promotion gate formalization
5. Hub protected-scope polish and state coherence
6. Trading reproducible backtest and paper telemetry baseline

### P2

7. Hub visual/art-direction elevation where already technically stable
8. Trading operator dashboard maturity

## Project Backlogs

## 1. GLPI Ticket Agent MVP

### Epic A1 - Semantic intake stabilization

**Priority**
- `P0`

**Why**
- The agent currently has the highest leverage on the quality of the operational system because it affects ticket intake quality at the source.

**Tasks**
- version the DTIC corpus by failure pattern, not just by prompt list
- split examples into:
  - vague request
  - outage-like incident
  - new-user request
  - access ambiguity
  - missing-slot request
  - unsupported-system request
- freeze the first stable slot schema for the most frequent categories
- write explicit out-of-scope rules for systems or requests not supported in phase 1
- review clarification prompts for specificity and domain language

**Proof**
- corpus file or dossier
- unit tests for representative prompts
- runtime probe transcripts
- audit log comparison between heuristic, semantic and fused decisions

**Done means**
- the team can explain why a ticket was clarified, categorized or blocked with evidence

### Epic A2 - Shadow mode promotion dossier

**Priority**
- `P1`

**Tasks**
- compute shadow-vs-official disagreement rate
- isolate high-risk disagreements
- produce explicit no-go conditions for promotion
- define the first allowed semantic-default scope

**Proof**
- shadow report
- disagreement matrix
- promotion checklist signed by evidence, not opinion

### Epic A3 - Runtime hardening

**Priority**
- `P1`

**Tasks**
- harden invalid JSON fallback path
- harden timeout path
- verify clarification state survives retries
- verify submit only happens after explicit confirmation

**Proof**
- unit tests
- smoke tests
- audit log events proving fallback and submit sequence

## 2. Hub Operacional Web

### Epic H1 - DTIC assisted-flow reliability

**Priority**
- `P0`

**Why**
- The hub is the canonical shell. If the assisted path is confusing, the institution sees the system as unreliable even if the backend is correct.

**Tasks**
- review `DTIC/new-ticket` unavailable state and remove ambiguous alternate behavior
- align failure copy, retry behavior and operator expectation when Hermes is offline
- ensure no duplicate conversational entrypoint appears for the same workflow
- verify canonical handoff path stays singular and understandable

**Proof**
- story-backed states
- runtime screenshots from canonical URL
- `doctor-runtime.ps1`
- `validate-runtime.ps1`
- Playwright when behavior changes

**Done means**
- the user always understands whether the assisted path is available, retrying or intentionally blocked

### Epic H2 - Protected-scope coherence

**Priority**
- `P1`

**Tasks**
- review the protected surfaces as a connected journey:
  - login
  - selector
  - dashboard
  - new ticket
  - ticket detail
- remove residual copy drift between DTIC and SIS where it hurts comprehension
- close remaining weak empty/error states that currently rely on technical wording

**Proof**
- stories for touched states
- visual gates
- runtime proof after rebuild

### Epic H3 - Canonical shell maturity

**Priority**
- `P2`

**Tasks**
- strengthen visual hierarchy only after flow correctness is stable
- review whether the analytics family still has local weak points that affect reading
- continue improving institutional signature without reopening stable families blindly

**Proof**
- storybook visual review
- runtime proof
- no regressions in protected scopes

## 3. Trading Algoritimo

### Epic T1 - Validation ladder contract

**Priority**
- `P0`

**Why**
- The main risk in trading is false confidence, not mediocre UI.

**Tasks**
- document the strict phase contract:
  - research
  - backtest
  - paper
  - live
- define explicit no-skip rules between phases
- define minimum evidence required to move from one phase to the next
- define a live-trading no-go list

**Proof**
- written contract
- phase checklist
- evidence matrix

**Done means**
- nobody can rationalize a jump to live without violating a documented gate

### Epic T2 - Reproducible backtest baseline

**Priority**
- `P1`

**Tasks**
- define the baseline strategy set
- lock a reproducible dataset window
- produce backtest outputs that can be re-run and compared
- define the first walk-forward validation routine

**Proof**
- reproducible command set
- stored output examples
- comparison note between runs

### Epic T3 - Paper-trading telemetry baseline

**Priority**
- `P1`

**Tasks**
- define paper metrics to compare with backtest expectations
- store execution, signal and risk events consistently
- identify alert conditions for bad behavior:
  - missing data
  - invalid broker response
  - risk gate bypass attempt
  - LLM degradation

**Proof**
- telemetry schema
- example logs
- paper run dossier

### Epic T4 - Operator surface quality

**Priority**
- `P2`

**Tasks**
- improve dashboard/operator readability only after telemetry and validation ladder are solid
- keep the interface focused on operator evidence, not decorative polish

**Proof**
- dashboard tests remain green
- runtime proof on the monitoring surface

## Dependency Map

### Agent -> Hub

- `A1` is upstream of `H1`
- if the semantic intake remains unstable, the hub can only polish around a weak core

### Hub -> Agent

- `H1` is required for the assisted flow to expose agent quality clearly
- if the hub keeps ambiguous fallback behavior, the team cannot measure the agent honestly

### Trading

- `T1` must happen before any serious `T4`
- UI work in trading must not outrun validation discipline

## Immediate Sprint Slice

This is the recommended next slice if the portfolio needs a practical execution start now.

### Slice S1

1. Agent:
- `A1` corpus split
- `A1` slot schema freeze for first stable categories
- `A3` fallback and confirmation hardening

2. Hub:
- `H1` assisted-flow unavailable state review
- `H1` single-entrypoint clarification

3. Trading:
- `T1` phase contract
- `T2` reproducible backtest baseline definition

## What Not To Start Yet

- no family-wide visual redesign for trading before `T1` and `T2`
- no broad hub visual reopening while `H1` still has reliability ambiguity
- no agent promotion discussion before `A1` and `A2` evidence exists

## Portfolio Board View

### Now

- Agent: semantic stabilization
- Hub: assisted-flow reliability
- Trading: validation ladder contract

### Next

- Agent: promotion dossier
- Hub: protected-scope coherence
- Trading: paper telemetry baseline

### Later

- Hub: shell/art-direction elevation
- Trading: operator console refinement

## Final Instruction

When work arrives for these three projects, classify it against this backlog first.

If a task does not clearly improve:

- semantic intake quality in the agent
- assisted operational flow integrity in the hub
- staged validation rigor in trading

then it is probably not the right next task.
