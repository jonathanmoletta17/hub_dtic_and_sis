"""
Router: Health Check
Verifica conectividade com as instâncias GLPI.
"""

from fastapi import APIRouter

from app.core.session_manager import session_manager
from app.core.context_registry import registry

router = APIRouter(tags=["Health"])


@router.get("/health", operation_id="healthCheck")
async def health_check():
    """Verifica saúde de todas as instâncias GLPI registradas."""
    contexts_health = {}
    all_ok = True

    for ctx in registry.list_parents():
        health = await session_manager.health_check(ctx.id)
        contexts_health[ctx.id] = health
        if health["status"] != "ok":
            all_ok = False

    return {
        "status": "healthy" if all_ok else "degraded",
        "instances": contexts_health,
        "active_sessions": session_manager.active_contexts,
    }
