# DTIC New Ticket Assisted Flow Contract v1

## Objective

Define the canonical behavior of `DTIC/new-ticket` in the hub.

This contract exists to prevent the assisted ticket flow from drifting back into two competing interaction models:

- inline Hermes chat inside the hub
- legacy external agent handoff or alternate chat launch

The canonical model is the inline Hermes chat inside the hub.

## Scope

Included:

- `/home/jonathan/projects/work/hub-operacional-web/web/src/app/[context]/new-ticket/page.tsx`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/ticket-entry.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/mvp-navigation.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentWelcomePanel.tsx`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/api/agent-chat-service.ts`

Out of scope:

- backend auth contract
- context registry contract
- GLPI ticket API contract
- Hermes internal classification behavior
- SIS form wizard behavior
- broad hub shell redesign

Protected files remain protected:

- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/context-registry.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/store/useAuthStore.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/api/httpClient.ts`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/services/auth_service.py`
- `/home/jonathan/projects/work/hub-operacional-web/backend/app/core/contexts.yaml`

## Contract

### C1 - DTIC uses agent mode

`dtic` must resolve to `agents`.

Evidence:

- `/home/jonathan/projects/work/hub-operacional-web/web/src/lib/ticket-entry.ts`

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

- `/home/jonathan/projects/work/hub-operacional-web/web/src/app/[context]/new-ticket/page.tsx`

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

- `/home/jonathan/projects/work/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentChatEntry.tsx`

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

- `/home/jonathan/projects/work/glpi-ticket-agent-mvp`

### C7 - Draft submit remains explicit

A ticket must not be opened automatically from a user message.

The user must see the draft-ready state and explicitly choose the submit action.

Runtime anchor:

- `/home/jonathan/projects/work/hub-operacional-web/web/e2e/hub-dtic-agent-chat.spec.ts`
- `/home/jonathan/projects/work/hub-operacional-web/web/e2e/hub-dtic-agent-submit-clean.spec.ts`

### C8 - Legacy handoff code is removed

The older `agent-entry` implementation is not part of the canonical DTIC new-ticket route and was removed from `web/src/modules/tickets/components/agent-entry/`.

Removed residues:

- `web/src/modules/tickets/components/agent-entry/README.md`
- `web/src/modules/tickets/components/agent-entry/DticAgentEntry.tsx`
- `web/src/modules/tickets/components/agent-entry/dtic-agent-flow.ts`
- `web/src/modules/tickets/components/agent-entry/dtic-agent-flow.test.ts`

Also removed:

- `buildLegacyDticAgentUrl()`

Current disposition:

- no legacy alternate handoff implementation remains in the frontend source
- `DTIC/new-ticket` stays on `DticAgentChatEntry`
- `NEXT_PUBLIC_DTIC_AGENT_URL` remains only as public Hermes URL configuration, not as a second UI path

Allowed dispositions:

1. keep removed while inline chat remains canonical
2. reintroduce only with a new plan, clear ownership and regression path
3. prefer fixtures or tests over a second user-facing chat path

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

- `/home/jonathan/projects/work/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentWelcomePanel.stories.tsx`
- `/home/jonathan/projects/work/hub-operacional-web/web/src/modules/tickets/components/agent-chat/DticAgentChatSurface.stories.tsx`

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
3. keep legacy `agent-entry` removed unless a new explicit plan reintroduces it
4. prove the canonical runtime through the standard hub validation

## Validation

For documentation-only changes:

- no runtime test is required
- evidence is the file itself plus references to the existing source anchors

For story or UI changes:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npm run storybook:test
npm run storybook:visual
```

For runtime proof:

```bash
cd /home/jonathan/projects/work/hub-operacional-web
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/doctor-runtime.ps1)"
powershell.exe -ExecutionPolicy Bypass -File "$(wslpath -w /home/jonathan/projects/work/hub-operacional-web/scripts/validate-runtime.ps1)"
```

For material assisted-flow behavior changes:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npx playwright test e2e/hub-mvp.spec.ts --workers=1
npx playwright test e2e/hub-dtic-agent-chat.spec.ts --workers=1
```

For real GLPI submit proof, only when intentionally validating against live runtime:

```bash
cd /home/jonathan/projects/work/hub-operacional-web/web
npx playwright test e2e/hub-dtic-agent-submit-clean.spec.ts --workers=1
```

## Acceptance Criteria

This contract is satisfied when:

- `/dtic/new-ticket` renders the inline hub chat for DTIC
- `/sis/new-ticket` remains form-based unless separately migrated
- the unavailable state exposes retry, not alternate chat
- a ticket cannot be opened without explicit user confirmation
- no legacy `agent-entry` code path is present
- full state story coverage is added before further UI changes

## Related Documents

- `/home/jonathan/projects/work/hub-operacional-web/docs/archive/phase-reports/phase42-agent-trading-hub-slice-s1-executable-plan-2026-04-12.md`
- `/home/jonathan/projects/work/hub-operacional-web/docs/archive/phase-reports/phase44-hub-epic-h1-h2-executable-dossier-2026-04-12.md`
