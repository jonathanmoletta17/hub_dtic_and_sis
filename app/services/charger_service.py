import json
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
from app.services.charger_queries import (
    CHARGER_ITIL_CATEGORIES, SQL_CHARGER_META, SQL_AVAILABLE_CHARGERS, SQL_LAST_RESOLVED_TICKET,
    SQL_ALLOCATED_CHARGERS, SQL_PENDING_DEMANDS, SQL_RANKING_LOGS, SQL_ALL_ACTIVE_CHARGERS,
    SQL_TICKET_BASIC_DETAILS, SQL_CHARGERS_IN_TICKET, SQL_AVAILABLE_CHARGERS_DETAILED
)

logger = logging.getLogger(__name__)

class ChargerService:
    async def get_kanban_data(
        self, 
        context: str, 
        glpi_db: AsyncSession, 
        local_db: AsyncSession
    ) -> KanbanResponse:
        """Gera o estado completo do Kanban de Carregadores."""
        now = datetime.now()
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
                        title=last_t.title,
                        solvedate=last_t.solvedate.isoformat() if last_t.solvedate else None,
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
                service_mins = calculate_business_minutes(
                    charger_assigned_date, now, ch_b_start, ch_b_end, default_weekends
                )

            if tid not in ticket_groups:
                ticket_groups[tid] = {
                    "ticket_id": tid,
                    "title": r.ticket_name,
                    "date": r.ticket_date.isoformat() if r.ticket_date else None,
                    "status": r.ticket_status,
                    "category": r.category_name or None,
                    "location": r.location or None,
                    "requester_name": r.requester_name,
                    "_ticket_date_obj": r.ticket_date,
                    "time_elapsed": "0h 0m",
                    "chargers": []
                }

            ticket_groups[tid]["chargers"].append(
                ChargerInTicket(
                    id=r.charger_id,
                    name=r.charger_name,
                    assigned_date=charger_assigned_date.isoformat() if charger_assigned_date else None,
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
                wall_mins = int((now - ticket_date).total_seconds() / 60)
                grp["time_elapsed"] = format_elapsed_time(max(wall_mins, 0))

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
            wall_mins = int((now - r.date_creation).total_seconds() / 60)
            demands.append(KanbanDemand(
                id=r.id,
                name=r.name,
                status=r.status,
                priority=r.priority,
                date_creation=r.date_creation,
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

    async def get_ranking(
        self, 
        context: str, 
        glpi_db: AsyncSession,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> RankingResponse:
        """Calcula o ranking de performance dos carregadores."""
        now = datetime.now()
        if not start_date:
            start_date = (now - timedelta(days=30)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = (now + timedelta(days=1)).strftime("%Y-%m-%d")
        else:
            try:
                end_dt = datetime.strptime(end_date, "%Y-%m-%d") + timedelta(days=1)
                end_date = end_dt.strftime("%Y-%m-%d")
            except: pass

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
            end_activity = r.solvedate or now
            if ch_stats[cid]["last_activity"] is None or end_activity > ch_stats[cid]["last_activity"]:
                ch_stats[cid]["last_activity"] = end_activity
            
            if r.assigned_at:
                active_mins = calculate_business_minutes(
                    r.assigned_at, end_activity, r.b_start, r.b_end, False
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
        now = datetime.now()

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
                service_mins = calculate_business_minutes(a_date, now, cr.b_start, cr.b_end, False)
            chargers_list.append(ChargerInTicket(
                id=cr.id, name=cr.name,
                assigned_date=a_date.isoformat() if a_date else None,
                service_time_minutes=service_mins,
                schedule=ScheduleBase(business_start=cr.b_start, business_end=cr.b_end)
            ))

        res_avail = await glpi_db.execute(SQL_AVAILABLE_CHARGERS_DETAILED)
        available_list = []
        for r in res_avail.fetchall():
            last_ticket = None
            if r.last_ticket_id:
                last_ticket = LastTicketBrief(
                    id=r.last_ticket_id, title=r.last_ticket_name or "",
                    solvedate=r.last_ticket_solvedate.isoformat() if r.last_ticket_solvedate else None,
                    location=r.last_ticket_location or None
                )
            available_list.append(AvailableChargerBrief(
                id=r.id, name=r.name,
                is_offline=bool(str(r.is_offline_raw) == '1'),
                lastTicket=last_ticket
            ))

        return TicketDetailResponse(
            id=ticket_row.id, name=ticket_row.name, content=ticket_row.content,
            date=ticket_row.date.isoformat() if ticket_row.date else None,
            status=ticket_row.status, priority=ticket_row.priority,
            location=ticket_row.location or None, category=ticket_row.category or None,
            requester_name=ticket_row.requester_name, chargers=chargers_list,
            available_chargers=available_list
        )
