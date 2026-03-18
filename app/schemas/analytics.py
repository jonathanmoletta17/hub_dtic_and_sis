from __future__ import annotations

from pydantic import BaseModel, Field

from app.core.datetime_contract import AwareDateTime


class AnalyticsFilters(BaseModel):
    date_from: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    date_to: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    department: str | None = None
    group_ids: list[int] = Field(default_factory=list)


class AnalyticsSummaryData(BaseModel):
    novos: int
    em_atendimento: int
    pendentes: int
    resolvidos_periodo: int
    backlog_aberto: int
    total_periodo: int


class AnalyticsSummaryResponse(BaseModel):
    context: str
    filters: AnalyticsFilters
    data: AnalyticsSummaryData


class AnalyticsTrendPoint(BaseModel):
    date: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")
    novos: int
    em_atendimento: int
    pendentes: int
    resolvidos: int
    total_criados: int


class AnalyticsTrendsResponse(BaseModel):
    context: str
    filters: AnalyticsFilters
    series: list[AnalyticsTrendPoint]


class AnalyticsRankingItem(BaseModel):
    technician_id: int
    technician_name: str
    resolved_count: int


class AnalyticsRankingResponse(BaseModel):
    context: str
    filters: AnalyticsFilters
    limit: int | None
    data: list[AnalyticsRankingItem]


class AnalyticsRecentActivityItem(BaseModel):
    ticket_id: int
    title: str
    status_id: int
    status: str
    category: str
    requester: str
    technician: str
    action: str
    occurred_at: AwareDateTime


class AnalyticsRecentActivityResponse(BaseModel):
    context: str
    filters: AnalyticsFilters
    limit: int
    data: list[AnalyticsRecentActivityItem]


class AnalyticsDistributionItem(BaseModel):
    name: str
    value: int


class AnalyticsDistributionResponse(BaseModel):
    context: str
    filters: AnalyticsFilters
    limit: int
    data: list[AnalyticsDistributionItem]
