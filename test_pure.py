import urllib.request
import json
import ssl

context = ssl._create_unverified_context()

def test_tokens():
    url = "http://cau.ppiratini.intra.rs.gov.br/sis/apirest.php"
    app_token = "m6TzlGYMgrbGIkIaOQf2ecWOy8T9ynShT887tRPm"
    user_token = "Rs1pLfsSMnqa5LQ5roph0Ne7xSiZafQdfbXeL3CN"
    
    print("Iniciando Sessao no SIS...")
    req = urllib.request.Request(
        f"{url}/initSession", 
        headers={
            "App-Token": app_token,
            "Authorization": f"user_token {user_token}",
        }
    )
    
    try:
        with urllib.request.urlopen(req, context=context) as response:
            res_data = json.loads(response.read().decode())
            session_token = res_data.get("session_token")
            print("Session iniciada com sucesso! Token:", session_token)
    except Exception as e:
        print("Erro no initSession:", e)
        return
        
    print("\nTestando POST Group_User...")
    post_req = urllib.request.Request(
        f"{url}/Group_User",
        data=json.dumps({"input": {"users_id": 99999, "groups_id": 99999}}).encode('utf-8'),
        headers={
            "App-Token": app_token,
            "Session-Token": session_token,
            "Content-Type": "application/json"
        },
        method="POST"
    )
    
    try:
        with urllib.request.urlopen(post_req, context=context) as response:
            print("POST Status:", response.status)
            print("POST Body:", response.read().decode())
    except urllib.error.HTTPError as e:
        print(f"POST Falhou - StatusCode: {e.code}")
        print("Detalhes:", e.read().decode())
    except Exception as e:
        print("Erro Desconhecido:", e)
        
if __name__ == "__main__":
    test_tokens()
