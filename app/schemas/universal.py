"""
Schemas Universais — Modelos Pydantic Genéricos
Zero acoplamento com domínio específico. O Frontend define a estrutura.
"""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ─── Orchestrator (Composição Multi-Step) ────────────────────────────────

class OrchestrationStep(BaseModel):
    """Um passo atômico na sequência de orquestração."""
    action: Literal["create", "update", "delete"] = Field(
        ..., description="Operação CRUD a executar via GLPI API"
    )
    itemtype: str = Field(
        ..., description="ItemType GLPI (Ticket, Ticket_User, Group_Ticket, Item_Ticket, ITILSolution...)"
    )
    input: dict[str, Any] = Field(
        default_factory=dict,
        description="Payload livre. Valores com '$ref:step_ref.field' são resolvidos dinamicamente."
    )
    item_id: Optional[int] = Field(
        None, description="ID do item (obrigatório para update/delete)"
    )
    ref: Optional[str] = Field(
        None, description="Nome de referência deste step para uso em steps posteriores ($ref:nome.campo)"
    )
    force_purge: bool = Field(
        False, description="Para delete: purge definitivo"
    )


class OrchestrationCommand(BaseModel):
    """Comando de orquestração: sequência ordenada de steps executados atomicamente."""
    steps: list[OrchestrationStep] = Field(
        ..., min_length=1, max_length=20,
        description="Lista ordenada de operações. Máximo 20 steps por requisição."
    )


class OrchestrationStepResult(BaseModel):
    """Resultado individual de um step."""
    step_index: int
    ref: Optional[str] = None
    status: Literal["success", "error"]
    result: Any = None
    error: Optional[str] = None


class OrchestrationResult(BaseModel):
    """Resultado completo da orquestração."""
    context: str
    total_steps: int
    completed: int
    failed: int
    results: list[OrchestrationStepResult]


# ─── DB Read Engine (CQRS Dinâmico) ─────────────────────────────────────

class AggregateRequest(BaseModel):
    """Parâmetros para agregação SQL dinâmica."""
    table: str = Field(..., description="Tabela GLPI (deve estar na whitelist)")
    group_by: str = Field(..., description="Coluna para agrupar (status, priority, locations_id...)")
    agg_function: Literal["count", "sum", "avg"] = Field(
        "count", description="Função de agregação"
    )
    agg_column: str = Field("id", description="Coluna alvo da agregação")
    filters: dict[str, Any] = Field(
        default_factory=dict,
        description="Filtros chave:valor (is_deleted:0, status:[2,3,4])"
    )
    date_field: Optional[str] = Field(None, description="Coluna de data para filtro temporal")
    date_from: Optional[str] = Field(None, description="Data início (YYYY-MM-DD)")
    date_to: Optional[str] = Field(None, description="Data fim (YYYY-MM-DD)")


class DBQueryRequest(BaseModel):
    """Parâmetros para query SQL parametrizada com JOINs opcionais."""
    table: str = Field(..., description="Tabela principal")
    columns: list[str] = Field(
        default=["*"], description="Colunas a retornar"
    )
    joins: list[dict[str, str]] = Field(
        default_factory=list,
        description="JOINs: [{table, on, type(inner|left)}]"
    )
    filters: dict[str, Any] = Field(
        default_factory=dict, description="WHERE: chave:valor ou chave:[lista]"
    )
    group_by: Optional[str] = Field(None, description="GROUP BY coluna")
    order_by: Optional[str] = Field(None, description="ORDER BY coluna ASC|DESC")
    limit: int = Field(100, ge=1, le=1000, description="Limite de resultados")
