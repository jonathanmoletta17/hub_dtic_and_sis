# B3 — Diagnóstico de Inconsistências (Search + FormCreator + Fallback de Permissões)

Data da análise: 2026-03-16  
Ambiente: `http://hub.local:8080` (stack Docker local)

## 1) Search: divergência entre cards e resultados

## Evidência técnica
- Cards de Search vêm de `GET /api/v1/{context}/db/stats` (conta `status IN (1,2,3,4,5)` e define `em_atendimento = status 2 + 3`) em [app/services/stats_service.py](/home/jonathan-moletta/projects/tensor-aurora/app/services/stats_service.py).
- Lista vinha de `GET /api/v1/{context}/db/tickets` com `limit` e sem escopo equivalente, mais filtro local exato por `statusId` no hook antigo em [web/src/modules/search/hooks/useTicketsSearch.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/hooks/useTicketsSearch.ts).
- Na base atual (SIS), medição direta na API mostrou:
  - `status=2` => `28`
  - `status=3` => `2`
  - `status=2,3` => `30`
  - escopo `1,2,3,4,5` => `39`

## Causa-raiz
- Contrato semântico dos cards (`2+3`) não estava refletido no filtro aplicado quando o usuário clicava em “Em Atendimento”.
- A percepção de “apareceu do nada” é compatível com mudança de distribuição dos dados (aumento de tickets em `status=3`), não necessariamente com bug novo de backend.

## Correção aplicada
- Hook Search agora usa escopo padrão explícito `status=[1,2,3,4,5]`.
- Clique em “Em Atendimento” mapeia para `status=[2,3]`.
- Filtro de status passou para a query da API (não local sobre subconjunto).
- Regressão coberta por teste em [web/src/modules/search/hooks/useTicketsSearch.test.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/modules/search/hooks/useTicketsSearch.test.tsx).

## 2) Novo Chamado SIS: duplicidade de categorias/serviços

## Evidência técnica
- `GET /api/v1/sis/domain/formcreator/forms` retornou `36` formulários.
- Não há ID duplicado, mas há `15` pares duplicados por `(category_id + name)` no próprio dado de origem.
- Exemplos: `Carregadores` (`id 3` e `22`), `Copa` (`4` e `23`), `Ar-Condicionado` (`1` e `21`), etc.
- Comparação de schema por `GET /forms/{id}/schema` mostrou:
  - 14 pares com schema idêntico;
  - 1 par com diferença real (`Projeto`: ids `15` e `36`).

## Causa-raiz
- A duplicidade nasce no GLPI/FormCreator (dado de origem), não na UI.
- O frontend apenas passou a expor esse dado de forma direta após convergência para contratos reais.

## Correção aplicada (não destrutiva)
- Catálogo agora desambigua nomes duplicados exibindo `(<ID>)` no item em [web/src/lib/api/mappers/formcreator.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/mappers/formcreator.ts).
- Cobertura em [web/src/lib/api/mappers/formcreator.test.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/mappers/formcreator.test.ts).

## 3) Fallback sem `X-Active-Hub-Role`: onde está e como funciona

## Definição atual
- Implementado em [app/core/authorization.py](/home/jonathan-moletta/projects/tensor-aurora/app/core/authorization.py):
  - com header: autorização por papel ativo;
  - sem header: fallback legado por união de todos os papéis da sessão.
- O frontend injeta `X-Active-Hub-Role` no client em [web/src/lib/api/httpClient.ts](/home/jonathan-moletta/projects/tensor-aurora/web/src/lib/api/httpClient.ts) quando há papel operacional ativo.
- Nesta rodada, fallback legado recebeu `warning` explícito em log para observabilidade.

## Implicação
- Esse fallback é mecanismo de compatibilidade transitória e precisa estar formalizado na matriz permissional como “modo legado”.

## 4) Riscos remanescentes identificados

- Dashboard (`/[context]/dashboard`) busca resolvidos com `limit: 200` para o Kanban. Se volume real de `status=5` exceder 200, pode haver diferença entre card e itens exibidos em [web/src/app/[context]/dashboard/page.tsx](/home/jonathan-moletta/projects/tensor-aurora/web/src/app/[context]/dashboard/page.tsx).
- Duplicidade de forms no GLPI segue ativa; a UI está resiliente, mas o dado raiz continua inconsistente.

## 5) Próximos passos recomendados (com decisão de negócio)

1. Permissões:
   - Decidir data de corte para desativar fallback por união de papéis.
   - Até lá, manter warning e adicionar métrica/contador de ocorrências.
2. FormCreator:
   - Definir política de governança para forms duplicados no GLPI (higienizar ou manter pares válidos por regra).
   - Para pares iguais de fato, consolidar IDs no GLPI reduzindo ruído de catálogo.
3. Regressão:
   - Manter teste de Search recém-adicionado.
   - Adicionar cenário E2E cobrindo clique nos cards de status e validação de total exibido.
