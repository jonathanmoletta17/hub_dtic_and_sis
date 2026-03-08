"""
Router: Session Info
Informações sobre a sessão GLPI ativa.
"""

from fastapi import APIRouter, HTTPException, Request

from app.core.session_manager import session_manager
from app.core.rate_limit import limiter

router = APIRouter(prefix="/api/v1/{context}", tags=["Session"])


@router.get("/session")
@limiter.limit("120/minute")
async def get_session_info(request: Request, context: str):
    """Retorna informações da sessão GLPI ativa para o contexto."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        session_data = await client.get_full_session()
        return {
            "context": context,
            "connected": True,
            "session": session_data,
        }
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")


@router.get("/config")
@limiter.limit("120/minute")
async def get_glpi_config(request: Request, context: str):
    """Retorna configuração global do GLPI."""
    try:
        client = await session_manager.get_client(context)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        config_data = await client.get_glpi_config()
        return config_data
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro GLPI: {e}")
