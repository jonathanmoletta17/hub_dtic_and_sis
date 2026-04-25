# Phase 43 - Agent Epic A1/A3 Executable Dossier - 2026-04-12

## Objective

Turn the first agent slice into executable work with real file targets, test anchors and closure proof.

Target repo:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`

This dossier covers:

- `A1` semantic intake stabilization
- `A3` fallback and confirmation hardening

It does **not** promote semantic mode to default yet.

## Evidence Base

### Architecture and runtime

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\README.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\decision_engine.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\llm.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\service.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\config.py`

### Current test anchors

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_llm.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_service.py`

## Current State

The agent already has a real execution core.

### What already exists

1. `TicketDraftFactory.build()` already runs the intended pipeline:
- normalization
- heuristic decision
- optional semantic decision
- fusion
- official/shadow selection
- finalization into `TicketDraft`

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\parser.py`

2. The heuristic engine already contains:
- dual-threshold clarification policy
- category slot schemas
- collective outage precedence
- slot-oriented clarification questions

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\decision_engine.py`

3. The LLM client already contains:
- structured semantic classification
- JSON-only expectation
- schema coercion
- extra-text recovery
- thinking-field ignore behavior

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\llm.py`

4. The service layer already blocks submission when clarification is pending.

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\service.py`

5. The test suite already covers the anchor prompts required in the plan:
- `Preciso de acesso ao SEI`
- `Nao sei o que aconteceu com meu acesso`
- `Estamos todos sem acesso ao sistema de protocolo`
- `Usuario novo precisa de acesso`
- `Usuario novo precisa de acesso ao sistema de protocolo`
- `Nao consigo entrar no email`
- `Portal do servidor deu erro 500 ao assinar processo no SEI`
- `Preciso de ajuda urgente`

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`

6. LLM failure handling is already partially tested:
- valid JSON
- extra text
- outer `thinking`
- incomplete schema
- timeout propagation

Evidence:
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_llm.py`

## Real Gaps

The main gap is not absence of engine logic.
The main gap is absence of explicit operational artifacts around the logic.

### Gap G1 - No first-class corpus artifact

The expected prompts and behaviors exist mostly inside tests, not in a versioned corpus artifact that can be reviewed by failure pattern.

Evidence:
- repo root has no dedicated corpus or docs folder in the current tree listing
- prompt expectations are concentrated in `tests\test_parser.py`

### Gap G2 - Slot schema is real in code, but not frozen as an operational contract

The schema lives in `_slot_schemas` inside `decision_engine.py`, but there is no separate operator-facing or reviewer-facing matrix saying:

- which categories are officially in scope now
- which required slots are phase-1 stable
- which requests are unsupported

### Gap G3 - Promotion criteria are implied, not explicit enough inside the agent repo

Thresholds exist in `config.py` and behavior exists in code and README, but there is no single local artifact declaring:

- what conditions block semantic promotion
- what disagreement types are acceptable
- what no-go cases immediately fail the promotion

### Gap G4 - Runtime proof is not yet packaged as an explicit lab runbook

README describes smoke behavior, but the first semantic scope still needs a repeatable operator runbook for:

- clarification path
- confirmation path
- fallback path
- submit gate path

## Governance Classification

### governance-decision

- keep this slice local to `glpi-ticket-agent-mvp`
- do not move it to Casa Civil foundation
- do not treat it as hub work

### classification

- local semantic contract

### follow-up-action

- implement artifacts and tests in the agent repo
- consume the resulting evidence from the hub as an integrated product review

## Work Packages

## Work Package AG-1 - Corpus artifact

### Goal

Create a versioned corpus artifact that mirrors the real semantic expectations already encoded in tests.

### File targets

Recommended new local artifact:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\dtic-semantic-corpus-v1.md`
  or
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\dtic-semantic-corpus-v1.yaml`

### Minimum contents

- grouped prompts by failure pattern
- expected intent
- expected category candidate
- expected clarification status
- expected missing slots
- notes on why the example exists
- explicit unsupported examples

### Source of truth to extract from

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\llm.py`

### Done means

- a reviewer can assess the scoped behavior without reading Python tests line by line

## Work Package AG-2 - Slot contract freeze

### Goal

Expose the first stable slot schema as a documented contract.

### File targets

Recommended new local artifact:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\dtic-slot-contract-v1.md`

### Source of truth to extract from

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\src\glpi_ticket_agent\decision_engine.py`

### Must include

- category
- request vs incident split
- required slots
- supported examples
- unsupported examples
- clarification question pattern

### Done means

- the first scoped categories are frozen as an operational contract, not just hidden in code

## Work Package AG-3 - Promotion gate artifact

### Goal

Document the no-go conditions for moving from semantic shadow to semantic default.

### File targets

Recommended new local artifact:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\semantic-promotion-gate-v1.md`

### Must include

- minimum acceptable parse validity
- minimum acceptable intent accuracy
- outage no-go condition
- required runtime probe set
- disagreement patterns that still require shadow-only status

### Source of truth to extract from

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\README.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_llm.py`

## Work Package AG-4 - Test tightening

### Goal

Use the existing suite as the base and add only the missing proofs that close current ambiguity.

### Existing strong coverage

- parser behavior on core prompts
- collective outage precedence
- clarification loop
- semantic disagreement metadata
- semantic error fallback
- service submit block when clarification is pending

### Recommended additions

1. parser test proving unsupported-domain example clarifies instead of forcing a fake category
2. parser test proving semantic shadow mode does not silently bypass missing-slot clarification
3. service-level test proving submit still fails after retry if draft remains in clarification
4. optional corpus-driven parametrized parser test if the new corpus artifact is machine-readable

### File targets

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_parser.py`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\tests\test_service.py`

## Work Package AG-5 - Runtime lab runbook

### Goal

Package the operator proof path for the first semantic scope.

### File targets

Recommended local artifact:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\semantic-runtime-lab-v1.md`

### Must include

- startup commands
- required env flags
- probe prompts
- expected chat behavior
- expected audit events
- expected submit block behavior

### Runtime commands

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
streamlit run streamlit_app.py
```

## Execution Order Inside The Agent Repo

1. `AG-1` corpus artifact
2. `AG-2` slot contract freeze
3. `AG-3` promotion gate artifact
4. `AG-4` test tightening
5. `AG-5` runtime lab runbook

This order matters because:

- the tests already exist
- but the operational contract is still implicit
- once the contract is explicit, the new tests and runbook become cleaner and defensible

## Closure Proof

This epic is complete only when all of the following are true:

1. The first scoped DTIC semantic behavior is documented outside code.
2. The slot contract is frozen for the first stable categories.
3. Promotion/no-promotion rules are explicit.
4. The test suite covers the unsupported-domain and clarification-gate edge cases still missing.
5. A human operator can rerun the semantic lab without reverse-engineering the repo.

## Final Instruction

Do not start this epic by refactoring the engine.

Start by extracting and freezing the operational knowledge that already exists in:

- `decision_engine.py`
- `parser.py`
- `llm.py`
- `test_parser.py`
- `test_llm.py`
- `test_service.py`

Only after that should code changes be proposed.

## Completion Note - 2026-04-12

The first agent slice was closed without refactoring the execution core.

Artifacts created in `glpi-ticket-agent-mvp`:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\dtic-semantic-corpus-v1.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\dtic-slot-contract-v1.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\semantic-promotion-gate-v1.md`
- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp\docs\semantic-runtime-lab-v1.md`

Test tightening added:

- unsupported-domain clarification proof in `tests\test_parser.py`
- shadow-mode clarification preservation proof in `tests\test_parser.py`
- repeated submit-block proof for unchanged clarification drafts in `tests\test_service.py`

Validation executed:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
```

Result:

- `73 passed`

Runtime probes also revalidated these current behaviors before the docs were frozen:

- `Preciso de acesso ao SIAFEM` stays in clarification with category hypothesis `22`
- `Preciso de acesso ao sistema XYZ legado` stays in clarification with category hypothesis `22`
- `Usuario novo precisa de acesso` stays in clarification even under confident semantic shadow output

## Follow-up Fix - Hardware Provisioning Request

After the first closure, the known hardware-request gap was executed as a focused follow-up.

Target behavior:

- `Preciso solicitar um notebook para o colega que chegou hoje`

Applied change:

- category `34` request slots now use `device_or_asset`, `action_kind`, `impact_scope`
- `request_hardware` was introduced as a first-class request action for local equipment provisioning
- category confidence for hardware requests now increases when a real equipment provisioning action is present
- category `34` request clarification text now speaks about equipment request, not symptom investigation
- normalized title and summary now express a real request flow for hardware provisioning

Regression proof:

- `tests\test_parser.py` now asserts this prompt as confirmable request
- runtime probe returned:
  - `Solicitacao de notebook`
  - `request`
  - category `34`
  - `needs_clarification=False`
  - `category_confidence=0.9`

Validation rerun:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
```

Result:

- `74 passed`

## Follow-up Fix - Unmapped Access Systems In Incident Flow

The first unsupported-domain protection already worked for access requests such as `Preciso de acesso ao SIAFEM`, but incident phrasings still degraded into generic clarification without the access-family hypothesis.

Applied change:

- category `22` now gains semantic weight when `requested_system_label` is extracted from an access-like phrase
- requested-system extraction now covers incident phrasings such as `acessar o ...` and `entrar no ...`
- simple single-token system labels are normalized to upper-case for clearer prompts
- the semantic LLM few-shot prompt now includes an unsupported-domain access example

Regression proof:

- `Nao consigo acessar o SIAFEM`
- `Nao consigo entrar no sistema XYZ legado`

Runtime probe result after the fix:

- `incident`
- category `22`
- `needs_clarification=True`
- `clarification_reason=unmapped_target_system`
- `missing_slots=['target_system']`

Validation rerun:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
```

Result:

- `76 passed`

## Follow-up Fix - Request Family Refinement For Equipment And Software

After the unmapped-domain correction, the next high-severity issue was found in request flows:

- `Preciso instalar o Office no notebook novo` was being treated as hardware provisioning instead of software installation
- `Preciso de um monitor para o novo colega` still stayed in medium-confidence clarification despite already carrying enough request information
- `Preciso de uma impressora para a recepcao` still used an incident-style symptom gate

Applied change:

- printer request slots now use `device_or_asset`, `action_kind`, `impact_scope`
- printer request clarification text now follows a provisioning path instead of symptom investigation
- `install_software` now takes precedence before `request_hardware` in action extraction
- `request_hardware` now gets explicit request-score reinforcement when a real equipment asset is present
- software install title and summary now become operational instead of mirroring the raw sentence

Regression proof after the fix:

- `Preciso de um monitor para o novo colega` -> request, category `34`, no clarification
- `Preciso de uma impressora para a recepcao` -> request, category `14`, no clarification
- `Preciso instalar o Office no notebook novo` -> request, category `20`, title `Instalacao de Office`, no clarification

Validation rerun:

```powershell
Set-Location C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp
pytest
```

Result:

- `79 passed`
