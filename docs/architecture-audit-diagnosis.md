# Auditoria Arquitetural do Tensor Aurora

Data-base: 2026-03-15

## Objetivo
Esta auditoria registra o estado arquitetural real do projeto, com base no código executável e na validação já existente da stack. O objetivo não é justificar reescrita; é decidir, com evidência, o que deve ser mantido, simplificado, refatorado, isolado ou removido.

## Escopo e baseline
- Monólito modular mantido como direção técnica:
  - backend FastAPI;
  - frontend Next.js;
  - proxy declarativo Nginx;
  - testes com Pytest, Vitest e Playwright.
- Baseline funcional já validado nesta etapa:
  - `pytest`: 73 passed;
  - `npm run lint`: passou;
  - `npx vitest run`: 68 passed;
  - `npm run build`: passou;
  - `docker compose ps`: backend, frontend e proxy saudáveis;
  - smoke Playwright em `hub.local`: 3 passed.
- Documentos complementares desta etapa:
  - [configuration-matrix.md](/home/jonathan-moletta/projects/tensor-aurora/docs/configuration-matrix.md)
  - [etapa-atual-boundary.md](/home/jonathan-moletta/projects/tensor-aurora/docs/etapa-atual-boundary.md)

## Diagnóstico Executivo
O sistema atual é funcional e recuperou previsibilidade operacional. A arquitetura, porém, ainda convive com quatro fragilidades estruturais relevantes:

1. Sessão, contexto e identidade no frontend têm mais de uma fonte de verdade.
2. A camada de contratos do frontend ainda está em transição, com convivência entre modelos novos e tipos legados.
3. O backend já opera como monólito modular, mas com fronteiras mais implícitas do que explícitas.
4. O FormCreator continua sendo o domínio com maior elasticidade de contrato e, portanto, o ponto mais frágil para manutenção futura.

Conclusão objetiva:
- o projeto não exige reescrita;
- o projeto exige consolidação estrutural;
- a próxima fase correta é refatoração incremental guiada por risco, não expansão de abstrações.

## Mapa Arquitetural Atual

### Backend
Ponto de entrada real: [app/main.py](/home/jonathan-moletta/projects/tensor-aurora/app/main.py)

Responsabilidades centrais já convivendo no mesmo app:
- bootstrap, lifespan e CORS;
- gateway GLPI via sessão compartilhada;
- leitura CQRS via MySQL;
- estado local operacional via SQLite;
- superfícies específicas de domínio;
- endpoints genéricos catch-all.

Estrutura lógica observada:

```text
FastAPI app
  -> platform/core
     -> config, context_registry, session_manager, glpi_client, database
  -> domain routers
     -> auth
     -> formcreator
     -> lookups
     -> knowledge
     -> chargers
     -> tickets/search
     -> ticket_workflow
     -> admin
  -> generic integration surface
     -> items (catch-all)
     -> events
```

Pontos relevantes:
- a ordem dos routers em [app/main.py](/home/jonathan-moletta/projects/tensor-aurora/app/main.py) ainda é parte da arquitetura;
- o router genérico [items.py](/home/jonathan-moletta/projects/tensor-aurora/app/routers/items.py) precisa ficar por último para não capturar rotas específicas;
- o sistema já é um monólito modular viável, mas a modularidade ainda depende de convenção.

### Frontend
Pontos centrais:
- infraestrutura HTTP em [httpClient.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/httpClient.ts) e [client.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/client.ts);
- sessão e identidade em [useAuthStore.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/store/useAuthStore.ts);
- configuração same-origin em [runtime.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/config/runtime.ts);
- domínios novos com `contracts/ + mappers + models + services`;
- compat layer legada em [types.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/types.ts).

Estrutura lógica observada:

```text
Browser / Next app
  -> infrastructure
     -> runtime
     -> httpClient
     -> auth store
  -> domain API layer
     -> contracts
     -> mappers
     -> models
     -> services
  -> UI / routes / hooks
     -> dashboard
     -> user
     -> search
     -> knowledge
     -> chargers
     -> ticket workflow
     -> formcreator wizard
```

Pontos relevantes:
- o padrão novo de domínio existe e funciona;
- o acoplamento mais forte continua em `useAuthStore` e `httpClient`;
- ainda há hooks e páginas que derivam comportamento operacional da navegação, e não de um contrato de identidade fechado.

### Infra
Infra observada:
- `docker-compose` com frontend, backend e edge proxy;
- proxy declarativo em [tensor-aurora.conf](/home/jonathan-moletta/projects/tensor-aurora/infra/nginx/conf.d/tensor-aurora.conf);
- browser em same-origin `hub.local`;
- backend exposto tecnicamente em `api.hub.local`;
- persistência local via volume SQLite para estado operacional.

Conclusão de infra:
- a topologia atual é adequada;
- não há evidência técnica para microserviços;
- a arquitetura de runtime deve ser preservada.

## Fonte de Verdade por Responsabilidade

| Responsabilidade | Fonte principal atual | Adaptadores adicionais | Diagnóstico |
| --- | --- | --- | --- |
| Sessão HTTP do browser | cookie `sessionToken` + header `Session-Token` | [httpClient.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/httpClient.ts) | aceitável, mas distribuído |
| Identidade do usuário no app | [useAuthStore.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/store/useAuthStore.ts) | páginas ajustando `activeView` | frágil |
| Contexto ativo | `activeContext` em store | roteamento e `context_override` | frágil |
| Visão operacional (`user`/`tech`) | `activeView` em store | páginas `dashboard` e `user` definindo valor | frágil |
| Sessões por contexto | `contextSessions` / `sessionTokens` em store | bootstrap por tela | aceitável, mas acoplado |
| Contrato bruto de API | DTOs em `contracts/` | compat layer em [types.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/types.ts) | em transição |
| Modelo consumido pela UI | `models/` + `mappers/` | alguns serviços antigos | aceitável |
| Regras de ticket workflow | backend dedicado | UI apenas orquestra | saudável |
| Regras de busca e KB | backend + mappers frontend | UI usa modelo normalizado | saudável |
| Estado local de carregadores | SQLite local | legado JSON migrado | saudável |
| Form schema bruto | [app/schemas/formcreator.py](/home/jonathan-moletta/projects/tensor-aurora/app/schemas/formcreator.py) | mapeamento em `formService` e `form-schema.ts` | frágil |
| Escape hatch GLPI genérico | [app/routers/items.py](/home/jonathan-moletta/projects/tensor-aurora/app/routers/items.py) | [glpiGateway.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/internal/glpiGateway.ts) | manter isolado |

Critério aplicado:
- o sistema ainda viola o ideal de “uma responsabilidade, uma fonte principal de verdade” em sessão/contexto;
- nos outros domínios principais, a situação já é controlável.

## Bounded Contexts e Classificação

| Domínio | Status | Nota | Justificativa |
| --- | --- | --- | --- |
| Tickets/Search | saudável | A | contrato explícito, response models, mappers dedicados, testes e smoke cobertos |
| Knowledge | saudável | A | leitura bem definida, normalização centralizada, baixo acoplamento residual |
| Chargers | aceitável | B | domínio estabilizado, mas ainda depende de integração GLPI e estado operacional local |
| Ticket Workflow | aceitável | B | backend dedicado e contrato melhorado; ainda precisa maturidade de identidade/sessão no frontend |
| Lookups | aceitável | B | extraídos para domínio próprio, mas ainda apoiam áreas mais frágeis como FormCreator |
| Form Catalog / Schema | frágil | C | frontend já normaliza bem, mas o contrato bruto segue elástico demais |
| Auth / Session / Context selection | frágil | C | funcional, porém com múltiplas fontes de verdade e forte centralização |
| Admin / Permissões | aceitável | B | tipado e funcional, mas fora do padrão final `contracts/models/mappers` |
| Generic GLPI items | crítico controlado | D | necessário como infraestrutura interna, inadequado como contrato público |

## Evidências de Fragilidade Relevantes

### 1. `activeView` é definido por páginas
Evidência:
- [dashboard/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/%5Bcontext%5D/dashboard/page.tsx) chama `setActiveView('tech')`.
- [user/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/%5Bcontext%5D/user/page.tsx) chama `setActiveView('user')`.

Diagnóstico:
- a identidade operacional do usuário ainda depende do caminho navegando;
- isso funciona, mas mistura estado de navegação com estado de autorização;
- custo de manutenção cresce quando um mesmo usuário alterna papel, contexto e tela.

Decisão recomendada:
- substituir incrementalmente;
- `activeView` deve virar derivado de identidade/papel selecionado, nunca de página.

### 2. `useAuthStore` e `httpClient` concentram acoplamento excessivo
Evidência:
- [useAuthStore.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/store/useAuthStore.ts) guarda autenticação, contexto ativo, cache por contexto, tokens e visão operacional;
- [httpClient.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/httpClient.ts) resolve base URL, normaliza contexto e injeta token.

Diagnóstico:
- ambos são peças centrais corretas, mas pesadas demais;
- o projeto usa “zonas protegidas” para evitar regressão, o que indica alta sensibilidade estrutural.

Decisão recomendada:
- manter com guarda na fase atual;
- simplificar responsabilidades na próxima onda sem reescrever do zero.

### 3. Contratos novos e legados coexistem
Evidência:
- novos contratos em `web/src/lib/api/contracts`, `mappers`, `models`;
- compat layer em [types.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/types.ts).

Diagnóstico:
- a transição foi correta;
- a permanência longa dos dois modelos é que vira dívida;
- o risco principal é duplicação silenciosa de adaptação e inconsistência futura de tipos.

Decisão recomendada:
- desmontar progressivamente `types.ts`;
- manter apenas como compat layer temporária com prazo de remoção.

### 4. FormCreator continua com contrato frouxo demais
Evidência:
- [app/schemas/formcreator.py](/home/jonathan-moletta/projects/tensor-aurora/app/schemas/formcreator.py) ainda usa estruturas amplas;
- [domain_formcreator.py](/home/jonathan-moletta/projects/tensor-aurora/app/routers/domain_formcreator.py) deriva layout e lookups a partir de dados dinâmicos do GLPI;
- [formService.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/formService.ts) já normaliza o suficiente para consumo do wizard;
- [form-schema.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/types/form-schema.ts) ainda é o modelo interno principal do renderer.

Diagnóstico:
- a variabilidade do produto justifica parte do dinamismo;
- o contrato atual ainda transfere complexidade demais para a adaptação;
- este é o principal candidato a endurecimento incremental.

Decisão recomendada:
- manter a superfície;
- endurecer o contrato por etapas no backend e reduzir heurísticas no frontend.

### 5. Backend depende de ordem de routers e de catch-all genérico
Evidência:
- [app/main.py](/home/jonathan-moletta/projects/tensor-aurora/app/main.py) registra routers específicos antes de [items.py](/home/jonathan-moletta/projects/tensor-aurora/app/routers/items.py).

Diagnóstico:
- isso não é fatal, mas é uma fronteira implícita;
- todo endpoint genérico precisa ser tratado como infraestrutura interna, não como API de domínio.

Decisão recomendada:
- manter com guarda;
- não expandir o uso da superfície genérica para a UI.

### 6. Repositório ainda mistura código entregue com ruído operacional
Evidência:
- há muitos documentos auxiliares, prompts, artefatos e relatórios em `docs/` e na raiz;
- o projeto já precisou de [etapa-atual-boundary.md](/home/jonathan-moletta/projects/tensor-aurora/docs/etapa-atual-boundary.md) para explicitar fronteira.

Diagnóstico:
- isso não quebra runtime, mas atrapalha leitura arquitetural e entrega limpa;
- é um problema real de processo e manutenção.

Decisão recomendada:
- simplificar;
- separar melhor documentação viva, material operacional e artefatos históricos.

## Decisões Correias que Devem Ser Mantidas
- monólito modular com FastAPI + Next.js + Nginx;
- same-origin no browser com `hub.local` e `/api/*`;
- response models explícitos nos reads suportados pela UI;
- domínio dedicado para ticket workflow;
- mappers por domínio no frontend;
- contrato de datas timezone-aware com serialização ISO 8601 com offset;
- SQLite local para estado operacional do backend, em vez de JSON efêmero;
- suite smoke Playwright em host canônico real.

## Decisões Equivocadas ou Incompletas
- usar tela para definir visão operacional do usuário;
- manter compat layer legada sem data explícita de remoção;
- deixar FormCreator como contrato amplo demais sem estratégia formal de endurecimento;
- depender de “zonas protegidas” como principal contenção arquitetural;
- aceitar worktree e fronteira de entrega ruidosos como estado normal do projeto.

## Diagnóstico Final
O Tensor Aurora já saiu da fase de instabilidade operacional. O problema principal agora não é funcionamento; é consistência estrutural.

Em termos arquiteturais:
- backend: bom o suficiente para permanecer monolítico, mas precisa de fronteiras mais explícitas;
- frontend: já entrou no trilho correto, mas precisa concluir a convergência de sessão e contratos;
- FormCreator: deve ser tratado como principal domínio de endurecimento progressivo;
- endpoints genéricos: devem permanecer internos e limitados;
- processo: a clareza de entrega precisa melhorar para reduzir custo de mudança.

Decisão consolidada desta auditoria:
- manter a base atual;
- refatorar incrementalmente;
- atacar primeiro sessão/contexto, convergência de contratos e endurecimento progressivo do FormCreator.
