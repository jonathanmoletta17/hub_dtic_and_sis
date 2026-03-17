# Roadmap de Refatoração Incremental

Data-base: 2026-03-15

## Objetivo
Converter a auditoria arquitetural em um backlog executável por ondas pequenas, reversíveis e testáveis.

## Regras do Roadmap
- cada onda deve caber em uma entrega clara;
- nenhuma onda mistura redesign visual com refatoração estrutural;
- mudanças comportamentais só entram quando forem consequência direta de simplificação arquitetural;
- toda onda precisa preservar o baseline funcional já validado.

## Onda 1 — Sessão, Contexto e Identidade

### Objetivo
Eliminar as fontes de verdade mais frágeis do frontend e consolidar identidade ativa por contexto e papel.

### Escopo
- revisar `useAuthStore`;
- reduzir dependência de `activeView` como fonte primária;
- mover a definição de papel ativo para identidade/sessão;
- revisar páginas que hoje ajustam visão operacional;
- manter `httpClient` estável, alterando apenas o necessário para a nova política.

### Mudanças permitidas
- refatoração de store;
- ajustes de hooks e guards de rota;
- remoção de dependência de tela para definir papel ativo;
- testes unitários e E2E de sessão/contexto.

### Mudanças proibidas
- reescrita completa da autenticação;
- mudança de UX sem justificativa técnica;
- mudança de protocolo HTTP com o backend.

### Riscos conhecidos
- regressão em troca de contexto;
- regressão em reload de `/selector`;
- regressão em páginas que assumem `activeView`.

### Testes obrigatórios
- `pytest`
- `npm run lint`
- `npx vitest run`
- `npm run build`
- `docker compose ps`
- smoke Playwright em `hub.local`
- rechecagem explícita:
  - login
  - troca de contexto
  - reload em `/selector`
  - acesso `dashboard` e `user` com papel correto

### Critério de aceite
- nenhuma página define mais a identidade operacional como fonte primária;
- troca de contexto e reload continuam íntegros;
- o usuário técnico e o solicitante entram na visão correta por regra de identidade, não por efeito de tela.

## Onda 2 — Convergência Final de Contratos no Frontend

### Objetivo
Completar a migração do frontend para contratos por domínio e reduzir `types.ts` a compat layer residual.

### Escopo
- inventariar usos restantes de [types.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/types.ts);
- migrar domínios restantes para `contracts + mappers + models + services`;
- remover adaptação inline em hooks e componentes;
- explicitar data aliases onde ainda houver string solta.

### Mudanças permitidas
- refatoração de services, hooks e tipos;
- criação de mappers faltantes;
- ajuste de testes unitários de serviço e mapper.

### Riscos conhecidos
- quebra de tipos em componentes antigos;
- adaptação duplicada temporária durante a migração.

### Testes obrigatórios
- `npm run lint`
- `npx vitest run`
- `npm run build`
- smoke Playwright em `hub.local`

### Critério de aceite
- UI não depende mais de payload bruto;
- `types.ts` fica residual, documentado e com prazo de remoção;
- todos os domínios suportados pela UI usam services de domínio explícitos.

## Onda 3 — Endurecimento de FormCreator e Admin/Auth

### Objetivo
Reduzir elasticidade desnecessária do FormCreator e alinhar domínios auxiliares ao padrão arquitetural final.

### Escopo
- endurecer progressivamente [app/schemas/formcreator.py](/home/jonathan-moletta/projects/tensor-aurora/app/schemas/formcreator.py);
- reduzir `Any` e envelopes frouxos onde o shape já é estável;
- alinhar `admin` e `auth` ao padrão completo de contratos e modelos;
- revisar renderer do wizard para diminuir heurísticas.

### Mudanças permitidas
- schemas backend;
- services e mappers de FormCreator;
- contracts/models/mappers de admin/auth.

### Riscos conhecidos
- regressão em formulários reais do GLPI;
- regressão em permissões e auth se o escopo crescer sem controle.

### Testes obrigatórios
- `pytest`
- `npm run lint`
- `npx vitest run`
- `npm run build`
- Playwright:
  - smoke geral em `hub.local`
  - fluxo de novo chamado real

### Critério de aceite
- schema do FormCreator fica mais explícito sem perder a variabilidade necessária;
- admin/auth passam a obedecer o mesmo padrão de domínio usado no resto da UI;
- wizard continua funcional com lookups e submit real.

## Onda 4 — Simplificação Final e Remoção de Compat Layer

### Objetivo
Remover resíduos da transição arquitetural e consolidar a fronteira final do projeto.

### Escopo
- remover compat layers obsoletos;
- fechar gaps residuais de modularidade no backend;
- revisar organização de documentação viva vs histórico;
- limpar pontos que ainda dependem de convenções implícitas desnecessárias.

### Mudanças permitidas
- remoção de tipos/abstrações legadas;
- organização de estrutura interna;
- limpeza de fronteira de entrega.

### Riscos conhecidos
- remoção prematura de compat layer;
- quebra silenciosa em caminhos pouco exercitados.

### Testes obrigatórios
- baseline completo:
  - `pytest`
  - `npm run lint`
  - `npx vitest run`
  - `npm run build`
  - `docker compose config`
  - `docker compose ps`
  - smoke Playwright em `hub.local`

### Critério de aceite
- compat layer legada removida ou residual mínima, explicitamente justificada;
- fronteira arquitetural do monólito fica compreensível sem depender de “regras tribais”;
- o custo de manutenção cai de forma visível.

## Ordem Recomendada
1. Onda 1: sessão/contexto/identidade.
2. Onda 2: convergência de contratos.
3. Onda 3: FormCreator e admin/auth.
4. Onda 4: simplificação final.

## O que não entra neste roadmap
- microserviços;
- split de repositório;
- redesign visual;
- event-driven amplo;
- reescrita total de auth ou stores.

## Definição de Encerramento por Onda
Cada onda só termina quando:
- o escopo planejado foi implementado;
- o baseline de testes foi rerodado;
- o smoke browser em `hub.local` continua íntegro;
- a fronteira da entrega está documentada de forma objetiva.
