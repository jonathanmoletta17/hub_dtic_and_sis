"""
Testes de Contrato — tensor-aurora / hub_dtic_and_sis
100% offline — sem imports do app, sem pyyaml.
Usa AST e regex para introspecção estática dos schemas.

Referência: ARCHITECTURE_RULES.md → Contratos Imutáveis
"""

import ast
import re
import pytest
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent.parent  # tensor-aurora/


def _get_fields(filepath: str, class_name: str) -> set:
    source = (BASE / filepath).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.ClassDef) and node.name == class_name:
            return {
                item.target.id for item in node.body
                if isinstance(item, ast.AnnAssign) and isinstance(item.target, ast.Name)
            }
    raise ValueError(f"'{class_name}' não encontrada em {filepath}")


def _get_dict_from_func(filepath: str, func_name: str, var_name: str) -> dict:
    source = (BASE / filepath).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == func_name:
            for child in ast.walk(node):
                if isinstance(child, ast.Assign):
                    for target in child.targets:
                        if isinstance(target, ast.Name) and target.id == var_name:
                            return ast.literal_eval(child.value)
    raise ValueError(f"'{var_name}' não em {func_name}()")


def _get_module_level_dict(filepath: str, var_name: str) -> dict:
    source = (BASE / filepath).read_text(encoding="utf-8")
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == var_name:
                    return ast.literal_eval(node.value)
    raise ValueError(f"'{var_name}' não encontrada em {filepath}")


def _get_yaml_roles(filepath: str) -> set:
    content = (BASE / filepath).read_text(encoding="utf-8")
    return set(re.findall(r'role:\s*([\w-]+)', content))


# ═══ LoginResponse ═══

class TestLoginResponse:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.f = _get_fields("app/schemas/auth_schemas.py", "LoginResponse")

    @pytest.mark.parametrize("campo", ["session_token", "hub_roles", "app_access", "context", "user_id", "roles"])
    def test_campo(self, campo):
        assert campo in self.f, f"CONTRATO QUEBRADO: '{campo}' removido de LoginResponse"


# ═══ AuthMeResponse ═══

class TestAuthMeResponse:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.f = _get_fields("app/schemas/auth_schemas.py", "AuthMeResponse")

    @pytest.mark.parametrize("campo", ["hub_roles", "app_access", "context", "user_id"])
    def test_campo(self, campo):
        assert campo in self.f, f"CONTRATO QUEBRADO: '{campo}' removido de AuthMeResponse"


# ═══ HubRole ═══

class TestHubRole:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.f = _get_fields("app/schemas/auth_schemas.py", "HubRole")

    @pytest.mark.parametrize("campo", ["role", "label", "route", "context_override"])
    def test_campo(self, campo):
        assert campo in self.f, f"CONTRATO QUEBRADO: '{campo}' removido de HubRole"


# ═══ Roles semânticos ═══

class TestRoles:
    VALIDOS = {"gestor", "tecnico", "tecnico-manutencao", "tecnico-conservacao", "solicitante"}

    def test_nenhum_role_desconhecido(self):
        roles = _get_yaml_roles("app/core/contexts.yaml")
        desconhecidos = roles - self.VALIDOS
        assert not desconhecidos, f"NOVO ROLE: {desconhecidos}"


# ═══ Grupos Hub-App ═══

class TestHubAppGroups:
    @pytest.fixture(autouse=True)
    def _load(self):
        self.source = (BASE / "app/routers/admin.py").read_text(encoding="utf-8")
        self.module_item_fields = _get_fields("app/routers/admin.py", "ModuleCatalogItemResponse")
        self.label_overrides = _get_module_level_dict("app/routers/admin.py", "MODULE_LABEL_OVERRIDES")

    @pytest.mark.parametrize("campo", ["group_id", "tag", "group_name", "label"])
    def test_module_catalog_item_response(self, campo):
        assert campo in self.module_item_fields, f"CONTRATO QUEBRADO: '{campo}' removido de ModuleCatalogItemResponse"

    def test_catalogo_dinamico_substitui_whitelist_estatica(self):
        assert "def _build_module_catalog" in self.source
        assert "startswith(\"hub-app-\")" in self.source
        assert "validate_hub_app_group" not in self.source
        assert "allowed_groups" not in self.source

    def test_endpoint_module_catalog_exposto(self):
        assert '@router.get("/module-catalog"' in self.source

    @pytest.mark.parametrize("tag", ["dtic-metrics", "dtic-kpi", "dtic-infra", "sis-dashboard"])
    def test_tags_estrategicas_rotuladas(self, tag):
        assert tag in self.label_overrides, f"CONTRATO QUEBRADO: tag '{tag}' sem label explícito"


# ═══ AdminUserResponse ═══

class TestAdminSchema:
    @pytest.mark.parametrize("campo", ["id", "username", "realname", "firstname", "profiles", "groups", "app_access", "roles"])
    def test_admin_user(self, campo):
        f = _get_fields("app/routers/admin.py", "AdminUserResponse")
        assert campo in f, f"CONTRATO QUEBRADO: '{campo}' removido de AdminUserResponse"

    def test_group_assignment(self):
        f = _get_fields("app/routers/admin.py", "GroupAssignmentRequest")
        assert "group_id" in f

    @pytest.mark.parametrize("campo", ["success", "message", "user_id", "group_id"])
    def test_revoke_group_response(self, campo):
        f = _get_fields("app/routers/admin.py", "RevokeGroupResponse")
        assert campo in f, f"CONTRATO QUEBRADO: '{campo}' removido de RevokeGroupResponse"
