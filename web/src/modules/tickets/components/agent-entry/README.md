# DTIC Agent Entry Legacy Note

This folder contains the older structured DTIC agent-entry handoff experiment.

It is **not** the canonical `DTIC/new-ticket` implementation.

Canonical flow:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\app\[context]\new-ticket\page.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatEntry.tsx`
- `C:\Users\jonathan-moletta\code\hub-operacional-web\web\src\modules\tickets\components\agent-chat\DticAgentChatSurface.tsx`

Current rule:

- DTIC uses inline Hermes chat inside the hub.
- SIS contexts continue to use the form wizard.
- The unavailable DTIC state offers retry, not a second chat path.

Do not reuse this folder as the active `DTIC/new-ticket` UX without a new plan and regression path.

Contract:

- `C:\Users\jonathan-moletta\code\hub-operacional-web\docs\dtic-new-ticket-assisted-flow-contract-v1.md`
