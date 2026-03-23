from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.context_registry import registry
from app.core.datetime_contract import ensure_aware_datetime, now_in_app_timezone, now_utc, serialize_datetime
from app.core.session_manager import session_manager
from app.schemas.charger_management import (
    ActorIdentity,
    AssignmentCreateRequest,
    AssignmentStatusActionRequest,
    ChargerCreateRequest,
    ChargerInactivationRequest,
    ChargerUpdateRequest,
    TimeRuleCreateRequest,
    TicketSolutionRequest,
)
from app.services.charger_management_store import (
    enqueue_notification,
    insert_audit_event,
    list_audit_events,
    list_notifications,
)


logger = logging.getLogger(__name__)

DEFAULT_BUSINESS_START = "08:00"
DEFAULT_BUSINESS_END = "18:00"

MANAGER_ROLES = {"gestor", "admin"}
OPERATION_ROLES = {"gestor", "admin", "operador", "tecnico"}


class ChargerManagementError(Exception):
    def __init__(self, status_code: int, detail: str):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


@dataclass(frozen=True)
class Interval:
    start: datetime
    end: datetime

    def is_valid(self) -> bool:
        return self.end > self.start


def _normalize_datetime(value: datetime | str | None, *, fallback_now: bool = False) -> datetime:
    normalized = ensure_aware_datetime(value)
    if normalized is not None:
        return normalized
    if fallback_now:
        return now_in_app_timezone()
    raise ChargerManagementError(400, "Invalid datetime value.")


def _minutes_overlap(a: Interval, b: Interval) -> int:
    start = max(a.start, b.start)
    end = min(a.end, b.end)
    if end <= start:
        return 0
    return int((end - start).total_seconds() // 60)


def _parse_hhmm(value: str) -> tuple[int, int]:
    hour_str, minute_str = value.split(":")
    return int(hour_str), int(minute_str)


def _as_iso(value: datetime | str | None) -> str | None:
    return serialize_datetime(value)


def _as_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return _normalize_datetime(value)
    if isinstance(value, str):
        return ensure_aware_datetime(value)
    return None


class ChargerManagementService:
    def ensure_context_supported(self, context: str) -> str:
        try:
            base_context = registry.get_base_context(context)
        except Exception:
            base_context = context.split("-")[0]
        if base_context != "sis":
            raise ChargerManagementError(
                400,
                "Charger management is available only for SIS contexts.",
            )
        return base_context

    @staticmethod
    def _ensure_roles(actor: ActorIdentity, allowed: set[str]) -> None:
        role = ChargerManagementService._collapse_role((actor.role or "").strip().lower())
        if role not in allowed:
            raise ChargerManagementError(
                403,
                f"Access denied for role '{role}'. Required roles: {', '.join(sorted(allowed))}.",
            )

    @staticmethod
    def _collapse_role(role: str) -> str:
        if role.startswith("tecnico"):
            return "tecnico"
        if role.startswith("gestor"):
            return "gestor"
        return role

    @staticmethod
    async def _get_charger_row(session: AsyncSession, charger_id: int) -> dict[str, Any]:
        row = (
            await session.execute(
                text(
                    """
                    SELECT id, name, department, status, created_at, updated_at, deleted_at
                    FROM charger_registry
                    WHERE id = :charger_id
                    LIMIT 1
                    """
                ),
                {"charger_id": charger_id},
            )
        ).mappings().first()
        if row is None:
            raise ChargerManagementError(404, f"Charger '{charger_id}' not found.")
        return dict(row)

    @staticmethod
    def _charger_payload(row: dict[str, Any]) -> dict[str, Any]:
        return {
            "id": int(row["id"]),
            "name": str(row["name"]),
            "department": str(row["department"]),
            "status": str(row["status"]),
            "created_at": _normalize_datetime(row["created_at"], fallback_now=True),
            "updated_at": _normalize_datetime(row["updated_at"], fallback_now=True),
            "deleted_at": _as_datetime(row.get("deleted_at")),
        }

    async def create_charger(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        payload: ChargerCreateRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        now_iso = _as_iso(now_utc())
        result = await session.execute(
            text(
                """
                INSERT INTO charger_registry (
                    name,
                    department,
                    status,
                    created_at,
                    updated_at,
                    deleted_at
                ) VALUES (
                    :name,
                    :department,
                    'active',
                    :created_at,
                    :updated_at,
                    NULL
                )
                """
            ),
            {
                "name": payload.name.strip(),
                "department": payload.department.strip(),
                "created_at": now_iso,
                "updated_at": now_iso,
            },
        )
        charger_id = int(result.lastrowid or 0)
        charger_row = await self._get_charger_row(session, charger_id)
        after = self._charger_payload(charger_row)
        await insert_audit_event(
            session,
            entity_type="charger",
            entity_id=str(charger_id),
            action="charger.create",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            after=after,
        )
        await session.commit()
        return after

    async def list_chargers(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        include_deleted: bool = False,
    ) -> list[dict[str, Any]]:
        self._ensure_roles(actor, MANAGER_ROLES)
        where_clause = "" if include_deleted else "WHERE deleted_at IS NULL"
        rows = (
            await session.execute(
                text(
                    f"""
                    SELECT id, name, department, status, created_at, updated_at, deleted_at
                    FROM charger_registry
                    {where_clause}
                    ORDER BY name ASC
                    """
                )
            )
        ).mappings().all()
        return [self._charger_payload(dict(row)) for row in rows]

    async def update_charger(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
        payload: ChargerUpdateRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        before_row = await self._get_charger_row(session, charger_id)
        if before_row.get("deleted_at"):
            raise ChargerManagementError(409, "Cannot update a deleted charger.")

        updates = payload.model_dump(exclude_none=True)
        if not updates:
            raise ChargerManagementError(400, "No updates provided.")

        name = str(updates.get("name") or before_row["name"]).strip()
        department = str(updates.get("department") or before_row["department"]).strip()
        status = str(updates.get("status") or before_row["status"])
        now_iso = _as_iso(now_utc())
        await session.execute(
            text(
                """
                UPDATE charger_registry
                SET name = :name,
                    department = :department,
                    status = :status,
                    updated_at = :updated_at
                WHERE id = :charger_id
                """
            ),
            {
                "name": name,
                "department": department,
                "status": status,
                "updated_at": now_iso,
                "charger_id": charger_id,
            },
        )
        after_row = await self._get_charger_row(session, charger_id)
        before = self._charger_payload(before_row)
        after = self._charger_payload(after_row)
        await insert_audit_event(
            session,
            entity_type="charger",
            entity_id=str(charger_id),
            action="charger.update",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            before=before,
            after=after,
        )
        await session.commit()
        return after

    async def delete_charger(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        before_row = await self._get_charger_row(session, charger_id)
        if before_row.get("deleted_at"):
            raise ChargerManagementError(409, "Charger is already deleted.")

        active_assignments = (
            await session.execute(
                text(
                    """
                    SELECT id
                    FROM charger_assignments
                    WHERE charger_id = :charger_id
                      AND status IN ('planned', 'active')
                    LIMIT 1
                    """
                ),
                {"charger_id": charger_id},
            )
        ).first()
        if active_assignments:
            raise ChargerManagementError(
                409,
                "Cannot delete charger with active/planned assignments.",
            )

        now_iso = _as_iso(now_utc())
        await session.execute(
            text(
                """
                UPDATE charger_registry
                SET status = 'inactive',
                    deleted_at = :deleted_at,
                    updated_at = :updated_at
                WHERE id = :charger_id
                """
            ),
            {"deleted_at": now_iso, "updated_at": now_iso, "charger_id": charger_id},
        )
        after_row = await self._get_charger_row(session, charger_id)
        before = self._charger_payload(before_row)
        after = self._charger_payload(after_row)
        await insert_audit_event(
            session,
            entity_type="charger",
            entity_id=str(charger_id),
            action="charger.delete",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            before=before,
            after=after,
        )
        await session.commit()
        return after

    async def inactivate_charger(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
        payload: ChargerInactivationRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        before_row = await self._get_charger_row(session, charger_id)
        if before_row.get("deleted_at"):
            raise ChargerManagementError(409, "Cannot inactivate a deleted charger.")

        inactivated_at_iso = _as_iso(payload.inactivated_at)
        expected_return_iso = _as_iso(payload.expected_return_at)
        conflicting_assignment = (
            await session.execute(
                text(
                    """
                    SELECT id
                    FROM charger_assignments
                    WHERE charger_id = :charger_id
                      AND status IN ('planned', 'active')
                      AND planned_end_at > :inactivated_at
                    LIMIT 1
                    """
                ),
                {"charger_id": charger_id, "inactivated_at": inactivated_at_iso},
            )
        ).first()
        if conflicting_assignment:
            raise ChargerManagementError(
                409,
                "Cannot inactivate charger with active/planned future assignments.",
            )

        now_iso = _as_iso(now_utc())
        await session.execute(
            text(
                """
                UPDATE charger_registry
                SET status = 'inactive',
                    updated_at = :updated_at
                WHERE id = :charger_id
                """
            ),
            {"charger_id": charger_id, "updated_at": now_iso},
        )
        result = await session.execute(
            text(
                """
                INSERT INTO charger_inactivation_history (
                    charger_id,
                    reason_code,
                    reason_text,
                    inactivated_at,
                    expected_return_at,
                    created_by,
                    created_at
                ) VALUES (
                    :charger_id,
                    :reason_code,
                    :reason_text,
                    :inactivated_at,
                    :expected_return_at,
                    :created_by,
                    :created_at
                )
                """
            ),
            {
                "charger_id": charger_id,
                "reason_code": payload.reason_code,
                "reason_text": (payload.reason_text or "").strip() or None,
                "inactivated_at": inactivated_at_iso,
                "expected_return_at": expected_return_iso,
                "created_by": actor.user_id,
                "created_at": now_iso,
            },
        )
        history_id = int(result.lastrowid or 0)
        after_row = await self._get_charger_row(session, charger_id)
        await insert_audit_event(
            session,
            entity_type="charger",
            entity_id=str(charger_id),
            action="charger.inactivate",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            before=self._charger_payload(before_row),
            after=self._charger_payload(after_row),
            details={
                "reason_code": payload.reason_code,
                "reason_text": payload.reason_text,
                "inactivated_at": inactivated_at_iso,
                "expected_return_at": expected_return_iso,
            },
        )
        await enqueue_notification(
            session,
            event_type="charger.inactivated",
            ticket_id=None,
            payload={
                "charger_id": charger_id,
                "reason_code": payload.reason_code,
                "expected_return_at": expected_return_iso,
            },
        )
        await session.commit()
        return {
            "id": history_id,
            "charger_id": charger_id,
            "reason_code": payload.reason_code,
            "reason_text": (payload.reason_text or "").strip() or None,
            "inactivated_at": payload.inactivated_at,
            "expected_return_at": payload.expected_return_at,
            "created_by": actor.user_id,
            "created_at": _normalize_datetime(now_iso, fallback_now=True),
        }

    async def reactivate_charger(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        before_row = await self._get_charger_row(session, charger_id)
        if before_row.get("deleted_at"):
            raise ChargerManagementError(409, "Cannot reactivate a deleted charger.")
        now_iso = _as_iso(now_utc())
        await session.execute(
            text(
                """
                UPDATE charger_registry
                SET status = 'active',
                    updated_at = :updated_at
                WHERE id = :charger_id
                """
            ),
            {"charger_id": charger_id, "updated_at": now_iso},
        )
        after_row = await self._get_charger_row(session, charger_id)
        await insert_audit_event(
            session,
            entity_type="charger",
            entity_id=str(charger_id),
            action="charger.reactivate",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            before=self._charger_payload(before_row),
            after=self._charger_payload(after_row),
        )
        await enqueue_notification(
            session,
            event_type="charger.reactivated",
            ticket_id=None,
            payload={"charger_id": charger_id},
        )
        await session.commit()
        return self._charger_payload(after_row)

    async def create_time_rule(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
        payload: TimeRuleCreateRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, MANAGER_ROLES)
        await self._get_charger_row(session, charger_id)
        effective_from = _as_iso(payload.effective_from)
        effective_to = _as_iso(payload.effective_to)
        overlap_row = (
            await session.execute(
                text(
                    """
                    SELECT id
                    FROM charger_time_rules
                    WHERE charger_id = :charger_id
                      AND effective_from < COALESCE(:effective_to, '9999-12-31T23:59:59+00:00')
                      AND COALESCE(effective_to, '9999-12-31T23:59:59+00:00') > :effective_from
                    LIMIT 1
                    """
                ),
                {
                    "charger_id": charger_id,
                    "effective_from": effective_from,
                    "effective_to": effective_to,
                },
            )
        ).first()
        if overlap_row:
            raise ChargerManagementError(409, "Time rule overlaps with an existing rule.")

        now_iso = _as_iso(now_utc())
        result = await session.execute(
            text(
                """
                INSERT INTO charger_time_rules (
                    charger_id,
                    business_start,
                    business_end,
                    idle_threshold_minutes,
                    effective_from,
                    effective_to,
                    created_at,
                    updated_at
                ) VALUES (
                    :charger_id,
                    :business_start,
                    :business_end,
                    :idle_threshold_minutes,
                    :effective_from,
                    :effective_to,
                    :created_at,
                    :updated_at
                )
                """
            ),
            {
                "charger_id": charger_id,
                "business_start": payload.business_start,
                "business_end": payload.business_end,
                "idle_threshold_minutes": payload.idle_threshold_minutes,
                "effective_from": effective_from,
                "effective_to": effective_to,
                "created_at": now_iso,
                "updated_at": now_iso,
            },
        )
        rule_id = int(result.lastrowid or 0)
        row = (
            await session.execute(
                text(
                    """
                    SELECT id, charger_id, business_start, business_end, idle_threshold_minutes,
                           effective_from, effective_to, created_at, updated_at
                    FROM charger_time_rules
                    WHERE id = :rule_id
                    LIMIT 1
                    """
                ),
                {"rule_id": rule_id},
            )
        ).mappings().first()
        if row is None:
            raise ChargerManagementError(500, "Unable to read inserted time rule.")
        payload_row = {
            "id": int(row["id"]),
            "charger_id": int(row["charger_id"]),
            "business_start": str(row["business_start"]),
            "business_end": str(row["business_end"]),
            "idle_threshold_minutes": int(row["idle_threshold_minutes"]),
            "effective_from": _normalize_datetime(row["effective_from"], fallback_now=True),
            "effective_to": _as_datetime(row["effective_to"]),
            "created_at": _normalize_datetime(row["created_at"], fallback_now=True),
            "updated_at": _normalize_datetime(row["updated_at"], fallback_now=True),
        }
        await insert_audit_event(
            session,
            entity_type="time_rule",
            entity_id=str(rule_id),
            action="time_rule.create",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            after=payload_row,
        )
        await session.commit()
        return payload_row

    async def list_time_rules(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        charger_id: int,
    ) -> list[dict[str, Any]]:
        self._ensure_roles(actor, MANAGER_ROLES)
        await self._get_charger_row(session, charger_id)
        rows = (
            await session.execute(
                text(
                    """
                    SELECT id, charger_id, business_start, business_end, idle_threshold_minutes,
                           effective_from, effective_to, created_at, updated_at
                    FROM charger_time_rules
                    WHERE charger_id = :charger_id
                    ORDER BY effective_from DESC
                    """
                ),
                {"charger_id": charger_id},
            )
        ).mappings().all()
        return [
            {
                "id": int(row["id"]),
                "charger_id": int(row["charger_id"]),
                "business_start": str(row["business_start"]),
                "business_end": str(row["business_end"]),
                "idle_threshold_minutes": int(row["idle_threshold_minutes"]),
                "effective_from": _normalize_datetime(row["effective_from"], fallback_now=True),
                "effective_to": _as_datetime(row["effective_to"]),
                "created_at": _normalize_datetime(row["created_at"], fallback_now=True),
                "updated_at": _normalize_datetime(row["updated_at"], fallback_now=True),
            }
            for row in rows
        ]

    async def _find_assignment_conflict(
        self,
        session: AsyncSession,
        *,
        charger_id: int,
        start_at: datetime,
        end_at: datetime,
        exclude_assignment_id: int | None = None,
    ) -> dict[str, Any] | None:
        params = {
            "charger_id": charger_id,
            "start_at": _as_iso(start_at),
            "end_at": _as_iso(end_at),
        }
        exclude_sql = ""
        if exclude_assignment_id:
            exclude_sql = "AND id <> :exclude_assignment_id"
            params["exclude_assignment_id"] = exclude_assignment_id

        row = (
            await session.execute(
                text(
                    f"""
                    SELECT id, ticket_id, planned_start_at, planned_end_at, status
                    FROM charger_assignments
                    WHERE charger_id = :charger_id
                      AND status IN ('planned', 'active')
                      {exclude_sql}
                      AND planned_start_at < :end_at
                      AND planned_end_at > :start_at
                    LIMIT 1
                    """
                ),
                params,
            )
        ).mappings().first()
        return dict(row) if row else None

    async def create_assignment(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        payload: AssignmentCreateRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, OPERATION_ROLES)
        charger_row = await self._get_charger_row(session, payload.charger_id)
        if charger_row.get("deleted_at"):
            raise ChargerManagementError(409, "Cannot assign a deleted charger.")
        if str(charger_row.get("status")) != "active":
            raise ChargerManagementError(409, "Only active chargers can receive new assignments.")

        conflict = await self._find_assignment_conflict(
            session,
            charger_id=payload.charger_id,
            start_at=payload.planned_start_at,
            end_at=payload.planned_end_at,
        )
        if conflict:
            raise ChargerManagementError(
                409,
                f"Schedule conflict with assignment {conflict['id']} (ticket {conflict['ticket_id']}).",
            )

        now_iso = _as_iso(now_utc())
        result = await session.execute(
            text(
                """
                INSERT INTO charger_assignments (
                    ticket_id,
                    charger_id,
                    status,
                    planned_start_at,
                    planned_end_at,
                    actual_start_at,
                    actual_end_at,
                    created_by,
                    created_at,
                    updated_at
                ) VALUES (
                    :ticket_id,
                    :charger_id,
                    'planned',
                    :planned_start_at,
                    :planned_end_at,
                    NULL,
                    NULL,
                    :created_by,
                    :created_at,
                    :updated_at
                )
                """
            ),
            {
                "ticket_id": payload.ticket_id,
                "charger_id": payload.charger_id,
                "planned_start_at": _as_iso(payload.planned_start_at),
                "planned_end_at": _as_iso(payload.planned_end_at),
                "created_by": actor.user_id,
                "created_at": now_iso,
                "updated_at": now_iso,
            },
        )
        assignment_id = int(result.lastrowid or 0)
        assignment = await self.get_assignment(session, assignment_id=assignment_id)
        await insert_audit_event(
            session,
            entity_type="assignment",
            entity_id=str(assignment_id),
            action="assignment.create",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            after=assignment,
        )
        await enqueue_notification(
            session,
            event_type="assignment.created",
            ticket_id=payload.ticket_id,
            payload={
                "assignment_id": assignment_id,
                "ticket_id": payload.ticket_id,
                "charger_id": payload.charger_id,
            },
        )
        await session.commit()
        return assignment

    async def get_assignment(self, session: AsyncSession, *, assignment_id: int) -> dict[str, Any]:
        row = (
            await session.execute(
                text(
                    """
                    SELECT id, ticket_id, charger_id, status,
                           planned_start_at, planned_end_at,
                           actual_start_at, actual_end_at,
                           created_by, created_at, updated_at
                    FROM charger_assignments
                    WHERE id = :assignment_id
                    LIMIT 1
                    """
                ),
                {"assignment_id": assignment_id},
            )
        ).mappings().first()
        if row is None:
            raise ChargerManagementError(404, f"Assignment '{assignment_id}' not found.")
        return {
            "id": int(row["id"]),
            "ticket_id": int(row["ticket_id"]),
            "charger_id": int(row["charger_id"]),
            "status": str(row["status"]),
            "planned_start_at": _normalize_datetime(row["planned_start_at"], fallback_now=True),
            "planned_end_at": _normalize_datetime(row["planned_end_at"], fallback_now=True),
            "actual_start_at": _as_datetime(row["actual_start_at"]),
            "actual_end_at": _as_datetime(row["actual_end_at"]),
            "created_by": str(row["created_by"]),
            "created_at": _normalize_datetime(row["created_at"], fallback_now=True),
            "updated_at": _normalize_datetime(row["updated_at"], fallback_now=True),
        }

    async def _change_assignment_status(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        assignment_id: int,
        new_status: str,
        reason: str | None,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, OPERATION_ROLES)
        before = await self.get_assignment(session, assignment_id=assignment_id)
        if before["status"] in {"completed", "canceled"}:
            raise ChargerManagementError(409, "Assignment is already finalized.")

        now_dt = now_in_app_timezone()
        now_iso = _as_iso(now_dt)
        actual_start = before["actual_start_at"]
        actual_end = before["actual_end_at"]

        if new_status == "active":
            conflict = await self._find_assignment_conflict(
                session,
                charger_id=before["charger_id"],
                start_at=now_dt,
                end_at=before["planned_end_at"],
                exclude_assignment_id=assignment_id,
            )
            if conflict:
                raise ChargerManagementError(
                    409,
                    f"Cannot start assignment due to conflict with assignment {conflict['id']}.",
                )
            if actual_start is None:
                actual_start = now_dt
        elif new_status in {"completed", "canceled"}:
            actual_end = now_dt
            if actual_start is None:
                actual_start = before["planned_start_at"]

        await session.execute(
            text(
                """
                UPDATE charger_assignments
                SET status = :status,
                    actual_start_at = :actual_start_at,
                    actual_end_at = :actual_end_at,
                    updated_at = :updated_at
                WHERE id = :assignment_id
                """
            ),
            {
                "status": new_status,
                "actual_start_at": _as_iso(actual_start),
                "actual_end_at": _as_iso(actual_end),
                "updated_at": now_iso,
                "assignment_id": assignment_id,
            },
        )
        after = await self.get_assignment(session, assignment_id=assignment_id)
        await insert_audit_event(
            session,
            entity_type="assignment",
            entity_id=str(assignment_id),
            action=f"assignment.{new_status}",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            before=before,
            after=after,
            details={"reason": reason} if reason else None,
        )
        await enqueue_notification(
            session,
            event_type=f"assignment.{new_status}",
            ticket_id=after["ticket_id"],
            payload={
                "assignment_id": assignment_id,
                "ticket_id": after["ticket_id"],
                "charger_id": after["charger_id"],
                "reason": reason,
            },
        )
        await session.commit()
        return after

    async def start_assignment(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        assignment_id: int,
        payload: AssignmentStatusActionRequest,
    ) -> dict[str, Any]:
        return await self._change_assignment_status(
            session,
            actor=actor,
            assignment_id=assignment_id,
            new_status="active",
            reason=payload.reason,
        )

    async def finish_assignment(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        assignment_id: int,
        payload: AssignmentStatusActionRequest,
    ) -> dict[str, Any]:
        return await self._change_assignment_status(
            session,
            actor=actor,
            assignment_id=assignment_id,
            new_status="completed",
            reason=payload.reason,
        )

    async def cancel_assignment(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        assignment_id: int,
        payload: AssignmentStatusActionRequest,
    ) -> dict[str, Any]:
        return await self._change_assignment_status(
            session,
            actor=actor,
            assignment_id=assignment_id,
            new_status="canceled",
            reason=payload.reason,
        )

    async def list_assignments_for_period(
        self,
        session: AsyncSession,
        *,
        charger_id: int,
        start_at: datetime,
        end_at: datetime,
        assignment_status: str | None = None,
    ) -> list[dict[str, Any]]:
        predicates = [
            "charger_id = :charger_id",
            "planned_start_at < :end_at",
            "planned_end_at > :start_at",
        ]
        params: dict[str, Any] = {
            "charger_id": charger_id,
            "start_at": _as_iso(start_at),
            "end_at": _as_iso(end_at),
        }
        if assignment_status:
            predicates.append("status = :status")
            params["status"] = assignment_status

        rows = (
            await session.execute(
                text(
                    f"""
                    SELECT id
                    FROM charger_assignments
                    WHERE {' AND '.join(predicates)}
                    ORDER BY planned_start_at ASC
                    """
                ),
                params,
            )
        ).mappings().all()
        return [await self.get_assignment(session, assignment_id=int(row["id"])) for row in rows]

    async def _resolve_schedule_rule(
        self,
        session: AsyncSession,
        *,
        charger_id: int,
        at_moment: datetime,
    ) -> tuple[str, str]:
        row = (
            await session.execute(
                text(
                    """
                    SELECT business_start, business_end
                    FROM charger_time_rules
                    WHERE charger_id = :charger_id
                      AND effective_from <= :at_moment
                      AND COALESCE(effective_to, '9999-12-31T23:59:59+00:00') > :at_moment
                    ORDER BY effective_from DESC
                    LIMIT 1
                    """
                ),
                {"charger_id": charger_id, "at_moment": _as_iso(at_moment)},
            )
        ).mappings().first()
        if row is None:
            return DEFAULT_BUSINESS_START, DEFAULT_BUSINESS_END
        return str(row["business_start"]), str(row["business_end"])

    async def calculate_time_metrics(
        self,
        session: AsyncSession,
        *,
        charger_id: int,
        start_at: datetime,
        end_at: datetime,
        assignment_status: str | None = None,
    ) -> dict[str, int]:
        period = Interval(start=start_at, end=end_at)
        if not period.is_valid():
            raise ChargerManagementError(400, "Invalid report period.")

        assignments = await self.list_assignments_for_period(
            session,
            charger_id=charger_id,
            start_at=start_at,
            end_at=end_at,
            assignment_status=assignment_status,
        )

        planned_minutes = 0
        acting_minutes = 0
        for assignment in assignments:
            planned_interval = Interval(
                start=_normalize_datetime(assignment["planned_start_at"]),
                end=_normalize_datetime(assignment["planned_end_at"]),
            )
            planned_minutes += _minutes_overlap(period, planned_interval)

            if assignment["status"] in {"active", "completed"}:
                actual_start = _normalize_datetime(
                    assignment["actual_start_at"] or assignment["planned_start_at"]
                )
                actual_end = _normalize_datetime(
                    assignment["actual_end_at"] or now_in_app_timezone()
                )
                actual_interval = Interval(start=actual_start, end=actual_end)
                if actual_interval.is_valid():
                    acting_minutes += _minutes_overlap(period, actual_interval)

        scheduled_minutes = 0
        cursor = start_at.replace(hour=0, minute=0, second=0, microsecond=0)
        while cursor < end_at:
            day_start = cursor
            day_end = cursor + timedelta(days=1)
            business_start, business_end = await self._resolve_schedule_rule(
                session, charger_id=charger_id, at_moment=day_start
            )
            bsh, bsm = _parse_hhmm(business_start)
            beh, bem = _parse_hhmm(business_end)
            work_start = day_start.replace(hour=bsh, minute=bsm, second=0, microsecond=0)
            work_end = day_start.replace(hour=beh, minute=bem, second=0, microsecond=0)
            if work_end <= work_start:
                work_end = work_end + timedelta(days=1)
            scheduled_interval = Interval(start=work_start, end=work_end)
            scheduled_minutes += _minutes_overlap(period, scheduled_interval)
            cursor = day_end

        idle_minutes = max(scheduled_minutes - acting_minutes, 0)
        return {
            "planned_minutes": planned_minutes,
            "acting_minutes": acting_minutes,
            "idle_minutes": idle_minutes,
        }

    async def build_report(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        start_at: datetime,
        end_at: datetime,
        charger_id: int | None = None,
        assignment_status: str | None = None,
    ) -> list[dict[str, Any]]:
        self._ensure_roles(actor, MANAGER_ROLES)
        if end_at <= start_at:
            raise ChargerManagementError(400, "end_at must be greater than start_at.")

        predicates = ["deleted_at IS NULL"]
        params: dict[str, Any] = {}
        if charger_id is not None:
            predicates.append("id = :charger_id")
            params["charger_id"] = charger_id

        chargers = (
            await session.execute(
                text(
                    f"""
                    SELECT id, name, status
                    FROM charger_registry
                    WHERE {' AND '.join(predicates)}
                    ORDER BY name ASC
                    """
                ),
                params,
            )
        ).mappings().all()

        rows: list[dict[str, Any]] = []
        for charger in chargers:
            cid = int(charger["id"])
            metrics = await self.calculate_time_metrics(
                session,
                charger_id=cid,
                start_at=start_at,
                end_at=end_at,
                assignment_status=assignment_status,
            )
            ticket_count = (
                await session.execute(
                    text(
                        """
                        SELECT COUNT(DISTINCT ticket_id)
                        FROM charger_assignments
                        WHERE charger_id = :charger_id
                          AND planned_start_at < :end_at
                          AND planned_end_at > :start_at
                          AND (:status IS NULL OR status = :status)
                        """
                    ),
                    {
                        "charger_id": cid,
                        "start_at": _as_iso(start_at),
                        "end_at": _as_iso(end_at),
                        "status": assignment_status,
                    },
                )
            ).scalar_one()
            rows.append(
                {
                    "charger_id": cid,
                    "charger_name": str(charger["name"]),
                    "charger_status": str(charger["status"]),
                    "ticket_count": int(ticket_count or 0),
                    "planned_minutes": int(metrics["planned_minutes"]),
                    "acting_minutes": int(metrics["acting_minutes"]),
                    "idle_minutes": int(metrics["idle_minutes"]),
                }
            )
        return rows

    async def solve_ticket_and_wait_user_approval(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        context: str,
        ticket_id: int,
        payload: TicketSolutionRequest,
    ) -> dict[str, Any]:
        self._ensure_roles(actor, OPERATION_ROLES)
        try:
            actor_user_id_int = int(actor.user_id)
        except ValueError as error:
            raise ChargerManagementError(400, "X-GLPI-User-Id must be numeric.") from error
        try:
            client = await session_manager.get_client(context)
            await client.create_item(
                "ITILSolution",
                {
                    "itemtype": "Ticket",
                    "items_id": ticket_id,
                    "content": payload.solution_content.strip(),
                    "users_id": actor_user_id_int,
                },
            )
            await client.update_item("Ticket", ticket_id, {"status": 5})
        except Exception as error:
            logger.warning("ticket.solution failed ticket_id=%s error=%s", ticket_id, error)
            raise ChargerManagementError(
                502,
                "Failed to sync solution with GLPI.",
            ) from error

        await insert_audit_event(
            session,
            entity_type="ticket",
            entity_id=str(ticket_id),
            action="ticket.solution_submitted",
            actor_user_id=actor.user_id,
            actor_role=actor.role,
            request_id=actor.request_id,
            after={"ticket_status": 5},
            details={"message": "Solution submitted and ticket moved to solved (awaiting user approval)."},
        )
        await enqueue_notification(
            session,
            event_type="ticket.awaiting_user_approval",
            ticket_id=ticket_id,
            payload={
                "ticket_id": ticket_id,
                "status": 5,
                "message": "Ticket solved and waiting user approval.",
            },
        )
        await session.commit()
        return {
            "ticket_id": ticket_id,
            "ticket_status": 5,
            "message": "Solution added. Ticket moved to solved and waiting user approval.",
        }

    async def read_notifications(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        only_pending: bool,
        limit: int,
    ) -> list[dict[str, Any]]:
        self._ensure_roles(actor, MANAGER_ROLES)
        return await list_notifications(session, only_pending=only_pending, limit=limit)

    async def read_audit(
        self,
        session: AsyncSession,
        *,
        actor: ActorIdentity,
        entity_type: str | None,
        entity_id: str | None,
        limit: int,
    ) -> list[dict[str, Any]]:
        self._ensure_roles(actor, MANAGER_ROLES)
        return await list_audit_events(
            session,
            entity_type=entity_type,
            entity_id=entity_id,
            limit=limit,
        )


service = ChargerManagementService()
