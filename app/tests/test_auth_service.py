"""
Testes: auth_service — Rede de Segurança (Fase 0)

Valida o comportamento correto de:
- resolve_hub_roles(): tradução GLPI → Hub roles
- build_login_response(): parsing dos dados de sessão GLPI

Estes testes DEVEM passar ANTES de qualquer refatoração no auth.
"""
import pytest
from app.schemas.auth_schemas import ProfileResponse, HubRole
from app.services.auth_service import resolve_hub_roles, build_login_response


class TestResolveHubRoles:
    """Testa a tradução de perfis GLPI → papéis do Hub."""

    def test_dtic_tecnico(self):
        """Perfil 6 (Technician) no contexto dtic → role=tecnico."""
        profiles = [ProfileResponse(id=6, name="Technician")]
        groups: list[int] = []
        
        result = resolve_hub_roles("dtic", profiles, groups)
        
        assert len(result) >= 1
        tecnico = next((r for r in result if r.role == "tecnico"), None)
        assert tecnico is not None
        assert tecnico.route == "dashboard"
        assert tecnico.profile_id == 6

    def test_dtic_gestor(self):
        """Perfil 20 (Gestor) no contexto dtic → role=gestor."""
        profiles = [ProfileResponse(id=20, name="Gestor")]
        groups: list[int] = []
        
        result = resolve_hub_roles("dtic", profiles, groups)
        
        gestor = next((r for r in result if r.role == "gestor"), None)
        assert gestor is not None
        assert gestor.route == "dashboard"

    def test_sis_gestor_with_context_override(self):
        """Perfil 3 (Supervisor) no contexto sis → role=gestor, COM context_override."""
        profiles = [ProfileResponse(id=3, name="Supervisor")]
        groups: list[int] = []
        
        result = resolve_hub_roles("sis", profiles, groups)
        
        gestor = next((r for r in result if r.role == "gestor"), None)
        assert gestor is not None
        # CRITICAL: Gestor SIS deve ter context_override ("sis") para não perder contexto (fix Bug F1)
        assert gestor.context_override == "sis"

    def test_sis_grupo_manutencao(self):
        """Grupo 22 no contexto sis → role=tecnico-manutencao, context_override=sis-manutencao."""
        profiles = [ProfileResponse(id=9, name="Self-Service")]
        groups = [22]
        
        result = resolve_hub_roles("sis", profiles, groups)
        
        manut = next((r for r in result if r.role == "tecnico-manutencao"), None)
        assert manut is not None
        assert manut.context_override == "sis-manutencao"
        assert manut.group_id == 22

    def test_sis_grupo_conservacao(self):
        """Grupo 21 no contexto sis → role=tecnico-conservacao, context_override=sis-memoria."""
        profiles = [ProfileResponse(id=9, name="Self-Service")]
        groups = [21]
        
        result = resolve_hub_roles("sis", profiles, groups)
        
        conserv = next((r for r in result if r.role == "tecnico-conservacao"), None)
        assert conserv is not None
        assert conserv.context_override == "sis-memoria"
        assert conserv.group_id == 21

    def test_fallback_solicitante(self):
        """Se nenhum perfil conhecido é encontrado → fallback para solicitante."""
        profiles = [ProfileResponse(id=999, name="Unknown")]
        groups: list[int] = []
        
        result = resolve_hub_roles("dtic", profiles, groups)
        
        assert len(result) >= 1
        assert result[0].role == "solicitante"

    def test_roles_ordering(self):
        """Roles devem ser ordenadas: solicitante → técnicos → gestor."""
        profiles = [
            ProfileResponse(id=9, name="Self-Service"),
            ProfileResponse(id=6, name="Technician"),
            ProfileResponse(id=20, name="Gestor"),
        ]
        groups: list[int] = []
        
        result = resolve_hub_roles("dtic", profiles, groups)
        
        roles = [r.role for r in result]
        assert roles.index("solicitante") < roles.index("tecnico")
        assert roles.index("tecnico") < roles.index("gestor")

    def test_sis_multiple_groups_distinct_roles(self):
        """Ambos os grupos SIS → gera sub-papéis distintos."""
        profiles = [ProfileResponse(id=9, name="Self-Service")]
        groups = [21, 22]
        
        result = resolve_hub_roles("sis", profiles, groups)
        
        role_names = {r.role for r in result}
        assert "tecnico-manutencao" in role_names
        assert "tecnico-conservacao" in role_names


class TestBuildLoginResponse:
    """Testa o parsing dos dados de sessão GLPI."""

    def test_basic_parsing(self):
        """Dados mínimos de sessão → LoginResponse válido."""
        session_info = {
            "glpiID": 42,
            "glpiname": "jonathan.moletta",
            "glpirealname": "Moletta",
            "glpifirstname": "Jonathan",
            "glpiactiveprofile": {"id": 6, "name": "Technician"},
            "glpiprofiles": {
                "6": {"name": "Technician"},
                "9": {"name": "Self-Service"},
            },
            "glpigroups": [],
        }
        
        result = build_login_response("dtic", "test-token", session_info)
        
        assert result.context == "dtic"
        assert result.user_id == 42
        assert result.name == "jonathan.moletta"
        assert result.session_token == "test-token"
        assert len(result.roles.available_profiles) == 2

    def test_glpigroups_as_list_of_ints(self):
        """glpigroups como [22, 21] → groups normalizado."""
        session_info = {
            "glpiID": 1,
            "glpiname": "user",
            "glpiactiveprofile": {"id": 9, "name": "Self-Service"},
            "glpiprofiles": {"9": {"name": "Self-Service"}},
            "glpigroups": [22, 21],
        }
        
        result = build_login_response("sis", "token", session_info)
        
        assert 22 in result.roles.groups
        assert 21 in result.roles.groups

    def test_glpigroups_as_list_of_dicts(self):
        """glpigroups como [{"id": 22}] → groups normalizado."""
        session_info = {
            "glpiID": 1,
            "glpiname": "user",
            "glpiactiveprofile": {"id": 9, "name": "Self-Service"},
            "glpiprofiles": {"9": {"name": "Self-Service"}},
            "glpigroups": [{"id": 22, "name": "CC-MANUTENCAO"}],
        }
        
        result = build_login_response("sis", "token", session_info)
        
        assert 22 in result.roles.groups

    def test_empty_profiles(self):
        """Sem perfis → profile ativo é Self-Service e pelo menos 1 hub_role (fallback)."""
        session_info = {
            "glpiID": 1,
            "glpiname": "user",
            "glpiactiveprofile": {},
            "glpiprofiles": {},
            "glpigroups": [],
        }
        
        result = build_login_response("dtic", "token", session_info)
        
        assert len(result.hub_roles) >= 1
        assert result.hub_roles[0].role == "solicitante"
