# PROMPT — Investigação de Regressão: CRUD da Base de Conhecimento desapareceu

> Template: P01 — Análise e Diagnóstico Técnico  
> Destino: antigravity  
> Escopo: `knowledge/page.tsx` + store + histórico de commits  
> REGRA ABSOLUTA: ZERO alterações. Apenas leitura, análise e diagnóstico.  
> Esta tarefa termina com um relatório. Nenhuma linha de código é tocada.

---

## CONTEXTO

A Base de Conhecimento do Hub (contexto DTIC) apresenta regressão confirmada.

**Estado anterior (validado e em produção):**
Técnicos e Gestores no contexto DTIC possuíam botões e funcionalidades de:
- Criação de artigos na base de conhecimento
- Edição de artigos existentes
- Exclusão de artigos

Essas funcionalidades foram implementadas, testadas, validadas e consolidadas.

**Estado atual (observado na imagem — 2026-03-10 17:08):**
Usuário `jonathan-moletta` logado como `SUPER-ADMIN` no contexto DTIC.
A Base de Conhecimento exibe 21 artigos normalmente.
**Os botões de criação, edição e exclusão não aparecem em nenhum ponto da interface.**

Esta é uma regressão — não um bug de implementação nova.
Algo que funcionava foi quebrado por uma alteração posterior.

---

## OBJETIVO

Identificar **com precisão cirúrgica**:

1. Onde no código os botões/ações de CRUD estão condicionados
2. Qual condição está sendo avaliada para exibir ou ocultar esses controles
3. Qual alteração recente quebrou essa condição
4. Por que a regressão passou despercebida (ausência de teste de regressão)
5. Qual é o padrão de regressão que está se repetindo no projeto

---

## FASE 1 — LOCALIZAÇÃO DO CÓDIGO DE CRUD

### 1.1 — Encontrar onde os botões são renderizados

Buscar em `web/src/app/[context]/knowledge/` e subdiretórios por:
- Botões de "Novo Artigo", "Criar", "Editar", "Excluir" ou equivalentes
- Ícones de edição/exclusão em cards ou linhas de artigos
- Componentes com nomes como `KnowledgeActions`, `ArticleControls`, `EditButton`
- Qualquer `<button>` ou `<Button>` dentro do contexto da KB com ação de criação/edição

Para cada ocorrência encontrada, registrar:
```
Arquivo: [caminho]
Linha: [número]
Elemento: [trecho do JSX]
Condição de exibição: [a expressão booleana que controla o render]
```

### 1.2 — Mapear a condição de visibilidade dos controles

A maioria dos controles de CRUD é condicional. Identificar o padrão exato:

```typescript
// Exemplos de padrões a procurar:
{canEdit && <button>Editar</button>}
{isAdmin && <EditIcon />}
{userRole === 'gestor' && <CreateButton />}
{canViewAll && <ArticleActions />}
{hasPermission('knowledge:write') && <Controls />}
```

Registrar a expressão booleana completa que controla cada controle de CRUD.

### 1.3 — Rastrear de onde vem a flag de permissão

Para cada flag identificada em 1.2 (ex: `canEdit`, `canViewAll`, `isAdmin`):
- De onde é derivada? (store, prop, cálculo local, contexto React)
- Qual campo do store/payload determina seu valor?
- A flag existia antes? Ela mudou de nome ou de origem?

---

## FASE 2 — ANÁLISE DO ESTADO ATUAL DAS FLAGS DE PERMISSÃO

### 2.1 — Verificar o valor de canViewAll para o usuário atual

Já sabemos que `canViewAll` em `knowledge/page.tsx` é calculado como:

```typescript
const canViewAll = profileId === TECHNICIAN_PROFILE_ID || profileId === MANAGER_PROFILE_ID;
// TECHNICIAN_PROFILE_ID = 6
// MANAGER_PROFILE_ID = 20
```

O usuário `jonathan-moletta` é `SUPER-ADMIN` com Profile ID 4.
Portanto: `canViewAll = (4 === 6) || (4 === 20)` → `false`

**Hipótese H1:** Os controles de CRUD dependem de `canViewAll === true`.
Se `canViewAll = false`, os botões não são renderizados.
Verificar se essa é exatamente a condição que controla os botões.

### 2.2 — Verificar se canViewAll era a fonte de verdade dos botões de CRUD

Confirmar se antes da adição do Profile ID 4, o SUPER-ADMIN usava o Profile ID 20 (gestor).
Nesse caso: `canViewAll = (20 === 20)` → `true` → botões apareciam.
Após a migração para Profile ID 4: `canViewAll = (4 === 20)` → `false` → botões somem.

Se esta hipótese for confirmada, a raiz da regressão é a **mesma causa** do bug de visibilidade
de artigos: o `contexts.yaml` foi atualizado com Profile ID 4 para gestor,
mas o código do frontend não foi atualizado para reconhecer esse novo ID.

### 2.3 — Verificar se há flags separadas para CRUD vs. visualização

Podem existir duas flags distintas:
- Uma para `canViewAll` (ver todos os artigos)
- Outra para `canEdit`/`canCreate`/`canDelete` (ações de modificação)

Verificar se as flags de CRUD são derivadas de `canViewAll` ou calculadas independentemente.
Se independentes, a causa raiz pode ser diferente de H1.

### 2.4 — Verificar o estado atual no browser (DevTools)

Instruções para coleta de evidência ao vivo:

```
1. Acessar carregadores.local:8080/dtic/knowledge com jonathan-moletta (SUPER-ADMIN)
2. Abrir DevTools (F12)
3. Aba Application → Local Storage → capturar o objeto de autenticação completo
4. Verificar os campos:
   - currentUserRole.active_hub_role.role → deve ser "gestor"
   - currentUserRole.roles.active_profile.id → verificar se é 4 ou 20
   - currentUserRole.app_access → verificar se "permissoes" está presente
5. Aba Console → digitar:
   window.__zustand_store?.getState()?.currentUserRole
   (ou o equivalente para inspecionar o store Zustand)
6. Capturar o output completo
```

---

## FASE 3 — INVESTIGAÇÃO DO HISTÓRICO DE REGRESSÃO

### 3.1 — Identificar quando os botões desapareceram

Verificar o histórico de commits do arquivo `knowledge/page.tsx`:

```bash
git log --oneline web/src/app/[context]/knowledge/page.tsx
git log --oneline web/src/app/\\[context\\]/knowledge/page.tsx
```

Para cada commit recente (últimos 10):
- Data e mensagem do commit
- Quais linhas foram alteradas (`git show [hash] -- [arquivo]`)
- Se alguma alteração afetou a lógica de `canViewAll` ou as condições de render dos botões

### 3.2 — Verificar o commit que adicionou Profile ID 4 ao contexts.yaml

```bash
git log --oneline app/core/contexts.yaml
git log --oneline app/core/contexts.yaml | head -5
```

Identificar:
- O commit que adicionou `4: { role: gestor }` ao contexts.yaml
- Se nesse mesmo commit (ou em commits próximos) houve atualização em `knowledge/page.tsx`
- Se não houve → confirmação de que a atualização do YAML não foi acompanhada de
  atualização do frontend

### 3.3 — Verificar o commit da limpeza/refatoração recente

A limpeza do codebase pode ter removido algo inadvertidamente.
Verificar commits recentes no repositório:

```bash
git log --oneline --since="7 days ago"
git diff HEAD~5 HEAD -- web/src/app/[context]/knowledge/page.tsx
```

Identificar se algum commit de "limpeza", "refatoração" ou "consolidação" removeu:
- Botões de criação/edição/exclusão
- Imports de componentes de ação
- Condicionais que exibiam os controles

---

## FASE 4 — ANÁLISE DO PADRÃO DE REGRESSÃO

Esta é a fase mais importante. Não apenas "o que quebrou" — mas "por que continua quebrando".

### 4.1 — Padrão identificado no projeto

O projeto apresenta um padrão recorrente de regressão que precisa ser nomeado e documentado:

**Padrão: Acoplamento entre evolução de configuração e lógica hardcoded no frontend**

```
1. Uma funcionalidade é implementada usando um valor hardcoded (ex: profile_id = 20)
2. A funcionalidade funciona → validada → consolidada
3. Uma mudança legítima acontece em outro lugar (ex: contexts.yaml adiciona profile_id = 4)
4. O código hardcoded não é atualizado
5. A funcionalidade para de funcionar silenciosamente para o novo perfil
6. Nenhum erro aparece no console — apenas ausência de elemento na UI
7. A regressão é descoberta manualmente, tarde
```

### 4.2 — Inventário de outros pontos com o mesmo padrão de risco

Com base no mapa de código já existente, identificar todos os outros pontos do frontend
onde uma condição de exibição de feature depende de um valor hardcoded que pode
ser invalidado por uma mudança no `contexts.yaml`:

```
Para cada ponto encontrado:
  Arquivo: [caminho]
  Linha: [número]
  Condição atual: [código]
  Risco: Se [mudança X] acontecer no contexts.yaml, esta feature some silenciosamente
```

### 4.3 — Por que o teste de regressão não pegou isso

Identificar a ausência de proteção:
- Há testes automatizados para a KB? (`*.test.tsx` ou `*.spec.ts`)
- Se não há, a regressão só é detectável por inspeção visual manual
- Isso explica por que funcionalidades validadas continuam regredindo

---

## FASE 5 — RELATÓRIO FINAL DE DIAGNÓSTICO

### Formato obrigatório de saída

```
════════════════════════════════════════════
DIAGNÓSTICO: REGRESSÃO KB — CRUD DESAPARECEU
Data: [data] | Usuário afetado: jonathan-moletta (SUPER-ADMIN, Profile 4)
════════════════════════════════════════════

1. LOCALIZAÇÃO DOS CONTROLES DE CRUD
   Arquivo: [caminho]
   Linha(s): [números]
   Condição de exibição: [código exato]

2. CAUSA RAIZ DA REGRESSÃO
   [Descrição técnica completa do mecanismo de falha]

3. LINHA DO TEMPO DA REGRESSÃO
   [Data do commit que introduziu o problema]
   [O que foi alterado e o que deveria ter sido atualizado junto]

4. HIPÓTESES (com status de confirmação)
   H1: [descrição] → CONFIRMADA / DESCARTADA / PENDENTE
   H2: [descrição] → ...

5. OUTROS PONTOS COM MESMO PADRÃO DE RISCO
   [Lista de arquivos/linhas vulneráveis ao mesmo tipo de regressão]

6. ANÁLISE DO PADRÃO RECORRENTE
   [Por que isso continua acontecendo no projeto]
   [O que está faltando no processo de desenvolvimento]

7. AÇÕES RECOMENDADAS (para tarefa separada)
   CORREÇÃO IMEDIATA: [o que corrigir na KB]
   CORREÇÃO ESTRUTURAL: [como eliminar o padrão de risco]
   PREVENÇÃO: [o que implementar para não acontecer de novo]

8. REGISTROS PARA A KNOWLEDGE BASE
   - INCIDENT: [título da regressão]
   - PATTERN: [nome do padrão recorrente identificado]
```

---

## CRITÉRIOS DE QUALIDADE

- A causa raiz deve ser identificada até o nível de linha de código e commit
- O padrão recorrente deve ser nomeado e descrito com precisão suficiente
  para ser reconhecido quando aparecer novamente
- Os outros pontos de risco devem ser listados com localização exata —
  não de forma genérica
- Este relatório é a base para duas tarefas subsequentes:
  1. Correção da regressão da KB (tarefa separada)
  2. Eliminação do padrão hardcoded em todos os pontos identificados (tarefa separada)

---

## NOTA CRÍTICA

Esta é a terceira ocorrência documentada do mesmo padrão neste projeto:

1. **KB — visibilidade de artigos:** Profile ID 4 não estava em `MANAGER_PROFILE_ID`
   → gestores SUPER-ADMIN viam apenas FAQs
2. **KB — botões de CRUD:** mesma causa ou derivada
   → gestores SUPER-ADMIN perderam controles de edição
3. **Outros pontos de risco:** ainda não mapeados → próxima regressão não identificada

O problema não é cada bug individual.
O problema é a **ausência de uma camada de abstração** entre a configuração
(`contexts.yaml`) e a lógica de permissão do frontend.

Enquanto o frontend continuar verificando IDs numéricos hardcoded,
qualquer evolução do `contexts.yaml` vai produzir uma regressão silenciosa.

---

*Gerado via PROMPT_LIBRARY — P01 Investigação de Regressão | hub_dtic_and_sis | 2026-03-10*
