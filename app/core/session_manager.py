"""
GLPI Universal Backend — Session Pool Manager
Gerencia sessões GLPI por instância, reutilizando-as entre requests.
"""

from __future__ import annotations

import logging
import asyncio

from app.config import settings, GLPIInstance
from app.core.glpi_client import GLPIClient
from app.core.context_registry import registry

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Gerencia clientes GLPI com sessões persistentes por contexto.

    Em vez de init/kill a cada operação (3 HTTP calls por operação),
    mantém sessões ativas e as reutiliza.
    """

    def __init__(self) -> None:
        self._clients: dict[str, GLPIClient] = {}
        self._locks: dict[str, asyncio.Lock] = {}

    def _get_lock(self, ctx: str) -> asyncio.Lock:
        if ctx not in self._locks:
            self._locks[ctx] = asyncio.Lock()
        return self._locks[ctx]

    async def get_client(self, context: str) -> GLPIClient:
        """
        Retorna um GLPIClient com sessão ativa para o contexto.
        Usa trava para evitar múltiplas iniciações de sessão simultâneas.
        Sub-contextos (ex: sis-manutencao, sis-memoria) são normalizados para seus parents ('sis').
        """
        ctx = registry.get_base_context(context)
        
        # Validação do registry para ver se o contexto existe lá
        if ctx not in [c.id for c in registry.list_parents()]:
            raise ValueError(f"Contexto base não configurado no ContextRegistry: '{ctx}'")

        lock = self._get_lock(ctx)
        
        async with lock:
            client = self._clients.get(ctx)

            if client and client.is_connected:
                # Otimização: Não faz ping a cada requisição para evitar latência.
                # O glpi_client.py cuidará de re-conectar se houver falha de socket.
                return client

            # Criar novo client e conectar baseado no Registry
            cfg = registry.get(ctx)
            instance = GLPIInstance(
                url=cfg.glpi_url,
                app_token=cfg.glpi_app_token,
                user_token=cfg.glpi_user_token
            )
            client = GLPIClient(instance)
            await client.init_session()
            self._clients[ctx] = client
            logger.info("SessionManager: nova sessão criada para '%s'", ctx)
            return client

    async def close_all(self) -> None:
        """Encerra todas as sessões e clients."""
        for ctx, client in self._clients.items():
            try:
                await client.close()
                logger.info("SessionManager: sessão '%s' encerrada", ctx)
            except Exception as e:
                logger.warning("Erro encerrando sessão '%s': %s", ctx, e)
        self._clients.clear()

    async def health_check(self, context: str) -> dict:
        """Verifica saúde da conexão com o GLPI."""
        try:
            client = await self.get_client(context)
            session_data = await client.get_full_session()
            return {
                "context": context,
                "status": "ok",
                "connected": True,
                "glpi_user": session_data.get("session", {}).get("glpiname", "unknown"),
            }
        except Exception as e:
            return {
                "context": context,
                "status": "error",
                "connected": False,
                "error": str(e),
            }

    @property
    def active_contexts(self) -> list[str]:
        """Lista contextos com sessão ativa."""
        return [ctx for ctx, client in self._clients.items() if client.is_connected]


# Singleton
session_manager = SessionManager()
