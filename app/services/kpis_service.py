"""
Governance KPI Calculator Module (Universal Backend Port)
Calculates the 7 official DTIC/SIS governance KPIs from GLPI data natively using Async SQLAlchemy.
Dynamic permissions: group_ids are injected from the frontend user context (Auth)
"""
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import zoneinfo
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
import logging
import time

logger = logging.getLogger(__name__)

# --- Official Thresholds ---
THRESHOLDS = {
    "sla":          {"meta": 90,   "alerta": 85,   "critico": 80,   "direction": "higher_is_better"},
    "tma":          {"meta": 24,   "alerta": 36,   "critico": 48,   "direction": "lower_is_better"},
    "tme":          {"meta": 4,    "alerta": 8,    "critico": 12,   "direction": "lower_is_better"},
    "reincidencia": {"meta": 5,    "alerta": 8,    "critico": 10,   "direction": "lower_is_better"},
}

SEVERITY_MAP = {5: "critico", 4: "alto", 3: "medio", 2: "baixo", 1: "muito_baixo"}

def _evaluate_status(value: float, kpi_key: str) -> str:
    t = THRESHOLDS.get(kpi_key)
    if not t: return "neutral"
    if t["direction"] == "higher_is_better":
        if value >= t["meta"]: return "green"
        elif value >= t["alerta"]: return "yellow"
        else: return "red"
    else:
        if value <= t["meta"]: return "green"
        elif value <= t["alerta"]: return "yellow"
        else: return "red"

def _get_period_range(period: Optional[str] = None):
    now = datetime.now(zoneinfo.ZoneInfo("America/Sao_Paulo"))
    if not period or period == "current_month":
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        next_month = start.replace(day=28) + timedelta(days=4)
        end = next_month - timedelta(days=next_month.day)
        end = end.replace(hour=23, minute=59, second=59)
        return start, end

    if period == "last_month":
        last_month_end = now.replace(day=1) - timedelta(days=1)
        start = last_month_end.replace(day=1, hour=0, minute=0, second=0)
        end = last_month_end.replace(hour=23, minute=59, second=59)
        return start, end
        
    if period == "last_12_months":
        end = now
        start = end - timedelta(days=365)
        return start, end

    try:
        year, month = period.split("-")
        start = datetime(int(year), int(month), 1)
        if int(month) == 12: end = datetime(int(year) + 1, 1, 1) - timedelta(seconds=1)
        else: end = datetime(int(year), int(month) + 1, 1) - timedelta(seconds=1)
        return start, end
    except (ValueError, TypeError, AttributeError) as e:
        logger.warning("Falha ao parsear o período '%s' no kpis_service: %s", period, e)
        return _get_period_range("current_month")

async def calc_sla(db: AsyncSession, start_date: datetime, end_date: datetime, group_ids: List[int]) -> dict:
    groups_str = ','.join(map(str, group_ids)) if group_ids else '0'
    working_seconds_sql = """
        CASE 
            WHEN DATEDIFF(t.solvedate, t.date) = 0 THEN
                CASE WHEN WEEKDAY(t.date) < 5 THEN
                    GREATEST(0, TIME_TO_SEC(LEAST(TIME(t.solvedate), '18:00:00')) - TIME_TO_SEC(GREATEST(TIME(t.date), '08:00:00')))
                ELSE 0 END
            ELSE
                GREATEST(0, (5 * (DATEDIFF(t.solvedate, t.date + INTERVAL 1 DAY) DIV 7) + 
                    MID('0123455501234445012223450111234500012345001234560123456', 7 * WEEKDAY(t.date + INTERVAL 1 DAY) + MOD(DATEDIFF(t.solvedate, t.date + INTERVAL 1 DAY), 7) + 1, 1)
                )) * 36000
                + CASE WHEN WEEKDAY(t.date) < 5 THEN GREATEST(0, 64800 - TIME_TO_SEC(GREATEST(TIME(t.date), '08:00:00'))) ELSE 0 END
                + CASE WHEN WEEKDAY(t.solvedate) < 5 THEN GREATEST(0, TIME_TO_SEC(LEAST(TIME(t.solvedate), '18:00:00')) - 28800) ELSE 0 END
        END
    """
    virtual_threshold_sql = """
        CASE t.priority
            WHEN 5 THEN 28800
            WHEN 4 THEN 57600
            WHEN 3 THEN 86400
            ELSE 144000
        END
    """

    query = text(f"""
        SELECT 
            COUNT(DISTINCT t.id) as total_closed,
            COUNT(DISTINCT CASE 
                WHEN t.time_to_resolve IS NOT NULL AND t.solvedate <= t.time_to_resolve THEN t.id
                WHEN t.time_to_resolve IS NULL AND {working_seconds_sql} <= {virtual_threshold_sql} THEN t.id
                ELSE NULL
            END) as within_sla,
            COUNT(DISTINCT CASE WHEN t.time_to_resolve IS NULL THEN t.id END) as using_fallback
        FROM glpi_tickets t
        JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (5, 6)
          AND t.solvedate BETWEEN :start AND :end
          AND gt.groups_id IN ({groups_str})
    """)
    result = await db.execute(query, {"start": start_date, "end": end_date})
    row = result.fetchone()

    total = int(row[0] or 0)
    within = int(row[1] or 0)
    fallback_count = int(row[2] or 0)
    value = round((within / total * 100) if total > 0 else 0, 1)

    return {
        "id": "sla", "title": "SLA Cumprido (%)", "value": value,
        "status": _evaluate_status(value, "sla"),
        "detail": {"Dentro do Prazo": within, "Total Fechados": total, "Base Virtual": fallback_count},
        "is_fallback": fallback_count > 0, **THRESHOLDS["sla"]
    }

async def calc_tma(db: AsyncSession, start_date: datetime, end_date: datetime, group_ids: List[int]) -> dict:
    groups_str = ','.join(map(str, group_ids)) if group_ids else '0'
    working_seconds_sql = """
        CASE 
            WHEN DATEDIFF(t.solvedate, t.date) = 0 THEN
                CASE WHEN WEEKDAY(t.date) < 5 THEN
                    GREATEST(0, TIME_TO_SEC(LEAST(TIME(t.solvedate), '18:00:00')) - TIME_TO_SEC(GREATEST(TIME(t.date), '08:00:00')))
                ELSE 0 END
            ELSE
                GREATEST(0, (5 * (DATEDIFF(t.solvedate, t.date + INTERVAL 1 DAY) DIV 7) + 
                    MID('0123455501234445012223450111234500012345001234560123456', 7 * WEEKDAY(t.date + INTERVAL 1 DAY) + MOD(DATEDIFF(t.solvedate, t.date + INTERVAL 1 DAY), 7) + 1, 1)
                )) * 36000
                + CASE WHEN WEEKDAY(t.date) < 5 THEN GREATEST(0, 64800 - TIME_TO_SEC(GREATEST(TIME(t.date), '08:00:00'))) ELSE 0 END
                + CASE WHEN WEEKDAY(t.solvedate) < 5 THEN GREATEST(0, TIME_TO_SEC(LEAST(TIME(t.solvedate), '18:00:00')) - 28800) ELSE 0 END
        END
    """

    query = text(f"""
        SELECT AVG({working_seconds_sql}) as avg_seconds, COUNT(DISTINCT t.id) as total
        FROM glpi_tickets t
        JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        WHERE t.is_deleted = 0
          AND t.entities_id != 0
          AND t.status IN (5, 6)
          AND t.solvedate BETWEEN :start AND :end
          AND t.solve_delay_stat IS NOT NULL AND t.solve_delay_stat > 0
          AND gt.groups_id IN ({groups_str})
    """)
    result = await db.execute(query, {"start": start_date, "end": end_date})
    row = result.fetchone()

    avg_seconds = float(row[0] or 0)
    total = int(row[1] or 0)
    value = round(avg_seconds / 3600, 1)

    return {
        "id": "tma", "title": "TMA - Tempo Médio de Atendimento (h)", "value": value,
        "status": _evaluate_status(value, "tma"),
        "detail": {"Média (h)": value, "Total Analisado": total}, **THRESHOLDS["tma"]
    }

async def calc_incidents(db: AsyncSession, start_date: datetime, end_date: datetime, group_ids: List[int]) -> dict:
    groups_str = ','.join(map(str, group_ids)) if group_ids else '0'
    query = text(f"""
        SELECT t.priority, COUNT(*) as count
        FROM glpi_tickets t
        JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        WHERE t.is_deleted = 0 AND t.entities_id != 0 AND t.type = 1
          AND t.date BETWEEN :start AND :end AND gt.groups_id IN ({groups_str})
        GROUP BY t.priority
    """)
    results = await db.execute(query, {"start": start_date, "end": end_date})
    rows = results.fetchall()

    breakdown = {v: 0 for v in SEVERITY_MAP.values()}
    total = 0
    for r in rows:
        severity_name = SEVERITY_MAP.get(r[0], "desconhecido")
        breakdown[severity_name] = int(r[1])
        total += int(r[1])

    return {"id": "incidentes", "title": "Incidentes por Severidade", "value": total, "status": "neutral", "detail": breakdown, "trend": []}

async def calc_reincidence(db: AsyncSession, start_date: datetime, end_date: datetime, group_ids: List[int]) -> dict:
    groups_str = ','.join(map(str, group_ids)) if group_ids else '0'
    query_total = text(f"""
        SELECT COUNT(DISTINCT t.id) 
        FROM glpi_tickets t JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        WHERE t.is_deleted = 0 AND t.entities_id != 0 AND t.status IN (5, 6)
          AND t.solvedate BETWEEN :start AND :end AND gt.groups_id IN ({groups_str})
    """)
    res1 = await db.execute(query_total, {"start": start_date, "end": end_date})
    total_closed = res1.scalar() or 0

    query_reopened = text(f"""
        SELECT COUNT(DISTINCT t.id)
        FROM glpi_tickets t JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2 JOIN glpi_logs l ON l.items_id = t.id
        WHERE t.is_deleted = 0 AND t.solvedate BETWEEN :start AND :end AND gt.groups_id IN ({groups_str})
          AND l.itemtype = 'Ticket' AND l.id_search_option = 12
          AND l.old_value IN ('5', '6', 'Resolvido', 'Fechado', 'Solved', 'Closed')
          AND l.new_value NOT IN ('5', '6', 'Resolvido', 'Fechado', 'Solved', 'Closed')
    """)
    res2 = await db.execute(query_reopened, {"start": start_date, "end": end_date})
    reopened = res2.scalar() or 0
    value = round((reopened / total_closed * 100) if total_closed > 0 else 0, 1)

    return {"id": "reincidencia", "title": "% Reincidência", "value": value, "status": _evaluate_status(value, "reincidencia"), "detail": {"reopened": reopened, "total_closed": total_closed}, **THRESHOLDS["reincidencia"]}

async def calc_volumetry(db: AsyncSession, start_date: datetime, end_date: datetime, group_ids: List[int]) -> dict:
    groups_str = ','.join(map(str, group_ids)) if group_ids else '0'
    query = text(f"""
        SELECT 
            COUNT(DISTINCT CASE WHEN t.date BETWEEN :start AND :end THEN t.id END) as created_count,
            COUNT(DISTINCT CASE WHEN t.solvedate BETWEEN :start AND :end THEN t.id END) as closed_count
        FROM glpi_tickets t JOIN glpi_groups_tickets gt ON gt.tickets_id = t.id AND gt.type = 2
        WHERE t.is_deleted = 0 AND t.entities_id != 0 AND gt.groups_id IN ({groups_str})
          AND (t.date BETWEEN :start AND :end OR t.solvedate BETWEEN :start AND :end)
    """)
    result = await db.execute(query, {"start": start_date, "end": end_date})
    row = result.fetchone()
    opened = int(row[0] or 0)
    closed = int(row[1] or 0)

    return {"id": "volumetria", "title": "Chamados Abertos/Fechados", "value": {"abertos": opened, "fechados": closed}, "status": "neutral", "detail": {"backlog_delta": opened - closed}}

async def get_all_governance_kpis(db: AsyncSession, group_ids: List[int], period: Optional[str] = None) -> dict:
    start_date, end_date = _get_period_range(period)
    kpis = {}
    
    # Execução sequencial para priorizar estabilidade em async (pode ser asyncio.gather)
    kpis["sla"] = await calc_sla(db, start_date, end_date, group_ids)
    kpis["tma"] = await calc_tma(db, start_date, end_date, group_ids)
    kpis["incidentes"] = await calc_incidents(db, start_date, end_date, group_ids)
    kpis["reincidencia"] = await calc_reincidence(db, start_date, end_date, group_ids)
    kpis["volumetria"] = await calc_volumetry(db, start_date, end_date, group_ids)

    return {
        "period": f"{start_date.year}-{start_date.month:02d}",
        "kpis": kpis
    }
