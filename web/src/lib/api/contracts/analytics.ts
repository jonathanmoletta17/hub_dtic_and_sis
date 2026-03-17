export interface AnalyticsFiltersDto {
  date_from: string;
  date_to: string;
  department?: string | null;
  group_ids?: number[];
}

export interface AnalyticsSummaryDto {
  novos: number;
  em_atendimento: number;
  pendentes: number;
  resolvidos_periodo: number;
  backlog_aberto: number;
  total_periodo: number;
}

export interface AnalyticsTrendPointDto {
  date: string;
  novos: number;
  em_atendimento: number;
  pendentes: number;
  resolvidos: number;
  total_criados: number;
}

export interface AnalyticsRankingItemDto {
  technician_id: number;
  technician_name: string;
  resolved_count: number;
}

export interface AnalyticsRecentActivityItemDto {
  ticket_id: number;
  title: string;
  status_id: number;
  status: string;
  category: string;
  requester: string;
  technician: string;
  action: string;
  occurred_at: string;
}

export interface AnalyticsDistributionItemDto {
  name: string;
  value: number;
}

export interface AnalyticsSummaryResponseDto {
  context: string;
  filters: AnalyticsFiltersDto;
  data: AnalyticsSummaryDto;
}

export interface AnalyticsTrendsResponseDto {
  context: string;
  filters: AnalyticsFiltersDto;
  series: AnalyticsTrendPointDto[];
}

export interface AnalyticsRankingResponseDto {
  context: string;
  filters: AnalyticsFiltersDto;
  limit: number;
  data: AnalyticsRankingItemDto[];
}

export interface AnalyticsRecentActivityResponseDto {
  context: string;
  filters: AnalyticsFiltersDto;
  limit: number;
  data: AnalyticsRecentActivityItemDto[];
}

export interface AnalyticsDistributionResponseDto {
  context: string;
  filters: AnalyticsFiltersDto;
  limit: number;
  data: AnalyticsDistributionItemDto[];
}
