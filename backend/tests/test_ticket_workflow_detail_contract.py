from __future__ import annotations

from contextlib import asynccontextmanager
from types import SimpleNamespace

import pytest

from app.services.ticket_workflow_service import TicketWorkflowService


class FakeTicketClient:
    def __init__(self, include_api_logs: bool = True) -> None:
        self.include_api_logs = include_api_logs
        self.downloaded_document_id: int | None = None

    async def get_item(self, itemtype: str, item_id: int, **params):
        if itemtype == "Ticket" and item_id == 14134:
            payload = {
                "id": 14134,
                "name": "Dar acesso Caixa Compartilhada",
                "content": '<a href="/glpi/front/document.send.php?docid=4114&amp;tickets_id=14134">image</a>',
                "status": 1,
                "status_completename": "Novo",
                "urgency": 3,
                "urgency_name": "Media",
                "priority": 3,
                "type": 2,
                "date": "2026-04-30 16:48:33",
                "date_mod": "2026-04-30 17:17:33",
            }
            if self.include_api_logs:
                payload["_logs"] = [
                    {
                        "id": 9001,
                        "date_mod": "2026-04-30 17:17:33",
                        "user_name": "Silvio Godinho Valim",
                        "itemtype_link": "ITILFollowup",
                        "linked_action": "add",
                        "old_value": "",
                        "new_value": "18495",
                    }
                ]
            return payload
        if itemtype == "Document" and item_id == 4114:
            return {
                "id": 4114,
                "filename": "image_paste2155256.png",
                "mime": "image/png",
                "filesize": 45668,
                "date_creation": "2026-04-30 16:48:33",
            }
        if itemtype == "Document" and item_id == 4115:
            return {
                "id": 4115,
                "filename": "age_paste6581061.png",
                "mime": "image/png",
                "filesize": 25241,
                "date_creation": "2026-04-30 17:17:33",
            }
        if itemtype == "User" and item_id == 1615:
            return {"id": 1615, "name": "natyele-silva", "realname": "Natyele Silva"}
        if itemtype == "User" and item_id == 32:
            return {"id": 32, "name": "silvio-valim", "realname": "Silvio Valim"}
        if itemtype == "User" and item_id == 1626:
            return {"id": 1626, "name": "cynthia-moreira", "realname": "Cynthia Moreira"}
        if itemtype == "Group" and item_id == 91:
            return {"id": 91, "completename": "CC > SUBADM > DTIC > N3"}
        return {"id": item_id}

    async def get_sub_items(self, itemtype: str, item_id: int, sub_itemtype: str, **params):
        key = (itemtype, item_id, sub_itemtype)
        data = {
            ("Ticket", 14134, "ITILFollowup"): [
                {
                    "id": 18495,
                    "content": '<a href="/glpi/front/document.send.php?docid=4115&amp;tickets_id=14134">image</a>',
                    "date": "2026-04-30 17:17:33",
                    "users_id": 32,
                    "is_private": 0,
                }
            ],
            ("Ticket", 14134, "ITILSolution"): [],
            ("Ticket", 14134, "TicketTask"): [],
            ("Ticket", 14134, "Ticket_User"): [
                {"id": 1, "users_id": 1615, "type": 1},
                {"id": 2, "users_id": 32, "type": 2},
                {"id": 3, "users_id": 1626, "type": 3},
            ],
            ("Ticket", 14134, "Group_Ticket"): [
                {"id": 4, "groups_id": 91, "type": 2},
            ],
            ("Ticket", 14134, "Document_Item"): [
                {
                    "id": 6264,
                    "documents_id": 4114,
                    "itemtype": "Ticket",
                    "items_id": 14134,
                    "date_mod": "2026-04-30 16:48:33",
                }
            ],
            ("ITILFollowup", 18495, "Document_Item"): [
                {
                    "id": 6265,
                    "documents_id": 4115,
                    "itemtype": "ITILFollowup",
                    "items_id": 18495,
                    "date_mod": "2026-04-30 17:17:33",
                }
            ],
        }
        return data.get(key, [])

    async def download_document(self, document_id: int):
        self.downloaded_document_id = document_id
        return SimpleNamespace(content=b"png-bytes")


def bind_fake_client(service: TicketWorkflowService, fake_client: FakeTicketClient) -> None:
    @asynccontextmanager
    async def fake_user_client(context: str, session_token: str):
        yield fake_client

    service._user_client = fake_user_client  # type: ignore[method-assign]


class FakeDbResult:
    def __init__(self, rows: list[dict]) -> None:
        self._rows = rows

    def mappings(self):
        return self

    def all(self) -> list[dict]:
        return self._rows


class FakeDb:
    def __init__(self, rows: list[dict]) -> None:
        self.rows = rows
        self.params: dict | None = None

    async def execute(self, _statement, params):
        self.params = params
        return FakeDbResult(self.rows)


@pytest.mark.asyncio
async def test_ticket_detail_includes_followup_attachments_and_actors() -> None:
    service = TicketWorkflowService()
    fake_client = FakeTicketClient()
    bind_fake_client(service, fake_client)

    detail = await service.get_ticket_detail("dtic", 14134, "session-token")

    assert [attachment.id for attachment in detail.attachments] == [4114, 4115]
    assert detail.attachments[0].parent_type == "Ticket"
    assert detail.attachments[1].parent_type == "ITILFollowup"
    assert detail.timeline[0].attachments[0].id == 4115
    assert detail.timeline[0].document_refs == [4115]
    assert detail.ticket.document_refs == [4114]
    assert [actor.role for actor in detail.actors] == ["requester", "technician", "observer"]
    assert detail.audit_logs[0].linked_itemtype == "ITILFollowup"


@pytest.mark.asyncio
async def test_download_attachment_allows_document_linked_to_followup() -> None:
    service = TicketWorkflowService()
    fake_client = FakeTicketClient()
    bind_fake_client(service, fake_client)

    payload = await service.download_attachment("dtic", 14134, 4115, "session-token")

    assert fake_client.downloaded_document_id == 4115
    assert payload["filename"] == "age_paste6581061.png"
    assert payload["content"] == b"png-bytes"


@pytest.mark.asyncio
async def test_ticket_detail_uses_db_audit_logs_when_rest_payload_omits_logs() -> None:
    service = TicketWorkflowService()
    fake_client = FakeTicketClient(include_api_logs=False)
    bind_fake_client(service, fake_client)
    fake_db = FakeDb(
        [
            {
                "id": 9100,
                "date_mod": "2026-04-30 17:17:33",
                "user_name": "Silvio Godinho Valim (32)",
                "itemtype_link": "ITILFollowup",
                "linked_action": 17,
                "old_value": "",
                "new_value": "18495",
                "id_search_option": 0,
            }
        ]
    )

    detail = await service.get_ticket_detail("dtic", 14134, "session-token", db=fake_db)  # type: ignore[arg-type]

    assert fake_db.params == {"ticket_id": 14134}
    assert detail.audit_logs[0].id == 9100
    assert detail.audit_logs[0].user_name == "Silvio Godinho Valim"
    assert detail.audit_logs[0].linked_itemtype == "ITILFollowup"
    assert detail.audit_logs[0].linked_action == "add"
