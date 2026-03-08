"""
Router: Health Check
Verifica conectividade com as instâncias GLPI.
"""

from fastapi import APIRouter

from app.core.session_manager import session_manager

router = APIRouter(tags=["Health"])


@router.get("/health", operation_id="healthCheck")
async def health_check():
    """Verifica saúde de todas as instâncias GLPI."""
    dtic = await session_manager.health_check("dtic")
    sis = await session_manager.health_check("sis")

    all_ok = dtic["status"] == "ok" and sis["status"] == "ok"

    return {
        "status": "healthy" if all_ok else "degraded",
        "instances": {
            "dtic": dtic,
            "sis": sis,
        },
        "active_sessions": session_manager.active_contexts,
    }
