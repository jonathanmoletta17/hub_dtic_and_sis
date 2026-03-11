# PROMPT — Execução do Plano de Limpeza: Codebase hub_dtic_and_sis

> Template: P01 — Análise + Correção Dirigida  
> Destino: antigravity  
> Origem: Relatório de Auditoria de Saúde do Codebase — 2026-03-10  
> Regra absoluta: Executar na ordem exata definida. Nenhuma adição. Apenas remoção, substituição e consolidação.

---

## CONTEXTO

Uma auditoria completa do codebase `tensor-aurora` foi concluída.
O relatório identificou **5 itens prioritários** de limpeza distribuídos em:
- 3 inconsistências arquiteturais com risco de quebra silenciosa
- 2 duplicações de lógica crítica (autenticação e resolução de role)
- 1 endpoint potencialmente morto no backend

O baseline atual é:
- ~65 arquivos `.tsx/.ts` no frontend (~4.500 linhas)
- ~45 arquivos `.py` no backend (~3.000 linhas)
- 3 ocorrências de modelo de permissão frágil (IDs numéricos hardcoded)
- 2 pares de tipos TypeScript duplicados/inconsistentes
- Estimativa de redução: 60–100 linhas após limpeza

**Esta tarefa não cria nenhum arquivo novo.**  
Cada ação é SUBSTITUIR, CONSOLIDAR ou AVALIAR — nunca ADICIONAR.

---

## REGRA CENTRAL

```
ANTES DE QUALQUER ALTERAÇÃO:
1. Ler o arquivo completo
2. Confirmar que o trecho a remover/substituir ainda existe exatamente como descrito
3. Verificar se há outros arquivos que dependem do trecho antes de removê-lo
4. Aplicar a mudança
5. Confirmar que nenhum import quebrou e nenhum tipo divergiu
```

---

## ORDEM DE EXECUÇÃO OBRIGATÓRIA

Os itens devem ser executados nesta sequência exata.
Não pule etapas. Não agrupe etapas diferentes em uma única alteração.

```
ETAPA 1 → Item 1 (IDs hardcoded no Dashboard)
ETAPA 2 → Item 3 (activeHubRole duplicado em Sidebar + Dashboard)
ETAPA 3 → Item 2 (fetch direto substituído por authService)
ETAPA 4 → Item 4 (tipos de Ticket unificados)
ETAPA 5 → Item 5 (avaliação do router items.py)
```

---

## ETAPA 1 — SUBSTITUIR: IDs de grupo hardcoded no Dashboard

### Problema

`web/src/app/[context]/dashboard/page.tsx` contém um mapa com IDs numéricos fixos:

```typescript
const contextGroupMap: Record<string, number | null> = {
  "dtic": null,
  "sis-manutencao": 22,   // ID hardcoded — quebra se mudar no GLPI
  "sis-memoria": 21,      // ID hardcoded — quebra se mudar no GLPI
  "sis": null,
};
```

Se os IDs dos grupos mudarem no GLPI, o frontend quebra silenciosamente.
O backend já envia `group_id` dentro de `activeHubRole` — o frontend deve ler dali.

### Ação

1. Ler `web/src/app/[context]/dashboard/page.tsx` na íntegra
2. Localizar `contextGroupMap` e todos os seus usos no arquivo
3. Identificar o campo exato em `useAuthStore` que contém `activeHubRole.group_id`
   (ou equivalente — confirmar o nome real do campo no store)
4. Substituir toda referência a `contextGroupMap[context]` por `activeHubRole?.group_id`
5. Remover a declaração de `contextGroupMap` completamente
6. Verificar se `contextGroupMap` é exportado ou usado em outros arquivos
   (busca global antes de remover)

### Validação

- O Dashboard carrega corretamente para usuários SIS com context_override `sis-manutencao` e `sis-memoria`
- Nenhum `22` ou `21` permanece hardcoded no arquivo
- O store fornece o `group_id` correto para cada usuário logado

---

## ETAPA 2 — CONSOLIDAR: Lógica duplicada de activeHubRole

### Problema

A resolução de `activeHubRole` (qual role o usuário tem no contexto atual) está sendo
recalculada manualmente em pelo menos dois componentes além do store:

- `web/src/components/ui/AppSidebar.tsx` — recalcula `activeHubRole` localmente
- `web/src/app/[context]/dashboard/page.tsx` — recalcula `activeHubRole` localmente

Se um componente decide que o usuário é `"gestor"` e outro decide `"tecnico"`,
a interface exibe comportamentos contraditórios para o mesmo usuário.

### Ação

1. Ler `useAuthStore.ts` na íntegra — identificar o campo que armazena `active_hub_role`
   após login (confirmar nome exato: `currentUserRole.active_hub_role` ou similar)
2. Ler `AppSidebar.tsx` — localizar onde `activeHubRole` é calculado localmente
3. Substituir o cálculo local por leitura direta do store:
   ```typescript
   // REMOVER: lógica local de cálculo
   // SUBSTITUIR por:
   const { active_hub_role } = useAuthStore(s => s.currentUserRole)
   ```
4. Ler `dashboard/page.tsx` — localizar onde `activeHubRole` é calculado localmente
5. Aplicar a mesma substituição
6. Confirmar que nenhum dos dois arquivos mantém lógica de cálculo de role após a mudança

### Validação

- A sidebar exibe os mesmos módulos que o dashboard para o mesmo usuário
- Um gestor não aparece como técnico em nenhum componente
- O store é a única fonte de verdade de `activeHubRole`

---

## ETAPA 3 — CONSOLIDAR: Chamadas fetch diretas substituídas por authService

### Problema

Dois arquivos implementam login diretamente com `fetch` em vez de usar o `authService` centralizado:

- `web/src/app/selector/page.tsx`
- `web/src/components/chargers/ChargerAuthModal.tsx`

Isso significa:
- Não passam pelos interceptors globais de erro e loading
- A base URL não é centralizada — se mudar, quebra em dois lugares
- Se a lógica de auth evoluir, precisa ser atualizada manualmente nos dois arquivos

### Ação

1. Ler `authService.ts` (ou equivalente) — identificar a função de login disponível
   (ex: `authService.login(username, password, context)`)
2. Ler `selector/page.tsx` — localizar o bloco `fetch` de autenticação
3. Substituir o `fetch` direto pela chamada ao `authService`
4. Remover imports de `fetch` ou constantes de URL duplicadas que se tornarem órfãos
5. Repetir para `ChargerAuthModal.tsx`
6. Confirmar que os dois arquivos não contêm mais chamadas diretas a endpoints de auth

### Validação

- Login via `selector/page.tsx` continua funcionando
- Login via `ChargerAuthModal.tsx` continua funcionando
- Erros de autenticação são tratados pelo interceptor global (não por try/catch local duplicado)

---

## ETAPA 4 — CONSOLIDAR: Tipos duplicados de Ticket

### Problema

Existem dois tipos TypeScript representando tickets com estruturas divergentes:

- `web/src/types/charger.ts` → `KanbanDemand` (status como `number`, campo `date`)
- `web/src/lib/api/types.ts` → `TicketSummary` (status como `string`, campo `dateCreated`)

Isso força conversões desnecessárias entre componentes que usam tipos diferentes
para o mesmo dado, aumentando risco de bug e dificultando manutenção.

### Ação

1. Ler `charger.ts` na íntegra — mapear todos os campos de `KanbanDemand`
2. Ler `types.ts` na íntegra — mapear todos os campos de `TicketSummary`
3. Comparar os dois tipos campo a campo — identificar:
   - Campos idênticos com nomes diferentes (`date` vs `dateCreated`)
   - Campos com tipos diferentes (`status: number` vs `status: string`)
   - Campos exclusivos de cada tipo
4. Propor um tipo base unificado `TicketBase` com os campos comuns
5. Fazer `KanbanDemand` e `TicketSummary` extenderem `TicketBase` com seus campos específicos
6. Buscar todos os arquivos que importam `KanbanDemand` ou `TicketSummary`
7. Verificar se algum arquivo precisa ser ajustado para o novo tipo base
8. Aplicar a unificação
9. Remover definições duplicadas de campos que passaram para `TicketBase`

### Validação

- Nenhum componente quebra após a unificação
- Conversões explícitas entre os dois tipos foram eliminadas
- `status` tem tipo consistente em todos os componentes que o usam

---

## ETAPA 5 — AVALIAR: Router genérico items.py

### Problema Potencial

`app/routers/items.py` implementa um CRUD genérico via `/{itemtype}` que pode não ter
consumidor no frontend atual. Se confirmado, representa superfície de ataque desnecessária.

### Ação

1. Ler `items.py` na íntegra — listar todos os endpoints expostos
2. Busca global no frontend por chamadas a esses endpoints:
   - Procurar por `"/items/"`, `"itemtype"` em arquivos `.ts` e `.tsx`
   - Procurar por referências ao router em `httpClient.ts` ou services
3. Verificar se `items.py` é registrado no `main.py` / `app.py` (está ativo?)
4. Resultado:

```
SE nenhum consumidor for encontrado:
  → Registrar como candidato a remoção na Knowledge Base (INCIDENT ABERTO)
  → NÃO remover agora — documentar para decisão consciente

SE consumidores forem encontrados:
  → Listar quais endpoints são usados e por quais componentes
  → Marcar como VALIDADO na Knowledge Base
```

### Validação

- Decisão documentada com evidência (lista de consumidores ou ausência deles)
- Nenhuma remoção sem confirmação

---

## FORMATO DE ENTREGA

Para cada etapa, entregar:

```
ETAPA [n] — [nome]
  Status: CONCLUÍDA | PARCIAL | BLOQUEADA
  
  Arquivos alterados:
    - [caminho] — [o que mudou]
  
  Linhas removidas: [n]
  Linhas substituídas: [n]
  
  Validação:
    ✅ [critério] — confirmado
    ❌ [critério] — problema encontrado: [descrição]
  
  Observações: [qualquer desvio do plano ou descoberta adicional]
```

**Ao final de todas as etapas:**

```
MÉTRICAS PÓS-LIMPEZA

Frontend:
  Arquivos .tsx/.ts: [n] (era ~65)
  Linhas removidas: [n] (meta: 60-100)
  Ocorrências de ID hardcoded: [n] (era 3, meta: 0)
  Duplicações de lógica de role: [n] (era 2, meta: 0)

Backend:
  items.py: VALIDADO | CANDIDATO A REMOÇÃO

Registros para Knowledge Base:
  - [lista de SOLUTIONs e ADRs gerados]
```

---

## CRITÉRIOS FINAIS

- Nenhum arquivo novo criado durante a execução
- Cada etapa validada antes de iniciar a próxima
- Se uma etapa revelar dependência não mapeada, PARAR e reportar antes de continuar
- Ao final, o modelo de permissão frágil (IDs numéricos) deve ter zero ocorrências no frontend
- A fonte de verdade de `activeHubRole` deve ser exclusivamente o Zustand store

---

*Gerado via PROMPT_LIBRARY — P01 Execução de Limpeza | hub_dtic_and_sis | 2026-03-10*
