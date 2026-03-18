import { toIsoDateTimeOrNull } from "@/lib/datetime/iso";

import type {
  KBArticleAttachmentDto,
  KBArticleDetailDto,
  KBArticleResponseDto,
  KBArticleSummaryDto,
  KBCategoryDto,
  KBListResponseDto,
} from "../contracts/knowledge";
import type {
  KBArticleAttachment,
  KBArticleDetail,
  KBArticleSummary,
  KBCategory,
  KBListResult,
} from "../models/knowledge";

export function mapKBCategoryDto(dto: KBCategoryDto): KBCategory {
  return {
    id: dto.id,
    name: dto.name,
    completename: dto.completename,
    level: dto.level,
    article_count: dto.article_count,
  };
}

export function mapKBArticleSummaryDto(dto: KBArticleSummaryDto): KBArticleSummary {
  return {
    id: dto.id,
    name: dto.name,
    category: dto.category,
    category_id: dto.category_id,
    author: dto.author,
    date_creation: toIsoDateTimeOrNull(dto.date_creation),
    date_mod: toIsoDateTimeOrNull(dto.date_mod),
    is_faq: dto.is_faq,
    view_count: dto.view_count,
  };
}

export function mapKBArticleAttachmentDto(dto: KBArticleAttachmentDto): KBArticleAttachment {
  return {
    id: dto.id,
    filename: dto.filename,
    mime_type: dto.mime_type,
    size: dto.size,
    date_upload: toIsoDateTimeOrNull(dto.date_upload),
    url: dto.url,
  };
}

export function mapKBArticleDetailDto(dto: KBArticleDetailDto): KBArticleDetail {
  return {
    ...mapKBArticleSummaryDto(dto),
    answer: dto.answer,
    attachments: (dto.attachments || []).map(mapKBArticleAttachmentDto),
  };
}

export function mapKBListResponseDto(dto: KBListResponseDto): KBListResult {
  return {
    total: dto.total,
    categories: dto.categories.map(mapKBCategoryDto),
    articles: dto.articles.map(mapKBArticleSummaryDto),
  };
}

export function mapKBArticleResponseDto(dto: KBArticleResponseDto): KBArticleDetail {
  return mapKBArticleDetailDto(dto.article);
}
