"""
GLPI Universal Backend — Client HTTP Universal
Cliente assíncrono para a API REST do GLPI com retry automático.
"""

from __future__ import annotations

import logging
from typing import Any

import httpx
from tenacity import (
    retry,
    stop_after_attempt,
    wait_exponential,
    retry_if_exception_type,
)

from app.config import GLPIInstance
from app.core.circuit_breaker import glpi_circuit_breaker

logger = logging.getLogger(__name__)


class GLPIClientError(Exception):
    """Erro genérico do client GLPI."""

    def __init__(self, message: str, status_code: int | None = None, detail: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


class GLPIClient:
    """
    Cliente assíncrono universal para a API REST do GLPI.

    Suporta:
    - init/kill session
    - CRUD genérico para qualquer ItemType
    - Search com criteria
    - Retry automático com backoff exponencial
    """

    def __init__(self, instance: GLPIInstance, timeout: float = 30.0):
        self.instance = instance
        self._session_token: str | None = None
        self._http = httpx.AsyncClient(timeout=timeout)

    @property
    def is_connected(self) -> bool:
        return self._session_token is not None

    def _base_headers(self) -> dict[str, str]:
        headers = {
            "App-Token": self.instance.app_token,
            "Content-Type": "application/json",
        }
        if self._session_token:
            headers["Session-Token"] = self._session_token
        return headers

    async def _ensure_http_client(self) -> None:
        """Garante que o cliente HTTP está aberto."""
        if self._http.is_closed:
            self._http = httpx.AsyncClient(timeout=self._http.timeout)

    def _url(self, endpoint: str) -> str:
        endpoint = endpoint.lstrip("/")
        return f"{self.instance.url}/{endpoint}"

    def _check_error(self, response: httpx.Response) -> None:
        """Verifica erros na resposta do GLPI."""
        if response.status_code >= 400:
            try:
                body = response.json()
            except Exception:
                body = response.text
            error_msg = body if isinstance(body, str) else body
            raise GLPIClientError(
                message=f"GLPI API error ({response.status_code}): {error_msg}",
                status_code=response.status_code,
                detail=body,
            )

    # === Session Management ===

    @classmethod
    def from_session_token(cls, instance: GLPIInstance, session_token: str) -> "GLPIClient":
        """Cria client a partir de um session_token existente (sessão do usuário real)."""
        client = cls(instance)
        client._session_token = session_token
        return client

    async def change_active_profile(self, profile_id: int) -> None:
        """Muda o perfil ativo na sessão GLPI (ex: Self-Service → Technician)."""
        response = await self._http.post(
            self._url("changeActiveProfile"),
            headers=self._base_headers(),
            json={"profiles_id": profile_id},
        )
        self._check_error(response)
        logger.info("Perfil ativo alterado para profile_id=%d", profile_id)

    async def init_session(self) -> str:
        """Inicia sessão via user_token (conta de serviço). Retorna session_token."""
        headers = self._base_headers()
        headers["Authorization"] = f"user_token {self.instance.user_token}"

        response = await self._http.get(
            self._url("initSession"),
            headers=headers,
        )
        self._check_error(response)

        data = response.json()
        self._session_token = data.get("session_token")
        if not self._session_token:
            raise GLPIClientError("initSession não retornou session_token")

        logger.info("Sessão GLPI iniciada: %s...%s", self._session_token[:8], self._session_token[-4:])
        return self._session_token

    async def init_session_basic(self, username: str, password: str) -> str:
        """Inicia sessão via Basic Auth (credenciais do usuário real). Retorna session_token."""
        import base64
        headers = self._base_headers()
        b64 = base64.b64encode(f"{username}:{password}".encode("utf-8")).decode("utf-8")
        headers["Authorization"] = f"Basic {b64}"

        response = await self._http.get(
            self._url("initSession"),
            headers=headers,
        )
        self._check_error(response)

        data = response.json()
        self._session_token = data.get("session_token")
        if not self._session_token:
            raise GLPIClientError("initSession (Basic) não retornou session_token")

        logger.info("Sessão GLPI (Basic) iniciada para '%s': %s...%s", username, self._session_token[:8], self._session_token[-4:])
        return self._session_token

    async def kill_session(self) -> bool:
        """Encerra a sessão ativa."""
        if not self._session_token:
            return True

        try:
            response = await self._http.get(
                self._url("killSession"),
                headers=self._base_headers(),
            )
            self._check_error(response)
            logger.info("Sessão GLPI encerrada")
        except Exception as e:
            logger.warning("Erro ao encerrar sessão GLPI: %s", e)
        finally:
            self._session_token = None

        return True

    async def _ensure_session(self) -> None:
        """Garante que há sessão ativa e cliente HTTP aberto."""
        await self._ensure_http_client()
        if not self._session_token:
            await self.init_session()

    # === CRUD Genérico ===

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def get_item(self, itemtype: str, item_id: int, **params: Any) -> dict:
        """GET /:itemtype/:id — Busca um item por ID."""
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"{itemtype}/{item_id}"),
            headers=self._base_headers(),
            params=params or None,
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def get_all_items(
        self,
        itemtype: str,
        range_start: int = 0,
        range_end: int = 49,
        **params: Any,
    ) -> list[dict]:
        """GET /:itemtype — Lista itens com paginação."""
        await self._ensure_session()
        headers = self._base_headers()
        
        # O Nginx Proxy Manager às vezes dropa o Header 'Range'. 
        # A API REST do GLPI suporta nativamente o fall-back pelo paramético querystring.
        if params is None:
            params = {}
        params["range"] = f"{range_start}-{range_end}"

        response = await self._http.get(
            self._url(itemtype),
            headers=headers,
            params=params,
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def get_sub_items(
        self,
        itemtype: str,
        item_id: int,
        sub_itemtype: str,
        **params: Any,
    ) -> list[dict]:
        """GET /:itemtype/:id/:sub_itemtype — Sub-itens de um item."""
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"{itemtype}/{item_id}/{sub_itemtype}"),
            headers=self._base_headers(),
            params=params or None,
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def search_items(self, itemtype: str, **params: Any) -> dict:
        """GET /search/:itemtype — Busca avançada."""
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"search/{itemtype}"),
            headers=self._base_headers(),
            params=params or None,
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def create_item(self, itemtype: str, payload: dict) -> dict:
        """POST /:itemtype — Cria um ou mais itens."""
        await self._ensure_session()
        response = await self._http.post(
            self._url(itemtype),
            headers=self._base_headers(),
            json={"input": payload},
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def update_item(self, itemtype: str, item_id: int, payload: dict) -> dict:
        """PUT /:itemtype/:id — Atualiza um item."""
        await self._ensure_session()
        response = await self._http.put(
            self._url(f"{itemtype}/{item_id}"),
            headers=self._base_headers(),
            json={"input": payload},
        )
        self._check_error(response)
        return response.json()

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def delete_item(
        self,
        itemtype: str,
        item_id: int,
        force_purge: bool = False,
    ) -> dict:
        """DELETE /:itemtype/:id — Remove um item."""
        await self._ensure_session()
        params = {}
        if force_purge:
            params["force_purge"] = "true"

        response = await self._http.delete(
            self._url(f"{itemtype}/{item_id}"),
            headers=self._base_headers(),
            params=params or None,
        )
        self._check_error(response)
        return response.json()

    async def get_glpi_config(self) -> dict:
        """GET /getGlpiConfig — Configuração global do GLPI."""
        await self._ensure_session()
        response = await self._http.get(
            self._url("getGlpiConfig"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    async def get_full_session(self) -> dict:
        """GET /getFullSession — Dados completos da sessão."""
        await self._ensure_session()
        response = await self._http.get(
            self._url("getFullSession"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    async def list_search_options(self, itemtype: str) -> dict:
        """GET /listSearchOptions/:itemtype — Opções de busca para um itemtype."""
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"listSearchOptions/{itemtype}"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    # === Modificadores Específicos (Fase D) ===
    
    async def add_user_to_group(self, user_id: int, group_id: int) -> dict:
        """Adiciona um usuário a um grupo (Criação de Pivot em Group_User)."""
        payload = {
            "users_id": user_id,
            "groups_id": group_id,
            "is_dynamic": 0,
            "is_recursive": 0
        }
        return await self.create_item("Group_User", payload)

    async def remove_user_from_group(self, user_id: int, group_id: int) -> bool:
        """
        Retira um usuário de um grupo.
        No GLPI, você não deleta pelo (user_id, group_id) no endpoint DELETE genérico,
        precisa do `id` da relação. Faremos lookup via get_sub_items.
        """
        # Obter todas as relações do usuário com grupos
        relations = await self.get_sub_items("User", user_id, "Group_User")
        
        for rel in relations:
            # O get_sub_items retorna um array onde cada item é um pivot com id e groups_id.
            if rel.get("groups_id") == group_id:
                rel_id = rel.get("id")
                if rel_id:
                    # GLPI requer purge para deleção de pivot (ou manda pro lixo - depends de setup)
                    await self.delete_item("Group_User", rel_id, force_purge=True)
                    return True
        
        return False

    # === Cleanup ===

    async def close(self) -> None:
        """Encerra sessão e fecha conexão HTTP."""
        await self.kill_session()
        await self._http.aclose()
