import { asIsoDateTimeString } from "@/lib/datetime/iso";

import type {
  AnalyticsDistributionResponseDto,
  AnalyticsFiltersDto,
  AnalyticsRankingResponseDto,
  AnalyticsRecentActivityResponseDto,
  AnalyticsSummaryResponseDto,
  AnalyticsTrendsResponseDto,
} from "../contracts/analytics";
import type {
  AnalyticsDistributionResult,
  AnalyticsFilters,
  AnalyticsRankingResult,
  AnalyticsRecentActivityResult,
  AnalyticsSummaryResult,
  AnalyticsTrendsResult,
} from "../models/analytics";

function mapFiltersDto(filters: AnalyticsFiltersDto): AnalyticsFilters {
  return {
    dateFrom: filters.date_from,
    dateTo: filters.date_to,
    department: filters.department ?? null,
    groupIds: filters.group_ids ?? [],
  };
}

export function mapAnalyticsSummaryResponseDto(dto: AnalyticsSummaryResponseDto): AnalyticsSummaryResult {
  return {
    context: dto.context,
    filters: mapFiltersDto(dto.filters),
    data: {
      novos: dto.data.novos ?? 0,
      emAtendimento: dto.data.em_atendimento ?? 0,
      pendentes: dto.data.pendentes ?? 0,
      resolvidosPeriodo: dto.data.resolvidos_periodo ?? 0,
      backlogAberto: dto.data.backlog_aberto ?? 0,
      totalPeriodo: dto.data.total_periodo ?? 0,
    },
  };
}

export function mapAnalyticsTrendsResponseDto(dto: AnalyticsTrendsResponseDto): AnalyticsTrendsResult {
  return {
    context: dto.context,
    filters: mapFiltersDto(dto.filters),
    series: (dto.series || []).map((point) => ({
      date: point.date,
      novos: point.novos ?? 0,
      emAtendimento: point.em_atendimento ?? 0,
      pendentes: point.pendentes ?? 0,
      resolvidos: point.resolvidos ?? 0,
      totalCriados: point.total_criados ?? 0,
    })),
  };
}

export function mapAnalyticsRankingResponseDto(dto: AnalyticsRankingResponseDto): AnalyticsRankingResult {
  return {
    context: dto.context,
    filters: mapFiltersDto(dto.filters),
    limit: dto.limit ?? null,
    data: (dto.data || []).map((item) => ({
      technicianId: item.technician_id,
      technicianName: item.technician_name,
      resolvedCount: item.resolved_count ?? 0,
    })),
  };
}

export function mapAnalyticsRecentActivityResponseDto(
  dto: AnalyticsRecentActivityResponseDto,
): AnalyticsRecentActivityResult {
  return {
    context: dto.context,
    filters: mapFiltersDto(dto.filters),
    limit: dto.limit ?? 10,
    data: (dto.data || []).map((item) => ({
      ticketId: item.ticket_id,
      title: item.title,
      statusId: item.status_id,
      status: item.status,
      category: item.category,
      requester: item.requester,
      technician: item.technician,
      action: item.action,
      occurredAt: asIsoDateTimeString(item.occurred_at),
    })),
  };
}

export function mapAnalyticsDistributionResponseDto(
  dto: AnalyticsDistributionResponseDto,
): AnalyticsDistributionResult {
  return {
    context: dto.context,
    filters: mapFiltersDto(dto.filters),
    limit: dto.limit ?? 10,
    data: (dto.data || []).map((item) => ({
      name: item.name || "Sem dados",
      value: item.value ?? 0,
    })),
  };
}
