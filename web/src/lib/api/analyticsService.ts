import { apiGet, buildApiPath } from "./client";
import type {
  AnalyticsDistributionResponseDto,
  AnalyticsRankingResponseDto,
  AnalyticsRecentActivityResponseDto,
  AnalyticsSummaryResponseDto,
  AnalyticsTrendsResponseDto,
} from "./contracts/analytics";
import {
  mapAnalyticsDistributionResponseDto,
  mapAnalyticsRankingResponseDto,
  mapAnalyticsRecentActivityResponseDto,
  mapAnalyticsSummaryResponseDto,
  mapAnalyticsTrendsResponseDto,
} from "./mappers/analytics";
import type {
  AnalyticsDistributionResult,
  AnalyticsRankingResult,
  AnalyticsRecentActivityResult,
  AnalyticsSummaryResult,
  AnalyticsTrendsResult,
} from "./models/analytics";

export interface AnalyticsQueryOptions {
  dateFrom?: string;
  dateTo?: string;
  department?: string | null;
  groupIds?: number[] | null;
}

export interface AnalyticsListQueryOptions extends AnalyticsQueryOptions {
  limit?: number;
}

function serializeGroupIds(groupIds?: number[] | null): string | undefined {
  if (!groupIds || groupIds.length === 0) {
    return undefined;
  }
  return groupIds.join(",");
}

function buildCommonParams(options: AnalyticsQueryOptions = {}): Record<string, string | undefined> {
  return {
    date_from: options.dateFrom,
    date_to: options.dateTo,
    department: options.department ?? undefined,
    group_ids: serializeGroupIds(options.groupIds),
  };
}

export async function fetchAnalyticsSummary(
  context: string,
  options: AnalyticsQueryOptions = {},
): Promise<AnalyticsSummaryResult> {
  const dto = await apiGet<AnalyticsSummaryResponseDto>(
    buildApiPath(context, "analytics/summary"),
    buildCommonParams(options),
  );
  return mapAnalyticsSummaryResponseDto(dto);
}

export async function fetchAnalyticsTrends(
  context: string,
  options: AnalyticsQueryOptions = {},
): Promise<AnalyticsTrendsResult> {
  const dto = await apiGet<AnalyticsTrendsResponseDto>(
    buildApiPath(context, "analytics/trends"),
    buildCommonParams(options),
  );
  return mapAnalyticsTrendsResponseDto(dto);
}

export async function fetchAnalyticsRanking(
  context: string,
  options: AnalyticsListQueryOptions = {},
): Promise<AnalyticsRankingResult> {
  const dto = await apiGet<AnalyticsRankingResponseDto>(
    buildApiPath(context, "analytics/ranking"),
    {
      ...buildCommonParams(options),
      limit: options.limit,
    },
  );
  return mapAnalyticsRankingResponseDto(dto);
}

export async function fetchAnalyticsRecentActivity(
  context: string,
  options: AnalyticsListQueryOptions = {},
): Promise<AnalyticsRecentActivityResult> {
  const dto = await apiGet<AnalyticsRecentActivityResponseDto>(
    buildApiPath(context, "analytics/recent-activity"),
    {
      ...buildCommonParams(options),
      limit: options.limit,
    },
  );
  return mapAnalyticsRecentActivityResponseDto(dto);
}

export async function fetchAnalyticsDistributionEntity(
  context: string,
  options: AnalyticsListQueryOptions = {},
): Promise<AnalyticsDistributionResult> {
  const dto = await apiGet<AnalyticsDistributionResponseDto>(
    buildApiPath(context, "analytics/distribution/entity"),
    {
      ...buildCommonParams(options),
      limit: options.limit,
    },
  );
  return mapAnalyticsDistributionResponseDto(dto);
}

export async function fetchAnalyticsDistributionCategory(
  context: string,
  options: AnalyticsListQueryOptions = {},
): Promise<AnalyticsDistributionResult> {
  const dto = await apiGet<AnalyticsDistributionResponseDto>(
    buildApiPath(context, "analytics/distribution/category"),
    {
      ...buildCommonParams(options),
      limit: options.limit,
    },
  );
  return mapAnalyticsDistributionResponseDto(dto);
}
