import asyncio
from app.config import settings
from app.core.glpi_client import GLPIClient

async def test_sis_service_account():
    instance = settings.get_glpi_instance("sis")
    client = GLPIClient(instance)
    
    print(f"URL: {instance.url}")
    print(f"App-Token: {instance.app_token[:5]}...")
    print(f"User-Token: {instance.user_token[:5]}...")
    
    try:
        await client.init_session()
        print("Sessao OK!")
        
        # Tentar listar usuários
        res = await client._http.get(
            client._url("User"),
            headers=client._base_headers(),
            params={"range": "0-1"}
        )
        print("GET User statusCode:", res.status_code)
        
        # Testar acesso a Group_User
        res_post = await client._http.post(
            client._url("Group_User"),
            headers=client._base_headers(),
            json={"input": {"users_id": 9999999, "groups_id": 9999999}}
        )
        print("POST Group_User statusCode:", res_post.status_code)
        try:
            print(res_post.json())
        except Exception:
            print(res_post.text)
            
    except Exception as e:
        print("EXCECAO:", str(e))
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_sis_service_account())
