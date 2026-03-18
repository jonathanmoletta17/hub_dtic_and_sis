# Mapa de Causa Raiz das Inconsistências Remanescentes

## Objetivo

Consolidar, em um único documento, as inconsistências que ainda existem no Tensor Aurora, os motivos que tornaram o diagnóstico difícil, as decisões já tomadas, a evidência coletada e a solução limpa recomendada para cada eixo.

Este documento cobre dois domínios que se cruzam o tempo todo e por isso acabaram sendo confundidos em incidentes anteriores:

1. disponibilidade em rede;
2. consistência de atualização em tempo real.

Inventário detalhado das superfícies consumidoras:

- [data-consumption-inventory-matrix.md](/home/jonathan-moletta/projects/tensor-aurora/docs/data-consumption-inventory-matrix.md)

## Estado Atual Verificado

### O que está comprovadamente funcionando

1. A stack canônica atual sobe com `glpi-universal-backend`, `glpi-tensor-frontend` e `tensor-aurora-edge-proxy`.
2. O runtime ativo publica `8080` via `edge-proxy`, não via Nginx Proxy Manager.
3. A aplicação responde de outra máquina da rede quando a camada de nome está correta.
4. O frontend já tem um modelo anti-flicker razoável nas telas críticas, com separação entre `loading` inicial e `refreshing` em background.
5. O frontend já possui barramento unificado de atualização (`liveDataBus`) e `polling` de fallback por domínio.

### O que segue inconsistente

1. O erro estrutural de schema no SSE foi mitigado no backend atual, mas o contrato do evento segue frágil por inferência textual no frontend e ausência de `domain/action` explícitos.
2. O nome `hub.local` continua dependendo de `hosts` por máquina ou DNS corporativo; ele não é resolvido automaticamente na rede.
3. O host Windows continua podendo gerar falso negativo ao testar o próprio IP LAN na `8080`, mesmo quando um cliente remoto recebe `200`.
4. O rebuild do `edge-proxy` via caminho UNC da WSL permanece um risco operacional intermitente.
5. Ainda existem documentos históricos citando NPM/porta `81`, embora agora estejam sinalizados como legado.
6. Há superfícies consumidoras de dados sem refresh unificado, principalmente catálogo/esquema do FormCreator durante abertura de chamado e busca com termo ativo.
7. Identidade, `hub_roles` e `app_access` ficam congelados a partir do login/cache no frontend e não são revalidados com `/auth/me` ao longo da sessão.
8. A tela de perfil do usuário exibe dados hardcoded e não representa o estado real do sistema.
9. O endpoint `GET /lookups/manufacturers` ainda pode retornar `500` por `name = null`, gerando erro de validação de resposta.

## Fatos Comprovados

### Topologia ativa

Fonte de verdade:

1. `docker-compose.yml`
2. `infra/nginx/conf.d/tensor-aurora.conf`

Contrato atual:

1. `hub.local:8080` -> frontend por `edge-proxy`
2. `api.hub.local:8080` -> backend por `edge-proxy`
3. `hub.local:3001` -> fallback host-level via `portproxy`
4. `81` -> não faz parte do runtime atual

### Prova externa em cliente real

Validação repetida a partir da máquina `10.72.16.214`:

1. `http://10.72.16.3:8080/` respondeu `200`
2. `http://10.72.16.3:3001/` respondeu `200`
3. `http://hub.local:8080/` respondeu `200` após mapeamento no `hosts`
4. `http://hub.local:3001/` respondeu `200`
5. `http://api.hub.local:8080/health` respondeu `200`
6. o Edge headless carregou o DOM real da página de login
7. `nslookup hub.local` continuou retornando `NXDOMAIN` (confirma dependência de `hosts` quando DNS corporativo não publica o nome)

Conclusão objetiva: a aplicação está acessível em outra máquina da LAN. O principal problema remanescente não é "a aplicação não abre", e sim a mistura de nome, publicação local do host e mecanismo de atualização.

### Comportamento local do host

No próprio servidor Windows:

1. `localhost:8080` funciona
2. `10.72.16.3:8080` falha no `Test-NetConnection`
3. `10.72.16.3:3001` pode responder ao teste TCP e ainda assim o `curl` local ser inconsistente
4. um cliente remoto continua recebendo `200` na mesma `8080`

Conclusão objetiva: o servidor não é uma fonte confiável para validar a própria reachability LAN na `8080`. Esse teste deve ser tratado apenas como heurística.

## Linha de Decisão Técnica

### Decisão 1: parar de assumir NPM/porta 81

Motivo:

1. a stack atual do Compose publica apenas `8080`
2. não existe listener ativo em `81` para o projeto
3. regras de firewall com nome `NPM` eram apenas vestígio operacional do host

Decisão:

1. `edge-proxy` declarativo virou o proxy canônico
2. `81/NPM` passou a ser tratado como legado em documentação

### Decisão 2: separar validação local de validação em LAN

Motivo:

1. `hub.local` no servidor apontava para `127.0.0.1`
2. isso gerava falso positivo de disponibilidade
3. testes na própria máquina misturavam saúde do container com reachability de rede

Decisão:

1. teste no servidor valida apenas stack local
2. prova de LAN exige cliente externo na mesma rede

### Decisão 3: usar `3001` como fallback host-level

Motivo:

1. `3001` via `portproxy` ficou estável na rede
2. a `8080` do host continuou inconsistente quando auto-testada localmente

Decisão:

1. `8080` continua sendo a porta canônica da aplicação
2. `3001` fica documentada como fallback operacional de host, não como contrato primário

### Decisão 4: executar Compose pela WSL

Motivo:

1. o rebuild falhou com bind mount em `\\wsl.localhost\\...`
2. o arquivo de configuração do Nginx estava correto
3. o problema era o contexto de montagem, não o conteúdo do arquivo

Decisão:

1. `docker compose` deve ser executado a partir do Linux da WSL
2. o PowerShell em caminho UNC da WSL não é método canônico de subida

### Decisão 5: unificar atualização no frontend por barramento + fallback polling

Motivo:

1. atualizações locais após mutate precisavam refletir sem refresh global
2. páginas críticas precisavam evitar flicker

Decisão:

1. mutações publicam eventos no `liveDataBus`
2. telas consumidoras assinam `useLiveDataRefresh`
3. o SSE entra como acelerador cross-session
4. o polling permanece como fallback de resiliência

### Decisão 6: preservar documentação histórica, mas sinalizar legado

Motivo:

1. parte dos documentos é evidência de incidentes antigos
2. apagar histórico destruiria contexto

Decisão:

1. manter documentos históricos
2. adicionar aviso explícito de que NPM/81 não são a topologia canônica atual

## Registro de Inconsistências

| ID | Área | Status | Severidade | Sintoma | Causa raiz resumida |
| --- | --- | --- | --- | --- | --- |
| NET-01 | Topologia | Aberta parcialmente | Média | documentos e regras históricas sugerem NPM/81 | drift entre arquitetura antiga e runtime atual |
| NET-02 | Nome/DNS | Aberta | Alta | `hub.local` não resolve em clientes sem preparo | `.local` não está publicado no DNS corporativo |
| NET-03 | Diagnóstico do host | Aberta | Média | servidor falha ao testar o próprio IP LAN na `8080` | comportamento de rede do host/WSL não reflete cliente remoto |
| NET-04 | Rebuild | Aberta parcialmente | Alta | erro intermitente de bind mount no `edge-proxy` | Compose executado do Windows em UNC da WSL |
| RT-01 | SSE schema | Mitigada | Média | erro SQL em loop deixou de aparecer após rebuild | camada de query foi adaptada ao schema por introspecção |
| RT-02 | SSE semântica | Aberta | Alta | stream pode carregar ruído e inferência ruim | polling cru em `glpi_logs` + payload sem `domain/action` explícitos |
| RT-03 | Busca ativa | Aberta | Média | busca com termo ativo não recebe refresh unificado | `useTicketsSearch` desabilita refresh enquanto há termo remoto |
| RT-04 | FormCreator catálogo/schema | Aberta | Baixa | catálogo/schema não atualizam sem reload | hooks de leitura sem integração ao barramento |
| RT-05 | Lookups inventário | Aberta | Alta | `GET /lookups/manufacturers` pode falhar em produção | contrato exige `name: string`, mas o banco retorna `NULL` em alguns registros |
| RT-06 | Ciclo de conexão SSE | Aberta | Alta | warnings de conexão não devolvida ao pool após cancelamento de stream | padrão `async for db in get_db(...): return` em função auxiliar pode cancelar sessão durante rollback |
| AUTH-01 | RBAC/sessão | Aberta | Alta | permissões e identidade podem ficar stale em sessão longa | frontend usa `auth/login` e cache local, mas não revalida `/auth/me` |
| UX-01 | Perfil do usuário | Aberta | Média | tela mostra dados fixos e métricas fictícias | página não consome endpoint algum |
| DOC-01 | Conhecimento operacional | Aberta parcialmente | Média | operadores ainda esbarram em narrativa NPM | legado preservado sem limpeza completa do conteúdo |

## Análise Detalhada por Inconsistência

### NET-01 — Drift entre arquitetura antiga e arquitetura ativa

#### Evidência

1. a stack real publica `8080` no `edge-proxy`
2. documentos históricos ainda falam em NPM e porta `81`
3. o host possui regras de firewall nomeadas como `NPM`

#### Por que confundiu o diagnóstico

1. a documentação induzia a procurar um container que não existia mais
2. o nome da regra de firewall parecia confirmar a hipótese errada
3. o time acabava misturando "vestígio do host" com "fonte de verdade do runtime"

#### Solução limpa

1. manter `edge-proxy` como contrato único
2. tratar qualquer referência a NPM/81 como histórica, nunca como default operacional
3. toda nova documentação deve começar pela topologia atual antes de citar legado

### NET-02 — `hub.local` depende de `hosts` ou DNS

#### Evidência

1. `hub.local` não resolvia na máquina cliente antes do ajuste
2. após incluir `10.72.16.3 hub.local` no `hosts`, a aplicação respondeu normalmente

#### Base externa

O RFC 6762 define `.local` como domínio especial para mDNS e diz que nomes terminados em `.local.` são link-local e devem ser consultados no mecanismo mDNS, podendo gerar resultados diferentes conforme o resolvedor e o ambiente.

#### Por que confundiu o diagnóstico

1. no servidor, `hub.local` apontava para `127.0.0.1`, então o teste local parecia "provar" a rede
2. no cliente, a mesma URL falhava antes mesmo do HTTP porque o nome não resolvia

#### Solução limpa

Opção A:

1. publicar nomes canônicos em DNS corporativo

Opção B:

1. padronizar distribuição de `hosts` em todas as estações que precisam acessar o sistema

Regra:

1. não usar o sucesso de `hub.local` no próprio servidor como prova de disponibilidade em LAN

### NET-03 — falso negativo do host ao testar a própria `8080`

#### Evidência

1. o servidor falha em `Test-NetConnection 10.72.16.3 -Port 8080`
2. a máquina cliente `10.72.16.214` recebe `200` na mesma porta

#### Base externa

A documentação oficial do WSL informa que o modo padrão é NAT e que acesso via IP remoto/LAN exige preparação específica. Também informa que, em WSL 2, acesso pela LAN não é o comportamento default e frequentemente precisa de regras equivalentes às de uma VM normal.

#### Por que confundiu o diagnóstico

1. o time tomava o auto-teste do servidor como verdade absoluta
2. isso levava a alterações em container, proxy ou frontend quando o problema estava na camada de host networking

#### Solução limpa

1. classificar o auto-teste do host como heurística
2. exigir validação externa em cliente LAN em qualquer incidente de rede
3. considerar migração para `mirrored networking mode` no WSL, com regras adequadas de Hyper-V firewall, para reduzir assimetria entre host e LAN

### NET-04 — rebuild intermitente do `edge-proxy`

#### Evidência

Sintoma histórico:

```text
error mounting ... /etc/nginx/nginx.conf ... not a directory
```

Constatações:

1. `nginx.conf` é arquivo válido
2. o diretório `conf.d` é diretório válido
3. o problema aparece quando o Compose é disparado do Windows em `\\wsl.localhost\\Ubuntu\\...`
4. quando a stack é operada a partir do Linux da WSL, o runtime é consistente

#### Base externa

1. Docker Desktop documenta que o daemon roda numa VM Linux e que bind mounts são feitos no host do daemon, não no cliente.
2. Docker Desktop recomenda manter arquivos bind-mounted no filesystem Linux quando se trabalha com containers Linux.

#### Por que confundiu o diagnóstico

1. o erro mencionava `nginx.conf`, então parecia ser um problema de sintaxe ou path do arquivo
2. na prática, o defeito era o contexto de mount entre Windows, WSL e Docker Desktop

#### Solução limpa

1. comando canônico de subida:

```powershell
wsl.exe -d Ubuntu --cd /home/jonathan-moletta/projects/tensor-aurora sh -lc "docker compose up -d --build"
```

2. não usar PowerShell em `\\wsl.localhost\\...` como método de rebuild padrão
3. se o problema reaparecer, capturar `docker compose config` e o tipo do source do volume antes de alterar qualquer arquivo do Nginx

### RT-01 — query do SSE usa schema inexistente

#### Evidência

Arquivo:

1. `app/routers/events.py`
2. `app/services/events_service.py`

Estado observado em 2026-03-18:

1. logs antigos mostravam loop com `Unknown column 'message_log'`.
2. após rebuild, o stream passou a usar a camada de serviço com introspecção de colunas.
3. os logs recentes não mostram mais erro SQL recorrente do SSE.

Motivo técnico da mitigação:

1. `events_service` consulta `information_schema.columns` e monta a query dinamicamente.
2. quando `message_log/content` não existem, usa fallback em colunas disponíveis (`user_name`, `itemtype_link`, `old_value`, `new_value`).

#### Por que confundiu o diagnóstico

1. o endpoint `/events/stream` seguia respondendo `200`
2. o frontend mantinha fallback polling
3. a UI podia parecer "funcionar", mas sem stream útil

#### Solução limpa

1. manter a query dinâmica versionada em serviço único (`events_service`) e remover qualquer query inline legada.
2. adicionar teste automatizado cobrindo serialização de payload com matriz de schemas reais (com/sem `message_log`, com/sem `content`).
3. expor métrica/contador de exceções do stream para detectar regressão em produção.

### RT-02 — mesmo corrigido, o SSE ainda é semanticamente frágil

#### Evidência

1. o backend hoje varre `glpi_logs` sem filtro relevante por domínio
2. em `dtic`, a taxa de eventos de inventário tende a dominar o stream em janelas de atividade.
3. o payload atual já inclui metadados (`itemtype_link`, `linked_action`, `old_value`, `new_value`, `id_search_option`), mas não define `domain` e `action` de forma explícita.
4. o frontend ainda infere domínio por heurística textual em `inferDomainsFromSsePayload`.

#### Impacto

1. ruído alto no stream
2. baixa capacidade de inferir eventos de negócio
3. chance real de não refrescar alguns consumidores relevantes

#### Exemplo objetivo

No `dtic`, o stream recente é majoritariamente inventário. Isso não aciona atualização útil nas telas de negócio, embora gere atividade no canal.

#### Solução limpa

Não corrigir apenas a coluna. Corrigir o contrato.

Backend:

1. mapear `glpi_logs` para um evento semântico com `domain`, `entity_type`, `entity_id`, `action`, `context`, `occurred_at`
2. filtrar eventos relevantes por domínio
3. manter `itemtype_link`, `linked_action`, `old_value`, `new_value` como metadado de apoio

Frontend:

1. parar de inferir domínio primário por concatenação textual frágil
2. consumir `domain` e `action` explícitos do backend

### RT-03 — busca ativa perde o refresh unificado

#### Evidência

Arquivo:

1. `web/src/modules/search/hooks/useTicketsSearch.ts`

Comportamento:

1. quando `debouncedSearchTerm.length >= 2`, o `useLiveDataRefresh` é desabilitado
2. a busca remota só roda quando o termo muda

#### Impacto

1. usuário com busca ativa pode ver resultado stale mesmo após mutate em outra sessão
2. a página de busca deixa de obedecer integralmente ao mesmo contrato de atualização das demais telas

#### Solução limpa

1. manter refresh unificado também durante busca ativa
2. ao receber evento, reexecutar `searchTicketsDirect` com os filtros e termo correntes
3. aplicar debounce e `minRefreshGapMs` para evitar tempestade de rede

### RT-04 — catálogo e schema do FormCreator não entram no ciclo unificado

#### Evidência

Arquivos:

1. `web/src/hooks/useServiceCatalog.ts`
2. `web/src/hooks/useFormSchema.ts`

Comportamento:

1. carregam uma vez por contexto/form
2. não assinam o barramento de atualização

#### Impacto

1. alterações externas em formulários/catálogo exigem reload de página
2. risco baixo no uso diário, mas continua sendo lacuna de consistência

#### Solução limpa

1. decidir explicitamente se FormCreator é catálogo estático por sessão ou dado vivo
2. se for dado vivo, integrar ao mesmo barramento de refresh
3. se não for, documentar que a atualização depende de reload intencional

### RT-05 — lookups de inventário com `name = null` quebram contrato de resposta

#### Evidência

Arquivos:

1. `app/routers/lookups.py`
2. `app/schemas/lookup_schemas.py`

Logs observados:

1. `fastapi.exceptions.ResponseValidationError`
2. localização do erro: `response.manufacturers[0].name` com `input: None`

Causa técnica:

1. o endpoint retorna `SELECT id, name FROM glpi_manufacturers`.
2. o schema Pydantic exige `name: str` obrigatório.
3. registros com `name = NULL` no GLPI quebram a serialização e geram `500`.

#### Impacto

1. formulário de inventário pode falhar ao carregar opções de fabricante.
2. comportamento intermitente conforme qualidade do dado no banco.
3. ruído operacional porque falha parece "instabilidade de endpoint" mas é violação de contrato.

#### Solução limpa

1. normalizar no backend (`COALESCE(name, '')`) e, idealmente, filtrar entradas inválidas.
2. registrar contagem de registros nulos por tabela de lookup para saneamento de dados.
3. adicionar teste de contrato para impedir regressão com `NULL` em lookups.

### RT-06 — cancelamento de stream SSE gera ruído de pool no backend

#### Evidência

Logs observados em `glpi-backend`:

1. `asyncio.exceptions.CancelledError: Cancelled via cancel scope`
2. `sqlalchemy.exc.InterfaceError: (pymysql.err.InterfaceError) Cancelled during execution`
3. warning de pool: `The garbage collector is trying to clean up non-checked-in connection`

Arquivos relacionados:

1. `app/routers/events.py`
2. `app/core/database.py`

Hipótese técnica mais provável:

1. helpers do SSE usam `async for db in get_db(context): return ...`.
2. sob cancelamento de stream, esse padrão pode encerrar a sessão em momento não ideal e produzir rollback cancelado.
3. o efeito final é ruído de pool e risco de degradação sob múltiplos clientes SSE.

#### Impacto

1. aumenta risco de erro intermitente em carga multiusuário.
2. pode afetar estabilidade percebida em funcionalidades com stream ativo contínuo.

#### Solução limpa

1. usar sessão explícita no serviço SSE (`async with sessionmaker() as db`) sem `return` dentro de `async for`.
2. tratar cancelamento de stream com fechamento explícito e sem rollback pendente.
3. adicionar teste de soak (múltiplos connects/disconnects SSE) e contador de conexões abertas/fechadas.

### AUTH-01 — identidade e permissões ficam congeladas após login

#### Evidência

Arquivos:

1. `web/src/lib/api/glpiService.ts`
2. `web/src/lib/auth/contextSessionBootstrap.ts`
3. `web/src/app/page.tsx`
4. `web/src/app/selector/page.tsx`
5. `app/routers/domain_auth.py`

Constatações:

1. o frontend usa `POST /auth/login` para compor a identidade inicial
2. o frontend pré-aquece contextos adicionais repetindo `auth/login`
3. o backend expõe `GET /auth/me`
4. não há ciclo regular de revalidação do `currentUserRole` com `/auth/me`

#### Impacto

1. mudança de `hub_roles` ou perfis no GLPI pode não refletir durante a sessão
2. menu, guards e contextos podem continuar operando com snapshot antigo
3. a matriz de permissões hoje só corrige parcialmente `app_access` quando o próprio usuário aparece na lista

#### Solução limpa

1. introduzir revalidação periódica ou on-focus via `GET /auth/me`
2. atualizar `currentUserRole`, `hub_roles`, `roles.active_profile` e `app_access` de forma centralizada
3. tratar `auth/login` como bootstrap, não como fonte permanente de verdade da identidade

### UX-01 — perfil do usuário não representa dado real

#### Evidência

Arquivo:

1. `web/src/app/[context]/user/profile/page.tsx`

Constatações:

1. nome, e-mail, departamento, telefone e métricas estão hardcoded
2. a página não chama endpoint algum
3. o conteúdo não acompanha o contexto nem a identidade real da sessão

#### Impacto

1. inconsciência funcional direta para o usuário
2. falsa percepção de integração onde não existe integração real

#### Solução limpa

1. ou conectar a tela a fontes reais de identidade/métricas
2. ou removê-la/desmarcá-la até haver backend e contrato confiáveis

### DOC-01 — documentação histórica continua gerando ambiguidade

#### Evidência

Ainda existem arquivos com narrativa NPM/81 no corpo do conteúdo, embora já marcados como históricos.

#### Solução limpa

1. manter banner histórico no topo
2. apontar todos os documentos antigos para a referência consolidada atual
3. criar uma pequena seção "não usar para operação atual" no índice documental

## Cobertura Atual do Modelo Unificado de Refresh

### Superfícies já ligadas ao barramento

1. dashboard
2. analytics
3. tickets detalhe
4. chamados do usuário
5. gestão de carregadores
6. permissões
7. knowledge
8. busca

### Superfícies com lacuna ou contrato parcial

1. busca durante termo remoto ativo
2. catálogo/schema do FormCreator

## Arquitetura Limpa Recomendada

### Rede

1. `edge-proxy` em `8080` como porta canônica
2. `3001` apenas como fallback host-level
3. DNS corporativo ou `hosts` gerenciado para os aliases internos
4. Compose sempre executado dentro da WSL
5. prova de LAN sempre validada em cliente externo

### Tempo real

1. mutação local continua publicando no barramento para feedback imediato
2. backend emite evento semântico, não row cru de `glpi_logs`
3. frontend atualiza por domínio explícito, sem heurística textual
4. polling continua como fallback controlado
5. telas em background refresh preservam conteúdo anterior e usam `refreshing`, não `loading` global

## Árvore de Diagnóstico Recomendada

### Incidente de rede

1. `docker compose ps`
2. `curl http://localhost:8080/`
3. validar `hosts` ou DNS do cliente
4. validar `http://<IP_DO_SERVIDOR>:8080/` a partir de um cliente real
5. se necessário, validar fallback `3001`
6. só então discutir proxy, firewall ou rebuild

### Incidente de realtime

1. verificar logs do backend para `/events/stream`
2. validar query/schema real de `glpi_logs`
3. validar shape do payload SSE
4. validar se o frontend consegue mapear domínio sem heurística textual
5. validar se a tela está inscrita no `useLiveDataRefresh`
6. validar se há polling fallback para aquele domínio

## Prioridade de Correção

### P0

1. redefinir o contrato do SSE para payload semântico (`domain/action` explícitos)
2. corrigir `GET /lookups/manufacturers` para tolerar `name = NULL` sem `500`
3. revisar lifecycle de sessão no SSE para eliminar warnings de conexão não devolvida ao pool

### P1

1. corrigir busca ativa para respeitar refresh unificado
2. formalizar DNS/hosts como pré-requisito operacional
3. padronizar comando de Compose pela WSL em toda a equipe
4. adicionar monitoramento explícito do stream SSE (erros, reconnect, backlog)

### P2

1. decidir estratégia de atualização do FormCreator
2. reduzir conteúdo histórico ainda ambíguo em docs auxiliares

## Referências Externas

1. Microsoft Learn — Accessing network applications with WSL: <https://learn.microsoft.com/en-us/windows/wsl/networking>
2. Microsoft Learn — `netsh interface portproxy`: <https://learn.microsoft.com/en-au/windows-server/administration/windows-commands/netsh-interface>
3. Docker Docs — WSL 2 best practices for Docker Desktop on Windows: <https://docs.docker.com/desktop/features/wsl/best-practices/>
4. Docker Docs — Bind mounts: <https://docs.docker.com/engine/storage/bind-mounts/>
5. IETF RFC 6762 — Multicast DNS (`.local`): <https://www.rfc-editor.org/rfc/rfc6762>
