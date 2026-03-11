import sys
import unittest
from app.services.auth_service import resolve_hub_roles, HubRole
from app.schemas.auth_schemas import ProfileResponse

class TestE2EPermissionMatrix(unittest.TestCase):
    def test_eixo2_dtic_tecnico(self):
        # Technician (Profile ID 6)
        profs = [ProfileResponse(id=6, name="Technician")]
        roles = resolve_hub_roles("dtic", profs, [])
        self.assertTrue(any(r.role == "tecnico" for r in roles))
        
    def test_eixo2_dtic_fallback(self):
        # Undefined Profile ID 99
        profs = [ProfileResponse(id=99, name="Unknown")]
        roles = resolve_hub_roles("dtic", profs, [])
        self.assertEqual(len(roles), 1)
        self.assertEqual(roles[0].role, "solicitante")

    def test_eixo3_sis_override_manutencao(self):
        # Solicitante + Grupo 22
        profs = [ProfileResponse(id=9, name="Self-Service")]
        roles = resolve_hub_roles("sis", profs, [22])
        # Deve ter adquirido tecnico-manutencao prioritario, com override 'sis-manutencao'
        self.assertTrue(any(r.role == "tecnico-manutencao" for r in roles))
        manut = next(r for r in roles if r.role == "tecnico-manutencao")
        self.assertEqual(manut.context_override, "sis-manutencao")
        
    def test_eixo3_sis_override_memoria(self):
        # Solicitante + Grupo 21
        profs = [ProfileResponse(id=9, name="Self-Service")]
        roles = resolve_hub_roles("sis", profs, [21])
        self.assertTrue(any(r.role == "tecnico-conservacao" for r in roles))
        mem = next(r for r in roles if r.role == "tecnico-conservacao")
        self.assertEqual(mem.context_override, "sis-memoria")

    def test_eixo4_gestor_nao_sobrepoe(self):
        profs = [ProfileResponse(id=4, name="Super-Admin"), ProfileResponse(id=9, name="Self")]
        roles = resolve_hub_roles("dtic", profs, [])
        role_strings = [r.role for r in roles]
        self.assertIn("gestor", role_strings)
        self.assertIn("solicitante", role_strings)

if __name__ == "__main__":
    unittest.main()
