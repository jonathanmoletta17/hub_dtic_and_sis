"""
Router: Health Check
Verifica saude do runtime sem abrir sessao tecnica no GLPI.
"""

from fastapi import APIRouter

from app.core.context_registry import registry
from app.config import settings

router = APIRouter(tags=["Health"])


def _context_health(context: str) -> dict[str, object]:
    instance = settings.get_glpi_instance(context)
    api_url_configured = bool(instance.url)
    app_token_configured = bool(instance.app_token)
    configured = api_url_configured and app_token_configured
    return {
        "context": context,
        "status": "configured" if configured else "misconfigured",
        "auth_mode": "user_password_session",
        "api_url_configured": api_url_configured,
        "app_token_configured": app_token_configured,
        "service_user_token_required": False,
    }


@router.get("/health", operation_id="healthCheck")
async def health_check():
    """Reporta saude da API sem validar user_token de conta tecnica."""
    contexts_health = {ctx.id: _context_health(ctx.id) for ctx in registry.list_parents()}
    all_configured = all(item["status"] == "configured" for item in contexts_health.values())

    return {
        "status": "healthy" if all_configured else "degraded",
        "api_status": "healthy" if all_configured else "degraded",
        "auth_mode": "user_password_session",
        "service_session_status": "disabled",
        "service_session_reason": "Conta tecnica/user_token nao e requisito operacional do Hub interativo.",
        "instances": contexts_health,
        "active_sessions": [],
        "active_service_sessions": [],
    }
