# PROMPT — Resolução de Gaps e Inconsistências: Walkthrough Arquitetural

> Destino: antigravity  
> Base: walkthrough.md (Relatório Técnico de Estabilização Arquitetural v1.0)  
> Regra absoluta: ESTUDAR e PLANEJAR antes de qualquer alteração de código  
> Proteção: ARCHITECTURE_RULES.md vigente — nenhuma zona protegida tocada sem plano  
> Este prompt tem DUAS fases: Fase A (estudo + diagnóstico) e Fase B (execução sequencial)

---

## INSTRUÇÃO INICIAL OBRIGATÓRIA

Antes de qualquer coisa, executar:

```bash
python scripts/check_contracts.py
cd web && npx vitest run src/__tests__/contracts/
```

Registrar o estado atual como baseline. Todos os 36 contratos devem estar ✅.
Se qualquer contrato já estiver quebrado antes de começar → PARAR e reportar.

---

## FASE A — ESTUDO E DIAGNÓSTICO COMPLETO

Nesta fase: APENAS leitura, análise e documentação. Zero alterações.

---

### GAP 0 — INCONSISTÊNCIA CRÍTICA (não documentada no relatório)

**Este gap não está na seção 5.1 do walkthrough, mas é introduzido pelo próprio documento.**

O diagrama Mermaid da seção 2.2 afirma:
```
validate_hub_app_group → IDs Hardcoded
  DTIC: 109, 110, 112, 113, 114
  SIS:  102, 104, 105             ← AUSENTE o 103
```

O ARCHITECTURE_RULES.md e os testes de contrato documentam SIS como:
```
Hub-App-busca         → 102
Hub-App-permissoes    → 103       ← PRESENTE nos contratos
Hub-App-carregadores  → 104
Hub-App-sis-dashboard → 105
```

**Investigar com prioridade máxima:**

```
[ ] Ler app/routers/admin.py → função validate_hub_app_group (L31-39)
    Qual é o conjunto real de IDs aceitos para SIS?
    {102, 104, 105} ou {102, 103, 104, 105}?

[ ] O ID 103 (Hub-App-permissoes SIS) está ou não está na lista de grupos válidos?

[ ] Se 103 está AUSENTE de validate_hub_app_group:
    → Tentativas de atribuir/revogar o grupo Hub-App-permissoes no SIS retornam 400
    → O Quick Fix do Painel de Diagnóstico falha silenciosamente no SIS
    → Nenhum alerta no log — apenas um 400 que o frontend ignora ou trata como sucesso

[ ] Se 103 está PRESENTE mas o diagrama está errado:
    → O diagrama é documentação incorreta — precisa ser corrigido

[ ] Verificar os testes de contrato em test_contracts.py:
    Linha que verifica grupos SIS — quais IDs estão na assertion?
    {102, 104, 105} ou {102, 103, 104, 105}?
    Se os testes passam com {102, 104, 105}, eles estão validando o estado errado.
```

**Registrar o resultado exato antes de avançar para os outros gaps.**

---

### GAP 1 — Pytest coleta travando (Severidade: 🟡 Média)

**Problema:** `test_auth_service.py` e `test_roles.py` importam `app.*` diretamente.
A cadeia `app.*` → `config.py` → `Settings()` exige variáveis de ambiente (`.env`).
Sem `.env` presente no ambiente de CI/CD ou venv local, a coleta do pytest trava
com `ImportError` ou `ValidationError` antes de executar qualquer teste.

**Investigar:**

```
[ ] Rodar: python -m pytest app/tests/ -v --collect-only 2>&1
    → Trava? Em qual arquivo? Com qual erro exato?

[ ] Ler app/tests/test_auth_service.py e app/tests/test_roles.py
    → Quais imports de app.* fazem a cadeia explodir?
    → Existe algum conftest.py? Se sim, o que ele faz?

[ ] Ler app/config.py
    → Quais variáveis de ambiente são obrigatórias para Settings() instanciar?
    → Existe algum mecanismo de fallback para testes (ex: dotenv, defaults)?

[ ] Ler app/tests/test_contracts.py (o novo)
    → Confirmar que ele NÃO importa app.* (usa AST)
    → Confirmar que roda isolado sem .env: python -m pytest app/tests/test_contracts.py -v
```

**Classificar o impacto:**
- O travamento afeta apenas coleta local sem .env?
- Ou trava também no CI/CD (Docker) onde o .env existe?
- Os testes existentes (test_auth_service.py, test_roles.py) têm valor real ou são esqueletos?

---

### GAP 2 — RevokeGroupResponse sem schema Pydantic (Severidade: 🟡 Média)

**Problema:** O endpoint DELETE `/admin/users/{uid}/groups/{gid}` retorna
um `dict` inline em vez de um schema Pydantic explícito.

**Investigar:**

```
[ ] Ler app/routers/admin.py → endpoint DELETE (revoke)
    → O que exatamente está sendo retornado?
      Exemplo: return {"success": True, "message": "..."} ← dict inline
      Ou: return RevokeGroupResponse(success=True, ...) ← schema tipado

[ ] Ler web/src/lib/api/adminService.ts → RevokeGroupResponse (L21-27)
    → Quais campos o frontend espera?

[ ] Verificar se o teste frontend (auth.contract.test.ts) cobre RevokeGroupResponse
    → Ele valida os campos? Ou apenas a existência do tipo?

[ ] O teste de contrato backend verifica RevokeGroupResponse?
    → Buscar em test_contracts.py por "revoke" ou "RevokeGroupResponse"
    → Se não existe cobertura backend, este é o risco: o dict inline pode
       ser alterado silenciosamente sem quebrar nenhum teste
```

**Impacto real:** Se o frontend espera `{ success: bool, message: str, user_id: int, group_id: int }`
mas o backend retorna `{ success: True }`, a UI pode quebrar silenciosamente.

---

### GAP 3 — pyyaml ausente do requirements.txt (Severidade: 🟢 Baixa)

**Problema:** `pyyaml` é usado em `app/core/context_registry.py` em produção,
mas pode não estar declarado em `requirements.txt`.

**Investigar:**

```
[ ] cat requirements.txt | grep -i yaml
    → pyyaml está listado?

[ ] cat app/core/context_registry.py | grep import
    → yaml é importado? Como?

[ ] Verificar se o Docker resolve isso implicitamente
    (outro pacote como fastapi ou uvicorn pode puxar pyyaml como dependência)
    pip show pyyaml → quem instalou?

[ ] Verificar se check_contracts.py usa yaml
    → Se sim, uma instalação limpa sem requirements.txt quebraria os testes
```

---

### GAP 4 — Testes frontend sem cross-reference backend (Severidade: 🟡 Média)

**Problema:** Backend e frontend validam contratos isoladamente.
Uma divergência de nomes de campo entre os dois lados não é detectada automaticamente.

**Exemplo do problema:**
```
Backend retorna:  { "hub_role": "gestor" }      ← snake_case
Frontend espera:  { hubRole: "gestor" }          ← camelCase
```
Cada lado testa em isolamento e passa. A divergência só aparece em runtime.

**Investigar:**

```
[ ] Ler web/src/lib/api/adminService.ts → AdminUser (L3-13)
    Quais campos estão em camelCase?

[ ] Ler app/routers/admin.py → AdminUserResponse
    Quais campos estão em snake_case?

[ ] Existe alguma transformação camelCase↔snake_case no httpClient.ts?
    Se sim: onde exatamente? Cobre todos os campos ou apenas alguns?

[ ] Mapear divergências reais:
    Backend campo          → Frontend campo        → Transformação?
    hub_role (str)         → hubRole (string)      → ?
    profile_id (int)       → profileId (number)    → ?
    modules (list)         → modules (array)       → mesmo nome ✅
    alerts (list)          → alerts (array)        → mesmo nome ✅
    [listar todos os campos de AdminUserResponse]

[ ] Esta divergência já causou algum bug documentado?
    Buscar no histórico de sessões por "undefined" ou campos nulos na PermissionsMatrix
```

---

### GAP 5 — Testes E2E ausentes (Severidade: 🔴 Alta)

**Problema:** Nenhum teste automatizado simula o fluxo completo:
`login → navegação → permissões` em múltiplos perfis.

**Investigar (sem implementar ainda):**

```
[ ] Existe qualquer arquivo Playwright ou Cypress no repositório?
    find . -name "playwright.config*" -o -name "cypress.config*" 2>/dev/null

[ ] O vitest.setup.ts tem algum teste de integração além de unit?

[ ] Quais são os fluxos mínimos que precisariam de cobertura E2E?
    Listar os 5 mais críticos baseado nos riscos documentados no walkthrough

[ ] Avaliar viabilidade: o GLPI real pode ser mockado para testes E2E?
    Ou precisaria de uma instância de teste separada?

[ ] Estimar esforço: dias, não horas — este é um gap estrutural grande
```

**Não implementar E2E neste prompt.** Apenas mapear o escopo completo
para planejamento futuro.

---

## FASE B — PLANO DE EXECUÇÃO (apenas após Fase A completa)

Com o diagnóstico completo, montar o plano de resolução em ordem de prioridade e segurança.

### Ordenação obrigatória

```
BLOCO 1 — Sem risco de regressão (executar primeiro)
  B1.1: GAP 3 → adicionar pyyaml ao requirements.txt (1 linha, zero risco)
  B1.2: GAP 0 → corrigir ID 103 em validate_hub_app_group OU corrigir o diagrama
        (dependendo do que a investigação revelar — ver regra abaixo)

BLOCO 2 — Baixo risco, melhora cobertura
  B2.1: GAP 2 → criar schema Pydantic RevokeGroupResponse + adicionar teste backend
  B2.2: GAP 1 → criar conftest.py com mock de Settings para resolver coleta

BLOCO 3 — Médio esforço, alto valor
  B3.1: GAP 4 → mapear divergências camelCase/snake_case e criar teste de cross-reference

BLOCO 4 — Planejamento apenas, não executar agora
  B4.1: GAP 5 → documento de escopo E2E para sessão futura dedicada
```

### Regra para GAP 0 (inconsistência crítica)

**Se a investigação confirmar que 103 está AUSENTE de validate_hub_app_group:**

```
AÇÃO: Adicionar 103 ao conjunto de IDs válidos SIS em admin.py
RISCO: BAIXO — é uma adição, não uma alteração
TESTE OBRIGATÓRIO: Atualizar test_contracts.py para incluir 103 no assert SIS
VALIDAÇÃO: check_contracts.py deve continuar passando após a correção
```

**Se a investigação confirmar que 103 está PRESENTE e o diagrama está errado:**

```
AÇÃO: Corrigir apenas o diagrama Mermaid em walkthrough.md
RISCO: ZERO — é documentação, não código
```

**Em ambos os casos:** o `ARCHITECTURE_RULES.md` já documenta 103 como SIS válido.
O código deve estar alinhado com o que a documentação promete.

---

## GATE DE VALIDAÇÃO ENTRE CADA BLOCO

Após cada item executado, rodar obrigatoriamente:

```bash
python scripts/check_contracts.py
```

Se qualquer contrato quebrar → **PARAR IMEDIATAMENTE**, reverter a última alteração,
diagnosticar o problema antes de avançar.

O número de contratos não pode DIMINUIR entre blocos.
Após B2.1 (schema RevokeGroupResponse), o número DEVE aumentar (novo contrato coberto).

---

## FORMATO DE ENTREGA OBRIGATÓRIO

### Parte 1 — Relatório de diagnóstico (Fase A)

```
GAP 0 — Inconsistência crítica
  Resultado da investigação: [103 ausente | 103 presente + diagrama errado]
  Arquivo afetado: admin.py linha [n]
  IDs reais aceitos para SIS: [lista]
  Impacto confirmado: [sim/não — describe]

GAP 1 — Pytest travando
  Reproduziu o problema: [sim/não]
  Erro exato: [mensagem]
  Arquivos que causam o import explosion: [lista]
  conftest.py existe: [sim/não — conteúdo]
  Testes existentes têm valor real: [sim/não — justificativa]

GAP 2 — RevokeGroupResponse
  Implementação atual no backend: [dict inline | schema tipado]
  Campos que backend retorna: [lista]
  Campos que frontend espera: [lista]
  Divergência encontrada: [sim/não]

GAP 3 — pyyaml
  Está no requirements.txt: [sim/não]
  Quem instala hoje: [dependência transitiva de X]

GAP 4 — Cross-reference frontend↔backend
  Campos com divergência camelCase/snake_case: [tabela]
  Transformação existe em httpClient.ts: [sim/não — onde]
  Bug documentado causado por isso: [sim/não]

GAP 5 — E2E
  Playwright/Cypress existe: [sim/não]
  5 fluxos críticos mapeados: [lista]
  Viabilidade de mock do GLPI: [avaliação]
```

### Parte 2 — Execução (Fase B)

```
BLOCO 1
  B1.1 pyyaml: [✅ adicionado | já existia]
  B1.2 GAP 0: [✅ corrigido | diagrama corrigido — qual era o caso]
  check_contracts.py após B1: [n/n ✅]

BLOCO 2
  B2.1 RevokeGroupResponse schema: [✅ | já existia]
  B2.1 teste backend adicionado: [✅ — n contratos agora]
  B2.2 conftest.py: [✅ criado | não era necessário — motivo]
  check_contracts.py após B2: [n/n ✅]

BLOCO 3
  B3.1 divergências mapeadas: [tabela final]
  B3.1 teste cross-reference: [✅ criado | adiado — motivo]
  check_contracts.py após B3: [n/n ✅]

BLOCO 4
  Documento de escopo E2E: [✅ criado como e2e_scope.md]

ESTADO FINAL
  check_contracts.py: [n/n ✅]
  vitest contracts: [n/n ✅]
  Contratos antes: 36
  Contratos depois: [n] (deve ser ≥ 36)
  Regressões introduzidas: ZERO
```

---

## CRITÉRIOS DE CONCLUSÃO

```
[ ] GAP 0 resolvido — código e documentação alinhados (103 no lugar certo)
[ ] GAP 1 resolvido — pytest roda sem travar em ambiente limpo
[ ] GAP 2 resolvido — RevokeGroupResponse tem schema Pydantic + teste de contrato
[ ] GAP 3 resolvido — pyyaml declarado em requirements.txt
[ ] GAP 4 resolvido ou documentado — divergências camelCase mapeadas com precisão
[ ] GAP 5 escopo documentado — sessão futura planejada
[ ] Total de contratos: igual ou maior que 36
[ ] Nenhuma zona protegida alterada sem aprovação
[ ] check_contracts.py ✅ antes E depois de cada bloco
[ ] Zero regressões em qualquer funcionalidade existente
```

---

## AVISOS FINAIS

```
⚠️ GAP 0 é o mais urgente — pode estar causando falhas silenciosas no SIS agora
⚠️ Não executar B3 (cross-reference) se exigir tocar em httpClient.ts ou useAuthStore.ts
   sem plano pré-aprovado — são zonas protegidas
⚠️ GAP 5 (E2E) NÃO deve ser implementado nesta sessão — é escopo de sessão dedicada
⚠️ Nenhum teste de contrato deve ser deletado ou comentado para fazer outro passar
```

---

*Gerado via PROMPT_LIBRARY — Resolução de Gaps | hub_dtic_and_sis | 2026-03-11*
