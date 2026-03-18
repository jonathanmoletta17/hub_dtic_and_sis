## Edge Proxy

Esta pasta versiona o roteamento HTTP do ambiente local/containerizado.

Hosts suportados:

- `hub.local` -> frontend em `glpi-tensor-frontend:3000` e API same-origin em `/api/*`
- `carregadores.local` -> alias transitório com redirecionamento permanente para `hub.local`
- `api.hub.local` -> backend direto em `glpi-universal-backend:8080` para smoke test e diagnóstico
- `api.carregadores.local` -> alias transitório com redirecionamento permanente para `api.hub.local`

Entradas mínimas no arquivo `hosts` da máquina local:

```text
127.0.0.1 hub.local
127.0.0.1 api.hub.local
127.0.0.1 carregadores.local
127.0.0.1 api.carregadores.local
```

O Compose monta `nginx.conf` e `conf.d/tensor-aurora.conf` diretamente no container `edge-proxy`.
Qualquer mudança de host, timeout, buffering ou upload deve ser feita aqui, não em estado manual fora do repositório.

## Boundary operacional

Este projeto usa Nginx declarativo dentro do serviço `edge-proxy`.
Referências antigas a Nginx Proxy Manager (NPM) e porta `81` devem ser tratadas como legado, não como arquitetura ativa.

Para evitar falhas intermitentes de bind mount no Docker Desktop, suba o Compose a partir do Linux da WSL:

```powershell
wsl.exe -d Ubuntu --cd /home/jonathan-moletta/projects/tensor-aurora sh -lc "docker compose up -d --build"
```

Evite subir a stack via PowerShell apontando diretamente para `\\wsl.localhost\Ubuntu\...`, porque isso pode quebrar o mount do arquivo `/etc/nginx/nginx.conf` mesmo quando o arquivo do repositório está correto.

## LAN (outras máquinas)

Para clientes remotos, `hub.local` precisa resolver para o IP real do servidor (não `127.0.0.1`):

```text
10.72.16.3 hub.local
10.72.16.3 api.hub.local
10.72.16.3 carregadores.local
10.72.16.3 api.carregadores.local
```

Checklist rápido no servidor:

1. `docker compose ps` com `glpi-backend`, `glpi-frontend` e `edge-proxy` em `healthy`.
2. `curl http://localhost:8080/` deve responder `200`.
3. `Test-NetConnection <IP_DO_SERVIDOR> -Port 8080` deve retornar `TcpTestSucceeded=True`.

Se o item 3 falhar, o gargalo está no host (não no container). Em Windows + Docker Desktop pode ser necessário publicar a porta LAN via `portproxy` com terminal elevado (Administrador):

```powershell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=8080 connectaddress=127.0.0.1 connectport=8080
New-NetFirewallRule -DisplayName "Tensor Aurora LAN 8080" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 8080
```

Se a regra existir e ainda assim `Test-NetConnection <IP_DO_SERVIDOR> -Port 8080` falhar, recrie usando o IP LAN explícito:

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=8080
netsh interface portproxy add v4tov4 listenaddress=<IP_DO_SERVIDOR> listenport=8080 connectaddress=127.0.0.1 connectport=8080
Restart-Service iphlpsvc
```

Fallback operacional (quando `:8080` continua sem listener LAN no host):

```powershell
netsh interface portproxy delete v4tov4 listenaddress=0.0.0.0 listenport=3001
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=127.0.0.1 connectport=8080
New-NetFirewallRule -DisplayName "Tensor Aurora LAN 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
```

Neste modo, clientes LAN acessam `http://hub.local:3001`.

## O que não usar como evidência

1. Regra de firewall com nome `NPM` não significa que NPM esteja ativo.
2. `hub.local` resolvendo para `127.0.0.1` no próprio servidor não prova disponibilidade em rede.
3. Listener em `3001` no Windows não vem do Compose; ele pode vir de `iphlpsvc`/`portproxy`.
