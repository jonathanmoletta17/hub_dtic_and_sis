# Diagnóstico Factual do Projeto (Levantamento Inicial)

Com base na inspeção automatizada dos arquivos e da infraestrutura presentes no repositório, apresentamos o mapeamento factual em atendimento aos requisitos estabelecidos.

---

## Etapa 1 — Identificação das Tecnologias Utilizadas

**Backend** ([pyproject.toml](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/pyproject.toml), [Dockerfile](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/Dockerfile))
- **Linguagem:** Python 3.11+ (Mapeado no Dockerfile `python:3.12-slim`)
- **Framework Principal:** FastAPI (`fastapi>=0.115.0`) e servidor Uvicorn
- **Comunicação / HTTP Client:** `httpx`
- **Rate Limit & Resiliência:** `slowapi`, `tenacity`, `pybreaker`
- **Banco de Dados (e Assíncronos):** SQLAlchemy, `aiomysql`, `aiosqlite`
- **Validação Secundária:** Pydantic (através de `pydantic-settings`)
- **Testes:** `pytest`, `pytest-asyncio`

**Frontend** ([web/package.json](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/package.json))
- **Linguagem:** TypeScript
- **Framework Principal:** Next.js (16.1.6) na estrutura React (19.2.3)
- **Estilização:** Tailwind CSS v4 (`@tailwindcss/postcss`)
- **Gerenciamento de Estado:** Zustand (`zustand`) e SWR (`swr`) para caching de fetch
- **Manipulação de Formulários:** `react-hook-form` em conjunto com Zod (`zod`, `@hookform/resolvers`)
- **UI Adicionais:** `lucide-react` para ícones, `recharts` para gráficos e `framer-motion` para animações fluidas
- **Testes:** Vitest, Testing Library React, JSDom

---

## Etapa 2 — Estrutura Completa do Repositório

O projeto é mantido sob um monorepo focado nos diretórios [app](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/web/src/modules/tickets/components/wizard/StepRouter.tsx#19-104) e `web`, validando a conjectura original:

```text
.
├── app/                  # Backend principal (FastAPI)
│   ├── core/             # Helpers e middlewares (auth, db, events)
│   ├── routers/          # Endpoints da API
│   ├── schemas/          # Modelos de validação de dados
│   ├── services/         # Lógica de integração e regras de negócios
│   ├── tests/            # Testes do backend (pytest)
│   ├── config.py         # Arquivo principal das strings e senhas de embasamento
│   └── main.py           # Ponto de inicialização da Aplicação
├── web/                  # Frontend Next.js
│   ├── src/
│   │   ├── app/          # Roteador (App router) organizado por /[context]
│   │   ├── components/   # Componentes de UI reusáveis
│   │   ├── features/     # Feature-components de nível médio
│   │   ├── hooks/        # Lógicas em ganchos SWR e contextuais
│   │   ├── lib/          # Configs e HttpClient API
│   │   ├── modules/      # Lógicas e fluxos de telas complexos (ex: tickets)
│   │   ├── store/        # Gerenciamento via Zustand
│   │   └── types/        # Intefarces TS Globais
│   └── package.json
├── data/                 # Potencialmente bancos temporários locais (sqlite)
├── docs/                 # Documentação farta em fluxos (.md, .pdf)
├── scripts/              # Utilitários secundários
├── tests/                # Casos genéricos de teste da stack
└── .vscode e .agent      # Ferramentas IDE e Prompts/Regras
```

---

## Etapa 3 — Identificação das Responsabilidades de Cada Módulo

- **Lógica de negócio:** Implementadas de forma clara na camada service, como [app/services/ticket_list_service.py](file:///c:/Users/jonathan-moletta/.gemini/antigravity/playground/tensor-aurora/app/services/ticket_list_service.py) no Backend e subcomponentes em `web/src/modules/` no Frontend.
- **Definições Rotas/Endpoints:** Localizadas em `app/routers/` (ex: `items.py`, `chargers.py`). O `app/main.py` serve para os includes dos routers.
- **Modelos e Entidades:** Ficam localizados essencialmente em `app/schemas/` no Backend, bem como em `web/src/types/` no TypeScript.
- **Acesso a Banco de Dados / HTTP GLPI:** No Backend, o `app/core/database.py` expõe sessões no SQLAlchemy, suportado pelos engines do core, além das extensivas requisições ao GLPI feitas do `glpi_client.py`.
- **Integrações Externas:** Feitas em `app/core/glpi_client.py` sob responsabilidade de interagir de fato com o sistema matriz GLPI original.

---

## Etapa 4 — Arquitetura Backend

A arquitetura orienta-se em Padrão **MVC Expandido / Service-Oriented (Gateway Universal)**. 
- O arquivo de entrada `app/main.py` inicializa o framework com Lifespan e CORS. 
- Ele mapeia o sistema de rotas injetando em blocos (Capabilities de Database: `db_read.router`, Autenticação `domain_auth`, Ações em `items` e CQRS dinâmico).
- Delega a lógica de domínio para a camada "services" (`app/services/*`), promovendo isolamento e integração via dependência para a matriz do GLPI Server. O tráfego de sessões é manuseado uniformemente pelo `app/core/session_manager.py`. E a persistência de consultas e cachê é abordada em `app/core/cache.py` e `database.py`.

---

## Etapa 5 — Arquitetura Frontend

Baseada no robusto design em **Clean Architecture for React**, com injeção por hooks.
- **Framework/Rotas:** Next.js (App router) modelado pelo curinga multitenant `web/src/app/[context]`, ramificando `/dashboard`, `/new-ticket`, `/search`.
- **Componentização:** Segmentação clássica, sendo elementos atômicos em `src/components`, fluxos e interfaces unificadas em `src/modules` e serviços granulares em `src/lib/api`.
- **Gerenciamento de Estado:** É globalizado pelo `Zustand` através de arquivos na pasta `src/store/` (e SWR para polling automático da API).
- **Comunicação de Interface (Http):** Configurado unicamente sobre os métodos REST definidos em `web/src/lib/api/httpClient.ts`.

---

## Etapa 6 — Comunicação entre Frontend e Backend

**Mecanismos:** REST API estrita via HttpClient (`httpClient.ts`) assíncrono.
- Em várias ocorrências no portal do usuário e chamados há o encapsulamento dos métodos num Client Fetch (`formService.ts`, `glpiService.ts`) que aponta via Fetch API para o Backend universal (prefixo explícito de roteamento de contextos: `/api/v1/{context}/...`).
- O tráfego é autenticado por sessão injetada. 
- Menção também à adoção de tecnologias reativas do tipo **SSE (Server-Sent Events)** para stream na rota `/api/v1/{context}/events/stream`.

---

## Etapa 7 — Sistema de Autenticação

A Autenticação está perfeitamente abstraída pelas instâncias delegadas:
- O módulo core processado no Backend reside em `app/core/session_manager.py` para armazenar de modo stateful ou caching a sessão de integração do GLPI nativo conectado.  
- Seus endpoints REST de Login (`/auth/login`, `/auth/logout`, `/auth/me`) estão em `app/routers/domain_auth.py`.
- O payload ou cookie resultante propaga pelo state `useAuthStore.ts` do frontend ditando as diretrizes para interações e fluxos (ex: logados como tech ou requester).
- Além do guardião interno construído na classe middleware em Python (`app/core/auth_guard.py`). 

---

## Etapa 8 — Sistema de Permissões

A gestão de "Roles" e Controle de Acesso assume duas camadas:
- **Backend Constraints:** Pelo GLPI através do perfilamento de grupos por sub-áreas e roles do usuário GLPI associado à Session Key nativa da API consumida. Há também endpoints dedicados no `app/routers/admin.py` para visualização dos papéis.
- **Frontend Matrix:** Utiliza uma matriz em `web/src/lib/context-registry.ts` ou arquivos em `web/src/lib/config/features.json`. Através desta avaliação visual, por exemplo, ele valida se o usuário `isTech`, contém perfil `gestor` associado em runtime para exibir os links de *Permissões* ou o layout nativo do *Painel da Gestão Operacional*.

---

## Etapa 9 — Fluxos Principais do Sistema

Analisando a estrutura e os nomes descritos nos routers, a arquitetura do Sistema garante os seguintes Caminhos / Rotas vitais:
1. **Autenticação:** [Frontend App] -> Modal de Gateway Contextual -> POST `/login` -> Validação Sessão SessionManager.
2. **Criação de Chamados (Ticket):** -> [Frontend] -> Seleção Dinâmica `/new-ticket` via Formcreator (`formService.ts`) -> [Backend] `orchestrator.py` para injetar multi-análises -> Persistência de forms via GLPI_Client.
3. **Dashboards e Kpis (Leituras complexas):** -> [Frontend] Hooks visando endpoint de KPIs -> API Backend `db_read.py` & `kpis_service.py` -> Acesso nativo de leitura SQLAlchemy local e GLPI.
4. **Busca Avançada de Tickets:** [Frontend] barra superior `/search` -> chamada pelo Cliente SWR -> API endpoint via `search.py`.
5. **Gestão Específica de Entidades (Carregadores, Permissões):** Acesso estrito por abas de Techs -> `chargers.py` servindo manipulações robustas e hierárquicas.

---

## Etapa 10 — Dependências Internas

**Acoplamento Observado:**
- **Forte Acoplamento do Backend aos Componentes GLPI:** A estrutura em `app/core/glpi_client.py` é uma espinha dorsal na qual essencialmente todos os serviços autenticados dependem (por exemplo, `ticket_list_service.py` e `auth_service.py`).
- O Backend está blindado como Interface Média.
- O Frontend Next.js adere estritamente aos payloads Pydantic enviados pelo FastAPI em suas camadas tipadas. A conversão de Contexto Multitenant ("dtic" e "sis") é aplicada tanto nos hooks NextJs App Router, os quais determinam as prefixações do HttpClient para a API FastAPI — forçando um modelo dependente em tandem de Contextos.
- `app/routers/orchestrator.py` ilustra uma fusão de dependências entre envio e listagem interna consolidada.
