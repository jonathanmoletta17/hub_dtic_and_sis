# Disponibilidade em Rede - Diagnóstico Consolidado

## Objetivo

Para o quadro completo de inconsistências remanescentes, incluindo realtime/SSE, drift documental e decisões operacionais, use em conjunto:

- [inconsistency-root-cause-map.md](/home/jonathan-moletta/projects/tensor-aurora/docs/inconsistency-root-cause-map.md)

Consolidar, em um único documento, a arquitetura de exposição em rede do Tensor Aurora, as causas reais das dificuldades encontradas, a evidência técnica coletada e o procedimento operacional correto para subir, validar e diagnosticar o ambiente sem mudanças aleatórias.

Este documento passa a ser a referência principal para disponibilidade em rede.

## Resumo Executivo

O runtime canônico atual do projeto não depende de Nginx Proxy Manager (NPM) na porta `81`.
O runtime canônico atual é:

1. `glpi-universal-backend` em Docker, exposto apenas internamente.
2. `glpi-tensor-frontend` em Docker, exposto apenas internamente.
3. `tensor-aurora-edge-proxy` em Docker, usando Nginx declarativo versionado no repositório e publicando `8080`.

Validação externa executada em 2026-03-18, a partir da máquina cliente `10.72.16.214`:

1. `http://10.72.16.3:8080/` respondeu `200`.
2. `http://10.72.16.3:3001/` respondeu `200`.
3. Após mapear `hub.local` para `10.72.16.3` no `hosts` da cliente, `http://hub.local:3001/` respondeu `200`.
4. `http://api.hub.local:8080/health` respondeu `200`.
5. O Edge headless na máquina cliente carregou o HTML real da aplicação.

Conclusão: a aplicação está acessível por outra máquina da mesma rede quando a camada de nome e a camada de publicação no host estão corretas.

## Arquitetura Canônica Atual

### Stack ativa

Serviços em execução validados:

1. `glpi-universal-backend`
2. `glpi-tensor-frontend`
3. `tensor-aurora-edge-proxy`

Fonte de verdade:

- [docker-compose.yml](/home/jonathan-moletta/projects/tensor-aurora/docker-compose.yml)
- [tensor-aurora.conf](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/conf.d/tensor-aurora.conf)

### Contrato de entrada

1. Web canônica: `http://hub.local:8080`
2. API para diagnóstico: `http://api.hub.local:8080`
3. Alias legados: `carregadores.local` e `api.carregadores.local`
4. Fallback host-level: `http://hub.local:3001`

### Fluxo real

1. Cliente acessa `hub.local:8080`.
2. `edge-proxy` recebe a requisição.
3. `/` segue para `glpi-tensor-frontend:3000`.
4. `/api/*` segue para `glpi-universal-backend:8080`.
5. O browser permanece same-origin.

## O Que Nao Esta Em Uso Como Arquitetura Canônica

### NPM na porta 81

Nao existe listener ativo na porta `81` da maquina host para este projeto.

Validação:

1. `Test-NetConnection 127.0.0.1 -Port 81` retornou `False`.
2. O `docker ps` da stack atual nao mostra container NPM.
3. O Compose atual publica apenas `8080`.

### Porta 8081

A porta `8081` existe no host, mas pertence a processo externo ao projeto (`macmnsvc`). Ela nao faz parte da topologia do Tensor Aurora.

### Regras de firewall com nome "NPM"

Existem regras legadas como `Docker - NPM Admin (81)` e `Docker - NPM HTTP (8080)`, mas isso nao prova uso atual de NPM. Sao residuos operacionais do host Windows e precisam ser lidos como legado, nao como arquitetura ativa.

## Por Que Foi Tao Dificil Identificar e Validar o Problema

As dificuldades nao vieram de um único defeito. Vieram da sobreposição de varias camadas com sinais contraditórios.

### 1. Documentação histórica e runtime atual divergiam

Parte do repositório ainda citava Nginx Proxy Manager e porta `81`, enquanto a stack ativa já estava em `edge-proxy` declarativo no próprio projeto.

Isso gerava leituras conflitantes:

1. alguns arquivos falavam em NPM;
2. o host tinha regras de firewall com nome NPM;
3. a stack real nao tinha NPM ativo.

Resultado: investigação começava na camada errada.

### 2. O host Windows tinha listeners que nao vinham do Compose

As portas `80`, `3001` e `8510` estavam sendo servidas por `iphlpsvc` via `netsh interface portproxy`, nao pelo `docker-compose`.

Resultado:

1. uma porta podia responder mesmo sem existir no Compose;
2. o operador podia atribuir ao container um listener que, na verdade, vinha do host;
3. testes locais isolados pareciam "provar" que o Compose estava expondo algo que era, na verdade, portproxy.

### 3. O servidor resolvia `hub.local` para `127.0.0.1`

O `hosts` do servidor tinha:

```text
127.0.0.1 hub.local
127.0.0.1 api.hub.local
127.0.0.1 carregadores.local
127.0.0.1 api.carregadores.local
```

Isso é útil para teste local no próprio servidor, mas é um falso positivo para disponibilidade em rede.

Resultado:

1. `curl http://hub.local:8080/` no servidor podia responder `200`;
2. o cliente remoto ainda falhava porque `hub.local` nao existia no DNS corporativo.

### 4. `.local` nao estava publicado no DNS da rede

Validação executada:

1. `nslookup hub.local` retornou `NXDOMAIN`.
2. a máquina cliente nao resolvia `hub.local` até receber entrada no `hosts`.

Resultado:

1. a aplicação podia estar no ar;
2. o usuário remoto ainda recebia erro de resolução de nome;
3. sem separar DNS de HTTP, isso parecia falha geral do sistema.

### 5. O caminho de execução do Compose no Windows era frágil

Foi identificado um erro de rebuild do `edge-proxy`:

```text
error mounting ... /etc/nginx/nginx.conf ... not a directory
```

Causa real:

1. o `docker compose` estava sendo executado a partir do Windows em um caminho `\\wsl.localhost\Ubuntu\...`;
2. o bind mount de [nginx.conf](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/nginx.conf) era traduzido pelo Docker Desktop como mount UNC/WSL;
3. essa ponte UNC -> bind mount -> container se mostrou intermitente.

Resultado:

1. o arquivo no repositório estava correto;
2. o `nginx -t` dentro do container estava correto quando o container conseguia subir;
3. o rebuild falhava por contexto de montagem, nao por sintaxe do Nginx.

### 6. Teste local e teste remoto medem coisas diferentes

`localhost`, `hub.local` no próprio servidor, `10.72.16.3` no servidor e `hub.local` numa máquina cliente sao quatro cenários diferentes.

Se eles nao forem validados separadamente, o operador mistura:

1. saúde do container;
2. bind local;
3. reachability LAN;
4. resolução de nome no cliente.

### 7. O host executa múltiplas stacks simultâneas

No momento do diagnóstico, `docker ps` mostrava diversos projetos ativos além do Tensor Aurora.

Resultado:

1. aumenta ruído operacional durante incidentes;
2. facilita atribuição incorreta de listener/porta ao projeto errado;
3. reforça a necessidade de validar `com.docker.compose.project=tensor-aurora` antes de concluir causa raiz.

## Evidências Coletadas

### Runtime e listeners

1. `docker ps` mostrou `tensor-aurora-edge-proxy` publicando `0.0.0.0:8080->8080/tcp`.
2. `netstat -ano` mostrou listener ativo em `3001`, `80` e `8510` pertencendo a `svchost/iphlpsvc`.
3. `Test-NetConnection 127.0.0.1 -Port 81` falhou.
4. `Test-NetConnection 127.0.0.1 -Port 8081` respondeu, mas vinculado a `macmnsvc`.

### Portproxy

Validação observada:

```text
0.0.0.0:8510 -> 127.0.0.1:8510
0.0.0.0:80   -> 127.0.0.1:80
10.72.16.3:8080 -> 127.0.0.1:8080
0.0.0.0:3001 -> 127.0.0.1:8080
```

Isso confirma que a camada host tinha publicação paralela fora do Compose.

### Validação a partir da máquina cliente 10.72.16.214

Validações executadas remotamente por `OpenSSH` (plink):

1. `Test-NetConnection 10.72.16.3 -Port 3001` retornou `True`.
2. `Invoke-WebRequest http://10.72.16.3:3001/` retornou `200`.
3. `Invoke-WebRequest http://10.72.16.3:8080/` retornou `200`.
4. após mapear `hub.local` no `hosts` da cliente, `Invoke-WebRequest http://hub.local:3001/` retornou `200`.
5. `Invoke-WebRequest http://api.hub.local:8080/health` retornou `200`.

### Validação por navegador na máquina cliente

O Edge headless na `10.72.16.214` conseguiu carregar o DOM da aplicação.

Isso elimina a hipótese de "responde só no curl, mas nao no navegador".

## Solução Ponta a Ponta

### 1. Subida correta da stack

Subir o Compose sempre a partir do Linux da WSL, nao pelo caminho UNC da WSL no PowerShell.

Comando canônico:

```powershell
wsl.exe -d Ubuntu --cd /home/jonathan-moletta/projects/tensor-aurora sh -lc "docker compose up -d --build"
```

Razão:

1. evita a fragilidade do bind mount `\\wsl.localhost\...`;
2. reduz o risco do erro `not a directory` no `edge-proxy`;
3. mantém os mounts no mesmo modelo de filesystem do runtime Linux.

### 2. Gate 1: saúde da stack

```powershell
wsl.exe -d Ubuntu --cd /home/jonathan-moletta/projects/tensor-aurora sh -lc "docker compose ps"
```

Pass criteria:

1. `glpi-universal-backend` saudável;
2. `glpi-tensor-frontend` saudável;
3. `tensor-aurora-edge-proxy` saudável.

### 3. Gate 2: HTTP local no servidor

```powershell
curl.exe -s -o NUL -w "code:%{http_code}`n" http://hub.local:8080/
curl.exe -s -o NUL -w "code:%{http_code}`n" http://10.72.16.3:3001/
```

Pass criteria:

1. `200` em `hub.local:8080`;
2. `200` em `10.72.16.3:3001` (fallback host-level).

Observação:

1. `localhost:8080` pode falhar no host mesmo com `hub.local:8080` e clientes LAN funcionando; trate como sinal secundário, não como gate absoluto.

Isso valida stack local, nao LAN.

### 4. Gate 3: reachability LAN pelo IP do servidor

```powershell
Test-NetConnection -ComputerName 10.72.16.3 -Port 8080
```

Se `8080` falhar no host, publicar fallback host-level:

```powershell
netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=3001 connectaddress=127.0.0.1 connectport=8080
New-NetFirewallRule -DisplayName "Tensor Aurora LAN 3001" -Direction Inbound -Action Allow -Protocol TCP -LocalPort 3001
```

E validar:

```powershell
Test-NetConnection -ComputerName 10.72.16.3 -Port 3001
curl.exe --noproxy "*" -s -o NUL -w "code:%{http_code}`n" http://10.72.16.3:3001/
```

### 5. Gate 4: resolução de nome na máquina cliente

Enquanto nao houver DNS interno para `hub.local`, o cliente precisa de `hosts`:

```text
10.72.16.3 hub.local
10.72.16.3 api.hub.local
10.72.16.3 carregadores.local
10.72.16.3 api.carregadores.local
```

Depois:

```powershell
ipconfig /flushdns
Resolve-DnsName hub.local
Invoke-WebRequest http://hub.local:3001/ -UseBasicParsing
Invoke-WebRequest http://api.hub.local:8080/health -UseBasicParsing
```

### 6. Gate 5: validação externa real

Executar a partir de uma máquina da rede:

1. teste por IP;
2. teste por hostname;
3. teste por navegador;
4. teste de login e navegação principal.

Sem esse gate, nao existe evidência de disponibilidade LAN.

## Regras Operacionais Para Evitar Regressão

1. Nao inferir arquitetura atual a partir de regra de firewall antiga.
2. Nao inferir arquitetura atual a partir de documento histórico.
3. Nao usar porta `81` como evidência de runtime do projeto.
4. Nao tratar `3001` como porta canônica do app. Ela é fallback host-level.
5. Nao usar sucesso em `hub.local` no próprio servidor como prova de DNS da rede.
6. Nao alterar código de aplicação se `localhost` responde, mas o cliente remoto nao. Primeiro validar nome e host networking.
7. Nao subir Compose do Tensor Aurora pelo caminho `\\wsl.localhost\...`.

## Procedimento de Diagnóstico Definitivo

### Quando a aplicação "nao abre em outra máquina"

Executar, nesta ordem:

1. `docker compose ps`
2. `curl http://localhost:8080/`
3. `Test-NetConnection 10.72.16.3 -Port 8080`
4. se falhar, `Test-NetConnection 10.72.16.3 -Port 3001`
5. no cliente: `Resolve-DnsName hub.local`
6. no cliente: `Invoke-WebRequest http://10.72.16.3:3001/`
7. no cliente: `Invoke-WebRequest http://hub.local:3001/`

Interpretação:

1. falha no passo 1 ou 2 => problema de stack local;
2. falha no passo 3 com passo 2 ok => problema de host networking;
3. passo 6 ok e passo 7 falha => problema de nome;
4. passo 7 ok e navegador falha => problema de política/cookie/browser.

### Quando o rebuild falhar no edge-proxy

Pergunta principal:

"O Compose foi executado no Linux da WSL ou pelo caminho UNC no Windows?"

Se foi pelo UNC:

1. pare o diagnóstico de Nginx;
2. suba novamente a stack a partir do Linux da WSL;
3. só volte a investigar `nginx.conf` se o erro persistir no Linux.

## Fontes de Verdade

Para evitar ambiguidade futura, use estes arquivos como referência primária:

1. [docker-compose.yml](/home/jonathan-moletta/projects/tensor-aurora/docker-compose.yml)
2. [tensor-aurora.conf](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/conf.d/tensor-aurora.conf)
3. [README.md](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/README.md)
4. [configuration-matrix.md](/home/jonathan-moletta/projects/tensor-aurora/docs/configuration-matrix.md)
5. [lan-root-cause-playbook.md](/home/jonathan-moletta/projects/tensor-aurora/docs/lan-root-cause-playbook.md)

Documentos que mencionam NPM devem ser lidos como histórico, nao como fonte operacional atual, a menos que a stack em execução tenha sido explicitamente alterada para isso.
