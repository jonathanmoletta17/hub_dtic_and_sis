"""
Schemas: Knowledge Base
Modelos Pydantic para a Base de Conhecimento do GLPI.
"""

from pydantic import BaseModel, Field
from typing import Optional


class KBCategory(BaseModel):
    """Categoria da Base de Conhecimento."""
    id: int
    name: str
    completename: str = ""
    level: int = 0
    article_count: int = 0


class KBArticleSummary(BaseModel):
    """Resumo de artigo para listagem (card)."""
    id: int
    name: str
    category: Optional[str] = None
    category_id: Optional[int] = None
    author: Optional[str] = None
    date_creation: Optional[str] = None
    date_mod: Optional[str] = None
    is_faq: bool = False
    view_count: int = 0


class KBArticleDetail(KBArticleSummary):
    """Artigo completo com conteúdo HTML."""
    answer: str = ""


class KBListResponse(BaseModel):
    """Resposta da listagem de artigos."""
    total: int
    categories: list[KBCategory] = []
    articles: list[KBArticleSummary] = []


class KBArticleResponse(BaseModel):
    """Resposta do artigo individual."""
    article: KBArticleDetail


# ─── Write Schemas (CRUD via GLPI REST API) ───

class KBArticleCreate(BaseModel):
    """Payload para criar um artigo da KB."""
    name: str = Field(..., min_length=3, max_length=500, description="Assunto/título do artigo")
    answer: str = Field(..., min_length=1, description="Conteúdo HTML do artigo")
    knowbaseitemcategories_id: Optional[int] = Field(None, description="ID da categoria")
    is_faq: int = Field(0, ge=0, le=1, description="Marcar como FAQ (0 ou 1)")


class KBArticleUpdate(BaseModel):
    """Payload para atualizar um artigo da KB."""
    name: Optional[str] = Field(None, min_length=3, max_length=500)
    answer: Optional[str] = Field(None, min_length=1)
    knowbaseitemcategories_id: Optional[int] = None
    is_faq: Optional[int] = Field(None, ge=0, le=1)
