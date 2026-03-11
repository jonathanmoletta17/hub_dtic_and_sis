# PROMPT 2/3 — Implementação: Endpoints de Administração de Acessos (Backend)

> Sequência: ETAPA 1 ✅ → ETAPA 2 → ETAPA 3  
> PRÉ-REQUISITO OBRIGATÓRIO: Contrato dos 3 endpoints extraído no Prompt 1/3.  
> Destino: antigravity  
> Regra: Implementar exatamente o contrato definido — nem mais, nem menos.

---

## CONTEXTO

A auditoria do `PermissionsMatrix.tsx` (Prompt 1/3) produziu o contrato exato
dos 3 endpoints que o frontend espera. Esta etapa implementa esses endpoints
no backend FastAPI, respeitando integralmente o contrato.

**O que já existe e NÃO deve ser alterado:**
- `app/routers/admin.py` — router existente (verificar se já existe ou criar)
- `GLPIClient` — cliente GLPI já implementado, usar para todas as chamadas
- `verify_session` — guard de autenticação existente, usar como dependência
- Padrão de autenticação: o backend age como proxy — usa o token do gestor logado

**O que será criado:**
- 3 endpoints no router de administração
- Funções de serviço correspondentes (se a lógica for não trivial)
- Schemas Pydantic de request/response

---

## PRÉ-LEITURA OBRIGATÓRIA

Antes de escrever qualquer código, ler na íntegra:

```
[ ] app/routers/admin.py (ou equivalente — verificar se existe)
[ ] app/core/auth_guard.py — padrão de verify_session
[ ] app/services/auth_service.py — resolve_app_access (L22-43) como referência
    de como o Hub já consome grupos GLPI
[ ] app/core/context_registry.py — como contextos são resolvidos
[ ] O contrato entregue pelo Prompt 1/3 (campos exatos de cada endpoint)
```

Registrar o que foi encontrado antes de prosseguir.

---

## ENDPOINT 1 — GET /admin/users/diagnostics

### Responsabilidade

Retornar a lista de todos os usuários ativos do contexto com seus grupos Hub-App-*
atuais, o role Hub derivado, e alertas de diagnóstico computados.

### Lógica de implementação

```
1. Usar GLPIClient do token do gestor logado
2. GET /User (filtro: is_active=1, entidade do contexto)
   → lista de usuários ativos
3. Para cada usuário:
   a. GET /User/{id}/Group_User
      → grupos que possui
   b. Filtrar apenas grupos Hub-App-* do contexto atual
      (usar lista do context-registry ou contexts.yaml)
   c. Derivar role Hub:
      - GET /User/{id}/Profile_User → active profile_id
      - Lookup em contexts.yaml → role semântico
4. Computar alertas:
   ALERTA TIPO A: usuário tem role "gestor" mas NÃO está no grupo Hub-App-permissoes
   ALERTA TIPO B: usuário está em grupo Hub-App-* mas profile_id não está mapeado
                  no contexts.yaml (role será "solicitante" — possível acesso fantasma)
5. Retornar payload conforme contrato do Prompt 1/3
```

### Considerações de performance

Com 800+ usuários ativos no DTIC, fazer N+1 queries (uma por usuário) é inviável.
Avaliar e implementar a abordagem mais eficiente:

**Opção A — Batch via GLPI:**
```
GET /Group/{hub_app_id}/Group_User para cada grupo Hub-App-*
→ inverte o problema: começa pelos grupos, não pelos usuários
→ resultado: dict {user_id: [grupos_que_possui]}
→ combina com lista de usuários para montar o payload
```

**Opção B — N+1 com paginação:**
```
Aceitar N+1 mas paginar (range=0-49 por página)
→ adicionar parâmetros page e per_page ao endpoint
→ frontend carrega sob demanda
```

Escolher a opção mais adequada com justificativa, documentar a decisão.

### Schema de resposta (base — ajustar conforme contrato do Prompt 1/3)

```python
class HubAppModule(BaseModel):
    group_id: int
    name: str          # ex: "Hub-App-carregadores"
    module_label: str  # ex: "Gestão de Carregadores"
    has_access: bool

class DiagnosticAlert(BaseModel):
    type: str          # "missing_permission_group" | "orphan_access" | etc.
    severity: str      # "warning" | "error"
    message: str
    quick_fix_group_id: Optional[int]  # se existir ação rápida

class UserPermissionRow(BaseModel):
    id: int
    name: str
    realname: str
    firstname: str
    hub_role: str      # "gestor" | "tecnico" | "solicitante"
    profile_id: int
    modules: List[HubAppModule]
    alerts: List[DiagnosticAlert]

class DiagnosticsResponse(BaseModel):
    users: List[UserPermissionRow]
    total: int
    context: str
```

**Ajustar os nomes de campos para bater exatamente com o contrato do Prompt 1/3.**

---

## ENDPOINT 2 — POST /admin/users/{user_id}/groups/{group_id}

### Responsabilidade

Atribuir um grupo Hub-App-* a um usuário via GLPI API.
O backend age como proxy autenticado com o token do gestor.

### Lógica de implementação

```
1. Validar que group_id pertence à lista de grupos Hub-App-* do contexto
   (não aceitar group_id arbitrário — vetor de escalada de privilégio)
2. Verificar se o usuário já está no grupo (evitar duplicata):
   GET /User/{user_id}/Group_User → buscar group_id na lista
   Se já existe → retornar 200 com mensagem "já possui acesso"
3. Criar vínculo:
   POST /Group_User
   Body: {"input": {"users_id": user_id, "groups_id": group_id, "entities_id": 0}}
4. Retornar o ID do vínculo criado e confirmação
```

### Schema

```python
# Resposta
class AssignGroupResponse(BaseModel):
    success: bool
    binding_id: Optional[int]   # ID do Group_User criado
    message: str
    already_exists: bool
```

### Guard de permissão

```python
# No decorator do endpoint:
@router.post("/{context}/admin/users/{user_id}/groups/{group_id}")
async def assign_group(
    context: str,
    user_id: int,
    group_id: int,
    session = Depends(verify_session),
    hub_role = Depends(require_role("gestor"))  # apenas gestores
):
```

Se `require_role` não existir ainda, implementar como dependência simples que
verifica `hub_role.role === "gestor"` no payload da sessão.

---

## ENDPOINT 3 — DELETE /admin/users/{user_id}/groups/{group_id}

### Responsabilidade

Revogar acesso de um usuário a um módulo Hub-App-*.

### Lógica de implementação

```
1. Validar que group_id pertence à lista Hub-App-* do contexto (mesma validação do POST)
2. Encontrar o ID do vínculo Group_User:
   GET /User/{user_id}/Group_User
   → filtrar pelo group_id alvo
   → extrair o ID da tupla de associação
3. Se não encontrar → retornar 404 com mensagem "usuário não possui este acesso"
4. Deletar o vínculo:
   DELETE /Group_User/{binding_id}
5. Confirmar deleção e retornar
```

### Schema

```python
class RevokeGroupResponse(BaseModel):
    success: bool
    message: str
    user_id: int
    group_id: int
```

---

## VALIDAÇÕES TRANSVERSAIS (aplicar nos 3 endpoints)

### Validação de contexto

```python
def validate_hub_app_group(context: str, group_id: int) -> bool:
    """
    Verifica se group_id pertence aos grupos Hub-App-* válidos do contexto.
    Usa a lista do context-registry ou contexts.yaml.
    Rejeita group_id arbitrário para prevenir escalada de privilégio.
    """
    hub_app_groups = {
        "dtic": [109, 110, 112, 113, 114],
        "sis":  [102, 103, 104, 105]
    }
    return group_id in hub_app_groups.get(context, [])
```

Se a lista de grupos já existe em outro lugar no código, usar — não duplicar.

### Rate limiting

Aplicar rate limiter nos endpoints de escrita (POST e DELETE):
- Padrão existente: `30/minute` nos endpoints de leitura do charger_service
- Para escrita: `10/minute` por usuário logado

### Logging

Registrar toda operação de atribuição/revogação:
```python
logger.info(f"[ADMIN] {gestor_id} atribuiu grupo {group_id} ao usuário {user_id} (contexto: {context})")
logger.info(f"[ADMIN] {gestor_id} revogou grupo {group_id} do usuário {user_id} (contexto: {context})")
```

---

## TESTES DE CADA ENDPOINT

Após implementar, executar manualmente e documentar o resultado:

### Endpoint 1 — Diagnóstico
```
[ ] GET /api/v1/dtic/admin/users/diagnostics
    → Retorna lista de usuários com módulos e alertas?
    → jonathan-moletta aparece com todos os Hub-App-* do DTIC?
    → Algum alerta de diagnóstico é gerado?
    → Performance: quanto tempo leva com 800+ usuários?

[ ] GET /api/v1/sis/admin/users/diagnostics
    → Retorna usuários SIS corretamente?
    → Usuários com tecnico-manutencao têm context_override correto?
```

### Endpoint 2 — Atribuição
```
[ ] POST /api/v1/dtic/admin/users/{id}/groups/109 (Hub-App-busca)
    → Retorna binding_id?
    → Verificar no GLPI que o vínculo foi criado
    → Tentar novamente → already_exists=true?

[ ] POST com group_id inválido (ex: 999)
    → Retorna 400 com mensagem clara?

[ ] POST com role solicitante (não gestor)
    → Retorna 403?
```

### Endpoint 3 — Revogação
```
[ ] DELETE /api/v1/dtic/admin/users/{id}/groups/109
    → Vínculo removido no GLPI?
    → Verificar via GET /User/{id}/Group_User que grupo 109 sumiu

[ ] DELETE de grupo que o usuário não tem
    → Retorna 404 com mensagem clara?
```

---

## FORMATO DE ENTREGA

```
PRÉ-LEITURA
  Arquivos lidos: [lista]
  Estado do admin.py: [existia? o que tinha?]
  Decisão de performance do Endpoint 1: [Opção A ou B + justificativa]

IMPLEMENTAÇÃO

  Endpoint 1 — /diagnostics
    Arquivo: [caminho]
    Linhas adicionadas: [n]
    Ajustes ao schema base: [campos alterados vs. contrato do Prompt 1/3]

  Endpoint 2 — POST /groups
    Arquivo: [caminho]
    Linhas adicionadas: [n]

  Endpoint 3 — DELETE /groups
    Arquivo: [caminho]
    Linhas adicionadas: [n]

TESTES EXECUTADOS
  [tabela: endpoint | resultado | observação]

REGISTROS PARA KNOWLEDGE BASE
  - SOLUTION: "Endpoints de administração de acessos implementados"
  - ADR: "Proxy de escrita no GLPI — backend como intermediário autenticado"
```

---

## CRITÉRIOS FINAIS

- Os schemas de resposta devem bater **exatamente** com os tipos TypeScript do Prompt 1/3
- Nenhuma chamada direta ao GLPI a partir do frontend — sempre via backend proxy
- O endpoint de diagnóstico NÃO pode fazer N+1 com 800+ usuários sem paginação
- Validação de `group_id` contra lista Hub-App-* é obrigatória em POST e DELETE
- Sem esta entrega completa e testada, não iniciar o Prompt 3/3

---

*Gerado via PROMPT_LIBRARY — P01 Implementação Backend | hub_dtic_and_sis | 2026-03-10 | Etapa 2/3*
