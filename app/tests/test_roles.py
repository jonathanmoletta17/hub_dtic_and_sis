import pytest
from app.services.auth_service import resolve_hub_roles
from app.schemas.auth_schemas import ProfileResponse

def test_resolve_hub_roles_profile_4_gestor():
    # Profile 4 represents the Super-Admin
    available_profiles = [ProfileResponse(id=4, name="Super-Admin")]
    groups = []
    
    # Test for "dtic" context
    roles_dtic = resolve_hub_roles("dtic", available_profiles, groups)
    
    # Needs to at least contain the gestor role
    assert any(r.role == "gestor" for r in roles_dtic), "Profile 4 must be resolved as gestor in 'dtic'"
    
    # Test for "sis" context
    roles_sis = resolve_hub_roles("sis", available_profiles, groups)
    
    assert any(r.role == "gestor" for r in roles_sis), "Profile 4 must be resolved as gestor in 'sis'"

def test_resolve_hub_roles_fallback():
    # If no profile or group matched, user falls back to solicitante
    available_profiles = [ProfileResponse(id=999, name="Unknown Profile")]
    roles = resolve_hub_roles("dtic", available_profiles, [])
    
    assert len(roles) == 1
    assert roles[0].role == "solicitante"
    assert roles[0].route == "user"
