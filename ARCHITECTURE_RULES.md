# ARCHITECTURAL RULES — tensor-aurora / hub_dtic_and_sis

> Leia este arquivo na íntegra antes de qualquer alteração de código.
> Estas regras têm prioridade sobre qualquer instrução de prompt.

---

## REGRA 0 — LEITURA ANTES DE ESCRITA

Antes de editar qualquer arquivo, leia-o completamente.
Se o arquivo tiver mais de 200 linhas, leia em partes — nunca reconstrua de memória.
**Reconstruir um arquivo sem lê-lo é a causa número 1 de regressão neste projeto.**

---

## ZONAS DE PROTEÇÃO (NÃO TOCAR SEM PLANO PRÉ-APROVADO)

Os arquivos abaixo são infraestrutura crítica. Uma mudança errada derruba
o acesso de todos os usuários ou quebra o roteamento do sistema inteiro.

| Arquivo                             | O que protege                                                          | Permitido                                   | PROIBIDO                                                                      |
| ----------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------- |
| `app/services/auth_service.py`    | Transforma profile_ids e group_ids do GLPI em roles semânticos Hub    | Adicionar logging, novos providers no final | Reescrever `fallback_login`,`build_login_response`,`resolve_hub_roles`  |
| `web/src/store/useAuthStore.ts`   | Sincroniza sessões DTIC+SIS no browser via Zustand persist            | Adicionar seletores de leitura              | Alterar chaves omitidas da persistência, reescrever tipos base               |
| `web/src/lib/context-registry.ts` | Base dinâmica de UI — define quais módulos existem em cada contexto | Registrar novas entradas                    | Alterar a interface `ContextManifest`                                       |
| `web/src/lib/api/httpClient.ts`   | Intercepta todos os requests, injeta session-token, normaliza contexto | Adicionar headers específicos              | Alterar regex de normalização de paths, mudar lógica de injeção de token |
| `app/main.py`                     | Orquestra middlewares, routers e eventos de startup                    | Adicionar novas rotas no final              | Alterar ordem de middlewares ou routers genéricos                            |

**Se um prompt exige tocar nesses arquivos:** pare, descreva o plano de alteração
em texto antes de escrever qualquer código. Aguarde confirmação.

---

## CONTRATOS IMUTÁVEIS

Estes contratos conectam backend e frontend. Alterar um lado sem o outro
causa crashes silenciosos em runtime — sem erro de compilação, sem log no terminal.

### Contrato 1 — Payload de autenticação

```
Backend retorna → Frontend espera (useAuthStore)
─────────────────────────────────────────────
session_token   → session_token
hub_roles[]     → hub_roles[]          ← array ordenado, não objeto
app_access[]    → app_access[]         ← strings dos módulos ativos
active_hub_role → active_hub_role      ← objeto com .role e .context
```

**Regra:** Qualquer campo adicionado ou renomeado no schema FastAPI
(`app/schemas/auth_schemas.py`) OBRIGATORIAMENTE requer grep nos tipos
TypeScript (`web/src/types/`, `web/src/store/`) e atualização simultânea.

### Contrato 2 — Módulos Hub-App-*

Os IDs abaixo são fixos e confirmados via GLPI real. Não alterar sem verificação física:

```
DTIC:
  Hub-App-busca        → group_id: 109
  Hub-App-permissoes   → group_id: 110  → role: "admin-hub"
  Hub-App-dtic-metrics → group_id: 112
  Hub-App-dtic-kpi     → group_id: 113
  Hub-App-dtic-infra   → group_id: 114

SIS:
  Hub-App-busca        → group_id: 102
  Hub-App-permissoes   → group_id: 103  → NÃO mapeado (admin-hub é DTIC only)
  Hub-App-carregadores → group_id: 104
  Hub-App-sis-dashboard→ group_id: 105
  CC-CONSERVAÇÃO       → group_id: 21   → role: "tecnico-conservacao"
  CC-MANUTENCAO        → group_id: 22   → role: "tecnico-manutencao"
```

### Contrato 3 — Hierarquia de roles

```
admin-hub   → herda gestor (tem acesso a tudo que gestor tem + Gestão de Acessos)
gestor      → acesso operacional (dashboard, chamados, relatórios)
tecnico     → acesso técnico (tickets, base de conhecimento)
tecnico-manutencao  → SIS only, via group_map
tecnico-conservacao → SIS only, via group_map
solicitante → acesso básico
```

`admin-hub` **só existe no contexto DTIC** via Hub-App-permissoes (group_id 110).
Nenhum usuário SIS deve receber este role.

---

## PADRÕES OBRIGATÓRIOS

### Thin Router / Fat Service

Lógica de negócio vive em `app/services/`. Os arquivos em `app/routers/`
são finos — apenas recebem request, chamam service, retornam response.
**Nunca mova lógica complexa para dentro de um router.**

### Modificação Cirúrgica

Ao editar um arquivo, altere apenas o necessário.
Se a tentação for reescrever o arquivo inteiro para "ficar mais limpo":
**resista. Faça a alteração mínima e pare.**

### Validação Bidirecional

Qualquer alteração em:

* `app/schemas/` → verificar `web/src/types/` e `web/src/store/`
* `app/core/contexts.yaml` → verificar `app/services/auth_service.py` e `web/src/lib/context-registry.ts`
* `web/src/lib/context-registry.ts` → verificar `web/src/components/AppSidebar.tsx` e todos os `ContextGuard`

### Single Responsibility por Sessão

Uma sessão resolve um problema. Não misturar:

* Tarefa de UI com tarefa de autenticação
* Tarefa de novo endpoint com refatoração de serviço existente
* Bug fix com feature nova

---

## PADRÕES PROIBIDOS

```
❌ Reescrever arquivo inteiro ao invés de edição cirúrgica
❌ Inserir lógica de negócio em componentes React (deve estar em services)
❌ Hardcodar profile_id numérico — usar hub_role.role semântico
❌ Fazer N+1 queries ao GLPI sem paginação ou batch
❌ Alterar regex em httpClient.ts sem mapear todos os paths afetados
❌ Remover fallback ou tratamento de erro por parecer "código não alcançado"
❌ Assumir que "compila = funciona" — contratos de runtime não têm erro de build
❌ Adicionar campo no schema FastAPI sem atualizar tipos TypeScript
```

---

## CHECKLIST PRÉ-COMMIT

Antes de considerar qualquer tarefa concluída:

```
[ ] Li os arquivos que alterei ANTES de alterar
[ ] Não toquei em nenhuma zona protegida sem plano aprovado
[ ] Se alterei schema backend → atualizei tipos frontend
[ ] Se alterei contexts.yaml → verifiquei auth_service e context-registry
[ ] Testei o fluxo de login completo (não só a feature nova)
[ ] Testei os dois contextos: DTIC e SIS
[ ] Não removi nenhum fallback ou tratamento de erro existente
[ ] A alteração é cirúrgica — não reescrevi o arquivo inteiro
```

---

## REFERÊNCIA RÁPIDA DE ARQUIVOS

```
BACKEND
  app/main.py                      ← 🔴 protegido
  app/core/contexts.yaml           ← 🟡 alterar com validação bidirecional
  app/core/context_registry.py     ← 🟡 alterar com cuidado
  app/core/auth_guard.py           ← 🟡 guards de rota
  app/services/auth_service.py     ← 🔴 protegido
  app/services/admin_service.py    ← 🟢 seguro para evoluir
  app/routers/admin.py             ← 🟢 seguro (thin router)
  app/schemas/auth_schemas.py      ← 🟡 alterar com validação bidirecional
  app/core/glpi_client.py          ← 🟡 alterar com cuidado

FRONTEND
  web/src/store/useAuthStore.ts         ← 🔴 protegido
  web/src/lib/api/httpClient.ts         ← 🔴 protegido
  web/src/lib/context-registry.ts      ← 🔴 protegido
  web/src/middleware.ts                 ← 🟡 alterar com cuidado
  web/src/components/ContextGuard.tsx   ← 🟡 alterar com cuidado
  web/src/components/AppSidebar.tsx     ← 🟡 verificar após mudança de roles
  web/src/lib/api/adminService.ts       ← 🟢 seguro para evoluir
  web/src/features/permissions/        ← 🟡 componentes densos, edição cirúrgica
  web/src/components/*                  ← 🟢 UI puro, seguro
```

---

## REGRA DE CONTRATOS

Antes de considerar qualquer tarefa concluída, rodar:

```bash
./scripts/check_contracts.sh
```

Se falhar:

1. Ler o erro — ele diz EXATAMENTE qual contrato quebrou e o que atualizar
2. Corrigir a divergência (atualizar o lado que ficou para trás)
3. Rodar novamente até passar
4. **NUNCA** comentar ou deletar um teste de contrato para fazê-lo passar

---

*Mantido por: jonathan-moletta | tensor-aurora / hub_dtic_and_sis*
*Atualizar este arquivo sempre que uma nova zona protegida for identificada.*
