"""
Schemas: Knowledge Base
Pydantic models for GLPI Knowledge Base.
"""

from typing import Optional

from pydantic import BaseModel, Field

from app.core.datetime_contract import AwareDateTime


class KBCategory(BaseModel):
    """Knowledge Base category."""

    id: int
    name: str
    completename: str = ""
    level: int = 0
    article_count: int = 0


class KBArticleSummary(BaseModel):
    """Article summary used in list views."""

    id: int
    name: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    author: Optional[str] = None
    date_creation: Optional[AwareDateTime] = None
    date_mod: Optional[AwareDateTime] = None
    is_faq: bool = False
    view_count: int = 0


class KBArticleAttachment(BaseModel):
    """Attachment metadata linked to an article."""

    id: int
    filename: str
    mime_type: str = "application/octet-stream"
    size: Optional[int] = None
    date_upload: Optional[AwareDateTime] = None
    url: str


class KBArticleDetail(KBArticleSummary):
    """Full article payload including HTML content and attachments."""

    answer: str = ""
    attachments: list[KBArticleAttachment] = []


class KBListResponse(BaseModel):
    """Knowledge Base list response."""

    total: int
    categories: list[KBCategory] = []
    articles: list[KBArticleSummary] = []


class KBCategoriesResponse(BaseModel):
    """Categories-only response."""

    categories: list[KBCategory] = []


class KBArticleResponse(BaseModel):
    """Single article response wrapper."""

    article: KBArticleDetail


class KBArticleCreate(BaseModel):
    """Payload to create a KB article."""

    name: str = Field(..., min_length=3, max_length=500, description="Article title")
    answer: str = Field(..., min_length=1, description="Article HTML content")
    knowbaseitemcategories_id: Optional[int] = Field(None, description="Category id")
    is_faq: int = Field(0, ge=0, le=1, description="Mark as FAQ (0 or 1)")


class KBArticleUpdate(BaseModel):
    """Payload to update a KB article."""

    name: Optional[str] = Field(None, min_length=3, max_length=500)
    answer: Optional[str] = Field(None, min_length=1)
    knowbaseitemcategories_id: Optional[int] = None
    is_faq: Optional[int] = Field(None, ge=0, le=1)
