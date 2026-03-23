import json
import re
import html as html_module
import logging
from datetime import datetime, time, timedelta, timezone
from typing import List, Optional, Dict, Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.schemas.charger_schemas import (
    KanbanResponse, KanbanDemand, KanbanAvailableResource, KanbanAllocatedResource,
    KanbanLastTicket, ChargerInTicket, ScheduleBase, RankingItem, RankingResponse,
    TicketDetailResponse, AvailableChargerBrief, LastTicketBrief
)
from app.core.utils.time_utils import calculate_business_minutes, format_elapsed_time
from app.core.utils.cache_utils import ttl_cache
from app.core.datetime_contract import ensure_aware_datetime, now_in_app_timezone


def _clean_html(raw: str) -> str:
    """Remove tags HTML e decodifica entidades."""
    if not raw:
        return ""
    clean = html_module.unescape(raw)
    clean = re.sub(r"<[^>]*>", "", clean)
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean[:500]

from app.services.charger_queries import (
    CHARGER_ITIL_CATEGORIES, SQL_CHARGER_META, SQL_AVAILABLE_CHARGERS, SQL_LAST_RESOLVED_TICKET,
    SQL_ALLOCATED_CHARGERS, SQL_PENDING_DEMANDS, SQL_RANKING_LOGS, SQL_ALL_ACTIVE_CHARGERS,
    SQL_TICKET_BASIC_DETAILS, SQL_CHARGERS_IN_TICKET, SQL_AVAILABLE_CHARGERS_DETAILED
)

logger = logging.getLogger(__name__)


def _elapsed_minutes_since(start_dt: Optional[datetime], end_dt: datetime) -> int:
    normalized_start = ensure_aware_datetime(start_dt)
    normalized_end = ensure_aware_datetime(end_dt)
    if normalized_start is None or normalized_end is None:
        return 0
    return max(int((normalized_end - normalized_start).total_seconds() / 60), 0)


def _parse_hhmm(value: Optional[str], fallback: str) -> tuple[int, int]:
    source = (value or fallback).strip()
    try:
        hour_raw, minute_raw = source.split(":", 1)
        hour = int(hour_raw)
        minute = int(minute_raw)
        if 0 <= hour <= 23 and 0 <= minute <= 59:
            return hour, minute
    except Exception:
        pass
    fallback_hour, fallback_minute = fallback.split(":", 1)
    return int(fallback_hour), int(fallback_minute)


def _is_within_schedule(now_dt: datetime, business_start: Optional[str], business_end: Optional[str]) -> bool:
    start_hour, start_minute = _parse_hhmm(business_start, "08:00")
    end_hour, end_minute = _parse_hhmm(business_end, "18:00")

    now_minutes = now_dt.hour * 60 + now_dt.minute
    start_minutes = start_hour * 60 + start_minute
    end_minutes = end_hour * 60 + end_minute

    if start_minutes == end_minutes:
        return True
    if end_minutes > start_minutes:
        return start_minutes <= now_minutes < end_minutes
    return now_minutes >= start_minutes or now_minutes < end_minutes

class ChargerService:
    @ttl_cache(ttl_seconds=10, ignore_args=[0, 2, 3])  # Ignora self, glpi_db, local_db
    async def get_kanban_data(
        self, 
        context: str, 
        glpi_db: AsyncSession, 
        local_db: AsyncSession
    ) -> KanbanResponse:
        """Gera o estado completo do Kanban de Carregadores."""
        now = now_in_app_timezone()
        default_b_start = "08:00"
        default_b_end = "18:00"
        default_weekends = False

        # ── Passo 0: Buscar metadata ──
        res_meta = await glpi_db.execute(SQL_CHARGER_META)
        charger_meta = {row.id: row for row in res_meta.fetchall()}

        # ── C1: Carregadores DISPONÍVEIS ──
        res_available = await glpi_db.execute(SQL_AVAILABLE_CHARGERS)
        avail_rows = res_available.fetchall()

        available: List[KanbanAvailableResource] = []
        for r in avail_rows:
            meta = charger_meta.get(r.id)
            is_offline = bool(meta and str(meta.is_offline_raw) == '1')
            
            last_ticket_obj = None
            if r.last_solved_date:
                last_t = (await glpi_db.execute(SQL_LAST_RESOLVED_TICKET, {"cid": r.id})).fetchone()
                if last_t:
                    last_ticket_obj = KanbanLastTicket(
                        id=last_t.id,
                        title=_clean_html(last_t.title),
                        solvedate=ensure_aware_datetime(last_t.solvedate),
                        location=last_t.location or None
                    )

            available.append(KanbanAvailableResource(
                id=r.id,
                name=r.name,
                location=meta.location if meta else None,
                is_offline=is_offline,
                offline_reason=meta.offline_reason if (meta and is_offline) else None,
                expected_return=str(meta.expected_return) if (meta and meta.expected_return) else None,
                business_start=meta.b_start if meta else "08:00",
                business_end=meta.b_end if meta else "18:00",
                lastTicket=last_ticket_obj
            ))

        # ── C2: Carregadores ALOCADOS ──
        res_allocated = await glpi_db.execute(SQL_ALLOCATED_CHARGERS, {"categories": CHARGER_ITIL_CATEGORIES})
        alloc_rows = res_allocated.fetchall()

        ticket_groups: Dict[int, dict] = {}
        for r in alloc_rows:
            tid = r.ticket_id
            charger_assigned_date = r.assigned_date or r.ticket_date
            
            ch_meta = charger_meta.get(r.charger_id)
            ch_b_start = ch_meta.b_start if ch_meta else default_b_start
            ch_b_end = ch_meta.b_end if ch_meta else default_b_end
            
            service_mins = 0
            if charger_assigned_date:
                assigned_dt = ensure_aware_datetime(charger_assigned_date)
                service_mins = calculate_business_minutes(
                    assigned_dt, now, ch_b_start, ch_b_end, default_weekends
                )

            if tid not in ticket_groups:
                ticket_groups[tid] = {
                    "ticket_id": tid,
                    "title": _clean_html(r.ticket_name),
                    "date": ensure_aware_datetime(r.ticket_date),
                    "status": r.ticket_status,
                    "category": r.category_name or None,
                    "location": r.location or None,
                    "requester_name": r.requester_name,
                    "_ticket_date_obj": ensure_aware_datetime(r.ticket_date),
                    "time_elapsed": "0h 0m",
                    "chargers": []
                }

            ticket_groups[tid]["chargers"].append(
                ChargerInTicket(
                    id=r.charger_id,
                    name=r.charger_name,
                    assigned_date=ensure_aware_datetime(charger_assigned_date),
                    service_time_minutes=service_mins,
                    schedule=ScheduleBase(
                        business_start=ch_b_start,
                        business_end=ch_b_end,
                        work_on_weekends=default_weekends
                    )
                )
            )

        for grp in ticket_groups.values():
            ticket_date = grp.pop("_ticket_date_obj", None)
            if ticket_date:
                grp["time_elapsed"] = format_elapsed_time(_elapsed_minutes_since(ticket_date, now))

        allocated: List[KanbanAllocatedResource] = [
            KanbanAllocatedResource(**v) for v in ticket_groups.values()
        ]

        # ── C3: DEMANDAS PENDENTES ──
        res_demands = await glpi_db.execute(SQL_PENDING_DEMANDS, {"categories": CHARGER_ITIL_CATEGORIES})
        demand_rows = res_demands.fetchall()

        demands: List[KanbanDemand] = []
        seen_tickets = set()
        for r in demand_rows:
            if r.id in seen_tickets: continue
            seen_tickets.add(r.id)
            demand_date = ensure_aware_datetime(r.date_creation)
            wall_mins = _elapsed_minutes_since(demand_date, now)
            demands.append(KanbanDemand(
                id=r.id,
                name=_clean_html(r.name),
                status=r.status,
                priority=r.priority,
                date_creation=demand_date,
                location=r.location or None,
                category=r.category,
                requester_name=r.requester_name,
                time_elapsed=format_elapsed_time(max(wall_mins, 0))
            ))

        return KanbanResponse(
            context=context,
            demands=demands,
            availableResources=available,
            allocatedResources=allocated
        )

    @ttl_cache(ttl_seconds=25, ignore_args=[0, 2])  # Ignora self, glpi_db
    async def get_ranking(
        self, 
        context: str, 
        glpi_db: AsyncSession,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> RankingResponse:
        """Calcula o ranking de performance dos carregadores."""
        now = now_in_app_timezone()
        if not start_date:
            start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                end_date = end_dt.strftime("%Y-%m-%d")
            except ValueError as e:
                logger.warning("Falha ao interpretar/formatar end_date '%s': %s", end_date, e)

        res = await glpi_db.execute(SQL_RANKING_LOGS, {"start": start_date, "end": end_date})
        rows = res.fetchall()

        res_all = await glpi_db.execute(SQL_ALL_ACTIVE_CHARGERS)
        all_chargers = res_all.fetchall()

        ch_stats = {
            r.id: {
                "id": r.id, "name": r.name, "resolved_count": 0,
                "last_activity": None, "total_service_mins": 0
            } 
            for r in all_chargers
        }

        for r in rows:
            cid = r.id
            if cid not in ch_stats: continue
            ch_stats[cid]["resolved_count"] += 1
            
            # Determina o fim da atividade para last_activity e cálculo de tempo
            end_activity = ensure_aware_datetime(r.solvedate) if r.solvedate else now
            
            if ch_stats[cid]["last_activity"] is None or end_activity > ch_stats[cid]["last_activity"]:
                ch_stats[cid]["last_activity"] = end_activity

            if r.assigned_at:
                assigned_dt = ensure_aware_datetime(r.assigned_at)
                active_mins = calculate_business_minutes(
                    assigned_dt, end_activity, r.b_start, r.b_end, False
                )
                ch_stats[cid]["total_service_mins"] += active_mins

        sorted_stats = sorted(
            ch_stats.values(), 
            key=lambda x: (x["total_service_mins"], x["resolved_count"]), 
            reverse=True
        )

        ranking = []
        for stat in sorted_stats:
            avg_time = "0h 0m"
            if stat["resolved_count"] > 0:
                avg_time = format_elapsed_time(stat["total_service_mins"] // stat["resolved_count"])

            ranking.append(RankingItem(
                id=stat["id"],
                name=stat["name"],
                completed_tickets=stat["resolved_count"],
                average_wait_time=avg_time,
                last_activity=stat["last_activity"],
                total_service_minutes=stat["total_service_mins"]
            ))
            
        return RankingResponse(context=context, ranking=ranking)

    async def get_ticket_detail(
        self,
        ticket_id: int,
        glpi_db: AsyncSession
    ) -> TicketDetailResponse:
        """Busca detalhes completos de um ticket para o modal."""
        now = now_in_app_timezone()

        res_ticket = await glpi_db.execute(SQL_TICKET_BASIC_DETAILS, {"tid": ticket_id})
        ticket_row = res_ticket.fetchone()
        if not ticket_row: return None

        res_chargers = await glpi_db.execute(SQL_CHARGERS_IN_TICKET, {"tid": ticket_id})
        charger_rows = res_chargers.fetchall()

        chargers_list = []
        for cr in charger_rows:
            a_date = cr.assigned_date or ticket_row.date
            service_mins = 0
            if a_date:
                assigned_dt = ensure_aware_datetime(a_date)
                service_mins = calculate_business_minutes(assigned_dt, now, cr.b_start, cr.b_end, False)
            chargers_list.append(ChargerInTicket(
                id=cr.id, name=cr.name,
                assigned_date=ensure_aware_datetime(a_date),
                service_time_minutes=service_mins,
                schedule=ScheduleBase(business_start=cr.b_start, business_end=cr.b_end)
            ))

        res_avail = await glpi_db.execute(SQL_AVAILABLE_CHARGERS_DETAILED)
        available_list = []
        for r in res_avail.fetchall():
            business_start = r.b_start or "08:00"
            business_end = r.b_end or "18:00"
            is_within_schedule = _is_within_schedule(now, business_start, business_end)
            last_ticket = None
            if r.last_ticket_id:
                last_ticket = LastTicketBrief(
                    id=r.last_ticket_id, title=_clean_html(r.last_ticket_name or ""),
                    solvedate=ensure_aware_datetime(r.last_ticket_solvedate),
                    location=r.last_ticket_location or None
                )
            available_list.append(AvailableChargerBrief(
                id=r.id, name=r.name,
                is_offline=bool(str(r.is_offline_raw) == '1'),
                is_within_schedule=is_within_schedule,
                business_start=business_start,
                business_end=business_end,
                lastTicket=last_ticket
            ))

        return TicketDetailResponse(
            id=ticket_row.id, name=_clean_html(ticket_row.name), content=_clean_html(ticket_row.content),
            date=ensure_aware_datetime(ticket_row.date),
            status=ticket_row.status, priority=ticket_row.priority,
            location=ticket_row.location or None, category=ticket_row.category or None,
            requester_name=ticket_row.requester_name, chargers=chargers_list,
            available_chargers=available_list
        )
