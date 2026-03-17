from __future__ import annotations

import asyncio
import csv
import json
from dataclasses import asdict, dataclass
from datetime import datetime, time, timedelta
from pathlib import Path
from typing import Any

from sqlalchemy import text

from app.core.database import _session_makers, close_all_db_connections
from app.core.datetime_contract import APP_TIMEZONE
from app.services import analytics_service


DEPARTMENTS = ("manutencao", "conservacao")
TODAY = datetime.now(tz=APP_TIMEZONE).date()
WINDOW_START = TODAY - timedelta(days=30)
WINDOW_END = TODAY - timedelta(days=1)


@dataclass
class MatrixRow:
    department: str
    endpoint: str
    metric: str
    filter: str
    legacy_value: str
    target_value: str
    delta: str
    status: str
    expected_divergence: str
    acceptance_status: str
    root_cause: str


def _legacy_dept_clause(department: str) -> tuple[str, dict[str, Any]]:
    if department == "manutencao":
        return (
            """
            AND (
                t.id IN (SELECT tickets_id FROM glpi_groups_tickets WHERE groups_id = :dept_group)
                OR t.id IN (
                    SELECT t2.id
                    FROM glpi_tickets t2
                    JOIN glpi_itilcategories c ON t2.itilcategories_id = c.id
                    WHERE c.completename LIKE :prefix_1 OR c.completename LIKE :prefix_2
                )
            )
            """,
            {
                "dept_group": 22,
                "prefix_1": "Manutenção%",
                "prefix_2": "CC-Manutenção%",
            },
        )
    if department == "conservacao":
        return (
            """
            AND (
                t.id IN (SELECT tickets_id FROM glpi_groups_tickets WHERE groups_id = :dept_group)
                OR t.id IN (
                    SELECT t2.id
                    FROM glpi_tickets t2
                    JOIN glpi_itilcategories c ON t2.itilcategories_id = c.id
                    WHERE c.completename LIKE :prefix_1 OR c.completename LIKE :prefix_2
                )
            )
            """,
            {
                "dept_group": 21,
                "prefix_1": "Conservação%",
                "prefix_2": "CC-Conservação%",
            },
        )
    return "", {}


def _fmt(value: Any) -> str:
    if isinstance(value, float):
        return f"{value:.6f}"
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, sort_keys=True)
    if value is None:
        return ""
    return str(value)


def _as_iso_day(value: Any) -> str:
    if value is None:
        return ""
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _root_cause(endpoint: str, metric: str) -> str:
    if endpoint.startswith("distribution/"):
        return "Escopo divergente: legado usa all-status + filtro híbrido (grupo OU categoria); alvo usa status abertos + group_ids."
    if endpoint == "recent-activity":
        return "Fonte/evento divergente: legado vem de glpi_logs (7 dias); alvo vem de estado de ticket no período filtrado."
    if endpoint == "summary" and metric == "resolvidos_periodo":
        return "Diferença de regra temporal: legado separa solvedate/closedate; alvo usa solvedate para status 5/6."
    return "Filtro departamental divergente: legado híbrido (grupo OU prefixo de categoria) vs alvo por group_ids."


def _is_expected_divergence(endpoint: str, metric: str) -> bool:
    if endpoint in {"recent-activity", "distribution/entity", "distribution/category"}:
        return True
    if endpoint == "summary" and metric == "backlog_aberto":
        return True
    return False


async def _legacy_summary(db, department: str, start_dt: datetime, end_dt: datetime) -> dict[str, int]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"start_dt": start_dt, "end_dt": end_dt, **dept_params}

    created_q = text(
        f"""
        SELECT
            SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS novos,
            SUM(CASE WHEN t.status = 2 THEN 1 ELSE 0 END) AS atribuidos,
            SUM(CASE WHEN t.status = 3 THEN 1 ELSE 0 END) AS planejados,
            SUM(CASE WHEN t.status = 4 THEN 1 ELSE 0 END) AS pendentes,
            COUNT(t.id) AS total
        FROM glpi_tickets t
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.date >= :start_dt
          AND t.date <= :end_dt
          {dept_clause}
        """
    )
    row_created = (await db.execute(created_q, params)).fetchone()

    solved_q = text(
        f"""
        SELECT COUNT(t.id) AS resolvidos
        FROM glpi_tickets t
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status = 5
          AND t.solvedate >= :start_dt
          AND t.solvedate <= :end_dt
          {dept_clause}
        """
    )
    row_solved = (await db.execute(solved_q, params)).fetchone()

    closed_q = text(
        f"""
        SELECT COUNT(t.id) AS fechados
        FROM glpi_tickets t
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status = 6
          AND t.closedate >= :start_dt
          AND t.closedate <= :end_dt
          {dept_clause}
        """
    )
    row_closed = (await db.execute(closed_q, params)).fetchone()

    backlog_q = text(
        f"""
        SELECT COUNT(t.id) AS total_open
        FROM glpi_tickets t
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (1, 2, 3, 4)
          {dept_clause}
        """
    )
    row_backlog = (await db.execute(backlog_q, params)).fetchone()

    novos = int((row_created[0] if row_created else 0) or 0)
    atribuidos = int((row_created[1] if row_created else 0) or 0)
    planejados = int((row_created[2] if row_created else 0) or 0)
    pendentes = int((row_created[3] if row_created else 0) or 0)
    total = int((row_created[4] if row_created else 0) or 0)
    resolvidos = int((row_solved[0] if row_solved else 0) or 0)
    fechados = int((row_closed[0] if row_closed else 0) or 0)
    total_open = int((row_backlog[0] if row_backlog else 0) or 0)

    return {
        "novos": novos,
        "em_atendimento": atribuidos + planejados,
        "pendentes": pendentes,
        "resolvidos_periodo": resolvidos + fechados,
        "backlog_aberto": total_open,
        "total_periodo": total,
    }


async def _legacy_trends(db, department: str, start_dt: datetime, end_dt: datetime) -> dict[str, dict[str, int]]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"start_dt": start_dt, "end_dt": end_dt, **dept_params}

    created_q = text(
        f"""
        SELECT
            DATE(t.date) AS day,
            COUNT(t.id) AS total_criados,
            SUM(CASE WHEN t.status = 1 THEN 1 ELSE 0 END) AS novos,
            SUM(CASE WHEN t.status IN (2, 3) THEN 1 ELSE 0 END) AS em_andamento,
            SUM(CASE WHEN t.status = 4 THEN 1 ELSE 0 END) AS pendentes
        FROM glpi_tickets t
        WHERE t.date >= :start_dt
          AND t.date <= :end_dt
          AND t.is_deleted = 0
          AND t.entities_id != 0
          {dept_clause}
        GROUP BY DATE(t.date)
        """
    )
    created_rows = (await db.execute(created_q, params)).fetchall()

    solved_q = text(
        f"""
        SELECT
            DATE(t.solvedate) AS day,
            COUNT(t.id) AS resolvidos
        FROM glpi_tickets t
        WHERE t.status IN (5, 6)
          AND t.solvedate >= :start_dt
          AND t.solvedate <= :end_dt
          AND t.is_deleted = 0
          AND t.entities_id != 0
          {dept_clause}
        GROUP BY DATE(t.solvedate)
        """
    )
    solved_rows = (await db.execute(solved_q, params)).fetchall()

    series: dict[str, dict[str, int]] = {}
    days = (WINDOW_END - WINDOW_START).days + 1
    for offset in range(days):
        day = (WINDOW_START + timedelta(days=offset)).isoformat()
        series[day] = {
            "novos": 0,
            "em_atendimento": 0,
            "pendentes": 0,
            "resolvidos": 0,
            "total_criados": 0,
        }

    for row in created_rows:
        day = _as_iso_day(row[0])
        if day in series:
            series[day] = {
                "novos": int(row[2] or 0),
                "em_atendimento": int(row[3] or 0),
                "pendentes": int(row[4] or 0),
                "resolvidos": series[day]["resolvidos"],
                "total_criados": int(row[1] or 0),
            }

    for row in solved_rows:
        day = _as_iso_day(row[0])
        if day in series:
            series[day]["resolvidos"] = int(row[1] or 0)

    return series


async def _legacy_ranking(db, department: str, start_dt: datetime, end_dt: datetime, limit: int = 10) -> list[dict]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"start_dt": start_dt, "end_dt": end_dt, "lim": limit, **dept_params}
    query = text(
        f"""
        SELECT
            u.id AS technician_id,
            COALESCE(
                NULLIF(TRIM(CONCAT_WS(' ', u.firstname, u.realname)), ''),
                u.name
            ) AS technician_name,
            COUNT(DISTINCT t.id) AS resolved_count
        FROM glpi_users u
        JOIN glpi_tickets_users tu ON tu.users_id = u.id AND tu.type = 2
        JOIN glpi_tickets t ON tu.tickets_id = t.id
        WHERE u.is_active = 1
          AND u.is_deleted = 0
          AND t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (5, 6)
          AND t.solvedate >= :start_dt
          AND t.solvedate <= :end_dt
          {dept_clause}
        GROUP BY u.id, technician_name
        ORDER BY resolved_count DESC, technician_name ASC
        LIMIT :lim
        """
    )
    rows = (await db.execute(query, params)).fetchall()
    return [
        {
            "technician_id": int(row[0]),
            "technician_name": str(row[1] or "Técnico Desconhecido"),
            "resolved_count": int(row[2] or 0),
        }
        for row in rows
    ]


async def _legacy_recent_activity(db, department: str, limit: int = 10) -> list[dict]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"seven_days_ago": datetime.now(tz=APP_TIMEZONE) - timedelta(days=7), "lim": limit, **dept_params}
    query = text(
        f"""
        SELECT
            tl.items_id,
            tl.date_mod,
            tl.user_name,
            tl.id_search_option,
            tl.old_value,
            tl.new_value,
            t.name AS ticket_title,
            t.status AS current_status
        FROM glpi_logs tl
        JOIN glpi_tickets t ON tl.items_id = t.id
        WHERE tl.itemtype = 'Ticket'
          AND tl.date_mod >= :seven_days_ago
          AND t.entities_id != 0
          {dept_clause}
        ORDER BY tl.date_mod DESC
        LIMIT :lim
        """
    )
    rows = (await db.execute(query, params)).fetchall()
    status_mapping = {
        1: "Novo",
        2: "Em Atend.",
        3: "Planejado",
        4: "Pendente",
        5: "Solucionado",
        6: "Fechado",
    }
    topic_map = {12: "Status", 5: "Técnico", 8: "Grupo", 4: "Entidade", 1: "Título", 21: "Prioridade"}
    items = []
    for row in rows:
        topic = topic_map.get(int(row[3] or 0), "Chamado")
        action = f"Alterou {topic}" if int(row[3] or 0) != 0 else "Atualizou Chamado"
        if int(row[3] or 0) == 12:
            try:
                old_s = status_mapping.get(int(row[4]), str(row[4] or ""))
                new_s = status_mapping.get(int(row[5]), str(row[5] or ""))
                action = f"Status: {old_s} -> {new_s}"
            except Exception:
                pass
        items.append(
            {
                "ticket_id": int(row[0]),
                "action": action,
                "occurred_at": _fmt(row[1]),
            }
        )
    return items


async def _legacy_distribution_entity(db, department: str, start_dt: datetime, end_dt: datetime, limit: int = 10) -> list[dict]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"start_dt": start_dt, "end_dt": end_dt, "lim": limit, **dept_params}
    query = text(
        f"""
        SELECT
            COALESCE(e.name, 'Desconhecida') AS name,
            COUNT(t.id) AS value
        FROM glpi_tickets t
        JOIN glpi_entities e ON t.entities_id = e.id
        WHERE t.is_deleted = 0
          AND t.date >= :start_dt
          AND t.date <= :end_dt
          {dept_clause}
        GROUP BY e.name
        ORDER BY value DESC, name ASC
        LIMIT :lim
        """
    )
    rows = (await db.execute(query, params)).fetchall()
    return [{"name": str(row[0]), "value": int(row[1] or 0)} for row in rows]


async def _legacy_distribution_category(db, department: str, start_dt: datetime, end_dt: datetime, limit: int = 10) -> list[dict]:
    dept_clause, dept_params = _legacy_dept_clause(department)
    params = {"start_dt": start_dt, "end_dt": end_dt, "lim": limit, **dept_params}
    query = text(
        f"""
        SELECT
            COALESCE(c.completename, 'Desconhecida') AS name,
            COUNT(t.id) AS value
        FROM glpi_tickets t
        LEFT JOIN glpi_itilcategories c ON t.itilcategories_id = c.id
        WHERE t.is_deleted = 0
          AND t.date >= :start_dt
          AND t.date <= :end_dt
          {dept_clause}
        GROUP BY c.completename
        ORDER BY value DESC, name ASC
        LIMIT :lim
        """
    )
    rows = (await db.execute(query, params)).fetchall()
    return [{"name": str(row[0]), "value": int(row[1] or 0)} for row in rows]


def _make_row(
    department: str,
    endpoint: str,
    metric: str,
    filter_label: str,
    legacy_value: Any,
    target_value: Any,
    root_cause: str = "",
) -> MatrixRow:
    is_equal = legacy_value == target_value
    expected = (not is_equal) and _is_expected_divergence(endpoint, metric)
    delta = ""
    if isinstance(legacy_value, (int, float)) and isinstance(target_value, (int, float)):
        delta = _fmt(target_value - legacy_value)
    return MatrixRow(
        department=department,
        endpoint=endpoint,
        metric=metric,
        filter=filter_label,
        legacy_value=_fmt(legacy_value),
        target_value=_fmt(target_value),
        delta=delta,
        status="PASS" if is_equal else "FAIL",
        expected_divergence="YES" if expected else "NO",
        acceptance_status="PASS" if is_equal else ("EXPECTED_DIFF" if expected else "BLOCKER"),
        root_cause="" if is_equal else (root_cause or _root_cause(endpoint, metric)),
    )


async def build_matrix() -> tuple[list[MatrixRow], dict[str, Any]]:
    rows: list[MatrixRow] = []
    start_dt = datetime.combine(WINDOW_START, time.min, tzinfo=APP_TIMEZONE)
    end_dt = datetime.combine(WINDOW_END, time.max, tzinfo=APP_TIMEZONE)

    session_maker = _session_makers["sis"]
    async with session_maker() as db:
        for department in DEPARTMENTS:
            filter_label = f"date_from={WINDOW_START.isoformat()},date_to={WINDOW_END.isoformat()},department={department}"
            scope = analytics_service.resolve_scope(
                "sis",
                WINDOW_START.isoformat(),
                WINDOW_END.isoformat(),
                department,
                None,
            )

            target_summary = await analytics_service.get_summary(db, scope)
            legacy_summary = await _legacy_summary(db, department, start_dt, end_dt)
            for metric in (
                "novos",
                "em_atendimento",
                "pendentes",
                "resolvidos_periodo",
                "backlog_aberto",
                "total_periodo",
            ):
                rows.append(
                    _make_row(
                        department,
                        "summary",
                        metric,
                        filter_label,
                        legacy_summary[metric],
                        target_summary[metric],
                    )
                )

            target_trends = await analytics_service.get_trends(db, scope)
            target_trend_map = {item["date"]: item for item in target_trends}
            legacy_trend_map = await _legacy_trends(db, department, start_dt, end_dt)
            for day in sorted(legacy_trend_map.keys()):
                for metric in ("novos", "em_atendimento", "pendentes", "resolvidos", "total_criados"):
                    rows.append(
                        _make_row(
                            department,
                            "trends",
                            f"{day}:{metric}",
                            filter_label,
                            legacy_trend_map[day][metric],
                            target_trend_map.get(day, {}).get(metric, 0),
                        )
                    )

            target_ranking = await analytics_service.get_ranking(db, scope, 10)
            legacy_ranking = await _legacy_ranking(db, department, start_dt, end_dt, 10)
            for idx in range(10):
                legacy_item = legacy_ranking[idx] if idx < len(legacy_ranking) else None
                target_item = target_ranking[idx] if idx < len(target_ranking) else None
                rows.append(
                    _make_row(
                        department,
                        "ranking",
                        f"top_{idx + 1}",
                        filter_label,
                        legacy_item,
                        target_item,
                    )
                )

            target_recent = await analytics_service.get_recent_activity(db, scope, 10)
            legacy_recent = await _legacy_recent_activity(db, department, 10)
            for idx in range(10):
                legacy_item = legacy_recent[idx] if idx < len(legacy_recent) else None
                target_item = (
                    {
                        "ticket_id": int(target_recent[idx]["ticket_id"]),
                        "action": target_recent[idx]["action"],
                        "occurred_at": _fmt(target_recent[idx]["occurred_at"]),
                    }
                    if idx < len(target_recent)
                    else None
                )
                rows.append(
                    _make_row(
                        department,
                        "recent-activity",
                        f"top_{idx + 1}",
                        filter_label,
                        legacy_item,
                        target_item,
                    )
                )

            target_entity = await analytics_service.get_distribution_entity(db, scope, 10)
            legacy_entity = await _legacy_distribution_entity(db, department, start_dt, end_dt, 10)
            for idx in range(10):
                legacy_item = legacy_entity[idx] if idx < len(legacy_entity) else None
                target_item = target_entity[idx] if idx < len(target_entity) else None
                rows.append(
                    _make_row(
                        department,
                        "distribution/entity",
                        f"top_{idx + 1}",
                        filter_label,
                        legacy_item,
                        target_item,
                    )
                )

            target_category = await analytics_service.get_distribution_category(db, scope, 10)
            legacy_category = await _legacy_distribution_category(db, department, start_dt, end_dt, 10)
            for idx in range(10):
                legacy_item = legacy_category[idx] if idx < len(legacy_category) else None
                target_item = target_category[idx] if idx < len(target_category) else None
                rows.append(
                    _make_row(
                        department,
                        "distribution/category",
                        f"top_{idx + 1}",
                        filter_label,
                        legacy_item,
                        target_item,
                    )
                )

    total = len(rows)
    passed = sum(1 for row in rows if row.status == "PASS")
    failed = total - passed
    expected_failed = sum(1 for row in rows if row.acceptance_status == "EXPECTED_DIFF")
    unexpected_failed = sum(1 for row in rows if row.acceptance_status == "BLOCKER")
    by_endpoint: dict[str, dict[str, int]] = {}
    for row in rows:
        endpoint_stats = by_endpoint.setdefault(
            row.endpoint,
            {
                "strict_pass": 0,
                "strict_fail": 0,
                "acceptance_pass": 0,
                "expected_diff": 0,
                "blocker": 0,
            },
        )
        endpoint_stats["strict_pass" if row.status == "PASS" else "strict_fail"] += 1
        if row.acceptance_status == "PASS":
            endpoint_stats["acceptance_pass"] += 1
        elif row.acceptance_status == "EXPECTED_DIFF":
            endpoint_stats["expected_diff"] += 1
        else:
            endpoint_stats["blocker"] += 1

    return rows, {
        "generated_at": datetime.now(tz=APP_TIMEZONE).isoformat(),
        "window": {"date_from": WINDOW_START.isoformat(), "date_to": WINDOW_END.isoformat()},
        "totals": {
            "rows": total,
            "pass": passed,
            "fail_strict": failed,
            "fail_expected": expected_failed,
            "fail_unexpected": unexpected_failed,
        },
        "gate": {
            "strict_convergence": "FAIL" if failed > 0 else "PASS",
            "contract_aligned_convergence": "FAIL" if unexpected_failed > 0 else "PASS",
        },
        "by_endpoint": by_endpoint,
    }


async def main() -> None:
    rows, summary = await build_matrix()
    out_dir = Path("output") / "analytics_acceptance"
    out_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now(tz=APP_TIMEZONE).strftime("%Y%m%d_%H%M%S")
    csv_path = out_dir / f"sis_legacy_vs_target_matrix_{stamp}.csv"
    json_path = out_dir / f"sis_legacy_vs_target_summary_{stamp}.json"

    with csv_path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "department",
                "endpoint",
                "metric",
                "filter",
                "legacy_value",
                "target_value",
                "delta",
                "status",
                "expected_divergence",
                "acceptance_status",
                "root_cause",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    with json_path.open("w", encoding="utf-8") as f:
        json.dump(summary, f, ensure_ascii=False, indent=2)

    print(f"MATRIX_CSV={csv_path}")
    print(f"SUMMARY_JSON={json_path}")
    print(json.dumps(summary, ensure_ascii=False, indent=2))

    await close_all_db_connections()


if __name__ == "__main__":
    asyncio.run(main())
