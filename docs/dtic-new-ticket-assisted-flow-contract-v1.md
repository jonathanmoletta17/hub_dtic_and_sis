# DTIC New Ticket Assisted Flow Contract v1

## Objective

Define the canonical behavior of `DTIC/new-ticket` in the hub.

This contract exists to prevent the assisted ticket flow from drifting back into two competing interaction models:

- inline Hermes chat inside the hub
- legacy external agent handoff or alternate chat launch

The canonical model is the inline Hermes chat inside the hub.

## Scope

Included:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\ticket-entry.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\mvp-navigation.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`

Out of scope:

- backend auth contract
- context registry contract
- GLPI ticket API contract
- Hermes internal classification behavior
- SIS form wizard behavior
- broad hub shell redesign

Protected files remain protected:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\context-registry.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\store\useAuthStore.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\httpClient.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\services\auth_service.py`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\backend\app\core\contexts.yaml`

## Contract

### C1 - DTIC uses agent mode

`dtic` must resolve to `agents`.

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\ticket-entry.ts`

Current rule:

```ts
const ENTRY_MODE_BY_CONTEXT: Record<string, TicketEntryMode> = {
  dtic: "agents",
  sis: "form",
  "sis-manutencao": "form",
  "sis-memoria": "form",
};
```

### C2 - SIS contexts keep form mode

`sis`, `sis-manutencao` and `sis-memoria` must continue to resolve to `form` unless a separate SIS migration is planned.

This DTIC contract must not be used to migrate SIS into agent-first behavior by accident.

### C3 - The canonical DTIC component is `DticAgentChatEntry`

For `entryMode === "agents"`, the route must render:

- `DticAgentChatEntry`

For non-agent contexts, the route may render:

- `FormWizard`

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`

Current rule:

```tsx
{entryMode === "agents" ? <DticAgentChatEntry /> : <FormWizard contextLabel={wizardContextLabel} />}
```

### C4 - The assisted flow is inline

The user must remain inside the hub during the DTIC assisted intake.

The normal path is:

1. open `/dtic/new-ticket`
2. boot an assisted session
3. describe the problem or request
4. Hermes clarifies or prepares a draft
5. user reviews the draft
6. user explicitly opens the ticket
7. hub shows submitted state

The normal path is not:

- launch another chat application
- open an alternate assistant window
- redirect to legacy handoff
- show a second conversational entrypoint when Hermes fails

### C5 - The unavailable state has retry only

If the assisted session cannot start, the UI must expose one understandable path:

- `Tentar novamente`

It must not expose a second chat route such as:

- `Abrir atendimento alternativo`

Evidence:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`

Current copy anchor:

- `Atendimento indisponivel`
- `Tentar novamente`

### C6 - The hub does not own Hermes internals

The hub may display:

- status
- messages
- clarification questions
- ticket draft
- submit result
- retry/error behavior

The hub must not reimplement:

- semantic classification
- slot filling
- category thresholds
- incident/request precedence

Those remain owned by:

- `C:\Users\jonathan-moletta\code\glpi-ticket-agent-mvp`

### C7 - Draft submit remains explicit

A ticket must not be opened automatically from a user message.

The user must see the draft-ready state and explicitly choose the submit action.

Runtime anchor:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-handoff.spec.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-dtic-agent-submit-clean.spec.ts`

### C8 - Legacy handoff is not canonical

The older `agent-entry` implementation is not the canonical DTIC new-ticket route.

Residues that must be classified before reuse:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\README.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\DticAgentEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\dtic-agent-flow.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-entry\dtic-agent-flow.test.ts`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\lib\api\agent-chat-service.ts`

Relevant residue:

- `buildLegacyDticAgentUrl()`

Current disposition:

- kept as legacy code
- marked as non-canonical
- not used as the active `DTIC/new-ticket` UX

Allowed dispositions:

1. remove if confirmed unused
2. keep as explicit legacy support
3. convert useful parts into fixtures or tests

Not allowed:

- treating the legacy handoff flow as the current intended UX without a new plan

## State Model

The assisted DTIC flow must preserve these states:

- `booting`: session startup is in progress
- `error`: session startup failed; retry is available
- `ready`: session is ready for the user narrative
- `clarifying`: Hermes asks for missing information
- `draft_ready`: draft exists and can be reviewed/submitted
- `submitted`: ticket was opened
- `sending`: user message is being sent

Current story coverage:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentWelcomePanel.stories.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatSurface.stories.tsx`

Covered assisted-chat states:

- `booting`
- `unavailable/error`
- `ready`
- `sending`
- `clarifying`
- `draft_ready`
- `submitted`
- `actionError`

## Governance Decision

### governance-decision

The `DTIC/new-ticket` assisted flow is a hub-local protected workflow contract.

### classification

- scope: surface-specific
- family: `workspace-shell`
- subfamily: `ticket-intake`
- not foundation
- not shared package
- not analytics/search/operations

### follow-up-action

Proceed in this order:

1. keep this contract as the source of canonicity
2. add stable state stories for the full assisted chat
3. classify legacy `agent-entry` and `buildLegacyDticAgentUrl()`
4. prove the canonical runtime through the standard hub validation

## Validation

For documentation-only changes:

- no runtime test is required
- evidence is the file itself plus references to the existing source anchors

For story or UI changes:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npm run storybook:test
npm run storybook:visual
```

For runtime proof:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web
powershell -ExecutionPolicy Bypass -File .\scripts\doctor-runtime.ps1
powershell -ExecutionPolicy Bypass -File .\scripts\validate-runtime.ps1
```

For material assisted-flow behavior changes:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npx playwright test e2e/hub-mvp.spec.ts --workers=1
npx playwright test e2e/hub-dtic-agent-handoff.spec.ts --workers=1
```

For real GLPI submit proof, only when intentionally validating against live runtime:

```powershell
Set-Location C:\Users\jonathan-moletta\code\hub-operacional-web\web
npx playwright test e2e/hub-dtic-agent-submit-clean.spec.ts --workers=1
```

## Acceptance Criteria

This contract is satisfied when:

- `/dtic/new-ticket` renders the inline hub chat for DTIC
- `/sis/new-ticket` remains form-based unless separately migrated
- the unavailable state exposes retry, not alternate chat
- a ticket cannot be opened without explicit user confirmation
- future work treats `agent-entry` as legacy until classified
- full state story coverage is added before further UI changes

## Related Documents

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase42-agent-trading-hub-slice-s1-executable-plan-2026-04-12.md`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\phase44-hub-epic-h1-h2-executable-dossier-2026-04-12.md`
