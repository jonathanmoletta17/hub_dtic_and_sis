from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.services import auth_service


class UserScopedClient:
    async def get_sub_items(self, itemtype: str, item_id: int, sub_itemtype: str):
        assert (itemtype, item_id, sub_itemtype) == ("User", 123, "Group_User")
        return [{"groups_id": 10}, {"groups_id": 11}, {"groups_id": 12}]

    async def get_item(self, itemtype: str, item_id: int, **params):
        assert itemtype == "Group"
        names = {
            10: "Hub-App-Carregadores",
            11: "Equipe Operacional",
            12: "Hub-App-Permissoes",
        }
        return {"id": item_id, "name": names[item_id]}


@pytest.mark.asyncio
async def test_resolve_app_access_uses_user_scoped_client_only() -> None:
    access = await auth_service.resolve_app_access("sis", UserScopedClient(), 123)

    assert access == ["carregadores", "permissoes"]


@pytest.mark.asyncio
async def test_fetch_session_identity_requires_user_session_token() -> None:
    with pytest.raises(HTTPException) as exc_info:
        await auth_service.fetch_session_identity("sis")

    assert exc_info.value.status_code == 401
