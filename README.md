# Hub Operacional Web

Aplicacao canonica extraida do legado `hub_dtic_and_sis` para sustentar o nucleo operacional de `DTIC` e `SIS`.

## Estado atual

- raiz canonica WSL em `/home/jonathan/projects/work/hub-operacional-web`
- stack local em `http://localhost:18080`
- health em `http://localhost:18080/health`
- backend direto em `http://127.0.0.1:18081`
- frontend direto em `http://127.0.0.1:18082`
- auth padrao `user_password_session`, com health esperado `service_session_status=disabled`
- contexto `DTIC` com entrada `agent-first`
- contexto `SIS` com `FormCreator`
- fluxos reais validados:
  - login e selector
  - dashboard
  - meus chamados
  - detalhe do ticket
- `DTIC` chat inline nativo no hub com Hermes via `http://localhost:8502`
  - `DTIC` criacao real via agente com cleanup
  - `SIS` criacao real via formulario com cleanup
  - `SIS` followup e anexo com cleanup

Hermes/Antigravity, GLPI/SIS, knowledge base/RAG e control plane sao externos a este repo. Caminhos Windows em documentos antigos sao historico de host e nao definem a raiz atual de codigo-fonte.

## Escopo canonico

O produto canonico desta base e o nucleo operacional de tickets:

- autenticacao e bootstrap de contexto
- `DTIC/dashboard`
- `DTIC/user`
- `DTIC/new-ticket` agent-first
- `DTIC/ticket/[id]`
- `SIS/dashboard`
- `SIS/user`
- `SIS/new-ticket`
- `SIS/ticket/[id]`

A base nova ja teve os modulos legados de frontend fora do MVP removidos fisicamente. No backend, `db_read` ja foi reduzido ao contrato real do MVP e os services herdados de `kpis` e `query_engine` ja sairam da base. O que ainda permanece como divida controlada esta concentrado em configuracoes protegidas de navegacao e eventuais sobras herdadas fora do runtime canonico.

## Documentacao principal

- [BOOTSTRAP.md](BOOTSTRAP.md)
- [AGENTS.md](AGENTS.md)
- [CLAUDE.md](CLAUDE.md), [GEMINI.md](GEMINI.md), [HERMES.md](HERMES.md)
- [ARCHITECTURE_RULES.md](ARCHITECTURE_RULES.md)
- [docs/README.md](docs/README.md)
- [.claude.json](.claude.json)

Documentos historicos e estudos laterais ficam em [docs/archive](docs/archive/README.md). Referencias de sistema visual reutilizavel ficam em [docs/reference](docs/reference/README.md). Esses arquivos preservam memoria e contexto, mas nao substituem a documentacao canonica acima.

## Configuracao relevante

- `NEXT_PUBLIC_DTIC_AGENT_URL`: URL publica do Hermes usada pelo `DTIC/new-ticket`
- `NEXT_PUBLIC_DTIC_AGENT_API_URL`: URL da API conversacional usada pelo chat inline do `DTIC/new-ticket`
- `.env.runtime.local`: configuracao local de runtime do compose
- `.env` e `.env.runtime.local` sao locais, ignorados e nunca devem ser versionados
- `user_token` nao e dependencia runtime normal; fica restrito a smokes destrutivos `@mutation` com `ALLOW_GLPI_MUTATION_SMOKE=true`

## Regra de consolidacao

- o que ja foi validado ponta a ponta fica protegido
- zonas estruturais protegidas nao devem ser alteradas sem plano explicito
- modulos herdados fora do MVP devem ser primeiro classificados e isolados antes de qualquer remocao fisica
