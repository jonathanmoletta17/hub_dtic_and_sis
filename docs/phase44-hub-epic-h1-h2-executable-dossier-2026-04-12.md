# Phase 44 - Hub Epic H1/H2 Executable Dossier - 2026-04-12

## Objective

Turn the first hub slice into executable work with real file targets, state inventory and proof criteria.

Target repo:

- `C:\Users\jonathan-moletta\code\hub-operacional-web`

This dossier covers:

- `H1` assisted-flow unavailable state
- `H2` protected-flow coherence around `DTIC/new-ticket`

It does **not** change auth, backend contracts, context registry or route contracts.

## Evidence Base

### Repo and process

- `C:\Users\jonathan-moletta\code\hub-operacional-web\BOOTSTRAP.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\AGENTS.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase42-agent-trading-hub-slice-s1-executable-plan-2026-04-12.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase43-agent-epic-a1-a3-executable-dossier-2026-04-12.md`

### Canonical DTIC new-ticket route

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
  - line 7 imports `DticAgentChatEntry`
  - line 8 imports `FormWizard`
  - line 21 resolves `entryMode`
  - line 27 renders `DticAgentChatEntry` when `entryMode === "agents"`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\ticket-entry.ts`
  - `dtic` maps to `agents`
  - `sis`, `sis-manutencao` and `sis-memoria` map to `form`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\mvp-navigation.ts`
  - `new-ticket` is relabeled to `Agentes` when entry mode is `agents`
  - page title for `new-ticket` becomes `Agentes DTIC` when entry mode is `agents`

### Current inline chat implementation

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
  - line 32 imports `createDticAgentChatSession`
  - line 38 defines `STATUS_META`
  - line 49 defines `draft_ready`
  - line 54 defines `submitted`
  - line 152 stores `booting`
  - line 192 calls `createDticAgentChatSession`
  - line 425 renders `Atendimento indisponivel`
  - line 433 renders the single retry button `Tentar novamente`
- No current source match was found for `Abrir atendimento alternativo` inside `DticAgentChatEntry.tsx`.

### Current welcome state

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.tsx`
  - line 64 renders `Atendimento DTIC`
  - line 69 renders `Escreva o problema, erro ou pedido.`
  - line 72 renders `Eu organizo o relato, peco so o contexto que faltar e deixo a revisao pronta antes do envio.`
  - line 103 renders the composer slot or default composer stub

### Current chat API client

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`
  - line 50 defines `AgentChatApiError`
  - line 84 defines fallback error copy: `Falha ao comunicar com o atendimento assistido.`
  - line 99 still exposes `buildLegacyDticAgentUrl`
  - line 106 exposes `createDticAgentChatSession`
  - line 120 exposes `sendDticAgentChatMessage`
  - line 130 exposes `confirmDticAgentDraft`
  - line 137 exposes `discardDticAgentDraft`

### Legacy agent-entry residue

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`
  - line 96 exports `DticAgentEntry`
  - lines 113-117 build a legacy external agent launch URL with handoff payload
  - line 146 renders `Entrada Agent-First`
  - line 325 renders a link to the agent launch URL
- Current reference search only found the exported component itself, not a canonical route import.

### Current story and E2E anchors

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.stories.tsx`
  - only the welcome panel is modeled
  - stories: `Default`, `Sending`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-mvp.spec.ts`
  - verifies `/dtic/new-ticket` loads the heading `Abrir chamado`
  - verifies the `Enviar mensagem` button is visible
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-handoff.spec.ts`
  - logs in, selects `dtic`, opens `/dtic/new-ticket`
  - sends `Equipe inteira sem acesso ao sistema de protocolo.`
  - expects draft review copy and `Abrir chamado`
  - expects body text containing `TipoIncidente`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts`
  - opens a real ticket through the inline chat
  - validates it through hub detail and GLPI
  - deletes the ticket at the end
  - writes runtime evidence under `web\output\phase23-dtic-inline-agent-submit-clean`

## Discovery Output

### surface-intent

`DTIC/new-ticket` exists to let a DTIC user describe a problem or request in natural language, let Hermes structure the intake, and only proceed to ticket opening after enough context exists for review and explicit confirmation.

### surface-brief

The canonical experience is no longer a service form and no longer an external "open another agent chat" handoff.

The current source presents a single inline assisted chat inside the hub:

1. boot the chat session
2. show a clean welcome state
3. send user narrative to the agent API
4. show clarification or draft-ready state
5. let the user explicitly open the ticket
6. show submitted state

### state-inventory

Observed or implied states from source and tests:

- `booting`: component is starting the assisted session
- `error`: session startup failed and the surface shows `Atendimento indisponivel`
- `ready`: session exists and the welcome/chat composer is available
- `clarifying`: Hermes needs more detail
- `draft_ready`: draft is ready for review and the user can open the ticket
- `submitted`: ticket was opened
- `sending`: message is being sent

Storybook currently covers only:

- welcome panel default
- welcome panel sending

Storybook does not yet cover:

- full chat booting
- unavailable/error
- clarifying
- draft-ready
- submitted

### domain-glossary

- `Atendimento assistido`: the inline Hermes chat inside the hub.
- `Hermes`: external semantic ticket agent consumed by the hub.
- `Draft`: ticket draft returned by Hermes before confirmation.
- `Clarificacao`: agent asks for missing context instead of creating a weak ticket.
- `Handoff`: legacy term from the older external-agent flow; it should not describe the current inline chat unless a real handoff URL is still intentionally supported.
- `Entrada Agent-First`: old copy in `agent-entry`; should not guide the current canonical surface unless the legacy component is explicitly reactivated.

### family-decision

Dominant family:

- `workspace-shell`

Subfamily:

- `ticket-intake`

Reason:

- the task is not analytics, search or generic operations
- the surface is a protected workflow inside the hub shell
- the main user goal is to open a DTIC ticket through an assisted intake flow

## Current State

The hub source is in a better state than the older runtime screenshot suggested.

### What is already correct

1. DTIC uses the `agents` entry mode by configuration, while SIS contexts remain form-based.

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\ticket-entry.ts`

2. The canonical route mounts `DticAgentChatEntry` for agent mode.

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`

3. The current unavailable state no longer offers a second conversational route.

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`

4. There is E2E coverage for the inline handoff/draft path and a stronger real-submit smoke with cleanup.

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-handoff.spec.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts`

### What is still weak

1. Full state modeling is incomplete.

The only current story in the agent-chat folder is for `DticAgentWelcomePanel`. The full state machine of `DticAgentChatEntry` is protected mostly by runtime E2E, not by story-level visual review.

2. Legacy flow residue remains in source.

`DticAgentEntry.tsx` and `buildLegacyDticAgentUrl()` still exist. They may be harmless, but they preserve older vocabulary and mental models: external handoff, launch URL, and "Entrada Agent-First".

3. The canonicity rule is implicit.

Future implementers can still discover both `agent-chat` and `agent-entry` folders and choose the wrong one without a local decision record.

4. The unavailable state needs explicit proof.

The source now shows only retry, but the acceptance evidence should include a story or controlled test for the error/unavailable state to prevent the old "Abrir atendimento alternativo" ambiguity from reappearing.

## Governance Classification

### governance-decision

Keep this work local to `hub-operacional-web` and classify it as protected surface governance for the DTIC ticket-intake flow.

### classification

- primary scope: surface-specific hub workflow
- family: `workspace-shell`
- subfamily: `ticket-intake`
- not foundation
- not analytics/search/operations family
- not a shared component package candidate

### follow-up-action

- document the canonical inline chat rule
- model the missing states in Storybook or equivalent stable fixtures
- classify or remove legacy residues only after confirming no route/story/test depends on them
- validate with repo-standard runtime proof

## Work Packages

## Work Package HU-1 - Canonical flow contract

### Goal

Make it explicit that `DTIC/new-ticket` is an inline Hermes chat in the hub, not a fork to another agent chat or the older structured `agent-entry` handoff.

### File targets

Recommended local documentation target:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\dtic-new-ticket-assisted-flow-contract-v1.md`

Potential source clarifications if implementation is needed later:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\ticket-entry.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\mvp-navigation.ts`

### Must include

- DTIC uses `agents` entry mode
- SIS contexts use `form` entry mode
- canonical DTIC component is `DticAgentChatEntry`
- unavailable state has retry, not a second chat path
- legacy `agent-entry` is not the canonical route

### Done means

- a developer can identify the correct surface without reverse-engineering route logic

## Work Package HU-2 - Full state story coverage

### Goal

Protect the visual and semantic states of the assisted chat before more runtime changes.

### Recommended approach

Avoid a brittle page-level story if auth/router/backend dependencies make it unstable.

Instead:

1. Extract or wrap the presentational pieces needed to render stable states.
2. Use fixtures for session, messages and draft.
3. Keep network calls out of stories.

### Story states to add

- booting
- unavailable/error
- ready/welcome
- clarifying
- draft-ready
- submitted
- sending

### File targets

Potential story target:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.stories.tsx`

Existing story to retain:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.stories.tsx`

### Done means

- the old ambiguous unavailable state cannot return without failing visual review or story review

## Work Package HU-3 - Legacy residue disposition

### Goal

Classify the older `agent-entry` path and `buildLegacyDticAgentUrl()` so future work does not confuse them with the canonical inline chat.

### File targets

Residues to classify:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\dtic-agent-flow.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\dtic-agent-flow.test.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`

### Decision options

1. Remove if confirmed unused and not needed for planned rollback.
2. Keep but mark as legacy explicitly in docs and code comments.
3. Convert to test-only fixture material if its handoff logic is still useful.

### Done means

- no one can accidentally revive the old external handoff pattern as the intended `DTIC/new-ticket` design

## Work Package HU-4 - Runtime proof for assisted flow

### Goal

Prove that the rebuilt runtime serves the current inline chat and not a stale build with the older "alternative chat" affordance.

### Commands

Standard hub validation:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web
powershell -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-runtime.ps1
```

If story coverage changes:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm run storybook:test
npm run storybook:visual
```

If behavior changes materially:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npx playwright test e2e/hub-mvp.spec.ts --workers=1
npx playwright test e2e/hub-dtic-agent-handoff.spec.ts --workers=1
```

For real submit proof only when the GLPI/Hermes runtime is intentionally available:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npx playwright test e2e/hub-dtic-agent-submit-clean.spec.ts --workers=1
```

### Done means

- runtime proof shows one assisted DTIC entry path
- error state has retry only
- draft and submit paths remain protected

## Execution Order Inside The Hub Repo

1. `HU-1` canonical flow contract
2. `HU-2` full state story coverage
3. `HU-3` legacy residue disposition
4. `HU-4` runtime proof

This order matters because:

- the current source already improved the user-facing ambiguity
- the remaining risk is future drift and incomplete state protection
- story/state modeling should happen before any code cleanup that might touch the flow

## HU-2 Completion Note

Completed after this dossier:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatSurface.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatSurface.stories.tsx`

The runtime container remains:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`

Story states now covered:

- `ready`
- `booting`
- `unavailable`
- `sending`
- `clarifying`
- `draft_ready`
- `submitted`
- `actionError`

Visual gate update:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\storybook-e2e\storybook-visual.spec.ts` now includes the full assisted chat surface in dark and light mode.

Tooling note:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\.storybook\main.ts` now sets `chunkSizeWarningLimit: 1500` for Storybook/Vite tooling, matching the already-classified pattern used in the other Casa Civil frontend pilots.

## HU-3 Completion Note

Completed after this dossier:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\README.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`

Disposition:

- `agent-entry` is kept as legacy residue and explicitly marked as non-canonical.
- `buildLegacyDticAgentUrl()` is kept as a legacy handoff helper and explicitly marked as not used by the canonical `DTIC/new-ticket` UX.

Deletion was intentionally not performed in this pass because classification is enough to remove implementation ambiguity while preserving any rollback or test context until a later cleanup decision.

## HU-4 Completion Note

Completed after this dossier with real runtime proof:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts`

Runtime evidence directory generated by the test:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase23-dtic-inline-agent-submit-clean`

Generated artifacts include:

- entry screenshot
- inline conversation screenshot and transcript
- draft screenshot and transcript
- success screenshot and transcript
- DTIC hub ticket detail JSON
- raw GLPI ticket JSON
- agent audit events JSON
- test summary JSON

Observed proof:

- inline chat opened under `/dtic/new-ticket`
- draft was created in the hub
- ticket was opened through the assisted flow
- the created ticket detail was visible in the hub
- the GLPI ticket was fetched and then deleted in cleanup

This closes the runtime side of the hub epic with:

- local visual proof
- standard hub validation
- Playwright smoke for navigation and inline handoff
- real submit-and-cleanup mutation proof

## Closure Proof

This epic is complete only when all of the following are true:

1. The canonical inline chat rule is documented.
2. Full assisted-flow states are modeled or explicitly covered by stable fixtures.
3. Legacy external handoff residue is classified or removed.
4. Runtime validation proves `/dtic/new-ticket` serves the current inline chat.
5. Protected files remain untouched unless a separate explicit plan and regression path exists.

## Final Instruction

Do not start this epic by redesigning the hub shell.

Start by freezing canonicity and state coverage for:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.tsx`

Only after that should legacy cleanup or UI polish be proposed.
