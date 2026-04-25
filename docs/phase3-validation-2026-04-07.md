# Phase 3 Validation - 2026-04-07

## Objective

Validate the `SIS` mutation path in the extracted project end-to-end:

1. open the real `SIS` FormCreator flow in the new project
2. submit a real service request through the UI
3. confirm the created ticket is visible in the extracted app
4. clean both the generated `Ticket` and `PluginFormcreatorFormAnswer`

## Scope

Project under validation:

`C:\Users\jonathan-moletta\code\hub-operacional-web`

URL:

`http://localhost:18080`

Automated mutation smoke:

- [hub-sis-submit-clean.spec.ts](C:\Users\jonathan-moletta\code\hub-operacional-web\web\e2e\hub-sis-submit-clean.spec.ts)

## What the mutation smoke does

1. logs in through the extracted gateway
2. selects `SIS`
3. opens `SIS/new-ticket`
4. selects the `Carregadores` service
5. fills the minimum real fields through the UI
6. submits the form through the extracted app
7. polls the extracted backend ticket list to resolve the real created ticket id
8. opens the created ticket detail in the extracted app
9. deletes the created `Ticket` directly in GLPI with `force_purge=true`
10. deletes the created `PluginFormcreatorFormAnswer` directly in GLPI with `force_purge=true`
11. verifies:
   - the ticket disappears from the requester list
   - the form answer is no longer retrievable

## Validation command

Run from:

`C:\Users\jonathan-moletta\code\hub-operacional-web\web`

```powershell
$env:SMOKE_USERNAME='jonathan-moletta'
$env:SMOKE_PASSWORD='JNMolett@#2025!!!'
$env:SMOKE_BASE_URL='http://localhost:18080'
npm exec playwright test e2e/hub-sis-submit-clean.spec.ts
```

## Result

Smoke passed.

Real run summary:

- marker: `CODEX-HUB-NEW-SIS-20260407224346`
- form answer id: `5429`
- ticket id: `8001`
- detail visible in extracted app: `true`
- ticket deleted: `true`
- form answer deleted: `true`
- post-delete matches in requester list: `[]`

Source:

- [summary.json](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\summary.json)

## Visual evidence

- [01-sis-step2-filled.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\01-sis-step2-filled.png)
- [02-sis-step3-filled.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\02-sis-step3-filled.png)
- [03-sis-review.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\03-sis-review.png)
- [04-sis-after-submit.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\04-sis-after-submit.png)
- [05-sis-user-list-with-marker.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\05-sis-user-list-with-marker.png)
- [06-sis-detail-created-ticket.png](C:\Users\jonathan-moletta\code\hub-operacional-web\web\output\phase3-sis-submit-clean\06-sis-detail-created-ticket.png)

## What is now proven in the clean extracted project

The extracted app now proves, on the `SIS` side:

- login works
- selector works
- dashboard and requester list work
- FormCreator catalog works
- real schema loading works
- real form submission works through the extracted UI
- the created ticket becomes visible in the extracted UI
- cleanup can be executed deterministically after the smoke

## Remaining scope outside this phase

- followup mutation validation in the extracted project
- attachment upload validation in the extracted project
- `DTIC` agent execution beyond the current agent-first entry
- deeper cleanup of inherited non-MVP support code
