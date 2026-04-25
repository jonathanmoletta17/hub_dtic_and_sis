# Phase 39 - Agent, Trading and Hub Portfolio Study - 2026-04-12

## Objective

Relate the three main active projects in the portfolio:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`
- `C:\Users\jonathan-moletta\code\trading-algoritimo`
- `C:\Users\jonathan-moletta\code\hub-operacional-web`

The goal is to stop treating them as if they belonged to the same product family and define what should be filled, validated and evolved according to each specific context.

## Evidence Used

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\README.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\REPORT.md`
- `C:\Users\jonathan-moletta\code\trading-algoritimo\trading_ai_study.md`
- `C:\Users\jonathan-moletta\code\trading-algoritimo\main.py`
- `C:\Users\jonathan-moletta\code\trading-algoritimo\src\dashboard\api.py`
- `C:\Users\jonathan-moletta\code\trading-algoritimo\tests\test_dashboard.py`
- `C:\Users\jonathan-moletta\code\trading-algoritimo\tests\test_agent.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\README.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\package.json`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\doctor-runtime.ps1`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\scripts\validate-runtime.ps1`

## Core Thesis

The three projects are related, but they are not the same thing:

- the **agent** is a semantic service and ticket structuring engine
- the **hub** is the operational product shell where users work
- the **trading project** is a research, decision and execution system under financial risk

If they are validated with the same superficial logic, the portfolio drifts.

The correct move is:

1. share doctrine where the projects are genuinely similar
2. separate product family, UX grammar and acceptance gates where the domain changes

## Context Framing Template

Any strategic work on these projects should be filled with this minimum framing before design, implementation or validation:

1. **Business intent**
2. **Dominant user**
3. **Dominant product family**
4. **Model / Orchestrator / Tools split**
5. **Primary operating risk**
6. **Proof of quality**
7. **Promotion gate**
8. **What must stay local**

## Filled Contexts

### 1. GLPI Ticket Agent MVP

**Repo**
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`

**Business intent**
- Receive a message, structure a predictable ticket draft, clarify what is missing and create a GLPI ticket.

**Dominant user**
- Internal requester who needs assisted ticket opening.

**Dominant product family**
- `agent-first conversational workflow`

**Model / Orchestrator / Tools**
- Model: `src/glpi_ticket_agent/llm.py`
- Orchestrator: `src/glpi_ticket_agent/parser.py`, `decision_engine.py`, `service.py`
- Tools: `glpi_client.py`, Streamlit/API runtime

**Primary operating risk**
- Misclassification and premature ticket creation with poor context.

**Proof of quality**
- semantic clarification behavior
- slot-filling completeness
- audit log consistency
- real GLPI submit smoke
- deterministic fallback when LLM fails

**Promotion gate**
- shadow mode disagreement under control
- no outage-like incident classified as request in the evaluation corpus
- real submit flow stable with expected requester/entity/category behavior

**What must stay local**
- thresholds
- slot schemas
- clarification prompts
- GLPI payload rules
- audit taxonomy for agent decisions

### 2. Hub Operacional Web

**Repo**
- `C:\Users\jonathan-moletta\code\hub-operacional-web`

**Business intent**
- Provide the canonical operational shell for ticket workflows in `DTIC` and `SIS`.

**Dominant user**
- Operational users who need login, context selection, dashboards, ticket views and assisted/new ticket flows.

**Dominant product family**
- `workspace shell` plus local families such as `analytics`, `search`, `ticket detail` and `agent-first intake`

**Model / Orchestrator / Tools**
- Model: external systems such as Hermes when the flow is agent-first
- Orchestrator: hub frontend/backend contracts, auth, context routing, runtime configuration
- Tools: Next.js frontend, FastAPI backend, Docker, Playwright, Storybook, nginx proxy

**Primary operating risk**
- Broken operational flow, auth drift, invalid handoff, or UI that hides the real state of the workflow.

**Proof of quality**
- lint/build
- vitest
- Storybook test and visual gates
- Docker/runtime health
- Playwright E2E
- handoff proof to Hermes or SIS flow

**Promotion gate**
- no regression in protected scopes
- canonical runtime healthy
- visual state backed by stories, not screenshot-only review
- auth/context contracts preserved

**What must stay local**
- shell structure
- auth/store/runtime boundaries
- context registry
- route-level state and handoff contracts
- domain copy and workflow sequencing

### 3. Trading Algoritimo

**Repo**
- `C:\Users\jonathan-moletta\code\trading-algoritimo`

**Business intent**
- Build a phased trading system that moves from research to backtesting to paper trading and only then to live execution.

**Dominant user**
- Builder/operator/researcher, not a general end user.

**Dominant product family**
- `quant research and execution console`

**Model / Orchestrator / Tools**
- Model: LLM agents and strategy logic
- Orchestrator: CLI flow, signal pipeline, risk gate, execution sequencing
- Tools: data collectors, backtesting engine, database, dashboard API, paper/live broker integrations

**Primary operating risk**
- Real capital loss from false confidence, data leakage, weak backtests, bad risk controls or broken execution.

**Proof of quality**
- unit and integration tests
- backtest realism
- walk-forward validation
- paper trading duration
- risk manager behavior
- execution logs and replayability

**Promotion gate**
- no jump from prototype to live
- paper trading must confirm backtest assumptions
- risk management and execution telemetry must be stable
- live trading only with minimal capital after staged validation

**What must stay local**
- risk model
- broker/exchange integrations
- market data assumptions
- research notebooks and experiment cadence
- execution guardrails

## What The Three Projects Should Share

These are true portfolio-level principles:

1. **Evidence-first engineering**
- No strategic decision should close without file, test, runtime or log evidence.

2. **Three-layer thinking**
- Model, Orchestrator and Tools must stay explicit.
- This doctrine is valid for the three projects.

3. **Promotion by gates, not by intuition**
- Agent: corpus and semantic gates
- Hub: visual/runtime/E2E gates
- Trading: backtest/paper/live gates

4. **Operational traceability**
- Audit logs, runtime probes and reproducible validation should exist where failure matters.

5. **Portfolio governance**
- Shared foundation only when the abstraction is real.
- No shared package or shared pattern by convenience.

## What Must Not Be Forced Across The Three

### 1. Same visual family

The hub and Casa Civil applications can share a design foundation.
The trading project can reuse some foundation discipline, but it should not be forced into the same interaction grammar as the hub.

### 2. Same acceptance criteria

- The agent is accepted by semantic correctness.
- The hub is accepted by operational flow integrity.
- Trading is accepted by staged financial validation.

Trying to collapse these three into one checklist is bad engineering.

### 3. Same UX density

- Hub: broad operational product shell
- Agent: narrow task-focused conversation
- Trading: dense operator console

These are different surface families.

## Portfolio Map

### The Hub should become the canonical user-facing shell

The hub is where institutional UX, auth, context selection and operational navigation should mature.

It should not absorb:

- Hermes internals
- trading research logic
- external control-plane persistence

### The Agent should become a specialized intelligence service

The agent should be measured by:

- semantic quality
- clarification discipline
- ticket draft quality
- real submit behavior

Its UI can remain minimal if the orchestration is strong.

### Trading should become a disciplined lab-to-operations pipeline

Trading is the most dangerous domain of the three.
Its roadmap should remain phased:

- research
- backtest
- paper
- live

The biggest mistake here would be to optimize the shell before the risk and validation model.

## Practical Implications

### For shared planning

When opening a new initiative, the first question should be:

- is this a **foundation**
- a **family**
- a **project-local surface**
- or a **domain-specific exception**

### For frontend work

- Hub: continue evolving the Casa Civil product shell and local families
- Agent: only invest in frontend where it improves clarification, trust and confirmation quality
- Trading: invest in console/readability once the validation ladder is reliable

### For validation workflows

- Hub uses Storybook, visual gates, Docker and E2E
- Agent uses corpus tests, audit checks, GLPI smoke and semantic evaluation
- Trading uses test suite, backtest proof, paper trading proof and execution telemetry

## Recommended Portfolio Sequence

### Priority 1 - Agent

Reason:
- it affects intake quality, triage quality and downstream ticket value
- a weak agent pollutes the hub experience even if the shell is good

Immediate focus:
- semantic quality
- slot schemas
- corpus quality
- promotion criteria from shadow to default

### Priority 2 - Hub

Reason:
- it is the institutional face of the operational platform
- it concentrates the user journey and integrates the agent

Immediate focus:
- shell maturity
- context transitions
- clean agent-first surfaces
- preservation of route and auth integrity

### Priority 3 - Trading

Reason:
- it is strategically important, but financially riskier and should not be rushed by frontend pressure

Immediate focus:
- research pipeline
- backtest rigor
- paper trading discipline
- risk and execution telemetry

## Final Decision

The portfolio should now be treated as:

- **Hub**: canonical operational product
- **Agent**: specialized semantic subsystem
- **Trading**: staged quantitative operations platform

They can share doctrine, engineering rigor and selective foundation.
They should not be flattened into one visual family, one UX grammar or one acceptance checklist.

That separation is not fragmentation.
It is the condition for the portfolio to mature without architectural confusion.
