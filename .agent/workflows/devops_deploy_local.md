---
description: Como fazer um Deploy Local Seguro e Expor para a Rede Interna
---

# Deploy Local Passo a Passo

Use este workflow para rodar localmente uma aplicação em contêiner Docker e liberar o acesso com segurança pela rede Wi-Fi/local do desenvolvedor.

1. Identifique o IP IPv4 do WSL2 e do Windows Host executando o comando `ipconfig` no prompt.
2. Construa ou atualize o arquivo `docker-compose.yml` utilizando as variáveis e redes padronizados do projeto. Não exponha o banco de dados.
3. Certifique-se que o framework ou o runtime da aplicação no Compose ou no Dockerfile estará rodando as APIs em `0.0.0.0` em vez de `127.0.0.1` (localhost restrito ao contêiner).
4. Suba o container com `docker compose build` e `docker compose up -d`.
5. Valide que o container subiu usando `docker compose ps` e inspecione os logs.
6. Teste do loopback se o container está saudável internamente rodando `docker exec <container_name> curl -s http://localhost:<port>/health`.
7. Configure o Firewall do Windows para as portas Web publicadas usando o script de automação (`.agent/scripts/setup_windows_firewall.ps1`). Execute-o informando a flag `-Port` e `-AppName`.
// turbo
8. Teste ponta-a-ponta acionando a rota pela rede através do endereço local com Curl no powershell: `curl http://127.0.0.1:<port>`.
