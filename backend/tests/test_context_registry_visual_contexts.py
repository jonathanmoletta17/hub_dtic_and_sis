from __future__ import annotations

from app.core.context_registry import registry
from app.schemas.auth_schemas import ProfileResponse
from app.services.auth_service import resolve_hub_roles


def test_sis_conservacao_is_registered_as_sis_child() -> None:
    context = registry.get("sis-conservacao")

    assert context.parent == "sis"
    assert context.group_ids == [21]
    assert registry.get_base_context("sis-conservacao") == "sis"


def test_tecnico_conservacao_group_routes_to_canonical_visual_context() -> None:
    roles = resolve_hub_roles(
        "sis",
        [ProfileResponse(id=9, name="Portfolio de Chamados")],
        [21],
    )

    conservacao = next(role for role in roles if role.role == "tecnico-conservacao")
    assert conservacao.group_id == 21
    assert conservacao.context_override == "sis-conservacao"


def test_health_parent_contexts_remain_root_instances_only() -> None:
    parent_ids = [context.id for context in registry.list_parents()]

    assert parent_ids == ["dtic", "sis"]
