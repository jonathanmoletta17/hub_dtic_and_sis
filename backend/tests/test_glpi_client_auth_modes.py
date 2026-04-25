from __future__ import annotations

import pytest

from app.config import GLPIInstance
from app.core.glpi_client import GLPIClient, GLPIClientError


async def test_glpi_client_blocks_service_session_by_default() -> None:
    client = GLPIClient(
        GLPIInstance(
            url="http://glpi.local/apirest.php",
            app_token="app-token",
            user_token="service-token",
        )
    )

    try:
        with pytest.raises(GLPIClientError, match="Sessao tecnica por user_token desabilitada"):
            await client.init_session()
    finally:
        await client._http.aclose()
