# PROMPT 3/3 — Conexão e Validação E2E: PermissionsMatrix ↔ Backend

> Sequência: ETAPA 1 ✅ → ETAPA 2 ✅ → ETAPA 3  
> PRÉ-REQUISITO OBRIGATÓRIO: Os 3 endpoints do Prompt 2/3 implementados e testados.  
> Destino: antigravity  
> Regra: Substituir mocks por chamadas reais. Validar cada fluxo ponta a ponta.

---

## CONTEXTO

Os 3 endpoints de administração estão implementados e testados no backend.
O `PermissionsMatrix.tsx` já tem a interface construída.

Esta etapa conecta os dois lados — substitui todas as chamadas simuladas/mockadas
por chamadas reais aos endpoints implementados — e valida cada fluxo E2E com
o usuário `jonathan-moletta` como gestor.

---

## PRÉ-LEITURA OBRIGATÓRIA

Antes de qualquer alteração:

```
[ ] Ler o contrato entregue pelo Prompt 1/3 (tipos e URLs)
[ ] Ler o resultado do Prompt 2/3 (schemas reais implementados)
[ ] Comparar: algum campo mudou entre o contrato esperado e o implementado?
    Se sim → documentar divergências antes de prosseguir
[ ] Ler PermissionsMatrix.tsx na íntegra (estado atual — pode ter mudado)
```

---

## FASE 1 — RECONCILIAÇÃO DE CONTRATOS

### 1.1 — Comparar tipos TypeScript vs. schemas Python

Para cada campo retornado pelos endpoints, verificar se o tipo TypeScript no frontend
está alinhado com o que o backend efetivamente retorna:

```
Campo backend (Python)    | Tipo Python   | Campo frontend (TS)    | Tipo TS     | Alinhado?
─────────────────────────────────────────────────────────────────────────────────────────
id                        | int           | id                     | number      | ✅
hub_role                  | str           | hubRole                | string      | ⚠️ snake vs camel
...
```

### 1.2 — Resolver divergências antes de conectar

Para cada divergência encontrada:
- Se é apenas camelCase/snake_case → adicionar transformação no serviço HTTP
- Se é tipo diferente (ex: `str` vs `number`) → corrigir o lado errado
- Se é campo faltante → adicionar no backend ou ajustar o frontend para não depender dele

**Regra:** Corrigir divergências antes de conectar. Conectar com divergência garante bugs silenciosos.

---

## FASE 2 — ATUALIZAR O SERVIÇO HTTP

### 2.1 — Localizar ou criar o arquivo de serviço

Verificar se existe `web/src/lib/api/adminService.ts` ou equivalente.
Se não existe, criar seguindo o padrão do `chargerService.ts`.

### 2.2 — Implementar as 3 funções de serviço

```typescript
// adminService.ts

/**
 * Busca todos os usuários com seus módulos, roles e alertas de diagnóstico.
 * Substitui o mock/chamada simulada de diagnóstico.
 */
export async function fetchUsersDiagnostics(context: string): Promise<DiagnosticsResponse> {
  return request(`/${context}/admin/users/diagnostics`, { method: "GET" });
}

/**
 * Atribui um grupo Hub-App-* a um usuário.
 * Substitui o mock de atribuição de módulo.
 */
export async function assignModuleToUser(
  context: string,
  userId: number,
  groupId: number
): Promise<AssignGroupResponse> {
  return request(`/${context}/admin/users/${userId}/groups/${groupId}`, { method: "POST" });
}

/**
 * Revoga um grupo Hub-App-* de um usuário.
 * Substitui o mock de revogação de módulo.
 */
export async function revokeModuleFromUser(
  context: string,
  userId: number,
  groupId: number
): Promise<RevokeGroupResponse> {
  return request(`/${context}/admin/users/${userId}/groups/${groupId}`, { method: "DELETE" });
}
```

Usar `request` do `httpClient.ts` existente — não criar novo fetch direto.

---

## FASE 3 — CONECTAR O PERMISSIONSMATRIX

### 3.1 — Substituir chamadas simuladas

Para cada chamada identificada no Prompt 1/3 como **SIMULADA** ou **PENDENTE**:

**Antes (mock/simulado):**
```typescript
// Exemplo de padrão a remover:
const mockData = [{ id: 1, name: "..." }]
setUsers(mockData)
// ou:
await new Promise(resolve => setTimeout(resolve, 500)) // fake delay
```

**Depois (real):**
```typescript
const data = await fetchUsersDiagnostics(context)
setUsers(data.users)
```

### 3.2 — Conectar o toggle de atribuição

O toggle de ativar/desativar módulo deve:

```typescript
// Ao ativar toggle para ON:
async function handleToggleOn(userId: number, groupId: number) {
  setLoadingModule(groupId, true)         // feedback visual imediato
  try {
    await assignModuleToUser(context, userId, groupId)
    // atualizar estado local sem refetch completo:
    setUserModuleAccess(userId, groupId, true)
    showToast("Acesso concedido com sucesso")
  } catch (error) {
    showToast("Erro ao conceder acesso — tente novamente", "error")
  } finally {
    setLoadingModule(groupId, false)
  }
}

// Ao ativar toggle para OFF:
async function handleToggleOff(userId: number, groupId: number) {
  setLoadingModule(groupId, true)
  try {
    await revokeModuleFromUser(context, userId, groupId)
    setUserModuleAccess(userId, groupId, false)
    showToast("Acesso revogado")
  } catch (error) {
    showToast("Erro ao revogar acesso", "error")
  } finally {
    setLoadingModule(groupId, false)
  }
}
```

**Atenção:** Verificar se o componente já tem a estrutura desses handlers ou se precisam ser criados.

### 3.3 — Conectar o Painel de Diagnóstico

Os alertas vêm no payload do Endpoint 1 (`user.alerts[]`).
Verificar se o componente de diagnóstico já renderiza alertas de uma prop
ou se ainda usa alertas hardcoded/mockados.

Conectar os alertas reais:
```typescript
// Renderizar alertas dinâmicos:
{user.alerts.map(alert => (
  <DiagnosticAlert
    key={alert.type}
    severity={alert.severity}
    message={alert.message}
    onQuickFix={alert.quick_fix_group_id
      ? () => handleToggleOn(user.id, alert.quick_fix_group_id)
      : undefined
    }
  />
))}
```

### 3.4 — Loading state do diagnóstico inicial

O endpoint de diagnóstico pode ser lento (consultas ao GLPI).
Garantir que existe:
- Skeleton ou spinner enquanto carrega
- Mensagem de erro se o endpoint falhar
- Botão de retry se necessário

---

## FASE 4 — VALIDAÇÃO E2E COMPLETA

Executar cada cenário com `jonathan-moletta` logado como gestor DTIC.

### Cenário 1 — Carregamento inicial da tela
```
[ ] Acessar /dtic/permissoes
[ ] A tela carrega sem erro de console
[ ] A lista de usuários aparece com dados reais do GLPI
[ ] Cada usuário mostra seus módulos atuais (Hub-App-* que possui)
[ ] Roles corretos exibidos (gestor/tecnico/solicitante)
[ ] Alertas de diagnóstico aparecem para usuários com configuração incompleta
```

### Cenário 2 — Atribuir módulo a um usuário de teste
```
[ ] Escolher um usuário de teste (não jonathan-moletta)
[ ] Verificar que ele NÃO tem acesso ao Hub-App-busca (109)
[ ] Clicar no toggle para ativar Hub-App-busca
[ ] Toggle mostra loading/spinner durante a chamada
[ ] Toggle vai para ON após sucesso
[ ] Toast "Acesso concedido" aparece
[ ] Verificar no GLPI diretamente: GET /User/{id}/Group_User → grupo 109 presente ✅
```

### Cenário 3 — Revogar módulo do mesmo usuário de teste
```
[ ] Com o usuário do Cenário 2 com acesso ao Hub-App-busca
[ ] Clicar toggle para OFF
[ ] Loading durante chamada
[ ] Toggle vai para OFF após sucesso
[ ] Toast "Acesso revogado" aparece
[ ] Verificar no GLPI: GET /User/{id}/Group_User → grupo 109 ausente ✅
```

### Cenário 4 — Quick Fix de diagnóstico
```
[ ] Identificar um alerta real no painel (ou criar situação: remover gestor do Hub-App-permissoes)
[ ] Alerta aparece: "Usuário X tem role gestor mas não está no Hub-App-permissoes"
[ ] Clicar em "Autorreparar" / quick fix
[ ] Verificar que o fluxo 1 é disparado nos bastidores
[ ] Alerta some após resolução ✅
```

### Cenário 5 — Contexto SIS
```
[ ] Acessar /sis/permissoes
[ ] Lista de usuários SIS carrega (diferentes dos DTIC)
[ ] Módulos SIS aparecem (carregadores, sis-dashboard, etc.)
[ ] Atribuição/revogação funciona no SIS com group_ids corretos (102-105)
```

### Cenário 6 — Regressão: usuário solicitante não vê a tela
```
[ ] Logar com usuário que tem role "solicitante"
[ ] Tentar acessar /dtic/permissoes
[ ] ContextGuard bloqueia e redireciona ✅ (não deve quebrar)
```

---

## FASE 5 — CHECKLIST FINAL DE QUALIDADE

```
CÓDIGO
[ ] Nenhum mock ou fake delay permanece no componente
[ ] Nenhum fetch direto — tudo via adminService.ts
[ ] Tipos TypeScript alinhados com schemas do backend
[ ] Loading states em todos os toggles e no carregamento inicial
[ ] Tratamento de erro com feedback visual em todos os fluxos

SEGURANÇA
[ ] Frontend não expõe endpoints de admin para roles não-gestor
[ ] Backend valida role "gestor" em todos os endpoints de escrita
[ ] group_id validado contra lista Hub-App-* (sem group_id arbitrário)

PERFORMANCE
[ ] Diagnóstico inicial não trava a UI (loading skeleton presente)
[ ] Toggle responde em < 1s para o usuário (feedback otimista ou loading claro)
[ ] Sem requisições duplicadas no mount do componente

REGRESSÃO
[ ] Tela de carregadores continua funcionando ✅
[ ] KB continua com canViewAll e canManageArticles corretos ✅
[ ] Login/logout não afetado ✅
[ ] Troca de contexto DTIC↔SIS não quebra ✅
```

---

## FORMATO DE ENTREGA

```
RECONCILIAÇÃO DE CONTRATOS
  Divergências encontradas: [n]
  [lista: campo | tipo esperado | tipo real | resolução]

IMPLEMENTAÇÃO

  adminService.ts: [criado / atualizado]
  PermissionsMatrix.tsx: [n linhas alteradas]
  Mocks removidos: [n]
  Handlers conectados: [lista]
  Alertas dinâmicos conectados: [sim/não]

VALIDAÇÃO E2E
  Cenário 1 — Carregamento: [✅ / ❌ + descrição]
  Cenário 2 — Atribuição: [✅ / ❌]
  Cenário 3 — Revogação: [✅ / ❌]
  Cenário 4 — Quick Fix: [✅ / ❌]
  Cenário 5 — SIS: [✅ / ❌]
  Cenário 6 — Regressão solicitante: [✅ / ❌]

CHECKLIST FINAL
  [cada item marcado com ✅ ou ❌ + observação]

REGISTROS PARA KNOWLEDGE BASE
  - SOLUTION: "PermissionsMatrix conectada ao backend — tela de acessos 100% funcional"
  - ADR: "Atualização otimista de UI vs. refresh completo nos toggles de módulo"
  - SOLUTION: "Fluxo E2E de gestão de acessos validado — DTIC e SIS"
```

---

## CRITÉRIOS FINAIS

- Todos os 6 cenários E2E devem passar antes de considerar a feature completa
- Zero mocks no componente após esta etapa
- O checklist final deve ter 100% de itens marcados como ✅
- Qualquer ❌ no checklist bloqueia a conclusão — deve ser resolvido nesta etapa

---

*Gerado via PROMPT_LIBRARY — P01 Conexão E2E | hub_dtic_and_sis | 2026-03-10 | Etapa 3/3*
