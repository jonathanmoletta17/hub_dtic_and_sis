from __future__ import annotations

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from app.core.authorization import get_authorization_identity
from app.core.auth_guard import verify_session
from app.core.database import get_db, get_local_db
from app.main import app
from app.routers import chargers, db_read, knowledge, search, ticket_workflow


class _DummyExecuteResult:
    def __init__(self, row):
        self._row = row

    def fetchone(self):
        return self._row


class _DummySession:
    async def execute(self, sql, params=None):
        query = str(sql)
        if "inciodoexpedientefield" in query:
            return _DummyExecuteResult(
                SimpleNamespace(inciodoexpedientefield="07:00", fimdoexpedientefield="17:00")
            )
        if "statusofflinefield" in query:
            return _DummyExecuteResult(
                SimpleNamespace(
                    statusofflinefield=1,
                    motivodainatividadefield="Em manutenção",
                    expectativaderetornofield="18:00",
                )
            )
        raise AssertionError(f"SQL não esperado no teste: {query}")


@pytest.fixture
def client():
    async def override_verify_session():
        return {"validated": True, "session_token": "test-token", "source": "test"}

    async def override_get_db(context: str = "dtic"):
        yield _DummySession()

    async def override_get_local_db():
        yield object()

    async def override_get_authorization_identity(context: str):
        return {
            "context": context,
            "session_token": "test-token",
            "user_id": 42,
            "hub_roles": ["tecnico"],
            "active_hub_role": "tecnico",
            "app_access": {"carregadores"},
        }

    app.dependency_overrides[verify_session] = override_verify_session
    app.dependency_overrides[get_db] = override_get_db
    app.dependency_overrides[get_local_db] = override_get_local_db
    app.dependency_overrides[get_authorization_identity] = override_get_authorization_identity

    test_client = TestClient(app)
    yield test_client
    test_client.close()

    app.dependency_overrides.clear()


def test_openapi_declares_explicit_read_response_models(client: TestClient):
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]

    assert paths["/api/v1/{context}/db/tickets"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TicketListResponse")
    assert paths["/api/v1/{context}/tickets/search"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/SearchResponse")
    assert paths["/api/v1/{context}/tickets/{ticket_id}/detail"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TicketWorkflowDetailResponse")
    assert paths["/api/v1/{context}/tickets/{ticket_id}/followups"]["post"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TicketActionResponse")
    assert paths["/api/v1/{context}/knowledge/articles"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/KBListResponse")
    assert paths["/api/v1/{context}/chargers/{charger_id}/schedule"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/ChargerScheduleReadResponse")
    assert paths["/api/v1/{context}/chargers/{charger_id}/offline"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/ChargerOfflineReadResponse")
    assert paths["/api/v1/{context}/chargers/tickets/{ticket_id}/detail"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/TicketDetailResponse")
    assert paths["/api/v1/{context}/metrics/chargers"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/RankingResponse")
    assert paths["/api/v1/{context}/metrics/chargers/kanban"]["get"]["responses"]["200"]["content"]["application/json"]["schema"]["$ref"].endswith("/KanbanResponse")


def test_db_tickets_and_search_routes_validate_datetime_contract(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def fake_list_tickets(*args, **kwargs):
        return {
            "total": 1,
            "limit": 100,
            "offset": 0,
            "data": [
                {
                    "id": 42,
                    "title": "Ticket de teste",
                    "content": "Detalhe",
                    "statusId": 2,
                    "status": "Em Atendimento",
                    "urgencyId": 3,
                    "urgency": "Média",
                    "priority": 3,
                    "dateCreated": "2026-03-15T10:30:00-03:00",
                    "dateModified": "2026-03-15T11:00:00-03:00",
                    "solveDate": None,
                    "closeDate": None,
                    "requester": "Alice",
                    "technician": "Bob",
                    "category": "Categoria",
                }
            ],
        }

    async def fake_search_tickets(*args, **kwargs):
        return {
            "total": 1,
            "query": "42",
            "data": [
                {
                    "id": 42,
                    "title": "Ticket de busca",
                    "content": "Conteúdo",
                    "statusId": 2,
                    "status": "Em Atendimento",
                    "urgencyId": 3,
                    "urgency": "Média",
                    "priority": 3,
                    "dateCreated": "2026-03-15T10:30:00-03:00",
                    "dateModified": "2026-03-15T11:00:00-03:00",
                    "solveDate": None,
                    "closeDate": None,
                    "requester": "Alice",
                    "technician": "Bob",
                    "category": "Categoria",
                    "entity": "Central",
                    "group": "Equipe",
                    "relevance": 1.0,
                }
            ],
        }

    monkeypatch.setattr(db_read.ticket_list_service, "list_tickets", fake_list_tickets)
    monkeypatch.setattr(search, "search_tickets", fake_search_tickets)

    tickets_response = client.get("/api/v1/dtic/db/tickets", headers={"Session-Token": "test-token"})
    search_response = client.get("/api/v1/dtic/tickets/search?q=42", headers={"Session-Token": "test-token"})

    assert tickets_response.status_code == 200
    assert tickets_response.json()["context"] == "dtic"
    assert tickets_response.json()["data"][0]["dateCreated"].endswith("-03:00")

    assert search_response.status_code == 200
    assert search_response.json()["context"] == "dtic"
    assert search_response.json()["data"][0]["dateModified"].endswith("-03:00")


def test_knowledge_list_route_always_returns_categories_key(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def fake_search_kb_articles(*args, **kwargs):
        return {
            "total": 1,
            "articles": [
                {
                    "id": 5,
                    "name": "Artigo",
                    "category": "Categoria",
                    "category_id": 1,
                    "author": "Autor",
                    "date_creation": "2026-03-15T10:30:00-03:00",
                    "date_mod": "2026-03-15T11:00:00-03:00",
                    "is_faq": False,
                    "view_count": 10,
                }
            ],
        }

    monkeypatch.setattr(knowledge, "search_kb_articles", fake_search_kb_articles)

    response = client.get("/api/v1/dtic/knowledge/articles")

    assert response.status_code == 200
    assert response.json()["categories"] == []
    assert response.json()["articles"][0]["date_creation"].endswith("-03:00")


def test_charger_read_routes_validate_minimal_contracts(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def fake_read_global_schedule(*args, **kwargs):
        return {
            "business_start": "08:00",
            "business_end": "18:00",
            "work_on_weekends": False,
            "updated_at": "2026-03-15T10:30:00-03:00",
        }

    async def fake_get_ranking(*args, **kwargs):
        return {
            "context": "sis",
            "ranking": [
                {
                    "id": 7,
                    "name": "Carregador 7",
                    "completed_tickets": 9,
                    "average_wait_time": "1h 20m",
                    "total_service_minutes": 480,
                    "last_activity": "2026-03-15T12:00:00-03:00",
                }
            ],
            "timestamp": "2026-03-15T12:15:00-03:00",
        }

    async def fake_get_ticket_detail(*args, **kwargs):
        return {
            "id": 77,
            "name": "Ordem de serviço",
            "content": "Detalhe",
            "date": "2026-03-15T09:00:00-03:00",
            "status": 2,
            "priority": 3,
            "location": "Local",
            "category": "Categoria",
            "requester_name": "Alice",
            "chargers": [],
            "available_chargers": [],
        }

    async def fake_get_kanban_data(*args, **kwargs):
        return {
            "context": "sis",
            "demands": [
                {
                    "id": 77,
                    "name": "OS aguardando atribuicao",
                    "status": 1,
                    "priority": 3,
                    "date_creation": "2026-03-15T09:00:00-03:00",
                    "location": "Local",
                    "category": "Categoria",
                    "requester_name": "Alice",
                    "time_elapsed": "1h 0m",
                }
            ],
            "availableResources": [],
            "allocatedResources": [],
            "timestamp": "2026-03-15T12:20:00-03:00",
        }

    monkeypatch.setattr(chargers, "read_global_schedule", fake_read_global_schedule)
    monkeypatch.setattr(chargers.service, "get_ranking", fake_get_ranking)
    monkeypatch.setattr(chargers.service, "get_ticket_detail", fake_get_ticket_detail)
    monkeypatch.setattr(chargers.service, "get_kanban_data", fake_get_kanban_data)

    schedule_response = client.get("/api/v1/sis/chargers/10/schedule", headers={"Session-Token": "test-token"})
    offline_response = client.get("/api/v1/sis/chargers/10/offline", headers={"Session-Token": "test-token"})
    global_response = client.get("/api/v1/sis/chargers/global-schedule", headers={"Session-Token": "test-token"})
    ranking_response = client.get("/api/v1/sis/metrics/chargers", headers={"Session-Token": "test-token"})
    kanban_response = client.get("/api/v1/sis/metrics/chargers/kanban", headers={"Session-Token": "test-token"})
    detail_response = client.get("/api/v1/sis/chargers/tickets/77/detail", headers={"Session-Token": "test-token"})

    assert schedule_response.status_code == 200
    assert schedule_response.json() == {
        "business_start": "07:00",
        "business_end": "17:00",
        "work_on_weekends": False,
    }

    assert offline_response.status_code == 200
    assert offline_response.json() == {
        "is_offline": True,
        "reason": "Em manutenção",
        "expected_return": "18:00",
    }

    assert global_response.status_code == 200
    assert global_response.json()["updated_at"].endswith("-03:00")

    assert ranking_response.status_code == 200
    assert ranking_response.json()["ranking"][0]["last_activity"].endswith("-03:00")

    assert kanban_response.status_code == 200
    assert kanban_response.json()["timestamp"].endswith("-03:00")
    assert kanban_response.json()["demands"][0]["date_creation"].endswith("-03:00")

    assert detail_response.status_code == 200
    assert detail_response.json()["date"].endswith("-03:00")


def test_ticket_workflow_routes_validate_datetime_contract(client: TestClient, monkeypatch: pytest.MonkeyPatch):
    async def fake_get_ticket_detail(*args, **kwargs):
        return {
            "ticket": {
                "id": 42,
                "title": "Chamado workflow",
                "content": "Descricao",
                "category": "Categoria",
                "status_id": 2,
                "status": "Em Atendimento",
                "urgency_id": 3,
                "urgency": "Media",
                "priority": 3,
                "type": 1,
                "date_created": "2026-03-15T10:30:00-03:00",
                "date_modified": "2026-03-15T11:00:00-03:00",
                "solve_date": None,
                "close_date": None,
                "location": "Patio",
                "entity_name": "Central",
            },
            "requester_name": "Alice",
            "requester_user_id": 10,
            "technician_name": "Bob",
            "technician_user_id": 20,
            "group_name": "Equipe",
            "timeline": [
                {
                    "id": 1,
                    "type": "followup",
                    "content": "Atualizacao",
                    "date": "2026-03-15T10:45:00-03:00",
                    "user_id": 20,
                    "user_name": "Bob",
                    "is_private": False,
                    "action_time": None,
                    "solution_status": None,
                }
            ],
            "flags": {
                "is_new": False,
                "is_in_progress": True,
                "is_pending": False,
                "is_resolved": False,
                "is_closed": False,
                "has_assigned_technician": True,
            },
        }

    async def fake_add_followup(*args, **kwargs):
        return {
            "success": True,
            "message": "Acompanhamento adicionado com sucesso.",
            "ticket_id": 42,
        }

    monkeypatch.setattr(ticket_workflow.service, "get_ticket_detail", fake_get_ticket_detail)
    monkeypatch.setattr(ticket_workflow.service, "add_followup", fake_add_followup)

    detail_response = client.get("/api/v1/dtic/tickets/42/detail", headers={"Session-Token": "test-token"})
    followup_response = client.post(
        "/api/v1/dtic/tickets/42/followups",
        headers={"Session-Token": "test-token", "X-Active-Hub-Role": "tecnico"},
        json={"content": "Atualizacao", "user_id": 20, "is_private": False},
    )

    assert detail_response.status_code == 200
    assert detail_response.json()["ticket"]["date_created"].endswith("-03:00")
    assert detail_response.json()["timeline"][0]["date"].endswith("-03:00")

    assert followup_response.status_code == 200
    assert followup_response.json() == {
        "success": True,
        "message": "Acompanhamento adicionado com sucesso.",
        "ticket_id": 42,
    }
