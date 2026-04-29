# Phase 42 - Agent, Trading and Hub Slice S1 Executable Plan - 2026-04-12

## Objective

Break the immediate portfolio slice into executable work by repository, with governance classification, validation commands and closure criteria.

This document operationalizes:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase41-agent-trading-hub-operational-backlog-v1-2026-04-12.md`

## Governance Decision

The immediate slice `S1` is not one single shared initiative.
It is a coordinated slice composed of three local domain tracks with one portfolio dependency chain.

### governance-decision

- execute the slice as three repo-local tracks
- coordinate them at portfolio level only for sequencing and evidence review
- do not force a shared package, shared workflow layer or shared frontend contract across the three repos

### classification

- `glpi-ticket-agent-mvp`: local domain backlog with semantic contract impact
- `hub-operacional-web`: local operational-shell backlog with protected-scope impact
- `trading-algoritimo`: local domain backlog with validation-ladder impact
- portfolio dependency between them: `agent -> hub`, while `trading` runs in parallel under its own gates

### follow-up-action

- execute the agent slice first
- execute the hub slice immediately after the agent slice exposes clearer behavior
- execute the trading slice in parallel, but block any "live readiness" rhetoric until its phase contract and backtest baseline are documented

## Slice S1 Scope

### Repo 1 - GLPI Ticket Agent MVP

**Goal**
- stabilize semantic intake and remove ambiguity from the first scoped DTIC categories

**Included**
- corpus split by failure pattern
- first slot-schema freeze
- fallback and confirmation hardening

**Not included**
- broad new UI work
- large prompt rewriting beyond scoped categories
- promotion from shadow to default

### Repo 2 - Hub Operacional Web

**Goal**
- remove assisted-flow ambiguity in `DTIC/new-ticket`

**Included**
- unavailable/error state review
- retry behavior review
- elimination of duplicate or ambiguous conversational entrypoint

**Not included**
- broad shell redesign
- auth changes
- route contract changes outside the touched flow

### Repo 3 - Trading Algoritimo

**Goal**
- lock the phase contract and define a reproducible backtest baseline

**Included**
- written phase contract
- reproducible backtest baseline definition
- no-go criteria for premature live trading

**Not included**
- large frontend redesign
- new live execution features
- broad multi-agent expansion

## Execution Order

### Step 1 - Agent

Reason:
- it is upstream of the hub assisted-flow quality

### Step 2 - Hub

Reason:
- once the agent scope is clearer, the hub can expose the assisted flow without masking semantic weaknesses behind fallback ambiguity

### Step 3 - Trading

Reason:
- independent product path
- should advance now, but under validation discipline rather than product-shell pressure

## Repo Work Packages

## 1. GLPI Ticket Agent MVP

### Work Package A1 - Corpus split

**Deliverables**
- a versioned corpus grouping prompts by failure type
- explicit list of unsupported or out-of-scope systems/requests in the first scope

**Suggested tasks**
1. inventory existing prompts, labs and runtime probes
2. group them by failure class
3. mark which examples are expected to:
   - clarify
   - confirm as request
   - confirm as incident
   - refuse or mark unsupported
4. save the first stable corpus artifact

**Proof**
- corpus file or dossier
- traceable mapping between prompts and expected outcomes

### Work Package A2 - Slot schema freeze

**Deliverables**
- first stable slot definition for the main scoped categories

**Suggested tasks**
1. choose the first scope categories
2. define required slots for each
3. define clarification wording per slot gap
4. align parser expectations with the scoped schema

**Proof**
- slot schema file or documented matrix
- parser tests against the schema

### Work Package A3 - Fallback and confirmation hardening

**Deliverables**
- explicit behavior for invalid semantic output, timeout, retry and submit confirmation

**Suggested tasks**
1. test invalid JSON path
2. test timeout path
3. test clarification after low-confidence input
4. test explicit confirmation before submit

**Proof**
- unit tests
- runtime probe transcripts
- audit log events

### Validation commands

Use the repo-native validation after each package closes:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
```

And for runtime proof:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
streamlit run streamlit_app.py
```

### Closure criteria

- the first scope is explicit
- the agent behavior for vague, outage-like and unsupported prompts is no longer ambiguous
- submit remains gated by confirmation

## 2. Hub Operacional Web

### Work Package H1 - Assisted-flow unavailable state

**Deliverables**
- one clear unavailable state for the DTIC assisted path
- one clear retry path
- no duplicate conversational affordance for the same workflow

**Suggested tasks**
1. inspect all states of `DTIC/new-ticket`
2. identify when Hermes offline/error states still imply another chat path
3. rewrite UI logic and copy to keep only one understandable path
4. add or update stories for touched states

**Proof**
- story states
- runtime screenshots on canonical URL
- deterministic interaction path in smoke

### Work Package H2 - Protected-flow coherence around new ticket

**Deliverables**
- the `DTIC/new-ticket` experience is coherent with selector, dashboard and downstream confirmation behavior

**Suggested tasks**
1. verify entry into `DTIC/new-ticket`
2. verify unavailable state
3. verify active assisted state
4. verify confirmation and post-confirmation behavior if touched

**Proof**
- storybook state coverage
- runtime proof
- Playwright smoke if behavior changed materially

### Validation commands

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web
powershell -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-runtime.ps1
```

If flow behavior changes materially:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm run storybook:test
npm run storybook:visual
npx playwright test e2e/hub-mvp.spec.ts --workers=1
```

### Closure criteria

- user sees only one canonical assisted-entry behavior
- unavailable and retry states are operationally clear
- no regression in protected scope

## 3. Trading Algoritimo

### Work Package T1 - Phase contract

**Deliverables**
- explicit contract for:
  - research
  - backtest
  - paper
  - live
- no-skip rule between phases
- no-go list for live promotion

**Suggested tasks**
1. extract implicit phase assumptions from the study and code
2. formalize required evidence per phase
3. formalize promotion/no-promotion rule
4. document the contract in repo docs

**Proof**
- written phase contract
- evidence matrix by phase

### Work Package T2 - Reproducible backtest baseline

**Deliverables**
- one baseline strategy path that can be rerun consistently

**Suggested tasks**
1. choose the baseline symbol/timeframe/window
2. define the exact command path
3. save expected output shape and metrics
4. define the first walk-forward expectation

**Proof**
- baseline command set
- stored output example
- rerun consistency note

### Validation commands

Use repo tests first:

```powershell
Set-Location C:\Users\jonathan-moletta\code\trading-algoritimo
pytest
```

Then validate the selected baseline path:

```powershell
Set-Location C:\Users\jonathan-moletta\code\trading-algoritimo
python main.py backtest --symbol BTC/USDT --strategy trend --from 2023-01-01
```

Adjust the command only if the documented baseline chooses another symbol, timeframe or window.

### Closure criteria

- live promotion is explicitly blocked without paper evidence
- a baseline backtest exists and can be rerun
- the repo stops being governed only by ambition and starts being governed by evidence

## Weekly Review Template

For this slice, weekly review should ask only:

1. What evidence was added?
2. What ambiguity was removed?
3. What gate is now passable that was not passable before?
4. What is still blocked by missing proof?

## Portfolio Stop Rules

Stop and reassess if any of these happen:

- the agent slice starts expanding into broad UX redesign
- the hub slice starts touching protected contracts without explicit need
- the trading slice starts discussing live operation without paper proof
- a local workaround is being sold as portfolio foundation

## End State Of Slice S1

Slice `S1` is complete only when:

- the agent has a first stable semantic scope with explicit corpus and slot behavior
- the hub exposes a single clear assisted-entry path in `DTIC/new-ticket`
- the trading project has a written validation ladder and one reproducible backtest baseline

Until those three are true, the portfolio is still missing its immediate operational foundation.
