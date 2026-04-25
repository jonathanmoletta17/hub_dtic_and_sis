# Phase 40 - Agent, Trading and Hub Execution Plan 30-60-90 - 2026-04-12

## Objective

Turn the portfolio study into an execution plan for the three active projects:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`
- `C:\Users\jonathan-moletta\code\hub-operacional-web`
- `C:\Users\jonathan-moletta\code\trading-algoritimo`

This plan assumes the strategic framing already captured in:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase39-agent-trading-hub-portfolio-study-2026-04-12.md`

## Plan Logic

The three projects move in parallel, but not at the same speed and not under the same acceptance model.

- The **agent** should lead in semantic quality.
- The **hub** should lead in institutional product maturity.
- The **trading project** should lead in staged validation discipline.

The practical rule is:

1. improve the agent so the intake quality stops degrading downstream flows
2. strengthen the hub so the operational shell becomes stable and canonical
3. evolve trading only through staged research-to-paper-to-live discipline

## Shared Portfolio Rules

These rules apply to the three projects:

1. No promotion without explicit gates.
2. No family-wide decision without classification first.
3. No visual or architectural conclusion based only on screenshots.
4. No domain abstraction shared by convenience.
5. Every major step must produce evidence: file, test, runtime, log or dossier.

## 30-Day Horizon

### Main Goal

Remove the biggest quality bottlenecks that contaminate the portfolio today.

### A. Agent - Semantic quality first

**Target**
- stabilize `Hermes Semantic v1` behavior enough to stop opening low-quality tickets and stop collapsing vague input into wrong categories

**Deliverables**
- curated DTIC corpus versioned and grouped by failure pattern
- clarified slot schemas per main categories
- disagreement dossier between heuristic and semantic decisions
- promotion checklist from shadow mode to default mode
- explicit list of categories or systems out of scope

**Validation**
- corpus evaluation with outage and request separation
- real runtime probes on representative prompts
- audit log review for `heuristic_decision`, `semantic_decision`, `fused_decision`, `missing_slots`, `llm_status`
- real GLPI smoke submit only after clarification and confirmation path is stable

**Done means**
- the team can state, with evidence, when the semantic path is safe enough to become official

### B. Hub - Agent-first shell maturity

**Target**
- make `DTIC/new-ticket` and the protected operational shell fully coherent around the real assisted flow

**Deliverables**
- final cleanup of copy and interaction in `DTIC/new-ticket`
- review of all failure and empty states around Hermes availability
- closure of alternate flow ambiguity when assisted flow is unavailable
- story-backed review of the pilot hub surfaces:
  - login
  - selector
  - `DTIC/dashboard`
  - `DTIC/new-ticket`
  - portal

**Validation**
- `doctor-runtime.ps1`
- `validate-runtime.ps1`
- storybook visual gates for touched surfaces
- smoke and, when needed, Playwright E2E on the touched paths

**Done means**
- the hub is no longer undermined by confusing fallback states or weak assisted-entry semantics

### C. Trading - Validation ladder foundation

**Target**
- formalize the research-to-paper ladder and stop any drift toward premature live ambition

**Deliverables**
- explicit phase contract:
  - research
  - backtest
  - paper
  - live
- baseline strategy pack with reproducible backtests
- risk model dossier
- paper trading telemetry definition
- minimum dashboard/operator checklist for monitoring

**Validation**
- existing test suite remains green
- backtests run reproducibly
- paper trading path defined with metrics to compare against backtest assumptions

**Done means**
- the project has a real promotion ladder and is no longer just a promising study plus disconnected modules

## 60-Day Horizon

### Main Goal

Promote each project from local improvements to controlled operational maturity.

### A. Agent

**Target**
- candidate promotion from semantic shadow to semantic-default in the scoped DTIC flow

**Deliverables**
- shadow-vs-official report on the corpus
- threshold and slot schema freeze for the first stable scope
- runtime hardening for invalid JSON, timeout and fallback cases
- out-of-scope routing rules explicit in prompts and domain docs

**Validation**
- no outage-class corpus example accepted as `request`
- parse-valid rate and intent-accuracy rate measured on the scoped corpus
- runtime lab proves clarification quality in edge cases

### B. Hub

**Target**
- move from “stable shell” to “mature institutional product shell”

**Deliverables**
- stronger visual direction for the most critical operational surfaces
- closure of residual dashboard debt where it directly affects operation
- stronger contract between runtime proof, Storybook and docs
- review of SIS parity where it matters, without scope explosion

**Validation**
- visual changes always backed by stories
- runtime proof on canonical URL after Docker rebuild
- no regressions in protected scopes

### C. Trading

**Target**
- paper-trading-ready operator workflow

**Deliverables**
- execution telemetry storage
- paper broker path hardened
- alerting and notification rules
- comparable dashboard views for signals, decisions, trades and equity
- explicit failure handling when data, broker or LLM path breaks

**Validation**
- paper run with stable logging
- risk manager blocks invalid exposure
- backtest assumptions and paper observations can be compared directly

## 90-Day Horizon

### Main Goal

Put each project in its correct durable role inside the portfolio.

### A. Agent

**Target**
- first production-grade semantic intake scope officially promoted

**Deliverables**
- promoted semantic scope with written acceptance criteria
- operational dossier for known failure patterns
- maintenance path for corpus and threshold review

**Success condition**
- the agent stops being an experiment attached to the hub and becomes a reliable semantic subsystem

### B. Hub

**Target**
- canonical operational platform clearly ahead of legacy or parallel surfaces

**Deliverables**
- protected flows clean and coherent
- docs, validation scripts and runtime behavior aligned
- institutional product shell stable enough to act as the main reference surface

**Success condition**
- the hub becomes the unquestioned canonical entrypoint for the operational workflows in scope

### C. Trading

**Target**
- complete paper-trading phase with evidence-based decision on whether live should even be allowed

**Deliverables**
- paper-trading results dossier
- comparison against backtest expectations
- live-readiness recommendation with explicit no-go criteria

**Success condition**
- any move toward live trading is evidence-driven and minimal-capital by design, not enthusiasm-driven

## Cross-Project Dependencies

### 1. Agent -> Hub

The hub depends on the agent for assisted intake quality.
If the semantic layer is weak, the hub inherits confusion even with a strong shell.

### 2. Hub -> Agent

The agent needs the hub as the canonical operational shell.
If the shell is ambiguous, the semantic gains are hidden behind poor interaction design.

### 3. Trading -> Neither, directly

Trading does not depend on the hub or the GLPI agent as a product path.
It depends on shared engineering discipline, not shared workflow.

That distinction matters.
Trying to force trading into the same delivery cadence or UI family would lower quality.

## Risks To Watch

### Portfolio risk 1 - Visual distraction

Using frontend energy to mask unfinished semantic or risk logic.

### Portfolio risk 2 - Shared abstraction by convenience

Creating a common pattern or package because it feels elegant, not because the domain proves it.

### Portfolio risk 3 - Premature promotion

- agent promoted before corpus proof
- hub treated as final before operational edge cases are covered
- trading pushed toward live before paper evidence exists

### Portfolio risk 4 - Context mixing

Using the same vocabulary, success criteria or UX assumptions across projects with different domain physics.

## Recommended Execution Order

### Order inside the portfolio

1. **Agent semantic stabilization**
2. **Hub assisted-flow and shell maturity**
3. **Trading validation ladder**

### Why this order

- a weak agent poisons intake
- a weak hub hides operational truth
- a weak trading validation stack can lose money

The first two directly improve the institutional operational system.
The third should advance in parallel, but with lower pressure on visual polish and higher pressure on validation rigor.

## Review Cadence

### Weekly

- agent corpus delta
- hub protected-scope regressions
- trading backtest or paper evidence delta

### Every 30 days

- promotion/no-promotion decision per project
- updated risk register
- updated documented scope

### At 90 days

- confirm whether the agent is promoted
- confirm whether the hub is the canonical operational shell in practice
- confirm whether trading is allowed to remain in paper or move toward limited live

## Final Portfolio Decision

The portfolio should move under one engineering doctrine, but under three different product contracts:

- **Agent**: semantic intake contract
- **Hub**: operational shell contract
- **Trading**: quantitative validation contract

That is the correct way to relate the three projects end to end.
Anything flatter than that will create confusion, weak gates and architectural drift.
