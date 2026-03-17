from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services import ticket_workflow_service
from app.schemas.tickets import TicketAssumeRequest, TicketTransferRequest


class _FakeTicketClient:
    def __init__(self):
        self.created: list[tuple[str, dict]] = []
        self.updated: list[tuple[str, int, dict]] = []
        self.deleted: list[tuple[str, int]] = []

    async def get_item(self, itemtype: str, item_id: int, **params):
        if itemtype == "Ticket":
            return {
                "id": item_id,
                "name": "Ticket <b>Principal</b>",
                "content": "<p>Descricao do ticket</p>",
                "itilcategories_id_completename": "Infra > Rede",
                "status": 2,
                "status_completename": "Em Atendimento",
                "urgency": 3,
                "urgency_name": "Media",
                "priority": 4,
                "type": 1,
                "date": "2026-03-15T10:00:00-03:00",
                "date_mod": "2026-03-15T11:00:00-03:00",
                "locations_id_completename": "Patio",
                "entities_id_completename": "Central",
            }
        if itemtype == "User" and item_id == 10:
            return {"id": 10, "name": "alice"}
        if itemtype == "User" and item_id == 20:
            return {"id": 20, "name": "bob"}
        if itemtype == "User" and item_id == 30:
            return {"id": 30, "name": "carol"}
        if itemtype == "Group":
            return {"id": item_id, "completename": "Equipe > N1"}
        raise AssertionError(f"get_item inesperado: {itemtype}#{item_id}")

    async def get_sub_items(self, itemtype: str, item_id: int, sub_itemtype: str, **params):
        if sub_itemtype == "ITILFollowup":
            return [
                {
                    "id": 1,
                    "content": "<div>Primeiro retorno</div>",
                    "date": "2026-03-15T10:30:00-03:00",
                    "users_id": 20,
                    "is_private": 0,
                }
            ]
        if sub_itemtype == "ITILSolution":
            return [
                {
                    "id": 2,
                    "content": "<p>Aplicada correcao</p>",
                    "date_creation": "2026-03-15T10:45:00-03:00",
                    "users_id": 20,
                    "status": 3,
                }
            ]
        if sub_itemtype == "TicketTask":
            return [
                {
                    "id": 3,
                    "content": "<p>Executar validacao</p>",
                    "date_creation": "2026-03-15T10:40:00-03:00",
                    "users_id_tech": 20,
                    "is_private": 1,
                    "actiontime": 1800,
                }
            ]
        if sub_itemtype == "Ticket_User":
            return [
                {"id": 100, "users_id": 10, "type": 1},
                {"id": 101, "users_id": 20, "type": 2},
            ]
        if sub_itemtype == "Group_Ticket":
            return [{"id": 200, "groups_id": 55, "type": 2}]
        raise AssertionError(f"get_sub_items inesperado: {sub_itemtype}")

    async def create_item(self, itemtype: str, payload: dict):
        self.created.append((itemtype, payload))
        return {"id": 999}

    async def update_item(self, itemtype: str, item_id: int, payload: dict):
        self.updated.append((itemtype, item_id, payload))
        return {"id": item_id}

    async def delete_item(self, itemtype: str, item_id: int):
        self.deleted.append((itemtype, item_id))
        return True

@pytest.mark.asyncio
async def test_get_ticket_detail_normalizes_names_timeline_and_flags(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        assert context == "dtic"
        return client

    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    detail = await ticket_workflow_service.service.get_ticket_detail("dtic", 42)

    assert detail.requester_name == "alice"
    assert detail.technician_name == "bob"
    assert detail.group_name == "Equipe > N1"
    assert detail.ticket.content == "Descricao do ticket"
    assert detail.ticket.category == "Infra > Rede"
    assert detail.flags.is_in_progress is True
    assert detail.flags.has_assigned_technician is True
    assert [entry.type for entry in detail.timeline] == ["followup", "task", "solution"]
    assert detail.timeline[0].date.isoformat().endswith("-03:00")
    assert detail.timeline[1].user_name == "bob"
    assert detail.timeline[2].solution_status == 3


@pytest.mark.asyncio
async def test_transfer_ticket_replaces_assignment_and_reopens_when_needed(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        assert context == "sis"
        return client

    async def fake_get_item(itemtype: str, item_id: int, **params):
        if itemtype == "Ticket":
            return {"id": item_id, "status": 1}
        return await _FakeTicketClient.get_item(client, itemtype, item_id, **params)

    client.get_item = fake_get_item  # type: ignore[method-assign]
    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    response = await ticket_workflow_service.service.transfer_ticket(
        "sis",
        77,
        TicketTransferRequest(technician_user_id=30),
    )

    assert response.success is True
    assert ("Ticket_User", 101) in client.deleted
    assert ("Ticket_User", {"tickets_id": 77, "users_id": 30, "type": 2}) in client.created
    assert ("Ticket", 77, {"status": 2}) in client.updated


@pytest.mark.asyncio
async def test_assume_ticket_updates_status_and_assignment(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        return client

    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    await ticket_workflow_service.service.assume_ticket(
        "sis",
        99,
        TicketAssumeRequest(technician_user_id=20),
    )

    assert ("Ticket_User", 101) in client.deleted
    assert ("Ticket_User", {"tickets_id": 99, "users_id": 20, "type": 2}) in client.created
    assert ("Ticket", 99, {"status": 2}) in client.updated


@pytest.mark.asyncio
async def test_approve_solution_updates_solution_followup_and_closes_ticket(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        return client

    async def fake_get_sub_items(itemtype: str, item_id: int, sub_itemtype: str, **params):
        if sub_itemtype == "ITILSolution":
            return [
                {
                    "id": 21,
                    "content": "<p>Solucao aplicada</p>",
                    "date_creation": "2026-03-15T10:45:00-03:00",
                    "users_id": 20,
                    "status": 2,
                }
            ]
        return await _FakeTicketClient.get_sub_items(client, itemtype, item_id, sub_itemtype, **params)

    client.get_sub_items = fake_get_sub_items  # type: ignore[method-assign]
    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    response = await ticket_workflow_service.service.approve_solution(
        "dtic",
        42,
        actor_user_id=10,
        comment="Aprovado pelo solicitante",
    )

    assert response.success is True
    assert response.ticket_id == 42
    assert any(
        itemtype == "ITILSolution"
        and item_id == 21
        and payload.get("status") == 3
        and payload.get("users_id_approval") == 10
        and isinstance(payload.get("date_approval"), str)
        for itemtype, item_id, payload in client.updated
    )
    assert ("Ticket", 42, {"status": 6}) in client.updated
    assert any(
        itemtype == "ITILFollowup"
        and payload.get("content") == "Aprovado pelo solicitante"
        and payload.get("users_id") == 10
        for itemtype, payload in client.created
    )


@pytest.mark.asyncio
async def test_reject_solution_updates_solution_followup_and_reopens_ticket(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        return client

    async def fake_get_sub_items(itemtype: str, item_id: int, sub_itemtype: str, **params):
        if sub_itemtype == "ITILSolution":
            return [
                {
                    "id": 31,
                    "content": "<p>Solucao aplicada</p>",
                    "date_creation": "2026-03-15T10:45:00-03:00",
                    "users_id": 20,
                    "status": 2,
                }
            ]
        return await _FakeTicketClient.get_sub_items(client, itemtype, item_id, sub_itemtype, **params)

    client.get_sub_items = fake_get_sub_items  # type: ignore[method-assign]
    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    response = await ticket_workflow_service.service.reject_solution(
        "dtic",
        42,
        actor_user_id=10,
        comment="Problema persiste",
    )

    assert response.success is True
    assert response.ticket_id == 42
    assert any(
        itemtype == "ITILSolution"
        and item_id == 31
        and payload.get("status") == 4
        and payload.get("users_id_approval") == 10
        and isinstance(payload.get("date_approval"), str)
        for itemtype, item_id, payload in client.updated
    )
    assert ("Ticket", 42, {"status": 2}) in client.updated
    assert any(
        itemtype == "ITILFollowup"
        and payload.get("content") == "Problema persiste"
        and payload.get("users_id") == 10
        for itemtype, payload in client.created
    )


@pytest.mark.asyncio
async def test_approve_solution_denies_non_requester_actor(monkeypatch):
    client = _FakeTicketClient()

    async def fake_get_client(context: str):
        return client

    async def fake_get_sub_items(itemtype: str, item_id: int, sub_itemtype: str, **params):
        if sub_itemtype == "ITILSolution":
            return [{"id": 41, "status": 2, "users_id": 20}]
        return await _FakeTicketClient.get_sub_items(client, itemtype, item_id, sub_itemtype, **params)

    client.get_sub_items = fake_get_sub_items  # type: ignore[method-assign]
    monkeypatch.setattr(ticket_workflow_service.session_manager, "get_client", fake_get_client)

    with pytest.raises(HTTPException) as error:
        await ticket_workflow_service.service.approve_solution("dtic", 42, actor_user_id=999)

    assert error.value.status_code == 403
    assert "solicitante" in str(error.value.detail).lower()
