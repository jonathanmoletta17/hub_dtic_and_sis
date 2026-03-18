from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.datetime_contract import APP_TIMEZONE, ensure_aware_datetime, now_in_app_timezone

STATUS_MAP = {
    1: "Novo",
    2: "Em Atendimento",
    3: "Planejado",
    4: "Pendente",
    5: "Solucionado",
    6: "Fechado",
}

# Alias intencional para SIS: memoria usa o mesmo escopo de conservacao.
DEPARTMENT_GROUP_MAP = {
    "manutencao": 22,
    "conservacao": 21,
    "memoria": 21,
}


@dataclass(frozen=True)
class AnalyticsScope:
    context: str
    date_from: datetime
    date_to: datetime
    department: str | None
    group_ids: list[int]


def _parse_date(value: str, field_name: str) -> datetime:
    try:
        return datetime.strptime(value, "%Y-%m-%d").replace(tzinfo=APP_TIMEZONE)
    except ValueError as exc:
        raise ValueError(f"{field_name} deve estar no formato YYYY-MM-DD.") from exc


def _normalize_group_ids(group_ids: Iterable[int] | None) -> list[int]:
    if not group_ids:
        return []

    normalized = []
    seen = set()
    for group_id in group_ids:
        if group_id <= 0:
            raise ValueError("group_ids deve conter apenas inteiros positivos.")
        if group_id in seen:
            continue
        seen.add(group_id)
        normalized.append(group_id)
    return normalized


def resolve_scope(
    context: str,
    date_from: str | None,
    date_to: str | None,
    department: str | None,
    group_ids: list[int] | None,
) -> AnalyticsScope:
    now = datetime.now(tz=APP_TIMEZONE)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)

    if not date_from and not date_to:
        start = today_start - timedelta(days=29)
        end = today_start
    elif date_from and date_to:
        start = _parse_date(date_from, "date_from")
        end = _parse_date(date_to, "date_to")
    elif date_from:
        start = _parse_date(date_from, "date_from")
        end = today_start
    else:
        end = _parse_date(date_to or "", "date_to")
        start = end - timedelta(days=29)

    if start > end:
        raise ValueError("date_from nao pode ser maior que date_to.")

    normalized_context = context.strip().lower()
    normalized_department = (department or "").strip().lower() or None

    effective_group_ids = _normalize_group_ids(group_ids)
    if not effective_group_ids and normalized_context.startswith("sis") and normalized_department:
        dept_group = DEPARTMENT_GROUP_MAP.get(normalized_department)
        if dept_group:
            effective_group_ids = [dept_group]

    if normalized_context.startswith("dtic"):
        normalized_department = None

    return AnalyticsScope(
        context=normalized_context,
        date_from=start,
        date_to=end,
        department=normalized_department,
        group_ids=effective_group_ids,
    )


def _group_scope_sql(group_ids: list[int]) -> tuple[str, str, dict[str, int]]:
    if not group_ids:
        return "", "", {}

    join_sql = "JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2"
    placeholders = ", ".join(f":group_id_{idx}" for idx in range(len(group_ids)))
    where_sql = f"AND gt.groups_id IN ({placeholders})"
    params = {f"group_id_{idx}": group_id for idx, group_id in enumerate(group_ids)}
    return join_sql, where_sql, params


async def get_summary(db: AsyncSession, scope: AnalyticsScope) -> dict:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        **group_params,
    }

    query = text(
        f"""
        SELECT
            COUNT(CASE WHEN DATE(t.date) BETWEEN :date_from AND :date_to AND t.status = 1 THEN 1 END) AS novos,
            COUNT(CASE WHEN DATE(t.date) BETWEEN :date_from AND :date_to AND t.status IN (2, 3) THEN 1 END) AS em_atendimento,
            COUNT(CASE WHEN DATE(t.date) BETWEEN :date_from AND :date_to AND t.status = 4 THEN 1 END) AS pendentes,
            COUNT(
                CASE
                    WHEN t.status = 5
                        AND t.solvedate IS NOT NULL
                        AND DATE(t.solvedate) BETWEEN :date_from AND :date_to
                    THEN 1
                    WHEN t.status = 6
                        AND t.closedate IS NOT NULL
                        AND DATE(t.closedate) BETWEEN :date_from AND :date_to
                    THEN 1
                END
            ) AS resolvidos_periodo,
            COUNT(CASE WHEN t.status IN (1, 2, 3, 4) THEN 1 END) AS backlog_aberto,
            COUNT(CASE WHEN DATE(t.date) BETWEEN :date_from AND :date_to THEN 1 END) AS total_periodo
        FROM glpi_tickets t
        {join_sql}
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          {where_sql}
        """
    )

    result = await db.execute(query, params)
    row = result.fetchone()
    if not row:
        return {
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos_periodo": 0,
            "backlog_aberto": 0,
            "total_periodo": 0,
        }

    return {
        "novos": int(row[0] or 0),
        "em_atendimento": int(row[1] or 0),
        "pendentes": int(row[2] or 0),
        "resolvidos_periodo": int(row[3] or 0),
        "backlog_aberto": int(row[4] or 0),
        "total_periodo": int(row[5] or 0),
    }


async def get_trends(db: AsyncSession, scope: AnalyticsScope) -> list[dict]:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        **group_params,
    }

    series: dict[str, dict[str, int | str]] = {}
    total_days = (scope.date_to.date() - scope.date_from.date()).days + 1
    for offset in range(total_days):
        day = (scope.date_from + timedelta(days=offset)).date().isoformat()
        series[day] = {
            "date": day,
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos": 0,
            "total_criados": 0,
        }

    created_query = text(
        f"""
        SELECT
            DATE(t.date) AS ref_date,
            COUNT(*) AS total_criados,
            SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS novos,
            SUM(CASE WHEN t.status IN (2, 3) THEN 1 ELSE 0 END) AS em_atendimento,
            SUM(CASE WHEN t.status = 4 THEN 1 ELSE 0 END) AS pendentes
        FROM glpi_tickets t
        {join_sql}
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND DATE(t.date) BETWEEN :date_from AND :date_to
          {where_sql}
        GROUP BY DATE(t.date)
        ORDER BY ref_date ASC
        """
    )
    created_result = await db.execute(created_query, params)
    for row in created_result.fetchall():
        date_key = str(row[0])
        target = series.get(date_key)
        if not target:
            continue
        target["total_criados"] = int(row[1] or 0)
        target["novos"] = int(row[2] or 0)
        target["em_atendimento"] = int(row[3] or 0)
        target["pendentes"] = int(row[4] or 0)

    resolved_query = text(
        f"""
        SELECT
            DATE(t.solvedate) AS ref_date,
            COUNT(DISTINCT t.id) AS resolvidos
        FROM glpi_tickets t
        {join_sql}
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (5, 6)
          AND t.solvedate IS NOT NULL
          AND DATE(t.solvedate) BETWEEN :date_from AND :date_to
          {where_sql}
        GROUP BY DATE(t.solvedate)
        ORDER BY ref_date ASC
        """
    )
    resolved_result = await db.execute(resolved_query, params)
    for row in resolved_result.fetchall():
        date_key = str(row[0])
        target = series.get(date_key)
        if not target:
            continue
        target["resolvidos"] = int(row[1] or 0)

    return [series[key] for key in sorted(series.keys())]


async def get_ranking(db: AsyncSession, scope: AnalyticsScope, limit: int | None) -> list[dict]:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        **group_params,
    }
    limit_sql = ""
    if limit is not None:
        params["lim"] = limit
        limit_sql = "LIMIT :lim"

    query = text(
        f"""
        SELECT
            u.id AS technician_id,
            COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, ''))), ''),
                NULLIF(u.name, ''),
                CONCAT('Usuario #', u.id)
            ) AS technician_name,
            COUNT(DISTINCT t.id) AS resolved_count
        FROM glpi_tickets t
        JOIN glpi_tickets_users tu ON tu.tickets_id = t.id AND tu.type = 2
        JOIN glpi_users u ON u.id = tu.users_id
        {join_sql}
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND u.is_deleted = 0
          AND u.is_active = 1
          AND t.status IN (5, 6)
          AND t.solvedate IS NOT NULL
          AND DATE(t.solvedate) BETWEEN :date_from AND :date_to
          {where_sql}
        GROUP BY u.id, technician_name
        ORDER BY resolved_count DESC, technician_name ASC
        {limit_sql}
        """
    )

    result = await db.execute(query, params)
    return [
        {
            "technician_id": int(row[0]),
            "technician_name": str(row[1] or "Usuario"),
            "resolved_count": int(row[2] or 0),
        }
        for row in result.fetchall()
    ]


def _resolve_recent_action(status_id: int) -> str:
    if status_id in (5, 6):
        return "ticket_resolvido"
    if status_id == 4:
        return "ticket_pendente"
    if status_id in (2, 3):
        return "ticket_em_atendimento"
    return "ticket_criado"


async def get_recent_activity(db: AsyncSession, scope: AnalyticsScope, limit: int) -> list[dict]:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        "lim": limit,
        **group_params,
    }

    query = text(
        f"""
        SELECT
            t.id AS ticket_id,
            COALESCE(NULLIF(t.name, ''), 'Sem titulo') AS title,
            t.status AS status_id,
            COALESCE(cat.completename, 'Sem categoria') AS category,
            COALESCE(req.full_name, 'N/A') AS requester,
            COALESCE(tech.full_name, 'N/A') AS technician,
            t.date AS created_at,
            t.date_mod AS modified_at,
            t.solvedate AS solved_at
        FROM glpi_tickets t
        {join_sql}
        LEFT JOIN (
            SELECT tu.tickets_id, MIN(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, ''))) AS full_name
            FROM glpi_tickets_users tu
            JOIN glpi_users u ON u.id = tu.users_id
            WHERE tu.type = 1
            GROUP BY tu.tickets_id
        ) req ON req.tickets_id = t.id
        LEFT JOIN (
            SELECT tu.tickets_id, MIN(CONCAT_WS(' ', NULLIF(u.firstname, ''), NULLIF(u.realname, ''))) AS full_name
            FROM glpi_tickets_users tu
            JOIN glpi_users u ON u.id = tu.users_id
            WHERE tu.type = 2
            GROUP BY tu.tickets_id
        ) tech ON tech.tickets_id = t.id
        LEFT JOIN glpi_itilcategories cat ON cat.id = t.itilcategories_id
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND (
            DATE(t.date) BETWEEN :date_from AND :date_to
            OR DATE(t.date_mod) BETWEEN :date_from AND :date_to
            OR (t.solvedate IS NOT NULL AND DATE(t.solvedate) BETWEEN :date_from AND :date_to)
          )
          {where_sql}
        ORDER BY COALESCE(t.date_mod, t.solvedate, t.date) DESC
        LIMIT :lim
        """
    )

    result = await db.execute(query, params)
    rows = result.fetchall()

    items = []
    for row in rows:
        status_id = int(row[2] or 0)
        occurred_at = ensure_aware_datetime(row[7] or row[8] or row[6]) or now_in_app_timezone()
        items.append(
            {
                "ticket_id": int(row[0]),
                "title": str(row[1] or "Sem titulo"),
                "status_id": status_id,
                "status": STATUS_MAP.get(status_id, f"Status {status_id}"),
                "category": str(row[3] or "Sem categoria"),
                "requester": str(row[4] or "N/A"),
                "technician": str(row[5] or "N/A"),
                "action": _resolve_recent_action(status_id),
                "occurred_at": occurred_at,
            }
        )

    return items


async def get_distribution_entity(db: AsyncSession, scope: AnalyticsScope, limit: int) -> list[dict]:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        "lim": limit,
        **group_params,
    }

    query = text(
        f"""
        SELECT
            COALESCE(
                NULLIF(e.completename, ''),
                NULLIF(e.name, ''),
                'Sem entidade'
            ) AS name,
            COUNT(DISTINCT t.id) AS value
        FROM glpi_tickets t
        {join_sql}
        LEFT JOIN glpi_entities e ON e.id = t.entities_id
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (1, 2, 3, 4)
          AND DATE(t.date) BETWEEN :date_from AND :date_to
          {where_sql}
        GROUP BY name
        ORDER BY value DESC, name ASC
        LIMIT :lim
        """
    )

    result = await db.execute(query, params)
    return [
        {
            "name": str(row[0] or "Sem entidade"),
            "value": int(row[1] or 0),
        }
        for row in result.fetchall()
    ]


async def get_distribution_category(db: AsyncSession, scope: AnalyticsScope, limit: int) -> list[dict]:
    join_sql, where_sql, group_params = _group_scope_sql(scope.group_ids)
    params: dict[str, object] = {
        "date_from": scope.date_from.date().isoformat(),
        "date_to": scope.date_to.date().isoformat(),
        "lim": limit,
        **group_params,
    }

    query = text(
        f"""
        SELECT
            COALESCE(
                NULLIF(cat.completename, ''),
                NULLIF(cat.name, ''),
                'Sem categoria'
            ) AS name,
            COUNT(DISTINCT t.id) AS value
        FROM glpi_tickets t
        {join_sql}
        LEFT JOIN glpi_itilcategories cat ON cat.id = t.itilcategories_id
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (1, 2, 3, 4)
          AND DATE(t.date) BETWEEN :date_from AND :date_to
          {where_sql}
        GROUP BY name
        ORDER BY value DESC, name ASC
        LIMIT :lim
        """
    )

    result = await db.execute(query, params)
    return [
        {
            "name": str(row[0] or "Sem categoria"),
            "value": int(row[1] or 0),
        }
        for row in result.fetchall()
    ]
