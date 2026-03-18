"""
GLPI Universal Backend â€” Client HTTP Universal
Cliente assÃ­ncrono para a API REST do GLPI com retry automÃ¡tico.
"""

from __future__ import annotations

import json
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
    """Erro genÃ©rico do client GLPI."""

    def __init__(self, message: str, status_code: int | None = None, detail: Any = None):
        super().__init__(message)
        self.status_code = status_code
        self.detail = detail


class GLPIClient:
    """
    Cliente assÃ­ncrono universal para a API REST do GLPI.

    Suporta:
    - init/kill session
    - CRUD genÃ©rico para qualquer ItemType
    - Search com criteria
    - Retry automÃ¡tico com backoff exponencial
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

    def _upload_headers(self) -> dict[str, str]:
        headers = {
            "App-Token": self.instance.app_token,
        }
        if self._session_token:
            headers["Session-Token"] = self._session_token
        return headers

    async def _ensure_http_client(self) -> None:
        """Garante que o cliente HTTP estÃ¡ aberto."""
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
        """Cria client a partir de um session_token existente (sessÃ£o do usuÃ¡rio real)."""
        client = cls(instance)
        client._session_token = session_token
        return client

    async def change_active_profile(self, profile_id: int) -> None:
        """Muda o perfil ativo na sessÃ£o GLPI (ex: Self-Service â†’ Technician)."""
        response = await self._http.post(
            self._url("changeActiveProfile"),
            headers=self._base_headers(),
            json={"profiles_id": profile_id},
        )
        self._check_error(response)
        logger.info("Perfil ativo alterado para profile_id=%d", profile_id)

    async def init_session(self) -> str:
        """Inicia sessÃ£o via user_token (conta de serviÃ§o). Retorna session_token."""
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
            raise GLPIClientError("initSession nÃ£o retornou session_token")

        logger.info("SessÃ£o GLPI iniciada: %s...%s", self._session_token[:8], self._session_token[-4:])
        return self._session_token

    async def init_session_basic(self, username: str, password: str) -> str:
        """Inicia sessÃ£o via Basic Auth (credenciais do usuÃ¡rio real). Retorna session_token."""
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
            raise GLPIClientError("initSession (Basic) nÃ£o retornou session_token")

        logger.info("SessÃ£o GLPI (Basic) iniciada para '%s': %s...%s", username, self._session_token[:8], self._session_token[-4:])
        return self._session_token

    async def kill_session(self) -> bool:
        """Encerra a sessÃ£o ativa."""
        if not self._session_token:
            return True

        try:
            response = await self._http.get(
                self._url("killSession"),
                headers=self._base_headers(),
            )
            self._check_error(response)
            logger.info("SessÃ£o GLPI encerrada")
        except Exception as e:
            logger.warning("Erro ao encerrar sessÃ£o GLPI: %s", e)
        finally:
            self._session_token = None

        return True

    async def _ensure_session(self) -> None:
        """Garante que hÃ¡ sessÃ£o ativa e cliente HTTP aberto."""
        await self._ensure_http_client()
        if not self._session_token:
            await self.init_session()

    # === CRUD GenÃ©rico ===

    @glpi_circuit_breaker
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        retry=retry_if_exception_type(httpx.ConnectError),
        reraise=True,
    )
    async def get_item(self, itemtype: str, item_id: int, **params: Any) -> dict:
        """GET /:itemtype/:id â€” Busca um item por ID."""
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
        """GET /:itemtype â€” Lista itens com paginaÃ§Ã£o."""
        await self._ensure_session()
        headers = self._base_headers()
        
        # O Nginx Proxy Manager Ã s vezes dropa o Header 'Range'. 
        # A API REST do GLPI suporta nativamente o fall-back pelo paramÃ©tico querystring.
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
        """GET /:itemtype/:id/:sub_itemtype â€” Sub-itens de um item."""
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
        """GET /search/:itemtype â€” Busca avanÃ§ada."""
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
        """POST /:itemtype â€” Cria um ou mais itens."""
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
        """PUT /:itemtype/:id â€” Atualiza um item."""
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
        """DELETE /:itemtype/:id â€” Remove um item."""
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
        """GET /getGlpiConfig â€” ConfiguraÃ§Ã£o global do GLPI."""
        await self._ensure_session()
        response = await self._http.get(
            self._url("getGlpiConfig"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    async def get_full_session(self) -> dict:
        """GET /getFullSession â€” Dados completos da sessÃ£o."""
        await self._ensure_session()
        response = await self._http.get(
            self._url("getFullSession"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    async def list_search_options(self, itemtype: str) -> dict:
        """GET /listSearchOptions/:itemtype â€” OpÃ§Ãµes de busca para um itemtype."""
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"listSearchOptions/{itemtype}"),
            headers=self._base_headers(),
        )
        self._check_error(response)
        return response.json()

    async def upload_document(
        self,
        *,
        display_name: str,
        filename: str,
        content: bytes,
        mime_type: str = "application/octet-stream",
    ) -> dict:
        """
        Upload de documento via API GLPI.

        ReferÃªncia GLPI: POST /Document com multipart/form-data e campo uploadManifest.
        """
        await self._ensure_session()

        manifest = {
            "input": {
                "name": display_name,
                "_filename": [filename],
            }
        }
        files = {
            "uploadManifest": (
                None,
                json.dumps(manifest),
                "application/json",
            ),
            "filename[0]": (
                filename,
                content,
                mime_type or "application/octet-stream",
            ),
        }

        response = await self._http.post(
            self._url("Document"),
            headers=self._upload_headers(),
            files=files,
        )
        self._check_error(response)
        return response.json()

    async def link_document_to_item(self, *, itemtype: str, item_id: int, document_id: int) -> dict:
        """
        Vincula um documento a um item via pivot Document_Item.

        Em algumas instancias GLPI, o endpoint /{itemtype}/{id}/Document pode
        responder 200 sem criar a relacao. O uso de Document_Item e mais
        consistente entre versoes.
        """
        payload = {
            "documents_id": document_id,
            "items_id": item_id,
            "itemtype": itemtype,
        }
        return await self.create_item("Document_Item", payload)

    async def download_document(self, document_id: int) -> httpx.Response:
        """
        Download do binÃ¡rio de um documento via API GLPI.

        ReferÃªncia GLPI: GET /Document/{id}?alt=media.
        """
        await self._ensure_session()
        response = await self._http.get(
            self._url(f"Document/{document_id}"),
            headers=self._upload_headers(),
            params={"alt": "media"},
        )
        self._check_error(response)
        return response

    # === Modificadores EspecÃ­ficos (Fase D) ===
    
    async def add_user_to_group(self, user_id: int, group_id: int) -> dict:
        """Adiciona um usuÃ¡rio a um grupo (CriaÃ§Ã£o de Pivot em Group_User)."""
        payload = {
            "users_id": user_id,
            "groups_id": group_id,
            "is_dynamic": 0,
            "is_recursive": 0
        }
        return await self.create_item("Group_User", payload)

    async def remove_user_from_group(self, user_id: int, group_id: int) -> bool:
        """
        Retira um usuÃ¡rio de um grupo.
        No GLPI, vocÃª nÃ£o deleta pelo (user_id, group_id) no endpoint DELETE genÃ©rico,
        precisa do `id` da relaÃ§Ã£o. Faremos lookup via get_sub_items.
        """
        # Obter todas as relaÃ§Ãµes do usuÃ¡rio com grupos
        relations = await self.get_sub_items("User", user_id, "Group_User")
        
        for rel in relations:
            # O get_sub_items retorna um array onde cada item Ã© um pivot com id e groups_id.
            if rel.get("groups_id") == group_id:
                rel_id = rel.get("id")
                if rel_id:
                    # GLPI requer purge para deleÃ§Ã£o de pivot (ou manda pro lixo - depends de setup)
                    await self.delete_item("Group_User", rel_id, force_purge=True)
                    return True
        
        return False

    # === Cleanup ===

    async def close(self) -> None:
        """Encerra sessÃ£o e fecha conexÃ£o HTTP."""
        await self.kill_session()
        await self._http.aclose()

