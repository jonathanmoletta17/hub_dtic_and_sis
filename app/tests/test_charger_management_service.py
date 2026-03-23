from __future__ import annotations

from datetime import datetime
from pathlib import Path

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker

from app.schemas.charger_management import (
    ActorIdentity,
    AssignmentCreateRequest,
    AssignmentStatusActionRequest,
    ChargerCreateRequest,
    ChargerInactivationRequest,
    ChargerUpdateRequest,
    TicketSolutionRequest,
    TimeRuleCreateRequest,
)
from app.services.charger_management_service import ChargerManagementError, ChargerManagementService
from app.services.charger_management_store import initialize_charger_management_state


def _dt(value: str) -> datetime:
    return datetime.fromisoformat(value)


@pytest.fixture
def manager_actor() -> ActorIdentity:
    return ActorIdentity(user_id="10", role="gestor", display_name="Manager", request_id="req-1")


@pytest.fixture
def operator_actor() -> ActorIdentity:
    return ActorIdentity(user_id="11", role="operador", display_name="Operator", request_id="req-2")


@pytest.fixture
def service() -> ChargerManagementService:
    return ChargerManagementService()


@pytest.fixture
async def db_session(tmp_path: Path):
    db_path = tmp_path / "charger_management.db"
    engine = create_async_engine(f"sqlite+aiosqlite:///{db_path}")
    session_maker = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    await initialize_charger_management_state(engine)
    async with session_maker() as session:
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_create_update_delete_charger_and_audit(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
):
    created = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador A1", department="SIS"),
    )
    assert created["id"] > 0
    assert created["status"] == "active"

    listed = await service.list_chargers(db_session, actor=manager_actor, include_deleted=False)
    assert len(listed) == 1
    assert listed[0]["name"] == "Carregador A1"

    updated = await service.update_charger(
        db_session,
        actor=manager_actor,
        charger_id=created["id"],
        payload=ChargerUpdateRequest(status="maintenance"),
    )
    assert updated["status"] == "maintenance"

    deleted = await service.delete_charger(
        db_session,
        actor=manager_actor,
        charger_id=created["id"],
    )
    assert deleted["status"] == "inactive"
    assert deleted["deleted_at"] is not None

    audits = await service.read_audit(
        db_session,
        actor=manager_actor,
        entity_type="charger",
        entity_id=str(created["id"]),
        limit=50,
    )
    actions = [item["action"] for item in audits]
    assert "charger.create" in actions
    assert "charger.update" in actions
    assert "charger.delete" in actions


@pytest.mark.asyncio
async def test_time_rule_overlap_returns_conflict(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
):
    charger = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador B1", department="SIS"),
    )

    await service.create_time_rule(
        db_session,
        actor=manager_actor,
        charger_id=charger["id"],
        payload=TimeRuleCreateRequest(
            business_start="08:00",
            business_end="18:00",
            idle_threshold_minutes=45,
            effective_from=_dt("2026-03-01T00:00:00-03:00"),
            effective_to=_dt("2026-03-31T23:59:00-03:00"),
        ),
    )

    with pytest.raises(ChargerManagementError) as error:
        await service.create_time_rule(
            db_session,
            actor=manager_actor,
            charger_id=charger["id"],
            payload=TimeRuleCreateRequest(
                business_start="09:00",
                business_end="19:00",
                idle_threshold_minutes=45,
                effective_from=_dt("2026-03-15T00:00:00-03:00"),
                effective_to=None,
            ),
        )
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_assignment_conflict_validation(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
    operator_actor: ActorIdentity,
):
    charger = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador C1", department="SIS"),
    )

    await service.create_assignment(
        db_session,
        actor=operator_actor,
        payload=AssignmentCreateRequest(
            ticket_id=1001,
            charger_id=charger["id"],
            planned_start_at=_dt("2026-03-20T08:00:00-03:00"),
            planned_end_at=_dt("2026-03-20T10:00:00-03:00"),
        ),
    )

    with pytest.raises(ChargerManagementError) as error:
        await service.create_assignment(
            db_session,
            actor=operator_actor,
            payload=AssignmentCreateRequest(
                ticket_id=1002,
                charger_id=charger["id"],
                planned_start_at=_dt("2026-03-20T09:00:00-03:00"),
                planned_end_at=_dt("2026-03-20T11:00:00-03:00"),
            ),
        )
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_assignment_lifecycle_and_notifications(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
    operator_actor: ActorIdentity,
):
    charger = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador D1", department="SIS"),
    )
    assignment = await service.create_assignment(
        db_session,
        actor=operator_actor,
        payload=AssignmentCreateRequest(
            ticket_id=2001,
            charger_id=charger["id"],
            planned_start_at=_dt("2026-03-20T08:00:00-03:00"),
            planned_end_at=_dt("2026-03-20T12:00:00-03:00"),
        ),
    )

    started = await service.start_assignment(
        db_session,
        actor=operator_actor,
        assignment_id=assignment["id"],
        payload=AssignmentStatusActionRequest(reason="inicio"),
    )
    assert started["status"] == "active"
    assert started["actual_start_at"] is not None

    finished = await service.finish_assignment(
        db_session,
        actor=operator_actor,
        assignment_id=assignment["id"],
        payload=AssignmentStatusActionRequest(reason="fim"),
    )
    assert finished["status"] == "completed"
    assert finished["actual_end_at"] is not None

    notifications = await service.read_notifications(
        db_session,
        actor=manager_actor,
        only_pending=True,
        limit=20,
    )
    event_types = [item["event_type"] for item in notifications]
    assert "assignment.created" in event_types
    assert "assignment.active" in event_types
    assert "assignment.completed" in event_types


@pytest.mark.asyncio
async def test_inactivation_blocks_when_future_assignment_exists(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
    operator_actor: ActorIdentity,
):
    charger = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador E1", department="SIS"),
    )
    assignment = await service.create_assignment(
        db_session,
        actor=operator_actor,
        payload=AssignmentCreateRequest(
            ticket_id=3001,
            charger_id=charger["id"],
            planned_start_at=_dt("2026-03-20T14:00:00-03:00"),
            planned_end_at=_dt("2026-03-20T16:00:00-03:00"),
        ),
    )
    with pytest.raises(ChargerManagementError) as error:
        await service.inactivate_charger(
            db_session,
            actor=manager_actor,
            charger_id=charger["id"],
            payload=ChargerInactivationRequest(
                reason_code="vacation",
                inactivated_at=_dt("2026-03-20T10:00:00-03:00"),
                expected_return_at=_dt("2026-03-25T10:00:00-03:00"),
            ),
        )
    assert error.value.status_code == 409

    await service.cancel_assignment(
        db_session,
        actor=operator_actor,
        assignment_id=assignment["id"],
        payload=AssignmentStatusActionRequest(reason="cancelado"),
    )
    inactivated = await service.inactivate_charger(
        db_session,
        actor=manager_actor,
        charger_id=charger["id"],
        payload=ChargerInactivationRequest(
            reason_code="vacation",
            inactivated_at=_dt("2026-03-20T10:00:00-03:00"),
            expected_return_at=_dt("2026-03-25T10:00:00-03:00"),
        ),
    )
    assert inactivated["charger_id"] == charger["id"]


@pytest.mark.asyncio
async def test_report_metrics_planned_acting_and_idle(
    service: ChargerManagementService,
    db_session: AsyncSession,
    manager_actor: ActorIdentity,
    operator_actor: ActorIdentity,
):
    charger = await service.create_charger(
        db_session,
        actor=manager_actor,
        payload=ChargerCreateRequest(name="Carregador F1", department="SIS"),
    )
    await service.create_time_rule(
        db_session,
        actor=manager_actor,
        charger_id=charger["id"],
        payload=TimeRuleCreateRequest(
            business_start="08:00",
            business_end="18:00",
            idle_threshold_minutes=60,
            effective_from=_dt("2026-03-01T00:00:00-03:00"),
            effective_to=None,
        ),
    )
    assignment = await service.create_assignment(
        db_session,
        actor=operator_actor,
        payload=AssignmentCreateRequest(
            ticket_id=4001,
            charger_id=charger["id"],
            planned_start_at=_dt("2026-03-21T09:00:00-03:00"),
            planned_end_at=_dt("2026-03-21T11:00:00-03:00"),
        ),
    )

    await db_session.execute(
        text(
            """
            UPDATE charger_assignments
            SET status = 'completed',
                actual_start_at = :actual_start,
                actual_end_at = :actual_end
            WHERE id = :assignment_id
            """
        ),
        {
            "assignment_id": assignment["id"],
            "actual_start": "2026-03-21T09:00:00-03:00",
            "actual_end": "2026-03-21T11:00:00-03:00",
        },
    )
    await db_session.commit()

    report = await service.build_report(
        db_session,
        actor=manager_actor,
        start_at=_dt("2026-03-21T08:00:00-03:00"),
        end_at=_dt("2026-03-21T18:00:00-03:00"),
        charger_id=charger["id"],
        assignment_status=None,
    )
    assert len(report) == 1
    item = report[0]
    assert item["planned_minutes"] == 120
    assert item["acting_minutes"] == 120
    assert item["idle_minutes"] >= 480
    assert item["ticket_count"] == 1


@pytest.mark.asyncio
async def test_ticket_solution_moves_ticket_to_status_5(
    service: ChargerManagementService,
    db_session: AsyncSession,
    operator_actor: ActorIdentity,
    manager_actor: ActorIdentity,
    monkeypatch: pytest.MonkeyPatch,
):
    class FakeClient:
        def __init__(self):
            self.created: list[tuple[str, dict]] = []
            self.updated: list[tuple[str, int, dict]] = []

        async def create_item(self, itemtype: str, payload: dict):
            self.created.append((itemtype, payload))
            return {"id": 1}

        async def update_item(self, itemtype: str, item_id: int, payload: dict):
            self.updated.append((itemtype, item_id, payload))
            return {"id": item_id}

    fake_client = FakeClient()

    async def fake_get_client(context: str):
        assert context == "sis"
        return fake_client

    monkeypatch.setattr("app.services.charger_management_service.session_manager.get_client", fake_get_client)

    solved = await service.solve_ticket_and_wait_user_approval(
        db_session,
        actor=operator_actor,
        context="sis",
        ticket_id=5001,
        payload=TicketSolutionRequest(solution_content="Aplicado ajuste definitivo"),
    )
    assert solved["ticket_status"] == 5
    assert any(itemtype == "ITILSolution" for itemtype, _ in fake_client.created)
    assert ("Ticket", 5001, {"status": 5}) in fake_client.updated

    notifications = await service.read_notifications(
        db_session,
        actor=manager_actor,
        only_pending=True,
        limit=20,
    )
    assert any(item["event_type"] == "ticket.awaiting_user_approval" for item in notifications)
