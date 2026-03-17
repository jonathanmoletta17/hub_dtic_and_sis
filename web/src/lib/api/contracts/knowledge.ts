import type { IsoDateTimeString } from "@/lib/datetime/iso";

export interface KBCategoryDto {
  id: number;
  name: string;
  completename: string;
  level: number;
  article_count: number;
}

export interface KBArticleSummaryDto {
  id: number;
  name: string;
  category: string | null;
  category_id: number | null;
  author: string | null;
  date_creation: IsoDateTimeString | null;
  date_mod: IsoDateTimeString | null;
  is_faq: boolean;
  view_count: number;
}

export interface KBArticleDetailDto extends KBArticleSummaryDto {
  answer: string;
}

export interface KBListResponseDto {
  total: number;
  categories: KBCategoryDto[];
  articles: KBArticleSummaryDto[];
}

export interface KBArticleResponseDto {
  article: KBArticleDetailDto;
}
